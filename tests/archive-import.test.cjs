const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const XLSX = require('../assets/js/vendor/xlsx.full.min.js');
const { root, loadApp } = require('./helpers/app-context.cjs');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const serialize = (book) => XLSX.write(book, { type: 'array', bookType: 'xlsx', compression: true });
const rowsOf = (book) => XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]], { header: 1, defval: '' });
function setup(storage) {
  const app = loadApp({ storage, services: ['assets/js/services/unit-measurement-service.js', 'assets/js/services/warehouse-archive-service.js'] });
  app.context.XLSX = XLSX;
  for (const file of ['archive-import-service', 'unit-import-service', 'warehouse-import-service']) vm.runInContext(read(`assets/js/services/${file}.js`), app.context);
  return app;
}
function bytesFor(service, records, kingdee = false, modify) {
  const fields = service.fieldsForType(kingdee);
  const sheet = XLSX.utils.aoa_to_sheet([['导入模板'], ['*为必填项。'], Array.from(fields, (field) => field[1]),
    ...records.map((row) => Array.from(fields, ([key]) => row[key] ?? ''))]);
  modify?.(sheet);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, '导入');
  return serialize(book);
}

test('仓库和单位各有普通、金蝶两种模板，首列金蝶id必填且为文本，模板页可返回', () => {
  const { context: c } = setup();
  for (const resource of ['warehouse', 'unit']) {
    const service = resource === 'warehouse' ? c.WarehouseImportService : c.UnitImportService;
    const labels = resource === 'warehouse' ? ['*仓库名称', '地址'] : ['*计量单位', '与KG换算率'];
    const idLabel = resource === 'warehouse' ? '*金蝶仓库id' : '*金蝶计量单位id';
    for (const kingdee of [false, true]) {
      const book = XLSX.read(serialize(service.templateWorkbook(kingdee)), { type: 'array', cellNF: true });
      assert.deepEqual(rowsOf(book)[2], kingdee ? [idLabel, ...labels] : labels);
      if (kingdee) assert.equal(book.Sheets[book.SheetNames[0]].A4.z, '@');
      const node = { dataset: { resource, ...(kingdee ? { template: 'kingdee' } : {}) }, innerHTML: '' };
      c.document = { getElementById() { return node; } };
      vm.runInContext(read('assets/js/pages/archive-import-template.js'), c);
      assert.equal((node.innerHTML.match(/school-order-export-required-mark/g) || []).length, kingdee ? 2 : 1);
      assert.match(node.innerHTML, resource === 'warehouse' ? /href="\.\/warehouse-archive.html">返回仓库档案/ : /href="\.\/unit-measurement.html">返回计量单位/);
    }
  }
});

test('仓库普通导入支持空地址，重复名称与必填错误不新增，成功数据持久化且自动生成编码', async () => {
  const { context: c, values } = setup(), service = c.WarehouseImportService;
  const before = c.WarehouseArchiveService.list().length;
  const existing = c.WarehouseArchiveService.list()[0].warehouseName;
  const result = await service.importData(bytesFor(service, [
    { warehouseName: '导入仓库', address: '' }, { warehouseName: '导入仓库', address: '重复' },
    { warehouseName: existing }, { warehouseName: '', address: '缺名称' }
  ]));
  assert.equal(result.added, 1);
  assert.equal(result.errors.length, 3);
  assert.match(result.errors[0].reason, /仓库名称已存在/);
  assert.match(result.errors[1].reason, /仓库名称已存在/);
  assert.match(result.errors[2].reason, /仓库名称/);
  const reloaded = setup(Object.fromEntries(values)).context.WarehouseArchiveService;
  assert.equal(reloaded.list().length, before + 1);
  const row = reloaded.list({ warehouseName: '导入仓库' })[0];
  assert.ok(row.warehouseCode);
  assert.equal(row.address, '');
});

