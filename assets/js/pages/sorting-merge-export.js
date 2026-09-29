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

  function currentDate() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  function getItems() {
    const allItems = window.DemoStore?.get('sortingItems') || [];
    const params = new URLSearchParams(window.location.search);
    const expectedAt = params.get('expectedAt') || '';
    const warehouse = params.get('warehouse') || '';
    const status = params.get('status') || '';
    const filtered = allItems.filter((item) => {
      if (expectedAt && String(item.expectedAt || '').slice(0, 10) !== expectedAt) return false;
      if (warehouse && warehouse !== '全部' && String(item.warehouse || item.warehouseName || '') !== warehouse) return false;
      if (status && status !== '全部' && !status.split(',').includes(String(item.status || ''))) return false;
      return true;
    });
    return filtered.length ? filtered : allItems;
  }

  function groupItems(items) {
    const groups = new Map();
    items.forEach((item) => {
      const key = String(item.goodsCode || item.goodsName || item.id || '');
      if (!groups.has(key)) groups.set(key, { first: item, items: [] });
      groups.get(key).items.push(item);
    });
    return [...groups.values()];
  }

  function renderGroup(group, index) {
    const first = group.first;
    const items = group.items;
    const rowspan = items.length;
    const total = items.reduce((sum, item) => sum + Number(item.orderQty || 0), 0);
    const stock = first.stock ?? first.currentStock ?? '--';
    const groupCells = `<td rowspan="${rowspan}">${index + 1}</td>
      <td rowspan="${rowspan}">${escapeHtml(first.goodsName || '--')}</td>
      <td rowspan="${rowspan}">${escapeHtml(first.unit || '--')}</td>
      <td rowspan="${rowspan}">${items.length}</td>`;
    return items.map((item, itemIndex) => `<tr>
      ${itemIndex === 0 ? groupCells : ''}
      <td>${escapeHtml(item.customerName || '--')}</td>
      <td>${escapeHtml(item.canteen || '--')}</td>
      <td>${escapeHtml(item.remark || '')}</td>
      <td>${formatNumber(item.orderQty)}</td>
      ${itemIndex === 0 ? `<td rowspan="${rowspan}">${formatNumber(total)}</td><td rowspan="${rowspan}">${escapeHtml(stock)}</td>` : ''}
    </tr>`).join('');
  }

  const params = new URLSearchParams(window.location.search);
  const items = getItems();
  const groups = groupItems(items);
  const warehouse = params.get('warehouse') || items[0]?.warehouse || items[0]?.warehouseName || '赣县中心仓';
  const expectedAt = params.get('expectedAt') || items[0]?.expectedAt?.slice(0, 10) || currentDate();

  document.getElementById('mergeExportWarehouse').textContent = `仓库：${warehouse === '中心仓' ? '赣县中心仓' : warehouse}`;
  document.getElementById('mergeExportDate').textContent = `期望送达时间：${expectedAt}`;
  document.getElementById('mergeExportBody').innerHTML = groups.length
    ? groups.map(renderGroup).join('')
    : '<tr><td colspan="10" style="text-align:center">暂无可归并数据</td></tr>';

  const page = document.querySelector('.sorting-merge-export-page');
  const zoomValue = document.querySelector('[data-action="zoom-reset"]');
  const zoomSteps = [0.75, 0.8, 0.85, 0.9, 1, 1.1, 1.2];
  let zoom = 0.9;
  const applyZoom = (value) => {
    zoom = Math.min(1.2, Math.max(0.75, value));
    page?.style.setProperty('--sorting-merge-export-zoom', String(zoom));
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
