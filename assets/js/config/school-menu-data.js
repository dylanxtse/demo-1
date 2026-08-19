(function () {
  const icons = window.AppMenuConfig?.icons || {};
  const menu = [
    { name: '首页', icon: 'home', href: './school.html', active: true, selected: true },
    { name: '商品档案', icon: 'box', children: [
      { name: '商品管理', unavailable: true }
    ] },
    { name: '订单管理', icon: 'cart', children: [
      { name: '订单管理', unavailable: true },
      { name: '订单退货', unavailable: true }
    ] },
    { name: '财务对账', icon: 'wallet', children: [
      { name: '采购对账', unavailable: true }
    ] },
    { name: '食堂管理', icon: 'warehouse', unavailable: true },
    { name: '系统设置', icon: 'settings', children: [
      { name: '账号设置', unavailable: true }
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

  window.SchoolMenuConfig = {
    icons,
    menu: menu.map(normalize)
  };
})();
