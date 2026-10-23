const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { loadApp, root } = require('./helpers/app-context.cjs');

test('人数填报可批量添加商品，取消选择不保存', () => {
  const context = loadApp({ services: [
    'assets/js/data/school-reference-data.js',
    'assets/js/services/school-canteen-config-service.js',
    'assets/js/services/school-recipe-service.js',
    'assets/js/services/school-recipe-attendance-service.js',
    'assets/js/services/school-order-service.js',
    'assets/js/services/school-recipe-auxiliary-direct-service.js'
  ] }).context;
  const canteen = context.SchoolCanteenConfigService.getCanteen('第一食堂');
  const scope = String(canteen.id || canteen.name);
  const storageKey = 'school-recipe-auxiliary-selected-products-v1';
  context.AppStorage.write('school-recipe-auxiliary-current-canteen', '第一食堂');
  context.AppStorage.write(storageKey, { [scope]: ['aux-oil'] });
  context.location = { search: '?mode=people' };

  const page = { outerHTML: '' };
  const modal = { outerHTML: '' };
  const listeners = {};
  const focusTarget = { focus() {} };
  context.AppShell = { mount({ content }) {
    page.outerHTML = content;
    return {
      querySelector(selector) {
        if (selector === '#schoolAuxiliaryPage') return page;
        if (selector === '[data-aux-product-modal]') return modal;
        if (selector === '[data-aux-product-keyword]' || selector === '[data-aux-product-open]') return focusTarget;
        return null;
      },
      querySelectorAll() { return []; },
      addEventListener(type, handler) { listeners[type] = handler; }
    };
  } };
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/pages/school-recipe-auxiliary-attendance-people.js'), 'utf8'), context);

  const target = (selector, values = {}) => ({
    closest(candidate) { return candidate === selector ? values : null; },
    matches() { return false; }
  });
  assert.match(page.outerHTML, /data-aux-product-open>批量添加商品/);
  assert.match(page.outerHTML, /请添加商品/);
  assert.match(page.outerHTML, /data-confirm-demand disabled/);
  assert.deepEqual(Array.from(context.AppStorage.read(storageKey, {})[scope]), []);
  assert.doesNotMatch(page.outerHTML, /data-restore-default|恢复默认/);
  listeners.click({ target: target('[data-aux-product-open]') });
  assert.match(page.outerHTML, /role="dialog" aria-modal="true" aria-label="添加商品"/);
  assert.match(page.outerHTML, /共 50 条数据/);
  assert.match(page.outerHTML, /data-aux-product-page-size aria-label="每页条数"/);
  assert.match(page.outerHTML, /跳至 <input[^>]*data-aux-product-jump/);
  assert.match(page.outerHTML, / \/ 5 页/);
  assert.match(page.outerHTML, /data-aux-product-default="aux-simple-1"/);
  listeners.click({ target: target('[data-aux-product-page]', { dataset: { auxProductPage: '5' } }) });
  assert.match(modal.outerHTML, /data-aux-product-default="aux-simple-47"/);
  assert.match(modal.outerHTML, /value="5" data-aux-product-jump/);
  listeners.change({ target: target('[data-aux-product-page-size]', { value: '20' }) });
  assert.match(modal.outerHTML, /<option value="20" selected>20 条\/页<\/option>/);
  assert.match(modal.outerHTML, / \/ 3 页/);
  listeners.change({ target: target('[data-aux-product-jump]', { value: '3', max: '3' }) });
  assert.match(modal.outerHTML, /data-aux-product-default="aux-simple-47"/);
  assert.match(modal.outerHTML, /value="3" data-aux-product-jump/);
  assert.match(page.outerHTML, /<h3>添加商品<\/h3>/);
  assert.match(page.outerHTML, /<th>商品名称<\/th>/);
  assert.match(page.outerHTML, /金龙鱼5L桶装油（L\/金龙鱼\/5L\/桶）/);
  assert.match(page.outerHTML, /<th>计量单位<\/th>/);
  assert.match(page.outerHTML, /<th>操作<\/th>/);
  assert.match(page.outerHTML, /data-aux-product-default="aux-oil"[^>]*>设为默认<\/button>/);
  assert.doesNotMatch(page.outerHTML, /<th>采购单位<\/th>/);
  assert.doesNotMatch(page.outerHTML, /<th>规格<\/th>|class="col-spec"/);
  assert.match(page.outerHTML, /data-aux-product-select-all/);
  assert.match(page.outerHTML, /data-aux-product-checkbox/);
  listeners.change({ target: target('[data-aux-product-checkbox]', { value: 'aux-oil', checked: true }) });
  listeners.change({ target: target('[data-aux-product-checkbox]', { value: 'aux-salt', checked: true }) });
  listeners.click({ target: target('[data-aux-product-confirm]') });
  assert.deepEqual(Array.from(context.AppStorage.read(storageKey, {})[scope]), ['aux-oil', 'aux-salt']);
  assert.match(page.outerHTML, /data-remove-id="aux-salt"/);

  listeners.click({ target: target('[data-aux-product-open]') });
  listeners.change({ target: target('[data-aux-product-checkbox]', { value: 'aux-msg', checked: true }) });
  listeners.click({ target: target('[data-aux-product-close]') });
  assert.deepEqual(Array.from(context.AppStorage.read(storageKey, {})[scope]), ['aux-oil', 'aux-salt']);

});

