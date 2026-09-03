(function () {
  const icons = window.AppMenuConfig?.icons || {};
  const menu = [
    { name: '首页', icon: 'home', href: './school.html' },
    { name: '商品档案', icon: 'box', children: [
      { name: '商品管理', href: './school-product-management.html' }
    ] },
    { name: '订单管理', icon: 'cart', children: [
      { name: '订单管理', href: './school-order-management.html' },
      { name: '订单退货', unavailable: true }
    ] },
    { name: '食谱中心', icon: 'layers', children: [
      { name: '营养食谱', href: './school-recipe-center.html' },
      { name: '需求填报', href: './school-recipe-attendance.html' },
      { name: '需求提交记录', href: './school-recipe-demand-records.html' }
    ] },
    { name: '财务对账', icon: 'wallet', children: [
      { name: '采购对账', href: './school-purchase-reconciliation.html' },
      { name: '采购账款', href: './school-purchase-accounts.html' }
    ] },
    { name: '食堂管理', icon: 'warehouse', href: './school-canteen-management.html' },
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
