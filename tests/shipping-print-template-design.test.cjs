const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { root } = require('./helpers/app-context.cjs');

const source = fs.readFileSync(path.join(root, 'assets/js/pages/shipping-print-template-design.js'), 'utf8');

function setup() {
  const listeners = {};
  const host = {
    innerHTML: '',
    addEventListener(type, handler) { listeners[type] = handler; },
    querySelector() { return null; }
  };
  const appRoot = { querySelector(selector) { return selector === '#shippingTemplateDesignRoot' ? host : null; } };
  const context = {
    URLSearchParams,
    AppShell: { mount() { return appRoot; } }
  };
  context.window = context;
  vm.runInNewContext(source, context);
  const click = (selector, dataset = {}) => listeners.click({ target: {
    closest(candidate) { return candidate === selector ? { dataset } : null; }
  } });
  return { host, click };
}

test('打印模板列表按适用页面分组，可展开并编辑模板，不显示状态列', () => {
  const app = setup();
  assert.match(app.host.innerHTML, /<th>适用页面<\/th><th>模版数量<\/th><th>纸张<\/th><th>操作<\/th>/);
  assert.doesNotMatch(app.host.innerHTML, /<th>状态<\/th>|默认模版|示例模版/);
  assert.equal((app.host.innerHTML.match(/data-template-page-row=/g) || []).length, 2);
  assert.doesNotMatch(app.host.innerHTML, /data-template-child-row=/);

  app.click('[data-template-toggle]', { templateToggle: 'order' });
  assert.match(app.host.innerHTML, /aria-expanded="true" aria-controls="shippingTemplateChildren-order"/);
  assert.equal((app.host.innerHTML.match(/data-template-child-row="order"/g) || []).length, 2);
  assert.match(app.host.innerHTML, /订单配送单（标准）/);
  assert.match(app.host.innerHTML, /订单配送单（简洁）/);

  app.click('[data-template-open]', { templateOpen: 'order-standard' });
  assert.match(app.host.innerHTML, /data-template-text="name"[^>]*value="订单配送单（标准）"/);
  app.click('[data-template-action]', { templateAction: 'list' });
  app.click('[data-template-open]', { templateOpen: 'order-compact' });
  assert.match(app.host.innerHTML, /data-template-text="name"[^>]*value="订单配送单（简洁）"/);
  app.click('[data-template-action]', { templateAction: 'list' });
  app.click('[data-template-open]', { templateOpen: 'shipping-standard' });
  assert.match(app.host.innerHTML, /data-template-text="name"[^>]*value="发货配送单（标准）"/);
});
