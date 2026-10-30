const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { loadApp, root } = require('./helpers/app-context.cjs');

function mobileApp(options = {}) {
  const context = loadApp({ storage: options.storage || {}, services: [
    'assets/js/data/school-reference-data.js',
    'assets/js/services/school-canteen-config-service.js',
    'assets/js/services/school-recipe-service.js',
    'assets/js/services/school-recipe-attendance-service.js',
    'assets/js/services/school-order-service.js',
    'assets/js/utils/school-auxiliary-balance.js',
    'assets/js/services/operations-service.js',
    'assets/js/services/school-recipe-demand-service.js',
    'assets/js/services/school-recipe-auxiliary-direct-service.js',
    'assets/js/utils/recipe-delivery-rule.js'
  ] }).context;
  const listeners = {};
  const dateItems = new Map();
  const app = {
    innerHTML: '',
    addEventListener(type, listener) { (listeners[type] ||= []).push(listener); },
    querySelectorAll() { return []; },
    querySelector(selector) {
      const match = selector.match(/\.school-mobile-date-strip-quantity \.school-mobile-date-item\[data-date="(\d{4}-\d{2}-\d{2})"\]/);
      if (!match) return null;
      const date = match[1];
      if (!dateItems.has(date)) {
        const itemMatch = app.innerHTML.match(new RegExp('<button type="button" class="([^"]*)" data-action="select-date" data-date="' + date + '" aria-label="([^"]*)" title="([^"]*)"'));
        const classes = new Set((itemMatch?.[1] || 'school-mobile-date-item is-published').split(/\s+/));
        const attributes = { 'aria-label': itemMatch?.[2] || '', title: itemMatch?.[3] || '' };
        dateItems.set(date, {
          classList: {
            add(name) { classes.add(name); },
            remove(name) { classes.delete(name); },
            contains(name) { return classes.has(name); }
          },
          getAttribute(name) { return attributes[name] ?? null; },
          setAttribute(name, value) { attributes[name] = String(value); },
          get title() { return attributes.title; },
          set title(value) { attributes.title = String(value); }
        });
      }
      return dateItems.get(date);
    },
    contains() { return true; }
  };
  context.document = { getElementById(id) { return id === 'schoolMobileApp' ? app : null; } };
  context.addEventListener = () => {};
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/pages/school-mobile.js'), 'utf8'), context);
  const dispatch = (type, action, dataset = {}, value = '', overrides = {}) => {
    const target = {
      dataset: { action, ...dataset }, value,
      closest(selector) { return selector === '[data-action]' ? this : null; },
      matches() { return false; },
      ...overrides
    };
    (listeners[type] || []).forEach((listener) => listener({ target, preventDefault() {} }));
  };
  return { context, app, dispatch, listeners, dateItems };
}

test('无菜谱日期同时禁用菜谱与干调需求填报入口', () => {
  const { context, app, dispatch } = mobileApp();
  const noMenuDate = '2026-09-06';
  assert.equal(context.SchoolRecipeService.getAll().some((menu) => menu.date === noMenuDate), false);

  dispatch('click', 'tab', { tab: 'recipe' });
  dispatch('click', 'select-date', { date: noMenuDate });
  assert.match(app.innerHTML, /class="school-mobile-recipe-demand-float is-disabled" data-action="open-attendance" disabled aria-disabled="true">菜谱需求填报/);
  assert.match(app.innerHTML, /class="school-mobile-recipe-demand-float school-mobile-recipe-demand-auxiliary is-disabled" data-action="open-auxiliary-attendance" disabled aria-disabled="true">干调需求填报/);

  dispatch('click', 'open-auxiliary-attendance');
  assert.doesNotMatch(app.innerHTML, /school-mobile-entry-mode-sheet/);

  const menuDate = context.SchoolRecipeService.getAll()[0].date;
  dispatch('click', 'select-date', { date: menuDate });
  assert.match(app.innerHTML, /data-action="open-auxiliary-attendance">干调需求填报/);
  dispatch('click', 'open-auxiliary-attendance');
  assert.match(app.innerHTML, /school-mobile-entry-mode-sheet/);
});

