const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { root } = require('./helpers/app-context.cjs');

test('需求提交记录包含五个筛选项，按填报类型、用料日期和期望送达日期筛选', () => {
  const records = [
    {
      id: 'record-one', recordNo: 'XQ202609070001', canteen: '第一食堂', dates: ['2026-09-07', '2026-09-08'],
      expectedAt: '2026-09-06 07:30:00', submittedAt: '2026-09-05 16:20:00', submittedBy: '管理员',
      totalPersonTimes: 120, productCount: 3, orders: [{ id: 'order-one' }]
    },
    {
      id: 'record-two', recordNo: 'XQ202609080001', demandType: 'ingredient', canteen: '第一食堂', dateSummaries: [{ date: '2026-09-09' }],
      orders: [{ id: 'order-two', expectedAt: '2026-09-08 07:30:00' }], submittedAt: '2026-09-06 16:20:00',
      submittedBy: '管理员', totalPersonTimes: 80, productCount: 2
    },
    {
      id: 'record-three', recordNo: 'XQ202609100001', demandType: 'auxiliary', canteen: '第二食堂', dates: ['2026-09-10'],
      expectedAt: '2026-09-09 07:30:00', submittedAt: '2026-09-07 16:20:00', submittedBy: '管理员',
      totalPersonTimes: 0, productCount: 1, orders: []
    }
  ];
  const inputs = {
    '#schoolRecipeDemandRecordKeyword': { value: '' },
    '#schoolRecipeDemandRecordType': { value: 'all' },
    '#schoolRecipeDemandRecordSubmittedDate': { value: '' },
    '#schoolRecipeDemandRecordUsageDate': { value: '' },
    '#schoolRecipeDemandRecordExpectedAt': { value: '' }
  };
  const body = { innerHTML: '' };
  const listeners = { form: {}, page: {} };
  const form = { addEventListener(type, handler) { listeners.form[type] = handler; } };
  const page = {
    querySelector(selector) {
      if (selector === '#schoolRecipeDemandRecordKeyword'
        || selector === '#schoolRecipeDemandRecordType'
        || selector === '#schoolRecipeDemandRecordSubmittedDate'
        || selector === '#schoolRecipeDemandRecordUsageDate'
        || selector === '#schoolRecipeDemandRecordExpectedAt') return inputs[selector];
      if (selector === '#schoolRecipeDemandRecordsFilter') return form;
      if (selector === '#schoolRecipeDemandRecordsBody') return body;
      if (selector === '#schoolRecipeDemandRecordsPagination') return {};
      return null;
    },
    addEventListener(type, handler) { listeners.page[type] = handler; }
  };
  const rootNode = { querySelector(selector) { return selector === '#schoolRecipeDemandRecordsPage' ? page : null; } };
  const context = { console, URLSearchParams, SchoolRecipeDemandService: { getAll: () => records } };
  context.window = context;
  context.globalThis = context;
  context.AppShell = { mount({ content }) { context.mountedContent = content; return rootNode; } };
  context.DatePicker = { create: ({ input }) => ({ clear() { input.value = ''; } }) };
  context.Pagination = { create: () => ({ getState: () => ({ page: 1, pageSize: 20 }), update() {} }) };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/pages/school-recipe-demand-records.js'), 'utf8'), context);

  assert.match(context.mountedContent, /<th>记录编号<\/th><th>填报类型<\/th><th>用料日期<\/th><th>期望送达时间<\/th><th>食堂<\/th>/);
  assert.match(context.mountedContent, /<select class="filter-select" id="schoolRecipeDemandRecordType"[^>]*><option value="all" selected>全部<\/option><option value="recipe">菜谱需求填报<\/option><option value="auxiliary">干调需求填报<\/option><option value="ingredient">食材需求填报<\/option><\/select>/);
  assert.match(context.mountedContent, /id="schoolRecipeDemandRecordKeyword"[\s\S]*id="schoolRecipeDemandRecordSubmittedDate"[\s\S]*id="schoolRecipeDemandRecordUsageDate"[\s\S]*id="schoolRecipeDemandRecordExpectedAt"[\s\S]*id="schoolRecipeDemandRecordType"/);
  assert.match(context.mountedContent, /for="schoolRecipeDemandRecordUsageDate">用料日期/);
  assert.match(context.mountedContent, /id="schoolRecipeDemandRecordExpectedAt"/);
  assert.match(body.innerHTML, /2026-09-07、2026-09-08/);
  assert.match(body.innerHTML, /2026-09-06 07:30:00/);
  assert.match(body.innerHTML, /菜谱需求填报<\/td>\s*<td class="school-recipe-demand-record-dates"[^>]*>2026-09-07、2026-09-08<\/td>\s*<td>2026-09-06 07:30:00<\/td>\s*<td>第一食堂<\/td>/);
  assert.match(body.innerHTML, /2026-09-09/);
  assert.match(body.innerHTML, /2026-09-08 07:30:00/);
  assert.match(body.innerHTML, /<td>食材需求填报<\/td>/);
  assert.match(body.innerHTML, /<td>干调需求填报<\/td>/);

  inputs['#schoolRecipeDemandRecordType'].value = 'ingredient';
  inputs['#schoolRecipeDemandRecordUsageDate'].value = '';
  listeners.form.submit({ preventDefault() {} });
  assert.match(body.innerHTML, /XQ202609080001/);
  assert.doesNotMatch(body.innerHTML, /XQ202609070001|XQ202609100001/);

  inputs['#schoolRecipeDemandRecordType'].value = 'auxiliary';
  listeners.form.submit({ preventDefault() {} });
  assert.match(body.innerHTML, /XQ202609100001/);
  assert.doesNotMatch(body.innerHTML, /XQ202609070001|XQ202609080001/);

  inputs['#schoolRecipeDemandRecordType'].value = 'recipe';
  listeners.form.submit({ preventDefault() {} });
  assert.match(body.innerHTML, /XQ202609070001/);
  assert.doesNotMatch(body.innerHTML, /XQ202609080001|XQ202609100001/);

  inputs['#schoolRecipeDemandRecordKeyword'].value = 'XQ20260908';
  inputs['#schoolRecipeDemandRecordType'].value = 'ingredient';
  inputs['#schoolRecipeDemandRecordSubmittedDate'].value = '2026-09-06';
  inputs['#schoolRecipeDemandRecordUsageDate'].value = '2026-09-09';
  inputs['#schoolRecipeDemandRecordExpectedAt'].value = '2026-09-08';
  listeners.page.click({ target: { closest: () => ({ dataset: { action: 'reset' } }) } });
  assert.equal(inputs['#schoolRecipeDemandRecordKeyword'].value, '');
  assert.equal(inputs['#schoolRecipeDemandRecordType'].value, 'all');
  assert.equal(inputs['#schoolRecipeDemandRecordSubmittedDate'].value, '');
  assert.equal(inputs['#schoolRecipeDemandRecordUsageDate'].value, '');
  assert.equal(inputs['#schoolRecipeDemandRecordExpectedAt'].value, '');
  assert.match(body.innerHTML, /XQ202609070001[\s\S]*XQ202609080001[\s\S]*XQ202609100001/);

  inputs['#schoolRecipeDemandRecordType'].value = 'all';

  inputs['#schoolRecipeDemandRecordUsageDate'].value = '2026-09-09';
  listeners.form.submit({ preventDefault() {} });
  assert.match(body.innerHTML, /XQ202609080001/);
  assert.doesNotMatch(body.innerHTML, /XQ202609070001/);

  inputs['#schoolRecipeDemandRecordUsageDate'].value = '';
  inputs['#schoolRecipeDemandRecordExpectedAt'].value = '2026-09-06';
  listeners.form.submit({ preventDefault() {} });
  assert.match(body.innerHTML, /XQ202609070001/);
  assert.doesNotMatch(body.innerHTML, /XQ202609080001/);
});
