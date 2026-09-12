/**
 * App icon pipeline for "Our Travel Planner".
 *
 * Concepts live in design/icons/*.svg (1024x1024, full-bleed, with a
 * `<g id="icon-bg">` group holding the full-bleed background layers).
 *
 * Usage:
 *   node scripts/generate-icons.js                 # render QA previews for ALL concepts
 *   node scripts/generate-icons.js --apply <name>  # write production assets to public/
 *
 * QA previews  -> design/preview/<name>-{512,96,32,16}.png, -ios.png, -android.png
 * Production   -> public/icon.svg, pwa-192x192.png, pwa-512x512.png,
 *                 pwa-maskable-512x512.png, apple-touch-icon.png, favicon.ico
 */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const iconsDir = path.join(root, 'design', 'icons');
const previewDir = path.join(root, 'design', 'preview');
const publicDir = path.join(root, 'public');

const CONCEPTS = [
  { id: 'e1', file: 'concept-e1-globe-together.svg', label: 'E1 — Địa cầu TOGETHER' },
  { id: 'e2', file: 'concept-e2-heart-globe.svg', label: 'E2 — Địa cầu trái tim' },
  { id: 'e3', file: 'concept-e3-two-pins.svg', label: 'E3 — Hai ghim một hành trình' },
];

const applyIdx = process.argv.indexOf('--apply');
const applyId = applyIdx !== -1 ? process.argv[applyIdx + 1] : null;

/* ---------- helpers ---------- */

function readConcept(file) {
  return fs.readFileSync(path.join(iconsDir, file), 'utf8');
}

/** Extract the full-bleed background group so maskable builds can keep it un-scaled. */
function splitBg(svgText) {
  const m = svgText.match(/<g id="icon-bg">[\s\S]*?<\/g>/);
  if (!m) throw new Error('concept svg must contain <g id="icon-bg">');
  const openEnd = svgText.indexOf('>', svgText.indexOf('<svg')) + 1;
  const open = svgText.slice(0, openEnd);
  const rest = svgText.slice(openEnd).replace(m[0], '').replace('</svg>', '');
  return { open, bg: m[0], body: rest };
}

/** Maskable variant: full-bleed bg + artwork scaled to the 80% safe zone. */
function maskableSvg(svgText) {
  const { open, bg, body } = splitBg(svgText);
  return `${open}${bg}<g transform="translate(102.4 102.4) scale(0.8)">${body}</g></svg>`;
}

const raster = (svg, size) =>
  sharp(Buffer.from(svg), { density: 300 }).resize(size, size).png().toBuffer();

/** iOS-style squircle mask (radius ~22.5%) */
const iosMask = (size) => {
  const r = Math.round(size * 0.225);
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${r}" fill="#fff"/></svg>`
  );
};

/** Android worst-case circular mask */
const circleMask = (size) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`
  );

async function masked(png, maskSvg, size) {
  const mask = await sharp(maskSvg).resize(size, size).png().toBuffer();
  return sharp(png).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
}

/** Multi-resolution ICO (PNG entries, supported since Vista). */
function buildIco(entries) {
  const n = entries.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(n, 4);
  let offset = 6 + 16 * n;
  const dirs = entries.map(({ size, png }) => {
    const d = Buffer.alloc(16);
    const byte = size >= 256 ? 0 : size;
    d.writeUInt8(byte, 0);
    d.writeUInt8(byte, 1);
    d.writeUInt8(0, 2);
    d.writeUInt8(0, 3);
    d.writeUInt16LE(1, 4);
    d.writeUInt16LE(32, 6);
    d.writeUInt32LE(png.length, 8);
    d.writeUInt32LE(offset, 12);
    offset += png.length;
    return d;
  });
  return Buffer.concat([header, ...dirs, ...entries.map((e) => e.png)]);
}

/* ---------- QA previews ---------- */

async function renderPreviews(id, svgText) {
  fs.mkdirSync(previewDir, { recursive: true });
  for (const size of [512, 96, 64, 48, 32, 16]) {
    await raster(svgText, size).then((b) => fs.writeFileSync(path.join(previewDir, `${id}-${size}.png`), b));
  }
  const full = await raster(svgText, 512);
  const msk = await raster(maskableSvg(svgText), 512);
  fs.writeFileSync(path.join(previewDir, `${id}-ios.png`), await masked(full, iosMask(512), 512));
  fs.writeFileSync(path.join(previewDir, `${id}-android.png`), await masked(msk, circleMask(512), 512));
  console.log(`preview: ${id}`);
}

/* ---------- production assets ---------- */

async function apply(id, svgText, label) {
  const mask = maskableSvg(svgText);
  await sharp(Buffer.from(svgText)).resize(512, 512).png().toFile(path.join(publicDir, 'pwa-512x512.png'));
  await sharp(Buffer.from(svgText)).resize(192, 192).png().toFile(path.join(publicDir, 'pwa-192x192.png'));
  await sharp(Buffer.from(svgText)).resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
  await sharp(Buffer.from(mask)).resize(512, 512).png().toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));

  const ico = buildIco(
    await Promise.all([16, 32, 48, 64].map(async (size) => ({ size, png: await raster(svgText, size) })))
  );
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), ico);
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgText);
  console.log(`✔ applied "${label}" to public/ (icon.svg, 192, 512, maskable, apple-touch, favicon.ico)`);
}

/* ---------- main ---------- */

const targets = applyId ? CONCEPTS.filter((c) => c.id === applyId) : CONCEPTS;
if (applyId && targets.length === 0) {
  console.error(`unknown concept "${applyId}" — options: ${CONCEPTS.map((c) => c.id).join(', ')}`);
  process.exit(1);
}

for (const c of targets) {
  const svgText = readConcept(c.file);
  if (applyId) await apply(c.id, svgText, c.label);
  await renderPreviews(c.id, svgText);
}
console.log('done');
