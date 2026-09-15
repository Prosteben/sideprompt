// Packages ./extension into dist/promptnook-<version>.zip for Chrome Web Store upload.
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const root = path.resolve(__dirname, '..');
const ext = path.join(root, 'extension');
const manifest = JSON.parse(fs.readFileSync(path.join(ext, 'manifest.json'), 'utf8'));

// Sanity checks that commonly cause store rejections.
const problems = [];
if (manifest.key) problems.push('manifest.json must not contain "key" when uploading to the store');
for (const [, file] of Object.entries(manifest.icons)) if (!fs.existsSync(path.join(ext, file))) problems.push(`missing icon ${file}`);
for (const cs of manifest.content_scripts) for (const js of cs.js) if (!fs.existsSync(path.join(ext, js))) problems.push(`missing content script ${js}`);
if (!fs.existsSync(path.join(ext, manifest.background.service_worker))) problems.push('missing service worker');
for (const html of ['src/sidepanel.html', 'src/options.html', 'src/welcome.html']) {
  const src = fs.readFileSync(path.join(ext, html), 'utf8');
  if (/<script(?![^>]*\bsrc=)[^>]*>[^<]*\S/.test(src)) problems.push(`${html}: inline <script> violates MV3 CSP`);
  if (/\son\w+\s*=/.test(src)) problems.push(`${html}: inline event handler violates MV3 CSP`);
}
if (problems.length) {
  console.error('Build aborted:\n - ' + problems.join('\n - '));
  process.exit(1);
}

const dist = path.join(root, 'dist');
fs.mkdirSync(dist, { recursive: true });
const out = path.join(dist, `promptnook-${manifest.version}.zip`);
fs.rmSync(out, { force: true });

// Use PowerShell's Compress-Archive on Windows, `zip` elsewhere. Zip the *contents* of extension/ (manifest at root).
if (process.platform === 'win32') {
  execFileSync('powershell.exe', ['-NoProfile', '-Command', `Compress-Archive -Path '${ext}\\*' -DestinationPath '${out}' -Force`], { stdio: 'inherit' });
} else {
  execFileSync('zip', ['-r', out, '.'], { cwd: ext, stdio: 'inherit' });
}
console.log(`Built ${path.relative(root, out)} (${(fs.statSync(out).size / 1024).toFixed(0)} KB)`);
