(function () {
  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatNumber(value) {
    const number = Number(value || 0);
    return Number.isInteger(number) ? String(number) : number.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  }

  function getItems() {
    const allItems = window.DemoStore?.get('sortingItems') || [];
    const params = new URLSearchParams(window.location.search);
    const expectedAt = params.get('expectedAt') || '';
    const warehouse = params.get('warehouse') || '';
    const status = params.get('status') || '';
    const hasFilter = Boolean(
      expectedAt ||
      (warehouse && warehouse !== '全部') ||
      (status && status !== '全部')
    );
    const filtered = allItems.filter((item) => {
      if (expectedAt && String(item.expectedAt || '').slice(0, 10) !== expectedAt) return false;
      if (warehouse && warehouse !== '全部' && String(item.warehouse || item.warehouseName || '') !== warehouse) return false;
      if (status && status !== '全部' && !status.split(',').includes(String(item.status || ''))) return false;
      return true;
    });
    return hasFilter ? filtered : allItems;
  }

  function statusText(status) {
    return ({ PENDING: '未分拣', PARTIAL: '部分分拣', SORTED: '已分拣', SHORTAGE: '缺货' })[status] || status || '--';
  }

  function progressText(item) {
    const actual = Number(item.actualQty || 0);
    const order = Number(item.orderQty || 0);
    const unit = item.unit || '';
    return `${formatNumber(actual)}/${formatNumber(order)}${unit}`;
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

  function packageSpecFor(item) {
    const saved = window.AppStorage?.read('procurement-sorting-package-specs-v2', null);
    const specs = new Map(defaultPackageSpecs.map((spec) => [String(spec.productCode), spec]));
    (Array.isArray(saved) ? saved : []).forEach((spec) => specs.set(String(spec.productCode), spec));
    return specs.get(String(item.goodsCode || item.productCode || item.productId)) || null;
  }

  function packageBreakdown(item) {
    const actual = Number(item.actualQty || 0);
    const spec = packageSpecFor(item);
    if (!actual || !spec || !Number(spec.packageQty)) return { unit: '--', quantity: '--', remainder: '--', coefficient: '--' };
    const quantity = Math.floor(actual / Number(spec.packageQty));
    const remainder = Number((actual - quantity * Number(spec.packageQty)).toFixed(2));
    return { unit: spec.packageUnit || '--', quantity: String(quantity), remainder: remainder ? String(remainder) : '', coefficient: String(spec.packageQty) };
  }

  function renderRow(item) {
    const product = window.DomUtils?.formatProductDisplay?.(item) || item.goodsName || '--';
    const expectedAt = String(item.expectedAt || '').slice(0, 10) || '--';
    const packageInfo = packageBreakdown(item);
    return `<tr>
      <td>${escapeHtml(product)}</td>
      <td>${escapeHtml(item.customerName || '--')}</td>
      <td>${escapeHtml(item.canteen || '--')}</td>
      <td>${escapeHtml(expectedAt)}</td>
      <td>${formatNumber(item.orderQty)}</td>
      <td>${item.actualQty ? formatNumber(item.actualQty) : ''}</td>
      <td>${escapeHtml(item.unit || '--')}</td>
      <td>${escapeHtml(packageInfo.quantity)}</td>
      <td>${escapeHtml(packageInfo.remainder)}</td>
      <td>${escapeHtml(packageInfo.unit)}</td>
      <td>${escapeHtml(packageInfo.coefficient)}</td>
      <td>${escapeHtml(progressText(item))}</td>
      <td>${escapeHtml(item.remark || '')}</td>
      <td>${escapeHtml(item.stock ?? '--')}</td>
      <td>${escapeHtml(statusText(item.status))}</td>
      <td>${escapeHtml(item.sorter || '')}</td>
      <td>${escapeHtml(item.sortingAt || '')}</td>
      <td>${escapeHtml(item.route || '')}</td>
    </tr>`;
  }

  const items = getItems();
  document.getElementById('independentExportBody').innerHTML = items.length
    ? items.map(renderRow).join('')
    : '<tr><td colspan="18">暂无可导出数据</td></tr>';

  const page = document.querySelector('.sorting-independent-export-page');
  const zoomValue = document.querySelector('[data-action="zoom-reset"]');
  const zoomSteps = [0.75, 0.8, 0.85, 0.9, 1, 1.1, 1.2];
  let zoom = 0.9;
  const applyZoom = (value) => {
    zoom = Math.min(1.2, Math.max(0.75, value));
    page?.style.setProperty('--sorting-independent-export-zoom', String(zoom));
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
