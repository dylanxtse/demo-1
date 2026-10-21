const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { loadApp, root } = require('./helpers/app-context.cjs');

const date = '2026-09-16';

function app() {
  const context = loadApp({ services: [
    'assets/js/data/school-reference-data.js',
    'assets/js/services/school-canteen-config-service.js',
    'assets/js/services/school-recipe-service.js',
    'assets/js/services/school-recipe-attendance-service.js',
    'assets/js/services/school-order-service.js',
    'assets/js/services/operations-service.js',
    'assets/js/services/school-recipe-auxiliary-direct-service.js'
  ] }).context;
  context.AppStorage.write('school-recipe-auxiliary-current-canteen', '第一食堂');
  return context;
}

test('商品数量填报可在无食谱日期独立记录各餐次采购量', () => {
  const context = app();
  const service = context.SchoolRecipeAuxiliaryDirectService;
  const canteen = context.SchoolCanteenConfigService.getCanteen('第一食堂');
  assert.equal(context.SchoolRecipeService.getAll().some((menu) => menu.date === date), false);
  const empty = service.buildPreview(date, canteen);
  assert.equal(empty.canSubmit, false);
  assert.deepEqual(Array.from(empty.meals, (meal) => meal.key), ['breakfast', 'lunch', 'dinner']);
  assert.deepEqual(Array.from(service.buildPreview('2026-10-05', canteen).meals, (meal) => meal.key), ['breakfast', 'lunch', 'dinner']);
  assert.equal(service.buildPreview('2026-09-08', canteen).meals.some((meal) => meal.key === 'afternoonSnack'), true);
  assert.equal(service.buildPreview('2026-09-08', canteen).meals.some((meal) => meal.key === 'snack'), false);
  const firstKey = empty.meals[0].rows[0].key;
  const secondKey = empty.meals[1].rows[0].key;
  service.writeDraft(date, canteen, { [firstKey]: '2.5', [secondKey]: '3' });
  const preview = service.buildPreview(date, canteen);
  assert.equal(preview.canSubmit, true);
  assert.equal(preview.selectedRows.length, 2);
  assert.equal(preview.selectedRows[0].orderQty, 2.5);
  assert.equal(service.buildPreview(date, canteen, { [firstKey]: '-1' }).canSubmit, false);
  service.writeDraft(date, canteen, { [secondKey]: '3' });
  assert.equal(service.readDraft(date, canteen)[firstKey], undefined);
  assert.equal(service.readDraft(date, canteen)[secondKey], '3');
});

test('商品数量填报生成独立需求记录和订单', async () => {
  const context = app();
  const service = context.SchoolRecipeAuxiliaryDirectService;
  const canteen = context.SchoolCanteenConfigService.getCanteen('第一食堂');
  const meal = service.buildPreview(date, canteen).meals[0];
  const result = await service.submit(date, canteen, { [meal.rows[0].key]: '2.5' }, `${date} 07:30:00`);
  assert.equal(result.record.entryMode, 'quantity');
  assert.equal(result.record.auxiliary, true);
  assert.equal(result.record.totalPersonTimes, 0);
  assert.equal(result.record.productCount, 1);
  assert.equal(result.orders.length, 1);
  const order = context.SchoolOrderService.get(result.orders[0].orderId);
  assert.equal(order.items[0].orderQty, 2.5);
  assert.equal(order.recipeDemandRecordId, result.record.id);
  assert.equal(context.DemoStore.get('recipeDemandRecords').find((record) => record.id === result.record.id).orders.length, 1);
});

