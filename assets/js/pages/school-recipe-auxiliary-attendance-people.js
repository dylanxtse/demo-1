(function () {
  const entryParams = new URLSearchParams(window.location.search);
  const savedEntryMode = window.AppStorage?.read?.('school-recipe-auxiliary-default-mode-v1', 'people');
  const entryMode = ['people', 'quantity'].includes(entryParams.get('mode'))
    ? entryParams.get('mode') : savedEntryMode;
  if (entryMode === 'quantity') return;
  const attendanceService = window.SchoolRecipeAttendanceService;
  const canteenConfig = window.SchoolCanteenConfigService;
  const directService = window.SchoolRecipeAuxiliaryDirectService;
  const currentCanteenKey = window.AppStorage?.read?.('school-recipe-auxiliary-current-canteen', '第一食堂');
  let currentCanteen = canteenConfig?.getCanteen?.(currentCanteenKey) || { name: currentCanteenKey };
  let configuredParticipants = attendanceService?.participantsFor?.(currentCanteen) || [];

  const participantKey = (label) => label === '学生'
    ? 'student'
    : label === '教师' || label === '教职工'
      ? 'teacher'
      : `participant_${String(label || '人员').replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '')}`;
  const configuredGroups = configuredParticipants.map((participant, index) => {
    const label = participant.label || participant.tagName || `人员${index + 1}`;
    const legacyKey = participant.legacyKey || (label === '学生' ? 'student' : label === '教师' || label === '教职工' ? 'teacher' : '');
    const key = String(participant.key || participant.tagId || participant.id || participant.orderTag || legacyKey || `participant_${index + 1}`);
    return {
      ...participant,
      key,
      tagId: participant.tagId || participant.id || key,
      label,
      tagName: participant.tagName || label,
      nutritious: participant.nutritious || '不区分',
      legacyKey
    };
  });
  const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value || {}, key);
  const participantFields = (participant) => [...new Set([
    participant.key,
    participant.tagId,
    participant.orderTag,
    participant.legacyKey,
    participantKey(participant.label)
  ].filter(Boolean).map(String))];
  const valueForParticipant = (meal, participant, prefix = '') => {
    const source = meal || {};
    const field = participantFields(participant)
      .map((key) => `${prefix}${key}`)
      .find((key) => hasOwn(source, key));
    return field ? source[field] : undefined;
  };
  const setParticipantValue = (meal, participant, value, prefix = '') => {
    meal[`${prefix}${participant.key}`] = value;
  };
  const participantDisplayName = (participant) => `${participant.label} - ${participant.nutritious || '不区分'}`;
  const participantHeader = (participant) => `<span class="school-recipe-attendance-participant-name">${escapeHtml(`${participant.label} - ${participant.nutritious || '不区分'}`)}</span>`;
  const mealNameFallbacks = {
    breakfast: '早餐',
    morningSnack: '早点',
    lunch: '午餐',
    afternoonSnack: '午点',
    dinner: '晚餐',
    eveningSnack: '晚点',
    snack: '午点'
  };
  const mealDefinitionsForDate = (date) => (menuForDate(date)?.meals || []).map((meal) => ({
    key: String(meal.key || ''),
    name: meal.name || mealNameFallbacks[meal.key] || meal.key
  })).filter((meal) => meal.key);
  const defaultValueForParticipant = (mealKey, participant) => {
    const value = participant.defaultPeople?.[mealKey];
    return value === '' || value == null ? '' : Number(value);
  };
  const createMeal = (mealKey, name) => {
    const meal = { name };
    configuredGroups.forEach((participant) => {
      setParticipantValue(meal, participant, defaultValueForParticipant(mealKey, participant));
      setParticipantValue(meal, participant, '', 'nonDining_');
    });
    return meal;
  };
  const createMealsForDate = (date) => Object.fromEntries(
    mealDefinitionsForDate(date).map((meal) => [meal.key, createMeal(meal.key, meal.name)])
  );
  let meals = {};

  const products = directService.attendanceProducts();

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const amount = (value) => Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false });
  const normalizeRecipeDate = (value) => {
    const match = String(value || '').trim().match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    return match ? `${match[1]}-${String(match[2]).padStart(2, '0')}-${String(match[3]).padStart(2, '0')}` : '';
  };

  const recipeMenus = window.SchoolRecipeService?.getAll?.() || [];
  const recipeDates = new Set(recipeMenus.map((menu) => normalizeRecipeDate(menu.date)).filter(Boolean));
  const menuForDate = (date) => recipeMenus.find((menu) => normalizeRecipeDate(menu.date) === String(date)) || null;
  const compatibleDraftForDate = (date, draft) => {
    const source = draft || {};
    const dateMeals = mealDefinitionsForDate(date);
    if (!dateMeals.some((meal) => meal.key === 'afternoonSnack') || source.afternoonSnack || !source.snack) return source;
    return { ...source, afternoonSnack: source.snack };
  };
  const recipeDateList = [...recipeDates].sort();
  const firstDate = recipeDateList[0] || '2026-09-29';
  const draftStorageKey = 'school-recipe-auxiliary-attendance-drafts-v1';
  const selectedProductsStorageKey = 'school-recipe-auxiliary-selected-products-v1';
  const selectedProductsByMealStorageKey = 'school-recipe-auxiliary-selected-products-by-meal-v1';
  const defaultProductsStorageKey = 'school-recipe-auxiliary-default-products-v1';
  const viewStorageKey = 'school-recipe-auxiliary-attendance-view-v1';
  const defaultModeKey = 'school-recipe-auxiliary-default-mode-v1';
  const orderModeKey = 'school-recipe-auxiliary-quantity-order-mode-v1';
  const savedDefaultMode = window.AppStorage?.read?.(defaultModeKey, 'people');
  const defaultMode = savedDefaultMode === 'quantity' ? 'quantity' : 'people';
  const pageParams = new URLSearchParams(window.location.search);
  const requestedMode = pageParams.get('mode');
  const initialMode = ['people', 'quantity'].includes(requestedMode) ? requestedMode : defaultMode;
  const requestedOrderMode = pageParams.get('orderMode');
  const savedOrderMode = window.AppStorage?.read?.(orderModeKey, 'daily');
  const initialOrderMode = ['daily', 'combined'].includes(requestedOrderMode) ? requestedOrderMode
    : ['daily', 'combined'].includes(savedOrderMode) ? savedOrderMode : 'daily';
  const canteenScope = String(currentCanteen.id || currentCanteen.name || '第一食堂');
  const availableCanteens = (canteenConfig?.readCanteens?.() || []).filter((canteen) => canteen && canteen.name && canteen.name !== '默认');
  const readDrafts = () => window.AppStorage?.read?.(draftStorageKey, {}) || {};
  const normalizeMonthStart = (value) => {
    const match = String(value || '').trim().match(/^(\d{4})[-/](\d{1,2})/);
    return match ? `${match[1]}-${String(match[2]).padStart(2, '0')}-01` : '';
  };
  const storedView = window.AppStorage?.read?.(viewStorageKey, {})?.[canteenScope] || {};
  const requestedDate = normalizeRecipeDate(pageParams.get('date'));
  const savedDate = requestedDate || normalizeRecipeDate(storedView.selectedDate);
  const selectedDate = savedDate || firstDate;
  const savedMonthStart = normalizeMonthStart(storedView.monthStart);
  const dateState = {
    selectedDate,
    monthStart: requestedDate ? `${requestedDate.slice(0, 7)}-01` : (savedMonthStart || `${selectedDate.slice(0, 7)}-01`)
  };
  meals = createMealsForDate(dateState.selectedDate);
  const persistView = () => {
    const views = window.AppStorage?.read?.(viewStorageKey, {}) || {};
    views[canteenScope] = { selectedDate: dateState.selectedDate, monthStart: dateState.monthStart };
    window.AppStorage?.write?.(viewStorageKey, views);
  };
  persistView();

  const persistDraft = () => {
    if (!recipeDates.has(dateState.selectedDate)) return;
    const drafts = readDrafts();
    if (!drafts[canteenScope]) drafts[canteenScope] = {};
    drafts[canteenScope][dateState.selectedDate] = {
      __manual: true,
      ...Object.fromEntries(Object.entries(meals).map(([key, meal]) => [key, Object.fromEntries(configuredGroups.flatMap((participant) => [
        [participant.key, valueForParticipant(meal, participant) ?? ''],
        [`nonDining_${participant.key}`, valueForParticipant(meal, participant, 'nonDining_') ?? '']
      ]))]))
    };
    window.AppStorage?.write?.(draftStorageKey, drafts);
  };

  const fillMissingDefaults = () => {
    let changed = false;
    Object.entries(meals).forEach(([key, meal]) => {
      configuredGroups.forEach((participant) => {
        const current = valueForParticipant(meal, participant);
        const defaultValue = defaultValueForParticipant(key, participant);
        if ((current === '' || current == null) && defaultValue !== '') {
          setParticipantValue(meal, participant, defaultValue);
          changed = true;
        }
      });
    });
    return changed;
  };

  const loadDraft = (date) => {
    Object.entries(meals).forEach(([key, meal]) => {
      configuredGroups.forEach((participant) => {
        setParticipantValue(meal, participant, defaultValueForParticipant(key, participant));
        setParticipantValue(meal, participant, '', 'nonDining_');
      });
    });
    const draft = compatibleDraftForDate(date, readDrafts()?.[canteenScope]?.[date]);
    if (!draft) return false;
    const draftHasPeople = Object.entries(meals).some(([key]) => configuredGroups.some((participant) => {
      const value = valueForParticipant(draft?.[key], participant);
      return value !== undefined && value !== '' && value != null;
    }));
    if (!draft.__manual && !draftHasPeople) return false;
    Object.entries(meals).forEach(([key, meal]) => {
      if (!draft[key]) return;
      configuredGroups.forEach((participant) => {
        const diningValue = valueForParticipant(draft[key], participant);
        const nonDiningValue = valueForParticipant(draft[key], participant, 'nonDining_');
        if (diningValue !== undefined) setParticipantValue(meal, participant, diningValue);
        if (nonDiningValue !== undefined) setParticipantValue(meal, participant, nonDiningValue, 'nonDining_');
      });
    });
    fillMissingDefaults();
    return true;
  };
  loadDraft(dateState.selectedDate);
  if (initialMode === 'people' && recipeDates.has(dateState.selectedDate)) persistDraft();

  const storedDefaultStorage = window.AppStorage?.read?.(defaultProductsStorageKey, {}) || {};
  const storedDefaultIds = Array.isArray(storedDefaultStorage[canteenScope]) ? storedDefaultStorage[canteenScope] : [];
  const defaultProductIds = new Set(products.filter((product) => storedDefaultIds.includes(product.id)).map((product) => product.id));
  const mealKeys = Object.keys(meals);
  const initialSelectedByMeal = Object.fromEntries(mealKeys.map((mealKey) => {
    return [mealKey, products.filter((product) => defaultProductIds.has(product.id)).map((product) => product.id)];
  }));
  const state = {
    meal: mealKeys.includes('lunch') ? 'lunch' : mealKeys[0] || '', directMeal: '',
    mode: initialMode, orderMode: initialOrderMode, attendanceMode: 'dining',
    highlightEmpty: false, selectedByMeal: initialSelectedByMeal, defaultProductIds,
    get selected() {
      const ids = this.selectedByMeal[this.meal] || [...this.defaultProductIds];
      return products.filter((product) => ids.includes(product.id));
    },
    set selected(selectedProducts) {
      this.selectedByMeal[this.meal] = products.filter((product) => selectedProducts.some((item) => item.id === product.id)).map((product) => product.id);
    },
    productModalOpen: false, modalPage: 1, modalPageSize: 10, modalSelected: new Set(), modalFilters: { keyword: '', category: '' }
  };
  const selectedProductsForMeal = (mealKey) => {
    const ids = state.selectedByMeal[mealKey] || [...state.defaultProductIds];
    return products.filter((product) => ids.includes(product.id));
  };
  const persistSelectedProducts = () => {
    const selection = Object.fromEntries(Object.keys(state.selectedByMeal).map((mealKey) => [
      mealKey, selectedProductsForMeal(mealKey).map((product) => product.id)
    ]));
    Object.keys(meals).forEach((mealKey) => {
      if (!Object.prototype.hasOwnProperty.call(selection, mealKey)) {
        selection[mealKey] = selectedProductsForMeal(mealKey).map((product) => product.id);
      }
    });
    state.selectedByMeal = selection;
    const byMeal = window.AppStorage?.read?.(selectedProductsByMealStorageKey, {}) || {};
    byMeal[canteenScope] = selection;
    window.AppStorage?.write?.(selectedProductsByMealStorageKey, byMeal);
    const allSelectedIds = new Set(Object.values(selection).flat());
    const next = window.AppStorage?.read?.(selectedProductsStorageKey, {}) || {};
    next[canteenScope] = products.filter((product) => allSelectedIds.has(product.id)).map((product) => product.id);
    window.AppStorage?.write?.(selectedProductsStorageKey, next);
  };
  const persistDefaultProducts = () => {
    const next = window.AppStorage?.read?.(defaultProductsStorageKey, {}) || {};
    next[canteenScope] = products.filter((product) => state.defaultProductIds.has(product.id)).map((product) => product.id);
    window.AppStorage?.write?.(defaultProductsStorageKey, next);
  };
  persistSelectedProducts();

  const showToast = (message, isError = false) => {
    document.querySelector('.operations-toast')?.remove();
    const toast = document.createElement('div');
    toast.className = `operations-toast${isError ? ' error' : ''}`;
    toast.textContent = message;
    toast.setAttribute('role', 'status');
    document.body.appendChild(toast);
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.remove(), 2400);
  };
  const firstEmptyAttendanceField = () => {
    for (const meal of mealDefinitionsForDate(dateState.selectedDate)) {
      for (const participant of configuredGroups) {
        const value = valueForParticipant(meals[meal.key], participant);
        if (value === '' || value == null) return { meal, participant };
      }
    }
    return null;
  };

  const shouldSplitOrderByMeal = () => {
    const value = window.DemoStore?.getSettings?.()?.splitOrderByMeal;
    return value !== false && value !== 'false' && value !== 0 && value !== '0';
  };
  const shouldSplitOrderByPersonType = () => {
    const value = window.DemoStore?.getSettings?.()?.splitOrderByPersonType;
    return value === true || value === 'true' || value === 1 || value === '1';
  };
  const hasDirectRowDraft = (draft, row) => Object.keys(draft || {}).some((key) =>
    (key === row.key || key.startsWith(`${row.key}::`)) && String(draft[key] ?? '').trim() !== '');
  const directPreview = (date = dateState.selectedDate) => directService?.buildPreview(date, currentCanteen, directService.readDraft(date, currentCanteen));
  const people = () => meals[state.meal];
  const weekdayNames = ['日', '一', '二', '三', '四', '五', '六'];
  const parseDate = (value) => new Date(`${String(value)}T00:00:00`);
  const dateValue = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const monthDates = (start) => { const date = parseDate(start); const total = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate(); return Array.from({ length: total }, (_, index) => dateValue(new Date(date.getFullYear(), date.getMonth(), index + 1))); };
  const monthLabel = (start) => `${start.slice(0, 4)}年${start.slice(5, 7)}月`;
  const shiftMonth = (start, offset) => { const date = parseDate(start); date.setMonth(date.getMonth() + offset); return dateValue(new Date(date.getFullYear(), date.getMonth(), 1)); };
  const weekday = (date) => weekdayNames[parseDate(date).getDay()];
  const longDate = (date) => `${date.slice(0, 4)}年${date.slice(5, 7)}月${date.slice(8, 10)}日 星期${weekday(date)}`;
  const totalDiningPeople = () => Object.values(meals).reduce((total, meal) => total + configuredGroups.reduce((mealTotal, participant) => mealTotal + Number(valueForParticipant(meal, participant) || 0), 0), 0);
  const auxiliaryParticipants = () => configuredGroups.map((participant) => ({ ...participant }));
  const auxiliaryRecordFor = (date) => {
    const draft = date === dateState.selectedDate ? meals : compatibleDraftForDate(date, readDrafts()?.[canteenScope]?.[date]);
    const record = { date, meals: {}, temporaryNonDining: {} };
    mealDefinitionsForDate(date).forEach(({ key: mealKey }) => {
      const source = draft[mealKey] || {};
      record.meals[mealKey] = {};
      record.temporaryNonDining[mealKey] = {};
      configuredGroups.forEach((participant) => {
        record.meals[mealKey][participant.key] = valueForParticipant(source, participant) ?? '';
        record.temporaryNonDining[mealKey][participant.key] = valueForParticipant(source, participant, 'nonDining_') ?? '';
      });
    });
    return record;
  };
  const auxiliaryServiceOptions = () => ({ canteen: currentCanteen, participants: auxiliaryParticipants() });
  const demandMeals = () => {
    const entries = Object.entries(meals);
    if (!shouldSplitOrderByMeal()) return entries;
    const menu = menuForDate(dateState.selectedDate);
    const calculation = menu && attendanceService?.calculate?.(menu, auxiliaryRecordFor(dateState.selectedDate), auxiliaryServiceOptions());
    const actualMealKeys = new Set((calculation?.mealRows || [])
      .filter((meal) => Number(meal.totalPeople || 0) > 0)
      .map((meal) => String(meal.key)));
    const visibleMeals = entries.filter(([key]) => actualMealKeys.has(String(key)));
    if (!visibleMeals.some(([key]) => key === state.meal)) state.meal = visibleMeals[0]?.[0] || '';
    return visibleMeals;
  };

  function dateStatus(date) {
    if (state.mode === 'quantity') {
      if (state.orderMode === 'combined') return directService.readCombinedDraft(currentCanteen).dates.includes(date) ? 'complete' : 'empty';
      const preview = directPreview(date);
      return preview?.canSubmit ? 'complete' : preview?.selectedRows?.length ? 'partial' : 'empty';
    }
    if (!recipeDates.has(date)) return 'no-menu';
    return attendanceService.status(menuForDate(date), auxiliaryRecordFor(date), auxiliaryServiceOptions()).key;
  }

  function renderCanteenBar() {
    const canteens = availableCanteens.length ? availableCanteens : [currentCanteen];
    return `<div class="school-recipe-canteen-switch" aria-label="当前食堂"><div class="school-recipe-canteen-tabs" role="tablist" aria-label="切换食堂">${canteens.map((canteen) => { const key = String(canteen.id || canteen.name); const active = key === String(currentCanteen.id || currentCanteen.name); return `<button type="button" class="school-recipe-canteen-tab${active ? ' is-active' : ''}" role="tab" aria-selected="${active}" data-aux-canteen="${escapeHtml(key)}">${escapeHtml(canteen.name)}</button>`; }).join('')}</div></div>`;
  }

  function renderOverview() {
    if (state.mode === 'quantity' && state.orderMode === 'combined') {
      const dates = directService.readCombinedDraft(currentCanteen).dates;
      const tags = dates.map((date) => `<span class="school-auxiliary-combined-date">${escapeHtml(date)}<button type="button" data-aux-combined-remove-date="${escapeHtml(date)}" aria-label="移除 ${escapeHtml(date)}">×</button></span>`).join('');
      return `<div class="school-recipe-attendance-overview school-auxiliary-overview school-auxiliary-combined-overview" id="schoolAuxiliaryOverview" aria-label="已选用料日期"><div class="school-recipe-attendance-overview-fields"><div class="school-recipe-attendance-overview-item school-recipe-attendance-date school-auxiliary-combined-date-item"><span>用料日期：</span><div class="school-auxiliary-combined-dates">${tags || '<span class="school-auxiliary-combined-empty">请在日历中选择</span>'}</div></div></div></div>`;
    }
    const total = totalDiningPeople();
    const dateLabel = longDate(dateState.selectedDate);
    return `<div class="school-recipe-attendance-overview school-auxiliary-overview" id="schoolAuxiliaryOverview" aria-label="商品需求填报概况"><div class="school-recipe-attendance-overview-fields"><div class="school-recipe-attendance-overview-item school-recipe-attendance-date"><span>用料日期：</span><strong>${escapeHtml(dateLabel)}</strong></div>${state.mode === 'people' ? `<div class="school-recipe-attendance-overview-item school-recipe-attendance-total"><span>实际就餐人次：</span><strong data-aux-overview-total>${total}</strong></div>` : ''}</div></div>`;
  }

  function renderModeSwitcher() {
    return `<div class="school-recipe-entry-switch" aria-label="商品需求填报方式"><div class="school-recipe-entry-options" role="tablist" aria-label="填报方式">${[
      ['people', '按就餐人数填报'], ['quantity', '按商品数量填报']
    ].map(([mode, label]) => `<button type="button" role="tab" aria-selected="${state.mode === mode}" class="school-recipe-entry-tab${state.mode === mode ? ' is-active' : ''}" data-aux-entry-mode="${mode}">${label}</button>`).join('')}</div></div>`;
  }

  function renderDatePanel() {
    const dates = monthDates(dateState.monthStart);
    const leadingEmptyDays = parseDate(dateState.monthStart).getDay();
    const today = new Date();
    const currentMonth = dateValue(new Date(today.getFullYear(), today.getMonth(), 1));
    const minMonth = shiftMonth(currentMonth, -1);
    const maxMonth = shiftMonth(currentMonth, 1);
    const canGoPrevious = dateState.monthStart > minMonth;
    const canGoNext = dateState.monthStart < maxMonth;
    const cells = [...Array(leadingEmptyDays).fill(''), ...dates].map((date) => {
      if (!date) return '<span class="school-recipe-attendance-date-placeholder" aria-hidden="true"></span>';
      const hasRecipe = recipeDates.has(date);
      const status = dateStatus(date);
      const week = status === 'empty' || status === 'no-menu' ? ' is-hidden' : '';
      const selected = state.mode === 'quantity' && state.orderMode === 'combined'
        ? directService.readCombinedDraft(currentCanteen).dates.includes(date) : date === dateState.selectedDate;
      return `<button type="button" class="school-recipe-attendance-date-item ${selected ? 'is-selected' : ''}${hasRecipe ? '' : ' is-empty'} is-${status}" data-aux-date="${date}" aria-pressed="${selected}" title="${state.mode === 'quantity' && state.orderMode === 'combined' ? '选择或取消此用料日期' : hasRecipe ? '有菜谱' : '无菜谱'}"><span class="school-recipe-attendance-date-number">${Number(date.slice(8, 10))}</span><span class="school-recipe-attendance-date-week${week}">${weekday(date)}</span></button>`;
    }).join('');
    return `<aside class="school-recipe-attendance-date-panel school-auxiliary-recipe-date-panel" aria-label="商品需求填报日期"><div class="school-recipe-attendance-panel-heading"><div class="school-recipe-attendance-calendar-actions"><button type="button" data-aux-month="prev" aria-label="上一个月" title="上一个月" ${canGoPrevious ? '' : 'disabled'}><svg class="icon-svg school-recipe-attendance-calendar-icon" viewBox="0 0 24 24" aria-hidden="true"><polyline points="15 18 9 12 15 6"></polyline></svg></button><span class="school-recipe-attendance-current-month">${monthLabel(dateState.monthStart)}</span><button type="button" data-aux-month="next" aria-label="下一个月" title="下一个月" ${canGoNext ? '' : 'disabled'}><svg class="icon-svg school-recipe-attendance-calendar-icon" viewBox="0 0 24 24" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg></button></div></div><div class="school-recipe-attendance-calendar-caption"><span>${state.mode === 'quantity' && state.orderMode === 'combined' ? '选择用料日期（可多选）' : '本月日期'}</span></div><div class="school-recipe-attendance-calendar-weekdays" aria-hidden="true">${weekdayNames.map((name) => `<span>${name}</span>`).join('')}</div><div class="school-recipe-attendance-date-list">${cells}</div></aside>`;
  }

  function rowData(product) {
    const currentPeople = people();
    const purchaseInProductUnit = (quantity) => product.packSize ? Math.ceil(quantity / product.packSize) * product.packSize : quantity;
    const participantRows = configuredGroups.map((participant) => {
      const demandQty = Number(valueForParticipant(currentPeople, participant) || 0) * Number(product.dose || 0);
      return { demandQty, purchaseQty: purchaseInProductUnit(demandQty) };
    });
    const totalQty = participantRows.reduce((sum, row) => sum + row.demandQty, 0);
    return { totalQty, totalPurchaseQty: purchaseInProductUnit(totalQty) };
  }

  function renderRows() {
    if (shouldSplitOrderByMeal() && !demandMeals().length) {
      return '<div class="school-auxiliary-empty" role="status">当前没有实际就餐人数</div>';
    }
    if (!state.selected.length) return '<div class="school-auxiliary-empty">请添加商品</div>';
    const displayProduct = (product) => `${product.name}（${product.doseUnit || '--'}/${product.brand || '--'}/${product.spec || '--'}）`;
    const splitByPersonType = (() => {
      const value = window.DemoStore?.getSettings?.()?.splitOrderByPersonType;
      return value === true || value === 'true' || value === 1 || value === '1';
    })();
    const groups = configuredGroups.map((participant) => ({ participant, label: participantDisplayName(participant), key: participant.key }));
    const demandColumns = splitByPersonType ? groups.map((group) => `<th colspan="2">${participantHeader(group.participant)}</th>`).join('') : '<th colspan="2">合计</th>';
    const demandSubColumns = splitByPersonType ? groups.map(() => '<th>需求量</th><th>采购量</th>').join('') : '<th>需求量</th><th>采购量</th>';
    const demandColgroup = (splitByPersonType ? groups : [{}]).map(() => '<col style="width:126px"><col style="width:112px">').join('');
    const bodyRows = state.selected.map((product, index) => {
      const data = rowData(product);
      const quantities = splitByPersonType
        ? groups.flatMap((group) => { const quantity = Number(valueForParticipant(people(), group.participant) || 0) * Number(product.dose || 0); const purchase = product.packSize ? Math.ceil(quantity / product.packSize) * product.packSize : quantity; return [`<td class="number">${amount(quantity)} ${escapeHtml(product.doseUnit)}</td>`, `<td class="number">${amount(purchase)} ${escapeHtml(product.doseUnit)}</td>`]; })
        : [`<td class="number">${amount(data.totalQty)} ${escapeHtml(product.doseUnit)}</td>`, `<td class="number">${amount(data.totalPurchaseQty)} ${escapeHtml(product.doseUnit)}</td>`];
      return `<tr><td>${index + 1}</td><td class="product-cell"><span class="product-display-text">${escapeHtml(displayProduct(product))}</span></td><td><span class="school-auxiliary-dose-value">${escapeHtml(product.doseDisplay || `${product.dose} ${product.doseUnit}`)}</span></td><td>${escapeHtml(product.code)}</td><td>是</td>${quantities.join('')}<td><button class="school-auxiliary-remove" type="button" data-remove-id="${escapeHtml(product.id)}">移除</button></td></tr>`;
    }).join('');
    return `<div class="school-auxiliary-table-wrap"><table class="school-auxiliary-table school-auxiliary-demand-table"><colgroup><col style="width:58px"><col style="width:370px"><col style="width:118px"><col style="width:100px"><col style="width:88px">${demandColgroup}<col style="width:70px"></colgroup><thead><tr><th rowspan="2">序号</th><th rowspan="2">商品</th><th rowspan="2">人均用量</th><th rowspan="2">编号</th><th rowspan="2">是否标品</th>${demandColumns}<th rowspan="2">操作</th></tr><tr>${demandSubColumns}</tr></thead><tbody>${bodyRows}</tbody></table></div>`;
  }

  function renderPeopleTable() {
    const isNonDining = state.attendanceMode === 'non-dining';
    const groups = configuredGroups;
    const personHeaders = groups.length ? groups.map((participant) => `<th>${participantHeader(participant)}</th>`).join('') : '<th>暂无启用人员类型</th>';
    const rows = Object.entries(meals).map(([key, meal]) => {
      const total = groups.reduce((sum, participant) => sum + Number(valueForParticipant(meal, participant) || 0), 0);
      const personCells = groups.map((participant) => {
        const diningValue = valueForParticipant(meal, participant) ?? '';
        const nonDiningValue = valueForParticipant(meal, participant, 'nonDining_') ?? '';
        const displayName = participantDisplayName(participant);
        const isEmptyHighlight = !isNonDining && state.highlightEmpty && (diningValue === '' || diningValue == null);
        const diningInput = `<div class="school-recipe-attendance-table-input"><input class="school-recipe-attendance-count-input${isEmptyHighlight ? ' is-empty' : ''}" type="number" min="0" max="100000" step="1" inputmode="numeric" value="${escapeHtml(diningValue)}" placeholder="请输入" data-person-type="${participant.key}" data-meal-key="${key}" aria-label="${escapeHtml(`${meal.name}${displayName}人数`)}"${isEmptyHighlight ? ' aria-invalid="true"' : ''}><i>人</i></div>`;
        if (!isNonDining) return `<td>${diningInput}${Number(nonDiningValue) > 0 ? `<small class="school-recipe-attendance-person-non-dining-summary">含不就餐${Number(nonDiningValue)}人</small>` : ''}</td>`;
        const diningDisplayValue = diningValue === '' || diningValue == null ? '--' : `${Number(diningValue)} 人`;
        return `<td><div class="school-recipe-attendance-person-cell is-non-dining-mode"><div class="school-recipe-attendance-person-count-display"><span>总人数</span><strong>${escapeHtml(diningDisplayValue)}</strong></div><div class="school-recipe-attendance-person-count-item"><span>不就餐</span><div class="school-recipe-attendance-table-input school-recipe-attendance-non-dining-input"><input type="number" min="0" max="${Number(diningValue) || 100000}" step="1" inputmode="numeric" value="${escapeHtml(nonDiningValue)}" placeholder="0" data-person-type="nonDining_${participant.key}" data-meal-key="${key}" aria-label="${escapeHtml(`${meal.name}${displayName}不就餐人数`)}"><i>人</i></div></div></div></td>`;
      }).join('');
      return `<tr><td class="school-recipe-attendance-meal-name"><strong>${meal.name}</strong></td>${personCells}<td class="school-recipe-attendance-meal-total-cell"><strong data-people-total>${total}</strong><i>人</i></td></tr>`;
    }).join('');
    return `<div class="school-auxiliary-people-section"><div class="school-recipe-attendance-section-heading school-auxiliary-people-heading"><div><span class="section-title-mark">餐次总人数</span>${isNonDining ? '' : '<span class="school-recipe-attendance-count-tip">无人员就餐请填写为0</span>'}</div><button type="button" class="btn btn-sm school-recipe-attendance-mode-action${isNonDining ? ' btn-primary' : ''}" data-aux-attendance-mode-toggle>${isNonDining ? '保存' : '填写不就餐人数'}</button></div><div class="school-recipe-attendance-meal-table-wrap school-auxiliary-people-table-wrap"><table class="school-recipe-attendance-meal-table school-auxiliary-people-table"><colgroup><col class="col-meal">${groups.map(() => '<col class="col-person">').join('')}<col class="col-meal-total"></colgroup><thead><tr><th rowspan="2">餐次</th><th colspan="${Math.max(1, groups.length)}">总人数</th><th rowspan="2">本餐合计</th></tr><tr>${personHeaders}</tr></thead><tbody>${rows}</tbody></table></div></div>`;
  }

  function renderProductModal() {
    if (!state.productModalOpen || state.mode !== 'people') return '';
    const filters = state.modalFilters;
    const categoryOptions = [...new Map(products.flatMap((product) => product.category.map((_, index) => product.category.slice(0, index + 1)))
      .map((path) => [path.join('|'), path])).values()];
    const categoryPath = filters.category ? filters.category.split('|') : [];
    const keyword = filters.keyword.trim().toLowerCase();
    const filtered = products.filter((product) =>
      (!keyword || `${product.name} ${product.auxiliaryName} ${product.code}`.toLowerCase().includes(keyword))
      && categoryPath.every((part, index) => product.category[index] === part));
    const pageSize = state.modalPageSize;
    const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
    state.modalPage = Math.min(state.modalPage, pageCount);
    const visible = filtered.slice((state.modalPage - 1) * pageSize, state.modalPage * pageSize);
    const allVisibleSelected = visible.length > 0 && visible.every((product) => state.modalSelected.has(product.id));
    const categoryOptionsHtml = categoryOptions.map((path) => {
      const value = path.join('|');
      return `<option value="${escapeHtml(value)}"${value === filters.category ? ' selected' : ''}>${escapeHtml(`${'　'.repeat(path.length - 1)}${path[path.length - 1]}`)}</option>`;
    }).join('');
    const rows = visible.map((product) => {
      const productDisplay = `${product.name}（${product.doseUnit || product.unit || '--'}/${product.brand || '--'}/${product.spec || '--'}）`;
      return `<tr><td><input type="checkbox" value="${escapeHtml(product.id)}" data-aux-product-checkbox aria-label="选择${escapeHtml(product.name)}"${state.modalSelected.has(product.id) ? ' checked' : ''}></td><td class="product-list-name">${escapeHtml(productDisplay)}</td><td class="product-list-category">${product.category.map(escapeHtml).join(' / ')}</td><td>${escapeHtml(product.code)}</td><td>${escapeHtml(product.purchaseUnit)}</td><td><button type="button" class="school-auxiliary-product-default${state.defaultProductIds.has(product.id) ? ' is-default' : ''}" data-aux-product-default="${escapeHtml(product.id)}" aria-pressed="${state.defaultProductIds.has(product.id)}">${state.defaultProductIds.has(product.id) ? '取消默认' : '设为默认'}</button></td></tr>`;
    }).join('');
    const pageButtons = Array.from({ length: pageCount }, (_, index) => index + 1)
      .map((page) => `<button type="button" class="school-auxiliary-page-button${page === state.modalPage ? ' is-active' : ''}" data-aux-product-page="${page}"${page === state.modalPage ? ' aria-current="page"' : ''}>${page}</button>`).join('');
    return `<div class="school-auxiliary-modal-backdrop" data-aux-product-modal><section class="school-auxiliary-modal" role="dialog" aria-modal="true" aria-label="添加商品"><header class="school-auxiliary-modal-header"><h3>添加商品</h3><button type="button" class="school-auxiliary-modal-close" data-aux-product-close aria-label="关闭">×</button></header><div class="school-auxiliary-modal-body"><div class="school-auxiliary-product-filters"><label><span>商品名称</span><input type="search" value="${escapeHtml(filters.keyword)}" placeholder="请输入商品名称/编号" data-aux-product-keyword></label><label><span>商品分类</span><select data-aux-product-category><option value="">全部</option>${categoryOptionsHtml}</select></label><div class="school-auxiliary-filter-actions"><button type="button" class="btn btn-primary btn-sm" data-aux-product-query>查询</button><button type="button" class="btn btn-sm" data-aux-product-reset>重置</button></div></div><div class="school-auxiliary-product-list-wrap"><table class="school-auxiliary-product-list"><colgroup><col class="col-select"><col class="col-name"><col class="col-category"><col class="col-code"><col class="col-unit"><col class="col-action"></colgroup><thead><tr><th><input type="checkbox" data-aux-product-select-all aria-label="全选当前页"${allVisibleSelected ? ' checked' : ''}></th><th>商品名称</th><th>商品分类</th><th>商品编号</th><th>计量单位</th><th>操作</th></tr></thead><tbody>${rows || '<tr><td colspan="6" class="school-auxiliary-no-results">暂无符合条件的商品</td></tr>'}</tbody></table></div><div class="school-auxiliary-pagination"><span class="school-auxiliary-page-total">共 ${filtered.length} 条数据</span><select class="school-auxiliary-page-size" data-aux-product-page-size aria-label="每页条数">${[10, 20, 50].map((size) => `<option value="${size}"${pageSize === size ? ' selected' : ''}>${size} 条/页</option>`).join('')}</select><div class="school-auxiliary-page-buttons"><button type="button" class="school-auxiliary-page-button" data-aux-product-page="${state.modalPage - 1}"${state.modalPage === 1 ? ' disabled' : ''}>‹</button>${pageButtons}<button type="button" class="school-auxiliary-page-button" data-aux-product-page="${state.modalPage + 1}"${state.modalPage === pageCount ? ' disabled' : ''}>›</button></div><label class="school-auxiliary-page-jump">跳至 <input type="number" min="1" max="${pageCount}" step="1" value="${state.modalPage}" data-aux-product-jump aria-label="跳转页码"> / ${pageCount} 页</label></div></div><footer class="school-auxiliary-modal-footer"><button type="button" class="btn btn-sm" data-aux-product-close>取消</button><button type="button" class="btn btn-primary btn-sm" data-aux-product-confirm>确定</button></footer></section></div>`;
  }

  function renderForm() {
    const visibleMeals = demandMeals();
    const mealTabs = shouldSplitOrderByMeal() && visibleMeals.length
      ? `<div class="school-auxiliary-meal-tabs" role="tablist">${visibleMeals.map(([key, meal]) => `<button class="school-auxiliary-meal-tab ${key === state.meal ? 'is-active' : ''}" type="button" data-meal="${key}" role="tab" aria-selected="${key === state.meal}">${meal.name}</button>`).join('')}</div>`
      : '';
    return `<div class="school-auxiliary-scroll">${renderPeopleTable()}<div class="school-auxiliary-section-title"><span class="section-title-mark">需求测算</span><button class="btn btn-blue btn-sm" type="button" data-aux-product-open>批量添加商品</button></div><div id="schoolAuxiliaryMealTabs">${mealTabs}</div><div id="schoolAuxiliaryRows">${renderRows()}</div></div><footer class="school-auxiliary-footer"><div class="school-recipe-attendance-draft-actions"><div class="school-recipe-attendance-reset-dropdown"><button type="button" class="btn btn-sm school-recipe-attendance-reset-trigger" data-aux-reset-toggle aria-expanded="false" aria-haspopup="menu">重置<svg class="school-recipe-attendance-reset-chevron" viewBox="0 0 24 24" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg></button><div class="school-recipe-attendance-reset-menu" role="menu"><button type="button" role="menuitem" data-aux-reset="current">重置当前人数</button><button type="button" role="menuitem" data-aux-reset="all">重置全部人数</button></div></div><button type="button" class="btn btn-sm" data-fill-defaults>填写默认人数</button></div><div class="school-auxiliary-actions"><button class="btn btn-primary btn-sm${state.selected.length ? '' : ' btn-disabled'}" type="button" data-confirm-demand${state.selected.length ? '' : ' disabled'}>确认需求</button></div></footer>`;
  }

  function renderOrderModeSwitcher() {
    return `<div class="school-auxiliary-order-mode" role="group" aria-label="商品下单方式">
      <button type="button" class="school-auxiliary-order-mode-button${state.orderMode === 'daily' ? ' is-active' : ''}" data-aux-order-mode="daily" aria-pressed="${state.orderMode === 'daily'}">分天分餐次下单</button>
      <button type="button" class="school-auxiliary-order-mode-button${state.orderMode === 'combined' ? ' is-active' : ''}" data-aux-order-mode="combined" aria-pressed="${state.orderMode === 'combined'}">多天合并下单</button>
    </div>`;
  }

  function renderCombinedForm() {
    const draft = directService.readCombinedDraft(currentCanteen);
    const preview = directService.buildCombinedPreview(currentCanteen, draft);
    const catalog = directService.catalogProducts(currentCanteen);
    const rows = catalog.map((product, index) => {
      const code = String(product.code);
      const value = draft.quantities[code] ?? '';
      return `<tr><td>${index + 1}</td><td class="product-cell">${escapeHtml(product.auxiliaryName)}</td><td class="product-cell">${escapeHtml(`${product.name}（${product.unit}/${product.brand}/${product.spec}）`)}</td><td>${escapeHtml(code)}</td><td>${escapeHtml(product.unit)}</td><td><div class="school-recipe-direct-input-wrap"><input type="number" min="0" step="any" inputmode="decimal" placeholder="请输入" value="${escapeHtml(value)}" data-aux-combined-quantity="${escapeHtml(code)}" aria-label="${escapeHtml(product.name)}周期采购总量"></div></td></tr>`;
    }).join('');
    const table = `<div class="school-auxiliary-table-wrap"><table class="school-auxiliary-table school-auxiliary-combined-table"><thead><tr><th>序号</th><th>干调</th><th>商品名称（计量单位/品牌/规格）</th><th>商品编号</th><th>单位</th><th>周期采购总量</th></tr></thead><tbody>${rows || '<tr><td colspan="6" class="school-auxiliary-combined-empty">暂无已设置的干调商品</td></tr>'}</tbody></table></div>`;
    const hasDraft = draft.dates.length || Object.values(draft.quantities).some((value) => String(value).trim() !== '');
    return `<div class="school-auxiliary-scroll school-auxiliary-direct-scroll school-auxiliary-combined-scroll"><div class="school-recipe-attendance-section-heading school-recipe-direct-heading"><span class="section-title-mark">填写采购量</span></div>${table}</div><footer class="school-auxiliary-footer school-auxiliary-direct-footer"><div class="school-recipe-direct-footer-left"><button type="button" class="btn btn-sm" data-aux-combined-clear${hasDraft ? '' : ' disabled'}>清空本次填报</button><span data-aux-combined-summary>已选 ${draft.dates.length} 天、${preview.selectedRows.length} 种商品</span></div><button type="button" class="btn btn-primary btn-sm${preview.canSubmit ? '' : ' btn-disabled'}" data-aux-combined-confirm${preview.canSubmit ? '' : ' disabled'}>需求确认</button></footer>`;
  }

  function renderDirectForm() {
    const preview = directPreview();
    const activeMeal = preview.meals.find((meal) => meal.key === state.directMeal) || preview.meals[0];
    state.directMeal = activeMeal?.key || '';
    const draft = directService.readDraft(dateState.selectedDate, currentCanteen);
    const hasDateValues = Object.values(draft).some((value) => String(value).trim() !== '');
    const hasMealValues = (activeMeal?.rows || []).some((row) => hasDirectRowDraft(draft, row));
    const filledProducts = new Set(preview.selectedRows.map((row) => row.productCode)).size;
    const tabs = `<div class="school-recipe-meal-tabs school-recipe-direct-meal-tabs" role="tablist" aria-label="切换采购餐次">${preview.meals.map((meal) => `<button type="button" class="school-recipe-meal-tab${meal.key === state.directMeal ? ' is-active' : ''}" role="tab" aria-selected="${meal.key === state.directMeal}" data-aux-direct-meal="${escapeHtml(meal.key)}">${escapeHtml(meal.name)}</button>`).join('')}</div>`;
    const directParticipants = shouldSplitOrderByPersonType() ? configuredGroups : [];
    const quantityHeaders = directParticipants.length
      ? directParticipants.map((person) => `<th>${escapeHtml(participantDisplayName(person))}采购量</th>`).join('')
      : '<th>采购量</th>';
    const quantityCols = directParticipants.length
      ? directParticipants.map(() => '<col style="width:140px">').join('')
      : '<col style="width:140px">';
    const quantityCells = (row, meal) => {
      const values = directParticipants.length ? directParticipants.map((person, index) => ({
        key: `${row.key}::${person.key}`, name: participantDisplayName(person),
        value: draft[`${row.key}::${person.key}`] ?? (index === 0 ? draft[row.key] : '')
      })) : [{ key: row.key, name: '', value: draft[row.key] ?? (row.orderQty > 0 ? row.orderQty : '') }];
      return values.map(({ key, name, value }) => `<td><div class="school-recipe-direct-input-wrap"><input type="number" min="0" step="any" inputmode="decimal" placeholder="0" value="${escapeHtml(value)}" data-aux-direct-quantity="${escapeHtml(key)}" aria-label="${escapeHtml(`${meal.name}${row.productName}${name}采购量`)}"></div></td>`).join('');
    };
    const rows = (activeMeal?.rows || []).map((row, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(row.auxiliaryName)}</td><td class="product-cell">${escapeHtml(`${row.productName}（${row.unit}/${row.brand}/${row.spec}）`)}</td><td>${escapeHtml(row.productCode)}</td><td>${escapeHtml(row.unit)}</td>${quantityCells(row, activeMeal)}</tr>`).join('');
    const table = `<div class="school-auxiliary-table-wrap"><table class="school-auxiliary-table school-recipe-direct-table school-auxiliary-direct-table" style="min-width:${Math.max(780, 668 + (directParticipants.length || 1) * 140)}px"><colgroup><col style="width:58px"><col style="width:110px"><col style="width:300px"><col style="width:120px"><col style="width:80px">${quantityCols}</colgroup><thead><tr><th>序号</th><th>干调</th><th>商品名称（计量单位/品牌/规格）</th><th>商品编号</th><th>单位</th>${quantityHeaders}</tr></thead><tbody>${rows}</tbody></table></div>`;
    const clearMenu = `<div class="school-recipe-attendance-reset-dropdown${hasDateValues ? '' : ' is-disabled'}"><button type="button" class="btn btn-sm school-recipe-attendance-reset-trigger" data-aux-direct-clear-toggle aria-expanded="false" aria-haspopup="menu"${hasDateValues ? '' : ' disabled'}>清空数量<svg class="school-recipe-attendance-reset-chevron" viewBox="0 0 24 24" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg></button><div class="school-recipe-attendance-reset-menu" role="menu"><button type="button" role="menuitem" data-aux-direct-clear="meal"${hasMealValues ? '' : ' disabled'}>清空当前餐次数量</button><button type="button" role="menuitem" data-aux-direct-clear="date"${hasDateValues ? '' : ' disabled'}>清空当前日期数量</button></div></div>`;
    return `<div class="school-auxiliary-scroll school-auxiliary-direct-scroll"><div class="school-recipe-attendance-section-heading school-recipe-direct-heading"><span class="section-title-mark">填写采购量</span><p>无需采购时采购量填 0 或不填</p></div>${tabs}${table}</div><footer class="school-auxiliary-footer school-auxiliary-direct-footer"><div class="school-recipe-direct-footer-left">${clearMenu}<span data-aux-direct-summary>已填写 ${filledProducts} 种商品</span></div><button type="button" class="btn btn-primary btn-sm${preview.canSubmit ? '' : ' btn-disabled'}" data-aux-direct-confirm${preview.canSubmit ? '' : ' disabled'}>需求确认</button></footer>`;
  }

  function renderDetail() {
    if (state.mode === 'people' && !recipeDates.has(dateState.selectedDate)) {
      return `<div class="school-auxiliary-scroll"><div class="school-auxiliary-empty" role="status">该日期没有菜谱，无法填报干调需求，请选择有菜谱的日期。</div></div>`;
    }
    return state.mode === 'quantity'
      ? `${renderOrderModeSwitcher()}${state.orderMode === 'combined' ? renderCombinedForm() : renderDirectForm()}`
      : renderForm();
  }

  function renderPage() {
    return `<section class="page-card school-auxiliary-page" id="schoolAuxiliaryPage">${renderModeSwitcher()}<div class="school-auxiliary-body">${renderDatePanel()}<main class="school-auxiliary-detail">${renderCanteenBar()}${renderOverview()}${renderDetail()}</main></div>${renderProductModal()}</section>`;
  }

  const root = window.AppShell.mount({ title: '干调需求填报', variant: 'school', content: renderPage(), emptyText: '干调需求填报' });
  const rerenderPage = () => {
    const page = root.querySelector('#schoolAuxiliaryPage');
    if (page) page.outerHTML = renderPage();
  };
  const rerenderRows = () => {
    const rows = root.querySelector('#schoolAuxiliaryRows');
    if (rows) rows.innerHTML = renderRows();
    const confirmButton = root.querySelector('[data-confirm-demand]');
    if (confirmButton) {
      const disabled = !state.selected.length;
      confirmButton.disabled = disabled;
      confirmButton.classList.toggle('btn-disabled', disabled);
    }
  };
  const refreshMealTabs = () => {
    const tabs = root.querySelector('#schoolAuxiliaryMealTabs');
    if (!tabs) return;
    const visibleMeals = shouldSplitOrderByMeal() ? demandMeals() : [];
    tabs.innerHTML = visibleMeals.length
      ? `<div class="school-auxiliary-meal-tabs" role="tablist">${visibleMeals.map(([key, meal]) => `<button class="school-auxiliary-meal-tab ${key === state.meal ? 'is-active' : ''}" type="button" data-meal="${key}" role="tab" aria-selected="${key === state.meal}">${meal.name}</button>`).join('')}</div>`
      : '';
  };
  const refreshPeopleTable = () => { const section = root.querySelector('.school-auxiliary-people-section'); if (section) section.outerHTML = renderPeopleTable(); };
  const refreshOverview = () => { const overview = root.querySelector('#schoolAuxiliaryOverview'); if (overview) overview.outerHTML = renderOverview(); };
  const refreshDatePanel = () => { const panel = root.querySelector('.school-auxiliary-recipe-date-panel'); if (panel) panel.outerHTML = renderDatePanel(); };
  const refreshProductModal = () => {
    const modal = root.querySelector('[data-aux-product-modal]');
    if (modal) modal.outerHTML = renderProductModal();
  };
  const jumpProductPage = (input) => {
    const page = Number(input.value);
    const max = Number(input.max) || 1;
    state.modalPage = Number.isInteger(page) && page > 0 ? Math.min(page, max) : state.modalPage;
    refreshProductModal();
  };
  const closeProductModal = () => {
    state.productModalOpen = false;
    state.modalSelected = new Set();
    rerenderPage();
    root.querySelector('[data-aux-product-open]')?.focus();
  };

  root.addEventListener('click', (event) => {
    if (event.target.closest('[data-aux-product-open]')) {
      state.productModalOpen = true;
      state.modalPage = 1;
      state.modalSelected = new Set(state.selected.map((product) => product.id));
      state.modalFilters = { keyword: '', category: '' };
      rerenderPage();
      root.querySelector('[data-aux-product-keyword]')?.focus();
      return;
    }
    if (event.target.closest('[data-aux-product-close]') || event.target.matches?.('[data-aux-product-modal]')) {
      closeProductModal();
      return;
    }
    if (event.target.closest('[data-aux-product-query]')) {
      state.modalPage = 1;
      refreshProductModal();
      return;
    }
    if (event.target.closest('[data-aux-product-reset]')) {
      state.modalFilters = { keyword: '', category: '' };
      state.modalPage = 1;
      refreshProductModal();
      return;
    }
    const defaultButton = event.target.closest('[data-aux-product-default]');
    if (defaultButton) {
      const product = products.find((item) => item.id === defaultButton.dataset.auxProductDefault);
      if (!product) return;
      if (state.defaultProductIds.has(product.id)) {
        state.defaultProductIds.delete(product.id);
      } else {
        state.defaultProductIds.add(product.id);
        state.modalSelected.add(product.id);
        const mealKeysToUpdate = new Set([...Object.keys(state.selectedByMeal), ...Object.keys(meals)]);
        mealKeysToUpdate.forEach((mealKey) => {
          const selectedIds = state.selectedByMeal[mealKey] || [...state.defaultProductIds];
          state.selectedByMeal[mealKey] = [...new Set([...selectedIds, product.id])];
        });
        persistSelectedProducts();
        rerenderRows();
      }
      persistDefaultProducts();
      refreshProductModal();
      return;
    }
    const productPage = event.target.closest('[data-aux-product-page]');
    if (productPage && !productPage.disabled) {
      state.modalPage = Number(productPage.dataset.auxProductPage);
      refreshProductModal();
      return;
    }
    if (event.target.closest('[data-aux-product-confirm]')) {
      const selected = products.filter((product) => state.modalSelected.has(product.id) || state.defaultProductIds.has(product.id));
      if (!selected.length) { showToast('请至少选择一种商品', true); return; }
      state.selected = selected;
      persistSelectedProducts();
      closeProductModal();
      return;
    }
    const entryButton = event.target.closest('[data-aux-entry-mode]');
    if (entryButton) {
      const nextMode = entryButton.dataset.auxEntryMode;
      if (nextMode === state.mode || !['people', 'quantity'].includes(nextMode)) return;
      if (state.attendanceMode === 'non-dining') {
        showToast('请先保存不就餐人数，再切换填报方式', true);
        return;
      }
      if (nextMode === 'quantity') {
        persistDraft();
        window.location.href = './school-recipe-auxiliary-attendance.html?mode=quantity';
        return;
      }
      if (state.mode === 'people') persistDraft();
      state.mode = nextMode;
      state.directMeal = '';
      rerenderPage();
      return;
    }
    const orderModeButton = event.target.closest('[data-aux-order-mode]');
    if (orderModeButton) {
      const next = orderModeButton.dataset.auxOrderMode;
      if (!['daily', 'combined'].includes(next) || next === state.orderMode) return;
      state.orderMode = next;
      window.AppStorage?.write?.(orderModeKey, next);
      rerenderPage();
      return;
    }
    const removeCombinedDate = event.target.closest('[data-aux-combined-remove-date]');
    if (removeCombinedDate) {
      const draft = directService.readCombinedDraft(currentCanteen);
      draft.dates = draft.dates.filter((date) => date !== removeCombinedDate.dataset.auxCombinedRemoveDate);
      directService.writeCombinedDraft(currentCanteen, draft);
      rerenderPage();
      return;
    }
    if (event.target.closest('[data-aux-combined-clear]')) {
      directService.writeCombinedDraft(currentCanteen, null);
      rerenderPage();
      return;
    }
    if (event.target.closest('[data-aux-combined-confirm]')) {
      const preview = directService.buildCombinedPreview(currentCanteen);
      if (!preview.canSubmit) { showToast(preview.message, true); return; }
      window.location.href = `./school-recipe-auxiliary-demand-confirm.html?mode=quantity&orderMode=combined&date=${encodeURIComponent(dateState.selectedDate)}&canteen=${encodeURIComponent(canteenScope)}`;
      return;
    }
    const directMealTab = event.target.closest('[data-aux-direct-meal]');
    if (directMealTab) {
      state.directMeal = directMealTab.dataset.auxDirectMeal;
      rerenderPage();
      return;
    }
    if (event.target.closest('[data-aux-direct-clear-toggle]')) {
      event.target.closest('.school-recipe-attendance-reset-dropdown')?.classList.toggle('is-open');
      return;
    }
    const directClear = event.target.closest('[data-aux-direct-clear]');
    if (directClear && !directClear.disabled) {
      const draft = directService.readDraft(dateState.selectedDate, currentCanteen);
      if (directClear.dataset.auxDirectClear === 'meal') {
        directPreview().meals.find((meal) => meal.key === state.directMeal)?.rows.forEach((row) => { Object.keys(draft).filter((key) => key === row.key || key.startsWith(`${row.key}::`)).forEach((key) => { delete draft[key]; }); });
        directService.writeDraft(dateState.selectedDate, currentCanteen, draft);
      } else directService.writeDraft(dateState.selectedDate, currentCanteen, {});
      rerenderPage();
      showToast(directClear.dataset.auxDirectClear === 'meal' ? '已清空当前餐次采购量' : '已清空当前日期采购量');
      return;
    }
    if (event.target.closest('[data-aux-direct-confirm]')) {
      const preview = directPreview();
      if (!preview.canSubmit) {
        showToast(preview.message, true);
        return;
      }
      window.location.href = `./school-recipe-auxiliary-demand-confirm.html?mode=quantity&orderMode=daily&date=${encodeURIComponent(dateState.selectedDate)}&canteen=${encodeURIComponent(canteenScope)}`;
      return;
    }
    const canteenButton = event.target.closest('[data-aux-canteen]');
    if (canteenButton) {
      window.AppStorage?.write?.('school-recipe-auxiliary-current-canteen', canteenButton.dataset.auxCanteen);
      window.location.reload();
      return;
    }
    const dateButton = event.target.closest('[data-aux-date]');
    if (dateButton) {
      if (state.mode === 'quantity' && state.orderMode === 'combined') {
        const draft = directService.readCombinedDraft(currentCanteen);
        const date = dateButton.dataset.auxDate;
        draft.dates = draft.dates.includes(date) ? draft.dates.filter((value) => value !== date)
          : [...draft.dates, date].sort();
        directService.writeCombinedDraft(currentCanteen, draft);
        rerenderPage();
        return;
      }
      if (state.mode === 'people') persistDraft();
      dateState.selectedDate = dateButton.dataset.auxDate;
      meals = createMealsForDate(dateState.selectedDate);
      state.meal = Object.keys(meals).includes('lunch') ? 'lunch' : Object.keys(meals)[0] || '';
      state.directMeal = '';
      state.attendanceMode = 'dining';
      state.highlightEmpty = false;
      loadDraft(dateState.selectedDate);
      if (state.mode === 'people') persistDraft();
      persistView();
      rerenderPage();
      return;
    }
    const monthButton = event.target.closest('[data-aux-month]');
    if (monthButton && !monthButton.disabled) {
      if (state.mode === 'people') persistDraft();
      const nextMonth = shiftMonth(dateState.monthStart, monthButton.dataset.auxMonth === 'prev' ? -1 : 1);
      dateState.monthStart = nextMonth;
      if (state.mode === 'quantity' && state.orderMode === 'combined') {
        persistView();
        rerenderPage();
        return;
      }
      const dates = monthDates(nextMonth);
      if (!dates.includes(dateState.selectedDate)) {
        const day = Math.min(Number(dateState.selectedDate.slice(8, 10)) || 1, dates.length);
        dateState.selectedDate = dates[day - 1];
      }
      meals = createMealsForDate(dateState.selectedDate);
      state.meal = Object.keys(meals).includes('lunch') ? 'lunch' : Object.keys(meals)[0] || '';
      state.directMeal = '';
      state.attendanceMode = 'dining';
      state.highlightEmpty = false;
      loadDraft(dateState.selectedDate);
      if (state.mode === 'people') persistDraft();
      persistView();
      rerenderPage();
      return;
    }
    if (event.target.closest('[data-aux-reset-toggle]')) {
      event.target.closest('.school-recipe-attendance-reset-dropdown')?.classList.toggle('is-open');
      return;
    }
    const resetAction = event.target.closest('[data-aux-reset]')?.dataset.auxReset;
    if (resetAction) {
      if (resetAction === 'all') {
        const drafts = readDrafts();
        delete drafts[canteenScope];
        window.AppStorage?.write?.(draftStorageKey, drafts);
      }
      Object.entries(meals).forEach(([key, meal]) => {
        configuredGroups.forEach((participant) => {
          setParticipantValue(meal, participant, '');
          setParticipantValue(meal, participant, '', 'nonDining_');
        });
      });
      state.attendanceMode = 'dining';
      persistDraft();
      rerenderPage();
      return;
    }
    if (event.target.closest('[data-fill-defaults]')) {
      Object.entries(meals).forEach(([key, meal]) => {
        configuredGroups.forEach((participant) => {
          setParticipantValue(meal, participant, defaultValueForParticipant(key, participant));
          setParticipantValue(meal, participant, '', 'nonDining_');
        });
      });
      persistDraft();
      rerenderPage();
      return;
    }
    if (event.target.closest('[data-aux-attendance-mode-toggle]')) {
      if (state.attendanceMode === 'non-dining') {
        state.attendanceMode = 'dining';
        persistDraft();
        refreshPeopleTable();
        return;
      }
      if (totalDiningPeople() <= 0) return;
      state.attendanceMode = 'non-dining';
      refreshPeopleTable();
      return;
    }
    const meal = event.target.closest('[data-meal]');
    if (meal) {
      state.meal = meal.dataset.meal;
      root.querySelectorAll('[data-meal]').forEach((button) => {
        button.classList.toggle('is-active', button.dataset.meal === state.meal);
        button.setAttribute('aria-selected', String(button.dataset.meal === state.meal));
      });
      rerenderRows();
      return;
    }
    const remove = event.target.closest('[data-remove-id]');
    if (remove) {
      state.selected = state.selected.filter((product) => product.id !== remove.dataset.removeId);
      persistSelectedProducts();
      rerenderRows();
      return;
    }
    if (event.target.closest('[data-confirm-demand]')) {
      if (!state.selected.length) { showToast('请先添加商品', true); return; }
      if (!recipeDates.has(dateState.selectedDate)) { showToast('请选择有菜谱的日期', true); return; }
      persistDraft();
      const emptyField = firstEmptyAttendanceField();
      if (emptyField) {
        state.highlightEmpty = true;
        refreshPeopleTable();
        const input = [...root.querySelectorAll('[data-person-type]')].find((item) => (
          item.dataset.mealKey === emptyField.meal.key && item.dataset.personType === emptyField.participant.key
        ));
        input?.focus({ preventScroll: true });
        input?.scrollIntoView?.({ block: 'center', inline: 'nearest' });
        showToast('请填写所有餐次人数', true);
        return;
      }
      state.highlightEmpty = false;
      window.location.href = `./school-recipe-auxiliary-demand-confirm.html?mode=people&date=${encodeURIComponent(dateState.selectedDate)}&canteen=${encodeURIComponent(canteenScope)}`;
    }
  });

  root.addEventListener('change', (event) => {
    const pageSize = event.target.closest('[data-aux-product-page-size]');
    if (pageSize) {
      const size = Number(pageSize.value);
      if ([10, 20, 50].includes(size)) {
        state.modalPageSize = size;
        state.modalPage = 1;
        refreshProductModal();
      }
      return;
    }
    const pageJump = event.target.closest('[data-aux-product-jump]');
    if (pageJump) { jumpProductPage(pageJump); return; }
    const category = event.target.closest('[data-aux-product-category]');
    if (category) {
      state.modalFilters.category = category.value;
      state.modalPage = 1;
      refreshProductModal();
      return;
    }
    const selectAll = event.target.closest('[data-aux-product-select-all]');
    if (selectAll) {
      root.querySelectorAll('[data-aux-product-checkbox]').forEach((checkbox) => {
        if (selectAll.checked) state.modalSelected.add(checkbox.value);
        else state.modalSelected.delete(checkbox.value);
      });
      refreshProductModal();
      return;
    }
    const checkbox = event.target.closest('[data-aux-product-checkbox]');
    if (checkbox) {
      if (checkbox.checked) state.modalSelected.add(checkbox.value);
      else state.modalSelected.delete(checkbox.value);
      const visible = [...root.querySelectorAll('[data-aux-product-checkbox]')];
      const all = root.querySelector('[data-aux-product-select-all]');
      if (all) all.checked = visible.length > 0 && visible.every((item) => item.checked);
    }
  });

  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state.productModalOpen) closeProductModal();
    const pageJump = event.target.closest('[data-aux-product-jump]');
    if (pageJump && event.key === 'Enter') {
      event.preventDefault();
      jumpProductPage(pageJump);
    }
  });

  root.addEventListener('input', (event) => {
    const productKeyword = event.target.closest('[data-aux-product-keyword]');
    if (productKeyword) { state.modalFilters.keyword = productKeyword.value; return; }
    const combinedInput = event.target.closest('[data-aux-combined-quantity]');
    if (combinedInput) {
      const draft = directService.readCombinedDraft(currentCanteen);
      if (combinedInput.value === '') delete draft.quantities[combinedInput.dataset.auxCombinedQuantity];
      else draft.quantities[combinedInput.dataset.auxCombinedQuantity] = combinedInput.value;
      directService.writeCombinedDraft(currentCanteen, draft);
      const preview = directService.buildCombinedPreview(currentCanteen, draft);
      const button = root.querySelector('[data-aux-combined-confirm]');
      if (button) {
        button.disabled = !preview.canSubmit;
        button.classList.toggle('btn-disabled', !preview.canSubmit);
      }
      combinedInput.setAttribute('aria-invalid', String(combinedInput.value !== ''
        && (!Number.isFinite(Number(combinedInput.value)) || Number(combinedInput.value) < 0
          || (preview.rows.find((row) => row.productCode === combinedInput.dataset.auxCombinedQuantity)?.isStandardProduct
            && !Number.isInteger(Number(combinedInput.value))))));
      const summary = root.querySelector('[data-aux-combined-summary]');
      if (summary) summary.textContent = `已选 ${draft.dates.length} 天、${preview.selectedRows.length} 种商品`;
      return;
    }
    const directInput = event.target.closest('[data-aux-direct-quantity]');
    if (directInput) {
      const draft = directService.readDraft(dateState.selectedDate, currentCanteen);
      if (directInput.value === '') delete draft[directInput.dataset.auxDirectQuantity];
      else draft[directInput.dataset.auxDirectQuantity] = directInput.value;
      directService.writeDraft(dateState.selectedDate, currentCanteen, draft);
      const preview = directPreview();
      const invalid = directInput.value !== '' && (!Number.isFinite(Number(directInput.value)) || Number(directInput.value) < 0);
      directInput.setAttribute('aria-invalid', String(invalid));
      const button = root.querySelector('[data-aux-direct-confirm]');
      if (button) {
        button.disabled = !preview.canSubmit;
        button.classList.toggle('btn-disabled', !preview.canSubmit);
      }
      const summary = root.querySelector('[data-aux-direct-summary]');
      if (summary) summary.textContent = `已填写 ${new Set(preview.selectedRows.map((row) => row.productCode)).size} 种商品`;
      const clearToggle = root.querySelector('[data-aux-direct-clear-toggle]');
      if (clearToggle) {
        clearToggle.disabled = !Object.values(draft).some((value) => String(value).trim() !== '');
        clearToggle.closest('.school-recipe-attendance-reset-dropdown')?.classList.toggle('is-disabled', clearToggle.disabled);
      }
      root.querySelectorAll('[data-aux-direct-clear]').forEach((item) => {
        item.disabled = item.dataset.auxDirectClear === 'meal'
          ? !preview.meals.find((meal) => meal.key === state.directMeal)?.rows.some((row) => hasDirectRowDraft(draft, row))
          : clearToggle?.disabled;
      });
      refreshDatePanel();
      return;
    }
    const input = event.target.closest('[data-person-type]');
    if (!input) return;
    const meal = meals[input.dataset.mealKey || state.meal];
    const value = input.value === '' ? '' : Math.min(100000, Math.max(0, Math.floor(Number(input.value || 0))));
    meal[input.dataset.personType] = value;
    input.value = value;
    if (!input.dataset.personType.startsWith('nonDining_')) {
      const empty = value === '' || value == null;
      input.classList.toggle('is-empty', state.highlightEmpty && empty);
      input.toggleAttribute('aria-invalid', state.highlightEmpty && empty);
    }
    persistDraft();
    refreshDatePanel();
    refreshMealTabs();
    const total = input.closest('tr')?.querySelector('[data-people-total]');
    if (total) total.innerHTML = `${configuredGroups.reduce((sum, participant) => sum + Number(valueForParticipant(meal, participant) || 0), 0)}`;
    rerenderRows();
    if (!input.dataset.personType.startsWith('nonDining_')) refreshOverview();
  });
})();
