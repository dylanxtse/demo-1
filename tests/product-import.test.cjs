const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const XLSX = require('../assets/js/vendor/xlsx.full.min.js');
const { root, loadApp } = require('./helpers/app-context.cjs');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

function setup() {
  const app = loadApp({ services: ['assets/js/services/product-service.js'] });
  app.context.XLSX = XLSX;
  for (const file of ['assets/js/config/product-import-fields.js', 'assets/js/services/product-import-service.js']) vm.runInContext(read(file), app.context);
  return app;
}
const valid = (name, extra = {}) => ({ name, category: '其他材料-其他二级', purchaseType: '供应商送货', unit: '斤',
  brand: '测试品牌', multiUnitEnabled: '否', marketPrice: '12.50', storageCondition: '常温', shelfLifeEnabled: '否', ...extra });

function workbook(context, records, kingdee = false, modify) {
  const fields = context.ProductImportFields.forType(kingdee);
  const sheet = XLSX.utils.aoa_to_sheet([['商品信息导入模板'], ['红色“*”为必填项。'], Array.from(fields, (field) => field[1]),
    ...records.map((record) => Array.from(fields, ([key]) => record[key] ?? ''))]);
  modify?.(sheet, fields);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, '商品');
  return XLSX.write(book, { type: 'array', bookType: 'xlsx', compression: true });
}

test('普通模板导入统计真实新增和错误数，同时校验库内及文件内重复', () => {
  const { context: c } = setup();
  const prior = c.ProductService.create(valid('金蝶现有测试商品', { kingdeeProductId: '000100', spec: '10斤/袋' }));
  const result = c.ProductImportService.importData(workbook(c, [
    valid('成功商品'), valid('成功商品'), valid('金蝶现有测试商品', { spec: '5斤/袋' }), valid('', { marketPrice: '-1', storageCondition: '错误条件' })
  ]));
  assert.equal(result.added, 1);
  assert.equal(result.errors.length, 3);
  assert.match(result.errors[0].reason, /商品重复/);
  assert.match(result.errors[1].reason, /商品重复/);
  assert.match(result.errors[2].reason, /商品名称不能为空/);
  assert.match(result.errors[2].reason, /市场价必须为非负数/);
  assert.match(result.errors[2].reason, /储存条件/);
  assert.equal(c.ProductService.getDetail(prior.code).spec, '10斤/袋', '重复导入不覆盖原商品');
});

test('金蝶模板按id判重并保留前导零；新增id不会被同名商品误拦截', () => {
  const { context: c } = setup();
  c.ProductService.create(valid('原商品', { kingdeeProductId: '00000000000000000123' }));
  const result = c.ProductImportService.importData(workbook(c, [
    valid('改名的原商品', { kingdeeProductId: '00000000000000000123' }),
    valid('原商品', { kingdeeProductId: '00000000000000000124' }),
    valid('同文件重复id', { kingdeeProductId: '00000000000000000124' }), valid('缺少id')
  ], true));
  assert.equal(result.kingdee, true);
  assert.equal(result.added, 1);
  assert.equal(result.errors.length, 3);
  assert.match(result.errors[0].reason, /金蝶商品id重复/);
  assert.match(result.errors[1].reason, /金蝶商品id重复/);
  assert.match(result.errors[2].reason, /金蝶商品id不能为空/);
  assert.ok(c.ProductService.getList().some((product) => product.kingdeeProductId === '00000000000000000124'));
});

