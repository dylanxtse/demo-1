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

  const esc = (value) => String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  const number = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const decimal = (value) => number(value).toFixed(2);
  const money = decimal;

  document.getElementById('changePageTitle').textContent = mode === 'edit' ? '编辑变更单' : readonly ? '审核变更单' : '新增变更单';
  document.getElementById('changeReject').hidden = !readonly;
  if (mode === 'edit') document.getElementById('changePrimary').textContent = '保存';
  if (readonly) {
    document.getElementById('changePrimary').textContent = '通过';
    document.getElementById('changePrimary').dataset.action = 'approve';
    document.getElementById('chooseChangeOrder').hidden = true;
    document.getElementById('changeAttachment').hidden = true;
  }

  function back(flag) {
    window.AppNavigation?.navigate?.(`./receipt-change.html${flag ? `?${flag}=1` : ''}`);
  }

  function toast(message, isError = false) {
    status.textContent = message;
    status.className = `order-form-status is-visible${isError ? ' error' : ''}`;
  }

  function orderLines(order) {
    const source = order.items?.length ? order.items : [{
      goodsCode: 'SP0300019', goodsName: '大白菜', unit: '斤', quantity: 1, unitPrice: order.orderAmount
    }];
    return source.map((item, index) => {
      const shippingQty = number(item.shippedQty ?? item.quantity);
      const acceptedQty = number(item.acceptedQty) > 0 ? number(item.acceptedQty) : shippingQty;
      const unitPrice = number(item.unitPrice);
      const shippingAmount = number(item.shippingAmount ?? (shippingQty * unitPrice));
      const afterQty = number(item.afterQty ?? acceptedQty);
      const afterAmount = number(item.afterAmount ?? (afterQty * unitPrice));
      return {
        id: item.id || `CHANGE-LINE-${index}-${Date.now()}`,
        goodsId: item.goodsId || item.goodsCode || item.productId || '',
        goodsCode: item.goodsCode || item.productCode || '',
        goodsName: item.goodsName || item.productName || '未命名商品',
        unit: item.unit || '--',
        shippingQty,
        acceptedQty,
        afterQty,
        differenceQty: number((afterQty - shippingQty).toFixed(2)),
        unitPrice,
        shippingAmount,
        afterAmount,
        differenceAmount: number((afterAmount - shippingAmount).toFixed(2)),
        reason: item.reason || item.changeReason || ''
      };
    });
  }

  function totals() {
    const values = lines.reduce((sum, line) => ({
      beforeQty: sum.beforeQty + number(line.shippingQty),
      afterQty: sum.afterQty + number(line.afterQty),
      beforeAmount: sum.beforeAmount + number(line.shippingAmount),
      afterAmount: sum.afterAmount + number(line.afterAmount)
    }), { beforeQty: 0, afterQty: 0, beforeAmount: 0, afterAmount: 0 });
    document.getElementById('beforeQtyTotal').textContent = decimal(values.beforeQty);
    document.getElementById('afterQtyTotal').textContent = decimal(values.afterQty);
    document.getElementById('beforeAmountTotal').textContent = money(values.beforeAmount);
    document.getElementById('afterAmountTotal').textContent = money(values.afterAmount);
    return values;
  }

  function productText(line) {
    return window.DomUtils?.formatProductDisplay?.(line) || line.goodsName || '--';
  }

  function render() {
    if (!lines.length) {
      body.innerHTML = '<tr><td class="empty-goods" colspan="13">请选择关联订单</td></tr>';
    } else {
      body.innerHTML = lines.map((line, index) => `<tr data-line-id="${esc(line.id)}">
        <td>${index + 1}</td>
        <td><span class="goods-thumb" aria-label="商品图片">暂无图片</span></td>
        <td class="goods-name-cell"><span class="product-display-text" title="${esc(productText(line))}">${esc(productText(line))}</span></td>
        <td>${esc(line.unit)}</td>
        <td>${decimal(line.shippingQty)}</td>
        <td>${decimal(line.acceptedQty)}</td>
        <td><input class="table-input" data-field="afterQty" type="number" min="0.01" step="0.01" value="${decimal(line.afterQty)}" ${readonly ? 'disabled' : ''}></td>
        <td class="difference-qty">${decimal(line.differenceQty)}</td>
        <td>${money(line.unitPrice)}</td>
        <td>${money(line.shippingAmount)}</td>
        <td class="after-amount">${money(line.afterAmount)}</td>
        <td class="difference-amount">${money(line.differenceAmount)}</td>
        <td><input class="table-input remark-input" data-field="reason" value="${esc(line.reason)}" placeholder="请输入变更原因" ${readonly ? 'disabled' : ''}></td>
      </tr>`).join('');
    }
    totals();
  }

  function hasReturn(order) {
    return number(order.returnAmount) > 0 || Boolean(order.hasReturn) || (order.items || []).some((item) => number(item.returnQty) > 0);
  }

  function renderPickerRows(items) {
    const keyword = document.getElementById('pickerOrderNo')?.value.trim().toLowerCase() || '';
    const difference = document.getElementById('pickerDifference')?.value || '';
    const rows = items.filter((item) => {
      if (keyword && !String(item.orderNo || '').toLowerCase().includes(keyword)) return false;
      if (difference === '有差异' && !(item.items || []).some((line) => number(line.acceptedQty) !== number(line.shippedQty ?? line.quantity))) return false;
      if (difference === '无差异' && (item.items || []).some((line) => number(line.acceptedQty) !== number(line.shippedQty ?? line.quantity))) return false;
      return true;
    });
    const target = document.getElementById('changeOrderPickerBody');
    if (!target) return;
    target.innerHTML = rows.length ? rows.map((item, index) => {
      const disabled = hasReturn(item) || index === 1 || index === 2;
      return `<tr><td>${disabled ? '<span class="return-tag">退</span>' : ''}${esc(item.orderNo)}</td><td>${esc(item.shippingAt || item.expectedAt || '--')}</td><td>${money(item.shippingAmount || item.orderAmount)}</td><td><button class="btn-text change-picker-action" type="button" data-change-order="${esc(item.id)}"${disabled ? ' disabled' : ''}>变更</button></td></tr>`;
    }).join('') : '<tr><td class="empty-cell" colspan="4">暂无符合条件的订单</td></tr>';
  }

  async function openOrderPicker() {
    const result = await service.list('orders', { page: 1, pageSize: 100 });
    const items = result.items.filter((item) => !['DRAFT', 'CLOSED'].includes(item.status)).slice(0, 9);
    overlay.innerHTML = `<div class="operations-modal-backdrop"><section class="operations-modal order-picker-modal receipt-change-picker-modal" role="dialog" aria-modal="true" aria-label="选择订单">
      <header class="operations-modal-header"><h3>选择订单</h3><button type="button" data-close aria-label="关闭">×</button></header>
      <div class="operations-modal-body">
        <div class="receipt-picker-filter">
          <div class="operations-field"><label class="filter-label" for="pickerOrderNo">订单号</label><input class="filter-input" id="pickerOrderNo" placeholder="请输入订单号"></div>
          <div class="operations-field"><label class="filter-label" for="pickerDifference">验收差异</label><select class="filter-select" id="pickerDifference"><option value="">全部</option><option value="有差异">有差异</option><option value="无差异">无差异</option></select></div>
          <div class="receipt-picker-actions"><button class="btn btn-primary btn-sm" type="button" data-picker-query>查询</button><button class="btn btn-sm" type="button" data-picker-reset>重置</button></div>
        </div>
        <div class="receipt-picker-date-row"><label class="filter-label">发货时间</label><div class="receipt-picker-date-range"><input class="filter-input" value="2026-04-01" aria-label="发货开始时间"><span>—</span><input class="filter-input" value="2026-10-01" aria-label="发货结束时间"><span class="date-range-icon" aria-hidden="true">▣</span></div></div>
        <div class="order-goods-table-wrap receipt-picker-table-wrap"><table class="order-goods-table receipt-picker-table"><thead><tr><th>订单号</th><th>发货时间</th><th>发货金额</th><th>操作</th></tr></thead><tbody id="changeOrderPickerBody"></tbody></table></div>
        <div class="receipt-picker-pagination"><span>共 ${items.length} 条数据</span><span class="picker-page-size">20 条/页⌄</span><span class="picker-page-number">1</span><span>跳至</span><input value="1" aria-label="跳转页码"><span>/ 1 页</span></div>
      </div>
      <footer class="operations-modal-footer"><button class="btn" type="button" data-close>取消</button></footer>
    </section></div>`;
    renderPickerRows(items);
  }

  async function selectOrder(orderId) {
    const order = await service.get('orders', orderId);
    if (!order) return toast('订单不存在或已删除', true);
    document.getElementById('changeCustomer').value = order.customerName || '';
    document.getElementById('changeCanteen').value = order.canteen || '';
    document.getElementById('changeOrderNo').value = order.orderNo || '';
    document.getElementById('changeOrderNo').dataset.orderId = order.id || '';
    lines = orderLines(order);
    overlay.innerHTML = '';
    render();
  }

  function validate() {
    root.querySelectorAll('[data-error-for]').forEach((node) => { node.textContent = ''; });
    document.getElementById('changeGoodsError').textContent = '';
    const fields = [
      ['changeCustomer', '请选择客户'], ['changeCanteen', '请选择食堂'],
      ['changeOrderNo', '请选择关联订单'], ['changeDate', '请选择变更日期'],
      ['changeReason', '请输入变更原因']
    ];
    let invalid = false;
    fields.forEach(([key, message]) => {
      const control = document.getElementById(key);
      if (!control.value.trim()) {
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
    } else if (lines.some((line) => !String(line.reason || '').trim())) {
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
      beforeQty: Number(summary.beforeQty.toFixed(2)),
      afterQty: Number(summary.afterQty.toFixed(2)),
      beforeAmount: Number(summary.beforeAmount.toFixed(2)),
      afterAmount: Number(summary.afterAmount.toFixed(2)),
      differenceAmount: Number((summary.afterAmount - summary.beforeAmount).toFixed(2)),
      remark: document.getElementById('changeRemark').value.trim(),
      attachment,
      shippingAt: record?.shippingAt || lines[0]?.shippingAt || '',
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
    overlay.innerHTML = `<div class="operations-modal-backdrop"><section class="operations-modal compact-modal" role="dialog" aria-label="驳回变更单"><header class="operations-modal-header"><h3>审核</h3><button type="button" data-close>×</button></header><div class="operations-modal-body"><label class="dialog-field">审核意见<textarea class="form-control" id="changeAuditOpinion" rows="4" placeholder="请输入审核意见"></textarea><span class="field-error" id="changeAuditError"></span></label></div><footer class="operations-modal-footer"><button class="btn" type="button" data-close>取消</button><button class="btn btn-primary" type="button" id="confirmChangeReject">确定</button></footer></section></div>`;
  }

  async function load() {
    if (!id) {
      const result = await service.list('orders', { page: 1, pageSize: 100 });
      const demoOrder = result.items.find((item) => item.orderNo === 'DD202607280300006')
        || result.items.find((item) => (item.items || []).length >= 3 && !['DRAFT', 'CLOSED'].includes(item.status));
      if (demoOrder) await selectOrder(demoOrder.id);
      render();
      return;
    }
    record = await service.get('receiptChanges', id);
    if (!record) return toast('变更单不存在或已删除', true);
    document.getElementById('changeCustomer').value = record.customerName || '';
    document.getElementById('changeCanteen').value = record.canteen || '';
    document.getElementById('changeOrderNo').value = record.orderNo || '';
    document.getElementById('changeOrderNo').dataset.orderId = record.orderId || '';
    document.getElementById('changeDate').value = String(record.changeDate || record.createdAt || '2026-09-10').slice(0, 10);
    document.getElementById('changeReason').value = record.changeReason || '验收数量调整';
    document.getElementById('changeRemark').value = record.remark || '';
    attachment = record.attachment || '';
    document.getElementById('changeAttachmentName').textContent = attachment || '未上传';
    lines = record.items?.length ? record.items.map((line, index) => ({
      ...line,
      id: line.id || `CHANGE-LINE-${index}-${Date.now()}`,
      shippingQty: number(line.shippingQty ?? line.quantity),
      acceptedQty: number(line.acceptedQty ?? line.shippingQty ?? line.quantity),
      afterQty: number(line.afterQty ?? line.acceptedQty ?? line.shippingQty ?? line.quantity),
      unitPrice: number(line.unitPrice),
      shippingAmount: number(line.shippingAmount ?? ((line.shippingQty ?? line.quantity) * number(line.unitPrice))),
      afterAmount: number(line.afterAmount ?? ((line.afterQty ?? line.acceptedQty ?? line.quantity) * number(line.unitPrice))),
      differenceQty: number(line.differenceQty ?? 0),
      differenceAmount: number(line.differenceAmount ?? 0),
      reason: line.reason || ''
    })) : [{
      id: `CHANGE-FALLBACK-${Date.now()}`, goodsName: record.goodsName || '大白菜', unit: '斤', shippingQty: 1,
      acceptedQty: 1, afterQty: 1, differenceQty: 0, unitPrice: number(record.beforeAmount),
      shippingAmount: number(record.beforeAmount), afterAmount: number(record.afterAmount), differenceAmount: number(record.differenceAmount), reason: '验收数量调整'
    }];
    render();
    if (readonly) root.querySelectorAll('#changeForm input, #changeForm select, #changeForm textarea').forEach((control) => { control.disabled = true; });
  }

  root.addEventListener('input', (event) => {
    if (event.target.id === 'changeRemark') {
      const counter = root.querySelector('.remark-count');
      if (counter) counter.textContent = `${event.target.value.length}/200`;
    }
    const row = event.target.closest('[data-line-id]');
    if (!row || !event.target.dataset.field) return;
    const line = lines.find((item) => item.id === row.dataset.lineId);
    if (!line) return;
    if (event.target.dataset.field === 'reason') {
      line.reason = event.target.value;
      return;
    }
    line.afterQty = number(event.target.value);
    line.differenceQty = number((line.afterQty - line.shippingQty).toFixed(2));
    line.afterAmount = number((line.afterQty * line.unitPrice).toFixed(2));
    line.differenceAmount = number((line.afterAmount - line.shippingAmount).toFixed(2));
    row.querySelector('.difference-qty').textContent = decimal(line.differenceQty);
    row.querySelector('.after-amount').textContent = money(line.afterAmount);
    row.querySelector('.difference-amount').textContent = money(line.differenceAmount);
    totals();
  });

  root.addEventListener('click', async (event) => {
    if (event.target.closest('[data-close]')) return (overlay.innerHTML = '');
    if (event.target.closest('[data-action="back"]')) return back();
    if (event.target.closest('#chooseChangeOrder')) return openOrderPicker();
    if (event.target.closest('[data-picker-query]')) {
      const items = [...document.querySelectorAll('#changeOrderPickerBody tr')].length ? await service.list('orders', { page: 1, pageSize: 100 }) : { items: [] };
      return renderPickerRows(items.items.filter((item) => !['DRAFT', 'CLOSED'].includes(item.status)).slice(0, 9));
    }
    if (event.target.closest('[data-picker-reset]')) {
      document.getElementById('pickerOrderNo').value = '';
      document.getElementById('pickerDifference').value = '';
      const items = await service.list('orders', { page: 1, pageSize: 100 });
      return renderPickerRows(items.items.filter((item) => !['DRAFT', 'CLOSED'].includes(item.status)).slice(0, 9));
    }
    const orderButton = event.target.closest('[data-change-order]');
    if (orderButton && !orderButton.disabled) return selectOrder(orderButton.dataset.changeOrder);
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
