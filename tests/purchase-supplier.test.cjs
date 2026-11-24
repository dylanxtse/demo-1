const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const { root, loadApp } = require('./helpers/app-context.cjs');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const setup = () => loadApp({ services: ['assets/js/services/purchase-supplier-service.js'] });
const valid = (extra = {}) => ({ name: '新增测试供应商', username: 'supplier123', contact: '测试联系人', phone: '13812345678',
  cooperationStart: '', cooperationEnd: '', jointSupplier: false, hideCustomerPrice: false, ...extra });

test('企业端供应商列表按截图提供四条演示数据，并支持名称、联系人和状态交集查询', () => {
  const { context: c } = setup();
  const service = c.PurchaseSupplierService;
  assert.deepEqual(Array.from(service.list(), (row) => row.name), ['联营供应商', '鲜菜源蔬菜批发中心', '每日优选', '盒马鲜生']);
  assert.equal(service.list({ name: '蔬菜', contact: '张' }).length, 1);
  assert.equal(service.list({ name: '蔬菜', contact: '王' }).length, 0);
  service.setStatus('PS-002', 'DISABLE');
  assert.equal(service.list({ status: 'DISABLE' })[0].id, 'PS-002');
  service.setStatus('PS-002', 'ENABLE');
  assert.equal(service.list({ status: 'DISABLE' }).length, 0);
});

test('新增编辑可持久化，用户名及联营属性保存后不可修改，其他字段和附件可更新', () => {
  const { context: c, values } = setup();
  const service = c.PurchaseSupplierService;
  const license = { id: 'FILE-1', name: '营业执照.png', type: 'image/png', size: 100 };
  const supplier = service.save(valid({ jointSupplier: true, businessLicense: license, creditCode: '91123456789012345X',
    address: '测试地址', cooperationStart: '2026-11-01', cooperationEnd: '2027-01-01' }));
  service.save({ ...supplier, name: '更新供应商', username: 'different123', jointSupplier: false, hideCustomerPrice: true,
    qualifications: [{ ...license, id: 'FILE-2', name: '食品经营许可.png' }] }, supplier.id);
  const reloaded = loadApp({ storage: Object.fromEntries(values), services: ['assets/js/services/purchase-supplier-service.js'] }).context.PurchaseSupplierService;
  const changed = reloaded.get(supplier.id);
  assert.equal(changed.name, '更新供应商');
  assert.equal(changed.username, 'supplier123');
  assert.equal(changed.jointSupplier, true);
  assert.equal(changed.hideCustomerPrice, true);
  assert.equal(changed.businessLicense.id, 'FILE-1');
  assert.equal(changed.qualifications[0].id, 'FILE-2');
  assert.equal(changed.cooperationEnd, '2027-01-01');
  assert.equal(changed.address, '测试地址');
  assert.equal(changed.creditCode, '91123456789012345X');
});

test('必填、账号唯一性、联系电话及合作日期均在保存前校验', () => {
  const { context: c } = setup();
  const service = c.PurchaseSupplierService;
  assert.throws(() => service.save(valid({ name: '' })), /供应商名称/);
  assert.throws(() => service.save(valid({ username: 'aa_01' })), /6~20/);
  assert.throws(() => service.save(valid({ username: 'PFZX12' })), /用户名已存在/);
  assert.throws(() => service.save(valid({ name: '盒马鲜生' })), /供应商名称已存在/);
  assert.throws(() => service.save(valid({ phone: 'not-a-phone' })), /联系电话/);
  assert.throws(() => service.save(valid({ cooperationStart: '2026-11-01' })), /完整/);
  assert.throws(() => service.save(valid({ cooperationStart: '2026-11-31', cooperationEnd: '2026-12-01' })), /格式/);
  assert.throws(() => service.save(valid({ cooperationStart: '2026-12-02', cooperationEnd: '2026-12-01' })), /早于/);
  assert.equal(service.list().length, 4);
  assert.equal(service.save(valid({ phone: '021-12345678' })).phone, '021-12345678');
});

