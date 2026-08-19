(function () {
  const bellIcon = '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>';
  const arrowIcon = '<svg class="icon-svg" viewBox="0 0 24 24" style="width:12px;height:12px;"><polyline points="6 9 12 15 18 9"/></svg>';

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  window.AppHeader = {
    render({ variant = 'enterprise' } = {}) {
      const isEducation = variant === 'education';
      const isSupplier = variant === 'supplier';
      const isOperations = variant === 'operations';
      const isSchool = variant === 'school';
      const session = window.DemoStore?.getSession?.() || { displayName: '管理员', companyId: '' };
      const company = window.DemoStore?.get?.('companies')?.find((item) => item.id === session.companyId);
      const companyName = isEducation
        ? '静安教育局'
        : (isSupplier ? '每日优选' : (isOperations ? '学校食材集采平台' : (isSchool ? '静安第一中学' : (company?.name || '产品部学校食材集采供应链有限公司'))));
      const userName = isOperations ? 'admin' : (session.displayName || session.username || '管理员');
      const platformSwitcher = `
        <div class="education-platform-switcher" aria-label="平台切换">
          ${isOperations
            ? '<button type="button" class="education-platform-button active">膳食集采企业版</button><button type="button" class="education-platform-button">膳食经费平台</button><button type="button" class="education-platform-button">膳食营养平台</button>'
            : '<button type="button" class="education-platform-button">食品安全平台</button><button type="button" class="education-platform-button active">膳食集采竞价版</button><button type="button" class="education-platform-button">膳食经费平台</button>'}
        </div>
      `;
      const messageBlock = `
        <div class="header-msg">
          ${bellIcon}
          <span>消息中心</span>
          <span class="msg-badge">${isSchool ? '52' : '84'}</span>
        </div>
      `;
      const shellTargets = [
        { key: 'enterprise', label: '切换至企业端', href: './index.html' },
        { key: 'education', label: '切换至教育局端', href: './education.html' },
        { key: 'supplier', label: '切换至供应商端', href: './supplier.html' },
        { key: 'operations', label: '切换至运维管理平台', href: './operations.html' },
        { key: 'school', label: '切换至学校端', href: './school.html' }
      ];
      const shellSwitches = shellTargets
        .filter((target) => target.key !== variant)
        .map((target) => `<button class="demo-shell-switch" type="button" role="menuitem" data-shell-switch="${target.key}" data-shell-href="${target.href}">${target.label}</button>`)
        .join('');
      const schoolPlatformPicker = `
        <div class="school-platform-picker">
          <button type="button" class="school-platform-button" data-school-platform-toggle aria-expanded="false">切换平台</button>
          <div class="school-platform-menu" role="menu">${shellSwitches}</div>
        </div>
      `;
      const headerRight = isEducation
        ? platformSwitcher
        : (isOperations ? '' : (isSchool ? `${schoolPlatformPicker}${messageBlock}` : messageBlock));
      return `
        <header class="app-header ${isEducation ? 'education-header' : ''} ${isOperations ? 'operations-header' : ''} ${isSchool ? 'school-header' : ''}">
          <div class="header-left">
            ${isOperations ? '<button type="button" class="operations-header-menu-toggle" data-operations-sidebar-toggle aria-label="展开或收起菜单">☰</button>' : ''}
            <span class="header-company" style="font-size:18px">${escapeHtml(companyName)}</span>
          </div>
          <div class="header-right">
            ${headerRight}
            <div class="header-user" tabindex="0" aria-haspopup="menu" aria-label="用户菜单">
              <div class="user-avatar ${(isOperations || isSchool) ? 'operations-user-avatar' : ''}">${(isOperations || isSchool) ? '<svg class="operations-user-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"></circle><path d="M4 21c.7-3.6 3.3-5.5 8-5.5s7.3 1.9 8 5.5"></path></svg>' : escapeHtml(userName.slice(0, 1))}</div>
              <span class="header-user-name">${escapeHtml(userName)}</span>
              ${(isOperations || isSchool) ? '' : arrowIcon}
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
      const closePlatformMenus = () => {
        header.querySelectorAll('.school-platform-picker.is-open').forEach((picker) => {
          picker.classList.remove('is-open');
          picker.querySelector('[data-school-platform-toggle]')?.setAttribute('aria-expanded', 'false');
        });
      };
      root.addEventListener('click', (event) => {
        const operationsSidebarToggle = event.target.closest('[data-operations-sidebar-toggle]');
        if (operationsSidebarToggle) {
          root.querySelector('.sidebar')?.classList.toggle('collapsed');
          return;
        }
        const platformToggle = event.target.closest('[data-school-platform-toggle]');
        if (platformToggle) {
          const picker = platformToggle.closest('.school-platform-picker');
          const isOpen = picker?.classList.toggle('is-open');
          platformToggle.setAttribute('aria-expanded', String(Boolean(isOpen)));
          return;
        }
        const switchButton = event.target.closest('[data-shell-switch]');
        if (switchButton) {
          closePlatformMenus();
          window.AppNavigation?.switchEndpoint?.(switchButton.dataset.shellHref || './index.html');
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
        if (!event.target.closest('.school-platform-picker')) closePlatformMenus();
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
