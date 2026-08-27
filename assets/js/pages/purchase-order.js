(function () {
  'use strict';

  var service = window.PurchaseService;
  var utils = window.PurchasePageUtils;
  var downloadIcon = '<svg class="icon-svg" viewBox="0 0 24 24" style="width:14px;height:14px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
  service.ensureSeed();

  var content = [
    '<section class="page-card purchase-page purchase-list-page purchase-order-page" aria-label="采购单">',
      '<div class="purchase-filter" id="purchaseOrderFilter">',
        '<div class="purchase-filter-main">',
          '<div class="purchase-filter-grid">',
            '<div class="purchase-field purchase-school-date-field"><label class="filter-label" for="orderDeliveryDisplay">期望送达时间</label><div class="purchase-date-range purchase-date-range-combined" id="orderDeliveryRange"><input class="filter-input date-range-display" id="orderDeliveryDisplay" type="text" placeholder="请选择日期" readonly><span class="date-range-icon" aria-hidden="true"><svg class="icon-svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></span><input type="hidden" id="orderDeliveryStart" data-date-start><input type="hidden" id="orderDeliveryEnd" data-date-end></div></div>',
            '<div class="purchase-field"><label class="filter-label" for="orderPurchaseType">采购类型</label><select class="filter-select" id="orderPurchaseType"><option value="">全部</option><option>联营供应商采购</option><option>市场自采</option><option>供应商送货</option></select></div>',
          '</div>',
          '<div class="purchase-filter-actions">',
            '<button class="purchase-advanced-toggle" type="button" data-action="toggle-advanced">高级筛选<span class="toggle-arrow">▾</span></button>',
            '<button class="btn btn-primary" type="button" data-action="query">查询</button>',
            '<button class="btn" type="button" data-action="reset">重置</button>',
          '</div>',
        '</div>',
        '<div class="purchase-filter-advanced">',
          '<div class="purchase-filter-grid">',
            '<div class="purchase-field"><label class="filter-label" for="orderCategory">商品分类</label><select class="filter-select" id="orderCategory"><option value="">全部</option><option>蛋奶类</option><option>主食（米面粉点心类）</option><option>果蔬</option><option>其他材料</option></select></div>',
            '<div class="purchase-field"><label class="filter-label" for="orderProductName">商品名称</label><input class="filter-input" id="orderProductName" placeholder="请输入名称/编号"></div>',
            '<div class="purchase-field"><label class="filter-label" for="orderAddDisplay">添加时间</label><div class="purchase-date-range purchase-date-range-combined" id="orderAddRange"><input class="filter-input date-range-display" id="orderAddDisplay" type="text" placeholder="请选择日期范围" readonly><span class="date-range-icon" aria-hidden="true"><svg class="icon-svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></span><input type="hidden" id="orderAddStart" data-date-start><input type="hidden" id="orderAddEnd" data-date-end></div></div>',
            '<div class="purchase-field"><label class="filter-label" for="orderStatus">单据状态</label><select class="filter-select" id="orderStatus"><option value="">全部</option><option>待收货</option><option>待入库</option><option>已完成</option><option>已关闭</option><option>草稿</option></select></div>',
            '<div class="purchase-field"><label class="filter-label" for="orderNoFilter">采购单号</label><input class="filter-input" id="orderNoFilter" placeholder="请输入采购单号"></div>',
            '<div class="purchase-field"><label class="filter-label" for="orderWarehouse">仓库</label><select class="filter-select" id="orderWarehouse"><option value="">全部</option><option>公司市区仓库</option><option>东南区域仓库</option><option>生鲜仓库</option></select></div>',
            '<div class="purchase-field"><label class="filter-label" for="orderSource">单据来源</label><select class="filter-select" id="orderSource"><option value="">全部</option><option>手动创建</option><option>采购任务生成</option></select></div>',
            '<div class="purchase-field"><label class="filter-label" for="orderManager">采购负责人</label><select class="filter-select" id="orderManager"><option value="">全部</option><option>杨采</option><option>杨无缺</option></select></div>',
            '<div class="purchase-field"><label class="filter-label" for="orderSupplierStatus">供应商状态</label><select class="filter-select" id="orderSupplierStatus"><option value="">全部</option><option>未确认</option><option>已确认</option><option>已发货</option></select></div>',
          '</div>',
        '</div>',
      '</div>',
      '<div class="purchase-toolbar purchase-order-toolbar">',
        '<div class="purchase-toolbar-main"><button class="btn btn-primary" type="button" data-action="add">添加采购单</button></div>',
        '<div class="purchase-toolbar-side"><button class="btn btn-sm purchase-export-button" type="button" data-action="export">' + downloadIcon + '导出</button><button class="btn btn-sm purchase-print-button" type="button" data-action="print" disabled>打印</button></div>',
      '</div>',
      '<div class="purchase-table-container">',
        '<div class="purchase-table-wrap">',
          '<table class="purchase-table purchase-order-table"><thead id="orderTableHead"></thead><tbody id="orderTableBody"></tbody></table>',
        '</div>',
        '<div class="purchase-pagination" id="orderPagination"></div>',
      '</div>',
    '</section>'
  ].join('');

  var root = window.AppShell.mount({ title: '采购单', content: content });
  document.title = '采购单 - 集采企业版企业端';
  var page = root.querySelector('.purchase-order-page');
  var state = {
    page: 1,
    pageSize: 20,
    total: 0,
    selected: new Set(),
    condition: {
      deliveryStart: '2026-06-01',
      deliveryEnd: '2026-09-01',
    }
  };

  function $(selector) { return page.querySelector(selector); }
  function text(value) { return utils.escapeHtml(value == null ? '' : value); }
  function fixed(value) { return Number(value || 0).toFixed(2); }
  function button(label, action, enabled) {
    return '<button class="btn-text" type="button" data-action="' + action + '"' + (enabled ? '' : ' disabled') + '>' + label + '</button>';
  }

  var deliveryPicker = utils.mountDateRange($('#orderDeliveryRange'), '2026-06-01', '2026-09-01');
  var addDatePicker = utils.mountDateRange($('#orderAddRange'), '', '');

  function collectCondition() {
    state.condition = {
      deliveryStart: ($('#orderDeliveryStart').value || '').trim(),
      deliveryEnd: ($('#orderDeliveryEnd').value || '').trim(),
      purchaseType: ($('#orderPurchaseType').value || '').trim(),
      category: ($('#orderCategory').value || '').trim(),
      productName: ($('#orderProductName').value || '').trim(),
      addStart: ($('#orderAddStart').value || '').trim(),
      addEnd: ($('#orderAddEnd').value || '').trim(),
      status: ($('#orderStatus').value || '').trim(),
      orderNo: ($('#orderNoFilter').value || '').trim(),
      warehouse: ($('#orderWarehouse').value || '').trim(),
      source: ($('#orderSource').value || '').trim(),
      manager: ($('#orderManager').value || '').trim(),
      supplierStatus: ($('#orderSupplierStatus').value || '').trim()
    };
  }

  function render() {
    var all = service.listOrders(state.condition);
    state.total = all.length;
    var start = (state.page - 1) * state.pageSize;
    var visible = all.slice(start, start + state.pageSize);
    $('#orderTableHead').innerHTML = '<tr><th class="purchase-sticky-select"><input type="checkbox" data-action="select-all" aria-label="选择全部"></th><th>采购单号</th><th>供应商/采购员</th><th>采购类型</th><th>单据来源</th><th>采购负责人</th><th class="purchase-date-column purchase-school-expected-column">期望送达时间</th><th>采购金额</th><th>已收货金额</th><th>退货金额</th><th>对账金额</th><th>供应商状态</th><th>单据状态</th><th>商品种类数</th><th>收货进度</th><th>仓库</th><th>添加人</th><th>备注</th><th class="purchase-sticky-action">操作</th></tr>';
    $('#orderTableBody').innerHTML = visible.length ? visible.map(function (order) {
      var selected = state.selected.has(order.id) ? ' checked' : '';
      var canEdit = order.status === '待收货' && order.source === '手动创建';
      var canReceive = order.status === '待收货';
      var canClose = order.status === '待收货';
      return '<tr data-id="' + text(order.id) + '">' +
        '<td class="purchase-sticky-select"><input type="checkbox" class="order-row-select" aria-label="选择采购单"' + selected + '></td>' +
        '<td><button class="purchase-cell-link" type="button" data-action="order-number"><span>' + text(order.purchaseOrderNo) + '</span><small>' + text(order.addedAt) + '</small></button></td>' +
        '<td>' + text(order.supplier) + '</td>' +
        '<td>' + text(order.purchaseType) + '</td>' +
        '<td>' + text(order.source) + '</td>' +
        '<td>' + text(order.manager) + '</td>' +
        '<td class="purchase-date-column purchase-school-expected-column">' + text(order.expectedAt) + '</td>' +
        '<td>' + fixed(order.purchaseAmount) + '</td>' +
        '<td>' + fixed(order.receivedAmount) + '</td>' +
        '<td>' + fixed(order.returnAmount) + '</td>' +
        '<td>' + fixed(order.reconciliationAmount) + '</td>' +
        '<td>' + utils.statusHtml(order.supplierStatus) + '</td>' +
        '<td>' + utils.statusHtml(order.status) + '</td>' +
        '<td>' + order.productCount + '</td>' +
        '<td>' + text(order.receiptProgress) + '</td>' +
        '<td>' + text(order.warehouse) + '</td>' +
        '<td>' + text(order.creator) + '</td>' +
        '<td title="' + text(order.remark) + '">' + text(order.remark || '--') + '</td>' +
        '<td class="purchase-sticky-action"><div class="purchase-action-group">' +
          button('审核', 'audit', false) +
          button('编辑', 'edit', canEdit) +
          button('收货', 'receive', canReceive) +
          button('复制', 'copy', true) +
          button('关闭', 'close', canClose) +
        '</div></td>' +
      '</tr>';
    }).join('') : '<tr><td class="purchase-empty" colspan="19">暂无数据</td></tr>';
    var selectedVisible = visible.filter(function (order) { return state.selected.has(order.id); }).length;
    var selectAll = $('#orderTableHead [data-action="select-all"]');
    if (selectAll) {
      selectAll.checked = visible.length > 0 && selectedVisible === visible.length;
      selectAll.indeterminate = selectedVisible > 0 && selectedVisible < visible.length;
    }
    var print = page.querySelector('[data-action="print"]');
    if (print) print.disabled = state.selected.size === 0;
    utils.renderPagination($('#orderPagination'), state, function (next) {
      state.page = next.page;
      state.pageSize = next.pageSize;
      render();
    });
  }

  function resetFilters() {
    if (deliveryPicker) deliveryPicker.setValue('2026-06-01', '2026-09-01', false);
    if (addDatePicker) addDatePicker.setValue('', '', false);
    ['#orderPurchaseType', '#orderCategory', '#orderStatus', '#orderWarehouse', '#orderSource', '#orderManager', '#orderSupplierStatus'].forEach(function (selector) { $(selector).value = ''; });
    ['#orderProductName', '#orderNoFilter'].forEach(function (selector) { $(selector).value = ''; });
    state.selected.clear();
    state.page = 1;
    collectCondition();
    render();
  }

  page.addEventListener('click', function (event) {
    var target = event.target.closest('[data-action]');
    if (!target || !page.contains(target)) return;
    var action = target.dataset.action;
    if (action === 'toggle-advanced') {
      $('#purchaseOrderFilter').classList.toggle('is-expanded');
      return;
    }
    if (action === 'query') {
      state.page = 1;
      collectCondition();
      render();
      return;
    }
    if (action === 'reset') {
      resetFilters();
      return;
    }
    if (action === 'add') {
      utils.navigate('./purchase-order-form.html');
      return;
    }
    if (action === 'export') {
      utils.toast('导出成功');
      return;
    }
    if (action === 'print') {
      if (!state.selected.size) utils.toast('请先选择采购单', 'error');
      else utils.toast('打印任务已提交');
      return;
    }
    if (action === 'order-number') {
      utils.navigate('./purchase-order-detail.html?id=' + encodeURIComponent(target.closest('tr[data-id]')?.dataset.id || ''));
      return;
    }
    if (action === 'select-all') {
      var rows = Array.from(page.querySelectorAll('#orderTableBody tr[data-id]'));
      rows.forEach(function (row) {
        if (target.checked) state.selected.add(row.dataset.id);
        else state.selected.delete(row.dataset.id);
      });
      render();
      return;
    }
    var row = target.closest('tr[data-id]');
    if (!row) return;
    var id = row.dataset.id;
    if (action === 'edit') utils.navigate('./purchase-order-form.html?id=' + encodeURIComponent(id) + '&flag=edit');
    if (action === 'receive') utils.navigate('./purchase-order-receipt.html?id=' + encodeURIComponent(id) + '&flag=received');
    if (action === 'copy') {
      utils.openModal({
        title: '复制采购单',
        message: '是否要复制该采购单？',
        confirmText: '继续',
        kind: 'confirm',
        onConfirm: function () {
          utils.navigate('./purchase-order-form.html?id=' + encodeURIComponent(id) + '&flag=copy');
        }
      });
    }
    if (action === 'close') {
      utils.openModal({
        title: '关闭采购单',
        message: '确定要关闭该采购单吗？',
        cancelText: '取消',
        confirmText: '确认',
        kind: 'confirm',
        onConfirm: function () {
          service.closeOrder(id);
          render();
        }
      });
    }
  });

  page.addEventListener('change', function (event) {
    if (event.target.matches('[data-action="select-all"]')) {
      var visibleRows = Array.from(page.querySelectorAll('#orderTableBody tr[data-id]'));
      visibleRows.forEach(function (row) {
        if (event.target.checked) state.selected.add(row.dataset.id);
        else state.selected.delete(row.dataset.id);
      });
      render();
      return;
    }
    if (event.target.matches('.order-row-select')) {
      var row = event.target.closest('tr[data-id]');
      if (event.target.checked) state.selected.add(row.dataset.id);
      else state.selected.delete(row.dataset.id);
      render();
    }
  });

  render();
})();
