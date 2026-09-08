(function () {
  const pageKey = document.body.dataset.pricePage || 'inquiry';
  const today = '2026-09-07';
  const esc = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const suppliers = ['盒马鲜生', '每日优选', '鲜菜源蔬菜批发中心'];
  const customers = ['静安第一中学', '第一实验学校', '阳光幼儿园', '育才中学', '机关第二食堂'];
  const categories = ['果蔬-果蔬二级-果蔬三级', '肉（豆）制品-肉（豆）制品二级-肉（豆）制品三级', '蛋奶类-蛋奶类二级-蛋奶类三级', '主食（米面粉点心类）-粮食类'];
  const products = [
    ['SP0300101', '豆芽', '斤', '--', '--', categories[0], 6, 5.5],
    ['SP0300102', '豆腐', '斤', '--', '--', categories[1], 5, 4.8],
    ['SP0300103', '干豆皮', '斤', '--', '--', categories[1], 13, 12],
    ['SP0300040', '黑面', 'L', '--', '--', categories[0], 5, 5],
    ['SP0300104', '土豆', '斤', '田园直供', '散装', categories[0], 3.2, 3],
    ['SP0300105', '洋葱', '斤', '--', '--', categories[0], 4.5, 4.2],
    ['SP0300106', '黄瓜', '斤', '--', '--', categories[0], 5, 4.8],
    ['SP0300107', '香菜', '斤', '--', '--', categories[0], 7, 6.8],
    ['SP0300108', '五常大米', 'KG', '五常', '25kg/袋', categories[3], 19, 18.8],
    ['SP0300109', '五香粉', '袋', '--', '50g/袋', categories[3], 8, 7.5],
    ['SP0300110', '青鱼', '斤', '--', '--', categories[0], 18, 17.5],
    ['SP0300111', '黑猪肉', '斤', '黑土猪', '500g/份', categories[1], 28, 26],
    ['SP0300112', '黑虎虾', '斤', '--', '500g/盒', categories[1], 45, 43],
    ['SP0300013', '鸡腿肉', '斤', '双汇', '500g/份', categories[1], 23, 22],
    ['SP0300014', '苹果', '斤', '--', '--', categories[0], 23, 21.8],
    ['SP0300015', '香蕉', '斤', '--', '--', categories[0], 30, 28],
    ['SP0300017', '金龙鱼豆油', '斤', '--', '--', '食油-食油二级', 50, 48],
    ['SP0300018', '鸡蛋', '斤', '农家', '500g/份', categories[2], 22, 21],
    ['SP0300019', '大白菜', '斤', '--', '散装', categories[0], 2.2, 2],
    ['SP0300020', '西红柿', 'KG', '--', '散装', categories[0], 5.6, 5.2],
    ['SP0300023', '大饼', '斤', '--', '--', categories[3], 1, .8],
    ['SP0300025', '大米', 'KG', '--', '--', categories[3], 19, 18.8],
    ['SP0300026', '面', '瓶', '--', '--', categories[3], 1, .8],
    ['SP0300030', '金龙鱼5L桶装油', '瓶', '金龙鱼', '5L/瓶', '食油-食油二级', 55, 53],
    ['SP0300031', '鲫鱼', '斤', '--', '--', '水产品-水产品二级', 20, 19],
    ['SP0300034', '黑大米', '斤', '--', '--', categories[3], 10, 9.5],
    ['SP0300036', '大玉米棒子', 'KG', '--', '--', categories[3], 5, 4.8],
    ['SP0300037', '牛奶', '瓶', '三元', '10瓶1箱', categories[2], 5, 4.8],
    ['SP0300038', '牛奶', '瓶', '--', '--', categories[2], 5, 4.8],
    ['SP0300039', '全麦面粉', '斤', '--', '--', categories[3], 1, .8],
    ['SP0300050', '土豆块', '斤', '--', '散装', categories[0], 5.2, 5],
    ['SP0300051', '白菜段', '斤', '--', '散装', categories[0], 3.2, 3]
  ].map(([code, name, unit, brand, spec, category, market, recent], index) => ({
    code, name, unit, brand, spec, category, market, recent,
    purchaseType: ['供应商送货', '企业自加工', '市场自采'][index % 3]
  }));

  const productLabel = (product) => `${product.name}(${product.unit}/${product.brand || '--'}/${product.spec || '--'})`;
  const productObject = (code) => products.find((product) => product.code === code) || null;
  const money = (value) => value === '' || value == null ? '--' : Number(value).toFixed(2);
  const dateRange = (from = '', to = '') => `<div class="pb-date-range"><input type="text" data-date-picker data-date-from value="${esc(from)}" placeholder="请选择日期" aria-label="请选择日期"><span>-</span><input type="text" data-date-picker data-date-to value="${esc(to)}" placeholder="请选择日期" aria-label="请选择日期"></div>`;
  const inquiryRows = [
    ['XJD202609010300001', '2026-09-25 ~ 2026-09-25', '2026-09-25', 2, 0, '盒马鲜生、每日优选、鲜菜源蔬菜批发中心', '询价中'],
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
  ].map(([id, cycle, date, productCount, quoteCount, targets, status]) => ({ id, cycle, date, productCount, quoteCount, targets, status, products: products.slice(0, productCount) }));

  const marketRows = [
    { id: 'XJD202608190300001', date: '2026-08-19', cycle: '-', no: 'XJD202608190300001', name: '123123', addedBy: '杨', status: '询价中' },
    { id: 'XJD202608190300002', date: '2026-08-19', cycle: '-', no: 'XJD202608190300002', name: '123123', addedBy: '杨', status: '询价中' },
    { id: 'XJD202608190300003', date: '2026-08-19', cycle: '-', no: 'XJD202608190300003', name: '123123', addedBy: '杨', status: '询价中' }
  ];

  const groupRows = [
    { id: 'GROUP-01', name: '王子', phone: '15636985642', status: '启用' },
    { id: 'GROUP-02', name: '李林', phone: '15269835642', status: '启用' }
  ];
  const placeRows = [
    { id: 'PLACE-01', name: '西市', address: '望京科技园西门', status: '启用' },
    { id: 'PLACE-02', name: '东市', address: '望京科技园东门', status: '启用' }
  ];
  const salesProductRows = [
    { id: 'SALE-P-01', product: products[0], category: '果蔬-果蔬二级-果蔬三级', unit: '斤', price: '9.00', customer: '静安第一中学', no: 'XSXY202605280300001', cycle: '2027-05-01至2027-05-30', status: '启用', addedBy: '杨' },
    { id: 'SALE-P-02', product: products[2], category: '肉（豆）制品-肉（豆）制品二级-肉（豆）制品三级', unit: '斤', price: '12.00', customer: '静安第一中学', no: 'XSXY202605280300001', cycle: '2027-05-01至2027-05-30', status: '启用', addedBy: '杨' }
  ];

  const configs = {
    inquiry: { title: '询价报价', type: 'inquiry' },
    purchaseAgreement: { title: '采购协议价', type: 'agreement', mode: 'purchase' },
    marketInquiry: { title: '市场询价', type: 'market' },
    salesAgreement: { title: '销售协议价', type: 'agreement', mode: 'sales' }
  };
  const config = configs[pageKey] || configs.inquiry;
  const state = {
    view: 'list', tab: 0, page: 1, pageSize: 20, filteredRows: [],
    rows: config.type === 'inquiry' ? inquiryRows.map((row) => ({ ...row }))
      : config.type === 'market' ? marketRows.map((row) => ({ ...row })) : [],
    products: config.type === 'agreement' && config.mode === 'sales' ? salesProductRows.map((row) => ({ ...row })) : [],
    groups: groupRows.map((row) => ({ ...row })), places: placeRows.map((row) => ({ ...row })),
    form: null, formMode: 'add', editingId: null, detailRow: null, detailTab: 0,
    modal: null, batchSelected: new Set(), batchDrafts: new Map(), categorySelected: new Set(), batchPage: 1, entitySelectOpen: false, toastTimer: null,
    filters: {}, batchFilters: {}, datePickers: []
  };

  const root = window.AppShell.mount({ title: config.title, content: '<div class="price-business-root" id="priceBusinessRoot"></div>' });
  const host = root.querySelector('#priceBusinessRoot');

  function toast(message, type = '') {
    const element = root.querySelector('#priceBusinessToast');
    if (!element) return;
    clearTimeout(state.toastTimer);
    element.textContent = message;
    element.className = `pb-toast is-visible ${type}`;
    state.toastTimer = setTimeout(() => { element.className = 'pb-toast'; }, 2200);
  }

  function statusTag(status) {
    const success = ['询价中', '已完成', '启用', '已生效'].includes(status);
    const warning = ['待审核', '待生效'].includes(status);
    return `<span class="pb-status ${success ? 'success' : warning ? 'warning' : 'neutral'}">${esc(status)}</span>`;
  }

  function field(label, control, cls = '') {
    return `<div class="operations-field ${cls}"><label class="filter-label">${esc(label)}</label>${control}</div>`;
  }

  function inputField(label, name, placeholder, cls = '') {
    return field(label, `<input class="filter-input" data-filter="${esc(name)}" placeholder="${esc(placeholder)}" aria-label="${esc(label)}">`, cls);
  }

  function selectField(label, name, values, selected = '', first = '全部', cls = '') {
    const placeholder = first.startsWith('请选择');
    const firstOption = placeholder ? '' : `<option value="">${esc(first)}</option>`;
    const placeholderData = placeholder ? ` data-price-placeholder="${esc(first)}" data-price-empty="${selected ? 'false' : 'true'}"` : '';
    const valueOptions = values.map((value) => `<option value="${esc(value)}" ${value === selected ? 'selected' : ''}>${esc(value)}</option>`).join('');
    return field(label, `<select class="filter-select" data-filter="${esc(name)}" aria-label="${esc(label)}"${placeholderData}>${firstOption}${valueOptions}</select>`, cls);
  }

  function dateField(label, name, from, to, cls = '') {
    const displayId = `${name}Display`;
    return `<div class="operations-field ${cls}"><label class="filter-label" for="${displayId}">${esc(label)}</label><div data-date-field="${esc(name)}" class="date-range-picker operations-date-range"><input class="filter-input date-range-display" id="${displayId}" type="text" readonly placeholder="请选择日期范围" aria-label="${esc(label)}"><input type="hidden" data-date-start data-date-from value="${esc(from)}"><input type="hidden" data-date-end data-date-to value="${esc(to)}"><span class="date-range-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></span></div></div>`;
  }

  function queryFilter(fields) {
    return `<section class="operations-filter pb-filter"><div class="operations-filter-main"><div class="operations-filter-grid">${fields}</div><div class="operations-filter-actions"><button type="button" class="btn btn-primary btn-sm" data-biz-action="query">查询</button><button type="button" class="btn btn-sm" data-biz-action="reset">重置</button></div></div></section>`;
  }

  function readFilters() {
    const values = { ...state.filters };
    host.querySelectorAll('[data-filter]').forEach((element) => { values[element.dataset.filter] = element.value.trim(); });
    host.querySelectorAll('[data-date-field]').forEach((element) => {
      values[`${element.dataset.dateField}From`] = element.querySelector('[data-date-from], [data-date-start]')?.value || '';
      values[`${element.dataset.dateField}To`] = element.querySelector('[data-date-to], [data-date-end]')?.value || '';
    });
    state.filters = values;
  }

  function filterByDate(rowDate, prefix) {
    const from = state.filters[`${prefix}From`] || '';
    const to = state.filters[`${prefix}To`] || '';
    const date = String(rowDate || '').slice(0, 10);
    return (!from || date >= from) && (!to || date <= to);
  }

  function destroyDatePickers() {
    state.datePickers.forEach((picker) => picker?.destroy?.());
    state.datePickers = [];
  }

  function bindDatePickers() {
    if (window.DateRangePicker?.create) {
      host.querySelectorAll('.pb-filter .date-range-picker').forEach((container) => {
        const picker = window.DateRangePicker.create({ container });
        if (picker) state.datePickers.push(picker);
      });
    }
    const selector = '[data-date-picker], [data-form-field="from"], [data-form-field="to"], [data-form-field="deadline"], [data-form-field="date"]';
    if (window.DatePicker?.create) {
      host.querySelectorAll(selector).forEach((input) => {
        const picker = window.DatePicker.create({ input });
        if (picker) state.datePickers.push(picker);
      });
    }
    host.querySelectorAll('.pb-date-range').forEach((container) => {
      container.addEventListener('click', (event) => {
        if (event.target.closest('input')) return;
        container.querySelector('[data-date-picker]')?.click();
      });
    });
  }

  function pagination(total, dataAttr = 'page') {
    const pages = Math.max(1, Math.ceil(total / state.pageSize));
    state.page = Math.min(Math.max(1, state.page), pages);
    const buttons = Array.from({ length: pages }, (_, index) => index + 1).slice(0, 5).map((page) => `<button type="button" class="pb-page-button ${page === state.page ? 'active' : ''}" data-${dataAttr}="${page}">${page}</button>`).join('');
    return `<div class="pb-pagination"><span class="pb-total">共 ${total} 条数据</span><select class="pb-page-size" data-page-size aria-label="每页条数"><option value="20" ${state.pageSize === 20 ? 'selected' : ''}>20 条/页</option><option value="50" ${state.pageSize === 50 ? 'selected' : ''}>50 条/页</option><option value="100" ${state.pageSize === 100 ? 'selected' : ''}>100 条/页</option></select><div class="pb-page-buttons"><button type="button" class="pb-page-button" data-${dataAttr}="${Math.max(1, state.page - 1)}" ${state.page === 1 ? 'disabled' : ''}>‹</button>${buttons}<button type="button" class="pb-page-button" data-${dataAttr}="${Math.min(pages, state.page + 1)}" ${state.page === pages ? 'disabled' : ''}>›</button></div><label class="pb-page-jump">跳至 <input class="pb-jump-input" data-page-jump value="${state.page}" aria-label="跳转页码"> / ${pages} 页</label></div>`;
  }

  function emptyRow(colspan) { return `<tr><td class="pb-empty" colspan="${colspan}">暂无数据</td></tr>`; }
  function action(label, name, id, disabled = false, danger = false) { return `<button type="button" class="pb-action ${danger ? 'danger' : ''}" data-biz-action="${esc(name)}" data-id="${esc(id || '')}" ${disabled ? 'disabled' : ''}>${esc(label)}</button>`; }
  function actionGroup(actions) { return `<div class="pb-actions-cell">${actions.join('<span class="pb-action-divider"></span>')}</div>`; }

  function inquiryFilter() {
    const f = state.filters;
    return queryFilter([dateField('执行日期', 'inquiryDate', f.inquiryDateFrom || '', f.inquiryDateTo || ''), selectField('供应商名称', 'supplier', suppliers, f.supplier), selectField('单据状态', 'status', ['询价中', '已完成', '已关闭'], f.status), inputField('商品名称', 'product', '请输入商品名称'), inputField('单号', 'order', '请输入单号')].join(''));
  }

  function agreementFilter(tab) {
    const f = state.filters;
    if (tab === 1) {
      const isSales = config.mode === 'sales';
      const fields = isSales
        ? [selectField('客户类型', 'customerType', ['默认客户类型（全部商品）', '学校', '幼儿园', '机关单位'], f.customerType), selectField('客户名称', 'customer', customers, f.customer), selectField('状态', 'status', ['启用', '禁用'], f.status), selectField('商品分类', 'category', categories, f.category, '请选择商品分类'), inputField('商品名称', 'product', '请输入商品名称/编码')]
        : [selectField('供应商名称', 'supplier', suppliers, f.supplier), selectField('状态', 'status', ['启用', '禁用'], f.status), inputField('商品名称', 'product', '请输入商品名称/编码')];
      return queryFilter(fields.join(''));
    }
    if (config.mode === 'sales') {
      return queryFilter([dateField('添加日期', 'agreementDate', f.agreementDateFrom || '2026-08-08', f.agreementDateTo || '2026-09-08'), selectField('客户类型', 'customerType', ['默认客户类型（全部商品）', '学校', '幼儿园', '机关单位'], f.customerType), selectField('客户名称', 'customer', customers, f.customer), selectField('状态', 'status', ['启用', '禁用', '待审核'], f.status), inputField('商品名称', 'product', '请输入商品名称/编码')].join(''));
    }
    return queryFilter([dateField('添加日期', 'agreementDate', f.agreementDateFrom || '2026-08-07', f.agreementDateTo || today), selectField('供应商名称', 'supplier', suppliers, f.supplier), selectField('状态', 'status', ['待审核', '启用', '已关闭'], f.status), inputField('商品名称', 'product', '请输入商品名称/编码')].join(''));
  }

  function marketFilter(tab) {
    const f = state.filters;
    if (tab === 1) return queryFilter(inputField('询价小组成员', 'group', '搜索询价小组成员'));
    if (tab === 2) return queryFilter(inputField('询价地点', 'place', '搜索询价地点'));
    return queryFilter([dateField('执行日期', 'executionDate', f.executionDateFrom || '', f.executionDateTo || ''), dateField('询价日期', 'marketDate', f.marketDateFrom || '2026-08-08', f.marketDateTo || '2026-09-08'), selectField('单据状态', 'status', ['询价中', '已完成', '已关闭'], f.status), inputField('询价单号', 'order', '请输入询价单号'), selectField('添加人', 'addedBy', ['杨', '管理员'], f.addedBy)].join(''));
  }

  function renderAgreementListRows() {
    const rows = state.filteredRows;
    return rows.length ? rows.map((row, index) => `<tr><td>${index + 1}</td><td><button type="button" class="pb-link" data-biz-action="view" data-id="${esc(row.id)}">${esc(row.no)}</button></td><td>${row.productCount}</td><td>${esc(row.partner)}</td><td>${esc(row.cycle)}</td><td>${statusTag(row.status)}</td><td>${esc(row.remark || '')}</td><td>${esc(row.addedBy || '杨')}</td><td>${actionGroup([action('查看', 'view', row.id), action('编辑', 'edit', row.id), action('复制', 'copy', row.id), action('关闭', 'close', row.id, row.status === '已关闭', true)])}</td></tr>`).join('') : emptyRow(9);
  }

  function renderAgreementProductRows() {
    const rows = state.filteredRows;
    return rows.length ? rows.map((row, index) => `<tr><td>${index + 1}</td><td><button type="button" class="pb-link" data-biz-action="product-view" data-id="${esc(row.id)}">${esc(productLabel(row.product))}</button></td><td>${esc(row.category)}</td><td>${esc(row.unit)}</td><td></td><td>${esc(row.price)}</td><td>${esc(config.mode === 'sales' ? row.customer : (row.supplier || '盒马鲜生'))}</td><td>${esc(row.no)}</td><td>${esc(row.cycle)}</td><td>${statusTag(row.status)}</td><td>${esc(row.addedBy || '杨')}</td><td>${actionGroup([action('修改', 'product-edit', row.id), action('禁用', 'product-disable', row.id, row.status === '禁用', row.status !== '禁用')])}</td></tr>`).join('') : emptyRow(12);
  }

  function renderInquiryRows() {
    const rows = state.filteredRows;
    return rows.length ? rows.map((row, index) => `<tr><td>${index + 1}</td><td><button type="button" class="pb-link" data-biz-action="detail" data-id="${esc(row.id)}">${esc(row.id)}</button></td><td>${esc(row.cycle)}</td><td>${esc(row.date)}</td><td>${row.productCount}</td><td>${row.quoteCount}</td><td>${esc(row.targets)}</td><td>${statusTag(row.status)}</td><td>${actionGroup([action(row.status === '已完成' ? '修改方案' : '确认方案', 'detail', row.id, row.status === '已关闭'), action('编辑', 'inquiry-edit', row.id, row.status !== '询价中'), action('复制', 'inquiry-copy', row.id), action('关闭', 'inquiry-close', row.id, row.status === '已关闭', true)])}</td></tr>`).join('') : emptyRow(9);
  }

  function renderMarketRows() {
    if (state.tab === 1) return state.filteredRows.length ? state.filteredRows.map((row, index) => `<tr><td>${index + 1}</td><td>${esc(row.name)}</td><td>${esc(row.phone)}</td><td>${statusTag(row.status)}</td><td>${actionGroup([action('编辑', 'group-edit', row.id), action('禁用', 'group-disable', row.id, row.status === '禁用', row.status !== '禁用'), action('删除', 'group-delete', row.id, false, true)])}</td></tr>`).join('') : emptyRow(5);
    if (state.tab === 2) return state.filteredRows.length ? state.filteredRows.map((row, index) => `<tr><td>${index + 1}</td><td>${esc(row.name)}</td><td>${esc(row.address)}</td><td>${statusTag(row.status)}</td><td>${actionGroup([action('编辑', 'place-edit', row.id), action('禁用', 'place-disable', row.id, row.status === '禁用', row.status !== '禁用'), action('删除', 'place-delete', row.id, false, true)])}</td></tr>`).join('') : emptyRow(5);
    const rows = state.filteredRows;
    return rows.length ? rows.map((row, index) => `<tr><td>${index + 1}</td><td>${esc(row.date)}</td><td>${esc(row.cycle)}</td><td><button class="pb-link" type="button" data-biz-action="market-view" data-id="${esc(row.id)}">${esc(row.no)}</button></td><td>${esc(row.name)}</td><td>${esc(row.addedBy)}</td><td>${statusTag(row.status)}</td><td>${actionGroup([action('填写价格', 'market-fill', row.id), action('复制', 'market-copy', row.id), action('生效', 'market-activate', row.id), action('关闭', 'market-close', row.id), action('同步商品基础信息', 'market-sync', row.id, true)])}</td></tr>`).join('') : emptyRow(8);
  }

  function listTable() {
    if (config.type === 'inquiry') return `<div class="pb-table-wrap"><table class="pb-table pb-inquiry-list"><thead><tr><th>序号</th><th>单号</th><th>执行周期</th><th>截止时间</th><th>询价商品数</th><th>报价份数</th><th>询价对象</th><th>状态</th><th>操作</th></tr></thead><tbody>${renderInquiryRows()}</tbody></table></div>`;
    if (config.type === 'agreement') {
      const productTab = state.tab === 1;
      const head = productTab ? '<tr><th>序号</th><th>商品名称（计量单位/品牌/规格）</th><th>商品分类</th><th>计量单位</th><th>计算公式</th><th>协议价</th><th>供应商名称</th><th>关联单号</th><th>执行周期</th><th>状态</th><th>添加人</th><th>操作</th></tr>' : '<tr><th>序号</th><th>单号</th><th>商品种数</th><th>'+ (config.mode === 'sales' ? '客户名称' : '供应商名称') +'</th><th>执行周期</th><th>状态</th><th>备注</th><th>添加人</th><th>操作</th></tr>';
      return `<div class="pb-table-wrap"><table class="pb-table ${productTab ? 'pb-product-list' : 'pb-agreement-list'}"><thead>${head}</thead><tbody>${productTab ? renderAgreementProductRows() : renderAgreementListRows()}</tbody></table></div>`;
    }
    if (config.type === 'market') {
      if (state.tab === 1) return `<div class="pb-table-wrap"><table class="pb-table pb-market-group-list"><thead><tr><th>序号</th><th>询价小组成员</th><th>联系电话</th><th>状态</th><th>操作</th></tr></thead><tbody>${renderMarketRows()}</tbody></table></div>`;
      if (state.tab === 2) return `<div class="pb-table-wrap"><table class="pb-table pb-market-place-list"><thead><tr><th>序号</th><th>询价地点</th><th>地址</th><th>状态</th><th>操作</th></tr></thead><tbody>${renderMarketRows()}</tbody></table></div>`;
      return `<div class="pb-table-wrap"><table class="pb-table pb-market-list"><thead><tr><th>序号</th><th>询价日期</th><th>执行周期</th><th>单据编号</th><th>询价单名称</th><th>添加人</th><th>状态</th><th>操作</th></tr></thead><tbody>${renderMarketRows()}</tbody></table></div>`;
    }
    return '';
  }

  function toolbar() {
    if (config.type === 'inquiry') return '<div class="pb-toolbar"><button type="button" class="btn btn-primary btn-sm" data-biz-action="add">添加询价单</button></div>';
    if (config.type === 'agreement') return state.tab === 0 ? `<div class="pb-toolbar"><button type="button" class="btn btn-primary btn-sm" data-biz-action="add">添加协议价</button></div>` : '';
    if (config.type === 'market') return `<div class="pb-toolbar"><button type="button" class="btn btn-primary btn-sm" data-biz-action="${state.tab === 0 ? 'market-add' : state.tab === 1 ? 'group-add' : 'place-add'}">${state.tab === 0 ? '添加市场询价单' : state.tab === 1 ? '添加询价小组成员' : '添加询价地点'}</button></div>`;
    return '';
  }

  function renderList() {
    if (config.type === 'inquiry') {
      if (!Object.keys(state.filters).length) state.filters = {};
      const f = state.filters;
      state.filteredRows = state.rows.filter((row) => filterByDate(row.date, 'inquiryDate') && (!f.supplier || row.targets.includes(f.supplier)) && (!f.status || row.status === f.status) && (!f.product || row.products.some((product) => productLabel(product).includes(f.product) || product.name.includes(f.product))) && (!f.order || row.id.includes(f.order)));
    } else if (config.type === 'agreement') {
      if (state.tab === 0) {
        const f = state.filters;
        state.filteredRows = state.rows.filter((row) => filterByDate(row.date, 'agreementDate') && (!f.supplier || row.partner === f.supplier) && (!f.customer || row.partner === f.customer) && (!f.status || row.status === f.status) && (!f.product || row.products?.some((product) => productLabel(product).includes(f.product))));
      } else {
        const f = state.filters;
        state.filteredRows = state.products.filter((row) => (!f.supplier || row.supplier === f.supplier) && (!f.customer || row.customer === f.customer) && (!f.status || row.status === f.status) && (!f.product || productLabel(row.product).includes(f.product)) && (!f.category || row.category === f.category));
      }
    } else if (config.type === 'market') {
      const f = state.filters;
      if (state.tab === 0) state.filteredRows = state.rows.filter((row) => filterByDate(row.date, 'executionDate') && filterByDate(row.date, 'marketDate') && (!f.status || row.status === f.status) && (!f.order || row.no.includes(f.order)) && (!f.addedBy || row.addedBy === f.addedBy));
      else if (state.tab === 1) state.filteredRows = state.groups.filter((row) => !f.group || `${row.name} ${row.phone}`.includes(f.group));
      else state.filteredRows = state.places.filter((row) => !f.place || `${row.name} ${row.address}`.includes(f.place));
    }
    state.page = Math.max(1, state.page);
    const tabMarkup = config.type === 'agreement' ? `<div class="pb-tabs" role="tablist"><button type="button" class="${state.tab === 0 ? 'active' : ''}" data-pb-tab="0">${config.mode === 'sales' ? '销售协议价' : '采购协议价'}</button><button type="button" class="${state.tab === 1 ? 'active' : ''}" data-pb-tab="1">协议价商品</button></div>`
      : config.type === 'market' ? `<div class="pb-tabs" role="tablist"><button type="button" class="${state.tab === 0 ? 'active' : ''}" data-pb-tab="0">市场询价管理</button><button type="button" class="${state.tab === 1 ? 'active' : ''}" data-pb-tab="1">询价小组管理</button><button type="button" class="${state.tab === 2 ? 'active' : ''}" data-pb-tab="2">询价地点管理</button></div>`
        : '';
    const filters = config.type === 'inquiry' ? inquiryFilter() : config.type === 'agreement' ? agreementFilter(state.tab) : marketFilter(state.tab);
    const total = state.filteredRows.length;
    host.innerHTML = `<section class="page-card price-business-page order-module-page">${tabMarkup}${filters}${toolbar()}${listTable()}${pagination(total)}<div class="pb-toast" id="priceBusinessToast" role="status"></div></section>${state.modal ? modalMarkup() : ''}`;
    syncFilterValues();
    bindDatePickers();
  }

  function syncFilterValues() {
    Object.entries(state.filters).forEach(([key, value]) => {
      if (key.endsWith('From') || key.endsWith('To')) return;
      const input = host.querySelector(`[data-filter="${CSS.escape(key)}"]`);
      if (input && input.value !== value) input.value = value;
    });
  }

  function formDefaults(type) {
    if (type === 'inquiry') return { name: '', from: '', to: '', deadline: '', targets: '', lines: Array.from({ length: 10 }, () => ({ code: '', qty: '0.00', remark: '' })) };
    if (type === 'market') return { name: '', date: today, from: '', to: '', calculation: '中位数', locations: [{ place: '', address: '', group: '', remark: '' }], lines: [{ code: '', remark: '' }] };
    return { entity: '', entities: [], from: today, to: '', remark: '', contact: '', phone: '', lines: Array.from({ length: 10 }, () => ({ code: '', price: '' })) };
  }

  function openForm(row = null, mode = 'add') {
    const type = config.type;
    state.view = 'form'; state.formMode = mode; state.editingId = row?.id || null;
    state.form = row?.form ? JSON.parse(JSON.stringify(row.form)) : formDefaults(type);
    state.entitySelectOpen = false;
    if (type === 'agreement') {
      const legacyEntities = String(state.form.entity || '').split('、').map((value) => value.trim()).filter(Boolean);
      state.form.entities = Array.isArray(state.form.entities) && state.form.entities.length ? [...state.form.entities] : legacyEntities;
      state.form.entity = state.form.entities.join('、');
    }
    if (row && type === 'inquiry') {
      state.form = formDefaults(type); state.form.from = row.cycle.split('~')[0].trim(); state.form.to = row.cycle.split('~')[1]?.trim() || ''; state.form.deadline = row.date; state.form.targets = row.targets.split('、')[0] || ''; state.form.lines = row.products.map((product) => ({ code: product.code, qty: '0.00', remark: '' })).concat(state.form.lines).slice(0, 10);
    }
    if (row && type === 'market') { state.form = formDefaults(type); state.form.name = row.name; state.form.date = row.date; }
    render();
  }

  function backToList() { state.view = 'list'; state.form = null; state.modal = null; state.detailRow = null; state.editingId = null; state.entitySelectOpen = false; render(); }

  function formSelect(name, selected, disabled = false) {
    const values = config.mode === 'sales' ? customers : suppliers;
    const placeholder = config.mode === 'sales' ? '请选择客户名称' : '请选择供应商';
    const selectedValues = Array.isArray(state.form?.entities) ? state.form.entities : String(selected || '').split('、').filter(Boolean);
    const summary = selectedValues.length ? selectedValues.join('、') : placeholder;
    return `<div class="pb-multi-select ${config.mode === 'sales' ? 'has-add-action' : ''} ${state.entitySelectOpen ? 'is-open' : ''}" data-entity-multiselect><button type="button" class="pb-multi-select-trigger ${selectedValues.length ? '' : 'is-placeholder'}" data-biz-action="entity-toggle" aria-haspopup="listbox" aria-expanded="${state.entitySelectOpen ? 'true' : 'false'}" ${disabled ? 'disabled' : ''}><span title="${esc(summary)}">${esc(summary)}</span></button>${state.entitySelectOpen && !disabled ? `<div class="pb-multi-select-panel" role="listbox" aria-multiselectable="true">${values.map((value) => `<label class="pb-multi-select-option"><input type="checkbox" data-entity-option value="${esc(value)}" ${selectedValues.includes(value) ? 'checked' : ''}><span>${esc(value)}</span></label>`).join('')}</div>` : ''}</div>`;
  }

  function productSelect(index, selected, disabled = false) {
    const used = new Set((state.form?.lines || []).map((line, lineIndex) => lineIndex !== index ? line.code : '').filter(Boolean));
    const placeholder = '请选择商品名称，添加后的商品不再可被选择，选项中消失';
    return `<select data-line-product="${index}" data-price-placeholder="${esc(placeholder)}" data-price-empty="${selected ? 'false' : 'true'}" ${disabled ? 'disabled' : ''} aria-label="商品名称">${products.filter((product) => !used.has(product.code) || product.code === selected).map((product) => `<option value="${product.code}" ${product.code === selected ? 'selected' : ''}>${esc(productLabel(product))}</option>`).join('')}</select>`;
  }

  function renderAgreementForm() {
    const f = state.form; const isSales = config.mode === 'sales'; const entityLabel = isSales ? '客户名称' : '供应商名称'; const contact = f.entity ? (isSales ? '联系人' : f.entity === '盒马鲜生' ? '王先生' : '李先生') : '--'; const phone = f.entity ? (isSales ? '021-63265986' : f.entity === '盒马鲜生' ? '13265985264' : '13900000000') : '--';
    const lines = f.lines.map((line, index) => { const product = productObject(line.code); return `<tr><td><input type="checkbox" class="pb-checkbox" data-line-check="${index}" ${line.code ? '' : 'disabled'}></td><td>${index + 1}</td><td><span class="pb-image-placeholder">图片</span></td><td>${productSelect(index, line.code, !f.entity)}</td><td>${esc(product?.category || '')}</td><td>${esc(product?.unit || '')}</td><td>${product ? money(product.market) : '--'}</td><td>${product ? money(product.recent) : '--'}</td><td><input type="number" min="0" step="0.01" data-line-price="${index}" value="${esc(line.price || '')}" placeholder="请输入协议价"></td></tr>`; }).join('');
    return `<section class="page-card price-business-page price-business-form-page"><div class="pb-form-head"><button type="button" class="pb-back" data-biz-action="back"><svg class="pb-back-icon" viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"></path><path d="M19 12H9"></path></svg><span>返回</span></button><h1>${isSales ? '添加销售协议价' : '添加采购协议价'}</h1></div><div class="pb-form-section"><h2>基础信息</h2><div class="pb-form-grid"><div class="pb-form-field"><label><span class="pb-required">*</span> ${entityLabel}</label>${formSelect('entity', f.entity)}${isSales ? '<button type="button" class="pb-plus" data-biz-action="customer-add" aria-label="添加客户">+</button>' : ''}</div><div class="pb-form-field"><label><span class="pb-required">*</span> 执行周期</label><div class="pb-date-range"><input type="text" data-form-field="from" value="${esc(f.from)}" aria-label="执行周期开始"><span>-</span><input type="text" data-form-field="to" value="${esc(f.to)}" aria-label="执行周期结束"></div></div><div class="pb-form-field"><label>备注</label><div class="pb-textarea-wrap"><textarea data-form-field="remark" maxlength="${isSales ? 50 : 20}" placeholder="请输入备注">${esc(f.remark)}</textarea><span class="pb-counter">${String(f.remark || '').length}/${isSales ? 50 : 20}</span></div></div></div><h2>联系信息</h2><div class="pb-form-grid two"><div class="pb-form-field"><label>联系人</label><span class="pb-contact-value">${esc(f.contact || contact)}</span></div><div class="pb-form-field"><label>联系电话</label><span class="pb-contact-value">${esc(f.phone || phone)}</span></div></div></div><div class="pb-form-tools"><button type="button" class="btn btn-primary btn-sm" data-biz-action="batch-products">批量添加商品</button><button type="button" class="btn btn-primary btn-sm" data-biz-action="batch-price">批量定价</button></div><div class="pb-form-table-wrap"><table class="pb-form-table"><thead><tr><th><input type="checkbox" class="pb-checkbox" disabled></th><th>序号</th><th>图片</th><th>商品名称（计量单位/品牌/规格）</th><th>商品分类</th><th>计量单位</th><th>市场价</th><th>近一次采购价</th><th>${isSales ? '协议价' : '*协议价'}</th></tr></thead><tbody>${lines}</tbody></table></div><div class="pb-form-footer"><button type="button" class="btn" data-biz-action="back">返回</button><button type="button" class="btn btn-primary" data-biz-action="save-form">保存</button></div></section>${state.modal ? modalMarkup() : ''}`;
  }

  function addCategoryButton() {
    if (config.type !== 'agreement') return;
    host.querySelectorAll('.pb-form-table tbody td:nth-child(5)').forEach((cell) => {
      const category = cell.textContent.trim();
      if (category) cell.title = category;
    });
    const batchPriceButton = host.querySelector('[data-biz-action="batch-price"]');
    if (!batchPriceButton || host.querySelector('[data-biz-action="category-products"]')) return;
    batchPriceButton.insertAdjacentHTML('beforebegin', '<button type="button" class="btn btn-primary btn-sm" data-biz-action="category-products">按分类添加商品</button>');
  }

  function renderInquiryForm() {
    const f = state.form; const lines = f.lines.map((line, index) => { const product = productObject(line.code); return `<tr><td>${index + 1}</td><td><span class="pb-image-placeholder">图片</span></td><td>${productSelect(index, line.code, false)}</td><td>${esc(product?.unit || '')}</td><td>${esc(product ? '默认供应商/采购员' : '')}</td><td><input type="number" min="0" step="0.01" data-line-qty="${index}" value="${esc(line.qty || '0.00')}" placeholder="请输入数量"></td><td><input data-line-remark="${index}" value="${esc(line.remark || '')}" placeholder="请输入备注"></td></tr>`; }).join('');
    return `<section class="page-card price-business-page price-business-form-page"><div class="pb-form-head"><button type="button" class="pb-back" data-biz-action="back"><svg class="pb-back-icon" viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"></path><path d="M19 12H9"></path></svg><span>返回</span></button><h1>添加询价单</h1></div><div class="pb-form-grid"><div class="pb-form-field"><label><span class="pb-required">*</span> 执行日期</label><div class="pb-date-range"><input type="text" data-form-field="from" value="${esc(f.from)}" aria-label="执行日期开始"><span>-</span><input type="text" data-form-field="to" value="${esc(f.to)}" aria-label="执行日期结束"></div></div><div class="pb-form-field"><label><span class="pb-required">*</span> 询价截止日期</label><input type="text" data-form-field="deadline" value="${esc(f.deadline)}" aria-label="请选择询价截止日期"></div><div class="pb-form-field"><label><span class="pb-required">*</span> 询价对象</label><select data-form-field="targets" aria-label="请选择询价单位"><option value="">请选择询价单位</option>${suppliers.map((value) => `<option value="${value}" ${value === f.targets ? 'selected' : ''}>${value}</option>`).join('')}</select></div></div><div class="pb-form-tools"><button type="button" class="btn btn-primary btn-sm" data-biz-action="batch-products">批量添加商品</button></div><div class="pb-form-table-wrap"><table class="pb-form-table pb-inquiry-form-table"><thead><tr><th>序号</th><th>图片</th><th>商品名称（计量单位/品牌/规格）</th><th>计量单位</th><th>默认供应商/采购员</th><th>需求量</th><th>备注</th></tr></thead><tbody>${lines}</tbody></table></div><div class="pb-form-footer"><button type="button" class="btn" data-biz-action="back">返回</button><button type="button" class="btn btn-primary" data-biz-action="save-form">提交并发送</button></div></section>${state.modal ? modalMarkup() : ''}`;
  }

  function renderMarketForm() {
    const f = state.form; const location = f.locations[0]; const product = productObject(f.lines[0].code);
    return `<section class="page-card price-business-page price-business-form-page"><div class="pb-form-head"><button type="button" class="pb-back" data-biz-action="back"><svg class="pb-back-icon" viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"></path><path d="M19 12H9"></path></svg><span>返回</span></button><h1>添加询价单</h1></div><div class="pb-form-grid pb-market-form-grid"><div class="pb-form-field"><label><span class="pb-required">*</span> 询价单名称</label><input data-form-field="name" value="${esc(f.name)}" placeholder="请输入询价单名称"></div><div class="pb-form-field"><label>询价日期</label><input type="text" data-form-field="date" value="${esc(f.date)}" aria-label="请选择询价日期"></div><div class="pb-form-field"><label>执行周期</label><div class="pb-date-range"><input type="text" data-form-field="from" value="${esc(f.from)}" aria-label="执行周期开始"><span>-</span><input type="text" data-form-field="to" value="${esc(f.to)}" aria-label="执行周期结束"></div></div><div class="pb-form-field"><label>执行价格计算</label><select data-form-field="calculation"><option value="中位数" ${f.calculation === '中位数' ? 'selected' : ''}>中位数</option><option value="平均数" ${f.calculation === '平均数' ? 'selected' : ''}>平均数</option></select></div></div><div class="pb-form-table-wrap" style="margin-top:8px"><table class="pb-form-table pb-location-table"><thead><tr><th>序号</th><th>询价地点</th><th>地址</th><th>询价小组</th><th>备注</th><th>操作</th></tr></thead><tbody><tr><td>1</td><td><select data-location="place"><option value="">请选择询价地点</option>${['西市', '东市'].map((v) => `<option value="${v}" ${v === location.place ? 'selected' : ''}>${v}</option>`).join('')}</select></td><td>${esc(location.address || '')}</td><td><select data-location="group"><option value="">请选择询价小组</option><option value="王子" ${location.group === '王子' ? 'selected' : ''}>王子</option><option value="李林" ${location.group === '李林' ? 'selected' : ''}>李林</option></select></td><td><input data-location="remark" value="${esc(location.remark || '')}" placeholder="请输入备注"></td><td>${action('删除', 'location-delete', 'location', false, true)}</td></tr></tbody></table></div><div class="pb-form-tools"><button type="button" class="btn btn-primary btn-sm" data-biz-action="batch-products">批量添加商品</button><button type="button" class="btn btn-sm" data-biz-action="location-delete">批量删除</button></div><div class="pb-form-table-wrap"><table class="pb-form-table pb-market-product-table"><thead><tr><th><input type="checkbox" class="pb-checkbox"></th><th>序号</th><th>商品编码</th><th>商品名称（计量单位/品牌/规格）</th><th>备注</th><th>单位</th><th>操作</th></tr></thead><tbody><tr><td><input type="checkbox" class="pb-checkbox" ${product ? '' : 'disabled'}></td><td>1</td><td>${esc(product?.code || '')}</td><td>${productSelect(0, f.lines[0].code, false)}</td><td><input data-line-remark="0" value="${esc(f.lines[0].remark || '')}" placeholder="请输入备注"></td><td>${esc(product?.unit || '')}</td><td>${action('删除', 'market-product-delete', '0', false, true)}</td></tr></tbody></table></div><div class="pb-form-footer"><button type="button" class="btn" data-biz-action="back">返回</button><button type="button" class="btn btn-primary" data-biz-action="save-form">提交并发送</button></div></section>${state.modal ? modalMarkup() : ''}`;
  }

  function detailPage() {
    const row = state.detailRow || inquiryRows[0]; const productRows = (row.products || products.slice(0, 2)).map((product, index) => `<tr><td><input type="checkbox" class="pb-checkbox" disabled></td><td>${esc(productLabel(product))}</td><td>${esc(product.category)}</td><td></td><td>${esc(product.unit)}</td><td>0</td><td>0.00</td><td>--</td><td><select disabled aria-label="选择供应商"><option>选择供应商</option></select></td><td>--</td></tr>`).join('');
    host.innerHTML = `<section class="page-card price-business-page price-business-detail-page"><div class="pb-detail-head"><button type="button" class="pb-back" data-biz-action="back"><svg class="pb-back-icon" viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"></path><path d="M19 12H9"></path></svg><span>返回</span></button><h1>查看报价</h1></div><div class="pb-detail-tabs"><button type="button" class="${state.detailTab === 0 ? 'active' : ''}" data-detail-tab="0">按商品查看</button><button type="button" class="${state.detailTab === 1 ? 'active' : ''}" data-detail-tab="1">按供应商查看</button></div><div class="pb-detail-summary"><span>单号：<strong>${esc(row.id)}</strong></span><span>执行周期：<strong>${esc(row.cycle)}</strong></span><span>询价截止日期：<strong>${esc(row.date)}</strong></span><span>已报对象：<strong></strong></span><span>状态：<strong>${esc(row.status)}</strong></span></div><div class="pb-detail-filter"><label>商品名称</label><input placeholder="搜索商品名称或者编码" aria-label="搜索商品名称或者编码"><button type="button" class="btn btn-primary btn-sm" data-biz-action="query">查询</button><button type="button" class="btn btn-sm" data-biz-action="reset">重置</button></div><div class="pb-table-wrap pb-detail-table-wrap"><table class="pb-table pb-detail-table"><thead><tr><th></th><th>商品名称（计量单位/品牌/规格）</th><th>商品分类</th><th>备注</th><th>计量单位</th><th>需求量</th><th>最低报价</th><th>最低报价供应商</th><th>选择供应商</th><th>供应商报价</th></tr></thead><tbody>${productRows}</tbody></table></div><div class="pb-detail-footer"><button type="button" class="btn" data-biz-action="back">返回</button></div></section>`;
  }

  function modalPagination(total) {
    const pages = Math.max(1, Math.ceil(total / 20));
    const pageButtons = Array.from({ length: pages }, (_, index) => index + 1).map((page) => `<button type="button" class="product-picker-page-button ${page === state.batchPage ? 'active' : ''}" data-biz-action="batch-page" data-id="${page}" ${page === state.batchPage ? 'aria-current="page"' : ''}>${page}</button>`).join('');
    return `<div class="product-picker-pagination"><span class="product-picker-total">共 ${total} 条数据</span><select class="product-picker-page-size" disabled aria-label="每页条数"><option>20 条/页</option></select><div class="product-picker-page-buttons"><button type="button" class="product-picker-page-button" data-biz-action="batch-page" data-id="${Math.max(1, state.batchPage - 1)}" ${state.batchPage === 1 ? 'disabled' : ''}>‹</button>${pageButtons}<button type="button" class="product-picker-page-button" data-biz-action="batch-page" data-id="${Math.min(pages, state.batchPage + 1)}" ${state.batchPage === pages ? 'disabled' : ''}>›</button></div><label class="product-picker-page-jump">跳至 <input class="product-picker-jump-input" value="${state.batchPage}" readonly aria-label="跳转页码"> / ${pages} 页</label></div>`;
  }

  function modalMarkup() {
    const modal = state.modal;
    if (modal.type === 'batchProducts') {
      const filtered = products.filter((product) => (!state.batchFilters.purchaseType || product.purchaseType === state.batchFilters.purchaseType) && (!state.batchFilters.category || product.category === state.batchFilters.category));
      const pages = Math.max(1, Math.ceil(filtered.length / 20)); state.batchPage = Math.min(state.batchPage, pages);
      const visible = filtered.slice((state.batchPage - 1) * 20, state.batchPage * 20);
      if (config.type !== 'agreement') {
        const rows = visible.length ? visible.map((product) => {
          const draft = state.batchDrafts.get(product.code) || {};
          const quantityCell = config.type === 'inquiry' ? `<td><input type="number" min="0.01" step="0.01" data-batch-qty="${product.code}" value="${esc(draft.qty || '')}" placeholder="请输入需求量"></td>` : '';
          return `<tr><td><input type="checkbox" class="pb-checkbox" data-batch-product="${product.code}" ${state.batchSelected.has(product.code) ? 'checked' : ''}></td><td><span class="pb-image-placeholder product-picker-image">图片</span></td><td class="pb-modal-product product-picker-product">${esc(productLabel(product))}</td><td>${esc(product.unit)}</td>${quantityCell}<td><input type="text" data-batch-remark="${product.code}" value="${esc(draft.remark || '')}" placeholder="请输入备注"></td></tr>`;
        }).join('') : `<tr><td colspan="${config.type === 'inquiry' ? 6 : 5}" style="height:180px;color:#9aa4b2">暂无符合条件的商品</td></tr>`;
        const quantityHeading = config.type === 'inquiry' ? '<th>需求量</th>' : '';
        return `<div class="pb-modal product-picker-backdrop" data-modal-backdrop><div class="pb-dialog product-picker-dialog" role="dialog" aria-modal="true" aria-labelledby="pbProductPickerTitle"><div class="pb-dialog-head product-picker-header"><h2 id="pbProductPickerTitle">批量添加商品</h2><button type="button" class="pb-close product-picker-close" data-biz-action="modal-close" aria-label="关闭">×</button></div><div class="pb-dialog-body product-picker-body"><div class="product-picker-filters"><label class="product-picker-filter"><span>采购类型</span><select data-modal-filter="purchaseType"><option value="">请选择</option>${['供应商送货', '企业自加工', '市场自采'].map((value) => `<option value="${value}" ${state.batchFilters.purchaseType === value ? 'selected' : ''}>${value}</option>`).join('')}</select></label><label class="product-picker-filter"><span>商品分类</span><select data-modal-filter="category"><option value="">请选择商品分类</option>${categories.map((value) => `<option value="${esc(value)}" ${state.batchFilters.category === value ? 'selected' : ''}>${esc(value)}</option>`).join('')}</select></label><div class="product-picker-filter-actions"><button type="button" class="btn btn-primary btn-sm" data-biz-action="modal-query">查询</button><button type="button" class="btn btn-sm" data-biz-action="modal-reset">重置</button></div></div><div class="product-picker-table-wrap"><table class="pb-modal-table product-picker-table"><thead><tr><th>选择</th><th>图片</th><th>商品名称（计量单位/品牌/规格）</th><th>计量单位</th>${quantityHeading}<th>备注</th></tr></thead><tbody>${rows}</tbody></table></div>${modalPagination(filtered.length)}</div><div class="pb-modal-footer product-picker-footer"><button type="button" class="btn" data-biz-action="modal-close">关闭</button><button type="button" class="btn btn-primary" data-biz-action="batch-confirm">添加</button></div></div></div>`;
      }
      return `<div class="pb-modal product-picker-backdrop" data-modal-backdrop><div class="pb-dialog product-picker-dialog" role="dialog" aria-modal="true" aria-labelledby="pbProductPickerTitle"><div class="pb-dialog-head product-picker-header"><h2 id="pbProductPickerTitle">批量添加商品</h2><button type="button" class="pb-close product-picker-close" data-biz-action="modal-close" aria-label="关闭">×</button></div><div class="pb-dialog-body product-picker-body"><div class="product-picker-filters"><label class="product-picker-filter"><span>采购类型</span><select data-modal-filter="purchaseType"><option value="">请选择</option>${['供应商送货', '企业自加工', '市场自采'].map((value) => `<option value="${value}" ${state.batchFilters.purchaseType === value ? 'selected' : ''}>${value}</option>`).join('')}</select></label><label class="product-picker-filter"><span>商品分类</span><select data-modal-filter="category"><option value="">请选择商品分类</option>${categories.map((value) => `<option value="${esc(value)}" ${state.batchFilters.category === value ? 'selected' : ''}>${esc(value)}</option>`).join('')}</select></label><div class="product-picker-filter-actions"><button type="button" class="btn btn-primary btn-sm" data-biz-action="modal-query">查询</button><button type="button" class="btn btn-sm" data-biz-action="modal-reset">重置</button></div></div><div class="product-picker-table-wrap"><table class="pb-modal-table product-picker-table"><thead><tr><th>选择</th><th>图片</th><th>商品名称（计量单位/品牌/规格）</th><th>商品分类</th><th>计量单位</th><th>市场价</th><th>最近一次采购价</th><th>协议价</th></tr></thead><tbody>${visible.length ? visible.map((product) => `<tr><td><input type="checkbox" class="pb-checkbox" data-batch-product="${product.code}" ${state.batchSelected.has(product.code) ? 'checked' : ''}></td><td><span class="pb-image-placeholder product-picker-image">图片</span></td><td class="pb-modal-product product-picker-product">${esc(productLabel(product))}</td><td>${esc(product.category)}</td><td>${esc(product.unit)}</td><td>${money(product.market)}</td><td>${money(product.recent)}</td><td><input type="number" min="0" step="0.01" data-batch-price="${product.code}" placeholder="请输入单价"></td></tr>`).join('') : '<tr><td colspan="8" style="height:180px;color:#9aa4b2">暂无符合条件的商品</td></tr>'}</tbody></table></div>${modalPagination(filtered.length)}</div><div class="pb-modal-footer product-picker-footer"><button type="button" class="btn" data-biz-action="modal-close">关闭</button><button type="button" class="btn btn-primary" data-biz-action="batch-confirm">添加</button></div></div></div>`;
    }
    if (modal.type === 'categoryProducts') {
      const existingCodes = new Set((state.form?.lines || []).map((line) => line.code).filter(Boolean));
      const productCategories = [...new Set(products.map((product) => product.category).filter(Boolean))];
      const categoryRows = productCategories.map((category) => {
        const categoryProducts = products.filter((product) => product.category === category);
        const availableCount = categoryProducts.filter((product) => !existingCodes.has(product.code)).length;
        const leafName = category.split('-').filter(Boolean).at(-1) || category;
        return `<label class="pb-category-option ${availableCount ? '' : 'is-disabled'}"><input type="checkbox" data-category-product value="${esc(category)}" ${state.categorySelected.has(category) ? 'checked' : ''} ${availableCount ? '' : 'disabled'}><span class="pb-category-option-main"><strong>${esc(leafName)}</strong><small title="${esc(category)}">${esc(category)}</small></span><em>${availableCount ? `${availableCount} 个商品` : '已全部添加'}</em></label>`;
      }).join('');
      return `<div class="pb-modal" data-modal-backdrop><div class="pb-dialog pb-category-dialog" role="dialog" aria-modal="true" aria-labelledby="pbCategoryPickerTitle"><div class="pb-dialog-head"><h2 id="pbCategoryPickerTitle">按分类添加商品</h2><button type="button" class="pb-close" data-biz-action="modal-close" aria-label="关闭">×</button></div><div class="pb-dialog-body pb-category-picker"><p>请选择商品三级分类，可多选</p><div class="pb-category-list">${categoryRows}</div></div><div class="pb-modal-footer"><button type="button" class="btn" data-biz-action="modal-close">取消</button><button type="button" class="btn btn-primary" data-biz-action="category-confirm">确定</button></div></div></div>`;
    }
    if (modal.type === 'batchPrice') return `<div class="pb-modal"><div class="pb-dialog small" role="dialog" aria-modal="true"><div class="pb-dialog-head"><h2>批量定价</h2><button type="button" class="pb-close" data-biz-action="modal-close" aria-label="关闭">×</button></div><form class="pb-small-form"><label>协议价<input type="number" min="0" step="0.01" data-modal-price placeholder="请输入协议价"></label><div class="pb-modal-footer"><button type="button" class="btn" data-biz-action="modal-close">取消</button><button type="button" class="btn btn-primary" data-biz-action="bulk-price-confirm">确定</button></div></form></div></div>`;
    if (modal.type === 'customer') return `<div class="pb-modal"><div class="pb-dialog small" role="dialog" aria-modal="true"><div class="pb-dialog-head"><h2>添加客户</h2><button type="button" class="pb-close" data-biz-action="modal-close" aria-label="关闭">×</button></div><form class="pb-small-form"><label>客户名称<input data-modal-field="customer" placeholder="请输入客户名称"></label><label>联系人<input data-modal-field="contact" placeholder="请输入联系人"></label><label>联系电话<input data-modal-field="phone" placeholder="请输入联系电话"></label><div class="pb-modal-footer"><button type="button" class="btn" data-biz-action="modal-close">取消</button><button type="button" class="btn btn-primary" data-biz-action="customer-confirm">确定</button></div></form></div></div>`;
    if (modal.type === 'group' || modal.type === 'place') { const group = modal.type === 'group'; const row = modal.row || {}; return `<div class="pb-modal"><div class="pb-dialog small" role="dialog" aria-modal="true"><div class="pb-dialog-head"><h2>${row.id ? '编辑' : '添加'}${group ? '询价小组成员' : '询价地点'}</h2><button type="button" class="pb-close" data-biz-action="modal-close" aria-label="关闭">×</button></div><form class="pb-small-form"><label>${group ? '成员姓名' : '询价地点'}<input data-modal-field="name" value="${esc(row.name || '')}" placeholder="请输入${group ? '成员姓名' : '询价地点'}"></label><label>${group ? '联系电话' : '地址'}<input data-modal-field="secondary" value="${esc(group ? row.phone || '' : row.address || '')}" placeholder="请输入${group ? '联系电话' : '地址'}"></label><div class="pb-modal-footer"><button type="button" class="btn" data-biz-action="modal-close">取消</button><button type="button" class="btn btn-primary" data-biz-action="maintain-confirm">确定</button></div></form></div></div>`; }
    return '';
  }

  function collectForm() {
    if (!state.form) return;
    host.querySelectorAll('[data-form-field]').forEach((element) => { state.form[element.dataset.formField] = element.value; });
    host.querySelectorAll('[data-line-product]').forEach((element) => { state.form.lines[Number(element.dataset.lineProduct)].code = element.value; });
    host.querySelectorAll('[data-line-price]').forEach((element) => { state.form.lines[Number(element.dataset.linePrice)].price = element.value; });
    host.querySelectorAll('[data-line-qty]').forEach((element) => { state.form.lines[Number(element.dataset.lineQty)].qty = element.value; });
    host.querySelectorAll('[data-line-remark]').forEach((element) => { const index = Number(element.dataset.lineRemark); if (state.form.lines[index]) state.form.lines[index].remark = element.value; });
    host.querySelectorAll('[data-location]').forEach((element) => { state.form.locations[0][element.dataset.location] = element.value; });
  }

  function saveForm() {
    collectForm(); const f = state.form;
    if (config.type === 'inquiry') {
      if (!f.from || !f.to || !f.deadline || !f.targets) { toast('请完善必填信息', 'error'); return; }
      const selected = f.lines.filter((line) => line.code); if (!selected.length) { toast('请至少添加一条商品', 'error'); return; }
      const id = state.editingId || `XJD${today.replaceAll('-', '')}030000${String(state.rows.length + 1).padStart(2, '0')}`;
      const row = { id, cycle: `${f.from} ~ ${f.to}`, date: f.deadline, productCount: selected.length, quoteCount: 0, targets: f.targets, status: '询价中', products: selected.map((line) => productObject(line.code)).filter(Boolean), form: JSON.parse(JSON.stringify(f)) };
      const existing = state.rows.findIndex((item) => item.id === id); if (existing >= 0) state.rows[existing] = row; else state.rows.unshift(row); toast('提交成功');
    } else if (config.type === 'agreement') {
      if (!f.entity || !f.from || !f.to) { toast('请完善必填信息', 'error'); return; }
      const selected = f.lines.filter((line) => line.code); if (!selected.length || selected.some((line) => !line.price)) { toast('请填写商品和协议价', 'error'); return; }
      const id = state.editingId || `${config.mode === 'sales' ? 'XSXY' : 'CGXY'}${today.replaceAll('-', '')}030000${String(state.rows.length + 1).padStart(2, '0')}`;
      const productRows = selected.map((line) => ({ id: `${id}-${line.code}`, product: productObject(line.code), category: productObject(line.code)?.category || '', unit: productObject(line.code)?.unit || '', price: money(line.price), ...(config.mode === 'sales' ? { customer: f.entity } : { supplier: f.entity }), no: id, cycle: `${f.from}至${f.to}`, status: '启用', addedBy: '杨' }));
      const row = { id, no: id, productCount: productRows.length, partner: f.entity, cycle: `${f.from}至${f.to}`, date: today, status: '启用', remark: f.remark, addedBy: '杨', products: productRows.map((line) => line.product), form: JSON.parse(JSON.stringify(f)) };
      const existing = state.rows.findIndex((item) => item.id === id); if (existing >= 0) state.rows[existing] = row; else state.rows.unshift(row); state.products = state.products.concat(productRows); toast('保存成功');
    } else if (config.type === 'market') {
      if (!f.name) { toast('请输入询价单名称', 'error'); return; }
      const id = `XJD${today.replaceAll('-', '')}030000${String(state.rows.length + 1).padStart(2, '0')}`; state.rows.unshift({ id, date: f.date, cycle: f.from && f.to ? `${f.from} ~ ${f.to}` : '-', no: id, name: f.name, addedBy: '杨', status: '询价中', form: JSON.parse(JSON.stringify(f)) }); toast('提交成功');
    }
    backToList();
  }

  function applyQuery() { readFilters(); state.page = 1; render(); }
  function resetFilters() { state.filters = {}; state.page = 1; render(); }

  function openBatchProducts() { collectForm(); if ((config.type === 'agreement' && !state.form.entity) || (config.type === 'inquiry' && !state.form.targets)) { toast(config.type === 'agreement' ? (config.mode === 'sales' ? '请选择客户' : '请选择供应商') : '请选择询价单位', 'error'); return; } state.modal = { type: 'batchProducts' }; state.batchSelected = new Set(); state.batchDrafts = new Map(); state.batchFilters = {}; state.batchPage = 1; render(); }
  function openCategoryProducts() {
    collectForm();
    if (!state.form.entity) { toast(config.mode === 'sales' ? '请选择客户' : '请选择供应商', 'error'); return; }
    state.categorySelected = new Set();
    state.entitySelectOpen = false;
    state.modal = { type: 'categoryProducts' };
    render();
  }

  function confirmCategoryProducts() {
    collectForm();
    if (!state.categorySelected.size) { toast('请至少选择一个商品分类', 'error'); return; }
    const existingCodes = new Set(state.form.lines.map((line) => line.code).filter(Boolean));
    const selectedProducts = products.filter((product) => state.categorySelected.has(product.category) && !existingCodes.has(product.code));
    if (!selectedProducts.length) { toast('所选分类的商品已全部添加', 'error'); return; }
    selectedProducts.forEach((product) => {
      let targetLine = state.form.lines.find((line) => !line.code);
      if (!targetLine) {
        targetLine = { code: '', price: '' };
        state.form.lines.push(targetLine);
      }
      targetLine.code = product.code;
      targetLine.price = targetLine.price || '';
      existingCodes.add(product.code);
    });
    state.modal = null;
    state.categorySelected = new Set();
    render();
    toast(`已添加 ${selectedProducts.length} 个商品`);
  }

  function confirmBatchProducts() {
    collectForm();
    const selected = [...state.batchSelected].map((code) => productObject(code)).filter(Boolean);
    if (!selected.length) { toast('请至少选择一条商品', 'error'); return; }
    if (config.type === 'market') {
      state.form.lines[0].code = selected[0].code;
      state.form.lines[0].remark = state.batchDrafts.get(selected[0].code)?.remark || '';
    } else {
      const existing = new Set(state.form.lines.map((line) => line.code));
      selected.forEach((product) => {
        if (existing.has(product.code)) return;
        const blank = state.form.lines.find((line) => !line.code);
        if (!blank) return;
        const draft = state.batchDrafts.get(product.code) || {};
        blank.code = product.code;
        if (config.type === 'inquiry') {
          blank.qty = draft.qty || '0.00';
          blank.remark = draft.remark || '';
        }
      });
    }
    state.modal = null;
    render();
  }
  function confirmBulkPrice() { collectForm(); const price = host.querySelector('[data-modal-price]')?.value || ''; if (!price) { toast('请输入协议价', 'error'); return; } const checked = [...host.querySelectorAll('[data-line-check]:checked')].map((element) => Number(element.dataset.lineCheck)); if (!checked.length) { toast('请至少选择一条商品', 'error'); return; } checked.forEach((index) => { if (state.form.lines[index]) state.form.lines[index].price = price; }); state.modal = null; render(); }

  function saveCustomer() { const name = host.querySelector('[data-modal-field="customer"]')?.value.trim(); if (!name) { toast('请输入客户名称', 'error'); return; } if (!customers.includes(name)) customers.push(name); const selectedValues = new Set(state.form.entities || []); selectedValues.add(name); state.form.entities = [...selectedValues]; state.form.entity = state.form.entities.join('、'); state.form.contact = host.querySelector('[data-modal-field="contact"]')?.value.trim() || ''; state.form.phone = host.querySelector('[data-modal-field="phone"]')?.value.trim() || ''; state.modal = null; render(); }
  function saveMaintain() { const name = host.querySelector('[data-modal-field="name"]')?.value.trim(); const secondary = host.querySelector('[data-modal-field="secondary"]')?.value.trim(); if (!name || !secondary) { toast('请完善信息', 'error'); return; } const group = state.modal.type === 'group'; const collection = group ? state.groups : state.places; const row = state.modal.row || { id: `${group ? 'GROUP' : 'PLACE'}-${Date.now()}`, status: '启用' }; row.name = name; if (group) row.phone = secondary; else row.address = secondary; if (!state.modal.row) collection.push(row); state.modal = null; render(); }

  function handleAction(action, id) {
    if (action === 'query') return applyQuery();
    if (action === 'reset') return resetFilters();
    if (action === 'back') return backToList();
    if (action === 'add') return openForm();
    if (action === 'market-add') return openForm();
    if (action === 'group-add') { state.modal = { type: 'group' }; render(); return; }
    if (action === 'place-add') { state.modal = { type: 'place' }; render(); return; }
    if (action === 'customer-add') { collectForm(); state.entitySelectOpen = false; state.modal = { type: 'customer' }; render(); return; }
    if (action === 'entity-toggle') { collectForm(); state.entitySelectOpen = !state.entitySelectOpen; render(); return; }
    if (action === 'save-form') return saveForm();
    if (action === 'batch-products') return openBatchProducts();
    if (action === 'category-products') return openCategoryProducts();
    if (action === 'batch-price') { collectForm(); const selected = host.querySelectorAll('[data-line-check]:checked').length; if (!selected) { toast('请至少选择一条商品', 'error'); return; } state.modal = { type: 'batchPrice' }; render(); return; }
    if (action === 'modal-close') { state.modal = null; render(); return; }
    if (action === 'modal-query') { state.batchFilters = { purchaseType: host.querySelector('[data-modal-filter="purchaseType"]')?.value || '', category: host.querySelector('[data-modal-filter="category"]')?.value || '' }; state.batchPage = 1; render(); return; }
    if (action === 'modal-reset') { state.batchFilters = {}; state.batchPage = 1; render(); return; }
    if (action === 'batch-page') { state.batchPage = Math.max(1, Number(id) || 1); render(); return; }
    if (action === 'batch-confirm') return confirmBatchProducts();
    if (action === 'category-confirm') return confirmCategoryProducts();
    if (action === 'bulk-price-confirm') return confirmBulkPrice();
    if (action === 'customer-confirm') return saveCustomer();
    if (action === 'maintain-confirm') return saveMaintain();
    if (action === 'detail' || action === 'inquiry-edit') { const row = state.rows.find((item) => item.id === id); if (action === 'inquiry-edit') return openForm(row, 'edit'); state.detailRow = row; state.view = 'detail'; renderDetail(); return; }
    if (action === 'inquiry-copy') { const row = state.rows.find((item) => item.id === id); if (row) { state.rows.unshift({ ...row, id: `${row.id}-COPY`, status: '询价中' }); render(); toast('复制成功'); } return; }
    if (action === 'inquiry-close') { const row = state.rows.find((item) => item.id === id); if (row) { row.status = '已关闭'; render(); toast('关闭成功'); } return; }
    if (action === 'view') { const row = state.rows.find((item) => item.id === id); if (config.type === 'agreement' && row) { openForm(row, 'edit'); return; } toast('已打开详情'); return; }
    if (action === 'edit') { const row = state.rows.find((item) => item.id === id); if (row) openForm(row, 'edit'); return; }
    if (action === 'copy') { const row = state.rows.find((item) => item.id === id); if (row) { state.rows.unshift({ ...row, id: `${row.id}-COPY`, no: `${row.no}-复制` }); render(); toast('复制成功'); } return; }
    if (action === 'close') { const row = state.rows.find((item) => item.id === id); if (row) { row.status = '已关闭'; render(); toast('关闭成功'); } return; }
    if (action === 'product-disable') { const row = state.products.find((item) => item.id === id); if (row) { row.status = row.status === '禁用' ? '启用' : '禁用'; render(); toast(row.status === '禁用' ? '已禁用' : '已启用'); } return; }
    if (action === 'product-edit') { toast('协议价商品可在关联单据中修改'); return; }
    if (action === 'market-fill') { toast('填写价格'); return; }
    if (action === 'market-copy') { const row = state.rows.find((item) => item.id === id); if (row) { state.rows.unshift({ ...row, id: `${row.id}-COPY`, no: `${row.no}-复制` }); render(); toast('复制成功'); } return; }
    if (action === 'market-activate') { const row = state.rows.find((item) => item.id === id); if (row) { row.status = '已生效'; render(); toast('生效成功'); } return; }
    if (action === 'market-close') { const row = state.rows.find((item) => item.id === id); if (row) { row.status = '已关闭'; render(); toast('关闭成功'); } return; }
    if (action === 'group-edit' || action === 'place-edit') { const collection = action.startsWith('group') ? state.groups : state.places; state.modal = { type: action.startsWith('group') ? 'group' : 'place', row: collection.find((item) => item.id === id) }; render(); return; }
    if (action === 'group-disable' || action === 'place-disable') { const collection = action.startsWith('group') ? state.groups : state.places; const row = collection.find((item) => item.id === id); if (row) { row.status = row.status === '禁用' ? '启用' : '禁用'; render(); } return; }
    if (action === 'group-delete' || action === 'place-delete') { const collection = action.startsWith('group') ? state.groups : state.places; const index = collection.findIndex((item) => item.id === id); if (index >= 0) collection.splice(index, 1); render(); toast('删除成功'); return; }
    if (action === 'location-delete' || action === 'market-product-delete') { toast('已删除'); return; }
  }

  function renderDetail() { destroyDatePickers(); state.view = 'detail'; detailPage(); window.PriceSelectPlaceholder?.apply(host); }

  function render() {
    destroyDatePickers();
    if (state.view === 'list') {
      renderList();
      window.PriceSelectPlaceholder?.apply(host);
      return;
    }
    if (state.view === 'detail') {
      renderDetail();
      if (!host.querySelector('#priceBusinessToast')) host.insertAdjacentHTML('beforeend', '<div class="pb-toast" id="priceBusinessToast" role="status"></div>');
      window.PriceSelectPlaceholder?.apply(host);
      return;
    }
    const formMarkup = config.type === 'inquiry' ? renderInquiryForm() : config.type === 'agreement' ? renderAgreementForm() : renderMarketForm();
    host.innerHTML = `${formMarkup}<div class="pb-toast" id="priceBusinessToast" role="status"></div>`;
    addCategoryButton();
    window.PriceSelectPlaceholder?.apply(host);
    bindDatePickers();
  }

  root.addEventListener('click', (event) => {
    const tab = event.target.closest('[data-pb-tab]'); if (tab) { readFilters(); state.tab = Number(tab.dataset.pbTab); state.page = 1; render(); return; }
    const detailTab = event.target.closest('[data-detail-tab]'); if (detailTab) { state.detailTab = Number(detailTab.dataset.detailTab); renderDetail(); return; }
    const pageButton = event.target.closest('[data-page]'); if (pageButton && !pageButton.disabled) { state.page = Number(pageButton.dataset.page); render(); return; }
    const actionElement = event.target.closest('[data-biz-action]'); if (actionElement) { handleAction(actionElement.dataset.bizAction, actionElement.dataset.id); return; }
    if (state.entitySelectOpen && !event.target.closest('[data-entity-multiselect]')) { collectForm(); state.entitySelectOpen = false; render(); return; }
    if (event.target.matches('[data-modal-backdrop]')) { state.modal = null; render(); }
  });

  root.addEventListener('change', (event) => {
    if (event.target.matches('[data-category-product]')) {
      if (event.target.checked) state.categorySelected.add(event.target.value); else state.categorySelected.delete(event.target.value);
      return;
    }
    if (event.target.matches('[data-entity-option]')) {
      collectForm();
      const value = event.target.value;
      const selectedValues = new Set(state.form.entities || []);
      if (event.target.checked) selectedValues.add(value); else selectedValues.delete(value);
      state.form.entities = [...selectedValues];
      state.form.entity = state.form.entities.join('、');
      state.entitySelectOpen = true;
      render();
      return;
    }
    if (event.target.matches('[data-page-size]')) { state.pageSize = Number(event.target.value) || 20; state.page = 1; render(); return; }
    if (event.target.matches('[data-line-product]')) { collectForm(); render(); return; }
    if (event.target.matches('[data-batch-product]')) { if (event.target.checked) state.batchSelected.add(event.target.dataset.batchProduct); else state.batchSelected.delete(event.target.dataset.batchProduct); return; }
  });

  root.addEventListener('input', (event) => {
    if (event.target.matches('[data-batch-qty], [data-batch-remark]')) {
      const code = event.target.dataset.batchQty || event.target.dataset.batchRemark;
      const draft = state.batchDrafts.get(code) || {};
      if (event.target.matches('[data-batch-qty]')) draft.qty = event.target.value;
      else draft.remark = event.target.value;
      state.batchDrafts.set(code, draft);
      return;
    }
    if (event.target.matches('[data-form-field="remark"]')) { const counter = event.target.closest('.pb-textarea-wrap')?.querySelector('.pb-counter'); if (counter) counter.textContent = `${event.target.value.length}/${config.mode === 'sales' ? 50 : 20}`; }
  });

  root.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && event.target.matches('[data-page-jump]')) { event.preventDefault(); state.page = Number(event.target.value) || 1; render(); }
  });

  render();
})();
