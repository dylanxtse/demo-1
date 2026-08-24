(function () {
  const rules = {
    category: { required: true, label: '商品分类' },
    name: { required: true, label: '商品名称' },
    purchaseType: { required: true, label: '采购类型' },
    defaultSupplier: { required: true, label: '默认供应商' },
    responsible: { required: true, label: '采购负责人' },
    unit: { required: true, label: '计量单位' },
    marketPrice: { required: true, label: '市场价', number: true, minimum: 0 }
  };

  window.ProductValidator = {
    validate(data) {
      const errors = {};
      Object.entries(rules).forEach(([field, rule]) => {
        if (data.isNetVegetable && ['defaultSupplier', 'responsible'].includes(field)) return;
        const value = String(data[field] ?? '').trim();
        if (rule.required && (!value || value === '请选择')) {
          errors[field] = `${rule.label}不能为空`;
        } else if (rule.number && (!Number.isFinite(Number(value)) || Number(value) < rule.minimum)) {
          errors[field] = `${rule.label}必须是大于或等于${rule.minimum}的数字`;
        }
      });
      if (data.shelfLifeEnabled) {
        const value = String(data.shelfLifeValue ?? '').trim();
        const unit = String(data.shelfLifeUnit ?? '').trim();
        if (!value || !Number.isInteger(Number(value)) || Number(value) < 1) {
          errors.shelfLifeValue = '保质期必须是大于或等于1的整数';
        }
        if (!unit || !['天', '月', '年'].includes(unit)) {
          errors.shelfLifeUnit = '请选择保质期单位';
        }
        const warning = String(data.shelfLifeWarning ?? '').trim();
        if (warning && (!Number.isInteger(Number(warning)) || Number(warning) < 0)) {
          errors.shelfLifeWarning = '预警天数必须是大于或等于0的整数';
        }
        if (!['生产日期+保质期', '生产日期+保质期-1'].includes(data.expiryCalculationMethod)) {
          errors.expiryCalculationMethod = '请选择到期日计算方式';
        }
      }
      if (data.isWeighed) {
        const conversionRate = String(data.conversionRate ?? '').trim();
        if (!conversionRate || !Number.isFinite(Number(conversionRate)) || Number(conversionRate) < 0.01) {
          errors.conversionRate = '换算率必须是大于或等于0.01的数字';
        }
      }
      return errors;
    }
  };
})();
