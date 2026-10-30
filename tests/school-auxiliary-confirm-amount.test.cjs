const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { loadApp, root } = require('./helpers/app-context.cjs');

const date = '2026-09-11';
const parseMoney = (value) => Number(String(value || '').replaceAll(',', ''));

function renderConfirm(splitPerson = false, selectedIds, selectedByMeal) {
  const context = loadApp({ services: [
    'assets/js/data/school-reference-data.js',
    'assets/js/services/school-canteen-config-service.js',
    'assets/js/services/school-recipe-service.js',
    'assets/js/services/school-recipe-attendance-service.js',
    'assets/js/services/school-order-service.js',
    'assets/js/services/operations-service.js',
    'assets/js/services/school-recipe-auxiliary-direct-service.js'
  ] }).context;
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/utils/recipe-delivery-rule.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/utils/school-auxiliary-balance.js'), 'utf8'), context);
  context.DemoStore.updateSettings({ splitOrderByMeal: true, splitOrderByPersonType: splitPerson, allowClientEditPrice: true });
  const canteen = context.SchoolCanteenConfigService.getCanteen('第一食堂');
  const participant = context.SchoolRecipeAttendanceService.participantsFor(canteen)[0];
  const scope = String(canteen.id || canteen.name);
  if (selectedIds) context.AppStorage.write('school-recipe-auxiliary-selected-products-v1', { [scope]: selectedIds });
  if (selectedByMeal) context.AppStorage.write('school-recipe-auxiliary-selected-products-by-meal-v1', { [scope]: selectedByMeal });
  context.AppStorage.write('school-recipe-auxiliary-attendance-drafts-v1', {
    [scope]: { [date]: {
      breakfast: { [participant.key]: 10 },
      lunch: { [participant.key]: 20 }
    } }
  });
  context.location = { search: `?mode=people&date=${date}&canteen=${canteen.id}` };
  let confirmSubmit = null;
  const confirmButton = { disabled: false, textContent: '', focus() {},
    addEventListener(type, handler) { if (type === 'click') confirmSubmit = handler; } };
  const modal = { querySelector(selector) { return selector === '[data-modal-confirm]' ? confirmButton : null; } };
  const backdrop = { querySelector() { return modal; }, addEventListener() {}, setAttribute() {}, remove() {} };
  context.document = {
    querySelector() { return null; },
    createElement() { return backdrop; },
    body: { appendChild() {} }
  };
  context.setTimeout = () => 0;
  context.clearTimeout = () => {};
  const listeners = {};
  const cells = [{ textContent: '' }, { textContent: '' }];
  const mealTotalCell = { textContent: '' };
  const grandTotalCell = { textContent: '' };
  let html = '';
  const page = {
    get outerHTML() { return html; },
    set outerHTML(value) { html = value; }
  };
  context.AppShell = { mount({ content }) {
    html = content;
    return {
      querySelector(selector) {
        if (selector === '#schoolRecipeAuxiliaryDemandConfirmPage') return page;
        if (selector === '[data-aux-meal-total]') return mealTotalCell;
        if (selector === '[data-aux-grand-total]') return grandTotalCell;
        return null;
      },
      querySelectorAll(selector) { return selector === '[data-aux-product-subtotal]' ? cells : []; },
      addEventListener(type, handler) { listeners[type] = handler; }
    };
  } };
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/pages/school-recipe-auxiliary-demand-confirm.js'), 'utf8'), context);
  return { get html() { return html; }, listeners, cells, mealTotalCell, grandTotalCell,
    context, confirmSubmit: () => { assert.ok(confirmSubmit, '应打开提交确认弹窗'); confirmSubmit(); } };
}

