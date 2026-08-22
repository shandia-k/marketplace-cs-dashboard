/**
 * tests/helpers/dom-sandbox.js
 * Lightweight DOM & Browser Sandbox Environment for Node.js Testing
 * Allows executing and testing renderer scripts (utils.js, modal.js, quickreply.js, etc.)
 */

class MockClassList {
  constructor() {
    this.classes = new Set();
  }
  add(...names) {
    names.forEach(n => this.classes.add(n));
  }
  remove(...names) {
    names.forEach(n => this.classes.delete(n));
  }
  contains(name) {
    return this.classes.has(name);
  }
  toggle(name, force) {
    if (force === true) {
      this.classes.add(name);
      return true;
    } else if (force === false) {
      this.classes.delete(name);
      return false;
    }
    if (this.classes.has(name)) {
      this.classes.delete(name);
      return false;
    } else {
      this.classes.add(name);
      return true;
    }
  }
  toString() {
    return Array.from(this.classes).join(' ');
  }
}

class MockElement {
  constructor(tagName = 'div', id = '') {
    this.tagName = tagName.toUpperCase();
    this.id = id;
    this.classList = new MockClassList();
    this.className = '';
    this.style = {};
    this.children = [];
    this.attributes = new Map();
    this.textContent = '';
    this._innerHTML = '';
    this.value = '';
    this.disabled = false;
    this.onclick = null;
    this.oninput = null;
    this.onkeydown = null;
  }

  focus() {}
  blur() {}

  addEventListener(type, listener) {
    if (!this._listeners) this._listeners = new Map();
    if (!this._listeners.has(type)) this._listeners.set(type, []);
    this._listeners.get(type).push(listener);
  }

  removeEventListener(type, listener) {
    if (!this._listeners || !this._listeners.has(type)) return;
    const list = this._listeners.get(type);
    const idx = list.indexOf(listener);
    if (idx !== -1) list.splice(idx, 1);
  }

  dispatchEvent(event) {
    const type = event.type || event;
    if (this._listeners && this._listeners.has(type)) {
      this._listeners.get(type).forEach(fn => fn(event));
    }
  }

  get innerHTML() {
    return this._innerHTML || this.textContent;
  }

  set innerHTML(val) {
    this._innerHTML = val;
    this.textContent = String(val).replace(/<[^>]*>?/gm, '');
  }

  setAttribute(name, val) {
    this.attributes.set(name, String(val));
    if (name === 'class') {
      this.className = String(val);
      this.classList.classes = new Set(String(val).split(' ').filter(Boolean));
    }
    if (name === 'id') this.id = String(val);
  }

  getAttribute(name) {
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) this.children.splice(idx, 1);
    return child;
  }

  closest(selector) {
    if (selector.includes('a[href]')) {
      if (this.tagName === 'A' && this.hasAttribute('href')) return this;
    }
    return null;
  }

  querySelector(selector) {
    if (selector.startsWith('#')) {
      const id = selector.slice(1);
      return this.children.find(c => c.id === id) || null;
    }
    return null;
  }

  querySelectorAll(selector) {
    return [];
  }
}

class MockDocument {
  constructor() {
    this.elements = new Map();
    this.body = new MockElement('body', 'body');
    this.elements.set('body', this.body);
    this.eventListeners = new Map();
  }

  createElement(tag) {
    return new MockElement(tag);
  }

  getElementById(id) {
    if (!this.elements.has(id)) {
      const el = new MockElement('div', id);
      this.elements.set(id, el);
    }
    return this.elements.get(id);
  }

  querySelector(selector) {
    if (selector.startsWith('#')) {
      return this.getElementById(selector.slice(1));
    }
    if (selector.startsWith('.')) {
      const cls = selector.slice(1);
      for (const el of this.elements.values()) {
        if (el.classList && el.classList.contains(cls)) return el;
      }
    }
    return null;
  }

  querySelectorAll(selector) {
    const results = [];
    if (selector.startsWith('.')) {
      const cls = selector.slice(1);
      for (const el of this.elements.values()) {
        if (el.classList && el.classList.contains(cls)) results.push(el);
      }
    }
    return results;
  }

  registerElement(id, element) {
    this.elements.set(id, element);
  }

  addEventListener(event, listener) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(listener);
  }

  removeEventListener(event, listener) {
    if (this.eventListeners.has(event)) {
      const list = this.eventListeners.get(event);
      const idx = list.indexOf(listener);
      if (idx !== -1) list.splice(idx, 1);
    }
  }

  dispatchEvent(event) {
    const list = this.eventListeners.get(event.type) || [];
    list.forEach(cb => cb(event));
  }
}

function createDOMSandbox() {
  const doc = new MockDocument();
  const storageMap = new Map();

  const mockLocalStorage = {
    getItem: (key) => storageMap.has(key) ? storageMap.get(key) : null,
    setItem: (key, val) => storageMap.set(key, String(val)),
    removeItem: (key) => storageMap.delete(key),
    clear: () => storageMap.clear(),
    key: (index) => Array.from(storageMap.keys())[index] || null,
    get length() { return storageMap.size; }
  };

  const sandbox = {
    window: {
      document: doc,
      localStorage: mockLocalStorage,
      currentUser: 'test_cs',
      currentUserProfile: { displayName: 'CS Test', role: 'Customer Service' },
      currentUserName: 'CS Test',
      stores: [],
      activeStoreId: 'store-1',
      currentClipboardValue: 'INV/2026/08/1001',
      AudioContext: class {
        constructor() {
          this.currentTime = 0;
          this.state = 'running';
          this.destination = {};
        }
        resume() {}
        createOscillator() {
          return {
            type: 'sine',
            frequency: { setValueAtTime: () => {} },
            connect: () => {},
            start: () => {},
            stop: () => {}
          };
        }
        createGain() {
          return {
            gain: {
              setValueAtTime: () => {},
              exponentialRampToValueAtTime: () => {}
            },
            connect: () => {}
          };
        }
      },
      confirm: () => true,
      alert: () => {},
      setTimeout: setTimeout,
      clearTimeout: clearTimeout,
      setInterval: setInterval,
      clearInterval: clearInterval
    },
    document: doc,
    localStorage: mockLocalStorage
  };

  return sandbox;
}

module.exports = {
  createDOMSandbox,
  MockElement,
  MockDocument,
  MockClassList
};
