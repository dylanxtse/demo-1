(function () {
  window.WarehouseImportService = window.ArchiveImport.create({
    entity: '仓库',
    fields: [['warehouseName', '*仓库名称', 30], ['address', '地址', 50]],
    kingdeeKey: 'kingdeeWarehouseId', kingdeeLabel: '金蝶仓库id',
    saveRow(data) { return window.WarehouseArchiveService.save(data); }
  });
})();
