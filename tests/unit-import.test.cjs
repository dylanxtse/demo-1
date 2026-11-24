const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const XLSX = require('../assets/js/vendor/xlsx.full.min.js');
const { root, loadApp } = require('./helpers/app-context.cjs');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
function setup(storage) {
  const app = loadApp({ storage, services: ['assets/js/services/unit-measurement-service.js'] });
  app.context.XLSX = XLSX;
  vm.runInContext(read('assets/js/services/archive-import-service.js'), app.context);
  vm.runInContext(read('assets/js/services/unit-import-service.js'), app.context);
  return app;
}
function bytesFor(rows, headers = ['*计量单位', '与KG换算率']) {
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([['计量单位导入模板'], ['*为必填项。'], headers, ...rows]), '计量单位');
  return XLSX.write(book, { type: 'array', bookType: 'xlsx', compression: true });
}
const serialize = (book) => XLSX.write(book, { type: 'array', bookType: 'xlsx', compression: true });
function rowsOf(book) {
  const reopened = XLSX.read(serialize(book), { type: 'array' });
  return XLSX.utils.sheet_to_json(reopened.Sheets[reopened.SheetNames[0]], { header: 1, defval: '' });
}

test('计量单位下载模板为真正xlsx，字段保留计量单位与KG换算率', () => {
  const { context: c } = setup();
  const book = c.UnitImportService.templateWorkbook();
  assert.deepEqual(Array.from(new Uint8Array(serialize(book)).slice(0, 2)), [0x50, 0x4b]);
  assert.deepEqual(rowsOf(book)[2], ['*计量单位', '与KG换算率']);
});

test('xlsx导入校验库内及文件内重复、必填和换算率，成功记录持久化', async () => {
  const { context: c, values } = setup();
  const result = await c.UnitImportService.importData(bytesFor([
    ['装箱', 2], ['装箱', 3], ['kg', 1], ['错率', 0], ['', 2], ['袋装', ''], [], ['小单位', 0.0001]
  ]));
  assert.equal(result.added, 3);
  assert.equal(result.errors.length, 4);
  assert.deepEqual(Array.from(result.errors, (row) => row.rowNumber), [5, 6, 7, 8]);
  assert.match(result.errors[0].reason, /已存在/);
  assert.match(result.errors[2].reason, /换算率/);
  const reloaded = setup(Object.fromEntries(values)).context;
  const units = (await reloaded.UnitMeasurementService.list({ pageSize: 100 })).items;
  assert.equal(units.find((row) => row.unitName === '装箱').conversionRate, 2);
  assert.equal(units.find((row) => row.unitName === '袋装').conversionRate, '');
  assert.equal(units.find((row) => row.unitName === '小单位').conversionRate, 0.0001);
});

test('错误xlsx保留原始两列，末列追加错误原因，修正后可重新导入', async () => {
  const { context: c } = setup();
  const result = await c.UnitImportService.importData(bytesFor([['待修正', '不合法'], ['KG', 1]]));
  const book = c.UnitImportService.errorWorkbook(result), rows = rowsOf(book);
  assert.deepEqual(rows[2], ['*计量单位', '与KG换算率', '错误原因']);
  assert.deepEqual(rows[3].slice(0, 2), ['待修正', '不合法']);
  assert.match(rows[3][2], /换算率/);
  const sheet = book.Sheets[book.SheetNames[0]];
  sheet.B4 = { t: 'n', v: 2.5 };
  sheet.A5 = { t: 's', v: '另一单位' };
  const retried = await c.UnitImportService.importData(serialize(book));
  assert.equal(retried.added, 2);
  assert.equal(retried.errors.length, 0);
});

test('损坏文件、伪装csv、空表与错误表头拒绝导入，保存失败不虚报成功', async () => {
  const { context: c } = setup();
  const original = JSON.stringify(c.DemoStore.get('units'));
  for (const bytes of [new TextEncoder().encode('计量单位,与KG换算率\n箱,2'), new Uint8Array([0x50, 0x4b, 0]), bytesFor([]), bytesFor([['箱', 1]], ['单位', '换算率'])]) {
    await assert.rejects(() => c.UnitImportService.importData(bytes));
  }
  assert.equal(JSON.stringify(c.DemoStore.get('units')), original);
  const create = c.UnitMeasurementService.create;
  c.UnitMeasurementService.create = async () => { throw new Error('数据保存失败'); };
  const failed = await c.UnitImportService.importData(bytesFor([['失败单位', 1]]));
  assert.equal(failed.added, 0);
  assert.match(failed.errors[0].reason, /保存失败/);
  c.UnitMeasurementService.create = create;
});

