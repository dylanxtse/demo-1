(function () {
  const centralResources = new Set([
    'orders', 'orderLines', 'sortingItems', 'sortingProgress', 'shippingOrders', 'outboundOrders',
    'inventoryBalance', 'inventoryDetails', 'inventoryCounts', 'inventoryLosses', 'openingInventory',
    'returns', 'tags', 'receiptChanges', 'shortageItems', 'sorters', 'warehouses', 'qualityReports',
    'shippingDifferences', 'productSales', 'goodsProfitStatistics'
  ]);
  const legacyOrderNumbers = {
    XS202607300001: { orderNo: 'DD202607300100001', orderId: 'ORD-20260730-001' },
    XS202607290012: { orderNo: 'DD202607290200012', orderId: 'ORD-20260729-012' },
    XS202607280006: { orderNo: 'DD202607280300006', orderId: 'ORD-20260728-006' },
    XS202607270003: { orderNo: 'DD202607270400003', orderId: 'ORD-20260727-003' },
    XS202607260021: { orderNo: 'DD202607260100021' }
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function error(code, message) {
    const value = new Error(message);
    value.code = code;
    return value;
  }

  function assertResource(resource) {
    if (!window.DemoStore) throw error('STORE_NOT_READY', '统一业务数据源未加载');
    if (!centralResources.has(resource)) throw error('RESOURCE_NOT_FOUND', '未找到业务数据');
  }

  function normalizeOrderNumbers(resource, records) {
    return records.map((record) => {
      const relation = legacyOrderNumbers[record.orderNo];
      if (!relation) return record;
      return {
        ...record,
        orderNo: relation.orderNo,
        ...(resource === 'sortingItems' && relation.orderId ? { orderId: relation.orderId } : {})
      };
    });
  }

  function enrichSortingItems(records) {
    const orders = window.DemoStore.get('orders') || [];
    const shippingOrders = window.DemoStore.get('shippingOrders') || [];
    const balances = window.DemoStore.get('inventoryBalance') || [];
    return records.map((item) => {
      const order = orders.find((record) => record.id === item.orderId || record.orderNo === item.orderNo);
      const shipping = shippingOrders.find((record) => record.orderId === item.orderId || record.orderNo === item.orderNo);
      const orderStatus = window.BusinessRules.normalizeStatus('orders', order?.status || '');
      const shippingStatus = window.BusinessRules.normalizeStatus('shippingOrders', shipping?.status || '');
      const productId = item.productId || item.goodsCode || item.productCode;
      const warehouseRows = balances.filter((row) => row.productId === productId && (!item.warehouse || row.warehouse === item.warehouse));
      const matchedRows = warehouseRows.length ? warehouseRows : balances.filter((row) => row.productId === productId);
      return {
        ...item,
        shipped: orderStatus === 'SHIPPED' || shippingStatus === 'SHIPPED' ? '是' : '否',
        stock: matchedRows.reduce((total, row) => total + Number(row.currentStock || 0), 0)
      };
    });
  }

  function load(resource) {
    assertResource(resource);
    const records = normalizeOrderNumbers(resource, window.DemoStore.get(resource));
    return resource === 'sortingItems' ? enrichSortingItems(records) : records;
  }

  function save(resource, items) {
    assertResource(resource);
    window.DemoStore.replace(resource, items);
  }

  function syncOrderToSortingItems(order) {
    if (window.OrderFlowService && window.DemoStore) return;
    if (!order?.orderNo || !Array.isArray(order.items)) return;
    const sortingItems = load('sortingItems');
    const existingKeys = new Set(sortingItems.map((item) => `${item.orderNo}|${item.goodsCode || item.productCode}`));
    order.items.forEach((item, index) => {
      if (item.isNetVegetable !== true) return;
      const goodsCode = item.goodsCode || item.productCode || item.goodsId || '';
      const key = `${order.orderNo}|${goodsCode}`;
      if (!goodsCode || existingKeys.has(key)) return;
      sortingItems.push({
        id: `SORT-ORDER-${order.id || order.orderNo}-${index}`,
        orderId: order.id || '',
        goodsCode,
        isNetVegetable: true,
        goodsName: item.goodsName || '',
        customerName: order.customerName || '',
        canteen: order.canteen || '',
        orderQty: Number(item.quantity || 0),
        actualQty: 0,
        unit: item.unit || '',
        orderNo: order.orderNo,
        orderTag: order.orderTag || '',
        status: 'PENDING',
        shortage: '否',
        expectedAt: order.expectedAt || ''
      });
      existingKeys.add(key);
    });
    save('sortingItems', sortingItems);
  }

  function normalize(value) {
    return String(value ?? '').trim().toLocaleLowerCase();
  }

  function orderContainsNetVegetable(order) {
    const products = window.DemoStore?.get('products') || window.MockProducts || [];
    const productsByCode = new Map(products.map((product) => [String(product.code || product.id), product]));
    return (order.items || []).some((line) => {
      if (line.isNetVegetable === true) return true;
      const code = line.productId || line.goodsCode || line.productCode || line.goodsId;
      return productsByCode.get(String(code))?.isNetVegetable === true;
    });
  }

  function isNetVegetable(item) {
    if (Array.isArray(item?.items) && item.items.some((entry) => isNetVegetable(entry))) return true;
    if (item && item.isNetVegetable !== undefined && item.isNetVegetable !== null) {
      return item.isNetVegetable === true
        || item.isNetVegetable === 'true'
        || item.isNetVegetable === '是';
    }
    const products = window.DemoStore?.get('products') || window.MockProducts || [];
    const code = item?.productId || item?.productCode || item?.goodsCode || item?.goodsId;
    const product = products.find((entry) => String(entry.code || entry.id) === String(code));
    return product?.isNetVegetable === true;
  }

  function matches(item, conditions, resource) {
    return Object.entries(conditions || {}).every(([key, value]) => {
      if (value === '' || value == null) return true;
      if (key === 'keyword') {
        const keyword = normalize(value);
        return Object.values(item).some((field) => normalize(field).includes(keyword));
      }
      if (key === 'dateRange' && Array.isArray(value) && value.length === 2) {
        const source = item.createdAt || item.expectedAt || item.occurredAt || item.inboundAt || item.countAt || '';
        return (!value[0] || source >= value[0]) && (!value[1] || source <= `${value[1]} 23:59:59`);
      }
      if (resource === 'orders' && key === 'netVegetable') {
        const containsNetVegetable = orderContainsNetVegetable(item);
        return value === 'net' ? containsNetVegetable : value === 'non-net' ? !containsNetVegetable : true;
      }
      if (key === 'isNetVegetable') {
        const expected = String(value).toLowerCase();
        const actual = isNetVegetable(item);
        return expected === 'true' || value === '净菜' ? actual : expected === 'false' || value === '非净菜' ? !actual : true;
      }
      if (key === 'status') {
        const expected = Array.isArray(value) ? value : [value];
        const actualStatus = window.BusinessRules.normalizeStatus(resource, item.status);
        return expected.some((candidate) => window.BusinessRules.normalizeStatus(resource, candidate) === actualStatus);
      }
      if (Array.isArray(value)) return value.includes(item[key]);
      if (Array.isArray(item[key])) return item[key].some((entry) => normalize(entry).includes(normalize(value)));
      return normalize(item[key]).includes(normalize(value));
    });
  }

  function nextId(resource, items) {
    const max = items.reduce((current, item) => {
      const number = Number(String(item.id || '').replace(/\D/g, '')) || 0;
      return Math.max(current, number);
    }, 0);
    return `${resource.toUpperCase().slice(0, 5)}-${String(max + 1).padStart(3, '0')}`;
  }

  function nextOrderNumber(items, customerName) {
    const now = new Date();
    const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const customers = [...new Set(items.map((item) => item.customerName).filter(Boolean))];
    let customerIndex = customers.indexOf(customerName);
    if (customerIndex < 0) customerIndex = customers.length;
    const customerCode = String(customerIndex + 1).padStart(2, '0').slice(-2);
    const maxSequence = items.reduce((max, item) => {
      const match = String(item.orderNo || '').match(/(\d{5})$/);
      return Math.max(max, match ? Number(match[1]) : 0);
    }, 0);
    return `DD${date}${customerCode}${String(maxSequence + 1).padStart(5, '0').slice(-5)}`;
  }

  function currentWarehouseEnterpriseCode(data = {}) {
    const explicitCode = data.enterpriseCode || data.companyCode || data.businessCode;
    if (explicitCode) return window.BusinessRules.warehouseEnterpriseCode(explicitCode, '01');
    const session = window.DemoStore?.getSession?.();
    const company = window.DemoStore?.get('companies')?.find((item) => item.id === session?.companyId);
    return window.BusinessRules.warehouseEnterpriseCode(company?.code || session?.companyId, '01');
  }

  function prepareWarehouseData(data, items) {
    const enterpriseCode = currentWarehouseEnterpriseCode(data);
    const companyIds = Array.isArray(data.operatingCompanyIds)
      ? data.operatingCompanyIds
      : [data.operatingCompanyId || data.companyId].filter(Boolean);
    const payload = {
      ...clone(data),
      enterpriseCode,
      operatingCompanyIds: [...new Set(companyIds.map(String).filter(Boolean))],
      warehouseCode: data.warehouseCode || window.BusinessRules.createWarehouseCode(items, enterpriseCode)
    };
    ['operatingCompanyId', 'companyId', 'operatorCompanyId', 'responsibleDistricts', 'responsibleArea', 'districts']
      .forEach((key) => delete payload[key]);
    return payload;
  }

  function statusForAction(action) {
    const mapping = {
      approve: 'APPROVED',
      confirm: 'CONFIRMED',
      reject: 'REJECTED',
      close: 'CLOSED',
      enable: 'ENABLE',
      disable: 'DISABLE',
      sort: 'SORTED',
      resetSort: 'PENDING',
      markShortage: 'PENDING',
      cancelShortage: 'PENDING',
      ship: 'SHIPPED',
      upload: 'UPLOADED',
      complete: 'COMPLETED',
      generatePurchase: 'PURCHASED'
    };
    return mapping[action];
  }

  function syncCustomerProgress(sortingItem) {
    if (!sortingItem?.customerName) return;
    const sortingItems = load('sortingItems').filter((item) =>
      item.customerName === sortingItem.customerName && item.canteen === sortingItem.canteen
    );
    const progressItems = load('sortingProgress');
    const progress = progressItems.find((item) =>
      item.customerName === sortingItem.customerName && item.canteen === sortingItem.canteen
    );
    if (!progress || !sortingItems.length) return;
    const sortedCount = sortingItems.filter((item) => item.status === 'SORTED').length;
    const completedCount = sortingItems.filter((item) => item.status === 'SORTED' || item.shortage === '是').length;
    progress.sortedCount = sortedCount;
    progress.orderCount = sortingItems.length;
    progress.progress = `${sortedCount}/${sortingItems.length}`;
    progress.status = completedCount === 0 ? 'PENDING' : completedCount === sortingItems.length ? 'SORTED' : 'PARTIAL';
    save('sortingProgress', progressItems);
  }

  function syncShortageRecord(sortingItem, action) {
    const shortageItems = load('shortageItems');
    const index = shortageItems.findIndex((item) => item.id === sortingItem.id);
    if (action === 'markShortage') {
      const record = {
        ...sortingItem,
        status: 'SHORTAGE',
        shortage: '是',
        shortageQty: Math.max(0, Number(sortingItem.orderQty || 0) - Number(sortingItem.actualQty || 0)),
        purchaseOrder: index >= 0 ? shortageItems[index].purchaseOrder : ''
      };
      if (index >= 0) shortageItems[index] = record;
      else shortageItems.unshift(record);
      save('shortageItems', shortageItems);
    }
    if (action === 'cancelShortage' || action === 'resetSort' || action === 'sort') {
      if (index >= 0) {
        shortageItems.splice(index, 1);
        save('shortageItems', shortageItems);
      }
    }
  }

  function validate(resource, data, currentId) {
    const requiredByResource = {
      tags: ['tagName'],
      sorters: ['sorterName', 'username', 'phone', 'warehouse'],
      warehouses: ['warehouseCode', 'warehouseName', 'operatingCompanyIds', 'address'],
      orders: ['customerName', 'canteen', 'expectedAt', 'orderTag', 'items'],
      returns: ['returnMode', 'customerName', 'canteen', 'reason', 'items'],
      receiptChanges: ['customerName', 'canteen', 'orderNo', 'changeReason', 'items'],
      inventoryCounts: ['warehouse', 'countAt'],
      openingInventory: ['goodsName', 'warehouse', 'openingQty', 'openingPrice'],
      qualityReports: ['inboundNo', 'goodsName', 'warehouse']
    };
    (requiredByResource[resource] || []).forEach((key) => {
      if (data[key] === '' || data[key] == null || (Array.isArray(data[key]) && data[key].length === 0)) {
        throw error('FIELD_REQUIRED', '请完整填写必填项');
      }
    });
    if (resource === 'orders' && (!Array.isArray(data.items) || data.items.length === 0)) {
      throw error('ORDER_GOODS_REQUIRED', '请至少添加一个商品');
    }
    if (resource === 'orders' && data.items.some((item) => !(Number(item.quantity) > 0) || Number(item.unitPrice) < 0)) {
      throw error('INVALID_ORDER_GOODS', '请完整填写商品下单数量和下单单价');
    }
    if (resource === 'tags') {
      const duplicate = load(resource).some((item) =>
        item.id !== currentId && normalize(item.tagName) === normalize(data.tagName)
      );
      if (duplicate) throw error('DUPLICATE_TAG', '标签名称已存在');
    }
    if (resource === 'sorters' && !/^1\d{10}$/.test(String(data.phone || ''))) {
      throw error('INVALID_PHONE', '请输入正确的手机号码');
    }
    if (resource === 'sorters' && !/^[A-Za-z0-9]{6,20}$/.test(String(data.username || ''))) {
      throw error('INVALID_USERNAME', '请输入6～20位字母或数字组成的用户名');
    }
    if (resource === 'warehouses') {
      const enterpriseCode = currentWarehouseEnterpriseCode(data);
      if (!window.BusinessRules.warehouseCodeRegex(enterpriseCode).test(String(data.warehouseCode || ''))) {
        throw error('INVALID_WAREHOUSE_CODE', '仓库编码必须为CK加两位企业编码和五位随机码');
      }
      const duplicate = load(resource).some((item) =>
        item.id !== currentId && (
          normalize(item.warehouseCode) === normalize(data.warehouseCode) ||
          normalize(item.warehouseName) === normalize(data.warehouseName)
        )
      );
      if (duplicate) throw error('DUPLICATE_WAREHOUSE', '仓库编码或仓库名称已存在');
    }
  }

  window.OperationsService = {
    isNetVegetable,

    async list(resource, query = {}) {
      const page = Math.max(1, Number(query.page) || 1);
      const pageSize = Math.max(1, Number(query.pageSize) || 20);
      const conditions = query.condition || {};
      const filtered = load(resource)
        .filter((item) => matches(item, conditions, resource))
        .sort((a, b) => String(b.createdAt || b.occurredAt || b.id).localeCompare(String(a.createdAt || a.occurredAt || a.id)));
      const start = (page - 1) * pageSize;
      return {
        items: clone(filtered.slice(start, start + pageSize)),
        total: filtered.length,
        page,
        pageSize
      };
    },

    async get(resource, id) {
      return clone(load(resource).find((item) => item.id === id) || null);
    },

    async create(resource, data) {
      if (resource === 'orders' && window.OrderFlowService) return window.OrderFlowService.createOrder(data);
      const items = load(resource);
      const payload = resource === 'warehouses' ? prepareWarehouseData(data, items) : data;
      validate(resource, payload);
      const now = window.BusinessRules.now();
      const created = {
        id: nextId(resource, items),
        status: window.BusinessRules.normalizeStatus(resource, payload.status || 'PENDING'),
        createdAt: now,
        ...clone(payload)
      };
      created.status = window.BusinessRules.normalizeStatus(resource, created.status);
      if (resource === 'orders') created.orderNo ||= nextOrderNumber(items, created.customerName);
      if (resource === 'returns') {
        created.returnNo ||= window.BusinessRules.documentNumber('returns', {
          date: now,
          businessCode: created.customerCode || '03',
          records: items,
          fields: ['returnNo']
        });
      }
      if (resource === 'receiptChanges') {
        created.changeNo ||= window.BusinessRules.documentNumber('receiptChanges', {
          date: now,
          businessCode: created.customerCode || '03',
          records: items,
          fields: ['changeNo']
        });
      }
      if (resource === 'receiptChanges') {
        created.beforeAmount = Number((created.items || []).reduce((sum, item) => sum + Number(item.shippingAmount || 0), 0).toFixed(2));
        created.afterAmount = Number((created.items || []).reduce((sum, item) => sum + Number(item.afterAmount || 0), 0).toFixed(2));
        created.differenceAmount = Number((created.afterAmount - created.beforeAmount).toFixed(2));
      }
      if (resource === 'returns') {
        created.refundAmount = Number((created.items || []).reduce((sum, item) => sum + Number(item.applyAmount || 0), 0).toFixed(2));
      }
      if (resource === 'inventoryCounts') {
        created.countNo ||= window.BusinessRules.documentNumber('inventoryCounts', {
          date: created.countAt || now,
          businessCode: created.warehouseCode || '03',
          records: items,
          fields: ['countNo']
        });
      }
      if (resource === 'inventoryLosses') {
        created.lossNo ||= window.BusinessRules.documentNumber('inventoryLosses', {
          date: now,
          businessCode: created.warehouseCode || '03',
          records: items,
          fields: ['lossNo']
        });
      }
      if (resource === 'openingInventory') {
        created.openingAmount = Number(created.openingQty || 0) * Number(created.openingPrice || 0);
      }
      items.unshift(created);
      save(resource, items);
      if (resource === 'orders') syncOrderToSortingItems(created);
      return clone(created);
    },

    async update(resource, id, data) {
      if (resource === 'orders' && window.OrderFlowService) return window.OrderFlowService.updateOrder(id, data);
      if (resource === 'sortingItems' && data.actualQty !== undefined && window.OrderFlowService) {
        return window.OrderFlowService.transition(resource, id, 'sort', { actualQty: data.actualQty });
      }
      const items = load(resource);
      const index = items.findIndex((item) => item.id === id);
      if (index < 0) throw error('RECORD_NOT_FOUND', '记录不存在或已删除');
      const payload = resource === 'warehouses'
        ? prepareWarehouseData({ ...items[index], ...data }, items)
        : data;
      validate(resource, { ...items[index], ...payload }, id);
      items[index] = {
        ...items[index],
        ...clone(payload),
        status: window.BusinessRules.normalizeStatus(resource, payload.status || items[index].status),
        updatedAt: window.BusinessRules.now()
      };
      if (resource === 'openingInventory') {
        items[index].openingAmount = Number(items[index].openingQty || 0) * Number(items[index].openingPrice || 0);
      }
      if (resource === 'receiptChanges') {
        items[index].beforeAmount = Number((items[index].items || []).reduce((sum, item) => sum + Number(item.shippingAmount || 0), 0).toFixed(2));
        items[index].afterAmount = Number((items[index].items || []).reduce((sum, item) => sum + Number(item.afterAmount || 0), 0).toFixed(2));
        items[index].differenceAmount = Number((items[index].afterAmount - items[index].beforeAmount).toFixed(2));
      }
      if (resource === 'returns' && Array.isArray(items[index].items)) {
        items[index].refundAmount = Number(items[index].items.reduce((sum, item) => sum + Number(item.applyAmount || 0), 0).toFixed(2));
      }
      save(resource, items);
      if (resource === 'orders') syncOrderToSortingItems(items[index]);
      return clone(items[index]);
    },

    async remove(resource, id) {
      if (resource === 'orders' && window.OrderFlowService) return window.OrderFlowService.removeOrder(id);
      const items = load(resource);
      const index = items.findIndex((item) => item.id === id);
      if (index < 0) throw error('RECORD_NOT_FOUND', '记录不存在或已删除');
      if (resource === 'warehouses' && items[index].referenced) {
        throw error('WAREHOUSE_REFERENCED', '该仓库已被引用无法删除');
      }
      const removed = items.splice(index, 1)[0];
      save(resource, items);
      return clone(removed);
    },

    async transition(resource, id, action, payload = {}) {
      if (window.OrderFlowService && ['orders', 'sortingItems', 'sortingProgress', 'shippingOrders', 'outboundOrders'].includes(resource)) {
        return window.OrderFlowService.transition(resource, id, action, payload);
      }
      const items = load(resource);
      const item = items.find((entry) => entry.id === id);
      if (!item) throw error('RECORD_NOT_FOUND', '记录不存在或已删除');
      const nextStatus = statusForAction(action);
      if (!nextStatus) throw error('INVALID_ACTION', '不支持的状态操作');
      item.status = nextStatus;
      if (action === 'sort') {
        item.actualQty = Number(payload.actualQty ?? item.orderQty ?? item.actualQty ?? 0);
        item.progress = `${item.actualQty}/${item.orderQty}`;
        item.sorter ||= '当前用户';
        item.sortingAt = window.BusinessRules.now();
        item.shortage = '否';
      }
      if (action === 'resetSort') {
        item.actualQty = 0;
        item.progress = `0/${item.orderQty}`;
        item.sorter = '';
        item.sortingAt = '';
      }
      if (action === 'markShortage') item.shortage = '是';
      if (action === 'cancelShortage') item.shortage = '否';
      if (action === 'ship') item.shippingAmount ||= item.orderAmount || 0;
      if (action === 'upload') {
        item.reportStatus = '已上传';
        item.reportName = payload.reportName || '本地质检报告.pdf';
      }
      if (action === 'generatePurchase') {
        item.purchaseOrder = payload.purchaseOrder || `CG${Date.now()}`;
      }
      if (action === 'approve') {
        item.auditAt = window.BusinessRules.now();
        item.auditor = '当前用户';
      }
      if (payload.auditOpinion) item.auditOpinion = payload.auditOpinion;
      if (payload.rejectReason) item.rejectReason = payload.rejectReason;
      save(resource, items);
      if (resource === 'sortingItems') {
        syncShortageRecord(item, action);
        syncCustomerProgress(item);
      }
      if (resource === 'sortingProgress' && (action === 'sort' || action === 'resetSort')) {
        const relatedItems = load('sortingItems');
        relatedItems.forEach((sortingItem) => {
          if (sortingItem.customerName !== item.customerName || sortingItem.canteen !== item.canteen) return;
          if (action === 'sort' && sortingItem.shortage === '是') return;
          sortingItem.status = action === 'sort' ? 'SORTED' : 'PENDING';
          sortingItem.actualQty = action === 'sort' ? Number(sortingItem.orderQty || 0) : 0;
          sortingItem.progress = action === 'sort' ? `${sortingItem.actualQty}/${sortingItem.orderQty}` : `0/${sortingItem.orderQty}`;
          sortingItem.sorter = action === 'sort' ? (sortingItem.sorter || '当前用户') : '';
          sortingItem.sortingAt = action === 'sort' ? new Date().toISOString().slice(0, 16).replace('T', ' ') : '';
          if (action === 'resetSort') sortingItem.shortage = '否';
        });
        save('sortingItems', relatedItems);
      }
      if (resource === 'shortageItems' && action === 'cancelShortage') {
        save('shortageItems', load('shortageItems').filter((shortageItem) => shortageItem.id !== id));
        const sortingItems = load('sortingItems');
        const related = sortingItems.find((sortingItem) => sortingItem.id === id);
        if (related) {
          related.status = 'PENDING';
          related.shortage = '否';
          save('sortingItems', sortingItems);
          syncCustomerProgress(related);
        }
      }
      return clone(item);
    },

    async batch(resource, ids, action, payload = {}) {
      if (!Array.isArray(ids) || ids.length === 0) throw error('NO_SELECTION', '请选择要操作的数据');
      const result = [];
      for (const id of ids) {
        if (action === 'sort') {
          const item = load(resource).find((entry) => entry.id === id);
          if (item && item.shortage === '是') continue;
        }
        result.push(await this.transition(resource, id, action, payload));
      }
      return result;
    },

    async options(resource, field) {
      const values = load(resource).map((item) => item[field]).filter(Boolean);
      return [...new Set(values)].map((value) => ({ label: value, value }));
    },

    async export(resource, query = {}, columns = []) {
      const result = await this.list(resource, { ...query, page: 1, pageSize: Number.MAX_SAFE_INTEGER });
      const selectedColumns = columns.filter((column) => column.key && column.key !== 'actions');
      const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
      return [
        selectedColumns.map((column) => escape(column.label)).join(','),
        ...result.items.map((item) => selectedColumns.map((column) => escape(item[column.key])).join(','))
      ].join('\n');
    },

    async reset(resource) {
      assertResource(resource);
      save(resource, clone(window.MockOperations[resource]));
      return true;
    }
  };
})();
