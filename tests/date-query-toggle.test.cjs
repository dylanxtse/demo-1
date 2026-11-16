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
  test(`通用${type}查询共用一个控件，切换保留日期、日期仅展示样式、导出始终保留数据`, async () => {
    const h = harness();
    const { context, node, listeners } = h;
    const calls = [];
    let selectedRange = { startDate: '2026-11-17', endDate: '2026-11-17' };
    node('#filter-expectedAt').value = '2026-11-17';
    context.DatePicker = { create() { return { destroy() {} }; } };
    context.DateRangePicker = { create() { return { getValue: () => selectedRange, destroy() {} }; } };
    context.OperationsService = { async list(resource, query) {
      calls.push(JSON.parse(JSON.stringify(query)));
      const items = records().filter((row) => context.OrderDelivery.matches(row, query.condition));
      return { items, total: items.length };
    } };
    vm.runInContext(read('record-page'), context);
    const controller = context.RecordPage.mount({ title: '日期查询', resource: 'sortingItems', pageClass: 'operations-page', deliveryDates: true,
      filters: [{ key: 'expectedAt', label: '期望送达时间', type, switchableDate: true,
        defaultValue: '2026-11-17', defaultStart: '2026-11-17', defaultEnd: '2026-11-17' }], columns: [],
      toolbar: [{ key: 'export', label: '导出', templateHref: './sorting-independent-export.html' }] });
    await flush();
    assert.equal((h.markup().match(/data-record-date-type=/g) || []).length, 1);
    assert.doesNotMatch(h.markup(), /id="filter-deliveryDate"/);
    assert.deepEqual(Array.from(controller.state.items, (row) => row.id), ['A', 'B', 'C']);
    const mode = { dataset: { recordDateType: 'expectedAt' }, value: 'deliveryDate' };
    listeners.change({ target: mode });
    assert.equal(calls.length, 1, '切换类型不擅自改变已查询结果');
    assert.equal(node('#filter-expectedAt').value, '2026-11-17');
    assert.equal(node('#filter-expectedAt').attributes['aria-label'], type === 'dateRange' ? '配送日期范围' : '配送日期');
    controller.state.selected.add('C');
    await listeners.click({ target: { id: 'recordQuery', closest() { return null; } } });
    assert.deepEqual(Array.from(controller.state.items, (row) => row.id), ['A', 'B', 'C']);
    assert.equal(controller.state.selected.size, 0);
    assert.deepEqual(calls.at(-1).condition, {});
    mode.value = 'expectedAt';
    listeners.change({ target: mode });
    const exportButton = { dataset: { toolbarAction: 'export' }, closest(selector) { return selector === '[data-toolbar-action]' ? this : null; } };
    await listeners.click({ target: exportButton });
    const key = new URL(h.destination(), 'https://prototype.local').searchParams.get('deliveryExportKey');
    assert.deepEqual(JSON.parse(context.sessionStorage.getItem(key)).map((row) => row.id), ['A', 'B', 'C']);
    await listeners.click({ target: { id: 'recordReset', closest() { return null; } } });
    assert.equal(controller.state.dateTypes.expectedAt, undefined);
    assert.deepEqual(calls.at(-1).condition, {});
    node('#filter-expectedAt').value = '';
    selectedRange = { startDate: '', endDate: '' };
    await listeners.click({ target: { id: 'recordQuery', closest() { return null; } } });
    assert.deepEqual(calls.at(-1).condition, {});
  });
}

test('订单商品只保留一个日期查询，切换后日期不筛掉列表或导出数据，重置恢复期望送达时间', async () => {
  const h = harness();
  const { context, node, listeners } = h;
  const rows = records().map((order) => ({ ...order, items: [{ goodsName: order.id, quantity: 1, unitPrice: 1 }] }));
  context.OperationsService = { async list() { return { items: rows }; } };
  context.DatePicker = { mount() { return { clear() { node('#goodsExpectedAt').value = ''; } }; } };
  node('#goodsExpectedAt').value = '2026-11-17';
  vm.runInContext(read('order-goods'), context);
  await flush();
  assert.match(h.markup(), /id="goodsDateFilterType"/);
  assert.doesNotMatch(h.markup(), /goodsDeliveryRange|goodsDeliveryStart|goodsDeliveryEnd/);
  const click = async (id) => { listeners.click({ target: { closest(selector) { return selector === `#${id}` ? this : null; } } }); await flush(); };
  node('#goodsDateFilterType').value = 'deliveryDate';
  listeners.change({ target: node('#goodsDateFilterType') });
  assert.equal(node('#goodsExpectedAt').value, '2026-11-17');
  await click('goodsQuery');
  await click('goodsExport');
  const params = new URL(h.destination(), 'https://prototype.local').searchParams;
  const payload = JSON.parse(context.sessionStorage.getItem(params.get('exportKey')));
  assert.deepEqual(payload.rows.map((row) => row.id), ['A', 'B', 'C']);
  await click('goodsReset');
  assert.equal(node('#goodsDateFilterType').value, 'expectedAt');
  assert.equal(node('#goodsExpectedAt').attributes['aria-label'], '期望送达时间');
  assert.equal(node('#goodsExpectedAt').value, '');
});

test('分拣、进度、缺货、发货和四类线路页签没有独立配送日期查询框', () => {
  for (const name of ['sorting-management', 'sorting-progress', 'shortage-goods', 'shipping-management', 'route-management']) {
    const { context } = loadApp();
    context.location = { search: '', hash: '' };
    context.SortingCustomerService = { filterOptions() { return []; } };
    vm.runInContext(read(name), context);
    const config = context.RecordPageConfig;
    for (const fields of [config.filters, ...(config.tabs || []).map((tab) => tab.filters)].filter(Boolean)) {
      assert.equal(fields.filter((field) => field.key === 'deliveryDate').length, 0, name);
      const dateFields = fields.filter((field) => field.type === 'date' || field.type === 'dateRange');
      assert.equal(dateFields.length, 1, name);
      if (name !== 'shipping-management' || fields !== config.tabs?.find((tab) => tab.key === 'difference')?.filters) {
        assert.equal(dateFields[0].switchableDate, true, name);
      }
    }
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
