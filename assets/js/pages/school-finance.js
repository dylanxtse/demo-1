(function () {
  const view = document.body.dataset.schoolFinanceView === 'accounts' ? 'accounts' : 'reconciliation';
  const rawData = window.SchoolReferenceData || {};
  const data = {
    ...rawData,
    reconciliationRows: rawData.reconciliationRows || [],
    accountsRows: rawData.accountsRows?.length ? rawData.accountsRows : [{ supplier: '阳光智园供应链管理有限公司', canteen: '静安第一中学食堂（演示）', amount: 134, zeroing: 0, payable: 134, shippedAt: '2026-08-05 16:49:06' }],
    suppliers: rawData.suppliers || [],
    canteens: rawData.canteens || []
  };
  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  const money = (value) => {
    const number = Number(value || 0);
    return Number.isInteger(number) ? String(number) : number.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  };
  const dateOnly = (value) => String(value || '').slice(0, 10);
  const state = {
    rows: (view === 'accounts' ? data.accountsRows : data.reconciliationRows).map((row) => ({ ...row })),
    filtered: [], page: 1, pageSize: 20, selected: new Set(), advanced: false,
    startDate: view === 'accounts' ? '2026-08-03' : '2026-08-04', endDate: '2026-09-03', supplier: '', canteen: '', feedback: '', pagination: null
  };

  const root = window.AppShell.mount({
    title: view === 'accounts' ? '采购账款' : '采购对账',
    variant: 'school',
    content: `<section class="page-card school-missing-page school-finance-page ${view === 'accounts' ? 'school-accounts-page' : 'school-reconciliation-page'}" aria-label="${view === 'accounts' ? '采购账款' : '采购对账'}">
      <div class="school-page-filter"><div class="school-filter-grid" id="schoolFinanceFilters"></div><div class="school-filter-actions" id="schoolFinanceFilterActions"></div></div>
      ${view === 'reconciliation' ? '<div class="school-advanced-panel" id="schoolFinanceAdvanced"><div class="school-filter-grid"><div class="school-filter-field"><label for="schoolFinanceFeedback">反馈状态</label><select id="schoolFinanceFeedback" class="school-control"><option value="">全部</option><option>无异议</option><option>有异议</option></select></div></div></div>' : ''}
      <div class="school-page-toolbar"><div class="school-toolbar-left" id="schoolFinanceToolbarLeft"></div><div class="school-toolbar-right"><button class="school-action-link school-export-link" id="schoolFinanceExport" type="button">导出</button></div></div>
      <div class="school-table-container"><div class="school-table-wrap"><table class="school-data-table" id="schoolFinanceTable"></table></div><div class="school-page-pagination" id="schoolFinancePagination"></div></div>
      <div class="school-finance-overlay" id="schoolFinanceOverlay" hidden></div><div class="school-toast" id="schoolFinanceToast" role="status"></div>
    </section>`
  });
  const page = root.querySelector('.school-finance-page');
  const $ = (selector) => page.querySelector(selector);

  function toast(message, isError = false) {
    const element = $('#schoolFinanceToast');
    element.textContent = message;
    element.className = `school-toast is-visible${isError ? ' is-error' : ''}`;
    window.clearTimeout(toast.timer);
    toast.timer = window.setTimeout(() => { element.className = 'school-toast'; }, 2200);
  }

  function optionList(values, emptyLabel = '全部') {
    return [`<option value="">${emptyLabel}</option>`, ...values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)].join('');
  }

  function renderFilters() {
    const filterRoot = $('#schoolFinanceFilters');
    if (view === 'accounts') {
      filterRoot.innerHTML = `<div class="school-filter-field"><label for="schoolFinanceStart">发货日期</label><div class="school-date-range"><input id="schoolFinanceStart" value="${state.startDate}" aria-label="发货开始日期"><span>至</span><input id="schoolFinanceEnd" value="${state.endDate}" aria-label="发货结束日期"></div></div>
        <div class="school-filter-field"><label for="schoolFinanceSupplier">供货企业</label><select id="schoolFinanceSupplier" class="school-control">${optionList(data.suppliers)}</select></div>
        <div class="school-filter-field"><label for="schoolFinanceCanteen">食堂</label><select id="schoolFinanceCanteen" class="school-control">${optionList(data.canteens.map((item) => item.name))}</select></div>`;
      $('#schoolFinanceFilterActions').innerHTML = '<button class="btn btn-primary" id="schoolFinanceQuery" type="button">查询</button><button class="btn" id="schoolFinanceReset" type="button">重置</button>';
      return;
    }
    filterRoot.innerHTML = `<div class="school-filter-field"><label for="schoolFinanceStart">发货日期</label><div class="school-date-range"><input id="schoolFinanceStart" value="${state.startDate}" aria-label="发货开始日期"><span>至</span><input id="schoolFinanceEnd" value="${state.endDate}" aria-label="发货结束日期"></div></div>`;
    $('#schoolFinanceFilterActions').innerHTML = '<button class="school-advanced-toggle" id="schoolFinanceAdvancedToggle" type="button">高级筛选</button><button class="btn btn-primary" id="schoolFinanceQuery" type="button">查询</button><button class="btn" id="schoolFinanceReset" type="button">重置</button>';
    $('#schoolFinanceToolbarLeft').innerHTML = '<button class="btn btn-primary" id="schoolFinanceBatchConfirm" type="button">批量确认对账</button>';
  }

  function readFilters() {
    state.startDate = $('#schoolFinanceStart').value.trim();
    state.endDate = $('#schoolFinanceEnd').value.trim();
    state.supplier = $('#schoolFinanceSupplier')?.value || '';
    state.canteen = $('#schoolFinanceCanteen')?.value || '';
    state.feedback = $('#schoolFinanceFeedback')?.value || '';
  }

  function applyFilters() {
    state.filtered = state.rows.filter((row) => {
      const businessDate = dateOnly(row.shippedAt);
      if (businessDate && state.startDate && businessDate < state.startDate) return false;
      if (businessDate && state.endDate && businessDate > state.endDate) return false;
      if (state.supplier && row.supplier !== state.supplier) return false;
      if (state.canteen && row.canteen !== state.canteen) return false;
      if (state.feedback && row.feedbackStatus !== state.feedback) return false;
      return true;
    });
    const ids = new Set(state.filtered.map((item) => item.id));
    state.selected.forEach((id) => { if (!ids.has(id)) state.selected.delete(id); });
  }

  function renderReconciliationTable() {
    const rows = state.filtered.slice((state.page - 1) * state.pageSize, state.page * state.pageSize);
    const amount = state.filtered.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const zeroing = state.filtered.reduce((sum, row) => sum + Number(row.zeroing || 0), 0);
    const payable = state.filtered.reduce((sum, row) => sum + Number(row.payable || 0), 0);
    $('#schoolFinanceTable').innerHTML = `<colgroup>${[50,190,190,100,220,200,90,100,100,100,170,150,100,140,80].map((width) => `<col style="width:${width}px">`).join('')}</colgroup><thead><tr>
      <th class="school-checkbox-cell"><input type="checkbox" id="schoolFinanceSelectAll" aria-label="选择全部"></th><th>对账单号</th><th>关联单号</th><th>反馈状态</th><th>供货企业</th><th>食堂</th><th>单据类型</th><th>对账金额</th><th>抹零金额</th><th>应付金额</th><th>发货时间</th><th>线路</th><th>司机</th><th>订单备注</th><th>操作</th>
    </tr></thead><tbody>${rows.length ? rows.map((row) => `<tr data-id="${escapeHtml(row.id)}"><td><input type="checkbox" class="school-finance-row-select" aria-label="选择${escapeHtml(row.accountNo)}" ${state.selected.has(row.id) ? 'checked' : ''}></td><td><button class="school-table-link" type="button" data-action="view">${escapeHtml(row.accountNo)}<span class="school-table-subline">${escapeHtml(row.shippedAt)}</span></button></td><td>${escapeHtml(row.relatedNo)}</td><td><span class="school-status">${escapeHtml(row.feedbackStatus)}</span></td><td title="${escapeHtml(row.supplier)}">${escapeHtml(row.supplier)}</td><td title="${escapeHtml(row.canteen)}">${escapeHtml(row.canteen)}</td><td>${escapeHtml(row.type)}</td><td>${money(row.amount)}</td><td>${row.zeroing == null ? '--' : money(row.zeroing)}</td><td>${row.payable == null ? '--' : money(row.payable)}</td><td>${escapeHtml(row.shippedAt)}</td><td>${escapeHtml(row.route)}</td><td>${escapeHtml(row.driver)}</td><td>${escapeHtml(row.remark)}</td><td><button class="school-action-link" type="button" data-action="feedback">反馈</button></td></tr>`).join('') : '<tr><td class="school-empty-cell" colspan="15">暂无数据</td></tr>'}</tbody><tfoot><tr><td></td><td colspan="6">当前页合计</td><td>${money(amount)}</td><td>${money(zeroing)}</td><td>${money(payable)}</td><td colspan="5"></td></tr><tr><td></td><td colspan="6">所有页合计</td><td>${money(amount)}</td><td>${money(zeroing)}</td><td>${money(payable)}</td><td colspan="5"></td></tr></tfoot>`;
    const selectAll = $('#schoolFinanceSelectAll');
    const selectedCount = rows.filter((row) => state.selected.has(row.id)).length;
    if (selectAll) { selectAll.checked = rows.length > 0 && selectedCount === rows.length; selectAll.indeterminate = selectedCount > 0 && selectedCount < rows.length; }
  }

  function renderAccountsTable() {
    const rows = state.filtered.slice((state.page - 1) * state.pageSize, state.page * state.pageSize);
    const amount = state.filtered.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const zeroing = state.filtered.reduce((sum, row) => sum + Number(row.zeroing || 0), 0);
    const payable = state.filtered.reduce((sum, row) => sum + Number(row.payable || 0), 0);
    $('#schoolFinanceTable').innerHTML = `<colgroup><col style="width:80px"><col style="width:28%"><col style="width:28%"><col style="width:16%"><col style="width:16%"><col style="width:16%"></colgroup><thead><tr><th>序号</th><th>供货企业</th><th>食堂</th><th>对账金额</th><th>抹零金额</th><th>应付金额</th></tr></thead><tbody>${rows.length ? rows.map((row, index) => `<tr><td>${(state.page - 1) * state.pageSize + index + 1}</td><td title="${escapeHtml(row.supplier)}">${escapeHtml(row.supplier)}</td><td title="${escapeHtml(row.canteen)}">${escapeHtml(row.canteen)}</td><td>${money(row.amount)}</td><td>${money(row.zeroing)}</td><td>${money(row.payable)}</td></tr>`).join('') : '<tr><td class="school-empty-cell" colspan="6">暂无数据</td></tr>'}</tbody><tfoot><tr><td colspan="3">当前页合计</td><td>${money(amount)}</td><td>${money(zeroing)}</td><td>${money(payable)}</td></tr><tr><td colspan="3">所有页合计</td><td>${money(amount)}</td><td>${money(zeroing)}</td><td>${money(payable)}</td></tr></tfoot>`;
  }

  function renderTable() {
    if (view === 'accounts') renderAccountsTable(); else renderReconciliationTable();
    state.pagination?.update({ page: state.page, pageSize: state.pageSize, total: state.filtered.length });
  }

  function exportRows() {
    const columns = view === 'accounts' ? ['供货企业', '食堂', '对账金额', '抹零金额', '应付金额'] : ['对账单号', '关联单号', '反馈状态', '供货企业', '食堂', '单据类型', '对账金额', '抹零金额', '应付金额', '发货时间', '线路', '司机', '订单备注'];
    const values = state.filtered.map((row) => view === 'accounts' ? [row.supplier, row.canteen, row.amount, row.zeroing, row.payable] : [row.accountNo, row.relatedNo, row.feedbackStatus, row.supplier, row.canteen, row.type, row.amount, row.zeroing, row.payable, row.shippedAt, row.route, row.driver, row.remark]);
    const cell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const csv = [columns, ...values].map((line) => line.map(cell).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `${view === 'accounts' ? '学校端采购账款' : '学校端采购对账'}.csv`; link.click(); URL.revokeObjectURL(url);
    toast('导出成功');
  }

  function openFeedback(row) {
    $('#schoolFinanceOverlay').hidden = false;
    $('#schoolFinanceOverlay').innerHTML = `<div class="school-finance-dialog-backdrop" data-overlay-close><section class="school-finance-dialog" role="dialog" aria-modal="true" aria-label="反馈"><header><h2>反馈</h2><button type="button" data-action="close-feedback" aria-label="关闭">×</button></header><div class="school-finance-dialog-body"><p>对账单号：${escapeHtml(row.accountNo)}</p><label for="schoolFeedbackText">反馈说明</label><textarea id="schoolFeedbackText" placeholder="请输入反馈说明"></textarea></div><footer><button class="btn" type="button" data-action="close-feedback">取消</button><button class="btn btn-primary" type="button" data-action="save-feedback">确定</button></footer></section></div>`;
  }

  function closeFeedback() { $('#schoolFinanceOverlay').hidden = true; $('#schoolFinanceOverlay').innerHTML = ''; }

  page.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) { if (event.target.matches('[data-overlay-close]')) closeFeedback(); return; }
    if (button.id === 'schoolFinanceQuery') { readFilters(); state.page = 1; applyFilters(); renderTable(); return; }
    if (button.id === 'schoolFinanceReset') { state.startDate = view === 'accounts' ? '2026-08-03' : '2026-08-04'; state.endDate = '2026-09-03'; state.supplier = ''; state.canteen = ''; state.feedback = ''; renderFilters(); applyFilters(); renderTable(); return; }
    if (button.id === 'schoolFinanceAdvancedToggle') { state.advanced = !state.advanced; button.classList.toggle('is-open', state.advanced); $('#schoolFinanceAdvanced').classList.toggle('is-open', state.advanced); return; }
    if (button.id === 'schoolFinanceExport') { exportRows(); return; }
    if (button.id === 'schoolFinanceBatchConfirm') {
      if (!state.selected.size) { toast('请选择要确认的对账单', true); return; }
      state.selected.forEach((id) => { const row = state.rows.find((item) => item.id === id); if (row) row.feedbackStatus = '无异议'; });
      renderTable(); toast('批量确认对账成功'); return;
    }
    if (button.id === 'schoolFinanceSelectAll') return;
    const row = button.closest('tr[data-id]');
    const record = state.rows.find((item) => item.id === row?.dataset.id);
    if (button.dataset.action === 'feedback' && record) { openFeedback(record); return; }
    if (button.dataset.action === 'close-feedback') { closeFeedback(); return; }
    if (button.dataset.action === 'save-feedback') { closeFeedback(); toast('反馈已提交'); return; }
    if (event.target.matches('[data-overlay-close]')) closeFeedback();
  });

  page.addEventListener('change', (event) => {
    if (event.target.id === 'schoolFinanceSelectAll') {
      const rows = state.filtered.slice((state.page - 1) * state.pageSize, state.page * state.pageSize);
      rows.forEach((row) => event.target.checked ? state.selected.add(row.id) : state.selected.delete(row.id)); renderTable(); return;
    }
    if (!event.target.classList.contains('school-finance-row-select')) return;
    const row = event.target.closest('tr[data-id]');
    if (row) event.target.checked ? state.selected.add(row.dataset.id) : state.selected.delete(row.dataset.id);
    renderReconciliationTable();
  });

  renderFilters();
  applyFilters();
  state.pagination = window.Pagination.create({ container: $('#schoolFinancePagination'), page: 1, pageSize: 20, total: state.filtered.length, pageSizeOptions: [20, 50, 100], onChange: ({ page, pageSize }) => { state.page = page; state.pageSize = pageSize; renderTable(); } });
  renderTable();
})();
