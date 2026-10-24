const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { root: projectRoot, loadApp } = require('./helpers/app-context.cjs');

const source = fs.readFileSync(path.join(projectRoot, 'assets/js/pages/sorting-label-print.js'), 'utf8');

function renderLabels(row, options = {}) {
  const { context } = loadApp();
  const appRoot = { innerHTML: '' };
  context.document = {
    title: '',
    getElementById: (id) => id === 'sortingLabelPrintApp' ? appRoot : null
  };
  context.location = {
    href: 'file:///sorting-label-print.html',
    search: `?printData=${encodeURIComponent(JSON.stringify({
      version: '20261019-sorting-label-print-1',
      mode: 'product',
      source: options.source || 'sorting-terminal-item',
      customerCode: options.customerCode || '',
      returnSearch: options.returnSearch || '',
      printedAt: '2026-10-24T00:00:00.000Z',
      rows: [row]
    }))}`
  };
  context.SortingQrCode = { svg: () => '' };
  vm.runInContext(source, context, { filename: 'sorting-label-print.js' });
  return appRoot.innerHTML;
}

function getPackageQuantities(html) {
  return [...html.matchAll(/class="sorting-label-field sorting-label-field-package"><dt>本包数量<\/dt><dd>([^<]+)<\/dd>/g)]
    .map((match) => match[1]);
}

test('称重数量按土豆分包规格拆成多张标签并保留原下单数量', () => {
  const html = renderLabels({
    id: 'SORT-TERMINAL-PRODUCT-SP0300040-0',
    goodsCode: 'SP0300040',
    goodsName: '土豆',
    customerName: '宜丰十一中',
    canteen: '第一食堂',
    unit: '斤',
    orderQty: 35,
    packageLabelQuantity: 35
  });

  const labelHeaders = [...html.matchAll(/aria-label="土豆，第(\d+)\/(\d+)张标签"/g)];
  assert.deepEqual(labelHeaders.map((match) => [Number(match[1]), Number(match[2])]), [
    [1, 4], [2, 4], [3, 4], [4, 4]
  ]);
  assert.deepEqual(getPackageQuantities(html), ['10 斤', '10 斤', '10 斤', '5 斤']);
  assert.equal((html.match(/<dd>35 斤<\/dd>/g) || []).length, 4);
});

test('没有可用分包规格时仍按称重数量打印单张标签', () => {
  const html = renderLabels({
    goodsCode: 'UNKNOWN-PRODUCT',
    goodsName: '未配置规格商品',
    unit: '个',
    orderQty: 12,
    packageLabelQuantity: 7
  });

  assert.equal((html.match(/class="sorting-label"/g) || []).length, 1);
  assert.deepEqual(getPackageQuantities(html), ['7 个']);
});

test('按下单数量生成的标签可返回商品分拣任务且不打开称重弹窗', () => {
  const html = renderLabels({
    goodsCode: 'SP0300040',
    goodsName: '土豆',
    unit: '斤',
    orderQty: 35
  }, {
    source: 'sorting-terminal-item-order',
    returnSearch: '?name=%E5%9C%9F%E8%B1%86&code=SP0300040'
  });

  const returnLink = html.match(/<a href="([^"]+)">返回商品分拣<\/a>/);
  assert.ok(returnLink);
  assert.match(decodeURIComponent(returnLink[1].replace(/&amp;/g, '&')), /sorting-terminal-item\.html\?name=土豆/);
  assert.equal(returnLink[1].includes('returnDialog'), false);
});

test('客户卡片生成的标签可返回对应客户分拣页', () => {
  const html = renderLabels({
    goodsCode: 'SP000004',
    goodsName: '茄子',
    unit: '斤',
    orderQty: 35
  }, {
    source: 'sorting-terminal-customer-item-order',
    customerCode: 'YF001'
  });

  const returnLink = html.match(/<a href="([^"]+)">返回客户分拣<\/a>/);
  assert.ok(returnLink);
  assert.match(decodeURIComponent(returnLink[1]), /sorting-terminal-customer-item\.html\?customer=YF001/);
  assert.equal(returnLink[1].includes('returnDialog'), false);
});
