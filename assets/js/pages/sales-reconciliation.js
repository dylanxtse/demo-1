(function () {
  'use strict';

  const store = window.SalesReconciliationStore;
  const params = new URLSearchParams(window.location.search);
  const pageView = params.get('view') === 'accounts' ? 'accounts' : 'reconciliation';
  const state = {
    tab: 'reconciliation',
    advanced: false,
    filters: {
      startDate: pageView === 'accounts' ? '2026-07-25' : '2026-07-26',
      endDate: '2026-08-25',
      relatedNo: '',
      status: '',
      customerName: '',
      canteen: ''
    },
    selected: new Set()
  };
  let businessDatePicker = null;

  const clone = (value) => JSON.parse(JSON.stringify(value));
  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  const money = (value, digits = 4) => {
    const number = Number(value || 0);
    return `${number < 0 ? '−' : ''}${Math.abs(number).toFixed(digits)}`;
  };
  const dateOnly = (value) => String(value || '').slice(0, 10);
  const statusClass = (status) => ({
    未对账: 'is-danger',
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
    return getState().records.slice().sort((a, b) => String(b.businessTime).localeCompare(String(a.businessTime)));
  }

  function getFilteredRecords() {
    return getRecords().filter((record) => {
      const filters = state.filters;
      const businessDate = dateOnly(record.businessTime);
      if (filters.startDate && businessDate < filters.startDate) return false;
      if (filters.endDate && businessDate > filters.endDate) return false;
      if (filters.relatedNo && !`${record.relatedNo} ${record.accountNo}`.toLowerCase().includes(filters.relatedNo.toLowerCase())) return false;
      if (filters.status && record.status !== filters.status) return false;
      if (filters.customerName && record.customerName !== filters.customerName) return false;
      if (filters.canteen && record.canteen !== filters.canteen) return false;
      return true;
    });
  }

  function renderTabs() {
    return `<div class="operations-tabs order-view-tabs sales-tabs" role="tablist">
      <button type="button" class="operations-tab sales-tab ${state.tab === 'reconciliation' ? 'active' : ''}" data-sales-tab="reconciliation" role="tab" aria-selected="${state.tab === 'reconciliation'}">对账</button>
      <button type="button" class="operations-tab sales-tab ${state.tab === 'statements' ? 'active' : ''}" data-sales-tab="statements" role="tab" aria-selected="${state.tab === 'statements'}">对账单生成记录</button>
    </div>`;
  }

  function renderFilter() {
    const names = [...new Set(getRecords().map((record) => record.customerName))];
    const canteens = [...new Set(getRecords().map((record) => record.canteen))];
    return `<div class="operations-filter filter-section">
      <div class="operations-filter-main">
        <div class="operations-filter-grid">
          <div class="operations-field date-range-field"><label class="filter-label" for="salesBusinessDateDisplay">业务时间</label><div class="date-range-picker operations-date-range" id="salesBusinessDateRange"><input class="filter-input date-range-display" id="salesBusinessDateDisplay" type="text" readonly placeholder="请选择日期"><input type="hidden" data-date-start value="${escapeHtml(state.filters.startDate)}"><input type="hidden" data-date-end value="${escapeHtml(state.filters.endDate)}"><span class="date-range-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></span></div></div>
          <div class="operations-field"><label class="filter-label" for="salesRelatedNo">业务单号</label><input class="filter-input" id="salesRelatedNo" data-filter="relatedNo" placeholder="请输入订单号或退货单号" value="${escapeHtml(state.filters.relatedNo)}"></div>
          <div class="operations-field"><label class="filter-label" for="salesStatus">对账状态</label><select class="filter-select" id="salesStatus" data-filter="status"><option value="">全部</option>${['未对账', '已对账', '未结算', '部分结算', '已结算'].map((item) => `<option value="${item}" ${state.filters.status === item ? 'selected' : ''}>${item}</option>`).join('')}</select></div>
        </div>
        <div class="operations-filter-actions">
          <button type="button" class="operations-filter-toggle ${state.advanced ? 'is-active' : ''}" data-sales-advanced>高级筛选<span class="toggle-arrow">▾</span></button>
          <button type="button" class="btn btn-primary btn-sm" data-sales-query>查询</button>
          <button type="button" class="btn btn-sm" data-sales-reset>重置</button>
        </div>
      </div>
      <div class="operations-filter-advanced ${state.advanced ? 'is-visible' : ''}">
        <div class="operations-filter-grid">
          <div class="operations-field"><label class="filter-label" for="salesCustomerName">客户名称</label><select class="filter-select" id="salesCustomerName" data-filter="customerName"><option value="">全部</option>${names.map((item) => `<option value="${escapeHtml(item)}" ${state.filters.customerName === item ? 'selected' : ''}>${escapeHtml(item)}</option>`).join('')}</select></div>
          <div class="operations-field"><label class="filter-label" for="salesCanteen">食堂</label><select class="filter-select" id="salesCanteen" data-filter="canteen"><option value="">全部</option>${canteens.map((item) => `<option value="${escapeHtml(item)}" ${state.filters.canteen === item ? 'selected' : ''}>${escapeHtml(item)}</option>`).join('')}</select></div>
        </div>
      </div>
    </div>`;
  }

  function renderAccountsFilter() {
    const names = [...new Set(getRecords().map((record) => record.customerName))];
    const canteens = [...new Set(getRecords().map((record) => record.canteen))];
    return `<div class="operations-filter filter-section sales-accounts-filter">
      <div class="operations-filter-main">
        <div class="operations-filter-grid">
          <div class="operations-field date-range-field"><label class="filter-label" for="salesBusinessDateDisplay">发货日期</label><div class="date-range-picker operations-date-range" id="salesBusinessDateRange"><input class="filter-input date-range-display" id="salesBusinessDateDisplay" type="text" readonly placeholder="请选择日期"><input type="hidden" data-date-start value="${escapeHtml(state.filters.startDate)}"><input type="hidden" data-date-end value="${escapeHtml(state.filters.endDate)}"><span class="date-range-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></span></div></div>
          <div class="operations-field"><label class="filter-label" for="salesCustomerName">客户名称</label><select class="filter-select" id="salesCustomerName" data-filter="customerName"><option value="">全部</option>${names.map((item) => `<option value="${escapeHtml(item)}" ${state.filters.customerName === item ? 'selected' : ''}>${escapeHtml(item)}</option>`).join('')}</select></div>
          <div class="operations-field"><label class="filter-label" for="salesCanteen">食堂</label><select class="filter-select" id="salesCanteen" data-filter="canteen"><option value="">请选择</option>${canteens.map((item) => `<option value="${escapeHtml(item)}" ${state.filters.canteen === item ? 'selected' : ''}>${escapeHtml(item)}</option>`).join('')}</select></div>
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
      <button type="button" class="btn-text" data-sales-action="detail" data-id="${record.id}">详情</button>
    </div>`;
  }

  function renderReconciliationTable() {
    const records = getFilteredRecords();
    const amountTotal = records.reduce((sum, record) => sum + Number(record.amount || 0), 0);
    const zeroingTotal = records.reduce((sum, record) => sum + Number(record.zeroing || 0), 0);
    const receivableTotal = records.reduce((sum, record) => sum + Number(record.receivable || 0), 0);
    return `<div class="operations-toolbar"><div class="operations-toolbar-main"><button type="button" class="btn btn-primary btn-sm" data-sales-toolbar="batch-reconcile">批量对账</button><button type="button" class="btn btn-primary btn-sm" data-sales-toolbar="generate">生成对账单</button></div><div class="operations-toolbar-side"><button type="button" class="btn btn-sm" data-sales-toolbar="export">导出</button></div></div>
      <div class="operations-table-container"><div class="operations-table-wrap"><table class="operations-table sales-table"><thead><tr>
        <th class="sales-selection"><input type="checkbox" data-sales-select-all aria-label="选择全部"></th><th>对账单号</th><th>关联单号</th><th>对账状态</th><th>客户反馈状态</th><th>食堂</th><th>收货人</th><th>收货手机</th><th>仓库</th><th>单据类型</th><th>对账金额</th><th>抹零金额</th><th>应收金额</th><th>业务时间</th><th>司机</th><th>线路</th><th>对账人</th><th>订单备注</th><th>操作</th>
      </tr></thead><tbody>${records.length ? records.map((record) => `<tr data-id="${record.id}">
        <td class="sales-selection"><input type="checkbox" data-sales-select value="${record.id}" ${state.selected.has(record.id) ? 'checked' : ''}></td>
        <td class="sales-account-cell"><button type="button" class="sales-account-link" data-sales-action="detail" data-id="${record.id}">${escapeHtml(record.accountNo)}</button><span class="sales-account-time">${escapeHtml(record.businessTime)}</span></td>
        <td><button type="button" class="btn-text" data-sales-action="detail" data-id="${record.id}">${escapeHtml(record.relatedNo)}</button></td>
        <td><span class="sales-status ${statusClass(record.status)}">${escapeHtml(record.status)}</span></td><td><span class="sales-status ${statusClass(record.feedbackStatus)}">${escapeHtml(record.feedbackStatus)}</span></td>
        <td>${escapeHtml(record.canteen)}</td><td>${escapeHtml(record.receiver || '--')}</td><td>${escapeHtml(record.phone || '--')}</td><td>${escapeHtml(record.warehouse || '--')}</td><td>${escapeHtml(record.type)}</td>
        <td class="sales-money">${money(record.amount)}</td><td class="sales-money">${money(record.zeroing)}</td><td class="sales-money">${money(record.receivable)}</td><td>${escapeHtml(record.businessTime)}</td><td>${escapeHtml(record.driver || '--')}</td><td>${escapeHtml(record.route || '--')}</td><td>${escapeHtml(record.reconciler || '--')}</td><td>${escapeHtml(record.remark || '--')}</td><td>${rowActions(record)}</td>
      </tr>`).join('') : '<tr><td class="sales-empty" colspan="19">暂无数据</td></tr>'}</tbody><tfoot><tr class="sales-summary-row"><td></td><td colspan="9" class="sales-summary-label">当前页合计</td><td class="sales-money">${money(amountTotal)}</td><td class="sales-money">${money(zeroingTotal)}</td><td class="sales-money">${money(receivableTotal)}</td><td colspan="6"></td></tr><tr class="sales-summary-row"><td></td><td colspan="9" class="sales-summary-label">所有页合计</td><td class="sales-money">${money(amountTotal)}</td><td class="sales-money">${money(zeroingTotal)}</td><td class="sales-money">${money(receivableTotal)}</td><td colspan="6"></td></tr></tfoot></table></div></div><div class="pagination operations-pagination"><span class="page-total">共 ${records.length} 条数据</span><select class="page-size-select" aria-label="每页条数"><option>20 条/页</option></select><div class="page-btns"><button type="button" class="page-btn active" aria-current="page">1</button></div><div class="page-jump"><span>跳至</span><input class="pagination-jump-input" value="1" aria-label="跳转页码"><span>页</span></div></div>`;
  }

  function renderStatements() {
    const statements = getState().statements;
    return `<div class="operations-toolbar"><div class="operations-toolbar-main"><span class="operations-summary">共 ${statements.length} 条记录</span></div></div><div class="operations-table-container"><div class="operations-table-wrap"><table class="operations-table sales-table sales-records-table"><thead><tr><th>序号</th><th>对账单号</th><th>客户名称</th><th>业务期间</th><th>对账金额</th><th>抹零金额</th><th>应收金额</th><th>生成时间</th><th>制单人</th><th>操作</th></tr></thead><tbody>${statements.length ? statements.map((statement, index) => `<tr><td class="sales-number">${index + 1}</td><td>${escapeHtml(statement.statementNo)}</td><td>${escapeHtml(statement.customerName)}</td><td>${escapeHtml(statement.startDate)} - ${escapeHtml(statement.endDate)}</td><td class="sales-money">${money(statement.amount, 2)}</td><td class="sales-money">${money(statement.zeroing, 2)}</td><td class="sales-money">${money(statement.receivable, 2)}</td><td>${escapeHtml(statement.generatedAt)}</td><td>${escapeHtml(statement.operator)}</td><td><div class="sales-actions"><button type="button" class="btn-text" data-sales-statement-action="view" data-id="${statement.id}">查看</button><button type="button" class="btn-text" data-sales-statement-action="print" data-id="${statement.id}">打印</button></div></td></tr>`).join('') : '<tr><td class="sales-empty" colspan="10">暂无对账单生成记录</td></tr>'}</tbody></table></div></div><div class="pagination operations-pagination"><span class="page-total">共 ${statements.length} 条数据</span></div>`;
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
      const contact = first.receiver && first.phone ? `${first.receiver}(${first.phone})` : first.receiver || first.phone || '--';
      return `<tr><td>${index + 1}</td><td>${escapeHtml(first.customerName)}</td><td>${escapeHtml(first.canteen)}</td><td class="sales-money">${money(amount)}</td><td class="sales-money">${money(zeroing)}</td><td class="sales-money">${money(receivable)}</td><td class="sales-contact">${escapeHtml(contact)}</td></tr>`;
    }).join('');
    const amountTotal = records.reduce((sum, record) => sum + Number(record.amount || 0), 0);
    const zeroingTotal = records.reduce((sum, record) => sum + Number(record.zeroing || 0), 0);
    const receivableTotal = records.reduce((sum, record) => sum + Number(record.receivable || 0), 0);
    const emptyRow = '<tr><td class="sales-empty" colspan="7">暂无数据</td></tr>';
    return `<div class="sales-view sales-accounts-view">${renderAccountsFilter()}
      <div class="operations-toolbar sales-accounts-toolbar"><div class="operations-toolbar-main"></div><div class="operations-toolbar-side"><button type="button" class="btn btn-sm sales-export-button" data-sales-toolbar="export"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg><span>导出</span></button></div></div>
      <div class="operations-table-container"><div class="operations-table-wrap"><table class="operations-table sales-table sales-accounts-table"><thead><tr><th>序号</th><th>客户名称</th><th>食堂</th><th>对账金额</th><th>抹零金额</th><th>应收金额</th><th>联系人</th></tr></thead><tbody>${rows || emptyRow}</tbody><tfoot><tr class="sales-summary-row"><td colspan="3" class="sales-summary-label">当前页合计</td><td class="sales-money">${money(amountTotal)}</td><td class="sales-money">${money(zeroingTotal)}</td><td class="sales-money">${money(receivableTotal)}</td><td></td></tr><tr class="sales-summary-row"><td colspan="3" class="sales-summary-label">所有页合计</td><td class="sales-money">${money(amountTotal)}</td><td class="sales-money">${money(zeroingTotal)}</td><td class="sales-money">${money(receivableTotal)}</td><td></td></tr></tfoot></table></div></div>
      <div class="pagination operations-pagination"><span class="page-total">共 ${groups.length} 条数据</span><select class="page-size-select" aria-label="每页条数"><option>20 条/页</option></select><div class="page-btns"><button type="button" class="page-btn active" aria-current="page">1</button></div><div class="page-jump"><span>跳至</span><input class="pagination-jump-input" value="1" aria-label="跳转页码"><span>页</span></div></div>
    </div>`;
  }

  function mountBusinessDatePicker() {
    const dateRange = page.querySelector('#salesBusinessDateRange');
    if (!dateRange || !window.DateRangePicker) return;
    businessDatePicker = window.DateRangePicker.create({
      container: dateRange,
      displayInput: dateRange.querySelector('.date-range-display'),
      startInput: dateRange.querySelector('[data-date-start]'),
      endInput: dateRange.querySelector('[data-date-end]'),
      panelId: 'salesBusinessDatePickerPanel',
      onChange: ({ startDate, endDate }) => {
        state.filters.startDate = startDate;
        state.filters.endDate = endDate;
      }
    });
  }

  function render() {
    businessDatePicker?.destroy?.();
    businessDatePicker = null;
    if (pageView === 'accounts') {
      page.innerHTML = renderAccounts();
      mountBusinessDatePicker();
      return;
    }
    page.innerHTML = `${renderTabs()}<div class="sales-view">${renderFilter()}${state.tab === 'reconciliation' ? renderReconciliationTable() : renderStatements()}</div>`;
    if (state.tab === 'reconciliation') {
      mountBusinessDatePicker();
    }
  }

  function collectFilters() {
    page.querySelectorAll('[data-filter]').forEach((element) => { state.filters[element.dataset.filter] = element.value.trim(); });
  }

  function selectedRecords() {
    const records = getRecords();
    return records.filter((record) => state.selected.has(record.id));
  }

  function exportRows() {
    const rows = getFilteredRecords();
    const columns = ['对账单号', '关联单号', '对账状态', '客户反馈状态', '食堂', '收货人', '单据类型', '对账金额', '抹零金额', '应收金额', '业务时间'];
    const lines = [columns.join(',')].concat(rows.map((record) => [record.accountNo, record.relatedNo, record.status, record.feedbackStatus, record.canteen, record.receiver, record.type, record.amount, record.zeroing, record.receivable, record.businessTime].map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')));
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

  function handleToolbar(action) {
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
    if (tab) { state.tab = tab.dataset.salesTab; state.selected.clear(); render(); return; }
    if (event.target.closest('[data-sales-advanced]')) { state.advanced = !state.advanced; render(); return; }
    if (event.target.closest('[data-sales-query]')) { collectFilters(); render(); return; }
    if (event.target.closest('[data-sales-reset]')) { state.filters = { startDate: '', endDate: '', relatedNo: '', status: '', customerName: '', canteen: '' }; render(); return; }
    const toolbar = event.target.closest('[data-sales-toolbar]');
    if (toolbar) { collectFilters(); handleToolbar(toolbar.dataset.salesToolbar); return; }
    const statementAction = event.target.closest('[data-sales-statement-action]');
    if (statementAction) {
      const statement = getState().statements.find((item) => item.id === statementAction.dataset.id);
      if (!statement) return;
      if (statementAction.dataset.salesStatementAction === 'print') window.open(`./sales-reconciliation-statement.html?id=${encodeURIComponent(statement.id)}`, '_blank');
      else window.location.href = `./sales-reconciliation-statement.html?id=${encodeURIComponent(statement.id)}`;
      return;
    }
    const accountDetail = event.target.closest('[data-account-detail]');
    if (accountDetail) { window.location.href = `./sales-reconciliation-detail.html?id=${encodeURIComponent(accountDetail.dataset.accountDetail)}&view=detail`; return; }
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
    if (event.target.matches('[data-sales-select]')) {
      event.target.checked ? state.selected.add(event.target.value) : state.selected.delete(event.target.value);
      return;
    }
    if (event.target.matches('[data-sales-select-all]')) {
      getFilteredRecords().forEach((record) => event.target.checked ? state.selected.add(record.id) : state.selected.delete(record.id));
      render();
    }
  });

  render();
})();
