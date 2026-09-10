(function () {
  const id = new URLSearchParams(window.location.search).get('id') || 'CHG-002';
  const root = window.AppShell.mount({ title: '实收变更', content: document.getElementById('changeDetailTemplate').innerHTML });
  const content = document.getElementById('changeDetailContent');
  const statusElement = document.getElementById('receiptDetailStatus');
  const statusMap = {
    PENDING: ['待审核', 'warning'],
    PENDING_AUDIT: ['待审核', 'warning'],
    APPROVED: ['已完成', 'success'],
    COMPLETED: ['已完成', 'success'],
    REJECTED: ['已驳回', 'danger'],
    CLOSED: ['已关闭', 'danger']
  };
  const esc = (value) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
  const decimal = (value) => number(value).toFixed(2);

  function detailLine(line, index) {
    const shippingQty = number(line.shippingQty ?? line.quantity);
    const acceptedQty = number(line.acceptedQty ?? shippingQty);
    const afterQty = number(line.afterQty ?? acceptedQty);
    const unitPrice = number(line.unitPrice);
    const shippingAmount = number(line.shippingAmount ?? shippingQty * unitPrice);
    const afterAmount = number(line.afterAmount ?? afterQty * unitPrice);
    return {
      ...line,
      id: line.id || `DETAIL-LINE-${index}`,
      shippingQty, acceptedQty, afterQty,
      differenceQty: number(line.differenceQty ?? afterQty - shippingQty),
      unitPrice, shippingAmount, afterAmount,
      differenceAmount: number(line.differenceAmount ?? afterAmount - shippingAmount),
      reason: line.reason || ''
    };
  }

  function productText(line) {
    return window.DomUtils?.formatProductDisplay?.(line) || line.goodsName || line.productName || '--';
  }

  function field(label, value) {
    return `<div class="receipt-detail-field"><dt>${esc(label)}</dt><dd>${esc(value === '' || value == null ? '--' : value)}</dd></div>`;
  }

  function render(record) {
    const status = statusMap[record.status] || [record.status || '待审核', 'warning'];
    statusElement.innerHTML = `单据状态：<strong class="receipt-status-${status[1]}">${esc(status[0])}</strong>`;
    const lines = (record.items?.length ? record.items : [{
      goodsName: record.goodsName || '大白菜', unit: '斤', shippingQty: 1, acceptedQty: 1, afterQty: 1,
      unitPrice: record.beforeAmount || 0, shippingAmount: record.beforeAmount || 0,
      afterAmount: record.afterAmount || 0, differenceAmount: record.differenceAmount || 0,
      reason: record.changeReason || ''
    }]).map(detailLine);
    const totals = lines.reduce((sum, line) => ({
      beforeQty: sum.beforeQty + line.shippingQty,
      afterQty: sum.afterQty + line.afterQty,
      beforeAmount: sum.beforeAmount + line.shippingAmount,
      afterAmount: sum.afterAmount + line.afterAmount
    }), { beforeQty: 0, afterQty: 0, beforeAmount: 0, afterAmount: 0 });
    const logs = record.operationLogs?.length ? record.operationLogs : [{ action: '添加', operator: record.creator || '杨', createdAt: record.createdAt || '', desc: `${record.creator || '杨'} 添加` }];
    content.innerHTML = `
      <section class="receipt-detail-info-section" aria-label="变更信息">
        <dl class="receipt-detail-grid">
          ${field('变更单号', record.changeNo)}${field('客户名称', record.customerName)}${field('食堂', record.canteen)}${field('变更原因', record.changeReason || '1')}
          ${field('关联单号', record.orderNo)}${field('添加时间', record.createdAt)}${field('添加人', record.creator)}
        </dl>
      </section>
      <section class="receipt-detail-goods-section">
        <div class="order-goods-table-wrap"><table class="order-goods-table change-goods-table receipt-detail-goods-table"><thead><tr><th>序号</th><th>图片</th><th>商品名称（计量单位/品牌/规格）</th><th>计量单位</th><th>发货数量</th><th>验收数量</th><th>变更后数量</th><th>差异数量</th><th>下单单价</th><th>发货金额</th><th>变更后金额</th><th>差异金额</th><th>变更原因</th></tr></thead><tbody>
          ${lines.map((line, index) => `<tr><td>${index + 1}</td><td><span class="goods-thumb" aria-label="商品图片">暂无图片</span></td><td class="goods-name-cell"><span class="product-display-text" title="${esc(productText(line))}">${esc(productText(line))}</span></td><td>${esc(line.unit)}</td><td>${decimal(line.shippingQty)}</td><td>${decimal(line.acceptedQty)}</td><td>${decimal(line.afterQty)}</td><td>${decimal(line.differenceQty)}</td><td>${decimal(line.unitPrice)}</td><td>${decimal(line.shippingAmount)}</td><td>${decimal(line.afterAmount)}</td><td>${decimal(line.differenceAmount)}</td><td>${esc(line.reason || '')}</td></tr>`).join('')}
        </tbody><tfoot><tr><td colspan="4"><strong>变更前发货数量合计:</strong> ${decimal(totals.beforeQty)}</td><td colspan="3"><strong>变更后发货数量合计:</strong> ${decimal(totals.afterQty)}</td><td colspan="3"><strong>变更前发货金额合计:</strong> ${decimal(totals.beforeAmount)}</td><td colspan="3"><strong>变更后发货金额合计:</strong> ${decimal(totals.afterAmount)}</td></tr></tfoot></table></div>
      </section>
      <section class="receipt-detail-note-section"><div><strong>订单备注:</strong><span>${esc(record.remark || '')}</span></div><div><strong>附件</strong><span>${esc(record.attachment || '')}</span></div></section>
      <section class="receipt-operation-section"><h2>操作记录</h2><div class="receipt-operation-list">${logs.map((log) => `<div class="receipt-operation-item"><span class="receipt-operation-dot"></span><div class="receipt-operation-action">${esc(log.action === '创建' ? '添加' : log.action || '添加')}</div><div class="receipt-operation-meta"><span>${esc(log.operator || record.creator || '系统')}</span><span>${esc(log.desc || '')}</span><span>${esc(log.createdAt || '')}</span></div></div>`).join('')}</div></section>`;
  }

  root.addEventListener('click', (event) => {
    if (event.target.closest('[data-action="back"]')) window.AppNavigation?.navigate?.('./receipt-change.html');
  });

  window.OperationsService.get('receiptChanges', id).then((record) => {
    if (!record) return (content.innerHTML = '<div class="detail-empty">变更单不存在或已删除</div>');
    render(record);
  });
})();
