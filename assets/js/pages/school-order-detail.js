(function () {
  const service = window.SchoolOrderService;
  if (!service) return;
  const id = new URLSearchParams(window.location.search).get('id') || '';
  const order = service.get(id);
  if (!order) {
    window.location.href = './school-order-management.html';
    return;
  }

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  const value = (item, fallback = '--') => item === '' || item == null ? fallback : escapeHtml(item);
  const infoItem = (label, item) => `<div class="info-item"><span class="info-label">${escapeHtml(label)}：</span><span class="info-value">${value(item)}</span></div>`;
  const recipeRecordItem = order.recipeDemandRecordId
    ? `<div class="info-item school-order-recipe-record-item"><span class="info-label">食谱Tag：</span><button type="button" class="school-order-recipe-record-link" data-action="recipe-record" data-record-id="${escapeHtml(order.recipeDemandRecordId)}">${escapeHtml(order.recipeTag || '食谱Tag')}</button></div>`
    : '';
  const amount = (item) => item == null || item === '' ? '--' : Number(item).toFixed(2).replace(/\.00$/, '');
  const qty = (item) => item == null || item === '' ? '--' : Number(item).toFixed(2).replace(/\.00$/, '');
  const lineDisplay = (line) => window.DomUtils.formatProductDisplay(line);
  const qualityReportFiles = (raw) => {
    if (Array.isArray(raw)) {
      return raw.filter(Boolean).map((report, index) => typeof report === 'string'
        ? { name: report }
        : { ...report, name: String(report.name || `质检报告${index + 1}`), dataUrl: report.dataUrl || report.url || '' });
    }
    if (raw && typeof raw === 'object') return qualityReportFiles([raw]);
    const text = String(raw ?? '').trim();
    if (!text || text === '0' || text === '--') return [];
    if (/^\d+$/.test(text)) return Array.from({ length: Number(text) }, (_, index) => ({ name: `质检报告${index + 1}` }));
    return text.split(';').map((name) => name.trim()).filter(Boolean).map((name) => ({ name }));
  };
  const qualityReportKind = (file) => {
    const name = String(file?.name || '').toLowerCase();
    const type = String(file?.type || '').toLowerCase();
    if (type.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp)$/i.test(name)) return 'image';
    if (type === 'application/pdf' || /\.pdf$/i.test(name)) return 'pdf';
    return 'file';
  };
  const renderQualityReportCell = (line, index) => {
    const count = qualityReportFiles(line.qualityReport).length;
    if (!count) return '<span class="detail-empty">--</span>';
    return `<button class="supplier-purchase-report-link" type="button" data-action="open-quality-report" data-index="${index}" aria-label="查看${escapeHtml(lineDisplay(line))}质检报告">${count}</button>`;
  };
  const catalog = service.getProductCatalog?.() || [];
  const lineIsNetVegetable = (line) => line.isNetVegetable === true
    || catalog.some((product) => String(product.code) === String(line.productCode || line.goodsCode || line.goodsId) && product.isNetVegetable === true);
  const lineDisplayHtml = (line) => `<span class="product-display-text">${lineIsNetVegetable(line) ? '<span class="net-vegetable-tag">净菜</span>' : ''}${escapeHtml(lineDisplay(line))}</span>`;
  const mediaCount = (items) => Array.isArray(items) && items.length ? `${items.length}项` : '--';
  const operationDescription = (log) => [
    log.operator || '',
    log.result || '',
    log.time || '',
    log.description || log.desc || ''
  ].filter(Boolean).join(' ');
  const renderOperationLogs = (logs) => {
    if (!logs || !logs.length) return '<span class="detail-empty">--</span>';
    return logs.map((log) => `
      <div class="detail-timeline-item">
        <div class="detail-timeline-node"></div>
        <div class="detail-timeline-content">
          <span class="detail-timeline-action">${escapeHtml(log.action || '--')}</span>
          <span class="detail-timeline-desc">${escapeHtml(operationDescription(log) || '--')}</span>
        </div>
      </div>
    `).join('');
  };

  function navigate(url) {
    if (window.AppNavigationGuard?.navigate) window.AppNavigationGuard.navigate(url);
    else window.location.href = url;
  }

  function render() {
    const lines = order.items || [];
    const content = `<section class="school-order-detail-page" id="schoolOrderDetailPage" aria-label="订单详情">
      <header class="school-order-detail-header"><button type="button" class="back-link school-order-detail-back" data-action="back" aria-label="返回订单管理"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"></path><path d="M19 12H9"></path></svg><span>返回</span></button><h1>订单详情</h1></header>
      <div class="school-order-detail-body">
        <section class="school-order-detail-summary processing-detail-info" aria-label="订单基础信息">
          ${infoItem('订单号', order.orderNo)}${infoItem('供货企业', order.supplierName)}${infoItem('食堂', order.canteen)}${infoItem('订单标签', order.orderTag)}${recipeRecordItem}
          ${infoItem('期望送达时间', order.expectedAt)}${infoItem('单据来源', order.source)}${infoItem('添加时间', order.createdAt)}${infoItem('制单人', order.creator)}
          ${infoItem('发货时间', order.shippingAt)}${infoItem('司机', order.driver)}${infoItem('验收时间', order.acceptedAt)}${infoItem('是否补单', order.supplement)}
        </section>
        <section class="school-order-detail-section">
          <div class="school-order-detail-section-title"><h2>商品明细</h2></div>
          <div class="school-order-detail-table-wrap"><table class="school-order-detail-table"><colgroup>${Array.from({ length: 22 }, (_, index) => `<col data-col="${index + 1}">`).join('')}</colgroup><thead><tr>
            <th>序号</th><th>图片</th><th>商品名称（计量单位/品牌/规格）</th><th>质检报告</th><th>商品编号</th><th>计量单位</th><th>下单单价</th><th>下单数量</th><th>下单小计</th><th>发货数量</th><th>发货小计</th><th>验货数量</th><th>验货小计</th><th>退货数量</th><th>退货小计</th><th>对账数量</th><th>对账小计</th><th>溯源码</th><th>备注</th><th>生产日期</th><th>验货图片</th><th>验货视频</th>
          </tr></thead><tbody>${lines.map((line, index) => `<tr>
            <td>${index + 1}</td><td><span class="school-order-image-placeholder" aria-label="商品图片">图片</span></td><td class="detail-goods-name" title="${escapeHtml(lineDisplay(line))}">${lineDisplayHtml(line)}</td><td>${renderQualityReportCell(line, index)}</td><td>${value(line.productCode)}</td><td>${value(line.unit)}</td><td>${amount(line.orderPrice)}</td><td>${qty(line.orderQty)}</td><td>${amount(line.orderSubtotal)}</td><td>${qty(line.shippedQty)}</td><td>${amount(line.shippedSubtotal)}</td><td>${qty(line.acceptedQty)}</td><td>${amount(line.acceptedSubtotal)}</td><td>${qty(line.returnQty)}</td><td>${amount(line.returnSubtotal)}</td><td>${qty(line.reconciledQty)}</td><td>${amount(line.reconciledSubtotal)}</td><td class="detail-trace-code">${value(line.traceCode)}</td><td>${value(line.remark)}</td><td>${value(line.productionDate)}</td><td>${mediaCount(line.inspectionImages)}</td><td>${mediaCount(line.inspectionVideos)}</td>
          </tr>`).join('')}</tbody><tfoot><tr><td colspan="8">金额合计（元）</td><td>${amount(order.orderAmount)}</td><td></td><td>${amount(order.shippingAmount)}</td><td></td><td>${amount(order.acceptedAmount)}</td><td></td><td>${amount(order.returnAmount)}</td><td></td><td>${amount(order.reconciliationAmount)}</td><td colspan="5"></td></tr></tfoot></table></div>
        </section>
        <p class="school-order-detail-note">订单备注：${value(order.remark)}</p>
        <section class="processing-detail-section school-order-log-section"><h3>操作记录</h3><div class="detail-timeline">${renderOperationLogs(order.operationLogs)}</div></section>
      </div>
      <footer class="school-order-detail-actions"><button type="button" class="btn" data-action="back">返回</button></footer>
      <div class="supplier-purchase-report-dialog" id="schoolOrderQualityReportDialog" role="dialog" aria-modal="true" aria-labelledby="schoolOrderQualityReportTitle" hidden>
        <div class="supplier-purchase-report-panel">
          <div class="supplier-purchase-dialog-header"><h2 id="schoolOrderQualityReportTitle" data-report-title>质检报告</h2><button type="button" class="supplier-purchase-dialog-close" data-action="close-quality-report" aria-label="关闭">×</button></div>
          <div class="supplier-purchase-report-body"><div class="supplier-purchase-report-list" data-report-list></div></div>
          <div class="supplier-purchase-report-footer"><button class="btn btn-sm" type="button" data-action="close-quality-report">关闭</button></div>
        </div>
        <div class="supplier-purchase-report-preview" data-report-preview hidden>
          <div class="supplier-purchase-report-preview-panel"><button type="button" class="supplier-purchase-report-preview-close" data-action="close-quality-report-preview" aria-label="关闭预览">×</button><div data-report-preview-content></div></div>
        </div>
      </div>
    </section>`;
    const root = window.AppShell.mount({ title: '订单详情', content, variant: 'school', companyName: service.SCHOOL_NAME, emptyText: '订单详情' });
    const page = root.querySelector('#schoolOrderDetailPage');
    const reportDialog = page.querySelector('#schoolOrderQualityReportDialog');

    const closeQualityReportPreview = () => {
      const layer = reportDialog?.querySelector('[data-report-preview]');
      const preview = reportDialog?.querySelector('[data-report-preview-content]');
      if (layer) layer.hidden = true;
      if (preview) preview.innerHTML = '';
    };
    const renderQualityReportPreview = (file) => {
      const layer = reportDialog?.querySelector('[data-report-preview]');
      const preview = reportDialog?.querySelector('[data-report-preview-content]');
      if (!layer || !preview) return;
      if (!file) {
        closeQualityReportPreview();
        return;
      }
      const kind = qualityReportKind(file);
      const source = String(file.dataUrl || file.url || '');
      const name = escapeHtml(file.name || '质检报告');
      if (source && kind === 'image') {
        preview.innerHTML = `<img class="supplier-purchase-report-preview-image" src="${escapeHtml(source)}" alt="${name}">`;
      } else if (source && kind === 'pdf') {
        preview.innerHTML = `<iframe class="supplier-purchase-report-preview-pdf" src="${escapeHtml(source)}" title="${name}"></iframe>`;
      } else {
        const typeLabel = kind === 'pdf' ? 'PDF' : kind === 'image' ? '图片' : '文件';
        preview.innerHTML = `<div class="supplier-purchase-report-preview-placeholder"><span class="supplier-purchase-report-file-kind">${typeLabel}</span><strong>${name}</strong><p>该质检报告暂无可直接展示的预览内容。</p></div>`;
      }
      layer.hidden = false;
    };
    const closeQualityReport = () => {
      if (!reportDialog) return;
      closeQualityReportPreview();
      reportDialog.hidden = true;
      delete reportDialog.reportFiles;
    };
    const openQualityReport = (index) => {
      const line = lines[index];
      if (!line || !reportDialog) return;
      const files = qualityReportFiles(line.qualityReport);
      reportDialog.reportFiles = files;
      const list = reportDialog.querySelector('[data-report-list]');
      if (list) {
        list.innerHTML = files.map((file, reportIndex) => {
          const kind = qualityReportKind(file);
          const kindLabel = kind === 'pdf' ? 'PDF' : kind === 'image' ? '图片' : '文件';
          const source = String(file.dataUrl || file.url || '');
          const preview = source && kind === 'image'
            ? `<img class="supplier-purchase-report-file-image" src="${escapeHtml(source)}" alt="${escapeHtml(file.name || '质检报告')}">`
            : `<span class="supplier-purchase-report-file-kind">${kindLabel}</span>`;
          return `<button class="supplier-purchase-report-file" type="button" data-action="preview-quality-report" data-report-index="${reportIndex}" aria-label="查看${escapeHtml(file.name || '质检报告')}大图"><span class="supplier-purchase-report-file-preview">${preview}</span><span class="supplier-purchase-report-file-name" title="${escapeHtml(file.name || '质检报告')}">${escapeHtml(file.name || '质检报告')}</span></button>`;
        }).join('') || '<span class="detail-empty">暂无质检报告</span>';
      }
      closeQualityReportPreview();
      reportDialog.hidden = false;
    };
    page.addEventListener('click', (event) => {
      const button = event.target.closest('[data-action]');
      if (!button && event.target !== reportDialog) return;
      const action = button?.dataset.action;
      if (action === 'back') navigate('./school-order-management.html');
      if (action === 'recipe-record') navigate(`./school-recipe-demand-record-detail.html?id=${encodeURIComponent(button.dataset.recordId || '')}`);
      if (action === 'open-quality-report') openQualityReport(Number(button.dataset.index));
      if (action === 'preview-quality-report') renderQualityReportPreview(reportDialog?.reportFiles?.[Number(button.dataset.reportIndex)]);
      if (action === 'close-quality-report-preview') closeQualityReportPreview();
      if (action === 'close-quality-report' || event.target === reportDialog) closeQualityReport();
    });
  }

  render();
})();
