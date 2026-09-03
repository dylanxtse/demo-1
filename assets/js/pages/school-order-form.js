(function () {
  const service = window.SchoolOrderService;
  if (!service) return;

  const params = new URLSearchParams(window.location.search);
  const mode = ['add', 'edit', 'copy', 'audit'].includes(params.get('mode')) ? params.get('mode') : 'add';
  const orderId = params.get('id') || '';
  const sourceOrder = orderId ? service.get(orderId) : null;
  const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  const number = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const money = (value) => number(value).toFixed(2);
  const productLabel = (product) => window.DomUtils.formatProductDisplay(product);
  const titleMap = { add: '添加订单', edit: '编辑订单', copy: '复制订单', audit: '审核订单' };
  const title = titleMap[mode];
  const readOnly = mode === 'audit';
  const showHeaderBack = mode !== 'edit';
  const showFooterBack = !['add', 'edit'].includes(mode);
  const catalog = service.getProductCatalog();
  const defaultItems = mode === 'add'
    ? Array.from({ length: 10 }, (_, index) => ({ id: `SOL-ROW-${index + 1}`, productCode: '', productName: '', unit: '', brand: '--', spec: '--', orderQty: 0, orderPrice: 0, agreementPrice: '', recentSalePrice: '', marketPrice: '', remark: '' }))
    : clone(sourceOrder?.items || []);
  const state = { items: defaultItems, total: 0 };

  function navigate(url) {
    if (window.AppNavigationGuard?.navigate) window.AppNavigationGuard.navigate(url);
    else window.location.href = url;
  }

  function currentProduct(code) {
    return catalog.find((product) => String(product.code) === String(code)) || null;
  }

  function lineValue(line, key, fallback = '') {
    return line?.[key] == null ? fallback : line[key];
  }

  function renderProductSelect(selectedCode, lineId) {
    const selectedProduct = selectedCode ? currentProduct(selectedCode) : null;
    const selectedCodes = state.items
      .filter((item) => item.id !== lineId && item.productCode)
      .map((item) => item.productCode);
    const netTag = selectedProduct?.isNetVegetable ? '<span class="net-vegetable-tag">净菜</span>' : '';
    const displayText = selectedProduct ? escapeHtml(productLabel(selectedProduct)) : '请选择';
    const disabled = readOnly ? ' is-disabled' : '';
    return `<div class="custom-select order-goods-select${disabled}" data-select-type="goods" data-line-id="${escapeHtml(lineId)}" data-value="${escapeHtml(selectedCode || '')}"${readOnly ? ' aria-disabled="true"' : ''}>
      <div class="custom-select-trigger" data-action="toggle-goods-select">
        <span class="template-product-label">${netTag}<span class="custom-select-text ${selectedProduct ? '' : 'is-placeholder'}">${displayText}</span></span>
        <svg class="custom-select-arrow" viewBox="0 0 24 24" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      <div class="custom-select-dropdown">
        ${catalog.map((optionProduct) => {
          const isDuplicate = selectedCodes.includes(optionProduct.code);
          const tag = optionProduct.isNetVegetable ? '<span class="net-vegetable-tag">净菜</span>' : '';
          return `<div class="custom-select-option ${String(optionProduct.code) === String(selectedCode) ? 'selected' : ''} ${isDuplicate ? 'is-disabled' : ''}" data-value="${escapeHtml(optionProduct.code)}" data-disabled="${isDuplicate}" data-action="select-goods">${tag}${escapeHtml(productLabel(optionProduct))}</div>`;
        }).join('')}
      </div>
    </div>`;
  }

  function renderLine(line, index) {
    const product = currentProduct(line.productCode);
    const lineId = line.id || `SOL-ROW-${index + 1}`;
    const unit = line.unit || product?.unit || '';
    const recent = line.recentSalePrice === '' || line.recentSalePrice == null ? (product?.marketPrice ?? '') : line.recentSalePrice;
    const market = line.marketPrice === '' || line.marketPrice == null ? (product?.marketPrice ?? '') : line.marketPrice;
    const qty = number(line.orderQty);
    const price = number(line.orderPrice);
    const lockedInputs = readOnly;
    const remark = lineValue(line, 'remark', '') === '--' ? '' : lineValue(line, 'remark', '');
    return `<tr data-line-id="${escapeHtml(lineId)}">
      <td>${index + 1}</td>
      <td><span class="goods-thumb" aria-label="商品图片">暂无图片</span></td>
      <td class="goods-name-cell">${renderProductSelect(line.productCode, lineId)}</td>
      <td data-cell="unit">${escapeHtml(unit || '--')}</td>
      <td><input class="table-input" data-field="orderQty" type="number" min="0.01" step="0.01" value="${qty ? escapeHtml(qty) : ''}" placeholder="请输入" aria-label="第${index + 1}行下单数量" ${lockedInputs ? 'disabled' : ''}></td>
      <td><input class="table-input" data-field="orderPrice" type="number" min="0" step="0.01" value="${price ? escapeHtml(money(price)) : ''}" placeholder="请输入" aria-label="第${index + 1}行下单单价" ${lockedInputs ? 'disabled' : ''}></td>
      <td class="line-subtotal" data-cell="subtotal">${money(qty * price)}</td>
      <td data-cell="agreement">${lineValue(line, 'agreementPrice', '') === '' ? '--' : money(lineValue(line, 'agreementPrice'))}</td>
      <td data-cell="recent">${recent === '' ? '--' : money(recent)}</td>
      <td data-cell="market">${market === '' ? '--' : money(market)}</td>
      <td><input class="table-input remark-input" data-field="remark" type="text" value="${escapeHtml(remark)}" placeholder="请输入备注" aria-label="第${index + 1}行备注" ${lockedInputs ? 'disabled' : ''}></td>
      <td>${readOnly ? '--' : '<button class="btn-text danger" type="button" data-remove-line>删除</button>'}</td>
    </tr>`;
  }

  function collectItems(page) {
    return [...page.querySelectorAll('#goodsTableBody tr[data-line-id]')].map((row, index) => {
      const old = state.items.find((item) => String(item.id) === String(row.dataset.lineId)) || {};
      const code = row.querySelector('.order-goods-select')?.dataset.value || old.productCode || '';
      const product = currentProduct(code);
      const price = Math.max(0, number(row.querySelector('[data-field="orderPrice"]')?.value ?? old.orderPrice));
      return {
        id: old.id || row.dataset.lineId || `SOL-NEW-${Date.now()}-${index}`,
        productCode: code,
        productName: product?.name || old.productName || '',
        unit: product?.unit || old.unit || '',
        brand: product?.brand || old.brand || '--',
        spec: product?.spec || old.spec || '--',
        isNetVegetable: product?.isNetVegetable ?? old.isNetVegetable ?? false,
        orderQty: Math.max(0, number(row.querySelector('[data-field="orderQty"]')?.value ?? old.orderQty)),
        orderPrice: price,
        agreementPrice: old.agreementPrice ?? '',
        recentSalePrice: product?.marketPrice ?? old.recentSalePrice ?? '',
        marketPrice: product?.marketPrice ?? old.marketPrice ?? '',
        remark: row.querySelector('[data-field="remark"]')?.value ?? old.remark ?? ''
      };
    });
  }

  function updateLine(row, page) {
    const items = collectItems(page);
    const line = items.find((item) => String(item.id) === String(row.dataset.lineId)) || {};
    const index = state.items.findIndex((item) => String(item.id) === String(row.dataset.lineId));
    if (index >= 0) state.items[index] = { ...(state.items[index] || {}), ...line };
    row.querySelector('[data-cell="subtotal"]').textContent = money(number(line.orderQty) * number(line.orderPrice));
    state.total = items.reduce((sum, item) => sum + number(item.orderQty) * number(item.orderPrice), 0);
    page.querySelector('#goodsTotal').textContent = money(state.total);
  }

  function renderItems(page) {
    state.items.forEach((item, index) => {
      if (!item.id) item.id = `SOL-ROW-${index + 1}`;
    });
    page.querySelector('#goodsTableBody').innerHTML = state.items.map(renderLine).join('');
    state.total = state.items.reduce((sum, item) => sum + number(item.orderQty) * number(item.orderPrice), 0);
    page.querySelector('#goodsTotal').textContent = money(state.total);
  }

  function closeAllProductSelects(page, except) {
    page.querySelectorAll('.order-goods-select.is-open').forEach((select) => {
      if (select !== except) {
        select.classList.remove('is-open');
        const dropdown = select.querySelector('.custom-select-dropdown');
        if (dropdown) dropdown.style.display = 'none';
      }
    });
  }

  function toggleProductSelect(page, select) {
    if (!select || select.classList.contains('is-disabled')) return;
    closeAllProductSelects(page, select);
    const dropdown = select.querySelector('.custom-select-dropdown');
    if (!dropdown) return;
    if (select.classList.contains('is-open')) {
      select.classList.remove('is-open');
      dropdown.style.display = 'none';
      return;
    }
    select.classList.add('is-open');
    const trigger = select.querySelector('.custom-select-trigger');
    const rect = trigger.getBoundingClientRect();
    dropdown.style.display = 'block';
    dropdown.style.position = 'fixed';
    dropdown.style.left = `${rect.left}px`;
    dropdown.style.width = `${rect.width}px`;
    dropdown.style.zIndex = '100';
    const spaceBelow = window.innerHeight - rect.bottom - 10;
    const spaceAbove = rect.top - 10;
    if (spaceBelow >= 120) {
      dropdown.style.top = `${rect.bottom}px`;
      dropdown.style.maxHeight = `${Math.min(240, spaceBelow)}px`;
    } else {
      dropdown.style.top = `${rect.top - Math.min(240, spaceAbove)}px`;
      dropdown.style.maxHeight = `${Math.min(240, spaceAbove)}px`;
    }
  }

  function selectProduct(page, select, option) {
    if (readOnly || option.dataset.disabled === 'true') return;
    const lineId = select?.dataset.lineId;
    const product = currentProduct(option?.dataset.value);
    const item = state.items.find((entry) => String(entry.id) === String(lineId));
    if (!product || !item) return;
    item.productCode = product.code;
    item.productName = product.name;
    item.unit = product.unit;
    item.brand = product.brand;
    item.spec = product.spec;
    item.isNetVegetable = product.isNetVegetable === true;
    item.recentSalePrice = product.marketPrice;
    item.marketPrice = product.marketPrice;
    if (!number(item.orderPrice)) item.orderPrice = product.marketPrice;
    closeAllProductSelects(page);
    if (state.items[state.items.length - 1] === item) {
      state.items.push({ id: `SOL-ROW-${Date.now()}`, productCode: '', productName: '', unit: '', brand: '--', spec: '--', orderQty: 0, orderPrice: 0, agreementPrice: '', recentSalePrice: '', marketPrice: '', remark: '' });
    }
    renderItems(page);
  }

  function setError(page, message = '') {
    page.querySelector('#schoolOrderFormError').textContent = message;
  }

  function openModal({ title: modalTitle, body, footer, className = '' }) {
    const backdrop = document.createElement('div');
    backdrop.className = 'operations-modal-backdrop';
    backdrop.innerHTML = `<div class="operations-modal ${className}" role="dialog" aria-modal="true" aria-label="${escapeHtml(modalTitle)}">
      <div class="operations-modal-header"><h3>${escapeHtml(modalTitle)}</h3><button type="button" data-modal-close aria-label="关闭">×</button></div>
      <div class="operations-modal-body">${body}</div>
      <div class="operations-modal-footer">${footer}</div>
    </div>`;
    document.body.appendChild(backdrop);
    const close = () => backdrop.remove();
    backdrop.addEventListener('click', (event) => {
      if (event.target === backdrop || event.target.closest('[data-modal-close], [data-modal-cancel]')) close();
    });
    return { backdrop, close };
  }

  function openProductPicker(page) {
    state.items = collectItems(page);
    const selectedCodes = new Set(state.items.map((item) => item.productCode).filter(Boolean));
    const existingItems = new Map(state.items.filter((item) => item.productCode).map((item) => [item.productCode, item]));
    const pickerValues = new Map();
    const categories = [...new Set(catalog.map((product) => product.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh-CN'));
    const modal = openModal({
      title: '批量添加商品',
      className: 'school-order-picker-modal',
      body: `<div class="school-order-picker-filter"><div class="school-order-picker-filter-field"><label for="schoolOrderPickerCategory">商品分类</label><select id="schoolOrderPickerCategory"><option value="">请选择商品分类</option>${categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join('')}</select></div><div class="school-order-picker-filter-actions"><button type="button" class="btn btn-primary btn-sm" data-picker-query>查询</button><button type="button" class="btn btn-sm" data-picker-reset>重置</button></div></div><div class="school-order-picker-list" id="schoolOrderPickerList"></div>`,
      footer: `<button type="button" class="btn" data-modal-cancel>关闭</button><button type="button" class="btn btn-primary" data-modal-confirm>添加</button>`
    });

    const list = modal.backdrop.querySelector('#schoolOrderPickerList');
    const categorySelect = modal.backdrop.querySelector('#schoolOrderPickerCategory');
    const capturePickerValues = () => {
      list.querySelectorAll('[data-picker-code]').forEach((row) => {
        const code = row.dataset.pickerCode;
        pickerValues.set(code, {
          checked: Boolean(row.querySelector('.picker-product-check')?.checked),
          quantity: row.querySelector('.picker-qty-input')?.value || '',
          remark: row.querySelector('.picker-remark-input')?.value || ''
        });
      });
    };
    const renderPickerRows = () => {
      capturePickerValues();
      const category = categorySelect.value;
      const visibleProducts = category ? catalog.filter((product) => product.category === category) : catalog;
      list.innerHTML = `<div class="school-order-picker-row header"><span></span><span>图片</span><span>商品名称（计量单位/品牌/规格）</span><span>计量单位</span><span>下单数量</span><span>备注</span></div>${visibleProducts.map((product) => {
        const existing = existingItems.get(product.code);
        const saved = pickerValues.get(product.code);
        const checked = saved ? saved.checked : selectedCodes.has(product.code);
        const quantity = saved ? saved.quantity : (existing && number(existing.orderQty) > 0 ? existing.orderQty : '');
        const remark = saved ? saved.remark : (existing?.remark && existing.remark !== '--' ? existing.remark : '');
        return `<div class="school-order-picker-row" data-picker-code="${escapeHtml(product.code)}"><span><input class="picker-product-check" type="checkbox" value="${escapeHtml(product.code)}" ${checked ? 'checked' : ''} aria-label="选择${escapeHtml(productLabel(product))}"></span><span><span class="school-order-picker-image">图片</span></span><span class="school-order-picker-product" title="${escapeHtml(productLabel(product))}">${product.isNetVegetable ? '<span class="net-vegetable-tag">净菜</span>' : ''}${escapeHtml(productLabel(product))}</span><span>${escapeHtml(product.unit || '--')}</span><span><input class="picker-qty-input" type="number" min="0.01" step="0.01" value="${escapeHtml(quantity)}" placeholder="请输入数量" aria-label="${escapeHtml(product.name)}下单数量"></span><span><input class="picker-remark-input" type="text" value="${escapeHtml(remark)}" placeholder="请输入备注" aria-label="${escapeHtml(product.name)}备注"></span></div>`;
      }).join('')}`;
    };

    renderPickerRows();
    modal.backdrop.querySelector('[data-picker-query]').addEventListener('click', renderPickerRows);
    modal.backdrop.querySelector('[data-picker-reset]').addEventListener('click', () => {
      categorySelect.value = '';
      renderPickerRows();
    });
    modal.backdrop.querySelector('[data-modal-confirm]').addEventListener('click', () => {
      capturePickerValues();
      const codes = [...list.querySelectorAll('.picker-product-check:checked')].map((input) => input.value);
      const chosen = codes.map(currentProduct).filter(Boolean);
      const next = state.items.slice();
      chosen.forEach((product) => {
        const pickerValue = pickerValues.get(product.code) || {};
        const existingIndex = next.findIndex((item) => item.productCode === product.code);
        const item = { id: `SOL-NEW-${Date.now()}-${product.code}`, productCode: product.code, productName: product.name, unit: product.unit, brand: product.brand, spec: product.spec, isNetVegetable: product.isNetVegetable === true, orderQty: 0, orderPrice: product.marketPrice, agreementPrice: '', recentSalePrice: product.marketPrice, marketPrice: product.marketPrice, remark: '' };
        item.orderQty = number(pickerValue.quantity);
        item.remark = pickerValue.remark || '';
        if (existingIndex >= 0) next[existingIndex] = { ...next[existingIndex], orderQty: item.orderQty, remark: item.remark };
        else {
          const blankIndex = next.findIndex((entry) => !entry.productCode);
          if (blankIndex >= 0) next[blankIndex] = item;
          else next.push(item);
        }
      });
      state.items = next;
      renderItems(page);
      modal.close();
    });
  }

  function buildPayload(page) {
    const items = collectItems(page);
    return {
      supplierName: page.querySelector('#schoolOrderSupplier').value,
      expectedAt: page.querySelector('#schoolOrderExpectedAt').value,
      canteen: page.querySelector('#schoolOrderCanteen').value,
      orderTag: page.querySelector('#schoolOrderTag').value,
      remark: page.querySelector('#schoolOrderRemark').value,
      items
    };
  }

  function save(page, status = '') {
    setError(page, '');
    const payload = buildPayload(page);
    if (!payload.supplierName || !payload.expectedAt || !payload.canteen || !payload.orderTag) {
      setError(page, '请完整填写供货企业、期望送达时间、食堂和订单标签');
      return;
    }
    if (status !== '草稿' && !payload.items.some((item) => item.productName && item.orderQty > 0)) {
      setError(page, '请至少添加一条商品并填写下单数量');
      return;
    }
    if (mode === 'edit') service.update(orderId, { ...payload, ...(status ? { status } : {}) });
    else service.create({ ...payload, status: status || '待发货', source: '平台下单' });
    navigate('./school-order-management.html');
  }

  function render() {
    if (['edit', 'copy', 'audit'].includes(mode) && !sourceOrder) {
      navigate('./school-order-management.html');
      return;
    }
    const order = sourceOrder || {};
    const supplier = order.supplierName || '';
    const expectedAt = order.expectedAt || '';
    const canteen = order.canteen || '';
    const tag = order.orderTag || '';
    const remark = order.remark === '--' ? '' : (order.remark || '');
    const supplierDisabled = readOnly || mode === 'edit';
    const expectedDisabled = readOnly || mode === 'edit';
    const basicDisabled = readOnly;
    const content = `<section class="school-order-form-page" id="schoolOrderFormPage" aria-label="${escapeHtml(title)}">
      <header class="school-order-form-header ${showHeaderBack ? '' : 'is-standalone'}">${showHeaderBack ? '<button type="button" class="back-link school-order-form-back" data-action="back" aria-label="返回订单列表"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"></path><path d="M19 12H9"></path></svg><span>返回</span></button>' : ''}<h1>${escapeHtml(title)}</h1></header>
      <div class="school-order-form-body">
        ${mode === 'audit' ? '<p class="school-order-form-readonly-note">当前为审核视图，请核对订单基础信息与商品明细后完成审核。</p>' : ''}
        ${mode === 'copy' ? `<p class="school-order-form-context">复制订单：${escapeHtml(order.orderNo || '')}。保存后将生成新的订单号。</p>` : mode === 'edit' ? `<p class="school-order-form-context">订单号：${escapeHtml(order.orderNo || '')}</p>` : ''}
        <section class="school-order-form-section">
          <div class="school-order-basic-grid">
            <div class="school-order-basic-field required"><label for="schoolOrderSupplier">供货企业</label><select id="schoolOrderSupplier" class="${supplier ? '' : 'is-placeholder'}" ${supplierDisabled ? 'disabled' : ''}><option value="">请选择供货企业</option>${(service.suppliers || [service.SUPPLIER_NAME]).map((item) => `<option value="${escapeHtml(item)}" ${supplier === item ? 'selected' : ''}>${escapeHtml(item)}</option>`).join('')}</select></div>
            <div class="school-order-basic-field required"><label for="schoolOrderExpectedAt">期望送达时间</label><input id="schoolOrderExpectedAt" class="form-control ${expectedAt ? '' : 'is-placeholder'}" type="text" value="${escapeHtml(expectedAt)}" placeholder="请选择期望送达时间" ${expectedDisabled ? 'disabled' : ''}></div>
            <div class="school-order-basic-field required"><label for="schoolOrderCanteen">食堂</label><select id="schoolOrderCanteen" class="${canteen ? '' : 'is-placeholder'}" ${basicDisabled ? 'disabled' : ''}><option value="">请选择食堂</option>${(service.canteens || []).map((item) => `<option value="${escapeHtml(item)}" ${canteen === item ? 'selected' : ''}>${escapeHtml(item)}</option>`).join('')}</select></div>
            <div class="school-order-basic-field required"><label for="schoolOrderTag">订单标签</label><select id="schoolOrderTag" class="${tag ? '' : 'is-placeholder'}" ${basicDisabled ? 'disabled' : ''}><option value="">请选择订单标签</option>${(service.tags || []).map((item) => `<option value="${escapeHtml(item)}" ${tag === item ? 'selected' : ''}>${escapeHtml(item)}</option>`).join('')}</select></div>
          </div>
        </section>
        <section class="school-order-form-section">
          ${!readOnly ? '<div class="school-order-goods-toolbar"><button type="button" class="btn btn-primary btn-sm" data-action="batch-add">批量添加商品</button></div>' : ''}
          <div class="order-goods-table-wrap"><table class="order-goods-table"><thead><tr><th>序号</th><th>图片</th><th>商品名称（计量单位/品牌/规格）</th><th>计量单位</th><th class="required-head">下单数量</th><th class="required-head">下单单价</th><th>下单小计</th><th>协议价</th><th>近一次销售价</th><th>市场价</th><th>备注</th><th>操作</th></tr></thead><tbody id="goodsTableBody"></tbody><tfoot><tr><td colspan="6">合计</td><td id="goodsTotal">0.00</td><td colspan="5"></td></tr></tfoot></table></div>
          <div class="goods-table-error" id="schoolOrderFormError" role="alert"></div>
        </section>
        <section class="school-order-remark"><label class="school-order-remark-label" for="schoolOrderRemark">订单备注</label><div class="school-order-remark-wrap"><textarea id="schoolOrderRemark" maxlength="100" ${readOnly ? 'disabled' : ''}>${escapeHtml(remark)}</textarea><span class="school-order-remark-count"><span id="schoolOrderRemarkCount">${escapeHtml(remark.length)}</span>/100</span></div></section>
      </div>
      <footer class="school-order-form-actions">${showFooterBack ? '<button type="button" class="btn" data-action="back">返回</button>' : ''}${readOnly ? '<button type="button" class="btn btn-danger" data-action="reject">驳回</button><button type="button" class="btn btn-primary" data-action="approve">审核通过</button>' : '<button type="button" class="btn" data-action="draft">暂存</button><button type="button" class="btn btn-primary" data-action="save">保存订单</button>'}</footer>
    </section>`;
    const root = window.AppShell.mount({ title, content, variant: 'school', companyName: service.SCHOOL_NAME, emptyText: title });
    const page = root.querySelector('#schoolOrderFormPage');
    renderItems(page);

    page.addEventListener('input', (event) => {
      const row = event.target.closest('tr[data-line-id]');
      if (row) updateLine(row, page);
      if (event.target.id === 'schoolOrderRemark') page.querySelector('#schoolOrderRemarkCount').textContent = event.target.value.length;
      if (event.target.id === 'schoolOrderExpectedAt') event.target.classList.toggle('is-placeholder', !event.target.value.trim());
    });
    page.addEventListener('change', (event) => {
      if (event.target.matches('#schoolOrderSupplier, #schoolOrderCanteen, #schoolOrderTag')) {
        event.target.classList.toggle('is-placeholder', !event.target.value);
        return;
      }
      const row = event.target.closest('tr[data-line-id]');
      if (!row) return;
      updateLine(row, page);
    });
    page.addEventListener('click', (event) => {
      const selectTrigger = event.target.closest('[data-action="toggle-goods-select"]');
      if (selectTrigger) {
        event.stopPropagation();
        toggleProductSelect(page, selectTrigger.closest('.order-goods-select'));
        return;
      }
      const selectOption = event.target.closest('[data-action="select-goods"]');
      if (selectOption) {
        event.stopPropagation();
        selectProduct(page, selectOption.closest('.order-goods-select'), selectOption);
        return;
      }
      const remove = event.target.closest('[data-remove-line]');
      if (remove) {
        const lineId = remove.closest('tr[data-line-id]')?.dataset.lineId;
        if (state.items.length <= 1) return;
        state.items = state.items.filter((item) => String(item.id) !== String(lineId));
        renderItems(page);
        return;
      }
      const button = event.target.closest('[data-action]');
      if (!button) return;
      const action = button.dataset.action;
      if (action === 'back') navigate('./school-order-management.html');
      else if (action === 'batch-add') openProductPicker(page);
      else if (action === 'draft') save(page, '草稿');
      else if (action === 'save') save(page);
      else if (action === 'approve') { service.approve(orderId); navigate('./school-order-management.html'); }
      else if (action === 'reject') { service.reject(orderId, window.prompt('请输入驳回原因', '订单信息需补充') || '订单信息需补充'); navigate('./school-order-management.html'); }
    });
    document.addEventListener('click', (event) => {
      if (!event.target.closest('.order-goods-select')) closeAllProductSelects(page);
    });
    document.addEventListener('scroll', (event) => {
      const target = event.target;
      if (target instanceof Element && target.closest('.custom-select-dropdown')) return;
      closeAllProductSelects(page);
    }, true);
    window.addEventListener('resize', () => closeAllProductSelects(page));
  }

  render();
})();
