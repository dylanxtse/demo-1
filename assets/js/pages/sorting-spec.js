(function () {
  const STORAGE_KEY = 'procurement-sorting-package-specs-v2';
  const state = {
    specs: [],
    products: [],
    keyword: '',
    packageUnit: '',
    packageUnits: [],
    netVegetable: '',
    standardProduct: '',
    status: '',
    page: 1,
    pageSize: 20,
    modal: null,
    importModal: false,
    importFileName: '',
    importResult: '',
    importResultModal: null,
    pagination: null
  };

  const downloadIcon = '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12"></path><polyline points="7 10 12 15 17 10"></polyline><path d="M5 21h14"></path></svg>';

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const today = () => {
    const date = new Date();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  };

  const currentDateTime = () => {
    const date = new Date();
    const pad = (value) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  };

  const normalizeDateTime = (value) => {
    const text = String(value || '').trim().replace('T', ' ');
    if (!text) return currentDateTime();
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return `${text} 00:00:00`;
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(text)) return `${text}:00`;
    return text;
  };

  const quantityDecimalPlaces = () => {
    const configured = Number(window.DemoStore?.getSettings?.()?.quantityDecimal);
    return [0, 1, 2, 4].includes(configured) ? configured : 0;
  };

  const formatNumber = (value, decimals = 3) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return '--';
    return String(Number(number.toFixed(decimals)));
  };

  function productByCode(code) {
    return state.products.find((product) => String(product.code) === String(code)) || null;
  }

  async function loadPackageUnits() {
    try {
      const options = await window.UnitMeasurementService?.options?.();
      return [...new Set((options || []).map((option) => String(option.label || '').trim()).filter(Boolean))];
    } catch (error) {
      const units = window.DemoStore?.get?.('units') || [];
      return [...new Set(units
        .filter((item) => item.status === 'ENABLE')
        .map((item) => String(item.unitName || '').trim())
        .filter(Boolean))];
    }
  }

  function renderPackageUnitOptions(selectedUnit = '', includePlaceholder = false) {
    const units = [...state.packageUnits];
    if (selectedUnit && !units.includes(selectedUnit)) units.unshift(selectedUnit);
    if (includePlaceholder) {
      return `<option value="">全部</option>`.concat(units.map((unit) => `<option value="${escapeHtml(unit)}" ${unit === selectedUnit ? 'selected' : ''}>${escapeHtml(unit)}</option>`).join(''));
    }
    return units.map((unit) => `<option value="${escapeHtml(unit)}" ${unit === selectedUnit ? 'selected' : ''}>${escapeHtml(unit)}</option>`).join('');
  }

  function normalizeSpec(spec) {
    const product = productByCode(spec.productCode);
    return {
      id: spec.id || `SPS-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
      productCode: String(spec.productCode || ''),
      productName: spec.productName || product?.name || '',
      packageName: String(spec.packageName || ''),
      packageQty: Number(spec.packageQty) || 0,
      packageUnit: String(spec.packageUnit || ''),
      baseUnit: product?.unit || spec.baseUnit || '',
      status: spec.status === 'DISABLE' ? 'DISABLE' : 'ENABLE',
      effectiveFrom: spec.effectiveFrom || today(),
      updatedAt: normalizeDateTime(spec.updatedAt || spec.effectiveFrom || today()),
      remark: String(spec.remark || '')
    };
  }

  function buildSeed(productCode, packageName, packageQty, packageUnit, status, effectiveFrom, remark) {
    const product = productByCode(productCode);
    if (!product) return null;
    return normalizeSpec({
      id: `SPS-${productCode}`,
      productCode,
      productName: product.name,
      packageName,
      packageQty,
      packageUnit,
      baseUnit: product.unit,
      status,
      effectiveFrom,
      remark
    });
  }

  function seedSpecs() {
    return [
      buildSeed('SP0300061', '10斤分装包', 10, '包', 'ENABLE', '2026-09-29', '净菜按包分装'),
      buildSeed('SP0300039', '10斤分装包', 10, '包', 'ENABLE', '2026-09-29', '净菜按包分装'),
      buildSeed('SP0300025', '5kg透明分装袋', 5, '包', 'ENABLE', '2026-09-01', '粮油常用分包规格'),
      buildSeed('SP0300019', '10斤周转袋', 10, '袋', 'ENABLE', '2026-08-25', '叶菜按订单量分装'),
      buildSeed('SP0300018', '2.5斤托盘', 2.5, '托', 'DISABLE', '2026-08-10', '已停用，保留历史记录'),
      buildSeed('SP0300034', '25kg编织袋', 25, '袋', 'ENABLE', '2026-08-20', '大米整袋出库'),
      buildSeed('SP0300020', '10kg泡沫箱', 10, '箱', 'ENABLE', '2026-09-05', '净菜标准分装箱'),
      buildSeed('SP0300051', '10斤分装包', 10, '包', 'ENABLE', '2026-09-29', '净菜按包分装'),
      buildSeed('SP0300055', '10斤分装包', 10, '包', 'ENABLE', '2026-09-29', '净菜按包分装'),
      buildSeed('SP0300059', '10斤分装包', 10, '包', 'ENABLE', '2026-09-29', '净菜按包分装'),
      buildSeed('SP0300031', '5斤保温箱', 5, '箱', 'ENABLE', '2026-09-29', '水产加冰分装'),
      buildSeed('SP0300030', '10瓶整箱', 10, '箱', 'ENABLE', '2026-09-29', '食用油按箱发货'),
      buildSeed('SP0300015', '10斤周转筐', 10, '筐', 'ENABLE', '2026-08-15', '水果标准筐'),
      buildSeed('SP0300037', '10瓶整箱', 10, '箱', 'ENABLE', '2026-08-01', '牛奶按箱分拣'),
      buildSeed('SP0300014', '10斤周转筐', 10, '筐', 'ENABLE', '2026-08-15', '水果标准筐'),
      buildSeed('SP0300040', '10斤网袋', 10, '袋', 'ENABLE', '2026-08-18', '根茎类分装'),
      buildSeed('SP0300029', '5斤保温箱', 5, '箱', 'ENABLE', '2026-09-10', '水产加冰分装')
    ].filter(Boolean);
  }

  function readSpecs() {
    const saved = window.AppStorage?.read(STORAGE_KEY, null);
    if (Array.isArray(saved)) {
      const normalized = saved.map(normalizeSpec);
      const existingCodes = new Set(normalized.map((spec) => String(spec.productCode || '')));
      const additions = seedSpecs().filter((spec) => spec && !existingCodes.has(String(spec.productCode)));
      const merged = normalized.concat(additions);
      if (additions.length || merged.some((spec, index) => spec.baseUnit !== saved[index]?.baseUnit)) {
        window.AppStorage?.write(STORAGE_KEY, merged);
      }
      return merged;
    }
    const seeded = seedSpecs();
    window.AppStorage?.write(STORAGE_KEY, seeded);
    return seeded;
  }

  function saveSpecs() {
    window.AppStorage?.write(STORAGE_KEY, state.specs);
  }

  const importTemplateHeaders = ['商品编号', '商品名称（计量单位/品牌/规格）', '是否标品', '计量单位', '分包单位', '分包系数', '状态', '备注'];

  function importProductDisplayName(product) {
    return window.DomUtils?.formatProductDisplay?.(product, state.products)
      || `${product?.name || '--'}（${product?.unit || '--'}/${product?.brand || '--'}/${product?.spec || '--'}）`;
  }

  function csvCell(value) {
    return `"${String(value ?? '').replace(/"/g, '""')}"`;
  }

  function importTemplateCsv() {
    const rows = state.products.map((product) => [
      product.code,
      importProductDisplayName(product),
      isStandardProduct(product) ? '是' : '否',
      product.unit || '',
      '',
      '',
      '启用',
      ''
    ]);
    return [importTemplateHeaders, ...rows]
      .map((row) => row.map(csvCell).join(','))
      .join('\n');
  }

  function downloadText(filename, text) {
    const blob = new Blob([`\uFEFF${text}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function downloadImportTemplate() {
    downloadText('分包规格导入模板.csv', importTemplateCsv());
  }

  function importFailureCsv(failures) {
    const headers = [...importTemplateHeaders, '失败原因'];
    const rows = failures.map((failure) => [
      failure.productCode,
      failure.productName,
      failure.standardProduct,
      failure.baseUnit,
      failure.packageUnit,
      failure.packageQty,
      failure.status,
      failure.remark,
      failure.reason
    ]);
    return [headers, ...rows]
      .map((row) => row.map(csvCell).join(','))
      .join('\n');
  }

  function downloadImportFailures() {
    const failures = state.importResultModal?.failures || [];
    if (!failures.length) return;
    downloadText('分包规格导入失败模板.csv', importFailureCsv(failures));
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = '';
    let quoted = false;
    const source = String(text || '').replace(/^\uFEFF/, '');

    for (let index = 0; index < source.length; index += 1) {
      const character = source[index];
      if (character === '"') {
        if (quoted && source[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = !quoted;
        }
      } else if (character === ',' && !quoted) {
        row.push(cell.trim());
        cell = '';
      } else if ((character === '\n' || character === '\r') && !quoted) {
        if (character === '\r' && source[index + 1] === '\n') index += 1;
        row.push(cell.trim());
        if (row.some((value) => value !== '')) rows.push(row);
        row = [];
        cell = '';
      } else {
        cell += character;
      }
    }
    if (cell !== '' || row.length) {
      row.push(cell.trim());
      if (row.some((value) => value !== '')) rows.push(row);
    }

    if (rows.length < 2) throw new Error('文件中没有可导入的数据');
    const headerMap = {
      商品编号: 'productCode',
      商品编码: 'productCode',
      '商品名称（计量单位/品牌/规格）': 'productName',
      商品名称: 'productName',
      是否标品: 'standardProduct',
      计量单位: 'baseUnit',
      分包单位: 'packageUnit',
      分包规格: 'packageUnit',
      分包系数: 'packageQty',
      状态: 'status',
      启用状态: 'status',
      备注: 'remark'
    };
    const headers = rows.shift().map((header) => headerMap[header.replace(/\s/g, '')] || '');
    if (!headers.includes('productCode') || !headers.includes('packageUnit') || !headers.includes('packageQty')) {
      throw new Error('请使用分包规格导入模板CSV文件');
    }
    return rows.map((values) => headers.reduce((record, key, index) => {
      if (key) record[key] = values[index] || '';
      return record;
    }, {}));
  }

  async function importSpecsFromFile() {
    const fileInput = document.getElementById('sortingSpecImportFile');
    const resultElement = document.getElementById('sortingSpecImportResult');
    const file = fileInput?.files?.[0];
    if (!file) {
      state.importResult = '请选择需要导入的CSV文件';
      if (resultElement) resultElement.textContent = state.importResult;
      return;
    }
    if (!/\.csv$/i.test(file.name)) {
      state.importResult = '仅支持CSV格式文件，请下载模板后填写上传';
      if (resultElement) resultElement.textContent = state.importResult;
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      state.importResult = '文件大小不能超过10M';
      if (resultElement) resultElement.textContent = state.importResult;
      return;
    }

    try {
      const rows = parseCsv(await file.text());
      const importedCodes = new Set();
      const failures = [];
      let successCount = 0;
      const addFailure = (row, lineNumber, reason) => failures.push({ ...row, lineNumber, reason });
      rows.forEach((row, index) => {
        const lineNumber = index + 2;
        const productCode = String(row.productCode || '').trim();
        const product = productByCode(productCode);
        const packageUnit = String(row.packageUnit || '').trim();
        const packageQty = Number(String(row.packageQty || '').trim());
        if (!productCode || !product) {
          addFailure(row, lineNumber, '商品编号不存在');
          return;
        }
        if (importedCodes.has(productCode)) {
          addFailure(row, lineNumber, '商品编号重复');
          return;
        }
        if (!packageUnit) {
          addFailure(row, lineNumber, '分包单位不能为空');
          return;
        }
        if (!Number.isFinite(packageQty) || packageQty <= 0) {
          addFailure(row, lineNumber, '分包系数必须大于0');
          return;
        }
        const quantityDecimals = isStandardProduct(product) ? 0 : quantityDecimalPlaces();
        if (!hasQuantityPrecision(packageQty, quantityDecimals)) {
          addFailure(row, lineNumber, `分包系数最多填写${quantityDecimals}位小数`);
          return;
        }
        importedCodes.add(productCode);
        const status = ['停用', '禁用', 'DISABLE'].includes(String(row.status || '').trim()) ? 'DISABLE' : 'ENABLE';
        const existing = state.specs.find((spec) => spec.productCode === productCode);
        const payload = normalizeSpec({
          ...existing,
          id: existing?.id || nextId(),
          productCode,
          productName: product.name,
          packageName: `${formatNumber(packageQty)}${packageUnit}`,
          packageQty,
          packageUnit,
          baseUnit: product.unit || '',
          status,
          effectiveFrom: today(),
          updatedAt: currentDateTime(),
          remark: String(row.remark || '').trim()
        });
        if (existing) Object.assign(existing, payload);
        else state.specs.unshift(payload);
        successCount += 1;
      });

      if (successCount > 0) saveSpecs();
      state.importModal = false;
      state.importFileName = '';
      state.importResult = '';
      state.importResultModal = { successCount, failures };
      state.page = 1;
      render();
    } catch (error) {
      state.importResult = error.message || '文件读取失败';
      if (resultElement) resultElement.textContent = state.importResult;
    }
  }

  function nextId() {
    return `SPS-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;
  }

  function showToast(message, type = '') {
    let toast = document.querySelector('.sorting-spec-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'sorting-spec-toast';
      document.body.appendChild(toast);
    }
    window.clearTimeout(showToast.timer);
    toast.textContent = message;
    toast.classList.toggle('is-error', type === 'error');
    toast.classList.add('is-visible');
    showToast.timer = window.setTimeout(() => toast.classList.remove('is-visible'), 2400);
  }

  function buildProductRows() {
    const specsByProduct = new Map();
    state.specs.forEach((spec) => {
      const code = String(spec.productCode || '');
      if (!code) return;
      if (!specsByProduct.has(code)) specsByProduct.set(code, []);
      specsByProduct.get(code).push(spec);
    });

    return state.products.flatMap((product) => {
      const specs = specsByProduct.get(String(product.code)) || [];
      if (!specs.length) {
        return [{
          productCode: product.code,
          productName: product.name,
          baseUnit: product.unit || '',
          packageQty: '',
          packageUnit: '',
          status: '',
          effectiveFrom: '',
          id: '',
          sortingSpec: null
        }];
      }
      return specs.map((spec) => ({
        ...spec,
        productName: product.name,
        baseUnit: product.unit || spec.baseUnit || '',
        sortingSpec: spec
      }));
    });
  }

  function filteredSpecs() {
    const keyword = state.keyword.trim().toLowerCase();
    const packageUnit = String(state.packageUnit || '').trim();
    const rows = buildProductRows().filter((spec) => {
      const productNetVegetable = isNetVegetable(spec);
      const productStandard = isStandardProduct(spec);
      const keywordMatched = !keyword
        || [spec.productName, spec.productCode, spec.packageUnit].some((value) => String(value || '').toLowerCase().includes(keyword));
      const packageMatched = !packageUnit || spec.packageUnit === packageUnit;
      const netVegetableMatched = !state.netVegetable || String(productNetVegetable) === state.netVegetable;
      const standardProductMatched = !state.standardProduct || String(productStandard) === state.standardProduct;
      const statusMatched = !state.status
        || (state.status === 'PENDING' ? !spec.sortingSpec : spec.status === state.status);
      return keywordMatched && packageMatched && netVegetableMatched && standardProductMatched && statusMatched;
    });
    const statusRank = (spec) => {
      if (!spec.sortingSpec) return 2;
      return spec.status === 'ENABLE' ? 0 : 1;
    };
    const updatedTimestamp = (spec) => {
      if (!spec.sortingSpec || !spec.updatedAt) return 0;
      const timestamp = Date.parse(normalizeDateTime(spec.updatedAt));
      return Number.isFinite(timestamp) ? timestamp : 0;
    };
    return rows.sort((left, right) => {
      const rankDifference = statusRank(left) - statusRank(right);
      if (rankDifference !== 0) return rankDifference;
      return updatedTimestamp(right) - updatedTimestamp(left);
    });
  }

  function navigate(url) {
    if (window.AppNavigation?.navigate) window.AppNavigation.navigate(url);
    else window.location.href = url;
  }

  function openExportTemplate() {
    const exportKey = `sorting-spec-export-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const rows = filteredSpecs().map((row) => {
      const product = productByCode(row.productCode) || {};
      const hasSpec = Boolean(row.sortingSpec);
      return {
        id: row.id || '',
        productCode: row.productCode || '',
        productName: row.productName || product.name || '',
        productDisplay: productDisplay(row),
        brand: product.brand || '--',
        spec: product.spec || '--',
        isNetVegetable: isNetVegetable(row),
        isStandardProduct: isStandardProduct(row),
        baseUnit: product.unit || row.baseUnit || '',
        packageName: hasSpec ? row.packageName || `${formatNumber(row.packageQty)}${row.packageUnit || ''}` : '',
        packageQty: hasSpec ? row.packageQty : '',
        packageUnit: hasSpec ? row.packageUnit : '',
        status: hasSpec ? row.status : 'PENDING',
        effectiveFrom: hasSpec ? row.effectiveFrom : '',
        updatedAt: hasSpec ? row.updatedAt : '',
        remark: hasSpec ? row.remark : ''
      };
    });
    const payload = {
      version: '20260929-sorting-spec-export-template-1',
      exportedAt: currentDateTime(),
      rows,
      filters: {
        keyword: state.keyword,
        packageUnit: state.packageUnit,
        netVegetable: state.netVegetable,
        standardProduct: state.standardProduct,
        status: state.status
      }
    };
    const serializedPayload = JSON.stringify(payload);
    let query = `exportData=${encodeURIComponent(serializedPayload)}`;
    try {
      if (window.sessionStorage?.setItem) {
        window.sessionStorage.setItem(exportKey, serializedPayload);
        query = `exportKey=${encodeURIComponent(exportKey)}`;
      }
    } catch (error) { /* 临时缓存不可用时使用 URL 数据兜底。 */ }
    navigate(`./sorting-spec-export-template.html?${query}`);
  }

  function renderProductOptions(selectedCode) {
    return [`<option value="">请选择商品</option>`]
      .concat(state.products.map((product) => `<option value="${escapeHtml(product.code)}" ${product.code === selectedCode ? 'selected' : ''}>${escapeHtml(product.name)}（${escapeHtml(product.code)}）</option>`))
      .join('');
  }

  function productDisplay(spec) {
    const product = productByCode(spec.productCode);
    if (window.DomUtils?.formatProductDisplay) {
      return window.DomUtils.formatProductDisplay(product || spec, state.products);
    }
    return `${spec.productName || '--'}（${product?.unit || spec.baseUnit || '--'}/${product?.brand || '--'}/${product?.spec || '--'}）`;
  }

  function isNetVegetable(spec) {
    const value = productByCode(spec.productCode)?.isNetVegetable;
    return value === true || value === 'true' || value === '是' || value === 1 || value === '1';
  }

  function isStandardProduct(spec) {
    const product = productByCode(spec.productCode);
    const value = product?.isStandardProduct ?? product?.isStandard;
    return value === true || value === 'true' || value === '是' || value === 1 || value === '1';
  }

  function quantityDecimalPlacesFor(spec) {
    return isStandardProduct(spec) ? 0 : quantityDecimalPlaces();
  }

  function formatQuantity(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return '--';
    return String(number);
  }

  function hasQuantityPrecision(value, decimals) {
    const factor = 10 ** decimals;
    const scaled = Number(value) * factor;
    return Math.abs(scaled - Math.round(scaled)) < 1e-8;
  }

  function renderProductDisplay(spec) {
    const marker = isNetVegetable(spec)
      ? '<span class="sorting-spec-net-vegetable-tag">净菜</span>'
      : '';
    return `<span class="sorting-spec-product-display">${marker}<span class="sorting-spec-product-text">${escapeHtml(productDisplay(spec))}</span></span>`;
  }

  function renderTable(rows) {
    const tableHead = `<thead><tr>
      <th style="width:70px" class="text-center">序号</th>
      <th style="width:250px">商品名称（计量单位/品牌/规格）</th>
      <th style="width:130px">商品编号</th>
      <th style="width:90px">是否标品</th>
      <th style="width:100px">计量单位</th>
      <th style="width:130px">分包单位</th>
      <th style="width:160px">分包系数</th>
      <th style="width:100px">状态</th>
      <th style="width:180px">更新时间</th>
      <th style="width:180px">备注</th>
      <th style="width:210px">操作</th>
    </tr></thead>`;
    if (!rows.length) {
      return `<table class="sorting-spec-table">${tableHead}<tbody><tr><td class="empty-cell" colspan="11">暂无商品数据</td></tr></tbody></table>`;
    }
    return `<table class="sorting-spec-table">${tableHead}<tbody>${rows.map((row, index) => {
      const hasSpec = Boolean(row.sortingSpec);
      const status = hasSpec
        ? `<span class="sorting-spec-status ${row.status === 'ENABLE' ? 'is-enabled' : 'is-disabled'}">${row.status === 'ENABLE' ? '启用' : '停用'}</span>`
        : '<span class="sorting-spec-status is-pending">待启用</span>';
      const actions = hasSpec
        ? `<button type="button" class="btn-text" data-spec-action="edit" data-id="${escapeHtml(row.id)}">编辑</button><button type="button" class="btn-text" data-spec-action="toggle" data-id="${escapeHtml(row.id)}">${row.status === 'ENABLE' ? '停用' : '启用'}</button>`
        : `<button type="button" class="btn-text" data-spec-action="configure" data-product-code="${escapeHtml(row.productCode)}">设置</button>`;
      return `<tr>
        <td class="text-center">${(state.page - 1) * state.pageSize + index + 1}</td>
        <td>${renderProductDisplay(row)}</td>
        <td>${escapeHtml(row.productCode || '')}</td>
        <td>${isStandardProduct(row) ? '是' : '否'}</td>
        <td>${escapeHtml(productByCode(row.productCode)?.unit || row.baseUnit || '')}</td>
        <td>${escapeHtml(row.packageUnit || '')}</td>
        <td class="sorting-spec-quantity">${hasSpec ? formatQuantity(row.packageQty, row) : ''}</td>
        <td>${status}</td>
        <td>${escapeHtml(row.updatedAt || '')}</td>
        <td>${escapeHtml(row.remark || '')}</td>
        <td><div class="sorting-spec-actions">${actions}</div></td>
      </tr>`;
    }).join('')}</tbody></table>`;
  }

  function renderModal() {
    if (!state.modal) return '';
    const editing = state.modal.mode === 'edit';
    const record = editing
      ? state.specs.find((spec) => spec.id === state.modal.id)
      : state.modal.record;
    if (!record) return '';
    const product = productByCode(record.productCode);
    const baseUnit = product?.unit || record.baseUnit || '';
    const standardProduct = isStandardProduct(record);
    const quantityDecimals = quantityDecimalPlacesFor(record);
    const quantityStep = 10 ** -quantityDecimals;
    const quantityPlaceholder = '请输入分包系数';
    const packageUnit = record.packageUnit || '';
    const qtyHint = '表示1个分包单位对应多少商品计量单位，例如：1包=50斤。';
    return `<div class="sorting-spec-modal-backdrop" data-spec-modal-backdrop>
      <section class="sorting-spec-modal" role="dialog" aria-modal="true" aria-label="${editing ? '编辑分拣规格' : '设置分拣规格'}">
        <header class="sorting-spec-modal-header"><h2>${editing ? '编辑分拣规格' : '设置分拣规格'}</h2><button type="button" class="sorting-spec-modal-close" data-spec-close aria-label="关闭">×</button></header>
        <form data-spec-form data-mode="${editing ? 'edit' : 'create'}" data-id="${editing ? escapeHtml(record.id) : ''}">
          <div class="sorting-spec-modal-body"><div class="sorting-spec-form-grid">
            <div class="sorting-spec-form-field sorting-spec-form-readonly"><span>商品</span><span class="sorting-spec-form-readonly-value">${renderProductDisplay(record)}</span><input name="productCode" type="hidden" value="${escapeHtml(record.productCode)}"></div>
            <div class="sorting-spec-form-field sorting-spec-form-readonly"><span>是否标品</span><span class="sorting-spec-form-readonly-value">${standardProduct ? '是' : '否'}</span></div>
            <div class="sorting-spec-form-field sorting-spec-form-readonly"><span>计量单位</span><span class="sorting-spec-form-readonly-value">${escapeHtml(baseUnit)}</span></div>
            <label class="sorting-spec-form-field sorting-spec-form-half"><span class="required">分包单位</span><select name="packageUnit" data-price-placeholder="请选择规格单位" data-price-empty="${!record.packageUnit}">${renderPackageUnitOptions(record.packageUnit)}</select></label>
            <label class="sorting-spec-form-field sorting-spec-form-half sorting-spec-qty-field"><span class="required">分包系数</span><div class="sorting-spec-qty-wrap"><input name="packageQty" type="number" min="${quantityStep}" step="${quantityStep}" value="${record.packageQty || ''}" placeholder="${quantityPlaceholder}"><small class="sorting-spec-qty-hint">${qtyHint}</small></div></label>
            <div class="sorting-spec-form-field"><span>启用状态</span><label class="sorting-spec-status-switch switch-control"><input class="switch-input" name="status" type="checkbox" value="ENABLE" ${record.status === 'ENABLE' ? 'checked' : ''} aria-label="启用状态"><span class="switch-slider" aria-hidden="true"></span></label></div>
            <div class="sorting-spec-form-field sorting-spec-form-remark"><span>备注</span><div class="sorting-spec-remark-wrap"><textarea name="remark" maxlength="100" placeholder="请输入备注" data-remark-counter>${escapeHtml(record.remark)}</textarea><span class="sorting-spec-remark-counter">${String(record.remark || '').length}/100</span></div></div>
          </div></div>
          <footer class="sorting-spec-modal-footer"><button type="button" class="btn" data-spec-close>取消</button><button type="submit" class="btn btn-primary">保存</button></footer>
        </form>
      </section>
    </div>`;
  }

  function renderImportModal() {
    const visible = state.importModal ? ' is-visible' : '';
    return `<div class="unshelf-modal sorting-spec-import-modal${visible}" id="sortingSpecImportModal" aria-hidden="${String(!state.importModal)}">
      <div class="unshelf-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="sortingSpecImportTitle">
        <div class="unshelf-modal-header"><h2 id="sortingSpecImportTitle">批量导入分包规格</h2><button class="unshelf-modal-close" type="button" data-spec-action="close-import" aria-label="关闭">×</button></div>
        <div class="unshelf-modal-body">
          <div class="market-price-import-section sorting-spec-import-section">
            <label class="unshelf-reason-label">模版</label>
            <div class="sorting-spec-import-template-row"><a href="./market-price-import-template.html?type=sorting-spec" class="market-price-import-template-link">分包规格导入模板.csv</a><button class="btn-text" type="button" data-spec-action="download-template">下载</button></div>
          </div>
          <div class="market-price-import-section sorting-spec-import-section">
            <label class="unshelf-reason-label">上传文件</label>
            <div class="market-price-import-upload"><button class="btn btn-sm btn-blue" type="button" data-spec-action="trigger-import-upload">上传</button><input type="file" id="sortingSpecImportFile" accept=".csv,text/csv" hidden><span class="market-price-import-upload-hint">只能上传CSV文件，且不超过10M</span></div>
            <span class="market-price-import-filename" id="sortingSpecImportFileName">${escapeHtml(state.importFileName)}</span>
            <div class="sorting-spec-import-result" id="sortingSpecImportResult" role="status">${escapeHtml(state.importResult)}</div>
          </div>
        </div>
        <div class="unshelf-modal-actions"><button class="btn" type="button" data-spec-action="close-import">取消</button><button class="btn btn-primary" type="button" data-spec-action="confirm-import">导入</button></div>
      </div>
    </div>`;
  }

  function renderImportResultModal() {
    const result = state.importResultModal;
    const visible = result ? ' is-visible' : '';
    const successCount = result?.successCount || 0;
    const failures = result?.failures || [];
    const failureCount = failures.length;
    const previewCount = Math.min(failureCount, 4);
    const preview = failures.slice(0, previewCount).map((failure) => `<li>第${failure.lineNumber}行：${escapeHtml(failure.reason)}</li>`).join('');
    return `<div class="unshelf-modal sorting-spec-import-result-modal${visible}" id="sortingSpecImportResultModal" aria-hidden="${String(!result)}">
      <div class="unshelf-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="sortingSpecImportResultTitle">
        <div class="unshelf-modal-header"><h2 id="sortingSpecImportResultTitle">导入结果</h2><button class="unshelf-modal-close" type="button" data-spec-action="close-import-result" aria-label="关闭">×</button></div>
        <div class="unshelf-modal-body">
          <div class="sorting-spec-import-result-summary">
            <div class="sorting-spec-import-result-stat is-success"><span>成功导入</span><strong>${successCount}</strong><em>条</em></div>
            <div class="sorting-spec-import-result-stat ${failureCount ? 'is-failure' : 'is-success'}"><span>导入失败</span><strong>${failureCount}</strong><em>条</em></div>
          </div>
          ${failureCount ? `<div class="sorting-spec-import-result-failures"><div class="sorting-spec-import-result-failures-title">失败原因</div><ul>${preview}</ul>${failureCount > previewCount ? '<p>其余失败记录请下载失败模板查看。</p>' : ''}</div><button class="btn-text sorting-spec-import-result-download" type="button" data-spec-action="download-import-failures">下载失败模板</button>` : '<p class="sorting-spec-import-result-success-tip">本次文件已全部导入成功。</p>'}
        </div>
        <div class="unshelf-modal-actions"><button class="btn" type="button" data-spec-action="close-import-result">关闭</button>${failureCount ? '<button class="btn btn-primary" type="button" data-spec-action="continue-import">继续上传</button>' : ''}</div>
      </div>
    </div>`;
  }

  function render() {
    if (!window.__sortingSpecPageRoot) return;
    const matched = filteredSpecs();
    const totalPages = Math.max(1, Math.ceil(matched.length / state.pageSize));
    state.page = Math.min(Math.max(1, state.page), totalPages);
    const rows = matched.slice((state.page - 1) * state.pageSize, state.page * state.pageSize);
    state.pagination?.destroy?.();
    window.__sortingSpecPageRoot.innerHTML = `<section class="sorting-spec-page page-card">
      <form class="sorting-spec-filter" data-spec-filter><div class="sorting-spec-filter-fields">
        <label class="sorting-spec-field"><span class="filter-label">商品名称/编号</span><input class="filter-input" name="keyword" value="${escapeHtml(state.keyword)}" placeholder="请输入商品名称或编号"></label>
        <label class="sorting-spec-field"><span class="filter-label">分包单位</span><select class="filter-select" name="packageUnit">${renderPackageUnitOptions(state.packageUnit, true)}</select></label>
        <label class="sorting-spec-field"><span class="filter-label">是否净菜</span><select class="filter-select" name="netVegetable"><option value="">全部</option><option value="true" ${state.netVegetable === 'true' ? 'selected' : ''}>是</option><option value="false" ${state.netVegetable === 'false' ? 'selected' : ''}>否</option></select></label>
        <label class="sorting-spec-field"><span class="filter-label">是否标品</span><select class="filter-select" name="standardProduct"><option value="">全部</option><option value="true" ${state.standardProduct === 'true' ? 'selected' : ''}>是</option><option value="false" ${state.standardProduct === 'false' ? 'selected' : ''}>否</option></select></label>
        <label class="sorting-spec-field"><span class="filter-label">启用状态</span><select class="filter-select" name="status"><option value="">全部</option><option value="ENABLE" ${state.status === 'ENABLE' ? 'selected' : ''}>启用</option><option value="DISABLE" ${state.status === 'DISABLE' ? 'selected' : ''}>停用</option><option value="PENDING" ${state.status === 'PENDING' ? 'selected' : ''}>待启用</option></select></label>
      </div><div class="sorting-spec-filter-actions"><span class="sorting-spec-advanced-filter-slot" aria-hidden="true"></span><button type="submit" class="btn btn-primary">查询</button><button type="button" class="btn" data-spec-action="reset">重置</button></div></form>
      <div class="action-bar sorting-spec-action-bar"><div class="action-main"><button class="btn btn-sm btn-action btn-blue" type="button" data-spec-action="open-import">批量导入</button></div><div class="sorting-spec-action-side"><button class="btn btn-sm standard-list-export-print sorting-spec-export-action" type="button" data-spec-action="export">${downloadIcon}导出</button></div></div>
      <div class="sorting-spec-table-wrap">${renderTable(rows)}</div>
      <div id="sortingSpecPagination" class="sorting-spec-pagination"></div>
      ${renderModal()}
      ${renderImportModal()}
      ${renderImportResultModal()}
    </section>`;
    const paginationRoot = window.__sortingSpecPageRoot.querySelector('#sortingSpecPagination');
    if (window.Pagination?.create && paginationRoot) {
      state.pagination = window.Pagination.create({
        container: paginationRoot,
        page: state.page,
        pageSize: state.pageSize,
        total: matched.length,
        pageSizeOptions: [10, 20, 50],
        showArrows: true,
        onChange: ({ page, pageSize }) => {
          state.page = page;
          state.pageSize = pageSize;
          render();
        }
      });
    }
    if (state.modal) {
      window.PriceSelectPlaceholder?.apply?.(window.__sortingSpecPageRoot);
      window.setTimeout(() => {
        const focusTarget = window.__sortingSpecPageRoot.querySelector('[data-spec-focus]');
        focusTarget?.focus();
      }, 0);
    }
  }

  function openCreate(productCode = '') {
    const product = productByCode(productCode) || state.products[0];
    state.modal = {
      mode: 'create',
      record: normalizeSpec({
        id: nextId(),
        productCode: product?.code || '',
        productName: product?.name || '',
        packageName: '',
        packageQty: '',
        packageUnit: '',
        baseUnit: product?.unit || '',
        status: 'ENABLE',
        effectiveFrom: today(),
        remark: ''
      })
    };
    render();
  }

  function openEdit(id) {
    const record = state.specs.find((spec) => spec.id === id);
    if (!record) return showToast('记录不存在或已删除', 'error');
    state.modal = { mode: 'edit', id };
    render();
  }

  function toggleSpec(id) {
    const record = state.specs.find((spec) => spec.id === id);
    if (!record) return showToast('记录不存在或已删除', 'error');
    record.status = record.status === 'ENABLE' ? 'DISABLE' : 'ENABLE';
    saveSpecs();
    render();
    showToast(record.status === 'ENABLE' ? '规格已启用' : '规格已停用');
  }

  function saveForm(form) {
    const mode = form.dataset.mode;
    const id = form.dataset.id;
    const existing = mode === 'edit' ? state.specs.find((spec) => spec.id === id) : null;
    if (mode === 'edit' && !existing) return showToast('记录不存在或已删除', 'error');
    const productCode = form.elements.productCode?.value || '';
    const product = productByCode(productCode);
    const packageQty = Number(form.elements.packageQty?.value);
    const packageUnit = form.elements.packageUnit?.value || '';
    const standardProduct = isStandardProduct({ productCode });
    const quantityDecimals = standardProduct ? 0 : quantityDecimalPlaces();
    const statusControl = form.elements.status;
    const status = statusControl?.type === 'checkbox'
      ? (statusControl.checked ? 'ENABLE' : 'DISABLE')
      : (statusControl?.value === 'DISABLE' ? 'DISABLE' : 'ENABLE');
    const remark = String(form.elements.remark?.value || '').trim();
    if (!productCode || !product) return showToast('请选择商品', 'error');
    if (!Number.isFinite(packageQty) || packageQty <= 0) return showToast('分包系数必须大于0', 'error');
    if (!hasQuantityPrecision(packageQty, quantityDecimals)) {
      return showToast(standardProduct ? '标品分包系数只能填写整数' : `分包系数最多填写${quantityDecimals}位小数`, 'error');
    }
    if (!packageUnit) return showToast('请选择分包规格', 'error');
    const duplicate = state.specs.some((spec) => spec.id !== id
      && spec.status === 'ENABLE'
      && spec.productCode === productCode
      && Number(spec.packageQty) === packageQty
      && spec.packageUnit === packageUnit);
    if (duplicate) return showToast('该商品已存在相同的启用规格', 'error');
    const payload = {
      productCode,
      productName: product.name,
      packageName: `${formatQuantity(packageQty, { productCode })}${packageUnit}`,
      packageQty,
      packageUnit,
      baseUnit: product.unit || existing?.baseUnit || '',
      status,
      updatedAt: currentDateTime(),
      remark
    };
    if (existing) Object.assign(existing, normalizeSpec({ ...existing, ...payload }));
    else state.specs.unshift(normalizeSpec({ ...payload, id: nextId() }));
    saveSpecs();
    state.modal = null;
    state.page = 1;
    render();
    showToast(mode === 'edit' ? '保存成功' : '设置成功');
  }

  function bindEvents(root) {
    root.addEventListener('submit', (event) => {
      const filter = event.target.closest('[data-spec-filter]');
      if (filter) {
        event.preventDefault();
        state.keyword = String(filter.elements.keyword?.value || '').trim();
        state.packageUnit = filter.elements.packageUnit?.value || '';
        state.netVegetable = filter.elements.netVegetable?.value || '';
        state.standardProduct = filter.elements.standardProduct?.value || '';
        state.status = filter.elements.status?.value || '';
        state.page = 1;
        render();
        return;
      }
      const form = event.target.closest('[data-spec-form]');
      if (form) {
        event.preventDefault();
        saveForm(form);
      }
    });

    root.addEventListener('click', (event) => {
      const actionButton = event.target.closest('[data-spec-action]');
      if (actionButton) {
        const action = actionButton.dataset.specAction;
        const id = actionButton.dataset.id;
        if (action === 'add') openCreate();
        if (action === 'open-import') {
          state.modal = null;
          state.importModal = true;
          state.importResultModal = null;
          state.importFileName = '';
          state.importResult = '';
          render();
        }
        if (action === 'export') openExportTemplate();
        if (action === 'close-import') {
          state.importModal = false;
          state.importFileName = '';
          state.importResult = '';
          render();
        }
        if (action === 'close-import-result') {
          state.importResultModal = null;
          render();
        }
        if (action === 'continue-import') {
          state.importResultModal = null;
          state.importModal = true;
          state.importFileName = '';
          state.importResult = '';
          render();
        }
        if (action === 'trigger-import-upload') document.getElementById('sortingSpecImportFile')?.click();
        if (action === 'download-template') downloadImportTemplate();
        if (action === 'download-import-failures') downloadImportFailures();
        if (action === 'confirm-import') importSpecsFromFile();
        if (action === 'reset') {
          state.keyword = '';
          state.packageUnit = '';
          state.netVegetable = '';
          state.standardProduct = '';
          state.status = '';
          state.page = 1;
          render();
        }
        if (action === 'edit') openEdit(id);
        if (action === 'configure') openCreate(actionButton.dataset.productCode || '');
        if (action === 'toggle') toggleSpec(id);
        return;
      }
      if (event.target.closest('[data-spec-close]') || event.target.matches('[data-spec-modal-backdrop]')) {
        state.modal = null;
        render();
      }
    });

    root.addEventListener('change', (event) => {
      if (event.target.matches('#sortingSpecImportFile')) {
        const file = event.target.files?.[0];
        const nameElement = document.getElementById('sortingSpecImportFileName');
        if (!file) return;
        if (!/\.csv$/i.test(file.name)) {
          state.importFileName = '';
          state.importResult = '仅支持CSV格式文件，请下载模板后填写上传';
          event.target.value = '';
        } else if (file.size > 10 * 1024 * 1024) {
          state.importFileName = '';
          state.importResult = '文件大小不能超过10M';
          event.target.value = '';
        } else {
          state.importFileName = file.name;
          state.importResult = '';
        }
        if (nameElement) nameElement.textContent = state.importFileName;
        const resultElement = document.getElementById('sortingSpecImportResult');
        if (resultElement) resultElement.textContent = state.importResult;
        return;
      }
      const form = event.target.closest('[data-spec-form]');
      if (!form) return;
      if (event.target.matches('[data-spec-product]')) {
        const product = productByCode(event.target.value);
        if (form.elements.baseUnit) form.elements.baseUnit.value = product?.unit || '';
      }
    });

    root.addEventListener('input', (event) => {
      if (event.target.matches('[data-remark-counter]')) {
        const counter = event.target.parentElement.querySelector('.sorting-spec-remark-counter');
        if (counter) counter.textContent = `${event.target.value.length}/100`;
      }
    });

    root.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && state.modal) {
        state.modal = null;
        render();
        return;
      }
      if (event.key === 'Escape' && state.importModal) {
        state.importModal = false;
        state.importFileName = '';
        state.importResult = '';
        render();
        return;
      }
      if (event.key === 'Escape' && state.importResultModal) {
        state.importResultModal = null;
        render();
      }
    });
  }

  async function mount() {
    state.products = (window.ProductService?.getList?.() || []).filter((product) => product?.code && product?.name);
    state.products.sort((a, b) => String(a.name).localeCompare(String(b.name), 'zh-CN'));
    state.specs = readSpecs();
    state.packageUnits = await loadPackageUnits();
    const shell = window.AppShell.mount({
      title: '分拣规格',
      content: '<div id="sortingSpecPageRoot"></div>',
      variant: 'enterprise'
    });
    const pageRoot = shell.querySelector('#sortingSpecPageRoot');
    window.__sortingSpecPageRoot = pageRoot;
    bindEvents(shell);
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})();
