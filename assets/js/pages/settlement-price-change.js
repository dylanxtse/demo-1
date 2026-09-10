(function () {
  const esc = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const dateOnly = (value) => String(value || '').slice(0, 10);
  const dateText = (start, end) => start && end ? `${start}  –  ${end}` : start ? `${start}  –` : end ? `–  ${end}` : '';
  const money = (value) => Number(value || 0).toFixed(2);

  const orderRows = [
    { id: 'order-1', orderNo: 'DD202609080300001', customerName: '静安第1中学', canteen: '第2食堂', customerType: '学校', shippingAt: '2026-09-10 10:22:56' },
    { id: 'order-2', orderNo: 'DD202609080300004', customerName: '静安第1中学', canteen: '第2食堂', customerType: '学校', shippingAt: '2026-09-10 10:22:56' },
    { id: 'order-3', orderNo: 'DD202609070300004', customerName: '静安第1中学', canteen: '第2食堂', customerType: '学校', shippingAt: '2026-09-10 10:16:39' },
    { id: 'order-4', orderNo: 'DD202607220300001', customerName: '静安第11中学', canteen: '测试国企', customerType: '学校', shippingAt: '2026-08-22 19:11:52' },
    { id: 'order-5', orderNo: 'DD202607270300002', customerName: '静安第11中学', canteen: '测试国企', customerType: '学校', shippingAt: '2026-08-22 19:11:52' },
    { id: 'order-6', orderNo: 'DD202607270300003', customerName: '静安第11中学', canteen: '测试国企', customerType: '学校', shippingAt: '2026-08-22 19:11:52' },
    { id: 'order-7', orderNo: 'DD202607060300002', customerName: '静安第11中学', canteen: '经费食堂', customerType: '学校', shippingAt: '2026-08-19 11:57:14' }
  ];

  const productRows = [
    { id: 'product-1', name: '全麦面粉', unit: '斤', brand: '--', spec: '--', category: '主食（米面粉点心类）', orderQty: 3, placedQty: '6.00', detailQty: ['2.00', '2.00', '2.00'] },
    { id: 'product-2', name: '牛奶', unit: '瓶', brand: '--', spec: '--', category: '蛋奶类-蛋奶类二级', orderQty: 3, placedQty: '3.00', detailQty: ['1.00', '1.00', '1.00'] },
    { id: 'product-3', name: '金龙鱼5L桶装油', unit: '瓶', brand: '金龙鱼', spec: '5L/瓶', category: '食油-食油二级', orderQty: 3, placedQty: '6.00', detailQty: ['2.00', '2.00', '2.00'] },
    { id: 'product-4', name: '大米', unit: 'KG', brand: '--', spec: '25kg/袋', category: '主食（米面粉点心类）', orderQty: 2, placedQty: '4.00', detailQty: ['1.00', '2.00', '1.00'] },
    { id: 'product-5', name: '鸡腿肉', unit: '斤', brand: '双汇', spec: '500g/份', category: '肉（豆）制品-肉制品', orderQty: 4, placedQty: '4.00', detailQty: ['1.00', '1.00', '2.00'] },
    { id: 'product-6', name: '鲫鱼', unit: '斤', brand: '--', spec: '--', category: '水产品-水产品二级', orderQty: 2, placedQty: '2.00', detailQty: ['1.00', '1.00', '0.00'] },
    { id: 'product-7', name: '土豆', unit: '斤', brand: '田园直供', spec: '散装', category: '果蔬-根茎类', orderQty: 3, placedQty: '5.00', detailQty: ['2.00', '2.00', '1.00'] },
    { id: 'product-8', name: '鸡蛋', unit: '斤', brand: '农家', spec: '500g/份', category: '蛋奶类-蛋奶类二级', orderQty: 5, placedQty: '5.00', detailQty: ['2.00', '1.00', '2.00'] },
    { id: 'product-9', name: '西红柿', unit: 'KG', brand: '--', spec: '--', category: '果蔬-果蔬二级', orderQty: 2, placedQty: '2.00', detailQty: ['1.00', '1.00', '0.00'] }
  ];

  const defaults = {
    batch: { startDate: '2026-08-11', endDate: '2026-09-11', warehouse: '', customerType: '', customerName: '', status: '', purchaseType: '', category: '', goodsName: '' },
    history: { startDate: '2026-09-11', endDate: '2026-10-11', warehouse: '', customerType: '', customerName: '', goodsName: '', orderNo: '' },
    picker: { startDate: '2026-08-11', endDate: '2026-09-11', orderNo: '' }
  };

  const state = {
    tab: 'batch',
    mode: 'date',
    advanced: true,
    batchFilters: { ...defaults.batch },
    historyFilters: { ...defaults.history },
    pickerFilters: { ...defaults.picker },
    selectedOrders: new Set(),
    selectedProducts: new Set(),
    expandedProducts: new Set(['product-1', 'product-2']),
    prices: {},
    batchLoaded: false,
    pickerOpen: false,
    detailProduct: null,
    toast: ''
  };

  const rangePickers = [];
  let toastTimer = 0;

  const shellRoot = window.AppShell.mount({
    title: '结算改价',
    content: '<section class="page-card settlement-price-change-page order-module-page" aria-label="结算改价"></section>'
  });
  const page = shellRoot.querySelector('.settlement-price-change-page');

  function renderSelect(key, options, selected = '', first = '全部') {
    const placeholder = first !== '全部';
    const firstOption = placeholder
      ? `<option value="" disabled hidden${selected ? '' : ' selected'}>${esc(first)}</option>`
      : `<option value="">${esc(first)}</option>`;
    const values = options.filter((item) => item !== '全部');
    const optionMarkup = values.map((item) => `<option value="${esc(item)}"${item === selected ? ' selected' : ''}>${esc(item)}</option>`).join('');
    return `<select class="filter-select${placeholder && !selected ? ' is-placeholder' : ''}" data-filter="${esc(key)}" aria-label="${esc(key)}">${firstOption}${optionMarkup}</select>`;
  }

  function rangeMarkup(key, start, end, id = `settlement-${key}-range`) {
    return `<div class="sc-date-range" id="${esc(id)}" data-range-key="${esc(key)}">
      <input class="sc-date-display" type="text" value="${esc(dateText(start, end))}" placeholder="请选择日期" readonly aria-label="日期范围">
      <input type="hidden" data-range-start value="${esc(start)}">
      <input type="hidden" data-range-end value="${esc(end)}">
      <span class="date-range-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></span>
    </div>`;
  }

  function field(label, control, className = '') {
    return `<div class="operations-field sc-field${className ? ` ${className}` : ''}"><label class="filter-label">${esc(label)}</label>${control}</div>`;
  }

  function renderTabs() {
    return `<div class="sc-tabs" role="tablist">
      <button type="button" role="tab" aria-selected="${state.tab === 'batch'}" class="sc-tab${state.tab === 'batch' ? ' is-active' : ''}" data-sc-action="tab" data-tab="batch">批量改价</button>
      <button type="button" role="tab" aria-selected="${state.tab === 'history'}" class="sc-tab${state.tab === 'history' ? ' is-active' : ''}" data-sc-action="tab" data-tab="history">改价记录</button>
    </div>`;
  }

  function renderBatchFilters() {
    const filters = state.batchFilters;
    const optional = state.advanced ? '' : ' hidden';
    return `<section class="operations-filter settlement-filter" data-query-filter-manual="true" data-sc-filter-scope="batch">
      <div class="sc-filter-main operations-filter-main">
        <div class="sc-filter-body">
          <div class="sc-filter-grid operations-filter-grid">
            ${field('发货日期', rangeMarkup('batch', filters.startDate, filters.endDate))}
            ${field('仓库', renderSelect('warehouse', ['中心仓', '北区仓'], filters.warehouse))}
            ${field('客户类型', renderSelect('customerType', ['学校', '幼儿园', '机关单位'], filters.customerType))}
            ${field('客户名称', renderSelect('customerName', ['静安第1中学', '静安第11中学', '育才中学'], filters.customerName))}
            ${field('状态', renderSelect('status', ['未改价', '已改价'], filters.status))}
            ${field('采购类型', renderSelect('purchaseType', ['供应商送货', '企业自加工', '市场自采'], filters.purchaseType))}
            ${field('商品分类', renderSelect('category', ['主食（米面粉点心类）', '蛋奶类-蛋奶类二级', '食油-食油二级', '果蔬-果蔬二级'], filters.category, '请选择'), `sc-optional-filter${state.advanced ? '' : ' is-hidden'}`)}
            ${field('商品名称', `<input class="filter-input" data-filter="goodsName" placeholder="请输入商品名称/编号" value="${esc(filters.goodsName)}" aria-label="商品名称">`, `sc-optional-filter${state.advanced ? '' : ' is-hidden'}`)}
          </div>
          <div class="sc-mode-field">
            <label class="filter-label">改价方式</label>
            <div class="sc-radio-list">
              <label class="sc-radio-option"><input type="radio" name="settlement-change-mode" value="date" data-sc-mode ${state.mode === 'date' ? 'checked' : ''}><span>按发货日期改价</span></label>
              <label class="sc-radio-option"><input type="radio" name="settlement-change-mode" value="order" data-sc-mode ${state.mode === 'order' ? 'checked' : ''}><span>按订单改价</span></label>
              ${state.mode === 'order' ? '<button type="button" class="btn btn-primary btn-sm sc-select-order" data-sc-action="open-picker">选择订单</button>' : ''}
            </div>
          </div>
        </div>
        <div class="sc-filter-actions operations-filter-actions">
          <button type="button" class="sc-advanced-toggle" data-sc-action="advanced"><span>高级筛选</span><span class="sc-advanced-arrow" aria-hidden="true">${state.advanced ? '⌃' : '⌄'}</span></button>
          <button type="button" class="btn btn-primary btn-sm" data-sc-action="query">查询</button>
          <button type="button" class="btn btn-sm" data-sc-action="reset">重置</button>
        </div>
      </div>
    </section>`;
  }

  function renderHistoryFilters() {
    const filters = state.historyFilters;
    return `<section class="operations-filter settlement-filter" data-query-filter-manual="true" data-sc-filter-scope="history">
      <div class="sc-filter-main operations-filter-main">
        <div class="sc-filter-body">
          <div class="sc-filter-grid operations-filter-grid">
            ${field('发货日期', rangeMarkup('history', filters.startDate, filters.endDate))}
            ${field('商品名称', `<input class="filter-input" data-filter="goodsName" placeholder="请输入商品名称/编号" value="${esc(filters.goodsName)}" aria-label="商品名称">`)}
            ${field('订单号', `<input class="filter-input" data-filter="orderNo" placeholder="请输入采购单号" value="${esc(filters.orderNo)}" aria-label="订单号">`)}
            ${field('仓库', renderSelect('warehouse', ['中心仓', '北区仓'], filters.warehouse))}
            ${field('客户类型', renderSelect('customerType', ['学校', '幼儿园', '机关单位'], filters.customerType))}
            ${field('客户名称', renderSelect('customerName', ['静安第1中学', '静安第11中学', '育才中学'], filters.customerName))}
          </div>
        </div>
        <div class="sc-filter-actions operations-filter-actions">
          <button type="button" class="btn btn-primary btn-sm" data-sc-action="query">查询</button>
          <button type="button" class="btn btn-sm" data-sc-action="reset">重置</button>
        </div>
      </div>
    </section>`;
  }

  function productName(product) {
    return `${product.name}(${product.unit}/${product.brand}/${product.spec})`;
  }

  function detailsFor(product) {
    return orderRows.slice(0, 3).map((order, index) => ({
      ...order,
      quantity: product.detailQty[index] || '0.00',
      unitPrice: index === 0 ? '1.00' : index === 1 ? '5.00' : '2.00'
    }));
  }

  function renderOrderDetailTable(product) {
    const details = detailsFor(product);
    return `<table class="sc-order-detail-table">
      <colgroup><col style="width:15%"><col style="width:16%"><col style="width:14%"><col style="width:13%"><col style="width:18%"><col style="width:10%"><col style="width:8%"><col style="width:8%"></colgroup>
      <thead><tr><th>发货日期</th><th>订单号</th><th>客户名称</th><th>食堂名称</th><th>客户类型</th><th>下单数量</th><th>状态</th><th>订单单价</th></tr></thead>
      <tbody>${details.map((order) => `<tr><td>${esc(order.shippingAt)}</td><td>${esc(order.orderNo)}</td><td>${esc(order.customerName)}</td><td>${esc(order.canteen)}</td><td>默认客户类型（全部商品）</td><td>${esc(order.quantity)}</td><td><span class="sc-status is-green">未改价</span></td><td>${esc(order.unitPrice)}</td></tr>`).join('')}</tbody>
    </table>`;
  }

  function renderBatchTable() {
    const rows = state.batchLoaded ? productRows : [];
    const allSelected = rows.length > 0 && rows.every((product) => state.selectedProducts.has(product.id));
    const body = rows.length
      ? rows.map((product, index) => {
        const expanded = state.expandedProducts.has(product.id);
        return `<tr class="sc-product-row">
          <td><button type="button" class="sc-expand-button" aria-label="${expanded ? '收起' : '展开'}${esc(product.name)}" aria-expanded="${expanded}" data-sc-action="toggle-product" data-id="${esc(product.id)}">${expanded ? '⌃' : '⌄'}</button></td>
          <td><input type="checkbox" data-sc-product-select data-id="${esc(product.id)}" ${state.selectedProducts.has(product.id) ? 'checked' : ''} aria-label="选择${esc(product.name)}"></td>
          <td>${index + 1}</td><td class="sc-product-name" title="${esc(productName(product))}">${esc(productName(product))}</td><td class="sc-category" title="${esc(product.category)}">${esc(product.category)}</td><td>${product.orderQty}</td><td>${esc(product.placedQty)}</td><td>未改价</td><td><input class="sc-price-input" data-sc-price data-id="${esc(product.id)}" value="${esc(state.prices[product.id] || '')}" placeholder="请输入" inputmode="decimal" aria-label="${esc(product.name)}改价单价"></td><td><button type="button" class="sc-cell-link" data-sc-action="order-detail" data-id="${esc(product.id)}">查看订单</button></td>
        </tr>${expanded ? `<tr class="sc-detail-row"><td colspan="10">${renderOrderDetailTable(product)}</td></tr>` : ''}`;
      }).join('')
      : '<tr><td class="sc-empty-cell" colspan="10">暂无数据</td></tr>';
    return `<div class="sc-table-box${state.batchLoaded ? ' has-data' : ''}"><table class="sc-table sc-batch-table">
      <colgroup><col style="width:44px"><col style="width:56px"><col style="width:66px"><col style="width:19%"><col style="width:11%"><col style="width:10%"><col style="width:11%"><col style="width:10%"><col style="width:14%"><col style="width:9%"></colgroup>
      <thead><tr><th></th><th><input type="checkbox" data-sc-product-all ${allSelected ? 'checked' : ''} aria-label="全选商品"></th><th>序号</th><th>商品名称（计量单位/品牌/规格）</th><th>商品分类</th><th>订单数量</th><th>商品下单数量</th><th>状态</th><th>单价</th><th>操作</th></tr></thead>
      <tbody>${body}</tbody>
    </table></div>`;
  }

  function renderHistoryTable() {
    return `<div class="sc-table-box sc-history-table-box"><table class="sc-table sc-history-table">
      <colgroup><col style="width:7%"><col style="width:13%"><col style="width:20%"><col style="width:16%"><col style="width:9%"><col style="width:11%"><col style="width:11%"><col style="width:7%"><col style="width:13%"></colgroup>
      <thead><tr><th>序号</th><th>发货日期</th><th>商品名称（计量单位/品牌/规格）</th><th>订单号</th><th>计量单位</th><th>修改前价格</th><th>修改后价格</th><th>操作人</th><th>操作时间</th></tr></thead>
      <tbody><tr><td class="sc-empty-cell" colspan="9">暂无数据</td></tr></tbody>
    </table></div>`;
  }

  function renderPagination(total = 0, modal = false) {
    return `<div class="sc-pagination${modal ? ' sc-modal-pagination' : ''}">
      <span class="sc-pagination-total">共 ${total} 条数据</span>
      <select class="sc-page-size" aria-label="每页条数"><option>20 条/页</option></select>
      <div class="sc-page-buttons"><button type="button" class="sc-page-button" disabled>‹</button><button type="button" class="sc-page-button is-current" aria-current="page">1</button><button type="button" class="sc-page-button" disabled>›</button></div>
      <label class="sc-page-jump-wrap">跳至 <input class="sc-page-jump" value="1" aria-label="跳转页码"> / 1 页</label>
    </div>`;
  }

  function renderBatchToolbar() {
    if (!state.batchLoaded) return '';
    return `<div class="sc-batch-toolbar"><button type="button" class="btn btn-primary btn-sm" data-sc-action="make-effective">修改生效</button><button type="button" class="btn btn-primary btn-sm" data-sc-action="batch-change">批量改价</button></div>`;
  }

  function renderPickerTable() {
    const rows = filteredPickerOrders();
    const selectedCount = rows.filter((order) => state.selectedOrders.has(order.id)).length;
    const allSelected = rows.length > 0 && selectedCount === rows.length;
    return `<div class="sc-picker-table-box"><table class="sc-picker-table">
      <colgroup><col style="width:8%"><col style="width:24%"><col style="width:24%"><col style="width:20%"><col style="width:24%"></colgroup>
      <thead><tr><th><input type="checkbox" data-sc-picker-all ${allSelected ? 'checked' : ''} aria-label="全选订单"></th><th>订单号</th><th>客户名称</th><th>食堂名称</th><th>发货日期</th></tr></thead>
      <tbody>${rows.length ? rows.map((order) => `<tr><td><input type="checkbox" data-sc-picker-select data-id="${esc(order.id)}" ${state.selectedOrders.has(order.id) ? 'checked' : ''} aria-label="选择${esc(order.orderNo)}"></td><td>${esc(order.orderNo)}</td><td>${esc(order.customerName)}</td><td>${esc(order.canteen)}</td><td>${esc(order.shippingAt)}</td></tr>`).join('') : '<tr><td class="sc-empty-cell" colspan="5">暂无数据</td></tr>'}</tbody>
    </table></div>`;
  }

  function renderPickerModal() {
    const filters = state.pickerFilters;
    return `<div class="sc-modal-backdrop" data-sc-backdrop><section class="sc-modal" role="dialog" aria-modal="true" aria-labelledby="settlementPickerTitle">
      <header class="sc-modal-header"><h2 id="settlementPickerTitle">选择订单</h2><button type="button" class="sc-modal-close" data-sc-action="close-modal" aria-label="关闭">×</button></header>
      <div class="sc-modal-body">
        <div class="sc-picker-filter" data-sc-picker-scope>
          <div class="sc-picker-field"><label>发货日期</label>${rangeMarkup('picker', filters.startDate, filters.endDate, 'settlement-picker-range')}</div>
          <div class="sc-picker-field"><label>订单号</label><input class="filter-input sc-picker-order-input" data-sc-picker-order placeholder="请输入采购单号" value="${esc(filters.orderNo)}" aria-label="订单号"></div>
          <div class="sc-picker-actions"><button type="button" class="btn btn-primary btn-sm" data-sc-action="picker-query">查询</button><button type="button" class="btn btn-sm" data-sc-action="picker-reset">重置</button></div>
        </div>
        <button type="button" class="btn btn-primary btn-sm sc-picker-change" data-sc-action="apply-orders">改价</button>
        ${renderPickerTable()}
        ${renderPagination(filteredPickerOrders().length, true)}
      </div>
      <footer class="sc-modal-footer"><button type="button" class="btn btn-sm" data-sc-action="close-modal">取消</button></footer>
    </section></div>`;
  }

  function renderDetailModal() {
    const product = productRows.find((item) => item.id === state.detailProduct);
    if (!product) return '';
    const rows = detailsFor(product);
    return `<div class="sc-modal-backdrop" data-sc-backdrop><section class="sc-modal is-detail" role="dialog" aria-modal="true" aria-labelledby="settlementDetailTitle">
      <header class="sc-modal-header"><h2 id="settlementDetailTitle">商品名称（计量单位/品牌/规格）：${esc(productName(product))}</h2><button type="button" class="sc-modal-close" data-sc-action="close-modal" aria-label="关闭">×</button></header>
      <div class="sc-modal-body sc-detail-body"><table class="sc-detail-table"><colgroup><col style="width:14%"><col style="width:17%"><col style="width:14%"><col style="width:14%"><col style="width:21%"><col style="width:8%"><col style="width:8%"><col style="width:8%"></colgroup><thead><tr><th>发货日期</th><th>订单号</th><th>客户名称</th><th>食堂名称</th><th>客户类型</th><th>下单数量</th><th>状态</th><th>订单单价</th></tr></thead><tbody>${rows.map((order) => `<tr><td>${esc(order.shippingAt)}</td><td>${esc(order.orderNo)}</td><td>${esc(order.customerName)}</td><td>${esc(order.canteen)}</td><td>默认客户类型（全部商品）</td><td>${esc(order.quantity)}</td><td><span class="sc-status is-green">未改价</span></td><td>${esc(order.unitPrice)}</td></tr>`).join('')}</tbody></table></div>
      <footer class="sc-modal-footer"><button type="button" class="btn btn-sm" data-sc-action="close-modal">返回</button></footer>
    </section></div>`;
  }

  function renderModal() {
    if (state.detailProduct) return renderDetailModal();
    return state.pickerOpen ? renderPickerModal() : '';
  }

  function render() {
    rangePickers.splice(0).forEach((picker) => picker?.destroy?.());
    page.className = `page-card settlement-price-change-page${state.batchLoaded ? ' is-editing' : ''}`;
    const body = state.tab === 'batch'
      ? `${renderBatchFilters()}${renderBatchToolbar()}${renderBatchTable()}${renderPagination(state.batchLoaded ? productRows.length : 0)}`
      : `${renderHistoryFilters()}${renderHistoryTable()}${renderPagination(0)}`;
    page.innerHTML = `${renderTabs()}${body}${state.toast ? `<div class="sc-toast" role="status">${esc(state.toast)}</div>` : ''}${renderModal()}`;
    mountDatePickers();
  }

  function filterBucket(key) {
    return key === 'batch' ? state.batchFilters : key === 'history' ? state.historyFilters : state.pickerFilters;
  }

  function syncDateDisplay(container, start, end) {
    const display = container?.querySelector('.sc-date-display');
    if (display) display.value = dateText(start, end);
  }

  function mountDatePickers() {
    page.querySelectorAll('.sc-date-range').forEach((container, index) => {
      const key = container.dataset.rangeKey;
      const filters = filterBucket(key);
      const picker = window.DateRangePicker?.create({
        container,
        displayInput: container.querySelector('.sc-date-display'),
        startInput: container.querySelector('[data-range-start]'),
        endInput: container.querySelector('[data-range-end]'),
        panelId: `settlementPriceChangePicker${index}`,
        onChange: ({ startDate, endDate }) => {
          filters.startDate = startDate;
          filters.endDate = endDate;
          syncDateDisplay(container, startDate, endDate);
        }
      });
      if (picker) rangePickers.push(picker);
      syncDateDisplay(container, filters.startDate, filters.endDate);
    });
  }

  function readFilters(key) {
    const filters = filterBucket(key);
    const scope = page.querySelector(`[data-sc-filter-scope="${key}"]`);
    scope?.querySelectorAll('[data-filter]').forEach((element) => {
      filters[element.dataset.filter] = String(element.value || '').trim();
    });
  }

  function readPickerFilters() {
    const input = page.querySelector('[data-sc-picker-order]');
    if (input) state.pickerFilters.orderNo = input.value.trim();
  }

  function filteredPickerOrders() {
    const { startDate, endDate, orderNo } = state.pickerFilters;
    const keyword = String(orderNo || '').toLowerCase();
    return orderRows.filter((order) => {
      const day = dateOnly(order.shippingAt);
      return (!startDate || day >= startDate) && (!endDate || day <= endDate) && (!keyword || order.orderNo.toLowerCase().includes(keyword));
    });
  }

  function notify(message) {
    clearTimeout(toastTimer);
    state.toast = message;
    render();
    toastTimer = setTimeout(() => {
      state.toast = '';
      render();
    }, 2200);
  }

  page.addEventListener('click', (event) => {
    const actionElement = event.target.closest('[data-sc-action]');
    const action = actionElement?.dataset.scAction;
    if (action === 'tab') {
      state.tab = actionElement.dataset.tab;
      state.pickerOpen = false;
      state.detailProduct = null;
      render();
      return;
    }
    if (action === 'advanced') { state.advanced = !state.advanced; render(); return; }
    if (action === 'query') {
      readFilters(state.tab);
      if (state.tab === 'batch' && state.mode === 'order') state.batchLoaded = state.selectedOrders.size > 0;
      render();
      return;
    }
    if (action === 'reset') {
      if (state.tab === 'batch') {
        state.batchFilters = { ...defaults.batch };
        state.mode = 'date';
        state.batchLoaded = false;
        state.selectedOrders.clear();
        state.selectedProducts.clear();
        state.expandedProducts = new Set(['product-1', 'product-2']);
      } else {
        state.historyFilters = { ...defaults.history };
      }
      render();
      return;
    }
    if (action === 'open-picker') { state.pickerOpen = true; state.detailProduct = null; render(); return; }
    if (action === 'close-modal' || event.target.matches('[data-sc-backdrop]')) {
      state.pickerOpen = false;
      state.detailProduct = null;
      render();
      return;
    }
    if (action === 'picker-query') { readPickerFilters(); render(); return; }
    if (action === 'picker-reset') { state.pickerFilters = { ...defaults.picker }; render(); return; }
    if (action === 'apply-orders') {
      const rows = filteredPickerOrders();
      if (!rows.length) { notify('没有可改价的订单'); return; }
      const selected = rows.filter((order) => state.selectedOrders.has(order.id));
      state.selectedOrders = new Set((selected.length ? selected : rows).map((order) => order.id));
      state.batchLoaded = true;
      state.mode = 'order';
      state.pickerOpen = false;
      state.detailProduct = null;
      state.selectedProducts.clear();
      state.expandedProducts = new Set(['product-1', 'product-2']);
      render();
      return;
    }
    if (action === 'toggle-product') {
      const id = actionElement.dataset.id;
      state.expandedProducts.has(id) ? state.expandedProducts.delete(id) : state.expandedProducts.add(id);
      render();
      return;
    }
    if (action === 'order-detail') {
      const product = productRows.find((item) => item.id === actionElement.dataset.id);
      if (product) { state.detailProduct = product.id; state.pickerOpen = false; render(); }
      return;
    }
    if (action === 'make-effective') { notify('已提交改价生效'); return; }
    if (action === 'batch-change') { notify(state.selectedProducts.size ? `已批量改价${state.selectedProducts.size}项` : '请先选择商品'); return; }
  });

  page.addEventListener('change', (event) => {
    if (event.target.matches('[data-sc-mode]')) {
      state.mode = event.target.value;
      state.batchLoaded = state.mode === 'order' && state.selectedOrders.size > 0;
      render();
      return;
    }
    if (event.target.matches('[data-sc-product-select]')) {
      event.target.checked ? state.selectedProducts.add(event.target.dataset.id) : state.selectedProducts.delete(event.target.dataset.id);
      return;
    }
    if (event.target.matches('[data-sc-product-all]')) {
      productRows.forEach((product) => event.target.checked ? state.selectedProducts.add(product.id) : state.selectedProducts.delete(product.id));
      render();
      return;
    }
    if (event.target.matches('[data-sc-picker-select]')) {
      event.target.checked ? state.selectedOrders.add(event.target.dataset.id) : state.selectedOrders.delete(event.target.dataset.id);
      return;
    }
    if (event.target.matches('[data-sc-picker-all]')) {
      filteredPickerOrders().forEach((order) => event.target.checked ? state.selectedOrders.add(order.id) : state.selectedOrders.delete(order.id));
      render();
    }
  });

  page.addEventListener('input', (event) => {
    if (event.target.matches('[data-sc-price]')) state.prices[event.target.dataset.id] = event.target.value;
  });

  render();
})();
