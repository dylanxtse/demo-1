(function () {
  const downloadIcon = '<svg class="icon-svg" viewBox="0 0 24 24" style="width:14px;height:14px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
  const uploadIcon = '<svg class="icon-svg" viewBox="0 0 24 24" style="width:14px;height:14px;"><path d="M12 16V4"/><polyline points="7 9 12 4 17 9"/><path d="M5 20h14"/></svg>';

  const pageContent = `
    <div class="page-card price-execution-page" id="priceExecutionPage">
      <div class="price-mode-tabs" role="tablist" aria-label="价格执行清单类型">
        <button class="price-mode-tab active" type="button" role="tab" aria-selected="true" data-price-mode="purchase">采购价执行清单</button>
        <button class="price-mode-tab" type="button" role="tab" aria-selected="false" data-price-mode="sales">销售价执行清单</button>
      </div>

      <section class="price-query-panel" aria-label="价格执行清单查询">
        <div class="price-filter-fields" id="priceFilterFields"></div>
        <div class="price-filter-actions">
          <button class="btn btn-primary btn-sm" type="button" data-action="query">查询</button>
          <button class="btn btn-sm" type="button" data-action="reset">重置</button>
        </div>
      </section>

      <div class="price-toolbar">
        <div class="price-toolbar-left">
          <button class="btn btn-primary btn-sm" id="editPricingBtn" type="button" data-action="edit-pricing">编辑订价</button>
          <button class="btn btn-primary btn-sm sales-pricing-action sales-only-action" type="button" data-action="purchase-to-sales" disabled hidden>以采定销</button>
          <button class="btn btn-primary btn-sm sales-pricing-action sales-only-action" type="button" data-action="sync-pricing" disabled hidden>同步订价</button>
          <button class="btn btn-primary btn-sm" type="button" data-action="open-import">导入订价</button>
        </div>
        <div class="price-toolbar-right">
          <span class="price-priority-note" id="pricePriorityNote" aria-live="polite"></span>
          <button class="btn btn-sm price-export-action" type="button" data-action="export">${downloadIcon}导出</button>
        </div>
      </div>

      <div class="price-table-container">
        <div class="price-table-wrapper">
          <table class="data-table price-data-table">
            <thead id="priceTableHead"></thead>
            <tbody id="priceTableBody"></tbody>
          </table>
        </div>
        <div class="pagination price-pagination" id="pricePagination"></div>
      </div>
    </div>

    <div class="price-import-mask" id="priceImportMask" aria-hidden="true">
      <div class="price-import-dialog" role="dialog" aria-modal="true" aria-labelledby="priceImportTitle">
        <div class="price-import-header">
          <h2 id="priceImportTitle">导入订价</h2>
          <button class="price-dialog-close" type="button" data-action="close-import" aria-label="关闭">×</button>
        </div>
        <div class="price-import-body">
          <div class="price-import-template">
            <span>请先下载模板，按模板填写价格数据</span>
            <button class="btn-text" type="button" data-action="download-template">下载模板</button>
          </div>
          <div class="price-file-row">
            <button class="btn btn-sm" type="button" data-action="choose-file">${uploadIcon}上传文件</button>
            <span id="priceFileName">未选择文件</span>
            <input id="priceFileInput" type="file" accept=".xlsx" hidden>
          </div>
          <div class="price-import-tip">只能上传xlsx文件，且不超过10M</div>
        </div>
        <div class="price-import-footer">
          <button class="btn btn-sm" type="button" data-action="close-import">取消</button>
          <button class="btn btn-primary btn-sm" type="button" data-action="confirm-import">导入</button>
        </div>
      </div>
    </div>

    <div class="price-detail-mask" id="priceDetailMask" aria-hidden="true">
      <div class="price-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="priceDetailTitle">
        <div class="price-detail-header">
          <h2 id="priceDetailTitle">执行价格</h2>
          <button class="price-dialog-close" type="button" data-action="close-price-detail" aria-label="关闭">×</button>
        </div>
        <div class="price-detail-body">
          <table class="data-table price-detail-table">
            <thead><tr><th>执行周期</th><th>供应商</th><th>价格</th></tr></thead>
            <tbody id="priceDetailBody"></tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="price-toast" id="priceToast" role="status" aria-live="polite"></div>
  `;

  const state = {
    mode: 'purchase',
    rows: [],
    filteredRows: [],
    page: 1,
    pageSize: 20,
    editing: false,
    selectedSalesIds: new Set(),
    pagination: null
  };

  const filters = {
    purchase: [
      { key: 'purchaseType', label: '采购类型', type: 'select', placeholder: '请选择' },
      { key: 'category', label: '商品分类', type: 'select', placeholder: '全部' },
      { key: 'name', label: '商品名称', type: 'input', placeholder: '请输入名称/编号' }
    ],
    sales: [
      { key: 'customerType', label: '客户类型', type: 'select', placeholder: '请选择' },
      { key: 'customerName', label: '客户名称', type: 'input', placeholder: '请输入客户名称' },
      { key: 'district', label: '区县', type: 'select', placeholder: '全部' },
      { key: 'category', label: '商品分类', type: 'select', placeholder: '全部' },
      { key: 'name', label: '商品名称', type: 'input', placeholder: '请输入名称/编号' }
    ]
  };

  const priceSourceColumns = {
    purchase: [
      { label: '手动定价', key: 'manualPrice' },
      { label: '协议价', key: 'agreementPrice' },
      { label: '近一次采购价', key: 'recentPrice' },
      { label: '供应商报价', key: 'supplierQuote' },
      { label: '市场价', key: 'marketPrice' },
      { label: '中标价', key: 'bidPrice' }
    ],
    sales: [
      { label: '手动定价', key: 'manualPrice' },
      { label: '协议价', key: 'agreementPrice' },
      { label: '近一次销售价', key: 'recentPrice' },
      { label: '市场价', key: 'marketPrice' }
    ]
  };

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function uniqueValues(field) {
    return [...new Set(state.rows.map((row) => row[field]).filter(Boolean))];
  }

  function optionList(field, placeholder) {
    let values;
    if (field === 'priceType') values = visiblePriceColumns().map((column) => column.label);
    else if (field === 'purchaseType') values = ['企业自加工', '供应商送货', '市场自采'];
    else if (field === 'customerType') values = ['学校', '幼儿园', '机关单位'];
    else values = uniqueValues(field);
    return [`<option value="">${escapeHtml(placeholder)}</option>`, ...values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)].join('');
  }

  function renderFilterFields() {
    const fields = filters[state.mode];
    document.getElementById('priceFilterFields').innerHTML = fields.map((field) => {
      const id = `priceFilter-${field.key}`;
      const control = field.type === 'select'
        ? `<select class="filter-select" id="${id}">${optionList(field.key, field.placeholder)}</select>`
        : `<input class="filter-input" id="${id}" placeholder="${escapeHtml(field.placeholder)}">`;
      return `<div class="filter-group price-filter-group"><label class="filter-label" for="${id}">${escapeHtml(field.label)}</label>${control}</div>`;
    }).join('');
  }

  function getFilterValue(key) {
    return document.getElementById(`priceFilter-${key}`)?.value.trim() || '';
  }

  function normalizePriceSource(source) {
    return String(source || '').replace('订价', '定价').trim();
  }

  function savedPriceSettings() {
    if (window.DemoStore?.getSettings) return window.DemoStore.getSettings() || {};
    try {
      return JSON.parse(window.localStorage?.getItem('procurement-demo-v3') || '{}').settings || {};
    } catch {
      return {};
    }
  }

  const purchasePriorityProfiles = {
    '订价模式': { count: 5, defaults: ['供应商报价', '协议价', '手动定价', '近一次采购价', '市场价'] },
    '竞价模式': { count: 3, defaults: ['中标价', '近一次采购价', '近一次采购价'] },
    '订价+竞价模式': { count: 6, defaults: ['中标价', '协议价', '近一次采购价', '供应商报价', '手动定价', '市场价'] }
  };
  const purchaseModeAliases = { '询价模式': '订价模式', '协议价模式': '订价模式' };
  const normalizePurchaseMode = (mode) => {
    const normalized = purchaseModeAliases[mode] || mode;
    return purchasePriorityProfiles[normalized] ? normalized : '竞价模式';
  };

  function priorityKeys() {
    if (state.mode === 'sales') return ['orderPricePriority1', 'orderPricePriority2', 'orderPricePriority3', 'orderPricePriority4'];
    const settings = savedPriceSettings();
    const count = purchasePriorityProfiles[normalizePurchaseMode(settings.purchasePriceMode)].count;
    return Array.from({ length: count }, (_, index) => `purchasePricePriority${index + 1}`);
  }

  function configuredPriorityValues() {
    const settings = savedPriceSettings();
    const defaults = state.mode === 'purchase'
      ? purchasePriorityProfiles[normalizePurchaseMode(settings.purchasePriceMode)].defaults
      : ['协议价', '近一次销售价', '手动定价', '市场价'];
    const configured = priorityKeys().map((key) => normalizePriceSource(settings[key])).filter(Boolean);
    return configured.length ? configured : defaults;
  }

  function visiblePriceColumns() {
    const columns = priceSourceColumns[state.mode];
    if (state.mode !== 'purchase') return columns;
    const purchaseMode = normalizePurchaseMode(savedPriceSettings().purchasePriceMode);
    return purchaseMode === '订价模式' ? columns.filter((column) => column.key !== 'bidPrice') : columns;
  }

  function refreshPriorityPresentation() {
    const order = configuredPriorityValues();
    const modeLabel = state.mode === 'purchase' ? '采购' : '销售';
    const summary = `当前${modeLabel}单价取值优先级：${order.length ? order.join('＞') : '未设置'}`;
    const note = document.getElementById('pricePriorityNote');
    if (note) {
      note.textContent = summary;
      note.title = summary;
    }
  }

  function refreshPriceTypeFilter() {
    const select = document.querySelector('#priceFilter-priceType');
    if (!select) return;
    const currentValue = select.value;
    select.innerHTML = optionList('priceType', '全部');
    select.value = Array.from(select.options).some((option) => option.value === currentValue) ? currentValue : '';
  }

  function applyFilters(resetPage = true) {
    const name = getFilterValue('name').toLowerCase();
    const customerName = getFilterValue('customerName').toLowerCase();
    const category = getFilterValue('category');
    const priceType = getFilterValue('priceType');
    const filtered = state.rows.filter((row) => {
      if (getFilterValue('purchaseType') && row.purchaseType !== getFilterValue('purchaseType')) return false;
      if (getFilterValue('customerType') && row.customerType !== getFilterValue('customerType')) return false;
      if (getFilterValue('district') && row.district !== getFilterValue('district')) return false;
      if (category && row.category !== category) return false;
      if (priceType && !priceTypeMatches(row, priceType)) return false;
      if (name && !`${row.name} ${row.code}`.toLowerCase().includes(name)) return false;
      if (customerName && !String(row.customerName || '').toLowerCase().includes(customerName)) return false;
      return true;
    });
    state.filteredRows = filtered;
    if (resetPage) state.page = 1;
    state.pagination?.update({ total: filtered.length, page: state.page, pageSize: state.pageSize });
    renderTable();
  }

  function priceTypeMatches(row, type) {
    const map = state.mode === 'purchase'
      ? { '手动定价': 'manualPrice', '协议价': 'agreementPrice', '近一次采购价': 'recentPrice', '供应商报价': 'supplierQuote', '市场价': 'marketPrice', '中标价': 'bidPrice' }
      : { '手动定价': 'manualPrice', '协议价': 'agreementPrice', '近一次销售价': 'recentPrice', '市场价': 'marketPrice' };
    return row[map[type]] && row[map[type]] !== '--';
  }

  function renderPrice(value, source = '') {
    if (!value || value === '--') return '<span class="price-empty">--</span>';
    return `<span class="price-value-wrap">${source ? `<span class="price-source-tag">${escapeHtml(source)}</span>` : ''}<span>${escapeHtml(value)}</span></span>`;
  }

  function renderClearedPrice() {
    return '<span class="price-empty" aria-hidden="true"></span>';
  }

  const priceSourceShortLabels = {
    手动定价: '手',
    协议价: '协',
    近一次采购价: '近',
    近一次销售价: '近',
    供应商报价: '供',
    市场价: '市',
    中标价: '中'
  };

  function renderCurrentPrice(row) {
    const source = String(row.currentSource || '');
    const currentPrice = String(row.currentPrice || '').trim();
    if (!currentPrice || currentPrice === '--') {
      const hasFuturePrice = Array.isArray(row.futureExecutionRecords) && row.futureExecutionRecords.length > 0;
      if (!hasFuturePrice) return '<span class="price-current-no-price">暂无执行价格</span>';
      return `<button class="price-current-link price-current-link-pending" type="button" data-action="show-current-price" data-price-id="${escapeHtml(row.id)}" aria-label="查看${escapeHtml(row.name)}未来执行价格" title="当前暂无中标价，存在未来执行价格">待生效</button>`;
    }
    const shortSource = priceSourceShortLabels[source] || source.slice(0, 1);
    return `<button class="price-current-link" type="button" data-action="show-current-price" data-price-id="${escapeHtml(row.id)}" aria-label="查看${escapeHtml(row.name)}执行价格">
      <span class="price-source-tag" title="${escapeHtml(source)}" aria-label="${escapeHtml(source)}">${escapeHtml(shortSource)}</span>
      <span class="price-current-value">${escapeHtml(currentPrice)}</span>
    </button>`;
  }

  function renderProductName(row) {
    return `<div class="price-product-name"><div class="price-product-main">${escapeHtml(row.name)}</div><div class="price-product-sub">${escapeHtml(row.unit)}/${escapeHtml(row.brand)}/${escapeHtml(row.spec)}</div></div>`;
  }

  function renderManualCell(row) {
    if (!state.editing) return renderPrice(row.manualPrice);
    const value = row.manualPrice === '--' ? '' : row.manualPrice;
    return `<input class="price-inline-input" data-manual-id="${escapeHtml(row.id)}" value="${escapeHtml(value)}" placeholder="请输入单价" inputmode="decimal">`;
  }

  function renderPriceSourceHead() {
    return visiblePriceColumns().map((column) => `<th>${escapeHtml(column.label)}</th>`).join('');
  }

  function renderPriceSourceCell(row, column) {
    if (state.mode === 'sales' && column.key === 'manualPrice') return renderManualCell(row);
    const value = row[column.key];
    return value !== undefined && value !== null && value !== '' && value !== '--'
      ? renderPrice(value)
      : renderClearedPrice();
  }

  function renderPurchaseHead() {
    return `<tr>
      <th class="price-seq-col">序号</th><th class="price-image-col">图片</th><th class="price-code-col">商品编号</th>
      <th class="price-name-col">商品名称（计量单位/品牌/规格）</th><th class="price-category-col">分类</th><th class="price-unit-col">计量单位</th>
      <th class="price-partner-col">供应商/采购员</th><th class="price-current-col">当前执行价格</th>${renderPriceSourceHead()}
    </tr>`;
  }

  function renderSalesHead() {
    return `<tr>
      <th class="price-select-col"><input class="price-select-all" type="checkbox" data-sales-select-all aria-label="全选销售价执行清单"></th>
      <th class="price-seq-col">序号</th><th class="price-image-col">图片</th><th class="price-code-col">商品编号</th>
      <th class="price-partner-col">客户名称</th><th class="price-name-col">商品名称（计量单位/品牌/规格）</th><th class="price-category-col">商品分类</th>
      <th class="price-unit-col">计量单位</th><th class="price-current-col">当前执行价格</th>${renderPriceSourceHead()}
    </tr>`;
  }

  function renderPurchaseRow(row, index) {
    return `<tr>
      <td class="price-seq-col">${index + 1 + (state.page - 1) * state.pageSize}</td>
      <td class="price-image-col"><div class="price-image-placeholder">图片</div></td>
      <td class="price-code-col">${escapeHtml(row.code)}</td><td class="price-name-col">${renderProductName(row)}</td>
      <td class="price-category-col">${escapeHtml(row.category)}</td><td class="price-unit-col">${escapeHtml(row.unit)}</td>
      <td class="price-partner-col">${escapeHtml(row.supplier)}</td><td class="price-current-col">${renderCurrentPrice(row)}</td>
      ${visiblePriceColumns().map((column) => `<td>${renderPriceSourceCell(row, column)}</td>`).join('')}
    </tr>`;
  }

  function renderSalesRow(row, index) {
    return `<tr>
      <td class="price-select-col"><input class="price-row-checkbox" type="checkbox" data-sales-select data-price-id="${escapeHtml(row.id)}" aria-label="选择${escapeHtml(row.name)}" ${state.selectedSalesIds.has(row.id) ? 'checked' : ''}></td>
      <td class="price-seq-col">${index + 1 + (state.page - 1) * state.pageSize}</td>
      <td class="price-image-col"><div class="price-image-placeholder">图片</div></td>
      <td class="price-code-col">${escapeHtml(row.code)}</td><td class="price-partner-col">${escapeHtml(row.customerName)}</td>
      <td class="price-name-col">${renderProductName(row)}</td><td class="price-category-col">${escapeHtml(row.category)}</td>
      <td class="price-unit-col">${escapeHtml(row.unit)}</td><td class="price-current-col">${renderCurrentPrice(row)}</td>
      ${visiblePriceColumns().map((column) => `<td>${renderPriceSourceCell(row, column)}</td>`).join('')}
    </tr>`;
  }

  function syncSalesSelectionState(visibleRows) {
    if (state.mode !== 'sales') return;
    const selectAll = document.querySelector('[data-sales-select-all]');
    if (!selectAll) return;
    const selectedCount = visibleRows.filter((row) => state.selectedSalesIds.has(row.id)).length;
    selectAll.checked = visibleRows.length > 0 && selectedCount === visibleRows.length;
    selectAll.indeterminate = selectedCount > 0 && selectedCount < visibleRows.length;
    selectAll.disabled = visibleRows.length === 0;
  }

  function syncSalesActionState() {
    const disabled = state.mode !== 'sales' || state.selectedSalesIds.size === 0;
    document.querySelectorAll('.sales-pricing-action').forEach((button) => {
      button.disabled = disabled;
    });
  }

  function renderTable() {
    const start = (state.page - 1) * state.pageSize;
    const visibleRows = state.filteredRows.slice(start, start + state.pageSize);
    const columnCount = (state.mode === 'sales' ? 9 : 8) + visiblePriceColumns().length;
    document.getElementById('priceTableHead').innerHTML = state.mode === 'purchase' ? renderPurchaseHead() : renderSalesHead();
    document.getElementById('priceTableBody').innerHTML = visibleRows.length
      ? visibleRows.map((row, index) => state.mode === 'purchase' ? renderPurchaseRow(row, index) : renderSalesRow(row, index)).join('')
      : `<tr><td class="price-empty-row" colspan="${columnCount}">暂无符合条件的数据</td></tr>`;
    syncSalesSelectionState(visibleRows);
    syncSalesActionState();
    const editButton = document.getElementById('editPricingBtn');
    if (editButton) editButton.textContent = state.editing ? '完成编辑' : '编辑订价';
    if (state.pagination) state.pagination.update({ total: state.filteredRows.length, page: state.page, pageSize: state.pageSize });
  }

  function renderMode() {
    state.editing = false;
    state.page = 1;
    state.rows = window.PriceExecutionService.getList(state.mode);
    state.filteredRows = [...state.rows];
    renderFilterFields();
    refreshPriorityPresentation();
    document.querySelectorAll('.price-mode-tab').forEach((tab) => {
      const active = tab.dataset.priceMode === state.mode;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    document.querySelectorAll('.sales-only-action').forEach((element) => {
      element.hidden = state.mode !== 'sales';
    });
    document.querySelectorAll('.sales-pricing-action').forEach((element) => {
      element.hidden = state.mode !== 'sales';
    });
    state.pagination?.update({ total: state.filteredRows.length, page: 1, pageSize: state.pageSize });
    renderTable();
  }

  function toast(message, type = '') {
    const element = document.getElementById('priceToast');
    element.textContent = message;
    element.className = `price-toast visible ${type}`;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => element.classList.remove('visible'), 2200);
  }

  function openImport() {
    const mask = document.getElementById('priceImportMask');
    mask.classList.add('is-open');
    mask.setAttribute('aria-hidden', 'false');
  }

  function closeImport() {
    const mask = document.getElementById('priceImportMask');
    mask.classList.remove('is-open');
    mask.setAttribute('aria-hidden', 'true');
  }

  function openCurrentPrice(id) {
    const row = state.rows.find((item) => item.id === id);
    if (!row) return;
    const records = Array.isArray(row.availableExecutionRecords)
      ? row.availableExecutionRecords
      : (Array.isArray(row.executionRecords) ? row.executionRecords : []);
    document.getElementById('priceDetailTitle').textContent = '执行价格';
    document.getElementById('priceDetailBody').innerHTML = records.length
      ? records.map((record) => `<tr><td>${escapeHtml(record.executionCycle)}</td><td>${escapeHtml(record.supplier)}</td><td>${escapeHtml(record.price)}</td></tr>`).join('')
      : '<tr><td class="price-detail-empty" colspan="3">暂无执行价格</td></tr>';
    const mask = document.getElementById('priceDetailMask');
    mask.classList.add('is-open');
    mask.setAttribute('aria-hidden', 'false');
  }

  function closeCurrentPrice() {
    const mask = document.getElementById('priceDetailMask');
    mask.classList.remove('is-open');
    mask.setAttribute('aria-hidden', 'true');
  }

  function finishEditing() {
    const inputs = document.querySelectorAll('[data-manual-id]');
    let changed = 0;
    inputs.forEach((input) => {
      const row = state.rows.find((item) => item.id === input.dataset.manualId);
      if (!row) return;
      const raw = input.value.trim();
      if (raw && !/^\d+(\.\d{1,4})?$/.test(raw)) {
        input.focus();
        toast('单价请输入最多4位小数的数字', 'error');
        return;
      }
      const next = raw ? Number(raw).toFixed(4) : '--';
      if (row.manualPrice !== next) changed += 1;
      row.manualPrice = next;
      if (state.mode === 'sales' && next !== '--') {
        row.currentPrice = next;
        row.currentSource = '手动定价';
      }
    });
    state.editing = false;
    renderTable();
    toast(changed ? `已保存${changed}条订价` : '订价未发生变化');
  }

  function exportRows() {
    const columns = visiblePriceColumns();
    const headers = state.mode === 'purchase'
      ? ['序号', '商品编号', '商品名称', '分类', '计量单位', '供应商/采购员', '当前执行价格', ...columns.map((column) => column.label)]
      : ['序号', '商品编号', '客户名称', '商品名称', '商品分类', '计量单位', '当前执行价格', ...columns.map((column) => column.label)];
    const rows = state.filteredRows.map((row, index) => state.mode === 'purchase'
      ? [index + 1, row.code, row.name, row.category, row.unit, row.supplier, row.currentPrice, ...columns.map((column) => row[column.key] ?? '')]
      : [index + 1, row.code, row.customerName, row.name, row.category, row.unit, row.currentPrice, ...columns.map((column) => row[column.key] ?? '')]);
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' }));
    link.download = `${state.mode === 'purchase' ? '采购' : '销售'}价执行清单.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast('导出成功');
  }

  function bindEvents(root) {
    root.addEventListener('click', (event) => {
      const modeTab = event.target.closest('[data-price-mode]');
      if (modeTab) {
        state.mode = modeTab.dataset.priceMode;
        renderMode();
        return;
      }
      const actionElement = event.target.closest('[data-action]');
      if (!actionElement) return;
      const action = actionElement.dataset.action;
      if (action === 'query') { applyFilters(); return; }
      if (action === 'reset') {
        document.getElementById('priceFilterFields').querySelectorAll('input, select').forEach((element) => { element.value = ''; });
        applyFilters();
        return;
      }
      if (action === 'edit-pricing') {
        if (state.editing) finishEditing();
        else { state.editing = true; renderTable(); }
        return;
      }
      if (action === 'open-import') { openImport(); return; }
      if (action === 'close-import') { closeImport(); return; }
      if (action === 'show-current-price') { openCurrentPrice(actionElement.dataset.priceId); return; }
      if (action === 'close-price-detail') { closeCurrentPrice(); return; }
      if (action === 'choose-file') { document.getElementById('priceFileInput').click(); return; }
      if (action === 'confirm-import') {
        if (!document.getElementById('priceFileInput').files.length) { toast('请先选择xlsx文件', 'error'); return; }
        closeImport();
        toast('订价导入成功');
        return;
      }
      if (action === 'download-template') { toast('订价导入模板下载中'); return; }
      if (action === 'purchase-to-sales') {
        if (!state.selectedSalesIds.size) return;
        toast(`以采定销已生成${state.selectedSalesIds.size}条销售价草稿`);
        return;
      }
      if (action === 'sync-pricing') {
        if (!state.selectedSalesIds.size) return;
        toast(`已同步${state.selectedSalesIds.size}条订价`);
        return;
      }
      if (action === 'export') { exportRows(); }
    });

    root.addEventListener('change', (event) => {
      const selectAll = event.target.closest('[data-sales-select-all]');
      if (selectAll) {
        const start = (state.page - 1) * state.pageSize;
        const visibleRows = state.filteredRows.slice(start, start + state.pageSize);
        visibleRows.forEach((row) => {
          if (selectAll.checked) state.selectedSalesIds.add(row.id);
          else state.selectedSalesIds.delete(row.id);
        });
        root.querySelectorAll('[data-sales-select]').forEach((checkbox) => { checkbox.checked = selectAll.checked; });
        syncSalesSelectionState(visibleRows);
        syncSalesActionState();
        return;
      }
      const checkbox = event.target.closest('[data-sales-select]');
      if (!checkbox) return;
      if (checkbox.checked) state.selectedSalesIds.add(checkbox.dataset.priceId);
      else state.selectedSalesIds.delete(checkbox.dataset.priceId);
      const start = (state.page - 1) * state.pageSize;
      syncSalesSelectionState(state.filteredRows.slice(start, start + state.pageSize));
      syncSalesActionState();
    });

    root.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && event.target.closest('#priceFilterFields')) applyFilters();
      if (event.key === 'Escape') closeCurrentPrice();
    });

    document.getElementById('priceImportMask').addEventListener('click', (event) => {
      if (event.target.id === 'priceImportMask') closeImport();
    });
    document.getElementById('priceDetailMask').addEventListener('click', (event) => {
      if (event.target.id === 'priceDetailMask') closeCurrentPrice();
    });
    document.getElementById('priceFileInput').addEventListener('change', (event) => {
      const file = event.target.files[0];
      document.getElementById('priceFileName').textContent = file ? file.name : '未选择文件';
    });
    window.addEventListener('storage', (event) => {
      if (event.key && event.key !== 'procurement-demo-v3') return;
      refreshPriceTypeFilter();
      refreshPriorityPresentation();
      renderTable();
    });
  }

  const root = window.AppShell.mount({ title: '价格执行清单', content: pageContent });
  state.rows = window.PriceExecutionService.getList(state.mode);
  state.filteredRows = [...state.rows];
  renderFilterFields();
  bindEvents(root);
  refreshPriorityPresentation();
  state.pagination = window.Pagination.create({
    container: '#pricePagination',
    total: state.filteredRows.length,
    page: state.page,
    pageSize: state.pageSize,
    pageSizeOptions: [20, 50, 100],
    maxVisiblePages: 5,
    onChange: ({ page, pageSize }) => {
      state.page = page;
      state.pageSize = pageSize;
      renderTable();
    }
  });
  renderTable();
})();
