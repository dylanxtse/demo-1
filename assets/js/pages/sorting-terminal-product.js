(function () {
  const params = new URLSearchParams(window.location.search);
  const mealStorageKey = 'sorting-terminal-meal-filter:v1';
  let mealKeys = params.has('meal') ? params.getAll('meal') : null;
  if (!mealKeys) {
    try {
      const saved = JSON.parse(sessionStorage.getItem(mealStorageKey));
      if (Array.isArray(saved)) mealKeys = saved;
    } catch (_) { /* Direct access still uses the default meal selection. */ }
  }
  const meals = window.OrderMealOptions;
  const selectedMealKeys = new Set(meals
    .filter((meal) => mealKeys === null || mealKeys.includes(meal.key))
    .map((meal) => meal.key));
  const mealCycle = meals.map((meal) => meal.key);
  const categories = [
    { key: 'all', label: '全部' },
    { key: 'staple', label: '主食（米面粉点心）' },
    { key: 'oil', label: '食用油' },
    { key: 'produce', label: '果蔬' },
    { key: 'meat', label: '肉（豆）制品' },
    { key: 'seafood', label: '水产品' },
    { key: 'egg', label: '蛋奶类' },
    { key: 'seasoning', label: '调料' },
    { key: 'other', label: '其他材料' }
  ];
  const leafTasks = [
    ['菠菜', 0], ['水晶西瓜', 2], ['西蓝花', 5], ['茄子', 5], ['宽豆角', 5], ['线茄', 5], ['西葫芦', 0],
    ['芹菜', 0], ['西红柿', 0], ['西蓝花', 0], ['大葱', 5], ['生姜', 5], ['大蒜', 5], ['西葫芦', 0],
    ['丝瓜', 0, 'SP000002'], ['花生', 2, 'SP000006'], ['毛豆', 5, 'SP000001'],
    ['空心菜', 5, 'SP000011'], ['韭菜', 4, 'SP000015'], ['蒜薹', 0, 'SP000014'], ['西葫芦', 0, 'SP000010']
  ].map(([name, sorted, code], index) => ({
    name, code: code || '', unit: '斤', stock: 102, sorted, total: 5,
    mealKey: mealCycle[index % mealCycle.length], taskIndex: index
  }));
  const rootProducts = [
    ['土豆', 'SP0300040'], ['胡萝卜', 'SP0300053'], ['白萝卜', ''],
    ['红薯', ''], ['山药', ''], ['莲藕', ''], ['芋头', '']
  ];
  const rootTasks = leafTasks.map((sample, index) => ({
    ...sample,
    name: rootProducts[index % rootProducts.length][0],
    code: index >= 14 ? rootProducts[index % rootProducts.length][1] : '',
    taskIndex: index
  }));
  // These local prototype records include meal assignments so this filter can be exercised before live tasks are connected.
  const groups = [
    { key: 'root', label: '果蔬类-根茎类', category: 'produce', products: [['土豆', 'SP0300040'], ['胡萝卜', 'SP0300053']], tasks: rootTasks },
    { key: 'fruit', label: '果蔬类-水果类', category: 'produce', products: [['苹果', 'SP0300014'], ['香蕉', 'SP0300015']], mealKeys: ['breakfast', 'lunch'] },
    { key: 'pepper', label: '果蔬类-辣椒类', category: 'produce', products: [['青椒', 'SP0300056'], ['青椒丝', 'SP0300057']], mealKeys: ['lunch', 'dinner'] },
    { key: 'staple', label: '主食（米面粉点心类）', category: 'staple', products: [['大米', 'SP0300025'], ['黑大米', 'SP0300034'], ['大饼', 'SP0300023']], mealKeys: ['breakfast', 'lunch', 'eveningSnack'] },
    { key: 'plant-oil', label: '食用油-植物油', category: 'oil', products: [['金龙鱼5L桶装油', 'SP0300030'], ['金龙鱼豆油', 'SP0300017']], mealKeys: ['lunch', 'eveningSnack'] },
    { key: 'animal-oil', label: '食用油-动物油', category: 'oil', products: [] },
    { key: 'eggs', label: '蛋奶类-蛋类', category: 'egg', products: [['鸡蛋', 'SP0300018']], mealKeys: ['breakfast'] },
    { key: 'leaf', label: '果蔬类-叶菜类', category: 'produce', products: [], tasks: leafTasks },
    { key: 'milk', label: '蛋奶类-奶类', category: 'egg', products: [['牛奶', 'SP0300037'], ['三元牛奶', 'SP0300024']], mealKeys: ['morningSnack', 'afternoonSnack'] },
    { key: 'fish', label: '水产品-鱼类', category: 'seafood', products: [['鲫鱼', 'SP0300029'], ['净膛鲫鱼', 'SP0300031']], mealKeys: ['dinner', 'eveningSnack'] },
    { key: 'shrimp', label: '水产品-虾类', category: 'seafood', products: [] },
    { key: 'seasoning', label: '调料类', category: 'seasoning', products: [] },
    { key: 'meat', label: '肉（豆）制品', category: 'meat', products: [['鸡腿肉', 'SP0300013']], mealKeys: ['lunch'] },
    { key: 'other', label: '其他材料', category: 'other', products: [['面粉', 'SP0300016']], mealKeys: ['eveningSnack'] }
  ];
  const categoryRoot = document.getElementById('sortingTerminalProductCategories');
  const groupRoot = document.getElementById('sortingTerminalProductGroups');
  const keywordInput = document.getElementById('sortingTerminalProductKeyword');
  const categoryToggle = document.getElementById('sortingTerminalProductCategoryToggle');
  const mealFilter = document.getElementById('sortingTerminalProductMealFilter');
  const mealTrigger = document.getElementById('sortingTerminalProductMealTrigger');
  const mealSummary = document.getElementById('sortingTerminalProductMealSummary');
  const mealMenu = document.getElementById('sortingTerminalProductMealMenu');
  const mealAll = document.getElementById('sortingTerminalProductMealAll');
  const mealOptionsRoot = document.getElementById('sortingTerminalProductMealOptions');
  const mealCheckboxes = meals.map((meal) => {
    const label = document.createElement('label');
    label.className = 'sorting-terminal-product-meal-option';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = meal.key;
    const name = document.createElement('span');
    name.textContent = meal.label;
    label.append(input, name);
    mealOptionsRoot.append(label);
    return input;
  });
  const expanded = new Set();
  const returnGroup = params.get('expand');
  if (groups.some((group) => group.key === returnGroup)) expanded.add(returnGroup);
  let selectedCategory = 'all';
  let showAllCategories = false;

  function tasksFor(group) {
    if (group.tasks) return group.tasks;
    return group.products.map(([name, code], index) => ({
      name, code, unit: '斤', stock: 102, sorted: [0, 2, 5][index % 3], total: 5,
      mealKey: group.mealKeys?.[index] || mealCycle[index % mealCycle.length], taskIndex: index
    }));
  }

  function taskMatchesMeals(task) {
    return selectedMealKeys.has(task.mealKey);
  }

  function tasksForSelectedMeals(group) {
    return tasksFor(group).filter(taskMatchesMeals);
  }

  function updateMealSummary() {
    const selected = meals.filter((meal) => selectedMealKeys.has(meal.key));
    const allSelected = selected.length === meals.length;
    mealAll.checked = allSelected;
    mealAll.indeterminate = selected.length > 0 && !allSelected;
    mealCheckboxes.forEach((input) => { input.checked = selectedMealKeys.has(input.value); });
    mealSummary.textContent = allSelected ? '全部餐次'
      : selected.length ? selected.map((meal) => meal.label).join('、') : '请选择餐次';
    mealTrigger.title = mealSummary.textContent;
  }

  function persistMealSelection() {
    const selected = meals.filter((meal) => selectedMealKeys.has(meal.key));
    try {
      sessionStorage.setItem(mealStorageKey, JSON.stringify(selected.map((meal) => meal.key)));
    } catch (_) { /* The current page keeps the selection in memory. */ }
    try {
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.delete('meal');
      selected.forEach((meal) => nextUrl.searchParams.append('meal', meal.key));
      window.history?.replaceState?.(null, '', `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
    } catch (_) { /* The current selection still filters this page. */ }
  }

  function closeMealMenu() {
    mealMenu.hidden = true;
    mealTrigger.setAttribute('aria-expanded', 'false');
  }

  mealTrigger.addEventListener('click', () => {
    mealMenu.hidden = !mealMenu.hidden;
    mealTrigger.setAttribute('aria-expanded', String(!mealMenu.hidden));
  });
  mealMenu.addEventListener('change', (event) => {
    if (event.target === mealAll) {
      selectedMealKeys.clear();
      if (mealAll.checked) meals.forEach((meal) => selectedMealKeys.add(meal.key));
    } else if (mealCheckboxes.includes(event.target)) {
      if (event.target.checked) selectedMealKeys.add(event.target.value);
      else selectedMealKeys.delete(event.target.value);
    } else return;
    updateMealSummary();
    persistMealSelection();
    if (selectedCategory !== 'all'
      && !groups.some((group) => group.category === selectedCategory && tasksForSelectedMeals(group).length > 0)) {
      selectedCategory = 'all';
    }
    groupRoot.scrollTop = 0;
    renderCategories();
    renderGroups();
  });
  document.addEventListener('click', (event) => {
    if (!mealFilter.contains(event.target)) closeMealMenu();
  });
  mealFilter.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeMealMenu();
      mealTrigger.focus();
    }
  });
  mealFilter.addEventListener('focusout', (event) => {
    if (!mealFilter.contains(event.relatedTarget)) closeMealMenu();
  });
  updateMealSummary();
  persistMealSelection();

  function renderCategories() {
    const visibleCategories = categories.filter((category) => category.key === 'all' || showAllCategories
      || groups.some((group) => group.category === category.key && tasksForSelectedMeals(group).length > 0));
    categoryRoot.replaceChildren(...visibleCategories.map((category) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `sorting-terminal-product-category${selectedCategory === category.key ? ' is-active' : ''}`;
      button.dataset.category = category.key;
      button.textContent = category.label;
      button.setAttribute('aria-current', selectedCategory === category.key ? 'true' : 'false');
      return button;
    }));
  }

  function matches(group, keyword) {
    return !keyword || group.label.toLowerCase().includes(keyword) || tasksForSelectedMeals(group).some((task) =>
      task.name.toLowerCase().includes(keyword) || task.code.toLowerCase().includes(keyword)
    );
  }

  function taskCard(task, group, index) {
    const taskId = `${group.key}:${task.taskIndex ?? index}`;
    let completed = task.sorted;
    try {
      const saved = JSON.parse(localStorage.getItem(`sorting-terminal-item:v1:${taskId}`));
      if (Array.isArray(saved?.doneIds)) {
        const doneCount = new Set(saved.doneIds.filter((id) => Number.isInteger(id) && id >= 0 && id < 24)).size;
        completed = doneCount === 0 ? 0 : doneCount === 24 ? task.total
          : Math.min(task.total - 1, Math.max(1, Math.ceil(doneCount / 24 * task.total)));
      }
    } catch (_) { /* Keep the sample progress if storage is unavailable. */ }
    const state = completed === 0 ? 'pending' : completed >= task.total ? 'done' : 'partial';
    const stateLabel = state === 'pending' ? '未分拣' : state === 'done' ? '已分拣' : '部分分拣';
    const card = document.createElement('a');
    card.className = `sorting-terminal-product-task is-${state}`;
    card.setAttribute('aria-label', `${task.name}，${stateLabel}，分拣进度 ${completed}/${task.total}`);
    const productCode = task.code || group.products.find(([name]) => name === task.name)?.[1] || '';
    const detailUrl = new URL('./sorting-terminal-item.html', window.location.href);
    detailUrl.searchParams.set('name', task.name);
    detailUrl.searchParams.set('code', productCode);
    detailUrl.searchParams.set('stock', String(task.stock));
    detailUrl.searchParams.set('unit', task.unit);
    detailUrl.searchParams.set('sorted', String(completed));
    detailUrl.searchParams.set('total', String(task.total));
    detailUrl.searchParams.set('group', group.key);
    detailUrl.searchParams.set('task', taskId);
    if (task.mealKey) detailUrl.searchParams.set('taskMeal', task.mealKey);
    meals.filter((meal) => selectedMealKeys.has(meal.key)).forEach((meal) => detailUrl.searchParams.append('meal', meal.key));
    card.href = detailUrl.href;
    const status = document.createElement('div');
    status.className = 'sorting-terminal-product-task-status';
    status.textContent = `${stateLabel}（库存：${task.stock}${task.unit}）`;
    const body = document.createElement('div');
    body.className = 'sorting-terminal-product-task-body';
    const name = document.createElement('div');
    name.textContent = `商品名称：${task.name}`;
    const detail = document.createElement('div');
    detail.textContent = task.code ? `商品编码：${task.code}` : `计量单位：${task.unit}`;
    body.append(name, detail);
    const progress = document.createElement('div');
    progress.className = 'sorting-terminal-product-task-progress';
    progress.textContent = `分拣进度：${completed}/${task.total}`;
    card.append(status, body, progress);
    return card;
  }

  function renderGroups() {
    const keyword = keywordInput.value.trim().toLowerCase();
    const visible = groups.filter((group) => (showAllCategories || tasksForSelectedMeals(group).length > 0)
      && (selectedCategory === 'all' || group.category === selectedCategory) && matches(group, keyword));
    groupRoot.replaceChildren();
    if (!visible.length) {
      const empty = document.createElement('p');
      empty.className = 'sorting-terminal-product-empty';
      empty.textContent = selectedMealKeys.size ? '暂无匹配的商品分类' : '请选择至少一个餐次';
      groupRoot.append(empty);
      return;
    }

    visible.forEach((group) => {
      const section = document.createElement('section');
      section.className = 'sorting-terminal-product-group';
      const heading = document.createElement('div');
      heading.className = 'sorting-terminal-product-group-heading';
      const title = document.createElement('div');
      title.className = 'sorting-terminal-product-group-title';
      title.textContent = group.label;
      const action = document.createElement('div');
      action.className = 'sorting-terminal-product-group-action';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'sorting-terminal-product-expand';
      button.dataset.group = group.key;
      button.setAttribute('aria-expanded', String(expanded.has(group.key)));
      button.textContent = expanded.has(group.key) ? '−  收起' : '＋  展开';
      action.append(button);
      heading.append(title, action);
      const items = document.createElement('div');
      items.className = 'sorting-terminal-product-items';
      items.id = `sortingTerminalTasks-${group.key}`;
      items.hidden = !expanded.has(group.key);
      button.setAttribute('aria-controls', items.id);
      const groupTasks = tasksForSelectedMeals(group);
      groupTasks
        .filter((task) => !keyword || group.label.toLowerCase().includes(keyword)
          || task.name.toLowerCase().includes(keyword) || task.code.toLowerCase().includes(keyword))
        .forEach((task) => items.append(taskCard(task, group, groupTasks.indexOf(task))));
      if (!items.childElementCount) {
        const empty = document.createElement('div');
        empty.className = 'sorting-terminal-product-task-empty';
        empty.textContent = selectedMealKeys.size ? '暂无符合餐次的分拣任务' : '请选择至少一个餐次';
        items.append(empty);
      }
      section.append(heading, items);
      groupRoot.append(section);
    });
  }

  categoryToggle.addEventListener('click', () => {
    showAllCategories = !showAllCategories;
    categoryToggle.textContent = showAllCategories ? '查看分拣任务分类' : '查看全部分类';
    categoryToggle.setAttribute('aria-pressed', String(showAllCategories));
    if (!showAllCategories && selectedCategory !== 'all'
      && !groups.some((group) => group.category === selectedCategory && tasksForSelectedMeals(group).length > 0)) {
      selectedCategory = 'all';
    }
    groupRoot.scrollTop = 0;
    renderCategories();
    renderGroups();
  });
  categoryRoot.addEventListener('click', (event) => {
    const button = event.target.closest('[data-category]');
    if (!button) return;
    selectedCategory = button.dataset.category;
    groupRoot.scrollTop = 0;
    renderCategories();
    renderGroups();
  });
  groupRoot.addEventListener('click', (event) => {
    const button = event.target.closest('[data-group]');
    if (!button) return;
    const isExpanded = !expanded.has(button.dataset.group);
    if (isExpanded) expanded.add(button.dataset.group);
    else expanded.delete(button.dataset.group);
    button.setAttribute('aria-expanded', String(isExpanded));
    button.textContent = isExpanded ? '−  收起' : '＋  展开';
    document.getElementById(`sortingTerminalTasks-${button.dataset.group}`).hidden = !isExpanded;
  });
  keywordInput.addEventListener('input', renderGroups);
  document.getElementById('sortingTerminalProductSearch').addEventListener('submit', (event) => {
    event.preventDefault();
    renderGroups();
  });
  renderCategories();
  renderGroups();
})();
