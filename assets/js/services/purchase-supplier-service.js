(function () {
  const resource = 'purchaseSuppliers';
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const text = (value) => String(value ?? '').trim();
  const seeds = [
    { id: 'PS-001', name: '联营供应商', username: 'joint001', contact: 'ryc', phone: '15700090000', jointSupplier: true },
    { id: 'PS-002', name: '鲜菜源蔬菜批发中心', username: 'pfzx12', contact: '张先生', phone: '15896324562', cooperationStart: '2026-04-16', cooperationEnd: '2026-05-26', jointSupplier: true },
    { id: 'PS-003', name: '每日优选', username: 'mryx001', contact: '李先生', phone: '15689425632' },
    { id: 'PS-004', name: '盒马鲜生', username: 'hmxs001', contact: '王先生', phone: '13265985264', cooperationStart: '2026-04-01', cooperationEnd: '2026-05-23' }
  ].map((row) => ({ status: 'ENABLE', creditCode: '', address: '', businessLicense: null, qualifications: [],
    cooperationStart: '', cooperationEnd: '', jointSupplier: false, hideCustomerPrice: false, password: '1234567Aa', ...row }));

  function rows() {
    const saved = window.DemoStore.snapshot()[resource];
    return Array.isArray(saved) ? saved : clone(seeds);
  }
  function dateValid(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  }
  function validate(data, id = '') {
    const errors = {};
    const existing = rows();
    for (const [key, label] of [['name', '供应商名称'], ['username', '用户名'], ['contact', '联系人'], ['phone', '联系电话']]) {
      if (!text(data[key])) errors[key] = `请输入${label}`;
    }
    if (data.username && !/^[A-Za-z0-9]{6,20}$/.test(data.username)) errors.username = '请输入6~20位由字母、数字组成的用户名';
    if (data.phone && !/^(?:(?:\+?86[- ]?)?1[3-9]\d{9}|0\d{2,3}-?\d{7,8}(?:-\d{1,6})?)$/.test(data.phone)) errors.phone = '请输入正确的联系电话';
    if (existing.some((row) => row.id !== id && row.name === data.name)) errors.name = '供应商名称已存在';
    if (existing.some((row) => row.id !== id && row.username.toLowerCase() === text(data.username).toLowerCase())) errors.username = '用户名已存在';
    if (text(data.kingdeeSupplierId) && existing.some((row) => row.id !== id && text(row.kingdeeSupplierId) === text(data.kingdeeSupplierId))) errors.kingdeeSupplierId = '金蝶供应商id已存在';
    const { cooperationStart: start, cooperationEnd: end } = data;
    if (Boolean(start) !== Boolean(end)) errors.cooperation = '请选择完整的合作期限';
    else if ((start && !dateValid(start)) || (end && !dateValid(end))) errors.cooperation = '合作期限格式不正确';
    else if (start && end && start > end) errors.cooperation = '结束日期不能早于开始日期';
    return errors;
  }
  function normalize(data, previous) {
    return {
      name: text(data.name), username: previous?.username || text(data.username), contact: text(data.contact), phone: text(data.phone),
      kingdeeSupplierId: text(previous ? previous.kingdeeSupplierId : data.kingdeeSupplierId),
      creditCode: text(data.creditCode), address: text(data.address), businessLicense: clone(data.businessLicense || null),
      qualifications: clone(Array.isArray(data.qualifications) ? data.qualifications : []),
      cooperationStart: text(data.cooperationStart), cooperationEnd: text(data.cooperationEnd),
      jointSupplier: previous ? Boolean(previous.jointSupplier) : data.jointSupplier === true,
      hideCustomerPrice: data.hideCustomerPrice === true
    };
  }
  function transact(callback) {
    const initial = rows();
    return window.DemoStore.transact((state) => {
      if (!Array.isArray(state[resource])) state[resource] = initial;
      return callback(state[resource], state);
    });
  }
  function assertValid(data, id) {
    const errors = validate(data, id);
    if (Object.keys(errors).length) {
      const error = new Error(Object.values(errors)[0]);
      error.fields = errors;
      throw error;
    }
  }
  window.PurchaseSupplierService = {
    list(condition = {}) {
      return clone(rows().filter((row) => (!condition.name || row.name.includes(text(condition.name)))
        && (!condition.contact || row.contact.includes(text(condition.contact))) && (!condition.status || row.status === condition.status)));
    },
    get(id) { return clone(rows().find((row) => row.id === id) || null); },
    validate,
    save(data, id = '') {
      const previous = id ? this.get(id) : null;
      if (id && !previous) throw new Error('供应商不存在或已删除');
      const value = normalize(data, previous);
      assertValid(value, id);
      return transact((records) => {
        const now = window.BusinessRules.now();
        if (previous) {
          const current = records.find((row) => row.id === id);
          if (current.name !== value.name) current.previousNames = [...new Set([...(current.previousNames || []), current.name])];
          Object.assign(current, value, { updatedAt: now });
          return current;
        }
        const created = { ...value, id: `PS-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          status: 'ENABLE', password: '1234567Aa', createdAt: now, updatedAt: now };
        records.unshift(created);
        return created;
      });
    },
    setStatus(id, status) {
      if (!['ENABLE', 'DISABLE'].includes(status)) throw new Error('供应商状态不正确');
      return transact((records) => {
        const row = records.find((item) => item.id === id);
        if (!row) throw new Error('供应商不存在或已删除');
        row.status = status;
        row.updatedAt = window.BusinessRules.now();
        return row;
      });
    },
    resetPassword(id) {
      return transact((records) => {
        const row = records.find((item) => item.id === id);
        if (!row) throw new Error('供应商不存在或已删除');
        row.password = '1234567Aa';
        row.passwordResetAt = window.BusinessRules.now();
        return row;
      });
    },
    remove(id) {
      const existing = this.get(id);
      if (!existing) throw new Error('供应商不存在或已删除');
      const state = window.DemoStore.snapshot();
      const references = [...(state.purchaseOrders || []), ...(state.inboundOrders || [])];
      const names = new Set([existing.name, ...(existing.previousNames || [])]);
      if (references.some((row) => row.supplierId === id || names.has(row.supplier) || names.has(row.supplierName)
        || names.has(row.supplierPurchaserCustomerName))) throw new Error('供应商已被采购或入库单据引用，不能删除');
      return transact((records) => records.splice(records.findIndex((row) => row.id === id), 1)[0]);
    }
  };
})();