test('两类金蝶导入id必填且全局唯一，普通导入检查金蝶已有名称，编辑及刷新保留id', async () => {
  const { context: c, values } = setup();
  for (const resource of ['warehouse', 'unit']) {
    const warehouse = resource === 'warehouse', service = warehouse ? c.WarehouseImportService : c.UnitImportService;
    const nameKey = warehouse ? 'warehouseName' : 'unitName', idKey = warehouse ? 'kingdeeWarehouseId' : 'kingdeeUnitId';
    const id = '000000012345678901';
    const result = await service.importData(bytesFor(service, [
      { [nameKey]: '金蝶导入测试', [idKey]: id, conversionRate: 2 },
      { [nameKey]: '缺id测试' }, { [nameKey]: '重复id测试', [idKey]: id }
    ], true));
    assert.equal(result.added, 1);
    assert.equal(result.errors.length, 2);
    assert.match(result.errors[0].reason, /id不能为空/);
    assert.match(result.errors[1].reason, /id已存在/);
    const duplicate = await service.importData(bytesFor(service, [{ [nameKey]: '金蝶导入测试' }]));
    assert.equal(duplicate.added, 0);
    assert.match(duplicate.errors[0].reason, /已存在/);
    const row = warehouse ? c.WarehouseArchiveService.list({ warehouseName: '金蝶导入测试' })[0]
      : (await c.UnitMeasurementService.list({ condition: { unitName: '金蝶导入测试' } })).items[0];
    if (warehouse) c.WarehouseArchiveService.save({ warehouseName: '金蝶导入已编辑', address: '新地址', kingdeeWarehouseId: '改动id' }, row.id);
    else await c.UnitMeasurementService.update(row.id, { unitName: '金蝶导入已编辑', conversionRate: 3, kingdeeUnitId: '改动id' });
    const reloaded = setup(Object.fromEntries(values)).context;
    const updated = warehouse ? reloaded.WarehouseArchiveService.get(row.id) : await reloaded.UnitMeasurementService.get(row.id);
    assert.equal(updated[idKey], id);
  }
});

test('两种资源及模板的错误文件保留原始列值并追加错误原因，修正后可以重导', async () => {
  for (const resource of ['warehouse', 'unit']) {
    for (const kingdee of [false, true]) {
      const { context: c } = setup();
      const warehouse = resource === 'warehouse', service = warehouse ? c.WarehouseImportService : c.UnitImportService;
      const data = warehouse ? { warehouseName: '', address: '地址<&>\n第二行', kingdeeWarehouseId: '000123456789012345' }
        : { unitName: '单位<&>', conversionRate: '不合法', kingdeeUnitId: '000123456789012345' };
      const result = await service.importData(bytesFor(service, [data], kingdee));
      assert.equal(result.errors.length, 1);
      const book = XLSX.read(serialize(service.errorWorkbook(result)), { type: 'array' }), rows = rowsOf(book);
      assert.equal(rows[2].at(-1), '错误原因');
      assert.equal(rows[2].length, kingdee ? 4 : 3);
      assert.deepEqual(rows[3].slice(0, -1), Array.from(result.errors[0].values));
      const column = warehouse ? (kingdee ? 'B4' : 'A4') : (kingdee ? 'C4' : 'B4');
      book.Sheets[book.SheetNames[0]][column] = warehouse ? { t: 's', v: '修正的仓库' } : { t: 'n', v: 0.0001 };
      const corrected = await service.importData(serialize(book));
      assert.equal(corrected.added, 1);
      assert.equal(corrected.errors.length, 0);
    }
  }
});

test('仓库导入拒绝空文件、错误表头及损坏数据，单行保存失败保留错误记录', async () => {
  const { context: c } = setup(), service = c.WarehouseImportService;
  const before = JSON.stringify(c.DemoStore.get('warehouses'));
  await assert.rejects(() => service.importData(new TextEncoder().encode('不是Excel')), /有效的xlsx/);
  await assert.rejects(() => service.importData(serialize(service.templateWorkbook())), /没有可导入/);
  await assert.rejects(() => service.importData(bytesFor(service, [{ warehouseName: '错误表头' }], false, (sheet) => { sheet.B3.v = '错误字段'; })), /字段或顺序/);
  c.WarehouseArchiveService.save = () => { throw new Error('保存失败'); };
  const failed = await service.importData(bytesFor(service, [{ warehouseName: '未保存' }]));
  assert.equal(failed.errors[0].reason, '保存失败');
  assert.equal(JSON.stringify(c.DemoStore.get('warehouses')), before);
});

