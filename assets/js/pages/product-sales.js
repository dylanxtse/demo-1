(function () {
  window.RecordPageConfig = {
    title: '商品销量',
    pageClass: 'order-module-page product-sales-page',
    hideSequence: true,
    hideRowActions: true,
    showSelectionSummary: false,
    selectable: false,
    resource: 'productSales',
    filters: [
      { key: 'dateRange', label: '期望送达/退货日期', type: 'dateRange' },
      { key: 'category', label: '分类', options: ['果蔬', '蛋奶类', '水产品', '主食', '食油'] },
      { key: 'goodsName', label: '商品名称', placeholder: '请输入' },
      { key: 'isNetVegetable', label: '是否净菜', options: [
        { label: '净菜', value: 'true' },
        { label: '非净菜', value: 'false' }
      ] },
      { key: 'warehouse', label: '仓库', options: ['中心仓', '北区仓', '临时仓'] },
      { key: 'businessUnit', label: '上级单位', options: ['学校', '机关单位'] },
      { key: 'customerType', label: '客户类型', options: ['学校', '幼儿园', '机关单位'] },
      { key: 'customerName', label: '客户名称', placeholder: '请输入' },
      { key: 'canteen', label: '食堂', placeholder: '请输入' }
    ],
    columns: [
      { key: 'goodsCode', label: '商品编号', link: true },
      { key: 'goodsName', label: '商品名称（计量单位/品牌/规格）', productDisplay: true },
      { key: 'category', label: '商品分类' },
      { key: 'fullCategory', label: '完整分类' },
      { key: 'unit', label: '单位' },
      { key: 'orderCount', label: '订单数' },
      { key: 'orderQty', label: '下单数量', format: 'decimal' },
      { key: 'orderAmount', label: '下单金额', format: 'money' },
      { key: 'shippedQty', label: '发货数量', format: 'decimal' },
      { key: 'shippedAmount', label: '发货金额', format: 'money' },
      { key: 'returnCount', label: '退货数' },
      { key: 'returnQty', label: '退货数量', format: 'decimal' },
      { key: 'returnAmount', label: '退货金额', format: 'money' },
      { key: 'actualAmount', label: '实际金额', format: 'money' },
      { key: 'actualRank', label: '实际金额排名' }
    ],
    toolbar: [{ key: 'export', label: '导出' }]
  };
})();
