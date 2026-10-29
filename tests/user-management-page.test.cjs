const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { loadApp, root } = require('./helpers/app-context.cjs');

function bootPage() {
  const context = loadApp().context;
  const listeners = {};
  const usernameFilter = { value: '' };
  const personFilter = { value: '' };
  const total = { textContent: '' };
  const appendedRows = [];
  const tbody = { innerHTML: '', insertAdjacentHTML(_position, html) { appendedRows.push(html); } };
  const tableRows = [];
  const passwordInput = { name: 'password', type: 'password', value: '', removeAttribute() {} };
  const passwordConfirmInput = { name: 'passwordConfirm', type: 'password', value: '', removeAttribute() {} };
  const customFields = {
    hidden: true,
    inputNodes: [passwordInput, passwordConfirmInput], errorNodes: [], visibilityButtons: [],
    querySelector() { return { focus() {} }; },
    querySelectorAll(selector) {
      if (selector === 'input') return this.inputNodes;
      if (selector === '[data-user-action="toggle-password"]') return this.visibilityButtons;
      return this.errorNodes;
    }
  };
  const defaultFields = { hidden: false };
  const page = {
    innerHTML: '',
    classList: { add() {}, remove() {} },
    querySelector(selector) {
      if (selector === '[name="username"]') return { focus() {} };
      if (selector === 'tbody') return tbody;
      if (selector === '[data-user-total]') return total;
      if (selector === '[data-user-filter="username"]') return usernameFilter;
      if (selector === '[data-user-filter="person"]') return personFilter;
      if (selector === '[data-custom-password-fields]') return customFields;
      if (selector === '[data-default-password-fields]') return defaultFields;
      if (selector === '#newUserPassword') return passwordInput;
      if (selector === '#newUserPasswordConfirm') return passwordConfirmInput;
      return null;
    },
    querySelectorAll(selector) { return selector === 'tbody tr' ? tableRows : []; }
  };
  const shell = {
    querySelector(selector) { return selector === '.user-management-page' ? page : null; },
    addEventListener(type, handler) { listeners[type] = handler; }
  };
  let rendered;
  context.AppShell = { mount(options) { rendered = options; page.innerHTML = options.content; return shell; } };
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/pages/user-management.js'), 'utf8'), context);
  return { context, listeners, page, total, tbody, appendedRows, tableRows, usernameFilter, personFilter, customFields, defaultFields, passwordInput, passwordConfirmInput, get rendered() { return rendered; } };
}

const action = (name, target, index) => {
  const button = { dataset: { userAction: name, userTarget: target, userIndex: index }, textContent: '', attributes: {}, setAttribute(key, value) { this.attributes[key] = value; } };
  return { button, target: { closest(selector) { return selector === '[data-user-action]' ? button : null; } } };
};

test('企业端用户管理菜单打开用户列表', () => {
  const page = bootPage();
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/config/menu-data.js'), 'utf8'), page.context);
  const systemMenu = page.context.AppMenuConfig.menu.find((item) => item.name === '系统管理');
  const userMenu = systemMenu.children.find((item) => item.name === '用户管理');
  assert.equal(userMenu.href, './user-management.html');
  assert.equal(userMenu.available, true);
  assert.equal(page.rendered.title, '用户管理');
  assert.match(page.rendered.content, /<span>用户名<\/span><input[^>]*placeholder="请输入"/);
  assert.match(page.rendered.content, /<th scope="col">启动状态<\/th>/);
  assert.equal((page.rendered.content.match(/<tr>\s*<td>\d<\/td>/g) || []).length, 4);
  assert.match(page.rendered.content, /共 4 条数据/);
});

