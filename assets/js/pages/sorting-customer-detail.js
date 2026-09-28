(function () {
  const customerService = window.SortingCustomerService;
  const params = new URLSearchParams(window.location.search);
  const customerName = params.get('customer') || '';
  const canteen = params.get('canteen') || '';
  const expectedDate = params.get('date') || '';
  const groupId = params.get('group') || '';
  const orderMealNames = window.OrderMealNames || ['早餐', '午餐', '晚餐', '早点', '午点', '晚点'];
  const orderMealOptions = orderMealNames.map((name) => `<option value="${name}">${name}</option>`).join('');
  const selected = new Set();
  let items = [];
  let filteredItems = [];

  const backIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/><path d="M19 12H9"/></svg>';
  const content = `
    <section class="page-card sorting-customer-detail-page operations-page">
      <div class="processing-detail-page-header sorting-customer-detail-header">
        <button class="back-link" type="button" data-action="back">${backIcon}<span>返回</span></button>
        <h1>客户分拣</h1>
      </div>
      <div class="sorting-customer-info" aria-label="客户信息">
        <div class="sorting-customer-info-item"><span>期望送达日期：</span><strong id="detailDate"></strong></div>
        <div class="sorting-customer-info-item"><span>客户名称</span><strong id="detailCustomer"></strong></div>
        <div class="sorting-customer-info-item"><span>食堂</span><strong id="detailCanteen"></strong></div>
        <div class="sorting-customer-info-item"><span>线路</span><strong id="detailRoute">--</strong></div>
      </div>
      <div class="operations-filter filter-section">
        <div class="operations-filter-grid sorting-customer-filter-grid">
          <div class="operations-field"><label class="filter-label" for="goodsNameFilter">商品名称</label><input class="filter-input" id="goodsNameFilter" placeholder="请输入"></div>
          <div class="operations-field"><label class="filter-label" for="shippedFilter">是否发货</label><select class="filter-select" id="shippedFilter"><option value="">全部</option><option value="是">是</option><option value="否">否</option></select></div>
          <div class="operations-field"><label class="filter-label" for="mealNameFilter">订单餐次</label><select class="filter-select is-placeholder" id="mealNameFilter" data-placeholder-only><option value="" disabled selected hidden>请选择</option>${orderMealOptions}</select></div>
        </div>
        <div class="operations-filter-actions"><button class="btn btn-primary btn-sm btn-fixed" type="button" data-action="query">查询</button><button class="btn btn-sm btn-fixed" type="button" data-action="reset">重置</button></div>
      </div>
      <div class="operations-toolbar">
        <div class="operations-toolbar-main">
          <div class="toolbar-dropdown"><button class="btn btn-primary btn-sm sorting-dropdown-trigger" type="button" data-action="sort-options" aria-expanded="false" aria-controls="sortingBatchOptions" disabled><span>一键分拣</span><span class="sorting-dropdown-arrow" aria-hidden="true">▾</span></button>
            <div class="toolbar-dropdown-menu" id="sortingBatchOptions"><button type="button" data-action="batch-sort" disabled>一键分拣</button><button type="button" data-action="batch-reset" disabled>重置分拣</button></div>
          </div>
          <button class="btn btn-primary btn-sm" type="button" data-action="batch-print" disabled>一键打印</button>
          <button class="btn btn-primary btn-sm" type="button" data-action="batch-shortage" disabled>批量标记缺货</button>
        </div>
        <div class="operations-toolbar-side"><button class="btn-text" type="button" data-action="fullscreen" aria-pressed="false">全屏模式</button></div>
      </div>
      <div class="operations-table-container sorting-customer-table-container">
        <div class="operations-table-wrap"><table class="operations-table sorting-customer-table">
          <colgroup>${[44, 56, 260, 160, 160, 100, 150, 100, 130, 110, 110, 100, 120, 130, 110, 110, 100, 130, 120, 120, 180].map((width) => `<col style="width:${width}px">`).join('')}</colgroup>
          <thead><tr><th><input id="detailSelectAll" type="checkbox" aria-label="选择全部"></th><th>序号</th><th>商品名称（计量单位/品牌/规格）</th><th>所属订单号</th><th>客户名称</th><th>食堂</th><th>下单数量</th><th title="填写实际分拣数量后保存；已分拣商品可先重置再调整">实际数量</th><th>计量单位</th><th>分包规格</th><th>分包数量</th><th>分包尾数</th><th>是否发货</th><th>分拣进度</th><th>备注</th><th>库存</th><th>分拣状态</th><th>分拣员</th><th>分拣时间</th><th>线路</th><th>操作</th></tr></thead>
          <tbody id="detailBody"></tbody>
        </table></div>
        <div class="pagination"><span class="page-total" id="detailTotal">共 0 条数据</span></div>
      </div>
      <div id="detailOverlay"></div>
    </section>`;

  const root = window.AppShell.mount({ title: '客户分拣', content });
  root.querySelector('#detailCustomer').textContent = customerName || '--';
  root.querySelector('#detailCanteen').textContent = canteen || '--';
  root.querySelector('#detailDate').textContent = expectedDate || '--';

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  const isSorted = customerService.isSorted;
  const statusText = (item) => isSorted(item) ? '已分拣' : customerService.statusText[item.status] || '未分拣';
  const statusClass = (item) => isSorted(item) ? 'success' : item.status === 'PARTIAL' ? 'warning' : 'danger';
  const resolveMealName = (value) => window.OrderMealNameByKey?.[value] || value || '';
  const itemMealName = (item) => {
    const ownMeal = resolveMealName(item.mealName || item.mealKey);
    if (ownMeal) return ownMeal;
    const order = (window.DemoStore?.get('orders') || []).find((entry) => (
      (item.orderId && entry.id === item.orderId) || (item.orderNo && entry.orderNo === item.orderNo)
    ));
    return resolveMealName(order?.mealName || order?.mealKey);
  };
  const renderGoodsName = (item) => {
    const display = window.DomUtils?.formatProductDisplay?.(item) || item.goodsName || '--';
    const marker = item.isNetVegetable ? '<span class="net-vegetable-tag">净菜</span>' : '';
    return `<span class="product-display-text">${marker}${escapeHtml(display)}</span>`;
  };
  const defaultPackageSpecs = [
    { productCode: 'SP0300025', packageQty: 5, packageUnit: '包', status: 'ENABLE' },
    { productCode: 'SP0300019', packageQty: 10, packageUnit: '袋', status: 'ENABLE' },
    { productCode: 'SP0300034', packageQty: 25, packageUnit: '袋', status: 'ENABLE' },
    { productCode: 'SP0300020', packageQty: 10, packageUnit: '箱', status: 'ENABLE' },
    { productCode: 'SP0300015', packageQty: 10, packageUnit: '筐', status: 'ENABLE' },
    { productCode: 'SP0300037', packageQty: 10, packageUnit: '箱', status: 'ENABLE' },
    { productCode: 'SP0300014', packageQty: 10, packageUnit: '筐', status: 'ENABLE' },
    { productCode: 'SP0300040', packageQty: 10, packageUnit: '袋', status: 'ENABLE' },
    { productCode: 'SP0300029', packageQty: 5, packageUnit: '箱', status: 'ENABLE' }
  ];
  const packageSpecFor = (item) => {
    const saved = window.AppStorage?.read('procurement-sorting-package-specs-v2', null);
    const specs = Array.isArray(saved) && saved.length ? saved : defaultPackageSpecs;
    const productCode = item.goodsCode || item.productId || item.productCode;
    return specs.find((spec) => String(spec.productCode) === String(productCode) && spec.status !== 'DISABLE') || null;
  };
  const packageCountOf = (item, spec) => {
    const actual = Number(item.actualQty || 0);
    const packageQty = Number(spec?.packageQty || 0);
    if (!actual || !packageQty) return null;
    return Math.floor(actual / packageQty);
  };
  const renderPackageSpec = (item) => {
    const spec = packageSpecFor(item);
    return spec ? escapeHtml(`${spec.packageQty}${item.unit || spec.baseUnit || ''}/${spec.packageUnit}`) : '--';
  };
  const renderPackageCount = (item) => {
    const count = packageCountOf(item, packageSpecFor(item));
    return count === null ? '--' : String(count);
  };
  const renderPackageRemainder = (item) => {
    const spec = packageSpecFor(item);
    const count = packageCountOf(item, spec);
    if (!spec || count === null) return '--';
    const remainder = Number((Number(item.actualQty || 0) - count * Number(spec.packageQty)).toFixed(2));
    return remainder > 0 ? `${remainder}${escapeHtml(item.unit || '')}` : '';
  };

  function toast(message, type = '') {
    root.querySelector('.operations-toast')?.remove();
    const element = document.createElement('div');
    element.className = `operations-toast ${type}`;
    element.textContent = message;
    root.appendChild(element);
    window.setTimeout(() => element.remove(), 2200);
  }

  function updateSelection() {
    const selectAll = root.querySelector('#detailSelectAll');
    selectAll.checked = filteredItems.length > 0 && filteredItems.every((item) => selected.has(item.id));
    selectAll.indeterminate = !selectAll.checked && filteredItems.some((item) => selected.has(item.id));
    const chosen = filteredItems.filter((item) => selected.has(item.id));
    const canSort = chosen.some((item) => customerService.canMutate(item, 'sort'));
    const canReset = chosen.some((item) => customerService.canMutate(item, 'resetSort'));
    root.querySelector('[data-action="sort-options"]').disabled = !canSort && !canReset;
    root.querySelector('[data-action="batch-sort"]').disabled = !canSort;
    root.querySelector('[data-action="batch-shortage"]').disabled = !chosen.some((item) => customerService.canMutate(item, 'markShortage'));
    root.querySelector('[data-action="batch-reset"]').disabled = !canReset;
    root.querySelector('[data-action="batch-print"]').disabled = !chosen.length;
  }

  function render() {
    const body = root.querySelector('#detailBody');
    body.innerHTML = filteredItems.length ? filteredItems.map((item, index) => {
      const shortage = item.shortage === '是';
      const sorted = isSorted(item);
      const rowButton = (action, label) => `<button type="button" class="btn-text" data-row-action="${action}" ${customerService.canMutate(item, action) ? '' : 'disabled'}>${label}</button>`;
      const actionHtml = sorted
        ? `<button class="btn-text" type="button" data-row-action="print">打印</button>${rowButton('resetSort', '重置')}`
        : `${rowButton('sort', '分拣')}${rowButton(shortage ? 'cancelShortage' : 'markShortage', shortage ? '取消缺货' : '标记缺货')}`;
      const progress = `${item.actualQty ?? 0}${item.unit || ''} / ${item.orderQty ?? 0}${item.unit || ''}`;
      const quantity = sorted || !customerService.canMutate(item, 'sort')
        ? Number(item.actualQty || 0).toFixed(2)
        : `<input class="quantity-input detail-actual-qty" type="number" min="0" step="any" value="${item.actualQty ? escapeHtml(item.actualQty) : ''}" placeholder="请输入" aria-label="${escapeHtml(item.goodsName)}实际数量">`;
      const orderHref = `./order-detail.html?id=${encodeURIComponent(item.orderId || '')}&orderNo=${encodeURIComponent(item.orderNo || '')}`;
      return `<tr data-id="${escapeHtml(item.id)}">
        <td><input class="detail-row-select" type="checkbox" ${selected.has(item.id) ? 'checked' : ''} aria-label="选择数据"></td>
        <td>${index + 1}</td><td>${renderGoodsName(item)}</td><td><button class="cell-link" type="button" data-cell-href="${escapeHtml(orderHref)}">${escapeHtml(item.orderNo || '--')}</button></td><td>${escapeHtml(item.customerName)}</td><td>${escapeHtml(item.canteen)}</td>
        <td>${escapeHtml(item.orderQty)}</td><td>${quantity}</td><td>${escapeHtml(item.unit)}</td><td>${renderPackageSpec(item)}</td><td>${renderPackageCount(item)}</td><td>${renderPackageRemainder(item)}</td>
        <td>${escapeHtml(item.shipped || '否')}</td><td>${escapeHtml(progress)}</td><td class="sorting-remark" title="${escapeHtml(item.remark || '--')}">${escapeHtml(item.remark || '--')}</td><td>${escapeHtml(item.stock)}</td>
        <td><span class="operation-status ${statusClass(item)}">${statusText(item)}</span>${shortage ? '<span class="operation-status danger">缺货</span>' : ''}</td><td>${escapeHtml(item.sorter || '--')}</td><td>${escapeHtml(item.sortingAt || '--')}</td><td>${escapeHtml(item.route || '--')}</td>
        <td><div class="cell-actions operation-actions">${actionHtml}</div></td>
      </tr>`;
    }).join('') : '<tr><td class="empty-cell" colspan="21">暂无数据</td></tr>';
    root.querySelector('#detailTotal').textContent = `共 ${filteredItems.length} 条数据`;
    updateSelection();
  }

  async function load() {
    const groups = await customerService.getGroups();
    const matchingGroups = groups.filter((group) => groupId ? group.id === groupId : (
      customerName && group.customerName === customerName && (!canteen || group.canteen === canteen) && (!expectedDate || group.expectedAt === expectedDate)
    ));
    items = matchingGroups.flatMap((group) => group.items);
    root.querySelector('#detailDate').textContent = expectedDate || [...new Set(matchingGroups.map((group) => group.expectedAt))].join('、') || '--';
    root.querySelector('#detailRoute').textContent = [...new Set(items.map((item) => item.route).filter(Boolean))].join('、') || '--';
    applyFilters();
  }

  function applyFilters() {
    const keyword = root.querySelector('#goodsNameFilter').value.trim().toLowerCase();
    const mealName = root.querySelector('#mealNameFilter').value;
    const shipped = root.querySelector('#shippedFilter').value;
    filteredItems = items.filter((item) => (
      (!keyword || String(item.goodsName || '').toLowerCase().includes(keyword))
      && (!mealName || itemMealName(item) === mealName)
      && (!shipped || item.shipped === shipped)
    ));
    selected.clear();
    render();
  }

  function confirmAction(title, message, callback) {
    const overlay = root.querySelector('#detailOverlay');
    overlay.innerHTML = `<div class="operations-modal-backdrop"><section class="operations-modal is-confirm" role="dialog" aria-modal="true"><header class="operations-modal-header"><h3>${escapeHtml(title)}</h3><button data-close>×</button></header><div class="operations-modal-body"><p>${escapeHtml(message)}</p></div><footer class="operations-modal-footer"><button class="btn" data-close>取消</button><button class="btn btn-primary" data-confirm>确定</button></footer></section></div>`;
    overlay.querySelectorAll('[data-close]').forEach((button) => { button.onclick = () => { overlay.innerHTML = ''; }; });
    overlay.querySelector('[data-confirm]').onclick = async () => {
      const button = overlay.querySelector('[data-confirm]');
      button.disabled = true;
      try { await callback(); overlay.innerHTML = ''; await load(); toast('操作成功'); }
      catch (error) { overlay.innerHTML = ''; await load(); toast(error.message || '操作失败', 'error'); }
    };
  }

  async function transition(id, action) {
    return customerService.runItems([id], action);
  }

  root.addEventListener('click', (event) => {
    const cellLink = event.target.closest('[data-cell-href]');
    if (cellLink) {
      window.AppNavigation?.navigate?.(cellLink.dataset.cellHref);
      return;
    }
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'back') { window.AppNavigation?.navigate?.('./sorting-management.html#customer'); return; }
    if (action === 'query') { applyFilters(); return; }
    if (action === 'reset') { root.querySelector('#goodsNameFilter').value = ''; root.querySelector('#mealNameFilter').value = ''; root.querySelector('#mealNameFilter').classList.add('is-placeholder'); root.querySelector('#shippedFilter').value = ''; applyFilters(); return; }
    if (action === 'fullscreen') { toggleFullscreen(); return; }
    if (action === 'sort-options') {
      const expanded = root.querySelector('.toolbar-dropdown').classList.toggle('is-open');
      root.querySelector('[data-action="sort-options"]').setAttribute('aria-expanded', String(expanded));
      return;
    }
    root.querySelector('.toolbar-dropdown').classList.remove('is-open');
    root.querySelector('[data-action="sort-options"]').setAttribute('aria-expanded', 'false');
    if (action === 'batch-print') { customerService.showPrint(filteredItems.filter((item) => selected.has(item.id))); return; }
    if (action === 'batch-sort' || action === 'batch-shortage' || action === 'batch-reset') {
      const ids = [...selected];
      if (!ids.length) { toast('请选择要操作的数据', 'error'); return; }
      const transitionAction = { 'batch-sort': 'sort', 'batch-shortage': 'markShortage', 'batch-reset': 'resetSort' }[action];
      confirmAction('批量操作', '确定处理选中商品吗？当前状态不可操作的商品将跳过。', () => customerService.runItems(ids, transitionAction));
      return;
    }
    const rowButton = event.target.closest('[data-row-action]');
    if (rowButton) {
      const id = rowButton.closest('tr').dataset.id;
      if (rowButton.dataset.rowAction === 'print') { customerService.showPrint(items.filter((item) => item.id === id)); return; }
      confirmAction(rowButton.textContent.trim(), '确定执行该操作吗？', () => transition(id, rowButton.dataset.rowAction));
    }
  });

  root.addEventListener('change', (event) => {
    if (event.target.id === 'detailSelectAll') {
      filteredItems.forEach((item) => event.target.checked ? selected.add(item.id) : selected.delete(item.id));
      render();
    } else if (event.target.classList.contains('detail-row-select')) {
      const id = event.target.closest('tr').dataset.id;
      event.target.checked ? selected.add(id) : selected.delete(id);
      updateSelection();
    } else if (event.target.classList.contains('detail-actual-qty')) {
      const id = event.target.closest('tr').dataset.id;
      const value = Number(event.target.value);
      if (!Number.isFinite(value) || value < 0) { toast('实际数量不能小于 0', 'error'); return; }
      if (event.target.value === '') return;
      event.target.disabled = true;
      customerService.runItems([id], 'sort', { actualQty: value })
        .then(async () => { await load(); toast('实际数量已保存'); })
        .catch(async (error) => { await load(); toast(error.message, 'error'); });
    }
  });

  function toggleFullscreen(force) {
    const page = root.querySelector('.sorting-customer-detail-page');
    const expanded = typeof force === 'boolean' ? force : !page.classList.contains('is-fullscreen');
    page.classList.toggle('is-fullscreen', expanded);
    const button = root.querySelector('[data-action="fullscreen"]');
    button.textContent = expanded ? '退出全屏' : '全屏模式';
    button.setAttribute('aria-pressed', String(expanded));
  }
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && event.target.closest('.operations-filter')) applyFilters();
    if (event.key === 'Escape') {
      const dropdown = root.querySelector('.toolbar-dropdown');
      const trigger = root.querySelector('[data-action="sort-options"]');
      if (dropdown.classList.contains('is-open')) trigger.focus();
      dropdown.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');
      root.querySelector('#detailOverlay').innerHTML = '';
      toggleFullscreen(false);
    }
  });

  load().catch((error) => toast(error.message || '数据加载失败', 'error'));
})();
