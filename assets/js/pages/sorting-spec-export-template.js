(function () {
  const root = document.getElementById('sortingSpecExportTemplateApp');
  if (!root) return;

  const EXPORT_VERSION = '20260929-sorting-spec-export-template-1';
  const STORAGE_KEY = 'procurement-sorting-package-specs-v2';
  const params = new URLSearchParams(window.location.search);
  const headers = ['序号', '商品名称（计量单位/品牌/规格）', '商品编号', '是否标品', '计量单位', '分包单位', '分包系数', '状态', '更新时间', '备注'];

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const display = (value, fallback = '--') => value === '' || value == null ? fallback : escapeHtml(value);

  function formatNumber(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return '--';
    return String(Number(number.toFixed(4)));
  }

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

  function fallbackRows() {
    const products = (window.ProductService?.getList?.() || []).filter((product) => product?.code && product?.name);
    const savedSpecs = window.AppStorage?.read(STORAGE_KEY, []) || [];
    const specs = Array.isArray(savedSpecs) ? savedSpecs : [];
    const specsByCode = new Map(specs.map((spec) => [String(spec.productCode), spec]));
    return products.map((product) => {
      const spec = specsByCode.get(String(product.code));
      const hasSpec = Boolean(spec);
      return {
        productCode: product.code,
        productName: product.name,
        productDisplay: `${product.name}（${product.unit || '--'}/${product.brand || '--'}/${product.spec || '--'}）`,
        isStandardProduct: product.isStandardProduct === true || product.isStandardProduct === 'true' || product.isStandardProduct === '是',
        baseUnit: product.unit || '',
        packageUnit: hasSpec ? spec.packageUnit : '',
        packageQty: hasSpec ? spec.packageQty : '',
        status: hasSpec ? spec.status : 'PENDING',
        updatedAt: hasSpec ? spec.updatedAt : '',
        remark: hasSpec ? spec.remark : ''
      };
    });
  }

  function productDisplay(row) {
    return row.productDisplay || `${row.productName || '--'}（${row.baseUnit || '--'}/${row.brand || '--'}/${row.spec || '--'}）`;
  }

  function statusText(status) {
    return ({ ENABLE: '启用', DISABLE: '停用', PENDING: '待启用' })[status] || status || '--';
  }

  function statusClass(status) {
    return status === 'ENABLE' ? 'is-enabled' : status === 'DISABLE' ? 'is-disabled' : 'is-pending';
  }

  function renderRow(row, index) {
    const status = row.status || 'PENDING';
    return `<tr class="sorting-spec-export-item-row">
      <td class="text-center">${index + 1}</td>
      <td class="product-name-cell" title="${escapeHtml(productDisplay(row))}">${escapeHtml(productDisplay(row))}</td>
      <td>${display(row.productCode)}</td>
      <td>${row.isStandardProduct ? '是' : '否'}</td>
      <td>${display(row.baseUnit)}</td>
      <td>${display(row.packageUnit, '')}</td>
      <td>${row.packageQty === '' || row.packageQty == null ? '' : formatNumber(row.packageQty)}</td>
      <td><span class="sorting-spec-export-status ${statusClass(status)}">${escapeHtml(statusText(status))}</span></td>
      <td>${display(row.updatedAt, '')}</td>
      <td class="remark-cell" title="${escapeHtml(row.remark || '')}">${escapeHtml(row.remark || '')}</td>
    </tr>`;
  }

  const payload = readPayload() || { rows: fallbackRows(), exportedAt: new Date().toISOString() };
  const rows = Array.isArray(payload.rows) ? payload.rows : [];
  const exportTime = payload.exportedAt || new Date().toISOString();
  const body = rows.length
    ? rows.map(renderRow).join('')
    : '<tr class="sorting-spec-export-empty-row"><td colspan="10">暂无可导出的分包规格</td></tr>';

  root.innerHTML = `<main class="school-order-export-template-page sorting-spec-export-template-page">
    <section class="school-order-export-template-section">
      <div class="school-order-export-template-inner sorting-spec-export-template-inner">
        <div class="school-order-export-template-table-wrap sorting-spec-export-template-table-wrap">
          <table class="school-order-export-template-table sorting-spec-export-template-table" aria-label="分包规格导出模板">
            <colgroup>
              <col class="sorting-spec-export-col-sequence"><col class="sorting-spec-export-col-product"><col class="sorting-spec-export-col-code"><col class="sorting-spec-export-col-standard"><col class="sorting-spec-export-col-unit"><col class="sorting-spec-export-col-package-unit"><col class="sorting-spec-export-col-quantity"><col class="sorting-spec-export-col-status"><col class="sorting-spec-export-col-updated"><col class="sorting-spec-export-col-remark">
            </colgroup>
            <thead>
              <tr class="sorting-spec-export-title-row"><th colspan="10">分包规格</th></tr>
              <tr class="sorting-spec-export-meta-row"><th colspan="6">导出时间：${escapeHtml(exportTime)}</th><th colspan="4">共 ${rows.length} 条数据</th></tr>
              <tr class="sorting-spec-export-column-row">${headers.map((header) => `<th>${header}</th>`).join('')}</tr>
            </thead>
            <tbody>${body}</tbody>
          </table>
        </div>
      </div>
    </section>
    <nav class="school-order-export-template-actions sorting-spec-export-template-actions" aria-label="分包规格导出模板操作">
      <a href="./sorting-spec.html">返回分包规格</a>
      <span class="sorting-spec-export-zoom-label">缩放</span>
      <button type="button" data-action="zoom-out" aria-label="缩小模板">−</button>
      <button type="button" class="sorting-spec-export-zoom-value" data-action="zoom-reset" aria-label="恢复默认缩放">90%</button>
      <button type="button" data-action="zoom-in" aria-label="放大模板">＋</button>
    </nav>
  </main>`;

  const page = document.querySelector('.sorting-spec-export-template-page');
  const zoomValue = document.querySelector('[data-action="zoom-reset"]');
  const zoomSteps = [0.75, 0.8, 0.85, 0.9, 1, 1.1, 1.2];
  let zoom = 0.9;
  const applyZoom = (value) => {
    zoom = Math.min(1.2, Math.max(0.75, value));
    page?.style.setProperty('--sorting-spec-export-zoom', String(zoom));
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

  if (params.get('exportKey')) {
    try {
      window.sessionStorage?.removeItem(params.get('exportKey'));
      window.localStorage?.removeItem(params.get('exportKey'));
    } catch (error) {
      // 临时缓存清理失败不影响模板展示。
    }
  }
})();
