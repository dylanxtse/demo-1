(function () {
  const store = window.DemoStore;
  const text = (value) => String(value ?? '').trim();
  function warehouseKey(key) { return /warehouse(?:id|name|code)?$/i.test(key); }
  function referenced(warehouse) {
    if (warehouse.referenced) return true;
    const targets = new Set([warehouse.id, warehouse.warehouseId, warehouse.warehouseCode, warehouse.warehouseName].filter(Boolean));
    const check = (value) => {
      if (!value || typeof value !== 'object') return false;
      if (Array.isArray(value)) return value.some(check);
      return Object.entries(value).some(([key, item]) => (warehouseKey(key) && targets.has(item)) || (item && typeof item === 'object' && check(item)));
    };
    return Object.entries(store.snapshot()).some(([key, value]) => key !== 'warehouses' && check(value));
  }
  window.WarehouseArchiveService = {
    list(condition = {}) {
      const [start, end] = condition.dateRange || [];
      return store.get('warehouses').filter((row) => (!condition.warehouseCode || row.warehouseCode.includes(text(condition.warehouseCode)))
        && (!condition.warehouseName || row.warehouseName.includes(text(condition.warehouseName)))
        && (!start || String(row.createdAt || '').slice(0, 10) >= start) && (!end || String(row.createdAt || '').slice(0, 10) <= end))
        .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    },
    get(id) { return store.get('warehouses').find((row) => row.id === id) || null; },
    isReferenced(id) { const row = this.get(id); if (!row) throw new Error('仓库不存在或已删除'); return referenced(row); },
    save(data, id = '') {
      const name = text(data.warehouseName), address = text(data.address), warehouses = store.get('warehouses');
      if (!name) throw new Error('请输入仓库名称');
      if (warehouses.some((row) => row.id !== id && row.warehouseName.toLocaleLowerCase() === name.toLocaleLowerCase())) throw new Error('仓库名称已存在');
      if (id && !warehouses.some((row) => row.id === id)) throw new Error('仓库不存在或已删除');
      const kingdeeId = text(id ? warehouses.find((row) => row.id === id).kingdeeWarehouseId : data.kingdeeWarehouseId);
      if (kingdeeId && warehouses.some((row) => row.id !== id && text(row.kingdeeWarehouseId) === kingdeeId)) throw new Error('金蝶仓库id已存在');
      return store.transact((state) => {
        const now = window.BusinessRules.now();
        if (id) {
          const row = state.warehouses.find((item) => item.id === id), previousName = row.warehouseName;
          Object.assign(row, { warehouseName: name, address, updatedAt: now });
          if (previousName !== name) {
            const update = (value) => {
              if (!value || typeof value !== 'object') return;
              for (const [key, item] of Object.entries(value)) {
                if (/warehouse(?:name)?$/i.test(key) && item === previousName) value[key] = name;
                else if (item && typeof item === 'object') update(item);
              }
            };
            for (const [key, value] of Object.entries(state)) if (key !== 'warehouses') update(value);
          }
          return row;
        }
        state.warehouseArchiveCounter = Math.max(state.warehouseArchiveCounter || 0, ...state.warehouses.map((row) => Number(String(row.id).match(/^WH-(\d+)$/)?.[1]) || 0)) + 1;
        const warehouseId = `WH-${String(state.warehouseArchiveCounter).padStart(3, '0')}`;
        const company = state.companies.find((row) => row.id === state.session.companyId);
        const enterpriseCode = window.BusinessRules.warehouseEnterpriseCode(company?.code, '01');
        const row = { id: warehouseId, warehouseId, warehouseCode: window.BusinessRules.createWarehouseCode(state.warehouses, enterpriseCode), enterpriseCode,
          warehouseName: name, address, kingdeeWarehouseId: kingdeeId, operatingCompanyIds: [], status: 'ENABLE', referenced: false, createdAt: now, updatedAt: now };
        state.warehouses.unshift(row); return row;
      });
    },
    remove(id) {
      const row = this.get(id);
      if (!row) throw new Error('仓库不存在或已删除');
      if (referenced(row)) { const error = new Error('该仓库已被引用无法删除'); error.code = 'WAREHOUSE_REFERENCED'; throw error; }
      return store.transact((state) => { state.warehouses = state.warehouses.filter((item) => item.id !== id); return row; });
    }
  };
})();