test('删除持久化且保留教育局数据，已被采购引用的供应商改名后仍不可删除', () => {
  const { context: c, values } = setup();
  const service = c.PurchaseSupplierService;
  c.DemoStore.replace('supplierCompanies', [{ id: 'EDU-1', name: '教育局企业' }]);
  const created = service.save(valid());
  service.remove(created.id);
  assert.equal(loadApp({ storage: Object.fromEntries(values), services: ['assets/js/services/purchase-supplier-service.js'] }).context.PurchaseSupplierService.get(created.id), null);
  assert.equal(c.DemoStore.get('supplierCompanies')[0].name, '教育局企业');
  c.DemoStore.replace('purchaseOrders', [{ id: 'PO-1', supplier: '每日优选' }]);
  assert.throws(() => service.remove('PS-003'), /引用/);
  service.save({ ...service.get('PS-003'), name: '每日优选新名称' }, 'PS-003');
  assert.throws(() => service.remove('PS-003'), /引用/);
});

test('重置密码只更新选中供应商，图片验证严格限制格式及20M上限', () => {
  const { context: c } = setup();
  const before = JSON.stringify(c.PurchaseSupplierService.get('PS-001'));
  c.PurchaseSupplierService.resetPassword('PS-002');
  assert.ok(c.PurchaseSupplierService.get('PS-002').passwordResetAt);
  assert.equal(JSON.stringify(c.PurchaseSupplierService.get('PS-001')), before);
  vm.runInContext(read('assets/js/utils/supplier-attachments.js'), c);
  c.SupplierAttachments.validate({ name: '营业执照.jpeg', type: 'image/jpeg', size: 20 * 1024 * 1024 });
  assert.throws(() => c.SupplierAttachments.validate({ name: '过大.png', type: 'image/png', size: 20 * 1024 * 1024 + 1 }), /20M/);
  assert.throws(() => c.SupplierAttachments.validate({ name: '文件.svg', type: 'image/svg+xml', size: 100 }), /格式/);
  assert.throws(() => c.SupplierAttachments.validate({ name: '空.png', type: 'image/png', size: 0 }), /空文件/);
});

function mountPage(c) {
  const nodes = new Map(), handlers = new Map(), files = new Map();
  const node = (id) => {
    if (!nodes.has(id)) {
      const classes = new Set();
      nodes.set(id, { id, innerHTML: '', textContent: '', hidden: false, value: '', dataset: {},
        classList: { add(name) { classes.add(name); }, remove(name) { classes.delete(name); }, contains(name) { return classes.has(name); } },
        setAttribute(key, value) { this[key] = value; }, removeAttribute(key) { delete this[key]; },
        querySelectorAll() { return []; }, addEventListener(type, callback) { handlers.set(type, callback); }
      });
    }
    return nodes.get(id);
  };
  c.document = { getElementById: node };
  c.location = { hash: '' };
  c.addEventListener = (name, callback) => handlers.set(name, callback);
  c.AppShell = { mount() { return node('root'); } };
  c.Pagination = { create() { return { update(data) { node('psPagination').total = data.total; } }; } };
  let dates = {};
  c.DateRangePicker = { create() {
    const markup = node('purchaseSupplierPage').innerHTML;
    dates = { startDate: markup.match(/data-date-start value="([^"]*)"/)[1], endDate: markup.match(/data-date-end value="([^"]*)"/)[1] };
    return { destroy() {}, getValue() { return dates; } };
  } };
  c.SupplierAttachments = { validate() {}, async save(file) {
    const metadata = { id: `FILE-${files.size}`, name: file.name, type: file.type, size: file.size };
    files.set(metadata.id, file);
    return metadata;
  }, async get(id) { return files.get(id) || null; }, async remove(id) { files.delete(id); } };
  c.URL = class extends URL { static createObjectURL() { return 'blob:test'; } static revokeObjectURL() {} };
  vm.runInContext(read('assets/js/utils/dom.js'), c);
  vm.runInContext(read('assets/js/pages/purchase-supplier-archive.js'), c);
  return { node, files, handlers,
    route(hash) { c.location.hash = hash; handlers.get('hashchange')(); },
    click(action, id) { return handlers.get('click')({ target: { closest() { return { dataset: { psAction: action, id } }; } } }); },
    form(data) {
      node('psSupplierForm').elements = Object.fromEntries(Object.entries(data).map(([key, value]) => [key,
        typeof value === 'boolean' ? { checked: value } : { value }]));
      return handlers.get('submit')({ target: { id: 'psSupplierForm' }, preventDefault() {} });
    }
  };
}

