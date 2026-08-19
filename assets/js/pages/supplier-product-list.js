(function () {
  const treeData = [
    { name: '全部' },
    { name: '主食（米面粉点心类）', expanded: true, children: [
      { name: '新增二级分类' },
      { name: '新增三级分类' },
      { name: '粮食类', children: [{ name: '米类' }, { name: '面类' }] }
    ] },
    { name: '食油', expanded: true, children: [{ name: '食油二级' }, { name: '食油三级' }, { name: '花生油' }] },
    { name: '果蔬', expanded: true, children: [{ name: '果蔬二级' }, { name: '果蔬三级' }] },
    { name: '肉（豆）制品', expanded: true, children: [{ name: '肉（豆）制品二级' }, { name: '肉（豆）制品三级' }] },
    { name: '水产品', expanded: true, children: [{ name: '水产品二级' }, { name: '水产品三级' }] },
    { name: '蛋奶类', expanded: true, children: [{ name: '蛋奶类二级' }, { name: '蛋奶类三级' }] },
    { name: '调料', expanded: true, children: [{ name: '调料二级' }, { name: '调料三级' }] },
    { name: '其他材料', expanded: true, children: [{ name: '其他二级' }, { name: '其他三级' }] }
  ];

  const state = {
    products: window.ProductService.getList(),
    filteredProducts: [],
    page: 1,
    pageSize: 20,
    category: '全部',
    treeSearch: '',
    pagination: null
  };

  const esc = (value) => window.DomUtils.escapeHtml(value);
  const statusText = (product) => window.BusinessRules.statusLabel('products', product.status);

  function categoryMatches(product, category) {
    if (!category || category === '全部') return true;
    return String(product.category || '').split('-').some((part) => part === category);
  }

  function renderTree() {
    const query = state.treeSearch.trim().toLowerCase();
    const renderNodes = (nodes, level = 0) => nodes.map((node) => {
      const children = node.children || [];
      const childHtml = children.map((child) => `
        <div class="tree-child" data-supplier-category="${esc(child.name)}">
          <span class="tree-arrow">${child.children ? '▶' : ''}</span><span class="tree-label">${esc(child.name)}</span>
        </div>
        ${child.children ? child.children.map((grandchild) => `<div class="tree-grandchild" data-supplier-category="${esc(grandchild.name)}">${esc(grandchild.name)}</div>`).join('') : ''}
      `).join('');
      const matches = !query || node.name.toLowerCase().includes(query) || children.some((child) => child.name.toLowerCase().includes(query));
      if (!matches) return '';
      return `<div class="tree-node ${node.expanded || query ? 'expanded' : ''}" data-tree-level="${level}">
        <div class="tree-node-header ${state.category === node.name ? 'selected' : ''}" data-supplier-category="${esc(node.name)}">
          <span class="tree-arrow">${children.length ? '▶' : ''}</span><span class="tree-label">${esc(node.name)}</span>
        </div>
        ${children.length ? `<div class="tree-children">${childHtml}</div>` : ''}
      </div>`;
    }).join('');
    document.getElementById('supplierCategoryTree').innerHTML = renderNodes(treeData);
  }

  function renderRows() {
    const body = document.getElementById('supplierProductBody');
    const start = (state.page - 1) * state.pageSize;
    const rows = state.filteredProducts.slice(start, start + state.pageSize);
    body.innerHTML = rows.length ? rows.map((product) => {
      const name = `${product.name || '--'}(${product.unit || '--'}/${product.brand || '--'}/${product.spec || '--'})`;
      const shelfLife = product.shelfLife === false || product.shelfLife == null || product.shelfLife === '' ? '--' : product.shelfLife;
      return `<tr>
        <td class="seq-cell">${esc(product.seq)}</td>
        <td class="img-cell"><div class="product-img">图片</div></td>
        <td class="code-cell"><button class="btn-text code-link" type="button" data-supplier-product="${esc(product.code)}">${esc(product.code)}</button></td>
        <td class="name-cell"><div class="name-main">${esc(name)}</div></td>
        <td>${esc(product.category || '--')}</td>
        <td>${esc(product.unit || '--')}</td>
        <td><span class="status-tag ${product.status === 'ENABLE' ? 'online' : 'offline'}">${esc(statusText(product))}</span></td>
        <td>${esc(product.alias || '--')}</td>
        <td>${esc(product.origin || '--')}</td>
        <td>${esc(shelfLife)}</td>
        <td>${esc(product.purchaseType || '--')}</td>
        <td>${esc(product.source || '--')}</td>
        <td>${esc(product.addTime || '--')}</td>
      </tr>`;
    }).join('') : '<tr><td class="supplier-empty" colspan="14">暂无商品数据</td></tr>';
    state.pagination?.update({ page: state.page, pageSize: state.pageSize, total: state.filteredProducts.length });
  }

  function filterProducts(resetPage = false) {
    const value = (id) => document.getElementById(id)?.value.trim().toLowerCase() || '';
    const nameOrCode = value('supplierProductName');
    const brand = value('supplierBrand');
    const status = document.getElementById('supplierStatus')?.value || '全部';
    const source = document.getElementById('supplierSource')?.value || '全部';
    state.filteredProducts = state.products.filter((product) => (
      (!nameOrCode || `${product.name} ${product.code}`.toLowerCase().includes(nameOrCode)) &&
      (!brand || String(product.brand || '').toLowerCase().includes(brand)) &&
      (status === '全部' || statusText(product) === status) &&
      (source === '全部' || product.source === source) &&
      categoryMatches(product, state.category)
    ));
    if (resetPage) state.page = 1;
    renderRows();
  }

  function resetFilters() {
    ['supplierProductName', 'supplierBrand', 'supplierCategorySearch'].forEach((id) => {
      const field = document.getElementById(id);
      if (field) field.value = '';
    });
    ['supplierStatus', 'supplierSource'].forEach((id) => {
      const field = document.getElementById(id);
      if (field) field.value = '全部';
    });
    state.category = '全部';
    renderTree();
    filterProducts(true);
  }

  function bindEvents(root) {
    root.addEventListener('input', (event) => {
      if (event.target.id === 'supplierCategorySearch') {
        state.treeSearch = event.target.value;
        renderTree();
      }
    });
    root.addEventListener('click', (event) => {
      const category = event.target.closest('[data-supplier-category]');
      if (category) {
        state.category = category.dataset.supplierCategory || '全部';
        renderTree();
        filterProducts(true);
        return;
      }
      const action = event.target.closest('[data-supplier-action]')?.dataset.supplierAction;
      if (action === 'query') filterProducts(true);
      if (action === 'reset') resetFilters();
      if (event.target.closest('[data-supplier-product]')) {
        const code = event.target.closest('[data-supplier-product]').dataset.supplierProduct;
        window.location.href = `./goodsAdd.html?mode=view&id=${encodeURIComponent(code)}`;
      }
    });
  }

  const content = `<div class="page-card supplier-product-page">
    <div class="workspace-grid">
      <section class="category-panel">
        <div class="category-tree">
          <div class="category-filter"><label class="filter-label" for="supplierCategorySearch">商品分类</label><input class="filter-input" id="supplierCategorySearch" placeholder="请输入分类名称"></div>
          <div class="category-tree-list" id="supplierCategoryTree"></div>
        </div>
      </section>
      <section class="table-panel">
        <div class="filter-section"><div class="filter-panel supplier-filter-panel">
          <div class="filter-fields">
            <div class="filter-group"><label class="filter-label" for="supplierProductName">商品名称</label><input class="filter-input" id="supplierProductName" placeholder="请输入名称/编号"></div>
            <div class="filter-group"><label class="filter-label" for="supplierBrand">品牌</label><input class="filter-input" id="supplierBrand" placeholder="请输入"></div>
            <div class="filter-group"><label class="filter-label" for="supplierStatus">状态</label><select class="filter-select" id="supplierStatus"><option>全部</option><option>已上架</option><option>已下架</option></select></div>
            <div class="filter-group"><label class="filter-label" for="supplierSource">商品来源</label><select class="filter-select" id="supplierSource"><option>全部</option><option>平台添加</option><option>供应商添加</option></select></div>
          </div>
          <div class="action-controls"><button class="btn btn-primary btn-sm btn-fixed" type="button" data-supplier-action="query">查询</button><button class="btn btn-sm btn-fixed" type="button" data-supplier-action="reset">重置</button></div>
        </div></div>
        <div class="table-container supplier-table-container"><div class="table-wrapper"><table class="data-table supplier-data-table"><thead><tr>
          <th>序号</th><th>图片</th><th>商品编号</th><th>商品名称（计量单位/品牌/规格）</th><th>分类</th><th>计量单位</th><th>状态</th><th>别名</th><th>产地</th><th>保质期</th><th>采购类型</th><th>商品来源</th><th>添加时间</th>
        </tr></thead><tbody id="supplierProductBody"></tbody></table></div><div class="pagination" id="supplierPagination"></div></div>
      </section>
    </div>
  </div>`;

  const root = window.AppShell.mount({ title: '商品管理', content, variant: 'supplier', emptyText: '供应商端商品管理' });
  renderTree();
  state.pagination = window.Pagination.create({ container: '#supplierPagination', page: 1, pageSize: state.pageSize, total: 0, pageSizeOptions: [20, 50], onChange: (next) => { state.page = next.page; state.pageSize = next.pageSize; renderRows(); } });
  filterProducts(true);
  bindEvents(root);
})();
