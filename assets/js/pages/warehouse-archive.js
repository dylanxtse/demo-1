(function () {
  const companies = window.DemoStore?.get('companies') || [];
  const subsidiaryOptions = companies
    .filter((company) => company.type === 'SUBSIDIARY')
    .map((company) => ({
      value: company.id,
      label: company.name
    }));
  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  const getOperatingCompanyNames = (item) => {
    const ids = Array.isArray(item?.operatingCompanyIds)
      ? item.operatingCompanyIds
      : [item?.operatingCompanyId || item?.companyId].filter(Boolean);
    const currentCompanies = window.DemoStore?.get('companies') || companies;
    const names = ids.map((id) => {
      const company = currentCompanies.find((item) => item.id === id);
      return company?.name || id;
    }).filter(Boolean);
    return names.length ? names.join('、') : (item?.operatingCompanyName || '未分配');
  };
  const formatCreatedAt = (value) => {
    const normalized = window.BusinessRules?.normalizeDateTime(value);
    return escapeHtml(normalized || value || '--');
  };

  window.RecordPageConfig = {
    title: '仓库档案',
    pageClass: 'order-module-page warehouse-archive-page',
    resource: 'warehouses',
    detailTitle: '查看仓库',
    detailLayout: 'single',
    detailModalClass: 'warehouse-detail-modal',
    selectable: false,
    filters: [
      { key: 'warehouseCode', label: '仓库编码', placeholder: '请输入仓库编码' },
      { key: 'warehouseName', label: '仓库名称', placeholder: '请输入' },
      { key: 'operatingCompanyIds', label: '运营分公司', options: subsidiaryOptions },
      { key: 'dateRange', label: '添加时间', type: 'dateRange', placeholder: '请选择添加时间' }
    ],
    columns: [
      { key: 'warehouseCode', label: '仓库编码', link: true },
      { key: 'warehouseName', label: '仓库名称' },
      { key: 'address', label: '地址' },
      { key: 'operatingCompanyIds', label: '运营分公司', render: (item) => escapeHtml(getOperatingCompanyNames(item)) },
      { key: 'createdAt', label: '添加时间', render: (item) => formatCreatedAt(item.createdAt) }
    ],
    toolbar: [{ key: 'add', label: '添加', primary: true }],
    rowActions: [
      { key: 'edit', label: '编辑' },
      { key: 'delete', label: '删除', danger: true }
    ],
    formFields: [
      { key: 'warehouseName', label: '仓库名称', required: true, placeholder: '请输入仓库名称' },
      { key: 'address', label: '地址', required: true, fullRow: true, placeholder: '请输入地址' },
      { key: 'operatingCompanyIds', label: '运营分公司', required: true, options: subsidiaryOptions, multiple: true, fullRow: true, placeholder: '可多选运营分公司' }
    ],
    createDefaults: { status: 'ENABLE', referenced: false },
    deleteMessage: '请再次确定是否删除该仓库？'
  };
})();
