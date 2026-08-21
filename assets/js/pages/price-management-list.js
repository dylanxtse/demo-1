(function () {
  const esc = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  const money = (value) => value === '' || value == null || value === '--' ? '--' : Number(value).toFixed(2);
  const today = '2026-08-20';

  function purchaseRows() {
    return (window.PriceExecutionService?.getList('purchase') || []).map((row, index) => ({
      id: row.id,
      productNo: row.code,
      productName: row.name,
      productMeta: `${row.unit}/${row.brand || '--'}/${row.spec || '--'}`,
      category: row.category,
      supplier: row.supplier === '--' ? ['绿源供应商', '粮油供应商', '乳业供应商'][index % 3] : row.supplier,
      purchaseType: row.purchaseType,
      referencePrice: money(row.currentPrice || (5 + index * 0.7)),
      quote: money(row.currentPrice || (5.4 + index * 0.7)),
      status: ['报价中', '已报价', '已结束'][index % 3],
      quotedAt: `2026-08-${String(20 - index % 12).padStart(2, '0')}`
    }));
  }

  function salesRows() {
    return (window.PriceExecutionService?.getList('sales') || []).map((row, index) => ({
      ...(() => { const current = Number(row.currentPrice) || (6 + index * 0.8); return { marketPrice: money(current), agreedPrice: money(current + 0.6), originalPrice: money(current), newPrice: money(current + 0.4) }; })(),
      id: row.id,
      productNo: row.code,
      productName: row.name,
      productMeta: `${row.unit}/${row.brand || '--'}/${row.spec || '--'}`,
      category: row.category,
      customerName: row.customerName,
      district: row.district,
      source: ['市场采集', '供应商报价', '人工录入'][index % 3],
      status: ['待确认', '已生效', '已失效'][index % 3],
      updatedAt: `2026-08-${String(20 - index % 12).padStart(2, '0')}`
    }));
  }

  function marketInquiryRows() {
    return [
      { id: 'XJD202608190300001', inquiryDate: '2026-08-19', inquiryNo: 'XJD202608190300001', inquiryName: '123123', addedBy: '杨', status: '询价中' },
      { id: 'XJD202608190300002', inquiryDate: '2026-08-19', inquiryNo: 'XJD202608190300002', inquiryName: '123123', addedBy: '杨', status: '询价中' },
      { id: 'XJD202608190300003', inquiryDate: '2026-08-19', inquiryNo: 'XJD202608190300003', inquiryName: '123123', addedBy: '杨', status: '询价中' }
    ];
  }

  const pageConfigs = {
    inquiry: {
      title: '询价报价', mode: 'purchase', addLabel: '新建询价', importLabel: '导入询价',
      filters: [
        { key: 'supplier', label: '供应商', type: 'select' },
        { key: 'category', label: '商品分类', type: 'select' },
        { key: 'productName', label: '商品名称', type: 'input', placeholder: '请输入商品名称/编号' },
        { key: 'status', label: '报价状态', type: 'select' }
      ],
      rows: purchaseRows,
      columns: [
        { key: 'productNo', label: '商品编号' },
        { key: 'productName', label: '商品名称', product: true },
        { key: 'category', label: '商品分类' },
        { key: 'supplier', label: '供应商' },
        { key: 'purchaseType', label: '采购类型' },
        { key: 'referencePrice', label: '参考价（元）', money: true },
        { key: 'quote', label: '报价（元）', money: true },
        { key: 'quotedAt', label: '报价时间' },
        { key: 'status', label: '状态', status: true }
      ],
      newRow: (draft, index) => ({
        id: `INQ-${Date.now()}`, productNo: `SP-NEW-${String(index + 1).padStart(3, '0')}`,
        productName: draft.productName || '待报价商品', productMeta: '斤/--/--', category: draft.category || '果蔬',
        supplier: draft.supplier || '待选择供应商', purchaseType: '供应商送货', referencePrice: money(draft.price || 0),
        quote: '--', status: '报价中', quotedAt: today
      })
    },
    purchaseAgreement: {
      title: '采购协议价', mode: 'purchase', addLabel: '新建采购协议', importLabel: '导入协议价',
      filters: [
        { key: 'supplier', label: '供应商', type: 'select' },
        { key: 'category', label: '商品分类', type: 'select' },
        { key: 'productName', label: '商品名称', type: 'input', placeholder: '请输入商品名称/编号' },
        { key: 'status', label: '协议状态', type: 'select' }
      ],
      rows: () => purchaseRows().map((row, index) => ({
        ...row, agreementNo: `CGXY202608${String(index + 1).padStart(4, '0')}`,
        validPeriod: `2026-08-01 至 2026-08-${String(20 + index % 10).padStart(2, '0')}`,
        agreementPrice: money(Number(row.referencePrice) + 0.2), status: ['已生效', '待生效', '已过期'][index % 3]
      })),
      columns: [
        { key: 'agreementNo', label: '协议编号' }, { key: 'supplier', label: '供应商' },
        { key: 'productName', label: '商品名称', product: true }, { key: 'category', label: '商品分类' },
        { key: 'agreementPrice', label: '协议价（元）', money: true }, { key: 'validPeriod', label: '有效期' },
        { key: 'status', label: '状态', status: true }
      ],
      newRow: (draft) => ({
        id: `AGR-${Date.now()}`, agreementNo: `CGXY${Date.now().toString().slice(-8)}`,
        supplier: draft.supplier || '待选择供应商', productName: draft.productName || '待选择商品', productMeta: '斤/--/--',
        category: draft.category || '果蔬', agreementPrice: money(draft.price || 0), validPeriod: '2026-08-20 至 2026-12-31', status: '待生效'
      })
    },
    marketInquiry: {
      title: '市场询价', mode: 'sales', rowMode: 'marketInquiry', addLabel: '添加市场询价单', importLabel: '', hideExport: true,
      tabs: ['市场询价管理', '询价小组管理', '询价地点管理'],
      filters: [
        { key: 'inquiryDate', label: '询价日期', type: 'date-range', from: '2026-07-22', to: '2026-08-22' },
        { key: 'status', label: '单据状态', type: 'select', options: ['全部', '询价中', '已生效', '已结束'] },
        { key: 'addedBy', label: '添加人', type: 'input', placeholder: '请输入' }
      ],
      rows: marketInquiryRows,
      columns: [
        { key: 'inquiryDate', label: '询价日期' }, { key: 'inquiryNo', label: '单据编号' },
        { key: 'inquiryName', label: '询价单名称' }, { key: 'addedBy', label: '添加人' },
        { key: 'status', label: '状态', status: true }
      ],
      newRow: (draft) => ({
        id: `XJD${today.replaceAll('-', '')}${Date.now().toString().slice(-6)}`,
        inquiryDate: today, inquiryNo: `XJD${today.replaceAll('-', '')}${Date.now().toString().slice(-6)}`,
        inquiryName: draft.inquiryName || draft.productName || '新增市场询价单', addedBy: '管理员', status: '询价中'
      })
    },
    salesAgreement: {
      title: '销售协议价', mode: 'sales', addLabel: '新建销售协议', importLabel: '导入协议价',
      tabs: ['销售协议价', '协议价商品'],
      filters: [
        { key: 'updatedAt', label: '添加日期', type: 'date-range', from: '2026-07-20', to: '2026-08-20' },
        { key: 'customerName', label: '客户名称', type: 'select' },
        { key: 'status', label: '状态', type: 'select' },
        { key: 'productName', label: '商品名称', type: 'input', placeholder: '请输入商品名称/编号' }
      ],
      rows: () => salesRows().map((row, index) => ({
        ...row, agreementNo: `XSXY202608${String(index + 1).padStart(4, '0')}`,
        validPeriod: `2026-08-01 至 2026-12-${String(20 + index % 10).padStart(2, '0')}`,
        agreedPrice: money(Number(row.agreedPrice) + 0.1), status: ['已生效', '待生效', '已过期'][index % 3]
      })),
      columns: [
        { key: 'agreementNo', label: '协议编号' }, { key: 'customerName', label: '客户名称' },
        { key: 'productName', label: '商品名称', product: true }, { key: 'category', label: '商品分类' },
        { key: 'agreedPrice', label: '协议价（元）', money: true }, { key: 'validPeriod', label: '有效期' },
        { key: 'status', label: '状态', status: true }
      ],
      productColumns: [
        { key: 'productName', label: '商品名称', product: true }, { key: 'category', label: '商品分类' },
        { key: 'customerName', label: '客户名称' }, { key: 'agreedPrice', label: '协议价（元）', money: true },
        { key: 'validPeriod', label: '有效期' }, { key: 'status', label: '状态', status: true }
      ],
      newRow: (draft) => ({
        id: `SAGR-${Date.now()}`, agreementNo: `XSXY${Date.now().toString().slice(-8)}`,
        customerName: draft.customerName || '待选择客户', productName: draft.productName || '待选择商品', productMeta: '斤/--/--',
        category: draft.category || '果蔬', agreedPrice: money(draft.price || 0), validPeriod: '2026-08-20 至 2026-12-31', status: '待生效'
      })
    },
    settlementChange: {
      title: '结算改价', mode: 'sales', addLabel: '新建改价单', importLabel: '导入改价单',
      filters: [
        { key: 'updatedAt', label: '改价日期', type: 'date-range', from: '2026-07-20', to: '2026-08-20' },
        { key: 'customerName', label: '客户名称', type: 'select' },
        { key: 'status', label: '状态', type: 'select' },
        { key: 'productName', label: '商品名称', type: 'input', placeholder: '请输入商品名称/编号' }
      ],
      rows: () => salesRows().map((row, index) => ({
        ...row, settlementNo: `JSJG202608${String(index + 1).padStart(4, '0')}`,
        orderNo: `DD202608${String(index + 1).padStart(6, '0')}`,
        reason: ['临时促销', '客户补差', '配送损耗'][index % 3], status: ['待审核', '已生效', '已驳回'][index % 3]
      })),
      columns: [
        { key: 'settlementNo', label: '改价单号' }, { key: 'orderNo', label: '订单号' },
        { key: 'customerName', label: '客户名称' }, { key: 'productName', label: '商品名称', product: true },
        { key: 'originalPrice', label: '原结算价（元）', money: true }, { key: 'newPrice', label: '调整后价格（元）', money: true },
        { key: 'reason', label: '改价原因' }, { key: 'status', label: '状态', status: true }, { key: 'updatedAt', label: '更新时间' }
      ],
      newRow: (draft) => ({
        id: `SCHG-${Date.now()}`, settlementNo: `JSJG${Date.now().toString().slice(-8)}`,
        orderNo: `DD${Date.now().toString().slice(-10)}`, customerName: draft.customerName || '待选择客户',
        productName: draft.productName || '待选择商品', productMeta: '斤/--/--', originalPrice: money(draft.price || 0),
        newPrice: money(Number(draft.price || 0) + 0.2), reason: draft.reason || '临时调价', status: '待审核', updatedAt: today
      })
    }
  };

  const pageKey = document.body.dataset.pricePage || 'inquiry';
  const config = pageConfigs[pageKey] || pageConfigs.inquiry;
  const state = { rows: [], filteredRows: [], page: 1, pageSize: 20, pagination: null, editingId: null, toastTimer: null, datePickers: [], datePickerMap: {}, activeTab: 0 };

  function optionValues(key) { return [...new Set(state.rows.map((row) => row[key]).filter(Boolean))]; }
  function dateRangeMarkup(id, from = '', to = '') {
    return `<div class="date-range-picker" id="${id}-range"><input class="filter-input date-range-display" id="${id}" type="text" readonly placeholder="请选择日期"><input type="hidden" data-date-start value="${esc(from)}"><input type="hidden" data-date-end value="${esc(to)}"><span class="date-range-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></span></div>`;
  }
  function destroyDatePickers() {
    state.datePickers.forEach((picker) => picker?.destroy?.());
    state.datePickers = [];
    state.datePickerMap = {};
  }
  function mountDatePickers() {
    if (!window.DateRangePicker) return;
    document.querySelectorAll('.price-management-page .date-range-picker').forEach((container) => {
      const picker = window.DateRangePicker.create({ container });
      if (picker) { state.datePickers.push(picker); state.datePickerMap[container.id] = picker; }
    });
  }
  function renderFilters() {
    destroyDatePickers();
    document.getElementById('priceManagementFilters').innerHTML = config.filters.map((field) => {
      const id = `price-management-${field.key}`;
      const control = field.type === 'date-range'
        ? dateRangeMarkup(id, field.from, field.to)
        : field.type === 'select'
          ? `<select class="filter-select" id="${id}"><option value="">全部</option>${(field.options || optionValues(field.key)).filter((value) => value !== '全部').map((value) => `<option value="${esc(value)}">${esc(value)}</option>`).join('')}</select>`
          : `<input class="filter-input" id="${id}" placeholder="${esc(field.placeholder || '请输入')}" autocomplete="off">`;
      return `<div class="operations-field ${field.type === 'date-range' ? 'date-range-field' : ''}"><label class="filter-label" for="${id}">${esc(field.label)}</label>${control}</div>`;
    }).join('');
    mountDatePickers();
  }
  function filterRows() {
    state.filteredRows = state.rows.filter((row) => config.filters.every((field) => {
      if (field.type === 'date-range') {
        const range = document.getElementById(`price-management-${field.key}-range`);
        const from = range?.querySelector('[data-date-start]')?.value || '';
        const to = range?.querySelector('[data-date-end]')?.value || '';
        const date = String(row[field.key] || '').slice(0, 10);
        return (!from || date >= from) && (!to || date <= to);
      }
      const value = document.getElementById(`price-management-${field.key}`)?.value.trim().toLowerCase() || '';
      return !value || String(row[field.key] ?? '').toLowerCase().includes(value);
    }));
    state.page = 1;
    renderTable();
  }
  function renderValue(row, column) {
    const value = row[column.key];
    if (column.product) return `<div class="price-management-product"><strong>${esc(value)}</strong><small>${esc(row.productMeta || '')}</small></div>`;
    if (column.money) return value === '--' ? '--' : `<span class="price-management-money">${esc(money(value))}</span>`;
    if (column.status) {
      const good = ['已生效', '已报价'].includes(value);
      const warning = ['询价中', '待确认', '待生效', '待审核'].includes(value);
      return `<span class="status-tag ${good ? 'online' : warning ? 'warning' : 'offline'}">${esc(value)}</span>`;
    }
    return esc(value ?? '--');
  }
  function renderTable() {
    const start = (state.page - 1) * state.pageSize;
    const pageRows = state.filteredRows.slice(start, start + state.pageSize);
    if (config.rowMode === 'marketInquiry') {
      const body = pageRows.length ? pageRows.map((row, index) => `<tr><td class="price-seq">${start + index + 1}</td><td>${esc(row.inquiryDate)}</td><td><button class="btn-text cell-link" type="button" data-row-action="view" data-id="${esc(row.id)}">${esc(row.inquiryNo)}</button></td><td>${esc(row.inquiryName)}</td><td>${esc(row.addedBy)}</td><td>${renderValue(row, { key: 'status', status: true })}</td><td class="price-management-actions"><button class="btn-text" type="button" data-row-action="fill" data-id="${esc(row.id)}">填写价格</button><span class="action-divider"></span><button class="btn-text" type="button" data-row-action="copy" data-id="${esc(row.id)}">复制</button><span class="action-divider"></span><button class="btn-text" type="button" data-row-action="activate" data-id="${esc(row.id)}">生效</button><span class="action-divider"></span><button class="btn-text" type="button" data-row-action="sync" data-id="${esc(row.id)}" disabled>同步商品基础信息</button></td></tr>`).join('') : `<tr><td class="price-management-empty" colspan="7">暂无符合条件的数据</td></tr>`;
      document.getElementById('priceManagementHead').innerHTML = '<tr><th>序号</th><th>询价日期</th><th>单据编号</th><th>询价单名称</th><th>添加人</th><th>状态</th><th>操作</th></tr>';
      document.getElementById('priceManagementBody').innerHTML = body;
      state.pagination?.update({ total: state.filteredRows.length, page: state.page, pageSize: state.pageSize });
      return;
    }
    const columns = config.productColumns && state.activeTab === 1 ? config.productColumns : config.columns;
    const head = columns.map((column) => `<th>${esc(column.label)}</th>`).join('') + '<th>操作</th>';
    const body = pageRows.length ? pageRows.map((row) => `<tr>${columns.map((column) => `<td>${renderValue(row, column)}</td>`).join('')}<td class="price-management-actions"><button class="btn-text" type="button" data-row-action="edit" data-id="${esc(row.id)}">编辑</button><span class="action-divider"></span><button class="btn-text" type="button" data-row-action="view" data-id="${esc(row.id)}">查看</button></td></tr>`).join('') : `<tr><td class="price-management-empty" colspan="${columns.length + 1}">暂无符合条件的数据</td></tr>`;
    document.getElementById('priceManagementHead').innerHTML = `<tr>${head}</tr>`;
    document.getElementById('priceManagementBody').innerHTML = body;
    document.getElementById('priceManagementSummary').textContent = `共 ${state.filteredRows.length} 条数据`;
    state.pagination?.update({ total: state.filteredRows.length, page: state.page, pageSize: state.pageSize });
  }
  function toast(message, type = '') {
    const element = document.getElementById('priceManagementToast');
    clearTimeout(state.toastTimer); element.textContent = message; element.className = `price-management-toast is-visible ${type}`;
    state.toastTimer = setTimeout(() => { element.className = 'price-management-toast'; }, 2200);
  }
  function openForm(row) {
    state.editingId = row?.id || null;
    document.getElementById('priceManagementModalTitle').textContent = row ? `编辑${config.title}` : config.addLabel;
    document.getElementById('pmProductName').value = row?.productName || '';
    document.getElementById('pmSupplier').value = row?.supplier || row?.customerName || '';
    document.getElementById('pmPrice').value = row?.newPrice || row?.agreedPrice || row?.agreementPrice || row?.marketPrice || row?.quote || '';
    document.getElementById('pmReason').value = row?.reason || '';
    document.getElementById('priceManagementModal').classList.add('is-visible');
  }
  function closeForm() { state.editingId = null; document.getElementById('priceManagementModal').classList.remove('is-visible'); }
  function saveForm(event) {
    event.preventDefault();
    const draft = {
      productName: document.getElementById('pmProductName').value.trim(),
      supplier: document.getElementById('pmSupplier').value.trim(), customerName: document.getElementById('pmSupplier').value.trim(),
      price: document.getElementById('pmPrice').value.trim(), reason: document.getElementById('pmReason').value.trim()
    };
    if (!draft.productName) { toast('请填写商品名称', 'error'); return; }
    if (!draft.price || Number.isNaN(Number(draft.price))) { toast('请填写有效价格', 'error'); return; }
    if (state.editingId) {
      const row = state.rows.find((item) => item.id === state.editingId);
      if (row) {
        row.productName = draft.productName;
        if ('quote' in row) row.quote = money(draft.price);
        if ('marketPrice' in row) row.marketPrice = money(draft.price);
        if ('agreedPrice' in row) row.agreedPrice = money(draft.price);
        if ('agreementPrice' in row) row.agreementPrice = money(draft.price);
        if ('newPrice' in row) row.newPrice = money(draft.price);
        if (draft.reason) row.reason = draft.reason;
      }
      toast('保存成功');
    } else {
      state.rows.unshift(config.newRow(draft, state.rows.length));
      toast('新增成功');
    }
    closeForm(); renderFilters(); filterRows();
  }
  function exportRows() {
    const headers = [...config.columns.map((column) => column.label)];
    const csvRows = state.filteredRows.map((row) => config.columns.map((column) => row[column.key] ?? ''));
    const csv = [headers, ...csvRows].map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' }));
    link.download = `${config.title}.csv`; link.click(); URL.revokeObjectURL(link.href); toast('导出成功');
  }
  const content = `
    <div class="page-card price-management-page ${config.rowMode ? `${config.rowMode}-page` : ''}">
      ${config.tabs ? `<div class="price-management-tabs" role="tablist">${config.tabs.map((tab, index) => `<button type="button" class="${index === 0 ? 'active' : ''}" data-page-tab="${index}">${esc(tab)}</button>`).join('')}</div>` : ''}
      <section class="operations-filter price-management-filter"><div class="operations-filter-main"><div class="operations-filter-grid" id="priceManagementFilters"></div><div class="operations-filter-actions"><button class="btn btn-primary btn-sm" type="button" data-action="query">查询</button><button class="btn btn-sm" type="button" data-action="reset">重置</button></div></div></section>
      <div class="operations-toolbar price-management-toolbar"><button class="btn btn-primary btn-sm" type="button" data-action="add">${esc(config.addLabel)}</button>${config.importLabel ? `<button class="btn btn-blue btn-sm" type="button" data-action="import">${esc(config.importLabel)}</button>` : ''}<span class="toolbar-spacer"></span><span class="operations-summary" id="priceManagementSummary"></span>${config.hideExport ? '' : '<button class="btn btn-sm" type="button" data-action="export">导出</button>'}</div>
      <div class="operations-table-wrap price-management-table-wrap"><table class="operations-table price-management-table"><thead id="priceManagementHead"></thead><tbody id="priceManagementBody"></tbody></table></div>
      <div class="pagination price-management-pagination" id="priceManagementPagination"></div>
      <div class="price-management-toast" id="priceManagementToast" role="status"></div>
      <div class="price-management-modal" id="priceManagementModal" aria-hidden="true"><div class="price-management-dialog"><div class="price-management-dialog-head"><h2 id="priceManagementModalTitle">${esc(config.addLabel)}</h2><button class="price-management-close" type="button" data-action="close">×</button></div><form id="priceManagementForm"><div class="price-management-dialog-body"><label>商品名称<input id="pmProductName" required placeholder="请输入商品名称"></label><label>${config.mode === 'purchase' ? '供应商' : '客户名称'}<input id="pmSupplier" placeholder="请输入"></label><label>价格（元）<input id="pmPrice" type="number" min="0" step="0.01" required placeholder="请输入"></label><label>备注<textarea id="pmReason" rows="2" placeholder="请输入备注"></textarea></label></div><div class="price-management-dialog-foot"><button class="btn btn-sm" type="button" data-action="close">取消</button><button class="btn btn-primary btn-sm" type="submit">保存</button></div></form></div></div>
    </div>`;
  const root = window.AppShell.mount({ title: config.title, content });
  state.rows = config.rows(); state.filteredRows = [...state.rows]; renderFilters();
  state.pagination = window.Pagination.create({ container: '#priceManagementPagination', total: state.filteredRows.length, page: 1, pageSize: state.pageSize, pageSizeOptions: [20, 50, 100], maxVisiblePages: 5, showArrows: true, onChange: ({ page, pageSize }) => { state.page = page; state.pageSize = pageSize; renderTable(); } });
  root.addEventListener('click', (event) => {
    const tabButton = event.target.closest('[data-page-tab]');
    if (tabButton && config.tabs) {
      state.activeTab = Number(tabButton.dataset.pageTab) || 0;
      root.querySelectorAll('[data-page-tab]').forEach((button) => button.classList.toggle('active', button === tabButton));
      renderTable();
      return;
    }
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'query') filterRows();
    if (action === 'reset') {
      config.filters.forEach((field) => {
        if (field.type === 'date-range') state.datePickerMap[`price-management-${field.key}-range`]?.setValue(field.from || '', field.to || '', false);
        else { const el = document.getElementById(`price-management-${field.key}`); if (el) el.value = ''; }
      });
      filterRows();
    }
    if (action === 'add') openForm();
    if (action === 'import') toast('请选择文件后导入', 'error');
    if (action === 'export') exportRows();
    if (action === 'close') closeForm();
    const rowAction = event.target.closest('[data-row-action]');
    if (rowAction) {
      const row = state.rows.find((item) => item.id === rowAction.dataset.id);
      if (config.rowMode === 'marketInquiry' && rowAction.dataset.rowAction === 'fill') toast(`填写价格：${row?.inquiryNo || '--'}`);
      if (config.rowMode === 'marketInquiry' && rowAction.dataset.rowAction === 'copy' && row) { state.rows.unshift({ ...row, id: `XJD${Date.now()}`, inquiryNo: `XJD${Date.now()}` }); state.filteredRows = [...state.rows]; renderTable(); toast('复制成功'); }
      if (config.rowMode === 'marketInquiry' && rowAction.dataset.rowAction === 'activate' && row) { row.status = '已生效'; renderTable(); toast('生效成功'); }
      if (rowAction.dataset.rowAction === 'edit') openForm(row);
      if (rowAction.dataset.rowAction === 'view') toast(`${config.title}：${row?.productName || row?.agreementNo || row?.settlementNo || '--'}`);
    }
  });
  document.getElementById('priceManagementForm').addEventListener('submit', saveForm);
  document.getElementById('priceManagementModal').addEventListener('click', (event) => { if (event.target.id === 'priceManagementModal') closeForm(); });
  renderTable();
})();
