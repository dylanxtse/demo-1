(function () {
  const root = document.getElementById('orderShippingPrintTemplateApp');
  if (!root) return;
  const PRINT_VERSION = '20260929-shipping-print-template-1';
  const PAGE_SIZE = 20;
  const params = new URLSearchParams(window.location.search);
  const headers = ['商品编号', '商品名称（计量单位/品牌/规格）', '单位', '下单数量', '下单单价', '发货数量', '发货小计', '验收数量', '生产日期'];
  const escapeHtml = (value) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const text = (value, fallback = '--') => value === '' || value == null ? fallback : escapeHtml(value);
  const number = (value, fixed = false) => { const parsed = Number(value); return Number.isFinite(parsed) ? (fixed ? parsed.toFixed(2) : String(parsed)) : '--'; };

  function readPayload() {
    const queryData = params.get('printData');
    if (queryData) { try { const payload = JSON.parse(queryData); if (payload?.version === PRINT_VERSION) return payload; } catch (error) { return null; } }
    const printKey = params.get('printKey');
    if (!printKey) return null;
    try { const payload = JSON.parse(window.sessionStorage?.getItem(printKey) || window.localStorage?.getItem(printKey) || ''); return payload?.version === PRINT_VERSION ? payload : null; } catch (error) { return null; }
  }

  function formatDateTime(value) {
    const date = value ? new Date(value) : new Date();
    const current = Number.isNaN(date.getTime()) ? new Date() : date;
    const pad = (part) => String(part).padStart(2, '0');
    return `${current.getFullYear()}-${pad(current.getMonth() + 1)}-${pad(current.getDate())} ${pad(current.getHours())}:${pad(current.getMinutes())}:${pad(current.getSeconds())}`;
  }

  function productName(item) { return window.DomUtils?.formatProductDisplay?.(item) || item.goodsName || item.productName || '--'; }
  function mealText(row) {
    const meals = row.mealCounts;
    if (typeof meals === 'string') return meals;
    if (!meals || typeof meals !== 'object') return '教师-不区分：--　　学生-不区分：--';
    return Object.entries(meals).map(([key, value]) => `${key}：${value}`).join('　');
  }
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
    const shipped = Number(item.shippingQty ?? item.actualQty ?? 0);
    if (!shipped || !spec || !Number(spec.packageQty)) return { unit: '--', quantity: '--', remainder: '--', coefficient: '--' };
    const quantityValue = Math.floor(shipped / Number(spec.packageQty));
    const remainder = Number((shipped - quantityValue * Number(spec.packageQty)).toFixed(2));
    return { unit: spec.packageUnit || '--', quantity: String(quantityValue), remainder: remainder ? String(remainder) : '', coefficient: String(spec.packageQty) };
  }
  function qrCode(value) {
    const seed = String(value || 'shipping-order');
    const cells = [];
    const isFinder = (x, y, ox, oy) => {
      if (x < ox || x >= ox + 7 || y < oy || y >= oy + 7) return false;
      const dx = x - ox;
      const dy = y - oy;
      return dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4);
    };
    for (let y = 0; y < 21; y += 1) for (let x = 0; x < 21; x += 1) {
      const finder = isFinder(x, y, 0, 0) || isFinder(x, y, 14, 0) || isFinder(x, y, 0, 14);
      const code = seed.charCodeAt((x * 7 + y * 13) % seed.length) || 0;
      if (finder || (!((x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12)) && (code + x * 3 + y * 5) % 3 === 0)) cells.push(`<rect x="${x + 2}" y="${y + 2}" width="1" height="1"/>`);
    }
    return `<svg class="shipping-print-qrcode" viewBox="0 0 25 25" role="img" aria-label="订单二维码"><rect width="25" height="25" fill="#fff"/>${cells.join('')}</svg>`;
  }
  function renderInfo(row) {
    return `<div class="shipping-print-info">
      <span>期望送达时间：${text(row.expectedAt || '--')}</span>
      <span>客户名称：${text(row.customerName)}${row.customerCode ? `　学校编码：${text(row.customerCode)}` : ''}</span>
      <span></span>
      <span>食堂：${text(row.canteen)}</span>
      <span>收货人：${text(row.receiver || '--')}（${text(row.phone || '00000000000')}）</span>
      <span>订单号：${text(row.orderNo || '--')}</span>
      <span>订单标签：${text(row.orderTag || row.tagName || '教师-非营养餐')}</span>
      <span>就餐人次：${escapeHtml(row.mealCount ?? row.totalPeople ?? mealText(row))}</span>
      <span>餐次：${text(row.mealName || row.meal || '早餐')}</span>
      <span>配送人：${text(row.deliveryPerson || '--')}</span>
      <span class="shipping-print-address">收货地址：${text(row.address || '默认收货地址')}</span>
    </div>`;
  }
  function renderTable(rows) {
    const total = rows.reduce((sum, row) => sum + Number(row.shippingQty ?? row.orderQty ?? 0) * Number(row.unitPrice || 0), 0);
    const body = rows.length ? rows.map((row) => `<tr><td>${text(row.goodsCode)}</td><td>${text(productName(row))}</td><td>${text(row.unit)}</td><td>${number(row.orderQty, true)}</td><td>${number(row.unitPrice, true)}</td><td>${row.shippingQty == null ? '' : number(row.shippingQty, true)}</td><td>${row.shippingQty == null ? '' : number(Number(row.shippingQty) * Number(row.unitPrice || 0), true)}</td><td></td><td>${text(row.productionDate, '')}</td></tr>`).join('') : '<tr><td colspan="9">暂无商品明细</td></tr>';
    return `<table class="shipping-print-table"><colgroup><col class="col-code"><col class="col-name"><col class="col-unit"><col class="col-order-qty"><col class="col-price"><col class="col-shipping-qty"><col class="col-subtotal"><col class="col-accepted"><col class="col-date"></colgroup><thead><tr>${headers.map((header) => `<th>${header}</th>`).join('')}</tr></thead><tbody>${body}<tr class="shipping-print-summary"><td colspan="6">发货总金额：</td><td>${number(total, true)}</td><td colspan="2">大写总金额：零元整</td></tr></tbody></table>`;
  }

  const fallback = { version: PRINT_VERSION, companyName: '赣州客家新源供应链有限公司', sourceUrl: 'https://gxyc.canantong.com:4403/shippingManagement', printedAt: new Date().toISOString(), rows: window.DemoStore?.get?.('shippingOrders') || [] };
  const payload = readPayload() || fallback;
  const sortingItems = window.DemoStore?.get?.('sortingItems') || [];
  const expandedRows = (payload.rows || []).flatMap((row) => {
    if (row.goodsName || row.goodsCode || row.productName) return [row];
    const date = String(row.expectedAt || '').slice(0, 10);
    const matches = sortingItems.filter((item) => item.customerName === row.customerName && item.canteen === row.canteen && (!date || String(item.expectedAt || '').slice(0, 10) === date));
    return (matches.length ? matches : [row]).map((item) => ({ ...item, ...row, goodsName: item.goodsName, goodsCode: item.goodsCode, unit: item.unit, orderQty: item.orderQty, shippingQty: row.shippingQty, unitPrice: row.unitPrice }));
  });
  const grouped = [];
  expandedRows.forEach((row) => { const key = `${row.customerName || ''}|${row.canteen || ''}|${row.orderNo || ''}`; let group = grouped.find((item) => item.key === key); if (!group) { group = { key, row, rows: [] }; grouped.push(group); } group.rows.push(row); });
  const pages = grouped.length ? grouped : [{ row: {}, rows: [] }];
  root.innerHTML = `<main class="shipping-print-page">${pages.map((group, index) => `<section class="shipping-print-paper"><div class="shipping-print-heading"><h1 class="shipping-print-title">${text(payload.companyName, '赣州客家新源供应链有限公司')}配送单</h1>${qrCode(group.row.orderNo || group.row.customerCode || index)}</div>${renderInfo(group.row)}${renderTable(group.rows)}<div class="shipping-print-signature"><span>经手人或单位：${text(group.row.receiver || '--')}</span><span>送货人：</span><span>验收人或单位：</span></div><footer class="shipping-print-footer"><span>${text(payload.sourceUrl)}</span><span>${index + 1}/${pages.length}</span></footer></section>`).join('')}<nav class="shipping-print-actions"><a href="./shipping-management.html">返回发货管理</a></nav></main>`;
  if (params.get('printKey')) { try { window.sessionStorage?.removeItem(params.get('printKey')); window.localStorage?.removeItem(params.get('printKey')); } catch (error) { /* 忽略清理失败。 */ } }
})();
