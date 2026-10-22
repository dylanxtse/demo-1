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
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
  const money = (value) => Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const quantity = (value) => Number(value || 0).toLocaleString('zh-CN', { maximumFractionDigits: 2 });
  const state = { submitting: false, error: '' };
  const backUrl = './school-recipe-auxiliary-attendance.html?mode=quantity';

  function expectedAtValue() {
    const match = String(draft.expectedAt || '').match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2})?$/);
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

  function render() {
    const demand = preview();
    const rows = demand.selectedRows.map((row, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(`${row.productName}（${row.unit}/${row.brand}/${row.spec}）`)}</td><td>${escapeHtml(row.productCode)}</td><td>${escapeHtml(row.unit)}</td><td class="is-number">¥${money(row.orderPrice)}</td><td class="is-number">${quantity(row.orderQty)}</td><td class="is-number">¥${money(row.orderPrice * row.orderQty)}</td></tr>`).join('');
    const total = demand.selectedRows.reduce((sum, row) => sum + row.orderPrice * row.orderQty, 0);
    const warning = state.error || (!demand.canSubmit ? demand.message : '');
    return `<section class="page-card school-recipe-demand-confirm-page" id="schoolRecipeAuxiliarySimpleConfirmPage"><main class="school-recipe-demand-detail-panel"><header class="school-recipe-demand-detail-header"><button type="button" class="back-link school-recipe-demand-back" data-aux-simple-back>← <span>返回</span></button><h1>干料需求确认</h1></header><div class="school-recipe-demand-detail-scroll"><div class="school-recipe-direct-confirm-meta"><span>用料食堂：<strong>${escapeHtml(canteen.name)}</strong></span><span>期望送达时间：<strong>${escapeHtml(expectedAtValue() || '--')}</strong></span></div><section class="school-recipe-demand-section"><header><div><span class="section-title-mark">商品需求汇总</span></div></header>${warning ? `<div class="school-recipe-direct-confirm-warning" role="alert">${escapeHtml(warning)}</div>` : ''}<div class="school-recipe-demand-table-wrap"><table class="school-recipe-demand-table school-recipe-direct-confirm-table school-recipe-auxiliary-direct-confirm-table"><thead><tr><th>序号</th><th>商品名称（计量单位/品牌/规格）</th><th>商品编号</th><th>单位</th><th>单价</th><th>采购量</th><th>小计</th></tr></thead><tbody>${rows || '<tr><td colspan="7">暂无待确认商品</td></tr>'}</tbody><tfoot><tr class="school-recipe-demand-product-total-row is-grand"><td colspan="6">合计金额</td><td class="is-number">¥${money(total)}</td></tr></tfoot></table></div></section></div><footer class="school-recipe-demand-actions"><button type="button" class="btn btn-sm" data-aux-simple-back>返回</button><button type="button" class="btn btn-primary btn-sm" data-aux-simple-submit${demand.canSubmit && !state.submitting ? '' : ' disabled'}>${state.submitting ? '提交中…' : '提交需求并下单'}</button></footer></main></section>`;
  }

  const root = window.AppShell.mount({ title: '干料需求确认', content: render(), variant: 'school', companyName: '静安第一中学', emptyText: '干料需求确认' });
  const rerender = () => {
    const page = root.querySelector('#schoolRecipeAuxiliarySimpleConfirmPage');
    if (page) page.outerHTML = render();
  };
  const navigate = (url) => {
    if (window.AppNavigationGuard?.navigate) window.AppNavigationGuard.navigate(url);
    else window.location.href = url;
  };

  root.addEventListener('click', async (event) => {
    if (event.target.closest('[data-aux-simple-back]')) { navigate(backUrl); return; }
    if (!event.target.closest('[data-aux-simple-submit]') || state.submitting) return;
    const demand = preview();
    if (!demand.canSubmit) { state.error = demand.message; rerender(); return; }
    state.error = '';
    state.submitting = true;
    rerender();
    try {
      await service.submitSimple(canteen, quantities, expectedAtValue());
      const drafts = window.AppStorage?.read?.(draftKey, {}) || {};
      delete drafts[scope];
      window.AppStorage?.write?.(draftKey, drafts);
      navigate(backUrl);
    } catch (error) {
      state.error = error.message || '提交失败，请稍后重试';
      state.submitting = false;
      rerender();
    }
  });
})();
