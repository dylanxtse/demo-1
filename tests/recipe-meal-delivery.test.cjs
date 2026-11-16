const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { loadApp, root } = require('./helpers/app-context.cjs');

const services = [
  'assets/js/data/school-reference-data.js',
  'assets/js/services/school-canteen-config-service.js',
  'assets/js/services/school-recipe-service.js',
  'assets/js/services/school-recipe-attendance-service.js',
  'assets/js/services/school-order-service.js',
  'assets/js/services/operations-service.js',
  'assets/js/services/school-recipe-demand-service.js',
  'assets/js/services/school-recipe-auxiliary-direct-service.js'
];
const rulesFor = (context) => Object.fromEntries(context.RecipeDeliveryRule.MEALS.map((meal) => [meal.key,
  { days: meal.key === 'breakfast' ? 1 : 0, time: '07:00' }]));
const setup = (splitOrderByMeal = true, splitOrderByPersonType = false) => {
  const loaded = loadApp({ services });
  loaded.context.DemoStore.updateSettings({ recipeDeliveryByMeal: rulesFor(loaded.context), splitOrderByMeal, splitOrderByPersonType });
  return loaded;
};
const sumItems = (orders) => orders.reduce((sum, order) => sum + order.items.reduce((total, row) => total + Number(row.orderQty), 0), 0);

test('六餐次配送规则兼容原统一配置，并正确处理跨月跨年和闰年', () => {
  const { context } = loadApp();
  const rule = context.RecipeDeliveryRule;
  context.DemoStore.updateSettings({ recipeDeliveryAdvanceDays: '2', recipeDeliveryTime: '06:15' });
  assert.equal(rule.isMealBased(), false);
  rule.MEALS.forEach((meal) => assert.equal(rule.expectedAt(['2027-01-01'], meal.key), '2026-12-30 06:15:00'));
  const byMeal = rulesFor(context);
  byMeal.morningSnack = { days: 2, time: '08:10' };
  byMeal.afternoonSnack = { days: 0, time: '11:20' };
  byMeal.eveningSnack = { days: 0, time: '15:40' };
  context.DemoStore.updateSettings({ recipeDeliveryByMeal: byMeal });
  assert.equal(rule.MEALS.length, 6);
  assert.equal(rule.deliveryAt('2027-01-01 07:30:00', 'breakfast'), '2026-12-31 07:30:00');
  assert.equal(rule.deliveryAt('2028-03-01 07:30:00', '早餐'), '2028-02-29 07:30:00');
  assert.equal(rule.deliveryAt('2026-11-08 07:30:00', 'lunch'), '2026-11-08 07:30:00');
  assert.equal(rule.deliveryAt('2026-11-08 07:30:00', 'dinner'), '2026-11-08 07:30:00');
  assert.equal(rule.deliveryAt('2026-11-08 07:30:00', 'morningSnack'), '2026-11-06 07:30:00');
  assert.equal(rule.deliveryAt('2026-11-08 07:30:00', 'snack'), '2026-11-08 07:30:00');
  assert.equal(rule.deliveryAt('2026-11-08 07:30:00', 'eveningSnack'), '2026-11-08 07:30:00');
  assert.equal(rule.expectedAt(['2026-02-30'], 'breakfast'), '');
});

test('按配送时间分配采购量保持总量，标品整数且非标品按存储精度分配', () => {
  const { context } = setup();
  const rule = context.RecipeDeliveryRule;
  const sources = ['2026-11-08', '2026-11-09', '2026-11-10'].map((date) => ({
    date, key: 'lunch', name: '午餐', people: 1,
    rows: [{ productCode: 'standard', unit: '袋', weight: 1 }, { productCode: 'loose', unit: 'KG', weight: 1 }]
  }));
  const groups = rule.splitItems([
    { productCode: 'standard', unit: '袋', orderQty: 5, isStandardProduct: true },
    { productCode: 'loose', unit: 'KG', orderQty: 1, isStandardProduct: false }
  ], sources, true);
  assert.deepEqual(Array.from(groups, (group) => group.items[0].orderQty), [2, 2, 1]);
  assert.equal(Number(groups.reduce((sum, group) => sum + group.items[1].orderQty, 0).toFixed(2)), 1);
});

