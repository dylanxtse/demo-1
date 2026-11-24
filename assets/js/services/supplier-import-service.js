(function () {
  const fields = [
    ['name', '*供应商名称', 30], ['username', '*用户名', 24], ['contact', '*联系人', 20], ['phone', '*联系电话', 24],
    ['creditCode', '统一社会信用代码', 28], ['address', '住所', 40], ['cooperationStart', '合作开始日期', 22],
    ['cooperationEnd', '合作结束日期', 22], ['jointSupplier', '*联营供应商', 20], ['hideCustomerPrice', '*隐藏客户价格', 22]
  ];
  const text = (value) => String(value ?? '').trim();
  const header = (value) => text(value).normalize('NFKC').replace(/^\*/, '').toLowerCase();
  const fieldsForType = (kingdee = false) => (kingdee ? [['kingdeeSupplierId', '*金蝶供应商id', 28], ...fields] : fields).map((field) => [...field]);
  const dateKeys = new Set(['cooperationStart', 'cooperationEnd']);
  function excel() {
    if (!window.XLSX) throw new Error('Excel组件未加载，请刷新页面后重试');
    return window.XLSX;
  }
  function workbook(rows, errors = false, kingdee = false) {
    const xlsx = excel();
    const columns = fieldsForType(kingdee);
    const labels = columns.map((field) => field[1]);
    if (errors) labels.push('错误原因');
    const title = `${kingdee ? '金蝶' : ''}${errors ? '供应商导入错误数据' : '供应商导入模板'}`;
    const sheet = xlsx.utils.aoa_to_sheet([[title], ['红色“*”为必填项。合作日期请使用 YYYY-MM-DD 格式，年月日之间用“-”分隔。'], labels, ...rows]);
    sheet['!cols'] = [...columns.map((field) => ({ wch: field[2] })), ...(errors ? [{ wch: 65 }] : [])];
    sheet['!merges'] = [0, 1].map((row) => ({ s: { r: row, c: 0 }, e: { r: row, c: labels.length - 1 } }));
    sheet['!rows'] = Array.from({ length: rows.length + 3 }, () => ({ hpt: 24 }));
    if (!errors) {
      for (let row = 3; row < rows.length + 3; row++) {
        columns.forEach(([key], column) => {
          if (['kingdeeSupplierId', 'username', 'phone', 'creditCode'].includes(key)) {
            sheet[xlsx.utils.encode_cell({ r: row, c: column })] = { t: 's', v: '', z: '@' };
          }
        });
      }
    }
    const book = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(book, sheet, errors ? '错误数据' : '供应商');
    return book;
  }
  function dateValue(cell, value, date1904) {
    if (cell?.t === 'n') {
      const date = excel().SSF.parse_date_code(cell.v, { date1904 });
      if (date) return `${String(date.y).padStart(4, '0')}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }
    const match = text(value).match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    return match ? `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}` : text(value);
  }
  function parse(data) {
    const xlsx = excel();
    const bytes = new Uint8Array(data);
    if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new Error('文件不是有效的xlsx文件，请使用供应商导入模板');
    let book;
    try { book = xlsx.read(data, { type: 'array', cellFormula: false }); }
    catch (error) { throw new Error('无法读取Excel文件，请检查文件是否损坏或加密'); }
    const sheet = book.Sheets[book.SheetNames[0]];
    if (!sheet) throw new Error('Excel文件没有工作表');
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '', blankrows: true });
    const rowIndex = rows.findIndex((row) => (header(row[0]) === '供应商名称' && header(row[1]) === '用户名')
      || (header(row[0]) === '金蝶供应商id' && header(row[1]) === '供应商名称' && header(row[2]) === '用户名'));
    if (rowIndex < 0) throw new Error('未找到供应商模板表头，请使用供应商导入模板');
    const columns = rows[rowIndex];
    const kingdee = header(columns[0]) === '金蝶供应商id';
    const importFields = fieldsForType(kingdee);
    if (!importFields.every((field, index) => header(columns[index]) === header(field[1]))
      || columns.slice(importFields.length).some((value) => text(value) && header(value) !== '错误原因')) {
      throw new Error('模板字段或顺序不正确，请使用最新的供应商导入模板');
    }
    const records = rows.slice(rowIndex + 1).map((row, index) => {
      const values = importFields.map((field, column) => row[column] ?? '');
      const dataRow = Object.fromEntries(importFields.map(([key], column) => {
        const cell = sheet[xlsx.utils.encode_cell({ r: rowIndex + index + 1, c: column })];
        const value = values[column];
        return [key, dateKeys.has(key) ? dateValue(cell, value, Boolean(book.Workbook?.WBProps?.date1904))
          : key === 'phone' && cell?.t === 'n' ? String(cell.v) : text(value)];
      }));
      return { values, data: dataRow, rowNumber: rowIndex + index + 2 };
    }).filter((record) => record.values.some((value) => text(value)));
    if (!records.length) throw new Error('文件中没有可导入的供应商数据');
    return { kingdee, records };
  }
  window.SupplierImportService = {
    fields: fields.map((field) => [...field]),
    fieldsForType,
    parse,
    templateWorkbook(kingdee = false) { return workbook(Array.from({ length: 8 }, () => fieldsForType(kingdee).map(() => '')), false, kingdee); },
    importData(data) {
      const { kingdee, records } = parse(data);
      const result = { kingdee, added: 0, errors: [] };
      records.forEach((record) => {
        const dataRow = record.data;
        const reasons = [];
        if (kingdee && !dataRow.kingdeeSupplierId) reasons.push('金蝶供应商id不能为空');
        for (const [key, label] of [['jointSupplier', '联营供应商'], ['hideCustomerPrice', '隐藏客户价格']]) {
          if (!dataRow[key]) reasons.push(`${label}不能为空`);
          else if (dataRow[key] && !['是', '否'].includes(dataRow[key])) reasons.push(`${label}必须填写是或否`);
        }
        const supplier = { ...dataRow, jointSupplier: dataRow.jointSupplier === '是', hideCustomerPrice: dataRow.hideCustomerPrice === '是' };
        reasons.push(...Object.values(window.PurchaseSupplierService.validate(supplier)));
        if (!reasons.length) {
          try { window.PurchaseSupplierService.save(supplier); result.added++; }
          catch (error) { reasons.push(error.message || '供应商保存失败'); }
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
