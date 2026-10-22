(function () {
  const orderService = window.SchoolOrderService;
  const recipeService = window.SchoolRecipeService;
  const attendanceService = window.SchoolRecipeAttendanceService;
  const canteenConfig = window.SchoolCanteenConfigService;
  if (!orderService) return;

  const draftKey = 'school-recipe-auxiliary-direct-drafts-v1';
  const combinedDraftKey = 'school-recipe-auxiliary-combined-drafts-v1';
  const resource = 'recipeDemandRecords';
  const participant = {
    key: 'all-participants', label: '其他', tagName: '其他', nutritious: '不区分',
    orderTag: '其他-不区分', tagId: 'other-non-nutritious'
  };
  const products = [
    { id: 'aux-oil', auxiliaryName: '油', name: '金龙鱼5L桶装油', brand: '金龙鱼', code: 'SP0300030', spec: '5L/桶', unit: 'L', marketPrice: 55 },
    { id: 'aux-salt', auxiliaryName: '盐', name: '食盐', brand: '—', code: 'SP0300031', spec: '500g/袋', unit: 'kg', marketPrice: 18.5 },
    { id: 'aux-msg', auxiliaryName: '味精', name: '味精', brand: '—', code: 'SP0300032', spec: '250g/袋', unit: 'kg', marketPrice: 8 }
  ];
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const roundQuantity = (value) => Number(Number(value || 0).toFixed(2));
  const timestamp = () => window.BusinessRules?.now?.() || new Date().toISOString().slice(0, 19).replace('T', ' ');
  const canteenFor = (value) => canteenConfig?.getCanteen?.(value) || value || { id: '', name: '第一食堂' };
  const scopeFor = (date, canteen) => `${canteenFor(canteen).id || canteenFor(canteen).name || '第一食堂'}::${date}`;
  const readDrafts = () => window.AppStorage?.read?.(draftKey, {}) || {};
  const readDraft = (date, canteen) => {
    const draft = { ...(readDrafts()[scopeFor(date, canteen)] || {}) };
    if (!mealDefinitionsForDate(date).some((meal) => meal.key === 'afternoonSnack')) return draft;
    Object.entries(draft).forEach(([key, value]) => {
      if (!key.startsWith('snack::')) return;
      const migratedKey = `afternoonSnack::${key.slice('snack::'.length)}`;
      if (!(migratedKey in draft)) draft[migratedKey] = value;
      delete draft[key];
    });
    return draft;
  };
  const writeDraft = (date, canteen, values) => {
    const drafts = readDrafts();
    const scope = scopeFor(date, canteen);
    if (Object.keys(values || {}).length) drafts[scope] = { ...values };
    else delete drafts[scope];
    window.AppStorage?.write?.(draftKey, drafts);
  };
  const mealDefinitionsForDate = (date) => {
    const menus = recipeService?.getAll?.() || [];
    const menu = menus.find((item) => String(item.date || '').slice(0, 10) === String(date));
    return (menu?.meals || [
      { key: 'breakfast', name: '早餐' }, { key: 'lunch', name: '午餐' },
      { key: 'dinner', name: '晚餐' }
    ]).map((meal) => ({ key: String(meal.key || ''), name: meal.name || meal.key })).filter((meal) => meal.key);
  };
  const keyFor = (mealKey, product) => `${mealKey}::${product.code}`;
  const priceFor = (product) => {
    const catalog = (orderService.getProductCatalog?.() || []).find((item) => String(item.code) === product.code) || product;
    const value = Number(orderService.currentSalesPrice?.(catalog) ?? product.marketPrice);
    return Number.isFinite(value) && value > 0 ? value : Number(product.marketPrice);
  };
  const splitByMeal = () => {
    const value = window.DemoStore?.getSettings?.()?.splitOrderByMeal;
    return value !== false && value !== 'false' && value !== 0 && value !== '0';
  };
  const splitByPerson = () => {
    const value = window.DemoStore?.getSettings?.()?.splitOrderByPersonType;
    return value === true || value === 'true' || value === 1 || value === '1';
  };
  const participantsFor = (canteen) => {
    const configured = attendanceService?.participantsFor?.(canteenFor(canteen)) || [];
    return configured.length ? configured : [participant];
  };
  const readFilledDates = (canteen) => {
    const prefix = `${canteenFor(canteen).id || canteenFor(canteen).name || '第一食堂'}::`;
    return Object.keys(readDrafts()).filter((key) => key.startsWith(prefix))
      .map((key) => key.slice(prefix.length))
      .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date) && buildPreview(date, canteen).selectedRows.length)
      .sort();
  };
  const combinedScope = (canteen) => canteenFor(canteen).id || canteenFor(canteen).name || '第一食堂';
  const selectedProductsKey = 'school-recipe-auxiliary-selected-products-v1';
  const catalogProducts = (canteen) => {
    const selectedIds = window.AppStorage?.read?.(selectedProductsKey, {})?.[combinedScope(canteen)];
    const configured = Array.isArray(selectedIds) && selectedIds.length
      ? products.filter((product) => selectedIds.includes(product.id)) : products;
    const maintained = configured.length ? configured : products;
    return maintained.map((product) => ({ ...product, isStandardProduct: false, currentSalesPrice: priceFor(product) }));
  };
  const readCombinedDraft = (canteen) => {
    const saved = window.AppStorage?.read?.(combinedDraftKey, {})?.[combinedScope(canteen)] || {};
    return {
      dates: Array.isArray(saved.dates) ? [...saved.dates] : [],
      quantities: { ...(saved.quantities || {}) }
    };
  };
  const writeCombinedDraft = (canteen, draft) => {
    const all = window.AppStorage?.read?.(combinedDraftKey, {}) || {};
    const scope = combinedScope(canteen);
    if (draft) all[scope] = {
      dates: [...new Set(draft.dates || [])].sort(),
      quantities: { ...(draft.quantities || {}) }
    };
    else delete all[scope];
    window.AppStorage?.write?.(combinedDraftKey, all);
  };

  function buildCombinedPreview(canteen, draft = readCombinedDraft(canteen)) {
    const dates = [...new Set(draft.dates || [])].filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)).sort();
    const rows = catalogProducts(canteen).map((product) => {
      const code = String(product.code);
      const raw = draft.quantities?.[code];
      const orderQty = raw == null || raw === '' ? 0 : Number(raw);
      return {
        key: String(code), productCode: String(code), productName: product.name,
        auxiliaryName: product.auxiliaryName, unit: product.unit, brand: product.brand, spec: product.spec,
        isStandardProduct: product.isStandardProduct === true,
        isNetVegetable: product.isNetVegetable === true,
        orderPrice: Number(product.currentSalesPrice || product.marketPrice), orderQty,
        sourceDates: [...dates], participantQty: { [participant.key]: orderQty },
        participantDates: { [participant.key]: [...dates] }
      };
    });
    const selectedRows = rows.filter((row) => row.orderQty > 0);
    const invalid = rows.find((row) => !Number.isFinite(row.orderQty) || row.orderQty < 0
      || (row.isStandardProduct && !Number.isInteger(row.orderQty)));
    const message = !dates.length ? '请先选择用料日期'
      : invalid ? '采购量需为非负数，标品数量需为整数'
        : !selectedRows.length ? '请至少填写一项大于 0 的采购量' : '';
    return {
      dates, canteen: canteenFor(canteen), participants: [participant], rows, selectedRows,
      meals: [{ key: 'combined', name: '多天合并', rows: selectedRows }],
      dateSummaries: dates.map((date) => ({ date, meals: [], selectedRows: [] })),
      canSubmit: !message, message
    };
  }

  function buildSimplePreview(canteen, quantities = {}, expectedAt = '') {
    const date = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(String(expectedAt))
      ? expectedAt.slice(0, 10) : '';
    const preview = buildCombinedPreview(canteen, { dates: date ? [date] : [], quantities });
    return { ...preview, message: date ? preview.message : '请选择期望送达时间' };
  }

  function buildPreview(date, canteen, quantities = readDraft(date, canteen)) {
    const participants = participantsFor(canteen);
    const meals = mealDefinitionsForDate(date).map((meal) => ({ ...meal, rows: catalogProducts(canteen).map((product) => {
      const key = keyFor(meal.key, product);
      const raw = quantities[key];
      const participantQty = Object.fromEntries(participants.map((person, index) => [person.key,
        Object.prototype.hasOwnProperty.call(quantities, `${key}::${person.key}`)
          ? Number(quantities[`${key}::${person.key}`] || 0)
          : index === 0 ? Number(raw || 0) : 0
      ]));
      const orderQty = splitByPerson() || raw == null
        ? participants.reduce((sum, person) => sum + participantQty[person.key], 0)
        : Number(raw || 0);
      return {
        key, productCode: product.code, productName: product.name, auxiliaryName: product.auxiliaryName,
        unit: product.unit, brand: product.brand, spec: product.spec, isStandardProduct: false,
        orderPrice: priceFor(product), participantQty, orderQty
      };
    }) }));
    const rows = meals.flatMap((meal) => meal.rows);
    const invalid = rows.find((row) => !Number.isFinite(row.orderQty) || row.orderQty < 0
      || (splitByPerson() && participants.some((person) => !Number.isFinite(row.participantQty[person.key]) || row.participantQty[person.key] < 0)));
    const selectedRows = rows.filter((row) => row.orderQty > 0);
    const message = invalid ? '采购量需为非负数' : selectedRows.length ? '' : '请至少填写一项大于 0 的采购量';
    return { date, canteen: canteenFor(canteen), participants, meals, rows, selectedRows, canSubmit: !message, message };
  }

  function buildDatesPreview(dates, canteen, quantitiesByDate = {}) {
    const normalizedDates = [...new Set((Array.isArray(dates) ? dates : [dates])
      .map((date) => String(date || '').trim()).filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)))].sort();
    const summaries = normalizedDates.map((date) => buildPreview(date, canteen, quantitiesByDate[date] || {}));
    const participants = participantsFor(canteen);
    const mealMap = new Map();
    summaries.forEach((summary) => summary.meals.forEach((meal) => {
      if (!mealMap.has(meal.key)) mealMap.set(meal.key, { key: meal.key, name: meal.name, rows: [], rowMap: new Map() });
      const group = mealMap.get(meal.key);
      meal.rows.filter((row) => row.orderQty > 0).forEach((row) => {
        const productKey = `${row.productCode}::${row.unit}`;
        let aggregate = group.rowMap.get(productKey);
        if (!aggregate) {
          aggregate = { ...clone(row), sourceDates: [], participantDates: Object.fromEntries(participants.map((person) => [person.key, []])),
            participantQty: Object.fromEntries(participants.map((person) => [person.key, 0])), orderQty: 0 };
          group.rowMap.set(productKey, aggregate);
          group.rows.push(aggregate);
        }
        aggregate.orderQty = roundQuantity(aggregate.orderQty + row.orderQty);
        participants.forEach((person) => {
          aggregate.participantQty[person.key] = roundQuantity(aggregate.participantQty[person.key] + Number(row.participantQty?.[person.key] || 0));
          if (Number(row.participantQty?.[person.key] || 0) > 0 && !aggregate.participantDates[person.key].includes(summary.date)) {
            aggregate.participantDates[person.key].push(summary.date);
          }
        });
        if (!aggregate.sourceDates.includes(summary.date)) aggregate.sourceDates.push(summary.date);
      });
    }));
    const meals = [...mealMap.values()].map(({ rowMap, ...meal }) => meal).filter((meal) => meal.rows.length);
    const selectedRows = meals.flatMap((meal) => meal.rows);
    const invalid = summaries.find((summary) => !summary.canSubmit);
    const message = !normalizedDates.length ? '请至少填写一项大于 0 的采购量'
      : invalid ? `${invalid.date} ${invalid.message}`
        : selectedRows.length ? '' : '请至少填写一项大于 0 的采购量';
    return { dates: normalizedDates, canteen: canteenFor(canteen), participants, dateSummaries: summaries,
      meals, selectedRows, canSubmit: !message, message };
  }

  function nextRecordNo(records, createdAt) {
    const prefix = `XQ${String(createdAt).slice(0, 10).replace(/-/g, '')}`;
    const existing = new Set(records.map((record) => String(record.recordNo || '')));
    let value;
    do value = `${prefix}${String(Math.floor(10000 + Math.random() * 90000))}`;
    while (existing.has(value));
    return value;
  }

  async function submit(date, canteen, quantities, expectedAt) {
    return submitDates([date], canteen, { [date]: quantities }, expectedAt);
  }

  async function submitSimple(canteen, quantities, expectedAt) {
    const preview = buildSimplePreview(canteen, quantities, expectedAt);
    if (!preview.canSubmit) throw new Error(preview.message);
    const date = preview.dates[0];
    return submitDates([date], canteen, { dates: [date], quantities }, expectedAt, 'simple');
  }

  async function submitDates(dates, canteen, quantitiesByDate, expectedAt, orderMode = 'legacy') {
    const combined = orderMode === 'combined' || orderMode === 'simple';
    const preview = combined
      ? buildCombinedPreview(canteen, quantitiesByDate)
      : buildDatesPreview(dates, canteen, quantitiesByDate);
    if (!preview.canSubmit) throw new Error(preview.message);
    if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(String(expectedAt || ''))
      || expectedAt.slice(0, 10) > preview.dates[0]) {
      throw new Error('期望送达时间配置无效，请联系企业管理员');
    }
    const createdAt = timestamp();
    const session = window.SchoolMobileAuth?.getSession?.() || window.DemoStore?.getSession?.() || {};
    const operator = { name: session.displayName || session.username || '当前用户', id: session.userId || session.id || '' };
    const records = window.DemoStore?.get?.(resource) || [];
    const byPerson = !combined && splitByPerson();
    const orderParticipants = byPerson ? preview.participants : [participant];
    const recordRows = (rows) => {
      const aggregated = new Map();
      rows.forEach((row) => {
        const key = `${row.productCode}::${row.unit}`;
        const participantQty = byPerson ? row.participantQty : { [participant.key]: row.orderQty };
        const current = aggregated.get(key);
        if (!current) {
          aggregated.set(key, { ...clone(row), key, mappingStatus: '已关联',
            participantQty: { ...participantQty }, totalQty: row.orderQty, purchaseQty: row.orderQty,
            unitPrice: row.orderPrice, orderQty: row.orderQty });
          return;
        }
        current.totalQty = roundQuantity(current.totalQty + row.orderQty);
        current.purchaseQty = current.totalQty;
        current.orderQty = current.totalQty;
        if (!current.sourceDates) current.sourceDates = [];
        (row.sourceDates || []).forEach((date) => {
          if (!current.sourceDates.includes(date)) current.sourceDates.push(date);
        });
        Object.entries(participantQty).forEach(([personKey, amount]) => {
          current.participantQty[personKey] = roundQuantity(Number(current.participantQty[personKey] || 0) + Number(amount || 0));
          (row.participantDates?.[personKey] || []).forEach((date) => {
            if (!current.participantDates?.[personKey]?.includes(date)) {
              if (!current.participantDates) current.participantDates = {};
              if (!current.participantDates[personKey]) current.participantDates[personKey] = [];
              current.participantDates[personKey].push(date);
            }
          });
        });
      });
      return [...aggregated.values()];
    };
    const dateSummaries = preview.dateSummaries.map((summary) => {
      // 周期订单的数量属于整个周期，不向每个日期重复分摊。
      const items = combined ? [] : recordRows(summary.selectedRows);
      return { date: summary.date, coverageOnly: combined,
        attendance: { date: summary.date, meals: {} }, recipeVersion: '',
        participants: clone(orderParticipants),
        participantPersonTimes: Object.fromEntries(orderParticipants.map((person) => [person.key, 0])),
        studentPersonTimes: 0, teacherPersonTimes: 0, totalPersonTimes: 0,
        productCount: combined ? preview.selectedRows.length : items.length,
        filledMeals: combined ? [] : summary.meals.filter((meal) => meal.rows.some((row) => row.orderQty > 0)).map((meal) => meal.name || meal.key),
        items };
    });
    const items = recordRows(preview.selectedRows);
    const record = {
      id: `AUXILIARY-DEMAND-${String(createdAt).replace(/[-: ]/g, '')}-${Math.random().toString(36).slice(2, 7)}`,
      recordNo: nextRecordNo(records, createdAt), entryMode: 'quantity', orderMode,
      demandType: 'auxiliary', auxiliary: true,
      schoolName: orderService.SCHOOL_NAME || '静安第一中学',
      canteen: preview.canteen.name || '第一食堂', canteenId: preview.canteen.id || '',
      participants: clone(orderParticipants), dates: clone(preview.dates), expectedAt, recipeVersion: '',
      source: orderMode === 'simple' ? '学校端干料需求下单' : '学校端商品需求下单', submittedBy: operator.name,
      submittedById: operator.id, submittedAt: createdAt,
      dateSummaries, items,
      participantPersonTimes: Object.fromEntries(orderParticipants.map((person) => [person.key, 0])),
      studentPersonTimes: 0, teacherPersonTimes: 0, totalPersonTimes: 0,
      productCount: items.length, orders: [], enterpriseSyncWarnings: [],
      operationLogs: [{ action: '提交需求并下单', operator: operator.name, operatorId: operator.id,
        result: '提交成功', time: createdAt, description: orderMode === 'simple'
          ? `提交期望送达时间 ${expectedAt} 的干料需求`
          : `提交 ${preview.dates.join('、')} 的商品需求` }]
    };
    const saveRecord = () => window.DemoStore?.replace?.(resource, [...records, record]);
    saveRecord();
    const groups = combined
      ? [{ key: 'combined', mealKey: '', name: '', date: '', rows: preview.selectedRows }]
      : orderMode === 'daily' ? preview.dateSummaries.flatMap((summary) => summary.meals.map((meal) => ({
        key: `${summary.date}-${meal.key}`, mealKey: meal.key, name: meal.name, date: summary.date,
        rows: meal.rows.filter((row) => row.orderQty > 0).map((row) => ({
          ...row, sourceDates: [summary.date],
          participantDates: Object.fromEntries(preview.participants.map((person) => [person.key,
            Number(row.participantQty?.[person.key] || 0) > 0 ? [summary.date] : []]))
        }))
      }))) : splitByMeal()
        ? preview.meals.map((meal) => ({ key: meal.key, mealKey: meal.key, name: meal.name, date: '', rows: meal.rows }))
        : [{ key: 'all-meals', mealKey: '', name: preview.meals.map((meal) => meal.name).join('、'),
          date: '', rows: preview.selectedRows }];
    for (const person of orderParticipants) {
      for (const group of groups) {
        const selected = group.rows.filter((row) => (byPerson ? Number(row.participantQty?.[person.key] || 0) : row.orderQty) > 0);
        if (!selected.length) continue;
        const orderDates = combined ? preview.dates : orderMode === 'daily' ? [group.date]
          : [...new Set(selected.flatMap((row) => byPerson
            ? row.participantDates?.[person.key] || [] : row.sourceDates || []))].sort();
        const orderItems = new Map();
        selected.forEach((row) => {
          const key = `${row.productCode}::${row.unit}`;
          const amount = byPerson ? Number(row.participantQty[person.key]) : row.orderQty;
          const existing = orderItems.get(key);
          if (existing) { existing.orderQty = roundQuantity(existing.orderQty + amount); return; }
          orderItems.set(key, { productCode: row.productCode, productName: row.productName,
            unit: row.unit, brand: row.brand, spec: row.spec, orderQty: amount,
            orderPrice: row.orderPrice, isNetVegetable: row.isNetVegetable === true,
            isStandardProduct: row.isStandardProduct === true,
            remark: orderMode === 'simple' ? '干料需求'
              : combined ? `商品${orderDates.join('、')}合并需求`
              : `商品${orderDates.join('、')}${group.name}需求` });
        });
        const order = orderService.create({
          id: `SCHOOL-ORDER-${String(createdAt).slice(0, 10).replace(/-/g, '')}-${record.recordNo}-${person.key}-${group.key}-AUX`,
          customerName: record.schoolName, supplierName: orderService.SUPPLIER_NAME,
          canteen: record.canteen, canteenId: record.canteenId,
          orderTag: person.orderTag, orderTagId: person.tagId || person.key,
          orderTagName: person.tagName || person.label, nutritious: person.nutritious || '不区分',
          mealKey: group.mealKey, mealName: group.name, mealPeople: '',
          recipeDemandRecordId: record.id, recipeDemandRecordNo: record.recordNo,
          recipeDemandDate: orderDates.join('、'), recipeParticipantType: person.label,
          expectedAt, supplement: '否', source: '需求填报', status: '待审核',
          orderMode: orderMode === 'legacy' ? '' : orderMode,
          creator: operator.name, items: [...orderItems.values()]
        });
        let enterpriseOrder = null;
        try {
          enterpriseOrder = await window.OperationsService?.create?.('orders', {
            orderId: order.id, orderNo: order.orderNo, sourceType: 'CUSTOMER', source: '需求填报',
            customerName: order.customerName, customerType: '学校', canteen: order.canteen,
            canteenId: order.canteenId, orderTag: person.orderTag, orderTagId: person.tagId || person.key,
            orderTagName: person.tagName || person.label, nutritious: person.nutritious || '不区分',
            recipeDemandRecordId: record.id, recipeDemandRecordNo: record.recordNo,
            recipeDemandDate: orderDates.join('、'), recipeParticipantType: person.label,
            orderMode: orderMode === 'legacy' ? '' : orderMode,
            mealKey: order.mealKey, mealName: order.mealName, mealPeople: order.mealPeople,
            expectedAt, items: order.items.map((line) => ({
              productId: line.productCode, goodsCode: line.productCode, goodsName: line.productName,
              productName: line.productName, unit: line.unit, unitPrice: line.orderPrice,
              quantity: line.orderQty, orderQty: line.orderQty, subtotal: line.orderQty * line.orderPrice,
              isNetVegetable: line.isNetVegetable === true,
              isStandardProduct: line.isStandardProduct === true, brand: line.brand, spec: line.spec
            })), orderAmount: order.orderAmount, productCount: order.productCount,
            status: 'PENDING_CONFIRM', creator: order.creator, createdAt: order.createdAt
          });
        } catch (error) {
          record.enterpriseSyncWarnings.push(`${order.orderNo}：${error.message || '企业端同步失败'}`);
        }
        record.orders.push({ orderId: order.id, orderNo: order.orderNo,
          enterpriseOrderId: enterpriseOrder?.id || enterpriseOrder?.orderId || '',
          date: orderDates.join('、'), dates: orderDates, mealKey: order.mealKey, mealName: order.mealName,
          mealPeople: '', participantType: person.label,
          orderTag: person.orderTag, orderTagId: person.tagId || person.key,
          orderTagName: person.tagName || person.label, nutritious: person.nutritious || '不区分', expectedAt });
        saveRecord();
      }
    }
    record.operationLogs.push({ action: '订单生成', operator: operator.name,
      operatorId: operator.id, result: `${record.orders.length} 笔`, time: timestamp(),
      description: `生成订单：${record.orders.map((order) => order.orderNo).join('、')}` });
    saveRecord();
    return { record: clone(record), orders: clone(record.orders), preview: clone(preview) };
  }

  window.SchoolRecipeAuxiliaryDirectService = {
    products: clone(products), mealDefinitionsForDate, keyFor, catalogProducts,
    readDraft, writeDraft, readFilledDates, readCombinedDraft, writeCombinedDraft,
    participantsFor, buildPreview, buildDatesPreview, buildCombinedPreview, buildSimplePreview,
    submit, submitDates, submitSimple
  };
})();
