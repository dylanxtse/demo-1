const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { loadApp, root } = require('./helpers/app-context.cjs');

function loadRecipeServices() {
  const { context } = loadApp();
  [
    'assets/js/data/school-reference-data.js',
    'assets/js/services/school-canteen-config-service.js',
    'assets/js/services/school-recipe-service.js',
    'assets/js/services/school-recipe-attendance-service.js',
    'assets/js/services/school-order-service.js',
    'assets/js/services/school-recipe-demand-service.js'
  ].forEach((file) => vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file }));
  return context;
}

test('同一餐次的同一商品按菜品分别填报，确认时合并采购量', () => {
  const context = loadRecipeServices();
  const date = '2026-09-07';
  const demand = context.SchoolRecipeDemandService;
  const initial = demand.buildDirectPreview(date, {});
  const breakfast = initial.meals.find((meal) => meal.key === 'breakfast');
  const milkRows = breakfast.rows.filter((row) => row.productCode === 'SP0300037');

  assert.equal(milkRows.length, 2);
  assert.equal(new Set(milkRows.map((row) => row.key)).size, 2);
  assert.deepEqual([...milkRows.map((row) => row.dishName)], ['鲜奶面包', '牛奶']);

  const quantities = { [milkRows[0].key]: 2, [milkRows[1].key]: 3 };
  const preview = demand.buildDirectPreview(date, quantities);
  assert.deepEqual([...preview.meals.find((meal) => meal.key === 'breakfast').rows
    .filter((row) => row.productCode === 'SP0300037').map((row) => row.orderQty)], [2, 3]);
  assert.equal(preview.selectedRows.length, 2);

  const combined = demand.buildDirectDatesPreview([date], { [date]: quantities });
  assert.equal(combined.meals.find((meal) => meal.key === 'breakfast').rows
    .find((row) => row.productCode === 'SP0300037').orderQty, 5);

  const menu = context.SchoolRecipeService.getMenu(date);
  const attendance = context.SchoolRecipeAttendanceService;
  const peopleRows = attendance.calculate(menu, attendance.emptyRecord(date), { participants: [] })
    .mealRows.find((meal) => meal.key === 'breakfast').rows;
  assert.equal(peopleRows.filter((row) => row.productCode === 'SP0300037').length, 1);
});

test('同名菜品合并表格单元格，各商品仍有独立采购量输入', () => {
  const context = loadRecipeServices();
  const date = '2026-09-08';
  const rows = context.SchoolRecipeDemandService.buildDirectPreview(date, {}).meals
    .find((meal) => meal.key === 'breakfast').rows.filter((row) => row.dishName === '牛奶鸡蛋');
  assert.equal(rows.length, 2);

  context.location = { search: `?mode=quantity&date=${date}` };
  context.addEventListener = () => {};
  context.document = { querySelector: () => null, createElement: () => ({ remove() {} }), body: { appendChild() {} } };
  const body = { innerHTML: '' };
  const listeners = {};
  context.AppShell = { mount() { return { querySelector(selector) {
    if (selector === '#schoolRecipeAttendancePage') return { addEventListener(type, handler) {
      (listeners[type] ||= []).push(handler);
    } };
    if (selector === '#schoolRecipeAttendanceBody') return body;
    if (selector === '#schoolRecipeEntrySwitch') return { innerHTML: '' };
    return null;
  } }; } };
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/pages/school-recipe-attendance.js'), 'utf8'), context);

  assert.match(body.innerHTML, /<tr data-direct-dish-group="1"><td class="school-recipe-direct-index" rowspan="2">1<\/td><td class="school-recipe-direct-dish-name" rowspan="2" title="牛奶鸡蛋">牛奶鸡蛋<\/td>/);
  assert.match(body.innerHTML, /<tr data-direct-dish-group="1"><td class="school-recipe-attendance-product-name">/);
  assert.equal((body.innerHTML.match(/class="school-recipe-direct-index" rowspan="2">1<\/td>/g) || []).length, 1);
  assert.equal((body.innerHTML.match(/class="school-recipe-direct-dish-name"[^>]*>牛奶鸡蛋<\/td>/g) || []).length, 1);
  rows.forEach((row) => assert.ok(body.innerHTML.includes(`data-direct-quantity="${row.key}"`)));

  const highlighted = new Set();
  const tableRows = [1, 1, 2].map((group, index) => ({
    dataset: { directDishGroup: String(group) },
    classList: { toggle(name, enabled) {
      if (enabled) highlighted.add(index);
      else highlighted.delete(index);
    } },
    closest(selector) { return selector === '.school-recipe-direct-table' ? table : null; }
  }));
  const table = { querySelectorAll() { return tableRows; } };
  const target = { closest(selector) {
    return selector === '.school-recipe-direct-table tbody tr[data-direct-dish-group]' ? tableRows[0] : null;
  } };
  listeners.mouseover.forEach((handler) => handler({ target, relatedTarget: null }));
  assert.deepEqual([...highlighted], [0, 1]);
  listeners.mouseout.forEach((handler) => handler({ target, relatedTarget: { closest() { return null; } } }));
  assert.deepEqual([...highlighted], []);
});
