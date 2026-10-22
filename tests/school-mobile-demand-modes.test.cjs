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
    'assets/js/services/school-recipe-auxiliary-direct-service.js',
    'assets/js/utils/recipe-delivery-rule.js'
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
    (listeners[type] || []).forEach((listener) => listener({ target, preventDefault() {} }));
  };
  return { context, app, dispatch, listeners };
}

test('两个手机入口先选择填报方式，干调数量填写和确认分两页', () => {
  const { context, app, dispatch } = mobileApp();
  const date = context.SchoolRecipeService.getAll()[0].date;
  const canteen = context.SchoolCanteenConfigService.getCanteen('第一食堂');

  dispatch('click', 'open-attendance');
  assert.match(app.innerHTML, /<h2>菜谱需求填报<\/h2>/);
  assert.match(app.innerHTML, /<strong>就餐人数填报<\/strong>/);
  assert.match(app.innerHTML, /<strong>采购数量填报<\/strong>/);
  assert.doesNotMatch(app.innerHTML, /school-mobile-entry-mode-intro|填写各餐次就餐人数|直接填写各商品的采购数量/);
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
  assert.match(app.innerHTML, /<h2>干料需求填报<\/h2>/);
  assert.doesNotMatch(app.innerHTML, /school-mobile-entry-mode-intro|填写各餐次就餐人数|直接填写各商品的采购数量/);
  dispatch('click', 'choose-entry-mode', { entryMode: 'people' });
  assert.match(app.innerHTML, /餐次就餐人数/);
  dispatch('click', 'back');

  dispatch('click', 'open-auxiliary-attendance');
  dispatch('click', 'choose-entry-mode', { entryMode: 'quantity' });
  const product = context.SchoolRecipeAuxiliaryDirectService.catalogProducts(canteen)[0];
  assert.doesNotMatch(app.innerHTML, /aria-label="餐次切换"|data-action="select-direct-meal"/);
  assert.doesNotMatch(app.innerHTML, /用料日期|school-mobile-date-strip|期望送达时间|data-action="direct-submit"/);
  assert.match(app.innerHTML, /data-action="direct-continue" disabled/);
  assert.equal((app.innerHTML.match(/class="school-mobile-direct-row"/g) || []).length, 50);
  assert.equal((app.innerHTML.match(new RegExp(`data-quantity-key="${product.code}"`, 'g')) || []).length, 1);
  assert.doesNotMatch(app.innerHTML, /data-action="open-direct-detail"/);
  dispatch('input', 'direct-quantity-input', { quantityKey: product.code }, '2.5');
  dispatch('click', 'direct-continue');
  assert.match(app.innerHTML, /school-mobile-auxiliary-simple-confirm-page/);
  assert.match(app.innerHTML, /商品需求汇总|期望送达时间/);
  assert.doesNotMatch(app.innerHTML, /用料日期|餐次切换/);
  assert.match(app.innerHTML, /data-action="direct-submit" disabled/);
  dispatch('click', 'open-expected-at');
  dispatch('click', 'confirm-expected-at');
  assert.match(app.innerHTML, /data-action="direct-submit"[^>]*>提交需求并下单/);
  assert.match(app.innerHTML, /合计金额/);
  dispatch('click', 'back');
  assert.match(app.innerHTML, /data-action="direct-quantity-input"[^>]*value="2.5"/);
});

