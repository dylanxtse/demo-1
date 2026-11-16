(function () {
  const delivery = window.OrderDelivery;
  function sourceOrders(condition = {}) {
    const records = window.DemoStore.get('shippingOrders') || [];
    return delivery.enrichRows(window.DemoStore.get('orders') || []).map((row) => {
      const shipping = records.find((record) => record.orderId === row.id || (row.orderNo && record.orderNo === row.orderNo)) || {};
      return { ...row, route: row.route || shipping.route || '待分配线路',
        driver: row.driver || shipping.driver || '', vehicle: row.vehicle || row.vehicleNo || shipping.vehicle || shipping.vehicleNo || '' };
    })
      .filter((row) => delivery.matches(row, condition));
  }

  function batches(condition) {
    const groups = new Map();
    sourceOrders(condition).forEach((order) => {
      const key = JSON.stringify([order.route, order.deliveryDate]);
      if (!groups.has(key)) groups.set(key, { id: key, route: order.route, deliveryDate: order.deliveryDate, orders: [] });
      groups.get(key).orders.push(order);
    });
    const shipping = window.DemoStore.get('shippingOrders') || [];
    return [...groups.values()].map((group) => {
      const records = shipping.filter((row) => group.orders.some((order) => row.orderId === order.id || row.orderNo === order.orderNo));
      const join = (key) => [...new Set([...group.orders, ...records].map((row) => row[key]).filter(Boolean))].join('、');
      return { ...group, customerCount: new Set(group.orders.map((order) => order.customerName)).size,
        orderCount: group.orders.length,
        quantity: group.orders.reduce((sum, order) => sum + (order.items || []).reduce((qty, line) => qty + Number(line.quantity || 0), 0), 0),
        amount: group.orders.reduce((sum, order) => sum + Number(order.orderAmount || 0), 0),
        driver: join('driver'), vehicle: join('vehicle') || join('vehicleNo'),
        loadingStatus: join('loadingStatus') || '待装车', departureStatus: join('departureStatus') || '待发车',
        loadingAt: join('loadingAt'), departureAt: join('departureAt') };
    });
  }

  window.RouteService = {
    async get(resource, id) {
      const result = await this.list(resource, { pageSize: Number.MAX_SAFE_INTEGER });
      return result.items.find((row) => row.id === id) || null;
    },
    async list(resource, query = {}) {
      const condition = query.condition || {};
      const { loadingStatus, departureStatus, ...orderCondition } = condition;
      let rows = resource === 'routeOrders' ? sourceOrders(orderCondition) : batches(orderCondition);
      if (resource === 'routeOrders') {
        try {
          const ids = JSON.parse(new URLSearchParams(window.location?.search || '').get('orderIds') || '[]');
          if (Array.isArray(ids) && ids.length) rows = rows.filter((row) => ids.includes(row.id));
        } catch (error) { /* 无父级订单范围时，按查询条件展示线路订单。 */ }
      }
      if (loadingStatus) rows = rows.filter((row) => row.loadingStatus === loadingStatus);
      if (departureStatus) rows = rows.filter((row) => row.departureStatus === departureStatus);
      rows.sort((a, b) => String(b.deliveryDate).localeCompare(String(a.deliveryDate)) || a.route.localeCompare(b.route, 'zh-CN'));
      const page = Math.max(1, Number(query.page) || 1), pageSize = Math.max(1, Number(query.pageSize) || 20);
      return { items: rows.slice((page - 1) * pageSize, page * pageSize), total: rows.length, page, pageSize };
    }
  };
})();
