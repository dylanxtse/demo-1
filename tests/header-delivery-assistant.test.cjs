const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const prototypeUrl = 'https://rp.mockplus.cn/rps/ZE1a0m5uhT/9Qb2V3IOin?';

class MockElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.listeners = {};
    this.dataset = {};
    this.attributes = {};
    this.hidden = false;
  }

  appendChild(child) {
    this.children.push(child);
    child.parentNode = this;
    return child;
  }

  append(...children) { children.forEach((child) => this.appendChild(child)); }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  addEventListener(type, handler) { this.listeners[type] = handler; }
  querySelector(selector) { return this.children.find((child) => `.${child.className}` === selector) || null; }
}

function loadHeader() {
  const context = { location: { href: 'file:///demo.html' } };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/components/header.js'), 'utf8'), context);
  return context;
}

test('配送助手出现在移动端以外的右上角切换面板', () => {
  const { AppHeader } = loadHeader();
  for (const variant of ['enterprise', 'education', 'supplier', 'operations', 'school']) {
    assert.match(AppHeader.render({ variant }), /data-shell-switch="delivery-assistant">配送助手<\/button>/);
  }
  assert.doesNotMatch(AppHeader.render({ variant: 'mobile' }), /data-shell-switch="delivery-assistant"/);

  const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(indexHtml, /data-shell-switch="delivery-assistant">配送助手<\/button>/);
  const sortingTerminalLogin = fs.readFileSync(path.join(root, 'sorting-terminal-login.html'), 'utf8');
  assert.match(sortingTerminalLogin, /data-shell-switch="delivery-assistant">配送助手<\/button>/);
});

test('点击配送助手后打开最新的 Mockplus 原型链接', () => {
  const context = loadHeader();
  const listeners = {};
  const header = { dataset: {}, querySelectorAll() { return []; } };
  const rootElement = {
    querySelector(selector) { return selector === '.app-header' ? header : null; },
    addEventListener(type, handler) { listeners[type] = handler; }
  };
  let guardedSwitchCalls = 0;
  context.AppNavigationGuard = { switchTo() { guardedSwitchCalls += 1; } };
  context.AppHeader.bind(rootElement);

  const button = { dataset: { shellSwitch: 'delivery-assistant' } };
  listeners.click({ target: { closest(selector) { return selector === '[data-shell-switch]' ? button : null; } } });
  assert.equal(context.location.href, prototypeUrl);
  assert.equal(guardedSwitchCalls, 0);
});

test('分拣终端切换菜单也可打开配送助手原型', () => {
  const document = {
    body: new MockElement('body'),
    head: new MockElement('head'),
    querySelector(selector) { return selector === '[data-user-end="sorting-terminal"]' ? {} : null; },
    querySelectorAll() { return []; },
    createElement(tagName) { return new MockElement(tagName); },
    addEventListener() {}
  };
  const context = { document, window: { location: { href: 'file:///sorting-terminal-home.html' } } };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/components/platform-switch.js'), 'utf8'), context);

  const wrap = document.body.children.find((child) => child.className === 'sorting-terminal-switch-wrap');
  const menu = wrap.querySelector('.sorting-terminal-switch-menu');
  const deliveryAssistantButton = menu.children.find((button) => button.dataset.shellSwitch === 'delivery-assistant');
  assert.ok(deliveryAssistantButton);
  assert.equal(deliveryAssistantButton.textContent, '配送助手');
  menu.listeners.click({ target: { closest: () => deliveryAssistantButton } });
  assert.equal(context.window.location.href, prototypeUrl);
});
