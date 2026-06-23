import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('https://digitalnicheagency.com', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(3000);
for (let y = 0; y < 12000; y += 600) {
  await page.evaluate((yy) => window.scrollTo(0, yy), y);
  await page.waitForTimeout(150);
}

const wanted = [
  'Your Growth Partners',
  'Why Clients Love DNA',
  'Latest Media Features',
  'Insights Straight From The Team',
  'Your Business Matters',
];

for (const key of wanted) {
  const text = await page.evaluate((k) => {
    const all = [...document.querySelectorAll('section, div')];
    const node = all.find((el) => {
      const h = el.querySelector('h1,h2,h3');
      return h && h.innerText.includes(k);
    });
    if (!node) return '(not found)';
    return node.innerText.trim().replace(/\n{2,}/g, '\n').slice(0, 900);
  }, key);
  console.log(`\n===== ${key} =====\n${text}`);
}
await browser.close();
