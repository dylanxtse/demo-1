const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { loadApp, root } = require('./helpers/app-context.cjs');

test('订单查询可按期望送达时间或配送日期筛选，兼容未保存配送字段的旧订单', async () => {
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
});

test('订单日期切换保留日期范围，日期仅展示样式，重置恢复默认', async () => {
  const { context } = loadApp();
  const nodes = new Map();
  const listeners = {};
  const calls = [];
  const makeNode = (id) => ({ id, value: '', innerHTML: '', attributes: {},
    classList: { add() {}, contains() { return false; } },
    setAttribute(key, value) { this.attributes[key] = value; },
    closest() { return null; }
  });
  const node = (id) => { if (!nodes.has(id)) nodes.set(id, makeNode(id)); return nodes.get(id); };
  const fields = ['orderDateFilterType', 'expectedAt', 'expectedAtStart', 'expectedAtEnd', 'orderNo', 'customerName', 'customerType',
    'status', 'orderTag', 'mealName', 'warehouse', 'source', 'receiptStatus', 'orderType', 'netVegetable'];
  fields.forEach(node);
  node('orderDateFilterType').value = 'expectedAt';
  let markup = '';
  context.AppShell = { mount({ content }) {
    markup = content;
    return {
      querySelector(selector) { return selector.startsWith('#') ? node(selector.slice(1)) : null; },
      querySelectorAll(selector) { return selector === '.operations-filter input, .operations-filter select' ? fields.map(node) : []; },
      addEventListener(type, handler) { listeners[type] = handler; }
    };
  } };
  context.document = { addEventListener() {}, querySelectorAll() { return []; } };
  context.OperationsService = { async list(resource, options) {
    calls.push(JSON.parse(JSON.stringify(options)));
    return { items: [], total: 0 };
  } };
  context.DateRangePicker = { mount() { return { clear() { this.setValue('', ''); }, setValue(start, end) { node('expectedAtStart').value = start; node('expectedAtEnd').value = end; } }; } };
  context.Pagination = { create() { return { update() {} }; } };
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/pages/order-management.js'), 'utf8'), context);
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(markup, /<option value="expectedAt">期望送达时间<\/option><option value="deliveryDate">配送日期<\/option>/);
  node('expectedAtStart').value = '2026-11-16';
  node('expectedAtEnd').value = '2026-11-17';
  await listeners.click({ target: node('queryButton') });
  assert.deepEqual(calls.at(-1).condition, {});

  node('orderDateFilterType').value = 'deliveryDate';
  listeners.change({ target: node('orderDateFilterType') });
  assert.equal(node('expectedAt').attributes['aria-label'], '配送日期范围');
  assert.equal(node('expectedAtStart').value, '2026-11-16');
  assert.equal(node('expectedAtEnd').value, '2026-11-17');
  await listeners.click({ target: node('queryButton') });
  assert.deepEqual(calls.at(-1).condition, {});

  await listeners.click({ target: node('resetButton') });
  assert.equal(node('orderDateFilterType').value, 'expectedAt');
  assert.equal(node('expectedAt').attributes['aria-label'], '期望送达时间范围');
  const expectedDefault = Array.from(context.OrderDelivery.defaultWeek());
  assert.equal(node('expectedAtStart').value, expectedDefault[0]);
  assert.equal(node('expectedAtEnd').value, expectedDefault[1]);
  assert.deepEqual(calls.at(-1).condition, {});
});
