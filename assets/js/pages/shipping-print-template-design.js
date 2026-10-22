(function () {
  const escapeHtml = (value) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const fieldOptions = [
    ['expectedAt', '期望送达时间', '2026-09-06 07:30:00'],
    ['customerName', '客户名称', '静安第一中学'],
    ['customerCode', '学校编码', '07'],
    ['canteen', '食堂', '第一食堂'],
    ['receiver', '收货人', '周老师（13800000208）'],
    ['orderNo', '订单号', 'DD202608290300003'],
    ['orderTag', '订单标签', '学生-不区分'],
    ['mealCount', '就餐人次', '教师-不区分：--　学生-不区分：--'],
    ['meal', '餐次', '午餐'],
    ['deliveryPerson', '配送人', '--'],
    ['address', '收货地址', '配送路9号']
  ];
  const columnOptions = [
    ['code', '商品编号'], ['name', '商品名称'], ['unit', '单位'],
    ['orderQty', '下单数量'], ['unitPrice', '下单单价'], ['shippingQty', '发货数量'],
    ['subtotal', '发货小计'], ['packageQty', '分包数量'], ['packageUnit', '分包单位'],
    ['accepted', '验收数量'], ['productionDate', '生产日期']
  ];
  const sampleRows = [
    { code: 'SP0300020', name: '西红柿（KG/--/散装）', unit: 'KG', orderQty: '54.40', unitPrice: '--', shippingQty: '0.00', subtotal: '0.00', packageQty: '--', packageUnit: '--', accepted: '', productionDate: '' },
    { code: 'SP0300018', name: '鸡蛋（斤/--/--）', unit: '斤', orderQty: '34.00', unitPrice: '--', shippingQty: '0.00', subtotal: '0.00', packageQty: '--', packageUnit: '--', accepted: '', productionDate: '' },
    { code: 'SP0300017', name: '金龙鱼豆油（斤/--/--）', unit: '斤', orderQty: '6.80', unitPrice: '--', shippingQty: '0.00', subtotal: '0.00', packageQty: '--', packageUnit: '--', accepted: '', productionDate: '' }
  ];
  const presets = [
    { id: 'order-standard', type: 'order', name: '订单配送单（标准）', note: '包含订单信息、商品明细、二维码和签收区', isDefault: true },
    { id: 'order-compact', type: 'order', name: '订单配送单（简洁）', note: '保留核心字段，适合较多商品的订单', isDefault: false },
    { id: 'shipping-standard', type: 'shipping', name: '发货配送单（标准）', note: '按客户与食堂汇总发货明细', isDefault: true }
  ];
  const pageOptions = [
    { value: 'order', label: '订单发货出库' },
    { value: 'shipping', label: '发货出库' }
  ];

  function configFor(preset) {
    const compact = preset.id === 'order-compact';
    return {
      name: preset.name,
      company: '赣州客家新源供应链有限公司',
      showQr: !compact,
      showSignature: true,
      showPageNumber: true,
      fields: fieldOptions.map(([key]) => key).filter((key) => !compact || !['orderTag', 'mealCount', 'deliveryPerson'].includes(key)),
      columns: columnOptions.map(([key]) => key).filter((key) => !compact || !['unitPrice', 'packageQty', 'packageUnit', 'accepted', 'productionDate'].includes(key))
    };
  }

  const state = {
    type: 'order',
    view: 'list',
    current: null,
    config: null
  };
  const root = window.AppShell.mount({ title: '打印模版', content: '<div id="shippingTemplateDesignRoot"></div>' });
  const host = root.querySelector('#shippingTemplateDesignRoot');

  function typeName(type) { return pageOptions.find((item) => item.value === type)?.label || type || '其他页面'; }

  function renderList() {
    return `<section class="shipping-template-page shipping-template-list-page">
      <header class="shipping-template-page-header shipping-template-list-toolbar"><button type="button" class="shipping-template-primary" data-template-action="new">＋ 新增</button></header>
      <div class="shipping-template-table-wrap"><table class="shipping-template-table"><thead><tr><th>模版名称</th><th>适用页面</th><th>纸张</th><th>状态</th><th>操作</th></tr></thead><tbody>${presets.map((item) => `<tr data-template-row="${escapeHtml(item.id)}"><td><strong>${escapeHtml(item.name)}</strong></td><td>${escapeHtml(typeName(item.type))}</td><td>A4 横向</td><td>${item.isDefault ? '<span class="shipping-template-default">默认模版</span>' : '<span class="shipping-template-draft">示例模版</span>'}</td><td><button type="button" class="shipping-template-outline" data-template-open="${escapeHtml(item.id)}">查看设计</button></td></tr>`).join('')}</tbody></table></div>
    </section>`;
  }

  function renderQr() {
    return '<svg class="shipping-template-qr" viewBox="0 0 45 45" role="img" aria-label="二维码示意"><rect width="45" height="45" fill="#fff"/><path d="M2 2h13v13H2zM5 5v7h7V5zM30 2h13v13H30zM33 5v7h7V5zM2 30h13v13H2zM5 33v7h7v-7zM20 2h4v4h-4zM18 9h4v6h-4zM23 14h5v4h-5zM18 22h5v5h-5zM28 21h4v5h-4zM35 19h7v4h-7zM19 31h4v4h-4zM25 28h4v4h-4zM32 30h11v4H32zM21 39h5v4h-5zM29 37h4v6h-4zM38 38h5v5h-5z" fill="#111"/></svg>';
  }

  function renderPreview() {
    const config = state.config;
    const fields = fieldOptions.filter(([key]) => config.fields.includes(key));
    const columns = columnOptions.filter(([key]) => config.columns.includes(key));
    return `<div class="shipping-template-paper"><div class="shipping-template-paper-heading"><h2>${escapeHtml(config.company)}配送单</h2>${config.showQr ? renderQr() : ''}</div>
      <div class="shipping-template-paper-info">${fields.map(([, label, value]) => `<span><b>${escapeHtml(label)}：</b>${escapeHtml(value)}</span>`).join('')}</div>
      <div class="shipping-template-paper-table-wrap"><table class="shipping-template-paper-table"><thead><tr>${columns.map(([, label]) => `<th>${escapeHtml(label)}</th>`).join('')}</tr></thead><tbody>${sampleRows.map((row) => `<tr>${columns.map(([key]) => `<td>${escapeHtml(row[key])}</td>`).join('')}</tr>`).join('')}<tr class="shipping-template-paper-total"><td colspan="${columns.length}">发货总金额：0.00　　大写总金额：零元整</td></tr></tbody></table></div>
      ${config.showSignature ? '<div class="shipping-template-paper-signature"><span>经手人或单位：周老师</span><span>送货人：</span><span>验收人或单位：</span></div>' : ''}
      ${config.showPageNumber ? '<div class="shipping-template-paper-page-number">1/1</div>' : ''}</div>`;
  }

  function renderEditor() {
    const config = state.config;
    return `<section class="shipping-template-page shipping-template-editor"><header class="shipping-template-editor-header"><button type="button" class="shipping-template-back" data-template-action="list"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/><path d="M19 12H9"/></svg><span>返回</span></button><h1>打印模版设计</h1></header>
      <div class="shipping-template-editor-body"><aside class="shipping-template-settings"><div class="shipping-template-settings-heading"><strong>模板设置</strong><span>A4 横向</span></div>
        <div class="shipping-template-settings-scroll"><section class="shipping-template-setting-group"><h2>基本信息</h2><label class="shipping-template-text-field">模版名称<input type="text" data-template-text="name" maxlength="40" value="${escapeHtml(config.name)}"></label><label class="shipping-template-text-field">适用页面<select data-template-page>${pageOptions.map((item) => `<option value="${escapeHtml(item.value)}" ${state.type === item.value ? 'selected' : ''}>${escapeHtml(item.label)}</option>`).join('')}</select></label><label class="shipping-template-text-field">单据标题<input type="text" data-template-text="company" maxlength="40" value="${escapeHtml(config.company)}"></label><p class="shipping-template-setting-hint">单据标题后自动显示“配送单”</p></section>
        <section class="shipping-template-setting-group"><h2>页头字段 <span>${config.fields.length}/${fieldOptions.length}</span></h2><div class="shipping-template-check-list">${fieldOptions.map(([key, label]) => `<label><input type="checkbox" data-template-field="${key}" ${config.fields.includes(key) ? 'checked' : ''}><span>${label}</span></label>`).join('')}</div></section>
        <section class="shipping-template-setting-group"><h2>商品表格列 <span>${config.columns.length}/${columnOptions.length}</span></h2><div class="shipping-template-check-list">${columnOptions.map(([key, label]) => `<label><input type="checkbox" data-template-column="${key}" ${config.columns.includes(key) ? 'checked' : ''}><span>${label}</span></label>`).join('')}</div></section>
        <section class="shipping-template-setting-group"><h2>其他区域</h2><div class="shipping-template-check-list">${[['showQr', '显示二维码'], ['showSignature', '显示签收区'], ['showPageNumber', '显示页码']].map(([key, label]) => `<label><input type="checkbox" data-template-option="${key}" ${config[key] ? 'checked' : ''}><span>${label}</span></label>`).join('')}</div></section></div>
      </aside><div class="shipping-template-preview"><div class="shipping-template-preview-stage" id="shippingTemplatePreview">${renderPreview()}</div></div></div>
    </section>`;
  }

  function render() { host.innerHTML = state.view === 'editor' ? renderEditor() : renderList(); }
  function updatePreview() { const preview = host.querySelector('#shippingTemplatePreview'); if (preview) preview.innerHTML = renderPreview(); }

  host.addEventListener('click', (event) => {
    const openButton = event.target.closest('[data-template-open]');
    if (openButton) {
      const preset = presets.find((item) => item.id === openButton.dataset.templateOpen);
      if (!preset) return;
      state.type = preset.type;
      state.current = preset.id;
      state.config = configFor(preset);
      state.view = 'editor';
      render();
      return;
    }
    const action = event.target.closest('[data-template-action]')?.dataset.templateAction;
    if (action === 'list') { state.view = 'list'; render(); }
    if (action === 'new') {
      state.current = null;
      state.type = 'order';
      state.config = configFor({ id: 'new', name: '新建配送单模板' });
      state.view = 'editor';
      render();
    }
  });

  host.addEventListener('input', (event) => {
    const key = event.target.dataset.templateText;
    if (!key || !state.config) return;
    state.config[key] = event.target.value;
    if (key === 'company') updatePreview();
  });

  host.addEventListener('change', (event) => {
    if (!state.config) return;
    const input = event.target;
    if (input.matches('[data-template-page]')) { state.type = input.value; return; }
    const field = input.dataset.templateField;
    const column = input.dataset.templateColumn;
    const option = input.dataset.templateOption;
    if (field || column) {
      const key = field ? 'fields' : 'columns';
      const value = field || column;
      const values = new Set(state.config[key]);
      if (input.checked) values.add(value); else values.delete(value);
      if (!values.size) { input.checked = true; return; }
      state.config[key] = [...values];
      const count = input.closest('.shipping-template-setting-group')?.querySelector('h2 span');
      if (count) count.textContent = `${values.size}/${field ? fieldOptions.length : columnOptions.length}`;
    }
    if (option) state.config[option] = input.checked;
    updatePreview();
  });

  render();
})();
