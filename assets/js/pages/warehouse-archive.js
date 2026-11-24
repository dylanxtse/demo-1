(function () {
  const service = window.WarehouseArchiveService, esc = window.DomUtils.escapeHtml;
  const calendar = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M7 2v6M17 2v6"/></svg>';
  const art = (blocked) => `<svg class="wa-delete-art" viewBox="0 0 160 160" aria-hidden="true"><path d="M24 6v148M50 6v148" stroke="#f1f3f8"/><circle cx="25" cy="48" r="13" stroke="#edf4ff" fill="none"/><path d="m35 50 11 96h79l12-96" fill="#2e6dff"/><path d="M26 36h116v9H26zM65 27h34v9H65z" fill="#174bcc"/><path d="m65 65 4 61M83 65v61M101 65l-4 61" stroke="#1550d6" stroke-width="9"/>${blocked ? '<path d="M103 104V95a16 16 0 0 1 32 0v9" fill="none" stroke="#102c55" stroke-width="5"/><path d="M85 103h66v44H85z" fill="#a8cbff"/><path d="M106 124h25" stroke="#fff" stroke-width="7"/><circle cx="57" cy="127" r="18" fill="#c7ddff" stroke="#174bcc" stroke-width="4"/><path d="m44 140 26-26" stroke="#174bcc" stroke-width="4"/>' : '<path d="M5 65h45M5 85h45" stroke="#102c55" stroke-width="5"/><path d="m43 57 14 8-14 8m0 4 14 8-14 8" fill="#102c55"/>'}</svg>`;
  const root = window.AppShell.mount({ title: '仓库档案', content: `<section class="warehouse-archive-page" aria-label="仓库档案">
    <div class="wa-query"><div class="wa-query-grid">
      <div class="wa-query-field"><label for="warehouseCodeFilter">仓库编码</label><input class="filter-input" id="warehouseCodeFilter" placeholder="请输入仓库编码"></div>
      <div class="wa-query-field"><label for="warehouseNameFilter">仓库名称</label><input class="filter-input" id="warehouseNameFilter" placeholder="请输入"></div>
      <div class="wa-query-field"><label for="warehouseDateRange">添加时间</label><div class="date-range-picker wa-date" id="warehouseDateFilter"><input class="date-range-display" id="warehouseDateRange" type="text" readonly placeholder="请选择日期　　-　　请选择日期"><input type="hidden" data-date-start><input type="hidden" data-date-end>${calendar}</div></div>
    </div><div class="wa-query-actions"><button class="btn btn-primary" type="button" data-wa-action="query">查询</button><button class="btn" type="button" data-wa-action="reset">重置</button></div></div>
    <div class="wa-toolbar"><button class="btn btn-primary" type="button" data-wa-action="add">添加仓库</button><button class="btn" type="button" data-wa-action="import">导入仓库</button></div>
    <div class="wa-table-scroll"><table class="wa-table"><thead><tr>${['序号', '仓库编码', '仓库名称', '地址', '添加时间', '操作'].map((label) => `<th scope="col">${label}</th>`).join('')}</tr></thead><tbody id="warehouseArchiveBody"></tbody></table></div><div class="pagination" id="warehouseArchivePagination"></div>
  </section><div id="warehouseArchiveOverlay"></div><div class="wa-toast" id="warehouseArchiveToast" role="status" hidden></div>` });
  const overlay = document.getElementById('warehouseArchiveOverlay');
  const state = { filter: {}, page: 1, pageSize: 20, pagination: null, pending: null, importFile: null, importPhase: '', importVersion: 0, importUrls: [], importing: false };
  const picker = window.DateRangePicker.create({ container: '#warehouseDateFilter', separator: ' - ' });
  function toast(message) {
    const element = document.getElementById('warehouseArchiveToast'); element.textContent = message; element.hidden = false;
    clearTimeout(toast.timer); toast.timer = setTimeout(() => { element.hidden = true; }, 2200);
  }
  function renderRows() {
    const rows = service.list(state.filter), total = rows.length;
    state.page = Math.min(state.page, Math.max(1, Math.ceil(total / state.pageSize)));
    const start = (state.page - 1) * state.pageSize;
    document.getElementById('warehouseArchiveBody').innerHTML = rows.slice(start, start + state.pageSize).map((row, index) => `<tr data-id="${esc(row.id)}"><td>${start + index + 1}</td>
      <td><button class="wa-link" type="button" data-wa-action="view" data-id="${esc(row.id)}">${esc(row.warehouseCode)}</button></td><td>${esc(row.warehouseName)}</td><td>${esc(row.address || '--')}</td><td>${esc(window.BusinessRules.normalizeDateTime(row.createdAt) || '--')}</td>
      <td><div class="wa-actions"><button type="button" class="wa-link" data-wa-action="edit" data-id="${esc(row.id)}">编辑</button><button type="button" class="wa-link danger" data-wa-action="delete" data-id="${esc(row.id)}">删除</button></div></td></tr>`).join('') || '<tr><td class="wa-empty" colspan="6">暂无数据</td></tr>';
    state.pagination.update({ page: state.page, pageSize: state.pageSize, total });
  }
  function clearImportUrls() {
    state.importUrls.forEach((url) => URL.revokeObjectURL(url));
    state.importUrls = [];
  }
  function close() {
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
    overlay.innerHTML = `<div class="wa-modal-backdrop"><section class="wa-modal wa-import-modal" role="dialog" aria-modal="true" aria-labelledby="waImportTitle">
      <header><h2 id="waImportTitle">导入仓库</h2><button class="wa-close" type="button" data-wa-action="close" aria-label="关闭">×</button></header>
      <div class="wa-modal-body"><div class="wa-import-section"><span class="wa-import-label">下载模板</span>
        <div class="wa-import-template-links"><a class="wa-import-link" href="./warehouse-import-template.html">仓库导入模板.xlsx</a>
          <a class="wa-import-link" href="./warehouse-import-kingdee-template.html">金蝶仓库导入模板.xlsx</a></div></div>
        <div class="wa-import-section"><label class="wa-import-label" for="waImportFile">上传文件</label>
          <div class="wa-import-upload"><button class="btn btn-sm" type="button" data-wa-action="import-upload">上传</button>
            <input type="file" id="waImportFile" accept=".xlsx" hidden><span class="wa-import-hint">只能上传xlsx文件，且不超过10M</span></div>
          <span class="wa-import-filename" id="waImportFileName">${esc(state.importFile?.name || '')}</span></div>
        <p class="wa-error wa-import-message" id="waImportMessage" role="alert" hidden></p>
      </div><footer><button class="btn" type="button" data-wa-action="close">取消</button>
        <button class="btn btn-primary" type="button" data-wa-action="import-confirm" id="waImportConfirm">导入</button></footer>
    </section></div>`;
  }
  function renderImportResult(result) {
    clearImportUrls();
    const errorUrl = result.errors.length ? downloadUrl(window.WarehouseImportService.errorWorkbook(result)) : '';
    state.importPhase = 'result';
    overlay.innerHTML = `<div class="wa-modal-backdrop"><section class="wa-modal wa-import-modal wa-import-result" role="dialog" aria-modal="true" aria-labelledby="waImportResultTitle">
      <header><h2 id="waImportResultTitle">导入仓库</h2><button class="wa-close" type="button" data-wa-action="close" aria-label="关闭">×</button></header>
      <div class="wa-modal-body"><dl class="wa-import-stats" aria-live="polite"><div><dt>新增条数</dt><dd>${result.added}条</dd></div>
        <div><dt>错误条数</dt><dd><span class="wa-import-error-count">${result.errors.length}条</span>
          ${errorUrl ? `<a class="wa-import-link" href="${esc(errorUrl)}" download="仓库错误数据.xlsx">下载错误数据.xlsx</a>` : ''}</dd></div></dl></div>
      <footer><button class="btn" type="button" data-wa-action="close">关闭</button>
        <button class="btn btn-primary" type="button" data-wa-action="import-previous">上一步</button></footer>
    </section></div>`;
  }
  function importMessage(message) {
    const element = document.getElementById('waImportMessage');
    element.textContent = message;
    element.hidden = !message;
  }
  function validateImportFile(file) {
    if (!file) throw new Error('请先上传文件');
    if (!/\.xlsx$/i.test(file.name)) throw new Error('只能上传xlsx文件');
    if (file.size > 10 * 1024 * 1024) throw new Error('文件大小不能超过10M');
  }
  async function importWarehouses() {
    if (state.importing || state.importPhase !== 'upload') return;
    try { validateImportFile(state.importFile); }
    catch (error) { importMessage(error.message); return; }
    const version = state.importVersion, file = state.importFile;
    const button = document.getElementById('waImportConfirm');
    state.importing = true;
    button.disabled = true;
    button.textContent = '导入中…';
    importMessage('');
    try {
      const bytes = await file.arrayBuffer();
      if (version !== state.importVersion) return;
      const result = await window.WarehouseImportService.importData(bytes);
      if (version !== state.importVersion) return;
      renderRows();
      renderImportResult(result);
    } catch (error) {
      if (version === state.importVersion) importMessage(error.message || '导入失败，请检查文件');
    } finally { state.importing = false; button.disabled = false; button.textContent = '导入'; }
  }
  function shell(title, body, footer, small = false) {
    overlay.innerHTML = `<div class="wa-modal-backdrop"><section class="wa-modal${small ? ' is-small' : ''}" role="dialog" aria-modal="true" aria-labelledby="warehouseModalTitle"><header><h2 id="warehouseModalTitle">${title}</h2><button class="wa-close" type="button" data-wa-action="close" aria-label="关闭">×</button></header>${body}<footer>${footer}</footer></section></div>`;
  }
  function openForm(id = '', readonly = false) {
    const row = id ? service.get(id) : null;
    if (id && !row) return toast('仓库不存在或已删除');
    state.pending = { action: readonly ? 'view' : 'save', id };
    shell(readonly ? '查看仓库' : id ? '编辑仓库' : '添加仓库', `<form id="warehouseArchiveForm" class="wa-form" novalidate>
      <div class="wa-form-row"><label for="warehouseFormName" class="wa-required">仓库名称</label><input class="wa-input" id="warehouseFormName" name="warehouseName" value="${esc(row?.warehouseName || '')}" placeholder="请输入仓库名称" required${readonly ? ' disabled' : ''}></div>
      <div class="wa-form-row"><label for="warehouseFormAddress">地址</label><input class="wa-input" id="warehouseFormAddress" name="address" value="${esc(row?.address || '')}" placeholder="请输入地址"${readonly ? ' disabled' : ''}></div>
      <p id="warehouseFormError" class="wa-error" role="alert" hidden></p></form>`, readonly ? '<button class="btn" type="button" data-wa-action="close">关闭</button>' : '<button class="btn" type="button" data-wa-action="close">取消</button><button class="btn btn-primary" type="submit" form="warehouseArchiveForm">确认</button>');
  }
  function openDelete(id) {
    const blocked = service.isReferenced(id);
    state.pending = { action: 'delete', id };
    shell('删除仓库', `<div class="wa-delete-body">${art(blocked)}<p>${blocked ? '该仓库已被引用无法删除' : '请再次确定是否删除该仓库？'}</p><p id="warehouseDeleteError" class="wa-error" hidden></p></div>`, blocked
      ? '<button class="btn" type="button" data-wa-action="close">知道了</button>'
      : '<button class="btn" type="button" data-wa-action="close">取消</button><button class="btn btn-primary" type="button" data-wa-action="confirm-delete">确认</button>', true);
  }
  state.pagination = window.Pagination.create({ container: '#warehouseArchivePagination', page: 1, pageSize: 20, total: 0,
    pageSizeOptions: [20, 50, 100], showArrows: true, onChange({ page, pageSize }) { state.page = page; state.pageSize = pageSize; renderRows(); } });
  root.addEventListener('submit', (event) => {
    if (event.target.id !== 'warehouseArchiveForm') return;
    event.preventDefault();
    if (state.pending?.action !== 'save') return;
    try {
      service.save({ warehouseName: document.getElementById('warehouseFormName').value, address: document.getElementById('warehouseFormAddress').value }, state.pending.id);
      close(); renderRows(); toast('保存成功');
    } catch (error) { const element = document.getElementById('warehouseFormError'); element.textContent = error.message; element.hidden = false; }
  });
  root.addEventListener('click', (event) => {
    const button = event.target.closest('[data-wa-action]'); if (!button || button.disabled) return;
    const { waAction: action, id } = button.dataset;
    if (action === 'add') return openForm();
    if (action === 'import') { close(); return renderImportUpload(); }
    if (action === 'import-upload') return document.getElementById('waImportFile').click();
    if (action === 'import-confirm') return importWarehouses();
    if (action === 'import-previous' && state.importPhase === 'result') return renderImportUpload();
    if (action === 'edit' || action === 'view') return openForm(id, action === 'view');
    if (action === 'close') return close();
    if (action === 'delete') { try { openDelete(id); } catch (error) { toast(error.message); } return; }
    if (action === 'confirm-delete' && state.pending?.action === 'delete') {
      try { service.remove(state.pending.id); close(); renderRows(); toast('删除成功'); }
      catch (error) { if (error.code === 'WAREHOUSE_REFERENCED') openDelete(state.pending.id); else { const element = document.getElementById('warehouseDeleteError'); element.textContent = error.message; element.hidden = false; } }
      return;
    }
    if (action === 'query') {
      const dates = picker.getValue();
      state.filter = { warehouseCode: document.getElementById('warehouseCodeFilter').value.trim(), warehouseName: document.getElementById('warehouseNameFilter').value.trim(), dateRange: [dates.startDate, dates.endDate] };
      state.page = 1; return renderRows();
    }
    if (action === 'reset') { state.filter = {}; state.page = 1; document.getElementById('warehouseCodeFilter').value = ''; document.getElementById('warehouseNameFilter').value = ''; picker.clear(false); renderRows(); }
  });
  root.addEventListener('change', (event) => {
    if (event.target.id === 'waImportFile' && state.importPhase === 'upload') {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        validateImportFile(file);
        state.importFile = file;
        document.getElementById('waImportFileName').textContent = file.name;
        importMessage('');
      } catch (error) {
        state.importFile = null;
        event.target.value = '';
        document.getElementById('waImportFileName').textContent = '';
        importMessage(error.message);
      }
      return;
    }
  });
  root.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); if (event.key === 'Enter' && event.target.closest('.wa-query')) { event.preventDefault(); root.querySelector('[data-wa-action="query"]').click(); } });
  renderRows();
})();
