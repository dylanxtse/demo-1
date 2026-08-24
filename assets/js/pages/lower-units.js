(function () {
  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const statusText = (status) => ({ ENABLE: '启用', DISABLE: '停用' }[status] || status || '--');
  const statusClass = (status) => status === 'ENABLE' ? 'online' : 'offline';
  const defaultUserRole = '下属单位默认管理员';
  const districtOptions = window.OrganizationService.districtOptions;
  let editingId = '';
  let credential = null;
  let filterState = { keyword: '', district: '', status: '' };

  function render() {
    const allCompanies = window.OrganizationService.list();
    const companies = allCompanies.filter((company) => {
      const keyword = filterState.keyword.toLocaleLowerCase();
      const districts = window.OrganizationService.getAdmin(company.id)?.districts || company.districts || [];
      const keywordMatched = !keyword
        || String(company.name || '').toLocaleLowerCase().includes(keyword)
        || String(company.contact || '').toLocaleLowerCase().includes(keyword);
      const districtMatched = !filterState.district || districts.includes(filterState.district);
      const statusMatched = !filterState.status || company.status === filterState.status;
      return keywordMatched && districtMatched && statusMatched;
    });
    const root = window.AppShell.mount({
      title: '下属单位管理',
      content: `
        <section class="page-card operations-page lower-units-page" aria-label="下属单位管理">
          <div class="lower-units-header">
            <div class="lower-units-title"><h1>下属单位管理</h1></div>
            <button class="btn btn-primary" type="button" data-action="add-company">新增下属单位</button>
          </div>
          <div class="lower-units-filter">
            <div class="lower-units-filter-main">
              <div class="lower-units-filter-item"><label for="companyKeyword">单位名称/联系人</label><input id="companyKeyword" value="${escapeHtml(filterState.keyword)}" placeholder="请输入单位名称、联系人"></div>
              <div class="lower-units-filter-item"><label for="companyDistrictFilter">负责区域</label><select id="companyDistrictFilter"><option value="">全部区域</option>${districtOptions.map((district) => `<option value="${escapeHtml(district)}" ${district === filterState.district ? 'selected' : ''}>${escapeHtml(district)}</option>`).join('')}</select></div>
              <div class="lower-units-filter-item"><label for="companyStatusFilter">状态</label><select id="companyStatusFilter"><option value="">全部状态</option><option value="ENABLE" ${filterState.status === 'ENABLE' ? 'selected' : ''}>启用</option><option value="DISABLE" ${filterState.status === 'DISABLE' ? 'selected' : ''}>停用</option></select></div>
            </div>
            <div class="lower-units-filter-actions"><button class="btn btn-primary btn-sm" type="button" data-action="query-companies">查询</button><button class="btn btn-sm" type="button" data-action="reset-company-filter">重置</button></div>
          </div>
          <div class="lower-units-table-wrap">
            <table class="lower-units-table">
              <thead><tr><th>下级单位名称</th><th>单位编号</th><th>负责区域</th><th>联系人</th><th>联系电话</th><th>管理员用户名</th><th>状态</th><th>创建时间</th><th>更新时间</th><th>操作人</th><th>操作</th></tr></thead>
              <tbody>${companies.length ? companies.map(renderRow).join('') : '<tr><td class="lower-units-empty" colspan="11">暂无符合条件的下属单位</td></tr>'}</tbody>
            </table>
          </div>
        </section>
        <div class="lower-units-modal" id="companyModal" aria-hidden="true"></div>
        <div class="lower-units-modal" id="credentialModal" aria-hidden="true"></div>
      `
    });
    bind(root);
  }

  function renderRow(company) {
    const admin = window.OrganizationService.getAdmin(company.id);
    const districts = admin?.districts || company.districts || [];
    return `<tr>
      <td class="company-name">${escapeHtml(company.name)}</td>
      <td class="company-code">${escapeHtml(company.code)}</td>
      <td>${districts.length ? districts.map((district) => `<span class="district-tag">${escapeHtml(district)}</span>`).join('') : '<span class="text-muted">未绑定</span>'}</td>
      <td>${escapeHtml(company.contact || '--')}</td>
      <td>${escapeHtml(company.phone || '--')}</td>
      <td><button class="btn-text" type="button" data-action="show-credential" data-id="${escapeHtml(company.id)}">${escapeHtml(admin?.username || '--')}</button></td>
      <td><span class="status-tag ${statusClass(company.status)}">${statusText(company.status)}</span></td>
      <td>${escapeHtml(company.createdAt || '--')}</td>
      <td>${escapeHtml(company.updatedAt || '--')}</td>
      <td>${escapeHtml(company.operator || '--')}</td>
      <td><div class="lower-units-actions">
        <button class="btn-text" type="button" data-action="edit-company" data-id="${escapeHtml(company.id)}">编辑</button>
        <button class="btn-text" type="button" data-action="reset-password" data-id="${escapeHtml(company.id)}">重置密码</button>
        <button class="btn-text ${company.status === 'ENABLE' ? 'danger' : ''}" type="button" data-action="toggle-company" data-id="${escapeHtml(company.id)}">${company.status === 'ENABLE' ? '停用' : '启用'}</button>
      </div></td>
    </tr>`;
  }

  function openCompanyModal(company = null) {
    editingId = company?.id || '';
    const selectedDistricts = new Set(window.OrganizationService.getAdmin(company?.id)?.districts || company?.districts || []);
    const modal = document.getElementById('companyModal');
    modal.innerHTML = `<div class="lower-units-dialog" role="dialog" aria-modal="true">
      <div class="lower-units-dialog-header"><h2>${company ? '编辑下属单位' : '新增下属单位'}</h2><button class="lower-units-dialog-close" type="button" data-action="close-company">×</button></div>
      <div class="lower-units-dialog-body"><div class="lower-units-form-grid">
        <div class="lower-units-form-field full"><label class="required">下级单位名称</label><input id="companyName" value="${escapeHtml(company?.name || '')}" placeholder="请输入下级单位名称"></div>
        <div class="lower-units-form-field full"><label class="required">管理员用户名</label><input id="companyAdminUsername" value="${escapeHtml(window.OrganizationService.getAdmin(company?.id)?.username || '')}" placeholder="请设置管理员用户名"></div>
        <div class="lower-units-form-field full"><label>用户角色</label><select id="companyUserRole"><option value="${escapeHtml(defaultUserRole)}" selected>${escapeHtml(defaultUserRole)}</option></select></div>
        <div class="lower-units-form-field"><label>联系人</label><input id="companyContact" value="${escapeHtml(company?.contact || '')}" placeholder="请输入联系人"></div>
        <div class="lower-units-form-field"><label>联系电话</label><input id="companyPhone" value="${escapeHtml(company?.phone || '')}" placeholder="请输入联系电话"></div>
        <div class="lower-units-form-field full"><label>地址</label><input id="companyAddress" value="${escapeHtml(company?.address || '')}" placeholder="请输入"></div>
        <div class="lower-units-form-field full"><label>绑定负责区域</label><div class="district-check-grid">${districtOptions.map((district) => `<label class="district-check"><input type="checkbox" name="companyDistrict" value="${escapeHtml(district)}" ${selectedDistricts.has(district) ? 'checked' : ''}><span>${escapeHtml(district)}</span></label>`).join('')}</div></div>
      </div></div>
      <div class="lower-units-dialog-footer"><button class="btn" type="button" data-action="close-company">取消</button><button class="btn btn-primary" type="button" data-action="save-company">保存</button></div>
    </div>`;
    modal.classList.add('is-visible');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeCompanyModal() {
    const modal = document.getElementById('companyModal');
    modal.classList.remove('is-visible');
    modal.setAttribute('aria-hidden', 'true');
    editingId = '';
  }

  function showCredential(company, admin, title = '管理员账号') {
    credential = { company, admin };
    const modal = document.getElementById('credentialModal');
    modal.innerHTML = `<div class="lower-units-dialog" role="dialog" aria-modal="true">
      <div class="lower-units-dialog-header"><h2>${title}</h2><button class="lower-units-dialog-close" type="button" data-action="close-credential">×</button></div>
      <div class="lower-units-dialog-body"><div class="lower-units-credential">
        <div>所属单位：<strong>${escapeHtml(company.name)}</strong></div><div>单位编号：<strong>${escapeHtml(company.code)}</strong></div><div>管理员用户名：<strong>${escapeHtml(admin.username)}</strong></div><div>初始密码：<strong>${escapeHtml(admin.password || '1234567Aa')}</strong></div>
      </div></div>
      <div class="lower-units-dialog-footer"><button class="btn btn-primary" type="button" data-action="close-credential">知道了</button></div>
    </div>`;
    modal.classList.add('is-visible');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeCredential() {
    const modal = document.getElementById('credentialModal');
    modal.classList.remove('is-visible');
    modal.setAttribute('aria-hidden', 'true');
    credential = null;
  }

  function bind(root) {
    root.addEventListener('click', (event) => {
      const target = event.target.closest('[data-action]');
      const action = target?.dataset.action;
      const id = target?.dataset.id;
      if (action === 'add-company') return openCompanyModal();
      if (action === 'query-companies') {
        filterState = {
          keyword: document.getElementById('companyKeyword')?.value.trim() || '',
          district: document.getElementById('companyDistrictFilter')?.value || '',
          status: document.getElementById('companyStatusFilter')?.value || ''
        };
        return render();
      }
      if (action === 'reset-company-filter') {
        filterState = { keyword: '', district: '', status: '' };
        return render();
      }
      if (action === 'close-company' || event.target.id === 'companyModal') return closeCompanyModal();
      if (action === 'close-credential' || event.target.id === 'credentialModal') return closeCredential();
      if (action === 'edit-company') return openCompanyModal(window.OrganizationService.get(id));
      if (action === 'show-credential') {
        const company = window.OrganizationService.get(id);
        return showCredential(company, window.OrganizationService.getAdmin(id));
      }
      if (action === 'reset-password') {
        const company = window.OrganizationService.get(id);
        if (!company || !window.confirm(`确定重置「${company.name}」的管理员密码吗？\n\n重置后密码将变更为：1234567Aa`)) return;
        return showCredential(company, window.OrganizationService.resetAdminPassword(id), '管理员密码已重置');
      }
      if (action === 'toggle-company') {
        const company = window.OrganizationService.get(id);
        if (!company) return;
        const next = company.status === 'ENABLE' ? 'DISABLE' : 'ENABLE';
        if (window.confirm(`确定${next === 'ENABLE' ? '启用' : '停用'}「${company.name}」吗？`)) {
          window.OrganizationService.setStatus(id, next);
          render();
        }
        return;
      }
      if (action === 'save-company') {
        const companyModal = document.getElementById('companyModal');
        const currentCompany = editingId ? window.OrganizationService.get(editingId) : null;
        const data = {
          name: companyModal?.querySelector('#companyName')?.value ?? currentCompany?.name ?? '',
          adminUsername: companyModal?.querySelector('#companyAdminUsername')?.value ?? '',
          userRole: companyModal?.querySelector('#companyUserRole')?.value ?? defaultUserRole,
          contact: companyModal?.querySelector('#companyContact')?.value ?? '',
          phone: companyModal?.querySelector('#companyPhone')?.value ?? '',
          address: companyModal?.querySelector('#companyAddress')?.value ?? '',
          districts: [...(companyModal?.querySelectorAll('input[name="companyDistrict"]:checked') || [])].map((input) => input.value)
        };
        try {
          if (editingId) window.OrganizationService.update(editingId, data);
          else {
            const result = window.OrganizationService.create(data);
            closeCompanyModal();
            render();
            return showCredential(result.company, result.admin, '管理员账号');
          }
          closeCompanyModal();
          render();
        } catch (error) {
          window.alert(error.message || '保存失败');
        }
      }
    });
  }

  render();
})();
