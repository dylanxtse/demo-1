(function () {
  'use strict';

  const store = window.SalesReconciliationStore;
  const params = new URLSearchParams(window.location.search);
  const customerId = params.get('customerId') || '';
  const customerName = params.get('customerName') || '';
  const canteen = params.get('canteen') || '';

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
    无异议: 'is-success',
    未反馈: 'is-danger',
    已反馈: 'is-success'
  }[status] || '');

  const account = store.getCustomerAccount?.(customerId) || {};
  const accountName = account.customerName || customerName;
  const accountCanteen = account.canteen || canteen;

  const state = {
    status: '全部',
    page: 1,
    pageSize: 20,
    selected: new Set()
  };

  const backIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/><path d="M19 12H9"/></svg>';
  const downloadIcon = '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12"></path><polyline points="7 10 12 15 17 10"></polyline><path d="M5 21h14"></path></svg>';

  const appRoot = window.AppShell.mount({
    title: `客户对账 - ${accountName}`,
    content: '<section class="page-card operations-page order-module-page sales-reconciliation-page sales-customer-detail-page" aria-label="客户对账详情" data-customer-detail-root></section>'
  });
  const page = appRoot.querySelector('[data-customer-detail-root]');

  function toast(message, type = '') {
    page.querySelector('.sales-toast')?.remove();
    const element = document.createElement('div');
    element.className = `sales-toast ${type ? 'is-error' : ''}`;
    element.textContent = message;
    page.appendChild(element);
    window.setTimeout(() => element.remove(), 2200);
  }

  function getCustomerRecords() {
    const allRecords = store.getState().records;
    const exactMatch = allRecords.filter((record) => record.customerName === accountName);
    if (exactMatch.length) return exactMatch;
    return allRecords.filter((record) => record.canteen === accountCanteen);
  }

  function getFilteredRecords() {
    const records = getCustomerRecords();
    if (state.status === '全部') return records;
    return records.filter((record) => record.status === state.status);
  }

  function renderSummary() {
    const records = getCustomerRecords();
    const dates = records.map((record) => dateOnly(record.businessTime)).filter(Boolean).sort();
    const startDate = dates.length ? dates[0] : '--';
    const endDate = dates.length ? dates[dates.length - 1] : '--';
    const orderCount = records.filter((record) => (record.type || '').includes('销售') && !(record.type || '').includes('退')).length;
    const returnCount = records.filter((record) => (record.type || '').includes('退')).length;
    return `<div class="sales-customer-detail-summary">
      <div class="sales-customer-detail-summary-item"><span class="sales-customer-detail-summary-label">业务日期</span><span class="sales-customer-detail-summary-value">${escapeHtml(startDate)} ~ ${escapeHtml(endDate)}</span></div>
      <div class="sales-customer-detail-summary-item"><span class="sales-customer-detail-summary-label">食堂</span><span class="sales-customer-detail-summary-value">${escapeHtml(accountCanteen || '--')}</span></div>
      <div class="sales-customer-detail-summary-item"><span class="sales-customer-detail-summary-label">对账单数量</span><span class="sales-customer-detail-summary-value">${records.length}</span></div>
      <div class="sales-customer-detail-summary-item"><span class="sales-customer-detail-summary-label">订单对账单数量</span><span class="sales-customer-detail-summary-value">${orderCount}</span></div>
      <div class="sales-customer-detail-summary-item"><span class="sales-customer-detail-summary-label">退货对账单数量</span><span class="sales-customer-detail-summary-value">${returnCount}</span></div>
    </div>`;
  }

  function renderStatusTabs() {
    const statuses = ['全部', '未对账', '已对账', '未结算', '部分结算', '已结算'];
    return `<div class="operations-tabs order-view-tabs sales-tabs" role="tablist">
      ${statuses.map((status) => `<button type="button" class="operations-tab sales-tab ${state.status === status ? 'active' : ''}" data-customer-detail-status="${status}" role="tab" aria-selected="${state.status === status}">${status}</button>`).join('')}
    </div>`;
  }

  function rowActions(record) {
    const reconcileDisabled = record.status !== '未对账';
    const reverseDisabled = !['已对账', '未结算'].includes(record.status);
    const settleDisabled = !['未结算', '部分结算'].includes(record.status);
    return `<div class="sales-actions">
      <button type="button" class="btn-text" data-customer-detail-action="edit" data-id="${record.id}" ${reconcileDisabled ? 'disabled' : ''}>对账</button>
      <button type="button" class="btn-text" data-customer-detail-action="reverse" data-id="${record.id}" ${reverseDisabled ? 'disabled' : ''}>反对账</button>
      <button type="button" class="btn-text" data-customer-detail-action="settle" data-id="${record.id}" ${settleDisabled ? 'disabled' : ''}>结算</button>
    </div>`;
  }

  function renderTable() {
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
    const pageButtons = Array.from({ length: totalPages }, (_, index) => `<button type="button" class="page-btn ${state.page === index + 1 ? 'active' : ''}" data-customer-detail-page="${index + 1}" aria-current="${state.page === index + 1 ? 'page' : 'false'}">${index + 1}</button>`).join('');
    return `<div class="operations-toolbar"><div class="operations-toolbar-main"><button type="button" class="btn btn-primary btn-sm" data-customer-detail-toolbar="batch-reconcile">批量对账</button><button type="button" class="btn btn-primary btn-sm" data-customer-detail-toolbar="batch-reverse">批量反对账</button><button type="button" class="btn btn-primary btn-sm" data-customer-detail-toolbar="generate">生成对账单</button><button type="button" class="btn btn-primary btn-sm" data-customer-detail-toolbar="batch-settle" disabled>批量结算</button></div><div class="operations-toolbar-side"><button type="button" class="btn btn-sm standard-list-export-print" data-customer-detail-toolbar="export">${downloadIcon}导出</button></div></div>
      <div class="operations-table-container"><div class="operations-table-wrap"><table class="operations-table sales-table sales-reconciliation-detail-table"><thead><tr>
        <th class="sales-selection"><input type="checkbox" data-customer-detail-select-all aria-label="选择全部"></th><th>对账单号</th><th>关联单号</th><th>对账状态</th><th>客户反馈状态</th><th>食堂</th><th>收货人</th><th>收货手机</th><th>仓库</th><th>单据类型</th><th>对账金额</th><th>抹零金额</th><th>应收金额</th><th>发/退货金额</th><th>操作</th>
      </tr></thead><tbody>${records.length ? records.map((record) => `<tr data-id="${record.id}">
        <td class="sales-selection"><input type="checkbox" data-customer-detail-select value="${record.id}" ${state.selected.has(record.id) ? 'checked' : ''}></td>
        <td class="sales-account-cell"><button type="button" class="sales-account-link" data-customer-detail-action="detail" data-id="${record.id}">${escapeHtml(record.accountNo)}</button><span class="sales-account-time">${escapeHtml(record.businessTime)}</span></td>
        <td><button type="button" class="btn-text" data-customer-detail-action="detail" data-id="${record.id}">${escapeHtml(record.relatedNo)}</button></td>
        <td><span class="sales-status ${statusClass(record.status)}">${escapeHtml(record.status)}</span></td><td><span class="sales-status ${statusClass(record.feedbackStatus)}">${escapeHtml(record.feedbackStatus)}</span></td>
        <td>${escapeHtml(record.canteen)}</td><td>${escapeHtml(record.receiver)}</td><td>${escapeHtml(record.phone)}</td><td>${escapeHtml(record.warehouse)}</td><td>${escapeHtml(record.type)}</td>
        <td class="sales-money">${money(record.amount)}</td><td class="sales-money">${money(record.zeroing)}</td><td class="sales-money">${money(record.receivable)}</td><td class="sales-money">${money(record.amount)}</td><td class="sales-reconciliation-detail-actions">${rowActions(record)}</td>
      </tr>`).join('') : '<tr><td class="sales-empty" colspan="15">暂无数据</td></tr>'}</tbody><tfoot><tr class="sales-summary-row"><td></td><td colspan="9" class="sales-summary-label">当前页合计</td><td class="sales-money">${money(pageAmountTotal)}</td><td class="sales-money">${money(pageZeroingTotal)}</td><td class="sales-money">${money(pageReceivableTotal)}</td><td class="sales-money">${money(pageAmountTotal)}</td><td></td></tr><tr class="sales-summary-row"><td></td><td colspan="9" class="sales-summary-label">所有页合计</td><td class="sales-money">${money(allAmountTotal)}</td><td class="sales-money">${money(allZeroingTotal)}</td><td class="sales-money">${money(allReceivableTotal)}</td><td class="sales-money">${money(allAmountTotal)}</td><td></td></tr></tfoot></table></div></div><div class="pagination operations-pagination"><span class="page-total">共 ${allRecords.length} 条数据</span><select class="page-size-select" aria-label="每页条数"><option>20 条/页</option></select><div class="page-btns"><button type="button" class="page-btn" data-customer-detail-page="prev" aria-label="上一页" ${state.page === 1 ? 'disabled' : ''}>‹</button>${pageButtons}<button type="button" class="page-btn" data-customer-detail-page="next" aria-label="下一页" ${state.page === totalPages ? 'disabled' : ''}>›</button></div><div class="page-jump"><span>跳至</span><input class="pagination-jump-input" value="${state.page}" aria-label="跳转页码"><span>/ ${totalPages} 页</span></div></div>`;
  }

  function render() {
    page.innerHTML = `<div class="processing-detail-page-header"><button class="back-link" type="button" data-customer-detail-back>${backIcon}<span>返回</span></button><h1>客户对账 - ${escapeHtml(accountName)}</h1></div>
      <div class="sales-view sales-customer-detail-view">${renderSummary()}${renderStatusTabs()}${renderTable()}</div>`;
  }

  function handleToolbar(action) {
    const selected = getCustomerRecords().filter((record) => state.selected.has(record.id));
    if (action === 'export') {
      const rows = getFilteredRecords();
      const columns = ['对账单号', '关联单号', '对账状态', '客户反馈状态', '食堂', '收货人', '单据类型', '对账金额', '抹零金额', '应收金额', '业务时间'];
      const lines = [columns.join(',')].concat(rows.map((record) => [record.accountNo, record.relatedNo, record.status, record.feedbackStatus, record.canteen, record.receiver, record.type, record.amount, record.zeroing, record.receivable, record.businessTime].map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')));
      const link = document.createElement('a');
      link.href = URL.createObjectURL(new Blob([`\ufeff${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' }));
      link.download = `客户对账-${accountName}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
      return toast('导出成功');
    }
    if (!selected.length) return toast('请选择对账单', 'error');
    if (action === 'batch-reconcile') {
      selected.filter((record) => record.status === '未对账').forEach((record) => store.updateRecord(record.id, { status: '已对账' }));
      state.selected.clear();
      render();
      return toast('批量对账成功');
    }
    if (action === 'batch-reverse') {
      selected.filter((record) => ['已对账', '未结算'].includes(record.status)).forEach((record) => store.updateRecord(record.id, { status: '未对账' }));
      state.selected.clear();
      render();
      return toast('批量反对账成功');
    }
    if (action === 'batch-settle') {
      selected.filter((record) => ['未结算', '部分结算'].includes(record.status)).forEach((record) => store.updateRecord(record.id, { status: '已结算' }));
      state.selected.clear();
      render();
      return toast('批量结算成功');
    }
    if (action === 'generate') {
      const customerKeys = new Set(selected.map((record) => `${record.customerName}|${record.canteen}`));
      if (customerKeys.size > 1) return toast('请选择同一客户和食堂的对账单', 'error');
      window.location.href = `./sales-reconciliation-statement.html?ids=${encodeURIComponent(selected.map((record) => record.id).join(','))}`;
    }
  }

  page.addEventListener('click', (event) => {
    if (event.target.closest('[data-customer-detail-back]')) { window.location.href = './sales-reconciliation.html?view=customer'; return; }
    const statusTab = event.target.closest('[data-customer-detail-status]');
    if (statusTab) { state.status = statusTab.dataset.customerDetailStatus; state.page = 1; state.selected.clear(); render(); return; }
    const pageButton = event.target.closest('[data-customer-detail-page]');
    if (pageButton) {
      const totalPages = Math.max(1, Math.ceil(getFilteredRecords().length / state.pageSize));
      const target = pageButton.dataset.customerDetailPage;
      state.page = target === 'prev' ? Math.max(1, state.page - 1) : target === 'next' ? Math.min(totalPages, state.page + 1) : Math.min(totalPages, Math.max(1, Number(target) || 1));
      render();
      return;
    }
    const toolbar = event.target.closest('[data-customer-detail-toolbar]');
    if (toolbar) { handleToolbar(toolbar.dataset.customerDetailToolbar); return; }
    const actionButton = event.target.closest('[data-customer-detail-action]');
    if (!actionButton || actionButton.disabled) return;
    const record = store.getRecord(actionButton.dataset.id);
    if (!record) return;
    const action = actionButton.dataset.customerDetailAction;
    if (action === 'edit') window.location.href = `./sales-reconciliation-detail.html?id=${encodeURIComponent(record.id)}&view=edit`;
    if (action === 'detail') window.location.href = `./sales-reconciliation-detail.html?id=${encodeURIComponent(record.id)}&view=detail`;
    if (action === 'reverse') { store.updateRecord(record.id, { status: '未对账' }); render(); toast('已反对账'); }
    if (action === 'settle') { store.updateRecord(record.id, { status: '已结算' }); render(); toast('结算成功'); }
  });

  page.addEventListener('change', (event) => {
    if (event.target.matches('[data-customer-detail-select]')) {
      event.target.checked ? state.selected.add(event.target.value) : state.selected.delete(event.target.value);
      return;
    }
    if (event.target.matches('[data-customer-detail-select-all]')) {
      getFilteredRecords().forEach((record) => event.target.checked ? state.selected.add(record.id) : state.selected.delete(record.id));
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
