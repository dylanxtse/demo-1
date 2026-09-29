(function () {
  const orderMealOptions = window.OrderMealOptions || ['早餐', '午餐', '晚餐', '早点', '午点', '晚点'];
  const today = () => {
    const now = new Date();
    const pad = (value) => String(value).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  };

  const primaryFilters = [
    { key: 'expectedAt', label: '期望送达时间', type: 'date', defaultValue: today() },
    { key: 'warehouse', label: '仓库', options: ['中心仓', '北区仓', '临时仓', '东南区域仓库', '公司市区仓库'] },
    { key: 'customerName', label: '客户名称', options: ['第一实验学校', '阳光幼儿园', '育才中学', '第三小学', '实验幼儿园', '机关第二食堂', '机关第一食堂'] }
  ];

  const shippingAdvancedFilters = [
    { key: 'route', label: '线路', emptyLabel: '请选择', options: ['东城一线', '南城二线', '北城一线', '西城一线'] },
    { key: 'status', label: '发货状态', options: [
      { label: '未发货', value: 'PENDING' },
      { label: '已发货', value: 'SHIPPED' }
    ] },
    { key: 'sortingStatus', label: '分拣状态', options: [
      { label: '未分拣', value: 'PENDING' },
      { label: '已分拣', value: 'SORTED' }
    ] },
    { key: 'canteen', label: '食堂', emptyLabel: '请选择', options: ['第1食堂', '第2食堂', '静安第一中学食堂', '静安第二中学食堂'] }
  ];

  const orderFilters = [
    ...primaryFilters,
    ...shippingAdvancedFilters,
    { key: 'orderTag', label: '订单标签', options: ['其他', '紧急订单', '补单'] },
    { key: 'orderNo', label: '订单号', placeholder: '请输入采购单号' },
    { key: 'mealName', label: '订单餐次', emptyLabel: '请选择', placeholderOnly: true, options: orderMealOptions }
  ];

  const differenceFilters = [...primaryFilters, ...shippingAdvancedFilters];

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function sortingDetail(item) {
    const itemName = String(item.goodsName || '').split('(')[0].trim();
    return (window.DemoStore?.get?.('sortingTasks') || []).find((record) => {
      const recordName = String(record.goodsName || '').split('(')[0].trim();
      return (!item.orderNo || record.orderNo === item.orderNo) && (!itemName || recordName === itemName);
    }) || {};
  }

  function statusMarkup(label, value) {
    const pending = ['PENDING', 'PENDING_CONFIRM', 'PENDING_AUDIT', 'READY_FOR_SORTING', '待处理', '未分拣', '未发货'].includes(String(value));
    return `<span class="shipping-status-text${pending ? ' is-pending' : ''}">${escapeHtml(label || '--')}</span>`;
  }

  function sortingLabel(value) {
    if (['SORTED', '已分拣'].includes(String(value))) return '已分拣';
    if (['PENDING', '待处理', '未分拣', 'READY_FOR_SORTING'].includes(String(value))) return '未分拣';
    return window.BusinessRules?.statusLabel?.('sortingTasks', value) || value || '--';
  }

  function sortingStatus(item) {
    const detail = sortingDetail(item);
    const value = detail.status || item.sortingStatus || item.status;
    return statusMarkup(sortingLabel(value), value);
  }

  function shippingStatus(item) {
    const value = item.status;
    const label = value === 'SHIPPED' || value === '已发货' ? '已发货' : value === 'PENDING' || value === '未发货' ? '未发货' : (window.BusinessRules?.statusLabel?.('shippingOrders', value) || value || '--');
    return statusMarkup(label, value);
  }

  function orderLineFor(item, line) {
    const orders = window.DemoStore?.get?.('orders') || [];
    const order = orders.find((record) => record.id === item.orderId || record.orderNo === item.orderNo);
    return order?.items?.find((record) => record.orderLineId === line.orderLineId || record.productId === line.productId || record.goodsCode === line.goodsCode) || {};
  }

  function productFor(line) {
    const products = window.DemoStore?.get?.('products') || [];
    return products.find((product) => product.id === line.productId || product.code === line.productId || product.code === line.goodsCode) || {};
  }

  function plainNumber(value) {
    if (value === '' || value == null || !Number.isFinite(Number(value))) return '--';
    return String(Number(value));
  }

  function decimalNumber(value) {
    if (value === '' || value == null || !Number.isFinite(Number(value))) return '--';
    return Number(value).toFixed(2);
  }

  function renderShippingRemark(value) {
    const remark = String(value || '').trim();
    return /^模拟数据[:：]/.test(remark) ? '--' : (remark || '--');
  }

  const defaultPackageSpecs = [
    { productCode: 'SP0300061', packageQty: 10, packageUnit: '包', status: 'ENABLE' },
    { productCode: 'SP0300039', packageQty: 10, packageUnit: '包', status: 'ENABLE' },
    { productCode: 'SP0300025', packageQty: 5, packageUnit: '包', status: 'ENABLE' },
    { productCode: 'SP0300019', packageQty: 10, packageUnit: '袋', status: 'ENABLE' },
    { productCode: 'SP0300034', packageQty: 25, packageUnit: '袋', status: 'ENABLE' },
    { productCode: 'SP0300020', packageQty: 10, packageUnit: '箱', status: 'ENABLE' },
    { productCode: 'SP0300051', packageQty: 10, packageUnit: '包', status: 'ENABLE' },
    { productCode: 'SP0300055', packageQty: 10, packageUnit: '包', status: 'ENABLE' },
    { productCode: 'SP0300059', packageQty: 10, packageUnit: '包', status: 'ENABLE' },
    { productCode: 'SP0300031', packageQty: 5, packageUnit: '箱', status: 'ENABLE' },
    { productCode: 'SP0300030', packageQty: 10, packageUnit: '箱', status: 'ENABLE' },
    { productCode: 'SP0300015', packageQty: 10, packageUnit: '筐', status: 'ENABLE' },
    { productCode: 'SP0300037', packageQty: 10, packageUnit: '箱', status: 'ENABLE' },
    { productCode: 'SP0300014', packageQty: 10, packageUnit: '筐', status: 'ENABLE' },
    { productCode: 'SP0300040', packageQty: 10, packageUnit: '袋', status: 'ENABLE' },
    { productCode: 'SP0300029', packageQty: 5, packageUnit: '箱', status: 'ENABLE' }
  ];

  function packageSpecFor(item, product) {
    const saved = window.AppStorage?.read('procurement-sorting-package-specs-v2', null);
    const specsByCode = new Map(defaultPackageSpecs.map((spec) => [String(spec.productCode), spec]));
    (Array.isArray(saved) ? saved : []).forEach((spec) => specsByCode.set(String(spec.productCode), spec));
    const specs = [...specsByCode.values()];
    const productCode = item.goodsCode || item.productCode || item.productId || product.code || product.id;
    return specs.find((spec) => String(spec.productCode) === String(productCode) && spec.status !== 'DISABLE') || null;
  }

  function packageBreakdown(item, product, shippingQty) {
    const spec = packageSpecFor(item, product);
    const coefficient = Number(spec?.packageQty);
    const quantity = Number(shippingQty);
    if (!spec || !Number.isFinite(coefficient) || coefficient <= 0 || !Number.isFinite(quantity)) {
      return { quantity: '--', remainder: '--', unit: '--', coefficient: '--' };
    }
    const quantityCount = Math.floor(quantity / coefficient);
    const remainder = Number((quantity - quantityCount * coefficient).toFixed(2));
    return {
      quantity: String(quantityCount),
      remainder: remainder > 0 ? String(remainder) : '',
      unit: spec.packageUnit || '--',
      coefficient: String(spec.packageQty)
    };
  }

  function renderShippingExpandedRow(item) {
    const lines = Array.isArray(item.items) ? item.items : [];
    const rows = lines.length
      ? lines.map((line, index) => {
        const orderLine = orderLineFor(item, line);
        const data = { ...orderLine, ...line };
        const product = productFor(data);
        const displayName = window.DomUtils?.formatProductDisplay?.(data) || `${data.goodsName || data.productName || '商品'}（${data.unit || '--'}/${data.brand || '--'}/${data.spec || '--'}）`;
        const orderQty = data.orderQty ?? data.quantity;
        const unitPrice = data.unitPrice ?? data.orderPrice ?? product.marketPrice ?? 0;
        const actualShippingQty = [data.shippingQty, data.actualQty, data.shippedQty].find((value) => Number(value) > 0);
        const shippingQty = actualShippingQty ?? orderQty ?? 0;
        const lineId = data.id || data.orderLineId || `${item.id}-${index}`;
        const packageInfo = packageBreakdown(data, product, shippingQty);
        return `<tr data-expanded-item="${escapeHtml(lineId)}">
          <td class="shipping-expanded-product" title="${escapeHtml(displayName)}">${escapeHtml(displayName)}</td>
          <td>${escapeHtml(renderShippingRemark(data.remark))}</td>
          <td>${escapeHtml(data.unit || '--')}</td>
          <td>${plainNumber(orderQty)}</td>
          <td>${plainNumber(unitPrice)}</td>
          <td><input class="shipping-expanded-quantity" data-record-expanded-shipping-qty data-unit-price="${escapeHtml(unitPrice)}" data-package-coefficient="${escapeHtml(packageInfo.coefficient)}" type="number" min="0" step="0.01" value="${escapeHtml(decimalNumber(shippingQty))}" aria-label="${escapeHtml(displayName)}发货数量"></td>
          <td data-record-expanded-package-quantity>${escapeHtml(packageInfo.quantity)}</td>
          <td data-record-expanded-package-remainder>${escapeHtml(packageInfo.remainder)}</td>
          <td>${escapeHtml(packageInfo.unit)}</td>
          <td>${escapeHtml(packageInfo.coefficient)}</td>
          <td><span data-record-expanded-subtotal>${decimalNumber(Number(shippingQty) * Number(unitPrice))}</span></td>
          <td>${statusMarkup(sortingLabel(data.status || data.sortingStatus), data.status || data.sortingStatus)}</td>
          <td>${shippingStatus(item)}</td>
          <td><div class="shipping-expanded-date-control"><input data-record-expanded-date type="text" value="${escapeHtml(data.productionDate || '')}" placeholder="请选择日期" readonly aria-label="${escapeHtml(displayName)}生产日期"><span class="shipping-expanded-calendar-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="17" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="9" x2="21" y2="9"></line></svg></span></div></td>
          <td><button class="shipping-expanded-report-button" type="button" data-record-expanded-report aria-label="上传质检报告"><span aria-hidden="true">+</span></button></td>
        </tr>`;
      }).join('')
      : '<tr><td class="shipping-expanded-empty" colspan="15">暂无商品明细</td></tr>';
    return `<div class="shipping-expanded-wrap"><table class="shipping-expanded-table"><colgroup>
      <col class="shipping-nested-product"><col class="shipping-nested-remark"><col class="shipping-nested-unit"><col class="shipping-nested-quantity"><col class="shipping-nested-price"><col class="shipping-nested-shipping-quantity"><col class="shipping-nested-package-quantity"><col class="shipping-nested-package-remainder"><col class="shipping-nested-package-unit"><col class="shipping-nested-package-coefficient"><col class="shipping-nested-amount"><col class="shipping-nested-status"><col class="shipping-nested-status"><col class="shipping-nested-date"><col class="shipping-nested-report">
    </colgroup><thead><tr>
      <th>商品名称（计量单位/品牌/规格）</th><th>备注</th><th>计量单位</th><th>下单数量</th><th>下单单价</th><th>发货数量</th><th>分包数量</th><th>分包尾数</th><th>分包单位</th><th>分包系数</th><th>发货小计</th><th>分拣状态</th><th>发货状态</th><th>生产日期</th><th>质检报告</th>
    </tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  const shippingToolbar = [
    { key: 'batchShip', label: '一键发货', primary: true, batchTransition: 'ship', message: '是否确定发货？' },
    { key: 'print', label: '打印', icon: 'supplier-purchase-print', side: true, toast: '已生成发货单打印预览' },
    { key: 'export', label: '导出', icon: 'supplier-purchase-export' }
  ];

  const shippingColumns = [
    { key: 'customerName', label: '客户名称' },
    { key: 'canteen', label: '食堂' },
    { key: 'receiver', label: '收货人' },
    { key: 'phone', label: '收货手机' },
    { key: 'address', label: '收货地址' },
    { key: 'route', label: '线路' },
    { key: 'shippingAmount', label: '发货金额', format: 'money' },
    { key: 'printed', label: '是否打印' },
    { key: 'sortingStatus', label: '分拣状态', render: sortingStatus },
    { key: 'status', label: '发货状态', render: shippingStatus }
  ];

  const orderColumns = [
    { key: 'orderNo', label: '订单号', link: true },
    { key: 'customerName', label: '客户名称' },
    { key: 'canteen', label: '食堂' },
    { key: 'orderTag', label: '订单标签' },
    { key: 'receiver', label: '收货人' },
    { key: 'phone', label: '收货手机' },
    { key: 'address', label: '收货地址' },
    { key: 'shippingAmount', label: '发货金额', format: 'money' },
    { key: 'printCount', label: '打印次数', render: (item) => escapeHtml(item.printCount ?? (item.printed === '是' ? 1 : 0)) },
    { key: 'sortingStatus', label: '分拣状态', render: sortingStatus },
    { key: 'status', label: '发货状态', render: shippingStatus }
  ];

  const shippingRowActions = [
    { key: 'ship', label: '发货出库', transition: 'ship', visible: ['PENDING'], confirmTitle: '发货出库', message: '是否确定发货？' },
    { key: 'print', label: '打印', toast: '已生成发货单打印预览' }
  ];

  window.RecordPageConfig = {
    title: '发货管理',
    pageClass: 'order-module-page shipping-management-page',
    manualFilterLayout: true,
    usePagination: true,
    showSelectionSummary: false,
    resource: 'shippingOrders',
    filters: orderFilters,
    columns: shippingColumns,
    hideSequence: true,
    tabs: [
      {
        key: 'shipping',
        label: '发货出库',
        resource: 'shippingOrders',
        filters: [...primaryFilters, ...shippingAdvancedFilters],
        columns: shippingColumns,
        expandable: true,
        renderExpandedRow: renderShippingExpandedRow,
        toolbar: shippingToolbar,
        rowActions: shippingRowActions
      },
      {
        key: 'orders',
        label: '订单发货出库',
        resource: 'shippingOrders',
        filters: orderFilters,
        columns: orderColumns,
        expandable: true,
        renderExpandedRow: renderShippingExpandedRow,
        toolbar: shippingToolbar,
        rowActions: shippingRowActions
      },
      {
        key: 'difference',
        label: '发货差异表',
        resource: 'shippingDifferences',
        filters: differenceFilters,
        columns: [
          { key: 'goodsName', label: '商品名称（计量单位/品牌/规格）', productDisplay: true },
          { key: 'remark', label: '备注', render: (item) => escapeHtml(sortingDetail(item).remark || item.remark || '--') },
          { key: 'sortingStatus', label: '分拣状态', render: sortingStatus },
          { key: 'unit', label: '计量单位', render: (item) => escapeHtml(sortingDetail(item).unit || item.unit || '--') },
          { key: 'stockQty', label: '库存数量' },
          { key: 'sortingQty', label: '分拣数量' },
          { key: 'differenceQty', label: '差异' }
        ],
        hideRowActions: true,
        toolbar: [
          { key: 'batchOverflow', label: '一键报溢', primary: true, batchTransition: 'complete', message: '请再次确认是否一键报溢？' }
        ],
        rowActions: [
          { key: 'complete', label: '一键报溢', transition: 'complete', visible: ['PENDING'], confirmTitle: '一键报溢', message: '请再次确认是否一键报溢？' }
        ]
      }
    ],
    toolbar: shippingToolbar,
    statusMap: {
      PENDING: ['未发货', 'warning'],
      SHIPPED: ['已发货', 'success'],
      COMPLETED: ['已处理', 'success']
    }
  };
})();
