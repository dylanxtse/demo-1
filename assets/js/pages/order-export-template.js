(function () {
  const root = document.getElementById('orderExportTemplateApp');
  if (!root) return;

  const EXPORT_VERSION = '20260920-order-export-1';
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
  const orders = Array.isArray(payload?.rows) ? payload.rows : [];
  const companyName = payload?.companyName || '集采企业';
  const exportTime = payload?.exportedAt || formatDateTime(new Date());

  const statusMap = {
    PENDING: '待审核', PENDING_CONFIRM: '待确认', PENDING_AUDIT: '待审核',
    READY_FOR_SORTING: '待分拣', READY_FOR_SHIPPING: '待发货',
    APPROVED: '已审核', CONFIRMED: '已确认', SHIPPED: '已发货',
    COMPLETED: '已完成', CLOSED: '已关闭', DRAFT: '暂存', REJECTED: '已驳回'
  };
  const statusLabel = (status) => statusMap[status] || status || '--';

  const lineDisplayName = (line) => line.displayName
    || `${line.goodsName || line.productName || '--'}（${line.unit || '--'}/${line.brand || '--'}/${line.spec || '--'}）`;
  const lineSubtotal = (line) => line.subtotal == null
    ? Number((Number(line.quantity || 0) * Number(line.unitPrice || 0)).toFixed(2))
    : line.subtotal;
  const orderTotal = (order) => order.orderAmount == null
    ? (order.items || []).reduce((sum, line) => sum + Number(lineSubtotal(line) || 0), 0)
    : order.orderAmount;

  function renderItemRow(line, index, order) {
    return `<tr class="school-order-export-item-row">
      <td>${index + 1}</td>
      <td>${display(order.orderNo)}</td>
      <td>${display(line.goodsCode || line.productCode)}</td>
      <td title="${escapeHtml(line.goodsName || line.productName || '--')}">${display(line.goodsName || line.productName)}</td>
      <td>${display(line.category1 || line.firstCategory)}</td>
      <td>${display(line.category2 || line.secondCategory)}</td>
      <td>${display(line.category3 || line.thirdCategory)}</td>
      <td>${display(line.unit)}</td>
      <td>${display(line.brand)}</td>
      <td>${display(line.spec)}</td>
      <td>${display(companyName)}</td>
      <td>${display(order.customerName)}</td>
      <td>${display(order.canteen)}</td>
      <td>${display(order.orderTag)}</td>
      <td>${display(order.shippingAt)}</td>
      <td>${display(order.expectedAt)}</td>
      <td>${display(statusLabel(order.status))}</td>
      <td>${amount(line.unitPrice)}</td>
      <td>${quantity(line.quantity)}</td>
      <td>${amount(lineSubtotal(line))}</td>
      <td>${amount(line.shippingPrice ?? line.shippingUnitPrice)}</td>
      <td>${quantity(line.shippingQty ?? line.shippedQty)}</td>
      <td>${subtotal(line.shippingSubtotal ?? line.shippedSubtotal ?? line.shippedAmount)}</td>
      <td>${quantity(line.acceptedQty)}</td>
      <td>${amount(line.acceptedSubtotal ?? line.acceptedAmount)}</td>
      <td>${quantity(line.returnQty)}</td>
      <td>${subtotal(line.returnSubtotal ?? line.returnAmount)}</td>
      <td>${display(line.remark)}</td>
      <td>${display(line.productionDate)}</td>
    </tr>`;
  }

  function renderFlatTable(orders) {
    let serial = 0;
    const allRows = orders.map((order) => {
      const items = Array.isArray(order.items) ? order.items : [];
      return items.length
        ? items.map((line) => renderItemRow(line, serial++, order)).join('')
        : '<tr class="school-order-export-item-row"><td colspan="29">暂无商品明细</td></tr>';
    }).join('');
    return `<div class="school-order-export-template-table-wrap">
      <table class="school-order-export-template-table">
        <colgroup>
          <col style="width:60px"><col style="width:160px"><col style="width:180px"><col style="width:100px"><col style="width:100px"><col style="width:100px"><col style="width:100px"><col style="width:100px"><col style="width:100px"><col style="width:120px"><col style="width:200px"><col style="width:160px"><col style="width:200px"><col style="width:120px"><col style="width:160px"><col style="width:160px"><col style="width:100px"><col style="width:130px"><col style="width:100px"><col style="width:100px"><col style="width:100px"><col style="width:110px"><col style="width:100px"><col style="width:110px"><col style="width:100px"><col style="width:110px"><col style="width:140px"><col style="width:120px">
        </colgroup>
        <thead>
          <tr class="school-order-export-title-row"><th colspan="29">订单商品</th></tr>
          <tr class="school-order-export-column-row"><th>序号</th><th>订单号</th><th>商品编码</th><th>商品名称</th><th>一级分类</th><th>二级分类</th><th>三级分类</th><th>计量单位</th><th>品牌</th><th>规格</th><th>供货企业</th><th>客户名称</th><th>食堂</th><th>订单标签</th><th>发货时间</th><th>期望送达时间</th><th>单据状态</th><th>下单单价</th><th>下单数量</th><th>下单小计</th><th>发货单价</th><th>发货数量</th><th>发货小计</th><th>验货数量</th><th>验货小计</th><th>退货数量</th><th>退货小计</th><th>备注</th><th>生产日期</th></tr>
        </thead>
        <tbody>
          ${allRows}
        </tbody>
      </table>
    </div>`;
  }

  root.innerHTML = `<main class="school-order-export-template-page">
    <section class="school-order-export-template-section">
      <div class="school-order-export-template-inner">
        ${orders.length ? renderFlatTable(orders) : '<div class="school-order-export-template-empty">暂无可导出的订单</div>'}
      </div>
    </section>
    <div class="school-order-export-template-actions"><a href="./order-management.html">返回订单管理</a></div>
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
