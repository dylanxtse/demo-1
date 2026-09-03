(function () {
  const storageKey = 'procurement-open-page-tabs';

  function scopedStorageKey(variant = 'enterprise') {
    return `${storageKey}-${variant}`;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function currentHref() {
    const fileName = window.location.pathname.split('/').pop() || 'index.html';
    return `./${fileName}${window.location.search || ''}`;
  }

  function readTabs(variant = 'enterprise') {
    const key = scopedStorageKey(variant);
    const normalizeTabs = (tabs) => {
      const seen = new Set();
      return (Array.isArray(tabs) ? tabs : []).filter((tab) => {
        if (!tab || !tab.href || !tab.title || seen.has(tab.href)) return false;
        seen.add(tab.href);
        return true;
      });
    };
    try {
      const tabs = JSON.parse(window.sessionStorage.getItem(key) || '[]');
      return normalizeTabs(tabs);
    } catch (error) {
      const tabs = window.AppStorage?.read(key, []);
      return normalizeTabs(tabs);
    }
  }

  function writeTabs(tabs, variant = 'enterprise') {
    const key = scopedStorageKey(variant);
    try {
      window.sessionStorage.setItem(key, JSON.stringify(tabs));
    } catch (error) {
      // file:// 页面可能禁用 sessionStorage，退回项目现有的本地存储封装。
      window.AppStorage?.write(key, tabs);
    }
  }

  function register(title, variant = 'enterprise') {
    const href = currentHref();
    const tabs = readTabs(variant);
    const existing = tabs.find((tab) => tab.href === href);
    if (existing) existing.title = title;
    else tabs.push({ title, href });
    writeTabs(tabs, variant);
    return { tabs, href };
  }

  function ensureSchoolHomeTab(tabs, href) {
    const homeHref = './school-product-management.html';
    if (href === homeHref || tabs.some((tab) => tab.href === homeHref)) return tabs;
    tabs.unshift({ title: '首页', href: homeHref });
    return tabs;
  }

  function renderTab(tab, active) {
    return `
      <div class="page-tab ${active ? 'active' : ''}" data-tab-href="${escapeHtml(tab.href)}" draggable="true">
        <a class="page-tab-link" href="${escapeHtml(tab.href)}">${escapeHtml(tab.title)}</a>
        <button class="page-tab-close" type="button" data-tab-close aria-label="关闭${escapeHtml(tab.title)}">×</button>
      </div>
    `;
  }

  window.AppPageTabs = {
    render(title, { variant = 'enterprise' } = {}) {
      const registered = register(title, variant);
      const tabs = variant === 'school'
        ? ensureSchoolHomeTab(registered.tabs, registered.href)
        : registered.tabs;
      if (variant === 'school') writeTabs(tabs, variant);
      return `
        <div class="breadcrumb-bar" aria-label="已打开页面">
          <div class="page-tabs">
            ${tabs.map((tab) => renderTab(tab, tab.href === registered.href)).join('')}
          </div>
        </div>
      `;
    },

    bind(root, { variant = 'enterprise' } = {}) {
      const tabsRoot = root.querySelector('.page-tabs');
      if (!tabsRoot) return;
      let draggedTab = null;

      const persistDomOrder = () => {
        const orderedHrefs = Array.from(tabsRoot.querySelectorAll('[data-tab-href]'))
          .map((element) => element.dataset.tabHref);
        const tabsByHref = new Map(readTabs(variant).map((tab) => [tab.href, tab]));
        writeTabs(orderedHrefs.map((href) => tabsByHref.get(href)).filter(Boolean), variant);
      };

      tabsRoot.addEventListener('dragstart', (event) => {
        const tab = event.target.closest('[data-tab-href]');
        if (!tab) return;
        draggedTab = tab;
        tab.classList.add('is-dragging');
        event.dataTransfer?.setData('text/plain', tab.dataset.tabHref || '');
        if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
      });

      tabsRoot.addEventListener('dragover', (event) => {
        if (!draggedTab) return;
        const target = event.target.closest('[data-tab-href]');
        if (!target || target === draggedTab) return;
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
        const rect = target.getBoundingClientRect();
        const insertAfter = event.clientX > rect.left + rect.width / 2;
        tabsRoot.insertBefore(draggedTab, insertAfter ? target.nextSibling : target);
      });

      tabsRoot.addEventListener('drop', (event) => {
        if (!draggedTab) return;
        event.preventDefault();
        persistDomOrder();
      });

      tabsRoot.addEventListener('dragend', () => {
        if (!draggedTab) return;
        draggedTab.classList.remove('is-dragging');
        persistDomOrder();
        draggedTab = null;
      });

      tabsRoot.addEventListener('click', (event) => {
        const closeButton = event.target.closest('[data-tab-close]');
        if (!closeButton) return;
        event.preventDefault();
        event.stopPropagation();
        const tabElement = closeButton.closest('[data-tab-href]');
        const href = tabElement?.dataset.tabHref;
        if (!href) return;
        const tabs = readTabs(variant).filter((tab) => tab.href !== href);
        writeTabs(tabs, variant);
        if (href === currentHref()) {
          const fallback = tabs[tabs.length - 1];
          const target = fallback?.href || './index.html';
          if (window.AppNavigationGuard?.navigate) window.AppNavigationGuard.navigate(target);
          else window.location.href = target;
        } else {
          tabElement.remove();
        }
      });
    }
  };
})();
