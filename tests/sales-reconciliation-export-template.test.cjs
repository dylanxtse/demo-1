const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { loadApp, root } = require('./helpers/app-context.cjs');

const exportVersion = '20261103-sales-reconciliation-export-1';
const expectedHeaders = [
  '对账单号', '关联单号', '对账状态', '客户反馈状态', '客户名称', '食堂', '客户编码',
  '收货人', '收货手机', '仓库', '单据类型', '对账金额', '抹零金额', '应收金额',
  '发货金额', '业务时间', '线路名称', '司机', '对账人', '订单备注'
];
const expectedCustomerHeaders = [
  '序号', '对账单号', '关联单号', '对账状态', '客户反馈状态', '收货人', '收货手机号', '仓库',
  '单据类型', '对账金额', '对账抹零', '应收金额', '发货金额', '已收金额', '未收金额',
  '业务时间', '线路', '司机', '对账人'
];

function renderTemplate() {
  const { context } = loadApp();
  const exportKey = 'sales-export-test';
  const row = [
    'XSDZ202611030001', 'DD202611030001', '待验收', '未反馈', '静安第一中学', '第一食堂',
    '31010610002', '收货人', '18515500000', '公司市区仓库', '销售订单', '12.30', '0.30', '12.00',
    '12.30', '2026-11-03 14:00:00', '线路1', '杨雄', '杨', '备注<&'
  ];
  context.location = { search: `?exportKey=${exportKey}` };
  context.sessionStorage.setItem(exportKey, JSON.stringify({ version: exportVersion, rows: [row] }));
  const rootElement = { innerHTML: '' };
  context.document = {
    getElementById(id) { return id === 'salesReconciliationExportTemplateApp' ? rootElement : null; }
  };
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/pages/sales-reconciliation-export-template.js'), 'utf8'), context);
  return { context, exportKey, rootElement };
}

function renderCustomerTemplate() {
  const { context } = loadApp();
  const exportKey = 'sales-customer-export-test';
  const group = {
    title: '客户对账--静安第1中学',
    canteen: '第一食堂',
    businessDate: '2026-11-02',
    statementCount: 1,
    orderCount: 1,
    returnCount: 0,
    rows: [[1, 'XSDZ202611020001', 'DD202611020001', '待验收', '未反馈', '收货人', '18515500000', '公司市区仓库', '销售订单', 125, 0, 125, 125, '', '', '2026-11-02 14:00:00', '线路1', '杨雄', '杨']],
    totals: [125, 0, 125, 125, 0, 0]
  };
  const followingGroup = { ...group, title: '客户对账--后续客户', canteen: '后续食堂' };
  context.location = { search: `?exportKey=${exportKey}` };
  context.sessionStorage.setItem(exportKey, JSON.stringify({ version: exportVersion, type: 'customer', groups: [group, followingGroup] }));
  const rootElement = { innerHTML: '' };
  context.document = {
    getElementById(id) { return id === 'salesReconciliationExportTemplateApp' ? rootElement : null; }
  };
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/pages/sales-reconciliation-export-template.js'), 'utf8'), context);
  return { context, exportKey, rootElement };
}

function renderSalesReconciliation() {
  const { context } = loadApp({ services: ['assets/js/data/sales-reconciliation-data.js'] });
  const listeners = {};
  const page = {
    innerHTML: '',
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener(type, handler) { listeners[type] = handler; }
  };
  context.location = { search: '' };
  context.AppShell = { mount() { return { querySelector() { return page; } }; } };
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/pages/sales-reconciliation.js'), 'utf8'), context);
  return { context, listeners };
}

function renderCustomerDetail() {
  const { context } = loadApp({ services: ['assets/js/data/sales-reconciliation-data.js'] });
  const listeners = {};
  const page = {
    innerHTML: '',
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener(type, handler) { listeners[type] = handler; }
  };
  context.location = { search: '?customerId=customer-account-002&customerName=%E9%9D%99%E5%AE%89%E7%AC%AC11%E4%B8%AD%E5%AD%A6&canteen=%E7%BB%8F%E8%B4%B9%E9%A3%9F%E5%A0%82' };
  context.AppShell = { mount() { return { querySelector() { return page; } }; } };
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/pages/sales-reconciliation-customer-detail.js'), 'utf8'), context);
  return { context, listeners };
}

test('销售对账导出模板按截图顺序显示 20 个字段和导出数据', () => {
  const { context, exportKey, rootElement } = renderTemplate();
  const columnRow = rootElement.innerHTML.match(/<tr class="school-order-export-column-row">([\s\S]*?)<\/tr>/)?.[1] || '';
  const headers = [...columnRow.matchAll(/<th>(.*?)<\/th>/g)].map((match) => match[1]);
  assert.deepEqual(headers, expectedHeaders);
  assert.match(rootElement.innerHTML, /<td>待验收<\/td>/);
  assert.match(rootElement.innerHTML, /<td>31010610002<\/td>/);
  assert.match(rootElement.innerHTML, /<td>备注&lt;&amp;<\/td>/);
  assert.doesNotMatch(rootElement.innerHTML, /下载 CSV|data-sales-export-download/);
  assert.equal(context.sessionStorage.getItem(exportKey), null);
});

