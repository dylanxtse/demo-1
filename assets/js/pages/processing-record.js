(function () {
  const downloadIcon = '<svg class="icon-svg" viewBox="0 0 24 24" style="width:14px;height:14px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
  const backIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/><path d="M19 12H9"/></svg>';

  const pageContent = `
    <div class="page-card processing-record-page">
      <div class="filter-section">
        <div class="filter-panel">
          <div class="filter-fields">
            <div class="filter-group">
              <label class="filter-label">加工日期</label>
              <div class="date-range-picker record-date-range-picker" id="recDateRange">
                <input class="filter-input date-range-display" id="recDateDisplay" placeholder="请选择日期" readonly>
                <span class="date-range-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></span>
                <input type="hidden" id="recDateStartFilter">
                <input type="hidden" id="recDateEndFilter">
              </div>
            </div>
            <div class="filter-group">
                <label class="filter-label" for="recStatusFilter">状态</label>
                <select class="filter-select" id="recStatusFilter">
                <option>全部</option>
                <option>待审核</option>
                <option>已驳回</option>
                <option>已完成</option>
              </select>
            </div>
            <div class="filter-group">
              <label class="filter-label" for="recMaterialFilter">原料商品</label>
              <input class="filter-input" id="recMaterialFilter" placeholder="请输入原料名称">
            </div>
            <div class="filter-group">
              <label class="filter-label" for="recOrderFilter">加工单号</label>
              <input class="filter-input" id="recOrderFilter" placeholder="请输入加工单号">
            </div>
            <div class="filter-group">
              <label class="filter-label" for="recOutboundFilter">出库单号</label>
              <input class="filter-input" id="recOutboundFilter" placeholder="请输入出库单号">
            </div>
            <div class="filter-group">
              <label class="filter-label" for="recInboundFilter">入库单号</label>
              <input class="filter-input" id="recInboundFilter" placeholder="请输入入库单号">
            </div>
          </div>
          <div class="action-controls action-controls-multi">
            <div class="action-controls-row">
              <button class="btn btn-primary btn-sm btn-fixed" type="button" data-action="query">查询</button>
              <button class="btn btn-sm btn-fixed" type="button" data-action="reset">重置</button>
            </div>
            <div class="action-controls-row">
              <button class="btn btn-sm btn-fixed" type="button" data-action="export">${downloadIcon}导出</button>
            </div>
          </div>
        </div>
      </div>

      <div class="table-container">
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th class="checkbox-cell" rowspan="2"><span class="custom-checkbox" role="checkbox" aria-checked="false" data-action="toggle-all"></span></th>
                <th rowspan="2">加工单号</th>
                <th rowspan="2" class="processing-record-material-col">原料商品（计量单位/品牌/规格）</th>
                <th rowspan="2">原料用量</th>
                <th colspan="2">加工成品</th>
                <th rowspan="2">原料出库单</th>
                <th rowspan="2">成品入库单</th>
                <th rowspan="2">加工日期</th>
                <th rowspan="2">状态</th>
                <th rowspan="2">操作人</th>
                <th rowspan="2">操作</th>
              </tr>
              <tr>
                <th class="processing-record-product-col">成品商品（计量单位/品牌/规格）</th>
                <th>实际获得量</th>
              </tr>
            </thead>
            <tbody id="recTableBody"></tbody>
          </table>
        </div>
        <div class="pagination">
          <span class="page-total">共 0 条数据</span>
          <select class="page-size-select" aria-label="每页数量"><option>20 条/页</option><option>50 条/页</option><option>100 条/页</option></select>
          <div class="page-btns" id="recPageBtns"></div>
          <div class="page-jump">
            <span>跳至</span>
            <input type="text" value="1" aria-label="跳转页码">
            <span>页</span>
          </div>
        </div>
      </div>

    </div>
    <div class="page-card processing-detail-page" id="recDetailPage" style="display:none;">
        <div class="processing-detail-page-header">
          <button class="back-link" type="button" data-action="back-to-list">
            ${backIcon}
            <span>返回</span>
          </button>
          <h1>加工单详情</h1>
        </div>
        <div class="processing-detail-page-body" id="recDetailBody"></div>
        <div class="processing-form-footer processing-detail-footer" id="recDetailFooter"></div>
    </div>
    <div class="page-card processing-operation-panel processing-record-edit-page" id="recEditPage" style="display:none;">
      <div class="operation-form" id="recEditForm"></div>
    </div>
  `;

  const state = {
    orders: [],
    visibleOrders: [],
    selectedIds: new Set(),
    dateStart: '',
    dateEnd: ''
  };
  let recordDatePicker = null;
  let editOrderId = null;
  let editDatePicker = null;
  let editFormState = null;

  function escapeHtml(value) {
    return window.DomUtils.escapeHtml(value);
  }

  function productNetTag(productCode) {
    if (!productCode) return '';
    const products = window.ProductService?.getList?.() || window.MockProducts || [];
    const product = products.find((p) => p.code === productCode);
    return product?.isNetVegetable ? '<span class="net-vegetable-tag">净菜</span>' : '';
  }

  function renderProductName(productCode, productName, unit, nameSuffix = '') {
    const products = window.ProductService?.getList?.() || window.MockProducts || [];
    const product = products.find((item) => item.code === productCode) || {};
    const name = product.name || productName || '--';
    const displayUnit = product.unit || unit || '--';
    const brand = product.brand || '--';
    const spec = product.spec || '--';
    return `<div class="name-cell processing-record-product-name">
      <div class="name-main">${productNetTag(productCode)}${escapeHtml(name)}${nameSuffix}</div>
      <div class="name-sub">${escapeHtml(displayUnit)}/${escapeHtml(brand)}/${escapeHtml(spec)}</div>
    </div>`;
  }

  function renderOperationLogs(logs) {
    if (!logs || !logs.length) return '<span class="detail-empty">--</span>';
    return logs.map((log) => `
      <div class="detail-timeline-item">
        <div class="detail-timeline-node"></div>
        <div class="detail-timeline-content">
          <span class="detail-timeline-action">${escapeHtml(log.action)}</span>
          <span class="detail-timeline-desc">${escapeHtml(log.desc)}</span>
        </div>
      </div>
    `).join('');
  }

  function renderAttachments(attachments) {
    if (!attachments || !attachments.length) return '<span class="detail-empty">--</span>';
    return attachments.map((file) => `
      <div class="detail-attachment-item">
        <div class="detail-attachment-thumb">${escapeHtml(file.format)}</div>
        <div class="detail-attachment-info">
          <span class="detail-attachment-name">${escapeHtml(file.name)}</span>
          <span class="detail-attachment-meta">${escapeHtml(file.format.toUpperCase())} · ${escapeHtml(file.size)}</span>
        </div>
      </div>
    `).join('');
  }

  function getStatusClass(status) {
    if (status === '已完成') return 'online';
    if (status === '待审核') return 'draft';
    if (status === '已驳回') return 'cancelled';
    return 'offline';
  }

  function getDisplayStatus(order) {
    return window.BusinessRules.statusLabel('processingOrders', order.status);
  }

  function getRelatedOrderId(order, type) {
    const keys = type === 'outbound'
      ? ['outboundOrderId', 'outboundId', 'materialOutboundOrderId', 'materialOutboundId']
      : ['inboundOrderId', 'inboundId', 'outputInboundOrderId', 'outputInboundId'];
    return keys.map((key) => order[key]).find(Boolean) || '';
  }

  function renderRelatedOrderLink(order, type) {
    const id = getRelatedOrderId(order, type);
    if (!id) return '--';
    const detailPage = type === 'outbound' ? 'outbound-detail.html' : 'inbound-detail.html';
    return `<a class="code-link related-order-link" href="./${detailPage}?id=${encodeURIComponent(id)}&returnTo=${encodeURIComponent('processing-record.html')}">${escapeHtml(id)}</a>`;
  }

  function loadOrders() {
    const all = window.ProcessingService.getList();
    state.orders = all;
  }

  function calcMaterialCost(materials) {
    if (!materials || materials.length === 0) return '--';
    const total = materials.reduce((sum, m) => sum + (Number(m.consumeQty) || 0) * (Number(m.avgPrice) || 0), 0);
    return total.toFixed(2);
  }

  function summarizeMaterials(materials) {
    if (!materials || materials.length === 0) return '--';
    if (materials.length === 1) return renderProductName(materials[0].productCode, materials[0].productName, materials[0].unit);
    return `${renderProductName(materials[0].productCode, materials[0].productName, materials[0].unit)}<span class="processing-record-product-more">等${materials.length}种</span>`;
  }

  function renderRowActions(order) {
    const id = escapeHtml(order.id);
    const status = getDisplayStatus(order);
    const detailButton = `<button class="btn-text" type="button" data-row-action="detail" data-id="${id}">详情</button>`;
    if (status === '已驳回') {
      return `<button class="btn-text" type="button" data-row-action="edit" data-id="${id}">编辑</button>${detailButton}`;
    }
    if (status === '待审核') {
      return `<button class="btn-text" type="button" data-row-action="detail" data-id="${id}">审核</button>${detailButton}`;
    }
    return detailButton;
  }

  function summarizeConsumeQty(materials) {
    if (!materials || materials.length === 0) return '--';
    return materials.map((m) => `${m.consumeQty}${escapeHtml(m.unit)}`).join('，');
  }

  function renderOrderRows(order) {
    const outputs = (order.outputs || []).slice(0, 2);
    const outputCount = (order.outputs || []).length;
    const visibleOutputs = outputs.length > 0 ? outputs : [{ productName: '--', actualQty: '--', unit: '' }];
    const rowSpan = visibleOutputs.length;
    const sharedCells = (index) => index === 0 ? `
      <td class="checkbox-cell" rowspan="${rowSpan}"><span class="custom-checkbox ${state.selectedIds.has(order.id) ? 'checked' : ''}" role="checkbox" aria-checked="${state.selectedIds.has(order.id)}" data-action="toggle-row" data-id="${escapeHtml(order.id)}"></span></td>
      <td rowspan="${rowSpan}"><button class="btn-text code-link" type="button" data-row-action="detail" data-id="${escapeHtml(order.id)}">${escapeHtml(order.id)}</button></td>
      <td rowspan="${rowSpan}" class="processing-record-material-col">${summarizeMaterials(order.materials)}</td>
      <td rowspan="${rowSpan}">${summarizeConsumeQty(order.materials)}</td>
    ` : '';
    const tailCells = (index) => index === 0 ? `
      <td rowspan="${rowSpan}">${renderRelatedOrderLink(order, 'outbound')}</td>
      <td rowspan="${rowSpan}">${renderRelatedOrderLink(order, 'inbound')}</td>
      <td rowspan="${rowSpan}">${escapeHtml(order.processingDate)}</td>
      <td rowspan="${rowSpan}"><span class="status-tag ${getStatusClass(getDisplayStatus(order))}">${escapeHtml(getDisplayStatus(order))}</span></td>
      <td rowspan="${rowSpan}">${escapeHtml(order.operator)}</td>
      <td class="action-cell" rowspan="${rowSpan}">${renderRowActions(order)}</td>
    ` : '';

    const rowClass = visibleOutputs.length > 1 ? 'is-multi-output' : 'is-single-output';
    return visibleOutputs.map((output, index) => `
      <tr class="processing-record-sub-row ${rowClass}" data-order-id="${escapeHtml(order.id)}">
        ${sharedCells(index)}
        <td class="record-output-product-cell processing-record-product-col">
          <div class="record-output-product">${renderProductName(output.productCode, output.productName, output.unit, outputCount > 2 && index === 1 ? `<button class="btn-text record-output-more" type="button" data-row-action="detail" data-id="${escapeHtml(order.id)}">更多</button>` : '')}</div>
        </td>
        <td class="record-output-qty-cell">${escapeHtml(output.actualQty !== '' && output.actualQty != null ? `${output.actualQty}${output.unit || ''}` : '--')}</td>
        ${tailCells(index)}
      </tr>
    `).join('');
  }

  function renderTable(orders = state.visibleOrders) {
    state.visibleOrders = orders;
    const tbody = document.getElementById('recTableBody');
    tbody.innerHTML = orders.map(renderOrderRows).join('');
    document.querySelector('.processing-record-page .page-total').textContent = `共 ${orders.length} 条数据`;
    updateToggleAllCheckbox();
  }

  function updateToggleAllCheckbox() {
    const checkbox = document.querySelector('.processing-record-page [data-action="toggle-all"]');
    if (!checkbox) return;
    const allChecked = state.visibleOrders.length > 0 && state.visibleOrders.every((order) => state.selectedIds.has(order.id));
    checkbox.classList.toggle('checked', allChecked);
    checkbox.setAttribute('aria-checked', String(allChecked));
  }

  function filterOrders() {
    const value = (id) => document.getElementById(id)?.value.trim() || '';
    const orderId = value('recOrderFilter').toLowerCase();
    const materialName = value('recMaterialFilter').toLowerCase();
    const status = value('recStatusFilter');
    const outboundId = value('recOutboundFilter').toLowerCase();
    const inboundId = value('recInboundFilter').toLowerCase();
    const dateStart = value('recDateStartFilter');
    const dateEnd = value('recDateEndFilter');
    const result = state.orders.filter((order) => (
      (!orderId || order.id.toLowerCase().includes(orderId)) &&
      (!materialName || (order.materials || []).some((m) => m.productName.toLowerCase().includes(materialName))) &&
      (status === '全部' || getDisplayStatus(order) === status) &&
      (!outboundId || getRelatedOrderId(order, 'outbound').toLowerCase().includes(outboundId)) &&
      (!inboundId || getRelatedOrderId(order, 'inbound').toLowerCase().includes(inboundId)) &&
      (!dateStart || order.processingDate >= dateStart) &&
      (!dateEnd || order.processingDate <= dateEnd)
    ));
    renderTable(result);
  }

  function resetFilters() {
    ['recOrderFilter', 'recMaterialFilter', 'recOutboundFilter', 'recInboundFilter'].forEach((id) => { document.getElementById(id).value = ''; });
    document.getElementById('recStatusFilter').value = '全部';
    state.dateStart = '';
    state.dateEnd = '';
    document.getElementById('recDateStartFilter').value = '';
    document.getElementById('recDateEndFilter').value = '';
    recordDatePicker?.clear(false);
    filterOrders();
  }

  function showOperationToast(message) {
    let toast = document.getElementById('processingRecordToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'processingRecordToast';
      toast.className = 'processing-record-toast';
      toast.setAttribute('role', 'status');
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(showOperationToast.timer);
    showOperationToast.timer = setTimeout(() => toast.classList.remove('visible'), 2000);
  }

  function renderDetailFooter(order, displayStatus) {
    const id = escapeHtml(order.id);
    const returnButton = '<button class="btn" type="button" data-action="back-to-list">返回</button>';
    if (displayStatus === '已驳回') {
      return `<button class="btn btn-primary" type="button" data-action="detail-edit" data-id="${id}">编辑</button>${returnButton}`;
    }
    if (displayStatus === '待审核') {
      return `
        <button class="btn btn-primary" type="button" data-action="detail-audit" data-approved="true" data-id="${id}">审核通过</button>
        <button class="btn btn-danger" type="button" data-action="detail-audit" data-approved="false" data-id="${id}">审核驳回</button>
        ${returnButton}
      `;
    }
    return returnButton;
  }

  function getWarehouseOptions(order) {
    const values = (window.DemoStore?.get('warehouses') || [])
      .map((warehouse) => warehouse.warehouseName || warehouse.name || warehouse)
      .concat([order.materialWarehouse, order.outputWarehouse, order.warehouse])
      .filter(Boolean);
    return [...new Set(values)];
  }

  function getProcessingTemplate(order) {
    const templates = window.ProcessingTemplateService?.getList?.() || [];
    const direct = templates.find((template) => template.id === order.templateId);
    if (direct) return direct;
    const materialCodes = (order.materials || []).map((item) => item.productCode).filter(Boolean).sort().join('|');
    const outputCodes = (order.outputs || []).map((item) => item.productCode).filter(Boolean).sort().join('|');
    return templates.find((template) => {
      const templateMaterials = (template.materials || []).map((item) => item.productCode).filter(Boolean).sort().join('|');
      const templateOutputs = (template.outputs || []).map((item) => item.productCode).filter(Boolean).sort().join('|');
      return materialCodes === templateMaterials && outputCodes === templateOutputs;
    }) || null;
  }

  function getEditProductInfo(item = {}) {
    const products = window.ProductService?.getList?.() || window.MockProducts || [];
    const product = products.find((candidate) => candidate.code === item.productCode) || {};
    return {
      name: product.name || item.productName || '--',
      unit: product.unit || item.unit || '--',
      brand: product.brand || item.brand || '--',
      spec: product.spec || item.spec || '--',
      marketPrice: Number(product.marketPrice)
    };
  }

  function formatEditProduct(item) {
    const product = getEditProductInfo(item);
    return `${product.name}（${product.unit}/${product.brand}/${product.spec}）`;
  }

  function formatEditFileSize(bytes) {
    if (typeof bytes === 'string') return bytes;
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }

  function renderEditAttachments() {
    const container = document.getElementById('recEditAttachmentList');
    if (!container || !editFormState) return;
    container.innerHTML = (editFormState.attachments || []).map((file, index) => {
      const format = file.format || file.name?.split('.').pop() || 'file';
      return `<div class="remark-attachment-item">
        <span class="remark-attachment-thumb">${escapeHtml(format.toUpperCase())}</span>
        <span class="remark-attachment-name">${escapeHtml(file.name || '--')}</span>
        <span class="remark-attachment-meta">${escapeHtml(formatEditFileSize(file.size || 0))}</span>
        <button class="remark-attachment-remove" type="button" data-action="edit-remove-attachment" data-index="${index}">×</button>
      </div>`;
    }).join('');
  }

  function calculateEditRefQty() {
    if (!editFormState) return;
    const totalConsume = editFormState.materials.reduce((sum, material) => sum + (Number(material.consumeQty) || 0), 0);
    editFormState.outputs.forEach((output) => {
      const coefficient = Number(output.refCoefficient) || 0;
      output.refQty = coefficient > 0 && totalConsume > 0 ? (totalConsume * coefficient).toFixed(2) : '';
    });
  }

  function calculateEditAutoAllocations() {
    if (!editFormState) return [];
    const materialCost = editFormState.materials.reduce((sum, material) => (
      sum + (Number(material.consumeQty) || 0) * (Number(material.avgPrice) || 0)
    ), 0);
    const metrics = editFormState.outputs.map((output) => {
      const product = getEditProductInfo(output);
      const actualQty = Number(output.actualQty);
      return { actualQty, salesAmount: actualQty * product.marketPrice };
    });
    const totalActualQty = metrics.reduce((sum, item) => sum + item.actualQty, 0);
    const totalSalesAmount = metrics.reduce((sum, item) => sum + (item.salesAmount > 0 ? item.salesAmount : 0), 0);
    const useSalesWeight = materialCost > 0 && totalSalesAmount > 0 && metrics.every((item) => item.actualQty > 0 && item.salesAmount > 0);
    let allocatedTotal = 0;
    return editFormState.outputs.map((output, index) => {
      if (!(materialCost > 0) || !(metrics[index].actualQty > 0)) {
        return { allocatedCost: output.allocatedCost || '', costPrice: output.costPrice || '' };
      }
      const allocation = useSalesWeight
        ? materialCost * (metrics[index].salesAmount / totalSalesAmount)
        : materialCost * (metrics[index].actualQty / totalActualQty);
      const allocatedCost = index === editFormState.outputs.length - 1
        ? Math.max(materialCost - allocatedTotal, 0.01)
        : Math.max(Math.round(allocation * 100) / 100, 0.01);
      allocatedTotal = Math.round((allocatedTotal + allocatedCost) * 100) / 100;
      return {
        allocatedCost: allocatedCost.toFixed(2),
        costPrice: Math.max(Math.round((allocatedCost / metrics[index].actualQty) * 100) / 100, 0.01).toFixed(2)
      };
    });
  }

  function renderEditMaterialTable() {
    const body = document.getElementById('recEditMaterialBody');
    if (!body || !editFormState) return;
    body.innerHTML = editFormState.materials.map((item, index) => {
      const product = getEditProductInfo(item);
      return `<tr data-edit-material-index="${index}">
        <td><span class="sub-table-readonly">${productNetTag(item.productCode)}${escapeHtml(formatEditProduct(item))}</span></td>
        <td><span class="sub-table-readonly">${escapeHtml(product.unit)}</span></td>
        <td><span class="sub-table-readonly">${item.stock ?? '--'}</span></td>
        <td><span class="sub-table-readonly">${item.avgPrice ?? '--'}</span></td>
        <td><input class="sub-table-input" type="number" min="0" step="0.01" placeholder="请输入" data-edit-material-field="consumeQty" value="${escapeHtml(item.consumeQty ?? '')}"></td>
      </tr>`;
    }).join('');
  }

  function renderEditOutputTable() {
    const body = document.getElementById('recEditOutputBody');
    if (!body || !editFormState) return;
    const allocations = editFormState.costMode === 'auto' ? calculateEditAutoAllocations() : [];
    body.innerHTML = editFormState.outputs.map((item, index) => {
      const product = getEditProductInfo(item);
      const allocation = allocations[index] || {};
      const costPrice = editFormState.costMode === 'auto' ? allocation.costPrice || item.costPrice || '' : item.costPrice || '';
      const orderFields = editFormState.processingMode === 'order'
        ? `<td><span class="sub-table-readonly">${item.sortingQty ?? '--'}</span></td><td><span class="sub-table-readonly">${item.remainingQty ?? '--'}</span></td>`
        : '';
      const costField = editFormState.costMode === 'auto'
        ? `<div class="unit-price-control unit-price-readonly"><span class="unit-price-value" data-edit-auto-cost-index="${index}">${escapeHtml(costPrice || '--')}</span></div>`
        : `<div class="unit-price-control"><input class="sub-table-input cost-price-input" type="number" min="0" step="0.01" placeholder="请输入" data-edit-output-field="costPrice" value="${escapeHtml(costPrice)}"></div>`;
      return `<tr data-edit-output-index="${index}">
        <td><span class="sub-table-readonly">${productNetTag(item.productCode)}${escapeHtml(formatEditProduct(item))}</span></td>
        <td><span class="sub-table-readonly">${escapeHtml(product.unit)}</span></td>
        <td><span class="sub-table-readonly">${item.refCoefficient || '--'}</span></td>
        <td><span class="sub-table-readonly">${item.refQty || '--'}</span></td>
        <td><input class="sub-table-input" type="number" min="0" step="0.01" placeholder="请输入" data-edit-output-field="actualQty" value="${escapeHtml(item.actualQty ?? '')}"></td>
        ${orderFields}
        <td>${costField}</td>
      </tr>`;
    }).join('');
    const fillButton = document.querySelector('[data-action="edit-fill-reference"]');
    if (fillButton) fillButton.disabled = !editFormState.outputs.some((output) => output.refQty !== '' && output.refQty != null);
  }

  function updateEditAutoCostPrices() {
    if (!editFormState || editFormState.costMode !== 'auto') return;
    const allocations = calculateEditAutoAllocations();
    document.querySelectorAll('#recEditOutputBody [data-edit-auto-cost-index]').forEach((node) => {
      const index = Number(node.dataset.editAutoCostIndex);
      node.textContent = allocations[index]?.costPrice || '--';
    });
  }

  function renderEditForm(order) {
    editFormState = {
      processingDate: order.processingDate || '',
      materialWarehouse: order.materialWarehouse || order.warehouse || '',
      outputWarehouse: order.outputWarehouse || order.warehouse || '',
      remark: order.remark || '',
      attachments: (order.attachments || []).map((file) => ({ ...file })),
      processingMode: order.processingMode || 'plan',
      expectedDeliveryStart: order.expectedDeliveryStart || '',
      expectedDeliveryEnd: order.expectedDeliveryEnd || '',
      customer: order.customer || '全部',
      canteen: order.canteen || '全部',
      costMode: order.costMode || 'auto',
      materials: (order.materials || []).map((item) => ({ ...item })),
      outputs: (order.outputs || []).map((item) => ({ ...item }))
    };
    calculateEditRefQty();
    const warehouses = getWarehouseOptions(order);
    const orderFields = editFormState.processingMode === 'order'
      ? `<div class="order-processing-query edit-order-context">
          <div class="order-processing-query-header"><span class="section-title-mark">订单需求查询</span></div>
          <div class="order-processing-context">
            <div class="basic-info-field"><label class="field-label">期望送达时间</label><span class="sub-table-readonly">${escapeHtml(editFormState.expectedDeliveryStart || '--')} ~ ${escapeHtml(editFormState.expectedDeliveryEnd || '--')}</span></div>
            <div class="basic-info-field"><label class="field-label">客户名称</label><span class="sub-table-readonly">${escapeHtml(editFormState.customer)}</span></div>
            <div class="basic-info-field"><label class="field-label">食堂名称</label><span class="sub-table-readonly">${escapeHtml(editFormState.canteen)}</span></div>
          </div>
        </div>`
      : '';
    const submitAction = order.status === 'REJECTED' ? 'edit-resubmit' : 'edit-submit-confirm';
    const submitText = order.status === 'REJECTED' ? '重新提交' : '确认保存';
    document.getElementById('recEditForm').innerHTML = `
      <div class="operation-form-header processing-record-edit-header">
        <button class="back-link" type="button" data-action="cancel-edit">${backIcon}<span>返回</span></button>
        <h1>编辑加工单</h1>
      </div>
      ${orderFields}
      <div class="operation-form-status" id="recEditStatus" role="status"></div>
      <div class="operation-form-body" id="recEditBody">
        <div class="processing-record-edit-order-info basic-info-field">
          <label class="field-label">加工单号</label>
          <span class="processing-record-edit-order-value">${escapeHtml(order.id || '--')}</span>
        </div>
        <div class="form-section">
          <div class="form-section-header"><span class="section-title-mark">基本信息</span></div>
          <div class="form-section-body">
            <div class="basic-info-grid">
              <div class="basic-info-field"><label class="field-label required" for="recEditProcessingDate">加工日期</label><div class="date-input-control"><input class="form-control" id="recEditProcessingDate" type="text" readonly placeholder="请选择日期"><span class="date-range-icon" aria-hidden="true">▣</span></div></div>
              <div class="basic-info-field"><label class="field-label required" for="recEditMaterialWarehouse">原料出库</label><select class="form-control" id="recEditMaterialWarehouse"><option value="">请选择</option>${warehouses.map((warehouse) => `<option value="${escapeHtml(warehouse)}" ${warehouse === editFormState.materialWarehouse ? 'selected' : ''}>${escapeHtml(warehouse)}</option>`).join('')}</select></div>
              <div class="basic-info-field"><label class="field-label required" for="recEditOutputWarehouse">成品入库</label><select class="form-control" id="recEditOutputWarehouse"><option value="">请选择</option>${warehouses.map((warehouse) => `<option value="${escapeHtml(warehouse)}" ${warehouse === editFormState.outputWarehouse ? 'selected' : ''}>${escapeHtml(warehouse)}</option>`).join('')}</select></div>
            </div>
          </div>
        </div>
        <div class="form-section">
          <div class="form-section-header"><span class="section-title-mark">加工原料</span></div>
          <div class="form-section-body" style="padding:0"><table class="processing-sub-table"><thead><tr><th style="width:200px">原料商品</th><th style="width:80px">单位</th><th style="width:90px">当前库存</th><th style="width:90px">库存均价</th><th style="width:120px">消耗量</th></tr></thead><tbody id="recEditMaterialBody"></tbody></table></div>
        </div>
        <div class="operation-cost-section"><div class="operation-cost-header"><span class="cost-price-label section-title-mark">成品入库单价</span><div class="cost-mode-row"><label class="radio-option"><input type="radio" name="recEditCostMode" value="auto" ${editFormState.costMode === 'auto' ? 'checked' : ''}>按原料成本及实际获得量计算</label><label class="radio-option"><input type="radio" name="recEditCostMode" value="manual" ${editFormState.costMode === 'manual' ? 'checked' : ''}>手动输入成品入库单价</label></div></div></div>
        <div class="form-section"><div class="form-section-header"><span class="section-title-mark">加工成品</span><button class="btn btn-sm btn-blue reference-fill-btn" type="button" data-action="edit-fill-reference" ${editFormState.outputs.some((output) => output.refQty !== '' && output.refQty != null) ? '' : 'disabled'}>按参考值填充实际获得量</button></div><div class="form-section-body" style="padding:0"><table class="processing-sub-table"><thead><tr><th style="width:180px">成品商品</th><th style="width:70px">单位</th><th style="width:80px">参考系数</th><th style="width:90px">参考获得量</th><th style="width:90px">实际获得量</th>${editFormState.processingMode === 'order' ? '<th style="width:90px">订单分拣量</th><th style="width:90px">剩余量</th>' : ''}<th style="width:130px">成品入库单价</th></tr></thead><tbody id="recEditOutputBody"></tbody></table></div></div>
        <div class="form-section operation-remark-section"><div class="form-section-header"><span class="section-title-mark">加工备注</span></div><div class="form-section-body"><div class="operation-remark-field"><div class="remark-input-wrap"><textarea class="form-control" id="recEditRemark" maxlength="200" rows="3" placeholder="请输入">${escapeHtml(editFormState.remark)}</textarea><span class="remark-counter" id="recEditRemarkCounter">${editFormState.remark.length}/200</span></div><div class="remark-upload-area"><button class="btn btn-sm btn-blue remark-upload-btn" type="button" data-action="edit-upload-attachment">上传附件</button><input type="file" id="recEditAttachmentInput" accept="image/*,.txt,.doc,.docx,.pdf,.xls,.xlsx" multiple style="display:none"><div class="remark-attachment-list" id="recEditAttachmentList"></div></div></div></div></div>
      </div>
      <div class="processing-form-footer"><button class="btn btn-primary" type="button" data-action="${submitAction}" data-id="${escapeHtml(order.id)}">${submitText}</button><button class="btn" type="button" data-action="cancel-edit">取消编辑</button></div>
    `;
    document.getElementById('recEditProcessingDate').value = editFormState.processingDate;
    editDatePicker?.destroy();
    editDatePicker = window.DatePicker?.mount?.({
      input: '#recEditProcessingDate',
      panelId: 'recEditProcessingDatePickerPanel',
      onChange: (date) => { editFormState.processingDate = date; }
    });
    renderEditMaterialTable();
    renderEditOutputTable();
    renderEditAttachments();
    bindEditFormEvents();
  }

  function collectEditData(order) {
    if (!editFormState) return null;
    const materialWarehouse = document.getElementById('recEditMaterialWarehouse')?.value || editFormState.materialWarehouse;
    const outputWarehouse = document.getElementById('recEditOutputWarehouse')?.value || editFormState.outputWarehouse;
    const costMode = editFormState.costMode;
    const allocations = costMode === 'auto' ? calculateEditAutoAllocations() : [];
    return {
      ...order,
      processingDate: document.getElementById('recEditProcessingDate')?.value || editFormState.processingDate,
      materialWarehouse,
      outputWarehouse,
      warehouse: materialWarehouse,
      remark: document.getElementById('recEditRemark')?.value.trim() || '',
      attachments: editFormState.attachments.map((file) => ({ ...file })),
      costMode,
      materials: editFormState.materials.map((item) => ({ ...item })),
      outputs: editFormState.outputs.map((item, index) => ({
        ...item,
        allocatedCost: costMode === 'auto' ? allocations[index]?.allocatedCost || item.allocatedCost || '' : item.allocatedCost || '',
        costPrice: costMode === 'auto' ? allocations[index]?.costPrice || item.costPrice || '' : item.costPrice || ''
      }))
    };
  }

  function showEditStatus(message, type = 'error') {
    const status = document.getElementById('recEditStatus');
    if (!status) return;
    status.textContent = message;
    status.className = `operation-form-status visible ${type}`;
  }

  function submitEditedOrder() {
    const order = state.orders.find((item) => item.id === editOrderId);
    if (!order) return;
    const data = collectEditData(order);
    const errors = window.ProcessingValidator?.validate(data) || {};
    if (Object.keys(errors).length > 0) {
      showEditStatus(Object.values(errors)[0]);
      return;
    }
    finishDetailOperation(window.ProcessingService.submitEdited(editOrderId, data));
  }

  function openEditPage(id) {
    const order = state.orders.find((item) => item.id === id);
    if (!order || order.status !== 'REJECTED') return;
    editOrderId = id;
    document.querySelector('.processing-record-page').style.display = 'none';
    document.getElementById('recDetailPage').style.display = 'none';
    document.getElementById('recEditPage').style.display = 'flex';
    renderEditForm(order);
  }

  function closeEditPage(toDetail = true) {
    editDatePicker?.destroy();
    editDatePicker = null;
    document.getElementById('recEditPage').style.display = 'none';
    const id = editOrderId;
    editOrderId = null;
    editFormState = null;
    if (toDetail && id) showDetail(id);
    else closeDetail();
  }

  function bindEditFormEvents() {
    const form = document.getElementById('recEditForm');
    if (!form || form.dataset.bound === 'true') return;
    form.dataset.bound = 'true';
    form.addEventListener('click', (event) => {
      const actionEl = event.target.closest('[data-action]');
      const action = actionEl?.dataset.action;
      if (action === 'cancel-edit') { closeEditPage(false); return; }
      if (action === 'edit-submit-confirm' || action === 'edit-resubmit') { submitEditedOrder(); return; }
      if (action === 'edit-fill-reference') {
        editFormState.outputs.forEach((output) => { if (output.refQty !== '' && output.refQty != null) output.actualQty = output.refQty; });
        renderEditOutputTable();
        return;
      }
      if (action === 'edit-upload-attachment') { document.getElementById('recEditAttachmentInput')?.click(); return; }
      if (action === 'edit-remove-attachment') {
        editFormState.attachments.splice(Number(actionEl.dataset.index), 1);
        renderEditAttachments();
      }
    });
    form.addEventListener('change', (event) => {
      if (event.target.name === 'recEditCostMode') {
        editFormState.costMode = event.target.value;
        renderEditOutputTable();
      }
      if (event.target.id === 'recEditMaterialWarehouse') editFormState.materialWarehouse = event.target.value;
      if (event.target.id === 'recEditOutputWarehouse') editFormState.outputWarehouse = event.target.value;
      if (event.target.id === 'recEditAttachmentInput') {
        Array.from(event.target.files || []).forEach((file) => editFormState.attachments.push({ name: file.name, format: file.name.split('.').pop().toLowerCase(), size: formatEditFileSize(file.size) }));
        event.target.value = '';
        renderEditAttachments();
      }
    });
    form.addEventListener('input', (event) => {
      const materialInput = event.target.closest('[data-edit-material-field="consumeQty"]');
      if (materialInput) {
        const index = Number(materialInput.closest('[data-edit-material-index]').dataset.editMaterialIndex);
        editFormState.materials[index].consumeQty = materialInput.value;
        calculateEditRefQty();
        renderEditOutputTable();
        return;
      }
      const outputInput = event.target.closest('[data-edit-output-field]');
      if (outputInput) {
        const index = Number(outputInput.closest('[data-edit-output-index]').dataset.editOutputIndex);
        editFormState.outputs[index][outputInput.dataset.editOutputField] = outputInput.value;
        updateEditAutoCostPrices();
        return;
      }
      if (event.target.id === 'recEditRemark') {
        document.getElementById('recEditRemarkCounter').textContent = `${event.target.value.length}/200`;
      }
    });
  }

  function showDetail(id) {
    const order = state.orders.find((o) => o.id === id);
    if (!order) return;
    const displayStatus = getDisplayStatus(order);
    const statusClass = getStatusClass(displayStatus);
    const materialRows = (order.materials || []).map((m) => `
      <tr>
        <td>${productNetTag(m.productCode)}${escapeHtml(m.productName)}</td>
        <td>${escapeHtml(m.unit)}</td>
        <td>${m.stock ?? '--'}</td>
        <td>${m.avgPrice ?? '--'}</td>
        <td>${m.consumeQty ?? '--'}</td>
        <td>${((Number(m.consumeQty) || 0) * (Number(m.avgPrice) || 0)).toFixed(2)}</td>
      </tr>
    `).join('');

    const outputRows = (order.outputs || []).map((o) => `
      <tr>
        <td>${productNetTag(o.productCode)}${escapeHtml(o.productName)}</td>
        <td>${escapeHtml(o.unit)}</td>
        <td>${o.refCoefficient ?? '--'}</td>
        <td>${o.refQty ?? '--'}</td>
        <td>${o.actualQty ?? '--'}</td>
        <td>${o.allocatedCost || '--'}</td>
        <td>${o.costPrice ? `${o.costPrice}/${escapeHtml(o.unit || '--')}` : '--'}</td>
      </tr>
    `).join('');

    document.getElementById('recDetailBody').innerHTML = `
      <div class="processing-detail-section">
        <h3>基本信息</h3>
        <div class="processing-detail-info">
          <div class="info-item"><span class="info-label">加工单号：</span><span class="info-value">${escapeHtml(order.id)}</span></div>
          <div class="info-item"><span class="info-label">加工日期：</span><span class="info-value">${escapeHtml(order.processingDate)}</span></div>
          <div class="info-item"><span class="info-label">状态：</span><span class="info-value"><span class="status-tag ${statusClass}">${escapeHtml(displayStatus)}</span></span></div>
          <div class="info-item"><span class="info-label">成本模式：</span><span class="info-value">${order.costMode === 'auto' ? '按原料成本及实际获得量计算' : '手动输入成品入库单价'}</span></div>
          <div class="info-item"><span class="info-label">创建时间：</span><span class="info-value">${escapeHtml(order.createTime || '--')}</span></div>
          <div class="info-item"><span class="info-label">操作人：</span><span class="info-value">${escapeHtml(order.operator || '--')}</span></div>
          <div class="info-item"><span class="info-label">原料出库：</span><span class="info-value">${escapeHtml(order.materialWarehouse || order.warehouse || '--')}</span></div>
          <div class="info-item"><span class="info-label">原料出库单：</span><span class="info-value">${renderRelatedOrderLink(order, 'outbound')}</span></div>
          <div class="info-item"><span class="info-label">成品入库：</span><span class="info-value">${escapeHtml(order.outputWarehouse || order.warehouse || '--')}</span></div>
          <div class="info-item"><span class="info-label">成品入库单：</span><span class="info-value">${renderRelatedOrderLink(order, 'inbound')}</span></div>
        </div>
      </div>
      <div class="processing-detail-section">
        <h3>原料消耗</h3>
        <table class="processing-detail-table">
          <thead>
            <tr><th>原料商品</th><th>单位</th><th>当前库存</th><th>库存均价</th><th>消耗量</th><th>原料成本</th></tr>
          </thead>
          <tbody>${materialRows || '<tr><td colspan="6">暂无数据</td></tr>'}</tbody>
        </table>
      </div>
      <div class="processing-detail-section">
        <h3>成品产出</h3>
        <table class="processing-detail-table">
          <thead>
            <tr><th>成品商品</th><th>单位</th><th>参考系数</th><th>参考获得量</th><th>实际获得量</th><th>分摊成本</th><th>成品入库单价</th></tr>
          </thead>
          <tbody>${outputRows || '<tr><td colspan="7">暂无数据</td></tr>'}</tbody>
        </table>
      </div>
      <div class="processing-detail-section">
        <h3>备注</h3>
        <div class="detail-remark-box">${escapeHtml(order.remark || '--')}</div>
      </div>
      <div class="processing-detail-section">
        <h3>附件</h3>
        <div class="detail-attachment-list">${renderAttachments(order.attachments)}</div>
      </div>
      <div class="processing-detail-section">
        <h3>操作记录</h3>
        <div class="detail-timeline">${renderOperationLogs(order.operationLogs)}</div>
      </div>
    `;
    document.getElementById('recDetailFooter').innerHTML = renderDetailFooter(order, displayStatus);
    document.querySelector('.processing-record-page').style.display = 'none';
    const detailPage = document.getElementById('recDetailPage');
    detailPage.style.display = 'flex';
  }

  function closeDetail() {
    editDatePicker?.destroy();
    editDatePicker = null;
    editOrderId = null;
    editFormState = null;
    document.querySelector('.processing-record-page').style.display = '';
    document.getElementById('recDetailPage').style.display = 'none';
    document.getElementById('recEditPage').style.display = 'none';
    document.getElementById('recDetailFooter').innerHTML = '';
    if (new URLSearchParams(window.location.search).has('id')) {
      window.history.replaceState(null, '', './processing-record.html');
    }
  }

  function finishDetailOperation(updatedOrder) {
    if (!updatedOrder) {
      showOperationToast('操作失败，请刷新后重试');
      return false;
    }
    closeDetail();
    loadOrders();
    filterOrders();
    showOperationToast('操作成功');
    return true;
  }

  function bindEvents() {
    const root = document.querySelector('.processing-record-page');
    root.addEventListener('click', (event) => {
      const action = event.target.closest('[data-action]')?.dataset.action;
      if (action === 'query') { filterOrders(); return; }
      if (action === 'reset') { resetFilters(); return; }
      if (action === 'back-to-list') { closeDetail(); return; }
      if (action === 'toggle-all') {
        const checkbox = event.target.closest('.custom-checkbox');
        const checked = !checkbox.classList.contains('checked');
        state.visibleOrders.forEach((order) => {
          if (checked) state.selectedIds.add(order.id);
          else state.selectedIds.delete(order.id);
        });
        renderTable(state.visibleOrders);
        return;
      }
      if (action === 'toggle-row') {
        const checkbox = event.target.closest('.custom-checkbox');
        const id = checkbox.dataset.id;
        if (state.selectedIds.has(id)) state.selectedIds.delete(id);
        else state.selectedIds.add(id);
        renderTable(state.visibleOrders);
        return;
      }

      const rowAction = event.target.closest('[data-row-action]');
      if (rowAction) {
        const id = rowAction.dataset.id;
        if (rowAction.dataset.rowAction === 'edit') {
          openEditPage(id);
          return;
        }
        if (rowAction.dataset.rowAction === 'detail') {
          showDetail(id);
          return;
        }
      }
    });

    root.addEventListener('mouseover', (event) => {
      const row = event.target.closest('tr[data-order-id]');
      if (!row || row.contains(event.relatedTarget)) return;
      const orderId = row.dataset.orderId;
      root.querySelectorAll(`tr[data-order-id="${orderId}"]`).forEach((item) => item.classList.add('is-order-hover'));
    });

    root.addEventListener('mouseout', (event) => {
      const row = event.target.closest('tr[data-order-id]');
      if (!row || row.contains(event.relatedTarget)) return;
      const orderId = row.dataset.orderId;
      root.querySelectorAll(`tr[data-order-id="${orderId}"]`).forEach((item) => item.classList.remove('is-order-hover'));
    });

    document.getElementById('recDetailPage').addEventListener('click', (event) => {
      const action = event.target.closest('[data-action]')?.dataset.action;
      if (action === 'back-to-list') {
        closeDetail();
        return;
      }
      const actionButton = event.target.closest('[data-action]');
      if (action === 'detail-edit') {
        openEditPage(actionButton.dataset.id);
        return;
      }
      if (action === 'detail-audit') {
        const approved = actionButton.dataset.approved === 'true';
        finishDetailOperation(window.ProcessingService.audit(actionButton.dataset.id, approved));
      }
    });

    ['recOrderFilter', 'recMaterialFilter', 'recOutboundFilter', 'recInboundFilter'].forEach((id) => {
      document.getElementById(id).addEventListener('keydown', (event) => {
        if (event.key === 'Enter') filterOrders();
      });
    });

  }

  const params = new URLSearchParams(window.location.search);
  const detailId = params.get('id');

  window.AppShell.mount({ title: '加工记录', content: pageContent });
  recordDatePicker = window.DateRangePicker.mount({
    container: '#recDateRange',
    displayInput: '#recDateDisplay',
    startInput: '#recDateStartFilter',
    endInput: '#recDateEndFilter',
    panelId: 'recCalendarPanel',
    onChange: ({ startDate, endDate }) => {
      state.dateStart = startDate;
      state.dateEnd = endDate;
      filterOrders();
    }
  });
  loadOrders();
  state.visibleOrders = [...state.orders];
  renderTable();
  bindEvents();

  if (detailId) {
    setTimeout(() => showDetail(detailId), 100);
  }
})();
