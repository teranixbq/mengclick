const key = tabId => `session:${tabId}`;

const queues = new Map();
function enqueue(tabId, operation) {
  const task = (queues.get(tabId) || Promise.resolve()).catch(() => {}).then(operation);
  queues.set(tabId, task);
  task.finally(() => { if (queues.get(tabId) === task) queues.delete(tabId); }).catch(() => {});
  return task;
}

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message.type !== 'saveSession' || !Number.isInteger(sender.tab?.id)) return;
  const tabId = sender.tab.id;
  const storageKey = key(tabId);
  enqueue(tabId, async () => {
    const frame = await chrome.webNavigation.getFrame({ tabId, frameId: 0 });
    if (sender.documentId && frame?.documentId !== sender.documentId) return;
    if (message.session) await chrome.storage.session.set({ [storageKey]: message.session });
    else await chrome.storage.session.remove(storageKey);
  }).then(() => respond({ ok: true }), () => respond({ ok: false }));
  return true;
});

chrome.webNavigation.onCompleted.addListener(details => {
  if (details.frameId !== 0) return;
  enqueue(details.tabId, async () => {
  const storageKey = key(details.tabId);
  const saved = (await chrome.storage.session.get(storageKey))[storageKey];
  if (!saved) return;
  let hostname;
  try { hostname = new URL(details.url).hostname; } catch { hostname = ''; }
  if (!hostname || hostname !== saved.hostname) {
    await chrome.storage.session.remove(storageKey);
    return;
  }
  try {
    await chrome.scripting.executeScript({ target: { tabId: details.tabId }, files: ['content.js'] });
    await chrome.tabs.sendMessage(details.tabId, { type: 'restore', session: saved });
  } catch {
    // Navigation can replace the document before injection completes.
  }
  }).catch(() => {});
});

chrome.tabs.onRemoved.addListener(tabId => { enqueue(tabId, () => chrome.storage.session.remove(key(tabId))).catch(() => {}); });
