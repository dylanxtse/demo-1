(function () {
  const service = window.OperationsService;
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode') || 'add';
  const id = params.get('id') || '';
  const relatedOrderId = params.get('orderId') || '';
  const returnType = params.get('returnType') === 'partial' ? 'partial' : 'full';
  const readonly = mode === 'audit';
  const root = window.AppShell.mount({ title: '订单退货', content: document.getElementById('returnFormTemplate').innerHTML });
  const overlay = document.getElementById('returnOverlay');
  const body = document.getElementById('returnGoodsBody');
  const status = document.getElementById('returnStatus');
  const reasonInput = document.getElementById('reason');
  const reasonMenu = document.getElementById('returnReasonMenu');
  const remarkInput = document.getElementById('returnRemark');
  const remarkCount = document.getElementById('returnRemarkCount');
  const orderAction = document.getElementById('returnOrderAction');
  let record = null;
  let lines = [];
  let attachment = '';
  let orderPicker = null;
  let orderDateRangePicker = null;
  let productPicker = null;
  let selectionMode = '';

  document.getElementById('returnPageTitle').textContent = mode === 'edit' ? '编辑退货单' : mode === 'audit' ? '审核退货单' : '添加退货单';
  document.title = `${document.getElementById('returnPageTitle').textContent} - 集采企业版企业端`;
  document.getElementById('returnCancel').textContent = readonly ? '返回' : '取消';
  document.getElementById('returnReject').hidden = !readonly;
  if (readonly) {
    document.getElementById('returnPrimary').textContent = '通过';
    document.getElementById('returnPrimary').dataset.action = 'approve';
    document.getElementById('chooseOrder').hidden = true;
    document.getElementById('uploadAttachment').hidden = true;
  }

  function syncOrderAction() {
    if (!orderAction) return;
    orderAction.hidden = readonly || document.getElementById('returnMode').value !== 'RELATED';
  }

  function syncSelectedOrder(orderNo = document.getElementById('orderNo')?.value || '') {
    const display = document.getElementById('returnSelectedOrderNo');
    if (!display) return;
    display.textContent = orderNo;
    display.hidden = !orderNo;
  }

  function syncCustomGoodsAction() {
    const toolbar = document.getElementById('returnGoodsToolbar');
    const button = document.getElementById('addReturnGoods');
    if (!toolbar || !button) return;
    const isUnrelated = document.getElementById('returnMode').value === 'UNRELATED';
    const hasCustomer = Boolean(document.getElementById('customerName').value);
    const hasCanteen = Boolean(document.getElementById('canteen').value);
    const canAdd = !readonly && isUnrelated && hasCustomer && hasCanteen;
    toolbar.hidden = !canAdd;
    button.hidden = !canAdd;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function money(value) {
    return Number(value || 0).toFixed(2);
  }

  function setSelectValue(id, value) {
    const select = document.getElementById(id);
    if (!select) return;
    if (value && ![...select.options].some((option) => option.value === String(value))) {
      select.add(new Option(String(value), String(value)));
    }
    select.value = value || '';
    select.classList.toggle('has-value', Boolean(select.value));
  }

  function setReasonMenuVisible(visible) {
    if (!reasonMenu || readonly) return;
    reasonMenu.hidden = !visible;
  }

  function syncRemarkCount() {
    if (remarkInput && remarkCount) remarkCount.textContent = `${remarkInput.value.length}/100`;
  }

  function closeOverlay() {
    orderDateRangePicker?.destroy?.();
    orderDateRangePicker = null;
    orderPicker = null;
    productPicker = null;
    overlay.innerHTML = '';
  }

  function back(flag) {
    window.AppNavigation?.navigate?.(`./order-return.html${flag ? `?${flag}=1` : ''}`);
  }

  function toast(message, isError) {
    status.textContent = message;
    status.className = `order-form-status is-visible${isError ? ' error' : ''}`;
    window.setTimeout(() => { status.className = 'order-form-status'; }, 2400);
  }

  function normalizeOrderLines(order, full) {
    const source = order.items?.length ? order.items : order.orderLines?.length ? order.orderLines : [{
      goodsId: 'GOOD-001',
      goodsName: '大白菜（斤/--/散装）',
      unit: '斤',
      quantity: order.productCount || 1,
      unitPrice: order.productCount ? order.orderAmount / order.productCount : order.orderAmount
    }];
    return source.map((item, index) => {
      const shippedQty = Number(item.shippedQty ?? item.quantity ?? item.orderQty ?? 0);
      const returnedQty = Number(item.returnedQty ?? item.returnQty ?? item.returnedQuantity ?? 0);
      const availableQty = Math.max(0, shippedQty - returnedQty);
      const orderPrice = Number(item.unitPrice ?? item.orderPrice ?? item.price ?? item.marketPrice ?? 0);
      return {
        id: `RETURN-LINE-${index}-${Date.now()}`,
        goodsId: item.goodsId || item.goodsCode || item.productId || '',
        goodsName: item.goodsName || item.productName || item.name || item.displayName || '',
        unit: item.unit || item.measurementUnit || '',
        brand: item.brand || '--',
        spec: item.spec || '--',
        image: item.image || item.imageUrl || '',
        orderPrice,
        shippedQty: full ? shippedQty : '',
        returnedQty: full ? returnedQty : '',
        applyQty: full ? availableQty : '',
        applyPrice: orderPrice,
        damageQty: full ? 0 : '',
        purchaseOrder: item.purchaseOrder || '--',
        remark: ''
      };
    }).filter((line) => !full || Number(line.applyQty) > 0);
  }

  function renderPlaceholderLines() {
    body.innerHTML = Array.from({ length: 9 }, (_, index) => `<tr class="return-placeholder-row">
      <td>${index + 1}</td><td></td><td class="goods-name-cell"></td><td></td><td></td><td></td><td></td>
      <td><input class="table-input" type="number" placeholder="请输入申请退货数量" aria-label="第${index + 1}行申请退货数量"></td>
      <td><input class="table-input" type="number" placeholder="请输入价格" aria-label="第${index + 1}行申请退货单价"></td>
      <td><input class="table-input" type="text" placeholder="请输入退货金额" aria-label="第${index + 1}行申请退货金额"></td>
      <td><input class="table-input" type="number" placeholder="请输入数量" aria-label="第${index + 1}行报损数量"></td><td></td><td></td>
    </tr>`).join('');
  }

  function renderLines() {
    if (!lines.length) {
      if (selectionMode === 'full') {
        body.innerHTML = '<tr><td class="empty-goods" colspan="13">该订单暂无可退商品</td></tr>';
      } else if (document.getElementById('returnMode').value === 'UNRELATED') {
        body.innerHTML = '<tr><td class="empty-goods" colspan="13">请点击“添加商品”选择退货商品</td></tr>';
      } else {
        renderPlaceholderLines();
      }
    } else {
      body.innerHTML = lines.map((line, index) => { const productDisplay = window.DomUtils.formatProductDisplay(line); return `<tr data-line-id="${escapeHtml(line.id)}">
        <td>${index + 1}</td><td><span class="goods-thumb">暂无图片</span></td><td class="goods-name-cell"><span class="product-display-text" title="${escapeHtml(productDisplay)}">${escapeHtml(productDisplay)}</span></td><td>${escapeHtml(line.unit)}</td>
        <td>${money(line.orderPrice)}</td><td>${line.shippedQty}</td><td>${line.returnedQty}</td>
        <td><input class="table-input" type="number" min="0" step="0.01" data-field="applyQty" value="${line.applyQty}" ${readonly ? 'disabled' : ''}></td>
        <td><input class="table-input" type="number" min="0" step="0.01" data-field="applyPrice" value="${money(line.applyPrice)}" ${readonly ? 'disabled' : ''}></td>
        <td class="return-line-total">${line.applyQty === '' ? '' : money(line.applyQty * line.applyPrice)}</td>
        <td><input class="table-input" type="number" min="0" step="0.01" data-field="damageQty" value="${line.damageQty}" ${readonly ? 'disabled' : ''}></td>
        <td>${escapeHtml(line.purchaseOrder)}</td><td><input class="table-input remark-input" data-field="remark" value="${escapeHtml(line.remark)}" ${readonly ? 'disabled' : ''}></td>
      </tr>`; }).join('');
    }
    document.getElementById('refundTotal')?.replaceChildren(document.createTextNode(money(lines.reduce((sum, line) => sum + line.applyQty * line.applyPrice, 0))));
  }

  function productCode(product) {
    return String(product?.code || product?.productCode || product?.id || '').trim();
  }

  function productDisplay(product) {
    return window.DomUtils?.formatProductDisplay?.(product, [product])
      || `${product?.name || product?.productName || '--'}（${product?.unit || '--'}/${product?.brand || '--'}/${product?.spec || '--'}）`;
  }

  function getReturnProductCatalog() {
    return (window.DemoStore?.get?.('products') || window.MockProducts || [])
      .filter((product) => !product.status || product.status === 'ENABLE' || product.status === '已上架')
      .map((product) => ({ ...product, code: productCode(product) }))
      .filter((product) => product.code);
  }

  function productMatchesPicker(product, filters) {
    const keyword = String(filters.keyword || '').trim().toLocaleLowerCase();
    const text = [product.code, product.name, product.productName, product.brand, product.spec].filter(Boolean).join(' ').toLocaleLowerCase();
    return (!keyword || text.includes(keyword)) && (!filters.category || product.category === filters.category);
  }

  function createManualReturnLine(product, index) {
    const price = Number(product.marketPrice || 0);
    return {
      id: `RETURN-MANUAL-${Date.now()}-${index}-${product.code}`,
      goodsId: product.code,
      goodsName: product.name || product.productName || '',
      unit: product.unit || '',
      brand: product.brand || '--',
      spec: product.spec || '--',
      image: product.image || product.imageUrl || '',
      orderPrice: price,
      shippedQty: '',
      returnedQty: '',
      applyQty: '',
      applyPrice: price,
      damageQty: '',
      purchaseOrder: '--',
      remark: ''
    };
  }

  function renderProductPicker() {
    if (!productPicker) return;
    const state = productPicker;
    const categories = [...new Set(state.items.map((product) => product.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh-CN'));
    const filtered = state.items.filter((product) => productMatchesPicker(product, state.filters));
    const totalPages = Math.max(1, Math.ceil(filtered.length / state.pageSize));
    state.page = Math.min(Math.max(1, state.page), totalPages);
    const visible = filtered.slice((state.page - 1) * state.pageSize, state.page * state.pageSize);
    const existing = new Set(lines.map((line) => String(line.goodsId || line.goodsCode || '').trim()).filter(Boolean));
    const selectableVisible = visible.filter((product) => !existing.has(product.code));
    const allVisibleSelected = selectableVisible.length > 0 && selectableVisible.every((product) => state.selected.has(product.code));
    const pageButtons = Array.from({ length: totalPages }, (_, index) => index + 1)
      .map((page) => `<button class="product-picker-page-button ${page === state.page ? 'active' : ''}" type="button" data-product-picker-action="page" data-page="${page}" ${page === state.page ? 'aria-current="page"' : ''}>${page}</button>`).join('');
    const rows = visible.length ? visible.map((product) => {
      const image = product.image || product.imageUrl;
      const exists = existing.has(product.code);
      return `<tr data-return-product="${escapeHtml(product.code)}">
        <td><input type="checkbox" data-return-product-check value="${escapeHtml(product.code)}" ${state.selected.has(product.code) ? 'checked' : ''} ${exists ? 'disabled' : ''} aria-label="选择${escapeHtml(productDisplay(product))}"></td>
        <td>${image ? `<span class="product-picker-image"><img src="${escapeHtml(image)}" alt=""></span>` : '<span class="product-picker-image">图片</span>'}</td>
        <td class="product-picker-product" title="${escapeHtml(productDisplay(product))}">${escapeHtml(productDisplay(product))}</td>
        <td>${escapeHtml(product.unit || '--')}</td>
        <td>${money(product.marketPrice)}</td>
        <td>${escapeHtml(product.category || '--')}</td>
      </tr>`;
    }).join('') : '<tr><td colspan="6" class="return-product-picker-empty">暂无符合条件的商品</td></tr>';
    overlay.innerHTML = `<div class="product-picker-backdrop return-product-picker-backdrop"><section class="product-picker-dialog" role="dialog" aria-modal="true" aria-label="添加商品">
      <header class="product-picker-header"><h3>添加商品</h3><button class="product-picker-close" type="button" data-close aria-label="关闭">×</button></header>
      <div class="product-picker-body">
        <div class="product-picker-filters">
          <label class="product-picker-filter"><span>商品名称</span><input id="returnProductKeyword" value="${escapeHtml(state.filters.keyword)}" placeholder="请输入商品名称/编号"></label>
          <label class="product-picker-filter"><span>商品分类</span><select id="returnProductCategory"><option value="">请选择商品分类</option>${categories.map((category) => `<option value="${escapeHtml(category)}" ${category === state.filters.category ? 'selected' : ''}>${escapeHtml(category)}</option>`).join('')}</select></label>
          <div class="product-picker-filter-actions"><button class="btn btn-primary btn-sm" type="button" data-product-picker-action="query">查询</button><button class="btn btn-sm" type="button" data-product-picker-action="reset">重置</button></div>
        </div>
        <div class="product-picker-table-wrap"><table class="product-picker-table return-product-picker-table"><colgroup><col style="width:48px"><col style="width:90px"><col><col style="width:100px"><col style="width:110px"><col style="width:220px"></colgroup><thead><tr><th><input type="checkbox" data-return-product-check-all ${allVisibleSelected ? 'checked' : ''} aria-label="全选当前页"></th><th>图片</th><th>商品名称（计量单位/品牌/规格）</th><th>计量单位</th><th>市场价</th><th>商品分类</th></tr></thead><tbody>${rows}</tbody></table></div>
        <div class="product-picker-pagination"><span class="product-picker-total">共 ${filtered.length} 条数据</span><select class="product-picker-page-size" disabled aria-label="每页条数"><option>${state.pageSize} 条/页</option></select><div class="product-picker-page-buttons"><button class="product-picker-page-button" type="button" data-product-picker-action="prev" ${state.page === 1 ? 'disabled' : ''}>‹</button>${pageButtons}<button class="product-picker-page-button" type="button" data-product-picker-action="next" ${state.page === totalPages ? 'disabled' : ''}>›</button></div><label class="product-picker-page-jump">跳至 <input class="product-picker-jump-input" value="${state.page}" readonly aria-label="当前页码"> / ${totalPages} 页</label></div>
      </div><footer class="product-picker-footer"><button class="btn" type="button" data-close>关闭</button><button class="btn btn-primary" type="button" data-product-picker-action="confirm">添加</button></footer>
    </section></div>`;
  }

  function openReturnGoodsPicker() {
    const items = getReturnProductCatalog();
    if (!items.length) return toast('暂无可添加商品', true);
    productPicker = { items, page: 1, pageSize: 10, filters: { keyword: '', category: '' }, selected: new Set() };
    renderProductPicker();
  }

  function confirmReturnProducts() {
    if (!productPicker) return;
    const existing = new Set(lines.map((line) => String(line.goodsId || line.goodsCode || '').trim()).filter(Boolean));
    const selectedProducts = [...productPicker.selected]
      .map((code) => productPicker.items.find((product) => product.code === code))
      .filter((product) => product && !existing.has(product.code));
    if (!selectedProducts.length) return toast('请选择商品', true);
    lines = lines.concat(selectedProducts.map((product, index) => createManualReturnLine(product, index)));
    selectionMode = 'manual';
    closeOverlay();
    renderLines();
    toast(`已添加${selectedProducts.length}个商品`);
  }

  function orderMatchesPicker(item, filters) {
    const orderNo = String(item.orderNo || '').toLocaleLowerCase();
    const goodsText = (item.items || []).map((line) => line.goodsName || '').join(' ').toLocaleLowerCase();
    const expectedDate = String(item.expectedAt || '').slice(0, 10);
    const keyword = filters.orderNo.trim().toLocaleLowerCase();
    const goodsKeyword = filters.goodsName.trim().toLocaleLowerCase();
    return (!keyword || orderNo.includes(keyword))
      && (!goodsKeyword || goodsText.includes(goodsKeyword))
      && (!filters.startDate || expectedDate >= filters.startDate)
      && (!filters.endDate || expectedDate <= filters.endDate);
  }

  function hasReturnableGoods(order) {
    const source = order.items?.length ? order.items : order.orderLines || [];
    return source.some((item) => {
      const shippedQty = Number(item.shippedQty ?? item.quantity ?? item.orderQty ?? 0);
      const returnedQty = Number(item.returnedQty ?? item.returnQty ?? item.returnedQuantity ?? 0);
      return shippedQty - returnedQty > 0;
    });
  }

  function isIncompleteReturnDemo(order) {
    return String(order.id || '').startsWith('ORD-SIM-') && (order.items || []).length < 2;
  }

  function renderOrderPicker() {
    if (!orderPicker) return;
    const state = orderPicker;
    const filtered = state.items.filter((item) => orderMatchesPicker(item, state.filters));
    const totalPages = Math.max(1, Math.ceil(filtered.length / state.pageSize));
    state.page = Math.min(Math.max(1, state.page), totalPages);
    const start = (state.page - 1) * state.pageSize;
    const pageItems = filtered.slice(start, start + state.pageSize);
    const rows = pageItems.length ? pageItems.map((item) => `<tr>
      <td>${escapeHtml(item.orderNo)}</td>
      <td>${escapeHtml(item.expectedAt || '--')}</td>
      <td>${money(item.orderAmount)}</td>
      <td><div class="return-order-actions"><button class="btn-text" type="button" data-select-order="${escapeHtml(item.id)}" data-full="1">整单退</button><button class="btn-text" type="button" data-select-order="${escapeHtml(item.id)}" data-full="0">部分退</button></div></td>
    </tr>`).join('') : '<tr><td class="return-order-empty" colspan="4">暂无符合条件的订单</td></tr>';
    orderDateRangePicker?.destroy?.();
    orderDateRangePicker = null;
    overlay.innerHTML = `<div class="operations-modal-backdrop return-order-picker-backdrop"><section class="operations-modal order-picker-modal return-order-picker-modal" role="dialog" aria-modal="true" aria-label="选择订单">
      <header class="operations-modal-header"><h3>选择订单</h3><button type="button" data-close aria-label="关闭">×</button></header>
      <div class="operations-modal-body return-order-picker-body">
        <div class="return-order-picker-filter">
          <div class="return-order-picker-field"><label for="returnOrderNoFilter">订单号</label><input class="filter-input" id="returnOrderNoFilter" value="${escapeHtml(state.filters.orderNo)}" placeholder="请输入"></div>
          <div class="return-order-picker-field"><label for="returnGoodsFilter">商品名称</label><input class="filter-input" id="returnGoodsFilter" value="${escapeHtml(state.filters.goodsName)}" placeholder="请输入"></div>
          <div class="return-order-picker-field return-order-picker-date-field"><label for="returnOrderDateDisplay">期望送达日期</label><div class="date-range-picker return-order-date-range" id="returnOrderDateRange">
            <input class="filter-input date-range-display" id="returnOrderDateDisplay" type="text" value="" placeholder="请选择日期范围" readonly aria-label="期望送达日期">
            <span class="date-range-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></span>
            <input type="hidden" id="returnOrderDateStart" data-date-start value="${escapeHtml(state.filters.startDate)}">
            <input type="hidden" id="returnOrderDateEnd" data-date-end value="${escapeHtml(state.filters.endDate)}">
          </div></div>
          <div class="return-order-picker-buttons"><button class="btn btn-primary btn-sm" type="button" data-picker-action="query">查询</button><button class="btn btn-sm" type="button" data-picker-action="reset">重置</button></div>
        </div>
        <div class="return-order-picker-table-wrap"><table class="operations-table return-order-picker-table"><thead><tr><th>订单号</th><th>期望送达时间</th><th>下单金额</th><th>操作</th></tr></thead><tbody>${rows}</tbody></table></div>
        <div class="return-order-picker-pagination"><span class="return-order-result-count">共 ${filtered.length} 条数据</span><div class="return-order-page-controls"><select class="filter-select" id="returnOrderPageSize" aria-label="每页条数"><option value="20" ${state.pageSize === 20 ? 'selected' : ''}>20 条/页</option><option value="50" ${state.pageSize === 50 ? 'selected' : ''}>50 条/页</option><option value="100" ${state.pageSize === 100 ? 'selected' : ''}>100 条/页</option></select><button class="return-order-page-arrow" type="button" data-picker-action="prev" ${state.page <= 1 ? 'disabled' : ''} aria-label="上一页">‹</button><button class="return-order-page-current" type="button" aria-current="page">${state.page}</button><button class="return-order-page-arrow" type="button" data-picker-action="next" ${state.page >= totalPages ? 'disabled' : ''} aria-label="下一页">›</button><label class="return-order-jump">跳至 <input id="returnOrderPageJump" type="number" min="1" max="${totalPages}" value="${state.page}" aria-label="跳转页码"> / ${totalPages} 页</label></div></div>
      </div><footer class="operations-modal-footer"><button class="btn" type="button" data-close>关闭</button></footer>
    </section></div>`;
    orderDateRangePicker = window.DateRangePicker?.mount?.({
      container: '#returnOrderDateRange',
      displayInput: '#returnOrderDateDisplay',
      startInput: '#returnOrderDateStart',
      endInput: '#returnOrderDateEnd',
      separator: ' ~ ',
      onChange: ({ startDate, endDate }) => {
        if (!orderPicker) return;
        orderPicker.filters.startDate = startDate;
        orderPicker.filters.endDate = endDate;
        orderPicker.page = 1;
      }
    });
  }

  async function chooseOrder() {
    const result = await service.list('orders', { page: 1, pageSize: 1000 });
    orderPicker = {
      items: result.items.filter((item) => !['DRAFT', 'CLOSED'].includes(item.status) && !isIncompleteReturnDemo(item) && hasReturnableGoods(item)),
      page: 1,
      pageSize: 20,
      filters: { orderNo: '', goodsName: '', startDate: '', endDate: '' }
    };
    renderOrderPicker();
  }

  async function selectOrder(orderId, full) {
    const order = await service.get('orders', orderId);
    if (!order) return toast('订单不存在或已删除', true);
    const nextLines = normalizeOrderLines(order, full);
    if (full && !nextLines.length) {
      closeOverlay();
      toast('订单已整单退', true);
      return;
    }
    setSelectValue('returnMode', 'RELATED');
    syncOrderAction();
    document.getElementById('orderNo').value = order.orderNo;
    document.getElementById('orderNo').dataset.orderId = order.id;
    syncSelectedOrder(order.orderNo);
    setSelectValue('customerName', order.customerName);
    setSelectValue('canteen', order.canteen);
    selectionMode = full ? 'full' : 'partial';
    lines = nextLines;
    closeOverlay();
    renderLines();
  }

  function clearErrors() {
    root.querySelectorAll('[data-error-for]').forEach((element) => { element.textContent = ''; });
    root.querySelectorAll('[aria-invalid="true"]').forEach((element) => element.removeAttribute('aria-invalid'));
    document.getElementById('returnGoodsError').textContent = '';
  }

  function validate() {
    clearErrors();
    const required = {
      returnMode: '请选择退货类型!',
      customerName: '请选择客户!',
      canteen: '请选择食堂!',
      reason: '请输入退货原因!'
    };
    let first = null;
    Object.entries(required).forEach(([key, message]) => {
      const field = document.getElementById(key);
      if (!field.value.trim()) {
        root.querySelector(`[data-error-for="${key}"]`).textContent = message;
        field.setAttribute('aria-invalid', 'true');
        first ||= field;
      }
    });
    if (document.getElementById('returnMode').value === 'RELATED' && !document.getElementById('orderNo').value) {
      root.querySelector('[data-error-for="orderNo"]').textContent = '请选择订单';
      document.getElementById('orderNo').setAttribute('aria-invalid', 'true');
      first ||= document.getElementById('chooseOrder');
    }
    if (!lines.length || lines.every((line) => !(line.applyQty > 0))) {
      document.getElementById('returnGoodsError').textContent = '请至少添加一个商品';
      first ||= document.getElementById('returnMode').value === 'UNRELATED'
        ? document.getElementById('addReturnGoods')
        : document.getElementById('chooseOrder');
    }
    first?.focus();
    return !first;
  }

  function data() {
    const refundAmount = Number(lines.reduce((sum, line) => sum + line.applyQty * line.applyPrice, 0).toFixed(2));
    return {
      returnMode: document.getElementById('returnMode').value,
      orderId: document.getElementById('orderNo').dataset.orderId || record?.orderId || '',
      orderNo: document.getElementById('orderNo').value,
      customerName: document.getElementById('customerName').value,
      canteen: document.getElementById('canteen').value,
      reason: document.getElementById('reason').value.trim(),
      includeDamage: document.getElementById('includeDamage').value,
      attachment,
      remark: remarkInput?.value.trim() || '',
      items: lines.map((line) => ({ ...line, applyAmount: Number((line.applyQty * line.applyPrice).toFixed(2)) })),
      refundAmount,
      warehouse: record?.warehouse || '中心仓',
      creator: record?.creator || '当前用户',
      status: record?.status || 'PENDING_AUDIT'
    };
  }

  async function save() {
    if (!validate()) return;
    try {
      if (id) await service.update('returns', id, data());
      else await service.create('returns', data());
      back('saved');
    } catch (error) {
      toast(error.message || '退货单保存失败', true);
    }
  }

  function reject() {
    overlay.innerHTML = `<div class="operations-modal-backdrop"><section class="operations-modal compact-modal" role="dialog" aria-label="驳回退货单"><header class="operations-modal-header"><h3>审核</h3><button data-close>×</button></header><div class="operations-modal-body"><label class="dialog-field">驳回原因<textarea id="returnRejectReason" class="form-control" rows="4"></textarea><span class="field-error" id="returnRejectError"></span></label></div><footer class="operations-modal-footer"><button class="btn" data-close>取消</button><button class="btn btn-primary" id="confirmReturnReject">确定</button></footer></section></div>`;
  }

  async function load() {
    if (!id) {
      if (relatedOrderId) {
        await selectOrder(relatedOrderId, returnType === 'full');
        return;
      }
      renderLines();
      return;
    }
    record = await service.get('returns', id);
    if (!record) return toast('退货单不存在或已删除', true);
    setSelectValue('returnMode', record.returnMode || '');
    syncOrderAction();
    document.getElementById('orderNo').value = record.orderNo || '';
    document.getElementById('orderNo').dataset.orderId = record.orderId || '';
    syncSelectedOrder(record.orderNo || '');
    setSelectValue('customerName', record.customerName || '');
    setSelectValue('canteen', record.canteen || '');
    reasonInput.value = record.reason || '';
    document.getElementById('includeDamage').value = record.includeDamage || '否';
    remarkInput.value = record.remark || '';
    syncRemarkCount();
    attachment = record.attachment || '';
    document.getElementById('attachmentName').textContent = attachment || '未上传';
    syncCustomGoodsAction();
    lines = record.items?.length ? record.items : [{
      id: `RETURN-LINE-FALLBACK-${Date.now()}`,
      goodsId: '',
      goodsName: record.goodsName || '大白菜（斤/--/散装）',
      unit: '斤',
      orderPrice: 2.10,
      shippedQty: 1,
      returnedQty: 0,
      applyQty: 1,
      applyPrice: 2.10,
      damageQty: 0,
      purchaseOrder: '--',
      remark: ''
    }];
    renderLines();
    if (readonly) root.querySelectorAll('#returnForm input, #returnForm select, #returnForm textarea').forEach((control) => { control.disabled = true; });
  }

  root.addEventListener('input', (event) => {
    if (event.target === reasonInput) {
      setReasonMenuVisible(true);
      return;
    }
    if (event.target === remarkInput) {
      syncRemarkCount();
      return;
    }
    const row = event.target.closest('[data-line-id]');
    if (!row || !event.target.dataset.field) return;
    const line = lines.find((item) => item.id === row.dataset.lineId);
    line[event.target.dataset.field] = event.target.dataset.field === 'remark' ? event.target.value : Number(event.target.value);
    row.querySelector('.return-line-total').textContent = money(line.applyQty * line.applyPrice);
    document.getElementById('refundTotal')?.replaceChildren(document.createTextNode(money(lines.reduce((sum, item) => sum + item.applyQty * item.applyPrice, 0))));
  });

  root.addEventListener('click', async (event) => {
    const reasonOption = event.target.closest('[data-reason-option]');
    if (reasonOption) {
      reasonInput.value = reasonOption.dataset.reasonOption || '';
      setReasonMenuVisible(false);
      return;
    }
    if (event.target.closest('#reason')) {
      setReasonMenuVisible(true);
      return;
    }
    if (!event.target.closest('.return-reason-picker')) setReasonMenuVisible(false);
    if (event.target.closest('[data-close]')) return closeOverlay();
    const productPickerAction = event.target.closest('[data-product-picker-action]')?.dataset.productPickerAction;
    if (productPickerAction && productPicker) {
      if (productPickerAction === 'query') {
        productPicker.filters = {
          keyword: document.getElementById('returnProductKeyword').value,
          category: document.getElementById('returnProductCategory').value
        };
        productPicker.page = 1;
      } else if (productPickerAction === 'reset') {
        productPicker.filters = { keyword: '', category: '' };
        productPicker.page = 1;
      } else if (productPickerAction === 'prev') {
        productPicker.page -= 1;
      } else if (productPickerAction === 'next') {
        productPicker.page += 1;
      } else if (productPickerAction === 'page') {
        productPicker.page = Number(event.target.closest('[data-page]').dataset.page) || 1;
      } else if (productPickerAction === 'confirm') {
        return confirmReturnProducts();
      }
      renderProductPicker();
      return;
    }
    const pickerAction = event.target.closest('[data-picker-action]')?.dataset.pickerAction;
    if (pickerAction && orderPicker) {
      if (pickerAction === 'query') {
        orderPicker.filters = {
          orderNo: document.getElementById('returnOrderNoFilter').value,
          goodsName: document.getElementById('returnGoodsFilter').value,
          startDate: document.getElementById('returnOrderDateStart').value,
          endDate: document.getElementById('returnOrderDateEnd').value
        };
        orderPicker.page = 1;
      } else if (pickerAction === 'reset') {
        orderPicker.filters = { orderNo: '', goodsName: '', startDate: '', endDate: '' };
        orderPicker.page = 1;
      } else if (pickerAction === 'prev') {
        orderPicker.page -= 1;
      } else if (pickerAction === 'next') {
        orderPicker.page += 1;
      }
      renderOrderPicker();
      return;
    }
    if (event.target.closest('[data-action="back"]')) return back();
    if (event.target.closest('#chooseOrder')) return chooseOrder();
    if (event.target.closest('#addReturnGoods')) return openReturnGoodsPicker();
    const choice = event.target.closest('[data-select-order]');
    if (choice) return selectOrder(choice.dataset.selectOrder, choice.dataset.full === '1');
    if (event.target.closest('#uploadAttachment')) {
      attachment = '退货附件.pdf';
      document.getElementById('attachmentName').textContent = attachment;
      return;
    }
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'save') return save();
    if (action === 'reject') return reject();
    if (event.target.closest('#confirmReturnReject')) {
      const reason = document.getElementById('returnRejectReason').value.trim();
      if (!reason) return (document.getElementById('returnRejectError').textContent = '请输入驳回原因!');
      await service.update('returns', id, { status: 'REJECTED', rejectReason: reason, auditor: '当前用户', auditAt: new Date().toISOString().slice(0, 16).replace('T', ' ') });
      return back('reviewed');
    }
    if (action === 'approve') {
      if (!window.confirm('确定通过审核吗？')) return;
      await service.transition('returns', id, 'approve');
      return back('reviewed');
    }
  });

  root.addEventListener('change', (event) => {
    if (productPicker && event.target.matches('[data-return-product-check]')) {
      if (event.target.checked) productPicker.selected.add(event.target.value);
      else productPicker.selected.delete(event.target.value);
      return;
    }
    if (productPicker && event.target.matches('[data-return-product-check-all]')) {
      overlay.querySelectorAll('[data-return-product-check]:not(:disabled)').forEach((checkbox) => {
        checkbox.checked = event.target.checked;
        if (event.target.checked) productPicker.selected.add(checkbox.value);
        else productPicker.selected.delete(checkbox.value);
      });
      return;
    }
    if (orderPicker && event.target.matches('#returnOrderPageSize')) {
      orderPicker.pageSize = Number(event.target.value) || 20;
      orderPicker.page = 1;
      renderOrderPicker();
      return;
    }
    if (orderPicker && event.target.matches('#returnOrderPageJump')) {
      orderPicker.page = Number(event.target.value) || 1;
      renderOrderPicker();
      return;
    }
    if (!event.target.matches('#returnMode, #customerName, #canteen')) return;
    event.target.classList.toggle('has-value', Boolean(event.target.value));
    if (event.target.matches('#returnMode')) {
      lines = [];
      selectionMode = '';
      document.getElementById('orderNo').value = '';
      document.getElementById('orderNo').dataset.orderId = '';
      syncSelectedOrder('');
      syncOrderAction();
      renderLines();
    }
    syncCustomGoodsAction();
  });

  syncOrderAction();
  syncCustomGoodsAction();
  load();
})();
