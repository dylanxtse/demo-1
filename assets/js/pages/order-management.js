(function () {
  const service = window.OperationsService;
  const statusMap = {
    PENDING: ['待审核', 'warning'],
    PENDING_CONFIRM: ['待确认', 'warning'],
    PENDING_AUDIT: ['待审核', 'warning'],
    READY_FOR_SORTING: ['待分拣', 'info'],
    READY_FOR_SHIPPING: ['待发货', 'warning'],
    APPROVED: ['已审核', 'info'],
    CONFIRMED: ['已确认', 'success'],
    SHIPPED: ['已发货', 'success'],
    COMPLETED: ['已完成', 'success'],
    CLOSED: ['已关闭', 'danger']
    ,DRAFT: ['暂存', 'info']
    ,REJECTED: ['已驳回', 'danger']
  };
  const columns = [
    ['orderNo', '订单号'],
    ['customerName', '客户名称'],
    ['canteen', '食堂'],
    ['customerType', '客户类型'],
    ['orderTag', '订单标签'],
    ['orderAmount', '下单金额', 'money'],
    ['shippingAmount', '发货金额', 'money'],
    ['returnAmount', '退货金额', 'money'],
    ['reconciliationAmount', '对账金额', 'money'],
    ['expectedAt', '期望送达时间'],
    ['status', '单据状态', 'status'],
    ['receiptStatus', '收货状态'],
    ['productCount', '商品种类数'],
    ['warehouse', '仓库'],
    ['supplement', '是否补单'],
    ['remark', '备注'],
    ['shippingAt', '发货时间'],
    ['route', '线路'],
    ['driver', '司机'],
    ['acceptedAt', '验收时间'],
    ['source', '单据来源'],
    ['creator', '添加人']
  ];
  const state = {
    page: 1,
    pageSize: 20,
    total: 0,
    items: [],
    pagination: null,
    selected: new Set(),
    condition: {}
  };

  const content = `
    <section class="page-card operations-page order-module-page" aria-label="订单管理">
      <div class="operations-tabs order-view-tabs"><a class="operations-tab active" href="./order-management.html">订单列表</a><a class="operations-tab" href="./order-goods.html">订单商品</a></div>
      <div class="operations-filter filter-section">
        <div class="operations-filter-main">
          <div class="operations-filter-grid">
          <div class="operations-field expected-at-field"><label class="filter-label" for="expectedAt">期望送达时间</label><div class="date-input-control"><input class="filter-input" id="expectedAt" type="text" placeholder="请选择日期" readonly><span class="date-range-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></span></div></div>
          <div class="operations-field"><label class="filter-label" for="customerName">客户名称</label><input class="filter-input" id="customerName" placeholder="请输入"></div>
          <div class="operations-field"><label class="filter-label" for="orderNo">订单号</label><input class="filter-input" id="orderNo" maxlength="40" placeholder="请输入订单号"></div>
          </div>
          <div class="operations-filter-actions">
            <button class="operations-filter-toggle" type="button" data-operations-filter-toggle>高级筛选<span class="toggle-arrow">▾</span></button>
            <button class="btn btn-primary btn-sm" id="queryButton">查询</button>
            <button class="btn btn-sm" id="resetButton">重置</button>
          </div>
        </div>
        <div class="operations-filter-advanced">
          <div class="operations-filter-grid">
          <div class="operations-field"><label class="filter-label" for="customerType">客户类型</label><select class="filter-select" id="customerType"><option value="">全部</option><option>学校</option><option>幼儿园</option><option>机关单位</option></select></div>
          <div class="operations-field"><label class="filter-label" for="orderTag">订单标签</label><select class="filter-select" id="orderTag"><option value="">全部</option><option>营养餐</option><option>普通餐</option><option>应急保供</option></select></div>
          <div class="operations-field"><label class="filter-label" for="status">单据状态</label><select class="filter-select" id="status"><option value="">全部</option><option value="DRAFT">暂存</option><option value="PENDING_CONFIRM">待确认</option><option value="PENDING_AUDIT">待审核</option><option value="READY_FOR_SORTING">待分拣</option><option value="READY_FOR_SHIPPING">待发货</option><option value="REJECTED">已驳回</option><option value="SHIPPED">已发货</option><option value="CLOSED">已关闭</option></select></div>
          <div class="operations-field"><label class="filter-label" for="warehouse">仓库</label><select class="filter-select" id="warehouse"><option value="">全部</option><option>中心仓</option><option>北区仓</option><option>临时仓</option></select></div>
          <div class="operations-field"><label class="filter-label" for="source">单据来源</label><select class="filter-select" id="source"><option value="">全部</option><option>客户下单</option><option>平台添加</option></select></div>
          <div class="operations-field"><label class="filter-label" for="receiptStatus">收货状态</label><select class="filter-select" id="receiptStatus"><option value="">全部</option><option>待收货</option><option>部分收货</option><option>已收货</option><option>未收货</option></select></div>
          <div class="operations-field"><label class="filter-label" for="orderType">订单类型</label><select class="filter-select" id="orderType"><option value="">全部</option><option>销售订单</option><option>临时订单</option></select></div>
          </div>
        </div>
      </div>
      <div class="operations-toolbar">
        <div class="operations-toolbar-main">
          <button class="btn btn-primary btn-sm" id="addButton">添加订单</button>
          <button class="btn btn-sm btn-blue" id="batchConfirmButton">批量确认</button>
        </div>
        <div class="operations-toolbar-side">
          <button class="btn btn-sm" id="exportButton">导出</button>
        </div>
      </div>
      <div class="operations-table-container">
        <div class="operations-table-wrap">
          <table class="operations-table">
            <thead id="tableHead"></thead>
            <tbody id="tableBody"></tbody>
          </table>
        </div>
        <div class="operations-pagination" id="pagination"></div>
      </div>
    </section>
    <div id="operationsOverlay"></div>
  `;

  const root = window.AppShell.mount({ title: '订单管理', content });
  const $ = (selector) => root.querySelector(selector);
  const overlay = $('#operationsOverlay');
  const expectedAtPicker = window.DatePicker?.mount({
    input: '#expectedAt',
    panelId: 'orderExpectedAtPickerPanel'
  });

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function statusHtml(status) {
    const [label, type] = statusMap[status] || [status || '--', ''];
    return `<span class="operation-status ${type}">${escapeHtml(label)}</span>`;
  }

  function money(value) {
    return Number(value || 0).toFixed(2);
  }

  function toast(message, type = '') {
    root.querySelector('.operations-toast')?.remove();
    const element = document.createElement('div');
    element.className = `operations-toast ${type}`;
    element.textContent = message;
    root.appendChild(element);
    window.setTimeout(() => element.remove(), 2200);
  }

  function collectCondition() {
    const condition = {};
    ['orderNo', 'customerName', 'customerType', 'status', 'orderTag', 'warehouse', 'source', 'expectedAt', 'receiptStatus', 'orderType']
      .forEach((key) => {
        const value = $(`#${key}`).value.trim();
        if (value) condition[key] = value;
      });
    return condition;
  }

  function renderHead() {
    $('#tableHead').innerHTML = `<tr>
      <th><input type="checkbox" id="selectAll" aria-label="选择全部"></th>
      <th>序号</th>
      ${columns.map((column) => `<th>${column[1]}</th>`).join('')}
      <th>操作</th>
    </tr>`;
  }

  function visibleActions(item) {
    const actions = [];
    if (item.status === 'PENDING_AUDIT') actions.push({ key: 'approve', label: '审核' });
    if (item.status === 'PENDING_CONFIRM') actions.push({ key: 'confirm', label: '确认供货' });
    if (['DRAFT', 'PENDING', 'PENDING_AUDIT', 'PENDING_CONFIRM', 'REJECTED'].includes(item.status)) actions.push({ key: 'edit', label: '编辑' });
    actions.push({ key: 'copy', label: '复制' });
    if (!['SHIPPED', 'CLOSED'].includes(item.status)) actions.push({ key: 'close', label: '关闭' });
    if (['PENDING_AUDIT', 'PENDING_CONFIRM'].includes(item.status)) actions.push({ key: 'delete', label: '删除', danger: true });
    return actions;
  }

  function renderBody() {
    if (!state.items.length) {
      $('#tableBody').innerHTML = `<tr><td class="empty-cell" colspan="${columns.length + 3}">暂无数据</td></tr>`;
      return;
    }
    $('#tableBody').innerHTML = state.items.map((item, index) => `
      <tr data-id="${escapeHtml(item.id)}">
        <td><input type="checkbox" class="row-select" aria-label="选择订单" ${state.selected.has(item.id) ? 'checked' : ''}></td>
        <td>${(state.page - 1) * state.pageSize + index + 1}</td>
        ${columns.map(([key, , format]) => {
          let value = item[key];
          if (format === 'money') value = money(value);
          if (format === 'status') return `<td>${statusHtml(value)}</td>`;
          if (key === 'orderNo') return `<td><button class="cell-link order-goods-link" data-action="view"><span>${escapeHtml(value)}</span><small>${escapeHtml(item.createdAt || '--')}</small></button></td>`;
          return `<td title="${escapeHtml(value)}">${escapeHtml(value || '--')}</td>`;
        }).join('')}
        <td><div class="cell-actions">${visibleActions(item).map((action, actionIndex) =>
          `${actionIndex ? '<span class="divider">|</span>' : ''}<button class="btn-text ${action.danger ? 'danger' : ''}" data-action="${action.key}">${action.label}</button>`
        ).join('')}</div></td>
      </tr>
    `).join('');
  }

  function renderPagination() {
    state.pagination?.update({ page: state.page, pageSize: state.pageSize, total: state.total });
  }

  function updateSelection() {
    const selectAll = $('#selectAll');
    if (selectAll) {
      selectAll.checked = state.items.length > 0 && state.items.every((item) => state.selected.has(item.id));
      selectAll.indeterminate = !selectAll.checked && state.items.some((item) => state.selected.has(item.id));
    }
  }

  async function load() {
    try {
      const result = await service.list('orders', {
        page: state.page,
        pageSize: state.pageSize,
        condition: state.condition
      });
      state.items = result.items;
      state.total = result.total;
      renderHead();
      renderBody();
      renderPagination();
      updateSelection();
    } catch (error) {
      state.items = [];
      state.total = 0;
      renderHead();
      renderBody();
      renderPagination();
      toast(error.message || '数据加载失败', 'error');
    }
  }

  function closeModal() {
    overlay.innerHTML = '';
  }

  function modal(title, body, footer, detail = false) {
    overlay.innerHTML = `
      <div class="operations-modal-backdrop">
        <section class="operations-modal ${detail ? 'is-detail' : ''}" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
          <header class="operations-modal-header"><h3>${escapeHtml(title)}</h3><button data-modal-close aria-label="关闭">×</button></header>
          <div class="operations-modal-body">${body}</div>
          <footer class="operations-modal-footer">${footer}</footer>
        </section>
      </div>`;
  }

  function showDetail(item) {
    window.AppNavigation?.navigate?.(`./order-detail.html?id=${encodeURIComponent(item.id)}`);
  }

  function formField(field, item) {
    const value = item?.[field.key] ?? field.defaultValue ?? '';
    const control = field.options
      ? `<select name="${field.key}"><option value="">请选择</option>${field.options.map((option) => `<option value="${option}" ${String(value) === option ? 'selected' : ''}>${option}</option>`).join('')}</select>`
      : field.type === 'textarea'
        ? `<textarea name="${field.key}" placeholder="请输入">${escapeHtml(value)}</textarea>`
        : `<input name="${field.key}" type="${field.type || 'text'}" value="${escapeHtml(value)}" placeholder="${field.placeholder || '请输入'}">`;
    return `<div class="operations-form-item ${field.required ? 'required' : ''}">
      <label>${field.label}</label><div class="operations-form-control">${control}<div class="operations-field-error"></div></div>
    </div>`;
  }

  function confirmAction(title, message, callback) {
    modal(title, `<p style="margin:0;text-align:center;color:var(--text-secondary)">${escapeHtml(message)}</p>`,
      '<button class="btn" data-modal-close>取消</button><button class="btn btn-primary" id="confirmModalAction">确定</button>'
    );
    $('#confirmModalAction').onclick = async () => {
      try {
        await callback();
        closeModal();
        toast('操作成功');
        await load();
      } catch (error) {
        toast(error.message || '操作失败', 'error');
      }
    };
  }

  async function handleRowAction(action, id) {
    const item = await service.get('orders', id);
    if (!item) return toast('记录不存在或已删除', 'error');
    if (action === 'view') return showDetail(item);
    if (action === 'edit') {
      window.AppNavigation?.navigate?.(`./order-add.html?mode=edit&id=${encodeURIComponent(item.id)}`);
      return;
    }
    if (action === 'approve') {
      window.AppNavigation?.navigate?.(`./order-add.html?mode=audit&id=${encodeURIComponent(item.id)}`);
      return;
    }
    if (action === 'confirm') {
      window.AppNavigation?.navigate?.(`./order-add.html?mode=confirm&id=${encodeURIComponent(item.id)}`);
      return;
    }
    if (action === 'copy') {
      window.AppNavigation?.navigate?.(`./order-add.html?mode=copy&id=${encodeURIComponent(item.id)}`);
      return;
    }
    if (action === 'delete') {
      return confirmAction('删除订单', '删除后订单将不再显示，且无法恢复，是否确认删除？', () => service.remove('orders', id));
    }
    const transitionLabels = { close: ['关闭订单', '确定要关闭该订单吗？'] };
    const info = transitionLabels[action];
    if (info) confirmAction(info[0], info[1], () => service.transition('orders', id, action));
  }

  root.addEventListener('click', async (event) => {
    const close = event.target.closest('[data-modal-close]');
    if (close) return closeModal();
    const filterToggle = event.target.closest('[data-operations-filter-toggle]');
    if (filterToggle) {
      const expanded = filterToggle.classList.toggle('is-active');
      filterToggle.closest('.operations-filter')?.querySelector('.operations-filter-advanced')?.classList.toggle('is-visible', expanded);
      return;
    }
    const actionButton = event.target.closest('[data-action]');
    if (actionButton) {
      const row = actionButton.closest('tr[data-id]');
      if (row) return handleRowAction(actionButton.dataset.action, row.dataset.id);
    }
    if (event.target.id === 'queryButton') {
      state.condition = collectCondition();
      state.page = 1;
      state.selected.clear();
      return load();
    }
    if (event.target.id === 'resetButton') {
      root.querySelectorAll('.operations-filter input, .operations-filter select').forEach((field) => { field.value = ''; });
      expectedAtPicker?.clear(false);
      state.condition = {};
      state.page = 1;
      state.selected.clear();
      return load();
    }
    if (event.target.id === 'addButton') {
      window.AppNavigation?.navigate?.('./order-add.html');
      return;
    }
    if (event.target.id === 'batchConfirmButton') {
      return confirmAction('批量确认', '确定要确认选中的订单吗？', async () => {
        const ids = [...state.selected];
        if (!ids.length) throw new Error('请选择要操作的订单');
        await service.batch('orders', ids, 'confirm');
        state.selected.clear();
      });
    }
    if (event.target.id === 'exportButton') {
      const csv = await service.export('orders', { condition: state.condition }, columns.map(([key, label]) => ({ key, label })));
      const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = '订单列表.csv';
      link.click();
      URL.revokeObjectURL(url);
      return toast('导出成功');
    }
  });

  root.addEventListener('change', (event) => {
    if (event.target.id === 'selectAll') {
      state.items.forEach((item) => event.target.checked ? state.selected.add(item.id) : state.selected.delete(item.id));
      renderBody();
      updateSelection();
    }
    if (event.target.classList.contains('row-select')) {
      const id = event.target.closest('tr').dataset.id;
      event.target.checked ? state.selected.add(id) : state.selected.delete(id);
      updateSelection();
    }
  });

  root.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && event.target.closest('.operations-filter')) {
      state.condition = collectCondition();
      state.page = 1;
      load();
    }
    if (event.key === 'Escape' && overlay.innerHTML) closeModal();
  });

  state.pagination = window.Pagination.create({
    container: '#pagination',
    mode: 'compact',
    page: state.page,
    pageSize: state.pageSize,
    total: state.total,
    pageSizeOptions: [10, 20, 50],
    onChange: ({ page, pageSize }) => {
      state.page = page;
      state.pageSize = pageSize;
      return load();
    }
  });

  load();
})();
