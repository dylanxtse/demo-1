const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { loadApp, root } = require('./helpers/app-context.cjs');

const demandConfirmServices = [
  'assets/js/data/school-reference-data.js',
  'assets/js/services/school-canteen-config-service.js',
  'assets/js/services/school-recipe-service.js',
  'assets/js/services/school-recipe-attendance-service.js',
  'assets/js/services/school-order-service.js',
  'assets/js/services/operations-service.js',
  'assets/js/services/school-recipe-demand-service.js'
];

function renderDemandConfirmWithPurchaseEditSetting(enabled) {
  const { context } = loadApp({ services: demandConfirmServices });
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/utils/recipe-delivery-rule.js'), 'utf8'), context);
  const menu = context.SchoolRecipeService.getAll()[0];
  const canteen = context.SchoolRecipeDemandService.currentCanteen('第一食堂');
  const participant = context.SchoolRecipeAttendanceService.participantsFor(canteen)[0];
  context.DemoStore.updateSettings({ allowRecipeDemandPurchaseQuantityEdit: enabled });
  context.SchoolRecipeAttendanceService.save(menu.date, {
    [menu.meals[0].key]: { [participant.key]: 1 }
  }, menu.version, canteen);

  const body = { innerHTML: '', querySelector() { return null; }, querySelectorAll() { return []; } };
  const page = { querySelector() { return body; }, addEventListener() {} };
  context.AppShell = { mount() { return { querySelector() { return page; } }; } };
  context.location = { search: `?date=${menu.date}&canteen=${encodeURIComponent(canteen.id || canteen.name)}` };
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/pages/school-recipe-demand-confirm.js'), 'utf8'), context);
  return body.innerHTML;
}

test('采购量修改提示随企业端采购量修改配置显示和隐藏', () => {
  const helpIcon = /school-recipe-demand-purchase-help/;
  assert.match(renderDemandConfirmWithPurchaseEditSetting(true), helpIcon);
  assert.doesNotMatch(renderDemandConfirmWithPurchaseEditSetting(false), helpIcon);
});

