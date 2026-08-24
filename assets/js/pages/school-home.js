(function () {
  const palette = ['#1a9bff', '#23d4bb', '#ffc857', '#8e7dff', '#ff7c8c', '#64b5ff', '#57d399', '#f58b56'];
  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  const display = (value, fallback = '--') => value == null || value === '' ? fallback : escapeHtml(value);
  const formatNumber = (value, decimals = 0) => Number(value || 0).toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
  const icon = (name) => window.AppMenuConfig?.icons?.[name] || '';

  const view = {
    priceCategory: '主食（米面粉点心类）',
    categories: ['主食（米面粉点心类）', '食油', '果蔬', '肉（豆）制品', '水产品', '蛋奶类', '调料', '其他材料'],
    prices: [
      { name: '大米', price: 19, category: '主食（米面粉点心类）' },
      { name: '鲫鱼', price: 20, category: '水产品' },
      { name: '黑大米', price: 10, category: '主食（米面粉点心类）' },
      { name: '大玉米棒子', price: 5, category: '主食（米面粉点心类）' },
      { name: '黑面', price: 5, category: '主食（米面粉点心类）' },
      { name: '金龙鱼豆油', price: 50, category: '食油' },
      { name: '香蕉', price: 30, category: '果蔬' },
      { name: '黑猪肉', price: 38, category: '肉（豆）制品' }
    ],
    structure: [
      { name: '主食（米面粉点心类）', value: 2.49 },
      { name: '果蔬', value: 2.19 },
      { name: '肉（豆）制品', value: 0.95 },
      { name: '其他材料', value: 0.75 },
      { name: '调料', value: 0.51 },
      { name: '蛋奶类', value: 0.51 },
      { name: '食油', value: 0.19 },
      { name: '水产品', value: 0.01 }
    ],
    rank: [
      ['黑虎虾', 5.52], ['测试（大米）', 2.06], ['香蕉', 0.62], ['黑猪肉', 0.55], ['青鱼', 0.30],
      ['苹果', 0.26], ['三元牛奶', 0.26], ['鸡蛋', 0.24], ['鲫鱼', 0.24], ['大米', 0.23]
    ],
    trend: [0, 0.2, 8.7, 2.6, 0.2, 0.2],
    ticketed: 12,
    unticketed: 24
  };

  function gradient(values) {
    const total = values.reduce((sum, item) => sum + Math.max(Number(item.value) || 0, 0), 0);
    if (!total) return 'conic-gradient(#1b4168 0 100%)';
    let cursor = 0;
    return `conic-gradient(${values.map((item, index) => {
      const start = cursor;
      cursor += Math.max(Number(item.value) || 0, 0) / total * 100;
      return `${palette[index % palette.length]} ${start.toFixed(2)}% ${cursor.toFixed(2)}%`;
    }).join(', ')})`;
  }

  function donut(values, center, label, className = '') {
    return `<div class="dashboard-donut school-donut ${className}" style="--donut-bg:${gradient(values)}"><div class="dashboard-donut-center"><strong>${escapeHtml(center)}</strong><span>${escapeHtml(label)}</span></div></div>`;
  }

  function panel(title, body, className = '') {
    return `<section class="dashboard-panel ${className}"><div class="dashboard-panel-title"><span class="dashboard-title-mark"></span><span>${escapeHtml(title)}</span></div><div class="dashboard-panel-body">${body}</div></section>`;
  }

  function statPanel(title, value, unit, iconName, className) {
    return panel(title, `<div class="school-stat-card"><span class="school-stat-icon">${icon(iconName)}</span><div><strong>${escapeHtml(value)}</strong><span>${escapeHtml(unit)}</span></div></div>`, className);
  }

  function renderPurchasePanel() {
    return panel('采购总金额（万元）', `<div class="school-total-amount"><strong>11.39</strong><span>累计采购金额</span></div>`, 'school-total-panel');
  }

  function renderSupplierPanel() {
    const values = [{ value: 2 }, { value: 0.4 }, { value: 0.2 }];
    return panel('供应商数据', `<div class="school-supplier-layout">${donut(values, '2', '供应商总数')}<div class="school-supplier-stats"><strong>2</strong><span>供应商总数</span><strong>0次</strong><span>评价总数</span><strong>0分</strong><span>平均得分</span></div></div>`, 'school-supplier-panel');
  }

  function renderProductPanel() {
    return panel('商品数据', `<div class="school-product-summary"><span class="school-stat-icon">${icon('box')}</span><div><strong>8大类 36小类</strong><span>商品总数</span></div></div>`, 'school-product-panel');
  }

  function renderPricePanel() {
    const rows = view.prices.filter((item) => item.category === view.priceCategory || view.priceCategory === '全部');
    const pairs = [];
    for (let index = 0; index < rows.length; index += 2) pairs.push([rows[index], rows[index + 1]]);
    const tabs = ['全部', ...view.categories].map((category) => `<button type="button" class="dashboard-tab ${category === view.priceCategory ? 'is-active' : ''}" data-school-price="${escapeHtml(category)}">${escapeHtml(category)}</button>`).join('');
    const body = pairs.length ? `<table class="dashboard-table school-price-table"><thead><tr><th>商品名称</th><th>最近一次报价</th><th>商品名称</th><th>最近一次报价</th></tr></thead><tbody>${pairs.map(([left, right]) => `<tr><td>${display(left?.name)}</td><td class="is-number">${left ? `${formatNumber(left.price)}元` : '--'}</td><td>${display(right?.name)}</td><td class="is-number">${right ? `${formatNumber(right.price)}元` : '--'}</td></tr>`).join('')}</tbody></table>` : '<div class="dashboard-empty">暂无商品价格数据</div>';
    return panel('商品价格', `<div class="dashboard-tabs school-price-tabs">${tabs}</div>${body}`, 'school-price-panel');
  }

  function renderStructurePanel() {
    const total = view.structure.reduce((sum, item) => sum + item.value, 0);
    const legend = view.structure.map((item, index) => `<li><i style="--legend-color:${palette[index % palette.length]}"></i><span>${display(item.name)}</span><strong>${formatNumber(item.value, 2)}万</strong></li>`).join('');
    return panel('采购商品结构', `<div class="dashboard-chart-layout school-structure-layout">${donut(view.structure, formatNumber(total, 2), '采购额')}<ul class="dashboard-legend">${legend}</ul></div>`, 'school-structure-panel');
  }

  function renderRankPanel() {
    const body = `<table class="dashboard-table school-rank-table"><thead><tr><th>排名</th><th>商品名称</th><th>金额(万元)</th></tr></thead><tbody>${view.rank.map(([name, amount], index) => `<tr><td>${index + 1}</td><td>${display(name)}</td><td class="is-number">${formatNumber(amount, 2)}</td></tr>`).join('')}</tbody></table>`;
    return panel('采购商品排行（TOP 10）', body, 'school-rank-panel');
  }

  function renderQualityPanel() {
    const values = [{ value: view.ticketed }, { value: view.unticketed }];
    return panel('验货质量', `<div class="school-quality-tabs"><span class="is-active">商品票证占比</span><span>验货保质期剩余情况</span></div><div class="school-quality-layout">${donut(values, formatNumber(view.ticketed), '有票证商品数')}<div class="school-quality-legend"><span>有票证商品数 <strong>${formatNumber(view.ticketed)}</strong></span><span>无票证商品数 <strong>${formatNumber(view.unticketed)}</strong></span><span>已过期 <strong>0</strong></span></div></div>`, 'school-quality-panel');
  }

  function renderTrendPanel() {
    const width = 520;
    const height = 154;
    const max = Math.max(...view.trend, 1);
    const points = view.trend.map((value, index) => `${18 + (width - 36) * index / (view.trend.length - 1)},${116 - value / max * 82}`).join(' ');
    const labels = view.trend.map((value, index) => `<text x="${18 + (width - 36) * index / (view.trend.length - 1)}" y="145" text-anchor="middle">2026-${String(index + 3).padStart(2, '0')}</text>`).join('');
    return panel('采购趋势', `<svg class="school-trend-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="采购趋势折线图"><line x1="18" y1="116" x2="${width - 18}" y2="116"></line><line x1="18" y1="76" x2="${width - 18}" y2="76"></line><line x1="18" y1="36" x2="${width - 18}" y2="36"></line><polyline points="${points}"></polyline>${labels}</svg>`, 'school-trend-panel');
  }

  function renderCanteenRankPanel() {
    return panel('食堂采购排行', `<div class="school-canteen-rank"><div><b>1</b><span>第一食堂</span><i><em style="width:100%"></em></i><strong>11.39</strong></div></div>`, 'school-canteen-rank-panel');
  }

  const content = `<div class="page-card enterprise-home-page school-dashboard-page"><div class="enterprise-dashboard" id="schoolDashboard"><div class="dashboard-screen"><header class="dashboard-screen-header"><div class="dashboard-header-decoration dashboard-header-decoration-left"></div><div class="dashboard-heading"><h1>静安第一中学数据平台</h1><p>2026.08.19 星期三 13:06:25</p></div><div class="dashboard-header-decoration dashboard-header-decoration-right"></div><button type="button" class="dashboard-fullscreen" data-school-dashboard-action="fullscreen" aria-label="全屏查看">⛶</button></header><div class="dashboard-grid school-dashboard-grid">${statPanel('食堂数据', '1', '食堂总数', 'warehouse', 'school-canteen-panel')}${renderPurchasePanel()}${renderSupplierPanel()}${renderProductPanel()}${renderPricePanel()}${renderStructurePanel()}${renderRankPanel()}${renderQualityPanel()}${renderTrendPanel()}${renderCanteenRankPanel()}</div></div></div></div>`;
  const root = window.AppShell.mount({ title: '首页', content, variant: 'school', emptyText: '学校端首页' });

  root.addEventListener('click', (event) => {
    const priceTab = event.target.closest('[data-school-price]');
    if (priceTab) {
      view.priceCategory = priceTab.dataset.schoolPrice || '全部';
      const pricePanel = root.querySelector('.school-price-panel');
      if (pricePanel) pricePanel.outerHTML = renderPricePanel();
      return;
    }
    const action = event.target.closest('[data-school-dashboard-action]');
    if (action?.dataset.schoolDashboardAction === 'fullscreen') {
      const dashboard = root.querySelector('#schoolDashboard');
      if (document.fullscreenElement === dashboard) document.exitFullscreen?.().catch?.(() => {});
      else dashboard?.requestFullscreen?.().catch(() => dashboard?.classList.toggle('is-expanded'));
    }
  });
})();
