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
  const params = new URLSearchParams(window.location.search);

  function isStandardProduct(product) {
    const value = product?.isStandardProduct ?? product?.isStandard;
    return value === true || value === 'true' || value === '是' || value === 1 || value === '1';
  }

  function csvCell(value) {
    return `"${String(value ?? '').replace(/"/g, '""')}"`;
  }

  function downloadSortingSpecTemplate() {
    const headers = ['商品编号', '商品名称', '是否标品', '计量单位', '分包单位', '分包系数', '状态', '备注'];
    const rows = products.map((product) => [
      product.code,
      product.name,
      isStandardProduct(product) ? '是' : '否',
      product.unit || '',
      '',
      '',
      '启用',
      ''
    ]);
    const csv = [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = '分包规格导入模板.csv';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function renderSortingSpecTemplate() {
    document.title = '分包规格导入模板';
    const rows = products.map((product, index) => `<tr class="school-order-export-item-row">
      <td>${index + 1}</td>
      <td>${display(product.code)}</td>
      <td>${display(product.name)}</td>
      <td>${isStandardProduct(product) ? '是' : '否'}</td>
      <td>${display(product.unit)}</td>
      <td></td>
      <td></td>
      <td>启用</td>
      <td></td>
    </tr>`).join('');
    root.innerHTML = `<main class="school-order-export-template-page market-price-import-template-page sorting-spec-import-template-page">
      <section class="school-order-export-template-section">
        <div class="school-order-export-template-inner">
          <div class="school-order-export-template-table-wrap">
            <table class="school-order-export-template-table">
              <colgroup>
                <col style="width:60px"><col style="width:140px"><col style="width:200px"><col style="width:100px"><col style="width:110px"><col style="width:110px"><col style="width:110px"><col style="width:90px"><col style="width:160px">
              </colgroup>
              <thead>
                <tr class="school-order-export-title-row"><th colspan="9">分包规格导入模板</th></tr>
                <tr class="school-order-export-column-row"><th>序号</th><th>商品编号</th><th>商品名称</th><th>是否标品</th><th>计量单位</th><th>分包单位</th><th>分包系数</th><th>状态</th><th>备注</th></tr>
              </thead>
              <tbody>${rows || '<tr class="school-order-export-item-row"><td colspan="9">暂无商品数据</td></tr>'}</tbody>
            </table>
          </div>
        </div>
      </section>
      <div class="school-order-export-template-actions"><a href="./sorting-spec.html">返回分包规格</a><a href="#" id="downloadSortingSpecTemplate">下载模板</a></div>
    </main>`;
    document.getElementById('downloadSortingSpecTemplate')?.addEventListener('click', (event) => {
      event.preventDefault();
      downloadSortingSpecTemplate();
    });
  }

  if (params.get('type') === 'sorting-spec') {
    renderSortingSpecTemplate();
    return;
  }

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