test('关闭按餐次拆单时，同一商品的数量合并下单', async () => {
  const context = app();
  context.DemoStore.updateSettings({ splitOrderByMeal: false });
  const service = context.SchoolRecipeAuxiliaryDirectService;
  const canteen = context.SchoolCanteenConfigService.getCanteen('第一食堂');
  const meals = service.buildPreview(date, canteen).meals;
  const result = await service.submit(date, canteen, {
    [meals[0].rows[0].key]: '2.5',
    [meals[1].rows[0].key]: '3'
  }, `${date} 07:30:00`);
  assert.equal(result.orders.length, 1);
  assert.equal(result.record.items.length, 1);
  assert.equal(result.record.items[0].totalQty, 5.5);
  const order = context.SchoolOrderService.get(result.orders[0].orderId);
  assert.equal(order.items.length, 1);
  assert.equal(order.items[0].orderQty, 5.5);
});

test('填报方式可在人数和商品数量之间切换', () => {
  const context = app();
  context.location = { search: `?mode=people&date=${date}` };
  const listeners = {};
  const page = { outerHTML: '' };
  context.AppShell = { mount({ content }) {
    page.outerHTML = content;
    return {
      querySelector(selector) { return selector === '#schoolAuxiliaryPage' ? page : null; },
      addEventListener(type, handler) { listeners[type] = handler; }
    };
  } };
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/pages/school-recipe-auxiliary-attendance.js'), 'utf8'), context);
  assert.match(page.outerHTML, /school-auxiliary-people-section/);
  const switchTo = (mode) => listeners.click({ target: { closest(selector) {
    return selector === '[data-aux-entry-mode]' ? { dataset: { auxEntryMode: mode } } : null;
  } } });
  switchTo('quantity');
  assert.match(page.outerHTML, /data-aux-direct-quantity=/);
  assert.doesNotMatch(page.outerHTML, /school-auxiliary-people-section/);
  switchTo('people');
  assert.match(page.outerHTML, /school-auxiliary-people-section/);
  assert.doesNotMatch(page.outerHTML, /data-aux-direct-quantity=/);
});

test('数量模式显示填报切换和确认页金额，并返回原日期', () => {
  const context = app();
  const service = context.SchoolRecipeAuxiliaryDirectService;
  const canteen = context.SchoolCanteenConfigService.getCanteen('第一食堂');
  const meal = service.buildPreview(date, canteen).meals[0];
  service.writeDraft(date, canteen, { [meal.rows[0].key]: '2.5' });
  context.location = { search: `?mode=quantity&date=${date}&canteen=${canteen.id}` };
  let entryHtml = '';
  context.AppShell = { mount({ content }) {
    entryHtml = content;
    return { querySelector() { return null; }, addEventListener() {} };
  } };
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/pages/school-recipe-auxiliary-attendance.js'), 'utf8'), context);
  assert.match(entryHtml, /按就餐人数填报/);
  assert.match(entryHtml, /按商品数量填报/);
  assert.match(entryHtml, /data-aux-direct-quantity=/);
  assert.doesNotMatch(entryHtml, /data-aux-direct-meal="snack"/);
  assert.match(entryHtml, /data-aux-direct-confirm>需求确认/);
  assert.doesNotMatch(entryHtml, /school-auxiliary-people-section/);

  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/utils/recipe-delivery-rule.js'), 'utf8'), context);
  let confirmHtml = '';
  const listeners = {};
  const page = { outerHTML: '', addEventListener(type, handler) { listeners[type] = handler; } };
  context.AppShell = { mount({ content }) {
    confirmHtml = content;
    page.outerHTML = content;
    return { querySelector() { return page; }, addEventListener(type, handler) { listeners[type] = handler; } };
  } };
  let target = '';
  context.AppNavigationGuard = { navigate(url) { target = url; } };
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/pages/school-recipe-auxiliary-direct-confirm.js'), 'utf8'), context);
  assert.match(confirmHtml, /商品需求确认/);
  assert.doesNotMatch(confirmHtml, /<th>辅料<\/th>/);
  assert.match(confirmHtml, /早餐合计金额/);
  assert.match(confirmHtml, /所有餐次合计金额/);
  assert.match(confirmHtml, /¥137\.50/);
  listeners.click({ target: { closest(selector) { return selector === '[data-aux-direct-back]' ? {} : null; } } });
  assert.equal(target, `./school-recipe-auxiliary-attendance.html?mode=quantity&date=${date}`);
  assert.equal(service.readDraft(date, canteen)[meal.rows[0].key], '2.5');
});

