(function () {
  const recipeService = window.SchoolRecipeService;
  const attendanceService = window.SchoolRecipeAttendanceService;
  const schoolOrderService = window.SchoolOrderService;
  const canteenConfig = window.SchoolCanteenConfigService;
  const RESOURCE = 'recipeDemandRecords';
  const DEMO_RECORD_DATE = '2026-09-07';
  const DEMO_RECORD_CREATED_AT = '2026-08-29 16:20:00';
  const DEMO_RECORD_VERSION = '20260908-meal-split-v1';
  const RECORD_NO_PATTERN = /^XQ\d{8}\d{5}$/;
  const DEMO_ATTENDANCE = {
    id: 'RECIPE-ATTENDANCE-DEMO-20260907',
    date: DEMO_RECORD_DATE,
    recipeVersion: '2026 秋季营养菜谱第 12 版',
    updatedAt: '2026-08-29 16:20:00',
    meals: {
      breakfast: { student: 520, teacher: 42 },
      lunch: { student: 680, teacher: 48 },
      dinner: { student: 460, teacher: 36 }
    }
  };
  const SCHOOL_NAME = schoolOrderService?.SCHOOL_NAME || '静安第一中学';
  const CANTEEN_NAME = schoolOrderService?.CANTEEN_NAME || '第一食堂';
  const LEGACY_PARTICIPANTS = [
    { key: 'student', label: '学生', tagName: '学生', nutritious: '不区分', legacyKey: 'student', orderTag: '学生-不区分' },
    { key: 'teacher', label: '教师', tagName: '教师', nutritious: '不区分', legacyKey: 'teacher', orderTag: '教师-不区分' }
  ];
  let memoryRecords = [];

  if (!recipeService || !attendanceService || !schoolOrderService) return;

  const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
  const number = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const quantity = (value) => Number(number(value).toFixed(2));
  const demandQuantity = (value) => number(value);
  const isStandardProduct = (product) => product?.isStandardProduct === true || product?.isStandardProduct === 'true' || product?.isStandardProduct === '是'
    || product?.isStandard === true || product?.isStandard === 'true' || product?.isStandard === '是';
  const canModifyPurchaseQuantity = (product) => {
    const value = product?.allowSchoolModifyPurchaseQuantity;
    return value !== false && value !== 'false' && value !== '否' && value !== 0 && value !== '0';
  };
  const purchaseQuantity = (value, product) => {
    const demandQuantity = number(value);
    return isStandardProduct(product) ? Math.ceil(demandQuantity) : demandQuantity;
  };
  const purchaseRowKey = (row) => String(row?.key || `${row?.productCode || row?.productName || ''}::${row?.unit || '--'}`);
  const purchaseQuantityKey = (row, participantKey) => `${purchaseRowKey(row)}::${participantKey}`;
  const purchaseAllocationKey = (summary, meal, row, participantKey) => `${summary?.date || ''}::${meal?.key || ''}::${purchaseQuantityKey(row, participantKey)}`;
  const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value || {}, key);
  const toKeySet = (value) => value instanceof Set
    ? new Set([...value].map((key) => String(key)))
    : new Set(Array.isArray(value) ? value.map((key) => String(key)) : []);
  const normalizePurchaseQuantity = (value, product) => {
    const raw = String(value ?? '').trim();
    if (!raw) return 0;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    return isStandardProduct(product) ? Math.ceil(parsed) : parsed;
  };
  const normalizeExpectedAt = (value) => {
    const text = String(value || '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return `${text} 07:30:00`;
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(text)) return `${text}:00`;
    return text;
  };
  const timestamp = () => window.BusinessRules?.now?.()
    || new Date().toISOString().slice(0, 19).replace('T', ' ');
  const datePart = (value) => String(value || timestamp()).slice(0, 10).replace(/-/g, '');
  const currentSession = () => window.SchoolMobileAuth
    ? window.SchoolMobileAuth.getSession?.() || {}
    : window.DemoStore?.getSession?.() || {};
  const currentOperator = () => {
    const session = currentSession();
    return {
      name: session.displayName || session.username || '当前用户',
      id: session.userId || session.id || ''
    };
  };
  const shouldSplitOrderByMeal = () => {
    const value = window.DemoStore?.getSettings?.()?.splitOrderByMeal;
    return value !== false && value !== 'false' && value !== 0 && value !== '0';
  };

  function currentCanteen(value) {
    const fallback = value || window.AppStorage?.read?.('school-recipe-current-canteen', '') || CANTEEN_NAME;
    return canteenConfig?.getCanteen?.(fallback) || (typeof fallback === 'object'
      ? fallback
      : { id: '', name: String(fallback || CANTEEN_NAME) });
  }

  function participantsFor(canteen) {
    return attendanceService.participantsFor?.(currentCanteen(canteen)) || clone(LEGACY_PARTICIPANTS);
  }

  function readAll() {
    const current = window.DemoStore?.get?.(RESOURCE);
    if (Array.isArray(current) && current.length) {
      const migrated = current.map((record) => (
        record?.demoOnly && record.id === 'RECIPE-DEMAND-DEMO-20260829' && record.demoVersion !== DEMO_RECORD_VERSION
          ? buildDemoRecord()
          : record
      ));
      if (migrated.some((record, index) => record !== current[index])) {
        if (window.DemoStore?.replace) window.DemoStore.replace(RESOURCE, migrated);
        else memoryRecords = clone(migrated);
      }
      return refreshRecordNumbers(migrated);
    }
    if (!window.DemoStore && memoryRecords.length) return clone(memoryRecords);
    const demoRecord = buildDemoRecord();
    if (window.DemoStore?.replace) return window.DemoStore.replace(RESOURCE, [demoRecord]);
    memoryRecords = [demoRecord];
    return clone(memoryRecords);
  }

  function writeAll(records) {
    const next = clone(records || []);
    if (window.DemoStore?.replace) return window.DemoStore.replace(RESOURCE, next);
    memoryRecords = next;
    return clone(memoryRecords);
  }

  function normalizeDates(dates) {
    const values = Array.isArray(dates) ? dates : [dates];
    return [...new Set(values
      .map((date) => String(date || '').trim())
      .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)))].sort();
  }

  function buildDateSummary(date, attendanceOverride = null, options = {}) {
    const menu = recipeService.getMenu(date);
    const canteen = currentCanteen(options.canteen);
    const participants = options.participants || participantsFor(canteen);
    const attendance = attendanceOverride ? clone(attendanceOverride) : attendanceService.get(date, canteen);
    const calculation = attendanceService.calculate(menu, attendance, { canteen, participants });
    const validation = attendanceService.validate(menu, attendance, { canteen, participants });
    const attendanceStatus = attendanceService.status(menu, attendance, { canteen, participants });
    return {
      date,
      menu,
      attendance,
      canteen,
      participants,
      calculation,
      validation,
      status: attendanceStatus.label
    };
  }

  function aggregateRows(summaries, participants = summaries.find((summary) => summary?.participants?.length)?.participants || []) {
    const rows = new Map();
    summaries.forEach((summary) => {
      (summary.calculation.rows || []).forEach((row) => {
        const key = row.key || `${row.productCode || row.productName}::${row.unit || '--'}`;
        const current = rows.get(key) || {
          ...clone(row),
          key,
          ingredientNames: [],
          mealNames: [],
          dishNames: [],
          sourceDates: [],
          participantQty: Object.fromEntries(participants.map((participant) => [participant.key, 0])),
          studentQty: 0,
          teacherQty: 0,
          totalQty: 0,
          perCapitaQty: 0
        };
        participants.forEach((participant) => {
          current.participantQty[participant.key] = demandQuantity(
            number(current.participantQty[participant.key]) + number(row.participantQty?.[participant.key] ?? row[`${participant.key}Qty`])
          );
        });
        current.studentQty = demandQuantity(current.studentQty + number(row.studentQty));
        current.teacherQty = demandQuantity(current.teacherQty + number(row.teacherQty));
        current.totalQty = demandQuantity(participants.reduce((total, participant) => total + number(current.participantQty[participant.key]), 0));
        current.perCapitaQty = demandQuantity(current.perCapitaQty + number(row.perCapitaQty));
        [...(row.ingredientNames || [])].forEach((name) => { if (!current.ingredientNames.includes(name)) current.ingredientNames.push(name); });
        [...(row.mealNames || [])].forEach((name) => { if (!current.mealNames.includes(name)) current.mealNames.push(name); });
        [...(row.dishNames || [])].forEach((name) => { if (!current.dishNames.includes(name)) current.dishNames.push(name); });
        if (!current.sourceDates.includes(summary.date)) current.sourceDates.push(summary.date);
        rows.set(key, current);
      });
    });
    return [...rows.values()].sort((a, b) => {
      if (a.mappingStatus !== b.mappingStatus) return a.mappingStatus === '待关联' ? -1 : 1;
      return String(a.productName || '').localeCompare(String(b.productName || ''), 'zh-CN');
    });
  }

  function buildDemoRecord() {
    const demoCanteen = { id: '', name: CANTEEN_NAME };
    const dateSummaries = [buildDateSummary(DEMO_RECORD_DATE, DEMO_ATTENDANCE, {
      canteen: demoCanteen,
      participants: LEGACY_PARTICIPANTS
    })];
    const summary = dateSummaries[0];
    const items = aggregateRows(dateSummaries, LEGACY_PARTICIPANTS);
    const studentPersonTimes = number(summary.calculation.totalStudentPeople);
    const teacherPersonTimes = number(summary.calculation.totalTeacherPeople);
    const totalPersonTimes = studentPersonTimes + teacherPersonTimes;
    const productCount = items.filter((row) => row.mappingStatus === '已关联').length;
    const demoMealRows = (summary.calculation.mealRows || []).filter((meal) => (
      meal.rows?.some((row) => row.mappingStatus === '已关联' && row.totalQty > 0)
    ));
    const demoOrders = demoMealRows.flatMap((meal) => LEGACY_PARTICIPANTS
      .filter((participant) => number(meal.participantPeople?.[participant.key]) > 0)
      .map((participant) => ({ meal, participant })))
      .map(({ meal, participant }, index) => ({
        orderId: `SCHOOL-ORDER-DEMO-20260829-${meal.key}-${participant.key}`,
        orderNo: `DD2026082903${String(index + 1).padStart(5, '0')}`,
        date: DEMO_RECORD_DATE,
        mealKey: meal.key,
        mealName: meal.name,
        mealPeople: number(meal.participantPeople?.[participant.key]),
        participantType: participant.label,
        orderTag: participant.orderTag
      }));
    return {
      id: 'RECIPE-DEMAND-DEMO-20260829',
      recordNo: 'XQ2026082948261',
      demoOnly: true,
      demoVersion: DEMO_RECORD_VERSION,
      schoolName: SCHOOL_NAME,
      canteen: CANTEEN_NAME,
      canteenId: demoCanteen.id,
      participants: clone(LEGACY_PARTICIPANTS),
      dates: [DEMO_RECORD_DATE],
      expectedAt: '2026-09-06 07:30:00',
      recipeVersion: summary.menu?.version || recipeService.MENU_VERSION,
      dateSummaries: dateSummaries.map((item) => ({
        date: item.date,
        attendance: clone(item.attendance),
        recipeVersion: item.menu?.version || recipeService.MENU_VERSION,
        participants: clone(item.participants),
        participantPersonTimes: clone(item.calculation.participantPeople),
        studentPersonTimes: item.calculation.totalStudentPeople,
        teacherPersonTimes: item.calculation.totalTeacherPeople,
        totalPersonTimes: item.calculation.totalPeople,
        productCount: item.calculation.rows.filter((row) => row.mappingStatus === '已关联').length,
        items: clone(item.calculation.rows)
      })),
      items: clone(items),
      studentPersonTimes,
      teacherPersonTimes,
      participantPersonTimes: clone(summary.calculation.participantPeople),
      totalPersonTimes,
      productCount,
      source: '食谱下单',
      submittedBy: '管理员',
      submittedById: 'USER-HEAD-ADMIN',
      submittedAt: DEMO_RECORD_CREATED_AT,
      orders: demoOrders,
      enterpriseSyncWarnings: [],
      operationLogs: [
        { action: '提交需求', operator: '管理员', operatorId: 'USER-HEAD-ADMIN', result: '提交成功', time: DEMO_RECORD_CREATED_AT, description: `提交 ${DEMO_RECORD_DATE} 的食谱需求` },
        { action: '订单生成', operator: '系统', result: `${demoOrders.length} 笔`, time: '2026-08-29 16:20:02', description: '已按餐次及学生、教师标签生成订单' }
      ]
    };
  }

  function buildPreview(dates, options = {}) {
    const normalizedDates = normalizeDates(dates);
    const canteen = currentCanteen(options.canteen);
    const participants = options.participants || participantsFor(canteen);
    const dateSummaries = normalizedDates.map((date) => buildDateSummary(date, null, { canteen, participants }));
    const rows = aggregateRows(dateSummaries, participants);
    const excludedProductKeys = toKeySet(options.excludedProductKeys);
    const participantPersonTimes = Object.fromEntries(participants.map((participant) => [participant.key, 0]));
    dateSummaries.forEach((item) => participants.forEach((participant) => {
      participantPersonTimes[participant.key] = number(participantPersonTimes[participant.key]) + number(item.calculation.participantPeople?.[participant.key]);
    }));
    const totalStudentPersonTimes = dateSummaries.reduce((total, item) => total + number(item.calculation.totalStudentPeople), 0);
    const totalTeacherPersonTimes = dateSummaries.reduce((total, item) => total + number(item.calculation.totalTeacherPeople), 0);
    const invalidSummary = dateSummaries.find((item) => !item.validation.canContinue);
    const linkedRows = rows.filter((row) => row.mappingStatus === '已关联' && row.totalQty > 0);
    const confirmedRows = linkedRows.filter((row) => !excludedProductKeys.has(purchaseRowKey(row)));
    const canSubmit = Boolean(normalizedDates.length)
      && !invalidSummary
      && confirmedRows.length > 0;
    const message = !normalizedDates.length
      ? '请选择要提交的填报日期'
      : invalidSummary
        ? `${invalidSummary.date} ${invalidSummary.validation.message || '人数填报未完成'}`
        : canSubmit ? '' : linkedRows.length && !confirmedRows.length ? '请至少保留一项商品进行确认' : '当前日期暂无可下单的商品需求';
    return {
      dates: normalizedDates,
      canteen,
      participants,
      dateSummaries,
      rows,
      participantPersonTimes,
      totalStudentPersonTimes,
      totalTeacherPersonTimes,
      totalPersonTimes: totalStudentPersonTimes + totalTeacherPersonTimes,
      productCount: confirmedRows.length,
      canSubmit,
      message
    };
  }

  function nextRecordNo(records, createdAt) {
    const prefix = `XQ${datePart(createdAt)}`;
    const existing = new Set((records || []).map((record) => String(record.recordNo || '')));
    let recordNo = '';
    do {
      const suffix = Math.floor(10000 + Math.random() * 90000);
      recordNo = `${prefix}${String(suffix).padStart(5, '0')}`;
    } while (existing.has(recordNo));
    return recordNo;
  }

  function refreshRecordNumbers(records) {
    const next = clone(records || []);
    const used = new Set();
    let changed = false;
    next.forEach((record) => {
      if (!record || typeof record !== 'object') return;
      const currentNo = String(record.recordNo || '');
      if (RECORD_NO_PATTERN.test(currentNo) && !used.has(currentNo)) {
        used.add(currentNo);
        return;
      }
      const nextNo = nextRecordNo(next, record.submittedAt || record.createdAt || record.dates?.[0]);
      record.recordNo = nextNo;
      used.add(nextNo);
      changed = changed || currentNo !== nextNo;
      (record.orders || []).forEach((order) => {
        if (String(order?.recipeDemandRecordNo || '') === currentNo) order.recipeDemandRecordNo = nextNo;
      });
      (record.operationLogs || []).forEach((log) => {
        ['description', 'desc'].forEach((key) => {
          if (typeof log?.[key] === 'string' && currentNo) log[key] = log[key].split(currentNo).join(nextNo);
        });
      });
    });
    return changed ? writeAll(next) : next;
  }

  function getProductMap() {
    return new Map((schoolOrderService.getProductCatalog?.() || []).map((product) => [String(product.code), product]));
  }

  function buildPurchaseQuantityAllocations(preview, overrides, productMap, excludedProductKeys = new Set()) {
    const allocations = {};
    const participants = preview.participants || [];
    (preview.rows || []).forEach((aggregateRow) => {
      participants.forEach((participant) => {
        if (excludedProductKeys.has(purchaseRowKey(aggregateRow))) return;
        const overrideKey = purchaseQuantityKey(aggregateRow, participant.key);
        if (!hasOwn(overrides, overrideKey)) return;
        const product = productMap.get(String(aggregateRow.productCode)) || {};
        if (!canModifyPurchaseQuantity(product)) return;
        const sources = [];
        (preview.dateSummaries || []).forEach((summary) => {
          (summary.calculation?.mealRows || []).forEach((meal) => {
            (meal.rows || []).forEach((row) => {
              if (purchaseRowKey(row) !== purchaseRowKey(aggregateRow)) return;
              const demand = number(row.participantQty?.[participant.key]);
              if (demand > 0) sources.push({ summary, meal, row, defaultQty: purchaseQuantity(demand, product) });
            });
          });
        });
        let remaining = normalizePurchaseQuantity(overrides[overrideKey], product);
        sources.forEach((source, index) => {
          const assigned = index === sources.length - 1
            ? remaining
            : Math.min(source.defaultQty, remaining);
          allocations[purchaseAllocationKey(source.summary, source.meal, source.row, participant.key)] = assigned;
          remaining = Math.max(0, remaining - assigned);
        });
      });
    });
    return allocations;
  }

  function editablePurchaseQuantityOverrides(preview, overrides, productMap) {
    const editable = {};
    (preview.rows || []).forEach((row) => {
      const product = productMap.get(String(row.productCode)) || {};
      if (!canModifyPurchaseQuantity(product)) return;
      (preview.participants || []).forEach((participant) => {
        const key = purchaseQuantityKey(row, participant.key);
        if (hasOwn(overrides, key)) editable[key] = overrides[key];
      });
    });
    return editable;
  }

  function participantItems(summary, participantKey, productMap, meal = null, options = {}) {
    const qtyKey = `${participantKey}Qty`;
    const sourceRows = meal?.rows || summary.items || [];
    const excludedProductKeys = toKeySet(options.excludedProductKeys);
    return sourceRows
      .filter((row) => !excludedProductKeys.has(purchaseRowKey(row)) && row.mappingStatus === '已关联' && number(row.participantQty?.[participantKey] ?? row[qtyKey]) > 0)
      .map((row) => {
        const product = productMap.get(String(row.productCode)) || {};
        const allocationKey = purchaseAllocationKey(summary, meal, row, participantKey);
        const orderQty = canModifyPurchaseQuantity(product) && hasOwn(options.purchaseQuantityAllocations, allocationKey)
          ? number(options.purchaseQuantityAllocations[allocationKey])
          : purchaseQuantity(row.participantQty?.[participantKey] ?? row[qtyKey], product);
        const participant = (summary.participants || []).find((item) => item.key === participantKey)
          || LEGACY_PARTICIPANTS.find((item) => item.key === participantKey)
          || { label: participantKey, orderTag: participantKey };
        const orderPrice = quantity(product.marketPrice || 0);
        return {
          productCode: row.productCode,
          productName: row.productName || product.name || row.ingredientNames?.[0] || '采购商品',
          unit: row.unit || product.unit || '--',
          brand: product.brand || '--',
          spec: product.spec || '--',
          isNetVegetable: product.isNetVegetable === true,
          isStandardProduct: isStandardProduct(product),
          orderQty,
          orderPrice,
          marketPrice: orderPrice,
          remark: `食谱${summary.date}${meal?.name || ''}${participant.label || participant.tagName || participantKey}需求`
        };
      })
      .filter((item) => item.orderQty > 0);
  }

  function mergeOrderItems(sources, dates, mealName, participant) {
    const merged = new Map();
    sources.forEach((source) => {
      (source.items || []).forEach((item) => {
        const key = purchaseRowKey(item);
        const current = merged.get(key);
        if (!current) {
          merged.set(key, clone(item));
          return;
        }
        current.orderQty = quantity(number(current.orderQty) + number(item.orderQty));
      });
    });
    const remark = `食谱${dates.join('、')}${mealName || ''}${participant.label || participant.tagName || participant.key}需求`;
    return [...merged.values()]
      .map((item) => ({ ...item, remark }))
      .filter((item) => item.orderQty > 0);
  }

  async function createCentralOrder(order, participant, record, dates) {
    if (!window.OperationsService?.create) return null;
    const demandDates = (Array.isArray(dates) ? dates : [dates]).filter(Boolean);
    return window.OperationsService.create('orders', {
      orderId: order.id,
      orderNo: order.orderNo,
      sourceType: 'CUSTOMER',
      source: '食谱下单',
      customerName: order.customerName,
      customerType: '学校',
      canteen: order.canteen,
      canteenId: order.canteenId,
      orderTag: participant.orderTag,
      orderTagId: participant.tagId || participant.key,
      orderTagName: participant.tagName || participant.label,
      nutritious: participant.nutritious || '不区分',
      recipeDemandRecordId: record.id,
      recipeDemandRecordNo: record.recordNo,
      recipeDemandDate: demandDates.join('、'),
      recipeParticipantType: participant.label,
      mealKey: order.mealKey || '',
      mealName: order.mealName || '',
      mealPeople: order.mealPeople ?? '',
      expectedAt: order.expectedAt,
      items: (order.items || []).map((line) => ({
        productId: line.productCode,
        goodsCode: line.productCode,
        goodsName: line.productName,
        productName: line.productName,
        unit: line.unit,
        unitPrice: line.orderPrice,
        quantity: line.orderQty,
        orderQty: line.orderQty,
        subtotal: line.orderSubtotal,
        isNetVegetable: line.isNetVegetable,
        isStandardProduct: line.isStandardProduct,
        brand: line.brand,
        spec: line.spec
      })),
      orderAmount: order.orderAmount,
      productCount: order.productCount,
      status: 'PENDING_CONFIRM',
      creator: order.creator,
      createdAt: order.createdAt,
      operationLogs: [{
        action: '食谱需求下单',
        operator: order.creator,
        createdAt: order.createdAt,
        desc: `${order.creator} 根据需求提交记录 ${record.recordNo} 创建${order.mealName ? `${order.mealName}、` : ''}${participant.label}订单`
      }]
    });
  }

  async function submit(dates, options = {}) {
    const preview = buildPreview(dates, options);
    if (!preview.canSubmit) throw new Error(preview.message || '当前需求不能提交');
    const excludedProductKeys = toKeySet(options.excludedProductKeys);
    const expectedAt = normalizeExpectedAt(options.expectedAt || options.expectedDeliveryAt);
    const earliestDate = preview.dates[0] || '';
    if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(expectedAt)) throw new Error('请选择期望送达时间');
    if (earliestDate && expectedAt.slice(0, 10) > earliestDate) throw new Error('期望送达时间不能晚于最早用料日期');

    const records = readAll();
    const operator = currentOperator();
    const createdAt = timestamp();
    const productMap = getProductMap();
    const splitOrderByMeal = shouldSplitOrderByMeal();
    const purchaseQuantityOverrides = editablePurchaseQuantityOverrides(
      preview,
      options.purchaseQuantityOverrides || {},
      productMap
    );
    const record = {
      id: `RECIPE-DEMAND-${datePart(createdAt)}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      recordNo: nextRecordNo(records, createdAt),
      schoolName: SCHOOL_NAME,
      canteen: preview.canteen.name || CANTEEN_NAME,
      canteenId: preview.canteen.id || '',
      participants: clone(preview.participants),
      dates: clone(preview.dates),
      excludedProductKeys: [...excludedProductKeys],
      purchaseQuantityOverrides: clone(purchaseQuantityOverrides),
      expectedAt,
      recipeVersion: preview.dateSummaries.find((item) => item.menu)?.menu?.version || recipeService.MENU_VERSION,
      dateSummaries: preview.dateSummaries.map((summary) => ({
        date: summary.date,
        attendance: clone(summary.attendance),
        recipeVersion: summary.menu?.version || recipeService.MENU_VERSION,
        participants: clone(summary.participants),
        participantPersonTimes: clone(summary.calculation.participantPeople),
        studentPersonTimes: summary.calculation.totalStudentPeople,
        teacherPersonTimes: summary.calculation.totalTeacherPeople,
        totalPersonTimes: summary.calculation.totalPeople,
        productCount: summary.calculation.rows.filter((row) => row.mappingStatus === '已关联' && !excludedProductKeys.has(purchaseRowKey(row))).length,
        items: clone(summary.calculation.rows)
      })),
      items: clone(preview.rows),
      participantPersonTimes: clone(preview.participantPersonTimes),
      studentPersonTimes: preview.totalStudentPersonTimes,
      teacherPersonTimes: preview.totalTeacherPersonTimes,
      totalPersonTimes: preview.totalPersonTimes,
      productCount: preview.productCount,
      source: '学校端食谱下单',
      submittedBy: operator.name,
      submittedById: operator.id,
      submittedAt: createdAt,
      orders: [],
      enterpriseSyncWarnings: [],
      operationLogs: [{
        action: '提交需求并下单',
        operator: operator.name,
        operatorId: operator.id,
        result: '提交成功',
        time: createdAt,
        description: `提交 ${preview.dates.join('、')} 的食谱需求`
      }]
    };
    writeAll([...records, record]);

    const purchaseQuantityAllocations = buildPurchaseQuantityAllocations(preview, purchaseQuantityOverrides, productMap, excludedProductKeys);
    const mealDefinitions = [];
    const mealKeys = new Set();
    preview.dateSummaries.forEach((summary) => {
      (summary.calculation.mealRows || []).forEach((meal) => {
        const key = String(meal.key || meal.name || '').trim();
        if (!key || mealKeys.has(key)) return;
        mealKeys.add(key);
        mealDefinitions.push({ ...meal, key });
      });
    });
    const orderGroups = splitOrderByMeal
      ? mealDefinitions.map((meal) => ({ key: meal.key, name: meal.name || meal.key, meals: [meal] }))
      : [{
        key: 'all-meals',
        name: mealDefinitions.map((meal) => meal.name || meal.key).join('、'),
        meals: mealDefinitions
      }];
    // 订单先按订单标签（人员类型）聚合，是否再按餐次拆分由企业端配置决定；用料日期只用于汇总来源和留痕。
    for (const participant of preview.participants) {
      for (const orderGroup of orderGroups) {
        const mealSources = preview.dateSummaries.flatMap((summary) => orderGroup.meals.map((mealDefinition) => {
          const meal = (summary.calculation.mealRows || []).find((item) => String(item.key || item.name || '') === mealDefinition.key);
          if (!meal) return null;
          const items = participantItems(summary, participant.key, productMap, meal, { purchaseQuantityAllocations, excludedProductKeys });
          return {
            date: summary.date,
            meal,
            items,
            people: number(meal.participantPeople?.[participant.key])
          };
        })).filter(Boolean);
        const activeSources = mealSources.filter((source) => source.people > 0 || source.items.length > 0);
        if (!activeSources.length) continue;
        const orderDates = [...new Set(activeSources.map((source) => source.date))];
        const items = mergeOrderItems(activeSources, orderDates, orderGroup.name, participant);
        if (!items.length) continue;
        const mealPeople = activeSources.reduce((total, source) => total + source.people, 0);
        const order = schoolOrderService.create({
          id: `SCHOOL-ORDER-${datePart(createdAt)}-${record.recordNo}-${participant.key}-${orderGroup.key}`,
          customerName: SCHOOL_NAME,
          supplierName: schoolOrderService.SUPPLIER_NAME,
          canteen: preview.canteen.name || CANTEEN_NAME,
          canteenId: preview.canteen.id || '',
          orderTag: participant.orderTag,
          orderTagId: participant.tagId || participant.key,
          orderTagName: participant.tagName || participant.label,
          nutritious: participant.nutritious || '不区分',
          mealKey: splitOrderByMeal ? orderGroup.key : '',
          mealName: orderGroup.name,
          mealPeople,
          recipeDemandRecordId: record.id,
          recipeDemandRecordNo: record.recordNo,
          recipeDemandDate: orderDates.join('、'),
          recipeParticipantType: participant.label,
          expectedAt,
          supplement: '否',
          source: '食谱下单',
          status: '待审核',
          creator: operator.name,
          items
        });
        let enterpriseOrder = null;
        try {
          enterpriseOrder = await createCentralOrder(order, participant, record, orderDates);
        } catch (error) {
          record.enterpriseSyncWarnings.push(`${order.orderNo}：${error.message || '企业端同步失败'}`);
        }
        // 这里只保存已创建订单的关联索引，订单实体统一由 SchoolOrderService.create 产生。
        record.orders.push({
          orderId: order.id,
          orderNo: order.orderNo,
          enterpriseOrderId: enterpriseOrder?.id || enterpriseOrder?.orderId || '',
          date: orderDates.join('、'),
          dates: clone(orderDates),
          mealKey: splitOrderByMeal ? orderGroup.key : '',
          mealName: orderGroup.name,
          mealPeople,
          participantType: participant.label,
          orderTag: participant.orderTag,
          orderTagId: participant.tagId || participant.key,
          orderTagName: participant.tagName || participant.label,
          nutritious: participant.nutritious || '不区分',
          expectedAt
        });
        writeAll([...records, record]);
      }
    }
    const completedAt = timestamp();
    record.operationLogs.push({
      action: '订单生成',
      operator: operator.name,
      operatorId: operator.id,
      result: `${record.orders.length} 笔`,
      time: completedAt,
      description: record.orders.length
        ? splitOrderByMeal
          ? `已按订单标签及餐次生成订单（用料日期不参与拆单）：${record.orders.map((item) => item.orderNo).join('、')}`
          : `已按订单标签生成订单（未按餐次及用料日期拆单）：${record.orders.map((item) => item.orderNo).join('、')}`
        : '没有生成可下单商品'
    });
    if (record.enterpriseSyncWarnings.length) {
      record.operationLogs.push({
        action: '企业端同步',
        operator: '系统',
        result: '部分失败',
        time: completedAt,
        description: record.enterpriseSyncWarnings.join('；')
      });
    }
    writeAll([...records, record]);
    return { record: clone(record), orders: clone(record.orders), preview: clone(preview) };
  }

  window.SchoolRecipeDemandService = {
    RESOURCE,
    PARTICIPANTS: LEGACY_PARTICIPANTS,
    participantsFor,
    currentCanteen,
    getAll() {
      return readAll().sort((a, b) => String(b.submittedAt || '').localeCompare(String(a.submittedAt || ''))).map(clone);
    },
    get(id) {
      const record = readAll().find((item) => String(item.id) === String(id) || String(item.recordNo) === String(id));
      return clone(record || null);
    },
    buildPreview,
    submit
  };
})();
