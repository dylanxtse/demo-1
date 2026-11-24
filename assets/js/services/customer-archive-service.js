(function () {
  const store = window.DemoStore;
  const text = (value) => String(value ?? '').trim();
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const schoolSeeds = [
    ['SCH-001', '31010610002', '静安第1中学', 'JA10001'], ['SCH-002', '31010600003', '静安第2中学', 'JA10002'],
    ['SCH-003', '31010600012', '静安第11中学', 'JA10011'], ['SCH-004', '31010600004', '静安第3中学', 'JA10003'],
    ['SCH-005', '31010630073', '静安第一小学', 'JA10004'], ['SCH-006', '31010600005', '静安第4中学', 'JA10005'],
    ['SCH-007', '31010600006', '静安第5中学', 'JA10006'], ['SCH-008', '31010600020', '静安第19中学', 'JA10019']
  ].map(([id, code, name, username]) => ({ id, code, name, username, type: '学校' }));
  function types(state = store.snapshot()) {
    const definitions = Array.isArray(state.customerTypes) ? state.customerTypes.map((row) => ({ id: row.id, name: row.name || row.typeName, status: row.status })) : [
      { id: 'CT-DEFAULT', name: '默认客户类型（全部商品）' }, { id: 'CT-SCHOOL', name: '产品部学校食材集采客户类型' }
    ];
    for (const customer of state.customers) {
      const name = customer.customerTypeName || customer.type;
      if (name && !definitions.some((row) => row.name === name || row.id === customer.customerTypeId)) definitions.push({ id: `legacy:${name}`, name });
    }
    return definitions.filter((row) => row.id && row.name);
  }
  function schools() {
    const state = store.snapshot();
    const rows = Array.isArray(state.schools) ? state.schools : schoolSeeds;
    return rows.map((row) => ({ ...row, id: row.id || row.schoolId, name: row.name || row.schoolName,
      code: row.code || row.schoolCode, username: row.username || '' })).filter((row) => row.id && row.name && row.code && row.status !== 'DISABLE');
  }
  function enrich(row, state = store.snapshot()) {
    const location = state.customerLocations.find((item) => item.customerId === row.id && item.isDefault)
      || state.customerLocations.find((item) => item.customerId === row.id) || {};
    const order = state.orders.find((item) => item.customerId === row.id || item.customerName === row.customerName) || {};
    const warehouseName = row.warehouse || location.warehouse || order.warehouse || '';
    const warehouse = state.warehouses.find((item) => item.id === (row.warehouseId || location.warehouseId))
      || state.warehouses.find((item) => item.warehouseName === warehouseName);
    const kind = types(state).find((item) => item.id === row.customerTypeId);
    return { ...row, customerName: row.customerName || row.name || '', username: row.username || '',
      customerTypeId: row.customerTypeId || `legacy:${row.customerTypeName || row.type}`,
      customerTypeName: row.customerTypeName || kind?.name || row.type || '',
      warehouseId: warehouse?.id || '', warehouse: warehouse?.warehouseName || warehouseName,
      receiver: row.receiver ?? location.receiver ?? '', phone: row.phone ?? location.phone ?? '', address: row.address ?? location.address ?? '',
      additionMethod: row.additionMethod || (/^KH\d+$/.test(row.customerCode) ? '手动添加' : '关联') };
  }
  function validate(data, id = '') {
    const errors = {};
    const old = id ? service.get(id) : null;
    const linked = (old?.additionMethod || data.additionMethod) === '关联';
    const school = !id && linked ? schools().find((row) => row.id === data.schoolId) : null;
    const name = school?.name || text(data.customerName);
    if (!id && linked && !school) errors.schoolId = '请选择学校客户';
    if ((id || !linked) && !name) errors.customerName = '请输入客户名称';
    if (!linked && !old && !/^[A-Za-z0-9]{6,20}$/.test(text(data.username))) errors.username = '请输入6~20位由字母、数字组成的用户名';
    const customers = store.get('customers');
    const kingdeeId = text(old ? old.kingdeeCustomerId : data.kingdeeCustomerId);
    if (kingdeeId && customers.some((row) => row.id !== id && text(row.kingdeeCustomerId) === kingdeeId)) errors.kingdeeCustomerId = '金蝶客户id已存在';
    if (customers.some((row) => row.id !== id && (row.customerName || row.name) === name)) errors.customerName = '客户名称已存在';
    if (!id && school && customers.some((row) => row.schoolId === school.id || row.customerCode === school.code)) errors.schoolId = '该学校已关联，请勿重复添加';
    if (!old && !linked && customers.some((row) => row.username && row.username.toLowerCase() === text(data.username).toLowerCase())) errors.username = '用户名已存在';
    const type = types().find((row) => row.id === data.customerTypeId);
    if (!type || (type.status === 'DISABLE' && type.id !== old?.customerTypeId)) errors.customerTypeId = '请选择客户类型';
    const warehouse = store.get('warehouses').find((row) => row.id === data.warehouseId);
    if (!warehouse || (warehouse.status === 'DISABLE' && warehouse.id !== old?.warehouseId)) errors.warehouseId = '请选择仓库';
    if (!text(data.receiver)) errors.receiver = '请输入收货人';
    if (!/^1[3-9]\d{9}$/.test(text(data.phone))) errors.phone = '请输入正确的收货手机';
    if (!text(data.address)) errors.address = '请输入收货地址';
    else if (text(data.address).length > 50) errors.address = '收货地址不能超过50个字';
    return errors;
  }
  const service = {
    types,
    warehouses() { return store.get('warehouses'); },
    schools(includeId = '') {
      const customers = store.get('customers');
      return schools().filter((school) => school.id === includeId || !customers.some((row) => row.schoolId === school.id || row.customerCode === school.code || row.customerName === school.name));
    },
    list(condition = {}) {
      const state = store.snapshot();
      return state.customers.map((row) => enrich(row, state)).filter((row) =>
        (!condition.customerCode || row.customerCode.includes(text(condition.customerCode)))
        && (!condition.customerName || row.customerName.includes(text(condition.customerName)))
        && (!condition.customerTypeId || row.customerTypeId === condition.customerTypeId)
        && (!condition.warehouseId || row.warehouseId === condition.warehouseId)
        && (!condition.additionMethod || row.additionMethod === condition.additionMethod));
    },
    get(id) { const state = store.snapshot(); const row = state.customers.find((item) => item.id === id); return row ? enrich(row, state) : null; },
    validate,
    save(data, id = '') {
      const old = id ? this.get(id) : null;
      if (id && !old) throw new Error('客户不存在或已删除');
      const errors = validate(data, id);
      if (Object.keys(errors).length) { const error = new Error(Object.values(errors)[0]); error.fields = errors; throw error; }
      const additionMethod = old?.additionMethod || (data.additionMethod === '手动添加' ? '手动添加' : '关联');
      const school = !id && additionMethod === '关联' ? schools().find((row) => row.id === data.schoolId) : null;
      const type = types().find((row) => row.id === data.customerTypeId);
      const warehouse = store.get('warehouses').find((row) => row.id === data.warehouseId);
      return store.transact((state) => {
        let customer = id ? state.customers.find((row) => row.id === id) : null;
        if (!customer) {
          const counters = state.customerArchiveCounters || (state.customerArchiveCounters = {});
          const usedIds = state.customers.map((row) => Number(String(row.id).match(/^CUS-(\d+)$/)?.[1]) || 0);
          const sequence = Math.max(counters.id || 0, ...usedIds) + 1;
          counters.id = sequence;
          let code = school?.code;
          if (!code) {
            const codes = state.customers.map((row) => Number(String(row.customerCode).match(/^KH(\d+)$/)?.[1]) || 0);
            counters.manual = Math.max(counters.manual || 0, ...codes) + 1;
            code = `KH${String(counters.manual).padStart(5, '0')}`;
          }
          customer = { id: `CUS-${String(sequence).padStart(3, '0')}`, customerId: `CUS-${String(sequence).padStart(3, '0')}`,
            customerCode: code, status: 'ENABLE', username: school?.username || text(data.username), schoolId: school?.id || '',
            type: school?.type || '其他单位', additionMethod, kingdeeCustomerId: text(data.kingdeeCustomerId), password: '1234567Aa', createdAt: window.BusinessRules.now() };
          state.customers.unshift(customer);
        }
        const name = school?.name || text(data.customerName);
        if (customer.customerName && customer.customerName !== name) customer.previousNames = [...new Set([...(customer.previousNames || []), customer.customerName])];
        Object.assign(customer, { name, customerName: name, customerTypeId: type.id, customerTypeName: type.name,
          warehouseId: warehouse.id, warehouse: warehouse.warehouseName, receiver: text(data.receiver), phone: text(data.phone),
          address: text(data.address), updatedAt: window.BusinessRules.now() });
        const locations = state.customerLocations.filter((row) => row.customerId === customer.id);
        const primary = locations.find((row) => row.isDefault) || locations[0];
        locations.forEach((location) => { location.customerName = name; });
        const delivery = { customerId: customer.id, customerName: name, warehouseId: warehouse.id, warehouse: warehouse.warehouseName,
          receiver: customer.receiver, phone: customer.phone, address: customer.address };
        if (primary) Object.assign(primary, delivery);
        else state.customerLocations.push({ ...delivery, id: `LOC-${customer.id}-DEFAULT`, canteen: '默认', route: '', isDefault: true });
        return customer;
      });
    },
    setStatus(id, status) {
      if (!['ENABLE', 'DISABLE'].includes(status)) throw new Error('客户状态不正确');
      return store.transact((state) => { const row = state.customers.find((item) => item.id === id); if (!row) throw new Error('客户不存在'); row.status = status; return row; });
    },
    resetPassword(id) {
      return store.transact((state) => {
        const row = state.customers.find((item) => item.id === id);
        if (!row?.username) throw new Error('该客户未设置用户名，无法重置密码');
        row.password = '1234567Aa'; row.passwordResetAt = window.BusinessRules.now(); return row;
      });
    },
    remove(id) {
      const row = this.get(id);
      if (!row) throw new Error('客户不存在或已删除');
      const state = store.snapshot(), names = new Set([row.customerName, ...(row.previousNames || [])]);
      if (['orders', 'shippingOrders', 'outboundOrders', 'returns', 'receiptChanges'].some((key) => (state[key] || []).some((item) => item.customerId === id || names.has(item.customerName)))) throw new Error('该客户已被业务单据引用，无法删除');
      return store.transact((state) => {
        state.customers = state.customers.filter((item) => item.id !== id);
        state.customerLocations = state.customerLocations.filter((item) => item.customerId !== id);
        return row;
      });
    }
  };
  window.CustomerArchiveService = service;
})();
