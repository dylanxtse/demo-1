(function () {
  window.RecordPageConfig = {
    title: '发货管理',
    pageClass: 'order-module-page shipping-management-page',
    showSelectionSummary: false,
    resource: 'shippingOrders',
    filters: [
      { key: 'dateRange', label: '期望送达时间', type: 'dateRange' },
      { key: 'warehouse', label: '仓库', options: ['中心仓', '北区仓', '临时仓'] },
      { key: 'orderNo', label: '订单号', placeholder: '请输入订单号' },
      { key: 'customerName', label: '客户名称', placeholder: '请输入' },
      { key: 'route', label: '线路', options: ['东城一线', '南城二线', '北城一线'] },
      { key: 'status', label: '发货状态', options: [
        { label: '未发货', value: 'PENDING' },
        { label: '已发货', value: 'SHIPPED' }
      ] }
    ],
    columns: [],
    tabs: [
      {
        key: 'orders',
        label: '订单发货出库',
        resource: 'shippingOrders',
        columns: [
          { key: 'orderNo', label: '订单号', link: true },
          { key: 'customerName', label: '客户名称' },
          { key: 'canteen', label: '食堂' },
          { key: 'receiver', label: '收货人' },
          { key: 'phone', label: '收货手机' },
          { key: 'address', label: '收货地址' },
          { key: 'route', label: '线路' },
          { key: 'warehouse', label: '仓库' },
          { key: 'shippingAmount', label: '发货金额', format: 'money' },
          { key: 'sortingStatus', label: '分拣状态', render: (item) => window.DomUtils.escapeHtml(window.BusinessRules.statusLabel('sortingTasks', item.sortingStatus)) },
          { key: 'status', label: '发货状态', format: 'status' },
          { key: 'printed', label: '是否打印' },
          { key: 'expectedAt', label: '期望送达时间' },
          { key: 'orderTag', label: '订单标签' }
        ],
        rowActions: [
          { key: 'ship', label: '发货出库', transition: 'ship', visible: ['PENDING'], confirmTitle: '发货出库', message: '是否确定发货？' },
          { key: 'print', label: '打印', toast: '已生成发货单打印预览' }
        ]
      },
      {
        key: 'difference',
        label: '发货差异表',
        resource: 'shippingDifferences',
        columns: [
          { key: 'orderNo', label: '订单号', link: true },
          { key: 'goodsName', label: '商品名称（计量单位/品牌/规格）' },
          { key: 'warehouse', label: '仓库' },
          { key: 'stockQty', label: '库存数量' },
          { key: 'sortingQty', label: '分拣数量' },
          { key: 'differenceQty', label: '差异' },
          { key: 'status', label: '处理状态', format: 'status' },
          { key: 'createdAt', label: '统计时间' }
        ],
        rowActions: [
          { key: 'complete', label: '一键报溢', transition: 'complete', visible: ['PENDING'], confirmTitle: '一键报溢', message: '请再次确认是否一键报溢？' }
        ]
      }
    ],
    toolbar: [
      { key: 'batchShip', label: '一键发货', primary: true, batchTransition: 'ship', message: '是否确定发货？' },
      { key: 'print', label: '打印', toast: '已生成订单发货出库打印预览' },
      { key: 'export', label: '导出' }
    ],
    statusMap: {
      PENDING: ['未发货', 'warning'],
      SHIPPED: ['已发货', 'success'],
      COMPLETED: ['已处理', 'success']
    }
  };
})();
