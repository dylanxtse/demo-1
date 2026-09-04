(function () {
  const service = window.SchoolRecipeService;
  const attendanceService = window.SchoolRecipeAttendanceService;
  const demandService = window.SchoolRecipeDemandService;
  if (!service || !attendanceService || !demandService) return;

  const allMenus = service.getAll();
  const firstDate = allMenus[0]?.date || '2026-09-07';
  const weekdayNames = ['日', '一', '二', '三', '四', '五', '六'];
  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  const number = (value) => Number(value || 0).toLocaleString('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    useGrouping: false
  });
  const quantity = (value) => Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2, useGrouping: false });
  const purchaseQuantity = (value) => {
    const amount = Number(value);
    return Number.isFinite(amount) ? Math.ceil(amount) : 0;
  };
  const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
  const weekday = (date) => weekdayNames[new Date(`${date}T00:00:00`).getDay()];
  const recipeName = (value) => String(value || '').replace(/\s*第\s*\d+\s*版\s*$/, '').trim();
  const calendarChevronLeft = '<svg class="icon-svg school-recipe-calendar-icon" viewBox="0 0 24 24" aria-hidden="true"><polyline points="15 18 9 12 15 6"></polyline></svg>';
  const calendarChevronRight = '<svg class="icon-svg school-recipe-calendar-icon" viewBox="0 0 24 24" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg>';
  const calendarIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="17" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="9" x2="21" y2="9"></line></svg>';
  const dateFilter = (id, label, value = '') => `<div class="operations-field"><label class="filter-label" for="${id}">${label}</label><div class="date-input-control operations-date-control"><input class="filter-input operations-date-input" id="${id}" type="text" value="${escapeHtml(value)}" readonly placeholder="请选择日期" aria-label="${label}"><span class="date-range-icon" aria-hidden="true">${calendarIcon}</span></div></div>`;
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
  const dishCount = (menu) => (menu?.meals || []).reduce((total, meal) => total + (meal.dishes || []).length, 0);
  const ingredientCount = (dish) => (dish?.ingredients || []).length;
  const menuForDate = (date) => allMenus.find((menu) => menu.date === date);
  const productForIngredient = (item) => {
    const code = item?.productCode || item?.productId || item?.goodsCode || '';
    const catalog = window.SchoolOrderService?.getProductCatalog?.() || window.MockProducts || [];
    return catalog.find((product) => String(product.code || product.id) === String(code)) || {};
  };
  const productSummary = (item) => {
    const product = productForIngredient(item);
    const name = item?.productName || product.name || '--';
    const unit = item?.productUnit || product.unit || item?.unit || '--';
    const brand = item?.brand || product.brand || '--';
    const spec = item?.spec || product.spec || '--';
    const code = item?.productCode || item?.productId || item?.goodsCode || '--';
    return { name, label: `${name}（${unit}/${brand}/${spec}）`, code };
  };

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
  const defaultDate = allMenus.find((menu) => String(menu.date).startsWith(todayMonth))?.date || dateValue(today);
  const requestedTab = new URLSearchParams(window.location.search).get('tab') || '';
  const validTabs = new Set(['attendance', 'center', 'demandRecords']);
  const state = {
    selectedDate: defaultDate,
    monthStart: currentMonthStart,
    activeTab: validTabs.has(requestedTab) ? requestedTab : 'center',
    canteen: canteenNames.includes(storedCanteen) ? storedCanteen : defaultCanteen,
    demandRecordKeyword: '',
    demandRecordSubmittedDate: '',
    demandRecordUsageDate: '',
    attendanceByDate: {}
  };
  allMenus.forEach((menu) => { state.attendanceByDate[menu.date] = attendanceService.get(menu.date); });
  state.attendance = clone(state.attendanceByDate[defaultDate] || attendanceService.get(defaultDate));
  let overviewResizeObserver = null;
  let overviewResizeHandler = null;
  let overviewLayoutFrame = 0;
  let attendanceDishTooltip = null;
  let demandRecordDatePickers = [];

  function destroyDemandRecordDatePickers() {
    demandRecordDatePickers.forEach((picker) => picker?.destroy?.());
    demandRecordDatePickers = [];
  }

  function mountDemandRecordDatePickers(root) {
    if (!window.DatePicker) return;
    ['schoolRecipeDemandRecordSubmittedDate', 'schoolRecipeDemandRecordUsageDate'].forEach((id, index) => {
      const input = root.querySelector(`#${id}`);
      if (input) demandRecordDatePickers.push(window.DatePicker.create({ input, panelId: `${id}Panel${index}` }));
    });
  }

  function attendanceForDate(date) {
    if (date === state.selectedDate) return state.attendance;
    return state.attendanceByDate[date] || attendanceService.get(date);
  }

  function attendanceStatusForDate(date) {
    const menu = menuForDate(date);
    if (!menu) return { key: 'no-menu', label: '无菜谱' };
    const status = attendanceService.status(menu, attendanceForDate(date));
    return { ...status, label: status.key === 'empty' ? '待填' : status.label };
  }

  const totalIngredientCount = (menu) => (menu?.meals || []).flatMap((meal) => meal.dishes || []).reduce((total, item) => total + ingredientCount(item), 0);

  function renderModeTabs() {
    return '';
  }

  function renderCanteenTabs() {
    return `<div class="school-recipe-canteen-switch" aria-label="当前食堂"><div class="school-recipe-canteen-tabs" role="tablist" aria-label="切换食堂">${canteenNames.map((name) => `<button type="button" class="school-recipe-canteen-tab${name === state.canteen ? ' is-active' : ''}" role="tab" aria-selected="${name === state.canteen}" data-recipe-canteen="${escapeHtml(name)}">${escapeHtml(name)}</button>`).join('')}</div></div>`;
  }

  function updateOverviewLayout(root) {
    const fields = root.querySelector('#schoolRecipeOverview .school-recipe-overview-fields');
    if (!fields) return;
    const items = Array.from(fields.querySelectorAll('.school-recipe-overview-item'));
    if (!items.length) return;
    fields.classList.remove('is-truncated');
    const naturalWidth = items.reduce((total, item) => {
      const label = item.querySelector('.school-recipe-overview-label');
      const value = item.querySelector('strong');
      const style = window.getComputedStyle(item);
      const padding = parseFloat(style.paddingLeft || 0) + parseFloat(style.paddingRight || 0);
      return total + (label?.scrollWidth || 0) + (value?.scrollWidth || 0) + padding;
    }, 0);
    const availableWidth = fields.clientWidth;
    const gap = items.length > 1
      ? Math.max(0, Math.min(100, (availableWidth - naturalWidth) / (items.length - 1)))
      : 0;
    fields.style.setProperty('--school-recipe-overview-gap', `${gap}px`);
    fields.classList.toggle('is-truncated', naturalWidth > availableWidth + 1);
  }

  function mountOverviewLayout(root) {
    overviewResizeObserver?.disconnect();
    overviewResizeObserver = null;
    if (overviewResizeHandler) {
      window.removeEventListener('resize', overviewResizeHandler);
      overviewResizeHandler = null;
    }
    const schedule = () => {
      if (overviewLayoutFrame) window.cancelAnimationFrame(overviewLayoutFrame);
      overviewLayoutFrame = window.requestAnimationFrame(() => {
        overviewLayoutFrame = 0;
        updateOverviewLayout(root);
      });
    };
    schedule();
    const overview = root.querySelector('#schoolRecipeOverview');
    if (!overview) return;
    if (window.ResizeObserver) {
      overviewResizeObserver = new window.ResizeObserver(schedule);
      overviewResizeObserver.observe(overview);
    } else {
      overviewResizeHandler = schedule;
      window.addEventListener('resize', overviewResizeHandler);
    }
  }

  function renderOverview(menu) {
    const meta = service.getMeta();
    const stats = service.stats(menu ? [menu] : []);
    const dateLabel = menu ? longDate(menu.date) : longDate(state.selectedDate);
    const ingredientTotal = menu ? totalIngredientCount(menu) : '--';
    const nameLabel = recipeName(meta.name || meta.version || service.MENU_VERSION);
    return `<div class="school-recipe-overview" id="schoolRecipeOverview" aria-label="当前日期概况">
      <div class="school-recipe-overview-fields">
        <div class="school-recipe-overview-item school-recipe-overview-date"><span class="school-recipe-overview-label">用料日期：</span><strong>${escapeHtml(dateLabel)}</strong></div>
        <div class="school-recipe-overview-item school-recipe-overview-name"><span class="school-recipe-overview-label">食谱名称：</span><strong>${escapeHtml(nameLabel)}</strong></div>
        <div class="school-recipe-overview-item"><span class="school-recipe-overview-label">菜品数：</span><strong>${number(stats.dishes)}</strong></div>
        <div class="school-recipe-overview-item school-recipe-overview-ingredients"><span class="school-recipe-overview-label">食材种数：</span><strong>${escapeHtml(String(ingredientTotal))}</strong></div>
      </div>
      <div class="school-recipe-overview-action"><button type="button" class="btn btn-primary school-recipe-overview-sync-button" data-recipe-action="sync"><span class="school-recipe-sync-icon">↻</span>刷新</button></div>
    </div>`;
  }

  function renderAttendanceOverview(menu) {
    const record = attendanceForDate(state.selectedDate);
    const calculation = attendanceService.calculate(menu, record);
    const meta = service.getMeta();
    const name = recipeName(menu?.version || meta.name || meta.version || service.MENU_VERSION);
    return `<div class="school-recipe-attendance-overview" id="schoolRecipeAttendanceOverview" aria-label="就餐人数填报概况">
      <div class="school-recipe-attendance-overview-fields">
        <div class="school-recipe-attendance-overview-item school-recipe-attendance-date"><span class="school-recipe-attendance-overview-label">用料日期：</span><strong>${escapeHtml(menu ? longDate(menu.date) : longDate(state.selectedDate))}</strong></div>
        <div class="school-recipe-attendance-overview-item school-recipe-attendance-name"><span class="school-recipe-attendance-overview-label">食谱名称：</span><strong>${escapeHtml(name)}</strong></div>
        <div class="school-recipe-attendance-overview-item school-recipe-attendance-overview-total"><span class="school-recipe-attendance-overview-label">总就餐人次：</span><strong id="schoolRecipeAttendanceOverviewTotal">${number(calculation.totalPeople)}</strong></div>
      </div>
    </div>`;
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

  function renderAttendanceMealTable(meals, record) {
    const rows = meals.map((meal) => {
      const student = record?.meals?.[meal.key]?.student ?? '';
      const teacher = record?.meals?.[meal.key]?.teacher ?? '';
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

  function renderAttendanceNotice(menu, record) {
    if (!menu) return '';
    const validation = attendanceService.validate(menu, record);
    if (!validation.missingMappings.length) return '';
    return `<div class="school-recipe-attendance-notice is-warning"><span class="school-recipe-attendance-notice-icon">!</span><div><strong>存在未关联商品</strong><p>${escapeHtml(validation.missingMappings.join('、'))}尚未关联采购商品，请先在营养膳食管理平台完成关联后重新同步。</p></div></div>`;
  }

  function renderAttendanceDemand(menu, record) {
    if (!menu) return '<div class="school-recipe-attendance-empty">请选择有菜谱的日期</div>';
    const calculation = attendanceService.calculate(menu, record);
    const rows = calculation.rows
      .filter((row) => Number(row.studentQty || 0) > 0 || Number(row.teacherQty || 0) > 0)
      .map((row, index) => `<tr>
      <td>${index + 1}</td>
      <td class="school-recipe-attendance-ingredient-name">${escapeHtml(row.ingredientNames.join('、'))}</td>
      <td class="school-recipe-attendance-product-name">${escapeHtml(productSummary(row).label)}</td>
      <td>${escapeHtml(row.productCode || '--')}</td>
      <td>${escapeHtml(row.unit)}</td>
      <td class="is-number">${quantity(row.studentQty)}</td>
      <td class="is-number">${purchaseQuantity(row.studentQty)}</td>
      <td class="is-number">${quantity(row.teacherQty)}</td>
      <td class="is-number">${purchaseQuantity(row.teacherQty)}</td>
    </tr>`).join('');
    return rows ? `<div class="school-recipe-attendance-table-wrap"><table class="school-recipe-attendance-table"><colgroup><col class="col-index"><col class="col-ingredient"><col class="col-product"><col class="col-code"><col class="col-unit"><col class="col-quantity"><col class="col-purchase"><col class="col-quantity"><col class="col-purchase"></colgroup><thead><tr><th>序号</th><th>来源食材</th><th>商品名称（计量单位/品牌/规格）</th><th>商品编号</th><th>单位</th><th>学生需求量</th><th>学生采购数量</th><th>教职工需求量</th><th>教职工采购数量</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<div class="school-recipe-attendance-empty">当前食谱暂无关联商品</div>';
  }

  function renderAttendanceDetail(menu) {
    const record = attendanceForDate(state.selectedDate);
    const calculation = attendanceService.calculate(menu, record);
    const validation = attendanceService.validate(menu, record);
    if (!menu) return `<main class="school-recipe-attendance-detail-panel">${renderModeTabs()}${renderAttendanceOverview(menu)}<div class="school-recipe-attendance-detail-empty"><div class="operation-empty-icon"><svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div><p>请选择有菜谱的日期</p></div></main>`;
    return `<main class="school-recipe-attendance-detail-panel" aria-label="就餐人数填报详情">
      ${renderModeTabs()}
      ${renderAttendanceOverview(menu)}
      <div class="school-recipe-attendance-detail-scroll">
        <div class="school-recipe-attendance-section-heading"><div><span class="section-title-mark">餐次就餐人数</span></div></div>
        ${renderAttendanceNotice(menu, record)}
        ${renderAttendanceMealTable(menu.meals || [], record)}
        <section class="school-recipe-attendance-demand-section" aria-label="商品需求测算"><header><div><span class="section-title-mark">商品需求测算</span></div></header><div id="schoolRecipeAttendanceDemand">${renderAttendanceDemand(menu, record)}</div></section>
      </div>
      <footer class="school-recipe-attendance-actions"><div class="school-recipe-attendance-confirm-action"><button type="button" class="btn btn-sm" data-attendance-action="reset">重置</button><button type="button" class="btn btn-primary btn-sm ${validation.canContinue ? '' : 'btn-disabled'}" data-attendance-action="continue" ${validation.canContinue ? '' : 'disabled'}>确认需求</button></div></footer>
    </main>`;
  }

  function renderCalendar() {
    const dates = monthDates(state.monthStart);
    const leadingEmptyDays = parseDate(state.monthStart).getDay();
    const previousMonth = shiftMonth(state.monthStart, -1);
    const nextMonth = shiftMonth(state.monthStart, 1);
    const canGoPrevious = previousMonth >= minMonthStart;
    const canGoNext = nextMonth <= maxMonthStart;
    const cells = [...Array(leadingEmptyDays).fill(''), ...dates].map((date) => {
      if (!date) return '<span class="school-recipe-date-placeholder" aria-hidden="true"></span>';
      const menu = menuForDate(date);
      const status = state.activeTab === 'attendance'
        ? attendanceStatusForDate(date)
        : { key: menu ? 'published' : 'no-menu', label: menu ? '已发布' : '暂无菜谱' };
      const statusClass = status.key === 'no-menu' ? 'is-empty is-no-menu' : status.key === 'empty' ? 'is-empty' : `is-${status.key}`;
      const hideWeekday = state.activeTab === 'attendance'
        ? status.key === 'empty' || status.key === 'no-menu'
        : !menu;
      return `<button type="button" class="school-recipe-date-item ${date === state.selectedDate ? 'is-selected' : ''} ${statusClass}" data-recipe-date="${escapeHtml(date)}" title="${escapeHtml(`${date} ${status.label}`)}">
        <span class="school-recipe-date-number">${escapeHtml(String(Number(date.slice(8, 10))))}</span>
        <span class="school-recipe-date-week${hideWeekday ? ' is-hidden' : ''}">${escapeHtml(weekday(date))}</span>
      </button>`;
    }).join('');
    return `<aside class="school-recipe-date-panel" aria-label="已发布菜谱日期">
      <div class="school-recipe-panel-heading"><div class="school-recipe-calendar-actions"><button type="button" data-recipe-month="prev" aria-label="上一个月" title="上一个月" ${canGoPrevious ? '' : 'disabled'}>${calendarChevronLeft}</button><span class="school-recipe-current-month">${escapeHtml(monthLabel(state.monthStart))}</span><button type="button" data-recipe-month="next" aria-label="下一个月" title="下一个月" ${canGoNext ? '' : 'disabled'}>${calendarChevronRight}</button></div></div>
      <div class="school-recipe-calendar-caption"><span>本月菜谱</span></div>
      <div class="school-recipe-calendar-weekdays" aria-hidden="true">${weekdayNames.map((name) => `<span>${escapeHtml(name)}</span>`).join('')}</div>
      <div class="school-recipe-date-list">${cells}</div>
    </aside>`;
  }

  function renderMealCard(meal, menuDate) {
    const dishes = meal.dishes || [];
    return `<section class="school-recipe-meal-card">
      <header class="school-recipe-meal-header"><div class="school-recipe-meal-title"><h3>${escapeHtml(meal.name)}</h3></div><em>${number(dishes.length)} 道菜品</em></header>
      <div class="school-recipe-dish-list">${dishes.map((item, index) => `<button type="button" class="school-recipe-dish-row" data-recipe-dish="${escapeHtml(item.id)}" data-recipe-menu="${escapeHtml(item.menuId || '')}" data-recipe-date="${escapeHtml(menuDate)}">
        <span class="school-recipe-dish-index">${String(index + 1).padStart(2, '0')}</span><strong>${escapeHtml(item.name)}</strong><span class="school-recipe-dish-note">${escapeHtml(item.note || `${ingredientCount(item)} 种食材`)}</span><span class="school-recipe-dish-action">查看详情 <b>›</b></span>
      </button>`).join('')}</div>
    </section>`;
  }

  function renderDetail(menu) {
    const overview = renderOverview(menu);
    if (!menu) return `<main class="school-recipe-detail-panel" aria-label="营养食谱详情">${renderModeTabs()}${renderCanteenTabs()}${overview}<div class="school-recipe-detail-empty"><div class="operation-empty-icon"><svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div><p>请选择有菜谱的日期</p></div></main>`;
    const meals = menu.meals || [];
    return `<main class="school-recipe-detail-panel" aria-label="营养食谱详情">
      ${renderModeTabs()}
      ${renderCanteenTabs()}
      ${overview}
      <div class="school-recipe-meal-grid${meals.length > 3 ? ' is-scrollable' : ''}">${meals.length ? meals.map((meal) => renderMealCard(meal, menu.date)).join('') : '<div class="school-recipe-empty">当前日期暂无餐次菜谱</div>'}</div>
    </main>`;
  }

  function demandRecordDateText(dates = []) {
    return dates.length > 3 ? `${dates.slice(0, 3).join('、')} 等${dates.length}天` : dates.join('、') || '--';
  }

  function renderDemandRecordRows() {
    const keyword = state.demandRecordKeyword.trim();
    const submittedDate = state.demandRecordSubmittedDate;
    const usageDate = state.demandRecordUsageDate;
    const records = demandService.getAll().filter((record) => {
      if (keyword && !String(record.recordNo || '').includes(keyword)) return false;
      if (submittedDate && String(record.submittedAt || '').slice(0, 10) !== submittedDate) return false;
      if (usageDate && !(Array.isArray(record.dates) && record.dates.includes(usageDate))) return false;
      return true;
    });
    return records.length ? records.map((record) => `<tr>
      <td><button type="button" class="school-recipe-demand-record-number" data-demand-record-action="detail" data-id="${escapeHtml(record.id)}"><strong>${escapeHtml(record.recordNo || '--')}</strong></button></td>
      <td class="school-recipe-demand-record-dates">${escapeHtml(demandRecordDateText(record.dates))}</td>
      <td class="is-number">${number(record.studentPersonTimes)}</td>
      <td class="is-number">${number(record.teacherPersonTimes)}</td>
      <td class="is-number is-total">${number(record.totalPersonTimes)}</td>
      <td class="is-number">${number(record.productCount)}</td>
      <td class="is-number">${number(record.orders?.length)}</td>
      <td>${escapeHtml(record.submittedBy || '--')}</td>
      <td>${escapeHtml(record.submittedAt || '--')}</td>
      <td><button type="button" class="btn-text school-recipe-demand-record-view" data-demand-record-action="detail" data-id="${escapeHtml(record.id)}">查看详情</button></td>
    </tr>`).join('') : '<tr><td class="school-recipe-demand-records-empty" colspan="10">暂无需求提交记录</td></tr>';
  }

  function renderDemandRecords() {
    return `<main class="school-recipe-demand-records-embedded-panel" aria-label="需求提交记录">
      ${renderModeTabs()}
      <section class="school-recipe-demand-records-page" id="schoolRecipeDemandRecordsEmbeddedPage">
        <form class="operations-filter filter-section school-recipe-demand-records-filter" id="schoolRecipeDemandRecordsFilter"><div class="operations-filter-main"><div class="operations-filter-grid"><div class="operations-field"><label class="filter-label" for="schoolRecipeDemandRecordKeyword">记录编号</label><input class="filter-input" id="schoolRecipeDemandRecordKeyword" type="text" value="${escapeHtml(state.demandRecordKeyword)}" placeholder="请输入记录编号" aria-label="记录编号"></div>${dateFilter('schoolRecipeDemandRecordSubmittedDate', '提交日期', state.demandRecordSubmittedDate)}${dateFilter('schoolRecipeDemandRecordUsageDate', '用料日期', state.demandRecordUsageDate)}</div><div class="operations-filter-actions"><button type="submit" class="btn btn-primary btn-sm">查询</button><button type="button" class="btn btn-sm" data-demand-record-action="reset">重置</button></div></div></form>
        <div class="school-recipe-demand-records-table-wrap"><table class="school-recipe-demand-records-table"><colgroup><col class="col-record-no"><col class="col-date"><col class="col-person"><col class="col-person"><col class="col-total"><col class="col-product"><col class="col-order"><col class="col-operator"><col class="col-time"><col class="col-action"></colgroup><thead><tr><th>记录编号</th><th>用料日期</th><th>学生人次</th><th>教师人次</th><th>总人次</th><th>商品种数</th><th>生成订单数</th><th>操作人</th><th>提交时间</th><th>操作</th></tr></thead><tbody id="schoolRecipeDemandRecordsBody">${renderDemandRecordRows()}</tbody></table></div>
      </section>
    </main>`;
  }

  function renderBody(root) {
    const body = root.querySelector('#schoolRecipeCenterBody');
    if (body) {
      destroyDemandRecordDatePickers();
      body.classList.toggle('is-demand-records', state.activeTab === 'demandRecords');
      if (state.activeTab === 'demandRecords') {
        body.innerHTML = renderDemandRecords();
        mountDemandRecordDatePickers(root);
        return;
      }
      const selected = menuForDate(state.selectedDate) || null;
      body.innerHTML = `${renderCalendar()}${state.activeTab === 'attendance' ? renderAttendanceDetail(selected) : renderDetail(selected)}`;
      mountOverviewLayout(root);
    }
  }

  function openDishModal(menuId, dishId, date) {
    const result = service.getDish(menuId || date, dishId);
    if (!result) return;
    const { menu, meal, dish } = result;
    const rows = (dish.ingredients || []).map((item, index) => {
      const product = productSummary(item);
      return `<tr><td>${index + 1}</td><td>${escapeHtml(item.name)}</td><td>${escapeHtml(product.label)}</td><td>${escapeHtml(product.code)}</td><td class="is-number">${number(item.perCapitaQty)}</td><td>${escapeHtml(item.unit || '--')}</td></tr>`;
    }).join('');
    const backdrop = document.createElement('div');
    backdrop.className = 'school-recipe-modal-backdrop';
    backdrop.innerHTML = `<div class="school-recipe-modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(dish.name)}食材详情"><header><div><h3>${escapeHtml(dish.name)}</h3><p>${escapeHtml(longDate(menu.date))} · ${escapeHtml(meal.name)}</p></div><button type="button" data-recipe-modal-close aria-label="关闭">×</button></header><div class="school-recipe-modal-body"><table><colgroup><col class="school-recipe-modal-col-index"><col class="school-recipe-modal-col-ingredient"><col class="school-recipe-modal-col-product"><col class="school-recipe-modal-col-code"><col class="school-recipe-modal-col-quantity"><col class="school-recipe-modal-col-unit"></colgroup><thead><tr><th>序号</th><th>食材</th><th>关联商品名称（计量单位/品牌/规格）</th><th>商品编号</th><th>人均用量</th><th>用量单位</th></tr></thead><tbody>${rows}</tbody></table></div><footer><span>共 ${number((dish.ingredients || []).length)} 项食材</span><button type="button" class="btn btn-primary btn-sm" data-recipe-modal-close>确定</button></footer></div>`;
    document.body.appendChild(backdrop);
    const close = () => backdrop.remove();
    backdrop.addEventListener('click', (event) => {
      if (event.target === backdrop || event.target.closest('[data-recipe-modal-close]')) close();
    });
    backdrop.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); });
    backdrop.querySelector('[data-recipe-modal-close]')?.focus();
  }

  function updateAttendanceLiveView(page) {
    const menu = menuForDate(state.selectedDate);
    if (!menu) return;
    const record = attendanceForDate(state.selectedDate);
    const calculation = attendanceService.calculate(menu, record);
    const validation = attendanceService.validate(menu, record);
    const demand = page.querySelector('#schoolRecipeAttendanceDemand');
    if (demand) demand.innerHTML = renderAttendanceDemand(menu, record);
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
    if (notice) notice.outerHTML = renderAttendanceNotice(menu, record);
    updateCalendarStatus(page);
  }

  function updateCalendarStatus(page) {
    if (state.activeTab !== 'attendance') return;
    const dateItem = [...page.querySelectorAll('[data-recipe-date]')]
      .find((item) => item.dataset.recipeDate === state.selectedDate);
    if (!dateItem) return;
    const menu = menuForDate(state.selectedDate);
    const status = attendanceStatusForDate(state.selectedDate);
    dateItem.classList.remove('is-no-menu', 'is-empty', 'is-partial', 'is-complete', 'is-published');
    dateItem.classList.add(status.key === 'no-menu' ? 'is-empty' : `is-${status.key}`);
    if (!menu) dateItem.classList.add('is-no-menu');
    const weekdayElement = dateItem.querySelector('.school-recipe-date-week');
    weekdayElement?.classList.toggle('is-hidden', status.key === 'empty' || status.key === 'no-menu');
  }

  function hideAttendanceDishTooltip() {
    attendanceDishTooltip?.classList.remove('is-visible');
  }

  function showAttendanceDishTooltip(cell) {
    const content = String(cell?.dataset?.dishes || '').trim();
    if (!content) {
      hideAttendanceDishTooltip();
      return;
    }
    if (!attendanceDishTooltip) {
      attendanceDishTooltip = document.createElement('div');
      attendanceDishTooltip.className = 'school-recipe-attendance-dish-tooltip';
      document.body.appendChild(attendanceDishTooltip);
    }
    attendanceDishTooltip.textContent = content;
    attendanceDishTooltip.style.maxWidth = `${Math.min(360, Math.max(180, window.innerWidth - 24))}px`;
    attendanceDishTooltip.classList.add('is-visible');
    const rect = cell.getBoundingClientRect();
    const tooltipRect = attendanceDishTooltip.getBoundingClientRect();
    const left = Math.max(8, Math.min(rect.left + (rect.width - tooltipRect.width) / 2, window.innerWidth - tooltipRect.width - 8));
    const top = rect.top - tooltipRect.height - 8 >= 8 ? rect.top - tooltipRect.height - 8 : rect.bottom + 8;
    attendanceDishTooltip.style.left = `${left}px`;
    attendanceDishTooltip.style.top = `${top}px`;
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

  const content = `<section class="page-card school-recipe-center-page" id="schoolRecipeCenterPage" aria-label="营养食谱与需求">
    <div class="school-recipe-center-body" id="schoolRecipeCenterBody"></div>
  </section>`;

  const root = window.AppShell.mount({ title: '营养食谱', content, variant: 'school', emptyText: '营养食谱' });
  const page = root.querySelector('#schoolRecipeCenterPage');
  renderBody(root);

  page.addEventListener('mouseover', (event) => {
    if (state.activeTab !== 'attendance') return;
    const cell = event.target.closest('.school-recipe-attendance-dish-cell');
    if (!cell || !page.contains(cell)) return;
    const related = event.relatedTarget;
    if (related && related.nodeType && cell.contains(related)) return;
    showAttendanceDishTooltip(cell);
  });

  page.addEventListener('mouseout', (event) => {
    if (state.activeTab !== 'attendance') return;
    const cell = event.target.closest('.school-recipe-attendance-dish-cell');
    if (!cell || !page.contains(cell)) return;
    const related = event.relatedTarget;
    if (related && related.nodeType && cell.contains(related)) return;
    hideAttendanceDishTooltip();
  });

  page.addEventListener('input', (event) => {
    if (state.activeTab !== 'attendance') return;
    const input = event.target.closest('[data-attendance-field]');
    if (!input) return;
    syncCurrentDraftFromInputs(page);
    updateAttendanceLiveView(page);
  });

  page.addEventListener('submit', (event) => {
    const form = event.target.closest('#schoolRecipeDemandRecordsFilter');
    if (!form || state.activeTab !== 'demandRecords') return;
    event.preventDefault();
    state.demandRecordKeyword = form.querySelector('#schoolRecipeDemandRecordKeyword')?.value.trim() || '';
    state.demandRecordSubmittedDate = form.querySelector('#schoolRecipeDemandRecordSubmittedDate')?.value || '';
    state.demandRecordUsageDate = form.querySelector('#schoolRecipeDemandRecordUsageDate')?.value || '';
    renderBody(root);
  });

  page.addEventListener('click', (event) => {
    const tabButton = event.target.closest('[data-recipe-tab]');
    if (tabButton) {
      const nextTab = tabButton.dataset.recipeTab;
      if (nextTab === state.activeTab) return;
      if (state.activeTab === 'attendance') syncCurrentDraftFromInputs(page);
      state.activeTab = nextTab;
      page.querySelectorAll('[data-recipe-tab]').forEach((button) => {
        const active = button.dataset.recipeTab === state.activeTab;
        button.classList.toggle('active', active);
        button.setAttribute('aria-selected', String(active));
      });
      hideAttendanceDishTooltip();
      renderBody(root);
      return;
    }
    const demandRecordButton = event.target.closest('[data-demand-record-action]');
    if (demandRecordButton) {
      const action = demandRecordButton.dataset.demandRecordAction;
      if (action === 'detail') {
        if (window.AppNavigationGuard?.navigate) window.AppNavigationGuard.navigate(`./school-recipe-demand-record-detail.html?id=${encodeURIComponent(demandRecordButton.dataset.id || '')}`);
        else window.location.href = `./school-recipe-demand-record-detail.html?id=${encodeURIComponent(demandRecordButton.dataset.id || '')}`;
        return;
      }
      if (action === 'reset') {
        state.demandRecordKeyword = '';
        state.demandRecordSubmittedDate = '';
        state.demandRecordUsageDate = '';
        renderBody(root);
        return;
      }
    }
    const canteenButton = event.target.closest('[data-recipe-canteen]');
    if (canteenButton) {
      const nextCanteen = canteenButton.dataset.recipeCanteen || '';
      if (canteenNames.includes(nextCanteen) && nextCanteen !== state.canteen) {
        state.canteen = nextCanteen;
        window.AppStorage?.write?.(canteenStorageKey, nextCanteen);
        renderBody(root);
      }
      return;
    }
    const dateButton = event.target.closest('[data-recipe-date]');
    if (dateButton && dateButton.closest('.school-recipe-date-panel')) {
      if (state.activeTab === 'attendance') syncCurrentDraftFromInputs(page);
      state.attendanceByDate[state.selectedDate] = state.attendance;
      state.selectedDate = dateButton.dataset.recipeDate;
      state.monthStart = monthStart(state.selectedDate);
      state.attendance = clone(state.attendanceByDate[state.selectedDate] || attendanceService.get(state.selectedDate));
      renderBody(root);
      return;
    }
    const monthButton = event.target.closest('[data-recipe-month]');
    if (monthButton) {
      if (state.activeTab === 'attendance') syncCurrentDraftFromInputs(page);
      state.attendanceByDate[state.selectedDate] = state.attendance;
      const offset = monthButton.dataset.recipeMonth === 'prev' ? -1 : 1;
      const nextMonth = shiftMonth(state.monthStart, offset);
      if (nextMonth < minMonthStart || nextMonth > maxMonthStart) return;
      state.monthStart = nextMonth;
      const dates = monthDates(state.monthStart);
      state.selectedDate = dates.includes(state.selectedDate) ? state.selectedDate : dates.find((date) => menuForDate(date)) || dates[0];
      state.attendance = clone(state.attendanceByDate[state.selectedDate] || attendanceService.get(state.selectedDate));
      renderBody(root);
      return;
    }
    const dishButton = event.target.closest('[data-recipe-dish]');
    if (dishButton) {
      openDishModal(dishButton.dataset.recipeMenu, dishButton.dataset.recipeDish, dishButton.dataset.recipeDate);
      return;
    }
    const action = event.target.closest('[data-recipe-action]')?.dataset.recipeAction;
    if (action === 'sync') {
      service.sync();
      const overview = page.querySelector('#schoolRecipeOverview');
      if (overview) overview.outerHTML = renderOverview(menuForDate(state.selectedDate));
      mountOverviewLayout(page);
      showToast('操作成功');
      return;
    }
    const attendanceAction = event.target.closest('[data-attendance-action]')?.dataset.attendanceAction;
    if (!attendanceAction || state.activeTab !== 'attendance') return;
    if (attendanceAction === 'reset') {
      const cleared = clone(attendanceService.get(state.selectedDate));
      cleared.meals = {};
      state.attendance = cleared;
      state.attendanceByDate[state.selectedDate] = state.attendance;
      renderBody(root);
      showToast('当前日期人数已清空');
      return;
    }
    if (attendanceAction === 'continue') {
      syncCurrentDraftFromInputs(page);
      const menu = menuForDate(state.selectedDate);
      const validation = attendanceService.validate(menu, state.attendance);
      if (!validation.canContinue) {
        showToast(validation.message || '请先完成当前日期填报', true);
        return;
      }
      const saved = attendanceService.save(state.selectedDate, state.attendance.meals, menu.version || service.MENU_VERSION);
      state.attendance = clone(saved);
      state.attendanceByDate[state.selectedDate] = clone(saved);
      if (window.AppNavigationGuard?.navigate) window.AppNavigationGuard.navigate(`./school-recipe-demand-confirm.html?date=${encodeURIComponent(state.selectedDate)}`);
      else window.location.href = `./school-recipe-demand-confirm.html?date=${encodeURIComponent(state.selectedDate)}`;
    }
  });

})();
