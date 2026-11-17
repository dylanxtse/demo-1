const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { loadApp, root } = require('./helpers/app-context.cjs');

test('订单查询分别按期望送达时间和配送时间取交集，兼容旧订单', async () => {
  const { context } = loadApp({ services: ['assets/js/services/operations-service.js'] });
  const templates = context.DemoStore.get('orders').slice(0, 4);
  context.DemoStore.updateSettings({ recipeDeliveryByMeal: { breakfast: { days: 1 }, lunch: { days: 0 } } });
  const records = templates.map((item, index) => ({ ...item, id: `date-filter-${index}`, orderId: `date-filter-${index}`,
    expectedAt: index === 2 ? '2026-11-18 09:30:00' : '2026-11-17 09:30:00',
    mealKey: index === 1 ? 'lunch' : index === 3 ? '' : 'breakfast',
    mealName: index === 1 ? '午餐' : index === 3 ? '' : '早餐'
  }));
  records[0].deliveryAt = '2026-11-16 09:30:00';
  records[1].deliveryAt = '2026-11-17 09:30:00';
  delete records[2].deliveryAt;
  delete records[3].deliveryAt;
  context.DemoStore.replace('orders', records);
  const query = async (condition) => Array.from((await context.OperationsService.list('orders', { condition, pageSize: 99 })).items, (item) => item.id).sort();
  assert.deepEqual(await query({ expectedAtRange: ['2026-11-17', '2026-11-17'] }), ['date-filter-0', 'date-filter-1', 'date-filter-3']);
  assert.deepEqual(await query({ deliveryDateRange: ['2026-11-16', '2026-11-16'] }), ['date-filter-0']);
  assert.deepEqual(await query({ deliveryDateRange: ['2026-11-17', '2026-11-17'] }), ['date-filter-1', 'date-filter-3']);
  assert.deepEqual(await query({ deliveryDateRange: ['', '2026-11-16'] }), ['date-filter-0']);
  assert.deepEqual(await query({ deliveryDateRange: ['2026-11-18', ''] }), ['date-filter-2']);
  assert.deepEqual(await query({ expectedAtRange: ['2026-11-17', '2026-11-17'], deliveryDateRange: ['2026-11-17', '2026-11-17'] }), ['date-filter-1', 'date-filter-3']);
});

test('订单日期筛选拆成两个独立区间并同时过滤结果，配送时间默认空', async () => {
  const { context } = loadApp();
  const nodes = new Map();
  const listeners = {};
  const dateMatches = [];
  const originalMatches = context.OrderDelivery.matches.bind(context.OrderDelivery);
  context.OrderDelivery.matches = (row, condition) => {
    if (Object.keys(condition || {}).some((key) => /^(expectedAt|deliveryDate)/.test(key))) dateMatches.push(condition);
    return originalMatches(row, condition);
  };
  const makeNode = (id) => ({ id, value: '', innerHTML: '', attributes: {}, dataset: {},
    classList: { add() {}, contains() { return false; } },
    setAttribute(key, value) { this.attributes[key] = value; },
    closest() { return null; }
  });
  const node = (id) => { if (!nodes.has(id)) nodes.set(id, makeNode(id)); return nodes.get(id); };
  const rows = [
    { id: 'A', orderNo: 'A', customerName: 'Alpha', expectedAt: '2026-11-18 07:30:00', deliveryAt: '2026-11-17 07:30:00', deliveryDate: '2026-11-17', status: 'PENDING' },
    { id: 'B', orderNo: 'B', customerName: 'Beta', expectedAt: '2026-11-17 07:30:00', deliveryAt: '2026-11-17 07:30:00', deliveryDate: '2026-11-17', status: 'PENDING' },
    { id: 'C', orderNo: 'C', customerName: 'Gamma', expectedAt: '2026-11-17 07:30:00', deliveryAt: '2026-11-16 07:30:00', deliveryDate: '2026-11-16', status: 'PENDING' }
  ];
  let markup = '';
  context.AppShell = { mount({ content }) {
    markup = content;
    return {
      querySelector(selector) { return selector.startsWith('#') ? node(selector.slice(1)) : null; },
      querySelectorAll(selector) { return selector === '.operations-filter input, .operations-filter select' ? [
        'expectedAt', 'expectedAtStart', 'expectedAtEnd', 'deliveryDate', 'deliveryDateStart', 'deliveryDateEnd', 'orderNo', 'customerName',
        'customerType', 'status', 'orderTag', 'mealName', 'warehouse', 'source', 'receiptStatus', 'orderType', 'netVegetable'
      ].map(node) : []; },
      addEventListener(type, handler) { listeners[type] = handler; }
    };
  } };
  context.document = { addEventListener() {}, querySelectorAll() { return []; } };
  context.OperationsService = { async list() { return { items: rows, total: rows.length }; } };
  context.DateRangePicker = { mount({ container }) {
    const prefix = container === '#orderExpectedAtRange' ? 'expectedAt' : 'deliveryDate';
    return {
      clear() { this.setValue('', ''); },
      setValue(start, end) { node(`${prefix}Start`).value = start; node(`${prefix}End`).value = end; },
      getValue() { return { startDate: node(`${prefix}Start`).value, endDate: node(`${prefix}End`).value }; }
    };
  } };
  context.Pagination = { create() { return { update() {} }; } };
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/pages/order-management.js'), 'utf8'), context);
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(node('tableBody').innerHTML, />A[\s\S]*>B[\s\S]*>C/);
  assert.match(markup, /for="expectedAt">期望送达时间/);
  assert.match(markup, /for="deliveryDate">配送时间/);
  assert.match(markup, /id="deliveryDate" type="text" placeholder="请选择"/);
  assert.doesNotMatch(markup, /orderDateFilterType|<option value="deliveryDate">配送日期/);
  node('expectedAtStart').value = '2026-11-17';
  node('expectedAtEnd').value = '2026-11-17';
  node('deliveryDateStart').value = '2026-11-17';
  node('deliveryDateEnd').value = '2026-11-17';
  await listeners.click({ target: node('queryButton') });
  assert.match(node('tableBody').innerHTML, />B</);
  assert.doesNotMatch(node('tableBody').innerHTML, />A|>C/);
  assert.ok(dateMatches.some((condition) => Object.hasOwn(condition, 'expectedAtRange')));
  assert.ok(dateMatches.some((condition) => Object.hasOwn(condition, 'deliveryDateRange')));

  await listeners.click({ target: node('resetButton') });
  assert.equal(node('expectedAtStart').value, '');
  assert.equal(node('expectedAtEnd').value, '');
  assert.equal(node('deliveryDateStart').value, '');
  assert.equal(node('deliveryDateEnd').value, '');
});
