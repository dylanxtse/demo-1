(function () {
  const root = document.getElementById('schoolOrderExportOrderTemplateApp');
  if (!root) return;

  const EXPORT_VERSION = '20260920-school-order-export-order-1';
  const params = new URLSearchParams(window.location.search);

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const display = (value, fallback = '--') => value === '' || value == null ? fallback : escapeHtml(value);
  const numberValue = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const quantity = (value) => {
    const parsed = numberValue(value);
    return parsed == null ? '--' : parsed.toFixed(2);
  };
  const amount = (value) => {
    const parsed = numberValue(value);
    return parsed == null ? '--' : parsed.toFixed(2);
  };
  const subtotal = (value) => amount(value == null || value === '' ? 0 : value);
  const formatDateTime = (date) => {
    const pad = (value) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  };

  function readPayload() {
    const queryData = params.get('exportData');
    if (queryData) {
      try {
        const queryPayload = JSON.parse(queryData);
        if (queryPayload?.version === EXPORT_VERSION) return queryPayload;
      } catch (error) {
        return null;
      }
    }
    const exportKey = params.get('exportKey');
    if (!exportKey) return null;
    try {
      const raw = window.sessionStorage?.getItem(exportKey) || window.localStorage?.getItem(exportKey) || '';
      if (!raw) return null;
      const payload = JSON.parse(raw);
      return payload?.version === EXPORT_VERSION ? payload : null;
    } catch (error) {
      return null;
    }
  }

  const payload = readPayload();
  const service = window.SchoolOrderService;
  const orders = Array.isArray(payload?.rows) ? payload.rows : (service?.getAll?.() || []);
  const schoolName = payload?.schoolName || service?.SCHOOL_NAME || '静安第一中学';
  const exportTime = payload?.exportedAt || formatDateTime(new Date());

  const lineDisplayName = (line) => line.displayName
    || `${line.productName || line.goodsName || '--'}（${line.unit || '--'}/${line.brand || '--'}/${line.spec || '--'}）`;
  const lineSubtotal = (line) => line.orderSubtotal == null
    ? Number((Number(line.orderQty || 0) * Number(line.orderPrice || line.unitPrice || 0)).toFixed(2))
    : line.orderSubtotal;
  const orderTotal = (order) => order.orderAmount == null
    ? (order.items || []).reduce((sum, line) => sum + Number(lineSubtotal(line) || 0), 0)
    : order.orderAmount;

  const COL_SPAN = 15;

  function renderOrderBlock(order) {
    const items = Array.isArray(order.items) ? order.items : [];
    const itemRows = items.length
      ? items.map((line, i) => renderItemRow(line, i)).join('')
      : `<tr class="school-order-export-item-row"><td colspan="${COL_SPAN}">暂无商品明细</td></tr>`;
    return `<tr class="school-order-export-meta-row"><td colspan="4">订单号：${display(order.orderNo)}</td><td colspan="4">供应平台：${display(order.supplierName || order.supplier)}</td><td colspan="3">食堂：${display(order.canteen)}</td><td colspan="4">订单标签：${display(order.orderTag)}</td></tr>
      <tr class="school-order-export-meta-row"><td colspan="4">期望送达时间：${display(order.expectedAt)}</td><td colspan="4">单据来源：${display(order.source)}</td><td colspan="3">添加时间：${display(order.createdAt)}</td><td colspan="4">制单人：${display(order.creator)}</td></tr>
      <tr class="school-order-export-meta-row"><td colspan="4">发货时间：${display(order.shippingAt)}</td><td colspan="4">司机：${display(order.driver)}</td><td colspan="3">验收时间：${display(order.acceptedAt)}</td><td colspan="4"><span>单据状态：${display(order.status)}</span><span class="school-order-export-meta-inline">是否补单：${display(order.supplement)}</span></td></tr>
      <tr class="school-order-export-column-row"><th>序号</th><th>商品名称（计量单位/品牌/规格）</th><th>商品编码</th><th>计量单位</th><th>下单单价</th><th>下单数量</th><th>下单小计</th><th>验货数量</th><th>验货小计</th><th>退货数量</th><th>退货小计</th><th>对账数量</th><th>对账小计</th><th>备注</th><th>生产日期</th></tr>
      ${itemRows}
      <tr class="school-order-export-summary-row"><td colspan="2" class="school-order-export-summary-label">金额合计（元）</td><td></td><td colspan="3"></td><td>${amount(orderTotal(order))}</td><td colspan="8"></td></tr>
      <tr class="school-order-export-spacer-row"><td colspan="${COL_SPAN}">&nbsp;</td></tr>`;
  }

  function renderItemRow(line, index) {
    return `<tr class="school-order-export-item-row">
      <td>${index + 1}</td>
      <td title="${escapeHtml(lineDisplayName(line))}">${escapeHtml(lineDisplayName(line))}</td>
      <td>${display(line.productCode || line.goodsCode)}</td>
      <td>${display(line.unit)}</td>
      <td>${amount(line.orderPrice ?? line.unitPrice)}</td>
      <td>${quantity(line.orderQty ?? line.quantity)}</td>
      <td>${amount(lineSubtotal(line))}</td>
      <td>${quantity(line.acceptedQty)}</td>
      <td>${amount(line.acceptedSubtotal)}</td>
      <td>${quantity(line.returnQty)}</td>
      <td>${subtotal(line.returnSubtotal)}</td>
      <td>${quantity(line.reconciledQty ?? line.reconciliationQty)}</td>
      <td>${subtotal(line.reconciledSubtotal ?? line.reconciliationAmount)}</td>
      <td>${display(line.remark)}</td>
      <td>${display(line.productionDate)}</td>
    </tr>`;
  }

  const tableRows = orders.length ? orders.map(renderOrderBlock).join('') : '';

  root.innerHTML = `<main class="school-order-export-template-page">
    <header class="school-order-export-template-header"><h1>订单导出</h1></header>
    <section class="school-order-export-template-section">
      <div class="school-order-export-template-inner">
        ${orders.length
          ? `<div class="school-order-export-template-table-wrap">
              <table class="school-order-export-template-table">
                <colgroup>
                  <col style="width:72px"><col style="width:336px"><col style="width:168px"><col style="width:148px"><col style="width:112px"><col style="width:112px"><col style="width:114px"><col style="width:112px"><col style="width:112px"><col style="width:112px"><col style="width:112px"><col style="width:112px"><col style="width:112px"><col style="width:160px"><col style="width:112px">
                </colgroup>
                <tbody><tr class="school-order-export-title-row"><th colspan="${COL_SPAN}">订单</th></tr>${tableRows}</tbody>
              </table>
            </div>`
          : '<div class="school-order-export-template-empty">暂无可导出的订单</div>'}
      </div>
    </section>
    <div class="school-order-export-template-actions"><a href="./school-order-management.html">返回订单管理</a></div>
  </main>`;

  if (params.get('exportKey')) {
    try {
      window.sessionStorage?.removeItem(params.get('exportKey'));
      window.localStorage?.removeItem(params.get('exportKey'));
    } catch (error) {
      // 仅影响临时缓存清理，不阻断模板展示。
    }
  }
})();
