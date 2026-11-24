const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const { root, loadApp } = require('./helpers/app-context.cjs');
const services = ['assets/js/services/customer-archive-service.js', 'assets/js/services/warehouse-archive-service.js'];
const setup = (storage) => loadApp({ storage, services });
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const plain = (value) => JSON.parse(JSON.stringify(value));
const customerData = (c, extra = {}) => ({ additionMethod: '手动添加', customerName: '测试客户', username: 'client123',
  customerTypeId: c.CustomerArchiveService.types()[0].id, warehouseId: 'WH-001', receiver: '张先生', phone: '13812345678', address: '测试收货地址', ...extra });

test('手动客户与关联学校共用原有业务数据仓库，保存后可重新读取并交集查询', () => {
  const { context: c, values } = setup();
  const service = c.CustomerArchiveService, originalCount = service.list().length;
  const manual = service.save(customerData(c));
  const school = service.schools()[0];
  const linked = service.save(customerData(c, { additionMethod: '关联', schoolId: school.id }));
  assert.equal(service.list().length, originalCount + 2);
  assert.equal(linked.customerCode, school.code);
  assert.equal(linked.username, school.username);
  assert.ok(!service.schools().some((row) => row.id === school.id));
  assert.throws(() => service.save(customerData(c, { additionMethod: '关联', schoolId: school.id })), /已存在|已关联/);
  assert.equal(c.MasterDataService.getCustomer(manual.id).customerName, '测试客户');
  assert.equal(c.MasterDataService.getLocations(manual.id)[0].phone, '13812345678');
  const reloaded = setup(Object.fromEntries(values)).context.CustomerArchiveService;
  assert.equal(reloaded.get(manual.id).customerCode, manual.customerCode);
  assert.equal(reloaded.list({ customerCode: manual.customerCode, customerName: '测试', warehouseId: 'WH-001',
    customerTypeId: manual.customerTypeId, additionMethod: '手动添加' }).length, 1);
  assert.equal(reloaded.list({ customerCode: manual.customerCode, additionMethod: '关联' }).length, 0);
});

test('编辑保留客户编码和账号，只更新默认收货信息并保留其他食堂及历史订单', () => {
  const { context: c, values } = setup();
  const service = c.CustomerArchiveService, row = service.get('CUS-001');
  const locations = plain(c.MasterDataService.getLocations(row.id)), orders = JSON.stringify(c.DemoStore.get('orders'));
  assert.ok(locations.length >= 2);
  service.save({ ...row, customerName: '更新客户名称', username: 'altered123', customerCode: 'BAD',
    additionMethod: '手动添加', warehouseId: 'WH-002', receiver: '新收货人', phone: '13912345678', address: '新地址' }, row.id);
  const changed = service.get(row.id), next = c.MasterDataService.getLocations(row.id);
  assert.equal(changed.customerCode, row.customerCode);
  assert.equal(changed.username, row.username);
  assert.equal(changed.additionMethod, row.additionMethod);
  const primaryId = (locations.find((item) => item.isDefault) || locations[0]).id;
  assert.equal(next.find((item) => item.id === primaryId).receiver, '新收货人');
  for (const old of locations.filter((item) => item.id !== primaryId)) {
    const other = next.find((item) => item.id === old.id);
    for (const key of ['receiver', 'phone', 'address', 'route', 'canteen']) assert.equal(other[key], old[key]);
    assert.equal(other.customerName, '更新客户名称');
  }
  assert.equal(JSON.stringify(c.DemoStore.get('orders')), orders);
  assert.throws(() => service.remove(row.id), /引用/);
  assert.equal(setup(Object.fromEntries(values)).context.CustomerArchiveService.get(row.id).address, '新地址');
});

test('非法客户输入不落库，状态和密码更新限定于选中客户，删除清理该客户的地址', () => {
  const { context: c } = setup();
  const service = c.CustomerArchiveService, before = JSON.stringify(c.DemoStore.snapshot());
  for (const patch of [{ customerName: '' }, { username: 'ab' }, { phone: '123' }, { address: '字'.repeat(51) },
    { customerTypeId: 'MISSING' }, { warehouseId: 'WH-003' }]) assert.throws(() => service.save(customerData(c, patch)));
  assert.equal(JSON.stringify(c.DemoStore.snapshot()), before);
  const row = service.save(customerData(c));
  assert.throws(() => service.save(customerData(c, { customerName: '另一个客户', username: 'CLIENT123' })), /用户名已存在/);
  service.setStatus(row.id, 'DISABLE');
  assert.equal(c.MasterDataService.getCustomer(row.id).status, 'DISABLE');
  service.resetPassword(row.id);
  assert.ok(service.get(row.id).passwordResetAt);
  service.remove(row.id);
  assert.equal(service.get(row.id), null);
  assert.equal(c.MasterDataService.getLocations(row.id).length, 0);
  const replacement = service.save(customerData(c));
  assert.notEqual(replacement.customerCode, row.customerCode);
  assert.notEqual(replacement.id, row.id);
});