for (const splitMeal of [true, false]) {
  for (const splitPerson of [true, false]) {
    test(`食材多日直接填量按送达时间拆单并同步企业端：餐次${splitMeal}、人员${splitPerson}`, async () => {
      const { context } = setup(splitMeal, splitPerson);
      const demand = context.SchoolRecipeDemandService;
      const dates = ['2026-11-07', '2026-11-08'];
      const canteen = demand.currentCanteen('第一食堂');
      const person = demand.participantsFor(canteen)[0];
      const drafts = {};
      for (const [date, mealKeys] of [[dates[0], ['lunch', 'dinner']], [dates[1], ['breakfast', 'lunch']]]) {
        const preview = demand.buildDirectPreview(date, {}, { canteen });
        drafts[date] = {};
        mealKeys.forEach((key) => {
          const row = preview.meals.find((meal) => meal.key === key).rows[0];
          drafts[date][row.key + (splitPerson ? `::${person.key}` : '')] = 2;
        });
      }
      const history = JSON.stringify(context.SchoolOrderService.getAll());
      const result = await demand.submitDirectDates(dates, drafts, { canteen, expectedAt: context.RecipeDeliveryRule.expectedAt(dates), expectedAtAutomatic: true });
      assert.deepEqual(Array.from(result.record.expectedAts), ['2026-11-07 07:30:00', '2026-11-08 07:30:00']);
      assert.equal(result.orders.length, splitMeal ? 4 : 3);
      assert.equal(result.orders.filter((order) => order.deliveryAt === '2026-11-07 07:30:00').length, splitMeal ? 3 : 2);
      assert.deepEqual(Array.from(result.record.enterpriseSyncWarnings), []);
      const schoolOrders = result.orders.map((order) => context.SchoolOrderService.get(order.orderId));
      assert.equal(sumItems(schoolOrders), 8);
      result.orders.forEach((index) => {
        const school = context.SchoolOrderService.get(index.orderId);
        const enterprise = context.DemoStore.get('orders').find((order) => order.id === index.enterpriseOrderId);
        assert.equal(enterprise.expectedAt, index.expectedAt);
        assert.equal(school.expectedAt, index.expectedAt);
        assert.equal(school.deliveryAt, index.deliveryAt);
        assert.equal(enterprise.deliveryAt, index.deliveryAt);
        assert.equal(school.recipeDemandDate, index.dates.join('、'));
        context.OrderFlowService.transition('orders', enterprise.id, 'confirm');
        const sorting = context.DemoStore.get('sortingTasks').filter((task) => task.orderId === enterprise.id);
        assert.ok(sorting.length);
        assert.ok(sorting.every((task) => task.expectedAt === index.expectedAt));
        const shipping = context.DemoStore.get('shippingOrders').find((row) => row.orderId === enterprise.id);
        assert.equal(shipping.expectedAt, index.expectedAt);
      });
      const historicalIds = new Set(JSON.parse(history).map((order) => order.id));
      assert.equal(JSON.stringify(context.SchoolOrderService.getAll().filter((order) => historicalIds.has(order.id))), history);
    });
  }
}

