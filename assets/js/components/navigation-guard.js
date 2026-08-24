(function () {
  const endpointHomes = Object.freeze({
    enterprise: 'index.html',
    education: 'education.html',
    supplier: 'supplier.html',
    operations: 'operations.html',
    school: 'school.html'
  });

  // 页面文件属于哪个用户端由这里集中维护。未知页面默认跟随当前端，避免影响端内扩展页面。
  const routeOwners = Object.freeze({
    'index.html': 'enterprise',
    'education.html': 'education',
    'supplier.html': 'supplier',
    'operations.html': 'operations',
    'school.html': 'school',
    'supplier-invite.html': 'supplier',
    'bid-management.html': 'education',
    'bid-management-detail.html': 'education',
    'bid-management-form.html': 'education',
    'bid-rules-management.html': 'education',
    'bid-rules-form.html': 'education',
    'auction-limit-price.html': 'education',
    'auction-limit-price-form.html': 'education',
    'segment-management.html': 'education',
    'supplier-archive.html': 'education',
    'supplier-editor.html': 'education',
    'supplier-relationship-management.html': 'education',
    'wasted-bid-management.html': 'education',
    'sales-reconciliation.html': 'enterprise',
    'sales-reconciliation-detail.html': 'enterprise',
    'sales-reconciliation-statement.html': 'enterprise'
  });

  const validVariants = new Set(Object.keys(endpointHomes));

  function currentFile() {
    const path = window.location.pathname || '';
    const fileName = path.split('/').pop();
    return fileName || 'index.html';
  }

  function fileNameFromUrl(url) {
    const path = url.pathname || '';
    const fileName = path.split('/').pop();
    return fileName || 'index.html';
  }

  function resolveUrl(href) {
    if (href == null || String(href).trim() === '') return null;
    try {
      return new URL(String(href), window.location.href);
    } catch (error) {
      return null;
    }
  }

  function isSameOrigin(url) {
    if (!url) return false;
    if (url.protocol === 'file:' && window.location.protocol === 'file:') return true;
    return url.origin === window.location.origin;
  }

  function currentVariant() {
    const shell = document.querySelector('.app-layout[data-app-variant], [data-app-variant]');
    const shellVariant = shell?.dataset?.appVariant || shell?.getAttribute('data-app-variant');
    if (validVariants.has(shellVariant)) return shellVariant;
    return routeOwners[currentFile()] || 'enterprise';
  }

  function targetVariant(href) {
    const url = resolveUrl(href);
    if (!url || !isSameOrigin(url)) return null;
    return routeOwners[fileNameFromUrl(url)] || currentVariant();
  }

  function isAllowed(href) {
    if (!href) return true;
    const url = resolveUrl(href);
    if (!url || !isSameOrigin(url)) return true;
    if (url.hash && url.pathname === window.location.pathname && !url.search) return true;
    return targetVariant(href) === currentVariant();
  }

  function homeHref(variant = currentVariant()) {
    return `./${endpointHomes[variant] || endpointHomes.enterprise}`;
  }

  function navigate(href) {
    if (!isAllowed(href)) return false;
    window.location.href = href;
    return true;
  }

  function switchEndpoint(href) {
    const url = resolveUrl(href);
    if (!url || !isSameOrigin(url) || targetVariant(href) === currentVariant()) return false;
    window.location.href = href;
    return true;
  }

  function navigationElement(target) {
    if (!(target instanceof Element)) return null;
    return target.closest('a[href], [data-menu-link], [data-dashboard-link], [data-cell-href], [data-nav-href]');
  }

  function navigationHref(element) {
    if (!element) return '';
    return element.getAttribute('href')
      || element.dataset.menuLink
      || element.dataset.dashboardLink
      || element.dataset.cellHref
      || element.dataset.navHref
      || '';
  }

  function isExplicitEndpointSwitch(target) {
    return target instanceof Element && Boolean(target.closest('[data-shell-switch], [data-platform-switch]'));
  }

  // 捕获阶段拦截普通点击，确保业务层的冒泡监听器没有机会直接跨端跳转。
  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element) || isExplicitEndpointSwitch(target)) return;
    const element = navigationElement(target);
    const href = navigationHref(element);
    if (!href || isAllowed(href)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  window.AppNavigation = {
    endpointHomes,
    routeOwners,
    currentVariant,
    targetVariant,
    homeHref,
    isAllowed,
    navigate,
    switchEndpoint
  };
})();
