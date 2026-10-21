(function () {
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
  const mealsWithoutRecipe = [
    { key: 'breakfast', name: '早餐' },
    { key: 'lunch', name: '午餐' },
    { key: 'dinner', name: '晚餐' }
  ];
  const mealDefinitionsForDate = (date) => (menuForDate(date)?.meals || mealsWithoutRecipe).map((meal) => ({
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

  const products = [
    { id: 'aux-oil', auxiliaryName: '油', name: '金龙鱼5L桶装油', brand: '金龙鱼', code: 'SP0300030', spec: '5L/桶', doseUnit: 'L', doseDisplay: '12 ml', purchaseUnit: '桶', category: ['食用油', '植物油', '大豆油'], packSize: 5, dose: 0.012 },
    { id: 'aux-salt', auxiliaryName: '盐', name: '食盐', brand: '—', code: 'SP0300031', spec: '500g/袋', doseUnit: 'kg', doseDisplay: '4 g', purchaseUnit: '袋', category: ['调味品', '食盐', '精制盐'], packSize: 0.5, dose: 0.004 },
    { id: 'aux-msg', auxiliaryName: '味精', name: '味精', brand: '—', code: 'SP0300032', spec: '250g/袋', doseUnit: 'kg', doseDisplay: '1 g', purchaseUnit: '袋', category: ['调味品', '香辛调味品', '味精'], packSize: 0.25, dose: 0.001 }
  ];

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
  const viewStorageKey = 'school-recipe-auxiliary-attendance-view-v1';
  const defaultModeKey = 'school-recipe-auxiliary-default-mode-v1';
  const savedDefaultMode = window.AppStorage?.read?.(defaultModeKey, 'people');
  const defaultMode = savedDefaultMode === 'quantity' ? 'quantity' : 'people';
  const pageParams = new URLSearchParams(window.location.search);
  const requestedMode = pageParams.get('mode');
  const initialMode = ['people', 'quantity'].includes(requestedMode) ? requestedMode : defaultMode;
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
  if (initialMode === 'people') persistDraft();

  const storedSelectedStorage = window.AppStorage?.read?.(selectedProductsStorageKey, {}) || {};
  const storedSelectedIds = Array.isArray(storedSelectedStorage[canteenScope]) ? storedSelectedStorage[canteenScope] : [];
  const initialSelectedIds = storedSelectedIds.length ? new Set(storedSelectedIds) : new Set(products.map((product) => product.id));
  const mealKeys = Object.keys(meals);
  const state = { meal: mealKeys.includes('lunch') ? 'lunch' : mealKeys[0] || '', directMeal: '', mode: initialMode, defaultMode, attendanceMode: 'dining', highlightEmpty: false, selected: products.filter((product) => initialSelectedIds.has(product.id)) };
  if (!state.selected.length) state.selected = products.slice();
  const persistSelectedProducts = () => {
    const next = window.AppStorage?.read?.(selectedProductsStorageKey, {}) || {};
    next[canteenScope] = state.selected.map((product) => product.id);
    window.AppStorage?.write?.(selectedProductsStorageKey, next);
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

  function dateStatus(date) {
    if (state.mode === 'quantity') {
      const preview = directPreview(date);
      return preview?.canSubmit ? 'complete' : preview?.selectedRows?.length ? 'partial' : 'empty';
    }
    if (!recipeDates.has(date)) {
      const draft = date === dateState.selectedDate ? meals : readDrafts()?.[canteenScope]?.[date];
      if (!draft?.__manual && date !== dateState.selectedDate) return 'empty';
      const values = mealDefinitionsForDate(date).flatMap((meal) => configuredGroups.map((participant) => valueForParticipant(draft?.[meal.key], participant)));
      const filled = values.filter((value) => value !== '' && value != null).length;
      return filled === 0 ? 'empty' : filled === values.length ? 'complete' : 'partial';
    }
    return attendanceService.status(menuForDate(date), auxiliaryRecordFor(date), auxiliaryServiceOptions()).key;
  }

  function renderCanteenBar() {
    const canteens = availableCanteens.length ? availableCanteens : [currentCanteen];
    return `<div class="school-recipe-canteen-switch" aria-label="当前食堂"><div class="school-recipe-canteen-tabs" role="tablist" aria-label="切换食堂">${canteens.map((canteen) => { const key = String(canteen.id || canteen.name); const active = key === String(currentCanteen.id || currentCanteen.name); return `<button type="button" class="school-recipe-canteen-tab${active ? ' is-active' : ''}" role="tab" aria-selected="${active}" data-aux-canteen="${escapeHtml(key)}">${escapeHtml(canteen.name)}</button>`; }).join('')}</div></div>`;
  }

  function renderOverview() {
    const total = totalDiningPeople();
    return `<div class="school-recipe-attendance-overview school-auxiliary-overview" id="schoolAuxiliaryOverview" aria-label="商品需求填报概况"><div class="school-recipe-attendance-overview-fields"><div class="school-recipe-attendance-overview-item school-recipe-attendance-date"><span>用料日期：</span><strong>${longDate(dateState.selectedDate)}</strong></div>${state.mode === 'people' ? `<div class="school-recipe-attendance-overview-item school-recipe-attendance-total"><span>实际就餐人次：</span><strong data-aux-overview-total>${total}</strong></div>` : ''}</div></div>`;
  }

  function renderModeSwitcher() {
    return `<div class="school-recipe-entry-switch" aria-label="商品需求填报方式"><div class="school-recipe-entry-options" role="tablist" aria-label="填报方式">${[
      ['people', '按就餐人数填报'], ['quantity', '按商品数量填报']
    ].map(([mode, label]) => `<button type="button" role="tab" aria-selected="${state.mode === mode}" class="school-recipe-entry-tab${state.mode === mode ? ' is-active' : ''}" data-aux-entry-mode="${mode}">${label}${state.defaultMode === mode ? '<span class="school-recipe-entry-default-mark">默认</span>' : ''}</button>`).join('')}</div><button type="button" class="school-recipe-entry-set-default" data-aux-entry-set-default${state.defaultMode === state.mode ? ' disabled' : ''}>设为默认</button></div>`;
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
      const week = status === 'empty' ? ' is-hidden' : '';
      return `<button type="button" class="school-recipe-attendance-date-item ${date === dateState.selectedDate ? 'is-selected' : ''} is-${status}" data-aux-date="${date}" title="${hasRecipe ? '有菜谱' : '可填报商品需求'}"><span class="school-recipe-attendance-date-number">${Number(date.slice(8, 10))}</span><span class="school-recipe-attendance-date-week${week}">${weekday(date)}</span></button>`;
    }).join('');
    return `<aside class="school-recipe-attendance-date-panel school-auxiliary-recipe-date-panel" aria-label="商品需求填报日期"><div class="school-recipe-attendance-panel-heading"><div class="school-recipe-attendance-calendar-actions"><button type="button" data-aux-month="prev" aria-label="上一个月" title="上一个月" ${canGoPrevious ? '' : 'disabled'}><svg class="icon-svg school-recipe-attendance-calendar-icon" viewBox="0 0 24 24" aria-hidden="true"><polyline points="15 18 9 12 15 6"></polyline></svg></button><span class="school-recipe-attendance-current-month">${monthLabel(dateState.monthStart)}</span><button type="button" data-aux-month="next" aria-label="下一个月" title="下一个月" ${canGoNext ? '' : 'disabled'}><svg class="icon-svg school-recipe-attendance-calendar-icon" viewBox="0 0 24 24" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg></button></div></div><div class="school-recipe-attendance-calendar-caption"><span>本月日期</span></div><div class="school-recipe-attendance-calendar-weekdays" aria-hidden="true">${weekdayNames.map((name) => `<span>${name}</span>`).join('')}</div><div class="school-recipe-attendance-date-list">${cells}</div></aside>`;
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
    if (!state.selected.length) return '<div class="school-auxiliary-empty">暂无辅料商品</div>';
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
      return `<tr><td>${index + 1}</td><td class="product-cell"><span class="product-display-text">${escapeHtml(product.auxiliaryName || product.name)}</span></td><td><span class="school-auxiliary-dose-value">${escapeHtml(product.doseDisplay || `${product.dose} ${product.doseUnit}`)}</span></td><td class="product-cell"><span class="product-display-text">${escapeHtml(displayProduct(product))}</span></td><td>${escapeHtml(product.code)}</td><td>是</td>${quantities.join('')}<td><button class="school-auxiliary-remove${state.selected.length <= 1 ? ' is-disabled' : ''}" type="button" data-remove-id="${escapeHtml(product.id)}" ${state.selected.length <= 1 ? 'disabled' : ''}>移除</button></td></tr>`;
    }).join('');
    return `<div class="school-auxiliary-table-wrap"><table class="school-auxiliary-table school-auxiliary-demand-table"><colgroup><col style="width:58px"><col style="width:150px"><col style="width:118px"><col style="width:220px"><col style="width:100px"><col style="width:88px">${demandColgroup}<col style="width:70px"></colgroup><thead><tr><th rowspan="2">序号</th><th rowspan="2">辅料</th><th rowspan="2">人均用量</th><th rowspan="2">商品</th><th rowspan="2">编号</th><th rowspan="2">是否标品</th>${demandColumns}<th rowspan="2">操作</th></tr><tr>${demandSubColumns}</tr></thead><tbody>${bodyRows}</tbody></table></div>`;
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

  function renderForm() {
    const mealTabs = shouldSplitOrderByMeal() ? `<div class="school-auxiliary-meal-tabs" role="tablist">${Object.entries(meals).map(([key, meal]) => `<button class="school-auxiliary-meal-tab ${key === state.meal ? 'is-active' : ''}" type="button" data-meal="${key}" role="tab" aria-selected="${key === state.meal}">${meal.name}</button>`).join('')}</div>` : '';
    return `<div class="school-auxiliary-scroll">${renderPeopleTable()}<div class="school-auxiliary-section-title"><span class="section-title-mark">需求测算</span><button class="btn btn-blue btn-sm school-auxiliary-restore-default" type="button" data-restore-default>恢复默认</button></div>${mealTabs}<div id="schoolAuxiliaryRows">${renderRows()}</div></div><footer class="school-auxiliary-footer"><div class="school-recipe-attendance-draft-actions"><div class="school-recipe-attendance-reset-dropdown"><button type="button" class="btn btn-sm school-recipe-attendance-reset-trigger" data-aux-reset-toggle aria-expanded="false" aria-haspopup="menu">重置<svg class="school-recipe-attendance-reset-chevron" viewBox="0 0 24 24" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg></button><div class="school-recipe-attendance-reset-menu" role="menu"><button type="button" role="menuitem" data-aux-reset="current">重置当前人数</button><button type="button" role="menuitem" data-aux-reset="all">重置全部人数</button></div></div><button type="button" class="btn btn-sm" data-fill-defaults>填写默认人数</button></div><div class="school-auxiliary-actions"><button class="btn btn-primary btn-sm" type="button" data-confirm-demand>确认需求</button></div></footer>`;
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
    const table = `<div class="school-auxiliary-table-wrap"><table class="school-auxiliary-table school-recipe-direct-table school-auxiliary-direct-table" style="min-width:${Math.max(780, 668 + (directParticipants.length || 1) * 140)}px"><colgroup><col style="width:58px"><col style="width:110px"><col style="width:300px"><col style="width:120px"><col style="width:80px">${quantityCols}</colgroup><thead><tr><th>序号</th><th>辅料</th><th>商品名称（计量单位/品牌/规格）</th><th>商品编号</th><th>单位</th>${quantityHeaders}</tr></thead><tbody>${rows}</tbody></table></div>`;
    const clearMenu = `<div class="school-recipe-attendance-reset-dropdown${hasDateValues ? '' : ' is-disabled'}"><button type="button" class="btn btn-sm school-recipe-attendance-reset-trigger" data-aux-direct-clear-toggle aria-expanded="false" aria-haspopup="menu"${hasDateValues ? '' : ' disabled'}>清空数量<svg class="school-recipe-attendance-reset-chevron" viewBox="0 0 24 24" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg></button><div class="school-recipe-attendance-reset-menu" role="menu"><button type="button" role="menuitem" data-aux-direct-clear="meal"${hasMealValues ? '' : ' disabled'}>清空当前餐次数量</button><button type="button" role="menuitem" data-aux-direct-clear="date"${hasDateValues ? '' : ' disabled'}>清空当前日期数量</button></div></div>`;
    return `<div class="school-auxiliary-scroll school-auxiliary-direct-scroll"><div class="school-recipe-attendance-section-heading school-recipe-direct-heading"><span class="section-title-mark">填写采购量</span><p>无需采购时采购量填 0 或不填</p></div>${tabs}${table}</div><footer class="school-auxiliary-footer school-auxiliary-direct-footer"><div class="school-recipe-direct-footer-left">${clearMenu}<span data-aux-direct-summary>已填写 ${filledProducts} 种商品</span></div><button type="button" class="btn btn-primary btn-sm${preview.canSubmit ? '' : ' btn-disabled'}" data-aux-direct-confirm${preview.canSubmit ? '' : ' disabled'}>需求确认</button></footer>`;
  }

  function renderDetail() {
    return state.mode === 'quantity' ? renderDirectForm() : renderForm();
  }

  function renderPage() {
    return `<section class="page-card school-auxiliary-page" id="schoolAuxiliaryPage">${renderModeSwitcher()}<div class="school-auxiliary-body">${renderDatePanel()}<main class="school-auxiliary-detail">${renderCanteenBar()}${renderOverview()}${renderDetail()}</main></div></section>`;
  }

  const root = window.AppShell.mount({ title: '商品需求填报', variant: 'school', content: renderPage(), emptyText: '商品需求填报' });
  const rerenderPage = () => {
    const page = root.querySelector('#schoolAuxiliaryPage');
    if (page) page.outerHTML = renderPage();
  };
  const rerenderRows = () => { const rows = root.querySelector('#schoolAuxiliaryRows'); if (rows) rows.innerHTML = renderRows(); };
  const refreshPeopleTable = () => { const section = root.querySelector('.school-auxiliary-people-section'); if (section) section.outerHTML = renderPeopleTable(); };
  const refreshOverview = () => { const overview = root.querySelector('#schoolAuxiliaryOverview'); if (overview) overview.outerHTML = renderOverview(); };
  const refreshDatePanel = () => { const panel = root.querySelector('.school-auxiliary-recipe-date-panel'); if (panel) panel.outerHTML = renderDatePanel(); };

  root.addEventListener('click', (event) => {
    if (event.target.closest('[data-aux-entry-set-default]')) {
      state.defaultMode = state.mode;
      window.AppStorage?.write?.(defaultModeKey, state.defaultMode);
      rerenderPage();
      showToast('已设为默认填报方式');
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
      if (state.mode === 'people') persistDraft();
      state.mode = nextMode;
      state.directMeal = '';
      rerenderPage();
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
      window.location.href = `./school-recipe-auxiliary-demand-confirm.html?mode=quantity&date=${encodeURIComponent(dateState.selectedDate)}&canteen=${encodeURIComponent(canteenScope)}`;
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
    if (event.target.closest('[data-restore-default]')) {
      state.selected = products.slice();
      persistSelectedProducts();
      rerenderRows();
      return;
    }
    const remove = event.target.closest('[data-remove-id]');
    if (remove && state.selected.length > 1) {
      state.selected = state.selected.filter((product) => product.id !== remove.dataset.removeId);
      persistSelectedProducts();
      rerenderRows();
      return;
    }
    if (event.target.closest('[data-confirm-demand]')) {
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

  root.addEventListener('input', (event) => {
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
    const total = input.closest('tr')?.querySelector('[data-people-total]');
    if (total) total.innerHTML = `${configuredGroups.reduce((sum, participant) => sum + Number(valueForParticipant(meal, participant) || 0), 0)}`;
    if (!input.dataset.personType.startsWith('nonDining_')) {
      rerenderRows();
      refreshOverview();
    }
  });
})();
