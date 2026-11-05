const $ = id => document.getElementById(id);
const mouse = $('mouse-mode');
const element = $('element-mode');
const interval = $('interval');
const start = $('start');
const stop = $('stop');
const hint = $('hint');
const status = $('status');
const error = $('interval-error');
let tabId;
let mode = 'mouse';
let running = false;
let selecting = false;

function renderStats(current) {
  $('click-count').textContent = String(current.clicks || 0);
  const seconds = Math.floor((current.elapsed || 0) / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds / 60) % 60;
  $('elapsed').textContent = [hours, minutes, seconds % 60].map(value => String(value).padStart(2, '0')).join(':');
}

async function refreshStatus() {
  try {
    const current = await send({ type: 'status' });
    mode = current.mode;
    running = current.running;
    selecting = current.selecting;
    renderStats(current);
    render();
  } catch { /* The tab may have navigated or closed. */ }
}

function render() {
  mouse.classList.toggle('active', mode === 'mouse');
  element.classList.toggle('active', mode === 'element');
  mouse.setAttribute('aria-pressed', String(mode === 'mouse'));
  element.setAttribute('aria-pressed', String(mode === 'element'));
  status.classList.toggle('running', running || selecting);
  status.innerHTML = `<span></span> ${selecting ? 'Selecting' : running ? 'Running' : 'Ready'}`;
  start.hidden = running || selecting;
  stop.hidden = !(running || selecting);
  start.firstChild.textContent = mode === 'element' ? 'Select an element ' : 'Start clicking ';
  hint.textContent = selecting ? 'Click an element on the page to begin.' : running ? (mode === 'mouse' ? 'Following the last known cursor position in this tab.' : 'Following your selected element in this tab.') : (mode === 'mouse' ? 'Move your cursor over the page to set the target.' : 'Choose an element on the page to start clicking.');
}

async function send(message) {
  const response = await chrome.tabs.sendMessage(tabId, message);
  if (!response) throw new Error('No response from page');
  return response;
}

async function stopCurrent() {
  if (running || selecting) await send({ type: 'stop' });
  running = false;
  selecting = false;
}

async function chooseMode(next) {
  try {
    await send({ type: 'setMode', mode: next });
    running = false;
    selecting = false;
    mode = next;
    render();
  } catch { error.textContent = 'Unable to reach this page. Reopen the extension.'; }
}
mouse.addEventListener('click', () => chooseMode('mouse'));
element.addEventListener('click', () => chooseMode('element'));
interval.addEventListener('input', async () => {
  error.textContent = '';
  try {
    const value = Number(interval.value);
    await send({ type: 'setInterval', interval: interval.value && Number.isFinite(value) && value >= 1 ? value : null });
    running = false;
    selecting = false;
    render();
  } catch { error.textContent = 'Unable to reach this page. Reopen the extension.'; }
});
start.addEventListener('click', async () => {
  const value = Number(interval.value);
  if (!interval.value || !Number.isFinite(value) || value < 1) {
    error.textContent = 'Enter an interval of at least 1 second.';
    return;
  }
  error.textContent = '';
  try {
    const result = await send({ type: 'start', mode, interval: value });
    running = mode === 'mouse';
    selecting = mode === 'element';
    render();
    if (mode === 'mouse' && !result.hasPosition) hint.textContent = 'Move your cursor over the page to set the first target.';
    await refreshStatus();
    if (selecting) window.close();
  } catch { error.textContent = 'Unable to start on this page.'; }
});
$('reset-clicks').addEventListener('click', async () => {
  try { await send({ type: 'resetClicks' }); await refreshStatus(); }
  catch { error.textContent = 'Unable to reset clicks on this page.'; }
});
stop.addEventListener('click', async () => {
  try { await stopCurrent(); await refreshStatus(); } catch { error.textContent = 'Unable to stop on this page.'; }
});

(async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error('No active tab');
    tabId = tab.id;
    await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
    const current = await send({ type: 'status' });
    mode = current.mode;
    interval.value = current.interval;
    running = current.running;
    selecting = current.selecting;
    renderStats(current);
    render();
    setInterval(refreshStatus, 1000);
  } catch {
    start.disabled = true;
    start.textContent = 'Unavailable on this page';
    hint.textContent = 'Open a regular website to use Mengclick. Chrome pages and the Web Store are restricted.';
  }
})();