test('人数需求多天填报按餐次配送且采购总量与原测算一致', async () => {
  for (const splitMeal of [true, false]) {
    const build = (mealBased) => {
      const { context } = loadApp({ services });
      context.DemoStore.updateSettings({ splitOrderByMeal: splitMeal, splitOrderByPersonType: false,
        ...(mealBased ? { recipeDeliveryByMeal: rulesFor(context) } : {}) });
      const canteen = context.SchoolRecipeDemandService.currentCanteen('第一食堂');
      const participants = context.SchoolRecipeDemandService.participantsFor(canteen);
      ['2026-11-07', '2026-11-08'].forEach((date) => {
        const menu = context.SchoolRecipeService.getMenu(date);
        const counts = Object.fromEntries(menu.meals.map((meal) => [meal.key,
          Object.fromEntries(participants.map((person) => [person.key, ['breakfast', 'lunch', 'dinner'].includes(meal.key) ? 10 : 0]))]));
        context.SchoolRecipeAttendanceService.save(date, counts, menu.version, canteen);
      });
      return { context, canteen };
    };
    const legacy = build(false);
    const current = build(true);
    const dates = ['2026-11-07', '2026-11-08'];
    const oldResult = await legacy.context.SchoolRecipeDemandService.submit(dates, { canteen: legacy.canteen, expectedAt: '2026-11-07 07:30:00' });
    const result = await current.context.SchoolRecipeDemandService.submit(dates, { canteen: current.canteen,
      expectedAt: current.context.RecipeDeliveryRule.expectedAt(dates), expectedAtAutomatic: true });
    assert.ok(result.orders.length > oldResult.orders.length);
    assert.deepEqual(Array.from(result.record.enterpriseSyncWarnings), []);
    const totals = (ctx, data) => {
      const map = new Map();
      data.orders.forEach((index) => ctx.SchoolOrderService.get(index.orderId).items.forEach((item) => {
        map.set(item.productCode, Number(((map.get(item.productCode) || 0) + item.orderQty).toFixed(4)));
      }));
      return Object.fromEntries([...map].sort());
    };
    assert.deepEqual(totals(current.context, result), totals(legacy.context, oldResult));
    const breakfast = result.orders.filter((order) => order.mealKey === 'breakfast');
    if (splitMeal) assert.deepEqual(Array.from(breakfast, (order) => order.deliveryAt).sort(), ['2026-11-06 07:30:00', '2026-11-07 07:30:00']);
  }
});

test('辅料分天分餐次数量订单按对应餐次计算送达时间', async () => {
  const { context } = setup();
  const service = context.SchoolRecipeAuxiliaryDirectService;
  const canteen = context.SchoolRecipeDemandService.currentCanteen('第一食堂');
  const date = '2026-11-08';
  const initial = service.buildPreview(date, canteen);
  const breakfast = initial.meals.find((meal) => meal.key === 'breakfast').rows[0];
  const lunch = initial.meals.find((meal) => meal.key === 'lunch').rows[0];
  const drafts = { [date]: { [breakfast.key]: 2, [lunch.key]: 3 } };
  const result = await service.submitDates([date], canteen, drafts, '2026-11-07 07:00:00', 'daily');
  assert.equal(result.orders.length, 2);
  assert.equal(result.orders.find((order) => order.mealKey === 'breakfast').deliveryAt, '2026-11-06 07:00:00');
  assert.equal(result.orders.find((order) => order.mealKey === 'lunch').deliveryAt, '2026-11-07 07:00:00');
});

