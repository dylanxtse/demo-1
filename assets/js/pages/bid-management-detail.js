(function () {
  const service = window.BiddingService;
  const params = new URLSearchParams(window.location.search);
  const bidId = params.get('id') || '';
  const bids = service?.get('bids') || [];
  const bid = bids.find((item) => item.id === bidId);
  const esc = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  const display = (value, fallback = '--') => value == null || value === '' ? fallback : esc(value);

  function formatDate(value, fallback = '--') {
    if (!value) return fallback;
    const match = String(value).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    return match ? `${match[1]}-${Number(match[2])}-${Number(match[3])}` : display(value, fallback);
  }

  function formatDateTime(value, fallback = '--') {
    if (!value) return fallback;
    const match = String(value).match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?/);
    if (!match) return display(value, fallback);
    const time = match[4] ? ` ${match[4].padStart(2, '0')}:${match[5]}` : '';
    return `${match[1]}-${Number(match[2])}-${Number(match[3])}${time}`;
  }

  function daysToOpen(value) {
    if (!value) return 0;
    const timestamp = new Date(String(value).replace(/-/g, '/')).getTime();
    if (Number.isNaN(timestamp)) return 0;
    return Math.max(0, Math.ceil((timestamp - Date.now()) / 86400000));
  }

  function renderNotFound() {
    const root = window.AppShell.mount({
      title: '查看竞价',
      variant: 'education',
      emptyText: '竞价不存在'
    });
    root.querySelector('.page-empty-state').style.display = 'flex';
  }

  if (!bid) {
    renderNotFound();
    return;
  }

  const suppliers = service.get('suppliers') || [];
  const rules = service.get('rules') || [];
  const rule = rules.find((item) => item.id === bid.ruleId);
  const isOpened = bid.status === '已开标';

  function findSupplier(id, fallbackName) {
    return suppliers.find((item) => item.id === id) || { id, name: fallbackName || id };
  }

  const supplierRows = (bid.supplierIds || []).map((id, index) => {
    const supplier = findSupplier(id, bid.supplierNames?.[index]);
    const isWinner = Boolean(bid.winnerSupplier && bid.winnerSupplier === supplier.name);
    return {
      id,
      name: supplier.name,
      status: isOpened ? '已参与报价' : bid.status === '待开标' ? '报价中' : '待报价',
      result: isWinner ? '中标' : isOpened ? '未中标' : '--'
    };
  });

  // The open-bid screenshot contains two concrete quote results. Keep these as
  // demo records so opened bids never render an empty quote panel.
  const quoteSeeds = {
    'BID-002': [
      { supplierId: 'SUP-004', total: '2000.00', rank: 1, result: '中标' },
      { supplierId: 'SUP-003', total: '2500.00', rank: 2, result: '未中标' }
    ],
    'BID-007': [
      { supplierId: 'SUP-004', total: '2000.00', rank: 1, result: '中标' },
      { supplierId: 'SUP-003', total: '2500.00', rank: 2, result: '未中标' }
    ]
  };

  const defaultQuoteSeeds = (bid.supplierIds || []).map((supplierId, index) => ({
    supplierId,
    total: (2000 + index * 500).toFixed(2),
    rank: index + 1,
    result: index === 0 ? '中标' : '未中标'
  }));
  const quoteRows = (quoteSeeds[bid.id] || defaultQuoteSeeds).map((item) => {
    const supplier = findSupplier(item.supplierId);
    return {
      ...item,
      name: supplier.name,
      contact: `${supplier.contact || '默认'}（${supplier.phone || '--'}）`,
      creditCode: '--',
      ip: '124.238.62.232',
      quoteStatus: '已报价'
    };
  }).sort((left, right) => left.rank - right.rank);

  const products = service.get('products') || [];
  const normalizeCategory = (value) => String(value || '').replace(/（三级）|\(三级\)/g, '').trim();
  const bidCategories = bid.categories || [];
  const categoryForProduct = (product) => bidCategories.find((category) => normalizeCategory(category) === normalizeCategory(product.category)) || product.category || '--';
  const categoryProducts = products.filter((product) => bidCategories.some((category) => normalizeCategory(category) === normalizeCategory(product.category)));
  const selectedProducts = (categoryProducts.length ? categoryProducts : products).slice(0, Math.max(1, Math.min(8, bid.varietyCount || 8)));
  const demandRows = (selectedProducts.length ? selectedProducts : [{ id: `${bid.id}-ITEM-001`, code: `${bid.projectNo}-001`, name: bidCategories[0] || '竞价商品', category: bidCategories[0] || '--', unit: '--', brand: '--', spec: '--' }]).map((product, index) => ({
    image: product.image || '--',
    code: product.code || `${bid.projectNo}-${String(index + 1).padStart(3, '0')}`,
    name: `${product.name || '--'}（${product.unit || '--'}/${product.brand || '--'}/${product.spec || '--'}）`,
    category: categoryForProduct(product),
    netContent: product.spec || '--',
    quantity: bid.itemQuantity && selectedProducts.length === 1 ? bid.itemQuantity : String(120 + index * 20)
  }));

  const infoFields = [
    { label: '竞价名称', value: `${bid.name || '--'}（${bid.bidNo || '--'}）` },
    { label: '供货周期', value: `${formatDate(bid.supplyStart)} ~ ${formatDate(bid.supplyEnd)}`, emphasis: true },
    { label: '需求截止时间', value: formatDateTime(bid.demandDeadline) },
    { label: '开始报价时间', value: formatDateTime(bid.quoteStart) },
    { label: '截止报价时间', value: formatDateTime(bid.quoteEnd) },
    { label: '开标时间', value: formatDateTime(bid.openTime) },
    { label: '标段', value: bid.segmentName },
    { label: '添加人', value: bid.creator || '默认' },
    { label: '添加时间', value: formatDateTime(bid.createdAt || bid.addTime || bid.demandDeadline) },
    { label: '需求量加密', value: bid.encryption ? '是' : '--' }
  ];

  function field(item) {
    return `<div class="bidding-detail-field${item.emphasis ? ' is-emphasis' : ''}"><span>${item.label}：</span><strong>${display(item.value)}</strong></div>`;
  }

  function emptyRow(colspan, message = '暂无数据') {
    return `<tr><td class="bidding-detail-empty" colspan="${colspan}">${message}</td></tr>`;
  }

  const quoteDetailSeeds = {
    'SUP-004': [
      { name: '盐城大米', code: 'SP0015...', category: '米', packageType: '袋', quantity: '20kg', latest: '50.00', quote: '50.00', subtotal: '1000.00' },
      { name: '黑龙江五常大米', code: 'SP0016...', category: '米', packageType: '袋', quantity: '10袋', latest: '100.00', quote: '100.00', subtotal: '1000.00' }
    ],
    'SUP-003': [
      { name: '盐城大米', code: 'SP0015...', category: '米', packageType: '袋', quantity: '20kg', latest: '60.00', quote: '60.00', subtotal: '1200.00' },
      { name: '黑龙江五常大米', code: 'SP0016...', category: '米', packageType: '袋', quantity: '10袋', latest: '130.00', quote: '130.00', subtotal: '1300.00' }
    ]
  };

  function getQuoteDetailRows(supplierId) {
    return quoteDetailSeeds[supplierId] || [
      { name: '竞价商品一', code: 'SP0001...', category: '食材', packageType: '袋', quantity: '10kg', latest: '50.00', quote: '50.00', subtotal: '500.00' },
      { name: '竞价商品二', code: 'SP0002...', category: '食材', packageType: '箱', quantity: '10箱', latest: '50.00', quote: '50.00', subtotal: '500.00' }
    ];
  }

  function formatMoney(value) {
    const amount = Number(value);
    return Number.isFinite(amount) ? amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : display(value);
  }

  function renderQuoteDetailModal(supplierId) {
    const supplier = findSupplier(supplierId);
    const quote = quoteRows.find((row) => row.supplierId === supplierId);
    const rows = getQuoteDetailRows(supplierId);
    const total = rows.reduce((sum, row) => sum + Number(row.subtotal || 0), 0);
    const totalText = formatMoney(quote?.total || total);
    const itemRows = rows.map((row) => `<tr><td><span class="bidding-quote-image-placeholder">--</span></td><td><strong>${display(row.name)}</strong><small>${display(row.code)}</small></td><td>${display(row.category)}</td><td>${display(row.quantity)}</td><td>${display(row.latest)}</td><td>${display(row.quote)}</td><td>${display(formatMoney(row.subtotal))}</td></tr>`).join('');
    return `<div class="bidding-quote-modal" data-quote-modal role="dialog" aria-modal="true" aria-label="供应商报价详情"><div class="bidding-quote-modal-card"><header class="bidding-quote-modal-header"><h3>供应商报价详情</h3><button type="button" class="bidding-quote-modal-close" data-quote-modal-close aria-label="关闭">×</button></header><div class="bidding-quote-modal-meta"><span>供应商名称：<strong>${display(supplier.name)}</strong></span><span>统一社会信用代码：<strong>${display(supplier.licenseCode)}</strong></span><span>联系方式：<strong>${display(supplier.contact || '默认')}（${display(supplier.phone)}</strong>）</span></div><div class="bidding-quote-modal-table-wrap"><table class="bidding-quote-modal-table"><thead><tr><th>图片</th><th>商品（编号/品牌/规格/指标说明）</th><th>分类</th><th>预估数量</th><th>最新一次<br>中标价(元)</th><th>报价(元)</th><th>小计(元)</th></tr></thead><tbody>${itemRows}<tr class="bidding-quote-modal-total"><td>总计</td><td colspan="5"></td><td>${totalText}</td></tr></tbody></table></div><footer class="bidding-quote-modal-footer pagination"><span class="page-total">共 ${rows.length} 条数据</span><select class="page-size-select" aria-label="每页条数"><option>10 条/页</option></select><div class="page-btns"><button type="button" class="page-btn active" aria-current="page">1</button></div><div class="page-jump"><span>跳至</span><input class="pagination-jump-input" value="1" aria-label="跳转页码" readonly><span>页</span></div></footer></div></div>`;
  }

  function renderSummaryPanel() {
    const rows = demandRows.map((row) => `<tr><td>${display(row.image)}</td><td>${display(row.code)}</td><td>${display(row.name)}</td><td>${display(row.category)}</td><td>${display(row.netContent)}</td><td>${display(row.quantity)}</td></tr>`).join('');
    return `<table class="bidding-detail-table bidding-detail-summary-table"><thead><tr><th>图片</th><th>商品编号</th><th>商品名称（计量单位/品牌/规格）</th><th>分类</th><th>净含量</th><th>预估数量</th></tr></thead><tbody>${rows || emptyRow(6)}</tbody></table>`;
  }

  function renderSchoolPanel() {
    const schoolRow = `<tr><td>${display(bid.school)}</td><td>${display(bid.schoolContact || '默认')}</td><td>${display(Math.max(1, bidCategories.length))}</td><td>${display(isOpened || bid.status === '待开标' ? '已填报' : '待填报')}</td></tr>`;
    return `<table class="bidding-detail-table bidding-detail-school-table"><thead><tr><th>学校名称</th><th>学校负责人联系方式</th><th>需求商品种类数</th><th>状态</th></tr></thead><tbody>${schoolRow}</tbody></table>`;
  }

  function renderSupplierPanel(filter = 'quoted') {
    if (!isOpened) {
      if (bid.status === '待开标') {
        const rows = supplierRows.map((row) => `<tr><td>${display(row.name)}</td><td>${display(row.status)}</td><td>${formatDateTime(bid.quoteStart)}</td></tr>`).join('');
        return `<table class="bidding-detail-table bidding-detail-pending-quote-table"><thead><tr><th>供应商名称</th><th>报价状态</th><th>报价时间</th></tr></thead><tbody>${rows || emptyRow(3)}</tbody></table>`;
      }
      return `<div class="bidding-detail-status-empty"><strong>${bid.status === '暂存' ? '竞价尚未发布' : `当前状态：${display(bid.status)}`}</strong><span>开标后展示供应商报价信息。</span></div>`;
    }

    const rows = quoteRows
      .filter((row) => filter !== 'quoted' || row.quoteStatus === '已报价')
      .map((row) => `<tr><td>${display(row.name)}</td><td>${display(row.contact)}</td><td>${display(row.creditCode)}</td><td><button type="button" class="bidding-quote-total" data-quote-detail="${display(row.supplierId)}">${display(row.total)}</button></td><td>${display(row.rank)}</td><td>${display(row.ip)}</td><td><span class="bidding-quote-status ${row.result === '中标' ? 'is-winner' : 'is-loser'}">${display(row.result)}</span></td></tr>`)
      .join('');
    return `<table class="bidding-detail-table bidding-detail-quote-table"><thead><tr><th>供应商名称</th><th>联系方式</th><th>统一社会信用代码</th><th>报价合计（元）</th><th>价格排名</th><th>IP地址</th><th>状态</th></tr></thead><tbody>${rows || emptyRow(7)}</tbody></table>`;
  }

  function renderEvaluationPanel() {
    return `<div class="bidding-review-field-list"><div><strong>评标时间：</strong><span>${formatDateTime(bid.reviewTime || bid.openTime)}</span></div><div><strong>评标人员：</strong><span>${display(bid.reviewer || '默认')}</span></div><div><strong>评标地点：</strong><span>${display(bid.reviewPlace || bid.openPlace)}</span></div><div><strong>备注：</strong><span>${display(bid.reviewRemark || '--')}</span></div><div class="bidding-review-image-field"><strong>评标现场图片：</strong><span><img src="./assets/images/bid-review-photo.png" alt="评标现场图片"></span></div></div>`;
  }

  function renderRulesPanel() {
    const firstRule = rule?.rows?.[0];
    const supplierLimit = bid.supplierWinLimit ?? (bid.supplierIds || []).length;
    return `<div class="bidding-rule-field-panel"><div class="bidding-rule-field-grid"><div><strong>竞价规则名称：</strong><span>${display(rule?.name)}</span></div><div><strong>竞价方式：</strong><span>${display(rule?.way)}</span></div><div><strong>开标方式：</strong><span>${display(rule?.openWay)}</span></div><div><strong>指定供应商数：</strong><span>${bid.winnerLimit === 0 ? '不限制' : display(bid.winnerLimit)}</span></div><div><strong>供应商允许中标数量：</strong><span>${display(supplierLimit)}</span></div></div><div class="bidding-rule-detail"><h4>竞价规则1：</h4><div><strong>竞价规则：</strong><span>${display(firstRule?.winRule)}</span></div><div><strong>废标规则：</strong><span>${display(firstRule?.voidRule)}</span></div></div></div>`;
  }

  function renderPanel(name, filter = 'quoted') {
    if (name === 'school') return renderSchoolPanel();
    if (name === 'suppliers') return renderSupplierPanel(filter);
    if (name === 'evaluation') return renderEvaluationPanel();
    if (name === 'rules') return renderRulesPanel();
    return renderSummaryPanel();
  }

  function renderFilter(name) {
    if (!isOpened || name !== 'suppliers') return '';
    return `<select class="bidding-detail-quote-filter" data-quote-filter aria-label="供应商报价筛选"><option value="quoted">已报价的供应商</option><option value="all">全部供应商</option></select>`;
  }

  const tabs = [
    { key: 'summary', label: '需求汇总' },
    { key: 'school', label: '学校需求明细' },
    { key: 'suppliers', label: '供应商报价情况' },
    ...(isOpened ? [{ key: 'evaluation', label: '评标信息' }] : []),
    { key: 'rules', label: '竞价规则' }
  ];
  const days = daysToOpen(bid.openTime);
  const statusText = isOpened || bid.status === '已停止'
    ? `状态：${display(bid.status)}`
    : `状态：${display(bid.status)}，距离开标时间还有 ${days} 天`;
  const content = `
    <div class="page-card bidding-detail-page" id="bidDetailPage">
      <header class="bidding-detail-header">
        <div class="bidding-detail-heading">
          <button class="back-link bidding-back-button" type="button" data-action="back"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"></path><path d="M19 12H9"></path></svg><span>返回</span></button>
          <h2>查看竞价</h2>
        </div>
        <div class="bidding-detail-status">${statusText}</div>
      </header>
      <section class="bidding-detail-info" aria-label="竞价信息">
        ${infoFields.map(field).join('')}
      </section>
      <div class="bidding-detail-tabs-row">
        <nav class="bidding-detail-tabs" aria-label="竞价详情导航" style="--bidding-tab-count:${tabs.length}">
          ${tabs.map((tab, index) => `<button class="${index === 0 ? 'is-active' : ''}" type="button" data-detail-tab="${tab.key}">${tab.label}</button>`).join('')}
        </nav>
        <div class="bidding-detail-filter-slot" data-detail-filter>${renderFilter('summary')}</div>
      </div>
      <section class="bidding-detail-panel" data-detail-panel="summary">${renderPanel('summary')}</section>
    </div>`;

  const root = window.AppShell.mount({ title: '查看竞价', content, variant: 'education', emptyText: '竞价详情' });
  const detail = root.querySelector('#bidDetailPage');

  detail.addEventListener('click', (event) => {
    const quoteTrigger = event.target.closest('[data-quote-detail]');
    if (quoteTrigger) {
      detail.querySelector('[data-quote-modal]')?.remove();
      detail.insertAdjacentHTML('beforeend', renderQuoteDetailModal(quoteTrigger.dataset.quoteDetail));
      return;
    }
    if (event.target.closest('[data-quote-modal-close]') || event.target.matches('[data-quote-modal]')) {
      detail.querySelector('[data-quote-modal]')?.remove();
      return;
    }
    const tab = event.target.closest('[data-detail-tab]');
    if (tab) {
      const name = tab.dataset.detailTab;
      detail.querySelectorAll('[data-detail-tab]').forEach((item) => item.classList.toggle('is-active', item === tab));
      detail.querySelector('[data-detail-panel]').innerHTML = renderPanel(name);
      detail.querySelector('[data-detail-filter]').innerHTML = renderFilter(name);
      return;
    }
    if (event.target.closest('[data-action="back"]')) window.AppNavigation?.navigate?.('./bid-management.html');
  });

  detail.addEventListener('change', (event) => {
    if (!event.target.matches('[data-quote-filter]')) return;
    detail.querySelector('[data-detail-panel]').innerHTML = renderPanel('suppliers', event.target.value);
  });
})();
