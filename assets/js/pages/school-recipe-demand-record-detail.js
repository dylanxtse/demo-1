(function () {
  const service = window.SchoolRecipeDemandService;
  if (!service) return;
  const id = new URLSearchParams(window.location.search).get('id') || '';
  const record = service.get(id);
  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  const number = (value) => Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const quantity = (value) => Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const productDisplay = (item) => window.DomUtils?.formatProductDisplay
    ? window.DomUtils.formatProductDisplay(item)
    : `${item?.productName || '--'}（${item?.unit || '--'}/--/--）`;
  const productForItem = (item) => {
    const code = item?.productCode || item?.productId || item?.goodsCode || '';
    const catalog = window.SchoolOrderService?.getProductCatalog?.() || window.DemoStore?.get?.('products') || window.MockProducts || [];
    return catalog.find((product) => String(product.code || product.id) === String(code)) || {};
  };
  const isStandardProduct = (item) => item?.isStandardProduct === true || item?.isStandardProduct === 'true' || item?.isStandardProduct === '是'
    || item?.isStandard === true || item?.isStandard === 'true' || item?.isStandard === '是'
    || productForItem(item).isStandardProduct === true || productForItem(item).isStandard === true;
  const renderProductName = (item) => `${item?.isNetVegetable === true || productForItem(item).isNetVegetable === true ? '<span class="school-recipe-net-vegetable-tag">净菜</span>' : ''}${escapeHtml(productDisplay(item))}`;
  const purchaseQuantity = (value, item) => {
    const amount = Number(value);
    return Number.isFinite(amount) ? (isStandardProduct(item) ? Math.ceil(amount) : amount) : 0;
  };
  const configuredParticipants = record?.participants?.length
    ? record.participants
    : service.participantsFor?.(service.currentCanteen?.(record?.canteen)) || service.PARTICIPANTS || [];
  const participantLabel = (participant) => `${participant.label || participant.tagName || '--'}${participant.nutritious && participant.nutritious !== '不区分' ? `（${participant.nutritious}）` : ''}`;
  const participantDisplayLabel = (participant, participants = configuredParticipants) => window.SchoolRecipeAttendanceService?.participantDisplayName?.(participant, participants) || participantLabel(participant);
  function navigate(url) {
    if (window.AppNavigationGuard?.navigate) window.AppNavigationGuard.navigate(url);
    else window.location.href = url;
  }

  function infoItem(label, value) {
    const displayValue = value == null || value === '' ? '--' : value;
    return `<div class="info-item"><span class="info-label">${escapeHtml(label)}：</span><span class="info-value">${escapeHtml(displayValue)}</span></div>`;
  }

  function renderEmpty() {
    return `<section class="page-card processing-detail-page school-recipe-demand-record-detail-page" id="schoolRecipeDemandRecordDetailPage"><header class="processing-detail-page-header"><button type="button" class="back-link" data-action="back"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"></path><path d="M19 12H9"></path></svg><span>返回</span></button><h1>需求提交记录详情</h1></header><div class="processing-detail-page-body school-recipe-demand-record-detail-empty"><p>未找到该需求提交记录</p><button type="button" class="btn btn-sm" data-action="back">返回</button></div></section>`;
  }

  function attendanceValue(value) {
    return value === '' || value == null ? '--' : number(value);
  }

  function renderAttendanceDetail(summary) {
    const attendanceService = window.SchoolRecipeAttendanceService;
    const recipeService = window.SchoolRecipeService;
    const attendance = summary.attendance || attendanceService?.get?.(summary.date, service.currentCanteen?.(record?.canteen)) || {};
    const menu = recipeService?.getMenu?.(summary.date);
    const fallbackMeals = attendanceService?.mealTypes || [
      { key: 'breakfast', name: '早餐' },
      { key: 'lunch', name: '午餐' },
      { key: 'dinner', name: '晚餐' },
      { key: 'snack', name: '加餐' }
    ];
    const meals = menu?.meals?.length ? menu.meals : fallbackMeals;
    const participants = summary.participants?.length ? summary.participants : configuredParticipants;
    const valueForParticipant = (values, participant) => attendanceService.valueForParticipant(values, participant);
    const headers = participants.length
      ? participants.map((participant) => `<th>${escapeHtml(participantDisplayLabel(participant, participants))}</th>`).join('')
      : '<th>暂无人员类型</th>';
    const rows = meals.map((meal) => {
      const values = attendance.meals?.[meal.key] || {};
      const hasPeople = participants.some((participant) => valueForParticipant(values, participant) !== '');
      const mealSummary = summary?.calculation?.mealRows?.find((row) => row.key === meal.key);
      const total = hasPeople ? (mealSummary?.totalPeople ?? participants.reduce((sum, participant) => sum + attendanceService.effectivePeopleFor(attendance, meal.key, participant), 0)) : '--';
      const cells = participants.length
        ? participants.map((participant) => {
          const diningValue = valueForParticipant(values, participant);
          const nonDiningValue = attendanceService.temporaryNonDiningFor?.(attendance, meal.key, participant) || '';
          const actualPeople = attendanceService.effectivePeopleFor(attendance, meal.key, participant);
          return `<td class="is-number"><div class="school-recipe-demand-attendance-person"><span>${diningValue === '' ? '--' : `总人数 ${attendanceValue(diningValue)} 人`}</span>${nonDiningValue !== '' ? `<small>不就餐 ${attendanceValue(nonDiningValue)} 人</small>` : ''}<em>实际 ${number(actualPeople)} 人</em></div></td>`;
        }).join('')
        : '<td class="is-number">--</td>';
      return `<tr><td>${escapeHtml(meal.name)}</td>${cells}<td class="is-number is-total">${typeof total === 'number' ? number(total) : total}</td></tr>`;
    }).join('');
    const personColgroup = Array.from({ length: Math.max(1, participants.length) }, () => '<col class="col-person">').join('');
    const emptyColspan = 2 + Math.max(1, participants.length);
    return `<div class="school-recipe-demand-attendance-detail"><table class="school-recipe-demand-attendance-detail-table"><colgroup><col class="col-meal">${personColgroup}<col class="col-total"></colgroup><thead><tr><th>餐次</th>${headers}<th>实际就餐人次合计</th></tr></thead><tbody>${rows || `<tr><td colspan="${emptyColspan}" class="school-recipe-demand-record-detail-empty-cell">暂无餐次填报记录</td></tr>`}</tbody></table></div>`;
  }

  function renderDateRows() {
    const participants = record?.participants?.length ? record.participants : configuredParticipants;
    return (record.dateSummaries || []).map((summary, index) => {
      const detailId = `schoolRecipeDemandDateDetail${index}`;
      const personCells = participants.map((participant) => `<td class="is-number">${number(summary.participantPersonTimes?.[participant.key] ?? (participant.legacyKey === 'student' ? summary.studentPersonTimes : participant.legacyKey === 'teacher' ? summary.teacherPersonTimes : 0))}</td>`).join('');
      return `<tr class="school-recipe-demand-date-row"><td class="school-recipe-demand-date-expand-cell"><button type="button" class="school-recipe-demand-date-expand-button" data-action="toggle-date" data-date="${escapeHtml(summary.date)}" aria-expanded="false" aria-controls="${detailId}" aria-label="展开 ${escapeHtml(summary.date)} 的餐次填报记录"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"></path></svg></button></td><td><strong>${escapeHtml(summary.date)}</strong></td>${personCells}<td class="is-number is-total">${number(summary.totalPersonTimes)}</td><td class="is-number">${number(summary.productCount)}</td></tr><tr id="${detailId}" class="school-recipe-demand-date-detail-row" data-date-detail-row hidden><td colspan="${4 + participants.length}">${renderAttendanceDetail(summary)}</td></tr>`;
    }).join('') || `<tr><td colspan="${4 + participants.length}" class="school-recipe-demand-record-detail-empty-cell">暂无日期明细</td></tr>`;
  }

  function renderProductRows() {
    const participants = record?.participants?.length ? record.participants : configuredParticipants;
    const participantQuantity = (row, participant) => row.participantQty?.[participant.key]
      ?? (participant.legacyKey === 'student' ? row.studentQty : participant.legacyKey === 'teacher' ? row.teacherQty : 0);
    const cells = (row) => participants.map((participant) => {
      const demandQuantity = participantQuantity(row, participant);
      return `<td class="is-number">${quantity(demandQuantity)}</td><td class="is-number">${quantity(purchaseQuantity(demandQuantity, row))}</td>`;
    }).join('');
    return (record.items || []).filter((row) => row.mappingStatus === '已关联').map((row, index) => `<tr><td>${index + 1}</td><td class="school-recipe-demand-detail-product-name">${renderProductName(row)}</td><td>${isStandardProduct(row) ? '是' : '否'}</td><td>${escapeHtml(row.productCode || '--')}</td><td>${escapeHtml(row.unit || '--')}</td>${cells(row)}</tr>`).join('') || `<tr><td colspan="${5 + participants.length * 2}" class="school-recipe-demand-record-detail-empty-cell">暂无商品明细</td></tr>`;
  }

  function renderProductHeaders() {
    const participants = record?.participants?.length ? record.participants : configuredParticipants;
    const participantColumns = participants.map((participant) => {
      const name = participantDisplayLabel(participant, participants);
      return `<th colspan="2">${escapeHtml(name)}</th>`;
    }).join('');
    const participantSubColumns = participants.map(() => '<th>需求量</th><th>采购量</th>').join('');
    const participantColgroup = participants.map(() => '<col class="col-quantity"><col class="col-purchase">').join('');
    return {
      participantColgroup,
      header: `<thead><tr><th rowspan="2">序号</th><th rowspan="2">商品名称（计量单位/品牌/规格）</th><th rowspan="2">是否标品</th><th rowspan="2">商品编号</th><th rowspan="2">单位</th>${participantColumns}</tr><tr>${participantSubColumns}</tr></thead>`
    };
  }

  function renderOrderRows() {
    return (record.orders || []).map((order) => {
      const orderNumber = escapeHtml(order.orderNo || '--');
      const orderCell = `<button type="button" class="school-recipe-demand-order-link" data-action="order" data-id="${escapeHtml(order.orderId)}">${orderNumber}</button>`;
      return `<tr><td>${orderCell}</td><td>${escapeHtml(record.expectedAt || order.expectedAt || '--')}</td><td>${escapeHtml(order.mealName || '--')}</td><td>${escapeHtml(order.orderTag || '--')}</td></tr>`;
    }).join('') || '<tr><td colspan="4" class="school-recipe-demand-record-detail-empty-cell">暂无关联订单</td></tr>';
  }

  const content = record ? `<section class="page-card processing-detail-page school-recipe-demand-record-detail-page" id="schoolRecipeDemandRecordDetailPage" aria-label="需求提交记录详情">
    <header class="processing-detail-page-header"><button type="button" class="back-link" data-action="back"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"></path><path d="M19 12H9"></path></svg><span>返回</span></button><h1>需求提交记录详情</h1></header>
    <div class="processing-detail-page-body">
      <div class="processing-detail-section"><h3>基本信息</h3><div class="processing-detail-info school-recipe-demand-detail-info">${infoItem('记录编号', record.recordNo)}${infoItem('学校', record.schoolName)}${infoItem('食堂', record.canteen)}${infoItem('操作人', record.submittedBy)}${infoItem('提交时间', record.submittedAt)}${infoItem('需求商品种数', number(record.productCount))}${infoItem('生成订单数', number(record.orders?.length))}</div></div>
      ${record.enterpriseSyncWarnings?.length ? `<div class="school-recipe-demand-detail-notice is-warning">企业端同步提示：${escapeHtml(record.enterpriseSyncWarnings.join('；'))}</div>` : ''}
      <div class="processing-detail-section"><div class="school-recipe-demand-detail-section-heading"><h3>关联订单</h3></div><div class="school-recipe-demand-detail-table-wrap"><table class="processing-detail-table school-recipe-demand-detail-table school-recipe-demand-order-table"><colgroup><col class="col-order-no"><col class="col-date"><col class="col-meal"><col class="col-tag"></colgroup><thead><tr><th>订单号</th><th>期望送达时间</th><th>餐次</th><th>订单标签</th></tr></thead><tbody>${renderOrderRows()}</tbody></table></div></div>
      <div class="processing-detail-section school-recipe-demand-date-detail-section"><div class="school-recipe-demand-detail-section-heading"><h3>用料日期明细</h3></div><div class="school-recipe-demand-detail-table-wrap"><table class="processing-detail-table school-recipe-demand-detail-table"><colgroup><col class="col-expand"><col class="col-date">${configuredParticipants.map(() => '<col class="col-person">').join('')}<col class="col-total"><col class="col-product"></colgroup><thead><tr><th aria-label="展开"></th><th>用料日期</th>${configuredParticipants.map((participant) => `<th>${escapeHtml(participantDisplayLabel(participant, configuredParticipants))}人次</th>`).join('')}<th>总人次</th><th>商品种数</th></tr></thead><tbody>${renderDateRows()}</tbody></table></div></div>
      <div class="processing-detail-section"><div class="school-recipe-demand-detail-section-heading"><h3>商品需求明细</h3></div><div class="school-recipe-demand-detail-table-wrap"><table class="processing-detail-table school-recipe-demand-detail-table school-recipe-demand-detail-product-table"><colgroup><col class="col-index"><col class="col-product"><col class="col-standard"><col class="col-code"><col class="col-unit">${renderProductHeaders().participantColgroup}</colgroup>${renderProductHeaders().header}<tbody>${renderProductRows()}</tbody></table></div></div>
    </div>
    <footer class="processing-form-footer processing-detail-footer"><button type="button" class="btn btn-sm" data-action="back">返回</button></footer>
  </section>` : renderEmpty();
  const root = window.AppShell.mount({ title: '需求提交记录详情', content, variant: 'school', companyName: '静安第一中学', emptyText: '需求提交记录详情' });
  const page = root.querySelector('#schoolRecipeDemandRecordDetailPage');
  page?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    if (button.dataset.action === 'toggle-date') {
      const dateRow = button.closest('.school-recipe-demand-date-row');
      const detailRow = dateRow?.nextElementSibling;
      if (!dateRow || !detailRow?.matches('[data-date-detail-row]')) return;
      const expanded = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!expanded));
      button.setAttribute('aria-label', `${expanded ? '展开' : '收起'} ${button.dataset.date || ''} 的餐次填报记录`);
      dateRow.classList.toggle('is-expanded', !expanded);
      detailRow.hidden = expanded;
      return;
    }
    if (button.dataset.action === 'back') navigate('./school-recipe-demand-records.html');
    if (button.dataset.action === 'order') navigate(`./school-order-detail.html?id=${encodeURIComponent(button.dataset.id || '')}`);
  });
})();
