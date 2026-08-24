(function () {
  window.RecordPageConfig = {
    title: '库存明细',
    pageClass: 'order-module-page inventory-details-page',
    resource: 'inventoryDetails',
    selectable: false,
    filters: [
      { key: 'dateRange', label: '发生日期', type: 'dateRange' },
      { key: 'goodsName', label: '商品名称', placeholder: '请输入名称/编号' },
      { key: 'warehouse', label: '仓库', options: ['中心仓', '北区仓', '临时仓'] },
      { key: 'category', label: '商品分类', options: ['果蔬-果蔬二级', '蛋奶类-蛋奶类二级', '主食-粮食类'] },
      { key: 'documentType', label: '单据类型', options: ['期初库存', '采购入库', '销售出库', '盘盈入库', '盘亏出库'] },
      { key: 'partner', label: '供应商/客户', placeholder: '请输入' }
    ],
    columns: [
      { key: 'goodsCode', label: '商品编码', link: true },
      { key: 'goodsName', label: '商品名称（计量单位/品牌/规格）' },
      { key: 'category', label: '商品分类' },
      { key: 'warehouse', label: '仓库' },
      { key: 'documentType', label: '单据类型' },
      { key: 'relationNo', label: '关联单号' },
      { key: 'occurredAt', label: '添加时间' },
      { key: 'unit', label: '计量单位' },
      { key: 'occurredQty', label: '单据发生数量', format: 'signed' },
      { key: 'occurredAmount', label: '单据发生金额', format: 'money' },
      { key: 'partner', label: '供应商/客户' },
      { key: 'productionDate', label: '生产日期' },
      { key: 'shelfLife', label: '保质期' },
      { key: 'expiryDate', label: '到期日期' },
      { key: 'balance', label: '余额' },
      { key: 'qualification', label: '资质报告' },
      { key: 'remark', label: '备注' }
    ],
    toolbar: [{ key: 'export', label: '导出' }],
    rowActions: [{ key: 'view', label: '查看明细' }]
  };
})();
