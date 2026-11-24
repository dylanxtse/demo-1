(function () {
  const service = window.PurchaseSupplierService;
  const assets = window.SupplierAttachments;
  const esc = window.DomUtils.escapeHtml;
  const backIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 4-8 8 8 8M2 12h20"/></svg>';
  const calendarIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M7 2v6M17 2v6"/></svg>';
  const deleteArt = '<svg class="ps-delete-art" viewBox="0 0 160 160" aria-hidden="true"><path d="M24 6v148M50 6v148" stroke="#f1f3f8"/><circle cx="25" cy="48" r="13" stroke="#edf4ff" fill="none"/><path d="m35 50 11 96h79l12-96" fill="#2e6dff"/><path d="M26 36h116v9H26zM65 27h34v9H65z" fill="#174bcc"/><path d="m65 65 4 61M83 65v61M101 65l-4 61" stroke="#1550d6" stroke-width="9"/><path d="M5 65h45M5 85h45" stroke="#102c55" stroke-width="5"/><path d="m43 57 14 8-14 8m0 4 14 8-14 8" fill="#102c55"/></svg>';
  const root = window.AppShell.mount({ title: '供应商档案', variant: 'enterprise', content:
    '<section class="purchase-supplier-page" id="purchaseSupplierPage" aria-label="供应商档案"></section><div id="purchaseSupplierOverlay"></div><div id="purchaseSupplierToast" class="ps-toast" role="status" hidden></div>' });
  const page = document.getElementById('purchaseSupplierPage');
  const overlay = document.getElementById('purchaseSupplierOverlay');
  const state = { condition: {}, page: 1, pageSize: 20, pagination: null, picker: null, record: null, readonly: false,
    busy: false, version: 0, pending: null, license: null, qualifications: [], urls: new Map(),
    importFile: null, importPhase: '', importVersion: 0, importUrls: [] };
  const fieldId = (key) => `ps-${key}`;
  const errorMarkup = (key) => `<p class="ps-error" id="psError-${key}" hidden></p>`;
  const assetIds = (record) => [record?.businessLicense, ...(record?.qualifications || [])].filter(Boolean).map((item) => item.id);
  const input = (key, label, placeholder, type = 'text', required = false, disabled = false) => `<div class="ps-form-row">
    <label class="ps-form-label${required ? ' ps-required' : ''}" for="${fieldId(key)}">${label}</label>
    <div class="ps-form-control"><input class="ps-text-input" id="${fieldId(key)}" name="${key}" type="${type}" placeholder="${placeholder}" value="${esc(state.record?.[key] || '')}"${required ? ' required' : ''}${disabled || state.readonly ? ' disabled' : ''} aria-describedby="psError-${key}">${errorMarkup(key)}</div></div>`;

  function toast(message) {
    const element = document.getElementById('purchaseSupplierToast');
    element.textContent = message;
    element.hidden = false;
    window.clearTimeout(toast.timer);
    toast.timer = window.setTimeout(() => { element.hidden = true; }, 2200);
  }
  function go(view, id = '') {
    window.location.hash = `#${view}${id ? `/${encodeURIComponent(id)}` : ''}`;
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
    overlay.innerHTML = `<div class="ps-modal-backdrop"><section class="ps-modal ps-import-modal" role="dialog" aria-modal="true" aria-labelledby="psImportTitle">
      <header class="ps-modal-header"><h2 id="psImportTitle">导入供应商</h2><button class="ps-modal-close" type="button" data-ps-action="close-modal" aria-label="关闭">×</button></header>
      <div class="ps-modal-body"><div class="ps-import-section"><span class="ps-import-label">下载模板</span>
        <div class="ps-import-template-links"><a class="ps-import-link" href="./supplier-import-template.html">供应商导入模板.xlsx</a>
          <a class="ps-import-link" href="./supplier-import-kingdee-template.html">金蝶供应商导入模板.xlsx</a></div></div>
        <div class="ps-import-section"><label class="ps-import-label" for="psImportFile">上传文件</label>
          <div class="ps-import-upload"><button class="btn btn-sm" type="button" data-ps-action="import-upload">上传</button>
            <input type="file" id="psImportFile" accept=".xlsx" hidden><span class="ps-import-hint">只能上传xlsx文件，且不超过10M</span></div>
          <span class="ps-import-filename" id="psImportFileName">${esc(state.importFile?.name || '')}</span></div>
        <p class="ps-error ps-import-message" id="psImportMessage" role="alert" hidden></p>
      </div><footer class="ps-modal-actions"><button class="btn" type="button" data-ps-action="close-modal">取消</button>
        <button class="btn btn-primary" type="button" data-ps-action="import-confirm" id="psImportConfirm">导入</button></footer>
    </section></div>`;
  }
  function renderImportResult(result) {
    clearImportUrls();
    const errorUrl = result.errors.length ? downloadUrl(window.SupplierImportService.errorWorkbook(result)) : '';
    state.importPhase = 'result';
    overlay.innerHTML = `<div class="ps-modal-backdrop"><section class="ps-modal ps-import-modal ps-import-result" role="dialog" aria-modal="true" aria-labelledby="psImportResultTitle">
      <header class="ps-modal-header"><h2 id="psImportResultTitle">导入供应商</h2><button class="ps-modal-close" type="button" data-ps-action="close-modal" aria-label="关闭">×</button></header>
      <div class="ps-modal-body"><dl class="ps-import-stats" aria-live="polite"><div><dt>新增条数</dt><dd>${result.added}条</dd></div>
        <div><dt>错误条数</dt><dd><span class="ps-import-error-count">${result.errors.length}条</span>
          ${errorUrl ? `<a class="ps-import-link" href="${esc(errorUrl)}" download="供应商错误数据.xlsx">下载错误数据.xlsx</a>` : ''}</dd></div></dl></div>
      <footer class="ps-modal-actions"><button class="btn" type="button" data-ps-action="close-modal">关闭</button>
        <button class="btn btn-primary" type="button" data-ps-action="import-previous">上一步</button></footer>
    </section></div>`;
  }
  function importMessage(message) {
    const element = document.getElementById('psImportMessage');
    element.textContent = message;
    element.hidden = !message;
  }
  function validateImportFile(file) {
    if (!file) throw new Error('请先上传文件');
    if (!/\.xlsx$/i.test(file.name)) throw new Error('只能上传xlsx文件');
    if (file.size > 10 * 1024 * 1024) throw new Error('文件大小不能超过10M');
  }
  async function importSuppliers() {
    if (state.busy || state.importPhase !== 'upload') return;
    try { validateImportFile(state.importFile); }
    catch (error) { importMessage(error.message); return; }
    const version = state.importVersion;
    const file = state.importFile;
    const button = document.getElementById('psImportConfirm');
    state.busy = true;
    button.disabled = true;
    button.textContent = '导入中…';
    importMessage('');
    try {
      const bytes = await file.arrayBuffer();
      if (version !== state.importVersion) return;
      const result = window.SupplierImportService.importData(bytes);
      renderRows();
      renderImportResult(result);
    } catch (error) {
      if (version === state.importVersion) importMessage(error.message || '导入失败，请检查文件');
    } finally { state.busy = false; button.disabled = false; button.textContent = '导入'; }
  }
  function confirmAction(action, id) {
    const row = service.get(id);
    if (!row) return toast('供应商不存在或已删除');
    const titles = { delete: '删除供应商', disable: '禁用供应商', enable: '启用供应商', password: '重置密码' };
    const messages = { delete: '确定要删除该供应商吗？', disable: '确定要禁用该供应商吗？', enable: '确定要启用该供应商吗？', password: '确定要重置该供应商的密码吗？' };
    state.pending = { action, id };
    overlay.innerHTML = `<div class="ps-modal-backdrop"><section class="ps-modal" role="dialog" aria-modal="true" aria-labelledby="psModalTitle">
      <header class="ps-modal-header"><h2 id="psModalTitle">${titles[action]}</h2><button type="button" class="ps-modal-close" data-ps-action="close-modal" aria-label="关闭">×</button></header>
      <div class="ps-modal-body">${action === 'delete' ? deleteArt : ''}<p>${messages[action]}</p><p class="ps-error" id="psModalError" hidden></p></div>
      <footer class="ps-modal-actions"><button class="btn" type="button" data-ps-action="close-modal">取消</button><button class="btn btn-primary" type="button" data-ps-action="confirm">确认</button></footer>
    </section></div>`;
  }
  function renderRows() {
    const all = service.list(state.condition);
    state.page = Math.min(state.page, Math.max(1, Math.ceil(all.length / state.pageSize)));
    const offset = (state.page - 1) * state.pageSize;
    document.getElementById('psTableBody').innerHTML = all.slice(offset, offset + state.pageSize).map((row, index) => `<tr>
      <td>${offset + index + 1}</td><td><button class="ps-link" type="button" data-ps-action="view" data-id="${esc(row.id)}">${esc(row.name)}</button></td>
      <td>${esc(row.contact)}</td><td>${esc(row.phone)}</td><td>${row.cooperationStart && row.cooperationEnd ? `${esc(row.cooperationStart)}~${esc(row.cooperationEnd)}` : '--'}</td>
      <td><span class="ps-status${row.status === 'DISABLE' ? ' is-disabled' : ''}">${row.status === 'DISABLE' ? '禁用' : '启用'}</span></td>
      <td><div class="ps-actions"><button class="ps-link" type="button" data-ps-action="edit" data-id="${esc(row.id)}">编辑</button>
        <button class="ps-link" type="button" data-ps-action="${row.status === 'DISABLE' ? 'enable' : 'disable'}" data-id="${esc(row.id)}">${row.status === 'DISABLE' ? '启用' : '禁用'}</button>
        <button class="ps-link danger" type="button" data-ps-action="delete" data-id="${esc(row.id)}">删除</button></div></td></tr>`).join('')
      || '<tr><td colspan="7" class="ps-empty">暂无数据</td></tr>';
    state.pagination.update({ page: state.page, pageSize: state.pageSize, total: all.length });
  }
  function renderList() {
    page.classList.remove('is-form');
    page.innerHTML = `<div class="ps-filters" aria-label="供应商查询">
      <div class="ps-filter"><label for="psFilterName">供应商名称</label><input class="filter-input" id="psFilterName" placeholder="请输入" value="${esc(state.condition.name || '')}"></div>
      <div class="ps-filter"><label for="psFilterContact">供应商联系人</label><input class="filter-input" id="psFilterContact" placeholder="请输入" value="${esc(state.condition.contact || '')}"></div>
      <div class="ps-filter"><label for="psFilterStatus">状态</label><select class="filter-select" id="psFilterStatus"><option value="">全部</option><option value="ENABLE"${state.condition.status === 'ENABLE' ? ' selected' : ''}>启用</option><option value="DISABLE"${state.condition.status === 'DISABLE' ? ' selected' : ''}>禁用</option></select></div>
      <div class="ps-query-actions"><button class="btn btn-primary" type="button" data-ps-action="query">查询</button><button class="btn" type="button" data-ps-action="reset">重置</button></div>
    </div><div class="ps-toolbar"><button class="btn btn-primary" type="button" data-ps-action="add">添加供应商</button>
      <button class="btn" type="button" data-ps-action="import">导入供应商</button></div>
    <div class="ps-table-scroll"><table class="ps-table"><thead><tr>${['序号', '供应商名称', '供应商联系人', '联系电话', '合作期限', '状态', '操作'].map((label) => `<th scope="col">${label}</th>`).join('')}</tr></thead><tbody id="psTableBody"></tbody></table></div>
    <div id="psPagination" class="pagination"></div>`;
    state.pagination = window.Pagination.create({ container: '#psPagination', page: state.page, pageSize: state.pageSize,
      total: 0, pageSizeOptions: [20, 50, 100], showArrows: true, onChange({ page: nextPage, pageSize }) {
        state.page = nextPage; state.pageSize = pageSize; renderRows();
      } });
    renderRows();
  }
  function toggle(key, label, hint, locked = false) {
    return `<div class="ps-form-row"><label class="ps-form-label" for="${fieldId(key)}">${label}</label><div class="ps-toggle-content">
      <label class="ps-switch"><input type="checkbox" role="switch" name="${key}" id="${fieldId(key)}"${state.record?.[key] ? ' checked' : ''}${locked || state.readonly ? ' disabled' : ''}><span aria-hidden="true"></span></label><span class="ps-toggle-hint">${hint}</span>
    </div></div>`;
  }
  function uploadMarkup(type, small = false) {
    if (state.readonly) return '';
    return `<label class="ps-upload${small ? ' ps-upload-other' : ''}" aria-label="${small ? '添加其他资质' : '选择营业执照'}"><input type="file" accept="image/png,image/jpeg,.png,.jpg,.jpeg" data-ps-upload="${type}"${small ? ' multiple' : ''} hidden>
      <span class="ps-upload-plus">+</span>${small ? '' : '<span>选择文件</span>'}</label>`;
  }
  function attachmentMarkup(entry, type) {
    const url = state.urls.get(entry.id);
    return `<div class="ps-image-item">${url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer"><img src="${esc(url)}" alt="${esc(entry.name)}"></a>` : `<span>${esc(entry.name)}</span>`}
      ${state.readonly ? '' : `<button class="ps-image-remove" type="button" data-ps-action="remove-file" data-type="${type}" data-id="${esc(entry.id)}" aria-label="移除${esc(entry.name)}">×</button>`}</div>`;
  }
  function renderAttachments() {
    document.getElementById('psLicenseFiles').innerHTML = `${state.license ? attachmentMarkup(state.license, 'license') : ''}${uploadMarkup('license')}`;
    document.getElementById('psQualificationFiles').innerHTML = `${state.qualifications.map((entry) => attachmentMarkup(entry, 'qualification')).join('')}${uploadMarkup('qualification', true)}`;
  }
  async function hydrateAttachments(version) {
    const all = [state.license, ...state.qualifications].filter(Boolean);
    for (const entry of all) {
      try {
        const blob = await assets.get(entry.id);
        if (version !== state.version) return;
        if (blob) state.urls.set(entry.id, URL.createObjectURL(blob));
      } catch (error) { if (version === state.version) toast('部分资质图片读取失败'); }
    }
    if (version === state.version) renderAttachments();
  }
  function renderForm(id, readonly = false) {
    const record = id ? service.get(id) : null;
    if (id && !record) {
      page.innerHTML = '<p>供应商不存在或已删除</p><button class="btn" type="button" data-ps-action="back">返回供应商档案</button>';
      return;
    }
    state.record = record;
    state.readonly = readonly;
    state.license = record?.businessLicense || null;
    state.qualifications = [...(record?.qualifications || [])];
    page.classList.add('is-form');
    const title = readonly ? '供应商详情' : id ? '编辑供应商' : '添加供应商';
    page.innerHTML = `<header class="ps-form-header"><button type="button" class="ps-back" data-ps-action="back">${backIcon}返回</button><h1>${title}</h1></header>
    <form class="ps-form" id="psSupplierForm" novalidate><fieldset class="ps-fieldset" id="psSupplierFields">
      <section class="ps-form-section" aria-label="供应商基本信息">
        ${input('name', '供应商名称', '请输入供应商名称', 'text', true)}
        <div class="ps-form-row"><label class="ps-form-label ps-required" for="ps-username">用户名</label><div class="ps-form-control">
          <div class="ps-username"><input class="ps-text-input" id="ps-username" name="username" placeholder="请输入用户名" maxlength="20" value="${esc(record?.username || '')}" required${id || readonly ? ' disabled' : ''} aria-describedby="psUsernameHint psError-username">
            ${id && !readonly ? `<button class="ps-link" type="button" data-ps-action="password" data-id="${esc(id)}">重置密码</button>` : ''}</div>
          ${errorMarkup('username')}<p class="ps-username-hint" id="psUsernameHint">请输入6~20位由字母、数字组成的用户名。</p>
        </div></div>
        ${input('contact', '联系人', '请输入供应商联系人', 'text', true)}${input('phone', '联系电话', '请输入联系电话', 'tel', true)}
      </section>
      <section class="ps-form-section" aria-label="营业执照信息"><div class="ps-form-row"><span class="ps-form-label">营业执照</span><div class="ps-form-control">
        <div class="ps-upload-list" id="psLicenseFiles"></div><p class="ps-upload-hint">支持png、jpg、jpeg图片格式，单张图片不超过20M。</p>
        <div class="ps-license-info"><div class="ps-license-notice"><i class="ps-info-icon" aria-hidden="true">i</i>请仔细核对营业执照信息，若信息不符，请手动修改。</div>
          <div class="ps-license-fields"><div><label for="ps-creditCode">统一社会信用代码</label><input class="ps-text-input" name="creditCode" id="ps-creditCode" placeholder="请输入统一社会信用代码" value="${esc(record?.creditCode || '')}"${readonly ? ' disabled' : ''}></div>
            <div><label for="ps-address">住所</label><input class="ps-text-input" name="address" id="ps-address" placeholder="请输入住所" value="${esc(record?.address || '')}"${readonly ? ' disabled' : ''}></div></div>
        </div></div></div></section>
      <section class="ps-form-section" aria-label="其他资质"><div class="ps-form-row"><span class="ps-form-label">其他资质</span><div class="ps-form-control">
        <div class="ps-upload-list" id="psQualificationFiles"></div><p class="ps-upload-hint ps-other-hint">请上传食品经营许可证、质量管理体系认证证书等。<br>支持png、jpg、jpeg等图片格式，单张图片不超过20M。</p>
      </div></div></section>
      <section class="ps-form-section" aria-label="合作设置"><div class="ps-form-row"><label class="ps-form-label" for="psCooperationRange">合作期限</label><div class="ps-form-control">
        <div class="date-range-picker ps-range" id="psCooperation"><input type="text" class="date-range-display" id="psCooperationRange" readonly placeholder="请选择日期　　-　　请选择日期"${readonly ? ' disabled' : ''}>
          <input type="hidden" data-date-start value="${esc(record?.cooperationStart || '')}"><input type="hidden" data-date-end value="${esc(record?.cooperationEnd || '')}">${calendarIcon}</div>${errorMarkup('cooperation')}
      </div></div>
        ${toggle('jointSupplier', '联营供应商', '保存后无法编辑', Boolean(id))}
        ${toggle('hideCustomerPrice', '隐藏客户价格', '开启后，该供应商端将不显示客户的单价和金额')}
      </section>
      <p class="ps-form-message" id="psFormMessage" role="alert" hidden></p>
      <footer class="ps-form-actions"><button class="btn" type="button" data-ps-action="back">${readonly ? '返回' : '取消'}</button>${readonly ? '' : '<button class="btn btn-primary" type="submit" id="psSave">保存</button>'}</footer>
    </fieldset></form>`;
    renderAttachments();
    if (readonly) document.getElementById('psCooperationRange').value = record.cooperationStart ? `${record.cooperationStart} - ${record.cooperationEnd}` : '';
    else state.picker = window.DateRangePicker.create({ container: '#psCooperation', separator: ' - ' });
    hydrateAttachments(state.version);
  }
  function renderRoute() {
    state.version++;
    state.picker?.destroy(); state.picker = null;
    state.urls.forEach((url) => URL.revokeObjectURL(url)); state.urls.clear();
    closeModal();
    const [view = 'list', encodedId = ''] = window.location.hash.replace(/^#/, '').split('/');
    let id;
    try { id = decodeURIComponent(encodedId); } catch (error) { id = ''; }
    if (view === 'add') renderForm('');
    else if (['edit', 'view'].includes(view) && id) renderForm(id, view === 'view');
    else renderList();
  }
  function showErrors(errors) {
    root.querySelectorAll('.ps-error').forEach((element) => { element.hidden = true; element.textContent = ''; });
    root.querySelectorAll('[aria-invalid="true"]').forEach((element) => element.removeAttribute('aria-invalid'));
    Object.entries(errors).forEach(([key, message]) => {
      const error = document.getElementById(`psError-${key}`);
      if (error) { error.textContent = message; error.hidden = false; }
      const control = key === 'cooperation' ? document.getElementById('psCooperationRange') : document.getElementById(fieldId(key));
      control?.setAttribute('aria-invalid', 'true');
    });
  }
  async function save(event) {
    event.preventDefault();
    if (state.busy || state.readonly) return;
    const form = document.getElementById('psSupplierForm');
    const value = (key) => form.elements[key].value.trim();
    const dates = state.picker?.getValue() || {};
    const data = { name: value('name'), username: value('username'), contact: value('contact'), phone: value('phone'),
      creditCode: value('creditCode'), address: value('address'), cooperationStart: dates.startDate || '', cooperationEnd: dates.endDate || '',
      jointSupplier: form.elements.jointSupplier.checked, hideCustomerPrice: form.elements.hideCustomerPrice.checked };
    const errors = service.validate(data, state.record?.id || '');
    showErrors(errors);
    if (Object.keys(errors).length) return;
    const newFiles = [];
    const previousIds = assetIds(state.record);
    const recordId = state.record?.id || '';
    const version = state.version;
    const license = state.license;
    const qualifications = [...state.qualifications];
    state.busy = true;
    const fields = document.getElementById('psSupplierFields');
    fields.disabled = true;
    const message = document.getElementById('psFormMessage');
    message.hidden = true;
    const persist = async (entry) => {
      if (!entry) return null;
      if (!entry.file) return entry;
      const metadata = await assets.save(entry.file);
      newFiles.push(metadata.id);
      return metadata;
    };
    try {
      data.businessLicense = await persist(license);
      data.qualifications = [];
      for (const entry of qualifications) data.qualifications.push(await persist(entry));
      const saved = service.save(data, recordId);
      const retained = new Set(assetIds(saved));
      previousIds.filter((id) => !retained.has(id)).forEach((id) => assets.remove(id).catch(() => {}));
      toast('保存成功');
      if (version === state.version) go('list');
    } catch (error) {
      await Promise.allSettled(newFiles.map((id) => assets.remove(id)));
      if (error.fields) showErrors(error.fields);
      else { message.textContent = error.message || '保存失败，请重试'; message.hidden = false; }
    } finally { state.busy = false; fields.disabled = false; }
  }
  root.addEventListener('submit', (event) => { if (event.target.id === 'psSupplierForm') return save(event); });
  root.addEventListener('click', (event) => {
    const target = event.target.closest('[data-ps-action]');
    if (!target || state.busy) return;
    const action = target.dataset.psAction;
    const id = target.dataset.id;
    if (action === 'import') {
      closeModal();
      try { renderImportUpload(); } catch (error) { closeModal(); toast(error.message || '导入组件加载失败'); }
      return;
    }
    if (action === 'import-upload') return document.getElementById('psImportFile').click();
    if (action === 'import-confirm') return importSuppliers();
    if (action === 'import-previous') return renderImportUpload();
    if (action === 'add') return go('add');
    if (action === 'edit' || action === 'view') return go(action, id);
    if (action === 'back') return go('list');
    if (action === 'close-modal') return closeModal();
    if (['delete', 'disable', 'enable', 'password'].includes(action)) return confirmAction(action, id);
    if (action === 'confirm' && state.pending) {
      const pending = state.pending;
      try {
        if (pending.action === 'delete') {
          const removed = service.remove(pending.id);
          assetIds(removed).forEach((key) => assets.remove(key).catch(() => {}));
        } else if (pending.action === 'password') service.resetPassword(pending.id);
        else service.setStatus(pending.id, pending.action === 'enable' ? 'ENABLE' : 'DISABLE');
        closeModal();
        if (pending.action !== 'password') renderRows();
        toast(pending.action === 'password' ? '密码已重置' : '操作成功');
      } catch (error) { const message = document.getElementById('psModalError'); message.textContent = error.message; message.hidden = false; }
      return;
    }
    if (action === 'query') {
      state.condition = { name: document.getElementById('psFilterName').value.trim(), contact: document.getElementById('psFilterContact').value.trim(), status: document.getElementById('psFilterStatus').value };
      state.page = 1; return renderRows();
    }
    if (action === 'reset') { state.condition = {}; state.page = 1; return renderList(); }
    if (action === 'remove-file' && !state.readonly) {
      if (target.dataset.type === 'license') state.license = null;
      else state.qualifications = state.qualifications.filter((entry) => entry.id !== id);
      renderAttachments();
    }
  });
  root.addEventListener('change', (event) => {
    if (event.target.id === 'psImportFile') {
      if (state.busy || state.importPhase !== 'upload') return;
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        validateImportFile(file);
        state.importFile = file;
        document.getElementById('psImportFileName').textContent = file.name;
        importMessage('');
      } catch (error) {
        state.importFile = null;
        event.target.value = '';
        document.getElementById('psImportFileName').textContent = '';
        importMessage(error.message);
      }
      return;
    }
    const type = event.target.dataset.psUpload;
    if (!type || state.readonly || state.busy) return;
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    try {
      files.forEach((file) => assets.validate(file));
      const entries = files.map((file) => {
        const id = `DRAFT-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        state.urls.set(id, URL.createObjectURL(file));
        return { id, name: file.name, file };
      });
      if (type === 'license') state.license = entries[0];
      else state.qualifications.push(...entries);
      renderAttachments();
    } catch (error) { toast(error.message); }
    event.target.value = '';
  });
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeModal();
    if (event.key === 'Enter' && event.target.closest('.ps-filters')) {
      event.preventDefault();
      root.querySelector('[data-ps-action="query"]').click();
    }
  });
  window.addEventListener('hashchange', renderRoute);
  renderRoute();
})();
