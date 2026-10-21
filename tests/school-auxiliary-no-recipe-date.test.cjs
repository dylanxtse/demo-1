const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { loadApp, root } = require('./helpers/app-context.cjs');

const noRecipeDate = '2026-09-16';

function app() {
  const context = loadApp({ services: [
    'assets/js/data/school-reference-data.js',
    'assets/js/services/school-canteen-config-service.js',
    'assets/js/services/school-recipe-service.js',
    'assets/js/services/school-recipe-attendance-service.js',
    'assets/js/services/school-order-service.js'
  ] }).context;
  assert.equal(context.SchoolRecipeService.getAll().some((menu) => menu.date === noRecipeDate), false);
  context.AppStorage.write('school-recipe-auxiliary-current-canteen', '第一食堂');
  context.location = { search: `?date=${noRecipeDate}` };
  return context;
}

test('商品需求填报允许无食谱日期填写，并在确认页汇总该日期', () => {
  const context = app();
  let html = '';
  context.AppShell = { mount({ content }) {
    const page = { outerHTML: content };
    const element = {
      querySelector(selector) { return selector === '#schoolAuxiliaryPage' ? page : null; },
      addEventListener() {}
    };
    Object.defineProperty(element, 'html', { get: () => page.outerHTML });
    html = element;
    return element;
  } };
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/pages/school-recipe-auxiliary-attendance.js'), 'utf8'), context);
  assert.match(html.html, new RegExp(`data-aux-date="${noRecipeDate}"`));
  assert.match(html.html, /data-person-type="[^"]+" data-meal-key="breakfast"/);
  assert.match(html.html, /data-person-type="[^"]+" data-meal-key="dinner"/);
  assert.doesNotMatch(html.html, /data-person-type="[^"]+" data-meal-key="snack"/);
  assert.doesNotMatch(html.html, /data-meal="snack"/);
  assert.match(html.html, /data-confirm-demand/);
  assert.doesNotMatch(html.html, /请选择有菜谱的日期/);

  const canteen = context.SchoolCanteenConfigService.getCanteen('第一食堂');
  const scope = String(canteen.id || canteen.name);
  const participant = context.SchoolRecipeAttendanceService.participantsFor(canteen)[0];
  const participantKey = String(participant.key || participant.tagId || participant.id || participant.orderTag);
  const drafts = context.AppStorage.read('school-recipe-auxiliary-attendance-drafts-v1', {});
  drafts[scope][noRecipeDate].breakfast[participantKey] = 10;
  context.AppStorage.write('school-recipe-auxiliary-attendance-drafts-v1', drafts);
  context.location = { search: `?date=${noRecipeDate}&canteen=${encodeURIComponent(scope)}` };
  let confirmHtml = '';
  context.AppShell = { mount({ content }) {
    confirmHtml = content;
    return { querySelector() { return null; }, addEventListener() {} };
  } };
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/pages/school-recipe-auxiliary-demand-confirm.js'), 'utf8'), context);
  assert.match(confirmHtml, /09月16日/);
  assert.match(confirmHtml, /早餐/);
  assert.doesNotMatch(confirmHtml, /data-meal="snack"/);
  assert.match(confirmHtml, /data-action="submit">提交需求并下单/);
});
