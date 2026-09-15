// Produces Chrome Web Store screenshots (1280x800) into store/assets/ using the real extension UI.
const { chromium } = require('playwright');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const os = require('os');

const root = path.resolve(__dirname, '..');
const EXT = path.join(root, 'extension');
const OUT = path.join(root, 'store', 'assets');
fs.mkdirSync(OUT, { recursive: true });

const PANEL_W = 400, H = 800, W = 1280;

const CHAT_MOCK = `<!doctype html><html><head><meta charset="utf-8"><style>
  body{margin:0;font:15px/1.5 system-ui,Segoe UI,sans-serif;background:#f7f7f8;color:#111;height:100vh;display:flex;flex-direction:column}
  header{padding:14px 24px;border-bottom:1px solid #e5e5e5;background:#fff;font-weight:600;display:flex;gap:10px;align-items:center}
  header i{width:22px;height:22px;border-radius:6px;background:linear-gradient(135deg,#10a37f,#1fc2a0);display:inline-block}
  main{flex:1;max-width:720px;width:100%;margin:0 auto;padding:40px 24px;display:flex;flex-direction:column;gap:22px}
  .msg{display:flex;gap:12px}.msg b{width:32px;height:32px;border-radius:50%;background:#ddd;flex:none;display:grid;place-items:center;font-size:13px}
  .msg.ai b{background:#10a37f;color:#fff}.bubble{background:#fff;border:1px solid #e5e5e5;border-radius:12px;padding:12px 14px;max-width:560px}
  footer{padding:0 24px 28px}.box{max-width:720px;margin:0 auto;background:#fff;border:1px solid #d9d9e3;border-radius:16px;padding:14px 16px;min-height:88px;box-shadow:0 4px 18px rgba(0,0,0,.06);white-space:pre-wrap;color:#222}
  .hint{color:#999;font-size:12px;text-align:center;margin-top:10px}
</style></head><body>
<header><i></i> AI Chat</header>
<main>
  <div class="msg"><b>You</b><div class="bubble">Can you help me review a pull request?</div></div>
  <div class="msg ai"><b>AI</b><div class="bubble">Of course! Paste the code and tell me what to focus on – correctness, security, readability or performance.</div></div>
</main>
<footer><div class="box" id="composer" contenteditable="true">Review the following JavaScript as a senior engineer. Focus on: correctness, security, readability, and performance. For each issue give severity (high/medium/low), the line or snippet, and a fixed version.</div>
<div class="hint">Prompt inserted by PromptNook ⚡ – press Enter to send</div></footer>
</body></html>`;

async function launch() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'pv-shots-'));
  const localExe = path.join(root, '.browser', 'chrome-win64', 'chrome.exe');
  const context = await chromium.launchPersistentContext(profile, {
    ...(fs.existsSync(localExe) ? { executablePath: localExe } : { channel: 'chromium' }),
    headless: true,
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
    deviceScaleFactor: 1,
  });
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker');
  await context.route('https://extensionpay.com/**', (r) => r.abort());
  return { context, extId: sw.url().split('/')[2], profile };
}

async function compose(name, chatPng, panelPng, caption) {
  const captionSvg = Buffer.from(`<svg width="${W}" height="64" xmlns="http://www.w3.org/2000/svg">
    <rect width="${W}" height="64" fill="#1a1740"/>
    <text x="24" y="40" font-family="Segoe UI, Arial, sans-serif" font-size="22" font-weight="600" fill="#fff">${caption}</text>
  </svg>`);
  await sharp({ create: { width: W, height: H, channels: 4, background: '#e9e9ef' } })
    .composite([
      { input: await sharp(chatPng).resize(W - PANEL_W, H - 64, { fit: 'cover', position: 'top' }).toBuffer(), left: 0, top: 64 },
      { input: await sharp(panelPng).resize(PANEL_W, H - 64, { fit: 'cover', position: 'top' }).toBuffer(), left: W - PANEL_W, top: 64 },
      { input: Buffer.from(`<svg width="2" height="${H - 64}"><rect width="2" height="${H - 64}" fill="#cfcfd8"/></svg>`), left: W - PANEL_W - 1, top: 64 },
      { input: captionSvg, left: 0, top: 0 },
    ])
    .png()
    .toFile(path.join(OUT, name));
  console.log('wrote', name);
}

(async () => {
  const { context, extId, profile } = await launch();
  try {
    for (const p of context.pages()) if (p.url().includes('welcome.html')) await p.close();
    const chat = await context.newPage();
    await chat.setViewportSize({ width: W - PANEL_W, height: H - 64 });
    await chat.setContent(CHAT_MOCK);
    const chatPng = await chat.screenshot();

    const panel = await context.newPage();
    await panel.setViewportSize({ width: PANEL_W, height: H - 64 });
    await panel.goto(`chrome-extension://${extId}/src/sidepanel.html`);
    await panel.waitForSelector('.card');
    await panel.evaluate(() => PV.setPro(true)); // hide quota bar for a clean shot
    await panel.waitForSelector('#proBadge:not([hidden])');
    await panel.hover('.card >> nth=0');
    await compose('screenshot-1-library.png', chatPng, await panel.screenshot(), 'Your prompt library, right next to any AI chat');

    // Variables dialog
    await panel.click('.card:has-text("Code review") [data-action=copy]');
    await panel.waitForSelector('#dlgVars[open]');
    await panel.fill('#dlgVars [name=language]', 'JavaScript');
    await panel.fill('#dlgVars [name=code]', 'function sum(a, b) {\n  return a + b\n}');
    await compose('screenshot-2-variables.png', chatPng, await panel.screenshot(), 'Fill in {{variables}} before inserting');
    await panel.click('#dlgVars [data-close]');

    // Search + folders
    await panel.fill('#search', 'review');
    await compose('screenshot-3-search.png', chatPng, await panel.screenshot(), 'Instant search, folders and #tags');
    await panel.fill('#search', '');

    // Editor
    await panel.click('.card:has-text("Landing page copy") [data-action=edit]');
    await panel.waitForSelector('#viewEdit:not([hidden])');
    await compose('screenshot-4-editor.png', chatPng, await panel.screenshot(), 'Edit prompts with variables, defaults and pins');

    // Options page (full-width)
    const opts = await context.newPage();
    await opts.setViewportSize({ width: W, height: H });
    await opts.goto(`chrome-extension://${extId}/src/options.html`);
    await opts.waitForSelector('#version');
    await opts.screenshot({ path: path.join(OUT, 'screenshot-5-settings.png') });
    console.log('wrote screenshot-5-settings.png');
  } finally {
    await context.close();
    fs.rmSync(profile, { recursive: true, force: true });
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
