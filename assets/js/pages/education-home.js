(function () {
  const viewState = { projectStatus: '全部' };
  const statusOrder = ['暂存', '需求提报中', '待开标', '已开标', '已停止'];
  const activeStatuses = new Set(['暂存', '需求提报中', '待开标']);
  const statusColors = ['#ffc857', '#1a9bff', '#8e7dff', '#23d4bb', '#ff7c8c'];
  const educationOverview = {
    supplierCount: 4,
    schoolCount: 20,
    activeBidCount: 8,
    todoCount: 12
  };

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const number = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const formatNumber = (value) => number(value).toLocaleString('zh-CN');
  const display = (value, fallback = '--') => value == null || value === '' ? fallback : escapeHtml(value);
  const unique = (values) => [...new Set(values.filter((value) => value !== '' && value != null))];
  const icon = (name) => window.AppMenuConfig?.icons?.[name] || '';
  const dateKey = (value) => String(value || '').match(/\d{4}-\d{2}-\d{2}/)?.[0] || '';

  function latestDate(records, fields) {
    const dates = (records || [])
      .flatMap((record) => fields.map((field) => dateKey(record[field])))
      .filter(Boolean)
      .sort();
    return dates[dates.length - 1] || '--';
  }

  function periodText(bid) {
    const start = dateKey(bid.supplyStart);
    const end = dateKey(bid.supplyEnd);
    return start && end ? `${start.slice(5)} ~ ${end.slice(5)}` : '--';
  }

  function gradient(values, palette = statusColors) {
    const total = values.reduce((sum, item) => sum + Math.max(number(item.value), 0), 0);
    if (!total) return 'conic-gradient(#1b4168 0 100%)';
    let cursor = 0;
    return `conic-gradient(${values.map((item, index) => {
      const start = cursor;
      cursor += Math.max(number(item.value), 0) / total * 100;
      return `${palette[index % palette.length]} ${start.toFixed(2)}% ${cursor.toFixed(2)}%`;
    }).join(', ')})`;
  }

  function donut(values, center, palette = statusColors) {
    return `<div class="dashboard-donut" style="--donut-bg:${gradient(values, palette)}"><div class="dashboard-donut-center"><strong>${escapeHtml(center)}</strong><span>项目数</span></div></div>`;
  }

  function panel(title, body, className = '', meta = '') {
    return `<section class="dashboard-panel ${className}">
      <div class="dashboard-panel-title"><span class="dashboard-title-mark"></span><span>${title}</span>${meta ? `<small>${meta}</small>` : ''}</div>
      <div class="dashboard-panel-body">${body}</div>
    </section>`;
  }

  function metricCard(label, value, unit, iconName, link) {
    return `<button type="button" class="dashboard-stat-card" data-dashboard-link="${escapeHtml(link)}">
      <span class="dashboard-stat-icon">${icon(iconName)}</span>
      <span class="dashboard-stat-copy"><span class="dashboard-stat-label">${label}</span><span class="dashboard-stat-value">${escapeHtml(value)}<em>${unit}</em></span></span>
    </button>`;
  }

  function makeViewModel() {
    const source = window.BiddingService?.getState?.() || {};
    const bids = source.bids || [];
    const suppliers = source.suppliers || [];
    const limits = source.limits || [];
    const relationships = source.relationships || [];
    const statusValues = statusOrder.map((name) => ({ name, value: bids.filter((bid) => bid.status === name).length }));
    const schools = new Map();
    bids.forEach((bid) => {
      const name = bid.school || '未指定学校';
      const row = schools.get(name) || { name, bids: 0, active: 0, varieties: 0, suppliers: new Set(), nextDate: '' };
      row.bids += 1;
      row.active += activeStatuses.has(bid.status) ? 1 : 0;
      row.varieties += number(bid.varietyCount);
      (bid.supplierIds || []).forEach((id) => row.suppliers.add(id));
      if (!row.nextDate || dateKey(bid.supplyStart) < row.nextDate) row.nextDate = dateKey(bid.supplyStart);
      schools.set(name, row);
    });
    const schoolRows = [...schools.values()].sort((a, b) => b.bids - a.bids).map((row) => ({ ...row, supplierCount: row.suppliers.size }));

    const supplierNameById = new Map(suppliers.map((supplier) => [supplier.id, supplier.name]));
    const supplierRows = suppliers.map((supplier) => {
      const participated = bids.filter((bid) => (bid.supplierIds || []).includes(supplier.id));
      const awarded = relationships.filter((row) => row.supplierId === supplier.id).length;
      return { name: supplier.name, bids: participated.length, active: participated.filter((bid) => activeStatuses.has(bid.status)).length, awarded };
    }).sort((a, b) => b.bids - a.bids);
    const missingSupplierRows = unique(bids.flatMap((bid) => bid.supplierIds || []))
      .filter((id) => !supplierNameById.has(id))
      .map((id) => ({ name: id, bids: bids.filter((bid) => (bid.supplierIds || []).includes(id)).length, active: 0, awarded: 0 }));

    const limitCategories = new Map();
    limits.forEach((limit) => {
      const category = String(limit.category || '其他材料').split('-')[0];
      limitCategories.set(category, (limitCategories.get(category) || 0) + 1);
    });
    const limitRows = [...limitCategories.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
    const trendMap = new Map();
    bids.forEach((bid) => {
      const month = dateKey(bid.supplyStart).slice(0, 7) || '待定';
      trendMap.set(month, (trendMap.get(month) || 0) + 1);
    });
    const trendRows = [...trendMap.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([label, value]) => ({ label: label === '待定' ? label : label.slice(5), value }));
    const projectRows = [...bids].sort((a, b) => String(a.supplyStart || '').localeCompare(String(b.supplyStart || '')));
    const pendingRows = bids.filter((bid) => activeStatuses.has(bid.status)).sort((a, b) => String(a.openTime || '').localeCompare(String(b.openTime || '')));
    const categoryCount = unique(bids.flatMap((bid) => bid.categories || [])).length;
    const activeCount = bids.filter((bid) => activeStatuses.has(bid.status)).length;
    const completedCount = bids.filter((bid) => bid.status === '已开标').length;
    const todoCount = bids.filter((bid) => ['暂存', '需求提报中'].includes(bid.status)).length + relationships.filter((row) => row.changeLog && row.changeLog !== '--').length;

    return {
      bids,
      suppliers,
      limits,
      relationships,
      statusValues,
      schoolRows,
      supplierRows: [...supplierRows, ...missingSupplierRows],
      limitRows,
      trendRows,
      projectRows,
      pendingRows,
      schoolCount: schoolRows.length,
      supplierCount: suppliers.length || supplierRows.length,
      categoryCount,
      activeCount,
      completedCount,
      todoCount,
      overview: educationOverview,
      relationshipCount: relationships.length,
      latestDate: latestDate(bids, ['supplyStart', 'openTime'])
    };
  }

  function renderStatusPanel(view) {
    const legend = view.statusValues.map((item, index) => `<li><i style="--legend-color:${statusColors[index]}"></i><span>${display(item.name)}</span><strong>${formatNumber(item.value)}</strong></li>`).join('');
    return panel('竞价项目状态分布', `<div class="dashboard-chart-layout education-status-chart">${donut(view.statusValues, formatNumber(view.bids.length))}<ul class="dashboard-legend">${legend}</ul></div>`, 'panel-hot', `${view.bids.length} 个项目`);
  }

  function renderMetricsPanel(view) {
    return panel('监管指标总览', `<div class="dashboard-metrics-grid">
      ${metricCard('供应商档案', formatNumber(view.overview.supplierCount), '家', 'users', './supplier-archive.html')}
      ${metricCard('学校数量', formatNumber(view.overview.schoolCount), '所', 'home', './bid-management.html')}
      ${metricCard('进行中竞价', formatNumber(view.overview.activeBidCount), '项', 'chart', './bid-management.html')}
      ${metricCard('待处理事项', formatNumber(view.overview.todoCount), '项', 'settings', './bid-management.html')}
      ${metricCard('已开标项目', formatNumber(view.completedCount), '项', 'layers', './bid-management.html')}
      ${metricCard('供货品类', formatNumber(view.categoryCount), '类', 'box', './bid-management.html')}
      ${metricCard('供货关系', formatNumber(view.relationshipCount), '条', 'route', './supplier-relationship-management.html')}
    </div>`, 'panel-metrics', `数据截止 ${escapeHtml(view.latestDate)}`);
  }

  function renderSchoolPanel(view) {
    const rows = view.schoolRows;
    const body = rows.length ? `<table class="dashboard-table education-school-table"><thead><tr><th>学校</th><th>竞价项目</th><th>品种数</th><th>供应商</th></tr></thead><tbody>${rows.map((row) => `<tr><td title="${escapeHtml(row.name)}">${display(row.name)}</td><td class="is-number">${formatNumber(row.bids)}</td><td class="is-number">${formatNumber(row.varieties)}</td><td class="is-number">${formatNumber(row.supplierCount)}</td></tr>`).join('')}</tbody></table>` : '<div class="dashboard-empty">暂无学校采购数据</div>';
    return panel('学校采购概览', body, 'panel-customers', `${view.schoolRows.length} 所`);
  }

  function renderTrendPanel(view) {
    const max = Math.max(...view.trendRows.map((row) => row.value), 1);
    const bars = view.trendRows.length ? view.trendRows.map((row) => `<div class="dashboard-price-bar-item"><div class="dashboard-price-bar-track"><i style="height:${Math.max(10, row.value / max * 100)}%"></i></div><span>${escapeHtml(row.label)}</span></div>`).join('') : '<div class="dashboard-empty">暂无竞价趋势数据</div>';
    return panel('竞价项目趋势', `<div class="dashboard-price-chart education-trend-chart">${bars}</div><div class="dashboard-chart-caption"><span><i class="dashboard-caption-dot"></i>按供货开始月份统计</span><strong>${formatNumber(view.bids.length)} 项</strong></div>`, 'panel-price');
  }

  function renderProjectPanel(view) {
    const statuses = ['全部', ...statusOrder];
    const rows = view.projectRows.filter((bid) => viewState.projectStatus === '全部' || bid.status === viewState.projectStatus);
    const tabs = statuses.map((status) => `<button type="button" class="dashboard-tab ${status === viewState.projectStatus ? 'is-active' : ''}" data-education-tab="status" data-value="${escapeHtml(status)}">${status}</button>`).join('');
    const body = rows.length ? `<table class="dashboard-table education-project-table"><thead><tr><th>项目名称</th><th>学校</th><th>供货周期</th><th>报价</th><th>状态</th></tr></thead><tbody>${rows.map((bid) => `<tr><td title="${escapeHtml(bid.name)}">${display(bid.name)}</td><td title="${escapeHtml(bid.school)}">${display(bid.school)}</td><td>${periodText(bid)}</td><td class="is-number">${formatNumber(bid.quoteSupplierCount)}</td><td><span class="education-status-pill status-${statusOrder.indexOf(bid.status)}">${display(bid.status)}</span></td></tr>`).join('')}</tbody></table>` : '<div class="dashboard-empty">暂无符合条件的竞价项目</div>';
    return panel('竞价项目总览', `<div class="dashboard-tabs education-status-tabs">${tabs}</div>${body}`, 'panel-purchases', `${rows.length} 项`);
  }

  function renderSupplierPanel(view) {
    const values = view.supplierRows.slice(0, 10).map((row) => ({ name: row.name, value: row.bids }));
    const palette = ['#1a9bff', '#23d4bb', '#ffc857', '#8e7dff', '#ff7c8c', '#64b5ff'];
    const legend = values.length ? values.map((item, index) => `<li><i style="--legend-color:${palette[index % palette.length]}"></i><span>${display(item.name)}</span><strong>${formatNumber(item.value)} 项</strong></li>`).join('') : '<li class="dashboard-muted">暂无供应商参与数据</li>';
    return panel('供应商参与度 TOP10', `<div class="dashboard-chart-layout dashboard-supplier-chart education-supplier-chart">${donut(values, formatNumber(values.reduce((sum, item) => sum + item.value, 0)), palette)}<ul class="dashboard-legend">${legend}</ul></div>`, 'panel-suppliers');
  }

  function renderLimitPanel(view) {
    const total = view.limits.length;
    const rows = view.limitRows;
    const body = `<div class="education-limit-summary"><strong>${formatNumber(total)}</strong><span>已配置限价商品</span><i style="width:${total ? 100 : 0}%"></i></div>${rows.length ? `<table class="dashboard-table"><thead><tr><th>商品类别</th><th>限价商品数</th><th>执行状态</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${display(row.name)}</td><td class="is-number">${formatNumber(row.count)}</td><td><span class="education-limit-status">执行中</span></td></tr>`).join('')}</tbody></table>` : '<div class="dashboard-empty">暂无限价配置</div>'}`;
    return panel('商品限价执行情况', body, 'panel-inventory', `${view.limitRows.length} 类`);
  }

  function renderTodoPanel(view) {
    const body = view.pendingRows.length ? `<div class="education-task-list">${view.pendingRows.map((bid) => `<button type="button" class="education-task-item" data-dashboard-link="./bid-management.html"><span class="education-task-dot status-${statusOrder.indexOf(bid.status)}"></span><span class="education-task-copy"><strong>${display(bid.name)}</strong><small>${display(bid.school)} · ${periodText(bid)}</small></span><em>${display(bid.status)}</em></button>`).join('')}</div>` : '<div class="dashboard-empty">暂无待处理竞价事项</div>';
    return panel('待办事项与开标提醒', body, 'panel-sorting', `待处理 ${view.overview.todoCount} 项`);
  }

  function renderRelationshipPanel(view) {
    const rows = view.relationships;
    const body = rows.length ? `<div class="education-timeline">${rows.map((row) => `<button type="button" class="education-timeline-item" data-dashboard-link="./supplier-relationship-management.html"><span class="education-timeline-dot"></span><span><strong>${display(row.supplierName)}</strong><small>${display(row.bidName)} · ${display(row.segment)}</small></span><em>${display(row.supplyStart)} 起</em></button>`).join('')}</div>` : '<div class="dashboard-empty">暂无供货关系记录</div>';
    return panel('供货关系动态', body, 'panel-delivery', `${view.relationships.length} 条`);
  }

  function renderDashboard(view) {
    return `<div class="page-card enterprise-home-page education-dashboard-page"><div class="enterprise-dashboard" id="educationDashboard"><div class="dashboard-screen"><header class="dashboard-screen-header"><div class="dashboard-header-decoration dashboard-header-decoration-left"></div><div class="dashboard-heading"><h1>教育局数据监管平台</h1><p>静安教育局 · 膳食集采竞价监管 · 截止 ${escapeHtml(view.latestDate)}</p></div><div class="dashboard-header-decoration dashboard-header-decoration-right"></div><button type="button" class="dashboard-fullscreen" data-dashboard-action="fullscreen" aria-label="全屏查看">⛶</button></header><div class="dashboard-grid">${renderStatusPanel(view)}${renderMetricsPanel(view)}${renderSchoolPanel(view)}${renderTrendPanel(view)}<div class="dashboard-slot panel-purchases" data-dashboard-slot="projects">${renderProjectPanel(view)}</div>${renderSupplierPanel(view)}${renderLimitPanel(view)}${renderTodoPanel(view)}${renderRelationshipPanel(view)}</div></div></div></div>`;
  }

  function bindInteractions(root, view) {
    const dashboard = root.querySelector('#educationDashboard');
    if (!dashboard) return;
    dashboard.addEventListener('click', (event) => {
      const tab = event.target.closest('[data-education-tab]');
      if (tab) {
        viewState.projectStatus = tab.dataset.value || '全部';
        const slot = dashboard.querySelector('[data-dashboard-slot="projects"]');
        if (slot) slot.innerHTML = renderProjectPanel(view);
        return;
      }
      const link = event.target.closest('[data-dashboard-link]');
      if (link) {
        window.location.href = link.dataset.dashboardLink;
        return;
      }
      const action = event.target.closest('[data-dashboard-action]');
      if (action?.dataset.dashboardAction === 'fullscreen') {
        if (document.fullscreenElement === dashboard) {
          document.exitFullscreen?.().catch?.(() => {});
        } else if (dashboard.requestFullscreen) {
          dashboard.requestFullscreen().catch(() => dashboard.classList.toggle('is-expanded'));
        } else {
          dashboard.classList.toggle('is-expanded');
        }
      }
    });
  }

  const view = makeViewModel();
  const root = window.AppShell.mount({ title: '首页', content: renderDashboard(view), variant: 'education', emptyText: '教育局端首页' });
  bindInteractions(root, view);
})();
