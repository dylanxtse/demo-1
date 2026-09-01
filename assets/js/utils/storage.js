(function () {
  window.AppStorage = {
    read(key, fallback) {
      try {
        const value = localStorage.getItem(key);
        return value === null ? fallback : JSON.parse(value);
      } catch {
        return fallback;
      }
    },
    write(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    }
  };
})();

/*
 * Procurement demo source of truth.
 *
 * The application is intentionally static, so the v3 store keeps the same
 * persistence boundary as the existing localStorage adapters while making all
 * cross-page relations explicit.  The store is lazy: seed data is built only
 * after the page has loaded its mock data scripts.
 */
(function () {
  const storageKey = 'procurement-demo-v3';
  const previousStorageKey = 'procurement-demo-v2';
  const backupStorageKey = 'procurement-demo-v3-migration-backup';
  const schemaVersion = '20260805-flow-v3.0';
  const legacyBusinessStoragePrefixes = [
    'procurement-products',
    'procurement-inbound-orders',
    'procurement-outbound-orders',
    'procurement-processing-orders',
    'procurement-processing-config',
    'procurement-processing-data-version',
    'procurement-processing-templates',
    'procurement-goods-reviews',
    'procurement-unit-measurements',
    'procurement-operations-v1-'
  ];
  let legacyBusinessStorageCleaned = false;
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const number = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const timestamp = () => window.BusinessRules?.now() || new Date().toISOString().slice(0, 19).replace('T', ' ');
  const normalizeDateTime = (value) => window.BusinessRules?.normalizeDateTime(value) || String(value || '');

  function organizationSeed() {
    const createdAt = '2026-08-12 09:00:00';
    return {
      companies: [
        {
          id: 'COMP-HEAD-001', code: 'HQ001', name: '产品部学校食材集采供应链有限公司',
          parentId: '', type: 'HEADQUARTERS', status: 'ENABLE', contact: '总公司管理员', phone: '13800000000', address: '总部', createdAt, updatedAt: createdAt, operator: '总公司管理员'
        },
        {
          id: 'COMP-SUB-001', code: 'SUB001', name: '东城学校食材供应链有限公司',
          parentId: 'COMP-HEAD-001', type: 'SUBSIDIARY', status: 'ENABLE', contact: '张经理', phone: '13800000001', address: '东城区', districts: ['东城区', '通州区'], createdAt, updatedAt: createdAt, operator: '总公司管理员', demoVersion: 3
        },
        {
          id: 'COMP-SUB-002', code: 'SUB002', name: '西城学校食材供应链有限公司',
          parentId: 'COMP-HEAD-001', type: 'SUBSIDIARY', status: 'ENABLE', contact: '李经理', phone: '13800000002', address: '西城区', districts: ['西城区', '丰台区'], createdAt: '2026-08-11 14:20:00', updatedAt: '2026-08-12 10:10:00', operator: '总公司管理员', demoVersion: 3
        },
        {
          id: 'COMP-SUB-003', code: 'SUB003', name: '北部学校食材供应链有限公司',
          parentId: 'COMP-HEAD-001', type: 'SUBSIDIARY', status: 'DISABLE', contact: '王经理', phone: '13800000003', address: '昌平区', districts: ['昌平区', '顺义区'], createdAt: '2026-08-10 11:05:00', updatedAt: '2026-08-12 09:45:00', operator: '总公司管理员', demoVersion: 3
        }
      ],
      users: [
        {
          id: 'USER-HEAD-ADMIN', companyId: 'COMP-HEAD-001', username: 'admin', displayName: '管理员',
          role: 'HQ_ADMIN', status: 'ENABLE', password: 'Admin@123', forceChangePassword: false, createdAt
        },
        {
          id: 'USER-SUB-001-ADMIN', companyId: 'COMP-SUB-001', username: 'subadmin', displayName: '子公司管理员',
          role: 'SUB_COMPANY_ADMIN', userRole: '下属单位默认管理员', status: 'ENABLE', password: '1234567Aa', forceChangePassword: false, districts: ['东城区', '通州区'], createdAt, demoVersion: 3
        },
        {
          id: 'USER-SUB-002-ADMIN', companyId: 'COMP-SUB-002', username: 'xicheng_admin', displayName: '子公司管理员',
          role: 'SUB_COMPANY_ADMIN', userRole: '下属单位默认管理员', status: 'ENABLE', password: '1234567Aa', forceChangePassword: false, districts: ['西城区', '丰台区'], createdAt: '2026-08-11 14:20:00', demoVersion: 3
        },
        {
          id: 'USER-SUB-003-ADMIN', companyId: 'COMP-SUB-003', username: 'north_admin', displayName: '子公司管理员',
          role: 'SUB_COMPANY_ADMIN', userRole: '下属单位默认管理员', status: 'DISABLE', password: '1234567Aa', forceChangePassword: false, districts: ['昌平区', '顺义区'], createdAt: '2026-08-10 11:05:00', demoVersion: 3
        }
      ],
      session: { companyId: 'COMP-HEAD-001', userId: 'USER-HEAD-ADMIN', username: 'admin', displayName: '管理员', role: 'HQ_ADMIN' }
    };
  }

  function ensureOrganizationState(current) {
    let changed = false;
    const seed = organizationSeed();
    if (!Array.isArray(current.companies)) { current.companies = seed.companies; changed = true; }
    if (!Array.isArray(current.users)) { current.users = seed.users; changed = true; }
    if (!current.companies.some((company) => company.type === 'HEADQUARTERS')) {
      current.companies.unshift(seed.companies[0]);
      changed = true;
    }
    if (!current.users.some((user) => user.role === 'HQ_ADMIN')) {
      current.users.unshift(seed.users[0]);
      changed = true;
    }
    seed.companies.filter((company) => company.type === 'SUBSIDIARY').forEach((seedCompany) => {
      const existing = current.companies.find((company) => company.id === seedCompany.id);
      if (!existing) {
        current.companies.push(clone(seedCompany));
        changed = true;
      } else if (existing.demoVersion !== seedCompany.demoVersion) {
        Object.assign(existing, clone(seedCompany));
        changed = true;
      }
    });
    seed.users.filter((user) => user.role === 'SUB_COMPANY_ADMIN').forEach((seedUser) => {
      const existing = current.users.find((user) => user.id === seedUser.id);
      if (!existing) {
        current.users.push(clone(seedUser));
        changed = true;
      } else if (existing.demoVersion !== seedUser.demoVersion) {
        Object.assign(existing, clone(seedUser));
        changed = true;
      }
    });
    current.companies.forEach((company) => {
      if (company.type === 'SUBSIDIARY' && company.status === 'PENDING_ENABLE') {
        company.status = 'ENABLE';
        changed = true;
      }
      if (!Array.isArray(company.districts)) {
        company.districts = company.id === 'COMP-SUB-001' ? ['东城区', '通州区'] : [];
        changed = true;
      }
      if (!company.updatedAt) {
        company.updatedAt = company.createdAt || timestamp();
        changed = true;
      }
      if (!company.operator) {
        company.operator = '总公司管理员';
        changed = true;
      }
    });
    current.users.forEach((user) => {
      if (user.role === 'SUB_COMPANY_ADMIN' && user.status === 'PENDING_ENABLE') {
        user.status = 'ENABLE';
        changed = true;
      }
      if (user.role === 'SUB_COMPANY_ADMIN' && user.userRole !== '下属单位默认管理员') {
        user.userRole = '下属单位默认管理员';
        changed = true;
      }
      if (!Array.isArray(user.districts)) {
        const company = current.companies.find((item) => item.id === user.companyId);
        user.districts = company?.districts || [];
        changed = true;
      }
      if (user.role === 'SUB_COMPANY_ADMIN' && (user.password !== '1234567Aa' || user.forceChangePassword)) {
        user.password = '1234567Aa';
        user.forceChangePassword = false;
        changed = true;
      }
    });
    if (!current.session || !current.companies.some((company) => company.id === current.session.companyId)) {
      current.session = seed.session;
      changed = true;
    }
    return changed;
  }

  function nextOutboundNumber(records, record = {}) {
    return window.BusinessRules.documentNumber('outboundOrders', {
      date: record.outboundTime || record.shippingAt || record.createdAt || timestamp(),
      businessCode: record.customerCode || record.businessCode || '03',
      records,
      fields: ['id', 'outboundOrderId']
    });
  }

  function canonicalProcessingId(id, customerCode = '03') {
    return window.BusinessRules.canonicalDocumentNumber('processingOrders', id, { businessCode: customerCode });
  }

  function normalizeOrderNumbers(state) {
    let changed = false;
    const customers = state.customers || [];
    const names = [...new Set((state.orders || []).map((order) => order.customerName).filter(Boolean))];
    const normalized = [];
    (state.orders || []).forEach((order) => {
      const customerIndex = customers.findIndex((customer) => (
        (order.customerId && (customer.id === order.customerId || customer.customerId === order.customerId))
        || (order.customerName && customer.customerName === order.customerName)
      ));
      const fallbackIndex = order.customerName ? names.indexOf(order.customerName) : -1;
      const customer = customerIndex >= 0 ? customers[customerIndex] : null;
      const customerCode = window.BusinessRules.businessCode(
        order.customerCode || customer?.customerCode || (fallbackIndex >= 0 ? fallbackIndex + 1 : names.length + 1),
        '03'
      );
      const current = String(order.orderNo || '');
      const duplicate = normalized.some((item) => item.orderNo === current);
      if (!window.BusinessRules.documentRegex('orders').test(current) || duplicate) {
        order.orderNo = window.BusinessRules.documentNumber('orders', {
          date: order.createdAt || timestamp(),
          businessCode: customerCode,
          records: normalized,
          fields: ['orderNo']
        });
        changed = true;
      }
      order.customerCode = customerCode;
      normalized.push(order);
    });
    const orderById = new Map((state.orders || []).map((order) => [order.id, order]));
    [...(state.sortingTasks || []), ...(state.shippingOrders || []), ...(state.outboundOrders || [])].forEach((record) => {
      const order = orderById.get(record.orderId);
      if (order && record.orderNo !== order.orderNo) {
        record.orderNo = order.orderNo;
        if (record.relNo && String(record.relNo).startsWith('DD')) record.relNo = order.orderNo;
        changed = true;
      }
    });
    return changed;
  }

  function migrateOutboundNumbers(current) {
    const outboundOrders = current.outboundOrders || [];
    const used = outboundOrders.filter((item) => !String(item.id || '').startsWith('OUT-'));
    const replacements = new Map();
    let changed = false;
    outboundOrders.forEach((outbound) => {
      if (!String(outbound.id || '').startsWith('OUT-')) return;
      const order = (current.orders || []).find((item) => item.id === outbound.orderId);
      const nextId = nextOutboundNumber(used, {
        outboundTime: outbound.outboundTime || order?.shippingAt || order?.createdAt
      });
      replacements.set(outbound.id, nextId);
      outbound.id = nextId;
      outbound.outboundOrderId = nextId;
      used.push(outbound);
      changed = true;
    });
    if (changed) {
      (current.processingOrders || []).forEach((order) => {
        if (replacements.has(order.outboundOrderId)) order.outboundOrderId = replacements.get(order.outboundOrderId);
      });
    }
    return changed;
  }

  const defaultSettings = {
    enterpriseOrderAuditEnabled: true,
    sortingInventoryThresholdEnabled: true,
    outboundAuditEnabled: true,
    defaultWarehouseId: 'WH-001',
    orderPricePriority1: '协议价',
    orderPricePriority2: '近一次销售价',
    orderPricePriority3: '手动定价',
    orderPricePriority4: '市场价',
    purchasePriceMode: '竞价模式',
    purchasePricePriority1: '中标价',
    purchasePricePriority2: '近一次采购价',
    purchasePricePriority3: '近一次采购价',
    purchasePricePriority4: '',
    purchasePricePriority5: '',
    purchasePricePriority6: '',
    amountDecimal: '2',
    quantityDecimal: '0',
    decimalSettingsVersion: '20260815-default-decimals'
  };

  const decimalOptions = new Set(['0', '1', '2', '4']);
  const quantityFields = new Set([
    'acceptedQty', 'actualQty', 'applyQty', 'availableStock', 'bookQty', 'consumeQty', 'countQty',
    'currentStock', 'damageQty', 'differenceQty', 'expectedQty', 'openingQty', 'orderCount', 'orderQty',
    'outboundQty', 'pendingOutbound', 'productCount', 'qty', 'quantity', 'reconciliationQty', 'refQty',
    'reservedStock', 'returnQty', 'returnedQty', 'shippedQty', 'shippingQty', 'shortageQty', 'sortedCount',
    'sortingQty', 'stock', 'stockQty', 'transitStock'
  ]);
  const amountFields = new Set([
    'acceptedAmount', 'afterAmount', 'allocatedCost', 'amount', 'applyAmount', 'applyPrice', 'avgPrice',
    'averageCost', 'beforeAmount', 'costPrice', 'differenceAmount', 'entryAmt', 'lossAmount', 'marketPrice',
    'openingAmount', 'openingPrice', 'orderAmount', 'orderPrice', 'outboundAmt', 'overflowAmount', 'price',
    'reconciliationAmount', 'refundAmount', 'returnAmount', 'shippedAmount', 'shippingAmount', 'subtotal',
    'totalAmount', 'unitPrice'
  ]);

  function decimalPlaces(value, fallback) {
    const source = String(value ?? '');
    return decimalOptions.has(source) ? Number(source) : fallback;
  }

  function normalizeDecimalValue(value, places) {
    if (value === '' || value == null) return value;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return value;
    const factor = 10 ** places;
    const rounded = Math.round((parsed + Number.EPSILON) * factor) / factor;
    return typeof value === 'string' ? rounded.toFixed(places) : rounded;
  }

  function normalizeSettings(current) {
    const before = current.settings && typeof current.settings === 'object'
      ? JSON.stringify(current.settings)
      : '';
    const existing = current.settings && typeof current.settings === 'object' ? current.settings : {};
    current.settings = { ...defaultSettings, ...existing };

    // 旧版配置没有精度版本，首次升级时按新的默认规则迁移；之后保留用户的切换结果。
    if (existing.decimalSettingsVersion !== defaultSettings.decimalSettingsVersion) {
      current.settings.amountDecimal = defaultSettings.amountDecimal;
      current.settings.quantityDecimal = defaultSettings.quantityDecimal;
      current.settings.decimalSettingsVersion = defaultSettings.decimalSettingsVersion;
    }
    if (!decimalOptions.has(String(current.settings.amountDecimal))) current.settings.amountDecimal = defaultSettings.amountDecimal;
    if (!decimalOptions.has(String(current.settings.quantityDecimal))) current.settings.quantityDecimal = defaultSettings.quantityDecimal;
    return before !== JSON.stringify(current.settings);
  }

  function normalizeStateDecimals(current) {
    const amountDecimal = decimalPlaces(current.settings?.amountDecimal, Number(defaultSettings.amountDecimal));
    const quantityDecimal = decimalPlaces(current.settings?.quantityDecimal, Number(defaultSettings.quantityDecimal));
    let changed = false;

    const walk = (node) => {
      if (Array.isArray(node)) {
        node.forEach(walk);
        return;
      }
      if (!node || typeof node !== 'object') return;
      Object.entries(node).forEach(([key, value]) => {
        if (quantityFields.has(key)) {
          const next = normalizeDecimalValue(value, quantityDecimal);
          if (next !== value) {
            node[key] = next;
            changed = true;
          }
        } else if (amountFields.has(key)) {
          const next = normalizeDecimalValue(value, amountDecimal);
          if (next !== value) {
            node[key] = next;
            changed = true;
          }
        } else {
          walk(value);
        }
      });
    };

    walk(current);
    return changed;
  }

  let state = null;

  function clearLegacyBusinessStorage() {
    if (legacyBusinessStorageCleaned) return;
    legacyBusinessStorageCleaned = true;
    try {
      Object.keys(window.localStorage).forEach((key) => {
        if (key === storageKey) return;
        if (legacyBusinessStoragePrefixes.some((prefix) => key.startsWith(prefix))) {
          window.localStorage.removeItem(key);
        }
      });
    } catch {}
  }

  function sourceProducts() {
    const fallbackProducts = [
      ['SP0300039', '土豆丝', '斤', 1], ['SP0300040', '土豆', '斤', 6.8], ['SP0300038', '牛奶', '瓶', 5], ['SP0300037', '牛奶', '瓶', 5],
      ['SP0300036', '大玉米棒子', 'KG', 5], ['SP0300034', '黑大米', '斤', 10], ['SP0300031', '鲫鱼', 'L', 20], ['SP0300030', '金龙鱼5L桶装油', '瓶', 55],
      ['SP0300029', '鲫鱼', '斤', 15], ['SP0300026', '面', '瓶', 1], ['SP0300025', '大米', 'KG', 19], ['SP0300024', '三元牛奶', '瓶', 10],
      ['SP0300023', '大饼', '斤', 1], ['SP0300020', '西红柿', 'KG', 20], ['SP0300019', '大白菜', '斤', 8], ['SP0300018', '鸡蛋', '斤', 22],
      ['SP0300017', '金龙鱼豆油', '斤', 50], ['SP0300016', '面粉', '斤', 30], ['SP0300015', '香蕉', '斤', 30], ['SP0300014', '苹果', '斤', 23],
      ['SP0300050', '土豆块', '斤', 5.2], ['SP0300051', '白菜段', '斤', 3.2], ['SP0300052', '白菜丝', '斤', 3.4],
      ['SP0300053', '胡萝卜', '斤', 2.8], ['SP0300054', '胡萝卜丝', '斤', 4.8], ['SP0300055', '胡萝卜片', '斤', 4.6],
      ['SP0300056', '青椒', '斤', 4.5], ['SP0300057', '青椒丝', '斤', 7.2], ['SP0300058', '青椒块', '斤', 6.8],
      ['SP0300059', '什锦配菜', '斤', 6.5], ['SP0300060', '西兰花', '斤', 5.2], ['SP0300061', '西兰花块', '斤', 7.8]
    ].map(([code, name, unit, marketPrice], index) => ({ code, name, unit, marketPrice, status: '已上架', brand: '--', spec: '--', category: '其他材料-其他二级', seq: index + 1 }));
    const source = Array.isArray(window.MockProducts) && window.MockProducts.length ? window.MockProducts : fallbackProducts;
    const seededNetVegetables = new Set([
      'SP0300039', 'SP0300050', 'SP0300051', 'SP0300052', 'SP0300054',
      'SP0300055', 'SP0300057', 'SP0300058', 'SP0300059', 'SP0300061'
    ]);
    return source.filter((product) => product && (product.code || product.id)).map((product, index) => ({
      ...clone(product),
      id: product.id || product.code,
      productId: product.code,
      seq: product.seq || index + 1,
      isNetVegetable: product.isNetVegetable === true || seededNetVegetables.has(product.code),
      purchaseType: product.purchaseType || '供应商送货',
      source: product.source || '平台添加',
      addTime: product.addTime || `2026-08-${String((index % 9) + 1).padStart(2, '0')} 09:00:00`,
      marketPrice: number(product.marketPrice),
      status: product.status || '已上架'
    }));
  }

  function sourceWarehouses() {
    const warehouses = window.MockOperations?.warehouses || [];
    const demoWarehouseSuffixes = ['63824', '48176', '93052', '27419', '80537', '16742', '59208', '71463', '35691', '84205', '21984', '50731', '78614', '46328', '97502', '13067', '62495', '34870', '85921', '24608'];
    const demoEnterpriseCode = '01';
    const demoWarehouseCode = (index) => `CK${demoEnterpriseCode}${demoWarehouseSuffixes[index % demoWarehouseSuffixes.length]}`;
    if (warehouses.length) {
      const normalized = clone(warehouses).map((warehouse, index) => ({
        ...warehouse,
        id: warehouse.id || `WH-${String(index + 1).padStart(3, '0')}`,
        warehouseId: warehouse.id || `WH-${String(index + 1).padStart(3, '0')}`,
        enterpriseCode: warehouse.enterpriseCode || demoEnterpriseCode,
        warehouseCode: window.BusinessRules.warehouseCodeRegex(warehouse.enterpriseCode || demoEnterpriseCode).test(String(warehouse.warehouseCode || ''))
          ? warehouse.warehouseCode
          : demoWarehouseCode(index),
        warehouseName: warehouse.warehouseName || warehouse.name || `仓库${index + 1}`,
        createdAt: warehouse.createdAt || `2026-08-${String((index % 9) + 1).padStart(2, '0')} 09:00:00`
      }));
      return padRecords(normalized, 20, (index) => ({
        id: `WH-${String(index + 1).padStart(3, '0')}`,
        warehouseId: `WH-${String(index + 1).padStart(3, '0')}`,
        warehouseCode: demoWarehouseCode(index),
        enterpriseCode: demoEnterpriseCode,
        warehouseName: ['冷链分拨仓', '南区配送仓', '西区周转仓', '东区备货仓', '北门收货仓', '江湾备货仓', '浦东配送仓', '浦西周转仓', '学校专供仓', '果蔬冷藏仓', '粮油仓', '水产暂存仓', '成品待发仓', '退货暂存仓', '应急保供仓', '夜间配送仓', '干货仓', '冷藏二仓', '华东干线仓', '南站中转仓'][index],
        address: `仓储路${index + 1}号`,
        status: 'ENABLE',
        referenced: false,
        createdAt: `2026-08-${String((index % 9) + 1).padStart(2, '0')} 09:00:00`
      }));
    }
    return padRecords([
      { id: 'WH-001', warehouseId: 'WH-001', warehouseCode: 'CK0163824', enterpriseCode: demoEnterpriseCode, warehouseName: '中心仓', address: '集采路18号', status: 'ENABLE', createdAt: '2025-10-18 09:30:00' },
      { id: 'WH-002', warehouseId: 'WH-002', warehouseCode: 'CK0148176', enterpriseCode: demoEnterpriseCode, warehouseName: '北区仓', address: '配送路6号', status: 'ENABLE', createdAt: '2025-11-06 14:22:00' }
    ], 20, (index) => ({
      id: `WH-${String(index + 1).padStart(3, '0')}`,
      warehouseId: `WH-${String(index + 1).padStart(3, '0')}`,
      warehouseCode: demoWarehouseCode(index + 2),
      enterpriseCode: demoEnterpriseCode,
      warehouseName: ['冷链分拨仓', '南区配送仓', '西区周转仓', '东区备货仓', '北门收货仓', '江湾备货仓', '浦东配送仓', '浦西周转仓', '学校专供仓', '果蔬冷藏仓', '粮油仓', '水产暂存仓', '成品待发仓', '退货暂存仓', '应急保供仓', '夜间配送仓', '干货仓', '冷藏二仓', '华东干线仓', '南站中转仓'][index],
      address: `仓储路${index + 1}号`,
      status: 'ENABLE',
      referenced: false,
      createdAt: `2026-08-${String((index % 9) + 1).padStart(2, '0')} 09:00:00`
    }));
  }

  function normalizeWarehouseCodes(current) {
    if (!Array.isArray(current.warehouses)) return false;
    const company = current.companies?.find((item) => item.id === current.session?.companyId);
    const subsidiaryIds = (current.companies || [])
      .filter((item) => item.type === 'SUBSIDIARY')
      .map((item) => item.id);
    const changedWarehouses = new Set();
    let changed = false;
    current.warehouses.forEach((warehouse, index) => {
      const enterpriseCode = window.BusinessRules.warehouseEnterpriseCode(
        warehouse.enterpriseCode || warehouse.companyCode || company?.code || current.session?.companyId,
        '01'
      );
      const isValid = window.BusinessRules.warehouseCodeRegex(enterpriseCode).test(String(warehouse.warehouseCode || ''));
      const duplicate = changedWarehouses.has(String(warehouse.warehouseCode || ''));
      if (!isValid || duplicate) {
        warehouse.warehouseCode = window.BusinessRules.createWarehouseCode(current.warehouses, enterpriseCode);
        changed = true;
      }
      changedWarehouses.add(String(warehouse.warehouseCode));
      if (warehouse.enterpriseCode !== enterpriseCode) {
        warehouse.enterpriseCode = enterpriseCode;
        changed = true;
      }
      if (!warehouse.warehouseId) {
        warehouse.warehouseId = warehouse.id || `WH-${String(index + 1).padStart(3, '0')}`;
        changed = true;
      }
      if (!warehouse.createdAt) {
        warehouse.createdAt = timestamp();
        changed = true;
      }
      const legacyOperatingCompanyIds = Array.isArray(warehouse.operatingCompanyIds)
        ? warehouse.operatingCompanyIds
        : [warehouse.operatingCompanyId || warehouse.companyId || warehouse.operatorCompanyId].filter(Boolean);
      const operatingCompanyIds = [...new Set(legacyOperatingCompanyIds.filter((id) => subsidiaryIds.includes(id)))];
      if (!operatingCompanyIds.length && subsidiaryIds.length) {
        operatingCompanyIds.push(subsidiaryIds[index % subsidiaryIds.length]);
      }
      if (JSON.stringify(warehouse.operatingCompanyIds || []) !== JSON.stringify(operatingCompanyIds)) {
        warehouse.operatingCompanyIds = operatingCompanyIds;
        changed = true;
      }
      ['companyId', 'operatorCompanyId', 'operatingCompanyId', 'responsibleDistricts', 'responsibleArea', 'districts'].forEach((key) => {
        if (key in warehouse) {
          delete warehouse[key];
          changed = true;
        }
      });
    });
    return changed;
  }

  function padRecords(records, minimum, factory) {
    const result = clone(records || []);
    while (result.length < minimum) result.push(factory(result.length, result));
    return result;
  }

  function sourceCustomers(extraOrders = []) {
    const base = [
      { id: 'CUS-001', customerId: 'CUS-001', customerCode: 'CUS001', name: '第一实验学校', customerName: '第一实验学校', type: '学校', status: 'ENABLE' },
      { id: 'CUS-002', customerId: 'CUS-002', customerCode: 'CUS002', name: '阳光幼儿园', customerName: '阳光幼儿园', type: '幼儿园', status: 'ENABLE' },
      { id: 'CUS-003', customerId: 'CUS-003', customerCode: 'CUS003', name: '育才中学', customerName: '育才中学', type: '学校', status: 'ENABLE' },
      { id: 'CUS-004', customerId: 'CUS-004', customerCode: 'CUS004', name: '机关第二食堂', customerName: '机关第二食堂', type: '机关单位', status: 'ENABLE' }
    ];
    const known = new Set(base.map((customer) => customer.customerName));
    extraOrders.forEach((order) => {
      const customerName = order.customerName || '';
      if (!customerName || known.has(customerName)) return;
      const id = `CUS-${String(base.length + 1).padStart(3, '0')}`;
      base.push({
        id,
        customerId: id,
        customerCode: `CUS${String(base.length + 1).padStart(3, '0')}`,
        name: customerName,
        customerName,
        type: order.customerType || '其他单位',
        status: 'ENABLE'
      });
      known.add(customerName);
    });
    const customerNames = ['第三小学', '实验幼儿园', '第七中学', '机关第一食堂', '东城职业学校', '南城中心幼儿园', '明德小学', '滨江实验中学', '晨光托育中心', '浦东社区食堂', '青禾小学', '华东商贸学校', '星河幼儿园', '新城职工食堂', '希望中学', '文汇小学'];
    return padRecords(base, 20, (index) => {
      const id = `CUS-${String(index + 1).padStart(3, '0')}`;
      const customerName = customerNames[index] || `合作单位${String(index + 1).padStart(2, '0')}`;
      return { id, customerId: id, customerCode: `CUS${String(index + 1).padStart(3, '0')}`, name: customerName, customerName, type: index % 2 ? '学校' : '机关单位', status: 'ENABLE' };
    });
  }

  function sourceLocations(extraOrders = [], customers = sourceCustomers(extraOrders)) {
    const locations = [
      { id: 'LOC-001', customerId: 'CUS-001', customerName: '第一实验学校', canteen: '第一食堂', receiver: '王老师', phone: '13800001011', address: '实验路1号', route: '东城一线' },
      { id: 'LOC-002', customerId: 'CUS-001', customerName: '第一实验学校', canteen: '第二食堂', receiver: '李老师', phone: '13800001012', address: '实验路1号', route: '东城一线' },
      { id: 'LOC-003', customerId: 'CUS-002', customerName: '阳光幼儿园', canteen: '园区食堂', receiver: '周老师', phone: '13800001013', address: '阳光路8号', route: '南城二线' },
      { id: 'LOC-004', customerId: 'CUS-003', customerName: '育才中学', canteen: '高中部食堂', receiver: '赵老师', phone: '13800001014', address: '育才路12号', route: '北城一线' },
      { id: 'LOC-005', customerId: 'CUS-003', customerName: '育才中学', canteen: '初中部食堂', receiver: '孙老师', phone: '13800001015', address: '育才路12号', route: '北城一线' },
      { id: 'LOC-006', customerId: 'CUS-004', customerName: '机关第二食堂', canteen: '二号食堂', receiver: '刘主任', phone: '13800001016', address: '政务路2号', route: '西城一线' }
    ];
    const known = new Set(locations.map((location) => `${location.customerName}|${location.canteen}`));
    extraOrders.forEach((order) => {
      const key = `${order.customerName || ''}|${order.canteen || ''}`;
      if (!order.customerName || !order.canteen || known.has(key)) return;
      const customer = customers.find((item) => item.customerName === order.customerName);
      locations.push({
        id: `LOC-${String(locations.length + 1).padStart(3, '0')}`,
        customerId: customer?.id || '',
        customerName: order.customerName,
        canteen: order.canteen,
        receiver: order.receiver || '',
        phone: order.phone || '',
        address: order.address || '',
        route: order.route || ''
      });
      known.add(key);
    });
    return padRecords(locations, 20, (index) => ({
      id: `LOC-${String(index + 1).padStart(3, '0')}`,
      customerId: `CUS-${String((index % 20) + 1).padStart(3, '0')}`,
      customerName: customers[index % customers.length]?.customerName || '合作单位',
      canteen: ['校园一食堂', '园区食堂', '职工食堂', '学生餐厅', '社区食堂'][index % 5],
      receiver: '配送联系人', phone: `1380000${String(index + 200).padStart(4, '0')}`,
      address: `配送路${index + 1}号`, route: `配送线路${(index % 5) + 1}`
    }));
  }

  function normalizeOrder(source, index) {
    const id = source.id || `ORD-DEMO-${String(index + 1).padStart(3, '0')}`;
    const sourceType = source.source === '客户下单' ? 'CUSTOMER' : 'ENTERPRISE';
    const createdAt = source.createdAt || source.createTime || `2026-08-${String((index % 9) + 1).padStart(2, '0')} ${String(8 + (index % 8)).padStart(2, '0')}:00:00`;
    const creator = source.creator || '管理员';
    const items = (source.items || []).map((item, itemIndex) => {
      const orderLineId = item.orderLineId || `${id}-LINE-${String(itemIndex + 1).padStart(3, '0')}`;
      const productId = item.productId || item.goodsCode || item.productCode || '';
      const quantity = number(item.quantity || item.orderQty);
      return {
        ...clone(item),
        id: orderLineId,
        orderLineId,
        orderId: id,
        productId,
        goodsCode: productId,
        quantity,
        orderQty: quantity,
        actualQty: number(item.actualQty),
        shippedQty: number(item.shippedQty),
        shippedAmount: number(item.shippedAmount),
        subtotal: number(item.subtotal || quantity * number(item.unitPrice))
      };
    });
    let status = source.status || 'PENDING';
    if (status === 'PENDING') status = sourceType === 'CUSTOMER' ? 'PENDING_CONFIRM' : 'PENDING_AUDIT';
    if (status === 'APPROVED') status = 'READY_FOR_SORTING';
    if (status === 'CONFIRMED') status = 'READY_FOR_SORTING';
    if (status === 'COMPLETED') status = 'SHIPPED';
    const shippingAt = source.shippingAt || (status === 'SHIPPED' ? `${createdAt.slice(0, 10)} 06:30:00` : '');
    return {
      ...clone(source),
      id,
      orderId: id,
      createdAt,
      createTime: createdAt,
      creator,
      operationLogs: normalizeOrderLogs(source, createdAt, creator),
      sourceType,
      status,
      customerId: source.customerId || '',
      customerName: source.customerName || '',
      canteen: source.canteen || '',
      receiptStatus: '未收货',
      receivedAt: '',
      supplement: '否',
      orderLineCount: items.length,
      productCount: items.length,
      items,
      sortingCompleted: false,
      expectedAt: normalizeDateTime(source.expectedAt || source.deliveryTime || ''),
      shippingAt: normalizeDateTime(shippingAt),
      updatedAt: source.updatedAt || createdAt
    };
  }

  function normalizeOrderLogs(order, createdAt, creator) {
    const logs = Array.isArray(order.operationLogs) ? clone(order.operationLogs).filter((log) => log && (log.action || log.desc)) : [];
    if (logs.length) return logs;
    const result = [{ action: '创建订单', desc: `${creator} 创建订单 ${createdAt}` }];
    if (['CONFIRMED', 'COMPLETED', 'APPROVED'].includes(order.status)) result.push({ action: '确认供货', desc: `${creator} 确认供货 ${createdAt}` });
    if (order.status === 'COMPLETED') result.push({ action: '完成发货', desc: `系统 完成发货 ${createdAt}` });
    if (order.status === 'CLOSED') result.push({ action: '关闭订单', desc: `${creator} 关闭订单 ${createdAt}` });
    return result;
  }

  function ensureDocumentOperationLogs(state) {
    const collections = [
      ['orders', '订单', 'creator', 'createdAt'],
      ['orderLines', '订单明细', 'creator', 'createdAt'],
      ['sortingTasks', '分拣任务', 'sorter', 'sortingAt'],
      ['shippingOrders', '发货单', 'creator', 'createdAt'],
      ['outboundOrders', '出库单', 'creator', 'outboundTime'],
      ['inboundOrders', '入库单', 'creator', 'entryTime'],
      ['processingOrders', '加工单', 'operator', 'createTime'],
      ['returns', '退货单', 'creator', 'createdAt'],
      ['receiptChanges', '收货变更单', 'creator', 'createdAt']
    ];
    let changed = false;
    collections.forEach(([resource, label, actorKey, timeKey]) => {
      (state[resource] || []).forEach((record) => {
        const logs = Array.isArray(record.operationLogs)
          ? record.operationLogs.filter((log) => log && (log.action || log.desc))
          : [];
        if (logs.length) {
          record.operationLogs = logs;
          return;
        }
        const actor = record[actorKey] || '系统';
        const occurredAt = record[timeKey] || record.createdAt || record.createTime || timestamp();
        record.operationLogs = [{
          action: '创建',
          operator: actor,
          createdAt: occurredAt,
          desc: `${actor} 创建${label} ${occurredAt}`
        }];
        changed = true;
      });
    });
    return changed;
  }

  function normalizeReceiptAndSupplement(state) {
    let changed = false;
    (state.orders || []).forEach((order) => {
      if (order.receiptStatus !== '未收货' || order.receivedAt) {
        order.receiptStatus = '未收货';
        order.receivedAt = '';
        changed = true;
      }
      if (order.supplement !== '否') {
        order.supplement = '否';
        changed = true;
      }
    });
    return changed;
  }

  function normalizeStateDateTimes(state) {
    let changed = false;
    ['orders', 'shippingOrders', 'sortingTasks'].forEach((resource) => {
      (state[resource] || []).forEach((record) => {
        if (!record.expectedAt) return;
        const normalized = normalizeDateTime(record.expectedAt);
        if (normalized !== record.expectedAt) {
          record.expectedAt = normalized;
          changed = true;
        }
      });
    });
    return changed;
  }

  function normalizeProductMetadata(state) {
    const revision = 'products-v6';
    const seededNetVegetables = new Set([
      'SP0300039', 'SP0300050', 'SP0300051', 'SP0300052', 'SP0300054',
      'SP0300055', 'SP0300057', 'SP0300058', 'SP0300059', 'SP0300061'
    ]);
    const refreshedProductCodes = new Set([
      'SP0300039', 'SP0300040', 'SP0300034', 'SP0300031', 'SP0300020', 'SP0300019',
      'SP0300050', 'SP0300051', 'SP0300052', 'SP0300053', 'SP0300054', 'SP0300055',
      'SP0300056', 'SP0300057', 'SP0300058', 'SP0300059', 'SP0300060', 'SP0300061'
    ]);
    const legacyEggLiquidCode = 'SIM-NET-EGG-LIQUID';
    const eggLiquidCode = 'SP0300043';
    const shouldRefreshProducts = state.productSeedRevision !== revision;
    let changed = false;
    const replaceLegacyEggLiquidCode = (value) => {
      if (Array.isArray(value)) {
        value.forEach((item, index) => { value[index] = replaceLegacyEggLiquidCode(item); });
        return value;
      }
      if (value && typeof value === 'object') {
        Object.keys(value).forEach((key) => { value[key] = replaceLegacyEggLiquidCode(value[key]); });
        return value;
      }
      if (value === legacyEggLiquidCode) {
        changed = true;
        return eggLiquidCode;
      }
      return value;
    };
    replaceLegacyEggLiquidCode(state);
    state.products = Array.isArray(state.products) ? state.products : [];
    if (shouldRefreshProducts) {
      (window.MockProducts || [])
        .filter((sourceProduct) => refreshedProductCodes.has(sourceProduct.code || sourceProduct.id))
        .forEach((sourceProduct) => {
          const productCode = sourceProduct.code || sourceProduct.id;
          const existing = state.products.find((product) => (product.code || product.productId || product.id) === productCode);
          const normalized = {
            ...clone(sourceProduct),
            id: existing?.id || sourceProduct.id || productCode,
            productId: productCode,
            code: productCode,
            seq: existing?.seq || sourceProduct.seq || state.products.length + 1,
            marketPrice: number(sourceProduct.marketPrice),
            isNetVegetable: sourceProduct.isNetVegetable === true
          };
          if (!existing) state.products.push(normalized);
          else Object.assign(existing, normalized);
          changed = true;
        });
    }
    (state.products || []).forEach((product, index) => {
      const productCode = product.code || product.productId;
      const isSeededNetVegetable = seededNetVegetables.has(productCode);
      const sourceProduct = window.MockProducts?.find((item) => (item.code || item.id) === productCode);
      if (product.seq == null || product.seq === '') {
        product.seq = index + 1;
        changed = true;
      }
      if (shouldRefreshProducts && sourceProduct && product.isNetVegetable !== sourceProduct.isNetVegetable) {
        product.isNetVegetable = sourceProduct.isNetVegetable === true;
        changed = true;
      }
      if (!product.source) {
        product.source = '平台添加';
        changed = true;
      }
      if (!product.addTime) {
        product.addTime = `2026-08-${String((index % 9) + 1).padStart(2, '0')} 09:00:00`;
        changed = true;
      }
      if (!product.purchaseType) {
        product.purchaseType = sourceProduct?.purchaseType
          || (product.isNetVegetable ? '企业自加工' : '供应商送货');
        changed = true;
      }
      if (isSeededNetVegetable && !product.isNetVegetable) {
        product.isNetVegetable = true;
        product.purchaseType = '企业自加工';
        changed = true;
      }
      if (productCode === 'SP0300039' && product.purchaseType !== '企业自加工') {
        product.isNetVegetable = true;
        product.purchaseType = '企业自加工';
        changed = true;
      }
      if (productCode === 'SP0300040' && product.isNetVegetable) {
        product.isNetVegetable = false;
        if (product.purchaseType === '企业自加工') product.purchaseType = '供应商送货';
        changed = true;
      }
    });
    if (state.productSeedRevision !== revision) {
      state.productSeedRevision = revision;
      changed = true;
    }
    return changed;
  }

  function normalizeProcessingOutputs(state) {
    const outputPlan = {
      JGD20260727002: ['SP0300034', 'SP0300025'],
      JGD20260726003: ['SP0300014', 'SP0300020'],
      JGD20260725004: ['SP0300029', 'SP0300018']
    };
    let changed = false;
    (state.processingOrders || []).forEach((record) => {
      if (!/^JG(?!D)/.test(String(record.id || ''))) return;
      record.id = `JGD${String(record.id).slice(2)}`;
      changed = true;
    });
    Object.entries(outputPlan).forEach(([processingId, productCodes]) => {
      const processingOrder = (state.processingOrders || []).find((record) => record.id === processingId);
      if (!processingOrder) return;
      const materialQty = number(processingOrder.materials?.[0]?.consumeQty, 10);
      const outputs = Array.isArray(processingOrder.outputs) ? processingOrder.outputs : [];
      productCodes.forEach((productCode, index) => {
        if (outputs.some((output) => output.productCode === productCode)) return;
        const product = (state.products || []).find((item) => (item.code || item.id) === productCode);
        if (!product) return;
        const coefficient = [0.8, 0.5][index] || 0.5;
        const refQty = Number((materialQty * coefficient).toFixed(2));
        outputs.push({
          productCode,
          productName: product.name,
          unit: product.unit,
          refCoefficient: coefficient,
          refQty,
          actualQty: refQty,
          costPrice: number(product.marketPrice).toFixed(2)
        });
        changed = true;
      });
      if (processingOrder.outputs !== outputs) {
        processingOrder.outputs = outputs;
        changed = true;
      }
    });
    (state.processingOrders || []).forEach((processingOrder, index) => {
      if (!String(processingOrder.id || '').startsWith('JGD20260805')) return;
      if (![1, 4, 7, 10, 13].includes(index % 15)) return;
      const outputs = Array.isArray(processingOrder.outputs) ? processingOrder.outputs : [];
      const usedCodes = new Set(outputs.map((output) => output.productCode));
      const candidates = (state.products || []).filter((product) => !usedCodes.has(product.code));
      const materialQty = number(processingOrder.materials?.[0]?.consumeQty, 10);
      candidates.slice(0, 2).forEach((product, candidateIndex) => {
        const coefficient = candidateIndex ? 0.6 : 0.8;
        const refQty = Number((materialQty * coefficient).toFixed(2));
        outputs.push({
          productCode: product.code,
          productName: product.name,
          unit: product.unit,
          refCoefficient: coefficient,
          refQty,
          actualQty: refQty,
          costPrice: number(product.marketPrice).toFixed(2)
        });
        changed = true;
      });
      processingOrder.outputs = outputs;
    });
    if (state.processingOutputSeedRevision !== 'processing-outputs-v4') {
      state.processingOutputSeedRevision = 'processing-outputs-v4';
      changed = true;
    }
    return changed;
  }

  function seedProcessingAuditDemo(state) {
    const demoId = 'JGD202608300300006';
    if (!Array.isArray(state.processingOrders)) state.processingOrders = [];
    if (state.processingOrders.some((record) => record.id === demoId)) return false;
    const source = (window.MockProcessingOrders || []).find((record) => record.id === demoId);
    if (!source) return false;
    state.processingOrders.push(clone(source));
    return true;
  }

  function resetProcessingModuleData(state) {
    const revision = 'processing-module-v2';
    if (state.processingModuleSeedRevision === revision) return false;
    state.processingTemplates = clone(window.MockProcessingTemplates || []);
    state.processingOrders = clone(window.MockProcessingOrders || []);
    state.processingModuleSeedRevision = revision;
    return true;
  }

  function ensureProcessingDemoData(state) {
    const seedOrder = (window.MockOperations?.orders || []).find((order) => order.id === 'ORD-PROCESS-20260731-001');
    if (!seedOrder) return false;

    let changed = false;
    let demoOrder = (state.orders || []).find((order) => order.id === seedOrder.id);
    if (!demoOrder) {
      demoOrder = normalizeOrder(seedOrder, (state.orders || []).length);
      state.orders = Array.isArray(state.orders) ? state.orders : [];
      state.orders.push(demoOrder);
      changed = true;
    }

    state.orderLines = Array.isArray(state.orderLines) ? state.orderLines : [];
    if (!state.orderLines.some((line) => line.orderId === demoOrder.id)) {
      state.orderLines.push(...clone(demoOrder.items || []));
      changed = true;
    }

    const demoTasks = makeSortingTasks([demoOrder]);
    state.sortingTasks = Array.isArray(state.sortingTasks) ? state.sortingTasks : [];
    const existingTaskIds = new Set(state.sortingTasks.map((task) => task.id));
    demoTasks.forEach((task) => {
      if (existingTaskIds.has(task.id)) return;
      state.sortingTasks.push(task);
      changed = true;
    });

    if (Array.isArray(state.shippingOrders)
      && !state.shippingOrders.some((order) => order.orderId === demoOrder.id)) {
      state.shippingOrders.push(...makeShippingOrders([demoOrder], demoTasks));
      changed = true;
    }
    return changed;
  }

  function resetStatisticsData(state) {
    const revision = 'statistics-module-v1';
    if (state.statisticsSeedRevision === revision) return false;
    state.productSales = clone(window.MockOperations?.productSales || []);
    state.goodsProfitStatistics = clone(window.MockOperations?.goodsProfitStatistics || []);
    state.statisticsSeedRevision = revision;
    return true;
  }

  function normalizeProcessingIds(state) {
    let changed = false;
    (state.processingOrders || []).forEach((record) => {
      const nextId = canonicalProcessingId(record.id, record.customerCode || '03');
      if (nextId && nextId !== record.id) {
        record.id = nextId;
        changed = true;
      }
      if (!record.customerCode) {
        record.customerCode = '03';
        changed = true;
      }
    });
    if (state.processingIdSeedRevision !== 'processing-ids-v2') {
      state.processingIdSeedRevision = 'processing-ids-v2';
      changed = true;
    }
    return changed;
  }

  function normalizeStateContracts(state) {
    const rules = window.BusinessRules;
    let changed = seedProcessingAuditDemo(state);
    changed = ensureProcessingDemoData(state) || changed;
    const fixes = [];
    const mark = (resource, field, from, to) => {
      if (String(from ?? '') === String(to ?? '')) return;
      changed = true;
      fixes.push({ resource, field, from: from ?? '', to: to ?? '' });
    };
    const set = (record, resource, field, value) => {
      if (record[field] === value) return;
      mark(resource, field, record[field], value);
      record[field] = value;
    };
    const missing = (value) => rules.isMissing(value);
    const inboundCounterparty = (record) => {
      const type = String(record.entryType || '');
      if (type.includes('报溢')) return '仓库报溢';
      if (type.includes('单位转换')) return '单位转换';
      if (type.includes('加工')) return '企业自加工';
      return record.supplierName || record.customerName || '平台默认供应商';
    };
    const outboundCounterparty = (record) => {
      const type = String(record.outboundType || '');
      if (type.includes('报损')) return '仓库报损';
      if (type.includes('单位转换')) return '单位转换';
      if (type.includes('加工')) return '企业自加工';
      return record.customerName || record.supplierName || '平台默认客户';
    };

    if (!Array.isArray(state.units)) {
      state.units = clone(window.MockUnitMeasurements || []);
      changed = true;
    }
    if (!Array.isArray(state.goodsReviews)) {
      state.goodsReviews = clone(window.MockGoodsReviews || []);
      changed = true;
    }
    if (!Array.isArray(state.processingTemplates)) {
      state.processingTemplates = clone(window.MockProcessingTemplates || []);
      changed = true;
    }

    (state.products || []).forEach((product) => {
      if (!product.id) set(product, 'products', 'id', product.code);
      set(product, 'products', 'status', rules.normalizeStatus('products', product.status));
      if (product.addTime) set(product, 'products', 'addTime', rules.normalizeDateTime(product.addTime));
    });

    const products = state.products || [];
    (state.orders || []).flatMap((order) => order.items || []).forEach((line) => {
      const code = line.productId || line.productCode || line.goodsCode;
      const lineName = String(line.goodsName || line.productName || code).split('(')[0];
      const current = products.find((product) => (product.code || product.id) === code);
      const sameName = products.find((product) => product.name === lineName && (!line.unit || product.unit === line.unit))
        || products.find((product) => product.name === lineName);
      if (sameName) {
        const productId = sameName.code || sameName.id;
        if (line.productId !== productId || line.goodsCode !== productId) {
          line.productId = productId;
          line.goodsCode = productId;
          changed = true;
        }
        return;
      }
      if (!code || (current && current.name === lineName)) return;
      const nextProductNumber = products.reduce((max, product) => {
        const match = String(product.code || '').match(/^SP(\d{7})$/);
        return Math.max(max, match ? Number(match[1]) : 0);
      }, 0) + 1;
      const productCode = current ? `SP${String(nextProductNumber).padStart(7, '0')}` : code;
      products.push({
        id: productCode,
        code: productCode,
        name: lineName,
        goodsName: lineName,
        unit: line.unit || 'KG',
        brand: line.brand || '--',
        spec: line.spec || '--',
        category: line.category || '业务补录商品',
        marketPrice: number(line.unitPrice),
        status: 'ENABLE',
        source: '历史单据迁移',
        addTime: timestamp(),
        purchaseType: line.isNetVegetable ? '企业自加工' : '供应商送货',
        isNetVegetable: line.isNetVegetable === true
      });
      line.productId = productCode;
      line.goodsCode = productCode;
      changed = true;
    });
    const productsByCode = new Map(products.map((product) => [product.code || product.id, product]));
    const findProduct = (line) => {
      const code = line.productId || line.productCode || line.goodsCode;
      const current = productsByCode.get(code);
      const rawName = String(line.productName || line.goodsName || '').split('(')[0];
      if (current && (!rawName || current.name === rawName)) return current;
      return products.find((product) => product.name === rawName && (!line.unit || product.unit === line.unit))
        || products.find((product) => product.name === rawName)
        || current;
    };
    const normalizeLine = (line, resource) => {
      const product = findProduct(line);
      if (product) {
        const productId = product.code || product.id;
        set(line, resource, 'productId', productId);
        if ('goodsCode' in line) set(line, resource, 'goodsCode', productId);
        if ('productCode' in line) set(line, resource, 'productCode', productId);
        if (!line.goodsName && !line.productName) set(line, resource, 'productName', product.name);
      }
      if (line.amount !== undefined) {
        set(line, resource, 'amount', Number(rules.itemAmount(line).toFixed(2)));
      }
    };

    const dateFields = {
      orders: ['createdAt', 'createTime', 'updatedAt', 'expectedAt', 'shippingAt'],
      shippingOrders: ['createdAt', 'expectedAt'],
      sortingTasks: ['expectedAt', 'sortingAt'],
      inboundOrders: ['entryTime'],
      outboundOrders: ['outboundTime'],
      processingOrders: ['createTime'],
      returns: ['createdAt', 'auditAt', 'acceptedAt'],
      receiptChanges: ['createdAt', 'shippingAt', 'auditAt'],
      inventoryLedger: ['occurredAt']
    };
    Object.entries(dateFields).forEach(([resource, fields]) => {
      (state[resource] || []).forEach((record) => fields.forEach((field) => {
        if (record[field]) set(record, resource, field, rules.normalizeDateTime(record[field]));
      }));
    });

    const statusResources = [
      'products', 'orders', 'inboundOrders', 'outboundOrders', 'processingOrders', 'returns',
      'receiptChanges', 'inventoryCounts', 'inventoryLosses', 'openingInventory', 'qualityReports'
    ];
    statusResources.forEach((resource) => (state[resource] || []).forEach((record) => {
      set(record, resource, 'status', rules.normalizeStatus(resource, record.status));
    }));

    // 只有用户明确暂存的加工单才能是草稿；历史演示种子中的草稿不代表真实业务状态。
    const seedProcessingDraft = (record) => (
      record.status === 'DRAFT'
      && (record.id === 'JGD20260726003' || String(record.id || '').startsWith('JGD20260805'))
    );
    (state.processingOrders || []).forEach((record) => {
      if (seedProcessingDraft(record)) set(record, 'processingOrders', 'status', 'COMPLETED');
    });

    const contactNames = ['王老师', '李老师', '周老师', '赵老师', '孙老师', '刘主任'];
    (state.customerLocations || []).forEach((location, index) => {
      if (missing(location.receiver)) {
        set(location, 'customerLocations', 'receiver', contactNames[index % contactNames.length]);
      }
      if (missing(location.phone)) {
        set(location, 'customerLocations', 'phone', `1380000${String(index + 200).padStart(4, '0')}`);
      }
      if (missing(location.address)) {
        set(location, 'customerLocations', 'address', `配送路${index + 1}号`);
      }
      if (missing(location.route)) {
        set(location, 'customerLocations', 'route', `配送线路${(index % 5) + 1}`);
      }
    });

    (state.sortingProgress || []).forEach((progress) => {
      const location = (state.customerLocations || []).find((item) => (
        item.customerId === progress.customerId && item.canteen === progress.canteen
      )) || (state.customerLocations || []).find((item) => (
        item.customerName === progress.customerName && item.canteen === progress.canteen
      ));
      if (!location) return;
      set(progress, 'sortingProgress', 'receiver', progress.receiver || progress.consignee || location.receiver);
      set(progress, 'sortingProgress', 'phone', progress.phone || progress.consigneePhone || location.phone);
      set(progress, 'sortingProgress', 'address', progress.address || progress.consigneeAddress || location.address);
      set(progress, 'sortingProgress', 'route', progress.route || location.route);
    });

    (state.orders || []).forEach((order) => {
      (order.items || []).forEach((line) => normalizeLine(line, 'orders'));
      order.orderLines = order.items;
      set(order, 'orders', 'orderAmount', Number(rules.totalAmount(order.items, ['quantity', 'orderQty']).toFixed(2)));
    });
    state.orderLines = (state.orders || []).flatMap((order) => (order.items || []).map((line) => clone(line)));

    (state.sortingTasks || []).forEach((task) => normalizeLine(task, 'sortingTasks'));
    (state.shippingOrders || []).forEach((shipping) => {
      if (!Array.isArray(shipping.items) || shipping.items.length === 0) {
        shipping.items = (state.sortingTasks || [])
          .filter((task) => task.orderId === shipping.orderId)
          .map((task) => ({ ...clone(task), shippingQty: number(task.actualQty || task.orderQty) }));
        changed = true;
      }
      (shipping.items || []).forEach((line) => normalizeLine(line, 'shippingOrders'));
      const order = (state.orders || []).find((item) => item.id === shipping.orderId);
      if (order) {
        set(shipping, 'shippingOrders', 'customerId', order.customerId || '');
        set(shipping, 'shippingOrders', 'customerName', order.customerName || '');
        set(shipping, 'shippingOrders', 'canteen', order.canteen || '');
        set(shipping, 'shippingOrders', 'orderNo', order.orderNo || '');
      }
      const location = (state.customerLocations || []).find((item) => (
        item.customerId === shipping.customerId && item.canteen === shipping.canteen
      )) || (state.customerLocations || []).find((item) => (
        item.customerName === shipping.customerName && item.canteen === shipping.canteen
      ));
      if (location) {
        if (missing(shipping.receiver)) set(shipping, 'shippingOrders', 'receiver', location.receiver);
        if (missing(shipping.phone)) set(shipping, 'shippingOrders', 'phone', location.phone);
        if (missing(shipping.address)) set(shipping, 'shippingOrders', 'address', location.address);
        if (missing(shipping.route)) set(shipping, 'shippingOrders', 'route', location.route);
      }
    });

    (state.inboundOrders || []).forEach((record) => {
      (record.items || []).forEach((line) => normalizeLine(line, 'inboundOrders'));
      set(record, 'inboundOrders', 'entryAmt', Number(rules.totalAmount(record.items, ['actualQty', 'entryQty', 'expectedQty']).toFixed(2)));
      if (missing(record.supplierPurchaserCustomerName)) {
        set(record, 'inboundOrders', 'supplierPurchaserCustomerName', inboundCounterparty(record));
      }
      if (!record.warehouseName) set(record, 'inboundOrders', 'warehouseName', record.warehouse || '中心仓');
    });

    (state.outboundOrders || []).forEach((record) => {
      const order = (state.orders || []).find((item) => item.id === record.orderId);
      (record.items || []).forEach((line) => {
        const orderLine = order?.items?.find((item) => item.orderLineId === line.orderLineId) || {};
        if (!(number(line.outboundQty) > 0)) {
          set(line, 'outboundOrders', 'outboundQty', number(orderLine.shippedQty || orderLine.quantity || orderLine.orderQty));
        }
        if (!(number(line.unitPrice) > 0)) {
          const product = findProduct(line);
          set(line, 'outboundOrders', 'unitPrice', number(orderLine.unitPrice || product?.marketPrice));
        }
        set(line, 'outboundOrders', 'amount', Number((number(line.outboundQty) * number(line.unitPrice)).toFixed(2)));
        normalizeLine(line, 'outboundOrders');
      });
      const customerName = !missing(record.supplierPurchaserCustomerName)
        ? record.supplierPurchaserCustomerName
        : (!missing(record.customerName) ? record.customerName : (order?.customerName || outboundCounterparty(record)));
      set(record, 'outboundOrders', 'customerName', customerName);
      set(record, 'outboundOrders', 'supplierPurchaserCustomerName', customerName);
      set(record, 'outboundOrders', 'customerId', record.customerId || order?.customerId || '');
      set(record, 'outboundOrders', 'canteen', record.canteen || order?.canteen || '');
      set(record, 'outboundOrders', 'outboundAmt', Number(rules.totalAmount(record.items, ['outboundQty', 'actualQty', 'quantity']).toFixed(2)));
      if (!record.warehouseName) set(record, 'outboundOrders', 'warehouseName', record.warehouse || '中心仓');
    });

    (state.processingOrders || []).forEach((record) => {
      (record.materials || []).forEach((line) => normalizeLine(line, 'processingOrders'));
      (record.outputs || []).forEach((line) => normalizeLine(line, 'processingOrders'));
      set(record, 'processingOrders', 'processingDate', rules.normalizeDate(record.processingDate || record.createTime));
    });

    (state.returns || []).forEach((record) => {
      const order = (state.orders || []).find((item) => item.orderNo === record.orderNo)
        || (state.orders || []).find((item) => item.customerName === record.customerName && item.canteen === record.canteen);
      if (order && record.orderNo !== order.orderNo) set(record, 'returns', 'orderNo', order.orderNo);
      if ((!Array.isArray(record.items) || record.items.length === 0) && order) {
        record.items = clone(order.items || []);
        changed = true;
      }
      (record.items || []).forEach((line) => {
        if (!line.productCode && !line.productId && !line.goodsCode) {
          const product = findProduct(line);
          if (product) {
            line.productId = product.code || product.id;
            line.productCode = product.code || product.id;
            changed = true;
          }
        }
        if (!line.quantity && line.applyQty) line.quantity = number(line.applyQty);
        normalizeLine(line, 'returns');
      });
    });

    (state.receiptChanges || []).forEach((record) => {
      const order = (state.orders || []).find((item) => item.orderNo === record.orderNo)
        || (state.orders || []).find((item) => item.customerName === record.customerName && item.canteen === record.canteen);
      if (order && record.orderNo !== order.orderNo) set(record, 'receiptChanges', 'orderNo', order.orderNo);
      if ((!Array.isArray(record.items) || record.items.length === 0) && order) {
        record.items = clone(order.items || []);
        changed = true;
      }
      (record.items || []).forEach((line) => normalizeLine(line, 'receiptChanges'));
      const beforeAmount = rules.totalAmount(record.items, ['shippedQty', 'quantity']);
      if (record.beforeAmount === undefined) set(record, 'receiptChanges', 'beforeAmount', beforeAmount);
      if (record.afterAmount === undefined) set(record, 'receiptChanges', 'afterAmount', beforeAmount);
      set(record, 'receiptChanges', 'differenceAmount', Number((number(record.afterAmount) - number(record.beforeAmount)).toFixed(2)));
    });

    const normalizeDocuments = (resource, records, field, dateField, codeGetter, copyToId = false) => {
      const accepted = [];
      const seen = new Set();
      records.forEach((record) => {
        const current = String(record[field] || '');
        const isValid = rules.documentRegex(resource).test(current);
        const isDuplicate = seen.has(current);
        if (!isValid || isDuplicate) {
          const generated = rules.documentNumber(resource, {
            date: record[dateField] || record.createdAt || timestamp(),
            businessCode: codeGetter(record),
            records: accepted,
            fields: [field]
          });
          set(record, resource, field, generated);
          if (copyToId) {
            set(record, resource, 'id', generated);
            if (resource === 'outboundOrders') set(record, resource, 'outboundOrderId', generated);
          }
        }
        seen.add(record[field]);
        accepted.push(record);
      });
    };

    normalizeDocuments('inboundOrders', state.inboundOrders || [], 'id', 'entryTime', (record) => record.customerCode || '03', true);
    normalizeDocuments('outboundOrders', state.outboundOrders || [], 'id', 'outboundTime', (record) => record.customerCode || '03', true);
    normalizeDocuments('processingOrders', state.processingOrders || [], 'id', 'processingDate', (record) => record.customerCode || '03', true);
    normalizeDocuments('returns', state.returns || [], 'returnNo', 'createdAt', (record) => record.customerCode || '03');
    normalizeDocuments('receiptChanges', state.receiptChanges || [], 'changeNo', 'createdAt', (record) => record.customerCode || '03');

    state.dataContractVersion = schemaVersion;
    state.lastMigration = {
      version: schemaVersion,
      migratedAt: timestamp(),
      fixCount: fixes.length,
      fixes: fixes.slice(0, 200)
    };
    return changed;
  }

  function makeSortingTasks(orders) {
    const sourceItems = window.MockOperations?.sortingItems || [];
    return orders.flatMap((order) => order.items.map((line, index) => {
      const source = sourceItems.find((item) => (
        (item.orderId === order.id || item.orderNo === order.orderNo)
        && (item.goodsCode || item.productCode) === line.productId
      ));
      const sorted = source?.status === 'SORTED' || Boolean(source?.sortingAt);
      const actualQty = source ? number(source.actualQty) : number(line.shippedQty);
      return {
        ...(source ? clone(source) : {}),
        id: source?.id || `SORT-${order.id}-${String(index + 1).padStart(3, '0')}`,
        sortingTaskId: source?.id || `SORT-${order.id}-${String(index + 1).padStart(3, '0')}`,
        orderId: order.id,
        orderLineId: line.orderLineId,
        productId: line.productId,
        goodsCode: line.productId,
        goodsName: line.goodsName || '',
        isNetVegetable: line.isNetVegetable === true,
        customerId: order.customerId || '',
        customerName: order.customerName || '',
        canteen: order.canteen || '',
        orderNo: order.orderNo || '',
        orderQty: number(line.quantity),
        actualQty,
        unit: line.unit || '',
        warehouse: order.warehouse || '',
        route: order.route || '',
        expectedAt: order.expectedAt || '',
        status: sorted ? 'SORTED' : 'PENDING',
        sortingCompleted: sorted,
        shortage: source?.shortage || (actualQty < number(line.quantity) && sorted ? '是' : '否'),
        shortageQty: Math.max(number(line.quantity) - actualQty, 0),
        progress: `${actualQty}/${number(line.quantity)}`,
        sorter: source?.sorter || '',
        sortingAt: source?.sortingAt || ''
      };
    }));
  }

  function makeShippingOrders(orders, sortingTasks) {
    return orders.map((order) => {
      const tasks = sortingTasks.filter((task) => task.orderId === order.id);
      const shipped = order.status === 'SHIPPED' || tasks.some((task) => task.shipped === '是');
      const sortingCompleted = tasks.length > 0 && tasks.every((task) => task.sortingCompleted);
      return {
        id: `SHIP-${order.id}`,
        shippingOrderId: `SHIP-${order.id}`,
        orderId: order.id,
        orderNo: order.orderNo,
        customerId: order.customerId || '',
        customerName: order.customerName,
        canteen: order.canteen,
        receiver: order.receiver || '',
        phone: order.phone || '',
        address: order.address || '',
        route: order.route || '',
        warehouse: order.warehouse || '',
        shippingAmount: number(order.shippingAmount),
        sortingStatus: sortingCompleted ? 'SORTED' : 'PENDING',
        status: shipped ? 'SHIPPED' : 'PENDING',
        printed: order.printed || '否',
        expectedAt: order.expectedAt || '',
        orderTag: order.orderTag || '',
        items: tasks.map((task) => ({ ...clone(task), shippingQty: task.actualQty }))
      };
    });
  }

  function makeOutboundOrders(orders, shippingOrders) {
    const outboundOrders = [];
    shippingOrders.filter((shipping) => shipping.status === 'SHIPPED').forEach((shipping) => {
      const order = orders.find((item) => item.id === shipping.orderId);
      const outboundTime = order?.shippingAt || order?.createdAt || timestamp();
      const outboundId = nextOutboundNumber(outboundOrders, {
        outboundTime,
        customerCode: order?.customerCode || '03'
      });
      const items = (shipping.items || []).map((item) => {
        const orderLine = order?.items?.find((line) => line.orderLineId === item.orderLineId) || {};
        const quantity = number(item.actualQty || item.shippingQty || orderLine.shippedQty || orderLine.quantity || item.orderQty);
        const unitPrice = number(item.unitPrice || orderLine.unitPrice);
        return {
          orderId: shipping.orderId,
          orderLineId: item.orderLineId,
          productId: item.productId,
          productCode: item.productId,
          productName: item.goodsName,
          unit: item.unit,
          outboundQty: quantity,
          currentStock: 0,
          unitPrice,
          amount: quantity * unitPrice
        };
      });
      outboundOrders.push({
        id: outboundId,
        outboundOrderId: outboundId,
        orderId: shipping.orderId,
        orderNo: shipping.orderNo,
        relNo: shipping.orderNo,
        warehouse: shipping.warehouse,
        warehouseName: shipping.warehouse,
        outboundType: '销售出库',
        customerId: order?.customerId || '',
        customerName: order?.customerName || shipping.customerName || '',
        supplierPurchaserCustomerName: order?.customerName || shipping.customerName || '',
        canteen: order?.canteen || shipping.canteen || '',
        customerCode: order?.customerCode || '03',
        status: 'PENDING_AUDIT',
        outboundTime: normalizeDateTime(outboundTime),
        outboundAmt: window.BusinessRules.totalAmount(items, ['outboundQty']),
        creator: order?.creator || '管理员',
        items
      });
    });
    return outboundOrders;
  }

  function makeLedger(products, orders) {
    const balanceRows = window.MockOperations?.inventoryBalance || [];
    const ledger = [];
    balanceRows.forEach((row, index) => {
      const productId = row.productId || row.goodsCode || row.productCode;
      const qty = number(row.currentStock || row.balance || row.openingQty);
      if (!productId || qty === 0) return;
      ledger.push({
        id: `LEDGER-OPEN-${String(index + 1).padStart(4, '0')}`,
        type: 'OPENING',
        productId,
        warehouse: row.warehouse || '中心仓',
        qty,
        unit: row.unit || products.find((p) => p.id === productId)?.unit || '',
        unitPrice: number(row.averageCost || row.openingPrice),
        amount: number(row.totalAmount || qty * number(row.averageCost || row.openingPrice)),
        orderId: '',
        orderLineId: '',
        occurredAt: row.occurredAt || '2026-08-01 00:00:00',
        remark: '系统初始库存'
      });
    });
    if (!ledger.length) {
      products.slice(0, 8).forEach((product, index) => ledger.push({
        id: `LEDGER-OPEN-${String(index + 1).padStart(4, '0')}`,
        type: 'OPENING',
        productId: product.id,
        warehouse: '中心仓',
        qty: product.isNetVegetable ? 60 : 120,
        unit: product.unit,
        unitPrice: number(product.marketPrice),
        amount: (product.isNetVegetable ? 60 : 120) * number(product.marketPrice),
        orderId: '',
        orderLineId: '',
        occurredAt: '2026-08-01 00:00:00',
        remark: '系统初始库存'
      }));
    }
    const seededProducts = new Set(ledger.map((entry) => entry.productId));
    const usedLines = orders.flatMap((order) => order.items || []);
    usedLines.forEach((line, index) => {
      const productId = line.productId || line.goodsCode || '';
      if (!productId || seededProducts.has(productId)) return;
      const product = products.find((item) => item.id === productId);
      const qty = productId === 'SP0300043' ? 0 : Math.max(number(line.quantity) * 2, 100);
      ledger.push({
        id: `LEDGER-OPEN-FALLBACK-${String(index + 1).padStart(4, '0')}`,
        type: 'OPENING',
        productId,
        warehouse: '中心仓',
        qty,
        unit: line.unit || product?.unit || '',
        unitPrice: number(line.unitPrice || product?.marketPrice),
        amount: qty * number(line.unitPrice || product?.marketPrice),
        orderId: '',
        orderLineId: '',
        occurredAt: '2026-08-01 00:00:00',
        remark: '订单基础库存'
      });
      seededProducts.add(productId);
    });
    products.forEach((product, index) => {
      if (seededProducts.has(product.id)) return;
      const qty = product.isNetVegetable ? 60 : 120;
      ledger.push({
        id: `LEDGER-OPEN-PRODUCT-${String(index + 1).padStart(4, '0')}`,
        type: 'OPENING', productId: product.id, warehouse: '中心仓', qty,
        unit: product.unit, unitPrice: number(product.marketPrice), amount: qty * number(product.marketPrice),
        orderId: '', orderLineId: '', occurredAt: '2026-08-01 00:00:00', remark: '商品基础库存'
      });
    });
    return ledger;
  }

  function expandOrders(sourceOrders, products) {
    const orders = clone(sourceOrders || []);
    const customerNames = ['第一实验学校', '阳光幼儿园', '育才中学', '机关第二食堂', '第三小学', '实验幼儿园', '第七中学', '机关第一食堂', '东城职业学校', '南城中心幼儿园'];
    const canteenByCustomer = { 第一实验学校: '第一食堂', 阳光幼儿园: '园区食堂', 育才中学: '高中部食堂', 机关第二食堂: '二号食堂', 第三小学: '校园食堂', 实验幼儿园: '幼儿部食堂', 第七中学: '初中部食堂', 机关第一食堂: '一号食堂', 东城职业学校: '职工食堂', 南城中心幼儿园: '中心食堂' };
    const generatedStatus = ['COMPLETED', 'PENDING', 'CONFIRMED', 'COMPLETED', 'PENDING', 'COMPLETED', 'PENDING_AUDIT', 'COMPLETED', 'CONFIRMED', 'CLOSED'];
    while (orders.length < 40) {
      const index = orders.length;
      const generatedIndex = Math.max(0, index - 11);
      const product = products[index % products.length];
      const customerName = customerNames[generatedIndex % customerNames.length] || customerNames[0];
      const status = generatedIndex < 18 ? 'COMPLETED' : generatedStatus[generatedIndex % generatedStatus.length];
      orders.push({
        id: `ORD-DEMO-${String(index + 1).padStart(3, '0')}`, orderNo: `DD202608${String(5 + (generatedIndex % 20)).padStart(2, '0')}03${String(index + 1).padStart(5, '0')}`,
        customerName, customerType: customerName.includes('幼儿') ? '幼儿园' : customerName.includes('食堂') ? '机关单位' : '学校', canteen: canteenByCustomer[customerName],
        source: generatedIndex % 3 ? '企业下单' : '客户下单', orderTag: index % 2 ? '普通餐' : '营养餐', expectedAt: `2026-08-${String(5 + (generatedIndex % 10)).padStart(2, '0')} ${generatedIndex % 2 ? '08:00' : '07:30'}`,
        warehouse: generatedIndex % 4 === 0 ? '北区仓' : '中心仓', route: `配送线路${(generatedIndex % 5) + 1}`, status,
        orderAmount: Number((10 + (index % 6)) * number(product.marketPrice)), shippingAmount: status === 'COMPLETED' ? Number((10 + (index % 6)) * number(product.marketPrice)) : 0,
        items: [{ goodsCode: product.code || product.id, goodsName: product.name, unit: product.unit, quantity: 10 + (index % 6), unitPrice: number(product.marketPrice), isNetVegetable: product.isNetVegetable === true }]
      });
    }
    return orders;
  }

  function buildSeed() {
    const products = sourceProducts();
    const fallbackOrders = [
      {
        id: 'ORD-DEMO-001',
        orderNo: 'DD202608040100001',
        customerName: '第一实验学校',
        customerType: '学校',
        canteen: '第一食堂',
        source: '客户下单',
        orderTag: '营养餐',
        expectedAt: '2026-08-05 07:30',
        warehouse: '中心仓',
        route: '东城一线',
        status: 'PENDING',
        items: [
          { goodsCode: 'SP0300019', goodsName: '大白菜', unit: '斤', quantity: 30, unitPrice: 1.5, isNetVegetable: false },
          { goodsCode: 'SP0300039', goodsName: '土豆丝', unit: '斤', quantity: 20, unitPrice: 1, isNetVegetable: true }
        ]
      },
      {
        id: 'ORD-DEMO-002',
        orderNo: 'DD202608040200002',
        customerName: '阳光幼儿园',
        customerType: '幼儿园',
        canteen: '园区食堂',
        source: '平台添加',
        orderTag: '普通餐',
        expectedAt: '2026-08-05 08:00',
        warehouse: '中心仓',
        route: '南城二线',
        status: 'CONFIRMED',
        items: [
          { goodsCode: 'SP0300031', goodsName: '鲫鱼', unit: 'L', quantity: 12, unitPrice: 20, isNetVegetable: true },
          { goodsCode: 'SP0300040', goodsName: '土豆', unit: '斤', quantity: 20, unitPrice: 6.8, isNetVegetable: false }
        ]
      }
    ];
    const rawOrders = expandOrders(window.MockOperations?.orders?.length ? window.MockOperations.orders : fallbackOrders, products);
    const customers = sourceCustomers(rawOrders);
    const orders = rawOrders.map(normalizeOrder);
    const sortingTasks = makeSortingTasks(orders);
    const shippingOrders = makeShippingOrders(orders, sortingTasks);
    const outboundOrders = makeOutboundOrders(orders, shippingOrders);
    const seededReturns = (window.MockOperations?.returns || []).map((record, index) => {
      const datePart = String(record.createdAt || '2026-08-05').slice(0, 10).replace(/-/g, '');
      return { ...clone(record), returnNo: `THD${datePart}03${String(index + 1).padStart(5, '0')}`, orderNo: String(record.orderNo || '').replace(/^XS/, 'DD') };
    });
    const inboundOrders = clone(window.MockInboundOrders || []).map((order) => ({
      ...order,
      orderId: order.orderId || '',
      orderLineIds: order.orderLineIds || [],
      items: (order.items || []).map((item) => ({ ...item, productId: item.productId || item.productCode || '' }))
    }));
    return {
      version: schemaVersion,
      ...organizationSeed(),
      settings: { ...defaultSettings },
      products,
      units: clone(window.MockUnitMeasurements || []),
      goodsReviews: clone(window.MockGoodsReviews || []),
      processingTemplates: clone(window.MockProcessingTemplates || []),
      customers,
      customerLocations: sourceLocations(rawOrders, customers),
      warehouses: sourceWarehouses(),
      orders,
      orderLines: orders.flatMap((order) => order.items.map((line) => clone(line))),
      sortingTasks,
      processingOrders: clone(window.MockProcessingOrders || []),
      shippingOrders,
      shippingDifferences: padRecords(window.MockOperations?.shippingDifferences || [], 20, (index) => {
        const task = sortingTasks[index % sortingTasks.length];
        return {
          id: `SHIP-DIFF-${String(index + 1).padStart(3, '0')}`,
          orderNo: task.orderNo,
          goodsName: task.goodsName,
          warehouse: task.warehouse || '中心仓',
          stockQty: Number(task.orderQty || 0) + 5,
          sortingQty: Number(task.actualQty || 0),
          differenceQty: Math.max(0, Number(task.orderQty || 0) - Number(task.actualQty || 0)),
          status: index % 2 ? 'COMPLETED' : 'PENDING',
          createdAt: '2026-08-05 10:00:00'
        };
      }),
      outboundOrders,
      inboundOrders: padRecords(inboundOrders, 20, (index) => {
        const product = products[index % products.length];
        return {
          id: `RKD2026080503${String(index + 1).padStart(5, '0')}`, entryTime: '2026-08-05 09:00:00', supplierPurchaserCustomerName: ['上海绿源农产品有限公司', '北方粮油批发部', '联营水产合作社'][index % 3],
          entryType: '采购入库', entryAmt: String((10 + index) * number(product.marketPrice)), warehouseName: index % 3 ? '中心仓' : '北区仓', relNo: `CGD20260805${String(index + 1).padStart(5, '0')}`, expectedDeliveryDate: '2026-08-05', status: index % 3 ? 'COMPLETED' : 'PENDING_AUDIT', purchaserLeaderName: ['杨', '周', '刘'][index % 3], creator: '管理员', remark: '采购到货验收入库', attachments: [], operationLogs: [{ action: '添加', operator: '管理员', desc: '管理员 添加入库单' }],
          items: [{ productCode: product.code, productName: product.name, unit: product.unit, expectedQty: 10 + index, actualQty: 10 + index, unitPrice: String(product.marketPrice), amount: String((10 + index) * number(product.marketPrice)) }]
        };
      }),
      inventoryLedger: makeLedger(products, orders),
      returns: padRecords(seededReturns, 20, (index) => {
        const order = orders[index % orders.length]; const line = order.items[0];
        return { id: `RET-${String(index + 1).padStart(3, '0')}`, returnNo: `THD2026080503${String(index + 1).padStart(5, '0')}`, customerName: order.customerName, canteen: order.canteen, orderNo: order.orderNo, inboundNo: `RKD2026080503${String(index + 1).padStart(5, '0')}`, goodsName: line.goodsName, warehouse: order.warehouse, status: ['PENDING_AUDIT', 'APPROVED', 'CLOSED'][index % 3], creator: '管理员', createdAt: '2026-08-05 10:00:00', reason: ['商品破损', '数量多发', '质量不符合要求'][index % 3], refundAmount: number(line.unitPrice) * 2, items: [{ id: `RL-${index + 1}`, goodsName: line.goodsName, unit: line.unit, orderPrice: number(line.unitPrice), shippedQty: number(line.quantity), returnedQty: 0, applyQty: 2, applyPrice: number(line.unitPrice), applyAmount: number(line.unitPrice) * 2, damageQty: 1, remark: '按订单明细退货' }] };
      }),
      tags: padRecords(window.MockOperations?.tags || [], 20, (index) => ({ id: `TAG-${String(index + 1).padStart(3, '0')}`, tagName: ['营养餐', '普通餐', '应急保供', '节日餐'][index % 4], status: 'ENABLE', createdAt: '2026-08-05 09:00:00' })),
      receiptChanges: padRecords(window.MockOperations?.receiptChanges || [], 20, (index) => { const order = orders[index % orders.length]; return { id: `CHANGE-${String(index + 1).padStart(3, '0')}`, changeNo: `BG2026080503${String(index + 1).padStart(5, '0')}`, status: 'PENDING_AUDIT', customerName: order.customerName, canteen: order.canteen, orderNo: order.orderNo, items: order.items, createdAt: '2026-08-05 11:00:00' }; }),
      sortingProgress: padRecords(window.MockOperations?.sortingProgress || [], 20, (index) => { const order = orders[index % orders.length]; return { id: `PROGRESS-${String(index + 1).padStart(3, '0')}`, customerName: order.customerName, canteen: order.canteen, sortedCount: index % 3, orderCount: order.items.length, progress: `${index % 3}/${order.items.length}`, status: index % 3 ? 'PARTIAL' : 'PENDING', warehouse: order.warehouse, expectedAt: order.expectedAt, route: order.route }; }),
      shortageItems: padRecords(window.MockOperations?.shortageItems || [], 20, (index) => { const task = sortingTasks[index % sortingTasks.length]; return { ...clone(task), id: `SHORTAGE-${String(index + 1).padStart(3, '0')}`, shortage: '是', status: 'SHORTAGE', shortageQty: 1 }; }),
      sorters: padRecords(window.MockOperations?.sorters || [], 20, (index) => ({ id: `SORTER-${String(index + 1).padStart(3, '0')}`, sorterName: ['陈分拣', '李分拣', '王分拣', '赵分拣'][index % 4], username: ['chenfenjian', 'lifenjian', 'wangfenjian', 'zhaofen'] [index % 4], phone: `1380000${String(index + 300).padStart(4, '0')}`, warehouse: index % 2 ? '中心仓' : '北区仓', status: 'ENABLE' })),
      qualityReports: padRecords(window.MockOperations?.qualityReports || [], 20, (index) => { const product = products[index % products.length]; return { id: `QUALITY-${String(index + 1).padStart(3, '0')}`, inboundNo: `RKD2026080503${String(index + 1).padStart(5, '0')}`, goodsName: product.name, warehouse: index % 2 ? '中心仓' : '北区仓', status: index % 4 ? 'PASSED' : 'NOT_UPLOADED' }; }),
      inventoryCounts: padRecords(window.MockOperations?.inventoryCounts || [], 20, (index) => ({ id: `COUNT-DEMO-${String(index + 1).padStart(3, '0')}`, warehouse: '中心仓', countAt: '2026-08-04', status: 'COMPLETED' })),
      inventoryLosses: padRecords(window.MockOperations?.inventoryLosses || [], 20, (index) => { const product = products[index % products.length]; return { id: `LOSS-${String(index + 1).padStart(3, '0')}`, warehouse: index % 2 ? '中心仓' : '北区仓', status: 'PENDING_AUDIT', goodsName: product.name, productCode: product.code, quantity: 1, amount: number(product.marketPrice) }; }),
      openingInventory: padRecords(window.MockOperations?.openingInventory || [], 20, (index) => { const product = products[index % products.length]; return { id: `OPENING-${String(index + 1).padStart(3, '0')}`, warehouse: index % 2 ? '中心仓' : '北区仓', goodsName: product.name, goodsCode: product.code, openingQty: 100, openingPrice: number(product.marketPrice), openingAmount: 100 * number(product.marketPrice), status: 'COMPLETED' }; }),
      productSales: clone(window.MockOperations?.productSales || []),
      goodsProfitStatistics: clone(window.MockOperations?.goodsProfitStatistics || [])
    };
  }

  function ensure() {
    if (state) return state;
    const stored = window.AppStorage.read(storageKey, null);
    const previous = window.AppStorage.read(previousStorageKey, null);
    const legacyUnits = window.AppStorage.read('procurement-unit-measurements-v1', null);
    const legacyReviews = window.AppStorage.read('procurement-goods-reviews-v1', null);
    const legacyTemplates = window.AppStorage.read('procurement-processing-templates', null);
    clearLegacyBusinessStorage();
    const source = stored || previous;
    const hasValidProducts = Array.isArray(source?.products)
      && source.products.length > 0
      && source.products.every((product) => product && (product.code || product.id));
    const hasValidOrders = Array.isArray(source?.orders) && Array.isArray(source?.sortingTasks);
    if (source && hasValidProducts && hasValidOrders) {
      state = clone(source);
      if (!stored && previous && !window.AppStorage.read(backupStorageKey, null)) {
        window.AppStorage.write(backupStorageKey, previous);
      }
      if (!Array.isArray(state.units) && Array.isArray(legacyUnits)) state.units = clone(legacyUnits);
      if (!Array.isArray(state.goodsReviews) && Array.isArray(legacyReviews)) state.goodsReviews = clone(legacyReviews);
      if (!Array.isArray(state.processingTemplates) && Array.isArray(legacyTemplates)) state.processingTemplates = clone(legacyTemplates);
      const organizationNormalized = ensureOrganizationState(state);
      const migrated = migrateOutboundNumbers(state);
      const logsAdded = ensureDocumentOperationLogs(state);
      const receiptFieldsNormalized = normalizeReceiptAndSupplement(state);
      const dateTimesNormalized = normalizeStateDateTimes(state);
      const productMetadataNormalized = normalizeProductMetadata(state);
      const orderNumbersNormalized = normalizeOrderNumbers(state);
      const processingModuleReset = resetProcessingModuleData(state);
      const statisticsModuleReset = resetStatisticsData(state);
      const processingIdsNormalized = normalizeProcessingIds(state);
      const processingOutputsNormalized = normalizeProcessingOutputs(state);
      const contractsNormalized = normalizeStateContracts(state);
      const warehouseCodesNormalized = normalizeWarehouseCodes(state);
      const settingsNormalized = normalizeSettings(state);
      const decimalsNormalized = normalizeStateDecimals(state);
      if (source.version !== schemaVersion || organizationNormalized || migrated || logsAdded || receiptFieldsNormalized || dateTimesNormalized || productMetadataNormalized || orderNumbersNormalized || processingModuleReset || statisticsModuleReset || processingIdsNormalized || processingOutputsNormalized || contractsNormalized || warehouseCodesNormalized || settingsNormalized || decimalsNormalized) persist();
    }
    else {
      state = buildSeed();
      ensureOrganizationState(state);
      ensureDocumentOperationLogs(state);
      normalizeReceiptAndSupplement(state);
      normalizeStateDateTimes(state);
      normalizeProductMetadata(state);
      normalizeOrderNumbers(state);
      resetProcessingModuleData(state);
      resetStatisticsData(state);
      normalizeProcessingIds(state);
      normalizeProcessingOutputs(state);
      normalizeStateContracts(state);
      normalizeWarehouseCodes(state);
      normalizeSettings(state);
      normalizeStateDecimals(state);
      persist();
    }
    return state;
  }

  function persist() {
    state.version = schemaVersion;
    if (!window.AppStorage.write(storageKey, state)) {
      const error = new Error('本地数据保存失败，请检查浏览器存储空间');
      error.code = 'STORAGE_WRITE_FAILED';
      throw error;
    }
  }

  function aggregateInventory(resource) {
    const current = ensure();
    const grouped = new Map();
    current.inventoryLedger.forEach((entry) => {
      const key = `${entry.productId}|${entry.warehouse || ''}`;
      const item = grouped.get(key) || {
        id: key,
        goodsCode: entry.productId,
        productId: entry.productId,
        goodsName: current.products.find((product) => product.id === entry.productId)?.name || entry.productId,
        category: current.products.find((product) => product.id === entry.productId)?.category || '',
        warehouse: entry.warehouse || '',
        unit: entry.unit || '',
        currentStock: 0,
        reservedStock: 0,
        pendingOutbound: 0,
        averageCost: 0,
        totalAmount: 0
      };
      if (entry.type === 'RESERVE') item.reservedStock += number(entry.qty);
      else if (entry.type === 'RELEASE') item.reservedStock -= number(entry.qty);
      else if (entry.type === 'PENDING_OUTBOUND') item.pendingOutbound += number(entry.qty);
      else if (entry.type === 'PENDING_OUTBOUND_RELEASE') item.pendingOutbound -= number(entry.qty);
      else if (entry.type === 'OUTBOUND') item.currentStock -= number(entry.qty);
      else item.currentStock += number(entry.qty);
      item.totalAmount += number(entry.amount || entry.qty * entry.unitPrice);
      grouped.set(key, item);
    });
    const values = [...grouped.values()].map((item) => ({
      ...item,
      reservedStock: Math.max(item.reservedStock, 0),
      availableStock: item.currentStock - Math.max(item.reservedStock, 0) - item.pendingOutbound,
      averageCost: item.currentStock ? item.totalAmount / item.currentStock : 0
    }));
    if (resource === 'inventoryDetails') {
      return current.inventoryLedger.map((entry) => ({
        ...clone(entry),
        goodsCode: entry.productId,
        goodsName: current.products.find((product) => product.id === entry.productId)?.name || entry.productId,
        documentType: entry.type,
        relationNo: entry.orderId || '--',
        occurredAt: entry.occurredAt,
        occurredQty: entry.type === 'OUTBOUND' ? -number(entry.qty) : number(entry.qty),
        balance: values.find((item) => item.productId === entry.productId && item.warehouse === entry.warehouse)?.currentStock || 0
      }));
    }
    return values;
  }

  window.DemoStore = {
    version: schemaVersion,
    get(resource) {
      const current = ensure();
      if (resource === 'inventoryBalance' || resource === 'inventoryDetails') return clone(aggregateInventory(resource));
      const key = resource === 'sortingItems' ? 'sortingTasks' : resource;
      return clone(current[key] || []);
    },
    replace(resource, value) {
      ensure();
      const key = resource === 'sortingItems' ? 'sortingTasks' : resource;
      state[key] = clone(value);
      normalizeStateDecimals(state);
      persist();
      return clone(state[key]);
    },
    transact(mutator) {
      ensure();
      const result = mutator(state);
      normalizeStateDecimals(state);
      persist();
      return result === undefined ? undefined : clone(result);
    },
    getSettings() { return clone(ensure().settings); },
    updateSettings(values) {
      ensure();
      state.settings = { ...state.settings, ...clone(values) };
      normalizeSettings(state);
      normalizeStateDecimals(state);
      persist();
      return clone(state.settings);
    },
    getSession() { return clone(ensure().session); },
    setSession(session) {
      ensure();
      state.session = clone(session);
      persist();
      return clone(state.session);
    },
    reset() {
      state = buildSeed();
      normalizeStateContracts(state);
      normalizeWarehouseCodes(state);
      normalizeSettings(state);
      normalizeStateDecimals(state);
      persist();
      return clone(state);
    },
    snapshot() { return clone(ensure()); },
    export() { return JSON.stringify(ensure(), null, 2); },
    import(value) {
      const parsed = typeof value === 'string' ? JSON.parse(value) : clone(value);
      if (!parsed || !Array.isArray(parsed.products) || !Array.isArray(parsed.orders)) {
        const error = new Error('导入数据格式不正确');
        error.code = 'INVALID_IMPORT_DATA';
        throw error;
      }
      state = parsed;
      ensureOrganizationState(state);
      normalizeOrderNumbers(state);
      normalizeProcessingIds(state);
      normalizeStateContracts(state);
      normalizeSettings(state);
      normalizeStateDecimals(state);
      persist();
      return clone(state);
    }
  };
})();

