(function () {
  const service = window.SchoolOrderService;
  if (!service) return;
  const id = new URLSearchParams(window.location.search).get('id') || '';
  const demoOrder = (() => {
    const participant = id.endsWith('-TEACHER') ? '教师' : id.endsWith('-STUDENT') ? '学生' : '';
    if (!id.startsWith('SCHOOL-ORDER-DEMO-20260829-') || !participant) return null;
    const quantities = participant === '学生'
      ? [260.8, 136.8, 424, 197, 228.4, 64.4, 248, 260, 166, 191.2, 236.8, 46]
      : [19.68, 10.08, 32.4, 14.7, 17.04, 4.74, 19.2, 21, 12.6, 13.92, 17.28, 3.6];
    const products = [
      ['大白菜', 'SP0300019', '斤', 2.2], ['大米', 'SP0300025', 'KG', 19], ['大玉米棒子', 'SP0300036', 'KG', 5],
      ['鸡蛋', 'SP0300018', '斤', 22], ['鸡腿肉', 'SP0300013', '斤', 23], ['金龙鱼豆油', 'SP0300017', '斤', 50],
      ['面粉', 'SP0300016', '斤', 30], ['牛奶', 'SP0300037', '瓶', 5], ['苹果', 'SP0300014', '斤', 23],
      ['土豆', 'SP0300040', '斤', 3.2], ['西红柿', 'SP0300020', 'KG', 5.6], ['香蕉', 'SP0300015', '斤', 30]
    ];
    const items = products.map(([name, productCode, unit, orderPrice], index) => ({
      id: `${id}-ITEM-${index + 1}`,
      productName: name,
      goodsName: name,
      productCode,
      unit,
      orderPrice,
      orderQty: quantities[index],
      orderSubtotal: Number((orderPrice * quantities[index]).toFixed(2)),
      shippedQty: 0,
      shippedSubtotal: 0,
      acceptedQty: null,
      acceptedSubtotal: null,
      returnQty: null,
      returnSubtotal: null,
      reconciledQty: null,
      reconciledSubtotal: null,
      traceCode: '',
      remark: '--',
      productionDate: '',
      inspectionImages: [],
      inspectionVideos: []
    }));
    return {
      id,
      orderNo: participant === '学生' ? 'DD202608290300001' : 'DD202608290300002',
      customerName: service.SCHOOL_NAME,
      supplierName: service.SUPPLIER_NAME,
      canteen: service.CANTEEN_NAME,
      purchaseType: '销售订单',
      orderTag: `${participant}-不区分`,
      recipeDemandRecordId: 'RECIPE-DEMAND-DEMO-20260829',
      expectedAt: '2026-09-06 07:30:00',
      source: '食谱下单',
      createdAt: '2026-08-29 16:20:00',
      creator: '管理员',
      shippingAt: '',
      driver: '',
      acceptedAt: '',
      supplement: '否',
      status: '待审核',
      remark: '--',
      orderAmount: Number(items.reduce((sum, item) => sum + item.orderSubtotal, 0).toFixed(2)),
      items,
      operationLogs: [{ action: '食谱需求下单', operator: '管理员', result: '添加', time: '2026-08-29 16:20:00', description: '需求提交记录 XQ2026082948261' }]
    };
  })();
  const order = service.get(id) || demoOrder;
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
  const amount = (item) => Number(item || 0).toFixed(2);
  const qty = (item) => Number(item || 0).toFixed(2).replace(/\.00$/, '');
  const lineDisplay = (line) => window.DomUtils.formatProductDisplay(line);
  const catalog = service.getProductCatalog?.() || [];
  const lineIsNetVegetable = (line) => line.isNetVegetable === true
    || catalog.some((product) => String(product.code) === String(line.productCode || line.goodsCode || line.productId || line.goodsId) && product.isNetVegetable === true);
  const lineDisplayHtml = (line) => `<span class="product-display-text">${lineIsNetVegetable(line) ? '<span class="net-vegetable-tag">净菜</span>' : ''}${escapeHtml(lineDisplay(line))}</span>`;
  const mediaCount = (items, unit) => Array.isArray(items) && items.length ? `${items.length}${unit}` : '--';
  const statusText = (status) => ({
    DRAFT: '暂存',
    PENDING: '待审核',
    PENDING_CONFIRM: '待确认',
    PENDING_AUDIT: '待审核',
    READY_FOR_SORTING: '待分拣',
    READY_FOR_SHIPPING: '待发货',
    REJECTED: '已驳回',
    APPROVED: '已审核',
    CONFIRMED: '已确认',
    COMPLETED: '已完成',
    SHIPPED: '已发货',
    CLOSED: '已关闭'
  }[status] || status || '--');
  const statusClass = (status) => {
    if (['已完成', '已发货', 'COMPLETED', 'SHIPPED'].includes(status)) return 'online';
    if (['待审核', '待发货', '待确认', '待出库', '暂存', 'PENDING', 'PENDING_CONFIRM', 'PENDING_AUDIT', 'READY_FOR_SHIPPING', 'DRAFT'].includes(status)) return 'draft';
    if (['已驳回', 'REJECTED'].includes(status)) return 'cancelled';
    return 'offline';
  };
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
    const productRows = lines.map((line, index) => {
      const productCode = line.goodsCode || line.goodsId || line.productCode || line.productId || '';
      const unitPrice = line.unitPrice ?? line.orderPrice;
      const quantity = line.quantity ?? line.orderQty;
      const subtotal = line.subtotal ?? line.orderSubtotal ?? Number(quantity || 0) * Number(unitPrice || 0);
      const shippedAmount = line.shippedAmount ?? line.shippedSubtotal;
      const returnQty = line.returnQty;
      const returnAmount = line.returnAmount ?? line.returnSubtotal;
      const reconciliationQty = line.reconciliationQty ?? line.reconciledQty;
      const reconciliationAmount = line.reconciliationAmount ?? line.reconciledSubtotal;
      const acceptedAmount = line.acceptedAmount ?? line.acceptedSubtotal;
      const traceCode = line.traceCode || (productCode ? `SYM${String(line.productionDate || '').replace(/-/g, '')}${productCode}` : '--');
      const productDisplay = lineDisplay(line);
      const isNetVegetable = lineIsNetVegetable(line);
      return `<tr class="${isNetVegetable ? 'net-material-parent-row' : ''}">
        <td>${index + 1}</td>
        <td><div class="detail-product-img" aria-label="商品图片">图片</div></td>
        <td><span class="product-display-text" title="${escapeHtml(productDisplay)}">${lineIsNetVegetable(line) ? '<span class="net-vegetable-tag">净菜</span>' : ''}${escapeHtml(productDisplay)}</span></td>
        <td>${escapeHtml(productCode || '--')}</td>
        <td>${value(line.unit)}</td>
        <td>${amount(unitPrice)}</td>
        <td>${qty(quantity)}</td>
        <td>${amount(subtotal)}</td>
        <td>${qty(line.shippedQty)}</td>
        <td>${amount(shippedAmount)}</td>
        <td>${qty(returnQty)}</td>
        <td>${amount(returnAmount)}</td>
        <td>${qty(reconciliationQty)}</td>
        <td>${amount(reconciliationAmount)}</td>
        <td>${qty(line.acceptedQty)}</td>
        <td>${amount(acceptedAmount)}</td>
        <td class="detail-trace-code">${escapeHtml(traceCode)}</td>
        <td>${value(line.remark)}</td>
        <td>${value(line.productionDate)}</td>
        <td>${mediaCount(line.inspectionImages, '张')}</td>
        <td>${mediaCount(line.inspectionVideos, '个')}</td>
      </tr>`;
    }).join('');
    const content = `<section class="page-card processing-detail-page order-detail-page school-order-detail-page" id="schoolOrderDetailPage" aria-label="订单详情">
      <header class="processing-detail-page-header"><button type="button" class="back-link" data-action="back" aria-label="返回订单管理"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"></path><path d="M19 12H9"></path></svg><span>返回</span></button><h1>订单详情</h1><div class="detail-header-status"><span class="detail-header-status-label">单据状态</span><span class="status-tag ${statusClass(order.status)}">${escapeHtml(statusText(order.status))}</span></div></header>
      <div class="processing-detail-page-body">
        <div class="processing-detail-section"><h3>基本信息</h3><div class="processing-detail-info">
          ${infoItem('订单号', order.orderNo)}
          ${infoItem('客户名称', order.customerName || service.SCHOOL_NAME)}
          ${infoItem('食堂', order.canteen)}
          ${infoItem('采购类型', order.purchaseType || '销售订单')}
          ${infoItem('订单标签', order.orderTag)}
          ${infoItem('期望送达时间', order.expectedAt)}
          ${infoItem('单据来源', order.source)}
          ${infoItem('添加时间', order.createdAt)}
          ${infoItem('制单人', order.creator)}
          ${infoItem('发货时间', order.shippingAt)}
          ${infoItem('司机', order.driver)}
          ${infoItem('验收时间', order.acceptedAt)}
          ${infoItem('是否补单', order.supplement)}
          ${order.rejectReason ? infoItem('驳回原因', order.rejectReason) : ''}
        </div></div>
        <div class="processing-detail-section"><h3>商品信息</h3><div class="order-detail-table-wrap"><table class="processing-detail-table order-detail-table"><thead><tr>
          <th>序号</th><th>图片</th><th style="min-width:230px">商品名称（计量单位/品牌/规格）</th><th>商品编号</th><th>计量单位</th><th>下单单价</th><th>下单数量</th><th>下单小计</th><th>发货数量</th><th>发货小计</th><th>退货数量</th><th>退货小计</th><th>对账数量</th><th>对账小计</th><th>验货数量</th><th>验货金额</th><th>溯源码</th><th>备注</th><th>生产日期</th><th>验货图片</th><th>验货视频</th>
        </tr></thead><tbody>${productRows || '<tr><td colspan="21" style="text-align:center;color:var(--text-tertiary);">暂无明细</td></tr>'}</tbody></table></div></div>
        <div class="processing-detail-section"><h3>备注</h3><div class="detail-remark-box">${value(order.remark)}</div></div>
        <div class="processing-detail-section"><h3>操作记录</h3><div class="detail-timeline">${renderOperationLogs(order.operationLogs)}</div></div>
      </div>
      <footer class="school-order-detail-actions"><button type="button" class="btn" data-action="back">返回</button></footer>
    </section>`;
    const root = window.AppShell.mount({ title: '订单详情', content, variant: 'school', companyName: service.SCHOOL_NAME, emptyText: '订单详情' });
    const page = root.querySelector('#schoolOrderDetailPage');
    page.addEventListener('click', (event) => {
      const button = event.target.closest('[data-action]');
      if (!button) return;
      const action = button?.dataset.action;
      if (action === 'back') navigate('./school-order-management.html');
    });
  }

  render();
})();