function mount(c) {
  const nodes = new Map(), handlers = new Map(), blobs = new Map();
  let sequence = 0, mounted = '';
  const node = (id) => {
    if (!nodes.has(id)) nodes.set(id, { id, innerHTML: '', textContent: '', value: '', hidden: false,
      addEventListener(type, callback) { handlers.set(type, callback); } });
    return nodes.get(id);
  };
  c.document = { getElementById: node };
  c.AppShell = { mount({ content }) { mounted = content; return node('root'); } };
  c.DateRangePicker = { create() { return { getValue() { return {}; }, clear() {} }; } };
  c.Pagination = { create() { return { update({ total }) { node('pagination').total = total; } }; } };
  c.Blob = Blob;
  c.URL = class extends URL {
    static createObjectURL(blob) { const url = `blob:warehouse-${sequence++}`; blobs.set(url, blob); return url; }
    static revokeObjectURL(url) { blobs.delete(url); }
  };
  vm.runInContext(read('assets/js/utils/dom.js'), c);
  vm.runInContext(read('assets/js/pages/warehouse-archive.js'), c);
  return { node, blobs, mounted,
    click(action) { return handlers.get('click')({ target: { closest() { return { dataset: { waAction: action } }; } } }); },
    upload(file) { handlers.get('change')({ target: { id: 'waImportFile', files: [file], value: file.name } }); }
  };
}

test('仓库入口、两模板链接、上传结果及错误下载衔接，上一步保留文件、关闭释放下载', async () => {
  const { context: c } = setup(), h = mount(c), service = c.WarehouseImportService;
  const count = c.WarehouseArchiveService.list().length;
  assert.match(h.mounted, /导入仓库/);
  h.click('import');
  assert.match(h.node('warehouseArchiveOverlay').innerHTML, /href="\.\/warehouse-import-template.html"/);
  assert.match(h.node('warehouseArchiveOverlay').innerHTML, /href="\.\/warehouse-import-kingdee-template.html"/);
  await h.click('import-confirm');
  assert.match(h.node('waImportMessage').textContent, /先上传/);
  const bytes = bytesFor(service, [{ warehouseName: '弹窗导入' }, { warehouseName: '', address: '缺名称' }]);
  h.upload({ name: '导入.xlsx', size: bytes.byteLength, async arrayBuffer() { return bytes; } });
  await h.click('import-confirm');
  assert.match(h.node('warehouseArchiveOverlay').innerHTML, /新增条数<\/dt><dd>1条/);
  assert.match(h.node('warehouseArchiveOverlay').innerHTML, /wa-import-error-count">1条/);
  assert.match(h.node('warehouseArchiveOverlay').innerHTML, /download="仓库错误数据.xlsx"/);
  assert.equal(h.node('pagination').total, count + 1);
  const book = XLSX.read(await [...h.blobs.values()][0].arrayBuffer(), { type: 'array' });
  assert.equal(rowsOf(book)[2].at(-1), '错误原因');
  h.click('import-previous');
  assert.match(h.node('warehouseArchiveOverlay').innerHTML, /导入.xlsx/);
  assert.equal(h.blobs.size, 0);
  h.click('close');
  assert.equal(h.node('warehouseArchiveOverlay').innerHTML, '');
});

test('仓库文件限制、防重复提交及关闭待读取导入有效，全部成功不显示错误下载', async () => {
  const { context: c } = setup(), h = mount(c), service = c.WarehouseImportService;
  h.click('import');
  h.upload({ name: '错误.csv', size: 1 });
  assert.match(h.node('waImportMessage').textContent, /只能上传xlsx/);
  h.upload({ name: '超大.xlsx', size: 10 * 1024 * 1024 + 1 });
  assert.match(h.node('waImportMessage').textContent, /10M/);
  let finish, reads = 0;
  const bytes = bytesFor(service, [{ warehouseName: '待导入仓库' }]);
  h.upload({ name: '正确.xlsx', size: bytes.byteLength, arrayBuffer() { reads++; return new Promise((resolve) => { finish = resolve; }); } });
  const pending = h.click('import-confirm');
  assert.equal(h.node('waImportConfirm').disabled, true);
  await h.click('import-confirm');
  assert.equal(reads, 1);
  finish(bytes); await pending;
  assert.doesNotMatch(h.node('warehouseArchiveOverlay').innerHTML, /下载错误数据.xlsx/);
  h.click('close'); h.click('import');
  const count = c.WarehouseArchiveService.list().length;
  h.upload({ name: '取消.xlsx', size: bytes.byteLength, arrayBuffer() { return new Promise((resolve) => { finish = resolve; }); } });
  const cancelled = h.click('import-confirm');
  h.click('close');
  finish(bytesFor(service, [{ warehouseName: '已取消仓库' }])); await cancelled;
  assert.equal(c.WarehouseArchiveService.list().length, count);
});
