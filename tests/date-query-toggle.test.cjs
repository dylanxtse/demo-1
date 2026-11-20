const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const { root, loadApp } = require('./helpers/app-context.cjs');
const read = (name) => fs.readFileSync(path.join(root, `assets/js/pages/${name}.js`), 'utf8');
const flush = () => new Promise((resolve) => setImmediate(resolve));

function harness() {
  const { context } = loadApp();
  const nodes = new Map(), listeners = {};
  const node = (key) => {
    if (!nodes.has(key)) nodes.set(key, { id: key.replace(/^#/, ''), value: '', dataset: {}, innerHTML: '', textContent: '', isConnected: true,
      attributes: {}, classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
      querySelector(selector) { return node(selector); }, querySelectorAll() { return []; },
      addEventListener(type, callback) { listeners[type] = callback; },
      setAttribute(name, value) { this.attributes[name] = value; }, remove() {}, appendChild() {} });
    return nodes.get(key);
  };
  let markup = '', destination = '';
  context.AppShell = { mount({ content }) { markup = content; return node('root'); } };
  context.AppNavigation = { navigate(url) { destination = url; } };
  context.document = { getElementById(id) { return node(`#${id}`); }, querySelector: node, createElement() { return node('created'); }, addEventListener() {} };
  context.DomUtils = { formatProductDisplay(line) { return line.goodsName; } };
  return { context, node, listeners, markup: () => markup, destination: () => destination };
}

const records = () => [
  { id: 'A', orderNo: 'A', expectedAt: '2026-11-18 07:30:00', deliveryAt: '2026-11-17 07:30:00', deliveryDate: '2026-11-17' },
  { id: 'B', orderNo: 'B', expectedAt: '2026-11-17 07:30:00', deliveryAt: '2026-11-17 07:30:00', deliveryDate: '2026-11-17' },
  { id: 'C', orderNo: 'C', expectedAt: '2026-11-17 07:30:00', deliveryAt: '2026-11-16 07:30:00', deliveryDate: '2026-11-16' }
];

for (const type of ['date', 'dateRange']) {
  test(`通用${type}配置生成单日日期条件并按两个日期取交集`, async () => {
    const h = harness();
    const { context, node, listeners } = h;
    const calls = [];
    context.DatePicker = { create({ input }) { return { destroy() {}, clear() { input.value = ''; } }; } };
    context.OperationsService = { async list(resource, query) {
      calls.push(JSON.parse(JSON.stringify(query)));
      return { items: records(), total: records().length };
    } };
    vm.runInContext(read('record-page'), context);
    const controller = context.RecordPage.mount({ title: '日期查询', resource: 'sortingItems', pageClass: 'operations-page', deliveryDates: true,
      filters: [{ key: 'expectedAt', label: '期望送达时间', type, switchableDate: true, placeholder: '请选择' }], columns: [],
      toolbar: [{ key: 'export', label: '导出', templateHref: './sorting-independent-export.html' }] });
    await flush();
    assert.match(h.markup(), /id="filter-expectedAt"[^>]+placeholder="请选择"/);
    assert.match(h.markup(), /id="filter-deliveryDate"[^>]+placeholder="请选择"/);
    assert.match(h.markup(), /期望送达时间[\s\S]*配送日期/);
    assert.doesNotMatch(h.markup(), /data-record-date-type|filter-type-expectedAt/);
    assert.deepEqual(Array.from(controller.state.items, (row) => row.id), ['A', 'B', 'C']);
    assert.deepEqual(JSON.parse(JSON.stringify(controller.state.condition)), {});
    node('#filter-expectedAt').value = '2026-11-17';
    node('#filter-deliveryDate').value = '2026-11-17';
    controller.state.selected.add('A');
    await listeners.click({ target: { id: 'recordQuery', closest() { return null; } } });
    assert.deepEqual(Array.from(controller.state.items, (row) => row.id), ['B']);
    assert.equal(controller.state.selected.size, 0);
    assert.deepEqual(JSON.parse(JSON.stringify(controller.state.condition)), { expectedAt: '2026-11-17', deliveryDate: '2026-11-17' });
    assert.deepEqual(calls.at(-1).condition, {});
    const exportButton = { dataset: { toolbarAction: 'export' }, closest(selector) { return selector === '[data-toolbar-action]' ? this : null; } };
    await listeners.click({ target: exportButton });
    const key = new URL(h.destination(), 'https://prototype.local').searchParams.get('deliveryExportKey');
    assert.deepEqual(JSON.parse(context.sessionStorage.getItem(key)).map((row) => row.id), ['B']);
  });
}

test('订单商品分开筛选期望送达时间和配送日期，并按交集过滤列表及导出', async () => {
  const h = harness();
  const { context, node, listeners } = h;
  const rows = records().map((order) => ({ ...order, orderNo: `DD-${order.id}`, items: [{ goodsName: order.id, quantity: 1, unitPrice: 1 }] }));
  context.OperationsService = { async list() { return { items: rows }; } };
  const expectedRange = { startDate: '2026-11-17', endDate: '2026-11-18' };
  const deliveryRange = { startDate: '2026-11-17', endDate: '2026-11-17' };
  const rangePickers = [];
  context.DateRangePicker = { mount({ container }) { let value = { ...(container.includes('Expected') ? expectedRange : deliveryRange) }; const picker = { getValue() { return value; }, clear() { value = { startDate: '', endDate: '' }; } }; rangePickers.push(picker); return picker; } };
  vm.runInContext(read('order-goods'), context);
  await flush();
  assert.match(h.markup(), /for="goodsExpectedAt">期望送达时间/);
  assert.match(h.markup(), /for="goodsDeliveryDate">配送日期/);
  assert.match(h.markup(), /id="goodsDeliveryDate"[^>]+placeholder="请选择"/);
  assert.match(h.markup(), /id="goodsExpectedAtRange"/);
  assert.match(h.markup(), /id="goodsDeliveryDateRange"/);
  assert.doesNotMatch(h.markup(), /goodsDateFilterType/);
  const body = node('#orderGoodsBody').innerHTML;
  assert.match(body, /DD-A/);
  assert.match(body, /DD-B/);
  assert.doesNotMatch(body, /DD-C/);
  const click = async (id) => { listeners.click({ target: { closest(selector) { return selector === `#${id}` ? this : null; } } }); await flush(); };
  await click('goodsQuery');
  await click('goodsExport');
  const params = new URL(h.destination(), 'https://prototype.local').searchParams;
  const payload = JSON.parse(context.sessionStorage.getItem(params.get('exportKey')));
  assert.deepEqual(payload.rows.map((row) => row.id), ['A', 'B']);
  await click('goodsReset');
  assert.deepEqual(rangePickers[0].getValue(), { startDate: '', endDate: '' });
  assert.deepEqual(rangePickers[1].getValue(), { startDate: '', endDate: '' });
});

test('分拣、进度、缺货、发货、汇总和线路页面均配置期望及配送日期条件', () => {
  for (const name of ['sorting-management', 'sorting-progress', 'shortage-goods', 'shipping-management', 'order-summary', 'route-management']) {
    const { context } = loadApp();
    context.location = { search: '', hash: '' };
    context.SortingCustomerService = { filterOptions() { return []; } };
    vm.runInContext(read(name), context);
    const config = context.RecordPageConfig;
    const filterSets = [config.filters, ...(config.tabs || []).map((tab) => tab.filters)].filter(Boolean);
    for (const fields of filterSets.filter((fields) => fields.length)) {
      const expected = fields.find((field) => field.key === 'expectedAt' || (name === 'route-management' && field.key === 'shippingAt'));
      assert.ok(expected, name);
      if (name === 'route-management') assert.equal(expected.label, expected.key === 'shippingAt' ? '发货日期' : '期望送达时间');
      if (expected.switchableDate) continue;
      const delivery = fields.find((field) => field.key === 'deliveryDate');
      assert.equal(expected.type, 'date', name);
      assert.equal(delivery?.type, 'date', name);
      assert.equal(delivery?.label, '配送日期', name);
    }
  }
});

test('商品分拣和客户分拣的期望送达时间与配送日期均为单日筛选', () => {
  const { context } = loadApp();
  context.location = { search: '', hash: '' };
  context.SortingCustomerService = { filterOptions() { return []; } };
  vm.runInContext(read('sorting-management'), context);
  const filterSets = [context.RecordPageConfig.filters, ...context.RecordPageConfig.tabs.map((tab) => tab.filters)].filter(Boolean);
  for (const fields of filterSets) {
    assert.equal(fields.find((field) => field.key === 'expectedAt')?.type, 'date');
    const deliveryDate = fields.find((field) => field.key === 'deliveryDate');
    assert.equal(deliveryDate?.type, 'date');
    assert.equal(deliveryDate?.label, '配送日期');
  }
});

test('单日配送日期查询在客户分拣和进度统计中包括次日早餐，且没有叠加期望日期条件', async () => {
  const { context } = loadApp({ services: ['assets/js/services/operations-service.js', 'assets/js/services/sorting-customer-service.js'] });
  context.DemoStore.replace('orders', []);
  context.DemoStore.replace('sortingItems', records().map((row) => ({ ...row, customerName: '切换测试学校', canteen: '第一食堂',
    goodsName: '白菜', orderQty: 1, actualQty: 0, status: 'PENDING' })));
  const condition = { deliveryDate: '2026-11-17', customerName: '切换测试学校' };
  const progress = await context.OperationsService.list('sortingProgress', { condition });
  assert.equal(progress.items[0].orderCount, 2);
  const customer = await context.SortingCustomerService.list('sortingProgress', { condition });
  assert.deepEqual(Array.from(customer.items[0].items, (row) => row.id).sort(), ['A', 'B']);
});
