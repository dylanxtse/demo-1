const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const { root, loadApp } = require('./helpers/app-context.cjs');
const names = ['order-export-template', 'order-export-order-template', 'order-export-merged-template',
  'school-order-export-template', 'school-order-export-order-template', 'sorting-independent-export',
  'sorting-merge-export', 'sorting-customer-export-template', 'sorting-spec-export-template',
  'sorting-print-template', 'customer-sorting-print-template', 'sorting-label-print',
  'shipping-export-template', 'order-shipping-export-template', 'shipping-print-template',
  'order-shipping-print-template', 'sales-reconciliation-export-template'];
const source = (name) => fs.readFileSync(path.join(root, `assets/js/pages/${name}.js`), 'utf8');
function render(name, search) {
  const { context } = loadApp();
  context.DemoStore = { get() { return []; } };
  context.location = { search, href: `file:///${name}.html${search}` };
  const nodes = new Map();
  context.document = { title: '', getElementById(id) {
    if (!nodes.has(id)) nodes.set(id, { innerHTML: '', textContent: '' });
    return nodes.get(id);
  }, querySelector() { return null; } };
  context.SortingQrCode = { svg() { return ''; } };
  const input = source(name);
  vm.runInContext(input, context, { filename: name });
  return [...nodes.values()].map((node) => node.innerHTML).join('');
}
for (const scenario of ['direct', 'expired', 'empty', 'invalid']) {
  test(`17个打印导出页面在${scenario}状态且业务存储为空时均展示数据`, () => {
    for (const name of names) {
      const version = source(name).match(/const (?:EXPORT_VERSION|PRINT_VERSION|VERSION) = '([^']+)'/)?.[1];
      const payload = encodeURIComponent(JSON.stringify({ version, rows: [], groups: [], type: name.startsWith('sales-') ? 'customer' : undefined }));
      const search = scenario === 'direct' ? '' : scenario === 'expired' ? '?exportKey=missing&printKey=missing&deliveryExportKey=missing'
        : scenario === 'invalid' ? '?exportData=%7B&printData=%7B' : `?exportData=${payload}&printData=${payload}`;
      const html = render(name, search);
      assert.ok(html.length > 100, name);
      assert.doesNotMatch(html, /暂无|无可打印|无可导出/, name);
      assert.match(html, /大白菜|大米|静安第一中学/, name);
      if (name !== 'sorting-label-print') assert.match(html, /<td\b/, name);
      if (name === 'order-export-merged-template') assert.doesNotMatch(html, /order-merge-meta|配送日期：|导出时间：/);
    }
  });
}
test('模板工具保留有数据的快照，默认补充不写回业务数据', () => {
  const { context } = loadApp();
  const before = context.localStorage.getItem('procurement-demo-data-v1');
  const snapshot = [{ id: 'IMMUTABLE', expectedAt: '2026-10-01', deliveryDate: '2026-09-30' }];
  assert.equal(context.PrototypePreview.rows(snapshot, 'sortingItems'), snapshot);
  const orders = context.PrototypePreview.orders(snapshot);
  assert.equal(orders[0].deliveryDate, '2026-09-30');
  assert.ok(orders[0].items.length > 0);
  assert.equal(snapshot[0].items, undefined);
  assert.equal(context.localStorage.getItem('procurement-demo-data-v1'), before);
});
test('原型列表剔除两种日期条件，零结果时也展示数据', async () => {
  const { context } = loadApp();
  context.DemoStore = { get() { return []; } };
  const calls = [];
  const service = { async list(resource, query) { calls.push(query); return { items: [], total: 0 }; } };
  for (const resource of ['orders', 'sortingItems', 'sortingProgress', 'shortageItems', 'shippingOrders', 'routes', 'routeOrders', 'routeLoading', 'routeDepartures']) {
    const result = await context.PrototypePreview.list(service, resource, { pageSize: 20,
      condition: { expectedAt: '2099-01-01', expectedAtRange: ['2099-01-01', '2099-01-02'], deliveryDate: '2099-01-01', deliveryDateRange: ['2099-01-01', '2099-01-02'] } });
    assert.ok(result.items.length > 0, resource);
    assert.ok(result.total > 0, resource);
  }
  assert.ok(calls.every((call) => Object.keys(call.condition).length === 0));
});
test('实际页面先加载原型工具，日期标签共用无边框样式', () => {
  for (const name of names) {
    const html = fs.readFileSync(path.join(root, `${name}.html`), 'utf8');
    assert.ok(html.indexOf('utils/prototype-preview.js') >= 0, name);
    assert.ok(html.indexOf('utils/prototype-preview.js') < html.indexOf(`pages/${name}.js`), name);
  }
  const css = fs.readFileSync(path.join(root, 'assets/css/operations.css'), 'utf8');
  assert.match(css, /\.operations-field \.date-filter-type\s*\{[^}]*border: 0;/);
});
