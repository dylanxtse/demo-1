const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
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

function attendanceData(context, menu, counts = {}, nonDining = {}) {
  const canteen = context.SchoolCanteenConfigService.getCanteen('第一食堂');
  const participants = context.SchoolRecipeAttendanceService.participantsFor(canteen);
  const meals = Object.fromEntries(menu.meals.map((meal) => [meal.key, Object.fromEntries(
    participants.map((participant) => [participant.key, counts[meal.key] || 0])
  )]));
  const temporaryNonDining = Object.fromEntries(menu.meals.map((meal) => [meal.key, Object.fromEntries(
    participants.map((participant) => [participant.key, nonDining[meal.key] || 0])
  )]));
  context.SchoolRecipeAttendanceService.save(menu.date, meals, menu.version, canteen, temporaryNonDining);
  return { canteen, participants };
}

function renderRecipeAttendance(context, date) {
  context.location = { search: `?mode=people&date=${date}` };
  context.addEventListener = () => {};
  const body = { innerHTML: '' };
  const switcher = { innerHTML: '' };
  const tabs = { innerHTML: '' };
  const demand = { innerHTML: '' };
  const listeners = {};
  const menu = context.SchoolRecipeService.getMenu(date);
  const participant = context.SchoolRecipeAttendanceService.participantsFor(
    context.SchoolCanteenConfigService.getCanteen('第一食堂')
  )[0];
  const input = {
    value: '0',
    dataset: { mealKey: menu.meals[0].key, attendanceField: participant.key },
    classList: { toggle() {} },
    closest(selector) {
      if (selector === '[data-attendance-field], [data-attendance-non-dining-field]') return this;
      return null;
    },
    matches(selector) { return selector === '[data-attendance-field]'; },
    toggleAttribute() {}
  };
  const page = {
    addEventListener(type, handler) { listeners[type] = handler; },
    querySelector(selector) {
      if (selector === '#schoolRecipeAttendanceMealTabs') return tabs;
      if (selector === '#schoolRecipeAttendanceDemand') return demand;
      return null;
    },
    querySelectorAll(selector) {
      return selector === '[data-attendance-field], [data-attendance-non-dining-field]'
        || selector === '[data-attendance-field]' ? [input] : [];
    }
  };
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
  return { html: body.innerHTML, tabs, demand, listeners, input };
}

function renderAuxiliaryAttendance(context, date) {
  const canteen = context.SchoolCanteenConfigService.getCanteen('第一食堂');
  const scope = String(canteen.id || canteen.name);
  context.AppStorage.write('school-recipe-auxiliary-current-canteen', '第一食堂');
  context.location = { search: `?mode=people&date=${date}` };
  const page = { outerHTML: '' };
  const listeners = {};
  const tabs = { innerHTML: '' };
  const rows = { innerHTML: '' };
  const rootElement = {
    querySelector(selector) {
      if (selector === '#schoolAuxiliaryPage') return page;
      if (selector === '#schoolAuxiliaryMealTabs') return tabs;
      if (selector === '#schoolAuxiliaryRows') return rows;
      return null;
    },
    querySelectorAll() { return []; },
    addEventListener(type, handler) { listeners[type] = handler; }
  };
  context.AppShell = { mount({ content }) { page.outerHTML = content; return rootElement; } };
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/pages/school-recipe-auxiliary-attendance-people.js'), 'utf8'), context);
  return { html: page.outerHTML, scope, listeners, tabs, rows };
}

