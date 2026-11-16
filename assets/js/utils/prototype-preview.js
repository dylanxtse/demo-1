(function () {
  // 原型的日期查询只演示交互，展示数据不随日期改变，也不写回业务快照。
  const dateKeys = new Set(['expectedAt', 'expectedAtRange', 'deliveryDate', 'deliveryDateRange', 'deliveryAt', 'deliveryAtRange']);
  const withoutDates = (condition = {}) => Object.fromEntries(Object.entries(condition).filter(([key]) => !dateKeys.has(key)));
  const nonempty = (value) => Array.isArray(value) && value.length > 0;
  const today = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };
  function defaults(resource) {
    const day = today();
    const base = { customerName: '静安第一中学', customerType: '学校', canteen: '第一食堂', receiver: '张老师', phone: '13800138000',
      address: '学校第一食堂收货区', warehouse: '主仓', route: '学校配送一线', driver: '李师傅', vehicle: '赣B12345',
      expectedAt: `${day} 07:30:00`, deliveryAt: `${day} 07:30:00`, deliveryDate: day, createdAt: `${day} 08:00:00`,
      mealKey: 'lunch', mealName: '午餐', orderTag: '普通订单', receiptStatus: '未收货', creator: '管理员' };
    const lines = [
      { goodsCode: 'SP0300015', goodsName: '大白菜', unit: '斤', brand: '本地', spec: '散装', quantity: 25, unitPrice: 2.5, packageCoefficient: 10 },
      { goodsCode: 'SP0300034', goodsName: '大米', unit: '斤', brand: '金龙鱼', spec: '25斤/袋', quantity: 50, unitPrice: 3.2, packageCoefficient: 25 }
    ].map((line) => ({ ...line, productId: line.goodsCode, productCode: line.goodsCode, orderQty: line.quantity, actualQty: line.quantity,
      shippingQty: line.quantity, subtotal: line.quantity * line.unitPrice, shippingAmount: line.quantity * line.unitPrice,
      orderPrice: line.unitPrice, orderSubtotal: line.quantity * line.unitPrice, packageUnit: '袋', storageCondition: '阴凉干燥处', stock: 200, status: 'SORTED', sortingCompleted: true }));
    const order = { ...base, id: 'PREVIEW-ORDER-1', orderNo: `DD${day.replace(/-/g, '')}0100001`, status: 'READY_FOR_SHIPPING',
      items: lines, productCount: lines.length, orderAmount: 222.5, shippingAmount: 222.5 };
    const items = lines.map((line, index) => ({ ...base, ...line, id: `PREVIEW-SORT-${index + 1}`, orderId: order.id, orderNo: order.orderNo }));
    if (resource === 'orders') return [order];
    if (resource === 'shippingOrders') return [{ ...order, id: 'PREVIEW-SHIPPING-1', orderId: order.id, status: 'PENDING', items }];
    if (resource === 'sortingProgress') return [{ ...base, id: 'PREVIEW-PROGRESS-1', items, orders: [order], status: 'SORTED', sortedCount: 2, orderCount: 2, progress: '2/2' }];
    if (resource === 'shortageItems') return items.map((row) => ({ ...row, status: 'SHORTAGE', actualQty: 20, shortageQty: row.orderQty - 20 }));
    if (resource === 'shippingDifferences') return items.map((row) => ({ ...row, stockQty: 200, sortingQty: row.actualQty, differenceQty: row.actualQty - 200 }));
    if (resource === 'specs') return lines.map((line) => ({ productCode: line.goodsCode, productName: line.goodsName, baseUnit: line.unit,
      brand: line.brand, spec: line.spec, packageUnit: line.packageUnit, packageQty: line.packageCoefficient, status: 'ENABLE', updatedAt: `${day} 08:00:00` }));
    if (resource === 'routeOrders') return [order];
    if (['routes', 'routeLoading', 'routeDepartures'].includes(resource)) return [{ ...base, id: 'PREVIEW-ROUTE-1', orders: [order],
      orderCount: 1, customerCount: 1, quantity: 75, amount: 222.5, loadingStatus: '待装车', departureStatus: '待发车' }];
    return items;
  }
  function stored(resource) {
    try { return window.DemoStore?.get?.(resource) || []; }
    catch (error) { return []; }
  }
  function rows(value, resource) {
    if (nonempty(value)) return value;
    const saved = stored(resource);
    return nonempty(saved) ? saved : defaults(resource);
  }
  function orders(value) {
    return rows(value, 'orders').map((order) => ({ ...order, items: nonempty(order.items) ? order.items
      : nonempty(order.orderLines) ? order.orderLines : defaults('orders')[0].items }));
  }
  function groups(value) {
    if (nonempty(value)) return value.map((group) => ({ ...group, items: rows(group.items, 'sortingItems') }));
    const grouped = new Map();
    rows(null, 'sortingItems').forEach((item) => {
      const key = JSON.stringify([item.customerName, item.canteen, item.deliveryDate || item.expectedAt]);
      if (!grouped.has(key)) grouped.set(key, { ...item, items: [] });
      grouped.get(key).items.push(item);
    });
    return [...grouped.values()];
  }
  async function list(service, resource, query = {}) {
    const condition = withoutDates(query.condition);
    let result = await service.list(resource, { ...query, condition });
    if (!nonempty(result.items)) result = await service.list(resource, { ...query, page: 1, condition: {} });
    if (nonempty(result.items)) return result;
    const items = rows(null, resource);
    return { ...result, items: items.slice(0, query.pageSize || 20), total: items.length, page: 1 };
  }
  function sales(payload = {}) {
    const order = defaults('orders')[0];
    const day = today();
    const summary = ['DZ202611160001', order.orderNo, '待对账', '待反馈', order.customerName, order.canteen, 'KH0001',
      order.receiver, order.phone, order.warehouse, '订单', 222.5, 0, 222.5, 222.5, day, order.route, order.driver, '管理员', ''];
    const detail = [1, summary[0], order.orderNo, '待对账', '待反馈', order.receiver, order.phone, order.warehouse,
      '订单', 222.5, 0, 222.5, 222.5, 0, 222.5, day, order.route, order.driver, '管理员'];
    const group = { title: order.customerName, canteen: order.canteen, businessDate: day, statementCount: 1,
      orderCount: 1, returnCount: 0, rows: [detail], totals: [222.5, 0, 222.5, 222.5, 0, 222.5] };
    return { ...payload, rows: nonempty(payload.rows) ? payload.rows : [summary],
      groups: nonempty(payload.groups) ? payload.groups.map((entry) => ({ ...group, ...entry, rows: nonempty(entry.rows) ? entry.rows : [detail] })) : [group] };
  }
  window.PrototypePreview = { withoutDates, rows, orders, groups, list, defaults, sales, stored };
})();
