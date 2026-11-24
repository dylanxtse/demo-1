(function () {
  const fields = [
    ['customerName', '*客户名称', 30], ['username', '*用户名', 24], ['customerTypeName', '*客户类型', 32],
    ['warehouse', '*仓库', 24], ['receiver', '*收货人', 20], ['phone', '*收货手机', 24], ['address', '*收货地址', 50]
  ];
  const text = (value) => String(value ?? '').trim();
  const header = (value) => text(value).normalize('NFKC').replace(/^\*/, '').toLowerCase();
  const fieldsForType = (kingdee = false) => (kingdee ? [['kingdeeCustomerId', '*金蝶客户id', 28], ...fields] : fields).map((field) => [...field]);
  function excel() {
    if (!window.XLSX) throw new Error('Excel组件未加载，请刷新页面后重试');
    return window.XLSX;
  }
  function workbook(rows, errors = false, kingdee = false) {
    const xlsx = excel(), columns = fieldsForType(kingdee);
    const labels = columns.map((field) => field[1]);
    if (errors) labels.push('错误原因');
    const sheet = xlsx.utils.aoa_to_sheet([
      [`${kingdee ? '金蝶' : ''}客户导入${errors ? '错误数据' : '模板'}`], ['红色“*”为必填项。'], labels, ...rows
    ]);
    sheet['!cols'] = [...columns.map((field) => ({ wch: field[2] })), ...(errors ? [{ wch: 65 }] : [])];
    sheet['!merges'] = [0, 1].map((row) => ({ s: { r: row, c: 0 }, e: { r: row, c: labels.length - 1 } }));
    sheet['!rows'] = Array.from({ length: rows.length + 3 }, () => ({ hpt: 24 }));
    if (!errors) {
      for (let row = 3; row < rows.length + 3; row++) {
        columns.forEach(([key], column) => {
          if (['kingdeeCustomerId', 'username', 'phone'].includes(key)) {
            sheet[xlsx.utils.encode_cell({ r: row, c: column })] = { t: 's', v: '', z: '@' };
          }
        });
      }
    }
    const book = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(book, sheet, errors ? '错误数据' : '客户');
    return book;
  }
  function parse(data) {
    const xlsx = excel(), bytes = new Uint8Array(data);
    if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new Error('文件不是有效的xlsx文件，请使用客户导入模板');
    let book;
    try { book = xlsx.read(data, { type: 'array', cellFormula: false }); }
    catch (error) { throw new Error('无法读取Excel文件，请检查文件是否损坏或加密'); }
    const sheet = book.Sheets[book.SheetNames[0]];
    if (!sheet) throw new Error('Excel文件没有工作表');
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '', blankrows: true });
    const rowIndex = rows.findIndex((row) => (header(row[0]) === '客户名称' && header(row[1]) === '用户名')
      || (header(row[0]) === '金蝶客户id' && header(row[1]) === '客户名称' && header(row[2]) === '用户名'));
    if (rowIndex < 0) throw new Error('未找到客户模板表头，请使用客户导入模板');
    const columns = rows[rowIndex], kingdee = header(columns[0]) === '金蝶客户id', importFields = fieldsForType(kingdee);
    const extraColumns = columns.slice(importFields.length).map(header);
    if (!importFields.every((field, index) => header(columns[index]) === header(field[1]))
      || extraColumns.some((value, index) => value && (index !== 0 || value !== '错误原因'))) {
      throw new Error('模板字段或顺序不正确，请使用最新的客户导入模板');
    }
    const records = rows.slice(rowIndex + 1).map((row, index) => {
      const values = importFields.map((field, column) => row[column] ?? '');
      const dataRow = Object.fromEntries(importFields.map(([key], column) => {
        const cell = sheet[xlsx.utils.encode_cell({ r: rowIndex + index + 1, c: column })];
        return [key, key === 'phone' && cell?.t === 'n' ? String(cell.v) : text(values[column])];
      }));
      return { values, data: dataRow, rowNumber: rowIndex + index + 2 };
    }).filter((record) => record.values.some((value) => text(value)));
    if (!records.length) throw new Error('文件中没有可导入的客户数据');
    return { kingdee, records };
  }
  function resolveReference(rows, name, label, key, reasons) {
    const matches = rows.filter((row) => row.status !== 'DISABLE' && text(row[key]) === name);
    if (matches.length === 1) return matches[0].id;
    reasons.push(!name ? `${label}不能为空` : matches.length ? `${label}名称存在多个匹配，请联系管理员处理` : `${label}不存在或已禁用`);
    return '';
  }
  window.CustomerImportService = {
    fieldsForType, parse,
    templateWorkbook(kingdee = false) { return workbook(Array.from({ length: 8 }, () => fieldsForType(kingdee).map(() => '')), false, kingdee); },
    importData(bytes) {
      const { kingdee, records } = parse(bytes);
      const service = window.CustomerArchiveService, result = { kingdee, added: 0, errors: [] };
      records.forEach((record) => {
        const data = record.data, reasons = [];
        if (kingdee && !data.kingdeeCustomerId) reasons.push('金蝶客户id不能为空');
        const customerTypeId = resolveReference(service.types(), data.customerTypeName, '客户类型', 'name', reasons);
        const warehouseId = resolveReference(service.warehouses(), data.warehouse, '仓库', 'warehouseName', reasons);
        const customer = { ...data, additionMethod: '手动添加', customerTypeId, warehouseId };
        const validation = service.validate(customer);
        // Reference errors above include the invalid imported value's context.
        delete validation.customerTypeId;
        delete validation.warehouseId;
        reasons.push(...Object.values(validation));
        if (!reasons.length) {
          try { service.save(customer); result.added++; }
          catch (error) { reasons.push(error.message || '客户保存失败'); }
        }
        if (reasons.length) result.errors.push({ ...record, reason: [...new Set(reasons)].join('；') });
      });
      return result;
    },
    errorWorkbook(result) {
      if (!result?.errors.length) throw new Error('没有可下载的错误数据');
      return workbook(result.errors.map((record) => [...record.values.map((value) => String(value ?? '')), record.reason]), true, result.kingdee);
    }
  };
})();