test('销售对账列表导出打开模板并传递截图字段值', () => {
  const { context, listeners } = renderSalesReconciliation();
  listeners.click({ target: { closest(selector) {
    return selector === '[data-sales-toolbar]' ? { dataset: { salesToolbar: 'export' } } : null;
  } } });
  const query = new URLSearchParams(context.location.href.split('?')[1]);
  assert.match(context.location.href, /^\.\/sales-reconciliation-export-template\.html\?/);
  const payload = JSON.parse(context.sessionStorage.getItem(query.get('exportKey')));
  assert.equal(payload.version, exportVersion);
  assert.ok(payload.rows.length > 0);
  assert.equal(payload.rows[0].length, expectedHeaders.length);
  assert.equal(payload.rows[0][0], 'XSDZ202609150300002');
  assert.equal(payload.rows[0][6], '31010630073');
  assert.equal(payload.rows[0][10], '销售订单');
  assert.equal(payload.rows[0][11], '35.00');
  assert.equal(payload.rows[0][14], '35.00');
  assert.equal(payload.rows[0][15], '2026-09-15 10:41:32');
});

test('客户对账导出模板按截图显示分组信息、金额合计及发货金额列', () => {
  const { context, exportKey, rootElement } = renderCustomerTemplate();
  const table = rootElement.innerHTML.match(/<table class="school-order-export-template-table sales-customer-export-table"[\s\S]*?<\/table>/)?.[0] || '';
  const columnRow = table.match(/<tr class="school-order-export-column-row">([\s\S]*?)<\/tr>/)?.[1] || '';
  const headers = [...columnRow.matchAll(/<th>(.*?)<\/th>/g)].map((match) => match[1]);
  assert.deepEqual(headers, expectedCustomerHeaders);
  assert.match(table, /客户对账--静安第1中学/);
  assert.match(table, /食堂：第一食堂/);
  assert.match(table, /订单对账单数量：1/);
  assert.match(table, /退货对账单数量：0/);
  assert.match(table, /<td>¥125\.00<\/td>/);
  assert.match(table, /合计/);
  assert.doesNotMatch(rootElement.innerHTML, /后续客户|后续食堂/);
  assert.doesNotMatch(rootElement.innerHTML, /下载 CSV|data-sales-export-download/);
  assert.equal(context.sessionStorage.getItem(exportKey), null);
});

test('客户对账页导出将客户明细分组传入导出模板', () => {
  const { context, listeners } = renderSalesReconciliation();
  listeners.click({ target: { closest(selector) {
    return selector === '[data-sales-toolbar]' ? { dataset: { salesToolbar: 'customer-export' } } : null;
  } } });
  const query = new URLSearchParams(context.location.href.split('?')[1]);
  assert.match(context.location.href, /^\.\/sales-reconciliation-export-template\.html\?/);
  const payload = JSON.parse(context.sessionStorage.getItem(query.get('exportKey')));
  assert.equal(payload.version, exportVersion);
  assert.equal(payload.type, 'customer');
  assert.equal(payload.groups.length, 1);
  assert.ok(payload.groups.some((group) => group.title.startsWith('客户对账--')));
  const firstDetail = payload.groups.flatMap((group) => group.rows)[0];
  assert.equal(firstDetail.length, expectedCustomerHeaders.length);
  assert.equal(firstDetail[1], 'XSDZ202608040300001');
  assert.equal(firstDetail[8], '销售订单');
  assert.equal(firstDetail[12], '100');
});

test('客户对账详情页复用相同导出模板并传递相同字段结构', () => {
  const { context, listeners } = renderCustomerDetail();
  listeners.click({ target: { closest(selector) {
    return selector === '[data-customer-detail-toolbar]' ? { dataset: { customerDetailToolbar: 'export' } } : null;
  } } });
  const query = new URLSearchParams(context.location.href.split('?')[1]);
  assert.match(context.location.href, /^\.\/sales-reconciliation-export-template\.html\?/);
  const payload = JSON.parse(context.sessionStorage.getItem(query.get('exportKey')));
  assert.equal(payload.version, exportVersion);
  assert.equal(payload.type, 'customer');
  assert.equal(payload.groups.length, 1);
  assert.equal(payload.groups[0].title, '客户对账--静安第11中学');
  assert.equal(payload.groups[0].canteen, '经费食堂');
  assert.equal(payload.groups[0].statementCount, 11);
  assert.equal(payload.groups[0].orderCount, 10);
  assert.equal(payload.groups[0].returnCount, 1);
  assert.ok(payload.groups[0].rows.every((row) => row.length === expectedCustomerHeaders.length));
  const returnRow = payload.groups[0].rows.find((row) => row[8] === '销售退货');
  assert.ok(returnRow);
  assert.equal(returnRow[9], '-170');
  assert.equal(returnRow[12], '-170');
});
