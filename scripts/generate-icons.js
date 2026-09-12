import sharp from 'sharp';
import fs from 'fs';

// Accurate vector recreation of the user's romantic "TOGETHER" globe travel badge
const svgContent = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Text path for curved TOGETHER text -->
    <path id="togetherPath" d="M 334 260 A 116 116 0 0 1 268 402" />
  </defs>

  <!-- Background Base (Taupe / Warm Vintage Sand Canvas) -->
  <rect width="512" height="512" fill="#B7A797" />

  <!-- Star Cross 1 (Top Left) -->
  <g stroke="#3D2E28" stroke-width="6" stroke-linecap="round">
    <line x1="76" y1="68" x2="76" y2="98" />
    <line x1="61" y1="83" x2="91" y2="83" />
  </g>

  <!-- Star Cross 2 (Bottom Right) -->
  <g stroke="#3D2E28" stroke-width="6" stroke-linecap="round">
    <line x1="452" y1="310" x2="452" y2="336" />
    <line x1="439" y1="323" x2="465" y2="323" />
  </g>

  <!-- Back Portion of Orbital Ring -->
  <path d="M 120 355 C 50 330 55 270 140 230 C 230 190 350 195 400 240 C 420 260 415 290 380 320" 
        fill="none" 
        stroke="#3D2E28" 
        stroke-width="11" 
        stroke-linecap="round" />

  <!-- Main Globe Circle -->
  <circle cx="236" cy="296" r="122" fill="#EFE8DC" stroke="#3D2E28" stroke-width="11" />

  <!-- Location Pin (Top Right) -->
  <g>
    <!-- Pin Body -->
    <path d="M 370 74 C 332 74 310 108 310 146 C 310 188 350 230 370 248 C 390 230 430 188 430 146 C 430 108 408 74 370 74 Z" 
          fill="#3D2E28" />
    <!-- White / Cream Heart inside Pin -->
    <path d="M 370 144 C 370 144 350 130 350 117 C 350 108 357 100 366 100 C 370 100 375 103 378 107 C 381 103 386 100 390 100 C 399 100 406 108 406 117 C 406 130 370 144 370 144 Z" 
          fill="#EFE8DC" />
  </g>

  <!-- Front Portion of Orbital Ring (overlaps the globe) -->
  <path d="M 86 360 C 130 400 240 425 330 380 C 380 350 412 300 380 320" 
        fill="none" 
        stroke="#3D2E28" 
        stroke-width="11" 
        stroke-linecap="round" />

  <!-- Coral Heart on Bottom-Left Ring Edge -->
  <path d="M 74 382 C 74 382 60 370 60 359 C 60 352 65 345 72 345 C 76 345 80 348 82 351 C 84 348 88 345 92 345 C 99 345 104 352 104 359 C 104 370 74 382 74 382 Z" 
        fill="#CE6C5E" 
        transform="rotate(-15 74 382)" />

  <!-- Upper Dotted Flight Trail (Dark Brown) -->
  <g fill="#3D2E28">
    <circle cx="160" cy="346" r="4.5" />
    <circle cx="170" cy="324" r="4.5" />
    <circle cx="183" cy="303" r="4.5" />
    <circle cx="198" cy="286" r="4.5" />
    <circle cx="254" cy="254" r="4.5" />
    <circle cx="275" cy="246" r="4.5" />
    <circle cx="297" cy="241" r="4.5" />
    <circle cx="319" cy="238" r="4.5" />
  </g>

  <!-- Airplane 1 (Dark Brown, Flying Up-Right) -->
  <g transform="translate(216, 268) rotate(35) scale(0.95)" fill="#3D2E28">
    <!-- Fuselage -->
    <path d="M 0 -18 C 3 -18 5 -12 5 8 L 4 18 C 4 19 2 20 0 20 C -2 20 -4 19 -4 18 L -5 8 C -5 -12 -3 -18 0 -18 Z" />
    <!-- Main Wings -->
    <path d="M 0 -4 L 18 8 L 17 12 L 0 5 L -17 12 L -18 8 Z" />
    <!-- Tail Wing -->
    <path d="M 0 13 L 9 18 L 8 21 L 0 18 L -8 21 L -9 18 Z" />
  </g>

  <!-- Lower Dotted Flight Trail (Coral Red) -->
  <g fill="#CE6C5E">
    <circle cx="270" cy="274" r="4" />
    <circle cx="288" cy="265" r="4" />
    <circle cx="308" cy="260" r="4.5" />
    <circle cx="266" cy="296" r="4.5" />
    <circle cx="320" cy="385" r="4.5" />
    <circle cx="316" cy="399" r="4" />
    <circle cx="155" cy="385" r="3.5" />
  </g>

  <!-- Airplane 2 (Coral Red, Flying Down-Right) -->
  <g transform="translate(295, 305) rotate(130) scale(0.85)" fill="#CE6C5E">
    <!-- Fuselage -->
    <path d="M 0 -18 C 3 -18 5 -12 5 8 L 4 18 C 4 19 2 20 0 20 C -2 20 -4 19 -4 18 L -5 8 C -5 -12 -3 -18 0 -18 Z" />
    <!-- Main Wings -->
    <path d="M 0 -4 L 18 8 L 17 12 L 0 5 L -17 12 L -18 8 Z" />
    <!-- Tail Wing -->
    <path d="M 0 13 L 9 18 L 8 21 L 0 18 L -8 21 L -9 18 Z" />
  </g>

  <!-- "TOGETHER" Curved Text Along Lower Right Rim -->
  <text fill="#3D2E28" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="28" letter-spacing="4">
    <textPath href="#togetherPath" startOffset="5%">TOGETHER</textPath>
  </text>
</svg>
`;

fs.writeFileSync('public/icon.svg', svgContent);

// 1. Standard 512x512 PNG
await sharp(Buffer.from(svgContent))
  .resize(512, 512)
  .png({ quality: 100 })
  .toFile('public/pwa-512x512.png');

// 2. 192x192 PNG
await sharp(Buffer.from(svgContent))
  .resize(192, 192)
  .png({ quality: 100 })
  .toFile('public/pwa-192x192.png');

// 3. Apple Touch Icon 180x180
await sharp(Buffer.from(svgContent))
  .resize(180, 180)
  .png({ quality: 100 })
  .toFile('public/apple-touch-icon.png');

// 4. Maskable icon (with safe padding)
const maskableSvg = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#B7A797" />
  <g transform="translate(51, 51) scale(0.8)">
    ${svgContent.replace(/<\/?svg[^>]*>/g, '').replace(/<rect width="512" height="512" fill="#B7A797" \/>/, '')}
  </g>
</svg>
`;

await sharp(Buffer.from(maskableSvg))
  .resize(512, 512)
  .png({ quality: 100 })
  .toFile('public/pwa-maskable-512x512.png');

// 5. Favicon 64x64 & 32x32
await sharp(Buffer.from(svgContent))
  .resize(64, 64)
  .png()
  .toFile('public/favicon.ico');

console.log('Together Travel Badge Icons generated successfully!');
