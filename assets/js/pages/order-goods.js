(function () {
  const service = window.OperationsService;
  const content = `<section class="page-card operations-page order-module-page order-goods-page">
    <div class="operations-tabs order-view-tabs"><a class="operations-tab" href="./order-management.html">订单列表</a><a class="operations-tab active" href="./order-goods.html">订单商品</a></div>
    <div class="operations-filter filter-section">
      <div class="operations-filter-main">
        <div class="operations-filter-grid">
          <div class="operations-field"><label class="filter-label" for="goodsExpectedAt">期望送达时间</label><div class="date-input-control"><input class="filter-input" id="goodsExpectedAt" readonly placeholder="请选择日期"><span class="date-range-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></span></div></div>
          <div class="operations-field"><label class="filter-label" for="goodsCategory">商品分类</label><select class="filter-select" id="goodsCategory"><option value="">请选择商品分类</option><option>果蔬</option><option>蛋奶类</option><option>粮食类</option><option>水产品</option></select></div>
          <div class="operations-field"><label class="filter-label" for="goodsKeyword">商品名称</label><input class="filter-input" id="goodsKeyword" placeholder="请输入"></div>
        </div>
        <div class="operations-filter-actions"><button class="operations-filter-toggle" type="button" id="goodsAdvancedToggle">高级筛选<span class="toggle-arrow">▾</span></button><button class="btn btn-primary btn-sm" id="goodsQuery">查询</button><button class="btn btn-sm" id="goodsReset">重置</button></div>
      </div>
      <div class="operations-filter-advanced" id="goodsAdvancedFilters"><div class="operations-filter-grid">
        <div class="operations-field"><label class="filter-label" for="goodsCustomerType">客户类型</label><select class="filter-select" id="goodsCustomerType"><option value="">全部</option><option>学校</option><option>幼儿园</option><option>机关单位</option></select></div>
        <div class="operations-field"><label class="filter-label" for="goodsOrderTag">订单标签</label><select class="filter-select" id="goodsOrderTag"><option value="">全部</option><option>营养餐</option><option>普通餐</option><option>应急保供</option></select></div>
        <div class="operations-field"><label class="filter-label" for="goodsOrderStatus">单据状态</label><select class="filter-select" id="goodsOrderStatus"><option value="">全部</option><option value="DRAFT">暂存</option><option value="PENDING_CONFIRM">待确认</option><option value="PENDING_AUDIT">待审核</option><option value="READY_FOR_SORTING">待分拣</option><option value="READY_FOR_SHIPPING">待发货</option><option value="REJECTED">已驳回</option><option value="SHIPPED">已发货</option><option value="CLOSED">已关闭</option></select></div>
        <div class="operations-field"><label class="filter-label" for="goodsSupplement">是否补单</label><select class="filter-select" id="goodsSupplement"><option value="">全部</option><option>是</option><option>否</option></select></div>
        <div class="operations-field"><label class="filter-label" for="goodsOrderNo">订单号</label><input class="filter-input" id="goodsOrderNo" maxlength="40" placeholder="请输入订单号"></div>
        <div class="operations-field"><label class="filter-label" for="goodsWarehouse">仓库</label><select class="filter-select" id="goodsWarehouse"><option value="">全部</option><option>中心仓</option><option>北区仓</option><option>临时仓</option></select></div>
        <div class="operations-field"><label class="filter-label" for="goodsSource">单据来源</label><select class="filter-select" id="goodsSource"><option value="">全部</option><option>客户下单</option><option>平台添加</option></select></div>
        <div class="operations-field"><label class="filter-label" for="goodsReceiptStatus">收货状态</label><select class="filter-select" id="goodsReceiptStatus"><option value="">全部</option><option>待收货</option><option>部分收货</option><option>已收货</option><option>未收货</option></select></div>
        <div class="operations-field"><label class="filter-label" for="goodsOrderType">订单类型</label><select class="filter-select" id="goodsOrderType"><option value="">全部</option><option>销售订单</option><option>临时订单</option></select></div>
        <div class="operations-field"><label class="filter-label" for="goodsNetVegetable">是否净菜</label><select class="filter-select" id="goodsNetVegetable"><option value="">全部</option><option value="net">净菜</option><option value="non-net">非净菜</option></select></div>
      </div></div>
    </div>
    <div class="operations-toolbar"><span></span><button class="btn btn-sm" id="goodsExport">导出</button></div>
    <div class="operations-table-container"><div class="operations-table-wrap"><table class="operations-table order-goods-table"><thead><tr><th>序号</th><th>订单号</th><th>商品名称（计量单位/品牌/规格）</th><th>客户名称</th><th>食堂</th><th>客户类型</th><th>订单标签</th><th>计量单位</th><th>下单单价</th><th>下单数量</th><th>下单小计</th><th>发货数量</th><th>发货小计</th><th>期望送达时间</th><th class="status-column">单据状态</th><th>收货状态</th><th>仓库</th><th>备注</th><th>线路</th><th>添加人</th></tr></thead><tbody id="orderGoodsBody"></tbody></table></div>
    <div class="pagination" id="orderGoodsPagination"><span class="page-total"></span></div></div>
  </section>`;
  const root = window.AppShell.mount({ title: '订单管理', content });
  let rows = [];
  const statusMap = { DRAFT: '暂存', PENDING: '待审核', PENDING_CONFIRM: '待确认', PENDING_AUDIT: '待审核', READY_FOR_SORTING: '待分拣', READY_FOR_SHIPPING: '待发货', REJECTED: '已驳回', APPROVED: '已审核', CONFIRMED: '已确认', SHIPPED: '已发货', COMPLETED: '已完成', CLOSED: '已关闭' };
  const statusClassMap = { DRAFT: 'info', PENDING: 'warning', PENDING_CONFIRM: 'warning', PENDING_AUDIT: 'warning', READY_FOR_SORTING: 'info', READY_FOR_SHIPPING: 'warning', REJECTED: 'danger', APPROVED: 'success', CONFIRMED: 'success', SHIPPED: 'success', COMPLETED: 'success', CLOSED: 'danger' };
  const esc = (value) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const money = (value) => Number(value || 0).toFixed(2);
  const productIsNetVegetable = (line) => {
    const code = line.productId || line.productCode || line.goodsCode || line.goodsId;
    const catalogProduct = (window.DemoStore?.get('products') || window.MockProducts || []).find((product) => product.code === code || product.id === code);
    if (catalogProduct) return Boolean(catalogProduct.isNetVegetable);
    return Boolean(line.isNetVegetable);
  };
  const datePicker = window.DatePicker?.mount({ input: '#goodsExpectedAt', panelId: 'orderGoodsExpectedPicker' });

  function categoryFor(line) {
    if (line.category) return line.category;
    const name = String(line.goodsName || '');
    if (/白菜|西红柿|蔬菜/.test(name)) return '果蔬';
    if (/鸡蛋|牛奶/.test(name)) return '蛋奶类';
    if (/大米|面粉/.test(name)) return '粮食类';
    if (/鱼|虾/.test(name)) return '水产品';
    return '其他';
  }

  async function load() {
    const result = await service.list('orders', { page: 1, pageSize: 10000 });
    const keyword = document.getElementById('goodsKeyword').value.trim();
    const expected = document.getElementById('goodsExpectedAt').value;
    const category = document.getElementById('goodsCategory').value;
    const customerType = document.getElementById('goodsCustomerType').value;
    const orderTag = document.getElementById('goodsOrderTag').value;
    const orderStatus = document.getElementById('goodsOrderStatus').value;
    const supplement = document.getElementById('goodsSupplement').value;
    const orderNo = document.getElementById('goodsOrderNo').value.trim();
    const warehouse = document.getElementById('goodsWarehouse').value;
    const source = document.getElementById('goodsSource').value;
    const receiptStatus = document.getElementById('goodsReceiptStatus').value;
    const orderType = document.getElementById('goodsOrderType').value;
    const netVegetable = document.getElementById('goodsNetVegetable').value;
    rows = result.items.flatMap((order) => (order.items?.length ? order.items : [{ goodsName: '大白菜（斤/--/散装）', unit: '斤', quantity: order.productCount || 1, unitPrice: order.productCount ? order.orderAmount / order.productCount : order.orderAmount }]).map((line) => ({ ...line, order })))
      .filter(({ order, ...line }) =>
        (!keyword || String(line.goodsName || '').includes(keyword)) &&
        (!expected || String(order.expectedAt || '').startsWith(expected)) &&
        (!category || categoryFor(line) === category) &&
        (!customerType || order.customerType === customerType) &&
        (!orderTag || order.orderTag === orderTag) &&
        (!orderStatus || order.status === orderStatus) &&
        (!supplement || order.supplement === supplement) &&
        (!orderNo || String(order.orderNo || '').includes(orderNo)) &&
        (!warehouse || order.warehouse === warehouse) &&
        (!source || order.source === source) &&
        (!receiptStatus || order.receiptStatus === receiptStatus) &&
        (!orderType || (order.orderType || '销售订单') === orderType) &&
        (!netVegetable || (netVegetable === 'net' ? productIsNetVegetable(line) : !productIsNetVegetable(line))));
    document.getElementById('orderGoodsBody').innerHTML = rows.length ? rows.map(({ order, ...line }, index) => {
      const productDisplay = window.DomUtils.formatProductDisplay(line);
      const productTag = productIsNetVegetable(line) ? '<span class="net-vegetable-tag">净菜</span>' : '';
      return `<tr>
      <td>${index + 1}</td><td><a class="cell-link order-goods-link" href="./order-detail.html?id=${encodeURIComponent(order.id)}"><span>${esc(order.orderNo)}</span><small>${esc(order.createdAt || '--')}</small></a></td><td><span class="product-display-text" title="${esc(productDisplay)}">${productTag}${esc(productDisplay)}</span></td><td>${esc(order.customerName)}</td><td>${esc(order.canteen)}</td><td>${esc(order.customerType)}</td><td>${esc(order.orderTag)}</td><td>${esc(line.unit)}</td><td>${money(line.unitPrice)}</td><td>${line.quantity || 0}</td><td>${money((line.quantity || 0) * (line.unitPrice || 0))}</td><td>${line.shippedQty || 0}</td><td>${money(line.shippedAmount)}</td><td>${esc(order.expectedAt)}</td><td class="status-column"><span class="operation-status ${statusClassMap[order.status] || 'info'}">${esc(statusMap[order.status] || order.status)}</span></td><td>${esc(order.receiptStatus || '--')}</td><td>${esc(order.warehouse || '--')}</td><td>${esc(line.remark || order.remark || '--')}</td><td>${esc(order.route || '--')}</td><td>${esc(order.creator || '--')}</td>
    </tr>`;
    }).join('') : '<tr><td class="empty-cell" colspan="20">暂无数据</td></tr>';
    document.querySelector('#orderGoodsPagination .page-total').textContent = `共 ${rows.length} 条数据`;
  }

  root.addEventListener('click', (event) => {
    if (event.target.closest('#goodsAdvancedToggle')) {
      document.getElementById('goodsAdvancedToggle').classList.toggle('is-active');
      document.getElementById('goodsAdvancedFilters').classList.toggle('is-visible');
    }
    if (event.target.closest('#goodsQuery')) load();
    if (event.target.closest('#goodsReset')) {
      root.querySelectorAll('.operations-filter input, .operations-filter select').forEach((control) => { control.value = ''; });
      datePicker?.clear(false);
      load();
    }
    if (event.target.closest('#goodsExport')) window.alert('订单商品导出已按当前筛选条件准备。');
  });
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && event.target.closest('.operations-filter')) load();
  });
  load();
})();
