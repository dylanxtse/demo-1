(function () {
  const esc = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  const money = (value) => value === '' || value == null || value === '--' ? '--' : Number(value).toFixed(2);
  const today = '2026-09-07';

  const seedProducts = [
    ['SP0300040', '黑面', 'L', '--', '--', '面类'],
    ['SP0300039', '全麦面粉', '斤', '--', '--', '面类'],
    ['SP0300038', '牛奶', '瓶', '--', '--', '蛋奶类三级'],
    ['SP0300037', '牛奶', '瓶', '三元', '10瓶1箱', '蛋奶类三级'],
    ['SP0300036', '大玉米棒子', 'KG', '--', '--', '面类'],
    ['SP0300034', '黑大米', '斤', '--', '--', '米类'],
    ['SP0300031', '鲫鱼', 'L', '--', '--', '米类'],
    ['SP0300030', '金龙鱼5L桶装油', '瓶', '金龙鱼', '5L/瓶', '食油三级'],
    ['SP0300029', '鲫鱼', '斤', '--', '--', '水产品三级'],
    ['SP0300026', '面', '瓶', '--', '--', '面类'],
    ['SP0300025', '大米', 'KG', '--', '--', '米类'],
    ['SP0300024', '三元牛奶', '瓶', '三元', '10瓶1箱', '蛋奶类三级'],
    ['SP0300023', '大饼', '斤', '--', '--', '面类'],
    ['SP0300020', '西红柿', 'KG', '--', '--', '果蔬三级'],
    ['SP0300019', '大白菜', '斤', '--', '散装', '果蔬三级'],
    ['SP0300018', '鸡蛋', '斤', '农家', '500g/份', '蛋奶类三级'],
    ['SP0300017', '金龙鱼豆油', '斤', '--', '--', '食油三级'],
    ['SP0300016', '面粉', '斤', '--', '--', '面类'],
    ['SP0300015', '香蕉', '斤', '--', '--', '果蔬三级'],
    ['SP0300014', '苹果', '斤', '--', '--', '果蔬三级'],
    ['SP0300013', '鸡腿肉', '斤', '双汇', '500g/份', '肉类三级'],
    ['SP0300012', '菜籽油', 'kg', '--', '--', '食油三级'],
    ['SP0300011', '调和油', 'kg', '--', '--', '食油三级'],
    ['SP0300010', '五得利面粉', '千克', '五得利', '5KG/袋', '面类']
  ];
  const products = seedProducts.concat(Array.from({ length: 10 }, (_, index) => {
    const source = seedProducts[index];
    return { code: `SP03000${62 + index}`, name: `${source[1]}（演示）`, unit: source[2], brand: source[3], spec: source[4], category: source[5] };
  })).map((item) => Array.isArray(item)
    ? { code: item[0], name: item[1], unit: item[2], brand: item[3], spec: item[4], category: item[5] }
    : item);
  const suppliers = ['鲜菜源蔬菜批发中心', '盒马鲜生', '每日优选', '粮油供应商', '乳业供应商'];
  const customers = ['静安第2中学', '第一实验学校', '阳光幼儿园', '育才中学'];
  const priceColumns = {
    purchase: [
      { label: '手动订价', key: 'manual' },
      { label: '协议价', key: 'agreement' },
      { label: '近一次采购价', key: 'recent' },
      { label: '供应商报价', key: 'supplierQuote' },
      { label: '市场价', key: 'market' }
    ],
    sales: [
      { label: '手动订价', key: 'manual' },
      { label: '协议价', key: 'agreement' },
      { label: '近一次销售价', key: 'recent' },
      { label: '市场价', key: 'market' }
    ]
  };
  const marketPrices = [5, 1, 5, 5, 5, 10, 20, 55, 15, 1, 19, 10, 1, 20, 8, 22, 50, 30, 30, 23, 23, 12, 11, 19, 6, 7, 5, 8, 9, 6, 4, 5, 7, 8];

  function buildRows(mode) {
    return products.map((product, index) => {
      const market = marketPrices[index] || 10;
      const purchaseSource = ['市', '市', '订', '订', '订', '订', '订', '订', '订', '订', '订', '订'][index] || '订';
      const salesManual = [5, 1, '', 5, .01, .01, '', '', '', 6, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''][index];
      const salesRecent = ['', '', '', 8, 5, 10, 20, '', 15, '', '', '', '', 20, 8, 22, '', 30][index] || '';
      return {
        id: `${mode === 'purchase' ? 'PUR' : 'SAL'}-${String(index + 1).padStart(4, '0')}`,
        ...product,
        purchaseType: ['供应商送货', '企业自加工', '市场自采'][index % 3],
        supplier: suppliers[index % suppliers.length],
        customerType: '默认客户类型（全部商品）',
        customerName: '静安第2中学',
        manual: mode === 'sales' ? salesManual : '',
        agreement: '',
        recent: mode === 'sales' ? salesRecent : '',
        supplierQuote: '',
        market: String(market),
        current: mode === 'sales' ? String(market) : String(market),
        currentSource: mode === 'sales' ? '市' : purchaseSource,
        executionRecords: [{ executionCycle: '2026-09-01至2026-09-30', supplier: suppliers[index % suppliers.length], price: money(market) }]
      };
    });
  }

  const state = {
    mode: 'purchase', page: 1, pageSize: 20, editing: false, rows: [], filteredRows: [], filters: {}, selected: new Set(), modal: null, toastTimer: null
  };
  const root = window.AppShell.mount({ title: '价格执行清单', content: '<div class="price-business-root" id="priceExecutionSourceRoot"></div>' });
  const host = root.querySelector('#priceExecutionSourceRoot');

  function defaultFilters(mode) {
    return mode === 'sales' ? { customerType: '默认客户类型（全部商品）', customerName: '静安第2中学' } : {};
  }

  function showToast(message, type = '') {
    const element = root.querySelector('#priceExecutionSourceToast');
    if (!element) return;
    clearTimeout(state.toastTimer);
    element.textContent = message;
    element.className = `px-toast visible ${type}`;
    state.toastTimer = setTimeout(() => { element.className = 'px-toast'; }, 2200);
  }

  function renderSelect(name, values, selected, first = '全部') {
    const placeholder = first.startsWith('请选择');
    const firstOption = placeholder ? '' : `<option value="">${esc(first)}</option>`;
    const placeholderData = placeholder ? ` data-price-placeholder="${esc(first)}" data-price-empty="${selected ? 'false' : 'true'}"` : '';
    return `<select class="filter-select" data-filter="${name}" aria-label="${name}"${placeholderData}>${firstOption}${values.map((value) => `<option value="${esc(value)}" ${value === selected ? 'selected' : ''}>${esc(value)}</option>`).join('')}</select>`;
  }

  function filterField(label, name, control) {
    return `<div class="operations-field"><label class="filter-label">${esc(label)}</label>${control}</div>`;
  }

  function renderFilters() {
    const f = state.filters;
    const actions = '<div class="operations-filter-actions"><button type="button" class="btn btn-primary btn-sm" data-px-action="query">查询</button><button type="button" class="btn btn-sm" data-px-action="reset">重置</button></div>';
    if (state.mode === 'purchase') return `<div class="operations-filter"><div class="operations-filter-main"><div class="operations-filter-grid">${filterField('采购类型', 'purchaseType', renderSelect('purchaseType', ['供应商送货', '企业自加工', '市场自采'], f.purchaseType, '请选择'))}${filterField('商品分类', 'category', renderSelect('category', [...new Set(products.map((product) => product.category))], f.category, '全部'))}${filterField('商品名称', 'name', `<input class="filter-input" data-filter="name" value="${esc(f.name || '')}" placeholder="请输入名称/编号" aria-label="商品名称">`)}${filterField('价格类型', 'priceType', renderSelect('priceType', priceColumns.purchase.map((column) => column.label), f.priceType, '全部'))}</div>${actions}</div></div>`;
    return `<div class="operations-filter"><div class="operations-filter-main"><div class="operations-filter-grid">${filterField('客户类型', 'customerType', renderSelect('customerType', ['默认客户类型（全部商品）', '学校', '幼儿园', '机关单位'], f.customerType, '请选择'))}${filterField('客户名称', 'customerName', renderSelect('customerName', customers, f.customerName, '请选择'))}${filterField('商品分类', 'category', renderSelect('category', [...new Set(products.map((product) => product.category))], f.category, '请选择商品分类'))}${filterField('商品名称', 'name', `<input class="filter-input" data-filter="name" value="${esc(f.name || '')}" placeholder="请输入名称/编号" aria-label="商品名称">`)}${filterField('价格类型', 'priceType', renderSelect('priceType', priceColumns.sales.map((column) => column.label), f.priceType, '全部'))}</div>${actions}</div></div>`;
  }

  function priorityNote() { return state.mode === 'purchase' ? '当前采购单价取值优先级：协议价＞市场价＞近一次采购价＞供应商报价＞手动定价' : '当前销售单价取值优先级：协议价＞市场价＞近一次销售价＞手动定价'; }
  function downloadIcon() { return '<svg class="px-icon" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>'; }
  function uploadIcon() { return '<svg class="px-icon" viewBox="0 0 24 24"><path d="M12 16V4"></path><polyline points="7 9 12 4 17 9"></polyline><path d="M5 20h14"></path></svg>'; }

  function renderToolbar() {
    const sales = state.mode === 'sales';
    return `<div class="px-toolbar"><button class="btn btn-primary btn-sm" type="button" data-px-action="edit">${state.editing ? '完成编辑' : '编辑订价'}</button>${sales ? '<button class="btn btn-primary btn-sm" type="button" data-px-action="purchase-to-sales" disabled>以采定销</button><button class="btn btn-primary btn-sm" type="button" data-px-action="sync" disabled>同步订价</button>' : ''}<button class="btn btn-primary btn-sm" type="button" data-px-action="open-import">导入订价</button><span class="px-toolbar-spacer"></span><span class="px-priority-note" title="${esc(priorityNote())}">${esc(priorityNote())}</span><button class="btn btn-sm px-export" type="button" data-px-action="export">${downloadIcon()}导出</button></div>`;
  }

  function renderCurrent(row) {
    if (!row.current) return '<span class="px-price-empty">--</span>';
    return `<button type="button" class="px-current-link" data-px-action="current" data-id="${esc(row.id)}"><span class="px-current-price"><span class="px-current-tag">${esc(row.currentSource)}</span><span class="px-current-value">${money(row.current)}</span></span></button>`;
  }

  function renderProductName(row) { return `<div class="px-product-name">${esc(`${row.name}(${row.unit}/${row.brand || '--'}/${row.spec || '--'})`)}</div>`; }
  function renderPriceCell(row, column) {
    if (column.key === 'manual' && state.editing) return `<input class="px-inline-price" data-manual-id="${esc(row.id)}" value="${esc(row.manual || '')}" placeholder="请输入单价" inputmode="decimal">`;
    const value = row[column.key];
    return `<span class="px-price-empty">${money(value)}</span>`;
  }

  function renderTable() {
    const columns = priceColumns[state.mode];
    const start = (state.page - 1) * state.pageSize;
    const rows = state.filteredRows.slice(start, start + state.pageSize);
    const header = state.mode === 'purchase'
      ? `<tr><th class="px-seq">序号</th><th class="px-image-col">图片</th><th class="px-code">商品编号</th><th class="px-name">商品名称（计量单位/品牌/规格）</th><th class="px-category">分类</th><th class="px-unit">计量单位</th><th class="px-partner">供应商/采购员</th><th class="px-current">当前执行价格</th>${columns.map((column) => `<th class="px-source">${esc(column.label)}</th>`).join('')}</tr>`
      : `<tr><th class="px-select"><input type="checkbox" class="px-checkbox" data-select-all aria-label="全选"></th><th class="px-seq">序号</th><th class="px-image-col">图片</th><th class="px-code">商品编号</th><th class="px-partner">客户名称</th><th class="px-name">商品名称（计量单位/品牌/规格）</th><th class="px-category">商品分类</th><th class="px-unit">计量单位</th><th class="px-current">当前执行价格</th>${columns.map((column) => `<th class="px-source">${esc(column.label)}</th>`).join('')}</tr>`;
    const body = rows.length ? rows.map((row, index) => {
      const cells = state.mode === 'purchase'
        ? `<td class="px-seq">${start + index + 1}</td><td class="px-image-col"><span class="px-image">图片</span></td><td class="px-code">${esc(row.code)}</td><td class="px-name">${renderProductName(row)}</td><td class="px-category">${esc(row.category)}</td><td class="px-unit">${esc(row.unit)}</td><td class="px-partner">${esc(row.supplier)}</td><td class="px-current">${renderCurrent(row)}</td>`
        : `<td class="px-select"><input type="checkbox" class="px-checkbox" data-select-row data-id="${esc(row.id)}" ${state.selected.has(row.id) ? 'checked' : ''} aria-label="选择${esc(row.name)}"></td><td class="px-seq">${start + index + 1}</td><td class="px-image-col"><span class="px-image">图片</span></td><td class="px-code">${esc(row.code)}</td><td class="px-partner">${esc(row.customerName)}</td><td class="px-name">${renderProductName(row)}</td><td class="px-category">${esc(row.category)}</td><td class="px-unit">${esc(row.unit)}</td><td class="px-current">${renderCurrent(row)}</td>`;
      return `<tr>${cells}${columns.map((column) => `<td class="px-source">${renderPriceCell(row, column)}</td>`).join('')}</tr>`;
    }).join('') : `<tr><td class="px-empty" colspan="${(state.mode === 'purchase' ? 8 : 9) + columns.length}">暂无数据</td></tr>`;
    host.querySelector('#pxTableHead').innerHTML = header;
    host.querySelector('#pxTableBody').innerHTML = body;
    const total = state.filteredRows.length; const pages = Math.max(1, Math.ceil(total / state.pageSize)); state.page = Math.min(state.page, pages);
    const pageButtons = Array.from({ length: Math.min(5, pages) }, (_, index) => index + 1).map((page) => `<button type="button" class="px-page-btn ${page === state.page ? 'active' : ''}" data-px-page="${page}">${page}</button>`).join('');
    host.querySelector('#pxPagination').innerHTML = `<span class="px-total">共 ${total} 条数据</span><select class="px-page-size" data-px-page-size aria-label="每页条数"><option value="20" ${state.pageSize === 20 ? 'selected' : ''}>20 条/页</option><option value="50" ${state.pageSize === 50 ? 'selected' : ''}>50 条/页</option><option value="100" ${state.pageSize === 100 ? 'selected' : ''}>100 条/页</option></select><div class="px-page-buttons"><button type="button" class="px-page-btn" data-px-page="${Math.max(1, state.page - 1)}" ${state.page === 1 ? 'disabled' : ''}>‹</button>${pageButtons}<button type="button" class="px-page-btn" data-px-page="${Math.min(pages, state.page + 1)}" ${state.page === pages ? 'disabled' : ''}>›</button></div><label class="px-page-jump">跳至 <input class="px-jump" data-px-jump value="${state.page}" aria-label="跳转页码"> / ${pages} 页</label>`;
    syncSelection(rows);
  }

  function syncSelection(rows) {
    if (state.mode !== 'sales') return;
    const all = host.querySelector('[data-select-all]'); const selectedCount = rows.filter((row) => state.selected.has(row.id)).length;
    if (all) { all.checked = rows.length > 0 && selectedCount === rows.length; all.indeterminate = selectedCount > 0 && selectedCount < rows.length; all.disabled = rows.length === 0; }
    const disabled = state.selected.size === 0;
    host.querySelectorAll('[data-px-action="purchase-to-sales"], [data-px-action="sync"]').forEach((button) => { button.disabled = disabled; });
  }

  function applyFilters() {
    const f = state.filters; const name = String(f.name || '').toLowerCase();
    state.filteredRows = state.rows.filter((row) => (!f.purchaseType || row.purchaseType === f.purchaseType) && (!f.customerType || row.customerType === f.customerType) && (!f.customerName || row.customerName === f.customerName) && (!f.category || row.category === f.category) && (!name || `${row.name} ${row.code}`.toLowerCase().includes(name)) && (!f.priceType || (row[({ '手动订价': 'manual', '协议价': 'agreement', '近一次采购价': 'recent', '近一次销售价': 'recent', '供应商报价': 'supplierQuote', '市场价': 'market' })[f.priceType]] || '') !== ''));
    state.page = 1; renderTable();
  }

  function readFilterValues() { host.querySelectorAll('[data-filter]').forEach((element) => { state.filters[element.dataset.filter] = element.value.trim(); }); }
  function renderPage() {
    host.innerHTML = `<section class="page-card price-execution-source-page order-module-page"><div class="px-tabs" role="tablist"><button type="button" class="${state.mode === 'purchase' ? 'active' : ''}" data-px-mode="purchase">采购价执行清单</button><button type="button" class="${state.mode === 'sales' ? 'active' : ''}" data-px-mode="sales">销售价执行清单</button></div>${renderFilters()}${renderToolbar()}<div class="px-table-box"><div class="px-table-scroll"><table class="px-table"><thead id="pxTableHead"></thead><tbody id="pxTableBody"></tbody></table></div><div class="px-pagination" id="pxPagination"></div></div><div class="px-toast" id="priceExecutionSourceToast" role="status"></div></section>${state.modal ? renderModal() : ''}`;
    renderTable();
    window.PriceSelectPlaceholder?.apply(host);
  }

  function openModal(type, row = null) { state.modal = { type, row }; renderPage(); }
  function closeModal() { state.modal = null; renderPage(); }
  function renderModal() {
    if (state.modal.type === 'import') return `<div class="px-mask" data-px-backdrop><div class="px-dialog" role="dialog" aria-modal="true"><div class="px-dialog-head"><h2>导入订价</h2><button type="button" class="px-close" data-px-action="close-modal" aria-label="关闭">×</button></div><div class="px-dialog-body"><div class="px-import-template"><span>请先下载模板，按模板填写价格数据</span><button type="button" class="btn-text" data-px-action="download-template">下载模板</button></div><div class="px-dialog-row"><button type="button" class="btn btn-sm" data-px-action="choose-file">${uploadIcon()}上传文件</button><span class="px-file-name" id="pxFileName">未选择文件</span><input id="pxFileInput" type="file" accept=".xlsx" hidden></div><div class="px-dialog-tip">只能上传xlsx文件，且不超过10M</div></div><div class="px-dialog-footer"><button type="button" class="btn btn-sm" data-px-action="close-modal">取消</button><button type="button" class="btn btn-primary btn-sm" data-px-action="confirm-import">导入</button></div></div></div>`;
    const row = state.modal.row; const records = row?.executionRecords || [];
    return `<div class="px-mask" data-px-backdrop><div class="px-dialog wide" role="dialog" aria-modal="true"><div class="px-dialog-head"><h2>执行价格</h2><button type="button" class="px-close" data-px-action="close-modal" aria-label="关闭">×</button></div><div class="px-dialog-body"><table class="px-detail-table"><thead><tr><th>执行周期</th><th>供应商</th><th>价格</th></tr></thead><tbody>${records.length ? records.map((record) => `<tr><td>${esc(record.executionCycle)}</td><td>${esc(record.supplier)}</td><td>${esc(record.price)}</td></tr>`).join('') : '<tr><td class="px-detail-empty" colspan="3">暂无执行价格</td></tr>'}</tbody></table></div></div></div>`;
  }

  function finishEditing() {
    let changed = 0; host.querySelectorAll('[data-manual-id]').forEach((input) => { const row = state.rows.find((item) => item.id === input.dataset.manualId); if (!row) return; const raw = input.value.trim(); if (raw && !/^\d+(\.\d{1,4})?$/.test(raw)) { showToast('单价请输入最多4位小数的数字', 'error'); return; } const next = raw || ''; if (row.manual !== next) changed += 1; row.manual = next; if (state.mode === 'sales' && next) { row.current = next; row.currentSource = '订'; } }); state.editing = false; renderPage(); showToast(changed ? `已保存${changed}条订价` : '订价未发生变化'); }
  function exportRows() { const columns = priceColumns[state.mode]; const headers = state.mode === 'purchase' ? ['序号', '商品编号', '商品名称', '分类', '计量单位', '供应商/采购员', '当前执行价格', ...columns.map((column) => column.label)] : ['序号', '商品编号', '客户名称', '商品名称', '商品分类', '计量单位', '当前执行价格', ...columns.map((column) => column.label)]; const data = state.filteredRows.map((row, index) => state.mode === 'purchase' ? [index + 1, row.code, row.name, row.category, row.unit, row.supplier, row.current, ...columns.map((column) => row[column.key] ?? '')] : [index + 1, row.code, row.customerName, row.name, row.category, row.unit, row.current, ...columns.map((column) => row[column.key] ?? '')]); const csv = [headers, ...data].map((line) => line.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n'); const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' })); link.download = `${state.mode === 'purchase' ? '采购' : '销售'}价执行清单.csv`; link.click(); URL.revokeObjectURL(link.href); showToast('导出成功'); }

  root.addEventListener('click', (event) => {
    const mode = event.target.closest('[data-px-mode]'); if (mode) { state.mode = mode.dataset.pxMode; state.rows = buildRows(state.mode); state.filters = defaultFilters(state.mode); state.selected.clear(); state.page = 1; state.editing = false; renderPage(); return; }
    const page = event.target.closest('[data-px-page]'); if (page && !page.disabled) { state.page = Number(page.dataset.pxPage); renderTable(); return; }
    const actionElement = event.target.closest('[data-px-action]'); if (!actionElement) { if (event.target.matches('[data-px-backdrop]')) closeModal(); return; }
    const action = actionElement.dataset.pxAction;
    if (action === 'query') { readFilterValues(); applyFilters(); return; }
    if (action === 'reset') { state.filters = defaultFilters(state.mode); state.page = 1; renderPage(); return; }
    if (action === 'edit') { if (state.editing) finishEditing(); else { state.editing = true; renderPage(); } return; }
    if (action === 'open-import') { openModal('import'); return; }
    if (action === 'close-modal') { closeModal(); return; }
    if (action === 'choose-file') { host.querySelector('#pxFileInput')?.click(); return; }
    if (action === 'confirm-import') { if (!host.querySelector('#pxFileInput')?.files.length) { showToast('请先选择xlsx文件', 'error'); return; } closeModal(); showToast('订价导入成功'); return; }
    if (action === 'download-template') { showToast('订价导入模板下载中'); return; }
    if (action === 'current') { openModal('detail', state.rows.find((row) => row.id === actionElement.dataset.id)); return; }
    if (action === 'purchase-to-sales') { showToast(`以采定销已生成${state.selected.size}条销售价草稿`); return; }
    if (action === 'sync') { showToast(`已同步${state.selected.size}条订价`); return; }
    if (action === 'export') exportRows();
  });

  root.addEventListener('change', (event) => {
    if (event.target.matches('[data-select-all]')) { const start = (state.page - 1) * state.pageSize; state.filteredRows.slice(start, start + state.pageSize).forEach((row) => event.target.checked ? state.selected.add(row.id) : state.selected.delete(row.id)); renderTable(); return; }
    if (event.target.matches('[data-select-row]')) { if (event.target.checked) state.selected.add(event.target.dataset.id); else state.selected.delete(event.target.dataset.id); renderTable(); return; }
    if (event.target.matches('[data-px-page-size]')) { state.pageSize = Number(event.target.value) || 20; state.page = 1; renderTable(); return; }
    if (event.target.matches('[data-filter]')) { state.filters[event.target.dataset.filter] = event.target.value; }
    if (event.target.matches('#pxFileInput')) { const file = event.target.files[0]; const name = host.querySelector('#pxFileName'); if (name) name.textContent = file ? file.name : '未选择文件'; }
  });

  root.addEventListener('keydown', (event) => { if (event.key === 'Enter' && event.target.matches('[data-px-jump]')) { event.preventDefault(); state.page = Number(event.target.value) || 1; renderTable(); } if (event.key === 'Escape') closeModal(); });
  window.addEventListener('storage', (event) => { if (event.key === 'procurement-demo-v3') { state.rows = buildRows(state.mode); applyFilters(); } });

  state.rows = buildRows(state.mode); state.filters = defaultFilters(state.mode); state.filteredRows = [...state.rows]; renderPage();
})();
