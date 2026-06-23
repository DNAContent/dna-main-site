// =========================================================================
// Wix Blog (headless) data layer.
//
// Reads published posts from the EXISTING Wix site via the headless Blog API.
// This does not touch or unpublish the live Wix site — it only reads public,
// published content using a publishable OAuth client id.
//
// Setup: create a Headless "OAuth app" in the Wix dashboard
// (Settings → Headless settings → create OAuth app), copy the Client ID, and
// put it in a `.env` file at the project root:
//
//     VITE_WIX_CLIENT_ID=your-client-id-here
//
// Without the id, everything below no-ops and the pages keep their static
// placeholder content.
// =========================================================================

import { createClient, OAuthStrategy } from '@wix/sdk';
import { posts } from '@wix/blog';

// Publishable Wix Headless "Visitor" OAuth client id — safe to ship in the
// browser bundle. Override per-environment with VITE_WIX_CLIENT_ID in .env.
const clientId = import.meta.env.VITE_WIX_CLIENT_ID || 'a8fcb08b-2408-463e-8e1e-9718035094bc';
export const wixEnabled = Boolean(clientId);

const client = wixEnabled
  ? createClient({ modules: { posts }, auth: OAuthStrategy({ clientId }) })
  : null;

// ---- queries -------------------------------------------------------------

export async function listPosts(limit = 12) {
  if (!client) return null;
  try {
    const res = await client.posts.queryPosts().limit(limit).find();
    return res.items || [];
  } catch (e) {
    console.warn('[wix] listPosts failed:', e);
    return null;
  }
}

export async function getPostBySlug(slug) {
  if (!client || !slug) return null;
  try {
    // queryPosts (not getPostBySlug) — the slugs endpoint is CORS-blocked in
    // the browser, but the query endpoint is allowed.
    const res = await client.posts
      .queryPosts({ fieldsets: ['RICH_CONTENT'] })
      .eq('slug', slug)
      .find();
    return res.items?.[0] || null;
  } catch (e) {
    console.warn('[wix] getPostBySlug failed:', e);
    return null;
  }
}

// ---- helpers -------------------------------------------------------------

// Resolve a usable image URL from a Wix Blog post's cover media. Handles the
// three shapes seen on this site: embedded-video thumbnails (YouTube), a
// `wix:image://` string, and image objects.
function wixStatic(path, w, h) {
  return `https://static.wixstatic.com/media/${path}/v1/fill/w_${w},h_${h},al_c,q_85/file.jpg`;
}
export function coverUrl(post, w = 800, h = 500) {
  const m = post && (post.media || post.coverMedia);
  if (!m) return '';
  if (m.embedMedia?.thumbnail?.url) return m.embedMedia.thumbnail.url; // YouTube etc.

  const img = m.wixMedia?.image ?? m.image ?? null;
  if (typeof img === 'string') {
    const mm = img.match(/wix:image:\/\/v1\/([^/]+)/);
    if (mm) return wixStatic(mm[1], w, h);
    if (img.startsWith('http')) return img;
  } else if (img && typeof img === 'object') {
    if (img.url && img.url.startsWith('http')) {
      return img.url.includes('static.wixstatic.com') ? `${img.url}/v1/fill/w_${w},h_${h},al_c,q_85/file.jpg` : img.url;
    }
    const id = img.id || '';
    const mm = id.match(/wix:image:\/\/v1\/([^/]+)/);
    if (mm) return wixStatic(mm[1], w, h);
    if (id) return wixStatic(id, w, h);
  }
  return '';
}

export function formatDate(post) {
  const d = post && (post.firstPublishedDate || post.lastPublishedDate);
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return ''; }
}

export function postExcerpt(post) {
  return (post && (post.excerpt || post.previewTextParagraph || '')) || '';
}

// ---- Ricos rich-content → HTML (covers the common node types) -------------

function escapeHtml(s = '') {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderTextNodes(nodes = []) {
  return nodes.map((n) => {
    if (n.type !== 'TEXT' || !n.textData) return '';
    let t = escapeHtml(n.textData.text || '');
    for (const dec of n.textData.decorations || []) {
      if (dec.type === 'BOLD') t = `<strong>${t}</strong>`;
      else if (dec.type === 'ITALIC') t = `<em>${t}</em>`;
      else if (dec.type === 'UNDERLINE') t = `<u>${t}</u>`;
      else if (dec.type === 'LINK' && dec.linkData?.link?.url) {
        const url = escapeHtml(dec.linkData.link.url);
        t = `<a href="${url}" target="_blank" rel="noopener">${t}</a>`;
      }
    }
    return t;
  }).join('');
}

function renderNode(node) {
  switch (node.type) {
    case 'PARAGRAPH':
      return `<p>${renderTextNodes(node.nodes)}</p>`;
    case 'HEADING': {
      const lvl = Math.min(Math.max(node.headingData?.level || 2, 2), 4);
      return `<h${lvl}>${renderTextNodes(node.nodes)}</h${lvl}>`;
    }
    case 'BULLETED_LIST':
      return `<ul>${(node.nodes || []).map(renderNode).join('')}</ul>`;
    case 'ORDERED_LIST':
      return `<ol>${(node.nodes || []).map(renderNode).join('')}</ol>`;
    case 'LIST_ITEM':
      return `<li>${(node.nodes || []).map(renderNode).join('')}</li>`;
    case 'BLOCKQUOTE':
      return `<blockquote>${(node.nodes || []).map(renderNode).join('')}</blockquote>`;
    case 'DIVIDER':
      return '<hr />';
    case 'IMAGE': {
      const img = node.imageData?.image?.src;
      const id = img?.id;
      if (!id) return '';
      const url = `https://static.wixstatic.com/media/${id}`;
      const alt = escapeHtml(node.imageData?.altText || '');
      return `<figure><img src="${url}" alt="${alt}" loading="lazy" /></figure>`;
    }
    case 'VIDEO': {
      const m = JSON.stringify(node).match(/(?:youtu\.be\/|[?&]v=|embed\/)([\w-]{11})/);
      if (m) return `<figure class="post__embed"><iframe src="https://www.youtube.com/embed/${m[1]}" title="Video" allow="encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe></figure>`;
      return '';
    }
    case 'CAPTION':
      return ''; // captions are rendered inline by their parent where wanted
    case 'CODE_BLOCK':
      return `<pre><code>${renderTextNodes(node.nodes)}</code></pre>`;
    default:
      // unknown container — try to render children
      return (node.nodes || []).map(renderNode).join('');
  }
}

export function richContentToHtml(post) {
  const rc = post && (post.richContent || post.content);
  if (rc && Array.isArray(rc.nodes)) {
    return rc.nodes.map(renderNode).join('');
  }
  // fallbacks
  if (post && post.contentText) {
    return post.contentText.split(/\n{2,}/).map((p) => `<p>${escapeHtml(p)}</p>`).join('');
  }
  return '';
}
