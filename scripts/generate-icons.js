import sharp from 'sharp';
import fs from 'fs';

// Exquisite luxury travel journal & voyage compass icon with gold/terracotta/leather palette
const svgContent = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background Gradient (Rich Warm Terracotta & Deep Espresso Leather) -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4A2F22" />
      <stop offset="50%" stop-color="#321D14" />
      <stop offset="100%" stop-color="#1F110B" />
    </linearGradient>

    <!-- Golden Metallic Gradient -->
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FCE1A8" />
      <stop offset="35%" stop-color="#E5BA6A" />
      <stop offset="70%" stop-color="#D69B3D" />
      <stop offset="100%" stop-color="#9E6E24" />
    </linearGradient>

    <!-- Rose Gold / Romantic Accent -->
    <linearGradient id="roseAccent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFB3A7" />
      <stop offset="50%" stop-color="#E27364" />
      <stop offset="100%" stop-color="#B84435" />
    </linearGradient>

    <!-- Subtle Vignette / Inner Glow -->
    <radialGradient id="innerGlow" cx="50%" cy="45%" r="65%">
      <stop offset="0%" stop-color="#8C583E" stop-opacity="0.5" />
      <stop offset="60%" stop-color="#4A2F22" stop-opacity="0.1" />
      <stop offset="100%" stop-color="#140B07" stop-opacity="0.8" />
    </radialGradient>

    <!-- Drop Shadow Filter -->
    <filter id="dropShadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.55" />
    </filter>

    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- App Icon Base Squircle -->
  <rect width="512" height="512" rx="116" fill="url(#bgGrad)" />
  <rect width="512" height="512" rx="116" fill="url(#innerGlow)" />
  <!-- Delicate Outer Border Stitching -->
  <rect x="18" y="18" width="476" height="476" rx="100" fill="none" stroke="url(#goldGrad)" stroke-width="3" stroke-dasharray="8 6" stroke-opacity="0.4" />
  <rect x="26" y="26" width="460" height="460" rx="92" fill="none" stroke="url(#goldGrad)" stroke-width="1.5" stroke-opacity="0.6" />

  <!-- Outer Celestial & Compass Ring Group -->
  <g filter="url(#dropShadow)">
    <!-- Outer Golden Compass Dial -->
    <circle cx="256" cy="256" r="172" fill="none" stroke="url(#goldGrad)" stroke-width="5" stroke-opacity="0.85" />
    <circle cx="256" cy="256" r="162" fill="#24140D" fill-opacity="0.6" stroke="url(#goldGrad)" stroke-width="1.5" stroke-opacity="0.5" />

    <!-- Degree Ticks -->
    <!-- 12 major hour ticks -->
    <g stroke="url(#goldGrad)" stroke-width="2.5" stroke-linecap="round" opacity="0.8">
      <line x1="256" y1="94" x2="256" y2="108" />
      <line x1="256" y1="404" x2="256" y2="418" />
      <line x1="94" y1="256" x2="108" y2="256" />
      <line x1="404" y1="256" x2="418" y2="256" />

      <!-- 45 degree ticks -->
      <line x1="141" y1="141" x2="152" y2="152" />
      <line x1="371" y1="141" x2="360" y2="152" />
      <line x1="141" y1="371" x2="152" y2="360" />
      <line x1="371" y1="371" x2="360" y2="360" />
    </g>

    <!-- Cardinal Directions Typography -->
    <text x="256" y="130" font-family="'Playfair Display', Georgia, serif" font-weight="800" font-size="20" fill="url(#goldGrad)" text-anchor="middle" letter-spacing="1">N</text>
    <text x="256" y="398" font-family="'Playfair Display', Georgia, serif" font-weight="700" font-size="18" fill="url(#goldGrad)" text-anchor="middle" letter-spacing="1" opacity="0.85">S</text>
    <text x="122" y="262" font-family="'Playfair Display', Georgia, serif" font-weight="700" font-size="18" fill="url(#goldGrad)" text-anchor="middle" letter-spacing="1" opacity="0.85">W</text>
    <text x="390" y="262" font-family="'Playfair Display', Georgia, serif" font-weight="700" font-size="18" fill="url(#goldGrad)" text-anchor="middle" letter-spacing="1" opacity="0.85">E</text>

    <!-- Inner Globe / Journey Coordinate Latitude Ellipses -->
    <ellipse cx="256" cy="256" rx="138" ry="52" fill="none" stroke="url(#goldGrad)" stroke-width="1.2" stroke-dasharray="4 4" stroke-opacity="0.35" transform="rotate(-25 256 256)" />
    <ellipse cx="256" cy="256" rx="138" ry="110" fill="none" stroke="url(#goldGrad)" stroke-width="1.2" stroke-dasharray="4 4" stroke-opacity="0.25" transform="rotate(-25 256 256)" />

    <!-- 8-Pointed Master Navigator Compass Rose -->
    <!-- Secondary Points (NE, SE, SW, NW) -->
    <g opacity="0.9">
      <!-- NE -->
      <polygon points="256,256 248,248 335,177" fill="#8A5A38" />
      <polygon points="256,256 264,248 335,177" fill="#DFAC5A" />
      <!-- NW -->
      <polygon points="256,256 248,264 177,177" fill="#DFAC5A" />
      <polygon points="256,256 248,248 177,177" fill="#8A5A38" />
      <!-- SE -->
      <polygon points="256,256 264,264 335,335" fill="#8A5A38" />
      <polygon points="256,256 264,248 335,335" fill="#DFAC5A" />
      <!-- SW -->
      <polygon points="256,256 248,264 177,335" fill="#8A5A38" />
      <polygon points="256,256 256,264 177,335" fill="#DFAC5A" />
    </g>

    <!-- Primary Cardinal Needles (North Star & Main Points) -->
    <!-- North Needle (Primary - vibrant gold and ruby accent) -->
    <polygon points="256,256 238,256 256,134" fill="#C9943B" />
    <polygon points="256,256 274,256 256,134" fill="#FFE2A3" />

    <!-- South Needle -->
    <polygon points="256,256 238,256 256,378" fill="#FFE2A3" />
    <polygon points="256,256 274,256 256,378" fill="#8A5A38" />

    <!-- East Needle -->
    <polygon points="256,256 256,238 378,256" fill="#C9943B" />
    <polygon points="256,256 256,274 378,256" fill="#FFE2A3" />

    <!-- West Needle -->
    <polygon points="256,256 256,238 134,256" fill="#FFE2A3" />
    <polygon points="256,256 256,274 134,256" fill="#8A5A38" />

    <!-- Romantic Heart at the Center Core (Our Travel Planner soul) -->
    <circle cx="256" cy="256" r="34" fill="#24140D" stroke="url(#goldGrad)" stroke-width="4" />
    <circle cx="256" cy="256" r="28" fill="url(#roseAccent)" />
    
    <!-- Heart Symbol (Cutout / Emboss) -->
    <path d="M256 267 C256 267 242 258 238 250 C234 242 238 235 244 235 C249 235 253 238 256 242 C259 238 263 235 268 235 C274 235 278 242 274 250 C270 258 256 267 256 267 Z" 
          fill="#FFFDF9" 
          filter="url(#glow)" />

    <!-- Center Tiny Gold Rivet -->
    <circle cx="256" cy="256" r="4.5" fill="#FFE2A3" />
  </g>

  <!-- Sparkling Celestial Accent Stars -->
  <g fill="url(#goldGrad)" opacity="0.8">
    <path d="M86,96 L88,104 L96,106 L88,108 L86,116 L84,108 L76,106 L84,104 Z" />
    <path d="M424,96 L426,104 L434,106 L426,108 L424,116 L422,108 L414,106 L422,104 Z" />
    <path d="M424,406 L426,414 L434,416 L426,418 L424,426 L422,418 L414,416 L422,414 Z" />
    <path d="M86,406 L88,414 L96,416 L88,418 L86,426 L84,418 L76,416 L84,414 Z" />
  </g>
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

// 4. Maskable icon (Android requires ~15% safe area margin around icon content)
const maskableSvg = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#2E1A11" />
  <g transform="translate(51, 51) scale(0.8)">
    ${svgContent.replace(/<\/?svg[^>]*>/g, '')}
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

console.log('Luxury Travel App Icons generated successfully!');