test('手机端干调数量可按名称或编号查询，并在弹层查看和移除已填写商品', () => {
  const { context, app, dispatch } = mobileApp();
  const canteen = context.SchoolCanteenConfigService.getCanteen('第一食堂');
  const products = context.SchoolRecipeAuxiliaryDirectService.catalogProducts(canteen, true);
  dispatch('click', 'open-auxiliary-attendance');
  dispatch('click', 'choose-entry-mode', { entryMode: 'quantity' });
  assert.match(app.innerHTML, /<section class="school-mobile-auxiliary-products-panel"><form class="school-mobile-auxiliary-simple-search"/);
  assert.match(app.innerHTML, /placeholder="请输入商品名称\/编号"/);
  assert.match(app.innerHTML, /data-action="auxiliary-search-clear" aria-label="清除查询" hidden>×<\/button>/);
  assert.doesNotMatch(app.innerHTML, /data-action="auxiliary-search-reset"|>重置<\/button>/);
  assert.match(app.innerHTML, /已填写<\/span><strong data-auxiliary-filled-count>0 种商品/);
  assert.match(app.innerHTML, /种商品<\/strong><\/button>/);
  assert.doesNotMatch(app.innerHTML, /种商品<\/strong><span aria-hidden="true">↑<\/span>/);

  dispatch('input', 'direct-quantity-input', { quantityKey: products[0].code }, '2');
  dispatch('input', 'direct-quantity-input', { quantityKey: products[1].code }, '3');
  dispatch('input', 'auxiliary-search-input', {}, products[0].code);
  const submitSearch = () => dispatch('submit', '', {}, '', {
    matches(selector) { return selector === '[data-auxiliary-search-form]'; }
  });
  submitSearch();
  assert.match(app.innerHTML, /data-action="auxiliary-search-clear" aria-label="清除查询">×<\/button>/);
  assert.match(app.innerHTML, /已填写<\/span><strong data-auxiliary-filled-count>2 种商品/);
  assert.ok(app.innerHTML.includes(`data-quantity-key="${products[0].code}"`));
  assert.ok(!app.innerHTML.includes(`data-quantity-key="${products[1].code}"`));

  dispatch('click', 'auxiliary-filled-detail');
  assert.match(app.innerHTML, /school-mobile-sheet-backdrop school-mobile-auxiliary-filled-backdrop/);
  assert.match(app.innerHTML, /role="dialog" aria-modal="false" aria-label="商品明细"/);
  assert.match(app.innerHTML, /<h2>商品明细<\/h2>/);
  assert.doesNotMatch(app.innerHTML, /<p class="school-mobile-sheet-subtitle">共 \d+ 种商品<\/p>/);
  assert.ok(app.innerHTML.includes(`${products[0].name}`));
  assert.ok(app.innerHTML.includes(`${products[1].name}`));
  assert.match(app.innerHTML, /<strong>2 L<\/strong>/);
  assert.match(app.innerHTML, /<strong>3 kg<\/strong>/);
  assert.match(app.innerHTML, /data-action="remove-auxiliary-filled-product"/);
  dispatch('click', 'remove-auxiliary-filled-product', { productCode: products[0].code });
  assert.match(app.innerHTML, /data-auxiliary-filled-count>1 种商品/);
  const detailStart = app.innerHTML.indexOf('school-mobile-auxiliary-filled-sheet');
  assert.ok(detailStart >= 0);
  const detail = app.innerHTML.slice(detailStart, app.innerHTML.indexOf('</section>', detailStart));
  assert.equal(detail.includes(products[0].name), false);
  assert.equal(detail.includes(products[1].name), true);
  dispatch('click', 'direct-continue');
  assert.match(app.innerHTML, /school-mobile-auxiliary-simple-confirm-page/);
  assert.doesNotMatch(app.innerHTML, /school-mobile-auxiliary-filled-backdrop/);
  dispatch('click', 'back');
  dispatch('click', 'auxiliary-filled-detail');
  dispatch('click', 'close-sheet');
  dispatch('click', 'auxiliary-search-clear');
  assert.match(app.innerHTML, /data-action="auxiliary-search-clear" aria-label="清除查询" hidden>×<\/button>/);
  assert.equal((app.innerHTML.match(/class="school-mobile-direct-row"/g) || []).length, products.length);
  dispatch('click', 'direct-continue');
  assert.match(app.innerHTML, /school-mobile-auxiliary-simple-confirm-page/);
});

test('移除最后一项干调商品后自动关闭明细弹层', () => {
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
  assert.doesNotMatch(app.innerHTML, /暂无已填写商品/);
  assert.match(app.innerHTML, new RegExp(`data-quantity-key="${product.code}"[^>]*value=""`));
});

