(function () {
  const service = window.CustomerArchiveService;
  const esc = window.DomUtils.escapeHtml;
  const backIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 4-8 8 8 8M2 12h20"/></svg>';
  const deleteArt = '<svg class="ca-delete-art" viewBox="0 0 160 160" aria-hidden="true"><path d="M24 6v148M50 6v148" stroke="#f1f3f8"/><circle cx="25" cy="48" r="13" stroke="#edf4ff" fill="none"/><path d="m35 50 11 96h79l12-96" fill="#2e6dff"/><path d="M26 36h116v9H26zM65 27h34v9H65z" fill="#174bcc"/><path d="m65 65 4 61M83 65v61M101 65l-4 61" stroke="#1550d6" stroke-width="9"/><path d="M5 65h45M5 85h45" stroke="#102c55" stroke-width="5"/><path d="m43 57 14 8-14 8m0 4 14 8-14 8" fill="#102c55"/></svg>';
  const root = window.AppShell.mount({ title: '客户档案', content: '<section class="customer-archive-page" id="customerArchivePage" aria-label="客户档案"></section><div id="customerArchiveOverlay"></div><div class="ca-toast" id="customerArchiveToast" role="status" hidden></div>' });
  const page = document.getElementById('customerArchivePage');
  const overlay = document.getElementById('customerArchiveOverlay');
  const state = { filter: {}, page: 1, pageSize: 20, pagination: null, record: null, draft: {}, readonly: false, pending: null,
    importFile: null, importPhase: '', importVersion: 0, importUrls: [], importing: false };
  const option = (value, label, selected) => `<option value="${esc(value)}"${value === selected ? ' selected' : ''}>${esc(label)}</option>`;
  const typeOptions = (selected, form = false) => service.types().filter((row) => !form || row.status !== 'DISABLE' || row.id === selected).map((row) => option(row.id, row.name, selected)).join('');
  const warehouseOptions = (selected, form = false) => service.warehouses().filter((row) => !form || row.status !== 'DISABLE' || row.id === selected).map((row) => option(row.id, row.warehouseName, selected)).join('');
  const errorMarkup = (key) => `<p class="ca-error" id="caError-${key}" hidden></p>`;
  function go(view, id = '') { window.location.hash = `#${view}${id ? `/${encodeURIComponent(id)}` : ''}`; }
  function toast(message) {
    const element = document.getElementById('customerArchiveToast'); element.textContent = message; element.hidden = false;
    clearTimeout(toast.timer); toast.timer = setTimeout(() => { element.hidden = true; }, 2200);
  }
  function renderRows() {
    const rows = service.list(state.filter);
    state.page = Math.min(state.page, Math.max(1, Math.ceil(rows.length / state.pageSize)));
    const start = (state.page - 1) * state.pageSize;
    const cell = (value) => `<td title="${esc(value)}">${esc(value || '--')}</td>`;
    document.getElementById('customerBody').innerHTML = rows.slice(start, start + state.pageSize).map((row, index) => `<tr data-id="${esc(row.id)}">
      <td>${start + index + 1}</td><td><button type="button" class="ca-link" data-ca-action="view" data-id="${esc(row.id)}">${esc(row.customerCode)}</button></td>
      ${cell(row.customerName)}${cell(row.customerTypeName)}${cell(row.username)}
      <td><span class="ca-status${row.status === 'DISABLE' ? ' is-disabled' : ''}">${row.status === 'DISABLE' ? '禁用' : '正常'}</span></td>
      ${cell(row.warehouse)}${cell(row.receiver)}${cell(row.phone)}${cell(row.address)}${cell(row.additionMethod)}
      <td><div class="ca-actions"><button type="button" class="ca-link" data-ca-action="edit" data-id="${esc(row.id)}">编辑</button><button type="button" class="ca-link" data-ca-action="${row.status === 'DISABLE' ? 'enable' : 'disable'}" data-id="${esc(row.id)}">${row.status === 'DISABLE' ? '启用' : '禁用'}</button><button type="button" class="ca-link danger" data-ca-action="delete" data-id="${esc(row.id)}">删除</button></div></td></tr>`).join('') || '<tr><td colspan="12" class="ca-empty">暂无数据</td></tr>';
    state.pagination.update({ page: state.page, pageSize: state.pageSize, total: rows.length });
  }
  function renderList() {
    page.classList.remove('is-form');
    page.innerHTML = `<div class="ca-query"><div class="ca-query-grid">
      <div class="ca-query-field"><label for="customerCodeFilter">客户编码</label><input class="filter-input" id="customerCodeFilter" placeholder="请输入" value="${esc(state.filter.customerCode || '')}"></div>
      <div class="ca-query-field"><label for="customerNameFilter">客户名称</label><input class="filter-input" id="customerNameFilter" placeholder="请输入" value="${esc(state.filter.customerName || '')}"></div>
      <div class="ca-query-field"><label for="customerTypeFilter">客户类型</label><select class="filter-select" id="customerTypeFilter"><option value="">全部</option>${typeOptions(state.filter.customerTypeId)}</select></div>
      <div class="ca-query-field"><label for="customerWarehouseFilter">仓库</label><select class="filter-select" id="customerWarehouseFilter"><option value="">全部</option>${warehouseOptions(state.filter.warehouseId)}</select></div>
      <div class="ca-query-field"><label for="customerMethodFilter">添加方式</label><select class="filter-select" id="customerMethodFilter"><option value="">全部</option>${['关联', '手动添加'].map((label) => option(label, label, state.filter.additionMethod)).join('')}</select></div>
    </div><div class="ca-query-actions"><button class="btn btn-primary" type="button" data-ca-action="query">查询</button><button class="btn" type="button" data-ca-action="reset">重置</button></div></div>
    <div class="ca-toolbar"><button class="btn btn-primary" type="button" data-ca-action="add">添加客户</button>
      <button class="btn" type="button" data-ca-action="import">导入客户</button></div>
    <div class="ca-table-scroll"><table class="ca-table"><thead><tr>${['序号', '客户编码', '客户名称', '客户类型', '用户名', '启用状态', '仓库', '收货人', '收货手机', '收货地址', '添加方式', '操作'].map((label) => `<th scope="col">${label}</th>`).join('')}</tr></thead><tbody id="customerBody"></tbody></table></div><div class="pagination" id="customerPagination"></div>`;
    state.pagination = window.Pagination.create({ container: '#customerPagination', page: state.page, pageSize: state.pageSize, total: 0,
      pageSizeOptions: [20, 50, 100], showArrows: true, onChange({ page, pageSize }) { state.page = page; state.pageSize = pageSize; renderRows(); } });
    renderRows();
  }
  function field(key, label, control) {
    return `<div class="ca-form-row"><label class="ca-form-label ca-required" for="ca-${key}">${label}</label><div class="ca-form-control">${control}${errorMarkup(key)}</div></div>`;
  }
  function input(key, label, type = 'text', disabled = false) {
    return field(key, label, `<input class="ca-input" type="${type}" id="ca-${key}" name="${key}" value="${esc(state.draft[key] || '')}" placeholder="请输入" required${disabled || state.readonly ? ' disabled' : ''}>`);
  }
  function renderForm() {
    const data = state.draft, editing = Boolean(state.record), linked = data.additionMethod !== '手动添加';
    page.classList.add('is-form');
    page.innerHTML = `<header class="ca-form-header"><button type="button" class="ca-back" data-ca-action="back">${backIcon}返回</button><h1>${state.readonly ? '客户详情' : editing ? '编辑客户' : '添加客户'}</h1></header>
      <form class="ca-form" id="customerArchiveForm" novalidate><div class="ca-form-body">
        ${editing ? '' : `<div class="ca-form-row ca-add-method"><span class="ca-form-label">添加方式</span><div class="ca-radio-group"><label><input type="radio" name="additionMethod" value="关联"${linked ? ' checked' : ''}>关联学校客户</label><label><input type="radio" name="additionMethod" value="手动添加"${linked ? '' : ' checked'}>手动添加其他客户</label></div></div>`}
        <h2 class="ca-section-title">基础信息</h2>
        ${!editing && linked ? field('schoolId', '客户名称', `<select class="ca-input" id="ca-schoolId" name="schoolId" required><option value="" disabled${data.schoolId ? '' : ' selected'}>请选择</option>${service.schools(data.schoolId).map((school) => option(school.id, school.name, data.schoolId)).join('')}</select>`) : input('customerName', '客户名称')}
        ${editing || !linked ? field('username', '用户名', `<div class="ca-username"><input class="ca-input" id="ca-username" name="username" value="${esc(data.username || '')}" placeholder="${editing ? '--' : '请输入用户名'}"${editing || state.readonly ? ' disabled' : ''}${!linked ? ' required' : ''}>${editing && !state.readonly ? `<button type="button" class="ca-link" data-ca-action="password" data-id="${esc(state.record.id)}"${data.username ? '' : ' disabled'}>重置密码</button>` : ''}</div>${!editing ? '<p class="ca-hint">请输入6~20位由字母、数字组成的用户名。</p>' : ''}`) : ''}
        ${field('customerTypeId', '客户类型', `<select class="ca-input" id="ca-customerTypeId" name="customerTypeId" required${state.readonly ? ' disabled' : ''}><option value="" disabled${data.customerTypeId ? '' : ' selected'}>请选择</option>${typeOptions(data.customerTypeId, true)}</select>`)}
        <h2 class="ca-section-title">收货信息</h2>
        ${field('warehouseId', '仓库', `<select class="ca-input" id="ca-warehouseId" name="warehouseId" required${state.readonly ? ' disabled' : ''}><option value="" disabled${data.warehouseId ? '' : ' selected'}>请选择</option>${warehouseOptions(data.warehouseId, true)}</select>`)}
        ${input('receiver', '收货人')}${input('phone', '收货手机', 'tel')}
        ${field('address', '收货地址', `<textarea class="ca-input ca-address" id="ca-address" name="address" placeholder="请输入内容" maxlength="50" required${state.readonly ? ' disabled' : ''}>${esc(data.address || '')}</textarea><div class="ca-address-count" id="customerAddressCount">${(data.address || '').length}/50</div>`)}
        <p class="ca-error" id="customerArchiveFormError" role="alert" hidden></p>
      </div><footer class="ca-form-footer"><button type="button" class="btn" data-ca-action="back">${state.readonly ? '返回' : '取消'}</button>${state.readonly ? '' : '<button type="submit" class="btn btn-primary">保存</button>'}</footer></form>`;
  }
  function readForm() {
    const form = document.getElementById('customerArchiveForm');
    const value = (key, fallback = '') => form.elements[key] ? form.elements[key].value.trim() : fallback;
    return { ...state.draft, additionMethod: state.draft.additionMethod, customerName: value('customerName', state.draft.customerName || ''),
      schoolId: value('schoolId', state.draft.schoolId || ''), username: value('username', state.draft.username || ''),
      customerTypeId: value('customerTypeId'), warehouseId: value('warehouseId'), receiver: value('receiver'), phone: value('phone'), address: value('address') };
  }
  function clearImportUrls() {
    state.importUrls.forEach((url) => URL.revokeObjectURL(url));
    state.importUrls = [];
  }
  function closeModal() {
    state.pending = null;
    state.importVersion++;
    state.importPhase = '';
    state.importFile = null;
    clearImportUrls();
    overlay.innerHTML = '';
  }
  function downloadUrl(book) {
    const bytes = window.XLSX.write(book, { bookType: 'xlsx', type: 'array', compression: true });
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    state.importUrls.push(url);
    return url;
  }
  function renderImportUpload() {
    clearImportUrls();
    state.importPhase = 'upload';
    overlay.innerHTML = `<div class="ca-modal-backdrop"><section class="ca-modal ca-import-modal" role="dialog" aria-modal="true" aria-labelledby="caImportTitle">
      <header><h2 id="caImportTitle">导入客户</h2><button class="ca-modal-close" type="button" data-ca-action="close-modal" aria-label="关闭">×</button></header>
      <div class="ca-modal-body"><div class="ca-import-section"><span class="ca-import-label">下载模板</span>
        <div class="ca-import-template-links"><a class="ca-import-link" href="./customer-import-template.html">客户导入模板.xlsx</a>
          <a class="ca-import-link" href="./customer-import-kingdee-template.html">金蝶客户导入模板.xlsx</a></div></div>
        <div class="ca-import-section"><label class="ca-import-label" for="caImportFile">上传文件</label>
          <div class="ca-import-upload"><button class="btn btn-sm" type="button" data-ca-action="import-upload">上传</button>
            <input type="file" id="caImportFile" accept=".xlsx" hidden><span class="ca-import-hint">只能上传xlsx文件，且不超过10M</span></div>
          <span class="ca-import-filename" id="caImportFileName">${esc(state.importFile?.name || '')}</span></div>
        <p class="ca-error ca-import-message" id="caImportMessage" role="alert" hidden></p>
      </div><footer><button class="btn" type="button" data-ca-action="close-modal">取消</button>
        <button class="btn btn-primary" type="button" data-ca-action="import-confirm" id="caImportConfirm">导入</button></footer>
    </section></div>`;
  }
  function renderImportResult(result) {
    clearImportUrls();
    const errorUrl = result.errors.length ? downloadUrl(window.CustomerImportService.errorWorkbook(result)) : '';
    state.importPhase = 'result';
    overlay.innerHTML = `<div class="ca-modal-backdrop"><section class="ca-modal ca-import-modal ca-import-result" role="dialog" aria-modal="true" aria-labelledby="caImportResultTitle">
      <header><h2 id="caImportResultTitle">导入客户</h2><button class="ca-modal-close" type="button" data-ca-action="close-modal" aria-label="关闭">×</button></header>
      <div class="ca-modal-body"><dl class="ca-import-stats" aria-live="polite"><div><dt>新增条数</dt><dd>${result.added}条</dd></div>
        <div><dt>错误条数</dt><dd><span class="ca-import-error-count">${result.errors.length}条</span>
          ${errorUrl ? `<a class="ca-import-link" href="${esc(errorUrl)}" download="客户错误数据.xlsx">下载错误数据.xlsx</a>` : ''}</dd></div></dl></div>
      <footer><button class="btn" type="button" data-ca-action="close-modal">关闭</button>
        <button class="btn btn-primary" type="button" data-ca-action="import-previous">上一步</button></footer>
    </section></div>`;
  }
  function importMessage(message) {
    const element = document.getElementById('caImportMessage');
    element.textContent = message;
    element.hidden = !message;
  }
  function validateImportFile(file) {
    if (!file) throw new Error('请先上传文件');
    if (!/\.xlsx$/i.test(file.name)) throw new Error('只能上传xlsx文件');
    if (file.size > 10 * 1024 * 1024) throw new Error('文件大小不能超过10M');
  }
  async function importCustomers() {
    if (state.importing || state.importPhase !== 'upload') return;
    try { validateImportFile(state.importFile); }
    catch (error) { importMessage(error.message); return; }
    const version = state.importVersion, file = state.importFile;
    const button = document.getElementById('caImportConfirm');
    state.importing = true;
    button.disabled = true;
    button.textContent = '导入中…';
    importMessage('');
    try {
      const bytes = await file.arrayBuffer();
      if (version !== state.importVersion) return;
      const result = window.CustomerImportService.importData(bytes);
      renderRows();
      renderImportResult(result);
    } catch (error) {
      if (version === state.importVersion) importMessage(error.message || '导入失败，请检查文件');
    } finally { state.importing = false; button.disabled = false; button.textContent = '导入'; }
  }
  function modal(action, id) {
    const row = service.get(id); if (!row) return toast('客户不存在或已删除');
    state.pending = { action, id };
    const title = { delete: '删除客户', enable: '启用客户', disable: '禁用客户', password: '重置密码' }[action];
    const message = action === 'delete' ? '请再次确定是否删除该客户？' : action === 'password' ? '确定重置该客户的密码吗？' : `确定${action === 'enable' ? '启用' : '禁用'}该客户吗？`;
    overlay.innerHTML = `<div class="ca-modal-backdrop"><section class="ca-modal" role="dialog" aria-modal="true" aria-labelledby="caModalTitle"><header><h2 id="caModalTitle">${title}</h2><button class="ca-modal-close" type="button" data-ca-action="close-modal" aria-label="关闭">×</button></header>
      <div class="ca-modal-body">${action === 'delete' ? deleteArt : ''}<p>${message}</p><p class="ca-error" id="caModalError" hidden></p></div><footer><button class="btn" type="button" data-ca-action="close-modal">取消</button><button class="btn btn-primary" type="button" data-ca-action="confirm">确认</button></footer></section></div>`;
  }
  function renderRoute() {
    closeModal();
    const [view = 'list', encodedId = ''] = (window.location.hash || '').replace(/^#/, '').split('/');
    let id; try { id = decodeURIComponent(encodedId); } catch (error) { id = ''; }
    if (view === 'add') { state.record = null; state.readonly = false; state.draft = { additionMethod: '关联' }; renderForm(); }
    else if (['edit', 'view'].includes(view) && id) {
      state.record = service.get(id); state.readonly = view === 'view';
      if (!state.record) { page.innerHTML = '<p>客户不存在或已删除</p><button type="button" class="btn" data-ca-action="back">返回客户档案</button>'; return; }
      state.draft = { ...state.record }; renderForm();
    } else renderList();
  }
  root.addEventListener('submit', (event) => {
    if (event.target.id !== 'customerArchiveForm') return;
    event.preventDefault(); if (state.readonly) return;
    const data = readForm();
    root.querySelectorAll('.ca-error').forEach((element) => { element.hidden = true; element.textContent = ''; });
    root.querySelectorAll('[aria-invalid="true"]').forEach((element) => element.removeAttribute('aria-invalid'));
    try { service.save(data, state.record?.id || ''); toast('保存成功'); go('list'); }
    catch (error) {
      if (error.fields) Object.entries(error.fields).forEach(([key, message]) => {
        const element = document.getElementById(`caError-${key}`) || document.getElementById('caError-schoolId');
        if (element) { element.textContent = message; element.hidden = false; }
        document.getElementById(`ca-${key}`)?.setAttribute('aria-invalid', 'true');
      });
      else { const element = document.getElementById('customerArchiveFormError'); element.textContent = error.message; element.hidden = false; }
    }
  });
  root.addEventListener('click', (event) => {
    const button = event.target.closest('[data-ca-action]'); if (!button || button.disabled) return;
    const { caAction: action, id } = button.dataset;
    if (action === 'add') return go('add');
    if (action === 'import') { closeModal(); return renderImportUpload(); }
    if (action === 'import-upload') return document.getElementById('caImportFile').click();
    if (action === 'import-confirm') return importCustomers();
    if (action === 'import-previous' && state.importPhase === 'result') return renderImportUpload();
    if (action === 'back') return go('list');
    if (['edit', 'view'].includes(action)) return go(action, id);
    if (['delete', 'enable', 'disable', 'password'].includes(action)) return modal(action, id);
    if (action === 'close-modal') return closeModal();
    if (action === 'query') {
      state.filter = Object.fromEntries([['customerCode', 'customerCodeFilter'], ['customerName', 'customerNameFilter'], ['customerTypeId', 'customerTypeFilter'], ['warehouseId', 'customerWarehouseFilter'], ['additionMethod', 'customerMethodFilter']].map(([key, id]) => [key, document.getElementById(id).value.trim()]));
      state.page = 1; return renderRows();
    }
    if (action === 'reset') { state.filter = {}; state.page = 1; return renderList(); }
    if (action === 'confirm' && state.pending) {
      const pending = state.pending;
      try {
        if (pending.action === 'delete') service.remove(pending.id);
        else if (pending.action === 'password') service.resetPassword(pending.id);
        else service.setStatus(pending.id, pending.action === 'enable' ? 'ENABLE' : 'DISABLE');
        closeModal(); if (pending.action !== 'password') renderRows(); toast(pending.action === 'password' ? '密码已重置' : '操作成功');
      } catch (error) { const element = document.getElementById('caModalError'); element.textContent = error.message; element.hidden = false; }
    }
  });
  root.addEventListener('change', (event) => {
    if (event.target.id === 'caImportFile' && state.importPhase === 'upload') {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        validateImportFile(file);
        state.importFile = file;
        document.getElementById('caImportFileName').textContent = file.name;
        importMessage('');
      } catch (error) {
        state.importFile = null;
        event.target.value = '';
        document.getElementById('caImportFileName').textContent = '';
        importMessage(error.message);
      }
      return;
    }
    if (event.target.name === 'additionMethod' && !state.record) { state.draft = { ...readForm(), additionMethod: event.target.value }; renderForm(); }
  });
  root.addEventListener('input', (event) => {
    if (event.target.id === 'ca-address') document.getElementById('customerAddressCount').textContent = `${event.target.value.length}/50`;
  });
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeModal();
    if (event.key === 'Enter' && event.target.closest('.ca-query')) { event.preventDefault(); root.querySelector('[data-ca-action="query"]').click(); }
  });
  window.addEventListener('hashchange', renderRoute);
  renderRoute();
})();
