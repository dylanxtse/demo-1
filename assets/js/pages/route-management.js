(function () {
  const params = new URLSearchParams(window.location.search);
  const expectedRange = (params.get('expectedAtRange') || '').split(',');
  const deliveryRange = (params.get('deliveryDateRange') || '').split(',');
  const route = params.get('route') || '';
  const filters = [
    { key: 'expectedAt', label: '期望送达时间', type: 'dateRange', conditionKey: 'expectedAtRange', defaultStart: expectedRange[0] || '', defaultEnd: expectedRange[1] || '' },
    { key: 'deliveryDate', label: '配送日期', type: 'dateRange', conditionKey: 'deliveryDateRange', defaultStart: deliveryRange[0] || '', defaultEnd: deliveryRange[1] || '', placeholder: '请选择' },
    { key: 'route', label: '线路', placeholder: '请输入线路名称', defaultValue: route },
    { key: 'customerName', label: '客户名称', placeholder: '请输入', defaultValue: params.get('customerName') || '' },
    { key: 'driver', label: '司机', placeholder: '请输入', defaultValue: params.get('driver') || '' },
    { key: 'vehicle', label: '车辆', placeholder: '请输入车牌号', defaultValue: params.get('vehicle') || '' }
  ];
  const orderHref = (row, condition = {}) => {
    const query = new URLSearchParams({ view: 'orders', route: row.route, deliveryDateRange: `${row.deliveryDate},${row.deliveryDate}` });
    if (condition.expectedAtRange) {
      query.set('expectedAtRange', condition.expectedAtRange.join(','));
    }
    if (row.orders?.length) query.set('orderIds', JSON.stringify(row.orders.map((order) => order.id)));
    ['customerName', 'driver', 'vehicle'].forEach((key) => { if (condition[key]) query.set(key, condition[key]); });
    return `./route-management.html?${query}`;
  };
  const batchColumns = [
    { key: 'route', label: '线路名称' }, { key: 'deliveryDate', label: '配送日期' },
    { key: 'driver', label: '司机' }, { key: 'vehicle', label: '车辆' },
    { key: 'customerCount', label: '客户数量' }, { key: 'orderCount', label: '订单数量' }
  ];
  const view = params.get('view');
  window.RecordPageConfig = {
    title: '线路管理', pageClass: 'sorting-module-page route-management-page', deliveryDates: true,
    usePagination: true, selectable: false, initialTab: ['routes', 'orders', 'loading', 'departures'].includes(view) ? view : 'routes',
    filters, columns: [], toolbar: [],
    tabs: [
      { key: 'routes', label: '线路列表', resource: 'routes', service: window.RouteService, columns: batchColumns,
        rowActions: [{ key: 'orders', label: '查看订单', href: orderHref }] },
      { key: 'orders', label: '线路订单列表', resource: 'routeOrders', service: window.RouteService,
        filters: [...filters, { key: 'canteen', label: '食堂', placeholder: '请输入' },
          { key: 'mealName', label: '餐次', options: ['早餐', '午餐', '晚餐', '早点', '午点', '晚点'] },
          { key: 'status', label: '订单状态', options: [{ value: 'PENDING_CONFIRM', label: '待确认' }, { value: 'PENDING_AUDIT', label: '待审核' }, { value: 'READY_FOR_SHIPPING', label: '待发货' }, { value: 'COMPLETED', label: '已完成' }, { value: 'CLOSED', label: '已关闭' }] }],
        columns: [{ key: 'route', label: '线路名称' }, { key: 'orderNo', label: '订单号' },
          { key: 'customerName', label: '客户名称' }, { key: 'canteen', label: '食堂' },
          { key: 'mealName', label: '餐次' }, { key: 'expectedAt', label: '期望送达时间' },
          { key: 'deliveryDate', label: '配送日期' }, { key: 'orderAmount', label: '下单金额', format: 'money' }, { key: 'status', label: '订单状态', format: 'status' }],
        rowActions: [{ key: 'detail', label: '查看', href: (row) => `./order-detail.html?id=${encodeURIComponent(row.id)}` }] },
      { key: 'loading', label: '线路装车列表', resource: 'routeLoading', service: window.RouteService,
        filters: [...filters, { key: 'loadingStatus', label: '装车状态', options: ['待装车', '已装车'] }],
        columns: [...batchColumns, { key: 'loadingStatus', label: '装车状态' }, { key: 'loadingAt', label: '实际装车时间' }],
        rowActions: [{ key: 'orders', label: '查看订单', href: orderHref }] },
      { key: 'departures', label: '线路发车列表', resource: 'routeDepartures', service: window.RouteService,
        filters: [...filters, { key: 'departureStatus', label: '发车状态', options: ['待发车', '已发车'] }],
        columns: [...batchColumns, { key: 'departureStatus', label: '发车状态' }, { key: 'departureAt', label: '实际发车时间' }],
        rowActions: [{ key: 'orders', label: '查看订单', href: orderHref }] }
    ]
  };
})();
