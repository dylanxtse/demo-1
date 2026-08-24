(function () {
  const defaultConfig = { auditEnabled: true };
  const customerCodes = { 全部: '03', 客户A: '01', 客户B: '02', 客户C: '03' };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function getCustomerCode(order) {
    const explicitCode = String(order.customerCode || '').replace(/\D/g, '').slice(-2);
    if (explicitCode) return explicitCode.padStart(2, '0');
    return customerCodes[order.customer] || '03';
  }

  function getDatePart(value) {
    const match = String(value || '').match(/^(\d{4})[-/]?(\d{2})[-/]?(\d{2})/);
    if (match) return `${match[1]}${match[2]}${match[3]}`;
    const now = new Date();
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  }

  function canonicalProcessingId(id, datePart, customerCode, fallbackSequence) {
    const value = String(id || '');
    if (/^JGD\d{8}\d{2}\d{5}$/.test(value)) return value;
    const legacy = value.match(/^JG?D?(\d{8})(\d{1,5})$/);
    if (legacy) {
      return `JGD${legacy[1]}${customerCode}${legacy[2].padStart(5, '0')}`;
    }
    return `JGD${datePart}${customerCode}${String(fallbackSequence).padStart(5, '0')}`;
  }

  function normalizeStatus(status) {
    return window.BusinessRules.normalizeStatus('processingOrders', status);
  }

  function isValidPrice(value) {
    return value !== '' && value !== null && value !== undefined
      && Number.isFinite(Number(value)) && Number(value) > 0;
  }

  function normalizeOutputBusinessData(order) {
    const outputs = Array.isArray(order.outputs) ? order.outputs.map((output) => ({ ...output })) : [];
    if (outputs.length === 0) return null;
    const isManualCostMode = order.costMode === 'manual';

    const materialCost = (order.materials || []).reduce((sum, material) => (
      sum + (Number(material.consumeQty) || 0) * (Number(material.avgPrice) || 0)
    ), 0);
    if (!(materialCost > 0)) return null;

    const normalizedOutputs = outputs.map((output) => ({
      ...output,
      refCoefficient: Number(output.refCoefficient) > 0 ? Number(output.refCoefficient) : 1,
      actualQty: Number(output.actualQty) > 0
        ? Number(output.actualQty)
        : Number(output.refQty) > 0 ? Number(output.refQty) : 0
    }));
    if (normalizedOutputs.some((output) => !(Number(output.actualQty) > 0))) return null;

    const totalActualQty = normalizedOutputs.reduce((sum, output) => sum + Number(output.actualQty), 0);
    const products = window.ProductService?.getList?.() || window.MockProducts || [];
    const salesOutputs = normalizedOutputs.map((output) => {
      const product = products.find((item) => item.code === output.productCode);
      const salesPrice = Number(product?.marketPrice);
      return {
        actualQty: Number(output.actualQty),
        salesPrice,
        salesAmount: Number(output.actualQty) * salesPrice
      };
    });
    const totalSalesAmount = salesOutputs.reduce((sum, output) => (
      sum + (Number.isFinite(output.salesAmount) && output.salesAmount > 0 ? output.salesAmount : 0)
    ), 0);
    const canUseSalesWeight = totalSalesAmount > 0 && salesOutputs.every((output) => output.salesAmount > 0);
    let allocatedTotal = 0;

    const allocatedOutputs = normalizedOutputs.map((output, index) => {
      if (isManualCostMode) {
        const costPrice = Number(output.costPrice);
        if (!isValidPrice(costPrice)) return null;
        const allocatedCost = Math.max(Math.round(Number(output.actualQty) * costPrice * 100) / 100, 0.01);
        return {
          ...output,
          allocatedCost: allocatedCost.toFixed(2),
          costPrice: costPrice.toFixed(2)
        };
      }
      const allocation = canUseSalesWeight
        ? materialCost * (salesOutputs[index].salesAmount / totalSalesAmount)
        : materialCost * (Number(output.actualQty) / totalActualQty);
      const allocatedCost = index === normalizedOutputs.length - 1
        ? Math.max(materialCost - allocatedTotal, 0.01)
        : Math.max(Math.round(allocation * 100) / 100, 0.01);
      allocatedTotal = Math.round((allocatedTotal + allocatedCost) * 100) / 100;
      const costPrice = Math.max(Math.round((allocatedCost / Number(output.actualQty)) * 100) / 100, 0.01);
      return {
        ...output,
        allocatedCost: allocatedCost.toFixed(2),
        costPrice: costPrice.toFixed(2)
      };
    });
    return allocatedOutputs.some((output) => !output) ? null : allocatedOutputs;
  }

  function hasValidProcessingPayload(order) {
    const materials = Array.isArray(order.materials) ? order.materials : [];
    const outputs = Array.isArray(order.outputs) ? order.outputs : [];
    return materials.length > 0
      && materials.every((material) => material.productCode && Number(material.consumeQty) > 0 && Number(material.avgPrice) > 0)
      && outputs.length > 0
      && outputs.every((output) => output.productCode
        && Number(output.refCoefficient) > 0
        && Number(output.actualQty) > 0
        && isValidPrice(output.costPrice));
  }

  function normalizeOrder(order, index) {
    const customerCode = getCustomerCode(order);
    const datePart = getDatePart(order.processingDate || order.createTime);
    const currentId = String(order.id || '');
    const isDemo4005 = currentId === 'JG20260724005' || currentId === 'JGD202607240300005';
    const normalizedMaterials = isDemo4005 && Array.isArray(order.materials)
      ? order.materials.slice(0, 1)
      : order.materials;
    const normalizedOutputs = normalizeOutputBusinessData({ ...order, materials: normalizedMaterials });
    if (!normalizedOutputs) return null;
    const sourceStatus = normalizeStatus(order.status);
    const normalizedStatus = sourceStatus === 'PENDING_CONFIRM'
      ? (getConfig().auditEnabled ? 'PENDING_AUDIT' : 'COMPLETED')
      : sourceStatus;
    const normalizedBase = {
      ...order,
      materials: normalizedMaterials,
      outputs: normalizedOutputs,
      customerCode,
      status: normalizedStatus
    };
    const sequence = currentId.match(/(\d{1,5})$/)?.[1] || String(index + 1);
    const normalizedOrder = {
      ...normalizedBase,
      id: canonicalProcessingId(currentId, datePart, customerCode, sequence)
    };
    return hasValidProcessingPayload(normalizedOrder) ? normalizedOrder : null;
  }

  function load() {
    if (!window.DemoStore) throw new Error('统一数据仓库未加载');
    return clone(window.DemoStore.get('processingOrders') || [])
      .map(normalizeOrder)
      .filter(Boolean);
  }

  function save(orders) {
    window.DemoStore.replace('processingOrders', orders);
  }

  function getConfig() {
    return {
      ...defaultConfig,
      auditEnabled: window.DemoStore?.getSettings?.().processingAuditEnabled ?? defaultConfig.auditEnabled
    };
  }

  function saveConfig(config) {
    if (!window.DemoStore) return false;
    window.DemoStore.updateSettings({ processingAuditEnabled: Boolean(config.auditEnabled) });
    return true;
  }

  function generateId(processingDate, customerCode, orders) {
    const datePart = getDatePart(processingDate);
    const prefix = `JGD${datePart}${customerCode}`;
    const maxSequence = orders.reduce((max, order) => {
      if (!order.id.startsWith(prefix)) return max;
      const sequence = Number(order.id.slice(prefix.length)) || 0;
      return Math.max(max, sequence);
    }, 0);
    return `${prefix}${String(maxSequence + 1).padStart(5, '0')}`;
  }

  function getDocumentCollection(key, fallback) {
    const resource = key === 'procurement-inbound-orders' ? 'inboundOrders' : 'outboundOrders';
    return clone(window.DemoStore.get(resource) || fallback || []);
  }

  function saveDocumentCollection(key, value) {
    const resource = key === 'procurement-inbound-orders' ? 'inboundOrders' : 'outboundOrders';
    window.DemoStore.replace(resource, value);
  }

  function applyProcessedQuantities(order) {
    if (!window.DemoStore || !order || order.status !== 'COMPLETED') return;
    const refsByProduct = new Map();
    (order.outputs || []).forEach((output) => {
      const refs = Array.isArray(output.orderLineRefs) ? output.orderLineRefs : [];
      if (!refs.length) return;
      refsByProduct.set(output.productCode, refs);
    });
    if (!refsByProduct.size) return;
    window.DemoStore.transact((state) => {
      state.sortingTasks.forEach((task) => {
        const refs = refsByProduct.get(task.productId);
        if (!refs || !refs.some((ref) => ref.orderId === task.orderId && ref.orderLineId === task.orderLineId)) return;
        const output = (order.outputs || []).find((item) => item.productCode === task.productId);
        const totalRefQty = refs.reduce((sum, ref) => sum + Number(ref.sortedQty || 0), 0);
        const ref = refs.find((item) => item.orderId === task.orderId && item.orderLineId === task.orderLineId);
        const allocation = totalRefQty > 0
          ? Number(output?.actualQty || 0) * Number(ref?.sortedQty || 0) / totalRefQty
          : 0;
        task.processedQty = Math.min(task.actualQty, Number(task.processedQty || 0) + allocation);
      });
    });
  }

  function generateProcessingDocumentId(prefix, datePart, customerCode, order) {
    const processingSequence = Number(String(order.id || '').slice(-5)) || 1;
    return `${prefix}${datePart}${customerCode}${String(70000 + processingSequence).padStart(5, '0')}`;
  }

  function buildInboundItems(order) {
    return (order.outputs || []).map((output) => ({
      productCode: output.productCode,
      productName: output.productName,
      unit: output.unit,
      conversionRate: 1,
      expectedQty: Number(output.actualQty),
      damageQty: 0,
      actualQty: Number(output.actualQty),
      unitPrice: Number(output.costPrice).toFixed(2),
      amount: (Number(output.actualQty) * Number(output.costPrice)).toFixed(2),
      productionDate: order.processingDate || '',
      qualityReport: '合格',
      qualityFiles: []
    }));
  }

  function buildOutboundItems(order) {
    return (order.materials || []).map((material) => ({
      productCode: material.productCode,
      productName: material.productName,
      unit: material.unit,
      conversionRate: 1,
      currentStock: Number(material.stock) || 0,
      outboundQty: Number(material.consumeQty),
      unitPrice: Number(material.avgPrice).toFixed(2),
      amount: (Number(material.consumeQty) * Number(material.avgPrice)).toFixed(2),
      remark: '加工原料'
    }));
  }

  function buildOperationLogs(order, docType) {
    const operator = order.operator || '管理员';
    const baseDate = order.processingDate || order.createTime || '';
    const dateStr = baseDate.length >= 10 ? baseDate.slice(0, 10) : '';
    const createTime = order.createTime || (dateStr ? `${dateStr} 09:00:00` : '');
    const submitTime = order.submittedAt || (dateStr ? `${dateStr} 09:31:00` : '');
    const auditTime = order.auditedAt || (dateStr ? `${dateStr} 10:00:00` : '');
    const completeTime = dateStr ? `${dateStr} 14:30:00` : '';
    const docLabel = docType === 'inbound' ? '入库单' : '出库单';
    return [
      { action: '添加', operator, desc: `${operator} 添加${docLabel} ${createTime}` },
      { action: '提交审核', operator, desc: `${operator} 提交审核 ${submitTime}` },
      { action: '审核', operator: '张三', desc: `张三 审核通过 ${auditTime}` },
      { action: '完成', operator: '系统', desc: `系统 标记完成 ${completeTime}` }
    ];
  }

  function buildPendingOperationLogs(order, docType) {
    const operator = order.operator || '管理员';
    const baseDate = order.processingDate || order.createTime || '';
    const dateStr = baseDate.length >= 10 ? baseDate.slice(0, 10) : '';
    const createTime = order.createTime || (dateStr ? `${dateStr} 09:00:00` : '');
    const docLabel = docType === 'inbound' ? '入库单' : '出库单';
    return [
      { action: '添加', operator, desc: `${operator} 添加${docLabel} ${createTime}` }
    ];
  }

  function mergeInboundItemsWithQualityFiles(existingItems, nextItems) {
    const previousItems = Array.isArray(existingItems) ? existingItems : [];
    return nextItems.map((item, index) => {
      const previous = previousItems[index]
        || previousItems.find((candidate) => candidate.productCode === item.productCode);
      return {
        ...item,
        qualityFiles: Array.isArray(previous?.qualityFiles) ? previous.qualityFiles : [],
        qualityReport: previous?.qualityReport || item.qualityReport
      };
    });
  }

  function ensureRelatedDocuments(order) {
    if (order.status !== 'COMPLETED') return order;
    const datePart = getDatePart(order.processingDate || order.createTime);
    const customerCode = getCustomerCode(order);
    const inboundOrders = getDocumentCollection('procurement-inbound-orders', window.MockInboundOrders);
    const outboundOrders = getDocumentCollection('procurement-outbound-orders', window.MockOutboundOrders);
    const now = window.BusinessRules.now();
    const inboundId = generateProcessingDocumentId('RKD', datePart, customerCode, order);
    const outboundId = generateProcessingDocumentId('CKD', datePart, customerCode, order);

    if (!inboundOrders.some((item) => item.id === inboundId)) {
      inboundOrders.unshift({
        id: inboundId,
        entryTime: now,
        supplierPurchaserCustomerName: order.customer || '企业自加工',
        customerName: order.customer || '企业自加工',
        entryType: '净菜加工入库',
        entryAmt: window.BusinessRules.totalAmount(buildInboundItems(order), ['actualQty']),
        warehouseName: order.outputWarehouse || order.warehouse || '主仓库',
        relNo: order.id,
        expectedDeliveryDate: order.processingDate || '--',
        status: 'PENDING',
        purchaserLeaderName: order.operator || '管理员',
        creator: order.operator || '管理员',
        remark: order.remark || '加工成品入库',
        attachments: [],
        operationLogs: buildPendingOperationLogs(order, 'inbound'),
        items: buildInboundItems(order)
      });
      saveDocumentCollection('procurement-inbound-orders', inboundOrders);
    } else {
      const inboundOrder = inboundOrders.find((item) => item.id === inboundId);
      if (inboundOrder && inboundOrder.relNo === order.id) {
        inboundOrder.items = mergeInboundItemsWithQualityFiles(inboundOrder.items, buildInboundItems(order));
        inboundOrder.entryAmt = inboundOrder.items.reduce((sum, item) => sum + Number(item.amount), 0).toFixed(2);
        if (!inboundOrder.operationLogs) inboundOrder.operationLogs = buildPendingOperationLogs(order, 'inbound');
        if (!inboundOrder.attachments) inboundOrder.attachments = [];
        saveDocumentCollection('procurement-inbound-orders', inboundOrders);
      }
    }

    if (!outboundOrders.some((item) => item.id === outboundId)) {
      outboundOrders.unshift({
        id: outboundId,
        outboundOrderId: outboundId,
        outboundTime: now,
        outboundType: '净菜加工出库',
        outboundAmt: (order.materials || []).reduce((sum, material) => (
          sum + (Number(material.consumeQty) || 0) * (Number(material.avgPrice) || 0)
        ), 0).toFixed(2),
        warehouseName: order.materialWarehouse || order.warehouse || '主仓库',
        warehouse: order.materialWarehouse || order.warehouse || '主仓库',
        supplierPurchaserCustomerName: order.customer || '企业自加工',
        customerName: order.customer || '企业自加工',
        relNo: order.id,
        status: 'PENDING',
        creator: order.operator || '管理员',
        remark: order.remark || '加工原料出库',
        attachments: [],
        operationLogs: buildPendingOperationLogs(order, 'outbound'),
        items: buildOutboundItems(order)
      });
      saveDocumentCollection('procurement-outbound-orders', outboundOrders);
    } else {
      const outboundOrder = outboundOrders.find((item) => item.id === outboundId);
      if (outboundOrder && outboundOrder.relNo === order.id) {
        outboundOrder.items = buildOutboundItems(order);
        outboundOrder.outboundAmt = outboundOrder.items.reduce((sum, item) => sum + Number(item.amount), 0).toFixed(2);
        if (!outboundOrder.operationLogs) outboundOrder.operationLogs = buildOperationLogs(order, 'outbound');
        if (!outboundOrder.attachments) outboundOrder.attachments = [];
        saveDocumentCollection('procurement-outbound-orders', outboundOrders);
      }
    }

    return { ...order, inboundOrderId: inboundId, outboundOrderId: outboundId, customerCode };
  }

  window.ProcessingService = {
    getList() {
      const orders = load().map(ensureRelatedDocuments);
      save(orders);
      return clone(orders);
    },
    getDetail(id) {
      return this.getList().find((order) => order.id === id) || null;
    },
    create(data) {
      const orders = load();
      const now = new Date();
      const customerCode = getCustomerCode(data);
      const created = {
        ...data,
        customerCode,
        id: generateId(data.processingDate, customerCode, orders),
        status: normalizeStatus(data.status || (getConfig().auditEnabled ? 'PENDING_AUDIT' : 'COMPLETED')),
        operator: data.operator || '管理员',
        createTime: window.BusinessRules.now(now)
      };
      const normalized = normalizeOrder(created, orders.length);
      if (!normalized) {
        const error = new Error('加工单原料、产出数量和成本信息不完整');
        error.code = 'INVALID_PROCESSING_DATA';
        throw error;
      }
      window.BusinessRules.assertValid('processingOrders', normalized);
      orders.unshift(normalized);
      save(orders);
      return clone(normalized);
    },
    update(id, data) {
      const orders = load();
      const index = orders.findIndex((order) => order.id === id);
      if (index < 0) return null;
      orders[index] = ensureRelatedDocuments({ ...orders[index], ...data, id: orders[index].id });
      save(orders);
      return clone(orders[index]);
    },
    submitEdited(id, data) {
      const orders = load();
      const index = orders.findIndex((order) => order.id === id);
      if (index < 0 || !['PENDING_CONFIRM', 'DRAFT', 'REJECTED'].includes(orders[index].status)) return null;

      const now = window.BusinessRules.now();
      const nextStatus = getConfig().auditEnabled ? 'PENDING_AUDIT' : 'COMPLETED';
      const currentStatus = orders[index].status;
      const updated = normalizeOrder({
        ...orders[index],
        ...data,
        id: orders[index].id,
        status: nextStatus,
        submittedAt: now,
        auditedAt: '',
        auditResult: ''
      }, index);
      if (!updated) return null;

      updated.operationLogs = [
        ...(updated.operationLogs || []),
        {
          action: currentStatus === 'REJECTED' ? '重新提交审核' : '编辑后提交审核',
          operator: updated.operator || '管理员',
          desc: `${updated.operator || '管理员'} ${currentStatus === 'REJECTED' ? '修改后重新提交审核' : '编辑后提交审核'} ${now}`
        }
      ];
      orders[index] = ensureRelatedDocuments(updated);
      save(orders);
      if (orders[index].status === 'COMPLETED') applyProcessedQuantities(orders[index]);
      return clone(orders[index]);
    },
    resubmit(id, data) {
      const current = this.getDetail(id);
      if (!current || current.status !== 'REJECTED') return null;
      return this.submitEdited(id, data);
    },
    getConfig() {
      return getConfig();
    },
    setAuditEnabled(enabled) {
      return saveConfig({ auditEnabled: Boolean(enabled) });
    },
    submit(id) {
      const orders = load();
      const index = orders.findIndex((order) => order.id === id);
      if (index < 0 || !['PENDING_CONFIRM', 'DRAFT'].includes(orders[index].status)) return null;
      const now = window.BusinessRules.now();
      orders[index] = ensureRelatedDocuments({
        ...orders[index],
        status: getConfig().auditEnabled ? 'PENDING_AUDIT' : 'COMPLETED',
        submittedAt: now
      });
      save(orders);
      if (orders[index].status === 'COMPLETED') applyProcessedQuantities(orders[index]);
      return clone(orders[index]);
    },
    audit(id, approved) {
      const orders = load();
      const index = orders.findIndex((order) => order.id === id);
      if (index < 0 || orders[index].status !== 'PENDING_AUDIT') return null;
      const now = window.BusinessRules.now();
      orders[index] = ensureRelatedDocuments({
        ...orders[index],
        status: approved ? 'COMPLETED' : 'REJECTED',
        auditedAt: now,
        auditResult: approved ? '通过' : '驳回'
      });
      save(orders);
      if (approved) applyProcessedQuantities(orders[index]);
      return clone(orders[index]);
    },
    remove(id) {
      const orders = load();
      const filtered = orders.filter((order) => order.id !== id);
      save(filtered);
      return filtered.length < orders.length;
    },
    getProducts() {
      return window.ProductService ? window.ProductService.getList() : [];
    }
  };
})();
