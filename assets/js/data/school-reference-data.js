(function () {
  const canteens = [
    { id: 'canteen-demo', name: '静安第一中学食堂（演示）', code: '--', contact: '张三', phone: '13598767869', address: '静安区' },
    { id: 'canteen-002', name: '静安1中食堂', code: '91371721MABYLE8Q4R', contact: '王锦安', phone: '15646871654', address: '静安区' },
    { id: 'canteen-003', name: '第2食堂', code: '--', contact: '刘先生', phone: '13866551122', address: '静安区' },
    { id: 'canteen-004', name: '第一食堂', code: '--', contact: '王先生', phone: '15269836547', address: '静安区' },
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
