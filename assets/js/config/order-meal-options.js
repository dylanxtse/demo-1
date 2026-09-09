(function () {
  const options = [
    { key: 'breakfast', value: '早餐', label: '早餐' },
    { key: 'lunch', value: '午餐', label: '午餐' },
    { key: 'dinner', value: '晚餐', label: '晚餐' },
    { key: 'morningSnack', value: '早点', label: '早点' },
    { key: 'afternoonSnack', value: '午点', label: '午点' },
    { key: 'eveningSnack', value: '晚点', label: '晚点' }
  ];

  window.OrderMealOptions = options;
  window.OrderMealNames = options.map((option) => option.label);
  window.OrderMealNameByKey = options.reduce((result, option) => {
    result[option.key] = option.label;
    return result;
  }, {});

  document.addEventListener('change', (event) => {
    const select = event.target.closest?.('select[data-placeholder-only]');
    if (select) select.classList.toggle('is-placeholder', select.value === '');
  });
})();
