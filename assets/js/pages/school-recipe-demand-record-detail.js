(function () {
  const service = window.SchoolRecipeDemandService;
  if (!service) return;
  const id = new URLSearchParams(window.location.search).get('id') || '';
  const record = service.get(id);
  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  const number = (value) => Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const quantity = (value) => Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const productDisplay = (item) => window.DomUtils?.formatProductDisplay
    ? window.DomUtils.formatProductDisplay(item)
    : `${item?.productName || '--'}（${item?.unit || '--'}/--/--）`;
  const purchaseQuantity = (value) => {
    const amount = Number(value);
    return Number.isFinite(amount) ? Math.ceil(amount).toLocaleString('zh-CN') : '--';
  };
  const dateText = (dates = []) => dates.length > 3 ? `${dates.slice(0, 3).join('、')} 等${dates.length}天` : dates.join('、') || '--';

  function navigate(url) {
    if (window.AppNavigationGuard?.navigate) window.AppNavigationGuard.navigate(url);
    else window.location.href = url;
  }

  function infoItem(label, value) {
    const displayValue = value == null || value === '' ? '--' : value;
    return `<div class="info-item"><span class="info-label">${escapeHtml(label)}：</span><span class="info-value">${escapeHtml(displayValue)}</span></div>`;
  }

  function renderEmpty() {
    return `<section class="page-card processing-detail-page school-recipe-demand-record-detail-page" id="schoolRecipeDemandRecordDetailPage"><header class="processing-detail-page-header"><button type="button" class="back-link" data-action="back"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"></path><path d="M19 12H9"></path></svg><span>返回</span></button><h1>需求提交记录详情</h1></header><div class="processing-detail-page-body school-recipe-demand-record-detail-empty"><p>未找到该需求提交记录</p><button type="button" class="btn btn-sm" data-action="back">返回</button></div></section>`;
  }

  function attendanceValue(value) {
    return value === '' || value == null ? '--' : number(value);
  }

  function renderAttendanceDetail(summary) {
    const attendanceService = window.SchoolRecipeAttendanceService;
    const recipeService = window.SchoolRecipeService;
    const attendance = summary.attendance || attendanceService?.get?.(summary.date) || {};
    const menu = recipeService?.getMenu?.(summary.date);
    const fallbackMeals = attendanceService?.mealTypes || [
      { key: 'breakfast', name: '早餐' },
      { key: 'lunch', name: '午餐' },
      { key: 'dinner', name: '晚餐' },
      { key: 'snack', name: '加餐' }
    ];
    const meals = menu?.meals?.length ? menu.meals : fallbackMeals;
    const rows = meals.map((meal) => {
      const values = attendance.meals?.[meal.key] || {};
      const hasStudent = values.student !== '' && values.student != null;
      const hasTeacher = values.teacher !== '' && values.teacher != null;
      const total = hasStudent || hasTeacher ? Number(values.student || 0) + Number(values.teacher || 0) : '--';
      return `<tr><td>${escapeHtml(meal.name)}</td><td class="is-number">${attendanceValue(values.student)}</td><td class="is-number">${attendanceValue(values.teacher)}</td><td class="is-number is-total">${typeof total === 'number' ? number(total) : total}</td></tr>`;
    }).join('');
    return `<div class="school-recipe-demand-attendance-detail"><table class="school-recipe-demand-attendance-detail-table"><colgroup><col class="col-meal"><col class="col-person"><col class="col-person"><col class="col-total"></colgroup><thead><tr><th>餐次</th><th>学生</th><th>教师</th><th>合计</th></tr></thead><tbody>${rows || '<tr><td colspan="4" class="school-recipe-demand-record-detail-empty-cell">暂无餐次填报记录</td></tr>'}</tbody></table></div>`;
  }

  function renderDateRows() {
    return (record.dateSummaries || []).map((summary, index) => {
      const detailId = `schoolRecipeDemandDateDetail${index}`;
      return `<tr class="school-recipe-demand-date-row"><td class="school-recipe-demand-date-expand-cell"><button type="button" class="school-recipe-demand-date-expand-button" data-action="toggle-date" data-date="${escapeHtml(summary.date)}" aria-expanded="false" aria-controls="${detailId}" aria-label="展开 ${escapeHtml(summary.date)} 的餐次填报记录"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"></path></svg></button></td><td><strong>${escapeHtml(summary.date)}</strong></td><td class="is-number">${number(summary.studentPersonTimes)}</td><td class="is-number">${number(summary.teacherPersonTimes)}</td><td class="is-number is-total">${number(summary.totalPersonTimes)}</td><td class="is-number">${number(summary.productCount)}</td></tr><tr id="${detailId}" class="school-recipe-demand-date-detail-row" data-date-detail-row hidden><td colspan="6">${renderAttendanceDetail(summary)}</td></tr>`;
    }).join('') || '<tr><td colspan="6" class="school-recipe-demand-record-detail-empty-cell">暂无日期明细</td></tr>';
  }

  function renderProductRows() {
    return (record.items || []).filter((row) => row.mappingStatus === '已关联').map((row, index) => `<tr><td>${index + 1}</td><td class="school-recipe-demand-detail-ingredient-name">${escapeHtml((row.ingredientNames || []).join('、') || '--')}</td><td class="school-recipe-demand-detail-product-name">${escapeHtml(productDisplay(row))}</td><td>${escapeHtml(row.productCode || '--')}</td><td>${escapeHtml(row.unit || '--')}</td><td class="is-number">${quantity(row.studentQty)}</td><td class="is-number">${quantity(row.teacherQty)}</td><td class="is-number is-total">${quantity(row.totalQty)}</td><td class="is-number">${purchaseQuantity(row.totalQty)}</td></tr>`).join('') || '<tr><td colspan="9" class="school-recipe-demand-record-detail-empty-cell">暂无商品明细</td></tr>';
  }

  function renderOrderRows() {
    return (record.orders || []).map((order) => {
      const orderNumber = escapeHtml(order.orderNo || '--');
      const orderCell = `<button type="button" class="school-recipe-demand-order-link" data-action="order" data-id="${escapeHtml(order.orderId)}">${orderNumber}</button>`;
      return `<tr><td>${orderCell}</td><td>${escapeHtml(order.date || '--')}</td><td>${escapeHtml(order.participantType || '--')}</td><td>${escapeHtml(order.orderTag || '--')}</td></tr>`;
    }).join('') || '<tr><td colspan="4" class="school-recipe-demand-record-detail-empty-cell">暂无关联订单</td></tr>';
  }

  const content = record ? `<section class="page-card processing-detail-page school-recipe-demand-record-detail-page" id="schoolRecipeDemandRecordDetailPage" aria-label="需求提交记录详情">
    <header class="processing-detail-page-header"><button type="button" class="back-link" data-action="back"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"></path><path d="M19 12H9"></path></svg><span>返回</span></button><h1>需求提交记录详情</h1></header>
    <div class="processing-detail-page-body">
      <div class="processing-detail-section"><h3>基本信息</h3><div class="processing-detail-info school-recipe-demand-detail-info">${infoItem('记录编号', record.recordNo)}${infoItem('用料日期', dateText(record.dates))}${infoItem('学校', record.schoolName)}${infoItem('食堂', record.canteen)}${infoItem('操作人', record.submittedBy)}${infoItem('提交时间', record.submittedAt)}${infoItem('需求商品种数', number(record.productCount))}${infoItem('生成订单数', number(record.orders?.length))}</div></div>
      ${record.enterpriseSyncWarnings?.length ? `<div class="school-recipe-demand-detail-notice is-warning">企业端同步提示：${escapeHtml(record.enterpriseSyncWarnings.join('；'))}</div>` : ''}
      <div class="processing-detail-section"><div class="school-recipe-demand-detail-section-heading"><h3>关联订单</h3></div><div class="school-recipe-demand-detail-table-wrap"><table class="processing-detail-table school-recipe-demand-detail-table school-recipe-demand-order-table"><colgroup><col class="col-order-no"><col class="col-date"><col class="col-participant"><col class="col-tag"></colgroup><thead><tr><th>订单号</th><th>期望送达日期</th><th>就餐人员</th><th>订单标签</th></tr></thead><tbody>${renderOrderRows()}</tbody></table></div></div>
      <div class="processing-detail-section school-recipe-demand-date-detail-section"><div class="school-recipe-demand-detail-section-heading"><h3>用料日期明细</h3></div><div class="school-recipe-demand-detail-table-wrap"><table class="processing-detail-table school-recipe-demand-detail-table"><colgroup><col class="col-expand"><col class="col-date"><col class="col-person"><col class="col-person"><col class="col-total"><col class="col-product"></colgroup><thead><tr><th aria-label="展开"></th><th>用料日期</th><th>学生人次</th><th>教师人次</th><th>总人次</th><th>商品种数</th></tr></thead><tbody>${renderDateRows()}</tbody></table></div></div>
      <div class="processing-detail-section"><div class="school-recipe-demand-detail-section-heading"><h3>商品需求明细</h3></div><div class="school-recipe-demand-detail-table-wrap"><table class="processing-detail-table school-recipe-demand-detail-table school-recipe-demand-detail-product-table"><colgroup><col class="col-index"><col class="col-ingredient"><col class="col-product"><col class="col-code"><col class="col-unit"><col class="col-quantity"><col class="col-quantity"><col class="col-total"><col class="col-purchase"></colgroup><thead><tr><th>序号</th><th>来源食材</th><th>商品名称（计量单位/品牌/规格）</th><th>商品编号</th><th>单位</th><th>学生需求量</th><th>教师需求量</th><th>需求总量</th><th>采购数量</th></tr></thead><tbody>${renderProductRows()}</tbody></table></div></div>
    </div>
    <footer class="processing-form-footer processing-detail-footer"><button type="button" class="btn btn-sm" data-action="back">返回</button></footer>
  </section>` : renderEmpty();
  const root = window.AppShell.mount({ title: '需求提交记录详情', content, variant: 'school', companyName: '静安第一中学', emptyText: '需求提交记录详情' });
  const page = root.querySelector('#schoolRecipeDemandRecordDetailPage');
  page?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    if (button.dataset.action === 'toggle-date') {
      const dateRow = button.closest('.school-recipe-demand-date-row');
      const detailRow = dateRow?.nextElementSibling;
      if (!dateRow || !detailRow?.matches('[data-date-detail-row]')) return;
      const expanded = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!expanded));
      button.setAttribute('aria-label', `${expanded ? '展开' : '收起'} ${button.dataset.date || ''} 的餐次填报记录`);
      dateRow.classList.toggle('is-expanded', !expanded);
      detailRow.hidden = expanded;
      return;
    }
    if (button.dataset.action === 'back') navigate('./school-recipe-demand-records.html');
    if (button.dataset.action === 'order') navigate(`./school-order-detail.html?id=${encodeURIComponent(button.dataset.id || '')}`);
  });
})();
