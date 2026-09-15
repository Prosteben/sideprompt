/* PromptNook – shared data layer (classic script, exposes global `PV`) */
const PV = (() => {
  const KEY = 'pv_data';
  const PRO_KEY = 'pv_pro';
  const EXTPAY_ID = 'promptvault-drzymalla'; // must match the id registered on extensionpay.com
  const FREE_LIMITS = { prompts: 15, folders: 5 };
  const SYNC_PREFIX = 'sp_';
  const SYNC_META = 'sp_meta';

  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  const now = () => Date.now();

  const defaultSettings = () => ({
    defaultAction: 'insert', // 'insert' | 'copy'
    askVariables: true,
    sync: false,
    seeded: false,
    theme: 'auto',
  });

  const defaultData = () => ({ version: 1, prompts: [], folders: [], settings: defaultSettings() });

  function normalize(data) {
    const d = { ...defaultData(), ...(data || {}) };
    d.settings = { ...defaultSettings(), ...(d.settings || {}) };
    d.prompts = Array.isArray(d.prompts) ? d.prompts : [];
    d.folders = Array.isArray(d.folders) ? d.folders : [];
    return d;
  }

  async function load() {
    const res = await chrome.storage.local.get(KEY);
    return normalize(res[KEY]);
  }

  async function save(data) {
    await chrome.storage.local.set({ [KEY]: data });
    if (data.settings.sync && (await isPro())) {
      syncPush(data).catch(() => {});
    }
    return data;
  }

  /* ---------- Pro status (ExtensionPay) ---------- */
  async function isPro() {
    const res = await chrome.storage.local.get(PRO_KEY);
    return !!(res[PRO_KEY] && res[PRO_KEY].paid);
  }

  async function setPro(paid) {
    await chrome.storage.local.set({ [PRO_KEY]: { paid: !!paid, checkedAt: now() } });
  }

  // ExtPay stores its API key in sync storage (local fallback). Without a key the
  // library answers {paid:false} even when it could not reach the server, so we
  // must not treat that answer as authoritative.
  async function hasExtPayKey() {
    try {
      const s = await chrome.storage.sync.get('extensionpay_api_key');
      if (s.extensionpay_api_key) return true;
    } catch (e) {}
    try {
      const l = await chrome.storage.local.get('extensionpay_api_key');
      return !!l.extensionpay_api_key;
    } catch (e) {
      return false;
    }
  }

  // Refresh from ExtensionPay; never throws. Returns boolean paid state.
  async function refreshPro() {
    try {
      if (typeof ExtPay !== 'function') return isPro();
      const extpay = ExtPay(EXTPAY_ID);
      const user = await extpay.getUser();
      if (user.paid) {
        await setPro(true);
        return true;
      }
      if (await hasExtPayKey()) {
        await setPro(false); // authoritative "not paid" (e.g. refund)
        return false;
      }
      return isPro(); // offline / not registered yet: keep cached state
    } catch (e) {
      return isPro();
    }
  }

  function openPaymentPage() {
    try {
      ExtPay(EXTPAY_ID).openPaymentPage();
    } catch (e) {
      chrome.tabs.create({ url: 'https://extensionpay.com/extension/' + EXTPAY_ID });
    }
  }

  function openLoginPage() {
    try {
      ExtPay(EXTPAY_ID).openLoginPage();
    } catch (e) {
      chrome.tabs.create({ url: 'https://extensionpay.com/extension/' + EXTPAY_ID + '/login' });
    }
  }

  /* ---------- Prompts ---------- */
  function newPrompt(partial = {}) {
    const t = now();
    return {
      id: uid(),
      title: '',
      body: '',
      folder: '',
      tags: [],
      pinned: false,
      uses: 0,
      createdAt: t,
      updatedAt: t,
      ...partial,
    };
  }

  async function canAddPrompt(data) {
    if (await isPro()) return { ok: true };
    if (data.prompts.length >= FREE_LIMITS.prompts) {
      return { ok: false, reason: 'prompts', limit: FREE_LIMITS.prompts };
    }
    return { ok: true };
  }

  async function canAddFolder(data) {
    if (await isPro()) return { ok: true };
    if (data.folders.length >= FREE_LIMITS.folders) {
      return { ok: false, reason: 'folders', limit: FREE_LIMITS.folders };
    }
    return { ok: true };
  }

  async function upsertPrompt(prompt) {
    const data = await load();
    const idx = data.prompts.findIndex((p) => p.id === prompt.id);
    prompt.updatedAt = now();
    if (idx === -1) {
      const gate = await canAddPrompt(data);
      if (!gate.ok) throw Object.assign(new Error('limit'), gate);
      data.prompts.unshift(prompt);
    } else {
      data.prompts[idx] = prompt;
    }
    if (prompt.folder && !data.folders.includes(prompt.folder)) data.folders.push(prompt.folder);
    await save(data);
    return prompt;
  }

  async function deletePrompt(id) {
    const data = await load();
    data.prompts = data.prompts.filter((p) => p.id !== id);
    await save(data);
    if (data.settings.sync) chrome.storage.sync.remove(SYNC_PREFIX + id).catch(() => {});
  }

  async function bumpUses(id) {
    const data = await load();
    const p = data.prompts.find((x) => x.id === id);
    if (p) {
      p.uses = (p.uses || 0) + 1;
      p.lastUsedAt = now();
      await chrome.storage.local.set({ [KEY]: data }); // no sync push for usage stats
    }
  }

  async function addFolder(name) {
    name = String(name || '').trim();
    if (!name) return;
    const data = await load();
    if (data.folders.includes(name)) return;
    const gate = await canAddFolder(data);
    if (!gate.ok) throw Object.assign(new Error('limit'), gate);
    data.folders.push(name);
    await save(data);
  }

  async function renameFolder(oldName, newName) {
    newName = String(newName || '').trim();
    const data = await load();
    if (!newName || data.folders.includes(newName)) return;
    data.folders = data.folders.map((f) => (f === oldName ? newName : f));
    data.prompts.forEach((p) => {
      if (p.folder === oldName) {
        p.folder = newName;
        p.updatedAt = now();
      }
    });
    await save(data);
  }

  async function deleteFolder(name) {
    const data = await load();
    data.folders = data.folders.filter((f) => f !== name);
    data.prompts.forEach((p) => {
      if (p.folder === name) {
        p.folder = '';
        p.updatedAt = now();
      }
    });
    await save(data);
  }

  async function updateSettings(patch) {
    const data = await load();
    data.settings = { ...data.settings, ...patch };
    await chrome.storage.local.set({ [KEY]: data });
    return data.settings;
  }

  /* ---------- Variables ---------- */
  // Supports {{name}} and {{name|default value}}. Built-ins: {{date}}, {{time}}.
  const VAR_RE = /\{\{\s*([^{}|]+?)\s*(?:\|\s*([^{}]*?)\s*)?\}\}/g;

  function extractVariables(body) {
    const seen = new Map();
    let m;
    VAR_RE.lastIndex = 0;
    while ((m = VAR_RE.exec(body || ''))) {
      const name = m[1];
      if (!seen.has(name)) seen.set(name, m[2] || builtinValue(name) || '');
    }
    return [...seen.entries()].map(([name, def]) => ({ name, default: def }));
  }

  function builtinValue(name) {
    const n = name.toLowerCase();
    const d = new Date();
    if (n === 'date') return d.toLocaleDateString();
    if (n === 'time') return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (n === 'datetime') return d.toLocaleString();
    return '';
  }

  function fillVariables(body, values) {
    VAR_RE.lastIndex = 0;
    return (body || '').replace(VAR_RE, (_, name, def) => {
      if (values && Object.prototype.hasOwnProperty.call(values, name)) return values[name];
      return def || builtinValue(name) || '';
    });
  }

  /* ---------- Search ---------- */
  function search(prompts, query, folder) {
    const q = (query || '').trim().toLowerCase();
    let list = prompts;
    if (folder && folder !== '__all') list = list.filter((p) => (p.folder || '') === folder);
    if (q) {
      const terms = q.split(/\s+/);
      list = list.filter((p) => {
        const hay = (p.title + ' ' + p.body + ' ' + (p.tags || []).join(' ') + ' ' + (p.folder || '')).toLowerCase();
        return terms.every((t) => (t.startsWith('#') ? (p.tags || []).some((tag) => tag.toLowerCase().includes(t.slice(1))) : hay.includes(t)));
      });
    }
    return [...list].sort((a, b) => (b.pinned - a.pinned) || (b.updatedAt - a.updatedAt));
  }

  /* ---------- Import / Export ---------- */
  async function exportJSON() {
    const data = await load();
    return JSON.stringify({ app: 'PromptNook', version: 1, exportedAt: new Date().toISOString(), prompts: data.prompts, folders: data.folders }, null, 2);
  }

  async function importJSON(text, { merge = true } = {}) {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      throw new Error('Invalid JSON file');
    }
    const incoming = Array.isArray(parsed) ? parsed : parsed.prompts;
    if (!Array.isArray(incoming)) throw new Error('No prompts found in file');
    const data = await load();
    if (!merge) {
      data.prompts = [];
      data.folders = [];
    }
    const byId = new Map(data.prompts.map((p) => [p.id, p]));
    let added = 0;
    for (const raw of incoming) {
      if (!raw || typeof raw !== 'object') continue;
      const p = newPrompt({
        id: typeof raw.id === 'string' ? raw.id : uid(),
        title: String(raw.title || raw.name || '').slice(0, 200),
        body: String(raw.body || raw.content || raw.prompt || raw.text || ''),
        folder: String(raw.folder || raw.category || '').slice(0, 60),
        tags: Array.isArray(raw.tags) ? raw.tags.map(String).slice(0, 20) : [],
        pinned: !!raw.pinned,
        uses: Number(raw.uses) || 0,
      });
      if (!p.body) continue;
      if (!p.title) p.title = p.body.slice(0, 50);
      if (byId.has(p.id)) {
        Object.assign(byId.get(p.id), p);
      } else {
        data.prompts.push(p);
        byId.set(p.id, p);
        added++;
      }
      if (p.folder && !data.folders.includes(p.folder)) data.folders.push(p.folder);
    }
    const pro = await isPro();
    if (!pro && data.prompts.length > FREE_LIMITS.prompts) {
      throw Object.assign(new Error('limit'), { reason: 'prompts', limit: FREE_LIMITS.prompts, needed: data.prompts.length });
    }
    await save(data);
    return { added, total: data.prompts.length };
  }

  /* ---------- Cloud sync (Pro) via chrome.storage.sync ---------- */
  async function syncPush(data) {
    const payload = { [SYNC_META]: { folders: data.folders, ids: data.prompts.map((p) => p.id), updatedAt: now() } };
    for (const p of data.prompts) {
      const { uses, lastUsedAt, ...rest } = p;
      payload[SYNC_PREFIX + p.id] = rest;
    }
    const existing = await chrome.storage.sync.get(null);
    const stale = Object.keys(existing).filter((k) => k.startsWith(SYNC_PREFIX) && k !== SYNC_META && !payload[k]);
    if (stale.length) await chrome.storage.sync.remove(stale);
    await chrome.storage.sync.set(payload);
  }

  async function syncPull() {
    const remote = await chrome.storage.sync.get(null);
    const meta = remote[SYNC_META];
    if (!meta) return { merged: 0 };
    const data = await load();
    const byId = new Map(data.prompts.map((p) => [p.id, p]));
    let merged = 0;
    for (const k of Object.keys(remote)) {
      if (!k.startsWith(SYNC_PREFIX) || k === SYNC_META) continue;
      const rp = remote[k];
      const lp = byId.get(rp.id);
      if (!lp) {
        data.prompts.push(newPrompt(rp));
        merged++;
      } else if ((rp.updatedAt || 0) > (lp.updatedAt || 0)) {
        Object.assign(lp, rp);
        merged++;
      }
    }
    for (const f of meta.folders || []) if (!data.folders.includes(f)) data.folders.push(f);
    await chrome.storage.local.set({ [KEY]: data });
    return { merged };
  }

  /* ---------- Misc ---------- */
  async function seedDefaults() {
    const data = await load();
    if (data.settings.seeded) return false;
    if (typeof PV_DEFAULT_PROMPTS !== 'undefined' && data.prompts.length === 0) {
      const t = now();
      data.prompts = PV_DEFAULT_PROMPTS.map((p, i) => newPrompt({ ...p, createdAt: t - i, updatedAt: t - i }));
      data.folders = [...new Set(data.prompts.map((p) => p.folder).filter(Boolean))];
    }
    data.settings.seeded = true;
    await chrome.storage.local.set({ [KEY]: data });
    return true;
  }

  return {
    KEY, PRO_KEY, EXTPAY_ID, FREE_LIMITS,
    load, save, isPro, setPro, refreshPro, openPaymentPage, openLoginPage,
    newPrompt, upsertPrompt, deletePrompt, bumpUses, canAddPrompt, canAddFolder,
    addFolder, renameFolder, deleteFolder, updateSettings,
    extractVariables, fillVariables, search,
    exportJSON, importJSON, syncPush, syncPull, seedDefaults, uid,
  };
})();
if (typeof module !== 'undefined') module.exports = PV;
