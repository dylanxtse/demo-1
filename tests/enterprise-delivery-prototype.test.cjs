const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const { root, loadApp } = require('./helpers/app-context.cjs');

function setup() {
  const app = loadApp({ services: ['assets/js/services/operations-service.js', 'assets/js/services/sorting-customer-service.js', 'assets/js/services/route-service.js'] });
  app.context.DemoStore.updateSettings({ recipeDeliveryByMeal: { breakfast: { days: 1 }, lunch: { days: 0 }, dinner: { days: 0 } } });
  return app;
}

async function createOrders(context) {
  const values = [['BREAKFAST', '2026-11-18 07:30:00', 'breakfast', '早餐', 2], ['LUNCH', '2026-11-17 07:30:00', 'lunch', '午餐', 3], ['DINNER', '2026-11-18 07:30:00', 'dinner', '晚餐', 4]];
  return Promise.all(values.map(([id, expectedAt, mealKey, mealName, quantity]) => context.OperationsService.create('orders', {
    id: `DELIVERY-${id}`, customerName: '配送日期测试学校', canteen: '第一食堂', route: '配送测试线路',
    expectedAt, mealKey, mealName, orderTag: '学生-不区分',
    items: [{ productId: 'SP0300019', goodsCode: 'SP0300019', goodsName: '大白菜', unit: '斤', quantity, unitPrice: 2, isNetVegetable: true }]
  })));
}

const condition = { customerName: '配送日期测试学校', deliveryDateRange: ['2026-11-17', '2026-11-17'] };

test('配送日期贯通商品分拣、客户分拣、进度、缺货、发货和线路，早餐与午餐同日处理', async () => {
  const { context } = setup();
  const orders = await createOrders(context);
  for (const resource of ['orders', 'sortingItems', 'shippingOrders']) {
    const result = await context.OperationsService.list(resource, { pageSize: 99, condition });
    assert.equal(result.items.length, 2, resource);
    assert.deepEqual(Array.from(result.items, (row) => row.deliveryDate), ['2026-11-17', '2026-11-17']);
    assert.ok(result.items.some((row) => row.expectedAt.startsWith('2026-11-18')), resource);
  }
  const customers = await context.SortingCustomerService.list('sortingProgress', { condition });
  assert.equal(customers.total, 1);
  assert.equal(customers.items[0].items.length, 2);
  assert.equal(customers.items[0].deliveryDate, '2026-11-17');
  const breakfastOnly = await context.SortingCustomerService.list('sortingProgress', { condition: { ...condition, expectedAt: '2026-11-18' } });
  assert.equal(breakfastOnly.items[0].items.length, 1);
  assert.equal(breakfastOnly.items[0].orders[0].id, orders[0].id);

  const tasks = (await context.OperationsService.list('sortingItems', { condition, pageSize: 99 })).items;
  await context.OperationsService.transition('sortingItems', tasks.find((row) => row.orderId === orders[0].id).id, 'sort', { actualQty: 2 });
  const progress = await context.OperationsService.list('sortingProgress', { condition });
  assert.equal(progress.total, 1);
  assert.equal(progress.items[0].progress, '1/2');
  context.DemoStore.replace('shortageItems', tasks.map((row) => ({ ...row, shortageQty: 1, status: 'SHORTAGE' })));
  assert.equal((await context.OperationsService.list('shortageItems', { condition })).total, 2);
  for (const resource of ['routes', 'routeOrders', 'routeLoading', 'routeDepartures']) {
    const result = await context.RouteService.list(resource, { condition });
    assert.equal(result.total, resource === 'routeOrders' ? 2 : 1, resource);
    if (resource !== 'routeOrders') assert.equal(result.items[0].orderCount, 2);
    assert.equal((await context.RouteService.get(resource, result.items[0].id)).id, result.items[0].id);
  }
  context.location = { search: '' };
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/pages/route-management.js'), 'utf8'), context);
  const [batch] = (await context.RouteService.list('routes', { condition })).items;
  const href = context.RecordPageConfig.tabs[0].rowActions[0].href(batch, condition);
  const query = new URL(href, 'https://prototype.local').searchParams;
  assert.equal(query.get('customerName'), condition.customerName);
  assert.equal(query.get('deliveryDateRange'), '2026-11-17,2026-11-17');
});

