// =========================================================================
// Wix Blog (headless) data layer for the browser.
//
// Reads published posts from the EXISTING Wix site via the headless Blog API.
// Does not touch or unpublish the live Wix site — read-only, public content,
// via a publishable OAuth "Visitor" client id (safe to ship in the bundle).
//
// Override the client id per-environment with VITE_WIX_CLIENT_ID in `.env`.
// Pure rendering helpers live in ./ricos.js (shared with the build script).
// =========================================================================

import { createClient, OAuthStrategy } from '@wix/sdk';
import { posts } from '@wix/blog';

export { coverUrl, formatDate, postExcerpt, richContentToHtml } from './ricos.js';

const clientId = import.meta.env.VITE_WIX_CLIENT_ID || 'a8fcb08b-2408-463e-8e1e-9718035094bc';
export const wixEnabled = Boolean(clientId);

const client = wixEnabled
  ? createClient({ modules: { posts }, auth: OAuthStrategy({ clientId }) })
  : null;

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
    // the browser; the query endpoint is allowed.
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
