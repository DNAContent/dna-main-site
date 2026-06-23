import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';

const { yt } = JSON.parse(readFileSync('media-assets.json', 'utf8'));
mkdirSync('public/media', { recursive: true });

async function get(url) {
  const r = await fetch(url);
  if (!r.ok) return null;
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length < 2000) return null; // YT returns a tiny placeholder for missing maxres
  return buf;
}

const files = [];
let i = 0;
for (const id of yt) {
  i++;
  let buf = await get(`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`);
  if (!buf) buf = await get(`https://i.ytimg.com/vi/${id}/hqdefault.jpg`);
  if (!buf) { console.log('MISS', id); continue; }
  const file = `media/ep-${i}.jpg`;
  writeFileSync(`public/${file}`, buf);
  files.push(file);
  console.log('OK  ', file, (buf.length / 1024).toFixed(0) + 'kb', id);
}
writeFileSync('public/media/manifest.json', JSON.stringify(files, null, 2));
console.log('\nmedia thumbs:', files.length);