test('同日配送客户的批量分拣只处理当前查询命中的订单，不扩大到被期望日期排除的早餐', async () => {
  const { context } = setup();
  const orders = await createOrders(context);
  const query = { ...condition, expectedAt: '2026-11-17' };
  const result = await context.SortingCustomerService.list('sortingProgress', { condition: query });
  assert.equal(result.items[0].items.length, 1);
  await context.SortingCustomerService.batch('sortingProgress', [result.items[0].id], 'sort', {}, query);
  const items = (await context.OperationsService.list('sortingItems', { condition, pageSize: 99 })).items;
  assert.equal(items.find((row) => row.orderId === orders[0].id).status, 'PENDING');
  assert.equal(items.find((row) => row.orderId === orders[1].id).status, 'SORTED');
});

test('历史日期不随配置变化，旧数据只回退原期望日期，编辑仍可改商品但不能改餐次或日期', async () => {
  const { context } = setup();
  const [order] = await createOrders(context);
  context.DemoStore.updateSettings({ recipeDeliveryByMeal: { breakfast: { days: 8 } } });
  assert.equal(context.OrderSchema.deliveryDate(order), '2026-11-17');
  assert.equal(context.OrderSchema.deliveryDate({ expectedAt: order.expectedAt, mealKey: 'breakfast' }), '2026-11-18');
  const changed = await context.OperationsService.update('orders', order.id, {
    expectedAt: '2026-12-01 12:00:00', deliveryAt: '2026-10-01 00:00:00', mealKey: 'lunch', mealName: '午餐', remark: '更新备注'
  });
  assert.equal(changed.expectedAt, order.expectedAt);
  assert.equal(changed.deliveryAt, order.deliveryAt);
  assert.equal(changed.mealKey, order.mealKey);
  assert.equal(changed.remark, '更新备注');
  const after = await context.OperationsService.list('shippingOrders', { condition });
  assert.ok(after.items.some((row) => row.orderId === order.id));
});

function renderPage(name, context) {
  const nodes = new Map();
  const node = (id) => { if (!nodes.has(id)) nodes.set(id, { innerHTML: '', textContent: '' }); return nodes.get(id); };
  context.document = { getElementById: node, querySelector() { return null; } };
  vm.runInContext(fs.readFileSync(path.join(root, `assets/js/pages/${name}.js`), 'utf8'), context);
  if (['sorting-independent-export', 'sorting-merge-export'].includes(name)) {
    const id = name === 'sorting-independent-export' ? 'independentExportBody' : 'mergeExportBody';
    return fs.readFileSync(path.join(root, `${name}.html`), 'utf8').replace(`<tbody id="${id}"></tbody>`, `<tbody>${node(id).innerHTML}</tbody>`);
  }
  return [...nodes.values()].map((item) => item.innerHTML).join('');
}

function assertTablesAlign(html, name) {
  for (const [, table] of html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/g)) {
    const rows = [...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)].map((match) => match[1]);
    const cells = (row) => [...row.matchAll(/<t[dh]\b([^>]*)>/g)].map((match) => ({
      columns: Number(match[1].match(/colspan="(\d+)"/)?.[1] || 1),
      rows: Number(match[1].match(/rowspan="(\d+)"/)?.[1] || 1)
    }));
    const width = cells(rows[0]).reduce((sum, cell) => sum + cell.columns, 0);
    const colgroup = table.match(/<colgroup>([\s\S]*?)<\/colgroup>/)?.[1];
    if (colgroup) assert.equal([...colgroup.matchAll(/<col\b/g)].length, width, `${name}: 列宽定义`);
    let spans = Array(width).fill(0);
    for (const row of rows) {
      const occupied = spans.map((value) => value > 0);
      const next = spans.map((value) => Math.max(0, value - 1));
      for (const cell of cells(row)) {
        const start = occupied.indexOf(false);
        assert.ok(start >= 0 && start + cell.columns <= width, `${name}: 单元格越界`);
        for (let i = start; i < start + cell.columns; i++) { occupied[i] = true; next[i] = Math.max(next[i], cell.rows - 1); }
      }
      assert.ok(occupied.every(Boolean), `${name}: 行列数不一致`);
      spans = next;
    }
  }
}

