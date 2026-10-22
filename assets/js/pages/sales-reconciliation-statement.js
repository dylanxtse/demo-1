(function () {
  'use strict';

  const store = window.SalesReconciliationStore;
  const params = new URLSearchParams(window.location.search);
  const state = store.getState();
  const savedStatement = params.get('id') ? state.statements.find((item) => item.id === params.get('id')) : null;
  const ids = savedStatement?.recordIds || String(params.get('ids') || '').split(',').filter(Boolean);
  const records = state.records.filter((record) => ids.includes(record.id));
  const sourceRecords = records.length ? records : state.records.slice(0, 2);
  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  const money = (value) => Number(value || 0).toFixed(2);
  const dateOnly = (value) => String(value || '').slice(0, 10);
  const signedAmount = (record, key) => record.mode === 'return' ? -Math.abs(Number(record[key] || 0)) : Number(record[key] || 0);
  const amount = savedStatement?.amount ?? sourceRecords.reduce((sum, record) => sum + signedAmount(record, 'amount'), 0);
  const zeroing = savedStatement?.zeroing ?? sourceRecords.reduce((sum, record) => sum + signedAmount(record, 'zeroing'), 0);
  const receivable = savedStatement?.receivable ?? sourceRecords.reduce((sum, record) => sum + signedAmount(record, 'receivable'), 0);
  const dates = sourceRecords.map((record) => dateOnly(record.businessTime)).sort();
  const startDate = savedStatement?.startDate || dates[0] || '2026-07-01';
  const endDate = savedStatement?.endDate || dates[dates.length - 1] || '2026-07-31';
  const statementNo = savedStatement?.statementNo || `DZ${endDate.replace(/-/g, '')}0001`;
  const recordRemarks = sourceRecords.map((record) => String(record.remark || '').trim()).filter((remark) => remark && remark !== '--');
  const statementRemark = savedStatement?.remark || recordRemarks.join('；') || '';
  const shippingDates = sourceRecords.map((record) => String(record.businessTime || '')).filter(Boolean).sort();
  const shippingPeriod = shippingDates.length
    ? `${shippingDates[0]}${shippingDates.length > 1 ? `~${shippingDates[shippingDates.length - 1]}` : ''}`
    : '--';
  const appRoot = window.AppShell.mount({
    title: '生成对账单',
    content: '<section class="page-card sales-reconciliation-statement-page" aria-label="生成对账单" data-sales-statement-root></section>'
  });
  const page = appRoot.querySelector('[data-sales-statement-root]');

  function toast(message) {
    page.querySelector('.sales-toast')?.remove();
    const element = document.createElement('div');
    element.className = 'sales-toast';
    element.textContent = message;
    page.appendChild(element);
    window.setTimeout(() => element.remove(), 2200);
  }

  function statementRows() {
    return sourceRecords.map((record, index) => {
      const recordAmounts = settlementAmountsFor(record);
      return `<tr><td>${index + 1}</td><td>${escapeHtml(record.canteen)}</td><td>${escapeHtml(record.accountNo)}</td><td>${money(recordAmounts.shippingAmount)}</td><td>${money(recordAmounts.acceptedAmount)}</td><td>${money(signedAmount(record, 'amount'))}</td><td>${money(signedAmount(record, 'zeroing'))}</td><td>${money(signedAmount(record, 'receivable'))}</td></tr>`;
    }).join('');
  }

  function productDetails() {
    const rows = [];
    const fallbackCategories = { 上海青: '蔬菜类', 猪肉: '肉类', 牛奶: '蛋奶类', 鸡蛋: '蛋奶类', 鸡肉: '肉类', 酸奶: '蛋奶类' };
    sourceRecords.forEach((record) => {
      const products = record.products || [];
      const productZeroing = products.reduce((sum, product) => sum + Number(product.zeroing || 0), 0);
      products.forEach((product, index) => {
        const catalogProduct = (window.MockProducts || []).find((item) => item.name === product.name && item.unit === product.unit);
        const sourceQuantity = Number(product.shippingQuantity ?? product.quantity ?? 0);
        const quantity = record.mode === 'return' ? -Math.abs(sourceQuantity) : sourceQuantity;
        const shippingAmount = Number(product.shippingAmount ?? product.amount ?? quantity * Number(product.unitPrice || 0));
        const acceptedQuantity = Number(product.acceptedQuantity ?? product.acceptedQty ?? 0);
        const acceptedAmount = Number(product.acceptedAmount ?? acceptedQuantity * Number(product.acceptedPrice ?? product.unitPrice ?? 0));
        const zeroingAmount = Number(product.zeroing || 0)
          + (index === products.length - 1 ? Math.max(0, Number(record.zeroing || 0) - productZeroing) : 0);
        rows.push({
          recordId: record.id,
          name: product.name || '--',
          category: product.category || product.categoryName || catalogProduct?.category?.split('-').pop() || fallbackCategories[product.name] || '--',
          unit: product.unit || '--',
          quantity,
          unitPrice: Number(product.orderUnitPrice ?? product.unitPrice ?? 0),
          shippingAmount,
          acceptedQuantity,
          acceptedAmount,
          zeroingAmount,
          receivable: shippingAmount - zeroingAmount
        });
      });
    });
    return rows;
  }

  const allProductDetails = productDetails();
  const settlementAmountsByRecord = new Map();
  allProductDetails.forEach((row) => {
    const recordAmounts = settlementAmountsByRecord.get(row.recordId) || { shippingAmount: 0, acceptedAmount: 0 };
    recordAmounts.shippingAmount += row.shippingAmount;
    recordAmounts.acceptedAmount += row.acceptedAmount;
    settlementAmountsByRecord.set(row.recordId, recordAmounts);
  });
  function settlementAmountsFor(record) {
    return settlementAmountsByRecord.get(record.id) || {
      shippingAmount: record.shippingAmount == null ? signedAmount(record, 'amount') : signedAmount(record, 'shippingAmount'),
      acceptedAmount: signedAmount(record, 'acceptedAmount')
    };
  }
  const shippingAmountTotal = sourceRecords.reduce((sum, record) => {
    return sum + settlementAmountsFor(record).shippingAmount;
  }, 0);
  const acceptedAmountTotal = sourceRecords.reduce((sum, record) => {
    return sum + settlementAmountsFor(record).acceptedAmount;
  }, 0);

  function productTableRows(rows) {
    return rows.map((item) => `<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.category)}</td><td>${escapeHtml(item.unit)}</td><td>${money(item.quantity)}</td><td>${money(item.unitPrice)}</td><td>${money(item.shippingAmount)}</td><td>${money(item.acceptedQuantity)}</td><td>${money(item.acceptedAmount)}</td><td>${money(item.zeroingAmount)}</td><td>${money(item.receivable)}</td></tr>`).join('');
  }

  function render() {
    const statementGeneratedAt = savedStatement?.generatedAt || '2026-08-25 12:00:00';
    page.innerHTML = `<div class="sales-statement-shell">
      <div class="sales-statement-topbar"><button type="button" class="back-link sales-back-button" data-statement-back><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"></path><path d="M19 12H9"></path></svg><span>返回</span></button><h2>生成对账单</h2></div>
      <div class="sales-statement-content">
        <h1 class="sales-statement-title">产品部学校食材集采供应链有限公司对账结算单</h1>
        <div class="sales-statement-meta"><span><strong>发货日期：</strong>${escapeHtml(shippingPeriod)}</span><span><strong>客户名称：</strong>${escapeHtml(sourceRecords[0]?.customerName || savedStatement?.customerName || '--')}</span><span><strong>制单人：</strong>${escapeHtml(savedStatement?.operator || '管理员')}</span><span><strong>对账单生成时间：</strong>${escapeHtml(statementGeneratedAt)}</span><span><strong>对账金额：</strong>${money(amount)}</span><span><strong>应收金额：</strong>${money(receivable)}</span></div>
        <div class="sales-statement-section-title"><span>对账明细</span><button type="button" class="sales-statement-detail-link" data-statement-products>商品明细表</button></div>
        <div class="sales-statement-table-wrap"><table class="sales-statement-table"><thead><tr><th>序号</th><th>食堂</th><th>对账单号</th><th>发货金额</th><th>验收金额</th><th>对账金额</th><th>抹零金额</th><th>应收金额</th></tr></thead><tbody>${statementRows() || '<tr><td colspan="8">暂无对账明细</td></tr>'}</tbody><tfoot><tr class="sales-statement-total"><td colspan="3">合计</td><td>${money(shippingAmountTotal)}</td><td>${money(acceptedAmountTotal)}</td><td>${money(amount)}</td><td>${money(zeroing)}</td><td>${money(receivable)}</td></tr></tfoot></table></div>
        <section class="sales-statement-summary" aria-label="金额结算"><div class="sales-statement-summary-main"><span><strong>应收金额合计：</strong>￥${money(receivable)}元</span><span><strong>大写金额：</strong>${numberToChinese(receivable)}</span><label><strong>实结金额：</strong><input type="text" inputmode="decimal" data-statement-settlement-amount value="${escapeHtml(savedStatement?.settlementAmount || '')}" aria-label="实结金额"></label></div><div class="sales-statement-summary-confirm"><label><input type="text" data-statement-settlement-date value="${escapeHtml(savedStatement?.settlementDate || '')}" placeholder="______年______月______日" aria-label="结算日期"></label><span>经核实无误，核对人：</span><input type="text" data-statement-checker value="${escapeHtml(savedStatement?.checker || '')}" aria-label="核对人"></div></section>
        <section class="sales-statement-signature" aria-label="签字确认"><div class="sales-statement-signature-item"><h3>企业负责人签字</h3><span>______年______月______日</span></div><div class="sales-statement-signature-item"><h3>企业财务负责人签字</h3><span>______年______月______日</span></div><div class="sales-statement-signature-item"><h3>客户负责人签字</h3><span>______年______月______日</span></div></section>
        <section class="sales-statement-remark" aria-label="备注说明"><label for="salesStatementRemark">备注说明:</label><div class="sales-statement-remark-field"><textarea id="salesStatementRemark" maxlength="200" data-statement-remark>${escapeHtml(statementRemark)}</textarea><span data-statement-remark-count>${statementRemark.length}/200</span></div></section>
      </div>
      <footer class="sales-statement-footer"><button type="button" class="btn" data-statement-back>返回</button><button type="button" class="btn" data-statement-save>保存</button><button type="button" class="btn" data-statement-download>下载</button><button type="button" class="btn btn-primary" data-statement-print>打印</button></footer>
    </div>`;
  }

  function numberToChinese(value) {
    const number = Number(value || 0);
    const absolute = Math.abs(number);
    const digits = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
    const units = ['', '拾', '佰', '仟'];
    const bigUnits = ['', '万', '亿', '兆'];
    const sectionToChinese = (section) => {
      let result = '';
      let zero = false;
      for (let index = 3; index >= 0; index -= 1) {
        const divisor = 10 ** index;
        const digit = Math.floor(section / divisor) % 10;
        if (!digit) {
          if (result) zero = true;
          continue;
        }
        if (zero) result += '零';
        result += digits[digit] + units[index];
        zero = false;
      }
      return result;
    };
    const integerPart = Math.floor(absolute);
    const fractionPart = Math.round((absolute - integerPart) * 100);
    let integer = integerPart;
    let integerText = '';
    let groupIndex = 0;
    let needsZero = false;
    while (integer > 0) {
      const section = integer % 10000;
      if (section) {
        const sectionText = sectionToChinese(section);
        if (integerText && (needsZero || section < 1000)) integerText = `零${integerText}`;
        integerText = `${sectionText}${bigUnits[groupIndex]}${integerText}`;
        needsZero = false;
      } else if (integerText) {
        needsZero = true;
      }
      integer = Math.floor(integer / 10000);
      groupIndex += 1;
    }
    integerText = integerText || '零';
    const jiao = Math.floor(fractionPart / 10);
    const fen = fractionPart % 10;
    let fractionText = '';
    if (jiao) fractionText += `${digits[jiao]}角`;
    if (fen) fractionText += `${jiao ? '' : '零'}${digits[fen]}分`;
    if (!fractionText) fractionText = '整';
    return `${number < 0 ? '负' : ''}${integerText}元${fractionText}`;
  }

  function showProducts() {
    if (page.querySelector('.sales-statement-products-backdrop')) return;
    const rows = productDetails();
    const totals = rows.reduce((result, row) => ({
      quantity: result.quantity + row.quantity,
      shippingAmount: result.shippingAmount + row.shippingAmount,
      acceptedQuantity: result.acceptedQuantity + row.acceptedQuantity,
      acceptedAmount: result.acceptedAmount + row.acceptedAmount,
      zeroingAmount: result.zeroingAmount + row.zeroingAmount,
      receivable: result.receivable + row.receivable
    }), { quantity: 0, shippingAmount: 0, acceptedQuantity: 0, acceptedAmount: 0, zeroingAmount: 0, receivable: 0 });
    const shippingDates = sourceRecords.map((record) => String(record.businessTime || '')).filter(Boolean).sort();
    const shippingPeriod = shippingDates.length
      ? `${shippingDates[0]}${shippingDates.length > 1 ? `~${shippingDates[shippingDates.length - 1]}` : ''}`
      : '--';
    const modal = document.createElement('div');
    modal.className = 'operations-modal-backdrop sales-statement-products-backdrop';
    modal.innerHTML = `<section class="operations-modal sales-statement-products-modal" role="dialog" aria-modal="true" aria-labelledby="salesStatementProductsTitle">
      <header class="sales-statement-products-header"><h3 id="salesStatementProductsTitle">附件（商品明细表）</h3><button type="button" data-statement-modal-close aria-label="关闭商品明细表">×</button></header>
      <div class="sales-statement-products-body">
        <h2>产品部学校食材集采供应链有限公司对账结算单</h2>
        <div class="sales-statement-products-meta"><span><strong>发货日期：</strong>${escapeHtml(shippingPeriod)}</span><span><strong>客户名称：</strong>${escapeHtml(sourceRecords[0]?.customerName || savedStatement?.customerName || '--')}</span><span><strong>制单人：</strong>${escapeHtml(savedStatement?.operator || '管理员')}</span><span><strong>对账单生成时间：</strong>${escapeHtml(savedStatement?.generatedAt || '2026-08-25 12:00:00')}</span><span><strong>对账金额：</strong>${money(amount)}</span><span><strong>应收金额：</strong>${money(receivable)}</span></div>
        <h3 class="sales-statement-products-section-title">品种明细</h3>
        <div class="sales-statement-products-table-wrap"><table class="sales-statement-products-table"><thead><tr><th>商品名称</th><th>商品分类</th><th>计量单位</th><th>发货数量</th><th>下单单价</th><th>发货金额</th><th>验收数量</th><th>验收金额</th><th>对账抹零</th><th>应收金额</th></tr></thead><tbody>${productTableRows(rows) || '<tr><td colspan="10">暂无商品明细</td></tr>'}</tbody><tfoot><tr><td colspan="3">合计</td><td>${money(totals.quantity)}</td><td></td><td>${money(totals.shippingAmount)}</td><td>${money(totals.acceptedQuantity)}</td><td>${money(totals.acceptedAmount)}</td><td>${money(totals.zeroingAmount)}</td><td>${money(totals.receivable)}</td></tr></tfoot></table>
          <div class="sales-statement-products-signatures"><div><span>企业负责人签字</span><span>______年____月____日</span></div><div><span>企业财务负责人签字</span><span>______年____月____日</span></div><div><span>客户负责人签字</span><span>______年____月____日</span></div></div>
        </div>
      </div>
      <footer class="sales-statement-products-footer"><button type="button" class="btn" data-statement-modal-close>返回</button><button type="button" class="btn" data-statement-products-download>下载</button><button type="button" class="btn btn-primary" data-statement-products-print>打印</button></footer>
    </section>`;
    page.appendChild(modal);
    modal.querySelector('[data-statement-modal-close]')?.focus();
  }

  function downloadProducts() {
    const rows = productDetails();
    const values = [
      ['商品名称', '商品分类', '计量单位', '发货数量', '下单单价', '发货金额', '验收数量', '验收金额', '对账抹零', '应收金额'],
      ...rows.map((row) => [row.name, row.category, row.unit, money(row.quantity), money(row.unitPrice), money(row.shippingAmount), money(row.acceptedQuantity), money(row.acceptedAmount), money(row.zeroingAmount), money(row.receivable)])
    ];
    const csv = values.map((line) => line.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' }));
    link.download = `${statementNo}-商品明细表.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function saveStatement() {
    const saved = store.addStatement({
      id: savedStatement?.id,
      statementNo,
      customerName: sourceRecords[0]?.customerName || savedStatement?.customerName || '--',
      startDate,
      endDate,
      generatedAt: savedStatement?.generatedAt || '2026-08-25 12:00:00',
      operator: savedStatement?.operator || '管理员',
      amount,
      zeroing,
      receivable,
      settlementAmount: page.querySelector('[data-statement-settlement-amount]')?.value.trim() || '',
      settlementDate: page.querySelector('[data-statement-settlement-date]')?.value.trim() || '',
      checker: page.querySelector('[data-statement-checker]')?.value.trim() || '',
      remark: page.querySelector('[data-statement-remark]')?.value.trim() || '',
      recordIds: sourceRecords.map((record) => record.id)
    });
    toast(`对账单 ${saved.statementNo} 已保存`);
  }

  function downloadStatement() {
    const lines = [
      ['对账单号', statementNo],
      ['客户名称', sourceRecords[0]?.customerName || '--'],
      ['发货日期', shippingPeriod],
      ['对账单生成时间', savedStatement?.generatedAt || '2026-08-25 12:00:00'],
      ['对账金额', amount],
      ['抹零金额', zeroing],
      ['应收金额', receivable],
      ['实结金额', page.querySelector('[data-statement-settlement-amount]')?.value || ''],
      ['结算日期', page.querySelector('[data-statement-settlement-date]')?.value || ''],
      ['核对人', page.querySelector('[data-statement-checker]')?.value || ''],
      ['备注说明', page.querySelector('[data-statement-remark]')?.value || ''],
      [],
      ['序号', '食堂', '对账单号', '发货金额', '验收金额', '对账金额', '抹零金额', '应收金额'],
      ...sourceRecords.map((record, index) => {
        const recordAmounts = settlementAmountsFor(record);
        const shippingAmount = recordAmounts.shippingAmount;
        const acceptedAmount = recordAmounts.acceptedAmount;
        return [index + 1, record.canteen, record.accountNo, shippingAmount, acceptedAmount, signedAmount(record, 'amount'), signedAmount(record, 'zeroing'), signedAmount(record, 'receivable')];
      })
    ];
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([`\ufeff${lines.map((line) => line.join(',')).join('\n')}`], { type: 'text/csv;charset=utf-8' }));
    link.download = `${statementNo}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast('下载成功');
  }

  page.addEventListener('click', (event) => {
    if (event.target.closest('[data-statement-back]')) window.location.href = './sales-reconciliation.html';
    if (event.target.closest('[data-statement-products]')) showProducts();
    if (event.target.closest('[data-statement-modal-close]')) {
      event.target.closest('.sales-statement-products-backdrop')?.remove();
      page.querySelector('[data-statement-products]')?.focus();
    }
    if (event.target.closest('[data-statement-products-download]')) downloadProducts();
    if (event.target.closest('[data-statement-products-print]')) {
      document.body.classList.add('sales-statement-products-printing');
      window.print();
    }
    if (event.target.closest('[data-statement-save]')) saveStatement();
    if (event.target.closest('[data-statement-download]')) downloadStatement();
    if (event.target.closest('[data-statement-print]')) window.print();
  });

  page.addEventListener('input', (event) => {
    const remark = event.target.closest('[data-statement-remark]');
    if (remark) page.querySelector('[data-statement-remark-count]').textContent = `${remark.value.length}/200`;
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !page.querySelector('.sales-statement-products-backdrop')) return;
    page.querySelector('.sales-statement-products-backdrop')?.remove();
    page.querySelector('[data-statement-products]')?.focus();
  });
  window.addEventListener('afterprint', () => document.body.classList.remove('sales-statement-products-printing'));

  render();
})();