test('添加用户打开表单，返回列表；确认时校验并保存用户', () => {
  const page = bootPage();
  const original = page.page.innerHTML;
  page.listeners.click(action('add'));
  assert.match(page.page.innerHTML, /<span>添加用户<\/span>/);
  assert.match(page.page.innerHTML, /name="username"/);
  assert.match(page.page.innerHTML, /name="role"/);
  assert.match(page.page.innerHTML, /<label for="newUserPassword"><span>\*<\/span> 密码<\/label>/);
  assert.match(page.page.innerHTML, /中心仓/);
  assert.match(page.page.innerHTML, /value="1234567Aa" readonly/);
  assert.match(page.page.innerHTML, /data-user-action="custom-password"/);
  assert.match(page.page.innerHTML, /<div class="user-management-password-inline"><div class="user-management-password-entry"><input[^>]*name="password"[^>]*type="password"[^>]*><button[^>]*data-user-action="toggle-password"[^>]*aria-label="查看密码"[^>]*>/);
  assert.equal((page.page.innerHTML.match(/class="user-management-eye"/g) || []).length, 2);
  assert.equal((page.page.innerHTML.match(/class="user-management-eye-off"/g) || []).length, 2);
  assert.match(page.page.innerHTML, /密码长度6～20位，数字、英文、特殊字符至少包含2种/);
  page.listeners.click(action('back'));
  assert.equal(page.page.innerHTML, original);

  page.listeners.click(action('add'));
  const fields = Object.fromEntries(['username', 'name', 'phone', 'role', 'warehouseId', 'password', 'passwordConfirm'].map((name) => [name, {
    value: '', focused: false, setAttribute() {}, removeAttribute() {}, focus() { this.focused = true; }
  }]));
  const errors = Object.fromEntries(Object.keys(fields).map((name) => [name, { textContent: '', hidden: true }]));
  const form = {
    elements: { namedItem(name) { return fields[name]; } },
    matches(selector) { return selector === '[data-user-form]'; },
    querySelector(selector) {
      if (selector === '[data-custom-password-fields]') return page.customFields;
      return errors[selector.match(/data-user-error="([^"]+)"/)?.[1]];
    },
    querySelectorAll() { return Object.values(errors); }
  };
  const submit = () => page.listeners.submit({ target: form, preventDefault() {} });
  submit();
  assert.equal(fields.username.focused, true);
  assert.equal(errors.username.hidden, false);
  assert.equal(page.context.AppStorage.read('procurement-user-management-v1', []).length, 0);

  fields.username.value = 'newbuyer01';
  fields.name.value = '王新';
  fields.phone.value = '13812345678';
  fields.role.value = '采购员';
  fields.warehouseId.value = 'WH-001';
  submit();
  const saved = page.context.AppStorage.read('procurement-user-management-v1', []);
  assert.equal(saved.length, 1);
  assert.equal(saved[0].username, 'newbuyer01');
  assert.equal(saved[0].warehouseId, 'WH-001');
  assert.equal(saved[0].password, '1234567Aa');
  assert.match(page.appendedRows[0], /newbuyer01/);
  assert.equal(page.total.textContent, '共 5 条数据');
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/pages/user-management.js'), 'utf8'), page.context);
  assert.match(page.rendered.content, /newbuyer01/);
  assert.match(page.rendered.content, /共 5 条数据/);
});

test('密码与确认密码默认隐藏，查看按钮切换明文并在返回默认密码时复位', () => {
  const page = bootPage();
  page.listeners.click(action('add'));
  page.listeners.click(action('custom-password'));
  assert.equal(page.passwordInput.type, 'password');
  assert.equal(page.passwordConfirmInput.type, 'password');
  const passwordToggle = action('toggle-password', 'newUserPassword');
  const confirmToggle = action('toggle-password', 'newUserPasswordConfirm');
  page.customFields.visibilityButtons.push(passwordToggle.button, confirmToggle.button);
  page.listeners.click(passwordToggle);
  assert.equal(page.passwordInput.type, 'text');
  assert.equal(passwordToggle.button.attributes['aria-pressed'], 'true');
  assert.equal(passwordToggle.button.attributes['aria-label'], '隐藏密码');
  assert.equal(page.passwordConfirmInput.type, 'password');
  page.listeners.click(confirmToggle);
  assert.equal(page.passwordConfirmInput.type, 'text');
  assert.equal(confirmToggle.button.attributes['aria-label'], '隐藏确认密码');
  page.listeners.click(passwordToggle);
  assert.equal(page.passwordInput.type, 'password');
  assert.equal(passwordToggle.button.attributes['aria-label'], '查看密码');
  page.listeners.click(action('default-password'));
  assert.equal(page.passwordConfirmInput.type, 'password');
  assert.equal(confirmToggle.button.attributes['aria-label'], '查看确认密码');
  assert.equal(confirmToggle.button.attributes['aria-pressed'], 'false');
});

