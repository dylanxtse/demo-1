(function () {
  const icons = {
    home: '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    box: '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.73z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
    tag: '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',
    cart: '<svg class="icon-svg" viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>',
    truck: '<svg class="icon-svg" viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
    layers: '<svg class="icon-svg" viewBox="0 0 24 24"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
    warehouse: '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M3 21V9l9-6 9 6v12"/><path d="M9 21v-6h6v6"/></svg>',
    route: '<svg class="icon-svg" viewBox="0 0 24 24"><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/></svg>',
    users: '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    wallet: '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/></svg>',
    chart: '<svg class="icon-svg" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
    settings: '<svg class="icon-svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33A1.65 1.65 0 0 0 14 20.91V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.12.61.66 1.05 1.29 1.05H21a2 2 0 0 1 0 4h-.09A1.65 1.65 0 0 0 19.4 15z"/></svg>'
  };

  const menu = [
    { name: '首页', icon: 'home', href: './index.html' },
    { name: '商品档案', icon: 'box', active: true, expanded: false, children: [
      { name: '商品管理', selected: true, href: './product-list.html' },
      { name: '商品审核', href: './goods-review.html' },
      { name: '计量单位', href: './unit-measurement.html' }
    ]},
    { name: '价格管理', icon: 'tag', children: [
      { name: '采购价', children: [
        { name: '询价报价', href: './purchase-inquiry-quote.html' },
        { name: '采购协议价', href: './purchase-agreement-price.html' }
      ] },
      { name: '价格执行清单', href: './price-execution-list.html' },
      { name: '销售价', children: [
        { name: '市场询价', href: './market-inquiry.html' },
        { name: '销售协议价', href: './sales-agreement-price.html' },
        { name: '结算改价', href: './settlement-price-change.html' }
      ] }
    ] },
    { name: '订单管理', icon: 'cart', children: [
      { name: '订单管理', href: './order-management.html' },
      { name: '订单退货', href: './order-return.html' },
      { name: '订单标签', href: './order-tag.html' },
      { name: '实收变更', href: './receipt-change.html' }
    ] },
    { name: '采购管理', icon: 'truck', children: ['采购任务', '采购单', '采购退货', { name: '供应商档案', href: './supplier-archive.html' }, '采购员'] },
    { name: '分拣管理', icon: 'layers', children: [
      { name: '分拣管理', href: './sorting-management.html' },
      { name: '分拣进度', href: './sorting-progress.html' },
      { name: '缺货商品', href: './shortage-goods.html' },
      { name: '分拣员', href: './sorter-management.html' }
    ] },
    { name: '仓库管理', icon: 'warehouse', children: [
      { name: '入库管理', href: './inbound.html' },
      { name: '发货出库', children: [
        { name: '发货管理', href: './shipping-management.html' },
        { name: '出库管理', href: './outbound.html' },
        { name: '上传质检报告', href: './quality-report.html' }
      ] },
      { name: '库存盘点', href: './inventory-counting.html' },
      { name: '库存报表', children: [
        { name: '库存余额', href: './inventory-balance.html' },
        { name: '库存明细', href: './inventory-details.html' }
      ] },
      { name: '净菜加工', children: [
        { name: '净菜加工', href: './processing.html' },
        { name: '加工记录', href: './processing-record.html' }
      ] },
      { name: '仓库档案', href: './warehouse-archive.html' },
      { name: '期初库存', href: './opening-inventory.html' }
    ] },
    { name: '物流配送', icon: 'route', children: ['数据监测', '线路管理', '物流排线', '司机管理', '车辆管理', '配送地址'] },
    { name: '客户信息', icon: 'users', children: [
      { name: '客户档案', href: './customer.html' },
      '客户类型'
    ] },
    { name: '财务对账', icon: 'wallet', children: [
      { name: '销售对账', children: ['对账', '销售账款'] },
      { name: '采购对账', children: ['对账', '采购账款'] }
    ] },
    { name: '数据统计', icon: 'chart', children: [
      { name: '销售统计', children: ['订单汇总', '商品销量', '客户统计'] },
      { name: '采购统计', children: ['采购明细', '采购商品', '供应商统计'] },
      { name: '销售毛利统计', children: ['商品毛利统计', '客户毛利统计'] }
    ] },
    { name: '系统管理', icon: 'settings', children: [
      { name: '系统配置', children: ['审核配置', { name: '业务配置', href: './system-config.html' }] },
      { name: '下属单位管理', href: './lower-units.html' },
      '用户管理', '角色管理', '基础信息', '个人中心'
    ] }
  ].map((item) => {
    const normalize = (entry) => {
      const normalized = typeof entry === 'string' ? { name: entry } : entry;
      const children = normalized.children?.map(normalize);
      return {
        ...normalized,
        unavailable: Boolean(normalized.unavailable) || (!children?.length && !normalized.href),
        expanded: Boolean(normalized.expanded),
        children
      };
    };
    return normalize(item);
  });

  window.AppMenuConfig = { icons, menu };
})();
