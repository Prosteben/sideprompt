// Generates extension icons (PNG) from an inline SVG using sharp.
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const out = path.join(__dirname, '..', 'extension', 'icons');
fs.mkdirSync(out, { recursive: true });

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#6d5dfc"/>
      <stop offset="1" stop-color="#3b2fb8"/>
    </linearGradient>
  </defs>
  <rect x="4" y="4" width="120" height="120" rx="28" fill="url(#g)"/>
  <!-- chat bubble -->
  <path d="M30 34h68a10 10 0 0 1 10 10v36a10 10 0 0 1-10 10H58l-18 16v-16h-10a10 10 0 0 1-10-10V44a10 10 0 0 1 10-10z" fill="#fff" fill-opacity="0.96"/>
  <!-- lightning bolt -->
  <path d="M70 40 50 68h14l-6 22 22-30H66z" fill="#4b3ee0"/>
</svg>`;

(async () => {
  for (const size of [16, 32, 48, 128]) {
    await sharp(Buffer.from(svg)).resize(size, size).png().toFile(path.join(out, `icon${size}.png`));
  }
  // Store assets: 128px icon is used by Chrome Web Store, plus a 440x280 small promo tile.
  const promo = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 280">
  <rect width="440" height="280" fill="#1a1740"/>
  <g transform="translate(40 76) scale(1)">${svg.replace(/<svg[^>]*>|<\/svg>/g, '')}</g>
  <text x="190" y="128" font-family="Segoe UI, Arial, sans-serif" font-size="34" font-weight="700" fill="#fff">SidePrompt</text>
  <text x="190" y="160" font-family="Segoe UI, Arial, sans-serif" font-size="16" fill="#c9c6ff">Your AI prompts, one click away</text>
  <text x="190" y="186" font-family="Segoe UI, Arial, sans-serif" font-size="13" fill="#8f8bd6">ChatGPT · Claude · Gemini · Copilot</text>
</svg>`;
  fs.mkdirSync(path.join(__dirname, '..', 'store', 'assets'), { recursive: true });
  await sharp(Buffer.from(promo)).resize(440, 280).png().toFile(path.join(__dirname, '..', 'store', 'assets', 'promo-small-440x280.png'));
  console.log('icons written to', out);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