test('商品数量确认页带入多个已填日期，同餐次相同商品合并下单', async () => {
  const context = app();
  const service = context.SchoolRecipeAuxiliaryDirectService;
  const canteen = context.SchoolCanteenConfigService.getCanteen('第一食堂');
  const secondDate = '2026-09-17';
  const row = service.buildPreview(date, canteen).meals[0].rows[0];
  service.writeDraft(date, canteen, { [row.key]: '2.5' });
  service.writeDraft(secondDate, canteen, { [row.key]: '3' });
  assert.deepEqual(Array.from(service.readFilledDates(canteen)), [date, secondDate]);
  const drafts = { [date]: service.readDraft(date, canteen), [secondDate]: service.readDraft(secondDate, canteen) };
  const preview = service.buildDatesPreview([date, secondDate], canteen, drafts);
  assert.equal(preview.meals.find((meal) => meal.key === 'breakfast').rows.length, 1);
  assert.equal(preview.meals.find((meal) => meal.key === 'breakfast').rows[0].orderQty, 5.5);

  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/utils/recipe-delivery-rule.js'), 'utf8'), context);
  context.location = { search: `?mode=quantity&date=${secondDate}&canteen=${canteen.id}` };
  let confirmHtml = '';
  const page = { outerHTML: '' };
  context.AppShell = { mount({ content }) {
    confirmHtml = content;
    page.outerHTML = content;
    return { querySelector() { return page; }, addEventListener() {} };
  } };
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/pages/school-recipe-auxiliary-direct-confirm.js'), 'utf8'), context);
  assert.match(confirmHtml, new RegExp(`用料日期：<strong>${date}、${secondDate}</strong>`));
  assert.match(confirmHtml, /填报天数：<strong>2<\/strong>/);
  assert.match(confirmHtml, /<td class="is-number">5\.5<\/td>/);

  const result = await service.submitDates([date, secondDate], canteen, drafts, `${date} 07:30:00`);
  assert.deepEqual(Array.from(result.record.dates), [date, secondDate]);
  assert.equal(result.record.dateSummaries.length, 2);
  const breakfastOrder = result.orders.find((order) => order.mealKey === 'breakfast');
  assert.deepEqual(Array.from(breakfastOrder.dates), [date, secondDate]);
  assert.equal(context.SchoolOrderService.get(breakfastOrder.orderId).items[0].orderQty, 5.5);
});

test('商品数量确认页缩略展示三个以上已填日期', () => {
  const context = app();
  const service = context.SchoolRecipeAuxiliaryDirectService;
  const canteen = context.SchoolCanteenConfigService.getCanteen('第一食堂');
  const dates = ['2026-09-16', '2026-09-17', '2026-09-18'];
  const key = service.buildPreview(dates[0], canteen).meals[0].rows[0].key;
  dates.forEach((filledDate) => service.writeDraft(filledDate, canteen, { [key]: 1 }));
  context.location = { search: `?mode=quantity&date=${dates[1]}&canteen=${canteen.id}` };
  let html = '';
  context.AppShell = { mount({ content }) {
    html = content;
    return { querySelector() { return null; }, addEventListener() {} };
  } };
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/pages/school-recipe-auxiliary-direct-confirm.js'), 'utf8'), context);
  assert.match(html, new RegExp(`用料日期：<strong>${dates[0]}、${dates[2]}</strong>`));
  assert.match(html, /<summary>查看全部<\/summary>/);
  dates.forEach((filledDate) => assert.ok(html.includes(`<span>${filledDate}</span>`)));
});

