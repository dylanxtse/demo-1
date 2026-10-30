(function () {
  const root = document.getElementById('productInfoImportTemplateApp');
  if (!root) return;

  const fields = [
    ['name', '*商品名称', 160],
    ['category', '*商品分类', 200],
    ['ingredient', '对应食材', 250],
    ['purchaseType', '*采购类型', 160],
    ['defaultSupplier', '默认供应商', 190],
    ['buyer', '采购员', 160],
    ['responsible', '采购负责人', 180],
    ['unit', '*计量单位', 120],
    ['multiUnitEnabled', '*启用多单位', 140],
    ['auxiliaryUnit1', '辅助单位1', 120],
    ['auxiliaryRate1', '辅助单位1换算率', 170],
    ['marketPrice1', '市场价1', 140],
    ['auxiliaryUnit2', '辅助单位2', 120],
    ['auxiliaryRate2', '辅助单位2换算率', 170],
    ['marketPrice2', '市场价2', 140],
    ['marketPrice', '*市场价', 140],
    ['alias', '商品别名', 140],
    ['brand', '品牌', 120],
    ['spec', '规格', 130],
    ['storageCondition', '*储存条件', 140],
    ['origin', '产地', 120],
    ['description', '指标说明', 150],
    ['isWeighed', '是否称重', 140],
    ['kgConversionRate', '计量单位与kg的换算率', 190],
    ['certificate', '上传合格证明文件', 180],
    ['netContent', '净含量', 140],
    ['netContentUnit', '净含量单位', 130],
    ['shelfLifeEnabled', '设置保质期', 140],
    ['shelfLife', '保质期', 130],
    ['shelfLifeUnit', '保质期单位', 150],
    ['warningDays', '预警天数', 140],
    ['expiryMethod', '到期计算方式', 190]
  ];

  const defaultValues = {
    isWeighed: '是',
    certificate: '不限制',
    shelfLifeEnabled: '是',
    shelfLifeUnit: '月',
    expiryMethod: '生产日期+保质期'
  };
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

  document.title = '商品信息导入模板';
  root.innerHTML = `<main class="school-order-export-template-page product-info-import-template-page">
    <section class="school-order-export-template-section">
      <div class="school-order-export-template-inner">
        <div class="school-order-export-template-table-wrap">
          <table class="school-order-export-template-table" aria-label="商品信息导入模板">
            <colgroup>${columnGroup}</colgroup>
            <thead>
              <tr class="school-order-export-title-row"><th colspan="${fields.length}">商品信息导入模板</th></tr>
              <tr class="school-order-export-meta-row"><td colspan="${fields.length}">红色“*”为必填项；储存条件在规格后，必须选择冷冻、冷藏或常温。其他字段填写规则请参考Excel模板说明。</td></tr>
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
