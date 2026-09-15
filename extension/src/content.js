/* SidePrompt – content script: inserts prompt text into the active AI chat composer */
(() => {
  if (window.__pvContentLoaded) return;
  window.__pvContentLoaded = true;

  const SELECTORS = [
    '#prompt-textarea', // ChatGPT (ProseMirror contenteditable)
    'div.ProseMirror[contenteditable="true"]', // Claude, ChatGPT
    'rich-textarea div[contenteditable="true"]', // Gemini
    '.ql-editor[contenteditable="true"]', // Gemini (Quill)
    'textarea#userInput', // Copilot
    'textarea[data-testid="chat-input"]',
    'textarea[placeholder]',
    'div[contenteditable="true"][role="textbox"]',
    'div[contenteditable="true"]',
    'textarea',
  ];

  function isEditable(el) {
    if (!el || el === document.body) return false;
    if (el.tagName === 'TEXTAREA') return !el.disabled && !el.readOnly;
    if (el.tagName === 'INPUT') return /^(text|search|url|email)$/i.test(el.type) && !el.disabled && !el.readOnly;
    return el.isContentEditable;
  }

  function visible(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
  }

  function findComposer() {
    const active = document.activeElement;
    if (isEditable(active) && visible(active)) return active;
    for (const sel of SELECTORS) {
      const els = [...document.querySelectorAll(sel)].filter((el) => isEditable(el) && visible(el));
      if (els.length) return els[els.length - 1]; // last one is usually the main composer
    }
    return null;
  }

  function setNativeValue(el, value) {
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    setter.call(el, value);
  }

  function insertIntoTextarea(el, text, mode) {
    el.focus();
    const start = mode === 'replace' ? 0 : el.selectionStart ?? el.value.length;
    const end = mode === 'replace' ? el.value.length : el.selectionEnd ?? el.value.length;
    const next = el.value.slice(0, start) + text + el.value.slice(end);
    setNativeValue(el, next);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    const pos = start + text.length;
    try {
      el.setSelectionRange(pos, pos);
    } catch (e) {}
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }

  function insertIntoContentEditable(el, text, mode) {
    el.focus();
    const sel = window.getSelection();
    if (mode === 'replace' || !el.contains(sel.anchorNode)) {
      const range = document.createRange();
      range.selectNodeContents(el);
      if (mode !== 'replace') range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
    let ok = false;
    try {
      ok = document.execCommand('insertText', false, text);
    } catch (e) {
      ok = false;
    }
    if (!ok || !el.textContent.includes(text.split('\n')[0].slice(0, 20))) {
      // Fallback: build paragraphs manually and notify frameworks.
      if (mode === 'replace') el.innerHTML = '';
      const frag = document.createDocumentFragment();
      text.split('\n').forEach((line) => {
        const p = document.createElement('p');
        if (line === '') p.appendChild(document.createElement('br'));
        else p.textContent = line;
        frag.appendChild(p);
      });
      el.appendChild(frag);
      el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  function insert(text, mode = 'append') {
    const el = findComposer();
    if (!el) return { ok: false, reason: 'no-composer' };
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') insertIntoTextarea(el, text, mode);
    else insertIntoContentEditable(el, text, mode);
    el.scrollIntoView({ block: 'nearest' });
    return { ok: true, host: location.hostname };
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (!msg || typeof msg !== 'object') return false;
    if (msg.type === 'PV_PING') {
      sendResponse({ ok: true, hasComposer: !!findComposer(), host: location.hostname });
      return false;
    }
    if (msg.type === 'PV_INSERT') {
      try {
        sendResponse(insert(String(msg.text || ''), msg.mode));
      } catch (e) {
        sendResponse({ ok: false, reason: String(e && e.message) });
      }
      return false;
    }
    if (msg.type === 'PV_GET_SELECTION') {
      sendResponse({ text: String(window.getSelection()) });
      return false;
    }
    return false;
  });
})();
