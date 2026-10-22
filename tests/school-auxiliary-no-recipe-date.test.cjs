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
    'assets/js/services/school-order-service.js',
    'assets/js/services/school-recipe-auxiliary-direct-service.js'
  ] }).context;
  assert.equal(context.SchoolRecipeService.getAll().some((menu) => menu.date === noRecipeDate), false);
  context.AppStorage.write('school-recipe-auxiliary-current-canteen', '第一食堂');
  const canteen = context.SchoolCanteenConfigService.getCanteen('第一食堂');
  context.AppStorage.write('school-recipe-auxiliary-default-products-v1', { [String(canteen.id || canteen.name)]: ['aux-oil'] });
  context.location = { search: `?date=${noRecipeDate}` };
  return context;
}

test('干调人数填报和确认页禁止在无菜谱日期购买', () => {
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
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/pages/school-recipe-auxiliary-attendance-people.js'), 'utf8'), context);
  assert.match(html.html, new RegExp(`data-aux-date="${noRecipeDate}"`));
  assert.match(html.html, /is-no-menu/);
  assert.match(html.html, /title="无菜谱"/);
  assert.doesNotMatch(html.html, /data-person-type=/);
  assert.doesNotMatch(html.html, /data-confirm-demand/);
  assert.match(html.html, /无法填报干调需求，请选择有菜谱的日期/);

  const canteen = context.SchoolCanteenConfigService.getCanteen('第一食堂');
  const scope = String(canteen.id || canteen.name);
  const participant = context.SchoolRecipeAttendanceService.participantsFor(canteen)[0];
  const participantKey = String(participant.key || participant.tagId || participant.id || participant.orderTag);
  const drafts = context.AppStorage.read('school-recipe-auxiliary-attendance-drafts-v1', {});
  drafts[scope] ||= {};
  drafts[scope][noRecipeDate] = { __manual: true, breakfast: { [participantKey]: 10 } };
  context.AppStorage.write('school-recipe-auxiliary-attendance-drafts-v1', drafts);
  context.location = { search: `?date=${noRecipeDate}&canteen=${encodeURIComponent(scope)}` };
  let confirmHtml = '';
  context.AppShell = { mount({ content }) {
    confirmHtml = content;
    return { querySelector() { return null; }, addEventListener() {} };
  } };
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/pages/school-recipe-auxiliary-demand-confirm.js'), 'utf8'), context);
  assert.match(confirmHtml, /只能选择有菜谱的日期/);
  assert.match(confirmHtml, /data-action="submit" disabled>提交需求并下单/);
  assert.doesNotMatch(confirmHtml, /09月16日/);
});