test('分拣及发货导出读取完整查询快照，空快照仍展示默认数据，订单发货不截成前两条', async () => {
  for (const name of ['sorting-independent-export', 'sorting-merge-export', 'shipping-export-template', 'order-shipping-export-template']) {
    const { context } = setup();
    const rows = Array.from({ length: 23 }, (_, i) => ({ id: `EXPORT-${i}`, orderNo: `EXPORT-NO-${i}`,
      customerName: `配送导出学校${i}`, canteen: '第一食堂', expectedAt: '2026-11-18 07:30:00', deliveryAt: '2026-11-17 07:30:00',
      goodsName: '大白菜', orderQty: 2, status: 'PENDING', items: [{ goodsName: '大白菜', unit: '斤', orderQty: 2 }] }));
    context.location = { search: `?deliveryExportKey=${context.OrderDelivery.saveRows(rows)}` };
    const html = renderPage(name, context);
    assertTablesAlign(html, name);
    assert.match(html, /配送导出学校22/, name);
    assert.match(html, /2026-11-17/, name);
    context.location.search = `?deliveryExportKey=${context.OrderDelivery.saveRows([])}`;
    const emptyHtml = renderPage(name, context);
    assert.doesNotMatch(emptyHtml, /配送导出学校/, name);
    assert.doesNotMatch(emptyHtml, /暂无/, name);
    assert.match(emptyHtml, /<td[^>]*>[^<]+<\/td>/, name);
  }
});

test('独立及客户导出保留配送日期，订单归并导出不展示日期和导出时间信息行', () => {
  const versions = {
    'order-export-template': ['20260920-order-export-1', 'rows'],
    'order-export-order-template': ['20260920-order-export-order-1', 'rows'],
    'order-export-merged-template': ['20261019-order-merged-export-1', 'rows'],
    'sorting-customer-export-template': ['20260929-sorting-customer-export-template-1', 'groups']
  };
  for (const [name, [version, key]] of Object.entries(versions)) {
    const { context } = setup();
    const row = { orderNo: 'EXPORT-ORDER', customerName: '导出客户', expectedAt: '2026-11-18 07:30:00', deliveryAt: '2026-11-17 07:30:00',
      deliveryDate: '2026-11-17', items: [{ goodsName: '白菜', unit: '斤', quantity: 2, expectedAt: '2026-11-18 07:30:00', deliveryAt: '2026-11-17 07:30:00' }] };
    context.location = { search: `?exportData=${encodeURIComponent(JSON.stringify({ version, [key]: [row], exportedAt: '2026-11-16T01:00:00Z' }))}` };
    const html = renderPage(name, context);
    assertTablesAlign(html, name);
    if (name === 'order-export-merged-template') {
      assert.doesNotMatch(html, /order-merge-meta|配送日期：|导出时间：/);
    } else {
      assert.match(html, /配送日期/, name);
      assert.match(html, /2026-11-17/, name);
      assert.match(html, /2026-11-18/, name);
    }
  }
});

