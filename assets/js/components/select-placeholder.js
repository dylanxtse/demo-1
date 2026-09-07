(function () {
  const placeholderPattern = /^(请选择|选择供应商)/;

  function sync(shell, select) {
    const hasValue = select.selectedIndex >= 0 && select.value !== '';
    shell.classList.toggle('has-value', hasValue);
    select.classList.toggle('is-placeholder', !hasValue);
  }

  function apply(root) {
    if (!root) return;
    root.querySelectorAll('select').forEach((select) => {
      if (select.closest('.price-select-shell')) return;
      const firstOption = select.options[0];
      const explicitPlaceholder = select.dataset.pricePlaceholder || '';
      const optionPlaceholder = firstOption && placeholderPattern.test(firstOption.textContent.trim()) ? firstOption : null;
      if (!explicitPlaceholder && !optionPlaceholder) return;

      const placeholder = explicitPlaceholder || optionPlaceholder.textContent.trim();
      const placeholderWasSelected = explicitPlaceholder
        ? select.dataset.priceEmpty === 'true'
        : optionPlaceholder.selected || select.value === optionPlaceholder.value;
      optionPlaceholder?.remove();
      if (placeholderWasSelected) select.selectedIndex = -1;

      const shell = document.createElement('span');
      shell.className = 'price-select-shell';
      select.parentNode.insertBefore(shell, select);
      shell.appendChild(select);

      const label = document.createElement('span');
      label.className = 'price-select-placeholder';
      label.setAttribute('aria-hidden', 'true');
      label.textContent = placeholder;
      shell.appendChild(label);

      sync(shell, select);
      select.addEventListener('change', () => sync(shell, select));
    });
  }

  window.PriceSelectPlaceholder = { apply };
})();
