const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const { root, loadApp } = require('./helpers/app-context.cjs');
const plain = (value) => JSON.parse(JSON.stringify(value));
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

function setup() {
  const app = loadApp({ services: ['assets/js/services/route-service.js'] });
  const { context: c } = app;
  c.location = { search: '' };
  c.DemoStore.replace('orders', [
    { id: 'A', orderNo: 'DD-A', customerName: '甲学校', route: '一线', canteen: '第一食堂', warehouse: '中心仓',
      expectedAt: '2026-11-21 07:00:00', deliveryAt: '2026-11-20 07:00:00', orderAmount: 100, status: 'READY_FOR_SHIPPING', items: [] },
    { id: 'B', orderNo: 'DD-B', customerName: '乙学校', route: '一线', warehouse: '中心仓',
      expectedAt: '2026-11-20 12:00:00', deliveryAt: '2026-11-20 12:00:00', orderAmount: 200, status: 'COMPLETED', items: [] },
    { id: 'C', orderNo: 'DD-C', customerName: '丙学校', route: '二线', warehouse: '北区仓',
      expectedAt: '2026-11-21 12:00:00', deliveryAt: '2026-11-21 12:00:00', orderAmount: 300, status: 'COMPLETED', items: [] }
  ]);
  c.DemoStore.replace('shippingOrders', [
    { id: 'S-A', orderId: 'A', vehicle: '沪A12345', address: '甲校收货区', shippingAmount: 90, loadingStatus: '待装车', shippingAt: '2026-11-20 06:00:00' },
    { id: 'S-B', orderId: 'B', vehicle: '沪A12345', address: '乙校收货区', shippingAmount: 180, loadingStatus: '已装车', loadingPhotos: ['https://example.com/loading.jpg'], shippingAt: '2026-11-20 08:00:00' },
    { id: 'S-C', orderId: 'C', vehicle: '沪B12345', shippingAmount: 280, loadingStatus: '已装车', departureStatus: '已发车', shippingAt: '2026-11-21 08:00:00' }
  ]);
  vm.runInContext(read('assets/js/pages/route-management.js'), c);
  return app;
}

test('四个标签页的查询项、列表列与截图一致，配送日期紧随日期条件', () => {
  const { context: c } = setup();
  const config = c.RecordPageConfig;
  assert.equal(config.previewData, false);
  assert.equal(config.useDemoListLayout, true);
  const labels = (items) => Array.from(items, (field) => field.label);
  const [routes, orders, loading, departures] = config.tabs;
  assert.deepEqual(labels(routes.filters), ['期望送达时间', '配送日期', '仓库', '线路名称']);
  assert.deepEqual(labels(orders.filters), ['期望送达时间', '配送日期', '仓库', '线路', '客户名称', '状态']);
  assert.deepEqual(labels(loading.filters), ['发货日期', '配送日期', '仓库', '线路', '客户名称', '状态']);
  assert.deepEqual(labels(departures.filters), ['发货日期', '配送日期', '仓库', '线路']);
  assert.deepEqual(labels(routes.columns), ['线路名称', '客户数', '下单客户数', '下单数', '下单金额', '仓库', '关联车辆', '关联司机', '状态']);
  assert.deepEqual(labels(orders.columns), ['订单号', '客户名称', '食堂', '线路', '仓库', '配送地址', '状态', '订单状态', '下单金额']);
  assert.deepEqual(labels(loading.columns), ['订单号', '客户名称', '食堂', '线路', '仓库', '配送地址', '装车拍照', '配送金额', '状态', '订单状态']);
  assert.equal(orders.hideRowActions, true);
  assert.equal(loading.hideSequence, true);
  assert.equal(loading.selectable, true);
  assert.equal(loading.toolbar[0].requiresSelection, true);
  assert.equal(departures.hideTable, true);
  assert.match(departures.renderSummary(null), /配送车辆：[\s\S]*配送客户总数：[\s\S]*总配送金额：[\s\S]*已发车：[\s\S]*待发车：/);
});

