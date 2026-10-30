const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { loadApp, root } = require('./helpers/app-context.cjs');

function app() {
  const { context } = loadApp({ services: [
    'assets/js/data/school-reference-data.js',
    'assets/js/services/school-canteen-config-service.js',
    'assets/js/services/school-recipe-service.js',
    'assets/js/services/school-recipe-attendance-service.js',
    'assets/js/services/school-order-service.js',
    'assets/js/services/school-recipe-auxiliary-direct-service.js'
  ] });
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/utils/school-auxiliary-balance.js'), 'utf8'), context);
  return context;
}

test('干调结余按食堂和商品结转，并在扣减后按标品规格采购', () => {
  const context = app();
  const canteen = context.SchoolCanteenConfigService.getCanteen('第一食堂');
  const anotherCanteen = context.SchoolCanteenConfigService.readCanteens().find((item) => item.id !== canteen.id && item.name !== '默认');
  const records = context.DemoStore.get('recipeDemandRecords');
  records.push({ id: 'AUX-BALANCE-1', auxiliary: true, entryMode: 'people',
    canteenId: canteen.id, canteen: canteen.name, dates: ['2026-09-01'],
    balanceRows: [{ productCode: 'SP0300030', unit: 'L', demandQty: 3, purchaseQty: 5 }] });
  context.DemoStore.replace('recipeDemandRecords', records);

  const previous = context.SchoolAuxiliaryBalance.openingBalance(canteen, 'SP0300030', '2026-09-08');
  assert.equal(previous, 2);
  assert.equal(context.SchoolAuxiliaryBalance.openingBalance(anotherCanteen, 'SP0300030', '2026-09-08'), 0);
  assert.equal(context.SchoolAuxiliaryBalance.openingBalance(canteen, 'SP0300031', '2026-09-08'), 0);
  const current = context.SchoolAuxiliaryBalance.calculate(6, previous, 5);
  assert.deepEqual(JSON.parse(JSON.stringify(current)), {
    previousBalance: 2, netDemand: 4, purchaseQty: 5, balanceAfter: 1
  });
  assert.equal(context.SchoolAuxiliaryBalance.calculate(1, current.balanceAfter, 5).purchaseQty, 0);
  context.SchoolOrderService.getAll = () => [{ recipeDemandRecordId: 'AUX-BALANCE-1',
    receiptStatus: '已收货', items: [{ productCode: 'SP0300030', orderQty: 5, acceptedQty: 4, returnQty: 0 }] }];
  assert.equal(context.SchoolAuxiliaryBalance.openingBalance(canteen, 'SP0300030', '2026-09-08'), 1);
});

test('干调填报页与确认页显示上次结余，填报页保持原有采购量测算', () => {
  const context = app();
  context.DemoStore.updateSettings({ splitOrderByPersonType: false, splitOrderByMeal: true });
  const canteen = context.SchoolCanteenConfigService.getCanteen('第一食堂');
  const scope = String(canteen.id || canteen.name);
  const menu = context.SchoolRecipeService.getAll()[0];
  const lunch = menu.meals.find((meal) => meal.key === 'lunch') || menu.meals[0];
  const participant = context.SchoolRecipeAttendanceService.participantsFor(canteen)[0];
  const record = { id: 'AUX-BALANCE-2', auxiliary: true, entryMode: 'people',
    canteenId: canteen.id, canteen: canteen.name, dates: ['2026-08-31'],
    balanceRows: [{ productCode: 'SP0300030', unit: 'L', demandQty: 3, purchaseQty: 5 }] };
  context.DemoStore.replace('recipeDemandRecords', [record]);
  context.AppStorage.write('school-recipe-auxiliary-current-canteen', scope);
  const participants = context.SchoolRecipeAttendanceService.participantsFor(canteen);
  const attendance = Object.fromEntries(menu.meals.map((meal) => [meal.key,
    Object.fromEntries(participants.map((person) => [person.key,
      meal.key === lunch.key && person.key === participant.key ? 500 : 0]))]));
  context.AppStorage.write('school-recipe-auxiliary-attendance-drafts-v1', {
    [scope]: { [menu.date]: { __manual: true, ...attendance } }
  });
  context.AppStorage.write('school-recipe-auxiliary-selected-products-by-meal-v1', {
    [scope]: Object.fromEntries(menu.meals.map((meal) => [meal.key, meal.key === lunch.key ? ['aux-oil'] : []]))
  });
  context.AppStorage.write('school-recipe-auxiliary-default-products-v1', { [scope]: ['aux-oil'] });
  context.AppStorage.write('school-recipe-auxiliary-all-default-products-v1', { [scope]: true });
  context.location = { search: `?mode=people&date=${menu.date}&canteen=${encodeURIComponent(scope)}` };

  let entryHtml = '';
  context.AppShell = { mount({ content }) {
    entryHtml = content;
    return { querySelector() { return null; }, addEventListener() {} };
  } };
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/pages/school-recipe-auxiliary-attendance-people.js'), 'utf8'), context);
  assert.match(entryHtml, /<th>需求量<\/th><th>上次结余<\/th><th>采购量<\/th>/);
  assert.match(entryHtml, /<td class="number">1\.20<\/td><td class="number">0\.40<\/td><td class="number"><span class="school-auxiliary-purchase-quantity" title="1\.00">1\.00<\/span><\/td>/);

  let confirmHtml = '';
  context.AppShell = { mount({ content }) {
    confirmHtml = content;
    return { querySelector() { return null; }, addEventListener() {} };
  } };
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/pages/school-recipe-auxiliary-demand-confirm.js'), 'utf8'), context);
  assert.match(confirmHtml, /<th>需求量<\/th><th>上次结余<\/th><th><div class="school-recipe-demand-purchase-header"><span>采购量<\/span><span class="config-help school-recipe-demand-purchase-help" data-tooltip="修改数量超出限制范围时将自动回显限制范围的最大\/小数量"/);
  assert.match(confirmHtml, /<td>SP0300030<\/td><td>是<\/td><td>桶<\/td>/);
  assert.match(confirmHtml, /<td class="is-number">1\.20<\/td><td class="is-number">0\.40<\/td>/);
  assert.match(confirmHtml, /value="1\.00" data-aux-purchase-quantity/);
  assert.match(confirmHtml, /data-purchase-base-quantity="1\.00"/);
  assert.match(confirmHtml, /data-aux-product-subtotal>¥55\.00<\/td>/);
});