test('六餐次配置支持旧值回显、取消、校验、应用和刷新持久化', () => {
  const { context, values: storage } = loadApp();
  context.DemoStore.updateSettings({ recipeDeliveryAdvanceDays: '2', recipeDeliveryTime: '06:20' });
  const controls = new Map();
  const listeners = {};
  const actions = Object.fromEntries(['edit-recipe-delivery', 'apply-recipe-delivery', 'cancel-recipe-delivery', 'edit-recipe-expected', 'apply-recipe-expected', 'cancel-recipe-expected'].map((key) => [key, { hidden: false }]));
  const status = { hidden: true, classList: { toggle() {} } };
  const rootElement = {
    querySelector(selector) {
      const field = selector.match(/^\[data-config="([^"]+)"\]$/)?.[1];
      if (field) return controls.get(field) || null;
      const action = selector.match(/^\[data-action="([^"]+)"\]$/)?.[1];
      if (action) return actions[action];
      if (selector === '.recipe-delivery-row') return { classList: { toggle() {} } };
      if (selector === '#configStatus') return status;
      return null;
    },
    querySelectorAll(selector) { return selector === '[data-config]' ? [...controls.values()] : []; },
    addEventListener(type, listener) { listeners[type] = listener; }
  };
  let markup = '';
  context.AppShell = { mount({ content }) {
    markup = content;
    for (const match of content.matchAll(/<input[^>]*data-config="([^"]+)"[^>]*>/g)) {
      const [html, key] = match;
      controls.set(key, { dataset: { config: key }, value: '', type: html.match(/type="([^"]+)"/)?.[1] || 'text',
        matches(selector) { return selector === '[data-config], [data-radio-config]' || selector === '.config-input'; },
        focus() { this.focused = true; } });
    }
    return rootElement;
  } };
  context.setTimeout = () => 0;
  context.clearTimeout = () => {};
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/pages/system-config.js'), 'utf8'), context);
  const click = (action) => listeners.click({ target: { closest: (selector) => selector === `[data-action="${action}"]` ? actions[action] : null } });
  const day = controls.get('recipeDelivery_breakfast_days');
  assert.equal(controls.has('recipeDelivery_breakfast_time'), false);
  assert.equal((markup.match(/class="recipe-delivery-meal-name"/g) || []).length, 6);
  assert.equal(day.value, 1);
  assert.equal(day.readOnly, true);
  click('edit-recipe-delivery');
  assert.equal(day.readOnly, false);
  day.value = '1';
  listeners.input({ target: day });
  assert.equal(context.RecipeDeliveryRule.isMealBased(), false);
  click('cancel-recipe-delivery');
  assert.equal(day.value, 1);
  click('edit-recipe-delivery');
  day.value = '-1';
  click('apply-recipe-delivery');
  assert.match(status.textContent, /早餐.*整数/);
  assert.equal(context.RecipeDeliveryRule.isMealBased(), false);
  day.value = '1.5';
  click('apply-recipe-delivery');
  assert.equal(context.RecipeDeliveryRule.isMealBased(), false);
  day.value = '366';
  click('apply-recipe-delivery');
  assert.equal(context.RecipeDeliveryRule.isMealBased(), false);
  day.value = '1';
  context.RecipeDeliveryRule.MEALS.forEach((meal) => {
    controls.get(`recipeDelivery_${meal.key}_days`).value = meal.key === 'breakfast' ? '1' : '0';
  });
  const unrelated = controls.get('orderCutoffDays');
  unrelated.value = '3';
  listeners.input({ target: unrelated });
  assert.equal(context.RecipeDeliveryRule.isMealBased(), false, '编辑中的餐次配置不能随其他配置保存');
  click('apply-recipe-delivery');
  assert.equal(day.readOnly, true);
  assert.equal(context.RecipeDeliveryRule.isMealBased(), true);
  assert.equal(Object.keys(context.DemoStore.getSettings().recipeDeliveryByMeal).length, 6);
  const reloaded = loadApp({ storage: Object.fromEntries(storage) }).context;
  assert.equal(reloaded.RecipeDeliveryRule.expectedAt(['2026-11-08']), '2026-11-06 06:20:00');
  assert.equal(reloaded.RecipeDeliveryRule.deliveryAt('2026-11-08 06:20:00', 'breakfast'), '2026-11-07 06:20:00');
  assert.equal(reloaded.RecipeDeliveryRule.deliveryAt('2026-11-07 06:20:00', 'lunch'), '2026-11-07 06:20:00');
  assert.match(markup, /需求填报下单送达时间/);
  assert.match(markup, /订单配送日期/);
  assert.equal(Object.keys(context.DemoStore.getSettings().recipeDeliveryByMeal.breakfast).join(','), 'days');
  assert.match(markup, /期望送达日期前/);
  const uniformDays = controls.get('recipeDeliveryAdvanceDays');
  const uniformTime = controls.get('recipeDeliveryTime');
  assert.equal(uniformDays.readOnly, true);
  click('edit-recipe-expected');
  assert.equal(uniformDays.readOnly, false);
  uniformDays.value = '1';
  uniformTime.value = '05:20';
  listeners.input({ target: uniformTime });
  assert.equal(context.DemoStore.getSettings().recipeDeliveryTime, '06:20');
  click('cancel-recipe-expected');
  assert.equal(uniformDays.value, '2');
  assert.equal(uniformTime.value, '06:20');
  const mealRules = JSON.stringify(context.DemoStore.getSettings().recipeDeliveryByMeal);
  click('edit-recipe-expected');
  uniformDays.value = '1';
  uniformTime.value = '05:20';
  click('apply-recipe-expected');
  assert.equal(uniformDays.readOnly, true);
  assert.equal(context.RecipeDeliveryRule.expectedAt(['2026-11-08']), '2026-11-07 05:20:00');
  assert.equal(JSON.stringify(context.DemoStore.getSettings().recipeDeliveryByMeal), mealRules);

});

