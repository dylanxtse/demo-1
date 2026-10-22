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

test('干料填报直接显示商品、送达时间和确认入口', () => {
  const context = app();
  context.location = { search: '?mode=quantity' };
  const page = { outerHTML: '' };
  context.AppShell = { mount({ content }) {
    page.outerHTML = content;
    return {
      querySelector(selector) { return selector === '#schoolAuxiliaryPage' ? page : null; },
      addEventListener() {}
    };
  } };
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/pages/school-recipe-auxiliary-attendance.js'), 'utf8'), context);
  assert.match(page.outerHTML, /data-aux-simple-quantity="SP0300030"/);
  assert.match(page.outerHTML, /data-aux-simple-expected-at/);
  assert.match(page.outerHTML, /data-aux-simple-date-field[^>]*><span class="school-auxiliary-simple-date-display"/);
  assert.match(page.outerHTML, /data-aux-simple-date-label>请选择<\/span>/);
  assert.doesNotMatch(page.outerHTML, /placeholder="年|placeholder="月|placeholder="日/);
  assert.doesNotMatch(page.outerHTML, /填写采购数量|已填写 \d+ 种商品/);
  assert.doesNotMatch(page.outerHTML, /直接填写需要采购的干料数量/);
  assert.match(page.outerHTML, /data-aux-simple-confirm disabled/);
  assert.match(page.outerHTML, /data-aux-entry-mode="people"/);
  assert.doesNotMatch(page.outerHTML, /school-auxiliary-calendar|data-aux-date=|data-aux-direct-meal=/);
});

test('人数填报保留原有页面，两种方式可相互切换', () => {
  const context = app();
  const listeners = {};
  let html = '';
  context.location = { search: '?mode=people' };
  context.AppShell = { mount({ content }) {
    html = content;
    return {
      querySelector() { return null; },
      addEventListener(type, handler) { listeners[type] = handler; }
    };
  } };
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/pages/school-recipe-auxiliary-attendance-people.js'), 'utf8'), context);
  assert.match(html, /data-person-type="[^\"]+" data-meal-key="breakfast"/);
  assert.match(html, /school-auxiliary-recipe-date-panel/);
  assert.match(html, /data-confirm-demand/);
  listeners.click({ target: { closest(selector) {
    return selector === '[data-aux-entry-mode]' ? { dataset: { auxEntryMode: 'quantity' } } : null;
  } } });
  assert.equal(context.location.href, './school-recipe-auxiliary-attendance.html?mode=quantity');

  context.location = { search: '?mode=quantity' };
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/pages/school-recipe-auxiliary-attendance.js'), 'utf8'), context);
  assert.match(html, /data-aux-simple-quantity=/);
  listeners.click({ target: { closest(selector) {
    return selector === '[data-aux-entry-mode]' ? { dataset: { auxEntryMode: 'people' } } : null;
  } } });
  assert.equal(context.location.href, './school-recipe-auxiliary-attendance.html?mode=people');
});

test('商品数量模式先进入需求确认页，提交后生成需求与订单', async () => {
  const context = app();
  context.location = { search: '?mode=quantity' };
  let html = '';
  const listeners = {};
  const page = { get outerHTML() { return html; }, set outerHTML(value) { html = value; } };
  const button = { disabled: true, classList: { toggle() {} } };
  const error = { textContent: '' };
  const dateLabel = { textContent: '' };
  context.AppShell = { mount({ content }) {
    html = content;
    return {
      querySelector(selector) { return {
        '#schoolAuxiliaryPage': page,
        '[data-aux-simple-confirm]': button,
        '[data-aux-simple-date-label]': dateLabel,
        '[data-aux-simple-error]': error
      }[selector] || null; },
      addEventListener(type, handler) { listeners[type] = handler; }
    };
  } };
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/pages/school-recipe-auxiliary-attendance.js'), 'utf8'), context);
  let pickerOpened = false;
  await listeners.click({ target: { closest(selector) {
    return selector === '[data-aux-simple-expected-at]'
      ? { showPicker() { pickerOpened = true; } } : null;
  } } });
  assert.equal(pickerOpened, true);
  const input = (selector, value, dataset = {}) => listeners.input({ target: {
    value, dataset, closest(candidate) { return candidate === selector ? this : null; }
  } });
  input('[data-aux-simple-quantity]', '2.5', { auxSimpleQuantity: 'SP0300030' });
  assert.equal(button.disabled, true);
  input('[data-aux-simple-expected-at]', `${date}T07:30`);
  assert.equal(button.disabled, false);
  assert.equal(dateLabel.textContent, `${date} 07:30`);
  const recordsBeforeConfirm = context.DemoStore.get('recipeDemandRecords').length;
  await listeners.click({ target: { closest(selector) {
    return selector === '[data-aux-simple-confirm]' ? {} : null;
  } } });
  const canteen = context.SchoolCanteenConfigService.getCanteen('第一食堂');
  assert.equal(context.location.href, `./school-recipe-auxiliary-demand-confirm.html?mode=quantity&orderMode=simple&canteen=${canteen.id}`);
  assert.equal(context.DemoStore.get('recipeDemandRecords').length, recordsBeforeConfirm);
  assert.equal(context.AppStorage.read('school-recipe-auxiliary-simple-drafts-v1', {})[canteen.id].quantities.SP0300030, '2.5');

  context.location = { search: `?mode=quantity&orderMode=simple&canteen=${canteen.id}` };
  let confirmHtml = '';
  const confirmListeners = {};
  const confirmPage = { get outerHTML() { return confirmHtml; }, set outerHTML(value) { confirmHtml = value; } };
  context.AppShell = { mount({ content }) {
    confirmHtml = content;
    return {
      querySelector(selector) { return selector === '#schoolRecipeAuxiliarySimpleConfirmPage' ? confirmPage : null; },
      addEventListener(type, handler) { confirmListeners[type] = handler; }
    };
  } };
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/pages/school-recipe-auxiliary-simple-confirm.js'), 'utf8'), context);
  assert.match(confirmHtml, /干料需求确认/);
  assert.match(confirmHtml, /2026-09-16 07:30:00/);
  assert.match(confirmHtml, /SP0300030/);
  assert.match(confirmHtml, /<td class="is-number">2\.5<\/td>/);
  assert.doesNotMatch(confirmHtml, /用料日期明细/);
  await confirmListeners.click({ target: { closest(selector) {
    return selector === '[data-aux-simple-submit]' ? {} : null;
  } } });
  assert.equal(context.location.href, './school-recipe-auxiliary-attendance.html?mode=quantity');
  assert.equal(context.AppStorage.read('school-recipe-auxiliary-simple-drafts-v1', {})[canteen.id], undefined);
  const record = context.DemoStore.get('recipeDemandRecords').at(-1);
  assert.equal(record.orderMode, 'simple');
  assert.deepEqual(Array.from(record.dates), [date]);
  assert.equal(record.items[0].totalQty, 2.5);
  const order = context.SchoolOrderService.get(record.orders[0].orderId);
  assert.equal(order.expectedAt, `${date} 07:30:00`);
  assert.equal(order.items[0].orderQty, 2.5);
  let detailRecord = record;
  context.SchoolRecipeDemandService = { get: () => detailRecord, participantsFor: () => [] };
  context.location = { search: `?id=${record.id}` };
  let detailHtml = '';
  context.AppShell = { mount({ content }) {
    detailHtml = content;
    return { querySelector() { return null; } };
  } };
  const renderDetail = () => vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/pages/school-recipe-demand-record-detail.js'), 'utf8'), context);
  renderDetail();
  assert.doesNotMatch(detailHtml, /用料日期明细|school-recipe-demand-date-detail-section/);
  assert.match(detailHtml, /商品需求明细/);
  assert.match(detailHtml, /2026-09-16 07:30:00/);
  detailRecord = { ...record, orderMode: 'combined' };
  renderDetail();
  assert.doesNotMatch(detailHtml, /用料日期明细/, '干料商品数量记录不按下单方式判断');
  detailRecord = { ...record, entryMode: 'people' };
  renderDetail();
  assert.match(detailHtml, /用料日期明细/, '干料人数填报仍显示日期明细');
  detailRecord = { ...record, demandType: 'ingredient', auxiliary: false };
  renderDetail();
  assert.match(detailHtml, /用料日期明细/, '食材商品数量填报仍显示日期明细');
});

test('历史商品数量确认页显示金额并返回原日期', () => {
  const context = app();
  const service = context.SchoolRecipeAuxiliaryDirectService;
  const canteen = context.SchoolCanteenConfigService.getCanteen('第一食堂');
  const meal = service.buildPreview(date, canteen).meals[0];
  service.writeDraft(date, canteen, { [meal.rows[0].key]: '2.5' });
  context.location = { search: `?mode=quantity&date=${date}&canteen=${canteen.id}` };
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
  assert.match(confirmHtml, /<span class="section-title-mark">用料日期明细<\/span>/);
  assert.match(confirmHtml, new RegExp(`<td>${date}</td><td class="is-number">1</td>`));
  assert.match(confirmHtml, new RegExp(`<td>${secondDate}</td><td class="is-number">1</td>`));
  assert.match(confirmHtml, /填报天数：<strong>2<\/strong>/);
  assert.match(confirmHtml, /<td class="is-number">5\.5<\/td>/);

  const result = await service.submitDates([date, secondDate], canteen, drafts, `${date} 07:30:00`);
  assert.deepEqual(Array.from(result.record.dates), [date, secondDate]);
  assert.equal(result.record.dateSummaries.length, 2);
  const breakfastOrder = result.orders.find((order) => order.mealKey === 'breakfast');
  assert.deepEqual(Array.from(breakfastOrder.dates), [date, secondDate]);
  assert.equal(context.SchoolOrderService.get(breakfastOrder.orderId).items[0].orderQty, 5.5);
});

test('商品数量确认页按表格展示三个以上已填日期', () => {
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
  assert.match(html, /<th>用料日期<\/th><th>商品种数<\/th><th>操作<\/th>/);
  dates.forEach((filledDate) => assert.ok(html.includes(`<td>${filledDate}</td>`)));
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

test('多天合并仅使用辅料设置的商品，一次总量只生成一笔无餐次订单', async () => {
  const context = app();
  context.DemoStore.updateSettings({ splitOrderByMeal: true, splitOrderByPersonType: true });
  const service = context.SchoolRecipeAuxiliaryDirectService;
  const canteen = context.SchoolCanteenConfigService.getCanteen('第一食堂');
  context.AppStorage.write('school-recipe-auxiliary-selected-products-v1', { [canteen.id]: ['aux-oil'] });
  const oil = service.catalogProducts(canteen)[0];
  assert.equal(oil.code, 'SP0300030');
  assert.deepEqual(Array.from(service.catalogProducts(canteen), (product) => product.id), ['aux-oil']);
  assert.deepEqual(Array.from(service.buildPreview(date, canteen).meals[0].rows, (row) => row.productCode), [oil.code]);
  const draft = { dates: [date, '2026-09-18'], quantities: { [oil.code]: '2', SP0300034: '9' } };
  service.writeCombinedDraft(canteen, draft);
  assert.deepEqual(Array.from(service.readCombinedDraft(canteen).dates), draft.dates);
  const preview = service.buildCombinedPreview(canteen);
  assert.equal(preview.canSubmit, true);
  assert.deepEqual(Array.from(preview.rows, (row) => row.productCode), [oil.code], '商品档案中的大米不能混入辅料填报');
  assert.equal(preview.selectedRows[0].orderQty, 2);
  assert.equal(service.buildCombinedPreview(canteen, { ...draft, quantities: { [oil.code]: '-1' } }).canSubmit, false);

  const result = await service.submitDates(draft.dates, canteen, draft, `${date} 07:30:00`, 'combined');
  assert.equal(result.record.orderMode, 'combined');
  assert.equal(result.orders.length, 1);
  assert.deepEqual(Array.from(result.orders[0].dates), draft.dates);
  assert.equal(result.record.items[0].totalQty, 2);
  assert.ok(result.record.dateSummaries.every((summary) => summary.items.length === 0), '周期总量不得复制到每天');
  const order = context.SchoolOrderService.get(result.orders[0].orderId);
  assert.equal(order.orderMode, 'combined');
  assert.equal(order.mealName, '');
  assert.equal(order.items[0].orderQty, 2);
  assert.equal(order.recipeDemandDate, draft.dates.join('、'));
  context.SchoolRecipeDemandService = { get: () => result.record, participantsFor: () => [] };
  context.location = { search: `?id=${result.record.id}` };
  let recordDetailHtml = '';
  context.AppShell = { mount({ content }) {
    recordDetailHtml = content;
    return { querySelector: () => null };
  } };
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/pages/school-recipe-demand-record-detail.js'), 'utf8'), context);
  assert.match(recordDetailHtml, new RegExp(`<td>--</td><td>${order.orderTag}</td>`));
  assert.doesNotMatch(recordDetailHtml, /不区分餐次/);
  assert.doesNotMatch(recordDetailHtml, /用料日期明细|school-recipe-demand-date-detail-section/);
  const enterpriseOrder = context.DemoStore.get('orders').find((item) => item.orderId === order.id);
  assert.equal(enterpriseOrder?.orderMode, 'combined');
  assert.equal(enterpriseOrder?.items[0]?.quantity, 2);
});

test('分天分餐次明确按日期和餐次下单，不受全局餐次合并设置影响', async () => {
  const context = app();
  context.DemoStore.updateSettings({ splitOrderByMeal: false });
  const service = context.SchoolRecipeAuxiliaryDirectService;
  const canteen = context.SchoolCanteenConfigService.getCanteen('第一食堂');
  const meals = service.buildPreview(date, canteen).meals;
  const nextDate = '2026-09-17';
  const drafts = {
    [date]: { [meals[0].rows[0].key]: '1', [meals[1].rows[0].key]: '2' },
    [nextDate]: { [meals[0].rows[0].key]: '3' }
  };
  const result = await service.submitDates([date, nextDate], canteen, drafts, `${date} 07:30:00`, 'daily');
  assert.equal(result.record.orderMode, 'daily');
  assert.equal(result.orders.length, 3);
  assert.ok(result.orders.every((row) => context.SchoolOrderService.get(row.orderId).orderMode === 'daily'));
  assert.deepEqual(Array.from(result.orders, (order) => `${order.dates[0]}:${order.mealKey}`).sort(),
    [`${date}:breakfast`, `${date}:lunch`, `${nextDate}:breakfast`]);
  assert.deepEqual(Array.from(result.orders, (order) => context.SchoolOrderService.get(order.orderId).items[0].orderQty).sort((a, b) => a - b), [1, 2, 3]);
});

test('干料填报页只显示已设置商品，历史确认页不显示餐次', () => {
  const context = app();
  const service = context.SchoolRecipeAuxiliaryDirectService;
  const canteen = context.SchoolCanteenConfigService.getCanteen('第一食堂');
  context.AppStorage.write('school-recipe-auxiliary-selected-products-v1', { [canteen.id]: ['aux-salt'] });
  context.location = { search: `?mode=quantity&orderMode=combined&date=${date}` };
  const page = { outerHTML: '' };
  context.AppShell = { mount({ content }) {
    page.outerHTML = content;
    return {
      querySelector(selector) { return selector === '#schoolAuxiliaryPage' ? page : null; },
      addEventListener() {}
    };
  } };
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/pages/school-recipe-auxiliary-attendance.js'), 'utf8'), context);
  assert.doesNotMatch(page.outerHTML, /填写采购数量/);
  assert.match(page.outerHTML, /食盐/);
  assert.match(page.outerHTML, /data-aux-simple-quantity="SP0300031"/);
  assert.doesNotMatch(page.outerHTML, /金龙鱼5L桶装油/);
  assert.doesNotMatch(page.outerHTML, /school-auxiliary-calendar|data-aux-date=/);
  assert.doesNotMatch(page.outerHTML, /data-aux-direct-meal=/);
  const salt = service.catalogProducts(canteen)[0];
  service.writeCombinedDraft(canteen, { dates: [date, '2026-09-18'], quantities: { [salt.code]: 2 } });

  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/utils/recipe-delivery-rule.js'), 'utf8'), context);
  context.location = { search: `?mode=quantity&orderMode=combined&date=${date}&canteen=${canteen.id}` };
  let confirmHtml = '';
  const confirmListeners = {};
  const confirmPage = {
    get outerHTML() { return confirmHtml; },
    set outerHTML(value) { confirmHtml = value; }
  };
  context.AppShell = { mount({ content }) {
    confirmHtml = content;
    return {
      querySelector(selector) { return selector === '#schoolRecipeAuxiliaryDirectConfirmPage' ? confirmPage : null; },
      addEventListener(type, handler) { confirmListeners[type] = handler; }
    };
  } };
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/pages/school-recipe-auxiliary-direct-confirm.js'), 'utf8'), context);
  assert.match(confirmHtml, /用料食堂：<strong>第一食堂<\/strong>/);
  assert.match(confirmHtml, /填报天数：<strong>2<\/strong>/);
  assert.match(confirmHtml, /<span class="section-title-mark">用料日期明细<\/span>/);
  assert.match(confirmHtml, new RegExp(`<td>${date}</td><td class="school-recipe-demand-table-action">`));
  assert.match(confirmHtml, /<th>用料日期<\/th><th>操作<\/th>/);
  assert.doesNotMatch(confirmHtml, /<th>商品种数<\/th>/);
  assert.doesNotMatch(confirmHtml, /下单方式：|期望送达：/);
  assert.match(confirmHtml, /<td colspan="6">合计金额<\/td>/);
  assert.doesNotMatch(confirmHtml, /本次合并订单合计金额/);
  assert.doesNotMatch(confirmHtml, /data-aux-direct-confirm-meal=/);
  confirmListeners.click({ target: { closest(selector) {
    return selector === '[data-aux-direct-delete-date]'
      ? { dataset: { auxDirectDeleteDate: date }, disabled: false } : null;
  } } });
  assert.match(confirmHtml, /填报天数：<strong>1<\/strong>/);
  assert.doesNotMatch(confirmHtml, new RegExp(`<td>${date}</td>`));
  assert.match(confirmHtml, /data-aux-direct-delete-date="2026-09-18" title="至少保留一个填报日期" disabled/);
  assert.deepEqual(Array.from(service.readCombinedDraft(canteen).dates), [date, '2026-09-18']);
});

test('分天分餐次确认只读取当前日期，不混入其他日期的草稿', () => {
  const context = app();
  const service = context.SchoolRecipeAuxiliaryDirectService;
  const canteen = context.SchoolCanteenConfigService.getCanteen('第一食堂');
  const key = service.buildPreview(date, canteen).meals[0].rows[0].key;
  service.writeDraft(date, canteen, { [key]: 2 });
  service.writeDraft('2026-09-17', canteen, { [key]: 4 });
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/utils/recipe-delivery-rule.js'), 'utf8'), context);
  context.location = { search: `?mode=quantity&orderMode=daily&date=${date}&canteen=${canteen.id}` };
  let html = '';
  context.AppShell = { mount({ content }) {
    html = content;
    return { querySelector() { return null; }, addEventListener() {} };
  } };
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/pages/school-recipe-auxiliary-direct-confirm.js'), 'utf8'), context);
  assert.match(html, /用料食堂：<strong>第一食堂<\/strong>/);
  assert.match(html, /填报天数：<strong>1<\/strong>/);
  assert.match(html, new RegExp(`data-aux-direct-delete-date="${date}" title="至少保留一个填报日期" disabled`));
  assert.doesNotMatch(html, /下单方式：|期望送达：/);
  assert.match(html, /<td class="is-number">2<\/td>/);
  assert.doesNotMatch(html, /2026-09-17/);
});
