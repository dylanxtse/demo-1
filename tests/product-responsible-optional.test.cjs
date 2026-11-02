const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

test('新增商品时采购负责人为非必填项', () => {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/utils/validator.js'), 'utf8'), context);

  const errors = context.window.ProductValidator.validate({
    category: '食油',
    name: '商品名称',
    storageCondition: '常温',
    purchaseType: '供应商送货',
    responsible: '',
    unit: '斤',
    marketPrice: '10'
  });
  assert.equal(errors.responsible, undefined);

  const html = fs.readFileSync(path.join(root, 'goodsAdd.html'), 'utf8');
  assert.match(html, /<label class="field-label" for="responsible">采购负责人<\/label>/);
  assert.doesNotMatch(html, /<label class="field-label required" for="responsible">/);
});
