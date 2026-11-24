const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const XLSX = require('../assets/js/vendor/xlsx.full.min.js');
const { root, loadApp } = require('./helpers/app-context.cjs');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
function setup(storage) {
  const app = loadApp({ storage, services: ['assets/js/services/customer-archive-service.js'] });
  app.context.XLSX = XLSX;
  vm.runInContext(read('assets/js/services/customer-import-service.js'), app.context);
  return app;
}
function valid(c, extra = {}) {
  return { customerName: '导入客户', username: 'import123', customerTypeName: c.CustomerArchiveService.types()[0].name,
    warehouse: c.CustomerArchiveService.warehouses().find((row) => row.id === 'WH-001').warehouseName,
    receiver: '张先生', phone: '13812345678', address: '测试收货地址', ...extra };
}
function bytesFor(c, records, kingdee = false, modify) {
  const fields = c.CustomerImportService.fieldsForType(kingdee);
  const sheet = XLSX.utils.aoa_to_sheet([['客户导入模板'], ['红色“*”为必填项。'], Array.from(fields, (field) => field[1]),
    ...records.map((row) => Array.from(fields, ([key]) => row[key] ?? ''))]);
  modify?.(sheet);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, '客户');
  return XLSX.write(book, { type: 'array', bookType: 'xlsx', compression: true });
}

