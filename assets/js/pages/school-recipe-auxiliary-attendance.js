(function () {
  const pageParams = new URLSearchParams(window.location?.search || '');
  const defaultModeKey = 'school-recipe-auxiliary-default-mode-v1';
  let defaultMode = window.AppStorage?.read?.(defaultModeKey, 'people') === 'quantity' ? 'quantity' : 'people';
  const entryMode = ['people', 'quantity'].includes(pageParams.get('mode')) ? pageParams.get('mode') : defaultMode;
  if (entryMode !== 'quantity') return;
  const service = window.SchoolRecipeAuxiliaryDirectService;
  const canteenConfig = window.SchoolCanteenConfigService;
  if (!service || !window.AppShell) return;

  const draftKey = 'school-recipe-auxiliary-simple-drafts-v1';
  const canteenKey = 'school-recipe-auxiliary-current-canteen';
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
  const canteens = (canteenConfig?.readCanteens?.() || [])
    .filter((canteen) => canteen?.name && canteen.name !== '默认');
  const savedCanteen = window.AppStorage?.read?.(canteenKey, '第一食堂') || '第一食堂';
  const resolveCanteen = (value) => canteenConfig?.getCanteen?.(value)
    || canteens.find((canteen) => canteen.name === value || canteen.id === value)
    || { id: '', name: value || '第一食堂' };
  const scopeFor = (canteen) => String(canteen.id || canteen.name || '第一食堂');
  const readDraft = (canteen) => window.AppStorage?.read?.(draftKey, {})?.[scopeFor(canteen)] || {};
  const state = {
    canteen: resolveCanteen(savedCanteen),
    expectedAt: '',
    quantities: {}
  };

  function loadDraft() {
    const saved = readDraft(state.canteen);
    state.expectedAt = String(saved.expectedAt || '');
    state.quantities = { ...(saved.quantities || {}) };
  }

  function saveDraft() {
    const drafts = window.AppStorage?.read?.(draftKey, {}) || {};
    drafts[scopeFor(state.canteen)] = {
      expectedAt: state.expectedAt,
      quantities: { ...state.quantities }
    };
    window.AppStorage?.write?.(draftKey, drafts);
  }

  function clearDraft() {
    const drafts = window.AppStorage?.read?.(draftKey, {}) || {};
    delete drafts[scopeFor(state.canteen)];
    window.AppStorage?.write?.(draftKey, drafts);
    state.expectedAt = '';
    state.quantities = {};
  }

  function expectedAtValue() {
    const match = state.expectedAt.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2})?$/);
    if (!match) return '';
    const parsed = new Date(`${match[1]}T${match[2]}:00`);
    if (Number.isNaN(parsed.getTime()) || parsed.getFullYear() !== Number(match[1].slice(0, 4))
      || parsed.getMonth() + 1 !== Number(match[1].slice(5, 7))
      || parsed.getDate() !== Number(match[1].slice(8, 10))) return '';
    return `${match[1]} ${match[2]}:00`;
  }

  function preview() {
    const invalidQuantity = Object.values(state.quantities).some((value) =>
      String(value).trim() !== '' && !/^\d+(?:\.\d{1,2})?$/.test(String(value).trim()));
    const result = service.buildSimplePreview(state.canteen, state.quantities, expectedAtValue());
    return invalidQuantity
      ? { ...result, canSubmit: false, message: '采购数量只能填写不超过两位小数的非负数' }
      : result;
  }

  function renderCanteens() {
    const options = canteens.length ? canteens : [state.canteen];
    return `<div class="school-recipe-canteen-switch" aria-label="当前食堂"><div class="school-recipe-canteen-tabs" role="tablist" aria-label="切换食堂">${options.map((canteen) => {
      const key = scopeFor(canteen);
      const active = key === scopeFor(state.canteen);
      return `<button type="button" class="school-recipe-canteen-tab${active ? ' is-active' : ''}" role="tab" aria-selected="${active}" data-aux-simple-canteen="${escapeHtml(key)}">${escapeHtml(canteen.name)}</button>`;
    }).join('')}</div></div>`;
  }

  function renderModeSwitcher() {
    return `<div class="school-recipe-entry-switch" aria-label="干料需求填报方式"><div class="school-recipe-entry-options" role="tablist" aria-label="填报方式">${[
      ['people', '按就餐人数填报'], ['quantity', '按商品数量填报']
    ].map(([mode, label]) => `<button type="button" role="tab" aria-selected="${mode === 'quantity'}" class="school-recipe-entry-tab${mode === 'quantity' ? ' is-active' : ''}" data-aux-entry-mode="${mode}">${label}${defaultMode === mode ? '<span class="school-recipe-entry-default-mark">默认</span>' : ''}</button>`).join('')}</div><button type="button" class="school-recipe-entry-set-default" data-aux-entry-set-default${defaultMode === 'quantity' ? ' disabled' : ''}>设为默认</button></div>`;
  }

  function renderRows() {
    const products = service.catalogProducts(state.canteen);
    return products.map((product, index) => {
      const code = String(product.code);
      const value = state.quantities[code] ?? '';
      const name = `${product.name}（${product.unit}/${product.brand}/${product.spec}）`;
      return `<tr><td>${index + 1}</td><td>${escapeHtml(product.auxiliaryName)}</td><td class="product-cell">${escapeHtml(name)}</td><td>${escapeHtml(code)}</td><td>${escapeHtml(product.unit)}</td><td><div class="school-recipe-direct-input-wrap"><input type="number" min="0" step="0.01" inputmode="decimal" placeholder="0" value="${escapeHtml(value)}" data-aux-simple-quantity="${escapeHtml(code)}" aria-label="${escapeHtml(product.name)}采购数量"></div></td></tr>`;
    }).join('') || '<tr><td colspan="6" class="school-auxiliary-empty">暂无可填报商品</td></tr>';
  }

  function renderPage() {
    const result = preview();
    return `<section class="page-card school-auxiliary-page" id="schoolAuxiliaryPage" aria-label="干料需求填报">
      ${renderModeSwitcher()}
      <div class="school-auxiliary-simple-body"><main class="school-auxiliary-detail">
        ${renderCanteens()}
        <div class="school-auxiliary-simple-scroll">
          <div class="school-auxiliary-simple-delivery"><label for="schoolAuxiliaryExpectedAt">期望送达时间 <span aria-hidden="true">*</span></label><div class="school-auxiliary-simple-date-field${state.expectedAt ? '' : ' is-empty'}" data-aux-simple-date-field><span class="school-auxiliary-simple-date-display" aria-hidden="true"><span data-aux-simple-date-label>${escapeHtml(state.expectedAt ? state.expectedAt.replace('T', ' ') : '请选择')}</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/></svg></span><input id="schoolAuxiliaryExpectedAt" type="datetime-local" value="${escapeHtml(state.expectedAt)}" data-aux-simple-expected-at aria-label="期望送达时间"></div></div>
          <div class="school-auxiliary-table-wrap"><table class="school-auxiliary-table school-auxiliary-simple-table"><thead><tr><th>序号</th><th>干料</th><th>商品名称（计量单位/品牌/规格）</th><th>商品编号</th><th>单位</th><th>采购数量</th></tr></thead><tbody>${renderRows()}</tbody></table></div>
        </div>
        <footer class="school-auxiliary-footer school-auxiliary-simple-footer"><div><button type="button" class="btn btn-sm" data-aux-simple-clear>清空本次填报</button></div><div class="school-auxiliary-simple-actions"><span class="school-auxiliary-simple-error" data-aux-simple-error role="alert"></span><button type="button" class="btn btn-primary btn-sm${result.canSubmit ? '' : ' btn-disabled'}" data-aux-simple-confirm${result.canSubmit ? '' : ' disabled'}>确认需求</button></div></footer>
      </main></div>
    </section>`;
  }

  loadDraft();
  const root = window.AppShell.mount({
    title: '干料需求填报', variant: 'school', content: renderPage(), emptyText: '干料需求填报'
  });

  function rerender() {
    const page = root.querySelector('#schoolAuxiliaryPage');
    if (page) page.outerHTML = renderPage();
  }

  function refreshValidation() {
    const result = preview();
    const button = root.querySelector('[data-aux-simple-confirm]');
    if (button) {
      button.disabled = !result.canSubmit;
      button.classList.toggle('btn-disabled', button.disabled);
    }
    root.querySelector('[data-aux-simple-date-field]')?.classList.toggle('is-empty', !state.expectedAt);
    const dateLabel = root.querySelector('[data-aux-simple-date-label]');
    if (dateLabel) dateLabel.textContent = state.expectedAt ? state.expectedAt.replace('T', ' ') : '请选择';
    const error = root.querySelector('[data-aux-simple-error]');
    if (error) error.textContent = '';
  }

  root.addEventListener('input', (event) => {
    const quantityInput = event.target.closest('[data-aux-simple-quantity]');
    if (quantityInput) {
      const code = quantityInput.dataset.auxSimpleQuantity;
      if (quantityInput.value === '') delete state.quantities[code];
      else state.quantities[code] = quantityInput.value;
      saveDraft();
      refreshValidation();
      return;
    }
    if (event.target.closest('[data-aux-simple-expected-at]')) {
      state.expectedAt = event.target.value;
      saveDraft();
      refreshValidation();
    }
  });

  root.addEventListener('click', (event) => {
    const dateInput = event.target.closest('[data-aux-simple-expected-at]');
    if (dateInput) {
      try { dateInput.showPicker?.(); } catch (_) { dateInput.focus(); }
      return;
    }
    if (event.target.closest('[data-aux-entry-set-default]')) {
      defaultMode = 'quantity';
      window.AppStorage?.write?.(defaultModeKey, defaultMode);
      rerender();
      return;
    }
    const modeButton = event.target.closest('[data-aux-entry-mode]');
    if (modeButton) {
      if (modeButton.dataset.auxEntryMode === 'people') {
        window.location.href = './school-recipe-auxiliary-attendance.html?mode=people';
      }
      return;
    }
    const canteenButton = event.target.closest('[data-aux-simple-canteen]');
    if (canteenButton) {
      state.canteen = resolveCanteen(canteenButton.dataset.auxSimpleCanteen);
      window.AppStorage?.write?.(canteenKey, scopeFor(state.canteen));
      loadDraft();
      rerender();
      return;
    }
    if (event.target.closest('[data-aux-simple-clear]')) {
      clearDraft();
      rerender();
      return;
    }
    if (!event.target.closest('[data-aux-simple-confirm]')) return;
    const result = preview();
    if (!result.canSubmit) {
      const error = root.querySelector('[data-aux-simple-error]');
      if (error) error.textContent = result.message;
      return;
    }
    saveDraft();
    window.location.href = `./school-recipe-auxiliary-demand-confirm.html?mode=quantity&orderMode=simple&canteen=${encodeURIComponent(scopeFor(state.canteen))}`;
  });
})();
