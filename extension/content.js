(() => {
  if (window.__bgClick) return;

  const state = { mode: 'mouse', interval: 5, running: false, selecting: false, x: null, y: null, element: null, selector: null, timer: null, url: location.href, clicks: 0, startedAt: null, elapsed: 0 };
  let overlay = null;
  function save() {
    const session = state.running ? { hostname: location.hostname, mode: state.mode, interval: state.interval, x: state.x, y: state.y, selector: state.selector, clicks: state.clicks, startedAt: state.startedAt } : null;
    chrome.runtime.sendMessage({ type: 'saveSession', session }).catch(() => {});
  }

  function stop() {
    if (state.running && state.startedAt !== null) state.elapsed = Date.now() - state.startedAt;
    state.startedAt = null;
    clearInterval(state.timer);
    state.timer = null;
    state.running = false;
    state.selecting = false;
    state.element = null;
    state.selector = null;
    if (overlay) overlay.remove();
    overlay = null;
    save();
  }

  function checkNavigation() {
    state.url = location.href;
  }

  function selectorFor(element) {
    if (element.id && document.querySelectorAll(`#${CSS.escape(element.id)}`).length === 1) return `#${CSS.escape(element.id)}`;
    const parts = [];
    for (let node = element; node && node.nodeType === Node.ELEMENT_NODE && node !== document.documentElement; node = node.parentElement) {
      let part = node.localName;
      if (node.id && document.querySelectorAll(`#${CSS.escape(node.id)}`).length === 1) {
        parts.unshift(`#${CSS.escape(node.id)}`);
        break;
      }
      const siblings = node.parentElement ? [...node.parentElement.children].filter(child => child.localName === node.localName) : [];
      if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(node) + 1})`;
      parts.unshift(part);
    }
    return parts.join(' > ');
  }

  function spark(x, y) {
    const host = document.createElement('div');
    host.style.cssText = `position:fixed;left:${x}px;top:${y}px;z-index:2147483647;pointer-events:none;width:0;height:0;`;
    const root = host.attachShadow({ mode: 'closed' });
    const style = document.createElement('style');
    style.textContent = '@keyframes bg-ring{to{transform:translate(-50%,-50%) scale(2.6);opacity:0}}@keyframes bg-ray{to{transform:rotate(var(--angle)) translateY(-24px);opacity:0}}.ring{position:absolute;width:18px;height:18px;border:2px solid #f97316;border-radius:50%;transform:translate(-50%,-50%);animation:bg-ring .55s ease-out forwards}.ray{position:absolute;width:3px;height:8px;border-radius:4px;background:var(--color);transform:rotate(var(--angle)) translateY(-8px);animation:bg-ray .55s ease-out forwards;transform-origin:0 0}';
    root.append(style);
    const ring = document.createElement('div');
    ring.className = 'ring';
    root.append(ring);
    for (let i = 0; i < 8; i++) {
      const ray = document.createElement('div');
      ray.className = 'ray';
      ray.style.setProperty('--angle', `${i * 45}deg`);
      ray.style.setProperty('--color', ['#f97316', '#fb923c', '#ffedd5', '#ea580c'][i % 4]);
      root.append(ray);
    }
    document.documentElement.append(host);
    setTimeout(() => host.remove(), 650);
  }

  function clickTarget() {
    checkNavigation();
    if (!state.running) return;
    let target, x, y;
    if (state.mode === 'element') {
      if (!state.element?.isConnected) state.element = state.selector ? document.querySelector(state.selector) : null;
      target = state.element;
      if (!target) return;
      const rect = target.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      x = rect.left + rect.width / 2;
      y = rect.top + rect.height / 2;
    } else {
      x = state.x; y = state.y;
      if (x === null || y === null) return;
      target = document.elementFromPoint(x, y);
      if (!target) return;
    }
    const options = { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y, button: 0 };
    state.clicks++;
    save();
    for (const type of ['mousedown', 'mouseup', 'click']) target.dispatchEvent(new MouseEvent(type, options));
    spark(x, y);
  }

  function begin() {
    state.running = true;
    state.startedAt = Date.now();
    state.elapsed = 0;
    state.clicks = 0;
    save();
    clickTarget();
    state.timer = setInterval(clickTarget, state.interval * 1000);
  }

  document.addEventListener('mousemove', event => {
    checkNavigation();
    const firstPosition = state.x === null;
    state.x = event.clientX;
    state.y = event.clientY;
    if (state.running && state.mode === 'mouse') {
      clearTimeout(state.positionSaveTimer);
      state.positionSaveTimer = setTimeout(save, 200);
    }
    if (firstPosition && state.running && state.mode === 'mouse') {
      clearInterval(state.timer);
      clickTarget();
      state.timer = setInterval(clickTarget, state.interval * 1000);
    }
    if (state.selecting && overlay && event.target instanceof Element) {
      const rect = event.target.getBoundingClientRect();
      Object.assign(overlay.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
    }
  }, true);

  document.addEventListener('click', event => {
    if (!state.selecting || !event.isTrusted || !(event.target instanceof Element)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    state.element = event.target;
    state.selector = selectorFor(event.target);
    state.selecting = false;
    if (overlay) overlay.remove();
    overlay = null;
    begin();
  }, true);

  window.addEventListener('popstate', checkNavigation);
  window.addEventListener('hashchange', checkNavigation);
  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    checkNavigation();
    if (message.type === 'status') {
      respond({ mode: state.mode, interval: state.interval, running: state.running, selecting: state.selecting, hasPosition: state.x !== null, clicks: state.clicks, elapsed: state.running && state.startedAt !== null ? Date.now() - state.startedAt : state.elapsed });
    } else if (message.type === 'stop') {
      stop();
      respond({ ok: true });
    } else if (message.type === 'resetClicks') {
      state.clicks = 0;
      save();
      respond({ ok: true });
    } else if (message.type === 'restore') {
      const saved = message.session;
      if (!state.running && saved?.hostname === location.hostname) {
        state.mode = saved.mode;
        state.interval = Math.max(1, Number(saved.interval) || 5);
        state.x = saved.x;
        state.y = saved.y;
        state.selector = saved.selector;
        state.element = null;
        state.clicks = saved.clicks || 0;
        state.startedAt = saved.startedAt || Date.now();
        state.running = true;
        state.timer = setInterval(clickTarget, state.interval * 1000);
      }
      respond({ ok: true });
    } else if (message.type === 'setMode') {
      stop();
      state.mode = message.mode === 'element' ? 'element' : 'mouse';
      respond({ ok: true });
    } else if (message.type === 'setInterval') {
      stop();
      if (Number.isFinite(message.interval) && message.interval >= 1) state.interval = message.interval;
      respond({ ok: true });
    } else if (message.type === 'start') {
      stop();
      state.mode = message.mode === 'element' ? 'element' : 'mouse';
      state.interval = Math.max(1, Number(message.interval) || 5);
      if (state.mode === 'element') {
        state.selecting = true;
        overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;z-index:2147483647;pointer-events:none;box-sizing:border-box;border:2px solid #f97316;background:#fb923c40;border-radius:3px;transition:all .08s;';
        document.documentElement.append(overlay);
      } else {
        begin();
      }
      respond({ ok: true, hasPosition: state.x !== null });
    }
  });
  window.__bgClick = true;
})();