test('手机端人数填报确认页按企业配置计算送达时间并隐藏该字段', async () => {
  const { context, app, dispatch } = mobileApp();
  context.DemoStore.updateSettings({ recipeDeliveryAdvanceDays: '2', recipeDeliveryTime: '06:45' });
  dispatch('click', 'open-auxiliary-attendance');
  dispatch('click', 'choose-entry-mode', { entryMode: 'people' });
  dispatch('click', 'continue');

  assert.match(app.innerHTML, /school-mobile-confirm-page/);
  assert.doesNotMatch(app.innerHTML, /<span>期望送达时间<\/span>|data-action="open-expected-at"/);
  const selectedDates = Array.from(app.innerHTML.matchAll(/class="school-mobile-confirm-date[^\"]*is-selected[^\"]*" data-action="confirm-date" data-date="([^"]+)"/g), (match) => match[1]);
  assert.ok(selectedDates.length > 0);
  const expectedAt = context.RecipeDeliveryRule.expectedAt(selectedDates);

  dispatch('click', 'submit-auxiliary-demand');
  await new Promise((resolve) => setTimeout(resolve, 20));
  const record = context.DemoStore.get('recipeDemandRecords').at(-1);
  assert.equal(record.expectedAt, expectedAt);
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

test('手机端干调商品数量不选用料日期，直接生成需求记录与订单', async () => {
  const { context, app, dispatch } = mobileApp();
  context.DemoStore.updateSettings({ splitOrderByMeal: true, splitOrderByPersonType: true });
  const date = context.SchoolRecipeService.getAll()[0].date;
  const canteen = context.SchoolCanteenConfigService.getCanteen('第一食堂');
  const row = context.SchoolRecipeAuxiliaryDirectService.catalogProducts(canteen)[0];
  const before = context.DemoStore.get('recipeDemandRecords').length;
  dispatch('click', 'open-auxiliary-attendance');
  dispatch('click', 'choose-entry-mode', { entryMode: 'quantity' });
  dispatch('input', 'direct-quantity-input', { quantityKey: row.code }, '2.5');
  assert.doesNotMatch(app.innerHTML, /用料日期|school-mobile-date-strip|期望送达时间/);
  dispatch('click', 'direct-continue');
  assert.match(app.innerHTML, /school-mobile-auxiliary-simple-confirm-page/);
  assert.match(app.innerHTML, /<span>食堂<\/span><strong>第一食堂<\/strong><\/div><div class="school-mobile-field"><span>期望送达时间<\/span>/);
  assert.match(app.innerHTML, /data-action="open-expected-at"/);
  dispatch('click', 'open-expected-at');
  assert.match(app.innerHTML, /选择期望送达时间/);
  const laterDate = new Date();
  laterDate.setDate(laterDate.getDate() + 3);
  const deliveryDate = laterDate.toISOString().slice(0, 10);
  dispatch('click', 'expected-at-date', { date: deliveryDate });
  assert.ok(app.innerHTML.includes(`${deliveryDate.replace(/-/g, '/')} 07:30:00`));
  dispatch('click', 'expected-at-time-value', { timePart: 'hour', timeValue: '09' });
  dispatch('click', 'confirm-expected-at');
  assert.ok(app.innerHTML.includes(`${deliveryDate.replace(/-/g, '/')} 09:30:00`));
  dispatch('click', 'direct-submit');
  await new Promise((resolve) => setTimeout(resolve, 20));
  const records = context.DemoStore.get('recipeDemandRecords');
  assert.equal(records.length, before + 1);
  assert.equal(records.at(-1).entryMode, 'quantity');
  assert.equal(records.at(-1).demandType, 'auxiliary');
  assert.equal(records.at(-1).auxiliary, true);
  assert.equal(records.at(-1).orderMode, 'simple');
  assert.equal(records.at(-1).expectedAt, `${deliveryDate} 09:30:00`);
  assert.deepEqual(Array.from(records.at(-1).dateSummaries[0].filledMeals), []);
  assert.equal(records.at(-1).orders.length, 1);
  assert.ok(records.at(-1).orders.every((order) => !order.mealKey && !order.mealName));
  assert.match(app.innerHTML, /需求已提交并生成订单/);
  dispatch('click', 'open-profile-submissions');
  const record = records.at(-1);
  const cardStart = app.innerHTML.indexOf(record.recordNo);
  const card = app.innerHTML.slice(cardStart, app.innerHTML.indexOf('</article>', cardStart));
  assert.match(card, /干调需求填报-采购数量填报/);
  assert.doesNotMatch(card, /用料日期/);
  assert.match(card, /school-mobile-record-metrics is-quantity/);
  assert.doesNotMatch(card, /总人次/);
  dispatch('click', 'record', { recordId: record.id });
  assert.match(app.innerHTML, /<span>填报类型<\/span><strong>干调需求填报<\/strong>/);
  assert.match(app.innerHTML, /<span>填报方式<\/span><strong>采购数量填报<\/strong>/);
  assert.doesNotMatch(app.innerHTML, /<h2>用料日期<\/h2>/);
  assert.match(app.innerHTML, /school-mobile-order-meal">干调总量<\/span>/);
  assert.doesNotMatch(app.innerHTML, /人次 ·/);

  const legacy = { ...record, dateSummaries: record.dateSummaries.map(({ filledMeals, ...summary }) => summary) };
  context.DemoStore.replace('recipeDemandRecords', records.map((item) => item.id === legacy.id ? legacy : item));
  dispatch('click', 'record', { recordId: legacy.id });
  assert.doesNotMatch(app.innerHTML, /<h2>用料日期<\/h2>/);
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

test('人数填报商品列表支持左滑删除、搜索添加和手动采购量', () => {
  const { context, app, dispatch, listeners } = mobileApp();
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
  const catalog = context.SchoolOrderService.getProductCatalog();
  const manualProduct = catalog.find((product) => !meal.rows.some((row) => row.productCode === product.code));
  assert.ok(calculatedRow);
  assert.ok(manualProduct);
  assert.match(app.innerHTML, /school-mobile-demand-toolbar/);
  assert.match(app.innerHTML, /data-action="add-attendance-demand-products">/);
  assert.match(app.innerHTML, /data-demand-swipe-item/);
  assert.match(app.innerHTML, /data-action="remove-attendance-demand-product"/);

  const swipeClasses = new Set();
  const removeButton = { setAttribute() {}, tabIndex: -1 };
  const swipeItem = {
    dataset: { demandSwipeKey: menu.date + '::' + meal.key + '::' + calculatedRow.key },
    classList: { toggle(name, active) { if (active) swipeClasses.add(name); else swipeClasses.delete(name); } },
    querySelector(selector) { return selector === '.school-mobile-demand-remove' ? removeButton : null; }
  };
  const swipeTarget = {
    closest(selector) {
      if (selector === '[data-demand-swipe-item]') return swipeItem;
      return null;
    }
  };
  listeners.pointerdown.forEach((listener) => listener({ target: swipeTarget, clientX: 180, clientY: 120, pointerType: 'touch', button: 0 }));
  listeners.pointerup.forEach((listener) => listener({ target: swipeTarget, clientX: 90, clientY: 122, pointerType: 'touch', button: 0 }));
  assert.equal(swipeClasses.has('is-swiped'), true);
  dispatch('click', 'open-demand-detail', { menuDate: menu.date, demandKey: calculatedRow.key, demandMealKey: meal.key });
  assert.doesNotMatch(app.innerHTML, /school-mobile-demand-detail-sheet/);

  dispatch('click', 'add-attendance-demand-products');
  assert.match(app.innerHTML, /role="dialog" aria-modal="true" aria-label="添加商品"/);
  assert.match(app.innerHTML, /placeholder="搜索商品名称或编号"/);
  assert.ok(app.innerHTML.includes('data-product-code="' + manualProduct.code + '"'));
  dispatch('click', 'toggle-attendance-demand-product', { productCode: manualProduct.code, productStatus: 'available' }, '', {
    classList: { toggle() {} },
    querySelector() { return { textContent: '' }; },
    setAttribute() {}
  });
  context.document.querySelector = () => null;
  context.document.createElement = () => ({ setAttribute() {}, remove() {} });
  context.document.body = { appendChild() {} };
  context.clearTimeout = () => {};
  context.setTimeout = () => 0;
  dispatch('click', 'confirm-attendance-demand-products');
  assert.match(app.innerHTML, /data-action="attendance-demand-quantity"/);
  assert.ok(app.innerHTML.includes('data-product-code="' + manualProduct.code + '"'));

  dispatch('input', 'attendance-demand-quantity', {
    menuDate: menu.date,
    demandMealKey: meal.key,
    productCode: manualProduct.code
  }, '2', { toggleAttribute() {} });
  const storageKey = 'school-mobile-attendance-demand-edits-v1';
  const scope = [canteen.id || canteen.name, menu.date, meal.key].join('::');
  const edit = context.AppStorage.read(storageKey, {})[scope];
  assert.equal(edit.addedProducts[0].quantity, '2');

  dispatch('click', 'remove-attendance-demand-product', {
    menuDate: menu.date,
    demandMealKey: meal.key,
    demandRowKey: manualProduct.code + '::' + manualProduct.unit,
    demandSource: 'manual',
    productCode: manualProduct.code
  });
  assert.equal(context.AppStorage.read(storageKey, {})[scope], undefined);
});
