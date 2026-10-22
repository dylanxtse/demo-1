const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { loadApp, root } = require('./helpers/app-context.cjs');

function app() {
  return loadApp({ services: [
    'assets/js/data/school-reference-data.js',
    'assets/js/services/school-canteen-config-service.js',
    'assets/js/services/school-recipe-service.js',
    'assets/js/services/school-recipe-attendance-service.js',
    'assets/js/services/school-order-service.js',
    'assets/js/services/operations-service.js',
    'assets/js/services/school-recipe-demand-service.js'
  ] }).context;
}

test('直接填量无需人数记录，标品数量必须为整数', () => {
  const context = app();
  const date = context.SchoolRecipeService.getAll()[0].date;
  const service = context.SchoolRecipeDemandService;
  const empty = service.buildDirectPreview(date, {}, { canteen: '第一食堂' });
  assert.ok(empty.rows.length > 0);
  assert.equal(empty.canSubmit, false);
  const standard = empty.rows.find((row) => row.isStandardProduct);
  assert.ok(standard);
  assert.equal(service.buildDirectPreview(date, { [standard.key]: 1.5 }, { canteen: '第一食堂' }).canSubmit, false);
  assert.equal(service.buildDirectPreview(date, { [standard.key]: 2 }, { canteen: '第一食堂' }).canSubmit, true);
});

test('直接填量生成学校订单、企业订单和独立需求记录', async () => {
  const context = app();
  context.DemoStore.updateSettings({ splitOrderByMeal: false });
  const date = context.SchoolRecipeService.getAll()[0].date;
  const service = context.SchoolRecipeDemandService;
  const rows = service.buildDirectPreview(date, {}, { canteen: '第一食堂' }).rows;
  const first = rows.find((row) => rows.some((other) => other.key !== row.key && other.productCode === row.productCode));
  assert.ok(first);
  const sameProduct = rows.find((row) => row.key !== first.key && row.productCode === first.productCode);
  assert.ok(sameProduct);
  const quantities = { [first.key]: 2, [sameProduct.key]: 3 };
  const result = await service.submitDirect(date, quantities, {
    canteen: '第一食堂', expectedAt: `${date} 07:30:00`
  });
  assert.equal(result.record.entryMode, 'quantity');
  assert.equal(result.record.demandType, 'ingredient');
  assert.equal(result.record.dateSummaries[0].filledMeals.length, 2);
  assert.equal(result.record.totalPersonTimes, 0);
  assert.equal(result.record.productCount, 1);
  assert.equal(result.orders.length, 1);
  const schoolOrder = context.SchoolOrderService.get(result.orders[0].orderId);
  assert.equal(schoolOrder.items.find((line) => line.productCode === first.productCode).orderQty, 5);
  assert.equal(context.DemoStore.get('orders').filter((order) => order.recipeDemandRecordId === result.record.id).length, 1);
  assert.equal(service.get(result.record.id).items[0].totalQty, 5);
});

