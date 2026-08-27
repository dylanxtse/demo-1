(function () {
  const storageKey = 'procurement-supplier-purchase-orders-v1';
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const productCodes = {
    姜肉1: 'SP00001',
    土豆: 'SP00002',
    西红柿: 'SP00003',
    鸡蛋: 'SP00004',
    食用油: 'SP00005',
    大白菜: 'SP00006',
    猪肉: 'SP00007',
    豆腐: 'SP00008',
    黄瓜: 'SP00009',
    胡萝卜: 'SP00010',
    大米: 'SP00011'
  };

  function item(id, goodsName, unit, plannedQty, purchasePrice, overrides = {}) {
    return {
      id,
      productCode: productCodes[goodsName] || '',
      goodsName,
      displayName: `${goodsName}(${unit} / -- / --)`,
      remark: '',
      unit,
      plannedQty,
      purchasePrice,
      shippedQty: plannedQty,
      shippedSubtotal: Number(plannedQty) * Number(purchasePrice),
      productionDate: '',
      qualityReport: '0',
      receivedQty: '0',
      unreceivedQty: '0',
      receivedSubtotal: '0',
      returnedQty: '0',
      returnedSubtotal: '0',
      reconciledQty: '0',
      reconciledSubtotal: '0',
      ...overrides
    };
  }

  const seedRows = [
    {
      id: 'SPO-001',
      orderNo: 'CGD202608180100001',
      warehouse: '市直仓库',
      createdAt: '2026-08-18 15:51:22',
      expectedDeliveryAt: '2026-08-19 03:16:23',
      receivedAmount: '--',
      returnAmount: '--',
      reconciliationAmount: '--',
      confirmStatus: '已发货',
      orderStatus: '待收货',
      goodsCount: 1,
      supplierStatus: '已发货',
      remark: '',
      expanded: true,
      canConfirm: false,
      canShip: false,
      customerName: '南皮县职业技术教育中心',
      customerCode: '',
      items: [item('SPO-001-ITEM-001', '姜肉1', '批', '10', '0')]
    },
    {
      id: 'SPO-002',
      orderNo: 'CGD202608180100002',
      warehouse: '市直仓库',
      createdAt: '2026-08-18 15:51:22',
      expectedDeliveryAt: '2026-08-19 03:16:23',
      receivedAmount: '--',
      returnAmount: '--',
      reconciliationAmount: '--',
      confirmStatus: '已发货',
      orderStatus: '待收货',
      goodsCount: 2,
      supplierStatus: '已发货',
      remark: '',
      expanded: false,
      canConfirm: false,
      canShip: false,
      customerName: '南皮县第二中学',
      customerCode: '',
      items: [item('SPO-002-ITEM-001', '土豆', '千克', '20', '2.80'), item('SPO-002-ITEM-002', '西红柿', '千克', '15', '3.60')]
    },
    {
      id: 'SPO-003',
      orderNo: 'CGD202608160100001',
      warehouse: '市直仓库',
      createdAt: '2026-08-16 15:09:36',
      expectedDeliveryAt: '2026-08-17 03:07:40',
      receivedAmount: '400',
      returnAmount: '0',
      reconciliationAmount: '400',
      confirmStatus: '已发货',
      orderStatus: '已完成',
      goodsCount: 1,
      supplierStatus: '已发货',
      remark: '',
      expanded: false,
      canConfirm: false,
      canShip: false,
      customerName: '南皮县职业技术教育中心',
      customerCode: '',
      items: [item('SPO-003-ITEM-001', '鸡蛋', '千克', '40', '10', { receivedQty: '40', unreceivedQty: '0', receivedSubtotal: '400', reconciledQty: '40', reconciledSubtotal: '400' })]
    },
    {
      id: 'SPO-004',
      orderNo: 'CGD202608160100002',
      warehouse: '市直仓库',
      createdAt: '2026-08-16 15:09:36',
      expectedDeliveryAt: '2026-08-17 03:07:40',
      receivedAmount: '400',
      returnAmount: '0',
      reconciliationAmount: '400',
      confirmStatus: '已发货',
      orderStatus: '已完成',
      goodsCount: 1,
      supplierStatus: '已发货',
      remark: '',
      expanded: false,
      canConfirm: false,
      canShip: false,
      customerName: '南皮县第一中学',
      customerCode: '',
      items: [item('SPO-004-ITEM-001', '食用油', '桶', '10', '40', { receivedQty: '10', unreceivedQty: '0', receivedSubtotal: '400', reconciledQty: '10', reconciledSubtotal: '400' })]
    },
    {
      id: 'SPO-005',
      orderNo: 'CGD202608120100008',
      warehouse: '市直仓库',
      createdAt: '2026-08-12 22:27:47',
      expectedDeliveryAt: '2026-08-13 00:00:00',
      receivedAmount: '8880',
      returnAmount: '0',
      reconciliationAmount: '8880',
      confirmStatus: '已确认',
      orderStatus: '已完成',
      goodsCount: 3,
      supplierStatus: '已确认',
      remark: '',
      expanded: false,
      canConfirm: false,
      canShip: true,
      customerName: '南皮县职业技术教育中心',
      customerCode: '',
      items: [
        item('SPO-005-ITEM-001', '大白菜', '千克', '100', '12', { receivedQty: '100', unreceivedQty: '0', receivedSubtotal: '1200', reconciledQty: '100', reconciledSubtotal: '1200' }),
        item('SPO-005-ITEM-002', '猪肉', '千克', '120', '50', { receivedQty: '120', unreceivedQty: '0', receivedSubtotal: '6000', reconciledQty: '120', reconciledSubtotal: '6000' }),
        item('SPO-005-ITEM-003', '豆腐', '千克', '60', '28', { receivedQty: '60', unreceivedQty: '0', receivedSubtotal: '1680', reconciledQty: '60', reconciledSubtotal: '1680' })
      ]
    },
    {
      id: 'SPO-006',
      orderNo: 'CGD202608120100003',
      warehouse: '市直仓库',
      createdAt: '2026-08-12 10:14:36',
      expectedDeliveryAt: '2026-08-13 10:12:59',
      receivedAmount: '495',
      returnAmount: '0',
      reconciliationAmount: '495',
      confirmStatus: '已发货',
      orderStatus: '已完成',
      goodsCount: 2,
      supplierStatus: '已发货',
      remark: '',
      expanded: false,
      canConfirm: false,
      canShip: false,
      customerName: '南皮县第二中学',
      customerCode: '',
      items: [item('SPO-006-ITEM-001', '黄瓜', '千克', '50', '5.5', { receivedQty: '50', receivedSubtotal: '275', reconciledQty: '50', reconciledSubtotal: '275' }), item('SPO-006-ITEM-002', '胡萝卜', '千克', '40', '5.5', { receivedQty: '40', receivedSubtotal: '220', reconciledQty: '40', reconciledSubtotal: '220' })]
    },
    {
      id: 'SPO-007',
      orderNo: 'CGD202608110100014',
      warehouse: '市直仓库',
      createdAt: '2026-08-11 22:24:43',
      expectedDeliveryAt: '2026-08-12 10:23:05',
      receivedAmount: '550',
      returnAmount: '0',
      reconciliationAmount: '550',
      confirmStatus: '已发货',
      orderStatus: '已完成',
      goodsCount: 1,
      supplierStatus: '已发货',
      remark: '',
      expanded: false,
      canConfirm: false,
      canShip: false,
      customerName: '南皮县第三中学',
      customerCode: '',
      items: [item('SPO-007-ITEM-001', '大米', '千克', '50', '11', { receivedQty: '50', receivedSubtotal: '550', reconciledQty: '50', reconciledSubtotal: '550' })]
    }
  ];

  function readRows() {
    const stored = window.AppStorage?.read(storageKey, null);
    return Array.isArray(stored) && stored.length ? stored : clone(seedRows);
  }

  function saveRows(rows) {
    window.AppStorage?.write(storageKey, rows);
  }

  function normalizeDate(value) {
    return String(value || '').slice(0, 10);
  }

  function inRange(value, start, end) {
    const date = normalizeDate(value);
    return (!start || date >= start) && (!end || date <= end);
  }

  function filterRows(rows, filters = {}) {
    const keyword = String(filters.orderNo || '').trim().toLowerCase();
    const productName = String(filters.productName || '').trim().toLowerCase();
    return rows.filter((row) => {
      const matchesKeyword = !keyword || row.orderNo.toLowerCase().includes(keyword);
      const matchesProduct = !productName || row.items.some((line) => `${line.goodsName} ${line.displayName}`.toLowerCase().includes(productName));
      return matchesKeyword
        && matchesProduct
        && (!filters.orderStatus || row.orderStatus === filters.orderStatus)
        && (!filters.confirmStatus || row.confirmStatus === filters.confirmStatus)
        && (!filters.warehouse || row.warehouse === filters.warehouse)
        && inRange(row.expectedDeliveryAt, filters.expectedStart, filters.expectedEnd)
        && inRange(row.createdAt, filters.createdStart, filters.createdEnd);
    });
  }

  function findRow(rows, rowId) {
    return rows.find((row) => row.id === rowId);
  }

  function update(rowId, changes = {}) {
    const rows = readRows();
    const row = findRow(rows, rowId);
    if (!row) return null;
    Object.assign(row, changes);
    saveRows(rows);
    return clone(row);
  }

  window.SupplierPurchaseOrderService = {
    getRows() {
      return readRows();
    },
    filterRows,
    warehouses(rows = readRows()) {
      return [...new Set(rows.map((row) => row.warehouse).filter(Boolean))];
    },
    toggleExpanded(rowId) {
      const rows = readRows();
      const row = findRow(rows, rowId);
      if (!row) return null;
      row.expanded = !row.expanded;
      saveRows(rows);
      return clone(row);
    },
    confirmSupply(rowId) {
      const row = findRow(readRows(), rowId);
      if (!row?.canConfirm) return { ok: false, message: '当前采购单不可确认供货' };
      return { ok: true, row: update(rowId, { canConfirm: false, confirmStatus: '已确认', supplierStatus: '已确认' }) };
    },
    ship(rowId) {
      const row = findRow(readRows(), rowId);
      if (!row?.canShip) return { ok: false, message: '当前采购单不可发货' };
      return { ok: true, row: update(rowId, { canShip: false, supplierStatus: '已发货' }) };
    },
    updateProductionDate(rowId, itemId, productionDate) {
      const rows = readRows();
      const row = findRow(rows, rowId);
      const line = row?.items?.find((itemRow) => itemRow.id === itemId);
      if (!line) return null;
      line.productionDate = productionDate;
      saveRows(rows);
      return clone(line);
    },
    getItem(rowId, itemId) {
      const row = findRow(readRows(), rowId);
      const line = row?.items?.find((itemRow) => itemRow.id === itemId);
      if (!row || !line) return null;
      return { row: clone(row), item: clone(line) };
    },
    reset() {
      saveRows(clone(seedRows));
      return clone(seedRows);
    }
  };
})();
