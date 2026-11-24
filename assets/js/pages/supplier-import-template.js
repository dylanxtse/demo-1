(function () {
  const root = document.getElementById('supplierImportTemplateApp');
  if (!root) return;
  const kingdee = root.dataset?.template === 'kingdee';
  const fields = window.SupplierImportService.fieldsForType(kingdee);
  const title = `${kingdee ? '金蝶' : ''}供应商导入模板`;
  document.title = title;
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));
  const headers = fields.map(([, label]) => `<th>${label.startsWith('*')
    ? '<span class="school-order-export-required-mark" aria-hidden="true">*</span>' : ''}${esc(label.replace(/^\*/, ''))}</th>`).join('');
  const rows = Array.from({ length: 8 }, (_, index) => `<tr class="school-order-export-item-row">${fields.map(([key, label]) => {
    if (key === 'jointSupplier' || key === 'hideCustomerPrice') {
      return `<td><select class="supplier-import-boolean-select" aria-label="第${index + 1}行${esc(label.replace(/^\*/, ''))}"${label.startsWith('*') ? ' required' : ''}>
        <option value="是">是</option><option value="否" selected>否</option>
      </select></td>`;
    }
    return '<td></td>';
  }).join('')}</tr>`).join('');
  root.innerHTML = `<main class="school-order-export-template-page supplier-import-template-page">
    <section class="school-order-export-template-section"><div class="school-order-export-template-inner">
      <div class="school-order-export-template-table-wrap"><table class="school-order-export-template-table" aria-label="${title}">
        <colgroup>${fields.map(([, , width]) => `<col style="width:${width * 7}px">`).join('')}</colgroup>
        <thead><tr class="school-order-export-title-row"><th colspan="${fields.length}">${title}</th></tr>
          <tr class="school-order-export-meta-row"><td colspan="${fields.length}">红色“*”为必填项。合作日期请使用 YYYY-MM-DD 格式，年月日之间用“-”分隔。</td></tr>
          <tr class="school-order-export-column-row">${headers}</tr></thead><tbody>${rows}</tbody>
      </table></div>
    </div></section>
    <nav class="school-order-export-template-actions" aria-label="供应商模板操作"><a href="./purchase-supplier-archive.html">返回供应商档案</a></nav>
  </main>`;
})();
