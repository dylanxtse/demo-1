(function () {
  'use strict';

  var service = window.PurchaseService;
  var utils = window.PurchasePageUtils;
  service.ensureSeed();
  var params = new URLSearchParams(window.location.search);
  var task = service.getTask(params.get('id')) || service.listTasks({ date: '2026-08-26' })[0];
  if (!task) {
    utils.navigate('./purchase-task.html');
    return;
  }

  function text(value) { return utils.escapeHtml(value == null ? '' : value); }
  function fixed(value) { return Number(value || 0).toFixed(2); }
  function productDisplay() {
    return (task.productName || '') + '(' + (task.unit || '--') + '/' + (task.brand || '--') + '/' + (task.spec || '--') + ')';
  }

  var detailRows = task.orderLines || [];
  var firstAllocation = detailRows[0]?.allocation || {};
  var content = [
    '<section class="page-card purchase-page purchase-detail-page purchase-task-detail-page" aria-label="分配详情">',
      '<div class="purchase-detail-header"><button class="purchase-back" type="button" data-action="back"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"></path><path d="M19 12H9"></path></svg><span>返回</span></button><h1>分配详情</h1></div>',
      '<div class="purchase-product-card">',
        '<div class="purchase-product-main">',
          '<div class="purchase-product-cover">' + (task.image ? '<img src="' + text(task.image) + '" alt="' + text(task.productName) + '">' : '暂无图片') + '</div>',
          '<div><div class="purchase-product-title">商品名称（计量单位/品牌/规格）：' + text(productDisplay()) + '</div><div class="purchase-product-code">商品编号：' + text(task.productCode) + '</div></div>',
          '<div class="purchase-product-meta"><div>生成进度：<strong>' + text(task.progress + ' (' + task.progressCount + ')') + '</strong></div><div>关联订单数：<strong>' + task.orderCount + '</strong></div></div>',
          '<div></div>',
        '</div>',
        '<div class="purchase-summary-strip"><span>下单汇总量：<strong>' + fixed(task.orderQty) + '</strong></span><span>待采购量：<strong>' + fixed(task.toPurchaseQty) + '</strong></span></div>',
      '</div>',
      '<div class="purchase-detail-sections">',
        '<section class="purchase-detail-section"><h2 class="purchase-subheading">以下为采购明细</h2><div class="purchase-detail-table-container"><div class="purchase-detail-table-wrap"><table class="purchase-table purchase-allocation-detail-table"><thead><tr><th>供应商/采购员</th><th>采购负责人</th><th>待采购量</th><th>采购单价</th><th>关联订单</th><th>生成进度</th></tr></thead><tbody id="purchaseDetailAllocationRows"></tbody></table></div></div></section>',
        '<section class="purchase-detail-section"><h2 class="purchase-subheading">以下为订单明细</h2><div class="purchase-detail-table-container"><div class="purchase-detail-table-wrap"><table class="purchase-table purchase-order-detail-table"><thead><tr><th>订单号</th><th>客户名称</th><th>食堂</th><th>仓库</th><th>下单数量</th><th>库存抵扣量</th><th>在途库存抵扣量</th><th>待采购量</th><th>供应商/采购员</th><th>关联采购单号</th></tr></thead><tbody id="purchaseDetailOrderRows"></tbody></table></div></div></section>',
      '</div>',
    '</section>'
  ].join('');

  var root = window.AppShell.mount({ title: '分配详情', content: content });
  document.title = '分配详情 - 集采企业版企业端';
  var page = root.querySelector('.purchase-task-detail-page');
  var supplierLabel = firstAllocation.supplier || '盒马鲜生';
  page.querySelector('#purchaseDetailAllocationRows').innerHTML = '<tr><td>' + text(supplierLabel) + '</td><td>' + text(task.manager) + '</td><td>' + fixed(task.toPurchaseQty) + '</td><td>' + fixed(firstAllocation.price) + '</td><td>' + task.orderCount + '</td><td>' + text(task.progress + ' (' + task.progressCount + ')') + '</td></tr>';
  page.querySelector('#purchaseDetailOrderRows').innerHTML = detailRows.length ? detailRows.map(function (line) {
    var allocation = line.allocation || {};
    return '<tr><td><span class="purchase-cell-link">' + text(line.orderNo) + '<small>' + text(line.orderCreatedAt) + '</small></span></td><td>' + text(line.customerName) + '</td><td>' + text(line.canteen) + '</td><td>' + text(line.warehouse) + '</td><td>' + fixed(line.orderQty) + '</td><td>' + fixed(line.stockDeduction) + '</td><td>' + fixed(line.inTransitDeduction) + '</td><td>' + fixed(line.toPurchaseQty) + '</td><td>' + text(allocation.supplier || '--') + '</td><td>' + text(allocation.purchaseOrderNo || '--') + '</td></tr>';
  }).join('') : '<tr><td class="purchase-empty" colspan="10">暂无数据</td></tr>';
  page.addEventListener('click', function (event) {
    if (event.target.closest('[data-action="back"]')) utils.navigate('./purchase-task.html');
  });
})();
