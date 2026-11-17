const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { root } = require('./helpers/app-context.cjs');

class Element {
  constructor() {
    this.children = [];
    this.listeners = {};
    this.dataset = {};
    this.attributes = {};
    this.value = '';
    this.hidden = true;
    this.className = '';
    this.textContent = '';
    this.scrollTop = 0;
  }
  addEventListener(type, handler) { this.listeners[type] = handler; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  append(...children) {
    children.forEach((child) => { child.parentElement = this; });
    this.children.push(...children);
  }
  replaceChildren(...children) { this.children = []; this.append(...children); }
  contains(target) { return target === this || this.children.some((child) => child.contains(target)); }
  focus() { this.focused = true; }
  get childElementCount() { return this.children.length; }
}

function setup(search = '', saved = null, storageBlocked = false) {
  const elements = new Map();
  const storageKey = 'sorting-terminal-meal-filter:v1';
  const values = new Map([[storageKey, saved]]);
  const location = { search, href: `file:///sorting-terminal-product.html${search}` };
  const context = {
    URL, URLSearchParams,
    location,
    history: { replaceState(_state, _title, url) {
      const next = new URL(url, location.href);
      location.search = next.search;
      location.href = next.href;
    } },
    document: {
      listeners: {},
      getElementById(id) {
        if (!elements.has(id)) elements.set(id, new Element());
        return elements.get(id);
      },
      createElement() { return new Element(); },
      addEventListener(type, handler) { this.listeners[type] = handler; }
    },
    localStorage: { getItem() { return null; } },
    sessionStorage: {
      getItem(key) { if (storageBlocked) throw new Error('blocked'); return values.get(key); },
      setItem(key, value) { if (storageBlocked) throw new Error('blocked'); values.set(key, value); }
    }
  };
  context.window = context;
  vm.createContext(context);
  for (const name of ['config/order-meal-options.js', 'pages/sorting-terminal-product.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, 'assets/js', name), 'utf8'), context);
  }
  return { context, elements, values, storageKey };
}

test('商品分拣保留传入的餐次，链接条件优先于缓存', () => {
  const { values, storageKey, elements } = setup('?meal=lunch&meal=morningSnack&meal=eveningSnack', '["breakfast"]');
  assert.deepEqual(JSON.parse(values.get(storageKey)), ['lunch', 'morningSnack', 'eveningSnack']);
  assert.equal(elements.get('sortingTerminalProductMealSummary').textContent, '午餐、早点、晚点');
  const checks = elements.get('sortingTerminalProductMealOptions').children.map((label) => label.children[0].checked);
  assert.deepEqual(checks, [false, true, false, true, false, true]);
});

test('直接进入商品分拣读取缓存，无缓存或缓存损坏时默认选择全部餐次', () => {
  const cached = setup('', '["lunch","dinner"]');
  assert.deepEqual(JSON.parse(cached.values.get(cached.storageKey)), ['lunch', 'dinner']);
  for (const saved of [null, 'broken', '{}']) {
    const { values, storageKey } = setup('', saved);
    assert.deepEqual(JSON.parse(values.get(storageKey)), ['breakfast', 'lunch', 'dinner', 'morningSnack', 'afternoonSnack', 'eveningSnack']);
  }
  assert.doesNotThrow(() => setup('?meal=lunch', null, true));
});

test('餐次参数去重并忽略无效值', () => {
  const { values, storageKey } = setup('?meal=lunch&meal=lunch&meal=unknown');
  assert.deepEqual(JSON.parse(values.get(storageKey)), ['lunch']);
});

test('进入商品详情时继续携带选中的餐次和任务信息', () => {
  const { elements } = setup('?meal=lunch&meal=morningSnack&meal=eveningSnack&expand=root');
  const rootGroup = elements.get('sortingTerminalProductGroups').children[0];
  const card = rootGroup.children[1].children[0];
  const target = new URL(card.href);
  assert.equal(target.pathname, '/sorting-terminal-item.html');
  assert.equal(target.searchParams.get('task'), 'root:1');
  assert.equal(target.searchParams.get('taskMeal'), 'lunch');
  assert.deepEqual(target.searchParams.getAll('meal'), ['lunch', 'morningSnack', 'eveningSnack']);
});

test('餐次筛选支持全选和单选，直接更新任务卡、分类、URL 和缓存', () => {
  const { context, elements, values, storageKey } = setup('?meal=lunch&meal=morningSnack&meal=eveningSnack');
  const groupRoot = elements.get('sortingTerminalProductGroups');
  assert.equal(groupLabels(elements).includes('果蔬类-根茎类'), true);
  const beforeCount = groupRoot.children[0].children[1].children.length;
  const inputs = elements.get('sortingTerminalProductMealOptions').children.map((label) => label.children[0]);

  const all = elements.get('sortingTerminalProductMealAll');
  all.checked = false;
  elements.get('sortingTerminalProductMealMenu').listeners.change({ target: all });
  inputs[0].checked = true;
  elements.get('sortingTerminalProductMealMenu').listeners.change({ target: inputs[0] });
  assert.equal(elements.get('sortingTerminalProductMealSummary').textContent, '早餐');
  assert.equal(elements.get('sortingTerminalProductMealAll').indeterminate, true);
  assert.equal(groupRoot.children[0].children[1].children.length < beforeCount, true);
  assert.deepEqual(new URLSearchParams(context.location.search).getAll('meal'), ['breakfast']);
  assert.deepEqual(JSON.parse(values.get(storageKey)), ['breakfast']);

  all.checked = true;
  elements.get('sortingTerminalProductMealMenu').listeners.change({ target: all });
  assert.equal(elements.get('sortingTerminalProductMealSummary').textContent, '全部餐次');
  assert.deepEqual(new URLSearchParams(context.location.search).getAll('meal'), [
    'breakfast', 'lunch', 'dinner', 'morningSnack', 'afternoonSnack', 'eveningSnack'
  ]);
});

test('取消所有餐次后显示提示，清空 URL 中的餐次条件', () => {
  const { context, elements } = setup('?meal=lunch');
  const all = elements.get('sortingTerminalProductMealAll');
  all.checked = false;
  elements.get('sortingTerminalProductMealMenu').listeners.change({ target: all });
  assert.equal(elements.get('sortingTerminalProductMealSummary').textContent, '请选择餐次');
  assert.equal(elements.get('sortingTerminalProductGroups').children[0].textContent, '请选择至少一个餐次');
  assert.deepEqual(new URLSearchParams(context.location.search).getAll('meal'), []);
});

test('餐次筛选菜单支持展开、点击外部关闭和 Escape 返回焦点', () => {
  const { elements, context } = setup('?meal=lunch');
  const trigger = elements.get('sortingTerminalProductMealTrigger');
  const menu = elements.get('sortingTerminalProductMealMenu');
  trigger.listeners.click();
  assert.equal(menu.hidden, false);
  assert.equal(trigger.attributes['aria-expanded'], 'true');
  context.document.listeners.click({ target: new Element() });
  assert.equal(menu.hidden, true);
  trigger.listeners.click();
  elements.get('sortingTerminalProductMealFilter').listeners.keydown({ key: 'Escape' });
  assert.equal(menu.hidden, true);
  assert.equal(trigger.focused, true);
});

function groupLabels(elements) {
  return elements.get('sortingTerminalProductGroups').children
    .filter((element) => element.className === 'sorting-terminal-product-group')
    .map((section) => section.children[0].children[0].textContent);
}

function selectCategory(elements, key) {
  const root = elements.get('sortingTerminalProductCategories');
  const button = root.children.find((element) => element.dataset.category === key);
  assert.ok(button, `分类 ${key} 应可选`);
  root.listeners.click({ target: { closest() { return button; } } });
}

test('默认只显示含分拣任务的分类，已全部分拣的分类也正常显示', () => {
  const { elements } = setup();
  const labels = groupLabels(elements);
  assert.equal(labels.length, 11);
  assert.equal(labels.includes('果蔬类-水果类'), true);
  for (const label of ['食用油-动物油', '水产品-虾类', '调料类']) {
    assert.equal(labels.includes(label), false);
  }
  assert.equal(elements.get('sortingTerminalProductCategories').children.some((button) => button.dataset.category === 'seasoning'), false);
});

test('切换按钮支持全部分类和分拣任务分类往返切换，并保留展开状态', () => {
  const { elements } = setup('?expand=root');
  const toggle = elements.get('sortingTerminalProductCategoryToggle');
  toggle.listeners.click();
  assert.equal(toggle.textContent, '查看分拣任务分类');
  assert.equal(toggle.attributes['aria-pressed'], 'true');
  assert.equal(groupLabels(elements).length, 14);
  assert.equal(groupLabels(elements).includes('食用油-动物油'), true);
  assert.equal(elements.get('sortingTerminalProductGroups').children[0].children[1].hidden, false);
  toggle.listeners.click();
  assert.equal(toggle.textContent, '查看全部分类');
  assert.equal(toggle.attributes['aria-pressed'], 'false');
  assert.equal(groupLabels(elements).length, 11);
  assert.equal(elements.get('sortingTerminalProductGroups').children[0].children[1].hidden, false);
});

test('分类显示模式与左侧分类和关键词查询同时生效', () => {
  const { elements } = setup();
  selectCategory(elements, 'oil');
  assert.deepEqual(groupLabels(elements), ['食用油-植物油']);
  elements.get('sortingTerminalProductCategoryToggle').listeners.click();
  assert.deepEqual(groupLabels(elements), ['食用油-植物油', '食用油-动物油']);
  const keyword = elements.get('sortingTerminalProductKeyword');
  keyword.value = '动物';
  keyword.listeners.input();
  assert.deepEqual(groupLabels(elements), ['食用油-动物油']);
  elements.get('sortingTerminalProductCategoryToggle').listeners.click();
  assert.deepEqual(groupLabels(elements), []);
  assert.equal(elements.get('sortingTerminalProductGroups').children[0].textContent, '暂无匹配的商品分类');
  keyword.value = '';
  keyword.listeners.input();
  assert.deepEqual(groupLabels(elements), ['食用油-植物油']);
});

test('从无任务的分类切回任务模式时自动选中全部，避免停留在隐藏分类', () => {
  const { elements } = setup();
  const toggle = elements.get('sortingTerminalProductCategoryToggle');
  toggle.listeners.click();
  selectCategory(elements, 'seasoning');
  assert.deepEqual(groupLabels(elements), ['调料类']);
  toggle.listeners.click();
  assert.equal(groupLabels(elements).length, 11);
  const active = elements.get('sortingTerminalProductCategories').children
    .find((button) => button.attributes['aria-current'] === 'true');
  assert.equal(active.dataset.category, 'all');
});