test('需求确认金额汇总包含全部餐次，商品小计按采购量计算', () => {
  const { context } = loadApp({ services: [
    'assets/js/data/school-reference-data.js',
    'assets/js/services/school-canteen-config-service.js',
    'assets/js/services/school-recipe-service.js',
    'assets/js/services/school-recipe-attendance-service.js',
    'assets/js/services/school-order-service.js',
    'assets/js/services/operations-service.js',
    'assets/js/services/school-recipe-demand-service.js'
  ] });
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/utils/recipe-delivery-rule.js'), 'utf8'), context);
  const menu = context.SchoolRecipeService.getAll()[0];
  context.DemoStore.updateSettings({ allowClientEditPrice: true, allowRecipeDemandPurchaseQuantityEdit: true });
  const canteen = context.SchoolRecipeDemandService.currentCanteen('第一食堂');
  const participant = context.SchoolRecipeAttendanceService.participantsFor(canteen)[0];
  const meals = Object.fromEntries(menu.meals.slice(0, 2).map((meal) => [meal.key, { [participant.key]: 1 }]));
  context.SchoolRecipeAttendanceService.save(menu.date, meals, menu.version, canteen);
  const preview = context.SchoolRecipeDemandService.buildPreview([menu.date], { canteen });
  const expectedAmount = menu.meals.slice(0, 2).flatMap((meal) =>
    context.SchoolRecipeDemandService.aggregateMealRows(preview, meal.key)
      .filter((row) => row.mappingStatus === '已关联' && Number(row.totalQty) > 0)
  ).reduce((sum, row) => {
    const product = context.SchoolOrderService.getProductCatalog().find((item) => String(item.code || item.id) === String(row.productCode));
    const price = context.SchoolRecipeDemandService.currentSalesPrice(product);
    const demandQty = preview.participants.reduce((total, item) => total + Number(row.participantQty?.[item.key] || 0), 0);
    const purchaseQty = context.SchoolRecipeService.orderQuantityFromDemand(demandQty, product);
    return sum + price * purchaseQty;
  }, 0);
  const subtotalCells = [];
  const mealTotalCell = { textContent: '' };
  const grandTotalCell = { textContent: '' };
  const body = {
    innerHTML: '',
    querySelector(selector) {
      if (selector === '[data-product-meal-total]') return mealTotalCell;
      return selector === '[data-product-grand-total]' ? grandTotalCell : null;
    },
    querySelectorAll(selector) { return selector === '[data-product-subtotal]' ? subtotalCells : []; }
  };
  const listeners = {};
  const page = { querySelector() { return body; }, addEventListener(type, handler) { listeners[type] = handler; } };
  context.AppShell = { mount() { return { querySelector() { return page; } }; } };
  context.location = { search: `?date=${menu.date}&canteen=${encodeURIComponent(canteen.id || canteen.name)}` };
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/pages/school-recipe-demand-confirm.js'), 'utf8'), context);
  assert.match(body.innerHTML, /<h1>菜谱需求确认<\/h1>/);
  assert.doesNotMatch(body.innerHTML, /schoolRecipeExpectedAt|school-recipe-demand-delivery-field/);
  assert.match(body.innerHTML, /填报天数：<\/span><strong>1<\/strong>/);
  assert.match(body.innerHTML, /<th rowspan="2">小计<\/th>/);
  assert.match(body.innerHTML, /<th>需求量<\/th>/);
  assert.match(body.innerHTML, /<span class="config-help school-recipe-demand-purchase-help" data-tooltip="修改数量超出限制范围时将自动回显限制范围的最大\/小数量" tabindex="0" role="img" aria-label="修改数量超出限制范围时将自动回显限制范围的最大\/小数量">\?<\/span>/);
  assert.doesNotMatch(body.innerHTML, /<th>需求总量<\/th>/);
  assert.match(body.innerHTML, /早餐合计金额/);
  assert.match(body.innerHTML, /所有餐次合计金额/);
  assert.match(body.innerHTML, /<tfoot><tr class="school-recipe-demand-product-total-row"><td colspan="\d+">早餐合计金额<\/td><td class="is-number" data-product-meal-total>¥[\d,]+\.\d{2}<\/td><td aria-hidden="true"><\/td><\/tr><tr class="school-recipe-demand-product-total-row is-grand"><td colspan="\d+">所有餐次合计金额<\/td><td class="is-number" data-product-grand-total>¥[\d,]+\.\d{2}<\/td><td aria-hidden="true"><\/td><\/tr><\/tfoot>/);
  const visibleSubtotal = [...body.innerHTML.matchAll(/data-product-subtotal>¥([\d,]+\.\d{2})<\/td>/g)]
    .reduce((sum, match) => sum + Number(match[1].replaceAll(',', '')), 0);
  const mealAmount = Number(body.innerHTML.match(/data-product-meal-total>¥([\d,]+\.\d{2})/)?.[1].replaceAll(',', ''));
  assert.equal(mealAmount, Number(visibleSubtotal.toFixed(2)));
  const displayedAmount = Number(body.innerHTML.match(/data-product-grand-total>¥([\d,]+\.\d{2})/)?.[1].replaceAll(',', ''));
  assert.equal(displayedAmount, Number(expectedAmount.toFixed(2)));
  assert.ok(displayedAmount > mealAmount);
  const firstMealKey = preview.dateSummaries[0].calculation.mealRows[0].key;
  const firstDemandRow = context.SchoolRecipeDemandService.aggregateMealRows(preview, firstMealKey)
    .find((row) => row.mappingStatus === '已关联' && Number(row.totalQty) > 0);
  const firstDemandProduct = context.SchoolOrderService.getProductCatalog().find((item) => String(item.code || item.id) === String(firstDemandRow.productCode));
  const firstDemandRowHtml = body.innerHTML.split('</tr>').find((row) => row.includes(firstDemandRow.productCode));
  const expectedDisplayedDemand = context.SchoolRecipeService.quantityInProductUnit(firstDemandRow.totalQty, firstDemandProduct)
    .toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  assert.match(firstDemandRowHtml, new RegExp(`<td class="is-number">${expectedDisplayedDemand}<\\/td>`));
  const firstPriceInput = body.innerHTML.match(/class="school-recipe-demand-unit-price-input"[^>]*value="([^"]+)"[^>]*data-unit-price-key="([^"]+)"/);
  assert.ok(firstPriceInput);
  const priceInput = {
    dataset: { unitPriceKey: firstPriceInput[2] },
    value: String(Number(firstPriceInput[1]) + 1000), disabled: false,
    classList: { remove() {} }, setCustomValidity() {}, removeAttribute() {},
    closest(selector) { return selector === '[data-unit-price]' ? this : null; }
  };
  listeners.input({ target: priceInput });
  assert.ok(Number(mealTotalCell.textContent.slice(1).replaceAll(',', '')) > mealAmount);
  assert.ok(Number(grandTotalCell.textContent.slice(1).replaceAll(',', '')) > displayedAmount);
  let returnTarget = '';
  context.AppNavigationGuard = { navigate(url) { returnTarget = url; } };
  listeners.click({ target: { closest(selector) {
    return selector === '[data-action]' ? { dataset: { action: 'back' } } : null;
  } } });
  assert.equal(returnTarget, `./school-recipe-attendance.html?mode=people&date=${menu.date}`);
});