// Exercise the controller with synthetic nodes only; no browser is launched.
async function mount(c) {
  const nodes = new Map(), handlers = new Map(), urls = new Map(), downloads = [];
  let sequence = 0;
  const node = (id) => {
    if (!nodes.has(id)) {
      const classes = new Set();
      nodes.set(id, { id, value: '', textContent: '', innerHTML: '', hidden: false, disabled: false, files: [],
        classList: { add: (name) => classes.add(name), remove: (name) => classes.delete(name),
          toggle(name, active) { if (active) classes.add(name); else classes.delete(name); }, contains: (name) => classes.has(name) },
        setAttribute(key, value) { this[key] = value; }, removeAttribute(key) { delete this[key]; },
        addEventListener(type, callback) { handlers.set(`${id}:${type}`, callback); }, click() {}, focus() {} });
    }
    return nodes.get(id);
  };
  c.document = { getElementById: node, querySelector: () => node('dialog'), body: { appendChild() {} },
    createElement() { return { click() { downloads.push({ href: this.href, download: this.download }); }, remove() {} }; } };
  c.AppShell = { mount({ content }) { node('shell').innerHTML = content; } };
  c.Pagination = { create() { return { update(value) { node('pagination').data = value; } }; } };
  c.Blob = Blob;
  c.URL = class extends URL {
    static createObjectURL(blob) { const url = `blob:unit-${++sequence}`; urls.set(url, blob); return url; }
    static revokeObjectURL(url) { urls.delete(url); }
  };
  c.setTimeout = () => 1;
  c.clearTimeout = () => {};
  vm.runInContext(read('assets/js/pages/unit-measurement.js'), c);
  await Promise.resolve();
  return { node, urls, downloads,
    click(action) { return handlers.get('pageContent:click')({ preventDefault() {}, target: { closest(selector) {
      return selector === '[data-action]' ? { dataset: { action } } : null;
    } } }); },
    choose(file) { handlers.get('pageContent:change')({ target: { id: 'unitImportFile', files: [file], value: file.name } }); }
  };
}
const upload = (bytes, extra = {}) => ({ name: '计量单位.xlsx', size: bytes.byteLength, arrayBuffer: async () => bytes, ...extra });

