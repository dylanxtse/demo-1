(function () {
  const customers = [
    '第一实验学校', '阳光幼儿园', '育才中学', '机关第二食堂', '第三小学',
    '实验幼儿园', '第七中学', '机关第一食堂', '东城职业学校', '南城中心幼儿园'
  ];
  const editableStatuses = ['PENDING', 'PENDING_AUDIT'];
  const closableStatuses = [...editableStatuses, 'APPROVED', 'COMPLETED'];

  window.RecordPageConfig = {
    title: '实收变更',
    pageClass: 'order-module-page receipt-change-page',
    useDemoListLayout: true,
    usePagination: true,
    showSelectionSummary: false,
    resource: 'receiptChanges',
    dateSeparator: ' - ',
    // 截图默认展示一条已完成单据；查询、重置后仍可查看完整数据。
    initialCondition: { status: 'APPROVED' },
    statusMap: {
      PENDING: ['待审核', 'warning'],
      PENDING_AUDIT: ['待审核', 'warning'],
      APPROVED: ['已完成', 'success'],
      COMPLETED: ['已完成', 'success'],
      CLOSED: ['已关闭', 'danger']
    },
    filters: [
      { key: 'createdAt', label: '变更日期', type: 'dateRange', conditionKey: 'createdAtRange', defaultStart: '2026-08-11', defaultEnd: '2026-09-11' },
      { key: 'goodsName', label: '商品名称', placeholder: '请输入' },
      { key: 'customerName', label: '客户名称', options: customers },
      { key: 'shippingAt', label: '发货时间', type: 'dateRange', conditionKey: 'shippingAtRange', defaultStart: '2026-05-01', defaultEnd: '2026-09-30' },
      { key: 'orderNo', label: '订单号', placeholder: '请输入订单号' },
      { key: 'status', label: '单据状态', options: [
        { label: '待审核', value: 'PENDING_AUDIT' },
        { label: '已完成', value: 'APPROVED' },
        { label: '已关闭', value: 'CLOSED' }
      ] }
    ],
    columns: [
      { key: 'changeNo', label: '变更单号', link: true },
      { key: 'beforeAmount', label: '变更前金额', format: 'money' },
      { key: 'afterAmount', label: '变更后金额', format: 'money' },
      { key: 'differenceAmount', label: '差异金额', format: 'signed' },
      { key: 'customerName', label: '客户名称' },
      { key: 'canteen', label: '食堂' },
      { key: 'shippingAt', label: '发货时间' },
      { key: 'auditAt', label: '审核时间' },
      { key: 'auditor', label: '审核人' },
      { key: 'orderNo', label: '关联订单号' },
      { key: 'status', label: '单据状态', format: 'status' },
      { key: 'creator', label: '添加人' },
      { key: 'createdAt', label: '添加时间' }
    ],
    toolbar: [
      { key: 'add', label: '添加变更', primary: true },
      { key: 'export', label: '导出', side: true, icon: 'supplier-purchase-export' }
    ],
    rowActions: [
      { key: 'approve', label: '审核', href: (item) => `./receipt-change-form.html?mode=audit&id=${encodeURIComponent(item.id)}`, disabled: (item) => !editableStatuses.includes(item.status) },
      { key: 'edit', label: '编辑', disabled: (item) => !editableStatuses.includes(item.status) },
      { key: 'close', label: '关闭', danger: true, transition: 'close', disabled: (item) => !closableStatuses.includes(item.status), confirmTitle: '关闭实收变更', message: '确定要关闭该变更单吗？' }
    ],
    formFields: [],
    createDefaults: { status: 'PENDING_AUDIT', creator: '当前用户', auditAt: '', auditor: '' }
  };
})();