(function () {
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function nextId(prefix, items) {
    const max = items.reduce((value, item) => Math.max(value, Number(String(item.id || '').replace(/\D/g, '')) || 0), 0);
    return `${prefix}-${String(max + 1).padStart(3, '0')}`;
  }

  window.MasterDataService = {
    listCustomers(condition = {}) {
      const customers = window.DemoStore.get('customers');
      return customers.filter((customer) => Object.entries(condition).every(([key, value]) => !value || String(customer[key] || '').includes(String(value))));
    },
    getCustomer(id) {
      return window.DemoStore.get('customers').find((customer) => customer.id === id || customer.customerId === id) || null;
    },
    getLocations(customerId) {
      return window.DemoStore.get('customerLocations').filter((location) => !customerId || location.customerId === customerId);
    },
    createCustomer(data) {
      return window.DemoStore.transact((state) => {
        const customerId = nextId('CUS', state.customers);
        const customer = {
          ...clone(data),
          id: customerId,
          customerId,
          customerCode: data.customerCode || `CUS${String(state.customers.length + 1).padStart(3, '0')}`,
          status: data.status || 'ENABLE',
          createdAt: window.BusinessRules.now(data.createdAt || new Date())
        };
        state.customers.unshift(customer);
        return customer;
      });
    },
    updateCustomer(id, data) {
      return window.DemoStore.transact((state) => {
        const customer = state.customers.find((item) => item.id === id || item.customerId === id);
        if (!customer) return null;
        Object.assign(customer, clone(data), { id: customer.id, customerId: customer.customerId });
        return customer;
      });
    }
  };
})();