test('日期筛选同步应用到实际列表和导出快照', async () => {
  const { context } = setup();
  const calls = [], nodes = new Map(), listeners = {};
  const makeNode = (key) => ({ id: key, value: '', dataset: {}, innerHTML: '', isConnected: true,
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    querySelector(selector) { return node(selector); }, querySelectorAll() { return []; },
    addEventListener(type, callback) { listeners[type] = callback; }, setAttribute() {}, remove() {}, appendChild() {} });
  const node = (key) => { if (!nodes.has(key)) nodes.set(key, makeNode(key)); return nodes.get(key); };
  const rows = Array.from({ length: 24 }, (_, index) => ({ id: `ROW-${index}`, expectedAt: '2026-11-18 07:30:00',
    deliveryAt: index < 23 ? '2026-11-17 07:30:00' : '2026-11-19 07:30:00' }));
  context.OperationsService = { async list(resource, query) {
    calls.push(query);
    const filtered = rows.filter((row) => context.OrderDelivery.matches(row, query.condition));
    return { items: filtered.slice(0, query.pageSize), total: filtered.length };
  } };
  let destination = '';
  context.AppNavigation = { navigate(url) { destination = url; } };
  context.AppShell = { mount() { return node('root'); } };
  context.document = { querySelector() { return null; }, createElement() { return makeNode('element'); }, addEventListener() {} };
  context.DateRangePicker = { create() { return { getValue: () => ({ startDate: '2026-11-17', endDate: '2026-11-17' }), destroy() {} }; } };
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/pages/record-page.js'), 'utf8'), context);
  context.RecordPage.mount({ title: '配送日期列表', resource: 'sortingItems', pageClass: 'operations-page', deliveryDates: true,
    filters: [{ key: 'deliveryDate', type: 'dateRange', label: '配送日期', conditionKey: 'deliveryDateRange' }], columns: [],
    toolbar: [{ key: 'export', label: '导出', templateHref: './sorting-independent-export.html' }] });
  await new Promise((resolve) => setImmediate(resolve));
  const button = { dataset: { toolbarAction: 'export' }, closest(selector) { return selector === '[data-toolbar-action]' ? this : null; } };
  await listeners.click({ target: button });
  assert.equal(calls[0].pageSize, Number.MAX_SAFE_INTEGER);
  assert.equal(calls.at(-1).pageSize, Number.MAX_SAFE_INTEGER);
  const params = new URL(destination, 'https://prototype.local').searchParams;
  const exported = JSON.parse(context.sessionStorage.getItem(params.get('deliveryExportKey')));
  assert.equal(exported.length, 23);
  assert.ok(exported.some((row) => row.id === 'ROW-22'));
  assert.ok(exported.every((row) => row.deliveryDate === '2026-11-17'));
  assert.deepEqual(JSON.parse(JSON.stringify(calls.at(-1).condition)), {});
});

test('发货和订单发货打印保留期望送达时刻，并显示订单配送快照', () => {
  for (const name of ['shipping-print-template', 'order-shipping-print-template']) {
    const { context } = setup();
    context.location = { search: `?printData=${encodeURIComponent(JSON.stringify({ version: '20260929-shipping-print-template-1', rows: [{
      orderNo: 'PRINT-ORDER', customerName: '打印学校', goodsName: '白菜', expectedAt: '2026-11-18 07:30:00', deliveryAt: '2026-11-17 07:30:00'
    }] }))}` };
    const html = renderPage(name, context);
    assert.match(html, /期望送达时间：2026-11-18 07:30:00/);
    assert.match(html, /配送日期：2026-11-17/);
  }
});

test('发货导出和打印按订单关联明细，不混入同校同一期望日期但配送日不同的另一张订单', () => {
  for (const name of ['shipping-export-template', 'order-shipping-export-template', 'shipping-print-template', 'order-shipping-print-template']) {
    const { context } = setup();
    const order = { orderId: 'ONLY-BREAKFAST', orderNo: 'BREAKFAST-NO', customerName: '同校', canteen: '同食堂',
      expectedAt: '2026-11-18 07:30:00', deliveryAt: '2026-11-17 07:30:00' };
    context.DemoStore.replace('sortingItems', [{ ...order, id: 'B-LINE', goodsName: '早餐专属商品' }, {
      ...order, id: 'D-LINE', orderId: 'ONLY-DINNER', orderNo: 'DINNER-NO', deliveryAt: '2026-11-18 07:30:00', goodsName: '晚餐专属商品'
    }]);
    const query = name.includes('export')
      ? `deliveryExportKey=${context.OrderDelivery.saveRows([order])}`
      : `printData=${encodeURIComponent(JSON.stringify({ version: '20260929-shipping-print-template-1', rows: [order] }))}`;
    context.location = { search: `?${query}` };
    const html = renderPage(name, context);
    assert.match(html, /早餐专属商品/, name);
    assert.doesNotMatch(html, /晚餐专属商品/, name);
  }
});