test('商品需求确认页的小计与两行合计按采购量计算，隐藏送达时间字段', () => {
  for (const splitPerson of [false, true]) {
    const { html } = renderConfirm(splitPerson);
    assert.doesNotMatch(html, /<th rowspan="2">辅料<\/th>/);
    assert.match(html, /<h1>干调需求确认<\/h1>/);
    assert.match(html, /<th rowspan="2">小计<\/th>/);
    assert.match(html, /<th rowspan="2">单位<\/th>/);
    assert.match(html, /<th rowspan="2">编号<\/th><th rowspan="2">是否标品<\/th><th rowspan="2">单位<\/th>/);
    assert.match(html, /<td>SP0300030<\/td><td>是<\/td><td>桶<\/td>/);
    assert.match(html, /<td>SP0300847<\/td><td>是<\/td><td>袋<\/td>/);
    assert.match(html, /<th>需求量<\/th>/);
    assert.match(html, /<td class="is-number">0\.05<\/td>/);
    if (splitPerson) {
      assert.match(html, /value="1\.00" data-aux-purchase-quantity/);
      assert.match(html, /data-aux-product-subtotal>¥55\.00<\/td>/);
      assert.match(html, /<td class="is-number">[\d,.]+<\/td><td class="is-number school-recipe-demand-purchase-cell">/);
      assert.doesNotMatch(html, /<th>上次结余<\/th>/);
    } else {
      assert.match(html, /value="0\.00" data-aux-purchase-quantity/);
      assert.match(html, /<td class="is-number">[\d,.]+<\/td><td class="is-number">[\d,.]+ (?:L|kg)<\/td><td class="is-number school-recipe-demand-purchase-cell">/);
      assert.match(html, /<th>上次结余<\/th>/);
    }
    assert.doesNotMatch(html, /schoolRecipeAuxiliaryExpectedAt|school-recipe-demand-delivery-field/);
    assert.match(html, /填报天数：<\/span><strong>1<\/strong>/);
    assert.match(html, /午餐合计金额/);
    assert.match(html, /所有餐次合计金额/);
    const subtotalValues = [...html.matchAll(/data-aux-product-subtotal>¥([\d,]+\.\d{2})<\/td>/g)].map((match) => parseMoney(match[1]));
    const mealTotal = parseMoney(html.match(/data-aux-meal-total>¥([\d,]+\.\d{2})/)?.[1]);
    const grandTotal = parseMoney(html.match(/data-aux-grand-total>¥([\d,]+\.\d{2})/)?.[1]);
    assert.equal(subtotalValues.length, 2);
    assert.equal(mealTotal, Number(subtotalValues.reduce((sum, value) => sum + value, 0).toFixed(2)));
    assert.ok(grandTotal >= mealTotal);
    assert.match(html, new RegExp(`<tfoot><tr class="school-recipe-demand-product-total-row"><td colspan="${splitPerson ? 10 : 9}">午餐合计金额`));
  }
});

test('按需求人数计算基础用量，并按整桶整袋生成订单和结余记录', async () => {
  const confirmation = renderConfirm(false);
  const { context, listeners } = confirmation;
  context.DemoStore.replace('recipeDemandRecords', []);
  const existingRecords = new Set(context.DemoStore.get('recipeDemandRecords').map((record) => record.id));
  listeners.click({ target: { closest(selector) {
    return selector === '[data-action="submit"]' ? {} : null;
  } } });
  confirmation.confirmSubmit();
  for (let attempt = 0; attempt < 10; attempt += 1) {
    if (context.DemoStore.get('recipeDemandRecords').some((record) => !existingRecords.has(record.id) && record.balanceRows)) break;
    await new Promise((resolve) => setImmediate(resolve));
  }
  const record = context.DemoStore.get('recipeDemandRecords').find((item) => !existingRecords.has(item.id));
  assert.ok(record?.balanceRows, '应保存新需求的基础用量和采购量');
  const order = context.SchoolOrderService.getAll().find((item) => item.recipeDemandRecordId === record.id
    && item.mealKey === 'breakfast');
  assert.ok(order, JSON.stringify({ recordOrders: record.orders, orders: context.SchoolOrderService.getAll()
    .filter((item) => item.recipeDemandRecordId === record.id)
    .map((item) => ({ mealKey: item.mealKey, items: item.items.map((line) => [line.productCode, line.orderQty]) })) }));
  const oil = order.items.find((item) => item.productCode === 'SP0300030');
  const salt = order.items.find((item) => item.productCode === 'SP0300847');
  assert.equal(oil.unit, '桶');
  assert.equal(oil.orderQty, 1);
  assert.equal(oil.orderSubtotal, 55);
  assert.equal(salt.unit, '袋');
  assert.equal(salt.orderQty, 1);
  const oilBalance = record.balanceRows.find((item) => item.productCode === 'SP0300030');
  assert.equal(oilBalance.demandQty, 0.36);
  assert.equal(oilBalance.purchaseQty, 1);
  assert.equal(oilBalance.purchaseBaseQty, 5);
  assert.equal(oilBalance.unit, '桶');
  assert.equal(Object.hasOwn(oilBalance, 'purchaseUnit'), false);
});

