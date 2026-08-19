(function () {
  const service = window.OperationsService;
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode') || 'add';
  const id = params.get('id') || '';
  const readonly = mode === 'audit';
  const root = window.AppShell.mount({ title: '订单退货', content: document.getElementById('returnFormTemplate').innerHTML });
  const overlay = document.getElementById('returnOverlay');
  const body = document.getElementById('returnGoodsBody');
  const status = document.getElementById('returnStatus');
  let record = null;
  let lines = [];
  let attachment = '';

  document.getElementById('returnPageTitle').textContent = mode === 'edit' ? '编辑退货单' : mode === 'audit' ? '审核退货单' : '添加退货单';
  document.title = `${document.getElementById('returnPageTitle').textContent} - 集采企业版企业端`;
  document.getElementById('returnReject').hidden = !readonly;
  if (readonly) {
    document.getElementById('returnPrimary').textContent = '通过';
    document.getElementById('returnPrimary').dataset.action = 'approve';
    document.getElementById('chooseOrder').hidden = true;
    document.getElementById('uploadAttachment').hidden = true;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function money(value) {
    return Number(value || 0).toFixed(2);
  }

  function back(flag) {
    window.AppNavigation?.navigate?.(`./order-return.html${flag ? `?${flag}=1` : ''}`);
  }

  function toast(message, isError) {
    status.textContent = message;
    status.className = `order-form-status is-visible${isError ? ' error' : ''}`;
    window.setTimeout(() => { status.className = 'order-form-status'; }, 2400);
  }

  function normalizeOrderLines(order, full) {
    const source = order.items?.length ? order.items : [{
      goodsId: 'GOOD-001',
      goodsName: '大白菜（斤/--/散装）',
      unit: '斤',
      quantity: order.productCount || 1,
      unitPrice: order.productCount ? order.orderAmount / order.productCount : order.orderAmount
    }];
    return source.map((item, index) => ({
      id: `RETURN-LINE-${index}-${Date.now()}`,
      goodsId: item.goodsId || item.goodsCode || '',
      goodsName: item.goodsName,
      unit: item.unit,
      orderPrice: Number(item.unitPrice || 0),
      shippedQty: Number(item.shippedQty ?? item.quantity ?? 0),
      returnedQty: Number(item.returnedQty || 0),
      applyQty: full ? Math.max(0, Number(item.shippedQty ?? item.quantity ?? 0) - Number(item.returnedQty || 0)) : 1,
      applyPrice: Number(item.unitPrice || 0),
      damageQty: 0,
      purchaseOrder: item.purchaseOrder || '--',
      remark: ''
    }));
  }

  function renderLines() {
    if (!lines.length) {
      body.innerHTML = '<tr><td class="empty-goods" colspan="13">请选择关联订单</td></tr>';
    } else {
      body.innerHTML = lines.map((line, index) => `<tr data-line-id="${escapeHtml(line.id)}">
        <td>${index + 1}</td><td><span class="goods-thumb">暂无图片</span></td><td class="goods-name-cell">${escapeHtml(line.goodsName)}</td><td>${escapeHtml(line.unit)}</td>
        <td>${money(line.orderPrice)}</td><td>${line.shippedQty}</td><td>${line.returnedQty}</td>
        <td><input class="table-input" type="number" min="0" step="0.01" data-field="applyQty" value="${line.applyQty}" ${readonly ? 'disabled' : ''}></td>
        <td><input class="table-input" type="number" min="0" step="0.01" data-field="applyPrice" value="${money(line.applyPrice)}" ${readonly ? 'disabled' : ''}></td>
        <td class="return-line-total">${money(line.applyQty * line.applyPrice)}</td>
        <td><input class="table-input" type="number" min="0" step="0.01" data-field="damageQty" value="${line.damageQty}" ${readonly ? 'disabled' : ''}></td>
        <td>${escapeHtml(line.purchaseOrder)}</td><td><input class="table-input remark-input" data-field="remark" value="${escapeHtml(line.remark)}" ${readonly ? 'disabled' : ''}></td>
      </tr>`).join('');
    }
    document.getElementById('refundTotal').textContent = money(lines.reduce((sum, line) => sum + line.applyQty * line.applyPrice, 0));
  }

  async function chooseOrder() {
    const result = await service.list('orders', { page: 1, pageSize: 100 });
    overlay.innerHTML = `<div class="operations-modal-backdrop"><section class="operations-modal order-picker-modal" role="dialog" aria-label="选择订单">
      <header class="operations-modal-header"><h3>选择订单</h3><button data-close>×</button></header>
      <div class="operations-modal-body">
        <div class="operations-filter-grid compact-picker-filter"><div class="operations-field"><label>商品名称</label><input class="filter-input" placeholder="请输入"></div><div class="operations-field"><label>期望发货日期</label><input class="filter-input" type="date"></div><button class="btn btn-primary btn-sm">查询</button><button class="btn btn-sm">重置</button></div>
        <div class="order-goods-table-wrap"><table class="order-goods-table"><thead><tr><th>订单号</th><th>期望送达时间</th><th>下单金额</th><th>操作</th></tr></thead><tbody>
        ${result.items.filter((item) => !['DRAFT', 'CLOSED'].includes(item.status)).map((item) => `<tr><td>${escapeHtml(item.orderNo)}</td><td>${escapeHtml(item.expectedAt)}</td><td>${money(item.orderAmount)}</td><td><button class="btn-text" data-select-order="${escapeHtml(item.id)}" data-full="1">整单退</button><span class="divider">|</span><button class="btn-text" data-select-order="${escapeHtml(item.id)}" data-full="0">部分退</button></td></tr>`).join('')}
        </tbody></table></div>
      </div><footer class="operations-modal-footer"><button class="btn" data-close>取消</button></footer>
    </section></div>`;
  }

  async function selectOrder(orderId, full) {
    const order = await service.get('orders', orderId);
    if (!order) return toast('订单不存在或已删除', true);
    document.getElementById('returnMode').value = 'RELATED';
    document.getElementById('orderNo').value = order.orderNo;
    document.getElementById('orderNo').dataset.orderId = order.id;
    document.getElementById('customerName').value = order.customerName;
    document.getElementById('canteen').value = order.canteen;
    lines = normalizeOrderLines(order, full);
    overlay.innerHTML = '';
    renderLines();
  }

  function clearErrors() {
    root.querySelectorAll('[data-error-for]').forEach((element) => { element.textContent = ''; });
    root.querySelectorAll('[aria-invalid="true"]').forEach((element) => element.removeAttribute('aria-invalid'));
    document.getElementById('returnGoodsError').textContent = '';
  }

  function validate() {
    clearErrors();
    const required = {
      returnMode: '请选择退货类型!',
      customerName: '请选择客户!',
      canteen: '请选择食堂!',
      reason: '请输入退货原因!'
    };
    let first = null;
    Object.entries(required).forEach(([key, message]) => {
      const field = document.getElementById(key);
      if (!field.value.trim()) {
        root.querySelector(`[data-error-for="${key}"]`).textContent = message;
        field.setAttribute('aria-invalid', 'true');
        first ||= field;
      }
    });
    if (document.getElementById('returnMode').value === 'RELATED' && !document.getElementById('orderNo').value) {
      root.querySelector('[data-error-for="orderNo"]').textContent = '请选择订单';
      document.getElementById('orderNo').setAttribute('aria-invalid', 'true');
      first ||= document.getElementById('orderNo');
    }
    if (!lines.length || lines.every((line) => !(line.applyQty > 0))) {
      document.getElementById('returnGoodsError').textContent = '请至少添加一个商品';
      first ||= document.getElementById('chooseOrder');
    }
    first?.focus();
    return !first;
  }

  function data() {
    const refundAmount = Number(lines.reduce((sum, line) => sum + line.applyQty * line.applyPrice, 0).toFixed(2));
    return {
      returnMode: document.getElementById('returnMode').value,
      orderId: document.getElementById('orderNo').dataset.orderId || record?.orderId || '',
      orderNo: document.getElementById('orderNo').value,
      customerName: document.getElementById('customerName').value,
      canteen: document.getElementById('canteen').value,
      reason: document.getElementById('reason').value.trim(),
      includeDamage: document.getElementById('includeDamage').value,
      attachment,
      items: lines.map((line) => ({ ...line, applyAmount: Number((line.applyQty * line.applyPrice).toFixed(2)) })),
      refundAmount,
      warehouse: record?.warehouse || '中心仓',
      creator: record?.creator || '当前用户',
      status: record?.status || 'PENDING_AUDIT'
    };
  }

  async function save() {
    if (!validate()) return;
    try {
      if (id) await service.update('returns', id, data());
      else await service.create('returns', data());
      back('saved');
    } catch (error) {
      toast(error.message || '退货单保存失败', true);
    }
  }

  function reject() {
    overlay.innerHTML = `<div class="operations-modal-backdrop"><section class="operations-modal compact-modal" role="dialog" aria-label="驳回退货单"><header class="operations-modal-header"><h3>审核</h3><button data-close>×</button></header><div class="operations-modal-body"><label class="dialog-field">驳回原因<textarea id="returnRejectReason" class="form-control" rows="4"></textarea><span class="field-error" id="returnRejectError"></span></label></div><footer class="operations-modal-footer"><button class="btn" data-close>取消</button><button class="btn btn-primary" id="confirmReturnReject">确定</button></footer></section></div>`;
  }

  async function load() {
    if (!id) {
      renderLines();
      return;
    }
    record = await service.get('returns', id);
    if (!record) return toast('退货单不存在或已删除', true);
    document.getElementById('returnMode').value = record.returnMode || 'RELATED';
    document.getElementById('orderNo').value = record.orderNo || '';
    document.getElementById('orderNo').dataset.orderId = record.orderId || '';
    document.getElementById('customerName').value = record.customerName || '';
    document.getElementById('canteen').value = record.canteen || '';
    document.getElementById('reason').value = record.reason || '';
    document.getElementById('includeDamage').value = record.includeDamage || '否';
    attachment = record.attachment || '';
    document.getElementById('attachmentName').textContent = attachment || '未上传';
    lines = record.items?.length ? record.items : [{
      id: `RETURN-LINE-FALLBACK-${Date.now()}`,
      goodsId: '',
      goodsName: record.goodsName || '大白菜（斤/--/散装）',
      unit: '斤',
      orderPrice: 2.10,
      shippedQty: 1,
      returnedQty: 0,
      applyQty: 1,
      applyPrice: 2.10,
      damageQty: 0,
      purchaseOrder: '--',
      remark: ''
    }];
    renderLines();
    if (readonly) root.querySelectorAll('#returnForm input, #returnForm select, #returnForm textarea').forEach((control) => { control.disabled = true; });
  }

  root.addEventListener('input', (event) => {
    const row = event.target.closest('[data-line-id]');
    if (!row || !event.target.dataset.field) return;
    const line = lines.find((item) => item.id === row.dataset.lineId);
    line[event.target.dataset.field] = event.target.dataset.field === 'remark' ? event.target.value : Number(event.target.value);
    row.querySelector('.return-line-total').textContent = money(line.applyQty * line.applyPrice);
    document.getElementById('refundTotal').textContent = money(lines.reduce((sum, item) => sum + item.applyQty * item.applyPrice, 0));
  });

  root.addEventListener('click', async (event) => {
    if (event.target.closest('[data-close]')) return (overlay.innerHTML = '');
    if (event.target.closest('[data-action="back"]')) return back();
    if (event.target.closest('#chooseOrder')) return chooseOrder();
    const choice = event.target.closest('[data-select-order]');
    if (choice) return selectOrder(choice.dataset.selectOrder, choice.dataset.full === '1');
    if (event.target.closest('#uploadAttachment')) {
      attachment = '退货附件.pdf';
      document.getElementById('attachmentName').textContent = attachment;
      return;
    }
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'save') return save();
    if (action === 'reject') return reject();
    if (event.target.closest('#confirmReturnReject')) {
      const reason = document.getElementById('returnRejectReason').value.trim();
      if (!reason) return (document.getElementById('returnRejectError').textContent = '请输入驳回原因!');
      await service.update('returns', id, { status: 'REJECTED', rejectReason: reason, auditor: '当前用户', auditAt: new Date().toISOString().slice(0, 16).replace('T', ' ') });
      return back('reviewed');
    }
    if (action === 'approve') {
      if (!window.confirm('确定通过审核吗？')) return;
      await service.transition('returns', id, 'approve');
      return back('reviewed');
    }
  });

  load();
})();
