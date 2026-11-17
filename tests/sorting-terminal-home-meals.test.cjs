const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { root } = require('./helpers/app-context.cjs');

class Element {
  constructor() {
    this.listeners = {};
    this.attributes = {};
    this.children = [];
    this.dataset = {};
    this.classList = { toggle() {} };
    this.hidden = true;
  }
  addEventListener(type, callback) { this.listeners[type] = callback; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  append(...children) { this.children.push(...children); }
  contains(target) { return target === this || this.children.some((child) => child.contains(target)); }
  focus() { this.focused = true; }
}

const storageKey = 'sorting-terminal-meal-filter:v1';
const keys = ['breakfast', 'lunch', 'dinner', 'morningSnack', 'afternoonSnack', 'eveningSnack'];

function setup(saved, storageBlocked = false, search = '') {
  const elements = new Map();
  const values = new Map(saved === undefined ? [] : [[storageKey, saved]]);
  const features = ['商品分拣', '客户分拣'].map((feature) => {
    const button = new Element();
    button.dataset.feature = feature;
    return button;
  });
  const document = {
    listeners: {},
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, new Element());
      return elements.get(id);
    },
    createElement() { return new Element(); },
    querySelectorAll() { return features; },
    addEventListener(type, callback) { this.listeners[type] = callback; }
  };
  const context = {
    document, URL, URLSearchParams,
    location: { href: `file:///Users/dashui/Desktop/demo-1/sorting-terminal-home.html${search}`, search },
    sessionStorage: {
      getItem(key) { if (storageBlocked) throw new Error('blocked'); return values.get(key) ?? null; },
      setItem(key, value) { if (storageBlocked) throw new Error('blocked'); values.set(key, value); },
      removeItem(key) { values.delete(key); }
    }
  };
  context.window = context;
  vm.createContext(context);
  for (const file of ['config/order-meal-options.js', 'pages/sorting-terminal-home.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, 'assets/js', file), 'utf8'), context);
  }
  const get = (suffix) => elements.get(`sortingTerminal${suffix}`);
  const inputs = get('MealOptions').children.map((label) => label.children[0]);
  function change(input, checked) {
    input.checked = checked;
    get('MealMenu').listeners.change({ target: input });
  }
  return { context, document, values, features, get, inputs, change };
}

test('餐次默认全选；取消全选后支持单选、多选和恢复全选', () => {
  const { get, inputs, change, values } = setup();
  const all = get('MealAll');
  assert.equal(all.checked, true);
  assert.equal(get('MealSummary').textContent, '全部餐次');
  assert.equal(inputs.every((input) => input.checked), true);
  change(all, false);
  assert.equal(get('MealSummary').textContent, '请选择餐次');
  change(inputs[0], true);
  assert.equal(get('MealSummary').textContent, '早餐');
  assert.equal(all.indeterminate, true);
  change(inputs[1], true);
  assert.equal(get('MealSummary').textContent, '早餐、午餐');
  assert.deepEqual(JSON.parse(values.get(storageKey)), ['breakfast', 'lunch']);
  change(inputs[0], false);
  assert.equal(get('MealSummary').textContent, '午餐');
  change(all, true);
  assert.deepEqual(JSON.parse(values.get(storageKey)), keys);
  assert.equal(all.indeterminate, false);
});

test('重新进入首页恢复所选餐次，异常缓存不会阻止页面初始化', () => {
  assert.equal(setup(JSON.stringify(['lunch', 'dinner', 'invalid'])).get('MealSummary').textContent, '午餐、晚餐');
  assert.equal(setup('invalid-json').get('MealSummary').textContent, '全部餐次');
  assert.equal(setup(undefined, true).get('MealSummary').textContent, '全部餐次');
  assert.equal(setup('[]').get('MealSummary').textContent, '请选择餐次');
});

test('返回首页时优先恢复链接中携带的餐次', () => {
  assert.equal(setup(JSON.stringify(['breakfast']), false, '?meal=lunch&meal=dinner').get('MealSummary').textContent, '午餐、晚餐');
});

test('商品和客户分拣入口传递选择的餐次，未选择时提示补选', () => {
  for (const [index, page] of ['sorting-terminal-product.html', 'sorting-terminal-customer.html'].entries()) {
    const { context, features } = setup(JSON.stringify(['breakfast', 'dinner']));
    features[index].listeners.click();
    const target = new URL(context.location.href);
    assert.equal(target.pathname.endsWith(page), true);
    assert.deepEqual(target.searchParams.getAll('meal'), ['breakfast', 'dinner']);
  }
  const { context, features, get } = setup('[]');
  features[0].listeners.click();
  assert.equal(context.location.href.endsWith('sorting-terminal-home.html'), true);
  assert.equal(get('ActionStatus').textContent, '请至少选择一个餐次');
  assert.equal(get('MealMenu').hidden, false);
  assert.equal(get('MealAll').focused, true);
});

test('餐次下拉支持展开、点击外部关闭和 Escape 返回焦点', () => {
  const { get, document } = setup();
  get('MealTrigger').listeners.click();
  assert.equal(get('MealMenu').hidden, false);
  assert.equal(get('MealTrigger').attributes['aria-expanded'], 'true');
  document.listeners.click({ target: new Element() });
  assert.equal(get('MealMenu').hidden, true);
  get('MealTrigger').listeners.click();
  get('MealField').listeners.keydown({ key: 'Escape' });
  assert.equal(get('MealMenu').hidden, true);
  assert.equal(get('MealTrigger').focused, true);
});

test('退出终端时清除餐次选择', () => {
  const { get, context, values } = setup();
  get('Logout').listeners.click();
  assert.equal(values.has(storageKey), false);
  assert.equal(context.location.href, './sorting-terminal-login.html');
});
