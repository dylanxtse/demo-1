(function () {
  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function load() {
    if (!window.DemoStore) throw new Error('统一数据仓库未加载');
    return window.DemoStore.get('outboundOrders');
  }

  function save(orders) {
    window.DemoStore.replace('outboundOrders', orders);
  }

  function generateId(data, orders) {
    return window.BusinessRules.documentNumber('outboundOrders', {
      date: data.outboundTime || window.BusinessRules.now(),
      businessCode: data.customerCode || data.warehouseCode || '03',
      records: orders,
      fields: ['id', 'outboundOrderId']
    });
  }

  function normalize(data, current = {}) {
    const items = clone(data.items || current.items || []).map((item) => {
      const quantity = Number(item.outboundQty ?? item.actualQty ?? item.quantity ?? 0);
      const unitPrice = Number(item.unitPrice || 0);
      return {
        ...item,
        productId: item.productId || item.productCode || item.goodsCode || '',
        productCode: item.productCode || item.productId || item.goodsCode || '',
        outboundQty: quantity,
        amount: Number((quantity * unitPrice).toFixed(2))
      };
    });
    const customerName = data.supplierPurchaserCustomerName || data.customerName
      || current.supplierPurchaserCustomerName || current.customerName || '';
    const normalizedCustomerName = customerName === '--' ? '' : String(customerName).trim();
    return {
      ...current,
      ...clone(data),
      items,
      customerName: normalizedCustomerName,
      supplierPurchaserCustomerName: normalizedCustomerName,
      warehouseName: data.warehouseName || current.warehouseName || data.warehouse || '中心仓',
      outboundTime: window.BusinessRules.normalizeDateTime(data.outboundTime || current.outboundTime || window.BusinessRules.now()),
      outboundAmt: window.BusinessRules.totalAmount(items, ['outboundQty']),
      status: window.BusinessRules.normalizeStatus('outboundOrders', data.status || current.status || 'PENDING_AUDIT')
    };
  }

  window.OutboundService = {
    getList() {
      return load();
    },
    getDetail(id) {
      return load().find((order) => order.id === id) || null;
    },
    create(data) {
      const orders = load();
      const created = normalize({
        ...data,
        outboundTime: data.outboundTime || window.BusinessRules.now(),
        status: data.status || 'PENDING_AUDIT',
        creator: data.creator || '杨',
      });
      created.id = generateId(created, orders);
      created.outboundOrderId = created.id;
      window.BusinessRules.assertValid('outboundOrders', created);
      orders.unshift(created);
      save(orders);
      return clone(created);
    },
    update(id, data) {
      const orders = load();
      const index = orders.findIndex((order) => order.id === id);
      if (index < 0) return null;
      orders[index] = normalize(data, orders[index]);
      orders[index].id = id;
      orders[index].outboundOrderId = id;
      window.BusinessRules.assertValid('outboundOrders', orders[index]);
      save(orders);
      return clone(orders[index]);
    },
    remove(id) {
      const orders = load();
      const filtered = orders.filter((order) => order.id !== id);
      save(filtered);
      return filtered.length < orders.length;
    },
    audit(id) {
      const current = this.getDetail(id);
      if (!current) return null;
      if (current.orderId && window.OrderFlowService) {
        return window.OrderFlowService.transition('outboundOrders', id, 'complete');
      }
      const updated = this.update(id, { status: 'COMPLETED', auditAt: window.BusinessRules.now() });
      if (updated && current.status !== 'COMPLETED' && window.InventoryLedgerService) {
        (updated.items || []).forEach((item) => {
          const qty = Number(item.outboundQty || item.quantity || 0);
          if (qty <= 0) return;
          window.InventoryLedgerService.outbound({
            productId: item.productId || item.productCode,
            warehouse: updated.warehouseName || updated.warehouse,
            qty,
            unit: item.unit,
            unitPrice: item.unitPrice,
            orderId: updated.orderId || '',
            orderLineId: item.orderLineId || '',
            remark: `出库单 ${updated.id}`
          });
        });
      }
      return updated;
    },
    close(id) {
      return this.update(id, { status: 'CLOSED' });
    },
    getProducts() {
      return window.ProductService ? window.ProductService.getList() : [];
    }
  };
})();
