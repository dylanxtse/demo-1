const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const XLSX = require('../assets/js/vendor/xlsx.full.min.js');
const { root, loadApp } = require('./helpers/app-context.cjs');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
function setup() {
  const app = loadApp({ services: ['assets/js/services/purchase-supplier-service.js'] });
  app.context.XLSX = XLSX;
  vm.runInContext(read('assets/js/services/supplier-import-service.js'), app.context);
  return app;
}
const valid = (name = '导入测试供应商', extra = {}) => ({ name, username: 'import123', contact: '测试联系人', phone: '13812345678',
  creditCode: '00123456789012345X', address: '测试地址', cooperationStart: '', cooperationEnd: '', jointSupplier: '否', hideCustomerPrice: '否', ...extra });
function bytesFor(c, records, modify, kingdee = false) {
  const fields = c.SupplierImportService.fieldsForType(kingdee);
  const sheet = XLSX.utils.aoa_to_sheet([['供应商导入模板'], ['红色“*”为必填项。'], Array.from(fields, (field) => field[1]),
    ...records.map((row) => Array.from(fields, ([key]) => row[key] ?? ''))]);
  modify?.(sheet);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, '供应商');
  return XLSX.write(book, { type: 'array', bookType: 'xlsx', compression: true });
}

test('下载模板是真正xlsx，字段与供应商表单一致，账号和联系电话按文本格式保存', () => {
  const { context: c } = setup();
  const book = c.SupplierImportService.templateWorkbook();
  const bytes = XLSX.write(book, { type: 'array', bookType: 'xlsx', compression: true });
  assert.deepEqual(Array.from(new Uint8Array(bytes).slice(0, 2)), [0x50, 0x4b]);
  const reopened = XLSX.read(bytes, { type: 'array', cellNF: true });
  const sheet = reopened.Sheets[reopened.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  assert.deepEqual(rows[2], ['*供应商名称', '*用户名', '*联系人', '*联系电话', '统一社会信用代码', '住所', '合作开始日期', '合作结束日期', '*联营供应商', '*隐藏客户价格']);
  assert.equal(sheet.B4.z, '@');
  assert.equal(sheet.D4.z, '@');
  assert.equal(sheet.E4.z, '@');
  assert.throws(() => c.SupplierImportService.importData(bytes), /没有可导入/);
});

test('普通和金蝶模板共用原有字段，金蝶首列为供应商id，两页均保留是/否下拉框', () => {
  const { context: c } = setup();
  const standard = Array.from(c.SupplierImportService.fieldsForType(), (field) => field[1]);
  for (const kingdee of [false, true]) {
    const book = c.SupplierImportService.templateWorkbook(kingdee);
    const rows = XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]], { header: 1, defval: '' });
    assert.deepEqual(rows[2], kingdee ? ['*金蝶供应商id', ...standard] : standard);
    if (kingdee) assert.equal(book.Sheets[book.SheetNames[0]].A4.z, '@');
    const node = { dataset: kingdee ? { template: 'kingdee' } : {}, innerHTML: '' };
    c.document = { getElementById() { return node; } };
    vm.runInContext(read('assets/js/pages/supplier-import-template.js'), c);
    const headers = node.innerHTML.match(/<tr class="school-order-export-column-row">([\s\S]*?)<\/tr>/)[1];
    assert.equal((headers.match(/<th>/g) || []).length, kingdee ? 11 : 10);
    if (kingdee) assert.match(headers, /^<th><span class="school-order-export-required-mark" aria-hidden="true">\*<\/span>金蝶供应商id<\/th>/);
    for (const label of ['联营供应商', '隐藏客户价格']) {
      assert.match(headers, new RegExp(`<span class="school-order-export-required-mark" aria-hidden="true">\\*<\\/span>${label}<\\/th>`));
      assert.match(node.innerHTML, new RegExp(`aria-label="第1行${label}" required`));
    }
    assert.equal((node.innerHTML.match(/<select class="supplier-import-boolean-select"/g) || []).length, 16);
    assert.doesNotMatch(node.innerHTML, /<option value=""/);
    assert.doesNotMatch(node.innerHTML, /date-range-display|请选择起止日期/);
    assert.match(headers, /<th>合作开始日期<\/th><th>合作结束日期<\/th>/);
    assert.equal(c.document.title, kingdee ? '金蝶供应商导入模板' : '供应商导入模板');
  }
});

