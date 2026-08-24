(function () {
  'use strict';

  const store = window.SalesReconciliationStore;
  const params = new URLSearchParams(window.location.search);
  const sourceRecord = store.getRecord(params.get('id')) || store.getState().records.find((item) => item.mode === params.get('mode')) || store.getState().records[0];
  const readOnly = params.get('view') !== 'edit';
  const isReturn = sourceRecord?.mode === 'return';
  const record = JSON.parse(JSON.stringify(sourceRecord || {}));
  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  const money = (value) => Number(value || 0).toFixed(2);
  const backIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/><path d="M19 12H9"/></svg>';
  const statusBadge = (value, feedback = false) => {
    const statusClass = feedback
      ? (value === '已反馈' ? 'online' : 'feedback-unconfirmed')
      : (value === '已对账' || value === '已结算' ? 'online' : ['未结算', '部分结算'].includes(value) ? 'pending' : 'draft');
    return `<span class="status-tag ${statusClass}">${escapeHtml(value)}</span>`;
  };
  const appRoot = window.AppShell.mount({
    title: readOnly ? '对账详情' : '对账',
    content: `<section class="page-card processing-detail-page order-detail-page sales-reconciliation-detail-page" aria-label="${readOnly ? '对账详情' : '对账'}" data-sales-detail-root></section>`
  });
  const page = appRoot.querySelector('[data-sales-detail-root]');
  const products = Array.isArray(record.products) ? record.products : [];

  function renderInfoItem(label, value, options = {}) {
    const editable = !readOnly && options.editable;
    const content = editable
      ? `<input class="form-control processing-detail-edit-control" type="${options.type || 'text'}" value="${escapeHtml(value)}" data-detail-field="${escapeHtml(options.key)}">`
      : (options.badge ? statusBadge(value, options.feedback) : escapeHtml(value ?? '--'));
    return `<div class="info-item"><span class="info-label">${escapeHtml(label)}：</span><span class="info-value">${content}</span></div>`;
  }

  function renderProducts() {
    const columns = isReturn
      ? ['序号', '商品名称', '计量单位', '退货数量', '退货单价', '退货金额', '差异数量', '差异单价', '差异金额', '差异备注']
      : ['序号', '商品名称', '计量单位', '发货数量', '下单单价', '发货金额', '对账抹零', '验收数量', '验收单价', '差异数量', '差异单价', '差异金额', '差异备注'];
    const editableFields = isReturn ? ['quantity', 'unitPrice', 'amount', 'remark'] : ['quantity', 'unitPrice', 'amount', 'zeroing', 'remark'];
    const valueCell = (product, key, inputType = 'number') => {
      if (!readOnly && editableFields.includes(key)) return `<input class="sales-detail-cell-input" type="${inputType}" value="${escapeHtml(product[key])}" data-product-field="${key}">`;
      return escapeHtml(product[key] ?? '--');
    };
    const rows = products.map((product, index) => `<tr>
      <td>${index + 1}</td><td>${escapeHtml(product.name)}</td><td>${escapeHtml(product.unit)}</td>
      <td>${valueCell(product, 'quantity')}</td><td>${valueCell(product, 'unitPrice')}</td><td>${valueCell(product, 'amount')}</td>
      ${isReturn ? '' : `<td>${valueCell(product, 'zeroing')}</td><td>${escapeHtml(product.acceptedQuantity)}</td><td>${escapeHtml(product.acceptedPrice)}</td>`}
      <td>${escapeHtml(product.differenceQuantity)}</td><td>${escapeHtml(product.differencePrice)}</td><td>${escapeHtml(product.differenceAmount)}</td><td>${valueCell(product, 'remark', 'text')}</td>
    </tr>`).join('');
    const totalQuantity = products.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const totalAmount = products.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    return `<div class="order-detail-table-wrap"><table class="processing-detail-table sales-detail-table"><thead><tr>${columns.map((column) => `<th>${column}</th>`).join('')}</tr></thead><tbody>${rows}</tbody><tfoot><tr class="sales-total"><td colspan="3">金额合计（元）</td><td>${totalQuantity}</td><td></td><td>${money(totalAmount)}</td><td colspan="${isReturn ? 4 : 7}"></td></tr></tfoot></table></div>`;
  }

  function toast(message) {
    page.querySelector('.sales-toast')?.remove();
    const element = document.createElement('div');
    element.className = 'sales-toast';
    element.textContent = message;
    page.appendChild(element);
    window.setTimeout(() => element.remove(), 2200);
  }

  const title = readOnly ? '对账详情' : '对账';
  const businessAmountLabel = isReturn ? '退货金额' : '发货金额';
  const receivableLabel = isReturn ? '应退金额' : '应收金额';
  page.innerHTML = `<div class="processing-detail-page-header"><button class="back-link" type="button" data-detail-back>${backIcon}<span>返回</span></button><h1>${title}</h1></div>
    <div class="processing-detail-page-body"><div class="processing-detail-section"><h3>基础信息</h3><div class="processing-detail-info">
      ${renderInfoItem('对账单号', record.accountNo)}${renderInfoItem('客户名称', record.customerName)}${renderInfoItem('食堂', record.canteen)}${renderInfoItem('关联单号', record.relatedNo)}
      ${renderInfoItem('业务时间', record.businessTime)}${renderInfoItem(businessAmountLabel, money(record.amount))}${renderInfoItem('对账状态', record.status, { badge: true })}
      ${renderInfoItem('客户反馈状态', record.feedbackStatus, { badge: true, feedback: true })}${!isReturn ? renderInfoItem('整单折扣', '100 %') : ''}${renderInfoItem('对账金额', money(record.amount), { key: 'amount', editable: !readOnly, type: 'number' })}${renderInfoItem('差异金额合计', '0.00')}${!isReturn ? renderInfoItem('抹零金额合计', money(record.zeroing), { key: 'zeroing', editable: true, type: 'number' }) : ''}
      ${renderInfoItem(receivableLabel, money(record.receivable))}
    </div></div>
    <div class="processing-detail-section"><h3>${isReturn ? '退货单商品清单' : '订单商品清单'}</h3>${renderProducts()}</div></div>
    <footer class="processing-detail-footer sales-detail-footer"><button type="button" class="btn" data-detail-back>返回</button>${readOnly ? '' : '<button type="button" class="btn btn-primary" data-detail-save>保存</button>'}</footer>`;

  page.addEventListener('click', (event) => {
    if (event.target.closest('[data-detail-back]')) window.location.href = './sales-reconciliation.html';
    if (event.target.closest('[data-detail-save]')) {
      const updatedProducts = products.map((product, index) => {
        const row = page.querySelectorAll('.sales-detail-table tbody tr')[index];
        const updated = { ...product };
        row?.querySelectorAll('[data-product-field]').forEach((input) => {
          updated[input.dataset.productField] = input.type === 'number' ? Number(input.value || 0) : input.value;
        });
        return updated;
      });
      const detailPatch = {};
      page.querySelectorAll('[data-detail-field]').forEach((input) => {
        detailPatch[input.dataset.detailField] = Number(input.value || 0);
      });
      const updatedAmount = detailPatch.amount ?? updatedProducts.reduce((sum, product) => sum + Number(product.amount || 0), 0);
      const updatedZeroing = detailPatch.zeroing ?? Number(record.zeroing || 0);
      store.updateRecord(record.id, {
        products: updatedProducts,
        amount: updatedAmount,
        zeroing: updatedZeroing,
        receivable: isReturn ? updatedAmount : updatedAmount - updatedZeroing,
        status: '已对账'
      });
      toast('保存成功');
      window.setTimeout(() => { window.location.href = './sales-reconciliation.html'; }, 650);
    }
  });
})();
