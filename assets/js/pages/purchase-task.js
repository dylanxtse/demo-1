(function () {
  'use strict';

  var service = window.PurchaseService;
  var utils = window.PurchasePageUtils;
  service.ensureSeed();
  var content = [
    '<section class="page-card purchase-page purchase-list-page purchase-task-page" aria-label="采购任务">',
      '<div class="purchase-filter" id="purchaseTaskFilter">',
        '<div class="purchase-filter-main">',
          '<div class="purchase-filter-grid">',
            '<div class="purchase-field"><label class="filter-label" for="taskDate">学校期望送达时间</label><input class="filter-input" id="taskDate" type="text" placeholder="请选择日期" readonly></div>',
            '<div class="purchase-field"><label class="filter-label" for="taskPurchaseType">采购类型</label><select class="filter-select" id="taskPurchaseType"><option value="">全部</option><option>联营供应商采购</option><option>市场自采</option><option>供应商送货</option></select></div>',
            '<div class="purchase-field"><label class="filter-label" for="taskCustomerName">客户名称</label><select class="filter-select" id="taskCustomerName"><option value="">全部</option><option>静安第1中学</option><option>第一实验学校</option><option>阳光幼儿园</option></select></div>',
          '</div>',
          '<div class="purchase-filter-actions">',
            '<button class="purchase-advanced-toggle" type="button" data-action="toggle-advanced" aria-expanded="false" aria-controls="purchaseTaskAdvancedFilter">高级筛选<span class="toggle-arrow">▾</span></button>',
            '<button class="btn btn-primary" type="button" data-action="query">查询</button>',
            '<button class="btn" type="button" data-action="reset">重置</button>',
          '</div>',
        '</div>',
        '<div class="purchase-filter-advanced" id="purchaseTaskAdvancedFilter" hidden>',
          '<div class="purchase-filter-grid">',
            '<div class="purchase-field"><label class="filter-label" for="taskOrderTag">订单标签</label><select class="filter-select" id="taskOrderTag"><option value="">全部</option><option>营养餐</option><option>普通餐</option></select></div>',
            '<div class="purchase-field"><label class="filter-label" for="taskPurchaseStatus">采购状态</label><select class="filter-select" id="taskPurchaseStatus"><option value="">全部</option><option>未生成采购单</option><option>已生成采购单</option></select></div>',
            '<div class="purchase-field"><label class="filter-label" for="taskOrderSource">订单来源</label><select class="filter-select" id="taskOrderSource"><option value="">全部</option><option>客户下单</option><option>平台添加</option></select></div>',
            '<div class="purchase-field"><label class="filter-label" for="taskOrderNo">订单号</label><input class="filter-input" id="taskOrderNo" placeholder="请输入采购单号"></div>',
            '<div class="purchase-field"><label class="filter-label" for="taskWarehouse">仓库</label><select class="filter-select" id="taskWarehouse"><option value="">全部</option><option>东南区域仓库</option><option>公司市区仓库</option><option>生鲜仓库</option></select></div>',
            '<div class="purchase-field"><label class="filter-label" for="taskOrderDisplay">下单时间</label><div class="purchase-date-range purchase-date-range-combined" id="taskOrderRange"><input class="filter-input date-range-display" id="taskOrderDisplay" type="text" placeholder="请选择日期范围" readonly><span class="date-range-icon" aria-hidden="true"><svg class="icon-svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></span><input type="hidden" id="taskOrderStart" data-date-start><input type="hidden" id="taskOrderEnd" data-date-end></div></div>',
            '<div class="purchase-field"><label class="filter-label" for="taskCategory">商品分类</label><select class="filter-select" id="taskCategory"><option value="">全部</option><option>蛋奶类</option><option>主食（米面粉点心类）</option><option>果蔬</option></select></div>',
            '<div class="purchase-field"><label class="filter-label" for="taskProductName">商品名称</label><input class="filter-input" id="taskProductName" placeholder="请输入商品名称"></div>',
            '<div class="purchase-field"><label class="filter-label" for="taskManager">采购负责人</label><select class="filter-select" id="taskManager"><option value="">全部</option><option>杨采</option><option>杨无缺</option></select></div>',
          '</div>',
        '</div>',
      '</div>',
      '<div class="purchase-toolbar">',
        '<div class="purchase-toolbar-main"><button class="btn btn-primary" type="button" data-action="batch-allocate">批量分配</button><button class="btn btn-primary" type="button" data-action="generate-order">生成采购单</button></div>',
        '<div class="purchase-toolbar-side"><label class="purchase-radio"><input type="radio" name="taskInventoryMode" value="stock" checked>计算库存</label><label class="purchase-radio"><input type="radio" name="taskInventoryMode" value="transit">计算在途库存</label></div>',
      '</div>',
      '<div class="purchase-table-container">',
        '<div class="purchase-table-wrap">',
          '<table class="purchase-table purchase-task-table"><thead id="taskTableHead"></thead><tbody id="taskTableBody"></tbody></table>',
        '</div>',
        '<div class="purchase-pagination" id="taskPagination"></div>',
      '</div>',
    '</section>'
  ].join('');

  var root = window.AppShell.mount({ title: '采购任务', content: content });
  document.title = '采购任务 - 集采企业版企业端';
  var page = root.querySelector('.purchase-task-page');
  var state = { page: 1, pageSize: 20, total: 0, selected: new Set(), condition: { date: '2026-08-26' }, inventoryMode: 'stock' };

  function $(selector) { return page.querySelector(selector); }
  function value(selector) { return ($(selector)?.value || '').trim(); }
  function text(value) { return utils.escapeHtml(value == null ? '' : value); }
  function fixed(value) { return Number(value || 0).toFixed(2); }
  function displayProduct(task) {
    return text(window.DomUtils.formatProductDisplay(task));
  }

  utils.mountDate($('#taskDate'), '2026-08-26', false);
  var taskOrderPicker = utils.mountDateRange($('#taskOrderRange'), '', '');

  function collectCondition() {
    state.condition = {
      date: value('#taskDate'),
      purchaseType: value('#taskPurchaseType'),
      customerName: value('#taskCustomerName'),
      orderTag: value('#taskOrderTag'),
      purchaseStatus: value('#taskPurchaseStatus'),
      orderSource: value('#taskOrderSource'),
      orderNo: value('#taskOrderNo'),
      warehouse: value('#taskWarehouse'),
      orderStart: value('#taskOrderStart'),
      orderEnd: value('#taskOrderEnd'),
      category: value('#taskCategory'),
      productName: value('#taskProductName'),
      manager: value('#taskManager')
    };
  }

  function render() {
    var all = service.listTasks(state.condition);
    state.total = all.length;
    var start = (state.page - 1) * state.pageSize;
    var visible = all.slice(start, start + state.pageSize);
    $('#taskTableHead').innerHTML = '<tr><th class="purchase-sticky-select"><input type="checkbox" data-action="select-all" aria-label="选择全部"></th><th>商品名称（计量单位/品牌/规格）</th><th>商品分类</th><th>计量单位</th><th>订单数</th><th>下单汇总量</th><th>库存抵扣汇总</th><th>在途库存抵扣汇总</th><th>待采购量</th><th>生成进度</th><th class="purchase-sticky-action">操作</th></tr>';
    $('#taskTableBody').innerHTML = visible.length ? visible.map(function (task) {
      var checked = state.selected.has(task.id) ? ' checked' : '';
      return '<tr data-id="' + text(task.id) + '">' +
        '<td class="purchase-sticky-select"><input type="checkbox" class="task-row-select" aria-label="选择商品"' + checked + '></td>' +
        '<td><span class="product-display-text" title="' + displayProduct(task) + '">' + displayProduct(task) + '</span></td>' +
        '<td title="' + text(task.category) + '">' + text(task.category) + '</td>' +
        '<td>' + text(task.unit) + '</td>' +
        '<td>' + task.orderCount + '</td>' +
        '<td>' + fixed(task.orderQty) + '</td>' +
        '<td>' + fixed(task.stockDeduction) + '</td>' +
        '<td>' + fixed(task.inTransitDeduction) + '</td>' +
        '<td>' + fixed(task.toPurchaseQty) + '</td>' +
        '<td><span class="purchase-progress">' + text(task.progress + ' (' + task.progressCount + ')') + '</span></td>' +
        '<td class="purchase-sticky-action"><div class="purchase-action-group"><button class="btn-text" type="button" data-action="allocation-detail">分配详情</button><button class="btn-text" type="button" data-action="allocation">分配</button></div></td>' +
      '</tr>';
    }).join('') : '<tr><td class="purchase-empty" colspan="11">暂无数据</td></tr>';
    var selectedVisible = visible.filter(function (task) { return state.selected.has(task.id); }).length;
    var selectAll = $('#taskTableHead [data-action="select-all"]');
    if (selectAll) {
      selectAll.checked = visible.length > 0 && selectedVisible === visible.length;
      selectAll.indeterminate = selectedVisible > 0 && selectedVisible < visible.length;
    }
    utils.renderPagination($('#taskPagination'), state, function (next) {
      state.page = next.page;
      state.pageSize = next.pageSize;
      render();
    });
  }

  function resetFilters() {
    $('#taskDate').value = '2026-08-26';
    ['#taskPurchaseType', '#taskCustomerName', '#taskOrderTag', '#taskPurchaseStatus', '#taskOrderSource', '#taskWarehouse', '#taskCategory', '#taskManager'].forEach(function (selector) { $(selector).value = ''; });
    ['#taskOrderNo', '#taskProductName'].forEach(function (selector) { $(selector).value = ''; });
    if (taskOrderPicker) taskOrderPicker.setValue('', '', false);
    state.page = 1;
    collectCondition();
    render();
  }

  page.addEventListener('click', function (event) {
    var target = event.target.closest('[data-action]');
    if (!target || !page.contains(target)) return;
    var action = target.dataset.action;
    if (action === 'toggle-advanced') {
      var filter = $('#purchaseTaskFilter');
      var expanded = filter.classList.toggle('is-expanded');
      var advanced = $('#purchaseTaskAdvancedFilter');
      if (advanced) advanced.hidden = !expanded;
      target.setAttribute('aria-expanded', String(expanded));
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
    if (action === 'batch-allocate' || action === 'generate-order') {
      var selected = service.listTasks(state.condition).filter(function (task) { return state.selected.has(task.id); });
      if (!selected.length) {
        utils.toast('请选择商品', 'error');
        return;
      }
      if (action === 'batch-allocate') {
        if (selected.some(function (task) { return task.generatedCount > 0; })) utils.toast('已选商品存在已分拣或已发货的情况，不允许批量分配，请单独分配');
        else utils.toast('批量分配成功');
      } else {
        var pending = selected.filter(function (task) { return task.generatedCount !== task.orderCount; });
        var schoolDates = Array.from(new Set(selected.map(function (task) { return task.date; })));
        if (schoolDates.length !== 1) {
          utils.toast('请按学校期望送达时间分别生成采购单', 'error');
          return;
        }
        utils.openEnterpriseExpectedDateModal({
          schoolExpectedAt: schoolDates[0],
          onConfirm: function (enterpriseDate) {
            if (!pending.length) {
              utils.toast('所选商品不需生成采购单');
              return true;
            }
            var result = service.generatePurchaseOrders(pending.map(function (task) { return task.id; }), enterpriseDate);
            if (!result?.ok) {
              utils.toast(result?.message || '采购单生成失败', 'error');
              return false;
            }
            if (!result.orders?.length) {
              utils.toast('请先在分配页面设置中标价', 'error');
              return false;
            }
            state.selected.clear();
            render();
            utils.toast('采购单生成成功');
            return true;
          }
        });
      }
      return;
    }
    var row = target.closest('tr[data-id]');
    if (!row) return;
    var id = row.dataset.id;
    if (action === 'allocation-detail') utils.navigate('./purchase-task-allocation-detail.html?id=' + encodeURIComponent(id));
    if (action === 'allocation') utils.navigate('./purchase-task-allocation.html?id=' + encodeURIComponent(id));
  });

  page.addEventListener('change', function (event) {
    if (event.target.matches('[data-action="select-all"]')) {
      var rows = Array.from(page.querySelectorAll('#taskTableBody tr[data-id]'));
      rows.forEach(function (row) {
        var id = row.dataset.id;
        if (event.target.checked) state.selected.add(id);
        else state.selected.delete(id);
      });
      render();
      return;
    }
    if (event.target.matches('.task-row-select')) {
      var row = event.target.closest('tr[data-id]');
      if (event.target.checked) state.selected.add(row.dataset.id);
      else state.selected.delete(row.dataset.id);
      render();
      return;
    }
    if (event.target.matches('input[name="taskInventoryMode"]')) {
      state.inventoryMode = event.target.value;
      render();
    }
  });

  render();
})();
