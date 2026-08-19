(function () {
  const service = window.OperationsService;
  const params = new URLSearchParams(window.location.search);
  const customerName = params.get('customer') || '';
  const canteen = params.get('canteen') || '';
  const expectedDate = params.get('date') || '';
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
        <div class="sorting-customer-info-item"><span>期望发货时间</span><strong id="detailDate"></strong></div>
        <div class="sorting-customer-info-item"><span>客户名称</span><strong id="detailCustomer"></strong></div>
        <div class="sorting-customer-info-item"><span>食堂</span><strong id="detailCanteen"></strong></div>
        <div class="sorting-customer-info-item"><span>线路</span><strong id="detailRoute">--</strong></div>
      </div>
      <div class="operations-filter filter-section">
        <div class="operations-filter-grid sorting-customer-filter-grid">
          <div class="operations-field"><label class="filter-label" for="goodsNameFilter">商品名称</label><input class="filter-input" id="goodsNameFilter" placeholder="请输入"></div>
          <div class="operations-field"><label class="filter-label" for="shippedFilter">是否发货</label><select class="filter-select" id="shippedFilter"><option value="">全部</option><option value="是">是</option><option value="否">否</option></select></div>
        </div>
        <div class="operations-filter-actions"><button class="btn btn-primary btn-sm btn-fixed" type="button" data-action="query">查询</button><button class="btn btn-sm btn-fixed" type="button" data-action="reset">重置</button></div>
      </div>
      <div class="operations-toolbar">
        <div class="operations-toolbar-main"><button class="btn btn-primary btn-sm" type="button" data-action="batch-sort">一键分拣</button><button class="btn btn-sm" type="button" data-action="batch-shortage">批量标记缺货</button></div>
      </div>
      <div class="operations-table-container sorting-customer-table-container">
        <div class="operations-table-wrap"><table class="operations-table sorting-customer-table">
          <thead><tr><th><input id="detailSelectAll" type="checkbox" aria-label="选择全部"></th><th>序号</th><th>商品名称（计量单位/品牌/规格）</th><th>客户名称</th><th>食堂</th><th>下单数量</th><th>实际数量</th><th>是否发货</th><th>计量单位</th><th>分拣进度</th><th>备注</th><th>库存</th><th>分拣状态</th><th>分拣员</th><th>分拣时间</th><th>线路</th><th>操作</th></tr></thead>
          <tbody id="detailBody"></tbody>
        </table></div>
        <div class="operations-pagination"><span id="detailTotal">共 0 条数据</span></div>
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
  const isSorted = (item) => item.status === 'SORTED' || Number(item.actualQty || 0) >= Number(item.orderQty || 0);
  const statusText = (item) => isSorted(item) ? '已分拣' : '未分拣';
  const statusClass = (item) => isSorted(item) ? 'success' : 'danger';
  const renderGoodsName = (item) => `${item.isNetVegetable ? '<span class="net-vegetable-tag">净菜</span>' : ''}${escapeHtml(item.goodsName || '--')}`;

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
  }

  function render() {
    const body = root.querySelector('#detailBody');
    body.innerHTML = filteredItems.length ? filteredItems.map((item, index) => {
      const shortage = item.shortage === '是';
      const sorted = isSorted(item);
      const actionHtml = sorted
        ? '<button class="btn-text" data-row-action="resetSort">重置</button>'
        : `<button class="btn-text" data-row-action="sort">分拣</button><span class="divider">|</span><button class="btn-text" data-row-action="markShortage">${shortage ? '取消缺货' : '标记缺货'}</button>`;
      const progress = `${item.actualQty ?? 0}/${item.orderQty ?? 0}`;
      return `<tr data-id="${escapeHtml(item.id)}">
        <td><input class="detail-row-select" type="checkbox" ${selected.has(item.id) ? 'checked' : ''} aria-label="选择数据"></td>
        <td>${index + 1}</td><td>${renderGoodsName(item)}</td><td>${escapeHtml(item.customerName)}</td><td>${escapeHtml(item.canteen)}</td>
        <td>${escapeHtml(item.orderQty)}</td><td><input class="quantity-input detail-actual-qty" type="number" min="0" value="${item.actualQty ? escapeHtml(item.actualQty) : ''}" placeholder="请输入" aria-label="实际数量"></td>
        <td>${escapeHtml(item.shipped || '否')}</td><td>${escapeHtml(item.unit)}</td><td>${escapeHtml(progress)}</td><td>${escapeHtml(item.remark || '--')}</td><td>${escapeHtml(item.stock)}</td>
        <td><span class="operation-status ${statusClass(item)}">${statusText(item)}</span></td><td>${escapeHtml(item.sorter || '--')}</td><td>${escapeHtml(item.sortingAt || '--')}</td><td>${escapeHtml(item.route || '--')}</td>
        <td><div class="cell-actions">${actionHtml}</div></td>
      </tr>`;
    }).join('') : '<tr><td class="empty-cell" colspan="17">暂无数据</td></tr>';
    root.querySelector('#detailTotal').textContent = `共 ${filteredItems.length} 条数据`;
    updateSelection();
  }

  async function load() {
    const condition = { customerName, canteen };
    if (expectedDate) condition.expectedAt = expectedDate;
    const result = await service.list('sortingItems', { page: 1, pageSize: 1000, condition });
    items = result.items;
    root.querySelector('#detailRoute').textContent = items[0]?.route || '--';
    applyFilters();
  }

  function applyFilters() {
    const keyword = root.querySelector('#goodsNameFilter').value.trim().toLowerCase();
    const shipped = root.querySelector('#shippedFilter').value;
    filteredItems = items.filter((item) => (!keyword || String(item.goodsName || '').toLowerCase().includes(keyword)) && (!shipped || item.shipped === shipped));
    selected.clear();
    render();
  }

  function confirmAction(title, message, callback) {
    const overlay = root.querySelector('#detailOverlay');
    overlay.innerHTML = `<div class="operations-modal-backdrop"><section class="operations-modal is-confirm" role="dialog" aria-modal="true"><header class="operations-modal-header"><h3>${escapeHtml(title)}</h3><button data-close>×</button></header><div class="operations-modal-body"><p>${escapeHtml(message)}</p></div><footer class="operations-modal-footer"><button class="btn" data-close>取消</button><button class="btn btn-primary" data-confirm>确定</button></footer></section></div>`;
    overlay.querySelectorAll('[data-close]').forEach((button) => { button.onclick = () => { overlay.innerHTML = ''; }; });
    overlay.querySelector('[data-confirm]').onclick = async () => {
      try { await callback(); overlay.innerHTML = ''; toast('操作成功'); await load(); }
      catch (error) { toast(error.message || '操作失败', 'error'); }
    };
  }

  async function transition(id, action) {
    if (action === 'markShortage') {
      const item = await service.get('sortingItems', id);
      if (!item || isSorted(item)) throw new Error('只有未分拣商品可以标记缺货');
      return service.update('sortingItems', id, { shortage: item.shortage === '是' ? '否' : '是' });
    }
    return service.transition('sortingItems', id, action);
  }

  root.addEventListener('click', (event) => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'back') { window.AppNavigation?.navigate?.('./sorting-management.html'); return; }
    if (action === 'query') { applyFilters(); return; }
    if (action === 'reset') { root.querySelector('#goodsNameFilter').value = ''; root.querySelector('#shippedFilter').value = ''; applyFilters(); return; }
    if (action === 'batch-sort' || action === 'batch-shortage') {
      const ids = [...selected];
      if (!ids.length) { toast('请选择要操作的数据', 'error'); return; }
      const transitionAction = action === 'batch-sort' ? 'sort' : 'markShortage';
      confirmAction('批量操作', '确定对选中商品执行该操作吗？', async () => {
        for (const id of ids) {
          const item = items.find((entry) => entry.id === id);
          if (transitionAction === 'markShortage' && (!item || isSorted(item))) continue;
          await transition(id, transitionAction);
        }
      });
      return;
    }
    const rowButton = event.target.closest('[data-row-action]');
    if (rowButton) {
      const id = rowButton.closest('tr').dataset.id;
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
      service.update('sortingItems', id, { actualQty: value, status: value >= Number(items.find((item) => item.id === id)?.orderQty || 0) ? 'SORTED' : 'PENDING' }).then(() => { toast('实际数量已保存'); load(); }).catch((error) => toast(error.message, 'error'));
    }
  });

  load().catch((error) => toast(error.message || '数据加载失败', 'error'));
})();
