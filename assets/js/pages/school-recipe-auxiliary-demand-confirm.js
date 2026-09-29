(function () {
  const canteenConfig = window.SchoolCanteenConfigService;
  const attendanceService = window.SchoolRecipeAttendanceService;
  const orderService = window.SchoolOrderService;
  if (!attendanceService || !orderService) return;

  const params = new URLSearchParams(window.location.search);
  const date = params.get('date') || '2026-09-07';
  const currentCanteen = canteenConfig?.selectedCanteen?.() || { name: '第一食堂' };
  const canteenScope = String(currentCanteen.id || currentCanteen.name || '第一食堂');
  const draftKey = 'school-recipe-auxiliary-attendance-drafts-v1';
  const selectedKey = 'school-recipe-auxiliary-selected-products-v1';
  const products = [
    { id: 'aux-oil', auxiliaryName: '油', name: '金龙鱼5L桶装油', brand: '金龙鱼', code: 'SP0300030', spec: '5L/桶', doseUnit: 'L', doseDisplay: '12 ml', purchaseUnit: '桶', packSize: 5, dose: 0.012, marketPrice: 55 },
    { id: 'aux-salt', auxiliaryName: '盐', name: '食盐', brand: '—', code: 'SP0300031', spec: '500g/袋', doseUnit: 'kg', doseDisplay: '4 g', purchaseUnit: '袋', packSize: 0.5, dose: 0.004, marketPrice: 18.5 },
    { id: 'aux-msg', auxiliaryName: '味精', name: '味精', brand: '—', code: 'SP0300032', spec: '250g/袋', doseUnit: 'kg', doseDisplay: '1 g', purchaseUnit: '袋', packSize: 0.25, dose: 0.001, marketPrice: 8 }
  ];
  const drafts = window.AppStorage?.read?.(draftKey, {}) || {};
  const saved = drafts?.[canteenScope]?.[date] || {};
  const selectedIds = window.AppStorage?.read?.(selectedKey, {})?.[canteenScope] || ['aux-oil', 'aux-salt'];
  const selected = products.filter((product) => selectedIds.includes(product.id));
  const settings = window.DemoStore?.getSettings?.() || {};
  const splitMeal = settings.splitOrderByMeal !== false && settings.splitOrderByMeal !== 'false' && settings.splitOrderByMeal !== 0 && settings.splitOrderByMeal !== '0';
  const splitPerson = settings.splitOrderByPersonType === true || settings.splitOrderByPersonType === 'true' || settings.splitOrderByPersonType === 1 || settings.splitOrderByPersonType === '1';
  const participants = attendanceService.participantsFor(currentCanteen) || [];
  const labels = [...new Set(participants.map((item) => item.label || item.tagName).filter(Boolean))];
  const keyFor = (label) => label === '学生' ? 'student' : label === '教师' || label === '教职工' ? 'teacher' : `participant_${String(label).replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '')}`;
  const meals = [{ key: 'breakfast', name: '早餐' }, { key: 'lunch', name: '午餐' }, { key: 'dinner', name: '晚餐' }];
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const amount = (value) => Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false });
  const people = (meal, label) => Math.max(0, Number(meal?.[keyFor(label)] || 0) - Number(meal?.[`nonDining_${keyFor(label)}`] || 0));
  const mealPeople = (meal) => labels.reduce((sum, label) => sum + people(meal, label), 0);
  const purchase = (value, product) => product.packSize ? Math.ceil(value / product.packSize) * product.packSize : value;
  const state = { meal: 'lunch', submitting: false };
  const mealRows = () => splitMeal ? [meals.find((meal) => meal.key === state.meal)] : meals;
  const demandFor = (product, mealList, label) => mealList.reduce((sum, meal) => sum + people(saved[meal.key], label) * product.dose, 0);
  const productDisplay = (product) => `${product.name}（${product.doseUnit}/${product.brand}/${product.spec}）`;
  const number = (value) => Number(value || 0);
  const timestamp = () => window.BusinessRules?.now?.()
    || new Date().toISOString().slice(0, 19).replace('T', ' ');
  const dateObject = (value) => {
    const parsed = new Date(`${String(value || date)}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? new Date('2026-09-07T00:00:00') : parsed;
  };
  const dateValue = (value) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  const expectedAt = () => {
    const deliveryDate = dateObject(date);
    deliveryDate.setDate(deliveryDate.getDate() - 1);
    return `${dateValue(deliveryDate)} 07:30:00`;
  };
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
    const participant = participants.find((item) => (item.label || item.tagName) === label) || {};
    return {
      key: keyFor(label),
      label,
      tagId: participant.tagId || participant.id || keyFor(label),
      tagName: participant.tagName || participant.label || label,
      nutritious: participant.nutritious || '不区分',
      orderTag: participant.orderTag || `${participant.tagName || participant.label || label}-${participant.nutritious || '不区分'}`
    };
  };
  const participantPersonTimes = () => Object.fromEntries(labels.map((label) => [
    keyFor(label), meals.reduce((total, meal) => total + people(saved[meal.key], label), 0)
  ]));
  const buildPreview = () => {
    const participantTimes = participantPersonTimes();
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
        purchaseQty: purchase(totalQty, product),
        auxiliaryName: product.auxiliaryName
      };
    });
    const totalPeople = Object.values(participantTimes).reduce((sum, value) => sum + number(value), 0);
    const canSubmit = Boolean(date && selected.length && totalPeople > 0 && rows.some((row) => row.totalQty > 0));
    return {
      dates: [date],
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
    const quantity = purchase(demandQty, product);
    const catalogProduct = (orderService.getProductCatalog?.() || []).find((item) => String(item.code) === String(product.code));
    const orderPrice = orderService.currentSalesPrice?.(catalogProduct || product) || number(product.marketPrice) || 1;
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
      remark: `辅料${date}${group.name}${label}需求`
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
  const clearAuxiliaryDraft = () => {
    const next = window.AppStorage?.read?.(draftKey, {}) || {};
    if (!next[canteenScope]) return;
    delete next[canteenScope][date];
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
      expectedAt: expectedAt(),
      recipeVersion: '',
      auxiliary: true,
      source: '学校端辅料下单',
      submittedBy: currentOperator.name,
      submittedById: currentOperator.id,
      submittedAt: createdAt,
      dateSummaries: [{
        date,
        attendance: { meals: saved },
        recipeVersion: '',
        participants: preview.participants,
        participantPersonTimes: preview.participantPersonTimes,
        studentPersonTimes: preview.totalStudentPersonTimes,
        teacherPersonTimes: preview.totalTeacherPersonTimes,
        totalPersonTimes: preview.totalPersonTimes,
        productCount: preview.productCount,
        items: preview.rows
      }],
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
        description: `提交 ${date} 的辅料需求`
      }]
    };
    writeDemandRecords([...records, record]);

    for (const participant of preview.participants) {
      for (const group of mealGroups()) {
        const items = orderItemsFor(group, participant.label);
        if (!items.length) continue;
        const mealPeople = group.meals.reduce((sum, meal) => sum + people(saved[meal.key], participant.label), 0);
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
          recipeDemandDate: date,
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
            recipeDemandDate: date,
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
          date,
          dates: [date],
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
        clearAuxiliaryDraft();
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
      <div class="operations-modal-body"><div class="school-recipe-demand-submit-confirm"><p>确认生成订单吗？</p><div class="processing-detail-info school-recipe-demand-submit-info"><div class="info-item"><span class="info-label">食堂：</span><span class="info-value">${escapeHtml(currentCanteen.name || '第一食堂')}</span></div><div class="info-item"><span class="info-label">用料日期：</span><span class="info-value">${escapeHtml(preview.dates.join('、') || '--')}</span></div><div class="info-item"><span class="info-label">期望送达时间：</span><span class="info-value">${escapeHtml(expectedAt())}</span></div></div></div></div>
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

  function renderProducts() {
    const activeMeals = mealRows().filter(Boolean);
    const columns = splitPerson
      ? labels.map((label) => `<th colspan="2">${escapeHtml(label)} - ${escapeHtml(participants.find((item) => (item.label || item.tagName) === label)?.nutritious || '不区分')}</th>`).join('')
      : '<th colspan="2">合计</th>';
    const subColumns = splitPerson ? labels.map(() => '<th>需求量</th><th>采购量</th>').join('') : '<th>需求量</th><th>采购量</th>';
    const colgroup = splitPerson ? labels.map(() => '<col class="col-quantity"><col class="col-purchase">').join('') : '<col class="col-quantity"><col class="col-purchase">';
    const rows = selected.map((product, index) => {
      const cells = splitPerson
        ? labels.flatMap((label) => { const demand = demandFor(product, activeMeals, label); return [`<td class="is-number">${amount(demand)} ${product.doseUnit}</td>`, `<td class="is-number">${amount(purchase(demand, product))} ${product.doseUnit}</td>`]; })
        : (() => { const demand = labels.reduce((sum, label) => sum + demandFor(product, activeMeals, label), 0); return [`<td class="is-number">${amount(demand)} ${product.doseUnit}</td>`, `<td class="is-number">${amount(purchase(demand, product))} ${product.doseUnit}</td>`]; })();
      return `<tr><td>${index + 1}</td><td>${escapeHtml(product.auxiliaryName)}</td><td>${escapeHtml(productDisplay(product))}</td><td>${escapeHtml(product.code)}</td><td>${escapeHtml(product.doseUnit)}</td>${cells.join('')}</tr>`;
    }).join('');
    return rows ? `<div class="school-recipe-demand-table-wrap"><table class="school-recipe-demand-table school-recipe-demand-product-table school-recipe-demand-auxiliary-product-table"><colgroup><col class="col-index"><col class="col-product"><col class="col-product"><col class="col-code"><col class="col-unit">${colgroup}</colgroup><thead><tr><th rowspan="2">序号</th><th rowspan="2">辅料</th><th rowspan="2">商品</th><th rowspan="2">编号</th><th rowspan="2">单位</th>${columns}</tr><tr>${subColumns}</tr></thead><tbody>${rows}</tbody></table></div>` : '<div class="school-recipe-demand-empty">暂无辅料商品</div>';
  }

  function render() {
    const tabs = splitMeal ? `<div class="school-recipe-meal-tabs school-recipe-demand-meal-tabs" role="tablist">${meals.map((meal) => `<button type="button" class="school-recipe-meal-tab${meal.key === state.meal ? ' is-active' : ''}" data-meal="${meal.key}" role="tab">${meal.name}</button>`).join('')}</div>` : '';
    const peopleRows = meals.map((meal) => `<tr><td>${meal.name}</td>${labels.map((label) => `<td class="is-number">${people(saved[meal.key], label)} 人</td>`).join('')}<td class="is-number is-total">${mealPeople(saved[meal.key])} 人</td></tr>`).join('');
    const personHeaders = labels.map((label) => `<th>${escapeHtml(label)}</th>`).join('');
    return `<section class="page-card school-recipe-demand-confirm-page" id="schoolRecipeAuxiliaryDemandConfirmPage"><main class="school-recipe-demand-detail-panel"><header class="school-recipe-demand-detail-header"><button type="button" class="back-link" data-action="back">← <span>返回</span></button><h1>辅料需求确认</h1></header><div class="school-recipe-demand-detail-scroll"><div class="school-recipe-demand-meta"><div><span>当前食堂：</span><strong>${escapeHtml(currentCanteen.name || '第一食堂')}</strong></div><div><span>用料日期：</span><strong>${escapeHtml(date)}</strong></div></div><section class="school-recipe-demand-section"><header><div><span class="section-title-mark">餐次总人数</span></div></header><div class="school-recipe-demand-table-wrap"><table class="school-recipe-demand-table"><thead><tr><th>餐次</th>${personHeaders}<th>本餐合计</th></tr></thead><tbody>${peopleRows}</tbody></table></div></section><section class="school-recipe-demand-section"><header><div><span class="section-title-mark">辅料需求汇总</span></div></header><div class="school-recipe-demand-meal-toolbar">${tabs}</div>${renderProducts()}</section></div><footer class="school-recipe-demand-actions"><button type="button" class="btn btn-sm" data-action="back">返回</button><button type="button" class="btn btn-primary btn-sm" data-action="submit">确认需求并生成订单</button></footer></main></section>`;
  }

  const root = window.AppShell.mount({ title: '辅料需求确认', content: render(), variant: 'school', companyName: '静安第一中学', emptyText: '辅料需求确认' });
  root.addEventListener('click', (event) => {
    const meal = event.target.closest('[data-meal]');
    if (meal) { state.meal = meal.dataset.meal; root.querySelector('#schoolRecipeAuxiliaryDemandConfirmPage').outerHTML = render(); return; }
    if (event.target.closest('[data-action="back"]')) { navigate(`./school-recipe-auxiliary-attendance.html?date=${encodeURIComponent(date)}`); return; }
    if (event.target.closest('[data-action="submit"]')) {
      if (state.submitting) return;
      const preview = buildPreview();
      if (!preview.canSubmit) {
        showToast(preview.message || '请先完成需求确认', true);
        return;
      }
      openSubmitConfirm(preview);
    }
  });
})();
