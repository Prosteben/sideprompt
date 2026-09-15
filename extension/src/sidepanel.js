/* PromptNook – side panel UI */
(() => {
  const $ = (id) => document.getElementById(id);
  const el = {
    proBadge: $('proBadge'), btnUpgrade: $('btnUpgrade'), btnNew: $('btnNew'), btnSettings: $('btnSettings'),
    viewList: $('viewList'), viewEdit: $('viewEdit'), search: $('search'), folders: $('folders'), quota: $('quota'),
    list: $('list'), empty: $('empty'), editForm: $('editForm'), fTitle: $('fTitle'), fFolder: $('fFolder'),
    fTags: $('fTags'), fBody: $('fBody'), fPinned: $('fPinned'), varPreview: $('varPreview'), folderList: $('folderList'),
    btnDelete: $('btnDelete'), btnCancel: $('btnCancel'), dlgVars: $('dlgVars'), varsForm: $('varsForm'),
    varsFields: $('varsFields'), varsTitle: $('varsTitle'), varsSubmit: $('varsSubmit'), dlgUpgrade: $('dlgUpgrade'),
    upgradeReason: $('upgradeReason'), btnBuy: $('btnBuy'), btnLogin: $('btnLogin'), toast: $('toast'),
  };

  const state = { data: null, pro: false, folder: '__all', query: '', editing: null, toastTimer: null };

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function toast(msg, isError = false, ms = 2200) {
    el.toast.textContent = msg;
    el.toast.classList.toggle('error', isError);
    el.toast.hidden = false;
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => (el.toast.hidden = true), ms);
  }
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    }
  }

  /* ---------- data ---------- */
  async function refresh() {
    state.data = await PV.load();
    state.pro = await PV.isPro();
    render();
  }

  function render() {
    const { data, pro } = state;
    el.proBadge.hidden = !pro;
    el.btnUpgrade.hidden = pro;
    renderFolders();
    renderQuota();
    renderList();
    el.folderList.innerHTML = data.folders.map((f) => `<option value="${esc(f)}"></option>`).join('');
  }

  function renderFolders() {
    const { data } = state;
    const counts = {};
    data.prompts.forEach((p) => (counts[p.folder || ''] = (counts[p.folder || ''] || 0) + 1));
    const chips = [`<button class="chip ${state.folder === '__all' ? 'active' : ''}" data-folder="__all">All <span class="count">${data.prompts.length}</span></button>`];
    for (const f of data.folders) {
      chips.push(`<button class="chip ${state.folder === f ? 'active' : ''}" data-folder="${esc(f)}" title="Right-click to rename/delete">${esc(f)} <span class="count">${counts[f] || 0}</span></button>`);
    }
    if (counts['']) chips.push(`<button class="chip ${state.folder === '' ? 'active' : ''}" data-folder="">Unfiled <span class="count">${counts['']}</span></button>`);
    chips.push(`<button class="chip chip-add" data-action="add-folder" title="New folder">+ Folder</button>`);
    el.folders.innerHTML = chips.join('');
  }

  function renderQuota() {
    const { data, pro } = state;
    if (pro) {
      el.quota.hidden = true;
      return;
    }
    const n = data.prompts.length;
    const lim = PV.FREE_LIMITS.prompts;
    el.quota.hidden = false;
    el.quota.classList.toggle('warn', n >= lim - 3);
    el.quota.innerHTML = `<span>${n}/${lim} free prompts</span><span class="bar"><i style="width:${Math.min(100, (n / lim) * 100)}%"></i></span><a data-action="upgrade">Go Pro</a>`;
  }

  function renderList() {
    const items = PV.search(state.data.prompts, state.query, state.folder);
    el.empty.hidden = items.length > 0;
    el.list.innerHTML = items
      .map((p) => {
        const vars = PV.extractVariables(p.body);
        return `<article class="card" data-id="${p.id}" tabindex="0">
          <div class="card-head">
            ${p.pinned ? '<span class="pin" title="Pinned">📌</span>' : ''}
            <span class="card-title">${esc(p.title || '(untitled)')}</span>
            ${vars.length ? `<span class="tag" title="${esc(vars.map((v) => v.name).join(', '))}">{{${vars.length}}}</span>` : ''}
          </div>
          <div class="card-preview">${esc(p.body)}</div>
          <div class="card-meta">
            ${p.folder ? `<span class="folder-tag">📁 ${esc(p.folder)}</span>` : ''}
            ${(p.tags || []).map((t) => `<span class="tag">#${esc(t)}</span>`).join('')}
            ${p.uses ? `<span class="tag" title="Times used">↺ ${p.uses}</span>` : ''}
          </div>
          <div class="card-actions">
            <button class="btn btn-primary" data-action="insert">Insert</button>
            <button class="btn" data-action="copy" title="Copy to clipboard">Copy</button>
            <button class="btn" data-action="edit" title="Edit">Edit</button>
          </div>
        </article>`;
      })
      .join('');
  }

  /* ---------- editor ---------- */
  function openEditor(prompt) {
    state.editing = prompt ? { ...prompt } : PV.newPrompt({ folder: state.folder && state.folder !== '__all' ? state.folder : '' });
    const p = state.editing;
    el.fTitle.value = p.title;
    el.fFolder.value = p.folder || '';
    el.fTags.value = (p.tags || []).join(', ');
    el.fBody.value = p.body;
    el.fPinned.checked = !!p.pinned;
    el.btnDelete.hidden = !prompt;
    updateVarPreview();
    el.viewList.hidden = true;
    el.viewEdit.hidden = false;
    (prompt ? el.fBody : el.fTitle).focus();
  }
  function closeEditor() {
    state.editing = null;
    el.viewEdit.hidden = true;
    el.viewList.hidden = false;
  }
  function updateVarPreview() {
    const vars = PV.extractVariables(el.fBody.value);
    el.varPreview.innerHTML = vars.length
      ? 'Variables: ' + vars.map((v) => `<code>${esc(v.name)}</code>`).join(' ')
      : 'Tip: use <code>{{topic}}</code> to be asked for a value on insert.';
  }

  async function saveEditor(e) {
    e.preventDefault();
    const p = state.editing;
    p.title = el.fTitle.value.trim();
    p.folder = el.fFolder.value.trim();
    p.tags = el.fTags.value.split(',').map((t) => t.trim().replace(/^#/, '')).filter(Boolean);
    p.body = el.fBody.value;
    p.pinned = el.fPinned.checked;
    if (!p.title) p.title = p.body.slice(0, 50);
    try {
      if (p.folder && !state.data.folders.includes(p.folder)) {
        const gate = await PV.canAddFolder(state.data);
        if (!gate.ok) throw Object.assign(new Error('limit'), gate);
      }
      await PV.upsertPrompt(p);
      closeEditor();
      await refresh();
      toast('Saved');
    } catch (err) {
      if (err.message === 'limit') showUpgrade(err.reason === 'folders' ? `Free plan includes ${err.limit} folders.` : `Free plan includes ${err.limit} prompts.`);
      else toast('Could not save: ' + err.message, true);
    }
  }

  /* ---------- insert / copy ---------- */
  async function resolveText(prompt) {
    const vars = PV.extractVariables(prompt.body);
    const settings = state.data.settings;
    const askable = vars.filter((v) => !/^(date|time|datetime)$/i.test(v.name));
    if (!askable.length || !settings.askVariables) return PV.fillVariables(prompt.body, {});
    const values = await askVariables(prompt, askable);
    if (values === null) return null;
    return PV.fillVariables(prompt.body, values);
  }

  function askVariables(prompt, vars) {
    return new Promise((resolve) => {
      el.varsTitle.textContent = prompt.title;
      el.varsFields.innerHTML = vars
        .map((v, i) => {
          const multi = /text|content|code|email|notes|body|input|message/i.test(v.name) || (v.default && v.default.length > 60);
          return `<label>${esc(v.name)}${multi
            ? `<textarea name="${esc(v.name)}" rows="4" ${i === 0 ? 'autofocus' : ''}>${esc(v.default)}</textarea>`
            : `<input type="text" name="${esc(v.name)}" value="${esc(v.default)}" ${i === 0 ? 'autofocus' : ''} />`}</label>`;
        })
        .join('');
      const done = (vals) => {
        el.dlgVars.close();
        resolve(vals);
      };
      el.varsForm.onsubmit = (e) => {
        e.preventDefault();
        const fd = new FormData(el.varsForm);
        const vals = {};
        for (const v of vars) vals[v.name] = fd.get(v.name) ?? '';
        done(vals);
      };
      el.dlgVars.querySelector('[data-close]').onclick = () => done(null);
      el.dlgVars.oncancel = (e) => {
        e.preventDefault();
        done(null);
      };
      el.dlgVars.showModal();
      const first = el.varsFields.querySelector('input,textarea');
      if (first) {
        first.focus();
        first.select?.();
      }
    });
  }

  async function insertPrompt(prompt, forceCopy = false) {
    const text = await resolveText(prompt);
    if (text === null) return;
    const wantInsert = !forceCopy && state.data.settings.defaultAction !== 'copy';
    let inserted = false;
    if (wantInsert) {
      try {
        const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        if (tab && tab.id != null) {
          const res = await chrome.tabs.sendMessage(tab.id, { type: 'PV_INSERT', text });
          inserted = !!(res && res.ok);
        }
      } catch (e) {
        inserted = false;
      }
    }
    if (inserted) {
      toast('Inserted into chat ✓');
    } else {
      const ok = await copyText(text);
      if (ok) toast(wantInsert ? 'Copied – paste with Ctrl+V (this page has no chat box)' : 'Copied to clipboard ✓', false, 3000);
      else toast('Could not copy', true);
    }
    PV.bumpUses(prompt.id).then(refresh);
  }

  /* ---------- upgrade ---------- */
  function showUpgrade(reason) {
    el.upgradeReason.textContent = reason || 'Unlock everything with a single one-time payment.';
    el.dlgUpgrade.showModal();
  }

  /* ---------- events ---------- */
  el.btnNew.addEventListener('click', async () => {
    const gate = await PV.canAddPrompt(state.data);
    if (!gate.ok) return showUpgrade(`You've reached the free limit of ${gate.limit} prompts.`);
    openEditor(null);
  });
  el.btnSettings.addEventListener('click', () => chrome.runtime.openOptionsPage());
  el.btnUpgrade.addEventListener('click', () => showUpgrade());
  el.btnBuy.addEventListener('click', () => {
    el.dlgUpgrade.close();
    PV.openPaymentPage();
  });
  el.btnLogin.addEventListener('click', () => {
    el.dlgUpgrade.close();
    PV.openLoginPage();
  });
  el.dlgUpgrade.querySelector('[data-close]').addEventListener('click', () => el.dlgUpgrade.close());
  el.btnCancel.addEventListener('click', closeEditor);
  el.editForm.addEventListener('submit', saveEditor);
  el.fBody.addEventListener('input', updateVarPreview);
  el.btnDelete.addEventListener('click', async () => {
    if (!state.editing) return;
    if (!confirm('Delete this prompt?')) return;
    await PV.deletePrompt(state.editing.id);
    closeEditor();
    await refresh();
    toast('Deleted');
  });

  el.search.addEventListener('input', () => {
    state.query = el.search.value;
    renderList();
  });

  el.folders.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.action === 'add-folder') {
      const name = prompt('Folder name:');
      if (!name) return;
      try {
        await PV.addFolder(name);
        state.folder = name.trim();
        await refresh();
      } catch (err) {
        if (err.message === 'limit') showUpgrade(`Free plan includes ${err.limit} folders.`);
      }
      return;
    }
    state.folder = btn.dataset.folder;
    render();
  });
  el.folders.addEventListener('contextmenu', async (e) => {
    const btn = e.target.closest('button[data-folder]');
    if (!btn || btn.dataset.folder === '__all' || btn.dataset.folder === '') return;
    e.preventDefault();
    const f = btn.dataset.folder;
    const choice = prompt(`Folder "${f}": type a new name to rename, or type DELETE to remove the folder (prompts are kept).`, f);
    if (choice === null || choice.trim() === '' || choice === f) return;
    if (choice.trim().toUpperCase() === 'DELETE') {
      await PV.deleteFolder(f);
      if (state.folder === f) state.folder = '__all';
    } else {
      await PV.renameFolder(f, choice);
      if (state.folder === f) state.folder = choice.trim();
    }
    await refresh();
  });

  el.quota.addEventListener('click', (e) => {
    if (e.target.dataset.action === 'upgrade') showUpgrade();
  });

  el.list.addEventListener('click', (e) => {
    const card = e.target.closest('.card');
    if (!card) return;
    const p = state.data.prompts.find((x) => x.id === card.dataset.id);
    if (!p) return;
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action === 'copy') return insertPrompt(p, true);
    if (action === 'edit') return openEditor(p);
    if (action === 'insert' || !action) return insertPrompt(p);
  });
  el.list.addEventListener('keydown', (e) => {
    const card = e.target.closest('.card');
    if (!card || e.target !== card) return;
    const p = state.data.prompts.find((x) => x.id === card.dataset.id);
    if (!p) return;
    if (e.key === 'Enter') insertPrompt(p);
    if (e.key === 'e') openEditor(p);
    if (e.key === 'c') insertPrompt(p, true);
  });

  document.addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
    if (e.key === '/' && !typing && !el.viewList.hidden) {
      e.preventDefault();
      el.search.focus();
    }
    if (e.key.toLowerCase() === 'n' && !typing && !el.viewList.hidden && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      el.btnNew.click();
    }
    if (e.key === 'Escape' && !el.viewEdit.hidden && !el.dlgVars.open) closeEditor();
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !el.viewEdit.hidden) el.editForm.requestSubmit();
  });

  // React to changes made elsewhere (context menu save, options page, other windows).
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes[PV.KEY] || changes[PV.PRO_KEY]) refresh();
    if (changes.pv_flash && changes.pv_flash.newValue) {
      const f = changes.pv_flash.newValue;
      if (f.type === 'saved') toast('Selection saved as a new prompt ✓');
      if (f.type === 'limit') showUpgrade(`You've reached the free limit of ${PV.FREE_LIMITS.prompts} prompts.`);
    }
  });

  /* ---------- init ---------- */
  (async () => {
    await PV.seedDefaults();
    await refresh();
    const flash = (await chrome.storage.local.get('pv_flash')).pv_flash;
    if (flash && Date.now() - flash.at < 5000) {
      if (flash.type === 'saved') toast('Selection saved as a new prompt ✓');
      if (flash.type === 'limit') showUpgrade(`You've reached the free limit of ${PV.FREE_LIMITS.prompts} prompts.`);
      chrome.storage.local.remove('pv_flash');
    }
    // Background refresh of Pro status (network); UI already rendered from cache.
    PV.refreshPro().then((paid) => {
      if (paid !== state.pro) refresh();
      if (paid && state.data.settings.sync) PV.syncPull().then(({ merged }) => merged && refresh());
    });
  })();
})();
