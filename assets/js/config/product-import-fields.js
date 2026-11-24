(function () {
  const fields = [
    ['name', '*商品名称', 160], ['category', '*商品分类', 200], ['ingredient', '对应食材', 250],
    ['purchaseType', '*采购类型', 160], ['defaultSupplier', '默认供应商', 190], ['buyer', '采购员', 160],
    ['responsible', '采购负责人', 180], ['unit', '*计量单位', 120], ['multiUnitEnabled', '*启用多单位', 140],
    ['auxiliaryUnit1', '辅助单位1', 120], ['auxiliaryRate1', '辅助单位1换算率', 170], ['marketPrice1', '市场价1', 140],
    ['auxiliaryUnit2', '辅助单位2', 120], ['auxiliaryRate2', '辅助单位2换算率', 170], ['marketPrice2', '市场价2', 140],
    ['marketPrice', '*市场价', 140], ['alias', '商品别名', 140], ['brand', '品牌', 120], ['spec', '规格', 130],
    ['storageCondition', '*储存条件', 140], ['origin', '产地', 120], ['description', '指标说明', 150],
    ['isWeighed', '是否称重', 140], ['kgConversionRate', '计量单位与kg的换算率', 190],
    ['certificate', '上传合格证明文件', 180], ['netContent', '净含量', 140], ['netContentUnit', '净含量单位', 130],
    ['shelfLifeEnabled', '设置保质期', 140], ['shelfLife', '保质期', 130], ['shelfLifeUnit', '保质期单位', 150],
    ['warningDays', '预警天数', 140], ['expiryMethod', '到期计算方式', 190]
  ];
  window.ProductImportFields = {
    forType(kingdee = false) {
      return (kingdee ? [['kingdeeProductId', '*金蝶商品id', 180], ...fields] : fields).map((field) => [...field]);
    },
    defaults: { isWeighed: '是', certificate: '不限制', shelfLifeEnabled: '是', shelfLifeUnit: '月', expiryMethod: '生产日期+保质期' }
  };
})();
