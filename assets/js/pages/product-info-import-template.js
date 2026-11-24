(function () {
  const root = document.getElementById('productInfoImportTemplateApp');
  if (!root) return;
  const isKingdeeTemplate = root.dataset?.template === 'kingdee';
  const title = isKingdeeTemplate ? '金蝶商品信息导入模板' : '商品信息导入模板';

  const fields = window.ProductImportFields.forType(isKingdeeTemplate);
  const defaultValues = window.ProductImportFields.defaults;
  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const columnGroup = fields.map(([, , width]) => `<col style="width:${width}px">`).join('');
  const headers = fields.map(([key, label]) => {
    const required = label.startsWith('*');
    const text = required ? label.slice(1) : label;
    return `<th>${required ? '<span class="school-order-export-required-mark" aria-hidden="true">*</span>' : ''}${escapeHtml(text)}</th>`;
  }).join('');
  const rows = Array.from({ length: 8 }, (_, index) => `<tr class="school-order-export-item-row">
    ${fields.map(([key]) => {
      if (key === 'storageCondition') {
        return `<td><select class="product-info-storage-condition-select" aria-label="第${index + 1}行储存条件" title="可留空；可选冷冻、冷藏、常温">
          <option value="" selected></option>
          <option value="冷冻">冷冻</option>
          <option value="冷藏">冷藏</option>
          <option value="常温">常温</option>
        </select></td>`;
      }
      return `<td>${index === 0 ? escapeHtml(defaultValues[key] || '') : ''}</td>`;
    }).join('')}
  </tr>`).join('');

  document.title = title;
  root.innerHTML = `<main class="school-order-export-template-page product-info-import-template-page">
    <section class="school-order-export-template-section">
      <div class="school-order-export-template-inner">
        <div class="school-order-export-template-table-wrap">
          <table class="school-order-export-template-table" aria-label="${title}">
            <colgroup>${columnGroup}</colgroup>
            <thead>
              <tr class="school-order-export-title-row"><th colspan="${fields.length}">${title}</th></tr>
              <tr class="school-order-export-meta-row"><td colspan="${fields.length}">红色“*”为必填项。</td></tr>
              <tr class="school-order-export-column-row">${headers}</tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    </section>
    <nav class="school-order-export-template-actions" aria-label="商品信息模板操作">
      <a href="./product-list.html">返回商品管理</a>
    </nav>
  </main>`;
})();