test('自定义密码需满足两类字符且两次输入一致', () => {
  const page = bootPage();
  page.listeners.click(action('add'));
  const toggle = action('custom-password');
  page.listeners.click(toggle);
  assert.equal(page.customFields.hidden, false);
  assert.equal(page.defaultFields.hidden, true);
  const customInput = { value: 'abc123', removeAttribute() {} };
  page.customFields.inputNodes.push(customInput);
  page.listeners.click(action('default-password'));
  assert.equal(page.customFields.hidden, true);
  assert.equal(page.defaultFields.hidden, false);
  assert.equal(customInput.value, '');
  page.listeners.click(action('custom-password'));

  const fields = Object.fromEntries(['username', 'name', 'phone', 'role', 'warehouseId', 'password', 'passwordConfirm'].map((name) => [name, {
    value: '', focused: false, setAttribute() {}, removeAttribute() {}, focus() { this.focused = true; }
  }]));
  const errors = Object.fromEntries(Object.keys(fields).map((name) => [name, { textContent: '', hidden: true }]));
  const form = {
    elements: { namedItem(name) { return fields[name]; } },
    matches(selector) { return selector === '[data-user-form]'; },
    querySelector(selector) {
      if (selector === '[data-custom-password-fields]') return page.customFields;
      return errors[selector.match(/data-user-error="([^"]+)"/)?.[1]];
    },
    querySelectorAll() { return Object.values(errors); }
  };
  fields.username.value = 'newbuyer02';
  fields.name.value = '李新';
  fields.phone.value = '13912345678';
  fields.role.value = '分拣员';
  fields.warehouseId.value = 'WH-002';
  const submit = () => page.listeners.submit({ target: form, preventDefault() {} });
  fields.password.value = 'abcdef';
  fields.passwordConfirm.value = 'abcdef';
  submit();
  assert.equal(errors.password.hidden, false);
  assert.equal(page.context.AppStorage.read('procurement-user-management-v1', []).length, 0);

  fields.password.value = 'abc123';
  fields.passwordConfirm.value = 'abc124';
  submit();
  assert.equal(errors.password.hidden, true);
  assert.equal(errors.passwordConfirm.hidden, false);

  fields.passwordConfirm.value = 'abc123';
  submit();
  const saved = page.context.AppStorage.read('procurement-user-management-v1', []);
  assert.equal(saved[0].password, 'abc123');
});

test('用户列表查询和重置按钮筛选现有记录', () => {
  const page = bootPage();
  page.tableRows.push(...[
    ['cp10004', '杨采 (13511111111)'],
    ['xiaoli123', '小李 (13256895125)']
  ].map(([username, person]) => ({
    hidden: false,
    querySelectorAll() { return [{}, { textContent: username }, {}, { textContent: person }]; }
  })));
  page.usernameFilter.value = 'cp10004';
  page.listeners.click(action('search'));
  assert.equal(page.tableRows[0].hidden, false);
  assert.equal(page.tableRows[1].hidden, true);
  assert.equal(page.total.textContent, '共 1 条数据');
  page.listeners.click(action('reset'));
  assert.equal(page.usernameFilter.value, '');
  assert.equal(page.tableRows[1].hidden, false);
  assert.equal(page.total.textContent, '共 2 条数据');
});

