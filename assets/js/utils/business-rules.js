(function () {
  const documentPrefixes = Object.freeze({
    orders: 'DD',
    processingOrders: 'JGD',
    inboundOrders: 'RKD',
    outboundOrders: 'CKD',
    returns: 'THD',
    receiptChanges: 'BG',
    inventoryCounts: 'PD',
    inventoryLosses: 'SY'
  });

  const statusAliases = {
    products: {
      '已上架': 'ENABLE',
      '已下架': 'DISABLE'
    },
    orders: {
      PENDING: 'PENDING_AUDIT',
      CONFIRMED: 'READY_FOR_SORTING',
      APPROVED: 'READY_FOR_SORTING',
      COMPLETED: 'SHIPPED'
    },
    inboundOrders: {
      待入库: 'PENDING',
      待审核: 'PENDING_AUDIT',
      已完成: 'COMPLETED',
      已驳回: 'REJECTED',
      已关闭: 'CLOSED'
    },
    outboundOrders: {
      待出库: 'PENDING',
      待审核: 'PENDING_AUDIT',
      已完成: 'COMPLETED',
      已驳回: 'REJECTED',
      已关闭: 'CLOSED'
    },
    processingOrders: {
      草稿: 'DRAFT',
      待确认: 'PENDING_CONFIRM',
      待审核: 'PENDING_AUDIT',
      已加工: 'COMPLETED',
      已完成: 'COMPLETED',
      已作废: 'REJECTED',
      已驳回: 'REJECTED'
    },
    returns: {
      PENDING: 'PENDING_AUDIT',
      APPROVED: 'APPROVED',
      CLOSED: 'CLOSED',
      待审核: 'PENDING_AUDIT',
      已通过: 'APPROVED',
      已驳回: 'REJECTED',
      已关闭: 'CLOSED'
    },
    receiptChanges: {
      PENDING: 'PENDING_AUDIT',
      APPROVED: 'APPROVED',
      CLOSED: 'CLOSED',
      待审核: 'PENDING_AUDIT',
      已通过: 'APPROVED',
      已驳回: 'REJECTED',
      已关闭: 'CLOSED'
    },
    inventoryCounts: {
      PENDING: 'PENDING_AUDIT',
      APPROVED: 'APPROVED',
      COMPLETED: 'COMPLETED',
      CLOSED: 'CLOSED',
      待审核: 'PENDING_AUDIT',
      已完成: 'COMPLETED',
      已关闭: 'CLOSED'
    },
    inventoryLosses: {
      PENDING: 'PENDING_AUDIT',
      APPROVED: 'APPROVED',
      待审核: 'PENDING_AUDIT',
      已完成: 'COMPLETED',
      已关闭: 'CLOSED'
    },
    openingInventory: {
      COMPLETED: 'COMPLETED',
      已完成: 'COMPLETED'
    },
    qualityReports: {
      未上传: 'NOT_UPLOADED',
      已上传: 'UPLOADED',
      合格: 'PASSED',
      不合格: 'FAILED'
    }
  };

  const commonStatusLabels = Object.freeze({
    DRAFT: '草稿',
    PENDING: '待处理',
    PENDING_CONFIRM: '待确认',
    PENDING_AUDIT: '待审核',
    READY_FOR_SORTING: '待分拣',
    READY_FOR_SHIPPING: '待发货',
    PARTIAL: '部分完成',
    SORTED: '已分拣',
    SHORTAGE: '缺货',
    SHIPPED: '已发货',
    APPROVED: '已通过',
    COMPLETED: '已完成',
    REJECTED: '已驳回',
    CLOSED: '已关闭',
    ENABLE: '启用',
    DISABLE: '禁用',
    NOT_UPLOADED: '未上传',
    UPLOADED: '已上传',
    PASSED: '合格',
    FAILED: '不合格'
  });

  const requiredFields = Object.freeze({
    products: ['code', 'name', 'unit', 'category', 'status'],
    orders: ['orderNo', 'customerName', 'canteen', 'expectedAt', 'warehouse', 'status', 'items'],
    sortingTasks: ['orderId', 'orderLineId', 'productId', 'customerName', 'canteen', 'status'],
    shippingOrders: ['id', 'orderId', 'orderNo', 'customerName', 'canteen', 'receiver', 'phone', 'address', 'status', 'sortingStatus', 'items'],
    inboundOrders: ['id', 'entryTime', 'supplierPurchaserCustomerName', 'warehouseName', 'entryAmt', 'status', 'items'],
    outboundOrders: ['id', 'outboundTime', 'supplierPurchaserCustomerName', 'warehouseName', 'outboundAmt', 'status', 'items'],
    processingOrders: ['id', 'processingDate', 'warehouse', 'status', 'materials', 'outputs'],
    warehouses: ['warehouseCode', 'warehouseName', 'operatingCompanyIds', 'address'],
    returns: ['returnNo', 'customerName', 'canteen', 'reason', 'status', 'items'],
    receiptChanges: ['changeNo', 'customerName', 'canteen', 'orderNo', 'status', 'items']
  });

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function number(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function localParts(value = new Date()) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return {
      year: date.getFullYear(),
      month: String(date.getMonth() + 1).padStart(2, '0'),
      day: String(date.getDate()).padStart(2, '0'),
      hour: String(date.getHours()).padStart(2, '0'),
      minute: String(date.getMinutes()).padStart(2, '0'),
      second: String(date.getSeconds()).padStart(2, '0')
    };
  }

  function now(value = new Date()) {
    const parts = localParts(value);
    return parts
      ? `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`
      : '';
  }

  function today(value = new Date()) {
    return now(value).slice(0, 10);
  }

  function normalizeDate(value, fallback = '') {
    if (value === '' || value == null) return fallback;
    const source = String(value).trim();
    const match = source.match(/^(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})/);
    if (match) return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
    const compact = source.match(/^(\d{4})(\d{2})(\d{2})/);
    if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`;
    const parts = localParts(source);
    return parts ? `${parts.year}-${parts.month}-${parts.day}` : fallback;
  }

  function normalizeDateTime(value, fallback = '') {
    if (value === '' || value == null) return fallback;
    const source = String(value).trim().replace(',', ' ');
    const match = source.match(/^(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})(?:日)?(?:[ T]\s*(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (match) {
      return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')} ${String(match[4] || 0).padStart(2, '0')}:${String(match[5] || 0).padStart(2, '0')}:${String(match[6] || 0).padStart(2, '0')}`;
    }
    const compact = source.match(/^(\d{4})(\d{2})(\d{2})(?:[ T]?(\d{2})(\d{2})(\d{2})?)?/);
    if (compact) {
      return `${compact[1]}-${compact[2]}-${compact[3]} ${compact[4] || '00'}:${compact[5] || '00'}:${compact[6] || '00'}`;
    }
    const parts = localParts(source);
    return parts ? now(new Date(source)) : fallback;
  }

  function datePart(value) {
    return normalizeDate(value, today()).replace(/-/g, '');
  }

  function businessCode(value, fallback = '03') {
    const digits = String(value || '').replace(/\D/g, '');
    return (digits ? digits.slice(-2) : String(fallback || '03').replace(/\D/g, '').slice(-2)).padStart(2, '0');
  }

  function warehouseEnterpriseCode(value, fallback = '01') {
    return businessCode(value, fallback);
  }

  function warehouseCodeRegex(enterpriseCode = '01') {
    return new RegExp(`^CK${warehouseEnterpriseCode(enterpriseCode, '01')}\\d{5}$`);
  }

  function createWarehouseCode(records = [], enterpriseCode = '01') {
    const code = warehouseEnterpriseCode(enterpriseCode, '01');
    const used = new Set((records || []).map((record) => String(record?.warehouseCode || '')));
    for (let attempt = 0; attempt < 1000; attempt += 1) {
      const randomCode = String(Math.floor(Math.random() * 90000) + 10000);
      const candidate = `CK${code}${randomCode}`;
      if (!used.has(candidate)) return candidate;
    }
    let sequence = 10000;
    while (used.has(`CK${code}${sequence}`)) sequence += 1;
    return `CK${code}${String(sequence).padStart(5, '0').slice(-5)}`;
  }

  function documentRegex(resourceOrPrefix) {
    const prefix = documentPrefixes[resourceOrPrefix] || resourceOrPrefix;
    return new RegExp(`^${prefix}\\d{8}\\d{2}\\d{5}$`);
  }

  function documentNumber(resource, options = {}) {
    const prefix = documentPrefixes[resource] || options.prefix || resource;
    const compactDate = datePart(options.date || now());
    const code = businessCode(options.businessCode, '03');
    const base = `${prefix}${compactDate}${code}`;
    const records = Array.isArray(options.records) ? options.records : [];
    const fields = options.fields || ['id', 'orderNo', 'returnNo', 'changeNo', 'countNo', 'lossNo'];
    const maximum = records.reduce((max, record) => {
      const value = fields.map((field) => record?.[field]).find((candidate) => String(candidate || '').startsWith(base));
      if (!value) return max;
      return Math.max(max, number(String(value).slice(base.length)));
    }, 0);
    return `${base}${String(maximum + 1).padStart(5, '0')}`;
  }

  function canonicalDocumentNumber(resource, value, options = {}) {
    const prefix = documentPrefixes[resource] || options.prefix || resource;
    const source = String(value || '');
    if (documentRegex(prefix).test(source)) return source;
    const compactDate = source.match(/(\d{8})/)?.[1] || datePart(options.date || now());
    const sequence = source.match(/(\d{1,5})$/)?.[1] || String(options.sequence || 1);
    return `${prefix}${compactDate}${businessCode(options.businessCode, '03')}${sequence.padStart(5, '0').slice(-5)}`;
  }

  function normalizeStatus(resource, value) {
    const source = String(value || '').trim();
    return statusAliases[resource]?.[source] || source || 'PENDING';
  }

  function statusLabel(resource, value) {
    const normalized = normalizeStatus(resource, value);
    if (resource === 'products' && normalized === 'ENABLE') return '已上架';
    if (resource === 'products' && normalized === 'DISABLE') return '已下架';
    if (resource === 'inboundOrders' && normalized === 'PENDING') return '待入库';
    if (resource === 'outboundOrders' && normalized === 'PENDING') return '待出库';
    return commonStatusLabels[normalized] || String(value || '--');
  }

  function itemAmount(item, quantityKeys = ['actualQty', 'outboundQty', 'entryQty', 'quantity', 'expectedQty']) {
    const quantity = quantityKeys.map((key) => item?.[key]).find((value) => value !== '' && value != null);
    return number(item?.amount, number(quantity) * number(item?.unitPrice));
  }

  function totalAmount(items, quantityKeys) {
    return Number((items || []).reduce((sum, item) => sum + itemAmount(item, quantityKeys), 0).toFixed(2));
  }

  function isMissing(value) {
    return value === '' || value == null || value === '--'
      || (Array.isArray(value) && value.length === 0);
  }

  function validate(resource, record) {
    const errors = [];
    (requiredFields[resource] || []).forEach((field) => {
      const value = record?.[field];
      if (isMissing(value)) {
        errors.push({ field, code: 'FIELD_REQUIRED', message: `${field}不能为空` });
      }
    });
    if (Array.isArray(record?.items)) {
      record.items.forEach((item, index) => {
        const productId = item.productId || item.productCode || item.goodsCode;
        const quantities = [
          item.quantity, item.orderQty, item.outboundQty, item.entryQty, item.actualQty,
          item.expectedQty, item.shippingQty, item.applyQty
        ].map((value) => number(value));
        if (!productId) errors.push({ field: `items.${index}.productId`, code: 'PRODUCT_REQUIRED', message: '商品不能为空' });
        if (!quantities.some((quantity) => quantity > 0)) {
          errors.push({ field: `items.${index}.quantity`, code: 'QUANTITY_INVALID', message: '数量必须大于0' });
        }
      });
    }
    return { valid: errors.length === 0, errors };
  }

  function assertValid(resource, record) {
    const result = validate(resource, record);
    if (result.valid) return record;
    const error = new Error(result.errors[0].message);
    error.code = result.errors[0].code;
    error.detail = result.errors;
    throw error;
  }

  window.BusinessRules = {
    documentPrefixes,
    requiredFields,
    clone,
    number,
    now,
    today,
    normalizeDate,
    normalizeDateTime,
    datePart,
    businessCode,
    warehouseEnterpriseCode,
    warehouseCodeRegex,
    createWarehouseCode,
    documentRegex,
    documentNumber,
    canonicalDocumentNumber,
    normalizeStatus,
    statusLabel,
    itemAmount,
    totalAmount,
    isMissing,
    validate,
    assertValid
  };
})();
