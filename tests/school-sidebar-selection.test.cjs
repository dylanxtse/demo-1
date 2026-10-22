const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { loadApp, root } = require('./helpers/app-context.cjs');

function selectedMenu(pathname, search, variant = 'school') {
  const { context } = loadApp();
  for (const file of [
    'assets/js/config/menu-data.js',
    'assets/js/config/school-menu-data.js',
    'assets/js/components/sidebar.js'
  ]) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context);
  }
  context.location = { pathname, search };
  const sidebar = { innerHTML: '', addEventListener() {} };
  const app = {
    dataset: {},
    querySelector(selector) { return selector === '.sidebar' ? sidebar : null; }
  };
  context.AppSidebar.bind(app, { variant });
  return sidebar.innerHTML;
}

test('食材填报和确认页带日期参数时仍展开并选中对应左侧菜单', () => {
  for (const pathname of ['/school-recipe-attendance.html', '/school-recipe-demand-confirm.html']) {
    const html = selectedMenu(pathname, '?mode=people&date=2026-09-07');
    assert.match(html, /class="menu-item active expanded[^"]*"[^>]*>[\s\S]*?需求填报/);
    assert.match(html, /class="menu-sub-item selected[^"]*"[^>]*data-menu-link="\.\/school-recipe-attendance\.html"/);
  }
});

test('商品填报带日期参数时选中干料需求填报', () => {
  const html = selectedMenu('/school-recipe-auxiliary-attendance.html', '?mode=quantity&date=2026-09-07');
  assert.match(html, /class="menu-sub-item selected[^"]*"[^>]*data-menu-link="\.\/school-recipe-auxiliary-attendance\.html"/);
});

test('带查询参数的专用菜单仍优先精确选中', () => {
  const html = selectedMenu('/sales-reconciliation.html', '?view=accounts', 'enterprise');
  assert.match(html, /class="menu-sub-item selected[^"]*"[^>]*data-menu-link="\.\/sales-reconciliation\.html\?view=accounts"/);
});
