const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { root } = require('./helpers/app-context.cjs');

test('需求提交记录显示用料日期和期望送达时间，并按期望送达日期筛选', () => {
  const records = [
    {
      id: 'record-one', recordNo: 'XQ202609070001', canteen: '第一食堂', dates: ['2026-09-07', '2026-09-08'],
      expectedAt: '2026-09-06 07:30:00', submittedAt: '2026-09-05 16:20:00', submittedBy: '管理员',
      totalPersonTimes: 120, productCount: 3, orders: [{ id: 'order-one' }]
    },
    {
      id: 'record-two', recordNo: 'XQ202609080001', canteen: '第一食堂', dateSummaries: [{ date: '2026-09-09' }],
      orders: [{ id: 'order-two', expectedAt: '2026-09-08 07:30:00' }], submittedAt: '2026-09-06 16:20:00',
      submittedBy: '管理员', totalPersonTimes: 80, productCount: 2
    }
  ];
  const inputs = {
    '#schoolRecipeDemandRecordKeyword': { value: '' },
    '#schoolRecipeDemandRecordSubmittedDate': { value: '' },
    '#schoolRecipeDemandRecordExpectedAt': { value: '' }
  };
  const body = { innerHTML: '' };
  const listeners = { form: {}, page: {} };
  const form = { addEventListener(type, handler) { listeners.form[type] = handler; } };
  const page = {
    querySelector(selector) {
      if (selector === '#schoolRecipeDemandRecordKeyword'
        || selector === '#schoolRecipeDemandRecordSubmittedDate'
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
  context.DatePicker = { create: () => ({ clear() {} }) };
  context.Pagination = { create: () => ({ getState: () => ({ page: 1, pageSize: 20 }), update() {} }) };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/pages/school-recipe-demand-records.js'), 'utf8'), context);

  assert.match(context.mountedContent, /<th>提交时间<\/th><th>用料日期<\/th><th>期望送达时间<\/th><th>操作<\/th>/);
  assert.match(context.mountedContent, /id="schoolRecipeDemandRecordExpectedAt"/);
  assert.match(body.innerHTML, /2026-09-07、2026-09-08/);
  assert.match(body.innerHTML, /2026-09-06 07:30:00/);
  assert.match(body.innerHTML, /2026-09-09/);
  assert.match(body.innerHTML, /2026-09-08 07:30:00/);

  inputs['#schoolRecipeDemandRecordExpectedAt'].value = '2026-09-06';
  listeners.form.submit({ preventDefault() {} });
  assert.match(body.innerHTML, /XQ202609070001/);
  assert.doesNotMatch(body.innerHTML, /XQ202609080001/);
});