test('按日期和餐次移除测算商品，并把手动添加商品带入订单', async () => {
  const { context } = loadApp({ services: [
    'assets/js/data/school-reference-data.js',
    'assets/js/services/school-canteen-config-service.js',
    'assets/js/services/school-recipe-service.js',
    'assets/js/services/school-recipe-attendance-service.js',
    'assets/js/services/school-order-service.js',
    'assets/js/services/operations-service.js',
    'assets/js/services/school-recipe-demand-service.js'
  ] });
  const menu = context.SchoolRecipeService.getAll()[0];
  const canteen = context.SchoolRecipeDemandService.currentCanteen('第一食堂');
  const participants = context.SchoolRecipeAttendanceService.participantsFor(canteen);
  const meals = Object.fromEntries(menu.meals.map((meal) => [meal.key, Object.fromEntries(participants.map((person) => [
    person.key,
    meal.key === menu.meals[0].key ? 1 : 0
  ]))]));
  context.SchoolRecipeAttendanceService.save(menu.date, meals, menu.version, canteen);

  const baseline = context.SchoolRecipeDemandService.buildPreview([menu.date], { canteen });
  const breakfast = baseline.dateSummaries[0].calculation.mealRows[0];
  const removedRow = breakfast.rows.find((row) => row.mappingStatus === '已关联' && Number(row.totalQty) > 0);
  const catalog = context.SchoolOrderService.getProductCatalog();
  const manualProduct = catalog.find((product) => !breakfast.rows.some((row) => row.productCode === product.code));
  assert.ok(removedRow);
  assert.ok(manualProduct);

  const options = {
    canteen,
    demandEditsByDate: {
      [menu.date]: {
        meals: {
          [breakfast.key]: {
            removedProductKeys: [removedRow.key],
            addedProducts: [{ productCode: manualProduct.code, quantity: '2', participantKey: participants[0].key }]
          }
        }
      }
    }
  };
  const preview = context.SchoolRecipeDemandService.buildPreview([menu.date], options);
  const breakfastRows = context.SchoolRecipeDemandService.aggregateMealRows(preview, breakfast.key);
  assert.equal(breakfastRows.some((row) => row.key === removedRow.key), false);
  assert.equal(breakfastRows.find((row) => row.productCode === manualProduct.code)?.totalQty, 2);
  assert.equal(preview.canSubmit, true);

  const result = await context.SchoolRecipeDemandService.submit([menu.date], {
    ...options,
    preview,
    expectedAt: menu.date + ' 07:30:00'
  });
  const generatedOrders = context.SchoolOrderService.getAll().filter((order) => result.orders.some((summary) => summary.orderNo === order.orderNo));
  const generatedLine = generatedOrders.flatMap((order) => order.items || []).find((item) => item.productCode === manualProduct.code);
  assert.equal(generatedLine?.orderQty, 2);
  const removedLine = generatedOrders.flatMap((order) => order.items || []).find((item) => item.productCode === removedRow.productCode && order.mealKey === breakfast.key);
  assert.equal(removedLine, undefined);
});