test('两个手机入口先选择填报方式，干调数量填写和确认分两页', () => {
  const { context, app, dispatch } = mobileApp();
  const date = context.SchoolRecipeService.getAll()[0].date;
  const canteen = context.SchoolCanteenConfigService.getCanteen('第一食堂');

  dispatch('click', 'open-attendance');
  assert.match(app.innerHTML, /<h2>菜谱需求填报<\/h2>/);
  assert.match(app.innerHTML, /<strong>就餐人数填报<\/strong>/);
  assert.match(app.innerHTML, /<strong>商品数量填报<\/strong>/);
  assert.doesNotMatch(app.innerHTML, /school-mobile-entry-mode-intro|填写各餐次就餐人数|直接填写各商品的采购数量/);
  dispatch('click', 'choose-entry-mode', { entryMode: 'people' });
  assert.match(app.innerHTML, /餐次就餐人数/);
  dispatch('click', 'back');

  dispatch('click', 'open-attendance');
  dispatch('click', 'choose-entry-mode', { entryMode: 'quantity' });
  assert.match(app.innerHTML, /school-mobile-direct-page/);
  assert.match(app.innerHTML, /data-action="direct-quantity-input"[^>]*value="">/);
  assert.doesNotMatch(app.innerHTML, /data-action="direct-quantity-input"[^>]*placeholder=/);
  assert.doesNotMatch(app.innerHTML, /<span>填报方式<\/span><strong>采购数量<\/strong>/);
  assert.match(app.innerHTML, /school-mobile-direct-row-details/);
  assert.match(app.innerHTML, /school-mobile-direct-row-purchase/);
  assert.doesNotMatch(app.innerHTML, /school-mobile-direct-subtotal/);
  assert.doesNotMatch(app.innerHTML, /school-mobile-direct-field-label">采购量/);
  const ingredient = context.SchoolRecipeDemandService.buildDirectPreview(date, {}, { canteen }).meals[0].rows[0];
  assert.doesNotMatch(app.innerHTML, /data-action="open-direct-detail"/);
  dispatch('input', 'direct-quantity-input', { quantityKey: ingredient.key }, '2');
  const quantityInput = { dataset: { quantityKey: ingredient.key }, value: '2', step: '1', closest() { return null; } };
  dispatch('click', 'direct-quantity-step', { step: '1' }, '', {
    closest(selector) {
      if (selector === '[data-action]') return this;
      if (selector === '.school-mobile-direct-input-wrap') return { querySelector() { return quantityInput; } };
      return null;
    }
  });
  assert.equal(quantityInput.value, '3');
  const secondMeal = context.SchoolRecipeDemandService.buildDirectPreview(date, {}, { canteen }).meals.slice(1).find((meal) => meal.rows.length);
  assert.ok(secondMeal);
  dispatch('click', 'select-direct-meal', { mealKey: secondMeal.key });
  dispatch('input', 'direct-quantity-input', { quantityKey: secondMeal.rows[0].key }, '2');
  dispatch('click', 'direct-continue');
  assert.match(app.innerHTML, /菜谱需求确认/);
  assert.match(app.innerHTML, /<h2>用料日期<\/h2><div class="school-mobile-confirm-date-list">/);
  assert.doesNotMatch(app.innerHTML, /aria-label="用料日期 [^"]* 已填报"|<small>已填报<\/small>/);
  assert.doesNotMatch(app.innerHTML, /<span>填报方式<\/span><strong>商品数量填报<\/strong>/);
  assert.match(app.innerHTML, /data-action="back">返回<\/button>/);
  const mealTotal = (row, quantity) => '¥' + (row.orderPrice * quantity).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  assert.ok(app.innerHTML.includes(`<span>合计金额</span><strong>${mealTotal(ingredient, 3)}</strong>`));
  dispatch('click', 'select-direct-meal', { mealKey: secondMeal.key });
  assert.ok(app.innerHTML.includes(`<span>合计金额</span><strong>${mealTotal(secondMeal.rows[0], 2)}</strong>`));
  dispatch('click', 'back');
  assert.match(app.innerHTML, /data-action="direct-quantity-input"[^>]*value="3"/);
  dispatch('click', 'back');

  dispatch('click', 'open-auxiliary-attendance');
  assert.match(app.innerHTML, /<h2>干料需求填报<\/h2>/);
  assert.doesNotMatch(app.innerHTML, /school-mobile-entry-mode-intro|填写各餐次就餐人数|直接填写各商品的采购数量/);
  dispatch('click', 'choose-entry-mode', { entryMode: 'people' });
  assert.match(app.innerHTML, /餐次就餐人数/);
  dispatch('click', 'back');

  dispatch('click', 'open-auxiliary-attendance');
  assert.match(app.innerHTML, /<strong>商品数量填报<\/strong>/);
  dispatch('click', 'choose-entry-mode', { entryMode: 'quantity' });
  const product = context.SchoolRecipeAuxiliaryDirectService.catalogProducts(canteen, true)[0];
  assert.match(app.innerHTML, /school-mobile-auxiliary-simple-page/);
  assert.match(app.innerHTML, /school-mobile-auxiliary-products-panel/);
  assert.doesNotMatch(app.innerHTML, /school-mobile-date-strip-quantity|school-mobile-direct-dish-group/);
  assert.ok(app.innerHTML.includes(`data-quantity-key="${product.code}"`));
  dispatch('input', 'direct-quantity-input', { quantityKey: product.code }, '2');
  dispatch('click', 'direct-continue');
  assert.match(app.innerHTML, /school-mobile-auxiliary-simple-confirm-page/);
  assert.match(app.innerHTML, /期望送达时间/);
  dispatch('click', 'back');
  assert.match(app.innerHTML, new RegExp(`data-quantity-key="${product.code}"[^>]*value="2"`));
});

test('菜谱数量填报按当前日期统计已填写商品并支持查看和移除', () => {
  const { context, app, dispatch, dateItems } = mobileApp();
  const date = context.SchoolRecipeService.getAll()[0].date;
  const canteen = context.SchoolCanteenConfigService.getCanteen('第一食堂');
  const preview = context.SchoolRecipeDemandService.buildDirectPreview(date, {}, { canteen });
  const meal = preview.meals.find((item) => item.rows.length);
  const first = meal.rows[0];
  const second = meal.rows.find((row) => row.productCode !== first.productCode);
  assert.ok(second);

  dispatch('click', 'open-attendance');
  dispatch('click', 'choose-entry-mode', { entryMode: 'quantity' });
  assert.match(app.innerHTML, /data-action="direct-filled-detail" disabled><span>已填写<\/span><strong data-direct-filled-count>0 项食材/);

  dispatch('input', 'direct-quantity-input', { quantityKey: first.key }, '2');
  const dateItem = dateItems.get(date);
  assert.ok(dateItem.classList.contains('is-complete'));
  assert.match(dateItem.getAttribute('aria-label'), /已填写$/);
  dispatch('input', 'direct-quantity-input', { quantityKey: second.key }, '3');
  dispatch('click', 'select-direct-meal', { mealKey: meal.key });
  assert.match(app.innerHTML, /data-action="direct-filled-detail"><span>已填写<\/span><strong data-direct-filled-count>2 项食材/);

  dispatch('click', 'direct-filled-detail');
  assert.match(app.innerHTML, /school-mobile-auxiliary-filled-backdrop/);
  assert.match(app.innerHTML, /role="dialog" aria-modal="false" aria-label="商品明细"/);
  assert.ok(app.innerHTML.includes(first.productName));
  assert.ok(app.innerHTML.includes(second.productName));
  assert.match(app.innerHTML, /<small>共¥[\d,]+\.\d{2}<\/small>/);
  assert.match(app.innerHTML, /data-action="remove-direct-filled-product"/);

  dispatch('click', 'remove-direct-filled-product', { productCode: first.productCode });
  assert.match(app.innerHTML, /data-direct-filled-count>1 项食材/);
  const detailStart = app.innerHTML.indexOf('school-mobile-auxiliary-filled-sheet');
  const detail = app.innerHTML.slice(detailStart, app.innerHTML.indexOf('</section>', detailStart));
  assert.ok(detailStart >= 0);
  assert.equal(detail.includes(first.productName), false);
  assert.equal(detail.includes(second.productName), true);
  const scope = `${canteen.id || canteen.name}::${date}`;
  assert.equal(context.AppStorage.read('school-recipe-demand-direct-drafts-v1', {})[scope][first.key], undefined);

  dispatch('click', 'remove-direct-filled-product', { productCode: second.productCode });
  assert.doesNotMatch(app.innerHTML, /school-mobile-auxiliary-filled-backdrop/);
  assert.match(app.innerHTML, /data-action="direct-filled-detail" disabled><span>已填写<\/span><strong data-direct-filled-count>0 项食材/);
  assert.match(app.innerHTML, new RegExp('data-date="' + date + '" aria-label="[^"]*未填写" title="未填写"'));
  assert.equal(context.AppStorage.read('school-recipe-demand-direct-drafts-v1', {})[scope], undefined);
});

test('手机菜谱数量入口按菜品展示原料，并将同一商品按菜品分别填写', () => {
  const { context, app, dispatch } = mobileApp();
  const canteen = context.SchoolCanteenConfigService.getCanteen('第一食堂');
  const date = context.SchoolRecipeService.getAll()[0].date;
  const preview = context.SchoolRecipeDemandService.buildDirectPreview(date, {}, { canteen });
  const breakfast = preview.meals.find((meal) => meal.key === 'breakfast');
  const sameProductRows = breakfast.rows.filter((row) => row.productCode === 'SP0300037');
  assert.equal(sameProductRows.length, 2);
  assert.notEqual(sameProductRows[0].dishName, sameProductRows[1].dishName);

  dispatch('click', 'open-attendance');
  assert.match(app.innerHTML, /<strong>商品数量填报<\/strong>/);
  dispatch('click', 'choose-entry-mode', { entryMode: 'quantity' });
  sameProductRows.forEach((row) => {
    assert.ok(app.innerHTML.includes(`data-dish-name="${row.dishName}"`));
    assert.ok(app.innerHTML.includes(`data-quantity-key="${row.key}"`));
    assert.ok(app.innerHTML.includes(`${row.dishName} ${row.productName} 采购量`));
  });
  assert.doesNotMatch(app.innerHTML, /<span>菜品<\/span>/);
  assert.doesNotMatch(app.innerHTML, /school-mobile-auxiliary-simple-page|school-mobile-auxiliary-products-panel/);

  dispatch('input', 'direct-quantity-input', { quantityKey: sameProductRows[0].key }, '2');
  dispatch('input', 'direct-quantity-input', { quantityKey: sameProductRows[1].key }, '3');
  dispatch('click', 'select-direct-meal', { mealKey: breakfast.key });
  assert.match(app.innerHTML, /data-direct-filled-count>2 项食材/);
  dispatch('click', 'direct-continue');
  assert.match(app.innerHTML, /菜谱需求确认/);
  assert.ok(app.innerHTML.includes(`<strong>5 ${sameProductRows[0].unit}</strong>`));
  assert.doesNotMatch(app.innerHTML, /school-mobile-auxiliary-simple-confirm-page/);

  dispatch('click', 'back');
  sameProductRows.forEach((row, index) => {
    const value = index === 0 ? 2 : 3;
    assert.match(app.innerHTML, new RegExp(`data-quantity-key="${row.key}"[^>]*value="${value}"`));
  });
});

test('手机干调商品数量可按名称或编号查询，并在明细中移除商品', () => {
  const { context, app, dispatch } = mobileApp();
  const canteen = context.SchoolCanteenConfigService.getCanteen('第一食堂');
  const products = context.SchoolRecipeAuxiliaryDirectService.catalogProducts(canteen, true);
  dispatch('click', 'open-auxiliary-attendance');
  dispatch('click', 'choose-entry-mode', { entryMode: 'quantity' });

  assert.match(app.innerHTML, /school-mobile-auxiliary-simple-search/);
  assert.equal((app.innerHTML.match(/class="school-mobile-direct-row"/g) || []).length, products.length);
  assert.match(app.innerHTML, /data-auxiliary-filled-count>0 种商品/);

  dispatch('input', 'direct-quantity-input', { quantityKey: products[0].code }, '2');
  dispatch('input', 'direct-quantity-input', { quantityKey: products[1].code }, '3');
  dispatch('input', 'auxiliary-search-input', {}, products[0].code);
  const submitSearch = () => dispatch('submit', '', {}, '', {
    matches(selector) { return selector === '[data-auxiliary-search-form]'; }
  });
  submitSearch();
  assert.ok(app.innerHTML.includes(`data-quantity-key="${products[0].code}"`));
  assert.ok(!app.innerHTML.includes(`data-quantity-key="${products[1].code}"`));
  assert.match(app.innerHTML, /data-auxiliary-filled-count>2 种商品/);

  dispatch('click', 'auxiliary-filled-detail');
  assert.match(app.innerHTML, /role="dialog" aria-modal="false" aria-label="商品明细"/);
  assert.ok(app.innerHTML.includes(`<strong>2 ${products[0].unit}</strong>`));
  assert.ok(app.innerHTML.includes(`<strong>3 ${products[1].unit}</strong>`));
  dispatch('click', 'remove-auxiliary-filled-product', { productCode: products[0].code });
  assert.match(app.innerHTML, /data-auxiliary-filled-count>1 种商品/);
  assert.doesNotMatch(app.innerHTML, new RegExp(`<strong>${products[0].name}</strong>`));
  assert.ok(app.innerHTML.includes(products[1].name));
});

test('移除最后一项手机干调商品后自动关闭明细弹层', () => {
  const { context, app, dispatch } = mobileApp();
  const canteen = context.SchoolCanteenConfigService.getCanteen('第一食堂');
  const product = context.SchoolRecipeAuxiliaryDirectService.catalogProducts(canteen, true)[0];
  dispatch('click', 'open-auxiliary-attendance');
  dispatch('click', 'choose-entry-mode', { entryMode: 'quantity' });
  dispatch('input', 'direct-quantity-input', { quantityKey: product.code }, '2');
  dispatch('click', 'auxiliary-filled-detail');
  assert.match(app.innerHTML, /school-mobile-auxiliary-filled-backdrop/);
  dispatch('click', 'remove-auxiliary-filled-product', { productCode: product.code });
  assert.doesNotMatch(app.innerHTML, /school-mobile-auxiliary-filled-backdrop/);
  assert.match(app.innerHTML, /data-auxiliary-filled-count>0 种商品/);
  assert.match(app.innerHTML, new RegExp(`data-quantity-key="${product.code}"[^>]*value=""`));
});

test('手机端人数填报读取Web默认干调商品，支持左滑移除和添加商品', () => {
  const canteen = 'canteen-004';
  const { context, app, dispatch, listeners } = mobileApp({ storage: {
    'school-recipe-auxiliary-default-products-v1': JSON.stringify({ [canteen]: ['aux-oil'] })
  } });
  const menu = context.SchoolRecipeService.getAll()[0];
  const firstMeal = menu.meals[0].key;
  context.DemoStore.replace('recipeDemandRecords', [{
    id: 'MOBILE-AUX-BALANCE-ENTRY', auxiliary: true, entryMode: 'people',
    canteenId: canteen, canteen: '第一食堂', dates: ['2026-09-01'],
    balanceRows: [{ productCode: 'SP0300030', unit: 'L', demandQty: 3, purchaseQty: 5 }]
  }]);
  dispatch('click', 'open-auxiliary-attendance');
  dispatch('click', 'choose-entry-mode', { entryMode: 'people' });

  assert.match(app.innerHTML, /data-action="open-auxiliary-products"/);
  assert.match(app.innerHTML, /data-auxiliary-id="aux-oil"/);
  assert.doesNotMatch(app.innerHTML, /data-auxiliary-id="aux-salt"/);
  assert.match(app.innerHTML, /aria-label="查看金龙鱼5L桶装油采购量明细，左滑可移除"/);
  assert.match(app.innerHTML, /class="school-mobile-demand-remove"[^>]*data-action="remove-auxiliary-product"[^>]*aria-hidden="true" tabindex="-1"/);

  dispatch('click', 'open-auxiliary-products');
  assert.doesNotMatch(app.innerHTML, /data-action="toggle-auxiliary-product-picker"[^>]*data-auxiliary-id="aux-oil"/);
  assert.match(app.innerHTML, /data-action="confirm-auxiliary-products" disabled>添加<\/button>/);
  dispatch('click', 'cancel-auxiliary-products');
  assert.match(app.innerHTML, /data-action="open-auxiliary-demand-detail"[^>]*data-auxiliary-id="aux-oil"/);
  dispatch('click', 'open-auxiliary-demand-detail', { auxiliaryId: 'aux-oil' });
  const detailTotals = app.innerHTML.slice(app.innerHTML.indexOf('school-mobile-demand-detail-total-auxiliary'),
    app.innerHTML.indexOf('school-mobile-demand-detail-total-auxiliary') + 450);
  assert.match(detailTotals, /<span>需求总量<\/span><strong>0\.71 桶<\/strong><\/div><div><span>上次结余<\/span><strong>0\.40<\/strong><\/div><div><span>采购总量<\/span><strong>1\.00 桶<\/strong>/);
  dispatch('click', 'close-sheet');

  const removeButtonAttributes = {};
  const removeButton = {
    setAttribute(name, value) { removeButtonAttributes[name] = value; },
    set tabIndex(value) { removeButtonAttributes.tabIndex = value; }
  };
  const swipeItemClasses = new Set();
  const swipeItem = {
    dataset: { demandSwipeKey: `2026-09-07::${firstMeal}::aux-oil` },
    classList: { toggle(name, enabled) { enabled ? swipeItemClasses.add(name) : swipeItemClasses.delete(name); } },
    querySelector() { return removeButton; }
  };
  const swipeTarget = {
    closest(selector) {
      if (selector === '[data-demand-swipe-item]') return swipeItem;
      return null;
    }
  };
  (listeners.pointerdown || []).forEach((listener) => listener({
    target: swipeTarget, pointerType: 'touch', clientX: 180, clientY: 24
  }));
  (listeners.pointerup || []).forEach((listener) => listener({ clientX: 120, clientY: 26 }));
  assert.ok(swipeItemClasses.has('is-swiped'));
  assert.equal(removeButtonAttributes['aria-hidden'], 'false');
  assert.equal(removeButtonAttributes.tabIndex, 0);
  dispatch('click', 'open-auxiliary-demand-detail', { auxiliaryId: 'aux-oil' });
  dispatch('click', 'remove-auxiliary-product', { auxiliaryId: 'aux-oil', auxiliaryMealKey: firstMeal }, '', {
    closest(selector) {
      if (selector === '[data-action]' || selector.includes('remove-auxiliary-product')) return this;
      if (selector === '.school-mobile-demand-swipe-item.is-swiped') return swipeItem;
      return null;
    }
  });
  assert.match(app.innerHTML, /请添加商品/);
  assert.match(app.innerHTML, /data-action="continue" disabled/);

  dispatch('click', 'open-auxiliary-products');
  assert.match(app.innerHTML, /aria-label="添加干调商品"/);
  assert.ok(app.innerHTML.includes('食盐'));
  assert.match(app.innerHTML, /data-action="toggle-all-auxiliary-product-picker"[^>]*>全选<\/button>/);
  assert.doesNotMatch(app.innerHTML, /SP0390001 · L · 已添加<\/small>/);
  const pickerOptions = [...app.innerHTML.matchAll(/<button type="button" class="school-mobile-demand-picker-option[^>]*data-action="toggle-auxiliary-product-picker"[^>]*>/g)].map((match) => match[0]);
  const selectableCount = pickerOptions.filter((option) => !/ disabled>/.test(option)).length;
  dispatch('click', 'toggle-all-auxiliary-product-picker');
  assert.equal((app.innerHTML.match(/data-action="toggle-auxiliary-product-picker"[^>]*aria-pressed="true"/g) || []).length, selectableCount);
  assert.match(app.innerHTML, /data-action="toggle-all-auxiliary-product-picker"[^>]*aria-pressed="true"[^>]*>取消全选<\/button>/);
  dispatch('click', 'toggle-all-auxiliary-product-picker');
  assert.doesNotMatch(app.innerHTML, /data-action="toggle-auxiliary-product-picker"[^>]*aria-pressed="true"/);
  dispatch('click', 'toggle-auxiliary-product-picker', { auxiliaryId: 'aux-salt' });
  dispatch('click', 'confirm-auxiliary-products');
  assert.match(app.innerHTML, /data-auxiliary-id="aux-salt"/);
  assert.doesNotMatch(app.innerHTML, /data-action="open-auxiliary-demand-detail"[^>]*data-auxiliary-id="aux-oil"/);

  const storedByMeal = context.AppStorage.read('school-recipe-auxiliary-selected-products-by-meal-v1', {});
  assert.deepEqual(Array.from(storedByMeal[canteen][firstMeal]), ['aux-salt']);
  const otherMeal = menu.meals.find((meal) => meal.key !== firstMeal);
  dispatch('click', 'select-attendance-meal', { mealKey: otherMeal.key });
  assert.match(app.innerHTML, /data-auxiliary-id="aux-oil"/);
});

test('手机端人数填报确认页按企业配置计算送达时间并隐藏该字段', async () => {
  const { context, app, dispatch } = mobileApp({ storage: {
    'school-recipe-auxiliary-default-products-v1': JSON.stringify({ 'canteen-004': ['aux-oil'] })
  } });
  context.DemoStore.updateSettings({ recipeDeliveryAdvanceDays: '2', recipeDeliveryTime: '06:45' });
  context.DemoStore.replace('recipeDemandRecords', [{
    id: 'MOBILE-AUX-BALANCE-CONFIRM', auxiliary: true, entryMode: 'people',
    canteenId: 'canteen-004', canteen: '第一食堂', dates: ['2026-09-01'],
    balanceRows: [{ productCode: 'SP0300030', unit: 'L', demandQty: 3, purchaseQty: 5 }]
  }]);
  dispatch('click', 'open-auxiliary-attendance');
  dispatch('click', 'choose-entry-mode', { entryMode: 'people' });
  dispatch('click', 'continue');

  assert.match(app.innerHTML, /school-mobile-confirm-page/);
  assert.match(app.innerHTML, /school-mobile-topbar-title">干调需求确认<\/strong>/);
  assert.match(app.innerHTML, /SP0300030<\/small><small class="school-mobile-demand-product-balance">上次结余：0\.40<\/small>/);
  assert.doesNotMatch(app.innerHTML, /<span>期望送达时间<\/span>|data-action="open-expected-at"/);
  const selectedDates = Array.from(app.innerHTML.matchAll(/class="school-mobile-confirm-date[^\"]*is-selected[^\"]*" data-action="confirm-date" data-date="([^"]+)"/g), (match) => match[1]);
  assert.ok(selectedDates.length > 0);
  const expectedAt = context.RecipeDeliveryRule.expectedAt(selectedDates);

  dispatch('click', 'submit-auxiliary-demand');
  await new Promise((resolve) => setTimeout(resolve, 20));
  const record = context.DemoStore.get('recipeDemandRecords').at(-1);
  assert.equal(record.expectedAt, expectedAt);
  const oilOrder = record.orders.map((item) => context.SchoolOrderService.get(item.orderId))
    .find((order) => order?.items?.some((item) => item.productCode === 'SP0300030'));
  assert.equal(oilOrder.items.find((item) => item.productCode === 'SP0300030').orderQty, 1);
});

test('菜谱人数填报确认页标题显示菜谱需求确认', () => {
  const { app, dispatch } = mobileApp();
  dispatch('click', 'open-attendance');
  dispatch('click', 'choose-entry-mode', { entryMode: 'people' });
  dispatch('click', 'fill-defaults');
  dispatch('click', 'continue');
  assert.match(app.innerHTML, /school-mobile-topbar-title">菜谱需求确认<\/strong>/);
});

test('按人员类型拆单时在餐次下切换数量输入，并保留各类型的填写值', () => {
  const { context, app, dispatch } = mobileApp();
  context.DemoStore.updateSettings({ splitOrderByPersonType: true });
  const date = context.SchoolRecipeService.getAll()[0].date;
  const canteen = context.SchoolCanteenConfigService.getCanteen('第一食堂');
  const preview = context.SchoolRecipeDemandService.buildDirectPreview(date, {}, { canteen });
  const [first, second] = preview.participants;
  assert.ok(first && second);
  const row = preview.meals[0].rows[0];

  dispatch('click', 'open-attendance');
  dispatch('click', 'choose-entry-mode', { entryMode: 'quantity' });
  assert.match(app.innerHTML, /aria-label="人员类型切换"/);
  assert.match(app.innerHTML, new RegExp(`data-action="direct-quantity-input" data-quantity-key="${row.key}::${first.key}"[^>]*value="">`));
  assert.doesNotMatch(app.innerHTML, /data-action="direct-quantity-input"[^>]*placeholder=/);
  assert.ok(app.innerHTML.includes(first.orderTag));
  assert.ok(app.innerHTML.includes(second.orderTag));
  assert.doesNotMatch(app.innerHTML, /school-mobile-direct-subtotal/);
  assert.ok(app.innerHTML.indexOf('aria-label="餐次切换"') < app.innerHTML.indexOf('aria-label="人员类型切换"'));
  assert.ok(app.innerHTML.includes(`data-quantity-key="${row.key}::${first.key}"`));
  assert.ok(!app.innerHTML.includes(`data-quantity-key="${row.key}::${second.key}"`));
  dispatch('input', 'direct-quantity-input', { quantityKey: `${row.key}::${first.key}` }, '4');

  dispatch('click', 'select-direct-participant', { participantKey: second.key });
  assert.ok(app.innerHTML.includes(`data-quantity-key="${row.key}::${second.key}"`));
  assert.ok(!app.innerHTML.includes(`data-quantity-key="${row.key}::${first.key}"`));
  dispatch('input', 'direct-quantity-input', { quantityKey: `${row.key}::${second.key}` }, '3');

  dispatch('click', 'select-direct-participant', { participantKey: first.key });
  assert.ok(app.innerHTML.includes(`data-quantity-key="${row.key}::${first.key}"`));
  assert.match(app.innerHTML, /data-action="direct-quantity-input"[^>]*value="4"/);
  dispatch('click', 'select-direct-participant', { participantKey: second.key });
  assert.match(app.innerHTML, /data-action="direct-quantity-input"[^>]*value="3"/);
  dispatch('input', 'direct-quantity-input', { quantityKey: `${row.key}::${second.key}` }, '');
  dispatch('click', 'select-direct-participant', { participantKey: first.key });
  dispatch('click', 'select-direct-participant', { participantKey: second.key });
  assert.match(app.innerHTML, new RegExp(`data-action="direct-quantity-input" data-quantity-key="${row.key}::${second.key}"[^>]*value="">`));
});

for (const splitOrderByMeal of [true, false]) {
  test(`采购数量确认页按人员类型拆分，餐次拆分=${splitOrderByMeal}`, () => {
    const { context, app, dispatch } = mobileApp();
    context.DemoStore.updateSettings({ splitOrderByPersonType: true, splitOrderByMeal });
    const date = context.SchoolRecipeService.getAll()[0].date;
    const canteen = context.SchoolCanteenConfigService.getCanteen('第一食堂');
    const preview = context.SchoolRecipeDemandService.buildDirectPreview(date, {}, { canteen });
    const [firstPerson, secondPerson] = preview.participants;
    const [firstMeal, secondMeal] = preview.meals.filter((meal) => meal.rows.length);
    assert.ok(firstPerson && secondPerson && firstMeal && secondMeal);
    const [firstRow, secondRow] = [firstMeal.rows[0], secondMeal.rows[0]];
    const money = (value) => '¥' + value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const expectTotal = (amount) => assert.ok(app.innerHTML.includes(`<span>合计金额</span><strong>${money(amount)}</strong>`));

    dispatch('click', 'open-attendance');
    dispatch('click', 'choose-entry-mode', { entryMode: 'quantity' });
    dispatch('input', 'direct-quantity-input', { quantityKey: `${firstRow.key}::${firstPerson.key}` }, '2');
    dispatch('click', 'select-direct-participant', { participantKey: secondPerson.key });
    dispatch('input', 'direct-quantity-input', { quantityKey: `${firstRow.key}::${secondPerson.key}` }, '3');
    dispatch('click', 'select-direct-meal', { mealKey: secondMeal.key });
    dispatch('input', 'direct-quantity-input', { quantityKey: `${secondRow.key}::${secondPerson.key}` }, '5');
    dispatch('click', 'select-direct-participant', { participantKey: firstPerson.key });
    dispatch('input', 'direct-quantity-input', { quantityKey: `${secondRow.key}::${firstPerson.key}` }, '4');
    dispatch('click', 'direct-continue');

    assert.match(app.innerHTML, /school-mobile-direct-confirm-page/);
    assert.match(app.innerHTML, /aria-label="人员类型切换"/);
  assert.match(app.innerHTML, /<small>共¥[\d,]+\.\d{2}<\/small>/);
    assert.equal(app.innerHTML.includes('aria-label="餐次切换"'), splitOrderByMeal);
    expectTotal(firstRow.orderPrice * 2 + (splitOrderByMeal ? 0 : secondRow.orderPrice * 4));
    dispatch('click', 'select-direct-participant', { participantKey: secondPerson.key });
    expectTotal(firstRow.orderPrice * 3 + (splitOrderByMeal ? 0 : secondRow.orderPrice * 5));
    if (splitOrderByMeal) {
      dispatch('click', 'select-direct-meal', { mealKey: secondMeal.key });
      expectTotal(secondRow.orderPrice * 5);
    }
  });
}

test('企业端不拆分餐次和人员类型时，确认页合并商品和金额', () => {
  const { context, app, dispatch } = mobileApp();
  context.DemoStore.updateSettings({ splitOrderByPersonType: false, splitOrderByMeal: false });
  const date = context.SchoolRecipeService.getAll()[0].date;
  const canteen = context.SchoolCanteenConfigService.getCanteen('第一食堂');
  const meals = context.SchoolRecipeDemandService.buildDirectPreview(date, {}, { canteen }).meals.filter((meal) => meal.rows.length);
  const [firstMeal, secondMeal] = meals;
  assert.ok(firstMeal && secondMeal);
  dispatch('click', 'open-attendance');
  dispatch('click', 'choose-entry-mode', { entryMode: 'quantity' });
  dispatch('input', 'direct-quantity-input', { quantityKey: firstMeal.rows[0].key }, '2');
  dispatch('click', 'select-direct-meal', { mealKey: secondMeal.key });
  dispatch('input', 'direct-quantity-input', { quantityKey: secondMeal.rows[0].key }, '4');
  dispatch('click', 'direct-continue');
  assert.match(app.innerHTML, /school-mobile-direct-confirm-page/);
  assert.doesNotMatch(app.innerHTML, /aria-label="餐次切换"|aria-label="人员类型切换"/);
  const amount = firstMeal.rows[0].orderPrice * 2 + secondMeal.rows[0].orderPrice * 4;
  const display = '¥' + amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  assert.ok(app.innerHTML.includes(`<span>合计金额</span><strong>${display}</strong>`));
});

test('手机端干调商品数量填报确认并生成干调需求订单', async () => {
  const { context, app, dispatch } = mobileApp();
  const canteen = context.SchoolCanteenConfigService.getCanteen('第一食堂');
  const product = context.SchoolRecipeAuxiliaryDirectService.catalogProducts(canteen)[0];
  const before = context.DemoStore.get('recipeDemandRecords').length;
  dispatch('click', 'open-auxiliary-attendance');
  dispatch('click', 'choose-entry-mode', { entryMode: 'quantity' });
  assert.ok(app.innerHTML.includes(`data-quantity-key="${product.code}"`));
  assert.doesNotMatch(app.innerHTML, /用料日期|school-mobile-date-strip/);
  dispatch('input', 'direct-quantity-input', { quantityKey: product.code }, '2');
  dispatch('click', 'direct-continue');
  assert.match(app.innerHTML, /school-mobile-auxiliary-simple-confirm-page/);
  assert.match(app.innerHTML, /data-action="open-expected-at"/);
  dispatch('click', 'open-expected-at');
  const laterDate = new Date();
  laterDate.setDate(laterDate.getDate() + 3);
  const deliveryDate = laterDate.toISOString().slice(0, 10);
  dispatch('click', 'expected-at-date', { date: deliveryDate });
  dispatch('click', 'expected-at-time-value', { timePart: 'hour', timeValue: '09' });
  dispatch('click', 'confirm-expected-at');
  dispatch('click', 'direct-submit');
  await new Promise((resolve) => setTimeout(resolve, 20));
  const records = context.DemoStore.get('recipeDemandRecords');
  const record = records.at(-1);
  assert.equal(records.length, before + 1);
  assert.equal(record.entryMode, 'quantity');
  assert.equal(record.demandType, 'auxiliary');
  assert.equal(record.auxiliary, true);
  assert.equal(record.orderMode, 'simple');
  assert.equal(record.expectedAt, `${deliveryDate} 09:30:00`);
  assert.equal(record.orders.length, 1);
  assert.ok(record.orders.every((order) => !order.mealKey && !order.mealName));
  assert.match(app.innerHTML, /需求已提交并生成订单/);
});

test('手机端干调旧日期与餐次草稿汇成商品总量，提交后清空旧草稿', async () => {
  const { context, app, dispatch } = mobileApp();
  const service = context.SchoolRecipeAuxiliaryDirectService;
  const canteen = context.SchoolCanteenConfigService.getCanteen('第一食堂');
  const firstDate = '2026-09-16';
  const secondDate = '2026-09-17';
  const first = service.buildPreview(firstDate, canteen).meals;
  const second = service.buildPreview(secondDate, canteen).meals;
  const code = first[0].rows[0].productCode;
  service.writeDraft(firstDate, canteen, { [first[0].rows[0].key]: '2', [first[1].rows[0].key]: '3' });
  service.writeDraft(secondDate, canteen, { [second[0].rows[0].key]: '4' });
  dispatch('click', 'open-auxiliary-attendance');
  dispatch('click', 'choose-entry-mode', { entryMode: 'quantity' });
  assert.ok(app.innerHTML.includes(`data-quantity-key="${code}"`));
  assert.match(app.innerHTML, /data-action="direct-quantity-input"[^>]*value="9"/);
  assert.doesNotMatch(app.innerHTML, /用料日期|school-mobile-date-strip/);
  dispatch('click', 'direct-continue');
  assert.match(app.innerHTML, /school-mobile-auxiliary-simple-confirm-page/);
  dispatch('click', 'open-expected-at');
  dispatch('click', 'confirm-expected-at');
  dispatch('click', 'direct-submit');
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.deepEqual(Array.from(service.readNoMealFilledDates(canteen)), []);
  const record = context.DemoStore.get('recipeDemandRecords').at(-1);
  assert.equal(record.orderMode, 'simple');
  assert.equal(record.orders.length, 1);
  const order = context.SchoolOrderService.get(record.orders[0].orderId);
  assert.equal(order.items.find((item) => item.productCode === code).orderQty, 9);
});

test('菜谱人数填报只展示食谱关联商品，不提供手动添加商品', () => {
  const { context, app, dispatch } = mobileApp();
  const menu = context.SchoolRecipeService.getAll()[0];
  const canteen = context.SchoolCanteenConfigService.getCanteen('第一食堂');
  const participants = context.SchoolRecipeAttendanceService.participantsFor(canteen);
  const meals = Object.fromEntries(menu.meals.map((meal) => [meal.key, Object.fromEntries(participants.map((participant) => [
    participant.key,
    meal.key === menu.meals[0].key ? 1 : 0
  ]))]));
  context.SchoolRecipeAttendanceService.save(menu.date, meals, menu.version, canteen);

  dispatch('click', 'open-attendance');
  dispatch('click', 'choose-entry-mode', { entryMode: 'people' });
  const calculation = context.SchoolRecipeAttendanceService.calculate(menu, context.SchoolRecipeAttendanceService.get(menu.date, canteen), { canteen, participants });
  const meal = calculation.mealRows[0];
  const calculatedRow = meal.rows.find((row) => row.mappingStatus === '已关联' && Number(row.totalQty) > 0);
  const unrelatedProduct = context.SchoolOrderService.getProductCatalog().find((product) => !meal.rows.some((row) => row.productCode === product.code));
  assert.ok(calculatedRow);
  assert.ok(unrelatedProduct);
  assert.match(app.innerHTML, /school-mobile-demand-toolbar/);
  assert.match(app.innerHTML, /data-demand-swipe-item/);
  assert.match(app.innerHTML, /data-action="remove-attendance-demand-product"/);
  assert.match(app.innerHTML, new RegExp(`data-demand-key="${calculatedRow.key}"`));
  assert.doesNotMatch(app.innerHTML, /data-action="add-attendance-demand-products"|attendance-demand-quantity|school-mobile-demand-row-manual|添加商品/);
  assert.equal(app.innerHTML.includes(`data-product-code="${unrelatedProduct.code}"`), false);

  dispatch('click', 'add-attendance-demand-products');
  assert.doesNotMatch(app.innerHTML, /school-mobile-demand-product-picker-sheet|aria-label="添加商品"/);

  const scope = [canteen.id || canteen.name, menu.date, meal.key].join('::');
  dispatch('click', 'remove-attendance-demand-product', {
    menuDate: menu.date,
    demandMealKey: meal.key,
    demandRowKey: calculatedRow.key
  });
  const edit = context.AppStorage.read('school-mobile-attendance-demand-edits-v1', {})[scope];
  assert.deepEqual(Array.from(edit.removedProductKeys), [calculatedRow.key]);
  assert.equal(edit.addedProducts, undefined);
});
