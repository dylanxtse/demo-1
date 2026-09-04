(function () {
  const recipeService = window.SchoolRecipeService;
  const attendanceService = window.SchoolRecipeAttendanceService;
  if (!recipeService || !attendanceService) return;

  const allMenus = recipeService.getAll();
  const firstDate = allMenus[0]?.date || '2026-09-07';
  const weekdayNames = ['日', '一', '二', '三', '四', '五', '六'];
  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
  const number = (value) => Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2, useGrouping: false });
  const quantity = (value) => Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2, useGrouping: false });
  const productDisplay = (item) => window.DomUtils?.formatProductDisplay
    ? window.DomUtils.formatProductDisplay(item)
    : `${item?.productName || '--'}（${item?.unit || '--'}/--/--）`;
  const purchaseQuantity = (value) => {
    const amount = Number(value);
    return Number.isFinite(amount) ? Math.ceil(amount) : 0;
  };
  const weekday = (date) => weekdayNames[new Date(`${date}T00:00:00`).getDay()];
  const longDate = (date) => `${date.slice(0, 4)}年${date.slice(5, 7)}月${date.slice(8, 10)}日 星期${weekday(date)}`;
  const parseDate = (value) => {
    const parsed = new Date(`${String(value || firstDate)}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? new Date(`${firstDate}T00:00:00`) : parsed;
  };
  const dateValue = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const monthStart = (value) => {
    const text = String(value || firstDate);
    return /^\d{4}-\d{2}/.test(text) ? `${text.slice(0, 7)}-01` : `${firstDate.slice(0, 7)}-01`;
  };
  const monthDates = (start) => {
    const date = parseDate(monthStart(start));
    const total = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    return Array.from({ length: total }, (_, index) => dateValue(new Date(date.getFullYear(), date.getMonth(), index + 1)));
  };
  const monthLabel = (start) => `${start.slice(0, 4)}年${start.slice(5, 7)}月`;
  const shiftMonth = (start, offset) => {
    const date = parseDate(monthStart(start));
    date.setMonth(date.getMonth() + offset);
    return dateValue(new Date(date.getFullYear(), date.getMonth(), 1));
  };
  const menuForDate = (date) => allMenus.find((menu) => menu.date === date) || null;

  const canteenStorageKey = 'school-recipe-current-canteen';
  const defaultCanteen = window.SchoolOrderService?.CANTEEN_NAME || '第一食堂';
  function readCanteenNames() {
    let source = null;
    try {
      const saved = JSON.parse(window.localStorage.getItem('school-canteens-v1') || 'null');
      if (Array.isArray(saved) && saved.length) source = saved;
    } catch (error) { /* file:// 存储不可用时使用页面种子数据 */ }
    source = source || window.SchoolReferenceData?.canteens || window.SchoolOrderService?.canteens || [];
    const names = [...new Set(source
      .map((item) => typeof item === 'string' ? item : item?.name)
      .filter(Boolean)
      .filter((name) => name !== '默认'))];
    return names.length ? names : [defaultCanteen];
  }
  const canteenNames = readCanteenNames();
  if (!canteenNames.includes(defaultCanteen)) canteenNames.unshift(defaultCanteen);
  const storedCanteen = window.AppStorage?.read?.(canteenStorageKey, '') || '';

  const today = new Date();
  const todayMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const currentMonthStart = `${todayMonth}-01`;
  const minMonthStart = shiftMonth(currentMonthStart, -1);
  const maxMonthStart = shiftMonth(currentMonthStart, 1);
  const defaultMonth = `${todayMonth}-01`;
  const defaultDate = allMenus.find((menu) => String(menu.date).startsWith(todayMonth))?.date || dateValue(today);
  const state = { selectedDate: defaultDate, monthStart: defaultMonth, canteen: canteenNames.includes(storedCanteen) ? storedCanteen : defaultCanteen, attendanceByDate: {} };
  allMenus.forEach((menu) => { state.attendanceByDate[menu.date] = attendanceService.get(menu.date); });
  state.attendance = clone(state.attendanceByDate[defaultDate] || attendanceService.get(defaultDate));
  let dishTooltip = null;

  function attendanceForDate(date) {
    if (date === state.selectedDate) return state.attendance;
    return state.attendanceByDate[date] || attendanceService.get(date);
  }

  function statusForDate(date) {
    const menu = menuForDate(date);
    if (!menu) return { key: 'no-menu', label: '无菜谱' };
    const status = attendanceService.status(menu, attendanceForDate(date));
    return { ...status, label: status.key === 'empty' ? '待填' : status.label };
  }

  function syncCurrentDraftFromInputs(page) {
    page.querySelectorAll('[data-attendance-field]').forEach((input) => {
      const mealKey = input.dataset.mealKey;
      const type = input.dataset.attendanceField;
      if (!mealKey || !type) return;
      if (!state.attendance.meals) state.attendance.meals = {};
      if (!state.attendance.meals[mealKey]) state.attendance.meals[mealKey] = {};
      state.attendance.meals[mealKey][type] = input.value === '' ? '' : input.value;
    });
    state.attendanceByDate[state.selectedDate] = state.attendance;
  }

  function renderOverview(menu) {
    const record = attendanceForDate(state.selectedDate);
    const calculation = attendanceService.calculate(menu, record);
    return `${renderCanteenTabs()}<div class="school-recipe-attendance-overview" id="schoolRecipeAttendanceOverview" aria-label="就餐人数填报概况">
      <div class="school-recipe-attendance-overview-fields">
        <div class="school-recipe-attendance-overview-item school-recipe-attendance-date"><span class="school-recipe-attendance-overview-label">用料日期：</span><strong>${escapeHtml(menu ? longDate(menu.date) : longDate(state.selectedDate))}</strong></div>
        <div class="school-recipe-attendance-overview-item school-recipe-attendance-overview-total"><span class="school-recipe-attendance-overview-label">总就餐人次：</span><strong id="schoolRecipeAttendanceOverviewTotal">${number(calculation.totalPeople)}</strong></div>
      </div>
    </div>`;
  }

  function renderCanteenTabs() {
    return `<div class="school-recipe-canteen-switch" aria-label="当前食堂"><div class="school-recipe-canteen-tabs" role="tablist" aria-label="切换食堂">${canteenNames.map((name) => `<button type="button" class="school-recipe-canteen-tab${name === state.canteen ? ' is-active' : ''}" role="tab" aria-selected="${name === state.canteen}" data-recipe-canteen="${escapeHtml(name)}">${escapeHtml(name)}</button>`).join('')}</div></div>`;
  }

  function renderCalendar() {
    const dates = monthDates(state.monthStart);
    const leadingEmptyDays = parseDate(state.monthStart).getDay();
    const previousMonth = shiftMonth(state.monthStart, -1);
    const nextMonth = shiftMonth(state.monthStart, 1);
    const canGoPrevious = previousMonth >= minMonthStart;
    const canGoNext = nextMonth <= maxMonthStart;
    const cells = [...Array(leadingEmptyDays).fill(''), ...dates].map((date) => {
      if (!date) return '<span class="school-recipe-attendance-date-placeholder" aria-hidden="true"></span>';
      const menu = menuForDate(date);
      const status = statusForDate(date);
      const hideWeekday = status.key === 'empty' || status.key === 'no-menu';
      return `<button type="button" class="school-recipe-attendance-date-item ${date === state.selectedDate ? 'is-selected' : ''} ${menu ? '' : 'is-empty'} is-${escapeHtml(status.key)}" data-attendance-date="${escapeHtml(date)}" title="${escapeHtml(`${date} ${status.label}`)}">
        <span class="school-recipe-attendance-date-number">${escapeHtml(String(Number(date.slice(8, 10))))}</span>
        <span class="school-recipe-attendance-date-week${hideWeekday ? ' is-hidden' : ''}">${escapeHtml(weekday(date))}</span>
      </button>`;
    }).join('');
    return `<aside class="school-recipe-attendance-date-panel" aria-label="就餐人数填报日期">
      <div class="school-recipe-attendance-panel-heading"><div class="school-recipe-attendance-calendar-actions"><button type="button" data-attendance-month="prev" aria-label="上一个月" title="上一个月" ${canGoPrevious ? '' : 'disabled'}><svg class="icon-svg school-recipe-attendance-calendar-icon" viewBox="0 0 24 24" aria-hidden="true"><polyline points="15 18 9 12 15 6"></polyline></svg></button><span class="school-recipe-attendance-current-month">${escapeHtml(monthLabel(state.monthStart))}</span><button type="button" data-attendance-month="next" aria-label="下一个月" title="下一个月" ${canGoNext ? '' : 'disabled'}><svg class="icon-svg school-recipe-attendance-calendar-icon" viewBox="0 0 24 24" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg></button></div></div>
      <div class="school-recipe-attendance-calendar-caption"><span>本月菜谱</span></div>
      <div class="school-recipe-attendance-calendar-weekdays" aria-hidden="true">${weekdayNames.map((name) => `<span>${escapeHtml(name)}</span>`).join('')}</div>
      <div class="school-recipe-attendance-date-list">${cells}</div>
    </aside>`;
  }

  function mealField(record, mealKey, type) { return record?.meals?.[mealKey]?.[type] ?? ''; }

  function renderMealTable(meals, record) {
    const rows = meals.map((meal) => {
      const student = mealField(record, meal.key, 'student');
      const teacher = mealField(record, meal.key, 'teacher');
      const total = Number(student || 0) + Number(teacher || 0);
      const dishNames = (meal.dishes || []).map((dish) => dish.name).join('、');
      return `<tr data-attendance-meal="${escapeHtml(meal.key)}">
        <td class="school-recipe-attendance-meal-name"><strong>${escapeHtml(meal.name)}</strong></td>
        <td class="school-recipe-attendance-dish-cell" data-dishes="${escapeHtml(dishNames)}">${escapeHtml(dishNames || '暂无菜品')}</td>
        <td><div class="school-recipe-attendance-table-input"><input type="number" min="1" max="100000" step="1" inputmode="numeric" value="${escapeHtml(student)}" placeholder="请输入" data-attendance-field="student" data-meal-key="${escapeHtml(meal.key)}" aria-label="${escapeHtml(meal.name)}学生人数"><i>人</i></div></td>
        <td><div class="school-recipe-attendance-table-input"><input type="number" min="1" max="100000" step="1" inputmode="numeric" value="${escapeHtml(teacher)}" placeholder="请输入" data-attendance-field="teacher" data-meal-key="${escapeHtml(meal.key)}" aria-label="${escapeHtml(meal.name)}教职工人数"><i>人</i></div></td>
        <td class="school-recipe-attendance-meal-total-cell"><strong data-attendance-meal-total="${escapeHtml(meal.key)}">${number(total)}</strong><i>人</i></td>
      </tr>`;
    }).join('');
    return `<div class="school-recipe-attendance-meal-table-wrap"><table class="school-recipe-attendance-meal-table"><colgroup><col class="col-meal"><col class="col-dishes"><col class="col-person"><col class="col-person"><col class="col-meal-total"></colgroup><thead><tr><th rowspan="2">餐次</th><th rowspan="2">当餐菜品</th><th colspan="2">就餐人数</th><th rowspan="2">本餐合计</th></tr><tr><th>学生</th><th>教职工</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function renderNotice(menu, record) {
    if (!menu) return '';
    const validation = attendanceService.validate(menu, record);
    if (validation.missingMappings.length) {
      return `<div class="school-recipe-attendance-notice is-warning"><span class="school-recipe-attendance-notice-icon">!</span><div><strong>存在未关联商品</strong><p>${escapeHtml(validation.missingMappings.join('、'))}尚未关联采购商品，请先在营养膳食管理平台完成关联后重新同步。</p></div></div>`;
    }
    return '';
  }

  function renderDemand(menu, record) {
    if (!menu) return '<div class="school-recipe-attendance-empty">请选择有菜谱的日期</div>';
    const calculation = attendanceService.calculate(menu, record);
    const rows = calculation.rows
      .filter((row) => Number(row.studentQty || 0) > 0 || Number(row.teacherQty || 0) > 0)
      .map((row, index) => `<tr>
      <td>${index + 1}</td>
      <td class="school-recipe-attendance-ingredient-name">${escapeHtml(row.ingredientNames.join('、'))}</td>
      <td class="school-recipe-attendance-product-name">${escapeHtml(productDisplay(row))}</td>
      <td>${escapeHtml(row.productCode || '--')}</td>
        <td>${escapeHtml(row.unit)}</td>
        <td class="is-number">${quantity(row.studentQty)}</td>
        <td class="is-number">${purchaseQuantity(row.studentQty)}</td>
        <td class="is-number">${quantity(row.teacherQty)}</td>
        <td class="is-number">${purchaseQuantity(row.teacherQty)}</td>
    </tr>`).join('');
    return rows ? `<div class="school-recipe-attendance-table-wrap"><table class="school-recipe-attendance-table"><colgroup><col class="col-index"><col class="col-ingredient"><col class="col-product"><col class="col-code"><col class="col-unit"><col class="col-quantity"><col class="col-purchase"><col class="col-quantity"><col class="col-purchase"></colgroup><thead><tr><th>序号</th><th>来源食材</th><th>商品名称（计量单位/品牌/规格）</th><th>商品编号</th><th>单位</th><th>学生需求量</th><th>学生采购数量</th><th>教职工需求量</th><th>教职工采购数量</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<div class="school-recipe-attendance-empty">当前食谱暂无关联商品</div>';
  }

  function renderDetail(menu) {
    const record = attendanceForDate(state.selectedDate);
    const calculation = attendanceService.calculate(menu, record);
    const validation = attendanceService.validate(menu, record);
    const meals = menu?.meals || [];
    if (!menu) return `<main class="school-recipe-attendance-detail-panel">${renderOverview(menu)}<div class="school-recipe-attendance-detail-empty"><div class="operation-empty-icon"><svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div><p>请选择有菜谱的日期</p></div></main>`;
    return `<main class="school-recipe-attendance-detail-panel" aria-label="就餐人数填报详情">
      ${renderOverview(menu)}
      <div class="school-recipe-attendance-detail-scroll">
        <div class="school-recipe-attendance-section-heading"><div><span class="section-title-mark">餐次就餐人数</span></div></div>
        ${renderNotice(menu, record)}
        ${renderMealTable(meals, record)}
        <section class="school-recipe-attendance-demand-section" aria-label="商品需求测算"><header><div><span class="section-title-mark">商品需求测算</span></div></header><div id="schoolRecipeAttendanceDemand">${renderDemand(menu, record)}</div></section>
      </div>
      <footer class="school-recipe-attendance-actions"><div class="school-recipe-attendance-confirm-action"><button type="button" class="btn btn-sm" data-attendance-action="reset">重置</button><button type="button" class="btn btn-primary btn-sm ${validation.canContinue ? '' : 'btn-disabled'}" data-attendance-action="continue" ${validation.canContinue ? '' : 'disabled'}>确认需求</button></div></footer>
    </main>`;
  }

  function renderBody(root) {
    const body = root.querySelector('#schoolRecipeAttendanceBody');
    hideDishTooltip();
    if (!body) return;
    body.innerHTML = `${renderCalendar()}${renderDetail(menuForDate(state.selectedDate))}`;
  }

  function updateLiveView(page) {
    const menu = menuForDate(state.selectedDate);
    if (!menu) return;
    const record = attendanceForDate(state.selectedDate);
    const calculation = attendanceService.calculate(menu, record);
    const validation = attendanceService.validate(menu, record);
    const demand = page.querySelector('#schoolRecipeAttendanceDemand');
    if (demand) demand.innerHTML = renderDemand(menu, record);
    const overviewTotal = page.querySelector('#schoolRecipeAttendanceOverviewTotal');
    if (overviewTotal) overviewTotal.textContent = number(calculation.totalPeople);
    const continueButton = page.querySelector('[data-attendance-action="continue"]');
    if (continueButton) {
      continueButton.disabled = !validation.canContinue;
      continueButton.classList.toggle('btn-disabled', !validation.canContinue);
    }
    page.querySelectorAll('[data-attendance-meal-total]').forEach((element) => {
      const values = record.meals?.[element.dataset.attendanceMealTotal] || {};
      element.textContent = number(Number(values.student || 0) + Number(values.teacher || 0));
    });
    const notice = page.querySelector('.school-recipe-attendance-notice');
    if (notice) notice.outerHTML = renderNotice(menu, record);
    updateCalendarStatus(page);
  }

  function updateCalendarStatus(page) {
    const dateItem = [...page.querySelectorAll('[data-attendance-date]')]
      .find((item) => item.dataset.attendanceDate === state.selectedDate);
    if (!dateItem) return;
    const menu = menuForDate(state.selectedDate);
    const status = statusForDate(state.selectedDate);
    dateItem.classList.remove('is-no-menu', 'is-empty', 'is-partial', 'is-complete');
    dateItem.classList.add(`is-${status.key}`);
    if (!menu) dateItem.classList.add('is-empty');
    const weekdayElement = dateItem.querySelector('.school-recipe-attendance-date-week');
    weekdayElement?.classList.toggle('is-hidden', status.key === 'empty' || status.key === 'no-menu');
  }

  function hideDishTooltip() {
    dishTooltip?.classList.remove('is-visible');
  }

  function showDishTooltip(cell) {
    const content = String(cell?.dataset?.dishes || '').trim();
    if (!content) {
      hideDishTooltip();
      return;
    }
    if (!dishTooltip) {
      dishTooltip = document.createElement('div');
      dishTooltip.className = 'school-recipe-attendance-dish-tooltip';
      document.body.appendChild(dishTooltip);
    }
    dishTooltip.textContent = content;
    dishTooltip.style.maxWidth = `${Math.min(360, Math.max(180, window.innerWidth - 24))}px`;
    dishTooltip.classList.add('is-visible');
    const rect = cell.getBoundingClientRect();
    const tooltipRect = dishTooltip.getBoundingClientRect();
    const left = Math.max(8, Math.min(rect.left + (rect.width - tooltipRect.width) / 2, window.innerWidth - tooltipRect.width - 8));
    const top = rect.top - tooltipRect.height - 8 >= 8 ? rect.top - tooltipRect.height - 8 : rect.bottom + 8;
    dishTooltip.style.left = `${left}px`;
    dishTooltip.style.top = `${top}px`;
  }

  function showToast(message, isError = false) {
    document.querySelector('.operations-toast')?.remove();
    const toast = document.createElement('div');
    toast.className = `operations-toast${isError ? ' error' : ''}`;
    toast.textContent = message;
    toast.setAttribute('role', 'status');
    document.body.appendChild(toast);
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.remove(), 1800);
  }

  function selectDate(root, date) {
    state.attendanceByDate[state.selectedDate] = state.attendance;
    state.selectedDate = date;
    state.monthStart = monthStart(date);
    state.attendance = clone(state.attendanceByDate[date] || attendanceService.get(date));
    renderBody(root);
  }

  const content = `<section class="page-card school-recipe-attendance-page" id="schoolRecipeAttendancePage" aria-label="就餐人数填报"><div class="school-recipe-attendance-body" id="schoolRecipeAttendanceBody"></div></section>`;
  const root = window.AppShell.mount({ title: '就餐人数填报', content, variant: 'school', emptyText: '就餐人数填报' });
  const page = root.querySelector('#schoolRecipeAttendancePage');
  renderBody(root);

  page.addEventListener('mouseover', (event) => {
    const cell = event.target.closest('.school-recipe-attendance-dish-cell');
    if (!cell || !page.contains(cell)) return;
    const related = event.relatedTarget;
    if (related && related.nodeType && cell.contains(related)) return;
    showDishTooltip(cell);
  });

  page.addEventListener('mouseout', (event) => {
    const cell = event.target.closest('.school-recipe-attendance-dish-cell');
    if (!cell || !page.contains(cell)) return;
    const related = event.relatedTarget;
    if (related && related.nodeType && cell.contains(related)) return;
    hideDishTooltip();
  });

  page.addEventListener('input', (event) => {
    const input = event.target.closest('[data-attendance-field]');
    if (!input) return;
    syncCurrentDraftFromInputs(page);
    updateLiveView(page);
  });

  page.addEventListener('click', (event) => {
    const canteenButton = event.target.closest('[data-recipe-canteen]');
    if (canteenButton) {
      const nextCanteen = canteenButton.dataset.recipeCanteen || '';
      if (canteenNames.includes(nextCanteen) && nextCanteen !== state.canteen) {
        syncCurrentDraftFromInputs(page);
        state.canteen = nextCanteen;
        window.AppStorage?.write?.(canteenStorageKey, nextCanteen);
        renderBody(root);
      }
      return;
    }
    const dateButton = event.target.closest('[data-attendance-date]');
    if (dateButton && dateButton.closest('.school-recipe-attendance-date-panel')) {
      selectDate(root, dateButton.dataset.attendanceDate);
      return;
    }
    const monthButton = event.target.closest('[data-attendance-month]');
    if (monthButton) {
      state.attendanceByDate[state.selectedDate] = state.attendance;
      const offset = monthButton.dataset.attendanceMonth === 'prev' ? -1 : 1;
      const nextMonth = shiftMonth(state.monthStart, offset);
      if (nextMonth < minMonthStart || nextMonth > maxMonthStart) return;
      state.monthStart = nextMonth;
      const dates = monthDates(state.monthStart);
      state.selectedDate = dates.includes(state.selectedDate) ? state.selectedDate : dates.find((date) => menuForDate(date)) || dates[0];
      state.attendance = clone(state.attendanceByDate[state.selectedDate] || attendanceService.get(state.selectedDate));
      renderBody(root);
      return;
    }
    const action = event.target.closest('[data-attendance-action]')?.dataset.attendanceAction;
    if (!action) return;
    if (action === 'recalculate') {
      syncCurrentDraftFromInputs(page);
      updateLiveView(page);
      showToast('需求已重新计算');
      return;
    }
    if (action === 'reset') {
      const cleared = clone(attendanceService.get(state.selectedDate));
      cleared.meals = {};
      state.attendance = cleared;
      state.attendanceByDate[state.selectedDate] = state.attendance;
      renderBody(root);
      showToast('当前日期人数已清空');
      return;
    }
    if (action === 'continue') {
      syncCurrentDraftFromInputs(page);
      const menu = menuForDate(state.selectedDate);
      const validation = attendanceService.validate(menu, state.attendance);
      if (!validation.canContinue) {
        showToast(validation.message || '请先完成当前日期填报', true);
        return;
      }
      attendanceService.save(state.selectedDate, state.attendance.meals, menu.version || service.MENU_VERSION);
      if (window.AppNavigationGuard?.navigate) window.AppNavigationGuard.navigate(`./school-recipe-demand-confirm.html?date=${encodeURIComponent(state.selectedDate)}`);
      else window.location.href = `./school-recipe-demand-confirm.html?date=${encodeURIComponent(state.selectedDate)}`;
    }
  });
})();
