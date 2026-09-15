# SidePrompt – AI Prompt Manager (Chrome extension)

Side-panel prompt library for ChatGPT, Claude, Gemini, Copilot, Perplexity & co. One-click insert, `{{variables}}`, folders, tags, search. Freemium: 15 prompts free, Pro (one-time payment via ExtensionPay/Stripe) unlocks unlimited prompts, sync and import.

Distribution is 100 % organic through Chrome Web Store search – no marketing required.

## Layout

```
extension/            the unpacked extension (upload this folder zipped)
  manifest.json       MV3, side panel + content scripts for AI chat sites
  src/background.js   service worker: ExtPay, context menu, install/welcome
  src/content.js      inserts prompt text into the chat composer
  src/storage.js      data layer (prompts, folders, limits, variables, sync, import/export)
  src/sidepanel.*     main UI            src/options.*  settings page
  src/welcome.html    post-install page  src/defaults.js starter prompts
  lib/ExtPay.js       ExtensionPay client
scripts/              gen-icons, screenshots, build (zip), browser-setup
tests/                unit.js (Node) + e2e.js (Playwright, real Chromium with the extension loaded)
store/                listing text, privacy policy, generated assets (icons, screenshots, promo tile)
```

## Develop

```bash
npm install
npm run browser      # one-time: copies Playwright Chromium to ./.browser (needed for extension tests)
npm test             # unit + e2e
npm run test:headed  # watch the e2e run in a visible browser
```

Load unpacked for manual testing: `chrome://extensions` → Developer mode → *Load unpacked* → select `extension/`.

## Release

```bash
npm run release      # tests → store screenshots → dist/sideprompt-<version>.zip
```

Then upload the zip in the Chrome Web Store Developer Dashboard and paste texts from `store/listing.md`.
Bump `version` in `extension/manifest.json` for every new upload.

## Monetisation wiring

`extension/src/storage.js` → `EXTPAY_ID` must equal the extension id registered on extensionpay.com.
ExtensionPay handles checkout, license checks and refunds; Stripe pays out to your bank account. The extension never sees payment data.

See `SETUP.md` for the one-time accounts you need to create.
