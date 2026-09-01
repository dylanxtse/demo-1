(function () {
  const service = window.OperationsService;
  const toolbarIcons = {
    'supplier-purchase-print': '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>',
    'supplier-purchase-export': '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12"></path><polyline points="7 10 12 15 17 10"></polyline><path d="M5 21h14"></path></svg>'
  };
  const defaultStatusMap = {
    PENDING: ['待审核', 'warning'],
    PENDING_CONFIRM: ['待确认', 'warning'],
    PENDING_AUDIT: ['待审核', 'warning'],
    READY_FOR_SORTING: ['待分拣', 'info'],
    READY_FOR_SHIPPING: ['待发货', 'warning'],
    APPROVED: ['已审核', 'success'],
    CONFIRMED: ['已确认', 'success'],
    COMPLETED: ['已完成', 'success'],
    CLOSED: ['已关闭', 'danger'],
    DRAFT: ['暂存', 'info'],
    REJECTED: ['已驳回', 'danger'],
    ENABLE: ['启用', 'success'],
    DISABLE: ['禁用', 'danger'],
    SORTED: ['已分拣', 'success'],
    PARTIAL: ['部分完成', 'warning'],
    SHORTAGE: ['缺货', 'danger'],
    SHIPPED: ['已发货', 'success'],
    UPLOADED: ['已上传', 'success']
  };

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function mount(config) {
    const statusMap = { ...defaultStatusMap, ...(config.statusMap || {}) };
    const useDemoListLayout = config.useDemoListLayout === true;
    const usePagination = config.usePagination === true || useDemoListLayout;
    const state = {
      page: 1,
      pageSize: config.pageSize || 20,
      total: 0,
      items: [],
      selected: new Set(),
      condition: {},
      pagination: null,
      activeTab: config.tabs?.[0]?.key,
      activeStatus: config.tabs?.[0]?.statusTabs?.[0]?.value ?? config.statusTabs?.[0]?.value ?? ''
    };
    const renderFilter = (field) => `
      <div class="operations-field">
        <label class="filter-label" for="filter-${field.key}">${field.label}</label>
        ${field.options
          ? `<select class="filter-select" id="filter-${field.key}"><option value="">全部</option>${field.options.map((option) => {
            const value = typeof option === 'string' ? option : option.value;
            const label = typeof option === 'string' ? option : option.label;
            return `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`;
          }).join('')}</select>`
          : field.type === 'dateRange'
            ? `<div class="date-range-picker operations-date-range" id="filter-wrap-${field.key}">
                <input class="filter-input date-range-display" id="filter-${field.key}" type="text" readonly placeholder="${field.placeholder || '请选择日期范围'}">
                <input type="hidden" data-date-start><input type="hidden" data-date-end>
              </div>`
            : field.type === 'date'
              ? `<div class="date-input-control operations-date-control"><input class="filter-input operations-date-input" id="filter-${field.key}" type="text" readonly placeholder="${field.placeholder || '请选择日期'}"><span class="date-range-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></span></div>`
              : `<input class="filter-input" id="filter-${field.key}" type="${field.type || 'text'}" placeholder="${field.placeholder || '请输入'}">`}
      </div>`;
    const filters = config.filters || [];
    const filterHtml = filters.map(renderFilter).join('');
    const primaryFilterHtml = useDemoListLayout ? filterHtml : filters.slice(0, 3).map(renderFilter).join('');
    const advancedFilterHtml = useDemoListLayout ? '' : filters.slice(3).map(renderFilter).join('');
    const toolbarActions = config.toolbar || [];
    const isSideToolbarAction = (action) => action.key === 'export' || action.side === true;
    const isToolbarActionVisible = (action) => !action.visibleStatuses
      || String(state.activeStatus).split(',').some((status) => action.visibleStatuses.includes(status));
    const renderToolbarButton = (action, compact = false) => {
      const buttonClass = compact ? 'btn btn-sm' : 'btn';
      const icon = toolbarIcons[action.icon] || '';
      const options = (action.dropdownOptions || []).filter(isToolbarActionVisible);
      const activeStatus = String(state.activeStatus);
      const effectiveKey = action.defaultActionByStatus?.[activeStatus] || action.key;
      const effectiveLabel = action.labelByStatus?.[activeStatus] || action.label;
      const dropdownVisible = !action.dropdownVisibleStatuses || action.dropdownVisibleStatuses.includes(activeStatus);
      if (!options.length || !dropdownVisible) return `<button class="${buttonClass} ${action.primary ? 'btn-primary' : ''}" type="button" data-toolbar-action="${escapeHtml(effectiveKey)}">${icon}${escapeHtml(effectiveLabel)}</button>`;
      return `<div class="toolbar-dropdown">
        <button class="${buttonClass} toolbar-dropdown-main ${action.primary ? 'btn-primary' : ''}" type="button" data-toolbar-action="${escapeHtml(effectiveKey)}">${icon}${escapeHtml(effectiveLabel)}</button>
        <button class="${buttonClass} toolbar-dropdown-toggle ${action.primary ? 'btn-primary' : ''}" type="button" data-toolbar-dropdown-toggle aria-label="更多操作">▾</button>
        <div class="toolbar-dropdown-menu">${options.map((option) => `<button type="button" data-toolbar-option="${escapeHtml(option.key)}">${escapeHtml(option.label)}</button>`).join('')}</div>
      </div>`;
    };
    const toolbarHtml = toolbarActions.filter((action) => !isSideToolbarAction(action)).map((action) =>
      renderToolbarButton(action, true)
    ).join('');
    const toolbarSideHtml = toolbarActions.filter(isSideToolbarAction).map((action) =>
      renderToolbarButton(action, true)
    ).join('');
    const legacyToolbarHtml = toolbarActions.map((action) =>
      `<button class="btn ${action.primary ? 'btn-primary' : ''}" data-toolbar-action="${action.key}">${action.label}</button>`
    ).join('');
    const standardContent = `
      <section class="page-card operations-page ${escapeHtml(config.pageClass || '')}" aria-label="${escapeHtml(config.title)}">
        ${config.tabs ? `<div class="operations-tabs">${config.tabs.map((tab, index) => `<button class="operations-tab ${index === 0 ? 'active' : ''}" data-view-tab="${tab.key}">${tab.label}</button>`).join('')}</div>` : ''}
        <div class="operations-status-row"><div class="operations-status-tabs" id="recordStatusTabs"></div></div>
        <div class="operations-filter filter-section">
          <div class="operations-filter-main">
            <div class="operations-filter-grid">${primaryFilterHtml}</div>
            <div class="operations-filter-actions">
              ${advancedFilterHtml ? '<button class="operations-filter-toggle" type="button" data-operations-filter-toggle>高级筛选<span class="toggle-arrow">▾</span></button>' : ''}
              <button class="btn btn-primary btn-sm" id="recordQuery">查询</button>
              <button class="btn btn-sm" id="recordReset">重置</button>
            </div>
          </div>
          ${advancedFilterHtml ? `<div class="operations-filter-advanced"><div class="operations-filter-grid">${advancedFilterHtml}</div></div>` : ''}
        </div>
        <div class="operations-toolbar">
          <div class="operations-toolbar-main">${toolbarHtml}</div>
          <div class="operations-toolbar-side">${toolbarSideHtml}</div>
        </div>
        <div class="operations-table-container">
          <div class="operations-table-wrap"><table class="operations-table"><thead id="recordHead"></thead><tbody id="recordBody"></tbody></table></div>
          <div class="${usePagination ? 'pagination' : 'operations-pagination'}" id="recordPagination"></div>
        </div>
      </section>
      <div id="recordOverlay"></div>`;
    const legacyContent = `
      <section class="operations-page" aria-label="${escapeHtml(config.title)}">
        ${config.tabs ? `<div class="operations-tabs">${config.tabs.map((tab, index) => `<button class="operations-tab ${index === 0 ? 'active' : ''}" data-view-tab="${tab.key}">${tab.label}</button>`).join('')}</div>` : ''}
        <div class="operations-status-row"><div class="operations-status-tabs" id="recordStatusTabs"></div></div>
        <div class="operations-filter">
          <div class="operations-filter-grid">${filterHtml}</div>
          <div class="operations-filter-actions"><button class="btn btn-primary" id="recordQuery">查询</button><button class="btn" id="recordReset">重置</button></div>
        </div>
        <div class="operations-toolbar">${legacyToolbarHtml}<span class="toolbar-spacer"></span></div>
        <div class="operations-table-wrap"><table class="operations-table"><thead id="recordHead"></thead><tbody id="recordBody"></tbody></table></div>
        <div class="${usePagination ? 'pagination' : 'operations-pagination'}" id="recordPagination"></div>
      </section>
      <div id="recordOverlay"></div>`;
    const content = config.pageClass ? standardContent : legacyContent;
    const root = window.AppShell.mount({ title: config.title, content });
    const $ = (selector) => root.querySelector(selector);
    const overlay = $('#recordOverlay');
    const datePickers = new Map();

    if (config.categoryTree) {
      const page = root.querySelector('.operations-page');
      const statusRow = page?.querySelector('.operations-status-row');
      const filter = page?.querySelector('.operations-filter');
      const toolbar = page?.querySelector('.operations-toolbar');
      const table = page?.querySelector('.operations-table-container');
      if (page && filter && toolbar && table) {
        const layout = document.createElement('div');
        layout.className = 'record-category-layout';
        const aside = document.createElement('aside');
        aside.className = 'record-category-panel';
        aside.innerHTML = `<div class="record-category-title">商品分类</div><input class="record-category-search" id="recordCategorySearch" placeholder="输入关键字搜索"><div class="record-category-tree" id="recordCategoryTree"></div>`;
        const main = document.createElement('div');
        main.className = 'record-category-main';
        main.append(filter, toolbar, table);
        layout.append(aside, main);
        (statusRow || page).after(layout);
        const renderCategoryTree = (query = '') => {
          const categories = config.categoryTree.filter((item) => !query || item.label.toLowerCase().includes(query.toLowerCase()));
          $('#recordCategoryTree').innerHTML = `<button class="record-category-item active" type="button" data-record-category="">全部</button>${categories.map((item) => `<button class="record-category-item" type="button" data-record-category="${escapeHtml(item.value)}">${escapeHtml(item.label)}</button>`).join('')}`;
        };
        renderCategoryTree();
        $('#recordCategorySearch').addEventListener('input', (event) => renderCategoryTree(event.target.value.trim()));
      }
    }
    if (config.statusActionsInline) {
      const statusRow = root.querySelector('.operations-status-row');
      const filterActions = root.querySelector('.operations-filter-actions');
      if (statusRow && filterActions) {
        statusRow.appendChild(filterActions);
        root.querySelector('.operations-page')?.classList.add('has-inline-status-actions');
      }
    }

    function currentResource() {
      const active = config.tabs?.find((tab) => tab.key === state.activeTab);
      return active?.resource || config.resource;
    }

    function currentTab() {
      return config.tabs?.find((tab) => tab.key === state.activeTab);
    }

    function currentStatusTabs() {
      return currentTab()?.statusTabs || config.statusTabs || [];
    }

    function currentColumns() {
      const active = config.tabs?.find((tab) => tab.key === state.activeTab);
      return active?.columns || config.columns;
    }

    function currentToolbar() {
      const active = config.tabs?.find((tab) => tab.key === state.activeTab);
      const actions = active?.toolbar || config.toolbar || [];
      const activeStatuses = String(state.activeStatus).split(',');
      return actions.filter((action) => !action.visibleStatuses || activeStatuses.some((s) => action.visibleStatuses.includes(s)));
    }

    function currentFormFields() {
      const active = config.tabs?.find((tab) => tab.key === state.activeTab);
      return active?.formFields || config.formFields || [];
    }

    function currentCreateDefaults() {
      const active = config.tabs?.find((tab) => tab.key === state.activeTab);
      return active?.createDefaults || config.createDefaults || {};
    }

    function currentEntityTitle() {
      const active = config.tabs?.find((tab) => tab.key === state.activeTab);
      return active?.entityTitle || config.title;
    }

    function currentActions(item) {
      const active = config.tabs?.find((tab) => tab.key === state.activeTab);
      const actions = active?.rowActions || config.rowActions || [];
      return actions.filter((action) => {
        if (action.visibleFn) return action.visibleFn(item);
        if (action.visible) return action.visible.includes(item.status);
        return true;
      });
    }

    function isSelectable(item) {
      const active = currentTab();
      const predicate = active?.selectableWhen || config.selectableWhen;
      return predicate ? Boolean(predicate(item)) : true;
    }

    function toast(message, type = '') {
      root.querySelector('.operations-toast')?.remove();
      const element = document.createElement('div');
      element.className = `operations-toast ${type}`;
      element.textContent = message;
      root.appendChild(element);
      window.setTimeout(() => element.remove(), 2200);
    }

    function formatCell(item, column) {
      if (column.render) return column.render(item);
      if (column.productDisplay) {
        const display = window.DomUtils?.formatProductDisplay?.(item) || item[column.key] || '--';
        return `<span class="product-display-text" title="${escapeHtml(display)}">${escapeHtml(display)}</span>`;
      }
      const value = item[column.key];
      if (column.editableNumber) {
        const inputValue = column.blankZero && Number(value || 0) === 0 ? '' : (value ?? '');
        return `<input class="quantity-input record-inline-input" data-inline-field="${column.key}" type="number" min="0" value="${escapeHtml(inputValue)}" placeholder="${escapeHtml(column.placeholder || '请输入')}" aria-label="${escapeHtml(column.label)}">`;
      }
      if (column.format === 'money') return Number(value || 0).toFixed(2);
      if (column.format === 'decimal') return Number(value || 0).toFixed(2);
      if (column.format === 'status') {
        const status = statusMap[value]
          || [window.BusinessRules?.statusLabel(currentResource(), value) || value || '--', ''];
        return `<span class="operation-status ${status[1]}">${escapeHtml(status[0])}</span>`;
      }
      if (column.format === 'signed') return `${Number(value || 0) > 0 ? '+' : ''}${value ?? 0}`;
      return escapeHtml(value === '' || value == null ? '--' : value);
    }

    function renderHead() {
      const showSequence = config.hideSequence !== true;
      const showActions = config.hideRowActions !== true;
      const selectionHeader = config.selectable === false
        ? ''
        : '<th><input type="checkbox" id="recordSelectAll" aria-label="选择全部"></th>';
      if (Array.isArray(config.headerRows) && config.headerRows.length) {
        const rows = config.headerRows;
        const selection = selectionHeader ? selectionHeader.replace('<th', `<th rowspan="${rows.length}"`) : '';
        const sequence = showSequence ? `<th rowspan="${rows.length}">序号</th>` : '';
        const actions = showActions ? `<th rowspan="${rows.length}">操作</th>` : '';
        $('#recordHead').innerHTML = rows.map((row, rowIndex) => `<tr>
          ${rowIndex === 0 ? `${selection}${sequence}` : ''}
          ${row.map((header) => `<th${header.rowspan ? ` rowspan="${header.rowspan}"` : ''}${header.colspan ? ` colspan="${header.colspan}"` : ''}>${escapeHtml(header.label)}</th>`).join('')}
          ${rowIndex === 0 ? actions : ''}
        </tr>`).join('');
        return;
      }
      $('#recordHead').innerHTML = `<tr>
        ${selectionHeader}
        ${showSequence ? '<th>序号</th>' : ''}${currentColumns().map((column) => `<th>${column.label}</th>`).join('')}${showActions ? '<th>操作</th>' : ''}
      </tr>`;
    }

    function renderStatusTabs() {
      const container = $('#recordStatusTabs');
      if (!container) return;
      const tabs = currentStatusTabs();
      container.hidden = tabs.length === 0;
      container.innerHTML = tabs.map((tab) => `
        <button class="operations-status-tab ${String(tab.value) === String(state.activeStatus) ? 'active' : ''}" type="button" data-status-tab="${escapeHtml(tab.value)}">${escapeHtml(tab.label)}</button>
      `).join('');
    }

    function renderBody() {
      const columns = currentColumns();
      const showSequence = config.hideSequence !== true;
      const showActions = config.hideRowActions !== true;
      if (!state.items.length) {
        const extraColumns = (config.selectable === false ? 0 : 1) + (showSequence ? 1 : 0) + (showActions ? 1 : 0);
        $('#recordBody').innerHTML = `<tr><td class="empty-cell" colspan="${columns.length + extraColumns}">暂无数据</td></tr>`;
        return;
      }
      $('#recordBody').innerHTML = state.items.map((item, index) => {
        const actions = showActions ? currentActions(item) : [];
        return `<tr data-id="${escapeHtml(item.id)}">
          ${config.selectable !== false ? `<td><input type="checkbox" class="record-row-select" aria-label="选择数据" ${state.selected.has(item.id) ? 'checked' : ''} ${isSelectable(item) ? '' : 'disabled'}></td>` : ''}
          ${showSequence ? `<td>${(state.page - 1) * state.pageSize + index + 1}</td>` : ''}
          ${columns.map((column) => {
            const cell = formatCell(item, column);
            if (column.href) {
              const href = typeof column.href === 'function' ? column.href(item) : column.href;
              return `<td><button class="cell-link" type="button" data-cell-href="${escapeHtml(href)}" onclick="window.AppNavigation.navigate(this.dataset.cellHref)">${cell}</button></td>`;
            }
            return `<td>${column.link ? `<button class="cell-link" data-row-action="view">${cell}</button>` : cell}</td>`;
          }).join('')}
          ${showActions ? `<td><div class="cell-actions${usePagination ? ' operation-actions' : ''}">${actions.map((action, actionIndex) => {
            const isDisabled = action.disabled && action.disabled(item);
            return `${usePagination && actionIndex ? '' : (!usePagination && actionIndex ? '<span class="divider">|</span>' : '')}<button class="btn-text ${action.danger ? 'danger' : ''}" data-row-action="${action.key}"${isDisabled ? ' disabled' : ''}>${action.label}</button>`;
          }).join('') || '--'}</div></td>` : ''}
        </tr>`;
      }).join('');
    }

    function renderPagination() {
      if (usePagination) {
        state.pagination?.update({ page: state.page, pageSize: state.pageSize, total: state.total });
        return;
      }
      const pages = Math.max(1, Math.ceil(state.total / state.pageSize));
      $('#recordPagination').innerHTML = `
        <span>共 ${state.total} 条数据</span>
        <select id="recordPageSize" aria-label="每页条数">${[10, 20, 50].map((size) => `<option value="${size}" ${size === state.pageSize ? 'selected' : ''}>${size} 条/页</option>`).join('')}</select>
        <button class="btn btn-sm" id="recordPrev" ${state.page <= 1 ? 'disabled' : ''}>上一页</button>
        <span>${state.page} / ${pages}</span>
        <button class="btn btn-sm" id="recordNext" ${state.page >= pages ? 'disabled' : ''}>下一页</button>
        <span>跳至</span><input id="recordJump" aria-label="跳转页码" value="${state.page}">`;
    }

    function renderToolbar() {
      const actions = currentToolbar();
      const main = root.querySelector('.operations-toolbar-main');
      const side = root.querySelector('.operations-toolbar-side');
      if (!main || !side) return;
      const isSideToolbarAction = (action) => action.key === 'export' || action.side === true;
      main.innerHTML = actions.filter((action) => !isSideToolbarAction(action)).map((action) =>
        renderToolbarButton(action)
      ).join('');
      side.innerHTML = `${actions.filter(isSideToolbarAction).map((action) =>
        renderToolbarButton(action)
      ).join('')}`;
    }

    function updateSelection() {
      const all = $('#recordSelectAll');
      if (all) {
        all.checked = state.items.length > 0 && state.items.every((item) => state.selected.has(item.id));
        all.indeterminate = !all.checked && state.items.some((item) => state.selected.has(item.id));
      }
    }

    function collectCondition() {
      const condition = {};
      (config.filters || []).forEach((field) => {
        if (field.type === 'dateRange') {
          const value = datePickers.get(field.key)?.getValue();
          if (value?.startDate || value?.endDate) condition[field.conditionKey || field.key] = [value.startDate, value.endDate];
          return;
        }
        const value = $(`#filter-${field.key}`).value.trim();
        if (value) condition[field.key] = value;
      });
      return condition;
    }

    async function load() {
      try {
        const condition = { ...state.condition };
        if (currentStatusTabs().length) {
          if (state.activeStatus) {
            const statuses = String(state.activeStatus).split(',');
            condition.status = statuses.length > 1 ? statuses : state.activeStatus;
          } else delete condition.status;
        }
        const result = await service.list(currentResource(), { page: state.page, pageSize: state.pageSize, condition });
        state.items = result.items;
        state.total = result.total;
      } catch (error) {
        state.items = [];
        state.total = 0;
        toast(error.message || '数据加载失败', 'error');
      }
      if (!root.isConnected) return;
      renderHead();
      renderStatusTabs();
      renderBody();
      renderToolbar();
      renderPagination();
      updateSelection();
    }

    function closeModal() {
      overlay.innerHTML = '';
    }

    function modal(title, body, footer, detail = false, variant = '') {
      overlay.innerHTML = `<div class="operations-modal-backdrop"><section class="operations-modal ${detail ? 'is-detail' : ''} ${variant}" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
        <header class="operations-modal-header"><h3>${escapeHtml(title)}</h3><button data-record-close aria-label="关闭">×</button></header>
        <div class="operations-modal-body">${body}</div><footer class="operations-modal-footer">${footer}</footer>
      </section></div>`;
    }

    function showDetail(item) {
      const columns = config.detailColumns || currentColumns();
      const detailTitle = typeof config.detailTitle === 'function'
        ? config.detailTitle(item)
        : (config.detailTitle || `${currentEntityTitle()}详情`);
      const detailClass = config.detailLayout === 'single' ? ' single-column' : '';
      modal(detailTitle, `<dl class="operations-detail-grid${detailClass}">${columns.map((column) =>
        `<div class="operations-detail-item"><dt>${column.label}</dt><dd>${formatCell(item, column)}</dd></div>`
      ).join('')}</dl>`, '<button class="btn btn-primary" data-record-close>关闭</button>', true, config.detailModalClass || '');
    }

    async function showRelatedDetail(item, action) {
      const matchKey = action.matchKey || 'customerName';
      const sourceKey = action.sourceKey || matchKey;
      const result = await service.list(action.detailResource || currentResource(), {
        page: 1,
        pageSize: 100,
        condition: { [matchKey]: item[sourceKey] }
      });
      const columns = action.detailColumns || currentColumns();
      const heading = action.detailHeading
        ? action.detailHeading(item)
        : `${action.label || '详情'}：${item[sourceKey] || '--'}`;
      const table = `<div class="operations-related-heading">${escapeHtml(heading)}</div>
        <div class="operations-related-table-wrap"><table class="operations-table operations-related-table">
          <thead><tr>${columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join('')}</tr></thead>
          <tbody>${result.items.length ? result.items.map((row) => `<tr>${columns.map((column) => `<td>${formatCell(row, column)}</td>`).join('')}</tr>`).join('') : `<tr><td class="empty-cell" colspan="${columns.length}">暂无数据</td></tr>`}</tbody>
        </table></div>`;
      modal(action.detailTitle || `${currentEntityTitle()}详情`, table, '<button class="btn btn-primary" data-record-close>关闭</button>', true);
    }

    function formControl(field, item) {
      const defaultValue = typeof field.defaultValue === 'function' ? field.defaultValue(item) : field.defaultValue;
      let value = item?.[field.key] ?? defaultValue ?? '';
      if (field.type === 'datetime-local') value = String(value).replace(' ', 'T');
      const selectedValues = Array.isArray(value) ? value.map(String) : (value === '' ? [] : [String(value)]);
      const input = field.options
        ? field.multiple
          ? `<div class="operations-multi-select" role="group" aria-label="${escapeHtml(field.label)}">${field.options.map((option) => {
            const optionValue = typeof option === 'string' ? option : option.value;
            const optionLabel = typeof option === 'string' ? option : option.label;
            return `<label class="operations-multi-option"><input type="checkbox" name="${escapeHtml(field.key)}" value="${escapeHtml(optionValue)}" ${selectedValues.includes(String(optionValue)) ? 'checked' : ''}><span>${escapeHtml(optionLabel)}</span></label>`;
          }).join('')}</div>`
          : `<select name="${field.key}"><option value="">请选择</option>${field.options.map((option) => {
          const optionValue = typeof option === 'string' ? option : option.value;
          const optionLabel = typeof option === 'string' ? option : option.label;
          return `<option value="${escapeHtml(optionValue)}" ${selectedValues.includes(String(optionValue)) ? 'selected' : ''}>${escapeHtml(optionLabel)}</option>`;
        }).join('')}</select>`
        : field.type === 'textarea'
          ? `<textarea name="${field.key}" placeholder="请输入">${escapeHtml(value)}</textarea>`
          : `<input name="${field.key}" type="${field.type || 'text'}" value="${escapeHtml(value)}" placeholder="${field.placeholder || '请输入'}"${field.readonly ? ' readonly' : ''}>`;
      const itemClass = ['operations-form-item', field.required ? 'required' : '', field.fullRow ? 'full-row' : '']
        .filter(Boolean)
        .join(' ');
      return `<div class="${itemClass}"><label>${field.label}</label><div class="operations-form-control">${input}<div class="operations-field-error"></div></div></div>`;
    }

    function showForm(item, overrideFields, overrideTitle) {
      const fields = overrideFields || currentFormFields();
      modal(overrideTitle || (item ? `编辑${currentEntityTitle()}` : `添加${currentEntityTitle()}`),
        `<form id="recordForm"><div class="operations-form-grid">${fields.map((field) => formControl(field, item)).join('')}</div></form>`,
        '<button class="btn" data-record-close>取消</button><button class="btn btn-primary" id="recordSave">保存</button>'
      );
      $('#recordSave').onclick = async () => {
        const form = $('#recordForm');
        const data = {};
        fields.forEach((field) => {
          if (field.multiple) {
            data[field.key] = [...form.querySelectorAll(`[name="${field.key}"]`)]
              .filter((control) => control.checked)
              .map((control) => control.value);
          } else {
            const control = form.elements[field.key];
            data[field.key] = control?.value ?? '';
          }
        });
        fields.forEach((field) => {
          if (field.type === 'number') data[field.key] = Number(data[field.key]);
          if (field.type === 'datetime-local') data[field.key] = data[field.key].replace('T', ' ');
        });
        const missing = fields.find((field) => field.required && (
          data[field.key] === '' || data[field.key] == null || (field.multiple && !data[field.key].length)
        ));
        if (missing) {
          const fieldControl = missing.multiple
            ? form.querySelector(`[name="${missing.key}"]`)?.closest('.operations-multi-select')
            : form.elements[missing.key];
          const errorElement = fieldControl?.closest('.operations-form-control')?.querySelector('.operations-field-error');
          if (errorElement) errorElement.textContent = '此项必填';
          return;
        }
        try {
          if (item) await service.update(currentResource(), item.id, data);
          else await service.create(currentResource(), { ...currentCreateDefaults(), ...data });
          closeModal();
          toast('操作成功');
          state.page = 1;
          await load();
        } catch (error) {
          toast(error.message || '保存失败', 'error');
        }
      };
    }

    function showBatchForm(action) {
      const fields = action.formFields || [];
      modal(action.formTitle || action.label,
        `<form id="recordForm"><div class="operations-form-grid">${fields.map((field) => formControl(field)).join('')}</div></form>`,
        '<button class="btn" data-record-close>取消</button><button class="btn btn-primary" id="recordSave">保存</button>'
      );
      $('#recordSave').onclick = async () => {
        const ids = [...state.selected];
        if (!ids.length) return toast('请选择要操作的数据', 'error');
        const form = $('#recordForm');
        const data = Object.fromEntries(new FormData(form).entries());
        fields.forEach((field) => {
          if (field.type === 'number') data[field.key] = Number(data[field.key]);
        });
        const missing = fields.find((field) => field.required && (data[field.key] === '' || data[field.key] == null));
        if (missing) {
          form.elements[missing.key].closest('.operations-form-control').querySelector('.operations-field-error').textContent = '此项必填';
          return;
        }
        try {
          for (const id of ids) await service.update(currentResource(), id, data);
          state.selected.clear();
          closeModal();
          toast('操作成功');
          await load();
        } catch (error) {
          toast(error.message || '保存失败', 'error');
        }
      };
    }

    function confirm(title, message, callback) {
      modal(title, `<p style="margin:0;text-align:center;color:var(--text-secondary)">${escapeHtml(message)}</p>`,
        '<button class="btn" data-record-close>取消</button><button class="btn btn-primary" id="recordConfirm">确定</button>',
        false, 'is-confirm');
      $('#recordConfirm').onclick = async () => {
        try {
          await callback();
          closeModal();
          toast('操作成功');
          await load();
        } catch (error) {
          toast(error.message || '操作失败', 'error');
        }
      };
    }

    async function exportRows() {
      const csv = await service.export(currentResource(), { condition: state.condition }, currentColumns());
      const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${config.title}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast('导出成功');
    }

    async function rowAction(actionKey, id) {
      const item = await service.get(currentResource(), id);
      if (!item) return toast('记录不存在或已删除', 'error');
      if (actionKey === 'view') {
        const detailHref = currentTab()?.detailHref || config.detailHref;
        if (detailHref) {
          window.AppNavigation?.navigate?.(typeof detailHref === 'function' ? detailHref(item) : detailHref);
          return;
        }
        return showDetail(item);
      }
      if (actionKey === 'edit') {
        const editHref = currentTab()?.editHref || config.editHref;
        if (editHref) {
          window.AppNavigation?.navigate?.(typeof editHref === 'function' ? editHref(item) : editHref);
          return;
        }
        return showForm(item);
      }
      if (actionKey === 'delete') return confirm(`删除${currentEntityTitle()}`, config.deleteMessage || '删除之后将不能恢复，确认删除吗？', () => service.remove(currentResource(), id));
      const action = currentActions(item).find((entry) => entry.key === actionKey);
      if (!action) return;
      if (action.href) {
        const target = typeof action.href === 'function' ? action.href(item) : action.href;
        window.AppNavigation?.navigate?.(target);
        return;
      }
      if (action.detailResource || action.detailColumns) return showRelatedDetail(item, action);
      if (action.key === 'copy') {
        return confirm(`复制${currentEntityTitle()}`, action.message || `是否要复制该${currentEntityTitle()}？`, async () => {
          const copied = { ...item, status: currentCreateDefaults().status || 'PENDING' };
          delete copied.id;
          delete copied.createdAt;
          await service.create(currentResource(), copied);
        });
      }
      if (action.formFields) return showForm(item, action.formFields, action.formTitle);
      if (action.transition) {
        return confirm(action.confirmTitle || action.label, action.message || `确定执行“${action.label}”操作吗？`,
          () => service.transition(currentResource(), id, action.transition, action.payload || {}));
      }
      if (action.toast) return toast(action.toast);
    }

    function findToolbarAction(actionKey) {
      return currentToolbar().flatMap((entry) => [entry, ...(entry.dropdownOptions || [])]).find((entry) => entry.key === actionKey);
    }

    async function toolbarAction(actionKey) {
      const action = findToolbarAction(actionKey);
      if (!action) return;
      if (action.key === 'add') {
        const addHref = currentTab()?.addHref || config.addHref;
        if (addHref) {
          window.AppNavigation?.navigate?.(typeof addHref === 'function' ? addHref() : addHref);
          return;
        }
        return showForm();
      }
      if (action.requiresSelection || action.validateSelection) {
        const selectedItems = state.items.filter((item) => state.selected.has(item.id));
        if (action.requiresSelection && !selectedItems.length) return toast('请选择要操作的数据', 'error');
        const message = action.validateSelection?.(selectedItems);
        if (message) return toast(message, 'error');
      }
      if (action.key === 'export') return exportRows();
      if (action.batchUpdate && action.formFields) return showBatchForm(action);
      if (action.batchTransition) {
        return confirm(action.label, action.message || `确定执行“${action.label}”操作吗？`, async () => {
          const ids = [...state.selected];
          if (!ids.length) throw new Error('请选择要操作的数据');
          if (action.validateSelection) {
            const selectedItems = state.items.filter((item) => state.selected.has(item.id));
            const message = action.validateSelection(selectedItems);
            if (message) throw new Error(message);
          }
          await service.batch(currentResource(), ids, action.batchTransition, action.payload || {});
          state.selected.clear();
        });
      }
      if (action.toast) return toast(action.toast);
    }

    root.addEventListener('click', (event) => {
      if (event.target.closest('[data-record-close]')) return closeModal();
      const filterToggle = event.target.closest('[data-operations-filter-toggle]');
      if (filterToggle) {
        const expanded = filterToggle.classList.toggle('is-active');
        root.querySelector('.operations-filter-advanced')?.classList.toggle('is-visible', expanded);
        return;
      }
      const categoryButton = event.target.closest('[data-record-category]');
      if (categoryButton) {
        root.querySelectorAll('.record-category-item').forEach((element) => element.classList.toggle('active', element === categoryButton));
        state.condition.category = categoryButton.dataset.recordCategory;
        if (!state.condition.category) delete state.condition.category;
        state.page = 1;
        state.selected.clear();
        return load();
      }
      const dropdownToggle = event.target.closest('[data-toolbar-dropdown-toggle]');
      if (dropdownToggle) {
        const dropdown = dropdownToggle.closest('.toolbar-dropdown');
        root.querySelectorAll('.toolbar-dropdown.is-open').forEach((element) => { if (element !== dropdown) element.classList.remove('is-open'); });
        dropdown?.classList.toggle('is-open');
        return;
      }
      const dropdownOption = event.target.closest('[data-toolbar-option]');
      if (dropdownOption) {
        dropdownOption.closest('.toolbar-dropdown')?.classList.remove('is-open');
        return toolbarAction(dropdownOption.dataset.toolbarOption);
      }
      const cellLink = event.target.closest('[data-cell-href]');
      if (cellLink) {
        window.AppNavigation?.navigate?.(cellLink.dataset.cellHref);
        return;
      }
      const rowButton = event.target.closest('[data-row-action]');
      if (rowButton) return rowAction(rowButton.dataset.rowAction, rowButton.closest('tr').dataset.id);
      const toolbarButton = event.target.closest('[data-toolbar-action]');
      if (toolbarButton) return toolbarAction(toolbarButton.dataset.toolbarAction);
      const tabButton = event.target.closest('[data-view-tab]');
      if (tabButton) {
        state.activeTab = tabButton.dataset.viewTab;
        state.activeStatus = currentStatusTabs()[0]?.value ?? '';
        root.querySelectorAll('.operations-tab').forEach((element) => element.classList.toggle('active', element === tabButton));
        state.page = 1;
        state.selected.clear();
        return load();
      }
      const statusButton = event.target.closest('[data-status-tab]');
      if (statusButton) {
        state.activeStatus = statusButton.dataset.statusTab;
        state.page = 1;
        state.selected.clear();
        return load();
      }
      if (event.target.id === 'recordQuery') {
        state.condition = collectCondition();
        if (state.activeStatus) {
          const statuses = String(state.activeStatus).split(',');
          state.condition.status = statuses.length > 1 ? statuses : state.activeStatus;
        }
        state.page = 1;
        state.selected.clear();
        return load();
      }
      if (event.target.id === 'recordReset') {
        root.querySelectorAll('.operations-filter input,.operations-filter select').forEach((element) => { element.value = ''; });
        datePickers.forEach((picker) => picker.clear(false));
        state.condition = {};
        if (state.activeStatus) {
          const statuses = String(state.activeStatus).split(',');
          state.condition.status = statuses.length > 1 ? statuses : state.activeStatus;
        }
        state.page = 1;
        state.selected.clear();
        return load();
      }
      if (event.target.id === 'recordPrev' && state.page > 1) {
        state.page -= 1;
        return load();
      }
      if (event.target.id === 'recordNext' && state.page < Math.ceil(state.total / state.pageSize)) {
        state.page += 1;
        return load();
      }
    });

    root.addEventListener('change', (event) => {
      if (event.target.classList.contains('record-inline-input')) {
        const id = event.target.closest('tr[data-id]')?.dataset.id;
        const field = event.target.dataset.inlineField;
        const value = Number(event.target.value);
        if (value < 0 || !Number.isFinite(value)) {
          toast('不能输入0或负数', 'error');
          event.target.value = 0;
          return;
        }
        service.update(currentResource(), id, { [field]: value })
          .then(() => toast('操作成功'))
          .catch((error) => toast(error.message || '保存失败', 'error'));
        return;
      }
      if (event.target.id === 'recordSelectAll') {
        state.items.filter(isSelectable).forEach((item) => event.target.checked ? state.selected.add(item.id) : state.selected.delete(item.id));
        renderBody();
        updateSelection();
      }
      if (event.target.classList.contains('record-row-select')) {
        const id = event.target.closest('tr').dataset.id;
        event.target.checked ? state.selected.add(id) : state.selected.delete(id);
        updateSelection();
      }
      if (event.target.id === 'recordPageSize') {
        state.pageSize = Number(event.target.value);
        state.page = 1;
        load();
      }
    });

    root.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && event.target.id === 'recordJump') {
        state.page = Math.min(Math.max(1, Math.ceil(state.total / state.pageSize)), Math.max(1, Number(event.target.value) || 1));
        load();
      }
      if (event.key === 'Enter' && event.target.closest('.operations-filter')) {
        state.condition = collectCondition();
        if (state.activeStatus) state.condition.status = state.activeStatus;
        state.page = 1;
        load();
      }
      if (event.key === 'Escape' && overlay.innerHTML) closeModal();
    });

    if (usePagination && window.Pagination?.create) {
      state.pagination = window.Pagination.create({
        container: '#recordPagination',
        page: state.page,
        pageSize: state.pageSize,
        total: state.total,
        pageSizeOptions: [10, 20, 50],
        onChange: ({ page, pageSize }) => {
          state.page = page;
          state.pageSize = pageSize;
          return load();
        }
      });
    }

    (config.filters || []).filter((field) => field.type === 'date').forEach((field) => {
      const input = $(`#filter-${field.key}`);
      if (input && window.DatePicker) datePickers.set(field.key, window.DatePicker.create({ input }));
    });
    (config.filters || []).filter((field) => field.type === 'dateRange').forEach((field) => {
      const container = $(`#filter-wrap-${field.key}`);
      if (container && window.DateRangePicker) datePickers.set(field.key, window.DateRangePicker.create({ container }));
    });
    load();
    return { load, state };
  }

  window.RecordPage = { mount };
  if (window.RecordPageConfig) mount(window.RecordPageConfig);
})();
