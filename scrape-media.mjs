import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('https://digitalnicheagency.com', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(4000);
for (let y = 0; y < 13000; y += 350) {
  await page.evaluate((yy) => window.scrollTo(0, yy), y);
  await page.waitForTimeout(120);
}
await page.waitForTimeout(1200);

const data = await page.evaluate(() => {
  const out = { yt: [], wixImgs: [], bg: [] };
  // youtube ids from iframes, links, ytimg urls
  const ids = new Set();
  document.querySelectorAll('iframe').forEach((f) => {
    const m = (f.src || '').match(/embed\/([\w-]{11})/);
    if (m) ids.add(m[1]);
  });
  document.querySelectorAll('a[href]').forEach((a) => {
    const m = a.href.match(/(?:youtu\.be\/|v=)([\w-]{11})/);
    if (m) ids.add(m[1]);
  });
  document.querySelectorAll('img').forEach((img) => {
    const s = img.currentSrc || img.src || '';
    const m = s.match(/ytimg\.com\/vi\/([\w-]{11})/);
    if (m) ids.add(m[1]);
  });
  out.yt = [...ids];

  // all wixstatic images in the document with decent size, with order + nearby text
  document.querySelectorAll('img').forEach((img) => {
    const s = img.currentSrc || img.src || '';
    if (!/wixstatic\.com\/media/.test(s)) return;
    if (img.naturalWidth < 150 || img.naturalHeight < 90) return;
    if (/w_220,h_215|w_440,h_430/.test(s)) return; // team
    if (img.naturalWidth === 218) return; // logos
    let t = '', el = img;
    for (let i = 0; i < 6 && el; i++) {
      if (el.innerText && el.innerText.trim().length > 15) { t = el.innerText.trim(); break; }
      el = el.parentElement;
    }
    out.wixImgs.push({ src: s, w: img.naturalWidth, h: img.naturalHeight, near: t.replace(/\s+/g, ' ').slice(0, 100) });
  });

  // background images
  document.querySelectorAll('*').forEach((el) => {
    const bg = getComputedStyle(el).backgroundImage;
    const m = bg && bg.match(/url\("?(https:\/\/(?:static\.wixstatic|i\.ytimg)[^")]+)"?\)/);
    if (m && el.offsetWidth > 200 && el.offsetHeight > 120) {
      out.bg.push({ src: m[1], w: el.offsetWidth, h: el.offsetHeight });
    }
  });
  return out;
});

writeFileSync('media-assets.json', JSON.stringify(data, null, 2));
console.log('YOUTUBE IDS:', data.yt.join(', '));
console.log('\nWIX IMAGES (' + data.wixImgs.length + '):');
data.wixImgs.forEach((i) => console.log(`  ${i.w}x${i.h} | ${i.near.slice(0,70)} | ${i.src.slice(0,80)}`));
console.log('\nBG IMAGES (' + data.bg.length + '):');
[...new Set(data.bg.map((b) => b.src))].forEach((s) => console.log('  ' + s.slice(0, 95)));
await browser.close();
