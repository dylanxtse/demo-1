(function () {
  window.RecordPageConfig = {
    title: '实收变更',
    pageClass: 'order-module-page',
    showSelectionSummary: false,
    resource: 'receiptChanges',
    addHref: './receipt-change-form.html?mode=add',
    editHref: (item) => `./receipt-change-form.html?mode=edit&id=${encodeURIComponent(item.id)}`,
    detailHref: (item) => `./receipt-change-detail.html?id=${encodeURIComponent(item.id)}`,
    filters: [
      { key: 'createdAt', label: '变更日期', type: 'date' },
      { key: 'orderNo', label: '订单号', placeholder: '请输入订单号' },
      { key: 'goodsName', label: '商品名称', placeholder: '请输入' },
      { key: 'status', label: '单据状态', options: [
        { label: '待审核', value: 'PENDING_AUDIT' },
        { label: '已审核', value: 'APPROVED' },
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
      { key: 'export', label: '导出' }
    ],
    rowActions: [
      { key: 'approve', label: '审核', href: (item) => `./receipt-change-form.html?mode=audit&id=${encodeURIComponent(item.id)}`, visible: ['PENDING_AUDIT'] },
      { key: 'edit', label: '编辑', visible: ['PENDING_AUDIT'] },
      { key: 'close', label: '关闭', transition: 'close', visible: ['PENDING_AUDIT', 'APPROVED'], confirmTitle: '关闭实收变更', message: '确定要关闭该订单吗？' },
      { key: 'delete', label: '删除', danger: true, visible: ['PENDING_AUDIT'] }
    ],
    formFields: [
      { key: 'customerName', label: '客户名称', required: true },
      { key: 'canteen', label: '食堂', required: true },
      { key: 'orderNo', label: '关联订单号', required: true },
      { key: 'goodsName', label: '商品名称', required: true },
      { key: 'shippingAt', label: '发货时间', type: 'datetime-local', required: true },
      { key: 'beforeAmount', label: '变更前金额', type: 'number', required: true },
      { key: 'afterAmount', label: '变更后金额', type: 'number', required: true }
    ],
    createDefaults: { status: 'PENDING_AUDIT', creator: '当前用户', auditAt: '', auditor: '' },
    deleteMessage: '删除后变更单将不再显示，且无法恢复，是否确认删除？'
  };
})();
