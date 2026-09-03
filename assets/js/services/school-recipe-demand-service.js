(function () {
  const recipeService = window.SchoolRecipeService;
  const attendanceService = window.SchoolRecipeAttendanceService;
  const schoolOrderService = window.SchoolOrderService;
  const RESOURCE = 'recipeDemandRecords';
  const DEMO_RECORD_DATE = '2026-09-07';
  const DEMO_RECORD_CREATED_AT = '2026-08-29 16:20:00';
  const SCHOOL_NAME = schoolOrderService?.SCHOOL_NAME || '静安第一中学';
  const CANTEEN_NAME = schoolOrderService?.CANTEEN_NAME || '第一食堂';
  const PARTICIPANTS = [
    { key: 'student', label: '学生', orderTag: '学生-不区分' },
    { key: 'teacher', label: '教师', orderTag: '教师-不区分' }
  ];
  let memoryRecords = [];

  if (!recipeService || !attendanceService || !schoolOrderService) return;

  const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
  const number = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const quantity = (value) => Number(number(value).toFixed(2));
  const normalizeExpectedAt = (value) => {
    const text = String(value || '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return `${text} 07:30:00`;
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(text)) return `${text}:00`;
    return text;
  };
  const timestamp = () => window.BusinessRules?.now?.()
    || new Date().toISOString().slice(0, 19).replace('T', ' ');
  const datePart = (value) => String(value || timestamp()).slice(0, 10).replace(/-/g, '');
  const currentSession = () => window.DemoStore?.getSession?.() || {};
  const currentOperator = () => {
    const session = currentSession();
    return {
      name: session.displayName || session.username || '当前用户',
      id: session.userId || session.id || ''
    };
  };

  function readAll() {
    const current = window.DemoStore?.get?.(RESOURCE);
    if (Array.isArray(current) && current.length) return current;
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

  function submittedDateSet(records = readAll()) {
    return new Set(records
      .filter((record) => !record.demoOnly)
      .flatMap((record) => Array.isArray(record.dates) ? record.dates : []));
  }

  function buildDateSummary(date, submittedDates) {
    const menu = recipeService.getMenu(date);
    const attendance = attendanceService.get(date);
    const calculation = attendanceService.calculate(menu, attendance);
    const validation = attendanceService.validate(menu, attendance);
    return {
      date,
      menu,
      attendance,
      calculation,
      validation,
      submitted: submittedDates.has(date),
      status: validation.canContinue ? '可提交' : (validation.missingMeals.length ? '未完成' : '不可提交')
    };
  }

  function aggregateRows(summaries) {
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
          studentQty: 0,
          teacherQty: 0,
          totalQty: 0,
          perCapitaQty: 0
        };
        current.studentQty = quantity(current.studentQty + number(row.studentQty));
        current.teacherQty = quantity(current.teacherQty + number(row.teacherQty));
        current.totalQty = quantity(current.studentQty + current.teacherQty);
        current.perCapitaQty = quantity(current.perCapitaQty + number(row.perCapitaQty));
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
    const dateSummaries = [buildDateSummary(DEMO_RECORD_DATE, new Set())];
    const summary = dateSummaries[0];
    const items = aggregateRows(dateSummaries);
    const studentPersonTimes = number(summary.calculation.totalStudentPeople);
    const teacherPersonTimes = number(summary.calculation.totalTeacherPeople);
    const totalPersonTimes = studentPersonTimes + teacherPersonTimes;
    const productCount = items.filter((row) => row.mappingStatus === '已关联').length;
    return {
      id: 'RECIPE-DEMAND-DEMO-20260829',
      recordNo: 'XQ202608290300001',
      demoOnly: true,
      schoolName: SCHOOL_NAME,
      canteen: CANTEEN_NAME,
      dates: [DEMO_RECORD_DATE],
      expectedAt: '2026-09-06 07:30:00',
      recipeVersion: summary.menu?.version || recipeService.MENU_VERSION,
      dateSummaries: dateSummaries.map((item) => ({
        date: item.date,
        attendance: clone(item.attendance),
        recipeVersion: item.menu?.version || recipeService.MENU_VERSION,
        studentPersonTimes: item.calculation.totalStudentPeople,
        teacherPersonTimes: item.calculation.totalTeacherPeople,
        totalPersonTimes: item.calculation.totalPeople,
        productCount: item.calculation.rows.filter((row) => row.mappingStatus === '已关联').length,
        items: clone(item.calculation.rows)
      })),
      items: clone(items),
      studentPersonTimes,
      teacherPersonTimes,
      totalPersonTimes,
      productCount,
      source: '食谱下单',
      submittedBy: '管理员',
      submittedById: 'USER-HEAD-ADMIN',
      submittedAt: DEMO_RECORD_CREATED_AT,
      orders: [
        { orderId: 'SCHOOL-ORDER-DEMO-20260829-STUDENT', orderNo: 'DD202608290300001', date: DEMO_RECORD_DATE, participantType: '学生', orderTag: '学生-不区分' },
        { orderId: 'SCHOOL-ORDER-DEMO-20260829-TEACHER', orderNo: 'DD202608290300002', date: DEMO_RECORD_DATE, participantType: '教师', orderTag: '教师-不区分' }
      ],
      enterpriseSyncWarnings: [],
      operationLogs: [
        { action: '提交需求', operator: '管理员', operatorId: 'USER-HEAD-ADMIN', result: '提交成功', time: DEMO_RECORD_CREATED_AT, description: `提交 ${DEMO_RECORD_DATE} 的食谱需求` },
        { action: '订单生成', operator: '系统', result: '2 笔', time: '2026-08-29 16:20:02', description: '已按学生、教师标签生成订单' }
      ]
    };
  }

  function buildPreview(dates) {
    const normalizedDates = normalizeDates(dates);
    const submittedDates = submittedDateSet();
    const dateSummaries = normalizedDates.map((date) => buildDateSummary(date, submittedDates));
    const rows = aggregateRows(dateSummaries);
    const totalStudentPersonTimes = dateSummaries.reduce((total, item) => total + number(item.calculation.totalStudentPeople), 0);
    const totalTeacherPersonTimes = dateSummaries.reduce((total, item) => total + number(item.calculation.totalTeacherPeople), 0);
    const alreadySubmitted = dateSummaries.filter((item) => item.submitted).map((item) => item.date);
    const invalidSummary = dateSummaries.find((item) => !item.validation.canContinue);
    const canSubmit = Boolean(normalizedDates.length)
      && !alreadySubmitted.length
      && !invalidSummary
      && rows.some((row) => row.mappingStatus === '已关联' && row.totalQty > 0);
    const message = !normalizedDates.length
      ? '请选择要提交的填报日期'
      : alreadySubmitted.length
        ? `${alreadySubmitted.join('、')} 已提交过需求，不能重复下单`
        : invalidSummary
          ? `${invalidSummary.date} ${invalidSummary.validation.message || '人数填报未完成'}`
          : canSubmit ? '' : '当前日期暂无可下单的商品需求';
    return {
      dates: normalizedDates,
      dateSummaries,
      rows,
      totalStudentPersonTimes,
      totalTeacherPersonTimes,
      totalPersonTimes: totalStudentPersonTimes + totalTeacherPersonTimes,
      productCount: rows.filter((row) => row.mappingStatus === '已关联').length,
      canSubmit,
      message
    };
  }

  function nextRecordNo(records, createdAt) {
    const prefix = `XQ${datePart(createdAt)}`;
    const max = records.reduce((current, record) => {
      const match = String(record.recordNo || '').match(new RegExp(`^${prefix}(\\d{5})$`));
      return Math.max(current, match ? Number(match[1]) : 0);
    }, 0);
    return `${prefix}${String(max + 1).padStart(5, '0')}`;
  }

  function getProductMap() {
    return new Map((schoolOrderService.getProductCatalog?.() || []).map((product) => [String(product.code), product]));
  }

  function participantItems(summary, participantKey, productMap) {
    const qtyKey = `${participantKey}Qty`;
    return (summary.items || [])
      .filter((row) => row.mappingStatus === '已关联' && number(row[qtyKey]) > 0)
      .map((row) => {
        const product = productMap.get(String(row.productCode)) || {};
        const orderQty = quantity(row[qtyKey]);
        const orderPrice = quantity(product.marketPrice || 0);
        return {
          productCode: row.productCode,
          productName: row.productName || product.name || row.ingredientNames?.[0] || '采购商品',
          unit: row.unit || product.unit || '--',
          brand: product.brand || '--',
          spec: product.spec || '--',
          isNetVegetable: product.isNetVegetable === true,
          orderQty,
          orderPrice,
          marketPrice: orderPrice,
          remark: `食谱${summary.date}${participantKey === 'student' ? '学生' : '教师'}需求`
        };
      });
  }

  async function createCentralOrder(order, participant, record, date) {
    if (!window.OperationsService?.create) return null;
    return window.OperationsService.create('orders', {
      orderId: order.id,
      orderNo: order.orderNo,
      sourceType: 'CUSTOMER',
      source: '食谱下单',
      customerName: order.customerName,
      customerType: '学校',
      canteen: order.canteen,
      orderTag: participant.orderTag,
      recipeTag: order.recipeTag,
      recipeDemandRecordId: record.id,
      recipeDemandRecordNo: record.recordNo,
      recipeDemandDate: date,
      recipeParticipantType: participant.label,
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
        brand: line.brand,
        spec: line.spec
      })),
      orderAmount: order.orderAmount,
      productCount: order.productCount,
      recipeTag: order.recipeTag,
      recipeDemandRecordId: record.id,
      recipeDemandRecordNo: record.recordNo,
      recipeDemandDate: date,
      recipeParticipantType: participant.label,
      status: 'PENDING_CONFIRM',
      creator: order.creator,
      createdAt: order.createdAt,
      operationLogs: [{
        action: '食谱需求下单',
        operator: order.creator,
        createdAt: order.createdAt,
        desc: `${order.creator} 根据需求提交记录 ${record.recordNo} 创建${participant.label}订单`
      }]
    });
  }

  async function submit(dates, options = {}) {
    const preview = buildPreview(dates);
    if (!preview.canSubmit) throw new Error(preview.message || '当前需求不能提交');
    const expectedAt = normalizeExpectedAt(options.expectedAt || options.expectedDeliveryAt);
    const earliestDate = preview.dates[0] || '';
    if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(expectedAt)) throw new Error('请选择期望送达时间');
    if (earliestDate && expectedAt.slice(0, 10) > earliestDate) throw new Error('期望送达时间不能晚于最早用料日期');

    const records = readAll();
    const operator = currentOperator();
    const createdAt = timestamp();
    const record = {
      id: `RECIPE-DEMAND-${datePart(createdAt)}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      recordNo: nextRecordNo(records, createdAt),
      schoolName: SCHOOL_NAME,
      canteen: CANTEEN_NAME,
      dates: clone(preview.dates),
      expectedAt,
      recipeVersion: preview.dateSummaries.find((item) => item.menu)?.menu?.version || recipeService.MENU_VERSION,
      dateSummaries: preview.dateSummaries.map((summary) => ({
        date: summary.date,
        attendance: clone(summary.attendance),
        recipeVersion: summary.menu?.version || recipeService.MENU_VERSION,
        studentPersonTimes: summary.calculation.totalStudentPeople,
        teacherPersonTimes: summary.calculation.totalTeacherPeople,
        totalPersonTimes: summary.calculation.totalPeople,
        productCount: summary.calculation.rows.filter((row) => row.mappingStatus === '已关联').length,
        items: clone(summary.calculation.rows)
      })),
      items: clone(preview.rows),
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

    const productMap = getProductMap();
    for (const summary of preview.dateSummaries) {
      for (const participant of PARTICIPANTS) {
        const items = participantItems({ ...summary, items: summary.calculation.rows }, participant.key, productMap);
        if (!items.length) continue;
        const order = schoolOrderService.create({
          id: `SCHOOL-ORDER-${datePart(createdAt)}-${record.recordNo}-${summary.date.replace(/-/g, '')}-${participant.key}`,
          customerName: SCHOOL_NAME,
          supplierName: schoolOrderService.SUPPLIER_NAME,
          canteen: CANTEEN_NAME,
          orderTag: participant.orderTag,
          recipeTag: `食谱Tag-${summary.date}`,
          recipeDemandRecordId: record.id,
          recipeDemandRecordNo: record.recordNo,
          recipeDemandDate: summary.date,
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
          enterpriseOrder = await createCentralOrder(order, participant, record, summary.date);
        } catch (error) {
          record.enterpriseSyncWarnings.push(`${order.orderNo}：${error.message || '企业端同步失败'}`);
        }
        record.orders.push({
          orderId: order.id,
          orderNo: order.orderNo,
          enterpriseOrderId: enterpriseOrder?.id || enterpriseOrder?.orderId || '',
          date: summary.date,
          participantType: participant.label,
          orderTag: participant.orderTag,
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
        ? `已按学生、教师标签生成订单：${record.orders.map((item) => item.orderNo).join('、')}`
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
    PARTICIPANTS,
    getAll() {
      return readAll().sort((a, b) => String(b.submittedAt || '').localeCompare(String(a.submittedAt || ''))).map(clone);
    },
    get(id) {
      const record = readAll().find((item) => String(item.id) === String(id) || String(item.recordNo) === String(id));
      return clone(record || null);
    },
    submittedDateSet,
    buildPreview,
    submit
  };
})();