test('金蝶供应商id必填且唯一、保存及编辑后不丢失，错误文件保留首列并支持修正重导', () => {
  const { context: c, values } = setup();
  const id = '000000001234567890';
  const result = c.SupplierImportService.importData(bytesFor(c, [
    valid('金蝶导入供应商', { kingdeeSupplierId: id }),
    valid('未填写id', { username: 'missing123' }),
    valid('重复id', { username: 'duplicate123', kingdeeSupplierId: id })
  ], undefined, true));
  assert.equal(result.kingdee, true);
  assert.equal(result.added, 1);
  assert.equal(result.errors.length, 2);
  assert.match(result.errors[0].reason, /金蝶供应商id不能为空/);
  assert.match(result.errors[1].reason, /金蝶供应商id已存在/);
  const saved = c.PurchaseSupplierService.list({ name: '金蝶导入供应商' })[0];
  assert.equal(saved.kingdeeSupplierId, id);
  const { kingdeeSupplierId, ...edit } = saved;
  c.PurchaseSupplierService.save({ ...edit, phone: '13912345678' }, saved.id);
  assert.equal(c.PurchaseSupplierService.get(saved.id).kingdeeSupplierId, id);
  const reloaded = loadApp({ storage: Object.fromEntries(values), services: ['assets/js/services/purchase-supplier-service.js'] }).context;
  assert.equal(reloaded.PurchaseSupplierService.get(saved.id).kingdeeSupplierId, id);
  const output = c.SupplierImportService.errorWorkbook(result);
  const bytes = XLSX.write(output, { type: 'array', bookType: 'xlsx' });
  const book = XLSX.read(bytes, { type: 'array' });
  const sheet = book.Sheets[book.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  assert.equal(rows[2].length, 12);
  assert.equal(rows[2][0], '*金蝶供应商id');
  assert.equal(rows[2].at(-1), '错误原因');
  assert.equal(rows[4][0], id);
  sheet.A4 = { t: 's', v: '000000001234567891' };
  const corrected = c.SupplierImportService.importData(XLSX.write(book, { type: 'array', bookType: 'xlsx' }));
  assert.equal(corrected.added, 1);
  assert.equal(corrected.errors.length, 1);
});

test('金蝶模板两个开关必填且仅允许是或否，错误文件保留必填标记和空值', () => {
  const { context: c } = setup();
  const records = [
    valid('缺少联营设置', { username: 'required0', kingdeeSupplierId: '001', jointSupplier: '' }),
    valid('缺少价格设置', { username: 'required1', kingdeeSupplierId: '002', hideCustomerPrice: '' }),
    valid('无效选项', { username: 'required2', kingdeeSupplierId: '003', jointSupplier: '打开' }),
    valid('正常金蝶设置', { username: 'required3', kingdeeSupplierId: '004', jointSupplier: '是', hideCustomerPrice: '否' })
  ];
  const result = c.SupplierImportService.importData(bytesFor(c, records, undefined, true));
  assert.equal(result.added, 1);
  assert.equal(result.errors.length, 3);
  assert.match(result.errors[0].reason, /联营供应商不能为空/);
  assert.match(result.errors[1].reason, /隐藏客户价格不能为空/);
  assert.match(result.errors[2].reason, /联营供应商必须填写是或否/);
  const book = c.SupplierImportService.errorWorkbook(result);
  const sheet = book.Sheets[book.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  assert.equal(rows[2][9], '*联营供应商');
  assert.equal(rows[2][10], '*隐藏客户价格');
  assert.equal(rows[3][9], '');
  sheet.J4 = { t: 's', v: '否' };
  const corrected = c.SupplierImportService.importData(XLSX.write(book, { type: 'array', bookType: 'xlsx' }));
  assert.equal(corrected.added, 1);
  assert.equal(corrected.errors.length, 2);
  const ordinary = c.SupplierImportService.importData(bytesFor(c, [valid('普通模板空设置', { username: 'regular123', jointSupplier: '', hideCustomerPrice: '' })]));
  assert.equal(ordinary.added, 0);
  assert.equal(ordinary.errors.length, 1);
  assert.match(ordinary.errors[0].reason, /联营供应商不能为空/);
  assert.match(ordinary.errors[0].reason, /隐藏客户价格不能为空/);
});

test('导入统计库内与文件内重复、必填错误及成功项，新增记录可持久化', () => {
  const { context: c, values } = setup();
  const result = c.SupplierImportService.importData(bytesFor(c, [
    valid(), valid(), valid('盒马鲜生', { username: 'other123' }), valid('缺少联系人', { username: 'missing123', contact: '' }),
    valid('账号重复', { username: 'PFZX12' }), valid('第二个导入供应商', { username: 'import456', jointSupplier: '是', hideCustomerPrice: '是' })
  ]));
  assert.equal(result.added, 2);
  assert.equal(result.errors.length, 4);
  assert.match(result.errors[0].reason, /名称已存在.*用户名已存在/);
  assert.match(result.errors[1].reason, /名称已存在/);
  assert.match(result.errors[2].reason, /联系人/);
  assert.match(result.errors[3].reason, /用户名已存在/);
  const reloaded = loadApp({ storage: Object.fromEntries(values), services: ['assets/js/services/purchase-supplier-service.js'] }).context;
  const supplier = reloaded.PurchaseSupplierService.list({ name: '第二个导入供应商' })[0];
  assert.equal(supplier.status, 'ENABLE');
  assert.equal(supplier.jointSupplier, true);
  assert.equal(supplier.hideCustomerPrice, true);
  assert.equal(reloaded.PurchaseSupplierService.list().length, 6);
});

test('错误下载保留全部原始数据，最后追加错误原因，修正后可重新导入', () => {
  const { context: c } = setup();
  const input = valid('原始错误商品<&>', { phone: '错误电话', address: '第一行\n第二行', creditCode: '000123', username: '000123' });
  const result = c.SupplierImportService.importData(bytesFor(c, [input]));
  const output = c.SupplierImportService.errorWorkbook(result);
  const bytes = XLSX.write(output, { type: 'array', bookType: 'xlsx' });
  const book = XLSX.read(bytes, { type: 'array' });
  const sheet = book.Sheets[book.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  assert.equal(rows[2].length, 11);
  assert.equal(rows[2].at(-1), '错误原因');
  assert.deepEqual(rows[3].slice(0, -1), Array.from(result.errors[0].values));
  assert.match(rows[3].at(-1), /联系电话/);
  sheet.D4 = { t: 's', v: '021-12345678' };
  const corrected = c.SupplierImportService.importData(XLSX.write(book, { type: 'array', bookType: 'xlsx' }));
  assert.equal(corrected.added, 1);
  assert.equal(corrected.errors.length, 0);
  const supplier = c.PurchaseSupplierService.list({ name: input.name })[0];
  assert.equal(supplier.username, '000123');
  assert.equal(supplier.creditCode, '000123');
  assert.throws(() => c.SupplierImportService.errorWorkbook(corrected), /没有可下载/);
});

test('Excel日期、数值电话与开关正确导入，非法日期和开关不写入', () => {
  const { context: c } = setup();
  const result = c.SupplierImportService.importData(bytesFor(c, [
    valid('日期供应商'), valid('错误日期', { username: 'date123', cooperationStart: '2026-12-01', cooperationEnd: '2026-11-01' }),
    valid('错误开关', { username: 'flag123', jointSupplier: '打开' })
  ], (sheet) => {
    sheet.G4 = { t: 'n', v: 46349, z: 'yyyy/m/d' };
    sheet.H4 = { t: 's', v: '2027/01/02' };
    sheet.D4 = { t: 'n', v: 13812345678, z: '0.00E+00' };
  }));
  assert.equal(result.added, 1);
  assert.equal(result.errors.length, 2);
  const row = c.PurchaseSupplierService.list({ name: '日期供应商' })[0];
  assert.equal(row.phone, '13812345678');
  assert.match(row.cooperationStart, /^2026-\d{2}-\d{2}$/);
  assert.equal(row.cooperationEnd, '2027-01-02');
  assert.equal(row.jointSupplier, false);
  assert.match(result.errors[0].reason, /结束日期不能早于/);
  assert.match(result.errors[1].reason, /联营供应商必须填写是或否/);
});

test('普通和金蝶模板合作日期分为两列，空值可导入，单端、倒置和无效日期列为错误且可修正重导', () => {
  for (const kingdee of [false, true]) {
    const { context: c } = setup();
    const records = [
      ['空期限', '', ''], ['完整期限', '2026/11/1', '2026/11/30'], ['同日', '2026-11-01', '2026-11-01'],
      ['缺结束', '2026-11-01', ''], ['缺开始', '', '2026-11-30'],
      ['倒置', '2026-12-01', '2026-11-01'], ['无效日期', '2026-02-30', '2026-03-01']
    ].map(([name, cooperationStart, cooperationEnd], index) => valid(name, { username: `period${index}`, kingdeeSupplierId: `00${index}`, cooperationStart, cooperationEnd }));
    const result = c.SupplierImportService.importData(bytesFor(c, records, undefined, kingdee));
    assert.equal(result.added, 3);
    assert.equal(result.errors.length, 4);
    const complete = c.PurchaseSupplierService.list({ name: '完整期限' })[0];
    assert.equal(complete.cooperationStart, '2026-11-01');
    assert.equal(complete.cooperationEnd, '2026-11-30');
    assert.equal(c.PurchaseSupplierService.list({ name: '空期限' })[0].cooperationStart, '');
    assert.ok(result.errors.slice(0, 2).every((row) => /完整的合作期限/.test(row.reason)));
    assert.match(result.errors[2].reason, /早于/);
    assert.match(result.errors[3].reason, /格式/);
    const output = c.SupplierImportService.errorWorkbook(result), sheet = output.Sheets[output.SheetNames[0]];
    const startColumn = kingdee ? 7 : 6;
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    assert.equal(rows[2][startColumn], '合作开始日期');
    assert.equal(rows[2][startColumn + 1], '合作结束日期');
    assert.equal(rows[3][startColumn], '2026-11-01');
    assert.equal(rows[2].at(-1), '错误原因');
    sheet[XLSX.utils.encode_cell({ r: 3, c: startColumn + 1 })] = { t: 's', v: '2026-11-30' };
    const retried = c.SupplierImportService.importData(XLSX.write(output, { type: 'array', bookType: 'xlsx' }));
    assert.equal(retried.added, 1);
    assert.equal(retried.errors.length, 3);
  }
});

test('文件损坏、表头错误及空表不改变数据，保存失败计入错误条数', () => {
  const { context: c } = setup();
  const before = c.PurchaseSupplierService.list().length;
  assert.throws(() => c.SupplierImportService.importData(new Uint8Array([1, 2, 3]).buffer), /有效的xlsx/);
  assert.throws(() => c.SupplierImportService.importData(new Uint8Array([0x50, 0x4b, 3, 4]).buffer), /无法读取|工作表/);
  assert.throws(() => c.SupplierImportService.importData(bytesFor(c, [])), /没有可导入/);
  assert.throws(() => c.SupplierImportService.importData(bytesFor(c, [valid()], (sheet) => { sheet.C3.v = '错误字段'; })), /字段或顺序/);
  c.PurchaseSupplierService.save = () => { throw new Error('保存失败'); };
  const result = c.SupplierImportService.importData(bytesFor(c, [valid()]));
  assert.equal(result.added, 0);
  assert.equal(result.errors[0].reason, '保存失败');
  assert.equal(c.PurchaseSupplierService.list().length, before);
});

function mount(c) {
  const nodes = new Map(), handlers = new Map(), blobs = new Map();
  let urlCounter = 0;
  const node = (id) => {
    if (!nodes.has(id)) nodes.set(id, { id, innerHTML: '', textContent: '', hidden: false, value: '', dataset: {},
      classList: { add() {}, remove() {} }, setAttribute() {}, querySelectorAll() { return []; },
      addEventListener(type, callback) { handlers.set(type, callback); }
    });
    return nodes.get(id);
  };
  c.document = { getElementById: node };
  c.AppShell = { mount() { return node('root'); } };
  c.Pagination = { create() { return { update({ total }) { node('psPagination').total = total; } }; } };
  c.SupplierAttachments = {};
  c.location = { hash: '' };
  c.addEventListener = (type, callback) => handlers.set(type, callback);
  c.Blob = Blob;
  c.URL = class extends URL {
    static createObjectURL(blob) { const url = `blob:import-${urlCounter++}`; blobs.set(url, blob); return url; }
    static revokeObjectURL(url) { blobs.delete(url); }
  };
  vm.runInContext(read('assets/js/utils/dom.js'), c);
  vm.runInContext(read('assets/js/pages/purchase-supplier-archive.js'), c);
  return { node, blobs, handlers,
    click(action) { return handlers.get('click')({ target: { closest() { return { dataset: { psAction: action } }; } } }); },
    upload(file) { return handlers.get('change')({ target: { id: 'psImportFile', files: [file], value: file.name } }); }
  };
}

test('导入弹窗打开模板页并支持上传、结果和错误下载，上一步保留文件，关闭清理资源', async () => {
  const { context: c } = setup();
  const h = mount(c);
  assert.match(h.node('purchaseSupplierPage').innerHTML, /导入供应商/);
  h.click('import');
  assert.match(h.node('purchaseSupplierOverlay').innerHTML, /href="\.\/supplier-import-template.html">供应商导入模板.xlsx/);
  assert.match(h.node('purchaseSupplierOverlay').innerHTML, /href="\.\/supplier-import-kingdee-template.html">金蝶供应商导入模板.xlsx/);
  assert.doesNotMatch(h.node('purchaseSupplierOverlay').innerHTML, /download="供应商导入模板.xlsx"/);
  assert.equal(h.blobs.size, 0);
  await h.click('import-confirm');
  assert.match(h.node('psImportMessage').textContent, /先上传/);
  const bytes = bytesFor(c, [valid('弹窗供应商'), valid('错误供应商', { username: 'error123', phone: '错误电话' })]);
  h.upload({ name: '导入供应商.xlsx', size: bytes.byteLength, async arrayBuffer() { return bytes; } });
  await h.click('import-confirm');
  const result = h.node('purchaseSupplierOverlay').innerHTML;
  assert.match(result, /新增条数<\/dt><dd>1条/);
  assert.match(result, /ps-import-error-count">1条/);
  assert.match(result, /download="供应商错误数据.xlsx"/);
  assert.equal(h.node('psPagination').total, 5);
  const exported = XLSX.read(await [...h.blobs.values()][0].arrayBuffer(), { type: 'array' });
  assert.equal(XLSX.utils.sheet_to_json(exported.Sheets[exported.SheetNames[0]], { header: 1 })[2].at(-1), '错误原因');
  h.click('import-previous');
  assert.match(h.node('purchaseSupplierOverlay').innerHTML, /导入供应商.xlsx/);
  assert.equal(h.blobs.size, 0);
  h.click('close-modal');
  assert.equal(h.blobs.size, 0);
  assert.equal(h.node('purchaseSupplierOverlay').innerHTML, '');
});

test('文件类型、大小校验和重复点击保护生效，全部成功不显示错误下载', async () => {
  const { context: c } = setup();
  const h = mount(c);
  h.click('import');
  h.upload({ name: '错误.csv', size: 1 });
  assert.match(h.node('psImportMessage').textContent, /只能上传xlsx/);
  h.upload({ name: '超大.xlsx', size: 10 * 1024 * 1024 + 1 });
  assert.match(h.node('psImportMessage').textContent, /10M/);
  let resolveRead, reads = 0;
  const bytes = bytesFor(c, [valid()]);
  h.upload({ name: '正确.xlsx', size: bytes.byteLength, arrayBuffer() {
    reads++;
    return new Promise((resolve) => { resolveRead = resolve; });
  } });
  const importing = h.click('import-confirm');
  assert.equal(h.node('psImportConfirm').disabled, true);
  await h.click('import-confirm');
  assert.equal(reads, 1);
  resolveRead(bytes);
  await importing;
  assert.match(h.node('purchaseSupplierOverlay').innerHTML, /ps-import-error-count">0条/);
  assert.doesNotMatch(h.node('purchaseSupplierOverlay').innerHTML, /下载错误数据.xlsx/);
  h.click('close-modal');
  h.click('import');
  h.upload({ name: '错误电话.xlsx', size: bytes.byteLength, async arrayBuffer() { return bytesFor(c, [valid('全失败', { phone: 'bad' })]); } });
  await h.click('import-confirm');
  assert.match(h.node('purchaseSupplierOverlay').innerHTML, /新增条数<\/dt><dd>0条/);
  assert.match(h.node('purchaseSupplierOverlay').innerHTML, /ps-import-error-count">1条/);
});
