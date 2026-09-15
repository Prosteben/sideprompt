# Setup list – co musíš jednorázově udělat ty (účty a klíče)

Vše ostatní (kód, testy, build, texty, screenshoty) je hotové v tomto repozitáři. Odhad času: ~40 minut. Náklady: 5 USD jednorázově.

## 1. Stripe účet (výplaty peněz) – zdarma
1. https://dashboard.stripe.com/register → založ účet (fyzická osoba nebo OSVČ, CZ je podporováno).
2. Dokonči ověření identity a přidej bankovní účet pro výplaty.
   → Nic mi neposílej, Stripe se propojí přímo s ExtensionPay v dalším kroku.

## 2. ExtensionPay (platební brána pro rozšíření) – zdarma, bere ~5 % z prodeje
1. https://extensionpay.com → Sign up → **Connect with Stripe** (propojí účet z kroku 1).
2. ✅ HOTOVO – rozšíření je registrované pod ID `promptvault-drzymalla` (ID je trvalé, v kódu je v `EXTPAY_ID`). Zobrazovaný název (Extension Name) nastav na **PromptNook**.
3. ✅ HOTOVO – plán **One-time payment, 9.99 USD** je vytvořený.
4. Nepotřebuji žádný API klíč – ExtPay funguje jen přes ID.

## 3. Chrome Web Store developer účet – 5 USD jednorázově
1. https://chrome.google.com/webstore/devconsole → přihlas se Google účtem → zaplať registrační poplatek 5 USD.
2. V „Account“ vyplň e-mail vývojáře a ověř ho (Store to vyžaduje před publikací).

## 4. Hosting privacy policy – zdarma (GitHub Pages)
1. Založ účet na https://github.com (pokud nemáš) a vytvoř **veřejný** repozitář, např. `promptnook`.
2. Nahraj do něj soubor `store/privacy-policy.html` jako `index.html` (nebo push celého projektu a v Settings → Pages nastav složku `store/`).
3. Předtím v souboru nahraď `CONTACT_EMAIL` svým kontaktním e-mailem.
4. Výslednou URL (např. `https://<tvůj-login>.github.io/promptnook/privacy-policy.html`) **napiš mi** – vložím ji do `extension/src/options.js` (`PRIVACY_URL`) a znovu vytvořím ZIP.

## 5. Publikace (klikací část, ~10 min)
1. Spusť `npm run release` (nebo mě požádej) → vznikne `dist/promptnook-1.0.0.zip`.
2. Developer Dashboard → **New item** → nahraj ZIP.
3. Záložka *Store listing*: zkopíruj texty ze `store/listing.md`, nahraj `store/assets/screenshot-1..5.png` a `promo-small-440x280.png`.
4. Záložka *Privacy practices*: odpovědi jsou připravené ve `store/listing.md` (sekce „Privacy practices tab“). Vlož URL privacy policy.
5. Záložka *Distribution*: Public, všechny regiony, zdarma (platba běží mimo Store přes ExtensionPay – to je povolené).
6. **Submit for review**. Schválení trvá obvykle 1–3 dny. Po schválení pošli odkaz na listing – doplním ho do welcome stránky pro tlačítko „Rate“.

## Po spuštění (nic aktivního)
- Příjem chodí automaticky přes Stripe na tvůj účet (výplaty týdně/měsíčně dle nastavení).
- Jediná pravidelná práce: když mi napíšeš, vydám opravy/nové verze podle recenzí ve Store.
