const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { root } = require('./helpers/app-context.cjs');

const source = fs.readFileSync(path.join(root, 'assets/js/pages/sorting-terminal-item.js'), 'utf8');

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
  const search = `?name=%E5%9C%9F%E8%B1%86&code=SP0300040&stock=102&unit=%E6%96%A4&sorted=0&total=5&group=root&task=root%3A0${extraSearch}`;
  const progress = status === 'done'
    ? { doneIds: [0], shortageIds: [], measuredById: { 0: 29 } }
    : { doneIds: [], shortageIds: status === 'shortage' ? [0] : [], measuredById: { 0: 12 } };
  const storageKey = 'sorting-terminal-item:v1:root:0';
  const location = { search, href: `file:///sorting-terminal-item.html${search}` };
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
  vm.runInNewContext(source, context, { filename: 'sorting-terminal-item.js' });
  return { context, elements };
}

test('商品详情返回列表保留选中餐次和展开分类', () => {
  const { elements } = setup('pending', '&meal=lunch&meal=morningSnack&meal=eveningSnack');
  const target = new URL(elements.get('sortingTerminalItemBack').href);
  assert.equal(target.pathname, '/sorting-terminal-product.html');
  assert.equal(target.searchParams.get('expand'), 'root');
  assert.deepEqual(target.searchParams.getAll('meal'), ['lunch', 'morningSnack', 'eveningSnack']);
});

test('餐次筛选继承外层选择并更新任务、摘要和返回链接', () => {
  const { elements } = setup('pending', '&meal=lunch&meal=morningSnack&meal=eveningSnack');
  const grid = elements.get('sortingTerminalItemGrid');
  const mealOptions = elements.get('sortingTerminalItemMealOptions').children;
  const mealAll = elements.get('sortingTerminalItemMealAll');
  const lunch = mealOptions.find((label) => label.children[0].value === 'lunch').children[0];
  const morningSnack = mealOptions.find((label) => label.children[0].value === 'morningSnack').children[0];

  assert.equal(grid.children.length, 12);
  assert.equal(elements.get('sortingTerminalItemMealSummary').textContent, '午餐、早点、晚点');
  assert.equal(morningSnack.checked, true);
  assert.equal(mealAll.indeterminate, true);

  morningSnack.checked = false;
  elements.get('sortingTerminalItemMealMenu').listeners.change({ target: morningSnack });

  assert.equal(grid.children.length, 8);
  assert.equal(elements.get('sortingTerminalItemMealSummary').textContent, '午餐、晚点');
  assert.deepEqual(new URL(elements.get('sortingTerminalItemBack').href).searchParams.getAll('meal'), ['lunch', 'eveningSnack']);

  mealAll.checked = false;
  elements.get('sortingTerminalItemMealMenu').listeners.change({ target: mealAll });
  assert.equal(grid.children.length, 0);
  assert.equal(elements.get('sortingTerminalItemMealSummary').textContent, '请选择餐次');

  mealAll.checked = true;
  elements.get('sortingTerminalItemMealMenu').listeners.change({ target: mealAll });
  assert.equal(grid.children.length, 24);
  assert.equal(elements.get('sortingTerminalItemMealSummary').textContent, '全部餐次');

  mealAll.checked = false;
  elements.get('sortingTerminalItemMealMenu').listeners.change({ target: mealAll });
  lunch.checked = true;
  elements.get('sortingTerminalItemMealMenu').listeners.change({ target: lunch });
  assert.equal(grid.children.length, 4);
  assert.equal(elements.get('sortingTerminalItemMealSummary').textContent, '午餐');
});

for (const status of ['pending', 'shortage', 'done']) {
  test(`客户打印按钮在${status}状态下按下单数量打开分包标签`, () => {
    const { context, elements } = setup(status);
    const grid = elements.get('sortingTerminalItemGrid');
    if (status === 'done') {
      assert.equal(grid.children.some((item) => item.dataset.id === '0'), false);
      const option = { dataset: { filter: 'done' } };
      elements.get('sortingTerminalItemFilterMenu').listeners.click({ target: { closest() { return option; } } });
    }
    const card = grid.children.find((item) => item.dataset.id === '0');
    const printButton = card.children[1].children[1];

    assert.equal(printButton.disabled, false);
    grid.listeners.click({ target: printButton });

    const url = new URL(context.location.href, 'file:///sorting-terminal-item.html');
    assert.equal(url.pathname, '/sorting-label-print.html');
    const payload = JSON.parse(url.searchParams.get('printData'));
    assert.equal(payload.source, 'sorting-terminal-item-order');
    assert.equal(payload.rows[0].customerName, '宜丰十一中');
    assert.equal(payload.rows[0].orderQty, 35);
    assert.equal(Object.hasOwn(payload.rows[0], 'packageLabelQuantity'), false);
    assert.equal(payload.rows[0].id.endsWith('-ORDER'), true);
  });
}
