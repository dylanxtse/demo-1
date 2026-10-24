const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { root } = require('./helpers/app-context.cjs');

const source = fs.readFileSync(path.join(root, 'assets/js/pages/sorting-terminal-customer-item.js'), 'utf8');

class Element {
  constructor() {
    this.dataset = {};
    this.children = [];
    this.listeners = {};
    this.attributes = {};
    this.className = '';
    this.classList = { toggle() {}, add() {}, remove() {} };
    this.disabled = false;
    this.hidden = false;
    this.value = '';
    this.textContent = '';
  }

  addEventListener(type, handler) { this.listeners[type] = handler; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  append(...children) {
    children.forEach((child) => {
      child.parentElement = this;
      this.children.push(child);
    });
  }
  replaceChildren(...children) {
    this.children = [];
    this.append(...children);
  }
  querySelector() { return new Element(); }
  querySelectorAll() { return []; }
  showModal() {}
  close() {}
  closest(selector) {
    for (let current = this; current; current = current.parentElement) {
      if (selector === '[data-id]' && current.dataset.id != null) return current;
      if (selector === '[data-action]' && current.dataset.action != null) return current;
    }
    return null;
  }
}

function setup(status) {
  const elements = new Map();
  const document = {
    body: { dataset: {} },
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, new Element());
      return elements.get(id);
    },
    createElement() { return new Element(); }
  };
  const search = '?customer=YF001';
  const storageKey = 'sorting-terminal-customer:v1:YF001';
  const progress = status === 'done'
    ? { doneIds: [0], shortageIds: [], measuredById: { 0: 29 } }
    : { doneIds: [], shortageIds: status === 'shortage' ? [0] : [], measuredById: { 0: 12 } };
  const location = { search, href: `file:///sorting-terminal-customer-item.html${search}` };
  const context = {
    document,
    location,
    history: { replaceState() {} },
    localStorage: { getItem: (key) => key === storageKey ? JSON.stringify(progress) : null },
    URL,
    URLSearchParams,
    Date,
    Math,
    Number,
    String,
    Set,
    Map,
    JSON,
    print() { throw new Error('客户打印按钮不应调用浏览器打印卡片'); }
  };
  context.window = context;
  context.addEventListener = () => {};
  vm.runInNewContext(source, context, { filename: 'sorting-terminal-customer-item.js' });
  return { context, elements };
}

for (const status of ['pending', 'shortage', 'done']) {
  test(`客户分拣打印按钮在${status}状态下按下单数量生成客户标签`, () => {
    const { context, elements } = setup(status);
    const grid = elements.get('sortingTerminalCustomerItemGrid');
    const card = grid.children.find((item) => item.dataset.id === '0');
    const printButton = card.children[1].children[1];

    assert.equal(printButton.disabled, false);
    grid.listeners.click({ target: printButton });

    const url = new URL(context.location.href, 'file:///sorting-terminal-customer-item.html');
    assert.equal(url.pathname, '/sorting-label-print.html');
    const payload = JSON.parse(url.searchParams.get('printData'));
    assert.equal(payload.source, 'sorting-terminal-customer-item-order');
    assert.equal(payload.mode, 'customer');
    assert.equal(payload.customerCode, 'YF001');
    assert.equal(payload.rows[0].goodsName, '茄子');
    assert.equal(payload.rows[0].orderQty, 35);
    assert.equal(Object.hasOwn(payload.rows[0], 'packageLabelQuantity'), false);
    assert.equal(payload.rows[0].id.endsWith('-ORDER'), true);
  });
}
