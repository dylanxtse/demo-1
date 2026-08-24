(function () {

  const pageContent = `
    <div class="page-card unit-measurement-page">
      <div class="filter-section">
        <div class="filter-panel">
          <div class="filter-fields">
            <div class="filter-group">
              <label class="filter-label" for="unitNameFilter">计量单位</label>
              <input class="filter-input" id="unitNameFilter" maxlength="20" placeholder="请输入">
            </div>
          </div>
          <div class="action-controls">
            <button class="btn btn-primary btn-sm btn-fixed" type="button" data-action="query">查询</button>
            <button class="btn btn-sm btn-fixed" type="button" data-action="reset">重置</button>
          </div>
        </div>
      </div>

      <div class="action-bar">
        <div class="action-main">
          <button class="btn btn-primary btn-sm" type="button" data-action="add-unit">添加计量单位</button>
          <button class="btn btn-sm btn-blue" type="button" data-action="open-import">批量导入</button>
        </div>
      </div>

      <div class="table-container">
        <div class="table-wrapper">
          <table class="data-table unit-table">
            <thead>
              <tr>
                <th class="center" style="width:70px;">序号</th>
                <th>计量单位</th>
                <th>与“KG”换算率</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody id="unitTableBody"></tbody>
          </table>
        </div>
        <div class="pagination" id="unitPagination"></div>
      </div>

      <div class="unit-modal" id="unitFormModal" aria-hidden="true">
        <div class="unit-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="unitFormTitle">
          <div class="unit-modal-header">
            <h2 id="unitFormTitle">添加计量单位</h2>
            <button class="unit-modal-close" type="button" data-action="close-form" aria-label="关闭">×</button>
          </div>
          <form id="unitForm" novalidate>
            <div class="unit-modal-body">
              <div class="unit-form-row">
                <label class="unit-form-label required" for="unitName">计量单位</label>
                <div>
                  <input class="unit-form-control" id="unitName" maxlength="20" autocomplete="off">
                  <div class="unit-field-error" id="unitNameError"></div>
                </div>
              </div>
              <div class="unit-form-row">
                <label class="unit-form-label" for="unitConversionRate">与"KG"的换算率</label>
                <div>
                  <input class="unit-form-control" id="unitConversionRate" type="number" min="0.0001" max="99999" step="0.0001" placeholder="请输入">
                  <div class="unit-field-error" id="unitConversionRateError"></div>
                </div>
              </div>
            </div>
            <div class="unit-modal-actions">
              <button class="btn" type="button" data-action="close-form">取消</button>
              <button class="btn btn-primary" type="submit">确定</button>
            </div>
          </form>
        </div>
      </div>

      <div class="unit-modal" id="unitConfirmModal" aria-hidden="true">
        <div class="unit-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="unitConfirmTitle">
          <div class="unit-modal-header">
            <h2 id="unitConfirmTitle">删除计量单位</h2>
            <button class="unit-modal-close" type="button" data-action="close-confirm" aria-label="关闭">×</button>
          </div>
          <div class="unit-modal-body">
            <p class="unit-confirm-tip" id="unitConfirmTip">确认删除被选中计量单位</p>
          </div>
          <div class="unit-modal-actions" id="unitConfirmActions">
            <button class="btn" type="button" data-action="close-confirm">取消</button>
            <button class="btn btn-primary" type="button" data-action="confirm-delete">确定</button>
          </div>
        </div>
      </div>

      <div class="unit-modal" id="unitImportModal" aria-hidden="true">
        <div class="unit-modal-dialog unit-import-dialog" role="dialog" aria-modal="true" aria-labelledby="unitImportTitle">
          <div class="unit-modal-header">
            <h2 id="unitImportTitle">批量导入计量单位</h2>
            <button class="unit-modal-close" type="button" data-action="close-import" aria-label="关闭">×</button>
          </div>
          <div class="unit-modal-body">
            <div class="unit-import-help">
              请选择 CSV 文件，表头为“计量单位,与KG换算率”。<br>
              <button class="btn-text" type="button" data-action="download-template">下载计量单位模板</button>
            </div>
            <input class="unit-import-file" id="unitImportFile" type="file" accept=".csv,text/csv">
            <div class="unit-import-result" id="unitImportResult" role="status"></div>
          </div>
          <div class="unit-modal-actions">
            <button class="btn" type="button" data-action="close-import">取消</button>
            <button class="btn btn-primary" type="button" data-action="confirm-import">开始导入</button>
          </div>
        </div>
      </div>

      <div class="unit-toast" id="unitToast" role="status"></div>
    </div>
  `;

  const state = {
    items: [],
    total: 0,
    page: 1,
    pageSize: 10,
    keyword: '',
    pagination: null,
    editingId: null,
    deletingId: null,
    totalPages: 1,
    toastTimer: null
  };

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function setModalVisibility(id, visible) {
    const modal = document.getElementById(id);
    modal.classList.toggle('is-visible', visible);
    modal.setAttribute('aria-hidden', String(!visible));
  }

  function showToast(message, type = 'success') {
    const toast = document.getElementById('unitToast');
    clearTimeout(state.toastTimer);
    toast.textContent = message;
    toast.className = `unit-toast is-visible ${type}`;
    state.toastTimer = setTimeout(() => {
      toast.className = 'unit-toast';
    }, 2200);
  }

  function displayRate(value) {
    if (value === '' || value == null) return '--';
    return String(Number(value));
  }

  function renderTable() {
    const body = document.getElementById('unitTableBody');
    if (!state.items.length) {
      body.innerHTML = '<tr class="unit-empty-row"><td colspan="5">暂无数据</td></tr>';
      return;
    }
    body.innerHTML = state.items.map((item, index) => {
      const enabled = item.status === 'ENABLE';
      const sequence = (state.page - 1) * state.pageSize + index + 1;
      return `
        <tr>
          <td class="seq-cell">${sequence}</td>
          <td>${escapeHtml(item.unitName)}</td>
          <td>${escapeHtml(displayRate(item.conversionRate))}</td>
          <td><span class="status-tag ${enabled ? 'online' : 'offline'}">${enabled ? '启用' : '禁用'}</span></td>
          <td class="action-cell">
            <button class="btn-text" type="button" data-row-action="${enabled ? 'disable' : 'enable'}" data-id="${escapeHtml(item.id)}">${enabled ? '禁用' : '启用'}</button>
            <span class="action-divider"></span>
            <button class="btn-text" type="button" data-row-action="edit" data-id="${escapeHtml(item.id)}">编辑</button>
            <span class="action-divider"></span>
            <button class="btn-text danger" type="button" data-row-action="delete" data-id="${escapeHtml(item.id)}">删除</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderPagination() {
    state.totalPages = Math.max(1, Math.ceil(state.total / state.pageSize));
    state.pagination?.update({ page: state.page, pageSize: state.pageSize, total: state.total });
  }

  async function loadPage() {
    try {
      let result = await window.UnitMeasurementService.list({
        page: state.page,
        pageSize: state.pageSize,
        condition: { unitName: state.keyword }
      });
      if (result.total > 0 && result.items.length === 0 && state.page > 1) {
        state.page = Math.max(1, Math.ceil(result.total / state.pageSize));
        result = await window.UnitMeasurementService.list({
          page: state.page,
          pageSize: state.pageSize,
          condition: { unitName: state.keyword }
        });
      }
      state.items = result.items;
      state.total = result.total;
      state.page = result.page;
      renderTable();
      renderPagination();
    } catch (error) {
      state.items = [];
      state.total = 0;
      renderTable();
      renderPagination();
      showToast(error.message || '数据加载失败', 'error');
    }
  }

  function query() {
    state.keyword = document.getElementById('unitNameFilter').value.trim();
    state.page = 1;
    loadPage();
  }

  function reset() {
    document.getElementById('unitNameFilter').value = '';
    state.keyword = '';
    state.page = 1;
    state.pageSize = 10;
    loadPage();
  }

  function clearFormErrors() {
    ['unitName', 'unitConversionRate'].forEach((id) => {
      document.getElementById(id).removeAttribute('aria-invalid');
    });
    document.getElementById('unitNameError').textContent = '';
    document.getElementById('unitConversionRateError').textContent = '';
  }

  function openForm(item) {
    state.editingId = item?.id || null;
    document.getElementById('unitFormTitle').textContent = item ? '编辑计量单位' : '添加计量单位';
    document.getElementById('unitName').value = item?.unitName || '';
    document.getElementById('unitConversionRate').value = item?.conversionRate ?? '';
    clearFormErrors();
    setModalVisibility('unitFormModal', true);
    document.getElementById('unitName').focus();
  }

  function closeForm() {
    state.editingId = null;
    document.getElementById('unitForm').reset();
    clearFormErrors();
    setModalVisibility('unitFormModal', false);
  }

  function validateForm() {
    clearFormErrors();
    const unitName = document.getElementById('unitName').value.trim();
    const rateValue = document.getElementById('unitConversionRate').value.trim();
    let valid = true;
    if (!unitName) {
      document.getElementById('unitName').setAttribute('aria-invalid', 'true');
      document.getElementById('unitNameError').textContent = '此项必填';
      valid = false;
    }
    if (rateValue !== '') {
      const rate = Number(rateValue);
      if (!Number.isFinite(rate) || rate < 0.0001 || rate > 99999) {
        document.getElementById('unitConversionRate').setAttribute('aria-invalid', 'true');
        document.getElementById('unitConversionRateError').textContent = '请输入0.0001至99999之间的数值';
        valid = false;
      } else if (!/^\d+(?:\.\d{1,4})?$/.test(rateValue)) {
        document.getElementById('unitConversionRate').setAttribute('aria-invalid', 'true');
        document.getElementById('unitConversionRateError').textContent = '最多输入4位小数';
        valid = false;
      }
    }
    return valid ? { unitName, conversionRate: rateValue } : null;
  }

  async function submitForm(event) {
    event.preventDefault();
    const data = validateForm();
    if (!data) return;
    try {
      if (state.editingId) await window.UnitMeasurementService.update(state.editingId, data);
      else await window.UnitMeasurementService.create(data);
      closeForm();
      await loadPage();
      showToast('操作成功');
    } catch (error) {
      if (error.code === 'DUPLICATE_UNIT') {
        document.getElementById('unitName').setAttribute('aria-invalid', 'true');
        document.getElementById('unitNameError').textContent = error.message;
        return;
      }
      if (error.code === 'UNIT_LINKED') closeForm();
      showAlert('编辑计量单位', error.message || '操作失败');
    }
  }

  function showAlert(title, tip) {
    state.deletingId = null;
    document.getElementById('unitConfirmTitle').textContent = title;
    document.getElementById('unitConfirmTip').textContent = tip;
    document.getElementById('unitConfirmActions').innerHTML =
      '<button class="btn btn-primary" type="button" data-action="close-confirm">知道了</button>';
    setModalVisibility('unitConfirmModal', true);
  }

  function openDelete(id) {
    state.deletingId = id;
    document.getElementById('unitConfirmTitle').textContent = '删除计量单位';
    document.getElementById('unitConfirmTip').textContent = '确认删除被选中计量单位';
    document.getElementById('unitConfirmActions').innerHTML = `
      <button class="btn" type="button" data-action="close-confirm">取消</button>
      <button class="btn btn-primary" type="button" data-action="confirm-delete">确定</button>
    `;
    setModalVisibility('unitConfirmModal', true);
  }

  function closeConfirm() {
    state.deletingId = null;
    setModalVisibility('unitConfirmModal', false);
  }

  async function confirmDelete() {
    if (!state.deletingId) return;
    try {
      await window.UnitMeasurementService.remove(state.deletingId);
      closeConfirm();
      await loadPage();
      showToast('操作成功');
    } catch (error) {
      if (error.code === 'UNIT_LINKED') {
        showAlert('删除计量单位', '已经关联商品，不能删除');
      } else {
        closeConfirm();
        showToast(error.message || '删除失败', 'error');
      }
    }
  }

  async function transition(id, action) {
    try {
      await window.UnitMeasurementService.transition(id, action);
      await loadPage();
      showToast('操作成功');
    } catch (error) {
      showToast(error.message || '状态更新失败', 'error');
    }
  }

  function openImport() {
    document.getElementById('unitImportFile').value = '';
    document.getElementById('unitImportResult').textContent = '';
    setModalVisibility('unitImportModal', true);
  }

  function closeImport() {
    setModalVisibility('unitImportModal', false);
  }

  function downloadText(filename, text) {
    const blob = new Blob([`\uFEFF${text}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function parseCsv(text) {
    const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2) return [];
    return lines.slice(1).map((line) => {
      const columns = line.split(',').map((value) => value.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
      return { unitName: columns[0] || '', conversionRate: columns[1] || '' };
    });
  }

  async function confirmImport() {
    const file = document.getElementById('unitImportFile').files[0];
    const resultElement = document.getElementById('unitImportResult');
    if (!file) {
      resultElement.textContent = '请选择需要导入的CSV文件';
      return;
    }
    try {
      const rows = parseCsv(await file.text());
      if (!rows.length) {
        resultElement.textContent = '文件中没有可导入的数据';
        return;
      }
      const result = await window.UnitMeasurementService.import(rows);
      const failures = result.failList.length ? `\n${result.failList.join('\n')}` : '';
      resultElement.textContent = `成功导入 ${result.successCount} 条，失败 ${result.failCount} 条${failures}`;
      await loadPage();
      if (result.successCount > 0) showToast('导入完成');
    } catch (error) {
      resultElement.textContent = error.message || '文件读取失败';
    }
  }

  function bindEvents() {
    const root = document.getElementById('pageContent');
    root.addEventListener('click', async (event) => {
      const actionTarget = event.target.closest('[data-action]');
      const action = actionTarget?.dataset.action;
      if (action === 'query') query();
      if (action === 'reset') reset();
      if (action === 'add-unit') openForm();
      if (action === 'close-form') closeForm();
      if (action === 'open-import') openImport();
      if (action === 'close-import') closeImport();
      if (action === 'download-template') downloadText('计量单位模板.csv', '计量单位,与KG换算率\n示例单位,1');
      if (action === 'confirm-import') confirmImport();
      if (action === 'close-confirm') closeConfirm();
      if (action === 'confirm-delete') confirmDelete();

      const rowAction = event.target.closest('[data-row-action]');
      if (!rowAction) return;
      const id = rowAction.dataset.id;
      const type = rowAction.dataset.rowAction;
      if (type === 'enable' || type === 'disable') await transition(id, type);
      if (type === 'edit') openForm(await window.UnitMeasurementService.get(id));
      if (type === 'delete') openDelete(id);
    });

    document.getElementById('unitForm').addEventListener('submit', submitForm);
    document.getElementById('unitNameFilter').addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        query();
      }
    });
  }

  window.AppShell.mount({ title: '计量单位', content: pageContent });
  state.pagination = window.Pagination.create({
    container: '#unitPagination',
    page: state.page,
    pageSize: state.pageSize,
    total: state.total,
    pageSizeOptions: [10, 20, 50],
    onChange: async ({ page, pageSize }) => {
      state.page = page;
      state.pageSize = pageSize;
      await loadPage();
    }
  });
  bindEvents();
  loadPage();
})();
