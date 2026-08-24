(function () {
  const backIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/><path d="M19 12H9"/></svg>';
  const escapeHtml = (value) => window.DomUtils.escapeHtml(value);
  const getStatusClass = (status) => status === 'COMPLETED'
    ? 'online'
    : (status === 'PENDING_AUDIT' ? 'draft' : (status === 'PENDING' ? 'pending' : 'offline'));
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const returnTo = ['processing-record.html', 'outbound.html', 'inbound.html'].includes(params.get('returnTo'))
    ? params.get('returnTo')
    : 'inbound.html';
  let order = window.InboundService.getDetail(id);
  let qualityRowIndex = null;

  function canUploadQualityReports() {
    return order?.entryType === '净菜加工入库' && order.status === 'PENDING';
  }

  function renderQualityReportCell(item, index) {
    const count = (item.qualityFiles && item.qualityFiles.length) || 0;
    if (!canUploadQualityReports()) return count > 0 ? `${count}份` : '--';
    return `<div class="detail-quality-report-cell">
      ${count > 0 ? `<span>${count}份</span>` : '<span class="detail-empty">未上传</span>'}
      <button class="btn-text" type="button" data-action="open-quality-report" data-index="${index}">上传</button>
    </div>`;
  }

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
      return `<div class="page-card processing-detail-page"><div class="processing-detail-page-header"><button class="back-link" type="button" data-action="back-to-list">${backIcon}<span>返回</span></button><h1>入库单详情</h1></div><div class="processing-detail-page-body"><div class="page-empty-state">未找到入库单</div></div></div>`;
    }
    const itemRows = (order.items || []).map((item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${renderProductImg()}</td>
        <td>
          <div class="detail-product-name">${escapeHtml(item.productName)}</div>
          <div class="detail-product-sub">(${escapeHtml(item.unit)}/${escapeHtml(item.brand || '--')}/${escapeHtml(item.spec || '--')})</div>
        </td>
        <td>${escapeHtml(item.unit)}</td>
        <td>${escapeHtml(String(item.actualQty ?? '--'))}</td>
        <td>${escapeHtml(String(item.unitPrice ?? '--'))}</td>
        <td>${escapeHtml(String(item.amount ?? '--'))}</td>
        <td>${escapeHtml(item.productionDate || '--')}</td>
        <td data-quality-cell="${index}">${renderQualityReportCell(item, index)}</td>
      </tr>
    `).join('');

    return `<div class="page-card processing-detail-page inbound-detail-page">
      <div class="processing-detail-page-header">
        <button class="back-link" type="button" data-action="back-to-list">${backIcon}<span>返回</span></button>
        <h1>入库单详情</h1>
        <div class="detail-header-status">
          <span class="detail-header-status-label">单据状态</span>
          <span class="status-tag ${getStatusClass(order.status)}">${escapeHtml(window.BusinessRules.statusLabel('inboundOrders', order.status))}</span>
        </div>
      </div>
      <div class="processing-detail-page-body">
        <div class="processing-detail-section">
          <h3>基本信息</h3>
          <div class="processing-detail-info">
            <div class="info-item"><span class="info-label">入库单号：</span><span class="info-value">${escapeHtml(order.id)}</span></div>
            <div class="info-item"><span class="info-label">仓库：</span><span class="info-value">${escapeHtml(order.warehouseName)}</span></div>
            <div class="info-item"><span class="info-label">入库类型：</span><span class="info-value">${escapeHtml(order.entryType)}</span></div>
            <div class="info-item"><span class="info-label">关联单号：</span><span class="info-value">${escapeHtml(order.relNo)}</span></div>
            <div class="info-item"><span class="info-label">入库时间：</span><span class="info-value">${escapeHtml(order.entryTime)}</span></div>
            <div class="info-item"><span class="info-label">供应商/采购员/客户：</span><span class="info-value">${escapeHtml(order.supplierPurchaserCustomerName)}</span></div>
            <div class="info-item"><span class="info-label">采购负责人：</span><span class="info-value">${escapeHtml(order.purchaserLeaderName)}</span></div>
            <div class="info-item"><span class="info-label">制单人：</span><span class="info-value">${escapeHtml(order.creator)}</span></div>
          </div>
        </div>
        <div class="processing-detail-section">
          <h3>入库明细</h3>
          <table class="processing-detail-table inbound-detail-table">
            <thead>
              <tr>
                <th>序号</th>
                <th>图片</th>
                <th style="min-width:230px">商品名称(计量单位/品牌/规格)</th>
                <th>计量单位</th>
                <th>入库数量</th>
                <th>单价</th>
                <th>入库金额</th>
                <th>生产日期</th>
                <th>质检报告</th>
              </tr>
            </thead>
            <tbody>${itemRows || '<tr><td colspan="9" style="text-align:center;color:var(--text-tertiary);">暂无明细</td></tr>'}</tbody>
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
    </div>
    <div class="qr-modal" id="inboundDetailQrModal" aria-hidden="true">
      <div class="qr-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="inboundDetailQrTitle">
        <div class="qr-modal-header">
          <h2 class="qr-modal-title" id="inboundDetailQrTitle">质检报告</h2>
          <button class="qr-modal-close" type="button" data-action="close-quality-report" aria-label="关闭">×</button>
        </div>
        <div class="qr-modal-body" id="inboundDetailQrBody"></div>
      </div>
    </div>`;
  }

  function openQualityReportModal(index) {
    if (!canUploadQualityReports()) return;
    const item = order.items?.[index];
    if (!item) return;
    qualityRowIndex = index;
    if (!Array.isArray(item.qualityFiles)) item.qualityFiles = [];
    const thumbs = item.qualityFiles.map((file) => `
      <div class="qr-thumb">
        <div class="qr-thumb-img">${escapeHtml((file.format || file.name?.split('.').pop() || 'FILE').toUpperCase())}</div>
        <div class="qr-thumb-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</div>
      </div>
    `).join('');
    const body = document.getElementById('inboundDetailQrBody');
    body.innerHTML = `
      <div class="qr-upload-area">
        <div class="qr-thumbs">${thumbs || '<span class="detail-empty">暂无已上传文件</span>'}</div>
        <button class="qr-upload-btn" type="button" data-action="trigger-quality-upload">＋上传文件</button>
        <input type="file" id="inboundDetailQrFileInput" multiple accept="image/*,.pdf,.doc,.docx" style="display:none">
      </div>
      <div class="qr-modal-tip">支持 jpg/png/pdf/doc/docx 格式，单个文件不超过 10M</div>
    `;
    const modal = document.getElementById('inboundDetailQrModal');
    modal.classList.add('is-visible');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeQualityReportModal() {
    const modal = document.getElementById('inboundDetailQrModal');
    if (!modal) return;
    modal.classList.remove('is-visible');
    modal.setAttribute('aria-hidden', 'true');
    qualityRowIndex = null;
  }

  function handleQualityFileUpload(event) {
    const files = Array.from(event.target.files || []);
    const item = order.items?.[qualityRowIndex];
    if (!files.length || !item || !canUploadQualityReports()) return;
    if (!Array.isArray(item.qualityFiles)) item.qualityFiles = [];
    files.forEach((file) => {
      const format = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : 'file';
      item.qualityFiles.push({ name: file.name, size: file.size, format });
    });
    item.qualityReport = item.qualityFiles.map((file) => file.name).join('; ');
    order = window.InboundService.update(id, { items: order.items }) || order;
    const cell = document.querySelector(`[data-quality-cell="${qualityRowIndex}"]`);
    if (cell) cell.innerHTML = renderQualityReportCell(order.items[qualityRowIndex], qualityRowIndex);
    openQualityReportModal(qualityRowIndex);
  }

  window.AppShell.mount({ title: '入库管理', content: render() });
  document.getElementById('pageContent').addEventListener('click', (event) => {
    const actionEl = event.target.closest('[data-action]');
    const action = actionEl?.dataset.action;
    if (action === 'back-to-list') {
      window.AppNavigation?.navigate?.(`./${returnTo}`);
      return;
    }
    if (action === 'open-quality-report') {
      openQualityReportModal(Number(actionEl.dataset.index));
      return;
    }
    if (action === 'trigger-quality-upload') {
      document.getElementById('inboundDetailQrFileInput')?.click();
      return;
    }
    if (action === 'close-quality-report' || event.target.id === 'inboundDetailQrModal') {
      closeQualityReportModal();
    }
  });
  document.getElementById('pageContent').addEventListener('change', (event) => {
    if (event.target.id === 'inboundDetailQrFileInput') handleQualityFileUpload(event);
  });
})();
