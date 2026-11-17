(function () {
  const sessionKey = 'sorting-terminal-demo-session';
  const mealStorageKey = 'sorting-terminal-meal-filter:v1';
  function readSession(key, fallback) {
    try {
      return JSON.parse(sessionStorage.getItem(key)) ?? fallback;
    } catch (_) {
      return fallback;
    }
  }
  const session = readSession(sessionKey, {});
  const user = document.getElementById('sortingTerminalCurrentUser');
  const status = document.getElementById('sortingTerminalActionStatus');
  if (session?.username) user.textContent = session.username;

  const meals = window.OrderMealOptions;
  const queryMeals = new URLSearchParams(window.location.search);
  const savedMeals = readSession(mealStorageKey, null);
  const requestedMeals = queryMeals.has('meal') ? queryMeals.getAll('meal') : savedMeals;
  const selectedMeals = new Set(Array.isArray(requestedMeals)
    ? requestedMeals.filter((key) => meals.some((meal) => meal.key === key))
    : meals.map((meal) => meal.key));
  const mealField = document.getElementById('sortingTerminalMealField');
  const mealTrigger = document.getElementById('sortingTerminalMealTrigger');
  const mealSummary = document.getElementById('sortingTerminalMealSummary');
  const mealMenu = document.getElementById('sortingTerminalMealMenu');
  const mealAll = document.getElementById('sortingTerminalMealAll');
  const mealOptions = document.getElementById('sortingTerminalMealOptions');
  const mealCheckboxes = meals.map((meal) => {
    const label = document.createElement('label');
    label.className = 'sorting-terminal-meal-option';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = meal.key;
    const name = document.createElement('span');
    name.textContent = meal.label;
    label.append(input, name);
    mealOptions.append(label);
    return input;
  });

  function updateMeals() {
    const selected = meals.filter((meal) => selectedMeals.has(meal.key));
    const allSelected = selected.length === meals.length;
    mealAll.checked = allSelected;
    mealAll.indeterminate = selected.length > 0 && !allSelected;
    mealCheckboxes.forEach((input) => { input.checked = selectedMeals.has(input.value); });
    mealSummary.textContent = allSelected ? '全部餐次'
      : selected.length ? selected.map((meal) => meal.label).join('、') : '请选择餐次';
    mealTrigger.title = mealSummary.textContent;
    mealTrigger.classList.toggle('is-placeholder', selected.length === 0);
    try {
      sessionStorage.setItem(mealStorageKey, JSON.stringify(selected.map((meal) => meal.key)));
    } catch (_) { /* Keep the selection available for navigation without storage. */ }
  }

  function closeMeals() {
    mealMenu.hidden = true;
    mealTrigger.setAttribute('aria-expanded', 'false');
  }

  mealTrigger.addEventListener('click', () => {
    mealMenu.hidden = !mealMenu.hidden;
    mealTrigger.setAttribute('aria-expanded', String(!mealMenu.hidden));
  });
  mealMenu.addEventListener('change', (event) => {
    if (event.target === mealAll) {
      selectedMeals.clear();
      if (mealAll.checked) meals.forEach((meal) => selectedMeals.add(meal.key));
    } else if (mealCheckboxes.includes(event.target)) {
      if (event.target.checked) selectedMeals.add(event.target.value);
      else selectedMeals.delete(event.target.value);
    } else return;
    status.textContent = '';
    updateMeals();
  });
  document.addEventListener('click', (event) => {
    if (!mealField.contains(event.target)) closeMeals();
  });
  mealField.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeMeals();
      mealTrigger.focus();
    }
  });
  mealField.addEventListener('focusout', (event) => {
    if (!mealField.contains(event.relatedTarget)) closeMeals();
  });
  updateMeals();

  document.getElementById('sortingTerminalLogout').addEventListener('click', () => {
    sessionStorage.removeItem(sessionKey);
    sessionStorage.removeItem(mealStorageKey);
    window.location.href = './sorting-terminal-login.html';
  });

  document.querySelectorAll('[data-feature]').forEach((button) => {
    button.addEventListener('click', () => {
      const page = { '商品分拣': './sorting-terminal-product.html', '客户分拣': './sorting-terminal-customer.html' }[button.dataset.feature];
      if (page) {
        if (!selectedMeals.size) {
          status.textContent = '请至少选择一个餐次';
          mealMenu.hidden = false;
          mealTrigger.setAttribute('aria-expanded', 'true');
          mealAll.focus();
          return;
        }
        const target = new URL(page, window.location.href);
        meals.filter((meal) => selectedMeals.has(meal.key)).forEach((meal) => target.searchParams.append('meal', meal.key));
        window.location.href = target.href;
        return;
      }
      status.textContent = `${button.dataset.feature}暂无法使用，请稍后重试`;
    });
  });
})();
