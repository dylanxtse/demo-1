(function () {
  const params = new URLSearchParams(window.location.search);
  const mealStorageKey = 'sorting-terminal-meal-filter:v1';
  const meals = window.OrderMealOptions || [];
  const mealCycle = meals.map((meal) => meal.key);
  let requestedMealKeys = params.has('meal') ? params.getAll('meal') : null;
  if (!requestedMealKeys) {
    try {
      const saved = JSON.parse(sessionStorage.getItem(mealStorageKey));
      if (Array.isArray(saved)) requestedMealKeys = saved;
    } catch (_) { /* Direct access defaults to all meals. */ }
  }
  const selectedMealKeys = new Set(meals
    .filter((meal) => requestedMealKeys === null || requestedMealKeys.includes(meal.key))
    .map((meal) => meal.key));
  // Local demo customers rotate meal assignments until the live order feed exposes them.
  const customers = [
    { code: 'YF001', name: '宜丰县十一中', canteen: '第一食堂', sorted: 0, total: 5, route: 'east' },
    { code: 'YF002', name: '宜丰一中', canteen: '第一食堂', sorted: 2, total: 5, route: 'east' },
    { code: 'YF003', name: '宜丰三中', canteen: '第一食堂', sorted: 5, total: 5, route: 'east' },
    { code: 'YF004', name: '宜丰第一实验小学', canteen: '第一食堂', sorted: 5, total: 5, route: 'east' },
    { code: 'YF005', name: '宜丰特教', canteen: '第一食堂', sorted: 5, total: 5, route: 'east' },
    { code: 'YF006', name: '宜丰五小', canteen: '第一食堂', sorted: 5, total: 5, route: 'east' },
    { code: 'YF007', name: '宜丰四中', canteen: '第一食堂', sorted: 5, total: 5, route: 'east' },
    { code: 'YF008', name: '宜丰五中', canteen: '第一食堂', sorted: 5, total: 5, route: 'east' },
    { code: 'YF009', name: '宜丰三中', canteen: '第一食堂', sorted: 5, total: 5, route: 'west' },
    { code: 'YF010', name: '宜丰第二实验小学', canteen: '第一食堂', sorted: 5, total: 5, route: 'west' },
    { code: 'YF011', name: '宜丰一幼', canteen: '第一食堂', sorted: 5, total: 5, route: 'west' },
    { code: 'YF012', name: '宜丰二幼', canteen: '第一食堂', sorted: 0, total: 5, route: 'west' },
    { code: 'YF013', name: '宜丰九中', canteen: '第一食堂', sorted: 2, total: 5, route: 'west' }
  ].map((customer, index) => ({
    ...customer,
    mealKey: mealCycle.length ? mealCycle[index % mealCycle.length] : ''
  }));

  const keywordInput = document.getElementById('sortingTerminalCustomerKeyword');
  const routeInput = document.getElementById('sortingTerminalCustomerRoute');
  const mealFilter = document.getElementById('sortingTerminalCustomerMealFilter');
  const mealTrigger = document.getElementById('sortingTerminalCustomerMealTrigger');
  const mealSummary = document.getElementById('sortingTerminalCustomerMealSummary');
  const mealMenu = document.getElementById('sortingTerminalCustomerMealMenu');
  const mealAll = document.getElementById('sortingTerminalCustomerMealAll');
  const mealOptionsRoot = document.getElementById('sortingTerminalCustomerMealOptions');
  const mealCheckboxes = meals.map((meal) => {
    const label = document.createElement('label');
    label.className = 'sorting-terminal-customer-meal-option';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = meal.key;
    const name = document.createElement('span');
    name.textContent = meal.label;
    label.append(input, name);
    mealOptionsRoot.append(label);
    return input;
  });
  const grid = document.getElementById('sortingTerminalCustomerGrid');
  const feedback = document.getElementById('sortingTerminalCustomerFeedback');
  const back = document.getElementById('sortingTerminalCustomerBack');
  let selectedCode = '';

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

  function updateBackUrl() {
    const target = new URL('./sorting-terminal-home.html', window.location.href);
    meals.filter((meal) => selectedMealKeys.has(meal.key))
      .forEach((meal) => target.searchParams.append('meal', meal.key));
    back.href = target.href;
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
    updateBackUrl();
  }

  function currentSorted(customer) {
    try {
      const saved = JSON.parse(localStorage.getItem(`sorting-terminal-customer:v1:${customer.code}`));
      if (Array.isArray(saved?.doneIds)) {
        const done = new Set(saved.doneIds.filter((id) => Number.isInteger(id) && id >= 0 && id < 13)).size;
        return done === 0 ? 0 : done === 13 ? customer.total
          : Math.min(customer.total - 1, Math.max(1, Math.ceil(done / 13 * customer.total)));
      }
    } catch (_) { /* Use the sample progress when storage is unavailable. */ }
    return customer.sorted;
  }

  function render() {
    const keyword = keywordInput.value.trim().toLocaleLowerCase('zh-CN');
    const route = routeInput.value;
    const visible = customers.filter((customer) =>
      selectedMealKeys.has(customer.mealKey)
      && (route === 'all' || customer.route === route)
      && (!keyword || `${customer.name} ${customer.code}`.toLocaleLowerCase('zh-CN').includes(keyword))
    );

    grid.replaceChildren();
    if (!visible.length) {
      const empty = document.createElement('p');
      empty.className = 'sorting-terminal-customer-empty';
      empty.textContent = selectedMealKeys.size ? '暂无匹配的客户' : '请选择至少一个餐次';
      grid.append(empty);
      return;
    }

    visible.forEach((customer) => {
      const sorted = currentSorted(customer);
      const state = sorted === 0 ? 'unsorted' : sorted < customer.total ? 'partial' : 'complete';
      const label = state === 'unsorted' ? '未分拣' : state === 'partial' ? '部分分拣' : '已分拣';
      const card = document.createElement('button');
      card.type = 'button';
      card.className = `sorting-terminal-customer-card is-${state}${selectedCode === customer.code ? ' is-selected' : ''}`;
      card.dataset.code = customer.code;
      card.setAttribute('aria-pressed', String(selectedCode === customer.code));
      card.setAttribute('aria-label', `${customer.name}${customer.canteen}，${label}，分拣进度${sorted}/${customer.total}`);

      const top = document.createElement('span');
      top.className = 'sorting-terminal-customer-card-status';
      top.textContent = label;
      const middle = document.createElement('span');
      middle.className = 'sorting-terminal-customer-card-name';
      const name = document.createElement('span');
      name.textContent = customer.name;
      const canteen = document.createElement('span');
      canteen.textContent = customer.canteen;
      middle.append(name, canteen);
      const bottom = document.createElement('span');
      bottom.className = 'sorting-terminal-customer-card-progress';
      bottom.textContent = `分拣进度：${sorted}/${customer.total}`;
      card.append(top, middle, bottom);
      grid.append(card);
    });
  }

  document.getElementById('sortingTerminalCustomerFilters').addEventListener('submit', (event) => {
    event.preventDefault();
    render();
  });
  keywordInput.addEventListener('input', render);
  routeInput.addEventListener('change', render);
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
    persistMealSelection();
    updateMealSummary();
    render();
  });
  document.addEventListener('click', (event) => {
    if (!mealFilter.contains(event.target)) {
      mealMenu.hidden = true;
      mealTrigger.setAttribute('aria-expanded', 'false');
    }
  });
  mealFilter.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      mealMenu.hidden = true;
      mealTrigger.setAttribute('aria-expanded', 'false');
      mealTrigger.focus();
    }
  });
  grid.addEventListener('click', (event) => {
    const card = event.target.closest('[data-code]');
    if (!card) return;
    const customer = customers.find((item) => item.code === card.dataset.code);
    const detailUrl = new URL('./sorting-terminal-customer-item.html', window.location.href);
    detailUrl.searchParams.set('customer', customer.code);
    meals.filter((meal) => selectedMealKeys.has(meal.key))
      .forEach((meal) => detailUrl.searchParams.append('meal', meal.key));
    window.location.href = detailUrl.href;
  });

  updateMealSummary();
  persistMealSelection();
  render();
})();
