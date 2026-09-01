(function () {
  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const content = `
    <section class="page-card operations-page order-module-page customer-page" aria-label="客户档案">
      <div class="operations-filter filter-section">
        <div class="operations-filter-main">
          <div class="operations-filter-grid">
            <div class="operations-field"><label class="filter-label" for="customerNameFilter">客户名称</label><input class="filter-input" id="customerNameFilter" placeholder="请输入客户名称"></div>
            <div class="operations-field"><label class="filter-label" for="customerTypeFilter">客户类型</label><select class="filter-select" id="customerTypeFilter"><option value="">全部</option><option>学校</option><option>幼儿园</option><option>机关单位</option></select></div>
            <div class="operations-field"><label class="filter-label" for="customerStatusFilter">状态</label><select class="filter-select" id="customerStatusFilter"><option value="">全部</option><option value="ENABLE">启用</option><option value="DISABLE">停用</option></select></div>
          </div>
          <div class="operations-filter-actions"><button class="btn btn-primary btn-sm" data-action="query">查询</button><button class="btn btn-sm" data-action="reset">重置</button></div>
        </div>
      </div>
      <div class="operations-toolbar"><div class="operations-toolbar-main"><button class="btn btn-primary btn-sm" data-action="add">新增客户</button></div></div>
      <div class="operations-table-container">
        <div class="operations-table-wrap"><table class="operations-table"><thead><tr><th>客户编码</th><th>客户名称</th><th>客户类型</th><th>食堂数量</th><th>状态</th><th>操作</th></tr></thead><tbody id="customerBody"></tbody></table></div>
        <div class="pagination" id="customerPagination"></div>
      </div>
    </section>
    <div id="customerOverlay"></div>`;

  const root = window.AppShell.mount({ title: '客户档案', content });
  const state = { customers: [], filter: {}, page: 1, pageSize: 20, pagination: null };
  const body = root.querySelector('#customerBody');
  const overlay = root.querySelector('#customerOverlay');

  function statusHtml(status) {
    return `<span class="operation-status ${status === 'ENABLE' ? 'success' : 'danger'}">${status === 'ENABLE' ? '启用' : '停用'}</span>`;
  }

  function renderRows() {
    const pageState = state.pagination?.getState() || { page: state.page, pageSize: state.pageSize };
    state.page = pageState.page;
    state.pageSize = pageState.pageSize;
    const start = (state.page - 1) * state.pageSize;
    const visibleCustomers = state.customers.slice(start, start + state.pageSize);
    body.innerHTML = visibleCustomers.length ? visibleCustomers.map((customer) => `
      <tr data-id="${escapeHtml(customer.id)}">
        <td>${escapeHtml(customer.customerCode)}</td>
        <td>${escapeHtml(customer.customerName)}</td>
        <td>${escapeHtml(customer.type)}</td>
        <td>${customer.locations.length}</td>
        <td>${statusHtml(customer.status)}</td>
        <td><button class="btn-text" data-row-action="edit">编辑</button></td>
      </tr>`).join('') : '<tr><td class="empty-cell" colspan="6">暂无数据</td></tr>';
  }

  function load() {
    state.customers = window.MasterDataService.listCustomers(state.filter).map((customer) => ({
      ...customer,
      locations: window.MasterDataService.getLocations(customer.id)
    }));
    state.page = 1;
    state.pagination?.update({ page: 1, total: state.customers.length });
    renderRows();
  }

  function closeForm() { overlay.innerHTML = ''; }

  function openForm(customer = {}) {
    overlay.innerHTML = `<div class="operations-modal-backdrop"><section class="operations-modal is-confirm" role="dialog" aria-label="${customer.id ? '编辑客户' : '新增客户'}">
      <header class="operations-modal-header"><h3>${customer.id ? '编辑客户' : '新增客户'}</h3><button type="button" data-action="close">×</button></header>
      <div class="operations-modal-body"><div class="operations-form-grid">
        <label class="dialog-field">客户名称<input class="filter-input" id="customerFormName" value="${escapeHtml(customer.customerName || '')}" placeholder="请输入客户名称"></label>
        <label class="dialog-field">客户类型<select class="filter-select" id="customerFormType"><option ${customer.type === '学校' ? 'selected' : ''}>学校</option><option ${customer.type === '幼儿园' ? 'selected' : ''}>幼儿园</option><option ${customer.type === '机关单位' ? 'selected' : ''}>机关单位</option></select></label>
        <label class="dialog-field">状态<select class="filter-select" id="customerFormStatus"><option value="ENABLE" ${customer.status !== 'DISABLE' ? 'selected' : ''}>启用</option><option value="DISABLE" ${customer.status === 'DISABLE' ? 'selected' : ''}>停用</option></select></label>
      </div><div class="field-error" id="customerFormError"></div></div>
      <footer class="operations-modal-footer"><button class="btn" data-action="close">取消</button><button class="btn btn-primary" data-action="save">保存</button></footer>
    </section></div>`;
    overlay.dataset.id = customer.id || '';
  }

  state.pagination = window.Pagination?.create({
    container: root.querySelector('#customerPagination'),
    page: state.page,
    pageSize: state.pageSize,
    total: 0,
    pageSizeOptions: [10, 20, 50],
    onChange: ({ page, pageSize }) => {
      state.page = page;
      state.pageSize = pageSize;
      renderRows();
    }
  }) || null;

  root.addEventListener('click', (event) => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'query') {
      state.filter = { customerName: root.querySelector('#customerNameFilter').value.trim(), type: root.querySelector('#customerTypeFilter').value, status: root.querySelector('#customerStatusFilter').value };
      return load();
    }
    if (action === 'reset') {
      root.querySelectorAll('.operations-filter input,.operations-filter select').forEach((element) => { element.value = ''; });
      state.filter = {};
      return load();
    }
    if (action === 'add') return openForm();
    if (action === 'close') return closeForm();
    if (action === 'save') {
      const name = overlay.querySelector('#customerFormName')?.value.trim();
      if (!name) { overlay.querySelector('#customerFormError').textContent = '请输入客户名称'; return; }
      const data = { customerName: name, name, type: overlay.querySelector('#customerFormType').value, status: overlay.querySelector('#customerFormStatus').value };
      if (overlay.dataset.id) window.MasterDataService.updateCustomer(overlay.dataset.id, data);
      else window.MasterDataService.createCustomer(data);
      closeForm();
      return load();
    }
    const rowAction = event.target.closest('[data-row-action]')?.dataset.rowAction;
    if (rowAction === 'edit') {
      const id = event.target.closest('tr')?.dataset.id;
      return openForm(window.MasterDataService.getCustomer(id));
    }
  });

  load();
})();
