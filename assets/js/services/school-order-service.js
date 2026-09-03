(function () {
  const RESOURCE = 'schoolOrders';
  const META_RESOURCE = 'schoolOrdersMeta';
  const SCHOOL_NAME = '静安第一中学';
  const SUPPLIER_NAME = '产品部学校食材集采供应链有限公司';
  const CANTEEN_NAME = '第一食堂';
  const DEFAULT_TAG = '其他-不区分';
  const SEED_VERSION = 'school-order-seed-v4';
  let memoryOrders = null;

  const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
  const number = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const money = (value) => Number(number(value).toFixed(2));
  const timestamp = () => window.BusinessRules?.now?.()
    || new Date().toISOString().slice(0, 19).replace('T', ' ');
  const currentOperator = () => window.DemoStore?.getSession?.()?.displayName || '杨';
  const datePart = (value) => String(value || timestamp()).slice(0, 10).replace(/-/g, '');
  const displayName = (name, unit, brand = '--', spec = '--') => `${name}（${unit || '--'}/${brand || '--'}/${spec || '--'}）`;

  function makeLine({
    id, name, unit, brand = '--', spec = '--', productCode = '', isNetVegetable = false, orderPrice = 0,
    orderQty = 0, shippedQty = 0, acceptedQty = null, returnQty = null,
    reconciledQty = null, traceCode = '', qualityReport = '1', remark = '--',
    productionDate = '', agreementPrice = '', recentSalePrice = orderPrice,
    marketPrice = orderPrice
  }) {
    const qty = number(orderQty);
    const shipped = number(shippedQty);
    const price = money(orderPrice);
    const accepted = acceptedQty == null ? null : number(acceptedQty);
    const returned = returnQty == null ? null : number(returnQty);
    const reconciled = reconciledQty == null ? null : number(reconciledQty);
    return {
      id: id || `SOL-${Math.random().toString(36).slice(2, 9)}`,
      productCode,
      isNetVegetable: Boolean(isNetVegetable),
      productName: name,
      goodsName: name,
      unit: unit || '--',
      brand: brand || '--',
      spec: spec || '--',
      displayName: displayName(name, unit, brand, spec),
      qualityReport: qualityReport || '',
      orderPrice: price,
      orderQty: qty,
      orderSubtotal: money(qty * price),
      shippedQty: shipped,
      shippedSubtotal: money(shipped * price),
      acceptedQty: accepted,
      acceptedSubtotal: accepted == null ? null : money(accepted * price),
      returnQty: returned,
      returnSubtotal: returned == null ? null : money(returned * price),
      reconciledQty: reconciled,
      reconciledSubtotal: reconciled == null ? null : money(reconciled * price),
      traceCode: traceCode || '',
      remark: remark ?? '--',
      productionDate: productionDate || '',
      inspectionImages: [],
      inspectionVideos: [],
      agreementPrice: agreementPrice === '' ? '' : money(agreementPrice),
      recentSalePrice: recentSalePrice === '' ? '' : money(recentSalePrice),
      marketPrice: marketPrice === '' ? '' : money(marketPrice)
    };
  }

  function makeSeed() {
    const supplier = SUPPLIER_NAME;
    const common = {
      customerName: SCHOOL_NAME,
      supplierName: supplier,
      canteen: CANTEEN_NAME,
      orderTag: DEFAULT_TAG,
      supplement: '否',
      source: '平台下单',
      receiptStatus: '未收货',
      remark: '--'
    };
    const makeOrder = ({
      id, orderNo, createdAt, expectedAt, status = '待发货', supplierName = supplier,
      canteen = CANTEEN_NAME, orderTag = DEFAULT_TAG, source = '平台下单', driver = '',
      creator = '杨', items = [], shipped = false, shippingAt = ''
    }) => {
      const lines = items.map((line, index) => makeLine({ id: `${id}-ITEM-${index + 1}`, ...line }));
      const orderAmount = money(lines.reduce((sum, line) => sum + line.orderSubtotal, 0));
      return {
        id, orderNo, ...common, supplierName, canteen, orderTag, source, driver, creator,
        orderAmount, shippingAmount: shipped ? orderAmount : 0, acceptedAmount: 0,
        returnAmount: 0, reconciliationAmount: 0, expectedAt, status,
        productCount: lines.length, acceptedAt: '', shippingAt, createdAt, items: lines,
        operationLogs: [{ action: '添加', operator: creator, result: '添加', time: createdAt, description: '' }]
      };
    };
    const firstItems = [
      { name: '大玉米棒子', unit: 'KG', productCode: 'SP0300036', orderPrice: 5, orderQty: 10 },
      { name: '黑大米', unit: '斤', productCode: 'SP0300034', orderPrice: 10, orderQty: 5 }
    ];
    const sourceOrders = [
      makeOrder({
        id: 'SCHOOL-ORDER-004', orderNo: 'DD202608270300003', createdAt: '2026-08-27 14:44:51', expectedAt: '2026-08-28 00:00:00',
        canteen: '静安第一中学食堂（演示）', items: firstItems
      }),
      makeOrder({
        id: 'SCHOOL-ORDER-005', orderNo: 'DD202608270300002', createdAt: '2026-08-27 14:39:01', expectedAt: '2026-08-28 03:33:12',
        canteen: '第一食堂', driver: '杨雄', items: [
          { name: '黑大米', unit: '斤', productCode: 'SP0300034', orderPrice: 10, orderQty: 1 },
          { name: '黑面', unit: 'L', productCode: 'SP0300040', orderPrice: 5, orderQty: 10 }
        ]
      }),
      makeOrder({
        id: 'SCHOOL-ORDER-006', orderNo: 'DD202608270300001', createdAt: '2026-08-27 14:37:54', expectedAt: '2026-08-26 03:33:12',
        canteen: '第一食堂', driver: '杨雄', items: [
          { name: '黑大米', unit: '斤', productCode: 'SP0300034', orderPrice: 10, orderQty: 1 },
          { name: '黑面', unit: 'L', productCode: 'SP0300040', orderPrice: 5, orderQty: 10 }
        ]
      }),
      makeOrder({
        id: 'SCHOOL-ORDER-007', orderNo: 'DD202608260500001', createdAt: '2026-08-26 09:47:22', expectedAt: '2026-08-27 08:43:29',
        supplierName: '统仓配送公司', canteen: '静安第一中学食堂', orderTag: '学生-不区分', source: '客户下单', driver: '张三三', creator: '默认',
        items: [
          { name: '土豆丝', unit: '斤', productCode: 'SP0300039', orderPrice: 1, orderQty: 20 },
          { name: '大白菜', unit: '斤', productCode: 'SP0300019', orderPrice: 2, orderQty: 30 },
          { name: '胡萝卜', unit: '斤', productCode: 'SP0300020', orderPrice: 2, orderQty: 20 },
          { name: '黑大米', unit: '斤', productCode: 'SP0300034', orderPrice: 10, orderQty: 4 },
          { name: '黑面', unit: 'L', productCode: 'SP0300040', orderPrice: 5, orderQty: 4 },
          { name: '金龙鱼5L桶装油', unit: '瓶', productCode: 'SP0300030', orderPrice: 57, orderQty: 2 }
        ]
      })
    ];
    const sourceLikeOrders = [
      makeOrder({
        id: 'SCHOOL-ORDER-008', orderNo: 'DD202608250300001', createdAt: '2026-08-25 15:33:37', expectedAt: '2026-08-26 03:33:12',
        canteen: '第一食堂', source: '客户下单', driver: '杨雄', creator: '默认', items: [
          { name: '黑大米', unit: '斤', productCode: 'SP0300034', orderPrice: 10, orderQty: 1 },
          { name: '黑面', unit: 'L', productCode: 'SP0300040', orderPrice: 5, orderQty: 10 }
        ]
      }),
      makeOrder({
        id: 'SCHOOL-ORDER-009', orderNo: 'DD202608250500001', createdAt: '2026-08-25 15:19:03', expectedAt: '2026-08-27 03:17:31',
        supplierName: '统仓配送公司', canteen: '静安第一中学食堂', orderTag: '学生-不区分', source: '客户下单', driver: '张三三', creator: '默认', items: [
          { name: '鸡蛋', unit: '斤', productCode: 'SP0300041', orderPrice: 8, orderQty: 100 },
          { name: '鸡腿肉', unit: '斤', productCode: 'SP0300042', orderPrice: 24, orderQty: 100 }
        ]
      }),
      makeOrder({
        id: 'SCHOOL-ORDER-010', orderNo: 'DD202608200500001', createdAt: '2026-08-20 08:52:27', expectedAt: '2026-08-21 08:52:07',
        status: '待出库', supplierName: '统仓配送公司', canteen: '静安第一中学食堂', orderTag: '学生-不区分', source: '客户下单', driver: '张三三', creator: '默认', items: [
          { name: '土豆丝', unit: '斤', productCode: 'SP0300039', orderPrice: 1, orderQty: 10 }
        ]
      }),
      makeOrder({
        id: 'SCHOOL-ORDER-011', orderNo: 'DD202608190300001', createdAt: '2026-08-19 13:47:48', expectedAt: '2026-08-20 00:00:00',
        canteen: '静安第一中学食堂（演示）', items: [
          { name: '黑面', unit: 'L', productCode: 'SP0300040', orderPrice: 5, orderQty: 10 },
          { name: '黑大米', unit: '斤', productCode: 'SP0300034', orderPrice: 10, orderQty: 10 },
          { name: '大玉米棒子', unit: 'KG', productCode: 'SP0300036', orderPrice: 5, orderQty: 20 }
        ]
      }),
      makeOrder({
        id: 'SCHOOL-ORDER-012', orderNo: 'DD202608150500003', createdAt: '2026-08-15 10:58:32', expectedAt: '2026-08-16 10:58:17',
        status: '待出库', supplierName: '统仓配送公司', canteen: '静安第一中学食堂', orderTag: '学生-不区分', source: '客户下单', driver: '张三三', creator: '默认', items: [
          { name: '土豆丝', unit: '斤', productCode: 'SP0300039', orderPrice: 1, orderQty: 5 }
        ]
      })
    ];
    const generatedOrders = Array.from({ length: 8 }, (_, index) => {
      const day = String(14 - index).padStart(2, '0');
      const date = `2026-08-${day}`;
      const sequence = String(index + 1).padStart(5, '0');
      const isWarehouse = index % 2 === 1;
      const isOutbound = index === 5;
      return makeOrder({
        id: `SCHOOL-ORDER-${String(index + 8).padStart(3, '0')}`,
        orderNo: `DD202608${day}03${sequence}`,
        createdAt: `${date} ${String(15 - (index % 5)).padStart(2, '0')}:${String(33 - index).padStart(2, '0')}:37`,
        expectedAt: `2026-08-${String(Math.min(31, 26 + (index % 5))).padStart(2, '0')} 03:33:12`,
        status: isOutbound ? '待出库' : '待发货',
        supplierName: isWarehouse ? '统仓配送公司' : supplier,
        canteen: isWarehouse ? '静安第一中学食堂' : '第一食堂',
        orderTag: isWarehouse ? '学生-不区分' : DEFAULT_TAG,
        source: isWarehouse ? '客户下单' : '平台下单',
        driver: isWarehouse ? '张三三' : '杨雄',
        creator: isWarehouse ? '默认' : '杨',
        items: index % 3 === 0 ? [
          { name: '大玉米棒子', unit: 'KG', productCode: 'SP0300036', orderPrice: 5, orderQty: 10 },
          { name: '黑大米', unit: '斤', productCode: 'SP0300034', orderPrice: 10, orderQty: 5 }
        ] : [
          { name: isWarehouse ? '土豆丝' : '黑面', unit: isWarehouse ? '斤' : 'L', productCode: isWarehouse ? 'SP0300039' : 'SP0300040', orderPrice: isWarehouse ? 1 : 5, orderQty: 10 },
          { name: '牛奶', unit: '瓶', productCode: 'SP0300038', orderPrice: 5, orderQty: 10 }
        ]
      });
    });
    const legacyOrders = [
      makeOrder({
        id: 'SCHOOL-ORDER-003', orderNo: 'DD202607280300004', createdAt: '2026-07-28 15:33:01', expectedAt: '2026-07-29 00:00:00',
        status: '待出库', driver: '杨雄', items: [{ name: '黑大米', unit: '斤', productCode: 'SP0300034', orderPrice: 10, orderQty: 1 }]
      }),
      makeOrder({
        id: 'SCHOOL-ORDER-002', orderNo: 'DD202607280300003', createdAt: '2026-07-28 15:31:57', expectedAt: '2026-07-29 00:00:00',
        driver: '杨雄', items: [{ name: '大玉米棒子', unit: 'KG', productCode: 'SP0300036', orderPrice: 5, orderQty: 1 }]
      }),
      makeOrder({
        id: 'SCHOOL-ORDER-001', orderNo: 'DD202607280300001', createdAt: '2026-07-28 15:27:38', expectedAt: '2026-07-29 00:00:00',
        status: '待出库', driver: '杨雄', items: [{ name: '黑大米', unit: '斤', productCode: 'SP0300034', orderPrice: 10, orderQty: 1 }]
      }),
      makeOrder({
        id: 'SCHOOL-ORDER-OLD-001', orderNo: 'DD202608040300004', createdAt: '2026-08-04 16:25:45', expectedAt: '2026-08-05 00:00:00',
        status: '已完成', canteen: '静安第一中学食堂（演示）', driver: '杨雄', shipped: true, shippingAt: '2026-08-04 17:06:02',
        items: [
          { name: '黑面', unit: 'L', productCode: 'SP0300040', orderPrice: 5, orderQty: 5, shippedQty: 5, traceCode: 'SYM202608040300000002' },
          { name: '大玉米棒子', unit: 'KG', productCode: 'SP0300036', orderPrice: 5, orderQty: 5, shippedQty: 5, traceCode: 'SYM202608040300000003' },
          { name: '黑大米', unit: '斤', productCode: 'SP0300034', orderPrice: 10, orderQty: 5, shippedQty: 5, traceCode: 'SYM202608040300000004' }
        ]
      })
    ];
    return [...sourceOrders, ...sourceLikeOrders, ...generatedOrders, ...legacyOrders];
  }

  function readOrders() {
    if (window.DemoStore?.get) {
      const stored = window.DemoStore.get(RESOURCE);
      const meta = window.DemoStore.get(META_RESOURCE);
      if (stored.length && meta.some((item) => item.id === SEED_VERSION)) return stored;
      const seed = makeSeed();
      window.DemoStore.replace(RESOURCE, seed);
      window.DemoStore.replace(META_RESOURCE, [{ id: SEED_VERSION, createdAt: timestamp() }]);
      return clone(seed);
    }
    if (!memoryOrders) memoryOrders = makeSeed();
    return clone(memoryOrders);
  }

  function writeOrders(orders) {
    if (window.DemoStore?.replace) return window.DemoStore.replace(RESOURCE, orders);
    memoryOrders = clone(orders);
    return clone(memoryOrders);
  }

  function lineFromPayload(line, index) {
    const name = String(line.productName || line.goodsName || '').trim();
    const qty = Math.max(0, number(line.orderQty ?? line.quantity));
    const price = Math.max(0, number(line.orderPrice ?? line.unitPrice));
    return makeLine({
      id: line.id || `SOL-LINE-${Date.now()}-${index + 1}`,
      name,
      unit: line.unit || '--',
      brand: line.brand || '--',
      spec: line.spec || '--',
      productCode: line.productCode || line.goodsCode || '',
      isNetVegetable: line.isNetVegetable === true,
      orderPrice: price,
      orderQty: qty,
      shippedQty: number(line.shippedQty),
      acceptedQty: line.acceptedQty == null || line.acceptedQty === '' ? null : number(line.acceptedQty),
      returnQty: line.returnQty == null || line.returnQty === '' ? null : number(line.returnQty),
      reconciledQty: line.reconciledQty == null || line.reconciledQty === '' ? null : number(line.reconciledQty),
      traceCode: line.traceCode || '',
      qualityReport: line.qualityReport || '',
      remark: line.remark ?? '--',
      productionDate: line.productionDate || '',
      agreementPrice: line.agreementPrice ?? '',
      recentSalePrice: line.recentSalePrice ?? price,
      marketPrice: line.marketPrice ?? price
    });
  }

  function normalizePayload(payload = {}) {
    const items = (payload.items || [])
      .map(lineFromPayload)
      .filter((line) => line.productName && line.orderQty > 0);
    const orderAmount = money(items.reduce((sum, line) => sum + line.orderSubtotal, 0));
    return {
      customerName: SCHOOL_NAME,
      supplierName: String(payload.supplierName || SUPPLIER_NAME).trim(),
      canteen: String(payload.canteen || '').trim(),
      orderTag: String(payload.orderTag || '').trim(),
      expectedAt: String(payload.expectedAt || '').trim(),
      supplement: String(payload.supplement || '否'),
      source: String(payload.source || '平台下单'),
      remark: String(payload.remark ?? '--'),
      recipeTag: String(payload.recipeTag || '').trim(),
      recipeDemandRecordId: String(payload.recipeDemandRecordId || '').trim(),
      recipeDemandRecordNo: String(payload.recipeDemandRecordNo || '').trim(),
      recipeDemandDate: String(payload.recipeDemandDate || '').trim(),
      recipeParticipantType: String(payload.recipeParticipantType || '').trim(),
      orderAmount,
      productCount: items.length,
      items
    };
  }

  function nextOrderNo(orders, createdAt) {
    const date = datePart(createdAt);
    const prefix = `DD${date}03`;
    const max = orders.reduce((value, order) => {
      const match = String(order.orderNo || '').match(new RegExp(`^${prefix}(\\d{5})$`));
      return Math.max(value, match ? Number(match[1]) : 0);
    }, 0);
    return `${prefix}${String(max + 1).padStart(5, '0')}`;
  }

  function logEntry(action, result = '', description = '') {
    return { action, operator: currentOperator(), result, time: timestamp(), description };
  }

  function findIndex(orders, id) {
    return orders.findIndex((order) => String(order.id) === String(id) || String(order.orderNo) === String(id));
  }

  function getProductCatalog() {
    const products = window.DemoStore?.get?.('products') || [];
    const fallback = [
      { code: 'SP0300040', name: '黑面', unit: 'L', brand: '--', spec: '--', category: '主食（米面粉点心类）-粮食类', marketPrice: 5 },
      { code: 'SP0300036', name: '大玉米棒子', unit: 'KG', brand: '--', spec: '--', category: '主食（米面粉点心类）-粮食类', marketPrice: 5 },
      { code: 'SP0300034', name: '黑大米', unit: '斤', brand: '--', spec: '--', category: '主食（米面粉点心类）-粮食类', marketPrice: 10 },
      { code: 'SP0300039', name: '土豆丝', unit: '斤', brand: '--', spec: '--', category: '果蔬-净菜类', isNetVegetable: true, marketPrice: 1 },
      { code: 'SP0300038', name: '牛奶', unit: '瓶', brand: '--', spec: '--', category: '蛋奶类-蛋奶类二级', marketPrice: 5 },
      { code: 'SP0300031', name: '鲫鱼', unit: 'L', brand: '--', spec: '--', category: '水产品-淡水鱼类', marketPrice: 20 },
      { code: 'SP0300030', name: '金龙鱼5L桶装油', unit: '瓶', brand: '金龙鱼', spec: '5L/瓶', category: '食油-食油二级', marketPrice: 55 }
    ];
    const source = products.length ? products : fallback;
    const merged = [...source, ...fallback];
    const seen = new Set();
    return merged.filter((product) => {
      const code = product.code || product.id;
      if (!code || seen.has(code)) return false;
      seen.add(code);
      return true;
    }).map((product) => ({
      code: product.code || product.id,
      name: product.name || product.goodsName || '',
      unit: product.unit || '--',
      brand: product.brand || '--',
      spec: product.spec || '--',
      category: product.category || product.categoryName || '',
      isNetVegetable: product.isNetVegetable === true,
      marketPrice: money(product.marketPrice)
    }));
  }

  function toCsv(rows) {
    const headers = ['订单号', '供货企业', '食堂', '订单标签', '下单金额', '验收金额', '退货金额', '对账金额', '期望送达时间', '单据状态', '收货状态', '商品种类数', '是否补单', '备注', '验收时间', '司机', '单据来源', '添加人'];
    const fields = ['orderNo', 'supplierName', 'canteen', 'orderTag', 'orderAmount', 'acceptedAmount', 'returnAmount', 'reconciliationAmount', 'expectedAt', 'status', 'receiptStatus', 'productCount', 'supplement', 'remark', 'acceptedAt', 'driver', 'source', 'creator'];
    const quote = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    return [headers.map(quote).join(','), ...rows.map((row) => fields.map((field) => quote(row[field])).join(','))].join('\r\n');
  }

  window.SchoolOrderService = {
    SCHOOL_NAME,
    SUPPLIER_NAME,
    CANTEEN_NAME,
    suppliers: [SUPPLIER_NAME, '统仓配送公司'],
    canteens: ['静安第一中学食堂（演示）', '第一食堂', '静安第一中学食堂'],
    tags: ['其他-不区分', '学生-不区分', '教师-不区分', '普通餐', '营养餐', '应急保供'],
    statuses: ['待审核', '待发货', '待出库', '已完成', '已驳回', '已关闭'],
    sources: ['平台下单', '客户下单', '食谱下单'],
    receiptStatuses: ['未收货', '已收货', '部分收货'],
    getAll() {
      return readOrders().sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    },
    list(filters = {}) {
      const normalized = Object.fromEntries(Object.entries(filters).map(([key, value]) => [key, String(value || '').trim()]));
      const catalogByCode = normalized.netVegetable
        ? new Map(getProductCatalog().map((product) => [String(product.code), product]))
        : null;
      return this.getAll().filter((order) => {
        const expectedDate = String(order.expectedAt || '').slice(0, 10);
        if (normalized.startDate && expectedDate < normalized.startDate) return false;
        if (normalized.endDate && expectedDate > normalized.endDate) return false;
        if (normalized.supplier && order.supplierName !== normalized.supplier) return false;
        if (normalized.orderTag && order.orderTag !== normalized.orderTag) return false;
        if (normalized.supplement && order.supplement !== normalized.supplement) return false;
        if (normalized.status && order.status !== normalized.status) return false;
        if (normalized.orderNo && !String(order.orderNo || '').includes(normalized.orderNo)) return false;
        if (normalized.source && order.source !== normalized.source) return false;
        if (normalized.receiptStatus && order.receiptStatus !== normalized.receiptStatus) return false;
        if (normalized.netVegetable) {
          const containsNetVegetable = (order.items || []).some((line) => line.isNetVegetable === true
            || catalogByCode.get(String(line.productCode || line.goodsCode || line.goodsId))?.isNetVegetable === true);
          if (normalized.netVegetable === 'net' && !containsNetVegetable) return false;
          if (normalized.netVegetable === 'non-net' && containsNetVegetable) return false;
        }
        return true;
      });
    },
    get(id) {
      const order = readOrders().find((item) => String(item.id) === String(id) || String(item.orderNo) === String(id));
      return clone(order || null);
    },
    getProductCatalog,
    normalizePayload,
    create(payload = {}) {
      const orders = readOrders();
      const normalized = normalizePayload(payload);
      const now = timestamp();
      const record = {
        id: payload.id || `SCHOOL-ORDER-${datePart(now)}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        orderNo: payload.orderNo || nextOrderNo(orders, now),
        ...normalized,
        status: payload.status || '待发货',
        acceptedAmount: 0,
        returnAmount: 0,
        reconciliationAmount: 0,
        receiptStatus: '未收货',
        acceptedAt: '',
        shippingAt: '',
        driver: payload.driver || '',
        creator: payload.creator || currentOperator(),
        createdAt: now,
        operationLogs: [logEntry(payload.recipeDemandRecordId ? '食谱需求下单' : '添加', '添加', payload.recipeDemandRecordNo ? `需求提交记录 ${payload.recipeDemandRecordNo}` : '')]
      };
      orders.unshift(record);
      writeOrders(orders);
      return clone(record);
    },
    update(id, payload = {}) {
      const orders = readOrders();
      const index = findIndex(orders, id);
      if (index < 0) return null;
      const current = orders[index];
      const normalized = normalizePayload({ ...current, ...payload });
      const next = {
        ...current,
        ...normalized,
        id: current.id,
        orderNo: current.orderNo,
        status: payload.status || current.status,
        acceptedAmount: current.acceptedAmount || 0,
        returnAmount: current.returnAmount || 0,
        reconciliationAmount: current.reconciliationAmount || 0,
        operationLogs: [...(current.operationLogs || []), logEntry('编辑', '保存')]
      };
      orders[index] = next;
      writeOrders(orders);
      return clone(next);
    },
    duplicate(id, { syncPrice = false } = {}) {
      const original = this.get(id);
      if (!original) return null;
      const payload = {
        ...original,
        items: (original.items || []).map((line) => ({
          ...line,
          orderPrice: syncPrice ? (line.recentSalePrice || line.marketPrice || line.orderPrice) : line.orderPrice,
          shippedQty: 0,
          acceptedQty: null,
          returnQty: null,
          reconciledQty: null,
          traceCode: ''
        })),
        status: '待发货',
        createdAt: timestamp(),
        creator: currentOperator()
      };
      return this.create(payload);
    },
    approve(id) {
      const orders = readOrders();
      const index = findIndex(orders, id);
      if (index < 0) return null;
      orders[index].status = '待出库';
      orders[index].operationLogs = [...(orders[index].operationLogs || []), logEntry('审核', '通过')];
      writeOrders(orders);
      return clone(orders[index]);
    },
    reject(id, reason = '审核未通过') {
      const orders = readOrders();
      const index = findIndex(orders, id);
      if (index < 0) return null;
      orders[index].status = '已驳回';
      orders[index].remark = reason;
      orders[index].operationLogs = [...(orders[index].operationLogs || []), logEntry('审核', '驳回', reason)];
      writeOrders(orders);
      return clone(orders[index]);
    },
    accept(id, lines = [], remark = '') {
      const orders = readOrders();
      const index = findIndex(orders, id);
      if (index < 0) return null;
      const order = orders[index];
      const byId = new Map(lines.map((line) => [String(line.id), line]));
      let acceptedAmount = 0;
      let returnAmount = 0;
      order.items = (order.items || []).map((line) => {
        const input = byId.get(String(line.id)) || {};
        const price = number(input.acceptedPrice ?? line.orderPrice);
        const acceptedQty = Math.max(0, number(input.acceptedQty));
        const returnQty = Math.max(0, number(input.returnQty));
        const next = {
          ...line,
          acceptedQty,
          acceptedSubtotal: money(acceptedQty * price),
          returnQty,
          returnSubtotal: money(returnQty * price),
          reconciledQty: Math.max(0, acceptedQty - returnQty),
          reconciledSubtotal: money(Math.max(0, acceptedQty - returnQty) * price),
          remark: input.remark ?? line.remark
        };
        acceptedAmount += next.acceptedSubtotal;
        returnAmount += next.returnSubtotal;
        return next;
      });
      order.acceptedAmount = money(acceptedAmount);
      order.returnAmount = money(returnAmount);
      order.reconciliationAmount = money(acceptedAmount - returnAmount);
      order.acceptedAt = timestamp();
      order.receiptStatus = '已收货';
      order.status = '已完成';
      if (remark) order.remark = remark;
      order.operationLogs = [...(order.operationLogs || []), logEntry('验收', '完成')];
      writeOrders(orders);
      return clone(order);
    },
    close(id) {
      const orders = readOrders();
      const index = findIndex(orders, id);
      if (index < 0) return null;
      orders[index].status = '已关闭';
      orders[index].operationLogs = [...(orders[index].operationLogs || []), logEntry('关闭', '关闭')];
      writeOrders(orders);
      return clone(orders[index]);
    },
    remove(id) {
      const orders = readOrders();
      const index = findIndex(orders, id);
      if (index < 0) return null;
      const removed = orders.splice(index, 1)[0];
      writeOrders(orders);
      return clone(removed);
    },
    updateBatchTag(ids, tag) {
      const selected = new Set((ids || []).map(String));
      const orders = readOrders();
      orders.forEach((order) => {
        if (selected.has(String(order.id))) order.orderTag = tag;
      });
      writeOrders(orders);
      return orders.filter((order) => selected.has(String(order.id))).map(clone);
    },
    csv(rows) {
      return toCsv(rows || this.getAll());
    }
  };
})();