test('页面包含截图列表字段，新增编辑显示正确字段并锁定账号与联营开关', () => {
  const { context: c } = setup();
  const h = mountPage(c);
  const list = h.node('purchaseSupplierPage').innerHTML;
  for (const label of ['供应商名称', '供应商联系人', '联系电话', '合作期限', '状态', '操作']) assert.match(list, new RegExp(label));
  assert.equal(h.node('psPagination').total, 4);
  h.route('#add');
  const add = h.node('purchaseSupplierPage').innerHTML;
  for (const label of ['添加供应商', '用户名', '联系人', '营业执照', '其他资质', '统一社会信用代码', '住所', '合作期限', '联营供应商', '隐藏客户价格', '保存']) assert.match(add, new RegExp(label));
  assert.doesNotMatch(add, /name="username"[^>]*disabled/);
  assert.doesNotMatch(add, /name="jointSupplier"[^>]*disabled/);
  h.route('#edit/PS-002');
  const edit = h.node('purchaseSupplierPage').innerHTML;
  assert.match(edit, /编辑供应商/);
  assert.match(edit, /name="username"[^>]*value="pfzx12"[^>]*disabled/);
  assert.match(edit, /name="jointSupplier"[^>]*checked disabled/);
  assert.match(edit, /重置密码/);
  h.route('#view/PS-002');
  assert.match(h.node('purchaseSupplierPage').innerHTML, /供应商详情/);
  assert.doesNotMatch(h.node('purchaseSupplierPage').innerHTML, /id="psSave"/);
});

test('删除弹窗取消不改变数据，确认才删除，编辑取消不写入', () => {
  const { context: c } = setup();
  const h = mountPage(c);
  h.click('delete', 'PS-001');
  assert.match(h.node('purchaseSupplierOverlay').innerHTML, /删除供应商/);
  assert.match(h.node('purchaseSupplierOverlay').innerHTML, /ps-delete-art/);
  assert.match(h.node('purchaseSupplierOverlay').innerHTML, /确定要删除该供应商吗/);
  h.click('close-modal');
  assert.equal(c.PurchaseSupplierService.list().length, 4);
  h.route('#edit/PS-002');
  h.click('back');
  h.route('#list');
  assert.equal(c.PurchaseSupplierService.get('PS-002').name, '鲜菜源蔬菜批发中心');
  h.click('delete', 'PS-001');
  h.click('confirm');
  assert.equal(c.PurchaseSupplierService.get('PS-001'), null);
  assert.equal(h.node('psPagination').total, 3);
});

test('新增保存回到列表并保留附件，附件写入失败不创建供应商且清理已写入文件', async () => {
  const { context: c } = setup();
  const h = mountPage(c);
  h.route('#add');
  const values = valid({ creditCode: '91123456789012345X', address: '上海测试地址' });
  const upload = (type, name) => h.handlers.get('change')({ target: { dataset: { psUpload: type }, files: [{ name, type: 'image/png', size: 10 }], value: name } });
  upload('license', '营业执照.png');
  upload('qualification', '许可证.png');
  await h.form(values);
  assert.equal(c.location.hash, '#list');
  assert.equal(c.PurchaseSupplierService.list({ name: values.name }).length, 1);
  const saved = c.PurchaseSupplierService.list({ name: values.name })[0];
  assert.equal(saved.businessLicense.name, '营业执照.png');
  assert.equal(saved.qualifications[0].name, '许可证.png');
  assert.equal(h.files.size, 2);
  h.route('#add');
  let count = 0;
  const baseSave = c.SupplierAttachments.save;
  c.SupplierAttachments.save = async (file) => {
    if (++count === 2) throw new Error('附件保存失败');
    return baseSave(file);
  };
  upload('license', '营业执照.png');
  upload('qualification', '许可证.png');
  await h.form({ ...values, name: '失败供应商', username: 'failed123' });
  assert.equal(c.PurchaseSupplierService.list({ name: '失败供应商' }).length, 0);
  assert.equal(h.files.size, 2, '失败时仅清理新文件，保留已保存供应商的资质');
  assert.match(h.node('psFormMessage').textContent, /附件保存失败/);
});
