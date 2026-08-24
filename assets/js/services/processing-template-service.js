(function () {
  const outputLimit = 200;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function formatNow() {
    return window.BusinessRules.now();
  }

  function getActionMeta(template) {
    const actionType = template.lastActionType || 'created';
    const actionAt = template.lastActionAt || template.updatedAt || template.createTime || '';
    const priority = { processed: 3, created: 2, edited: 1 }[actionType] || 0;
    const actionTime = Date.parse(String(actionAt).replace(/-/g, '/')) || 0;
    return { priority, actionTime };
  }

  function sortTemplates(templates) {
    return templates.slice().sort((a, b) => {
      const actionA = getActionMeta(a);
      const actionB = getActionMeta(b);
      if (actionA.priority !== actionB.priority) return actionB.priority - actionA.priority;
      return actionB.actionTime - actionA.actionTime;
    });
  }

  function normalizeWarehouseName(warehouse) {
    const source = String(warehouse || '').trim();
    if (!source) return '';
    const masterWarehouses = (window.DemoStore?.get('warehouses') || [])
      .map((item) => item.warehouseName || item.name)
      .filter(Boolean);
    if (masterWarehouses.includes(source)) return source;
    const legacyAliases = {
      主仓库: '中心仓',
      分仓库A: '北区仓',
      分仓库B: '临时仓'
    };
    const alias = legacyAliases[source];
    return alias && masterWarehouses.includes(alias) ? alias : source;
  }

  function normalizeWarehouseRows(rows) {
    return (Array.isArray(rows) ? rows : []).map((row) => ({
      ...row,
      warehouse: normalizeWarehouseName(row.warehouse)
    }));
  }

  function normalizeTemplate(template) {
    const materials = normalizeWarehouseRows(Array.isArray(template.materials) ? template.materials.slice(0, 1) : []);
    const outputs = normalizeWarehouseRows(Array.isArray(template.outputs) ? template.outputs.slice(0, outputLimit) : []);
    const materialWarehouse = normalizeWarehouseName(template.materialWarehouse || materials[0]?.warehouse || '');
    const outputWarehouse = normalizeWarehouseName(template.outputWarehouse || outputs.find((item) => item.warehouse)?.warehouse || materialWarehouse);
    return {
      ...template,
      materialWarehouse,
      outputWarehouse,
      materials: materials.map((item) => ({ ...item, warehouse: materialWarehouse })),
      outputs: outputs.map((item) => ({ ...item, warehouse: outputWarehouse }))
    };
  }

  function load() {
    if (!window.DemoStore) throw new Error('统一数据仓库未加载');
    const templates = window.DemoStore.get('processingTemplates') || [];
    const normalizedTemplates = clone(templates).map(normalizeTemplate);
    if (JSON.stringify(normalizedTemplates) !== JSON.stringify(templates)) {
      window.DemoStore.replace('processingTemplates', normalizedTemplates);
    }
    return sortTemplates(normalizedTemplates);
  }

  function save(templates) {
    window.DemoStore.replace('processingTemplates', templates);
  }

  function generateId() {
    const templates = load();
    const maxNum = templates.reduce((max, t) => {
      const num = parseInt(t.id.replace('MB', ''), 10);
      return num > max ? num : max;
    }, 0);
    return `MB${String(maxNum + 1).padStart(3, '0')}`;
  }

  window.ProcessingTemplateService = {
    getList() {
      return load();
    },
    getDetail(id) {
      return load().find((t) => t.id === id) || null;
    },
    create(data) {
      const templates = load();
      const createdAt = formatNow();
      const created = normalizeTemplate({
        ...data,
        id: generateId(),
        createTime: createdAt,
        lastActionType: 'created',
        lastActionAt: createdAt
      });
      templates.push(created);
      save(templates);
      return clone(created);
    },
    update(id, data) {
      const templates = load();
      const index = templates.findIndex((t) => t.id === id);
      if (index < 0) return null;
      templates[index] = normalizeTemplate({
        ...templates[index],
        ...data,
        id: templates[index].id,
        lastActionType: 'edited',
        lastActionAt: formatNow(),
        updatedAt: formatNow()
      });
      save(templates);
      return clone(templates[index]);
    },
    markProcessed(id) {
      const templates = load();
      const index = templates.findIndex((template) => template.id === id);
      if (index < 0) return null;
      const lastActionAt = formatNow();
      templates[index] = {
        ...templates[index],
        lastActionType: 'processed',
        lastActionAt,
        lastProcessedAt: lastActionAt
      };
      save(templates);
      return clone(templates[index]);
    },
    remove(id) {
      const templates = load();
      const filtered = templates.filter((t) => t.id !== id);
      save(filtered);
      return filtered.length < templates.length;
    }
  };
})();
