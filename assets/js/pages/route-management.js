(function () {
  const params = new URLSearchParams(window.location.search);
  const service = window.RouteService;
  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
  const options = (key) => service?.filterOptions?.(key) || [];
  const defaultDate = (key) => params.get(key) || (params.get(`${key}Range`) || '').split(',')[0] || '';
  const dateFilters = (shipping = false) => [
    { key: shipping ? 'shippingAt' : 'expectedAt', label: shipping ? '发货日期' : '期望送达时间', type: 'date',
      defaultValue: defaultDate(shipping ? 'shippingAt' : 'expectedAt'), placeholder: '请选择' },
    { key: 'deliveryDate', label: '配送日期', type: 'date', defaultValue: defaultDate('deliveryDate'), placeholder: '请选择' }
  ];
  const warehouseFilter = { key: 'warehouse', label: '仓库', options: options('warehouse'), defaultValue: params.get('warehouse') || '' };
  const routeFilter = { key: 'route', label: '线路', get options() { return options('route'); }, defaultValue: params.get('route') || '' };
  const customerFilter = { key: 'customerName', label: '客户名称', options: options('customerName'), emptyLabel: '请选择', defaultValue: params.get('customerName') || '' };
  const orderHref = (row, condition = {}) => {
    const query = new URLSearchParams({ view: 'orders', route: row.route });
    ['expectedAt', 'deliveryDate', 'warehouse', 'customerName'].forEach((key) => { if (condition[key]) query.set(key, condition[key]); });
    if (!condition.deliveryDate && row.deliveryDate && !row.deliveryDate.includes('、')) query.set('deliveryDate', row.deliveryDate);
    if (row.orders?.length) query.set('orderIds', JSON.stringify(row.orders.map((order) => order.id)));
    return `./route-management.html?${query}`;
  };
  const orderStatus = { key: 'orderStatus', label: '订单状态', format: 'status' };
  const orderColumns = [
    { key: 'orderNo', label: '订单号', href: (row) => `./order-detail.html?id=${encodeURIComponent(row.id)}` },
    { key: 'customerName', label: '客户名称' }, { key: 'canteen', label: '食堂' },
    { key: 'route', label: '线路' }, { key: 'warehouse', label: '仓库' }, { key: 'address', label: '配送地址' }
  ];
  const routeForm = [
    { key: 'route', label: '线路名称', required: true, fullRow: true },
    { key: 'warehouse', label: '绑定仓库', options: options('warehouse'), required: true, fullRow: true },
    { key: 'vehicle', label: '绑定车辆', fullRow: true }
  ];
  const view = params.get('view');
  window.RecordPageConfig = {
    title: '线路管理', pageClass: 'sorting-module-page route-management-page', deliveryDates: true, previewData: false,
    useDemoListLayout: true, manualFilterLayout: true, usePagination: true, selectable: false,
    initialTab: ['routes', 'orders', 'loading', 'departures'].includes(view) ? view : 'routes',
    filters: [], columns: [], toolbar: [],
    statusMap: { ENABLE: ['已开启', 'success'], DISABLE: ['已禁用', 'danger'] },
    tabs: [
      { key: 'routes', label: '线路列表', entityTitle: '线路', resource: 'routes', service,
        filters: [...dateFilters(), warehouseFilter, { key: 'route', label: '线路名称', placeholder: '请输入', defaultValue: params.get('route') || '' }],
        columns: [
          { key: 'route', label: '线路名称' }, { key: 'customerCount', label: '客户数', href: orderHref },
          { key: 'orderingCustomerCount', label: '下单客户数' }, { key: 'orderCount', label: '下单数' },
          { key: 'orderAmount', label: '下单金额', render: (row) => row.orderCount ? Number(row.orderAmount || 0).toFixed(2) : '--' },
          { key: 'warehouse', label: '仓库' }, { key: 'vehicle', label: '关联车辆' },
          { key: 'driver', label: '关联司机', link: true }, { key: 'status', label: '状态', format: 'status' }
        ],
        formFields: routeForm, formSubmitLabel: '确定',
        toolbar: [{ key: 'add', label: '添加线路', primary: true }],
        rowActions: [
          { key: 'edit', label: '编辑' },
          { key: 'disable', label: '禁用', visible: ['ENABLE'], transition: 'disable' },
          { key: 'enable', label: '启用', visible: ['DISABLE'], transition: 'enable' },
          { key: 'delete', label: '删除', danger: true }
        ] },
      { key: 'orders', label: '线路订单列表', resource: 'routeOrders', service,
        filters: [...dateFilters(), { ...warehouseFilter, emptyLabel: '请选择' }, routeFilter, customerFilter,
          { key: 'status', label: '状态', options: ['已分配', '未分配'], emptyLabel: '请选择' }],
        columns: [...orderColumns, { key: 'routeStatus', label: '状态' }, orderStatus,
          { key: 'orderAmount', label: '下单金额', format: 'money' }],
        hideRowActions: true },
      { key: 'loading', label: '线路装车列表', resource: 'routeLoading', service,
        filters: [...dateFilters(true), { ...warehouseFilter, emptyLabel: '请选择' }, routeFilter, customerFilter,
          { key: 'status', label: '状态', options: ['待装车', '部分装车', '已装车'], emptyLabel: '请选择' }],
        selectable: true, hideSequence: true, selectableWhen: (row) => ['待装车', '部分装车'].includes(row.loadingStatus),
        columns: [...orderColumns,
          { key: 'loadingPhotos', label: '装车拍照', render: (row) => {
            const photos = (Array.isArray(row.loadingPhotos) ? row.loadingPhotos : []).map((photo) => typeof photo === 'string' ? photo : photo.url || photo.src).filter((url) => /^(https?:\/\/|data:image\/(png|jpeg|webp);base64,|\.\/assets\/)/i.test(url));
            return photos.length ? photos.map((url, index) => `<a class="cell-link" href="${escape(url)}" target="_blank" rel="noopener noreferrer">照片${index + 1}</a>`).join(' ') : '--';
          } },
          { key: 'deliveryAmount', label: '配送金额', format: 'money' }, { key: 'loadingStatus', label: '状态' }, orderStatus],
        toolbar: [{ key: 'batch-load', label: '批量装车', primary: true, requiresSelection: true, batchTransition: 'load' }],
        rowActions: [
          { key: 'load', label: '去装车', disabled: (row) => row.loadingStatus === '已装车', transition: 'load' },
          { key: 'return-loading', label: '打回', disabled: (row) => row.loadingStatus === '待装车', transition: 'return-loading',
            message: '确定打回该订单？打回后将恢复为待装车状态。' }
        ] },
      { key: 'departures', label: '线路发车列表', resource: 'routeDepartures', service,
        filters: [...dateFilters(true), warehouseFilter, routeFilter],
        columns: [], hideTable: true, hideRowActions: true,
        renderSummary: (summary) => {
          const value = (key) => summary ? escape(summary[key]) : '--';
          return `<div class="route-departure-summary" aria-label="线路发车汇总">
            <span>配送车辆：${value('vehicleCount')}</span><span>配送客户总数：${value('customerCount')}</span>
            <span>总配送金额：${summary ? Number(summary.deliveryAmount || 0).toFixed(2) : '--'}</span>
            <span>已发车：${value('departedCount')}辆</span><span>待发车：${value('pendingCount')}辆</span>
          </div>`;
        } }
    ]
  };
})();
