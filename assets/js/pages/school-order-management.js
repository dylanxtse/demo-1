(function () {
  const service = window.SchoolOrderService;
  if (!service) return;
  const calendarIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="17" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="9" x2="21" y2="9"></line></svg>';
  const DEFAULT_ORDER_DATE_RANGE = Object.freeze({ start: '2026-07-29', end: '2026-09-04' });

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  const showValue = (value, fallback = '--') => value === '' || value == null ? fallback : escapeHtml(value);
  const formatAmount = (value) => value == null || value === '' || Number(value) === 0 ? '--' : Number(value).toFixed(2).replace(/\.00$/, '');
  const dateTimeValue = (value) => {
    if (value === '' || value == null) return '<span class="cell-muted">--</span>';
    const parts = String(value).split(' ');
    return `<span class="school-order-date-cell"><span>${escapeHtml(parts[0])}</span>${parts[1] ? `<span>${escapeHtml(parts.slice(1).join(' '))}</span>` : ''}</span>`;
  };
  const statusClass = (status) => ({
    '已完成': 'success',
    '已收货': 'success',
    '待审核': 'warning',
    '待出库': 'warning',
    '待发货': 'danger',
    '已驳回': 'danger',
    '已关闭': 'danger'
  }[status] || 'info');
  const receiptClass = (status) => ({
    '已收货': 'success',
    '部分收货': 'warning',
    '未收货': 'danger'
  }[status] || 'info');
  const actionDisabled = (status, action) => {
    const enabled = {
      audit: status === '待审核',
      edit: status === '待审核' || status === '草稿',
      accept: status === '待收货' || status === '待验收',
      copy: true,
      close: !['待出库', '已完成', '已关闭'].includes(status),
      delete: status === '待审核' || status === '草稿'
    };
    return enabled[action] ? '' : 'disabled';
  };

  function selectOptions(options, selected = '', placeholder = '全部') {
    return [`<option value="">${escapeHtml(placeholder)}</option>`, ...(options || []).map((option) => (
      `<option value="${escapeHtml(option)}" ${String(option) === String(selected) ? 'selected' : ''}>${escapeHtml(option)}</option>`
    ))].join('');
  }

  function openModal({ title, body, footer, className = '' }) {
    const backdrop = document.createElement('div');
    backdrop.className = 'operations-modal-backdrop';
    backdrop.dataset.schoolOrderModal = 'true';
    backdrop.innerHTML = `<div class="operations-modal ${className}" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
      <div class="operations-modal-header"><h3>${escapeHtml(title)}</h3><button type="button" data-modal-close aria-label="关闭">×</button></div>
      <div class="operations-modal-body">${body}</div>
      ${footer ? `<div class="operations-modal-footer">${footer}</div>` : ''}
    </div>`;
    document.body.appendChild(backdrop);
    const close = () => backdrop.remove();
    backdrop.addEventListener('click', (event) => {
      if (event.target === backdrop || event.target.closest('[data-modal-close], [data-modal-cancel]')) close();
    });
    backdrop.querySelector('[data-modal-close]')?.focus();
    return { backdrop, close };
  }

  function showToast(message) {
    document.querySelector('.operations-toast')?.remove();
    const toast = document.createElement('div');
    toast.className = 'operations-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    window.setTimeout(() => toast.remove(), 1800);
  }

  function navigate(url) {
    if (window.AppNavigationGuard?.navigate) window.AppNavigationGuard.navigate(url);
    else window.location.href = url;
  }

  function openConfirm({ title, message, confirmText = '确定', danger = false, onConfirm }) {
    const modal = openModal({
      title,
      className: 'is-confirm',
      body: `<p class="school-order-confirm-text">${escapeHtml(message)}</p>`,
      footer: `<button type="button" class="btn" data-modal-cancel>取消</button><button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-modal-confirm>${escapeHtml(confirmText)}</button>`
    });
    modal.backdrop.querySelector('[data-modal-confirm]').addEventListener('click', () => {
      onConfirm?.();
      modal.close();
    });
  }

  function renderRows(page, state) {
    const pager = state.pager?.getState?.() || { page: 1, pageSize: 20 };
    const start = (pager.page - 1) * pager.pageSize;
    const rows = state.filtered.slice(start, start + pager.pageSize);
    const body = page.querySelector('#schoolOrderBody');
    const selected = new Set(state.selectedIds);
    body.innerHTML = rows.length ? rows.map((row) => `<tr>
      <td><input type="checkbox" aria-label="选择订单 ${escapeHtml(row.orderNo)}" data-order-select="${escapeHtml(row.id)}" ${selected.has(row.id) ? 'checked' : ''}></td>
      <td><button type="button" class="school-order-number" data-action="detail" data-id="${escapeHtml(row.id)}" title="查看订单详情"><span class="school-order-number-main">${escapeHtml(row.orderNo)}</span><span class="school-order-created-at">${showValue(row.createdAt)}</span></button></td>
      <td title="${escapeHtml(row.supplierName)}">${escapeHtml(row.supplierName)}</td>
      <td>${escapeHtml(row.canteen)}</td>
      <td class="school-order-tag-cell"><span>${escapeHtml(row.orderTag)}</span>${row.recipeDemandRecordId ? `<button type="button" class="school-order-recipe-tag-link" data-action="recipe-record" data-record-id="${escapeHtml(row.recipeDemandRecordId)}" title="查看需求提交记录">${escapeHtml(row.recipeTag || '食谱Tag')}</button>` : ''}</td>
      <td>${formatAmount(row.orderAmount)}</td>
      <td>${formatAmount(row.acceptedAmount)}</td>
      <td>${formatAmount(row.returnAmount)}</td>
      <td>${formatAmount(row.reconciliationAmount)}</td>
      <td>${dateTimeValue(row.expectedAt)}</td>
      <td><span class="operation-status ${statusClass(row.status)}">${escapeHtml(row.status || '--')}</span></td>
      <td><span class="operation-status ${receiptClass(row.receiptStatus)}">${showValue(row.receiptStatus)}</span></td>
      <td>${showValue(row.productCount)}</td>
      <td>${showValue(row.supplement)}</td>
      <td title="${escapeHtml(row.remark || '--')}">${showValue(row.remark)}</td>
      <td>${showValue(row.acceptedAt)}</td>
      <td>${showValue(row.driver)}</td>
      <td>${showValue(row.source)}</td>
      <td>${showValue(row.creator)}</td>
      <td class="school-order-action-cell"><div class="school-order-actions">
        <button type="button" class="btn-text" data-action="audit" data-id="${escapeHtml(row.id)}" ${actionDisabled(row.status, 'audit')}>审核</button>
        <button type="button" class="btn-text" data-action="edit" data-id="${escapeHtml(row.id)}" ${actionDisabled(row.status, 'edit')}>编辑</button>
        <button type="button" class="btn-text" data-action="accept" data-id="${escapeHtml(row.id)}" ${actionDisabled(row.status, 'accept')}>验收</button>
        <button type="button" class="btn-text" data-action="copy" data-id="${escapeHtml(row.id)}" ${actionDisabled(row.status, 'copy')}>复制</button>
        <button type="button" class="btn-text danger" data-action="close" data-id="${escapeHtml(row.id)}" ${actionDisabled(row.status, 'close')}>关闭</button>
        <button type="button" class="btn-text danger" data-action="delete" data-id="${escapeHtml(row.id)}" ${actionDisabled(row.status, 'delete')}>删除</button>
      </div></td>
    </tr>`).join('') : '<tr><td class="school-order-empty" colspan="20">暂无符合条件的数据</td></tr>';
    const allOnPageSelected = rows.length > 0 && rows.every((row) => selected.has(row.id));
    const checkbox = page.querySelector('#schoolOrderSelectAll');
    if (checkbox) {
      checkbox.checked = allOnPageSelected;
      checkbox.indeterminate = !allOnPageSelected && rows.some((row) => selected.has(row.id));
    }
  }

  function render() {
    const content = `<section class="page-card school-order-page" id="schoolOrderPage" aria-label="订单管理">
      <form class="school-order-filter" id="schoolOrderFilters">
        <div class="school-order-filter-layout">
          <div class="school-order-filter-grid">
          <label class="operations-field"><span class="filter-label">期望送达日期</span><div class="school-order-date-range date-range-picker" id="schoolOrderDateRange"><input id="schoolOrderDateDisplay" class="filter-input date-range-display" type="text" placeholder="请选择日期范围" readonly aria-label="期望送达日期"><span class="date-range-icon" aria-hidden="true">${calendarIcon}</span><input id="schoolOrderStartDate" type="hidden" data-date-start value="${DEFAULT_ORDER_DATE_RANGE.start}"><input id="schoolOrderEndDate" type="hidden" data-date-end value="${DEFAULT_ORDER_DATE_RANGE.end}"></div></label>
          <label class="operations-field"><span class="filter-label">供货企业</span><select id="schoolOrderSupplier" class="filter-select" aria-label="供货企业">${selectOptions(service.suppliers || [service.SUPPLIER_NAME], '', '全部')}</select></label>
          <label class="operations-field"><span class="filter-label">订单标签</span><select id="schoolOrderTag" class="filter-select" aria-label="订单标签"><option value="">请选择</option>${(service.tags || []).map((tag) => `<option value="${escapeHtml(tag)}">${escapeHtml(tag)}</option>`).join('')}</select></label>
          <label class="operations-field school-order-filter-supplement"><span class="filter-label">是否补单</span><select id="schoolOrderSupplement" class="filter-select" aria-label="是否补单">${selectOptions(['是', '否'], '', '全部')}</select></label>
          <label class="operations-field school-order-filter-status"><span class="filter-label">单据状态</span><select id="schoolOrderStatus" class="filter-select" aria-label="单据状态">${selectOptions(service.statuses, '', '全部')}</select></label>
          <label class="operations-field school-order-filter-order-no"><span class="filter-label">订单号</span><input id="schoolOrderNo" class="filter-input" type="text" placeholder="输入采购单号" aria-label="订单号"></label>
          <label class="operations-field school-order-filter-source"><span class="filter-label">单据来源</span><select id="schoolOrderSource" class="filter-select" aria-label="单据来源">${selectOptions(service.sources, '', '全部')}</select></label>
          <label class="operations-field school-order-filter-receipt"><span class="filter-label">收货状态</span><select id="schoolOrderReceiptStatus" class="filter-select" aria-label="收货状态">${selectOptions(service.receiptStatuses, '', '全部')}</select></label>
          <label class="operations-field school-order-filter-net-vegetable"><span class="filter-label">是否净菜</span><select id="schoolOrderNetVegetable" class="filter-select" aria-label="是否净菜"><option value="">全部</option><option value="net">净菜</option><option value="non-net">非净菜</option></select></label>
          </div>
          <div class="operations-filter-actions school-order-filter-actions"><button type="submit" class="btn btn-primary btn-sm">查询</button><button type="button" class="btn btn-sm" data-action="reset">重置</button></div>
        </div>
      </form>
      <div class="school-order-toolbar" aria-label="订单操作">
        <button type="button" class="btn btn-primary btn-sm" data-action="add">添加订单</button>
        <button type="button" class="btn btn-primary btn-sm" data-action="batch-tag">批量修改标签</button>
        <span class="school-order-toolbar-help">*仅支持对同一食堂相同供货企业的订单进行批量修改标签</span>
        <span class="toolbar-spacer"></span>
        <button type="button" class="btn btn-sm school-order-export" data-action="export"><span class="school-order-export-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 16V4"></path><polyline points="7 9 12 4 17 9"></polyline><path d="M5 20h14"></path></svg></span><span>导出</span></button>
      </div>
      <div class="school-order-table-container">
        <div class="school-order-table-wrap"><table class="school-order-table"><colgroup>
          <col class="col-select"><col class="col-order-no"><col class="col-supplier"><col class="col-canteen"><col class="col-tag"><col class="col-money"><col class="col-money"><col class="col-money"><col class="col-money"><col class="col-date"><col class="col-status"><col class="col-receipt"><col class="col-count"><col class="col-supplement"><col class="col-remark"><col class="col-accepted-at"><col class="col-driver"><col class="col-source"><col class="col-creator"><col class="col-action">
        </colgroup><thead><tr>
          <th><input id="schoolOrderSelectAll" type="checkbox" aria-label="全选订单"></th><th>订单号</th><th>供货企业</th><th>食堂</th><th>订单标签</th><th>下单金额</th><th>验收金额</th><th>退货金额</th><th>对账金额</th><th>期望送达时间</th><th>单据状态</th><th>收货状态</th><th>商品种类数</th><th>是否补单</th><th>备注</th><th>验收时间</th><th>司机</th><th>单据来源</th><th>添加人</th><th>操作</th>
        </tr></thead><tbody id="schoolOrderBody"></tbody></table></div>
        <div class="pagination school-order-pagination" id="schoolOrderPagination"></div>
      </div>
    </section>`;
    const root = window.AppShell.mount({ title: '订单管理', content, variant: 'school', companyName: service.SCHOOL_NAME, emptyText: '订单管理' });
    const page = root.querySelector('#schoolOrderPage');
    const orderDateRangePicker = window.DateRangePicker?.mount?.({
      container: '#schoolOrderDateRange',
      displayInput: '#schoolOrderDateDisplay',
      startInput: '#schoolOrderStartDate',
      endInput: '#schoolOrderEndDate',
      panelId: 'schoolOrderDateRangePanel'
    });
    const state = { filtered: [], selectedIds: new Set(), pager: null };

    const collectFilters = () => ({
      startDate: page.querySelector('#schoolOrderStartDate').value,
      endDate: page.querySelector('#schoolOrderEndDate').value,
      supplier: page.querySelector('#schoolOrderSupplier').value,
      orderTag: page.querySelector('#schoolOrderTag').value,
      supplement: page.querySelector('#schoolOrderSupplement').value,
      status: page.querySelector('#schoolOrderStatus').value,
      orderNo: page.querySelector('#schoolOrderNo').value,
      source: page.querySelector('#schoolOrderSource').value,
      receiptStatus: page.querySelector('#schoolOrderReceiptStatus').value,
      netVegetable: page.querySelector('#schoolOrderNetVegetable').value
    });

    const refresh = (resetPage = true) => {
      state.filtered = service.list(collectFilters());
      state.pager?.update({ total: state.filtered.length, ...(resetPage ? { page: 1 } : {}) });
      renderRows(page, state);
    };

    state.filtered = service.list(collectFilters());
    state.pager = window.Pagination.create({
      container: '#schoolOrderPagination',
      total: state.filtered.length,
      page: 1,
      pageSize: 20,
      pageSizeOptions: [20, 50, 100],
      onChange: () => renderRows(page, state)
    });
    renderRows(page, state);

    page.querySelector('#schoolOrderFilters').addEventListener('submit', (event) => {
      event.preventDefault();
      refresh(true);
    });
    page.querySelector('#schoolOrderSelectAll').addEventListener('change', (event) => {
      const pager = state.pager.getState();
      const start = (pager.page - 1) * pager.pageSize;
      state.filtered.slice(start, start + pager.pageSize).forEach((row) => {
        if (event.target.checked) state.selectedIds.add(row.id);
        else state.selectedIds.delete(row.id);
      });
      renderRows(page, state);
    });
    page.addEventListener('change', (event) => {
      const checkbox = event.target.closest('[data-order-select]');
      if (!checkbox) return;
      if (checkbox.checked) state.selectedIds.add(checkbox.dataset.orderSelect);
      else state.selectedIds.delete(checkbox.dataset.orderSelect);
      renderRows(page, state);
    });
    page.addEventListener('click', (event) => {
      const actionButton = event.target.closest('[data-action]');
      if (!actionButton) return;
      const action = actionButton.dataset.action;
      const id = actionButton.dataset.id;
      if (action === 'reset') {
        orderDateRangePicker?.setValue(DEFAULT_ORDER_DATE_RANGE.start, DEFAULT_ORDER_DATE_RANGE.end, false);
        page.querySelectorAll('select').forEach((input) => { input.value = ''; });
        page.querySelector('#schoolOrderNo').value = '';
        refresh(true);
      } else if (action === 'add') {
        navigate('./school-order-form.html?mode=add');
      } else if (action === 'detail') {
        navigate(`./school-order-detail.html?id=${encodeURIComponent(id)}`);
      } else if (action === 'recipe-record') {
        navigate(`./school-recipe-demand-record-detail.html?id=${encodeURIComponent(actionButton.dataset.recordId || '')}`);
      } else if (action === 'edit' || action === 'audit') {
        navigate(`./school-order-form.html?mode=${action === 'audit' ? 'audit' : 'edit'}&id=${encodeURIComponent(id)}`);
      } else if (action === 'accept') {
        navigate(`./school-order-acceptance.html?id=${encodeURIComponent(id)}`);
      } else if (action === 'copy') {
        const modal = openModal({
          title: '复制订单',
          className: 'is-confirm',
          body: `<p class="school-order-confirm-text">提示：是否要复制该订单？</p><label class="school-order-copy-option"><input type="checkbox" id="schoolOrderSyncPrice"> 是否同步订单商品价格</label>`,
          footer: `<button type="button" class="btn" data-modal-cancel>取消</button><button type="button" class="btn btn-primary" data-modal-confirm>继续</button>`
        });
        modal.backdrop.querySelector('[data-modal-confirm]').addEventListener('click', () => {
          const sync = modal.backdrop.querySelector('#schoolOrderSyncPrice').checked ? '1' : '0';
          navigate(`./school-order-form.html?mode=copy&id=${encodeURIComponent(id)}&syncPrice=${sync}`);
        });
      } else if (action === 'close') {
        openConfirm({ title: '关闭订单', message: '确定要关闭该订单吗？关闭后订单将不能继续流转。', confirmText: '关闭订单', danger: true, onConfirm: () => { service.close(id); refresh(false); showToast('订单已关闭'); } });
      } else if (action === 'delete') {
        openConfirm({ title: '删除订单', message: '确定要删除该订单吗？删除后不可恢复。', confirmText: '删除', danger: true, onConfirm: () => { service.remove(id); state.selectedIds.delete(id); refresh(false); showToast('订单已删除'); } });
      } else if (action === 'batch-tag') {
        const ids = [...state.selectedIds];
        if (!ids.length) {
          showToast('请先选择要修改的订单');
          return;
        }
        const selectedRows = state.filtered.filter((row) => ids.includes(row.id));
        const sameGroup = selectedRows.every((row) => row.supplierName === selectedRows[0].supplierName && row.canteen === selectedRows[0].canteen);
        if (!sameGroup) {
          showToast('仅支持对同一食堂相同供货企业的订单进行批量修改标签');
          return;
        }
        const modal = openModal({
          title: '批量修改标签',
          body: `<p class="school-order-batch-note">已选择 ${ids.length} 条订单，仅能修改同一食堂、相同供货企业订单的标签。</p><div class="school-order-modal-form"><label for="schoolOrderBatchTag">订单标签</label><select id="schoolOrderBatchTag">${(service.tags || []).map((tag) => `<option value="${escapeHtml(tag)}">${escapeHtml(tag)}</option>`).join('')}</select></div>`,
          footer: `<button type="button" class="btn" data-modal-cancel>取消</button><button type="button" class="btn btn-primary" data-modal-confirm>保存</button>`
        });
        modal.backdrop.querySelector('[data-modal-confirm]').addEventListener('click', () => {
          service.updateBatchTag(ids, modal.backdrop.querySelector('#schoolOrderBatchTag').value);
          modal.close();
          refresh(false);
          showToast('订单标签已更新');
        });
      } else if (action === 'export') {
        const csv = `\ufeff${service.csv(state.filtered)}`;
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = '静安第一中学-订单管理.csv';
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 0);
        showToast('订单列表已导出');
      }
    });
  }

  render();
})();
