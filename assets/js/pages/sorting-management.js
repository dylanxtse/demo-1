(function () {
  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function todayStr() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  const defaultDate = todayStr();
  const orderMealOptions = window.OrderMealOptions || ['早餐', '午餐', '晚餐', '早点', '午点', '晚点'];
  const customerService = window.SortingCustomerService;
  const customerOptions = (resource, key) => [...new Set((window.DemoStore.get(resource) || []).map((item) => item[key]).filter(Boolean))];
  function openCustomerPrintTemplate(groups) {
    const printKey = `customer-sorting-print-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const payload = {
      version: '20260929-customer-sorting-print-template-1',
      companyName: '阳光智园',
      sourceUrl: 'https://gxyc.canantong.com:4403/sortingManagementList',
      printedAt: new Date().toISOString(),
      rows: (Array.isArray(groups) ? groups : []).flatMap((group) => group.items || [])
    };
    const serializedPayload = JSON.stringify(payload);
    let query = `printData=${encodeURIComponent(serializedPayload)}`;
    try {
      if (window.sessionStorage?.setItem) {
        window.sessionStorage.setItem(printKey, serializedPayload);
        query = `printKey=${encodeURIComponent(printKey)}`;
      }
    } catch (error) { /* 临时缓存不可用时使用 URL 数据兜底。 */ }
    navigate(`./customer-sorting-print-template.html?${query}`);
  }

  const printCustomers = (groups) => openCustomerPrintTemplate(groups);
  const printCustomerLabels = (groups) => openSortingLabelTemplate(
    (Array.isArray(groups) ? groups : []).flatMap((group) => group.items || []), 'customer'
  );
  function navigate(url) {
    if (window.AppNavigation?.navigate) window.AppNavigation.navigate(url);
    else window.location.href = url;
  }

  function openSortingPrintTemplate(rows) {
    const printKey = `sorting-print-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const payload = {
      version: '20260929-sorting-print-template-1',
      companyName: '阳光智园',
      sourceUrl: 'https://gxyc.canantong.com:4403/sortingManagementList',
      printedAt: new Date().toISOString(),
      rows: Array.isArray(rows) ? rows : []
    };
    const serializedPayload = JSON.stringify(payload);
    let query = `printData=${encodeURIComponent(serializedPayload)}`;
    try {
      if (window.sessionStorage?.setItem) {
        window.sessionStorage.setItem(printKey, serializedPayload);
        query = `printKey=${encodeURIComponent(printKey)}`;
      }
    } catch (error) { /* 读取不到临时缓存时使用 URL 数据兜底。 */ }
    navigate(`./sorting-print-template.html?${query}`);
  }

  const printSortingDocument = (items) => openSortingPrintTemplate(items);

  function openSortingLabelTemplate(rows, mode) {
    const products = window.DemoStore.get('products') || [];
    const orders = window.DemoStore.get('orders') || [];
    const productByCode = new Map();
    [...(window.MockProducts || []), ...products].forEach((product) => {
      [product.code, product.productId, product.id].filter(Boolean).forEach((code) => {
        const previous = productByCode.get(String(code));
        productByCode.set(String(code), {
          ...product,
          storageCondition: product.storageCondition && product.storageCondition !== '--'
            ? product.storageCondition : previous?.storageCondition || ''
        });
      });
    });
    const orderById = new Map(orders.filter((order) => order.id).map((order) => [String(order.id), order]));
    const orderByNo = new Map(orders.filter((order) => order.orderNo).map((order) => [String(order.orderNo), order]));
    const mealNames = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', morningSnack: '早点', afternoonSnack: '午点', eveningSnack: '晚点' };
    const payload = {
      version: '20261019-sorting-label-print-1',
      mode,
      printedAt: new Date().toISOString(),
      rows: (Array.isArray(rows) ? rows : []).map((row) => {
        const product = productByCode.get(String(row.productId || ''))
          || productByCode.get(String(row.goodsCode || row.productCode || ''));
        const order = orderById.get(String(row.orderId || '')) || orderByNo.get(String(row.orderNo || ''));
        const meal = order?.mealName || order?.mealKey || row.mealName || row.mealKey || '';
        return {
          ...row,
          storageCondition: product?.storageCondition || row.storageCondition || '',
          mealName: window.OrderMealNameByKey?.[meal] || mealNames[meal] || meal
        };
      })
    };
    const printKey = `sorting-label-print-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const serializedPayload = JSON.stringify(payload);
    let stored = false;
    for (const storageName of ['sessionStorage', 'localStorage']) {
      try {
        const storage = window[storageName];
        storage?.setItem(printKey, serializedPayload);
        if (storage?.getItem(printKey) === serializedPayload) {
          stored = true;
          break;
        }
      } catch (error) { /* 尝试下一个浏览器存储。 */ }
    }
    if (!stored) {
      window.alert('无法保存打印数据，请检查浏览器存储空间后重试');
      return;
    }
    navigate(`./sorting-label-print.html?printKey=${encodeURIComponent(printKey)}`);
  }

  const printSortingLabels = (items) => openSortingLabelTemplate(items, 'product');

  function openSortingCustomerExportTemplate(groups) {
    const exportKey = `sorting-customer-export-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const payload = {
      version: '20260929-sorting-customer-export-template-1',
      exportedAt: new Date().toISOString(),
      groups: Array.isArray(groups) ? groups : []
    };
    const serializedPayload = JSON.stringify(payload);
    let query = `exportData=${encodeURIComponent(serializedPayload)}`;
    try {
      if (window.sessionStorage?.setItem) {
        window.sessionStorage.setItem(exportKey, serializedPayload);
        query = `exportKey=${encodeURIComponent(exportKey)}`;
      }
    } catch (error) { /* 读取不到临时缓存时使用 URL 数据兜底。 */ }
    navigate(`./sorting-customer-export-template.html?${query}`);
  }

  function renderCustomerOrders(group) {
    return `<div class="sorting-customer-orders-wrap"><table class="sorting-customer-orders"><thead><tr>
      <th>订单号</th><th>订单标签</th><th>商品种类</th><th>下单金额</th><th>分拣状态</th><th>是否发货</th><th>订单状态</th>
      </tr></thead><tbody>${group.orders.map((order) => `<tr>
      <td><button class="cell-link" type="button" data-cell-href="./order-detail.html?id=${encodeURIComponent(order.id)}">${escapeHtml(order.orderNo)}</button></td>
      <td>${escapeHtml(order.orderTag || '--')}</td><td>${order.goodsCount}</td><td>${order.displayAmount.toFixed(2)}</td>
      <td><span class="operation-status ${order.sortingStatus === 'SORTED' ? 'success' : order.sortingStatus === 'PARTIAL' ? 'warning' : 'danger'}">${customerService.statusText[order.sortingStatus]}</span></td>
      <td>${order.shipped ? '已发货' : '未发货'}</td><td>${escapeHtml(window.BusinessRules.statusLabel('orders', order.status))}</td>
      </tr>`).join('') || '<tr><td colspan="7" class="empty-cell">暂无关联订单</td></tr>'}</tbody></table></div>`;
  }

  function renderGoodsName(item) {
    const name = escapeHtml(window.DomUtils?.formatProductDisplay?.(item) || item.goodsName || '--');
    const marker = window.OperationsService?.isNetVegetable?.(item)
      ? '<span class="net-vegetable-tag">净菜</span>'
      : '';
    return `<span class="product-display-text">${marker}${name}</span>`;
  }

  function renderProgress(item) {
    const actual = Number(item.actualQty || 0);
    const order = Number(item.orderQty || 0);
    const unit = escapeHtml(item.unit || '');
    return `${actual}/${order}${unit}`;
  }

  function packageBreakdown(item) {
    if (Number(item.packageCoefficient) > 0 && Number.isFinite(Number(item.packageCount))) return item;
    return window.SortingPackageBreakdown?.calculate(item, item.orderQty) || null;
  }

  function renderSortingSpec(item) {
    const breakdown = packageBreakdown(item);
    return breakdown ? escapeHtml(breakdown.packageUnit || '--') : '--';
  }

  function renderSortingCoefficient(item) {
    const breakdown = packageBreakdown(item);
    return breakdown ? escapeHtml(breakdown.packageCoefficient) : '--';
  }

  function renderSortingQty(item) {
    const breakdown = packageBreakdown(item);
    return breakdown ? String(breakdown.packageCount) : '--';
  }

  function renderSortingRemainder(item) {
    const breakdown = packageBreakdown(item);
    return breakdown ? String(breakdown.packageRemainder) : '--';
  }

  function isShortage(item) {
    return item.shortage === '是';
  }

  function renderStatus(item) {
    const status = window.RecordPageConfig.statusMap[item.status] || [item.status || '--', ''];
    let html = `<span class="operation-status ${status[1]}">${escapeHtml(status[0])}</span>`;
    if (isShortage(item)) html += '<span class="operation-status danger" style="margin-left:4px">缺货</span>';
    return html;
  }

  const productColumns = [
    { key: 'goodsName', label: '商品名称（计量单位/品牌/规格）', render: renderGoodsName },
    { key: 'orderNo', label: '所属订单号', href: (item) => {
      const orderId = item.orderId || window.DemoStore?.get('orders')?.find((order) => order.orderNo === item.orderNo)?.id || '';
      return `./order-detail.html?id=${encodeURIComponent(orderId)}&orderNo=${encodeURIComponent(item.orderNo || '')}`;
    } },
    { key: 'customerName', label: '客户名称' },
    { key: 'canteen', label: '食堂' },
    { key: 'orderQty', label: '下单数量' },
    { key: 'actualQty', label: '实际数量', editableNumber: true, blankZero: true, placeholder: '请输入' },
    { key: 'unit', label: '计量单位' },
    { key: 'sortingQty', label: '分包数量', render: renderSortingQty },
    { key: 'sortingRemainder', label: '分包尾数', render: renderSortingRemainder },
    { key: 'sortingSpec', label: '分包单位', render: renderSortingSpec },
    { key: 'sortingCoefficient', label: '分包系数', render: renderSortingCoefficient },
    { key: 'shipped', label: '是否发货' },
    { key: 'progress', label: '分拣进度', render: renderProgress },
    { key: 'remark', label: '备注' },
    { key: 'stock', label: '库存' },
    { key: 'status', label: '分拣状态', render: renderStatus },
    { key: 'sorter', label: '分拣员' },
    { key: 'sortingAt', label: '分拣时间' },
    { key: 'route', label: '线路' }
  ];
  const customerColumns = [
    { key: 'customerName', label: '客户名称' },
    { key: 'canteen', label: '食堂' },
    { key: 'route', label: '线路' },
    { key: 'receiver', label: '收货人' },
    { key: 'phone', label: '收货手机' },
    { key: 'address', label: '收货地址' },
    { key: 'status', label: '单据状态', format: 'status' }
  ];
  window.RecordPageConfig = {
    title: '分拣管理',
    initialTab: new URLSearchParams(window.location.search).get('view') || window.location.hash.slice(1),
    pageClass: 'sorting-module-page sorting-status-boxed',
    usePagination: true,
    statusActionsInline: true,
    showSelectionSummary: false,
    resource: 'sortingItems',
    defaultCondition: { expectedAt: defaultDate },
    filters: [
      { key: 'expectedAt', label: '期望送达时间', type: 'date', defaultValue: defaultDate },
      { key: 'warehouse', label: '仓库', options: ['中心仓', '北区仓', '临时仓'] },
      { key: 'goodsName', label: '商品名称', placeholder: '请输入' },
      { key: 'isNetVegetable', label: '是否净菜', options: [
        { label: '是', value: 'true' },
        { label: '否', value: 'false' }
      ] },
      { key: 'category', label: '商品分类', options: ['果蔬', '蛋奶类', '水产品', '主食', '肉类'] },
      { key: 'sorter', label: '分拣员', options: ['陈分拣', '李分拣', '王分拣'] },
      { key: 'supplier', label: '供应商/采购员', placeholder: '请输入' },
      { key: 'route', label: '线路', options: ['东城一线', '南城二线', '北城一线', '西城一线'] },
      { key: 'shortage', label: '是否缺货', options: ['是', '否'] },
      { key: 'customerName', label: '客户名称', placeholder: '请输入' },
      { key: 'stockLevel', label: '库存', options: ['有库存', '库存不足'] },
      { key: 'orderTag', label: '订单标签', options: ['营养餐', '普通餐'] },
      { key: 'orderNo', label: '订单号', placeholder: '请输入' },
      { key: 'mealName', label: '订单餐次', emptyLabel: '请选择', placeholderOnly: true, options: orderMealOptions }
    ],
    columns: productColumns,
    tabs: [
      {
        key: 'product',
        label: '商品分拣',
        resource: 'sortingItems',
        columns: productColumns,
        statusTabs: [
          { label: '未分拣', value: 'PENDING' },
          { label: '已分拣', value: 'SORTED' },
          { label: '全部', value: '' }
        ],
        toolbar: [
          {
            key: 'batchSort',
            label: '一键分拣',
            primary: true,
            requiresSelection: true,
            batchTransition: 'sort',
            message: '确定一键分拣选中商品吗？',
            dropdownVisibleStatuses: [''],
            defaultActionByStatus: { SORTED: 'batchResetSort' },
            labelByStatus: { SORTED: '一键重置分拣' },
            dropdownOptions: [
              { key: 'batchResetSort', label: '一键重置分拣', requiresSelection: true, batchTransition: 'resetSort', message: '确定一键重置选中商品的分拣状态吗？', visibleStatuses: ['SORTED', 'PARTIAL', ''] }
            ]
          },
          { key: 'batchShortage', label: '批量标记缺货', primary: true, batchTransition: 'markShortage', message: '确定标记选中商品为缺货？', visibleStatuses: ['PENDING', ''] },
          {
            key: 'batchPrintQr',
            label: '一键打印',
            primary: true,
            requiresSelection: true,
            onClick: printSortingLabels
          },
          {
            key: 'export',
            label: '导出',
            icon: 'supplier-purchase-export',
            openMenuOnMain: true,
            dropdownOptions: [
              { key: 'exportIndependent', label: '独立导出', templateHref: './sorting-independent-export.html' },
              { key: 'exportMerged', label: '商品归并导出', templateHref: './sorting-merge-export.html' }
            ]
          },
          { key: 'printDocument', label: '打印', icon: 'supplier-purchase-print', side: true, onClick: printSortingDocument }
        ],
        rowActions: [
          { key: 'sort', label: '分拣', onClick: (item) => printSortingLabels([item]), visible: ['PENDING', 'PARTIAL'], disabled: isShortage },
          { key: 'markShortage', label: '标记缺货', transition: 'markShortage', visibleFn: (item) => !isShortage(item) && ['PENDING', 'PARTIAL'].includes(item.status), message: '确定标记该商品为缺货？' },
          { key: 'cancelShortage', label: '取消缺货', transition: 'cancelShortage', visibleFn: isShortage, message: '确定要取消该商品缺货状态吗？' },
          { key: 'resetSort', label: '重置', transition: 'resetSort', visible: ['SORTED', 'PARTIAL'], message: '确定重置该商品分拣状态和实际数量？' },
          { key: 'print', label: '打印', onClick: (item) => printSortingLabels([item]) }
        ]
      },
      {
        key: 'customer',
        label: '客户分拣',
        resource: 'sortingProgress',
        service: customerService,
        defaultStatus: '',
        hideSequence: true,
        expandable: true,
        renderExpandedRow: renderCustomerOrders,
        filters: [
          { key: 'expectedAt', label: '期望送达时间', type: 'date' },
          { key: 'warehouse', label: '仓库', options: customerOptions('sortingItems', 'warehouse') },
          { key: 'goodsName', label: '商品名称', placeholder: '请输入' },
          { key: 'category', label: '商品分类', options: customerService.filterOptions('category') },
          { key: 'sorter', label: '分拣员', options: customerOptions('sortingItems', 'sorter') },
          { key: 'route', label: '线路', options: customerOptions('sortingItems', 'route') },
          { key: 'sortingStatus', label: '分拣状态', options: [{ label: '未分拣', value: 'PENDING' }, { label: '部分分拣', value: 'PARTIAL' }, { label: '已分拣', value: 'SORTED' }] },
          { key: 'shortage', label: '是否缺货', options: ['是', '否'] },
          { key: 'customerName', label: '客户名称', options: customerOptions('sortingItems', 'customerName') },
          { key: 'sortingThreshold', label: '分拣阈值', options: ['超出下单数量', '不足下单数量'] },
          { key: 'stockLevel', label: '库存', options: ['有库存', '库存不足'] },
          { key: 'orderTag', label: '订单标签', options: customerOptions('orders', 'orderTag') },
          { key: 'orderNo', label: '订单号', placeholder: '请输入' },
          { key: 'mealName', label: '订单餐次', emptyLabel: '请选择', placeholderOnly: true, options: orderMealOptions }
        ],
        columns: customerColumns,
        statusTabs: [
          { label: '未分拣', value: 'PENDING,PARTIAL' },
          { label: '已分拣', value: 'SORTED' },
          { label: '全部', value: '' }
        ],
        toolbar: [
          {
            key: 'batchSort',
            label: '一键分拣',
            primary: true,
            requiresSelection: true,
            batchTransition: 'sort',
            message: '确定分拣选中客户下可分拣的商品吗？已分拣、已发货和缺货商品将跳过。',
            dropdownVisibleStatuses: [''],
            defaultActionByStatus: { SORTED: 'batchResetSort' },
            labelByStatus: { SORTED: '一键重置分拣' },
            dropdownOptions: [
              { key: 'batchResetSort', label: '一键重置分拣', requiresSelection: true, batchTransition: 'resetSort', message: '确定重置选中客户下已分拣、未发货的商品吗？', visibleStatuses: ['SORTED', ''] }
            ]
          },
          { key: 'batchShortage', label: '批量标记缺货', primary: true, requiresSelection: true, batchTransition: 'markShortage', message: '确定将选中客户下尚未分拣、未发货的商品标记缺货吗？' },
          { key: 'batchPrint', label: '一键打印', primary: true, requiresSelection: true, onClick: printCustomerLabels },
          { key: 'printDocument', label: '打印', icon: 'supplier-purchase-print', side: true, onClick: printCustomers },
          { key: 'export', label: '导出', icon: 'supplier-purchase-export', onClick: openSortingCustomerExportTemplate }
        ],
        rowActions: [
          {
            key: 'sort',
            label: '分拣',
            href: (item) => `./sorting-customer-detail.html?group=${encodeURIComponent(item.id)}&customer=${encodeURIComponent(item.customerName)}&canteen=${encodeURIComponent(item.canteen)}&date=${encodeURIComponent(item.expectedAt)}`
          },
          { key: 'print', label: '打印拣货单', onClick: (item) => printCustomers([item]) }
        ]
      }
    ],
    toolbar: [],
    statusMap: {
      PENDING: ['未分拣', 'danger'],
      PARTIAL: ['部分分拣', 'warning'],
      SORTED: ['已分拣', 'success'],
      SHORTAGE: ['缺货', 'danger']
    }
  };
})();
