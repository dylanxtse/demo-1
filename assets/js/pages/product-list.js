(function () {
  const isSupplierProductPage = document.body?.dataset.userEnd === 'supplier';
  const downloadIcon = '<svg class="icon-svg" viewBox="0 0 24 24" style="width:14px;height:14px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
  const addIcon = '<svg class="icon-svg" viewBox="0 0 24 24" style="width:14px;height:14px;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
  const categoryIcon = '<svg class="icon-svg" viewBox="0 0 24 24" style="width:14px;height:14px;"><path d="M3 6h18M3 12h18M3 18h18"/></svg>';

  const pageContent = `
    <div class="page-card product-list-page">
      <div class="workspace-grid">
        <section class="category-panel">
          ${isSupplierProductPage ? '' : `<button class="btn btn-sm btn-blue category-edit-btn" type="button" data-action="edit-category">${categoryIcon}编辑商品分类</button>`}
          <div class="category-tree">
            <div class="category-filter">
              <label class="filter-label" for="categorySearch">商品分类</label>
              <input class="filter-input" id="categorySearch" placeholder="输入关键字搜索">
            </div>
            <div class="category-tree-list" id="categoryTree"></div>
          </div>
        </section>

        <section class="table-panel">
          <div class="filter-section">
            <div class="filter-panel">
              <div class="filter-fields">
                <div class="filter-group">
                  <label class="filter-label" for="productNameFilter">商品名称</label>
                  <input class="filter-input" id="productNameFilter" placeholder="请输入名称/编号">
                </div>
                <div class="filter-group">
                  <label class="filter-label" for="brandFilter">品牌</label>
                  <input class="filter-input" id="brandFilter" placeholder="请输入">
                </div>
                <div class="filter-group">
                  <label class="filter-label" for="statusFilter">上架状态</label>
                  <select class="filter-select" id="statusFilter"><option>全部</option><option>已上架</option><option>已下架</option></select>
                </div>
                ${isSupplierProductPage ? '' : `<div class="filter-group">
                  <label class="filter-label" for="purchaseTypeFilter">采购类型</label>
                  <select class="filter-select" id="purchaseTypeFilter"><option>全部</option><option>供应商送货</option><option>市场自采</option><option>企业自加工</option></select>
                </div>`}
                <div class="filter-group">
                  <label class="filter-label" for="sourceFilter">商品来源</label>
                  <select class="filter-select" id="sourceFilter"><option>全部</option><option>平台添加</option><option>供应商添加</option></select>
                </div>
                ${isSupplierProductPage ? '' : `
                <div class="filter-group">
                  <label class="filter-label" for="netVegetableFilter">是否净菜</label>
                  <select class="filter-select" id="netVegetableFilter"><option>全部</option><option>净菜</option><option>非净菜</option></select>
                </div>`}
              </div>
              <div class="action-controls">
                <button class="btn btn-primary btn-sm btn-fixed" type="button" data-action="query">查询</button>
                <button class="btn btn-sm btn-fixed" type="button" data-action="reset">重置</button>
              </div>
            </div>
          </div>

          <div class="action-bar">
            <div class="action-main">
              <button class="btn btn-primary btn-sm btn-action" type="button" data-action="add-product">${addIcon}添加商品</button>
              <button id="supplierImportInfoBtn" class="btn btn-sm btn-action btn-blue ${isSupplierProductPage ? 'btn-disabled' : ''}" type="button" ${isSupplierProductPage ? 'disabled' : ''}>导入商品信息</button>
              <button id="supplierImportImageBtn" class="btn btn-sm btn-action btn-blue ${isSupplierProductPage ? 'btn-disabled' : ''}" type="button" ${isSupplierProductPage ? 'disabled' : ''}>导入商品图片</button>
              ${isSupplierProductPage ? '' : '<button class="btn btn-sm btn-action btn-blue" type="button">导入市场价</button>'}
              ${isSupplierProductPage ? '' : '<button class="btn btn-sm btn-action btn-blue btn-disabled" id="batchShelfBtn" type="button" disabled>批量上架</button>'}
              ${isSupplierProductPage ? '' : '<button class="btn btn-sm btn-action btn-blue btn-disabled" id="batchUnshelfBtn" type="button" disabled>批量下架</button>'}
              <button class="btn btn-danger btn-sm btn-action btn-disabled" id="batchDeleteBtn" type="button" disabled>批量删除</button>
            </div>
            ${isSupplierProductPage ? '' : `<div class="action-controls"><button class="btn btn-sm btn-fixed" type="button">${downloadIcon}导出</button></div>`}
          </div>

          <div class="table-container">
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th class="checkbox-cell"><span class="custom-checkbox" role="checkbox" aria-checked="false" data-action="toggle-all"></span></th>
                    <th class="center">序号</th>
                    <th>图片</th>
                    <th>商品编号</th>
                    <th>商品名称（计量单位/品牌/规格）</th>
                    <th>分类</th>
                    <th>计量单位</th>
                    <th>市场价</th>
                    <th>状态</th>
                    <th>别名</th>
                    <th>产地</th>
                    <th>保质期</th>
                    ${isSupplierProductPage ? '' : '<th>采购类型</th>'}
                    <th>商品来源</th>
                    <th>添加时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody id="tableBody"></tbody>
              </table>
            </div>
            <div class="pagination" id="productPagination"></div>
          </div>
        </section>
      </div>

      <div class="unshelf-modal" id="unshelfModal" aria-hidden="true">
        <div class="unshelf-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="unshelfModalTitle">
          <div class="unshelf-modal-header">
            <h2 id="unshelfModalTitle">下架商品</h2>
            <button class="unshelf-modal-close" type="button" data-action="close-unshelf-modal" aria-label="关闭">×</button>
          </div>
          <div class="unshelf-modal-body">
            <label class="unshelf-reason-label required" for="unshelfReason">下架原因</label>
            <textarea id="unshelfReason" maxlength="200" placeholder="请输入下架原因"></textarea>
            <div class="unshelf-reason-footer">
              <span class="unshelf-reason-error" id="unshelfReasonError"></span>
              <span class="unshelf-reason-count" id="unshelfReasonCount">0/200</span>
            </div>
          </div>
          <div class="unshelf-modal-actions">
            <button class="btn" type="button" data-action="cancel-unshelf">取消</button>
            <button class="btn btn-primary" type="button" data-action="confirm-unshelf">确定</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const treeData = [
    { name: '全部', selected: false },
    { name: '主食（米面粉点心类）', expanded: true, children: [
      { name: '新增二级分类' },
      { name: '新增三级分类' },
      { name: '粮食类', children: [{ name: '米类' }, { name: '面类' }] }
    ]},
    { name: '食油', expanded: true, children: [{ name: '食油二级' }, { name: '食油三级' }, { name: '花生油' }] },
    { name: '果蔬', expanded: true, children: [{ name: '果蔬二级' }, { name: '果蔬三级' }] },
    { name: '肉（豆）制品', expanded: true, children: [{ name: '肉（豆）制品二级' }, { name: '肉（豆）制品三级' }] },
    { name: '水产品', expanded: true, children: [{ name: '水产品二级' }] },
    { name: '蛋奶类', children: [{ name: '蛋奶类二级' }] },
    { name: '调味品', children: [{ name: '调味品二级' }] },
    { name: '其他材料', children: [{ name: '其他二级' }] }
  ];

  const state = {
    products: window.ProductService.getList(),
    filteredProducts: [],
    visibleProducts: [],
    page: 1,
    pageSize: 20,
    total: 0,
    pagination: null,
    tree: JSON.parse(JSON.stringify(treeData)),
    treeSearch: ''
  };

  function getNodeByPath(path) {
    let current = state.tree;
    let node = null;
    path.forEach((index) => {
      node = current[index];
      current = node?.children || [];
    });
    return node;
  }

  function filteredTree(nodes, query, path = []) {
    if (!query) return nodes.map((node, index) => ({ ...node, __path: [...path, index], children: node.children ? filteredTree(node.children, '', [...path, index]) : undefined }));
    return nodes.flatMap((node, index) => {
      const nodePath = [...path, index];
      const matches = node.name.toLowerCase().includes(query);
      const children = node.children ? filteredTree(node.children, query, nodePath) : [];
      if (!matches && children.length === 0) return [];
      return [{ ...node, expanded: true, __path: nodePath, children: children.length ? children : node.children }];
    });
  }

  function renderTree() {
    const query = state.treeSearch.trim().toLowerCase();
    const visibleTree = filteredTree(state.tree, query);
    const renderNodes = (nodes) => nodes.map((node) => {
      const path = node.__path.join('-');
      return `
        <div class="tree-node ${node.expanded ? 'expanded' : ''}">
          <div class="tree-node-header ${node.selected ? 'selected' : ''}" data-tree-node="${path}">
            <span class="tree-arrow">${node.children ? '▶' : ''}</span>
            <span class="tree-label">${window.DomUtils.escapeHtml(node.name)}</span>
            <div class="tree-actions"><button class="tree-action-btn" type="button" data-action="add-category">+</button></div>
          </div>
          ${node.children ? `
            <div class="tree-children">
              ${node.children.map((child, childIndex) => {
                const childPath = [...node.__path, childIndex].join('-');
                return `
                  <div class="tree-child" data-tree-child="${childPath}">
                    <span class="tree-arrow">${child.children ? '▶' : ''}</span>
                    <span class="tree-label">${window.DomUtils.escapeHtml(child.name)}</span>
                  </div>
                  ${child.children ? child.children.map((grandchild) => `<div class="tree-grandchild">${window.DomUtils.escapeHtml(grandchild.name)}</div>`).join('') : ''}
                `;
              }).join('')}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
    document.getElementById('categoryTree').innerHTML = renderNodes(visibleTree);
  }

  function renderTable(products = state.visibleProducts) {
    state.visibleProducts = products;
    document.getElementById('tableBody').innerHTML = products.map((product) => {
      const safe = Object.fromEntries(Object.entries(product).map(([key, value]) => [key, window.DomUtils.escapeHtml(value)]));
      const statusLabel = window.BusinessRules.statusLabel('products', product.status);
      const isEnabled = product.status === 'ENABLE';
      const purchaseType = window.DomUtils.escapeHtml(product.purchaseType);
      const shelfLife = product.shelfLife === false || product.shelfLife == null || product.shelfLife === ''
        ? '--'
        : window.DomUtils.escapeHtml(product.shelfLife);
      const nextAction = isEnabled ? '下架' : '上架';
      const netVegetableTag = !isSupplierProductPage && product.isNetVegetable
        ? '<span class="net-vegetable-tag">净菜</span>'
        : '';
      const productDisplay = window.DomUtils.formatProductDisplay(product);
      const editDisabled = isEnabled;
      return `
        <tr>
          <td class="checkbox-cell"><span class="custom-checkbox" role="checkbox" aria-checked="false" data-action="toggle-row"></span></td>
          <td class="seq-cell">${safe.seq}</td>
          <td class="img-cell"><div class="product-img">图片</div></td>
          <td class="code-cell"><button class="btn-text code-link" type="button" data-row-action="detail" data-code="${safe.code}">${safe.code}</button></td>
          <td class="name-cell"><span class="product-display-text" title="${window.DomUtils.escapeHtml(productDisplay)}">${netVegetableTag}${window.DomUtils.escapeHtml(productDisplay)}</span></td>
          <td>${safe.category}</td>
          <td>${safe.unit}</td>
          <td>${safe.marketPrice}</td>
          <td><span class="status-tag ${isEnabled ? 'online' : 'offline'}">${window.DomUtils.escapeHtml(statusLabel)}</span></td>
          <td>${safe.alias || '--'}</td>
          <td>${safe.origin || '--'}</td>
          <td>${shelfLife}</td>
          ${isSupplierProductPage ? '' : `<td>${purchaseType}</td>`}
          <td>${safe.source}</td>
          <td>${safe.addTime}</td>
          <td class="action-cell"><div class="operation-actions">
            ${isSupplierProductPage ? '' : `<button class="btn-text" type="button" data-row-action="status" data-code="${safe.code}">${nextAction}</button>`}
            <button class="btn-text ${editDisabled ? 'disabled' : ''}" type="button" data-row-action="edit" data-code="${safe.code}" ${editDisabled ? 'disabled' : ''}>编辑</button>
            <button class="btn-text danger" type="button" data-row-action="delete" data-code="${safe.code}">删除</button>
          </div></td>
        </tr>
      `;
    }).join('');
    updateBatchButtons();
  }

  function updateBatchButtons() {
    const enabled = document.querySelectorAll('#tableBody .custom-checkbox.checked').length > 0;
    const buttonIds = isSupplierProductPage
      ? ['supplierImportInfoBtn', 'supplierImportImageBtn', 'batchDeleteBtn']
      : ['batchShelfBtn', 'batchUnshelfBtn', 'batchDeleteBtn'];
    buttonIds.forEach((id) => {
      const button = document.getElementById(id);
      if (!button) return;
      button.disabled = !enabled;
      button.classList.toggle('btn-disabled', !enabled);
    });
  }

  function renderProductPage() {
    const totalPages = Math.max(1, Math.ceil(state.total / state.pageSize));
    state.page = Math.min(totalPages, Math.max(1, state.page));
    const start = (state.page - 1) * state.pageSize;
    state.visibleProducts = state.filteredProducts.slice(start, start + state.pageSize);
    renderTable();
    state.pagination?.update({ page: state.page, pageSize: state.pageSize, total: state.total });
  }

  function filterProducts(resetPage = false) {
    const value = (id) => document.getElementById(id).value.trim();
    const nameOrCode = value('productNameFilter').toLowerCase();
    const brand = value('brandFilter').toLowerCase();
    const status = value('statusFilter');
    const purchaseType = isSupplierProductPage ? '全部' : value('purchaseTypeFilter');
    const source = value('sourceFilter');
    const netVegetable = isSupplierProductPage ? '全部' : value('netVegetableFilter');
    const result = state.products.filter((product) => (
      (!nameOrCode || `${product.name} ${product.code}`.toLowerCase().includes(nameOrCode)) &&
      (!brand || product.brand.toLowerCase().includes(brand)) &&
      (status === '全部' || window.BusinessRules.statusLabel('products', product.status) === status) &&
      (purchaseType === '全部' || product.purchaseType === purchaseType) &&
      (source === '全部' || product.source === source) &&
      (isSupplierProductPage || netVegetable === '全部' || (netVegetable === '净菜' && product.isNetVegetable) || (netVegetable === '非净菜' && !product.isNetVegetable))
    ));
    state.filteredProducts = result;
    state.total = result.length;
    if (resetPage) state.page = 1;
    renderProductPage();
  }

  function resetFilters() {
    ['productNameFilter', 'brandFilter'].forEach((id) => { document.getElementById(id).value = ''; });
    ['statusFilter', 'sourceFilter'].forEach((id) => { document.getElementById(id).value = '全部'; });
    if (!isSupplierProductPage) document.getElementById('purchaseTypeFilter').value = '全部';
    if (!isSupplierProductPage) document.getElementById('netVegetableFilter').value = '全部';
    filterProducts(true);
  }

  function updateProductStatus(product, status, reason = '') {
    const updatedProduct = window.ProductService.update(product.code, {
      status,
      ...(reason ? { unshelfReason: reason } : {})
    });
    if (!updatedProduct) return false;
    const index = state.products.findIndex((item) => item.code === product.code);
    if (index >= 0) state.products[index] = updatedProduct;
    filterProducts();
    return true;
  }

  function updateUnshelfReasonCount() {
    const reason = document.getElementById('unshelfReason');
    const count = document.getElementById('unshelfReasonCount');
    if (reason && count) count.textContent = `${reason.value.length}/200`;
  }

  function openUnshelfModal(product) {
    const modal = document.getElementById('unshelfModal');
    const reason = document.getElementById('unshelfReason');
    modal.dataset.productCode = product.code;
    reason.value = '';
    document.getElementById('unshelfReasonError').textContent = '';
    reason.removeAttribute('aria-invalid');
    updateUnshelfReasonCount();
    modal.classList.add('is-visible');
    modal.setAttribute('aria-hidden', 'false');
    reason.focus();
  }

  function closeUnshelfModal() {
    const modal = document.getElementById('unshelfModal');
    modal.classList.remove('is-visible');
    modal.setAttribute('aria-hidden', 'true');
    delete modal.dataset.productCode;
  }

  function confirmUnshelf() {
    const modal = document.getElementById('unshelfModal');
    const reason = document.getElementById('unshelfReason');
    const error = document.getElementById('unshelfReasonError');
    const value = reason.value.trim();
    if (!value) {
      error.textContent = '下架原因不能为空';
      reason.setAttribute('aria-invalid', 'true');
      reason.focus();
      return;
    }
    const product = state.products.find((item) => item.code === modal.dataset.productCode);
    if (product && updateProductStatus(product, 'DISABLE', value)) closeUnshelfModal();
  }

  function bindEvents() {
    const root = document.querySelector('.product-list-page');
    const navigateToProductForm = (mode = '', code = '') => {
      const params = new URLSearchParams();
      if (isSupplierProductPage) params.set('from', 'supplier');
      if (mode) params.set('mode', mode);
      if (code) params.set('id', code);
      const query = params.toString();
      const target = `./goodsAdd.html${query ? `?${query}` : ''}`;
      if (window.AppNavigation?.navigate) window.AppNavigation.navigate(target);
      else window.location.href = target;
    };
    root.addEventListener('click', (event) => {
      const action = event.target.closest('[data-action]')?.dataset.action;
      const selectedCodes = () => [...document.querySelectorAll('#tableBody .custom-checkbox.checked')]
        .map((checkbox) => checkbox.closest('tr')?.querySelector('[data-code]')?.dataset.code)
        .filter(Boolean);
      if (event.target.id === 'batchShelfBtn') {
        selectedCodes().forEach((code) => {
          const product = state.products.find((item) => item.code === code);
          if (product) updateProductStatus(product, 'ENABLE');
        });
        return;
      }
      if (event.target.id === 'batchUnshelfBtn') {
        selectedCodes().forEach((code) => {
          const product = state.products.find((item) => item.code === code);
          if (product) updateProductStatus(product, 'DISABLE', '批量下架');
        });
        return;
      }
      if (event.target.id === 'batchDeleteBtn') {
        if (!window.confirm('确认删除选中的未引用商品吗？')) return;
        const failures = [];
        selectedCodes().forEach((code) => {
          try {
            window.ProductService.remove(code);
            state.products = state.products.filter((item) => item.code !== code);
          } catch (error) {
            failures.push(error.message);
          }
        });
        filterProducts();
        if (failures.length) window.alert([...new Set(failures)].join('\n'));
        return;
      }
      if (action === 'query') filterProducts(true);
      if (action === 'reset') resetFilters();
      if (action === 'add-product') navigateToProductForm();
      if (action === 'edit-category') window.alert('编辑商品分类');
      if (action === 'add-category') {
        event.stopPropagation();
        window.alert('新增子分类');
      }
      if (action === 'close-unshelf-modal' || action === 'cancel-unshelf') closeUnshelfModal();
      if (action === 'confirm-unshelf') confirmUnshelf();
      if (action === 'toggle-row') {
        const checkbox = event.target.closest('.custom-checkbox');
        checkbox.classList.toggle('checked');
        checkbox.setAttribute('aria-checked', String(checkbox.classList.contains('checked')));
        updateBatchButtons();
      }
      if (action === 'toggle-all') {
        const checkbox = event.target.closest('.custom-checkbox');
        const checked = checkbox.classList.toggle('checked');
        checkbox.setAttribute('aria-checked', String(checked));
        document.querySelectorAll('#tableBody .custom-checkbox').forEach((rowCheckbox) => {
          rowCheckbox.classList.toggle('checked', checked);
          rowCheckbox.setAttribute('aria-checked', String(checked));
        });
        updateBatchButtons();
      }

      const treeNode = event.target.closest('[data-tree-node]');
      if (treeNode && action !== 'add-category') {
        const node = getNodeByPath(treeNode.dataset.treeNode.split('-').map(Number));
        if (node) {
          state.tree.forEach((item) => { item.selected = false; });
          node.selected = true;
          node.expanded = !node.expanded;
          renderTree();
        }
      }

      const rowAction = event.target.closest('[data-row-action]');
      if (rowAction) {
        const product = state.products.find((item) => item.code === rowAction.dataset.code);
        if (!product) return;
        if (rowAction.dataset.rowAction === 'edit') navigateToProductForm('edit', product.code);
        if (rowAction.dataset.rowAction === 'detail') navigateToProductForm('view', product.code);
        if (rowAction.dataset.rowAction === 'status') {
          if (product.status === 'ENABLE') openUnshelfModal(product);
          else updateProductStatus(product, 'ENABLE');
        }
        if (rowAction.dataset.rowAction === 'delete') {
          if (!window.confirm(`确认删除商品「${product.name}」吗？`)) return;
          try {
            window.ProductService.remove(product.code);
            state.products = state.products.filter((item) => item.code !== product.code);
            filterProducts();
          } catch (error) {
            window.alert(error.message);
          }
        }
      }
    });

    document.getElementById('unshelfReason').addEventListener('input', () => {
      const reason = document.getElementById('unshelfReason');
      reason.removeAttribute('aria-invalid');
      document.getElementById('unshelfReasonError').textContent = '';
      updateUnshelfReasonCount();
    });

    document.getElementById('categorySearch').addEventListener('input', (event) => {
      state.treeSearch = event.target.value || '';
      renderTree();
    });
    document.querySelectorAll('#productNameFilter, #brandFilter').forEach((input) => {
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') filterProducts(true);
      });
    });
  }

  window.AppShell.mount({ title: '商品管理', content: pageContent, variant: isSupplierProductPage ? 'supplier' : 'enterprise' });
  state.filteredProducts = [...state.products];
  state.total = state.filteredProducts.length;
  state.pagination = window.Pagination.create({
    container: '#productPagination',
    page: state.page,
    pageSize: state.pageSize,
    total: state.total,
    pageSizeOptions: [20, 50, 100],
    onChange: ({ page, pageSize }) => {
      state.page = page;
      state.pageSize = pageSize;
      renderProductPage();
    }
  });
  renderTree();
  renderProductPage();
  bindEvents();
})();
