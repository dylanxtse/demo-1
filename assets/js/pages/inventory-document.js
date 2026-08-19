(function () {
  const service = window.OperationsService;
  const params = new URLSearchParams(location.search);
  const type = params.get('type') === 'loss' ? 'loss' : 'count';
  const mode = ['add', 'edit', 'copy', 'review', 'view'].includes(params.get('mode')) ? params.get('mode') : 'view';
  const id = params.get('id') || '';
  const resource = type === 'count' ? 'inventoryCounts' : 'inventoryLosses';
  const entityName = type === 'count' ? '盘点单' : '损溢单';
  const editable = ['add', 'edit', 'copy'].includes(mode);
  let record = null;

  const content = `
    <section class="page-card order-module-page inventory-document-page">
      <div class="inventory-document-title">
        <button class="btn btn-sm" type="button" data-action="back">← 返回</button>
        <h2>${mode === 'add' ? '添加' : mode === 'edit' ? '编辑' : mode === 'copy' ? '复制' : mode === 'review' ? '审核' : '查看'}${entityName}</h2>
        <span id="documentStatus"></span>
      </div>
      <form id="documentForm">
        <section class="inventory-document-section">
          <h3>基本信息</h3>
          <div class="inventory-document-grid" id="basicFields"></div>
        </section>
        <section class="inventory-document-section">
          <div class="inventory-document-section-head">
            <h3>商品明细</h3>
            ${editable ? '<button class="btn btn-primary btn-sm" type="button" data-action="add-row">添加商品</button>' : ''}
          </div>
          <div class="operations-table-wrap">
            <table class="operations-table">
              <thead id="itemsHead"></thead>
              <tbody id="itemsBody"></tbody>
              <tfoot id="itemsFoot"></tfoot>
            </table>
          </div>
        </section>
        <section class="inventory-document-section">
          <label class="inventory-document-remark">备注<textarea name="remark" rows="3" maxlength="200" ${editable ? '' : 'disabled'} placeholder="请输入备注"></textarea></label>
        </section>
        <div class="inventory-document-actions">
          <button class="btn" type="button" data-action="back">${mode === 'view' ? '返回' : '取消'}</button>
          ${editable ? '<button class="btn" type="button" data-action="save">保存</button><button class="btn btn-primary" type="button" data-action="submit">保存并提交</button>' : ''}
          ${mode === 'review' ? '<button class="btn btn-danger" type="button" data-action="close">关闭单据</button><button class="btn btn-primary" type="button" data-action="approve">审核通过</button>' : ''}
        </div>
      </form>
    </section>`;
  const root = window.AppShell.mount({ title: entityName, content });

  const defaults = type === 'count'
    ? { warehouse: '中心仓', countAt: window.BusinessRules.now().slice(0, 16), counter: '当前用户', creator: '当前用户', status: 'PENDING_AUDIT', remark: '', items: [] }
    : { warehouse: '中心仓', type: '盘损', relationNo: '', creator: '当前用户', status: 'PENDING_AUDIT', remark: '', items: [] };

  function escapeHtml(value) {
    return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function toast(message, typeName = '') {
    root.querySelector('.operations-toast')?.remove();
    const element = document.createElement('div');
    element.className = `operations-toast ${typeName}`;
    element.textContent = message;
    root.appendChild(element);
    setTimeout(() => element.remove(), 2000);
  }

  function field(label, name, value, kind = 'text', options = []) {
    const disabled = editable ? '' : 'disabled';
    if (kind === 'select') return `<label><span>${label}</span><select name="${name}" ${disabled}>${options.map((option) => `<option ${option === value ? 'selected' : ''}>${option}</option>`).join('')}</select></label>`;
    return `<label><span>${label}</span><input name="${name}" type="${kind}" value="${escapeHtml(value)}" ${disabled}></label>`;
  }

  function calculate() {
    if (type === 'count') {
      record.items.forEach((item) => {
        item.diffQty = Number(item.countQty || 0) - Number(item.bookQty || 0);
        item.diffAmount = Number((item.diffQty * Number(item.costPrice || 0)).toFixed(2));
      });
      record.lossAmount = Number(record.items.reduce((sum, item) => sum + Math.max(0, -item.diffAmount), 0).toFixed(2));
      record.overflowAmount = Number(record.items.reduce((sum, item) => sum + Math.max(0, item.diffAmount), 0).toFixed(2));
    } else {
      record.items.forEach((item) => { item.amount = Number((Number(item.quantity || 0) * Number(item.price || 0)).toFixed(2)); });
      record.productCount = record.items.length;
      record.amount = Number(record.items.reduce((sum, item) => sum + item.amount, 0).toFixed(2));
    }
  }

  function renderItems() {
    calculate();
    const count = type === 'count';
    root.querySelector('#itemsHead').innerHTML = count
      ? '<tr><th>序号</th><th>商品编号</th><th>商品名称</th><th>分类</th><th>单位</th><th>账面数量</th><th>实盘数量</th><th>差异数量</th><th>成本价</th><th>差异金额</th><th>操作</th></tr>'
      : '<tr><th>序号</th><th>商品编号</th><th>商品名称</th><th>单位</th><th>损溢数量</th><th>成本价</th><th>损溢金额</th><th>原因</th><th>操作</th></tr>';
    root.querySelector('#itemsBody').innerHTML = record.items.length ? record.items.map((item, index) => count ? `
      <tr data-index="${index}"><td>${index + 1}</td>
      <td><input data-key="goodsCode" value="${escapeHtml(item.goodsCode)}" ${editable ? '' : 'disabled'}></td>
      <td><input data-key="goodsName" value="${escapeHtml(item.goodsName)}" ${editable ? '' : 'disabled'}></td>
      <td><input data-key="category" value="${escapeHtml(item.category || '')}" ${editable ? '' : 'disabled'}></td>
      <td><input data-key="unit" value="${escapeHtml(item.unit || '斤')}" ${editable ? '' : 'disabled'}></td>
      <td><input data-key="bookQty" type="number" min="0" value="${Number(item.bookQty || 0)}" ${editable ? '' : 'disabled'}></td>
      <td><input data-key="countQty" type="number" min="0" value="${Number(item.countQty || 0)}" ${editable ? '' : 'disabled'}></td>
      <td class="${item.diffQty < 0 ? 'amount-negative' : 'amount-positive'}">${item.diffQty}</td>
      <td><input data-key="costPrice" type="number" min="0" step="0.01" value="${Number(item.costPrice || 0)}" ${editable ? '' : 'disabled'}></td>
      <td class="${item.diffAmount < 0 ? 'amount-negative' : 'amount-positive'}">¥${item.diffAmount.toFixed(2)}</td>
      <td>${editable ? '<button class="btn-text danger" type="button" data-row-remove>删除</button>' : '--'}</td></tr>` : `
      <tr data-index="${index}"><td>${index + 1}</td>
      <td><input data-key="goodsCode" value="${escapeHtml(item.goodsCode)}" ${editable ? '' : 'disabled'}></td>
      <td><input data-key="goodsName" value="${escapeHtml(item.goodsName)}" ${editable ? '' : 'disabled'}></td>
      <td><input data-key="unit" value="${escapeHtml(item.unit || '斤')}" ${editable ? '' : 'disabled'}></td>
      <td><input data-key="quantity" type="number" min="0" value="${Number(item.quantity || 0)}" ${editable ? '' : 'disabled'}></td>
      <td><input data-key="price" type="number" min="0" step="0.01" value="${Number(item.price || 0)}" ${editable ? '' : 'disabled'}></td>
      <td>¥${Number(item.amount || 0).toFixed(2)}</td>
      <td><input data-key="reason" value="${escapeHtml(item.reason || '')}" ${editable ? '' : 'disabled'}></td>
      <td>${editable ? '<button class="btn-text danger" type="button" data-row-remove>删除</button>' : '--'}</td></tr>`).join('') : `<tr><td class="empty-cell" colspan="${count ? 11 : 9}">暂无商品明细</td></tr>`;
    root.querySelector('#itemsFoot').innerHTML = count
      ? `<tr><td colspan="11" class="inventory-document-total">盘损金额：<strong>¥${record.lossAmount.toFixed(2)}</strong>　盘溢金额：<strong>¥${record.overflowAmount.toFixed(2)}</strong></td></tr>`
      : `<tr><td colspan="9" class="inventory-document-total">商品数：<strong>${record.productCount}</strong>　损溢金额：<strong>¥${record.amount.toFixed(2)}</strong></td></tr>`;
  }

  function render() {
    const statusMap = { PENDING_AUDIT: '待审核', APPROVED: '已审核', COMPLETED: '已完成', CLOSED: '已关闭' };
    root.querySelector('#documentStatus').innerHTML = `<span class="operation-status">${statusMap[record.status] || record.status}</span>`;
    root.querySelector('#basicFields').innerHTML = type === 'count'
      ? field('盘点单号', 'countNo', mode === 'copy' || mode === 'add' ? '保存后自动生成' : record.countNo) + field('盘点时间', 'countAt', String(record.countAt || '').replace(' ', 'T'), 'datetime-local') + field('仓库', 'warehouse', record.warehouse, 'select', ['中心仓', '北区仓', '临时仓']) + field('盘点人', 'counter', record.counter) + field('添加人', 'creator', record.creator)
      : field('损溢单号', 'lossNo', record.lossNo || '保存后自动生成') + field('单据类型', 'type', record.type, 'select', ['盘损', '盘溢']) + field('关联盘点单号', 'relationNo', record.relationNo) + field('仓库', 'warehouse', record.warehouse, 'select', ['中心仓', '北区仓', '临时仓']) + field('添加人', 'creator', record.creator);
    root.querySelector('[name="remark"]').value = record.remark || '';
    renderItems();
  }

  function collect() {
    root.querySelectorAll('#basicFields [name]').forEach((input) => { record[input.name] = input.type === 'datetime-local' ? input.value.replace('T', ' ') : input.value; });
    record.remark = root.querySelector('[name="remark"]').value.trim();
    calculate();
    if (!record.warehouse || (type === 'count' && (!record.countAt || !record.counter)) || (type === 'loss' && !record.relationNo)) throw new Error('请完整填写必填信息');
    if (!record.items.length) throw new Error('请至少添加一个商品');
    if (record.items.some((item) => !item.goodsName)) throw new Error('请完整填写商品信息');
    return record;
  }

  async function save(submit) {
    const data = collect();
    let saved;
    if (mode === 'edit') saved = await service.update(resource, id, data);
    else {
      const payload = { ...data };
      delete payload.id;
      delete payload.countNo;
      delete payload.lossNo;
      delete payload.createdAt;
      payload.status = 'PENDING_AUDIT';
      saved = await service.create(resource, payload);
    }
    if (submit) await service.transition(resource, saved.id, 'approve');
    window.AppNavigation?.navigate?.('./inventory-counting.html');
  }

  root.addEventListener('input', (event) => {
    const input = event.target.closest('[data-key]');
    if (!input) return;
    const item = record.items[Number(input.closest('tr').dataset.index)];
    item[input.dataset.key] = input.type === 'number' ? Number(input.value) : input.value;
    if (['bookQty', 'countQty', 'costPrice', 'quantity', 'price'].includes(input.dataset.key)) renderItems();
  });

  root.addEventListener('click', async (event) => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'back') window.AppNavigation?.navigate?.('./inventory-counting.html');
    if (action === 'add-row') {
      record.items.push(type === 'count' ? { goodsCode: '', goodsName: '', category: '', unit: '斤', bookQty: 0, countQty: 0, costPrice: 0 } : { goodsCode: '', goodsName: '', unit: '斤', quantity: 0, price: 0, reason: '' });
      renderItems();
    }
    const remove = event.target.closest('[data-row-remove]');
    if (remove) {
      record.items.splice(Number(remove.closest('tr').dataset.index), 1);
      renderItems();
    }
    try {
      if (action === 'save') await save(false);
      if (action === 'submit') await save(true);
      if (action === 'approve') { await service.transition(resource, id, 'approve'); window.AppNavigation?.navigate?.('./inventory-counting.html'); }
      if (action === 'close') { await service.transition(resource, id, 'close'); window.AppNavigation?.navigate?.('./inventory-counting.html'); }
    } catch (error) {
      toast(error.message || '操作失败', 'error');
    }
  });

  async function init() {
    record = id ? await service.get(resource, id) : null;
    if (id && !record) throw new Error('单据不存在或已删除');
    record = { ...defaults, ...(record || {}) };
    record.items = Array.isArray(record.items) ? record.items.map((item) => ({ ...item })) : [];
    if (mode === 'copy') {
      delete record.id;
      delete record.countNo;
      record.status = 'PENDING_AUDIT';
    }
    render();
  }
  init().catch((error) => toast(error.message, 'error'));
})();
