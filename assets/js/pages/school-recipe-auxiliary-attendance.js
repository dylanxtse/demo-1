(function () {
  const attendanceService = window.SchoolRecipeAttendanceService;
  const canteenConfig = window.SchoolCanteenConfigService;
  let currentCanteen = canteenConfig?.getCanteen?.(window.AppStorage?.read?.('school-recipe-auxiliary-current-canteen', '第一食堂')) || { name: '第一食堂' };
  let configuredParticipants = attendanceService?.participantsFor?.(currentCanteen) || [];
  const participantMatches = (participant, label) => label === '学生'
    ? participant.label === '学生' || participant.tagName === '学生'
    : participant.label === '教师' || participant.tagName === '教师' || participant.tagName === '教职工';
  const defaultPeople = (mealKey, label) => configuredParticipants
    .filter((participant) => participantMatches(participant, label))
    .reduce((total, participant) => total + (participant.defaultPeople?.[mealKey] === '' ? 0 : Number(participant.defaultPeople?.[mealKey] || 0)), 0);
  const defaultValue = (mealKey, label) => configuredParticipants.some((participant) => participantMatches(participant, label) && participant.defaultPeople?.[mealKey] !== '')
    ? defaultPeople(mealKey, label)
    : '';
  const meals = {
    breakfast: { name: '早餐', student: defaultValue('breakfast', '学生'), teacher: defaultValue('breakfast', '教师') },
    lunch: { name: '午餐', student: defaultValue('lunch', '学生'), teacher: defaultValue('lunch', '教师') },
    dinner: { name: '晚餐', student: defaultValue('dinner', '学生'), teacher: defaultValue('dinner', '教师') }
  };
  const participantKey = (label) => label === '学生' ? 'student' : label === '教师' || label === '教职工' ? 'teacher' : `participant_${String(label || '人员').replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '')}`;
  const participantLabels = () => [...new Set(configuredParticipants.map((participant) => participant.label || participant.tagName).filter(Boolean))];
  const defaultPeopleForLabel = (mealKey, label) => configuredParticipants
    .filter((participant) => (participant.label || participant.tagName) === label)
    .reduce((total, participant) => total + (participant.defaultPeople?.[mealKey] === '' ? 0 : Number(participant.defaultPeople?.[mealKey] || 0)), 0);
  participantLabels().filter((label) => label !== '学生' && label !== '教师' && label !== '教职工').forEach((label) => {
    Object.entries(meals).forEach(([key, meal]) => { meal[participantKey(label)] = defaultPeopleForLabel(key, label); meal[`nonDining_${participantKey(label)}`] = ''; });
  });
  Object.values(meals).forEach((meal) => {
    meal.nonDiningStudent = '';
    meal.nonDiningTeacher = '';
  });
  const products = [
    { id: 'aux-oil', auxiliaryName: '油', name: '金龙鱼5L桶装油', brand: '金龙鱼', code: 'SP0300030', spec: '5L/桶', doseUnit: 'L', doseDisplay: '12 ml', purchaseUnit: '桶', category: ['食用油', '植物油', '大豆油'], packSize: 5, dose: 0.012 },
    { id: 'aux-salt', auxiliaryName: '盐', name: '食盐', brand: '—', code: 'SP0300031', spec: '500g/袋', doseUnit: 'kg', doseDisplay: '4 g', purchaseUnit: '袋', category: ['调味品', '食盐', '精制盐'], packSize: 0.5, dose: 0.004 },
    { id: 'aux-msg', auxiliaryName: '味精', name: '味精', brand: '—', code: 'SP0300032', spec: '250g/袋', doseUnit: 'kg', doseDisplay: '1 g', purchaseUnit: '袋', category: ['调味品', '香辛调味品', '味精'], packSize: 0.25, dose: 0.001 }
  ];
  const selectedProductsStorageKey = 'school-recipe-auxiliary-selected-products-v1';
  const storedSelectedProducts = window.AppStorage?.read?.(selectedProductsStorageKey, {}) || {};
  const recipeMenus = window.SchoolRecipeService?.getAll?.() || [];
  const recipeDates = new Set(recipeMenus.map((menu) => String(menu.date)));
  const recipeDateList = [...recipeDates].sort();
  const dateState = { selectedDate: recipeDateList[0] || '2026-09-29', monthStart: `${(recipeDateList[0] || '2026-09-29').slice(0, 7)}-01` };
  const draftStorageKey = 'school-recipe-auxiliary-attendance-drafts-v1';
  const shouldSplitOrderByMeal = () => {
    const value = window.DemoStore?.getSettings?.()?.splitOrderByMeal;
    return value !== false && value !== 'false' && value !== 0 && value !== '0';
  };
  let canteenScope = String(currentCanteen.id || currentCanteen.name || '第一食堂');
  const availableCanteens = (canteenConfig?.readCanteens?.() || []).filter((canteen) => canteen && canteen.name && canteen.name !== '默认');
  const readDrafts = () => window.AppStorage?.read?.(draftStorageKey, {}) || {};
  const persistDraft = () => {
    const drafts = readDrafts();
    if (!drafts[canteenScope]) drafts[canteenScope] = {};
    drafts[canteenScope][dateState.selectedDate] = Object.fromEntries(Object.entries(meals).map(([key, meal]) => [key, Object.fromEntries(participantLabels().flatMap((label) => {
      const participantField = participantKey(label);
      return [[participantField, meal[participantField]], [`nonDining_${participantField}`, meal[`nonDining_${participantField}`]]];
    }))]));
    window.AppStorage?.write?.(draftStorageKey, drafts);
  };
  const loadDraft = (date) => {
    Object.entries(meals).forEach(([key, meal]) => {
      meal.student = defaultValue(key, '学生');
      meal.teacher = defaultValue(key, '教师');
      meal.nonDiningStudent = '';
      meal.nonDiningTeacher = '';
      participantLabels().filter((label) => label !== '学生' && label !== '教师' && label !== '教职工').forEach((label) => {
        const participantField = participantKey(label);
        meal[participantField] = defaultPeopleForLabel(key, label);
        meal[`nonDining_${participantField}`] = '';
      });
    });
    const draft = readDrafts()?.[canteenScope]?.[date];
    if (!draft) return false;
    Object.entries(meals).forEach(([key, meal]) => {
      if (!draft[key]) return;
      [...participantLabels().flatMap((label) => [participantKey(label), `nonDining_${participantKey(label)}`]), 'student', 'teacher', 'nonDiningStudent', 'nonDiningTeacher'].forEach((field) => {
        if (draft[key][field] !== undefined) meal[field] = draft[key][field];
      });
    });
    return true;
  };
  loadDraft(dateState.selectedDate);
  const state = { meal: 'lunch', attendanceMode: 'dining', selected: products.filter((product) => (storedSelectedProducts[canteenScope] || ['aux-oil', 'aux-salt']).includes(product.id)), modalPage: 1, modalPageSize: 2, modalSelected: null, modalFilters: { keyword: '', category: '' } };
  const persistSelectedProducts = () => { const next = window.AppStorage?.read?.(selectedProductsStorageKey, {}) || {}; next[canteenScope] = state.selected.map((product) => product.id); window.AppStorage?.write?.(selectedProductsStorageKey, next); };
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const amount = (value) => Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false });
  const people = () => meals[state.meal];
  const weekdayNames = ['日', '一', '二', '三', '四', '五', '六'];
  const parseDate = (value) => new Date(`${String(value)}T00:00:00`);
  const dateValue = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const monthDates = (start) => { const date = parseDate(start); const total = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate(); return Array.from({ length: total }, (_, index) => dateValue(new Date(date.getFullYear(), date.getMonth(), index + 1))); };
  const monthLabel = (start) => `${start.slice(0, 4)}年${start.slice(5, 7)}月`;
  const shiftMonth = (start, offset) => { const date = parseDate(start); date.setMonth(date.getMonth() + offset); return dateValue(new Date(date.getFullYear(), date.getMonth(), 1)); };
  const weekday = (date) => weekdayNames[parseDate(date).getDay()];
  const longDate = (date) => `${date.slice(0, 4)}年${date.slice(5, 7)}月${date.slice(8, 10)}日 星期${weekday(date)}`;
  const totalDiningPeople = () => Object.values(meals).reduce((total, meal) => total + participantLabels().reduce((mealTotal, label) => mealTotal + Number(meal[participantKey(label)] || 0), 0), 0);

  function dateStatus(date) {
    if (!recipeDates.has(date)) return 'no-menu';
    const draft = readDrafts()?.[canteenScope]?.[date];
    if (!draft || !participantLabels().length) return 'empty';
    const fields = Object.values(draft).flatMap((meal) => participantLabels().map((label) => meal?.[participantKey(label)]));
    const filled = fields.filter((value) => value !== '' && value != null).length;
    if (!filled) return 'empty';
    return filled === fields.length ? 'complete' : 'partial';
  }

  function renderOverview() {
    return `<div class="school-recipe-attendance-overview school-auxiliary-overview" id="schoolAuxiliaryOverview" aria-label="辅料需求填报概况"><div class="school-recipe-attendance-overview-fields"><div class="school-recipe-attendance-overview-item school-recipe-attendance-date"><span>用料日期：</span><strong>${longDate(dateState.selectedDate)}</strong></div><div class="school-recipe-attendance-overview-item school-recipe-attendance-total"><span>实际就餐人次：</span><strong data-aux-overview-total>${totalDiningPeople()}</strong></div></div></div>`;
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
      return `<button type="button" class="school-recipe-attendance-date-item ${date === dateState.selectedDate ? 'is-selected' : ''} is-${status}" data-aux-date="${date}" title="${hasRecipe ? (status === 'complete' ? '已填报' : status === 'partial' ? '部分填报' : '待填报') : '无菜谱'}"><span class="school-recipe-attendance-date-number">${Number(date.slice(8, 10))}</span><span class="school-recipe-attendance-date-week${status === 'empty' || status === 'no-menu' ? ' is-hidden' : ''}">${weekday(date)}</span></button>`;
    }).join('');
    return `<aside class="school-recipe-attendance-date-panel school-auxiliary-recipe-date-panel" aria-label="辅料需求填报日期"><div class="school-recipe-attendance-panel-heading"><div class="school-recipe-attendance-calendar-actions"><button type="button" data-aux-month="prev" aria-label="上一个月" title="上一个月" ${canGoPrevious ? '' : 'disabled'}><svg class="icon-svg school-recipe-attendance-calendar-icon" viewBox="0 0 24 24" aria-hidden="true"><polyline points="15 18 9 12 15 6"></polyline></svg></button><span class="school-recipe-attendance-current-month">${monthLabel(dateState.monthStart)}</span><button type="button" data-aux-month="next" aria-label="下一个月" title="下一个月" ${canGoNext ? '' : 'disabled'}><svg class="icon-svg school-recipe-attendance-calendar-icon" viewBox="0 0 24 24" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg></button></div></div><div class="school-recipe-attendance-calendar-caption"><span>本月菜谱</span></div><div class="school-recipe-attendance-calendar-weekdays" aria-hidden="true">${weekdayNames.map((name) => `<span>${name}</span>`).join('')}</div><div class="school-recipe-attendance-date-list">${cells}</div></aside>`;
  }

  function rowData(product) {
    const currentPeople = people();
    const purchaseInProductUnit = (quantity) => product.packSize ? Math.ceil(quantity / product.packSize) * product.packSize : quantity;
    const participantRows = participantLabels().map((label) => {
      const key = participantKey(label);
      const demandQty = Number(currentPeople[key] || 0) * Number(product.dose || 0);
      return { label, key, demandQty, purchaseQty: purchaseInProductUnit(demandQty) };
    });
    const totalQty = participantRows.reduce((sum, row) => sum + row.demandQty, 0);
    return {
      participantRows,
      totalQty,
      totalPurchaseQty: purchaseInProductUnit(totalQty)
    };
  }

  function renderRows() {
    if (!state.selected.length) return '<div class="school-auxiliary-empty">暂无辅料商品，请点击右上角“恢复默认”显示全部辅料商品</div>';
    const displayProduct = (product) => `${product.name}（${product.doseUnit || '--'}/${product.brand || '--'}/${product.spec || '--'}）`;
    const splitByPersonType = (() => {
      const value = window.DemoStore?.getSettings?.()?.splitOrderByPersonType;
      return value === true || value === 'true' || value === 1 || value === '1';
    })();
    const groups = participantLabels().map((label) => ({ label, key: participantKey(label) }));
    const demandColumns = splitByPersonType
      ? groups.map((group) => {
        const participant = configuredParticipants.find((item) => (item.label || item.tagName) === group.label);
        return `<th colspan="2">${escapeHtml(`${group.label} - ${participant?.nutritious || '不区分'}`)}</th>`;
      }).join('')
      : '<th colspan="2">合计</th>';
    const demandSubColumns = splitByPersonType
      ? groups.map(() => '<th>需求量</th><th>采购量</th>').join('')
      : '<th>需求量</th><th>采购量</th>';
    const demandColgroup = (splitByPersonType ? groups : [{}]).map(() => '<col style="width:126px"><col style="width:112px">').join('');
    const bodyRows = state.selected.map((product, index) => {
      const data = rowData(product);
      const quantities = splitByPersonType
        ? data.participantRows.flatMap((row) => [`<td class="number">${amount(row.demandQty)} ${escapeHtml(product.doseUnit)}</td>`, `<td class="number">${amount(row.purchaseQty)} ${escapeHtml(product.doseUnit)}</td>`])
        : [`<td class="number">${amount(data.totalQty)} ${escapeHtml(product.doseUnit)}</td>`, `<td class="number">${amount(data.totalPurchaseQty)} ${escapeHtml(product.doseUnit)}</td>`];
      return `<tr><td>${index + 1}</td><td class="product-cell"><span class="product-display-text">${escapeHtml(product.auxiliaryName || product.name)}</span></td><td><span class="school-auxiliary-dose-value">${escapeHtml(product.doseDisplay || `${product.dose} ${product.doseUnit}`)}</span></td><td class="product-cell"><span class="product-display-text">${escapeHtml(displayProduct(product))}</span></td><td>${escapeHtml(product.code)}</td><td>是</td>${quantities.join('')}<td><button class="school-auxiliary-remove" type="button" data-remove-id="${escapeHtml(product.id)}">移除</button></td></tr>`;
    }).join('');
    return `<div class="school-auxiliary-table-wrap"><table class="school-auxiliary-table school-auxiliary-demand-table"><colgroup><col style="width:58px"><col style="width:150px"><col style="width:118px"><col style="width:220px"><col style="width:100px"><col style="width:88px">${demandColgroup}<col style="width:70px"></colgroup><thead><tr><th rowspan="2">序号</th><th rowspan="2">辅料</th><th rowspan="2">人均用量</th><th rowspan="2">商品</th><th rowspan="2">编号</th><th rowspan="2">是否标品</th>${demandColumns}<th rowspan="2">操作</th></tr><tr>${demandSubColumns}</tr></thead><tbody>${bodyRows}</tbody></table></div>`;
  }

  function renderPeopleTable() {
    const isNonDining = state.attendanceMode === 'non-dining';
    const groups = participantLabels().map((label) => ({ label, key: participantKey(label) }));
    const personHeaders = groups.length
      ? groups.map((group) => {
        const participant = configuredParticipants.find((item) => (item.label || item.tagName) === group.label);
        const tagLabel = `${group.label} - ${participant?.nutritious || '不区分'}`;
        return `<th>${escapeHtml(tagLabel)}</th>`;
      }).join('')
      : '<th class="school-recipe-attendance-no-participant">暂无启用人员类型</th>';
    const rows = Object.entries(meals).map(([key, meal]) => {
      const total = groups.reduce((sum, group) => sum + Number(meal[group.key] || 0), 0);
      const personCells = groups.map((group) => {
        const diningValue = meal[group.key] ?? '';
        const nonDiningValue = meal[`nonDining_${group.key}`] ?? '';
        const diningInput = `<div class="school-recipe-attendance-table-input"><input class="school-recipe-attendance-count-input" type="number" min="0" max="100000" step="1" inputmode="numeric" value="${escapeHtml(diningValue)}" placeholder="请输入" data-person-type="${group.key}" data-meal-key="${key}" aria-label="${meal.name}${group.label}人数"><i>人</i></div>`;
        if (!isNonDining) {
          const nonDiningSummary = Number(nonDiningValue) > 0 ? `<small class="school-recipe-attendance-person-non-dining-summary">含不就餐${Number(nonDiningValue)}人</small>` : '';
          return `<td>${diningInput}${nonDiningSummary}</td>`;
        }
        const diningDisplayValue = diningValue === '' || diningValue == null ? '--' : `${Number(diningValue)} 人`;
        return `<td><div class="school-recipe-attendance-person-cell is-non-dining-mode"><div class="school-recipe-attendance-person-count-display"><span>总人数</span><strong>${escapeHtml(diningDisplayValue)}</strong></div><div class="school-recipe-attendance-person-count-item"><span>不就餐</span><div class="school-recipe-attendance-table-input school-recipe-attendance-non-dining-input"><input type="number" min="0" max="${Number(diningValue) || 100000}" step="1" inputmode="numeric" value="${escapeHtml(nonDiningValue)}" placeholder="0" data-person-type="nonDining_${group.key}" data-meal-key="${key}" aria-label="${meal.name}${group.label}不就餐人数"><i>人</i></div></div></div></td>`;
      }).join('');
      return `<tr><td class="school-recipe-attendance-meal-name"><strong>${meal.name}</strong></td>${personCells || '<td class="school-recipe-attendance-no-participant-cell">请先在食堂运营设置中启用人员类型</td>'}<td class="school-recipe-attendance-meal-total-cell"><strong data-people-total>${total}</strong><i>人</i></td></tr>`;
    }).join('');
    return `<div class="school-auxiliary-people-section"><div class="school-recipe-attendance-section-heading school-auxiliary-people-heading"><div><span class="section-title-mark">餐次总人数</span>${isNonDining ? '' : '<span class="school-recipe-attendance-count-tip">无人员就餐请填写为0</span>'}</div><button type="button" class="btn btn-sm school-recipe-attendance-mode-action${isNonDining ? ' btn-primary' : ''}" data-aux-attendance-mode-toggle>${isNonDining ? '保存' : '填写不就餐人数'}</button></div><div class="school-recipe-attendance-meal-table-wrap school-auxiliary-people-table-wrap"><table class="school-recipe-attendance-meal-table school-auxiliary-people-table"><colgroup><col class="col-meal">${groups.map(() => '<col class="col-person">').join('')}<col class="col-meal-total"></colgroup><thead><tr><th rowspan="2">餐次</th><th colspan="${Math.max(1, groups.length)}">总人数</th><th rowspan="2">本餐合计</th></tr><tr>${personHeaders}</tr></thead><tbody>${rows}</tbody></table></div></div>`;
  }

  function renderModal() {
    const selectedIds = state.modalSelected || new Set(state.selected.map((item) => item.id));
    const filters = state.modalFilters;
    const categoryOptions = [...new Map(products.flatMap((product) => product.category.map((_, index) => product.category.slice(0, index + 1))).map((path) => [path.join(' / '), path])).values()];
    const selectedCategory = filters.category ? filters.category.split('|') : [];
    const filteredProducts = products.filter((product) => {
      const keyword = filters.keyword.trim().toLowerCase();
      return (!keyword || `${product.name} ${product.code}`.toLowerCase().includes(keyword))
        && (!selectedCategory.length || selectedCategory.every((item, index) => product.category[index] === item));
    });
    const pages = Math.max(1, Math.ceil(filteredProducts.length / state.modalPageSize));
    state.modalPage = Math.min(Math.max(1, state.modalPage), pages);
    const start = (state.modalPage - 1) * state.modalPageSize;
    const visibleProducts = filteredProducts.slice(start, start + state.modalPageSize);
    const pageButtons = Array.from({ length: pages }, (_, index) => index + 1).map((page) => `<button class="school-auxiliary-page-button ${page === state.modalPage ? 'is-active' : ''}" type="button" data-modal-page="${page}" ${page === state.modalPage ? 'aria-current="page"' : ''}>${page}</button>`).join('');
    // 保留完整分类路径作为筛选值，仅按分类树层级显示当前节点名称，避免每项重复一二三级分类。
    const selectOptions = (options, value, placeholder) => `<option value="" disabled hidden${value ? '' : ' selected'}>${placeholder}</option>${options.map((path) => { const optionValue = path.join('|'); const label = `${'　'.repeat(path.length - 1)}${path[path.length - 1]}`; return `<option value="${escapeHtml(optionValue)}" ${optionValue === value ? 'selected' : ''}>${escapeHtml(label)}</option>`; }).join('')}`;
    const allVisibleSelected = visibleProducts.length > 0 && visibleProducts.every((product) => selectedIds.has(product.id));
    return `<div class="school-auxiliary-modal-backdrop" data-modal hidden><section class="school-auxiliary-modal" role="dialog" aria-modal="true" aria-label="选择辅料商品"><header class="school-auxiliary-modal-header"><h3>选择辅料商品</h3><button class="school-auxiliary-modal-close" type="button" data-close-modal aria-label="关闭">×</button></header><div class="school-auxiliary-modal-body"><div class="school-auxiliary-product-filters"><label><span>商品名称</span><input type="search" value="${escapeHtml(filters.keyword)}" placeholder="请输入商品名称/编号" data-modal-filter="keyword"></label><label><span>商品分类</span><select data-modal-filter="category">${selectOptions(categoryOptions, filters.category, '请选择分类')}</select></label><div class="school-auxiliary-filter-actions"><button class="btn btn-primary btn-sm" type="button" data-modal-query>查询</button><button class="btn btn-sm" type="button" data-modal-reset>重置</button></div></div><div class="school-auxiliary-product-list-wrap"><table class="school-auxiliary-product-list"><colgroup><col class="col-select"><col class="col-name"><col class="col-category"><col class="col-code"><col class="col-spec"><col class="col-unit"></colgroup><thead><tr><th><input type="checkbox" data-modal-select-all aria-label="全选当前页" ${allVisibleSelected ? 'checked' : ''}></th><th>辅料商品</th><th>商品分类</th><th>商品编号</th><th>规格</th><th>采购单位</th></tr></thead><tbody>${visibleProducts.length ? visibleProducts.map((product) => `<tr><td><input type="checkbox" value="${escapeHtml(product.id)}" data-product-checkbox aria-label="选择${escapeHtml(product.name)}" ${selectedIds.has(product.id) ? 'checked' : ''}></td><td class="product-list-name">${escapeHtml(product.name)}</td><td class="product-list-category">${product.category.map(escapeHtml).join(' / ')}</td><td>${escapeHtml(product.code)}</td><td>${escapeHtml(product.spec)}</td><td>${escapeHtml(product.purchaseUnit)}</td></tr>`).join('') : '<tr><td colspan="6" class="school-auxiliary-no-results">暂无符合条件的商品</td></tr>'}</tbody></table></div><div class="school-auxiliary-pagination"><span>共 ${filteredProducts.length} 条数据</span><div class="school-auxiliary-page-buttons"><button class="school-auxiliary-page-button" type="button" data-modal-page="${Math.max(1, state.modalPage - 1)}" ${state.modalPage === 1 ? 'disabled' : ''}>‹</button>${pageButtons}<button class="school-auxiliary-page-button" type="button" data-modal-page="${Math.min(pages, state.modalPage + 1)}" ${state.modalPage === pages ? 'disabled' : ''}>›</button></div><label class="school-auxiliary-page-jump">跳至 <input value="${state.modalPage}" readonly aria-label="跳转页码"> / ${pages} 页</label></div></div><footer class="school-auxiliary-modal-footer"><button class="btn btn-sm" type="button" data-close-modal>取消</button><button class="btn btn-primary btn-sm" type="button" data-confirm-products>确定</button></footer></section></div>`;
  }

  function render() {
    const current = people();
    const totalPeople = Number(current.student || 0) + Number(current.teacher || 0);
    const mealTabs = shouldSplitOrderByMeal() ? `<div class="school-auxiliary-meal-tabs" role="tablist">${Object.entries(meals).map(([key, meal]) => `<button class="school-auxiliary-meal-tab ${key === state.meal ? 'is-active' : ''}" type="button" data-meal="${key}">${meal.name}</button>`).join('')}</div>` : '';
    return `<section class="page-card school-auxiliary-page" id="schoolAuxiliaryPage"><div class="school-auxiliary-topbar"><span class="school-recipe-attendance-overview-label">当前食堂</span><div class="school-auxiliary-canteen-tabs"><button class="school-auxiliary-canteen-tab is-active" type="button">第一食堂</button><button class="school-auxiliary-canteen-tab" type="button">第二食堂</button></div></div><div class="school-auxiliary-body">${renderDatePanel()}<main class="school-auxiliary-detail"><div class="school-auxiliary-scroll"><div class="school-auxiliary-heading"><div><h2>辅料需求填报</h2><p>辅料商品由学校直接选择，人数在本页面独立填写并自动计算用量。</p></div><button class="btn btn-blue btn-sm school-auxiliary-restore-default" type="button" data-restore-default>恢复默认</button></div>${mealTabs}<div class="school-auxiliary-people"><div class="school-auxiliary-people-card"><span>学生人数</span><div class="school-auxiliary-people-input-wrap"><input class="school-auxiliary-people-input" type="number" min="0" step="1" value="${current.student}" data-person-type="student"><em>人</em></div></div><div class="school-auxiliary-people-card"><span>教师人数</span><div class="school-auxiliary-people-input-wrap"><input class="school-auxiliary-people-input" type="number" min="0" step="1" value="${current.teacher}" data-person-type="teacher"><em>人</em></div></div><div class="school-auxiliary-people-card"><span>本餐合计人数</span><strong data-total-people>${totalPeople}<em>人</em></strong></div></div><div class="school-auxiliary-section-title"><span class="section-title-mark">需求测算</span><span>需求量 = 本页填写人数 × 每人用量</span></div><div id="schoolAuxiliaryRows">${renderRows()}</div></div><footer class="school-auxiliary-footer"><div class="school-recipe-attendance-draft-actions"><div class="school-recipe-attendance-reset-dropdown"><button type="button" class="btn btn-sm school-recipe-attendance-reset-trigger" data-aux-reset-toggle aria-expanded="false" aria-haspopup="menu">重置<svg class="school-recipe-attendance-reset-chevron" viewBox="0 0 24 24" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg></button><div class="school-recipe-attendance-reset-menu" role="menu"><button type="button" role="menuitem" data-aux-reset="current">重置当前人数</button><button type="button" role="menuitem" data-aux-reset="all">重置全部人数</button></div></div><button type="button" class="btn btn-sm" data-fill-defaults>填写默认人数</button></div><div class="school-auxiliary-actions"><button class="btn btn-primary btn-sm" type="button" data-confirm-demand>确认需求</button></div></footer></main></div>${renderModal()}</section>`;
  }

  const root = window.AppShell.mount({ title: '辅料需求填报', variant: 'school', content: render(), emptyText: '辅料需求填报' });
  root.querySelector('.school-auxiliary-heading h2')?.remove();
  root.querySelector('.school-auxiliary-heading p')?.remove();
  const canteenBar = root.querySelector('.school-auxiliary-topbar');
  const detailPanel = root.querySelector('.school-auxiliary-detail');
  if (canteenBar && detailPanel) {
    canteenBar.className = 'school-recipe-canteen-switch';
    canteenBar.setAttribute('aria-label', '当前食堂');
    canteenBar.innerHTML = `<div class="school-recipe-canteen-tabs" role="tablist" aria-label="切换食堂">${(availableCanteens.length ? availableCanteens : [currentCanteen]).map((canteen) => { const active = String(canteen.id || canteen.name) === String(currentCanteen.id || currentCanteen.name); return `<button type="button" class="school-recipe-canteen-tab${active ? ' is-active' : ''}" role="tab" aria-selected="${active}" data-aux-canteen="${escapeHtml(canteen.id || canteen.name)}">${escapeHtml(canteen.name)}</button>`; }).join('')}</div>`;
    detailPanel.prepend(canteenBar);
    canteenBar.insertAdjacentHTML('afterend', renderOverview());
  }
  const demandSectionTitle = root.querySelector('.school-auxiliary-section-title');
  const demandTip = demandSectionTitle?.querySelector('span:last-child');
  const restoreDefaultButton = root.querySelector('[data-restore-default]');
  demandTip?.remove();
  if (demandSectionTitle && restoreDefaultButton) demandSectionTitle.append(restoreDefaultButton);
  root.querySelector('.school-auxiliary-heading')?.remove();
  const peopleCards = root.querySelector('.school-auxiliary-people');
  const initialMealTabs = root.querySelector('.school-auxiliary-meal-tabs');
  const demandRows = root.querySelector('#schoolAuxiliaryRows');
  if (peopleCards && demandRows) {
    initialMealTabs?.remove();
    peopleCards.outerHTML = renderPeopleTable();
    if (shouldSplitOrderByMeal()) {
      const demandMealTabs = document.createElement('div');
      demandMealTabs.className = 'school-auxiliary-meal-tabs';
      demandMealTabs.setAttribute('role', 'tablist');
      demandMealTabs.innerHTML = Object.entries(meals).map(([key, meal]) => `<button class="school-auxiliary-meal-tab ${key === state.meal ? 'is-active' : ''}" type="button" data-meal="${key}" role="tab" aria-selected="${key === state.meal}">${meal.name}</button>`).join('');
      demandRows.before(demandMealTabs);
    }
  }
  const rerenderRows = () => { const container = root.querySelector('#schoolAuxiliaryRows'); if (container) container.innerHTML = renderRows(); };
  const refreshDatePanel = () => { const panel = root.querySelector('.school-auxiliary-recipe-date-panel'); if (panel) panel.outerHTML = renderDatePanel(); };
  const refreshOverview = () => { const overview = root.querySelector('#schoolAuxiliaryOverview'); if (overview) overview.outerHTML = renderOverview(); };
  const refreshPeopleTable = () => { const section = root.querySelector('.school-auxiliary-people-section'); if (section) section.outerHTML = renderPeopleTable(); };
  const refreshModal = (show = true) => { const currentModal = root.querySelector('[data-modal]'); if (!currentModal) return; currentModal.outerHTML = renderModal(); const modal = root.querySelector('[data-modal]'); if (show) modal.hidden = false; };
  const navigateToAuxiliaryConfirm = () => {
    persistDraft();
    window.location.href = `./school-recipe-auxiliary-demand-confirm.html?date=${encodeURIComponent(dateState.selectedDate)}&canteen=${encodeURIComponent(canteenScope)}`;
  };
  root.addEventListener('click', (event) => {
    const canteenButton = event.target.closest('[data-aux-canteen]');
    if (canteenButton) {
      window.AppStorage?.write?.('school-recipe-auxiliary-current-canteen', canteenButton.dataset.auxCanteen);
      window.location.reload();
      return;
    }
    const dateButton = event.target.closest('[data-aux-date]');
    if (dateButton) { persistDraft(); state.attendanceMode = 'dining'; dateState.selectedDate = dateButton.dataset.auxDate; const hasDraft = loadDraft(dateState.selectedDate); if (recipeDates.has(dateState.selectedDate) && !hasDraft) persistDraft(); refreshDatePanel(); refreshPeopleTable(); refreshOverview(); rerenderRows(); return; }
    const monthButton = event.target.closest('[data-aux-month]');
    if (monthButton && !monthButton.disabled) { persistDraft(); state.attendanceMode = 'dining'; const nextMonth = shiftMonth(dateState.monthStart, monthButton.dataset.auxMonth === 'prev' ? -1 : 1); dateState.monthStart = nextMonth; const monthDatesInView = monthDates(nextMonth); if (!monthDatesInView.includes(dateState.selectedDate)) dateState.selectedDate = monthDatesInView.find((date) => recipeDates.has(date)) || monthDatesInView[0]; loadDraft(dateState.selectedDate); refreshDatePanel(); refreshPeopleTable(); refreshOverview(); rerenderRows(); return; }
    if (event.target.closest('[data-aux-reset-toggle]')) { const dropdown = event.target.closest('.school-recipe-attendance-reset-dropdown'); dropdown?.classList.toggle('is-open'); return; }
    const resetAction = event.target.closest('[data-aux-reset]')?.dataset.auxReset;
    if (resetAction) {
      if (resetAction === 'all') {
        const drafts = readDrafts();
        delete drafts[canteenScope];
        window.AppStorage?.write?.(draftStorageKey, drafts);
      }
      Object.entries(meals).forEach(([key, meal]) => {
        meal.student = '';
        meal.teacher = '';
        meal.nonDiningStudent = '';
        meal.nonDiningTeacher = '';
        Object.keys(meal).filter((field) => field.startsWith('nonDining_')).forEach((field) => { meal[field] = ''; });
        participantLabels().filter((label) => label !== '学生' && label !== '教师' && label !== '教职工').forEach((label) => {
          const participantField = participantKey(label);
          meal[participantField] = '';
          meal[`nonDining_${participantField}`] = '';
        });
      });
      state.attendanceMode = 'dining';
      persistDraft();
      refreshDatePanel();
      refreshPeopleTable();
      refreshOverview();
      rerenderRows();
      return;
    }
    if (event.target.closest('[data-fill-defaults]')) {
      Object.entries(meals).forEach(([key, meal]) => {
        meal.student = defaultValue(key, '学生');
        meal.teacher = defaultValue(key, '教师');
        meal.nonDiningStudent = '';
        meal.nonDiningTeacher = '';
        Object.keys(meal).filter((field) => field.startsWith('nonDining_')).forEach((field) => { meal[field] = ''; });
        participantLabels().filter((label) => label !== '学生' && label !== '教师' && label !== '教职工').forEach((label) => {
          const participantField = participantKey(label);
          meal[participantField] = defaultPeopleForLabel(key, label);
          meal[`nonDining_${participantField}`] = '';
        });
      });
      persistDraft();
      refreshDatePanel();
      refreshPeopleTable();
      refreshOverview();
      rerenderRows();
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
    if (meal) { state.meal = meal.dataset.meal; root.querySelectorAll('[data-meal]').forEach((button) => { button.classList.toggle('is-active', button.dataset.meal === state.meal); button.setAttribute('aria-selected', String(button.dataset.meal === state.meal)); }); rerenderRows(); return; }
    if (event.target.closest('[data-restore-default]')) { state.selected = products.slice(); persistSelectedProducts(); rerenderRows(); return; }
    if (event.target.closest('[data-open-modal]')) { state.modalPage = 1; state.modalSelected = new Set(state.selected.map((item) => item.id)); state.modalFilters = { keyword: '', category: '' }; refreshModal(); return; }
    if (event.target.closest('[data-close-modal]')) { root.querySelector('[data-modal]').hidden = true; return; }
    if (event.target.closest('[data-modal-query]')) { state.modalPage = 1; refreshModal(); return; }
    if (event.target.closest('[data-modal-reset]')) { state.modalPage = 1; state.modalFilters = { keyword: '', category: '' }; refreshModal(); return; }
    const page = event.target.closest('[data-modal-page]');
    if (page && !page.disabled) { state.modalPage = Number(page.dataset.modalPage); refreshModal(); return; }
    if (event.target.closest('[data-confirm-products]')) { state.selected = products.filter((product) => state.modalSelected.has(product.id)); persistSelectedProducts(); root.querySelector('[data-modal]').hidden = true; rerenderRows(); return; }
    const remove = event.target.closest('[data-remove-id]');
    if (remove) { state.selected = state.selected.filter((product) => product.id !== remove.dataset.removeId); persistSelectedProducts(); rerenderRows(); return; }
    if (event.target.closest('[data-clear-products]')) { if (!state.selected.length) return; state.selected = []; persistSelectedProducts(); rerenderRows(); return; }
    if (event.target.closest('[data-confirm-demand]')) {
      navigateToAuxiliaryConfirm();
    }
  });
  root.addEventListener('change', (event) => { const filter = event.target.closest('[data-modal-filter]'); if (filter) { state.modalFilters[filter.dataset.modalFilter] = filter.value; state.modalPage = 1; refreshModal(); return; } if (event.target.matches('[data-modal-select-all]')) { root.querySelectorAll('[data-product-checkbox]').forEach((checkbox) => { checkbox.checked = event.target.checked; state.modalSelected.set(checkbox.value, event.target.checked); }); refreshModal(); return; } if (!event.target.matches('[data-product-checkbox]')) return; state.modalSelected.set(event.target.value, event.target.checked); });
  root.addEventListener('input', (event) => { const filter = event.target.closest('[data-modal-filter="keyword"]'); if (filter) { state.modalFilters.keyword = filter.value; return; } const input = event.target.closest('[data-person-type]'); if (!input) return; const meal = meals[input.dataset.mealKey || state.meal]; const value = input.value === '' ? '' : Math.min(100000, Math.max(0, Math.floor(Number(input.value || 0)))); meal[input.dataset.personType] = value; input.value = value; persistDraft(); refreshDatePanel(); const total = input.closest('tr')?.querySelector('[data-people-total]'); if (total) total.innerHTML = `${participantLabels().reduce((sum, label) => sum + Number(meal[participantKey(label)] || 0), 0)}`; if (!input.dataset.personType.startsWith('nonDining_')) { rerenderRows(); refreshOverview(); } });
  root.addEventListener('input', (event) => { const input = event.target.closest('[data-dose-id]'); if (!input) return; const product = products.find((item) => item.id === input.dataset.doseId); if (product) { product.dose = Math.max(0, Number(input.value || 0)); rerenderRows(); } });
})();
