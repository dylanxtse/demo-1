(function () {
  const params = new URLSearchParams(window.location.search);
  if (params.get('mode') !== 'quantity' || params.get('orderMode') === 'simple') return;
  const directService = window.SchoolRecipeAuxiliaryDirectService;
  const canteenConfig = window.SchoolCanteenConfigService;
  if (!directService) return;

  const date = params.get('date') || '';
  const orderMode = ['daily', 'combined'].includes(params.get('orderMode')) ? params.get('orderMode') : 'legacy';
  const canteen = canteenConfig?.getCanteen?.(params.get('canteen') || window.AppStorage?.read?.('school-recipe-auxiliary-current-canteen', '第一食堂')) || { id: '', name: '第一食堂' };
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const money = (value) => Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const quantity = (value) => Number(value || 0).toLocaleString('zh-CN', { maximumFractionDigits: 2 });
  const splitByPerson = () => {
    const value = window.DemoStore?.getSettings?.()?.splitOrderByPersonType;
    return value === true || value === 'true' || value === 1 || value === '1';
  };
  const state = { meal: '', submitting: false, excludedDates: new Set() };
  const filledDates = () => (orderMode === 'combined' ? directService.readCombinedDraft(canteen).dates
    : orderMode === 'daily' ? [date] : directService.readFilledDates(canteen))
    .filter((filledDate) => !state.excludedDates.has(filledDate));
  const quantitiesByDate = () => orderMode === 'combined'
    ? { ...directService.readCombinedDraft(canteen), dates: filledDates() }
    : Object.fromEntries(filledDates().map((filledDate) => [filledDate, directService.readDraft(filledDate, canteen)]));
  const expectedAt = (dates = filledDates()) => window.RecipeDeliveryRule?.expectedAt?.(dates) || '';
  const preview = () => orderMode === 'combined'
    ? directService.buildCombinedPreview(canteen, quantitiesByDate())
    : directService.buildDatesPreview(filledDates(), canteen, quantitiesByDate());
  const renderDateTable = (demand) => {
    const cannotDelete = demand.dates.length <= 1;
    const rows = demand.dateSummaries.map((summary) => {
      const productCount = orderMode === 'combined' ? ''
        : `<td class="is-number">${quantity(new Set(summary.selectedRows.map((row) => `${row.productCode}::${row.unit}`)).size)}</td>`;
      return `<tr><td>${escapeHtml(summary.date)}</td>${productCount}<td class="school-recipe-demand-table-action"><button type="button" class="school-recipe-demand-delete" data-aux-direct-delete-date="${escapeHtml(summary.date)}" title="${cannotDelete ? '至少保留一个填报日期' : '删除该日期填报'}" ${cannotDelete ? 'disabled' : ''}>删除</button></td></tr>`;
    }).join('');
    return `<div class="school-recipe-demand-detail-table-wrap"><table class="processing-detail-table school-recipe-demand-detail-table school-recipe-direct-date-table"><thead><tr><th>用料日期</th>${orderMode === 'combined' ? '' : '<th>商品种数</th>'}<th>操作</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  };
  const returnUrl = () => `./school-recipe-auxiliary-attendance.html?mode=quantity${orderMode === 'legacy' ? '' : `&orderMode=${orderMode}`}&date=${encodeURIComponent(date)}`;
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

  function render() {
    const demand = preview();
    const meals = demand.meals.map((meal) => ({ ...meal, rows: meal.rows.filter((row) => row.orderQty > 0) })).filter((meal) => meal.rows.length);
    const activeMeal = meals.find((meal) => meal.key === state.meal) || meals[0];
    state.meal = activeMeal?.key || '';
    const tabs = orderMode === 'combined' ? '' : `<div class="school-recipe-meal-tabs school-recipe-demand-meal-tabs school-recipe-direct-confirm-tabs" role="tablist" aria-label="切换餐次">${meals.map((meal) => `<button type="button" class="school-recipe-meal-tab${meal.key === state.meal ? ' is-active' : ''}" role="tab" aria-selected="${meal.key === state.meal}" data-aux-direct-confirm-meal="${escapeHtml(meal.key)}">${escapeHtml(meal.name)}</button>`).join('')}</div>`;
    const byPerson = orderMode !== 'combined' && splitByPerson();
    const participants = demand.participants || [];
    const quantityHeaders = byPerson
      ? participants.map((person) => `<th>${escapeHtml(`${person.label || person.tagName || person.key} - ${person.nutritious || '不区分'}`)}采购量</th>`).join('')
      : '<th>采购量</th>';
    const quantityCols = byPerson ? participants.map(() => '<col class="col-quantity">').join('') : '<col class="col-quantity">';
    const rows = (activeMeal?.rows || []).map((row, index) => {
      const quantityCells = byPerson
        ? participants.map((person) => `<td class="is-number">${quantity(row.participantQty?.[person.key])}</td>`).join('')
        : `<td class="is-number">${quantity(row.orderQty)}</td>`;
      return `<tr><td>${index + 1}</td><td class="school-recipe-demand-product-name">${escapeHtml(`${row.productName}（${row.unit}/${row.brand}/${row.spec}）`)}</td><td>${escapeHtml(row.productCode)}</td><td>${escapeHtml(row.unit)}</td><td class="is-number">¥${money(row.orderPrice)}</td>${quantityCells}<td class="is-number">¥${money(row.orderPrice * row.orderQty)}</td></tr>`;
    }).join('');
    const mealAmount = (activeMeal?.rows || []).reduce((sum, row) => sum + row.orderPrice * row.orderQty, 0);
    const totalAmount = demand.selectedRows.reduce((sum, row) => sum + row.orderPrice * row.orderQty, 0);
    const totals = orderMode === 'combined'
      ? `<tfoot><tr class="school-recipe-demand-product-total-row is-grand"><td colspan="6">合计金额</td><td class="is-number">¥${money(totalAmount)}</td></tr></tfoot>`
      : `<tfoot><tr class="school-recipe-demand-product-total-row"><td colspan="${5 + (byPerson ? participants.length : 1)}">${escapeHtml(activeMeal?.name || '当前餐次')}合计金额</td><td class="is-number">¥${money(mealAmount)}</td></tr><tr class="school-recipe-demand-product-total-row is-grand"><td colspan="${5 + (byPerson ? participants.length : 1)}">所有餐次合计金额</td><td class="is-number">¥${money(totalAmount)}</td></tr></tfoot>`;
    const table = rows ? `<div class="school-recipe-demand-table-wrap"><table class="school-recipe-demand-table school-recipe-direct-confirm-table school-recipe-auxiliary-direct-confirm-table" style="min-width:${Math.max(900, 744 + (byPerson ? participants.length : 1) * 100)}px"><colgroup><col class="col-index"><col class="col-product"><col class="col-code"><col class="col-unit"><col class="col-price">${quantityCols}<col class="col-amount"></colgroup><thead><tr><th>序号</th><th>商品名称（计量单位/品牌/规格）</th><th>商品编号</th><th>单位</th><th>单价</th>${quantityHeaders}<th>小计</th></tr></thead><tbody>${rows}</tbody>${totals}</table></div>` : '<div class="school-recipe-demand-empty">当前没有待确认的商品，请返回填写采购量</div>';
    const canSubmit = demand.canSubmit && Boolean(expectedAt(demand.dates)) && !state.submitting;
    return `<section class="page-card school-recipe-demand-confirm-page" id="schoolRecipeAuxiliaryDirectConfirmPage"><main class="school-recipe-demand-detail-panel"><header class="school-recipe-demand-detail-header"><button type="button" class="back-link school-recipe-demand-back" data-aux-direct-back>← <span>返回</span></button><h1>商品需求确认</h1></header><div class="school-recipe-demand-detail-scroll"><div class="school-recipe-direct-confirm-meta"><span>用料食堂：<strong>${escapeHtml(canteen.name || '第一食堂')}</strong></span><span>填报天数：<strong>${demand.dates.length}</strong></span></div><section class="school-recipe-demand-section school-recipe-demand-date-detail-section"><header><div><span class="section-title-mark">用料日期明细</span></div></header>${renderDateTable(demand)}</section><section class="school-recipe-demand-section"><header><div><span class="section-title-mark">商品需求汇总</span></div></header>${!demand.canSubmit ? `<div class="school-recipe-direct-confirm-warning">${escapeHtml(demand.message)}</div>` : ''}${tabs}${table}</section></div><footer class="school-recipe-demand-actions"><button type="button" class="btn btn-sm" data-aux-direct-back>返回</button><button type="button" class="btn btn-primary btn-sm" data-aux-direct-submit${canSubmit ? '' : ' disabled'}>${state.submitting ? '提交中…' : '提交需求并下单'}</button></footer></main></section>`;
  }

  const root = window.AppShell.mount({ title: '商品需求确认', content: render(), variant: 'school', companyName: '静安第一中学', emptyText: '商品需求确认' });
  window.SchoolRecipeConfirmStickyTotals?.mount(root);
  const rerender = () => {
    root.querySelector('#schoolRecipeAuxiliaryDirectConfirmPage').outerHTML = render();
    window.SchoolRecipeConfirmStickyTotals?.mount(root);
  };
  const closeModal = () => document.querySelector('#schoolRecipeAuxiliaryDirectSubmitModal')?.remove();

  function openModal() {
    closeModal();
    const demand = preview();
    const backdrop = document.createElement('div');
    backdrop.id = 'schoolRecipeAuxiliaryDirectSubmitModal';
    backdrop.className = 'operations-modal-backdrop';
    backdrop.innerHTML = `<section class="operations-modal is-confirm school-recipe-demand-submit-modal" role="dialog" aria-modal="true" aria-label="提示"><header class="operations-modal-header"><h3>提示</h3><button type="button" data-modal-close aria-label="关闭">×</button></header><div class="operations-modal-body"><div class="school-recipe-demand-submit-confirm"><p>确认生成订单吗？</p><div class="processing-detail-info school-recipe-demand-submit-info"><div class="info-item"><span class="info-label">食堂：</span><span class="info-value">${escapeHtml(canteen.name || '第一食堂')}</span></div><div class="info-item"><span class="info-label">用料日期：</span><span class="info-value">${escapeHtml(demand.dates.join('、'))}</span></div></div></div></div><footer class="operations-modal-footer"><button type="button" class="btn" data-modal-cancel>取消</button><button type="button" class="btn btn-primary" data-modal-confirm>确定</button></footer></section>`;
    document.body.appendChild(backdrop);
    const modal = backdrop.querySelector('.school-recipe-demand-submit-modal');
    backdrop.addEventListener('click', (event) => {
      if (!state.submitting && (event.target === backdrop || event.target.closest('[data-modal-close], [data-modal-cancel]'))) closeModal();
    });
    modal.querySelector('[data-modal-confirm]')?.addEventListener('click', async () => {
      if (state.submitting) return;
      state.submitting = true;
      modal.querySelector('[data-modal-confirm]').disabled = true;
      modal.querySelector('[data-modal-confirm]').textContent = '提交中…';
      try {
        await directService.submitDates(demand.dates, canteen, quantitiesByDate(), expectedAt(demand.dates), orderMode);
        if (orderMode === 'combined') directService.writeCombinedDraft(canteen, null);
        else demand.dates.forEach((filledDate) => directService.writeDraft(filledDate, canteen, {}));
        closeModal();
        showToast('操作成功');
        window.setTimeout(() => navigate(returnUrl()), 700);
      } catch (error) {
        state.submitting = false;
        closeModal();
        rerender();
        showToast(error.message || '提交失败，请稍后重试', true);
      }
    });
    modal.querySelector('[data-modal-confirm]')?.focus();
  }

  root.addEventListener('click', (event) => {
    const meal = event.target.closest('[data-aux-direct-confirm-meal]');
    if (meal) { state.meal = meal.dataset.auxDirectConfirmMeal; rerender(); return; }
    if (event.target.closest('[data-aux-direct-back]')) { navigate(returnUrl()); return; }
    const deleteDateButton = event.target.closest('[data-aux-direct-delete-date]');
    if (deleteDateButton) {
      const selectedDate = deleteDateButton.dataset.auxDirectDeleteDate;
      if (deleteDateButton.disabled || filledDates().length <= 1 || !filledDates().includes(selectedDate)) return;
      state.excludedDates.add(selectedDate);
      rerender();
      return;
    }
    if (event.target.closest('[data-aux-direct-submit]') && !state.submitting) {
      const demand = preview();
      if (!demand.canSubmit || !expectedAt(demand.dates)) { showToast(demand.message || '期望送达时间配置无效', true); return; }
      openModal();
    }
  });
})();
