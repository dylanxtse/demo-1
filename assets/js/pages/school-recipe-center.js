(function () {
  const service = window.SchoolRecipeService;
  const attendanceService = window.SchoolRecipeAttendanceService;
  const demandService = window.SchoolRecipeDemandService;
  const canteenConfig = window.SchoolCanteenConfigService;
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
  const quantity = (value) => Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false });
  const recipeMeasureUnit = 'g';
  const ingredientQuantity = (item) => {
    const rawValue = item?.perCapitaQty
      ?? item?.quantity
      ?? item?.qty
      ?? item?.dosage
      ?? item?.amount
      ?? 0;
    const parsed = typeof rawValue === 'string' ? Number.parseFloat(rawValue) : Number(rawValue);
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const purchaseQuantity = (value, item) => {
    const amount = Number(value);
    return Number.isFinite(amount) ? (isStandardProduct(item) ? Math.ceil(amount) : amount) : 0;
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
    const catalog = window.SchoolOrderService?.getProductCatalog?.() || window.DemoStore?.get?.('products') || window.MockProducts || [];
    return catalog.find((product) => String(product.code || product.id) === String(code)) || {};
  };
  const isStandardProduct = (item) => item?.isStandardProduct === true || item?.isStandardProduct === 'true' || item?.isStandardProduct === '是'
    || item?.isStandard === true || item?.isStandard === 'true' || item?.isStandard === '是'
    || productForIngredient(item).isStandardProduct === true || productForIngredient(item).isStandard === true;
  const productSummary = (item) => {
    const product = productForIngredient(item);
    const name = item?.productName || product.name || '--';
    const unit = item?.productUnit || product.unit || item?.unit || '--';
    const brand = item?.brand || product.brand || '--';
    const spec = item?.spec || product.spec || '--';
    const code = item?.productCode || item?.productId || item?.goodsCode || '--';
    return { name, label: `${name}（${unit}/${brand}/${spec}）`, code };
  };
  const renderProductName = (item, display) => `${item?.isNetVegetable === true || productForIngredient(item).isNetVegetable === true ? '<span class="school-recipe-net-vegetable-tag">净菜</span>' : ''}${escapeHtml(display)}`;

  const canteenStorageKey = 'school-recipe-current-canteen';
  const defaultCanteen = window.SchoolOrderService?.CANTEEN_NAME || '第一食堂';
  function readCanteenNames() {
    const source = canteenConfig?.readCanteens?.() || window.SchoolReferenceData?.canteens || window.SchoolOrderService?.canteens || [];
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
  const draftsByCanteen = {};
  function currentCanteen() {
    return canteenConfig?.getCanteen?.(state.canteen) || { id: '', name: state.canteen };
  }

  function currentScopeKey() {
    const canteen = currentCanteen();
    return String(canteen.id || canteen.name || state.canteen);
  }

  function participantsForState() {
    return attendanceService.participantsFor(currentCanteen());
  }

  function menuAttendanceWithDefaults(record, date) {
    const next = clone(record || attendanceService.emptyRecord(date, currentCanteen()));
    const menu = menuForDate(date);
    if (!next.meals || !menu) return next;
    const participants = participantsForState();
    (menu.meals || []).forEach((meal) => {
      const values = next.meals[meal.key] || (next.meals[meal.key] = {});
      participants.forEach((participant) => {
        const current = attendanceService.valueForParticipant(values, participant);
        const defaultPeople = participant.defaultPeople?.[meal.key];
        if ((current === '' || current == null) && defaultPeople !== '' && defaultPeople != null) values[participant.key] = defaultPeople;
      });
    });
    return next;
  }

  function buildAttendanceMap() {
    const drafts = draftsByCanteen[currentScopeKey()] || {};
    return Object.fromEntries(allMenus.map((menu) => [
      menu.date,
      Object.prototype.hasOwnProperty.call(drafts, menu.date)
        ? clone(drafts[menu.date])
        : attendanceService.get(menu.date, currentCanteen())
    ]));
  }

  state.attendanceByDate = buildAttendanceMap();
  state.attendance = menuAttendanceWithDefaults(state.attendanceByDate[defaultDate] || attendanceService.get(defaultDate, currentCanteen()), defaultDate);
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
    return state.attendanceByDate[date] || attendanceService.get(date, currentCanteen());
  }

  function filledAttendanceDates() {
    return allMenus
      .filter((menu) => attendanceService.calculate(menu, attendanceForDate(menu.date), serviceOptions()).totalPeople > 0)
      .map((menu) => menu.date);
  }

  function serviceOptions() {
    return { canteen: currentCanteen(), participants: participantsForState() };
  }

  function attendanceStatusForDate(date) {
    const menu = menuForDate(date);
    if (!menu) return { key: 'no-menu', label: '无菜谱' };
    const status = attendanceService.status(menu, attendanceForDate(date), serviceOptions());
    return { ...status, label: status.key === 'empty' ? '待填' : status.label };
  }

  const totalIngredientCount = (menu) => (menu?.meals || []).flatMap((meal) => meal.dishes || []).reduce((total, item) => total + ingredientCount(item), 0);

  function renderModeTabs() {
    return '';
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
      <div class="school-recipe-overview-action"><button type="button" class="btn school-recipe-overview-sync-button" data-recipe-action="sync"><span class="school-recipe-sync-icon">↻</span>刷新</button></div>
    </div>`;
  }

  function renderAttendanceOverview(menu) {
    const record = attendanceForDate(state.selectedDate);
    const calculation = attendanceService.calculate(menu, record, serviceOptions());
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
    if (!draftsByCanteen[currentScopeKey()]) draftsByCanteen[currentScopeKey()] = {};
    draftsByCanteen[currentScopeKey()][state.selectedDate] = clone(state.attendance);
    state.attendanceByDate[state.selectedDate] = state.attendance;
  }

  function saveFilledAttendanceDrafts() {
    const canteen = currentCanteen();
    const participants = participantsForState();
    allMenus.forEach((menu) => {
      const record = menu.date === state.selectedDate
        ? state.attendance
        : state.attendanceByDate[menu.date];
      if (!record) return;
      const calculation = attendanceService.calculate(menu, record, { canteen, participants });
      if (Number(calculation.totalPeople || 0) <= 0) return;
      const saved = attendanceService.save(menu.date, record.meals, menu.version || service.MENU_VERSION, canteen);
      state.attendanceByDate[menu.date] = clone(saved);
      if (menu.date === state.selectedDate) state.attendance = clone(saved);
    });
  }

  function renderAttendanceMealTable(meals, record) {
    const participants = participantsForState();
    const personCount = Math.max(1, participants.length);
    const personHeaders = participants.length
      ? participants.map((participant) => `<th><span class="school-recipe-attendance-participant-name">${escapeHtml(participant.label || participant.tagName)}</span><small>${escapeHtml(participant.nutritious || '不区分')}</small></th>`).join('')
      : '<th class="school-recipe-attendance-no-participant">暂无启用人员类型</th>';
    const rows = meals.map((meal) => {
      const values = participants.map((participant) => attendanceService.valueForParticipant(record?.meals?.[meal.key] || {}, participant));
      const total = values.reduce((sum, value) => sum + Number(value || 0), 0);
      const dishNames = (meal.dishes || []).map((dish) => dish.name).join('、');
      const personCells = participants.length
        ? participants.map((participant, index) => `<td><div class="school-recipe-attendance-table-input"><input type="number" min="1" max="100000" step="1" inputmode="numeric" value="${escapeHtml(values[index])}" placeholder="请输入" data-attendance-field="${escapeHtml(participant.key)}" data-meal-key="${escapeHtml(meal.key)}" aria-label="${escapeHtml(`${meal.name}${participant.label}人数`)}"><i>人</i></div></td>`).join('')
        : '<td class="school-recipe-attendance-no-participant-cell">请先在食堂运营设置中启用人员类型</td>';
      return `<tr data-attendance-meal="${escapeHtml(meal.key)}">
        <td class="school-recipe-attendance-meal-name"><strong>${escapeHtml(meal.name)}</strong></td>
        <td class="school-recipe-attendance-dish-cell" data-dishes="${escapeHtml(dishNames)}">${escapeHtml(dishNames || '暂无菜品')}</td>
        ${personCells}
        <td class="school-recipe-attendance-meal-total-cell"><strong data-attendance-meal-total="${escapeHtml(meal.key)}">${number(total)}</strong><i>人</i></td>
      </tr>`;
    }).join('');
    const personColgroup = Array.from({ length: personCount }, () => '<col class="col-person">').join('');
    return `<div class="school-recipe-attendance-meal-table-wrap"><table class="school-recipe-attendance-meal-table"><colgroup><col class="col-meal"><col class="col-dishes">${personColgroup}<col class="col-meal-total"></colgroup><thead><tr><th rowspan="2">餐次</th><th rowspan="2">当餐菜品</th><th colspan="${personCount}">就餐人数</th><th rowspan="2">本餐合计</th></tr><tr>${personHeaders}</tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function renderAttendanceNotice(menu, record) {
    if (!menu) return '';
    const validation = attendanceService.validate(menu, record, serviceOptions());
    if (!participantsForState().length) return `<div class="school-recipe-attendance-notice is-warning"><span class="school-recipe-attendance-notice-icon">!</span><div><strong>尚未配置人员类型</strong><p>请先在当前食堂的运营设置中启用人员类型，再填写就餐人数。</p></div></div>`;
    if (!validation.missingMappings.length) return '';
    return `<div class="school-recipe-attendance-notice is-warning"><span class="school-recipe-attendance-notice-icon">!</span><div><strong>存在未关联商品</strong><p>${escapeHtml(validation.missingMappings.join('、'))}尚未关联采购商品，请先在营养膳食管理平台完成关联后重新同步。</p></div></div>`;
  }

  function renderAttendanceDemand(menu, record) {
    if (!menu) return '<div class="school-recipe-attendance-empty">请选择有菜谱的日期</div>';
    const participants = participantsForState();
    if (!participants.length) return '<div class="school-recipe-attendance-empty">当前食堂暂无启用的人员类型</div>';
    const calculation = attendanceService.calculate(menu, record, serviceOptions());
    const rows = calculation.rows
      .filter((row) => Number(row.totalQty || 0) > 0)
      .map((row, index) => `<tr>
      <td>${index + 1}</td>
      <td class="school-recipe-attendance-product-name">${renderProductName(row, productSummary(row).label)}</td>
      <td>${isStandardProduct(row) ? '是' : '否'}</td>
      <td>${escapeHtml(row.productCode || '--')}</td>
      <td>${escapeHtml(row.unit)}</td>
      ${participants.map((participant) => `<td class="is-number">${quantity(row.participantQty?.[participant.key])}</td><td class="is-number">${quantity(purchaseQuantity(row.participantQty?.[participant.key], row))}</td>`).join('')}
    </tr>`).join('');
    const dynamicColumns = participants.map((participant) => {
      const name = attendanceService.participantDisplayName?.(participant, participants) || participant.label || participant.tagName || '--';
      return `<th colspan="2">${escapeHtml(name)}</th>`;
    }).join('');
    const dynamicSubColumns = participants.map(() => '<th>需求量</th><th>采购量</th>').join('');
    const dynamicColgroup = participants.map(() => '<col class="col-quantity"><col class="col-purchase">').join('');
    return rows ? `<div class="school-recipe-attendance-table-wrap"><table class="school-recipe-attendance-table"><colgroup><col class="col-index"><col class="col-product"><col class="col-standard"><col class="col-code"><col class="col-unit">${dynamicColgroup}</colgroup><thead><tr><th rowspan="2">序号</th><th rowspan="2">商品名称（计量单位/品牌/规格）</th><th rowspan="2">是否标品</th><th rowspan="2">商品编号</th><th rowspan="2">单位</th>${dynamicColumns}</tr><tr>${dynamicSubColumns}</tr></thead><tbody>${rows}</tbody></table></div>` : '<div class="school-recipe-attendance-empty">当前食谱暂无关联商品</div>';
  }

  function renderAttendanceDetail(menu) {
    const record = attendanceForDate(state.selectedDate);
    const calculation = attendanceService.calculate(menu, record, serviceOptions());
    const validation = attendanceService.validate(menu, record, serviceOptions());
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
      <footer class="school-recipe-attendance-actions"><div class="school-recipe-attendance-draft-actions"><div class="school-recipe-attendance-reset-dropdown"><button type="button" class="btn btn-sm school-recipe-attendance-reset-trigger" data-attendance-reset-toggle aria-expanded="false" aria-haspopup="menu">重置<svg class="school-recipe-attendance-reset-chevron" viewBox="0 0 24 24" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg></button><div class="school-recipe-attendance-reset-menu" role="menu"><button type="button" role="menuitem" data-attendance-action="reset-current">重置当前人数</button><button type="button" role="menuitem" data-attendance-action="reset-all">重置全部人数</button></div></div><button type="button" class="btn btn-sm" data-attendance-action="fill-defaults">填写默认人数</button></div><div class="school-recipe-attendance-confirm-action"><button type="button" class="btn btn-primary btn-sm ${validation.canContinue ? '' : 'btn-disabled'}" data-attendance-action="continue" ${validation.canContinue ? '' : 'disabled'}>确认需求</button></div></footer>
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
      return `<button type="button" class="school-recipe-date-item ${date === state.selectedDate ? 'is-selected' : ''} ${statusClass}" data-recipe-date="${escapeHtml(date)}" title="${escapeHtml(date)}">
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
    if (!menu) return `<main class="school-recipe-detail-panel" aria-label="营养食谱详情">${renderModeTabs()}${overview}<div class="school-recipe-detail-empty"><div class="operation-empty-icon"><svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div><p>请选择有菜谱的日期</p></div></main>`;
    const meals = menu.meals || [];
    return `<main class="school-recipe-detail-panel" aria-label="营养食谱详情">
      ${renderModeTabs()}
      ${overview}
      <div class="school-recipe-meal-grid${meals.length > 3 ? ' is-scrollable' : ''}">${meals.length ? meals.map((meal) => renderMealCard(meal, menu.date)).join('') : '<div class="school-recipe-empty">当前日期暂无餐次菜谱</div>'}</div>
    </main>`;
  }

  function demandRecordDateText(dates = []) {
    return dates.length > 3 ? `${dates.slice(0, 3).join('、')} 等${dates.length}天` : dates.join('、') || '--';
  }

  function demandRecordParticipantValue(record, participant) {
    const direct = record?.participantPersonTimes?.[participant.key];
    if (direct != null) return direct;
    const matched = (record?.participants || []).find((item) => item.key === participant.key || item.tagId === participant.tagId || (item.label === participant.label && item.nutritious === participant.nutritious));
    if (matched && record?.participantPersonTimes?.[matched.key] != null) return record.participantPersonTimes[matched.key];
    if (participant.legacyKey === 'student' || participant.key === 'student') return record?.studentPersonTimes;
    if (participant.legacyKey === 'teacher' || participant.key === 'teacher') return record?.teacherPersonTimes;
    return 0;
  }

  function participantDisplayLabel(participant) {
    return `${participant.label || participant.tagName || '--'}—${participant.nutritious || '不区分'}`;
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
    const participants = participantsForState();
    return records.length ? records.map((record) => `<tr>
      <td><button type="button" class="school-recipe-demand-record-number" data-demand-record-action="detail" data-id="${escapeHtml(record.id)}"><strong>${escapeHtml(record.recordNo || '--')}</strong></button></td>
      <td class="school-recipe-demand-record-dates">${escapeHtml(demandRecordDateText(record.dates))}</td>
      ${participants.map((participant) => `<td class="is-number">${number(demandRecordParticipantValue(record, participant))}</td>`).join('')}
      <td class="is-number is-total">${number(record.totalPersonTimes)}</td>
      <td class="is-number">${number(record.productCount)}</td>
      <td class="is-number">${number(record.orders?.length)}</td>
      <td>${escapeHtml(record.submittedBy || '--')}</td>
      <td>${escapeHtml(record.submittedAt || '--')}</td>
      <td><button type="button" class="btn-text school-recipe-demand-record-view" data-demand-record-action="detail" data-id="${escapeHtml(record.id)}">查看详情</button></td>
    </tr>`).join('') : `<tr><td class="school-recipe-demand-records-empty" colspan="${8 + participants.length}">暂无需求提交记录</td></tr>`;
  }

  function renderDemandRecords() {
    const participants = participantsForState();
    return `<main class="school-recipe-demand-records-embedded-panel" aria-label="需求提交记录">
      ${renderModeTabs()}
      <section class="school-recipe-demand-records-page" id="schoolRecipeDemandRecordsEmbeddedPage">
        <form class="operations-filter filter-section school-recipe-demand-records-filter" id="schoolRecipeDemandRecordsFilter"><div class="operations-filter-main"><div class="operations-filter-grid"><div class="operations-field"><label class="filter-label" for="schoolRecipeDemandRecordKeyword">记录编号</label><input class="filter-input" id="schoolRecipeDemandRecordKeyword" type="text" value="${escapeHtml(state.demandRecordKeyword)}" placeholder="请输入记录编号" aria-label="记录编号"></div>${dateFilter('schoolRecipeDemandRecordSubmittedDate', '提交日期', state.demandRecordSubmittedDate)}${dateFilter('schoolRecipeDemandRecordUsageDate', '用料日期', state.demandRecordUsageDate)}</div><div class="operations-filter-actions"><button type="submit" class="btn btn-primary btn-sm">查询</button><button type="button" class="btn btn-sm" data-demand-record-action="reset">重置</button></div></div></form>
        <div class="school-recipe-demand-records-table-wrap"><table class="school-recipe-demand-records-table"><colgroup><col class="col-record-no"><col class="col-date">${participants.map(() => '<col class="col-person">').join('')}<col class="col-total"><col class="col-product"><col class="col-order"><col class="col-operator"><col class="col-time"><col class="col-action"></colgroup><thead><tr><th>记录编号</th><th>用料日期</th>${participants.map((participant) => `<th>${escapeHtml(participantDisplayLabel(participant))}人次</th>`).join('')}<th>总人次</th><th>商品种数</th><th>生成订单数</th><th>操作人</th><th>提交时间</th><th>操作</th></tr></thead><tbody id="schoolRecipeDemandRecordsBody">${renderDemandRecordRows()}</tbody></table></div>
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
      return `<tr><td>${index + 1}</td><td>${escapeHtml(item.name)}</td><td class="is-number">${quantity(ingredientQuantity(item))}</td><td>${recipeMeasureUnit}</td><td>${escapeHtml(product.label)}</td><td>${escapeHtml(product.code)}</td></tr>`;
    }).join('');
    const backdrop = document.createElement('div');
    backdrop.className = 'school-recipe-modal-backdrop';
    backdrop.innerHTML = `<div class="school-recipe-modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(dish.name)}食材详情"><header><div><h3>${escapeHtml(dish.name)}</h3><p>${escapeHtml(longDate(menu.date))} · ${escapeHtml(meal.name)}</p></div><button type="button" data-recipe-modal-close aria-label="关闭">×</button></header><div class="school-recipe-modal-body"><table><colgroup><col class="school-recipe-modal-col-index"><col class="school-recipe-modal-col-ingredient"><col class="school-recipe-modal-col-quantity"><col class="school-recipe-modal-col-unit"><col class="school-recipe-modal-col-product"><col class="school-recipe-modal-col-code"></colgroup><thead><tr><th>序号</th><th>食材</th><th>人均用量</th><th>用量单位</th><th>关联商品</th><th>商品编号</th></tr></thead><tbody>${rows}</tbody></table></div><footer><span>共 ${number((dish.ingredients || []).length)} 项食材</span><button type="button" class="btn btn-primary btn-sm" data-recipe-modal-close>确定</button></footer></div>`;
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
    const calculation = attendanceService.calculate(menu, record, serviceOptions());
    const validation = attendanceService.validate(menu, record, serviceOptions());
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
      const total = participantsForState().reduce((sum, participant) => sum + Number(attendanceService.valueForParticipant(values, participant) || 0), 0);
      element.textContent = number(total);
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

  let resetMenuCloseTimer = 0;

  function clearResetMenuCloseTimer() {
    if (!resetMenuCloseTimer) return;
    window.clearTimeout(resetMenuCloseTimer);
    resetMenuCloseTimer = 0;
  }

  function setResetMenuOpen(dropdown, isOpen) {
    if (!dropdown) return;
    dropdown.classList.toggle('is-open', isOpen);
    dropdown.querySelector('[data-attendance-reset-toggle]')?.setAttribute('aria-expanded', String(isOpen));
  }

  function closeResetMenu() {
    clearResetMenuCloseTimer();
    const toggle = page.querySelector('[data-attendance-reset-toggle]');
    const dropdown = toggle?.closest('.school-recipe-attendance-reset-dropdown');
    if (!dropdown) return;
    setResetMenuOpen(dropdown, false);
  }

  function scheduleResetMenuClose(dropdown) {
    clearResetMenuCloseTimer();
    resetMenuCloseTimer = window.setTimeout(() => {
      if (dropdown.matches(':hover') || dropdown.matches(':focus-within')) {
        resetMenuCloseTimer = 0;
        return;
      }
      setResetMenuOpen(dropdown, false);
      resetMenuCloseTimer = 0;
    }, 240);
  }

  page.addEventListener('mouseover', (event) => {
    const dropdown = event.target.closest('.school-recipe-attendance-reset-dropdown');
    if (!dropdown || !page.contains(dropdown)) return;
    const related = event.relatedTarget;
    if (related && dropdown.contains(related)) return;
    clearResetMenuCloseTimer();
    setResetMenuOpen(dropdown, true);
  });

  page.addEventListener('mouseout', (event) => {
    const dropdown = event.target.closest('.school-recipe-attendance-reset-dropdown');
    if (!dropdown || !page.contains(dropdown)) return;
    const related = event.relatedTarget;
    if (related && dropdown.contains(related)) return;
    scheduleResetMenuClose(dropdown);
  });

  page.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    closeResetMenu();
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
    const resetToggle = event.target.closest('[data-attendance-reset-toggle]');
    if (resetToggle) {
      const dropdown = resetToggle.closest('.school-recipe-attendance-reset-dropdown');
      clearResetMenuCloseTimer();
      const canClose = dropdown?.classList.contains('is-open') && !dropdown.matches(':hover');
      setResetMenuOpen(dropdown, !canClose);
      return;
    }
    if (!event.target.closest('.school-recipe-attendance-reset-dropdown')) closeResetMenu();
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
        syncCurrentDraftFromInputs(page);
        state.canteen = nextCanteen;
        window.AppStorage?.write?.(canteenStorageKey, nextCanteen);
        state.attendanceByDate = buildAttendanceMap();
        state.attendance = menuAttendanceWithDefaults(state.attendanceByDate[state.selectedDate] || attendanceService.get(state.selectedDate, currentCanteen()), state.selectedDate);
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
      state.attendance = menuAttendanceWithDefaults(state.attendanceByDate[state.selectedDate] || attendanceService.get(state.selectedDate, currentCanteen()), state.selectedDate);
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
      state.attendance = menuAttendanceWithDefaults(state.attendanceByDate[state.selectedDate] || attendanceService.get(state.selectedDate, currentCanteen()), state.selectedDate);
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
    if (attendanceAction === 'fill-defaults') {
      state.attendance = menuAttendanceWithDefaults(state.attendance, state.selectedDate);
      state.attendanceByDate[state.selectedDate] = state.attendance;
      renderBody(root);
      showToast('已填入当前日期默认人数');
      return;
    }
    if (attendanceAction === 'reset-current') {
      const cleared = clone(attendanceService.emptyRecord(state.selectedDate, currentCanteen()));
      cleared.meals = {};
      attendanceService.remove(state.selectedDate, currentCanteen());
      state.attendance = cleared;
      state.attendanceByDate[state.selectedDate] = state.attendance;
      renderBody(root);
      showToast('已重置当前日期人数');
      return;
    }
    if (attendanceAction === 'reset-all') {
      const dates = filledAttendanceDates();
      dates.forEach((date) => attendanceService.remove(date, currentCanteen()));
      draftsByCanteen[currentScopeKey()] = {};
      state.attendanceByDate = buildAttendanceMap();
      state.attendance = clone(attendanceService.emptyRecord(state.selectedDate, currentCanteen()));
      state.attendance.meals = {};
      renderBody(root);
      showToast(dates.length ? `已重置全部 ${dates.length} 个已填日期` : '暂无已填写日期');
      return;
    }
    if (attendanceAction === 'continue') {
      syncCurrentDraftFromInputs(page);
      const menu = menuForDate(state.selectedDate);
      const validation = attendanceService.validate(menu, state.attendance, serviceOptions());
      if (!validation.canContinue) {
        showToast(validation.message || '请先完成当前日期填报', true);
        return;
      }
      saveFilledAttendanceDrafts();
      const savedRecord = attendanceService.get(state.selectedDate, currentCanteen());
      const savedCalculation = attendanceService.calculate(menu, savedRecord, serviceOptions());
      if (Number(savedCalculation.totalPeople || 0) <= 0) {
        showToast('人数保存失败，请重新填写后再确认', true);
        return;
      }
      if (window.AppNavigationGuard?.navigate) window.AppNavigationGuard.navigate(`./school-recipe-demand-confirm.html?date=${encodeURIComponent(state.selectedDate)}`);
      else window.location.href = `./school-recipe-demand-confirm.html?date=${encodeURIComponent(state.selectedDate)}`;
    }
  });

})();