test('菜谱人数需求填报只为有实际就餐人数的餐次显示拆单标签', () => {
  const context = loadApp({ services }).context;
  context.DemoStore.updateSettings({ splitOrderByMeal: true });
  const menu = context.SchoolRecipeService.getAll().find((item) => item.meals.length >= 3);
  assert.ok(menu);
  const firstMeal = menu.meals[0];
  const lastMeal = menu.meals[menu.meals.length - 1];
  const { canteen } = attendanceData(context, menu, { [firstMeal.key]: 5, [lastMeal.key]: 7 }, { [lastMeal.key]: 7 });
  assert.equal(canteen.name, '第一食堂');

  let rendered = renderRecipeAttendance(context, menu.date);
  let html = rendered.html;
  const tabKeys = [...html.matchAll(/data-attendance-meal-tab="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(tabKeys, [firstMeal.key]);
  assert.match(html, new RegExp(`data-attendance-meal-tab="${firstMeal.key}"`));
  assert.doesNotMatch(html, /当前没有实际就餐人数/);

  const zeroContext = loadApp({ services }).context;
  zeroContext.DemoStore.updateSettings({ splitOrderByMeal: true });
  const zeroMenu = zeroContext.SchoolRecipeService.getAll().find((item) => item.meals.length >= 3);
  attendanceData(zeroContext, zeroMenu);
  rendered = renderRecipeAttendance(zeroContext, zeroMenu.date);
  html = rendered.html;
  assert.doesNotMatch(html, /data-attendance-meal-tab=/);
  assert.match(html, /当前没有实际就餐人数/);
  assert.equal(rendered.tabs.innerHTML, '');
  rendered.input.value = '6';
  rendered.listeners.input({ target: rendered.input });
  assert.match(rendered.tabs.innerHTML, new RegExp(`data-attendance-meal-tab="${zeroMenu.meals[0].key}"`));
  assert.doesNotMatch(rendered.demand.innerHTML, /当前没有实际就餐人数/);

  const unsplitContext = loadApp({ services }).context;
  unsplitContext.DemoStore.updateSettings({ splitOrderByMeal: false });
  const unsplitMenu = unsplitContext.SchoolRecipeService.getAll().find((item) => item.meals.length >= 3);
  attendanceData(unsplitContext, unsplitMenu);
  html = renderRecipeAttendance(unsplitContext, unsplitMenu.date).html;
  assert.doesNotMatch(html, /data-attendance-meal-tab=/);
});

test('干调人数需求填报按实际就餐人数筛选餐次并随不就餐人数更新', () => {
  const context = loadApp({ services }).context;
  context.DemoStore.updateSettings({ splitOrderByMeal: true });
  const menu = context.SchoolRecipeService.getAll().find((item) => item.meals.length >= 3);
  assert.ok(menu);
  const firstMeal = menu.meals[0];
  const lastMeal = menu.meals[menu.meals.length - 1];
  const { canteen, participants } = attendanceData(context, menu, { [firstMeal.key]: 5, [lastMeal.key]: 7 }, { [lastMeal.key]: 7 });
  const scope = String(canteen.id || canteen.name);
  const participant = participants[0];
  const draftMeals = Object.fromEntries(menu.meals.map((meal) => [meal.key, Object.fromEntries(participants.flatMap((person) => [
    [person.key, person.key === participant.key ? (meal.key === firstMeal.key ? 5 : meal.key === lastMeal.key ? 7 : 0) : 0],
    [`nonDining_${person.key}`, person.key === participant.key && meal.key === lastMeal.key ? 7 : 0]
  ]))]));
  context.AppStorage.write('school-recipe-auxiliary-attendance-drafts-v1', {
    [scope]: { [menu.date]: { __manual: true, ...draftMeals } }
  });

  const { html, listeners, tabs, rows } = renderAuxiliaryAttendance(context, menu.date);
  const tabKeys = [...html.matchAll(/data-meal="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(tabKeys, [firstMeal.key]);
  assert.equal(tabKeys.includes(lastMeal.key), false);

  const input = {
    value: '5',
    dataset: { personType: `nonDining_${participant.key}`, mealKey: firstMeal.key },
    classList: { toggle() {} },
    closest(selector) {
      if (selector === '[data-person-type]') return this;
      if (selector === 'tr') return { querySelector() { return null; } };
      return null;
    },
    toggleAttribute() {}
  };
  listeners.input({ target: input });
  assert.equal(input.value, 5);
  assert.equal(tabs.innerHTML, '');
  assert.match(rows.innerHTML, /当前没有实际就餐人数/);
  const savedDraft = context.AppStorage.read('school-recipe-auxiliary-attendance-drafts-v1', {})[scope][menu.date];
  assert.equal(savedDraft[firstMeal.key][`nonDining_${participant.key}`], 5);
});