test('没有实际就餐人数时禁用批量添加商品，有人数后启用', () => {
  const context = loadApp({ services: [
    'assets/js/data/school-reference-data.js',
    'assets/js/services/school-canteen-config-service.js',
    'assets/js/services/school-recipe-service.js',
    'assets/js/services/school-recipe-attendance-service.js',
    'assets/js/services/school-order-service.js',
    'assets/js/services/school-recipe-auxiliary-direct-service.js'
  ] }).context;
  const canteen = context.SchoolCanteenConfigService.getCanteen('第一食堂');
  const scope = String(canteen.id || canteen.name);
  const menu = context.SchoolRecipeService.getAll()[0];
  const participants = context.SchoolRecipeAttendanceService.participantsFor(canteen);
  const date = String(menu.date).slice(0, 10);
  const mealDraft = Object.fromEntries(menu.meals.map((meal) => [meal.key,
    Object.fromEntries(participants.map((participant) => [participant.key, 0]))
  ]));
  context.AppStorage.write('school-recipe-auxiliary-current-canteen', '第一食堂');
  context.AppStorage.write('school-recipe-auxiliary-attendance-drafts-v1', {
    [scope]: { [date]: { __manual: true, ...mealDraft } }
  });
  context.location = { search: `?mode=people&date=${date}&canteen=${encodeURIComponent(scope)}` };

  const page = { outerHTML: '' };
  const modal = { outerHTML: '' };
  const button = { disabled: false, classList: { toggle(_name, disabled) { button.disabled = disabled; } } };
  const listeners = {};
  const focusTarget = { focus() {} };
  context.AppShell = { mount({ content }) {
    page.outerHTML = content;
    return {
      querySelector(selector) {
        if (selector === '#schoolAuxiliaryPage') return page;
        if (selector === '[data-aux-product-modal]') return modal;
        if (selector === '[data-aux-product-open]') return button;
        if (selector === '[data-aux-product-keyword]') return focusTarget;
        return null;
      },
      addEventListener(type, handler) { listeners[type] = handler; }
    };
  } };
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/pages/school-recipe-auxiliary-attendance-people.js'), 'utf8'), context);

  const target = (selector, values = {}) => ({
    closest(candidate) { return candidate === selector ? values : null; },
    matches() { return false; }
  });
  assert.match(page.outerHTML, /class="btn btn-blue btn-sm btn-disabled" type="button" data-aux-product-open disabled/);
  listeners.click({ target: target('[data-aux-product-open]') });
  assert.doesNotMatch(page.outerHTML, /role="dialog" aria-modal="true" aria-label="添加商品"/);

  const participant = participants[0];
  const meal = menu.meals[0];
  const count = { innerHTML: '0' };
  const input = {
    value: '1',
    dataset: { mealKey: meal.key, personType: participant.key },
    classList: { toggle() {} },
    closest(selector) { return selector === 'tr' ? { querySelector: () => count } : null; },
    toggleAttribute() {},
    setAttribute() {}
  };
  listeners.input({ target: target('[data-person-type]', input) });
  assert.equal(button.disabled, false);
  listeners.click({ target: target('[data-aux-product-open]') });
  assert.match(page.outerHTML, /role="dialog" aria-modal="true" aria-label="添加商品"/);
});

