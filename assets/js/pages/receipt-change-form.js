(function () {
  const service = window.OperationsService;
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode') || 'add';
  const id = params.get('id') || '';
  const readonly = mode === 'audit';
  const root = window.AppShell.mount({ title: '实收变更', content: document.getElementById('receiptChangeTemplate').innerHTML });
  const overlay = document.getElementById('changeOverlay');
  const body = document.getElementById('changeGoodsBody');
  const status = document.getElementById('changeStatus');
  let record = null;
  let lines = [];
  let attachment = '';

  document.getElementById('changePageTitle').textContent = mode === 'edit' ? '编辑变更单' : readonly ? '审核变更单' : '新增变更单';
  document.getElementById('changeReject').hidden = !readonly;
  if (readonly) {
    document.getElementById('changePrimary').textContent = '通过';
    document.getElementById('changePrimary').dataset.action = 'approve';
    document.getElementById('chooseChangeOrder').hidden = true;
    document.getElementById('changeAttachment').hidden = true;
  }

  const esc = (value) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const money = (value) => Number(value || 0).toFixed(2);

  function back(flag) {
    window.AppNavigation?.navigate?.(`./receipt-change.html${flag ? `?${flag}=1` : ''}`);
  }

  function toast(message, isError) {
    status.textContent = message;
    status.className = `order-form-status is-visible${isError ? ' error' : ''}`;
  }

  function orderLines(order) {
    const source = order.items?.length ? order.items : [{
      goodsId: 'GOOD-001',
      goodsName: '大白菜（斤/--/散装）',
      unit: '斤',
      quantity: order.productCount || 1,
      unitPrice: order.productCount ? order.orderAmount / order.productCount : order.orderAmount
    }];
    return source.map((item, index) => {
      const shippingQty = Number(item.shippedQty ?? item.quantity ?? 0);
      const acceptedQty = Number(item.acceptedQty ?? shippingQty);
      const unitPrice = Number(item.unitPrice || 0);
      return {
        id: `CHANGE-LINE-${index}-${Date.now()}`,
        goodsId: item.goodsId || '',
        goodsName: item.goodsName,
        unit: item.unit,
        shippingQty,
        acceptedQty,
        afterQty: acceptedQty,
        differenceQty: acceptedQty - shippingQty,
        unitPrice,
        shippingAmount: Number((shippingQty * unitPrice).toFixed(2)),
        afterAmount: Number((acceptedQty * unitPrice).toFixed(2)),
        differenceAmount: Number(((acceptedQty - shippingQty) * unitPrice).toFixed(2)),
        reason: ''
      };
    });
  }

  function totals() {
    const values = lines.reduce((sum, line) => ({
      beforeQty: sum.beforeQty + line.shippingQty,
      afterQty: sum.afterQty + line.afterQty,
      beforeAmount: sum.beforeAmount + line.shippingAmount,
      afterAmount: sum.afterAmount + line.afterAmount
    }), { beforeQty: 0, afterQty: 0, beforeAmount: 0, afterAmount: 0 });
    document.getElementById('beforeQtyTotal').textContent = values.beforeQty;
    document.getElementById('afterQtyTotal').textContent = values.afterQty;
    document.getElementById('beforeAmountTotal').textContent = money(values.beforeAmount);
    document.getElementById('afterAmountTotal').textContent = money(values.afterAmount);
    return values;
  }

  function render() {
    if (!lines.length) {
      body.innerHTML = '<tr><td class="empty-goods" colspan="12">请选择关联订单</td></tr>';
    } else {
      body.innerHTML = lines.map((line, index) => `<tr data-line-id="${esc(line.id)}">
        <td>${index + 1}</td><td><span class="goods-thumb">暂无图片</span></td><td class="goods-name-cell">${esc(line.goodsName)}</td><td>${esc(line.unit)}</td>
        <td>${line.shippingQty}</td><td>${line.acceptedQty}</td><td><input class="table-input" data-field="afterQty" type="number" min="0.01" step="0.01" value="${line.afterQty}" ${readonly ? 'disabled' : ''}></td>
        <td class="difference-qty">${line.differenceQty}</td><td>${money(line.unitPrice)}</td><td class="after-amount">${money(line.afterAmount)}</td><td class="difference-amount">${money(line.differenceAmount)}</td>
        <td><input class="table-input remark-input" data-field="reason" value="${esc(line.reason)}" placeholder="请输入变更原因" ${readonly ? 'disabled' : ''}></td>
      </tr>`).join('');
    }
    totals();
  }

  async function openOrderPicker() {
    const result = await service.list('orders', { page: 1, pageSize: 100 });
    overlay.innerHTML = `<div class="operations-modal-backdrop"><section class="operations-modal order-picker-modal" role="dialog" aria-label="选择订单">
      <header class="operations-modal-header"><h3>选择订单</h3><button data-close>×</button></header><div class="operations-modal-body">
      <div class="compact-picker-filter"><div class="operations-field"><label>订单号</label><input class="filter-input" placeholder="请输入订单号"></div><div class="operations-field"><label>验收差异</label><select class="filter-select"><option>请选择验收差异</option><option>有差异</option><option>无差异</option></select></div><button class="btn btn-primary btn-sm">查询</button><button class="btn btn-sm">重置</button></div>
      <div class="order-goods-table-wrap"><table class="order-goods-table"><thead><tr><th>订单号</th><th>发货时间</th><th>发货金额</th><th>操作</th></tr></thead><tbody>
      ${result.items.filter((item) => !['DRAFT', 'CLOSED'].includes(item.status)).map((item) => `<tr><td>${esc(item.orderNo)}</td><td>${esc(item.shippingAt || item.expectedAt)}</td><td>${money(item.shippingAmount || item.orderAmount)}</td><td><button class="btn-text" data-change-order="${esc(item.id)}">变更</button></td></tr>`).join('')}
      </tbody></table></div></div><footer class="operations-modal-footer"><button class="btn" data-close>取消</button></footer></section></div>`;
  }

  async function selectOrder(orderId) {
    const order = await service.get('orders', orderId);
    if (!order) return toast('订单不存在或已删除', true);
    document.getElementById('changeCustomer').value = order.customerName;
    document.getElementById('changeCanteen').value = order.canteen;
    document.getElementById('changeOrderNo').value = order.orderNo;
    document.getElementById('changeOrderNo').dataset.orderId = order.id;
    lines = orderLines(order);
    overlay.innerHTML = '';
    render();
  }

  function validate() {
    root.querySelectorAll('[data-error-for]').forEach((node) => { node.textContent = ''; });
    document.getElementById('changeGoodsError').textContent = '';
    const fields = [
      ['changeCustomer', '请选择客户'],
      ['changeCanteen', '请选择食堂'],
      ['changeOrderNo', '请选择关联订单'],
      ['changeDate', '请选择变更日期'],
      ['changeReason', '请输入变更原因']
    ];
    let invalid = false;
    fields.forEach(([key, message]) => {
      if (!document.getElementById(key).value.trim()) {
        root.querySelector(`[data-error-for="${key}"]`).textContent = message;
        invalid = true;
      }
    });
    if (!lines.length) {
      document.getElementById('changeGoodsError').textContent = '请选择关联订单';
      invalid = true;
    } else if (lines.some((line) => !(line.afterQty > 0))) {
      document.getElementById('changeGoodsError').textContent = '变更后数量必须大于0';
      invalid = true;
    } else if (lines.some((line) => !line.reason.trim())) {
      document.getElementById('changeGoodsError').textContent = '请输入商品变更原因';
      invalid = true;
    }
    return !invalid;
  }

  function payload() {
    const summary = totals();
    return {
      customerName: document.getElementById('changeCustomer').value,
      canteen: document.getElementById('changeCanteen').value,
      orderId: document.getElementById('changeOrderNo').dataset.orderId || record?.orderId || '',
      orderNo: document.getElementById('changeOrderNo').value,
      changeDate: document.getElementById('changeDate').value,
      changeReason: document.getElementById('changeReason').value.trim(),
      items: lines,
      beforeQty: summary.beforeQty,
      afterQty: summary.afterQty,
      beforeAmount: summary.beforeAmount,
      afterAmount: summary.afterAmount,
      differenceAmount: Number((summary.afterAmount - summary.beforeAmount).toFixed(2)),
      remark: document.getElementById('changeRemark').value.trim(),
      attachment,
      shippingAt: record?.shippingAt || '',
      creator: record?.creator || '当前用户',
      status: record?.status || 'PENDING_AUDIT',
      auditAt: record?.auditAt || '',
      auditor: record?.auditor || ''
    };
  }

  async function save() {
    if (!validate()) return;
    try {
      if (id) await service.update('receiptChanges', id, payload());
      else await service.create('receiptChanges', payload());
      back('saved');
    } catch (error) {
      toast(error.message || '变更单保存失败', true);
    }
  }

  function openReject() {
    overlay.innerHTML = `<div class="operations-modal-backdrop"><section class="operations-modal compact-modal" role="dialog" aria-label="驳回变更单"><header class="operations-modal-header"><h3>审核</h3><button data-close>×</button></header><div class="operations-modal-body"><label class="dialog-field">审核意见<textarea class="form-control" id="changeAuditOpinion" rows="4" placeholder="请输入审核意见"></textarea><span class="field-error" id="changeAuditError"></span></label></div><footer class="operations-modal-footer"><button class="btn" data-close>取消</button><button class="btn btn-primary" id="confirmChangeReject">确定</button></footer></section></div>`;
  }

  async function load() {
    if (!id) return render();
    record = await service.get('receiptChanges', id);
    if (!record) return toast('变更单不存在或已删除', true);
    document.getElementById('changeCustomer').value = record.customerName || '';
    document.getElementById('changeCanteen').value = record.canteen || '';
    document.getElementById('changeOrderNo').value = record.orderNo || '';
    document.getElementById('changeOrderNo').dataset.orderId = record.orderId || '';
    document.getElementById('changeDate').value = record.changeDate || record.createdAt || '';
    document.getElementById('changeReason').value = record.changeReason || '验收数量调整';
    document.getElementById('changeRemark').value = record.remark || '';
    attachment = record.attachment || '';
    document.getElementById('changeAttachmentName').textContent = attachment || '未上传';
    lines = record.items?.length ? record.items : [{
      id: `CHANGE-FALLBACK-${Date.now()}`,
      goodsId: '',
      goodsName: record.goodsName || '大白菜（斤/--/散装）',
      unit: '斤',
      shippingQty: 1,
      acceptedQty: 1,
      afterQty: 1,
      differenceQty: 0,
      unitPrice: Number(record.beforeAmount || 0),
      shippingAmount: Number(record.beforeAmount || 0),
      afterAmount: Number(record.afterAmount || 0),
      differenceAmount: Number(record.differenceAmount || 0),
      reason: '验收数量调整'
    }];
    render();
    if (readonly) root.querySelectorAll('#changeForm input, #changeForm select, #changeForm textarea').forEach((control) => { control.disabled = true; });
  }

  root.addEventListener('input', (event) => {
    const row = event.target.closest('[data-line-id]');
    if (!row || !event.target.dataset.field) return;
    const line = lines.find((item) => item.id === row.dataset.lineId);
    if (event.target.dataset.field === 'reason') {
      line.reason = event.target.value;
      return;
    }
    line.afterQty = Number(event.target.value);
    line.differenceQty = Number((line.afterQty - line.shippingQty).toFixed(2));
    line.afterAmount = Number((line.afterQty * line.unitPrice).toFixed(2));
    line.differenceAmount = Number((line.afterAmount - line.shippingAmount).toFixed(2));
    row.querySelector('.difference-qty').textContent = line.differenceQty;
    row.querySelector('.after-amount').textContent = money(line.afterAmount);
    row.querySelector('.difference-amount').textContent = money(line.differenceAmount);
    totals();
  });

  root.addEventListener('click', async (event) => {
    if (event.target.closest('[data-close]')) return (overlay.innerHTML = '');
    if (event.target.closest('[data-action="back"]')) return back();
    if (event.target.closest('#chooseChangeOrder')) return openOrderPicker();
    const orderButton = event.target.closest('[data-change-order]');
    if (orderButton) return selectOrder(orderButton.dataset.changeOrder);
    if (event.target.closest('#changeAttachment')) {
      attachment = '实收变更附件.pdf';
      document.getElementById('changeAttachmentName').textContent = attachment;
      return;
    }
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'save') return save();
    if (action === 'reject') return openReject();
    if (event.target.closest('#confirmChangeReject')) {
      const opinion = document.getElementById('changeAuditOpinion').value.trim();
      if (!opinion) return (document.getElementById('changeAuditError').textContent = '请输入审核意见');
      await service.update('receiptChanges', id, { status: 'REJECTED', auditOpinion: opinion, auditor: '当前用户', auditAt: new Date().toISOString().slice(0, 16).replace('T', ' ') });
      return back('reviewed');
    }
    if (action === 'approve') {
      const opinion = window.prompt('请输入审核意见', '同意');
      if (!opinion) return;
      await service.transition('receiptChanges', id, 'approve', { auditOpinion: opinion });
      return back('reviewed');
    }
  });

  load();
})();
