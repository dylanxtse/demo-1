(function () {
  const fallbackCanteens = [
    { id: 'canteen-demo', name: '静安第一中学食堂（演示）', code: '--', contact: '张三', phone: '13598767869', address: '静安区' },
    { id: 'canteen-002', name: '静安1中食堂', code: '91371721MABYLE8Q4R', contact: '王锦安', phone: '15646871654', address: '静安区' },
    { id: 'canteen-003', name: '第2食堂', code: '--', contact: '刘先生', phone: '13866551122', address: '静安区' },
    { id: 'canteen-004', name: '第一食堂', code: '--', contact: '王先生', phone: '15269836547', address: '静安区' },
    { id: 'canteen-default', name: '默认', code: '--', contact: '默认', phone: '13658888888', address: '静安区' }
  ];
  const seed = window.SchoolReferenceData?.canteens?.length ? window.SchoolReferenceData.canteens : fallbackCanteens;
  const storageKey = 'school-canteens-v1';
  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');

  function readRows() {
    try {
      const saved = JSON.parse(window.localStorage.getItem(storageKey) || 'null');
      if (!Array.isArray(saved) || !saved.length) return seed.map((item) => ({ ...item }));
      const merged = seed.map((item) => {
        const stored = saved.find((entry) => entry.id === item.id) || {};
        return { ...item, ...stored };
      });
      return merged.concat(saved.filter((item) => !seed.some((entry) => entry.id === item.id)));
    } catch (error) {
      return seed.map((item) => ({ ...item }));
    }
  }

  function writeRows(rows) {
    try { window.localStorage.setItem(storageKey, JSON.stringify(rows)); } catch (error) { /* file:// 存储不可用时保持本页状态 */ }
  }

  const state = { rows: readRows(), filtered: [], page: 1, pageSize: 20, name: '', contact: '', pagination: null };
  const root = window.AppShell.mount({
    title: '食堂管理',
    variant: 'school',
    content: `<section class="page-card school-missing-page school-canteen-page" aria-label="食堂管理">
      <div class="school-page-filter">
        <div class="school-filter-grid">
          <div class="school-filter-field"><label for="schoolCanteenName">食堂名称</label><select id="schoolCanteenName" class="school-control"><option value="">全部</option></select></div>
          <div class="school-filter-field"><label for="schoolCanteenContact">食堂联系人</label><input id="schoolCanteenContact" class="school-control" placeholder="负责人/联系电话"></div>
        </div>
        <div class="school-filter-actions"><button class="btn btn-primary" id="schoolCanteenQuery" type="button">查询</button><button class="btn" id="schoolCanteenReset" type="button">重置</button><button class="btn btn-primary" id="schoolCanteenAdd" type="button">添加食堂</button></div>
      </div>
      <div class="school-table-container">
        <div class="school-table-wrap"><table class="school-data-table school-canteen-table"><colgroup><col style="width:80px"><col style="width:32%"><col style="width:28%"><col style="width:25%"><col style="width:180px"></colgroup><thead><tr><th>序号</th><th>食堂名称</th><th>统一社会信用代码</th><th>食堂联系人</th><th>操作</th></tr></thead><tbody id="schoolCanteenBody"></tbody></table></div>
        <div class="school-page-pagination" id="schoolCanteenPagination"></div>
      </div>
      <div class="school-toast" id="schoolCanteenToast" role="status"></div>
    </section>`
  });
  const page = root.querySelector('.school-canteen-page');
  const $ = (selector) => page.querySelector(selector);

  function toast(message, isError = false) {
    const element = $('#schoolCanteenToast');
    element.textContent = message;
    element.className = `school-toast is-visible${isError ? ' is-error' : ''}`;
    window.clearTimeout(toast.timer);
    toast.timer = window.setTimeout(() => { element.className = 'school-toast'; }, 2200);
  }

  function populateNameFilter() {
    const select = $('#schoolCanteenName');
    const value = select.value;
    select.innerHTML = `<option value="">全部</option>${state.rows.map((item) => `<option value="${escapeHtml(item.name)}">${escapeHtml(item.name)}</option>`).join('')}`;
    select.value = state.rows.some((item) => item.name === value) ? value : '';
  }

  function applyFilters() {
    state.filtered = state.rows.filter((item) => {
      const nameMatches = !state.name || item.name === state.name;
      const contactText = `${item.contact} ${item.phone}`.toLowerCase();
      return nameMatches && (!state.contact || contactText.includes(state.contact.toLowerCase()));
    });
  }

  function render() {
    const start = (state.page - 1) * state.pageSize;
    const rows = state.filtered.slice(start, start + state.pageSize);
    $('#schoolCanteenBody').innerHTML = rows.length ? rows.map((item, index) => `<tr data-id="${escapeHtml(item.id)}">
      <td>${start + index + 1}</td><td title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</td><td>${escapeHtml(item.code || '--')}</td>
      <td>${escapeHtml(item.contact || '--')}<button class="school-canteen-phone" type="button" title="拨打电话">（${escapeHtml(item.phone || '--')}）</button></td>
      <td><button class="school-action-link" type="button" data-action="edit">编辑</button><button class="school-action-link danger" type="button" data-action="delete" ${item.id === 'canteen-default' ? '' : 'disabled'}>删除</button></td>
    </tr>`).join('') : '<tr><td class="school-empty-cell" colspan="5">暂无数据</td></tr>';
    state.pagination?.update({ page: state.page, pageSize: state.pageSize, total: state.filtered.length });
  }

  function query() {
    state.name = $('#schoolCanteenName').value;
    state.contact = $('#schoolCanteenContact').value.trim();
    state.page = 1;
    applyFilters();
    render();
  }

  page.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.id === 'schoolCanteenAdd') {
      window.AppNavigation?.navigate?.('./school-canteen-form.html?type=add');
      return;
    }
    if (button.id === 'schoolCanteenQuery') { query(); return; }
    if (button.id === 'schoolCanteenReset') {
      $('#schoolCanteenName').value = '';
      $('#schoolCanteenContact').value = '';
      state.name = '';
      state.contact = '';
      state.page = 1;
      applyFilters();
      render();
      return;
    }
    const action = button.dataset.action;
    const row = button.closest('tr[data-id]');
    const item = state.rows.find((entry) => entry.id === row?.dataset.id);
    if (!item) return;
    if (action === 'edit') {
      window.AppNavigation?.navigate?.(`./school-canteen-form.html?type=edit&id=${encodeURIComponent(item.id)}`);
      return;
    }
    if (action === 'delete' && !button.disabled) {
      const confirmed = window.confirm(`确定删除食堂“${item.name}”吗？`);
      if (!confirmed) return;
      state.rows = state.rows.filter((entry) => entry.id !== item.id);
      writeRows(state.rows);
      populateNameFilter();
      query();
      toast('删除成功');
    }
  });

  populateNameFilter();
  applyFilters();
  state.pagination = window.Pagination.create({
    container: '#schoolCanteenPagination', page: 1, pageSize: 20, total: state.filtered.length,
    pageSizeOptions: [20, 50, 100],
    onChange: ({ page, pageSize }) => { state.page = page; state.pageSize = pageSize; render(); }
  });
  render();
})();
