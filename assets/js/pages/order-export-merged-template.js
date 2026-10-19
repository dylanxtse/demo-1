(function () {
  const root = document.getElementById('orderExportMergedTemplateApp');
  if (!root) return;

  const EXPORT_VERSION = '20261019-order-merged-export-1';
  const params = new URLSearchParams(window.location.search);
  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  const quantityText = (value) => Number(value || 0).toFixed(2);
  const amountText = (cents) => (cents / 100).toFixed(2);
  const packageText = (customer) => {
    const coefficient = Number(customer.packageCoefficient);
    if (!Number.isFinite(coefficient) || coefficient <= 0) return ['--', '--'];
    const count = Math.floor(customer.quantity / coefficient + 1e-9);
    const remainder = Number((customer.quantity - count * coefficient).toFixed(4));
    return [String(count), String(remainder)];
  };

  function readPayload() {
    const queryData = params.get('exportData');
    const exportKey = params.get('exportKey');
    try {
      const raw = queryData || (exportKey && (
        window.sessionStorage?.getItem(exportKey) || window.localStorage?.getItem(exportKey)
      ));
      const payload = raw ? JSON.parse(raw) : null;
      return payload?.version === EXPORT_VERSION && Array.isArray(payload.rows) ? payload : null;
    } catch (error) {
      return null;
    }
  }

  function productName(line) {
    const name = String(line.displayName || line.goodsName || line.productName || '--');
    if (/[（(][^）)]*[/／][^）)]*[/／][^）)]*[）)]$/.test(name)) return name;
    return `${name}（${line.unit || '--'}/${line.brand || '--'}/${line.spec || '--'}）`;
  }

  function number(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function groupOrders(orders) {
    const groups = new Map();
    orders.forEach((order) => {
      const customerName = String(order.customerName || '--');
      const canteen = String(order.canteen || '--');
      const lines = Array.isArray(order.items) ? order.items
        : Array.isArray(order.orderLines) ? order.orderLines : [];
      lines.forEach((line) => {
        const displayName = productName(line);
        const unit = String(line.unit || '--');
        const productKey = [line.goodsCode || line.productCode || line.productId || '', displayName, unit].join('\u0001');
        if (!groups.has(productKey)) groups.set(productKey, {
          name: displayName, unit, customers: new Map(), customerNames: new Set(), quantity: 0, amountCents: 0
        });
        const group = groups.get(productKey);
        const customerKey = [customerName, canteen].join('\u0001');
        if (!group.customers.has(customerKey)) group.customers.set(customerKey, {
          customerName, canteen, quantity: 0, amountCents: 0, packageCoefficient: 0
        });
        const customer = group.customers.get(customerKey);
        if (!customer.packageCoefficient && Number(line.packageCoefficient) > 0) {
          customer.packageCoefficient = Number(line.packageCoefficient);
        }
        const quantity = number(line.quantity ?? line.orderQty);
        const subtotal = line.subtotal ?? line.orderSubtotal ?? quantity * number(line.unitPrice ?? line.orderPrice);
        const amountCents = Math.round(number(subtotal) * 100);
        customer.quantity += quantity;
        customer.amountCents += amountCents;
        group.quantity += quantity;
        group.amountCents += amountCents;
        group.customerNames.add(customerName);
      });
    });
    return [...groups.values()];
  }

  function renderGroup(group, index) {
    const customers = [...group.customers.values()];
    const rowspan = customers.length;
    const packages = customers.map(packageText);
    const packageCountTotal = packages.every(([count]) => count !== '--')
      ? packages.reduce((sum, [count]) => sum + Number(count), 0)
      : '--';
    return customers.map((customer, customerIndex) => {
      const [packageCount, packageRemainder] = packages[customerIndex];
      return `<tr>
      ${customerIndex === 0 ? `<td rowspan="${rowspan}">${index + 1}</td>
        <td rowspan="${rowspan}" class="order-merge-product">${escapeHtml(group.name)}</td>
        <td rowspan="${rowspan}">${escapeHtml(group.unit)}</td>
        <td rowspan="${rowspan}">${group.customerNames.size}</td>` : ''}
      <td>${escapeHtml(customer.customerName)}</td>
      <td>${escapeHtml(customer.canteen)}</td>
      <td class="order-merge-number">${quantityText(customer.quantity)}</td>
      <td class="order-merge-number">${amountText(customer.amountCents)}</td>
      <td class="order-merge-number">${packageCount}</td>
      ${customerIndex === 0 ? `<td rowspan="${rowspan}" class="order-merge-number">${packageCountTotal}</td>` : ''}
      <td class="order-merge-number">${packageRemainder}</td>
      ${customerIndex === 0 ? `<td rowspan="${rowspan}" class="order-merge-number">${quantityText(group.quantity)}</td>
        <td rowspan="${rowspan}" class="order-merge-number">${amountText(group.amountCents)}</td>` : ''}
    </tr>`;
    }).join('');
  }

  const payload = readPayload();
  const groups = groupOrders(payload?.rows || []);
  root.innerHTML = `<main class="order-merge-page">
    <div class="order-merge-table-wrap">
      <table class="order-merge-table" aria-label="商品归并导出模板">
        <colgroup><col class="col-sequence"><col class="col-product"><col class="col-unit"><col class="col-customer-count"><col class="col-customer"><col class="col-canteen"><col class="col-quantity"><col class="col-amount"><col class="col-package-count"><col class="col-package-count-total"><col class="col-package-remainder"><col class="col-quantity-total"><col class="col-amount-total"></colgroup>
        <thead>
          <tr class="order-merge-title"><th colspan="13">商品归并</th></tr>
          <tr><th>序号</th><th>商品名称（计量单位/品牌/规格）</th><th>计量单位</th><th>客户数量</th><th>客户名称</th><th>食堂</th><th>下单数量</th><th>下单金额</th><th>分包数量</th><th>分包数量合计</th><th>分包尾数</th><th>下单数量合计</th><th>下单金额合计</th></tr>
        </thead>
        <tbody>${groups.length ? groups.map(renderGroup).join('') : '<tr><td colspan="13" class="order-merge-empty">暂无可归并的订单商品</td></tr>'}</tbody>
      </table>
    </div>
  </main>
  <nav class="order-merge-actions"><a href="./order-management.html">返回订单管理</a></nav>`;

})();