test('修改单价或采购量时，小计和两行合计立即更新', () => {
  const { html, listeners, cells, mealTotalCell, grandTotalCell } = renderConfirm(true);
  const initialMealTotal = parseMoney(html.match(/data-aux-meal-total>¥([\d,]+\.\d{2})/)?.[1]);
  const priceKey = html.match(/data-aux-unit-price data-unit-price-key="([^"]+)"/)?.[1];
  const quantityKey = html.match(/data-aux-purchase-quantity data-purchase-key="([^"]+)"/)?.[1];
  assert.ok(priceKey);
  assert.ok(quantityKey);
  const input = (selector, dataset, value) => ({
    dataset, value, disabled: false,
    classList: { remove() {} }, setAttribute() {},
    matches(candidate) { return candidate === selector; },
    closest(candidate) { return candidate === '[data-aux-unit-price], [data-aux-purchase-quantity]' ? this : null; }
  });
  listeners.input({ target: input('[data-aux-unit-price]', { unitPriceKey: priceKey }, '110') });
  const increasedMealTotal = parseMoney(mealTotalCell.textContent.slice(1));
  assert.ok(increasedMealTotal > initialMealTotal);
  assert.ok(parseMoney(cells[0].textContent.slice(1)) > 0);
  listeners.input({ target: input('[data-aux-purchase-quantity]', { purchaseKey: quantityKey }, '0') });
  assert.equal(cells[0].textContent, '¥0.00');
  assert.ok(parseMoney(mealTotalCell.textContent.slice(1)) < increasedMealTotal);
  assert.ok(parseMoney(grandTotalCell.textContent.slice(1)) > parseMoney(mealTotalCell.textContent.slice(1)));
});

test('人数填报新增的干调商品可进入需求确认并计算金额', () => {
  const { html } = renderConfirm(false, ['aux-simple-47']);
  assert.match(html, /藤椒油/);
  assert.match(html, /SP0390047/);
  assert.ok(parseMoney(html.match(/data-aux-grand-total>¥([\d,]+\.\d{2})/)?.[1]) > 0);
});

test('干调商品按餐次独立显示和移除，确认页当前餐次最后一项不可移除', () => {
  const confirmation = renderConfirm(false, undefined, {
    breakfast: ['aux-oil'],
    lunch: ['aux-salt', 'aux-simple-47']
  });
  const { listeners } = confirmation;
  assert.match(confirmation.html, /data-product-key="aux-salt"[^>]*>移除<\/button>/);
  assert.match(confirmation.html, /data-product-key="aux-simple-47"[^>]*>移除<\/button>/);

  const removeButton = { disabled: false, dataset: { productKey: 'aux-salt', productName: '盐' } };
  listeners.click({ target: { closest(selector) { return selector === '[data-action="remove-product"]' ? removeButton : null; } } });
  listeners.click({ target: { closest(selector) { return selector === '[data-meal]' ? { dataset: { meal: 'breakfast' } } : null; } } });
  assert.match(confirmation.html, /data-product-key="aux-oil"/);
  assert.doesNotMatch(confirmation.html, /data-product-key="aux-salt"/);
  listeners.click({ target: { closest(selector) { return selector === '[data-meal]' ? { dataset: { meal: 'lunch' } } : null; } } });
  assert.doesNotMatch(confirmation.html, /data-product-key="aux-salt"/);
  assert.match(confirmation.html, /data-product-key="aux-simple-47"[^>]*disabled[^>]*>移除<\/button>/);
});
