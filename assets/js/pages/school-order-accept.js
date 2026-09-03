(function () {
  const service = window.SchoolOrderService;
  if (!service) return;
  const id = new URLSearchParams(window.location.search).get('id') || '';
  const order = service.get(id);
  if (!order) {
    window.location.href = './school-order-management.html';
    return;
  }

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  const number = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const money = (value) => number(value).toFixed(2);
  const display = (line) => window.DomUtils.formatProductDisplay(line);
  const state = {
    lines: (order.items || []).map((line) => ({
      id: line.id,
      displayName: display(line),
      shippedQty: number(line.shippedQty || line.orderQty),
      acceptedQty: line.acceptedQty == null ? number(line.shippedQty || line.orderQty) : number(line.acceptedQty),
      acceptedPrice: number(line.orderPrice),
      returnQty: number(line.returnQty),
      returnReason: '',
      qualityReport: line.qualityReport || '1',
      remark: line.remark === '--' ? '' : (line.remark || '')
    })),
    orderRemark: order.remark === '--' ? '' : (order.remark || '')
  };

  function navigate(url) {
    if (window.AppNavigationGuard?.navigate) window.AppNavigationGuard.navigate(url);
    else window.location.href = url;
  }

  function collect(page) {
    return [...page.querySelectorAll('tbody tr[data-line-index]')].map((row, index) => ({
      id: row.dataset.lineId,
      acceptedQty: Math.max(0, number(row.querySelector('[data-field="acceptedQty"]')?.value)),
      acceptedPrice: Math.max(0, number(row.querySelector('[data-field="acceptedPrice"]')?.value)),
      returnQty: Math.max(0, number(row.querySelector('[data-field="returnQty"]')?.value)),
      remark: row.querySelector('[data-field="remark"]')?.value || state.lines[index]?.remark || ''
    }));
  }

  function updateTotals(page) {
    const lines = collect(page);
    const accepted = lines.reduce((sum, line) => sum + line.acceptedQty * line.acceptedPrice, 0);
    const returned = lines.reduce((sum, line) => sum + line.returnQty * line.acceptedPrice, 0);
    lines.forEach((line, index) => {
      const row = page.querySelector(`tr[data-line-index="${index}"]`);
      if (row) row.querySelector('[data-cell="acceptedSubtotal"]').textContent = money(line.acceptedQty * line.acceptedPrice);
    });
    page.querySelector('#schoolAcceptanceTotal').textContent = money(accepted);
    page.querySelector('#schoolAcceptanceReturnTotal').textContent = money(returned);
  }

  function setError(page, message = '') {
    page.querySelector('#schoolAcceptanceError').textContent = message;
  }

  function submit(page) {
    setError(page, '');
    const lines = collect(page);
    const invalid = lines.find((line, index) => line.acceptedQty + line.returnQty > state.lines[index].shippedQty || line.acceptedQty < line.returnQty);
    if (invalid) {
      setError(page, '验收数量与退货数量不能超过发货数量，且退货数量不能大于验收数量');
      return;
    }
    service.accept(id, lines, page.querySelector('#schoolAcceptanceRemark').value);
    navigate('./school-order-detail.html?id=' + encodeURIComponent(id));
  }

  function render() {
    const content = `<section class="school-order-acceptance-page" id="schoolOrderAcceptancePage" aria-label="订单验收">
      <header class="school-order-acceptance-header"><button type="button" class="back-link school-order-acceptance-back" data-action="back" aria-label="返回订单管理"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"></path><path d="M19 12H9"></path></svg><span>返回</span></button><h1>订单验收</h1></header>
      <div class="school-order-acceptance-body">
        <section class="school-order-acceptance-summary" aria-label="验收订单信息">
          <dl><dt>订单号</dt><dd>${escapeHtml(order.orderNo)}</dd></dl><dl><dt>供货企业</dt><dd title="${escapeHtml(order.supplierName)}">${escapeHtml(order.supplierName)}</dd></dl><dl><dt>食堂</dt><dd>${escapeHtml(order.canteen)}</dd></dl><dl><dt>期望送达时间</dt><dd>${escapeHtml(order.expectedAt)}</dd></dl>
          <dl><dt>订单金额</dt><dd>${money(order.orderAmount)}</dd></dl><dl><dt>商品种类数</dt><dd>${escapeHtml(order.productCount)}</dd></dl><dl><dt>当前状态</dt><dd>${escapeHtml(order.status)}</dd></dl><dl><dt>收货状态</dt><dd>${escapeHtml(order.receiptStatus)}</dd></dl>
        </section>
        <section><div class="school-order-acceptance-section-title"><h2>验收明细</h2></div><div class="school-order-acceptance-table-wrap"><table class="school-order-acceptance-table"><colgroup>${Array.from({ length: 11 }, () => '<col>').join('')}</colgroup><thead><tr><th>序号</th><th>商品名称（计量单位/品牌/规格）</th><th>发货数量</th><th>验收数量</th><th>验收单价</th><th>验收小计</th><th>退货数量</th><th>退货原因</th><th>质检报告</th><th>验收图片</th><th>备注</th></tr></thead><tbody>${state.lines.map((line, index) => `<tr data-line-index="${index}" data-line-id="${escapeHtml(line.id)}"><td>${index + 1}</td><td class="acceptance-goods-name" title="${escapeHtml(line.displayName)}"><span class="product-display-text">${escapeHtml(line.displayName)}</span></td><td>${line.shippedQty}</td><td><input class="acceptance-input" data-field="acceptedQty" type="number" min="0" step="0.01" value="${line.acceptedQty}"></td><td><input class="acceptance-input" data-field="acceptedPrice" type="number" min="0" step="0.01" value="${money(line.acceptedPrice)}"></td><td data-cell="acceptedSubtotal">${money(line.acceptedQty * line.acceptedPrice)}</td><td><input class="acceptance-input" data-field="returnQty" type="number" min="0" step="0.01" value="${line.returnQty}"></td><td><input class="acceptance-input" data-field="returnReason" type="text" placeholder="请输入退货原因"></td><td>${escapeHtml(line.qualityReport || '--')}</td><td><button type="button" class="acceptance-upload" data-action="upload">上传图片</button></td><td><input class="acceptance-input" data-field="remark" type="text" value="${escapeHtml(line.remark)}"></td></tr>`).join('')}</tbody><tfoot><tr><td colspan="5">验收金额合计（元）</td><td id="schoolAcceptanceTotal">0.00</td><td>退货金额合计（元）</td><td id="schoolAcceptanceReturnTotal">0.00</td><td colspan="3"></td></tr></tfoot></table></div><div class="school-order-acceptance-error" id="schoolAcceptanceError" role="alert"></div></section>
        <section class="school-order-acceptance-remark"><label for="schoolAcceptanceRemark">验收备注</label><textarea id="schoolAcceptanceRemark" maxlength="100">${escapeHtml(state.orderRemark)}</textarea></section>
      </div>
      <footer class="school-order-acceptance-actions"><button type="button" class="btn" data-action="back">返回</button><button type="button" class="btn" data-action="draft">暂存验收</button><button type="button" class="btn btn-primary" data-action="submit">提交验收</button></footer>
    </section>`;
    const root = window.AppShell.mount({ title: '订单验收', content, variant: 'school', companyName: service.SCHOOL_NAME, emptyText: '订单验收' });
    const page = root.querySelector('#schoolOrderAcceptancePage');
    updateTotals(page);
    page.addEventListener('input', (event) => {
      if (event.target.closest('tr[data-line-index]')) updateTotals(page);
    });
    page.addEventListener('click', (event) => {
      const button = event.target.closest('[data-action]');
      if (!button) return;
      const action = button.dataset.action;
      if (action === 'back') navigate('./school-order-management.html');
      else if (action === 'draft') showDraftToast();
      else if (action === 'submit') submit(page);
      else if (action === 'upload') showDraftToast('验收图片上传入口已打开');
    });
  }

  function showDraftToast(message = '验收草稿已暂存') {
    document.querySelector('.operations-toast')?.remove();
    const toast = document.createElement('div');
    toast.className = 'operations-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    window.setTimeout(() => toast.remove(), 1800);
  }

  render();
})();
