const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { root, loadApp } = require('./helpers/app-context.cjs');

function configFor(name) {
  const context = {
    Date, Math, JSON, Map, Set, URLSearchParams,
    location: { search: '', hash: '' },
    DemoStore: { get: () => [] },
    SortingCustomerService: { filterOptions: () => [] }
  };
  context.window = context;
  vm.runInNewContext(fs.readFileSync(path.join(root, `assets/js/pages/${name}.js`), 'utf8'), context);
  return context.RecordPageConfig;
}

test('分拣和发货相关页签使用日期区间查询', () => {
  for (const name of ['sorting-management', 'sorting-progress', 'shortage-goods', 'shipping-management']) {
    const config = configFor(name);
    for (const filters of [config.filters, ...(config.tabs || []).map((tab) => tab.filters).filter(Boolean)]) {
      const field = filters.find((item) => item.key === 'expectedAt');
      assert.equal(field.type, 'dateRange', name);
      assert.equal(field.conditionKey, undefined, name);
    }
  }
  assert.equal(configFor('order-summary').filters.find((item) => item.key === 'expectedAt').type, 'dateRange');
});

test('单天查询包含当天零点和最后一秒，不包含前后日期', async () => {
  const { context } = loadApp({ services: [
    'assets/js/services/operations-service.js',
    'assets/js/services/sorting-customer-service.js'
  ] });
  context.DemoStore.replace('orders', []);
  const dates = ['2026-11-06 23:59:59', '2026-11-07 00:00:00', '2026-11-07 23:59:59', '2026-11-08 00:00:00'];
  const rows = dates.map((expectedAt, index) => ({
    id: `DAY-${index}`, customerName: '单天查询学校', canteen: '第一食堂',
    expectedAt, status: 'PENDING', orderQty: 1, actualQty: 0,
    orderNo: `DD2026110703000000${index + 1}`, goodsCode: 'SP0300019', goodsName: '大白菜'
  }));
  context.DemoStore.replace('sortingItems', rows);
  context.DemoStore.replace('shippingOrders', rows);
  const query = { pageSize: 99, condition: { expectedAt: '2026-11-07' } };
  for (const resource of ['sortingItems', 'shippingOrders']) {
    const result = await context.OperationsService.list(resource, query);
    assert.deepEqual(Array.from(result.items, (item) => item.expectedAt).sort(), [dates[1], dates[2]]);
  }
  const customers = await context.SortingCustomerService.list('sortingProgress', query);
  assert.equal(customers.items.length, 1);
  assert.equal(customers.items[0].expectedAt, '2026-11-07');
  assert.equal(customers.items[0].items.length, 2);
});

for (const name of ['shipping-export-template', 'order-shipping-export-template']) {
  test(`${name}日期查询仅展示样式，导出始终有数据`, () => {
    const records = ['2026-11-06 23:59:59', '2026-11-07 00:00:00', '2026-11-07 23:59:59', '2026-11-08 00:00:00']
      .map((expectedAt, index) => ({
        expectedAt, id: `SHIP-${index}`, customerName: `单天学校-${index}`, orderNo: `DD2026110703000000${index + 1}`,
        items: [{ goodsName: '大白菜', unit: '斤', orderQty: 1, shippingQty: 1, unitPrice: 1 }]
      }));
    const host = { innerHTML: '' };
    const context = {
      URLSearchParams,
      location: { search: '?expectedAt=2026-11-07' },
      document: { getElementById() { return host; }, querySelector() { return null; } },
      DemoStore: { get(resource) { return resource === 'shippingOrders' ? records : []; } }
    };
    context.window = context;
    vm.createContext(context);
    vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/utils/prototype-preview.js'), 'utf8'), context);
    vm.runInContext(fs.readFileSync(path.join(root, `assets/js/pages/${name}.js`), 'utf8'), context);
    assert.match(host.innerHTML, /单天学校-1/);
    assert.match(host.innerHTML, /单天学校-2/);
    assert.match(host.innerHTML, /单天学校-0/);
    assert.match(host.innerHTML, /单天学校-3/);
  });
}