test('线路按线路汇总、装车按订单展示，订单状态独立于分配和装车状态', async () => {
  const { context: c } = setup();
  const before = JSON.stringify(c.DemoStore.snapshot());
  const query = { condition: { deliveryDate: '2026-11-20', warehouse: '中心仓' } };
  const routes = await c.RouteService.list('routes', query);
  assert.equal(routes.total, 1);
  assert.equal(routes.items[0].customerCount, 2);
  assert.equal(routes.items[0].orderingCustomerCount, 2);
  assert.equal(routes.items[0].orderCount, 2);
  assert.equal(routes.items[0].orderAmount, 300);
  const loading = await c.RouteService.list('routeLoading', query);
  assert.deepEqual(Array.from(loading.items, (row) => row.id).sort(), ['A', 'B']);
  const row = loading.items.find((row) => row.id === 'B');
  assert.equal(row.address, '乙校收货区');
  assert.equal(row.orderStatus, 'COMPLETED');
  assert.equal(row.loadingStatus, '已装车');
  assert.equal(row.deliveryAmount, 180);
  assert.equal(row.loadingPhotos.length, 1);
  assert.equal((await c.RouteService.list('routeLoading', { condition: { status: '待装车' } })).items[0].id, 'A');
  assert.equal((await c.RouteService.list('routeOrders', { condition: { status: '已分配', orderStatus: 'READY_FOR_SHIPPING' } })).total, 1);
  assert.equal(JSON.stringify(c.DemoStore.snapshot()), before, '查询不修改现有演示数据');
});

test('期望日期、配送日期、发货日期和仓库按交集查询，空结果不会回退其他订单', async () => {
  const { context: c } = setup();
  const list = (condition) => c.RouteService.list('routeLoading', { condition });
  assert.equal((await list({ expectedAt: '2026-11-21', deliveryDate: '2026-11-20' })).items[0].id, 'A');
  assert.equal((await list({ shippingAt: '2026-11-20', warehouse: '北区仓' })).total, 0);
  assert.equal((await list({ shippingAt: '2026-11-20', deliveryDate: '2026-11-21' })).total, 0);
  assert.equal((await list({ customerName: '不存在学校' })).total, 0);
  assert.equal((await c.RouteService.list('routes', { condition: { route: '不存在线路' } })).total, 0);
  const noOrders = await c.RouteService.list('routes', { condition: { expectedAt: '2026-12-31' } });
  assert.equal(noOrders.total, 2, '日期无订单时保留线路');
  assert.ok(noOrders.items.every((row) => row.orderCount === 0 && row.orderAmount === 0));
});

test('发车汇总覆盖全部筛选结果，合并同日同车并分别统计已发和待发车辆', async () => {
  const { context: c } = setup();
  const all = await c.RouteService.list('routeDepartures', { pageSize: 1 });
  assert.equal(all.items.length, 1);
  assert.deepEqual(plain(all.summary), { vehicleCount: 2, customerCount: 3, deliveryAmount: 550, departedCount: 1, pendingCount: 1 });
  const filtered = await c.RouteService.list('routeDepartures', { condition: { shippingAt: '2026-11-20' } });
  assert.deepEqual(plain(filtered.summary), { vehicleCount: 1, customerCount: 2, deliveryAmount: 270, departedCount: 0, pendingCount: 1 });
  const empty = await c.RouteService.list('routeDepartures', { condition: { warehouse: '不存在' } });
  assert.deepEqual(plain(empty.summary), { vehicleCount: 0, customerCount: 0, deliveryAmount: 0, departedCount: 0, pendingCount: 0 });
});

test('批量装车只处理当前条件内的待装车订单，并能持久化重载', async () => {
  const { context: c, values } = setup();
  const query = { warehouse: '中心仓', shippingAt: '2026-11-20' };
  await assert.rejects(c.RouteService.batch('routeLoading', ['A', 'C'], 'load', {}, query), /当前查询范围/);
  await assert.rejects(c.RouteService.batch('routeLoading', ['A', 'B'], 'load', {}, query), /待装车/);
  assert.equal(c.DemoStore.get('routeLoadingRecords').length, 0);
  await c.RouteService.batch('routeLoading', ['A'], 'load', {}, query);
  assert.equal((await c.RouteService.get('routeLoading', 'A')).loadingStatus, '已装车');
  const reloaded = loadApp({ storage: Object.fromEntries(values), services: ['assets/js/services/route-service.js'] }).context;
  assert.equal((await reloaded.RouteService.get('routeLoading', 'A')).loadingStatus, '已装车');
  assert.equal((await reloaded.RouteService.get('routeLoading', 'B')).loadingPhotos.length, 1);
});

