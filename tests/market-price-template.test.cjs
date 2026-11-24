const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const { root } = require('./helpers/app-context.cjs');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

// Load every script in HTML order, without a browser or preloaded app dependencies.
function loadTemplate(file, entries = {}, search = '') {
  const values = new Map(Object.entries(entries));
  const node = { dataset: {}, innerHTML: '' };
  const storage = {
    get length() { return values.size; },
    key(index) { return [...values.keys()][index] ?? null; },
    getItem(key) { return values.get(String(key)) ?? null; },
    setItem(key, value) { values.set(String(key), String(value)); },
    removeItem(key) { values.delete(String(key)); },
    clear() { values.clear(); }
  };
  const context = { console, URL, URLSearchParams, location: { search }, localStorage: storage, sessionStorage: storage,
    document: { getElementById() { return node; } } };
  context.window = context;
  vm.createContext(context);
  for (const match of read(file).matchAll(/<script src="\.\/([^"?]+)(?:\?[^\"]*)?"/g)) {
    assert.doesNotThrow(() => vm.runInContext(read(match[1]), context, { filename: match[1] }), match[1]);
  }
  return { context, node, values };
}

test('统一市场价模板正常加载，序号第一列、金蝶商品ID第二列且可为空', () => {
  const { context: c, node } = loadTemplate('market-price-import-template.html');
  assert.equal(c.document.title, '市场价导入模板');
  assert.match(node.innerHTML, /school-order-export-column-row"><th>序号<\/th><th>金蝶商品ID<\/th>/);
  assert.match(node.innerHTML, /<td>1<\/td>\s*<td><\/td>/);
  assert.doesNotMatch(read('assets/js/pages/product-list.js'), /market-price-import-kingdee-template/);
  assert.equal((node.innerHTML.match(/<col style=/g) || []).length, 8);
  assert.ok((node.innerHTML.match(/school-order-export-item-row/g) || []).length > 1);
  assert.match(node.innerHTML, /href="\.\/product-list.html">返回商品管理/);
});

test('已有商品数据保留金蝶id前导零并正确转义，空商品列表仍展示模板表头', () => {
  const initial = loadTemplate('market-price-import-template.html');
  initial.context.DemoStore.replace('products', [{ id: 'P1', code: 'SP0001', name: '测试<&>', unit: '斤', brand: '品牌', spec: '散装', kingdeeProductId: '000123456789012345' }]);
  const saved = loadTemplate('market-price-import-template.html', Object.fromEntries(initial.values));
  assert.match(saved.node.innerHTML, /<td>1<\/td>\s*<td>000123456789012345<\/td>\s*<td>SP0001<\/td>/);
  assert.match(saved.node.innerHTML, /测试&lt;&amp;&gt;/);
  saved.context.DemoStore.get = () => [];
  vm.runInContext(read('assets/js/pages/market-price-import-template.js'), saved.context);
  assert.match(saved.node.innerHTML, /金蝶商品ID<\/th>/);
  assert.match(saved.node.innerHTML, /colspan="8">暂无商品数据/);
});

test('普通市场价及共用脚本的分包规格模板仍能正常生成', () => {
  const standard = loadTemplate('market-price-import-template.html');
  assert.equal(standard.context.document.title, '市场价导入模板');
  assert.equal((standard.node.innerHTML.match(/<col style=/g) || []).length, 8);
  const sorting = loadTemplate('market-price-import-template.html', {}, '?type=sorting-spec');
  assert.equal(sorting.context.document.title, '分包规格导入模板');
  assert.equal((sorting.node.innerHTML.match(/<col style=/g) || []).length, 9);
});
