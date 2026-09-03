(function () {
  const bellIcon = '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>';
  const arrowIcon = '<svg class="icon-svg" viewBox="0 0 24 24" style="width:12px;height:12px;"><polyline points="6 9 12 15 18 9"/></svg>';
  const operationsUserIcon = '<svg class="operations-user-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"></circle><path d="M4 21c.7-3.6 3.3-5.5 8-5.5s7.3 1.9 8 5.5"></path></svg>';

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  window.AppHeader = {
    render({ variant = 'enterprise', companyName: companyNameOverride = '' } = {}) {
      const isEducation = variant === 'education';
      const isSupplier = variant === 'supplier';
      const isOperations = variant === 'operations';
      const isSchool = variant === 'school';
      const session = window.DemoStore?.getSession?.() || { displayName: '管理员', companyId: '' };
      const company = window.DemoStore?.get?.('companies')?.find((item) => item.id === session.companyId);
      const companyName = companyNameOverride || (isEducation
        ? '南皮县教育局'
        : isSupplier
          ? '南皮供应商01'
            : isOperations
              ? '学校食材集采平台'
            : isSchool
              ? '静安第一中学'
          : (company?.name || '产品部学校食材集采供应链有限公司'));
      const userName = isOperations ? 'admin' : (session.displayName || session.username || '管理员');
      const platformSwitcher = `
        <div class="education-platform-switcher" aria-label="平台切换">
          <button type="button" class="education-platform-button">食品安全平台</button>
          <button type="button" class="education-platform-button active">膳食集采竞价版</button>
          <button type="button" class="education-platform-button">膳食经费平台</button>
        </div>
      `;
      const headerRight = isEducation ? platformSwitcher : isOperations ? '' : isSchool ? `
        <div class="header-msg">
          ${bellIcon}
          <span>消息中心</span>
          <span class="msg-badge">77</span>
        </div>
      ` : `
        <div class="header-msg">
          ${bellIcon}
          <span>消息中心</span>
          <span class="msg-badge">${isSupplier ? '3' : '84'}</span>
        </div>
      `;
      const shellSwitches = (isSupplier
        ? [['enterprise', '切换至企业端'], ['education', '切换至教育局端'], ['operations', '切换至运维管理平台'], ['school', '切换至学校端']]
        : isEducation
          ? [['enterprise', '切换至企业端'], ['supplier', '切换至供应商端'], ['operations', '切换至运维管理平台'], ['school', '切换至学校端']]
          : isOperations
            ? [['enterprise', '切换至企业端'], ['education', '切换至教育局端'], ['supplier', '切换至供应商端'], ['school', '切换至学校端']]
            : isSchool
              ? [['enterprise', '切换至企业端'], ['education', '切换至教育局端'], ['supplier', '切换至供应商端'], ['operations', '切换至运维管理平台']]
              : [['education', '切换至教育局端'], ['supplier', '切换至供应商端'], ['operations', '切换至运维管理平台'], ['school', '切换至学校端']]
      ).map(([target, label]) => `<button class="demo-shell-switch" type="button" role="menuitem" data-shell-switch="${target}">${label}</button>`).join('');
      const avatar = isSupplier
        ? `<div class="user-avatar supplier-user-avatar" aria-hidden="true">${window.AppMenuConfig?.icons?.users || ''}</div>`
        : isOperations
          ? `<div class="user-avatar operations-user-avatar" aria-hidden="true">${operationsUserIcon}</div>`
        : isSchool
          ? `<div class="user-avatar school-user-avatar" aria-hidden="true">${window.AppMenuConfig?.icons?.users || ''}</div>`
          : `<div class="user-avatar">${escapeHtml(userName.slice(0, 1))}</div>`;
      return `
        <header class="app-header ${isEducation ? 'education-header' : ''} ${isSupplier ? 'supplier-header' : ''} ${isOperations ? 'operations-header' : ''} ${isSchool ? 'school-header' : ''}">
          <div class="header-left">
            ${isOperations ? '<button type="button" class="operations-header-menu-toggle" data-operations-sidebar-toggle aria-label="展开或收起菜单">☰</button>' : ''}
            <span class="header-company" style="font-size:18px">${escapeHtml(companyName)}</span>
          </div>
          <div class="header-right">
            ${headerRight}
            <div class="header-user" tabindex="0" aria-haspopup="menu" aria-label="用户菜单">
              ${avatar}
              <span class="header-user-name ${isSupplier || isSchool ? 'supplier-user-name-hidden' : ''}">${escapeHtml(userName)}</span>
              ${isOperations ? '' : arrowIcon}
              <div class="header-user-menu" role="menu">
                ${shellSwitches}
                <button type="button" role="menuitem">个人中心</button>
                <button type="button" role="menuitem">退出登录</button>
              </div>
            </div>
          </div>
        </header>
      `;
    },

    bind(root) {
      const header = root?.querySelector('.app-header');
      if (!root || !header || header.dataset.headerBound === 'true') return;
      header.dataset.headerBound = 'true';
      const closeUserMenus = () => {
        header.querySelectorAll('.header-user.is-open').forEach((user) => {
          user.classList.remove('is-open');
          user.setAttribute('aria-expanded', 'false');
        });
      };
      root.addEventListener('click', (event) => {
        const switchButton = event.target.closest('[data-shell-switch]');
        if (switchButton) {
          const routes = {
            enterprise: './index.html',
            education: './education.html',
            supplier: './supplier-bidding-quotation.html',
            operations: './operations.html',
            school: './school-product-management.html'
          };
          const target = routes[switchButton.dataset.shellSwitch];
          if (target) {
            if (window.AppNavigationGuard?.switchTo) window.AppNavigationGuard.switchTo(switchButton.dataset.shellSwitch);
            else window.location.href = target;
          }
          return;
        }
        const user = event.target.closest('.header-user');
        if (user) {
          if (event.target.closest('.header-user-menu')) return;
          const isOpen = user.classList.toggle('is-open');
          user.setAttribute('aria-expanded', String(isOpen));
          return;
        }
        closeUserMenus();
      });
      root.addEventListener('keydown', (event) => {
        const user = event.target.closest('.header-user');
        if (!user) return;
        if (event.key === 'Escape') {
          closeUserMenus();
          user.focus();
          return;
        }
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          const isOpen = user.classList.toggle('is-open');
          user.setAttribute('aria-expanded', String(isOpen));
        }
      });
    }
  };
})();
