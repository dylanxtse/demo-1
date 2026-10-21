const assert = require('node:assert/strict');
const test = require('node:test');
const { loadApp } = require('./helpers/app-context.cjs');

function app() {
  return loadApp({ services: [
    'assets/js/data/school-reference-data.js',
    'assets/js/services/school-canteen-config-service.js',
    'assets/js/services/school-recipe-service.js',
    'assets/js/services/school-recipe-attendance-service.js',
    'assets/js/services/school-order-service.js',
    'assets/js/services/school-recipe-auxiliary-direct-service.js'
  ] }).context;
}

test('演示食谱只使用食堂配置支持的六种餐次', () => {
  const context = app();
  const allowed = Array.from(context.SchoolCanteenConfigService.mealTypes, (meal) => meal.key);
  assert.deepEqual(Array.from(context.SchoolRecipeService.mealTypes, (meal) => meal.key), allowed);
  assert.deepEqual(Array.from(context.SchoolRecipeAttendanceService.mealTypes, (meal) => meal.key), allowed);
  const menus = context.SchoolRecipeService.getAll();
  assert.equal(menus.every((menu) => menu.meals.every((meal) => allowed.includes(meal.key))), true);
  const septemberEighth = menus.find((menu) => menu.date === '2026-09-08');
  assert.deepEqual(Array.from(septemberEighth.meals, (meal) => meal.name), ['早餐', '午餐', '午点']);
});

test('已保存的旧演示餐次和填报数量迁移为午点', () => {
  const context = app();
  const date = '2026-09-08';
  const menus = context.SchoolRecipeService.getAll();
  const menu = menus.find((item) => item.date === date);
  const meal = menu.meals.find((item) => item.key === 'afternoonSnack');
  meal.key = 'snack';
  meal.name = '加餐';
  meal.dishes.push({ id: 'CUSTOM-LEGACY-DISH', name: '自定义点心', ingredients: [] });
  meal.dishes.push({ id: 'DISH-20260908-SNACK-EXTRA-99', name: '旧版自动菜品', ingredients: [] });
  context.DemoStore.replace('recipeMenus', menus);

  const migrated = context.SchoolRecipeService.getMenu(date);
  assert.equal(migrated.meals.some((item) => item.key === 'snack'), false);
  const afternoon = migrated.meals.find((item) => item.key === 'afternoonSnack');
  assert.equal(afternoon.name, '午点');
  assert.equal(afternoon.dishes.some((item) => item.id === 'CUSTOM-LEGACY-DISH'), true);
  assert.equal(afternoon.dishes.some((item) => item.id.includes('-SNACK-EXTRA-')), false);

  const canteen = context.SchoolCanteenConfigService.getCanteen('第一食堂');
  context.DemoStore.replace('recipeAttendance', [{
    id: 'LEGACY-ATTENDANCE', date, canteenId: canteen.id, canteen: canteen.name,
    meals: { snack: { 'TAG-001': 12 } }, temporaryNonDining: {}
  }]);
  const attendance = context.SchoolRecipeAttendanceService.get(date, canteen);
  assert.equal(attendance.meals.snack, undefined);
  assert.equal(attendance.meals.afternoonSnack['TAG-001'], 12);

  const direct = context.SchoolRecipeAuxiliaryDirectService;
  direct.writeDraft(date, canteen, { 'snack::SP0300030': '2' });
  assert.equal(direct.readDraft(date, canteen)['afternoonSnack::SP0300030'], '2');
  assert.equal(direct.buildPreview(date, canteen).selectedRows[0].orderQty, 2);
});