test('商品数量按人员类型拆单时分别汇总、显示采购量并生成对应订单', async () => {
  const context = app();
  context.DemoStore.updateSettings({ splitOrderByPersonType: true });
  const service = context.SchoolRecipeAuxiliaryDirectService;
  const canteen = context.SchoolCanteenConfigService.getCanteen('第一食堂');
  const participants = service.participantsFor(canteen);
  assert.ok(participants.length >= 2);
  const secondDate = '2026-09-17';
  const row = service.buildPreview(date, canteen).meals[0].rows[0];
  const firstKey = `${row.key}::${participants[0].key}`;
  const secondKey = `${row.key}::${participants[1].key}`;
  const drafts = {
    [date]: { [firstKey]: '2', [secondKey]: '3' },
    [secondDate]: { [firstKey]: '4', [secondKey]: '5' }
  };
  service.writeDraft(date, canteen, drafts[date]);
  service.writeDraft(secondDate, canteen, drafts[secondDate]);
  const preview = service.buildDatesPreview([date, secondDate], canteen, drafts);
  const aggregate = preview.meals.find((meal) => meal.key === 'breakfast').rows[0];
  assert.equal(aggregate.participantQty[participants[0].key], 6);
  assert.equal(aggregate.participantQty[participants[1].key], 8);
  assert.equal(aggregate.orderQty, 14);

  context.location = { search: `?mode=quantity&date=${date}&canteen=${canteen.id}` };
  let entryHtml = '';
  context.AppShell = { mount({ content }) {
    entryHtml = content;
    return { querySelector() { return null; }, addEventListener() {} };
  } };
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/pages/school-recipe-auxiliary-attendance.js'), 'utf8'), context);
  assert.ok(entryHtml.includes(`data-aux-direct-quantity="${firstKey}"`));
  assert.ok(entryHtml.includes(`data-aux-direct-quantity="${secondKey}"`));

  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/utils/recipe-delivery-rule.js'), 'utf8'), context);
  let confirmHtml = '';
  const page = { outerHTML: '' };
  context.AppShell = { mount({ content }) {
    confirmHtml = content;
    page.outerHTML = content;
    return { querySelector() { return page; }, addEventListener() {} };
  } };
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/pages/school-recipe-auxiliary-direct-confirm.js'), 'utf8'), context);
  assert.match(confirmHtml, new RegExp(`${participants[0].label}[^<]*采购量`));
  assert.match(confirmHtml, new RegExp(`${participants[1].label}[^<]*采购量`));
  assert.match(confirmHtml, /<td class="is-number">6<\/td><td class="is-number">8<\/td>/);

  const result = await service.submitDates([date, secondDate], canteen, drafts, `${date} 07:30:00`);
  const breakfastOrders = result.orders.filter((order) => order.mealKey === 'breakfast');
  assert.equal(breakfastOrders.length, 2);
  assert.deepEqual(breakfastOrders.map((order) => context.SchoolOrderService.get(order.orderId).items[0].orderQty).sort((a, b) => a - b), [6, 8]);
});

test('商品数量按人员类型拆单时订单只关联该类型已填写的日期', async () => {
  const context = app();
  context.DemoStore.updateSettings({ splitOrderByPersonType: true });
  const service = context.SchoolRecipeAuxiliaryDirectService;
  const canteen = context.SchoolCanteenConfigService.getCanteen('第一食堂');
  const people = service.participantsFor(canteen);
  const nextDate = '2026-09-17';
  const key = service.buildPreview(date, canteen).meals[0].rows[0].key;
  const drafts = {
    [date]: { [`${key}::${people[0].key}`]: 2 },
    [nextDate]: { [`${key}::${people[1].key}`]: 3 }
  };
  const result = await service.submitDates([date, nextDate], canteen, drafts, `${date} 07:30:00`);
  const breakfastOrders = result.orders.filter((order) => order.mealKey === 'breakfast');
  assert.deepEqual(Array.from(breakfastOrders, (order) => order.dates.join('、')).sort(), [date, nextDate]);
  assert.deepEqual(Array.from(result.record.items[0].sourceDates), [date, nextDate]);
});
