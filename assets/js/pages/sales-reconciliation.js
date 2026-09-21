(function () {
  'use strict';

  const downloadIcon = '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12"></path><polyline points="7 10 12 15 17 10"></polyline><path d="M5 21h14"></path></svg>';
  const printIcon = '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9V3h12v6"></path><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><path d="M6 14h12v7H6z"></path><circle cx="18" cy="12" r="1"></circle></svg>';
  const store = window.SalesReconciliationStore;
  const params = new URLSearchParams(window.location.search);
  const pageView = params.get('view') === 'accounts' ? 'accounts' : 'reconciliation';
  const requestedTab = params.get('view');
  const state = {
    tab: requestedTab === 'customer' ? 'customer' : requestedTab === 'statements' ? 'statements' : 'detail',
    advanced: false,
    page: 1,
    pageSize: 20,
    filters: {
      startDate: pageView === 'accounts' ? '2026-08-19' : '2026-04-01',
      endDate: pageView === 'accounts' ? '2026-09-19' : '2026-09-30',
      orderNo: '',
      relatedNo: '',
      status: '',
      feedbackStatus: '',
      customerName: '',
      customerType: '',
      canteen: '',
      documentType: '',
      warehouse: '',
      driver: '',
      route: '',
      reconciler: '',
      parentUnit: ''
    },
    selected: new Set(),
    customerPage: 1,
    customerPageSize: 20,
    customerFilters: {
      startDate: '2026-05-01',
      endDate: '2026-10-31',
      customerName: '',
      canteen: '',
      status: '全部'
    },
    customerSelected: new Set(),
    statementSelected: new Set(),
    statementPage: 1,
    statementPageSize: 20,
    statementFilters: {
      startDate: '2026-08-20',
      endDate: '2026-09-19',
      customerName: ''
    }
  };
  let businessDatePicker = null;
  let statementDatePicker = null;

  const clone = (value) => JSON.parse(JSON.stringify(value));
  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  const money = (value, digits = 2) => {
    const number = Number(value || 0);
    return `${number < 0 ? '−' : ''}${Math.abs(number).toFixed(digits)}`;
  };
  const dateOnly = (value) => String(value || '').slice(0, 10);
  const statusClass = (status) => ({
    未对账: 'is-danger',
    部分对账: 'is-success',
    已对账: 'is-success',
    未结算: 'is-warning',
    部分结算: 'is-warning',
    已结算: 'is-success',
    未反馈: 'is-danger',
    已反馈: 'is-success'
  }[status] || '');

  const appRoot = window.AppShell.mount({
    title: pageView === 'accounts' ? '销售账款' : '销售对账',
    content: '<section class="page-card operations-page order-module-page sales-reconciliation-page" aria-label="销售对账" data-sales-reconciliation-root></section>'
  });
  const page = appRoot.querySelector('[data-sales-reconciliation-root]');

  function toast(message, type = '') {
    page.querySelector('.sales-toast')?.remove();
    const element = document.createElement('div');
    element.className = `sales-toast ${type ? 'is-error' : ''}`;
    element.textContent = message;
    page.appendChild(element);
    window.setTimeout(() => element.remove(), 2200);
  }

  function getState() {
    return store.getState();
  }

  function getRecords() {
    return getState().records.slice();
  }

  function getFilteredRecords() {
    return getRecords().filter((record) => {
      const filters = state.filters;
      const businessDate = dateOnly(record.businessTime);
      if (filters.startDate && businessDate < filters.startDate) return false;
      if (filters.endDate && businessDate > filters.endDate) return false;
      if (filters.orderNo && !String(record.relatedNo || '').toLowerCase().includes(filters.orderNo.toLowerCase())) return false;
      if (filters.relatedNo && !String(record.accountNo || '').toLowerCase().includes(filters.relatedNo.toLowerCase())) return false;
      if (filters.status && record.status !== filters.status) return false;
      if (filters.feedbackStatus && record.feedbackStatus !== filters.feedbackStatus) return false;
      if (filters.customerName && record.customerName !== filters.customerName) return false;
      if (filters.customerType && (record.customerType || '学校') !== filters.customerType) return false;
      if (filters.canteen && record.canteen !== filters.canteen) return false;
      if (filters.documentType && (record.documentType || record.type) !== filters.documentType) return false;
      if (filters.warehouse && record.warehouse !== filters.warehouse) return false;
      if (filters.driver && record.driver !== filters.driver) return false;
      if (filters.route && record.route !== filters.route) return false;
      if (filters.reconciler && record.reconciler !== filters.reconciler) return false;
      if (filters.parentUnit && record.parentUnit !== filters.parentUnit) return false;
      return true;
    });
  }

  function getCustomerAccounts() {
    return getState().customerAccounts || [];
  }

  function getFilteredCustomerAccounts() {
    const filters = state.customerFilters;
    return getCustomerAccounts().filter((record) => {
      const businessDate = dateOnly(record.businessDate);
      if (filters.startDate && businessDate < filters.startDate) return false;
      if (filters.endDate && businessDate > filters.endDate) return false;
      if (filters.customerName && record.customerName !== filters.customerName) return false;
      if (filters.canteen && record.canteen !== filters.canteen) return false;
      if (filters.status && filters.status !== '全部' && record.status !== filters.status) return false;
      return true;
    });
  }

  function renderTabs() {
    return `<div class="operations-tabs order-view-tabs sales-tabs" role="tablist">
      <button type="button" class="operations-tab sales-tab ${state.tab === 'detail' ? 'active' : ''}" data-sales-tab="detail" role="tab" aria-selected="${state.tab === 'detail'}">明细对账</button>
      <button type="button" class="operations-tab sales-tab ${state.tab === 'customer' ? 'active' : ''}" data-sales-tab="customer" role="tab" aria-selected="${state.tab === 'customer'}">客户对账</button>
      <button type="button" class="operations-tab sales-tab ${state.tab === 'statements' ? 'active' : ''}" data-sales-tab="statements" role="tab" aria-selected="${state.tab === 'statements'}">对账单生成记录</button>
    </div>`;
  }

  function renderSalesFilterField(field, index) {
    const isAdvanced = index >= 6;
    const hidden = isAdvanced && !state.advanced ? ' hidden' : '';
    const className = `operations-field${isAdvanced ? ' sales-detail-advanced-filter' : ''}`;
    const label = `<label class="filter-label" for="${field.id}">${escapeHtml(field.label)}${field.help ? `<span class="sales-filter-help" title="${escapeHtml(field.help)}">?</span>` : ''}</label>`;
    if (field.type === 'date') {
      return `<div class="${className} date-range-field"${hidden}>${label}<div class="date-range-picker operations-date-range" id="salesBusinessDateRange"><input class="filter-input date-range-display" id="${field.id}" type="text" readonly placeholder="请选择日期"><input type="hidden" data-date-start value="${escapeHtml(state.filters.startDate)}"><input type="hidden" data-date-end value="${escapeHtml(state.filters.endDate)}"><span class="date-range-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></span></div></div>`;
    }
    const selected = state.filters[field.key] || '';
    if (field.type === 'input') {
      return `<div class="${className}"${hidden}>${label}<input class="filter-input" id="${field.id}" data-filter="${field.key}" placeholder="${escapeHtml(field.placeholder || '')}" value="${escapeHtml(selected)}"></div>`;
    }
    const values = [...new Set((field.values || []).filter(Boolean))];
    const placeholder = field.placeholder || '全部';
    const options = [`<option value=""${selected ? '' : ' selected'}>${escapeHtml(placeholder)}</option>`].concat(values.map((item) => `<option value="${escapeHtml(item)}"${selected === item ? ' selected' : ''}>${escapeHtml(item)}</option>`));
    return `<div class="${className}"${hidden}>${label}<select class="filter-select${selected || placeholder === '全部' ? '' : ' is-placeholder'}" id="${field.id}" data-filter="${field.key}">${options.join('')}</select></div>`;
  }

  function renderFilter() {
    const records = getRecords();
    const values = (key) => [...new Set(records.map((record) => record[key]).filter(Boolean))];
    const fields = [
      { type: 'date', id: 'salesBusinessDateDisplay', label: '业务日期', help: '按业务日期查询' },
      { key: 'status', id: 'salesStatus', label: '对账状态', values: ['未对账', '已对账', '未结算', '部分结算', '已结算'] },
      { key: 'feedbackStatus', id: 'salesFeedbackStatus', label: '客户反馈状态', values: ['未反馈', '已反馈'], placeholder: '请选择' },
      { type: 'input', key: 'orderNo', id: 'salesOrderNo', label: '订单号', placeholder: '请输入订单号' },
      { type: 'input', key: 'relatedNo', id: 'salesRelatedNo', label: '对账单号', placeholder: '请输入对账单号' },
      { key: 'customerName', id: 'salesCustomerName', label: '客户名称', values: values('customerName') },
      { key: 'customerType', id: 'salesCustomerType', label: '客户类型', values: ['学校', '幼儿园', '机关单位'] },
      { key: 'canteen', id: 'salesCanteen', label: '食堂', values: values('canteen'), placeholder: '请选择' },
      { key: 'documentType', id: 'salesDocumentType', label: '单据类型', values: ['销售订单', '销售退货'] },
      { key: 'warehouse', id: 'salesWarehouse', label: '仓库', values: values('warehouse') },
      { key: 'driver', id: 'salesDriver', label: '司机', values: values('driver') },
      { key: 'route', id: 'salesRoute', label: '线路', values: values('route') },
      { key: 'reconciler', id: 'salesReconciler', label: '对账人', values: values('reconciler') },
      { key: 'parentUnit', id: 'salesParentUnit', label: '上级单位', values: ['学校', '机关单位'] }
    ];
    return `<div class="operations-filter filter-section" data-query-filter-manual="true">
      <div class="operations-filter-main">
        <div class="operations-filter-grid">${fields.map((field, index) => renderSalesFilterField(field, index)).join('')}</div>
        <div class="operations-filter-actions">
          <button type="button" class="operations-filter-toggle ${state.advanced ? 'is-active' : ''}" data-sales-advanced>高级筛选<span class="toggle-arrow">▾</span></button>
          <button type="button" class="btn btn-primary btn-sm" data-sales-query>查询</button>
          <button type="button" class="btn btn-sm" data-sales-reset>重置</button>
        </div>
      </div>
    </div>`;
  }

  function renderAccountsFilter() {
    const names = [...new Set(getRecords().map((record) => record.customerName))];
    const canteens = [...new Set(getRecords().map((record) => record.canteen))];
    return `<div class="operations-filter filter-section sales-accounts-filter" data-query-filter-manual="true">
      <div class="operations-filter-main">
        <div class="operations-filter-grid">
          <div class="operations-field date-range-field"><label class="filter-label" for="salesBusinessDateDisplay">发货日期</label><div class="date-range-picker operations-date-range" id="salesBusinessDateRange"><input class="filter-input date-range-display" id="salesBusinessDateDisplay" type="text" readonly placeholder="请选择日期"><input type="hidden" data-date-start value="${escapeHtml(state.filters.startDate)}"><input type="hidden" data-date-end value="${escapeHtml(state.filters.endDate)}"><span class="date-range-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></span></div></div>
          <div class="operations-field"><label class="filter-label" for="salesCustomerName">客户名称</label><select class="filter-select" id="salesCustomerName" data-filter="customerName"><option value="">全部</option>${names.map((item) => `<option value="${escapeHtml(item)}" ${state.filters.customerName === item ? 'selected' : ''}>${escapeHtml(item)}</option>`).join('')}</select></div>
          <div class="operations-field"><label class="filter-label" for="salesCanteen">食堂</label><select class="filter-select" id="salesCanteen" data-filter="canteen"><option value="" disabled hidden selected>请选择</option>${canteens.map((item) => `<option value="${escapeHtml(item)}" ${state.filters.canteen === item ? 'selected' : ''}>${escapeHtml(item)}</option>`).join('')}</select></div>
        </div>
        <div class="operations-filter-actions">
          <button type="button" class="btn btn-primary btn-sm" data-sales-query>查询</button>
          <button type="button" class="btn btn-sm" data-sales-reset>重置</button>
        </div>
      </div>
      <div class="operations-filter-advanced is-visible">
        <div class="operations-filter-grid">
          <div class="operations-field"><label class="filter-label" for="salesParentUnit">上级单位</label><select class="filter-select" id="salesParentUnit"><option value="">全部</option></select></div>
        </div>
      </div>
    </div>`;
  }

  function rowActions(record) {
    const reconcileDisabled = record.status !== '未对账';
    const reverseDisabled = !['已对账', '未结算'].includes(record.status);
    const settleDisabled = !['未结算', '部分结算'].includes(record.status);
    return `<div class="sales-actions">
      <button type="button" class="btn-text" data-sales-action="edit" data-id="${record.id}" ${reconcileDisabled ? 'disabled' : ''}>对账</button>
      <button type="button" class="btn-text" data-sales-action="reverse" data-id="${record.id}" ${reverseDisabled ? 'disabled' : ''}>反对账</button>
      <button type="button" class="btn-text" data-sales-action="settle" data-id="${record.id}" ${settleDisabled ? 'disabled' : ''}>结算</button>
    </div>`;
  }

  function renderReconciliationTable() {
    const allRecords = getFilteredRecords();
    const totalPages = Math.max(1, Math.ceil(allRecords.length / state.pageSize));
    state.page = Math.min(Math.max(state.page, 1), totalPages);
    const records = allRecords.slice((state.page - 1) * state.pageSize, state.page * state.pageSize);
    const pageAmountTotal = records.reduce((sum, record) => sum + Number(record.amount || 0), 0);
    const pageZeroingTotal = records.reduce((sum, record) => sum + Number(record.zeroing || 0), 0);
    const pageReceivableTotal = records.reduce((sum, record) => sum + Number(record.receivable || 0), 0);
    const allAmountTotal = allRecords.reduce((sum, record) => sum + Number(record.amount || 0), 0);
    const allZeroingTotal = allRecords.reduce((sum, record) => sum + Number(record.zeroing || 0), 0);
    const allReceivableTotal = allRecords.reduce((sum, record) => sum + Number(record.receivable || 0), 0);
    const pageButtons = Array.from({ length: totalPages }, (_, index) => `<button type="button" class="page-btn ${state.page === index + 1 ? 'active' : ''}" data-sales-page="${index + 1}" aria-current="${state.page === index + 1 ? 'page' : 'false'}">${index + 1}</button>`).join('');
    return `<div class="operations-toolbar"><div class="operations-toolbar-main"><button type="button" class="btn btn-primary btn-sm" data-sales-toolbar="batch-reconcile">批量对账</button><button type="button" class="btn btn-primary btn-sm" data-sales-toolbar="generate">生成对账单</button><button type="button" class="btn btn-primary btn-sm" data-sales-toolbar="batch-settle" disabled>批量结算</button></div><div class="operations-toolbar-side"><button type="button" class="btn btn-sm standard-list-export-print" data-sales-toolbar="export">${downloadIcon}导出</button></div></div>
      <div class="operations-table-container"><div class="operations-table-wrap"><table class="operations-table sales-table sales-reconciliation-detail-table"><thead><tr>
        <th class="sales-selection"><input type="checkbox" data-sales-select-all aria-label="选择全部"></th><th>对账单号</th><th>关联单号</th><th>对账状态</th><th>客户反馈状态</th><th>食堂</th><th>收货人</th><th>收货手机</th><th>仓库</th><th>单据类型</th><th>对账金额</th><th>抹零金额</th><th>应收金额</th><th>发/退货金额</th><th>业务时间</th><th>司机</th><th>线路</th><th>对账人</th><th>订单备注</th><th>操作</th>
      </tr></thead><tbody>${records.length ? records.map((record) => `<tr data-id="${record.id}">
        <td class="sales-selection"><input type="checkbox" data-sales-select value="${record.id}" ${state.selected.has(record.id) ? 'checked' : ''}></td>
        <td class="sales-account-cell"><button type="button" class="sales-account-link" data-sales-action="detail" data-id="${record.id}">${escapeHtml(record.accountNo)}</button><span class="sales-account-time">${escapeHtml(record.businessTime)}</span></td>
        <td><button type="button" class="btn-text" data-sales-action="detail" data-id="${record.id}">${escapeHtml(record.relatedNo)}</button></td>
        <td><span class="sales-status ${statusClass(record.status)}">${escapeHtml(record.status)}</span></td><td><span class="sales-status ${statusClass(record.feedbackStatus)}">${escapeHtml(record.feedbackStatus)}</span></td>
        <td>${escapeHtml(record.canteen)}</td><td>${escapeHtml(record.receiver)}</td><td>${escapeHtml(record.phone)}</td><td>${escapeHtml(record.warehouse)}</td><td>${escapeHtml(record.type)}</td>
        <td class="sales-money">${money(record.amount)}</td><td class="sales-money">${money(record.zeroing)}</td><td class="sales-money">${money(record.receivable)}</td><td class="sales-money">${money(record.amount)}</td><td class="sales-business-time">${escapeHtml(record.businessTime).replace(' ', '<br>')}</td><td>${escapeHtml(record.driver)}</td><td>${escapeHtml(record.route)}</td><td>${escapeHtml(record.reconciler)}</td><td>${escapeHtml(record.remark || '--')}</td><td class="sales-reconciliation-detail-actions">${rowActions(record)}</td>
      </tr>`).join('') : '<tr><td class="sales-empty" colspan="20">暂无数据</td></tr>'}</tbody><tfoot><tr class="sales-summary-row"><td></td><td colspan="9" class="sales-summary-label">当前页合计</td><td class="sales-money">${money(pageAmountTotal)}</td><td class="sales-money">${money(pageZeroingTotal)}</td><td class="sales-money">${money(pageReceivableTotal)}</td><td class="sales-money">${money(pageAmountTotal)}</td><td colspan="6"></td></tr><tr class="sales-summary-row"><td></td><td colspan="9" class="sales-summary-label">所有页合计</td><td class="sales-money">${money(allAmountTotal)}</td><td class="sales-money">${money(allZeroingTotal)}</td><td class="sales-money">${money(allReceivableTotal)}</td><td class="sales-money">${money(allAmountTotal)}</td><td colspan="6"></td></tr></tfoot></table></div></div><div class="pagination operations-pagination"><span class="page-total">共 ${allRecords.length} 条数据</span><select class="page-size-select" aria-label="每页条数"><option>20 条/页</option></select><div class="page-btns"><button type="button" class="page-btn" data-sales-page="prev" aria-label="上一页" ${state.page === 1 ? 'disabled' : ''}>‹</button>${pageButtons}<button type="button" class="page-btn" data-sales-page="next" aria-label="下一页" ${state.page === totalPages ? 'disabled' : ''}>›</button></div><div class="page-jump"><span>跳至</span><input class="pagination-jump-input" value="${state.page}" aria-label="跳转页码"><span>/ ${totalPages} 页</span></div></div>`;
  }

  function getFilteredStatements() {
    const filters = state.statementFilters;
    return (getState().statements || []).filter((statement) => {
      const generatedDate = dateOnly(statement.generatedAt);
      if (filters.startDate && generatedDate < filters.startDate) return false;
      if (filters.endDate && generatedDate > filters.endDate) return false;
      if (filters.customerName && statement.customerName !== filters.customerName) return false;
      return true;
    });
  }

  function getStatementShippingDates(statement) {
    const dates = Array.isArray(statement.shippingDates) && statement.shippingDates.length
      ? statement.shippingDates
      : (statement.recordIds || [])
      .map((id) => getRecords().find((record) => record.id === id)?.businessTime)
      .filter(Boolean);
    return Array.from(new Set(dates.length ? dates : [statement.startDate || '--']));
  }

  function renderStatementFilter() {
    const names = [...new Set((getState().statements || []).map((statement) => statement.customerName).filter(Boolean))];
    return `<div class="sales-statements-filter" data-query-filter-manual="true">
      <div class="sales-statements-filter-row">
        <div class="sales-statements-field"><label for="salesStatementDateDisplay">对账单生成日期</label><div class="date-range-picker sales-statements-date-range" id="salesStatementDateRange"><input class="date-range-display" id="salesStatementDateDisplay" type="text" readonly placeholder="请选择日期"><input type="hidden" data-date-start value="${escapeHtml(state.statementFilters.startDate)}"><input type="hidden" data-date-end value="${escapeHtml(state.statementFilters.endDate)}"><span class="date-range-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></span></div></div>
        <div class="sales-statements-field"><label for="salesStatementCustomer">客户名称</label><select id="salesStatementCustomer" data-statement-filter="customerName"><option value="">全部</option>${names.map((item) => `<option value="${escapeHtml(item)}" ${state.statementFilters.customerName === item ? 'selected' : ''}>${escapeHtml(item)}</option>`).join('')}</select></div>
        <div class="sales-statements-filter-actions"><button type="button" class="btn btn-primary btn-sm" data-sales-statement-query>查询</button><button type="button" class="btn btn-sm" data-sales-statement-reset>重置</button></div>
      </div>
      <div class="sales-statements-print-row"><button type="button" class="btn btn-sm standard-list-export-print" data-sales-statement-print>${printIcon}<span>打印</span></button></div>
    </div>`;
  }

  function renderStatements() {
    const allStatements = getFilteredStatements();
    const totalPages = Math.max(1, Math.ceil(allStatements.length / state.statementPageSize));
    state.statementPage = Math.min(Math.max(state.statementPage, 1), totalPages);
    const statements = allStatements.slice((state.statementPage - 1) * state.statementPageSize, state.statementPage * state.statementPageSize);
    const pageButtons = Array.from({ length: totalPages }, (_, index) => `<button type="button" class="page-btn ${state.statementPage === index + 1 ? 'active' : ''}" data-statement-page="${index + 1}" aria-current="${state.statementPage === index + 1 ? 'page' : 'false'}">${index + 1}</button>`).join('');
    const rows = statements.map((statement) => {
      const shippingDates = getStatementShippingDates(statement);
      return `<tr data-statement-id="${escapeHtml(statement.id)}"><td class="statement-selection"><input type="checkbox" data-statement-select value="${escapeHtml(statement.id)}" ${state.statementSelected.has(statement.id) ? 'checked' : ''} aria-label="选择对账单"></td><td>${escapeHtml(statement.customerName)}</td><td>${escapeHtml(statement.generatedAt)}</td><td class="statement-shipping-date">${shippingDates.map((date) => escapeHtml(date)).join('<br>')}</td><td class="sales-money">${money(statement.amount)}</td><td class="sales-money">${money(statement.zeroing)}</td><td class="sales-money">${money(statement.receivable)}</td><td><div class="sales-actions statement-actions"><button type="button" class="btn-text" data-sales-statement-action="view" data-id="${escapeHtml(statement.id)}">查看</button><button type="button" class="btn-text" data-sales-statement-action="download" data-id="${escapeHtml(statement.id)}">下载</button><button type="button" class="btn-text is-danger" data-sales-statement-action="delete" data-id="${escapeHtml(statement.id)}">删除</button></div></td></tr>`;
    }).join('');
    return `<div class="sales-statements-view">${renderStatementFilter()}
      <div class="operations-table-container sales-statements-table-container"><div class="operations-table-wrap"><table class="operations-table sales-table sales-records-table sales-statements-table"><thead><tr><th class="statement-selection"><input type="checkbox" data-statement-select-all aria-label="选择全部"></th><th>客户名称</th><th>对账单生成日期</th><th>发货日期</th><th>对账金额合计</th><th>抹零金额合计</th><th>应收金额合计</th><th>操作</th></tr></thead><tbody>${rows || '<tr><td class="sales-empty" colspan="8">暂无对账单生成记录</td></tr>'}</tbody></table></div></div>
      <div class="pagination operations-pagination sales-statements-pagination"><span class="page-total">共 ${allStatements.length} 条数据</span><select class="page-size-select" data-statement-page-size aria-label="每页条数"><option value="20" ${state.statementPageSize === 20 ? 'selected' : ''}>20 条/页</option></select><div class="page-btns"><button type="button" class="page-btn" data-statement-page="prev" aria-label="上一页" ${state.statementPage === 1 ? 'disabled' : ''}>‹</button>${pageButtons}<button type="button" class="page-btn" data-statement-page="next" aria-label="下一页" ${state.statementPage === totalPages ? 'disabled' : ''}>›</button></div><div class="page-jump"><span>跳至</span><input class="pagination-jump-input" data-statement-page-input value="${state.statementPage}" aria-label="跳转页码"><span>/ ${totalPages} 页</span></div></div>
    </div>`;
  }

  function getAccountGroups(records) {
    const groups = new Map();
    records.forEach((record) => {
      const key = `${record.customerName}-${record.canteen}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(record);
    });
    return [...groups.values()];
  }

  function renderAccounts() {
    const records = getFilteredRecords();
    const groups = getAccountGroups(records);
    const rows = groups.map((items, index) => {
      const first = items[0];
      const amount = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
      const zeroing = items.reduce((sum, item) => sum + Number(item.zeroing || 0), 0);
      const receivable = items.reduce((sum, item) => sum + Number(item.receivable || 0), 0);
      const contact = first.receiver && first.phone
        ? `${first.receiver} (${first.phone})`
        : '-- (--)';
      return `<tr><td>${index + 1}</td><td>${escapeHtml(first.customerName)}</td><td>${escapeHtml(first.canteen)}</td><td class="sales-money">${money(amount)}</td><td class="sales-money">${money(zeroing)}</td><td class="sales-money">${money(receivable)}</td><td class="sales-contact">${escapeHtml(contact)}</td></tr>`;
    }).join('');
    const amountTotal = records.reduce((sum, record) => sum + Number(record.amount || 0), 0);
    const zeroingTotal = records.reduce((sum, record) => sum + Number(record.zeroing || 0), 0);
    const receivableTotal = records.reduce((sum, record) => sum + Number(record.receivable || 0), 0);
    const emptyRow = '<tr><td class="sales-empty" colspan="7">暂无数据</td></tr>';
    return `<div class="sales-view sales-accounts-view">${renderAccountsFilter()}
      <div class="operations-toolbar sales-accounts-toolbar"><div class="operations-toolbar-main"></div><div class="operations-toolbar-side"><button type="button" class="btn btn-sm sales-export-button standard-list-export-print" data-sales-toolbar="export"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg><span>导出</span></button></div></div>
      <div class="operations-table-container"><div class="operations-table-wrap"><table class="operations-table sales-table sales-accounts-table"><thead><tr><th>序号</th><th>客户名称</th><th>食堂</th><th>对账金额</th><th>抹零金额</th><th>应收金额</th><th>联系人</th></tr></thead><tbody>${rows || emptyRow}</tbody><tfoot><tr class="sales-summary-row"><td colspan="3" class="sales-summary-label">当前页合计</td><td class="sales-money">${money(amountTotal)}</td><td class="sales-money">${money(zeroingTotal)}</td><td class="sales-money">${money(receivableTotal)}</td><td></td></tr><tr class="sales-summary-row"><td colspan="3" class="sales-summary-label">所有页合计</td><td class="sales-money">${money(amountTotal)}</td><td class="sales-money">${money(zeroingTotal)}</td><td class="sales-money">${money(receivableTotal)}</td><td></td></tr></tfoot></table></div></div>
      <div class="pagination operations-pagination"><span class="page-total">共 ${groups.length} 条数据</span><select class="page-size-select" aria-label="每页条数"><option>20 条/页</option></select><div class="page-btns"><button type="button" class="page-btn" aria-label="上一页" disabled>‹</button><button type="button" class="page-btn active" aria-current="page">1</button><button type="button" class="page-btn" aria-label="下一页" disabled>›</button></div><div class="page-jump"><span>跳至</span><input class="pagination-jump-input" value="1" aria-label="跳转页码"><span>/ 1 页</span></div></div>
    </div>`;
  }

  function customerStatusClass(status) {
    return {
      未对账: 'is-danger',
      部分对账: 'is-success',
      未结算: 'is-warning',
      部分结算: 'is-warning',
      已结算: 'is-success'
    }[status] || '';
  }

  function renderCustomerFilter() {
    const records = getCustomerAccounts();
    const names = [...new Set(records.map((record) => record.customerName))];
    const canteens = [...new Set(records.map((record) => record.canteen))];
    const statuses = ['全部', '未对账', '部分对账', '未结算', '部分结算', '已结算'];
    return `<div class="sales-customer-filter">
      <div class="sales-customer-filter-top">
        <div class="sales-customer-filter-presets">
          <button type="button" class="sales-query-mode" data-customer-query-mode aria-haspopup="listbox" aria-expanded="false">自定义查询<span aria-hidden="true">⌄</span></button>
          <div class="sales-customer-status-tabs" role="tablist" aria-label="对账状态">
            ${statuses.map((status) => `<button type="button" class="sales-customer-status-tab ${state.customerFilters.status === status ? 'active' : ''}" data-customer-status="${status}" role="tab" aria-selected="${state.customerFilters.status === status}">${status}</button>`).join('')}
          </div>
        </div>
        <div class="sales-customer-filter-actions"><button type="button" class="btn btn-primary btn-sm" data-sales-query>查询</button><button type="button" class="btn btn-sm" data-sales-reset>重置</button></div>
      </div>
      <div class="sales-customer-filter-fields">
        <div class="operations-field"><label class="filter-label" for="salesCustomerAccountName">客户名称</label><select class="filter-select" id="salesCustomerAccountName" data-customer-filter="customerName"><option value="">全部</option>${names.map((item) => `<option value="${escapeHtml(item)}" ${state.customerFilters.customerName === item ? 'selected' : ''}>${escapeHtml(item)}</option>`).join('')}</select></div>
        <div class="operations-field"><label class="filter-label" for="salesCustomerAccountCanteen">食堂</label><select class="filter-select" id="salesCustomerAccountCanteen" data-customer-filter="canteen"><option value="">请选择</option>${canteens.map((item) => `<option value="${escapeHtml(item)}" ${state.customerFilters.canteen === item ? 'selected' : ''}>${escapeHtml(item)}</option>`).join('')}</select></div>
        <div class="operations-field date-range-field"><label class="filter-label" for="salesCustomerBusinessDateDisplay">业务日期<span class="sales-filter-help" title="按业务日期查询">?</span></label><div class="date-range-picker operations-date-range" id="salesCustomerBusinessDateRange"><input class="filter-input date-range-display" id="salesCustomerBusinessDateDisplay" type="text" readonly placeholder="请选择日期"><input type="hidden" data-date-start value="${escapeHtml(state.customerFilters.startDate)}"><input type="hidden" data-date-end value="${escapeHtml(state.customerFilters.endDate)}"><span class="date-range-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></span></div></div>
      </div>
    </div>`;
  }

  function customerActionButtons(record) {
    const reconcileDisabled = record.status !== '未对账';
    const reverseDisabled = !['部分对账', '已对账'].includes(record.status);
    const settleDisabled = !['未结算', '部分结算'].includes(record.status);
    return `<div class="sales-actions">
      <button type="button" class="btn-text" data-customer-action="reconcile" data-id="${escapeHtml(record.id)}" ${reconcileDisabled ? 'disabled' : ''}>对账</button>
      <button type="button" class="btn-text" data-customer-action="reverse" data-id="${escapeHtml(record.id)}" ${reverseDisabled ? 'disabled' : ''}>反对账</button>
      <button type="button" class="btn-text" data-customer-action="settle" data-id="${escapeHtml(record.id)}" ${settleDisabled ? 'disabled' : ''}>结算</button>
    </div>`;
  }

  function renderCustomerTable() {
    const allRecords = getFilteredCustomerAccounts();
    const totalPages = Math.max(1, Math.ceil(allRecords.length / state.customerPageSize));
    state.customerPage = Math.min(Math.max(state.customerPage, 1), totalPages);
    const records = allRecords.slice((state.customerPage - 1) * state.customerPageSize, state.customerPage * state.customerPageSize);
    const pageButtons = Array.from({ length: totalPages }, (_, index) => `<button type="button" class="page-btn ${state.customerPage === index + 1 ? 'active' : ''}" data-customer-page="${index + 1}" aria-current="${state.customerPage === index + 1 ? 'page' : 'false'}">${index + 1}</button>`).join('');
    const rows = records.map((record) => {
      const contact = record.contactName && record.contactPhone ? `${record.contactName}(${record.contactPhone})` : record.contactName || (record.contactPhone ? `(${record.contactPhone})` : '');
      return `<tr data-customer-id="${escapeHtml(record.id)}">
        <td class="sales-customer-selection"><input type="checkbox" data-customer-select value="${escapeHtml(record.id)}" ${state.customerSelected.has(record.id) ? 'checked' : ''} aria-label="选择${escapeHtml(record.customerName)}${escapeHtml(record.canteen)}"></td>
        <td>${escapeHtml(record.customerCode)}</td><td>${escapeHtml(record.customerName)}</td><td>${escapeHtml(record.canteen)}</td><td>${escapeHtml(contact)}</td>
        <td><span class="sales-customer-status ${customerStatusClass(record.status)}">${escapeHtml(record.status)}</span></td>
        <td>${escapeHtml(record.documentCount)}</td><td class="sales-customer-money">${money(record.amount, 0)}</td><td class="sales-customer-money">${money(record.zeroing, 0)}</td><td class="sales-customer-money">${money(record.receivable, 0)}</td><td class="sales-customer-money">${money(record.amount, 0)}</td><td class="sales-customer-money">${money(record.received, 0)}</td><td class="sales-customer-money">${money(record.outstanding, 0)}</td>
        <td class="sales-customer-actions">${customerActionButtons(record)}</td>
      </tr>`;
    }).join('');
    return `<div class="operations-toolbar sales-customer-toolbar"><div></div><button type="button" class="sales-export-button standard-list-export-print" data-sales-toolbar="customer-export">${downloadIcon}<span>导出</span></button></div>
      <div class="operations-table-container sales-customer-table-container"><div class="operations-table-wrap"><table class="operations-table sales-customer-table"><thead><tr><th class="sales-customer-selection"><input type="checkbox" data-customer-select-all aria-label="选择全部"></th><th>客户编码</th><th>客户名称</th><th>食堂</th><th>联系人（电话）</th><th>对账状态</th><th>对账单笔数<span class="sales-filter-help" title="对账单笔数">?</span></th><th>对账金额</th><th>对账抹零</th><th>应收金额</th><th>发/退货金额</th><th>已收金额<span class="sales-filter-help" title="已收金额">?</span></th><th>未收金额</th><th>操作</th></tr></thead><tbody>${rows || '<tr><td class="sales-empty" colspan="14">暂无数据</td></tr>'}</tbody></table></div></div>
      <div class="pagination operations-pagination sales-customer-pagination"><span class="page-total">共 ${allRecords.length} 条数据</span><select class="page-size-select" aria-label="每页条数"><option>20 条/页</option></select><div class="page-btns"><button type="button" class="page-btn" data-customer-page="prev" aria-label="上一页" ${state.customerPage === 1 ? 'disabled' : ''}>‹</button>${pageButtons}<button type="button" class="page-btn" data-customer-page="next" aria-label="下一页" ${state.customerPage === totalPages ? 'disabled' : ''}>›</button></div><div class="page-jump"><span>跳至</span><input class="pagination-jump-input" data-customer-page-input value="${state.customerPage}" aria-label="跳转页码"><span>/ ${totalPages} 页</span></div></div>`;
  }

  function renderCustomerReconciliation() {
    return `<div class="sales-view sales-customer-view">${renderCustomerFilter()}${renderCustomerTable()}</div>`;
  }

  function mountBusinessDatePicker(scope = 'detail') {
    const isCustomer = scope === 'customer';
    const dateRange = page.querySelector(isCustomer ? '#salesCustomerBusinessDateRange' : '#salesBusinessDateRange');
    if (!dateRange || !window.DateRangePicker) return;
    businessDatePicker = window.DateRangePicker.create({
      container: dateRange,
      displayInput: dateRange.querySelector('.date-range-display'),
      startInput: dateRange.querySelector('[data-date-start]'),
      endInput: dateRange.querySelector('[data-date-end]'),
      panelId: isCustomer ? 'salesCustomerBusinessDatePickerPanel' : 'salesBusinessDatePickerPanel',
      onChange: ({ startDate, endDate }) => {
        const filters = isCustomer ? state.customerFilters : state.filters;
        filters.startDate = startDate;
        filters.endDate = endDate;
      }
    });
  }

  function mountStatementDatePicker() {
    const dateRange = page.querySelector('#salesStatementDateRange');
    if (!dateRange || !window.DateRangePicker) return;
    statementDatePicker = window.DateRangePicker.create({
      container: dateRange,
      displayInput: dateRange.querySelector('.date-range-display'),
      startInput: dateRange.querySelector('[data-date-start]'),
      endInput: dateRange.querySelector('[data-date-end]'),
      panelId: 'salesStatementDatePickerPanel',
      separator: '   –   ',
      onChange: ({ startDate, endDate }) => {
        state.statementFilters.startDate = startDate;
        state.statementFilters.endDate = endDate;
      }
    });
  }

  function render() {
    businessDatePicker?.destroy?.();
    businessDatePicker = null;
    statementDatePicker?.destroy?.();
    statementDatePicker = null;
    if (pageView === 'accounts') {
      page.innerHTML = renderAccounts();
      mountBusinessDatePicker('detail');
      return;
    }
    page.innerHTML = `${renderTabs()}${state.tab === 'detail' ? `<div class="sales-view">${renderFilter()}${renderReconciliationTable()}</div>` : state.tab === 'customer' ? renderCustomerReconciliation() : renderStatements()}`;
    if (state.tab === 'detail') mountBusinessDatePicker('detail');
    if (state.tab === 'customer') mountBusinessDatePicker('customer');
    if (state.tab === 'statements') mountStatementDatePicker();
  }

  function collectFilters() {
    page.querySelectorAll('[data-filter]').forEach((element) => { state.filters[element.dataset.filter] = element.value.trim(); });
  }

  function collectCustomerFilters() {
    page.querySelectorAll('[data-customer-filter]').forEach((element) => { state.customerFilters[element.dataset.customerFilter] = element.value.trim(); });
  }

  function collectStatementFilters() {
    page.querySelectorAll('[data-statement-filter]').forEach((element) => { state.statementFilters[element.dataset.statementFilter] = element.value.trim(); });
  }

  function selectedRecords() {
    const records = getRecords();
    return records.filter((record) => state.selected.has(record.id));
  }

  function exportRows() {
    const rows = getFilteredRecords();
    const columns = ['对账单号', '关联单号', '对账状态', '客户反馈状态', '食堂', '收货人', '单据类型', '对账金额', '抹零金额', '应收金额', '发/退货金额', '业务时间'];
    const lines = [columns.join(',')].concat(rows.map((record) => [record.accountNo, record.relatedNo, record.status, record.feedbackStatus, record.canteen, record.receiver, record.type, record.amount, record.zeroing, record.receivable, record.amount, record.businessTime].map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')));
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([`\ufeff${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' }));
    link.download = '销售对账.csv';
    link.click();
    URL.revokeObjectURL(link.href);
    toast('导出成功');
  }

  function exportAccountRows() {
    const rows = getAccountGroups(getFilteredRecords()).map((items) => {
      const first = items[0];
      const contact = first.receiver && first.phone ? `${first.receiver}(${first.phone})` : first.receiver || first.phone || '--';
      return [
        first.customerName,
        first.canteen,
        items.reduce((sum, item) => sum + Number(item.amount || 0), 0).toFixed(4),
        items.reduce((sum, item) => sum + Number(item.zeroing || 0), 0).toFixed(4),
        items.reduce((sum, item) => sum + Number(item.receivable || 0), 0).toFixed(4),
        contact
      ];
    });
    const columns = ['客户名称', '食堂', '对账金额', '抹零金额', '应收金额', '联系人'];
    const lines = [columns.join(',')].concat(rows.map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')));
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([`\ufeff${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' }));
    link.download = '销售账款.csv';
    link.click();
    URL.revokeObjectURL(link.href);
    toast('导出成功');
  }

  function exportCustomerRows() {
    const rows = getFilteredCustomerAccounts().map((record) => {
      const contact = record.contactName && record.contactPhone ? `${record.contactName}(${record.contactPhone})` : record.contactName || (record.contactPhone ? `(${record.contactPhone})` : '');
      return [record.customerCode, record.customerName, record.canteen, contact, record.status, record.documentCount, record.amount, record.zeroing, record.receivable, record.amount, record.received, record.outstanding];
    });
    const columns = ['客户编码', '客户名称', '食堂', '联系人（电话）', '对账状态', '对账单笔数', '对账金额', '对账抹零', '应收金额', '发/退货金额', '已收金额', '未收金额'];
    const lines = [columns.join(',')].concat(rows.map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')));
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([`\ufeff${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' }));
    link.download = '客户对账.csv';
    link.click();
    URL.revokeObjectURL(link.href);
    toast('导出成功');
  }

  function handleToolbar(action) {
    if (action === 'customer-export') return exportCustomerRows();
    const selected = selectedRecords();
    if (action === 'export') return pageView === 'accounts' ? exportAccountRows() : exportRows();
    if (!selected.length) return toast('请选择对账单', 'error');
    if (action === 'batch-reconcile') {
      if (new Set(selected.map((record) => record.customerName)).size > 1) return toast('请选择同一客户的对账单', 'error');
      selected.filter((record) => record.status === '未对账').forEach((record) => store.updateRecord(record.id, { status: '已对账' }));
      state.selected.clear();
      render();
      return toast('批量对账成功');
    }
    if (action === 'generate') {
      const customerKeys = new Set(selected.map((record) => `${record.customerName}|${record.canteen}`));
      if (customerKeys.size > 1) return toast('请选择同一客户和食堂的对账单', 'error');
      window.location.href = `./sales-reconciliation-statement.html?ids=${encodeURIComponent(selected.map((record) => record.id).join(','))}`;
    }
  }

  page.addEventListener('click', (event) => {
    const tab = event.target.closest('[data-sales-tab]');
    if (tab) { state.tab = tab.dataset.salesTab; state.page = 1; state.statementPage = 1; state.selected.clear(); state.statementSelected.clear(); render(); return; }
    const customerStatus = event.target.closest('[data-customer-status]');
    if (customerStatus) { state.customerFilters.status = customerStatus.dataset.customerStatus; state.customerPage = 1; state.customerSelected.clear(); render(); return; }
    if (event.target.closest('[data-sales-advanced]')) { state.advanced = !state.advanced; render(); return; }
    const isCustomer = pageView !== 'accounts' && state.tab === 'customer';
    if (event.target.closest('[data-sales-statement-query]')) { collectStatementFilters(); state.statementPage = 1; render(); return; }
    if (event.target.closest('[data-sales-statement-reset]')) { state.statementFilters = { startDate: '', endDate: '', customerName: '' }; state.statementPage = 1; render(); return; }
    if (event.target.closest('[data-sales-statement-print]')) { toast('打印任务已提交'); return; }
    if (event.target.closest('[data-sales-query]')) { isCustomer ? collectCustomerFilters() : collectFilters(); isCustomer ? state.customerPage = 1 : state.page = 1; render(); return; }
    if (event.target.closest('[data-sales-reset]')) {
      if (isCustomer) state.customerFilters = { startDate: '', endDate: '', customerName: '', canteen: '', status: '全部' };
      else state.filters = { startDate: '', endDate: '', orderNo: '', relatedNo: '', status: '', feedbackStatus: '', customerName: '', customerType: '', canteen: '', documentType: '', warehouse: '', driver: '', route: '', reconciler: '', parentUnit: '' };
      isCustomer ? state.customerPage = 1 : state.page = 1;
      render();
      return;
    }
    const customerPageButton = event.target.closest('[data-customer-page]');
    if (customerPageButton) {
      const totalPages = Math.max(1, Math.ceil(getFilteredCustomerAccounts().length / state.customerPageSize));
      const target = customerPageButton.dataset.customerPage;
      state.customerPage = target === 'prev' ? Math.max(1, state.customerPage - 1) : target === 'next' ? Math.min(totalPages, state.customerPage + 1) : Math.min(totalPages, Math.max(1, Number(target) || 1));
      render();
      return;
    }
    const statementPageButton = event.target.closest('[data-statement-page]');
    if (statementPageButton) {
      const totalPages = Math.max(1, Math.ceil(getFilteredStatements().length / state.statementPageSize));
      const target = statementPageButton.dataset.statementPage;
      state.statementPage = target === 'prev' ? Math.max(1, state.statementPage - 1) : target === 'next' ? Math.min(totalPages, state.statementPage + 1) : Math.min(totalPages, Math.max(1, Number(target) || 1));
      render();
      return;
    }
    const pageButton = event.target.closest('[data-sales-page]');
    if (pageButton) {
      const totalPages = Math.max(1, Math.ceil(getFilteredRecords().length / state.pageSize));
      const target = pageButton.dataset.salesPage;
      state.page = target === 'prev' ? Math.max(1, state.page - 1) : target === 'next' ? Math.min(totalPages, state.page + 1) : Math.min(totalPages, Math.max(1, Number(target) || 1));
      render();
      return;
    }
    const toolbar = event.target.closest('[data-sales-toolbar]');
    if (toolbar) { if (isCustomer) collectCustomerFilters(); else collectFilters(); handleToolbar(toolbar.dataset.salesToolbar); return; }
    const statementAction = event.target.closest('[data-sales-statement-action]');
    if (statementAction) {
      const statement = getState().statements.find((item) => item.id === statementAction.dataset.id);
      if (!statement) return;
      const action = statementAction.dataset.salesStatementAction;
      if (action === 'view' || action === 'print') window.open(`./sales-reconciliation-statement.html?id=${encodeURIComponent(statement.id)}`, action === 'print' ? '_blank' : '_self');
      if (action === 'download') {
        const lines = [['客户名称', '对账单生成日期', '发货日期', '对账金额合计', '抹零金额合计', '应收金额合计'], [statement.customerName, statement.generatedAt, getStatementShippingDates(statement).join(' / '), statement.amount, statement.zeroing, statement.receivable]];
        const link = document.createElement('a');
        link.href = URL.createObjectURL(new Blob([`\ufeff${lines.map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')}`], { type: 'text/csv;charset=utf-8' }));
        link.download = `${statement.statementNo || statement.id}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
        toast('下载成功');
      }
      if (action === 'delete') {
        if (store.removeStatement?.(statement.id)) { state.statementSelected.delete(statement.id); render(); toast('删除成功'); }
      }
      return;
    }
    const accountDetail = event.target.closest('[data-account-detail]');
    if (accountDetail) { window.location.href = `./sales-reconciliation-detail.html?id=${encodeURIComponent(accountDetail.dataset.accountDetail)}&view=detail`; return; }
    const customerAction = event.target.closest('[data-customer-action]');
    if (customerAction) {
      const account = store.getCustomerAccount?.(customerAction.closest('[data-customer-id]')?.dataset.customerId);
      if (!account) return;
      const action = customerAction.dataset.customerAction;
      if (action === 'reconcile' || action === 'settle') {
        window.location.href = `./sales-reconciliation-customer-detail.html?customerId=${encodeURIComponent(account.id)}&customerName=${encodeURIComponent(account.customerName)}&canteen=${encodeURIComponent(account.canteen)}`;
        return;
      }
      if (action === 'reverse') {
        store.updateCustomerAccount(account.id, { status: '未对账' });
        state.customerSelected.delete(account.id);
        render();
        toast('已反对账');
      }
      return;
    }
    const actionButton = event.target.closest('[data-sales-action]');
    if (!actionButton || actionButton.disabled) return;
    const record = store.getRecord(actionButton.dataset.id);
    if (!record) return;
    const action = actionButton.dataset.salesAction;
    if (action === 'edit') window.location.href = `./sales-reconciliation-detail.html?id=${encodeURIComponent(record.id)}&view=edit`;
    if (action === 'detail') window.location.href = `./sales-reconciliation-detail.html?id=${encodeURIComponent(record.id)}&view=detail`;
    if (action === 'reverse') { store.updateRecord(record.id, { status: '未对账' }); render(); toast('已反对账'); }
    if (action === 'settle') { store.updateRecord(record.id, { status: '已结算' }); render(); toast('结算成功'); }
  });

  page.addEventListener('change', (event) => {
    if (event.target.matches('[data-customer-select]')) {
      event.target.checked ? state.customerSelected.add(event.target.value) : state.customerSelected.delete(event.target.value);
      return;
    }
    if (event.target.matches('[data-customer-select-all]')) {
      getFilteredCustomerAccounts().forEach((record) => event.target.checked ? state.customerSelected.add(record.id) : state.customerSelected.delete(record.id));
      render();
      return;
    }
    if (event.target.matches('[data-sales-select]')) {
      event.target.checked ? state.selected.add(event.target.value) : state.selected.delete(event.target.value);
      return;
    }
    if (event.target.matches('[data-sales-select-all]')) {
      getFilteredRecords().forEach((record) => event.target.checked ? state.selected.add(record.id) : state.selected.delete(record.id));
      render();
      return;
    }
    if (event.target.matches('[data-statement-select]')) {
      event.target.checked ? state.statementSelected.add(event.target.value) : state.statementSelected.delete(event.target.value);
      return;
    }
    if (event.target.matches('[data-statement-select-all]')) {
      getFilteredStatements().forEach((statement) => event.target.checked ? state.statementSelected.add(statement.id) : state.statementSelected.delete(statement.id));
      render();
      return;
    }
    if (event.target.matches('[data-customer-page-input]')) {
      const totalPages = Math.max(1, Math.ceil(getFilteredCustomerAccounts().length / state.customerPageSize));
      state.customerPage = Math.min(totalPages, Math.max(1, Number(event.target.value) || 1));
      render();
      return;
    }
    if (event.target.matches('[data-statement-page-size]')) {
      state.statementPageSize = Number(event.target.value) || 20;
      state.statementPage = 1;
      render();
      return;
    }
    if (event.target.matches('[data-statement-page-input]')) {
      const totalPages = Math.max(1, Math.ceil(getFilteredStatements().length / state.statementPageSize));
      state.statementPage = Math.min(totalPages, Math.max(1, Number(event.target.value) || 1));
      render();
      return;
    }
    if (event.target.matches('.pagination-jump-input')) {
      const totalPages = Math.max(1, Math.ceil(getFilteredRecords().length / state.pageSize));
      state.page = Math.min(totalPages, Math.max(1, Number(event.target.value) || 1));
      render();
    }
  });

  render();
})();
