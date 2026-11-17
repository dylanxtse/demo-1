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
  contains(target) {
    for (let current = target; current; current = current.parentElement) {
      if (current === this) return true;
    }
    return false;
  }
  focus() {}
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

function setup(status, extraSearch = '') {
  const elements = new Map();
  const document = {
    body: { dataset: {} },
    listeners: {},
    addEventListener(type, handler) { this.listeners[type] = handler; },
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, new Element());
      return elements.get(id);
    },
    createElement() { return new Element(); }
  };
  const search = `?customer=YF001${extraSearch}`;
  const storageKey = 'sorting-terminal-customer:v1:YF001';
  const progress = status === 'done'
    ? { doneIds: [0], shortageIds: [], measuredById: { 0: 29 } }
    : { doneIds: [], shortageIds: status === 'shortage' ? [0] : [], measuredById: { 0: 12 } };
  const location = { search, href: `file:///sorting-terminal-customer-item.html${search}` };
  const session = new Map();
  const context = {
    document,
    location,
    history: { replaceState(_state, _title, nextUrl) {
      const url = new URL(nextUrl, location.href);
      location.href = url.href;
      location.search = url.search;
    } },
    sessionStorage: {
      getItem: (key) => session.has(key) ? session.get(key) : null,
      setItem: (key, value) => session.set(key, String(value))
    },
    localStorage: { getItem: (key) => key === storageKey ? JSON.stringify(progress) : null },
    OrderMealOptions: [
      { key: 'breakfast', label: '早餐' }, { key: 'lunch', label: '午餐' },
      { key: 'dinner', label: '晚餐' }, { key: 'morningSnack', label: '早点' },
      { key: 'afternoonSnack', label: '午点' }, { key: 'eveningSnack', label: '晚点' }
    ],
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

test('客户任务面板继承餐次筛选并同步客户导航和返回链接', () => {
  const { elements } = setup('pending', '&meal=lunch&meal=morningSnack&meal=eveningSnack');
  const grid = elements.get('sortingTerminalCustomerItemGrid');
  const mealOptions = elements.get('sortingTerminalCustomerItemMealOptions').children;
  const morningSnack = mealOptions.find((label) => label.children[0].value === 'morningSnack').children[0];

  assert.equal(grid.children.length, 6);
  assert.equal(elements.get('sortingTerminalCustomerItemMealSummary').textContent, '午餐、早点、晚点');
  morningSnack.checked = false;
  elements.get('sortingTerminalCustomerItemMealMenu').listeners.change({ target: morningSnack });

  assert.equal(grid.children.length, 4);
  assert.equal(elements.get('sortingTerminalCustomerItemMealSummary').textContent, '午餐、晚点');
  assert.deepEqual(new URL(elements.get('sortingTerminalCustomerItemBack').href).searchParams.getAll('meal'), ['lunch', 'eveningSnack']);
  assert.deepEqual(new URL(elements.get('sortingTerminalCustomerItemSidebar').children[1].href).searchParams.getAll('meal'), ['lunch', 'eveningSnack']);
});

for (const status of ['pending', 'shortage', 'done']) {
  test(`客户分拣打印按钮在${status}状态下按下单数量生成客户标签`, () => {
    const { context, elements } = setup(status);
    const grid = elements.get('sortingTerminalCustomerItemGrid');
    if (status === 'done') {
      assert.equal(grid.children.some((item) => item.dataset.id === '0'), false);
      const option = { dataset: { filter: 'done' } };
      elements.get('sortingTerminalCustomerItemFilterMenu').listeners.click({ target: { closest() { return option; } } });
    }
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
    assert.deepEqual(new URLSearchParams(payload.returnSearch).getAll('meal'), [
      'breakfast', 'lunch', 'dinner', 'morningSnack', 'afternoonSnack', 'eveningSnack'
    ]);
  });
}
