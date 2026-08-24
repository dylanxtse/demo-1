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
  const statementRemark = savedStatement?.remark || recordRemarks.join('；') || '本对账单请双方核对无误后签章确认。';
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
    return sourceRecords.map((record, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(record.canteen)}</td><td>${escapeHtml(record.accountNo)}</td><td>${escapeHtml(record.type)}</td><td>${escapeHtml(dateOnly(record.businessTime))}</td><td>${money(signedAmount(record, 'amount'))}</td><td>${money(signedAmount(record, 'zeroing'))}</td><td>${money(signedAmount(record, 'receivable'))}</td></tr>`).join('');
  }

  function productRows() {
    const rows = [];
    sourceRecords.forEach((record) => (record.products || []).forEach((product) => rows.push({ record, product })));
    return rows.map((item, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(item.record.accountNo)}</td><td>${escapeHtml(item.product.name)}</td><td>${escapeHtml(item.product.unit)}</td><td>${escapeHtml(item.product.quantity)}</td><td>${escapeHtml(item.product.unitPrice)}</td><td>${money(item.product.amount)}</td></tr>`).join('');
  }

  function render() {
    page.innerHTML = `<div class="sales-statement-shell"><div class="sales-statement-topbar"><button type="button" class="btn btn-text sales-back-button" data-statement-back>← 返回</button><span>|</span><h2>生成对账单</h2></div>
      <h1 class="sales-statement-title">魏县食材供应链管理有限公司对账单</h1>
      <div class="sales-statement-meta"><span><strong>业务日期：</strong>${escapeHtml(startDate)}—${escapeHtml(endDate)}</span><span><strong>生成时间：</strong>${escapeHtml(savedStatement?.generatedAt || '2026-08-25 12:00:00')}</span><span><strong>制单人：</strong>${escapeHtml(savedStatement?.operator || '管理员')}</span><span><strong>客户名称：</strong>${escapeHtml(sourceRecords[0]?.customerName || savedStatement?.customerName || '--')}</span><span><strong>对账金额：</strong>￥${money(amount)}</span><span><strong>应收金额：</strong>￥${money(receivable)}</span></div>
      <div class="sales-statement-section-title">对账明细 <button type="button" class="sales-statement-detail-link" data-statement-products>商品明细表</button></div>
      <table class="sales-statement-table"><thead><tr><th>序号</th><th>食堂</th><th>对账单号</th><th>业务类型</th><th>业务日期</th><th>对账金额</th><th>抹零金额</th><th>应收金额</th></tr></thead><tbody>${statementRows()}</tbody><tfoot><tr class="sales-statement-total"><td colspan="5">合计</td><td>${money(amount)}</td><td>${money(zeroing)}</td><td>${money(receivable)}</td></tr></tfoot></table>
      <div class="sales-statement-summary"><span><strong>应收金额合计：</strong>￥${money(receivable)}</span><span><strong>大写金额：</strong>${numberToChinese(receivable)}</span></div>
      <section class="sales-statement-remark" aria-label="备注说明"><h3>备注说明</h3><p>${escapeHtml(statementRemark)}</p></section>
      <section class="sales-statement-signature" aria-label="签章栏"><h3>签章栏</h3><div class="sales-statement-signature-item"><span>客户签章：</span><i aria-hidden="true"></i></div><div class="sales-statement-signature-item"><span>供应商签章：</span><i aria-hidden="true"></i></div><div class="sales-statement-signature-item"><span>确认日期：</span><i aria-hidden="true"></i></div></section>
      <footer class="sales-statement-footer"><button type="button" class="btn" data-statement-back>返回</button><button type="button" class="btn" data-statement-save>保存</button><button type="button" class="btn" data-statement-download>下载</button><button type="button" class="btn btn-primary" data-statement-print>打印</button></footer></div>`;
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
    const modal = document.createElement('div');
    modal.className = 'operations-modal-backdrop';
    modal.innerHTML = `<section class="operations-modal is-detail" role="dialog" aria-modal="true" aria-label="商品明细表"><header class="operations-modal-header"><h3>商品明细表</h3><button type="button" data-statement-modal-close aria-label="关闭">×</button></header><div class="operations-modal-body"><div class="operations-related-table-wrap"><table class="operations-table operations-related-table"><thead><tr><th>序号</th><th>对账单号</th><th>商品名称</th><th>计量单位</th><th>数量</th><th>单价</th><th>金额</th></tr></thead><tbody>${productRows()}</tbody></table></div></div><footer class="operations-modal-footer"><button type="button" class="btn btn-primary" data-statement-modal-close>关闭</button></footer></section>`;
    page.appendChild(modal);
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
      recordIds: sourceRecords.map((record) => record.id)
    });
    toast(`对账单 ${saved.statementNo} 已保存`);
  }

  function downloadStatement() {
    const lines = [
      ['对账单号', statementNo],
      ['客户名称', sourceRecords[0]?.customerName || '--'],
      ['业务日期', `${startDate}—${endDate}`],
      ['对账金额', amount],
      ['抹零金额', zeroing],
      ['应收金额', receivable],
      [],
      ['序号', '食堂', '对账单号', '业务类型', '业务日期', '对账金额', '抹零金额', '应收金额'],
      ...sourceRecords.map((record, index) => [index + 1, record.canteen, record.accountNo, record.type, dateOnly(record.businessTime), signedAmount(record, 'amount'), signedAmount(record, 'zeroing'), signedAmount(record, 'receivable')])
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
    if (event.target.closest('[data-statement-modal-close]')) event.target.closest('.operations-modal-backdrop')?.remove();
    if (event.target.closest('[data-statement-save]')) saveStatement();
    if (event.target.closest('[data-statement-download]')) downloadStatement();
    if (event.target.closest('[data-statement-print]')) window.print();
  });

  render();
})();
