(function () {
  const app = document.getElementById('app');
  if (!app || !window.AppShell) return;

  const esc = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const backIcon = '<svg class="supplier-archive-back-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"></path><path d="M19 12H9"></path></svg>';
  const copyIcon = '<svg class="supplier-company-bank-copy-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="1.5"></rect><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"></path></svg>';
  const fallbackCompanies = [
    {
      id: 'SC-001', name: '统仓配送公司', contact: 'ryc', phone: '15967399523', schoolCount: 5, status: '启用',
      licenseCode: '91130927MA0A000006', address: '河北省沧州市南皮县城区兴业路18号', qualifications: ['食品经营许可证', '质量管理体系认证证书'],
      bankAccounts: [{ id: 'BANK-SC-001-001', accountName: '统仓配送公司', accountNumber: '622202000100010001', bankName: '中国银行', branchName: '南皮县支行', bankLineNumber: '104100000001', isDefault: true }]
    },
    {
      id: 'SC-002', name: '阳光智园供应链管理有限公司', contact: '王先生', phone: '17889788866', schoolCount: 73, status: '启用',
      licenseCode: '91130927MA0A000007', address: '河北省沧州市南皮县迎宾大道88号', qualifications: ['食品经营许可证', '农产品质量安全认证证书'],
      bankAccounts: [{ id: 'BANK-SC-002-001', accountName: '阳光智园供应链管理有限公司', accountNumber: '622848000200020002', bankName: '农业银行', branchName: '南皮迎宾大道支行', bankLineNumber: '103100000002', isDefault: true }]
    },
    {
      id: 'SC-003', name: '产品部学校食材集采供应链有限公司', contact: '杨', phone: '13573147976', schoolCount: 8, status: '启用',
      licenseCode: '91130927MA0A000008', address: '河北省沧州市南皮县城东工业园区6号', qualifications: ['食品经营许可证', '质量管理体系认证证书', '食品安全管理体系认证证书'],
      bankAccounts: [{ id: 'BANK-SC-003-001', accountName: '产品部学校食材集采供应链有限公司', accountNumber: '43254614164', bankName: '工商银行', branchName: '中国工商银行南皮支行', bankLineNumber: '102100099996', isDefault: true }]
    },
    {
      id: 'SC-004', name: '三石冷链供应商', contact: '刘磊', phone: '18500000000', schoolCount: 1, status: '启用',
      licenseCode: '91130927MA0A000009', address: '河北省沧州市南皮县冷链物流园12号', qualifications: ['食品经营许可证', '冷链食品经营备案证明'],
      bankAccounts: [{ id: 'BANK-SC-004-001', accountName: '三石冷链供应商', accountNumber: '621700000400040004', bankName: '建设银行', branchName: '南皮县冷链园支行', bankLineNumber: '105100000004', isDefault: true }]
    },
    {
      id: 'SC-005', name: '小姚食品连锁', contact: '姚石宇', phone: '15345234234', schoolCount: 20, status: '启用',
      licenseCode: '91130927MA0A000010', address: '河北省沧州市南皮县光明街39号', qualifications: ['食品经营许可证', '食品安全培训合格证明'],
      bankAccounts: [{ id: 'BANK-SC-005-001', accountName: '小姚食品连锁', accountNumber: '622588000500050005', bankName: '招商银行', branchName: '南皮光明街支行', bankLineNumber: '308100000005', isDefault: true }]
    }
  ];
  const fallbackSchools = [
    { id: 'SS-001', supplierId: 'SC-001', code: '31010600020', name: '静安第19中学' },
    { id: 'SS-002', supplierId: 'SC-001', code: '31010610002', name: '静安第1中学' },
    { id: 'SS-003', supplierId: 'SC-001', code: '31010600003', name: '静安第2中学' },
    { id: 'SS-004', supplierId: 'SC-001', code: '31010600051', name: '乔故强' },
    { id: 'SS-005', supplierId: 'SC-001', code: '31010600005', name: '静安第4中学' }
  ];

  const getCompanies = () => window.BiddingService?.get('supplierCompanies') || fallbackCompanies;
  const getSeedSchools = () => window.BiddingService?.get('supplierSchools') || fallbackSchools;

  function navigate(url) {
    if (window.AppNavigationGuard?.navigate) return window.AppNavigationGuard.navigate(url);
    if (window.AppNavigation?.navigate) return window.AppNavigation.navigate(url);
    window.location.href = url;
    return true;
  }

  function readRoute() {
    const value = String(window.location.hash || '').replace(/^#/, '');
    const [view = 'list', encodedId = ''] = value.split('/');
    let id = '';
    try {
      id = decodeURIComponent(encodedId);
    } catch (error) {
      id = encodedId;
    }
    return { view, id };
  }

  function getCompany(id) {
    return getCompanies().find((company) => company.id === id) || getCompanies()[0] || null;
  }

  function getBankAccounts(company) {
    const demoAccounts = Array.isArray(company?.bankAccounts) ? company.bankAccounts : [];
    const settings = window.DemoStore?.getSettings?.() || {};
    const session = window.DemoStore?.getSession?.() || {};
    const enterprise = (window.DemoStore?.get?.('companies') || []).find((item) => item.id === session.companyId);
    const isLinkedEnterprise = company?.id === 'SC-003' || (enterprise?.name && company?.name === enterprise.name);
    if (isLinkedEnterprise && Object.prototype.hasOwnProperty.call(settings, 'basicInfoBankAccounts')) {
      return Array.isArray(settings.basicInfoBankAccounts) ? settings.basicInfoBankAccounts : [];
    }
    return demoAccounts;
  }

  function isImageSource(value) {
    const source = String(value ?? '').trim();
    return /^data:image\//i.test(source) || /^(?:https?:|blob:|\/|\.{1,2}\/|assets\/)/i.test(source);
  }

  function getQualificationImages(company) {
    const settings = window.DemoStore?.getSettings?.() || {};
    const session = window.DemoStore?.getSession?.() || {};
    const enterprise = (window.DemoStore?.get?.('companies') || []).find((item) => item.id === session.companyId);
    const isLinkedEnterprise = company?.id === 'SC-003' || (enterprise?.name && company?.name === enterprise.name);
    const hasStoredImages = Object.prototype.hasOwnProperty.call(settings, 'basicInfoQualifications');

    if (isLinkedEnterprise && hasStoredImages) {
      return Array.isArray(settings.basicInfoQualifications)
        ? settings.basicInfoQualifications.filter(isImageSource)
        : [];
    }

    const sources = Array.isArray(company?.qualificationImages)
      ? company.qualificationImages
      : (Array.isArray(company?.qualifications) ? company.qualifications : []);
    return sources.filter(isImageSource);
  }

  function renderQualificationImages(company) {
    return getQualificationImages(company).map((source, index) => `
      <div class="supplier-company-qualification-item">
        <img class="supplier-company-qualification-image" src="${esc(source)}" alt="其他资质${index + 1}">
      </div>
    `).join('');
  }

  function maskBankAccount(value) {
    const accountNumber = String(value ?? '').trim();
    if (!accountNumber) return '--';
    if (accountNumber.length <= 8) return `${accountNumber.slice(0, 2)}****${accountNumber.slice(-2)}`;
    return `${accountNumber.slice(0, 4)}****${accountNumber.slice(-4)}`;
  }

  function copyText(value, label) {
    const text = String(value ?? '').trim();
    if (!text) {
      showToast(`${label}为空，无法复制`);
      return;
    }
    const fallbackCopy = () => new Promise((resolve, reject) => {
      const input = document.createElement('textarea');
      input.value = text;
      input.setAttribute('readonly', '');
      input.style.position = 'fixed';
      input.style.left = '-9999px';
      document.body.appendChild(input);
      input.select();
      try {
        document.execCommand('copy') ? resolve() : reject(new Error('copy failed'));
      } catch (error) {
        reject(error);
      } finally {
        input.remove();
      }
    });
    const copyPromise = navigator.clipboard?.writeText
      ? navigator.clipboard.writeText(text).catch(fallbackCopy)
      : fallbackCopy();
    copyPromise.then(() => showToast(`${label}已复制`)).catch(() => showToast('复制失败，请手动复制'));
  }

  function renderBankAccounts(company, expandedIndexes = new Set()) {
    const accounts = getBankAccounts(company);
    if (!accounts.length) return '<div class="supplier-company-bank-empty">暂无银行账户</div>';
    return accounts.map((account, index) => {
      const expanded = expandedIndexes.has(index);
      const detailId = `supplierBankDetails-${index}`;
      return `
      <article class="supplier-company-bank-card${expanded ? ' is-expanded' : ''}">
        <div class="supplier-company-bank-primary">
          <div class="supplier-company-bank-summary">
            <strong>${esc(account.bankName || '--')}</strong>
            <span>${esc(maskBankAccount(account.accountNumber))}</span>
          </div>
          ${account.isDefault ? '<b>默认</b>' : ''}
          <button class="supplier-company-bank-detail-toggle" type="button" data-action="toggle-bank-details" data-bank-index="${index}" aria-expanded="${expanded}" aria-controls="${detailId}">${expanded ? '收起' : '查看详情'}</button>
        </div>
        <div class="supplier-company-bank-details" id="${detailId}"${expanded ? '' : ' hidden'}>
          <div class="supplier-company-bank-grid">
            <div><span>账户名称</span><strong>${esc(account.accountName || company?.name || '--')}</strong></div>
            <div><span>银行名称</span><strong>${esc(account.bankName || '--')}</strong></div>
            <div><span>银行账号</span><div class="supplier-company-bank-value"><strong>${esc(account.accountNumber || '--')}</strong><button class="supplier-company-bank-copy" type="button" data-action="copy-bank-info" data-bank-index="${index}" data-copy-field="accountNumber" aria-label="复制银行账号" title="复制银行账号">${copyIcon}</button></div></div>
            <div><span>开户行支行</span><strong>${esc(account.branchName || '--')}</strong></div>
            <div><span>开户行行号</span><div class="supplier-company-bank-value"><strong>${esc(account.bankLineNumber || '--')}</strong><button class="supplier-company-bank-copy" type="button" data-action="copy-bank-info" data-bank-index="${index}" data-copy-field="bankLineNumber" aria-label="复制开户行行号" title="复制开户行行号">${copyIcon}</button></div></div>
          </div>
        </div>
      </article>
    `;
    }).join('');
  }

  function getSchools(company) {
    if (!company) return [];
    const stored = getSeedSchools().filter((school) => school.supplierId === company.id);
    const expectedCount = Math.max(Number(company.schoolCount) || stored.length, stored.length);
    const rows = [...stored];
    for (let index = rows.length; index < expectedCount; index += 1) {
      const sequence = String(index + 1).padStart(2, '0');
      rows.push({
        id: `${company.id}-SCHOOL-${sequence}`,
        supplierId: company.id,
        code: `310106${String(10000 + index + 1).padStart(5, '0')}`,
        name: `${company.name}供货学校${index + 1}`
      });
    }
    return rows;
  }

  function showToast(message) {
    let toast = document.querySelector('.supplier-archive-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'supplier-archive-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('is-visible');
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove('is-visible'), 1800);
  }

  function mount(title, content) {
    app.dataset.page = 'supplier-management';
    document.body.classList.add('supplier-archive-route');
    window.AppShell.mount({ title, content, variant: 'education', emptyText: title });
    return document.getElementById('pageContent');
  }

  function renderBackHeader(title) {
    return `<div class="supplier-archive-detail-head">
      <button class="back-link supplier-archive-back" type="button" data-action="back">${backIcon}<span>返回</span></button>
      <span class="supplier-archive-detail-divider" aria-hidden="true"></span>
      <h1>${esc(title)}</h1>
    </div>`;
  }

  function renderPagination(total, page, pageSize) {
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    return `<div class="supplier-archive-pagination">
      <span class="page-total">共 ${total} 条数据</span>
      <select class="page-size-select" data-action="page-size" aria-label="每页条数"><option value="20" ${pageSize === 20 ? 'selected' : ''}>20 条/页</option><option value="50" ${pageSize === 50 ? 'selected' : ''}>50 条/页</option></select>
      <div class="page-btns">
        <button class="page-btn" type="button" data-action="page" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''} aria-label="上一页">‹</button>
        <button class="page-btn active" type="button" data-action="page" data-page="${page}">${page}</button>
        <button class="page-btn" type="button" data-action="page" data-page="${page + 1}" ${page >= pageCount ? 'disabled' : ''} aria-label="下一页">›</button>
      </div>
      <label class="page-jump">跳至 <input class="pagination-jump-input" type="number" min="1" max="${pageCount}" value="${page}" data-action="jump-page" aria-label="跳转页码"> / ${pageCount} 页</label>
    </div>`;
  }

  function renderCompanyList() {
    const root = mount('企业档案', `<div class="page-card supplier-archive-page" id="supplierArchivePage">
      <section class="supplier-archive-filter" aria-label="企业筛选">
        <div class="supplier-archive-filter-fields">
          <label class="supplier-archive-filter-item"><span>企业名称</span><input data-filter="name" placeholder="请输入" aria-label="企业名称"></label>
          <label class="supplier-archive-filter-item"><span>启用状态</span><select data-filter="status" aria-label="启用状态"><option value="">全部</option><option value="启用">启用</option><option value="禁用">禁用</option></select></label>
        </div>
        <div class="supplier-archive-filter-actions"><button class="btn btn-primary btn-sm" type="button" data-action="query">查询</button><button class="btn btn-sm" type="button" data-action="reset">重置</button></div>
      </section>
      <div class="supplier-archive-toolbar"><button class="supplier-archive-export" type="button" data-action="export" aria-label="导出企业档案">导出</button></div>
      <div class="supplier-archive-table-shell">
        <div class="supplier-archive-table-wrap"><table class="supplier-archive-table"><colgroup><col class="col-seq"><col class="col-name"><col class="col-contact"><col class="col-phone"><col class="col-schools"><col class="col-status"></colgroup><thead><tr><th>序号</th><th>企业名称</th><th>负责人</th><th>联系电话</th><th>供货学校</th><th>启用状态</th></tr></thead><tbody data-company-body></tbody></table></div>
        <div data-pagination></div>
      </div>
    </div>`);
    const state = { rows: getCompanies(), filtered: [], page: 1, pageSize: 20 };

    function render() {
      const name = root.querySelector('[data-filter="name"]')?.value.trim().toLowerCase() || '';
      const status = root.querySelector('[data-filter="status"]')?.value || '';
      state.filtered = state.rows.filter((company) => (!name || company.name.toLowerCase().includes(name)) && (!status || company.status === status));
      const pageCount = Math.max(1, Math.ceil(state.filtered.length / state.pageSize));
      state.page = Math.min(state.page, pageCount);
      const start = (state.page - 1) * state.pageSize;
      const rows = state.filtered.slice(start, start + state.pageSize);
      root.querySelector('[data-company-body]').innerHTML = rows.length
        ? rows.map((company, index) => `<tr>
            <td data-label="序号">${start + index + 1}</td>
            <td data-label="企业名称"><button class="supplier-archive-link" type="button" data-action="open-company" data-id="${esc(company.id)}">${esc(company.name)}</button></td>
            <td data-label="负责人">${esc(company.contact || '--')}</td>
            <td data-label="联系电话"><span class="supplier-archive-link-text">${esc(company.phone || '--')}</span></td>
            <td data-label="供货学校"><button class="supplier-archive-link" type="button" data-action="open-schools" data-id="${esc(company.id)}">${Number(company.schoolCount) || 0}</button></td>
            <td data-label="启用状态"><span class="supplier-archive-status">${esc(company.status || '--')}</span></td>
          </tr>`).join('')
        : '<tr><td class="empty-row" colspan="6">暂无符合条件的数据</td></tr>';
      root.querySelector('[data-pagination]').innerHTML = renderPagination(state.filtered.length, state.page, state.pageSize);
    }

    root.addEventListener('click', (event) => {
      const target = event.target.closest('[data-action]');
      const action = target?.dataset.action;
      if (!action) return;
      if (action === 'query') { state.page = 1; render(); }
      if (action === 'reset') {
        root.querySelector('[data-filter="name"]').value = '';
        root.querySelector('[data-filter="status"]').value = '';
        state.page = 1;
        render();
      }
      if (action === 'export') showToast('导出成功');
      if (action === 'open-company') navigate(`./supplier-archive.html#company/${encodeURIComponent(target.dataset.id)}`);
      if (action === 'open-schools') navigate(`./supplier-archive.html#schools/${encodeURIComponent(target.dataset.id)}`);
      if (action === 'page' && !target.disabled) {
        state.page = Math.max(1, Number(target.dataset.page) || 1);
        render();
      }
    });
    root.addEventListener('change', (event) => {
      if (event.target.matches('[data-action="page-size"]')) {
        state.pageSize = Number(event.target.value) || 20;
        state.page = 1;
        render();
      }
    });
    root.addEventListener('keydown', (event) => {
      if (event.target.matches('[data-action="jump-page"]') && event.key === 'Enter') {
        event.preventDefault();
        const pageCount = Math.max(1, Math.ceil(state.filtered.length / state.pageSize));
        state.page = Math.min(pageCount, Math.max(1, Number(event.target.value) || 1));
        render();
      }
    });
    render();
  }

  function renderSchoolDetail(company) {
    const root = mount('供货学校详情', `<div class="page-card supplier-archive-detail-page" id="supplierSchoolDetailPage">
      ${renderBackHeader('供货学校详情')}
      <section class="supplier-archive-detail-content supplier-school-detail-content">
        <div class="supplier-archive-detail-filter"><label><span>学校名称</span><input data-filter="school-name" placeholder="请输入学校名称" aria-label="学校名称"></label><div><button class="btn btn-primary btn-sm" type="button" data-action="query">查询</button><button class="btn btn-sm" type="button" data-action="reset">重置</button></div></div>
        <div class="supplier-archive-table-shell supplier-school-table-shell"><div class="supplier-archive-table-wrap"><table class="supplier-archive-table supplier-school-table"><colgroup><col class="col-seq"><col class="col-school-code"><col class="col-school-name"></colgroup><thead><tr><th>序号</th><th>学校编码</th><th>学校名称</th></tr></thead><tbody data-school-body></tbody></table></div><div data-pagination></div></div>
      </section>
    </div>`);
    const state = { rows: getSchools(company), filtered: [], page: 1, pageSize: 20 };

    function render() {
      const keyword = root.querySelector('[data-filter="school-name"]')?.value.trim().toLowerCase() || '';
      state.filtered = state.rows.filter((school) => !keyword || school.name.toLowerCase().includes(keyword));
      const pageCount = Math.max(1, Math.ceil(state.filtered.length / state.pageSize));
      state.page = Math.min(state.page, pageCount);
      const start = (state.page - 1) * state.pageSize;
      root.querySelector('[data-school-body]').innerHTML = state.filtered.slice(start, start + state.pageSize).map((school, index) => `<tr><td data-label="序号">${start + index + 1}</td><td data-label="学校编码">${esc(school.code)}</td><td data-label="学校名称">${esc(school.name)}</td></tr>`).join('') || '<tr><td class="empty-row" colspan="3">暂无符合条件的数据</td></tr>';
      root.querySelector('[data-pagination]').innerHTML = renderPagination(state.filtered.length, state.page, state.pageSize);
    }

    root.addEventListener('click', (event) => {
      const target = event.target.closest('[data-action]');
      const action = target?.dataset.action;
      if (action === 'back') navigate('./supplier-archive.html');
      if (action === 'query') { state.page = 1; render(); }
      if (action === 'reset') { root.querySelector('[data-filter="school-name"]').value = ''; state.page = 1; render(); }
      if (action === 'page' && !target.disabled) { state.page = Math.max(1, Number(target.dataset.page) || 1); render(); }
    });
    root.addEventListener('change', (event) => {
      if (event.target.matches('[data-action="page-size"]')) { state.pageSize = Number(event.target.value) || 20; state.page = 1; render(); }
    });
    root.addEventListener('keydown', (event) => {
      if (event.target.matches('[data-action="jump-page"]') && event.key === 'Enter') {
        event.preventDefault();
        const pageCount = Math.max(1, Math.ceil(state.filtered.length / state.pageSize));
        state.page = Math.min(pageCount, Math.max(1, Number(event.target.value) || 1));
        render();
      }
    });
    render();
  }

  function renderCompanyDetail(company) {
    const expandedBankIndexes = new Set();
    const root = mount('企业详情', `<div class="page-card supplier-archive-detail-page supplier-company-detail-page" id="supplierCompanyDetailPage">
      ${renderBackHeader('企业详情')}
      <div class="supplier-company-detail-body">
        <section class="supplier-company-basic-info">
          <div class="supplier-company-field"><span>名称</span><strong>${esc(company?.name || '--')}</strong></div>
          <div class="supplier-company-field"><span>负责人</span><strong>${esc(company?.contact || '--')}</strong></div>
          <div class="supplier-company-field"><span>联系电话</span><strong>${esc(company?.phone || '--')}</strong></div>
        </section>
        <section class="supplier-company-section"><h2>营业执照</h2><div class="supplier-license-card"><div><span>统一社会信用代码</span><strong>${esc(company?.licenseCode || '')}</strong></div><div><span>住所</span><strong>${esc(company?.address || '')}</strong></div></div></section>
        <section class="supplier-company-section supplier-company-qualifications"><h2>其他资质</h2><div class="supplier-company-qualification-gallery">${renderQualificationImages(company)}</div></section>
        <section class="supplier-company-section supplier-company-bank-section"><h2>银行账户</h2><div class="supplier-company-bank-list">${renderBankAccounts(company, expandedBankIndexes)}</div></section>
      </div>
    </div>`);
    root.addEventListener('click', (event) => {
      const target = event.target.closest('[data-action]');
      const action = target?.dataset.action;
      if (action === 'back') {
        navigate('./supplier-archive.html');
        return;
      }
      if (action === 'toggle-bank-details') {
        const index = Number(target.dataset.bankIndex);
        if (expandedBankIndexes.has(index)) expandedBankIndexes.delete(index);
        else expandedBankIndexes.add(index);
        root.querySelector('.supplier-company-bank-list').innerHTML = renderBankAccounts(company, expandedBankIndexes);
        return;
      }
      if (action === 'copy-bank-info') {
        const index = Number(target.dataset.bankIndex);
        const field = target.dataset.copyField;
        const account = getBankAccounts(company)[index];
        const label = field === 'bankLineNumber' ? '开户行行号' : '银行账号';
        copyText(account?.[field], label);
      }
    });
  }

  function renderCurrent() {
    const route = readRoute();
    if (route.view === 'schools') {
      renderSchoolDetail(getCompany(route.id));
      return;
    }
    if (route.view === 'company') {
      renderCompanyDetail(getCompany(route.id));
      return;
    }
    renderCompanyList();
  }

  window.addEventListener('hashchange', renderCurrent);
  renderCurrent();
})();