test('普通和金蝶模板字段与客户表单一致，必填标记、文本格式及模板页保持一致', () => {
  const { context: c } = setup();
  const labels = ['*客户名称', '*用户名', '*客户类型', '*仓库', '*收货人', '*收货手机', '*收货地址'];
  for (const kingdee of [false, true]) {
    const bytes = XLSX.write(c.CustomerImportService.templateWorkbook(kingdee), { type: 'array', bookType: 'xlsx' });
    const book = XLSX.read(bytes, { type: 'array', cellNF: true }), sheet = book.Sheets[book.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    assert.deepEqual(rows[2], kingdee ? ['*金蝶客户id', ...labels] : labels);
    assert.equal(sheet[kingdee ? 'A4' : 'B4'].z, '@');
    assert.equal(sheet[kingdee ? 'G4' : 'F4'].z, '@');
    assert.throws(() => c.CustomerImportService.importData(bytes), /没有可导入/);
    const node = { dataset: kingdee ? { template: 'kingdee' } : {}, innerHTML: '' };
    c.document = { getElementById() { return node; } };
    vm.runInContext(read('assets/js/pages/customer-import-template.js'), c);
    assert.equal(c.document.title, `${kingdee ? '金蝶' : ''}客户导入模板`);
    assert.equal((node.innerHTML.match(/school-order-export-required-mark/g) || []).length, kingdee ? 8 : 7);
    assert.match(node.innerHTML, /href="\.\/customer.html">返回客户档案/);
  }
});

test('导入新增客户和默认收货地址，刷新后持久化，客户编码由原有规则生成', () => {
  const { context: c, values } = setup();
  const count = c.CustomerArchiveService.list().length;
  const result = c.CustomerImportService.importData(bytesFor(c, [valid(c)], false, (sheet) => {
    sheet.F4 = { t: 'n', v: 13812345678, z: '0.00E+00' };
  }));
  assert.equal(result.added, 1);
  assert.equal(result.errors.length, 0);
  const customer = c.CustomerArchiveService.list({ customerName: '导入客户' })[0];
  assert.match(customer.customerCode, /^KH\d+$/);
  assert.equal(customer.additionMethod, '手动添加');
  assert.equal(customer.warehouseId, 'WH-001');
  assert.equal(customer.phone, '13812345678');
  assert.equal(c.MasterDataService.getLocations(customer.id)[0].address, '测试收货地址');
  const reloaded = setup(Object.fromEntries(values)).context.CustomerArchiveService;
  assert.equal(reloaded.list().length, count + 1);
  assert.equal(reloaded.get(customer.id).username, 'import123');
});

test('金蝶客户id必填且唯一，普通导入也检查金蝶已有客户的名称及用户名，编辑保留id', () => {
  const { context: c, values } = setup();
  const id = '000000001234567890';
  const result = c.CustomerImportService.importData(bytesFor(c, [valid(c, { kingdeeCustomerId: id }),
    valid(c, { customerName: '无id客户', username: 'missing123' }),
    valid(c, { customerName: '重复id客户', username: 'repeat123', kingdeeCustomerId: id })], true));
  assert.equal(result.added, 1);
  assert.equal(result.errors.length, 2);
  assert.match(result.errors[0].reason, /金蝶客户id不能为空/);
  assert.match(result.errors[1].reason, /金蝶客户id已存在/);
  const duplicates = c.CustomerImportService.importData(bytesFor(c, [valid(c, { username: 'other123' }),
    valid(c, { customerName: '账号重复客户', username: 'IMPORT123' })]));
  assert.equal(duplicates.added, 0);
  assert.match(duplicates.errors[0].reason, /客户名称已存在/);
  assert.match(duplicates.errors[1].reason, /用户名已存在/);
  const row = c.CustomerArchiveService.list({ customerName: '导入客户' })[0];
  const { kingdeeCustomerId, ...data } = row;
  c.CustomerArchiveService.save({ ...data, phone: '13912345678' }, row.id);
  assert.equal(setup(Object.fromEntries(values)).context.CustomerArchiveService.get(row.id).kingdeeCustomerId, id);
});

test('同文件重复、缺失字段、未知或禁用类型仓库、过长地址均列出错误且不写入', () => {
  const { context: c } = setup();
  const before = c.CustomerArchiveService.list().length;
  const records = [valid(c), valid(c), valid(c, { customerName: '', username: 'missing123', receiver: '', phone: '123' }),
    valid(c, { customerName: '未知类型', username: 'unknown123', customerTypeName: '不存在类型' }),
    valid(c, { customerName: '禁用仓库', username: 'disable123', warehouse: c.CustomerArchiveService.warehouses().find((row) => row.id === 'WH-003').warehouseName }),
    valid(c, { customerName: '长地址', username: 'address123', address: '字'.repeat(51) })];
  const result = c.CustomerImportService.importData(bytesFor(c, records));
  assert.equal(result.added, 1);
  assert.equal(result.errors.length, 5);
  assert.match(result.errors[0].reason, /客户名称已存在.*用户名已存在/);
  assert.match(result.errors[1].reason, /客户名称.*收货人.*收货手机/);
  assert.match(result.errors[2].reason, /客户类型不存在或已禁用/);
  assert.match(result.errors[3].reason, /仓库不存在或已禁用/);
  assert.match(result.errors[4].reason, /50个字/);
  assert.equal(c.CustomerArchiveService.list().length, before + 1);
  c.DemoStore.replace('customerTypes', [{ id: 'T1', name: '同名类型' }, { id: 'T2', name: '同名类型' }]);
  const ambiguous = c.CustomerImportService.importData(bytesFor(c, [valid(c, { customerName: '同名类型测试', username: 'ambiguous1', customerTypeName: '同名类型' })]));
  assert.match(ambiguous.errors[0].reason, /客户类型名称存在多个匹配/);
});

test('错误下载保留普通及金蝶原字段，末列错误原因，修正后可重新导入', () => {
  for (const kingdee of [false, true]) {
    const { context: c } = setup();
    const data = valid(c, { username: '000123', kingdeeCustomerId: '000123456789012345', address: '收货地址<&>\n第二行', phone: '错误电话' });
    const result = c.CustomerImportService.importData(bytesFor(c, [data], kingdee));
    const output = c.CustomerImportService.errorWorkbook(result);
    const bytes = XLSX.write(output, { type: 'array', bookType: 'xlsx' }), book = XLSX.read(bytes, { type: 'array' });
    const sheet = book.Sheets[book.SheetNames[0]], rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    assert.deepEqual(rows[3].slice(0, -1), Array.from(result.errors[0].values));
    assert.equal(rows[2].at(-1), '错误原因');
    assert.equal(rows[2].length, kingdee ? 9 : 8);
    sheet[kingdee ? 'G4' : 'F4'] = { t: 's', v: '13812345678' };
    const corrected = c.CustomerImportService.importData(XLSX.write(book, { type: 'array', bookType: 'xlsx' }));
    assert.equal(corrected.added, 1);
    assert.equal(corrected.errors.length, 0);
    assert.equal(c.CustomerArchiveService.list({ customerName: '导入客户' })[0].username, '000123');
    assert.throws(() => c.CustomerImportService.errorWorkbook(corrected), /没有可下载/);
  }
});

test('损坏文件和错误表头不落库，保存失败进入错误结果', () => {
  const { context: c } = setup();
  const before = JSON.stringify(c.DemoStore.snapshot());
  assert.throws(() => c.CustomerImportService.importData(new TextEncoder().encode('不是Excel')), /不是有效/);
  assert.throws(() => c.CustomerImportService.importData(new Uint8Array([0x50, 0x4b, 1])), /无法读取|未找到客户模板表头/);
  assert.throws(() => c.CustomerImportService.importData(bytesFor(c, [valid(c)], false, (sheet) => { sheet.C3.v = '错误字段'; })), /字段或顺序/);
  c.CustomerArchiveService.save = () => { throw new Error('保存失败'); };
  const result = c.CustomerImportService.importData(bytesFor(c, [valid(c)]));
  assert.equal(result.added, 0);
  assert.equal(result.errors[0].reason, '保存失败');
  assert.equal(JSON.stringify(c.DemoStore.snapshot()), before);
});

// Execute the page controller directly with a minimal DOM stand-in; no browser is used.
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
  c.Pagination = { create() { return { update({ total }) { node('customerPagination').total = total; } }; } };
  c.location = { hash: '' };
  c.addEventListener = (type, callback) => handlers.set(type, callback);
  c.Blob = Blob;
  c.URL = class extends URL {
    static createObjectURL(blob) { const url = `blob:import-${urlCounter++}`; blobs.set(url, blob); return url; }
    static revokeObjectURL(url) { blobs.delete(url); }
  };
  vm.runInContext(read('assets/js/utils/dom.js'), c);
  vm.runInContext(read('assets/js/pages/customer-list.js'), c);
  return { node, blobs, handlers,
    click(action) { return handlers.get('click')({ target: { closest() { return { dataset: { caAction: action } }; } } }); },
    upload(file) { return handlers.get('change')({ target: { id: 'caImportFile', files: [file], value: file.name } }); }
  };
}

