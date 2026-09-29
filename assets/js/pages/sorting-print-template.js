(function () {
  const root = document.getElementById('sortingPrintTemplateApp');
  if (!root) return;

  const PRINT_VERSION = '20260929-sorting-print-template-1';
  const PAGE_SIZE = 17;
  const params = new URLSearchParams(window.location.search);
  const headers = ['商品名称（计量单位/品牌/规格）', '客户名称', '食堂', '下单数量', '实际数量', '分包单位', '分包数量', '分包尾数', '分包系数', '计量单位', '线路'];

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const display = (value, fallback = '--') => value === '' || value == null ? fallback : escapeHtml(value);

  function readPayload() {
    const queryData = params.get('printData');
    if (queryData) {
      try {
        const queryPayload = JSON.parse(queryData);
        if (queryPayload?.version === PRINT_VERSION) return queryPayload;
      } catch (error) {
        return null;
      }
    }

    const printKey = params.get('printKey');
    if (!printKey) return null;
    try {
      const raw = window.sessionStorage?.getItem(printKey) || window.localStorage?.getItem(printKey) || '';
      if (!raw) return null;
      const payload = JSON.parse(raw);
      return payload?.version === PRINT_VERSION ? payload : null;
    } catch (error) {
      return null;
    }
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

  function formatQuantity(value, blankZero = false) {
    if (value === '' || value == null || (blankZero && Number(value) === 0)) return '--';
    const parsed = Number(value);
    return Number.isFinite(parsed) ? String(parsed) : display(value);
  }

  function goodsName(item) {
    const source = item.displayGoodsName || item.goodsName || item.productName || '--';
    const plainName = String(source).replace(/\s*[（(][^）)]*[）)]\s*$/, '').trim();
    return display(plainName || source);
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
    const quantity = Math.floor(actual / Number(spec.packageQty));
    const remainder = Number((actual - quantity * Number(spec.packageQty)).toFixed(2));
    return { unit: spec.packageUnit || '--', quantity: String(quantity), remainder: remainder ? String(remainder) : '', coefficient: String(spec.packageQty) };
  }

  function normalizeRows(rows) {
    return (Array.isArray(rows) ? rows : []).map((item) => ({
      ...item,
      goodsName: goodsName(item),
      customerName: display(item.customerName),
      canteen: display(item.canteen),
      orderQty: formatQuantity(item.orderQty),
      actualQty: formatQuantity(item.actualQty, true),
      packageInfo: packageBreakdown(item),
      unit: display(item.unit),
      route: display(item.route)
    }));
  }

  function renderTable(rows) {
    return `<table class="sorting-print-table">
      <colgroup><col class="col-goods"><col class="col-customer"><col class="col-canteen"><col class="col-order-qty"><col class="col-actual-qty"><col class="col-package-unit"><col class="col-package-qty"><col class="col-package-remainder"><col class="col-package-coefficient"><col class="col-unit"><col class="col-route"></colgroup>
      <thead><tr>${headers.map((header) => `<th>${header}</th>`).join('')}</tr></thead>
      <tbody>${rows.length
        ? rows.map((row) => `<tr>
            <td>${row.goodsName}</td>
            <td>${row.customerName}</td>
            <td>${row.canteen}</td>
            <td>${row.orderQty}</td>
            <td>${row.actualQty}</td>
            <td>${display(row.packageInfo.unit)}</td>
            <td>${display(row.packageInfo.quantity)}</td>
            <td>${display(row.packageInfo.remainder, '')}</td>
            <td>${display(row.packageInfo.coefficient)}</td>
            <td>${row.unit}</td>
            <td>${row.route}</td>
          </tr>`).join('')
        : `<tr><td class="sorting-print-empty" colspan="11">暂无可打印的分拣数据</td></tr>`}
      </tbody>
    </table>`;
  }

  function renderPage(rows, pageIndex, totalPages, payload) {
    const isFirstPage = pageIndex === 0;
    const meta = isFirstPage ? '' : `<div class="sorting-print-meta"><span>${escapeHtml(formatMetaTime(payload.printedAt))}</span></div>`;
    const title = isFirstPage ? `<h1 class="sorting-print-title">商品分拣打印--${escapeHtml(formatDateTime(payload.printedAt))}</h1>` : '';
    return `<section class="sorting-print-paper">
      ${title}
      ${meta}
      ${renderTable(rows)}
      <footer class="sorting-print-footer"><span></span><span>${pageIndex + 1}/${totalPages}</span></footer>
    </section>`;
  }

  const payload = readPayload() || {
    version: PRINT_VERSION,
    companyName: '阳光智园',
    sourceUrl: 'https://gxyc.canantong.com:4403/sortingManagementList',
    printedAt: new Date().toISOString(),
    rows: window.DemoStore?.get?.('sortingItems') || []
  };
  const rows = normalizeRows(payload.rows);
  const pages = [];
  for (let index = 0; index < rows.length || index === 0; index += PAGE_SIZE) {
    pages.push(rows.slice(index, index + PAGE_SIZE));
  }

  root.innerHTML = `<main class="sorting-print-template-page">
    ${pages.map((pageRows, pageIndex) => renderPage(pageRows, pageIndex, pages.length, payload)).join('')}
    <nav class="sorting-print-template-actions" aria-label="模板操作">
      <a href="./sorting-management.html">返回分拣管理</a>
    </nav>
  </main>`;

  if (params.get('printKey')) {
    try {
      window.sessionStorage?.removeItem(params.get('printKey'));
      window.localStorage?.removeItem(params.get('printKey'));
    } catch (error) {
      // 临时缓存清理失败不影响预览内容。
    }
  }
})();
