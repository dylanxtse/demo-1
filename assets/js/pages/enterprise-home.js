(function () {
  const viewState = {
    inventoryWarehouse: '',
    inventoryCategory: '全部'
  };
  const dashboardChartLimit = 10;

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const toNumber = (value, fallback = 0) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  };

  const dateKey = (value) => {
    const match = String(value || '').match(/\d{4}-\d{2}-\d{2}/);
    return match ? match[0] : '';
  };

  const latestDate = (records, fields) => {
    const dates = (records || [])
      .flatMap((record) => fields.map((field) => dateKey(record[field])))
      .filter(Boolean)
      .sort();
    return dates[dates.length - 1] || '--';
  };

  const recordsOnDate = (records, date, fields) => (records || []).filter((record) => (
    fields.some((field) => dateKey(record[field]) === date)
  ));

  const unique = (values) => [...new Set(values.filter((value) => value !== '' && value != null))];

  const getSettings = (snapshot) => ({
    amountDecimal: toNumber(snapshot.settings?.amountDecimal, 2),
    quantityDecimal: toNumber(snapshot.settings?.quantityDecimal, 0)
  });

  const formatNumber = (value, decimals = 0) => toNumber(value).toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });

  const formatAmount = (value, settings) => formatNumber(value, settings.amountDecimal);
  const formatQuantity = (value, settings) => formatNumber(value, settings.quantityDecimal);
  const display = (value, fallback = '--') => value == null || value === '' ? fallback : escapeHtml(value);

  const icon = (name) => window.AppMenuConfig?.icons?.[name] || '';

  function getOrderAmount(order) {
    if (order?.orderAmount != null && order.orderAmount !== '') return toNumber(order.orderAmount);
    return (order?.items || []).reduce((total, item) => total + toNumber(item.subtotal || toNumber(item.unitPrice) * toNumber(item.quantity)), 0);
  }

  function getItemCount(order) {
    const items = order?.items || [];
    if (!items.length) return toNumber(order?.productCount);
    return new Set(items.map((item) => item.goodsCode || item.goodsName)).size;
  }

  function getProductCategory(item, productByCode) {
    const product = productByCode.get(item?.goodsCode);
    return String(product?.category || item?.category || '其他材料').split('-')[0] || '其他材料';
  }

  function sumItems(items, amountKey = 'subtotal') {
    return (items || []).reduce((total, item) => total + toNumber(
      item?.[amountKey] != null ? item[amountKey] : toNumber(item?.unitPrice) * toNumber(item?.quantity)
    ), 0);
  }

  function makeAggregates(orders, productByCode) {
    const categories = new Map();
    const products = new Map();
    (orders || []).forEach((order) => {
      (order.items || []).forEach((item) => {
        const quantity = toNumber(item.quantity || item.orderQty || item.actualQty);
        const amount = toNumber(item.subtotal || toNumber(item.unitPrice) * quantity);
        const category = getProductCategory(item, productByCode);
        const product = item.goodsName || item.productName || item.goodsCode || '未命名商品';
        categories.set(category, (categories.get(category) || 0) + amount);
        products.set(product, (products.get(product) || 0) + amount);
      });
    });
    return {
      categories: [...categories.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
      products: [...products.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
    };
  }

  function makePurchaseRows(inboundOrders, settings) {
    const suppliers = new Map();
    (inboundOrders || []).forEach((record) => {
      const name = record.supplierPurchaserCustomerName || record.supplierName || record.partner || '待确认供应商';
      const current = suppliers.get(name) || { name, amount: 0, itemCodes: new Set(), count: 0 };
      current.amount += toNumber(record.entryAmt || record.amount || sumItems(record.items, 'entryAmount'));
      current.count += 1;
      (record.items || []).forEach((item) => current.itemCodes.add(item.goodsCode || item.goodsName));
      suppliers.set(name, current);
    });
    return [...suppliers.values()]
      .map((item) => ({ ...item, itemCount: item.itemCodes.size }))
      .sort((a, b) => b.amount - a.amount)
      .map((item) => ({ ...item, amountText: formatAmount(item.amount, settings) }));
  }

  function makeCustomerRows(orders, settings) {
    const customers = new Map();
    (orders || []).forEach((order) => {
      const name = order.customerName || '未命名客户';
      const current = customers.get(name) || { name, amount: 0, itemCodes: new Set(), count: 0 };
      current.amount += getOrderAmount(order);
      current.count += 1;
      (order.items || []).forEach((item) => current.itemCodes.add(item.goodsCode || item.goodsName));
      customers.set(name, current);
    });
    return [...customers.values()]
      .sort((a, b) => b.amount - a.amount)
      .map((item) => ({ ...item, itemCount: item.itemCodes.size, amountText: formatAmount(item.amount, settings) }));
  }

  function makeDeliveryRows(orders, shippingOrders) {
    const orderByNo = new Map((orders || []).map((order) => [order.orderNo, order]));
    const routes = new Map();
    (shippingOrders || []).forEach((shipping) => {
      const route = shipping.route || orderByNo.get(shipping.orderNo)?.route || '待排线';
      const current = routes.get(route) || { route, driver: '', customers: new Set(), orders: 0 };
      const order = orderByNo.get(shipping.orderNo);
      current.driver = current.driver || shipping.driver || order?.driver || '待分配';
      current.customers.add(shipping.customerName || order?.customerName || '--');
      current.orders += 1;
      routes.set(route, current);
    });
    return [...routes.values()]
      .sort((a, b) => b.orders - a.orders)
      .map((item) => ({ ...item, customerCount: item.customers.size }));
  }

  function makePriceTrend(orders, settings) {
    const byDate = new Map();
    (orders || []).forEach((order) => {
      const date = dateKey(order.createdAt || order.expectedAt);
      if (!date) return;
      const current = byDate.get(date) || { date, amount: 0, quantity: 0 };
      (order.items || []).forEach((item) => {
        current.amount += toNumber(item.subtotal || toNumber(item.unitPrice) * toNumber(item.quantity));
        current.quantity += toNumber(item.quantity);
      });
      byDate.set(date, current);
    });
    const rows = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-7);
    return rows.map((row) => ({
      ...row,
      value: row.quantity ? row.amount / row.quantity : 0,
      label: row.date.slice(5),
      valueText: formatAmount(row.quantity ? row.amount / row.quantity : 0, settings)
    }));
  }

  function buildViewModel(snapshot) {
    const settings = getSettings(snapshot);
    const products = snapshot.products || [];
    const productByCode = new Map(products.map((product) => [product.code || product.id, product]));
    const orders = snapshot.orders || [];
    const inboundOrders = snapshot.inboundOrders || [];
    const sortingTasks = snapshot.sortingTasks || [];
    const shippingOrders = snapshot.shippingOrders || [];
    const inventoryRows = window.DemoStore?.get?.('inventoryBalance') || snapshot.inventoryBalance || [];
    const orderDate = latestDate(orders, ['createdAt', 'expectedAt']);
    const purchaseDate = latestDate(inboundOrders, ['entryTime', 'createdAt']);
    const sortingDate = latestDate(sortingTasks, ['expectedAt', 'sortingAt']);
    const shippingDate = latestDate(shippingOrders, ['expectedAt', 'createdAt']);
    const dailyOrders = recordsOnDate(orders, orderDate, ['createdAt', 'expectedAt']);
    const dailyPurchases = recordsOnDate(inboundOrders, purchaseDate, ['entryTime', 'createdAt']);
    const dailySorting = recordsOnDate(sortingTasks, sortingDate, ['expectedAt', 'sortingAt']);
    const dailyShipping = recordsOnDate(shippingOrders, shippingDate, ['expectedAt', 'createdAt']);
    const aggregates = makeAggregates(orders, productByCode);
    const completedSorting = dailySorting.filter((task) => task.status === 'SORTED' || task.progress === '100%' || toNumber(task.actualQty) >= toNumber(task.orderQty)).length;
    const totalSorting = dailySorting.length;
    const purchaseRows = makePurchaseRows(dailyPurchases.length ? dailyPurchases : inboundOrders, settings);
    const purchaseItemCount = Math.max(
      unique(dailyPurchases.flatMap((order) => (order.items || []).map((item) => item.goodsCode || item.goodsName))).length,
      purchaseRows.reduce((total, row) => total + row.itemCount, 0),
      dailyPurchases.reduce((total, order) => total + toNumber(order.productCount), 0)
    );

    return {
      snapshot,
      settings,
      products,
      productByCode,
      orders,
      orderDate,
      purchaseDate,
      sortingDate,
      shippingDate,
      dailyOrders,
      dailyPurchases,
      dailySorting,
      dailyShipping,
      inventoryRows,
      aggregates,
      purchaseRows,
      customerRows: makeCustomerRows(dailyOrders.length ? dailyOrders : orders, settings),
      deliveryRows: makeDeliveryRows(dailyShipping.length ? dailyShipping : shippingOrders, orders),
      priceTrend: makePriceTrend(orders, settings),
      completedSorting,
      totalSorting,
      orderAmount: dailyOrders.reduce((total, order) => total + getOrderAmount(order), 0),
      orderItemCount: dailyOrders.reduce((total, order) => total + getItemCount(order), 0),
      purchaseAmount: dailyPurchases.reduce((total, order) => total + toNumber(order.entryAmt || order.amount || sumItems(order.items, 'entryAmount')), 0),
      purchaseItemCount
    };
  }

  function gradient(values, palette) {
    const total = values.reduce((sum, item) => sum + Math.max(item.value, 0), 0);
    if (!total) return 'conic-gradient(#1b4168 0 100%)';
    let cursor = 0;
    const parts = values.map((item, index) => {
      const start = cursor;
      cursor += (Math.max(item.value, 0) / total) * 100;
      return `${palette[index % palette.length]} ${start.toFixed(2)}% ${cursor.toFixed(2)}%`;
    });
    return `conic-gradient(${parts.join(', ')})`;
  }

  function donut(values, center, palette = ['#1a9bff', '#23d4bb', '#ffc857', '#8e7dff', '#ff7c8c']) {
    return `
      <div class="dashboard-donut" style="--donut-bg:${gradient(values, palette)}">
        <div class="dashboard-donut-center"><strong>${escapeHtml(center)}</strong><span>占比</span></div>
      </div>`;
  }

  function panel(title, body, className = '', meta = '') {
    return `
      <section class="dashboard-panel ${className}">
        <div class="dashboard-panel-title"><span class="dashboard-title-mark"></span><span>${title}</span>${meta ? `<small>${meta}</small>` : ''}</div>
        <div class="dashboard-panel-body">${body}</div>
      </section>`;
  }

  function metricCard(label, value, unit, iconName, link) {
    return `
      <button type="button" class="dashboard-stat-card" data-dashboard-link="${escapeHtml(link)}">
        <span class="dashboard-stat-icon">${icon(iconName)}</span>
        <span class="dashboard-stat-copy"><span class="dashboard-stat-label">${label}</span><span class="dashboard-stat-value">${escapeHtml(value)}<em>${unit}</em></span></span>
      </button>`;
  }

  function renderHotPanel(view) {
    const values = view.aggregates.categories.slice(0, dashboardChartLimit);
    const legend = values.length ? values.map((item, index) => `
      <li><i style="--legend-color:${['#1a9bff', '#23d4bb', '#ffc857', '#8e7dff', '#ff7c8c', '#64b5ff'][index % 6]}"></i><span>${display(item.name)}</span><strong>${formatAmount(item.value, view.settings)}</strong></li>`).join('') : '<li class="dashboard-muted">暂无商品销售数据</li>';
    return panel('近30天热销商品结构（TOP10）', `
      <div class="dashboard-chart-layout dashboard-hot-chart">
        ${donut(values, values.length ? `${Math.round(values.reduce((total, item) => total + item.value, 0) / Math.max(values[0].value, 1))}` : '0')}
        <ul class="dashboard-legend">${legend}</ul>
      </div>`, 'panel-hot');
  }

  function renderPricePanel(view) {
    const trend = view.priceTrend;
    const max = Math.max(...trend.map((item) => item.value), 1);
    const bars = trend.length ? trend.map((item) => `
      <div class="dashboard-price-bar-item" title="${escapeHtml(item.date)} 平均价 ${escapeHtml(item.valueText)}">
        <div class="dashboard-price-bar-track"><i style="height:${Math.max(8, (item.value / max) * 100)}%"></i></div><span>${escapeHtml(item.label)}</span>
      </div>`).join('') : '<div class="dashboard-empty">暂无价格波动数据</div>';
    return panel('订单商品销售价格波动', `
      <div class="dashboard-price-chart">${bars}</div>
      <div class="dashboard-chart-caption"><span><i class="dashboard-caption-dot"></i>订单商品平均销售价</span><strong>${trend.length ? `${escapeHtml(trend[trend.length - 1].valueText)} 元` : '--'}</strong></div>`, 'panel-price');
  }

  function renderInventoryPanel(view) {
    const warehouseNames = unique(view.inventoryRows.map((row) => row.warehouseName || row.warehouse));
    if (!viewState.inventoryWarehouse || !warehouseNames.includes(viewState.inventoryWarehouse)) viewState.inventoryWarehouse = warehouseNames[0] || '';
    const categories = ['全部', ...unique(view.inventoryRows.map((row) => String(row.category || '其他材料').split('-')[0]))];
    if (!categories.includes(viewState.inventoryCategory)) viewState.inventoryCategory = '全部';
    const rows = view.inventoryRows.filter((row) => (
      (row.warehouseName || row.warehouse) === viewState.inventoryWarehouse
      && (viewState.inventoryCategory === '全部' || String(row.category || '').split('-')[0] === viewState.inventoryCategory)
    ));
    const warehouseTabs = warehouseNames.map((name) => `<button type="button" class="dashboard-tab ${name === viewState.inventoryWarehouse ? 'is-active' : ''}" data-dashboard-tab="warehouse" data-value="${escapeHtml(name)}">${display(name)}</button>`).join('');
    const categoryTabs = categories.map((name) => `<button type="button" class="dashboard-tab ${name === viewState.inventoryCategory ? 'is-active' : ''}" data-dashboard-tab="category" data-value="${escapeHtml(name)}">${display(name)}</button>`).join('');
    const table = rows.length ? `
      <table class="dashboard-table dashboard-inventory-table"><thead><tr><th>商品</th><th>库存</th><th>库存金额</th></tr></thead><tbody>
        ${rows.map((row) => `<tr><td title="${escapeHtml(row.goodsName || '')}">${display(String(row.goodsName || '').replace(/\([^)]*\)$/, ''))}</td><td>${formatQuantity(row.currentStock, view.settings)} ${display(row.unit, '')}</td><td>${formatAmount(row.totalAmount, view.settings)}</td></tr>`).join('')}
      </tbody></table>` : '<div class="dashboard-empty">当前筛选暂无库存数据</div>';
    return panel('库存商品余额', `
      <div class="dashboard-tabs">${warehouseTabs || '<span class="dashboard-muted">暂无仓库</span>'}</div>
      <div class="dashboard-tabs dashboard-tabs-secondary">${categoryTabs}</div>
      ${table}`, 'panel-inventory', `${rows.length} 条`);
  }

  function renderMetricsPanel(view) {
    const customers = view.snapshot.customers || [];
    const customerCount = customers.length || unique(view.orders.map((order) => order.customerName)).length;
    const dailyCustomerCount = unique(view.dailyOrders.map((order) => order.customerName)).length;
    return panel('经营指标总览', `
      <div class="dashboard-metrics-grid">
        ${metricCard('客户总数', formatNumber(customerCount), '家', 'users', './customer.html')}
        ${metricCard('今日下单客户数', formatNumber(dailyCustomerCount), '家', 'users', './order-management.html')}
        ${metricCard('今日订单数', formatNumber(view.dailyOrders.length), '笔', 'cart', './order-management.html')}
        ${metricCard('今日订单金额', formatAmount(view.orderAmount, view.settings), '元', 'wallet', './order-management.html')}
        ${metricCard('今日采购单数', formatNumber(view.dailyPurchases.length), '笔', 'truck', './inbound.html')}
        ${metricCard('今日采购商品种数', formatNumber(view.purchaseItemCount), '种', 'box', './inbound.html')}
        ${metricCard('今日采购金额', formatAmount(view.purchaseAmount, view.settings), '元', 'wallet', './inbound.html')}
      </div>`, 'panel-metrics', `数据截止 ${escapeHtml(view.orderDate)}`);
  }

  function renderPurchasePanel(view) {
    const rows = view.purchaseRows;
    const body = rows.length ? `
      <table class="dashboard-table"><thead><tr><th>供应商名称</th><th>采购金额（元）</th><th>采购商品种数</th></tr></thead><tbody>
        ${rows.map((row) => `<tr><td title="${escapeHtml(row.name)}">${display(row.name)}</td><td class="is-number">${row.amountText}</td><td class="is-number">${formatNumber(row.itemCount)}</td></tr>`).join('')}
      </tbody></table>` : '<div class="dashboard-empty">暂无采购单数据</div>';
    return panel('今日采购单总览', body, 'panel-purchases', `统计日 ${escapeHtml(view.purchaseDate)}`);
  }

  function renderSortingPanel(view) {
    const percent = view.totalSorting ? Math.round((view.completedSorting / view.totalSorting) * 100) : 0;
    const values = [{ value: view.completedSorting }, { value: Math.max(view.totalSorting - view.completedSorting, 0) }];
    return panel('客户分拣进度', `
      <div class="dashboard-sorting-layout">
        ${donut(values, `${percent}%`, ['#25d7a1', '#24486d'])}
        <div class="dashboard-sorting-summary"><div><strong>${formatNumber(Math.max(view.totalSorting - view.completedSorting, 0))}</strong><span>待分拣商品数</span></div><div><strong>${formatNumber(view.completedSorting)}</strong><span>已完成商品数</span></div><div><strong>${percent}%</strong><span>完成进度</span></div></div>
      </div>
      <div class="dashboard-progress-track"><i style="width:${percent}%"></i></div>
      <div class="dashboard-chart-caption"><span>已完成 ${formatNumber(view.completedSorting)} / ${formatNumber(view.totalSorting)}</span><strong>统计日 ${escapeHtml(view.sortingDate)}</strong></div>`, 'panel-sorting');
  }

  function renderCustomerPanel(view) {
    const rows = view.customerRows;
    const body = rows.length ? `
      <table class="dashboard-table"><thead><tr><th>客户名称</th><th>下单金额（元）</th><th>商品种数</th></tr></thead><tbody>
        ${rows.map((row) => `<tr><td title="${escapeHtml(row.name)}">${display(row.name)}</td><td class="is-number">${row.amountText}</td><td class="is-number">${formatNumber(row.itemCount)}</td></tr>`).join('')}
      </tbody></table>` : '<div class="dashboard-empty">暂无客户订单数据</div>';
    return panel('今日客户订单总览', body, 'panel-customers', `统计日 ${escapeHtml(view.orderDate)}`);
  }

  function renderSupplierPanel(view) {
    const values = view.purchaseRows.slice(0, dashboardChartLimit).map((item) => ({ name: item.name, value: item.amount }));
    const legend = values.length ? values.map((item, index) => `<li><i style="--legend-color:${['#1a9bff', '#23d4bb', '#ffc857', '#8e7dff', '#ff7c8c', '#64b5ff'][index % 6]}"></i><span>${display(item.name)}</span><strong>${formatAmount(item.value, view.settings)}</strong></li>`).join('') : '<li class="dashboard-muted">暂无供应商采购数据</li>';
    return panel('近30天供应商采购（TOP10）', `
      <div class="dashboard-chart-layout dashboard-supplier-chart">
        ${donut(values, values.length ? formatAmount(values.reduce((total, item) => total + item.value, 0), view.settings) : '0', ['#1a9bff', '#23d4bb', '#ffc857', '#8e7dff', '#ff7c8c', '#64b5ff'])}
        <ul class="dashboard-legend">${legend}</ul>
      </div>`, 'panel-suppliers', `统计日 ${escapeHtml(view.purchaseDate)}`);
  }

  function renderDeliveryPanel(view) {
    const rows = view.deliveryRows;
    const body = rows.length ? `
      <table class="dashboard-table"><thead><tr><th>线路</th><th>司机</th><th>客户数</th><th>订单数</th></tr></thead><tbody>
        ${rows.map((row) => `<tr><td>${display(row.route)}</td><td>${display(row.driver)}</td><td class="is-number">${formatNumber(row.customerCount)}</td><td class="is-number">${formatNumber(row.orders)}</td></tr>`).join('')}
      </tbody></table>` : '<div class="dashboard-empty">暂无配送信息</div>';
    return panel('配送信息', body, 'panel-delivery', `统计日 ${escapeHtml(view.shippingDate)}`);
  }

  function renderDashboard(view) {
    return `
      <div class="page-card enterprise-home-page">
        <div class="enterprise-dashboard" id="enterpriseDashboard">
          <div class="dashboard-screen">
            <header class="dashboard-screen-header">
              <div class="dashboard-header-decoration dashboard-header-decoration-left"></div>
              <div class="dashboard-heading"><h1>企业数据平台</h1><p>模拟经营数据 · 截止 ${escapeHtml(view.orderDate)}</p></div>
              <div class="dashboard-header-decoration dashboard-header-decoration-right"></div>
              <button type="button" class="dashboard-fullscreen" data-dashboard-action="fullscreen" aria-label="全屏查看">⛶</button>
            </header>
            <div class="dashboard-grid">
              ${renderHotPanel(view)}
              ${renderMetricsPanel(view)}
              ${renderCustomerPanel(view)}
              ${renderPricePanel(view)}
              ${renderPurchasePanel(view)}
              ${renderSupplierPanel(view)}
              <div class="dashboard-slot panel-inventory-slot" data-dashboard-slot="inventory">${renderInventoryPanel(view)}</div>
              ${renderSortingPanel(view)}
              ${renderDeliveryPanel(view)}
            </div>
          </div>
        </div>
      </div>`;
  }

  function bindInteractions(root, view) {
    const dashboard = root.querySelector('#enterpriseDashboard');
    if (!dashboard) return;
    dashboard.addEventListener('click', (event) => {
      const tab = event.target.closest('[data-dashboard-tab]');
      if (tab) {
        const type = tab.dataset.dashboardTab;
        if (type === 'warehouse') viewState.inventoryWarehouse = tab.dataset.value || '';
        if (type === 'category') viewState.inventoryCategory = tab.dataset.value || '全部';
        const slot = dashboard.querySelector('[data-dashboard-slot="inventory"]');
        if (slot) slot.innerHTML = renderInventoryPanel(view);
        return;
      }
      const link = event.target.closest('[data-dashboard-link]');
      if (link) {
        window.AppNavigation?.navigate?.(link.dataset.dashboardLink);
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

  const snapshot = window.DemoStore?.snapshot?.() || {};
  const view = buildViewModel(snapshot);
  const root = window.AppShell.mount({
    title: '首页',
    content: renderDashboard(view),
    emptyText: '企业端首页'
  });
  bindInteractions(root, view);
})();