test('同一导入入口识别普通和金蝶模板，校验金蝶id并保留错误下载与上一步', async () => {
  const { context: c } = setup(), h = await mount(c);
  assert.equal((h.node('shell').innerHTML.match(/data-action="open-import"/g) || []).length, 1);
  assert.doesNotMatch(h.node('shell').innerHTML, /open-kingdee-import/);
  await h.click('open-import');
  assert.equal(h.node('unitImportTitle').textContent, '导入计量单位');
  assert.match(h.node('unitImportBody').innerHTML, /href="\.\/unit-import-template.html"/);
  assert.match(h.node('unitImportBody').innerHTML, /href="\.\/unit-import-kingdee-template.html"/);
  h.choose(upload(bytesFor([['普通模板单位', 2]])));
  await h.click('confirm-import');
  assert.equal((await c.UnitMeasurementService.list({ condition: { unitName: '普通模板单位' } })).total, 1);
  await h.click('import-previous');
  const id = '000123456789012345';
  const bytes = bytesFor([[id, '金蝶入口单位', 2], ['', '金蝶缺id', 1], [id, '金蝶重复id', 3]], ['*金蝶计量单位id', '*计量单位', '与KG换算率']);
  h.choose(upload(bytes));
  await h.click('confirm-import');
  assert.match(h.node('unitImportBody').innerHTML, /新增条数<\/dt><dd>1条/);
  assert.match(h.node('unitImportBody').innerHTML, /unit-import-error-count">2条/);
  const row = (await c.UnitMeasurementService.list({ condition: { unitName: '金蝶入口单位' } })).items[0];
  assert.equal(row.kingdeeUnitId, id);
  const errors = rowsOf(XLSX.read(await [...h.urls.values()][0].arrayBuffer(), { type: 'array' }));
  assert.deepEqual(errors[2], ['*金蝶计量单位id', '*计量单位', '与KG换算率', '错误原因']);
  assert.match(errors[3].at(-1), /id不能为空/);
  assert.match(errors[4].at(-1), /id已存在/);
  await h.click('import-previous');
  assert.equal(h.node('unitImportTitle').textContent, '导入计量单位');
  assert.match(h.node('unitImportBody').innerHTML, /href="\.\/unit-import-template.html"/);
  assert.match(h.node('unitImportBody').innerHTML, /href="\.\/unit-import-kingdee-template.html"/);
  await h.click('close-import');
  await h.click('open-import');
  assert.equal(h.node('unitImportTitle').textContent, '导入计量单位');
  assert.match(h.node('unitImportBody').innerHTML, /href="\.\/unit-import-template.html"/);
});

test('导入弹窗提供xlsx模板与上传，结果准确、错误数据可下载，上一步保留文件且关闭释放资源', async () => {
  const { context: c } = setup(), h = await mount(c);
  const total = h.node('pagination').data.total;
  await h.click('open-import');
  assert.match(h.node('unitImportBody').innerHTML, /下载模板/);
  assert.match(h.node('unitImportBody').innerHTML, /accept=".xlsx"/);
  assert.doesNotMatch(h.node('unitImportBody').innerHTML, /csv/i);
  assert.match(h.node('unitImportBody').innerHTML, /href="\.\/unit-import-template.html">计量单位模版\.xlsx<\/a>/);
  assert.match(h.node('unitImportBody').innerHTML, /href="\.\/unit-import-kingdee-template.html">金蝶计量单位模版\.xlsx<\/a>/);
  h.choose(upload(bytesFor([['导入单位', 2], ['KG', 1]])));
  assert.equal(h.node('unitImportFileName').textContent, '计量单位.xlsx');
  await h.click('confirm-import');
  const result = h.node('unitImportBody').innerHTML;
  assert.match(result, /新增条数<\/dt><dd>1条/);
  assert.match(result, /unit-import-error-count">1条/);
  assert.match(result, /download="计量单位错误数据.xlsx"/);
  assert.equal(h.node('pagination').data.total, total + 1);
  const blob = [...h.urls.values()][0];
  const book = XLSX.read(await blob.arrayBuffer(), { type: 'array' });
  assert.equal(rowsOf(book)[2][2], '错误原因');
  await h.click('import-previous');
  assert.match(h.node('unitImportBody').innerHTML, /计量单位.xlsx/);
  assert.equal(h.urls.size, 0);
  await h.click('close-import');
  assert.equal(h.node('unitImportModal')['aria-hidden'], 'true');
});

test('校验格式和10M上限，防止重复提交，全部成功无错误下载，关闭中止未开始的导入', async () => {
  const { context: c } = setup(), h = await mount(c);
  await h.click('open-import');
  await h.click('confirm-import');
  assert.equal(h.node('unitImportMessage').textContent, '请先上传文件');
  h.choose({ name: '错误.csv', size: 10 });
  assert.equal(h.node('unitImportMessage').textContent, '只能上传xlsx文件');
  h.choose({ name: '大文件.xlsx', size: 10 * 1024 * 1024 + 1 });
  assert.match(h.node('unitImportMessage').textContent, /10M/);
  h.choose({ name: '空文件.xlsx', size: 0 });
  assert.match(h.node('unitImportMessage').textContent, /空文件/);
  let finish;
  const bytes = bytesFor([['重复点击单位', 1]]);
  h.choose(upload(bytes, { arrayBuffer: () => new Promise((resolve) => { finish = resolve; }) }));
  const pending = h.click('confirm-import');
  assert.equal(h.node('unitImportConfirm').disabled, true);
  await h.click('confirm-import');
  finish(bytes); await pending;
  assert.doesNotMatch(h.node('unitImportBody').innerHTML, /download=/);
  assert.equal((await c.UnitMeasurementService.list({ condition: { unitName: '重复点击单位' } })).total, 1);
  await h.click('close-import'); await h.click('open-import');
  h.choose(upload(bytesFor([['中止单位', 1]]), { arrayBuffer: () => new Promise((resolve) => { finish = resolve; }) }));
  const cancelled = h.click('confirm-import');
  await h.click('close-import'); finish(bytesFor([['中止单位', 1]])); await cancelled;
  assert.equal((await c.UnitMeasurementService.list({ condition: { unitName: '中止单位' } })).total, 0);
});
