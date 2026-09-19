(function () {
  'use strict';

  const storageKey = 'procurement-sales-reconciliation-state-v6';
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
    customerName: '静安第一中学',
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

  const firstPageRecords = [
    createRecord({ id: 'sale-recon-001', accountNo: 'XSDZ202609150300002', relatedNo: 'DD202609150300002', type: '销售订单', mode: 'shipping', amount: 35, receivable: 35, businessTime: '2026-09-15 10:41:32', canteen: '静安第一中学食堂（经费）', receiver: '', phone: '--', warehouse: '', driver: '', route: '', reconciler: '杨' }),
    createRecord({ id: 'sale-recon-002', accountNo: 'XSDZ202609150300001', relatedNo: 'DD202609150300001', type: '销售订单', mode: 'shipping', amount: 33, receivable: 33, businessTime: '2026-09-15 10:41:32', canteen: '静安第一中学食堂（经费）', receiver: '', phone: '--', warehouse: '', driver: '', route: '', reconciler: '杨', status: '已对账' }),
    createRecord({ id: 'sale-recon-003', accountNo: 'XSDZ202608040300003', relatedNo: 'DD202608040300006', type: '销售订单', mode: 'shipping', amount: 15, receivable: 15, businessTime: '2026-08-04 18:10:30', canteen: '十一中食堂', receiver: '李老师', phone: '13579797979' }),
    createRecord({ id: 'sale-recon-004', accountNo: 'XSDZ202608040300002', relatedNo: 'DD202608040300005', type: '销售订单', mode: 'shipping', amount: 60, receivable: 60, businessTime: '2026-08-04 18:08:14', canteen: '十一中食堂', receiver: '李老师', phone: '13579797979' }),
    createRecord({ id: 'sale-recon-005', accountNo: 'XSDZ202608040300001', relatedNo: 'DD202608040300004', type: '销售订单', mode: 'shipping', amount: 100, receivable: 100, businessTime: '2026-08-04 17:05:40', canteen: '111', receiver: '李收敛', phone: '18737423482', reconciler: '小李' }),
    createRecord({ id: 'sale-recon-006', accountNo: 'XSDZ202607270300001', relatedNo: 'DD202607270300001', type: '销售订单', mode: 'shipping', amount: 8, receivable: 8, businessTime: '2026-07-27 11:42:17', canteen: '静安2中食堂', receiver: '李梁', phone: '18515566650', status: '已对账' }),
    createRecord({ id: 'sale-recon-007', accountNo: 'XSDZ202608190300001', relatedNo: 'DD202607060300001', type: '销售订单', mode: 'shipping', amount: 486, receivable: 486, businessTime: '2026-08-19 11:52:57', canteen: '经费食堂', receiver: '李成志', phone: '18515500000', reconciler: '杨' }),
    createRecord({ id: 'sale-recon-008', accountNo: 'XSDZ202606160300004', relatedNo: 'DD202606150300005', type: '销售订单', mode: 'shipping', amount: 190, receivable: 190, businessTime: '2026-06-16 11:07:42', canteen: '111', receiver: '李收敛', phone: '18737423482' }),
    createRecord({ id: 'sale-recon-009', accountNo: 'XSDZ202606160300003', relatedNo: 'DD202606150300004', type: '销售订单', mode: 'shipping', amount: 295, zeroing: 1, receivable: 294, businessTime: '2026-06-16 11:07:42', canteen: '111', receiver: '李收敛', phone: '18737423482' }),
    createRecord({ id: 'sale-recon-010', accountNo: 'XSDZ202606160300002', relatedNo: 'DD202606150300003', type: '销售订单', mode: 'shipping', amount: 430, receivable: 430, businessTime: '2026-06-16 11:07:42', canteen: '111', receiver: '李收敛', phone: '18737423482' })
  ];

  const firstPageFillerAmounts = [240, 220, 210, 190, 180, 170, 160, 150, 130, 119];
  const firstPageFillers = firstPageFillerAmounts.map((amount, index) => {
    const zeroing = index < 5 ? 1 : 0;
    const day = String(15 - index).padStart(2, '0');
    return createRecord({
      id: `sale-recon-${String(index + 11).padStart(3, '0')}`,
      accountNo: `XSDZ202606${day}030000${String(index + 6).padStart(2, '0')}`,
      relatedNo: `DD202606${day}030000${String(index + 6).padStart(2, '0')}`,
      type: '销售订单',
      mode: 'shipping',
      amount,
      zeroing,
      receivable: amount - zeroing,
      businessTime: `2026-06-${day} 09:${String(20 - index).padStart(2, '0')}:00`,
      canteen: ['十一中食堂', '静安2中食堂', '经费食堂'][index % 3],
      receiver: ['李老师', '李梁', '李成志'][index % 3],
      phone: ['13579797979', '18515566650', '18515500000'][index % 3]
    });
  });

  const secondPageAmounts = [...Array(20).fill(250), 252];
  const secondPageRecords = secondPageAmounts.map((amount, index) => {
    const month = index < 11 ? '05' : '04';
    const day = String(30 - (index % 11) - (index >= 11 ? 1 : 0)).padStart(2, '0');
    return createRecord({
      id: `sale-recon-${String(index + 21).padStart(3, '0')}`,
      accountNo: `XSDZ2026${month}${day}0300${String(index + 21).padStart(5, '0')}`,
      relatedNo: `DD2026${month}${day}0300${String(index + 21).padStart(5, '0')}`,
      type: '销售订单',
      mode: 'shipping',
      amount,
      receivable: amount,
      businessTime: `2026-${month}-${day} 08:${String(index % 6).padStart(2, '0')}:00`,
      canteen: ['十一中食堂', '静安2中食堂', '经费食堂'][index % 3],
      receiver: ['李老师', '李梁', '李成志'][index % 3],
      phone: ['13579797979', '18515566650', '18515500000'][index % 3]
    });
  });

  const customerAccounts = [
    {
      id: 'customer-account-001',
      customerCode: '31010630073',
      customerName: '静安第一中学',
      canteen: '111',
      contactName: '李收敛',
      contactPhone: '18737423482',
      status: '部分对账',
      documentCount: 15,
      amount: 2075,
      zeroing: 1,
      receivable: 2074,
      received: 0,
      outstanding: 0,
      businessDate: '2026-08-31'
    },
    {
      id: 'customer-account-002',
      customerCode: '31010600012',
      customerName: '静安第11中学',
      canteen: '经费食堂',
      contactName: '李成志',
      contactPhone: '18515500000',
      status: '未对账',
      documentCount: 1,
      amount: 486,
      zeroing: 0,
      receivable: 486,
      received: 0,
      outstanding: 0,
      businessDate: '2026-08-31'
    },
    {
      id: 'customer-account-003',
      customerCode: '31010600012',
      customerName: '静安第11中学',
      canteen: '十一中食堂',
      contactName: '李老师',
      contactPhone: '13579797979',
      status: '部分对账',
      documentCount: 2,
      amount: 75,
      zeroing: 0,
      receivable: 75,
      received: 0,
      outstanding: 0,
      businessDate: '2026-08-31'
    },
    {
      id: 'customer-account-004',
      customerCode: '31010600003',
      customerName: '静安第2中学',
      canteen: '静安2中食堂',
      contactName: '李梁',
      contactPhone: '18515566650',
      status: '部分对账',
      documentCount: 8,
      amount: 474,
      zeroing: 5,
      receivable: 469,
      received: 0,
      outstanding: 0,
      businessDate: '2026-08-31'
    },
    {
      id: 'customer-account-005',
      customerCode: '31010610002',
      customerName: '静安第1中学',
      canteen: '静安第一中学食堂（演示）',
      contactName: '',
      contactPhone: '',
      status: '部分对账',
      documentCount: 2,
      amount: 68,
      zeroing: 0,
      receivable: 68,
      received: 0,
      outstanding: 0,
      businessDate: '2026-08-31'
    },
    {
      id: 'customer-account-006',
      customerCode: '31010610002',
      customerName: '静安第1中学',
      canteen: '静安1中食堂',
      contactName: '',
      contactPhone: '',
      status: '未对账',
      documentCount: 1,
      amount: -10,
      zeroing: 0,
      receivable: -10,
      received: 0,
      outstanding: 0,
      businessDate: '2026-08-31'
    },
    {
      id: 'customer-account-007',
      customerCode: '31010610002',
      customerName: '静安第1中学',
      canteen: '第2食堂',
      contactName: '收货人',
      contactPhone: '18515500000',
      status: '未对账',
      documentCount: 5,
      amount: 1175,
      zeroing: 0,
      receivable: 1175,
      received: 0,
      outstanding: 0,
      businessDate: '2026-08-31'
    },
    {
      id: 'customer-account-008',
      customerCode: '31010610002',
      customerName: '静安第1中学',
      canteen: '第一食堂',
      contactName: '收货人',
      contactPhone: '18515500000',
      status: '未对账',
      documentCount: 4,
      amount: 1830,
      zeroing: 0,
      receivable: 1830,
      received: 0,
      outstanding: 0,
      businessDate: '2026-08-31'
    }
  ];

  const defaultState = {
    records: [...firstPageRecords, ...firstPageFillers, ...secondPageRecords],
    customerAccounts,
    statements: [
      {
        id: 'sales-statement-001',
        statementNo: 'DZ202608250001',
        customerName: '静安第一中学',
        startDate: '2026-07-27',
        endDate: '2026-07-27',
        generatedAt: '2026-08-25 22:14:22',
        operator: '杨采',
        amount: 8,
        zeroing: 0,
        receivable: 8,
        shippingDates: ['2026-07-27 11:42:17', '2026-07-27 11:42:17'],
        recordIds: ['sale-recon-006']
      },
      {
        id: 'sales-statement-002',
        statementNo: 'DZ202608260002',
        customerName: '静安第一中学',
        startDate: '2026-08-04',
        endDate: '2026-08-04',
        generatedAt: '2026-08-26 17:58:11',
        operator: '杨采',
        amount: 15,
        zeroing: 0,
        receivable: 15,
        shippingDates: ['2026-08-04 18:10:30'],
        recordIds: ['sale-recon-003']
      },
      {
        id: 'sales-statement-003',
        statementNo: 'DZ202608280003',
        customerName: '静安第一中学',
        startDate: '2026-08-04',
        endDate: '2026-08-04',
        generatedAt: '2026-08-28 16:36:05',
        operator: '杨采',
        amount: 60,
        zeroing: 0,
        receivable: 60,
        shippingDates: ['2026-08-04 18:08:14'],
        recordIds: ['sale-recon-004']
      },
      {
        id: 'sales-statement-004',
        statementNo: 'DZ202609010004',
        customerName: '静安第11中学',
        startDate: '2026-08-04',
        endDate: '2026-08-04',
        generatedAt: '2026-09-01 09:42:18',
        operator: '杨采',
        amount: 100,
        zeroing: 0,
        receivable: 100,
        shippingDates: ['2026-08-04 17:05:40'],
        recordIds: ['sale-recon-005']
      },
      {
        id: 'sales-statement-005',
        statementNo: 'DZ202609030005',
        customerName: '静安第2中学',
        startDate: '2026-08-19',
        endDate: '2026-08-19',
        generatedAt: '2026-09-03 13:20:46',
        operator: '杨采',
        amount: 486,
        zeroing: 0,
        receivable: 486,
        shippingDates: ['2026-08-19 11:52:57'],
        recordIds: ['sale-recon-007']
      },
      {
        id: 'sales-statement-006',
        statementNo: 'DZ202609050006',
        customerName: '静安第2中学',
        startDate: '2026-06-16',
        endDate: '2026-06-16',
        generatedAt: '2026-09-05 10:08:32',
        operator: '杨采',
        amount: 190,
        zeroing: 0,
        receivable: 190,
        shippingDates: ['2026-06-16 11:07:42'],
        recordIds: ['sale-recon-008']
      },
      {
        id: 'sales-statement-007',
        statementNo: 'DZ202609080007',
        customerName: '静安第2中学',
        startDate: '2026-06-16',
        endDate: '2026-06-16',
        generatedAt: '2026-09-08 15:16:27',
        operator: '杨采',
        amount: 295,
        zeroing: 1,
        receivable: 294,
        shippingDates: ['2026-06-16 11:07:42'],
        recordIds: ['sale-recon-009']
      },
      {
        id: 'sales-statement-008',
        statementNo: 'DZ202609100008',
        customerName: '静安第1中学',
        startDate: '2026-06-16',
        endDate: '2026-06-16',
        generatedAt: '2026-09-10 11:24:03',
        operator: '杨采',
        amount: 430,
        zeroing: 0,
        receivable: 430,
        shippingDates: ['2026-06-16 11:07:42'],
        recordIds: ['sale-recon-010']
      },
      {
        id: 'sales-statement-009',
        statementNo: 'DZ202609120009',
        customerName: '静安第1中学',
        startDate: '2026-06-15',
        endDate: '2026-06-15',
        generatedAt: '2026-09-12 14:05:19',
        operator: '杨采',
        amount: 240,
        zeroing: 1,
        receivable: 239,
        shippingDates: ['2026-06-15 09:20:00'],
        recordIds: ['sale-recon-011']
      },
      {
        id: 'sales-statement-010',
        statementNo: 'DZ202609150010',
        customerName: '静安第11中学',
        startDate: '2026-06-14',
        endDate: '2026-06-14',
        generatedAt: '2026-09-15 09:38:44',
        operator: '杨采',
        amount: 220,
        zeroing: 1,
        receivable: 219,
        shippingDates: ['2026-06-14 09:19:00'],
        recordIds: ['sale-recon-012']
      },
      {
        id: 'sales-statement-011',
        statementNo: 'DZ202609170011',
        customerName: '静安第一中学',
        startDate: '2026-06-13',
        endDate: '2026-06-13',
        generatedAt: '2026-09-17 10:12:06',
        operator: '杨采',
        amount: 210,
        zeroing: 1,
        receivable: 209,
        shippingDates: ['2026-06-13 09:18:00'],
        recordIds: ['sale-recon-013']
      },
      {
        id: 'sales-statement-012',
        statementNo: 'DZ202609180012',
        customerName: '静安第2中学',
        startDate: '2026-06-11',
        endDate: '2026-06-11',
        generatedAt: '2026-09-18 16:48:29',
        operator: '杨采',
        amount: 180,
        zeroing: 1,
        receivable: 179,
        shippingDates: ['2026-06-11 09:16:00'],
        recordIds: ['sale-recon-015']
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
        customerAccounts: Array.isArray(parsed.customerAccounts) ? parsed.customerAccounts : clone(defaultState.customerAccounts),
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
    getCustomerAccount(id) {
      return readState().customerAccounts.find((record) => record.id === id) || null;
    },
    updateCustomerAccount(id, patch) {
      const state = readState();
      const index = state.customerAccounts.findIndex((record) => record.id === id);
      if (index < 0) return null;
      state.customerAccounts[index] = { ...state.customerAccounts[index], ...clone(patch) };
      writeState(state);
      return clone(state.customerAccounts[index]);
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
    },
    removeStatement(id) {
      const state = readState();
      const nextStatements = state.statements.filter((item) => item.id !== id);
      if (nextStatements.length === state.statements.length) return false;
      state.statements = nextStatements;
      writeState(state);
      return true;
    }
  };
})();
