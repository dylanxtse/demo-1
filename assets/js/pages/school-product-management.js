(function () {
  const service = window.SchoolProductService;
  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  function getThirdLevelCategories(rows) {
    const names = new Set();
    rows.forEach((row) => {
      const category = String(row.category || '').trim();
      const parts = category.split('-').map((part) => part.trim()).filter(Boolean);
      if (parts.length) names.add(parts[parts.length - 1]);
    });
    return [{ name: '全部' }, ...[...names].map((name) => ({ name }))];
  }

  function showToast(message) {
    document.querySelector('.operations-toast')?.remove();
    const toast = document.createElement('div');
    toast.className = 'operations-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    window.setTimeout(() => toast.remove(), 1800);
  }

  function displayValue(value, fallback = '--') {
    if (value === null || value === undefined) return fallback;
    const text = String(value).trim();
    return text || fallback;
  }

  function appendUnit(value, unit) {
    const text = String(value ?? '').trim();
    return text ? `${text}${unit || ''}` : '';
  }

  function detailField(label, value, { required = false, className = '' } = {}) {
    const labelClass = `field-label${required ? ' required' : ''}`;
    const text = displayValue(value);
    return `<div class="form-field${className ? ` ${className}` : ''}">
      <span class="${labelClass}">${escapeHtml(label)}</span>
      <span class="readonly-value" title="${escapeHtml(text)}">${escapeHtml(text)}</span>
    </div>`;
  }

  function formatMultiUnitRelation(product, index) {
    const name = String(product[`multiUnitName${index}`] ?? '').trim();
    const rate = appendUnit(product[`multiUnitRate${index}`], product.unit);
    if (name && rate) return `${name} = ${rate}`;
    return name || rate;
  }

  function navigateToList() {
    const target = './school-product-management.html';
    if (window.AppNavigation?.navigate) window.AppNavigation.navigate(target);
    else window.location.href = target;
  }

  function navigateToDetail(code) {
    const target = `./school-product-management.html?mode=view&id=${encodeURIComponent(code)}`;
    if (window.AppNavigation?.navigate) window.AppNavigation.navigate(target);
    else window.location.href = target;
  }

  function renderTree(page, state) {
    const query = state.treeKeyword.trim().toLocaleLowerCase();
    const tree = page.querySelector('#schoolCategoryTree');
    const renderNodes = (nodes) => nodes.map((node) => {
      const matches = !query || node.name.toLocaleLowerCase().includes(query);
      if (!matches) return '';
      const selected = (node.name === '全部' && !state.category) || node.name === state.category;
      return `<div class="school-tree-node">
        <button type="button" class="school-tree-label ${selected ? 'is-selected' : ''}" data-tree-category="${escapeHtml(node.name === '全部' ? '' : node.name)}">
          <span class="school-tree-arrow school-tree-arrow-empty"></span><span>${escapeHtml(node.name)}</span>
        </button>
      </div>`;
    }).join('');
    tree.innerHTML = renderNodes(getThirdLevelCategories(state.rows));
  }

  function renderRows(page, state) {
    const body = page.querySelector('#schoolProductBody');
    const pager = state.pager?.getState() || { page: 1, pageSize: 20 };
    const start = (pager.page - 1) * pager.pageSize;
    const rows = state.filtered.slice(start, start + pager.pageSize);
    body.innerHTML = rows.length
      ? rows.map((row, index) => {
        const productDisplay = window.DomUtils.formatProductDisplay(row);
        return `<tr>
          <td>${start + index + 1}</td>
          <td><span class="school-product-image" aria-label="商品图片"></span></td>
          <td><button type="button" class="school-product-code" data-action="detail" data-code="${escapeHtml(row.code)}">${escapeHtml(row.code)}</button></td>
          <td class="school-product-name" title="${escapeHtml(productDisplay)}"><span class="school-product-name-main">${row.isNetVegetable ? '<span class="net-vegetable-tag">净菜</span>' : ''}${escapeHtml(productDisplay)}</span></td>
          <td class="school-product-category" title="${escapeHtml(row.category)}">${escapeHtml(row.category)}</td>
          <td>${escapeHtml(row.unit)}</td>
          <td>${escapeHtml(row.supplier)}</td>
          <td>${escapeHtml(row.alias || '')}</td>
          <td>${escapeHtml(row.origin || '')}</td>
          <td>${escapeHtml(row.shelfLife || '')}</td>
          <td>${escapeHtml(row.addTime)}</td>
        </tr>`;
      }).join('')
      : '<tr><td class="school-product-empty" colspan="11">暂无符合条件的数据</td></tr>';
  }

  function renderDetail(productId) {
    const product = window.ProductService?.getDetail(productId);
    if (!product) {
      renderList();
      showToast('未找到该商品，请返回商品管理页面重新选择。');
      return;
    }

    const isNetVegetable = product.isNetVegetable === true;
    const isWeighed = product.isWeighed === true;
    const multiUnitEnabled = product.multiUnit === true;
    const shelfLifeEnabled = Boolean(product.shelfLife || product.shelfLifeEnabled || product.shelfLifeValue);
    const shelfLife = product.shelfLife || appendUnit(product.shelfLifeValue, product.shelfLifeUnit);
    const procurementFields = isNetVegetable ? '' : [
      detailField('默认供应商', product.defaultSupplier || product.supplier || '平台默认供应商', { required: true }),
      detailField('采购负责人', product.responsible || '管理员', { required: true })
    ].join('');
    const multiUnitFields = multiUnitEnabled ? [
      detailField('辅助单位1:', formatMultiUnitRelation(product, 1), { required: true }),
      detailField('市场价1', product.multiUnitPrice1, { required: true }),
      detailField('辅助单位2:', formatMultiUnitRelation(product, 2)),
      detailField('市场价2', product.multiUnitPrice2)
    ].join('') : '';
    const weighingFields = isWeighed
      ? detailField(`“${displayValue(product.unit)}”与“kg”的换算率=`, appendUnit(product.conversionRate, 'kg'), { required: true })
      : '';
    const shelfLifeFields = shelfLifeEnabled ? [
      detailField('保质期', shelfLife, { required: true }),
      detailField('预警天数', product.shelfLifeWarning),
      detailField('到期日计算方式', product.expiryCalculationMethod, { required: true })
    ].join('') : '';

    const content = `<section class="page-card product-form-page school-product-detail" id="schoolProductDetail" aria-label="商品详情">
      <div class="product-form-header">
        <button class="back-link" type="button" data-action="back">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/><path d="M19 12H9"/></svg>
          <span>返回</span>
        </button>
        <h1>商品详情</h1>
      </div>

      <div class="product-form is-readonly" role="region" aria-label="商品详情信息">
        <div class="form-grid">
          ${detailField('商品分类', product.category, { required: true })}
          ${detailField('商品名称', product.name, { required: true })}
          ${detailField('对应食材', product.correspondingFood)}
          ${detailField('计量单位', product.unit, { required: true })}
          ${detailField('市场价', product.marketPrice, { required: true })}
          ${detailField('品牌', product.brand)}
          ${detailField('规格', product.spec)}
          ${detailField('产地', product.origin)}
          ${detailField('指标说明', product.indicatorDescription)}
          ${detailField('商品别名', product.alias)}
          ${detailField('净含量', appendUnit(product.netContent, product.netContentUnit))}
          ${detailField('上传合格证明', product.qualificationCertificate)}
          ${detailField('是否净菜', isNetVegetable ? '是' : '否')}
          ${detailField('采购类型', product.purchaseType || '供应商送货', { required: true })}
          ${procurementFields}
          ${detailField('启用多单位', multiUnitEnabled ? '是' : '否')}
          ${multiUnitFields}
          ${detailField('是否称重', isWeighed ? '是' : '否')}
          ${weighingFields}
          ${detailField('设置保质期', shelfLifeEnabled ? '是' : '否')}
          ${shelfLifeFields}
          ${detailField('图片', product.imageName || product.image, { className: 'image-field' })}
          <div class="form-actions">
            <button class="btn" type="button" data-action="back">返回</button>
          </div>
        </div>
      </div>
    </section>`;
    const root = window.AppShell.mount({ title: '商品管理', content, variant: 'school', companyName: '静安第一中学', emptyText: '商品管理' });
    root.querySelector('#schoolProductDetail')?.addEventListener('click', (event) => {
      if (event.target.closest('[data-action="back"]')) navigateToList();
    });
  }

  function renderList() {
    const content = `<section class="page-card school-product-page" id="schoolProductPage" aria-label="商品管理">
      <div class="school-product-workspace">
        <aside class="school-category-panel">
          <div class="school-category-heading">商品分类</div>
          <label class="school-category-search"><span class="sr-only">商品分类</span><input id="schoolCategoryKeyword" type="text" aria-label="商品分类" placeholder=""></label>
          <div class="school-category-tree" id="schoolCategoryTree"></div>
        </aside>
        <section class="school-product-table-panel">
          <form class="school-product-filters filter-section" id="schoolProductFilters">
            <div class="filter-panel">
              <div class="filter-fields">
                <div class="filter-group"><label class="filter-label" for="schoolProductKeyword">商品名称</label><input class="filter-input" id="schoolProductKeyword" data-filter="keyword" type="text" placeholder="请输入名称/编号"></div>
                <div class="filter-group"><label class="filter-label" for="schoolProductNetVegetable">是否净菜</label><select class="filter-select" id="schoolProductNetVegetable" data-filter="netVegetable"><option value="">全部</option><option value="net">净菜</option><option value="non-net">非净菜</option></select></div>
              </div>
              <div class="action-controls"><button type="submit" class="btn btn-primary btn-sm btn-fixed">查询</button><button type="button" class="btn btn-sm btn-fixed" data-action="reset">重置</button></div>
            </div>
          </form>
          <div class="school-product-table-wrap"><table class="school-product-table"><colgroup><col class="col-seq"><col class="col-image"><col class="col-code"><col class="col-name"><col class="col-category"><col class="col-unit"><col class="col-supplier"><col class="col-alias"><col class="col-origin"><col class="col-shelf"><col class="col-time"></colgroup><thead><tr><th>序号</th><th>图片</th><th>商品编号</th><th>商品名称（计量单位/品牌/规格）</th><th>分类</th><th>计量单位</th><th>供货企业</th><th>别名</th><th>产地</th><th>保质期</th><th>添加时间</th></tr></thead><tbody id="schoolProductBody"></tbody></table></div>
          <div class="pagination school-product-pagination" id="schoolProductPagination"></div>
        </section>
      </div>
    </section>`;
    const root = window.AppShell.mount({ title: '商品管理', content, variant: 'school', companyName: '静安第一中学', emptyText: '商品管理' });
    const page = root.querySelector('#schoolProductPage');
    const state = { rows: service.getRows(), filtered: [], category: '', treeKeyword: '', pager: null };
    const applyFilters = (resetPage = true) => {
      const keyword = page.querySelector('[data-filter="keyword"]').value;
      const netVegetable = page.querySelector('[data-filter="netVegetable"]').value;
      state.filtered = service.filterRows(state.rows, { keyword, category: state.category, netVegetable });
      state.pager?.update({ total: state.filtered.length, ...(resetPage ? { page: 1 } : {}) });
      renderRows(page, state);
    };

    state.filtered = service.filterRows(state.rows, { category: state.category });
    state.pager = window.Pagination.create({
      container: '#schoolProductPagination',
      total: state.filtered.length,
      page: 1,
      pageSize: 20,
      pageSizeOptions: [20, 50, 100],
      onChange: () => renderRows(page, state)
    });
    renderTree(page, state);
    renderRows(page, state);

    page.querySelector('#schoolProductFilters').addEventListener('submit', (event) => {
      event.preventDefault();
      applyFilters(true);
    });
    page.querySelector('#schoolCategoryKeyword').addEventListener('input', (event) => {
      state.treeKeyword = event.target.value;
      renderTree(page, state);
    });
    page.addEventListener('click', (event) => {
      const treeButton = event.target.closest('[data-tree-category]');
      if (treeButton) {
        state.category = treeButton.dataset.treeCategory || '';
        renderTree(page, state);
        applyFilters(true);
        return;
      }
      const action = event.target.closest('[data-action]')?.dataset.action;
      if (action === 'reset') {
        page.querySelector('[data-filter="keyword"]').value = '';
        page.querySelector('[data-filter="netVegetable"]').value = '';
        page.querySelector('#schoolCategoryKeyword').value = '';
        state.category = '';
        state.treeKeyword = '';
        renderTree(page, state);
        applyFilters(true);
      } else if (action === 'detail') {
        const code = event.target.closest('[data-code]')?.dataset.code;
        if (code) navigateToDetail(code);
      }
    });
  }

  const parameters = new URLSearchParams(window.location.search);
  const productId = parameters.get('id');
  if (parameters.get('mode') === 'view' && productId) renderDetail(productId);
  else renderList();
})();
