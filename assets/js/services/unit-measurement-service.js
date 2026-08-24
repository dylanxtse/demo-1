(function () {
  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function load() {
    if (!window.DemoStore) throw new Error('统一数据仓库未加载');
    return clone(window.DemoStore.get('units') || []);
  }

  function save(items) {
    window.DemoStore.replace('units', items);
  }

  function serviceError(code, message, detail) {
    const error = new Error(message);
    error.code = code;
    error.detail = detail;
    return error;
  }

  function normalizeRate(value) {
    if (value === '' || value == null) return '';
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0.0001 || parsed > 99999) {
      throw serviceError('INVALID_CONVERSION_RATE', '换算率应在 0.0001 至 99999 之间');
    }
    return Number(parsed.toFixed(4));
  }

  function validateName(items, unitName, currentId) {
    const normalized = String(unitName || '').trim();
    if (!normalized) throw serviceError('UNIT_NAME_REQUIRED', '请输入计量单位');
    if (normalized.length > 20) throw serviceError('UNIT_NAME_TOO_LONG', '计量单位最多输入20个字符');
    const duplicate = items.some((item) =>
      item.id !== currentId && item.unitName.toLocaleLowerCase() === normalized.toLocaleLowerCase()
    );
    if (duplicate) throw serviceError('DUPLICATE_UNIT', '计量单位已存在');
    return normalized;
  }

  function nextId(items) {
    const maximum = items.reduce((max, item) => {
      const value = Number(String(item.id).replace(/\D/g, '')) || 0;
      return Math.max(max, value);
    }, 0);
    return `UNIT-${String(maximum + 1).padStart(3, '0')}`;
  }

  window.UnitMeasurementService = {
    async list(query = {}) {
      const page = Math.max(1, Number(query.page) || 1);
      const pageSize = Math.max(1, Number(query.pageSize) || 10);
      const keyword = String(query.condition?.unitName || '').trim().toLocaleLowerCase();
      const filtered = load().filter((item) =>
        !keyword || item.unitName.toLocaleLowerCase().includes(keyword)
      );
      const start = (page - 1) * pageSize;
      return {
        items: clone(filtered.slice(start, start + pageSize)),
        total: filtered.length,
        page,
        pageSize
      };
    },

    async get(id) {
      return clone(load().find((item) => item.id === id) || null);
    },

    async create(data) {
      const items = load();
      const created = {
        id: nextId(items),
        unitName: validateName(items, data.unitName),
        conversionRate: normalizeRate(data.conversionRate),
        status: 'ENABLE',
        linkedProductCount: 0
      };
      items.unshift(created);
      save(items);
      return clone(created);
    },

    async update(id, data) {
      const items = load();
      const index = items.findIndex((item) => item.id === id);
      if (index < 0) throw serviceError('UNIT_NOT_FOUND', '未找到计量单位');
      if (items[index].linkedProductCount > 0) {
        throw serviceError('UNIT_LINKED', '已经关联商品，不能编辑');
      }
      items[index] = {
        ...items[index],
        unitName: validateName(items, data.unitName, id),
        conversionRate: normalizeRate(data.conversionRate)
      };
      save(items);
      return clone(items[index]);
    },

    async remove(id) {
      const items = load();
      const index = items.findIndex((item) => item.id === id);
      if (index < 0) throw serviceError('UNIT_NOT_FOUND', '未找到计量单位');
      if (items[index].linkedProductCount > 0) {
        throw serviceError('UNIT_LINKED', '已经关联商品，不能删除');
      }
      const removed = items.splice(index, 1)[0];
      save(items);
      return clone(removed);
    },

    async transition(id, action) {
      const items = load();
      const item = items.find((entry) => entry.id === id);
      if (!item) throw serviceError('UNIT_NOT_FOUND', '未找到计量单位');
      if (!['enable', 'disable'].includes(action)) {
        throw serviceError('INVALID_ACTION', '不支持的状态操作');
      }
      item.status = action === 'enable' ? 'ENABLE' : 'DISABLE';
      save(items);
      return clone(item);
    },

    async options() {
      return load()
        .filter((item) => item.status === 'ENABLE')
        .map((item) => ({ label: item.unitName, value: item.id, conversionRate: item.conversionRate }));
    },

    async export(query = {}) {
      const result = await this.list({ ...query, page: 1, pageSize: Number.MAX_SAFE_INTEGER });
      const rows = result.items.map((item) => [
        item.unitName,
        item.conversionRate,
        item.status === 'ENABLE' ? '启用' : '禁用'
      ]);
      return [['计量单位', '与KG换算率', '状态'], ...rows]
        .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
        .join('\n');
    },

    async import(rows) {
      const items = load();
      const result = { successCount: 0, failCount: 0, failList: [] };
      rows.forEach((row, index) => {
        try {
          const created = {
            id: nextId(items),
            unitName: validateName(items, row.unitName),
            conversionRate: normalizeRate(row.conversionRate),
            status: 'ENABLE',
            linkedProductCount: 0
          };
          items.unshift(created);
          result.successCount += 1;
        } catch (error) {
          result.failCount += 1;
          result.failList.push(`第${index + 2}行：${error.message}`);
        }
      });
      if (result.successCount > 0) save(items);
      return result;
    }
  };
})();
