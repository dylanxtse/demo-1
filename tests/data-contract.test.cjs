const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { root, loadApp } = require('./helpers/app-context.cjs');

const documentFields = {
  orders: 'orderNo',
  inboundOrders: 'id',
  outboundOrders: 'id',
  processingOrders: 'id',
  returns: 'returnNo',
  receiptChanges: 'changeNo'
};

test('36 个页面的本地资源存在且共享规则脚本顺序正确', () => {
  const pages = fs.readdirSync(root).filter((file) => file.endsWith('.html')).sort();
  assert.equal(pages.length, 36);
  pages.forEach((page) => {
    const source = fs.readFileSync(path.join(root, page), 'utf8');
    const refs = [...source.matchAll(/(?:src|href)=["']([^"'?#]+)["']/g)]
      .map((match) => match[1])
      .filter((value) => !/^(?:https?:|data:|#|javascript:)/.test(value));
    refs.forEach((ref) => {
      assert.ok(fs.existsSync(path.resolve(root, ref)), `${page} 缺少资源 ${ref}`);
    });
    const rulesIndex = source.indexOf('assets/js/utils/business-rules.js');
    const storageIndex = source.indexOf('assets/js/utils/storage.js');
    const repositoryIndex = source.indexOf('assets/js/services/repository.js');
    assert.ok(rulesIndex >= 0 && rulesIndex < storageIndex, `${page} 未先加载业务规则`);
    assert.ok(storageIndex < repositoryIndex, `${page} 数据仓库加载顺序错误`);
  });
});

test('初始化后只存在一个活动业务数据源', () => {
  const { context, values } = loadApp();
  context.DemoStore.snapshot();
  const activeKeys = [...values.keys()].filter((key) =>
    key.startsWith('procurement-') && !key.includes('backup')
  );
  assert.deepEqual(activeKeys, ['procurement-demo-v3']);
});

test('全部核心资源满足字段、单号、日期、状态和关联规则', () => {
  const { context } = loadApp();
  const state = context.DemoStore.snapshot();
  Object.keys(context.BusinessRules.requiredFields).forEach((resource) => {
    const invalid = (state[resource] || []).filter((record) =>
      !context.BusinessRules.validate(resource, record).valid
    );
    assert.equal(invalid.length, 0, `${resource} 存在 ${invalid.length} 条必填字段异常`);
  });

  Object.entries(documentFields).forEach(([resource, field]) => {
    const values = state[resource].map((record) => record[field]);
    assert.equal(values.filter((value) => !context.BusinessRules.documentRegex(resource).test(value)).length, 0);
    assert.equal(new Set(values).size, values.length, `${resource} 单号重复`);
  });

  const dateTimePattern = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
  const dateFields = {
    orders: ['createdAt', 'expectedAt'],
    inboundOrders: ['entryTime'],
    outboundOrders: ['outboundTime'],
    processingOrders: ['createTime']
  };
  Object.entries(dateFields).forEach(([resource, fields]) => {
    fields.forEach((field) => {
      assert.equal(state[resource].filter((record) => !dateTimePattern.test(record[field])).length, 0, `${resource}.${field} 格式不统一`);
    });
  });

  const productByCode = new Map(state.products.map((product) => [product.code, product]));
  const invalidLines = state.orders.flatMap((order) => order.items).filter((line) => {
    const product = productByCode.get(line.productId);
    return !product || product.name !== String(line.goodsName || '').split('(')[0];
  });
  assert.equal(invalidLines.length, 0, '订单存在错误商品引用');

  const orderIds = new Set(state.orders.map((order) => order.id));
  ['sortingTasks', 'shippingOrders', 'outboundOrders'].forEach((resource) => {
    assert.equal(state[resource].filter((record) => record.orderId && !orderIds.has(record.orderId)).length, 0, `${resource} 存在孤立订单引用`);
  });
  assert.equal(state.outboundOrders.filter((record) => !record.supplierPurchaserCustomerName).length, 0);
  assert.equal(state.outboundOrders.filter((record) => !(Number(record.outboundAmt) > 0)).length, 0);
});

test('v2 数据可幂等迁移并保留人工记录', () => {
  const seed = loadApp().context.DemoStore.snapshot();
  seed.version = '20260805-flow-v2.6';
  seed.inboundOrders.unshift({
    id: 'RKD20260805030000099',
    entryTime: '2026/8/5 9:03',
    supplierPurchaserCustomerName: '人工测试供应商',
    entryType: '采购入库',
    entryAmt: 10,
    warehouseName: '中心仓',
    status: '待审核',
    items: [{ productCode: 'SP0300019', productName: '大白菜', actualQty: 2, unitPrice: 5, unit: '斤' }]
  });

  const migrated = loadApp({ storage: { 'procurement-demo-v2': JSON.stringify(seed) } });
  const first = migrated.context.DemoStore.snapshot();
  const record = first.inboundOrders.find((item) => item.supplierPurchaserCustomerName === '人工测试供应商');
  assert.ok(record);
  assert.match(record.id, /^RKD\d{15}$/);
  assert.equal(record.entryTime, '2026-08-05 09:03:00');
  assert.equal(record.status, 'PENDING_AUDIT');
  assert.ok(migrated.values.has('procurement-demo-v3-migration-backup'));

  const reloaded = loadApp({ storage: Object.fromEntries(migrated.values) }).context.DemoStore.snapshot();
  assert.equal(reloaded.inboundOrders.filter((item) => item.supplierPurchaserCustomerName === '人工测试供应商').length, 1);
  assert.equal(reloaded.inboundOrders.find((item) => item.supplierPurchaserCustomerName === '人工测试供应商').id, record.id);
});

test('CRUD 与订单到出库业务链路可持久化', async () => {
  const { context, values } = loadApp({
    services: [
      'assets/js/services/operations-service.js',
      'assets/js/services/product-service.js',
      'assets/js/services/inbound-service.js',
      'assets/js/services/outbound-service.js',
      'assets/js/services/processing-service.js',
      'assets/js/services/unit-measurement-service.js'
    ]
  });

  const inbound = context.InboundService.create({
    supplierPurchaserCustomerName: '测试供应商',
    entryType: '采购入库',
    warehouseName: '中心仓',
    items: [{ productCode: 'SP0300019', productName: '大白菜', unit: '斤', actualQty: 2, unitPrice: 1.5 }]
  });
  assert.equal(context.InboundService.update(inbound.id, { remark: '已修改' }).remark, '已修改');
  assert.equal(context.InboundService.remove(inbound.id), true);

  const order = await context.OperationsService.create('orders', {
    source: '企业下单',
    sourceType: 'ENTERPRISE',
    customerId: 'CUS-001',
    customerName: '第一实验学校',
    canteen: '第一食堂',
    expectedAt: '2026-08-06 07:30:00',
    warehouse: '中心仓',
    orderTag: '普通餐',
    creator: '自动测试',
    items: [{ productId: 'SP0300019', goodsCode: 'SP0300019', goodsName: '大白菜', unit: '斤', quantity: 2, unitPrice: 1.5 }]
  });
  await context.OperationsService.transition('orders', order.id, 'approve');
  const task = context.DemoStore.get('sortingItems').find((item) => item.orderId === order.id);
  await context.OperationsService.transition('sortingItems', task.id, 'sort', { actualQty: 2 });
  const shipping = context.DemoStore.get('shippingOrders').find((item) => item.orderId === order.id);
  await context.OperationsService.transition('shippingOrders', shipping.id, 'ship');
  const outbound = context.DemoStore.get('outboundOrders').find((item) => item.orderId === order.id);
  assert.equal(outbound.supplierPurchaserCustomerName, '第一实验学校');
  assert.equal(Number(outbound.outboundAmt), 3);

  const persisted = loadApp({ storage: Object.fromEntries(values) }).context.DemoStore.snapshot();
  assert.ok(persisted.orders.some((item) => item.id === order.id));
  assert.ok(persisted.outboundOrders.some((item) => item.orderId === order.id));
});
