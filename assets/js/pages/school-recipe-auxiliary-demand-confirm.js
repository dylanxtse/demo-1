(function () {
  const canteenConfig = window.SchoolCanteenConfigService;
  const attendanceService = window.SchoolRecipeAttendanceService;
  const orderService = window.SchoolOrderService;
  if (!attendanceService || !orderService) return;

  const params = new URLSearchParams(window.location.search);
  const normalizeRecipeDate = (value) => {
    const match = String(value || '').trim().match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    return match ? `${match[1]}-${String(match[2]).padStart(2, '0')}-${String(match[3]).padStart(2, '0')}` : '';
  };
  const requestedDate = normalizeRecipeDate(params.get('date'));
  const date = requestedDate || '2026-09-07';
  const currentCanteen = canteenConfig?.getCanteen?.(params.get('canteen') || window.AppStorage?.read?.('school-recipe-auxiliary-current-canteen', '第一食堂')) || { name: '第一食堂' };
  const canteenScope = String(currentCanteen.id || currentCanteen.name || '第一食堂');
  const draftKey = 'school-recipe-auxiliary-attendance-drafts-v1';
  const selectedKey = 'school-recipe-auxiliary-selected-products-v1';
  const readDrafts = () => window.AppStorage?.read?.(draftKey, {}) || {};
  const allMenus = (window.SchoolRecipeService?.getAll?.() || [])
    .map((menu) => ({ ...menu, date: normalizeRecipeDate(menu.date) }))
    .filter((menu) => menu.date)
    .sort((a, b) => a.date.localeCompare(b.date));
  const allDates = [...new Set(allMenus.map((menu) => menu.date))];
  const mealNameFallbacks = {
    breakfast: '早餐',
    morningSnack: '早点',
    lunch: '午餐',
    afternoonSnack: '午点',
    dinner: '晚餐',
    eveningSnack: '晚点',
    snack: '加餐'
  };
  const mealDefinitionsForDate = (targetDate) => (allMenus.find((menu) => menu.date === targetDate)?.meals || [])
    .map((meal) => ({ key: String(meal.key || ''), name: meal.name || mealNameFallbacks[meal.key] || meal.key }))
    .filter((meal) => meal.key);
  const meals = [...new Map(allMenus.flatMap((menu) => mealDefinitionsForDate(menu.date)).map((meal) => [meal.key, meal])).values()];
  const products = [
    { id: 'aux-oil', auxiliaryName: '油', name: '金龙鱼5L桶装油', brand: '金龙鱼', code: 'SP0300030', spec: '5L/桶', doseUnit: 'L', doseDisplay: '12 ml', purchaseUnit: '桶', packSize: 5, dose: 0.012, marketPrice: 55 },
    { id: 'aux-salt', auxiliaryName: '盐', name: '食盐', brand: '—', code: 'SP0300031', spec: '500g/袋', doseUnit: 'kg', doseDisplay: '4 g', purchaseUnit: '袋', packSize: 0.5, dose: 0.004, marketPrice: 18.5 },
    { id: 'aux-msg', auxiliaryName: '味精', name: '味精', brand: '—', code: 'SP0300032', spec: '250g/袋', doseUnit: 'kg', doseDisplay: '1 g', purchaseUnit: '袋', packSize: 0.25, dose: 0.001, marketPrice: 8 }
  ];
  const draftForDate = (targetDate) => {
    const source = readDrafts()?.[canteenScope]?.[targetDate] || {};
    const dateMeals = mealDefinitionsForDate(targetDate);
    const hasSnackMeal = dateMeals.some((meal) => meal.key === 'snack');
    const hasDinnerMeal = dateMeals.some((meal) => meal.key === 'dinner');
    if (!hasSnackMeal || hasDinnerMeal || Object.prototype.hasOwnProperty.call(source, 'snack') || !source.dinner) return source;
    return { ...source, snack: source.dinner };
  };
  const selectedProductsFromAttendance = () => {
    const selectedIds = window.AppStorage?.read?.(selectedKey, {})?.[canteenScope] || ['aux-oil', 'aux-salt'];
    return products.filter((product) => selectedIds.includes(product.id));
  };
  let selected = selectedProductsFromAttendance();
  const settings = window.DemoStore?.getSettings?.() || {};
  const splitMeal = settings.splitOrderByMeal !== false && settings.splitOrderByMeal !== 'false' && settings.splitOrderByMeal !== 0 && settings.splitOrderByMeal !== '0';
  const splitPerson = settings.splitOrderByPersonType === true || settings.splitOrderByPersonType === 'true' || settings.splitOrderByPersonType === 1 || settings.splitOrderByPersonType === '1';
  const participants = attendanceService.participantsFor(currentCanteen) || [];
  const participantIdentity = (participant, index) => String(participant?.key || participant?.tagId || participant?.id || participant?.orderTag || `participant_${index + 1}`);
  const labels = participants.map(participantIdentity);
  const participantForKey = (value) => {
    const text = String(value || '');
    return participants.find((participant, index) => participantIdentity(participant, index) === text
      || String(participant.tagId || '') === text
      || String(participant.orderTag || '') === text
      || String(participant.legacyKey || '') === text) || null;
  };
  const legacyParticipantKey = (participant) => {
    const label = participant?.label || participant?.tagName || '';
    return participant?.legacyKey || (label === '学生' ? 'student' : label === '教师' || label === '教职工' ? 'teacher' : '');
  };
  const keyFor = (value) => {
    const participant = participantForKey(value);
    return participant ? participantIdentity(participant, participants.indexOf(participant)) : String(value || '');
  };
  const weekdayNames = ['日', '一', '二', '三', '四', '五', '六'];
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const amount = (value) => Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false });
  const participantFields = (value) => {
    const participant = participantForKey(value);
    return [...new Set([
      keyFor(value),
      participant?.tagId,
      participant?.orderTag,
      legacyParticipantKey(participant)
    ].filter(Boolean).map(String))];
  };
  const valueForParticipant = (meal, value, prefix = '') => {
    const source = meal || {};
    const field = participantFields(value).map((key) => `${prefix}${key}`).find((key) => Object.prototype.hasOwnProperty.call(source, key));
    return field ? source[field] : '';
  };
  const people = (meal, label) => Math.max(0, Number(valueForParticipant(meal, label) || 0) - Number(valueForParticipant(meal, label, 'nonDining_') || 0));
  const mealPeople = (meal) => labels.reduce((sum, label) => sum + people(meal, label), 0);
  const participantPersonTimes = (targetDate) => Object.fromEntries(labels.map((label) => [
    keyFor(label), mealDefinitionsForDate(targetDate).reduce((total, meal) => total + people(draftForDate(targetDate)[meal.key], label), 0)
  ]));
  const totalPeopleForDate = (targetDate) => Object.values(participantPersonTimes(targetDate)).reduce((sum, value) => sum + Number(value || 0), 0);
  const filledDates = () => allDates.filter((targetDate) => totalPeopleForDate(targetDate) > 0);
  const purchase = (value, product) => product.packSize ? Math.ceil(value / product.packSize) * product.packSize : value;
  const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value || {}, key);
  const productKey = (product) => String(product?.code || product?.id || '');
  const purchaseKey = (groupKey, product, label) => `${groupKey}::${productKey(product)}::${keyFor(label || '合计')}`;
  const unitPriceKey = (product) => productKey(product);
  const minimumAmount = () => window.SchoolOrderService?.minimumAmount?.() ?? 0.01;
  const canModifyUnitPrice = () => window.SchoolOrderService?.canModifyClientOrderPrice?.() !== false;
  const catalogProductFor = (product) => (orderService.getProductCatalog?.() || []).find((item) => String(item.code) === String(product.code)) || product;
  const defaultUnitPrice = (product) => number(orderService.currentSalesPrice?.(catalogProductFor(product)) || product.marketPrice) || 1;
  const unitPriceValue = (product) => canModifyUnitPrice() && hasOwn(state.unitPriceOverrides, unitPriceKey(product))
    ? number(state.unitPriceOverrides[unitPriceKey(product)]) : defaultUnitPrice(product);
  const purchaseValue = (groupKey, product, label, demand) => {
    const key = purchaseKey(groupKey, product, label);
    return hasOwn(state.purchaseQtyOverrides, key) ? number(state.purchaseQtyOverrides[key]) : purchase(demand, product);
  };
  const state = { meal: meals.find((meal) => meal.key === 'lunch')?.key || meals[0]?.key || '', selectedDates: new Set(filledDates()), submitting: false, expectedAt: '', purchaseQtyOverrides: {}, unitPriceOverrides: {} };
  const mealRows = () => splitMeal ? [meals.find((meal) => meal.key === state.meal)] : meals;
  const demandFor = (product, mealList, label) => [...state.selectedDates].reduce((sum, targetDate) => {
    const availableMealKeys = new Set(mealDefinitionsForDate(targetDate).map((meal) => meal.key));
    return sum + mealList
      .filter((meal) => availableMealKeys.has(meal.key))
      .reduce((mealTotal, meal) => mealTotal + people(draftForDate(targetDate)[meal.key], label) * product.dose, 0);
  }, 0);
  const productDisplay = (product) => `${product.name}（${product.doseUnit}/${product.brand}/${product.spec}）`;
  const number = (value) => Number(value || 0);
  const timestamp = () => window.BusinessRules?.now?.()
    || new Date().toISOString().slice(0, 19).replace('T', ' ');
  const dateObject = (value) => {
    const fallbackDate = allDates[0] || date;
    const parsed = new Date(`${String(value || fallbackDate)}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? new Date(`${fallbackDate}T00:00:00`) : parsed;
  };
  const dateValue = (value) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  const dateLabel = (value) => {
    const parsed = dateObject(value);
    return `${String(parsed.getMonth() + 1).padStart(2, '0')}月${String(parsed.getDate()).padStart(2, '0')}日 星期${weekdayNames[parsed.getDay()]}`;
  };
  const expectedAt = () => {
    const deliveryDate = dateObject([...state.selectedDates].sort()[0] || date);
    deliveryDate.setDate(deliveryDate.getDate() - 1);
    return `${dateValue(deliveryDate)} 07:30:00`;
  };
  state.expectedAt = expectedAt();
  let expectedAtPicker = null;
  const operator = () => {
    const session = window.SchoolMobileAuth?.getSession?.() || window.DemoStore?.getSession?.() || {};
    return { name: session.displayName || session.username || '当前用户', id: session.userId || session.id || '' };
  };
  const navigate = (url) => {
    if (window.AppNavigationGuard?.navigate) window.AppNavigationGuard.navigate(url);
    else window.location.href = url;
  };
  const showToast = (message, isError = false) => {
    document.querySelector('.operations-toast')?.remove();
    const toast = document.createElement('div');
    toast.className = `operations-toast${isError ? ' error' : ''}`;
    toast.textContent = message;
    toast.setAttribute('role', 'status');
    document.body.appendChild(toast);
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.remove(), 2400);
  };
  const participantFor = (label) => {
    const participant = participantForKey(label) || {};
    const displayLabel = participant.label || participant.tagName || label;
    return {
      key: keyFor(label),
      label: displayLabel,
      tagId: participant.tagId || participant.id || keyFor(label),
      tagName: participant.tagName || displayLabel,
      nutritious: participant.nutritious || '不区分',
      orderTag: participant.orderTag || `${participant.tagName || displayLabel}-${participant.nutritious || '不区分'}`
    };
  };
  const participantDisplayName = (label) => {
    const participant = participantForKey(label) || {};
    return `${participant.label || participant.tagName || label} - ${participant.nutritious || '不区分'}`;
  };
  const rowsForDate = (targetDate) => selected.map((product) => {
    const targetDraft = draftForDate(targetDate);
    const dateMeals = mealDefinitionsForDate(targetDate);
    const participantQty = Object.fromEntries(labels.map((label) => [
      keyFor(label), dateMeals.reduce((sum, meal) => sum + people(targetDraft[meal.key], label) * product.dose, 0)
    ]));
    const totalQty = Object.values(participantQty).reduce((sum, value) => sum + number(value), 0);
    return {
      key: `${product.code}::${product.doseUnit}`,
      mappingStatus: '已关联',
      productCode: product.code,
      productName: product.name,
      unit: product.doseUnit,
      brand: product.brand,
      spec: product.spec,
      isStandardProduct: false,
      participantQty,
      totalQty,
      purchaseQty: purchase(totalQty, product),
      unitPrice: unitPriceValue(product),
      auxiliaryName: product.auxiliaryName
    };
  });
  const dateSummaryFor = (targetDate) => {
    const participantTimes = participantPersonTimes(targetDate);
    const rows = rowsForDate(targetDate);
    const dateMeals = mealDefinitionsForDate(targetDate);
    const totalPeople = Object.values(participantTimes).reduce((sum, value) => sum + number(value), 0);
    return {
      date: targetDate,
      meals: dateMeals,
      attendance: { meals: draftForDate(targetDate) },
      participants: labels.map(participantFor),
      participantPersonTimes: participantTimes,
      studentPersonTimes: participantTimes.student || 0,
      teacherPersonTimes: participantTimes.teacher || 0,
      totalPersonTimes: totalPeople,
      productCount: rows.filter((row) => row.totalQty > 0).length,
      items: rows
    };
  };
  const buildPreview = () => {
    const dates = [...state.selectedDates].filter((targetDate) => allDates.includes(targetDate)).sort();
    const dateSummaries = dates.map(dateSummaryFor).filter((summary) => summary.totalPersonTimes > 0);
    const participantTimes = Object.fromEntries(labels.map((label) => [
      keyFor(label), dateSummaries.reduce((sum, summary) => sum + number(summary.participantPersonTimes[keyFor(label)]), 0)
    ]));
    const rows = selected.map((product) => {
      const participantQty = Object.fromEntries(labels.map((label) => [keyFor(label), demandFor(product, meals, label)]));
      const totalQty = Object.values(participantQty).reduce((sum, value) => sum + number(value), 0);
      return {
        key: `${product.code}::${product.doseUnit}`,
        mappingStatus: '已关联',
        productCode: product.code,
        productName: product.name,
        unit: product.doseUnit,
        brand: product.brand,
        spec: product.spec,
        isStandardProduct: false,
        participantQty,
        totalQty,
        purchaseQty: purchaseValue('all-meals', product, '合计', totalQty),
        unitPrice: unitPriceValue(product),
        auxiliaryName: product.auxiliaryName
      };
    });
    const totalPeople = Object.values(participantTimes).reduce((sum, value) => sum + number(value), 0);
    const canSubmit = Boolean(dateSummaries.length && selected.length && totalPeople > 0 && rows.some((row) => row.totalQty > 0));
    return {
      dates: dateSummaries.map((summary) => summary.date),
      dateSummaries,
      canteen: currentCanteen,
      participants: labels.map(participantFor),
      participantPersonTimes: participantTimes,
      totalPersonTimes: totalPeople,
      totalStudentPersonTimes: participantTimes.student || 0,
      totalTeacherPersonTimes: participantTimes.teacher || 0,
      rows,
      productCount: rows.filter((row) => row.totalQty > 0).length,
      canSubmit,
      message: !selected.length ? '请先选择辅料商品' : totalPeople <= 0 ? '请先填写就餐人数' : canSubmit ? '' : '当前没有可下单的辅料需求'
    };
  };
  const mealGroups = () => splitMeal
    ? meals.map((meal) => ({ key: meal.key, name: meal.name, meals: [meal] }))
    : [{ key: 'all-meals', name: meals.map((meal) => meal.name).join('、'), meals }];
  const orderItemsFor = (group, label) => selected.map((product) => {
    const demandQty = demandFor(product, group.meals, label);
    if (!(demandQty > 0)) return null;
    const quantity = purchaseValue(group.key, product, label, demandQty);
    const orderPrice = unitPriceValue(product);
    return {
      productCode: product.code,
      productName: product.name,
      unit: product.doseUnit,
      brand: product.brand,
      spec: product.spec,
      orderQty: quantity,
      orderPrice,
      isNetVegetable: false,
      isStandardProduct: false,
      remark: `辅料${[...state.selectedDates].sort().join('、')}${group.name}${label}需求`
    };
  }).filter(Boolean);
  const nextRecordNo = (records, createdAt) => {
    const prefix = `XQ${String(createdAt).slice(0, 10).replace(/-/g, '')}`;
    const existing = new Set((records || []).map((record) => String(record.recordNo || '')));
    let recordNo = '';
    do recordNo = `${prefix}${String(Math.floor(10000 + Math.random() * 90000)).padStart(5, '0')}`;
    while (existing.has(recordNo));
    return recordNo;
  };
  const readDemandRecords = () => window.DemoStore?.get?.('recipeDemandRecords') || [];
  const writeDemandRecords = (records) => window.DemoStore?.replace?.('recipeDemandRecords', records);
  const clearAuxiliaryDraft = (dates = []) => {
    const next = window.AppStorage?.read?.(draftKey, {}) || {};
    if (!next[canteenScope]) return;
    dates.forEach((targetDate) => delete next[canteenScope][targetDate]);
    if (!Object.keys(next[canteenScope]).length) delete next[canteenScope];
    window.AppStorage?.write?.(draftKey, next);
  };

  async function submitAuxiliary(preview) {
    if (!preview.canSubmit) throw new Error(preview.message || '当前需求不能提交');
    const createdAt = timestamp();
    const currentOperator = operator();
    const records = readDemandRecords();
    const record = {
      id: `AUXILIARY-DEMAND-${String(createdAt).replace(/[-: ]/g, '')}-${Math.random().toString(36).slice(2, 7)}`,
      recordNo: nextRecordNo(records, createdAt),
      schoolName: orderService.SCHOOL_NAME || '静安第一中学',
      canteen: currentCanteen.name || '第一食堂',
      canteenId: currentCanteen.id || '',
      participants: preview.participants,
      dates: preview.dates,
      expectedAt: state.expectedAt || expectedAt(),
      recipeVersion: '',
      auxiliary: true,
      source: '学校端辅料下单',
      submittedBy: currentOperator.name,
      submittedById: currentOperator.id,
      submittedAt: createdAt,
      dateSummaries: preview.dateSummaries.map((summary) => ({
        date: summary.date,
        attendance: summary.attendance,
        recipeVersion: '',
        participants: preview.participants,
        participantPersonTimes: summary.participantPersonTimes,
        studentPersonTimes: summary.studentPersonTimes,
        teacherPersonTimes: summary.teacherPersonTimes,
        totalPersonTimes: summary.totalPersonTimes,
        productCount: summary.productCount,
        items: summary.items
      })),
      items: preview.rows,
      participantPersonTimes: preview.participantPersonTimes,
      studentPersonTimes: preview.totalStudentPersonTimes,
      teacherPersonTimes: preview.totalTeacherPersonTimes,
      totalPersonTimes: preview.totalPersonTimes,
      productCount: preview.productCount,
      orders: [],
      enterpriseSyncWarnings: [],
      operationLogs: [{
        action: '提交需求并下单',
        operator: currentOperator.name,
        operatorId: currentOperator.id,
        result: '提交成功',
        time: createdAt,
        description: `提交 ${preview.dates.join('、')} 的辅料需求`
      }]
    };
    writeDemandRecords([...records, record]);

    for (const participant of preview.participants) {
      for (const group of mealGroups()) {
        const items = orderItemsFor(group, participant.key);
        if (!items.length) continue;
        const mealPeople = [...state.selectedDates].reduce((total, targetDate) => (
          total + group.meals.reduce((sum, meal) => sum + people(draftForDate(targetDate)[meal.key], participant.key), 0)
        ), 0);
        const order = orderService.create({
          id: `SCHOOL-ORDER-${String(createdAt).slice(0, 10).replace(/-/g, '')}-${record.recordNo}-${participant.key}-${group.key}-AUX`,
          customerName: orderService.SCHOOL_NAME || '静安第一中学',
          supplierName: orderService.SUPPLIER_NAME,
          canteen: currentCanteen.name || '第一食堂',
          canteenId: currentCanteen.id || '',
          orderTag: participant.orderTag,
          orderTagId: participant.tagId,
          orderTagName: participant.tagName,
          nutritious: participant.nutritious,
          mealKey: splitMeal ? group.key : '',
          mealName: group.name,
          mealPeople,
          recipeDemandRecordId: record.id,
          recipeDemandRecordNo: record.recordNo,
          recipeDemandDate: preview.dates.join('、'),
          recipeParticipantType: participant.label,
          expectedAt: record.expectedAt,
          supplement: '否',
          source: '食谱下单',
          status: '待审核',
          creator: currentOperator.name,
          items
        });
        let enterpriseOrder = null;
        try {
          enterpriseOrder = await window.OperationsService?.create?.('orders', {
            orderId: order.id,
            orderNo: order.orderNo,
            sourceType: 'CUSTOMER',
            source: '食谱下单',
            customerName: order.customerName,
            customerType: '学校',
            canteen: order.canteen,
            canteenId: order.canteenId,
            orderTag: participant.orderTag,
            orderTagId: participant.tagId,
            orderTagName: participant.tagName,
            nutritious: participant.nutritious,
            recipeDemandRecordId: record.id,
            recipeDemandRecordNo: record.recordNo,
            recipeDemandDate: preview.dates.join('、'),
            recipeParticipantType: participant.label,
            mealKey: order.mealKey,
            mealName: order.mealName,
            mealPeople: order.mealPeople,
            expectedAt: order.expectedAt,
            items: order.items.map((line) => ({
              productId: line.productCode,
              goodsCode: line.productCode,
              goodsName: line.productName,
              productName: line.productName,
              unit: line.unit,
              unitPrice: line.orderPrice,
              quantity: line.orderQty,
              orderQty: line.orderQty,
              subtotal: line.orderQty * line.orderPrice,
              isNetVegetable: false,
              isStandardProduct: false,
              brand: line.brand,
              spec: line.spec
            })),
            orderAmount: order.orderAmount,
            productCount: order.productCount,
            status: 'PENDING_CONFIRM',
            creator: order.creator,
            createdAt: order.createdAt
          });
        } catch (error) {
          record.enterpriseSyncWarnings.push(`${order.orderNo}：${error.message || '企业端同步失败'}`);
        }
        record.orders.push({
          orderId: order.id,
          orderNo: order.orderNo,
          enterpriseOrderId: enterpriseOrder?.id || enterpriseOrder?.orderId || '',
          date: preview.dates.join('、'),
          dates: [...preview.dates],
          mealKey: order.mealKey,
          mealName: order.mealName,
          mealPeople,
          participantType: participant.label,
          orderTag: participant.orderTag,
          orderTagId: participant.tagId,
          orderTagName: participant.tagName,
          nutritious: participant.nutritious,
          expectedAt: record.expectedAt
        });
        writeDemandRecords([...records, record]);
      }
    }
    record.operationLogs.push({
      action: '订单生成',
      operator: currentOperator.name,
      operatorId: currentOperator.id,
      result: `${record.orders.length} 笔`,
      time: timestamp(),
      description: record.orders.length ? `已生成辅料订单：${record.orders.map((item) => item.orderNo).join('、')}` : '没有生成可下单商品'
    });
    writeDemandRecords([...records, record]);
    return { record, orders: record.orders, preview };
  }

  function closeSubmitConfirm() {
    document.querySelector('#schoolRecipeAuxiliarySubmitModal')?.remove();
  }

  function submitFromConfirm(preview, modal) {
    const confirmButton = modal.querySelector('[data-modal-confirm]');
    if (!confirmButton || state.submitting) return;
    state.submitting = true;
    confirmButton.disabled = true;
    confirmButton.textContent = '提交中…';
    modal.querySelector('[data-modal-cancel]')?.setAttribute('disabled', 'disabled');
    submitAuxiliary(preview)
      .then(() => {
        clearAuxiliaryDraft(preview.dates);
        closeSubmitConfirm();
        showToast('操作成功');
        window.setTimeout(() => navigate(`./school-recipe-auxiliary-attendance.html?date=${encodeURIComponent(date)}`), 700);
      })
      .catch((error) => {
        state.submitting = false;
        closeSubmitConfirm();
        showToast(error.message || '提交失败，请稍后重试', true);
      });
  }

  function openSubmitConfirm(preview) {
    closeSubmitConfirm();
    const backdrop = document.createElement('div');
    backdrop.id = 'schoolRecipeAuxiliarySubmitModal';
    backdrop.className = 'operations-modal-backdrop';
    backdrop.innerHTML = `<section class="operations-modal is-confirm school-recipe-demand-submit-modal" role="dialog" aria-modal="true" aria-label="提示">
      <header class="operations-modal-header"><h3>提示</h3><button type="button" data-modal-close aria-label="关闭">×</button></header>
      <div class="operations-modal-body"><div class="school-recipe-demand-submit-confirm"><p>确认生成订单吗？</p><div class="processing-detail-info school-recipe-demand-submit-info"><div class="info-item"><span class="info-label">食堂：</span><span class="info-value">${escapeHtml(currentCanteen.name || '第一食堂')}</span></div><div class="info-item"><span class="info-label">用料日期：</span><span class="info-value">${escapeHtml(preview.dates.join('、') || '--')}</span></div><div class="info-item"><span class="info-label">期望送达时间：</span><span class="info-value">${escapeHtml(state.expectedAt || expectedAt())}</span></div></div></div></div>
      <footer class="operations-modal-footer"><button type="button" class="btn" data-modal-cancel>取消</button><button type="button" class="btn btn-primary" data-modal-confirm>确定</button></footer>
    </section>`;
    document.body.appendChild(backdrop);
    const modal = backdrop.querySelector('.school-recipe-demand-submit-modal');
    const close = () => { if (!state.submitting) closeSubmitConfirm(); };
    backdrop.addEventListener('click', (event) => {
      if (event.target === backdrop || event.target.closest('[data-modal-close], [data-modal-cancel]')) close();
    });
    modal.querySelector('[data-modal-confirm]')?.addEventListener('click', () => submitFromConfirm(preview, modal));
    modal.querySelector('[data-modal-confirm]')?.focus();
  }

  function renderAuxiliaryAttendanceDetail(summary) {
    const saved = summary?.attendance?.meals || {};
    const summaryMeals = summary?.meals?.length ? summary.meals : meals;
    const personHeaders = labels.length
      ? labels.map((label) => `<th>${escapeHtml(participantDisplayName(label))}</th>`).join('')
      : '<th>暂无人员类型</th>';
    const rows = summaryMeals.map((meal) => `<tr><td>${escapeHtml(meal.name)}</td>${labels.length ? labels.map((label) => `<td class="is-number">${people(saved[meal.key], label)}</td>`).join('') : '<td class="is-number">--</td>'}<td class="is-number is-total">${mealPeople(saved[meal.key])}</td></tr>`).join('');
    const colspan = 2 + Math.max(1, labels.length);
    return `<div class="school-recipe-demand-attendance-detail"><table class="school-recipe-demand-attendance-detail-table"><colgroup><col class="col-meal">${labels.map(() => '<col class="col-person">').join('')}<col class="col-total"></colgroup><thead><tr><th>餐次</th>${personHeaders}<th>实际就餐人次合计</th></tr></thead><tbody>${rows || `<tr><td colspan="${colspan}" class="school-recipe-demand-record-detail-empty-cell">暂无餐次填报记录</td></tr>`}</tbody></table></div>`;
  }

  function renderAuxiliaryDateSummary(preview) {
    const summaries = preview.dateSummaries || [];
    const participantHeaders = labels.map((label) => `<th>${escapeHtml(`${participantDisplayName(label)}人次`)}</th>`).join('');
    const participantColgroup = labels.map(() => '<col class="col-person">').join('');
    const rows = summaries.map((summary, index) => {
      const saved = summary.attendance?.meals || {};
      const summaryMeals = summary.meals?.length ? summary.meals : meals;
      const filledMeals = summaryMeals.filter((meal) => mealPeople(saved[meal.key]) > 0).map((meal) => meal.name).join('、') || '--';
      const participantTimes = summary.participantPersonTimes || {};
      const detailId = `schoolRecipeAuxiliaryDemandDateDetail${index}`;
      const cannotDelete = summaries.length <= 1;
      const deleteTitle = cannotDelete ? '至少保留一个填报日期' : '删除该日期填报';
      return `<tr class="school-recipe-demand-date-row"><td class="school-recipe-demand-date-expand-cell"><button type="button" class="school-recipe-demand-date-expand-button" data-action="toggle-date" data-date="${escapeHtml(summary.date)}" aria-expanded="false" aria-controls="${detailId}" aria-label="展开 ${escapeHtml(summary.date)} 的餐次填报记录"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"></path></svg></button></td><td>${escapeHtml(dateLabel(summary.date))}</td><td>${escapeHtml(filledMeals)}</td><td>${escapeHtml(currentCanteen.name || '第一食堂')}</td>${labels.map((label) => `<td class="is-number">${number(participantTimes[keyFor(label)])}</td>`).join('')}<td class="is-number is-total">${number(summary.totalPersonTimes)}</td><td class="is-number">${number(summary.productCount)}</td><td class="school-recipe-demand-table-action"><button type="button" class="school-recipe-demand-delete" data-action="delete-attendance" data-date="${escapeHtml(summary.date)}" title="${escapeHtml(deleteTitle)}" ${cannotDelete ? 'disabled' : ''}>删除</button></td></tr><tr id="${detailId}" class="school-recipe-demand-date-detail-row" data-date-detail-row hidden><td colspan="${7 + labels.length}">${renderAuxiliaryAttendanceDetail(summary)}</td></tr>`;
    }).join('');
    return rows
      ? `<div class="school-recipe-demand-table-wrap"><table class="school-recipe-demand-table school-recipe-demand-date-table"><colgroup><col class="col-expand"><col class="col-date"><col class="col-meal"><col class="col-version">${participantColgroup}<col class="col-total"><col class="col-count"><col class="col-action"></colgroup><thead><tr><th aria-label="展开"></th><th>用料日期</th><th>填报餐次</th><th>食堂名称</th>${participantHeaders}<th class="is-total">总人次</th><th>商品种数</th><th>操作</th></tr></thead><tbody>${rows}</tbody></table></div>`
      : '<div class="school-recipe-demand-empty">暂无已填报日期</div>';
  }

  const validateEditableFields = () => {
    let firstInvalid = null;
    root.querySelectorAll('[data-aux-unit-price]').forEach((input) => {
      const value = Number(input.value);
      const valid = input.disabled || (Number.isFinite(value) && value >= minimumAmount());
      input.classList.toggle('is-invalid', !valid);
      input.setAttribute('aria-invalid', String(!valid));
      if (!valid && !firstInvalid) firstInvalid = input;
      if (valid && !input.disabled) state.unitPriceOverrides[input.dataset.unitPriceKey] = input.value;
    });
    root.querySelectorAll('[data-aux-purchase-quantity]').forEach((input) => {
      const value = Number(input.value);
      const valid = Number.isFinite(value) && value >= 0;
      input.classList.toggle('is-invalid', !valid);
      input.setAttribute('aria-invalid', String(!valid));
      if (!valid && !firstInvalid) firstInvalid = input;
      if (valid) state.purchaseQtyOverrides[input.dataset.purchaseKey] = input.value;
    });
    if (firstInvalid) {
      firstInvalid.focus();
      showToast(firstInvalid.matches('[data-aux-unit-price]') ? `单价不能低于${minimumAmount()}` : '采购量不能小于0', true);
      return false;
    }
    return true;
  };

  function renderProducts() {
    const activeMeals = mealRows().filter(Boolean);
    const columns = splitPerson
      ? labels.map((label) => `<th colspan="2">${escapeHtml(participantDisplayName(label))}</th>`).join('')
      : '<th colspan="2">合计</th>';
    const subColumns = splitPerson ? labels.map(() => '<th>需求量</th><th>采购量</th>').join('') : '<th>需求量</th><th>采购量</th>';
    const colgroup = splitPerson ? labels.map(() => '<col class="col-quantity"><col class="col-purchase">').join('') : '<col class="col-quantity"><col class="col-purchase">';
    const rows = selected.map((product, index) => {
      const cells = splitPerson
        ? labels.flatMap((label) => { const demand = demandFor(product, activeMeals, label); const key = purchaseKey(splitMeal ? state.meal : 'all-meals', product, label); return [`<td class="is-number">${amount(demand)} ${product.doseUnit}</td>`, `<td class="is-number school-recipe-demand-purchase-cell"><div class="school-recipe-demand-purchase-control"><input class="school-recipe-demand-purchase-input" type="number" min="0" step="any" inputmode="decimal" value="${amount(purchaseValue(splitMeal ? state.meal : 'all-meals', product, label, demand))}" data-aux-purchase-quantity data-purchase-key="${escapeHtml(key)}" aria-label="${escapeHtml(`${participantDisplayName(label)}采购量`)}"><button type="button" class="school-recipe-demand-purchase-clear" data-aux-purchase-clear data-purchase-key="${escapeHtml(key)}" aria-label="清空采购量">×</button></div></td>`]; })
        : (() => { const demand = labels.reduce((sum, label) => sum + demandFor(product, activeMeals, label), 0); const key = purchaseKey(splitMeal ? state.meal : 'all-meals', product, '合计'); return [`<td class="is-number">${amount(demand)} ${product.doseUnit}</td>`, `<td class="is-number school-recipe-demand-purchase-cell"><div class="school-recipe-demand-purchase-control"><input class="school-recipe-demand-purchase-input" type="number" min="0" step="any" inputmode="decimal" value="${amount(purchaseValue(splitMeal ? state.meal : 'all-meals', product, '合计', demand))}" data-aux-purchase-quantity data-purchase-key="${escapeHtml(key)}" aria-label="采购量"><button type="button" class="school-recipe-demand-purchase-clear" data-aux-purchase-clear data-purchase-key="${escapeHtml(key)}" aria-label="清空采购量">×</button></div></td>`]; })();
      const priceKey = unitPriceKey(product);
      const priceCell = `<td class="is-number school-recipe-demand-unit-price-cell"><input class="school-recipe-demand-unit-price-input" type="number" min="${minimumAmount()}" step="${minimumAmount()}" inputmode="decimal" value="${amount(unitPriceValue(product))}" data-aux-unit-price data-unit-price-key="${escapeHtml(priceKey)}"${canModifyUnitPrice() ? '' : ' disabled'} aria-label="${escapeHtml(`${product.name}单价`)}"></td>`;
      return `<tr><td>${index + 1}</td><td>${escapeHtml(product.auxiliaryName)}</td><td>${escapeHtml(productDisplay(product))}</td><td>${escapeHtml(product.code)}</td><td>${escapeHtml(product.doseUnit)}</td>${priceCell}${cells.join('')}<td class="school-recipe-demand-product-action"><button type="button" class="school-recipe-demand-product-clear-row" data-action="remove-product" data-product-key="${escapeHtml(product.id)}" data-product-name="${escapeHtml(product.auxiliaryName)}">移除</button></td></tr>`;
    }).join('');
    return rows ? `<div class="school-recipe-demand-table-wrap"><table class="school-recipe-demand-table school-recipe-demand-product-table school-recipe-demand-auxiliary-product-table"><colgroup><col class="col-index"><col class="col-product"><col class="col-product"><col class="col-code"><col class="col-unit"><col class="col-unit-price">${colgroup}<col class="col-action"></colgroup><thead><tr><th rowspan="2">序号</th><th rowspan="2">辅料</th><th rowspan="2">商品</th><th rowspan="2">编号</th><th rowspan="2">单位</th><th rowspan="2">单价</th>${columns}<th rowspan="2">操作</th></tr><tr>${subColumns}</tr></thead><tbody>${rows}</tbody></table></div>` : '<div class="school-recipe-demand-empty">暂无辅料商品</div>';
  }

  function render(preview = buildPreview()) {
    const tabs = splitMeal ? `<div class="school-recipe-meal-tabs school-recipe-demand-meal-tabs" role="tablist">${meals.map((meal) => `<button type="button" class="school-recipe-meal-tab${meal.key === state.meal ? ' is-active' : ''}" data-meal="${meal.key}" role="tab">${meal.name}</button>`).join('')}</div>` : '';
    return `<section class="page-card school-recipe-demand-confirm-page" id="schoolRecipeAuxiliaryDemandConfirmPage"><main class="school-recipe-demand-detail-panel"><header class="school-recipe-demand-detail-header"><button type="button" class="back-link school-recipe-demand-back" data-action="back">← <span>返回</span></button><h1>辅料需求确认</h1></header><div class="school-recipe-demand-detail-scroll"><div class="school-recipe-demand-meta"><div class="school-recipe-demand-canteen-summary"><span>用料食堂：</span><strong>${escapeHtml(currentCanteen.name || '第一食堂')}</strong></div><div class="operations-field school-recipe-demand-delivery-field"><label class="filter-label" for="schoolRecipeAuxiliaryExpectedAt">期望送达时间</label><div class="date-input-control"><input class="filter-input" id="schoolRecipeAuxiliaryExpectedAt" type="text" value="${escapeHtml(state.expectedAt)}" placeholder="请选择日期" readonly aria-label="期望送达时间"><span class="date-range-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></span></div></div></div><section class="school-recipe-demand-section school-recipe-demand-date-summary-section"><header><div><span class="section-title-mark">用料日期汇总</span></div></header>${renderAuxiliaryDateSummary(preview)}</section><section class="school-recipe-demand-section"><header><div><span class="section-title-mark">商品需求汇总</span></div><button type="button" class="btn btn-sm school-recipe-demand-restore-default" data-action="restore-default">恢复默认</button></header><div class="school-recipe-demand-meal-toolbar">${tabs}</div>${renderProducts()}</section></div><footer class="school-recipe-demand-actions"><button type="button" class="btn btn-sm" data-action="back">返回</button><button type="button" class="btn btn-primary btn-sm" data-action="submit"${preview.canSubmit && !state.submitting ? '' : ' disabled'}>提交需求并下单</button></footer></main></section>`;
  }

  const root = window.AppShell.mount({ title: '辅料需求确认', content: render(buildPreview()), variant: 'school', companyName: '静安第一中学', emptyText: '辅料需求确认' });
  function mountExpectedAtPicker() {
    expectedAtPicker?.destroy?.();
    const input = root.querySelector('#schoolRecipeAuxiliaryExpectedAt');
    if (!input || !window.DatePicker?.mount) return;
    expectedAtPicker = window.DatePicker.mount({
      input,
      panelId: 'schoolRecipeAuxiliaryExpectedAtPickerPanel',
      withTime: true,
      maxDate: [...state.selectedDates].sort()[0] || date,
      onChange(value) { state.expectedAt = value; }
    });
  }
  mountExpectedAtPicker();
  const rerender = () => {
    root.querySelector('#schoolRecipeAuxiliaryDemandConfirmPage').outerHTML = render(buildPreview());
    mountExpectedAtPicker();
  };
  root.addEventListener('click', (event) => {
    const meal = event.target.closest('[data-meal]');
    if (meal) { state.meal = meal.dataset.meal; rerender(); return; }
    const dateToggle = event.target.closest('[data-action="toggle-date"]');
    if (dateToggle) {
      const dateRow = dateToggle.closest('.school-recipe-demand-date-row');
      const detailRow = dateRow?.nextElementSibling;
      if (!dateRow || !detailRow?.matches('[data-date-detail-row]')) return;
      const expanded = dateToggle.getAttribute('aria-expanded') === 'true';
      dateToggle.setAttribute('aria-expanded', String(!expanded));
      dateToggle.setAttribute('aria-label', `${expanded ? '展开' : '收起'} ${dateToggle.dataset.date || ''} 的餐次填报记录`);
      dateRow.classList.toggle('is-expanded', !expanded);
      detailRow.hidden = expanded;
      return;
    }
    const deleteDate = event.target.closest('[data-action="delete-attendance"]');
    if (deleteDate) {
      if (deleteDate.disabled || state.selectedDates.size <= 1) return;
      state.selectedDates.delete(deleteDate.dataset.date || '');
      state.expectedAt = expectedAt();
      rerender();
      showToast('操作成功');
      return;
    }
    const removeProduct = event.target.closest('[data-action="remove-product"]');
    if (removeProduct) {
      const removedId = removeProduct.dataset.productKey;
      const removedProduct = selected.find((product) => product.id === removedId);
      selected = selected.filter((product) => product.id !== removedId);
      if (removedProduct) {
        delete state.unitPriceOverrides[unitPriceKey(removedProduct)];
        Object.keys(state.purchaseQtyOverrides).forEach((key) => {
          if (key.includes(`::${productKey(removedProduct)}::`)) delete state.purchaseQtyOverrides[key];
        });
      }
      rerender();
      showToast(`已移除${removeProduct.dataset.productName || '商品'}`);
      return;
    }
    if (event.target.closest('[data-action="restore-default"]')) {
      selected = selectedProductsFromAttendance();
      state.purchaseQtyOverrides = {};
      state.unitPriceOverrides = {};
      rerender();
      showToast('已恢复填报页商品和默认计算量');
      return;
    }
    if (event.target.closest('[data-action="back"]')) { navigate(`./school-recipe-auxiliary-attendance.html?date=${encodeURIComponent(date)}`); return; }
    if (event.target.closest('[data-action="submit"]')) {
      if (state.submitting) return;
      if (!validateEditableFields()) return;
      const preview = buildPreview();
      if (!preview.canSubmit) {
        showToast(preview.message || '请先完成需求确认', true);
        return;
      }
      openSubmitConfirm(preview);
    }
    const clear = event.target.closest('[data-aux-purchase-clear]');
    if (clear) {
      const input = root.querySelector(`[data-purchase-key="${CSS.escape(clear.dataset.purchaseKey || '')}"]`);
      if (input) {
        input.value = '0.00';
        state.purchaseQtyOverrides[clear.dataset.purchaseKey] = input.value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  });
  root.addEventListener('input', (event) => {
    const input = event.target.closest('[data-aux-unit-price], [data-aux-purchase-quantity]');
    if (!input) return;
    input.classList.remove('is-invalid');
    input.setAttribute('aria-invalid', 'false');
    if (input.matches('[data-aux-unit-price]') && !input.disabled) state.unitPriceOverrides[input.dataset.unitPriceKey] = input.value;
    if (input.matches('[data-aux-purchase-quantity]')) state.purchaseQtyOverrides[input.dataset.purchaseKey] = input.value;
  });
  root.addEventListener('change', (event) => {
    const input = event.target.closest('[data-aux-unit-price], [data-aux-purchase-quantity]');
    if (!input) return;
    if (input.matches('[data-aux-unit-price]') && !input.disabled) {
      const value = Number(input.value);
      if (!Number.isFinite(value) || value < minimumAmount()) {
        input.classList.add('is-invalid');
        input.setAttribute('aria-invalid', 'true');
        showToast(`单价不能低于${minimumAmount()}`, true);
        return;
      }
      input.value = amount(value);
      state.unitPriceOverrides[input.dataset.unitPriceKey] = input.value;
    } else if (input.matches('[data-aux-purchase-quantity]')) {
      const value = Number(input.value);
      if (!Number.isFinite(value) || value < 0) {
        input.value = '0.00';
        input.setAttribute('aria-invalid', 'false');
        showToast('采购量不能小于0', true);
      }
      state.purchaseQtyOverrides[input.dataset.purchaseKey] = input.value;
    }
  });
})();
