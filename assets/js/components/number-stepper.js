(function () {
  function adjust(input, direction) {
    const step = Number(input.step) || 0.01;
    const minimum = Number(input.min);
    const current = Number(input.value);
    const base = Number.isFinite(current) ? current : (Number.isFinite(minimum) ? minimum : 0);
    const next = Math.max(Number.isFinite(minimum) ? minimum : -Infinity, base + direction * step);
    const decimals = step >= 1 ? 0 : Math.max(2, (String(step).split('.')[1] || '').length);
    input.value = next.toFixed(decimals);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  window.NumberStepper = {
    bind(root) {
      root.addEventListener('click', (event) => {
        const button = event.target.closest('[data-number-step]');
        if (!button) return;
        const input = document.getElementById(button.dataset.numberTarget);
        if (!input) return;
        event.preventDefault();
        adjust(input, button.dataset.numberStep === 'up' ? 1 : -1);
        input.focus();
      });
    }
  };
})();
