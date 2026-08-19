(function () {
  const id = new URLSearchParams(window.location.search).get('id') || '';
  const root = window.AppShell.mount({ title: '实收变更', content: document.getElementById('changeDetailTemplate').innerHTML });
  const content = document.getElementById('changeDetailContent');
  const statusMap = { PENDING_AUDIT: '待审核', APPROVED: '已审核', REJECTED: '已驳回', CLOSED: '已关闭' };
  const esc = (value) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const money = (value) => Number(value || 0).toFixed(2);
  const field = (label, value) => `<div class="order-detail-item"><dt>${label}</dt><dd>${esc(value || '--')}</dd></div>`;
  root.addEventListener('click', (event) => { if (event.target.closest('[data-action="back"]')) window.AppNavigation?.navigate?.('./receipt-change.html'); });
  window.OperationsService.get('receiptChanges', id).then((record) => {
    if (!record) return (content.innerHTML = '<div class="detail-empty">变更单不存在或已删除</div>');
    const lines = record.items?.length ? record.items : [{ goodsName: record.goodsName || '--', unit: '斤', shippingQty: 1, acceptedQty: 1, afterQty: 1, differenceQty: 0, unitPrice: record.beforeAmount || 0, shippingAmount: record.beforeAmount || 0, afterAmount: record.afterAmount || 0, differenceAmount: record.differenceAmount || 0, reason: record.changeReason || '--' }];
    content.innerHTML = `<section class="order-status-strip"><span>单据状态</span><strong>${esc(statusMap[record.status] || record.status)}</strong></section><section class="order-detail-section"><h2>变更信息</h2><dl class="order-detail-grid">
    ${field('变更单号', record.changeNo)}${field('客户名称', record.customerName)}${field('食堂', record.canteen)}${field('变更原因', record.changeReason)}${field('关联单号', record.orderNo)}${field('添加时间', record.createdAt)}${field('添加人', record.creator)}
    ${field('变更前发货数量合计', record.beforeQty)}${field('变更后发货数量合计', record.afterQty)}${field('变更前发货金额合计', money(record.beforeAmount))}${field('变更后发货金额合计', money(record.afterAmount))}${field('订单备注', record.remark)}${field('附件', record.attachment)}${record.auditOpinion ? field('审核意见', record.auditOpinion) : ''}</dl></section>
    <section class="order-detail-section"><h2>商品信息</h2><div class="order-goods-table-wrap"><table class="order-goods-table change-goods-table"><thead><tr><th>序号</th><th>图片</th><th>商品名称（计量单位/品牌/规格）</th><th>计量单位</th><th>发货数量</th><th>验货数量</th><th>变更后数量</th><th>差异数量</th><th>下单单价</th><th>发货金额</th><th>变更后金额</th><th>差异金额</th><th>变更原因</th></tr></thead><tbody>
    ${lines.map((line, index) => `<tr><td>${index + 1}</td><td><span class="goods-thumb">暂无图片</span></td><td class="goods-name-cell">${esc(line.goodsName)}</td><td>${esc(line.unit)}</td><td>${line.shippingQty}</td><td>${line.acceptedQty}</td><td>${line.afterQty}</td><td>${line.differenceQty}</td><td>${money(line.unitPrice)}</td><td>${money(line.shippingAmount)}</td><td>${money(line.afterAmount)}</td><td>${money(line.differenceAmount)}</td><td>${esc(line.reason)}</td></tr>`).join('')}</tbody></table></div></section>`;
  });
})();
