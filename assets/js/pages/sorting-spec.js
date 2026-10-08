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
  const xlsxMimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const xlsxTemplatePath = './assets/templates/分包规格导入模板.xlsx';

  function xmlEscape(value) {
    return String(value ?? '')
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function xlsxColumnName(index) {
    let name = '';
    let value = index + 1;
    while (value > 0) {
      const remainder = (value - 1) % 26;
      name = String.fromCharCode(65 + remainder) + name;
      value = Math.floor((value - 1) / 26);
    }
    return name;
  }

  function xlsxCrc32(bytes) {
    let checksum = 0xFFFFFFFF;
    bytes.forEach((byte) => {
      checksum ^= byte;
      for (let bit = 0; bit < 8; bit += 1) {
        checksum = (checksum >>> 1) ^ ((checksum & 1) ? 0xEDB88320 : 0);
      }
    });
    return (checksum ^ 0xFFFFFFFF) >>> 0;
  }

  function createStoredZip(entries) {
    const encoder = new TextEncoder();
    const localParts = [];
    const centralParts = [];
    let localOffset = 0;

    entries.forEach(({ name, content }) => {
      const nameBytes = encoder.encode(name);
      const dataBytes = encoder.encode(content);
      const checksum = xlsxCrc32(dataBytes);
      const localHeader = new Uint8Array(30 + nameBytes.length);
      const localView = new DataView(localHeader.buffer);
      localView.setUint32(0, 0x04034B50, true);
      localView.setUint16(4, 20, true);
      localView.setUint16(6, 0x0800, true);
      localView.setUint16(8, 0, true);
      localView.setUint32(14, checksum, true);
      localView.setUint32(18, dataBytes.length, true);
      localView.setUint32(22, dataBytes.length, true);
      localView.setUint16(26, nameBytes.length, true);
      localView.setUint16(28, 0, true);
      localHeader.set(nameBytes, 30);
      localParts.push(localHeader, dataBytes);

      const centralHeader = new Uint8Array(46 + nameBytes.length);
      const centralView = new DataView(centralHeader.buffer);
      centralView.setUint32(0, 0x02014B50, true);
      centralView.setUint16(4, 20, true);
      centralView.setUint16(6, 20, true);
      centralView.setUint16(8, 0x0800, true);
      centralView.setUint16(10, 0, true);
      centralView.setUint32(16, checksum, true);
      centralView.setUint32(20, dataBytes.length, true);
      centralView.setUint32(24, dataBytes.length, true);
      centralView.setUint16(28, nameBytes.length, true);
      centralView.setUint16(30, 0, true);
      centralView.setUint16(32, 0, true);
      centralView.setUint16(34, 0, true);
      centralView.setUint32(38, 0, true);
      centralView.setUint32(42, localOffset, true);
      centralHeader.set(nameBytes, 46);
      centralParts.push(centralHeader);

      localOffset += localHeader.length + dataBytes.length;
    });

    const centralSize = centralParts.reduce((total, part) => total + part.length, 0);
    const endRecord = new Uint8Array(22);
    const endView = new DataView(endRecord.buffer);
    endView.setUint32(0, 0x06054B50, true);
    endView.setUint16(8, entries.length, true);
    endView.setUint16(10, entries.length, true);
    endView.setUint32(12, centralSize, true);
    endView.setUint32(16, localOffset, true);
    return new Blob([...localParts, ...centralParts, endRecord], { type: xlsxMimeType });
  }

  function createXlsxBlob(rows) {
    const rowCount = Math.max(rows.length, 1);
    const columnCount = Math.max(rows.reduce((max, row) => Math.max(max, row.length), 0), 1);
    const lastCell = `${xlsxColumnName(columnCount - 1)}${rowCount}`;
    const rowXml = rows.map((row, rowIndex) => `<row r="${rowIndex + 1}">${row.map((value, columnIndex) => {
      const cellRef = `${xlsxColumnName(columnIndex)}${rowIndex + 1}`;
      return `<c r="${cellRef}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;
    }).join('')}</row>`).join('');
    const worksheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${lastCell}"/><sheetData>${rowXml}</sheetData></worksheet>`;
    const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="分包规格" sheetId="1" r:id="rId1"/></sheets></workbook>`;
    const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`;
    const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="/xl/workbook.xml"/></Relationships>`;
    const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`;
    return createStoredZip([
      { name: '[Content_Types].xml', content: contentTypesXml },
      { name: '_rels/.rels', content: rootRelsXml },
      { name: 'xl/workbook.xml', content: workbookXml },
      { name: 'xl/_rels/workbook.xml.rels', content: workbookRelsXml },
      { name: 'xl/worksheets/sheet1.xml', content: worksheetXml }
    ]);
  }

  function downloadImportFailures() {
    const failures = state.importResultModal?.failures || [];
    if (!failures.length) return;
    const rows = [
      [...importTemplateHeaders, '失败原因'],
      ...failures.map((failure) => [
        failure.productCode,
        failure.productName,
        failure.standardProduct,
        failure.baseUnit,
        failure.packageUnit,
        failure.packageQty,
        failure.status,
        failure.remark,
        failure.reason
      ])
    ];
    const blob = createXlsxBlob(rows);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = '分包规格导入失败模板.xlsx';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function excelColumnIndex(reference) {
    const letters = String(reference || '').match(/^[A-Z]+/i)?.[0] || '';
    return letters.toUpperCase().split('').reduce((index, letter) => index * 26 + letter.charCodeAt(0) - 64, 0) - 1;
  }

  function readZipEntries(bytes) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const minOffset = Math.max(0, bytes.byteLength - 65557);
    let endOffset = -1;
    for (let offset = bytes.byteLength - 22; offset >= minOffset; offset -= 1) {
      if (view.getUint32(offset, true) === 0x06054B50) {
        endOffset = offset;
        break;
      }
    }
    if (endOffset < 0) throw new Error('无法读取XLSX文件');

    const entryCount = view.getUint16(endOffset + 10, true);
    const centralOffset = view.getUint32(endOffset + 16, true);
    const decoder = new TextDecoder();
    const entries = new Map();
    let offset = centralOffset;
    for (let index = 0; index < entryCount; index += 1) {
      if (view.getUint32(offset, true) !== 0x02014B50) throw new Error('XLSX文件结构不正确');
      const nameLength = view.getUint16(offset + 28, true);
      const extraLength = view.getUint16(offset + 30, true);
      const commentLength = view.getUint16(offset + 32, true);
      const name = decoder.decode(bytes.slice(offset + 46, offset + 46 + nameLength));
      const localHeaderOffset = view.getUint32(offset + 42, true);
      const localNameLength = view.getUint16(localHeaderOffset + 26, true);
      const localExtraLength = view.getUint16(localHeaderOffset + 28, true);
      entries.set(name, {
        compression: view.getUint16(offset + 10, true),
        compressedSize: view.getUint32(offset + 20, true),
        dataOffset: localHeaderOffset + 30 + localNameLength + localExtraLength
      });
      offset += 46 + nameLength + extraLength + commentLength;
    }
    return { bytes, entries };
  }

  async function readXlsxEntry(zip, name) {
    const entry = zip.entries.get(name);
    if (!entry) return null;
    const compressed = zip.bytes.slice(entry.dataOffset, entry.dataOffset + entry.compressedSize);
    if (entry.compression === 0) return compressed;
    if (entry.compression !== 8 || typeof DecompressionStream !== 'function') {
      throw new Error('当前浏览器不支持读取该XLSX文件，请使用最新版浏览器');
    }
    const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  function parseXlsxXml(xmlText) {
    const xml = new DOMParser().parseFromString(xmlText, 'application/xml');
    if (xml.getElementsByTagName('parsererror').length) throw new Error('XLSX文件内容无法解析');
    return xml;
  }

  function xlsxElements(node, localName) {
    if (typeof node?.getElementsByTagNameNS === 'function') {
      return Array.from(node.getElementsByTagNameNS('*', localName));
    }
    return Array.from(node?.getElementsByTagName?.(localName) || []);
  }

  async function parseXlsx(file) {
    const encoder = new TextDecoder();
    const zip = readZipEntries(new Uint8Array(await file.arrayBuffer()));
    const workbookXml = parseXlsxXml(encoder.decode(await readXlsxEntry(zip, 'xl/workbook.xml')));
    const workbookRelsXml = parseXlsxXml(encoder.decode(await readXlsxEntry(zip, 'xl/_rels/workbook.xml.rels')));
    const sheet = xlsxElements(workbookXml, 'sheet')[0];
    const relationshipId = sheet?.getAttribute('r:id');
    const relationship = xlsxElements(workbookRelsXml, 'Relationship').find((item) => item.getAttribute('Id') === relationshipId);
    const target = relationship?.getAttribute('Target');
    if (!target) throw new Error('XLSX文件中没有可读取的工作表');
    const sheetPath = target.replace(/^\//, '').replace(/^xl\//, '').replace(/^/, 'xl/');
    const sheetXml = parseXlsxXml(encoder.decode(await readXlsxEntry(zip, sheetPath)));
    const sharedStrings = [];
    const sharedStringsBytes = await readXlsxEntry(zip, 'xl/sharedStrings.xml');
    if (sharedStringsBytes) {
      const sharedStringsXml = parseXlsxXml(encoder.decode(sharedStringsBytes));
      xlsxElements(sharedStringsXml, 'si').forEach((item) => {
        sharedStrings.push(xlsxElements(item, 't').map((textNode) => textNode.textContent || '').join(''));
      });
    }

    return xlsxElements(sheetXml, 'row').map((rowNode) => {
      const values = [];
      xlsxElements(rowNode, 'c').forEach((cellNode) => {
        const cellIndex = excelColumnIndex(cellNode.getAttribute('r'));
        const type = cellNode.getAttribute('t');
        const valueNode = xlsxElements(cellNode, 'v')[0];
        let value = valueNode?.textContent || '';
        if (type === 'inlineStr') value = xlsxElements(cellNode, 't').map((textNode) => textNode.textContent || '').join('');
        if (type === 's') value = sharedStrings[Number(value)] || '';
        if (type === 'b') value = value === '1' ? '是' : '否';
        values[cellIndex] = value;
      });
      return values.map((value) => value ?? '');
    }).filter((row) => row.some((value) => String(value).trim() !== ''));
  }

  function parseImportRows(rows) {
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
    const headers = rows[0].map((header) => headerMap[String(header || '').replace(/\s/g, '')] || '');
    if (!headers.includes('productCode') || !headers.includes('packageUnit') || !headers.includes('packageQty')) {
      throw new Error('请使用分包规格导入模板XLSX文件');
    }
    return rows.slice(1).map((values) => headers.reduce((record, key, index) => {
      if (key) record[key] = values[index] || '';
      return record;
    }, {}));
  }

  async function importSpecsFromFile() {
    const fileInput = document.getElementById('sortingSpecImportFile');
    const resultElement = document.getElementById('sortingSpecImportResult');
    const file = fileInput?.files?.[0];
    if (!file) {
      state.importResult = '请选择需要导入的XLSX文件';
      if (resultElement) resultElement.textContent = state.importResult;
      return;
    }
    if (!/\.xlsx$/i.test(file.name)) {
      state.importResult = '仅支持XLSX格式文件，请下载模板后填写上传';
      if (resultElement) resultElement.textContent = state.importResult;
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      state.importResult = '文件大小不能超过10M';
      if (resultElement) resultElement.textContent = state.importResult;
      return;
    }

    try {
      const rows = parseImportRows(await parseXlsx(file));
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
            <div class="sorting-spec-import-template-row"><a href="${xlsxTemplatePath}" download="分包规格导入模板.xlsx" class="market-price-import-template-link">分包规格导入模板.xlsx</a></div>
          </div>
          <div class="market-price-import-section sorting-spec-import-section">
            <label class="unshelf-reason-label">上传文件</label>
            <div class="market-price-import-upload"><button class="btn btn-sm btn-blue" type="button" data-spec-action="trigger-import-upload">上传</button><input type="file" id="sortingSpecImportFile" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden><span class="market-price-import-upload-hint">只能上传xlsx文件，且不超过10M</span></div>
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
        if (!/\.xlsx$/i.test(file.name)) {
          state.importFileName = '';
          state.importResult = '仅支持XLSX格式文件，请下载模板后填写上传';
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
