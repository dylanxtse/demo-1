(function () {
  const backIcon = '<svg class="icon-svg" viewBox="0 0 24 24" style="width:14px;height:14px;"><polyline points="15 18 9 12 15 6"/></svg>';

  const pageContent = `
    <div class="page-card goods-review-page">
      <div class="review-workspace" id="reviewListPage">
        <aside class="review-category-panel">
          <div class="category-tree">
            <div class="category-filter">
              <label class="filter-label" for="reviewCategorySearch">商品分类</label>
              <input class="filter-input" id="reviewCategorySearch" placeholder="输入关键字搜索">
            </div>
            <div class="category-tree-list review-category-tree" id="reviewCategoryTree"></div>
          </div>
        </aside>

        <section class="review-table-panel">
          <div class="filter-section">
            <div class="filter-panel">
              <div class="filter-fields">
                <div class="filter-group">
                  <label class="filter-label" for="reviewGoodsName">商品名称</label>
                  <input class="filter-input" id="reviewGoodsName" placeholder="商品名称/编码">
                </div>
                <div class="filter-group">
                  <label class="filter-label" for="reviewBrand">品牌</label>
                  <input class="filter-input" id="reviewBrand" placeholder="品牌">
                </div>
                <div class="filter-group">
                  <label class="filter-label" for="reviewStatus">审核状态</label>
                  <select class="filter-select" id="reviewStatus">
                    <option value="全部">全部</option>
                    <option value="PENDING">待审核</option>
                    <option value="APPROVED">已通过</option>
                    <option value="REJECTED">已驳回</option>
                  </select>
                </div>
              </div>
              <div class="action-controls">
                <button class="btn btn-primary btn-sm btn-fixed" type="button" data-action="query">查询</button>
                <button class="btn btn-sm btn-fixed" type="button" data-action="reset">重置</button>
              </div>
            </div>
          </div>

          <div class="table-container">
            <div class="table-wrapper">
              <table class="data-table review-table">
                <thead>
                  <tr>
                    <th style="width:70px;">序号</th>
                    <th style="width:80px;">图片</th>
                    <th style="width:130px;">商品编号</th>
                    <th style="width:280px;">商品名称（计量单位/品牌/规格）</th>
                    <th style="width:350px;">分类</th>
                    <th style="width:120px;">计量单位</th>
                    <th style="width:110px;">审核状态</th>
                    <th>别名</th>
                    <th>产地</th>
                    <th>保质期</th>
                    <th style="width:180px;">添加时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody id="reviewTableBody"></tbody>
              </table>
            </div>
            <div class="pagination" id="reviewPagination"></div>
          </div>
        </section>
      </div>

      <section class="review-detail-page" id="reviewDetailPage">
        <header class="review-detail-header">
          <button class="review-back-button" type="button" data-action="back-to-list">${backIcon}<span>返回</span></button>
          <h1 id="reviewDetailTitle">商品详情</h1>
          <span class="review-detail-status" id="reviewDetailStatus"></span>
        </header>
        <div class="review-detail-body" id="reviewDetailBody"></div>
        <div class="review-detail-actions" id="reviewDetailActions"></div>
      </section>

      <div class="review-modal" id="reviewConfirmModal" aria-hidden="true">
        <div class="review-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="reviewConfirmTitle">
          <div class="review-modal-header">
            <h2 id="reviewConfirmTitle">审核通过</h2>
            <button class="review-modal-close" type="button" data-action="close-confirm" aria-label="关闭">×</button>
          </div>
          <div class="review-modal-body">
            <p class="review-modal-tip" id="reviewConfirmTip">确定通过审核吗？</p>
          </div>
          <div class="review-modal-actions">
            <button class="btn" type="button" data-action="close-confirm">取消</button>
            <button class="btn btn-primary" type="button" data-action="confirm-operation">确定</button>
          </div>
        </div>
      </div>

      <div class="review-modal" id="reviewRejectModal" aria-hidden="true">
        <div class="review-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="reviewRejectTitle">
          <div class="review-modal-header">
            <h2 id="reviewRejectTitle">驳回</h2>
            <button class="review-modal-close" type="button" data-action="close-reject" aria-label="关闭">×</button>
          </div>
          <div class="review-modal-body">
            <div class="review-reject-row">
              <label class="review-reject-label" for="reviewRejectReason">驳回原因：</label>
              <div>
                <textarea class="review-reject-input" id="reviewRejectReason" maxlength="100" placeholder="请输入"></textarea>
                <div class="review-reject-meta">
                  <span class="review-reject-error" id="reviewRejectError"></span>
                  <span id="reviewRejectCount">0/100</span>
                </div>
              </div>
            </div>
          </div>
          <div class="review-modal-actions">
            <button class="btn" type="button" data-action="close-reject">取消</button>
            <button class="btn btn-primary" type="button" data-action="confirm-reject">确定</button>
          </div>
        </div>
      </div>

      <div class="review-toast" id="reviewToast" role="status"></div>
    </div>
  `;

  const state = {
    items: [],
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 1,
    pagination: null,
    category: '全部',
    categorySearch: '',
    categories: [],
    expandedCategories: new Set(),
    selectedReview: null,
    detailMode: 'view',
    pendingOperation: null,
    toastTimer: null
  };

  function escapeHtml(value) {
    return window.DomUtils?.escapeHtml(value) || String(value ?? '');
  }

  function value(id) {
    return document.getElementById(id).value.trim();
  }

  function statusClass(status) {
    if (status === 'APPROVED') return 'review-status-approved';
    if (status === 'PENDING') return 'review-status-pending';
    return 'review-status-rejected';
  }

  function setModal(id, visible) {
    const modal = document.getElementById(id);
    modal.classList.toggle('is-visible', visible);
    modal.setAttribute('aria-hidden', String(!visible));
  }

  function showToast(message, type = 'success') {
    const toast = document.getElementById('reviewToast');
    clearTimeout(state.toastTimer);
    toast.textContent = message;
    toast.className = `review-toast is-visible ${type}`;
    state.toastTimer = setTimeout(() => {
      toast.className = 'review-toast';
    }, 2200);
  }

  function renderProductImage(item, className) {
    if (item.imageUrl) {
      return `<img class="${className}" src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name)}">`;
    }
    return `<span class="${className}">${escapeHtml(item.imageName || '暂无图片')}</span>`;
  }

  function renderCategories() {
    const query = state.categorySearch.toLocaleLowerCase();
    const allCategory = state.categories.find((category) => category.value === '全部');
    const roots = state.categories
      .filter((category) => category.level === 0 && category.value !== '全部')
      .map((root) => ({
        ...root,
        children: state.categories.filter((category) =>
          category.level === 1 && category.value.startsWith(`${root.value}-`)
        )
      }))
      .filter((root) => !query ||
        root.label.toLocaleLowerCase().includes(query) ||
        root.children.some((child) => child.label.toLocaleLowerCase().includes(query))
      );
    const allVisible = allCategory && (!query || allCategory.label.toLocaleLowerCase().includes(query));
    const allHtml = allVisible ? `
      <div class="tree-node">
        <button class="tree-node-header review-category-header ${state.category === '全部' ? 'selected' : ''}"
          type="button" data-category="全部">
          <span class="tree-arrow" aria-hidden="true"></span>
          <span class="tree-label">全部</span>
        </button>
      </div>` : '';
    const rootsHtml = roots.map((root) => {
      const expanded = Boolean(query) || state.expandedCategories.has(root.value);
      const children = query
        ? root.children.filter((child) =>
          root.label.toLocaleLowerCase().includes(query) ||
          child.label.toLocaleLowerCase().includes(query)
        )
        : root.children;
      return `
        <div class="tree-node ${expanded ? 'expanded' : ''}">
          <div class="tree-node-header review-category-header ${state.category === root.value ? 'selected' : ''}">
            <button class="tree-arrow review-tree-toggle" type="button"
              data-category-toggle="${escapeHtml(root.value)}"
              aria-label="${expanded ? '折叠' : '展开'}${escapeHtml(root.label)}"
              aria-expanded="${expanded}">▶</button>
            <button class="tree-label review-category-label" type="button"
              data-category="${escapeHtml(root.value)}">${escapeHtml(root.label)}</button>
          </div>
          <div class="tree-children">
            ${children.map((child) => `
              <button class="tree-child review-category-child ${state.category === child.value ? 'selected' : ''}"
                type="button" data-category="${escapeHtml(child.value)}">
                <span class="tree-arrow" aria-hidden="true"></span>
                <span class="tree-label">${escapeHtml(child.label)}</span>
              </button>
            `).join('')}
          </div>
        </div>`;
    }).join('');
    document.getElementById('reviewCategoryTree').innerHTML = allHtml + rootsHtml;
  }

  function renderTable() {
    const body = document.getElementById('reviewTableBody');
    if (!state.items.length) {
      body.innerHTML = '<tr class="review-empty-row"><td colspan="12">暂无数据</td></tr>';
      return;
    }
    body.innerHTML = state.items.map((item, index) => {
      const pending = item.auditStatus === 'PENDING';
      const sequence = (state.page - 1) * state.pageSize + index + 1;
      const compositeName = `${item.name}(${item.unit || '--'}/${item.brand || '--'}/${item.spec || '--'})`;
      return `
        <tr>
          <td class="seq-cell">${sequence}</td>
          <td>${renderProductImage(item, 'review-product-image')}</td>
          <td><button class="btn-text code-link" type="button" data-row-action="detail" data-id="${escapeHtml(item.reviewId)}">${escapeHtml(item.code)}</button></td>
          <td class="name-cell" title="${escapeHtml(compositeName)}">${escapeHtml(compositeName)}</td>
          <td title="${escapeHtml(item.category)}">${escapeHtml(item.category || '--')}</td>
          <td>${escapeHtml(item.unit || '--')}</td>
          <td><span class="status-tag ${statusClass(item.auditStatus)}">${escapeHtml(item.auditStatusName)}</span></td>
          <td>${escapeHtml(item.alias || '--')}</td>
          <td>${escapeHtml(item.origin || '--')}</td>
          <td>${escapeHtml(item.shelfLife || '--')}</td>
          <td>${escapeHtml(item.addTime || '--')}</td>
          <td class="action-cell">
            <button class="btn-text ${pending ? 'disabled' : ''}" type="button" data-row-action="shelf" data-id="${escapeHtml(item.reviewId)}" ${pending ? 'disabled' : ''}>上架</button>
            <button class="btn-text ${pending ? '' : 'disabled'}" type="button" data-row-action="audit" data-id="${escapeHtml(item.reviewId)}" ${pending ? '' : 'disabled'}>审核</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderPagination() {
    state.totalPages = Math.max(1, Math.ceil(state.total / state.pageSize));
    state.pagination?.update({ page: state.page, pageSize: state.pageSize, total: state.total });
  }

  async function loadPage() {
    try {
      let result = await window.GoodsReviewService.list({
        page: state.page,
        pageSize: state.pageSize,
        condition: {
          category: state.category,
          goodsName: value('reviewGoodsName'),
          brand: value('reviewBrand'),
          auditStatus: value('reviewStatus')
        }
      });
      if (result.total > 0 && !result.items.length && state.page > 1) {
        state.page = Math.max(1, Math.ceil(result.total / state.pageSize));
        result = await window.GoodsReviewService.list({
          page: state.page,
          pageSize: state.pageSize,
          condition: {
            category: state.category,
            goodsName: value('reviewGoodsName'),
            brand: value('reviewBrand'),
            auditStatus: value('reviewStatus')
          }
        });
      }
      state.items = result.items;
      state.total = result.total;
      state.page = result.page;
      renderTable();
      renderPagination();
    } catch (error) {
      state.items = [];
      state.total = 0;
      renderTable();
      renderPagination();
      showToast(error.message || '数据加载失败', 'error');
    }
  }

  function query() {
    state.page = 1;
    loadPage();
  }

  function reset() {
    document.getElementById('reviewGoodsName').value = '';
    document.getElementById('reviewBrand').value = '';
    document.getElementById('reviewStatus').value = '全部';
    document.getElementById('reviewCategorySearch').value = '';
    state.category = '全部';
    state.categorySearch = '';
    state.page = 1;
    state.pageSize = 20;
    renderCategories();
    loadPage();
  }

  function detailItem(label, value) {
    return `<div class="review-detail-item"><span class="review-detail-label">${escapeHtml(label)}：</span><span class="review-detail-value">${escapeHtml(value || '--')}</span></div>`;
  }

  function renderDetail(item, mode) {
    state.selectedReview = item;
    state.detailMode = mode;
    document.getElementById('reviewListPage').style.display = 'none';
    document.getElementById('reviewDetailPage').classList.add('is-visible');
    document.getElementById('reviewDetailTitle').textContent = mode === 'audit' ? '商品审核' : '商品详情';
    document.getElementById('reviewDetailStatus').innerHTML =
      `审核状态：<span class="status-tag ${statusClass(item.auditStatus)}">${escapeHtml(item.auditStatusName)}</span>`;
    document.getElementById('reviewDetailBody').innerHTML = `
      <section class="review-detail-section">
        <h2>基本信息</h2>
        <div class="review-detail-grid">
          ${detailItem('商品编号', item.code)}
          ${detailItem('商品名称', item.name)}
          ${detailItem('商品分类', item.category)}
          ${detailItem('计量单位', item.unit)}
          ${detailItem('品牌', item.brand)}
          ${detailItem('规格', item.spec)}
          ${detailItem('别名', item.alias)}
          ${detailItem('产地', item.origin)}
          ${detailItem('保质期', item.shelfLife)}
          ${detailItem('市场价', item.marketPrice ? `¥${item.marketPrice}` : '--')}
          ${detailItem('采购类型', item.purchaseType)}
          ${detailItem('商品来源', item.source)}
          ${detailItem('添加时间', item.addTime)}
          ${detailItem('审核时间', item.auditTime)}
          ${detailItem('驳回原因', item.auditContent)}
        </div>
      </section>
      <section class="review-detail-section">
        <h2>商品图片</h2>
        ${renderProductImage(item, 'review-detail-image')}
      </section>
    `;
    const actions = document.getElementById('reviewDetailActions');
    actions.innerHTML = mode === 'audit' && item.auditStatus === 'PENDING'
      ? '<button class="btn btn-danger" type="button" data-action="open-reject">审核驳回</button><button class="btn btn-primary" type="button" data-action="open-approve">审核通过</button>'
      : '';
  }

  function closeDetail() {
    state.selectedReview = null;
    state.detailMode = 'view';
    document.getElementById('reviewDetailPage').classList.remove('is-visible');
    document.getElementById('reviewListPage').style.display = 'grid';
  }

  async function openDetail(id, mode) {
    const item = await window.GoodsReviewService.get(id);
    if (!item) {
      showToast('未找到商品审核记录', 'error');
      return;
    }
    renderDetail(item, mode);
  }

  function openConfirm(type, item) {
    state.pendingOperation = { type, item };
    document.getElementById('reviewConfirmTitle').textContent = type === 'approve' ? '审核通过' : '商品上架';
    document.getElementById('reviewConfirmTip').textContent =
      type === 'approve' ? '确定通过审核吗？' : `确认上架商品“${item.name}”吗？`;
    setModal('reviewConfirmModal', true);
  }

  function closeConfirm() {
    state.pendingOperation = null;
    setModal('reviewConfirmModal', false);
  }

  async function confirmOperation() {
    const operation = state.pendingOperation;
    if (!operation) return;
    try {
      if (operation.type === 'approve') {
        await window.GoodsReviewService.transition(operation.item.reviewId, 'approve');
      } else {
        await window.GoodsReviewService.shelf(operation.item.reviewId);
      }
      closeConfirm();
      closeDetail();
      await loadPage();
      showToast('操作成功');
    } catch (error) {
      closeConfirm();
      showToast(error.message || '操作失败', 'error');
    }
  }

  function openReject() {
    document.getElementById('reviewRejectReason').value = '';
    document.getElementById('reviewRejectReason').removeAttribute('aria-invalid');
    document.getElementById('reviewRejectError').textContent = '';
    document.getElementById('reviewRejectCount').textContent = '0/100';
    setModal('reviewRejectModal', true);
    document.getElementById('reviewRejectReason').focus();
  }

  function closeReject() {
    setModal('reviewRejectModal', false);
  }

  async function confirmReject() {
    const input = document.getElementById('reviewRejectReason');
    const reason = input.value.trim();
    if (!reason) {
      input.setAttribute('aria-invalid', 'true');
      document.getElementById('reviewRejectError').textContent = '此项必填';
      return;
    }
    try {
      await window.GoodsReviewService.transition(state.selectedReview.reviewId, 'reject', {
        auditContent: reason
      });
      closeReject();
      closeDetail();
      await loadPage();
      showToast('操作成功');
    } catch (error) {
      document.getElementById('reviewRejectError').textContent = error.message || '操作失败';
    }
  }

  function bindEvents() {
    const root = document.getElementById('pageContent');
    root.addEventListener('click', async (event) => {
      const actionTarget = event.target.closest('[data-action]');
      const action = actionTarget?.dataset.action;
      if (action === 'query') query();
      if (action === 'reset') reset();
      if (action === 'back-to-list') closeDetail();
      if (action === 'open-approve' && state.selectedReview) openConfirm('approve', state.selectedReview);
      if (action === 'open-reject') openReject();
      if (action === 'close-confirm') closeConfirm();
      if (action === 'confirm-operation') confirmOperation();
      if (action === 'close-reject') closeReject();
      if (action === 'confirm-reject') confirmReject();

      const categoryToggle = event.target.closest('[data-category-toggle]');
      if (categoryToggle) {
        const category = categoryToggle.dataset.categoryToggle;
        if (state.expandedCategories.has(category)) state.expandedCategories.delete(category);
        else state.expandedCategories.add(category);
        renderCategories();
        return;
      }

      const categoryTarget = event.target.closest('[data-category]');
      if (categoryTarget) {
        state.category = categoryTarget.dataset.category;
        state.page = 1;
        renderCategories();
        await loadPage();
      }

      const rowAction = event.target.closest('[data-row-action]');
      if (!rowAction || rowAction.disabled) return;
      const id = rowAction.dataset.id;
      if (rowAction.dataset.rowAction === 'detail') await openDetail(id, 'view');
      if (rowAction.dataset.rowAction === 'audit') await openDetail(id, 'audit');
      if (rowAction.dataset.rowAction === 'shelf') {
        const item = await window.GoodsReviewService.get(id);
        if (item) openConfirm('shelf', item);
      }
    });

    document.getElementById('reviewCategorySearch').addEventListener('input', (event) => {
      state.categorySearch = event.target.value.trim();
      renderCategories();
    });
    ['reviewGoodsName', 'reviewBrand'].forEach((id) => {
      document.getElementById(id).addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          query();
        }
      });
    });
    document.getElementById('reviewRejectReason').addEventListener('input', (event) => {
      event.target.removeAttribute('aria-invalid');
      document.getElementById('reviewRejectError').textContent = '';
      document.getElementById('reviewRejectCount').textContent = `${event.target.value.length}/100`;
    });
  }

  async function init() {
    window.AppShell.mount({ title: '商品审核', content: pageContent });
    state.pagination = window.Pagination.create({
      container: '#reviewPagination',
      page: state.page,
      pageSize: state.pageSize,
      total: state.total,
      pageSizeOptions: [20, 50, 100],
      onChange: async ({ page, pageSize }) => {
        state.page = page;
        state.pageSize = pageSize;
        await loadPage();
      }
    });
    bindEvents();
    state.categories = await window.GoodsReviewService.options('category');
    state.categories
      .filter((category) => category.level === 0 && category.value !== '全部')
      .forEach((category) => state.expandedCategories.add(category.value));
    renderCategories();
    await loadPage();
  }

  init();
})();
