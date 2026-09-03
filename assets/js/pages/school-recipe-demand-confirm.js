(function () {
  const demandService = window.SchoolRecipeDemandService;
  const recipeService = window.SchoolRecipeService;
  const attendanceService = window.SchoolRecipeAttendanceService;
  if (!demandService || !recipeService || !attendanceService) return;

  const weekdayNames = ['日', '一', '二', '三', '四', '五', '六'];
  const allMenus = recipeService.getAll().sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const menuDates = new Set(allMenus.map((menu) => menu.date));
  const requestedDate = new URLSearchParams(window.location.search).get('date') || '';
  const submittedDates = demandService.submittedDateSet();
  const dateSummaryFor = (date) => demandService.buildPreview([date]).dateSummaries[0] || null;
  const allDateSummaries = allMenus.map((menu) => dateSummaryFor(menu.date)).filter(Boolean);
  const filledDateSummaries = allDateSummaries.filter((summary) => Number(summary.calculation?.totalPeople || 0) > 0);
  const firstFilledDate = filledDateSummaries.find((summary) => !summary.submitted)?.date || '';
  const firstDate = allMenus[0]?.date || requestedDate || '2026-09-07';
  const dateObject = (date) => {
    const parsed = new Date(`${String(date || firstDate)}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? new Date(`${firstDate}T00:00:00`) : parsed;
  };
  const dateValue = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const monthStart = (value) => {
    const text = String(value || firstDate);
    return /^\d{4}-\d{2}/.test(text) ? `${text.slice(0, 7)}-01` : `${firstDate.slice(0, 7)}-01`;
  };
  const monthDates = (start) => {
    const date = dateObject(monthStart(start));
    const total = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    return Array.from({ length: total }, (_, index) => dateValue(new Date(date.getFullYear(), date.getMonth(), index + 1)));
  };
  const monthLabel = (start) => `${start.slice(0, 4)}年${start.slice(5, 7)}月`;
  const shiftMonth = (start, offset) => {
    const date = dateObject(monthStart(start));
    date.setMonth(date.getMonth() + offset);
    return dateValue(new Date(date.getFullYear(), date.getMonth(), 1));
  };
  const today = new Date();
  const currentMonthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
  const minMonthStart = shiftMonth(currentMonthStart, -1);
  const maxMonthStart = shiftMonth(currentMonthStart, 1);
  const initialDate = requestedDate && menuDates.has(requestedDate)
    ? requestedDate
    : firstFilledDate || allMenus[0]?.date || dateValue(today);
  const initialMonthStart = monthStart(initialDate);
  const state = {
    selectedDates: new Set(filledDateSummaries
      .filter((summary) => !summary.submitted)
      .map((summary) => summary.date)),
    monthStart: initialMonthStart,
    expectedAt: '',
    expectedAtManuallyChanged: false,
    submitting: false
  };
  const defaultExpectedAt = (dates = []) => {
    const earliest = [...new Set(dates)].sort()[0] || '';
    if (!earliest) return '';
    const date = dateObject(earliest);
    date.setDate(date.getDate() - 1);
    return dateValue(date);
  };
  const dateOnly = (value) => String(value || '').trim().slice(0, 10);
  const earliestDate = (dates = []) => [...new Set(dates)].sort()[0] || '';
  const expectedAtIsAllowed = (value, dates = []) => {
    const selected = dateOnly(value);
    const earliest = earliestDate(dates);
    return Boolean(selected && earliest && selected <= earliest);
  };
  state.expectedAt = defaultExpectedAt([...state.selectedDates]);
  let expectedAtPicker = null;

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  const number = (value) => Number(value || 0).toLocaleString('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
  const quantity = (value) => Number(value || 0).toLocaleString('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
  const currentCanteen = window.AppStorage?.read?.('school-recipe-current-canteen', window.SchoolOrderService?.CANTEEN_NAME || '第一食堂') || window.SchoolOrderService?.CANTEEN_NAME || '第一食堂';
  const calendarIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="17" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="9" x2="21" y2="9"></line></svg>';
  const weekday = (date) => weekdayNames[dateObject(date).getDay()];
  const dateLabel = (date) => `${date.slice(5, 7)}月${date.slice(8, 10)}日 星期${weekday(date)}`;
  const recipeName = (value) => String(value || '').replace(/\s*第\s*\d+\s*版\s*$/, '').trim();
  const filledMealNames = (summary) => (summary?.menu?.meals || [])
    .filter((meal) => {
      const values = summary?.attendance?.meals?.[meal.key] || {};
      return Number(values.student || 0) + Number(values.teacher || 0) > 0;
    })
    .map((meal) => meal.name)
    .join('、') || '--';
  const attendanceValue = (value) => value === '' || value == null ? '--' : number(value);
  const calendarChevronLeft = '<svg class="icon-svg school-recipe-demand-calendar-icon" viewBox="0 0 24 24" aria-hidden="true"><polyline points="15 18 9 12 15 6"></polyline></svg>';
  const calendarChevronRight = '<svg class="icon-svg school-recipe-demand-calendar-icon" viewBox="0 0 24 24" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg>';

  function navigate(url) {
    if (window.AppNavigationGuard?.navigate) window.AppNavigationGuard.navigate(url);
    else window.location.href = url;
  }

  function showToast(message, isError = false) {
    document.querySelector('.operations-toast')?.remove();
    const toast = document.createElement('div');
    toast.className = `operations-toast${isError ? ' error' : ''}`;
    toast.textContent = message;
    toast.setAttribute('role', 'status');
    document.body.appendChild(toast);
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.remove(), 2400);
  }

  function statusFor(summary) {
    if (!summary) return { label: '暂无菜谱', className: 'is-no-menu', disabled: true };
    if (summary.submitted) return { label: '已下单', className: 'is-submitted', disabled: true };
    if (summary.validation.canContinue) return { label: '可提交', className: 'is-ready', disabled: false };
    if (Number(summary.calculation?.totalPeople || 0) > 0) return { label: '未完成', className: 'is-warning', disabled: false };
    return { label: '未填写', className: 'is-disabled', disabled: true };
  }

  function renderDatePanel(dateSummaryMap) {
    const dates = monthDates(state.monthStart);
    const leadingEmptyDays = dateObject(state.monthStart).getDay();
    const previousMonth = shiftMonth(state.monthStart, -1);
    const nextMonth = shiftMonth(state.monthStart, 1);
    const canGoPrevious = previousMonth >= minMonthStart;
    const canGoNext = nextMonth <= maxMonthStart;
    const filledDays = dates.filter((date) => Number(dateSummaryMap.get(date)?.calculation?.totalPeople || 0) > 0).length;
    const cells = [...Array(leadingEmptyDays).fill(''), ...dates].map((date) => {
      if (!date) return '<span class="school-recipe-demand-calendar-date-placeholder" aria-hidden="true"></span>';
      const summary = dateSummaryMap.get(date) || null;
      const menu = menuDates.has(date);
      const status = statusFor(summary);
      const hasPeople = Number(summary?.calculation?.totalPeople || 0) > 0;
      const checked = state.selectedDates.has(date);
      const calendarClass = !menu ? 'is-empty is-no-menu' : summary?.submitted ? 'is-submitted' : !hasPeople ? 'is-empty' : summary.validation.canContinue ? 'is-complete' : 'is-partial';
      const disabled = !menu || !hasPeople || status.disabled;
      return `<button type="button" class="school-recipe-demand-calendar-date ${calendarClass} ${checked ? 'is-selected' : ''}" data-confirm-date="${escapeHtml(date)}" title="${escapeHtml(`${date} ${status.label}`)}" ${disabled ? 'disabled' : ''}>
        <span class="school-recipe-demand-calendar-date-number">${escapeHtml(String(Number(date.slice(8, 10))))}</span>
        <span class="school-recipe-demand-calendar-date-week${menu ? '' : ' is-hidden'}">${escapeHtml(weekday(date))}</span>
      </button>`;
    }).join('');
    return `<aside class="school-recipe-demand-date-panel" aria-label="选择提交日期">
      <div class="school-recipe-demand-calendar-heading"><div class="school-recipe-demand-calendar-actions"><button type="button" data-confirm-month="prev" aria-label="上一个月" title="上一个月" ${canGoPrevious ? '' : 'disabled'}>${calendarChevronLeft}</button><span class="school-recipe-demand-current-month">${escapeHtml(monthLabel(state.monthStart))}</span><button type="button" data-confirm-month="next" aria-label="下一个月" title="下一个月" ${canGoNext ? '' : 'disabled'}>${calendarChevronRight}</button></div></div>
      <div class="school-recipe-demand-calendar-caption"><span>本月菜谱</span><small>已填 ${number(filledDays)} 天</small></div>
      <div class="school-recipe-demand-calendar-weekdays" aria-hidden="true">${weekdayNames.map((name) => `<span>${escapeHtml(name)}</span>`).join('')}</div>
      <div class="school-recipe-demand-calendar-grid">${cells}</div>
      <div class="school-recipe-demand-calendar-legend"><span><i class="is-complete"></i>可提交</span><span><i class="is-partial"></i>未完成</span><span><i class="is-submitted"></i>已下单</span></div>
    </aside>`;
  }

  function renderAttendanceDetail(summary) {
    const meals = summary?.menu?.meals?.length ? summary.menu.meals : (attendanceService.mealTypes || []);
    const rows = meals.map((meal) => {
      const values = summary?.attendance?.meals?.[meal.key] || {};
      const hasStudent = values.student !== '' && values.student != null;
      const hasTeacher = values.teacher !== '' && values.teacher != null;
      const total = hasStudent || hasTeacher ? Number(values.student || 0) + Number(values.teacher || 0) : '--';
      return `<tr><td>${escapeHtml(meal.name)}</td><td class="is-number">${attendanceValue(values.student)}</td><td class="is-number">${attendanceValue(values.teacher)}</td><td class="is-number is-total">${typeof total === 'number' ? number(total) : total}</td></tr>`;
    }).join('');
    return `<div class="school-recipe-demand-attendance-detail"><table class="school-recipe-demand-attendance-detail-table"><colgroup><col class="col-meal"><col class="col-person"><col class="col-person"><col class="col-total"></colgroup><thead><tr><th>餐次</th><th>学生</th><th>教师</th><th>合计</th></tr></thead><tbody>${rows || '<tr><td colspan="4" class="school-recipe-demand-record-detail-empty-cell">暂无餐次填报记录</td></tr>'}</tbody></table></div>`;
  }

  function renderDateSummaryTable(preview) {
    const summaries = preview.dateSummaries
      .filter((summary) => Number(summary.calculation?.totalPeople || 0) > 0);
    const rows = summaries
      .map((summary, index) => {
        const cannotDelete = summary.submitted || summaries.length <= 1;
        const deleteTitle = summary.submitted ? '已下单日期不可删除' : summaries.length <= 1 ? '至少保留一个填报日期' : '删除该日期填报';
        const detailId = `schoolRecipeDemandConfirmDateDetail${index}`;
        return `<tr class="school-recipe-demand-date-row">
      <td class="school-recipe-demand-date-expand-cell"><button type="button" class="school-recipe-demand-date-expand-button" data-action="toggle-date" data-date="${escapeHtml(summary.date)}" aria-expanded="false" aria-controls="${detailId}" aria-label="展开 ${escapeHtml(summary.date)} 的餐次填报记录"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"></path></svg></button></td>
      <td><strong>${escapeHtml(dateLabel(summary.date))}</strong></td>
      <td>${escapeHtml(filledMealNames(summary))}</td>
      <td>${escapeHtml(recipeName(summary.menu?.name || summary.menu?.version || '--'))}</td>
      <td class="is-number">${number(summary.calculation.totalStudentPeople)}</td>
      <td class="is-number">${number(summary.calculation.totalTeacherPeople)}</td>
      <td class="is-number is-total">${number(summary.calculation.totalPeople)}</td>
      <td class="is-number">${number(summary.calculation.rows.filter((row) => row.mappingStatus === '已关联').length)}</td>
      <td class="school-recipe-demand-table-action"><button type="button" class="school-recipe-demand-delete" data-action="delete-attendance" data-date="${escapeHtml(summary.date)}" title="${escapeHtml(deleteTitle)}" ${cannotDelete ? 'disabled' : ''}>删除</button></td>
    </tr><tr id="${detailId}" class="school-recipe-demand-date-detail-row" data-date-detail-row hidden><td colspan="9">${renderAttendanceDetail(summary)}</td></tr>`;
      }).join('');
    return rows
      ? `<div class="school-recipe-demand-table-wrap"><table class="school-recipe-demand-table school-recipe-demand-date-table"><colgroup><col class="col-expand"><col class="col-date"><col class="col-meal"><col class="col-version"><col class="col-person"><col class="col-person"><col class="col-total"><col class="col-count"><col class="col-action"></colgroup><thead><tr><th aria-label="展开"></th><th>用料日期</th><th>填报餐次</th><th>食谱名称</th><th>学生人次</th><th>教师人次</th><th>总人次</th><th>商品种数</th><th>操作</th></tr></thead><tbody>${rows}</tbody></table></div>`
      : '<div class="school-recipe-demand-empty">暂无已填报日期</div>';
  }

  function renderProductTable(preview) {
    const rows = preview.rows
      .filter((row) => row.mappingStatus === '已关联')
      .map((row, index) => `<tr>
        <td>${index + 1}</td>
        <td class="school-recipe-demand-ingredient-name">${escapeHtml((row.ingredientNames || []).join('、') || '--')}</td>
        <td class="school-recipe-demand-product-name">${escapeHtml(row.productName || '--')}</td>
        <td>${escapeHtml(row.productCode || '--')}</td>
        <td>${escapeHtml(row.unit || '--')}</td>
        <td class="is-number">${quantity(row.studentQty)}</td>
        <td class="is-number">${quantity(row.teacherQty)}</td>
        <td class="is-number is-total">${quantity(row.totalQty)}</td>
        <td>${escapeHtml((row.sourceDates || []).map((date) => date.slice(5)).join('、') || '--')}</td>
      </tr>`).join('');
    return rows
      ? `<div class="school-recipe-demand-table-wrap"><table class="school-recipe-demand-table school-recipe-demand-product-table"><colgroup><col class="col-index"><col class="col-ingredient"><col class="col-product"><col class="col-code"><col class="col-unit"><col class="col-quantity"><col class="col-quantity"><col class="col-total"><col class="col-source-date"></colgroup><thead><tr><th>序号</th><th>来源食材</th><th>采购商品</th><th>商品编号</th><th>单位</th><th>学生需求量</th><th>教职工需求量</th><th>需求总量</th><th>来源日期</th></tr></thead><tbody>${rows}</tbody></table></div>`
      : '<div class="school-recipe-demand-empty">当前选中日期暂无可提交的商品需求</div>';
  }

  function renderDetail(preview) {
    if (!preview.dates.length) {
      return `<main class="school-recipe-demand-detail-panel"><header class="school-recipe-demand-detail-header"><button type="button" class="back-link school-recipe-demand-back" data-action="back"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"></path><path d="M19 12H9"></path></svg><span>返回</span></button><h1>需求确认</h1></header><div class="school-recipe-demand-empty-state"><div class="operation-empty-icon"><svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="17" rx="2"></rect><line x1="8" y1="2" x2="8" y2="6"></line><line x1="16" y1="2" x2="16" y2="6"></line><line x1="3" y1="9" x2="21" y2="9"></line></svg></div><p>请从上方或左侧选择已填报的日期</p></div></main>`;
    }
    return `<main class="school-recipe-demand-detail-panel" aria-label="需求确认详情">
      <header class="school-recipe-demand-detail-header"><button type="button" class="back-link school-recipe-demand-back" data-action="back"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"></path><path d="M19 12H9"></path></svg><span>返回</span></button><h1>需求确认</h1></header>
      <div class="school-recipe-demand-detail-scroll">
        <div class="school-recipe-demand-meta"><div class="school-recipe-demand-canteen-summary"><span>用料食堂：</span><strong>${escapeHtml(currentCanteen)}</strong></div><div class="operations-field school-recipe-demand-delivery-field"><label class="filter-label" for="schoolRecipeExpectedAt">期望送达时间</label><div class="date-input-control"><input class="filter-input" id="schoolRecipeExpectedAt" type="text" value="${escapeHtml(state.expectedAt)}" placeholder="请选择日期" readonly aria-label="期望送达时间"><span class="date-range-icon" aria-hidden="true">${calendarIcon}</span></div></div></div>
        <section class="school-recipe-demand-section school-recipe-demand-date-summary-section"><header><div><span class="section-title-mark">用料日期汇总</span></div></header>${renderDateSummaryTable(preview)}</section>
        <section class="school-recipe-demand-section"><header><div><span class="section-title-mark">商品需求汇总</span></div></header>${renderProductTable(preview)}</section>
      </div>
      <footer class="school-recipe-demand-actions"><button type="button" class="btn btn-sm" data-action="back">返回</button><button type="button" class="btn btn-primary btn-sm" data-action="submit" ${preview.canSubmit && expectedAtIsAllowed(state.expectedAt, preview.dates) && !state.submitting ? '' : 'disabled'}>${state.submitting ? '提交中…' : '提交需求'}</button></footer>
    </main>`;
  }

  const content = `<section class="page-card school-recipe-demand-confirm-page" id="schoolRecipeDemandConfirmPage" aria-label="需求确认"><div class="school-recipe-demand-confirm-body" id="schoolRecipeDemandConfirmBody"></div></section>`;
  const root = window.AppShell.mount({ title: '需求确认', content, variant: 'school', companyName: '静安第一中学', emptyText: '需求确认' });
  const page = root.querySelector('#schoolRecipeDemandConfirmPage');
  const body = page.querySelector('#schoolRecipeDemandConfirmBody');

  function syncExpectedAt(preview) {
    const fallback = defaultExpectedAt(preview.dates);
    if (!state.expectedAt || !state.expectedAtManuallyChanged || !expectedAtIsAllowed(state.expectedAt, preview.dates)) {
      state.expectedAt = fallback;
      state.expectedAtManuallyChanged = false;
    }
  }

  function mountExpectedAtPicker(preview) {
    const input = body.querySelector('#schoolRecipeExpectedAt');
    if (!input || !window.DatePicker?.mount) return;
    const earliest = earliestDate(preview.dates);
    expectedAtPicker = window.DatePicker.mount({
      input,
      panelId: 'schoolRecipeExpectedAtPickerPanel',
      maxDate: earliest,
      onChange(value) {
        const selected = dateOnly(value);
        if (!selected || !expectedAtIsAllowed(selected, preview.dates)) {
          state.expectedAt = defaultExpectedAt(preview.dates);
          state.expectedAtManuallyChanged = false;
          expectedAtPicker?.setValue(state.expectedAt, false);
          if (selected) showToast('期望送达时间不能晚于最早用料日期', true);
          return;
        }
        state.expectedAt = selected;
        state.expectedAtManuallyChanged = true;
      }
    });
  }

  function renderBody() {
    const preview = demandService.buildPreview([...state.selectedDates]);
    expectedAtPicker?.destroy();
    expectedAtPicker = null;
    syncExpectedAt(preview);
    body.innerHTML = renderDetail(preview);
    mountExpectedAtPicker(preview);
  }

  page.addEventListener('change', (event) => {
    const checkbox = event.target.closest('[data-confirm-date]');
    if (!checkbox) return;
    const date = checkbox.dataset.confirmDate;
    if (checkbox.checked) state.selectedDates.add(date);
    else state.selectedDates.delete(date);
    renderBody();
  });

  page.addEventListener('click', async (event) => {
    const monthButton = event.target.closest('[data-confirm-month]');
    if (monthButton) {
      if (monthButton.disabled) return;
      const offset = monthButton.dataset.confirmMonth === 'prev' ? -1 : 1;
      state.monthStart = shiftMonth(state.monthStart, offset);
      renderBody();
      return;
    }
    const dateButton = event.target.closest('button[data-confirm-date]');
    if (dateButton) {
      if (dateButton.disabled) return;
      const date = dateButton.dataset.confirmDate;
      if (state.selectedDates.has(date)) state.selectedDates.delete(date);
      else state.selectedDates.add(date);
      renderBody();
      return;
    }
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    if (action === 'toggle-date') {
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
    if (action === 'back') {
      navigate('./school-recipe-attendance.html');
      return;
    }
    if (action === 'delete-attendance') {
      const date = button.dataset.date;
      const selectedDateCount = [...state.selectedDates]
        .filter((selectedDate) => Number(dateSummaryFor(selectedDate)?.calculation?.totalPeople || 0) > 0)
        .length;
      if (button.disabled || submittedDates.has(date) || selectedDateCount <= 1) return;
      if (!attendanceService.remove(date)) {
        showToast('未找到该日期的填报数据', true);
        return;
      }
      state.selectedDates.delete(date);
      renderBody();
      showToast(`${date} 的人数填报已删除`);
      return;
    }
    if (action !== 'submit' || state.submitting) return;
    const preview = demandService.buildPreview([...state.selectedDates]);
    if (!preview.canSubmit) {
      showToast(preview.message || '请先完成需求确认', true);
      return;
    }
    if (!expectedAtIsAllowed(state.expectedAt, preview.dates)) {
      showToast('请选择不晚于最早用料日期的期望送达时间', true);
      return;
    }
    state.submitting = true;
    renderBody();
    try {
      const result = await demandService.submit([...state.selectedDates], { expectedAt: state.expectedAt });
      navigate(`./school-recipe-demand-record-detail.html?id=${encodeURIComponent(result.record.id)}`);
    } catch (error) {
      state.submitting = false;
      renderBody();
      showToast(error.message || '提交失败，请稍后重试', true);
    }
  });

  renderBody();
})();
