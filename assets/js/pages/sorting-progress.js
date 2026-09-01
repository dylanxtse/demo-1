(function () {
  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  const renderGoodsName = (item) => {
    const marker = window.OperationsService?.isNetVegetable?.(item)
      ? '<span class="net-vegetable-tag">净菜</span>'
      : '';
    const display = window.DomUtils?.formatProductDisplay?.(item) || item.goodsName || '--';
    return `<span class="product-display-text">${marker}${escapeHtml(display)}</span>`;
  };

  const productDetailColumns = [
    { key: 'customerName', label: '客户名称' },
    { key: 'canteen', label: '食堂' },
    { key: 'orderQty', label: '下单数量' },
    { key: 'actualQty', label: '实际数量' },
    { key: 'route', label: '线路' },
    { key: 'status', label: '分拣状态', format: 'status' }
  ];
  const customerDetailColumns = [
    { key: 'goodsName', label: '商品名称（计量单位/品牌/规格）', productDisplay: true },
    { key: 'orderQty', label: '下单数量' },
    { key: 'actualQty', label: '实际数量' },
    { key: 'route', label: '线路' },
    { key: 'status', label: '分拣状态', format: 'status' }
  ];

  window.RecordPageConfig = {
    title: '分拣进度',
    resource: 'sortingItems',
    pageClass: 'sorting-module-page sorting-progress-page',
    usePagination: true,
    selectable: false,
    filters: [
      { key: 'expectedAt', label: '期望送达时间', type: 'date' },
      { key: 'warehouse', label: '仓库', options: ['中心仓', '北区仓', '临时仓'] },
      { key: 'goodsName', label: '商品名称', placeholder: '请输入' },
      { key: 'category', label: '商品分类', options: ['果蔬', '蛋奶类', '水产品', '主食'] },
      { key: 'shortage', label: '是否缺货', options: ['是', '否'] },
      { key: 'customerName', label: '客户名称', placeholder: '请输入' },
      { key: 'route', label: '线路', options: ['东城一线', '南城二线', '北城一线'] },
      { key: 'status', label: '分拣状态', options: [
        { label: '待分拣', value: 'PENDING' },
        { label: '部分分拣', value: 'PARTIAL' },
        { label: '已分拣', value: 'SORTED' }
      ] }
    ],
    columns: [],
    tabs: [
      {
        key: 'product',
        label: '商品分拣进度',
        resource: 'sortingItems',
        columns: [
          { key: 'goodsName', label: '商品名称（计量单位/品牌/规格）', render: renderGoodsName },
          { key: 'unit', label: '计量单位' },
          { key: 'actualQty', label: '已分拣数' },
          { key: 'orderQty', label: '下单数' },
          { key: 'route', label: '线路' },
          { key: 'status', label: '分拣状态', format: 'status' }
        ],
        rowActions: [
          {
            key: 'viewProgress',
            label: '查看',
            detailResource: 'sortingItems',
            detailColumns: productDetailColumns,
            matchKey: 'goodsName',
            sourceKey: 'goodsName',
            detailTitle: '商品分拣详情'
          }
        ]
      },
      {
        key: 'customer',
        label: '客户分拣进度',
        resource: 'sortingProgress',
        columns: [
          { key: 'customerName', label: '客户名称' },
          { key: 'canteen', label: '食堂' },
          { key: 'route', label: '线路' },
          { key: 'sortedCount', label: '已分拣数' },
          { key: 'orderCount', label: '下单数' },
          { key: 'status', label: '分拣状态', format: 'status' }
        ],
        rowActions: [
          {
            key: 'viewProgress',
            label: '查看',
            detailResource: 'sortingItems',
            detailColumns: customerDetailColumns,
            matchKey: 'customerName',
            sourceKey: 'customerName',
            detailTitle: '客户分拣情况'
          }
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
