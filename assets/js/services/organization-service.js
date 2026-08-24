(function () {
  const DEFAULT_ADMIN_PASSWORD = '1234567Aa';
  const DEFAULT_USER_ROLE = '下属单位默认管理员';
  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function now() {
    return window.BusinessRules?.now() || new Date().toISOString().slice(0, 19).replace('T', ' ');
  }

  function nextCode(companies) {
    const used = new Set(companies.map((company) => company.code));
    let index = 1;
    while (used.has(`SUB${String(index).padStart(3, '0')}`)) index += 1;
    return `SUB${String(index).padStart(3, '0')}`;
  }

  function normalizeDistricts(districts) {
    return [...new Set((Array.isArray(districts) ? districts : []).map((item) => String(item || '').trim()).filter(Boolean))];
  }

  function getHeadquarters() {
    return window.DemoStore.get('companies').find((company) => company.type === 'HEADQUARTERS');
  }

  function currentOperator() {
    return window.DemoStore.getSession?.()?.displayName || '总公司管理员';
  }

  function createDefaultAdmin(companyId, username, password = DEFAULT_ADMIN_PASSWORD, districts = []) {
    const normalizedUsername = String(username || '').trim();
    const user = {
      id: `USER-${companyId}-ADMIN`,
      companyId,
      username: normalizedUsername,
      displayName: '子公司管理员',
      role: 'SUB_COMPANY_ADMIN',
      userRole: DEFAULT_USER_ROLE,
      status: 'ENABLE',
      password,
      forceChangePassword: false,
      districts: normalizeDistricts(districts),
      createdAt: now()
    };
    window.DemoStore.transact((state) => {
      if (!Array.isArray(state.users)) state.users = [];
      state.users = state.users.filter((item) => item.companyId !== companyId);
      state.users.unshift(user);
    });
    return clone(user);
  }

  window.OrganizationService = {
    districtOptions: ['东城区', '西城区', '朝阳区', '海淀区', '丰台区', '通州区', '顺义区', '昌平区'],
    list() {
      const head = getHeadquarters();
      return window.DemoStore.get('companies').filter((company) => company.parentId === head?.id);
    },
    get(id) {
      return window.DemoStore.get('companies').find((company) => company.id === id) || null;
    },
    getAdmin(companyId) {
      return window.DemoStore.get('users').find((user) => user.companyId === companyId && user.role === 'SUB_COMPANY_ADMIN') || null;
    },
    create(data) {
      const companies = window.DemoStore.get('companies');
      const headquarters = getHeadquarters();
      const name = String(data.name || '').trim();
      const adminUsername = String(data.adminUsername || '').trim();
      if (!name) throw new Error('请输入子公司名称');
      if (!adminUsername) throw new Error('请输入管理员用户名');
      if (!/^[A-Za-z0-9_]{3,20}$/.test(adminUsername)) throw new Error('管理员用户名需为3～20位字母、数字或下划线');
      if (companies.some((company) => company.name === name)) throw new Error('子公司名称不能完全相同');
      const code = nextCode(companies);
      const districts = normalizeDistricts(data.districts);
      const createdAt = now();
      const operator = currentOperator();
      const company = {
        id: `COMP-SUB-${Date.now()}`,
        code,
        name,
        parentId: headquarters?.id || '',
        type: 'SUBSIDIARY',
        status: 'ENABLE',
        contact: String(data.contact || '').trim(),
        phone: String(data.phone || '').trim(),
        address: String(data.address || '').trim(),
        districts,
        createdAt,
        updatedAt: createdAt,
        operator
      };
      window.DemoStore.transact((state) => {
        state.companies.unshift(company);
      });
      return { company: clone(company), admin: createDefaultAdmin(company.id, adminUsername, DEFAULT_ADMIN_PASSWORD, districts) };
    },
    update(id, data) {
      const existing = this.get(id);
      if (!existing) return null;
      const companies = window.DemoStore.get('companies');
      const name = String(data.name ?? existing.name ?? '').trim();
      const existingAdmin = this.getAdmin(id);
      const adminUsername = String(data.adminUsername ?? existingAdmin?.username ?? '').trim();
      if (!name) throw new Error('请输入子公司名称');
      if (!adminUsername) throw new Error('请输入管理员用户名');
      if (!/^[A-Za-z0-9_]{3,20}$/.test(adminUsername)) throw new Error('管理员用户名需为3～20位字母、数字或下划线');
      if (companies.some((company) => company.id !== id && company.name === name)) throw new Error('子公司名称不能完全相同');
      const districts = normalizeDistricts(data.districts);
      return window.DemoStore.transact((state) => {
        const company = state.companies.find((item) => item.id === id);
        Object.assign(company, {
          name,
          contact: String(data.contact || '').trim(),
          phone: String(data.phone || '').trim(),
          address: String(data.address || '').trim(),
          districts,
          updatedAt: now(),
          operator: currentOperator()
        });
        const admin = state.users.find((user) => user.companyId === id && user.role === 'SUB_COMPANY_ADMIN');
        if (admin) {
          admin.username = adminUsername;
          admin.userRole = DEFAULT_USER_ROLE;
          admin.districts = districts;
        }
        return clone(company);
      });
    },
    setStatus(id, status) {
      return window.DemoStore.transact((state) => {
        const company = state.companies.find((item) => item.id === id);
        if (!company) return null;
        company.status = status;
        company.updatedAt = now();
        company.operator = currentOperator();
        const admin = state.users.find((user) => user.companyId === id && user.role === 'SUB_COMPANY_ADMIN');
        if (admin) admin.status = status;
        return clone(company);
      });
    },
    resetAdminPassword(companyId) {
      const password = DEFAULT_ADMIN_PASSWORD;
      window.DemoStore.transact((state) => {
        const admin = state.users.find((user) => user.companyId === companyId && user.role === 'SUB_COMPANY_ADMIN');
        if (admin) {
          admin.password = password;
          admin.forceChangePassword = false;
        }
      });
      const admin = this.getAdmin(companyId);
      return { username: admin?.username || '', password };
    },
    getSessionCompany() {
      const session = window.DemoStore.getSession();
      return window.DemoStore.get('companies').find((company) => company.id === session?.companyId) || null;
    }
  };
})();
