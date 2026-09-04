(function () {
  const service = window.OperationsService;
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode') || 'add';
  const recordId = params.get('id') || '';

  // 商品目录：从统一演示数据仓库读取已上架商品。确认供货页需要在订单加载后再次刷新，
  // 以兼容订单数据先于商品目录初始化的情况。
  let catalog = [];

  function refreshCatalog() {
    const allProducts = (window.DemoStore?.get('products') || [])
      .filter((product) => !product.status || product.status === 'ENABLE' || product.status === '已上架');
    catalog = allProducts.map((p) => ({
      id: String(p.code || p.id || ''),
      goodsName: `${p.name}（${p.unit}/${p.brand}/${p.spec}）`,
      productName: p.name,
      unit: p.unit,
      brand: p.brand,
      spec: p.spec,
      isNetVegetable: !!p.isNetVegetable,
      agreementPrice: Number(p.marketPrice || 0),
      lastPrice: Number(p.marketPrice || 0),
      marketPrice: Number(p.marketPrice || 0)
    })).filter((product) => product.id);
  }

  function resolveProductCode(item) {
    return String(item?.goodsCode || item?.productId || item?.productCode || item?.goodsId || '').trim();
  }

  function findCatalogEntry(item) {
    const code = resolveProductCode(item);
    return catalog.find((entry) => entry.id === code)
      || (item?.productName ? catalog.find((entry) => entry.productName === item.productName) : null)
      || {};
  }

  function ensureCatalogEntry(item) {
    const source = findCatalogEntry(item);
    if (source.id) return source;

    const code = resolveProductCode(item);
    if (!code) return source;
    const productName = item.productName || String(item.goodsName || code).split(/[（(]/)[0];
    const fallback = {
      id: code,
      goodsName: item.goodsName || `${productName}（${item.unit || '--'}/${item.brand || '--'}/${item.spec || '--'}）`,
      productName,
      unit: item.unit || '--',
      brand: item.brand || '--',
      spec: item.spec || '--',
      isNetVegetable: !!item.isNetVegetable,
      agreementPrice: Number(item.agreementPrice || item.unitPrice || 0),
      lastPrice: Number(item.lastPrice || 0),
      marketPrice: Number(item.marketPrice || 0)
    };
    catalog.push(fallback);
    return fallback;
  }

  refreshCatalog();

  const modeTitles = { add: '添加订单', edit: '编辑订单', audit: '审核订单', confirm: '确认供货', copy: '复制订单' };
  const readonlyMode = mode === 'audit' || mode === 'confirm';
  let currentRecord = null;
  let goodsItems = [];
  const DEFAULT_ROW_COUNT = 5;

  const template = document.getElementById('orderAddTemplate');
  const root = window.AppShell.mount({ title: '订单管理', content: template.innerHTML });
  const form = document.getElementById('orderAddForm');
  const status = document.getElementById('orderFormStatus');
  const overlay = document.getElementById('orderFormOverlay');
  const goodsBody = document.getElementById('goodsTableBody');
  document.getElementById('orderPageTitle').textContent = modeTitles[mode] || modeTitles.add;
  document.title = `${modeTitles[mode] || modeTitles.add} - 集采企业版企业端`;

  // 日期选择器（与订单列表页一致：readonly text + placeholder + DatePicker 组件）
  const expectedAtPicker = window.DatePicker?.mount({
    input: '#expectedAt',
    panelId: 'orderAddExpectedAtPickerPanel',
    withTime: true
  });

  function normalizeExpectedAt(value) {
    const text = String(value || '').trim();
    if (!text) return '';
    const parts = text.split(/\s+/);
    return `${parts[0]} ${parts[1] ? `${parts[1]}:00`.slice(0, 8) : '08:00:00'}`;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function money(value) {
    return Number(value || 0).toFixed(2);
  }

  function backToList(flag) {
    window.AppNavigation?.navigate?.(`./order-management.html${flag ? `?${flag}=1` : ''}`);
  }

  function toast(message, error) {
    status.textContent = message;
    status.className = `order-form-status is-visible${error ? ' error' : ''}`;
    window.setTimeout(() => { status.className = 'order-form-status'; }, 2400);
  }

  function clearErrors() {
    form.querySelectorAll('[data-error-for]').forEach((element) => { element.textContent = ''; });
    form.querySelectorAll('[aria-invalid="true"]').forEach((element) => element.removeAttribute('aria-invalid'));
    document.getElementById('goodsTableError').textContent = '';
  }

  function refreshCanteens(selected) {
    const customer = form.elements.customerName.value;
    const options = (window.MasterDataService?.listCustomers({ customerName: customer }) || [])
      .flatMap((item) => window.MasterDataService.getLocations(item.id).map((location) => location.canteen));
    form.elements.canteen.innerHTML = `<option value="" ${selected ? '' : 'selected'} disabled hidden>请选择</option>${options.map((name) => `<option ${name === selected ? 'selected' : ''}>${name}</option>`).join('')}`;
    form.elements.canteen.classList.toggle('has-value', Boolean(form.elements.canteen.value));
  }

  function populateCustomers(selected) {
    const customers = window.MasterDataService?.listCustomers({ status: 'ENABLE' }) || [];
    form.elements.customerName.innerHTML = `<option value="" ${selected ? '' : 'selected'} disabled hidden>请选择</option>${customers.map((customer) => `<option value="${escapeHtml(customer.customerName)}" ${customer.customerName === selected ? 'selected' : ''}>${escapeHtml(customer.customerName)}</option>`).join('')}`;
    form.elements.customerName.classList.toggle('has-value', Boolean(form.elements.customerName.value));
  }

  function selectedCustomer() {
    return window.MasterDataService?.listCustomers({ customerName: form.elements.customerName.value })?.[0] || null;
  }

  function selectedLocation() {
    const customer = selectedCustomer();
    return (customer ? window.MasterDataService.getLocations(customer.id) : [])
      .find((location) => location.canteen === form.elements.canteen.value) || null;
  }

  function createEmptyGoodsItem() {
    return {
      id: `LINE-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      goodsId: '',
      goodsName: '',
      productName: '',
      unit: '',
      brand: '',
      spec: '',
      quantity: 0,
      unitPrice: 0,
      agreementPrice: 0,
      lastPrice: 0,
      marketPrice: 0,
      remark: ''
    };
  }

  function normalizedItem(item) {
    const source = ensureCatalogEntry(item);
    const productCode = resolveProductCode(item) || source.id || '';
    return {
      id: item.orderLineId || (item.id ? item.id : `LINE-${Date.now()}-${Math.random().toString(16).slice(2)}`),
      goodsId: productCode,
      goodsCode: item.goodsCode || item.productId || item.productCode || source.id || '',
      goodsName: source.id ? source.goodsName : (item.goodsName || item.productName || ''),
      productName: source.productName || item.productName || '',
      unit: source.unit || item.unit || '',
      brand: source.brand || item.brand || '',
      spec: source.spec || item.spec || '',
      isNetVegetable: item.isNetVegetable ?? source.isNetVegetable ?? false,
      quantity: Number(item.quantity || 0),
      unitPrice: Number(item.unitPrice ?? item.agreementPrice ?? source.agreementPrice ?? 0),
      agreementPrice: Number(item.agreementPrice ?? source.agreementPrice ?? 0),
      lastPrice: Number(item.lastPrice ?? source.lastPrice ?? 0),
      marketPrice: Number(item.marketPrice ?? source.marketPrice ?? 0),
      remark: item.remark || ''
    };
  }

  // 渲染商品选择下拉框（复用净菜加工模版的 custom-select 样式）
  function renderGoodsSelect(selectedCode, lineId) {
    const selectedProduct = selectedCode ? catalog.find((p) => p.id === String(selectedCode)) : null;
    const netTag = selectedProduct?.isNetVegetable ? '<span class="net-vegetable-tag">净菜</span>' : '';
    const displayText = selectedProduct ? escapeHtml(window.DomUtils.formatProductDisplay(selectedProduct, catalog)) : '请选择';
    const selectedCodes = goodsItems.filter((item) => item.goodsId && item.id !== lineId).map((item) => item.goodsId);
    return `
      <div class="custom-select order-goods-select" data-select-type="goods" data-line-id="${escapeHtml(lineId)}">
        <div class="custom-select-trigger" data-action="toggle-goods-select">
          <span class="template-product-label">${netTag}<span class="custom-select-text ${!selectedProduct ? 'is-placeholder' : ''}">${displayText}</span></span>
          <svg class="custom-select-arrow" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="custom-select-dropdown">
          ${catalog.map((p) => {
            const isDuplicate = selectedCodes.includes(p.id);
            const tag = p.isNetVegetable ? '<span class="net-vegetable-tag">净菜</span>' : '';
            return `<div class="custom-select-option ${p.id === String(selectedCode) ? 'selected' : ''} ${isDuplicate ? 'is-disabled' : ''}" data-value="${escapeHtml(p.id)}" data-disabled="${isDuplicate}" data-action="select-goods">${tag}${escapeHtml(window.DomUtils.formatProductDisplay(p, catalog))}</div>`;
          }).join('')}
        </div>
      </div>
    `;
  }

  function renderGoods() {
    goodsBody.innerHTML = goodsItems.map((item, index) => `
      <tr data-line-id="${escapeHtml(item.id)}">
        <td>${index + 1}</td>
        <td><span class="goods-thumb">暂无图片</span></td>
        <td class="goods-name-cell">${renderGoodsSelect(item.goodsId, item.id)}</td>
        <td>${escapeHtml(item.unit || '--')}</td>
        <td><input class="table-input" data-field="quantity" type="number" min="0.01" step="0.01" value="${item.quantity || ''}" placeholder="请输入" ${readonlyMode ? 'disabled' : ''}></td>
        <td><input class="table-input" data-field="unitPrice" type="number" min="0" step="0.01" value="${item.unitPrice ? money(item.unitPrice) : ''}" placeholder="请输入" ${readonlyMode ? 'disabled' : ''}></td>
        <td class="line-subtotal">${money(item.quantity * item.unitPrice)}</td>
        <td>${item.agreementPrice ? money(item.agreementPrice) : '--'}</td>
        <td>${item.lastPrice ? money(item.lastPrice) : '--'}</td>
        <td>${item.marketPrice ? money(item.marketPrice) : '--'}</td>
        <td><input class="table-input remark-input" data-field="remark" value="${escapeHtml(item.remark)}" placeholder="请输入备注" ${readonlyMode ? 'disabled' : ''}></td>
        <td>${readonlyMode ? '--' : '<button class="btn-text danger" type="button" data-remove-line>删除</button>'}</td>
      </tr>
    `).join('');
    document.getElementById('goodsTotal').textContent = money(goodsItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0));
  }

  // 批量添加商品弹窗（使用 overlay 模态层）
  function openGoodsModal() {
    overlay.innerHTML = `<div class="operations-modal-backdrop"><section class="operations-modal goods-picker-modal" role="dialog" aria-modal="true" aria-label="批量添加商品">
      <header class="operations-modal-header"><h3>批量添加商品</h3><button data-overlay-close aria-label="关闭">×</button></header>
      <div class="operations-modal-body"><div class="goods-picker-list">
        <div class="goods-picker-row goods-picker-header"><span>选择</span><span>商品名称（计量单位/品牌/规格）</span><span>单位</span><span>下单数量</span></div>
        ${catalog.map((item) => {
          const exists = goodsItems.some((line) => line.goodsId === item.id);
          const tag = item.isNetVegetable ? '<span class="net-vegetable-tag">净菜</span>' : '';
          return `<div class="goods-picker-row">
            <input type="checkbox" value="${item.id}" ${exists ? 'disabled' : ''}>
            <span>${tag}${escapeHtml(window.DomUtils.formatProductDisplay(item, catalog))}</span>
            <span>${escapeHtml(item.unit)}</span>
            ${exists ? '<span class="picker-already-tag">已添加</span>' : '<input type="number" class="picker-qty-input" min="0.01" step="0.01" placeholder="请输入数量">'}
          </div>`;
        }).join('')}
      </div></div>
      <footer class="operations-modal-footer"><button class="btn" data-overlay-close>取消</button><button class="btn btn-primary" id="confirmGoods">添加</button></footer>
    </section></div>`;
  }

  function closeOverlay() {
    overlay.innerHTML = '';
  }

  function readData(statusValue) {
    const customer = selectedCustomer();
    const location = selectedLocation();
    return {
      customerId: customer?.id || currentRecord?.customerId || '',
      customerName: form.elements.customerName.value,
      canteen: form.elements.canteen.value,
      expectedAt: normalizeExpectedAt(form.elements.expectedAt.value),
      orderTag: form.elements.orderTag.value,
      remark: form.elements.remark.value.trim(),
      items: goodsItems.filter((item) => item.goodsId).map((item) => ({
        goodsId: item.goodsId,
        goodsCode: item.goodsCode || item.goodsId,
        goodsName: item.productName || item.goodsName,
        isNetVegetable: item.isNetVegetable ?? false,
        unit: item.unit,
        brand: item.brand,
        spec: item.spec,
        unitPrice: Number(item.unitPrice || 0),
        quantity: Number(item.quantity || 0),
        subtotal: Number((item.quantity * item.unitPrice).toFixed(2)),
        remark: item.remark || ''
      })),
      orderAmount: Number(goodsItems.filter((item) => item.goodsId).reduce((sum, item) => sum + item.quantity * item.unitPrice, 0).toFixed(2)),
      productCount: goodsItems.filter((item) => item.goodsId).length,
      status: statusValue,
      sourceType: 'ENTERPRISE',
      customerType: customer?.type || currentRecord?.customerType || '--',
      warehouse: currentRecord?.warehouse && currentRecord.warehouse !== '--' ? currentRecord.warehouse : '中心仓',
      supplement: currentRecord?.supplement || '否',
      route: location?.route || currentRecord?.route || '--',
      receiver: location?.receiver || currentRecord?.receiver || '',
      phone: location?.phone || currentRecord?.phone || '',
      address: location?.address || currentRecord?.address || '',
      source: currentRecord?.source || '平台添加',
      creator: currentRecord?.creator || '当前用户',
      receiptStatus: '未收货',
      receivedAt: '',
      supplement: '否',
      shippingAmount: currentRecord?.shippingAmount || 0,
      returnAmount: currentRecord?.returnAmount || 0,
      reconciliationAmount: currentRecord?.reconciliationAmount || 0,
      driver: currentRecord?.driver || ''
    };
  }

  function validate() {
    clearErrors();
    const messages = {
      customerName: '请选择客户!',
      expectedAt: '请选择期望送达时间!',
      canteen: '请选择食堂!',
      orderTag: '请选择订单标签!'
    };
    let first = null;
    Object.entries(messages).forEach(([key, message]) => {
      const invalidExpectedAt = key === 'expectedAt' && !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(form.elements[key].value);
      if (!form.elements[key].value || invalidExpectedAt) {
        form.querySelector(`[data-error-for="${key}"]`).textContent = message;
        form.elements[key].setAttribute('aria-invalid', 'true');
        first ||= form.elements[key];
      }
    });
    const validItems = goodsItems.filter((item) => item.goodsId);
    if (!validItems.length) {
      document.getElementById('goodsTableError').textContent = '请至少添加一个商品';
      first ||= document.getElementById('batchAddGoods');
    }
    const invalidLine = validItems.find((item) => !(item.quantity > 0) || !(item.unitPrice >= 0));
    if (invalidLine) {
      document.getElementById('goodsTableError').textContent = '请完整填写商品下单数量和下单单价';
      first ||= goodsBody.querySelector(`[data-line-id="${invalidLine.id}"] input`);
    }
    first?.focus();
    return !first;
  }

  async function persist(statusValue) {
    if (!validate()) return;
    const data = readData(statusValue);
    const overLimit = goodsItems.find((item) => item.goodsId && item.marketPrice > 0 && item.unitPrice > item.marketPrice);
    if (overLimit && statusValue !== 'DRAFT') {
      overlay.innerHTML = `<div class="operations-modal-backdrop"><section class="operations-modal compact-modal" role="dialog" aria-label="限价提示">
        <header class="operations-modal-header"><h3>限价提示</h3><button data-overlay-close>×</button></header>
        <div class="operations-modal-body"><p>当前"${escapeHtml(overLimit.goodsName)}"价格超出教育局设置的限价范围，是否继续保存？</p></div>
        <footer class="operations-modal-footer"><button class="btn" data-overlay-close>取消</button><button class="btn btn-primary" id="continueSave">继续提交</button></footer>
      </section></div>`;
      document.getElementById('continueSave').onclick = () => { closeOverlay(); doPersist(data); };
      return;
    }
    await doPersist(data);
  }

  async function doPersist(data) {
    try {
      if (recordId && mode !== 'copy') await service.update('orders', recordId, data);
      else await service.create('orders', data);
      backToList(mode === 'edit' ? 'updated' : 'created');
    } catch (error) {
      toast(error.message || '订单保存失败', true);
    }
  }

  function rejectOrder() {
    overlay.innerHTML = `<div class="operations-modal-backdrop"><section class="operations-modal compact-modal" role="dialog" aria-label="驳回订单">
      <header class="operations-modal-header"><h3>审核</h3><button data-overlay-close>×</button></header>
      <div class="operations-modal-body"><label class="dialog-field required">驳回原因<textarea id="rejectReason" class="form-control" rows="4" placeholder="请输入驳回原因"></textarea><span id="rejectError" class="field-error"></span></label></div>
      <footer class="operations-modal-footer"><button class="btn" data-overlay-close>取消</button><button class="btn btn-primary" id="confirmReject">确定</button></footer>
    </section></div>`;
    document.getElementById('confirmReject').onclick = async () => {
      const reason = document.getElementById('rejectReason').value.trim();
      if (!reason) return (document.getElementById('rejectError').textContent = '请输入驳回原因!');
      await service.update('orders', recordId, { status: 'REJECTED', rejectReason: reason, auditAt: new Date().toISOString().slice(0, 16).replace('T', ' '), auditor: '当前用户' });
      backToList('reviewed');
    };
  }

  function getNetVegetableSummary(order) {
    const lines = getOrderLines(order);
    const netLines = lines.filter((line) => Boolean(
      window.NetVegetableService?.isNetVegetable?.(line)
      || service?.isNetVegetable?.(line)
    ));
    const configuredLines = [];
    const missingReferenceLines = [];
    netLines.forEach((line) => {
      let plan = null;
      try {
        plan = window.NetVegetableService?.getMaterialPlan?.(line);
      } catch (error) {
        plan = null;
      }
      const configured = Boolean(
        plan?.template
        && Array.isArray(plan.materials)
        && plan.materials.length
        && plan.materials.every((material) => (
          material.productCode
          && Number(material.referencePurchaseCoefficient) > 0
          && material.referencePurchaseQty != null
          && Number(material.referencePurchaseQty) > 0
          && Number.isFinite(Number(material.referencePurchaseQty))
        ))
      );
      (configured ? configuredLines : missingReferenceLines).push(line);
    });
    return { netLines, configuredLines, missingReferenceLines, hasNet: netLines.length > 0 };
  }

  function getNetVegetableName(line) {
    const rawName = line?.productName || line?.goodsName || line?.name || line?.goodsCode || line?.productCode || '未命名净菜';
    return String(rawName).split(/[（(]/)[0].trim() || '未命名净菜';
  }

  function openConfirmSupplyModal(order) {
    const summary = getNetVegetableSummary(order);
    let note = '';
    if (summary.hasNet) {
      const total = summary.netLines.length;
      const missing = summary.missingReferenceLines.length;
      if (!missing) {
        note = `<div class="net-order-confirm-note" role="note">订单包含 ${total} 个净菜商品，有有效参考采购量，确认后将自动生成原料采购任务。</div>`;
      } else {
        const missingNames = summary.missingReferenceLines.map(getNetVegetableName).join('、');
        const readyCount = summary.configuredLines.length;
        const detail = missing === total
          ? `订单包含 ${total} 个净菜商品（${escapeHtml(missingNames)}），没有有效参考采购量，不会自动生成原料采购任务。`
          : `订单包含 ${total} 个净菜商品，其中 ${missing} 个没有有效参考采购量（${escapeHtml(missingNames)}），不会生成对应的原料采购任务；其余 ${readyCount} 个将按参考采购量自动生成。`;
        note = `<div class="net-order-confirm-note is-warning" role="note">${detail}</div>`;
      }
    }
    overlay.innerHTML = `<div class="operations-modal-backdrop"><section class="operations-modal is-confirm net-order-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirmSupplyTitle">
      <header class="operations-modal-header"><h3 id="confirmSupplyTitle">确认供货</h3><button type="button" data-overlay-close aria-label="关闭">×</button></header>
      <div class="operations-modal-body net-order-confirm-body"><p class="net-order-confirm-question">确认供货吗？</p>${note}</div>
      <footer class="operations-modal-footer"><button class="btn" type="button" data-overlay-close>取消</button><button class="btn btn-primary" type="button" data-action="confirm-supply-submit">确定</button></footer>
    </section></div>`;
  }

  function getOrderLines(order) {
    if (Array.isArray(order?.items) && order.items.length) return order.items;
    if (Array.isArray(order?.orderLines) && order.orderLines.length) return order.orderLines;
    if (Array.isArray(order?.lines) && order.lines.length) return order.lines;
    return [];
  }

  function configureMode() {
    document.getElementById('draftButton').hidden = readonlyMode;
    document.getElementById('rejectButton').hidden = mode !== 'audit';
    document.getElementById('batchAddGoods').hidden = readonlyMode;
    const footerBack = document.querySelector('.order-form-actions [data-action="back"]');
    if (footerBack) footerBack.hidden = mode === 'confirm';
    const primary = document.getElementById('primaryButton');
    if (mode === 'audit') {
      primary.textContent = '通过';
      primary.dataset.action = 'approve';
    } else if (mode === 'confirm') {
      primary.textContent = '确认供货';
      primary.dataset.action = 'confirm';
    } else {
      primary.textContent = '保存订单';
    }
    if (readonlyMode) form.querySelectorAll('input, select, textarea').forEach((control) => { control.disabled = true; });
  }

  async function loadRecord() {
    refreshCatalog();
    if (!recordId) {
      // 添加模式：默认显示5行空商品选择框
      populateCustomers('');
      refreshCanteens();
      goodsItems = [];
      for (let i = 0; i < DEFAULT_ROW_COUNT; i++) {
        goodsItems.push(createEmptyGoodsItem());
      }
      renderGoods();
      configureMode();
      return;
    }
    currentRecord = await service.get('orders', recordId);
    if (!currentRecord) {
      toast('订单不存在或已删除', true);
      configureMode();
      return;
    }
    populateCustomers(currentRecord.customerName || '');
    form.elements.customerName.value = currentRecord.customerName || '';
    refreshCanteens(currentRecord.canteen);
    expectedAtPicker?.setValue(normalizeExpectedAt(currentRecord.expectedAt || ''), false);
    form.elements.orderTag.value = currentRecord.orderTag || '';
    form.elements.remark.value = currentRecord.remark || '';
    const storedLines = getOrderLines(currentRecord);
    if (storedLines.length) {
      goodsItems = storedLines.map(normalizedItem);
    } else {
      goodsItems = [];
      for (let i = 0; i < DEFAULT_ROW_COUNT; i++) {
        goodsItems.push(createEmptyGoodsItem());
      }
    }
    if (mode === 'copy') currentRecord = { ...currentRecord, creator: '当前用户' };
    renderGoods();
    configureMode();
  }

  // 关闭所有已打开的商品选择下拉框
  function closeAllGoodsSelects(except) {
    document.querySelectorAll('.order-goods-select.is-open').forEach((s) => {
      if (s !== except) {
        s.classList.remove('is-open');
        const dd = s.querySelector('.custom-select-dropdown');
        if (dd) dd.style.display = 'none';
      }
    });
  }

  // 切换商品选择下拉框显隐（fixed 定位，智能上下展开）
  function toggleGoodsSelect(select) {
    closeAllGoodsSelects(select);
    const dropdown = select.querySelector('.custom-select-dropdown');
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
    dropdown.style.left = rect.left + 'px';
    dropdown.style.width = rect.width + 'px';
    dropdown.style.zIndex = '100';
    const viewportH = window.innerHeight;
    const spaceBelow = viewportH - rect.bottom - 10;
    const spaceAbove = rect.top - 10;
    if (spaceBelow >= 120) {
      dropdown.style.top = rect.bottom + 'px';
      dropdown.style.maxHeight = Math.min(240, spaceBelow) + 'px';
    } else {
      dropdown.style.top = (rect.top - Math.min(240, spaceAbove)) + 'px';
      dropdown.style.maxHeight = Math.min(240, spaceAbove) + 'px';
    }
  }

  // 选中商品后：更新当前行数据，如果最后一行已选中商品则自动新增空行
  function selectGoods(select, option) {
    if (option.dataset.disabled === 'true') return;
    const lineId = select.dataset.lineId;
    const productCode = option.dataset.value;
    const product = catalog.find((p) => p.id === productCode);
    if (!product) return;
    const item = goodsItems.find((entry) => entry.id === lineId);
    if (!item) return;
    item.goodsId = product.id;
    item.goodsCode = product.id;
    item.goodsName = product.goodsName;
    item.productName = product.productName;
    item.unit = product.unit;
    item.brand = product.brand;
    item.spec = product.spec;
    item.isNetVegetable = product.isNetVegetable;
    item.agreementPrice = product.agreementPrice;
    item.lastPrice = product.lastPrice;
    item.marketPrice = product?.marketPrice || 0;
    if (!item.unitPrice) item.unitPrice = product.agreementPrice;

    // 如果最后一行已选中商品，自动新增一行空选择框
    const lastItem = goodsItems[goodsItems.length - 1];
    if (lastItem.goodsId) {
      goodsItems.push(createEmptyGoodsItem());
    }
    renderGoods();
  }

  root.addEventListener('change', (event) => {
    if (event.target.matches('.filter-select')) event.target.classList.toggle('has-value', Boolean(event.target.value));
    if (event.target === form.elements.customerName) refreshCanteens();
    const row = event.target.closest('[data-line-id]');
    if (row && event.target.dataset.field) {
      const item = goodsItems.find((entry) => entry.id === row.dataset.lineId);
      item[event.target.dataset.field] = event.target.dataset.field === 'remark' ? event.target.value : Number(event.target.value);
      renderGoods();
    }
  });

  root.addEventListener('input', (event) => {
    const row = event.target.closest('[data-line-id]');
    if (row && event.target.dataset.field) {
      const item = goodsItems.find((entry) => entry.id === row.dataset.lineId);
      item[event.target.dataset.field] = event.target.dataset.field === 'remark' ? event.target.value : Number(event.target.value);
      row.querySelector('.line-subtotal').textContent = money(item.quantity * item.unitPrice);
      document.getElementById('goodsTotal').textContent = money(goodsItems.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0));
    }
  });

  root.addEventListener('click', async (event) => {
    // 商品选择下拉框交互
    if (event.target.closest('[data-action="toggle-goods-select"]')) {
      event.stopPropagation();
      const select = event.target.closest('.order-goods-select');
      toggleGoodsSelect(select);
      return;
    }
    if (event.target.closest('[data-action="select-goods"]')) {
      event.stopPropagation();
      const option = event.target.closest('.custom-select-option');
      const select = option.closest('.order-goods-select');
      selectGoods(select, option);
      return;
    }
    if (event.target.closest('[data-overlay-close]')) return closeOverlay();
    if (event.target.closest('#batchAddGoods')) return openGoodsModal();
    if (event.target.closest('#confirmGoods')) {
      const rows = overlay.querySelectorAll('.goods-picker-row:not(.goods-picker-header)');
      const newItems = [];
      rows.forEach((row) => {
        const checkbox = row.querySelector('input[type="checkbox"]');
        const qtyInput = row.querySelector('.picker-qty-input');
        if (checkbox && checkbox.checked && qtyInput && qtyInput.value) {
          const id = checkbox.value;
          const exists = goodsItems.some((item) => item.goodsId === id);
          if (!exists) {
            const item = normalizedItem(catalog.find((entry) => entry.id === id));
            item.quantity = Number(qtyInput.value);
            newItems.push(item);
          }
        }
      });
      if (!newItems.length) return toast('请勾选商品并填写下单数量', true);
      // 移除空行，添加选中商品，再补一个空行
      goodsItems = goodsItems.filter((item) => item.goodsId);
      goodsItems = [...goodsItems, ...newItems];
      goodsItems.push(createEmptyGoodsItem());
      closeOverlay();
      return renderGoods();
    }
    const remove = event.target.closest('[data-remove-line]');
    if (remove) {
      const id = remove.closest('[data-line-id]').dataset.lineId;
      if (goodsItems.length === 1) return toast('至少保留一个商品', true);
      goodsItems = goodsItems.filter((item) => item.id !== id);
      return renderGoods();
    }
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'back') return backToList();
    if (action === 'draft') return persist('DRAFT');
    if (action === 'save') return persist('PENDING');
    if (action === 'reject') return rejectOrder();
    if (action === 'approve') {
      if (!window.confirm('确定通过审核吗？')) return;
      await service.transition('orders', recordId, 'approve');
      return backToList('reviewed');
    }
    if (action === 'confirm-supply-submit') {
      const submitButton = event.target.closest('[data-action="confirm-supply-submit"]');
      if (submitButton) submitButton.disabled = true;
      try {
        const confirmedOrder = await service.transition('orders', recordId, 'confirm');
        try {
          window.PurchaseService?.generateNetVegetableTasks?.(confirmedOrder);
        } catch (error) {
          console.error('净菜原料采购任务生成失败', error);
        }
        closeOverlay();
        return backToList('confirmed');
      } catch (error) {
        if (submitButton) submitButton.disabled = false;
        return toast(error.message || '确认供货失败', true);
      }
    }
    if (action === 'confirm') {
      return openConfirmSupplyModal(currentRecord);
    }
  });

  // 点击页面空白处关闭所有商品选择下拉框
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.order-goods-select')) {
      closeAllGoodsSelects();
    }
  });

  // 下拉面板使用 fixed 定位；页面或表格滚动后原锚点会移动，因此及时收起。
  // 面板内部滚动仍然保留，方便浏览较长的商品列表。
  document.addEventListener('scroll', (event) => {
    const scrollTarget = event.target;
    if (scrollTarget instanceof Element && scrollTarget.closest('.custom-select-dropdown')) return;
    closeAllGoodsSelects();
  }, true);
  window.addEventListener('resize', () => closeAllGoodsSelects());

  loadRecord();
})();