test('干调人数填报按商品单位显示未取整需求并向上取整标品采购', () => {
  const context = app();
  context.DemoStore.updateSettings({ splitOrderByPersonType: false, splitOrderByMeal: true });
  const canteen = context.SchoolCanteenConfigService.getCanteen('第一食堂');
  const scope = String(canteen.id || canteen.name);
  const menu = context.SchoolRecipeService.getAll()[0];
  const lunch = menu.meals.find((meal) => meal.key === 'lunch') || menu.meals[0];
  const participants = context.SchoolRecipeAttendanceService.participantsFor(canteen);
  const selectedParticipant = participants[0];
  const attendance = Object.fromEntries(menu.meals.map((meal) => [meal.key,
    Object.fromEntries(participants.map((person) => [person.key,
      meal.key === lunch.key && person.key === selectedParticipant.key ? 500 : 0]))]));
  context.AppStorage.write('school-recipe-auxiliary-current-canteen', scope);
  context.AppStorage.write('school-recipe-auxiliary-attendance-drafts-v1', {
    [scope]: { [menu.date]: { __manual: true, ...attendance } }
  });
  context.AppStorage.write('school-recipe-auxiliary-selected-products-by-meal-v1', {
    [scope]: Object.fromEntries(menu.meals.map((meal) => [meal.key, meal.key === lunch.key ? ['aux-oil'] : []]))
  });
  context.location = { search: `?mode=people&date=${menu.date}&canteen=${encodeURIComponent(scope)}` };

  let entryHtml = '';
  context.AppShell = { mount({ content }) {
    entryHtml = content;
    return { querySelector() { return null; }, addEventListener() {} };
  } };
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/pages/school-recipe-auxiliary-attendance-people.js'), 'utf8'), context);

  assert.match(entryHtml, /<th>需求量<\/th><th>上次结余<\/th><th>采购量<\/th>/);
  assert.match(entryHtml, /<td>桶<\/td><td class="number">1\.20<\/td><td class="number">0\.00<\/td><td class="number"><span class="school-auxiliary-purchase-quantity" title="2\.00">2\.00<\/span><\/td>/);
});

test('标品按商品单位收货后，结余仍按基础计量单位结转', () => {
  const context = app();
  const canteen = context.SchoolCanteenConfigService.getCanteen('第一食堂');
  context.DemoStore.replace('recipeDemandRecords', [{
    id: 'AUX-PACKED-1', auxiliary: true, entryMode: 'people',
    canteenId: canteen.id, canteen: canteen.name, dates: ['2026-09-01'],
    balanceRows: [{ productCode: 'SP0300030', unit: '桶', demandQty: 3,
      purchaseQty: 1, purchaseBaseQty: 5, packSize: 5, isStandardProduct: true }]
  }]);
  context.SchoolOrderService.getAll = () => [{ recipeDemandRecordId: 'AUX-PACKED-1',
    receiptStatus: '已收货', items: [{ productCode: 'SP0300030', unit: '桶', orderQty: 1,
      acceptedQty: 1, returnQty: 0 }] }];
  assert.equal(context.SchoolAuxiliaryBalance.openingBalance(canteen, 'SP0300030', '2026-09-08'), 2);
});
