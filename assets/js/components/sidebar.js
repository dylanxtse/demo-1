(function () {
  function autoSelectByHref(menu, currentPath, pageKey = '') {
    const routeAliases = {
      'outbound-detail.html': 'outbound.html',
      'inbound-detail.html': 'inbound.html',
      'outbound-detail': 'outbound',
      'inbound-detail': 'inbound',
      'order-detail.html': 'order-management.html',
      'order-detail': 'order-management',
      'order-add.html': 'order-management.html',
      'order-add': 'order-management',
      'bid-management-detail.html': 'bid-management.html',
      'bid-management-detail': 'bid-management.html'
    };
    const pageAliases = {
      'bid-management': 'bid-management.html',
      'bid-management-detail': 'bid-management.html',
      'bid-form': 'bid-management.html',
      'rules-management': 'bid-rules-management.html',
      'rules-form': 'bid-rules-management.html',
      'limit-management': 'auction-limit-price.html',
      'limit-form': 'auction-limit-price.html',
      'wasted-management': 'wasted-bid-management.html',
      'segment-management': 'segment-management.html',
      'relationship-management': 'supplier-relationship-management.html',
      'supplier-management': 'supplier-archive.html',
      'supplier-form': 'supplier-editor.html'
    };
    const targetPath = pageAliases[pageKey] || currentPath;
    const cleanPath = (routeAliases[targetPath] || targetPath).replace(/\.html$/, '');
    function hrefMatches(href) {
      if (!href) return false;
      const cleanHref = href.replace(/^\.?\//, '').replace(/\.html$/, '');
      return cleanHref === cleanPath;
    }
    let foundPath = null;
    function findInChildren(items, path) {
      items.forEach((item, index) => {
        const currentPath = [...path, index];
        if (hrefMatches(item.href)) {
          foundPath = currentPath;
        }
        if (item.children) findInChildren(item.children, currentPath);
      });
    }
    menu.forEach((item, index) => {
      if (hrefMatches(item.href)) foundPath = [index];
      if (item.children) findInChildren(item.children, [index]);
    });
    if (!foundPath) return;

    const clearSelected = (items) => items?.forEach((item) => {
      item.selected = false;
      item.active = false;
      clearSelected(item.children);
    });
    menu.forEach((item) => { item.active = false; clearSelected(item.children); });

    menu[foundPath[0]].active = true;
    if (foundPath.length > 1) menu[foundPath[0]].expanded = true;
    let current = menu[foundPath[0]];
    foundPath.slice(1, -1).forEach((index) => {
      current = current?.children?.[index];
      if (current) current.expanded = true;
    });
    let node = menu[foundPath[0]];
    foundPath.slice(1).forEach((index) => { node = node?.children?.[index]; });
    if (node) {
      node.selected = true;
      let parent = menu[foundPath[0]];
      foundPath.slice(1, -1).forEach((index) => {
        parent = parent?.children?.[index];
        if (parent) parent.expanded = true;
      });
    }
  }

  function renderSubItems(items, parentPath, level = 1) {
    return items.map((child, childIndex) => {
      const path = `${parentPath}:${childIndex}`;
      const hasChildren = Array.isArray(child.children) && child.children.length > 0;
      const unavailable = Boolean(child.unavailable) || (!hasChildren && !child.href);
      return `
        <div class="menu-sub-group ${child.expanded ? 'expanded' : ''} ${unavailable ? 'unavailable' : ''}" style="--menu-level:${level}">
          <button class="menu-sub-item ${child.selected ? 'selected' : ''}" type="button"
            data-menu-item="${path}" ${hasChildren ? `data-menu-toggle-path="${path}" aria-expanded="${child.expanded}"` : ''} ${unavailable ? 'data-menu-unavailable="true" aria-disabled="true"' : ''}>
            <span>${child.name}</span>
            ${hasChildren ? '<svg class="menu-arrow" viewBox="0 0 24 24" aria-hidden="true"><polyline points="9 6 15 12 9 18"/></svg>' : ''}
          </button>
          ${hasChildren ? `<div class="menu-sub">${renderSubItems(child.children, path, level + 1)}</div>` : ''}
        </div>
      `;
    }).join('');
  }

  function renderMenu(menu, icons) {
    return menu.map((item, itemIndex) => {
      const unavailable = Boolean(item.unavailable) || (!item.children && !item.href);
      return `
      <div class="menu-item ${item.active ? 'active' : ''} ${item.expanded ? 'expanded' : ''} ${item.children ? '' : 'menu-leaf'} ${unavailable ? 'unavailable' : ''}" data-menu-index="${itemIndex}">
        <button class="menu-item-header" type="button" data-menu-toggle="${itemIndex}"
          ${item.children ? `aria-expanded="${item.expanded}"` : ''} ${item.href && !unavailable ? `data-menu-link="${item.href}"` : ''} ${unavailable ? 'data-menu-unavailable="true" aria-disabled="true"' : ''}>
          <span class="menu-icon">${icons[item.icon] || ''}</span>
          <span>${item.name}</span>
          ${item.children ? '<svg class="menu-arrow" viewBox="0 0 24 24" aria-hidden="true"><polyline points="9 6 15 12 9 18"/></svg>' : ''}
        </button>
        ${item.children ? `
          <div class="menu-sub">
            ${renderSubItems(item.children, String(itemIndex))}
          </div>
        ` : ''}
      </div>
    `;
    }).join('');
  }

  function bind(sidebar, menu) {
    const getMenuNode = (path) => {
      let current = menu[path[0]];
      path.slice(1).forEach((index) => { current = current?.children?.[index]; });
      return current;
    };

    const expandAncestors = (path) => {
      let current = menu[path[0]];
      current?.children && (current.expanded = true);
      path.slice(1, -1).forEach((index) => {
        current = current?.children?.[index];
        if (current?.children) current.expanded = true;
      });
    };

    const collapseDescendants = (node) => {
      node?.children?.forEach((child) => {
        child.expanded = false;
        collapseDescendants(child);
      });
    };

    const syncCollapsedDescendants = (path) => {
      const prefix = `${path.join(':')}:`;
      sidebar.querySelectorAll('[data-menu-toggle-path]').forEach((element) => {
        if (!element.dataset.menuTogglePath.startsWith(prefix)) return;
        element.setAttribute('aria-expanded', 'false');
        element.parentElement.classList.remove('expanded');
      });
    };

    const toggleNode = (node, path, element, expanded) => {
      node.expanded = expanded;
      element.classList.toggle('expanded', expanded);
      const button = element.querySelector(':scope > .menu-sub-item, :scope > .menu-item-header');
      button?.setAttribute('aria-expanded', String(expanded));
      if (!expanded) {
        collapseDescendants(node);
        syncCollapsedDescendants(path);
      }
    };

    sidebar.addEventListener('click', (event) => {
      const unavailable = event.target.closest('[data-menu-unavailable]');
      if (unavailable) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      const toggle = event.target.closest('[data-menu-toggle]');
      if (toggle && menu[Number(toggle.dataset.menuToggle)]?.children) {
        const index = Number(toggle.dataset.menuToggle);
        const expanded = !menu[index].expanded;
        const container = sidebar.querySelector(`[data-menu-index="${index}"]`);
        toggleNode(menu[index], [index], container, expanded);
        return;
      }

      const topLevelLink = event.target.closest('[data-menu-link]');
      if (topLevelLink) {
        window.location.href = topLevelLink.dataset.menuLink;
        return;
      }

      const nestedToggle = event.target.closest('[data-menu-toggle-path]');
      if (nestedToggle && nestedToggle.querySelector('.menu-arrow')) {
        const path = nestedToggle.dataset.menuTogglePath.split(':').map(Number);
        const current = getMenuNode(path);
        if (current?.children) {
          toggleNode(current, path, nestedToggle.parentElement, !current.expanded);
        }
        return;
      }

      const subItem = event.target.closest('[data-menu-item]');
      if (subItem) {
        const path = subItem.dataset.menuItem.split(':').map(Number);
        const itemIndex = path[0];
        const clearSelected = (children) => children?.forEach((child) => {
          child.selected = false;
          clearSelected(child.children);
        });
        menu.forEach((item) => {
          item.active = false;
          clearSelected(item.children);
        });
        menu[itemIndex].active = true;
        expandAncestors(path);
        const selected = getMenuNode(path);
        selected.selected = true;
        sidebar.querySelectorAll('.menu-item').forEach((item) => item.classList.remove('active'));
        sidebar.querySelectorAll('.menu-sub-item').forEach((item) => item.classList.remove('selected'));
        sidebar.querySelector(`[data-menu-index="${itemIndex}"]`)?.classList.add('active');
        subItem.classList.add('selected');
        path.slice(1, -1).forEach((_, index) => {
          const ancestorPath = path.slice(0, index + 2).join(':');
          sidebar.querySelector(`[data-menu-toggle-path="${ancestorPath}"]`)?.parentElement.classList.add('expanded');
        });
        if (selected?.href) {
          event.preventDefault();
          window.location.href = selected.href;
        }
        return;
      }

      if (event.target.closest('[data-sidebar-toggle]')) {
        sidebar.classList.toggle('collapsed');
      }
    });
  }

  window.AppSidebar = {
    getConfig({ variant = 'enterprise' } = {}) {
      if (variant === 'education') return window.EducationMenuConfig;
      if (variant === 'supplier') return window.SupplierMenuConfig;
      if (variant === 'operations') return window.OperationsMenuConfig;
      if (variant === 'school') return window.SchoolMenuConfig;
      return window.AppMenuConfig;
    },
    getVisibleMenu({ variant = 'enterprise' } = {}) {
      const config = this.getConfig({ variant });
      return config?.menu || [];
    },
    render(options = {}) {
      const menu = this.getVisibleMenu(options);
      const config = this.getConfig(options);
      const { icons } = config;
      const isOperations = options.variant === 'operations';
      const logoSrc = isOperations ? './assets/images/operations-logo.png' : './sidebar-logo.png';
      const logoAlt = isOperations ? '校园集采管理平台' : '校园集采企业版';
      return `
        <aside class="sidebar">
          <div class="sidebar-logo">
            <img src="${logoSrc}" alt="${logoAlt}">
          </div>
          <nav class="sidebar-menu">${renderMenu(menu, icons)}</nav>
          <button class="sidebar-toggle" type="button" data-sidebar-toggle aria-label="切换侧边栏折叠">
            <svg class="icon-svg toggle-icon" viewBox="0 0 24 24" style="width:14px;height:14px;"><polyline points="15 6 9 12 15 18"/></svg>
          </button>
        </aside>
      `;
    },
    bind(root, options = {}) {
      const sidebar = root.querySelector('.sidebar');
      const menu = this.getVisibleMenu(options);
      const config = this.getConfig(options);
      const currentPath = window.location.pathname.split('/').pop() || 'index.html';
      const pageKey = root.querySelector('#app')?.dataset.page || '';
      autoSelectByHref(menu, currentPath, pageKey);
      if (sidebar) {
        const isOperations = options.variant === 'operations';
        const logoSrc = isOperations ? './assets/images/operations-logo.png' : './sidebar-logo.png';
        const logoAlt = isOperations ? '校园集采管理平台' : '校园集采企业版';
        sidebar.innerHTML = `<div class="sidebar-logo">
            <img src="${logoSrc}" alt="${logoAlt}">
          </div>
          <nav class="sidebar-menu">${renderMenu(menu, config.icons)}</nav>
          <button class="sidebar-toggle" type="button" data-sidebar-toggle aria-label="切换侧边栏折叠">
            <svg class="icon-svg toggle-icon" viewBox="0 0 24 24" style="width:14px;height:14px;"><polyline points="15 6 9 12 15 18"/></svg>
          </button>`;
        bind(sidebar, menu);
      }
    }
  };
})();
