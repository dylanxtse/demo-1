(function () {
  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  const supplierProductsResource = 'supplierProductsBySupplier';
  const defaultSupplier = { id: 'SUP-004', name: '南皮供应商01' };

  function isSupplierContext() {
    if (typeof document === 'undefined') return false;
    return document.body?.dataset.userEnd === 'supplier'
      || new URLSearchParams(window.location?.search || '').get('from') === 'supplier';
  }

  function currentSupplier() {
    const bodySupplierId = typeof document !== 'undefined' ? document.body?.dataset.supplierId : '';
    const bodySupplierName = typeof document !== 'undefined' ? document.body?.dataset.supplierName : '';
    const session = window.DemoStore?.getSession?.() || {};
    const supplierId = bodySupplierId || session.supplierId || defaultSupplier.id;
    const supplierName = bodySupplierName || session.supplierName || defaultSupplier.name;
    return { id: supplierId, name: supplierName };
  }

  function supplierBucket() {
    const value = window.DemoStore.get(supplierProductsResource);
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  }

  function seedSupplierProducts(supplier) {
    const sourceProducts = window.DemoStore.get('products') || [];
    return sourceProducts
      .filter((product) => product && (product.code || product.id))
      .map((product, index) => ({
        ...clone(product),
        id: `${supplier.id}-${product.code || product.id}`,
        code: `SSP${String(index + 1).padStart(5, '0')}`,
        seq: index + 1,
        supplierId: supplier.id,
        supplierName: supplier.name,
        source: '供应商添加',
        status: window.BusinessRules.normalizeStatus('products', product.status)
      }));
  }

  function loadRaw() {
    if (!window.DemoStore) throw new Error('统一数据仓库未加载');
    const supplier = currentSupplier();
    if (!isSupplierContext()) return window.DemoStore.get('products') || [];
    const bucket = supplierBucket();
    if (!Array.isArray(bucket[supplier.id])) {
      bucket[supplier.id] = seedSupplierProducts(supplier);
      window.DemoStore.replace(supplierProductsResource, bucket);
    }
    return bucket[supplier.id];
  }

  function load() {
    return loadRaw().filter((product) => product && (product.code || product.id)).map((product, index) => ({
      ...product,
      seq: product.seq ?? index + 1,
      isNetVegetable: product.isNetVegetable ?? product.name === '土豆丝',
      purchaseType: product.purchaseType,
      defaultSupplier: product.defaultSupplier || '平台默认供应商',
      responsible: product.responsible || '管理员',
      source: product.source || '平台添加',
      addTime: window.BusinessRules.normalizeDateTime(product.addTime || window.BusinessRules.now()),
      shelfLife: product.shelfLife === false || product.shelfLife == null ? '' : product.shelfLife
    }));
  }

  function save(products) {
    if (!isSupplierContext()) {
      window.DemoStore.replace('products', products);
      return;
    }
    const supplier = currentSupplier();
    const bucket = supplierBucket();
    bucket[supplier.id] = products;
    window.DemoStore.replace(supplierProductsResource, bucket);
  }

  window.ProductService = {
    getList() {
      return load();
    },
    getDetail(id) {
      return load().find((product) => product.code === id) || null;
    },
    create(data) {
      const products = load();
      const supplier = currentSupplier();
      const nextNumber = products.reduce((maximum, product) => {
        const number = Number(String(product.code).replace(/\D/g, '')) || 0;
        return Math.max(maximum, number);
      }, 0) + 1;
      const now = new Date();
      const created = {
        ...data,
        seq: products.length + 1,
        code: `${isSupplierContext() ? 'SSP' : 'SP'}${String(nextNumber).padStart(7, '0')}`,
        status: 'DISABLE',
        source: isSupplierContext() ? '供应商添加' : '平台添加',
        ...(isSupplierContext() ? { supplierId: supplier.id, supplierName: supplier.name } : {}),
        addTime: window.BusinessRules.now(now)
      };
      window.BusinessRules.assertValid('products', created);
      products.unshift(created);
      products.forEach((product, index) => { product.seq = index + 1; });
      save(products);
      return clone(created);
    },
    update(id, data) {
      const products = load();
      const index = products.findIndex((product) => product.code === id);
      if (index < 0) return null;
      products[index] = {
        ...products[index],
        ...data,
        code: products[index].code,
        id: products[index].id || products[index].code,
        status: window.BusinessRules.normalizeStatus('products', data.status || products[index].status)
      };
      window.BusinessRules.assertValid('products', products[index]);
      save(products);
      return clone(products[index]);
    },
    remove(id) {
      const products = load();
      const index = products.findIndex((product) => product.code === id);
      if (index < 0) return null;
      if (isSupplierContext()) {
        const removed = products.splice(index, 1)[0];
        products.forEach((product, productIndex) => { product.seq = productIndex + 1; });
        save(products);
        return clone(removed);
      }
      const snapshot = window.DemoStore.snapshot();
      const referenced = ['orders', 'inboundOrders', 'outboundOrders', 'processingOrders'].some((resource) =>
        (snapshot[resource] || []).some((record) => [
          ...(record.items || []),
          ...(record.materials || []),
          ...(record.outputs || [])
        ].some((line) => (line.productId || line.productCode || line.goodsCode) === id))
      );
      if (referenced) {
        const error = new Error('商品已被业务单据引用，不能删除');
        error.code = 'PRODUCT_REFERENCED';
        throw error;
      }
      const removed = products.splice(index, 1)[0];
      save(products);
      return clone(removed);
    }
  };
})();
