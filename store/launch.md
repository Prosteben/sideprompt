# Launch posts – SidePrompt

Store: https://chromewebstore.google.com/detail/sideprompt-%E2%80%93-ai-prompt-ma/fkiglehcmmbedcnginmobninkpljfman
Site:  https://prosteben.github.io/sideprompt/

Rules: post as the maker, one platform per day, answer every comment within a few hours,
never mention competitors by name, never ask for reviews in the post.

Schedule (one per day, ~15:00 CET = 9 am US East):
1. r/SideProject   2. r/chrome_extensions   3. Hacker News (Show HN, Tue–Thu)
4. r/ChatGPT       5. r/ClaudeAI            6. Product Hunt (Tue/Wed launch, schedule 00:01 PT)
7. X / LinkedIn thread

---

## r/SideProject

**Title:** I built a side-panel prompt manager for ChatGPT/Claude/Gemini because I kept retyping the same 20 prompts

**Body:**
I kept a Notes file with my go-to prompts ("review this code", "reply to this email in my tone", "summarize in 5 bullets") and copy-pasted from it all day. So I built SidePrompt: a Chrome side panel that sits next to the AI chat and inserts a prompt into the chat box with one click.

What it does:
- One-click insert into ChatGPT, Claude, Gemini, Copilot, Perplexity (clipboard fallback everywhere else)
- `{{variables}}` with defaults – it asks you to fill in the blanks before inserting
- Folders, #tags, pins, instant search
- Right-click any selected text on the web → save as a prompt
- Alt+P to open, / to search, N for new prompt

Things I deliberately did differently:
- No account, no server. Prompts stay in your browser (Chrome storage). No analytics either.
- No subscription. Free for 15 prompts; Pro is a one-time $9.99 for unlimited + sync + import.

It's been live in the Chrome Web Store for a few days. Would love feedback on what's missing – what do you do with your prompts today?

Link in comments / store link: (paste)

---

## r/chrome_extensions

**Title:** [Released] SidePrompt – prompt library in Chrome's side panel for ChatGPT, Claude & Gemini (MV3, local-only storage)

**Body:**
Built with the Side Panel API (MV3), which turned out to be a great fit for this: the library stays open while you chat, and a content script writes the chosen prompt into the composer of the current AI site.

Features: one-click insert, `{{variables}}`, folders/tags/pins, search, save selection from context menu, keyboard shortcuts. Storage is `chrome.storage.local`, Pro sync uses `chrome.storage.sync`. No backend, no analytics.

Monetisation: freemium, one-time $9.99 via ExtensionPay (Stripe). Happy to share what the review process looked like – got rejected once for "keyword spam" because the description listed the supported domains, fixed by writing it in prose.

Store link: (paste)  ·  Site: (paste)

Happy to answer anything about the side panel API, contenteditable insertion quirks (ProseMirror on chatgpt.com vs textarea elsewhere) or the ExtensionPay flow.

---

## Hacker News – Show HN

**Title:** Show HN: SidePrompt – a local-only prompt manager in Chrome's side panel

**Text:**
I got tired of copy-pasting the same prompts into ChatGPT, Claude and Gemini from a notes file, so I built a Chrome side panel for it.

Click a prompt → it's inserted into the chat composer. Prompts can contain {{variables}} with defaults; you fill them in before inserting. Folders, tags, search, right-click "save selection" from any page.

Design decisions: no account and no server – everything lives in chrome.storage; no analytics; freemium with a one-time payment (ExtensionPay/Stripe) instead of a subscription.

Chrome Web Store: (paste)
Site: https://prosteben.github.io/sideprompt/

Interested in feedback on the insertion approach: chatgpt.com uses a ProseMirror contenteditable, Claude a different contenteditable, Gemini a Quill editor, most others a textarea – each needs slightly different input events to register the text properly.

---

## r/ChatGPT

**Title:** Made a free Chrome side panel that inserts your saved prompts into ChatGPT with one click (also works in Claude/Gemini)

**Body:**
Side panel opens with Alt+P next to the chat, you click a prompt and it appears in the message box. Prompts can have {{variables}} like {{topic}} or {{language|English}} and it asks you to fill them in.

Free for 15 prompts, no sign-up, prompts never leave your browser. Store link: (paste)

What prompts do you reuse the most? I ship 12 starter ones (code review, reply to email, summarize in 5 bullets, explain like I'm 12…) and I'd like to improve that list.

---

## r/ClaudeAI

**Title:** Chrome side panel for your Claude prompts – one-click insert, {{variables}}, stored locally

**Body:**
I use Claude for code review and writing and kept re-typing the same setup prompts. SidePrompt is a side panel prompt library that inserts into claude.ai's composer with one click (also ChatGPT/Gemini).

Local storage only, no account, free for 15 prompts, one-time $9.99 for unlimited. Store link: (paste)

Tip that works nicely with Claude: a prompt like "Review {{file|this code}} for bugs, then list the 3 riskiest issues first" – the variables dialog pre-fills the default so it's one click most of the time.

---

## Product Hunt

**Name:** SidePrompt
**Tagline (60):** Your AI prompts, one click away – in Chrome's side panel
**Description (260):** SidePrompt keeps your prompt library next to ChatGPT, Claude and Gemini and inserts any prompt into the chat with one click. {{Variables}}, folders, tags, search. No account, no server – prompts stay in your browser. Free for 15 prompts, Pro is a one-time $9.99.
**Topics:** Chrome Extensions, Productivity, Artificial Intelligence
**First comment (maker):**
Hi PH! I built SidePrompt because I was copy-pasting the same prompts from a notes file all day.
It's a Chrome side panel: click a prompt, it lands in the chat box. Prompts support {{variables}} with defaults, you get folders/tags/search, and you can save any selected text from the web as a prompt via right-click.
Two things I cared about: privacy (no account, no server, no analytics – everything is in chrome.storage) and pricing (free for 15 prompts, one-time $9.99 for unlimited, no subscription).
Would love to hear which prompts you reuse most – I'll fold the best ones into the starter set.
**Gallery:** store/assets/screenshot-1..5.png, promo-small-440x280.png (make a 1270x760 version)

---

## X / LinkedIn thread

1/ I kept retyping the same prompts into ChatGPT, Claude and Gemini. So I built a Chrome side panel that inserts them with one click. Meet SidePrompt. (screenshot-1)
2/ Prompts can have {{variables}}: "Summarize {{text}} in {{language|English}}". SidePrompt asks you to fill in the blanks, then inserts. (screenshot-2)
3/ Folders, #tags, pins, instant search. Right-click any text on the web → save as a prompt. (screenshot-3)
4/ No account. No server. No analytics. Your prompts live in your browser.
5/ Free for 15 prompts. Pro is $9.99 once, not a subscription. Link: (store)

---

## Reply snippets

- "Why not just use a text expander?" → Text expanders don't know about {{variables}} dialogs, folders/tags per project, or the AI composers (ProseMirror/Quill need proper input events). Also side panel = visible library while you chat.
- "Does it work on Firefox/Edge?" → Edge yes (same build, listing coming). Firefox lacks the side panel API in the same form; on the roadmap as a sidebar.
- "Is my data safe?" → Everything is in chrome.storage.local; Pro sync uses chrome.storage.sync (Google's own sync). No server of ours exists. Policy: https://prosteben.github.io/sideprompt/privacy-policy.html
- Feature request → thank, note it publicly ("added to the list"), ship within 1–2 weeks if small, reply back in-thread when shipped.
