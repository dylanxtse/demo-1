const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { loadApp, root } = require('./helpers/app-context.cjs');

const services = [
  'assets/js/utils/dom.js',
  'assets/js/data/school-reference-data.js',
  'assets/js/services/school-canteen-config-service.js',
  'assets/js/services/school-recipe-service.js',
  'assets/js/services/school-recipe-attendance-service.js',
  'assets/js/services/school-order-service.js',
  'assets/js/services/operations-service.js',
  'assets/js/services/school-recipe-demand-service.js'
];

test('菜谱人数填报需求量和采购量按商品计量单位显示且不附单位', () => {
  const context = loadApp({ services }).context;
  const date = '2026-09-07';
  const menu = context.SchoolRecipeService.getMenu(date);
  const canteen = context.SchoolCanteenConfigService.getCanteen('第一食堂');
  const participants = context.SchoolRecipeAttendanceService.participantsFor(canteen);
  const meals = Object.fromEntries(menu.meals.map((meal) => [meal.key, Object.fromEntries(
    participants.map((participant) => [participant.key, 100])
  )]));
  context.SchoolRecipeAttendanceService.save(date, meals, menu.version, canteen);
  const calculation = context.SchoolRecipeAttendanceService.calculate(
    menu,
    context.SchoolRecipeAttendanceService.get(date, canteen),
    { canteen, participants }
  );
  const breakfast = calculation.mealRows.find((meal) => meal.key === 'breakfast');
  const flour = breakfast.rows.find((row) => row.productCode === 'SP0300016');
  const milk = breakfast.rows.find((row) => row.productCode === 'SP0300037');
  assert.ok(flour);
  assert.ok(milk);
  assert.equal(flour.quantityUnit, 'content');
  assert.equal(flour.demandUnit, 'kg');
  assert.equal(milk.demandUnit, 'L');

  const body = { innerHTML: '' };
  const entrySwitch = { innerHTML: '' };
  const page = { addEventListener() {}, querySelectorAll() { return []; } };
  const rootElement = {
    querySelector(selector) {
      if (selector === '#schoolRecipeAttendancePage') return page;
      if (selector === '#schoolRecipeAttendanceBody') return body;
      if (selector === '#schoolRecipeEntrySwitch') return entrySwitch;
      return null;
    }
  };
  context.location = { search: `?mode=people&date=${date}` };
  context.addEventListener = () => {};
  context.AppShell = { mount() { return rootElement; } };
  vm.runInContext(
    fs.readFileSync(path.join(root, 'assets/js/pages/school-recipe-attendance.js'), 'utf8'),
    context,
    { filename: 'assets/js/pages/school-recipe-attendance.js' }
  );

  assert.match(body.innerHTML, /<th rowspan="2">计量单位<\/th>/);
  assert.match(body.innerHTML, /<th>需求量<\/th>/);
  const renderedRows = body.innerHTML.split('</tr>');
  const flourRow = renderedRows.find((row) => row.includes('SP0300016'));
  assert.ok(flourRow, '应显示面粉商品行');
  assert.match(flourRow, /<td>袋<\/td>/);
  const formatQuantity = (value) => value.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: false
  });
  const flourProduct = context.SchoolOrderService.getProductCatalog().find((product) => product.code === flour.productCode);
  assert.equal(flourProduct.unit, '袋');
  assert.equal(flourProduct.spec, '25kg');
  assert.equal(Object.hasOwn(flourProduct, 'measurementUnit'), false);
  assert.equal(Object.hasOwn(flourProduct, 'purchaseUnit'), false);
  const expectedDemand = formatQuantity(context.SchoolRecipeService.quantityInProductUnit(flour.totalQty, flourProduct));
  const expectedPurchase = formatQuantity(context.SchoolRecipeService.orderQuantityFromDemand(flour.totalQty, flourProduct));
  assert.ok(flourRow.includes(`<td class="is-number">${expectedDemand}</td>`));
  assert.ok(flourRow.includes(`<td class="is-number">${expectedPurchase}</td>`));
  assert.doesNotMatch(flourRow, /<td class="is-number">[^<]* (?:kg|袋)<\/td>/);

  const milkRow = renderedRows.find((row) => row.includes('SP0300037'));
  assert.ok(milkRow, '应显示牛奶商品行');
  const milkProduct = context.SchoolOrderService.getProductCatalog().find((product) => product.code === milk.productCode);
  assert.equal(milkProduct.unit, '瓶');
  assert.equal(milkProduct.spec, '250ml');
  const expectedMilkDemand = formatQuantity(context.SchoolRecipeService.quantityInProductUnit(milk.totalQty, milkProduct));
  assert.match(milkRow, /<td>瓶<\/td>/);
  assert.ok(milkRow.includes(`<td class="is-number">${expectedMilkDemand}</td>`));
  const expectedMilkPurchase = formatQuantity(context.SchoolRecipeService.orderQuantityFromDemand(milk.totalQty, milkProduct));
  assert.ok(milkRow.includes(`<td class="is-number">${expectedMilkPurchase}</td>`));
  assert.doesNotMatch(milkRow, /<td class="is-number">[^<]* (?:L|瓶)<\/td>/);
});

test('商品计量单位换算不对需求量取整，标品采购量按单位向上取整', () => {
  const { context } = loadApp({ services: ['assets/js/services/school-recipe-service.js'] });
  const service = context.SchoolRecipeService;
  const oil = { unit: '桶', spec: '5L/桶', isStandardProduct: true };
  assert.equal(service.quantityInProductUnit(4, oil), 0.8);
  assert.equal(service.orderQuantityFromDemand(4, oil), 1);
  const milk = { unit: '瓶', spec: '250ml' };
  assert.equal(service.productUnitFactor(milk), 250);
  assert.equal(service.convertGramsToProductUnit(500, milk), 2);

  const flour = { unit: '斤', isStandardProduct: true };
  assert.equal(service.quantityInProductUnit(2.96, flour), 2.96);
  assert.equal(service.orderQuantityFromDemand(2.96, flour), 3);
});
