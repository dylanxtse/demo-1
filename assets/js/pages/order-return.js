(function () {
  window.RecordPageConfig = {
    title: '订单退货',
    pageClass: 'order-module-page order-return-page',
    useDemoListLayout: true,
    showSelectionSummary: false,
    resource: 'returns',
    addHref: './order-return-form.html?mode=add',
    editHref: (item) => `./order-return-form.html?mode=edit&id=${encodeURIComponent(item.id)}`,
    detailHref: (item) => `./order-return-detail.html?id=${encodeURIComponent(item.id)}`,
    filters: [
      { key: 'createdAt', label: '添加日期', type: 'date' },
      { key: 'orderNo', label: '订单号', placeholder: '请输入订单号' },
      { key: 'goodsName', label: '商品名称', placeholder: '请输入' },
      { key: 'status', label: '单据状态', options: [
        { label: '待审核', value: 'PENDING_AUDIT' },
        { label: '已审核', value: 'APPROVED' },
        { label: '已驳回', value: 'REJECTED' },
        { label: '已关闭', value: 'CLOSED' }
      ] }
    ],
    columns: [
      { key: 'returnNo', label: '退货单号', link: true },
      { key: 'customerName', label: '客户名称' },
      { key: 'canteen', label: '食堂' },
      { key: 'reason', label: '退货原因' },
      { key: 'orderNo', label: '关联订单号' },
      { key: 'inboundNo', label: '关联入库单号' },
      { key: 'warehouse', label: '退回仓库' },
      { key: 'status', label: '单据状态', format: 'status' },
      { key: 'creator', label: '添加人' },
      { key: 'createdAt', label: '添加时间' }
    ],
    toolbar: [
      { key: 'add', label: '添加退货', primary: true },
      { key: 'export', label: '导出' }
    ],
    rowActions: [
      { key: 'approve', label: '审核', href: (item) => `./order-return-form.html?mode=audit&id=${encodeURIComponent(item.id)}`, disabled: (item) => !['PENDING', 'PENDING_AUDIT'].includes(item.status) },
      { key: 'edit', label: '编辑', disabled: (item) => !['PENDING', 'PENDING_AUDIT'].includes(item.status) },
      { key: 'close', label: '关闭', transition: 'close', disabled: (item) => !['PENDING', 'PENDING_AUDIT', 'APPROVED'].includes(item.status), confirmTitle: '关闭退货', message: '确定要关闭该退货吗？' }
    ],
    formFields: [
      { key: 'customerName', label: '客户名称', required: true },
      { key: 'canteen', label: '食堂', required: true },
      { key: 'orderNo', label: '关联订单号', required: true },
      { key: 'inboundNo', label: '关联入库单号' },
      { key: 'goodsName', label: '商品名称', required: true },
      { key: 'warehouse', label: '退回仓库', required: true, options: ['中心仓', '北区仓', '临时仓'] },
      { key: 'reason', label: '退货原因', type: 'textarea', required: true }
    ],
    createDefaults: { status: 'PENDING_AUDIT', creator: '当前用户' },
  };
})();
