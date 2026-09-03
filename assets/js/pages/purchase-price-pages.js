(function () {
  const esc = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const today = '2026-08-20';
  const suppliers = ['盒马鲜生', '每日优选', '鲜菜源蔬菜批发中心', '绿源供应商', '粮油供应商', '乳业供应商'];
  const products = [
    { code: 'SP0300039', name: '土豆丝', unit: '斤', brand: '--', spec: '--', category: '果蔬-果蔬二级', market: 7.8, recent: 7.8 },
    { code: 'SP0300040', name: '土豆', unit: '斤', brand: '农家优选', spec: '500g/份', category: '果蔬-果蔬二级', market: 6.8, recent: 5.7 },
    { code: 'SP0300038', name: '牛奶', unit: '瓶', brand: '--', spec: '--', category: '蛋奶类-蛋奶类二级', market: 5, recent: 4.8 },
    { code: 'SP0300037', name: '牛奶', unit: '瓶', brand: '三元', spec: '10瓶1箱', category: '蛋奶类-蛋奶类二级', market: 5, recent: 4.8 },
    { code: 'SP0300036', name: '大玉米棒子', unit: 'KG', brand: '--', spec: '--', category: '主食（米面粉点心类）-粮食类', market: 5, recent: 4.8 },
    { code: 'SP0300034', name: '黑大米', unit: '斤', brand: '--', spec: '--', category: '主食（米面粉点心类）-粮食类', market: 10, recent: 8.5 },
    { code: 'SP0300031', name: '鲫鱼', unit: '斤', brand: '--', spec: '--', category: '水产品-水产品二级', market: 20, recent: 19.8 },
    { code: 'SP0300030', name: '金龙鱼5L桶装油', unit: '瓶', brand: '金龙鱼', spec: '5L/瓶', category: '食油-食油二级', market: 55, recent: 9.9 },
    { code: 'SP0300029', name: '鲫鱼', unit: '斤', brand: '--', spec: '--', category: '水产品-水产品二级', market: 15, recent: 14.8 },
    { code: 'SP0300026', name: '面', unit: '斤', brand: '--', spec: '--', category: '主食（米面粉点心类）-粮食类', market: 1, recent: 0.8 },
    { code: 'SP0300025', name: '大米', unit: 'KG', brand: '--', spec: '--', category: '主食（米面粉点心类）-粮食类', market: 19, recent: 18.8 },
    { code: 'SP0300024', name: '三元牛奶', unit: '瓶', brand: '三元', spec: '10瓶1箱', category: '蛋奶类-蛋奶类二级', market: 10, recent: 9.8 }
  ];
  const productCategories = [...new Set(products.map((product) => product.category))];

  const inquirySeed = [
    ['XJD202608190300001', '2026-08-19 ~ 2026-08-31', '2026-08-19', 2, 0, '盒马鲜生、每日优选、鲜菜源蔬菜批发中心', '已完成'],
    ['XJD202607020300002', '2026-07-02 ~ 2026-07-03', '2026-07-02', 2, 1, '每日优选', '已关闭'],
    ['XJD202607020300001', '2026-07-02 ~ 2026-07-03', '2026-07-02', 1, 0, '盒马鲜生', '已关闭'],
    ['XJD202604230300001', '2026-04-23 ~ 2026-05-31', '2026-04-23', 2, 1, '每日优选', '已关闭'],
    ['XJD202604220300001', '2026-04-22 ~ 2026-04-30', '2026-04-22', 1, 2, '盒马鲜生、每日优选、鲜菜源蔬菜批发中心', '已关闭'],
    ['XJD202604200300001', '2026-04-21 ~ 2026-04-26', '2026-04-21', 3, 0, '盒马鲜生、每日优选、鲜菜源蔬菜批发中心', '已关闭'],
    ['XJD202603240300003', '2026-03-24 ~ 2026-03-26', '2026-03-24', 1, 1, '盒马鲜生', '已完成'],
    ['XJD202603240300002', '2026-03-24 ~ 2026-03-26', '2026-03-24', 1, 1, '盒马鲜生', '已关闭'],
    ['XJD202603240300001', '2026-03-24 ~ 2026-03-31', '2026-03-24', 1, 1, '盒马鲜生', '已关闭'],
    ['XJD202603180300001', '2026-03-18 ~ 2026-04-30', '2026-03-18', 2, 0, '盒马鲜生、每日优选、鲜菜源蔬菜批发中心', '已关闭']
  ];
  const agreementSeed = [
    ['CGXY202608050300002', 1, '每日优选', '2026-08-07-2026-08-08', '已关闭', '', '杨'],
    ['CGXY202608050300001', 1, '鲜菜源蔬菜批发中心', '2026-08-06-2026-08-06', '已关闭', '', '杨']
  ];

  const state = {
    kind: document.body.dataset.pricePage === 'purchaseAgreement' ? 'agreement' : 'inquiry',
    view: 'list', tab: 'agreement', rows: [], productRows: [], filteredRows: [],
    page: 1, pageSize: 20, pagination: null, formRows: [], editingId: null, formMode: 'add', formMeta: { executionFrom: '', executionTo: '', deadline: '', target: '' }, activeRowId: null, planRows: [], planMode: 'confirm', closeId: null, toastTimer: null, datePickers: [], datePickerMap: {},
    batch: { page: 1, pageSize: 20, filtered: [], selectedCodes: new Set(), drafts: {}, pagination: null }
  };
  state.rows = state.kind === 'inquiry'
    ? inquirySeed.map((row, index) => ({ id: row[0], orderNo: row[0], executionCycle: row[1], deadline: row[2], productCount: row[3], quoteCount: row[4], targets: row[5], status: row[6], products: products.slice(0, row[3]) }))
    : agreementSeed.map((row) => ({ id: row[0], agreementNo: row[0], productCount: row[1], supplier: row[2], executionPeriod: row[3], addedDate: '2026-08-05', status: row[4], remark: row[5], addedBy: row[6], products: [] }));
  state.productRows = [];

  const config = state.kind === 'inquiry'
    ? { title: '询价报价', addLabel: '添加询价单' }
    : { title: '采购协议价', addLabel: '添加协议价' };
  const root = window.AppShell.mount({ title: config.title, content: '<div class="official-price-page"><div id="officialPriceContent"></div><div class="official-price-toast" id="officialPriceToast" role="status"></div></div>' });
  const content = root.querySelector('#officialPriceContent');

  function money(value) { return value == null || value === '' ? '--' : Number(value).toFixed(2); }
  function productLabel(item) { return `${item.name}（${item.unit}/${item.brand || '--'}/${item.spec || '--'}）`; }
  function productSupplier(item) { return suppliers[products.indexOf(item) % suppliers.length]; }
  function toast(message, type = '') {
    const el = root.querySelector('#officialPriceToast');
    clearTimeout(state.toastTimer); el.textContent = message; el.className = `official-price-toast is-visible ${type}`;
    state.toastTimer = setTimeout(() => { el.className = 'official-price-toast'; }, 2200);
  }
  function selectOptions(values, includeAll = true) {
    const uniqueValues = [...new Set(values)];
    return `${includeAll ? '<option value="">全部</option>' : '<option value="">请选择</option>'}${uniqueValues.map((value) => `<option value="${esc(value)}">${esc(value)}</option>`).join('')}`;
  }
  function syncPlaceholderSelect(select) {
    if (!select || !select.matches('[data-placeholder-select]')) return;
    select.classList.toggle('is-placeholder', !select.value);
  }
  function syncPlaceholderSelects(scope = root) {
    scope.querySelectorAll('[data-placeholder-select]').forEach((select) => syncPlaceholderSelect(select));
  }
  function blankInquiryRows(row) {
    const source = row?.products || [];
    return Array.from({ length: Math.max(10, source.length) }, (_, index) => source[index]
      ? { productCode: source[index].code, quantity: source[index].quantity || '0.00', remark: source[index].remark || '' }
      : { quantity: '0.00' });
  }
  function parseExecutionCycle(cycle = '') {
    const parts = String(cycle).split(/\s*~\s*/);
    return { executionFrom: parts[0] || '', executionTo: parts[1] || '' };
  }
  function openInquiryForm(row = null, mode = 'add') {
    const cycle = parseExecutionCycle(row?.executionCycle || '');
    const formMode = mode === 'edit' ? 'edit' : 'add';
    state.view = 'form';
    state.formMode = formMode;
    state.editingId = formMode === 'edit' ? row?.id || null : null;
    state.activeRowId = row?.id || null;
    state.formRows = blankInquiryRows(row);
    state.formMeta = { ...cycle, deadline: row?.deadline || '', target: String(row?.targets || '').split('、')[0] || '' };
    render();
  }
  function filterField(label, id, control, cls = '') {
    return `<div class="operations-field ${cls}"><label class="filter-label" for="${id}">${esc(label)}</label>${control}</div>`;
  }
  function dateRange(prefix, from = '', to = '') {
    return `<div class="date-range-picker operations-date-range" id="${prefix}Range"><input class="filter-input date-range-display" id="${prefix}Display" type="text" readonly placeholder="请选择日期"><input id="${prefix}From" type="hidden" data-date-start value="${esc(from)}"><input id="${prefix}To" type="hidden" data-date-end value="${esc(to)}"><span class="date-range-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></span></div>`;
  }
  function destroyDatePickers() {
    state.datePickers.forEach((picker) => picker?.destroy?.());
    state.datePickers = [];
    state.datePickerMap = {};
  }
  function mountDatePickers() {
    if (window.DateRangePicker) root.querySelectorAll('.date-range-picker').forEach((container) => {
      const picker = window.DateRangePicker.create({ container });
      if (picker) {
        state.datePickerMap[container.id] = picker;
        state.datePickers.push(picker);
      }
    });
    if (window.DatePicker) root.querySelectorAll('[data-date-picker]').forEach((input) => {
      const picker = window.DatePicker.create({ input });
      if (picker) state.datePickers.push(picker);
    });
  }
  function matchesDate(row, fromId, toId, field) {
    const from = root.querySelector(`#${fromId}`)?.value || '';
    const to = root.querySelector(`#${toId}`)?.value || '';
    if (!from && !to) return true;
    const first = String(row[field] || '').slice(0, 10);
    return (!from || first >= from) && (!to || first <= to);
  }
  function applyFilters() {
    if (state.kind === 'inquiry') {
      const supplier = root.querySelector('#officialInquirySupplier')?.value || '';
      const status = root.querySelector('#officialInquiryStatus')?.value || '';
      const productName = root.querySelector('#officialInquiryProduct')?.value.trim().toLowerCase() || '';
      const orderNo = root.querySelector('#officialInquiryOrder')?.value.trim().toLowerCase() || '';
      state.filteredRows = state.rows.filter((row) => matchesDate(row, 'officialInquiryFrom', 'officialInquiryTo', 'deadline')
        && (!supplier || row.targets.includes(supplier)) && (!status || row.status === status)
        && (!productName || row.products.some((item) => productLabel(item).toLowerCase().includes(productName) || item.name.toLowerCase().includes(productName)))
        && (!orderNo || row.orderNo.toLowerCase().includes(orderNo)));
    } else if (state.tab === 'agreement') {
      const supplier = root.querySelector('#officialAgreementSupplier')?.value || '';
      const status = root.querySelector('#officialAgreementStatus')?.value || '';
      const productName = root.querySelector('#officialAgreementProduct')?.value.trim().toLowerCase() || '';
      state.filteredRows = state.rows.filter((row) => matchesDate(row, 'officialAgreementFrom', 'officialAgreementTo', 'addedDate')
        && (!supplier || row.supplier === supplier) && (!status || row.status === status)
        && (!productName || row.products.some((item) => productLabel(item).toLowerCase().includes(productName) || item.name.toLowerCase().includes(productName))));
    } else {
      const supplier = root.querySelector('#officialAgreementProductSupplier')?.value || '';
      const status = root.querySelector('#officialAgreementProductStatus')?.value || '';
      const productName = root.querySelector('#officialAgreementProductName')?.value.trim().toLowerCase() || '';
      state.filteredRows = state.productRows.filter((row) => (!supplier || row.supplier === supplier) && (!status || row.status === status) && (!productName || productLabel(row.product).toLowerCase().includes(productName)));
    }
    state.page = 1; renderTable();
  }
  function statusTag(status) {
    const type = status === '已完成' || status === '已生效' ? 'success' : status === '待确认' || status === '待审核' || status === '待生效' ? 'warning' : 'danger';
    return `<span class="official-status ${type}">${esc(status)}</span>`;
  }
  function actionButton(label, action, id, disabled = false, danger = false) {
    return `<button type="button" class="official-action ${danger ? 'danger' : ''}" data-row-action="${action}" data-id="${esc(id)}" ${disabled ? 'disabled' : ''}>${esc(label)}</button>`;
  }
  function inquiryActions(row) {
    const planAction = row.status === '已完成'
      ? actionButton('编辑询价单', 'edit-plan', row.id)
      : row.status === '已关闭' ? '' : actionButton('确认方案', 'confirm', row.id);
    return `${planAction}${actionButton('编辑', 'edit', row.id, row.status === '已关闭')}${actionButton('复制', 'copy', row.id)}${actionButton('关闭', 'close', row.id, row.status === '已关闭', true)}`;
  }
  function renderList() {
    if (state.kind === 'agreement') {
      state.productRows = state.rows.flatMap((agreement) => (agreement.products || []).map((product) => ({
        id: `${agreement.id}-${product.code}`,
        product,
        price: product.price,
        supplier: agreement.supplier,
        agreementNo: agreement.agreementNo,
        executionPeriod: agreement.executionPeriod,
        status: agreement.status,
        addedBy: agreement.addedBy
      })));
    }
    const agreementTabs = state.kind === 'agreement' ? `<div class="official-price-tabs" role="tablist"><button type="button" class="${state.tab === 'agreement' ? 'active' : ''}" data-action="agreement-tab">采购协议价</button><button type="button" class="${state.tab === 'products' ? 'active' : ''}" data-action="product-tab">协议价商品</button></div>` : '';
    const filters = state.kind === 'inquiry' ? `
      <div class="operations-filter official-price-filter inquiry-filter-grid"><div class="operations-filter-main"><div class="operations-filter-grid">
        ${filterField('执行日期', 'officialInquiryDisplay', dateRange('officialInquiry', '', ''))}
        ${filterField('供应商名称', 'officialInquirySupplier', `<select class="filter-select" id="officialInquirySupplier">${selectOptions(suppliers)}</select>`)}
        ${filterField('单据状态', 'officialInquiryStatus', `<select class="filter-select" id="officialInquiryStatus">${selectOptions(['待确认', '已完成', '已关闭'])}</select>`)}
        ${filterField('商品名称', 'officialInquiryProduct', '<input class="filter-input" id="officialInquiryProduct" placeholder="请输入商品名称">')}
        ${filterField('单号', 'officialInquiryOrder', '<input class="filter-input" id="officialInquiryOrder" placeholder="请输入单号">')}
      </div><div class="operations-filter-actions"><button type="button" class="btn btn-primary btn-sm" data-action="query">查询</button><button type="button" class="btn btn-sm" data-action="reset">重置</button></div></div></div>` : state.tab === 'agreement' ? `
      <div class="operations-filter official-price-filter agreement-filter-grid"><div class="operations-filter-main"><div class="operations-filter-grid">
        ${filterField('添加日期', 'officialAgreementDisplay', dateRange('officialAgreement', '2026-07-20', '2026-08-20'))}
        ${filterField('供应商名称', 'officialAgreementSupplier', `<select class="filter-select" id="officialAgreementSupplier">${selectOptions(['每日优选', '鲜菜源蔬菜批发中心', ...suppliers])}</select>`)}
        ${filterField('状态', 'officialAgreementStatus', `<select class="filter-select" id="officialAgreementStatus">${selectOptions(['已关闭', '待审核', '已生效'])}</select>`)}
        ${filterField('商品名称', 'officialAgreementProduct', '<input class="filter-input" id="officialAgreementProduct" placeholder="请输入商品名称/编码">')}
      </div><div class="operations-filter-actions"><button type="button" class="btn btn-primary btn-sm" data-action="query">查询</button><button type="button" class="btn btn-sm" data-action="reset">重置</button></div></div></div>` : `
      <div class="operations-filter official-price-filter product-filter-grid"><div class="operations-filter-main"><div class="operations-filter-grid">
        ${filterField('供应商名称', 'officialAgreementProductSupplier', `<select class="filter-select" id="officialAgreementProductSupplier">${selectOptions(suppliers)}</select>`)}
        ${filterField('状态', 'officialAgreementProductStatus', `<select class="filter-select" id="officialAgreementProductStatus">${selectOptions(['已生效', '待生效', '已关闭'])}</select>`)}
        ${filterField('商品名称', 'officialAgreementProductName', '<input class="filter-input" id="officialAgreementProductName" placeholder="请输入商品名称/编码">')}
      </div><div class="operations-filter-actions"><button type="button" class="btn btn-primary btn-sm" data-action="query">查询</button><button type="button" class="btn btn-sm" data-action="reset">重置</button></div></div></div>`;
    const toolbar = state.kind === 'inquiry' || state.tab === 'agreement' ? `<div class="official-price-toolbar"><button type="button" class="btn btn-primary btn-sm" data-action="add">${esc(config.addLabel)}</button></div>` : '';
    const listTableClass = state.kind === 'inquiry' ? ' official-inquiry-table' : state.tab === 'agreement' ? ' official-agreement-table' : ' official-product-table';
    destroyDatePickers();
    content.innerHTML = `<section class="page-card official-price-card">${agreementTabs}${filters}${toolbar}<div class="official-table-wrap"><table class="official-price-table${listTableClass}"><thead id="officialPriceHead"></thead><tbody id="officialPriceBody"></tbody></table></div><div class="official-pagination" id="officialPricePagination"></div></section>`;
    mountDatePickers();
    state.filteredRows = state.kind === 'inquiry' ? [...state.rows] : state.tab === 'agreement' ? [...state.rows] : [...state.productRows];
    state.pagination = window.Pagination.create({ container: '#officialPricePagination', total: state.filteredRows.length, page: state.page, pageSize: state.pageSize, pageSizeOptions: [20, 50, 100], maxVisiblePages: 5, onChange: ({ page, pageSize }) => { state.page = page; state.pageSize = pageSize; renderTable(); } });
    renderTable();
  }
  function renderTable() {
    const head = root.querySelector('#officialPriceHead');
    const body = root.querySelector('#officialPriceBody');
    if (!head || !body) return;
    const rows = state.filteredRows.slice((state.page - 1) * state.pageSize, state.page * state.pageSize);
    if (state.kind === 'inquiry') {
      head.innerHTML = '<tr><th>序号</th><th>单号</th><th>执行周期</th><th>截止时间</th><th>询价商品数</th><th>报价份数</th><th>询价对象</th><th>状态</th><th>操作</th></tr>';
      body.innerHTML = rows.length ? rows.map((row, index) => `<tr><td>${(state.page - 1) * state.pageSize + index + 1}</td><td><button class="official-link" data-row-action="view" data-id="${esc(row.id)}">${esc(row.orderNo)}</button></td><td>${esc(row.executionCycle)}</td><td>${esc(row.deadline)}</td><td>${row.productCount}</td><td>${row.quoteCount}</td><td class="ellipsis-cell" title="${esc(row.targets)}">${esc(row.targets)}</td><td>${statusTag(row.status)}</td><td class="official-actions">${inquiryActions(row)}</td></tr>`).join('') : emptyRow(9);
    } else if (state.tab === 'agreement') {
      head.innerHTML = '<tr><th>序号</th><th>单号</th><th>商品种数</th><th>供应商名称</th><th>执行周期</th><th>状态</th><th>备注</th><th>添加人</th><th>操作</th></tr>';
      body.innerHTML = rows.length ? rows.map((row, index) => `<tr><td>${(state.page - 1) * state.pageSize + index + 1}</td><td><button class="official-link" data-row-action="view" data-id="${esc(row.id)}">${esc(row.agreementNo)}</button></td><td>${row.productCount}</td><td>${esc(row.supplier)}</td><td class="ellipsis-cell" title="${esc(row.executionPeriod)}">${esc(row.executionPeriod)}</td><td>${statusTag(row.status)}</td><td>${esc(row.remark || '')}</td><td>${esc(row.addedBy || '杨')}</td><td class="official-actions">${actionButton('审核', 'audit', row.id, true)}${actionButton('编辑', 'edit', row.id, true)}${actionButton('复制', 'copy', row.id)}${actionButton('生效', 'activate', row.id, true)}${actionButton('关闭', 'close', row.id, true, true)}</td></tr>`).join('') : emptyRow(9);
    } else {
      head.innerHTML = '<tr><th>序号</th><th>商品名称（计量单位/品牌/规格）</th><th>商品分类</th><th>计量单位</th><th>计算公式</th><th>协议价</th><th>供应商名称</th><th>关联单号</th><th>执行周期</th><th>状态</th><th>添加人</th><th>操作</th></tr>';
      body.innerHTML = rows.length ? rows.map((row, index) => `<tr><td>${(state.page - 1) * state.pageSize + index + 1}</td><td>${esc(productLabel(row.product))}</td><td>${esc(row.product.category)}</td><td>${esc(row.product.unit)}</td><td>协议价</td><td>${money(row.price)}</td><td>${esc(row.supplier)}</td><td>${esc(row.agreementNo)}</td><td>${esc(row.executionPeriod)}</td><td>${statusTag(row.status)}</td><td>${esc(row.addedBy || '杨')}</td><td class="official-actions">${actionButton('编辑', 'edit-product', row.id, true)}</td></tr>`).join('') : emptyRow(12);
    }
    state.pagination?.update({ total: state.filteredRows.length, page: state.page, pageSize: state.pageSize });
  }
  function emptyRow(colspan) { return `<tr><td class="official-empty" colspan="${colspan}">暂无数据</td></tr>`; }
  function inputProductRow(index, mode) {
    const selected = state.formRows[index]?.productCode || '';
    const item = products.find((product) => product.code === selected);
    const placeholder = '请选择商品名称，添加后的商品不再可被选择，选项中消失';
    const options = `<option value="" disabled ${selected ? '' : 'selected'} hidden>${placeholder}</option>${products.map((product) => `<option value="${product.code}" ${product.code === selected ? 'selected' : ''}>${esc(productLabel(product))}</option>`).join('')}`;
    const select = `<select class="form-product-select ${selected ? '' : 'is-placeholder'}" data-line="${index}" data-placeholder-select aria-label="商品名称">${options}</select>`;
    if (mode === 'inquiry') return `<tr><td>${index + 1}</td><td><span class="official-image-placeholder">⌁</span></td><td>${select}</td><td data-line-unit="${index}">${esc(item?.unit || '')}</td><td data-line-supplier="${index}">${esc(item ? '默认供应商 / 采购员' : '')}</td><td><input class="form-quantity" data-line-quantity="${index}" value="${esc(state.formRows[index]?.quantity ?? '0.00')}" type="text" inputmode="decimal" placeholder="请输入数量"></td><td><input class="form-remark" data-line-remark="${index}" value="${esc(state.formRows[index]?.remark || '')}" placeholder="请输入备注"></td></tr>`;
    return `<tr><td><input type="checkbox" data-line-check="${index}"></td><td>${index + 1}</td><td><span class="official-image-placeholder">⌁</span></td><td>${select}</td><td data-line-category="${index}">${esc(item?.category || '')}</td><td data-line-unit="${index}">${esc(item?.unit || '')}</td><td>${money(item?.market)}</td><td>${money(item?.recent)}</td><td><input class="form-agreement-price" data-line-price="${index}" value="${esc(state.formRows[index]?.price || '')}" type="number" min="0" step="0.01" placeholder="请输入协议价"></td></tr>`;
  }
  function batchModalHTML() {
    return `<div class="official-batch-modal" id="officialBatchModal" aria-hidden="true"><section class="official-batch-dialog" role="dialog" aria-modal="true" aria-labelledby="officialBatchTitle"><header class="official-batch-header"><h2 id="officialBatchTitle">批量添加商品</h2><button type="button" class="official-batch-close" data-action="close-batch" aria-label="关闭">×</button></header><div class="official-batch-body"><div class="official-batch-filters"><label class="official-batch-filter-item"><span>商品分类</span><select id="officialBatchCategory" data-batch-filter="category" data-placeholder-select class="is-placeholder"><option value="" selected>请选择商品分类</option>${productCategories.map((category) => `<option value="${esc(category)}">${esc(category)}</option>`).join('')}</select></label><label class="official-batch-filter-item"><span>默认供应商</span><select id="officialBatchSupplier" data-batch-filter="supplier" data-placeholder-select class="is-placeholder"><option value="" selected>请选择供应商</option>${suppliers.map((supplier) => `<option value="${esc(supplier)}">${esc(supplier)}</option>`).join('')}</select></label><div class="official-batch-filter-actions"><button type="button" class="btn btn-primary btn-sm" data-action="batch-query">查询</button><button type="button" class="btn btn-sm" data-action="batch-reset">重置</button></div></div><div class="official-batch-table-wrap"><table class="official-batch-table"><colgroup><col><col><col><col><col><col></colgroup><thead><tr><th><input type="checkbox" data-batch-check-all aria-label="全选商品"></th><th>图片</th><th>商品名称（计量单位/品牌/规格）</th><th>计量单位</th><th>需求量</th><th>备注</th></tr></thead><tbody id="officialBatchBody"></tbody></table></div><div class="official-batch-pagination official-pagination" id="officialBatchPagination"></div></div><footer class="official-batch-footer"><button type="button" class="btn btn-sm" data-action="close-batch">关闭</button><button type="button" class="btn btn-primary btn-sm" data-action="confirm-batch">添加</button></footer></section></div>`;
  }
  function renderForm() {
    const inquiry = state.kind === 'inquiry';
    const rows = Array.from({ length: Math.max(10, state.formRows.length) }, (_, index) => inputProductRow(index, inquiry ? 'inquiry' : 'agreement')).join('');
    destroyDatePickers();
    const inquiryTarget = state.formMeta.target || '';
    const inquiryTitle = state.formMode === 'edit' ? '编辑询价单' : '添加询价单';
    const inquiryContent = `<div class="official-form-grid inquiry-form-grid"><label><b>*</b>执行日期${dateRange('officialFormExecution', state.formMeta.executionFrom, state.formMeta.executionTo)}</label><label><b>*</b>询价截止日期<input id="officialFormDeadline" type="text" value="${esc(state.formMeta.deadline)}" readonly placeholder="请选择日期"></label><label><b>*</b>询价对象<select id="officialFormTarget" data-placeholder-select class="${inquiryTarget ? '' : 'is-placeholder'}"><option value="" disabled ${inquiryTarget ? '' : 'selected'} hidden>请选择询价单位</option>${suppliers.map((supplier) => `<option value="${esc(supplier)}" ${supplier === inquiryTarget ? 'selected' : ''}>${esc(supplier)}</option>`).join('')}</select></label></div><button type="button" class="btn btn-primary btn-sm form-bulk" data-action="bulk">批量添加商品</button><div class="official-form-table-wrap"><table class="official-form-table"><thead><tr><th>序号</th><th>图片</th><th>商品名称（计量单位/品牌/规格）</th><th>计量单位</th><th>默认供应商/采购员</th><th>需求量</th><th>备注</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    const agreementContent = `<div class="official-form-section"><h2>基础信息</h2><div class="official-form-grid agreement-form-grid"><label><b>*</b>供应商名称<select id="officialFormSupplier">${selectOptions(suppliers, false)}</select></label><label><b>*</b>执行周期${dateRange('officialFormExecution', today, '')}</label><label>备注<textarea id="officialFormRemark" maxlength="20" placeholder="请输入备注"></textarea><small>0/20</small></label></div><h2>联系信息</h2><div class="official-form-grid contact-form-grid"><label>联系人<input id="officialFormContact" placeholder="请输入联系人"></label><label>联系电话<input id="officialFormPhone" placeholder="请输入联系电话"></label></div></div><div class="official-form-tools"><button type="button" class="btn btn-primary btn-sm" data-action="bulk">批量添加商品</button><button type="button" class="btn btn-primary btn-sm" data-action="bulk-price">批量定价</button></div><div class="official-form-table-wrap"><table class="official-form-table agreement-lines"><thead><tr><th><input type="checkbox" aria-label="全选商品"></th><th>序号</th><th>图片</th><th>商品名称（计量单位/品牌/规格）</th><th>商品分类</th><th>计量单位</th><th>市场价</th><th>近一次采购价</th><th><b>*</b>协议价</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    content.innerHTML = `<section class="page-card official-form-card"><div class="official-form-heading"><button type="button" class="back-link official-back" data-action="back"><svg class="official-back-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"></path><path d="M19 12H9"></path></svg><span>返回</span></button><h1>${esc(inquiry ? inquiryTitle : state.editingId ? `编辑${config.title}` : '添加采购协议价')}</h1></div>${inquiry ? inquiryContent : agreementContent}<div class="official-form-footer"><button type="button" class="btn" data-action="back">返回</button><button type="button" class="btn btn-primary" data-action="save-form">${inquiry ? (state.formMode === 'edit' ? '保存' : '提交并发送') : '保存'}</button></div></section>${inquiry ? batchModalHTML() : ''}`;
    root.querySelector('#officialFormDeadline')?.setAttribute('data-date-picker', '');
    mountDatePickers();
    syncPlaceholderSelects();
  }
  function updateLine(index, code) {
    state.formRows[index].productCode = code;
    const item = products.find((product) => product.code === code);
    syncPlaceholderSelect(root.querySelector(`.form-product-select[data-line="${index}"]`));
    const unit = root.querySelector(`[data-line-unit="${index}"]`);
    if (unit) unit.textContent = item?.unit || '';
    const supplier = root.querySelector(`[data-line-supplier="${index}"]`);
    if (supplier) supplier.textContent = item ? '默认供应商 / 采购员' : '';
    const category = root.querySelector(`[data-line-category="${index}"]`);
    if (category) category.textContent = item?.category || '';
  }
  function getBatchProducts() {
    const category = root.querySelector('#officialBatchCategory')?.value || '';
    const supplier = root.querySelector('#officialBatchSupplier')?.value || '';
    const selectedInForm = new Set(state.formRows.filter((line) => line.productCode).map((line) => line.productCode));
    state.batch.filtered = products.filter((item) => !selectedInForm.has(item.code)
      && (!category || item.category === category)
      && (!supplier || productSupplier(item) === supplier));
    return state.batch.filtered;
  }
  function renderBatchProducts() {
    const body = root.querySelector('#officialBatchBody');
    const modal = root.querySelector('#officialBatchModal');
    if (!body || !modal) return;
    const filtered = getBatchProducts();
    const totalPages = Math.max(1, Math.ceil(filtered.length / state.batch.pageSize));
    state.batch.page = Math.min(totalPages, Math.max(1, state.batch.page));
    const rows = filtered.slice((state.batch.page - 1) * state.batch.pageSize, state.batch.page * state.batch.pageSize);
    body.innerHTML = rows.length ? rows.map((item) => {
      const draft = state.batch.drafts[item.code] || {};
      return `<tr><td><input type="checkbox" data-batch-product="${esc(item.code)}" aria-label="选择${esc(productLabel(item))}" ${state.batch.selectedCodes.has(item.code) ? 'checked' : ''}></td><td><span class="official-image-placeholder">⌁</span></td><td class="official-batch-product-name" title="${esc(productLabel(item))}">${esc(productLabel(item))}</td><td>${esc(item.unit)}</td><td><input type="text" inputmode="decimal" data-batch-quantity="${esc(item.code)}" value="${esc(draft.quantity || '')}" placeholder="请输入数量"></td><td><input type="text" data-batch-remark="${esc(item.code)}" value="${esc(draft.remark || '')}" placeholder="请输入备注"></td></tr>`;
    }).join('') : '<tr><td class="official-empty" colspan="6">暂无数据</td></tr>';
    const visibleCodes = rows.map((item) => item.code);
    const selectedVisibleCount = visibleCodes.filter((code) => state.batch.selectedCodes.has(code)).length;
    const checkAll = modal.querySelector('[data-batch-check-all]');
    if (checkAll) {
      checkAll.checked = visibleCodes.length > 0 && selectedVisibleCount === visibleCodes.length;
      checkAll.indeterminate = selectedVisibleCount > 0 && selectedVisibleCount < visibleCodes.length;
      checkAll.disabled = !visibleCodes.length;
    }
    state.batch.pagination?.update({ total: filtered.length, page: state.batch.page, pageSize: state.batch.pageSize });
  }
  function openBatchModal() {
    if (state.kind !== 'inquiry') return;
    const modal = root.querySelector('#officialBatchModal');
    if (!modal) return;
    state.batch.page = 1;
    state.batch.selectedCodes = new Set();
    state.batch.drafts = {};
    modal.classList.add('is-visible');
    modal.setAttribute('aria-hidden', 'false');
    state.batch.pagination?.destroy();
    state.batch.pagination = window.Pagination?.create({
      container: '#officialBatchPagination',
      total: products.length,
      page: 1,
      pageSize: state.batch.pageSize,
      pageSizeOptions: [20, 50, 100],
      maxVisiblePages: 5,
      onChange: ({ page, pageSize }) => {
        state.batch.page = page;
        state.batch.pageSize = pageSize;
        renderBatchProducts();
      }
    });
    syncPlaceholderSelects(modal);
    renderBatchProducts();
    modal.querySelector('.official-batch-close')?.focus();
  }
  function closeBatchModal() {
    const modal = root.querySelector('#officialBatchModal');
    if (!modal) return;
    modal.classList.remove('is-visible');
    modal.setAttribute('aria-hidden', 'true');
    state.batch.pagination?.destroy();
    state.batch.pagination = null;
  }
  function confirmBatchProducts() {
    const selected = products.filter((item) => state.batch.selectedCodes.has(item.code));
    if (!selected.length) { toast('请选择要添加的商品', 'error'); return; }
    selected.forEach((item) => {
      let index = state.formRows.findIndex((line) => !line.productCode);
      if (index < 0) { index = state.formRows.length; state.formRows.push({}); }
      const draft = state.batch.drafts[item.code] || {};
      state.formRows[index] = { ...state.formRows[index], productCode: item.code, quantity: draft.quantity || '0.00', remark: draft.remark || '' };
    });
    closeBatchModal();
    renderForm();
    toast(`已添加${selected.length}个商品`);
  }
  function inquiryPlanItems(row) {
    return row?.products?.length ? row.products : products.slice(0, row?.productCount || 0);
  }
  function renderInquiryPlan(row, editing = false) {
    if (!row) { state.view = 'list'; render(); return; }
    if (state.activeRowId !== row.id || state.planMode !== (editing ? 'edit' : 'confirm')) {
      state.activeRowId = row.id;
      state.planMode = editing ? 'edit' : 'confirm';
      state.planRows = inquiryPlanItems(row).map((item, index) => ({
        ...item,
        quantity: item.quantity || '0.00',
        supplier: item.supplier || suppliers[index % suppliers.length],
        price: item.price || item.recent || '',
        remark: item.remark || ''
      }));
    }
    const rows = state.planRows.map((item, index) => `<tr><td>${index + 1}</td><td><span class="official-image-placeholder">⌁</span></td><td class="official-interaction-product" title="${esc(productLabel(item))}">${esc(productLabel(item))}</td><td>${esc(item.unit)}</td><td>${esc(item.quantity || '0.00')}</td><td>${editing ? `<select data-plan-supplier="${index}">${suppliers.map((supplier) => `<option value="${esc(supplier)}" ${supplier === item.supplier ? 'selected' : ''}>${esc(supplier)}</option>`).join('')}</select>` : esc(item.supplier || '--')}</td><td>${editing ? `<input type="text" inputmode="decimal" data-plan-price="${index}" value="${esc(item.price || '')}" placeholder="请输入价格">` : money(item.price)}</td><td>${editing ? `<input type="text" data-plan-remark="${index}" value="${esc(item.remark || '')}" placeholder="请输入备注">` : esc(item.remark || '--')}</td></tr>`).join('');
    content.innerHTML = `<section class="page-card official-interaction-card"><div class="official-form-heading"><button type="button" class="back-link official-back" data-action="back"><svg class="official-back-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"></path><path d="M19 12H9"></path></svg><span>返回</span></button><h1>${editing ? '编辑询价单' : '确认方案'}</h1></div><div class="official-interaction-summary"><div><span>单号</span><strong>${esc(row.orderNo)}</strong></div><div><span>执行周期</span><strong>${esc(row.executionCycle)}</strong></div><div><span>询价截止日期</span><strong>${esc(row.deadline)}</strong></div><div><span>询价对象</span><strong title="${esc(row.targets)}">${esc(row.targets)}</strong></div></div><div class="official-interaction-table-wrap"><table class="official-interaction-table"><thead><tr><th>序号</th><th>图片</th><th>商品名称（计量单位/品牌/规格）</th><th>计量单位</th><th>需求量</th><th>方案供应商</th><th>采购价（元）</th><th>备注</th></tr></thead><tbody>${rows || '<tr><td class="official-empty" colspan="8">暂无商品明细</td></tr>'}</tbody></table></div><div class="official-interaction-footer"><button type="button" class="btn" data-action="back">返回</button><button type="button" class="btn btn-primary" data-action="save-plan">${editing ? '保存方案' : '确认方案'}</button></div></section>`;
  }
  function renderInquiryDetail(row) {
    if (!row) { state.view = 'list'; render(); return; }
    const rows = inquiryPlanItems(row).map((item, index) => `<tr><td>${index + 1}</td><td><span class="official-image-placeholder">⌁</span></td><td class="official-interaction-product" title="${esc(productLabel(item))}">${esc(productLabel(item))}</td><td>${esc(item.unit)}</td><td>${esc(item.quantity || '0.00')}</td><td>${esc(item.remark || '--')}</td></tr>`).join('');
    content.innerHTML = `<section class="page-card official-interaction-card"><div class="official-form-heading"><button type="button" class="back-link official-back" data-action="back"><svg class="official-back-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"></path><path d="M19 12H9"></path></svg><span>返回</span></button><h1>询价单详情</h1></div><div class="official-interaction-summary"><div><span>单号</span><strong>${esc(row.orderNo)}</strong></div><div><span>执行周期</span><strong>${esc(row.executionCycle)}</strong></div><div><span>询价截止日期</span><strong>${esc(row.deadline)}</strong></div><div><span>询价对象</span><strong title="${esc(row.targets)}">${esc(row.targets)}</strong></div></div><div class="official-interaction-table-wrap"><table class="official-interaction-table"><thead><tr><th>序号</th><th>图片</th><th>商品名称（计量单位/品牌/规格）</th><th>计量单位</th><th>需求量</th><th>备注</th></tr></thead><tbody>${rows || '<tr><td class="official-empty" colspan="6">暂无商品明细</td></tr>'}</tbody></table></div><div class="official-interaction-footer"><button type="button" class="btn btn-primary" data-action="back">返回</button></div></section>`;
  }
  function openCloseDialog(row) {
    state.closeId = row?.id || null;
    if (!row) return;
    content.insertAdjacentHTML('beforeend', `<div class="official-confirm-modal" id="officialCloseModal"><section class="official-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="officialCloseTitle"><header><h2 id="officialCloseTitle">关闭询价单</h2><button type="button" data-action="cancel-close" aria-label="关闭">×</button></header><div class="official-confirm-body">确定要关闭询价单“${esc(row.orderNo)}”吗？关闭后将不能继续确认方案。</div><footer><button type="button" class="btn" data-action="cancel-close">取消</button><button type="button" class="btn btn-primary" data-action="confirm-close">确定</button></footer></section></div>`);
    content.querySelector('#officialCloseModal [data-action="cancel-close"]')?.focus();
  }
  function closeCloseDialog() {
    state.closeId = null;
    content.querySelector('#officialCloseModal')?.remove();
  }
  function saveInquiryPlan() {
    const row = state.rows.find((item) => item.id === state.activeRowId);
    if (!row) return;
    row.products = state.planRows.map((item) => ({ ...item, price: item.price || item.recent || '' }));
    row.productCount = row.products.length;
    row.quoteCount = Math.max(Number(row.quoteCount) || 0, row.products.length ? 1 : 0);
    row.status = '已完成';
    state.view = 'list'; state.activeRowId = null; state.planRows = [];
    toast('方案已保存');
    render();
  }
  function saveForm() {
    if (state.kind === 'inquiry') {
      const target = root.querySelector('#officialFormTarget')?.value || '';
      const deadline = root.querySelector('#officialFormDeadline')?.value || '';
      const executionFrom = root.querySelector('#officialFormExecutionFrom')?.value || today;
      const executionTo = root.querySelector('#officialFormExecutionTo')?.value || deadline;
      const selected = state.formRows.filter((line) => line.productCode);
      if (!target || !deadline || !selected.length) { toast('请完善执行日期、截止日期、询价对象和商品明细', 'error'); return; }
      const inquiryProducts = selected.map((line) => ({ ...products.find((item) => item.code === line.productCode), quantity: line.quantity || '0.00', remark: line.remark || '' })).filter((item) => item.code);
      if (state.formMode === 'edit' && state.editingId) {
        const row = state.rows.find((item) => item.id === state.editingId);
        if (row) Object.assign(row, { executionCycle: `${executionFrom} ~ ${executionTo}`, deadline, productCount: inquiryProducts.length, targets: target, products: inquiryProducts });
      } else {
        const number = `XJD${today.replaceAll('-', '')}030000${String(state.rows.length + 1).padStart(2, '0')}`;
        state.rows.unshift({ id: number, orderNo: number, executionCycle: `${executionFrom} ~ ${executionTo}`, deadline, productCount: inquiryProducts.length, quoteCount: 0, targets: target, status: '待确认', products: inquiryProducts });
      }
    } else {
      const supplier = root.querySelector('#officialFormSupplier')?.value || '';
      const from = root.querySelector('#officialFormExecutionFrom')?.value || today;
      const to = root.querySelector('#officialFormExecutionTo')?.value || '';
      const selected = state.formRows.filter((line) => line.productCode && line.price).map((line) => ({ ...line, product: products.find((item) => item.code === line.productCode) })).filter((line) => line.product);
      if (!supplier || !to || !selected.length) { toast('请完善供应商、执行周期和协议价明细', 'error'); return; }
      const number = `CGXY${today.replaceAll('-', '')}0300${String(state.rows.length + 1).padStart(5, '0')}`;
      state.rows.unshift({ id: number, agreementNo: number, productCount: selected.length, supplier, executionPeriod: `${from}-${to}`, status: '待审核', remark: root.querySelector('#officialFormRemark')?.value || '', addedBy: '管理员', products: selected.map((line) => ({ ...line.product, price: line.price })) });
    }
    state.view = 'list'; state.editingId = null; state.activeRowId = null; state.formMode = 'add'; state.formRows = []; state.formMeta = { executionFrom: '', executionTo: '', deadline: '', target: '' }; toast('保存成功'); render();
  }
  function resetFilters() {
    root.querySelectorAll('.official-price-card input, .official-price-card select').forEach((el) => { el.value = ''; });
    root.querySelectorAll('.official-price-card .date-range-picker').forEach((container) => {
      const defaults = container.id === 'officialAgreementRange' ? ['2026-07-20', '2026-08-20'] : ['', ''];
      state.datePickerMap[container.id]?.setValue(defaults[0], defaults[1], false);
    });
    applyFilters();
  }
  function handleAction(event) {
    const action = event.target.closest('[data-action]')?.dataset.action;
    const rowAction = event.target.closest('[data-row-action]');
    if (action === 'add') { if (state.kind === 'inquiry') { openInquiryForm(); return; } state.view = 'form'; state.editingId = null; state.formMode = 'add'; state.formRows = Array.from({ length: 10 }, () => ({ quantity: '0.00' })); render(); return; }
    if (action === 'agreement-tab' && state.kind === 'agreement') { state.tab = 'agreement'; state.view = 'list'; render(); return; }
    if (action === 'product-tab' && state.kind === 'agreement') { state.tab = 'products'; state.view = 'list'; render(); return; }
    if (action === 'query') { applyFilters(); return; }
    if (action === 'reset') { resetFilters(); return; }
    if (action === 'back') { closeBatchModal(); closeCloseDialog(); state.view = 'list'; state.formRows = []; state.editingId = null; state.activeRowId = null; state.planRows = []; state.formMode = 'add'; render(); return; }
    if (action === 'bulk' && state.kind === 'inquiry') { openBatchModal(); return; }
    if (action === 'bulk' || action === 'bulk-price') { toast(action === 'bulk' ? '请选择商品后添加到明细' : '请输入统一协议价后批量定价'); return; }
    if (action === 'close-batch') { closeBatchModal(); return; }
    if (action === 'batch-query') { state.batch.page = 1; renderBatchProducts(); return; }
    if (action === 'batch-reset') {
      const category = root.querySelector('#officialBatchCategory');
      const supplier = root.querySelector('#officialBatchSupplier');
      if (category) category.value = '';
      if (supplier) supplier.value = '';
      syncPlaceholderSelects(root.querySelector('#officialBatchModal'));
      state.batch.page = 1;
      renderBatchProducts();
      return;
    }
    if (action === 'confirm-batch') { confirmBatchProducts(); return; }
    if (action === 'cancel-close') { closeCloseDialog(); return; }
    if (action === 'confirm-close') {
      const row = state.rows.find((item) => item.id === state.closeId);
      if (row) row.status = '已关闭';
      closeCloseDialog();
      toast('已关闭');
      render();
      return;
    }
    if (action === 'save-plan') { saveInquiryPlan(); return; }
    if (event.target.id === 'officialBatchModal') { closeBatchModal(); return; }
    if (event.target.id === 'officialCloseModal') { closeCloseDialog(); return; }
    if (action === 'save-form') { saveForm(); return; }
    if (!rowAction || rowAction.disabled) return;
    const row = state.rows.find((item) => item.id === rowAction.dataset.id);
    if (!row) return;
    const rowType = rowAction.dataset.rowAction;
    if (rowType === 'view') {
      if (state.kind === 'inquiry') { state.activeRowId = row.id; state.view = 'detail'; renderInquiryDetail(row); }
      else toast(`协议价：${row.orderNo || row.agreementNo}`);
      return;
    }
    if (state.kind === 'inquiry' && rowType === 'confirm') { state.activeRowId = null; state.planRows = []; state.view = 'plan'; renderInquiryPlan(row); return; }
    if (state.kind === 'inquiry' && rowType === 'edit-plan') { state.activeRowId = null; state.planRows = []; state.view = 'plan'; renderInquiryPlan(row, true); return; }
    if (state.kind === 'inquiry' && rowType === 'edit') { openInquiryForm(row, 'edit'); return; }
    if (state.kind === 'inquiry' && rowType === 'copy') { openInquiryForm(row, 'copy'); return; }
    if (state.kind === 'inquiry' && rowType === 'close') { openCloseDialog(row); return; }
    if (rowType === 'copy') {
      const copied = { ...row, id: `${row.id}-COPY-${Date.now().toString().slice(-4)}`, orderNo: row.orderNo ? `${row.orderNo}-复制` : row.orderNo, agreementNo: row.agreementNo ? `${row.agreementNo}-复制` : row.agreementNo, status: state.kind === 'inquiry' ? '已完成' : '待审核', products: [...(row.products || [])] };
      state.rows.unshift(copied); toast('复制成功'); render(); return;
    }
    if (rowType === 'close') { openCloseDialog(row); return; }
    if (rowType === 'confirm') { row.status = '已完成'; toast('方案已确认'); render(); }
  }
  root.addEventListener('click', handleAction);
  root.addEventListener('change', (event) => {
    if (event.target.matches('[data-placeholder-select]')) syncPlaceholderSelect(event.target);
    const select = event.target.closest('.form-product-select');
    if (select) { updateLine(Number(select.dataset.line), select.value); return; }
    const batchProduct = event.target.closest('[data-batch-product]');
    if (batchProduct) {
      if (batchProduct.checked) state.batch.selectedCodes.add(batchProduct.dataset.batchProduct);
      else state.batch.selectedCodes.delete(batchProduct.dataset.batchProduct);
      renderBatchProducts();
      return;
    }
    if (event.target.matches('[data-batch-check-all]')) {
      const filtered = getBatchProducts();
      const rows = filtered.slice((state.batch.page - 1) * state.batch.pageSize, state.batch.page * state.batch.pageSize);
      rows.forEach((item) => event.target.checked ? state.batch.selectedCodes.add(item.code) : state.batch.selectedCodes.delete(item.code));
      renderBatchProducts();
    }
  });
  root.addEventListener('input', (event) => {
    const index = event.target.dataset.lineQuantity ?? event.target.dataset.lineRemark ?? event.target.dataset.linePrice;
    if (index != null && state.formRows[index]) {
      if (event.target.dataset.lineQuantity) state.formRows[index].quantity = event.target.value;
      if (event.target.dataset.lineRemark) state.formRows[index].remark = event.target.value;
      if (event.target.dataset.linePrice) state.formRows[index].price = event.target.value;
    }
    const quantityCode = event.target.dataset.batchQuantity;
    const remarkCode = event.target.dataset.batchRemark;
    if (quantityCode || remarkCode) {
      const code = quantityCode || remarkCode;
      state.batch.drafts[code] = state.batch.drafts[code] || {};
      if (quantityCode) state.batch.drafts[code].quantity = event.target.value;
      if (remarkCode) state.batch.drafts[code].remark = event.target.value;
    }
    const planPrice = event.target.dataset.planPrice;
    const planRemark = event.target.dataset.planRemark;
    if (planPrice != null && state.planRows[planPrice]) state.planRows[planPrice].price = event.target.value;
    if (planRemark != null && state.planRows[planRemark]) state.planRows[planRemark].remark = event.target.value;
  });
  root.addEventListener('change', (event) => {
    const planSupplier = event.target.dataset.planSupplier;
    if (planSupplier != null && state.planRows[planSupplier]) state.planRows[planSupplier].supplier = event.target.value;
  });
  root.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (root.querySelector('#officialBatchModal.is-visible')) closeBatchModal();
    else if (root.querySelector('#officialCloseModal')) closeCloseDialog();
  });
  function render() {
    if (state.view === 'form') return renderForm();
    if (state.view === 'detail') return renderInquiryDetail(state.rows.find((item) => item.id === state.activeRowId));
    if (state.view === 'plan') return renderInquiryPlan(state.rows.find((item) => item.id === state.activeRowId), state.planMode === 'edit');
    renderList();
  }
  render();
})();
