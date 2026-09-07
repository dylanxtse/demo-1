(function () {
  const mealDefaults = (breakfast, morningSnack, lunch, afternoonSnack, dinner) => ({
    breakfast,
    morningSnack,
    lunch,
    afternoonSnack,
    dinner
  });
  const enabledTagSetting = (breakfast, morningSnack, lunch, afternoonSnack, dinner) => ({
    enabled: true,
    defaultPeople: mealDefaults(breakfast, morningSnack, lunch, afternoonSnack, dinner)
  });
  const disabledTagSetting = () => ({
    enabled: false,
    defaultPeople: mealDefaults('', '', '', '', '')
  });
  const demoTagSettings = (enabledSettings) => Object.fromEntries([
    'TAG-001', 'TAG-002', 'TAG-003', 'TAG-004',
    'TAG-005', 'TAG-006', 'TAG-007', 'TAG-008'
  ].map((tagId) => [tagId, enabledSettings[tagId] || disabledTagSetting()]));
  const canteens = [
    { id: 'canteen-demo', name: '静安第一中学食堂（演示）', code: '--', contact: '张三', phone: '13598767869', address: '静安区', orderTagSettings: demoTagSettings({
      'TAG-001': enabledTagSetting(420, 180, 460, 170, 320),
      'TAG-004': enabledTagSetting(38, 16, 42, 14, 26)
    }) },
    { id: 'canteen-002', name: '静安1中食堂', code: '91371721MABYLE8Q4R', contact: '王锦安', phone: '15646871654', address: '静安区', orderTagSettings: demoTagSettings({
      'TAG-002': enabledTagSetting(318, 128, 336, 116, 244),
      'TAG-006': enabledTagSetting(26, 10, 30, 8, 20),
      'TAG-008': enabledTagSetting(12, 4, 14, 4, 8)
    }) },
    { id: 'canteen-003', name: '第2食堂', code: '--', contact: '刘先生', phone: '13866551122', address: '静安区', orderTagSettings: demoTagSettings({
      'TAG-003': enabledTagSetting(560, 210, 580, 200, 360),
      'TAG-005': enabledTagSetting(48, 18, 52, 16, 32)
    }) },
    { id: 'canteen-004', name: '第一食堂', code: '--', contact: '王先生', phone: '15269836547', address: '静安区', orderTagSettings: demoTagSettings({
      'TAG-001': enabledTagSetting(276, 96, 290, 90, 180),
      'TAG-007': enabledTagSetting(20, 6, 24, 5, 14)
    }) },
    { id: 'canteen-default', name: '默认', code: '--', contact: '默认', phone: '13658888888', address: '静安区' }
  ];

  const suppliers = [
    '统仓配送公司',
    '阳光智园供应链管理有限公司',
    '产品部学校食材集采供应链有限公司'
  ];

  const reconciliationRows = [
    {
      id: 'school-reconciliation-001', accountNo: 'XSDZ202608050400004', relatedNo: 'DD202608050400005', feedbackStatus: '无异议',
      supplier: '阳光智园供应链管理有限公司', canteen: '静安第一中学食堂（演示）', type: '销售订单', amount: 134, zeroing: 0, payable: 134,
      shippedAt: '2026-08-05 16:49:06', route: '静安1中线路', driver: '李德友', remark: '--'
    }
  ];

  window.SchoolReferenceData = Object.freeze({
    canteens: Object.freeze(canteens),
    suppliers: Object.freeze(suppliers),
    reconciliationRows: Object.freeze(reconciliationRows),
    accountsRows: Object.freeze([{ supplier: '阳光智园供应链管理有限公司', canteen: '静安第一中学食堂（演示）', amount: 134, zeroing: 0, payable: 134, shippedAt: '2026-08-05 16:49:06' }])
  });
})();
