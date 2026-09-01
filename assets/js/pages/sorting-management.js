(function () {
  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function todayStr() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  const defaultDate = todayStr();

  function renderGoodsName(item) {
    const name = escapeHtml(window.DomUtils?.formatProductDisplay?.(item) || item.goodsName || '--');
    const marker = item.isNetVegetable ? '<span class="net-vegetable-tag">净菜</span>' : '';
    return `<span class="product-display-text">${marker}${name}</span>`;
  }

  function renderProgress(item) {
    const actual = Number(item.actualQty || 0);
    const order = Number(item.orderQty || 0);
    const unit = escapeHtml(item.unit || '');
    return `${actual}/${order}${unit}`;
  }

  function isShortage(item) {
    return item.shortage === '是';
  }

  function renderStatus(item) {
    const status = window.RecordPageConfig.statusMap[item.status] || [item.status || '--', ''];
    let html = `<span class="operation-status ${status[1]}">${escapeHtml(status[0])}</span>`;
    if (isShortage(item)) html += '<span class="operation-status danger" style="margin-left:4px">缺货</span>';
    return html;
  }

  const productColumns = [
    { key: 'goodsName', label: '商品名称（计量单位/品牌/规格）', render: renderGoodsName },
    { key: 'orderNo', label: '所属订单号', href: (item) => {
      const orderId = item.orderId || window.DemoStore?.get('orders')?.find((order) => order.orderNo === item.orderNo)?.id || '';
      return `./order-detail.html?id=${encodeURIComponent(orderId)}&orderNo=${encodeURIComponent(item.orderNo || '')}`;
    } },
    { key: 'customerName', label: '客户名称' },
    { key: 'canteen', label: '食堂' },
    { key: 'orderQty', label: '下单数量' },
    { key: 'actualQty', label: '实际数量', editableNumber: true, blankZero: true, placeholder: '请输入' },
    { key: 'unit', label: '计量单位' },
    { key: 'route', label: '线路' },
    { key: 'shipped', label: '是否发货' },
    { key: 'progress', label: '分拣进度', render: renderProgress },
    { key: 'stock', label: '库存' },
    { key: 'status', label: '分拣状态', render: renderStatus },
    { key: 'sorter', label: '分拣员' },
    { key: 'sortingAt', label: '分拣时间' }
  ];
  const customerColumns = [
    { key: 'customerName', label: '客户名称' },
    { key: 'canteen', label: '食堂' },
    { key: 'route', label: '线路' },
    { key: 'receiver', label: '收货人' },
    { key: 'phone', label: '收货手机' },
    { key: 'address', label: '收货地址' },
    { key: 'expectedAt', label: '期望送达时间' },
    { key: 'sortedCount', label: '已分拣数' },
    { key: 'orderCount', label: '总数量' },
    { key: 'progress', label: '分拣进度' },
    { key: 'status', label: '单据状态', format: 'status' }
  ];
  window.RecordPageConfig = {
    title: '分拣管理',
    pageClass: 'sorting-module-page sorting-status-boxed',
    usePagination: true,
    statusActionsInline: true,
    showSelectionSummary: false,
    resource: 'sortingItems',
    defaultCondition: { expectedAt: defaultDate },
    filters: [
      { key: 'expectedAt', label: '期望送达时间', type: 'date', defaultValue: defaultDate },
      { key: 'warehouse', label: '仓库', options: ['中心仓', '北区仓', '临时仓'] },
      { key: 'goodsName', label: '商品名称', placeholder: '请输入' },
      { key: 'isNetVegetable', label: '是否净菜', options: [
        { label: '是', value: 'true' },
        { label: '否', value: 'false' }
      ] },
      { key: 'category', label: '商品分类', options: ['果蔬', '蛋奶类', '水产品', '主食', '肉类'] },
      { key: 'sorter', label: '分拣员', options: ['陈分拣', '李分拣', '王分拣'] },
      { key: 'supplier', label: '供应商/采购员', placeholder: '请输入' },
      { key: 'route', label: '线路', options: ['东城一线', '南城二线', '北城一线', '西城一线'] },
      { key: 'shortage', label: '是否缺货', options: ['是', '否'] },
      { key: 'customerName', label: '客户名称', placeholder: '请输入' },
      { key: 'stockLevel', label: '库存', options: ['有库存', '库存不足'] },
      { key: 'orderTag', label: '订单标签', options: ['营养餐', '普通餐'] },
      { key: 'orderNo', label: '订单号', placeholder: '请输入' }
    ],
    columns: productColumns,
    tabs: [
      {
        key: 'product',
        label: '商品分拣',
        resource: 'sortingItems',
        columns: productColumns,
        statusTabs: [
          { label: '未分拣', value: 'PENDING' },
          { label: '已分拣', value: 'SORTED' },
          { label: '全部', value: '' }
        ],
        toolbar: [
          {
            key: 'batchPrintQr',
            label: '一键打印',
            primary: true,
            requiresSelection: true,
            validateSelection: (items) => items.length && items.every((item) => item.status === 'SORTED') ? '' : '仅已分拣商品可以打印二维码',
            toast: '已生成商品分拣二维码打印预览',
            dropdownVisibleStatuses: [''],
            defaultActionByStatus: { PENDING: 'batchSort', SORTED: 'batchResetSort', '': 'batchPrintQr' },
            labelByStatus: { PENDING: '一键分拣', SORTED: '一键重置分拣', '': '一键打印' },
            dropdownOptions: [
              { key: 'batchSort', label: '一键分拣', batchTransition: 'sort', message: '确定一键分拣选中商品吗？', visibleStatuses: ['PENDING', ''] },
              { key: 'batchResetSort', label: '一键重置分拣', batchTransition: 'resetSort', message: '确定一键重置选中商品的分拣状态吗？', visibleStatuses: ['SORTED', 'PARTIAL', ''] }
            ]
          },
          { key: 'batchShortage', label: '批量标记缺货', batchTransition: 'markShortage', message: '确定标记选中商品为缺货？', visibleStatuses: ['PENDING', ''] },
          { key: 'export', label: '导出', icon: 'supplier-purchase-export' },
          { key: 'printDocument', label: '打印', icon: 'supplier-purchase-print', side: true, toast: '已生成分拣单据打印预览' }
        ],
        rowActions: [
          { key: 'sort', label: '分拣', transition: 'sort', visible: ['PENDING', 'PARTIAL'], disabled: isShortage, message: '确定分拣该商品吗？' },
          { key: 'markShortage', label: '标记缺货', transition: 'markShortage', visibleFn: (item) => !isShortage(item) && ['PENDING', 'PARTIAL'].includes(item.status), message: '确定标记该商品为缺货？' },
          { key: 'cancelShortage', label: '取消缺货', transition: 'cancelShortage', visibleFn: isShortage, message: '确定要取消该商品缺货状态吗？' },
          { key: 'resetSort', label: '重置', transition: 'resetSort', visible: ['SORTED', 'PARTIAL'], message: '确定重置该商品分拣状态和实际数量？' },
          { key: 'print', label: '打印', visibleFn: (item) => item.status === 'SORTED', toast: '已生成商品分拣二维码打印预览' }
        ]
      },
      {
        key: 'customer',
        label: '客户分拣',
        resource: 'sortingProgress',
        columns: customerColumns,
        statusTabs: [
          { label: '未分拣', value: 'PENDING,PARTIAL' },
          { label: '已分拣', value: 'SORTED' },
          { label: '全部', value: '' }
        ],
        toolbar: [
          { key: 'batchSort', label: '一键分拣', primary: true, batchTransition: 'sort', message: '确定一键分拣选中客户的商品吗？', visibleStatuses: ['PENDING', 'PARTIAL', ''] },
          { key: 'print', label: '一键打印', icon: 'supplier-purchase-print', toast: '已生成客户分拣打印预览', visibleStatuses: ['SORTED'] },
          { key: 'export', label: '导出', icon: 'supplier-purchase-export' }
        ],
        rowActions: [
          {
            key: 'sort',
            label: '分拣',
            href: (item) => `./sorting-customer-detail.html?customer=${encodeURIComponent(item.customerName)}&canteen=${encodeURIComponent(item.canteen)}&date=${encodeURIComponent(String(item.expectedAt || '').slice(0, 10))}`
          },
          { key: 'print', label: '打印拣货单', toast: '已生成客户拣货单打印预览' }
        ]
      }
    ],
    toolbar: [],
    statusMap: {
      PENDING: ['未分拣', 'danger'],
      PARTIAL: ['部分分拣', 'warning'],
      SORTED: ['已分拣', 'success'],
      SHORTAGE: ['缺货', 'danger']
    }
  };
})();
