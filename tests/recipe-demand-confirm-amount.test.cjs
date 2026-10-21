const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { loadApp, root } = require('./helpers/app-context.cjs');

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
  context.DemoStore.updateSettings({ allowClientEditPrice: true });
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
    const purchaseQty = product?.isStandardProduct ? Math.ceil(demandQty) : demandQty;
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
  assert.match(body.innerHTML, /<h1>食材需求确认<\/h1>/);
  assert.doesNotMatch(body.innerHTML, /schoolRecipeExpectedAt|school-recipe-demand-delivery-field/);
  assert.match(body.innerHTML, /填报天数：<\/span><strong>1<\/strong>/);
  assert.match(body.innerHTML, /<th rowspan="2">小计<\/th>/);
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
