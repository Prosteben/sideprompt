/* SidePrompt – options page */
(() => {
  const $ = (id) => document.getElementById(id);
  const PRIVACY_URL = 'https://prosteben.github.io/sideprompt/privacy-policy.html';
  let toastTimer;
  function toast(msg, isError = false) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.toggle('error', isError);
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.hidden = true), 2500);
  }

  async function render() {
    const data = await PV.load();
    const pro = await PV.isPro();
    $('defaultAction').value = data.settings.defaultAction;
    $('askVariables').checked = !!data.settings.askVariables;
    $('sync').checked = !!data.settings.sync && pro;
    $('proBadge').hidden = !pro;
    $('proStatus').textContent = pro ? 'Pro plan – thank you! 💜' : 'Free plan';
    $('proDesc').textContent = pro ? 'Everything is unlocked on this browser.' : 'One-time payment. Unlimited prompts, folders, sync and import.';
    $('btnBuy').hidden = pro;
    $('btnLogin').textContent = pro ? 'Manage license' : 'I already paid';
    $('version').textContent = chrome.runtime.getManifest().version;
  }

  $('defaultAction').addEventListener('change', (e) => PV.updateSettings({ defaultAction: e.target.value }).then(() => toast('Saved')));
  $('askVariables').addEventListener('change', (e) => PV.updateSettings({ askVariables: e.target.checked }).then(() => toast('Saved')));
  $('sync').addEventListener('change', async (e) => {
    const pro = await PV.isPro();
    if (!pro) {
      e.target.checked = false;
      PV.openPaymentPage();
      return;
    }
    await PV.updateSettings({ sync: e.target.checked });
    if (e.target.checked) {
      try {
        const { merged } = await PV.syncPull();
        await PV.syncPush(await PV.load());
        toast(`Sync enabled${merged ? ` – merged ${merged} prompt(s) from other devices` : ''}`);
      } catch (err) {
        toast('Sync failed: ' + err.message, true);
      }
    } else toast('Sync disabled');
  });

  $('btnBuy').addEventListener('click', () => PV.openPaymentPage());
  $('btnLogin').addEventListener('click', async () => ((await PV.isPro()) ? PV.openPaymentPage() : PV.openLoginPage()));

  $('btnExport').addEventListener('click', async () => {
    const json = await PV.exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `sideprompt-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });

  $('btnImport').addEventListener('click', async () => {
    if (!(await PV.isPro())) {
      PV.openPaymentPage();
      return;
    }
    $('fileImport').click();
  });
  $('fileImport').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const { added, total } = await PV.importJSON(await file.text());
      toast(`Imported ${added} new prompt(s). Total: ${total}.`);
    } catch (err) {
      toast(err.message === 'limit' ? `Import exceeds the free limit of ${err.limit} prompts.` : err.message, true);
    }
  });

  $('btnRestore').addEventListener('click', async () => {
    const data = await PV.load();
    const have = new Set(data.prompts.map((p) => p.title));
    const missing = PV_DEFAULT_PROMPTS.filter((p) => !have.has(p.title));
    const gate = await PV.isPro();
    const room = gate ? Infinity : Math.max(0, PV.FREE_LIMITS.prompts - data.prompts.length);
    const toAdd = missing.slice(0, room);
    toAdd.forEach((p) => data.prompts.push(PV.newPrompt(p)));
    data.folders = [...new Set([...data.folders, ...toAdd.map((p) => p.folder).filter(Boolean)])];
    await PV.save(data);
    toast(toAdd.length ? `Restored ${toAdd.length} prompt(s).` : missing.length ? 'Free limit reached – nothing restored.' : 'All starter prompts already present.');
  });

  $('btnWipe').addEventListener('click', async () => {
    if (!confirm('Delete ALL prompts and folders? This cannot be undone.')) return;
    const data = await PV.load();
    data.prompts = [];
    data.folders = [];
    await PV.save(data);
    if (data.settings.sync) {
      const all = await chrome.storage.sync.get(null);
      await chrome.storage.sync.remove(Object.keys(all).filter((k) => k.startsWith('sp_')));
    }
    toast('All prompts deleted.');
  });

  $('lnkShortcuts').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
  });
  $('lnkPrivacy').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: PRIVACY_URL });
  });
  $('lnkReview').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: `https://chromewebstore.google.com/detail/${chrome.runtime.id}/reviews` });
  });

  chrome.storage.onChanged.addListener((c, area) => area === 'local' && (c[PV.KEY] || c[PV.PRO_KEY]) && render());
  render();
  PV.refreshPro().then(render);
})();

