(function () {
  let instanceCount = 0;

  function formatDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function resolveElement(value) {
    return typeof value === 'string' ? document.querySelector(value) : value;
  }

  function create(options = {}) {
    const container = resolveElement(options.container);
    const displayInput = resolveElement(options.displayInput) || container?.querySelector('.date-range-display');
    const startInput = resolveElement(options.startInput) || container?.querySelector('[data-date-start]');
    const endInput = resolveElement(options.endInput) || container?.querySelector('[data-date-end]');
    if (!container || !displayInput) return null;

    const panel = document.createElement('div');
    const panelId = options.panelId || `dateRangePanel${++instanceCount}`;
    panel.id = panelId;
    panel.className = 'calendar-panel cal-dual';
    document.body.appendChild(panel);

    const state = { leftYear: 0, leftMonth: 0, rightYear: 0, rightMonth: 0, startDate: startInput?.value || '', endDate: endInput?.value || '' };

    function renderMonth(year, month, side) {
      const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
      const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
      const firstDay = new Date(year, month, 1);
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const today = formatDate(new Date());
      let cells = '';
      for (let i = 0; i < firstDay.getDay(); i += 1) cells += '<td class="cal-empty"></td>';
      for (let day = 1; day <= daysInMonth; day += 1) {
        const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        let className = 'cal-day';
        if (date === today) className += ' cal-today';
        if (date === state.startDate) className += ' cal-start';
        if (date === state.endDate) className += ' cal-end';
        if (state.startDate && state.endDate && date > state.startDate && date < state.endDate) className += ' cal-in-range';
        cells += `<td class="${className}" data-date="${date}">${day}</td>`;
      }
      const remaining = (7 - ((firstDay.getDay() + daysInMonth) % 7)) % 7;
      for (let i = 0; i < remaining; i += 1) cells += '<td class="cal-empty"></td>';
      const cellArray = cells.split('</td>');
      const rows = [];
      for (let i = 0; i < cellArray.length - 1; i += 7) rows.push(`<tr>${cellArray.slice(i, i + 7).join('</td>')}</td></tr>`);
      return `<div class="cal-header"><button class="cal-nav" type="button" data-action="drp-prev-year" data-side="${side}">‹</button><button class="cal-nav" type="button" data-action="drp-prev" data-side="${side}">‹</button><span class="cal-title">${year}年 ${monthNames[month]}</span><button class="cal-nav" type="button" data-action="drp-next" data-side="${side}">›</button><button class="cal-nav" type="button" data-action="drp-next-year" data-side="${side}">›</button></div><table class="cal-table"><thead><tr>${weekDays.map((day) => `<th>${day}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>`;
    }

    function updateDisplay() {
      displayInput.value = state.startDate && state.endDate ? `${state.startDate} ~ ${state.endDate}` : state.startDate ? `${state.startDate} ~` : state.endDate ? `~ ${state.endDate}` : '';
      if (startInput) startInput.value = state.startDate;
      if (endInput) endInput.value = state.endDate;
    }

    function emitChange() {
      options.onChange?.({ startDate: state.startDate, endDate: state.endDate, complete: Boolean(state.startDate && state.endDate) });
    }

    function render() {
      panel.innerHTML = `<div class="cal-dual-body"><div class="cal-panel cal-panel-left">${renderMonth(state.leftYear, state.leftMonth, 'left')}</div><div class="cal-divider"></div><div class="cal-panel cal-panel-right">${renderMonth(state.rightYear, state.rightMonth, 'right')}</div></div><div class="cal-footer"><span class="cal-hint">${options.hintText || '先选开始日期，再选结束日期'}</span><div class="cal-btns"><button class="btn btn-sm" type="button" data-action="drp-clear">清空</button></div></div>`;
      updateDisplay();
    }

    function shift(side, direction) {
      const yearKey = side === 'left' ? 'leftYear' : 'rightYear';
      const monthKey = side === 'left' ? 'leftMonth' : 'rightMonth';
      state[monthKey] += direction === 'prev' ? -1 : 1;
      if (state[monthKey] < 0) { state[monthKey] = 11; state[yearKey] -= 1; }
      if (state[monthKey] > 11) { state[monthKey] = 0; state[yearKey] += 1; }
      render();
    }

    function shiftYear(side, direction) {
      const yearKey = side === 'left' ? 'leftYear' : 'rightYear';
      state[yearKey] += direction === 'prev' ? -1 : 1;
      render();
    }

    function open() {
      const now = new Date();
      state.leftYear = now.getFullYear(); state.leftMonth = now.getMonth();
      state.rightYear = now.getFullYear(); state.rightMonth = (now.getMonth() + 1) % 12;
      if (now.getMonth() === 11) state.rightYear += 1;
      state.startDate = startInput?.value || state.startDate;
      state.endDate = endInput?.value || state.endDate;
      panel.classList.add('is-visible');
      render();
      const rect = displayInput.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      const gap = 4;
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - panelRect.width - 8));
      const openUp = rect.bottom + panelRect.height + gap > window.innerHeight && rect.top > panelRect.height + gap;
      const top = openUp ? rect.top - panelRect.height - gap : rect.bottom + gap;
      panel.style.top = `${Math.max(8, top)}px`;
      panel.style.left = `${left}px`;
    }

    function close() { panel.classList.remove('is-visible'); }

    function onPanelClick(event) {
      event.stopPropagation();
      const actionEl = event.target.closest('[data-action]');
      const action = actionEl?.dataset.action;
      if (action === 'drp-prev' || action === 'drp-next') { shift(actionEl.dataset.side, action === 'drp-prev' ? 'prev' : 'next'); return; }
      if (action === 'drp-prev-year' || action === 'drp-next-year') { shiftYear(actionEl.dataset.side, action === 'drp-prev-year' ? 'prev' : 'next'); return; }
      if (action === 'drp-clear') { state.startDate = ''; state.endDate = ''; updateDisplay(); close(); emitChange(); return; }
      const day = event.target.closest('.cal-day');
      if (!day) return;
      const date = day.dataset.date;
      if (!state.startDate || state.endDate) { state.startDate = date; state.endDate = ''; render(); }
      else if (date < state.startDate) { state.startDate = date; render(); }
      else { state.endDate = date; updateDisplay(); close(); emitChange(); }
    }

    displayInput.addEventListener('click', (event) => { event.stopPropagation(); panel.classList.contains('is-visible') ? close() : open(); });
    panel.addEventListener('click', onPanelClick);
    const onDocumentClick = (event) => { if (panel.classList.contains('is-visible') && !panel.contains(event.target) && !container.contains(event.target)) close(); };
    document.addEventListener('click', onDocumentClick);

    updateDisplay();
    return {
      getValue: () => ({ startDate: state.startDate, endDate: state.endDate }),
      setValue(startDate = '', endDate = '', emit = true) { state.startDate = startDate; state.endDate = endDate; updateDisplay(); if (emit) emitChange(); },
      clear(emit = true) { this.setValue('', '', emit); },
      destroy() { close(); panel.remove(); document.removeEventListener('click', onDocumentClick); }
    };
  }

  function createSingle(options = {}) {
    const input = resolveElement(options.input || options.displayInput);
    if (!input) return null;

    const panel = document.createElement('div');
    const panelId = options.panelId || `datePickerPanel${++instanceCount}`;
    panel.id = panelId;
    panel.className = `calendar-panel single-calendar-panel${options.withTime ? ' with-time' : ''}`;
    document.body.appendChild(panel);

    const minDate = String(options.minDate || '').slice(0, 10);
    const maxDate = String(options.maxDate || '').slice(0, 10);
    const initialParts = String(input.value || '').trim().split(/\s+/);
    const state = { year: 0, month: 0, date: initialParts[0] || '', time: initialParts[1] || (options.withTime ? '08:00:00' : '') };
    const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

    function render() {
      const firstDay = new Date(state.year, state.month, 1);
      const daysInMonth = new Date(state.year, state.month + 1, 0).getDate();
      const today = formatDate(new Date());
      let cells = '';
      for (let i = 0; i < firstDay.getDay(); i += 1) cells += '<td class="cal-empty"></td>';
      for (let day = 1; day <= daysInMonth; day += 1) {
        const date = `${state.year}-${String(state.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        let className = 'cal-day';
        if (date === today) className += ' cal-today';
        if (date === state.date) className += ' cal-start';
        const disabled = (minDate && date < minDate) || (maxDate && date > maxDate);
        if (disabled) className += ' cal-disabled';
        cells += `<td class="${className}" data-date="${date}"${disabled ? ' aria-disabled="true"' : ''}>${day}</td>`;
      }
      const remaining = (7 - ((firstDay.getDay() + daysInMonth) % 7)) % 7;
      for (let i = 0; i < remaining; i += 1) cells += '<td class="cal-empty"></td>';
      const cellArray = cells.split('</td>');
      const rows = [];
      for (let i = 0; i < cellArray.length - 1; i += 7) rows.push(`<tr>${cellArray.slice(i, i + 7).join('</td>')}</td></tr>`);
      const dateMarkup = `<div class="cal-header"><button class="cal-nav" type="button" data-action="dp-prev-year">‹</button><button class="cal-nav" type="button" data-action="dp-prev">‹</button><span class="cal-title">${state.year}年 ${monthNames[state.month]}</span><button class="cal-nav" type="button" data-action="dp-next">›</button><button class="cal-nav" type="button" data-action="dp-next-year">›</button></div><table class="cal-table"><thead><tr>${weekDays.map((day) => `<th>${day}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>`;
      const timeMarkup = options.withTime ? `<div class="cal-time-panel"><div class="cal-current-time">${state.time || '08:00:00'}</div><div class="cal-time-scrolls">${[['hour', '时', 24, 0], ['minute', '分', 60, 3], ['second', '秒', 60, 6]].map(([part, label, count, offset]) => `<div class="cal-time-column-wrap"><span class="cal-time-label">${label}</span><div class="cal-time-column" data-time-part="${part}">${Array.from({ length: count }, (_, value) => { const text = String(value).padStart(2, '0'); return `<button class="cal-time-option ${state.time.slice(offset, offset + 2) === text ? 'is-selected' : ''}" type="button" data-time-value="${text}">${text}</button>`; }).join('')}</div></div>`).join('')}</div></div>` : '';
      panel.innerHTML = `<div class="${options.withTime ? 'cal-dual-body' : ''}"><div class="cal-panel">${dateMarkup}</div>${timeMarkup}</div><div class="cal-footer"><span class="cal-hint">${options.withTime ? '请选择日期和时间' : '请选择日期'}</span><div class="cal-btns"><button class="btn btn-sm" type="button" data-action="dp-clear">清空</button>${options.withTime ? '<button class="btn btn-primary btn-sm" type="button" data-action="dp-confirm">确定</button>' : ''}</div></div>`;
      if (options.withTime) panel.querySelectorAll('.cal-time-column').forEach((column) => {
        const selected = column.querySelector('.cal-time-option.is-selected');
        if (selected) column.scrollTop = selected.offsetTop - (column.clientHeight - selected.offsetHeight) / 2;
      });
    }

    function open() {
      const value = input.value || state.date;
      if (value) {
        const parts = value.split(/[-\s:]/);
        state.year = Number(parts[0]);
        state.month = Number(parts[1]) - 1;
        state.date = `${parts[0]}-${String(parts[1]).padStart(2, '0')}-${String(parts[2]).padStart(2, '0')}`;
        if (options.withTime) state.time = `${String(parts[3] || '08').padStart(2, '0')}:${String(parts[4] || '00').padStart(2, '0')}:${String(parts[5] || '00').padStart(2, '0')}`;
      } else {
        const now = new Date();
        state.year = now.getFullYear();
        state.month = now.getMonth();
      }
      if (!state.date) state.date = value;
      panel.classList.add('is-visible');
      render();
      const rect = input.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      const gap = 4;
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - panelRect.width - 8));
      const openUp = rect.bottom + panelRect.height + gap > window.innerHeight && rect.top > panelRect.height + gap;
      const top = openUp ? rect.top - panelRect.height - gap : rect.bottom + gap;
      panel.style.top = `${Math.max(8, top)}px`;
      panel.style.left = `${left}px`;
    }

    function close() { panel.classList.remove('is-visible'); }
    function getValue() { return options.withTime && state.date ? `${state.date} ${state.time || '08:00:00'}` : state.date; }
    function updateInput() { input.value = getValue(); }
    function updateCurrentTime() {
      const display = panel.querySelector('.cal-current-time');
      if (display) display.textContent = state.time || '08:00:00';
    }
    function emitChange() { options.onChange?.(getValue()); }
    function shift(direction, yearOnly = false) {
      if (yearOnly) state.year += direction === 'prev' ? -1 : 1;
      else {
        state.month += direction === 'prev' ? -1 : 1;
        if (state.month < 0) { state.month = 11; state.year -= 1; }
        if (state.month > 11) { state.month = 0; state.year += 1; }
      }
      render();
    }

    input.addEventListener('click', (event) => { event.stopPropagation(); panel.classList.contains('is-visible') ? close() : open(); });
    panel.addEventListener('click', (event) => {
      event.stopPropagation();
      const action = event.target.closest('[data-action]')?.dataset.action;
      if (action === 'dp-prev' || action === 'dp-next') { shift(action === 'dp-prev' ? 'prev' : 'next'); return; }
      if (action === 'dp-prev-year' || action === 'dp-next-year') { shift(action === 'dp-prev-year' ? 'prev' : 'next', true); return; }
      if (action === 'dp-clear') { state.date = ''; state.time = options.withTime ? '08:00:00' : ''; input.value = ''; close(); emitChange(); return; }
      if (action === 'dp-confirm') { updateInput(); close(); emitChange(); return; }
      const timeOption = event.target.closest('.cal-time-option');
      if (timeOption) {
        const column = timeOption.closest('[data-time-part]');
        const part = column?.dataset.timePart;
        const value = timeOption.dataset.timeValue || '00';
        const parts = [state.time.slice(0, 2), state.time.slice(3, 5), state.time.slice(6, 8)];
        const index = { hour: 0, minute: 1, second: 2 }[part];
        if (index !== undefined) parts[index] = value;
        state.time = `${parts[0]}:${parts[1]}:${parts[2]}`;
        column.querySelectorAll('.cal-time-option').forEach((option) => option.classList.toggle('is-selected', option === timeOption));
        column.scrollTop = timeOption.offsetTop - (column.clientHeight - timeOption.offsetHeight) / 2;
        updateCurrentTime();
        updateInput();
        return;
      }
      const day = event.target.closest('.cal-day');
      if (!day || day.classList.contains('cal-disabled')) return;
      state.date = day.dataset.date;
      updateInput();
      if (!options.withTime) close();
      else render();
      emitChange();
    });
    panel.addEventListener('scroll', (event) => {
      if (!options.withTime) return;
      const column = event.target.closest?.('[data-time-part]');
      if (!column) return;
      const optionsList = [...column.querySelectorAll('.cal-time-option')];
      if (!optionsList.length) return;
      const itemHeight = optionsList[0].offsetHeight || 36;
      const index = Math.max(0, Math.min(optionsList.length - 1, Math.round(column.scrollTop / itemHeight)));
      const selected = optionsList[index];
      const parts = [state.time.slice(0, 2), state.time.slice(3, 5), state.time.slice(6, 8)];
      parts[{ hour: 0, minute: 1, second: 2 }[column.dataset.timePart]] = selected.dataset.timeValue;
      state.time = `${parts[0]}:${parts[1]}:${parts[2]}`;
      optionsList.forEach((option) => option.classList.toggle('is-selected', option === selected));
      updateCurrentTime();
      updateInput();
    }, true);
    const onDocumentClick = (event) => { if (panel.classList.contains('is-visible') && !panel.contains(event.target) && event.target !== input) close(); };
    document.addEventListener('click', onDocumentClick);

    return {
      getValue: () => getValue(),
      open,
      close,
      setValue(value = '', emit = true) { const parts = String(value || '').trim().split(/\s+/); state.date = parts[0] || ''; state.time = parts[1] || (options.withTime ? '08:00:00' : ''); input.value = getValue(); if (emit) emitChange(); },
      clear(emit = true) { this.setValue('', emit); },
      destroy() { close(); panel.remove(); document.removeEventListener('click', onDocumentClick); }
    };
  }

  window.DateRangePicker = { create, mount: create };
  window.DatePicker = { create: createSingle, mount: createSingle };
})();
