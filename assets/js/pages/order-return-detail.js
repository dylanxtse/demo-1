(function () {
  const backIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/><path d="M19 12H9"/></svg>';
  const escapeHtml = (value) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  const money = (value) => Number(value || 0).toFixed(2);

  const statusMap = { PENDING_AUDIT: '待审核', APPROVED: '已审核', REJECTED: '已驳回', CLOSED: '已关闭' };

  const getStatusClass = (status) => {
    if (status === 'CLOSED' || status === 'APPROVED') return 'online';
    if (status === 'PENDING_AUDIT') return 'draft';
    if (status === 'REJECTED') return 'cancelled';
    return 'offline';
  };

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  function infoItem(label, value) {
    return `<div class="info-item"><span class="info-label">${label}：</span><span class="info-value">${escapeHtml(value || '--')}</span></div>`;
  }

  function renderProductImg() {
    return `<div class="detail-product-img">图片</div>`;
  }

  function renderOperationLogs(logs) {
    if (!logs || !logs.length) return '<span class="detail-empty">--</span>';
    return logs.map((log) => `
      <div class="detail-timeline-item">
        <div class="detail-timeline-node"></div>
        <div class="detail-timeline-content">
          <span class="detail-timeline-action">${escapeHtml(log.action)}</span>
          <span class="detail-timeline-desc">${escapeHtml(log.desc)}</span>
        </div>
      </div>
    `).join('');
  }

  function ensureOperationLogs(record) {
    if (record.operationLogs && record.operationLogs.length) return record.operationLogs;
    const createdTime = record.createdAt || '';
    return [
      { action: '添加', desc: `${record.creator || '当前用户'} 创建了退货单 ${record.returnNo || ''}　${createdTime}` },
      { action: '提交审核', desc: `${record.creator || '当前用户'} 提交审核　${createdTime}` },
      { action: '审核', desc: record.status === 'REJECTED' ? `审核驳回，驳回原因：${record.rejectReason || '--'}　${record.auditAt || ''}` : `审核通过，审核人：${record.auditor || '当前用户'}　${record.auditAt || ''}` },
      { action: '完成', desc: record.status === 'CLOSED' ? '退货单已关闭' : '等待完成' }
    ];
  }

  function render(record) {
    if (!record) {
      return `<div class="page-card processing-detail-page order-detail-page">
        <div class="processing-detail-page-header">
          <button class="back-link" type="button" data-action="back">${backIcon}<span>返回</span></button>
          <h1>退货详情</h1>
        </div>
        <div class="processing-detail-page-body"><div class="page-empty-state">未找到退货单</div></div>
      </div>`;
    }

    const lines = record.items && record.items.length ? record.items : [{
      goodsName: record.goodsName || '--',
      unit: '--',
      orderPrice: 0,
      shippedQty: 0,
      applyQty: 0,
      applyPrice: 0,
      applyAmount: 0,
      damageQty: 0,
      purchaseOrder: '--',
      remark: ''
    }];

    const itemRows = lines.map((line, index) => {
      const productDisplay = window.DomUtils.formatProductDisplay(line);
      return `
      <tr>
        <td>${index + 1}</td>
        <td>${renderProductImg()}</td>
        <td class="goods-name-cell" style="min-width:230px;text-align:left"><span class="product-display-text" title="${escapeHtml(productDisplay)}">${escapeHtml(productDisplay)}</span></td>
        <td>${escapeHtml(line.unit)}</td>
        <td>${money(line.orderPrice)}</td>
        <td>${line.shippedQty || 0}</td>
        <td>${line.returnedQty || 0}</td>
        <td>${line.applyQty || 0}</td>
        <td>${money(line.applyPrice)}</td>
        <td>${money(line.applyAmount ?? line.applyQty * line.applyPrice)}</td>
        <td>${line.damageQty || 0}</td>
        <td>${escapeHtml(line.purchaseOrder || '--')}</td>
        <td>${escapeHtml(line.remark || '--')}</td>
      </tr>
    `;
    }).join('');

    const logs = ensureOperationLogs(record);

    return `<div class="page-card processing-detail-page order-detail-page">
      <div class="processing-detail-page-header">
        <button class="back-link" type="button" data-action="back">${backIcon}<span>返回</span></button>
        <h1>退货详情</h1>
        <div class="detail-header-status">
          <span class="detail-header-status-label">单据状态</span>
          <span class="status-tag ${getStatusClass(record.status)}">${escapeHtml(statusMap[record.status] || record.status || '--')}</span>
        </div>
      </div>
      <div class="processing-detail-page-body">
        <div class="processing-detail-section">
          <h3>基本信息</h3>
          <div class="processing-detail-info">
            ${infoItem('退货单号', record.returnNo)}
            ${infoItem('客户名称', record.customerName)}
            ${infoItem('食堂名称', record.canteen)}
            ${infoItem('退货原因', record.reason)}
            ${infoItem('关联订单号', record.orderNo)}
            ${infoItem('退货时间', record.createdAt)}
            ${infoItem('单据来源', record.source || '平台添加')}
            ${infoItem('退回仓库', record.warehouse)}
            ${infoItem('司机', record.driver)}
            ${infoItem('验收时间', record.acceptedAt)}
            ${infoItem('制单人', record.creator)}
            ${record.rejectReason ? infoItem('驳回原因', record.rejectReason) : ''}
          </div>
        </div>
        <div class="processing-detail-section">
          <h3>退货商品</h3>
          <div class="order-detail-table-wrap">
            <table class="processing-detail-table order-detail-table return-goods-table" style="min-width:1620px">
              <thead>
                <tr>
                  <th>序号</th>
                  <th>图片</th>
                  <th>商品名称（计量单位/品牌/规格）</th>
                  <th>计量单位</th>
                  <th>下单单价</th>
                  <th>发货数量</th>
                  <th>已退数</th>
                  <th>退货数量</th>
                  <th>退货单价</th>
                  <th>退货金额</th>
                  <th>报损数量</th>
                  <th>关联采购单</th>
                  <th>备注</th>
                </tr>
              </thead>
              <tbody>${itemRows || '<tr><td colspan="13" style="text-align:center;color:var(--text-tertiary);">暂无明细</td></tr>'}</tbody>
            </table>
          </div>
        </div>
        <div class="processing-detail-section">
          <h3>备注</h3>
          <div class="detail-remark-box">${escapeHtml(record.remark || '--')}</div>
        </div>
        <div class="processing-detail-section">
          <h3>操作记录</h3>
          <div class="detail-timeline">${renderOperationLogs(logs)}</div>
        </div>
      </div>
    </div>`;
  }

  window.OperationsService.get('returns', id).then((record) => {
    window.AppShell.mount({ title: '订单退货', content: render(record) });
    document.getElementById('pageContent').addEventListener('click', (event) => {
      if (event.target.closest('[data-action="back"]')) {
        window.AppNavigation?.navigate?.('./order-return.html');
      }
    });
  }).catch((error) => {
    window.AppShell.mount({ title: '订单退货', content: `<div class="page-card processing-detail-page order-detail-page"><div class="processing-detail-page-header"><button class="back-link" type="button" onclick="window.AppNavigation.navigate('./order-return.html')">${backIcon}<span>返回</span></button><h1>退货详情</h1></div><div class="processing-detail-page-body"><div class="page-empty-state">${escapeHtml(error.message || '退货单加载失败')}</div></div></div>` });
  });
})();
