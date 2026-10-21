const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { root } = require('./helpers/app-context.cjs');

const source = fs.readFileSync(path.join(root, 'assets/js/pages/sorting-management.js'), 'utf8');

function setup({ sessionFails = false, localFails = false } = {}) {
  const values = new Map();
  const storage = (fails) => ({
    setItem(key, value) {
      if (fails) throw new Error('Storage unavailable');
      values.set(key, value);
    },
    getItem(key) { return fails ? null : values.get(key) ?? null; }
  });
  let destination = '';
  let warning = '';
  const context = {
    Date, Math, JSON, Map, Set, URLSearchParams,
    location: { search: '', hash: '' },
    sessionStorage: storage(sessionFails),
    localStorage: storage(localFails),
    DemoStore: { get: () => [] },
    SortingCustomerService: { filterOptions: () => [] },
    AppNavigation: { navigate: (url) => { destination = url; } },
    alert: (message) => { warning = message; }
  };
  context.window = context;
  vm.runInNewContext(source, context);
  const print = context.RecordPageConfig.tabs[0].toolbar.find((action) => action.key === 'batchPrintQr').onClick;
  return { print, values, destination: () => destination, warning: () => warning };
}

test('一键打印大量分拣行时仅传短键，预览页可从存储读取完整数据', () => {
  const app = setup();
  const rows = Array.from({ length: 300 }, (_, index) => ({
    id: `SORT-${index}`, goodsName: `商品 ${index}`, orderQty: 1,
    remark: '备注'.repeat(200)
  }));
  app.print(rows);
  const url = app.destination();
  assert.match(url, /^\.\/sorting-label-print\.html\?printKey=/);
  assert.ok(url.length < 150);
  const key = new URLSearchParams(url.split('?')[1]).get('printKey');
  const payload = JSON.parse(app.values.get(key));
  assert.equal(payload.rows.length, rows.length);
  assert.equal(payload.rows[299].id, 'SORT-299');
});

test('会话存储不可用时使用本地存储；都不可用时不打开空白预览页', () => {
  const fallback = setup({ sessionFails: true });
  fallback.print([{ id: 'SORT-1' }]);
  assert.match(fallback.destination(), /printKey=/);
  const key = new URLSearchParams(fallback.destination().split('?')[1]).get('printKey');
  assert.equal(JSON.parse(fallback.values.get(key)).rows[0].id, 'SORT-1');

  const unavailable = setup({ sessionFails: true, localFails: true });
  unavailable.print([{ id: 'SORT-1' }]);
  assert.equal(unavailable.destination(), '');
  assert.match(unavailable.warning(), /无法保存打印数据/);
});
