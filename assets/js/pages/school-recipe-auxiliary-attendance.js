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
    quantities: {},
    search: '',
    searchInput: '',
    filledOnly: false
  };

  function loadDraft() {
    const saved = readDraft(state.canteen);
    state.quantities = { ...(saved.quantities || {}) };
  }

  function saveDraft() {
    const drafts = window.AppStorage?.read?.(draftKey, {}) || {};
    drafts[scopeFor(state.canteen)] = {
      ...drafts[scopeFor(state.canteen)],
      quantities: { ...state.quantities }
    };
    window.AppStorage?.write?.(draftKey, drafts);
  }

  function isFilled(product) {
    const value = String(state.quantities[String(product.code)] ?? '').trim();
    return /^\d+(?:\.\d{1,2})?$/.test(value) && Number(value) > 0;
  }

  function filledCount() {
    return service.catalogProducts(state.canteen, true).filter(isFilled).length;
  }

  function filledToggleLabel(count = filledCount()) {
    return state.filledOnly ? '查看全部商品' : `查看已填写 ${count} 种商品`;
  }

  function preview() {
    const invalidQuantity = Object.values(state.quantities).some((value) =>
      String(value).trim() !== '' && !/^\d+(?:\.\d{1,2})?$/.test(String(value).trim()));
    const result = service.buildSimpleDraftPreview(state.canteen, state.quantities);
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
    return `<div class="school-recipe-entry-switch" aria-label="干调需求填报方式"><div class="school-recipe-entry-options" role="tablist" aria-label="填报方式">${[
      ['people', '按就餐人数填报'], ['quantity', '按商品数量填报']
    ].map(([mode, label]) => `<button type="button" role="tab" aria-selected="${mode === 'quantity'}" class="school-recipe-entry-tab${mode === 'quantity' ? ' is-active' : ''}" data-aux-entry-mode="${mode}">${label}${defaultMode === mode ? '<span class="school-recipe-entry-default-mark">默认</span>' : ''}</button>`).join('')}</div></div>`;
  }

  function renderRows() {
    const catalog = service.catalogProducts(state.canteen, true);
    const keyword = state.search.trim().toLocaleLowerCase();
    const products = catalog.map((product, index) => ({ product, index })).filter(({ product }) => {
      if (state.filledOnly && !isFilled(product)) return false;
      if (!keyword) return true;
      return [product.auxiliaryName, product.name, product.code, product.brand, product.spec, product.unit]
        .some((value) => String(value ?? '').toLocaleLowerCase().includes(keyword));
    });
    return products.map(({ product, index }) => {
      const code = String(product.code);
      const value = state.quantities[code] ?? '';
      const name = `${product.name}（${product.unit}/${product.brand}/${product.spec}）`;
      return `<tr><td>${index + 1}</td><td class="product-cell">${escapeHtml(name)}</td><td>${escapeHtml(code)}</td><td>${escapeHtml(product.unit)}</td><td><div class="school-recipe-direct-input-wrap"><input type="number" min="0" step="0.01" inputmode="decimal" placeholder="请输入" value="${escapeHtml(value)}" data-aux-simple-quantity="${escapeHtml(code)}" aria-label="${escapeHtml(product.name)}采购数量"></div></td></tr>`;
    }).join('') || `<tr><td colspan="5" class="school-auxiliary-empty">${!catalog.length ? '暂无可填报商品' : state.filledOnly && !filledCount() ? '暂无已填写商品' : '未找到匹配的商品'}</td></tr>`;
  }

  function renderPage() {
    const result = preview();
    const count = filledCount();
    const toggleLabel = filledToggleLabel(count);
    return `<section class="page-card school-auxiliary-page" id="schoolAuxiliaryPage" aria-label="干调需求填报">
      ${renderModeSwitcher()}
      <div class="school-auxiliary-simple-body"><main class="school-auxiliary-detail">
        ${renderCanteens()}
        <div class="school-auxiliary-simple-scroll">
          <div class="school-auxiliary-simple-search"><label for="schoolAuxiliaryProductSearch">商品名称</label><input id="schoolAuxiliaryProductSearch" type="search" value="${escapeHtml(state.searchInput)}" placeholder="请输入商品名称/编号" data-aux-simple-search><button type="button" class="btn btn-primary btn-sm" data-aux-simple-query>查询</button><button type="button" class="btn btn-sm" data-aux-simple-search-reset>重置</button></div>
          <div class="school-auxiliary-table-wrap"><table class="school-auxiliary-table school-auxiliary-simple-table"><thead><tr><th>序号</th><th>商品名称（计量单位/品牌/规格）</th><th>商品编号</th><th>单位</th><th>采购数量</th></tr></thead><tbody data-aux-simple-table-body>${renderRows()}</tbody></table></div>
        </div>
        <footer class="school-auxiliary-footer school-auxiliary-simple-footer"><div><button type="button" class="school-auxiliary-simple-filled-count" data-aux-simple-filled-count aria-pressed="${state.filledOnly}"${count || state.filledOnly ? '' : ' hidden disabled'}>${toggleLabel}</button></div><div class="school-auxiliary-simple-actions"><span class="school-auxiliary-simple-error" data-aux-simple-error role="alert"></span><button type="button" class="btn btn-primary btn-sm${result.canSubmit ? '' : ' btn-disabled'}" data-aux-simple-confirm${result.canSubmit ? '' : ' disabled'}>确认需求</button></div></footer>
      </main></div>
    </section>`;
  }

  loadDraft();
  const root = window.AppShell.mount({
    title: '干调需求填报', variant: 'school', content: renderPage(), emptyText: '干调需求填报'
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
    const count = filledCount();
    const countLabel = root.querySelector('[data-aux-simple-filled-count]');
    if (countLabel) {
      countLabel.textContent = filledToggleLabel(count);
      countLabel.hidden = !count && !state.filledOnly;
      countLabel.disabled = !count && !state.filledOnly;
    }
    const error = root.querySelector('[data-aux-simple-error]');
    if (error) error.textContent = '';
  }

  root.addEventListener('input', (event) => {
    if (event.target.closest('[data-aux-simple-search]')) {
      state.searchInput = event.target.value;
      return;
    }
    const quantityInput = event.target.closest('[data-aux-simple-quantity]');
    if (quantityInput) {
      const code = quantityInput.dataset.auxSimpleQuantity;
      if (quantityInput.value === '') delete state.quantities[code];
      else state.quantities[code] = quantityInput.value;
      saveDraft();
      refreshValidation();
      return;
    }
  });

  root.addEventListener('change', (event) => {
    if (!event.target.closest('[data-aux-simple-quantity]')) return;
    if (!state.filledOnly) return;
    const body = root.querySelector('[data-aux-simple-table-body]');
    if (body) body.innerHTML = renderRows();
  });

  root.addEventListener('click', (event) => {
    if (event.target.closest('[data-aux-simple-query]')) {
      state.search = state.searchInput.trim();
      const body = root.querySelector('[data-aux-simple-table-body]');
      if (body) body.innerHTML = renderRows();
      return;
    }
    if (event.target.closest('[data-aux-simple-search-reset]')) {
      state.search = '';
      state.searchInput = '';
      const input = root.querySelector('[data-aux-simple-search]');
      if (input) input.value = '';
      const body = root.querySelector('[data-aux-simple-table-body]');
      if (body) body.innerHTML = renderRows();
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
      state.search = '';
      state.searchInput = '';
      state.filledOnly = false;
      window.AppStorage?.write?.(canteenKey, scopeFor(state.canteen));
      loadDraft();
      rerender();
      return;
    }
    if (event.target.closest('[data-aux-simple-filled-count]')) {
      if (!state.filledOnly && !filledCount()) return;
      state.filledOnly = !state.filledOnly;
      state.search = '';
      state.searchInput = '';
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
