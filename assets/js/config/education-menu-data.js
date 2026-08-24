(function () {
  const icons = window.AppMenuConfig?.icons || {};
  const menu = [
    { name: '首页', icon: 'home', href: './education.html', active: true, selected: true },
    { name: '商品档案', icon: 'box', children: [
      { name: '商品管理' },
      { name: '商品审核' },
      { name: '计量单位' }
    ] },
    { name: '价格管理', icon: 'tag', children: [
      { name: '指导价格' },
      { name: '商品限价' },
      { name: '商品价格' }
    ] },
    { name: '订单管理', icon: 'cart', children: [
      { name: '订单管理' },
      { name: '订单标签' }
    ] },
    { name: '供应商档案', icon: 'users', href: './supplier-archive.html' },
    { name: '账单管理', icon: 'wallet' },
    { name: '供货企业管理', icon: 'truck', children: [
      { name: '供货企业档案' }
    ] },
    { name: '学校管理', icon: 'home' },
    { name: '统计报表', icon: 'chart' },
    { name: '系统管理', icon: 'settings', children: [
      { name: '用户管理' },
      { name: '角色管理' },
      { name: '基础信息' },
      { name: '个人中心' }
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

  window.EducationMenuConfig = {
    icons,
    menu: menu.map(normalize)
  };
})();
