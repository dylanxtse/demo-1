(function () {
  'use strict';

  var service = window.PurchaseService;
  var utils = window.PurchasePageUtils;
  service.ensureSeed();
  var params = new URLSearchParams(window.location.search);
  var order = service.getOrder(params.get('id'));
  if (!order) {
    utils.navigate('./purchase-order.html');
    return;
  }
  var receiveState = {};
  (order.items || []).forEach(function (item) {
    receiveState[item.id] = {
      receivedQty: item.receivedQty || 0,
      currentPrice: item.currentPrice || 0,
      productionDate: item.productionDate || '',
      qualityReport: item.qualityReport || []
    };
  });

  function text(value) { return utils.escapeHtml(value == null ? '' : value); }
  function fixed(value) { return Number(value || 0).toFixed(2); }
  function displayProduct(item) {
    return window.DomUtils.formatProductDisplay(item);
  }

  var content = [
    '<section class="page-card purchase-page purchase-receipt-page" aria-label="收货">',
      '<div class="purchase-form-header"><button class="back-link purchase-back" type="button" data-action="back"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"></path><path d="M19 12H9"></path></svg><span>返回</span></button><h1>收货</h1></div>',
      '<div class="purchase-receipt-summary">',
        '<div>采购单号：<span>' + text(order.purchaseOrderNo) + '</span></div><div>仓库：<span>' + text(order.warehouse) + '</span></div><div>商品种类数：<span>' + order.productCount + '</span></div><div>已收种类数：<span>0</span></div>',
        '<div>学校期望送达时间：<span>' + text(order.expectedAt) + '</span></div><div>企业期望送达时间：<span>' + text(order.enterpriseExpectedAt || '--') + '</span></div><div>添加时间：<span>' + text(order.addedAt) + '</span></div><div>单据来源：<span>' + text(order.source) + '</span></div><div>制单人：<span>' + text(order.creator) + '</span></div>',
        '<div>采购类型：<span>' + text(order.purchaseType) + '</span></div><div>采购员/供应商：<span>' + text(order.supplier) + '</span></div><div>采购负责人：<span>' + text(order.manager) + '</span></div>',
      '</div>',
      '<div class="purchase-receipt-table-container"><div class="purchase-receipt-table-wrap"><table class="purchase-table purchase-receipt-table"><thead><tr><th>序号</th><th>图片</th><th class="required-head">商品名称（计量单位/品牌/规格）</th><th>计量单位</th><th>待采购量</th><th>采购单价</th><th class="required-head">收货数量</th><th class="required-head">本次采购单价</th><th>收货金额</th><th>生产日期</th><th>质检报告</th><th>未收数量</th><th>供应商报价</th><th>协议价</th><th>近一次采购价</th><th>市场价</th><th>备注</th></tr></thead><tbody id="receiptRows"></tbody><tfoot><tr><td colspan="8">合计金额：<span id="receiptTotal">0</span></td><td colspan="9"></td></tr></tfoot></table></div></div>',
      '<div class="purchase-receipt-note"><label class="field-label" for="receiptRemark">备注：</label><div><textarea id="receiptRemark" maxlength="100" placeholder="请输入内容">' + text(order.remark || '') + '</textarea><div class="purchase-text-counter"><span id="receiptRemarkCount">' + String(order.remark || '').length + '</span>/100</div></div></div>',
      '<div class="purchase-form-actions"><button class="btn" type="button" data-action="back">返回</button><button class="btn" type="button" data-action="draft">暂存收货</button><button class="btn btn-primary" type="button" data-action="complete">完成收货</button></div>',
    '</section>'
  ].join('');

  var root = window.AppShell.mount({ title: '收货', content: content });
  document.title = '收货 - 集采企业版企业端';
  var page = root.querySelector('.purchase-receipt-page');

  function updateTotal() {
    var total = Object.keys(receiveState).reduce(function (sum, id) {
      var item = receiveState[id];
      return sum + Number(item.receivedQty || 0) * Number(item.currentPrice || 0);
    }, 0);
    page.querySelector('#receiptTotal').textContent = total ? fixed(total) : '0';
  }

  function renderRows() {
    page.querySelector('#receiptRows').innerHTML = (order.items || []).map(function (item, index) {
      var data = receiveState[item.id] || {};
      var hasReceived = Number(data.receivedQty || 0) > 0;
      var displayAmount = hasReceived ? Number(data.receivedQty) * Number(data.currentPrice || 0) : Number(item.purchaseSubtotal || 0);
      return '<tr data-line-id="' + text(item.id) + '">' +
        '<td>' + (index + 1) + '</td>' +
        '<td><span class="purchase-product-image">' + (item.image ? '<img src="' + text(item.image) + '" alt="' + text(item.productName) + '">' : '暂无') + '</span></td>' +
        '<td><span class="product-display-text" title="' + text(displayProduct(item)) + '">' + text(displayProduct(item)) + '</span></td>' +
        '<td>' + text(item.unit) + '</td>' +
        '<td>' + fixed(item.quantity) + '</td>' +
        '<td>' + fixed(item.purchasePrice) + '</td>' +
        '<td><input data-field="receivedQty" type="number" min="0" step="0.01" value="' + (hasReceived ? fixed(data.receivedQty) : '') + '" placeholder="请输入"></td>' +
        '<td><input data-field="currentPrice" type="number" min="0" step="0.01" value="' + (hasReceived ? fixed(data.currentPrice) : '') + '" placeholder="请输入"></td>' +
        '<td><span data-display="receivedAmount">' + fixed(displayAmount) + '</span></td>' +
        '<td><input class="production-date-input" id="production-' + text(item.id) + '" data-field="productionDate" type="text" value="' + text(data.productionDate || '') + '" placeholder="选择生产日期" readonly></td>' +
        '<td><button class="purchase-upload-button" type="button" data-action="upload-report" aria-label="上传质检报告">+</button></td>' +
        '<td>' + fixed(Math.max(0, Number(item.quantity || 0) - Number(data.receivedQty || 0))) + '</td>' +
        '<td>' + fixed(item.supplierQuote) + '</td>' +
        '<td>' + (item.agreementPrice == null ? '--' : fixed(item.agreementPrice)) + '</td>' +
        '<td>' + (item.lastPrice == null ? '--' : fixed(item.lastPrice)) + '</td>' +
        '<td>' + fixed(item.marketPrice) + '</td>' +
        '<td>' + text(item.remark || '') + '</td>' +
      '</tr>';
    }).join('');
    (order.items || []).forEach(function (item) {
      utils.mountDate(page.querySelector('#production-' + item.id), receiveState[item.id]?.productionDate || '', false);
    });
    updateTotal();
  }

  function updateLine(input) {
    var row = input.closest('tr[data-line-id]');
    var id = row?.dataset.lineId;
    if (!id) return;
    if (input.dataset.field === 'receivedQty' || input.dataset.field === 'currentPrice') receiveState[id][input.dataset.field] = Number(input.value || 0);
    else receiveState[id][input.dataset.field] = input.value;
    var item = order.items.find(function (entry) { return entry.id === id; });
    var amount = Number(receiveState[id].receivedQty || 0) * Number(receiveState[id].currentPrice || 0);
    row.querySelector('[data-display="receivedAmount"]').textContent = fixed(amount || item.purchaseSubtotal);
    row.querySelector('td:nth-child(12)').textContent = fixed(Math.max(0, Number(item.quantity || 0) - Number(receiveState[id].receivedQty || 0)));
    updateTotal();
  }

  function save(complete) {
    receiveState.remark = page.querySelector('#receiptRemark').value;
    service.receiveOrder(order.id, receiveState, complete);
    utils.toast(complete ? '完成收货' : '暂存成功');
    window.setTimeout(function () { utils.navigate('./purchase-order.html'); }, 650);
  }

  page.addEventListener('click', function (event) {
    var target = event.target.closest('[data-action]');
    if (!target || !page.contains(target)) return;
    var action = target.dataset.action;
    if (action === 'back') utils.navigate('./purchase-order.html');
    if (action === 'draft') save(false);
    if (action === 'complete') save(true);
    if (action === 'upload-report') utils.toast('质检报告上传入口已打开');
  });
  page.addEventListener('input', function (event) {
    if (event.target.matches('[data-field="receivedQty"], [data-field="currentPrice"], [data-field="productionDate"]')) updateLine(event.target);
    if (event.target.matches('#receiptRemark')) page.querySelector('#receiptRemarkCount').textContent = String(event.target.value.length);
  });
  renderRows();
})();
