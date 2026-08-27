(function () {
  'use strict';

  var service = window.PurchaseService;
  var utils = window.PurchasePageUtils;
  service.ensureSeed();

  var params = new URLSearchParams(window.location.search);
  var order = service.getOrder(params.get('id') || params.get('orderNo'));
  if (!order) {
    utils.navigate('./purchase-order.html');
    return;
  }

  function text(value) { return utils.escapeHtml(value == null ? '' : value); }
  function fixed(value) { return Number(value || 0).toFixed(2); }
  function dateOnly(value) {
    var source = String(value || '').trim();
    return source ? source.slice(0, 10) : '--';
  }
  function displayProduct(item) {
    return text(item.productName || '') + '(' + text(item.unit || '--') + '/' + text(item.brand || '--') + '/' + text(item.spec || '--') + ')';
  }
  function infoItem(label, value) {
    return '<div class="purchase-order-info-item"><span class="purchase-order-info-label">' + label + '：</span><span class="purchase-order-info-value">' + text(value || '--') + '</span></div>';
  }
  function renderOperationLogs() {
    var logs = [{
      action: '创建采购单',
      desc: '制单人：' + (order.creator || '--') + '，创建时间：' + (order.addedAt || '--')
    }];
    if (order.source === '采购任务生成') {
      logs.unshift({ action: '采购任务生成', desc: '来源：采购任务生成' });
    }
    if (order.status === '已完成') {
      logs.push({ action: '完成收货', desc: '单据状态：已完成' });
    } else if (order.status === '已关闭') {
      logs.push({ action: '关闭采购单', desc: '单据状态：已关闭' });
    }
    return logs.map(function (log) {
      return '<div class="purchase-order-operation-item"><span class="purchase-order-operation-node"></span><div class="purchase-order-operation-content"><strong>' + text(log.action) + '</strong><span>' + text(log.desc) + '</span></div></div>';
    }).join('');
  }
  function imageCell(item) {
    return '<span class="purchase-product-image">' + (item.image ? '<img src="' + text(item.image) + '" alt="' + text(item.productName) + '">' : '暂无') + '</span>';
  }

  var items = order.items || [];
  var receivedProductCount = items.filter(function (item) {
    return Number(item.receivedQty || 0) > 0;
  }).length;
  var itemRows = items.map(function (item, index) {
    return '<tr>' +
      '<td>' + (index + 1) + '</td>' +
      '<td>' + imageCell(item) + '</td>' +
      '<td class="purchase-order-detail-product">' + displayProduct(item) + '</td>' +
      '<td>' + text(item.productCode || '--') + '</td>' +
      '<td>' + text(item.unit || '--') + '</td>' +
      '<td>' + fixed(item.quantity) + '</td>' +
      '<td>' + fixed(item.purchasePrice) + '</td>' +
      '<td>' + fixed(item.purchaseSubtotal) + '</td>' +
      '<td>' + fixed(item.supplierQuote) + '</td>' +
      '<td>' + (item.agreementPrice == null ? '--' : fixed(item.agreementPrice)) + '</td>' +
      '<td>' + (item.lastPrice == null ? '--' : fixed(item.lastPrice)) + '</td>' +
      '<td>' + (item.marketPrice == null ? '--' : fixed(item.marketPrice)) + '</td>' +
      '<td>' + fixed(item.receivedQty) + '</td>' +
      '<td>' + fixed(item.receivedAmount) + '</td>' +
      '<td class="purchase-order-detail-remark" title="' + text(item.remark || '') + '">' + text(item.remark || '--') + '</td>' +
      '</tr>';
  }).join('');

  var content = [
    '<section class="page-card purchase-page purchase-detail-page purchase-order-detail-page" aria-label="采购单详情">',
      '<div class="purchase-detail-header purchase-order-detail-header">',
        '<button class="purchase-back" type="button" data-action="back"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"></path><path d="M19 12H9"></path></svg><span>返回</span></button>',
        '<h1>采购单详情</h1>',
      '</div>',
      '<div class="purchase-order-detail-scroll">',
        '<section class="purchase-order-detail-section purchase-order-basic-info">',
          '<div class="purchase-order-info-grid">',
            infoItem('采购单号', order.purchaseOrderNo),
            infoItem('仓库', order.warehouse),
            infoItem('商品种类数', String(order.productCount || items.length) + ' 种'),
            infoItem('已收种类数', String(receivedProductCount) + ' 种'),
            infoItem('期望送达时间', dateOnly(order.expectedAt)),
            infoItem('添加时间', order.addedAt),
            infoItem('单据来源', order.source),
            infoItem('制单人', order.creator),
            infoItem('采购类型', order.purchaseType),
            infoItem('采购员/供应商', order.supplier),
            infoItem('采购负责人', order.manager),
          '</div>',
        '</section>',
        '<section class="purchase-order-detail-section">',
          '<div class="purchase-order-detail-table-wrap">',
            '<table class="purchase-table purchase-order-detail-items-table">',
              '<thead><tr><th>序号</th><th>图片</th><th>商品名称（计量单位/品牌/规格）</th><th>商品编号</th><th>计量单位</th><th>待采购量</th><th>采购单价</th><th>采购小计</th><th>供应商报价</th><th>协议价</th><th>近一次采购价</th><th>市场价</th><th>已收货量</th><th>收货金额</th><th>备注</th></tr></thead>',
              '<tbody>' + (itemRows || '<tr><td class="purchase-empty" colspan="15">暂无商品明细</td></tr>') + '</tbody>',
              '<tfoot><tr><td colspan="7"></td><td colspan="8" class="purchase-order-detail-total">合计金额：<strong>' + fixed(order.purchaseAmount) + '</strong></td></tr></tfoot>',
            '</table>',
          '</div>',
        '</section>',
        '<section class="purchase-order-detail-section purchase-order-detail-remark-section">',
          '<div class="purchase-order-detail-remark-row"><span class="purchase-order-detail-remark-label">备注：</span><span class="purchase-order-detail-remark-value" title="' + text(order.remark || '') + '">' + text(order.remark || '--') + '</span></div>',
        '</section>',
        '<section class="purchase-order-detail-section purchase-order-operation-section">',
          '<div class="purchase-order-detail-section-heading"><h2>操作记录</h2></div>',
          '<div class="purchase-order-operation-list">' + renderOperationLogs() + '</div>',
        '</section>',
      '</div>',
    '</section>'
  ].join('');

  var root = window.AppShell.mount({ title: '采购单详情', content: content });
  document.title = '采购单详情 - 集采企业版企业端';
  var page = root.querySelector('.purchase-order-detail-page');
  page.addEventListener('click', function (event) {
    if (event.target.closest('[data-action="back"]')) utils.navigate('./purchase-order.html');
  });
})();
