(function () {
  function resolveElement(target) {
    if (typeof target === 'string') return document.querySelector(target);
    return target;
  }

  function positiveInteger(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
  }

  function uniquePageSizes(options, fallback) {
    const sizes = (Array.isArray(options) ? options : fallback)
      .map((size) => positiveInteger(size, 0))
      .filter(Boolean);
    return [...new Set(sizes)].length ? [...new Set(sizes)] : fallback;
  }

  function pageButtons(currentPage, totalPages, maxVisible) {
    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const half = Math.floor(maxVisible / 2);
    let start = Math.max(1, currentPage - half);
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);

    const pages = [];
    if (start > 1) pages.push(1, 'ellipsis');
    for (let page = start; page <= end; page += 1) pages.push(page);
    if (end < totalPages) pages.push('ellipsis', totalPages);
    return pages;
  }

  function create(config = {}) {
    const root = resolveElement(config.container);
    if (!root) throw new Error('分页容器不存在');

    const mode = config.mode === 'compact' ? 'compact' : 'numeric';
    const pageSizeOptions = uniquePageSizes(config.pageSizeOptions, [10, 20, 50]);
    const maxVisiblePages = positiveInteger(config.maxVisiblePages, 5);
    const state = {
      page: positiveInteger(config.page, 1),
      pageSize: positiveInteger(config.pageSize, pageSizeOptions[0]),
      total: Math.max(0, Number(config.total) || 0)
    };

    if (!pageSizeOptions.includes(state.pageSize)) pageSizeOptions.unshift(state.pageSize);

    function totalPages() {
      return Math.max(1, Math.ceil(state.total / state.pageSize));
    }

    function normalizePage() {
      state.page = Math.min(totalPages(), Math.max(1, state.page));
    }

    function snapshot(source) {
      normalizePage();
      return {
        page: state.page,
        pageSize: state.pageSize,
        total: state.total,
        totalPages: totalPages(),
        source
      };
    }

    function renderNumeric() {
      const pages = pageButtons(state.page, totalPages(), maxVisiblePages);
      return `
        <span class="page-total">共 ${state.total} 条数据</span>
        <select class="page-size-select" data-pagination-page-size aria-label="每页数量">
          ${pageSizeOptions.map((size) => `<option value="${size}" ${size === state.pageSize ? 'selected' : ''}>${size} 条/页</option>`).join('')}
        </select>
        ${config.showArrows ? `<button class="page-btn page-arrow" type="button" data-pagination-action="previous" aria-label="上一页" ${state.page <= 1 ? 'disabled' : ''}>‹</button>` : ''}
        <div class="page-btns">
          ${pages.map((page) => page === 'ellipsis'
            ? '<span class="page-ellipsis" aria-hidden="true">...</span>'
            : `<button class="page-btn ${page === state.page ? 'active' : ''}" type="button" data-pagination-page="${page}" aria-current="${page === state.page ? 'page' : 'false'}">${page}</button>`
          ).join('')}
        </div>
        ${config.showArrows ? `<button class="page-btn page-arrow" type="button" data-pagination-action="next" aria-label="下一页" ${state.page >= totalPages() ? 'disabled' : ''}>›</button>` : ''}
        <div class="page-jump">
          <span>跳至</span>
          <input class="pagination-jump-input" type="text" value="${state.page}" data-pagination-jump aria-label="跳转页码">
          <span>页</span>
        </div>
      `;
    }

    function renderCompact() {
      const pages = totalPages();
      return `
        <span class="page-total">共 ${state.total} 条数据</span>
        <select class="page-size-select" data-pagination-page-size aria-label="每页条数">
          ${pageSizeOptions.map((size) => `<option value="${size}" ${size === state.pageSize ? 'selected' : ''}>${size} 条/页</option>`).join('')}
        </select>
        <button class="btn btn-sm" type="button" data-pagination-action="previous" ${state.page <= 1 ? 'disabled' : ''}>上一页</button>
        <span>${state.page} / ${pages}</span>
        <button class="btn btn-sm" type="button" data-pagination-action="next" ${state.page >= pages ? 'disabled' : ''}>下一页</button>
        <span>跳至</span>
        <input class="pagination-jump-input" type="text" value="${state.page}" data-pagination-jump aria-label="跳转页码">
      `;
    }

    function render() {
      normalizePage();
      root.innerHTML = mode === 'compact' ? renderCompact() : renderNumeric();
    }

    function notify(source, nextState) {
      state.page = nextState.page;
      if (nextState.pageSize != null) state.pageSize = positiveInteger(nextState.pageSize, state.pageSize);
      normalizePage();
      render();
      if (typeof config.onChange === 'function') config.onChange(snapshot(source));
    }

    function handleClick(event) {
      const pageButton = event.target.closest('[data-pagination-page]');
      if (pageButton && root.contains(pageButton)) {
        notify('page', { page: Number(pageButton.dataset.paginationPage), pageSize: state.pageSize });
        return;
      }
      const actionButton = event.target.closest('[data-pagination-action]');
      if (!actionButton || !root.contains(actionButton) || actionButton.disabled) return;
      const step = actionButton.dataset.paginationAction === 'next' ? 1 : -1;
      notify('page', { page: state.page + step, pageSize: state.pageSize });
    }

    function handleChange(event) {
      if (!event.target.matches('[data-pagination-page-size]')) return;
      notify('page-size', { page: 1, pageSize: Number(event.target.value) });
    }

    function handleKeydown(event) {
      if (!event.target.matches('[data-pagination-jump]') || event.key !== 'Enter') return;
      event.preventDefault();
      notify('jump', { page: Number(event.target.value) || 1, pageSize: state.pageSize });
    }

    root.addEventListener('click', handleClick);
    root.addEventListener('change', handleChange);
    root.addEventListener('keydown', handleKeydown);

    render();

    return {
      update(next = {}) {
        if (next.page != null) state.page = positiveInteger(next.page, state.page);
        if (next.pageSize != null) state.pageSize = positiveInteger(next.pageSize, state.pageSize);
        if (next.total != null) state.total = Math.max(0, Number(next.total) || 0);
        render();
      },
      getState() {
        return snapshot('read');
      },
      destroy() {
        root.removeEventListener('click', handleClick);
        root.removeEventListener('change', handleChange);
        root.removeEventListener('keydown', handleKeydown);
        root.innerHTML = '';
      }
    };
  }

  window.Pagination = { create };
})();
