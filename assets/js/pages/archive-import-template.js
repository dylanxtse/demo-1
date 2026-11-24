(function () {
  const root = document.getElementById('archiveImportTemplateApp');
  if (!root) return;
  const warehouse = root.dataset.resource === 'warehouse';
  const service = warehouse ? window.WarehouseImportService : window.UnitImportService;
  const entity = warehouse ? '仓库' : '计量单位', kingdee = root.dataset.template === 'kingdee';
  const fields = service.fieldsForType(kingdee), title = `${kingdee ? '金蝶' : ''}${entity}导入模板`;
  document.title = title;
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));
  const headers = fields.map(([, label]) => `<th>${label.startsWith('*')
    ? '<span class="school-order-export-required-mark" aria-hidden="true">*</span>' : ''}${esc(label.replace(/^\*/, ''))}</th>`).join('');
  const rows = Array.from({ length: 8 }, () => `<tr class="school-order-export-item-row">${fields.map(() => '<td></td>').join('')}</tr>`).join('');
  root.innerHTML = `<main class="school-order-export-template-page archive-import-template-page">
    <section class="school-order-export-template-section"><div class="school-order-export-template-inner">
      <div class="school-order-export-template-table-wrap"><table class="school-order-export-template-table" aria-label="${title}">
        <colgroup>${fields.map(([, , width]) => `<col style="width:${width * 7}px">`).join('')}</colgroup>
        <thead><tr class="school-order-export-title-row"><th colspan="${fields.length}">${title}</th></tr>
          <tr class="school-order-export-meta-row"><td colspan="${fields.length}">红色“*”为必填项。</td></tr>
          <tr class="school-order-export-column-row">${headers}</tr></thead><tbody>${rows}</tbody>
      </table></div>
    </div></section>
    <nav class="school-order-export-template-actions" aria-label="${entity}模板操作"><a href="./${warehouse ? 'warehouse-archive' : 'unit-measurement'}.html">返回${warehouse ? '仓库档案' : '计量单位'}</a></nav>
  </main>`;
})();
