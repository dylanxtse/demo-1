const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { loadApp, root } = require('./helpers/app-context.cjs');

const date = '2026-09-11';
const parseMoney = (value) => Number(String(value || '').replaceAll(',', ''));

function renderConfirm(splitPerson = false) {
  const context = loadApp({ services: [
    'assets/js/data/school-reference-data.js',
    'assets/js/services/school-canteen-config-service.js',
    'assets/js/services/school-recipe-service.js',
    'assets/js/services/school-recipe-attendance-service.js',
    'assets/js/services/school-order-service.js',
    'assets/js/services/operations-service.js'
  ] }).context;
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/utils/recipe-delivery-rule.js'), 'utf8'), context);
  context.DemoStore.updateSettings({ splitOrderByMeal: true, splitOrderByPersonType: splitPerson, allowClientEditPrice: true });
  const canteen = context.SchoolCanteenConfigService.getCanteen('第一食堂');
  const participant = context.SchoolRecipeAttendanceService.participantsFor(canteen)[0];
  const scope = String(canteen.id || canteen.name);
  context.AppStorage.write('school-recipe-auxiliary-attendance-drafts-v1', {
    [scope]: { [date]: {
      breakfast: { [participant.key]: 10 },
      lunch: { [participant.key]: 20 }
    } }
  });
  context.location = { search: `?mode=people&date=${date}&canteen=${canteen.id}` };
  const listeners = {};
  const cells = [{ textContent: '' }, { textContent: '' }];
  const mealTotalCell = { textContent: '' };
  const grandTotalCell = { textContent: '' };
  let html = '';
  context.AppShell = { mount({ content }) {
    html = content;
    return {
      querySelector(selector) {
        if (selector === '[data-aux-meal-total]') return mealTotalCell;
        if (selector === '[data-aux-grand-total]') return grandTotalCell;
        return null;
      },
      querySelectorAll(selector) { return selector === '[data-aux-product-subtotal]' ? cells : []; },
      addEventListener(type, handler) { listeners[type] = handler; }
    };
  } };
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/pages/school-recipe-auxiliary-demand-confirm.js'), 'utf8'), context);
  return { html, listeners, cells, mealTotalCell, grandTotalCell };
}

test('商品需求确认页的小计与两行合计按采购量计算，隐藏送达时间字段', () => {
  for (const splitPerson of [false, true]) {
    const { html } = renderConfirm(splitPerson);
    assert.match(html, /<th rowspan="2">小计<\/th>/);
    assert.doesNotMatch(html, /schoolRecipeAuxiliaryExpectedAt|school-recipe-demand-delivery-field/);
    assert.match(html, /填报天数：<\/span><strong>1<\/strong>/);
    assert.match(html, /午餐合计金额/);
    assert.match(html, /所有餐次合计金额/);
    const subtotalValues = [...html.matchAll(/data-aux-product-subtotal>¥([\d,]+\.\d{2})<\/td>/g)].map((match) => parseMoney(match[1]));
    const mealTotal = parseMoney(html.match(/data-aux-meal-total>¥([\d,]+\.\d{2})/)?.[1]);
    const grandTotal = parseMoney(html.match(/data-aux-grand-total>¥([\d,]+\.\d{2})/)?.[1]);
    assert.equal(subtotalValues.length, 2);
    assert.equal(mealTotal, Number(subtotalValues.reduce((sum, value) => sum + value, 0).toFixed(2)));
    assert.ok(grandTotal > mealTotal);
    assert.match(html, new RegExp(`<tfoot><tr class="school-recipe-demand-product-total-row"><td colspan="${splitPerson ? 10 : 8}">午餐合计金额`));
  }
});

test('修改单价或采购量时，小计和两行合计立即更新', () => {
  const { html, listeners, cells, mealTotalCell, grandTotalCell } = renderConfirm();
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
