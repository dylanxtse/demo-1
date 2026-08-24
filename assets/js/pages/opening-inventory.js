(function () {
  window.RecordPageConfig = {
    title: '期初库存',
    pageClass: 'order-module-page opening-inventory-page',
    showSelectionSummary: false,
    categoryTree: [
      { value: '主食', label: '主食（米面粉点心类）' },
      { value: '果蔬', label: '果蔬' },
      { value: '蛋奶类', label: '蛋奶类' },
      { value: '食油', label: '食油' },
      { value: '水产品', label: '水产品' },
      { value: '其他材料', label: '其他材料' },
      { value: '肉（豆）制品', label: '肉（豆）制品' }
    ],
    resource: 'openingInventory',
    filters: [
      { key: 'goodsName', label: '商品名称/编码', placeholder: '请输入名称/编号' },
      { key: 'inputType', label: '商品录入类型', options: ['手工录入', '导入'] },
      { key: 'warehouse', label: '商品所属仓库', options: ['中心仓', '北区仓', '临时仓'] }
    ],
    columns: [
      { key: 'goodsCode', label: '商品编号', link: true },
      { key: 'goodsName', label: '商品名称（计量单位/规格/指标说明）' },
      { key: 'category', label: '商品分类' },
      { key: 'unit', label: '计量单位' },
      { key: 'openingQty', label: '期初库存', editableNumber: true },
      { key: 'openingPrice', label: '期初单价', editableNumber: true },
      { key: 'openingAmount', label: '期初金额', editableNumber: true }
    ],
    toolbar: [
      { key: 'import', label: '导入', primary: true, toast: '已进入期初库存导入演示，可使用期初库存导入模板' }
    ],
    rowActions: [
      { key: 'editOpening', label: '编辑', formTitle: '编辑期初库存', formFields: [
        { key: 'openingQty', label: '期初库存', type: 'number', required: true },
        { key: 'openingPrice', label: '期初单价', type: 'number', required: true }
      ] }
    ]
  };
})();
