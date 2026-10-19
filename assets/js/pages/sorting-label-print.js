(function () {
  const root = document.getElementById('sortingLabelPrintApp');
  if (!root) return;

  const VERSION = '20261019-sorting-label-print-1';
  const params = new URLSearchParams(window.location.search);
  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  const text = (value, fallback = '--') => escapeHtml(value === '' || value == null ? fallback : value);
  const quantityText = (value) => Number(value || 0).toLocaleString('zh-CN', { maximumFractionDigits: 4 });

  function readPayload() {
    const queryData = params.get('printData');
    const printKey = params.get('printKey');
    try {
      const raw = queryData || (printKey && (window.sessionStorage?.getItem(printKey) || window.localStorage?.getItem(printKey)));
      const payload = raw ? JSON.parse(raw) : null;
      return payload?.version === VERSION && Array.isArray(payload.rows) ? payload : null;
    } catch (error) {
      return null;
    }
  }

  function enrichRows(rows) {
    const products = window.DemoStore?.get?.('products') || [];
    const orders = window.DemoStore?.get?.('orders') || [];
    const productByCode = new Map();
    [...(window.MockProducts || []), ...products].forEach((product) => {
      [product.code, product.productId, product.id].filter(Boolean).forEach((code) => {
        const previous = productByCode.get(String(code));
        productByCode.set(String(code), {
          ...product,
          storageCondition: product.storageCondition && product.storageCondition !== '--'
            ? product.storageCondition : previous?.storageCondition || ''
        });
      });
    });
    const orderById = new Map(orders.filter((order) => order.id).map((order) => [String(order.id), order]));
    const orderByNo = new Map(orders.filter((order) => order.orderNo).map((order) => [String(order.orderNo), order]));
    const mealNames = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', morningSnack: '早点', afternoonSnack: '午点', eveningSnack: '晚点' };
    return rows.map((row) => {
      const product = productByCode.get(String(row.productId || ''))
        || productByCode.get(String(row.goodsCode || row.productCode || ''));
      const order = orderById.get(String(row.orderId || '')) || orderByNo.get(String(row.orderNo || ''));
      const meal = order?.mealName || order?.mealKey || row.mealName || row.mealKey || '';
      return {
        ...row,
        storageCondition: product?.storageCondition || row.storageCondition || '',
        mealName: window.OrderMealNameByKey?.[meal] || mealNames[meal] || meal
      };
    });
  }

  function expandLabels(rows) {
    return rows.flatMap((row) => {
      const rawOrderQty = Number(row.orderQty);
      const orderQty = Number.isFinite(rawOrderQty) && rawOrderQty > 0 ? rawOrderQty : 0;
      const packageLabelQuantity = Number(row.packageLabelQuantity);
      if (Number.isFinite(packageLabelQuantity) && packageLabelQuantity > 0) {
        return [{ row, sequence: 1, total: 1, quantity: packageLabelQuantity, orderQty }];
      }
      const breakdown = window.SortingPackageBreakdown?.calculate(row, orderQty);
      if (!breakdown) return [{ row, sequence: 1, total: 1, quantity: orderQty, orderQty, kind: 'unpacked', packageUnit: '', coefficient: 0 }];

      const fullCount = Math.max(0, Math.floor(Number(breakdown.packageCount) || 0));
      const remainder = Number(breakdown.packageRemainder) || 0;
      const total = fullCount + (remainder > 0 ? 1 : 0);
      const labels = Array.from({ length: fullCount }, (_, index) => ({
        row, sequence: index + 1, total, quantity: Number(breakdown.packageCoefficient), orderQty,
        kind: 'full', packageUnit: breakdown.packageUnit, coefficient: Number(breakdown.packageCoefficient)
      }));
      if (remainder > 0) labels.push({
        row, sequence: total, total, quantity: remainder, orderQty,
        kind: 'tail', packageUnit: breakdown.packageUnit, coefficient: Number(breakdown.packageCoefficient)
      });
      return labels;
    });
  }

  function formatDate(value) {
    const matched = !String(value || '').includes('T') && String(value || '').match(/^(\d{4}-\d{2}-\d{2})/);
    if (matched) return matched[1];
    const date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) return '--';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function renderLabel(label) {
    const { row, sequence, total, quantity, orderQty } = label;
    const goodsName = row.goodsName || row.productName || row.displayGoodsName;
    const unit = text(row.unit, '');
    const sortingId = row.sortingTaskId || row.id || row.orderLineId;
    const sortingQr = sortingId ? window.SortingQrCode?.svg(sortingId) || '' : '';
    return `<section class="sorting-label" aria-label="${text(goodsName)}，第${sequence}/${total}张标签">
      <span class="sorting-label-page-number" aria-hidden="true">第${sequence}/${total}张</span>
      <dl class="sorting-label-fields">
        <div class="sorting-label-field sorting-label-field-customer"><dt class="sorting-label-sr-only">客户名称</dt><dd>${text(row.customerName)}</dd></div>
        <div class="sorting-label-field"><dt>食堂名称</dt><dd>${text(row.canteen)}</dd></div>
        <div class="sorting-label-field"><dt>线路</dt><dd>${text(row.route)}</dd></div>
        <div class="sorting-label-field sorting-label-field-meal"><dt>餐次</dt><dd>${text(row.mealName)}</dd></div>
        <div class="sorting-label-field sorting-label-field-goods"><dt class="sorting-label-sr-only">商品名称</dt><dd>${text(goodsName)}</dd>${sortingQr}</div>
        <div class="sorting-label-field sorting-label-field-storage"><dt>储存条件</dt><dd>${text(row.storageCondition)}</dd></div>
        <div class="sorting-label-field"><dt>下单数量</dt><dd>${quantityText(orderQty)} ${unit}</dd></div>
        <div class="sorting-label-field sorting-label-field-package"><dt>本包数量</dt><dd>${quantityText(quantity)} ${unit}</dd></div>
        <div class="sorting-label-field"><dt>分拣日期</dt><dd>${text(formatDate(row.sortingAt || payload?.printedAt))}</dd></div>
      </dl>
    </section>`;
  }

  const payload = readPayload();
  const labels = expandLabels(enrichRows(payload?.rows || []));
  const previewTitle = payload?.mode === 'customer' ? '客户分拣标签' : '商品分拣标签';
  const terminalSource = payload?.source === 'sorting-terminal-customer-item' || payload?.source === 'sorting-terminal-item';
  const returnHref = payload?.source === 'sorting-terminal-customer-item'
    ? `./sorting-terminal-customer-item.html?customer=${encodeURIComponent(payload.customerCode || '')}`
    : payload?.source === 'sorting-terminal-item'
      ? `./sorting-terminal-item.html${String(payload.returnSearch || '').startsWith('?') ? payload.returnSearch : ''}`
      : './sorting-management.html';
  const returnUrl = new URL(returnHref, window.location.href);
  if (terminalSource) {
    const rowId = String(payload.rows[0]?.id || '');
    const inferredId = Number(rowId.match(/-(\d+)$/)?.[1]);
    const returnDialog = payload.returnDialog || (Number.isInteger(inferredId) ? { taskId: inferredId } : null);
    if (returnDialog && Number.isInteger(returnDialog.taskId)) {
      returnUrl.searchParams.set('returnDialog', JSON.stringify(returnDialog));
    }
  }
  const returnText = terminalSource ? '返回分拣弹窗' : '返回分拣管理';
  document.title = `${previewTitle}打印预览 - 企业端`;
  root.innerHTML = `<main class="sorting-label-page">
    ${labels.length ? labels.map(renderLabel).join('') : '<p class="sorting-label-empty">暂无可打印的分拣标签</p>'}
  </main><nav class="sorting-label-actions" aria-label="页面导航">
    <a href="${escapeHtml(returnUrl.href)}">${returnText}</a>
  </nav>`;

  if (params.get('printKey')) {
    try {
      window.sessionStorage?.removeItem(params.get('printKey'));
      window.localStorage?.removeItem(params.get('printKey'));
    } catch (error) { /* 临时缓存清理失败不影响标签预览。 */ }
  }
})();