for (const kingdee of [false, true]) {
  test(`${kingdee ? '金蝶' : '普通'}错误xlsx保留完整原始字段，末列追加原因，修正后可重新导入`, () => {
    const { context: c } = setup();
    const input = valid('错误商品<&>', { marketPrice: '不是价格', kingdeeProductId: '0000123', alias: '=1+1', description: '第一行\n第二行' });
    const result = c.ProductImportService.importData(workbook(c, [input], kingdee));
    assert.equal(result.added, 0);
    const book = c.ProductImportService.errorWorkbook(result);
    const bytes = XLSX.write(book, { type: 'array', bookType: 'xlsx', compression: true });
    assert.deepEqual(Array.from(new Uint8Array(bytes).slice(0, 2)), [0x50, 0x4b]);
    const saved = XLSX.read(bytes, { type: 'array' });
    const sheet = saved.Sheets[saved.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    const fields = c.ProductImportFields.forType(kingdee);
    assert.deepEqual(rows[2], [...Array.from(fields, (field) => field[1]), '错误原因']);
    assert.equal(rows[2].length, kingdee ? 34 : 33);
    assert.deepEqual(rows[3].slice(0, -1), Array.from(result.errors[0].values));
    assert.match(rows[3].at(-1), /市场价必须为非负数/);
    const aliasIndex = fields.findIndex((field) => field[0] === 'alias');
    assert.equal(sheet[XLSX.utils.encode_cell({ r: 3, c: aliasIndex })].t, 's', '原始公式样式文本按文字输出');
    const priceColumn = fields.findIndex((field) => field[0] === 'marketPrice');
    sheet[XLSX.utils.encode_cell({ r: 3, c: priceColumn })] = { t: 'n', v: 15 };
    const corrected = c.ProductImportService.importData(XLSX.write(saved, { type: 'array', bookType: 'xlsx' }));
    assert.equal(corrected.added, 1);
    assert.equal(corrected.errors.length, 0);
    assert.throws(() => c.ProductImportService.errorWorkbook(corrected), /没有可下载/);
  });
}

test('格式化数字、零价和空行正确处理，保存失败列入错误而不虚报新增', () => {
  const { context: c } = setup();
  const records = [valid('千分位价格'), valid('零价商品', { marketPrice: '0' }), {}, valid('保存失败商品')];
  const bytes = workbook(c, records, false, (sheet, fields) => {
    const cell = XLSX.utils.encode_cell({ r: 3, c: fields.findIndex((field) => field[0] === 'marketPrice') });
    sheet[cell] = { t: 'n', v: 1200.5, z: '#,##0.00' };
  });
  const create = c.ProductService.create.bind(c.ProductService);
  c.ProductService.create = (row) => {
    if (row.name === '保存失败商品') throw new Error('保存异常');
    return create(row);
  };
  const result = c.ProductImportService.importData(bytes);
  assert.equal(result.added, 2);
  assert.equal(result.errors.length, 1);
  assert.equal(result.errors[0].reason, '保存异常');
  assert.equal(c.ProductService.getList().find((row) => row.name === '千分位价格').marketPrice, 1200.5);
});

test('无数据、损坏文件和错误表头均明确拒绝，不修改商品数据', () => {
  const { context: c } = setup();
  const original = JSON.stringify(c.ProductService.getList());
  assert.throws(() => c.ProductImportService.importData(new Uint8Array([1, 2, 3]).buffer), /有效的xlsx/);
  assert.throws(() => c.ProductImportService.importData(new Uint8Array([0x50, 0x4b, 3, 4]).buffer), /无法读取|工作表/);
  assert.throws(() => c.ProductImportService.importData(workbook(c, [])), /没有可导入/);
  assert.throws(() => c.ProductImportService.importData(workbook(c, [valid('字段错误')], false, (sheet) => {
    sheet.B3.v = '错误列名';
  })), /模板字段或顺序/);
  assert.equal(JSON.stringify(c.ProductService.getList()), original);
});

function mountPage(c) {
  const nodes = new Map(), listeners = new Map(), blobs = new Map(), alerts = [];
  const node = (id) => {
    if (!nodes.has(id)) {
      const classes = new Set();
      nodes.set(id, { id, dataset: {}, style: {}, value: '', files: [], innerHTML: '', textContent: '',
        classList: { add(name) { classes.add(name); }, remove(name) { classes.delete(name); }, contains(name) { return classes.has(name); },
          toggle(name, force) { const enabled = force ?? !classes.has(name); if (enabled) classes.add(name); else classes.delete(name); return enabled; } },
        setAttribute(key, value) { this[key] = value; }, removeAttribute(key) { delete this[key]; },
        querySelector() { return null; }, addEventListener(type, callback) { listeners.set(`${id}:${type}`, callback); }
      });
    }
    return nodes.get(id);
  };
  c.document = { body: { dataset: {} }, getElementById: node, querySelector(selector) {
    return selector === '.product-list-page' ? node('page') : selector === '[data-action="confirm-product-info-import"]' ? node('importButton') : null;
  }, querySelectorAll() { return []; } };
  c.AppShell = { mount({ content }) { node('page').innerHTML = content; } };
  c.Pagination = { create() { return { update() {} }; } };
  c.alert = (message) => alerts.push(message);
  c.addEventListener = () => {};
  c.Blob = Blob;
  c.URL = class extends URL {
    static createObjectURL(blob) { const id = `blob:test-${blobs.size}`; blobs.set(id, blob); return id; }
    static revokeObjectURL(id) { blobs.delete(id); }
  };
  for (const id of ['statusFilter', 'purchaseTypeFilter', 'sourceFilter', 'netVegetableFilter', 'standardProductFilter', 'purchaseQuantityFilter']) node(id).value = '全部';
  vm.runInContext(read('assets/js/utils/dom.js'), c);
  vm.runInContext(read('assets/js/pages/product-list.js'), c);
  return { node, blobs, alerts, click(action) {
    return listeners.get('page:click')({ target: { closest(selector) { return selector === '[data-action]' ? { dataset: { action } } : null; } } });
  } };
}

test('导入后弹窗显示准确计数并提供真正xlsx下载，上一步保留文件，关闭释放下载链接', async () => {
  const { context: c } = setup();
  const { node, blobs, alerts, click } = mountPage(c);
  const bytes = workbook(c, [valid('弹窗成功商品'), valid('弹窗错误商品', { marketPrice: '-1' })]);
  node('productInfoFileInput').files = [{ name: '商品.xlsx', size: bytes.byteLength, async arrayBuffer() { return bytes; } }];
  node('productInfoFileInput').value = 'selected.xlsx';
  await click('confirm-product-info-import');
  assert.equal(node('productInfoImportAddedCount').textContent, '1条');
  assert.equal(node('productInfoImportErrorCount').textContent, '1条');
  assert.equal(node('productInfoImportErrorDownload').hidden, false);
  assert.equal(node('productInfoImportResultModal').classList.contains('is-visible'), true);
  const blob = blobs.get(node('productInfoImportErrorDownload').href);
  const book = XLSX.read(await blob.arrayBuffer(), { type: 'array' });
  const rows = XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]], { header: 1, defval: '' });
  assert.equal(rows[2].at(-1), '错误原因');
  assert.equal(rows[3][0], '弹窗错误商品');
  await click('previous-product-info-import');
  assert.equal(node('productInfoImportModal').classList.contains('is-visible'), true);
  assert.equal(node('productInfoFileInput').value, 'selected.xlsx');
  assert.equal(blobs.size, 0);
  await click('close-product-info-import-result');
  assert.equal(node('productInfoFileInput').value, '');
  assert.equal(alerts.length, 0);
});

test('全部成功隐藏错误下载，导入中重复点击不会重复提交', async () => {
  const { context: c } = setup();
  const { node, click } = mountPage(c);
  const bytes = workbook(c, [valid('全部成功商品')]);
  let resolveFile, reads = 0;
  node('productInfoFileInput').files = [{ name: '商品.xlsx', size: bytes.byteLength, arrayBuffer() {
    reads++;
    return new Promise((resolve) => { resolveFile = resolve; });
  } }];
  const importing = click('confirm-product-info-import');
  assert.equal(node('importButton').disabled, true);
  await click('confirm-product-info-import');
  assert.equal(reads, 1);
  resolveFile(bytes);
  await importing;
  assert.equal(node('productInfoImportAddedCount').textContent, '1条');
  assert.equal(node('productInfoImportErrorCount').textContent, '0条');
  assert.equal(node('productInfoImportErrorDownload').hidden, true);
  assert.equal(node('importButton').disabled, false);
});
