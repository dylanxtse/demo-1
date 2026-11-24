(function () {
  const text = (value) => String(value ?? '').trim();
  const header = (value) => text(value).normalize('NFKC').replace(/^\*/, '').toLowerCase();
  function excel() {
    if (!window.XLSX) throw new Error('Excel组件未加载，请刷新页面后重试');
    return window.XLSX;
  }
  window.ArchiveImport = {
    create({ entity, fields, kingdeeKey, kingdeeLabel, numericKeys = [], saveRow }) {
      const fieldsForType = (kingdee = false) => (kingdee ? [[kingdeeKey, `*${kingdeeLabel}`, 28], ...fields] : fields).map((field) => [...field]);
      function workbook(rows, errors = false, kingdee = false) {
        const xlsx = excel(), columns = fieldsForType(kingdee);
        const labels = columns.map((field) => field[1]);
        if (errors) labels.push('错误原因');
        const title = `${kingdee ? '金蝶' : ''}${entity}导入${errors ? '错误数据' : '模板'}`;
        const sheet = xlsx.utils.aoa_to_sheet([[title], ['红色“*”为必填项。'], labels, ...rows]);
        sheet['!cols'] = [...columns.map((field) => ({ wch: field[2] })), ...(errors ? [{ wch: 65 }] : [])];
        sheet['!merges'] = [0, 1].map((row) => ({ s: { r: row, c: 0 }, e: { r: row, c: labels.length - 1 } }));
        sheet['!rows'] = Array.from({ length: rows.length + 3 }, () => ({ hpt: 24 }));
        if (!errors && kingdee) {
          for (let row = 3; row < rows.length + 3; row++) sheet[xlsx.utils.encode_cell({ r: row, c: 0 })] = { t: 's', v: '', z: '@' };
        }
        const book = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(book, sheet, errors ? '错误数据' : entity);
        return book;
      }
      function parse(data) {
        const xlsx = excel(), bytes = new Uint8Array(data);
        if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new Error(`文件不是有效的xlsx文件，请使用${entity}导入模板`);
        let book;
        try { book = xlsx.read(data, { type: 'array', cellFormula: false }); }
        catch (error) { throw new Error('无法读取Excel文件，请检查文件是否损坏或加密'); }
        const sheet = book.Sheets[book.SheetNames[0]];
        if (!sheet) throw new Error('Excel文件没有工作表');
        const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '', blankrows: true });
        const headerIndex = rows.findIndex((row) => header(row[0]) === header(fields[0][1]) || header(row[0]) === header(kingdeeLabel));
        const kingdee = headerIndex >= 0 && header(rows[headerIndex][0]) === header(kingdeeLabel);
        const columns = fieldsForType(kingdee), labels = rows[headerIndex] || [];
        if (headerIndex < 0 || !columns.every((field, index) => header(labels[index]) === header(field[1]))
          || labels.slice(columns.length).some((value, index) => text(value) && (index !== 0 || header(value) !== '错误原因'))) {
          throw new Error(`模板字段或顺序不正确，请使用最新的${entity}导入模板`);
        }
        const records = rows.slice(headerIndex + 1).map((row, index) => {
          const values = columns.map((field, column) => row[column] ?? '');
          const dataRow = Object.fromEntries(columns.map(([key], column) => {
            const cell = sheet[xlsx.utils.encode_cell({ r: headerIndex + index + 1, c: column })];
            return [key, numericKeys.includes(key) && cell?.t === 'n' ? cell.v : text(values[column])];
          }));
          return { values, data: dataRow, rowNumber: headerIndex + index + 2 };
        }).filter((record) => record.values.some((value) => text(value)));
        if (!records.length) throw new Error(`文件中没有可导入的${entity}数据`);
        return { kingdee, records };
      }
      return {
        fieldsForType, parse,
        templateWorkbook(kingdee = false) { return workbook(Array.from({ length: 8 }, () => fieldsForType(kingdee).map(() => '')), false, kingdee); },
        async importData(data) {
          const { kingdee, records } = parse(data), result = { kingdee, added: 0, errors: [] };
          for (const record of records) {
            try {
              if (kingdee && !record.data[kingdeeKey]) throw new Error(`${kingdeeLabel}不能为空`);
              await saveRow(record.data);
              result.added++;
            } catch (error) { result.errors.push({ ...record, reason: error.message || `${entity}保存失败` }); }
          }
          return result;
        },
        errorWorkbook(result) {
          if (!result?.errors.length) throw new Error('没有可下载的错误数据');
          return workbook(result.errors.map((row) => [...row.values.map((value) => String(value ?? '')), row.reason]), true, result.kingdee);
        }
      };
    }
  };
})();
