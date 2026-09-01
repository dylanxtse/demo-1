(function () {
  const addIcon = '<svg class="icon-svg" viewBox="0 0 24 24" style="width:14px;height:14px;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
  const searchIcon = '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/></svg>';
  const backIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/><path d="M19 12H9"/></svg>';
  const settingsIcon = '<svg class="icon-svg" viewBox="0 0 24 24" style="width:14px;height:14px;"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
  const recordIcon = '<svg class="icon-svg" viewBox="0 0 24 24" style="width:14px;height:14px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>';
  const coefficientHints = Object.freeze({
    materialDemand: '生产 1 个单位成品预计需要消耗的原料数量，用于按成品需求量倒推原料需求量。例如：生产 1kg 成品需 1.2kg 原料，填写 1.2。',
    outputCoefficient: '投入 1 个单位原料预计可加工产出的成品数量，用于按原料投入量计算成品参考产出量。例如：投入 1kg 原料可产出 0.8kg 成品，填写 0.8。'
  });

  const warehouses = (window.DemoStore?.get('warehouses') || []).map((warehouse) => warehouse.warehouseName || warehouse.name).filter(Boolean);
  const defaultWarehouse = warehouses[0] || '';
  const customers = ['全部', ...(window.MasterDataService?.listCustomers({ status: 'ENABLE' }) || []).map((customer) => customer.customerName)];

  function getLocalDateString(offsetDays = 0) {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function getDefaultExpectedDeliveryDate() {
    return '';
  }

  function isDateWithinRange(date, startDate, endDate) {
    return Boolean(date)
      && (!startDate || date >= startDate)
      && (!endDate || date <= endDate);
  }

  function hasExpectedDeliveryRange() {
    return Boolean(state.expectedDeliveryStart && state.expectedDeliveryEnd);
  }

  function isOrderDemandQueryActive() {
    return state.operationMode === 'order'
      && state.orderDemandQueryActive
      && hasExpectedDeliveryRange();
  }

  function clearOrderDemandFilter() {
    state.orderDemandQueryActive = false;
    state.orderDemandProducts = [];
    state.missingOrderDemandProducts = [];
  }

  function getSortingRecords() {
    if (!window.OrderFlowService?.getProcessingDemand) throw new Error('统一业务流程数据源未加载');
    return window.OrderFlowService.getProcessingDemand().map((record) => ({
      ...record,
      customer: record.customerName,
      productCode: record.productId || record.goodsCode,
      orderSortingQty: Number(record.actualQty || 0),
      sortingCompleted: true
    }));
  }

  function getCanteenOptions() {
    return ['全部', ...new Set(getSortingRecords().map((record) => record.canteen).filter(Boolean))];
  }

  function normalizeGoodsName(value) {
    return String(value || '').split('(')[0].trim();
  }

  function getOrderDemandProducts() {
    const startDate = state.expectedDeliveryStart;
    const endDate = state.expectedDeliveryEnd;
    const products = new Map();
    getSortingRecords().forEach((record) => {
      const deliveryDate = String(record.expectedAt || record.expectedDeliveryDate || record.deliveryDate || '').slice(0, 10);
      if (!isDateWithinRange(deliveryDate, startDate, endDate)) return;
      if (state.customer !== '全部'
        && record.customer !== state.customer
        && record.customerName !== state.customer) return;
      if (state.canteen !== '全部' && record.canteen !== state.canteen) return;

      const productCode = record.goodsCode || record.productCode || '';
      const product = findProduct(productCode);
      if (record.isNetVegetable === false || (!record.isNetVegetable && !product?.isNetVegetable)) return;
      if (!(Number(record.orderQty ?? record.quantity) > 0)) return;

      const productName = product?.name || normalizeGoodsName(record.goodsName) || productCode;
      const sortedQty = Number(record.orderSortingQty ?? record.actualQty);
      const demandQty = sortedQty > 0 ? sortedQty : Number(record.orderQty ?? record.quantity) || 0;
      const unit = record.unit || product?.unit || '--';
      const key = productCode || productName;
      const current = products.get(key);
      if (current) {
        current.quantity += demandQty;
      } else {
        products.set(key, { code: productCode, name: productName, quantity: demandQty, unit });
      }
    });
    return [...products.values()];
  }

  function formatDemandQuantity(product) {
    const quantity = Number(product.quantity);
    const quantityText = Number.isFinite(quantity)
      ? (Number.isInteger(quantity) ? String(quantity) : String(Number(quantity.toFixed(2))))
      : '--';
    return `${quantityText}${product.unit || ''}`;
  }

  function templateMatchesDemandProduct(template, demandProduct) {
    return (template.outputs || []).some((output) => {
      const outputName = normalizeGoodsName(output.productName);
      return (demandProduct.code && output.productCode === demandProduct.code)
        || (demandProduct.name && outputName === demandProduct.name);
    });
  }

  function templateMatchesOrderDemand(template, demandProducts) {
    return demandProducts.some((product) => templateMatchesDemandProduct(template, product));
  }

  function getTemplateDemandDisplay(template) {
    if (!isOrderDemandQueryActive()) return { label: '', tooltip: '', extraCount: 0 };
    const demands = state.orderDemandProducts
      .filter((product) => templateMatchesDemandProduct(template, product))
      .map((product) => product.name);
    return {
      label: demands[0] || '',
      tooltip: demands.length > 1 ? demands.join('；') : '',
      extraCount: Math.max(0, demands.length - 1)
    };
  }

  function getOrderDemandNotice() {
    if (!isOrderDemandQueryActive()) return '';
    if (state.orderDemandProducts.length === 0) {
      return '<div class="template-demand-notice is-empty">当前查询条件下暂无净菜订单需求</div>';
    }
    if (state.missingOrderDemandProducts.length === 0) return '';
    return `<div class="template-demand-notice">${state.missingOrderDemandProducts.map((product) => `
      <div class="template-demand-notice-row">
        <span>${escapeHtml(product.name)} ${escapeHtml(formatDemandQuantity(product))}</span>
        <button class="btn btn-sm btn-blue" type="button" data-action="create-template-for-demand" data-product-code="${escapeHtml(product.code)}" data-product-name="${escapeHtml(product.name)}">新增方案</button>
      </div>
    `).join('')}</div>`;
  }

  function getCompletedProcessingQty(productCode) {
    const startDate = state.expectedDeliveryStart;
    const endDate = state.expectedDeliveryEnd;
    return (window.ProcessingService?.getList?.() || [])
      .filter((order) => {
        if (order.status !== 'COMPLETED') return false;
        const orderStart = String(order.expectedDeliveryStart || '').slice(0, 10);
        const orderEnd = String(order.expectedDeliveryEnd || '').slice(0, 10);
        if (!orderStart || !orderEnd) return false;
        if (startDate && orderEnd < startDate) return false;
        if (endDate && orderStart > endDate) return false;
        const customerMatch = state.customer === '全部'
          || !order.customer
          || order.customer === state.customer;
        const canteenMatch = state.canteen === '全部'
          || !order.canteen
          || order.canteen === state.canteen;
        return customerMatch && canteenMatch;
      })
      .reduce((total, order) => total + (order.outputs || [])
        .filter((output) => output.productCode === productCode)
        .reduce((subtotal, output) => subtotal + (Number(output.actualQty) || 0), 0), 0);
  }

  function getOrderLineRefs(productCode) {
    const startDate = state.expectedDeliveryStart;
    const endDate = state.expectedDeliveryEnd;
    if (state.operationMode !== 'order') return [];
    return getSortingRecords()
      .filter((record) => {
        const deliveryDate = String(record.expectedAt || record.expectedDeliveryDate || record.deliveryDate || '').slice(0, 10);
        if (!isDateWithinRange(deliveryDate, startDate, endDate)) return false;
        if (record.goodsCode !== productCode && record.productCode !== productCode) return false;
        const orderProduct = findProduct(record.goodsCode || record.productCode);
        if (record.isNetVegetable === false && !orderProduct?.isNetVegetable) return false;
        const customerMatch = state.customer === '全部'
          || !record.customer
          || record.customer === state.customer
          || record.customerName === state.customer;
        const canteenMatch = state.canteen === '全部'
          || !record.canteen
          || record.canteen === state.canteen;
        return customerMatch && canteenMatch;
      })
      .map((record) => ({
        orderId: record.orderId || '',
        orderLineId: record.orderLineId || '',
        sortedQty: Number(record.orderSortingQty ?? record.actualQty) || 0
      }))
      .filter((record) => record.orderId && record.orderLineId);
  }

  /* ===== 页面骨架 HTML ===== */
  const workspaceHTML = `
    <div class="page-card processing-workspace">
      <div class="processing-template-panel">
        <div class="template-panel-header">
          <span class="template-panel-title">加工方案</span>
          <button class="btn btn-sm btn-blue" type="button" data-action="create-template">${addIcon}新增方案</button>
        </div>
        <div class="template-search">
          <input class="template-search-input" id="templateSearch" placeholder="搜索加工方案名称/编号" type="text">
          <span class="template-search-icon" aria-hidden="true">${searchIcon}</span>
        </div>
        <div class="template-list" id="templateList"></div>
      </div>
      <div class="processing-operation-panel" id="operationPanel">
        <div class="operation-form" id="operationForm"></div>
      </div>
    </div>
  `;

  const pageContent = workspaceHTML + `
    <div class="template-editor-page" id="templateEditorPage" style="display:none;"></div>
    <div class="processing-submit-modal" id="processingSubmitConfirmModal" aria-hidden="true">
      <div class="processing-submit-dialog" role="dialog" aria-modal="true" aria-labelledby="processingSubmitConfirmTitle">
        <div class="processing-submit-header">
          <h2 id="processingSubmitConfirmTitle">确认提交加工单</h2>
          <button class="processing-submit-close" type="button" data-action="close-processing-submit" aria-label="关闭">×</button>
        </div>
        <div class="processing-submit-body" id="processingSubmitConfirmMessage"></div>
        <div class="processing-submit-footer">
          <button class="btn" type="button" data-action="close-processing-submit">取消</button>
          <button class="btn btn-primary" type="button" data-action="confirm-processing-submit">确认提交</button>
        </div>
      </div>
    </div>
  `;

  /* ===== 状态 ===== */
  const state = {
    templates: window.ProcessingTemplateService.getList(),
    filteredTemplates: [],
    selectedTemplateId: null,
    products: window.ProcessingService.getProducts(),
    // 操作表单
    processingDate: '',
    expectedDeliveryStart: getDefaultExpectedDeliveryDate(),
    expectedDeliveryEnd: getDefaultExpectedDeliveryDate(),
    customer: '全部',
    canteen: '全部',
    materialWarehouse: '',
    outputWarehouse: '',
    remark: '',
    attachments: [],
    operationMode: 'plan',
    orderDemandQueryActive: false,
    orderDemandProducts: [],
    missingOrderDemandProducts: [],
    costMode: 'auto',
    materials: [],
    manyToOneBaseMaterialIndex: null,
    outputs: [],
    // 方案编辑器
    templateEditMode: null,    // 'create' | 'edit'
    templateEditData: null,
    pendingSubmitData: null
  };
  const MATERIAL_LIMIT = 20;
  const OUTPUT_LIMIT = 200;
  let orderDatePicker = null;
  let processingDatePicker = null;

  /* ===== 工具函数 ===== */
  function escapeHtml(value) {
    return window.DomUtils.escapeHtml(value);
  }

  function renderCoefficientHint(text) {
    return `<span class="processing-header-help" tabindex="0" role="img" aria-label="查看字段说明" data-tooltip="${escapeHtml(text)}"><svg class="processing-header-help-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M5.2 5.7c.1-1.4 1.2-2.3 2.8-2.3 1.7 0 2.8 1 2.8 2.5 0 1.1-.6 1.8-1.7 2.5-.9.6-1.3 1.1-1.3 2.1" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round"/><circle cx="7.9" cy="12.7" r=".75" fill="currentColor"/></svg></span>`;
  }

  function renderCoefficientHeader(label, text) {
    return `<span class="processing-header-content"><span>${label}</span>${renderCoefficientHint(text)}</span>`;
  }

  function findProduct(code) {
    return state.products.find((p) => p.code === code) || null;
  }

  function getProductDisplayData(item = {}, code = '') {
    const product = findProduct(code || item.productCode || item.goodsCode || item.code);
    return {
      product,
      name: product?.name || item.productName || item.goodsName || item.name || '--',
      unit: product?.unit || item.unit || '--',
      brand: product?.brand || item.brand || '--',
      spec: product?.spec || item.spec || '--'
    };
  }

  function formatProductDisplay(item = {}, code = '') {
    const { name, unit, brand, spec } = getProductDisplayData(item, code);
    return `${name}（${unit}/${brand}/${spec}）`;
  }

  function getProductSearchText(product = {}) {
    return [product.code, product.name, product.unit, product.brand, product.spec]
      .filter((value) => value !== undefined && value !== null && String(value).trim())
      .join(' ')
      .toLowerCase();
  }

  function filterProductSelectOptions(select, searchValue = '') {
    if (!select) return;
    const keyword = String(searchValue || '').trim().toLowerCase();
    let visibleCount = 0;
    select.querySelectorAll('.custom-select-option').forEach((option) => {
      const searchableText = String(option.dataset.searchText || option.textContent || '').toLowerCase();
      const isVisible = !keyword || searchableText.includes(keyword);
      option.style.display = isVisible ? '' : 'none';
      if (isVisible) visibleCount += 1;
    });
    const emptyState = select.querySelector('.product-select-empty');
    if (emptyState) {
      emptyState.textContent = visibleCount > 0 ? '' : (keyword ? '暂无匹配商品' : '暂无商品');
      emptyState.style.display = visibleCount > 0 ? 'none' : 'block';
    }
  }

  function productNetTag(productCode) {
    const product = findProduct(productCode);
    return product?.isNetVegetable ? '<span class="net-vegetable-tag">净菜</span>' : '';
  }

  function renderProductSelect(fieldType, selectedCode, isTemplateProduct = false, outputIndex = null) {
    const selectedProduct = selectedCode ? findProduct(selectedCode) : null;
    const netTag = selectedProduct?.isNetVegetable ? '<span class="net-vegetable-tag">净菜</span>' : '';
    const displayText = selectedProduct ? escapeHtml(formatProductDisplay(selectedProduct)) : '';
    const closedDisplayText = selectedProduct ? displayText : '请选择';
    const isManyToOneMaterial = fieldType === 'material'
      && state.templateEditData?.relationType === 'many-to-one';
    const selectedOutputCodes = fieldType === 'output'
      ? (state.templateEditData?.outputs || []).map((output) => output.productCode).filter(Boolean)
      : [];
    const selectedMaterialCodes = isManyToOneMaterial
      ? (state.templateEditData?.materials || []).map((material) => material.productCode).filter(Boolean)
      : [];
    return `
      <div class="custom-select ${isTemplateProduct ? 'template-product-select' : ''}" data-select-type="${fieldType}">
        <div class="custom-select-trigger" data-action="toggle-select">
          <span class="template-product-label">
            ${netTag}
            <span class="custom-select-text ${!selectedProduct ? 'is-placeholder' : ''}">${closedDisplayText}</span>
            <input class="product-combobox-input" type="text" value="${displayText}" data-display-value="${displayText}" placeholder="搜索商品名称/编码" autocomplete="off" aria-label="搜索并选择商品" aria-autocomplete="list" aria-expanded="false" data-action="product-combobox-input">
          </span>
          <svg class="custom-select-arrow" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="custom-select-dropdown">
          <div class="product-select-options">
            ${state.products.map((p) => {
              const tag = p.isNetVegetable ? '<span class="net-vegetable-tag">净菜</span>' : '';
              const isDuplicate = fieldType === 'output'
                ? p.code !== selectedCode && selectedOutputCodes.includes(p.code)
                : isManyToOneMaterial
                  ? p.code !== selectedCode && selectedMaterialCodes.includes(p.code)
                  : false;
              return `<div class="custom-select-option ${p.code === selectedCode ? 'selected' : ''} ${isDuplicate ? 'is-disabled' : ''}" data-value="${escapeHtml(p.code)}" data-search-text="${escapeHtml(getProductSearchText(p))}" data-disabled="${isDuplicate}" data-action="select-product">${tag}${escapeHtml(formatProductDisplay(p))}</div>`;
            }).join('')}
            ${isTemplateProduct ? '<div class="product-select-empty">暂无商品</div>' : ''}
          </div>
        </div>
      </div>
    `;
  }

  function renderWarehouseSelect(selectedWarehouse, warehouseScope = '') {
    const displayText = selectedWarehouse ? escapeHtml(selectedWarehouse) : '请选择';
    return `
      <div class="custom-select" data-select-type="warehouse" data-warehouse-scope="${warehouseScope}">
        <div class="custom-select-trigger" data-action="toggle-select">
          <span class="custom-select-text ${!selectedWarehouse ? 'is-placeholder' : ''}">${displayText}</span>
          <svg class="custom-select-arrow" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="custom-select-dropdown">
          ${warehouses.map((w) => `<div class="custom-select-option ${w === selectedWarehouse ? 'selected' : ''}" data-value="${escapeHtml(w)}" data-action="select-warehouse">${escapeHtml(w)}</div>`).join('')}
        </div>
      </div>
    `;
  }

  function renderOperationModeTabs() {
    return `
      <div class="operation-mode-tabs" role="tablist" aria-label="加工模式">
        <button class="operation-mode-tab ${state.operationMode === 'plan' ? 'active' : ''}" type="button" role="tab" aria-selected="${state.operationMode === 'plan'}" data-action="switch-operation-mode" data-mode="plan">按计划加工</button>
        <button class="operation-mode-tab ${state.operationMode === 'order' ? 'active' : ''}" type="button" role="tab" aria-selected="${state.operationMode === 'order'}" data-action="switch-operation-mode" data-mode="order">按订单加工</button>
        <button class="btn btn-sm btn-fixed operation-record-button" type="button" data-action="goto-records">${recordIcon}加工记录</button>
      </div>
    `;
  }

  function renderOperationEmpty() {
    return `
      <div class="operation-empty" id="operationEmpty">
        <div class="operation-empty-icon">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        </div>
        <p>请从左侧选择加工方案</p>
      </div>
    `;
  }

  function renderOrderProcessingContext() {
    return `
      <div class="order-processing-query">
        <div class="order-processing-query-header">
          <span class="section-title-mark">订单需求查询</span>
        </div>
        <div class="order-processing-context">
          <div class="basic-info-field date-range-group">
            <label class="field-label" for="opExpectedDeliveryDisplay">期望送达时间</label>
            <div class="date-range-picker order-date-range-picker" id="opExpectedDeliveryRange">
              <input class="form-control date-range-display" id="opExpectedDeliveryDisplay" data-action="toggle-order-date" placeholder="请选择日期" readonly>
              <span class="date-range-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></span>
              <input type="hidden" id="opExpectedDeliveryStart" value="${escapeHtml(state.expectedDeliveryStart)}">
              <input type="hidden" id="opExpectedDeliveryEnd" value="${escapeHtml(state.expectedDeliveryEnd)}">
            </div>
          </div>
          <div class="basic-info-field">
            <label class="field-label" for="opCustomer">客户名称</label>
            <select class="form-control" id="opCustomer">
              ${customers.map((customer) => `<option value="${escapeHtml(customer)}" ${customer === state.customer ? 'selected' : ''}>${escapeHtml(customer)}</option>`).join('')}
            </select>
          </div>
          <div class="basic-info-field">
            <label class="field-label" for="opCanteen">食堂名称</label>
            <select class="form-control" id="opCanteen">
              ${getCanteenOptions().map((canteen) => `<option value="${escapeHtml(canteen)}" ${canteen === state.canteen ? 'selected' : ''}>${escapeHtml(canteen)}</option>`).join('')}
            </select>
          </div>
          <div class="order-processing-query-actions">
            <button class="btn btn-primary btn-sm order-processing-query-button" type="button" data-action="query-order-demand">查询</button>
            <button class="btn btn-sm order-processing-reset-button" type="button" data-action="reset-order-demand">重置</button>
          </div>
        </div>
      </div>
    `;
  }

  function mountOrderProcessingDatePicker() {
    orderDatePicker?.destroy();
    orderDatePicker = window.DateRangePicker.mount({
      container: '#opExpectedDeliveryRange',
      displayInput: '#opExpectedDeliveryDisplay',
      startInput: '#opExpectedDeliveryStart',
      endInput: '#opExpectedDeliveryEnd',
      panelId: 'opExpectedDeliveryCalendarPanel',
      onChange: ({ startDate, endDate }) => {
        state.expectedDeliveryStart = startDate;
        state.expectedDeliveryEnd = endDate;
        if (!hasExpectedDeliveryRange()) {
          clearOrderDemandFilter();
          renderTemplateList();
        }
        renderOpOutputTable();
      }
    });
  }

  /* ===== 左侧：模版列表渲染 ===== */
  function renderTemplateList() {
    const searchValue = (document.getElementById('templateSearch')?.value || '').trim().toLowerCase();
    const demandQueryActive = isOrderDemandQueryActive();
    if (demandQueryActive) {
      state.missingOrderDemandProducts = state.orderDemandProducts.filter((product) =>
        !state.templates.some((template) => templateMatchesOrderDemand(template, [product]))
      );
    }
    const sourceTemplates = demandQueryActive
      ? state.templates.filter((template) => templateMatchesOrderDemand(template, state.orderDemandProducts))
      : state.templates;
    state.filteredTemplates = sourceTemplates.filter((t) =>
      !searchValue ||
      t.name.toLowerCase().includes(searchValue) ||
      (t.description || '').toLowerCase().includes(searchValue)
    );

    const container = document.getElementById('templateList');
    if (state.filteredTemplates.length === 0) {
      container.innerHTML = getOrderDemandNotice() || '<div class="template-list-empty">暂无加工方案</div>';
      return;
    }

    container.innerHTML = getOrderDemandNotice() + state.filteredTemplates.map((tpl) => {
      const isSelected = tpl.id === state.selectedTemplateId;
      const materialNames = (tpl.materials || []).map((m) => escapeHtml(formatProductDisplay(m))).join('、');
      const outputNames = (tpl.outputs || []).map((o) => escapeHtml(formatProductDisplay(o))).join('、');
      const demandDisplay = getTemplateDemandDisplay(tpl);
      const demandBadge = demandDisplay.label
        ? `<span class="template-demand-badge${demandDisplay.tooltip ? ' has-tooltip' : ''}"${demandDisplay.tooltip ? ` data-tooltip="${escapeHtml(demandDisplay.tooltip)}" aria-label="${escapeHtml(demandDisplay.tooltip)}"` : ''}><span class="template-demand-label">${escapeHtml(demandDisplay.label)}</span>${demandDisplay.extraCount ? `<span class="template-demand-more">等${demandDisplay.extraCount + 1}项</span>` : ''}</span>`
        : '';
      return `
        <div class="template-card ${isSelected ? 'selected' : ''}" data-template-id="${escapeHtml(tpl.id)}" data-action="select-template">
          <div class="template-card-header">
            <span class="template-card-name">${escapeHtml(tpl.name)}</span>
            ${demandBadge}
          </div>
          <div class="template-card-desc">${escapeHtml(tpl.description || '')}</div>
          <div class="template-card-flow">
            <span class="flow-label">原料：</span>
            <span class="flow-content">${materialNames || '--'}</span>
          </div>
          <div class="template-card-flow">
            <span class="flow-label">成品：</span>
            <span class="flow-content">${outputNames || '--'}</span>
          </div>
          <div class="template-card-bottom">
            <span class="template-card-id">${escapeHtml(tpl.id || '--')}</span>
            <div class="template-card-actions">
              <button class="btn-text" type="button" data-action="edit-template" data-tpl-id="${escapeHtml(tpl.id)}">编辑</button>
              <button class="btn-text danger" type="button" data-action="delete-template" data-tpl-id="${escapeHtml(tpl.id)}">删除</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function applyOrderDemandQuery() {
    if (!hasExpectedDeliveryRange()) {
      clearOrderDemandFilter();
      const selectedTemplate = state.templates.find((template) => template.id === state.selectedTemplateId);
      if (selectedTemplate) renderOpOutputTable();
      renderTemplateList();
      return;
    }
    state.orderDemandQueryActive = true;
    state.orderDemandProducts = getOrderDemandProducts();
    state.missingOrderDemandProducts = state.orderDemandProducts
      .filter((product) => !state.templates.some((template) => templateMatchesOrderDemand(template, [product])))
      .map((product) => ({ ...product }));

    const selectedTemplate = state.templates.find((template) => template.id === state.selectedTemplateId);
    if (selectedTemplate && !templateMatchesOrderDemand(selectedTemplate, state.orderDemandProducts)) {
      state.selectedTemplateId = null;
      state.materials = [];
      state.outputs = [];
      renderOperationForm();
    } else if (selectedTemplate) {
      renderOpOutputTable();
    }
    renderTemplateList();
  }

  function resetOrderDemandQuery() {
    clearOrderDemandFilter();
    state.expectedDeliveryStart = '';
    state.expectedDeliveryEnd = '';
    state.customer = '全部';
    state.canteen = '全部';
    orderCalendarState.startDate = '';
    orderCalendarState.endDate = '';
    hideOrderDatePicker();
    renderOperationForm();
    renderTemplateList();
  }

  /* ===== 右侧：操作表单渲染 ===== */
  function renderOperationForm() {
    const tpl = state.templates.find((t) => t.id === state.selectedTemplateId);
    const form = document.getElementById('operationForm');

    if (!tpl) {
      form.style.display = 'flex';
      form.classList.toggle('is-order-mode', state.operationMode === 'order');
      form.innerHTML = renderOperationModeTabs()
        + (state.operationMode === 'order' ? renderOrderProcessingContext() : '')
        + renderOperationEmpty();
      if (state.operationMode === 'order') mountOrderProcessingDatePicker();
      bindOperationFormEvents();
      return;
    }

    form.style.display = 'flex';
    form.classList.toggle('is-order-mode', state.operationMode === 'order');
    hideOrderDatePicker();
    const isManyToOne = tpl.relationType === 'many-to-one';
    const showOrderDemandColumns = state.operationMode === 'order';
    form.innerHTML = `
      ${renderOperationModeTabs()}
      ${state.operationMode === 'order' ? renderOrderProcessingContext() : ''}
      <div class="operation-form-header">
        <div class="operation-form-title-group">
          <h1>${escapeHtml(tpl.name)}</h1>
          <span class="operation-form-desc">${escapeHtml(tpl.description || '')}</span>
        </div>
      </div>
      <div class="operation-form-status" id="operationFormStatus" role="status"></div>
      <div class="operation-form-body" id="operationFormBody">
        <div class="form-section">
          <div class="form-section-header"><span class="section-title-mark">基本信息</span></div>
          <div class="form-section-body">
            <div class="basic-info-grid">
              <div class="basic-info-field">
                <label class="field-label required" for="opProcessingDate">加工日期</label>
                <div class="date-input-control">
                  <input class="form-control" id="opProcessingDate" type="text" readonly placeholder="请选择日期">
                  <span class="date-range-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></span>
                </div>
              </div>
              <div class="basic-info-field">
                <label class="field-label required" for="opMaterialWarehouse">原料出库</label>
                <select class="form-control" id="opMaterialWarehouse">
                  <option value="" disabled hidden>请选择</option>
                  ${warehouses.map((w) => `<option value="${w}" ${w === state.materialWarehouse ? 'selected' : ''}>${w}</option>`).join('')}
                </select>
              </div>
              <div class="basic-info-field">
                <label class="field-label required" for="opOutputWarehouse">成品入库</label>
                <select class="form-control" id="opOutputWarehouse">
                  <option value="" disabled hidden>请选择</option>
                  ${warehouses.map((w) => `<option value="${w}" ${w === state.outputWarehouse ? 'selected' : ''}>${w}</option>`).join('')}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div class="form-section">
          <div class="form-section-header">
            <span class="section-title-mark">加工原料</span>
          </div>
          <div class="form-section-body" style="padding:0">
            <table class="processing-sub-table">
              <thead>
                <tr>
                  <th style="width:200px">原料商品</th>
                  <th style="width:80px">单位</th>
                  <th style="width:90px">当前库存</th>
                  <th style="width:90px">库存均价</th>
                  ${isManyToOne ? '<th style="width:140px">单位成品需求系数</th>' : ''}
                  <th style="width:120px">消耗量</th>
                </tr>
              </thead>
              <tbody id="opMaterialBody"></tbody>
            </table>
          </div>
        </div>

        <div class="operation-cost-section">
          <div class="operation-cost-header">
            <span class="cost-price-label section-title-mark">成品入库单价</span>
            <div class="cost-mode-row">
              <label class="radio-option"><input type="radio" name="opCostMode" value="auto" ${state.costMode === 'auto' ? 'checked' : ''}>按原料成本及实际获得量计算</label>
              <label class="radio-option"><input type="radio" name="opCostMode" value="manual" ${state.costMode === 'manual' ? 'checked' : ''}>手动输入成品入库单价</label>
            </div>
          </div>
        </div>

        <div class="form-section">
          <div class="form-section-header">
            <span class="section-title-mark">加工成品</span>
            <button class="btn btn-sm btn-blue reference-fill-btn" type="button" data-action="fill-reference-qty" disabled>按参考值填充实际获得量</button>
          </div>
          <div class="form-section-body" style="padding:0">
            <table class="processing-sub-table">
              <thead>
                <tr>
                  <th style="width:180px">成品商品</th>
                  <th style="width:70px">单位</th>
                  <th style="width:100px;display:${tpl.relationType === 'many-to-one' ? 'none' : 'table-cell'}">参考加工系数</th>
                  <th style="width:90px">参考获得量</th>
                  <th style="width:90px">实际获得量</th>
                  ${showOrderDemandColumns ? '<th style="width:90px">订单分拣量</th><th style="width:90px">剩余量</th>' : ''}
                  <th style="width:130px">成品入库单价</th>
                </tr>
              </thead>
              <tbody id="opOutputBody"></tbody>
            </table>
          </div>
        </div>

        <div class="form-section operation-remark-section">
          <div class="form-section-header"><span class="section-title-mark">加工备注</span></div>
          <div class="form-section-body">
            <div class="operation-remark-field">
              <div class="remark-input-wrap">
                <textarea class="form-control" id="opRemark" maxlength="200" rows="3" placeholder="请输入">${escapeHtml(state.remark || '')}</textarea>
                <span class="remark-counter" id="opRemarkCounter">${(state.remark || '').length}/200</span>
              </div>
              <div class="remark-upload-area">
                <button class="btn btn-sm btn-blue remark-upload-btn" type="button" data-action="upload-attachment">
                  <svg class="icon-svg" viewBox="0 0 24 24" style="width:14px;height:14px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  上传附件
                </button>
                <input type="file" id="opAttachmentInput" accept="image/*,.txt,.doc,.docx,.pdf,.xls,.xlsx" multiple style="display:none">
                <div class="remark-attachment-list" id="opAttachmentList"></div>
              </div>
            </div>
          </div>
        </div>

      </div>
      <div class="processing-form-footer">
        <button class="btn btn-primary" type="button" data-action="save-process">保存</button>
        <button class="btn" type="button" data-action="reset-form">重置</button>
      </div>
    `;

    // 填充基本信息
    const today = state.processingDate || new Date().toISOString().slice(0, 10);
    document.getElementById('opProcessingDate').value = today;
    document.getElementById('opMaterialWarehouse').value = state.materialWarehouse || '';
    document.getElementById('opOutputWarehouse').value = state.outputWarehouse || '';
    document.getElementById('opRemarkCounter').textContent = `${(state.remark || '').length}/200`;
    if (state.operationMode === 'order') mountOrderProcessingDatePicker();
    processingDatePicker?.destroy();
    processingDatePicker = window.DatePicker.mount({
      input: '#opProcessingDate',
      panelId: 'opProcessingDatePickerPanel',
      onChange: (date) => { state.processingDate = date; }
    });

    renderOpMaterialTable();
    renderOpOutputTable();
    updateOpCostModeVisibility();
    renderOpAttachments();
    bindOperationFormEvents();
  }

  function renderOpAttachments() {
    const container = document.getElementById('opAttachmentList');
    if (!container) return;
    container.innerHTML = state.attachments.map((file, index) => `
      <div class="remark-attachment-item">
        <span class="remark-attachment-thumb">${escapeHtml((file.format || '').toUpperCase())}</span>
        <span class="remark-attachment-name">${escapeHtml(file.name)}</span>
        <span class="remark-attachment-meta">${escapeHtml(file.size)}</span>
        <button class="remark-attachment-remove" type="button" data-action="remove-attachment" data-index="${index}">×</button>
      </div>
    `).join('');
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + 'B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB';
    return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
  }

  function getFileFormat(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    return ext;
  }

  function renderOpMaterialTable() {
    const tbody = document.getElementById('opMaterialBody');
    const selectedTemplate = state.templates.find((template) => template.id === state.selectedTemplateId);
    const isManyToOne = selectedTemplate?.relationType === 'many-to-one';
    tbody.innerHTML = state.materials.map((item, index) => {
      const product = findProduct(item.productCode);
      const unit = product ? product.unit : (item.unit || '--');
      return `
        <tr data-op-material-index="${index}">
          <td><span class="sub-table-readonly">${productNetTag(item.productCode)}${escapeHtml(formatProductDisplay(item))}</span></td>
          <td><span class="sub-table-readonly">${escapeHtml(unit)}</span></td>
          <td><span class="sub-table-readonly">${item.stock !== '' && item.stock != null ? item.stock : '--'}</span></td>
          <td><span class="sub-table-readonly">${item.avgPrice !== '' && item.avgPrice != null ? item.avgPrice : '--'}</span></td>
          ${isManyToOne ? `<td><span class="sub-table-readonly">${item.refConsumeQty || '--'}</span></td>` : ''}
          <td><input class="sub-table-input" type="number" min="0" step="0.01" placeholder="请输入" data-op-material-field="consumeQty" value="${item.consumeQty || ''}"></td>
        </tr>
      `;
    }).join('');
  }

  function syncManyToOneMaterialQuantities(baseIndex) {
    const baseMaterial = state.materials[baseIndex];
    const baseConsumeQty = Number(baseMaterial?.consumeQty);
    const baseRefConsumeQty = Number(baseMaterial?.refConsumeQty);
    if (!(baseConsumeQty > 0) || !(baseRefConsumeQty > 0)) return;

    const outputQty = baseConsumeQty / baseRefConsumeQty;
    state.materials.forEach((material, index) => {
      if (index === baseIndex) return;
      const refConsumeQty = Number(material.refConsumeQty);
      material.consumeQty = refConsumeQty > 0
        ? Number((outputQty * refConsumeQty).toFixed(2))
        : '';
    });
  }

  function updateManyToOneMaterialInputs(skipIndex = null) {
    document.querySelectorAll('#opMaterialBody [data-op-material-index]').forEach((row) => {
      const index = Number(row.dataset.opMaterialIndex);
      if (index === skipIndex) return;
      const input = row.querySelector('[data-op-material-field="consumeQty"]');
      if (!input || !state.materials[index]) return;
      input.value = state.materials[index].consumeQty == null ? '' : state.materials[index].consumeQty;
    });
  }

  function renderOpOutputTable() {
    const tbody = document.getElementById('opOutputBody');
    if (!tbody) return;
    const selectedTemplate = state.templates.find((template) => template.id === state.selectedTemplateId);
    const isManyToOne = selectedTemplate?.relationType === 'many-to-one';
    const showOrderDemandColumns = state.operationMode === 'order';
    tbody.innerHTML = state.outputs.map((item, index) => {
      const product = findProduct(item.productCode);
      const unit = product ? product.unit : (item.unit || '--');
      const allocation = state.costMode === 'auto' ? calculateAutoCostAllocations()[index] : null;
      const unitPrice = state.costMode === 'auto' ? allocation?.costPrice || '' : (item.costPrice || '');
      const orderOutputFields = showOrderDemandColumns ? `
          <td><span class="sub-table-readonly" data-op-output-sorting>${getSortingQty(item)}</span></td>
          <td><span class="sub-table-readonly" data-op-output-remaining>${calculateRemainingQty(item)}</span></td>
        ` : '';
      const costPriceContent = state.costMode === 'auto'
        ? `<div class="unit-price-control unit-price-readonly">
            <span class="unit-price-value" data-auto-cost-index="${index}">${unitPrice || '--'}</span>
          </div>`
        : `<div class="unit-price-control">
            <input class="sub-table-input cost-price-input" type="number" min="0" step="0.01" placeholder="请输入" data-op-output-field="costPrice" value="${unitPrice}">
          </div>`;
      return `
        <tr data-op-output-index="${index}">
          <td><span class="sub-table-readonly">${productNetTag(item.productCode)}${escapeHtml(formatProductDisplay(item))}</span></td>
          <td><span class="sub-table-readonly">${escapeHtml(unit)}</span></td>
          <td style="display:${isManyToOne ? 'none' : 'table-cell'}"><span class="sub-table-readonly">${item.refCoefficient || '--'}</span></td>
          <td><span class="sub-table-readonly">${item.refQty || '--'}</span></td>
          <td><input class="sub-table-input" type="number" min="0" step="0.01" placeholder="请输入" data-op-output-field="actualQty" value="${item.actualQty || ''}"></td>
          ${orderOutputFields}
          <td>${costPriceContent}</td>
        </tr>
      `;
    }).join('');
    updateReferenceFillButton();
  }

  function calculateRemainingQty(item) {
    const actualQty = Number(item.actualQty);
    const sortingQty = getSortingQty(item);
    if (item.actualQty === '' || item.actualQty == null) return '--';
    if (!Number.isFinite(actualQty)) return '--';
    if (sortingQty === '--') return '--';
    return (actualQty - sortingQty).toFixed(2);
  }

  function getSortingQty(item) {
    const startDate = state.expectedDeliveryStart;
    const endDate = state.expectedDeliveryEnd;
    if (state.operationMode !== 'order' || !startDate || !endDate) return '--';
    const actualSortingQty = getSortingRecords()
      .filter((record) => {
        const deliveryDate = String(record.expectedAt || record.expectedDeliveryDate || record.deliveryDate || '').slice(0, 10);
        if (!isDateWithinRange(deliveryDate, startDate, endDate)) return false;
        if (record.goodsCode !== item.productCode && record.productCode !== item.productCode) return false;
        const orderProduct = findProduct(record.goodsCode || record.productCode);
        if (record.isNetVegetable === false && !orderProduct?.isNetVegetable) return false;
        const customerMatch = state.customer === '全部'
          || !record.customer
          || record.customer === state.customer
          || record.customerName === state.customer;
        const canteenMatch = state.canteen === '全部'
          || !record.canteen
          || record.canteen === state.canteen;
        return customerMatch && canteenMatch;
      })
      .reduce((total, record) => total + (Number(record.orderSortingQty ?? record.actualQty) || 0), 0);
    return Math.max(actualSortingQty - getCompletedProcessingQty(item.productCode), 0);
  }

  function updateRemainingQty(index) {
    const row = document.querySelector(`[data-op-output-index="${index}"]`);
    const display = row?.querySelector('[data-op-output-remaining]');
    if (display) display.textContent = calculateRemainingQty(state.outputs[index]);
    const sortingDisplay = row?.querySelector('[data-op-output-sorting]');
    if (sortingDisplay) sortingDisplay.textContent = getSortingQty(state.outputs[index]);
  }

  function updateReferenceFillButton() {
    const button = document.querySelector('[data-action="fill-reference-qty"]');
    if (!button) return;
    button.disabled = !state.outputs.some((output) => output.refQty !== '' && output.refQty != null);
  }

  function fillActualQtyByReference() {
    state.outputs.forEach((output) => {
      if (output.refQty !== '' && output.refQty != null) output.actualQty = output.refQty;
    });
    renderOpOutputTable();
    updateAutoCostPrices();
  }

  function roundCurrency(value) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  function calculateAutoCostAllocations() {
    const totalMaterialCost = state.materials.reduce((sum, material) => {
      return sum + ((Number(material.avgPrice) || 0) * (Number(material.consumeQty) || 0));
    }, 0);
    const outputs = state.outputs.map((output) => {
      const actualQty = Number(output.actualQty);
      const product = findProduct(output.productCode);
      const salesPrice = Number(product?.marketPrice);
      return {
        actualQty,
        salesPrice,
        salesAmount: actualQty * salesPrice
      };
    });
    const totalSalesAmount = outputs.reduce((sum, output) => {
      return sum + (Number.isFinite(output.salesAmount) ? output.salesAmount : 0);
    }, 0);
    const isReady = totalMaterialCost > 0
      && totalSalesAmount > 0
      && outputs.every((output) => (
        Number.isFinite(output.actualQty)
        && output.actualQty > 0
        && Number.isFinite(output.salesPrice)
        && output.salesPrice >= 0
      ));
    if (!isReady) return state.outputs.map(() => ({ allocatedCost: '', costPrice: '' }));

    const totalCost = roundCurrency(totalMaterialCost);
    let allocatedTotal = 0;
    return outputs.map((output, index) => {
      const salesAmountWeight = output.salesAmount / totalSalesAmount;
      const allocatedCost = index === outputs.length - 1
        ? roundCurrency(totalCost - allocatedTotal)
        : roundCurrency(totalCost * salesAmountWeight);
      allocatedTotal = roundCurrency(allocatedTotal + allocatedCost);
      return {
        allocatedCost: allocatedCost.toFixed(2),
        costPrice: Math.max(roundCurrency(allocatedCost / output.actualQty), 0.01).toFixed(2)
      };
    });
  }

  function updateAutoCostPrices() {
    if (state.costMode !== 'auto') return;
    const allocations = calculateAutoCostAllocations();
    document.querySelectorAll('#opOutputBody [data-auto-cost-index]').forEach((display) => {
      const index = Number(display.dataset.autoCostIndex);
      const unitPrice = allocations[index]?.costPrice || '';
      display.textContent = unitPrice || '--';
    });
  }

  function updateOpCostModeVisibility() {
    // 当前模式区域仅用于配置计算方式。
  }

  function calculateRefQty() {
    const selectedTemplate = state.templates.find((template) => template.id === state.selectedTemplateId);
    if (selectedTemplate?.relationType === 'many-to-one') {
      const possibleOutputQty = state.materials.map((material) => {
        const consumeQty = Number(material.consumeQty);
        const refConsumeQty = Number(material.refConsumeQty);
        return consumeQty > 0 && refConsumeQty > 0 ? consumeQty / refConsumeQty : null;
      });
      const refQty = possibleOutputQty.length > 0 && possibleOutputQty.every((qty) => Number.isFinite(qty))
        ? Math.min(...possibleOutputQty)
        : 0;
      state.outputs.forEach((output) => {
        output.refQty = refQty > 0 ? refQty.toFixed(2) : '';
      });
      return;
    }
    const totalConsume = state.materials.reduce((sum, m) => sum + (Number(m.consumeQty) || 0), 0);
    state.outputs.forEach((output) => {
      const coefficient = Number(output.refCoefficient) || 0;
      if (coefficient > 0 && totalConsume > 0) {
        output.refQty = (totalConsume * coefficient).toFixed(2);
      } else {
        output.refQty = '';
      }
    });
  }

  function showOpFormStatus(message, type) {
    const status = document.getElementById('operationFormStatus');
    if (!status) return;
    status.textContent = message;
    status.className = `processing-form-status visible ${type}`;
  }

  function selectTemplate(templateId) {
    const tpl = state.templates.find((t) => t.id === templateId);
    if (!tpl) return;

    const preserveOrderDemandContext = state.operationMode === 'order' && hasExpectedDeliveryRange();
    state.selectedTemplateId = templateId;
    state.costMode = tpl.costMode || 'auto';
    state.processingDate = getLocalDateString();
    if (!preserveOrderDemandContext) {
      state.expectedDeliveryStart = getDefaultExpectedDeliveryDate();
      state.expectedDeliveryEnd = getDefaultExpectedDeliveryDate();
      clearOrderDemandFilter();
      state.customer = '全部';
      state.canteen = '全部';
    }
    state.materialWarehouse = tpl.materialWarehouse || tpl.materials?.[0]?.warehouse || '';
    state.outputWarehouse = tpl.outputWarehouse || tpl.outputs?.[0]?.warehouse || state.materialWarehouse;
    state.remark = '';
    state.attachments = [];
    state.manyToOneBaseMaterialIndex = null;

    // 从模版填充原料
    state.materials = (tpl.materials || []).map((m) => {
      const product = findProduct(m.productCode);
      return {
        productCode: m.productCode,
        productName: m.productName,
        unit: product?.unit || m.unit,
        stock: Math.floor(Math.random() * 200 + 20),
        avgPrice: product?.marketPrice || '',
        consumeQty: tpl.relationType === 'many-to-one' ? '' : (m.refConsumeQty || ''),
        refConsumeQty: m.refConsumeQty || ''
      };
    });

    // 从模版填充成品
    state.outputs = (tpl.outputs || []).map((o) => {
      const product = findProduct(o.productCode);
      return {
        productCode: o.productCode,
        productName: o.productName,
        unit: product?.unit || o.unit,
        refCoefficient: o.refCoefficient || '',
        refQty: '',
        actualQty: '',
        // 手动模式不预填方案成本价，避免误认为是自动回显结果
        costPrice: ''
      };
    });

    calculateRefQty();
    renderTemplateList();
    renderOperationForm();
  }

  function resetOperationForm() {
    const tpl = state.templates.find((t) => t.id === state.selectedTemplateId);
    if (!tpl) return;
    state.processingDate = getLocalDateString();
    state.expectedDeliveryStart = getDefaultExpectedDeliveryDate();
    state.expectedDeliveryEnd = getDefaultExpectedDeliveryDate();
    state.customer = '全部';
    state.canteen = '全部';
    state.materialWarehouse = tpl.materialWarehouse || tpl.materials?.[0]?.warehouse || '';
    state.outputWarehouse = tpl.outputWarehouse || tpl.outputs?.[0]?.warehouse || state.materialWarehouse;
    state.remark = '';
    state.attachments = [];
    state.manyToOneBaseMaterialIndex = null;
    state.costMode = tpl.costMode || 'auto';
    state.materials = (tpl.materials || []).map((m) => {
      const product = findProduct(m.productCode);
      return {
        productCode: m.productCode,
        productName: m.productName,
        unit: product?.unit || m.unit,
        stock: Math.floor(Math.random() * 200 + 20),
        avgPrice: product?.marketPrice || '',
        consumeQty: tpl.relationType === 'many-to-one' ? '' : (m.refConsumeQty || ''),
        refConsumeQty: m.refConsumeQty || ''
      };
    });
    state.outputs = (tpl.outputs || []).map((o) => {
      const product = findProduct(o.productCode);
      return {
        productCode: o.productCode,
        productName: o.productName,
        unit: product?.unit || o.unit,
        refCoefficient: o.refCoefficient || '',
        refQty: '',
        actualQty: '',
        // 手动模式不预填方案成本价，避免误认为是自动回显结果
        costPrice: ''
      };
    });
    calculateRefQty();
    renderOperationForm();
  }

  function collectOperationData() {
    const allocations = state.costMode === 'auto' ? calculateAutoCostAllocations() : [];
    return {
      processingDate: document.getElementById('opProcessingDate').value,
      expectedDeliveryStart: document.getElementById('opExpectedDeliveryStart')?.value || '',
      expectedDeliveryEnd: document.getElementById('opExpectedDeliveryEnd')?.value || '',
      customer: document.getElementById('opCustomer')?.value || '全部',
      canteen: document.getElementById('opCanteen')?.value || '全部',
      materialWarehouse: document.getElementById('opMaterialWarehouse').value,
      outputWarehouse: document.getElementById('opOutputWarehouse').value,
      // 保留旧字段，兼容加工记录和已有数据
      warehouse: document.getElementById('opMaterialWarehouse').value,
      remark: document.getElementById('opRemark').value.trim(),
      attachments: [...state.attachments],
      processingMode: state.operationMode,
      templateId: state.selectedTemplateId,
      templateName: state.templates.find((template) => template.id === state.selectedTemplateId)?.name || '',
      templateDescription: state.templates.find((template) => template.id === state.selectedTemplateId)?.description || '',
      costMode: state.costMode,
      materials: state.materials.map((m) => ({
        ...m,
        productName: findProduct(m.productCode)?.name || m.productName,
        unit: findProduct(m.productCode)?.unit || m.unit
      })),
      outputs: state.outputs.map((o, index) => {
        const allocation = allocations[index] || {};
        return {
        ...o,
        productName: findProduct(o.productCode)?.name || o.productName,
        unit: findProduct(o.productCode)?.unit || o.unit,
        sortingQty: state.operationMode === 'order' ? getSortingQty(o) : (o.sortingQty || ''),
        remainingQty: state.operationMode === 'order' ? calculateRemainingQty(o) : (o.remainingQty || ''),
        orderLineRefs: state.operationMode === 'order' ? getOrderLineRefs(o.productCode) : (o.orderLineRefs || []),
        allocatedCost: state.costMode === 'auto' ? allocation.allocatedCost : (o.allocatedCost || ''),
        costPrice: state.costMode === 'auto' ? allocation.costPrice : o.costPrice
        };
      })
    };
  }

  function showOpFieldErrors(errors) {
    document.querySelectorAll('#operationFormBody .sub-table-input[aria-invalid="true"]').forEach((el) => el.removeAttribute('aria-invalid'));
    const materialWarehouseSelect = document.getElementById('opMaterialWarehouse');
    const outputWarehouseSelect = document.getElementById('opOutputWarehouse');
    const dateInput = document.getElementById('opProcessingDate');
    if (materialWarehouseSelect) materialWarehouseSelect.removeAttribute('aria-invalid');
    if (dateInput) dateInput.removeAttribute('aria-invalid');

    Object.entries(errors).forEach(([field, message]) => {
      if ((field === 'materialWarehouse' || field === 'warehouse') && materialWarehouseSelect) {
        materialWarehouseSelect.setAttribute('aria-invalid', 'true');
        materialWarehouseSelect.style.borderColor = 'var(--danger)';
      } else if (field === 'outputWarehouse' && outputWarehouseSelect) {
        outputWarehouseSelect.setAttribute('aria-invalid', 'true');
        outputWarehouseSelect.style.borderColor = 'var(--danger)';
      } else if (field === 'processingDate' && dateInput) {
        dateInput.setAttribute('aria-invalid', 'true');
        dateInput.style.borderColor = 'var(--danger)';
      } else if (field === 'materials' || field === 'outputs') {
        showOpFormStatus(message, 'error');
      } else if (field.startsWith('material_')) {
        const parts = field.split('_');
        const index = Number(parts[1]);
        const fieldName = parts[2];
        const row = document.querySelector(`[data-op-material-index="${index}"]`);
        const input = row?.querySelector(`[data-op-material-field="${fieldName}"]`);
        if (input) input.setAttribute('aria-invalid', 'true');
      } else if (field.startsWith('output_')) {
        const parts = field.split('_');
        const index = Number(parts[1]);
        const fieldName = parts[2];
        const row = document.querySelector(`[data-op-output-index="${index}"]`);
        const input = row?.querySelector(`[data-op-output-field="${fieldName}"]`);
        if (input) input.setAttribute('aria-invalid', 'true');
      }
    });
  }

  function openSubmitConfirm(data) {
    state.pendingSubmitData = data;
    const auditEnabled = window.ProcessingService.getConfig().auditEnabled;
    const message = auditEnabled
      ? '确认提交当前加工单吗？提交后将进入待审核状态。'
      : '确认提交当前加工单吗？提交后将直接标记为已完成。';
    const modal = document.getElementById('processingSubmitConfirmModal');
    document.getElementById('processingSubmitConfirmMessage').textContent = message;
    modal.classList.add('is-visible');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeSubmitConfirm() {
    state.pendingSubmitData = null;
    const modal = document.getElementById('processingSubmitConfirmModal');
    modal.classList.remove('is-visible');
    modal.setAttribute('aria-hidden', 'true');
  }

  function confirmSubmitOperation() {
    const data = state.pendingSubmitData;
    if (!data) return;
    const auditEnabled = window.ProcessingService.getConfig().auditEnabled;
    const targetStatus = auditEnabled ? '待审核' : '已完成';
    data.status = targetStatus;
    closeSubmitConfirm();
    const saved = window.ProcessingService.create(data);
    if (!saved) {
      showOpFormStatus('提交失败，请重试。', 'error');
      return;
    }
    if (state.selectedTemplateId) {
      window.ProcessingTemplateService.markProcessed(state.selectedTemplateId);
      state.templates = window.ProcessingTemplateService.getList();
      renderTemplateList();
    }
    showOpFormStatus(auditEnabled ? '提交成功，已进入待审核。' : '提交成功，加工单已完成。', 'success');
    setTimeout(() => {
      resetOperationForm();
    }, 1000);
  }

  function submitOperation() {
    const data = collectOperationData();
    const errors = window.ProcessingValidator.validate(data);
    if (Object.keys(errors).length > 0) {
      showOpFieldErrors(errors);
      showOpFormStatus('请检查并补充表单中的必填信息。', 'error');
      return;
    }
    openSubmitConfirm(data);
  }

  function bindOperationFormEvents() {
    const form = document.getElementById('operationForm');
    if (!form || form.dataset.bound === 'true') return;
    form.dataset.bound = 'true';

    form.addEventListener('click', (event) => {
      const action = event.target.closest('[data-action]')?.dataset.action;
      if (action === 'query-order-demand') {
        applyOrderDemandQuery();
        return;
      }
      if (action === 'reset-order-demand') {
        resetOrderDemandQuery();
        return;
      }
      if (action === 'switch-operation-mode') {
        state.operationMode = event.target.closest('[data-action]')?.dataset.mode || 'plan';
        if (state.operationMode !== 'order') {
          state.orderDemandQueryActive = false;
          state.orderDemandProducts = [];
          state.missingOrderDemandProducts = [];
        }
        renderOperationForm();
        renderTemplateList();
        return;
      }
      if (action === 'fill-reference-qty') {
        if (event.target.closest('[data-action="fill-reference-qty"]')?.disabled) return;
        fillActualQtyByReference();
        return;
      }
      if (action === 'save-process') { submitOperation(); return; }
      if (action === 'reset-form') { resetOperationForm(); return; }
      if (action === 'upload-attachment') {
        document.getElementById('opAttachmentInput')?.click();
        return;
      }
      if (action === 'remove-attachment') {
        const index = Number(event.target.closest('[data-action]')?.dataset.index);
        if (Number.isFinite(index)) {
          state.attachments.splice(index, 1);
          renderOpAttachments();
        }
        return;
      }
      if (action === 'goto-records') {
        window.AppNavigation?.navigate?.('./processing-record.html');
        return;
      }
    });

    form.addEventListener('change', (event) => {
      const costRadio = event.target.closest('input[name="opCostMode"]');
      if (costRadio) {
        state.costMode = costRadio.value;
        renderOpOutputTable();
        updateOpCostModeVisibility();
      }
      if (event.target.id === 'opMaterialWarehouse') state.materialWarehouse = event.target.value;
      if (event.target.id === 'opOutputWarehouse') state.outputWarehouse = event.target.value;
      if (event.target.id === 'opCustomer') {
        state.customer = event.target.value;
        renderOpOutputTable();
      }
      if (event.target.id === 'opCanteen') {
        state.canteen = event.target.value;
        renderOpOutputTable();
      }
      if (event.target.id === 'opAttachmentInput') {
        const files = Array.from(event.target.files || []);
        files.forEach((file) => {
          state.attachments.push({
            name: file.name,
            format: getFileFormat(file.name),
            size: formatFileSize(file.size)
          });
        });
        renderOpAttachments();
        event.target.value = '';
      }
    });

    form.addEventListener('input', (event) => {
      const consumeInput = event.target.closest('[data-op-material-field="consumeQty"]');
      if (consumeInput) {
        const row = consumeInput.closest('[data-op-material-index]');
        const index = Number(row.dataset.opMaterialIndex);
        state.materials[index].consumeQty = consumeInput.value;
        const selectedTemplate = state.templates.find((template) => template.id === state.selectedTemplateId);
        const isManyToOne = selectedTemplate?.relationType === 'many-to-one';
        if (isManyToOne) {
          if (state.manyToOneBaseMaterialIndex == null && Number(consumeInput.value) > 0) {
            state.manyToOneBaseMaterialIndex = index;
          }
          if (state.manyToOneBaseMaterialIndex === index) {
            if (Number(consumeInput.value) > 0) {
              syncManyToOneMaterialQuantities(index);
            } else {
              state.manyToOneBaseMaterialIndex = null;
              state.materials.forEach((material, materialIndex) => {
                if (materialIndex !== index) material.consumeQty = '';
              });
            }
            updateManyToOneMaterialInputs(index);
          }
        }
        calculateRefQty();
        renderOpOutputTable();
        updateOpCostModeVisibility();
        return;
      }
      const actualQtyInput = event.target.closest('[data-op-output-field="actualQty"]');
      if (actualQtyInput) {
        const row = actualQtyInput.closest('[data-op-output-index]');
        const index = Number(row.dataset.opOutputIndex);
        state.outputs[index].actualQty = actualQtyInput.value;
        updateRemainingQty(index);
        updateAutoCostPrices();
        return;
      }
      const costPriceInput = event.target.closest('[data-op-output-field="costPrice"]');
      if (costPriceInput) {
        const row = costPriceInput.closest('[data-op-output-index]');
        const index = Number(row.dataset.opOutputIndex);
        state.outputs[index].costPrice = costPriceInput.value;
        return;
      }
      if (event.target.id === 'opRemark') {
        const counter = document.getElementById('opRemarkCounter');
        if (counter) counter.textContent = `${event.target.value.length}/200`;
      }
    });

  }

  /* ===== 按订单加工：期望送达时间区间选择器（复用入库管理日历样式） ===== */
  const orderCalendarState = {
    leftYear: 0,
    leftMonth: 0,
    rightYear: 0,
    rightMonth: 0,
    startDate: '',
    endDate: ''
  };

  function formatOrderDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function buildOrderCalendarMonthHTML(year, month, side) {
    const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = formatOrderDate(new Date());
    let cells = '';
    for (let i = 0; i < firstDay.getDay(); i++) cells += '<td class="cal-empty"></td>';
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      let className = 'cal-day';
      if (date === today) className += ' cal-today';
      if (date === orderCalendarState.startDate) className += ' cal-start';
      if (date === orderCalendarState.endDate) className += ' cal-end';
      if (orderCalendarState.startDate && orderCalendarState.endDate && date > orderCalendarState.startDate && date < orderCalendarState.endDate) className += ' cal-in-range';
      cells += `<td class="${className}" data-date="${date}" data-side="${side}">${day}</td>`;
    }
    const remaining = (7 - ((firstDay.getDay() + daysInMonth) % 7)) % 7;
    for (let i = 0; i < remaining; i++) cells += '<td class="cal-empty"></td>';
    const cellArray = cells.split('</td>');
    const rows = [];
    for (let i = 0; i < cellArray.length - 1; i += 7) rows.push(`<tr>${cellArray.slice(i, i + 7).join('</td>')}</td></tr>`);
    return `
      <div class="cal-header">
        <button class="cal-nav cal-prev" type="button" data-action="order-cal-prev" data-side="${side}">‹</button>
        <span class="cal-title">${year}年 ${monthNames[month]}</span>
        <button class="cal-nav cal-next" type="button" data-action="order-cal-next" data-side="${side}">›</button>
      </div>
      <table class="cal-table"><thead><tr>${weekDays.map((day) => `<th>${day}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>
    `;
  }

  function renderOrderDateCalendar() {
    const panel = document.getElementById('opExpectedDeliveryCalendarPanel');
    if (!panel) return;
    panel.innerHTML = `
      <div class="cal-dual-body">
        <div class="cal-panel cal-panel-left">${buildOrderCalendarMonthHTML(orderCalendarState.leftYear, orderCalendarState.leftMonth, 'left')}</div>
        <div class="cal-divider"></div>
        <div class="cal-panel cal-panel-right">${buildOrderCalendarMonthHTML(orderCalendarState.rightYear, orderCalendarState.rightMonth, 'right')}</div>
      </div>
      <div class="cal-footer">
        <span class="cal-hint">先选开始日期，再选结束日期</span>
        <div class="cal-btns"><button class="btn btn-sm" type="button" data-action="order-cal-clear">清空</button></div>
      </div>
    `;
    updateOrderDateDisplay();
  }

  function updateOrderDateDisplay() {
    const display = document.getElementById('opExpectedDeliveryDisplay');
    if (!display) return;
    const start = orderCalendarState.startDate || document.getElementById('opExpectedDeliveryStart')?.value || state.expectedDeliveryStart;
    const end = orderCalendarState.endDate || document.getElementById('opExpectedDeliveryEnd')?.value || state.expectedDeliveryEnd;
    display.value = start && end ? `${start} ~ ${end}` : start ? `${start} ~` : end ? `~ ${end}` : '';
  }

  function showOrderDatePicker() {
    let panel = document.getElementById('opExpectedDeliveryCalendarPanel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'opExpectedDeliveryCalendarPanel';
      panel.className = 'calendar-panel cal-dual';
      panel.addEventListener('click', (event) => {
        event.stopPropagation();
        onOrderDateCalendarClick(event);
      });
      document.body.appendChild(panel);
    }
    const now = new Date();
    orderCalendarState.leftYear = now.getFullYear();
    orderCalendarState.leftMonth = now.getMonth();
    orderCalendarState.rightYear = now.getFullYear();
    orderCalendarState.rightMonth = (now.getMonth() + 1) % 12;
    if (now.getMonth() === 11) orderCalendarState.rightYear += 1;
    orderCalendarState.startDate = document.getElementById('opExpectedDeliveryStart')?.value || state.expectedDeliveryStart;
    orderCalendarState.endDate = document.getElementById('opExpectedDeliveryEnd')?.value || state.expectedDeliveryEnd;
    const input = document.getElementById('opExpectedDeliveryDisplay');
    if (input) {
      const rect = input.getBoundingClientRect();
      panel.style.top = `${rect.bottom + 4}px`;
      panel.style.left = `${rect.left}px`;
    }
    panel.classList.add('is-visible');
    renderOrderDateCalendar();
  }

  function hideOrderDatePicker() {
    document.getElementById('opExpectedDeliveryCalendarPanel')?.classList.remove('is-visible');
  }

  function shiftOrderCalendarMonth(side, direction) {
    const yearKey = side === 'left' ? 'leftYear' : 'rightYear';
    const monthKey = side === 'left' ? 'leftMonth' : 'rightMonth';
    orderCalendarState[monthKey] += direction === 'prev' ? -1 : 1;
    if (orderCalendarState[monthKey] < 0) { orderCalendarState[monthKey] = 11; orderCalendarState[yearKey] -= 1; }
    if (orderCalendarState[monthKey] > 11) { orderCalendarState[monthKey] = 0; orderCalendarState[yearKey] += 1; }
    renderOrderDateCalendar();
  }

  function onOrderDateCalendarClick(event) {
    const actionEl = event.target.closest('[data-action]');
    const action = actionEl?.dataset.action;
    if (action === 'order-cal-prev' || action === 'order-cal-next') {
      shiftOrderCalendarMonth(actionEl.dataset.side, action === 'order-cal-prev' ? 'prev' : 'next');
      return;
    }
    if (action === 'order-cal-clear') {
      orderCalendarState.startDate = '';
      orderCalendarState.endDate = '';
      state.expectedDeliveryStart = '';
      state.expectedDeliveryEnd = '';
      document.getElementById('opExpectedDeliveryStart').value = '';
      document.getElementById('opExpectedDeliveryEnd').value = '';
      renderOpOutputTable();
      hideOrderDatePicker();
      updateOrderDateDisplay();
      return;
    }
    const dayEl = event.target.closest('.cal-day');
    if (!dayEl) return;
    const date = dayEl.dataset.date;
    // 两个日历面板共用同一套连续选择逻辑：不区分左侧或右侧。
    if (!orderCalendarState.startDate || orderCalendarState.endDate) {
      orderCalendarState.startDate = date;
      orderCalendarState.endDate = '';
    } else {
      if (date < orderCalendarState.startDate) {
        orderCalendarState.startDate = date;
        orderCalendarState.endDate = '';
      } else {
        orderCalendarState.endDate = date;
        state.expectedDeliveryStart = orderCalendarState.startDate;
        state.expectedDeliveryEnd = orderCalendarState.endDate;
        document.getElementById('opExpectedDeliveryStart').value = state.expectedDeliveryStart;
        document.getElementById('opExpectedDeliveryEnd').value = state.expectedDeliveryEnd;
        renderOpOutputTable();
        hideOrderDatePicker();
        updateOrderDateDisplay();
        return;
      }
    }
    renderOrderDateCalendar();
  }

  /* ===== 方案编辑页面 ===== */
  function showTemplateEditorPage() {
    document.querySelector('.processing-workspace').style.display = 'none';
    document.getElementById('templateEditorPage').style.display = 'flex';
  }

  function closeTemplateEditorPage() {
    document.getElementById('templateEditorPage').style.display = 'none';
    document.querySelector('.processing-workspace').style.display = '';
    state.templateEditMode = null;
    state.templateEditData = null;
  }

  function showTemplateToast(message) {
    let toast = document.getElementById('templateOperationToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'templateOperationToast';
      toast.className = 'template-operation-toast';
      toast.setAttribute('role', 'status');
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(showTemplateToast.timer);
    showTemplateToast.timer = setTimeout(() => toast.classList.remove('visible'), 2000);
  }

  function renderTemplateEditor() {
    const isEdit = state.templateEditMode === 'edit';
    const data = state.templateEditData;
    const description = String(data.description || '').slice(0, 200);
    const page = document.getElementById('templateEditorPage');
    page.classList.toggle('is-one-to-many', data.relationType !== 'many-to-one');
    page.classList.toggle('is-many-to-one', data.relationType === 'many-to-one');

    page.innerHTML = `
      <div class="template-editor-header">
        <button class="back-link" type="button" data-action="close-template-modal">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/><path d="M19 12H9"/></svg>
          <span>返回</span>
        </button>
        <h1>${isEdit ? '编辑方案' : '新建方案'}</h1>
      </div>
      <div class="template-editor-body" id="templateModalBody">
        <div class="template-editor-section">
          <div class="basic-info-grid">
            ${isEdit ? `<div class="basic-info-field" style="grid-column: 1 / -1"><label class="field-label">方案编号</label><div class="template-editor-readonly-id">${escapeHtml(data.id || '--')}</div></div>` : ''}
            <div class="basic-info-field">
              <label class="field-label required" for="tplName">方案名称</label>
              <input class="form-control" id="tplName" placeholder="请输入" value="${escapeHtml(data.name || '')}">
            </div>
            <div class="basic-info-field template-description-field" style="grid-column: 1 / -1">
              <label class="field-label" for="tplDesc">方案描述</label>
              <div class="template-description-control">
                <textarea class="form-control" id="tplDesc" maxlength="200" rows="3" placeholder="请输入">${escapeHtml(description)}</textarea>
                <span class="template-description-counter" id="tplDescCounter">${description.length}/200</span>
              </div>
            </div>
          </div>
        </div>

        <div class="template-editor-section">
          <div class="form-section-header">
            <span class="section-title-mark">加工类型</span>
          </div>
          <div class="cost-mode-row template-relation-type-row">
            <label class="radio-option">
              <input type="radio" name="tplRelationType" value="one-to-many" ${data.relationType !== 'many-to-one' ? 'checked' : ''} ${isEdit ? 'disabled' : ''}>
                一种原料加工为多种成品
            </label>
            <label class="radio-option">
              <input type="radio" name="tplRelationType" value="many-to-one" ${data.relationType === 'many-to-one' ? 'checked' : ''} ${isEdit ? 'disabled' : ''}>
              多种原料加工为一种成品
            </label>
          </div>
        </div>

        <div class="template-editor-section" id="tplMaterialSection">
          <div class="form-section-header">
            <span class="section-title-mark">原料商品</span>
          </div>
          <div class="form-section-body template-single-warehouse-field">
            <div class="basic-info-field">
              <label class="field-label required">原料出库</label>
              <div id="tplMaterialWarehouseField"></div>
            </div>
          </div>
          <table class="processing-sub-table">
            <thead>
              <tr>
                <th class="template-product-column">原料商品</th>
                <th class="template-unit-column">单位</th>
                <th class="template-detail-column" id="tplMaterialDemandHeader" style="display:none">${renderCoefficientHeader('单位成品需求系数', coefficientHints.materialDemand)}</th>
                <th class="template-action-column" id="tplMaterialActionHeader" style="display:none">操作</th>
              </tr>
            </thead>
            <tbody id="tplMaterialBody"></tbody>
          </table>
        </div>

        <div class="template-editor-section" id="tplOutputSection">
          <div class="form-section-header">
            <span class="section-title-mark">成品商品</span>
          </div>
          <div class="form-section-body template-single-warehouse-field">
            <div class="basic-info-field">
              <label class="field-label required">成品入库</label>
              <div id="tplOutputWarehouseField"></div>
            </div>
          </div>
          <table class="processing-sub-table">
            <thead>
              <tr>
                <th class="template-product-column">成品商品</th>
                <th class="template-unit-column">单位</th>
                <th class="template-detail-column" id="tplOutputCoefficientHeader">${renderCoefficientHeader('加工系数', coefficientHints.outputCoefficient)}</th>
                <th class="template-action-column" id="tplOutputActionHeader">操作</th>
              </tr>
            </thead>
            <tbody id="tplOutputBody"></tbody>
          </table>
        </div>
      </div>
      <div class="processing-form-footer template-editor-footer">
        <button class="btn" type="button" data-action="close-template-modal">返回</button>
        <button class="btn btn-primary" type="button" data-action="save-template">保存方案</button>
      </div>
    `;

    reorderTemplateRelationSections();
    renderTplMaterialTable();
    renderTplOutputTable();
    renderTplMaterialWarehouseField();
    renderTplOutputWarehouseField();
    syncTemplateDescriptionWidth();
    bindTemplateEditorEvents();
  }

  function renderTplMaterialWarehouseField() {
    const container = document.getElementById('tplMaterialWarehouseField');
    if (!container) return;
    const isEdit = state.templateEditMode === 'edit';
    const isManyToOne = getTemplateRelationType() === 'many-to-one';
    const item = state.templateEditData.materials?.find((material) => material.warehouse)
      || state.templateEditData.materials?.[0]
      || {};
    container.innerHTML = isEdit && !isManyToOne
      ? `<span class="template-warehouse-readonly">${escapeHtml(state.templateEditData.materialWarehouse || item.warehouse || '--')}</span>`
      : renderWarehouseSelect(state.templateEditData.materialWarehouse || item.warehouse || '');
  }

  function renderTplOutputWarehouseField() {
    const container = document.getElementById('tplOutputWarehouseField');
    if (!container) return;
    const isEdit = state.templateEditMode === 'edit';
    const isManyToOne = getTemplateRelationType() === 'many-to-one';
    const outputs = Array.isArray(state.templateEditData.outputs) ? state.templateEditData.outputs : [];
    const selectedWarehouse = state.templateEditData.outputWarehouse
      || outputs.find((item) => item.warehouse)?.warehouse
      || state.templateEditData.materials?.[0]?.warehouse
      || '';
    container.innerHTML = isEdit && isManyToOne
      ? `<span class="template-warehouse-readonly">${escapeHtml(selectedWarehouse || '--')}</span>`
      : renderWarehouseSelect(selectedWarehouse, 'output');
  }

  function reorderTemplateRelationSections() {
    const body = document.getElementById('templateModalBody');
    const materialSection = document.getElementById('tplMaterialSection');
    const outputSection = document.getElementById('tplOutputSection');
    if (!body || !materialSection || !outputSection) return;
    if (getTemplateRelationType() === 'many-to-one') {
      body.insertBefore(outputSection, materialSection);
    } else {
      body.insertBefore(materialSection, outputSection);
    }
  }

  function createBlankTemplateMaterial(warehouse = '') {
    return { warehouse, productCode: '', productName: '', unit: '', refConsumeQty: '' };
  }

  function createBlankTemplateOutput(warehouse = '') {
    return { warehouse, productCode: '', productName: '', unit: '', refCoefficient: '' };
  }

  function getTemplateRelationType() {
    return state.templateEditData?.relationType === 'many-to-one' ? 'many-to-one' : 'one-to-many';
  }

  function normalizeTemplateRows() {
    const data = state.templateEditData;
    if (!data) return;
    const relationType = data.relationType === 'many-to-one' ? 'many-to-one' : 'one-to-many';
    const sourceMaterials = Array.isArray(data.materials) ? data.materials : [];
    const sourceOutputs = Array.isArray(data.outputs) ? data.outputs : [];
    const materialWarehouse = data.materialWarehouse || sourceMaterials.find((item) => item.warehouse)?.warehouse || '';
    const outputWarehouse = data.outputWarehouse
      || sourceOutputs.find((item) => item.warehouse)?.warehouse
      || materialWarehouse;
    data.materialWarehouse = materialWarehouse;
    data.outputWarehouse = outputWarehouse;
    data.relationType = relationType;

    const selectedMaterials = sourceMaterials
      .filter((item) => item.productCode)
      .slice(0, relationType === 'many-to-one' ? MATERIAL_LIMIT : 1)
      .map((item) => ({ ...item, warehouse: materialWarehouse }));
    const blankMaterials = sourceMaterials.filter((item) => !item.productCode);
    if (relationType === 'many-to-one') {
      data.materials = selectedMaterials.concat(
        blankMaterials.length ? blankMaterials : [createBlankTemplateMaterial(materialWarehouse)]
      );
      if (selectedMaterials.length >= MATERIAL_LIMIT) data.materials = selectedMaterials;
    } else {
      data.materials = [selectedMaterials[0] || createBlankTemplateMaterial(materialWarehouse)];
    }

    const selectedOutputs = sourceOutputs
      .filter((item) => item.productCode)
      .slice(0, relationType === 'many-to-one' ? 1 : OUTPUT_LIMIT)
      .map((item) => ({ ...item, warehouse: outputWarehouse }));
    const blankOutput = sourceOutputs.find((item) => !item.productCode);
    data.outputs = relationType === 'many-to-one'
      ? [selectedOutputs[0] || blankOutput || createBlankTemplateOutput(outputWarehouse)]
      : selectedOutputs.concat(selectedOutputs.length < OUTPUT_LIMIT
        ? [blankOutput || createBlankTemplateOutput(outputWarehouse)]
        : []);
  }

  function renderTplMaterialTable() {
    const tbody = document.getElementById('tplMaterialBody');
    if (!tbody) return;
    normalizeTemplateRows();
    const isEdit = state.templateEditMode === 'edit';
    const isManyToOne = getTemplateRelationType() === 'many-to-one';
    const demandHeader = document.getElementById('tplMaterialDemandHeader');
    const actionHeader = document.getElementById('tplMaterialActionHeader');
    if (demandHeader) demandHeader.style.display = isManyToOne ? '' : 'none';
    if (actionHeader) actionHeader.style.display = isManyToOne ? '' : 'none';
    tbody.innerHTML = state.templateEditData.materials.map((item, index) => {
      const displayData = getProductDisplayData(item);
      const materialDisplay = item.productCode
        ? `${displayData.product?.isNetVegetable ? '<span class="net-vegetable-tag">净菜</span>' : ''}<span>${escapeHtml(formatProductDisplay(item))}</span>`
        : '';
      const materialReadonly = isEdit && !isManyToOne;
      const productCell = materialReadonly
        ? `<span class="sub-table-readonly template-product-display">${materialDisplay || '--'}</span>`
        : item.warehouse
          ? renderProductSelect('material', item.productCode, true, index)
          : '<span class="sub-table-readonly sub-table-placeholder">请先选择仓库</span>';
      return `
        <tr data-tpl-material-index="${index}">
          <td>${productCell}</td>
          <td><span class="sub-table-readonly">${escapeHtml(displayData.unit)}</span></td>
          <td style="display:${isManyToOne ? 'table-cell' : 'none'}">
            ${isManyToOne
              ? `<input class="sub-table-input" type="number" min="0" step="0.0001" placeholder="请输入" data-tpl-material-field="refConsumeQty" value="${escapeHtml(item.refConsumeQty || '')}">`
              : ''}
          </td>
          <td style="display:${isManyToOne ? 'table-cell' : 'none'}">
            ${isManyToOne && item.productCode ? `<button class="row-delete-btn" type="button" data-action="tpl-delete-material" data-index="${index}">删除</button>` : ''}
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderTplOutputTable() {
    const tbody = document.getElementById('tplOutputBody');
    if (!tbody) return;
    normalizeTemplateRows();
    const data = state.templateEditData;
    const isManyToOne = getTemplateRelationType() === 'many-to-one';
    const coefficientHeader = document.getElementById('tplOutputCoefficientHeader');
    const actionHeader = document.getElementById('tplOutputActionHeader');
    if (coefficientHeader) coefficientHeader.style.display = isManyToOne ? 'none' : '';
    if (actionHeader) actionHeader.style.display = isManyToOne ? 'none' : '';
    tbody.innerHTML = data.outputs.map((item, index) => {
      const product = item.productCode ? findProduct(item.productCode) : null;
      const unit = product ? product.unit : (item.unit || '--');
      const outputProductCell = state.templateEditMode === 'edit' && isManyToOne
        ? `<span class="sub-table-readonly template-product-display">${item.productCode ? escapeHtml(formatProductDisplay(item)) : '--'}</span>`
        : renderProductSelect('output', item.productCode, true, index);
      return `
        <tr data-tpl-output-index="${index}">
          <td>${outputProductCell}</td>
          <td><span class="sub-table-readonly">${escapeHtml(unit)}</span></td>
          <td style="display:${isManyToOne ? 'none' : 'table-cell'}"><input class="sub-table-input" type="number" min="0" step="0.01" placeholder="请输入" data-tpl-output-field="refCoefficient" value="${escapeHtml(item.refCoefficient || '')}"></td>
          <td style="display:${isManyToOne ? 'none' : 'table-cell'}">${!isManyToOne && item.productCode
            ? `<button class="row-delete-btn" type="button" data-action="tpl-delete-output" data-index="${index}">删除</button>`
            : ''}</td>
        </tr>
      `;
    }).join('');
  }

  function syncTemplateDescriptionWidth() {
    const control = document.querySelector('.template-description-control');
    const isManyToOne = getTemplateRelationType() === 'many-to-one';
    const topTable = document.querySelector(isManyToOne
      ? '#tplOutputSection .processing-sub-table'
      : '#tplMaterialSection .processing-sub-table');
    if (!control || !topTable) return;

    const controlLeft = control.getBoundingClientRect().left;
    const topTableRight = topTable.getBoundingClientRect().right;
    const width = topTableRight - controlLeft;
    if (width <= 0) return;
    control.style.flex = '0 0 auto';
    control.style.width = `${Math.round(width)}px`;
    control.style.maxWidth = '100%';
  }

  function closeCustomSelect(select) {
    if (!select) return;
    select.classList.remove('is-open', 'is-drop-up', 'is-searching');
    const dropdown = select.querySelector('.custom-select-dropdown');
    if (dropdown) dropdown.style.display = 'none';
    const input = select.querySelector('.product-combobox-input');
    if (input) {
      input.value = input.dataset.displayValue || '';
      input.placeholder = '请选择';
      input.setAttribute('aria-expanded', 'false');
      filterProductSelectOptions(select);
    }
  }

  function positionCustomSelectDropdown(select) {
    const dropdown = select?.querySelector('.custom-select-dropdown');
    const trigger = select?.querySelector('.custom-select-trigger');
    if (!dropdown || !trigger) return;

    const rect = trigger.getBoundingClientRect();
    dropdown.style.display = 'block';
    dropdown.style.position = 'fixed';
    dropdown.style.left = rect.left + 'px';
    dropdown.style.width = rect.width + 'px';
    dropdown.style.zIndex = '100';

    const viewportH = window.innerHeight;
    const viewportPadding = 12;
    const dropdownMaxHeight = 280;
    const footer = document.querySelector('#templateEditorPage > .processing-form-footer');
    const footerRect = footer?.getBoundingClientRect();
    const viewportBottom = viewportH - viewportPadding;
    const footerBoundary = footerRect
      && footerRect.top > rect.bottom
      && footerRect.top < viewportH
      ? footerRect.top - 8
      : viewportBottom;
    const lowerBoundary = Math.min(viewportBottom, footerBoundary);
    const spaceBelow = Math.max(0, lowerBoundary - rect.bottom);
    const spaceAbove = Math.max(0, rect.top - viewportPadding);
    dropdown.style.maxHeight = '';
    const desiredHeight = Math.min(dropdownMaxHeight, dropdown.scrollHeight || dropdownMaxHeight);
    const openUpward = spaceBelow < desiredHeight && spaceAbove > spaceBelow;
    const availableHeight = openUpward ? spaceAbove : spaceBelow;
    select.classList.toggle('is-drop-up', openUpward);
    dropdown.style.maxHeight = Math.min(desiredHeight, availableHeight) + 'px';
    if (openUpward) {
      dropdown.style.top = 'auto';
      dropdown.style.bottom = (viewportH - rect.top) + 'px';
    } else {
      dropdown.style.top = rect.bottom + 'px';
      dropdown.style.bottom = 'auto';
    }
    dropdown.scrollTop = 0;
  }

  function openCustomSelect(select, { selectInput = true } = {}) {
    if (!select) return;
    document.querySelectorAll('.custom-select.is-open').forEach((current) => {
      if (current !== select) closeCustomSelect(current);
    });
    select.classList.add('is-open');
    const input = select.querySelector('.product-combobox-input');
    if (input) {
      input.placeholder = '搜索商品名称/编码';
      input.setAttribute('aria-expanded', 'true');
      filterProductSelectOptions(select);
    }
    positionCustomSelectDropdown(select);
    if (input && selectInput) {
      input.focus({ preventScroll: true });
      input.select();
    }
  }

  function bindTemplateEditorEvents() {
    const body = document.getElementById('templateModalBody');
    if (!body) return;
    if (body.dataset.bound === 'true') return;
    body.dataset.bound = 'true';

    body.addEventListener('click', (event) => {
      const action = event.target.closest('[data-action]')?.dataset.action;
      if (action === 'tpl-delete-material') {
        if (getTemplateRelationType() !== 'many-to-one') return;
        normalizeTemplateRows();
        const selectedCount = state.templateEditData.materials.filter((material) => material.productCode).length;
        if (selectedCount <= 1) {
          showTemplateToast('至少保留1条原料');
          return;
        }
        const index = Number(event.target.closest('[data-action]').dataset.index);
        state.templateEditData.materials.splice(index, 1);
        renderTplMaterialTable();
        return;
      }
      if (action === 'tpl-delete-output') {
        if (getTemplateRelationType() === 'many-to-one') return;
        normalizeTemplateRows();
        const selectedCount = state.templateEditData.outputs.filter((output) => output.productCode).length;
        if (selectedCount <= 1) {
          showTemplateToast('至少保留1条成品');
          return;
        }
        const index = Number(event.target.closest('[data-action]').dataset.index);
        state.templateEditData.outputs.splice(index, 1);
        renderTplOutputTable();
        return;
      }
      if (action === 'product-combobox-input') {
        const select = event.target.closest('.custom-select');
        if (!select.classList.contains('is-open')) openCustomSelect(select);
        event.stopPropagation();
        return;
      }
      if (action === 'toggle-select') {
        const select = event.target.closest('.custom-select');
        if (select.classList.contains('is-open')) {
          closeCustomSelect(select);
        } else {
          openCustomSelect(select);
        }
        event.stopPropagation();
        return;
      }
      if (action === 'select-product') {
        const option = event.target.closest('.custom-select-option');
        if (option.dataset.disabled === 'true') {
          event.stopPropagation();
          return;
        }
        const select = option.closest('.custom-select');
        const fieldType = select.dataset.selectType;
        const product = findProduct(option.dataset.value);
        closeCustomSelect(select);
        if (fieldType === 'material') {
          const row = option.closest('[data-tpl-material-index]');
          const index = Number(row?.dataset.tplMaterialIndex);
          const target = state.templateEditData.materials[index];
          if (product && target) {
            target.productCode = product.code;
            target.productName = product.name;
            target.unit = product.unit;
          }
          renderTplMaterialTable();
        } else if (fieldType === 'output') {
          const row = option.closest('[data-tpl-output-index]');
          const index = Number(row.dataset.tplOutputIndex);
          if (product) {
            state.templateEditData.outputs[index].productCode = product.code;
            state.templateEditData.outputs[index].productName = product.name;
            state.templateEditData.outputs[index].unit = product.unit;
          }
          renderTplOutputTable();
        }
        event.stopPropagation();
        return;
      }
      if (action === 'select-warehouse') {
        const option = event.target.closest('.custom-select-option');
        const select = option.closest('.custom-select');
        const warehouse = option.dataset.value;
        const warehouseScope = option.closest('.custom-select')?.dataset.warehouseScope || '';
        closeCustomSelect(select);
        if (warehouseScope === 'output') {
          state.templateEditData.outputWarehouse = warehouse;
          state.templateEditData.outputs.forEach((output) => { output.warehouse = warehouse; });
          renderTplOutputTable();
          renderTplOutputWarehouseField();
        } else {
          const isManyToOne = getTemplateRelationType() === 'many-to-one';
          // 多对一的原料端可换仓库，但不能因为换仓库破坏已有原料配置。
          state.templateEditData.materials.forEach((material) => { material.warehouse = warehouse; });
          state.templateEditData.materialWarehouse = warehouse;
          if (!isManyToOne) {
            // 一对多创建时更换原料仓库，需要重新选择原料，并重置成品仓库回显。
            state.templateEditData.materials.forEach((material) => {
              material.productCode = '';
              material.productName = '';
              material.unit = '';
            });
            state.templateEditData.outputWarehouse = '';
            state.templateEditData.outputs.forEach((output) => { output.warehouse = ''; });
          }
          renderTplMaterialTable();
          renderTplOutputTable();
          renderTplMaterialWarehouseField();
          renderTplOutputWarehouseField();
        }
        event.stopPropagation();
        return;
      }
    });

    body.addEventListener('input', (event) => {
      const productInput = event.target.closest('.product-combobox-input');
      if (productInput) {
        const select = productInput.closest('.custom-select');
        if (!select.classList.contains('is-open')) {
          openCustomSelect(select, { selectInput: false });
        }
        select.classList.add('is-searching');
        filterProductSelectOptions(select, productInput.value);
        return;
      }
      if (event.target.id === 'tplDesc') {
        const counter = document.getElementById('tplDescCounter');
        if (counter) counter.textContent = `${event.target.value.length}/200`;
        return;
      }
      const refConsumeInput = event.target.closest('[data-tpl-material-field="refConsumeQty"]');
      if (refConsumeInput) {
        const row = refConsumeInput.closest('[data-tpl-material-index]');
        const index = Number(row?.dataset.tplMaterialIndex);
        if (state.templateEditData.materials[index]) {
          state.templateEditData.materials[index].refConsumeQty = refConsumeInput.value;
        }
        return;
      }
      const refCoeffInput = event.target.closest('[data-tpl-output-field="refCoefficient"]');
      if (refCoeffInput) {
        const row = refCoeffInput.closest('[data-tpl-output-index]');
        const index = Number(row.dataset.tplOutputIndex);
        state.templateEditData.outputs[index].refCoefficient = refCoeffInput.value;
        return;
      }
      const refCostInput = event.target.closest('[data-tpl-output-field="refCostPrice"]');
      if (refCostInput) {
        const row = refCostInput.closest('[data-tpl-output-index]');
        const index = Number(row.dataset.tplOutputIndex);
        state.templateEditData.outputs[index].refCostPrice = refCostInput.value;
        return;
      }
    });

    body.addEventListener('change', (event) => {
      const relationTypeInput = event.target.closest('input[name="tplRelationType"]');
      if (!relationTypeInput) return;
      state.templateEditData.relationType = relationTypeInput.value;
      const editorPage = document.getElementById('templateEditorPage');
      editorPage?.classList.toggle('is-one-to-many', relationTypeInput.value !== 'many-to-one');
      editorPage?.classList.toggle('is-many-to-one', relationTypeInput.value === 'many-to-one');
      normalizeTemplateRows();
      reorderTemplateRelationSections();
      renderTplMaterialTable();
      renderTplOutputTable();
      syncTemplateDescriptionWidth();
    });
  }

  function bindTemplateEditorPageEvents() {
    const page = document.getElementById('templateEditorPage');
    if (!page || page.dataset.bound === 'true') return;
    page.dataset.bound = 'true';
    page.addEventListener('click', (event) => {
      const action = event.target.closest('[data-action]')?.dataset.action;
      if (action === 'back-to-list' || action === 'close-template-modal') {
        event.stopPropagation();
        closeTemplateEditorPage();
        return;
      }
      if (action === 'save-template') {
        event.stopPropagation();
        saveTemplate();
      }
    });
  }

  function saveTemplate() {
    const name = document.getElementById('tplName').value.trim();
    const description = document.getElementById('tplDesc').value.trim();
    if (!name) { alert('请输入方案名称'); return; }

    normalizeTemplateRows();
    const relationType = getTemplateRelationType();
    const validMaterials = state.templateEditData.materials.filter((m) => m.productCode);
    if (validMaterials.length === 0) {
      alert('至少配置1条原料');
      return;
    }
    if (validMaterials.length > MATERIAL_LIMIT) { alert(`原料最多添加${MATERIAL_LIMIT}条`); return; }
    if (relationType === 'many-to-one') {
      const materialCodes = validMaterials.map((material) => material.productCode);
      if (new Set(materialCodes).size !== materialCodes.length) {
        alert('原料商品不能重复');
        return;
      }
      if (validMaterials.some((material) => !Number.isFinite(Number(material.refConsumeQty)) || Number(material.refConsumeQty) <= 0)) {
        alert('请填写每种原料的单位成品需求系数，且必须大于0');
        return;
      }
    }
    const materialWarehouse = state.templateEditData.materialWarehouse || validMaterials[0].warehouse;
    if (!materialWarehouse) { alert('请选择原料仓库'); return; }
    const outputWarehouse = state.templateEditData.outputWarehouse || materialWarehouse;
    const validOutputs = state.templateEditData.outputs
      .filter((o) => o.productCode)
      .map((output) => ({
        ...output,
        warehouse: outputWarehouse
      }));
    if (validOutputs.length === 0) {
      alert('成品商品不能为空');
      return;
    }
    if (relationType === 'many-to-one' && validOutputs.length !== 1) {
      alert('多对一关系只能设置1条成品');
      return;
    }
    if (validOutputs.length > OUTPUT_LIMIT) { alert(`成品最多添加${OUTPUT_LIMIT}条`); return; }
    const outputCodes = validOutputs.map((output) => output.productCode);
    if (new Set(outputCodes).size !== outputCodes.length) {
      alert('成品商品不能重复，一个商品只能设置一行');
      return;
    }
    if (!outputWarehouse) {
      alert('请选择成品入库仓库');
      return;
    }
    if (relationType === 'one-to-many'
      && validOutputs.some((output) => !Number.isFinite(Number(output.refCoefficient)) || Number(output.refCoefficient) <= 0)) {
      alert('加工系数不能为空且必须大于0');
      return;
    }

    const payload = {
      name,
      description,
      relationType,
      materialWarehouse,
      outputWarehouse,
      materials: validMaterials.map((m) => ({
        warehouse: materialWarehouse,
        productCode: m.productCode,
        productName: m.productName,
        unit: m.unit,
        refConsumeQty: relationType === 'many-to-one' ? m.refConsumeQty : ''
      })),
      outputs: validOutputs.map((o) => ({
        warehouse: outputWarehouse,
        productCode: o.productCode,
        productName: o.productName,
        unit: o.unit,
        refCoefficient: relationType === 'one-to-many' ? o.refCoefficient : ''
      }))
    };

    let saved;
    if (state.templateEditMode === 'edit' && state.templateEditData.id) {
      saved = window.ProcessingTemplateService.update(state.templateEditData.id, payload);
    } else {
      saved = window.ProcessingTemplateService.create(payload);
    }
    if (!saved) {
      alert('保存失败，请重试');
      return;
    }

    state.templates = window.ProcessingTemplateService.getList();
    renderTemplateList();
    closeTemplateEditorPage();
    showTemplateToast('操作成功');
  }

  function deleteTemplate(id) {
    const tpl = state.templates.find((t) => t.id === id);
    if (!tpl) return;
    if (!window.confirm(`确认删除方案「${tpl.name}」吗？`)) return;
    window.ProcessingTemplateService.remove(id);
    state.templates = window.ProcessingTemplateService.getList();
    if (state.selectedTemplateId === id) {
      state.selectedTemplateId = null;
      renderOperationForm();
    }
    renderTemplateList();
  }

  function ensureDemandProductOption(productInfo) {
    const existing = findProduct(productInfo.code);
    if (existing) return existing;
    const product = {
      seq: state.products.length + 1,
      code: productInfo.code,
      name: productInfo.name,
      goodsName: productInfo.name,
      isNetVegetable: true,
      unit: productInfo.unit || 'KG',
      brand: '--',
      spec: '--',
      marketPrice: '',
      status: 'ENABLE'
    };
    state.products.push(product);
    return product;
  }

  function startCreateTemplate(prefillProduct = null) {
    const outputProduct = prefillProduct?.code
      ? ensureDemandProductOption(prefillProduct)
      : null;
    state.templateEditMode = 'create';
    state.templateEditData = {
      name: '',
      description: '',
      relationType: 'one-to-many',
      materials: [createBlankTemplateMaterial(defaultWarehouse)],
      materialWarehouse: defaultWarehouse,
      outputWarehouse: '',
      outputs: [{
        ...createBlankTemplateOutput(''),
        productCode: outputProduct?.code || '',
        productName: outputProduct?.name || '',
        unit: outputProduct?.unit || ''
      }]
    };
    showTemplateEditorPage();
    renderTemplateEditor();
  }

  function startEditTemplate(id) {
    const tpl = window.ProcessingTemplateService.getDetail(id);
    if (!tpl) return;
    state.templateEditMode = 'edit';
    state.templateEditData = JSON.parse(JSON.stringify(tpl));
    showTemplateEditorPage();
    renderTemplateEditor();
  }

  /* ===== 全局事件绑定 ===== */
  function bindGlobalEvents() {
    const root = document.querySelector('.processing-workspace');
    if (!root) return;

    // 左侧模版列表点击
    root.addEventListener('click', (event) => {
      const actionEl = event.target.closest('[data-action]');
      if (!actionEl) return;
      const action = actionEl.dataset.action;

      // 编辑/删除按钮（阻止冒泡到卡片选中）
      if (action === 'edit-template') {
        event.stopPropagation();
        startEditTemplate(actionEl.dataset.tplId);
        return;
      }
      if (action === 'delete-template') {
        event.stopPropagation();
        deleteTemplate(actionEl.dataset.tplId);
        return;
      }
      if (action === 'create-template') {
        startCreateTemplate();
        return;
      }
      if (action === 'create-template-for-demand') {
        startCreateTemplate({
          code: actionEl.dataset.productCode || '',
          name: actionEl.dataset.productName || ''
        });
        return;
      }

      // 卡片选中
      const card = event.target.closest('[data-action="select-template"]');
      if (card) {
        selectTemplate(card.dataset.templateId);
        return;
      }
    });

    // 搜索框
    const search = document.getElementById('templateSearch');
    if (search) {
      search.addEventListener('input', renderTemplateList);
    }
  }

  function bindSubmitConfirmEvents() {
    const modal = document.getElementById('processingSubmitConfirmModal');
    if (!modal) return;
    modal.addEventListener('click', (event) => {
      const action = event.target.closest('[data-action]')?.dataset.action;
      if (action === 'close-processing-submit' || event.target === modal) {
        closeSubmitConfirm();
        return;
      }
      if (action === 'confirm-processing-submit') confirmSubmitOperation();
    });
  }

  /* ===== 初始化 ===== */
  window.AppShell.mount({ title: '净菜加工', content: pageContent });
  state.filteredTemplates = [...state.templates];
  renderTemplateList();
  renderOperationForm();
  bindGlobalEvents();
  bindTemplateEditorPageEvents();
  bindSubmitConfirmEvents();
  window.addEventListener('resize', syncTemplateDescriptionWidth);

  document.addEventListener('click', () => {
    document.querySelectorAll('.custom-select.is-open').forEach(closeCustomSelect);
  });
})();
