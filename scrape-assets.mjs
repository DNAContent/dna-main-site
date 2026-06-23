import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const NAMES = [
  'Jason Fishman', 'Tim Martinez', 'Khalil Doheny', 'Abby Kehr', 'Brenden Togioka',
  'Nicky Cheung', 'Jazz Parker', 'Ashley Inman', 'Janette Cornish', 'Sara Bradbury',
  'Mark Laufgraben', 'Jack Sweeney', 'Alesen Jajou', 'Ted Horton-Billard', 'Keith Whitworth',
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('https://digitalnicheagency.com', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(4000);
for (let y = 0; y < 12000; y += 450) {
  await page.evaluate((yy) => window.scrollTo(0, yy), y);
  await page.waitForTimeout(130);
}
await page.waitForTimeout(800);

// name -> photo via locators: nearest ancestor that contains an <img>
const team = [];
for (const name of NAMES) {
  const loc = page.getByText(name, { exact: false }).first();
  let src = null;
  if (await loc.count()) {
    const img = loc.locator('xpath=ancestor-or-self::*[.//img][1]//img').first();
    if (await img.count()) src = (await img.getAttribute('src')) || null;
  }
  team.push({ name, src });
}

// client logos: wixstatic media images that aren't the team crops / tracking pixels
const logos = await page.evaluate(() => {
  const seen = new Set();
  return [...document.querySelectorAll('img')]
    .map((img) => ({ src: img.currentSrc || img.src, alt: img.alt, w: img.naturalWidth, h: img.naturalHeight }))
    .filter((i) => {
      if (!i.src.includes('wixstatic.com/media')) return false;
      if (i.w < 40 || i.h < 40) return false;
      if (/fill\/w_220,h_215/.test(i.src)) return false; // team crop signature
      const key = i.src.split('/media/')[1].split('~')[0];
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
});

writeFileSync('assets.json', JSON.stringify({ team, logos }, null, 2));
console.log('=== TEAM name -> photo ===');
team.forEach((t) => console.log(`${t.src ? 'OK ' : 'MISS'} ${t.name}  ${t.src ? t.src.slice(0, 90) : ''}`));
console.log(`\n=== CLIENT-LOGO CANDIDATES (${logos.length}) ===`);
logos.forEach((l) => console.log(`${l.w}x${l.h}  ${l.alt || '(no alt)'}  ${l.src.slice(0, 110)}`));
await browser.close();
