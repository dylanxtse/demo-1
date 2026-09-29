(function () {
  const root = document.getElementById('orderShippingExportTemplateApp');
  if (!root) return;
  const params = new URLSearchParams(window.location.search);
  const allShipping = window.DemoStore?.get?.('shippingOrders') || [];
  const sortingItems = window.DemoStore?.get?.('sortingItems') || [];
  const products = window.DemoStore?.get?.('products') || [];
  const escapeHtml = (value) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  const text = (value, fallback = '--') => value === '' || value == null ? fallback : escapeHtml(value);
  const number = (value, fixed = false) => { const parsed = Number(value); return Number.isFinite(parsed) ? (fixed ? parsed.toFixed(2) : String(parsed)) : '--'; };
  const dateOnly = (value) => String(value || '').slice(0, 10) || '--';
  const statusText = (value, shipping = false) => shipping ? (value === 'SHIPPED' || value === '已发货' ? '已发货' : '未发货') : (value === 'SORTED' || value === '已分拣' ? '已分拣' : '未分拣');
  const defaultPackageSpecs = [
    { productCode: 'SP0300061', packageQty: 10, packageUnit: '包' },
    { productCode: 'SP0300039', packageQty: 10, packageUnit: '包' },
    { productCode: 'SP0300025', packageQty: 5, packageUnit: '包' },
    { productCode: 'SP0300019', packageQty: 10, packageUnit: '袋' },
    { productCode: 'SP0300034', packageQty: 25, packageUnit: '袋' },
    { productCode: 'SP0300020', packageQty: 10, packageUnit: '箱' },
    { productCode: 'SP0300051', packageQty: 10, packageUnit: '包' },
    { productCode: 'SP0300055', packageQty: 10, packageUnit: '包' },
    { productCode: 'SP0300059', packageQty: 10, packageUnit: '包' },
    { productCode: 'SP0300031', packageQty: 5, packageUnit: '箱' },
    { productCode: 'SP0300030', packageQty: 10, packageUnit: '箱' },
    { productCode: 'SP0300015', packageQty: 10, packageUnit: '筐' },
    { productCode: 'SP0300037', packageQty: 10, packageUnit: '箱' },
    { productCode: 'SP0300014', packageQty: 10, packageUnit: '筐' },
    { productCode: 'SP0300040', packageQty: 10, packageUnit: '袋' },
    { productCode: 'SP0300029', packageQty: 5, packageUnit: '箱' }
  ];

  function packageBreakdown(item) {
    const saved = window.AppStorage?.read('procurement-sorting-package-specs-v2', null);
    const specs = new Map(defaultPackageSpecs.map((spec) => [String(spec.productCode), spec]));
    (Array.isArray(saved) ? saved : []).forEach((spec) => specs.set(String(spec.productCode), spec));
    const spec = specs.get(String(item.goodsCode || item.productCode || item.productId));
    const shippedQty = item.shippingQty ?? item.actualQty;
    const quantityValue = Number(shippedQty || 0);
    if (!quantityValue || !spec || !Number(spec.packageQty)) return { unit: '--', quantity: '--', remainder: '--', coefficient: '--' };
    const quantity = Math.floor(quantityValue / Number(spec.packageQty));
    const remainder = Number((quantityValue - quantity * Number(spec.packageQty)).toFixed(2));
    return { unit: spec.packageUnit || '--', quantity: String(quantity), remainder: remainder ? String(remainder) : '', coefficient: String(spec.packageQty) };
  }
  function productDisplay(item) { return window.DomUtils?.formatProductDisplay?.(item) || item.goodsName || item.productName || '--'; }
  function qrCode(value) {
    const seed = String(value || 'shipping-export');
    const cells = [];
    const finder = (x, y, ox, oy) => {
      if (x < ox || x >= ox + 7 || y < oy || y >= oy + 7) return false;
      const dx = x - ox;
      const dy = y - oy;
      return dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4);
    };
    for (let y = 0; y < 21; y += 1) for (let x = 0; x < 21; x += 1) {
      const fixed = finder(x, y, 0, 0) || finder(x, y, 14, 0) || finder(x, y, 0, 14);
      const code = seed.charCodeAt((x * 7 + y * 13) % seed.length) || 0;
      if (fixed || (!((x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12)) && (code + x * 3 + y * 5) % 3 === 0)) cells.push(`<rect x="${x + 2}" y="${y + 2}" width="1" height="1"/>`);
    }
    return `<svg class="shipping-export-qrcode" viewBox="0 0 25 25" role="img" aria-label="订单二维码"><rect width="25" height="25" fill="#fff"/>${cells.join('')}</svg>`;
  }
  function matchesQuery(item) {
    const expectedAt = params.get('expectedAt') || '';
    const warehouse = params.get('warehouse') || '';
    const customerName = params.get('customerName') || '';
    if (expectedAt && dateOnly(item.expectedAt) !== expectedAt) return false;
    if (warehouse && warehouse !== '全部' && String(item.warehouse || '') !== warehouse) return false;
    if (customerName && !String(item.customerName || '').includes(customerName)) return false;
    return true;
  }
  function lineRows(record) {
    if (Array.isArray(record.items) && record.items.length) return record.items.map((line) => ({ ...record, ...line }));
    const date = dateOnly(record.expectedAt);
    const matches = sortingItems.filter((item) => item.customerName === record.customerName && item.canteen === record.canteen && dateOnly(item.expectedAt) === date);
    return (matches.length ? matches : [record]).map((item) => ({ ...record, ...item, shippingQty: record.shippingQty, shippingAmount: record.shippingAmount }));
  }
  function getGroups() {
    const filtered = allShipping.filter(matchesQuery);
    const source = filtered.length ? filtered : allShipping;
    return source.map((record) => ({ record, rows: lineRows(record) }));
  }
  function renderInfo(record) {
    const meal = record.mealCounts && typeof record.mealCounts === 'object' ? Object.entries(record.mealCounts).map(([key, value]) => `${key}：${value}`).join('　') : '教师-不区分：--　　学生-不区分：--';
    const exportTime = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-');
    return `<div class="shipping-export-info"><div>期望送达时间：${text(record.expectedAt || dateOnly(record.expectedAt))}</div><div>客户名称：${text(record.customerName)}${record.customerCode ? `　学校编码：${text(record.customerCode)}` : ''}</div><div>食堂名称：${text(record.canteen)}</div><div>收货人：${text(record.receiver || '--')}</div><div>收货地址：${text(record.address || '默认收货地址')}</div><div>收货手机：${text(record.phone || '--')}</div><div>订单号：${text(record.orderNo || '--')}</div><div>订单标签：${text(record.orderTag || record.tagName || '教师-不区分')}</div><div>就餐人次：${escapeHtml(meal)}</div><div>餐次：${text(record.mealName || record.meal || '早餐')}</div><div>单据打印时间：${escapeHtml(exportTime)}</div><div>发货时间：${text(record.shippingTime || '')}</div></div>`;
  }
  function renderTable(rows) {
    const total = rows.reduce((sum, row) => sum + Number(row.shippingQty || 0) * Number(row.unitPrice || 0), 0);
    const body = rows.map((row, index) => {
      const packageInfo = packageBreakdown(row);
      return `<tr><td>${index + 1}</td><td class="product">${text(productDisplay(row))}</td><td>${text(row.remark, '--')}</td><td>${text(row.unit)}</td><td>${number(row.orderQty, true)}</td><td>${number(row.unitPrice, true)}</td><td>${number(row.shippingQty ?? row.actualQty ?? 0, true)}</td><td>${text(packageInfo.unit)}</td><td>${text(packageInfo.quantity)}</td><td>${text(packageInfo.remainder, '')}</td><td>${text(packageInfo.coefficient)}</td><td>${number(Number(row.shippingQty || 0) * Number(row.unitPrice || 0), true)}</td><td>${statusText(row.status || row.sortingStatus)}</td><td>${statusText(row.status, true)}</td><td>${text(row.productionDate)}</td><td>${text(row.qualityReport || 0)}</td></tr>`;
    }).join('');
    return `<table class="shipping-export-table"><colgroup><col class="col-index"><col class="col-product"><col class="col-remark"><col class="col-unit"><col class="col-order-qty"><col class="col-price"><col class="col-shipping-qty"><col class="col-package-unit"><col class="col-package-qty"><col class="col-package-remainder"><col class="col-package-coefficient"><col class="col-subtotal"><col class="col-sorting-status"><col class="col-shipping-status"><col class="col-date"><col class="col-report"></colgroup><thead><tr>${['序号','商品名称（计量单位/品牌/规格）','备注','计量单位','下单数量','下单单价','发货数量','分包单位','分包数量','分包尾数','分包系数','发货小计','分拣状态','发货状态','生产日期','质检报告'].map((header) => `<th>${header}</th>`).join('')}</tr></thead><tbody>${body || '<tr><td colspan="16">暂无商品明细</td></tr>'}<tr class="summary-row"><td colspan="8">发货总金额：${number(total, true)}</td><td colspan="8">大写总金额：零元整</td></tr></tbody></table>`;
  }
  const groups = getGroups().slice(0, 2);
  root.innerHTML = `<main class="shipping-export-page">${groups.map(({ record, rows }) => `<section class="shipping-export-paper"><div class="shipping-export-heading"><h1 class="shipping-export-title">赣州客家新源供应链有限公司发货单</h1>${qrCode(record.orderNo || record.customerCode || record.customerName)}</div>${renderInfo(record)}${renderTable(rows)}<div class="shipping-export-signature"><span>经手人或单位：</span><span>送货人：</span><span>收货人或单位：</span><span>验收人：</span></div></section>`).join('')}<nav class="shipping-export-actions" aria-label="发货导出模板操作"><a href="./shipping-management.html">返回发货管理</a><span class="shipping-export-zoom-label">缩放</span><button type="button" data-action="zoom-out" aria-label="缩小模板">−</button><button type="button" class="shipping-export-zoom-value" data-action="zoom-reset" aria-label="恢复默认缩放">90%</button><button type="button" data-action="zoom-in" aria-label="放大模板">＋</button></nav></main>`;

  const page = document.querySelector('.shipping-export-page');
  const zoomValue = document.querySelector('[data-action="zoom-reset"]');
  const zoomSteps = [0.75, 0.8, 0.85, 0.9, 1, 1.1, 1.2];
  let zoom = 0.9;
  const applyZoom = (value) => {
    zoom = Math.min(1.2, Math.max(0.75, value));
    page?.style.setProperty('--shipping-export-zoom', String(zoom));
    if (zoomValue) zoomValue.textContent = `${Math.round(zoom * 100)}%`;
  };
  document.querySelector('[data-action="zoom-out"]')?.addEventListener('click', () => {
    applyZoom(zoomSteps[Math.max(0, zoomSteps.indexOf(zoom) - 1)] || 0.75);
  });
  document.querySelector('[data-action="zoom-in"]')?.addEventListener('click', () => {
    applyZoom(zoomSteps[Math.min(zoomSteps.length - 1, zoomSteps.indexOf(zoom) + 1)] || 1.2);
  });
  document.querySelector('[data-action="zoom-reset"]')?.addEventListener('click', () => applyZoom(0.9));
  applyZoom(zoom);
})();
