(function () {
  /* ===== 图标 ===== */
  const addIcon = '<svg class="icon-svg" viewBox="0 0 24 24" style="width:14px;height:14px;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
  const backIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/><path d="M19 12H9"/></svg>';
  const downloadIcon = '<svg class="icon-svg" viewBox="0 0 24 24" style="width:14px;height:14px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';

  /* ===== 常量 ===== */
  const warehouses = ['生鲜仓库', '公司市区仓库', '东南区域仓库'];

  const categoryOptions = [
    '全部',
    '主食（米面粉点心类）-粮食类',
    '蛋奶类-蛋奶类二级',
    '食油-食油二级',
    '果蔬-果蔬二级',
    '肉（豆）制品-肉（豆）制品二级',
    '水产品-水产品二级',
    '其他材料-其他二级'
  ];

  const outboundTypeOptions = [
    '全部', '销售出库', '联营采购出库', '其他出库',
    '采购退货出库', '联营采购退货出库', '报损出库', '单位转换出库', '净菜加工出库'
  ];

  const statusOptions = ['全部', '待出库', '待审核', '已驳回', '已完成', '已关闭'];

  function buildOptions(list) {
    return list.map((item) => `<option value="${item}">${item}</option>`).join('');
  }

  /* ===== 列表页 HTML ===== */
  const listPageHTML = `
    <div class="page-card warehouse-list-page" id="outboundListPage">
      <div class="filter-section">
        <div class="filter-panel">
          <div class="filter-fields">
            <div class="filter-group date-range-group">
              <label class="filter-label">出库日期</label>
              <div class="date-range-picker" id="obDateRange">
                <input class="filter-input date-range-display" id="obDateDisplay" placeholder="请选择日期" readonly>
                <span class="date-range-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></span>
                <input type="hidden" id="obDateStart">
                <input type="hidden" id="obDateEnd">
              </div>
            </div>
            <div class="filter-group">
              <label class="filter-label" for="obCategory">商品分类</label>
              <select class="filter-select" id="obCategory">${buildOptions(categoryOptions)}</select>
            </div>
            <div class="filter-group">
              <label class="filter-label" for="obName">商品名称</label>
              <input class="filter-input" id="obName" placeholder="请输入名称/编号">
            </div>
          </div>
          <div class="action-controls">
            <button class="filter-advanced-toggle" type="button" data-action="toggle-advanced">
              高级筛选
              <span class="toggle-arrow">▾</span>
            </button>
            <button class="btn btn-primary btn-sm btn-fixed" type="button" data-action="query">查询</button>
            <button class="btn btn-sm btn-fixed" type="button" data-action="reset">重置</button>
          </div>
        </div>
        <div class="filter-advanced" id="obAdvanced">
          <div class="filter-advanced-grid">
            <div class="filter-group">
              <label class="filter-label" for="obRelNo">关联单号</label>
              <input class="filter-input" id="obRelNo" placeholder="请输入关联单号">
            </div>
            <div class="filter-group">
              <label class="filter-label" for="obType">出库类型</label>
              <select class="filter-select" id="obType">${buildOptions(outboundTypeOptions)}</select>
            </div>
            <div class="filter-group">
              <label class="filter-label" for="obStatus">单据状态</label>
              <select class="filter-select" id="obStatus">${buildOptions(statusOptions)}</select>
            </div>
            <div class="filter-group">
              <label class="filter-label" for="obOrderNo">出库单号</label>
              <input class="filter-input" id="obOrderNo" placeholder="请输入出库单号">
            </div>
            <div class="filter-group">
              <label class="filter-label" for="obWarehouse">仓库</label>
              <select class="filter-select" id="obWarehouse">${buildOptions(['全部', ...warehouses])}</select>
            </div>
          </div>
        </div>
      </div>

      <div class="action-bar">
        <div class="action-main">
          <button class="btn btn-primary btn-sm btn-action" type="button" data-action="add-outbound">添加出库</button>
          <button class="btn btn-sm btn-action btn-blue btn-disabled" id="batchAuditBtn" type="button" disabled>批量审核</button>
        </div>
        <div class="action-controls">
          <button class="btn btn-sm btn-fixed" type="button" data-action="export">${downloadIcon}导出</button>
        </div>
      </div>

      <div class="table-container">
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th class="checkbox-cell"><span class="custom-checkbox" role="checkbox" aria-checked="false" data-action="toggle-all"></span></th>
                <th>出库单号</th>
                <th>出库时间</th>
                <th>出库类型</th>
                <th>出库金额</th>
                <th>仓库</th>
                <th style="min-width:160px">供应商/采购员/客户</th>
                <th>关联单号</th>
                <th>单据状态</th>
                <th style="min-width:90px">添加人</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody id="obTableBody"></tbody>
          </table>
        </div>
        <div class="pagination">
          <span class="page-total">共 0 条数据</span>
          <select class="page-size-select" id="obPageSize" aria-label="每页数量">
            <option value="20">20 条/页</option>
            <option value="50">50 条/页</option>
            <option value="100">100 条/页</option>
          </select>
          <div class="page-btns" id="obPageBtns"></div>
          <div class="page-jump">
            <span>跳至</span>
            <input type="text" id="obPageJump" value="1" aria-label="跳转页码">
            <span>页</span>
          </div>
        </div>
      </div>

    </div>

    <div class="warehouse-form-page" id="outboundFormPage"></div>
  `;

  /* ===== 状态 ===== */
  const state = {
    orders: [],
    visibleOrders: [],
    products: [],
    page: 1,
    pageSize: 20,
    selectedIds: new Set(),
    formMode: null,      // 'create' | 'edit'
    editId: null,
    formItems: []
  };
  let outboundDatePicker = null;

  /* ===== 工具函数 ===== */
  function escapeHtml(value) {
    return window.DomUtils.escapeHtml(value);
  }

  function findProduct(code) {
    return state.products.find((p) => p.code === code) || null;
  }

  function renderProductSelect(selectedCode) {
    const selectedProduct = selectedCode ? findProduct(selectedCode) : null;
    const selectedLabel = selectedProduct
      ? `${selectedProduct.isNetVegetable ? '<span class="net-vegetable-tag">净菜</span>' : ''}<span class="custom-select-text">${escapeHtml(selectedProduct.name)} (${escapeHtml(selectedProduct.code)})</span>`
      : '<span class="custom-select-text is-placeholder">请选择</span>';
    const options = state.products.map((product) => `
      <div class="custom-select-option ${product.code === selectedCode ? 'selected' : ''}"
        data-action="select-product" data-value="${escapeHtml(product.code)}">
        ${product.isNetVegetable ? '<span class="net-vegetable-tag">净菜</span>' : ''}
        <span>${escapeHtml(product.name)} (${escapeHtml(product.code)})</span>
      </div>
    `).join('');
    return `
      <div class="custom-select product-select" data-item-field="product">
        <div class="custom-select-trigger" data-action="toggle-product-select">
          <span class="product-select-label">${selectedLabel}</span>
          <svg class="custom-select-arrow" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="custom-select-dropdown product-select-dropdown">${options}</div>
      </div>
    `;
  }

  function getStatusClass(status) {
    if (status === 'PENDING' || status === 'PENDING_AUDIT') return 'pending';
    if (status === 'COMPLETED') return 'completed';
    if (status === 'REJECTED') return 'rejected';
    if (status === 'CLOSED') return 'closed';
    return 'offline';
  }

  function isActionable(status) {
    return status === 'PENDING' || status === 'PENDING_AUDIT';
  }

  function loadOrders() {
    state.orders = window.OutboundService.getList();
  }

  function loadProducts() {
    state.products = window.OutboundService.getProducts();
  }

  /* ===== 列表渲染 ===== */
  function renderTable(orders) {
    state.visibleOrders = orders || state.visibleOrders;
    const tbody = document.getElementById('obTableBody');
    const total = state.visibleOrders.length;
    const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
    if (state.page > totalPages) state.page = totalPages;
    const start = (state.page - 1) * state.pageSize;
    const pageOrders = state.visibleOrders.slice(start, start + state.pageSize);

    if (pageOrders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;color:var(--text-tertiary);padding:32px 0;">暂无数据</td></tr>';
    } else {
      tbody.innerHTML = pageOrders.map((order, index) => {
        const statusClass = getStatusClass(order.status);
        const statusLabel = window.BusinessRules.statusLabel('outboundOrders', order.status);
        const checked = state.selectedIds.has(order.id) ? 'checked' : '';
        const checkedAttr = checked ? 'true' : 'false';
        const actionable = isActionable(order.status);
        const relNoCell = order.relNo && order.relNo !== '--'
          ? `<button class="btn-text code-link" type="button" data-row-action="detail" data-id="${escapeHtml(order.id)}">${escapeHtml(order.relNo)}</button>`
          : '<span style="color:var(--text-tertiary)">--</span>';
        return `
          <tr data-order-id="${escapeHtml(order.id)}">
            <td class="checkbox-cell"><span class="custom-checkbox ${checked}" role="checkbox" aria-checked="${checkedAttr}" data-action="toggle-row" data-id="${escapeHtml(order.id)}"></span></td>
            <td><button class="btn-text code-link" type="button" data-row-action="detail" data-id="${escapeHtml(order.id)}">${escapeHtml(order.id)}</button></td>
            <td>${escapeHtml(order.outboundTime)}</td>
            <td>${escapeHtml(order.outboundType)}</td>
            <td>${escapeHtml(order.outboundAmt)}</td>
            <td>${escapeHtml(order.warehouseName)}</td>
            <td>${escapeHtml(order.supplierPurchaserCustomerName)}</td>
            <td>${relNoCell}</td>
            <td><span class="status-tag ${statusClass}">${escapeHtml(statusLabel)}</span></td>
            <td>${escapeHtml(order.creator)}</td>
            <td class="action-cell">
              <button class="btn-text ${!actionable ? 'disabled' : ''}" type="button" data-row-action="audit" data-id="${escapeHtml(order.id)}" ${!actionable ? 'disabled' : ''}>审核</button>
              <button class="btn-text ${!actionable ? 'disabled' : ''}" type="button" data-row-action="edit" data-id="${escapeHtml(order.id)}" ${!actionable ? 'disabled' : ''}>编辑</button>
              <button class="btn-text ${!actionable ? 'disabled' : ''}" type="button" data-row-action="close" data-id="${escapeHtml(order.id)}" ${!actionable ? 'disabled' : ''}>关闭</button>
            </td>
          </tr>
        `;
      }).join('');
    }

    renderPagination();
    updateBatchButtons();
    syncSelectAllCheckbox();
  }

  function renderPagination() {
    const total = state.visibleOrders.length;
    const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
    const container = document.getElementById('obPageBtns');
    let html = '';
    // 上一页
    html += `<button class="page-btn ${state.page === 1 ? 'disabled' : ''}" type="button" data-page="prev" ${state.page === 1 ? 'disabled' : ''}>‹</button>`;
    // 页码按钮（最多显示 7 个）
    let startPage = 1;
    let endPage = totalPages;
    if (totalPages > 7) {
      startPage = Math.max(1, state.page - 2);
      endPage = Math.min(totalPages, state.page + 2);
      if (startPage > 1) {
        html += `<button class="page-btn" type="button" data-page="1">1</button>`;
        if (startPage > 2) html += `<span class="page-ellipsis">…</span>`;
      }
    }
    for (let p = startPage; p <= endPage; p++) {
      html += `<button class="page-btn ${p === state.page ? 'active' : ''}" type="button" data-page="${p}">${p}</button>`;
    }
    if (totalPages > 7 && endPage < totalPages) {
      if (endPage < totalPages - 1) html += `<span class="page-ellipsis">…</span>`;
      html += `<button class="page-btn" type="button" data-page="${totalPages}">${totalPages}</button>`;
    }
    // 下一页
    html += `<button class="page-btn ${state.page === totalPages ? 'disabled' : ''}" type="button" data-page="next" ${state.page === totalPages ? 'disabled' : ''}>›</button>`;
    container.innerHTML = html;
    document.querySelector('#outboundListPage .page-total').textContent = `共 ${total} 条数据`;
    document.getElementById('obPageJump').value = state.page;
  }

  function syncSelectAllCheckbox() {
    const total = state.visibleOrders.length;
    const start = (state.page - 1) * state.pageSize;
    const pageOrders = state.visibleOrders.slice(start, start + state.pageSize);
    const allChecked = pageOrders.length > 0 && pageOrders.every((o) => state.selectedIds.has(o.id));
    const checkbox = document.querySelector('#outboundListPage [data-action="toggle-all"]');
    if (checkbox) {
      checkbox.classList.toggle('checked', allChecked);
      checkbox.setAttribute('aria-checked', String(allChecked));
    }
  }

  function updateBatchButtons() {
    const enabled = state.selectedIds.size > 0;
    const btn = document.getElementById('batchAuditBtn');
    if (btn) {
      btn.disabled = !enabled;
      btn.classList.toggle('btn-disabled', !enabled);
    }
  }

  /* ===== 筛选 ===== */
  function filterOrders() {
    const val = (id) => (document.getElementById(id)?.value || '').trim();
    const dateStart = val('obDateStart');
    const dateEnd = val('obDateEnd');
    const category = val('obCategory');
    const name = val('obName').toLowerCase();
    const relNo = val('obRelNo').toLowerCase();
    const type = val('obType');
    const status = val('obStatus');
    const orderNo = val('obOrderNo').toLowerCase();
    const warehouse = val('obWarehouse');

    const result = state.orders.filter((order) => {
      // 出库日期
      const orderDate = (order.outboundTime || '').slice(0, 10);
      if (dateStart && orderDate < dateStart) return false;
      if (dateEnd && orderDate > dateEnd) return false;
      // 商品分类：检查明细中是否有匹配分类的商品
      if (category !== '全部') {
        const hasCategory = (order.items || []).some((item) => {
          const product = findProduct(item.productCode);
          return product && product.category === category;
        });
        if (!hasCategory) return false;
      }
      // 商品名称/编号
      if (name) {
        const hasName = (order.items || []).some((item) => {
          const product = findProduct(item.productCode);
          const matchName = (item.productName || '').toLowerCase().includes(name);
          const matchCode = (item.productCode || '').toLowerCase().includes(name);
          const matchPName = product ? (product.name || '').toLowerCase().includes(name) : false;
          return matchName || matchCode || matchPName;
        });
        if (!hasName) return false;
      }
      // 关联单号
      if (relNo && !(order.relNo || '').toLowerCase().includes(relNo)) return false;
      // 出库类型
      if (type !== '全部' && order.outboundType !== type) return false;
      // 单据状态
      if (status !== '全部' && window.BusinessRules.statusLabel('outboundOrders', order.status) !== status) return false;
      // 出库单号
      if (orderNo && !(order.id || '').toLowerCase().includes(orderNo)) return false;
      // 仓库
      if (warehouse !== '全部' && order.warehouseName !== warehouse) return false;
      return true;
    });

    state.page = 1;
    renderTable(result);
  }

  function resetFilters() {
    ['obDateStart', 'obDateEnd', 'obName', 'obRelNo', 'obOrderNo'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const display = document.getElementById('obDateDisplay');
    if (display) display.value = '';
    ['obCategory', 'obType', 'obStatus', 'obWarehouse'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = '全部';
    });
    state.page = 1;
    filterOrders();
  }

  /* ===== 列表页操作 ===== */
  function toggleAdvanced() {
    const advanced = document.getElementById('obAdvanced');
    const toggle = document.querySelector('[data-action="toggle-advanced"]');
    advanced.classList.toggle('is-visible');
    toggle.classList.toggle('is-active');
  }

  /* ===== 日期区间选择器（双面板日历组件） ===== */
  const calendarState = {
    leftYear: 0,
    leftMonth: 0,
    rightYear: 0,
    rightMonth: 0,
    startDate: '',
    endDate: ''
  };

  function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function parseDate(str) {
    if (!str) return null;
    const parts = str.split('-');
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }

  function buildSingleCalendarHTML(y, m, side) {
    const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

    const firstDay = new Date(y, m, 1);
    const lastDay = new Date(y, m + 1, 0);
    const startWeekday = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const today = formatDate(new Date());
    const startDate = calendarState.startDate;
    const endDate = calendarState.endDate;

    let cells = '';
    for (let i = 0; i < startWeekday; i++) {
      cells += '<td class="cal-empty"></td>';
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      let cls = 'cal-day';
      if (dateStr === today) cls += ' cal-today';
      if (dateStr === startDate) cls += ' cal-start';
      if (dateStr === endDate) cls += ' cal-end';
      if (startDate && endDate && dateStr > startDate && dateStr < endDate) cls += ' cal-in-range';
      cells += `<td class="${cls}" data-date="${dateStr}" data-side="${side}">${d}</td>`;
    }
    const totalCells = startWeekday + daysInMonth;
    const remaining = (7 - (totalCells % 7)) % 7;
    for (let i = 0; i < remaining; i++) cells += '<td class="cal-empty"></td>';

    const weekHeader = weekDays.map((w) => `<th>${w}</th>`).join('');
    const rows = [];
    const cellArr = cells.split('</td>');
    for (let i = 0; i < cellArr.length - 1; i += 7) {
      const rowCells = cellArr.slice(i, i + 7).join('</td>') + '</td>';
      rows.push(`<tr>${rowCells}</tr>`);
    }

    return `
      <div class="cal-header">
        <button class="cal-nav cal-prev" type="button" data-action="cal-prev" data-side="${side}">‹</button>
        <span class="cal-title">${y}年 ${monthNames[m]}</span>
        <button class="cal-nav cal-next" type="button" data-action="cal-next" data-side="${side}">›</button>
      </div>
      <table class="cal-table"><thead><tr>${weekHeader}</tr></thead><tbody>${rows.join('')}</tbody></table>
    `;
  }

  function buildCalendarHTML() {
    const leftHTML = buildSingleCalendarHTML(calendarState.leftYear, calendarState.leftMonth, 'left');
    const rightHTML = buildSingleCalendarHTML(calendarState.rightYear, calendarState.rightMonth, 'right');

    return `
      <div class="cal-dual-body">
        <div class="cal-panel cal-panel-left">
          <div class="cal-panel-label">开始日期</div>
          ${leftHTML}
        </div>
        <div class="cal-divider"></div>
        <div class="cal-panel cal-panel-right">
          <div class="cal-panel-label">结束日期</div>
          ${rightHTML}
        </div>
      </div>
      <div class="cal-footer">
        <span class="cal-hint">左侧选择开始日期，右侧选择结束日期</span>
        <div class="cal-btns">
          <button class="btn btn-sm" type="button" data-action="cal-clear">清空</button>
          <button class="btn btn-primary btn-sm" type="button" data-action="cal-confirm">确定</button>
        </div>
      </div>
    `;
  }

  function renderCalendar() {
    const panel = document.getElementById('obCalendarPanel');
    if (!panel) return;
    panel.innerHTML = buildCalendarHTML();
    updateDateDisplay();
  }

  function showCalendar() {
    let panel = document.getElementById('obCalendarPanel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'obCalendarPanel';
      panel.className = 'calendar-panel cal-dual';
      document.body.appendChild(panel);
    }
    const now = new Date();
    calendarState.leftYear = now.getFullYear();
    calendarState.leftMonth = now.getMonth();
    calendarState.rightYear = now.getFullYear();
    calendarState.rightMonth = (now.getMonth() + 1) % 12;
    if (now.getMonth() === 11) calendarState.rightYear = now.getFullYear() + 1;
    calendarState.startDate = document.getElementById('obDateStart').value || '';
    calendarState.endDate = document.getElementById('obDateEnd').value || '';
    positionCalendar(panel);
    panel.classList.add('is-visible');
    renderCalendar();
  }

  function positionCalendar(panel) {
    const input = document.getElementById('obDateDisplay');
    if (!input || !panel) return;
    const rect = input.getBoundingClientRect();
    panel.style.position = 'fixed';
    panel.style.top = `${rect.bottom + 4}px`;
    panel.style.left = `${rect.left}px`;
  }

  function hideCalendar() {
    const panel = document.getElementById('obCalendarPanel');
    if (panel) panel.classList.remove('is-visible');
  }

  function shiftMonth(side, direction) {
    if (side === 'left') {
      if (direction === 'prev') {
        calendarState.leftMonth--;
        if (calendarState.leftMonth < 0) { calendarState.leftMonth = 11; calendarState.leftYear--; }
      } else {
        calendarState.leftMonth++;
        if (calendarState.leftMonth > 11) { calendarState.leftMonth = 0; calendarState.leftYear++; }
      }
    } else {
      if (direction === 'prev') {
        calendarState.rightMonth--;
        if (calendarState.rightMonth < 0) { calendarState.rightMonth = 11; calendarState.rightYear--; }
      } else {
        calendarState.rightMonth++;
        if (calendarState.rightMonth > 11) { calendarState.rightMonth = 0; calendarState.rightYear++; }
      }
    }
    renderCalendar();
  }

  function onCalendarClick(event) {
    const actionEl = event.target.closest('[data-action]');
    if (actionEl) {
      const action = actionEl.dataset.action;
      const side = actionEl.dataset.side;
      if (action === 'cal-prev') { shiftMonth(side, 'prev'); return; }
      if (action === 'cal-next') { shiftMonth(side, 'next'); return; }
      if (action === 'cal-clear') {
        calendarState.startDate = '';
        calendarState.endDate = '';
        renderCalendar();
        return;
      }
      if (action === 'cal-confirm') {
        document.getElementById('obDateStart').value = calendarState.startDate;
        document.getElementById('obDateEnd').value = calendarState.endDate;
        hideCalendar();
        return;
      }
    }

    const dayEl = event.target.closest('.cal-day');
    if (dayEl) {
      const dateStr = dayEl.dataset.date;
      const side = dayEl.dataset.side;
      if (side === 'left') {
        calendarState.startDate = dateStr;
        if (calendarState.endDate && dateStr > calendarState.endDate) {
          calendarState.endDate = '';
        }
      } else {
        calendarState.endDate = dateStr;
        if (calendarState.startDate && dateStr < calendarState.startDate) {
          calendarState.startDate = dateStr;
          calendarState.endDate = '';
        }
      }
      renderCalendar();
    }
  }

  function updateDateDisplay() {
    const start = calendarState.startDate || document.getElementById('obDateStart')?.value || '';
    const end = calendarState.endDate || document.getElementById('obDateEnd')?.value || '';
    const display = document.getElementById('obDateDisplay');
    if (display) {
      if (start && end) display.value = `${start} ~ ${end}`;
      else if (start) display.value = `${start} ~`;
      else if (end) display.value = `~ ${end}`;
      else display.value = '';
    }
  }

  function toggleRow(id) {
    if (state.selectedIds.has(id)) {
      state.selectedIds.delete(id);
    } else {
      state.selectedIds.add(id);
    }
    renderTable();
  }

  function toggleAll() {
    const start = (state.page - 1) * state.pageSize;
    const pageOrders = state.visibleOrders.slice(start, start + state.pageSize);
    const allChecked = pageOrders.length > 0 && pageOrders.every((o) => state.selectedIds.has(o.id));
    if (allChecked) {
      pageOrders.forEach((o) => state.selectedIds.delete(o.id));
    } else {
      pageOrders.forEach((o) => state.selectedIds.add(o.id));
    }
    renderTable();
  }

  function auditOrder(id) {
    const order = state.orders.find((o) => o.id === id);
    if (!order || !isActionable(order.status)) return;
    const updated = window.OutboundService.audit(id);
    if (updated) {
      loadOrders();
      showListToast('审核成功');
      filterOrders();
    }
  }

  function closeOrder(id) {
    const order = state.orders.find((o) => o.id === id);
    if (!order || !isActionable(order.status)) return;
    if (!window.confirm('确认关闭该出库单吗？')) return;
    const updated = window.OutboundService.close(id);
    if (updated) {
      loadOrders();
      showListToast('关闭成功');
      filterOrders();
    }
  }

  function batchAudit() {
    if (state.selectedIds.size === 0) return;
    const ids = [...state.selectedIds];
    let count = 0;
    ids.forEach((id) => {
      const order = state.orders.find((o) => o.id === id);
      if (order && isActionable(order.status)) {
        const updated = window.OutboundService.audit(id);
        if (updated) count++;
      }
    });
    state.selectedIds.clear();
    loadOrders();
    showListToast(`批量审核完成，共审核 ${count} 条`);
    filterOrders();
  }

  function showListToast(message) {
    let toast = document.getElementById('obListToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'obListToast';
      toast.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);padding:10px 24px;border-radius:4px;font-size:14px;z-index:9999;background:#2ba471;color:#fff;box-shadow:0 2px 8px rgba(0,0,0,0.15);opacity:0;transition:opacity 0.2s;';
      toast.setAttribute('role', 'status');
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.opacity = '1';
    clearTimeout(showListToast.timer);
    showListToast.timer = setTimeout(() => { toast.style.opacity = '0'; }, 2000);
  }

  /* ===== 详情弹窗 ===== */
  function showDetail(id) {
    const order = window.OutboundService.getDetail(id) || state.orders.find((o) => o.id === id);
    if (!order) return;
    const statusClass = getStatusClass(order.status);
    const itemRows = (order.items || []).map((item, index) => `
      <tr>
        <td class="center">${index + 1}</td>
        <td>${escapeHtml(item.productName)}</td>
        <td class="center">${escapeHtml(item.unit)}</td>
        <td class="center">${item.conversionRate ?? '--'}</td>
        <td class="center">${item.currentStock ?? '--'}</td>
        <td class="center">${escapeHtml(item.outboundQty)}</td>
        <td class="center">${escapeHtml(item.unitPrice)}</td>
        <td class="center">${escapeHtml(item.amount)}</td>
        <td>${escapeHtml(item.remark || '--')}</td>
      </tr>
    `).join('');

    document.getElementById('obDetailBody').innerHTML = `
      <div class="processing-detail-section">
        <h3>基本信息</h3>
        <div class="processing-detail-info">
          <div class="info-item"><span class="info-label">出库单号：</span><span class="info-value">${escapeHtml(order.id)}</span></div>
          <div class="info-item"><span class="info-label">出库时间：</span><span class="info-value">${escapeHtml(order.outboundTime)}</span></div>
          <div class="info-item"><span class="info-label">出库类型：</span><span class="info-value">${escapeHtml(order.outboundType)}</span></div>
          <div class="info-item"><span class="info-label">出库金额：</span><span class="info-value">${escapeHtml(order.outboundAmt)}</span></div>
          <div class="info-item"><span class="info-label">仓库：</span><span class="info-value">${escapeHtml(order.warehouseName)}</span></div>
          <div class="info-item"><span class="info-label">往来单位：</span><span class="info-value">${escapeHtml(order.supplierPurchaserCustomerName)}</span></div>
          <div class="info-item"><span class="info-label">关联单号：</span><span class="info-value">${escapeHtml(order.relNo)}</span></div>
          <div class="info-item"><span class="info-label">单据状态：</span><span class="info-value"><span class="status-tag ${statusClass}">${escapeHtml(order.status)}</span></span></div>
          <div class="info-item"><span class="info-label">添加人：</span><span class="info-value">${escapeHtml(order.creator)}</span></div>
          <div class="info-item"><span class="info-label">备注：</span><span class="info-value">${escapeHtml(order.remark || '--')}</span></div>
        </div>
      </div>
      <div class="processing-detail-section">
        <h3>出库明细</h3>
        <table class="processing-detail-table">
          <thead>
            <tr>
              <th class="center">序号</th>
              <th>商品名称</th>
              <th class="center">计量单位</th>
              <th class="center">换算率</th>
              <th class="center">现有库存</th>
              <th class="center">出库数量</th>
              <th class="center">出库单价</th>
              <th class="center">出库金额</th>
              <th>备注</th>
            </tr>
          </thead>
          <tbody>${itemRows || '<tr><td colspan="9">暂无数据</td></tr>'}</tbody>
        </table>
      </div>
    `;
    const modal = document.getElementById('obDetailModal');
    modal.classList.add('is-visible');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeDetail() {
    const modal = document.getElementById('obDetailModal');
    modal.classList.remove('is-visible');
    modal.setAttribute('aria-hidden', 'true');
  }

  /* ===== 表单页 ===== */
  function showFormPage(mode, editId) {
    state.formMode = mode;
    state.editId = editId || null;
    document.getElementById('outboundListPage').classList.add('is-hidden');
    document.getElementById('outboundFormPage').classList.add('is-visible');
    renderFormPage();
  }

  function closeFormPage() {
    document.getElementById('outboundFormPage').classList.remove('is-visible');
    document.getElementById('outboundListPage').classList.remove('is-hidden');
    state.formMode = null;
    state.editId = null;
    state.formItems = [];
  }

  function createEmptyItem() {
    return {
      productCode: '',
      productName: '',
      unit: '',
      conversionRate: '',
      currentStock: '',
      outboundQty: '',
      unitPrice: '',
      remark: ''
    };
  }

  function renderFormPage() {
    const isEdit = state.formMode === 'edit';
    const title = isEdit ? '编辑出库单' : '添加出库单';
    const page = document.getElementById('outboundFormPage');

    let warehouseVal = '';
    let dateVal = '';
    let remarkVal = '';
    let counterpartyVal = '';

    if (isEdit && state.editId) {
      const order = window.OutboundService.getDetail(state.editId);
      if (order) {
        warehouseVal = order.warehouseName || '';
        dateVal = (order.outboundTime || '').replace(' ', 'T').slice(0, 16);
        remarkVal = order.remark || '';
        counterpartyVal = order.supplierPurchaserCustomerName || order.customerName || '';
        state.formItems = (order.items || []).map((item) => ({
          productCode: item.productCode || '',
          productName: item.productName || '',
          unit: item.unit || '',
          conversionRate: item.conversionRate != null ? String(item.conversionRate) : '',
          currentStock: item.currentStock != null ? String(item.currentStock) : '',
          outboundQty: String(item.outboundQty ?? ''),
          unitPrice: String(item.unitPrice ?? ''),
          remark: item.remark || ''
        }));
      }
    }

    if (!isEdit && state.formItems.length === 0) {
      state.formItems = Array.from({ length: 6 }, () => createEmptyItem());
    }

    if (!dateVal) {
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      dateVal = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    }

    page.innerHTML = `
      <div class="warehouse-form-header">
        <button class="back-link" type="button" data-action="back-to-list">
          ${backIcon}
          <span>返回</span>
        </button>
        <h1>${escapeHtml(title)}</h1>
      </div>
      <div class="form-status" id="obFormStatus" role="status"></div>
      <div class="warehouse-form-body" id="obFormBody">
        <div class="filter-section">
          <div class="filter-panel">
            <div class="filter-fields">
              <div class="filter-group">
                <label class="filter-label required" for="obFormWarehouse">仓库</label>
                <select class="filter-select" id="obFormWarehouse">
                  <option value="" disabled hidden>请选择</option>
                  ${warehouses.map((w) => `<option value="${escapeHtml(w)}" ${w === warehouseVal ? 'selected' : ''}>${escapeHtml(w)}</option>`).join('')}
                </select>
              </div>
              <div class="filter-group">
                <label class="filter-label required" for="obFormDate">出库日期</label>
                <input class="filter-input" id="obFormDate" type="datetime-local" value="${escapeHtml(dateVal)}">
              </div>
              <div class="filter-group">
                <label class="filter-label required" for="obFormCounterparty">往来单位</label>
                <input class="filter-input" id="obFormCounterparty" type="text" maxlength="60" placeholder="请输入供应商/采购员/客户" value="${escapeHtml(counterpartyVal)}">
              </div>
            </div>
          </div>
        </div>

        <div class="action-bar">
          <div class="action-main">
            <button class="btn btn-primary btn-sm btn-action" type="button" data-action="add-item-row">${addIcon}批量添加商品</button>
          </div>
          <div class="action-controls"></div>
        </div>

        <div class="table-container">
          <div class="table-wrapper">
            <table class="warehouse-sub-table">
              <thead>
                <tr>
                  <th style="width:61px">序号</th>
                  <th style="width:73px">图片</th>
                  <th style="width:230px">商品名称(计量单位/品牌/规格)</th>
                  <th style="width:98px">计量单位</th>
                  <th style="width:98px">换算率</th>
                  <th style="width:110px">现有库存</th>
                  <th style="width:122px">出库数量</th>
                  <th style="width:122px">出库单价</th>
                  <th style="width:122px">出库金额</th>
                  <th style="width:60px">备注</th>
                  <th style="width:73px">操作</th>
                </tr>
              </thead>
              <tbody id="obFormItemBody"></tbody>
            </table>
          </div>
        </div>

        <div class="ob-form-extra">
          <div class="ob-remark-row">
            <label class="filter-label" for="obFormRemark">备注</label>
            <div class="remark-input-wrap">
              <textarea class="form-control" id="obFormRemark" maxlength="100" rows="3" placeholder="请输入">${escapeHtml(remarkVal)}</textarea>
              <span class="remark-counter" id="obFormRemarkCounter">${remarkVal.length}/100</span>
            </div>
          </div>
          <div class="ob-attachment-row">
            <label class="filter-label">附件</label>
            <div class="form-attachment">
              <button class="attachment-upload-btn" type="button" data-action="upload-attachment">${addIcon}上传附件</button>
              <span class="attachment-tip">支持jpg, jpeg, png, pdf, doc, docx, xls, xlsx, ppt, pptx格式文件；文件大小不超过10M</span>
            </div>
          </div>
        </div>
      </div>
      <div class="warehouse-form-footer">
        <button class="btn" type="button" data-action="save-draft">暂存</button>
        <button class="btn btn-primary" type="button" data-action="save-outbound">保存出库</button>
      </div>
    `;

    renderFormItemTable();
  }

  function renderFormItemTable() {
    const tbody = document.getElementById('obFormItemBody');
    if (!tbody) return;
    tbody.innerHTML = state.formItems.map((item, index) => {
      const product = item.productCode ? findProduct(item.productCode) : null;
      const unit = item.unit || (product ? product.unit : '--');
      const conversionRate = item.conversionRate || (product ? '1' : '--');
      const currentStock = item.currentStock || (product ? '--' : '--');
      const qty = Number(item.outboundQty) || 0;
      const price = Number(item.unitPrice) || 0;
      const amount = (item.outboundQty && item.unitPrice) ? (qty * price).toFixed(2) : '';
      return `
        <tr data-item-index="${index}">
          <td class="center">${index + 1}</td>
          <td class="center"><div class="product-img" style="width:40px;height:40px;line-height:40px;border:1px solid var(--border-light);border-radius:3px;color:var(--text-tertiary);font-size:12px;">图片</div></td>
          <td>
            ${renderProductSelect(item.productCode)}
          </td>
          <td><span class="sub-table-readonly" data-item-cell="unit">${escapeHtml(unit)}</span></td>
          <td><span class="sub-table-readonly" data-item-cell="conversionRate">${escapeHtml(conversionRate)}</span></td>
          <td><span class="sub-table-readonly" data-item-cell="currentStock">${escapeHtml(currentStock)}</span></td>
          <td><input class="sub-table-input" type="number" min="0" step="0.01" placeholder="请输入" data-item-field="qty" value="${escapeHtml(item.outboundQty)}"></td>
          <td><input class="sub-table-input" type="number" min="0" step="0.01" placeholder="请输入" data-item-field="price" value="${escapeHtml(item.unitPrice)}"></td>
          <td><span class="sub-table-readonly" data-item-cell="amount">${escapeHtml(amount)}</span></td>
          <td><input class="sub-table-input" type="text" placeholder="请输入" data-item-field="remark" value="${escapeHtml(item.remark)}"></td>
          <td><button class="row-delete-btn" type="button" data-action="delete-item" data-index="${index}">删除</button></td>
        </tr>
      `;
    }).join('');
  }

  function addFormItemRow() {
    state.formItems.push(createEmptyItem());
    renderFormItemTable();
  }

  function deleteFormItem(index) {
    state.formItems.splice(index, 1);
    renderFormItemTable();
  }

  function onProductChange(selectEl) {
    const row = selectEl.closest('[data-item-index]');
    const index = Number(row.dataset.itemIndex);
    const product = findProduct(selectEl.value);
    if (product) {
      state.formItems[index].productCode = product.code;
      state.formItems[index].productName = product.name;
      state.formItems[index].unit = product.unit;
      state.formItems[index].conversionRate = '1';
      state.formItems[index].currentStock = String(Math.floor(Math.random() * 200 + 20));
      row.querySelector('[data-item-cell="unit"]').textContent = product.unit;
      row.querySelector('[data-item-cell="conversionRate"]').textContent = '1';
      row.querySelector('[data-item-cell="currentStock"]').textContent = state.formItems[index].currentStock;
    } else {
      state.formItems[index].productCode = '';
      state.formItems[index].productName = '';
      state.formItems[index].unit = '';
      state.formItems[index].conversionRate = '';
      state.formItems[index].currentStock = '';
      row.querySelector('[data-item-cell="unit"]').textContent = '--';
      row.querySelector('[data-item-cell="conversionRate"]').textContent = '--';
      row.querySelector('[data-item-cell="currentStock"]').textContent = '--';
    }
  }

  function onItemInput(inputEl) {
    const row = inputEl.closest('[data-item-index]');
    const index = Number(row.dataset.itemIndex);
    const field = inputEl.dataset.itemField;
    if (field === 'qty') state.formItems[index].outboundQty = inputEl.value;
    if (field === 'price') state.formItems[index].unitPrice = inputEl.value;
    if (field === 'remark') state.formItems[index].remark = inputEl.value;
    if (field === 'qty' || field === 'price') {
      const qty = Number(state.formItems[index].outboundQty) || 0;
      const price = Number(state.formItems[index].unitPrice) || 0;
      const amount = (qty && price) ? (qty * price).toFixed(2) : '';
      const amountCell = row.querySelector('[data-item-cell="amount"]');
      if (amountCell) amountCell.textContent = amount;
    }
  }

  function showFormStatus(message, type) {
    const status = document.getElementById('obFormStatus');
    if (!status) return;
    status.textContent = message;
    status.className = `form-status visible ${type}`;
  }

  function collectFormData(targetStatus) {
    const warehouse = document.getElementById('obFormWarehouse').value;
    const date = document.getElementById('obFormDate').value;
    const counterparty = document.getElementById('obFormCounterparty').value.trim();
    const remark = document.getElementById('obFormRemark').value.trim();
    const original = state.formMode === 'edit' ? state.orders.find((o) => o.id === state.editId) : null;

    const validItems = state.formItems
      .filter((item) => item.productCode)
      .map((item) => {
        const product = findProduct(item.productCode);
        const qty = Number(item.outboundQty) || 0;
        const price = Number(item.unitPrice) || 0;
        return {
          productCode: item.productCode,
          productName: item.productName || product?.name || '',
          unit: item.unit || product?.unit || '',
          conversionRate: Number(item.conversionRate) || 1,
          currentStock: Number(item.currentStock) || 0,
          outboundQty: item.outboundQty,
          unitPrice: item.unitPrice,
          amount: (qty * price).toFixed(2),
          remark: item.remark || ''
        };
      });

    const totalAmount = validItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    return {
      warehouseName: warehouse,
      outboundTime: date ? date.replace('T', ' ') + ':00' : '',
      outboundType: original?.outboundType || '销售出库',
      outboundAmt: totalAmount.toFixed(2),
      supplierPurchaserCustomerName: counterparty || original?.supplierPurchaserCustomerName || '',
      relNo: original?.relNo || '--',
      status: targetStatus,
      remark: remark,
      items: validItems
    };
  }

  function validateForm(data) {
    if (!data.warehouseName) return '请选择仓库';
    if (!data.outboundTime) return '请选择出库日期';
    if (window.BusinessRules.isMissing(data.supplierPurchaserCustomerName)) return '请输入供应商/采购员/客户';
    if (!data.items || data.items.length === 0) return '请至少添加一条出库明细';
    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i];
      if (!item.outboundQty) return `第 ${i + 1} 行出库数量不能为空`;
    }
    return null;
  }

  function saveOutbound(targetStatus) {
    const data = collectFormData(targetStatus);
    const error = validateForm(data);
    if (error) {
      showFormStatus(error, 'error');
      return;
    }

    let saved;
    if (state.formMode === 'edit' && state.editId) {
      saved = window.OutboundService.update(state.editId, data);
    } else {
      saved = window.OutboundService.create(data);
    }

    if (!saved) {
      showFormStatus('保存失败，请重试。', 'error');
      return;
    }

    showFormStatus(targetStatus === '待出库' ? '草稿保存成功！' : '出库单保存成功！', 'success');
    loadOrders();
    setTimeout(() => {
      closeFormPage();
      filterOrders();
    }, 800);
  }

  /* ===== 事件绑定 ===== */
  function bindListEvents() {
    const root = document.getElementById('outboundListPage');
    if (!root || root.dataset.bound === 'true') return;
    root.dataset.bound = 'true';

    root.addEventListener('click', (event) => {
      const actionEl = event.target.closest('[data-action]');
      const action = actionEl?.dataset.action;

      if (action === 'toggle-advanced') { toggleAdvanced(); return; }
      if (action === 'query') { filterOrders(); return; }
      if (action === 'reset') { resetFilters(); return; }
      if (action === 'add-outbound') { showFormPage('create'); return; }
      if (action === 'export') { showListToast('导出功能开发中'); return; }
      if (action === 'toggle-row') {
        toggleRow(actionEl.dataset.id);
        return;
      }
      if (action === 'toggle-all') {
        toggleAll();
        return;
      }

      const batchBtn = event.target.closest('#batchAuditBtn');
      if (batchBtn && !batchBtn.disabled) {
        batchAudit();
        return;
      }

      const rowActionEl = event.target.closest('[data-row-action]');
      if (rowActionEl) {
        const rowAction = rowActionEl.dataset.rowAction;
        const id = rowActionEl.dataset.id;
        if (rowAction === 'detail') { window.AppNavigation?.navigate?.(`./outbound-detail.html?id=${encodeURIComponent(id)}`); return; }
        if (rowAction === 'audit') { auditOrder(id); return; }
        if (rowAction === 'edit') { showFormPage('edit', id); return; }
        if (rowAction === 'close') { closeOrder(id); return; }
      }
    });

    // 分页
    document.getElementById('obPageBtns').addEventListener('click', (event) => {
      const btn = event.target.closest('[data-page]');
      if (!btn || btn.disabled) return;
      const page = btn.dataset.page;
      const totalPages = Math.max(1, Math.ceil(state.visibleOrders.length / state.pageSize));
      if (page === 'prev') state.page = Math.max(1, state.page - 1);
      else if (page === 'next') state.page = Math.min(totalPages, state.page + 1);
      else state.page = Number(page);
      renderTable();
    });

    document.getElementById('obPageSize').addEventListener('change', (event) => {
      state.pageSize = Number(event.target.value);
      state.page = 1;
      renderTable();
    });

    document.getElementById('obPageJump').addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        const totalPages = Math.max(1, Math.ceil(state.visibleOrders.length / state.pageSize));
        const target = Math.min(totalPages, Math.max(1, Number(event.target.value) || 1));
        state.page = target;
        event.target.value = target;
        renderTable();
      }
    });

    // 筛选输入框回车查询
    ['obName', 'obRelNo', 'obOrderNo'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('keydown', (event) => {
          if (event.key === 'Enter') filterOrders();
        });
      }
    });

  }

  function bindFormEvents() {
    const root = document.getElementById('outboundFormPage');
    if (!root || root.dataset.bound === 'true') return;
    root.dataset.bound = 'true';

    root.addEventListener('click', (event) => {
      const productToggle = event.target.closest('[data-action="toggle-product-select"]');
      if (productToggle) {
        const select = productToggle.closest('.product-select');
        root.querySelectorAll('.product-select.is-open').forEach((item) => {
          if (item !== select) item.classList.remove('is-open');
        });
        select.classList.toggle('is-open');
        return;
      }

      const productOption = event.target.closest('[data-action="select-product"]');
      if (productOption) {
        const picker = productOption.closest('.product-select');
        const row = picker.closest('[data-item-index]');
        const index = Number(row.dataset.itemIndex);
        const product = findProduct(productOption.dataset.value);
        if (product) {
          state.formItems[index].productCode = product.code;
          state.formItems[index].productName = product.name;
          state.formItems[index].unit = product.unit;
          state.formItems[index].conversionRate = '1';
          state.formItems[index].currentStock = String(Math.floor(Math.random() * 200 + 20));
        } else {
          state.formItems[index].productCode = '';
          state.formItems[index].productName = '';
          state.formItems[index].unit = '';
          state.formItems[index].conversionRate = '';
          state.formItems[index].currentStock = '';
        }
        root.querySelectorAll('.product-select.is-open').forEach((item) => item.classList.remove('is-open'));
        renderFormItemTable();
        return;
      }

      const actionEl = event.target.closest('[data-action]');
      const action = actionEl?.dataset.action;
      if (action === 'back-to-list') { closeFormPage(); return; }
      if (action === 'save-draft') { saveOutbound('待出库'); return; }
      if (action === 'save-outbound') { saveOutbound('待审核'); return; }
      if (action === 'add-item-row') { addFormItemRow(); return; }
      if (action === 'delete-item') {
        const index = Number(actionEl.dataset.index);
        deleteFormItem(index);
        return;
      }
      if (action === 'upload-attachment') {
        showFormStatus('附件上传功能开发中', 'error');
        return;
      }
    });

    root.addEventListener('change', (event) => {
      const productSelect = event.target.closest('[data-item-field="product"]');
      if (productSelect) {
        onProductChange(productSelect);
        return;
      }
    });

    root.addEventListener('input', (event) => {
      const input = event.target.closest('[data-item-field]');
      if (input) {
        onItemInput(input);
        return;
      }
      if (event.target.id === 'obFormRemark') {
        const counter = document.getElementById('obFormRemarkCounter');
        if (counter) counter.textContent = `${event.target.value.length}/100`;
      }
    });
  }

  /* ===== 初始化 ===== */
  window.AppShell.mount({ title: '出库管理', content: listPageHTML });
  outboundDatePicker = window.DateRangePicker.mount({
    container: '#obDateRange',
    displayInput: '#obDateDisplay',
    startInput: '#obDateStart',
    endInput: '#obDateEnd',
    panelId: 'obCalendarPanel'
  });
  loadOrders();
  loadProducts();
  state.visibleOrders = [...state.orders];
  renderTable();
  bindListEvents();
  bindFormEvents();
})();
