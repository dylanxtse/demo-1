(function () {
  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function load() {
    if (!window.DemoStore) throw new Error('统一数据仓库未加载');
    return window.DemoStore.get('inboundOrders');
  }

  function save(orders) {
    window.DemoStore.replace('inboundOrders', orders);
  }

  function generateId(data, orders) {
    return window.BusinessRules.documentNumber('inboundOrders', {
      date: data.entryTime || window.BusinessRules.now(),
      businessCode: data.customerCode || data.warehouseCode || '03',
      records: orders,
      fields: ['id']
    });
  }

  function normalize(data, current = {}) {
    const items = clone(data.items || current.items || []).map((item) => {
      const quantity = Number(item.actualQty ?? item.entryQty ?? item.expectedQty ?? 0);
      const unitPrice = Number(item.unitPrice || 0);
      return {
        ...item,
        productId: item.productId || item.productCode || item.goodsCode || '',
        productCode: item.productCode || item.productId || item.goodsCode || '',
        actualQty: quantity,
        amount: Number((quantity * unitPrice).toFixed(2))
      };
    });
    const counterparty = data.supplierPurchaserCustomerName || current.supplierPurchaserCustomerName || data.supplierName || '';
    return {
      ...current,
      ...clone(data),
      items,
      entryTime: window.BusinessRules.normalizeDateTime(data.entryTime || current.entryTime || window.BusinessRules.now()),
      supplierPurchaserCustomerName: counterparty === '--' ? '' : String(counterparty).trim(),
      warehouseName: data.warehouseName || current.warehouseName || data.warehouse || '中心仓',
      entryAmt: window.BusinessRules.totalAmount(items, ['actualQty']),
      status: window.BusinessRules.normalizeStatus('inboundOrders', data.status || current.status || 'PENDING_AUDIT')
    };
  }

  window.InboundService = {
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
        entryTime: data.entryTime || window.BusinessRules.now(),
        status: data.status || 'PENDING_AUDIT',
        creator: data.creator || '杨',
      });
      created.id = generateId(created, orders);
      window.BusinessRules.assertValid('inboundOrders', created);
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
      window.BusinessRules.assertValid('inboundOrders', orders[index]);
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
      const updated = this.update(id, { status: 'COMPLETED' });
      if (updated && current.status !== 'COMPLETED' && window.InventoryLedgerService) {
        (updated.items || []).forEach((item) => {
          const qty = Number(item.actualQty || item.entryQty || item.expectedQty || 0);
          if (qty <= 0) return;
          window.InventoryLedgerService.inbound({
            productId: item.productId || item.productCode,
            warehouse: updated.warehouseName || updated.warehouse,
            qty,
            unit: item.unit,
            unitPrice: item.unitPrice,
            orderId: updated.orderId || '',
            orderLineId: item.orderLineId || '',
            remark: `入库单 ${updated.id}`
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
