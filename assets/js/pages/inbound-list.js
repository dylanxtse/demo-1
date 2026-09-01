(function () {
  const addIcon = '<svg class="icon-svg" viewBox="0 0 24 24" style="width:14px;height:14px;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
  const backIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/><path d="M19 12H9"/></svg>';

  const categories = [
    '全部',
    '主食（米面粉点心类）-粮食类',
    '蛋奶类-蛋奶类二级',
    '食油-食油二级',
    '果蔬-果蔬二级',
    '肉（豆）制品-肉（豆）制品二级',
    '水产品-水产品二级',
    '其他材料-其他二级'
  ];
  const entryTypes = ['全部', '采购入库', '联营采购入库', '其他入库', '订单退货入库', '联营退货入库', '报溢入库', '单位转换入库', '净菜加工入库'];
  const statuses = ['全部', '待入库', '待审核', '已驳回', '已完成', '已关闭'];
  const warehouses = ['全部', '生鲜仓库', '公司市区仓库', '东南区域仓库'];
  const formWarehouses = ['生鲜仓库', '公司市区仓库', '东南区域仓库'];

  /* ===== 页面骨架 HTML ===== */
  const listPageHTML = `
    <div class="page-card warehouse-list-page" id="inboundListPage">
      <div class="filter-section">
        <div class="filter-panel">
          <div class="filter-fields">
            <div class="filter-group date-range-group">
              <label class="filter-label">入库日期</label>
              <div class="date-range-picker" id="inbDateRange">
                <input class="filter-input date-range-display" id="inbDateDisplay" placeholder="请选择日期" readonly>
                <span class="date-range-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></span>
                <input type="hidden" id="inbDateStart">
                <input type="hidden" id="inbDateEnd">
              </div>
            </div>
            <div class="filter-group">
              <label class="filter-label" for="inbCategory">商品分类</label>
              <select class="filter-select" id="inbCategory">
                ${categories.map((c) => `<option value="${c}">${c}</option>`).join('')}
              </select>
            </div>
            <div class="filter-group">
              <label class="filter-label" for="inbProductName">商品名称</label>
              <input class="filter-input" id="inbProductName" placeholder="请输入">
            </div>
          </div>
          <div class="action-controls">
            <button class="filter-advanced-toggle" type="button" data-action="toggle-advanced">
              <span>高级筛选</span>
              <span class="toggle-arrow"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg></span>
            </button>
            <button class="btn btn-primary btn-sm btn-fixed" type="button" data-action="query">查询</button>
            <button class="btn btn-sm btn-fixed" type="button" data-action="reset">重置</button>
          </div>
        </div>

        <div class="filter-advanced" id="inbAdvancedFilter">
          <div class="filter-advanced-grid">
            <div class="filter-group">
              <label class="filter-label" for="inbRelNo">关联单号</label>
              <input class="filter-input" id="inbRelNo" placeholder="请输入">
            </div>
            <div class="filter-group">
              <label class="filter-label" for="inbEntryType">入库类型</label>
              <select class="filter-select" id="inbEntryType">
                ${entryTypes.map((t) => `<option value="${t}">${t}</option>`).join('')}
              </select>
            </div>
            <div class="filter-group">
              <label class="filter-label" for="inbStatus">单据状态</label>
              <select class="filter-select" id="inbStatus">
                ${statuses.map((s) => `<option value="${s}">${s}</option>`).join('')}
              </select>
            </div>
            <div class="filter-group">
              <label class="filter-label" for="inbOrderNo">入库单号</label>
              <input class="filter-input" id="inbOrderNo" placeholder="请输入">
            </div>
            <div class="filter-group">
              <label class="filter-label" for="inbWarehouse">仓库</label>
              <select class="filter-select" id="inbWarehouse">
                ${warehouses.map((w) => `<option value="${w}">${w}</option>`).join('')}
              </select>
            </div>
            <div class="filter-group">
              <label class="filter-label" for="inbNetVegetable">是否净菜</label>
              <select class="filter-select" id="inbNetVegetable">
                <option value="全部">全部</option>
                <option value="净菜">净菜</option>
                <option value="非净菜">非净菜</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div class="action-bar">
        <div class="action-main">
          <button class="btn btn-primary btn-sm" type="button" data-action="add-inbound">添加入库</button>
          <button class="btn btn-sm btn-blue btn-disabled" id="inbBatchAuditBtn" type="button" disabled data-action="batch-audit">批量审核</button>
        </div>
        <div class="action-controls"></div>
      </div>

      <div class="table-container">
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th class="checkbox-cell"><span class="custom-checkbox" role="checkbox" aria-checked="false" data-action="toggle-all"></span></th>
                <th>入库单号</th>
                <th>入库时间</th>
                <th style="min-width:160px">供应商/采购员/客户</th>
                <th>入库类型</th>
                <th>入库金额</th>
                <th>仓库</th>
                <th>关联单号</th>
                <th>期望送货日期</th>
                <th>单据状态</th>
                <th style="min-width:90px">采购负责人</th>
                <th style="min-width:90px">添加人</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody id="inbTableBody"></tbody>
          </table>
        </div>
        <div class="pagination" id="inbPagination"></div>
      </div>

    </div>
  `;

  const formPageHTML = `
    <div class="warehouse-form-page" id="inboundFormPage">
      <div class="warehouse-form-header">
        <button class="back-link" type="button" data-action="back-to-list">
          ${backIcon}<span>返回</span>
        </button>
        <h1 id="inbFormTitle">添加入库单</h1>
      </div>
      <div class="form-status" id="inbFormStatus" role="status"></div>
      <div class="warehouse-form-body" id="inbFormBody"></div>
      <div class="warehouse-form-footer">
        <button class="btn" type="button" data-action="save-draft">暂存</button>
        <button class="btn btn-primary" type="button" data-action="save-inbound">保存入库</button>
      </div>
      <div class="qr-modal" id="inbQrModal" aria-hidden="true">
        <div class="qr-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="inbQrTitle">
          <div class="qr-modal-header">
            <h2 id="inbQrTitle">质检报告</h2>
            <button class="qr-modal-close" type="button" data-action="close-qr" aria-label="关闭">×</button>
          </div>
          <div class="qr-modal-body" id="inbQrBody"></div>
        </div>
      </div>
    </div>
  `;

  const pageContent = listPageHTML + formPageHTML;

  /* ===== 状态 ===== */
  const state = {
    orders: [],
    filteredOrders: [],
    visibleOrders: [],
    selectedIds: new Set(),
    currentPage: 1,
    pageSize: 20,
    pagination: null,
    advancedFilterVisible: false,
    products: [],
    formMode: null,
    editId: null,
    formItems: [],
    formWarehouse: '',
    formEntryTime: '',
    formRemark: '',
    qrRowIndex: null
  };
  let inboundDatePicker = null;
  let inboundEntryDatePicker = null;
  let productionDatePicker = null;

  /* ===== 工具函数 ===== */
  function escapeHtml(value) {
    return window.DomUtils.escapeHtml(value);
  }

  function getStatusClass(status) {
    if (status === 'PENDING' || status === 'PENDING_AUDIT') return 'pending';
    if (status === 'COMPLETED') return 'completed';
    if (status === 'REJECTED') return 'rejected';
    if (status === 'CLOSED') return 'closed';
    return 'pending';
  }

  function findProduct(code) {
    return state.products.find((p) => p.code === code) || null;
  }

  function renderProductSelect(selectedCode) {
    const selectedProduct = selectedCode ? findProduct(selectedCode) : null;
    const selectedDisplay = selectedProduct ? window.DomUtils.formatProductDisplay(selectedProduct, state.products) : '';
    const selectedLabel = selectedProduct
      ? `${selectedProduct.isNetVegetable ? '<span class="net-vegetable-tag">净菜</span>' : ''}<span class="custom-select-text">${escapeHtml(selectedDisplay)}</span>`
      : '<span class="custom-select-text is-placeholder">请选择</span>';
    const options = state.products.map((product) => `
      <div class="custom-select-option ${product.code === selectedCode ? 'selected' : ''}"
        data-action="select-product" data-value="${escapeHtml(product.code)}">
        ${product.isNetVegetable ? '<span class="net-vegetable-tag">净菜</span>' : ''}
        <span>${escapeHtml(window.DomUtils.formatProductDisplay(product, state.products))}</span>
      </div>
    `).join('');
    return `
      <div class="custom-select product-select" data-form-field="productCode">
        <div class="custom-select-trigger" data-action="toggle-product-select">
          <span class="product-select-label">${selectedLabel}</span>
          <svg class="custom-select-arrow" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="custom-select-dropdown product-select-dropdown">${options}</div>
      </div>
    `;
  }

  function loadOrders() {
    state.orders = window.InboundService.getList();
  }

  function loadProducts() {
    state.products = window.InboundService.getProducts();
  }

  /* ===== 列表渲染 ===== */
  function renderTable(orders = state.visibleOrders) {
    state.visibleOrders = orders;
    const tbody = document.getElementById('inbTableBody');
    if (!tbody) return;

    if (orders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="13" style="text-align:center;color:var(--text-tertiary);padding:32px 0;">暂无数据</td></tr>';
    } else {
      tbody.innerHTML = orders.map((order) => {
        const isChecked = state.selectedIds.has(order.id);
        const statusLabel = window.BusinessRules.statusLabel('inboundOrders', order.status);
        const canAudit = order.status === 'PENDING_AUDIT' || order.status === 'PENDING';
        const canEdit = ['PENDING', 'PENDING_AUDIT', 'REJECTED'].includes(order.status);
        const canClose = ['PENDING', 'PENDING_AUDIT', 'REJECTED'].includes(order.status);
        return `
          <tr>
            <td class="checkbox-cell">
              <span class="custom-checkbox ${isChecked ? 'checked' : ''}" role="checkbox" aria-checked="${isChecked}" data-action="toggle-row" data-id="${escapeHtml(order.id)}"></span>
            </td>
            <td><button class="btn-text code-link" type="button" data-row-action="detail" data-id="${escapeHtml(order.id)}">${escapeHtml(order.id)}</button></td>
            <td>${escapeHtml(order.entryTime)}</td>
            <td>${escapeHtml(order.supplierPurchaserCustomerName)}</td>
            <td>${escapeHtml(order.entryType)}</td>
            <td>${escapeHtml(order.entryAmt)}</td>
            <td>${escapeHtml(order.warehouseName)}</td>
            <td>${escapeHtml(order.relNo)}</td>
            <td>${escapeHtml(order.expectedDeliveryDate)}</td>
            <td><span class="status-tag ${getStatusClass(order.status)}">${escapeHtml(statusLabel)}</span></td>
            <td>${escapeHtml(order.purchaserLeaderName)}</td>
            <td>${escapeHtml(order.creator)}</td>
            <td class="action-cell"><div class="operation-actions">
              <button class="btn-text ${!canAudit ? 'disabled' : ''}" type="button" data-row-action="audit" data-id="${escapeHtml(order.id)}" ${!canAudit ? 'disabled' : ''}>审核</button>
              <button class="btn-text ${!canEdit ? 'disabled' : ''}" type="button" data-row-action="edit" data-id="${escapeHtml(order.id)}" ${!canEdit ? 'disabled' : ''}>编辑</button>
              <button class="btn-text ${!canClose ? 'disabled' : ''}" type="button" data-row-action="close" data-id="${escapeHtml(order.id)}" ${!canClose ? 'disabled' : ''}>关闭</button>
            </div></td>
          </tr>
        `;
      }).join('');
    }

    updateBatchButtons();
  }

  function renderPagination() {
    const total = state.filteredOrders.length;
    const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
    if (state.currentPage > totalPages) state.currentPage = totalPages;

    state.pagination?.update({ page: state.currentPage, pageSize: state.pageSize, total });
  }

  function updateVisibleOrders() {
    const start = (state.currentPage - 1) * state.pageSize;
    state.visibleOrders = state.filteredOrders.slice(start, start + state.pageSize);
  }

  function refreshTable() {
    updateVisibleOrders();
    renderTable();
    renderPagination();
  }

  function updateBatchButtons() {
    const btn = document.getElementById('inbBatchAuditBtn');
    if (!btn) return;
    const enabled = state.selectedIds.size > 0;
    btn.disabled = !enabled;
    btn.classList.toggle('btn-disabled', !enabled);
  }

  function updateToggleAllCheckbox() {
    const checkbox = document.querySelector('#inboundListPage [data-action="toggle-all"]');
    if (!checkbox) return;
    const visibleIds = state.visibleOrders.map((o) => o.id);
    const allChecked = visibleIds.length > 0 && visibleIds.every((id) => state.selectedIds.has(id));
    checkbox.classList.toggle('checked', allChecked);
    checkbox.setAttribute('aria-checked', String(allChecked));
  }

  /* ===== 筛选 ===== */
  function filterOrders() {
    const value = (id) => (document.getElementById(id)?.value || '').trim();
    const dateStart = value('inbDateStart');
    const dateEnd = value('inbDateEnd');
    const category = value('inbCategory');
    const productName = value('inbProductName').toLowerCase();
    const relNo = value('inbRelNo').toLowerCase();
    const entryType = value('inbEntryType');
    const status = value('inbStatus');
    const orderNo = value('inbOrderNo').toLowerCase();
    const warehouse = value('inbWarehouse');
    const netVegetable = value('inbNetVegetable');

    state.filteredOrders = state.orders.filter((order) => {
      const entryDate = (order.entryTime || '').slice(0, 10);
      if (dateStart && entryDate < dateStart) return false;
      if (dateEnd && entryDate > dateEnd) return false;
      if (category !== '全部') {
        const hasCategory = (order.items || []).some((item) => {
          const product = findProduct(item.productCode);
          return product && product.category === category;
        });
        if (!hasCategory) return false;
      }
      if (productName) {
        const hasProduct = (order.items || []).some((item) =>
          (item.productName || '').toLowerCase().includes(productName)
        );
        if (!hasProduct) return false;
      }
      if (relNo && !(order.relNo || '').toLowerCase().includes(relNo)) return false;
      if (entryType !== '全部' && order.entryType !== entryType) return false;
      if (status !== '全部' && window.BusinessRules.statusLabel('inboundOrders', order.status) !== status) return false;
      if (orderNo && !(order.id || '').toLowerCase().includes(orderNo)) return false;
      if (warehouse !== '全部' && order.warehouseName !== warehouse) return false;
      if (netVegetable !== '全部') {
        const expected = netVegetable === '净菜';
        const hasMatch = (order.items || []).some((item) => {
          const product = findProduct(item.productCode || item.goodsCode || item.productId);
          const actual = product ? product.isNetVegetable === true : item.isNetVegetable === true;
          return actual === expected;
        });
        if (!hasMatch) return false;
      }
      return true;
    });

    state.currentPage = 1;
    state.selectedIds.clear();
    refreshTable();
    updateToggleAllCheckbox();
  }

  function resetFilters() {
    ['inbDateStart', 'inbDateEnd', 'inbProductName', 'inbRelNo', 'inbOrderNo'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const display = document.getElementById('inbDateDisplay');
    if (display) display.value = '';
    ['inbCategory', 'inbEntryType', 'inbStatus', 'inbWarehouse', 'inbNetVegetable'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = '全部';
    });
    filterOrders();
  }

  function toggleAdvancedFilter() {
    state.advancedFilterVisible = !state.advancedFilterVisible;
    const panel = document.getElementById('inbAdvancedFilter');
    const toggle = document.querySelector('[data-action="toggle-advanced"]');
    if (panel) panel.classList.toggle('is-visible', state.advancedFilterVisible);
    if (toggle) toggle.classList.toggle('is-active', state.advancedFilterVisible);
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
    for (let i = 0; i < startWeekday; i++) cells += '<td class="cal-empty"></td>';
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
    const panel = document.getElementById('inbCalendarPanel');
    if (!panel) return;
    panel.innerHTML = buildCalendarHTML();
    updateDateDisplay();
  }

  function showCalendar() {
    let panel = document.getElementById('inbCalendarPanel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'inbCalendarPanel';
      panel.className = 'calendar-panel cal-dual';
      document.body.appendChild(panel);
    }
    const now = new Date();
    calendarState.leftYear = now.getFullYear();
    calendarState.leftMonth = now.getMonth();
    calendarState.rightYear = now.getFullYear();
    calendarState.rightMonth = (now.getMonth() + 1) % 12;
    if (now.getMonth() === 11) calendarState.rightYear = now.getFullYear() + 1;
    calendarState.startDate = document.getElementById('inbDateStart').value || '';
    calendarState.endDate = document.getElementById('inbDateEnd').value || '';
    positionCalendar(panel);
    panel.classList.add('is-visible');
    renderCalendar();
  }

  function positionCalendar(panel) {
    const input = document.getElementById('inbDateDisplay');
    if (!input || !panel) return;
    const rect = input.getBoundingClientRect();
    panel.style.position = 'fixed';
    panel.style.top = `${rect.bottom + 4}px`;
    panel.style.left = `${rect.left}px`;
  }

  function hideCalendar() {
    const panel = document.getElementById('inbCalendarPanel');
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
        document.getElementById('inbDateStart').value = calendarState.startDate;
        document.getElementById('inbDateEnd').value = calendarState.endDate;
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
    const start = calendarState.startDate || document.getElementById('inbDateStart')?.value || '';
    const end = calendarState.endDate || document.getElementById('inbDateEnd')?.value || '';
    const display = document.getElementById('inbDateDisplay');
    if (display) {
      if (start && end) display.value = `${start} ~ ${end}`;
      else if (start) display.value = `${start} ~`;
      else if (end) display.value = `~ ${end}`;
      else display.value = '';
    }
  }

  /* ===== 行操作：审核 / 关闭 ===== */
  function auditOrder(id) {
    const order = state.orders.find((o) => o.id === id);
    if (!order) return;
    if (!window.confirm(`确认审核入库单「${order.id}」吗？`)) return;
    const result = window.InboundService.audit(id);
    if (result) {
      showListToast('审核成功，入库单已完成');
      loadOrders();
      filterOrders();
    } else {
      showListToast('审核失败，请重试', 'error');
    }
  }

  function closeOrder(id) {
    const order = state.orders.find((o) => o.id === id);
    if (!order) return;
    if (!window.confirm(`确认关闭入库单「${order.id}」吗？`)) return;
    const result = window.InboundService.close(id);
    if (result) {
      showListToast('关闭成功');
      loadOrders();
      filterOrders();
    } else {
      showListToast('关闭失败，请重试', 'error');
    }
  }

  function batchAudit() {
    if (state.selectedIds.size === 0) return;
    const ids = Array.from(state.selectedIds);
    if (!window.confirm(`确认批量审核 ${ids.length} 条入库单吗？`)) return;
    let successCount = 0;
    ids.forEach((id) => {
      const result = window.InboundService.audit(id);
      if (result) successCount++;
    });
    loadOrders();
    state.selectedIds.clear();
    filterOrders();
    showListToast(`批量审核完成，成功 ${successCount} 条`);
  }

  function showListToast(message, type) {
    let toast = document.getElementById('inbListToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'inbListToast';
      toast.style.cssText = 'position:fixed;top:24px;left:50%;transform:translateX(-50%);padding:10px 20px;border-radius:4px;font-size:14px;z-index:9999;transition:opacity 0.3s;opacity:0;';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.background = type === 'error' ? '#fff1f0' : '#e8f8f0';
    toast.style.color = type === 'error' ? '#a61b1b' : '#176b47';
    toast.style.opacity = '1';
    clearTimeout(showListToast.timer);
    showListToast.timer = setTimeout(() => { toast.style.opacity = '0'; }, 2000);
  }

  /* ===== 详情弹窗 ===== */
  function showDetail(id) {
    const order = window.InboundService.getDetail(id) || state.orders.find((o) => o.id === id);
    if (!order) return;
    const statusClass = getStatusClass(order.status);
    const itemRows = (order.items || []).map((item, index) => {
      const productDisplay = window.DomUtils.formatProductDisplay(item, state.products);
      return `
      <tr>
        <td>${index + 1}</td>
        <td><span class="product-display-text" title="${escapeHtml(productDisplay)}">${escapeHtml(productDisplay)}</span></td>
        <td>${escapeHtml(item.unit)}</td>
        <td>${escapeHtml(String(item.conversionRate ?? '--'))}</td>
        <td>${escapeHtml(String(item.expectedQty ?? '--'))}</td>
        <td>${escapeHtml(String(item.damageQty ?? '--'))}</td>
        <td>${escapeHtml(String(item.actualQty ?? '--'))}</td>
        <td>${escapeHtml(String(item.unitPrice ?? '--'))}</td>
        <td>${escapeHtml(String(item.amount ?? '--'))}</td>
        <td>${escapeHtml(item.productionDate || '--')}</td>
        <td>${escapeHtml(item.qualityReport || '--')}</td>
      </tr>
    `;
    }).join('');

    document.getElementById('inbDetailBody').innerHTML = `
      <div class="processing-detail-section">
        <h3>基本信息</h3>
        <div class="processing-detail-info">
          <div class="info-item"><span class="info-label">入库单号：</span><span class="info-value">${escapeHtml(order.id)}</span></div>
          <div class="info-item"><span class="info-label">仓库：</span><span class="info-value">${escapeHtml(order.warehouseName)}</span></div>
          <div class="info-item"><span class="info-label">入库类型：</span><span class="info-value">${escapeHtml(order.entryType)}</span></div>
          <div class="info-item"><span class="info-label">关联单号：</span><span class="info-value">${escapeHtml(order.relNo)}</span></div>
          <div class="info-item"><span class="info-label">入库时间：</span><span class="info-value">${escapeHtml(order.entryTime)}</span></div>
          <div class="info-item"><span class="info-label">供应商/采购员/客户：</span><span class="info-value">${escapeHtml(order.supplierPurchaserCustomerName)}</span></div>
          <div class="info-item"><span class="info-label">采购负责人：</span><span class="info-value">${escapeHtml(order.purchaserLeaderName)}</span></div>
          <div class="info-item"><span class="info-label">制单人：</span><span class="info-value">${escapeHtml(order.creator)}</span></div>
        </div>
      </div>
      <div class="processing-detail-section">
        <h3>入库明细</h3>
        <table class="processing-detail-table">
          <thead>
            <tr>
              <th>序号</th>
              <th>商品名称</th>
              <th>单位</th>
              <th>换算率</th>
              <th>应入库数量</th>
              <th>报损数量</th>
              <th>实际入库数量</th>
              <th>单价</th>
              <th>入库金额</th>
              <th>生产日期</th>
              <th>质检报告</th>
            </tr>
          </thead>
          <tbody>${itemRows || '<tr><td colspan="11" style="text-align:center;color:var(--text-tertiary);">暂无明细</td></tr>'}</tbody>
        </table>
      </div>
    `;
    const modal = document.getElementById('inbDetailModal');
    modal.classList.add('is-visible');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeDetail() {
    const modal = document.getElementById('inbDetailModal');
    modal.classList.remove('is-visible');
    modal.setAttribute('aria-hidden', 'true');
  }

  /* ===== 新增/编辑表单页 ===== */
  function showFormPage(mode, editId) {
    state.formMode = mode;
    state.editId = editId || null;

    const listPage = document.getElementById('inboundListPage');
    const formPage = document.getElementById('inboundFormPage');
    listPage.classList.add('is-hidden');
    formPage.classList.add('is-visible');

    const titleEl = document.getElementById('inbFormTitle');
    titleEl.textContent = mode === 'edit' ? '编辑入库单' : '添加入库单';

    if (mode === 'edit' && editId) {
      const order = window.InboundService.getDetail(editId);
      if (order) {
        state.formWarehouse = order.warehouseName || '';
        state.formEntryTime = order.entryTime || '';
        state.formRemark = order.remark || '';
        state.formItems = (order.items || []).map((item) => ({
          productCode: item.productCode || '',
          productName: item.productName || '',
          unit: item.unit || '',
          conversionRate: item.conversionRate != null ? String(item.conversionRate) : '',
          expectedQty: item.expectedQty != null ? String(item.expectedQty) : '',
          damageQty: item.damageQty != null ? String(item.damageQty) : '',
          actualQty: item.actualQty != null ? String(item.actualQty) : '',
          unitPrice: item.unitPrice != null ? String(item.unitPrice) : '',
          amount: item.amount != null ? String(item.amount) : '',
          productionDate: item.productionDate || '',
          qualityReport: item.qualityReport || '',
          qualityFiles: []
        }));
      }
    } else {
      state.formWarehouse = '';
      state.formEntryTime = '';
      state.formRemark = '';
      state.formItems = createEmptyItems(6);
    }

    renderForm();
  }

  function closeFormPage() {
    const listPage = document.getElementById('inboundListPage');
    const formPage = document.getElementById('inboundFormPage');
    listPage.classList.remove('is-hidden');
    formPage.classList.remove('is-visible');
    state.formMode = null;
    state.editId = null;
    state.formItems = [];
    hideFormStatus();
  }

  function createEmptyItems(count) {
    const items = [];
    for (let i = 0; i < count; i++) {
      items.push({
        productCode: '',
        productName: '',
        unit: '',
        conversionRate: '',
        expectedQty: '',
        damageQty: '',
        actualQty: '',
        unitPrice: '',
        amount: '',
        productionDate: '',
        qualityReport: '',
        qualityFiles: []
      });
    }
    return items;
  }

  function renderForm() {
    const body = document.getElementById('inbFormBody');
    if (!body) return;

    const now = new Date();
    const defaultDate = state.formEntryTime
      ? state.formEntryTime.slice(0, 10)
      : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    body.innerHTML = `
      <div class="filter-section">
        <div class="filter-panel">
          <div class="filter-fields">
            <div class="filter-group">
              <label class="filter-label required" for="inbFormWarehouse">仓库</label>
              <select class="filter-select" id="inbFormWarehouse">
                <option value="" disabled hidden>请选择</option>
                ${formWarehouses.map((w) => `<option value="${w}" ${w === state.formWarehouse ? 'selected' : ''}>${w}</option>`).join('')}
              </select>
            </div>
            <div class="filter-group">
              <label class="filter-label required" for="inbFormEntryTime">入库时间</label>
              <input class="filter-input" id="inbFormEntryTime" type="text" readonly value="${escapeHtml(defaultDate)}">
            </div>
            <div class="filter-group">
              <label class="filter-label required" for="inbFormCounterparty">往来单位</label>
              <input class="filter-input" id="inbFormCounterparty" type="text" maxlength="60" placeholder="请输入供应商/采购员/客户" value="${escapeHtml(state.formMode === 'edit' ? (state.orders.find((order) => order.id === state.editId)?.supplierPurchaserCustomerName || '') : '')}">
            </div>
          </div>
        </div>
      </div>

      <div class="action-bar">
        <div class="action-main">
          <button class="btn btn-primary btn-sm btn-action" type="button" data-action="batch-add-products">批量添加商品</button>
          <button class="btn btn-primary btn-sm btn-action" type="button" data-action="import-inbound">导入入库信息</button>
        </div>
        <div class="action-controls"></div>
      </div>

      <div class="table-container inb-form-table-container">
        <div class="table-wrapper">
          <table class="warehouse-sub-table" id="inbFormTable">
            <thead>
              <tr>
                <th style="width:55px">序号</th>
                <th style="width:66px">图片</th>
                <th style="width:230px">商品名称（计量单位/品牌/规格）</th>
                <th style="width:88px">计量单位</th>
                <th style="width:77px">换算率</th>
                <th style="width:110px">应入库数量</th>
                <th style="width:110px">报损数量</th>
                <th style="width:121px">实际入库数量</th>
                <th style="width:110px">单价</th>
                <th style="width:121px">入库金额</th>
                <th style="width:143px">生产日期</th>
                <th style="width:77px">质检报告</th>
              </tr>
            </thead>
            <tbody id="inbFormTableBody"></tbody>
          </table>
        </div>
        <div class="inb-total-bar">
          <span class="inb-total-label">入库金额合计</span>
          <span class="inb-total-value" id="inbTotalAmount">¥0.00</span>
        </div>
      </div>
    `;

    document.getElementById('inbFormWarehouse').value = state.formWarehouse || '';
    inboundEntryDatePicker?.destroy();
    inboundEntryDatePicker = window.DatePicker.mount({
      input: '#inbFormEntryTime',
      panelId: 'inbFormEntryDatePickerPanel',
      onChange: (date) => { state.formEntryTime = date; }
    });
    renderFormTable();
    updateTotalAmount();
  }

  function renderFormTable() {
    const tbody = document.getElementById('inbFormTableBody');
    if (!tbody) return;
    productionDatePicker?.destroy();
    productionDatePicker = null;

    tbody.innerHTML = state.formItems.map((item, index) => {
      const product = item.productCode ? findProduct(item.productCode) : null;
      const unit = product ? product.unit : (item.unit || '--');
      const qrCount = (item.qualityFiles && item.qualityFiles.length) || 0;

      return `
        <tr data-form-item-index="${index}">
          <td>${index + 1}</td>
          <td><div style="width:40px;height:40px;display:flex;align-items:center;justify-content:center;background:#f5f5f5;border-radius:3px;font-size:12px;color:var(--text-tertiary);">图片</div></td>
          <td>
            ${renderProductSelect(item.productCode)}
          </td>
          <td><span class="sub-table-readonly">${escapeHtml(unit)}</span></td>
          <td><span class="sub-table-readonly" data-form-cell="conversionRate">${escapeHtml(item.conversionRate || '--')}</span></td>
          <td><input class="sub-table-input" type="number" min="0" step="0.01" placeholder="请输入" data-form-field="expectedQty" value="${escapeHtml(item.expectedQty || '')}"></td>
          <td><input class="sub-table-input" type="number" min="0" step="0.01" placeholder="请输入" data-form-field="damageQty" value="${escapeHtml(item.damageQty || '')}"></td>
          <td><span class="sub-table-readonly" data-form-cell="actualQty">${escapeHtml(item.actualQty || '--')}</span></td>
          <td><input class="sub-table-input" type="number" min="0" step="0.01" placeholder="请输入" data-form-field="unitPrice" value="${escapeHtml(item.unitPrice || '')}"></td>
          <td><input class="sub-table-input" type="number" min="0" step="0.01" placeholder="请输入" data-form-field="amount" value="${escapeHtml(item.amount || '')}"></td>
          <td><div class="prod-date-cell" data-prod-date-index="${index}"><input class="sub-table-input prod-date-input" type="text" readonly placeholder="请选择日期" data-form-field="productionDate" value="${escapeHtml(item.productionDate || '')}"><span class="prod-date-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></span></div></td>
          <td><button class="qr-btn" type="button" data-action="open-qr" data-index="${index}">${addIcon}${qrCount > 0 ? `<span class="qr-badge">${qrCount}</span>` : ''}</button></td>
        </tr>
      `;
    }).join('');
  }

  function calculateRowAmount(index) {
    const item = state.formItems[index];
    if (!item) return;
    const expectedQty = Number(item.expectedQty) || 0;
    const damageQty = Number(item.damageQty) || 0;
    item.actualQty = Math.max(expectedQty - damageQty, 0);
    const actualQty = Number(item.actualQty) || 0;
    const unitPrice = Number(item.unitPrice) || 0;
    item.amount = (actualQty * unitPrice).toFixed(2);
    const row = document.querySelector(`[data-form-item-index="${index}"]`);
    if (row) {
      const actualQtyCell = row.querySelector('[data-form-cell="actualQty"]');
      if (actualQtyCell) actualQtyCell.textContent = String(item.actualQty);
      const amountInput = row.querySelector('[data-form-field="amount"]');
      if (amountInput) amountInput.value = item.amount;
    }
    updateTotalAmount();
  }

  function updateTotalAmount() {
    const total = state.formItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const el = document.getElementById('inbTotalAmount');
    if (el) el.textContent = `¥${total.toFixed(2)}`;
  }

  /* ===== 质检报告弹窗 ===== */
  function openQrModal(index) {
    state.qrRowIndex = index;
    const item = state.formItems[index];
    if (!item) return;
    if (!item.qualityFiles) item.qualityFiles = [];

    const body = document.getElementById('inbQrBody');
    const thumbs = item.qualityFiles.map((file, i) => `
      <div class="qr-thumb" data-file-index="${i}">
        <div class="qr-thumb-img">${addIcon}</div>
        <div class="qr-thumb-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</div>
        <button class="qr-thumb-del" type="button" data-action="del-qr-file" data-file-index="${i}">×</button>
      </div>
    `).join('');

    body.innerHTML = `
      <div class="qr-upload-area">
        <div class="qr-thumbs">${thumbs}</div>
        <button class="qr-upload-btn" type="button" data-action="trigger-upload">${addIcon}上传文件</button>
        <input type="file" id="inbQrFileInput" multiple accept="image/*,.pdf,.doc,.docx" style="display:none">
      </div>
      <div class="qr-modal-tip">支持 jpg/png/pdf/doc/docx 格式，单个文件不超过 10M</div>
    `;

    const modal = document.getElementById('inbQrModal');
    modal.classList.add('is-visible');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeQrModal() {
    const modal = document.getElementById('inbQrModal');
    modal.classList.remove('is-visible');
    modal.setAttribute('aria-hidden', 'true');
    state.qrRowIndex = null;
  }

  function handleQrFileUpload(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const item = state.formItems[state.qrRowIndex];
    if (!item) return;
    if (!item.qualityFiles) item.qualityFiles = [];
    files.forEach((file) => {
      item.qualityFiles.push({ name: file.name, size: file.size });
    });
    item.qualityReport = item.qualityFiles.map((f) => f.name).join('; ');
    openQrModal(state.qrRowIndex);
    renderFormTable();
  }

  function deleteQrFile(fileIndex) {
    const item = state.formItems[state.qrRowIndex];
    if (!item || !item.qualityFiles) return;
    item.qualityFiles.splice(fileIndex, 1);
    item.qualityReport = item.qualityFiles.map((f) => f.name).join('; ');
    openQrModal(state.qrRowIndex);
    renderFormTable();
  }

  function addFormRow() {
    state.formItems.push({
      productCode: '',
      productName: '',
      unit: '',
      conversionRate: '',
      expectedQty: '',
      damageQty: '',
      actualQty: '',
      unitPrice: '',
      amount: '',
      productionDate: '',
      qualityReport: '',
      qualityFiles: []
    });
    renderFormTable();
  }

  function deleteFormRow(index) {
    if (state.formItems.length <= 1) {
      window.alert('至少保留一条明细');
      return;
    }
    state.formItems.splice(index, 1);
    renderFormTable();
  }

  function batchAddProducts() {
    addFormRow();
  }

  function showFormStatus(message, type) {
    const status = document.getElementById('inbFormStatus');
    if (!status) return;
    status.textContent = message;
    status.className = `form-status visible ${type}`;
  }

  function hideFormStatus() {
    const status = document.getElementById('inbFormStatus');
    if (!status) return;
    status.className = 'form-status';
    status.textContent = '';
  }

  function collectFormData(targetStatus) {
    const warehouse = document.getElementById('inbFormWarehouse').value;
    const entryTime = document.getElementById('inbFormEntryTime').value;
    const counterparty = document.getElementById('inbFormCounterparty').value.trim();

    const items = state.formItems
      .filter((item) => item.productCode)
      .map((item) => {
        const product = findProduct(item.productCode);
        const actualQty = Number(item.actualQty) || 0;
        const unitPrice = Number(item.unitPrice) || 0;
        return {
          productCode: item.productCode,
          productName: product ? product.name : item.productName,
          unit: product ? product.unit : item.unit,
          conversionRate: item.conversionRate || '',
          expectedQty: Number(item.expectedQty) || 0,
          damageQty: Number(item.damageQty) || 0,
          actualQty: actualQty,
          unitPrice: item.unitPrice || '0',
          amount: (actualQty * unitPrice).toFixed(2),
          productionDate: item.productionDate || '',
          qualityReport: item.qualityReport || ''
        };
      });

    const totalAmount = items.reduce((sum, item) => sum + Number(item.amount), 0).toFixed(2);
    const original = state.formMode === 'edit' ? state.orders.find((o) => o.id === state.editId) : null;

    return {
      warehouseName: warehouse,
      entryTime: entryTime || '',
      remark: state.formRemark || '',
      items,
      entryAmt: totalAmount,
      status: targetStatus,
      entryType: original?.entryType || '采购入库',
      supplierPurchaserCustomerName: counterparty || original?.supplierPurchaserCustomerName || '',
      relNo: original?.relNo || '--',
      expectedDeliveryDate: original?.expectedDeliveryDate || '--',
      purchaserLeaderName: original?.purchaserLeaderName || '杨',
      creator: original?.creator || '杨'
    };
  }

  function validateFormData(data) {
    if (!data.warehouseName) {
      showFormStatus('请选择仓库', 'error');
      return false;
    }
    if (!data.entryTime) {
      showFormStatus('请选择入库时间', 'error');
      return false;
    }
    if (window.BusinessRules.isMissing(data.supplierPurchaserCustomerName)) {
      showFormStatus('请输入供应商/采购员/客户', 'error');
      return false;
    }
    if (!data.items || data.items.length === 0) {
      showFormStatus('请至少添加一条入库明细', 'error');
      return false;
    }
    return true;
  }

  function saveInbound(targetStatus) {
    const data = collectFormData(targetStatus);
    if (!validateFormData(data)) return;

    let saved;
    if (state.formMode === 'edit' && state.editId) {
      saved = window.InboundService.update(state.editId, data);
    } else {
      saved = window.InboundService.create(data);
    }

    if (!saved) {
      showFormStatus('保存失败，请重试', 'error');
      return;
    }

    showFormStatus(targetStatus === '已完成' ? '入库单保存成功！' : '暂存成功！', 'success');
    loadOrders();
    setTimeout(() => {
      closeFormPage();
      filterOrders();
    }, 800);
  }

  /* ===== 生产日期自定义日历选择器 ===== */
  const prodCalState = { year: 0, month: 0, selectedDate: '', cellIndex: -1 };

  function buildProdCalHTML() {
    const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    const y = prodCalState.year, m = prodCalState.month;
    const firstDay = new Date(y, m, 1);
    const lastDay = new Date(y, m + 1, 0);
    const startWeekday = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    let cells = '';
    for (let i = 0; i < startWeekday; i++) cells += '<td class="pcal-empty"></td>';
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      let cls = 'pcal-day';
      if (ds === todayStr) cls += ' pcal-today';
      if (ds === prodCalState.selectedDate) cls += ' pcal-selected';
      cells += `<td class="${cls}" data-prod-cal-date="${ds}">${d}</td>`;
    }
    const totalCells = startWeekday + daysInMonth;
    const remaining = (7 - (totalCells % 7)) % 7;
    for (let i = 0; i < remaining; i++) cells += '<td class="pcal-empty"></td>';

    const cellArr = cells.split('</td>');
    const rows = [];
    for (let i = 0; i < cellArr.length - 1; i += 7) {
      rows.push('<tr>' + cellArr.slice(i, i + 7).join('</td>') + '</td></tr>');
    }

    return `
      <div class="pcal-header">
        <button class="pcal-nav" type="button" data-action="prod-cal-prev">‹</button>
        <span class="pcal-title">${y}年 ${monthNames[m]}</span>
        <button class="pcal-nav" type="button" data-action="prod-cal-next">›</button>
      </div>
      <table class="pcal-table"><thead><tr>${weekDays.map((w) => `<th>${w}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>
      <div class="pcal-footer">
        <button class="btn btn-sm" type="button" data-action="prod-cal-clear">清空</button>
        <button class="btn btn-primary btn-sm" type="button" data-action="prod-cal-confirm">确定</button>
      </div>
    `;
  }

  function openProdDatePicker(cell) {
    const index = Number(cell.dataset.prodDateIndex);
    const item = state.formItems[index];
    const input = cell.querySelector('.prod-date-input');
    if (!item || !input) return;
    if (productionDatePicker && productionDatePicker.input === input) {
      productionDatePicker.open();
      return;
    }
    productionDatePicker?.destroy();
    productionDatePicker = window.DatePicker.mount({
      input,
      panelId: 'prodDatePickerPanel',
      onChange: (date) => { item.productionDate = date; input.value = date; }
    });
    productionDatePicker.input = input;
    productionDatePicker.open();
  }

  function renderProdCalBody() {
    const panel = document.getElementById('prodDatePickerPanel');
    if (!panel) return;
    panel.innerHTML = buildProdCalHTML();
  }

  function hideProdDatePicker() {
    const panel = document.getElementById('prodDatePickerPanel');
    if (panel) panel.classList.remove('is-visible');
  }

  function shiftProdCalMonth(dir) {
    if (dir === 'prev') {
      prodCalState.month--;
      if (prodCalState.month < 0) { prodCalState.month = 11; prodCalState.year--; }
    } else {
      prodCalState.month++;
      if (prodCalState.month > 11) { prodCalState.month = 0; prodCalState.year++; }
    }
    renderProdCalBody();
  }

  function clearProdDate() {
    prodCalState.selectedDate = '';
    if (prodCalState.cellIndex >= 0 && state.formItems[prodCalState.cellIndex]) {
      state.formItems[prodCalState.cellIndex].productionDate = '';
      const input = document.querySelector(`[data-prod-date-index="${prodCalState.cellIndex}"] .prod-date-input`);
      if (input) input.value = '';
    }
    renderProdCalBody();
  }

  function confirmProdDate() {
    if (prodCalState.cellIndex >= 0 && state.formItems[prodCalState.cellIndex]) {
      state.formItems[prodCalState.cellIndex].productionDate = prodCalState.selectedDate;
      const input = document.querySelector(`[data-prod-date-index="${prodCalState.cellIndex}"] .prod-date-input`);
      if (input) input.value = prodCalState.selectedDate;
    }
    hideProdDatePicker();
  }

  /* ===== 表单事件绑定 ===== */
  function bindFormEvents() {
    const formPage = document.getElementById('inboundFormPage');
    if (!formPage || formPage.dataset.bound === 'true') return;
    formPage.dataset.bound = 'true';

    formPage.addEventListener('click', (event) => {
      const dateCell = event.target.closest('.prod-date-cell');
      if (dateCell) {
        openProdDatePicker(dateCell);
        return;
      }

      const productToggle = event.target.closest('[data-action="toggle-product-select"]');
      if (productToggle) {
        const select = productToggle.closest('.product-select');
        formPage.querySelectorAll('.product-select.is-open').forEach((item) => {
          if (item !== select) item.classList.remove('is-open');
        });
        select.classList.toggle('is-open');
        return;
      }

      const productOption = event.target.closest('[data-action="select-product"]');
      if (productOption) {
        const picker = productOption.closest('.product-select');
        const row = picker.closest('[data-form-item-index]');
        const index = Number(row.dataset.formItemIndex);
        const product = findProduct(productOption.dataset.value);
        if (product) {
          state.formItems[index].productCode = product.code;
          state.formItems[index].productName = product.name;
          state.formItems[index].unit = product.unit;
          if (!state.formItems[index].unitPrice) state.formItems[index].unitPrice = product?.marketPrice || '';
        } else {
          state.formItems[index].productCode = '';
          state.formItems[index].productName = '';
          state.formItems[index].unit = '';
        }
        picker.classList.remove('is-open');
        calculateRowAmount(index);
        renderFormTable();
        return;
      }

      const actionEl = event.target.closest('[data-action]');
      if (!actionEl) return;
      const action = actionEl.dataset.action;
      if (action === 'back-to-list') { closeFormPage(); return; }
      if (action === 'save-draft') { saveInbound('待审核'); return; }
      if (action === 'save-inbound') { saveInbound('已完成'); return; }
      if (action === 'batch-add-products') { return; }
      if (action === 'import-inbound') { return; }
      if (action === 'open-qr') {
        const index = Number(actionEl.dataset.index);
        openQrModal(index);
        return;
      }
      if (action === 'close-qr') { closeQrModal(); return; }
      if (action === 'trigger-upload') {
        const fileInput = document.getElementById('inbQrFileInput');
        if (fileInput) fileInput.click();
        return;
      }
      if (action === 'del-qr-file') {
        const fileIndex = Number(actionEl.dataset.fileIndex);
        deleteQrFile(fileIndex);
        return;
      }
      if (action === 'prod-cal-prev') { shiftProdCalMonth('prev'); return; }
      if (action === 'prod-cal-next') { shiftProdCalMonth('next'); return; }
      if (action === 'prod-cal-clear') { clearProdDate(); return; }
      if (action === 'prod-cal-confirm') { confirmProdDate(); return; }
    });

    document.addEventListener('click', (event) => {
      const panel = document.getElementById('prodDatePickerPanel');
      if (!panel || !panel.classList.contains('is-visible')) return;
      if (!event.target.closest('.prod-date-cell') && !event.target.closest('#prodDatePickerPanel')) {
        hideProdDatePicker();
      }
    });

    formPage.addEventListener('input', (event) => {
      const fieldEl = event.target.closest('[data-form-field]');
      if (!fieldEl) return;
      const field = fieldEl.dataset.formField;
      if (field === 'productCode') return;
      if (field === 'productionDate') return;
      const row = fieldEl.closest('[data-form-item-index]');
      const index = Number(row.dataset.formItemIndex);
      if (state.formItems[index]) {
        state.formItems[index][field] = fieldEl.value;
        if (field === 'expectedQty' || field === 'damageQty' || field === 'unitPrice') {
          calculateRowAmount(index);
        }
        if (field === 'amount') {
          updateTotalAmount();
        }
      }
    });

    formPage.addEventListener('change', (event) => {
      if (event.target.id === 'inbQrFileInput') {
        handleQrFileUpload(event);
        return;
      }
      const select = event.target.closest('[data-form-field="productCode"]');
      if (select) {
        const row = select.closest('[data-form-item-index]');
        const index = Number(row.dataset.formItemIndex);
        const product = findProduct(select.value);
        if (product) {
          state.formItems[index].productCode = product.code;
          state.formItems[index].productName = product.name;
          state.formItems[index].unit = product.unit;
          if (!state.formItems[index].unitPrice) {
            state.formItems[index].unitPrice = product?.marketPrice || '';
          }
          calculateRowAmount(index);
        } else {
          state.formItems[index].productCode = '';
          state.formItems[index].productName = '';
          state.formItems[index].unit = '';
        }
        renderFormTable();
        return;
      }
    });

    const qrModal = document.getElementById('inbQrModal');
    if (qrModal) {
      qrModal.addEventListener('click', (event) => {
        if (event.target === event.currentTarget) closeQrModal();
      });
    }
  }

  /* ===== 列表事件绑定 ===== */
  function bindListEvents() {
    const root = document.getElementById('inboundListPage');
    if (!root || root.dataset.bound === 'true') return;
    root.dataset.bound = 'true';

    root.addEventListener('click', (event) => {
      const actionEl = event.target.closest('[data-action]');
      if (actionEl) {
        const action = actionEl.dataset.action;
        if (action === 'query') { filterOrders(); return; }
        if (action === 'reset') { resetFilters(); return; }
        if (action === 'toggle-advanced') { toggleAdvancedFilter(); return; }
        if (action === 'add-inbound') { showFormPage('add'); return; }
        if (action === 'batch-audit') { batchAudit(); return; }
        if (action === 'toggle-all') {
          const checkbox = event.target.closest('.custom-checkbox');
          const checked = checkbox.classList.toggle('checked');
          checkbox.setAttribute('aria-checked', String(checked));
          document.querySelectorAll('#inbTableBody .custom-checkbox').forEach((rowCheckbox) => {
            const rowId = rowCheckbox.dataset.id;
            rowCheckbox.classList.toggle('checked', checked);
            rowCheckbox.setAttribute('aria-checked', String(checked));
            if (checked) {
              state.selectedIds.add(rowId);
            } else {
              state.selectedIds.delete(rowId);
            }
          });
          updateBatchButtons();
          return;
        }
        if (action === 'toggle-row') {
          const checkbox = event.target.closest('.custom-checkbox');
          const rowId = checkbox.dataset.id;
          const checked = checkbox.classList.toggle('checked');
          checkbox.setAttribute('aria-checked', String(checked));
          if (checked) {
            state.selectedIds.add(rowId);
          } else {
            state.selectedIds.delete(rowId);
          }
          updateBatchButtons();
          updateToggleAllCheckbox();
          return;
        }
      }

      const rowActionEl = event.target.closest('[data-row-action]');
      if (rowActionEl) {
        const rowAction = rowActionEl.dataset.rowAction;
        const id = rowActionEl.dataset.id;
        if (rowAction === 'detail') { window.location.href = `./inbound-detail.html?id=${encodeURIComponent(id)}`; return; }
        if (rowAction === 'audit') { auditOrder(id); return; }
        if (rowAction === 'edit') { showFormPage('edit', id); return; }
        if (rowAction === 'close') { closeOrder(id); return; }
      }
    });

    ['inbProductName', 'inbRelNo', 'inbOrderNo'].forEach((id) => {
      const input = document.getElementById(id);
      if (input) {
        input.addEventListener('keydown', (event) => {
          if (event.key === 'Enter') filterOrders();
        });
      }
    });

  }

  /* ===== 初始化 ===== */
  window.AppShell.mount({ title: '入库管理', content: pageContent });
  inboundDatePicker = window.DateRangePicker.mount({
    container: '#inbDateRange',
    displayInput: '#inbDateDisplay',
    startInput: '#inbDateStart',
    endInput: '#inbDateEnd',
    panelId: 'inbCalendarPanel'
  });

  state.pagination = window.Pagination.create({
    container: '#inbPagination',
    page: state.currentPage,
    pageSize: state.pageSize,
    total: state.filteredOrders.length,
    pageSizeOptions: [20, 50, 100],
    onChange: ({ page, pageSize }) => {
      state.currentPage = page;
      state.pageSize = pageSize;
      refreshTable();
      updateToggleAllCheckbox();
    }
  });

  loadProducts();
  loadOrders();
  state.filteredOrders = [...state.orders];
  refreshTable();
  bindListEvents();
  bindFormEvents();
})();
