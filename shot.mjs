import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const URL = process.env.URL || 'http://localhost:5174/';
mkdirSync('shots', { recursive: true });

const browser = await chromium.launch({
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--ignore-gpu-blocklist',
    '--enable-unsafe-swiftshader',
  ],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

await page.goto(URL, { waitUntil: 'domcontentloaded' });
// capture the intro mid-assemble (two frames), then let it finish
await page.waitForTimeout(650);
await page.screenshot({ path: 'shots/intro-a.png' });
await page.waitForTimeout(700);
await page.screenshot({ path: 'shots/intro-b.png' });
await page.waitForTimeout(3000);

// confirm WebGL actually produced something
const glOk = await page.evaluate(() => {
  const c = document.getElementById('helix-canvas');
  const gl = c.getContext('webgl2') || c.getContext('webgl');
  return { hasCtx: !!gl, w: c.width, h: c.height };
});
console.log('WebGL:', JSON.stringify(glOk));

const scenes = [
  'hero', 'overview', 'clients', 'services', 'midcta', 'about',
  'team', 'testimonials', 'reel', 'media', 'insights', 'finalcta', 'footer',
];
// drive by real section offsets rather than assuming a fixed height
const offsets = await page.evaluate(() =>
  [...document.querySelectorAll('[data-scene]')].map(
    (s) => s.getBoundingClientRect().top + window.scrollY
  )
);
for (let i = 0; i < scenes.length; i++) {
  const targetY = Math.round(offsets[i] + 120);
  // wheel toward target in small steps so Lenis + ScrollTrigger follow naturally
  let cur = await page.evaluate(() => window.scrollY);
  let guard = 0;
  while (Math.abs(cur - targetY) > 40 && guard++ < 120) {
    const delta = Math.sign(targetY - cur) * Math.min(180, Math.abs(targetY - cur));
    await page.mouse.wheel(0, delta);
    await page.waitForTimeout(40);
    cur = await page.evaluate(() => window.scrollY);
  }
  await page.waitForTimeout(1300); // let helix lerp + bloom settle
  await page.screenshot({ path: `shots/${i}-${scenes[i]}.png` });
  console.log(`shot ${i}-${scenes[i]} @ scrollY=${Math.round(cur)}`);
}

console.log(errors.length ? '\nERRORS:\n' + errors.join('\n') : '\nNo console/page errors.');
await browser.close();
