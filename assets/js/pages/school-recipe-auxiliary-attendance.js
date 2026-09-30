(function () {
  const attendanceService = window.SchoolRecipeAttendanceService;
  const canteenConfig = window.SchoolCanteenConfigService;
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
    snack: '加餐'
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
    const hasSnackMeal = dateMeals.some((meal) => meal.key === 'snack');
    const hasDinnerMeal = dateMeals.some((meal) => meal.key === 'dinner');
    if (!hasSnackMeal || hasDinnerMeal || Object.prototype.hasOwnProperty.call(source, 'snack') || !source.dinner) return source;
    return { ...source, snack: source.dinner };
  };
  const recipeDateList = [...recipeDates].sort();
  const firstDate = recipeDateList[0] || '2026-09-29';
  const draftStorageKey = 'school-recipe-auxiliary-attendance-drafts-v1';
  const selectedProductsStorageKey = 'school-recipe-auxiliary-selected-products-v1';
  const viewStorageKey = 'school-recipe-auxiliary-attendance-view-v1';
  const canteenScope = String(currentCanteen.id || currentCanteen.name || '第一食堂');
  const availableCanteens = (canteenConfig?.readCanteens?.() || []).filter((canteen) => canteen && canteen.name && canteen.name !== '默认');
  const readDrafts = () => window.AppStorage?.read?.(draftStorageKey, {}) || {};
  const normalizeMonthStart = (value) => {
    const match = String(value || '').trim().match(/^(\d{4})[-/](\d{1,2})/);
    return match ? `${match[1]}-${String(match[2]).padStart(2, '0')}-01` : '';
  };
  const storedView = window.AppStorage?.read?.(viewStorageKey, {})?.[canteenScope] || {};
  const requestedDate = normalizeRecipeDate(new URLSearchParams(window.location.search).get('date'));
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
  if (menuForDate(dateState.selectedDate)) persistDraft();

  const storedSelectedStorage = window.AppStorage?.read?.(selectedProductsStorageKey, {}) || {};
  const storedSelectedIds = Array.isArray(storedSelectedStorage[canteenScope]) ? storedSelectedStorage[canteenScope] : [];
  const initialSelectedIds = storedSelectedIds.length ? new Set(storedSelectedIds) : new Set(products.map((product) => product.id));
  const mealKeys = Object.keys(meals);
  const state = { meal: mealKeys.includes('lunch') ? 'lunch' : mealKeys[0] || '', attendanceMode: 'dining', highlightEmpty: false, selected: products.filter((product) => initialSelectedIds.has(product.id)) };
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
    if (!recipeDates.has(date)) return 'no-menu';
    return attendanceService.status(menuForDate(date), auxiliaryRecordFor(date), auxiliaryServiceOptions()).key;
  }

  function renderCanteenBar() {
    const canteens = availableCanteens.length ? availableCanteens : [currentCanteen];
    return `<div class="school-recipe-canteen-switch" aria-label="当前食堂"><div class="school-recipe-canteen-tabs" role="tablist" aria-label="切换食堂">${canteens.map((canteen) => { const key = String(canteen.id || canteen.name); const active = key === String(currentCanteen.id || currentCanteen.name); return `<button type="button" class="school-recipe-canteen-tab${active ? ' is-active' : ''}" role="tab" aria-selected="${active}" data-aux-canteen="${escapeHtml(key)}">${escapeHtml(canteen.name)}</button>`; }).join('')}</div></div>`;
  }

  function renderOverview() {
    const total = menuForDate(dateState.selectedDate) ? totalDiningPeople() : 0;
    return `<div class="school-recipe-attendance-overview school-auxiliary-overview" id="schoolAuxiliaryOverview" aria-label="辅料需求填报概况"><div class="school-recipe-attendance-overview-fields"><div class="school-recipe-attendance-overview-item school-recipe-attendance-date"><span>用料日期：</span><strong>${longDate(dateState.selectedDate)}</strong></div><div class="school-recipe-attendance-overview-item school-recipe-attendance-total"><span>实际就餐人次：</span><strong data-aux-overview-total>${total}</strong></div></div></div>`;
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
      return `<button type="button" class="school-recipe-attendance-date-item ${date === dateState.selectedDate ? 'is-selected' : ''} is-${status}" data-aux-date="${date}" title="${hasRecipe ? '有菜谱' : '无菜谱'}"><span class="school-recipe-attendance-date-number">${Number(date.slice(8, 10))}</span><span class="school-recipe-attendance-date-week${week}">${weekday(date)}</span></button>`;
    }).join('');
    return `<aside class="school-recipe-attendance-date-panel school-auxiliary-recipe-date-panel" aria-label="辅料需求填报日期"><div class="school-recipe-attendance-panel-heading"><div class="school-recipe-attendance-calendar-actions"><button type="button" data-aux-month="prev" aria-label="上一个月" title="上一个月" ${canGoPrevious ? '' : 'disabled'}><svg class="icon-svg school-recipe-attendance-calendar-icon" viewBox="0 0 24 24" aria-hidden="true"><polyline points="15 18 9 12 15 6"></polyline></svg></button><span class="school-recipe-attendance-current-month">${monthLabel(dateState.monthStart)}</span><button type="button" data-aux-month="next" aria-label="下一个月" title="下一个月" ${canGoNext ? '' : 'disabled'}><svg class="icon-svg school-recipe-attendance-calendar-icon" viewBox="0 0 24 24" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg></button></div></div><div class="school-recipe-attendance-calendar-caption"><span>本月菜谱</span></div><div class="school-recipe-attendance-calendar-weekdays" aria-hidden="true">${weekdayNames.map((name) => `<span>${name}</span>`).join('')}</div><div class="school-recipe-attendance-date-list">${cells}</div></aside>`;
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

  function renderDetail() {
    return menuForDate(dateState.selectedDate)
      ? renderForm()
      : '<div class="school-recipe-attendance-detail-empty"><div class="operation-empty-icon"><svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg></div><p>请选择有菜谱的日期</p></div>';
  }

  function renderPage() {
    return `<section class="page-card school-auxiliary-page" id="schoolAuxiliaryPage"><div class="school-auxiliary-body">${renderDatePanel()}<main class="school-auxiliary-detail">${renderCanteenBar()}${renderOverview()}${renderDetail()}</main></div></section>`;
  }

  const root = window.AppShell.mount({ title: '辅料需求填报', variant: 'school', content: renderPage(), emptyText: '辅料需求填报' });
  const rerenderPage = () => {
    const page = root.querySelector('#schoolAuxiliaryPage');
    if (page) page.outerHTML = renderPage();
  };
  const rerenderRows = () => { const rows = root.querySelector('#schoolAuxiliaryRows'); if (rows) rows.innerHTML = renderRows(); };
  const refreshPeopleTable = () => { const section = root.querySelector('.school-auxiliary-people-section'); if (section) section.outerHTML = renderPeopleTable(); };
  const refreshOverview = () => { const overview = root.querySelector('#schoolAuxiliaryOverview'); if (overview) overview.outerHTML = renderOverview(); };
  const refreshDatePanel = () => { const panel = root.querySelector('.school-auxiliary-recipe-date-panel'); if (panel) panel.outerHTML = renderDatePanel(); };

  root.addEventListener('click', (event) => {
    const canteenButton = event.target.closest('[data-aux-canteen]');
    if (canteenButton) {
      window.AppStorage?.write?.('school-recipe-auxiliary-current-canteen', canteenButton.dataset.auxCanteen);
      window.location.reload();
      return;
    }
    const dateButton = event.target.closest('[data-aux-date]');
    if (dateButton) {
      persistDraft();
      dateState.selectedDate = dateButton.dataset.auxDate;
      meals = createMealsForDate(dateState.selectedDate);
      state.meal = Object.keys(meals).includes('lunch') ? 'lunch' : Object.keys(meals)[0] || '';
      state.attendanceMode = 'dining';
      state.highlightEmpty = false;
      loadDraft(dateState.selectedDate);
      if (menuForDate(dateState.selectedDate)) persistDraft();
      persistView();
      rerenderPage();
      return;
    }
    const monthButton = event.target.closest('[data-aux-month]');
    if (monthButton && !monthButton.disabled) {
      persistDraft();
      const nextMonth = shiftMonth(dateState.monthStart, monthButton.dataset.auxMonth === 'prev' ? -1 : 1);
      dateState.monthStart = nextMonth;
      const dates = monthDates(nextMonth);
      if (!dates.includes(dateState.selectedDate)) dateState.selectedDate = dates.find((date) => recipeDates.has(date)) || dates[0];
      meals = createMealsForDate(dateState.selectedDate);
      state.meal = Object.keys(meals).includes('lunch') ? 'lunch' : Object.keys(meals)[0] || '';
      state.attendanceMode = 'dining';
      state.highlightEmpty = false;
      loadDraft(dateState.selectedDate);
      if (menuForDate(dateState.selectedDate)) persistDraft();
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
      window.location.href = `./school-recipe-auxiliary-demand-confirm.html?date=${encodeURIComponent(dateState.selectedDate)}&canteen=${encodeURIComponent(canteenScope)}`;
    }
  });

  root.addEventListener('input', (event) => {
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
