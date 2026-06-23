// =========================================================================
// Pure Wix Blog helpers — no Vite / browser / SDK dependencies, so they can
// be imported by BOTH the browser bundle (wix.js) and the Node build-time
// static generator (scripts/gen-blog.mjs).
// =========================================================================

export function escapeHtml(s = '') {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Allow only safe URL schemes — blocks javascript:/data: etc. from Wix content.
export function safeUrl(url = '') {
  const u = String(url).trim();
  return /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(u) ? u : '';
}

// Strip anything that isn't a valid Wix media id (prevents attribute/path injection).
function safeMediaId(id = '') {
  return /^[\w.~/-]+$/.test(id) ? id : '';
}

function wixStatic(path, w, h) {
  return `https://static.wixstatic.com/media/${path}/v1/fill/w_${w},h_${h},al_c,q_85/file.jpg`;
}

// Resolve a cover image URL across the shapes Wix returns: embedded-video
// thumbnails (YouTube), a `wix:image://` string, or image objects.
export function coverUrl(post, w = 800, h = 500) {
  const m = post && (post.media || post.coverMedia);
  if (!m) return '';
  if (m.embedMedia?.thumbnail?.url) return safeUrl(m.embedMedia.thumbnail.url);

  const img = m.wixMedia?.image ?? m.image ?? null;
  if (typeof img === 'string') {
    const mm = img.match(/wix:image:\/\/v1\/([^/]+)/);
    if (mm && safeMediaId(mm[1])) return wixStatic(mm[1], w, h);
    if (img.startsWith('http')) return safeUrl(img);
  } else if (img && typeof img === 'object') {
    if (img.url && img.url.startsWith('http')) {
      return img.url.includes('static.wixstatic.com')
        ? `${img.url}/v1/fill/w_${w},h_${h},al_c,q_85/file.jpg`
        : safeUrl(img.url);
    }
    const id = img.id || '';
    const mm = id.match(/wix:image:\/\/v1\/([^/]+)/);
    if (mm && safeMediaId(mm[1])) return wixStatic(mm[1], w, h);
    if (safeMediaId(id)) return wixStatic(id, w, h);
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

// ---- Ricos rich-content → HTML -------------------------------------------

function renderTextNodes(nodes = []) {
  return nodes.map((n) => {
    if (n.type !== 'TEXT' || !n.textData) return '';
    let t = escapeHtml(n.textData.text || '');
    for (const dec of n.textData.decorations || []) {
      // NB: COLOR decorations are intentionally ignored so post text inherits
      // the dark theme's colour instead of Wix's light-theme black.
      if (dec.type === 'BOLD') t = `<strong>${t}</strong>`;
      else if (dec.type === 'ITALIC') t = `<em>${t}</em>`;
      else if (dec.type === 'UNDERLINE') t = `<u>${t}</u>`;
      else if (dec.type === 'LINK') {
        const url = safeUrl(dec.linkData?.link?.url || '');
        if (url) t = `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${t}</a>`;
      }
    }
    return t;
  }).join('');
}

function renderNode(node) {
  switch (node.type) {
    case 'PARAGRAPH': {
      const inner = renderTextNodes(node.nodes);
      return inner.trim() ? `<p>${inner}</p>` : '';
    }
    case 'HEADING': {
      const lvl = Math.min(Math.max(node.headingData?.level || 2, 2), 4);
      return `<h${lvl}>${renderTextNodes(node.nodes)}</h${lvl}>`;
    }
    case 'BULLETED_LIST': return `<ul>${(node.nodes || []).map(renderNode).join('')}</ul>`;
    case 'ORDERED_LIST': return `<ol>${(node.nodes || []).map(renderNode).join('')}</ol>`;
    case 'LIST_ITEM': return `<li>${(node.nodes || []).map(renderNode).join('')}</li>`;
    case 'BLOCKQUOTE': return `<blockquote>${(node.nodes || []).map(renderNode).join('')}</blockquote>`;
    case 'DIVIDER': return '<hr />';
    case 'IMAGE': {
      const id = safeMediaId(node.imageData?.image?.src?.id || '');
      if (!id) return '';
      const alt = escapeHtml(node.imageData?.altText || '');
      return `<figure><img src="https://static.wixstatic.com/media/${escapeHtml(id)}" alt="${alt}" loading="lazy" /></figure>`;
    }
    case 'VIDEO': {
      const m = JSON.stringify(node).match(/(?:youtu\.be\/|[?&]v=|embed\/)([\w-]{11})/);
      if (m) return `<figure class="post__embed"><iframe src="https://www.youtube.com/embed/${m[1]}" title="Video" allow="encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe></figure>`;
      return '';
    }
    case 'CAPTION': return '';
    case 'CODE_BLOCK':
      return `<pre><code>${(node.nodes || []).map((n) => escapeHtml(n.textData?.text || '')).join('')}</code></pre>`;
    default: return (node.nodes || []).map(renderNode).join('');
  }
}

export function richContentToHtml(post) {
  const rc = post && (post.richContent || post.content);
  if (rc && Array.isArray(rc.nodes)) return rc.nodes.map(renderNode).join('');
  if (post && post.contentText) {
    return post.contentText.split(/\n{2,}/).map((p) => `<p>${escapeHtml(p)}</p>`).join('');
  }
  return '';
}