test('客户导入入口、两模板链接、上传、结果、错误下载与上一步关闭完整衔接', async () => {
  const { context: c } = setup();
  const h = mount(c), before = c.CustomerArchiveService.list().length;
  assert.match(h.node('customerArchivePage').innerHTML, /导入客户/);
  h.click('import');
  assert.match(h.node('customerArchiveOverlay').innerHTML, /href="\.\/customer-import-template.html">客户导入模板.xlsx/);
  assert.match(h.node('customerArchiveOverlay').innerHTML, /href="\.\/customer-import-kingdee-template.html">金蝶客户导入模板.xlsx/);
  await h.click('import-confirm');
  assert.match(h.node('caImportMessage').textContent, /先上传/);
  const bytes = bytesFor(c, [valid(c), valid(c, { customerName: '错误客户', username: 'error123', phone: 'bad' })]);
  h.upload({ name: '导入客户.xlsx', size: bytes.byteLength, async arrayBuffer() { return bytes; } });
  await h.click('import-confirm');
  const html = h.node('customerArchiveOverlay').innerHTML;
  assert.match(html, /新增条数<\/dt><dd>1条/);
  assert.match(html, /ca-import-error-count">1条/);
  assert.match(html, /download="客户错误数据.xlsx"/);
  assert.equal(h.node('customerPagination').total, before + 1);
  const errorBook = XLSX.read(await [...h.blobs.values()][0].arrayBuffer(), { type: 'array' });
  assert.equal(XLSX.utils.sheet_to_json(errorBook.Sheets[errorBook.SheetNames[0]], { header: 1 })[2].at(-1), '错误原因');
  h.click('import-previous');
  assert.match(h.node('customerArchiveOverlay').innerHTML, /导入客户.xlsx/);
  assert.equal(h.blobs.size, 0);
  h.click('close-modal');
  assert.equal(h.node('customerArchiveOverlay').innerHTML, '');
});

test('文件限制、重复提交、成功无错误链接及关闭弹窗取消待读取导入有效', async () => {
  const { context: c } = setup();
  const h = mount(c);
  h.click('import');
  h.upload({ name: '错误.csv', size: 1 });
  assert.match(h.node('caImportMessage').textContent, /只能上传xlsx/);
  h.upload({ name: '超大.xlsx', size: 10 * 1024 * 1024 + 1 });
  assert.match(h.node('caImportMessage').textContent, /10M/);
  let resolveRead, reads = 0;
  const bytes = bytesFor(c, [valid(c)]);
  h.upload({ name: '正确.xlsx', size: bytes.byteLength, arrayBuffer() { reads++; return new Promise((resolve) => { resolveRead = resolve; }); } });
  const pending = h.click('import-confirm');
  assert.equal(h.node('caImportConfirm').disabled, true);
  await h.click('import-confirm');
  assert.equal(reads, 1);
  resolveRead(bytes);
  await pending;
  assert.match(h.node('customerArchiveOverlay').innerHTML, /ca-import-error-count">0条/);
  assert.doesNotMatch(h.node('customerArchiveOverlay').innerHTML, /下载错误数据.xlsx/);
  h.click('close-modal');
  h.click('import');
  const count = c.CustomerArchiveService.list().length;
  h.upload({ name: '取消.xlsx', size: bytes.byteLength, arrayBuffer() { return new Promise((resolve) => { resolveRead = resolve; }); } });
  const cancelled = h.click('import-confirm');
  h.click('close-modal');
  resolveRead(bytesFor(c, [valid(c, { customerName: '取消的导入', username: 'cancel123' })]));
  await cancelled;
  assert.equal(c.CustomerArchiveService.list().length, count);
  assert.equal(h.node('customerArchiveOverlay').innerHTML, '');
});