(function () {
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const number = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const now = () => window.BusinessRules.now();

  function nextOutboundNumber(records, record = {}) {
    const dateSource = record.outboundTime || record.shippingAt || record.createdAt || now();
    const datePart = String(dateSource).slice(0, 10).replace(/-/g, '') || now().slice(0, 10).replace(/-/g, '');
    const prefix = `CKD${datePart}03`;
    let sequence = records.filter((item) => String(item.id || '').startsWith(prefix)).length + 1;
    let candidate = `${prefix}${String(sequence).padStart(5, '0')}`;
    while (records.some((item) => item.id === candidate || item.outboundOrderId === candidate)) {
      sequence += 1;
      candidate = `${prefix}${String(sequence).padStart(5, '0')}`;
    }
    return candidate;
  }

  function nextOrderNumber(state, data, createdAt) {
    const customers = state.customers || [];
    const customer = customers.find((item) => (
      (data.customerId && (item.id === data.customerId || item.customerId === data.customerId))
      || (data.customerName && item.customerName === data.customerName)
    ));
    const customerCode = window.BusinessRules.businessCode(
      data.customerCode || customer?.customerCode || '03',
      '03'
    );
    return window.BusinessRules.documentNumber('orders', {
      date: createdAt || now(),
      businessCode: customerCode,
      records: state.orders,
      fields: ['orderNo']
    });
  }

  function appendLedger(state, entry) {
    state.inventoryLedger.push({
      id: entry.id || `LEDGER-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: entry.type,
      productId: entry.productId,
      warehouse: entry.warehouse || '中心仓',
      qty: number(entry.qty),
      unit: entry.unit || '',
      unitPrice: number(entry.unitPrice),
      amount: number(entry.amount || number(entry.qty) * number(entry.unitPrice)),
      orderId: entry.orderId || '',
      orderLineId: entry.orderLineId || '',
      occurredAt: entry.occurredAt || now(),
      remark: entry.remark || ''
    });
  }

  function balanceFor(productId, warehouse) {
    const rows = window.DemoStore.get('inventoryBalance');
    return rows.find((row) => row.productId === productId && (!warehouse || row.warehouse === warehouse)) || {
      productId,
      warehouse: warehouse || '中心仓',
      currentStock: 0,
      reservedStock: 0,
      pendingOutbound: 0,
      availableStock: 0
    };
  }

  window.InventoryLedgerService = {
    getBalance(productId, warehouse) {
      return clone(balanceFor(productId, warehouse));
    },
    getAvailableQty(productId, warehouse) {
      return number(balanceFor(productId, warehouse).availableStock);
    },
    append(entry) {
      return window.DemoStore.transact((state) => {
        appendLedger(state, entry);
        return state.inventoryLedger[state.inventoryLedger.length - 1];
      });
    },
    reserve({ productId, warehouse, qty, unit, unitPrice, orderId, orderLineId, remark }) {
      const quantity = number(qty);
      if (quantity <= 0) return null;
      return this.append({ type: 'RESERVE', productId, warehouse, qty: quantity, unit, unitPrice, orderId, orderLineId, remark });
    },
    release({ productId, warehouse, qty, unit, unitPrice, orderId, orderLineId, remark }) {
      const quantity = number(qty);
      if (quantity <= 0) return null;
      return this.append({ type: 'RELEASE', productId, warehouse, qty: quantity, unit, unitPrice, orderId, orderLineId, remark });
    },
    inbound({ productId, warehouse, qty, unit, unitPrice, orderId, orderLineId, remark }) {
      const quantity = number(qty);
      if (quantity <= 0) return null;
      return this.append({ type: 'INBOUND', productId, warehouse, qty: quantity, unit, unitPrice, orderId, orderLineId, remark });
    },
    outbound({ productId, warehouse, qty, unit, unitPrice, orderId, orderLineId, remark }) {
      const quantity = number(qty);
      if (quantity <= 0) return null;
      return this.append({ type: 'OUTBOUND', productId, warehouse, qty: quantity, unit, unitPrice, orderId, orderLineId, remark });
    },
    pendingOutbound({ productId, warehouse, qty, unit, unitPrice, orderId, orderLineId, remark }) {
      const quantity = number(qty);
      if (quantity <= 0) return null;
      return this.append({ type: 'PENDING_OUTBOUND', productId, warehouse, qty: quantity, unit, unitPrice, orderId, orderLineId, remark });
    },
    releasePendingOutbound({ productId, warehouse, qty, unit, unitPrice, orderId, orderLineId, remark }) {
      const quantity = number(qty);
      if (quantity <= 0) return null;
      return this.append({ type: 'PENDING_OUTBOUND_RELEASE', productId, warehouse, qty: quantity, unit, unitPrice, orderId, orderLineId, remark });
    },
    opening({ productId, warehouse, qty, unit, unitPrice, orderId, orderLineId, remark }) {
      const quantity = number(qty);
      if (quantity <= 0) return null;
      return this.append({ type: 'OPENING', productId, warehouse, qty: quantity, unit, unitPrice, orderId, orderLineId, remark });
    },
    adjust({ productId, warehouse, qty, unit, unitPrice, orderId, orderLineId, remark }) {
      const quantity = number(qty);
      if (quantity === 0) return null;
      return this.append({ type: 'ADJUST', productId, warehouse, qty: quantity, unit, unitPrice, orderId, orderLineId, remark });
    }
  };

  function getOrder(state, orderId) {
    return state.orders.find((order) => order.id === orderId || order.orderId === orderId) || null;
  }

  function getTask(state, taskId) {
    return state.sortingTasks.find((task) => task.id === taskId || task.sortingTaskId === taskId) || null;
  }

  function taskList(state, orderId) {
    return state.sortingTasks.filter((task) => task.orderId === orderId);
  }

  function syncProgress(state, order) {
    if (!order?.customerName || !order.canteen) return;
    const tasks = taskList(state, order.id);
    let progress = state.sortingProgress.find((item) => item.customerName === order.customerName && item.canteen === order.canteen && item.expectedAt === order.expectedAt);
    if (!progress) {
      progress = {
        id: `PROGRESS-${order.id}`,
        customerId: order.customerId || '',
        customerName: order.customerName,
        canteen: order.canteen,
        receiver: order.receiver || '',
        phone: order.phone || '',
        address: order.address || '',
        route: order.route || '',
        expectedAt: order.expectedAt || '',
        sortedCount: 0,
        orderCount: tasks.length,
        progress: `0/${tasks.length}`,
        status: 'PENDING'
      };
      state.sortingProgress.unshift(progress);
    }
    const location = (state.customerLocations || []).find((item) => (
      item.customerId === order.customerId && item.canteen === order.canteen
    )) || (state.customerLocations || []).find((item) => (
      item.customerName === order.customerName && item.canteen === order.canteen
    ));
    progress.receiver = order.receiver || progress.receiver || location?.receiver || '';
    progress.phone = order.phone || progress.phone || location?.phone || '';
    progress.address = order.address || progress.address || location?.address || '';
    progress.route = order.route || progress.route || location?.route || '';
    const sortedCount = tasks.filter((task) => task.sortingCompleted).length;
    progress.sortedCount = sortedCount;
    progress.orderCount = tasks.length;
    progress.progress = `${sortedCount}/${tasks.length}`;
    progress.status = sortedCount === 0 ? 'PENDING' : sortedCount === tasks.length ? 'SORTED' : 'PARTIAL';
  }

  function syncShortage(state, task) {
    const index = state.shortageItems.findIndex((item) => item.id === task.id || (item.orderId === task.orderId && item.orderLineId === task.orderLineId));
    if (task.shortage === '是') {
      const record = {
        ...clone(task),
        id: task.id,
        orderId: task.orderId,
        orderLineId: task.orderLineId,
        shortageQty: Math.max(number(task.orderQty) - number(task.actualQty), 0),
        status: 'SHORTAGE'
      };
      if (index >= 0) state.shortageItems[index] = record;
      else state.shortageItems.unshift(record);
    } else if (index >= 0) state.shortageItems.splice(index, 1);
  }

  function syncOrder(state, orderId) {
    const order = getOrder(state, orderId);
    if (!order) return null;
    const tasks = taskList(state, orderId);
    order.sortingCompleted = tasks.length > 0 && tasks.every((task) => task.sortingCompleted);
    order.items = order.items.map((line) => {
      const task = tasks.find((item) => item.orderLineId === line.orderLineId);
      return task ? { ...line, actualQty: number(task.actualQty), sortingStatus: task.status, shortageQty: number(task.shortageQty) } : line;
    });
    order.orderLines = order.items;
    syncProgress(state, order);
    if (order.status !== 'SHIPPED' && order.status !== 'CLOSED' && order.status !== 'REJECTED') {
      if (order.sortingCompleted) order.status = 'READY_FOR_SHIPPING';
    }
    const shipping = state.shippingOrders.find((item) => item.orderId === orderId);
    if (shipping) {
      shipping.sortingStatus = order.sortingCompleted ? 'SORTED' : 'PENDING';
      shipping.items = tasks.map((task) => ({ ...clone(task), shippingQty: number(task.actualQty) }));
    }
    return order;
  }

  function createSortingTasks(state, order) {
    const existing = state.sortingTasks.filter((task) => task.orderId !== order.id);
    const tasks = order.items.map((line, index) => ({
      id: `SORT-${order.id}-${String(index + 1).padStart(3, '0')}`,
      sortingTaskId: `SORT-${order.id}-${String(index + 1).padStart(3, '0')}`,
      orderId: order.id,
      orderLineId: line.orderLineId,
      productId: line.productId || line.goodsCode || '',
      goodsCode: line.productId || line.goodsCode || '',
      goodsName: line.goodsName || '',
      isNetVegetable: line.isNetVegetable === true,
      customerId: order.customerId || '',
      customerName: order.customerName || '',
      canteen: order.canteen || '',
      orderNo: order.orderNo || '',
      orderQty: number(line.quantity),
      actualQty: 0,
      unit: line.unit || '',
      warehouse: order.warehouse || '中心仓',
      route: order.route || '',
      expectedAt: order.expectedAt || '',
      status: 'PENDING',
      sortingCompleted: false,
      shortage: '否',
      shortageQty: 0,
      progress: `0/${number(line.quantity)}`,
      sorter: '',
      sortingAt: '',
      operationLogs: [{ action: '创建', operator: order.creator || '系统', createdAt: now(), desc: `${order.creator || '系统'} 创建分拣任务` }]
    }));
    state.sortingTasks = [...tasks, ...existing];
  }

  function createShippingOrder(state, order) {
    const existing = state.shippingOrders.find((item) => item.orderId === order.id);
    if (existing) return existing;
    const location = (state.customerLocations || []).find((item) => (
      item.customerId === order.customerId && item.canteen === order.canteen
    )) || (state.customerLocations || []).find((item) => (
      item.customerName === order.customerName && item.canteen === order.canteen
    ));
    const created = {
      id: `SHIP-${order.id}`,
      shippingOrderId: `SHIP-${order.id}`,
      orderId: order.id,
      orderNo: order.orderNo,
      customerId: order.customerId || '',
      customerName: order.customerName,
      canteen: order.canteen,
      receiver: order.receiver || location?.receiver || '',
      phone: order.phone || location?.phone || '',
      address: order.address || location?.address || '',
      route: order.route || location?.route || '',
      warehouse: order.warehouse || '中心仓',
      shippingAmount: 0,
      sortingStatus: 'PENDING',
      status: 'PENDING',
      printed: '否',
      expectedAt: order.expectedAt || '',
      orderTag: order.orderTag || '',
      creator: order.creator || '系统',
      createdAt: now(),
      operationLogs: [{ action: '创建', operator: order.creator || '系统', createdAt: now(), desc: `${order.creator || '系统'} 创建发货单` }],
      items: []
    };
    state.shippingOrders.unshift(created);
    return created;
  }

  function createOutbound(state, order, status) {
    const existing = state.outboundOrders.find((item) => item.orderId === order.id);
    if (existing) return existing;
    const tasks = taskList(state, order.id);
    const outboundTime = order.shippingAt || now();
    const outboundId = nextOutboundNumber(state.outboundOrders, {
      outboundTime,
      customerCode: order.customerCode || '03'
    });
    const items = tasks.map((task) => {
      const line = order.items.find((item) => item.orderLineId === task.orderLineId) || {};
      return {
        orderId: order.id,
        orderLineId: task.orderLineId,
        productId: task.productId,
        productCode: task.productId,
        productName: task.goodsName,
        unit: task.unit,
        outboundQty: number(task.actualQty),
        currentStock: number(window.InventoryLedgerService.getBalance(task.productId, task.warehouse).currentStock),
        unitPrice: number(line.unitPrice),
        amount: number(task.actualQty) * number(line.unitPrice)
      };
    });
    const created = {
      id: outboundId,
      outboundOrderId: outboundId,
      orderId: order.id,
      orderNo: order.orderNo,
      relNo: order.orderNo,
      warehouse: order.warehouse || '中心仓',
      warehouseName: order.warehouse || '中心仓',
      outboundType: '销售出库',
      customerId: order.customerId || '',
      customerName: order.customerName || '',
      supplierPurchaserCustomerName: order.customerName || '',
      canteen: order.canteen || '',
      customerCode: order.customerCode || '03',
      status: window.BusinessRules.normalizeStatus('outboundOrders', status),
      outboundTime,
      outboundAmt: window.BusinessRules.totalAmount(items, ['outboundQty']),
      creator: order.creator || '管理员',
      operationLogs: [{ action: '创建', operator: order.creator || '系统', createdAt: outboundTime, desc: `${order.creator || '系统'} 创建出库单` }],
      items
    };
    state.outboundOrders.unshift(created);
    return created;
  }

  function createOrderLogs(order, createdAt, creator) {
    const existing = Array.isArray(order.operationLogs) ? clone(order.operationLogs).filter((log) => log && (log.action || log.desc)) : [];
    return existing.length ? existing : [{ action: '创建订单', desc: `${creator} 创建订单 ${createdAt}` }];
  }

  function appendOperationLog(record, action, operator = '当前用户', desc = '') {
    if (!record) return;
    if (!Array.isArray(record.operationLogs)) record.operationLogs = [];
    const occurredAt = now();
    record.operationLogs.push({
      action,
      operator,
      createdAt: occurredAt,
      desc: desc || `${operator} ${action} ${occurredAt}`
    });
  }

  function completeOutbound(outbound) {
    if (outbound.completedAt) return outbound;
    outbound.status = 'COMPLETED';
    outbound.auditAt = now();
    outbound.completedAt = now();
    (outbound.items || []).forEach((item) => {
      const qty = number(item.outboundQty || item.quantity);
      if (qty <= 0) return;
      window.InventoryLedgerService.releasePendingOutbound({ productId: item.productId || item.productCode, warehouse: outbound.warehouseName || outbound.warehouse, qty, unit: item.unit, unitPrice: item.unitPrice, orderId: outbound.orderId || '', orderLineId: item.orderLineId || '', remark: '出库完成释放待出库占用' });
      window.InventoryLedgerService.outbound({ productId: item.productId || item.productCode, warehouse: outbound.warehouseName || outbound.warehouse, qty, unit: item.unit, unitPrice: item.unitPrice, orderId: outbound.orderId || '', orderLineId: item.orderLineId || '', remark: '出库完成扣减库存' });
    });
    return outbound;
  }

  function transitionSorting(state, taskId, action, payload = {}) {
    const task = getTask(state, taskId);
    if (!task) throw new Error('分拣任务不存在');
    const order = getOrder(state, task.orderId);
    if (!order) throw new Error('关联订单不存在');
    if (action === 'sort') {
      if (!['READY_FOR_SORTING', 'READY_FOR_SHIPPING'].includes(order.status)) {
        const error = new Error('订单尚未完成供货确认或审核，暂不能分拣');
        error.code = 'ORDER_NOT_READY_FOR_SORTING';
        throw error;
      }
      const actualQty = Math.max(0, number(payload.actualQty ?? task.orderQty));
      const oldQty = task.sortingCompleted ? number(task.actualQty) : 0;
      if (task.sortingCompleted && actualQty === oldQty) return task;
      const available = window.InventoryLedgerService.getAvailableQty(task.productId, task.warehouse) + oldQty;
      const settings = window.DemoStore.getSettings();
      if (settings.sortingInventoryThresholdEnabled && actualQty > available) {
        const error = new Error(`库存不足，可用库存为${available}${task.unit || ''}`);
        error.code = 'INVENTORY_SHORTAGE';
        throw error;
      }
      if (oldQty > 0) window.InventoryLedgerService.release({ productId: task.productId, warehouse: task.warehouse, qty: oldQty, unit: task.unit, orderId: task.orderId, orderLineId: task.orderLineId, remark: '重新分拣释放原预占' });
      if (actualQty > 0) window.InventoryLedgerService.reserve({ productId: task.productId, warehouse: task.warehouse, qty: actualQty, unit: task.unit, orderId: task.orderId, orderLineId: task.orderLineId, remark: '订单分拣预占' });
      task.actualQty = actualQty;
      task.status = 'SORTED';
      task.sortingCompleted = true;
      task.shortage = actualQty < number(task.orderQty) ? '是' : '否';
      task.shortageQty = Math.max(number(task.orderQty) - actualQty, 0);
      task.progress = `${actualQty}/${number(task.orderQty)}`;
      task.sorter = payload.sorter || task.sorter || '当前用户';
      task.sortingAt = now();
    } else if (action === 'resetSort') {
      if (task.sortingCompleted && number(task.actualQty) > 0) window.InventoryLedgerService.release({ productId: task.productId, warehouse: task.warehouse, qty: task.actualQty, unit: task.unit, orderId: task.orderId, orderLineId: task.orderLineId, remark: '重置分拣释放预占' });
      task.actualQty = 0;
      task.status = 'PENDING';
      task.sortingCompleted = false;
      task.shortage = '否';
      task.shortageQty = 0;
      task.progress = `0/${number(task.orderQty)}`;
      task.sorter = '';
      task.sortingAt = '';
    } else if (action === 'markShortage') {
      task.shortage = '是';
      task.shortageQty = Math.max(number(task.orderQty) - number(task.actualQty), 0);
    } else if (action === 'cancelShortage') {
      task.shortage = '否';
      task.shortageQty = 0;
    }
    appendOperationLog(task, action === 'sort' ? '完成分拣' : action === 'resetSort' ? '重置分拣' : action === 'markShortage' ? '标记短缺' : '取消短缺', task.sorter || '当前用户');
    syncShortage(state, task);
    syncOrder(state, task.orderId);
    return task;
  }

  window.OrderFlowService = {
    createOrder(data) {
      return window.DemoStore.transact((state) => {
        const sourceType = data.sourceType || (data.source === '客户下单' ? 'CUSTOMER' : 'ENTERPRISE');
        const orderId = data.orderId || `ORD-${Date.now()}`;
        const settings = state.settings;
        const requestedStatus = data.status === 'DRAFT' ? 'DRAFT' : null;
        const status = requestedStatus || (sourceType === 'CUSTOMER'
          ? 'PENDING_CONFIRM'
          : settings.enterpriseOrderAuditEnabled ? 'PENDING_AUDIT' : 'READY_FOR_SHIPPING');
        const createdAt = data.createdAt || now();
        const customer = (state.customers || []).find((item) => (
          (data.customerId && (item.id === data.customerId || item.customerId === data.customerId))
          || (data.customerName && item.customerName === data.customerName)
        ));
        const customerCode = window.BusinessRules.businessCode(
          data.customerCode || customer?.customerCode || '03',
          '03'
        );
        const items = (data.items || []).map((item, index) => ({
          ...clone(item),
          id: `${orderId}-LINE-${String(index + 1).padStart(3, '0')}`,
          orderLineId: `${orderId}-LINE-${String(index + 1).padStart(3, '0')}`,
          orderId,
          productId: item.productId || item.goodsCode || item.productCode || '',
          goodsCode: item.productId || item.goodsCode || item.productCode || '',
          quantity: number(item.quantity),
          orderQty: number(item.quantity),
          subtotal: number(item.subtotal || number(item.quantity) * number(item.unitPrice))
        }));
        const order = {
          ...clone(data),
          id: orderId,
          orderId,
          orderNo: data.orderNo || nextOrderNumber(state, data, createdAt),
          customerCode,
          sourceType,
          status,
          items,
          orderLines: items,
          productCount: items.length,
          receiptStatus: '未收货',
          receivedAt: '',
          supplement: '否',
          createdAt,
          createTime: createdAt,
          creator: data.creator || '管理员',
          operationLogs: createOrderLogs(data, data.createdAt || now(), data.creator || '管理员'),
          updatedAt: now()
        };
        state.orders.unshift(order);
        state.orderLines = [...items, ...state.orderLines];
        createSortingTasks(state, order);
        createShippingOrder(state, order);
        syncOrder(state, order.id);
        return order;
      });
    },
    updateOrder(orderId, data) {
      return window.DemoStore.transact((state) => {
        const order = getOrder(state, orderId);
        if (!order) return null;
        const updates = clone(data);
        if (updates.status === 'PENDING' && !['PENDING_CONFIRM', 'PENDING_AUDIT'].includes(order.status)) delete updates.status;
        Object.assign(order, updates, { id: order.id, orderId: order.id, updatedAt: now() });
        if (Array.isArray(data.items)) {
          order.items = data.items.map((item, index) => ({
            ...clone(item),
            id: item.orderLineId || `${order.id}-LINE-${String(index + 1).padStart(3, '0')}`,
            orderLineId: item.orderLineId || `${order.id}-LINE-${String(index + 1).padStart(3, '0')}`,
            orderId: order.id,
            productId: item.productId || item.goodsCode || item.productCode || '',
            quantity: number(item.quantity),
            orderQty: number(item.quantity)
          }));
          state.orderLines = [...state.orderLines.filter((line) => line.orderId !== order.id), ...order.items];
          createSortingTasks(state, order);
        }
        syncOrder(state, order.id);
        return order;
      });
    },
    removeOrder(orderId) {
      return window.DemoStore.transact((state) => {
        const order = getOrder(state, orderId);
        if (!order) throw new Error('订单不存在或已删除');
        if (['SHIPPED', 'CLOSED'].includes(order.status)) {
          const error = new Error('已发货或已关闭订单不能删除');
          error.code = 'ORDER_NOT_DELETABLE';
          throw error;
        }
        const tasks = taskList(state, order.id);
        tasks.forEach((task) => {
          if (task.sortingCompleted && number(task.actualQty) > 0) {
            window.InventoryLedgerService.release({
              productId: task.productId,
              warehouse: task.warehouse,
              qty: task.actualQty,
              unit: task.unit,
              orderId: task.orderId,
              orderLineId: task.orderLineId,
              remark: '删除订单释放分拣预占'
            });
          }
        });
        state.orders = state.orders.filter((item) => item.id !== order.id);
        state.orderLines = state.orderLines.filter((item) => item.orderId !== order.id);
        state.sortingTasks = state.sortingTasks.filter((item) => item.orderId !== order.id);
        state.shippingOrders = state.shippingOrders.filter((item) => item.orderId !== order.id);
        state.outboundOrders = state.outboundOrders.filter((item) => item.orderId !== order.id);
        state.shortageItems = state.shortageItems.filter((item) => item.orderId !== order.id);
        state.sortingProgress = state.sortingProgress.filter((item) => item.id !== `PROGRESS-${order.id}`);
        return order;
      });
    },
    transition(resource, id, action, payload = {}) {
      return window.DemoStore.transact((state) => {
        if (resource === 'sortingItems') return transitionSorting(state, id, action, payload);
        if (resource === 'sortingProgress') {
          const progress = state.sortingProgress.find((item) => item.id === id);
          if (!progress) throw new Error('分拣客户记录不存在');
          state.sortingTasks.filter((task) => task.customerName === progress.customerName && task.canteen === progress.canteen).forEach((task) => transitionSorting(state, task.id, action, payload));
          return progress;
        }
        if (resource === 'orders') {
          const order = getOrder(state, id);
          if (!order) throw new Error('订单不存在');
          if (action === 'approve') {
            if (order.status !== 'PENDING_AUDIT') throw new Error('当前订单不在待审核状态');
            order.status = 'READY_FOR_SORTING';
            order.auditor = '当前用户';
            order.auditAt = now();
            appendOperationLog(order, '审核通过', order.auditor);
          } else if (action === 'confirm') {
            if (order.status !== 'PENDING_CONFIRM') throw new Error('当前订单不在待确认状态');
            order.status = 'READY_FOR_SORTING';
            order.confirmedAt = now();
            appendOperationLog(order, '确认供货', '当前用户');
          } else if (action === 'close') {
            order.status = 'CLOSED';
            appendOperationLog(order, '关闭订单', '当前用户');
          }
          else if (action === 'reject') {
            if (!['PENDING_CONFIRM', 'PENDING_AUDIT'].includes(order.status)) throw new Error('当前订单不能驳回');
            order.status = 'REJECTED';
            appendOperationLog(order, '驳回订单', '当前用户');
          }
          syncOrder(state, order.id);
          return order;
        }
        if (resource === 'shippingOrders' && action === 'ship') {
          const shipping = state.shippingOrders.find((item) => item.id === id || item.shippingOrderId === id);
          if (!shipping) throw new Error('发货单不存在');
          if (shipping.status === 'SHIPPED') return shipping;
          const tasks = taskList(state, shipping.orderId);
          if (!tasks.length || !tasks.every((task) => task.sortingCompleted)) {
            const error = new Error('请先完成订单全部明细的分拣操作');
            error.code = 'SORTING_REQUIRED';
            throw error;
          }
          const order = getOrder(state, shipping.orderId);
          let shippingAmount = 0;
          tasks.forEach((task) => {
            const line = order.items.find((item) => item.orderLineId === task.orderLineId);
            if (line) {
              line.shippedQty = number(task.actualQty);
              line.shippedAmount = number(task.actualQty) * number(line.unitPrice);
              shippingAmount += line.shippedAmount;
            }
            if (number(task.actualQty) > 0) window.InventoryLedgerService.release({ productId: task.productId, warehouse: task.warehouse, qty: task.actualQty, unit: task.unit, orderId: task.orderId, orderLineId: task.orderLineId, remark: '发货释放分拣预占' });
            if (number(task.actualQty) > 0) window.InventoryLedgerService.pendingOutbound({ productId: task.productId, warehouse: task.warehouse, qty: task.actualQty, unit: task.unit, orderId: task.orderId, orderLineId: task.orderLineId, remark: '发货后待出库占用' });
          });
          shipping.status = 'SHIPPED';
          shipping.sortingStatus = 'SORTED';
          shipping.shippingAmount = Number(shippingAmount.toFixed(2));
          shipping.items = tasks.map((task) => ({ ...clone(task), shippingQty: number(task.actualQty) }));
          order.status = 'SHIPPED';
          order.shippingAmount = Number(shippingAmount.toFixed(2));
          order.shippingAt = now();
          appendOperationLog(shipping, '完成发货', order.creator || '当前用户');
          appendOperationLog(order, '完成发货', order.creator || '当前用户');
          const outboundStatus = state.settings.outboundAuditEnabled ? 'PENDING_AUDIT' : 'COMPLETED';
          const outbound = createOutbound(state, order, outboundStatus);
          if (!state.settings.outboundAuditEnabled) completeOutbound(outbound);
          return shipping;
        }
        if (resource === 'outboundOrders' && (action === 'complete' || action === 'approve' || action === 'audit')) {
          const outbound = state.outboundOrders.find((item) => item.id === id || item.outboundOrderId === id);
          if (!outbound) throw new Error('出库单不存在');
          if (outbound.completedAt) return outbound;
          completeOutbound(outbound);
          appendOperationLog(outbound, '完成出库', '当前用户');
          return outbound;
        }
        throw new Error('不支持的业务操作');
      });
    },
    getProcessingDemand() {
      const snapshot = window.DemoStore.snapshot();
      return snapshot.sortingTasks.filter((task) => task.isNetVegetable && task.sortingCompleted).map((task) => ({
        ...clone(task),
        processingQty: number(task.actualQty),
        orderSortingQty: number(task.actualQty),
        remainingQty: Math.max(number(task.actualQty) - number(task.processedQty), 0)
      }));
    },
    resetDemo() { return window.DemoStore.reset(); }
  };
})();