test('编辑用户回显资料且不显示密码，保存后更新列表并持久化', () => {
  const page = bootPage();
  assert.match(page.page.innerHTML, /data-user-action="edit" data-user-index="0"/);
  page.listeners.click(action('edit', undefined, '0'));
  const markup = page.page.innerHTML;
  assert.match(markup, /<span>编辑用户<\/span>/);
  assert.match(markup, /data-edit-index="0"/);
  assert.match(markup, /name="username"[^>]*value="cp10004"/);
  assert.match(markup, /name="username"[^>]*readonly aria-readonly="true"/);
  assert.doesNotMatch(markup, /id="usernameHint"/);
  assert.match(markup, /name="name"[^>]*value="杨采"/);
  assert.match(markup, /name="phone"[^>]*value="13511111111"/);
  assert.match(markup, /<option value="采购员" selected>/);
  assert.match(markup, /<option value="WH-001" selected>中心仓<\/option>/);
  assert.doesNotMatch(markup, /默认密码|newUserPassword|data-custom-password-fields/);

  const fields = Object.fromEntries(['username', 'name', 'phone', 'role', 'warehouseId'].map((name) => [name, {
    value: '', focused: false, setAttribute() {}, removeAttribute() {}, focus() { this.focused = true; }
  }]));
  const errors = Object.fromEntries(Object.keys(fields).map((name) => [name, { textContent: '', hidden: true }]));
  const form = {
    dataset: { editIndex: '0' },
    elements: { namedItem(name) { return fields[name]; } },
    matches(selector) { return selector === '[data-user-form]'; },
    querySelector(selector) { return errors[selector.match(/data-user-error="([^"]+)"/)?.[1]]; },
    querySelectorAll() { return Object.values(errors); }
  };
  Object.assign(fields.username, { value: 'cp10004' });
  Object.assign(fields.name, { value: '杨采新' });
  Object.assign(fields.phone, { value: '13511111111' });
  Object.assign(fields.role, { value: '分拣员' });
  Object.assign(fields.warehouseId, { value: 'WH-002' });
  const submit = () => page.listeners.submit({ target: form, preventDefault() {} });
  fields.username.value = 'xiaoli123';
  submit();
  const saved = page.context.AppStorage.read('procurement-user-management-seed-edits-v1', {});
  assert.equal(saved.cp10004.username, 'cp10004');
  assert.equal(saved.cp10004.name, '杨采新');
  assert.equal(saved.cp10004.role, '分拣员');
  assert.equal(saved.cp10004.warehouseId, 'WH-002');
  assert.match(page.tbody.innerHTML, /杨采新 \(13511111111\)/);
  assert.equal(page.total.textContent, '共 4 条数据');

  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/pages/user-management.js'), 'utf8'), page.context);
  assert.match(page.rendered.content, /杨采新 \(13511111111\)/);
  page.listeners.click(action('edit', undefined, '0'));
  assert.match(page.page.innerHTML, /name="name"[^>]*value="杨采新"/);
  assert.match(page.page.innerHTML, /<option value="WH-002" selected>北区仓<\/option>/);
});

test('新增用户也能编辑资料且保留原密码', () => {
  const page = bootPage();
  page.context.AppStorage.write('procurement-user-management-v1', [{
    username: 'newbuyer03', name: '陈新', phone: '13811112222', role: '采购员', warehouseId: 'WH-001', password: 'abc123', status: 'ENABLE'
  }]);
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/pages/user-management.js'), 'utf8'), page.context);
  page.listeners.click(action('edit', undefined, '4'));
  assert.match(page.page.innerHTML, /name="username"[^>]*value="newbuyer03"/);
  assert.doesNotMatch(page.page.innerHTML, /newUserPassword/);
  const fields = Object.fromEntries(Object.entries({
    username: 'renamed03', name: '陈更新', phone: '13811112222', role: '管理员', warehouseId: 'WH-002'
  }).map(([name, value]) => [name, { value, setAttribute() {}, removeAttribute() {}, focus() {} }]));
  const errors = Object.fromEntries(Object.keys(fields).map((name) => [name, { textContent: '', hidden: true }]));
  const form = {
    dataset: { editIndex: '4' },
    elements: { namedItem(name) { return fields[name]; } },
    matches(selector) { return selector === '[data-user-form]'; },
    querySelector(selector) { return errors[selector.match(/data-user-error="([^"]+)"/)?.[1]]; },
    querySelectorAll() { return Object.values(errors); }
  };
  page.listeners.submit({ target: form, preventDefault() {} });
  const saved = page.context.AppStorage.read('procurement-user-management-v1', []);
  assert.equal(saved[0].username, 'newbuyer03');
  assert.equal(saved[0].name, '陈更新');
  assert.equal(saved[0].role, '管理员');
  assert.equal(saved[0].warehouseId, 'WH-002');
  assert.equal(saved[0].password, 'abc123');
  assert.match(page.tbody.innerHTML, /陈更新 \(13811112222\)/);
});
