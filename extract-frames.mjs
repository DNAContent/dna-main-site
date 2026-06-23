import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const vids = [
  ['ref1', '/Users/admin/Downloads/original-c01ecf3eed44983136480b054b65d3c3.mp4'],
  ['ref2', '/Users/admin/Downloads/original-8d07903495d53d058b2306651422c640.mp4'],
  ['ref3', '/Users/admin/Downloads/68e8e7a151aeef7868b05f0bff5a4dd3.mp4'],
  ['ref4', '/Users/admin/Downloads/original-f568734774ed0af4788d87f5cadaa4b6.mp4'],
];
mkdirSync('refs', { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

for (const [name, path] of vids) {
  const url = pathToFileURL(path).href;
  await page.setContent(
    `<body style="margin:0;background:#000"><video id="v" src="${url}" style="width:100vw;height:100vh;object-fit:contain"></video></body>`
  );
  const meta = await page.evaluate(
    () =>
      new Promise((res) => {
        const v = document.getElementById('v');
        v.muted = true;
        v.addEventListener('loadedmetadata', () =>
          res({ dur: v.duration, w: v.videoWidth, h: v.videoHeight })
        );
        v.addEventListener('error', () => res({ err: true }));
        setTimeout(() => res({ timeout: true }), 8000);
      })
  );
  console.log(`${name}: ${JSON.stringify(meta)}`);
  if (meta.err || meta.timeout || !meta.dur) continue;

  const fracs = [0.08, 0.28, 0.5, 0.72, 0.92];
  for (let i = 0; i < fracs.length; i++) {
    const t = meta.dur * fracs[i];
    await page.evaluate(
      (tt) =>
        new Promise((res) => {
          const v = document.getElementById('v');
          v.addEventListener('seeked', () => res(), { once: true });
          v.currentTime = tt;
          setTimeout(res, 2500);
        }),
      t
    );
    await page.waitForTimeout(120);
    await page.screenshot({ path: `refs/${name}-${i}.png` });
  }
  console.log(`  -> 5 frames`);
}
await browser.close();
