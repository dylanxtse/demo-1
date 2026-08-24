(function () {
  const countActions = [
    { key: 'approve', label: '审核', href: (item) => `./inventory-document.html?type=count&mode=review&id=${encodeURIComponent(item.id)}`, visible: ['PENDING_AUDIT'] },
    { key: 'edit', label: '编辑', visible: ['PENDING_AUDIT'] },
    { key: 'copy', label: '复制', href: (item) => `./inventory-document.html?type=count&mode=copy&id=${encodeURIComponent(item.id)}` },
    { key: 'close', label: '关闭', transition: 'close', visible: ['PENDING_AUDIT', 'APPROVED'], message: '确定要关闭该盘点单吗？' }
  ];
  const lossActions = [
    { key: 'approve', label: '审核', href: (item) => `./inventory-document.html?type=loss&mode=review&id=${encodeURIComponent(item.id)}`, visible: ['PENDING_AUDIT'] },
    { key: 'edit', label: '编辑', visible: ['PENDING_AUDIT'] },
    { key: 'close', label: '关闭', transition: 'close', visible: ['PENDING_AUDIT', 'APPROVED'], message: '确定关闭该损溢单吗？' }
  ];
  window.RecordPageConfig = {
    title: '库存盘点',
    pageClass: 'order-module-page inventory-counting-page',
    showSelectionSummary: false,
    resource: 'inventoryCounts',
    filters: [
      { key: 'dateRange', label: '添加日期', type: 'dateRange' },
      { key: 'category', label: '商品分类', options: ['果蔬', '蛋奶类', '水产品', '主食'] },
      { key: 'goodsName', label: '商品名称', placeholder: '请输入名称/编号' },
      { key: 'warehouse', label: '仓库', options: ['中心仓', '北区仓', '临时仓'] },
      { key: 'status', label: '单据状态', options: [
        { label: '待审核', value: 'PENDING_AUDIT' },
        { label: '已审核', value: 'APPROVED' },
        { label: '已关闭', value: 'CLOSED' }
      ] },
      { key: 'keyword', label: '单据号', placeholder: '请输入盘点单号/损溢单号' }
    ],
    columns: [],
    tabs: [
      {
        key: 'count',
        label: '盘点管理',
        entityTitle: '盘点',
        resource: 'inventoryCounts',
        detailHref: (item) => `./inventory-document.html?type=count&mode=view&id=${encodeURIComponent(item.id)}`,
        editHref: (item) => `./inventory-document.html?type=count&mode=edit&id=${encodeURIComponent(item.id)}`,
        addHref: './inventory-document.html?type=count&mode=add',
        columns: [
          { key: 'countNo', label: '盘点单号', link: true },
          { key: 'countAt', label: '盘点时间' },
          { key: 'warehouse', label: '仓库' },
          { key: 'lossAmount', label: '盘损金额', format: 'money' },
          { key: 'overflowAmount', label: '盘溢金额', format: 'money' },
          { key: 'counter', label: '盘点人' },
          { key: 'status', label: '单据状态', format: 'status' },
          { key: 'creator', label: '添加人' },
          { key: 'createdAt', label: '添加时间' }
        ],
        toolbar: [
          { key: 'add', label: '添加盘点', primary: true },
          { key: 'export', label: '导出' }
        ],
        rowActions: countActions,
        formFields: [
          { key: 'warehouse', label: '仓库', required: true, options: ['中心仓', '北区仓', '临时仓'] },
          { key: 'countAt', label: '盘点时间', required: true, type: 'datetime-local' },
          { key: 'counter', label: '盘点人', required: true },
          { key: 'lossAmount', label: '盘损金额', type: 'number', defaultValue: 0 },
          { key: 'overflowAmount', label: '盘溢金额', type: 'number', defaultValue: 0 }
        ],
        createDefaults: { status: 'PENDING_AUDIT', creator: '当前用户' }
      },
      {
        key: 'loss',
        label: '损溢管理',
        entityTitle: '损溢单',
        resource: 'inventoryLosses',
        detailHref: (item) => `./inventory-document.html?type=loss&mode=view&id=${encodeURIComponent(item.id)}`,
        editHref: (item) => `./inventory-document.html?type=loss&mode=edit&id=${encodeURIComponent(item.id)}`,
        columns: [
          { key: 'lossNo', label: '损溢单号', link: true },
          { key: 'createdAt', label: '添加时间' },
          { key: 'type', label: '单据类型' },
          { key: 'relationNo', label: '关联单号' },
          { key: 'warehouse', label: '仓库' },
          { key: 'productCount', label: '商品数' },
          { key: 'amount', label: '损溢金额', format: 'money' },
          { key: 'status', label: '单据状态', format: 'status' },
          { key: 'creator', label: '添加人' }
        ],
        toolbar: [
          { key: 'export', label: '导出' }
        ],
        rowActions: lossActions,
        formFields: [
          { key: 'type', label: '单据类型', required: true, options: ['盘损', '盘溢'] },
          { key: 'relationNo', label: '关联单号', required: true },
          { key: 'warehouse', label: '仓库', required: true, options: ['中心仓', '北区仓', '临时仓'] },
          { key: 'productCount', label: '商品数', required: true, type: 'number' },
          { key: 'amount', label: '损溢金额', required: true, type: 'number' }
        ],
        createDefaults: { status: 'PENDING_AUDIT', creator: '当前用户' }
      }
    ]
  };
})();
