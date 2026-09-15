/* PromptNook – MV3 service worker */
importScripts('../lib/ExtPay.js', 'storage.js', 'defaults.js');

const extpay = ExtPay(PV.EXTPAY_ID);
try {
  extpay.startBackground();
} catch (e) {
  /* ExtensionPay not reachable – extension keeps working in free mode */
}

const MENU_ID = 'pv-save-selection';

chrome.runtime.onInstalled.addListener(async (details) => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: MENU_ID, title: 'Save selection to PromptNook', contexts: ['selection'] });
  });
  await PV.seedDefaults();
  refreshProStatus();
  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/welcome.html') });
  }
});

chrome.runtime.onStartup.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
  refreshProStatus();
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID || !info.selectionText) return;
  const text = info.selectionText.trim();
  const prompt = PV.newPrompt({ title: text.slice(0, 50).replace(/\s+/g, ' '), body: text, tags: ['saved'] });
  try {
    await PV.upsertPrompt(prompt);
    await chrome.storage.local.set({ pv_flash: { type: 'saved', id: prompt.id, at: Date.now() } });
  } catch (e) {
    await chrome.storage.local.set({ pv_flash: { type: 'limit', at: Date.now() } });
  }
  if (tab && tab.windowId !== undefined) {
    chrome.sidePanel.open({ windowId: tab.windowId }).catch(() => {});
  }
});

extpay.onPaid.addListener(() => {
  PV.setPro(true);
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'PV_REFRESH_PRO') {
    refreshProStatus().then((paid) => sendResponse({ paid }));
    return true;
  }
  if (msg && msg.type === 'PV_OPEN_PANEL' && sender.tab) {
    chrome.sidePanel.open({ windowId: sender.tab.windowId }).catch(() => {});
  }
  return false;
});

// Re-check the paid state once a day (cheap; ExtPay caches too).
chrome.alarms?.create?.('pv-pro-refresh', { periodInMinutes: 60 * 24 });
chrome.alarms?.onAlarm?.addListener((a) => {
  if (a.name === 'pv-pro-refresh') refreshProStatus();
});

function refreshProStatus() {
  return PV.refreshPro();
}
