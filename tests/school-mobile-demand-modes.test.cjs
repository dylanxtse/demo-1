const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { loadApp, root } = require('./helpers/app-context.cjs');

function mobileApp() {
  const context = loadApp({ services: [
    'assets/js/data/school-reference-data.js',
    'assets/js/services/school-canteen-config-service.js',
    'assets/js/services/school-recipe-service.js',
    'assets/js/services/school-recipe-attendance-service.js',
    'assets/js/services/school-order-service.js',
    'assets/js/services/operations-service.js',
    'assets/js/services/school-recipe-demand-service.js',
    'assets/js/services/school-recipe-auxiliary-direct-service.js'
  ] }).context;
  const listeners = {};
  const app = {
    innerHTML: '',
    addEventListener(type, listener) { (listeners[type] ||= []).push(listener); },
    querySelectorAll() { return []; },
    querySelector() { return null; },
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
    (listeners[type] || []).forEach((listener) => listener({ target }));
  };
  return { context, app, dispatch };
}

test('两个手机入口先选择填报方式，人数流程与数量流程均可进入确认页', () => {
  const { context, app, dispatch } = mobileApp();
  const date = context.SchoolRecipeService.getAll()[0].date;
  const canteen = context.SchoolCanteenConfigService.getCanteen('第一食堂');

  dispatch('click', 'open-attendance');
  assert.match(app.innerHTML, /选择填报方式/);
  assert.match(app.innerHTML, /<strong>就餐人数填报<\/strong>/);
  assert.match(app.innerHTML, /<strong>采购数量填报<\/strong>/);
  dispatch('click', 'choose-entry-mode', { entryMode: 'people' });
  assert.match(app.innerHTML, /餐次就餐人数/);
  dispatch('click', 'back');

  dispatch('click', 'open-attendance');
  dispatch('click', 'choose-entry-mode', { entryMode: 'quantity' });
  assert.match(app.innerHTML, /school-mobile-direct-page/);
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
  assert.match(app.innerHTML, /食材需求确认/);
  assert.match(app.innerHTML, /<h2>用料日期<\/h2><div class="school-mobile-confirm-date-list">/);
  assert.doesNotMatch(app.innerHTML, /<span>填报方式<\/span><strong>采购数量填报<\/strong>/);
  assert.match(app.innerHTML, /data-action="back">返回<\/button>/);
  const mealTotal = (row, quantity) => '¥' + (row.orderPrice * quantity).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  assert.ok(app.innerHTML.includes(`<span>合计金额</span><strong>${mealTotal(ingredient, 3)}</strong>`));
  dispatch('click', 'select-direct-meal', { mealKey: secondMeal.key });
  assert.ok(app.innerHTML.includes(`<span>合计金额</span><strong>${mealTotal(secondMeal.rows[0], 2)}</strong>`));
  dispatch('click', 'back');
  assert.match(app.innerHTML, /data-action="direct-quantity-input"[^>]*value="3"/);
  dispatch('click', 'back');

  dispatch('click', 'open-auxiliary-attendance');
  assert.match(app.innerHTML, /商品需求填报/);
  dispatch('click', 'choose-entry-mode', { entryMode: 'people' });
  assert.match(app.innerHTML, /餐次就餐人数/);
  dispatch('click', 'back');

  dispatch('click', 'open-auxiliary-attendance');
  dispatch('click', 'choose-entry-mode', { entryMode: 'quantity' });
  const product = context.SchoolRecipeAuxiliaryDirectService.buildPreview(date, canteen).meals[0].rows[0];
  assert.doesNotMatch(app.innerHTML, /data-action="open-direct-detail"/);
  dispatch('input', 'direct-quantity-input', { quantityKey: product.key }, '2.5');
  dispatch('click', 'direct-continue');
  assert.match(app.innerHTML, /商品需求确认/);
  assert.match(app.innerHTML, /合计金额/);
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

test('手机端商品采购数量确认后生成需求记录与订单', async () => {
  const { context, app, dispatch } = mobileApp();
  const date = context.SchoolRecipeService.getAll()[0].date;
  const canteen = context.SchoolCanteenConfigService.getCanteen('第一食堂');
  const row = context.SchoolRecipeAuxiliaryDirectService.buildPreview(date, canteen).meals[0].rows[0];
  const before = context.DemoStore.get('recipeDemandRecords').length;
  dispatch('click', 'open-auxiliary-attendance');
  dispatch('click', 'choose-entry-mode', { entryMode: 'quantity' });
  dispatch('input', 'direct-quantity-input', { quantityKey: row.key }, '2.5');
  dispatch('click', 'direct-continue');
  dispatch('click', 'direct-submit');
  await new Promise((resolve) => setTimeout(resolve, 20));
  const records = context.DemoStore.get('recipeDemandRecords');
  assert.equal(records.length, before + 1);
  assert.equal(records.at(-1).entryMode, 'quantity');
  assert.equal(records.at(-1).demandType, 'auxiliary');
  assert.equal(records.at(-1).auxiliary, true);
  assert.deepEqual(Array.from(records.at(-1).dateSummaries[0].filledMeals), ['早餐']);
  assert.ok(records.at(-1).orders.length);
  assert.match(app.innerHTML, /需求已提交并生成订单/);
  dispatch('click', 'open-profile-submissions');
  const record = records.at(-1);
  const cardStart = app.innerHTML.indexOf(record.recordNo);
  const card = app.innerHTML.slice(cardStart, app.innerHTML.indexOf('</article>', cardStart));
  assert.match(card, /商品需求填报-采购数量填报/);
  assert.match(card, /school-mobile-record-metrics is-quantity/);
  assert.doesNotMatch(card, /总人次/);
  dispatch('click', 'record', { recordId: record.id });
  assert.match(app.innerHTML, /<span>填报类型<\/span><strong>商品需求填报<\/strong>/);
  assert.match(app.innerHTML, /<span>填报方式<\/span><strong>采购数量填报<\/strong>/);
  assert.match(app.innerHTML, /school-mobile-detail-date-meals">早餐<\/span>/);
  assert.doesNotMatch(app.innerHTML, /人次 ·/);

  const legacy = { ...record, dateSummaries: record.dateSummaries.map(({ filledMeals, ...summary }) => summary) };
  context.DemoStore.replace('recipeDemandRecords', records.map((item) => item.id === legacy.id ? legacy : item));
  dispatch('click', 'record', { recordId: legacy.id });
  assert.match(app.innerHTML, /school-mobile-detail-date-meals">早餐<\/span>/);
});
