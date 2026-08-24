(function () {
  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function load() {
    if (!window.DemoStore) throw new Error('统一数据仓库未加载');
    return (window.DemoStore.get('products') || []).filter((product) => product && (product.code || product.id)).map((product, index) => ({
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
    window.DemoStore.replace('products', products);
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
      const nextNumber = products.reduce((maximum, product) => {
        const number = Number(String(product.code).replace(/\D/g, '')) || 0;
        return Math.max(maximum, number);
      }, 0) + 1;
      const now = new Date();
      const created = {
        ...data,
        seq: products.length + 1,
        code: `SP${String(nextNumber).padStart(7, '0')}`,
        status: 'DISABLE',
        source: '平台添加',
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
