const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { root } = require('./helpers/app-context.cjs');

const source = fs.readFileSync(path.join(root, 'assets/js/pages/sorting-terminal-customer.js'), 'utf8');

class Element {
  constructor() {
    this.dataset = {};
    this.children = [];
    this.listeners = {};
    this.attributes = {};
    this.className = '';
    this.classList = { toggle() {}, add() {}, remove() {} };
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
  contains(target) {
    for (let current = target; current; current = current.parentElement) {
      if (current === this) return true;
    }
    return false;
  }
  focus() {}
  closest(selector) {
    for (let current = this; current; current = current.parentElement) {
      if (selector === '[data-code]' && current.dataset.code != null) return current;
    }
    return null;
  }
}

function setup(extraSearch = '') {
  const elements = new Map();
  const document = {
    listeners: {},
    addEventListener(type, handler) { this.listeners[type] = handler; },
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, new Element());
      return elements.get(id);
    },
    createElement() { return new Element(); }
  };
  elements.set('sortingTerminalCustomerRoute', new Element());
  elements.get('sortingTerminalCustomerRoute').value = 'all';
  const search = extraSearch ? `?${extraSearch.replace(/^&/, '')}` : '';
  const location = { search, href: `file:///sorting-terminal-customer.html${search}` };
  const values = new Map();
  const context = {
    document,
    location,
    URL,
    URLSearchParams,
    history: { replaceState(_state, _title, nextUrl) {
      const url = new URL(nextUrl, location.href);
      location.href = url.href;
      location.search = url.search;
    } },
    sessionStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, String(value))
    },
    localStorage: { getItem() { return null; } },
    OrderMealOptions: [
      { key: 'breakfast', label: '早餐' }, { key: 'lunch', label: '午餐' },
      { key: 'dinner', label: '晚餐' }, { key: 'morningSnack', label: '早点' },
      { key: 'afternoonSnack', label: '午点' }, { key: 'eveningSnack', label: '晚点' }
    ]
  };
  context.window = context;
  vm.runInNewContext(source, context, { filename: 'sorting-terminal-customer.js' });
  return { context, elements, values };
}

test('客户列表继承餐次筛选、支持多选，并将当前选择传入任务页', () => {
  const { context, elements, values } = setup('&meal=lunch&meal=morningSnack&meal=eveningSnack');
  const grid = elements.get('sortingTerminalCustomerGrid');
  const options = elements.get('sortingTerminalCustomerMealOptions').children;
  const morningSnack = options.find((label) => label.children[0].value === 'morningSnack').children[0];

  assert.equal(grid.children.length, 6);
  assert.equal(elements.get('sortingTerminalCustomerMealSummary').textContent, '午餐、早点、晚点');
  morningSnack.checked = false;
  elements.get('sortingTerminalCustomerMealMenu').listeners.change({ target: morningSnack });

  assert.equal(grid.children.length, 4);
  assert.equal(elements.get('sortingTerminalCustomerMealSummary').textContent, '午餐、晚点');
  assert.deepEqual(JSON.parse(values.get('sorting-terminal-meal-filter:v1')), ['lunch', 'eveningSnack']);
  assert.deepEqual(new URL(elements.get('sortingTerminalCustomerBack').href).searchParams.getAll('meal'), ['lunch', 'eveningSnack']);

  grid.listeners.click({ target: grid.children[0] });
  const target = new URL(context.location.href);
  assert.equal(target.pathname, '/sorting-terminal-customer-item.html');
  assert.equal(target.searchParams.get('customer'), 'YF002');
  assert.deepEqual(target.searchParams.getAll('meal'), ['lunch', 'eveningSnack']);
});

test('客户列表默认全选餐次，取消全选后可单选', () => {
  const { elements } = setup();
  const grid = elements.get('sortingTerminalCustomerGrid');
  const mealAll = elements.get('sortingTerminalCustomerMealAll');
  const options = elements.get('sortingTerminalCustomerMealOptions').children;
  const lunch = options.find((label) => label.children[0].value === 'lunch').children[0];

  assert.equal(grid.children.length, 13);
  assert.equal(elements.get('sortingTerminalCustomerMealSummary').textContent, '全部餐次');
  mealAll.checked = false;
  elements.get('sortingTerminalCustomerMealMenu').listeners.change({ target: mealAll });
  assert.equal(grid.children.length, 1);
  assert.equal(grid.children[0].className, 'sorting-terminal-customer-empty');
  lunch.checked = true;
  elements.get('sortingTerminalCustomerMealMenu').listeners.change({ target: lunch });
  assert.equal(grid.children.length, 2);
  assert.equal(elements.get('sortingTerminalCustomerMealSummary').textContent, '午餐');
});
