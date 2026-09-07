(function () {
  const app = document.getElementById('schoolMobileApp');
  const recipeService = window.SchoolRecipeService;
  const attendanceService = window.SchoolRecipeAttendanceService;
  const demandService = window.SchoolRecipeDemandService;
  const orderService = window.SchoolOrderService;
  const canteenConfig = window.SchoolCanteenConfigService;

  if (!app || !recipeService || !attendanceService || !demandService || !orderService) {
    if (app) app.innerHTML = '<div class="school-mobile-error">学校移动端原型依赖加载失败，请返回学校端 Web 重试。</div>';
    return;
  }

  const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
  const weekdayNames = ['日', '一', '二', '三', '四', '五', '六'];
  let menus = recipeService.getAll().sort((a, b) => String(a.date).localeCompare(String(b.date)));
  let firstDate = menus[0]?.date || '2026-09-07';
  const defaultCanteen = window.SchoolOrderService?.CANTEEN_NAME || '第一食堂';
  const canteenStorageKey = 'school-recipe-current-canteen';
  const mobileAttendanceEmptyKey = 'school-mobile-attendance-empty-v20260907';
  const mobileAuthStorageKey = 'school-mobile-auth-session-v1';
  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  const number = (value) => Number(value || 0).toLocaleString('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 12,
    useGrouping: false
  });
  const quantity = (value) => Number(value || 0).toLocaleString('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    useGrouping: false
  });
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
  const dateText = (date) => {
    if (!date) return '--';
    const dateObject = new Date(String(date) + 'T00:00:00');
    const weekday = Number.isNaN(dateObject.getTime()) ? '' : ' 星期' + weekdayNames[dateObject.getDay()];
    return String(date).slice(0, 4) + '年' + String(date).slice(5, 7) + '月' + String(date).slice(8, 10) + '日' + weekday;
  };
  const weekdayText = (date) => {
    const dateObject = new Date(String(date || '') + 'T00:00:00');
    return Number.isNaN(dateObject.getTime()) ? '' : weekdayNames[dateObject.getDay()];
  };
  const shortDate = (date) => String(date || '').slice(5).replace('-', '/');
  const dateValueMarkup = (date) => {
    const text = dateText(date);
    const match = text.match(/^(.*)\s(星期[日一二三四五六])$/);
    return match
      ? escapeHtml(match[1]) + ' <small class="school-mobile-weekday">' + escapeHtml(match[2]) + '</small>'
      : escapeHtml(text);
  };
  const monthKeyOf = (date) => String(date || '').slice(0, 7);
  const dateKeyFor = (monthKey, day) => monthKey + '-' + String(day).padStart(2, '0');
  const shiftMonthKey = (monthKey, offset) => {
    const [year, month] = String(monthKey || '').split('-').map(Number);
    const date = new Date(year || 2026, (month || 1) - 1 + offset, 1);
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
  };
  const daysInMonth = (monthKey) => {
    const [year, month] = String(monthKey || '').split('-').map(Number);
    return new Date(year || 2026, month || 1, 0).getDate();
  };
  const anchorMonthKey = monthKeyOf(firstDate) || '2026-09';
  const supportedMonthKeys = [
    shiftMonthKey(anchorMonthKey, -1),
    anchorMonthKey,
    shiftMonthKey(anchorMonthKey, 1)
  ];
  const isSupportedMonth = (monthKey) => supportedMonthKeys.includes(monthKey);
  const menuFor = (date) => menus.find((menu) => menu.date === date) || null;
  const dishCount = (menu) => (menu?.meals || []).reduce((total, meal) => total + (meal.dishes || []).length, 0);
  const ingredientCount = (menu) => (menu?.meals || []).reduce((total, meal) => (
    total + (meal.dishes || []).reduce((dishTotal, dish) => dishTotal + (dish.ingredients || []).length, 0)
  ), 0);
  const productFor = (item) => {
    const catalog = window.SchoolOrderService?.getProductCatalog?.() || window.DemoStore?.get?.('products') || [];
    const code = item?.productCode || item?.productId || item?.goodsCode || '';
    return catalog.find((product) => String(product.code || product.id) === String(code)) || {};
  };
  const productName = (item) => item?.productName || productFor(item).name || item?.name || '未关联采购商品';
  const productUnit = (item) => item?.unit || item?.productUnit || productFor(item).unit || '--';
  const isStandardProduct = (item) => Boolean(
    item?.isStandardProduct === true
    || item?.isStandardProduct === 'true'
    || item?.isStandardProduct === '是'
    || productFor(item).isStandardProduct === true
    || productFor(item).isStandard === true
  );
  const purchaseQuantity = (value, item) => {
    const demandQuantity = Number(value || 0);
    return isStandardProduct(item) ? Math.ceil(demandQuantity) : demandQuantity;
  };

  const storedMobileAuth = window.AppStorage?.read?.(mobileAuthStorageKey, null);
  const inheritedSession = window.DemoStore?.getSession?.() || null;
  let mobileSession = storedMobileAuth?.initialized
    ? clone(storedMobileAuth.session)
    : inheritedSession ? clone(inheritedSession) : null;

  function persistMobileSession(session) {
    mobileSession = session ? clone(session) : null;
    window.AppStorage?.write?.(mobileAuthStorageKey, { initialized: true, session: mobileSession });
  }

  function currentMobileSession() {
    return mobileSession ? clone(mobileSession) : null;
  }

  window.SchoolMobileAuth = {
    getSession: currentMobileSession
  };

  function readCanteenNames() {
    const source = canteenConfig?.readCanteens?.() || window.SchoolReferenceData?.canteens || [];
    const names = [...new Set(source
      .map((item) => typeof item === 'string' ? item : item?.name)
      .filter(Boolean)
      .filter((name) => name !== '默认'))];
    return names.length ? names : [defaultCanteen];
  }

  const canteenNames = readCanteenNames();
  const storedCanteen = window.AppStorage?.read?.(canteenStorageKey, '') || '';
  const initialCanteen = canteenNames.includes(storedCanteen)
    ? storedCanteen
    : canteenNames.includes(defaultCanteen) ? defaultCanteen : canteenNames[0];

  function ensureMobileAttendanceStartsEmpty() {
    if (!window.AppStorage?.read || !window.AppStorage?.write) return;
    if (window.AppStorage.read(mobileAttendanceEmptyKey, false)) return;
    canteenNames.forEach((name) => {
      const canteen = canteenConfig?.getCanteen?.(name) || { id: '', name };
      menus.forEach((menu) => attendanceService.remove(menu.date, canteen));
    });
    window.AppStorage.write(mobileAttendanceEmptyKey, true);
  }

  const state = {
    screen: 'main',
    tab: 'recipe',
    date: firstDate,
    monthKey: monthKeyOf(firstDate) || anchorMonthKey,
    mealKey: '',
    canteen: initialCanteen,
    attendance: null,
    sheet: null,
    toast: null,
    toastTimer: 0,
    confirmDates: new Set(),
    expectedAt: '',
    submitting: false,
    recordKeyword: '',
    record: null,
    profileSection: 'submissions',
    loginUsername: '',
    loginPassword: '',
    loginAgreement: false,
    dateStripScroll: {}
  };
  let mealSwipeStart = null;

  function currentCanteen() {
    return canteenConfig?.getCanteen?.(state.canteen) || { id: '', name: state.canteen };
  }

  function participants() {
    return attendanceService.participantsFor(currentCanteen());
  }

  function serviceOptions() {
    return { canteen: currentCanteen(), participants: participants() };
  }

  function loadAttendance() {
    state.attendance = attendanceService.get(state.date, currentCanteen());
  }

  function saveAttendanceDraft() {
    const menu = menuFor(state.date);
    if (!menu || !state.attendance) return;
    state.attendance = attendanceService.save(
      state.date,
      state.attendance.meals || {},
      menu.version || recipeService.MENU_VERSION,
      currentCanteen()
    );
  }

  function reloadMenus() {
    menus = recipeService.getAll().sort((a, b) => String(a.date).localeCompare(String(b.date)));
    firstDate = menus[0]?.date || '2026-09-07';
    if (!isSupportedMonth(monthKeyOf(state.date))) {
      state.date = firstDate;
      state.mealKey = '';
    }
    state.monthKey = monthKeyOf(state.date) || anchorMonthKey;
  }

  function attendanceFor(date) {
    if (date === state.date && state.attendance) return clone(state.attendance);
    return attendanceService.get(date, currentCanteen());
  }

  function setDate(date) {
    if (!date || !isSupportedMonth(monthKeyOf(date))) return;
    if (state.date !== date) state.mealKey = '';
    state.date = date;
    state.monthKey = monthKeyOf(date);
    loadAttendance();
    fillDefaultsIfEmpty();
  }

  function changeMonth(offset) {
    const currentMonth = isSupportedMonth(state.monthKey) ? state.monthKey : anchorMonthKey;
    const nextMonth = shiftMonthKey(currentMonth, Number(offset) || 0);
    if (!isSupportedMonth(nextMonth)) return;
    state.monthKey = nextMonth;
    const firstMenu = menus.find((menu) => monthKeyOf(menu.date) === nextMonth);
    state.date = firstMenu?.date || dateKeyFor(nextMonth, 1);
    state.mealKey = '';
    loadAttendance();
    fillDefaultsIfEmpty();
    render();
  }

  function showToast() {}

  function renderHeader() {
    const loginPage = state.screen === 'main' && state.tab === 'profile' && !currentMobileSession();
    const title = loginPage
      ? '登录'
      : state.screen === 'confirm'
        ? '确认需求'
      : state.screen === 'detail'
        ? '提交记录详情'
        : state.tab === 'attendance'
          ? '需求填报'
          : state.tab === 'profile'
            ? '个人中心'
            : '食谱中心';
    const back = state.screen !== 'main'
      ? '<button type="button" class="school-mobile-back-button" data-action="back" aria-label="返回">‹</button>'
      : '';
    return '<header class="school-mobile-topbar">'
      + '<div class="school-mobile-topbar-main">'
      + '<div class="school-mobile-topbar-left">' + back
      + (state.screen === 'confirm' || loginPage ? '' : '<button type="button" class="school-mobile-canteen-button" data-action="open-canteen" title="切换食堂">' + escapeHtml(state.canteen) + '⌄</button>')
      + '</div>'
      + '<strong class="school-mobile-topbar-title">' + title + '</strong>'
      + '</div>'
      + '</header>';
  }

  function renderDateStrip(mode) {
    const currentParticipants = participants();
    const monthKey = isSupportedMonth(state.monthKey) ? state.monthKey : anchorMonthKey;
    const items = Array.from({ length: daysInMonth(monthKey) }, (_, index) => {
      const date = dateKeyFor(monthKey, index + 1);
      const menu = menuFor(date);
      const attendanceStatus = attendanceService.status(
        menu,
        attendanceFor(date),
        { canteen: currentCanteen(), participants: currentParticipants }
      );
      const statusKey = mode === 'attendance'
        ? menu ? attendanceStatus.key : 'no-menu'
        : menu ? 'published' : 'no-menu';
      const statusClass = 'is-' + statusKey;
      const statusLabel = mode === 'attendance'
        ? menu ? attendanceStatus.label || '未填写' : '无菜谱'
        : menu ? '已发布' : '暂无菜谱';
      return '<button type="button" class="school-mobile-date-item '
        + (date === state.date ? 'is-selected ' : '') + statusClass
        + '" data-action="select-date" data-date="' + escapeHtml(date) + '" aria-label="' + escapeHtml(dateText(date) + ' ' + statusLabel) + '" title="' + escapeHtml(statusLabel) + '">'
        + '<strong>' + escapeHtml(date.slice(8, 10)) + '</strong>'
        + '<small class="school-mobile-date-weekday">' + escapeHtml(weekdayText(date)) + '</small>'
        + '</button>';
    }).join('');
    return '<div class="school-mobile-date-strip-shell" data-date-strip-shell data-month-key="' + escapeHtml(monthKey) + '">'
      + '<button type="button" class="school-mobile-date-month-button school-mobile-date-month-button-prev" data-action="change-month" data-month-delta="-1" aria-label="上一月">上一月</button>'
      + '<div class="school-mobile-date-strip school-mobile-date-strip-' + escapeHtml(mode) + '" data-date-strip data-strip-mode="' + escapeHtml(mode) + '" data-month-key="' + escapeHtml(monthKey) + '" aria-label="用料日期列表">' + items + '</div>'
      + '<button type="button" class="school-mobile-date-month-button school-mobile-date-month-button-next" data-action="change-month" data-month-delta="1" aria-label="下一月">下一月</button>'
      + '</div>';
  }

  function updateDateMonthControls(strip) {
    const shell = strip?.closest('[data-date-strip-shell]');
    if (!shell) return;
    const previous = shell.querySelector('.school-mobile-date-month-button-prev');
    const next = shell.querySelector('.school-mobile-date-month-button-next');
    const monthKey = strip.dataset.monthKey || anchorMonthKey;
    const hadNext = shell.classList.contains('has-next');
    const atStart = strip.scrollLeft <= 2;
    const reservedNext = hadNext ? 58 : 0;
    const atEnd = strip.scrollLeft + strip.clientWidth >= strip.scrollWidth - 2 - reservedNext;
    const canGoPrevious = isSupportedMonth(shiftMonthKey(monthKey, -1));
    const canGoNext = isSupportedMonth(shiftMonthKey(monthKey, 1));
    const showPrevious = atStart && canGoPrevious;
    const showNext = atEnd && canGoNext;
    shell.classList.toggle('has-prev', showPrevious);
    shell.classList.toggle('has-next', showNext);
    if (previous) previous.disabled = !showPrevious;
    if (next) next.disabled = !showNext;
    if (showNext && !hadNext) {
      window.requestAnimationFrame(() => {
        strip.scrollLeft = strip.scrollWidth - strip.clientWidth;
      });
    }
  }

  function syncDateMonthControls() {
    app.querySelectorAll('[data-date-strip]').forEach((strip) => {
      const scrollKey = (strip.dataset.stripMode || '') + '|' + (strip.dataset.monthKey || '');
      const savedScrollLeft = state.dateStripScroll[scrollKey];
      const selected = strip.querySelector('.school-mobile-date-item.is-selected');
      if (Number.isFinite(savedScrollLeft)) {
        strip.scrollLeft = savedScrollLeft;
      } else if (selected) {
        const maxScrollLeft = Math.max(0, strip.scrollWidth - strip.clientWidth);
        const targetScrollLeft = selected.offsetLeft - Math.max(0, (strip.clientWidth - selected.offsetWidth) / 2);
        strip.scrollLeft = Math.max(0, Math.min(maxScrollLeft, targetScrollLeft));
      }
      updateDateMonthControls(strip);
    });
  }

  function renderRecipe() {
    const menu = menuFor(state.date);
    if (!menu) {
      return '<div class="school-mobile-scroll school-mobile-recipe-scroll">'
        + renderDateStrip('recipe')
        + '<div class="school-mobile-empty school-mobile-recipe-empty"><strong>暂无菜谱</strong><span>' + escapeHtml(dateText(state.date)) + ' 暂未发布食谱</span></div>'
        + '</div>';
    }
    const meals = menu.meals || [];
    const activeMeal = meals.find((meal) => meal.key === state.mealKey) || meals[0];
    state.mealKey = activeMeal?.key || '';
    const mealTabs = meals.map((meal) => '<button type="button" class="school-mobile-meal-tag ' + (meal.key === state.mealKey ? 'is-active' : '') + '" data-action="select-meal" data-meal-key="' + escapeHtml(meal.key) + '" role="tab" aria-selected="' + (meal.key === state.mealKey ? 'true' : 'false') + '">' + escapeHtml(meal.name) + '</button>').join('');
    const mealContent = meals.length
      ? '<div class="school-mobile-recipe-catalog"><div class="school-mobile-meal-tabs" role="tablist" aria-label="餐次切换">' + mealTabs + '</div><div class="school-mobile-meal-panel" data-meal-panel data-meal-key="' + escapeHtml(state.mealKey) + '" role="tabpanel">' + renderMeal(activeMeal) + '</div></div>'
      : '<div class="school-mobile-empty school-mobile-recipe-empty">当前日期暂无餐次菜谱</div>';
    return '<div class="school-mobile-scroll school-mobile-recipe-scroll">'
      + renderDateStrip('recipe')
      + '<section class="school-mobile-summary-card school-mobile-recipe-summary-card">'
      + '<div><span>用料日期</span><strong>' + dateValueMarkup(menu.date) + '</strong></div>'
      + '<div class="is-primary"><span>菜品数</span><strong>' + number(dishCount(menu)) + '</strong></div>'
      + '<div><span>食材种数</span><strong>' + number(ingredientCount(menu)) + '</strong></div>'
      + '</section>'
      + mealContent
      + '</div>';
  }

  function renderMeal(meal) {
    const dishes = meal.dishes || [];
    const rows = dishes.map((dish, index) => '<button type="button" class="school-mobile-dish-row" data-action="dish" data-menu-date="' + escapeHtml(state.date) + '" data-dish-id="' + escapeHtml(dish.id) + '" aria-label="查看' + escapeHtml(dish.name) + '的食材含量和人均用量">'
      + '<span class="school-mobile-dish-index">' + String(index + 1).padStart(2, '0') + '</span>'
      + '<span><strong>' + escapeHtml(dish.name) + '</strong><small>' + number((dish.ingredients || []).length) + ' 种食材' + (dish.note ? ' · ' + escapeHtml(dish.note) : '') + '</small></span>'
      + '<span class="school-mobile-dish-arrow" aria-hidden="true">›</span>'
      + '</button>').join('');
    return '<section class="school-mobile-meal-card">'
      + '<header class="school-mobile-meal-header"><strong>' + escapeHtml(meal.name) + '</strong><span>' + number(dishes.length) + ' 道菜品</span></header>'
      + '<div class="school-mobile-dish-list">' + rows + '</div>'
      + '</section>';
  }

  function renderAttendance() {
    const menu = menuFor(state.date);
    const currentParticipants = participants();
    if (!menu) return '<div class="school-mobile-attendance-page"><div class="school-mobile-scroll school-mobile-attendance-scroll">' + renderDateStrip('attendance') + '<div class="school-mobile-empty">请选择有菜谱的日期</div></div>' + renderAttendanceActions() + '</div>';
    const calculation = attendanceService.calculate(menu, state.attendance, serviceOptions());
    const validation = attendanceService.validate(menu, state.attendance, serviceOptions());
    const notice = !currentParticipants.length
      ? '<div class="school-mobile-notice"><i>!</i><span>当前食堂尚未启用人员类型，请先完成食堂运营设置。</span></div>'
      : validation.missingMappings.length
        ? '<div class="school-mobile-notice"><i>!</i><span>存在未关联采购商品：' + escapeHtml(validation.missingMappings.join('、')) + '</span></div>'
        : '';
    const meals = (menu.meals || []).map((meal) => renderAttendanceMeal(meal)).join('');
    return '<div class="school-mobile-attendance-page">'
      + '<div class="school-mobile-scroll school-mobile-attendance-scroll">'
      + renderDateStrip('attendance')
      + '<section class="school-mobile-summary-card school-mobile-attendance-summary-card">'
      + '<div><span>用料日期</span><strong>' + dateValueMarkup(menu.date) + '</strong></div>'
      + '<div class="is-primary"><span>总就餐人次</span><strong id="schoolMobileAttendanceTotal">' + number(calculation.totalPeople) + '</strong></div>'
      + '<button type="button" class="school-mobile-summary-action" data-action="fill-defaults">填入默认</button>'
      + '</section>'
      + notice
      + '<div class="school-mobile-section-heading"><strong>餐次就餐人数</strong><button type="button" class="school-mobile-section-heading-action" data-action="reset-attendance">重置</button></div>'
      + '<div class="school-mobile-attendance-meal-grid">' + (meals || '<div class="school-mobile-empty">当前食谱暂无餐次</div>') + '</div>'
      + '<div class="school-mobile-section-heading"><strong>商品需求测算</strong><small>按当前人数计算</small></div>'
      + '<div id="schoolMobileAttendanceDemand">' + renderDemandRows(menu, state.attendance) + '</div>'
      + '</div>'
      + renderAttendanceActions(validation)
      + '</div>';
  }

  function renderAttendanceActions(validation = {}) {
    const filledDays = currentFilledDateSummaries().length;
    return '<div class="school-mobile-attendance-actions" aria-label="需求填报操作">'
      + '<div class="school-mobile-filled-days"><span>已填写</span><strong id="schoolMobileFilledDays">' + number(filledDays) + ' 天</strong></div>'
      + '<button type="button" class="school-mobile-button is-primary" data-action="continue" ' + (validation.canContinue ? '' : 'disabled') + '>确认需求</button>'
      + '</div>';
  }

  function renderAttendanceMeal(meal) {
    const currentParticipants = participants();
    const values = currentParticipants.map((participant) => attendanceService.valueForParticipant(
      state.attendance?.meals?.[meal.key] || {},
      participant
    ));
    const total = values.reduce((sum, value) => sum + Number(value || 0), 0);
    const fields = currentParticipants.length
      ? currentParticipants.map((participant, index) => '<label class="school-mobile-person-field">'
        + '<span>' + escapeHtml(attendanceService.participantDisplayName?.(participant, currentParticipants) || participant.label || participant.tagName || '人员') + '</span>'
        + '<div class="school-mobile-number-input"><input type="number" min="1" max="100000" step="1" inputmode="numeric" placeholder="请输入" value="' + escapeHtml(values[index]) + '" data-action="attendance-input" data-meal="' + escapeHtml(meal.key) + '" data-participant="' + escapeHtml(participant.key) + '" aria-label="' + escapeHtml(meal.name + (participant.label || '人员') + '人数') + '"><em>人</em></div>'
        + '</label>').join('')
      : '<div class="school-mobile-empty">暂无启用人员类型</div>';
    return '<section class="school-mobile-attendance-card">'
      + '<header class="school-mobile-attendance-header"><strong>' + escapeHtml(meal.name) + '</strong><span><b class="school-mobile-attendance-total" data-meal-total="' + escapeHtml(meal.key) + '">' + number(total) + '</b> 人</span></header>'
      + '<div class="school-mobile-participant-grid">' + fields + '</div>'
      + '</section>';
  }

  function renderDemandRows(menu, record) {
    const calculation = attendanceService.calculate(menu, record, serviceOptions());
    const rows = calculation.rows.filter((row) => Number(row.totalQty || 0) > 0);
    if (!rows.length) return '<div class="school-mobile-demand-list"><div class="school-mobile-empty">填写人数后显示商品需求</div></div>';
    return '<div class="school-mobile-demand-list">' + rows.map((row) => '<div class="school-mobile-demand-row">'
      + '<div><strong>' + escapeHtml(productName(row)) + '</strong><small>' + escapeHtml(row.productCode || '--') + ' · ' + escapeHtml(productUnit(row)) + '</small></div>'
      + '<span class="school-mobile-demand-qty">' + quantity(row.totalQty) + ' ' + escapeHtml(productUnit(row)) + '</span>'
      + '</div>').join('') + '</div>';
  }

  function currentFilledDateSummaries() {
    const submitted = demandService.submittedDateSet();
    return menus.map((menu) => {
      const record = attendanceFor(menu.date);
      const calculation = attendanceService.calculate(menu, record, serviceOptions());
      const validation = attendanceService.validate(menu, record, serviceOptions());
      return { date: menu.date, menu, record, calculation, validation, submitted: submitted.has(menu.date) };
    }).filter((summary) => Number(summary.calculation.totalPeople || 0) > 0);
  }

  function enterConfirm() {
    ensureDemoSession();
    const menu = menuFor(state.date);
    const validation = attendanceService.validate(menu, state.attendance, serviceOptions());
    if (!validation.canContinue) {
      showToast(validation.message || '请先完成当前日期填报', true);
      return;
    }
    attendanceService.save(state.date, state.attendance.meals, menu.version || recipeService.MENU_VERSION, currentCanteen());
    const summaries = currentFilledDateSummaries();
    const available = summaries.filter((summary) => !summary.submitted);
    state.confirmDates = new Set(available.map((summary) => summary.date));
    state.expectedAt = (state.confirmDates.values().next().value || state.date) + 'T07:30';
    state.screen = 'confirm';
    state.toast = null;
    render();
  }

  function renderConfirm() {
    const summaries = currentFilledDateSummaries();
    const preview = state.confirmDates.size
      ? demandService.buildPreview([...state.confirmDates], serviceOptions())
      : { rows: [], totalPersonTimes: 0, productCount: 0, canSubmit: false, message: '请选择已填报日期' };
    const dateOptions = summaries.length
      ? summaries.map((summary) => '<button type="button" class="school-mobile-confirm-date '
        + (state.confirmDates.has(summary.date) ? 'is-selected ' : '')
        + (summary.submitted ? 'is-disabled' : '') + '" data-action="confirm-date" data-date="' + escapeHtml(summary.date) + '" ' + (summary.submitted ? 'disabled' : '') + '>'
        + '<strong>' + escapeHtml(shortDate(summary.date)) + '</strong><small>' + number(summary.calculation.totalPeople) + ' 人次</small></button>').join('')
      : '<div class="school-mobile-empty">暂无可提交的填报日期</div>';
    const expectedAt = state.expectedAt || '';
    const canSubmit = Boolean(preview.canSubmit && expectedAt);
    return '<div class="school-mobile-confirm-page"><div class="school-mobile-scroll">'
      + '<section class="school-mobile-confirm-card"><h2>选择用料日期</h2><p>可一次提交多个已完成填报的日期，已下单日期不可重复提交。</p><div class="school-mobile-confirm-date-list">' + dateOptions + '</div></section>'
      + '<section class="school-mobile-confirm-card"><h2>订单信息</h2><div class="school-mobile-field"><span>食堂</span><strong>' + escapeHtml(state.canteen) + '</strong></div><label class="school-mobile-field"><span>期望送达时间</span><input type="datetime-local" value="' + escapeHtml(expectedAt) + '" data-action="expected-at" aria-label="期望送达时间"></label></section>'
      + '<section class="school-mobile-confirm-card"><h2>需求汇总</h2><div class="school-mobile-confirm-summary"><div><span>总人次</span><strong>' + number(preview.totalPersonTimes) + '</strong></div><div><span>商品种数</span><strong>' + number(preview.productCount) + '</strong></div><div><span>提交日期</span><strong>' + number(state.confirmDates.size) + '</strong></div></div></section>'
      + '<section class="school-mobile-confirm-card"><div class="school-mobile-section-heading" style="margin-top:0"><strong>采购商品</strong><small>共 ' + number((preview.rows || []).length) + ' 项</small></div>' + renderPreviewProductRows(preview) + '</section>'
      + (preview.message && !preview.canSubmit ? '<div class="school-mobile-notice"><i>!</i><span>' + escapeHtml(preview.message) + '</span></div>' : '')
      + '</div><div class="school-mobile-sticky-actions"><button type="button" class="school-mobile-button" data-action="back">返回填报</button><button type="button" class="school-mobile-button is-primary" data-action="submit-demand" ' + (canSubmit && !state.submitting ? '' : 'disabled') + '>' + (state.submitting ? '提交中…' : '提交需求并下单') + '</button></div></div>';
  }

  function renderPreviewProductRows(preview) {
    const rows = (preview.rows || []).filter((row) => row.mappingStatus === '已关联');
    if (!rows.length) return '<div class="school-mobile-empty">暂无可提交商品</div>';
    return '<div class="school-mobile-demand-list">' + rows.map((row) => '<div class="school-mobile-demand-row">'
      + '<div><strong>' + escapeHtml(productName(row)) + '</strong><small>' + escapeHtml(row.productCode || '--') + ' · ' + escapeHtml(productUnit(row)) + '</small></div>'
      + '<span class="school-mobile-demand-qty">' + quantity(purchaseQuantity(row.totalQty, row)) + ' ' + escapeHtml(productUnit(row)) + '</span>'
      + '</div>').join('') + '</div>';
  }

  function currentUserRecords() {
    const session = currentMobileSession();
    if (!session) return [];
    const userId = String(session.userId || session.id || '');
    const names = new Set([session.username, session.displayName].map((value) => String(value || '')).filter(Boolean));
    return demandService.getAll().filter((record) => (
      (userId && String(record.submittedById || '') === userId)
      || names.has(String(record.submittedBy || ''))
    ));
  }

  function currentUserOrders(records = currentUserRecords()) {
    const session = currentMobileSession();
    if (!session) return [];
    const recordIds = new Set(records.map((record) => String(record.id || '')).filter(Boolean));
    const recordNumbers = new Set(records.map((record) => String(record.recordNo || '')).filter(Boolean));
    const names = new Set([session.username, session.displayName].map((value) => String(value || '')).filter(Boolean));
    const orders = orderService.getAll().filter((order) => (
      recordIds.has(String(order.recipeDemandRecordId || ''))
      || recordNumbers.has(String(order.recipeDemandRecordNo || ''))
      || (order.source === '食谱下单' && names.has(String(order.creator || '')))
    ));
    const knownOrders = new Set(orders.flatMap((order) => [order.id, order.orderNo].map((value) => String(value || '')).filter(Boolean)));
    records.forEach((record) => (record.orders || []).forEach((reference) => {
      const referenceId = String(reference.orderId || reference.id || '');
      const referenceNo = String(reference.orderNo || '');
      if ((referenceId && knownOrders.has(referenceId)) || (referenceNo && knownOrders.has(referenceNo))) return;
      orders.push({
        id: referenceId,
        orderNo: referenceNo,
        status: reference.status || '待发货',
        recipeDemandRecordId: record.id,
        recipeDemandRecordNo: record.recordNo,
        recipeDemandDate: reference.date || record.dates?.[0] || '',
        orderTag: reference.orderTag || (reference.orderTagName
          ? reference.orderTagName + '-' + (reference.nutritious || '不区分')
          : (reference.participantType || reference.recipeParticipantType || '') + '-不区分'),
        productCount: 0,
        orderAmount: 0,
        expectedAt: reference.expectedAt || '',
        createdAt: record.submittedAt || ''
      });
      if (referenceId) knownOrders.add(referenceId);
      if (referenceNo) knownOrders.add(referenceNo);
    }));
    return orders.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  }

  function renderLogin() {
    return '<div class="school-mobile-scroll school-mobile-profile-scroll">'
      + '<section class="school-mobile-login-card">'
      + '<form data-mobile-login-form>'
      + '<label><span>用户名</span><input type="text" autocomplete="username" placeholder="请输入用户名" value="' + escapeHtml(state.loginUsername) + '" data-action="login-username"></label>'
      + '<label><span>密码</span><input type="password" autocomplete="current-password" placeholder="请输入密码" value="' + escapeHtml(state.loginPassword) + '" data-action="login-password"></label>'
      + '<button type="submit" class="school-mobile-button is-primary">登录</button>'
      + '<label class="school-mobile-login-agreement"><input type="checkbox" data-action="login-agreement" ' + (state.loginAgreement ? 'checked' : '') + '><span>我已阅读并同意《用户协议》和《隐私政策》</span></label>'
      + '</form>'
      + '</section></div>';
  }

  function renderProfile() {
    const session = currentMobileSession();
    if (!session) return renderLogin();
    const records = currentUserRecords();
    const orders = currentUserOrders(records);
    const username = session.username || session.displayName || '当前用户';
    const displayName = session.displayName || username;
    const content = state.profileSection === 'orders'
      ? renderOrderList(orders)
      : '<div class="school-mobile-record-search"><input type="search" placeholder="搜索记录编号" value="' + escapeHtml(state.recordKeyword) + '" data-action="record-keyword" aria-label="搜索记录编号"></div><div id="schoolMobileRecordList">' + renderRecordList(records) + '</div>';
    return '<div class="school-mobile-scroll school-mobile-profile-scroll">'
      + '<section class="school-mobile-profile-card">'
      + '<div class="school-mobile-mine-avatar">' + escapeHtml(String(username).slice(0, 1).toUpperCase()) + '</div>'
      + '<div class="school-mobile-profile-identity"><strong>' + escapeHtml(username) + '</strong><span>' + escapeHtml(displayName) + '</span></div>'
      + '<button type="button" class="school-mobile-profile-logout" data-action="logout">退出登录</button>'
      + '</section>'
      + '<div class="school-mobile-profile-tabs" role="tablist" aria-label="个人记录分类">'
      + '<button type="button" class="' + (state.profileSection === 'submissions' ? 'is-active' : '') + '" data-action="profile-section" data-profile-section="submissions" role="tab">提交记录 <small>' + number(records.length) + '</small></button>'
      + '<button type="button" class="' + (state.profileSection === 'orders' ? 'is-active' : '') + '" data-action="profile-section" data-profile-section="orders" role="tab">订单记录 <small>' + number(orders.length) + '</small></button>'
      + '</div>'
      + content
      + '</div>';
  }

  function renderRecordList(sourceRecords = currentUserRecords()) {
    const keyword = String(state.recordKeyword || '').trim();
    const rows = sourceRecords.filter((record) => !keyword || String(record.recordNo || '').includes(keyword));
    if (!rows.length) return '<div class="school-mobile-empty">暂无匹配的提交记录</div>';
    return rows.map((record) => '<article class="school-mobile-record-card">'
      + '<header><strong>' + escapeHtml(record.recordNo || '--') + '</strong></header>'
      + '<div class="school-mobile-record-date">用料日期：' + escapeHtml((record.dates || []).join('、') || '--') + '</div>'
      + '<div class="school-mobile-record-metrics"><div><span>总人次</span><strong>' + number(record.totalPersonTimes) + '</strong></div><div><span>商品种数</span><strong>' + number(record.productCount) + '</strong></div><div><span>订单数</span><strong>' + number((record.orders || []).length) + '</strong></div></div>'
      + '<footer><small>' + escapeHtml(record.submittedAt || '--') + '</small><button type="button" class="school-mobile-button" data-action="record" data-record-id="' + escapeHtml(record.id) + '">查看详情</button></footer>'
      + '</article>').join('');
  }

  function renderOrderList(orders = currentUserOrders()) {
    if (!orders.length) return '<div class="school-mobile-empty">暂无创建的订单记录</div>';
    return '<div class="school-mobile-profile-order-list">' + orders.map((order) => '<article class="school-mobile-profile-order-card">'
      + '<header><strong>' + escapeHtml(order.orderNo || order.id || '--') + '</strong><span>' + escapeHtml(order.status || '--') + '</span></header>'
      + '<div class="school-mobile-profile-order-meta"><div><span>期望送达时间：' + escapeHtml(order.expectedAt || '--') + '</span><small>创建时间：' + escapeHtml(order.createdAt || '--') + '</small></div><span>' + escapeHtml(order.orderTag || (order.orderTagName ? order.orderTagName + '-' + (order.nutritious || '不区分') : '--')) + '</span></div>'
      + '<div class="school-mobile-profile-order-summary"><div><span>商品种数</span><strong>' + number(order.productCount || (order.items || []).length) + '</strong></div><div><span>订单金额</span><strong>¥' + quantity(order.orderAmount) + '</strong></div></div>'
      + '</article>').join('') + '</div>';
  }

  function renderRecordDetail() {
    const record = state.record;
    if (!record) return '<div class="school-mobile-scroll"><div class="school-mobile-empty">未找到该提交记录</div></div>';
    const summaries = (record.dateSummaries || []).map((summary) => '<div class="school-mobile-detail-date"><strong>' + escapeHtml(summary.date) + '</strong><span>' + number(summary.totalPersonTimes) + ' 人次 · ' + number(summary.productCount) + ' 种商品</span></div>').join('');
    const orders = (record.orders || []).map((order) => '<div class="school-mobile-order-row"><strong>' + escapeHtml(order.orderNo || order.id || '--') + '</strong><span>' + escapeHtml(order.recipeParticipantType || order.orderTag || '食谱需求') + '</span></div>').join('');
    return '<div class="school-mobile-scroll">'
      + '<section class="school-mobile-info-card"><h2>基本信息</h2><div class="school-mobile-info-grid">'
      + '<div><span>记录编号</span><strong>' + escapeHtml(record.recordNo || '--') + '</strong></div>'
      + '<div><span>食堂</span><strong>' + escapeHtml(record.canteen || state.canteen) + '</strong></div>'
      + '<div><span>操作人</span><strong>' + escapeHtml(record.submittedBy || '--') + '</strong></div>'
      + '<div><span>提交时间</span><strong>' + escapeHtml(record.submittedAt || '--') + '</strong></div>'
      + '</div></section>'
      + '<section class="school-mobile-info-card"><h2>用料日期</h2>' + (summaries || '<div class="school-mobile-empty">暂无日期明细</div>') + '</section>'
      + '<section class="school-mobile-info-card"><h2>生成订单</h2>' + (orders || '<div class="school-mobile-empty">暂无关联订单</div>') + '</section>'
      + '</div>';
  }

  function renderBottomNav() {
    const tabs = [
      ['recipe', '食谱', '⌂'],
      ['attendance', '需求填报', '＋'],
      ['profile', '个人中心', '●']
    ];
    return '<nav class="school-mobile-bottom-nav" aria-label="食谱中心导航">' + tabs.map((tab) => '<button type="button" class="school-mobile-tab ' + (state.tab === tab[0] ? 'is-active' : '') + '" data-action="tab" data-tab="' + tab[0] + '"><strong>' + tab[2] + '</strong><span>' + tab[1] + '</span></button>').join('') + '</nav>';
  }

  function renderCanteenSheet() {
    return '<div class="school-mobile-sheet-backdrop" data-sheet-backdrop><section class="school-mobile-sheet" role="dialog" aria-modal="true" aria-label="切换食堂">'
      + '<div class="school-mobile-sheet-handle"></div><header class="school-mobile-sheet-header"><h2>选择食堂</h2><button type="button" data-action="close-sheet" aria-label="关闭">×</button></header>'
      + '<p class="school-mobile-sheet-subtitle">切换后将同步当前食谱和需求填报范围。</p>'
      + canteenNames.map((name) => '<button type="button" class="school-mobile-canteen-option ' + (name === state.canteen ? 'is-selected' : '') + '" data-action="select-canteen" data-canteen="' + escapeHtml(name) + '"><span>' + escapeHtml(name) + '</span>' + (name === state.canteen ? '<span>✓</span>' : '<span>›</span>') + '</button>').join('')
      + '</section></div>';
  }

  function renderDishSheet() {
    const detail = state.sheet?.detail;
    if (!detail) return '';
    const ingredients = detail.dish.ingredients || [];
    const rows = ingredients.map((item) => '<div class="school-mobile-ingredient-row" role="row"><strong role="cell">' + escapeHtml(item.name || '--') + '</strong><span role="cell">' + escapeHtml(productName(item)) + '</span><em role="cell">' + quantity(ingredientQuantity(item)) + ' ' + escapeHtml(productUnit(item)) + '</em></div>').join('');
    return '<div class="school-mobile-sheet-backdrop" data-sheet-backdrop><section class="school-mobile-sheet" role="dialog" aria-modal="true" aria-label="菜品食材详情">'
      + '<div class="school-mobile-sheet-handle"></div><header class="school-mobile-sheet-header"><h2>' + escapeHtml(detail.dish.name) + '</h2><button type="button" data-action="close-sheet" aria-label="关闭">×</button></header>'
      + '<p class="school-mobile-sheet-subtitle">' + escapeHtml(dateText(detail.menu.date)) + ' · ' + escapeHtml(detail.meal.name) + '</p>'
      + '<div class="school-mobile-dish-detail-heading"><strong>食材含量与人均用量</strong><span>共 ' + number(ingredients.length) + ' 项</span></div>'
      + '<div class="school-mobile-ingredient-list" role="table" aria-label="食材含量与人均用量明细">'
      + '<div class="school-mobile-ingredient-head" role="row"><span role="columnheader">食材</span><span role="columnheader">关联商品</span><span role="columnheader">人均用量</span></div>'
      + (rows || '<div class="school-mobile-empty">暂无食材明细</div>')
      + '</div>'
      + '</section></div>';
  }

  function render() {
    const content = state.screen === 'confirm'
      ? renderConfirm()
      : state.screen === 'detail'
        ? renderRecordDetail()
        : state.tab === 'attendance'
          ? renderAttendance()
          : state.tab === 'profile'
            ? renderProfile()
            : renderRecipe();
    const sheet = state.sheet?.type === 'canteen'
      ? renderCanteenSheet()
      : state.sheet?.type === 'dish'
        ? renderDishSheet()
        : '';
    app.innerHTML = '<div class="school-mobile-app">'
      + renderHeader()
      + '<main class="school-mobile-main">' + content + '</main>'
      + (state.screen === 'main' && !(state.tab === 'profile' && !currentMobileSession()) ? renderBottomNav() : '')
      + sheet
      + '</div>';
    syncDateMonthControls();
  }

  function updateAttendanceLive() {
    const menu = menuFor(state.date);
    if (!menu) return;
    const calculation = attendanceService.calculate(menu, state.attendance, serviceOptions());
    const validation = attendanceService.validate(menu, state.attendance, serviceOptions());
    const total = app.querySelector('#schoolMobileAttendanceTotal');
    if (total) total.textContent = number(calculation.totalPeople);
    app.querySelectorAll('[data-meal-total]').forEach((element) => {
      const values = state.attendance?.meals?.[element.dataset.mealTotal] || {};
      const mealTotal = participants().reduce((sum, participant) => sum + Number(attendanceService.valueForParticipant(values, participant) || 0), 0);
      element.textContent = number(mealTotal);
    });
    const demand = app.querySelector('#schoolMobileAttendanceDemand');
    if (demand) demand.innerHTML = renderDemandRows(menu, state.attendance);
    const continueButton = app.querySelector('[data-action="continue"]');
    if (continueButton) continueButton.disabled = !validation.canContinue;
    const filledDays = app.querySelector('#schoolMobileFilledDays');
    if (filledDays) filledDays.textContent = number(currentFilledDateSummaries().length) + ' 天';
  }

  function fillDefaultAttendance() {
    const menu = menuFor(state.date);
    const currentParticipants = participants();
    const next = attendanceService.emptyRecord(state.date, currentCanteen());
    next.meals = {};
    (menu?.meals || []).forEach((meal) => {
      next.meals[meal.key] = {};
      currentParticipants.forEach((participant) => {
        const value = participant.defaultPeople?.[meal.key];
        if (value !== '' && value != null) next.meals[meal.key][participant.key] = value;
      });
    });
    state.attendance = next;
    saveAttendanceDraft();
  }

  function fillDefaultsIfEmpty() {
    const menu = menuFor(state.date);
    if (!menu || !state.attendance) return;
    const calculation = attendanceService.calculate(menu, state.attendance, serviceOptions());
    if (Number(calculation.totalPeople || 0) <= 0) fillDefaultAttendance();
  }

  function resetAttendance() {
    attendanceService.remove(state.date, currentCanteen());
    state.attendance = attendanceService.emptyRecord(state.date, currentCanteen());
    state.attendance.meals = {};
  }

  function normalizeExpectedAt(value) {
    const text = String(value || '').trim();
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(text)) return text.replace('T', ' ') + ':00';
    return text.replace('T', ' ');
  }

  function demoUserSession() {
    const users = window.DemoStore?.get?.('users') || [];
    const user = users.find((item) => String(item.username || '').toLocaleLowerCase() === 'admin' && item.status !== 'DISABLE')
      || users.find((item) => item.status !== 'DISABLE')
      || { id: 'demo-admin', username: 'admin', displayName: '管理员', role: '管理员' };
    return {
      userId: user.id || '',
      id: user.id || '',
      companyId: user.companyId || '',
      username: user.username || 'admin',
      displayName: user.displayName || user.username || '管理员',
      role: user.role || ''
    };
  }

  function ensureDemoSession() {
    if (!mobileSession) persistMobileSession(demoUserSession());
    return currentMobileSession();
  }

  function loginMobile() {
    ensureDemoSession();
    state.loginPassword = '';
    state.screen = 'main';
    state.tab = 'recipe';
    state.profileSection = 'submissions';
    render();
  }

  function logoutMobile() {
    persistMobileSession(null);
    state.loginUsername = '';
    state.loginPassword = '';
    state.loginAgreement = false;
    state.recordKeyword = '';
    state.record = null;
    state.screen = 'main';
    state.tab = 'profile';
    render();
    showToast('已退出登录');
  }

  async function submitDemand() {
    if (state.submitting) return;
    ensureDemoSession();
    const dates = [...state.confirmDates];
    if (!dates.length) {
      showToast('请至少选择一个用料日期', true);
      return;
    }
    const preview = demandService.buildPreview(dates, serviceOptions());
    if (!preview.canSubmit) {
      showToast(preview.message || '当前需求不能提交', true);
      return;
    }
    const expectedAt = normalizeExpectedAt(state.expectedAt);
    if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(expectedAt)) {
      showToast('请选择期望送达时间', true);
      return;
    }
    state.submitting = true;
    render();
    try {
      const result = await demandService.submit(dates, {
        expectedAt,
        canteen: currentCanteen()
      });
      state.submitting = false;
      state.screen = 'main';
      state.tab = 'profile';
      state.profileSection = 'submissions';
      state.record = result.record || null;
      state.toast = null;
      render();
      showToast('需求已提交并生成订单');
    } catch (error) {
      state.submitting = false;
      render();
      showToast(error?.message || '提交失败，请稍后重试', true);
    }
  }

  app.addEventListener('click', (event) => {
    if (event.target.classList.contains('school-mobile-sheet-backdrop')) {
      state.sheet = null;
      render();
      return;
    }
    const target = event.target.closest('[data-action]');
    if (!target || !app.contains(target)) return;
    const action = target.dataset.action;

    if (action === 'tab') {
      state.screen = 'main';
      state.tab = target.dataset.tab || 'recipe';
      state.sheet = null;
      if (state.tab === 'attendance') loadAttendance();
      render();
      return;
    }
    if (action === 'back') {
      state.screen = 'main';
      state.tab = state.tab === 'profile' ? 'profile' : 'attendance';
      state.record = null;
      state.sheet = null;
      render();
      return;
    }
    if (action === 'select-meal') {
      const meals = menuFor(state.date)?.meals || [];
      if (meals.some((meal) => meal.key === target.dataset.mealKey)) {
        state.mealKey = target.dataset.mealKey;
        render();
      }
      return;
    }
    if (action === 'change-month') {
      changeMonth(target.dataset.monthDelta);
      return;
    }
    if (action === 'select-date') {
      const strip = target.closest('[data-date-strip]');
      if (strip) {
        const scrollKey = (strip.dataset.stripMode || '') + '|' + (strip.dataset.monthKey || '');
        state.dateStripScroll[scrollKey] = strip.scrollLeft;
      }
      setDate(target.dataset.date);
      state.screen = 'main';
      state.sheet = null;
      render();
      return;
    }
    if (action === 'open-canteen') {
      state.sheet = { type: 'canteen' };
      render();
      return;
    }
    if (action === 'select-canteen') {
      const nextCanteen = target.dataset.canteen || '';
      if (canteenNames.includes(nextCanteen)) {
        state.canteen = nextCanteen;
        window.AppStorage?.write?.(canteenStorageKey, nextCanteen);
        loadAttendance();
      }
      state.sheet = null;
      render();
      return;
    }
    if (action === 'close-sheet') {
      state.sheet = null;
      render();
      return;
    }
    if (action === 'dish') {
      const detail = recipeService.getDish(target.dataset.menuDate || state.date, target.dataset.dishId);
      if (detail) {
        state.sheet = { type: 'dish', detail };
        render();
      }
      return;
    }
    if (action === 'fill-defaults') {
      fillDefaultAttendance();
      render();
      return;
    }
    if (action === 'reset-attendance') {
      resetAttendance();
      render();
      return;
    }
    if (action === 'continue') {
      enterConfirm();
      return;
    }
    if (action === 'confirm-date') {
      if (target.disabled) return;
      const date = target.dataset.date;
      if (state.confirmDates.has(date)) state.confirmDates.delete(date);
      else state.confirmDates.add(date);
      render();
      return;
    }
    if (action === 'submit-demand') {
      submitDemand();
      return;
    }
    if (action === 'profile-section') {
      state.profileSection = target.dataset.profileSection === 'orders' ? 'orders' : 'submissions';
      render();
      return;
    }
    if (action === 'logout') {
      logoutMobile();
      return;
    }
    if (action === 'record') {
      state.record = demandService.get(target.dataset.recordId || '');
      state.screen = 'detail';
      state.sheet = null;
      render();
    }
  });

  app.addEventListener('input', (event) => {
    const target = event.target.closest('[data-action]');
    if (!target || !app.contains(target)) return;
    const action = target.dataset.action;
    if (action === 'attendance-input') {
      const mealKey = target.dataset.meal;
      const participantKey = target.dataset.participant;
      if (!state.attendance.meals) state.attendance.meals = {};
      if (!state.attendance.meals[mealKey]) state.attendance.meals[mealKey] = {};
      state.attendance.meals[mealKey][participantKey] = target.value === '' ? '' : target.value;
      saveAttendanceDraft();
      updateAttendanceLive();
      return;
    }
    if (action === 'record-keyword') {
      state.recordKeyword = target.value;
      const list = app.querySelector('#schoolMobileRecordList');
      if (list) list.innerHTML = renderRecordList();
      return;
    }
    if (action === 'login-username') {
      state.loginUsername = target.value;
      return;
    }
    if (action === 'login-password') {
      state.loginPassword = target.value;
      return;
    }
    if (action === 'login-agreement') {
      state.loginAgreement = target.checked;
      return;
    }
    if (action === 'expected-at') {
      state.expectedAt = target.value;
    }
  });

  app.addEventListener('submit', (event) => {
    if (!event.target.matches('[data-mobile-login-form]')) return;
    event.preventDefault();
    loginMobile();
  });

  app.addEventListener('scroll', (event) => {
    const strip = event.target.closest?.('[data-date-strip]');
    if (!strip || !app.contains(strip)) return;
    const scrollKey = (strip.dataset.stripMode || '') + '|' + (strip.dataset.monthKey || '');
    state.dateStripScroll[scrollKey] = strip.scrollLeft;
    updateDateMonthControls(strip);
  }, true);

  app.addEventListener('pointerdown', (event) => {
    const panel = event.target.closest?.('[data-meal-panel]');
    if (!panel || !app.contains(panel) || (event.pointerType === 'mouse' && event.button !== 0)) return;
    mealSwipeStart = { x: event.clientX, y: event.clientY };
    panel.setPointerCapture?.(event.pointerId);
  }, { passive: true });

  app.addEventListener('pointerup', (event) => {
    if (!mealSwipeStart) return;
    const deltaX = event.clientX - mealSwipeStart.x;
    const deltaY = event.clientY - mealSwipeStart.y;
    mealSwipeStart = null;
    if (Math.abs(deltaX) < 44 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
    const meals = menuFor(state.date)?.meals || [];
    const index = meals.findIndex((meal) => meal.key === state.mealKey);
    const nextMeal = meals[index + (deltaX < 0 ? 1 : -1)];
    if (nextMeal) {
      state.mealKey = nextMeal.key;
      render();
    }
  }, { passive: true });

  app.addEventListener('pointercancel', () => {
    mealSwipeStart = null;
  }, { passive: true });

  ensureMobileAttendanceStartsEmpty();
  loadAttendance();
  render();
})();
