(function () {
  const app = document.getElementById('app');
  const pageKey = app?.dataset.page || '';
  const service = window.BiddingService;
  const esc = (value) => String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const valueOf = (root, selector) => root.querySelector(selector)?.value?.trim() || '';
  const all = (root, selector) => [...root.querySelectorAll(selector)];
  const dateNow = () => new Date().toISOString().slice(0, 10);
  const dateAfter = (days) => {
    const date = new Date();
    date.setDate(date.getDate() + Number(days || 0));
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };
  const localDateTimeValue = (date, separator = 'T') => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}${separator}${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
  const dateTimeAfter = (days) => {
    const date = new Date();
    date.setDate(date.getDate() + Number(days || 0));
    date.setHours(23, 59, 59, 0);
    return localDateTimeValue(date);
  };
  const isExpiredDateTime = (value) => {
    const parts = String(value || '').trim().replace('T', ' ').split(/[-\s:]/).map(Number);
    if (parts.length < 3 || parts.some((part) => Number.isNaN(part))) return String(value || '') < dateNow();
    const date = new Date(parts[0], parts[1] - 1, parts[2], parts[3] ?? 23, parts[4] ?? 59, parts[5] ?? 59);
    return date.getTime() <= Date.now();
  };
  const dateTimeNow = () => new Date().toISOString().slice(0, 16).replace('T', ' ');

  function syncNativeDateInput(input) {
    input.classList.toggle('bidding-date-empty', !input.value);
  }

  function syncNativeDateInputs(root = document) {
    all(root, 'input[type="date"], input[type="datetime-local"]').forEach((input) => {
      syncNativeDateInput(input);
      if (input.dataset.datePlaceholderBound) return;
      input.addEventListener('input', () => syncNativeDateInput(input));
      input.addEventListener('change', () => syncNativeDateInput(input));
      input.dataset.datePlaceholderBound = '1';
    });
  }

  function mountBiddingDatePickers(root = document) {
    if (!root || !window.DatePicker?.create) return;
    all(root, 'input[type="date"], input[type="datetime-local"]').forEach((input) => {
      if (input.dataset.biddingDatePickerBound) return;
      const nativeType = input.type;
      const rawValue = input.value || '';
      input.type = 'text';
      input.value = nativeType === 'datetime-local' ? rawValue.replace('T', ' ') : rawValue;
      input.readOnly = true;
      input.classList.remove('bidding-date-empty');
      input.classList.add('bidding-date-picker-input');
      const picker = window.DatePicker.create({
        input,
        withTime: nativeType === 'datetime-local',
        onChange: () => input.dispatchEvent(new Event('change', { bubbles: true }))
      });
      if (!picker) return;
      input.dataset.biddingDatePickerBound = '1';
      input._biddingDatePicker = picker;
    });
  }

  function mount(title, content) {
    // 以实际渲染的业务页面同步入口标识，避免旧入口或缓存导致内容与左侧菜单错位。
    const activePageByTitle = {
      '竞价管理': 'bid-management',
      '竞价规则管理': 'rules-management',
      '竞价限价管理': 'limit-management',
      '废标管理': 'wasted-management',
      '标段管理': 'segment-management',
      '供货关系管理': 'relationship-management',
      '供应商档案': 'supplier-management'
    };
    if (activePageByTitle[title]) app.dataset.page = activePageByTitle[title];
    AppShell.mount({ title, content, variant: 'education', emptyText: title });
    const root = document.getElementById('pageContent');
    syncNativeDateInputs(root);
    mountBiddingDatePickers(root);
    return root;
  }

  function go(url) { window.AppNavigation?.navigate?.(url); }

  function showToast(message, error = false) {
    let toast = document.getElementById('biddingToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'biddingToast';
      toast.className = 'bidding-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.toggle('error', error);
    toast.classList.add('show');
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2200);
  }

  function statusClass(status) {
    if (['已开标', '启用'].includes(status)) return 'online';
    if (['暂存', '待开标', '需求提报中', '待审核'].includes(status)) return 'pending';
    if (['已停止', '禁用', '已驳回'].includes(status)) return 'danger';
    return 'offline';
  }

  function statusTag(status) {
    return `<span class="status-tag bidding-status-tag ${statusClass(status)}">${esc(status)}</span>`;
  }

  function categoriesOptions(selected = []) {
    return service.categories.map((category) => `<label class="bidding-category-option"><input type="checkbox" value="${esc(category)}" ${selected.includes(category) ? 'checked' : ''}>${esc(category)}</label>`).join('');
  }

  function selectOptions(values, selected = '', placeholder = '请选择') {
    return `<option value="">${esc(placeholder)}</option>${values.map((value) => `<option value="${esc(value)}" ${String(value) === String(selected) ? 'selected' : ''}>${esc(value)}</option>`).join('')}`;
  }

  function selectedMultiValues(root, key) {
    return all(root, `[data-multi-select="${key}"] input[data-multi-option]:checked`).map((input) => input.value);
  }

  function updateBiddingMultiSelect(root, key) {
    const box = root.querySelector(`[data-multi-select="${key}"]`);
    if (!box) return;
    const checked = all(box, 'input[data-multi-option]:checked');
    const valueNode = box.querySelector('[data-multi-value]');
    const names = checked.map((input) => input.dataset.label || input.value);
    if (valueNode) {
      valueNode.textContent = names.length > 1 ? `${names[0]} 等${names.length}家` : names[0] || '请选择';
      valueNode.classList.toggle('is-placeholder', !names.length);
    }
    all(box, '.bidding-select-option').forEach((option) => {
      option.classList.toggle('selected', Boolean(option.querySelector('input[data-multi-option]:checked')));
    });
  }

  function closeBiddingMultiSelect(box) {
    if (!box) return;
    box.classList.remove('is-open');
    box.querySelector('[data-action="toggle-multi-select"]')?.setAttribute('aria-expanded', 'false');
    const dropdown = box.querySelector('.bidding-select-dropdown');
    if (dropdown) dropdown.style.display = 'none';
  }

  function toggleBiddingMultiSelect(root, box) {
    if (!box || box.classList.contains('is-disabled')) return;
    const isOpen = box.classList.contains('is-open');
    all(root, '.bidding-multi-select.is-open').forEach((other) => closeBiddingMultiSelect(other));
    if (isOpen) return;
    const trigger = box.querySelector('[data-action="toggle-multi-select"]');
    const dropdown = box.querySelector('.bidding-select-dropdown');
    if (!trigger || !dropdown) return;
    const rect = trigger.getBoundingClientRect();
    const margin = 8;
    const below = window.innerHeight - rect.bottom - margin;
    const above = rect.top - margin;
    const openUp = below < 220 && above > below;
    const available = Math.max(120, Math.min(300, openUp ? above : below));
    const left = Math.max(margin, Math.min(rect.left, window.innerWidth - rect.width - margin));
    dropdown.style.left = `${left}px`;
    dropdown.style.width = `${rect.width}px`;
    dropdown.style.maxHeight = `${available}px`;
    dropdown.style.top = `${openUp ? Math.max(margin, rect.top - available - 4) : rect.bottom + 4}px`;
    dropdown.style.display = 'block';
    box.classList.add('is-open');
    trigger.setAttribute('aria-expanded', 'true');
  }

  function setBiddingMultiDisabled(root, key, disabled) {
    const box = root.querySelector(`[data-multi-select="${key}"]`);
    if (!box) return;
    box.classList.toggle('is-disabled', disabled);
    const trigger = box.querySelector('[data-action="toggle-multi-select"]');
    if (trigger) trigger.disabled = disabled;
    all(box, 'input[data-multi-option]').forEach((input) => { input.disabled = disabled; });
    if (disabled) closeBiddingMultiSelect(box);
  }

  function inputValue(value) {
    return esc(value || '');
  }

  function formatLimitPrice(value) {
    return value == null || value === '' ? '--' : Number(value).toFixed(2);
  }

  function toDateInput(value) { return String(value || '').slice(0, 10); }

  function toDateTimeInput(value) { return String(value || '').slice(0, 16).replace(' ', 'T'); }

  function fromDateTimeInput(value) { return String(value || '').replace('T', ' '); }

  function createPager(containerId, total, onChange) {
    return Pagination.create({
      container: `#${containerId}`,
      total,
      page: 1,
      pageSize: 20,
      pageSizeOptions: [20, 50],
      onChange
    });
  }

  function renderBidManagement() {
    const bids = service.get('bids');
    const segments = service.get('segments');
    const content = `
      <div class="page-card bidding-page" id="bidManagementPage">
        <section class="bidding-filter-panel" aria-label="竞价查询">
          <div class="bidding-filter-grid">
            <div class="bidding-filter-item"><label for="bidKeyword">竞价编号/名称</label><input id="bidKeyword" data-filter="keyword" placeholder="请输入"></div>
            <div class="bidding-filter-item"><label>供货周期</label><div class="bidding-range"><input type="date" data-filter="start"><span>至</span><input type="date" data-filter="end"></div></div>
            <div class="bidding-filter-item"><label for="bidSegment">标段</label><select id="bidSegment" data-filter="segment"><option value="">全部</option>${segments.map((item) => `<option value="${esc(item.name)}">${esc(item.name)}</option>`).join('')}</select></div>
            <div class="bidding-filter-item"><label for="bidStatus">状态</label><select id="bidStatus" data-filter="status"><option value="">全部</option>${['暂存', '需求提报中', '待开标', '已开标', '已停止'].map((item) => `<option value="${item}">${item}</option>`).join('')}</select></div>
          </div>
          <div class="bidding-filter-actions"><button class="btn btn-primary btn-sm" type="button" data-action="query">查询</button><button class="btn btn-sm" type="button" data-action="reset">重置</button></div>
        </section>
        <div class="bidding-toolbar"><div class="bidding-toolbar-left"><button class="btn btn-primary btn-sm" type="button" data-action="add-bid">添加竞价</button><button class="btn btn-sm" type="button" data-action="append-bid">追加竞价</button></div></div>
        <div class="bidding-table-container"><div class="bidding-table-wrapper"><table class="bidding-table"><thead><tr>
          <th>序号</th><th>项目编号</th><th>竞价编号</th><th>竞价名称</th><th>供货周期</th><th>标段</th><th>商品类别</th><th>品种数</th><th>报价供应商数</th><th>中标供应商</th><th>状态</th><th>操作</th>
        </tr></thead><tbody id="bidManagementBody"></tbody></table></div><div class="pagination bidding-pagination" id="bidManagementPagination"></div></div>
      </div>`;
    const root = mount('竞价管理', content);
    const state = { rows: bids, filtered: bids, pager: null };

    function filteredRows() {
      const keyword = valueOf(root, '[data-filter="keyword"]').toLowerCase();
      const segment = valueOf(root, '[data-filter="segment"]');
      const status = valueOf(root, '[data-filter="status"]');
      const start = valueOf(root, '[data-filter="start"]');
      const end = valueOf(root, '[data-filter="end"]');
      return state.rows.filter((row) => {
        const textMatch = !keyword || `${row.projectNo} ${row.bidNo} ${row.name}`.toLowerCase().includes(keyword);
        const segmentMatch = !segment || row.segmentName === segment;
        const statusMatch = !status || row.status === status;
        const startMatch = !start || row.supplyEnd >= start;
        const endMatch = !end || row.supplyStart <= end;
        return textMatch && segmentMatch && statusMatch && startMatch && endMatch;
      });
    }

    function actionButtons(row) {
      const isDraft = row.status === '暂存';
      const canStop = ['待开标', '需求提报中'].includes(row.status);
      return `<div class="bidding-actions-cell">
        <button class="bidding-link" type="button" data-action="draw-rule" data-id="${row.id}" ${isDraft ? '' : 'disabled'}>规则抽签</button>
        <button class="bidding-link" type="button" data-action="open-bid" data-id="${row.id}" ${row.status === '待开标' ? '' : 'disabled'}>开标</button>
        <button class="bidding-link" type="button" data-action="stop-bid" data-id="${row.id}" ${canStop ? '' : 'disabled'}>停止竞价</button>
        <button class="bidding-link" type="button" data-action="edit-bid" data-id="${row.id}" ${isDraft ? '' : 'disabled'}>编辑</button>
        <button class="bidding-link danger" type="button" data-action="delete-bid" data-id="${row.id}" ${isDraft ? '' : 'disabled'}>删除</button>
      </div>`;
    }

    function renderTable() {
      state.filtered = filteredRows();
      const pageState = state.pager?.getState() || { page: 1, pageSize: 20 };
      const start = (pageState.page - 1) * pageState.pageSize;
      const visible = state.filtered.slice(start, start + pageState.pageSize);
      root.querySelector('#bidManagementBody').innerHTML = visible.length ? visible.map((row, index) => `<tr>
        <td>${start + index + 1}</td><td>${esc(row.projectNo)}</td><td><a class="bidding-table-link" href="./bid-management-detail.html?id=${encodeURIComponent(row.id)}">${esc(row.bidNo)}</a></td><td class="align-left">${esc(row.name)}</td>
        <td>${esc(row.supplyStart)} ~ ${esc(row.supplyEnd)}</td><td>${esc(row.segmentName)}</td><td class="align-left">${esc(row.categories.join('，'))}</td>
        <td>${esc(row.varietyCount)}</td><td>${esc(row.quoteSupplierCount)}</td><td>${esc(row.winnerSupplier)}</td><td>${statusTag(row.status)}</td><td>${actionButtons(row)}</td>
      </tr>`).join('') : '<tr><td class="empty-row" colspan="12">暂无符合条件的数据</td></tr>';
      state.pager?.update({ total: state.filtered.length });
    }

    state.pager = createPager('bidManagementPagination', bids.length, () => renderTable());
    renderTable();
    root.addEventListener('click', (event) => {
      const action = event.target.closest('[data-action]')?.dataset.action;
      const id = event.target.closest('[data-id]')?.dataset.id;
      if (!action) return;
      if (action === 'query') { state.pager.update({ page: 1 }); renderTable(); return; }
      if (action === 'reset') { all(root, '[data-filter]').forEach((field) => { field.value = ''; }); state.pager.update({ page: 1 }); renderTable(); return; }
      if (action === 'add-bid') { go('./bid-management-form.html?mode=add'); return; }
      if (action === 'append-bid') { go('./bid-management-form.html?mode=append'); return; }
      if (!id) return;
      if (action === 'edit-bid') { go(`./bid-management-form.html?mode=edit&id=${encodeURIComponent(id)}`); return; }
      if (action === 'delete-bid' && window.confirm('确定删除这条竞价吗？')) { service.remove('bids', id); state.rows = service.get('bids'); renderTable(); showToast('删除成功'); return; }
      if (action === 'stop-bid') { service.update('bids', id, { status: '已停止' }); state.rows = service.get('bids'); renderTable(); showToast('竞价已停止'); return; }
      if (action === 'open-bid') { service.update('bids', id, { status: '已开标' }); state.rows = service.get('bids'); renderTable(); showToast('开标成功'); return; }
      if (action === 'draw-rule') { showToast('规则抽签完成'); }
    });
  }

  function renderBidForm() {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode') || 'add';
    const id = params.get('id') || '';
    const bids = service.get('bids');
    const existing = bids.find((item) => item.id === id) || null;
    const suppliers = service.get('suppliers');
    const segments = service.get('segments');
    const schools = ['南皮县第一中学', '南皮县第二中学', '南皮县第三中学', '南皮县第四中学', '南皮县实验小学'];
    const title = mode === 'edit' ? '编辑竞价' : mode === 'append' ? '追加竞价' : '添加竞价';
    const supplierSelected = existing?.supplierIds || [];
    const form = `
      <div class="page-card bidding-form-page" id="bidFormPage">
        <div class="bidding-form-title-row"><button class="btn btn-sm bidding-back-button" type="button" data-action="back"><span class="bidding-back-icon" aria-hidden="true"></span><span>返回</span></button><h2>${title}</h2></div>
        <div class="bidding-form-grid">
          ${mode === 'append' ? `<div class="bidding-form-field required full-width"><label for="appendProject">选择项目编号</label><select id="appendProject" data-field="appendProject"><option value="">请选择项目编号</option>${bids.map((item) => `<option value="${item.id}">${esc(item.projectNo)} ${esc(item.name)}</option>`).join('')}</select></div>` : ''}
          <div class="bidding-form-field required"><label for="bidName">竞价名称</label><input id="bidName" data-field="name" placeholder="请输入竞价名称..." value="${inputValue(existing?.name)}"></div>
          <div class="bidding-form-field required"><label>供货周期</label><div class="bidding-range"><input type="date" data-field="supplyStart" value="${inputValue(toDateInput(existing?.supplyStart))}"><span>至</span><input type="date" data-field="supplyEnd" value="${inputValue(toDateInput(existing?.supplyEnd))}"></div></div>
          <div class="bidding-form-field required"><label for="demandDeadline">需求截止时间</label><input id="demandDeadline" data-field="demandDeadline" type="datetime-local" value="${inputValue(toDateTimeInput(existing?.demandDeadline))}"></div>
          <div class="bidding-form-field required"><label for="quoteStart">开始报价时间</label><input id="quoteStart" data-field="quoteStart" type="datetime-local" value="${inputValue(toDateTimeInput(existing?.quoteStart))}"></div>
          <div class="bidding-form-field required"><label for="quoteEnd">截止报价时间</label><input id="quoteEnd" data-field="quoteEnd" type="datetime-local" value="${inputValue(toDateTimeInput(existing?.quoteEnd))}"></div>
          <div class="bidding-form-field required"><label for="openTime">开标时间</label><input id="openTime" data-field="openTime" type="datetime-local" value="${inputValue(toDateTimeInput(existing?.openTime))}"></div>
          <div class="bidding-form-field required"><label for="bidSuppliers">参与竞价供应商</label><div class="bidding-control-stack"><div id="bidSuppliers" class="bidding-multi-select ${mode === 'append' ? 'is-disabled' : ''}" data-field="supplierIds" data-multi-select="supplierIds"><button class="bidding-select-trigger" type="button" data-action="toggle-multi-select" aria-expanded="false" ${mode === 'append' ? 'disabled' : ''}><span class="bidding-select-text ${supplierSelected.length ? '' : 'is-placeholder'}" data-multi-value>${esc(suppliers.filter((item) => supplierSelected.includes(item.id)).map((item) => item.name).join('、') || '请选择')}</span><svg class="bidding-select-arrow" viewBox="0 0 12 12" aria-hidden="true"><polyline points="2,4 6,8 10,4"></polyline></svg></button><div class="bidding-select-dropdown">${suppliers.map((item) => `<label class="bidding-select-option ${supplierSelected.includes(item.id) ? 'selected' : ''}"><input type="checkbox" value="${esc(item.id)}" data-multi-option data-label="${esc(item.name)}" ${supplierSelected.includes(item.id) ? 'checked' : ''} ${mode === 'append' ? 'disabled' : ''}><span>${esc(item.name)}</span></label>`).join('')}</div></div><div class="field-hint">可多选供应商</div></div></div>
          <div class="bidding-form-field required"><label for="bidSchool">学校</label><select id="bidSchool" data-field="school"><option value="">请选择学校</option>${schools.map((school) => `<option value="${esc(school)}" ${school === existing?.school ? 'selected' : ''}>${esc(school)}</option>`).join('')}</select></div>
          <div class="bidding-form-field required"><label for="bidSegmentSelect">选择标段</label><select id="bidSegmentSelect" data-field="segmentId"><option value="">请选择标段</option>${segments.map((item) => `<option value="${item.id}" ${item.id === existing?.segmentId ? 'selected' : ''}>${esc(item.name)}</option>`).join('')}</select></div>
          <div class="bidding-form-field"><label>需求量加密</label><div class="bidding-check-row"><input id="bidEncryption" data-field="encryption" type="checkbox" ${existing?.encryption ? 'checked' : ''}><label for="bidEncryption">开启后供应商端不显示需求量</label></div></div>
          <div class="bidding-form-field"><label for="winnerLimit">供应商允许中标数量</label><div class="bidding-control-stack"><input id="winnerLimit" data-field="winnerLimit" type="number" min="0" placeholder="请输入" value="${inputValue(existing?.winnerLimit ?? 1)}"><div class="field-hint">输入0，表示不限制供应商中标数量</div></div></div>
          <div class="bidding-form-field required"><label for="openPlace">开标地点</label><input id="openPlace" data-field="openPlace" placeholder="请输入" value="${inputValue(existing?.openPlace)}"></div>
          <div class="bidding-form-field"><label for="itemQuantity">需求商品数量</label><input id="itemQuantity" data-field="itemQuantity" placeholder="请选择" value="${inputValue(existing?.itemQuantity)}"></div>
          ${mode === 'append' ? `<div class="bidding-form-field full-width"><label>项目基础信息</label><div class="bidding-form-grid" style="grid-template-columns:repeat(3,minmax(180px,1fr));flex:1"><input class="bidding-readonly" data-summary="name" readonly placeholder="竞价名称"><input class="bidding-readonly" data-summary="supplyPeriod" readonly placeholder="供货周期"><input class="bidding-readonly" data-summary="demandDeadline" readonly placeholder="需求截止时间"><input class="bidding-readonly" data-summary="quoteStart" readonly placeholder="开始报价时间"><input class="bidding-readonly" data-summary="quoteEnd" readonly placeholder="截止报价时间"><input class="bidding-readonly" data-summary="openTime" readonly placeholder="开标时间"></div></div>` : ''}
        </div>
        <div class="bidding-form-actions"><button class="btn btn-sm" type="button" data-action="save-draft">暂存</button><button class="btn btn-primary btn-sm" type="button" data-action="publish">发布</button></div>
      </div>`;
    const root = mount(title, form);
    updateBiddingMultiSelect(root, 'supplierIds');
    const selectedProject = root.querySelector('[data-field="appendProject"]');

    function fillAppend(projectId) {
      const source = bids.find((item) => item.id === projectId);
      const summary = root.querySelectorAll('[data-summary]');
      summary.forEach((node) => {
        const key = node.dataset.summary;
        node.value = !source ? '' : key === 'supplyPeriod' ? `${source.supplyStart} ~ ${source.supplyEnd}` : key === 'name' ? source.name : source[key] || '--';
      });
      if (!source) {
        setBiddingMultiDisabled(root, 'supplierIds', true);
        all(root, '[data-multi-select="supplierIds"] input[data-multi-option]').forEach((option) => { option.checked = false; });
        updateBiddingMultiSelect(root, 'supplierIds');
        return;
      }
      setBiddingMultiDisabled(root, 'supplierIds', false);
      const supplierSelect = root.querySelector('[data-multi-select="supplierIds"]');
      all(supplierSelect, 'input[data-multi-option]').forEach((option) => { option.checked = source.supplierIds.includes(option.value); });
      updateBiddingMultiSelect(root, 'supplierIds');
      const setField = (key, value) => { const node = root.querySelector(`[data-field="${key}"]`); if (node) node.value = value ?? ''; };
      setField('name', `${source.name}-追加`);
      setField('supplyStart', source.supplyStart);
      setField('supplyEnd', source.supplyEnd);
      setField('demandDeadline', toDateTimeInput(source.demandDeadline));
      setField('quoteStart', toDateTimeInput(source.quoteStart));
      setField('quoteEnd', toDateTimeInput(source.quoteEnd));
      setField('openTime', toDateTimeInput(source.openTime));
      setField('school', source.school);
      setField('segmentId', source.segmentId);
      setField('openPlace', source.openPlace);
      setField('winnerLimit', source.winnerLimit);
      setField('itemQuantity', source.itemQuantity);
      const encryption = root.querySelector('[data-field="encryption"]');
      if (encryption) { encryption.checked = Boolean(source.encryption); encryption.disabled = true; }
    }
    selectedProject?.addEventListener('change', (event) => fillAppend(event.target.value));
    if (mode === 'append' && existing) fillAppend(existing.id);

    function readPayload() {
      const get = (key) => root.querySelector(`[data-field="${key}"]`);
      const segment = segments.find((item) => item.id === get('segmentId')?.value);
      const supplierIds = selectedMultiValues(root, 'supplierIds');
      const supplierNames = suppliers.filter((item) => supplierIds.includes(item.id)).map((item) => item.name);
      return {
        name: get('name')?.value.trim(), supplyStart: get('supplyStart')?.value, supplyEnd: get('supplyEnd')?.value,
        demandDeadline: fromDateTimeInput(get('demandDeadline')?.value), quoteStart: fromDateTimeInput(get('quoteStart')?.value),
        quoteEnd: fromDateTimeInput(get('quoteEnd')?.value), openTime: fromDateTimeInput(get('openTime')?.value),
        supplierIds, supplierNames, school: get('school')?.value, segmentId: segment?.id || '', segmentName: segment?.name || '',
        categories: segment?.categories || [], varietyCount: 0, quoteSupplierCount: supplierIds.length, winnerSupplier: '--',
        encryption: Boolean(get('encryption')?.checked), winnerLimit: Number(get('winnerLimit')?.value || 0), openPlace: get('openPlace')?.value.trim(),
        itemQuantity: get('itemQuantity')?.value.trim(), ruleId: 'RULE-001'
      };
    }

    function validate(payload) {
      const required = [['竞价名称', payload.name], ['供货周期开始日期', payload.supplyStart], ['供货周期结束日期', payload.supplyEnd], ['需求截止时间', payload.demandDeadline], ['开始报价时间', payload.quoteStart], ['截止报价时间', payload.quoteEnd], ['开标时间', payload.openTime], ['参与竞价供应商', payload.supplierIds.length], ['学校', payload.school], ['选择标段', payload.segmentId], ['开标地点', payload.openPlace]];
      const missing = required.find(([, value]) => !value);
      if (missing) { showToast(`请完善${missing[0]}`, true); return false; }
      if (payload.supplyStart > payload.supplyEnd) { showToast('供货周期开始日期不能晚于结束日期', true); return false; }
      if (payload.demandDeadline > payload.quoteStart || payload.quoteStart > payload.quoteEnd || payload.quoteEnd > payload.openTime) { showToast('请按时间顺序填写需求截止、报价和开标时间', true); return false; }
      return true;
    }

    root.addEventListener('change', (event) => {
      if (event.target.matches('[data-multi-option]')) updateBiddingMultiSelect(root, 'supplierIds');
    });
    root.addEventListener('click', (event) => {
      const multiTrigger = event.target.closest('[data-action="toggle-multi-select"]');
      if (multiTrigger) {
        event.stopPropagation();
        toggleBiddingMultiSelect(root, multiTrigger.closest('.bidding-multi-select'));
        return;
      }
      const action = event.target.closest('[data-action]')?.dataset.action;
      if (!action) return;
      if (action === 'back') { go('./bid-management.html'); return; }
      if (!['save-draft', 'publish'].includes(action)) return;
      const payload = readPayload();
      if (!validate(payload)) return;
      const project = bids.find((item) => item.id === selectedProject?.value);
      if (mode === 'edit' && existing) {
        service.update('bids', existing.id, { ...payload, status: action === 'publish' ? '待开标' : '暂存' });
      } else {
        const nextNumber = String(bids.length + 28).padStart(8, '0');
        const newBid = {
          ...payload,
          projectNo: project?.projectNo || `XM${String(bids.length + 20).padStart(7, '0')}`,
          bidNo: `JJ${nextNumber}`,
          status: action === 'publish' ? '待开标' : '暂存'
        };
        if (mode === 'append' && project) {
          newBid.name = `${project.name}-追加`;
          newBid.projectNo = project.projectNo;
          newBid.supplyStart = project.supplyStart;
          newBid.supplyEnd = project.supplyEnd;
          newBid.demandDeadline = project.demandDeadline;
          newBid.quoteStart = project.quoteStart;
          newBid.quoteEnd = project.quoteEnd;
          newBid.openTime = project.openTime;
          newBid.openPlace = project.openPlace;
        }
        service.add('bids', newBid, 'BID');
      }
      showToast(action === 'publish' ? '发布成功' : '暂存成功');
      window.setTimeout(() => go('./bid-management.html'), 450);
    });
    document.addEventListener('click', (event) => {
      if (!event.target.closest('.bidding-multi-select')) {
        all(root, '.bidding-multi-select.is-open').forEach((box) => closeBiddingMultiSelect(box));
      }
    });
  }

  function renderRulesManagement() {
    const root = mount('竞价规则管理', `
      <div class="page-card bidding-page" id="rulesManagementPage">
        <section class="bidding-filter-panel"><div class="bidding-filter-grid"><div class="bidding-filter-item"><label for="ruleKeyword">竞价规则名称</label><input id="ruleKeyword" data-filter="keyword" placeholder="请输入"></div></div><div class="bidding-filter-actions"><button class="btn btn-primary btn-sm" type="button" data-action="query">查询</button><button class="btn btn-sm" type="button" data-action="reset">重置</button></div></section>
        <div class="bidding-toolbar"><div class="bidding-toolbar-left"><button class="btn btn-primary btn-sm" type="button" data-action="add-rule">添加竞价规则</button></div></div>
        <div class="bidding-table-container"><div class="bidding-table-wrapper"><table class="bidding-table" style="min-width:820px"><thead><tr><th>序号</th><th>竞价规则名称</th><th>竞价方式</th><th>中标规则</th><th>操作</th></tr></thead><tbody id="rulesBody"></tbody></table></div><div class="pagination bidding-pagination" id="rulesPagination"></div></div>
      </div>`);
    const state = { rows: service.get('rules'), filtered: [], pager: null };
    function render() {
      const keyword = valueOf(root, '[data-filter="keyword"]').toLowerCase();
      state.filtered = state.rows.filter((row) => !keyword || row.name.toLowerCase().includes(keyword));
      const page = state.pager?.getState() || { page: 1, pageSize: 20 };
      const start = (page.page - 1) * page.pageSize;
      const visible = state.filtered.slice(start, start + page.pageSize);
      root.querySelector('#rulesBody').innerHTML = visible.length ? visible.map((row, index) => `<tr><td>${start + index + 1}</td><td class="align-left">${esc(row.name)}</td><td>${esc(row.way)}</td><td>${esc(row.rows.map((item) => item.winRule).join('、'))}</td><td><div class="bidding-actions-cell"><button class="bidding-link" type="button" data-action="edit-rule" data-id="${row.id}">编辑</button><button class="bidding-link danger" type="button" data-action="delete-rule" data-id="${row.id}">删除</button></div></td></tr>`).join('') : '<tr><td class="empty-row" colspan="5">暂无符合条件的数据</td></tr>';
      state.pager?.update({ total: state.filtered.length });
    }
    state.pager = createPager('rulesPagination', state.rows.length, render);
    render();
    root.addEventListener('click', (event) => {
      const action = event.target.closest('[data-action]')?.dataset.action;
      const id = event.target.closest('[data-id]')?.dataset.id;
      if (action === 'query') { state.pager.update({ page: 1 }); render(); }
      if (action === 'reset') { root.querySelector('[data-filter="keyword"]').value = ''; state.pager.update({ page: 1 }); render(); }
      if (action === 'add-rule') go('./bid-rules-form.html?mode=add');
      if (action === 'edit-rule' && id) go(`./bid-rules-form.html?mode=edit&id=${encodeURIComponent(id)}`);
      if (action === 'delete-rule' && id && window.confirm('确定删除这条竞价规则吗？')) { service.remove('rules', id); state.rows = service.get('rules'); render(); showToast('删除成功'); }
    });
  }

  function renderRuleForm() {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode') || 'add';
    const id = params.get('id') || '';
    const existing = service.get('rules').find((row) => row.id === id);
    const title = mode === 'edit' ? '编辑竞价规则' : '添加竞价规则';
    const initialRows = existing?.rows || [{ winRule: '', voidRule: '供应商废标后向排名较小顺移下一位中标' }];
    const root = mount(title, `
      <div class="page-card bidding-form-page" id="ruleFormPage">
        <div class="bidding-form-title-row"><button class="btn btn-sm bidding-back-button" type="button" data-action="back"><span class="bidding-back-icon" aria-hidden="true"></span><span>返回</span></button><h2>${title}</h2></div>
        <div class="bidding-form-grid">
          <div class="bidding-form-field required"><label for="ruleName">竞价规则名称</label><input id="ruleName" data-field="name" placeholder="请输入竞价规则名称" value="${inputValue(existing?.name)}"></div>
          <div class="bidding-form-field required"><label for="ruleWay">竞价方式</label><select id="ruleWay" data-field="way">${selectOptions(['固定一种中标规则', '多种中标规则，开标前随机抽取'], existing?.way, '请选择竞价方式')}</select></div>
          <div class="bidding-form-field required"><label for="openWay">开标方式</label><select id="openWay" data-field="openWay">${selectOptions(['系统推荐1家供应商', '随机抽取1家供应商', '手动选择供应商'], existing?.openWay, '请选择开标方式')}</select></div>
          <div class="bidding-form-field full-width"><label>竞价规则</label><div class="bidding-control-stack"><div id="ruleRows"></div><button class="btn btn-sm" type="button" data-action="add-rule-row">添加规则</button><div class="bidding-note">多种中标规则将在开标前随机抽取其中一条执行。</div></div></div>
        </div>
        <div class="bidding-form-actions"><button class="btn btn-sm" type="button" data-action="cancel">取消</button><button class="btn btn-primary btn-sm" type="button" data-action="save-rule">保存</button></div>
      </div>`);
    let rows = initialRows.map((row) => ({ ...row }));
    const winRules = ['绝对最低价', '相对最低价', '最低价中标'];
    const voidRules = ['供应商废标后向排名较小顺移下一位中标', '废标后重新竞价', '废标后顺延下一名'];

    function renderRows() {
      root.querySelector('#ruleRows').innerHTML = rows.map((row, index) => `<div class="bidding-rule-row"><span class="rule-row-label">竞价规则${index + 1}</span><select data-rule-field="winRule" data-index="${index}">${selectOptions(winRules, row.winRule, '请选择中标规则')}</select><select data-rule-field="voidRule" data-index="${index}">${selectOptions(voidRules, row.voidRule, '请选择废标规则')}</select>${rows.length > 1 ? `<button class="bidding-link bidding-remove-row" type="button" data-action="remove-rule-row" data-index="${index}">移除</button>` : '<span></span>'}</div>`).join('');
    }
    renderRows();
    root.addEventListener('change', (event) => {
      if (event.target.matches('[data-field="way"]')) {
        if (event.target.value === '固定一种中标规则') rows = rows.slice(0, 1);
        if (event.target.value === '多种中标规则，开标前随机抽取' && rows.length < 2) rows.push({ winRule: '', voidRule: '' });
        renderRows();
      }
      const field = event.target.dataset.ruleField;
      if (field) rows[Number(event.target.dataset.index)][field] = event.target.value;
    });
    root.addEventListener('click', (event) => {
      const action = event.target.closest('[data-action]')?.dataset.action;
      if (action === 'back' || action === 'cancel') { go('./bid-rules-management.html'); return; }
      if (action === 'add-rule-row') { rows.push({ winRule: '', voidRule: '' }); renderRows(); return; }
      if (action === 'remove-rule-row') { rows.splice(Number(event.target.closest('[data-index]')?.dataset.index), 1); renderRows(); return; }
      if (action !== 'save-rule') return;
      const name = valueOf(root, '[data-field="name"]');
      const way = valueOf(root, '[data-field="way"]');
      const openWay = valueOf(root, '[data-field="openWay"]');
      if (!name || !way || !openWay || rows.some((row) => !row.winRule || !row.voidRule)) { showToast('请完善竞价规则必填项', true); return; }
      const payload = { name, way, openWay, rows };
      if (existing) service.update('rules', existing.id, payload); else service.add('rules', payload, 'RULE');
      showToast('保存成功');
      window.setTimeout(() => go('./bid-rules-management.html'), 450);
    });
  }

  function renderLimitManagement() {
    const root = mount('竞价限价管理', `
      <div class="page-card bidding-page" id="limitManagementPage">
        <section class="bidding-filter-panel"><div class="bidding-filter-grid">
          <div class="bidding-filter-item"><label for="limitCategory">商品分类</label><select id="limitCategory" data-filter="category"><option value="">全部</option>${service.categories.map((item) => `<option value="${esc(item)}">${esc(item)}</option>`).join('')}</select></div>
          <div class="bidding-filter-item"><label for="limitDate">日期</label><input id="limitDate" data-filter="date" type="date" value="${dateNow()}"></div>
          <div class="bidding-filter-item"><label for="limitKeyword">商品名称</label><input id="limitKeyword" data-filter="keyword" placeholder="请输入名称/编号"></div>
        </div><div class="bidding-filter-actions"><button class="btn btn-primary btn-sm" type="button" data-action="query">查询</button><button class="btn btn-sm" type="button" data-action="reset">重置</button></div></section>
        <div class="bidding-toolbar"><div class="bidding-toolbar-left"><button class="btn btn-primary btn-sm" type="button" data-action="add-limit">添加限价</button></div></div>
        <div class="bidding-table-container"><div class="bidding-table-wrapper"><table class="bidding-table" style="min-width:1650px"><thead><tr><th>序号</th><th>图片</th><th>商品编号</th><th>商品名称</th><th>商品分类</th><th>最低价（元）</th><th>最高价（元）</th><th>计量单位</th><th>品牌</th><th>规格</th><th>指标说明</th><th>执行周期</th><th>更新时间</th><th>操作</th></tr></thead><tbody id="limitsBody"></tbody></table></div><div class="pagination bidding-pagination" id="limitsPagination"></div></div>
      </div>`);
    const state = { rows: service.get('limits'), filtered: [], pager: null };
    function render() {
      const keyword = valueOf(root, '[data-filter="keyword"]').toLowerCase();
      const category = valueOf(root, '[data-filter="category"]');
      const date = valueOf(root, '[data-filter="date"]');
      state.filtered = state.rows.filter((row) => (!keyword || `${row.productCode} ${row.productName}`.toLowerCase().includes(keyword)) && (!category || row.category === category) && (!date || !row.executionStart || row.executionStart <= date));
      const page = state.pager?.getState() || { page: 1, pageSize: 20 };
      const start = (page.page - 1) * page.pageSize;
      const visible = state.filtered.slice(start, start + page.pageSize);
      root.querySelector('#limitsBody').innerHTML = visible.length ? visible.map((row, index) => `<tr><td>${start + index + 1}</td><td><span class="product-image-placeholder">图片</span></td><td>${esc(row.productCode)}</td><td class="align-left">${esc(row.productName)}</td><td class="align-left">${esc(row.category)}</td><td>${formatLimitPrice(row.minPrice)}</td><td>${formatLimitPrice(row.maxPrice)}</td><td>${esc(row.unit)}</td><td>${esc(row.brand)}</td><td>${esc(row.spec)}</td><td class="align-left">${esc(row.indicator || '--')}</td><td>${esc(row.executionStart)} ~ ${esc(row.executionEnd)}</td><td>${esc(row.updatedAt)}</td><td><div class="bidding-actions-cell"><button class="bidding-link" type="button" data-action="clear-limit" data-id="${row.id}">清除</button><button class="bidding-link" type="button" data-action="view-limit" data-id="${row.id}">查看</button></div></td></tr>`).join('') : '<tr><td class="empty-row" colspan="14">暂无符合条件的数据</td></tr>';
      state.pager?.update({ total: state.filtered.length });
    }
    state.pager = createPager('limitsPagination', state.rows.length, render);
    render();
    root.addEventListener('click', (event) => {
      const action = event.target.closest('[data-action]')?.dataset.action;
      const id = event.target.closest('[data-id]')?.dataset.id;
      if (action === 'query') { state.pager.update({ page: 1 }); render(); }
      if (action === 'reset') { root.querySelector('[data-filter="category"]').value = ''; root.querySelector('[data-filter="keyword"]').value = ''; root.querySelector('[data-filter="date"]').value = dateNow(); state.pager.update({ page: 1 }); render(); }
      if (action === 'add-limit') go('./auction-limit-price-form.html');
      if (action === 'clear-limit' && id && window.confirm('确定清除这条限价吗？')) { service.remove('limits', id); state.rows = service.get('limits'); render(); showToast('清除成功'); }
      if (action === 'view-limit' && id) { const row = state.rows.find((item) => item.id === id); if (row) showToast(`${row.productName}：${formatLimitPrice(row.minPrice)} ~ ${formatLimitPrice(row.maxPrice)} 元`); }
    });
  }

  function renderLimitForm() {
    const products = service.get('products');
    const root = mount('添加限价', `
      <div class="page-card bidding-form-page" id="limitFormPage">
        <div class="bidding-form-title-row"><button class="btn btn-sm bidding-back-button" type="button" data-action="back"><span class="bidding-back-icon" aria-hidden="true"></span><span>返回</span></button><h2>添加限价</h2></div>
        <div class="bidding-form-grid bidding-limit-form-grid"><div class="bidding-form-field required"><label>价格执行周期</label><div class="bidding-range"><input type="date" data-field="executionStart" value="${dateNow()}"><span>至</span><input type="date" data-field="executionEnd" value="${dateNow()}"></div></div></div>
        <div class="bidding-toolbar" style="margin-top:18px"><div class="bidding-toolbar-left"><button class="btn btn-sm" type="button" data-action="batch-add">批量添加商品</button><button class="btn btn-sm" type="button" data-action="open-import">导入限价</button></div><span class="toolbar-note">设置执行周期后，商品限价将在竞价报价中生效</span></div>
        <div class="bidding-table-container" style="min-height:340px"><div class="bidding-table-wrapper"><table class="bidding-table bidding-product-table"><thead><tr><th>序号</th><th>图片</th><th>商品编号</th><th>分类</th><th>商品名称</th><th>最低价（元）</th><th>最高价（元）</th><th>计量单位</th><th>品牌</th><th>规格</th><th>指标说明</th><th>操作</th></tr></thead><tbody id="limitDraftBody"></tbody></table></div></div>
        <div class="bidding-form-actions"><button class="btn btn-sm" type="button" data-action="cancel">取消</button><button class="btn btn-primary btn-sm" type="button" data-action="save-limit">限价生效</button></div>
      </div>
      <div class="bidding-modal-mask" id="batchModal"><div class="bidding-dialog wide"><div class="bidding-dialog-header"><h2>批量添加商品</h2><button class="bidding-dialog-close" type="button" data-action="close-modal" data-modal="batchModal">关闭</button></div><div class="bidding-dialog-body"><div class="bidding-dialog-filter"><label>商品名称</label><input data-batch-filter="keyword" placeholder="请输入商品名称/编号"><label>分类</label><select data-batch-filter="category"><option value="">请选择</option>${service.categories.map((item) => `<option value="${esc(item)}">${esc(item)}</option>`).join('')}</select><button class="btn btn-primary btn-sm" type="button" data-action="batch-query">查询</button><button class="btn btn-sm" type="button" data-action="batch-reset">重置</button></div><table class="bidding-table"><thead><tr><th><input type="checkbox" data-action="batch-check-all"></th><th>图片</th><th>商品编码</th><th>商品名称</th><th>分类</th><th>计量单位</th><th>保质期单位</th><th>保质期</th></tr></thead><tbody id="batchProductBody"></tbody></table><div class="bidding-note" style="padding-top:10px">共17712条数据　20 条/页　1 2 3 ... 886</div></div><div class="bidding-dialog-footer"><button class="btn btn-sm" type="button" data-action="close-modal" data-modal="batchModal">关闭</button><button class="btn btn-primary btn-sm" type="button" data-action="confirm-batch">添加</button></div></div></div>
      <div class="bidding-modal-mask" id="importModal"><div class="bidding-dialog"><div class="bidding-dialog-header"><h2>导入限价</h2><button class="bidding-dialog-close" type="button" data-action="close-modal" data-modal="importModal">关闭</button></div><div class="bidding-dialog-body"><div class="bidding-file-row"><button class="btn btn-sm" type="button" data-action="download-template">下载模板</button><span class="bidding-file-name">价格模板.xlsx</span></div><div class="bidding-file-row" style="margin-top:22px"><button class="btn btn-sm" type="button" data-action="choose-file">上传文件</button><span class="bidding-file-name" id="importFileName">未选择文件</span><input type="file" id="limitFileInput" accept=".xlsx" hidden></div><div class="bidding-note" style="margin-top:10px">只能上传xlsx文件，且不超过10M</div></div><div class="bidding-dialog-footer"><button class="btn btn-sm" type="button" data-action="close-modal" data-modal="importModal">取消</button><button class="btn btn-primary btn-sm" type="button" data-action="confirm-import">导入</button></div></div></div>`);
    let drafts = Array.from({ length: 5 }, () => ({ productId: '', productCode: '', productName: '', category: '', minPrice: '', maxPrice: '', unit: '', brand: '', spec: '', indicator: '' }));
    let batchRows = products.slice();

    function renderDrafts() {
      root.querySelector('#limitDraftBody').innerHTML = drafts.map((row, index) => `<tr><td>${index + 1}</td><td><span class="product-image-placeholder">图片</span></td><td>${esc(row.productCode || '--')}</td><td>${esc(row.category || '--')}</td><td><select data-draft-field="productId" data-index="${index}"><option value="">请选择商品</option>${products.map((item) => `<option value="${item.id}" ${item.id === row.productId ? 'selected' : ''}>${esc(item.name)}</option>`).join('')}</select></td><td><input data-draft-field="minPrice" data-index="${index}" value="${inputValue(row.minPrice)}" placeholder="请输入"></td><td><input data-draft-field="maxPrice" data-index="${index}" value="${inputValue(row.maxPrice)}" placeholder="请输入"></td><td>${esc(row.unit || '--')}</td><td>${esc(row.brand || '--')}</td><td>${esc(row.spec || '--')}</td><td><input data-draft-field="indicator" data-index="${index}" value="${inputValue(row.indicator)}" placeholder="请输入"></td><td><div class="row-actions"><button class="bidding-link" type="button" data-action="remove-draft" data-index="${index}">删除</button></div></td></tr>`).join('');
    }
    function renderBatchRows() {
      const keyword = valueOf(root, '[data-batch-filter="keyword"]').toLowerCase();
      const category = valueOf(root, '[data-batch-filter="category"]');
      const rows = batchRows.filter((item) => (!keyword || `${item.code} ${item.name}`.toLowerCase().includes(keyword)) && (!category || item.category === category));
      root.querySelector('#batchProductBody').innerHTML = rows.map((item) => `<tr><td><input type="checkbox" data-batch-product="${item.id}"></td><td><span class="product-image-placeholder">图片</span></td><td>${esc(item.code)}</td><td>${esc(item.name)}</td><td>${esc(item.category)}</td><td>${esc(item.unit)}</td><td>${esc(item.shelfLifeUnit)}</td><td>${esc(item.shelfLife)}</td></tr>`).join('');
    }
    renderDrafts();
    root.addEventListener('change', (event) => {
      if (event.target.id === 'limitFileInput') {
        document.getElementById('importFileName').textContent = event.target.files?.[0]?.name || '未选择文件';
        return;
      }
      const field = event.target.dataset.draftField;
      if (!field) return;
      const index = Number(event.target.dataset.index);
      drafts[index][field] = event.target.value;
      if (field === 'productId') {
        const product = products.find((item) => item.id === event.target.value);
        drafts[index] = { ...drafts[index], productId: product?.id || '', productCode: product?.code || '', productName: product?.name || '', category: product?.category || '', unit: product?.unit || '', brand: product?.brand || '', spec: product?.spec || '' };
        renderDrafts();
      }
    });
    root.addEventListener('click', (event) => {
      const action = event.target.closest('[data-action]')?.dataset.action;
      if (action === 'back' || action === 'cancel') { go('./auction-limit-price.html'); return; }
      if (action === 'batch-add') { root.querySelector('#batchModal').classList.add('open'); renderBatchRows(); return; }
      if (action === 'open-import') { root.querySelector('#importModal').classList.add('open'); return; }
      if (action === 'close-modal') { root.querySelector(`#${event.target.closest('[data-modal]').dataset.modal}`).classList.remove('open'); return; }
      if (action === 'remove-draft') { drafts.splice(Number(event.target.closest('[data-index]').dataset.index), 1); if (!drafts.length) drafts.push({ productId: '', productCode: '', productName: '', category: '', minPrice: '', maxPrice: '', unit: '', brand: '', spec: '', indicator: '' }); renderDrafts(); return; }
      if (action === 'batch-query' || action === 'batch-reset') { if (action === 'batch-reset') { root.querySelector('[data-batch-filter="keyword"]').value = ''; root.querySelector('[data-batch-filter="category"]').value = ''; } renderBatchRows(); return; }
      if (action === 'batch-check-all') { all(root, '[data-batch-product]').forEach((input) => { input.checked = event.target.checked; }); return; }
      if (action === 'confirm-batch') {
        const selected = all(root, '[data-batch-product]:checked').map((input) => products.find((item) => item.id === input.dataset.batchProduct)).filter(Boolean);
        if (!selected.length) { showToast('请选择要添加的商品', true); return; }
        drafts = drafts.filter((row) => row.productId || row.productCode);
        selected.forEach((product) => { if (!drafts.some((row) => row.productId === product.id)) drafts.push({ productId: product.id, productCode: product.code, productName: product.name, category: product.category, minPrice: '', maxPrice: '', unit: product.unit, brand: product.brand, spec: product.spec, indicator: '' }); });
        renderDrafts(); root.querySelector('#batchModal').classList.remove('open'); showToast(`已添加${selected.length}个商品`); return;
      }
      if (action === 'choose-file') { root.querySelector('#limitFileInput').click(); return; }
      if (action === 'download-template') { showToast('价格模板.xlsx已准备下载'); return; }
      if (action === 'confirm-import') {
        const file = root.querySelector('#limitFileInput').files?.[0];
        if (!file) { showToast('请选择xlsx文件', true); return; }
        if (!/\.xlsx$/i.test(file.name) || file.size > 10 * 1024 * 1024) { showToast('只能上传不超过10M的xlsx文件', true); return; }
        root.querySelector('#importModal').classList.remove('open'); showToast('导入成功'); return;
      }
      if (action !== 'save-limit') return;
      const start = valueOf(root, '[data-field="executionStart"]');
      const end = valueOf(root, '[data-field="executionEnd"]');
      const valid = drafts.filter((row) => row.productId || row.productCode);
      if (!start || !end || start > end) { showToast('请正确填写价格执行周期', true); return; }
      if (!valid.length || valid.some((row) => !row.productId || row.minPrice === '' || row.maxPrice === '')) { showToast('请完善商品及最低价、最高价', true); return; }
      valid.forEach((row) => service.add('limits', { ...row, executionStart: start, executionEnd: end, updatedAt: `${dateNow()} 09:30:00` }, 'LIMIT'));
      showToast('限价已生效'); window.setTimeout(() => go('./auction-limit-price.html'), 450);
    });
  }

  function renderWastedManagement() {
    const root = mount('废标管理', `
      <div class="page-card bidding-page" id="wastedManagementPage">
        <section class="bidding-filter-panel"><div class="bidding-filter-grid">
          <div class="bidding-filter-item"><label>竞价编号/名称</label><input data-filter="keyword" placeholder="请输入"></div>
          <div class="bidding-filter-item"><label>供货周期</label><div class="bidding-range"><input type="date" data-filter="start" value="2026-07-16"><span>至</span><input type="date" data-filter="end" value="2026-08-16"></div></div>
          <div class="bidding-filter-item"><label>标段</label><select data-filter="segment"><option value="">请选择</option>${service.get('segments').map((item) => `<option value="${esc(item.name)}">${esc(item.name)}</option>`).join('')}</select></div>
        </div><div class="bidding-filter-actions"><button class="btn btn-primary btn-sm" type="button" data-action="query">查询</button><button class="btn btn-sm" type="button" data-action="reset">重置</button></div></section>
        <div class="bidding-table-container"><div class="bidding-table-wrapper"><table class="bidding-table" style="min-width:1320px"><thead><tr><th>序号</th><th>项目编号</th><th>竞价编号</th><th>竞价名称</th><th>供货周期</th><th>标段</th><th>商品类别</th><th>品种数</th><th>报价供应商数量</th><th>废标供应商</th><th>废标原因</th></tr></thead><tbody id="wastedBody"></tbody></table></div><div class="pagination bidding-pagination" id="wastedPagination"></div></div>
      </div>`);
    const state = { rows: service.get('wastedBids'), filtered: [], pager: null };
    function render() {
      const keyword = valueOf(root, '[data-filter="keyword"]').toLowerCase();
      const segment = valueOf(root, '[data-filter="segment"]');
      state.filtered = state.rows.filter((row) => (!keyword || `${row.projectNo} ${row.bidNo} ${row.name}`.toLowerCase().includes(keyword)) && (!segment || row.segment === segment));
      const page = state.pager?.getState() || { page: 1, pageSize: 20 };
      const start = (page.page - 1) * page.pageSize;
      root.querySelector('#wastedBody').innerHTML = state.filtered.slice(start, start + page.pageSize).map((row, index) => `<tr><td>${start + index + 1}</td><td>${esc(row.projectNo)}</td><td>${esc(row.bidNo)}</td><td class="align-left">${esc(row.name)}</td><td>${esc(row.supplyPeriod)}</td><td>${esc(row.segment)}</td><td class="align-left">${esc(row.categories)}</td><td>${esc(row.varieties)}</td><td>${esc(row.suppliers)}</td><td>${esc(row.wastedSupplier)}</td><td>${esc(row.reason)}</td></tr>`).join('') || '<tr><td class="empty-row" colspan="11">暂无符合条件的数据</td></tr>';
      state.pager?.update({ total: state.filtered.length });
    }
    state.pager = createPager('wastedPagination', state.rows.length, render); render();
    root.addEventListener('click', (event) => {
      const action = event.target.closest('[data-action]')?.dataset.action;
      if (action === 'query') { state.pager.update({ page: 1 }); render(); }
      if (action === 'reset') { all(root, '[data-filter]').forEach((field) => { field.value = field.dataset.filter === 'start' ? '2026-07-16' : field.dataset.filter === 'end' ? '2026-08-16' : ''; }); state.pager.update({ page: 1 }); render(); }
    });
  }

  function renderSegmentManagement() {
    const root = mount('标段管理', `
      <div class="page-card bidding-page" id="segmentManagementPage">
        <section class="bidding-filter-panel"><div class="bidding-filter-grid"><div class="bidding-filter-item"><label>标段名称</label><input data-filter="keyword" placeholder="请输入"></div></div><div class="bidding-filter-actions"><button class="btn btn-primary btn-sm" type="button" data-action="query">查询</button><button class="btn btn-sm" type="button" data-action="reset">重置</button></div></section>
        <div class="bidding-toolbar"><div class="bidding-toolbar-left"><button class="btn btn-primary btn-sm" type="button" data-action="add-segment">添加标段</button></div></div>
        <div class="bidding-table-container"><div class="bidding-table-wrapper"><table class="bidding-table" style="min-width:760px"><thead><tr><th>序号</th><th>标段名称</th><th>商品分类</th><th>状态</th><th>操作</th></tr></thead><tbody id="segmentsBody"></tbody></table></div><div class="pagination bidding-pagination" id="segmentsPagination"></div></div>
      </div>
      <div class="bidding-modal-mask" id="segmentModal"><div class="bidding-dialog"><div class="bidding-dialog-header"><h2 id="segmentModalTitle">添加标段</h2><button class="bidding-dialog-close" type="button" data-action="close-segment">关闭</button></div><div class="bidding-dialog-body"><div class="bidding-form-grid" style="grid-template-columns:1fr"><div class="bidding-form-field required"><label>标段名称</label><input data-segment-field="name" placeholder="请输入标段名称"></div><div class="bidding-form-field required"><label>商品分类</label><div class="bidding-category-options" id="segmentCategories">${categoriesOptions()}</div></div></div></div><div class="bidding-dialog-footer"><button class="btn btn-sm" type="button" data-action="close-segment">取消</button><button class="btn btn-primary btn-sm" type="button" data-action="save-segment">确认</button></div></div></div>`);
    const state = { rows: service.get('segments'), filtered: [], pager: null, editingId: '' };
    function render() {
      const keyword = valueOf(root, '[data-filter="keyword"]').toLowerCase();
      state.filtered = state.rows.filter((row) => !keyword || row.name.toLowerCase().includes(keyword));
      const page = state.pager?.getState() || { page: 1, pageSize: 20 };
      const start = (page.page - 1) * page.pageSize;
      root.querySelector('#segmentsBody').innerHTML = state.filtered.slice(start, start + page.pageSize).map((row, index) => `<tr><td>${start + index + 1}</td><td>${esc(row.name)}</td><td class="align-left">${esc(row.categories.join('，'))}</td><td>${statusTag(row.status)}</td><td><div class="bidding-actions-cell"><button class="bidding-link" type="button" data-action="toggle-segment" data-id="${row.id}">${row.status === '启用' ? '禁用' : '启用'}</button><button class="bidding-link" type="button" data-action="edit-segment" data-id="${row.id}">编辑</button><button class="bidding-link danger" type="button" data-action="delete-segment" data-id="${row.id}">删除</button></div></td></tr>`).join('') || '<tr><td class="empty-row" colspan="5">暂无符合条件的数据</td></tr>';
      state.pager?.update({ total: state.filtered.length });
    }
    function openModal(row) {
      state.editingId = row?.id || '';
      root.querySelector('#segmentModalTitle').textContent = row ? '编辑标段' : '添加标段';
      root.querySelector('[data-segment-field="name"]').value = row?.name || '';
      all(root, '#segmentCategories input').forEach((input) => { input.checked = Boolean(row?.categories?.includes(input.value)); });
      root.querySelector('#segmentModal').classList.add('open');
    }
    state.pager = createPager('segmentsPagination', state.rows.length, render); render();
    root.addEventListener('click', (event) => {
      const action = event.target.closest('[data-action]')?.dataset.action;
      const id = event.target.closest('[data-id]')?.dataset.id;
      if (action === 'query') { state.pager.update({ page: 1 }); render(); }
      if (action === 'reset') { root.querySelector('[data-filter="keyword"]').value = ''; state.pager.update({ page: 1 }); render(); }
      if (action === 'add-segment') openModal();
      if (action === 'edit-segment' && id) openModal(state.rows.find((row) => row.id === id));
      if (action === 'toggle-segment' && id) { const row = state.rows.find((item) => item.id === id); service.toggle('segments', id, row.status !== '启用'); state.rows = service.get('segments'); render(); showToast('状态已更新'); }
      if (action === 'delete-segment' && id && window.confirm('确定删除这条标段吗？')) { service.remove('segments', id); state.rows = service.get('segments'); render(); showToast('删除成功'); }
      if (action === 'close-segment') root.querySelector('#segmentModal').classList.remove('open');
      if (action === 'save-segment') {
        const name = valueOf(root, '[data-segment-field="name"]');
        const selected = all(root, '#segmentCategories input:checked').map((input) => input.value);
        if (!name || !selected.length) { showToast('请完善标段名称和商品分类', true); return; }
        if (state.editingId) service.update('segments', state.editingId, { name, categories: selected }); else service.add('segments', { name, categories: selected, status: '启用' }, 'SEG');
        state.rows = service.get('segments'); state.pager.update({ page: 1 }); render(); root.querySelector('#segmentModal').classList.remove('open'); showToast('保存成功');
      }
    });
  }

  function renderRelationshipManagement() {
    const root = mount('供货关系管理', `
      <div class="page-card bidding-page" id="relationshipManagementPage">
        <section class="bidding-filter-panel"><div class="bidding-filter-grid">
          <div class="bidding-filter-item"><label>供货周期</label><select data-filter="period"><option value="">全部</option></select></div>
          <div class="bidding-filter-item"><label>中标供应商</label><select data-filter="supplier"><option value="">全部</option></select></div>
          <div class="bidding-filter-item"><label>供货标段</label><select data-filter="segment"><option value="">全部</option></select></div>
        </div><div class="bidding-filter-actions"><button class="btn btn-primary btn-sm" type="button" data-action="query">查询</button><button class="btn btn-sm" type="button" data-action="reset">重置</button></div></section>
        <div class="bidding-toolbar"><div class="bidding-toolbar-left"><button class="btn btn-primary btn-sm" type="button" data-action="change-relationship">变更供货关系</button><span class="toolbar-note">批量变更供货关系时，需选择同一供货周期、同一项目、同一供应商进行变更，不可跨周期跨项目跨供应商变更</span></div></div>
        <div class="bidding-table-container"><div class="bidding-table-wrapper"><table class="bidding-table" style="min-width:1420px"><thead><tr><th><input type="checkbox" data-action="check-all"></th><th>序号</th><th>中标供应商</th><th>项目编号</th><th>竞价编号</th><th>竞价名称</th><th>标段</th><th>供货周期</th><th>开始供货时间</th><th>变更记录</th></tr></thead><tbody id="relationshipsBody"></tbody></table></div><div class="pagination bidding-pagination" id="relationshipsPagination"></div></div>
      </div>
      <div class="bidding-modal-mask" id="relationshipModal"><div class="bidding-dialog"><div class="bidding-dialog-header"><h2>变更供货关系</h2><button class="bidding-dialog-close" type="button" data-action="close-relationship">关闭</button></div><div class="bidding-dialog-body"><div class="bidding-form-grid" style="grid-template-columns:1fr"><div class="bidding-form-field"><label>原中标供应商</label><input class="bidding-readonly" data-rel-field="oldSupplier" readonly></div><div class="bidding-form-field required"><label>变更后供应商</label><select data-rel-field="supplier"><option value="">请选择</option></select></div><div class="bidding-form-field required"><label>价格执行</label><select data-rel-field="price"><option value="">请选择</option><option value="中标价">中标价</option><option value="指导价">指导价</option><option value="手动定价">手动定价</option></select></div><div class="bidding-form-field required"><label>开始供货日期</label><input type="date" data-rel-field="startDate"></div></div></div><div class="bidding-dialog-footer"><button class="btn btn-sm" type="button" data-action="close-relationship">取消</button><button class="btn btn-primary btn-sm" type="button" data-action="save-relationship">确认</button></div></div></div>`);
    const state = { rows: service.get('relationships'), filtered: [], selected: new Set(), pager: null };
    function setFilterOptions() {
      const periods = [...new Set(state.rows.map((row) => `${row.supplyStart} ~ ${row.supplyEnd}`))];
      const suppliers = [...new Set(state.rows.map((row) => row.supplierName))];
      const segments = [...new Set(state.rows.map((row) => row.segment))];
      root.querySelector('[data-filter="period"]').innerHTML = `<option value="">全部</option>${periods.map((item) => `<option value="${esc(item)}">${esc(item)}</option>`).join('')}`;
      root.querySelector('[data-filter="supplier"]').innerHTML = `<option value="">全部</option>${suppliers.map((item) => `<option value="${esc(item)}">${esc(item)}</option>`).join('')}`;
      root.querySelector('[data-filter="segment"]').innerHTML = `<option value="">全部</option>${segments.map((item) => `<option value="${esc(item)}">${esc(item)}</option>`).join('')}`;
    }
    function render() {
      const period = valueOf(root, '[data-filter="period"]');
      const supplier = valueOf(root, '[data-filter="supplier"]');
      const segment = valueOf(root, '[data-filter="segment"]');
      state.filtered = state.rows.filter((row) => (!period || `${row.supplyStart} ~ ${row.supplyEnd}` === period) && (!supplier || row.supplierName === supplier) && (!segment || row.segment === segment));
      const page = state.pager?.getState() || { page: 1, pageSize: 20 };
      const start = (page.page - 1) * page.pageSize;
      root.querySelector('#relationshipsBody').innerHTML = state.filtered.slice(start, start + page.pageSize).map((row, index) => `<tr><td><input type="checkbox" data-rel-check="${row.id}" ${state.selected.has(row.id) ? 'checked' : ''}></td><td>${start + index + 1}</td><td>${esc(row.supplierName)}</td><td>${esc(row.projectNo)}</td><td>${esc(row.bidNo)}</td><td class="align-left">${esc(row.bidName)}</td><td>${esc(row.segment)}</td><td>${esc(row.supplyStart)} ~ ${esc(row.supplyEnd)}</td><td>${esc(row.startSupplyAt)}</td><td>${esc(row.changeLog)}</td></tr>`).join('') || '<tr><td class="empty-row" colspan="10">暂无符合条件的数据</td></tr>';
      state.pager?.update({ total: state.filtered.length });
    }
    function openChangeModal() {
      const selectedRows = state.rows.filter((row) => state.selected.has(row.id));
      if (!selectedRows.length) { showToast('请选择要变更供货关系的供应商', true); return; }
      const first = selectedRows[0];
      const sameGroup = selectedRows.every((row) => row.supplierId === first.supplierId && row.projectNo === first.projectNo && row.supplyStart === first.supplyStart && row.supplyEnd === first.supplyEnd);
      if (!sameGroup) { showToast('批量变更时需选择同一供货周期、同一项目、同一供应商', true); return; }
      const supplierSelect = root.querySelector('[data-rel-field="supplier"]');
      const suppliers = service.get('suppliers');
      supplierSelect.innerHTML = `<option value="">请选择</option>${suppliers.filter((item) => item.id !== first.supplierId).map((item) => `<option value="${item.id}">${esc(item.name)}</option>`).join('')}`;
      root.querySelector('[data-rel-field="oldSupplier"]').value = first.supplierName;
      root.querySelector('[data-rel-field="price"]').value = first.executionPrice || '中标价';
      root.querySelector('[data-rel-field="startDate"]').value = first.startSupplyAt;
      root.querySelector('#relationshipModal').classList.add('open');
    }
    setFilterOptions(); state.pager = createPager('relationshipsPagination', state.rows.length, render); render();
    root.addEventListener('change', (event) => {
      if (event.target.matches('[data-rel-check]')) { if (event.target.checked) state.selected.add(event.target.dataset.relCheck); else state.selected.delete(event.target.dataset.relCheck); }
      if (event.target.matches('[data-action="check-all"]')) { state.filtered.forEach((row) => event.target.checked ? state.selected.add(row.id) : state.selected.delete(row.id)); render(); }
    });
    root.addEventListener('click', (event) => {
      const action = event.target.closest('[data-action]')?.dataset.action;
      if (action === 'query') { state.pager.update({ page: 1 }); render(); }
      if (action === 'reset') { all(root, '[data-filter]').forEach((field) => { field.value = ''; }); state.selected.clear(); state.pager.update({ page: 1 }); render(); }
      if (action === 'change-relationship') openChangeModal();
      if (action === 'close-relationship') root.querySelector('#relationshipModal').classList.remove('open');
      if (action === 'save-relationship') {
        const supplierId = valueOf(root, '[data-rel-field="supplier"]');
        const price = valueOf(root, '[data-rel-field="price"]');
        const startDate = valueOf(root, '[data-rel-field="startDate"]');
        if (!supplierId || !price || !startDate) { showToast('请完善变更后的供应商、价格执行和开始供货日期', true); return; }
        const supplier = service.get('suppliers').find((item) => item.id === supplierId);
        const stamp = `${dateTimeNow()} 变更为${supplier.name}`;
        state.rows.filter((row) => state.selected.has(row.id)).forEach((row) => service.update('relationships', row.id, { supplierId, supplierName: supplier.name, executionPrice: price, startSupplyAt: startDate, changeLog: stamp }));
        state.rows = service.get('relationships'); state.selected.clear(); setFilterOptions(); render(); root.querySelector('#relationshipModal').classList.remove('open'); showToast('供货关系变更成功');
      }
    });
  }

  function renderSupplierManagement() {
    const root = mount('供应商档案', `
      <div class="page-card bidding-page" id="supplierManagementPage">
        <section class="bidding-filter-panel"><div class="bidding-filter-grid"><div class="bidding-filter-item"><label>供应商名称</label><input data-filter="name" placeholder="请输入"></div><div class="bidding-filter-item"><label>供应商联系人</label><input data-filter="contact" placeholder="请输入"></div><div class="bidding-filter-item"><label>状态</label><select data-filter="status"><option value="">全部</option><option value="启用">启用</option><option value="待审核">待审核</option><option value="已驳回">已驳回</option><option value="禁用">禁用</option></select></div></div><div class="bidding-filter-actions"><button class="btn btn-primary btn-sm" type="button" data-action="query">查询</button><button class="btn btn-sm" type="button" data-action="reset">重置</button></div></section>
        <div class="bidding-toolbar"><div class="bidding-toolbar-left"><button class="btn btn-primary btn-sm" type="button" data-action="add-supplier">添加供应商</button><button class="btn btn-primary btn-sm" type="button" data-action="invite-supplier">邀请供应商</button></div></div>
        <div class="bidding-table-container"><div class="bidding-table-wrapper"><table class="bidding-table supplier-archive-table"><thead><tr><th>序号</th><th>供应商名称</th><th>供应商联系人</th><th>联系电话</th><th>合作期限</th><th>状态</th><th>操作</th></tr></thead><tbody id="suppliersBody"></tbody></table></div><div class="pagination bidding-pagination" id="suppliersPagination"></div></div>
      </div>`);
    root.insertAdjacentHTML('beforeend', `
      <div class="bidding-modal-mask" id="supplierInviteModal" aria-hidden="true">
        <div class="bidding-dialog supplier-invite-dialog" role="dialog" aria-modal="true" aria-labelledby="supplierInviteTitle">
          <div class="bidding-dialog-header"><h2 id="supplierInviteTitle">邀请供应商</h2><button class="bidding-dialog-close" type="button" data-action="close-invite" aria-label="关闭">×</button></div>
          <div class="bidding-dialog-body">
            <div class="supplier-invite-field"><label for="supplierInviteLink">邀请链接</label><div class="supplier-invite-link-row"><input id="supplierInviteLink" class="bidding-readonly" type="text" readonly><button class="btn btn-primary btn-sm" type="button" data-action="copy-invite">复制链接</button></div><div class="supplier-invite-hint">链接失效前，供应商可通过此链接申请加入。</div></div>
            <div class="supplier-invite-field supplier-invite-expire-field"><label for="supplierInviteExpire">链接失效时间</label><input id="supplierInviteExpire" type="datetime-local" min="${localDateTimeValue(new Date())}" step="1" value="${dateTimeAfter(7)}"></div>
          </div>
          <div class="bidding-dialog-footer supplier-invite-footer"><button class="btn btn-sm supplier-demo-button" type="button" data-action="view-invite-prototype">查看邀请页面原型</button><div class="supplier-invite-footer-actions"><button class="btn btn-sm" type="button" data-action="close-invite">取消</button></div></div>
        </div>
      </div>`);
    syncNativeDateInputs(root);
    mountBiddingDatePickers(root);
    const state = { rows: service.get('suppliers'), filtered: [], pager: null };
    const inviteModal = root.querySelector('#supplierInviteModal');
    const inviteLink = root.querySelector('#supplierInviteLink');

    function createInviteLink(expireDate = valueOf(root, '#supplierInviteExpire') || dateTimeAfter(7)) {
      const token = `INV${Date.now().toString(36).toUpperCase()}`;
      return `./supplier-invite.html?mode=invite&invite=${token}&expires=${encodeURIComponent(expireDate)}`;
    }

    function openInviteModal() {
      if (!inviteLink.value) root.querySelector('#supplierInviteExpire').value ||= dateTimeAfter(7);
      inviteLink.value = createInviteLink();
      inviteModal.classList.add('open');
      inviteModal.setAttribute('aria-hidden', 'false');
    }

    function closeInviteModal() {
      inviteModal.classList.remove('open');
      inviteModal.setAttribute('aria-hidden', 'true');
    }

    async function copyInviteLink() {
      const value = inviteLink.value;
      let copied = false;
      try {
        if (window.navigator.clipboard?.writeText) {
          await window.navigator.clipboard.writeText(value);
          copied = true;
        }
      } catch (error) {
        // 使用下方的兼容性复制兜底。
      }
      if (!copied) {
        inviteLink.focus();
        inviteLink.select();
        copied = document.execCommand('copy');
      }
      showToast(copied ? '邀请链接已复制' : '请手动复制邀请链接', !copied);
    }

    function render() {
      const name = valueOf(root, '[data-filter="name"]').toLowerCase(); const contact = valueOf(root, '[data-filter="contact"]').toLowerCase(); const status = valueOf(root, '[data-filter="status"]');
      state.filtered = state.rows.filter((row) => (!name || row.name.toLowerCase().includes(name)) && (!contact || row.contact.toLowerCase().includes(contact)) && (!status || row.status === status));
      const page = state.pager?.getState() || { page: 1, pageSize: 20 }; const start = (page.page - 1) * page.pageSize;
      const supplierRows = state.filtered.slice(start, start + page.pageSize).map((row, index) => {
        const isPendingAudit = row.auditStatus === '待审核' || row.status === '待审核';
        const canEdit = row.status === '启用' && (!row.auditStatus || row.auditStatus === '已通过');
        const toggleButton = row.status === '启用' && !isPendingAudit ? `<button class="bidding-link" type="button" data-action="toggle-supplier" data-id="${row.id}">禁用</button>` : '';
        const auditButton = isPendingAudit ? `<button class="bidding-link" type="button" data-action="audit-supplier" data-id="${row.id}">审核</button>` : '';
        const editButton = canEdit ? `<button class="bidding-link" type="button" data-action="edit-supplier" data-id="${row.id}">编辑</button>` : '';
        return `<tr><td>${start + index + 1}</td><td>${esc(row.name)}</td><td>${esc(row.contact)}</td><td>${esc(row.phone)}</td><td>${row.cooperationStart ? `${esc(row.cooperationStart)} ~ ${esc(row.cooperationEnd)}` : '--'}</td><td>${statusTag(row.status)}</td><td><div class="bidding-actions-cell">${editButton}${toggleButton}<button class="bidding-link danger" type="button" data-action="delete-supplier" data-id="${row.id}">删除</button>${auditButton}</div></td></tr>`;
      }).join('');
      root.querySelector('#suppliersBody').innerHTML = supplierRows || '<tr><td class="empty-row" colspan="7">暂无符合条件的数据</td></tr>';
      state.pager?.update({ total: state.filtered.length });
    }
    state.pager = createPager('suppliersPagination', state.rows.length, render); render();
    root.addEventListener('click', (event) => {
      const action = event.target.closest('[data-action]')?.dataset.action; const id = event.target.closest('[data-id]')?.dataset.id;
      if (action === 'query') { state.pager.update({ page: 1 }); render(); }
      if (action === 'reset') { all(root, '[data-filter]').forEach((field) => { field.value = ''; }); state.pager.update({ page: 1 }); render(); }
      if (action === 'add-supplier') go('./supplier-editor.html?mode=add');
      if (action === 'invite-supplier') openInviteModal();
      if (action === 'view-invite-prototype') go('./supplier-invite.html?mode=invite&invite=demo');
      if (action === 'close-invite') closeInviteModal();
      if (action === 'copy-invite') copyInviteLink();
      if (action === 'audit-supplier' && id) go(`./supplier-editor.html?mode=audit&id=${encodeURIComponent(id)}`);
      if (action === 'edit-supplier' && id) go(`./supplier-editor.html?mode=edit&id=${encodeURIComponent(id)}`);
      if (action === 'toggle-supplier' && id) { const row = state.rows.find((item) => item.id === id); service.toggle('suppliers', id, row.status !== '启用'); state.rows = service.get('suppliers'); render(); showToast('状态已更新'); }
      if (action === 'delete-supplier' && id && window.confirm('确定删除这条供应商档案吗？')) { service.remove('suppliers', id); state.rows = service.get('suppliers'); render(); showToast('删除成功'); }
    });
    inviteModal.addEventListener('change', (event) => {
      if (event.target.id === 'supplierInviteExpire' && inviteModal.classList.contains('open')) {
        inviteLink.value = createInviteLink(event.target.value);
      }
    });
    inviteModal.addEventListener('click', (event) => {
      if (event.target === inviteModal) closeInviteModal();
    });
  }

  function renderSupplierForm() {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode') || 'add';
    const id = params.get('id') || '';
    const isInvite = mode === 'invite';
    const isAudit = mode === 'audit';
    const isSelfManaged = !isInvite && !isAudit;
    const showManagedSettings = !isInvite;
    const inviteExpires = params.get('expires') || '';
    const inviteToken = params.get('invite') || 'demo';
    const existing = isInvite ? null : service.get('suppliers').find((row) => row.id === id);
    const title = isAudit ? '审核供应商' : isInvite ? '供应商信息填写' : mode === 'edit' ? '编辑供应商' : '添加供应商';

    if (isInvite && inviteExpires && isExpiredDateTime(inviteExpires)) {
      mount('供应商信息填写', `<div class="page-card bidding-form-page supplier-invite-expired"><div class="supplier-invite-result"><h2>邀请链接已失效</h2><p>请联系教育局重新获取邀请链接。</p></div></div>`);
      return;
    }

    if (isInvite && params.get('submitted') === '1') {
      const resultRoot = mount('供应商信息填写', `<div class="page-card bidding-form-page supplier-invite-result-page"><div class="supplier-invite-result"><h2>供应商信息已提交</h2><p>信息已提交至教育局端，等待审核。</p><button class="btn btn-primary btn-sm" type="button" data-action="view-audit-list">查看教育局审核列表</button></div></div>`);
      resultRoot.addEventListener('click', (event) => {
        if (event.target.closest('[data-action="view-audit-list"]')) go('./supplier-archive.html');
      });
      return;
    }

    const readOnly = isAudit ? 'readonly' : '';
    const uploadDisabled = isAudit ? 'disabled' : '';
    const root = mount(title, `
      <div class="page-card bidding-form-page supplier-editor-form-page ${isAudit ? 'supplier-audit-form-page' : ''}" id="supplierFormPage">
        <div class="bidding-form-title-row"><button class="btn btn-sm bidding-back-button" type="button" data-action="back"><span class="bidding-back-icon" aria-hidden="true"></span><span>返回</span></button><h2>${title}</h2></div>
        <div class="bidding-form-grid supplier-form-grid">
          <div class="bidding-form-field required supplier-basic-field"><label>供应商名称</label><input data-field="name" placeholder="请输入供应商名称" value="${inputValue(existing?.name)}" ${readOnly}></div>
          ${showManagedSettings ? `<div class="bidding-form-field required supplier-basic-field supplier-username-field"><label>用户名</label><div class="bidding-control-stack"><input data-field="username" placeholder="请输入用户名" value="${inputValue(existing?.username)}"><div class="field-hint">请输入6~20位由字母、数字组成的用户名。</div><div class="field-hint">默认密码：1234567Aa，需供应商用户登录系统自行修改。</div></div></div>` : ''}
          <div class="bidding-form-field required supplier-basic-field"><label>联系人</label><input data-field="contact" placeholder="请输入供应商联系人" value="${inputValue(existing?.contact)}" ${readOnly}></div>
          <div class="bidding-form-field required supplier-basic-field supplier-phone-field"><label>联系电话</label><input data-field="phone" placeholder="请输入联系电话" value="${inputValue(existing?.phone)}" ${readOnly}></div>
          <div class="bidding-form-field supplier-license-field"><label>营业执照</label><div class="bidding-control-stack"><div class="bidding-file-row"><button class="supplier-upload-tile" type="button" data-action="choose-license" ${uploadDisabled}><span class="upload-plus">+</span><span>选择文件</span></button><span class="bidding-file-name" id="licenseFileName">${esc(existing?.licenseFileName || '未选择文件')}</span><input id="licenseFile" type="file" accept=".png,.jpg,.jpeg" hidden ${uploadDisabled}></div><div class="field-hint">支持png、jpg、jpeg图片格式，单张图片不超过5M</div><div class="field-hint">请仔细核对营业执照信息，若信息不符，请手动修改。</div></div></div>
          <div class="bidding-form-field supplier-license-meta"><label>统一社会信用代码</label><input data-field="licenseCode" placeholder="请输入统一社会信用代码" value="${inputValue(existing?.licenseCode)}" ${readOnly}></div>
          <div class="bidding-form-field supplier-license-meta"><label>住所</label><input data-field="address" placeholder="请输入住所" value="${inputValue(existing?.address)}" ${readOnly}></div>
          <div class="bidding-form-field supplier-qualification-field"><label>其他资质</label><div class="bidding-control-stack"><div class="bidding-file-row"><button class="btn btn-sm supplier-add-qualification" type="button" data-action="choose-qualification" ${uploadDisabled}>+</button><input id="qualificationFile" type="file" accept=".png,.jpg,.jpeg" hidden ${uploadDisabled}></div><div class="bidding-asset-list" id="qualificationNames">${(existing?.qualifications || []).map((item) => `<span class="bidding-asset-chip">${esc(item)}</span>`).join('')}</div><div class="field-hint">支持上传食品经营许可证、质量检测报告等资质图片，单张图片不超过5M</div></div></div>
          ${showManagedSettings ? `<div class="bidding-form-field supplier-date-field"><label>合作期限</label><div class="bidding-range"><input type="date" data-field="cooperationStart" value="${inputValue(existing?.cooperationStart)}" placeholder="请选择日期"><span>至</span><input type="date" data-field="cooperationEnd" value="${inputValue(existing?.cooperationEnd)}" placeholder="请选择日期"></div></div><div class="bidding-form-field"><label>联营供应商</label><div class="bidding-switch-row"><button class="bidding-switch ${existing?.jointVenture ? 'on' : ''}" type="button" data-switch="jointVenture" aria-pressed="${Boolean(existing?.jointVenture)}"></button><span class="bidding-switch-label">保存后无法编辑</span></div></div><div class="bidding-form-field"><label>隐藏客户价格</label><div class="bidding-switch-row"><button class="bidding-switch ${existing?.hideCustomerPrice ? 'on' : ''}" type="button" data-switch="hideCustomerPrice" aria-pressed="${Boolean(existing?.hideCustomerPrice)}"></button><span class="bidding-switch-label">开启后，该供应商端将不显示客户的单价和金额</span></div></div>` : ''}
        </div>
        <div class="bidding-form-actions">${isAudit ? '<button class="btn btn-sm" type="button" data-action="cancel">返回</button><button class="btn btn-danger btn-sm" type="button" data-action="reject-supplier">审核驳回</button><button class="btn btn-primary btn-sm" type="button" data-action="approve-supplier">审核通过</button>' : isInvite ? '<button class="btn btn-sm" type="button" data-action="cancel">取消</button><button class="btn btn-primary btn-sm" type="button" data-action="submit-invite">提交信息</button>' : '<button class="btn btn-sm" type="button" data-action="cancel">取消</button><button class="btn btn-primary btn-sm" type="button" data-action="save-supplier">保存</button>'}</div>
      </div>`);
    if (isAudit) {
      root.insertAdjacentHTML('beforeend', `
        <div class="bidding-modal-mask" id="supplierRejectConfirmModal" aria-hidden="true">
          <div class="bidding-dialog supplier-reject-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="supplierRejectConfirmTitle">
            <div class="bidding-dialog-header"><h2 id="supplierRejectConfirmTitle">审核驳回</h2><button class="bidding-dialog-close" type="button" data-action="close-reject-confirm" aria-label="关闭">×</button></div>
            <div class="bidding-dialog-body"><p class="supplier-reject-confirm-message">确定要驳回该供应商申请吗？</p><p class="supplier-reject-confirm-supplier">供应商名称：<strong>${esc(existing?.name || '--')}</strong></p></div>
            <div class="bidding-dialog-footer"><button class="btn btn-sm" type="button" data-action="close-reject-confirm">取消</button><button class="btn btn-danger btn-sm" type="button" data-action="confirm-reject-supplier">确认</button></div>
          </div>
        </div>`);
    }
    const rejectConfirmModal = root.querySelector('#supplierRejectConfirmModal');
    const closeRejectConfirm = () => {
      if (!rejectConfirmModal) return;
      rejectConfirmModal.classList.remove('open');
      rejectConfirmModal.setAttribute('aria-hidden', 'true');
    };
    const openRejectConfirm = () => {
      if (!rejectConfirmModal) return;
      rejectConfirmModal.classList.add('open');
      rejectConfirmModal.setAttribute('aria-hidden', 'false');
    };
    const switches = { jointVenture: Boolean(existing?.jointVenture), hideCustomerPrice: Boolean(existing?.hideCustomerPrice) };
    const qualificationNames = [...(existing?.qualifications || [])];
    root.addEventListener('change', (event) => {
      if (event.target.id === 'licenseFile') {
        const file = event.target.files?.[0];
        if (file && (file.size > 5 * 1024 * 1024 || !/\.(png|jpe?g)$/i.test(file.name))) { showToast('营业执照需为不超过5M的png、jpg或jpeg图片', true); event.target.value = ''; return; }
        root.querySelector('#licenseFileName').textContent = file?.name || '未选择文件';
      }
      if (event.target.id === 'qualificationFile') {
        const file = event.target.files?.[0];
        if (file && (file.size > 5 * 1024 * 1024 || !/\.(png|jpe?g)$/i.test(file.name))) { showToast('资质图片需为不超过5M的png、jpg或jpeg图片', true); event.target.value = ''; return; }
        if (file) { qualificationNames.push(file.name); root.querySelector('#qualificationNames').insertAdjacentHTML('beforeend', `<span class="bidding-asset-chip">${esc(file.name)}</span>`); }
      }
    });
    root.addEventListener('click', (event) => {
      const action = event.target.closest('[data-action]')?.dataset.action;
      const switchKey = event.target.closest('[data-switch]')?.dataset.switch;
      if (switchKey) { switches[switchKey] = !switches[switchKey]; const node = event.target.closest('[data-switch]'); node.classList.toggle('on', switches[switchKey]); node.setAttribute('aria-pressed', String(switches[switchKey])); return; }
      if (event.target === rejectConfirmModal) { closeRejectConfirm(); return; }
      if (action === 'reject-supplier' && isAudit && existing) { openRejectConfirm(); return; }
      if (action === 'close-reject-confirm') { closeRejectConfirm(); return; }
      if (action === 'confirm-reject-supplier' && isAudit && existing) {
        closeRejectConfirm();
        service.update('suppliers', existing.id, { status: '已驳回', auditStatus: '已驳回', auditRemark: '教育局审核驳回', auditedAt: dateTimeNow() });
        showToast('审核已驳回'); window.setTimeout(() => go('./supplier-archive.html?audit=rejected'), 450); return;
      }
      if (action === 'approve-supplier' && isAudit && existing) {
        const username = valueOf(root, '[data-field="username"]');
        const cooperationStart = valueOf(root, '[data-field="cooperationStart"]');
        const cooperationEnd = valueOf(root, '[data-field="cooperationEnd"]');
        if (!/^[A-Za-z0-9]{6,20}$/.test(username)) { showToast('用户名需为6~20位字母或数字', true); root.querySelector('[data-field="username"]')?.focus(); return; }
        if (!cooperationStart || !cooperationEnd) { showToast('请设置合作期限', true); return; }
        if (cooperationStart > cooperationEnd) { showToast('合作期限开始日期不能晚于结束日期', true); return; }
        service.update('suppliers', existing.id, { username, cooperationStart, cooperationEnd, jointVenture: switches.jointVenture, hideCustomerPrice: switches.hideCustomerPrice, status: '启用', auditStatus: '已通过', auditRemark: '', auditedAt: dateTimeNow() });
        showToast('审核已通过'); window.setTimeout(() => go('./supplier-archive.html?audit=approved'), 450); return;
      }
      if (action === 'back' || action === 'cancel') { go('./supplier-archive.html'); return; }
      if (action === 'choose-license') { root.querySelector('#licenseFile').click(); return; }
      if (action === 'choose-qualification') { root.querySelector('#qualificationFile').click(); return; }
      if (action !== 'save-supplier' && action !== 'submit-invite') return;
      const get = (key) => valueOf(root, `[data-field="${key}"]`);
      const payload = { name: get('name'), contact: get('contact'), phone: get('phone'), licenseCode: get('licenseCode'), address: get('address'), qualifications: qualificationNames, licenseFileName: root.querySelector('#licenseFileName').textContent };
      if (isSelfManaged) {
        Object.assign(payload, { username: get('username'), cooperationStart: get('cooperationStart'), cooperationEnd: get('cooperationEnd'), jointVenture: switches.jointVenture, hideCustomerPrice: switches.hideCustomerPrice });
      }
      if (!payload.name || !payload.contact || !payload.phone || (isSelfManaged && !payload.username)) { showToast(isSelfManaged ? '请完善供应商名称、用户名、联系人和联系电话' : '请完善供应商名称、联系人和联系电话', true); return; }
      if (isSelfManaged && !/^[A-Za-z0-9]{6,20}$/.test(payload.username)) { showToast('用户名需为6~20位字母或数字', true); return; }
      if (isSelfManaged && payload.cooperationStart && payload.cooperationEnd && payload.cooperationStart > payload.cooperationEnd) { showToast('合作期限开始日期不能晚于结束日期', true); return; }
      if (isInvite && action === 'submit-invite') {
        service.add('suppliers', { ...payload, username: '', cooperationStart: '', cooperationEnd: '', jointVenture: false, hideCustomerPrice: false, status: '待审核', auditStatus: '待审核', source: '供应商邀请', inviteToken, inviteExpiresAt: inviteExpires, submittedAt: dateTimeNow() }, 'SUP');
        showToast('供应商信息已提交，等待教育局审核'); window.setTimeout(() => go('./supplier-archive.html'), 450); return;
      }
      if (existing) service.update('suppliers', existing.id, payload); else service.add('suppliers', { ...payload, status: '启用' }, 'SUP');
      showToast('保存成功'); window.setTimeout(() => go('./supplier-archive.html'), 450);
    });
  }

  const renderers = {
    'bid-management': renderBidManagement,
    'bid-form': renderBidForm,
    'rules-management': renderRulesManagement,
    'rules-form': renderRuleForm,
    'limit-management': renderLimitManagement,
    'limit-form': renderLimitForm,
    'wasted-management': renderWastedManagement,
    'segment-management': renderSegmentManagement,
    'relationship-management': renderRelationshipManagement,
    'supplier-management': renderSupplierManagement,
    'supplier-form': renderSupplierForm
  };

  if (renderers[pageKey]) renderers[pageKey]();
})();
