(function () {
  const icons = window.AppMenuConfig?.icons || {};
  const menu = [
    { name: '首页', icon: 'home', href: './operations.html', active: true, selected: true },
    { name: '平台管理', icon: 'layers', expanded: true, children: [
      { name: '教育局管理', unavailable: true },
      { name: '企业管理', unavailable: true },
      { name: '学校管理', unavailable: true }
    ] },
    { name: '系统管理', icon: 'settings', expanded: true, children: [
      { name: '菜单配置', unavailable: true },
      { name: '企业角色管理', unavailable: true },
      { name: '平台打通配置', unavailable: true },
      { name: '图标配置', unavailable: true }
    ] }
  ];

  function normalize(entry) {
    const normalized = typeof entry === 'string' ? { name: entry } : entry;
    const children = normalized.children?.map(normalize);
    return {
      ...normalized,
      unavailable: Boolean(normalized.unavailable) || (!children?.length && !normalized.href),
      expanded: Boolean(normalized.expanded),
      children
    };
  }

  window.OperationsMenuConfig = {
    icons,
    menu: menu.map(normalize)
  };
})();