test('仓库允许空地址，新增编辑持久化且保留原有业务属性，日期边界查询有效', () => {
  const { context: c, values } = setup();
  const service = c.WarehouseArchiveService;
  const row = service.save({ warehouseName: '空地址仓库', address: '' });
  assert.equal(row.address, '');
  const day = row.createdAt.slice(0, 10);
  assert.ok(service.list({ warehouseCode: row.warehouseCode, warehouseName: '空地址', dateRange: [day, day] }).some((item) => item.id === row.id));
  assert.equal(service.list({ warehouseCode: row.warehouseCode, dateRange: ['2000-01-01', '2000-01-02'] }).length, 0);
  const old = service.get('WH-001');
  service.save({ warehouseName: '中心仓', address: '更新仓库地址', warehouseCode: 'BAD' }, old.id);
  const changed = service.get(old.id);
  for (const key of ['id', 'warehouseId', 'warehouseCode', 'createdAt', 'operatingCompanyIds', 'status', 'referenced']) assert.deepEqual(plain(changed[key] ?? null), plain(old[key] ?? null));
  assert.throws(() => service.save({ warehouseName: '中心仓' }), /已存在/);
  assert.throws(() => service.save({ warehouseName: '  ' }), /仓库名称/);
  const reloaded = setup(Object.fromEntries(values)).context.WarehouseArchiveService;
  assert.equal(reloaded.get(row.id).warehouseCode, row.warehouseCode);
  assert.equal(reloaded.get(old.id).address, '更新仓库地址');
});

test('仓库改名同步名称引用，关联客户或嵌套业务引用时均阻止删除', () => {
  const { context: c } = setup();
  const service = c.WarehouseArchiveService;
  const row = service.save({ warehouseName: '引用测试仓库' });
  assert.equal(service.isReferenced(row.id), false);
  c.DemoStore.replace('archiveReferenceTest', [{ items: [{ sourceWarehouseName: row.warehouseName }] }]);
  assert.equal(service.isReferenced(row.id), true);
  service.save({ warehouseName: '引用仓库新名称' }, row.id);
  assert.equal(c.DemoStore.get('archiveReferenceTest')[0].items[0].sourceWarehouseName, '引用仓库新名称');
  assert.throws(() => service.remove(row.id), (error) => error.code === 'WAREHOUSE_REFERENCED');
  c.DemoStore.replace('archiveReferenceTest', []);
  const customer = c.CustomerArchiveService.save(customerData(c, { warehouseId: row.id }));
  assert.equal(service.isReferenced(row.id), true);
  assert.throws(() => service.remove(row.id), /该仓库已被引用无法删除/);
  c.CustomerArchiveService.remove(customer.id);
  service.remove(row.id);
  assert.equal(service.get(row.id), null);
  assert.notEqual(service.save({ warehouseName: '替代仓库' }).id, row.id);
});

// Direct controller execution in a VM: no browser or browser automation is used.
function mount(c, kind) {
  const nodes = new Map(), handlers = new Map();
  const node = (id) => {
    if (!nodes.has(id)) nodes.set(id, { id, innerHTML: '', textContent: '', value: '', hidden: false,
      classList: { add() {}, remove() {} }, setAttribute(key, value) { this[key] = value; },
      removeAttribute(key) { delete this[key]; }, querySelectorAll() { return []; },
      addEventListener(event, callback) { handlers.set(event, callback); } });
    return nodes.get(id);
  };
  c.document = { getElementById: node };
  c.location = { hash: '' };
  c.addEventListener = (event, callback) => handlers.set(event, callback);
  c.setTimeout = () => 1;
  c.clearTimeout = () => {};
  c.AppShell = { mount({ content }) { node('shell').innerHTML = content; return node('root'); } };
  c.Pagination = { create() { return { update(value) { node('pagination').data = value; } }; } };
  let dates = {};
  c.DateRangePicker = { create() { return { getValue: () => dates, clear() { dates = {}; } }; } };
  vm.runInContext(read('assets/js/utils/dom.js'), c);
  vm.runInContext(read(`assets/js/pages/${kind === 'ca' ? 'customer-list' : 'warehouse-archive'}.js`), c);
  return { node, handlers, dates(value) { dates = value; },
    route(hash) { c.location.hash = hash; handlers.get('hashchange')(); },
    click(action, id) { handlers.get('click')({ target: { closest: () => ({ dataset: { [`${kind}Action`]: action, id } }) } }); },
    form(data = {}) {
      if (kind === 'ca') node('customerArchiveForm').elements = Object.fromEntries(Object.entries(data).map(([key, value]) => [key, { value }]));
      else { node('warehouseFormName').value = data.warehouseName; node('warehouseFormAddress').value = data.address || ''; }
      handlers.get('submit')({ target: { id: kind === 'ca' ? 'customerArchiveForm' : 'warehouseArchiveForm' }, preventDefault() {} });
    }
  };
}

