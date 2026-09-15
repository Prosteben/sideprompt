// End-to-end tests: real Chromium with the unpacked extension loaded.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');
const assert = require('assert');

const EXT = path.resolve(__dirname, '..', 'extension');
const HEADED = process.argv.includes('--headed');

const FAKE_CHAT = `<!doctype html><html><body>
  <h1>Fake ChatGPT</h1>
  <div id="prompt-textarea" contenteditable="true" class="ProseMirror" style="border:1px solid #ccc;min-height:60px"><p><br></p></div>
  <textarea id="plain" style="display:none"></textarea>
</body></html>`;

async function launch() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'pv-profile-'));
  // Prefer the system Chrome (closest to what users run); fall back to Edge / bundled Chromium.
  // NOTE: Google Chrome >= 137 ignores --load-extension, so a Chromium/Chrome-for-Testing build is required.
  // `npm run browser` copies Playwright's Chromium into ./.browser (the AppData copy fails to start on some machines).
  const localExe = path.resolve(__dirname, '..', '.browser', 'chrome-win64', 'chrome.exe');
  const channels = process.env.PV_BROWSER ? [process.env.PV_BROWSER] : [fs.existsSync(localExe) ? { executablePath: localExe } : null, 'chromium', 'chrome', 'msedge'].filter(Boolean);
  let context, lastErr;
  for (const channel of channels) {
    try {
      context = await chromium.launchPersistentContext(profile, {
        ...(typeof channel === 'string' ? { channel } : channel),
        headless: !HEADED,
        args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
        permissions: ['clipboard-read', 'clipboard-write'],
      });
      console.log(`  (browser: ${typeof channel === 'string' ? channel : channel.executablePath})`);
      break;
    } catch (e) {
      lastErr = e;
    }
  }
  if (!context) throw lastErr;
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker');
  const extId = sw.url().split('/')[2];
  // Block ExtensionPay network calls so tests are deterministic/offline.
  await context.route('https://extensionpay.com/**', (r) => r.abort());
  await context.route('https://chatgpt.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: FAKE_CHAT }));
  return { context, extId, profile };
}

