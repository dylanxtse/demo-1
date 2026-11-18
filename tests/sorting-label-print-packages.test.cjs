const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { root: projectRoot, loadApp } = require('./helpers/app-context.cjs');

const source = fs.readFileSync(path.join(projectRoot, 'assets/js/pages/sorting-label-print.js'), 'utf8');
const printStyles = fs.readFileSync(path.join(projectRoot, 'assets/css/sorting-label-print.css'), 'utf8');

test('分拣标签学校名称支持换行并为两行预留高度', () => {
  assert.match(printStyles, /grid-template-rows:\s*10mm/);
  assert.match(printStyles, /\.sorting-label-field-customer dd\s*\{[^}]*white-space:\s*normal;[^}]*overflow-wrap:\s*anywhere;/s);
});

test('储存、数量和日期字段共用左右两列对齐网格', () => {
  assert.match(printStyles, /\.sorting-label-pair-row\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\) minmax\(0,\s*1fr\);/s);
  assert.match(printStyles, /\.sorting-label-pair-row > \.sorting-label-field:first-child\s*\{[^}]*grid-template-columns:\s*17mm minmax\(0,\s*1fr\);/s);
  assert.match(printStyles, /\.sorting-label-pair-row > \.sorting-label-field:last-child\s*\{[^}]*grid-template-columns:\s*13mm minmax\(0,\s*1fr\);/s);
  assert.match(printStyles, /\.sorting-label-qrcode\s*\{[^}]*bottom:\s*1mm;[^}]*width:\s*15mm;/s);
});

function renderLabels(row, options = {}) {
  const { context } = loadApp();
  const dataRow = { ...row };
  if (options.orderOverrides) {
    const linkedOrder = context.DemoStore.get('orders')[0];
    context.DemoStore.transact((state) => {
      const order = state.orders.find((item) => item.id === linkedOrder.id);
      Object.assign(order, options.orderOverrides);
    });
    dataRow.orderId = linkedOrder.id;
  }
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
      rows: [dataRow]
    }))}`
  };
  context.SortingQrCode = { svg: () => '' };
  vm.runInContext(source, context, { filename: 'sorting-label-print.js' });
  return appRoot.innerHTML;
}

function getPackageQuantities(html) {
  return [...html.matchAll(/class="sorting-label-field sorting-label-field-package"><dt>本包数量<\/dt><dd>([\s\S]*?)<\/dd>/g)]
    .map((match) => match[1].replace(/<[^>]+>/g, ''));
}

function getOrderQuantities(html) {
  return [...html.matchAll(/class="sorting-label-field sorting-label-field-order-quantity"><dt>下单数量<\/dt><dd>([^<]+)<\/dd>/g)]
    .map((match) => match[1]);
}

function getQuantityBlock(html) {
  return html.match(/<div class="sorting-label-field-quantities sorting-label-pair-row">([\s\S]*?)<\/div>\s*<div class="sorting-label-field sorting-label-date-pair sorting-label-pair-row">/)?.[1] || '';
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
  assert.deepEqual(getPackageQuantities(html), ['10斤', '10斤', '10斤', '5斤']);
  assert.deepEqual(getOrderQuantities(html), ['35斤', '35斤', '35斤', '35斤']);
});

test('没有可用分包规格时仍按称重数量打印单张标签', () => {
  const html = renderLabels({
    goodsCode: 'UNKNOWN-PRODUCT',
    goodsName: '未配置规格商品',
    unit: '个',
    orderQty: 12,
    packageLabelQuantity: 7,
    shelfLife: '2天',
    recipeDemandDate: '2026-10-20、2026-10-21',
    deliveryAt: '2026-10-22 08:00:00'
  });

  assert.equal((html.match(/class="sorting-label"/g) || []).length, 1);
  assert.deepEqual(getPackageQuantities(html), ['7个']);
  assert.deepEqual(getOrderQuantities(html), ['12个']);
  assert.ok(getQuantityBlock(html).indexOf('sorting-label-field-package') < getQuantityBlock(html).indexOf('sorting-label-field-order-quantity'));
  assert.match(html, /<dt>保质期<\/dt><dd>2天<\/dd>/);
  assert.match(html, /class="sorting-label-field sorting-label-date-pair sorting-label-pair-row">\s*<div class="sorting-label-field sorting-label-field-material-date"><dt>用料日期<\/dt><dd>2026-10-20、2026-10-21<\/dd><\/div>\s*<div class="sorting-label-field sorting-label-field-delivery-date"><dt>配送日期<\/dt><dd>2026-10-22<\/dd><\/div>/);
  assert.doesNotMatch(html, /分拣日期/);
});

test('标签从关联订单读取用料日期和配送日期，并显示商品保质期', () => {
  const html = renderLabels({
    goodsCode: 'SP0300040',
    goodsName: '土豆',
    unit: '斤',
    orderQty: 35
  }, {
    orderOverrides: {
      recipeDemandDate: '2026-11-17、2026-11-18',
      deliveryAt: '2026-11-19 08:00:00'
    }
  });

  assert.match(html, /class="sorting-label-field sorting-label-date-pair sorting-label-pair-row">\s*<div class="sorting-label-field sorting-label-field-material-date"><dt>用料日期<\/dt><dd>2026-11-17、2026-11-18<\/dd><\/div>\s*<div class="sorting-label-field sorting-label-field-delivery-date"><dt>配送日期<\/dt><dd>2026-11-19<\/dd><\/div>/);
  assert.match(html, /class="sorting-label-field-storage-shelf-life sorting-label-pair-row">\s*<div class="sorting-label-field sorting-label-field-storage-condition"><dt>储存条件<\/dt><dd>常温<\/dd><\/div>\s*<div class="sorting-label-field sorting-label-field-shelf-life"><dt>保质期<\/dt><dd>15天<\/dd><\/div>/);
  assert.ok(html.indexOf('sorting-label-field-storage-shelf-life') < html.indexOf('sorting-label-field-quantities'));
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

test('客户卡片生成的标签可带餐次返回对应客户分拣页', () => {
  const html = renderLabels({
    goodsCode: 'SP000004',
    goodsName: '茄子',
    unit: '斤',
    orderQty: 35
  }, {
    source: 'sorting-terminal-customer-item-order',
    customerCode: 'YF001',
    returnSearch: '?customer=YF001&meal=lunch&meal=eveningSnack'
  });

  const returnLink = html.match(/<a href="([^"]+)">返回客户分拣<\/a>/);
  assert.ok(returnLink);
  assert.match(decodeURIComponent(returnLink[1].replace(/&amp;/g, '&')), /sorting-terminal-customer-item\.html\?customer=YF001&meal=lunch&meal=eveningSnack/);
  assert.equal(returnLink[1].includes('returnDialog'), false);
});
