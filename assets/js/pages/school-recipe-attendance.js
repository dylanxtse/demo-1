(function () {
  const recipeService = window.SchoolRecipeService;
  const attendanceService = window.SchoolRecipeAttendanceService;
  const canteenConfig = window.SchoolCanteenConfigService;
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
  const quantity = (value) => Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false });
  const productDisplay = (item) => window.DomUtils?.formatProductDisplay
    ? window.DomUtils.formatProductDisplay(item)
    : `${item?.productName || '--'}（${item?.unit || '--'}/--/--）`;
  const productForIngredient = (item) => {
    const code = item?.productCode || item?.productId || item?.goodsCode || '';
    const catalog = window.SchoolOrderService?.getProductCatalog?.() || window.DemoStore?.get?.('products') || window.MockProducts || [];
    return catalog.find((product) => String(product.code || product.id) === String(code)) || {};
  };
  const isStandardProduct = (item) => item?.isStandardProduct === true || item?.isStandardProduct === 'true' || item?.isStandardProduct === '是'
    || item?.isStandard === true || item?.isStandard === 'true' || item?.isStandard === '是'
    || productForIngredient(item).isStandardProduct === true || productForIngredient(item).isStandard === true;
  const renderProductName = (item, display) => `${item?.isNetVegetable === true || productForIngredient(item).isNetVegetable === true ? '<span class="school-recipe-net-vegetable-tag">净菜</span>' : ''}${escapeHtml(display)}`;
  const purchaseQuantity = (value, item) => {
    const amount = Number(value);
    return Number.isFinite(amount) ? (isStandardProduct(item) ? Math.ceil(amount) : amount) : 0;
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
  const defaultMonth = `${todayMonth}-01`;
  const defaultDate = allMenus.find((menu) => String(menu.date).startsWith(todayMonth))?.date || dateValue(today);
  const state = { selectedDate: defaultDate, monthStart: defaultMonth, canteen: canteenNames.includes(storedCanteen) ? storedCanteen : defaultCanteen, attendanceByDate: {} };
  const draftsByCanteen = {};
  let attendanceInputMode = 'dining';
  let attendanceValidationHighlightDate = '';
  let dishTooltip = null;

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

  function hydrateDefaults(record, date) {
    const next = clone(record || attendanceService.emptyRecord(date, currentCanteen()));
    const menu = menuForDate(date);
    if (!next.meals) next.meals = {};
    if (!menu) return next;
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

  const startWithEmptyAttendance = Boolean(attendanceService.consumeResetOnReturn?.(currentCanteen()));

  function attendanceForSelection(date, preserveEmpty = false) {
    const record = state.attendanceByDate[date] || attendanceService.get(date, currentCanteen());
    return startWithEmptyAttendance && preserveEmpty ? clone(record) : hydrateDefaults(record, date);
  }

  state.attendanceByDate = buildAttendanceMap();
  state.attendance = attendanceForSelection(defaultDate, true);

  function cacheCurrentDraft() {
    const scope = currentScopeKey();
    if (!draftsByCanteen[scope]) draftsByCanteen[scope] = {};
    draftsByCanteen[scope][state.selectedDate] = clone(state.attendance);
    state.attendanceByDate[state.selectedDate] = state.attendance;
  }

  function attendanceForDate(date) {
    if (date === state.selectedDate) return state.attendance;
    return state.attendanceByDate[date] || attendanceService.get(date, currentCanteen());
  }

  function filledAttendanceDates() {
    return allMenus
      .filter((menu) => attendanceService.calculate(menu, attendanceForDate(menu.date), serviceOptions()).totalDiningPeople > 0)
      .map((menu) => menu.date);
  }

  function serviceOptions() {
    return { canteen: currentCanteen(), participants: participantsForState() };
  }

  function canAttemptContinue(menu, validation) {
    return Boolean(menu) && participantsForState().length > 0 && !validation.errors.length && !validation.missingMappings.length;
  }

  function canSaveNonDining(validation, calculation) {
    return !validation.errors.length && Number(calculation?.totalDiningPeople || 0) > 0;
  }

  function statusForDate(date) {
    const menu = menuForDate(date);
    if (!menu) return { key: 'no-menu', label: '无菜谱' };
    const status = attendanceService.status(menu, attendanceForDate(date), serviceOptions());
    return { ...status, label: status.key === 'empty' ? '待填' : status.label };
  }

  function syncCurrentDraftFromInputs(page) {
    page.querySelectorAll('[data-attendance-field], [data-attendance-non-dining-field]').forEach((input) => {
      const mealKey = input.dataset.mealKey;
      const isNonDining = input.dataset.attendanceNonDiningField != null;
      const type = isNonDining ? input.dataset.attendanceNonDiningField : input.dataset.attendanceField;
      if (!mealKey || !type) return;
      const recordKey = isNonDining ? 'temporaryNonDining' : 'meals';
      if (!state.attendance[recordKey]) state.attendance[recordKey] = {};
      if (!state.attendance[recordKey][mealKey]) state.attendance[recordKey][mealKey] = {};
      state.attendance[recordKey][mealKey][type] = input.value === '' ? '' : input.value;
    });
    cacheCurrentDraft();
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
      if (Number(calculation.totalDiningPeople || 0) <= 0) return;
      const saved = attendanceService.save(menu.date, record.meals, menu.version || recipeService.MENU_VERSION, canteen, record.temporaryNonDining);
      state.attendanceByDate[menu.date] = clone(saved);
      if (menu.date === state.selectedDate) state.attendance = clone(saved);
    });
  }

  function renderOverview(menu) {
    const record = attendanceForDate(state.selectedDate);
    const calculation = attendanceService.calculate(menu, record, serviceOptions());
    return `${renderCanteenTabs()}<div class="school-recipe-attendance-overview" id="schoolRecipeAttendanceOverview" aria-label="总人数填报概况">
      <div class="school-recipe-attendance-overview-fields">
        <div class="school-recipe-attendance-overview-item school-recipe-attendance-date"><span class="school-recipe-attendance-overview-label">用料日期：</span><strong>${escapeHtml(menu ? longDate(menu.date) : longDate(state.selectedDate))}</strong></div>
        <div class="school-recipe-attendance-overview-item school-recipe-attendance-total"><span class="school-recipe-attendance-overview-label">实际就餐人次：</span><strong id="schoolRecipeAttendanceOverviewTotal">${number(calculation.totalPeople)}</strong></div>
        <div class="school-recipe-attendance-overview-item school-recipe-attendance-non-dining${calculation.totalNonDiningPeople > 0 ? '' : ' school-recipe-attendance-is-hidden'}" data-attendance-overview-non-dining><span class="school-recipe-attendance-overview-label">不就餐人次：</span><strong data-attendance-overview-non-dining-total>${number(calculation.totalNonDiningPeople)}</strong></div>
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
      return `<button type="button" class="school-recipe-attendance-date-item ${date === state.selectedDate ? 'is-selected' : ''} ${menu ? '' : 'is-empty'} is-${escapeHtml(status.key)}" data-attendance-date="${escapeHtml(date)}" title="${escapeHtml(date)}">
        <span class="school-recipe-attendance-date-number">${escapeHtml(String(Number(date.slice(8, 10))))}</span>
        <span class="school-recipe-attendance-date-week${hideWeekday ? ' is-hidden' : ''}">${escapeHtml(weekday(date))}</span>
      </button>`;
    }).join('');
    return `<aside class="school-recipe-attendance-date-panel" aria-label="总人数填报日期">
      <div class="school-recipe-attendance-panel-heading"><div class="school-recipe-attendance-calendar-actions"><button type="button" data-attendance-month="prev" aria-label="上一个月" title="上一个月" ${canGoPrevious ? '' : 'disabled'}><svg class="icon-svg school-recipe-attendance-calendar-icon" viewBox="0 0 24 24" aria-hidden="true"><polyline points="15 18 9 12 15 6"></polyline></svg></button><span class="school-recipe-attendance-current-month">${escapeHtml(monthLabel(state.monthStart))}</span><button type="button" data-attendance-month="next" aria-label="下一个月" title="下一个月" ${canGoNext ? '' : 'disabled'}><svg class="icon-svg school-recipe-attendance-calendar-icon" viewBox="0 0 24 24" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg></button></div></div>
      <div class="school-recipe-attendance-calendar-caption"><span>本月菜谱</span></div>
      <div class="school-recipe-attendance-calendar-weekdays" aria-hidden="true">${weekdayNames.map((name) => `<span>${escapeHtml(name)}</span>`).join('')}</div>
      <div class="school-recipe-attendance-date-list">${cells}</div>
    </aside>`;
  }

  function participantHeading(participant) {
    return `<span class="school-recipe-attendance-participant-name">${escapeHtml(`${participant.label || participant.tagName} - ${participant.nutritious || '不区分'}`)}</span>`;
  }

  function demandParticipantHeader(participants, participant) {
    const name = attendanceService.participantDisplayName?.(participant, participants) || participant.label || participant.tagName || '--';
    return `<th colspan="2">${escapeHtml(name)}</th>`;
  }

  function mealField(record, mealKey, participant) {
    return attendanceService.valueForParticipant(record?.meals?.[mealKey] || {}, participant);
  }

  function temporaryNonDiningField(record, mealKey, participant) {
    return attendanceService.temporaryNonDiningFor?.(record, mealKey, participant) || '';
  }

  function findEmptyAttendanceField(menu, record) {
    const participants = participantsForState();
    for (const meal of menu?.meals || []) {
      for (const participant of participants) {
        const value = mealField(record, meal.key, participant);
        if (value === '' || value == null) return { meal, participant };
      }
    }
    return null;
  }

  function recordHasAttendanceValues(record) {
    return [record?.meals, record?.temporaryNonDining].some((group) => Object.values(group || {}).some((values) => (
      Object.values(values || {}).some((value) => value !== '' && value != null)
    )));
  }

  function attendanceDatesForValidation() {
    const otherDates = allMenus
      .map((menu) => menu.date)
      .filter((date) => date !== state.selectedDate)
      .filter((date) => recordHasAttendanceValues(attendanceForDate(date)));
    return [state.selectedDate, ...otherDates];
  }

  function findFirstEmptyAttendanceField() {
    for (const date of attendanceDatesForValidation()) {
      const menu = menuForDate(date);
      const record = attendanceForDate(date);
      const field = findEmptyAttendanceField(menu, record);
      if (field) return { date, record, ...field };
    }
    return null;
  }

  function nonDiningIssue(record, mealKey, participant) {
    const value = temporaryNonDiningField(record, mealKey, participant);
    if (value === '' || value == null) return '';
    const parsed = Number(value);
    const diningValue = mealField(record, mealKey, participant);
    const diningPeople = Number(diningValue);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100000) return '请输入 0～100000 的整数';
    if (parsed > 0 && (!Number.isInteger(diningPeople) || diningPeople < 1 || diningPeople > 100000)) return '请先填写总人数';
    if (parsed > diningPeople) return '不能大于总人数';
    return '';
  }

  function renderMealTable(meals, record) {
    const participants = participantsForState();
    const isNonDiningMode = attendanceInputMode === 'non-dining';
    const personCount = Math.max(1, participants.length);
    const mealColumnWidth = 112;
    const dishMinWidth = 80;
    const personColumnWidth = 152;
    const mealTotalWidth = 108;
    const fixedColumnsWidth = mealColumnWidth + (personCount * personColumnWidth) + mealTotalWidth;
    const minTableWidth = fixedColumnsWidth + dishMinWidth;
    const personHeaders = participants.length
      ? participants.map((participant) => `<th>${participantHeading(participant)}</th>`).join('')
      : '<th class="school-recipe-attendance-no-participant">暂无启用人员类型</th>';
    const rows = meals.map((meal) => {
      const values = participants.map((participant) => mealField(record, meal.key, participant));
      const dishNames = (meal.dishes || []).map((dish) => dish.name).join('、');
      const total = participants.reduce((sum, participant) => sum + attendanceService.effectivePeopleFor(record, meal.key, participant), 0);
      const personCells = participants.length
        ? participants.map((participant, index) => {
          const nonDiningValue = temporaryNonDiningField(record, meal.key, participant);
          const issue = nonDiningIssue(record, meal.key, participant);
          const diningPeople = Number(values[index]);
          const nonDiningMax = Number.isInteger(diningPeople) && diningPeople >= 0 && diningPeople <= 100000 ? diningPeople : 100000;
          const isEmptyHighlight = !isNonDiningMode && attendanceValidationHighlightDate === state.selectedDate && (values[index] === '' || values[index] == null);
          const diningInput = `<div class="school-recipe-attendance-table-input"><input class="school-recipe-attendance-count-input${isEmptyHighlight ? ' is-empty' : ''}" type="number" min="0" max="100000" step="1" inputmode="numeric" value="${escapeHtml(values[index])}" placeholder="请输入" data-attendance-field="${escapeHtml(participant.key)}" data-meal-key="${escapeHtml(meal.key)}" aria-label="${escapeHtml(`${meal.name}${participant.label}人数`)}"${isEmptyHighlight ? ' aria-invalid="true"' : ''}><i>人</i></div>`;
          if (!isNonDiningMode) {
            const nonDiningPeople = Number(nonDiningValue);
            const nonDiningSummary = Number.isInteger(nonDiningPeople) && nonDiningPeople > 0
              ? `<small class="school-recipe-attendance-person-non-dining-summary">含不就餐${number(nonDiningPeople)}人</small>`
              : '';
            return `<td>${diningInput}${nonDiningSummary}</td>`;
          }
          const diningDisplayValue = values[index] === '' || values[index] == null ? '--' : `${number(values[index])} 人`;
          return `<td><div class="school-recipe-attendance-person-cell is-non-dining-mode">
            <div class="school-recipe-attendance-person-count-display"><span>总人数</span><strong>${escapeHtml(diningDisplayValue)}</strong></div>
            <div class="school-recipe-attendance-person-count-item"><span>不就餐</span><div class="school-recipe-attendance-table-input school-recipe-attendance-non-dining-input"><input type="number" min="0" max="${nonDiningMax}" step="1" inputmode="numeric" value="${escapeHtml(nonDiningValue)}" placeholder="0" data-attendance-non-dining-field="${escapeHtml(participant.key)}" data-meal-key="${escapeHtml(meal.key)}" aria-label="${escapeHtml(`${meal.name}${participant.label}不就餐人数`)}"${issue ? ' aria-invalid="true"' : ''}><i>人</i></div><small class="school-recipe-attendance-non-dining-error${issue ? ' is-visible' : ''}" data-attendance-non-dining-error data-meal-key="${escapeHtml(meal.key)}" data-participant-key="${escapeHtml(participant.key)}">${escapeHtml(issue)}</small></div>
          </div></td>`;
        }).join('')
        : '<td class="school-recipe-attendance-no-participant-cell">请先在食堂运营设置中启用人员类型</td>';
      return `<tr data-attendance-meal="${escapeHtml(meal.key)}">
        <td class="school-recipe-attendance-meal-name"><strong>${escapeHtml(meal.name)}</strong></td>
        <td class="school-recipe-attendance-dish-cell" data-dishes="${escapeHtml(dishNames)}">${escapeHtml(dishNames || '暂无菜品')}</td>
        ${personCells}
        <td class="school-recipe-attendance-meal-total-cell"><strong data-attendance-meal-total="${escapeHtml(meal.key)}">${number(total)}</strong><i>人</i></td>
      </tr>`;
    }).join('');
    const personColgroup = Array.from({ length: personCount }, () => '<col class="col-person">').join('');
    return `<div class="school-recipe-attendance-meal-table-wrap"><table class="school-recipe-attendance-meal-table" style="--meal-table-min-width:${minTableWidth}px;--meal-fixed-columns-width:${fixedColumnsWidth}px;--meal-dish-min-width:${dishMinWidth}px"><colgroup><col class="col-meal"><col class="col-dishes">${personColgroup}<col class="col-meal-total"></colgroup><thead><tr><th rowspan="2">餐次</th><th rowspan="2">当餐菜品</th><th colspan="${personCount}">总人数</th><th rowspan="2">本餐合计</th></tr><tr>${personHeaders}</tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function renderNotice(menu, record) {
    if (!menu) return '';
    const validation = attendanceService.validate(menu, record, serviceOptions());
    if (!participantsForState().length) return `<div class="school-recipe-attendance-notice is-warning"><span class="school-recipe-attendance-notice-icon">!</span><div><strong>尚未配置人员类型</strong><p>请先在当前食堂的运营设置中启用人员类型，再填写总人数。</p></div></div>`;
    if (validation.errors.length) return `<div class="school-recipe-attendance-notice is-warning"><span class="school-recipe-attendance-notice-icon">!</span><div><p>${escapeHtml(validation.message || validation.errors[0])}</p></div></div>`;
    if (validation.missingMappings.length) {
      return `<div class="school-recipe-attendance-notice is-warning"><span class="school-recipe-attendance-notice-icon">!</span><div><strong>存在未关联商品</strong><p>${escapeHtml(validation.missingMappings.join('、'))}尚未关联采购商品，请先在营养膳食管理平台完成关联后重新同步。</p></div></div>`;
    }
    return '';
  }

  function renderDemand(menu, record) {
    if (!menu) return '<div class="school-recipe-attendance-empty">请选择有菜谱的日期</div>';
    const participants = participantsForState();
    if (!participants.length) return '<div class="school-recipe-attendance-empty">当前食堂暂无启用的人员类型</div>';
    const calculation = attendanceService.calculate(menu, record, serviceOptions());
    const rows = calculation.rows
      .filter((row) => Number(row.totalQty || 0) > 0)
      .map((row, index) => `<tr>
      <td>${index + 1}</td>
      <td class="school-recipe-attendance-product-name">${renderProductName(row, productDisplay(row))}</td>
      <td>${isStandardProduct(row) ? '是' : '否'}</td>
      <td>${escapeHtml(row.productCode || '--')}</td>
      <td>${escapeHtml(row.unit)}</td>
      ${participants.map((participant) => `<td class="is-number">${quantity(row.participantQty?.[participant.key])}</td><td class="is-number">${quantity(purchaseQuantity(row.participantQty?.[participant.key], row))}</td>`).join('')}
    </tr>`).join('');
    const dynamicColumns = participants.map((participant) => demandParticipantHeader(participants, participant)).join('');
    const dynamicSubColumns = participants.map(() => '<th>需求量</th><th>采购量</th>').join('');
    const dynamicColgroup = participants.map(() => '<col class="col-quantity"><col class="col-purchase">').join('');
    return rows ? `<div class="school-recipe-attendance-table-wrap"><table class="school-recipe-attendance-table"><colgroup><col class="col-index"><col class="col-product"><col class="col-standard"><col class="col-code"><col class="col-unit">${dynamicColgroup}</colgroup><thead><tr><th rowspan="2">序号</th><th rowspan="2">商品名称（计量单位/品牌/规格）</th><th rowspan="2">是否标品</th><th rowspan="2">商品编号</th><th rowspan="2">单位</th>${dynamicColumns}</tr><tr>${dynamicSubColumns}</tr></thead><tbody>${rows}</tbody></table></div>` : '<div class="school-recipe-attendance-empty">当前食谱暂无关联商品</div>';
  }

  function renderDetail(menu) {
    const record = attendanceForDate(state.selectedDate);
    const validation = attendanceService.validate(menu, record, serviceOptions());
    const meals = menu?.meals || [];
    if (!menu) return `<main class="school-recipe-attendance-detail-panel">${renderOverview(menu)}<div class="school-recipe-attendance-detail-empty"><div class="operation-empty-icon"><svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div><p>请选择有菜谱的日期</p></div></main>`;
    const isNonDiningMode = attendanceInputMode === 'non-dining';
    const calculation = attendanceService.calculate(menu, record, serviceOptions());
    const canSaveNonDiningMode = canSaveNonDining(validation, calculation);
    const canContinueAttempt = canAttemptContinue(menu, validation);
    const footer = isNonDiningMode
      ? '<div class="school-recipe-attendance-mode-tip">填写完成后点击右上角“保存”</div>'
      : `<div class="school-recipe-attendance-draft-actions"><div class="school-recipe-attendance-reset-dropdown"><button type="button" class="btn btn-sm school-recipe-attendance-reset-trigger" data-attendance-reset-toggle aria-expanded="false" aria-haspopup="menu">重置<svg class="school-recipe-attendance-reset-chevron" viewBox="0 0 24 24" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg></button><div class="school-recipe-attendance-reset-menu" role="menu"><button type="button" role="menuitem" data-attendance-action="reset-current">重置当前人数</button><button type="button" role="menuitem" data-attendance-action="reset-all">重置全部人数</button></div></div><button type="button" class="btn btn-sm" data-attendance-action="fill-defaults">填写默认人数</button></div><div class="school-recipe-attendance-confirm-action"><button type="button" class="btn btn-primary btn-sm ${canContinueAttempt ? '' : 'btn-disabled'}" data-attendance-action="continue" ${canContinueAttempt ? '' : 'disabled'}>确认需求</button></div>`;
    return `<main class="school-recipe-attendance-detail-panel" aria-label="总人数填报详情">
      ${renderOverview(menu)}
      <div class="school-recipe-attendance-detail-scroll">
        <div class="school-recipe-attendance-section-heading"><div><span class="section-title-mark">餐次总人数</span>${isNonDiningMode ? '<p class="school-recipe-attendance-mode-hint">当前为不就餐人数填写模式，总人数已锁定</p>' : '<span class="school-recipe-attendance-count-tip">无人员就餐请填写为0</span>'}</div><button type="button" class="btn btn-sm school-recipe-attendance-mode-action${isNonDiningMode ? ' btn-primary' : ''}${isNonDiningMode && !canSaveNonDiningMode ? ' btn-disabled' : ''}" data-attendance-mode-toggle${isNonDiningMode && !canSaveNonDiningMode ? ' disabled' : ''}>${isNonDiningMode ? '保存' : '填写不就餐人数'}</button></div>
        ${renderNotice(menu, record)}
        ${renderMealTable(meals, record)}
        <section class="school-recipe-attendance-demand-section" aria-label="商品需求测算"><header><div><span class="section-title-mark">商品需求测算</span></div></header><div id="schoolRecipeAttendanceDemand">${renderDemand(menu, record)}</div></section>
      </div>
      <footer class="school-recipe-attendance-actions">${footer}</footer>
    </main>`;
  }

  function renderBody(root) {
    const body = root.querySelector('#schoolRecipeAttendanceBody');
    hideDishTooltip();
    if (!body) return;
    body.innerHTML = `${renderCalendar()}${renderDetail(menuForDate(state.selectedDate))}`;
  }

  function focusFirstNonDiningInput(page) {
    page.querySelector('[data-attendance-non-dining-field]')?.focus({ preventScroll: true });
  }

  function focusEmptyAttendanceField(root, issue) {
    attendanceValidationHighlightDate = issue.date;
    state.selectedDate = issue.date;
    state.monthStart = monthStart(issue.date);
    state.attendance = clone(issue.record);
    state.attendanceByDate[issue.date] = clone(issue.record);
    renderBody(root);
    const input = [...page.querySelectorAll('[data-attendance-field]')]
      .find((item) => item.dataset.mealKey === issue.meal.key && item.dataset.attendanceField === issue.participant.key);
    input?.focus({ preventScroll: true });
    input?.scrollIntoView?.({ block: 'center', inline: 'nearest' });
    const participantName = issue.participant.label || issue.participant.tagName || '人员';
    showToast(`${issue.meal.name}${participantName}总人数不能为空`, true);
  }

  function saveNonDiningMode(page, root) {
    syncCurrentDraftFromInputs(page);
    const menu = menuForDate(state.selectedDate);
    const validation = attendanceService.validate(menu, state.attendance, serviceOptions());
    if (validation.errors.length) {
      if (validation.errors.some((message) => message.includes('请先填写总人数'))) {
        attendanceInputMode = 'dining';
        renderBody(root);
      }
      showToast(validation.message || validation.errors[0], true);
      if (attendanceInputMode === 'non-dining') updateLiveView(page);
      return;
    }
    const calculation = attendanceService.calculate(menu, state.attendance, serviceOptions());
    if (Number(calculation.totalDiningPeople || 0) <= 0) {
      attendanceInputMode = 'dining';
      renderBody(root);
      showToast('请先填写总人数后再填不就餐人数', true);
      return;
    }
    const saved = attendanceService.save(
      state.selectedDate,
      state.attendance.meals,
      menu.version || recipeService.MENU_VERSION,
      currentCanteen(),
      state.attendance.temporaryNonDining
    );
    state.attendanceByDate[state.selectedDate] = clone(saved);
    state.attendance = clone(saved);
    attendanceInputMode = 'dining';
    renderBody(root);
    showToast('已保存不就餐人数，已返回总人数填报');
  }

  function updateLiveView(page) {
    const menu = menuForDate(state.selectedDate);
    if (!menu) return;
    const record = attendanceForDate(state.selectedDate);
    const calculation = attendanceService.calculate(menu, record, serviceOptions());
    const validation = attendanceService.validate(menu, record, serviceOptions());
    const demand = page.querySelector('#schoolRecipeAttendanceDemand');
    if (demand) demand.innerHTML = renderDemand(menu, record);
    const overviewTotal = page.querySelector('#schoolRecipeAttendanceOverviewTotal');
    if (overviewTotal) overviewTotal.textContent = number(calculation.totalPeople);
    const overviewNonDining = page.querySelector('[data-attendance-overview-non-dining]');
    const overviewNonDiningTotal = page.querySelector('[data-attendance-overview-non-dining-total]');
    overviewNonDiningTotal && (overviewNonDiningTotal.textContent = number(calculation.totalNonDiningPeople));
    overviewNonDining?.classList.toggle('school-recipe-attendance-is-hidden', calculation.totalNonDiningPeople <= 0);
    const continueButton = page.querySelector('[data-attendance-action="continue"]');
    if (continueButton) {
      const canContinueAttempt = canAttemptContinue(menu, validation);
      continueButton.disabled = !canContinueAttempt;
      continueButton.classList.toggle('btn-disabled', !canContinueAttempt);
    }
    const modeToggle = page.querySelector('[data-attendance-mode-toggle]');
    if (modeToggle && attendanceInputMode === 'non-dining') {
      const canSaveNonDiningMode = canSaveNonDining(validation, calculation);
      modeToggle.disabled = !canSaveNonDiningMode;
      modeToggle.classList.toggle('btn-disabled', !canSaveNonDiningMode);
    }
    page.querySelectorAll('[data-attendance-field]').forEach((input) => {
      const isEmptyHighlight = attendanceValidationHighlightDate === state.selectedDate && (input.value === '' || input.value == null);
      input.classList.toggle('is-empty', isEmptyHighlight);
      input.toggleAttribute('aria-invalid', isEmptyHighlight);
    });
    const participants = participantsForState();
    page.querySelectorAll('[data-attendance-meal-total]').forEach((element) => {
      const mealRow = calculation.mealRows.find((row) => row.key === element.dataset.attendanceMealTotal);
      element.textContent = number(mealRow?.totalPeople || 0);
    });
    page.querySelectorAll('[data-attendance-non-dining-error]').forEach((element) => {
      const participant = participants.find((item) => item.key === element.dataset.participantKey);
      const issue = participant ? nonDiningIssue(record, element.dataset.mealKey, participant) : '';
      element.textContent = issue;
      element.classList.toggle('is-visible', Boolean(issue));
      const input = element.closest('.school-recipe-attendance-person-count-item')?.querySelector('[data-attendance-non-dining-field]');
      input?.toggleAttribute('aria-invalid', Boolean(issue));
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
    cacheCurrentDraft();
    state.selectedDate = date;
    state.monthStart = monthStart(date);
    state.attendance = attendanceForSelection(date);
    renderBody(root);
  }

  const content = `<section class="page-card school-recipe-attendance-page" id="schoolRecipeAttendancePage" aria-label="总人数填报"><div class="school-recipe-attendance-body" id="schoolRecipeAttendanceBody"></div></section>`;
  const root = window.AppShell.mount({ title: '总人数填报', content, variant: 'school', emptyText: '总人数填报' });
  const page = root.querySelector('#schoolRecipeAttendancePage');
  renderBody(root);

  function resetPageAfterFlowReturn() {
    if (!attendanceService.consumeResetOnReturn?.(currentCanteen())) return;
    draftsByCanteen[currentScopeKey()] = {};
    attendanceInputMode = 'dining';
    state.attendanceByDate = buildAttendanceMap();
    state.attendance = attendanceForSelection(state.selectedDate, true);
    renderBody(root);
  }

  window.addEventListener('pageshow', (event) => {
    if (event.persisted) resetPageAfterFlowReturn();
  });

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
    const input = event.target.closest('[data-attendance-field], [data-attendance-non-dining-field]');
    if (!input) return;
    syncCurrentDraftFromInputs(page);
    updateLiveView(page);
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
    const modeToggle = event.target.closest('[data-attendance-mode-toggle]');
    if (modeToggle) {
      if (attendanceInputMode === 'non-dining') saveNonDiningMode(page, root);
      else {
        syncCurrentDraftFromInputs(page);
        const menu = menuForDate(state.selectedDate);
        const calculation = attendanceService.calculate(menu, state.attendance, serviceOptions());
        if (Number(calculation.totalDiningPeople || 0) <= 0) {
          showToast('请先填写总人数后再填不就餐人数', true);
          return;
        }
        attendanceInputMode = 'non-dining';
        renderBody(root);
        focusFirstNonDiningInput(page);
      }
      return;
    }
    if (attendanceInputMode === 'non-dining') {
      const navigationTarget = event.target.closest('[data-recipe-canteen], [data-attendance-date], [data-attendance-month], [data-attendance-action]');
      if (navigationTarget) {
        showToast('请先保存不就餐人数，再切换日期或执行其他操作', true);
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
        state.attendance = attendanceForSelection(state.selectedDate);
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
      cacheCurrentDraft();
      const offset = monthButton.dataset.attendanceMonth === 'prev' ? -1 : 1;
      const nextMonth = shiftMonth(state.monthStart, offset);
      if (nextMonth < minMonthStart || nextMonth > maxMonthStart) return;
      state.monthStart = nextMonth;
      const dates = monthDates(state.monthStart);
      state.selectedDate = dates.includes(state.selectedDate) ? state.selectedDate : dates.find((date) => menuForDate(date)) || dates[0];
      state.attendance = attendanceForSelection(state.selectedDate);
      renderBody(root);
      return;
    }
    const action = event.target.closest('[data-attendance-action]')?.dataset.attendanceAction;
    if (!action) return;
    if (action === 'fill-defaults') {
      state.attendance = hydrateDefaults(state.attendance, state.selectedDate);
      cacheCurrentDraft();
      renderBody(root);
      showToast('已填入当前日期默认人数');
      return;
    }
    if (action === 'reset-current') {
      const cleared = clone(attendanceService.emptyRecord(state.selectedDate, currentCanteen()));
      cleared.meals = {};
      cleared.temporaryNonDining = {};
      attendanceService.remove(state.selectedDate, currentCanteen());
      state.attendance = cleared;
      cacheCurrentDraft();
      renderBody(root);
      showToast('已重置当前日期人数');
      return;
    }
    if (action === 'reset-all') {
      const dates = filledAttendanceDates();
      dates.forEach((date) => attendanceService.remove(date, currentCanteen()));
      draftsByCanteen[currentScopeKey()] = {};
      state.attendanceByDate = buildAttendanceMap();
      state.attendance = clone(attendanceService.emptyRecord(state.selectedDate, currentCanteen()));
      state.attendance.meals = {};
      state.attendance.temporaryNonDining = {};
      renderBody(root);
      showToast(dates.length ? `已重置全部 ${dates.length} 个已填日期` : '暂无已填写日期');
      return;
    }
    if (action === 'continue') {
      syncCurrentDraftFromInputs(page);
      const menu = menuForDate(state.selectedDate);
      const emptyField = findFirstEmptyAttendanceField();
      if (emptyField) {
        focusEmptyAttendanceField(root, emptyField);
        return;
      }
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
      attendanceService.markResetOnReturn?.(currentCanteen());
      if (window.AppNavigationGuard?.navigate) window.AppNavigationGuard.navigate(`./school-recipe-demand-confirm.html?date=${encodeURIComponent(state.selectedDate)}`);
      else window.location.href = `./school-recipe-demand-confirm.html?date=${encodeURIComponent(state.selectedDate)}`;
    }
  });

  window.addEventListener('pagehide', () => {
    attendanceService.markResetOnReturn?.(currentCanteen());
  });
})();
