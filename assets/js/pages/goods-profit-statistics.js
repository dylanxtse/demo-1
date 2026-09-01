(function () {
  window.RecordPageConfig = {
    title: '商品毛利统计',
    pageClass: 'order-module-page goods-profit-statistics-page',
    showSelectionSummary: false,
    selectable: false,
    resource: 'goodsProfitStatistics',
    filters: [
      { key: 'dateRange', label: '发/退货日期', type: 'dateRange' },
      { key: 'warehouse', label: '仓库', options: ['中心仓', '北区仓', '临时仓'] },
      { key: 'category', label: '商品分类', options: ['果蔬', '蛋奶类', '水产品', '主食', '食油'] },
      { key: 'goodsName', label: '商品名称', placeholder: '请输入' },
      { key: 'isNetVegetable', label: '是否净菜', options: [
        { label: '净菜', value: 'true' },
        { label: '非净菜', value: 'false' }
      ] },
      { key: 'businessUnit', label: '上级单位', options: ['学校', '机关单位'] },
      { key: 'customerType', label: '客户类型', options: ['学校', '幼儿园', '机关单位'] },
      { key: 'customerName', label: '客户名称', placeholder: '请输入' },
      { key: 'canteen', label: '食堂', placeholder: '请输入' },
      { key: 'orderNo', label: '订单号', placeholder: '请输入' }
    ],
    columns: [
      { key: 'goodsCode', label: '商品编号', link: true },
      { key: 'goodsName', label: '商品名称（计量单位/品牌/规格）', productDisplay: true },
      { key: 'category', label: '商品分类' },
      { key: 'warehouse', label: '仓库' },
      { key: 'unit', label: '计量单位' },
      { key: 'orderCount', label: '订单数' },
      { key: 'sendQty', label: '发货数量', format: 'decimal' },
      { key: 'sendAvgPrice', label: '发货均价', format: 'money' },
      { key: 'sendAmt', label: '发货金额', format: 'money' },
      { key: 'sendCostAvgPrice', label: '成本均价', format: 'money' },
      { key: 'sendCost', label: '发货成本', format: 'money' },
      { key: 'returnOrderCount', label: '退货单数' },
      { key: 'returnQty', label: '退货数量', format: 'decimal' },
      { key: 'returnAmt', label: '退货金额', format: 'money' },
      { key: 'returnCost', label: '退货成本', format: 'money' },
      { key: 'actualQty', label: '实际数量', format: 'decimal' },
      { key: 'actualAvgPrice', label: '实际均价', format: 'money' },
      { key: 'actualAmt', label: '实际金额', format: 'money' },
      { key: 'actualCost', label: '实际成本', format: 'money' },
      { key: 'grossProfit', label: '毛利', format: 'money' },
      { key: 'grossProfitRate', label: '毛利率' }
    ],
    headerRows: [
      [
        { key: 'goodsCode', label: '商品编号', rowspan: 2 },
        { key: 'goodsName', label: '商品名称（计量单位/品牌/规格）', rowspan: 2, productDisplay: true },
        { key: 'category', label: '商品分类', rowspan: 2 },
        { key: 'warehouse', label: '仓库', rowspan: 2 },
        { key: 'unit', label: '计量单位', rowspan: 2 },
        { label: '销售数据', colspan: 6 },
        { label: '退货数据', colspan: 4 },
        { label: '实际销售数据', colspan: 4 },
        { key: 'grossProfit', label: '毛利', rowspan: 2 },
        { key: 'grossProfitRate', label: '毛利率', rowspan: 2 }
      ],
      [
        { key: 'orderCount', label: '订单数' },
        { key: 'sendQty', label: '发货数量' },
        { key: 'sendAvgPrice', label: '发货均价' },
        { key: 'sendAmt', label: '发货金额' },
        { key: 'sendCostAvgPrice', label: '成本均价' },
        { key: 'sendCost', label: '发货成本' },
        { key: 'returnOrderCount', label: '退货单数' },
        { key: 'returnQty', label: '退货数量' },
        { key: 'returnAmt', label: '退货金额' },
        { key: 'returnCost', label: '退货成本' },
        { key: 'actualQty', label: '实际数量' },
        { key: 'actualAvgPrice', label: '实际均价' },
        { key: 'actualAmt', label: '实际金额' },
        { key: 'actualCost', label: '实际成本' }
      ]
    ],
    rowActions: [{ key: 'view', label: '查看明细' }],
    toolbar: [{ key: 'export', label: '导出' }]
  };
})();
