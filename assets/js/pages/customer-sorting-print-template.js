(function () {
  const root = document.getElementById('customerSortingPrintTemplateApp');
  if (!root) return;

  const PRINT_VERSION = '20260929-customer-sorting-print-template-1';
  const PAGE_SIZE = 17;
  const params = new URLSearchParams(window.location.search);
  const headers = ['客户名称', '食堂', '期望送达时间', '商品名称（计量单位/品牌/规格）', '下单数量', '实际数量', '计量单位', '分包数量', '分包尾数', '分包系数', '分包单位'];
  const escapeHtml = (value) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const text = (value, fallback = '--') => value === '' || value == null ? fallback : escapeHtml(value);

  function readPayload() {
    const queryData = params.get('printData');
    if (queryData) {
      try {
        const payload = JSON.parse(queryData);
        if (payload?.version === PRINT_VERSION) return payload;
      } catch (error) { return null; }
    }
    const printKey = params.get('printKey');
    if (!printKey) return null;
    try {
      const raw = window.sessionStorage?.getItem(printKey) || window.localStorage?.getItem(printKey) || '';
      const payload = JSON.parse(raw);
      return payload?.version === PRINT_VERSION ? payload : null;
    } catch (error) { return null; }
  }

  function formatDateTime(value) {
    const date = value ? new Date(value) : new Date();
    const current = Number.isNaN(date.getTime()) ? new Date() : date;
    const pad = (part) => String(part).padStart(2, '0');
    return `${current.getFullYear()}-${pad(current.getMonth() + 1)}-${pad(current.getDate())} ${pad(current.getHours())}:${pad(current.getMinutes())}:${pad(current.getSeconds())}`;
  }

  function formatMetaTime(value) {
    const date = value ? new Date(value) : new Date();
    const current = Number.isNaN(date.getTime()) ? new Date() : date;
    return `${current.getFullYear()}/${current.getMonth() + 1}/${current.getDate()} ${String(current.getHours()).padStart(2, '0')}:${String(current.getMinutes()).padStart(2, '0')}`;
  }

  function quantity(value, blankZero = false) {
    if (value === '' || value == null || (blankZero && Number(value) === 0)) return blankZero ? '0' : '--';
    const parsed = Number(value);
    return Number.isFinite(parsed) ? String(parsed) : text(value);
  }

  function productName(item) {
    return window.DomUtils?.formatProductDisplay?.(item) || item.goodsName || '--';
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
    const actual = Number(item.actualQty || 0);
    if (!actual || !spec || !Number(spec.packageQty)) return { unit: '--', quantity: '--', remainder: '--', coefficient: '--' };
    const quantityValue = Math.floor(actual / Number(spec.packageQty));
    const remainder = Number((actual - quantityValue * Number(spec.packageQty)).toFixed(2));
    return { unit: spec.packageUnit || '--', quantity: String(quantityValue), remainder: remainder ? String(remainder) : '', coefficient: String(spec.packageQty) };
  }

  function renderTable(rows) {
    return `<table class="customer-sorting-print-table"><colgroup><col class="col-customer"><col class="col-canteen"><col class="col-date"><col class="col-goods"><col class="col-order-qty"><col class="col-actual-qty"><col class="col-unit"><col class="col-package-qty"><col class="col-package-remainder"><col class="col-package-coefficient"><col class="col-package-unit"></colgroup><thead><tr>${headers.map((header) => `<th>${header}</th>`).join('')}</tr></thead><tbody>${rows.length ? rows.map((item) => { const packageInfo = packageBreakdown(item); return `<tr><td>${text(item.customerName)}</td><td>${text(item.canteen)}</td><td>${text(item.expectedAt)}</td><td>${text(productName(item))}</td><td>${quantity(item.orderQty)}</td><td>${quantity(item.actualQty, true)}</td><td>${text(item.unit)}</td><td>${text(packageInfo.quantity)}</td><td>${text(packageInfo.remainder, '')}</td><td>${text(packageInfo.coefficient)}</td><td>${text(packageInfo.unit)}</td></tr>`; }).join('') : '<tr><td class="customer-sorting-print-empty" colspan="11">暂无可打印的分拣数据</td></tr>'}</tbody></table>`;
  }

  const payload = readPayload() || { version: PRINT_VERSION, companyName: '阳光智园', sourceUrl: 'https://gxyc.canantong.com:4403/sortingManagementList', printedAt: new Date().toISOString(), rows: window.DemoStore?.get?.('sortingItems') || [] };
  const rows = Array.isArray(payload.rows) ? payload.rows : [];
  const pages = [];
  for (let index = 0; index < rows.length || index === 0; index += PAGE_SIZE) pages.push(rows.slice(index, index + PAGE_SIZE));

  root.innerHTML = `<main class="customer-sorting-print-page">${pages.map((pageRows, pageIndex) => {
    const first = pageIndex === 0;
    const meta = first ? '' : `<div class="customer-sorting-print-meta"><span>${escapeHtml(formatMetaTime(payload.printedAt))}</span></div>`;
    const title = first ? `<h1 class="customer-sorting-print-title">客户分拣打印--${escapeHtml(formatDateTime(payload.printedAt))}</h1>` : '';
    return `<section class="customer-sorting-print-paper">${title}${meta}${renderTable(pageRows)}<footer class="customer-sorting-print-footer"><span>${text(payload.sourceUrl)}</span><span>${pageIndex + 1}/${pages.length}</span></footer></section>`;
  }).join('')}<nav class="customer-sorting-print-actions"><a href="./sorting-management.html">返回分拣管理</a></nav></main>`;

  if (params.get('printKey')) {
    try { window.sessionStorage?.removeItem(params.get('printKey')); window.localStorage?.removeItem(params.get('printKey')); } catch (error) { /* 忽略临时缓存清理失败。 */ }
  }
})();
