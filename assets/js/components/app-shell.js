(function () {
  window.AppShell = {
    mount({ title, content, emptyText = '当前没有打开的页面', variant = 'enterprise' }) {
      const root = document.getElementById('app');
      if (!root) throw new Error('缺少 #app 页面挂载节点');
      const shellOptions = { variant };
      const shellClass = variant === 'education'
        ? 'education-shell'
        : (variant === 'supplier'
          ? 'supplier-shell'
          : (variant === 'operations'
            ? 'operations-shell'
            : (variant === 'school' ? 'school-shell' : '')));

      root.innerHTML = `
        <div class="app-layout ${shellClass}">
          ${window.AppSidebar.render(shellOptions)}
          <section class="main-section">
            ${window.AppHeader.render(shellOptions)}
            ${window.AppPageTabs.render(title)}
            <div class="page-empty-state">${emptyText}</div>
            <main class="content-area" id="pageContent">${content}</main>
          </section>
        </div>
      `;
      window.AppSidebar.bind(root, shellOptions);
      window.AppPageTabs.bind(root);
      window.AppHeader.bind?.(root, shellOptions);
      return root;
    }
  };
})();