for (const mode of ['simple', 'combined', 'no-meal']) {
  test(`无餐次${mode}订单沿用下单期望送达时间并传递到仓内作业`, async () => {
    const { context } = setup();
    const service = context.SchoolRecipeAuxiliaryDirectService;
    const canteen = context.SchoolRecipeDemandService.currentCanteen('第一食堂');
    const date = '2026-11-08';
    const expectedAt = `${date} 16:28:45`;
    const product = service.catalogProducts(canteen, true)[0];
    const quantities = { [product.code]: 2 };
    const result = mode === 'simple'
      ? await service.submitSimple(canteen, quantities, expectedAt)
      : await service.submitDates([date], canteen,
        mode === 'combined' ? { dates: [date], quantities } : { [date]: quantities }, expectedAt, mode);
    assert.ok(result.orders.length);
    assert.deepEqual(Array.from(result.record.enterpriseSyncWarnings), []);
    result.orders.forEach((index) => {
      const school = context.SchoolOrderService.get(index.orderId);
      const enterprise = context.DemoStore.get('orders').find((order) => order.id === index.enterpriseOrderId);
      assert.ok(!school.mealKey && !school.mealName);
      assert.equal(school.expectedAt, expectedAt);
      assert.equal(index.expectedAt, expectedAt);
      assert.equal(school.deliveryAt, expectedAt);
      assert.equal(enterprise.deliveryAt, expectedAt);
      assert.equal(enterprise.expectedAt, expectedAt);
      context.OrderFlowService.transition('orders', enterprise.id, 'confirm');
      const tasks = context.DemoStore.get('sortingTasks').filter((task) => task.orderId === enterprise.id);
      assert.ok(tasks.length);
      assert.ok(tasks.every((task) => task.expectedAt === expectedAt));
      assert.equal(context.DemoStore.get('shippingOrders').find((order) => order.orderId === enterprise.id).expectedAt, expectedAt);
    });
  });
}

test('普通无餐次学校订单不受餐次配送配置变更影响', () => {
  const { context } = setup();
  const catalog = context.SchoolOrderService.getProductCatalog();
  const product = catalog[0];
  const expectedAt = '2026-11-09 13:25:46';
  const order = context.SchoolOrderService.create({ canteen: '第一食堂', expectedAt, mealName: '',
    items: [{ productCode: product.code, productName: product.name, unit: product.unit, orderQty: 2,
      orderPrice: context.SchoolOrderService.currentSalesPrice(product) || 1 }] });
  assert.ok(!order.mealName && !order.mealKey);
  assert.equal(order.expectedAt, expectedAt);
  const changed = rulesFor(context);
  changed.breakfast = { days: 7, time: '01:00' };
  context.DemoStore.updateSettings({ recipeDeliveryByMeal: changed });
  assert.equal(context.SchoolOrderService.get(order.id).expectedAt, expectedAt);
});

