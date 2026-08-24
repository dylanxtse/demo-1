(function () {
  function isPositiveNumber(value) {
    const num = Number(value);
    return Number.isFinite(num) && num > 0;
  }

  window.ProcessingValidator = {
    validate(data) {
      const errors = {};

      if (!data.materialWarehouse || data.materialWarehouse === '请选择') {
        errors.materialWarehouse = '请选择原料出库仓库';
      }
      if (!data.outputWarehouse || data.outputWarehouse === '请选择') {
        errors.outputWarehouse = '请选择成品入库仓库';
      }
      if (!data.processingDate) {
        errors.processingDate = '请选择加工日期';
      }

      if (!data.materials || data.materials.length === 0) {
        errors.materials = '至少添加一条原料消耗';
      } else {
        data.materials.forEach((item, index) => {
          if (!item.productCode) {
            errors[`material_${index}_product`] = '请选择原料商品';
          }
          if (!isPositiveNumber(item.consumeQty)) {
            errors[`material_${index}_consumeQty`] = '消耗量必须大于0';
          } else if (isPositiveNumber(item.stock) && Number(item.consumeQty) > Number(item.stock)) {
            errors[`material_${index}_consumeQty`] = '消耗量不能超过当前库存';
          }
        });
      }

      const duplicateMaterialCodes = data.materials
        .filter((item) => item.productCode)
        .map((item) => item.productCode);
      if (new Set(duplicateMaterialCodes).size !== duplicateMaterialCodes.length) {
        errors.materials = '原料商品不能重复';
      }

      if (!data.outputs || data.outputs.length === 0) {
        errors.outputs = '至少添加一条加工成品';
      } else {
        data.outputs.forEach((item, index) => {
          if (!item.productCode) {
            errors[`output_${index}_product`] = '请选择成品商品';
          }
          if (!isPositiveNumber(item.actualQty)) {
            errors[`output_${index}_actualQty`] = '实际获得量必须大于0';
          }
          if (!isPositiveNumber(item.costPrice)) {
            errors[`output_${index}_costPrice`] = '成品入库单价必须填写';
          }
        });
      }

      const duplicateOutputCodes = data.outputs
        .filter((item) => item.productCode)
        .map((item) => item.productCode);
      if (new Set(duplicateOutputCodes).size !== duplicateOutputCodes.length) {
        errors.outputs = '成品商品不能重复';
      }

      return errors;
    }
  };
})();
