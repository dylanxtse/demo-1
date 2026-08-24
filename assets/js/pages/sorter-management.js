(function () {
  const initialPassword = '1234567Aa';
  const service = window.OperationsService;

  // The generic record page requires transition actions for confirmation flows.
  // Keep this mock-only reset operation scoped to the sorter page so the shared
  // service and the other protected pages remain unchanged.
  if (service && !service.__sorterResetPasswordPatched) {
    const transition = service.transition.bind(service);
    service.transition = async (resource, id, action, payload = {}) => {
      if (resource !== 'sorters' || action !== 'resetPassword') {
        return transition(resource, id, action, payload);
      }
      const sorter = await service.get(resource, id);
      if (!sorter) throw new Error('记录不存在或已删除');
      return service.update(resource, id, {
        passwordResetAt: new Date().toISOString(),
        initialPassword
      });
    };
    service.__sorterResetPasswordPatched = true;
  }

  const detailFields = [
    ['sorterCode', '分拣员编码'],
    ['sorterName', '分拣员名称'],
    ['username', '用户名'],
    ['role', '角色'],
    ['phone', '联系电话'],
    ['warehouse', '仓库'],
    ['status', '启用状态'],
    ['createdAt', '添加时间']
  ];
  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  // The list intentionally contains only the online columns. Intercept its
  // code link so the detail dialog can still show the complete sorter profile.
  document.addEventListener('click', async (event) => {
    const viewButton = event.target.closest('[data-row-action="view"]');
    if (!viewButton) return;
    const row = viewButton.closest('tr[data-id]');
    const overlay = document.getElementById('recordOverlay');
    if (!row || !overlay) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const sorter = await service.get('sorters', row.dataset.id);
    if (!sorter) return;
    const statusText = sorter.status === 'ENABLE' ? '启用' : sorter.status === 'DISABLE' ? '禁用' : sorter.status;
    overlay.innerHTML = `<div class="operations-modal-backdrop"><section class="operations-modal is-detail" role="dialog" aria-modal="true" aria-label="分拣员详情">
      <header class="operations-modal-header"><h3>分拣员详情</h3><button data-record-close aria-label="关闭">×</button></header>
      <div class="operations-modal-body"><dl class="operations-detail-grid">${detailFields.map(([key, label]) => {
        const value = key === 'status' ? statusText : sorter[key];
        return `<div class="operations-detail-item"><dt>${label}</dt><dd>${escapeHtml(value || '--')}</dd></div>`;
      }).join('')}</dl></div>
      <footer class="operations-modal-footer"><button class="btn btn-primary" data-record-close>关闭</button></footer>
    </section></div>`;
  }, true);

  window.RecordPageConfig = {
    title: '分拣员',
    resource: 'sorters',
    pageClass: 'sorting-module-page sorter-management-page',
    selectable: false,
    filters: [
      { key: 'sorterName', label: '分拣员名称', placeholder: '请输入' },
      { key: 'sorterCode', label: '分拣员编码', placeholder: '请输入' },
      { key: 'warehouse', label: '仓库', options: ['中心仓', '北区仓', '临时仓'] },
      { key: 'status', label: '启用状态', options: [
        { label: '启用', value: 'ENABLE' },
        { label: '禁用', value: 'DISABLE' }
      ] }
    ],
    columns: [
      { key: 'sorterCode', label: '分拣员编码', link: true },
      { key: 'sorterName', label: '分拣员名称' },
      { key: 'phone', label: '联系电话' },
      { key: 'warehouse', label: '仓库' },
      { key: 'status', label: '启用状态', format: 'status' }
    ],
    toolbar: [{ key: 'add', label: '添加分拣员', primary: true }],
    rowActions: [
      { key: 'edit', label: '编辑' },
      {
        key: 'resetPassword',
        label: '重置密码',
        transition: 'resetPassword',
        confirmTitle: '重置密码',
        message: `将此分拣员密码重置为初始密码 ${initialPassword}，是否确定？`
      },
      { key: 'enable', label: '启用', transition: 'enable', visible: ['DISABLE'], confirmTitle: '启用分拣员', message: '确定启用该分拣员？' },
      { key: 'disable', label: '禁用', transition: 'disable', visible: ['ENABLE'], confirmTitle: '禁用分拣员', message: '确定禁用该分拣员？' },
      { key: 'delete', label: '删除', danger: true }
    ],
    formFields: [
      { key: 'sorterName', label: '分拣员名称', required: true },
      { key: 'username', label: '用户名', required: true, placeholder: '6～20位字母或数字' },
      { key: 'role', label: '角色', required: true, options: ['分拣员', '分拣组长'] },
      { key: 'phone', label: '联系电话', required: true },
      { key: 'warehouse', label: '仓库', required: true, options: ['中心仓', '北区仓', '临时仓'] }
    ],
    createDefaults: { status: 'ENABLE', sorterCode: `FJ${String(Date.now()).slice(-6)}` },
    deleteMessage: '删除之后将不能恢复，确认删除该分拣员？'
  };
})();
