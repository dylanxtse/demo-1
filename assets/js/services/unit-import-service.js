(function () {
  window.UnitImportService = window.ArchiveImport.create({
    entity: '计量单位',
    fields: [['unitName', '*计量单位', 24], ['conversionRate', '与KG换算率', 24]],
    kingdeeKey: 'kingdeeUnitId', kingdeeLabel: '金蝶计量单位id', numericKeys: ['conversionRate'],
    saveRow(data) { return window.UnitMeasurementService.create(data); }
  });
})();
