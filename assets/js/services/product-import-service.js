(function () {
  const text = (value) => String(value ?? '').normalize('NFKC').trim();
  const header = (value) => text(value).replace(/^[*＊]/, '').toLowerCase();
  const productKey = (row) => JSON.stringify([text(row.name), text(row.brand), text(row.unit)]);
  const yes = (value) => text(value) === '是';
  const numericFields = new Set(['auxiliaryRate1', 'marketPrice1', 'auxiliaryRate2', 'marketPrice2', 'marketPrice',
    'kgConversionRate', 'netContent', 'shelfLife', 'warningDays']);

  function parse(data) {
    if (!window.XLSX) throw new Error('Excel组件未加载，请刷新页面后重试');
    const bytes = new Uint8Array(data);
    if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new Error('文件不是有效的xlsx文件，请使用商品导入模板');
    let book;
    try { book = window.XLSX.read(data, { type: 'array', cellFormula: false }); }
    catch (error) { throw new Error('无法读取Excel文件，请检查文件是否损坏或加密'); }
    const sheet = book.Sheets[book.SheetNames[0]];
    if (!sheet) throw new Error('Excel文件没有工作表');
    const rows = window.XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false, blankrows: true });
    const headerIndex = rows.findIndex((row) => row.some((value) => header(value) === '商品名称') && row.some((value) => header(value) === '计量单位'));
    if (headerIndex < 0) throw new Error('未找到商品模板表头，请使用商品导入模板');
    const kingdee = header(rows[headerIndex][0]) === '金蝶商品id';
    const fields = window.ProductImportFields.forType(kingdee);
    const columns = rows[headerIndex];
    if (!fields.every((field, index) => header(columns[index]) === header(field[1]))
      || columns.slice(fields.length).some((value) => text(value) && header(value) !== '错误原因')) {
      throw new Error('模板字段或顺序不正确，请使用最新的商品导入模板');
    }
    const records = rows.slice(headerIndex + 1).map((values, index) => {
      const original = fields.map((field, column) => values[column] ?? '');
      return { rowNumber: headerIndex + index + 2, values: original,
        data: Object.fromEntries(fields.map(([key], column) => {
          const cell = sheet[window.XLSX.utils.encode_cell({ r: headerIndex + index + 1, c: column })];
          return [key, text(numericFields.has(key) && cell?.t === 'n' ? cell.v : original[column])];
        })) };
    }).filter((record) => record.values.some((value) => text(value)));
    if (!records.length) throw new Error('文件中没有可导入的商品数据');
    return { kingdee, fields, records };
  }

  function validate(row, fields, kingdee) {
    const reasons = fields.filter(([key, label]) => label.startsWith('*') && !row[key])
      .map(([, label]) => `${label.slice(1)}不能为空`);
    if (kingdee && !row.kingdeeProductId) reasons.push('金蝶商品id不能为空');
    if (row.purchaseType && !['供应商送货', '市场自采', '企业自加工'].includes(row.purchaseType)) reasons.push('采购类型必须为供应商送货、市场自采或企业自加工');
    if (row.storageCondition && !['冷冻', '冷藏', '常温'].includes(row.storageCondition)) reasons.push('储存条件必须为冷冻、冷藏或常温');
    ['multiUnitEnabled', 'isWeighed', 'shelfLifeEnabled'].forEach((key) => {
      if (row[key] && !['是', '否'].includes(row[key])) reasons.push(`${fields.find((field) => field[0] === key)[1].replace('*', '')}必须为是或否`);
    });
    ['marketPrice', 'marketPrice1', 'marketPrice2', 'netContent', 'warningDays', 'shelfLife'].forEach((key) => {
      if (row[key] && (!Number.isFinite(Number(row[key])) || Number(row[key]) < 0)) reasons.push(`${fields.find((field) => field[0] === key)[1].replace('*', '')}必须为非负数`);
    });
    ['auxiliaryRate1', 'auxiliaryRate2', 'kgConversionRate'].forEach((key) => {
      if (row[key] && (!Number.isFinite(Number(row[key])) || Number(row[key]) <= 0)) reasons.push(`${fields.find((field) => field[0] === key)[1]}必须大于0`);
    });
    if (yes(row.multiUnitEnabled) && (!row.auxiliaryUnit1 || !row.auxiliaryRate1)) reasons.push('启用多单位时请填写辅助单位1及换算率');
    if (yes(row.shelfLifeEnabled) && (!row.shelfLife || !row.shelfLifeUnit)) reasons.push('设置保质期时请填写保质期和保质期单位');
    return reasons;
  }

  function productData(row) {
    return { ...row, marketPrice: Number(row.marketPrice), correspondingFood: row.ingredient,
      multiUnit: yes(row.multiUnitEnabled), multiUnitName1: row.auxiliaryUnit1, multiUnitRate1: row.auxiliaryRate1,
      multiUnitPrice1: row.marketPrice1, multiUnitName2: row.auxiliaryUnit2, multiUnitRate2: row.auxiliaryRate2,
      multiUnitPrice2: row.marketPrice2, indicatorDescription: row.description, conversionRate: row.kgConversionRate,
      qualificationCertificate: row.certificate, isWeighed: yes(row.isWeighed), shelfLifeEnabled: yes(row.shelfLifeEnabled),
      shelfLifeValue: row.shelfLife, shelfLife: yes(row.shelfLifeEnabled) ? `${row.shelfLife}${row.shelfLifeUnit}` : '',
      shelfLifeWarning: row.warningDays, expiryCalculationMethod: row.expiryMethod };
  }

  function importData(data) {
    const parsed = parse(data);
    const existing = window.ProductService.getList();
    const ids = new Set(existing.map((row) => text(row.kingdeeProductId)).filter(Boolean));
    const keys = new Set(existing.map(productKey));
    const result = { kingdee: parsed.kingdee, fields: parsed.fields, added: 0, errors: [] };
    parsed.records.forEach((record) => {
      const row = record.data;
      const reasons = validate(row, parsed.fields, parsed.kingdee);
      if (parsed.kingdee ? row.kingdeeProductId && ids.has(row.kingdeeProductId) : keys.has(productKey(row))) {
        reasons.push(parsed.kingdee ? '金蝶商品id重复' : '商品重复：商品名称、品牌、计量单位相同');
      }
      if (!reasons.length) {
        try {
          window.ProductService.create(productData(row));
          result.added++;
          if (row.kingdeeProductId) ids.add(row.kingdeeProductId);
          keys.add(productKey(row));
        } catch (error) { reasons.push(error.message || '商品保存失败'); }
      }
      if (reasons.length) result.errors.push({ values: record.values, reason: [...new Set(reasons)].join('；'), rowNumber: record.rowNumber });
    });
    return result;
  }

  function errorWorkbook(result) {
    if (!result?.errors.length) throw new Error('没有可下载的错误数据');
    const fields = result.fields;
    const title = result.kingdee ? '金蝶商品信息导入错误数据' : '商品信息导入错误数据';
    const rows = [[title], ['红色“*”为必填项。'], [...fields.map((field) => field[1]), '错误原因'],
      ...result.errors.map((row) => [...row.values.map((value) => String(value ?? '')), row.reason])];
    const sheet = window.XLSX.utils.aoa_to_sheet(rows);
    sheet['!cols'] = [...fields.map((field) => ({ wch: Math.ceil(field[2] / 7) })), { wch: 65 }];
    sheet['!merges'] = [0, 1].map((row) => ({ s: { r: row, c: 0 }, e: { r: row, c: fields.length } }));
    sheet['!rows'] = rows.map(() => ({ hpt: 24 }));
    sheet['!autofilter'] = { ref: window.XLSX.utils.encode_range({ s: { r: 2, c: 0 }, e: { r: rows.length - 1, c: fields.length } }) };
    const book = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(book, sheet, '错误数据');
    return book;
  }
  window.ProductImportService = { parse, importData, errorWorkbook };
})();
