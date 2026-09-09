(function () {
  window.RecordPageConfig = {
    title: '订单汇总',
    pageClass: 'order-module-page order-summary-page',
    usePagination: true,
    hideRowActions: true,
    selectable: false,
    resource: 'orders',
    filters: [
      { key: 'expectedAt', label: '期望送达时间', type: 'date' },
      { key: 'customerName', label: '客户名称', placeholder: '请输入' },
      { key: 'customerType', label: '客户类型', options: ['学校', '幼儿园', '机关单位'] },
      { key: 'orderTag', label: '订单标签', options: ['营养餐', '普通餐', '应急保供'] },
      { key: 'status', label: '单据状态', options: [
        { label: '待确认', value: 'PENDING_CONFIRM' },
        { label: '待审核', value: 'PENDING_AUDIT' },
        { label: '待分拣', value: 'READY_FOR_SORTING' },
        { label: '待发货', value: 'READY_FOR_SHIPPING' },
        { label: '已发货', value: 'SHIPPED' },
        { label: '已完成', value: 'COMPLETED' }
      ] },
      { key: 'warehouse', label: '仓库', options: ['中心仓', '北区仓', '临时仓'] },
      { key: 'mealName', label: '订单餐次', emptyLabel: '请选择', placeholderOnly: true, options: window.OrderMealOptions || ['早餐', '午餐', '晚餐', '早点', '午点', '晚点'] }
    ],
    columns: [
      { key: 'orderNo', label: '订单号', link: true },
      { key: 'customerName', label: '客户名称' },
      { key: 'canteen', label: '食堂' },
      { key: 'mealName', label: '订单餐次' },
      { key: 'expectedAt', label: '期望送达时间' },
      { key: 'productCount', label: '商品种类数' },
      { key: 'orderAmount', label: '下单金额', format: 'money' },
      { key: 'status', label: '单据状态', format: 'status' }
    ],
    toolbar: [{ key: 'export', label: '导出' }]
  };
})();