test('客户页面支持两种新增方式、必填错误、编辑只读账号、地址计数和详情禁止写入', () => {
  const { context: c } = setup(), h = mount(c, 'ca');
  assert.equal(h.node('pagination').data.total, c.CustomerArchiveService.list().length);
  h.route('#add');
  assert.match(h.node('customerArchivePage').innerHTML, /关联学校客户/);
  assert.match(h.node('customerArchivePage').innerHTML, /name="schoolId"/);
  h.node('customerArchiveForm').elements = {};
  h.handlers.get('change')({ target: { name: 'additionMethod', value: '手动添加' } });
  assert.match(h.node('customerArchivePage').innerHTML, /name="username"/);
  h.form(customerData(c, { customerName: '' }));
  assert.equal(h.node('caError-customerName').textContent, '请输入客户名称');
  h.form(customerData(c));
  assert.equal(c.location.hash, '#list');
  const saved = c.CustomerArchiveService.list({ customerName: '测试客户' })[0];
  h.route(`#edit/${saved.id}`);
  assert.match(h.node('customerArchivePage').innerHTML, /name="username"[^>]*disabled/);
  h.handlers.get('input')({ target: { id: 'ca-address', value: '地址' } });
  assert.equal(h.node('customerAddressCount').textContent, '2/50');
  h.form({ ...saved, customerName: '' });
  assert.equal(h.node('caError-customerName').textContent, '请输入客户名称');
  assert.equal(c.CustomerArchiveService.get(saved.id).customerName, saved.customerName);
  h.route(`#view/${saved.id}`);
  assert.doesNotMatch(h.node('customerArchivePage').innerHTML, /type="submit"/);
  h.form({ ...saved, customerName: '详情不应修改' });
  assert.equal(c.CustomerArchiveService.get(saved.id).customerName, saved.customerName);
});

test('客户删除取消不落库，确认才删除，引用客户删除失败显示错误', () => {
  const { context: c } = setup(), h = mount(c, 'ca');
  const row = c.CustomerArchiveService.save(customerData(c));
  h.click('delete', row.id);
  assert.match(h.node('customerArchiveOverlay').innerHTML, /请再次确定是否删除该客户/);
  h.click('close-modal');
  assert.ok(c.CustomerArchiveService.get(row.id));
  h.click('delete', row.id); h.click('confirm');
  assert.equal(c.CustomerArchiveService.get(row.id), null);
  h.click('delete', 'CUS-001'); h.click('confirm');
  assert.match(h.node('caModalError').textContent, /引用/);
  assert.ok(c.CustomerArchiveService.get('CUS-001'));
});

test('仓库弹窗新增编辑保存、详情不能提交，取消编辑不落库，查询重置可用', () => {
  const { context: c } = setup(), h = mount(c, 'wa'), service = c.WarehouseArchiveService;
  h.click('add'); h.form({ warehouseName: '' });
  assert.match(h.node('warehouseFormError').textContent, /仓库名称/);
  h.form({ warehouseName: '弹窗测试仓库' });
  const row = service.list({ warehouseName: '弹窗测试仓库' })[0];
  assert.ok(row);
  assert.equal(h.node('warehouseArchiveOverlay').innerHTML, '');
  h.click('edit', row.id); h.click('close');
  assert.equal(service.get(row.id).address, '');
  h.click('edit', row.id); h.form({ warehouseName: row.warehouseName, address: '修改后地址' });
  assert.equal(service.get(row.id).address, '修改后地址');
  h.click('view', row.id); h.form({ warehouseName: '详情不能改' });
  assert.equal(service.get(row.id).warehouseName, row.warehouseName);
  h.click('close');
  h.node('warehouseCodeFilter').value = row.warehouseCode;
  h.click('query'); assert.equal(h.node('pagination').data.total, 1);
  h.click('reset'); assert.equal(h.node('pagination').data.total, service.list().length);
});

test('已引用仓库只显示知道了，未引用仓库取消不删且确认时重新核对引用', () => {
  const { context: c } = setup(), h = mount(c, 'wa'), service = c.WarehouseArchiveService;
  h.click('delete', 'WH-001');
  assert.match(h.node('warehouseArchiveOverlay').innerHTML, /该仓库已被引用无法删除/);
  assert.match(h.node('warehouseArchiveOverlay').innerHTML, /知道了/);
  assert.doesNotMatch(h.node('warehouseArchiveOverlay').innerHTML, /confirm-delete/);
  h.click('close');
  const row = service.save({ warehouseName: '待删仓库' });
  h.click('delete', row.id); h.click('close');
  assert.ok(service.get(row.id));
  h.click('delete', row.id);
  const customer = c.CustomerArchiveService.save(customerData(c, { warehouseId: row.id }));
  h.click('confirm-delete');
  assert.match(h.node('warehouseArchiveOverlay').innerHTML, /知道了/);
  assert.ok(service.get(row.id));
  c.CustomerArchiveService.remove(customer.id);
  h.click('close'); h.click('delete', row.id); h.click('confirm-delete');
  assert.equal(service.get(row.id), null);
});
