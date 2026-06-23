import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';

const { team, logos } = JSON.parse(readFileSync('assets.json', 'utf8'));
mkdirSync('public/team', { recursive: true });
mkdirSync('public/clients', { recursive: true });

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
async function dl(url, path) {
  const r = await fetch(url);
  if (!r.ok) { console.log('FAIL', r.status, path); return false; }
  const buf = Buffer.from(await r.arrayBuffer());
  writeFileSync(path, buf);
  console.log('OK  ', path, (buf.length / 1024).toFixed(0) + 'kb');
  return true;
}

// team — upscale the Wix crop to 2x for retina
const manifest = [];
for (const t of team) {
  if (!t.src) continue;
  const url = t.src.replace(/fill\/w_220,h_215/, 'fill/w_440,h_430');
  const file = `team/${slug(t.name)}.avif`;
  if (await dl(url, `public/${file}`)) manifest.push({ name: t.name, file });
}
writeFileSync('public/team/manifest.json', JSON.stringify(manifest, null, 2));

// client logos — the 218x54 lockups, deduped
const seen = new Set();
const logoFiles = [];
let i = 0;
for (const l of logos) {
  if (l.w !== 218 || l.h !== 54) continue;
  const key = l.src.split('/media/')[1].split('~')[0];
  if (seen.has(key)) continue;
  seen.add(key);
  const file = `clients/logo-${++i}.avif`;
  if (await dl(l.src, `public/${file}`)) logoFiles.push(file);
}
writeFileSync('public/clients/manifest.json', JSON.stringify(logoFiles, null, 2));

// white DNA logo for nav/footer
const white = logos.find((l) => /DNA-logo-White/i.test(l.alt));
if (white) await dl(white.src, 'public/dna-logo-white.avif');

console.log(`\nteam: ${manifest.length}  logos: ${logoFiles.length}`);