test('直接填量进入需求确认页，可核对数量并返回原日期修改', () => {
  const context = app();
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/utils/recipe-delivery-rule.js'), 'utf8'), context);
  const date = context.SchoolRecipeService.getAll()[0].date;
  const canteen = context.SchoolRecipeDemandService.currentCanteen('第一食堂');
  const emptyPreview = context.SchoolRecipeDemandService.buildDirectPreview(date, {}, { canteen });
  const product = emptyPreview.meals[0].rows[0];
  const anotherMealProduct = emptyPreview.meals[1].rows[0];
  const scope = `${canteen.id || canteen.name}::${date}`;
  context.AppStorage.write('school-recipe-demand-direct-drafts-v1', { [scope]: { [product.key]: 2, [anotherMealProduct.key]: 3 } });
  const body = { innerHTML: '' };
  const listeners = {};
  const page = {
    querySelector(selector) { return selector === '#schoolRecipeDemandConfirmBody' ? body : null; },
    addEventListener(type, handler) { listeners[type] = handler; }
  };
  context.AppShell = { mount() { return { querySelector() { return page; } }; } };
  context.location = { search: `?mode=quantity&date=${date}&canteen=${encodeURIComponent(canteen.id || canteen.name)}` };
  let navigationTarget = '';
  context.AppNavigationGuard = { navigate(url) { navigationTarget = url; } };
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/pages/school-recipe-demand-confirm.js'), 'utf8'), context);
  assert.match(body.innerHTML, /<h1>菜谱需求确认<\/h1>/);
  assert.match(body.innerHTML, new RegExp(product.productCode));
  assert.match(body.innerHTML, /<td class="is-number">2<\/td>/);
  const mealAmount = Number(product.orderPrice) * 2;
  const allAmount = mealAmount + Number(anotherMealProduct.orderPrice) * 3;
  const formattedAmount = (value) => `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  assert.match(body.innerHTML, new RegExp(`<tfoot><tr class="school-recipe-demand-product-total-row"><td colspan="7">[^<]+合计金额<\\/td><td class="is-number">${formattedAmount(mealAmount)}<\\/td>`));
  assert.ok(body.innerHTML.includes(`<td class="is-number">${formattedAmount(allAmount)}</td>`));
  assert.doesNotMatch(body.innerHTML, /预计金额：/);
  assert.match(body.innerHTML, /school-recipe-demand-back" data-action="back"[\s\S]*?<span>返回<\/span>/);
  assert.match(body.innerHTML, /<button type="button" class="btn btn-sm" data-action="back">返回<\/button>/);
  assert.match(body.innerHTML, /提交需求并下单/);
  assert.doesNotMatch(body.innerHTML, /请核对各餐次的采购商品和数量|期望送达时间：/);
  listeners.click({ target: { closest(selector) { return selector === '[data-action]' ? { dataset: { action: 'back' } } : null; } } });
  assert.equal(navigationTarget, `./school-recipe-attendance.html?mode=quantity&date=${date}`);
  assert.equal(context.AppStorage.read('school-recipe-demand-direct-drafts-v1', {})[scope][product.key], 2);
  assert.equal(context.AppStorage.read('school-recipe-demand-direct-drafts-v1', {})[scope][anotherMealProduct.key], 3);
});

test('直接填量按当前餐次或当前日期清空，不影响其他餐次', () => {
  const context = app();
  const date = context.SchoolRecipeService.getAll()[0].date;
  const canteen = context.SchoolRecipeDemandService.currentCanteen('第一食堂');
  const preview = context.SchoolRecipeDemandService.buildDirectPreview(date, {}, { canteen });
  const firstMealProduct = preview.meals[0].rows[0];
  const otherMealProduct = preview.meals[1].rows[0];
  const scope = `${canteen.id || canteen.name}::${date}`;
  context.AppStorage.write('school-recipe-demand-direct-drafts-v1', {
    [scope]: { [firstMealProduct.key]: '2', [otherMealProduct.key]: '3' }
  });
  context.location = { search: `?mode=quantity&date=${date}` };
  context.addEventListener = () => {};
  context.setTimeout = () => 1;
  context.clearTimeout = () => {};
  context.document = {
    querySelector: () => null,
    createElement: () => ({ setAttribute() {}, remove() {} }),
    body: { appendChild() {} }
  };
  const body = { innerHTML: '' };
  const switcher = { innerHTML: '' };
  const listeners = {};
  const page = { addEventListener(type, handler) { listeners[type] = handler; }, querySelector() { return null; } };
  const rootElement = {
    querySelector(selector) {
      if (selector === '#schoolRecipeAttendancePage') return page;
      if (selector === '#schoolRecipeAttendanceBody') return body;
      if (selector === '#schoolRecipeEntrySwitch') return switcher;
      return null;
    }
  };
  context.AppShell = { mount() { return rootElement; } };
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/pages/school-recipe-attendance.js'), 'utf8'), context);
  assert.match(body.innerHTML, /清空当前餐次数量/);
  assert.match(body.innerHTML, /清空当前日期数量/);
  const clickAction = (action) => listeners.click({ target: {
    closest(selector) { return selector === '[data-direct-action]' ? { dataset: { directAction: action }, disabled: false } : null; }
  } });
  clickAction('clear-meal');
  let stored = context.AppStorage.read('school-recipe-demand-direct-drafts-v1', {});
  assert.equal(stored[scope][firstMealProduct.key], undefined);
  assert.equal(stored[scope][otherMealProduct.key], '3');
  assert.match(body.innerHTML, /data-direct-action="clear-meal" disabled/);
  assert.match(body.innerHTML, /data-direct-action="clear-date"/);
  clickAction('clear-date');
  stored = context.AppStorage.read('school-recipe-demand-direct-drafts-v1', {});
  assert.equal(stored[scope], undefined);
  assert.match(body.innerHTML, /data-direct-clear-toggle[^>]+disabled/);
  const emptyDate = '2026-10-01';
  assert.equal(context.SchoolRecipeService.getAll().some((menu) => menu.date === emptyDate), false);
  listeners.click({ target: {
    dataset: { attendanceDate: emptyDate },
    closest(selector) {
      if (selector === '[data-attendance-date]') return this;
      if (selector === '.school-recipe-attendance-date-panel') return {};
      return null;
    }
  } });
  assert.doesNotMatch(body.innerHTML, /school-recipe-direct-actions/);
  assert.doesNotMatch(body.innerHTML, /data-direct-clear-toggle|data-direct-action="submit"/);
  assert.match(body.innerHTML, /school-recipe-attendance-detail-empty"><div class="operation-empty-icon">/);
  assert.doesNotMatch(body.innerHTML, /school-recipe-attendance-detail-scroll|school-recipe-direct-heading/);
});

test('直接填量确认汇总当前食堂多个日期，并按餐次合并相同商品下单', async () => {
  const context = app();
  const service = context.SchoolRecipeDemandService;
  const [firstDate, secondDate] = context.SchoolRecipeService.getAll().slice(0, 2).map((menu) => menu.date);
  const canteen = service.currentCanteen('第一食堂');
  const first = service.buildDirectPreview(firstDate, {}, { canteen }).meals.find((meal) => meal.key === 'breakfast').rows;
  const second = service.buildDirectPreview(secondDate, {}, { canteen }).meals.find((meal) => meal.key === 'breakfast').rows;
  const firstRow = first.find((row) => second.some((candidate) => candidate.productCode === row.productCode && candidate.unit === row.unit));
  const secondRow = second.find((row) => row.productCode === firstRow.productCode && row.unit === firstRow.unit);
  const drafts = {
    [firstDate]: { [firstRow.key]: 2 },
    [secondDate]: { [secondRow.key]: 3 }
  };
  const preview = service.buildDirectDatesPreview([firstDate, secondDate], drafts, { canteen });
  assert.deepEqual(Array.from(preview.dates), [firstDate, secondDate]);
  assert.equal(preview.meals.find((meal) => meal.key === 'breakfast').rows.filter((row) => row.productCode === firstRow.productCode).length, 1);
  assert.equal(preview.meals.find((meal) => meal.key === 'breakfast').rows.find((row) => row.productCode === firstRow.productCode).orderQty, 5);

  context.AppStorage.write('school-recipe-demand-direct-drafts-v1', {
    [`${canteen.id || canteen.name}::${firstDate}`]: drafts[firstDate],
    [`${canteen.id || canteen.name}::${secondDate}`]: drafts[secondDate],
    [`another-canteen::${firstDate}`]: { [firstRow.key]: 99 }
  });
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/utils/recipe-delivery-rule.js'), 'utf8'), context);
  const body = { innerHTML: '' };
  const page = { querySelector(selector) { return selector === '#schoolRecipeDemandConfirmBody' ? body : null; }, addEventListener() {} };
  context.AppShell = { mount() { return { querySelector() { return page; } }; } };
  context.location = { search: `?mode=quantity&date=${secondDate}&canteen=${encodeURIComponent(canteen.id || canteen.name)}` };
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/pages/school-recipe-demand-confirm.js'), 'utf8'), context);
  assert.match(body.innerHTML, /<span class="section-title-mark">用料日期明细<\/span>/);
  assert.match(body.innerHTML, new RegExp(`<td>${firstDate}</td><td class="is-number">1</td>`));
  assert.match(body.innerHTML, new RegExp(`<td>${secondDate}</td><td class="is-number">1</td>`));
  assert.match(body.innerHTML, /填报天数：<strong>2<\/strong>/);
  assert.match(body.innerHTML, /<td class="is-number">5<\/td>/);

  const result = await service.submitDirectDates([firstDate, secondDate], drafts, {
    canteen, expectedAt: `${firstDate} 07:30:00`
  });
  assert.deepEqual(Array.from(result.record.dates), [firstDate, secondDate]);
  assert.equal(result.record.dateSummaries.length, 2);
  const breakfastOrder = result.orders.find((order) => order.mealKey === 'breakfast');
  assert.ok(breakfastOrder);
  assert.deepEqual(Array.from(breakfastOrder.dates), [firstDate, secondDate]);
  assert.equal(context.SchoolOrderService.get(breakfastOrder.orderId).items.find((row) => row.productCode === firstRow.productCode).orderQty, 5);
});

test('食材数量确认页按明细展示日期，可删除日期且至少保留一天', () => {
  const context = app();
  const service = context.SchoolRecipeDemandService;
  const dates = context.SchoolRecipeService.getAll().slice(0, 3).map((menu) => menu.date);
  const canteen = service.currentCanteen('第一食堂');
  const drafts = Object.fromEntries(dates.map((date) => [date, {
    [service.buildDirectPreview(date, {}, { canteen }).meals[0].rows[0].key]: 1
  }]));
  context.AppStorage.write('school-recipe-demand-direct-drafts-v1', Object.fromEntries(dates.map((date) => [
    `${canteen.id || canteen.name}::${date}`, drafts[date]
  ])));
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/utils/recipe-delivery-rule.js'), 'utf8'), context);
  const body = { innerHTML: '', scrollLeft: 0, scrollTop: 0, querySelector() { return null; }, querySelectorAll() { return []; } };
  const listeners = {};
  const page = { querySelector(selector) { return selector === '#schoolRecipeDemandConfirmBody' ? body : null; }, addEventListener(type, handler) { listeners[type] = handler; } };
  context.AppShell = { mount() { return { querySelector() { return page; } }; } };
  context.location = { search: `?mode=quantity&date=${dates[1]}&canteen=${canteen.id}` };
  context.scrollTo = () => {};
  context.requestAnimationFrame = (callback) => callback();
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/pages/school-recipe-demand-confirm.js'), 'utf8'), context);
  assert.match(body.innerHTML, /<th>用料日期<\/th><th>商品种数<\/th><th>操作<\/th>/);
  dates.forEach((date) => assert.ok(body.innerHTML.includes(`<td>${date}</td>`)));
  assert.match(body.innerHTML, /填报天数：<strong>3<\/strong>/);
  const deleteDate = (date, disabled = false) => listeners.click({ target: {
    closest(selector) {
      if (selector === '[data-direct-confirm-meal-tab]') return null;
      return selector === '[data-action]' ? { dataset: { action: 'delete-direct-date', date }, disabled } : null;
    }
  } });
  deleteDate(dates[0]);
  assert.doesNotMatch(body.innerHTML, new RegExp(`<td>${dates[0]}</td>`));
  assert.match(body.innerHTML, /填报天数：<strong>2<\/strong>/);
  deleteDate(dates[1]);
  assert.match(body.innerHTML, /填报天数：<strong>1<\/strong>/);
  assert.match(body.innerHTML, new RegExp(`<td>${dates[2]}</td>[\\s\\S]*?data-action="delete-direct-date" data-date="${dates[2]}" title="至少保留一个填报日期" disabled`));
  const remainingPreview = service.buildDirectDatesPreview([dates[2]], { [dates[2]]: drafts[dates[2]] }, { canteen });
  const remainingTotal = remainingPreview.selectedRows.reduce((sum, row) => sum + row.orderPrice * row.orderQty, 0);
  const formattedTotal = remainingTotal.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  assert.ok(body.innerHTML.includes(`所有餐次合计金额</td><td class="is-number">¥${formattedTotal}</td>`));
  deleteDate(dates[2]);
  assert.match(body.innerHTML, /填报天数：<strong>1<\/strong>/);
  assert.equal(Object.keys(context.AppStorage.read('school-recipe-demand-direct-drafts-v1', {})).length, 3);
});

test('按人员类型拆单时，直接填量分别汇总人员采购量并生成对应订单', async () => {
  const context = app();
  context.DemoStore.updateSettings({ splitOrderByPersonType: true });
  const service = context.SchoolRecipeDemandService;
  const [firstDate, secondDate] = context.SchoolRecipeService.getAll().slice(0, 2).map((menu) => menu.date);
  const canteen = service.currentCanteen('第一食堂');
  const participants = service.participantsFor(canteen);
  assert.ok(participants.length >= 2);
  const firstRow = service.buildDirectPreview(firstDate, {}, { canteen }).meals.find((meal) => meal.key === 'breakfast').rows[0];
  const secondRow = service.buildDirectPreview(secondDate, {}, { canteen }).meals.find((meal) => meal.key === 'breakfast').rows.find((row) => row.productCode === firstRow.productCode);
  assert.ok(secondRow);
  const drafts = {
    [firstDate]: { [`${firstRow.key}::${participants[0].key}`]: 2, [`${firstRow.key}::${participants[1].key}`]: 3 },
    [secondDate]: { [`${secondRow.key}::${participants[0].key}`]: 4, [`${secondRow.key}::${participants[1].key}`]: 5 }
  };
  const preview = service.buildDirectDatesPreview([firstDate, secondDate], drafts, { canteen });
  const row = preview.meals.find((meal) => meal.key === 'breakfast').rows.find((item) => item.productCode === firstRow.productCode);
  assert.equal(row.participantQty[participants[0].key], 6);
  assert.equal(row.participantQty[participants[1].key], 8);
  assert.equal(row.orderQty, 14);
  context.AppStorage.write('school-recipe-demand-direct-drafts-v1', {
    [`${canteen.id || canteen.name}::${firstDate}`]: drafts[firstDate],
    [`${canteen.id || canteen.name}::${secondDate}`]: drafts[secondDate]
  });
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/utils/recipe-delivery-rule.js'), 'utf8'), context);
  const body = { innerHTML: '' };
  const page = { querySelector(selector) { return selector === '#schoolRecipeDemandConfirmBody' ? body : null; }, addEventListener() {} };
  context.AppShell = { mount() { return { querySelector() { return page; } }; } };
  context.location = { search: `?mode=quantity&date=${secondDate}&canteen=${encodeURIComponent(canteen.id || canteen.name)}` };
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/pages/school-recipe-demand-confirm.js'), 'utf8'), context);
  assert.match(body.innerHTML, new RegExp(`${participants[0].label}[^<]*采购量`));
  assert.match(body.innerHTML, new RegExp(`${participants[1].label}[^<]*采购量`));
  assert.match(body.innerHTML, /<td class="is-number">6<\/td><td class="is-number">8<\/td>/);
  const result = await service.submitDirectDates([firstDate, secondDate], drafts, {
    canteen, expectedAt: `${firstDate} 07:30:00`
  });
  const breakfastOrders = result.orders.filter((order) => order.mealKey === 'breakfast');
  assert.equal(breakfastOrders.length, 2);
  assert.deepEqual(breakfastOrders.map((order) => context.SchoolOrderService.get(order.orderId).items.find((item) => item.productCode === firstRow.productCode).orderQty).sort((a, b) => a - b), [6, 8]);
});

test('食材数量按人员类型拆单时订单只关联该类型已填写的日期', async () => {
  const context = app();
  context.DemoStore.updateSettings({ splitOrderByPersonType: true });
  const service = context.SchoolRecipeDemandService;
  const [firstDate, secondDate] = context.SchoolRecipeService.getAll().slice(0, 2).map((menu) => menu.date);
  const canteen = service.currentCanteen('第一食堂');
  const people = service.participantsFor(canteen);
  const first = service.buildDirectPreview(firstDate, {}, { canteen }).meals.find((meal) => meal.key === 'breakfast').rows;
  const second = service.buildDirectPreview(secondDate, {}, { canteen }).meals.find((meal) => meal.key === 'breakfast').rows;
  const firstRow = first.find((row) => second.some((candidate) => candidate.productCode === row.productCode && candidate.unit === row.unit));
  const secondRow = second.find((row) => row.productCode === firstRow.productCode && row.unit === firstRow.unit);
  const drafts = {
    [firstDate]: { [`${firstRow.key}::${people[0].key}`]: 2 },
    [secondDate]: { [`${secondRow.key}::${people[1].key}`]: 3 }
  };
  const result = await service.submitDirectDates([firstDate, secondDate], drafts, {
    canteen, expectedAt: `${firstDate} 07:30:00`
  });
  const breakfastOrders = result.orders.filter((order) => order.mealKey === 'breakfast');
  assert.deepEqual(Array.from(breakfastOrders, (order) => order.dates.join('、')).sort(), [firstDate, secondDate]);
  assert.deepEqual(Array.from(result.record.items.find((item) => item.productCode === firstRow.productCode).sourceDates), [firstDate, secondDate]);
});

test('直接填量在按人员类型拆单时显示各类型输入，清空餐次会一并清理', () => {
  const context = app();
  context.DemoStore.updateSettings({ splitOrderByPersonType: true });
  const date = context.SchoolRecipeService.getAll()[0].date;
  const canteen = context.SchoolRecipeDemandService.currentCanteen('第一食堂');
  const participants = context.SchoolRecipeDemandService.participantsFor(canteen);
  const firstRow = context.SchoolRecipeDemandService.buildDirectPreview(date, {}, { canteen }).meals[0].rows[0];
  const scope = `${canteen.id || canteen.name}::${date}`;
  context.AppStorage.write('school-recipe-demand-direct-drafts-v1', {
    [scope]: {
      [`${firstRow.key}::${participants[0].key}`]: '2',
      [`${firstRow.key}::${participants[1].key}`]: '3'
    }
  });
  context.location = { search: `?mode=quantity&date=${date}` };
  context.addEventListener = () => {};
  context.setTimeout = () => 1;
  context.clearTimeout = () => {};
  context.document = {
    querySelector: () => null,
    createElement: () => ({ setAttribute() {}, remove() {} }),
    body: { appendChild() {} }
  };
  const body = { innerHTML: '' };
  const switcher = { innerHTML: '' };
  const listeners = {};
  const page = { addEventListener(type, handler) { listeners[type] = handler; }, querySelector() { return null; } };
  const rootElement = { querySelector(selector) {
    if (selector === '#schoolRecipeAttendancePage') return page;
    if (selector === '#schoolRecipeAttendanceBody') return body;
    if (selector === '#schoolRecipeEntrySwitch') return switcher;
    return null;
  } };
  context.AppShell = { mount() { return rootElement; } };
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/pages/school-recipe-attendance.js'), 'utf8'), context);
  assert.match(body.innerHTML, new RegExp(`${participants[0].label}[^<]*采购量`));
  assert.match(body.innerHTML, new RegExp(`${participants[1].label}[^<]*采购量`));
  assert.ok(body.innerHTML.includes(`data-direct-quantity="${firstRow.key}::${participants[0].key}"`));
  assert.ok(body.innerHTML.includes(`data-direct-quantity="${firstRow.key}::${participants[1].key}"`));
  listeners.click({ target: { closest(selector) {
    return selector === '[data-direct-action]' ? { dataset: { directAction: 'clear-meal' }, disabled: false } : null;
  } } });
  const saved = context.AppStorage.read('school-recipe-demand-direct-drafts-v1', {});
  assert.equal(saved[scope], undefined);
});