test('设为默认的干调商品按食堂保存，并在再次打开填报页时自动显示', () => {
  const context = loadApp({ services: [
    'assets/js/data/school-reference-data.js',
    'assets/js/services/school-canteen-config-service.js',
    'assets/js/services/school-recipe-service.js',
    'assets/js/services/school-recipe-attendance-service.js',
    'assets/js/services/school-order-service.js',
    'assets/js/services/school-recipe-auxiliary-direct-service.js'
  ] }).context;
  const canteen = context.SchoolCanteenConfigService.getCanteen('第一食堂');
  const scope = String(canteen.id || canteen.name);
  const selectedKey = 'school-recipe-auxiliary-selected-products-v1';
  const defaultKey = 'school-recipe-auxiliary-default-products-v1';
  context.AppStorage.write('school-recipe-auxiliary-current-canteen', '第一食堂');
  context.AppStorage.write(selectedKey, { [scope]: ['aux-oil'] });
  context.location = { search: '?mode=people' };

  const boot = () => {
    const page = { outerHTML: '' };
    const modal = { outerHTML: '' };
    const rows = { innerHTML: '' };
    const listeners = {};
    context.AppShell = { mount({ content }) {
      page.outerHTML = content;
      return {
        querySelector(selector) {
          if (selector === '#schoolAuxiliaryPage') return page;
          if (selector === '[data-aux-product-modal]') return modal;
          if (selector === '#schoolAuxiliaryRows') return rows;
          if (selector === '[data-aux-product-keyword]' || selector === '[data-aux-product-open]') return { focus() {} };
          return null;
        },
        addEventListener(type, handler) { listeners[type] = handler; }
      };
    } };
    vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/pages/school-recipe-auxiliary-attendance-people.js'), 'utf8'), context);
    return { page, rows, listeners };
  };
  const target = (selector, values = {}) => ({
    closest(candidate) { return candidate === selector ? { dataset: values } : null; },
    matches() { return false; }
  });

  const first = boot();
  assert.match(first.page.outerHTML, /请添加商品/);
  first.listeners.click({ target: target('[data-aux-product-open]') });
  first.listeners.click({ target: target('[data-aux-product-default]', { auxProductDefault: 'aux-salt' }) });
  assert.deepEqual(Array.from(context.AppStorage.read(defaultKey, {})[scope]), ['aux-salt']);
  assert.deepEqual(Array.from(context.AppStorage.read(selectedKey, {})[scope]), ['aux-salt']);
  assert.match(first.rows.innerHTML, /data-remove-id="aux-salt"/);

  context.AppStorage.write(selectedKey, { [scope]: ['aux-oil'] });
  const reopened = boot();
  assert.match(reopened.page.outerHTML, /data-remove-id="aux-salt"/);
  assert.doesNotMatch(reopened.page.outerHTML, /data-remove-id="aux-oil"/);
  assert.match(reopened.page.outerHTML, /<th rowspan="2">序号<\/th><th rowspan="2">商品<\/th><th rowspan="2">人均用量<\/th><th rowspan="2">编号<\/th>/);
  assert.doesNotMatch(reopened.page.outerHTML, /<th rowspan="2">干调<\/th>/);
  assert.match(reopened.page.outerHTML, /<td class="product-cell"><span class="product-display-text">食盐（kg\/—\/500g\/袋）<\/span><\/td><td><span class="school-auxiliary-dose-value">4 g<\/span><\/td>/);
  reopened.listeners.click({ target: target('[data-aux-product-default]', { auxProductDefault: 'aux-salt' }) });
  assert.deepEqual(Array.from(context.AppStorage.read(defaultKey, {})[scope]), []);
  context.AppStorage.write(selectedKey, { [scope]: ['aux-oil'] });
  assert.match(boot().page.outerHTML, /请添加商品/);
});
