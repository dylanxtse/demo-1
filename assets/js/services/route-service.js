(function () {
  const delivery = window.OrderDelivery;
  const unique = (values) => [...new Set(values.filter(Boolean))];
  const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
  const shippingFor = (order, rows) => rows.find((row) => row.orderId === order.id || (order.orderNo && row.orderNo === order.orderNo)) || {};

  function definitions() {
    const stored = window.DemoStore.snapshot().deliveryRoutes;
    if (Array.isArray(stored)) return stored;
    const orders = window.DemoStore.get('orders');
    const shipping = window.DemoStore.get('shippingOrders');
    return unique(orders.map((order) => order.route || shippingFor(order, shipping).route)).map((route) => {
      const related = orders.filter((order) => (order.route || shippingFor(order, shipping).route) === route);
      const first = related[0] || {};
      const shipment = shippingFor(first, shipping);
      return { id: `ROUTE-${encodeURIComponent(route)}`, route, warehouse: first.warehouse || shipment.warehouse || '',
        driver: unique(related.map((order) => order.driver || shippingFor(order, shipping).driver)).join('、'),
        vehicle: unique(related.map((order) => order.vehicle || order.vehicleNo || shippingFor(order, shipping).vehicle || shippingFor(order, shipping).vehicleNo)).join('、'), status: 'ENABLE' };
    });
  }

  function sourceOrders(condition = {}) {
    const shipping = window.DemoStore.get('shippingOrders');
    const loadingRecords = window.DemoStore.get('routeLoadingRecords');
    const routes = definitions();
    const { status, loadingStatus, departureStatus, orderStatus, shippingAt, route, warehouse, customerName, ...filters } = condition;
    return delivery.enrichRows(window.DemoStore.get('orders')).map((order) => {
      const shipment = shippingFor(order, shipping);
      const loading = loadingRecords.find((row) => row.orderId === order.id) || {};
      const routeName = order.route || shipment.route || '';
      const route = routes.find((row) => row.route === routeName);
      return { ...order, route: routeName || '待分配线路', warehouse: order.warehouse || shipment.warehouse || route?.warehouse || '',
        address: order.address || shipment.address || '', driver: order.driver || shipment.driver || route?.driver || '',
        vehicle: order.vehicle || order.vehicleNo || shipment.vehicle || shipment.vehicleNo || route?.vehicle || '',
        routeStatus: routeName ? '已分配' : '未分配', orderStatus: order.status,
        loadingStatus: loading.loadingStatus || shipment.loadingStatus || order.loadingStatus || '待装车',
        loadingAt: loading.loadingAt || shipment.loadingAt || order.loadingAt || '',
        loadingPhotos: loading.loadingPhotos || shipment.loadingPhotos || order.loadingPhotos || [],
        departureStatus: shipment.departureStatus || order.departureStatus || '待发车',
        shippingAt: shipment.shippingAt || shipment.shippedAt || order.shippingAt || '',
        deliveryAmount: number(shipment.shippingAmount ?? order.shippingAmount ?? order.orderAmount) };
    }).filter((row) => delivery.matches(row, filters)
      && (!route || row.route === route)
      && (!warehouse || row.warehouse === warehouse)
      && (!customerName || row.customerName === customerName)
      && (!status || row.routeStatus === status)
      && (!orderStatus || row.orderStatus === orderStatus)
      && (!loadingStatus || row.loadingStatus === loadingStatus)
      && (!departureStatus || row.departureStatus === departureStatus)
      && (!shippingAt || delivery.dateOf(row.shippingAt) === delivery.dateOf(shippingAt)));
  }

  function routeRows(condition = {}) {
    const { route, warehouse, status, ...orderCondition } = condition;
    const matchingOrders = sourceOrders(orderCondition);
    const allOrders = sourceOrders();
    // 日期只影响下单统计，无订单的线路仍需保留，便于编辑和启停。
    const restrictToOrders = Object.entries(orderCondition).some(([key, value]) =>
      !['expectedAt', 'expectedAtRange', 'deliveryDate', 'deliveryDateRange', 'shippingAt'].includes(key) && value !== '' && value != null);
    return definitions().map((definition) => {
      const orders = matchingOrders.filter((order) => order.route === definition.route);
      const all = allOrders.filter((order) => order.route === definition.route);
      return { ...definition, orders,
        deliveryDate: unique(orders.map((order) => order.deliveryDate)).join('、'),
        customerCount: unique(all.map((order) => order.customerName)).length,
        orderingCustomerCount: unique(orders.map((order) => order.customerName)).length,
        orderCount: orders.length,
        orderAmount: orders.reduce((sum, order) => sum + number(order.orderAmount), 0),
        amount: orders.reduce((sum, order) => sum + number(order.orderAmount), 0) };
    }).filter((row) => (!route || row.route.toLocaleLowerCase().includes(String(route).toLocaleLowerCase()))
      && (!warehouse || row.warehouse === warehouse) && (!status || row.status === status)
      && (!restrictToOrders || row.orders.length > 0));
  }

  function departures(condition) {
    const groups = new Map();
    sourceOrders(condition).forEach((order) => {
      const key = JSON.stringify([order.route, order.deliveryDate, order.vehicle]);
      if (!groups.has(key)) groups.set(key, { id: key, route: order.route, deliveryDate: order.deliveryDate,
        vehicle: order.vehicle, driver: order.driver, orders: [] });
      groups.get(key).orders.push(order);
    });
    return [...groups.values()].map((group) => ({ ...group, orderCount: group.orders.length,
      customerCount: unique(group.orders.map((order) => order.customerName)).length,
      deliveryAmount: group.orders.reduce((sum, order) => sum + order.deliveryAmount, 0),
      departureStatus: group.orders.every((order) => order.departureStatus === '已发车') ? '已发车' : '待发车' }));
  }

  function summary(rows) {
    const vehicleKeys = (row) => row.vehicle ? `${row.vehicle}|${row.deliveryDate}` : '';
    const vehicles = unique(rows.map(vehicleKeys));
    const departed = vehicles.filter((key) => rows.filter((row) => vehicleKeys(row) === key).every((row) => row.departureStatus === '已发车')).length;
    return { vehicleCount: vehicles.length, customerCount: unique(rows.flatMap((row) => row.orders.map((order) => order.customerName))).length,
      deliveryAmount: rows.reduce((sum, row) => sum + row.deliveryAmount, 0), departedCount: departed, pendingCount: vehicles.length - departed };
  }

  function persistDefinition(mutator) {
    const initial = definitions();
    return window.DemoStore.transact((state) => {
      if (!Array.isArray(state.deliveryRoutes)) state.deliveryRoutes = initial;
      return mutator(state.deliveryRoutes, state);
    });
  }

  const service = {
    filterOptions(key) {
      if (key === 'route') return unique(definitions().map((row) => row.route));
      if (key === 'warehouse') return unique([...window.DemoStore.get('warehouses').map((row) => row.warehouseName), ...sourceOrders().map((row) => row.warehouse)]);
      return unique(sourceOrders().map((row) => row[key]));
    },
    async get(resource, id, condition = {}) {
      const result = await this.list(resource, { condition, pageSize: Number.MAX_SAFE_INTEGER });
      return result.items.find((row) => row.id === id) || null;
    },
    async list(resource, query = {}) {
      const condition = query.condition || {};
      let rows = resource === 'routes' ? routeRows(condition)
        : resource === 'routeDepartures' ? departures(condition) : sourceOrders(resource === 'routeLoading'
          ? { ...condition, status: undefined, loadingStatus: condition.loadingStatus || condition.status } : condition);
      if (resource === 'routeOrders' || resource === 'routeLoading') {
        try {
          const ids = JSON.parse(new URLSearchParams(window.location?.search || '').get('orderIds') || '[]');
          if (Array.isArray(ids) && ids.length) rows = rows.filter((row) => ids.includes(row.id));
        } catch (error) { /* 非法父级范围不覆盖正常查询。 */ }
      }
      rows.sort((a, b) => String(b.deliveryDate || '').localeCompare(String(a.deliveryDate || '')) || a.route.localeCompare(b.route, 'zh-CN'));
      const page = Math.max(1, Number(query.page) || 1), pageSize = Math.max(1, Number(query.pageSize) || 20);
      return { items: rows.slice((page - 1) * pageSize, page * pageSize), total: rows.length, page, pageSize,
        ...(resource === 'routeDepartures' ? { summary: summary(rows) } : {}) };
    },
    async create(resource, data) {
      if (resource !== 'routes') throw new Error('不支持的线路操作');
      const name = String(data.route || '').trim();
      if (!name) throw new Error('请输入线路名称');
      if (definitions().some((row) => row.route === name)) throw new Error('线路名称已存在');
      return persistDefinition((rows) => {
        const row = { ...data, route: name, status: 'ENABLE', id: `ROUTE-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` };
        rows.unshift(row);
        return row;
      });
    },
    async update(resource, id, data) {
      if (resource !== 'routes') throw new Error('不支持的线路操作');
      const name = String(data.route || '').trim();
      if (!name) throw new Error('请输入线路名称');
      if (definitions().some((row) => row.id !== id && row.route === name)) throw new Error('线路名称已存在');
      return persistDefinition((rows, state) => {
        const row = rows.find((entry) => entry.id === id);
        if (!row) throw new Error('线路不存在');
        const previous = row.route;
        Object.assign(row, { route: name, warehouse: data.warehouse, vehicle: data.vehicle, driver: data.driver });
        ['orders', 'shippingOrders'].forEach((key) => (state[key] || []).filter((order) => order.route === previous).forEach((order) =>
          Object.assign(order, { route: row.route, warehouse: row.warehouse, vehicle: row.vehicle, driver: row.driver })));
        return row;
      });
    },
    async remove(resource, id) {
      if (resource !== 'routes') throw new Error('不支持的线路操作');
      return persistDefinition((rows, state) => {
        const index = rows.findIndex((row) => row.id === id);
        if (index < 0) throw new Error('线路不存在');
        const [removed] = rows.splice(index, 1);
        ['orders', 'shippingOrders'].forEach((key) => (state[key] || []).filter((order) => order.route === removed.route).forEach((order) => { order.route = ''; }));
        return removed;
      });
    },
    async transition(resource, id, action) {
      if (resource === 'routes' && ['enable', 'disable'].includes(action)) return persistDefinition((rows) => {
        const row = rows.find((entry) => entry.id === id);
        if (!row) throw new Error('线路不存在');
        row.status = action === 'enable' ? 'ENABLE' : 'DISABLE';
        return row;
      });
      return this.batch(resource, [id], action);
    },
    async batch(resource, ids, action, payload = {}, condition = {}) {
      if (resource !== 'routeLoading' || action !== 'load') throw new Error('不支持的装车操作');
      const result = await this.list(resource, { condition, pageSize: Number.MAX_SAFE_INTEGER });
      const selected = result.items.filter((row) => ids.includes(row.id));
      if (!ids.length || selected.length !== new Set(ids).size) throw new Error('所选订单不在当前查询范围');
      if (selected.some((row) => row.loadingStatus !== '待装车')) throw new Error('请选择待装车订单');
      return window.DemoStore.transact((state) => {
        if (!Array.isArray(state.routeLoadingRecords)) state.routeLoadingRecords = [];
        return selected.map((order) => {
          const row = state.routeLoadingRecords.find((entry) => entry.orderId === order.id);
          const value = { orderId: order.id, loadingStatus: '已装车', loadingAt: delivery.moment(), loadingPhotos: order.loadingPhotos };
          if (row) Object.assign(row, value); else state.routeLoadingRecords.push(value);
          return value;
        });
      });
    }
  };
  window.RouteService = service;
})();