test('统一配置生成期望送达时间，餐次配置基于该时间生成独立仓库配送时间', async () => {
  const { context } = setup();
  context.DemoStore.updateSettings({ recipeDeliveryAdvanceDays: '1', recipeDeliveryTime: '09:20' });
  const demand = context.SchoolRecipeDemandService;
  const date = '2026-11-08';
  const canteen = demand.currentCanteen('第一食堂');
  const preview = demand.buildDirectPreview(date, {}, { canteen });
  const row = preview.meals.find((meal) => meal.key === 'breakfast').rows[0];
  const generated = await demand.submitDirectDates([date], { [date]: { [row.key]: 2 } }, { canteen });
  const index = generated.orders[0];
  const school = context.SchoolOrderService.get(index.orderId);
  const enterprise = context.DemoStore.get('orders').find((order) => order.id === index.enterpriseOrderId);
  assert.equal(school.expectedAt, '2026-11-07 09:20:00');
  assert.equal(school.deliveryAt, '2026-11-06 09:20:00');
  assert.equal(enterprise.expectedAt, school.expectedAt);
  assert.equal(enterprise.deliveryAt, school.deliveryAt);
  assert.equal(generated.record.expectedAt, school.expectedAt);
  assert.deepEqual(Array.from(generated.record.deliveryAts), [school.deliveryAt]);

  const explicitExpectedAt = '2026-11-08 18:25:36';
  const selected = await demand.submitDirectDates([date], { [date]: { [row.key]: 3 } }, { canteen, expectedAt: explicitExpectedAt });
  const manualOrder = context.SchoolOrderService.get(selected.orders[0].orderId);
  assert.equal(manualOrder.expectedAt, explicitExpectedAt);
  assert.equal(manualOrder.deliveryAt, '2026-11-07 18:25:36');
});

test('企业下单保存配送快照，编辑订单不能修改餐次和日期', async () => {
  const { context, values } = setup();
  const payload = { customerName: '静安第一中学', canteen: '第一食堂', orderTag: '其他-不区分',
    expectedAt: '2026-11-08 16:35:42', mealKey: 'breakfast', mealName: '早餐',
    items: [{ productId: 'SP0300019', goodsCode: 'SP0300019', goodsName: '大白菜', unit: '斤', quantity: 2, unitPrice: 1.5 }] };
  const order = await context.OperationsService.create('orders', payload);
  assert.equal(order.expectedAt, payload.expectedAt);
  assert.equal(order.deliveryAt, '2026-11-07 16:35:42');
  let updated = await context.OperationsService.update('orders', order.id, { expectedAt: '2026-11-10 16:35:42' });
  assert.equal(updated.expectedAt, payload.expectedAt);
  assert.equal(updated.deliveryAt, order.deliveryAt);
  updated = await context.OperationsService.update('orders', order.id, { mealKey: '', mealName: '' });
  assert.equal(updated.deliveryAt, order.deliveryAt);
  assert.equal(updated.mealKey, 'breakfast');
  assert.equal(updated.mealName, '早餐');
  const reloaded = loadApp({ storage: Object.fromEntries(values) }).context.DemoStore.get('orders').find((row) => row.id === order.id);
  assert.equal(reloaded.expectedAt, updated.expectedAt);
  assert.equal(reloaded.deliveryAt, updated.deliveryAt);
  const noMeal = await context.OperationsService.create('orders', { ...payload, mealKey: '', mealName: '', deliveryAt: '2026-11-01 01:00:00' });
  assert.equal(noMeal.deliveryAt, payload.expectedAt);
});

test('早餐配送提前天数默认为1天，手动保存的0天仍优先使用', () => {
  const { context } = loadApp();
  const rule = context.RecipeDeliveryRule;
  assert.equal(rule.getConfig('breakfast').days, 1);
  assert.equal(rule.getConfig('早餐').days, 1);
  assert.equal(rule.getConfig('lunch').days, 0);
  assert.equal(rule.getConfig().days, 0, '需求填报统一期望送达时间配置保持原默认值');
  assert.equal(rule.deliveryAt('2026-11-17 07:30:00', 'breakfast'), '2026-11-16 07:30:00');
  context.DemoStore.updateSettings({ recipeDeliveryAdvanceDays: '3' });
  assert.equal(rule.getConfig('lunch').days, 0, '餐次提前天数不继承需求填报期望时间的提前天数');
  context.DemoStore.updateSettings({ recipeDeliveryByMeal: { breakfast: { days: 0, time: '08:15' } } });
  assert.equal(rule.getConfig('breakfast').days, 0);
  assert.equal(Object.hasOwn(rule.getConfig('breakfast'), 'time'), false);
  assert.equal(rule.deliveryAt('2026-11-17 07:30:00', 'breakfast'), '2026-11-17 07:30:00');
});
