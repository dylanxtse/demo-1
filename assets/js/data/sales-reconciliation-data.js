(function () {
  'use strict';

  const storageKey = 'procurement-sales-reconciliation-state-v2';
  const products = [
    { name: '上海青', unit: '斤', quantity: 2, unitPrice: 2, amount: 4, zeroing: 0, acceptedQuantity: 2, acceptedPrice: 2, differenceQuantity: 0, differencePrice: 0, differenceAmount: 0, remark: '' },
    { name: '猪肉', unit: '斤', quantity: 3, unitPrice: 20, amount: 60, zeroing: 0, acceptedQuantity: 3, acceptedPrice: 20, differenceQuantity: 0, differencePrice: 0, differenceAmount: 0, remark: '' },
    { name: '牛奶', unit: '盒', quantity: 5, unitPrice: 20, amount: 100, zeroing: 0, acceptedQuantity: 5, acceptedPrice: 20, differenceQuantity: 0, differencePrice: 0, differenceAmount: 0, remark: '' },
    { name: '鸡蛋', unit: '斤', quantity: 6, unitPrice: 2, amount: 12, zeroing: 0, acceptedQuantity: 6, acceptedPrice: 2, differenceQuantity: 0, differencePrice: 0, differenceAmount: 0, remark: '' },
    { name: '鸡肉', unit: '斤', quantity: 2, unitPrice: 15, amount: 30, zeroing: 0, acceptedQuantity: 2, acceptedPrice: 15, differenceQuantity: 0, differencePrice: 0, differenceAmount: 0, remark: '' },
    { name: '酸奶', unit: '盒', quantity: 2, unitPrice: 25, amount: 50, zeroing: 0, acceptedQuantity: 2, acceptedPrice: 25, differenceQuantity: 0, differencePrice: 0, differenceAmount: 0, remark: '' }
  ];

  const clone = (value) => JSON.parse(JSON.stringify(value));
  const productRows = () => clone(products);
  const scaledProductRows = (amount) => {
    const target = Number(amount || 0);
    const sourceTotal = products.reduce((sum, product) => sum + Number(product.amount || 0), 0);
    if (!sourceTotal || target === sourceTotal) return productRows();
    const ratio = target / sourceTotal;
    const rows = productRows().map((product) => ({
      ...product,
      unitPrice: Number((Number(product.unitPrice || 0) * ratio).toFixed(4)),
      acceptedPrice: Number((Number(product.acceptedPrice || 0) * ratio).toFixed(4)),
      amount: Number((Number(product.amount || 0) * ratio).toFixed(4))
    }));
    const roundedTotal = rows.reduce((sum, product) => sum + Number(product.amount || 0), 0);
    rows[rows.length - 1].amount = Number((rows[rows.length - 1].amount + target - roundedTotal).toFixed(4));
    return rows;
  };
  const createRecord = (data) => ({
    customerName: '魏县第一中学',
    canteen: '第一食堂',
    receiver: '李老师',
    phone: '13579797979',
    warehouse: '公司市区仓库',
    driver: '杨雄',
    route: '线路1',
    reconciler: '杨采',
    remark: '--',
    feedbackStatus: '未反馈',
    status: '未对账',
    zeroing: 0,
    amount: 256,
    receivable: 256,
    ...data,
    products: data.products || scaledProductRows(data.amount)
  });

  const defaultState = {
    records: [
      createRecord({ id: 'sale-recon-001', accountNo: 'XSDZ202608040300003', relatedNo: 'DD202608040300006', type: '销售订单', mode: 'shipping', amount: 60, receivable: 60, businessTime: '2026-08-04 18:10:30', canteen: '十一中食堂' }),
      createRecord({ id: 'sale-recon-002', accountNo: 'XSDZ202608040300002', relatedNo: 'DD202608040300005', type: '销售订单', mode: 'shipping', amount: 60, receivable: 60, businessTime: '2026-08-04 18:08:14', canteen: '十一中食堂' }),
      createRecord({ id: 'sale-recon-003', accountNo: 'XSDZ202608040300001', relatedNo: 'DD202608040300004', type: '销售订单', mode: 'shipping', amount: 100, receivable: 100, businessTime: '2026-08-04 17:05:40', canteen: '十一中食堂' }),
      createRecord({ id: 'sale-recon-004', accountNo: 'XSDZ202607270300001', relatedNo: 'DD202607270300001', type: '销售订单', mode: 'shipping', amount: 8, receivable: 8, businessTime: '2026-07-27 11:42:17', status: '已对账', canteen: '静安2中食堂', receiver: '李梁', phone: '18515566650' }),
      createRecord({ id: 'sale-recon-005', accountNo: 'THDZ202608190300001', relatedNo: 'THDD202607060300001', type: '销售退货', mode: 'return', amount: 256, receivable: 256, businessTime: '2026-08-19 11:52:57', canteen: '经费食堂', receiver: '李成志', phone: '18515500000', zeroing: 0 }),
      createRecord({ id: 'sale-recon-006', accountNo: 'XSDZ202608190300001', relatedNo: 'DD202607060300001', type: '销售订单', mode: 'shipping', amount: 486, receivable: 486, businessTime: '2026-08-19 11:52:57', canteen: '经费食堂', receiver: '李成志', phone: '18515500000' })
    ],
    statements: [
      {
        id: 'sales-statement-001',
        statementNo: 'DZ202606300001',
        customerName: '魏县第一中学',
        startDate: '2026-07-01',
        endDate: '2026-07-31',
        generatedAt: '2026-07-31 12:00:00',
        operator: '杨采',
        amount: 2070,
        zeroing: 0,
        receivable: 2070,
        recordIds: ['sale-recon-001', 'sale-recon-002']
      }
    ]
  };

  function readState() {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return clone(defaultState);
      const parsed = JSON.parse(raw);
      return {
        records: Array.isArray(parsed.records) ? parsed.records : clone(defaultState.records),
        statements: Array.isArray(parsed.statements) ? parsed.statements : clone(defaultState.statements)
      };
    } catch (error) {
      return clone(defaultState);
    }
  }

  function writeState(state) {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(state));
    } catch (error) {
      // file:// 页面或隐私模式下不可写时保留当前页状态，避免阻断页面查看。
    }
  }

  window.SalesReconciliationStore = {
    key: storageKey,
    getState: readState,
    saveState: writeState,
    getRecord(id) {
      return readState().records.find((record) => record.id === id) || null;
    },
    updateRecord(id, patch) {
      const state = readState();
      const index = state.records.findIndex((record) => record.id === id);
      if (index < 0) return null;
      state.records[index] = { ...state.records[index], ...clone(patch) };
      writeState(state);
      return clone(state.records[index]);
    },
    addStatement(statement) {
      const state = readState();
      const next = { ...clone(statement), id: statement.id || `sales-statement-${Date.now()}` };
      const index = state.statements.findIndex((item) => item.id === next.id);
      if (index >= 0) state.statements[index] = next;
      else state.statements.unshift(next);
      writeState(state);
      return clone(next);
    }
  };
})();
