// Copies Playwright's bundled Chromium into ./.browser so tests can load the unpacked extension.
// (Google Chrome >= 137 ignores --load-extension; on some Windows machines the copy inside
//  %LOCALAPPDATA%\ms-playwright fails to start with a side-by-side error, a local copy works.)
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');

const dest = path.resolve(__dirname, '..', '.browser', 'chrome-win64');
if (fs.existsSync(path.join(dest, 'chrome.exe'))) {
  console.log('browser already present at', dest);
  process.exit(0);
}
const base = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(os.homedir(), 'AppData', 'Local', 'ms-playwright');
let dirs = fs.existsSync(base) ? fs.readdirSync(base).filter((d) => /^chromium-\d+$/.test(d)).sort() : [];
if (!dirs.length) {
  console.log('Installing Playwright Chromium...');
  execSync('npx playwright install chromium', { stdio: 'inherit' });
  dirs = fs.readdirSync(base).filter((d) => /^chromium-\d+$/.test(d)).sort();
}
const src = path.join(base, dirs[dirs.length - 1], 'chrome-win64');
console.log('Copying', src, '->', dest);
fs.cpSync(src, dest, { recursive: true });
console.log('done');