test('未装、部分装和全部装车时始终显示两个按钮，并按装车状态禁用', async () => {
  const { context: c } = setup();
  const tab = c.RecordPageConfig.tabs.find((tab) => tab.key === 'loading');
  assert.deepEqual(Array.from(tab.rowActions, (action) => action.label), ['去装车', '打回']);
  const [load, returned] = tab.rowActions;
  for (const [loadingStatus, loadDisabled, returnDisabled] of [
    ['待装车', false, true], ['部分装车', false, false], ['已装车', true, false]
  ]) {
    const row = { loadingStatus };
    assert.equal(load.disabled(row), loadDisabled, loadingStatus);
    assert.equal(returned.disabled(row), returnDisabled, loadingStatus);
    assert.equal(tab.selectableWhen(row), !loadDisabled, loadingStatus);
  }
  const { node, clickTab } = mountPage(c);
  await flush();
  await clickTab('loading');
  const html = node('#recordBody').innerHTML;
  const pendingRow = html.match(/<tr data-id="A">([\s\S]*?)<\/tr>/)[1];
  const loadedRow = html.match(/<tr data-id="B">([\s\S]*?)<\/tr>/)[1];
  assert.match(pendingRow, /data-row-action="load">去装车/);
  assert.match(pendingRow, /data-row-action="return-loading" disabled>打回/);
  assert.match(loadedRow, /data-row-action="load" disabled>去装车/);
  assert.match(loadedRow, /data-row-action="return-loading">打回/);
});

test('部分装车可继续装车或打回，已装车打回后清除装车状态并持久化', async () => {
  const { context: c, values } = setup();
  c.DemoStore.transact((state) => {
    const shipment = state.shippingOrders.find((row) => row.orderId === 'A');
    shipment.loadingStatus = '部分装车';
    shipment.loadingAt = '2026-11-20 06:00:00';
    shipment.loadingPhotos = ['https://example.com/partial.jpg'];
  });
  assert.equal((await c.RouteService.list('routeLoading', { condition: { status: '部分装车' } })).items[0].id, 'A');
  await c.RouteService.transition('routeLoading', 'A', 'return-loading');
  const returned = await c.RouteService.get('routeLoading', 'A');
  assert.equal(returned.loadingStatus, '待装车');
  assert.equal(returned.loadingAt, '');
  assert.equal(returned.loadingPhotos.length, 0);
  await assert.rejects(c.RouteService.transition('routeLoading', 'A', 'return-loading'), /尚未装车/);
  c.DemoStore.transact((state) => { state.routeLoadingRecords.find((row) => row.orderId === 'A').loadingStatus = '部分装车'; });
  await c.RouteService.batch('routeLoading', ['A'], 'load');
  assert.equal((await c.RouteService.get('routeLoading', 'A')).loadingStatus, '已装车');
  await assert.rejects(c.RouteService.transition('routeLoading', 'A', 'load'), /待装车或部分装车/);
  await c.RouteService.transition('routeLoading', 'B', 'return-loading');
  const reloaded = loadApp({ storage: Object.fromEntries(values), services: ['assets/js/services/route-service.js'] }).context;
  assert.equal((await reloaded.RouteService.get('routeLoading', 'A')).loadingStatus, '已装车');
  const originalLoaded = await reloaded.RouteService.get('routeLoading', 'B');
  assert.equal(originalLoaded.loadingStatus, '待装车');
  assert.equal(originalLoaded.loadingAt, '');
  assert.equal(originalLoaded.orderStatus, 'COMPLETED');
});

test('线路新增、编辑、启停和删除可持久化，空线路仍可管理', async () => {
  const { context: c } = setup();
  const created = await c.RouteService.create('routes', { route: '三线', warehouse: '中心仓', vehicle: '沪C12345', driver: '司机三' });
  assert.equal((await c.RouteService.get('routes', created.id)).orderCount, 0);
  await assert.rejects(c.RouteService.create('routes', { route: '三线' }), /已存在/);
  await c.RouteService.update('routes', created.id, { route: '新三线', warehouse: '北区仓', vehicle: '沪C12345' });
  assert.equal((await c.RouteService.get('routes', created.id)).driver, '司机三');
  await c.RouteService.transition('routes', created.id, 'disable');
  assert.equal((await c.RouteService.get('routes', created.id)).status, 'DISABLE');
  await c.RouteService.transition('routes', created.id, 'enable');
  assert.equal((await c.RouteService.get('routes', created.id)).status, 'ENABLE');
  await c.RouteService.remove('routes', created.id);
  assert.equal(await c.RouteService.get('routes', created.id), null);
});

