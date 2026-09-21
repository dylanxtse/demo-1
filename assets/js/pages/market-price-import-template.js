(function () {
  const root = document.getElementById('marketPriceImportTemplateApp');
  if (!root) return;

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const display = (value, fallback = '') => value === '' || value == null ? fallback : escapeHtml(value);

  const products = Array.isArray(window.MockProducts) ? window.MockProducts : [];

  function renderRow(product, index) {
    return `<tr class="school-order-export-item-row">
      <td>${index + 1}</td>
      <td>${display(product.code)}</td>
      <td>${display(product.name)}</td>
      <td>${display(product.unit)}</td>
      <td>${display(product.brand)}</td>
      <td>${display(product.spec)}</td>
      <td></td>
    </tr>`;
  }

  const rows = products.map((product, i) => renderRow(product, i)).join('');

  root.innerHTML = `<main class="school-order-export-template-page market-price-import-template-page">
    <section class="school-order-export-template-section">
      <div class="school-order-export-template-inner">
        <div class="school-order-export-template-table-wrap">
          <table class="school-order-export-template-table">
            <colgroup>
              <col style="width:60px"><col style="width:140px"><col style="width:200px"><col style="width:100px"><col style="width:120px"><col style="width:120px"><col style="width:120px">
            </colgroup>
            <thead>
              <tr class="school-order-export-title-row"><th colspan="7">市场价导入模板</th></tr>
              <tr class="school-order-export-column-row"><th>序号</th><th>商品编号</th><th>商品名称</th><th>计量单位</th><th>品牌</th><th>规格</th><th>市场价</th></tr>
            </thead>
            <tbody>
              ${rows || '<tr class="school-order-export-item-row"><td colspan="7">暂无商品数据</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    </section>
    <div class="school-order-export-template-actions"><a href="./product-list.html">返回商品管理</a></div>
  </main>`;
})();
