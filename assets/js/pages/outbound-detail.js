(function () {
  const backIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/><path d="M19 12H9"/></svg>';
  const escapeHtml = (value) => window.DomUtils.escapeHtml(value);
  const getStatusClass = (status) => {
    if (status === 'COMPLETED') return 'online';
    if (status === 'PENDING_AUDIT' || status === 'PENDING') return 'draft';
    if (status === 'REJECTED') return 'cancelled';
    return 'offline';
  };
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const returnTo = ['processing-record.html', 'outbound.html', 'inbound.html'].includes(params.get('returnTo'))
    ? params.get('returnTo')
    : 'outbound.html';
  const order = window.OutboundService.getDetail(id);

  function renderProductImg() {
    return `<div class="detail-product-img">图片</div>`;
  }

  function renderAttachments(attachments) {
    if (!attachments || !attachments.length) return '<span class="detail-empty">--</span>';
    return attachments.map((file) => `
      <div class="detail-attachment-item">
        <div class="detail-attachment-thumb">${escapeHtml(file.format)}</div>
        <div class="detail-attachment-info">
          <span class="detail-attachment-name">${escapeHtml(file.name)}</span>
          <span class="detail-attachment-meta">${escapeHtml(file.format.toUpperCase())} · ${escapeHtml(file.size)}</span>
        </div>
      </div>
    `).join('');
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

  function render() {
    if (!order) {
      return `<div class="page-card processing-detail-page"><div class="processing-detail-page-header"><button class="back-link" type="button" data-action="back-to-list">${backIcon}<span>返回</span></button><h1>出库单详情</h1></div><div class="processing-detail-page-body"><div class="page-empty-state">未找到出库单</div></div></div>`;
    }
    const itemRows = (order.items || []).map((item, index) => {
      const productDisplay = window.DomUtils.formatProductDisplay(item);
      return `
      <tr>
        <td>${index + 1}</td>
        <td>${renderProductImg()}</td>
        <td><span class="product-display-text" title="${escapeHtml(productDisplay)}">${escapeHtml(productDisplay)}</span></td>
        <td>${escapeHtml(item.unit)}</td>
        <td>${escapeHtml(String(item.outboundQty ?? '--'))}</td>
        <td>${escapeHtml(String(item.unitPrice ?? '--'))}</td>
        <td>${escapeHtml(String(item.amount ?? '--'))}</td>
        <td>${escapeHtml(item.remark || '--')}</td>
      </tr>
    `;
    }).join('');

    return `<div class="page-card processing-detail-page outbound-detail-page">
      <div class="processing-detail-page-header">
        <button class="back-link" type="button" data-action="back-to-list">${backIcon}<span>返回</span></button>
        <h1>出库单详情</h1>
        <div class="detail-header-status">
          <span class="detail-header-status-label">单据状态</span>
          <span class="status-tag ${getStatusClass(order.status)}">${escapeHtml(window.BusinessRules.statusLabel('outboundOrders', order.status))}</span>
        </div>
      </div>
      <div class="processing-detail-page-body">
        <div class="processing-detail-section">
          <h3>基本信息</h3>
          <div class="processing-detail-info">
            <div class="info-item"><span class="info-label">出库单号：</span><span class="info-value">${escapeHtml(order.id)}</span></div>
            <div class="info-item"><span class="info-label">仓库：</span><span class="info-value">${escapeHtml(order.warehouseName)}</span></div>
            <div class="info-item"><span class="info-label">出库类型：</span><span class="info-value">${escapeHtml(order.outboundType)}</span></div>
            <div class="info-item"><span class="info-label">出库时间：</span><span class="info-value">${escapeHtml(order.outboundTime)}</span></div>
            <div class="info-item"><span class="info-label">供应商/采购员/客户：</span><span class="info-value">${escapeHtml(order.supplierPurchaserCustomerName)}</span></div>
            <div class="info-item"><span class="info-label">制单人：</span><span class="info-value">${escapeHtml(order.creator)}</span></div>
          </div>
        </div>
        <div class="processing-detail-section">
          <h3>出库明细</h3>
          <table class="processing-detail-table outbound-detail-table">
            <thead>
              <tr>
                <th>序号</th>
                <th>图片</th>
                <th style="min-width:230px">商品名称（计量单位/品牌/规格）</th>
                <th>计量单位</th>
                <th>出库数量</th>
                <th>出库单价</th>
                <th>出库金额</th>
                <th>备注</th>
              </tr>
            </thead>
            <tbody>${itemRows || '<tr><td colspan="8" style="text-align:center;color:var(--text-tertiary);">暂无数据</td></tr>'}</tbody>
          </table>
        </div>
        <div class="processing-detail-section">
          <h3>备注</h3>
          <div class="detail-remark-box">${escapeHtml(order.remark || '--')}</div>
        </div>
        <div class="processing-detail-section">
          <h3>附件</h3>
          <div class="detail-attachment-list">${renderAttachments(order.attachments)}</div>
        </div>
        <div class="processing-detail-section">
          <h3>操作记录</h3>
          <div class="detail-timeline">${renderOperationLogs(order.operationLogs)}</div>
        </div>
      </div>
    </div>`;
  }

  window.AppShell.mount({ title: '出库管理', content: render() });
  document.getElementById('pageContent').addEventListener('click', (event) => {
    if (event.target.closest('[data-action="back-to-list"]')) window.AppNavigation?.navigate?.(`./${returnTo}`);
  });
})();
