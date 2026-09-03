(function () {
  const service = window.SchoolRecipeDemandService;
  if (!service) return;

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  const number = (value) => Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const dateText = (dates = []) => dates.length > 3 ? `${dates.slice(0, 3).join('、')} 等${dates.length}天` : dates.join('、') || '--';
  const calendarIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="17" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="9" x2="21" y2="9"></line></svg>';
  const dateFilter = (id, label) => `<div class="operations-field"><label class="filter-label" for="${id}">${label}</label><div class="date-input-control operations-date-control"><input class="filter-input operations-date-input" id="${id}" type="text" readonly placeholder="请选择日期" aria-label="${label}"><span class="date-range-icon" aria-hidden="true">${calendarIcon}</span></div></div>`;
  const state = { keyword: '', submittedDate: '', usageDate: '', page: 1, pageSize: 20, pagination: null };

  function navigate(url) {
    if (window.AppNavigationGuard?.navigate) window.AppNavigationGuard.navigate(url);
    else window.location.href = url;
  }

  const content = `<section class="page-card operations-page order-module-page school-recipe-demand-records-page" id="schoolRecipeDemandRecordsPage" aria-label="需求提交记录">
    <form class="operations-filter filter-section" id="schoolRecipeDemandRecordsFilter"><div class="operations-filter-main"><div class="operations-filter-grid"><div class="operations-field"><label class="filter-label" for="schoolRecipeDemandRecordKeyword">记录编号</label><input class="filter-input" id="schoolRecipeDemandRecordKeyword" type="text" placeholder="请输入记录编号" aria-label="记录编号"></div>${dateFilter('schoolRecipeDemandRecordSubmittedDate', '提交日期')}${dateFilter('schoolRecipeDemandRecordUsageDate', '用料日期')}</div><div class="operations-filter-actions"><button type="submit" class="btn btn-primary btn-sm">查询</button><button type="button" class="btn btn-sm" data-action="reset">重置</button></div></div></form>
    <div class="school-recipe-demand-records-table-wrap"><table class="school-recipe-demand-records-table"><colgroup><col class="col-record-no"><col class="col-date"><col class="col-person"><col class="col-person"><col class="col-total"><col class="col-product"><col class="col-order"><col class="col-operator"><col class="col-time"><col class="col-action"></colgroup><thead><tr><th>记录编号</th><th>用料日期</th><th>学生人次</th><th>教师人次</th><th>总人次</th><th>商品种数</th><th>生成订单数</th><th>操作人</th><th>提交时间</th><th>操作</th></tr></thead><tbody id="schoolRecipeDemandRecordsBody"></tbody></table></div>
    <div class="pagination school-recipe-demand-records-pagination" id="schoolRecipeDemandRecordsPagination"></div>
  </section>`;
  const root = window.AppShell.mount({ title: '需求提交记录', content, variant: 'school', companyName: '静安第一中学', emptyText: '需求提交记录' });
  const page = root.querySelector('#schoolRecipeDemandRecordsPage');
  const datePickers = {
    submitted: window.DatePicker?.create?.({ input: page.querySelector('#schoolRecipeDemandRecordSubmittedDate'), panelId: 'schoolRecipeDemandRecordSubmittedDatePanel' }),
    usage: window.DatePicker?.create?.({ input: page.querySelector('#schoolRecipeDemandRecordUsageDate'), panelId: 'schoolRecipeDemandRecordUsageDatePanel' })
  };

  function getFilteredRecords() {
    return service.getAll().filter((record) => {
      if (state.keyword && !String(record.recordNo || '').includes(state.keyword)) return false;
      if (state.submittedDate && String(record.submittedAt || '').slice(0, 10) !== state.submittedDate) return false;
      if (state.usageDate && !(Array.isArray(record.dates) && record.dates.includes(state.usageDate))) return false;
      return true;
    });
  }

  function renderRows(records = getFilteredRecords()) {
    const pager = state.pagination?.getState() || { page: state.page, pageSize: state.pageSize };
    const start = (pager.page - 1) * pager.pageSize;
    const pageRecords = records.slice(start, start + pager.pageSize);
    const body = page.querySelector('#schoolRecipeDemandRecordsBody');
    body.innerHTML = pageRecords.length ? pageRecords.map((record) => `<tr>
      <td><button type="button" class="school-recipe-demand-record-number" data-action="detail" data-id="${escapeHtml(record.id)}"><strong>${escapeHtml(record.recordNo || '--')}</strong></button></td>
      <td class="school-recipe-demand-record-dates">${escapeHtml(dateText(record.dates))}</td>
      <td class="is-number">${number(record.studentPersonTimes)}</td>
      <td class="is-number">${number(record.teacherPersonTimes)}</td>
      <td class="is-number is-total">${number(record.totalPersonTimes)}</td>
      <td class="is-number">${number(record.productCount)}</td>
      <td class="is-number">${number(record.orders?.length)}</td>
      <td>${escapeHtml(record.submittedBy || '--')}</td>
      <td>${escapeHtml(record.submittedAt || '--')}</td>
      <td><button type="button" class="btn-text school-recipe-demand-record-view" data-action="detail" data-id="${escapeHtml(record.id)}">查看详情</button></td>
    </tr>`).join('') : '<tr><td class="school-recipe-demand-records-empty" colspan="10">暂无需求提交记录</td></tr>';
  }

  function refresh(resetPage = true) {
    const records = getFilteredRecords();
    state.pagination?.update({ total: records.length, ...(resetPage ? { page: 1 } : {}) });
    renderRows(records);
  }

  page.querySelector('#schoolRecipeDemandRecordsFilter').addEventListener('submit', (event) => {
    event.preventDefault();
    state.keyword = page.querySelector('#schoolRecipeDemandRecordKeyword').value.trim();
    state.submittedDate = page.querySelector('#schoolRecipeDemandRecordSubmittedDate').value || '';
    state.usageDate = page.querySelector('#schoolRecipeDemandRecordUsageDate').value || '';
    refresh(true);
  });
  page.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    if (button.dataset.action === 'detail') navigate(`./school-recipe-demand-record-detail.html?id=${encodeURIComponent(button.dataset.id || '')}`);
    if (button.dataset.action === 'reset') {
      state.keyword = '';
      state.submittedDate = '';
      state.usageDate = '';
      page.querySelector('#schoolRecipeDemandRecordKeyword').value = '';
      datePickers.submitted?.clear(false);
      datePickers.usage?.clear(false);
      refresh(true);
    }
  });
  state.pagination = window.Pagination?.create({
    container: '#schoolRecipeDemandRecordsPagination',
    total: getFilteredRecords().length,
    page: state.page,
    pageSize: state.pageSize,
    pageSizeOptions: [20, 50, 100],
    onChange: ({ page: nextPage, pageSize: nextPageSize }) => {
      state.page = nextPage;
      state.pageSize = nextPageSize;
      renderRows();
    }
  });
  renderRows();
})();
