import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('https://digitalnicheagency.com', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(3500);

// scroll through to trigger lazy sections
for (let y = 0; y < 12000; y += 700) {
  await page.evaluate((yy) => window.scrollTo(0, yy), y);
  await page.waitForTimeout(180);
}
await page.waitForTimeout(800);

const data = await page.evaluate(() => {
  const headings = [...document.querySelectorAll('h1,h2,h3')]
    .map((h) => `${h.tagName}: ${h.innerText.trim().replace(/\s+/g, ' ')}`)
    .filter((t) => t.length > 4);
  const sections = [...document.querySelectorAll('section, [class*="section"], footer')]
    .map((s) => {
      const h = s.querySelector('h1,h2,h3');
      return h ? h.innerText.trim().replace(/\s+/g, ' ').slice(0, 80) : null;
    })
    .filter(Boolean);
  return { headings, sectionHeads: [...new Set(sections)] };
});

console.log('=== ALL HEADINGS (in order) ===');
console.log(data.headings.join('\n'));
console.log('\n=== SECTION-LEVEL HEADINGS ===');
console.log(data.sectionHeads.join('\n'));
await browser.close();
