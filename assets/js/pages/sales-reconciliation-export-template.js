(function () {
  'use strict';

  const root = document.getElementById('salesReconciliationExportTemplateApp');
  if (!root) return;

  const EXPORT_VERSION = '20261103-sales-reconciliation-export-1';
  const headers = [
    '对账单号', '关联单号', '对账状态', '客户反馈状态', '客户名称', '食堂', '客户编码',
    '收货人', '收货手机', '仓库', '单据类型', '对账金额', '抹零金额', '应收金额',
    '发货金额', '业务时间', '线路名称', '司机', '对账人', '订单备注'
  ];
  const customerHeaders = [
    '序号', '对账单号', '关联单号', '对账状态', '客户反馈状态', '收货人', '收货手机号',
    '仓库', '单据类型', '对账金额', '对账抹零', '应收金额', '发货金额', '已收金额',
    '未收金额', '业务时间', '线路', '司机', '对账人'
  ];
  const params = new URLSearchParams(window.location.search);
  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  function readPayload() {
    const key = params.get('exportKey');
    if (!key) return null;
    try {
      const raw = window.sessionStorage?.getItem(key) || window.localStorage?.getItem(key) || '';
      if (!raw) return null;
      const payload = JSON.parse(raw);
      return payload?.version === EXPORT_VERSION ? payload : null;
    } catch (error) {
      return null;
    }
  }

  const payload = readPayload();
  const rows = Array.isArray(payload?.rows) ? payload.rows : [];
  const customerGroups = Array.isArray(payload?.groups) ? payload.groups : [];
  const columnClasses = [
    'account-no', 'related-no', 'status', 'feedback-status', 'customer', 'canteen', 'customer-code',
    'receiver', 'phone', 'warehouse', 'document-type', 'amount', 'amount', 'amount', 'amount', 'business-time',
    'route', 'driver', 'reconciler', 'remark'
  ];
  const colgroup = columnClasses.map((name) => `<col class="sales-export-col-${name}">`).join('');
  const headerRow = headers.map((header) => `<th>${header}</th>`).join('');
  const itemRows = rows.map((row) => `<tr class="school-order-export-item-row">${headers.map((_, index) => `<td>${escapeHtml(row?.[index] ?? '')}</td>`).join('')}</tr>`).join('');
  const body = rows.length
    ? itemRows
    : `<tr class="school-order-export-item-row"><td colspan="${headers.length}">暂无可导出的对账数据</td></tr>`;

  function currency(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return String(value ?? '');
    const sign = number < 0 ? '-¥' : '¥';
    return `${sign}${Math.abs(number).toFixed(2)}`;
  }

  function renderCustomerGroup(group) {
    const classes = [
      'serial', 'account-no', 'related-no', 'status', 'feedback-status', 'receiver', 'phone', 'warehouse',
      'document-type', 'amount', 'amount', 'amount', 'amount', 'amount', 'amount', 'business-time',
      'route', 'driver', 'reconciler'
    ];
    const cols = classes.map((name) => `<col class="sales-export-col-${name}">`).join('');
    const heading = customerHeaders.map((header) => `<th>${escapeHtml(header)}</th>`).join('');
    const groupRows = Array.isArray(group?.rows) ? group.rows : [];
    const bodyRows = groupRows.length
      ? groupRows.map((row) => `<tr class="school-order-export-item-row">${customerHeaders.map((_, index) => {
        const value = row?.[index] ?? '';
        const isAmount = [9, 10, 11, 12, 13, 14].includes(index);
        return `<td>${isAmount && value !== '' ? escapeHtml(currency(value)) : escapeHtml(value)}</td>`;
      }).join('')}</tr>`).join('')
      : `<tr class="school-order-export-item-row"><td colspan="${customerHeaders.length}">暂无可导出的对账单</td></tr>`;
    const totals = Array.isArray(group?.totals) ? group.totals : [];
    const amountTotals = totals.map((value) => currency(value));
    const totalRow = `<tr class="school-order-export-summary-row"><td colspan="9" class="school-order-export-summary-label">合计</td>${amountTotals.map((value) => `<td>${escapeHtml(value)}</td>`).join('')}<td colspan="4"></td></tr>`;
    return `<section class="sales-customer-export-group">
      <div class="school-order-export-template-table-wrap">
        <table class="school-order-export-template-table sales-customer-export-table" aria-label="${escapeHtml(group?.title || '客户对账导出模板')}">
          <colgroup>${cols}</colgroup>
          <thead>
            <tr class="school-order-export-title-row"><th colspan="${customerHeaders.length}">${escapeHtml(group?.title || '客户对账')}</th></tr>
            <tr class="school-order-export-meta-row"><td colspan="${customerHeaders.length}"><span>食堂：${escapeHtml(group?.canteen || '--')}</span><span class="school-order-export-meta-inline">业务日期：${escapeHtml(group?.businessDate || '--')}</span><span class="school-order-export-meta-inline">对账单数量：${escapeHtml(group?.statementCount ?? 0)}</span><span class="school-order-export-meta-inline">订单对账单数量：${escapeHtml(group?.orderCount ?? 0)}</span><span class="school-order-export-meta-inline">退货对账单数量：${escapeHtml(group?.returnCount ?? 0)}</span></td></tr>
            <tr class="school-order-export-column-row">${heading}</tr>
          </thead>
          <tbody>${bodyRows}${totalRow}</tbody>
        </table>
      </div>
    </section>`;
  }

  function renderCustomerTemplate() {
    const groups = customerGroups.length ? renderCustomerGroup(customerGroups[0]) : '<div class="school-order-export-template-empty">暂无可导出的客户对账数据</div>';
    return `<main class="school-order-export-template-page sales-reconciliation-export-template-page sales-customer-reconciliation-export-template-page">
      <section class="school-order-export-template-section"><div class="school-order-export-template-inner sales-customer-export-inner">${groups}</div></section>
      <nav class="school-order-export-template-actions sales-reconciliation-export-template-actions" aria-label="客户对账导出模板操作"><a href="./sales-reconciliation.html?view=customer">返回销售对账</a></nav>
    </main>`;
  }

  root.innerHTML = payload?.type === 'customer' ? renderCustomerTemplate() : `<main class="school-order-export-template-page sales-reconciliation-export-template-page">
    <section class="school-order-export-template-section">
      <div class="school-order-export-template-inner">
        <div class="school-order-export-template-table-wrap">
          <table class="school-order-export-template-table" aria-label="销售对账导出模板">
            <colgroup>${colgroup}</colgroup>
            <thead>
              <tr class="school-order-export-title-row"><th colspan="${headers.length}">销售对账</th></tr>
              <tr class="school-order-export-column-row">${headerRow}</tr>
            </thead>
            <tbody>${body}</tbody>
          </table>
        </div>
      </div>
    </section>
    <nav class="school-order-export-template-actions sales-reconciliation-export-template-actions" aria-label="销售对账导出模板操作">
      <a href="./sales-reconciliation.html">返回销售对账</a>
    </nav>
  </main>`;

  const exportKey = params.get('exportKey');
  if (exportKey) {
    try {
      window.sessionStorage?.removeItem(exportKey);
      window.localStorage?.removeItem(exportKey);
    } catch (error) {
      // 临时数据清理失败不影响模板展示。
    }
  }
})();
