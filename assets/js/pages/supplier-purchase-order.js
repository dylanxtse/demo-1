(function () {
  const service = window.SupplierPurchaseOrderService;
  if (!service || !window.AppShell) return;

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const defaults = {
    expectedStart: '2026-07-29',
    expectedEnd: '2026-08-27',
    orderStatus: '',
    confirmStatus: '',
    orderNo: '',
    createdStart: '',
    createdEnd: '',
    warehouse: '',
    productName: ''
  };

  const icon = {
    calendar: '<svg class="supplier-purchase-calendar-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="17" rx="2"></rect><line x1="16" y1="2.5" x2="16" y2="6"></line><line x1="8" y1="2.5" x2="8" y2="6"></line><line x1="3" y1="9" x2="21" y2="9"></line></svg>',
    print: '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>',
    export: '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12"></path><polyline points="7 10 12 15 17 10"></polyline><path d="M5 21h14"></path></svg>',
    chevron: '<svg class="supplier-purchase-chevron" viewBox="0 0 24 24" aria-hidden="true"><polyline points="9 6 15 12 9 18"></polyline></svg>'
  };

  function numberLabel(value) {
    return value === '' || value == null ? '--' : escapeHtml(value);
  }

  function statusClass(status) {
    if (status === '待收货' || status === '待确认') return 'pending';
    if (status === '已确认' || status === '已发货' || status === '已完成') return 'success';
    return 'neutral';
  }

  function renderStatus(status) {
    return `<span class="supplier-purchase-status supplier-purchase-status-${statusClass(status)}">${escapeHtml(status || '--')}</span>`;
  }

  function renderDateRange(startName, endName, startValue = '', endValue = '', label) {
    return `
      <div class="supplier-purchase-date-range">
        <input data-filter="${startName}" type="text" value="${escapeHtml(startValue)}" placeholder="请选择日期" aria-label="${escapeHtml(label)}开始日期">
        <span aria-hidden="true">—</span>
        <input data-filter="${endName}" type="text" value="${escapeHtml(endValue)}" placeholder="请选择日期" aria-label="${escapeHtml(label)}结束日期">
        ${icon.calendar}
      </div>
    `;
  }

  function renderNested(row) {
    return `
      <tr class="supplier-purchase-expanded-row" data-expanded-for="${escapeHtml(row.id)}">
        <td colspan="15">
          <div class="supplier-purchase-nested-wrap">
            <table class="supplier-purchase-nested-table">
              <colgroup>
                <col class="nested-col-product"><col class="nested-col-remark"><col class="nested-col-unit"><col class="nested-col-quantity"><col class="nested-col-price"><col class="nested-col-quantity"><col class="nested-col-amount"><col class="nested-col-date"><col class="nested-col-report"><col class="nested-col-quantity"><col class="nested-col-quantity"><col class="nested-col-amount"><col class="nested-col-quantity"><col class="nested-col-amount"><col class="nested-col-quantity"><col class="nested-col-amount"><col class="nested-col-action">
              </colgroup>
              <thead><tr>
                <th>商品名称（计量单位/品牌/规格）</th>
                <th>备注</th>
                <th>计量单位</th>
                <th>计划采购量</th>
                <th>采购单价</th>
                <th>发货数量</th>
                <th>发货小计</th>
                <th>生产日期</th>
                <th>质检报告</th>
                <th>收货数量</th>
                <th>未收数量</th>
                <th>收货小计</th>
                <th>退货数量</th>
                <th>退货小计</th>
                <th>对账数量</th>
                <th>对账小计</th>
                <th>操作</th>
              </tr></thead>
              <tbody>
                ${row.items.map((line) => `
                  <tr data-row-id="${escapeHtml(row.id)}" data-item-id="${escapeHtml(line.id)}">
                    <td class="supplier-purchase-product-cell" title="${escapeHtml(line.displayName)}">${escapeHtml(line.displayName)}</td>
                    <td>${numberLabel(line.remark)}</td>
                    <td>${escapeHtml(line.unit)}</td>
                    <td>${numberLabel(line.plannedQty)}</td>
                    <td>${numberLabel(line.purchasePrice)}</td>
                    <td>${numberLabel(line.shippedQty)}</td>
                    <td>${numberLabel(line.shippedSubtotal)}</td>
                    <td><input class="supplier-purchase-production-date" data-action="production-date" type="text" value="${escapeHtml(line.productionDate)}" placeholder="选择生产日期" aria-label="${escapeHtml(line.displayName)}生产日期"></td>
                    <td>${numberLabel(line.qualityReport)}</td>
                    <td>${numberLabel(line.receivedQty)}</td>
                    <td>${numberLabel(line.unreceivedQty)}</td>
                    <td>${numberLabel(line.receivedSubtotal)}</td>
                    <td>${numberLabel(line.returnedQty)}</td>
                    <td>${numberLabel(line.returnedSubtotal)}</td>
                    <td>${numberLabel(line.reconciledQty)}</td>
                    <td>${numberLabel(line.reconciledSubtotal)}</td>
                    <td><button class="supplier-purchase-text-action" type="button" data-action="detail">查看明细</button></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </td>
      </tr>
    `;
  }

  function renderRows(page, state) {
    const body = page.querySelector('#supplierPurchaseOrderBody');
    if (!body) return;
    const pageState = state.pager?.getState() || { page: 1, pageSize: 10 };
    const start = (pageState.page - 1) * pageState.pageSize;
    const visible = state.filtered.slice(start, start + pageState.pageSize);
    state.visible = visible;
    if (!visible.length) {
      body.innerHTML = '<tr><td class="supplier-purchase-empty" colspan="15">暂无符合条件的数据</td></tr>';
      return;
    }

    body.innerHTML = visible.map((row) => `
      <tr class="supplier-purchase-main-row" data-row-id="${escapeHtml(row.id)}">
        <td class="supplier-purchase-expand-cell"><button class="supplier-purchase-expand-button" type="button" data-action="toggle-expand" aria-expanded="${row.expanded ? 'true' : 'false'}" aria-label="${row.expanded ? '收起' : '展开'}${escapeHtml(row.orderNo)}">${icon.chevron}</button></td>
        <td><input class="supplier-purchase-row-check" data-select-row type="checkbox" ${state.selected.has(row.id) ? 'checked' : ''} aria-label="选择${escapeHtml(row.orderNo)}"></td>
        <td>${escapeHtml(row.orderNo)}</td>
        <td>${escapeHtml(row.warehouse)}</td>
        <td>${escapeHtml(row.createdAt)}</td>
        <td>${escapeHtml(row.expectedDeliveryAt)}</td>
        <td>${numberLabel(row.receivedAmount)}</td>
        <td>${numberLabel(row.returnAmount)}</td>
        <td>${numberLabel(row.reconciliationAmount)}</td>
        <td>${renderStatus(row.confirmStatus)}</td>
        <td>${renderStatus(row.orderStatus)}</td>
        <td>${numberLabel(row.goodsCount)}</td>
        <td>${renderStatus(row.supplierStatus)}</td>
        <td class="supplier-purchase-remark-cell" title="${escapeHtml(row.remark || '')}">${escapeHtml(row.remark || '--')}</td>
        <td class="supplier-purchase-actions-cell">
          <button class="supplier-purchase-text-action" type="button" data-action="confirm" ${row.canConfirm ? '' : 'disabled'}>确认供货</button>
          <span class="supplier-purchase-action-divider" aria-hidden="true">|</span>
          <button class="supplier-purchase-text-action" type="button" data-action="ship" ${row.canShip ? '' : 'disabled'}>发货</button>
        </td>
      </tr>
      ${row.expanded ? renderNested(row) : ''}
    `).join('');

    const selectAll = page.querySelector('[data-select-all]');
    const selectedVisibleCount = visible.filter((row) => state.selected.has(row.id)).length;
    if (selectAll) {
      selectAll.checked = state.filtered.length > 0 && selectedVisibleCount === state.filtered.length;
      selectAll.indeterminate = selectedVisibleCount > 0 && selectedVisibleCount < state.filtered.length;
    }
  }

  function renderDetail(page, detail) {
    const dialog = page.querySelector('#supplierPurchaseDetailDialog');
    if (!dialog || !detail) return;
    const values = {
      goods: detail.item.displayName,
      customer: detail.row.customerName,
      customerCode: detail.row.customerCode || '--',
      quantity: detail.item.plannedQty,
      unit: detail.item.unit,
      remark: detail.item.remark || '--'
    };
    Object.entries(values).forEach(([key, value]) => {
      const element = dialog.querySelector(`[data-detail-value="${key}"]`);
      if (element) element.textContent = value;
    });
    dialog.hidden = false;
    dialog.classList.add('is-open');
  }

  function closeDetail(page) {
    const dialog = page.querySelector('#supplierPurchaseDetailDialog');
    if (!dialog) return;
    dialog.hidden = true;
    dialog.classList.remove('is-open');
  }

  function renderShippingDialog(page, row) {
    const dialog = page.querySelector('#supplierShippingDialog');
    if (!dialog || !row) return;
    dialog.dataset.rowId = row.id;
    const values = {
      shippingTime: row.createdAt,
      customerName: row.customerName,
      consignee: '南皮县职业技术教育中心',
      receivingAddress: '南皮县教育局指定收货地址',
      orderNo: row.orderNo,
      handler: '南皮供应商01',
      deliveryPerson: '南皮供应商01',
      acceptanceUnit: row.customerName
    };
    Object.entries(values).forEach(([key, value]) => {
      const element = dialog.querySelector(`[data-shipping-value="${key}"]`);
      if (element) element.value = value;
    });
    const body = dialog.querySelector('[data-shipping-items]');
    if (body) {
      body.innerHTML = row.items.map((line) => `
        <tr data-row-id="${escapeHtml(row.id)}" data-item-id="${escapeHtml(line.id)}">
          <td>${escapeHtml(line.productCode || '--')}</td>
          <td class="supplier-purchase-product-cell" title="${escapeHtml(line.displayName)}">${escapeHtml(line.displayName)}</td>
          <td>${escapeHtml(line.unit)}</td>
          <td>${numberLabel(line.purchasePrice)}</td>
          <td><input class="supplier-purchase-shipping-quantity" data-shipping-quantity type="text" value="${escapeHtml(line.shippedQty)}" aria-label="${escapeHtml(line.displayName)}发货数量"></td>
          <td>${numberLabel(line.shippedSubtotal)}</td>
          <td>${numberLabel(line.receivedQty)}</td>
          <td><input class="supplier-purchase-shipping-date" data-shipping-production-date type="text" value="${escapeHtml(line.productionDate)}" placeholder="选择生产日期" aria-label="${escapeHtml(line.displayName)}生产日期"></td>
        </tr>
      `).join('');
    }
    const total = row.items.reduce((sum, line) => sum + (Number(line.shippedSubtotal) || 0), 0);
    const totalValue = dialog.querySelector('[data-shipping-total]');
    const totalUpper = dialog.querySelector('[data-shipping-total-upper]');
    if (totalValue) totalValue.textContent = total.toFixed(2);
    if (totalUpper) totalUpper.textContent = `人民币 ${total.toFixed(2)} 元`;
    dialog.hidden = false;
    dialog.classList.add('is-open');
  }

  function closeShipping(page) {
    const dialog = page.querySelector('#supplierShippingDialog');
    if (!dialog) return;
    dialog.hidden = true;
    dialog.classList.remove('is-open');
    delete dialog.dataset.rowId;
  }

  function csvCell(value) {
    return `"${String(value ?? '').replace(/"/g, '""')}"`;
  }

  function exportRows(rows) {
    const header = ['采购单号', '仓库', '创建时间', '期望发货时间', '已收货金额', '退货金额', '对账金额', '是否确认', '单据状态', '商品种类数', '供应商状态', '备注'];
    const lines = [header, ...rows.map((row) => [row.orderNo, row.warehouse, row.createdAt, row.expectedDeliveryAt, row.receivedAmount, row.returnAmount, row.reconciliationAmount, row.confirmStatus, row.orderStatus, row.goodsCount, row.supplierStatus, row.remark])]
      .map((line) => line.map(csvCell).join(','));
    const blob = new Blob([`\ufeff${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = '采购单.csv';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function render() {
    const rows = service.getRows();
    const warehouses = service.warehouses(rows);
    const content = `
      <div class="page-card supplier-purchase-order-page" id="supplierPurchaseOrderPage">
        <form class="supplier-purchase-filters" id="supplierPurchaseOrderFilters">
          <div class="supplier-purchase-basic-fields">
            <div class="supplier-purchase-filter-item supplier-purchase-filter-item-wide">
              <label>期望发货时间</label>
              ${renderDateRange('expectedStart', 'expectedEnd', defaults.expectedStart, defaults.expectedEnd, '期望发货时间')}
            </div>
            <div class="supplier-purchase-filter-item">
              <label for="supplierPurchaseOrderStatus">单据状态</label>
              <select id="supplierPurchaseOrderStatus" data-filter="orderStatus">
                <option value="">全部</option>
                <option value="待收货">待收货</option>
                <option value="已完成">已完成</option>
              </select>
            </div>
          </div>
          <div class="supplier-purchase-filter-actions">
            <button class="supplier-purchase-advanced-toggle" type="button" data-action="toggle-advanced" aria-expanded="false">高级筛选 <span aria-hidden="true">▾</span></button>
            <button class="btn btn-primary btn-sm" type="submit">查询</button>
            <button class="btn btn-sm" type="button" data-action="reset">重置</button>
          </div>
          <div class="supplier-purchase-advanced-fields" data-advanced-fields hidden>
            <div class="supplier-purchase-filter-item">
              <label for="supplierPurchaseOrderConfirmStatus">是否确认</label>
              <select id="supplierPurchaseOrderConfirmStatus" data-filter="confirmStatus">
                <option value="">全部</option>
                <option value="已确认">已确认</option>
                <option value="已发货">已发货</option>
              </select>
            </div>
            <div class="supplier-purchase-filter-item">
              <label for="supplierPurchaseOrderNo">采购单号</label>
              <input id="supplierPurchaseOrderNo" data-filter="orderNo" type="text" placeholder="请输入采购单号">
            </div>
            <div class="supplier-purchase-filter-item supplier-purchase-filter-item-wide">
              <label>创建日期</label>
              ${renderDateRange('createdStart', 'createdEnd', '', '', '创建日期')}
            </div>
            <div class="supplier-purchase-filter-item">
              <label for="supplierPurchaseWarehouse">仓库</label>
              <select id="supplierPurchaseWarehouse" data-filter="warehouse">
                <option value="">全部</option>
                ${warehouses.map((warehouse) => `<option value="${escapeHtml(warehouse)}">${escapeHtml(warehouse)}</option>`).join('')}
              </select>
            </div>
            <div class="supplier-purchase-filter-item">
              <label for="supplierPurchaseProductName">商品名称</label>
              <input id="supplierPurchaseProductName" data-filter="productName" type="text" placeholder="请输入名称/编号">
            </div>
          </div>
        </form>
        <div class="supplier-purchase-toolbar">
          <div class="supplier-purchase-toolbar-left"><span class="supplier-purchase-selected-count" aria-live="polite"></span></div>
          <div class="supplier-purchase-toolbar-actions">
            <button class="supplier-purchase-outline-button" type="button" data-action="print">${icon.print}<span>打印</span></button>
            <button class="supplier-purchase-outline-button" type="button" data-action="export">${icon.export}<span>导出</span></button>
          </div>
        </div>
        <div class="supplier-purchase-table-wrap">
          <table class="supplier-purchase-table">
            <colgroup>
              <col class="col-expand"><col class="col-check"><col class="col-order-no"><col class="col-warehouse"><col class="col-time"><col class="col-time"><col class="col-money"><col class="col-money"><col class="col-money"><col class="col-status"><col class="col-status"><col class="col-count"><col class="col-supplier-status"><col class="col-remark"><col class="col-action">
            </colgroup>
            <thead><tr>
              <th class="supplier-purchase-expand-cell" aria-label="展开"></th>
              <th><input data-select-all type="checkbox" aria-label="选择全部采购单"></th>
              <th>采购单号</th>
              <th>仓库</th>
              <th>创建时间</th>
              <th>期望发货时间</th>
              <th>已收货金额</th>
              <th>退货金额</th>
              <th>对账金额</th>
              <th>是否确认</th>
              <th>单据状态</th>
              <th>商品种类数</th>
              <th>供应商状态</th>
              <th>备注</th>
              <th>操作</th>
            </tr></thead>
            <tbody id="supplierPurchaseOrderBody"></tbody>
          </table>
        </div>
        <div class="pagination supplier-purchase-pagination" id="supplierPurchasePagination"></div>
        <div class="supplier-purchase-detail-dialog" id="supplierPurchaseDetailDialog" role="dialog" aria-modal="true" aria-labelledby="supplierPurchaseDetailTitle" hidden>
          <div class="supplier-purchase-dialog-panel">
            <div class="supplier-purchase-dialog-header"><h2 id="supplierPurchaseDetailTitle">商品明细</h2><button type="button" class="supplier-purchase-dialog-close" data-action="close-dialog" aria-label="关闭">×</button></div>
            <div class="supplier-purchase-detail-grid">
              <div><span>商品名称（计量单位/品牌/规格）</span><strong data-detail-value="goods">--</strong></div>
              <div><span>客户名称</span><strong data-detail-value="customer">--</strong></div>
              <div><span>客户编码</span><strong data-detail-value="customerCode">--</strong></div>
              <div><span>采购量</span><strong data-detail-value="quantity">--</strong></div>
              <div><span>计量单位</span><strong data-detail-value="unit">--</strong></div>
              <div><span>备注</span><strong data-detail-value="remark">--</strong></div>
            </div>
            <div class="supplier-purchase-dialog-footer"><button class="btn btn-sm" type="button" data-action="close-dialog">关闭</button></div>
          </div>
        </div>
        <div class="supplier-purchase-shipping-dialog" id="supplierShippingDialog" role="dialog" aria-modal="true" aria-labelledby="supplierShippingTitle" hidden>
          <div class="supplier-purchase-shipping-panel">
            <div class="supplier-purchase-dialog-header"><h2 id="supplierShippingTitle">发货</h2><button type="button" class="supplier-purchase-dialog-close" data-action="close-shipping-dialog" aria-label="关闭">×</button></div>
            <form id="supplierShippingForm" class="supplier-purchase-shipping-form">
              <div class="supplier-purchase-shipping-fields">
                <label><span>发货时间</span><input data-shipping-value="shippingTime" type="text"></label>
                <label><span>客户名称</span><input data-shipping-value="customerName" type="text" readonly></label>
                <label><span>收货人</span><input data-shipping-value="consignee" type="text"></label>
                <label><span>收货地址</span><input data-shipping-value="receivingAddress" type="text"></label>
                <label class="shipping-field-wide"><span>采购单号</span><input data-shipping-value="orderNo" type="text" readonly></label>
              </div>
              <div class="supplier-purchase-shipping-table-wrap">
                <table class="supplier-purchase-shipping-table">
                  <colgroup><col class="shipping-col-code"><col class="shipping-col-product"><col class="shipping-col-unit"><col class="shipping-col-price"><col class="shipping-col-quantity"><col class="shipping-col-amount"><col class="shipping-col-quantity"><col class="shipping-col-date"></colgroup>
                  <thead><tr><th>商品编号</th><th>商品名称（计量单位/品牌/规格）</th><th>单位</th><th>采购单价</th><th>发货数量</th><th>发货小计</th><th>收货数量</th><th>生产日期</th></tr></thead>
                  <tbody data-shipping-items></tbody>
                </table>
              </div>
              <div class="supplier-purchase-shipping-total"><span>发货总金额：<strong data-shipping-total>0.00</strong></span><span>大写总金额：<strong data-shipping-total-upper>人民币 0.00 元</strong></span></div>
              <div class="supplier-purchase-shipping-fields shipping-footer-fields">
                <label><span>经手人或单位</span><input data-shipping-value="handler" type="text"></label>
                <label><span>送货人</span><input data-shipping-value="deliveryPerson" type="text"></label>
                <label><span>验收人或单位</span><input data-shipping-value="acceptanceUnit" type="text"></label>
              </div>
              <div class="supplier-purchase-dialog-footer"><button class="btn btn-sm" type="button" data-action="close-shipping-dialog">取消</button><button class="btn btn-primary btn-sm" type="submit">确认发货</button></div>
            </form>
          </div>
        </div>
        <div class="supplier-purchase-toast" role="status"></div>
      </div>
    `;
    const root = window.AppShell.mount({ title: '采购单', content, variant: 'supplier', emptyText: '采购单' });
    const page = root.querySelector('#supplierPurchaseOrderPage');
    const state = { rows, filtered: rows, visible: [], selected: new Set(), advanced: false, pager: null };

    const readFilters = () => Object.fromEntries([...page.querySelectorAll('[data-filter]')].map((field) => [field.dataset.filter, field.value]));
    const syncRows = () => {
      state.rows = service.getRows();
      state.filtered = service.filterRows(state.rows, readFilters());
      const visibleIds = new Set(state.filtered.map((row) => row.id));
      state.selected = new Set([...state.selected].filter((id) => visibleIds.has(id)));
      const count = page.querySelector('.supplier-purchase-selected-count');
      if (count) count.textContent = state.selected.size ? `已选择 ${state.selected.size} 条` : '';
      state.pager?.update({ total: state.filtered.length });
    };
    const applyFilters = () => {
      state.filtered = service.filterRows(state.rows, readFilters());
      state.selected.clear();
      const count = page.querySelector('.supplier-purchase-selected-count');
      if (count) count.textContent = '';
      state.pager?.update({ total: state.filtered.length, page: 1 });
      renderRows(page, state);
    };
    const showToast = (message, error = false) => {
      const toast = page.querySelector('.supplier-purchase-toast');
      if (!toast) return;
      toast.textContent = message;
      toast.classList.toggle('is-error', error);
      toast.classList.add('is-visible');
      window.clearTimeout(showToast.timer);
      showToast.timer = window.setTimeout(() => toast.classList.remove('is-visible'), 2200);
    };

    syncRows();
    state.pager = window.Pagination.create({
      container: '#supplierPurchasePagination',
      total: state.filtered.length,
      page: 1,
      pageSize: 10,
      pageSizeOptions: [10, 20, 50],
      onChange: () => renderRows(page, state)
    });
    renderRows(page, state);

    page.querySelector('#supplierPurchaseOrderFilters').addEventListener('submit', (event) => {
      event.preventDefault();
      applyFilters();
    });

    page.querySelector('#supplierShippingForm').addEventListener('submit', (event) => {
      event.preventDefault();
      const dialog = page.querySelector('#supplierShippingDialog');
      const result = service.ship(dialog?.dataset.rowId);
      if (!result.ok) {
        closeShipping(page);
        showToast(result.message, true);
        return;
      }
      closeShipping(page);
      syncRows();
      renderRows(page, state);
      showToast('已提交发货');
    });

    page.addEventListener('change', (event) => {
      if (event.target.matches('[data-select-all]')) {
        state.visible.forEach((row) => event.target.checked ? state.selected.add(row.id) : state.selected.delete(row.id));
        const count = page.querySelector('.supplier-purchase-selected-count');
        if (count) count.textContent = state.selected.size ? `已选择 ${state.selected.size} 条` : '';
        renderRows(page, state);
        return;
      }
      if (event.target.matches('[data-select-row]')) {
        const rowId = event.target.closest('[data-row-id]')?.dataset.rowId;
        if (rowId && event.target.checked) state.selected.add(rowId);
        if (rowId && !event.target.checked) state.selected.delete(rowId);
        const count = page.querySelector('.supplier-purchase-selected-count');
        if (count) count.textContent = state.selected.size ? `已选择 ${state.selected.size} 条` : '';
        renderRows(page, state);
        return;
      }
      if (event.target.matches('[data-action="production-date"]')) {
        const row = event.target.closest('[data-row-id]');
        service.updateProductionDate(row?.dataset.rowId, row?.dataset.itemId, event.target.value);
        showToast('生产日期已保存');
      }
    });

    page.addEventListener('click', (event) => {
      const actionElement = event.target.closest('[data-action]');
      const action = actionElement?.dataset.action;
      if (!action) return;

      if (action === 'toggle-advanced') {
        state.advanced = !state.advanced;
        const panel = page.querySelector('[data-advanced-fields]');
        actionElement.setAttribute('aria-expanded', String(state.advanced));
        actionElement.classList.toggle('is-active', state.advanced);
        if (panel) panel.hidden = !state.advanced;
        return;
      }

      if (action === 'reset') {
        page.querySelectorAll('[data-filter]').forEach((field) => {
          field.value = defaults[field.dataset.filter] ?? '';
        });
        applyFilters();
        return;
      }

      if (action === 'toggle-expand') {
        const rowId = actionElement.closest('[data-row-id]')?.dataset.rowId;
        service.toggleExpanded(rowId);
        syncRows();
        renderRows(page, state);
        return;
      }

      if (action === 'confirm' || action === 'ship') {
        const rowId = actionElement.closest('[data-row-id]')?.dataset.rowId;
        if (action === 'ship') {
          const row = state.rows.find((item) => item.id === rowId);
          if (row?.canShip) renderShippingDialog(page, row);
          return;
        }
        const result = service.confirmSupply(rowId);
        if (!result.ok) {
          showToast(result.message, true);
          return;
        }
        syncRows();
        renderRows(page, state);
        showToast(action === 'confirm' ? '已确认供货' : '已提交发货');
        return;
      }

      if (action === 'detail') {
        const itemRow = actionElement.closest('[data-row-id]');
        renderDetail(page, service.getItem(itemRow?.dataset.rowId, itemRow?.dataset.itemId));
        return;
      }

      if (action === 'close-dialog') {
        closeDetail(page);
        return;
      }

      if (action === 'close-shipping-dialog') {
        closeShipping(page);
        return;
      }

      if (action === 'print') {
        window.print();
        return;
      }

      if (action === 'export') {
        exportRows(state.filtered);
      }
    });

    page.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeDetail(page);
        closeShipping(page);
      }
    });
  }

  render();
})();