function mountPage(c) {
  const nodes = new Map(), listeners = {};
  const node = (key) => {
    if (!nodes.has(key)) nodes.set(key, { value: '', innerHTML: '', dataset: {}, isConnected: true,
      classList: { add() {}, remove() {}, toggle() {} },
      querySelector: node, querySelectorAll(selector) {
        if (selector === '[data-toolbar-action]' && node('.operations-toolbar-main').innerHTML.includes('data-toolbar-action="batch-load"')) {
          const button = node('batchLoadButton');
          button.dataset.toolbarAction = 'batch-load';
          return [button];
        }
        return [];
      },
      closest() { return null; },
      setAttribute() {}, remove() {}, appendChild() {},
      addEventListener(type, callback) { listeners[type] = callback; } });
    return nodes.get(key);
  };
  c.AppShell = { mount() { return node('root'); } };
  c.document = { createElement() { return node('created'); } };
  vm.runInContext(read('assets/js/pages/record-page.js'), c);
  const clickTab = (key) => listeners.click({ target: { dataset: { viewTab: key },
    closest(selector) { return selector === '[data-view-tab]' ? this : null; } } });
  return { node, clickTab, listeners };
}
const flush = () => new Promise((resolve) => setImmediate(resolve));

test('实际列表组件切换四页时同步列头、选择框及汇总区域', async () => {
  const { context: c } = setup();
  const { node, clickTab, listeners } = mountPage(c);
  await flush();
  assert.match(node('#recordHead').innerHTML, /下单客户数/);
  assert.doesNotMatch(node('#recordHead').innerHTML, /recordSelectAll/);
  await clickTab('orders');
  assert.match(node('#recordHead').innerHTML, /配送地址/);
  assert.doesNotMatch(node('#recordHead').innerHTML, /<th>操作<\/th>/);
  await clickTab('loading');
  assert.match(node('#recordHead').innerHTML, /recordSelectAll/);
  assert.match(node('#recordHead').innerHTML, /装车拍照/);
  assert.doesNotMatch(node('#recordHead').innerHTML, /<th>序号<\/th>/);
  assert.match(node('#recordBody').innerHTML, /checked.*disabled|disabled/);
  const batchButton = node('batchLoadButton');
  assert.equal(batchButton.disabled, true, '未勾选时禁用批量装车');
  const selectRow = (checked) => listeners.change({ target: {
    checked, matches() { return false; },
    classList: { contains(name) { return name === 'record-row-select'; } },
    closest() { return { dataset: { id: 'A' } }; }
  } });
  selectRow(true);
  assert.equal(batchButton.disabled, false, '勾选待装车项后启用');
  selectRow(false);
  assert.equal(batchButton.disabled, true, '取消全部勾选后恢复禁用');
  await clickTab('departures');
  assert.equal(node('.operations-table-container').hidden, true);
  assert.equal(node('#recordSummary').hidden, false);
  assert.match(node('#recordSummary').innerHTML, /配送客户总数：3/);
  await clickTab('routes');
  assert.equal(node('.operations-table-container').hidden, false);
  assert.equal(node('#recordSummary').hidden, true);
});

test('快速切换页签时较早返回的列表不会覆盖当前页', async () => {
  const { context: c } = setup();
  let resolveRoutes;
  const list = c.RouteService.list.bind(c.RouteService);
  c.RouteService.list = (resource, query) => resource === 'routes'
    ? new Promise((resolve) => { resolveRoutes = resolve; }) : list(resource, query);
  const { node, clickTab } = mountPage(c);
  await clickTab('orders');
  resolveRoutes({ items: [{ id: 'STALE', route: '过期数据' }], total: 1 });
  await flush();
  assert.match(node('#recordBody').innerHTML, /DD-A/);
  assert.doesNotMatch(node('#recordBody').innerHTML, /过期数据/);
});
