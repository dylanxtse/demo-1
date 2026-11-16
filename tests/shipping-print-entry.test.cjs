const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const { root, loadApp } = require('./helpers/app-context.cjs');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
function setup({ sessionFails = false, localFails = false, silentSession = false } = {}) {
  const { context } = loadApp();
  context.DemoStore.get('orders');
  const makeStorage = (fails, silent) => {
    const values = new Map();
    return { getItem(key) { if (fails) throw Error('Storage unavailable'); return values.get(key) || null; },
      setItem(key, value) { if (fails) throw Error('Quota exceeded'); if (!silent) values.set(key, value); },
      removeItem(key) { values.delete(key); } };
  };
  context.sessionStorage = makeStorage(sessionFails, silentSession);
  context.localStorage = makeStorage(localFails);
  let destination = '';
  context.AppNavigation = { navigate(href) { destination = href; } };
  context.location = { href: 'file:///shipping-management.html', search: '', hash: '' };
  vm.runInContext(read('assets/js/pages/shipping-management.js'), context);
  const print = context.RecordPageConfig.tabs.find((tab) => tab.key === 'orders').toolbar.find((action) => action.key === 'print').onClick;
  return { context, print, destination: () => destination };
}
function render(app) {
  const href = app.destination();
  const url = new URL(href, 'file:///shipping-management.html');
  app.context.location = { href: url.href, search: url.search };
  const host = { innerHTML: '' };
  app.context.document = { getElementById() { return host; }, querySelector() { return null; } };
  const html = read(url.pathname.slice(1));
  // 执行目标HTML真正引用的全部脚本，验证入口到模板的完整代码链路。
  for (const match of html.matchAll(/<script src="\.\/([^"?]+)(?:\?[^\"]*)?"><\/script>/g)) {
    vm.runInContext(read(match[1]), app.context, { filename: match[1] });
  }
  return host.innerHTML;
}
const records = () => Array.from({ length: 80 }, (_, index) => ({
  id: `SHIP-${index}`, orderNo: `PRINT-ORDER-${index}`, customerName: `打印学校${index}`, canteen: '第一食堂',
  expectedAt: '2026-11-18 07:30:00', deliveryDate: '2026-11-17',
  items: Array.from({ length: 8 }, (_, line) => ({ goodsCode: `GOODS-${line}`, goodsName: `打印商品${line}`, unit: '斤',
    orderQty: line + 1, shippingQty: line + 1, unitPrice: 2, remark: '打印备注'.repeat(50) }))
}));
for (const scenario of [
  { name: '正常缓存', options: {} },
  { name: '会话缓存不可读写', options: { sessionFails: true } },
  { name: '会话缓存未实际保存', options: { silentSession: true } },
  { name: '两种缓存均不可用', options: { sessionFails: true, localFails: true } }
]) {
  test(`订单发货打印在${scenario.name}时始终使用短链接并渲染数据`, () => {
    const app = setup(scenario.options);
    app.print(records());
    const destination = app.destination();
    assert.ok(destination.startsWith('./order-shipping-print-template.html'));
    assert.ok(destination.length < 150);
    assert.doesNotMatch(destination, /printData=/);
    if (scenario.options.sessionFails && scenario.options.localFails) assert.equal(destination, './order-shipping-print-template.html');
    else {
      const key = new URL(destination, 'file:///shipping-management.html').searchParams.get('printKey');
      const storage = scenario.options.sessionFails || scenario.options.silentSession ? app.context.localStorage : app.context.sessionStorage;
      const payload = JSON.parse(storage.getItem(key));
      assert.equal(payload.rows.length, 640);
      assert.ok(payload.rows.every((row) => !row.items && !row.orderLines));
      assert.equal(payload.rows[639].goodsName, '打印商品7');
      assert.equal(payload.rows[639].deliveryDate, '2026-11-17');
    }
    const html = render(app);
    assert.match(html, /shipping-print-paper/);
    assert.doesNotMatch(html, /暂无|无可打印/);
    if (!(scenario.options.sessionFails && scenario.options.localFails)) {
      assert.match(html, /PRINT-ORDER-79/);
      assert.match(html, /打印商品7/);
      assert.match(html, /配送日期：2026-11-17/);
    } else assert.match(html, /<td[^>]*>[^<]+<\/td>/);
  });
}
test('订单发货打印在无传入数据时也打开有数据的模板', () => {
  const app = setup();
  app.print([]);
  assert.ok(app.destination().length < 150);
  assert.match(render(app), /shipping-print-paper/);
});
