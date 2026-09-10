(function () {
  'use strict';

  var service = window.PurchaseService;
  var utils = window.PurchasePageUtils;
  service.ensureSeed();
  var params = new URLSearchParams(window.location.search);
  var recordId = params.get('id') || '';
  var mode = params.get('flag') === 'edit' ? 'edit' : params.get('flag') === 'copy' ? 'copy' : 'add';
  var record = recordId ? service.getOrder(recordId) : null;
  var source = record || {};
  var supplier = source.supplier || '盒马鲜生';
  var lines = (source.items || []).map(function (item) {
    return {
      id: item.id,
      productCode: item.productCode,
      productName: item.productName,
      unit: item.unit,
      brand: item.brand || '--',
      spec: item.spec || '--',
      image: item.image || '',
      quantity: Number(item.quantity || 0),
      purchasePrice: Number(item.purchasePrice || 0),
      supplierQuote: Number(item.supplierQuote || 0),
      agreementPrice: item.agreementPrice,
      lastPrice: item.lastPrice,
      marketPrice: item.marketPrice,
      remark: item.remark || ''
    };
  });
  if (!lines.length) {
    lines = [createEmptyLine()];
    for (var blankIndex = 1; blankIndex < 9; blankIndex += 1) lines.push(createEmptyLine());
  }

  function createEmptyLine() {
    return { id: 'FORM-' + Date.now() + '-' + Math.random().toString(16).slice(2), productCode: '', productName: '', unit: '', brand: '--', spec: '--', image: '', quantity: 0, purchasePrice: 0, supplierQuote: 0, agreementPrice: null, lastPrice: null, marketPrice: null, remark: '' };
  }
  function text(value) { return utils.escapeHtml(value == null ? '' : value); }
  function fixed(value) { return Number(value || 0).toFixed(2); }
  function productDisplay(line) {
    return line.productCode ? window.DomUtils.formatProductDisplay(line) : '';
  }
  function productForInput(value) {
    var sourceValue = String(value || '').trim();
    return service.products().find(function (item) {
      return item.code === sourceValue || item.name === sourceValue || service.displayName(item) === sourceValue;
    }) || null;
  }

  var title = mode === 'edit' ? '编辑采购单' : '添加采购单';
  var expectedAt = source.expectedAt || '2026-08-27 00:00:00';
  var enterpriseAt = source.enterpriseExpectedAt || utils.shiftDate(expectedAt, -2);
  var purchaseType = source.purchaseType || '供应商送货';
  var manager = source.manager || '杨采';
  var warehouse = source.warehouse || '东南区域仓库';
  var readonlyBase = mode === 'edit';
  var purchasePriceReadonly = readonlyBase ? ' disabled' : '';
  var productOptions = service.products().map(function (item) { return '<option value="' + text(item.code) + '">' + text(item.name) + '（' + text(item.unit) + '）</option>'; }).join('');

  var content = [
    '<section class="page-card purchase-page purchase-form-page" aria-label="' + title + '">',
      '<div class="purchase-form-header"><button class="back-link purchase-back" type="button" data-action="back"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"></path><path d="M19 12H9"></path></svg><span>返回</span></button><h1>' + title + '</h1></div>',
      '<div class="purchase-form-scroll">',
        '<div class="purchase-basic-form">',
          '<div class="purchase-basic-field"><label class="field-label required" for="purchaseType">采购类型</label><div class="purchase-composite-select"><select class="form-control" id="purchaseType"' + (readonlyBase ? ' disabled' : '') + '><option value="联营供应商采购"' + (purchaseType === '联营供应商采购' ? ' selected' : '') + '>联营供应商采购 / ' + text(supplier) + '</option><option value="市场自采"' + (purchaseType === '市场自采' ? ' selected' : '') + '>市场自采 / ' + text(supplier) + '</option><option value="供应商送货"' + (purchaseType === '供应商送货' ? ' selected' : '') + '>供应商送货 / ' + text(supplier) + '</option></select></div></div>',
          '<div class="purchase-basic-field"><label class="field-label required" for="purchaseEnterpriseExpectedAt">企业期望送达时间</label><input class="form-control" id="purchaseEnterpriseExpectedAt" type="text" placeholder="请选择日期" readonly value="' + text(enterpriseAt) + '"></div>',
          '<div class="purchase-basic-field"><label class="field-label required" for="purchaseExpectedAt">学校期望送达时间</label><input class="form-control" id="purchaseExpectedAt" type="text" placeholder="请选择日期" readonly' + (readonlyBase ? ' disabled' : '') + ' value="' + text(expectedAt) + '"></div>',
          '<div class="purchase-basic-field"><label class="field-label required" for="purchaseManager">采购负责人</label><select class="form-control" id="purchaseManager"' + (readonlyBase ? ' disabled' : '') + '><option value="杨采"' + (manager === '杨采' ? ' selected' : '') + '>杨采</option><option value="杨无缺"' + (manager === '杨无缺' ? ' selected' : '') + '>杨无缺</option></select></div>',
          '<div class="purchase-basic-field"><label class="field-label required" for="purchaseWarehouse">仓库</label><select class="form-control" id="purchaseWarehouse"' + (readonlyBase ? ' disabled' : '') + '><option value="公司市区仓库"' + (warehouse === '公司市区仓库' ? ' selected' : '') + '>公司市区仓库</option><option value="东南区域仓库"' + (warehouse === '东南区域仓库' ? ' selected' : '') + '>东南区域仓库</option><option value="生鲜仓库"' + (warehouse === '生鲜仓库' ? ' selected' : '') + '>生鲜仓库</option></select></div>',
        '</div>',
        '<section class="purchase-form-section">',
          '<div class="purchase-section-heading">' + (mode === 'edit' ? '' : '<button class="btn btn-primary btn-sm" type="button" data-action="batch-add">批量添加商品</button>') + '</div>',
          '<div class="purchase-form-table-container"><table class="purchase-table purchase-form-table"><thead><tr><th>序号</th><th>图片</th><th class="required-head">商品名称（计量单位/品牌/规格）</th><th>计量单位</th><th class="required-head">待采购量</th><th class="required-head">采购单价</th><th>采购小计</th><th>供应商报价</th><th>协议价</th><th>近一次采购价</th><th>市场价</th><th>备注</th></tr></thead><tbody id="purchaseFormRows"></tbody><tfoot><tr><td colspan="6">合计金额：<span id="purchaseFormTotal">0.00</span></td><td colspan="6"></td></tr></tfoot></table></div>',
          '<div class="purchase-form-note"><label class="field-label" for="purchaseRemark">备注：</label><div class="purchase-note-control"><textarea id="purchaseRemark" maxlength="100" placeholder="请输入内容">' + text(source.remark || '') + '</textarea><div class="purchase-text-counter" aria-live="polite"><span id="purchaseRemarkCount">' + String(source.remark || '').length + '</span>/100</div></div></div>',
        '</section>',
      '</div>',
      '<div class="purchase-form-actions"><button class="btn" type="button" data-action="back">返回</button><button class="btn" type="button" data-action="draft">暂存</button><button class="btn btn-primary" type="button" data-action="save">保存采购单</button></div>',
    '</section>'
  ].join('');

  var root = window.AppShell.mount({ title: title, content: content });
  document.title = title + ' - 集采企业版企业端';
  var page = root.querySelector('.purchase-form-page');
  var enterpriseDatePicker = utils.mountDate(page.querySelector('#purchaseEnterpriseExpectedAt'), enterpriseAt, false);
  var datePicker = utils.mountDate(page.querySelector('#purchaseExpectedAt'), expectedAt, false);

  function renderRows() {
    page.querySelector('#purchaseFormRows').innerHTML = lines.map(function (line, index) {
      var hasProduct = Boolean(line.productCode);
      var product = hasProduct ? productDisplay(line) : '';
      var image = line.image ? '<img src="' + text(line.image) + '" alt="' + text(line.productName) + '">' : '暂无';
      return '<tr data-line-id="' + text(line.id) + '">' +
        '<td>' + (index + 1) + '</td>' +
        '<td><span class="purchase-product-image">' + image + '</span></td>' +
        '<td><input class="product-search" list="purchaseProductOptions" data-field="product" value="' + text(product) + '" placeholder="搜索商品名称或编号"></td>' +
        '<td><span class="purchase-product-display" data-display="unit">' + text(line.unit || '--') + '</span></td>' +
        '<td><input data-field="quantity" type="number" min="0" step="0.01" value="' + fixed(line.quantity) + '" placeholder="请输入"></td>' +
        '<td><input data-field="purchasePrice" type="number" min="0" step="0.01" value="' + fixed(line.purchasePrice) + '" placeholder="请输入"' + purchasePriceReadonly + '></td>' +
        '<td><span data-display="subtotal">' + fixed(line.quantity * line.purchasePrice) + '</span></td>' +
        '<td><span>' + (hasProduct ? fixed(line.supplierQuote) : '--') + '</span></td>' +
        '<td><span>' + (line.agreementPrice == null ? '--' : fixed(line.agreementPrice)) + '</span></td>' +
        '<td><span>' + (line.lastPrice == null ? '--' : fixed(line.lastPrice)) + '</span></td>' +
        '<td><span>' + (line.marketPrice == null ? '--' : fixed(line.marketPrice)) + '</span></td>' +
        '<td><input data-field="remark" value="' + text(line.remark) + '" placeholder="请输入"></td>' +
      '</tr>';
    }).join('');
    updateTotal();
  }

  function updateTotal() {
    var total = lines.reduce(function (sum, line) { return sum + Number(line.quantity || 0) * Number(line.purchasePrice || 0); }, 0);
    page.querySelector('#purchaseFormTotal').textContent = fixed(total);
  }

  var batchPickerState = null;

  function closeBatchPicker() {
    page.querySelector('#purchaseBatchPicker')?.remove();
    batchPickerState = null;
  }

  function renderBatchPicker() {
    var host = page.querySelector('#purchaseBatchPicker');
    if (!host || !batchPickerState) return;
    var products = service.products();
    var categories = [...new Set(products.map(function (product) { return product.category; }).filter(Boolean))];
    var filtered = products.filter(function (product) {
      return (!batchPickerState.purchaseType || !product.purchaseType || product.purchaseType === batchPickerState.purchaseType)
        && (!batchPickerState.category || product.category === batchPickerState.category);
    });
    var pages = Math.max(1, Math.ceil(filtered.length / 20));
    batchPickerState.page = Math.min(batchPickerState.page, pages);
    var visible = filtered.slice((batchPickerState.page - 1) * 20, batchPickerState.page * 20);
    var existingCodes = new Set(lines.map(function (line) { return line.productCode; }).filter(Boolean));
    var rows = visible.length ? visible.map(function (product) {
      var draft = batchPickerState.drafts.get(product.code) || {};
      var image = product.image ? '<span class="product-picker-image"><img src="' + text(product.image) + '" alt="' + text(product.name) + '"></span>' : '<span class="product-picker-image">图片</span>';
      var exists = existingCodes.has(product.code);
      return '<tr data-purchase-picker-product="' + text(product.code) + '"><td><input type="checkbox" data-purchase-picker-check value="' + text(product.code) + '"' + (batchPickerState.selected.has(product.code) ? ' checked' : '') + (exists ? ' disabled' : '') + '></td><td>' + image + '</td><td class="product-picker-product" title="' + text(service.displayName(product)) + '">' + text(service.displayName(product)) + '</td><td>' + text(product.unit || '--') + '</td><td><input type="number" min="0.01" step="0.01" data-purchase-picker-quantity value="' + text(draft.quantity || '') + '" placeholder="' + (exists ? '已添加' : '请输入数量') + '"' + (exists ? ' disabled' : '') + '></td><td><input type="text" data-purchase-picker-remark value="' + text(draft.remark || '') + '" placeholder="请输入备注"' + (exists ? ' disabled' : '') + '></td></tr>';
    }).join('') : '<tr><td colspan="6" style="height:180px;color:#9aa4b2">暂无符合条件的商品</td></tr>';
    var pageButtons = Array.from({ length: pages }, function (_, index) { return index + 1; }).map(function (pageNumber) { return '<button type="button" class="product-picker-page-button ' + (pageNumber === batchPickerState.page ? 'active' : '') + '" data-purchase-picker-action="page" data-page="' + pageNumber + '">' + pageNumber + '</button>'; }).join('');
    host.innerHTML = '<div class="product-picker-backdrop"><section class="product-picker-dialog" role="dialog" aria-modal="true" aria-labelledby="purchaseBatchPickerTitle"><header class="product-picker-header"><h3 id="purchaseBatchPickerTitle">批量添加商品</h3><button type="button" class="product-picker-close" data-purchase-picker-action="close" aria-label="关闭">×</button></header><div class="product-picker-body"><div class="product-picker-filters"><label class="product-picker-filter"><span>采购类型</span><select data-purchase-picker-filter="purchaseType"><option value="" disabled hidden selected>请选择</option><option value="供应商送货"' + (batchPickerState.purchaseType === '供应商送货' ? ' selected' : '') + '>供应商送货</option><option value="联营供应商采购"' + (batchPickerState.purchaseType === '联营供应商采购' ? ' selected' : '') + '>联营供应商采购</option><option value="市场自采"' + (batchPickerState.purchaseType === '市场自采' ? ' selected' : '') + '>市场自采</option></select></label><label class="product-picker-filter"><span>商品分类</span><select data-purchase-picker-filter="category"><option value="" disabled hidden selected>请选择商品分类</option>' + categories.map(function (category) { return '<option value="' + text(category) + '"' + (batchPickerState.category === category ? ' selected' : '') + '>' + text(category) + '</option>'; }).join('') + '</select></label><div class="product-picker-filter-actions"><button type="button" class="btn btn-primary btn-sm" data-purchase-picker-action="query">查询</button><button type="button" class="btn btn-sm" data-purchase-picker-action="reset">重置</button></div></div><div class="product-picker-table-wrap"><table class="product-picker-table"><colgroup><col style="width:48px"><col style="width:110px"><col><col style="width:120px"><col style="width:180px"><col style="width:180px"></colgroup><thead><tr><th><input type="checkbox" data-purchase-picker-check-all></th><th>图片</th><th>商品名称（计量单位/品牌/规格）</th><th>计量单位</th><th>待采购量</th><th>备注</th></tr></thead><tbody>' + rows + '</tbody></table></div><div class="product-picker-pagination"><span class="product-picker-total">共 ' + filtered.length + ' 条数据</span><select class="product-picker-page-size" disabled><option>20 条/页</option></select><div class="product-picker-page-buttons"><button type="button" class="product-picker-page-button" data-purchase-picker-action="page" data-page="' + Math.max(1, batchPickerState.page - 1) + '"' + (batchPickerState.page === 1 ? ' disabled' : '') + '>‹</button>' + pageButtons + '<button type="button" class="product-picker-page-button" data-purchase-picker-action="page" data-page="' + Math.min(pages, batchPickerState.page + 1) + '"' + (batchPickerState.page === pages ? ' disabled' : '') + '>›</button></div><label class="product-picker-page-jump">跳至 <input class="product-picker-jump-input" value="' + batchPickerState.page + '" readonly> / ' + pages + ' 页</label></div></div><footer class="product-picker-footer"><button type="button" class="btn" data-purchase-picker-action="close">关闭</button><button type="button" class="btn btn-primary" data-purchase-picker-action="confirm">添加</button></footer></section></div>';
  }

  function openBatchPicker() {
    batchPickerState = { purchaseType: page.querySelector('#purchaseType')?.value || purchaseType, category: '', page: 1, selected: new Set(), drafts: new Map() };
    page.insertAdjacentHTML('beforeend', '<div id="purchaseBatchPicker"></div>');
    renderBatchPicker();
  }

  function confirmBatchPicker() {
    var products = service.products();
    var additions = [...batchPickerState.selected].map(function (code) {
      var product = products.find(function (item) { return item.code === code; });
      var draft = batchPickerState.drafts.get(code) || {};
      if (!product || !draft.quantity || lines.some(function (line) { return line.productCode === code; })) return null;
      return { id: 'FORM-' + Date.now() + '-' + code, productCode: product.code, productName: product.name, unit: product.unit, brand: product.brand || '--', spec: product.spec || '--', image: product.image || '', quantity: Number(draft.quantity), purchasePrice: Number(product.purchasePrice || product.marketPrice || 0), supplierQuote: Number(product.supplierQuote || 0), agreementPrice: product.agreementPrice ?? null, lastPrice: product.lastPrice ?? null, marketPrice: product.marketPrice ?? null, remark: draft.remark || '' };
    }).filter(Boolean);
    if (!additions.length) { utils.toast('请勾选商品并填写待采购量', 'error'); return; }
    lines = lines.filter(function (line) { return line.productCode; });
    lines.push.apply(lines, additions);
    while (lines.length < 9) lines.push(createEmptyLine());
    closeBatchPicker();
    renderRows();
  }

  function updateLineFromInput(input) {
    var row = input.closest('tr[data-line-id]');
    var line = lines.find(function (item) { return item.id === row?.dataset.lineId; });
    if (!line) return;
    var field = input.dataset.field;
    if (field === 'quantity' || field === 'purchasePrice') line[field] = Number(input.value || 0);
    else line[field] = input.value;
    var subtotal = row.querySelector('[data-display="subtotal"]');
    if (subtotal) subtotal.textContent = fixed(line.quantity * line.purchasePrice);
    updateTotal();
  }

  function save(status) {
    var type = page.querySelector('#purchaseType').value;
    var enterpriseExpected = page.querySelector('#purchaseEnterpriseExpectedAt').value.trim();
    var expected = page.querySelector('#purchaseExpectedAt').value.trim();
    var managerValue = page.querySelector('#purchaseManager').value;
    var warehouseValue = page.querySelector('#purchaseWarehouse').value;
    var items = lines.filter(function (line) { return line.productCode && Number(line.quantity) > 0; });
    if (!type || !enterpriseExpected || !expected || !managerValue || !warehouseValue) {
      utils.toast('请完善采购单基本信息', 'error');
      return;
    }
    if (status !== '草稿' && !items.length) {
      utils.toast('请至少添加一条采购商品', 'error');
      return;
    }
    var result = service.saveOrder({
      id: mode === 'edit' ? record?.id : '',
      supplier: supplier,
      purchaseType: type,
      expectedAt: expected,
      enterpriseExpectedAt: enterpriseExpected,
      manager: managerValue,
      warehouse: warehouseValue,
      remark: page.querySelector('#purchaseRemark').value,
      status: status || '待收货',
      source: mode === 'edit' ? source.source : '手动创建',
      items: items
    });
    if (result && result.ok === false) {
      utils.toast(result.message || '企业期望送达时间不能晚于学校期望送达时间', 'error');
      return;
    }
    utils.toast(status === '草稿' ? '暂存成功' : '保存成功');
    window.setTimeout(function () { utils.navigate('./purchase-order.html'); }, 650);
  }

  page.addEventListener('click', function (event) {
    var pickerTarget = event.target.closest('[data-purchase-picker-action]');
    if (pickerTarget && batchPickerState) {
      var pickerAction = pickerTarget.dataset.purchasePickerAction;
      if (pickerAction === 'close') closeBatchPicker();
      if (pickerAction === 'confirm') confirmBatchPicker();
      if (pickerAction === 'query') {
        batchPickerState.purchaseType = page.querySelector('[data-purchase-picker-filter="purchaseType"]')?.value || '';
        batchPickerState.category = page.querySelector('[data-purchase-picker-filter="category"]')?.value || '';
        batchPickerState.page = 1;
        renderBatchPicker();
      }
      if (pickerAction === 'reset') { batchPickerState.purchaseType = ''; batchPickerState.category = ''; batchPickerState.page = 1; renderBatchPicker(); }
      if (pickerAction === 'page') { batchPickerState.page = Number(pickerTarget.dataset.page) || 1; renderBatchPicker(); }
      return;
    }
    var target = event.target.closest('[data-action]');
    if (!target || !page.contains(target)) return;
    if (target.dataset.action === 'back') {
      utils.navigate('./purchase-order.html');
      return;
    }
    if (target.dataset.action === 'batch-add') {
      openBatchPicker();
    }
    if (target.dataset.action === 'draft') save('草稿');
    if (target.dataset.action === 'save') save('待收货');
  });

  page.addEventListener('input', function (event) {
    var pickerRow = event.target.closest('[data-purchase-picker-product]');
    if (batchPickerState && pickerRow && event.target.matches('[data-purchase-picker-quantity], [data-purchase-picker-remark]')) {
      var code = pickerRow.dataset.purchasePickerProduct;
      var draft = batchPickerState.drafts.get(code) || {};
      if (event.target.matches('[data-purchase-picker-quantity]')) draft.quantity = event.target.value;
      else draft.remark = event.target.value;
      batchPickerState.drafts.set(code, draft);
      return;
    }
    if (event.target.matches('[data-field="product"]')) {
      var row = event.target.closest('tr[data-line-id]');
      var line = lines.find(function (item) { return item.id === row?.dataset.lineId; });
      var selected = productForInput(event.target.value);
      if (line && selected) {
        line.productCode = selected.code;
        line.productName = selected.name;
        line.unit = selected.unit;
        line.brand = selected.brand;
        line.spec = selected.spec;
        line.image = selected.image || '';
        line.marketPrice = Number(selected.marketPrice || 0);
        renderRows();
      }
      return;
    }
    if (event.target.matches('[data-field="quantity"], [data-field="purchasePrice"], [data-field="remark"]')) updateLineFromInput(event.target);
    if (event.target.matches('#purchaseRemark')) page.querySelector('#purchaseRemarkCount').textContent = String(event.target.value.length);
  });

  page.addEventListener('change', function (event) {
    if (batchPickerState && event.target.matches('[data-purchase-picker-check]')) {
      if (event.target.checked) batchPickerState.selected.add(event.target.value);
      else batchPickerState.selected.delete(event.target.value);
      return;
    }
    if (batchPickerState && event.target.matches('[data-purchase-picker-check-all]')) {
      page.querySelectorAll('[data-purchase-picker-check]:not(:disabled)').forEach(function (checkbox) { checkbox.checked = event.target.checked; if (event.target.checked) batchPickerState.selected.add(checkbox.value); else batchPickerState.selected.delete(checkbox.value); });
      return;
    }
    if (event.target.matches('[data-field="product"]')) {
      var row = event.target.closest('tr[data-line-id]');
      var line = lines.find(function (item) { return item.id === row?.dataset.lineId; });
      var selected = productForInput(event.target.value);
      if (line && selected) {
        line.productCode = selected.code;
        line.productName = selected.name;
        line.unit = selected.unit;
        line.brand = selected.brand;
        line.spec = selected.spec;
        line.image = selected.image || '';
        line.marketPrice = Number(selected.marketPrice || 0);
        renderRows();
      }
    }
  });

  renderRows();
  var datalist = document.createElement('datalist');
  datalist.id = 'purchaseProductOptions';
  datalist.innerHTML = productOptions;
  page.appendChild(datalist);
})();
