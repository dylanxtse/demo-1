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
  var state = { customerName: '', orderNo: '', inventoryMode: 'stock' };
  function text(value) { return utils.escapeHtml(value == null ? '' : value); }
  function fixed(value) { return Number(value || 0).toFixed(2); }
  function productDisplay() {
    return (task.productName || '') + '(' + (task.unit || '--') + '/' + (task.brand || '--') + '/' + (task.spec || '--') + ')';
  }
  function allocationDisplay(line) {
    var allocation = line.allocation || {};
    if (!allocation.supplier && !allocation.purchaseType) return '请选择';
    return (allocation.purchaseType || '供应商送货') + ' / ' + (allocation.supplier || '盒马鲜生');
  }
  function cascadeMenu(line) {
    var allocation = line.allocation || {};
    return '<div class="purchase-cascade-menu">' +
      '<div class="purchase-cascade-title">采购类型</div>' +
      ['联营供应商采购', '市场自采', '供应商送货'].map(function (name) {
        return '<button type="button" data-cascade-type="' + text(name) + '">' + text(name) + '</button>';
      }).join('') +
      '<div class="purchase-cascade-title">供应商/采购员</div>' +
      ['每日优选', '盒马鲜生'].map(function (name) {
        return '<button type="button" data-cascade-supplier="' + text(name) + '">' + text(name) + '</button>';
      }).join('') +
    '</div>';
  }

  var content = [
    '<section class="page-card purchase-page purchase-detail-page purchase-task-allocation-page" aria-label="采购任务分配">',
      '<div class="purchase-detail-header"><button class="purchase-back" type="button" data-action="back"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"></path><path d="M19 12H9"></path></svg><span>返回</span></button><h1>采购任务分配</h1></div>',
      '<div class="purchase-product-card">',
        '<div class="purchase-product-main">',
          '<div class="purchase-product-cover">' + (task.image ? '<img src="' + text(task.image) + '" alt="' + text(task.productName) + '">' : '暂无图片') + '</div>',
          '<div><div class="purchase-product-title">商品名称（计量单位/品牌/规格）：' + text(productDisplay()) + '</div><div class="purchase-product-code">商品编号：' + text(task.productCode) + '</div></div>',
          '<div class="purchase-product-meta"><div>生成进度：<strong>' + text(task.progress + ' (' + task.progressCount + ')') + '</strong></div><div>关联订单数：<strong>' + task.orderCount + '</strong></div></div>',
          '<div class="purchase-product-owner">采购负责人：<select disabled><option>' + text(task.manager || '杨采') + '</option></select></div>',
        '</div>',
        '<div class="purchase-summary-strip"><span>下单汇总量：<strong>' + fixed(task.orderQty) + '</strong></span><span>待采购量：<strong>' + fixed(task.toPurchaseQty) + '</strong></span></div>',
      '</div>',
      '<div class="purchase-detail-filter">',
        '<div class="purchase-field"><label class="filter-label" for="allocationCustomer">客户名称</label><select class="filter-select" id="allocationCustomer"><option value="">全部</option><option>静安第1中学</option><option>第一实验学校</option><option>阳光幼儿园</option></select></div>',
        '<div class="purchase-field"><label class="filter-label" for="allocationOrderNo">订单号</label><input class="filter-input" id="allocationOrderNo" placeholder="请输入采购单号"></div>',
        '<div class="purchase-detail-filter-actions"><button class="btn btn-primary" type="button" data-action="query">查询</button><button class="btn" type="button" data-action="reset">重置</button></div>',
      '</div>',
      '<div class="purchase-toolbar-side purchase-allocation-inventory"><label class="purchase-radio"><input type="radio" name="allocationInventoryMode" value="stock" checked>计算库存</label><label class="purchase-radio"><input type="radio" name="allocationInventoryMode" value="transit">计算在途库存</label></div>',
      '<div class="purchase-detail-table-container"><div class="purchase-detail-table-wrap"><table class="purchase-table purchase-task-table"><thead id="allocationTableHead"></thead><tbody id="allocationTableBody"></tbody></table></div></div>',
      '<div class="purchase-detail-footer"><button class="btn btn-primary" type="button" data-action="save">保存</button></div>',
    '</section>'
  ].join('');

  var root = window.AppShell.mount({ title: '采购任务分配', content: content });
  document.title = '采购任务分配 - 集采企业版企业端';
  var page = root.querySelector('.purchase-task-allocation-page');

  function $(selector) { return page.querySelector(selector); }
  function closeCascades() { page.querySelectorAll('.purchase-cascade.is-open').forEach(function (element) { element.classList.remove('is-open'); }); }

  function filteredLines() {
    var customer = ($('#allocationCustomer').value || '').trim();
    var orderNo = ($('#allocationOrderNo').value || '').trim();
    return (task.orderLines || []).filter(function (line) {
      return (!customer || line.customerName === customer) && (!orderNo || String(line.orderNo).includes(orderNo));
    });
  }

  function render() {
    var lines = filteredLines();
    $('#allocationTableHead').innerHTML = '<tr><th>序号</th><th>订单号</th><th>客户名称</th><th>食堂</th><th>商品备注</th><th>下单数量</th><th>库存抵扣量</th><th>在途库存抵扣量</th><th>待采购量</th><th>供应商/采购员</th><th>采购单价</th><th>采购状态</th><th>操作</th></tr>';
    $('#allocationTableBody').innerHTML = lines.length ? lines.map(function (line, index) {
      var allocation = line.allocation || {};
      var generated = allocation.status === '已生成采购单';
      var disabled = generated ? ' disabled' : '';
      var type = text(allocation.purchaseType || '供应商送货');
      var supplier = text(allocation.supplier || '盒马鲜生');
      return '<tr data-line-id="' + text(line.id) + '">' +
        '<td>' + (index + 1) + '</td>' +
        '<td><span class="purchase-cell-link">' + text(line.orderNo) + '<small>' + text(line.orderCreatedAt) + '</small></span></td>' +
        '<td>' + text(line.customerName) + '</td>' +
        '<td>' + text(line.canteen) + '</td>' +
        '<td>' + text(line.remark || '--') + '</td>' +
        '<td>' + fixed(line.orderQty) + '</td>' +
        '<td>' + fixed(line.stockDeduction) + '</td>' +
        '<td>' + fixed(line.inTransitDeduction) + '</td>' +
        '<td>' + fixed(line.toPurchaseQty) + '</td>' +
        '<td><div class="purchase-cascade" data-purchase-type="' + type + '" data-purchase-supplier="' + supplier + '"><button type="button" class="purchase-cascade-input"' + disabled + '>' + text(allocationDisplay(line)) + '</button>' + (generated ? '' : cascadeMenu(line)) + '</div></td>' +
        '<td><input class="purchase-inline-input" data-field="price" type="number" min="0" step="0.01" value="' + (allocation.price == null ? '' : text(fixed(allocation.price))) + '" placeholder="请输入"' + disabled + '></td>' +
        '<td>' + utils.statusHtml(allocation.status || '未生成采购单') + '</td>' +
        '<td><button class="btn-text" type="button" data-action="reset-allocation" disabled>重置</button></td>' +
      '</tr>';
    }).join('') : '<tr><td class="purchase-empty" colspan="13">暂无数据</td></tr>';
  }

  page.addEventListener('click', function (event) {
    var target = event.target.closest('[data-action], [data-cascade-type], [data-cascade-supplier], .purchase-cascade-input');
    if (!target || !page.contains(target)) return;
    var action = target.dataset.action;
    if (action === 'back') {
      utils.navigate('./purchase-task.html');
      return;
    }
    if (action === 'query') {
      render();
      return;
    }
    if (action === 'reset') {
      $('#allocationCustomer').value = '';
      $('#allocationOrderNo').value = '';
      render();
      return;
    }
    if (action === 'save') {
      var rows = Array.from(page.querySelectorAll('#allocationTableBody tr[data-line-id]')).map(function (row) {
        var cascade = row.querySelector('.purchase-cascade');
        return {
          id: row.dataset.lineId,
          purchaseType: cascade?.dataset.purchaseType,
          supplier: cascade?.dataset.purchaseSupplier,
          price: row.querySelector('[data-field="price"]')?.value,
          quantity: row.querySelector('[data-field="quantity"]')?.value || task.orderLines.find(function (line) { return line.id === row.dataset.lineId; })?.toPurchaseQty
        };
      });
      var result = service.saveTaskAllocation(task.id, rows);
      if (!result?.ok) {
        utils.toast(result?.message || '保存失败', 'error');
        return;
      }
      utils.toast('保存成功');
      window.setTimeout(function () { utils.navigate('./purchase-task.html'); }, 650);
      return;
    }
    if (target.matches('.purchase-cascade-input')) {
      var wrapper = target.closest('.purchase-cascade');
      closeCascades();
      wrapper.classList.toggle('is-open');
      return;
    }
    if (target.dataset.cascadeType || target.dataset.cascadeSupplier) {
      var cascade = target.closest('.purchase-cascade');
      if (target.dataset.cascadeType) cascade.dataset.purchaseType = target.dataset.cascadeType;
      if (target.dataset.cascadeSupplier) cascade.dataset.purchaseSupplier = target.dataset.cascadeSupplier;
      var currentType = cascade.dataset.purchaseType || '供应商送货';
      var currentSupplier = cascade.dataset.purchaseSupplier || '盒马鲜生';
      cascade.querySelector('.purchase-cascade-input').textContent = currentType + ' / ' + currentSupplier;
      cascade.classList.remove('is-open');
    }
  });

  page.addEventListener('change', function (event) {
    if (event.target.matches('input[name="allocationInventoryMode"]')) {
      state.inventoryMode = event.target.value;
    }
  });
  document.addEventListener('click', function (event) {
    if (!event.target.closest('.purchase-cascade')) closeCascades();
  });
  render();
})();
