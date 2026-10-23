(function () {
  const params = new URLSearchParams(window.location.search);
  if (params.get('mode') !== 'quantity' || params.get('orderMode') !== 'simple') return;
  const service = window.SchoolRecipeAuxiliaryDirectService;
  const canteenConfig = window.SchoolCanteenConfigService;
  if (!service || !window.AppShell) return;

  const draftKey = 'school-recipe-auxiliary-simple-drafts-v1';
  const canteen = canteenConfig?.getCanteen?.(params.get('canteen') || window.AppStorage?.read?.('school-recipe-auxiliary-current-canteen', '第一食堂'))
    || { id: '', name: '第一食堂' };
  const scope = String(canteen.id || canteen.name || '第一食堂');
  const draft = window.AppStorage?.read?.(draftKey, {})?.[scope] || {};
  const quantities = { ...(draft.quantities || {}) };
  const initiallySelectedCodes = service.buildSimplePreview(canteen, quantities).selectedRows
    .map((row) => String(row.productCode));
  const visibleCodes = new Set(Array.isArray(draft.confirmProductCodes)
    ? draft.confirmProductCodes.map(String) : initiallySelectedCodes);
  initiallySelectedCodes.forEach((code) => visibleCodes.add(code));
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
  const money = (value) => Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const state = { submitting: false, error: '', expectedAt: String(draft.expectedAt || '') };
  const backUrl = './school-recipe-auxiliary-attendance.html?mode=quantity';

  function expectedAtValue() {
    const match = state.expectedAt.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2})?$/);
    if (!match) return '';
    const parsed = new Date(`${match[1]}T${match[2]}:00`);
    if (Number.isNaN(parsed.getTime()) || parsed.getFullYear() !== Number(match[1].slice(0, 4))
      || parsed.getMonth() + 1 !== Number(match[1].slice(5, 7))
      || parsed.getDate() !== Number(match[1].slice(8, 10))) return '';
    return `${match[1]} ${match[2]}:00`;
  }

  function preview() {
    const invalidQuantity = Object.values(quantities).some((value) =>
      String(value).trim() !== '' && !/^\d+(?:\.\d{1,2})?$/.test(String(value).trim()));
    const demand = service.buildSimplePreview(canteen, quantities, expectedAtValue());
    return { ...demand, canSubmit: demand.canSubmit && !invalidQuantity,
      message: invalidQuantity ? '采购数量只能填写不超过两位小数的非负数' : demand.message };
  }

  function saveDraft() {
    const drafts = window.AppStorage?.read?.(draftKey, {}) || {};
    drafts[scope] = { ...(drafts[scope] || {}), quantities: { ...quantities }, confirmProductCodes: [...visibleCodes], expectedAt: state.expectedAt };
    window.AppStorage?.write?.(draftKey, drafts);
  }

  function quantityFor(code) {
    const raw = quantities[String(code)];
    const value = raw == null || raw === '' ? 0 : Number(raw);
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  function warningFor(demand) {
    if (state.error) return state.error;
    if (demand.message === '请选择期望送达时间' || demand.message === '请至少填写一项大于 0 的采购量') return '';
    return !demand.canSubmit ? demand.message : '';
  }

  function render() {
    const demand = preview();
    const visibleRows = [...visibleCodes]
      .map((code) => demand.rows.find((row) => String(row.productCode) === code))
      .filter(Boolean);
    const rows = visibleRows.map((row, index) => {
      const rawQuantity = quantities[row.productCode] ?? '';
      const orderQty = quantityFor(row.productCode);
      const quantityText = rawQuantity == null || rawQuantity === '' ? '0' : String(rawQuantity);
      return `<tr><td>${index + 1}</td><td>${escapeHtml(`${row.productName}（${row.unit}/${row.brand}/${row.spec}）`)}</td><td>${escapeHtml(row.productCode)}</td><td>${escapeHtml(row.unit)}</td><td class="is-number">¥${money(row.orderPrice)}</td><td class="is-number school-recipe-direct-confirm-quantity-cell"><span class="school-recipe-direct-confirm-quantity-value" aria-label="${escapeHtml(row.productName)}采购数量">${escapeHtml(quantityText)}</span></td><td class="is-number" data-aux-simple-subtotal="${escapeHtml(row.productCode)}">¥${money(row.orderPrice * orderQty)}</td><td class="school-recipe-demand-product-action"><button type="button" class="school-recipe-demand-product-clear-row" data-aux-simple-remove="${escapeHtml(row.productCode)}" aria-label="移除${escapeHtml(row.productName)}">移除</button></td></tr>`;
    }).join('');
    const total = visibleRows.reduce((sum, row) => sum + row.orderPrice * quantityFor(row.productCode), 0);
    const warning = warningFor(demand);
    return `<section class="page-card school-recipe-demand-confirm-page" id="schoolRecipeAuxiliarySimpleConfirmPage"><main class="school-recipe-demand-detail-panel"><header class="school-recipe-demand-detail-header"><button type="button" class="back-link school-recipe-demand-back" data-aux-simple-back>← <span>返回</span></button><h1>干调需求确认</h1></header><div class="school-recipe-demand-detail-scroll"><div class="school-recipe-direct-confirm-meta"><span>用料食堂：<strong>${escapeHtml(canteen.name)}</strong></span><div class="school-recipe-simple-confirm-delivery"><label for="schoolAuxiliaryConfirmExpectedAt">期望送达时间 <span aria-hidden="true">*</span></label><div class="school-recipe-simple-confirm-date-field${state.expectedAt ? '' : ' is-empty'}"><span class="school-recipe-simple-confirm-date-display" aria-hidden="true">${escapeHtml(state.expectedAt ? state.expectedAt.replace('T', ' ') : '请选择')}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/></svg></span><input id="schoolAuxiliaryConfirmExpectedAt" type="datetime-local" value="${escapeHtml(state.expectedAt)}" data-aux-simple-confirm-expected-at aria-label="期望送达时间"></div></div></div><section class="school-recipe-demand-section"><header><div><span class="section-title-mark">商品需求汇总</span></div></header><div class="school-recipe-direct-confirm-warning" role="alert" data-aux-simple-warning${warning ? '' : ' hidden'}>${escapeHtml(warning)}</div><div class="school-recipe-demand-table-wrap"><table class="school-recipe-demand-table school-recipe-direct-confirm-table school-recipe-auxiliary-direct-confirm-table"><colgroup><col class="col-index"><col class="col-product"><col class="col-code"><col class="col-unit"><col class="col-price"><col class="col-quantity"><col class="col-amount"><col class="col-action"></colgroup><thead><tr><th>序号</th><th>商品名称（计量单位/品牌/规格）</th><th>商品编号</th><th>单位</th><th>单价</th><th>采购量</th><th>小计</th><th>操作</th></tr></thead><tbody>${rows || '<tr><td colspan="8">暂无待确认商品</td></tr>'}</tbody><tfoot><tr class="school-recipe-demand-product-total-row is-grand"><td colspan="6">合计金额</td><td class="is-number" data-aux-simple-total>¥${money(total)}</td><td></td></tr></tfoot></table></div></section></div><footer class="school-recipe-demand-actions"><button type="button" class="btn btn-sm" data-aux-simple-back>返回</button><button type="button" class="btn btn-primary btn-sm" data-aux-simple-submit${demand.canSubmit && !state.submitting ? '' : ' disabled'}>${state.submitting ? '提交中…' : '提交需求并下单'}</button></footer></main></section>`;
  }

  const root = window.AppShell.mount({ title: '干调需求确认', content: render(), variant: 'school', companyName: '静安第一中学', emptyText: '干调需求确认' });
  const rerender = () => {
    const page = root.querySelector('#schoolRecipeAuxiliarySimpleConfirmPage');
    if (page) page.outerHTML = render();
  };
  const navigate = (url) => {
    if (window.AppNavigationGuard?.navigate) window.AppNavigationGuard.navigate(url);
    else window.location.href = url;
  };
  const closeSubmitModal = () => document.querySelector('#schoolRecipeAuxiliarySimpleSubmitModal')?.remove();

  function openSubmitModal() {
    closeSubmitModal();
    const backdrop = document.createElement('div');
    backdrop.id = 'schoolRecipeAuxiliarySimpleSubmitModal';
    backdrop.className = 'operations-modal-backdrop';
    backdrop.innerHTML = `<section class="operations-modal is-confirm school-recipe-demand-submit-modal" role="dialog" aria-modal="true" aria-label="提示"><header class="operations-modal-header"><h3>提示</h3><button type="button" data-modal-close aria-label="关闭">×</button></header><div class="operations-modal-body"><div class="school-recipe-demand-submit-confirm"><p>确认生成订单吗？</p><div class="processing-detail-info school-recipe-demand-submit-info"><div class="info-item"><span class="info-label">食堂：</span><span class="info-value">${escapeHtml(canteen.name || '第一食堂')}</span></div><div class="info-item"><span class="info-label">期望送达时间：</span><span class="info-value">${escapeHtml(state.expectedAt.replace('T', ' '))}</span></div></div></div></div><footer class="operations-modal-footer"><button type="button" class="btn" data-modal-cancel>取消</button><button type="button" class="btn btn-primary" data-modal-confirm>确定</button></footer></section>`;
    document.body.appendChild(backdrop);
    const modal = backdrop.querySelector('.school-recipe-demand-submit-modal');
    backdrop.addEventListener('click', (event) => {
      if (!state.submitting && (event.target === backdrop || event.target.closest('[data-modal-close], [data-modal-cancel]'))) closeSubmitModal();
    });
    modal.querySelector('[data-modal-confirm]')?.addEventListener('click', async () => {
      if (state.submitting) return;
      state.submitting = true;
      const confirmButton = modal.querySelector('[data-modal-confirm]');
      confirmButton.disabled = true;
      confirmButton.textContent = '提交中…';
      try {
        await service.submitSimple(canteen, quantities, expectedAtValue());
        const drafts = window.AppStorage?.read?.(draftKey, {}) || {};
        delete drafts[scope];
        window.AppStorage?.write?.(draftKey, drafts);
        closeSubmitModal();
        navigate(backUrl);
      } catch (error) {
        state.error = error.message || '提交失败，请稍后重试';
        state.submitting = false;
        closeSubmitModal();
        rerender();
      }
    });
    modal.querySelector('[data-modal-confirm]')?.focus();
  }

  root.addEventListener('change', (event) => {
    if (event.target.closest('[data-aux-simple-confirm-expected-at]')) {
      state.expectedAt = event.target.value;
      saveDraft();
      state.error = '';
      rerender();
      return;
    }
  });

  root.addEventListener('click', async (event) => {
    const dateInput = event.target.closest('[data-aux-simple-confirm-expected-at]');
    if (dateInput) {
      try { dateInput.showPicker?.(); } catch (_) { dateInput.focus(); }
      return;
    }
    if (event.target.closest('[data-aux-simple-back]')) { navigate(backUrl); return; }
    const removeButton = event.target.closest('[data-aux-simple-remove]');
    if (removeButton) {
      const code = removeButton.dataset.auxSimpleRemove;
      visibleCodes.delete(code);
      delete quantities[code];
      saveDraft();
      state.error = '';
      rerender();
      return;
    }
    if (!event.target.closest('[data-aux-simple-submit]') || state.submitting) return;
    const demand = preview();
    if (!demand.canSubmit) { state.error = demand.message; rerender(); return; }
    state.error = '';
    openSubmitModal();
  });
})();
