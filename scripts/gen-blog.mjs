// =========================================================================
// Build-time static generator for the blog.
// Runs AFTER `vite build`. Fetches every published Wix post and writes a
// pretty, crawlable page at dist/blog/<slug>/index.html (so URLs are
// /blog/<slug>), pre-rendering the article HTML for SEO. Also pre-renders the
// card list into dist/blog.html.
// =========================================================================

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createClient, OAuthStrategy } from '@wix/sdk';
import { posts } from '@wix/blog';
import { coverUrl, formatDate, postExcerpt, richContentToHtml, escapeHtml } from '../src/lib/ricos.js';

const clientId = process.env.VITE_WIX_CLIENT_ID || 'a8fcb08b-2408-463e-8e1e-9718035094bc';
const SITE = process.env.SITE_URL || 'https://digitalnicheagency.com';

const client = createClient({ modules: { posts }, auth: OAuthStrategy({ clientId }) });

async function fetchAll() {
  const all = [];
  let res = await client.posts.queryPosts({ fieldsets: ['RICH_CONTENT'] }).limit(100).find();
  all.push(...(res.items || []));
  let guard = 0;
  while (res.hasNext && res.hasNext() && guard++ < 20) {
    res = await res.next();
    all.push(...(res.items || []));
  }
  return all;
}

function card(p) {
  const cover = coverUrl(p);
  const thumb = cover
    ? `<span class="bcard__thumb" style="background-image:url('${cover}')"></span>`
    : `<span class="bcard__thumb"><span class="bcard__mark">DNA</span></span>`;
  return `<a class="bcard" href="/blog/${p.slug}">${thumb}<span class="bcard__body">` +
    `<span class="bcard__meta">${escapeHtml(formatDate(p)) || 'Article'}</span>` +
    `<span class="bcard__title">${escapeHtml(p.title || '')}</span>` +
    `<span class="bcard__excerpt">${escapeHtml(postExcerpt(p))}</span>` +
    `<span class="bcard__more">Read Article &rarr;</span></span></a>`;
}

function articleHtml(p) {
  const cover = coverUrl(p, 1600, 900);
  return `<p class="kicker">${escapeHtml(formatDate(p)) || 'Article'}</p>` +
    `<h1 class="post__title">${escapeHtml(p.title || '')}</h1>` +
    (cover ? `<div class="post__cover"><img src="${cover}" alt="" /></div>` : '') +
    `<div class="post__body">${richContentToHtml(p)}</div>`;
}

function metaTags(p) {
  const desc = escapeHtml(postExcerpt(p)).slice(0, 180);
  const title = escapeHtml(p.title || 'Article');
  const cover = coverUrl(p, 1200, 630);
  const url = `${SITE}/blog/${p.slug}`;
  return [
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="article" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${desc}" />`,
    cover ? `<meta property="og:image" content="${cover}" />` : '',
    `<meta property="og:url" content="${url}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
  ].filter(Boolean).join('\n    ');
}

// ---- run -----------------------------------------------------------------

if (!existsSync('dist/post.html')) {
  console.error('[gen-blog] dist/post.html missing — run `vite build` first.');
  process.exit(1);
}

let allPosts = [];
try {
  allPosts = await fetchAll();
} catch (e) {
  // Don't fail the whole deploy if Wix is briefly unreachable — the site
  // still ships and blog pages fall back to runtime fetch via the redirect.
  console.warn('[gen-blog] fetch failed, skipping static blog generation:', e.message);
  process.exit(0);
}
console.log(`[gen-blog] ${allPosts.length} posts`);

const tpl = readFileSync('dist/post.html', 'utf8');
for (const p of allPosts) {
  if (!p.slug) continue;
  let html = tpl
    .replace(
      /<article class="post" data-blog-post>[\s\S]*?<\/article>/,
      `<article class="post" data-blog-post data-prerendered data-slug="${escapeHtml(p.slug)}">${articleHtml(p)}</article>`
    )
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(p.title || 'Article')} — Digital Niche Agency</title>`)
    .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${escapeHtml(postExcerpt(p)).slice(0, 180)}" />`)
    .replace('</head>', `    ${metaTags(p)}\n  </head>`);
  mkdirSync(`dist/blog/${p.slug}`, { recursive: true });
  writeFileSync(`dist/blog/${p.slug}/index.html`, html);
}

// pre-render the /blog index card list (best-effort)
try {
  const idxPath = 'dist/blog.html';
  if (existsSync(idxPath)) {
    let idx = readFileSync(idxPath, 'utf8');
    const cards = allPosts.map(card).join('');
    idx = idx.replace(
      /(<div class="bgrid"[^>]*data-blog-index[^>]*>)[\s\S]*?(<\/div>)(\s*<\/div>\s*<\/section>)/,
      `$1${cards}$2$3`
    );
    writeFileSync(idxPath, idx);
    console.log('[gen-blog] pre-rendered blog index');
  }
} catch (e) {
  console.warn('[gen-blog] index pre-render skipped:', e.message);
}

console.log('[gen-blog] done');
