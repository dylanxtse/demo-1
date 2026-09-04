(function () {
  if (document.querySelector('link[data-common-business-components]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './assets/css/common-components.css?v=20260903-back-normalize-1';
  link.dataset.commonBusinessComponents = 'true';
  document.head.appendChild(link);
})();

/* 工具包显示状态：当前项目只启用空工具容器，不加载任何旧项目数据。 */
(function () {
  const styleAttribute = 'data-prototype-tools-display-style';
  const setVisible = (visible) => {
    const nextVisible = Boolean(visible);
    window.PrototypeToolsConfig = {
      ...(window.PrototypeToolsConfig || {}),
      displayEnabled: nextVisible
    };

    let style = document.head?.querySelector(`style[${styleAttribute}]`);
    if (nextVisible) {
      style?.remove();
    } else if (!style) {
      style = document.createElement('style');
      style.setAttribute(styleAttribute, '');
      style.textContent = `
        .record-annotation-overlay,
        .project-iteration-panel-root {
          display: none !important;
        }
      `;
      (document.head || document.documentElement).appendChild(style);
    }

    document.documentElement.dataset.prototypeToolsDisplay = nextVisible ? 'visible' : 'hidden';
    window.dispatchEvent(new CustomEvent('prototype-tools-display-change', {
      detail: { visible: nextVisible }
    }));
    return nextVisible;
  };

  window.PrototypeToolsDisplay = {
    get visible() {
      return window.PrototypeToolsConfig?.displayEnabled === true;
    },
    setVisible,
    show: () => setVisible(true),
    hide: () => setVisible(false)
  };

  setVisible(true);

  const annotationHiddenStyle = document.createElement('style');
  annotationHiddenStyle.dataset.prototypeToolsAnnotationHidden = 'true';
  annotationHiddenStyle.textContent = `
    .record-annotation-overlay,
    .record-annotation-marker,
    .record-annotation-mode-toggle,
    .project-iteration-annotation-visibility-toggle,
    .project-iteration-annotation-mode-host {
      display: none !important;
    }
  `;
  document.head.appendChild(annotationHiddenStyle);
})();

/*
 * 多端导航底层约束：
 * 1. 先按页面所属端识别目标文件；
 * 2. 同一端内的菜单、页签和业务按钮正常跳转；
 * 3. 跨端跳转只有带有明确切换标识的按钮可以放行。
 * 新增用户端页面时，需要把页面文件名补充到对应 routes 中。
 */
(function () {
  const routes = {
    enterprise: new Set([
      'index.html',
      'warehouse-monitor.html',
      'warehouse-export-template.html',
      'purchase-task.html',
      'purchase-task-allocation-detail.html',
      'purchase-task-allocation.html',
      'purchase-order.html',
      'purchase-order-detail.html',
      'purchase-order-form.html',
      'purchase-order-receipt.html'
    ]),
    education: new Set([
      'education.html',
      'auction-limit-price.html',
      'auction-limit-price-form.html',
      'bid-management.html',
      'bid-management-detail.html',
      'bid-management-form.html',
      'bid-rules-management.html',
      'bid-rules-form.html',
      'segment-management.html',
      'supplier-archive.html',
      'supplier-editor.html',
      'supplier-relationship-management.html',
      'wasted-bid-management.html',
      'notice-management.html'
    ]),
    supplier: new Set(['supplier-product-management.html', 'supplier-purchase-order.html', 'supplier-bidding-quotation.html', 'supplier-bid-detail.html', 'supplier-bidding-quotation-form.html', 'supplier-notice-management.html', 'supplier-invite.html', 'supplier-export-template.html']),
    operations: new Set([
      'operations.html',
      'operations-education-management.html',
      'operations-enterprise-management.html',
      'operations-school-management.html'
    ]),
    school: new Set([
      'school.html',
      'school-product-management.html',
      'school-order-management.html',
      'school-order-form.html',
      'school-order-detail.html',
      'school-order-acceptance.html',
      'school-order-accept.html',
      'school-recipe-center.html',
      'school-recipe-attendance.html',
      'school-recipe-demand-confirm.html',
      'school-recipe-demand-records.html',
      'school-recipe-demand-record-detail.html',
      'school-canteen-management.html',
      'school-canteen-form.html',
      'school-purchase-reconciliation.html',
      'school-purchase-accounts.html',
      'school-notice-management.html'
    ])
  };
  const switchRoutes = {
    enterprise: './index.html',
    education: './education.html',
    supplier: './supplier-bidding-quotation.html',
    operations: './operations.html',
    school: './school-product-management.html'
  };
  const switchSelectors = '[data-shell-switch], [data-user-end-switch], [data-platform-switch]';
  let mountedVariant = '';

  function fileNameFromPath(pathname) {
    return String(pathname || '').split('/').pop() || 'index.html';
  }

  function variantFromFile(fileName) {
    for (const [variant, files] of Object.entries(routes)) {
      if (files.has(fileName)) return variant;
    }
    // 未特别登记的项目页面按企业端处理，避免教育局/供应商/学校端误跳入企业页面。
    return fileName.endsWith('.html') ? 'enterprise' : '';
  }

  function variantFromUrl(url) {
    const explicitVariant = url?.searchParams?.get('from') || url?.searchParams?.get('userEnd');
    if (explicitVariant && routes[explicitVariant]) return explicitVariant;
    return variantFromFile(fileNameFromPath(url?.pathname));
  }

  function currentVariant() {
    return mountedVariant
      || document.querySelector('.app-layout[data-user-end]')?.dataset.userEnd
      || variantFromFile(fileNameFromPath(window.location.pathname));
  }

  function resolveTarget(url) {
    if (!url || /^(#|mailto:|tel:|javascript:)/i.test(String(url).trim())) return null;
    try {
      const resolved = new URL(url, document.baseURI || window.location.href);
      if (resolved.origin !== window.location.origin && resolved.protocol !== 'file:') return null;
      return resolved;
    } catch (error) {
      return null;
    }
  }

  function isCrossEnd(url) {
    const target = resolveTarget(url);
    if (!target) return false;
    const targetVariant = variantFromUrl(target);
    const sourceVariant = currentVariant();
    return Boolean(targetVariant && sourceVariant && targetVariant !== sourceVariant);
  }

  function allowedSwitchTrigger(element) {
    return Boolean(element?.closest(switchSelectors));
  }

  function navigationTarget(element) {
    if (!element) return '';
    return element.getAttribute('href')
      || element.dataset.menuLink
      || element.dataset.dashboardLink
      || element.dataset.cellHref
      || element.dataset.navigationTarget
      || '';
  }

  function block(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  function navigate(url, { allowCrossEnd = false } = {}) {
    if (!allowCrossEnd && isCrossEnd(url)) {
      return false;
    }
    window.location.href = url;
    return true;
  }

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element
      ? event.target.closest('a, button, [role="button"], [data-menu-link], [data-dashboard-link], [data-cell-href], [data-navigation-target]')
      : null;
    if (!target || allowedSwitchTrigger(target)) return;
    const href = navigationTarget(target);
    if (href && isCrossEnd(href)) block(event);
  }, true);

  document.addEventListener('submit', (event) => {
    const form = event.target instanceof HTMLFormElement ? event.target : null;
    const action = form?.getAttribute('action');
    if (form && !allowedSwitchTrigger(form) && action && isCrossEnd(action)) block(event);
  }, true);

  window.AppNavigationGuard = {
    setCurrentVariant(variant) {
      mountedVariant = variant || '';
    },
    isCrossEnd,
    navigate,
    switchTo(variant) {
      const target = switchRoutes[variant];
      return target ? navigate(target, { allowCrossEnd: true }) : false;
    }
  };
})();

/*
 * 项目级查询区布局约束：
 * 1. 查询条件默认最多展示两行；
 * 2. 超过两行时，将溢出条件折叠，并在“查询”按钮左侧显示“高级查询”；
 * 3. 状态卡片、快捷页签等切换控件不计入查询条件；
 * 4. 这里只处理业务页面 DOM，不依赖标注或迭代记录工具包。
 */
(function () {
  const scopeSelector = [
    '.operations-filter',
    '.filter-section',
    '.bidding-filter-panel',
    '.price-query-panel',
    '.lower-units-filter',
    '.supplier-quotation-filters',
    '.operations-admin-filters',
    '.school-product-filters',
    '.school-order-filter',
    '.order-processing-query'
  ].join(',');
  const fieldHostSelector = [
    '[data-operations-filter-grid]',
    '.operations-filter-grid',
    '.filter-fields',
    '.filter-advanced-grid',
    '.bidding-filter-grid',
    '.price-filter-fields',
    '.lower-units-filter-main',
    '.supplier-filter-fields',
    '.sorting-customer-filter-grid',
    '.school-order-filter-grid',
    '.order-processing-context'
  ].join(',');
  const fieldSelector = [
    '.operations-field',
    '.filter-group',
    '.bidding-filter-item',
    '.price-filter-group',
    '.lower-units-filter-item',
    '.supplier-filter-item',
    '.operations-admin-region-filter',
    '.operations-admin-keyword',
    '.school-product-filters > label',
    '.basic-info-field'
  ].join(',');
  const actionSelector = [
    '.operations-filter-actions',
    '.action-controls',
    '.bidding-filter-actions',
    '.price-filter-actions',
    '.lower-units-filter-actions',
    '.supplier-filter-actions',
    '.operations-admin-filter-actions',
    '.school-product-filter-actions'
  ].join(',');
  const advancedPanelSelector = '.operations-filter-advanced, .filter-advanced';
  const oldToggleSelector = [
    '[data-operations-filter-toggle]',
    '#goodsAdvancedToggle',
    '[data-action="toggle-advanced"]',
    '.filter-advanced-toggle'
  ].join(',');
  const excludedSelector = [
    '[role="dialog"]',
    '[aria-modal="true"]',
    '.operations-modal',
    '.bidding-dialog',
    '.lower-units-dialog',
    '.price-import-dialog',
    '.price-detail-dialog',
    '#recordOverlay'
  ].join(',');
  const mountedScopes = new Set();
  const toggleScopes = new WeakMap();
  let resizeBound = false;

  function normalizedText(element) {
    return String(element?.textContent || element?.value || '').replace(/\s+/g, '');
  }

  function isQueryButton(element) {
    return element instanceof HTMLElement && normalizedText(element) === '查询';
  }

  function findScope(button) {
    if (!button || button.closest(excludedSelector)) return null;
    const directScope = button.closest(scopeSelector);
    if (directScope) return directScope;

    // 个别记录页会把查询按钮移动到快捷状态栏；查询条件仍属于页面内的筛选区。
    const page = button.closest('.operations-page');
    return button.closest('.operations-status-row')
      ? page?.querySelector('.operations-filter') || null
      : null;
  }

  function findPrimaryHost(scope) {
    const host = [...scope.querySelectorAll(fieldHostSelector)]
      .find((candidate) => !candidate.closest(advancedPanelSelector));
    if (host) return host;
    return [...scope.children].some((field) => field.matches(fieldSelector)) ? scope : null;
  }

  function moveLegacyAdvancedFields(scope, host) {
    scope.querySelectorAll(advancedPanelSelector).forEach((panel) => {
      panel.querySelectorAll(fieldHostSelector).forEach((advancedHost) => {
        [...advancedHost.children]
          .filter((field) => field.matches(fieldSelector))
          .forEach((field) => host.appendChild(field));
      });
      panel.classList.remove('is-visible');
      panel.hidden = true;
      panel.setAttribute('aria-hidden', 'true');
    });
  }

  function getColumnCount(host) {
    const template = window.getComputedStyle(host).gridTemplateColumns;
    if (!template || template === 'none') return 1;
    return Math.max(1, template.trim().split(/\s+/).filter(Boolean).length);
  }

  function ensureToggle(scope, queryButton, hasAdvanced, expanded) {
    const buttonRow = queryButton.parentElement;
    if (!buttonRow) return;
    buttonRow.classList.add('query-filter-actions');

    let toggle = buttonRow.querySelector(':scope > [data-query-filter-toggle]');
    if (!toggle) {
      toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'query-filter-toggle';
      toggle.dataset.queryFilterToggle = 'true';
      toggle.innerHTML = '<span>高级查询</span><span class="query-filter-toggle-arrow" aria-hidden="true">▾</span>';
      buttonRow.insertBefore(toggle, queryButton);
    }

    toggleScopes.set(toggle, scope);
    toggle.hidden = !hasAdvanced;
    toggle.classList.toggle('is-active', expanded);
    toggle.setAttribute('aria-expanded', String(expanded));
  }

  function layoutScope(scope, queryButton) {
    if (!scope?.isConnected || !queryButton?.isConnected) return;
    const host = findPrimaryHost(scope);
    if (!host) return;

    // 页面旧实现的“高级筛选”按钮和独立面板统一收口到主查询网格。
    scope.querySelectorAll(oldToggleSelector).forEach((toggle) => toggle.remove());
    moveLegacyAdvancedFields(scope, host);

    const actions = queryButton.closest(actionSelector);
    const hostRow = host.parentElement;
    if (actions && hostRow && actions.parentElement !== hostRow && queryButton.closest('.operations-status-row')) {
      hostRow.appendChild(actions);
    }

    const fields = [...host.children].filter((field) => field.matches(fieldSelector));
    if (!fields.length) return;
    fields.forEach((field) => {
      field.dataset.queryFilterField = 'true';
      field.hidden = false;
      delete field.dataset.queryFilterOverflow;
    });

    const visibleFieldCount = getColumnCount(host) * 2;
    const overflowFields = fields.slice(visibleFieldCount);
    const hasAdvanced = overflowFields.length > 0;
    const expanded = hasAdvanced && scope.dataset.queryFilterExpanded === 'true';

    scope.dataset.queryFilterExpanded = String(expanded);
    overflowFields.forEach((field) => {
      field.dataset.queryFilterOverflow = 'true';
      field.hidden = !expanded;
    });
    ensureToggle(scope, queryButton, hasAdvanced, expanded);
    mountedScopes.add(scope);
  }

  function refresh(root) {
    const buttons = [...root.querySelectorAll('button, input[type="submit"], input[type="button"]')]
      .filter(isQueryButton);
    const handledScopes = new Set();
    buttons.forEach((button) => {
      const scope = findScope(button);
      if (!scope || handledScopes.has(scope)) return;
      handledScopes.add(scope);
      layoutScope(scope, button);
    });
  }

  function relayoutMountedScopes() {
    mountedScopes.forEach((scope) => {
      if (!scope.isConnected) {
        mountedScopes.delete(scope);
        return;
      }
      const queryButton = [...scope.querySelectorAll('button, input[type="submit"], input[type="button"]')]
        .find(isQueryButton);
      if (queryButton) layoutScope(scope, queryButton);
    });
  }

  function mount(root) {
    if (!root || root.__queryFilterLayoutObserver) return;
    let scheduled = false;
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(() => {
        scheduled = false;
        if (root.isConnected) refresh(root);
      });
    };
    const observer = new MutationObserver(schedule);
    observer.observe(root, { childList: true, subtree: true });
    root.__queryFilterLayoutObserver = observer;
    refresh(root);
    schedule();

    if (!resizeBound) {
      resizeBound = true;
      window.addEventListener('resize', relayoutMountedScopes);
    }
  }

  document.addEventListener('click', (event) => {
    const toggle = event.target?.closest?.('[data-query-filter-toggle]');
    if (!toggle) return;
    const scope = toggleScopes.get(toggle) || toggle.closest(scopeSelector);
    if (!scope) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    scope.dataset.queryFilterExpanded = String(scope.dataset.queryFilterExpanded !== 'true');
    const queryButton = [...scope.querySelectorAll('button, input[type="submit"], input[type="button"]')]
      .find(isQueryButton);
    if (queryButton) layoutScope(scope, queryButton);
  }, true);

window.QueryFilterLayout = { mount, refresh };
})();

const toolkitAssets = Object.freeze({
  theme: './assets/js/prototype-tools/src/prototype-tools-theme.js?v=20260904-display-1',
  annotation: './assets/js/prototype-tools/src/annotation-overlay.js?v=20260904-display-1',
  annotationData: './assets/js/data/project-annotation-data.js?v=20260904-save-1',
  componentsStyles: './assets/js/prototype-tools/src/components.css?v=20260904-display-1',
  iteration: './assets/js/prototype-tools/src/project-iteration-panel.js?v=20260904-link-1',
  iterationStyles: './assets/js/prototype-tools/src/project-iteration-panel.css?v=20260904-display-1',
  iterationData: './assets/js/data/project-iteration-records.js?v=20260904-ganxian-2'
});

function loadToolkitScript(src, marker) {
  return new Promise((resolve, reject) => {
    if (marker === 'theme' && window.PrototypeToolsTheme) {
      resolve();
      return;
    }
    const existing = document.querySelector(`script[data-prototype-tools-script="${marker}"]`);
    if (existing) {
      if (existing.dataset.loaded === 'true') resolve();
      else {
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', reject, { once: true });
      }
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.dataset.prototypeToolsScript = marker;
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true';
      resolve();
    }, { once: true });
    script.addEventListener('error', reject, { once: true });
    document.body.appendChild(script);
  });
}

function appendToolkitStyles() {
  if (!document.querySelector('link[data-prototype-tools-style]')) {
    const componentsLink = document.createElement('link');
    componentsLink.rel = 'stylesheet';
    componentsLink.href = toolkitAssets.componentsStyles;
    componentsLink.dataset.prototypeToolsStyle = 'true';
    document.head.appendChild(componentsLink);
  }
  if (!document.querySelector('link[data-project-iteration-panel-style]')) {
    const iterationLink = document.createElement('link');
    iterationLink.rel = 'stylesheet';
    iterationLink.href = toolkitAssets.iterationStyles;
    iterationLink.dataset.projectIterationPanelStyle = 'true';
    document.head.appendChild(iterationLink);
  }
}

function scheduleAnnotationOverlayMount(pageRoot) {
  if (!pageRoot) return;
  window.setTimeout(() => {
    loadToolkitScript(toolkitAssets.annotationData, 'annotation-data')
      .then(() => loadToolkitScript(toolkitAssets.annotation, 'annotation-overlay'))
      .then(() => {
        if (!pageRoot.isConnected || pageRoot.__annotationOverlayController) return;
        window.AnnotationOverlay?.mount(pageRoot, [], {
          data: window.PrototypeAnnotationData || { pages: {} },
          markersVisible: false
        });
      })
      .catch(() => {
        // 工具包不可用时不阻塞业务页面。
      });
  }, 0);
}

function mountProjectIterationPanel() {
  appendToolkitStyles();
  loadToolkitScript(toolkitAssets.theme, 'theme')
    .then(() => loadToolkitScript(toolkitAssets.iterationData, 'iteration-data'))
    .then(() => loadToolkitScript(toolkitAssets.iteration, 'iteration'))
    .then(() => window.ProjectIterationPanel?.mount({
      records: window.ProjectIterationData?.records || [],
      data: window.ProjectIterationData,
      platforms: window.ProjectIterationData?.platforms || [],
      projectId: 'school-procurement-new-project',
      storageKey: 'school-procurement-new-project-iteration-records-v1',
      platformStorageKey: 'school-procurement-new-project-iteration-platforms-v1',
      persistToProjectCode: false,
      annotationMarkersVisible: false
    }))
    .catch(() => {
      // 工具包不可用时不阻塞业务页面。
  });
}

try {
  window.localStorage?.removeItem('demo-project-iteration-records-v2');
  window.localStorage?.removeItem('demo-project-iteration-platforms-v1');
} catch (error) {
  // 浏览器禁用本地存储时直接使用项目数据文件。
}

mountProjectIterationPanel();

window.AppShell = {
    mount({ title, content, emptyText = '当前没有打开的页面', variant = 'enterprise', showPageTitle = true, companyName = '' }) {
      const root = document.getElementById('app');
      if (!root) throw new Error('缺少 #app 页面挂载节点');
      const shellOptions = { variant, companyName };
      window.AppNavigationGuard?.setCurrentVariant(variant);

      const shellClass = variant === 'education'
        ? 'education-shell'
        : variant === 'supplier'
          ? 'supplier-shell'
          : variant === 'operations'
            ? 'operations-shell'
            : variant === 'school'
              ? 'school-shell'
              : '';
      root.innerHTML = `
        <div class="app-layout ${shellClass}" data-user-end="${variant}">
          ${window.AppSidebar.render(shellOptions)}
          <section class="main-section">
            ${window.AppHeader.render(shellOptions)}
            ${showPageTitle ? window.AppPageTabs.render(title, { variant }) : ''}
            <div class="page-empty-state">${emptyText}</div>
            <main class="content-area" id="pageContent">${content}</main>
          </section>
        </div>
      `;
      window.AppSidebar.bind(root, shellOptions);
      window.AppPageTabs.bind(root, { variant });
      window.AppHeader.bind?.(root, shellOptions);
      const pageContent = root.querySelector('#pageContent');
      window.QueryFilterLayout?.mount(pageContent);
      scheduleAnnotationOverlayMount(pageContent);
      return root;
    }
  };