(async () => {
  const { context, extId, profile } = await launch();
  const url = (p) => `chrome-extension://${extId}/src/${p}`;
  const log = (m) => console.log('  ✓', m);
  try {
    // Close the welcome tab opened on install (if any) so tab bookkeeping is simple.
    for (const p of context.pages()) if (p.url().includes('welcome.html')) await p.close();

    // 1. Side panel renders seeded prompts
    const panel = await context.newPage();
    await panel.goto(url('sidepanel.html'));
    await panel.waitForSelector('.card');
    const seeded = await panel.locator('.card').count();
    assert.ok(seeded >= 10, `expected seeded prompts, got ${seeded}`);
    assert.ok(await panel.locator('.chip', { hasText: 'Coding' }).isVisible());
    log(`side panel shows ${seeded} starter prompts`);

    // 2. Search + tag search
    await panel.fill('#search', 'code review');
    assert.strictEqual(await panel.locator('.card').count(), 1);
    await panel.fill('#search', '#seo');
    assert.strictEqual(await panel.locator('.card').count(), 1);
    await panel.fill('#search', '');
    log('search works (text + #tag)');

    // 3. Create a prompt with variables
    await panel.click('#btnNew');
    await panel.fill('#fTitle', 'E2E Greeting');
    await panel.fill('#fFolder', 'Tests');
    await panel.fill('#fTags', 'e2e, hello');
    await panel.fill('#fBody', 'Hello {{name}}, welcome to {{place|Prague}}!');
    assert.ok((await panel.textContent('#varPreview')).includes('name'));
    await panel.click('#editForm button[type=submit]');
    await panel.waitForSelector('.card:has-text("E2E Greeting")');
    assert.ok(await panel.locator('.chip', { hasText: 'Tests' }).isVisible());
    log('create prompt with folder/tags/variables');

    // 4. Copy with variable dialog -> clipboard
    await panel.click('.card:has-text("E2E Greeting") [data-action=copy]');
    await panel.waitForSelector('#dlgVars[open]');
    await panel.fill('#dlgVars [name=name]', 'Ben');
    assert.strictEqual(await panel.inputValue('#dlgVars [name=place]'), 'Prague');
    await panel.click('#varsSubmit');
    await panel.waitForSelector('#toast:not([hidden])');
    const clip = await panel.evaluate(() => navigator.clipboard.readText());
    assert.strictEqual(clip, 'Hello Ben, welcome to Prague!');
    log('variables dialog + clipboard copy');

    // 5. Insert into a (fake) ChatGPT composer through the content script
    const chat = await context.newPage();
    await chat.goto('https://chatgpt.com/');
    await chat.waitForFunction(() => window.__pvContentLoaded === true, null, { timeout: 5000 }).catch(() => {});
    await chat.bringToFront();
    await panel.click('.card:has-text("E2E Greeting") [data-action=insert]');
    await panel.waitForSelector('#dlgVars[open]');
    await panel.fill('#dlgVars [name=name]', 'World');
    await panel.click('#varsSubmit');
    await chat.waitForFunction(() => document.querySelector('#prompt-textarea').innerText.includes('Hello World, welcome to Prague!'), null, { timeout: 5000 });
    log('insert into contenteditable composer via content script');

    // textarea path
    await chat.evaluate(() => {
      document.querySelector('#prompt-textarea').remove();
      const ta = document.querySelector('#plain');
      ta.style.display = 'block';
      ta.value = 'existing ';
      ta.focus();
    });
    await panel.click('.card:has-text("Summarize in 5 bullets") [data-action=insert]');
    await panel.waitForSelector('#dlgVars[open]');
    await panel.fill('#dlgVars [name=content]', 'XYZ');
    await panel.click('#varsSubmit');
    await chat.waitForFunction(() => document.querySelector('#plain').value.startsWith('existing Summarize the following') && document.querySelector('#plain').value.endsWith('XYZ'), null, { timeout: 5000 });
    log('insert into <textarea> composer (appends at caret)');
    await chat.close();

    // 6. Usage counter incremented & pin sorting
    await panel.bringToFront();
    assert.ok(await panel.locator('.card:has-text("E2E Greeting") .tag:has-text("↺")').isVisible());
    log('usage counter shown');

    // 7. Edit + delete
    await panel.click('.card:has-text("E2E Greeting") [data-action=edit]');
    await panel.fill('#fTitle', 'E2E Greeting 2');
    await panel.keyboard.press('Control+Enter');
    await panel.waitForSelector('.card:has-text("E2E Greeting 2")');
    await panel.click('.card:has-text("E2E Greeting 2") [data-action=edit]');
    panel.once('dialog', (d) => d.accept());
    await panel.click('#btnDelete');
    await panel.waitForSelector('.card:has-text("E2E Greeting 2")', { state: 'detached' });
    log('edit (Ctrl+Enter) + delete');

    // 8. Free limit gate -> upgrade dialog
    const freeLimit = await panel.evaluate(() => PV.FREE_LIMITS.prompts);
    let n = await panel.locator('.card').count();
    await panel.fill('#search', '');
    for (; n < freeLimit; n++) {
      await panel.evaluate((i) => PV.upsertPrompt(PV.newPrompt({ title: 'Filler ' + i, body: 'x' })), n);
    }
    await panel.waitForFunction((lim) => document.querySelectorAll('.card').length === lim, freeLimit);
    assert.ok((await panel.textContent('#quota')).includes(`${freeLimit}/${freeLimit}`));
    await panel.click('#btnNew');
    await panel.waitForSelector('#dlgUpgrade[open]');
    assert.ok(await panel.locator('#viewEdit').isHidden());
    await panel.click('#dlgUpgrade [data-close]');
    log(`free limit (${freeLimit}) blocks new prompt and shows upgrade dialog`);

    // 9. Pro unlock removes the gate (simulated paid state)
    await panel.evaluate(() => PV.setPro(true));
    await panel.waitForSelector('#proBadge:not([hidden])');
    await panel.click('#btnNew');
    await panel.waitForSelector('#viewEdit:not([hidden])');
    await panel.click('#btnCancel');
    log('pro state unlocks unlimited prompts');

    // 10. Options page loads and toggles persist
    const opts = await context.newPage();
    await opts.goto(url('options.html'));
    await opts.selectOption('#defaultAction', 'copy');
    await opts.waitForSelector('#toast:not([hidden])');
    assert.strictEqual(await opts.evaluate(async () => (await PV.load()).settings.defaultAction), 'copy');
    await opts.selectOption('#defaultAction', 'insert');
    await opts.click('label.switch:has(#sync) span'); // the input is visually hidden behind a styled switch
    const syncedCount = () => opts.evaluate(async () => Object.keys(await chrome.storage.sync.get(null)).filter((k) => k.startsWith('sp_')).length);
    let synced = 0;
    for (let i = 0; i < 40 && synced <= 1; i++) {
      await opts.waitForTimeout(250);
      synced = await syncedCount();
    }
    assert.strictEqual(await opts.evaluate(async () => (await PV.load()).settings.sync), true, 'sync setting persisted');
    assert.ok(synced > 1, 'prompts mirrored to sync storage');
    log('options page: settings persist, pro sync mirrors prompts');

    // 11. Welcome page renders
    const w = await context.newPage();
    await w.goto(url('welcome.html'));
    assert.ok((await w.textContent('h1')).includes('installed'));
    log('welcome page renders');

    console.log('e2e: all tests passed');
  } catch (e) {
    console.error('e2e: FAILED', e);
    process.exitCode = 1;
    const shotDir = path.join(__dirname, '..', 'test-results');
    fs.mkdirSync(shotDir, { recursive: true });
    for (const [i, p] of context.pages().entries()) {
      await p.screenshot({ path: path.join(shotDir, `fail-${i}.png`) }).catch(() => {});
    }
    console.error('screenshots written to', shotDir);
  } finally {
    await context.close();
    try {
      fs.rmSync(profile, { recursive: true, force: true });
    } catch (e) {}
  }
})();
