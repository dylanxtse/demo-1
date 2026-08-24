(function () {
  const icons = window.AppMenuConfig?.icons || {};
  const menu = [
    { name: '商品档案', icon: 'box', active: true, expanded: true, children: [
      { name: '商品管理', selected: true, href: './supplier.html' },
      { name: '商品分类' }
    ] },
    { name: '采购单', icon: 'cart', children: ['采购单列表', '采购退货'] },
    { name: '价格管理', icon: 'tag', children: ['采购价', '销售价'] },
    { name: '财务对账', icon: 'wallet', children: ['采购对账', '销售对账'] },
    { name: '系统管理', icon: 'settings', children: ['个人中心', '账号设置'] }
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

  window.SupplierMenuConfig = {
    icons,
    menu: menu.map(normalize)
  };
})();
