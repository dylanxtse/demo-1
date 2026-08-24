(function () {
  const limitFields = [
    { key: 'upperLimit', label: '库存上限', type: 'number', required: true, placeholder: '请输入库存上限值' },
    { key: 'lowerLimit', label: '库存下限', type: 'number', required: true, placeholder: '请输入库存下限值' }
  ];
  window.RecordPageConfig = {
    title: '库存余额',
    pageClass: 'order-module-page inventory-balance-page',
    showSelectionSummary: false,
    resource: 'inventoryBalance',
    filters: [
      { key: 'goodsName', label: '商品名称', placeholder: '请输入名称/编号' },
      { key: 'category', label: '商品分类', options: ['果蔬-果蔬二级', '蛋奶类-蛋奶类二级', '主食-粮食类', '水产品-水产品二级'] },
      { key: 'warehouse', label: '仓库', options: ['中心仓', '北区仓', '临时仓'] },
      { key: 'unit', label: '计量单位', options: ['斤', 'KG', '瓶', 'L'] }
    ],
    columns: [
      { key: 'goodsCode', label: '商品编码', link: true },
      { key: 'goodsName', label: '商品名称（计量单位/品牌/规格）' },
      { key: 'category', label: '商品分类' },
      { key: 'warehouse', label: '仓库' },
      { key: 'unit', label: '计量单位' },
      { key: 'transitStock', label: '在途库存' },
      { key: 'currentStock', label: '现有库存' },
      { key: 'averageCost', label: '成本均价', format: 'money' },
      { key: 'totalAmount', label: '库存总金额', format: 'money' },
      { key: 'upperLimit', label: '库存上限' },
      { key: 'lowerLimit', label: '库存下限' }
    ],
    toolbar: [
      { key: 'batchLimits', label: '批量设置上下限', primary: true, batchUpdate: true, formTitle: '批量设置库存上下限', formFields: limitFields },
      { key: 'import', label: '导入库存上下限', toast: '已进入库存上下限导入演示' },
      { key: 'export', label: '导出' }
    ],
    rowActions: [
      { key: 'setLimits', label: '设置库存上下限', formTitle: '设置库存上/下限', formFields: limitFields },
      { key: 'convert', label: '单位转换', formTitle: '添加单位转换', formFields: [
        { key: 'currentStock', label: '转换后数量', type: 'number', required: true },
        { key: 'conversionRemark', label: '转换说明', type: 'textarea' }
      ] }
    ]
  };
})();
