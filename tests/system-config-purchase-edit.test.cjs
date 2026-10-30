const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { loadApp, root } = require('./helpers/app-context.cjs');

test('需求填报采购量限制参数直接编辑且只有应用按钮会提交', () => {
  const styles = fs.readFileSync(path.join(root, 'assets/css/system-config.css'), 'utf8');
  assert.match(styles, /\.recipe-purchase-edit-actions\[hidden\]\s*\{\s*display:\s*none !important;/);
  const { context } = loadApp();
  const savedSettings = {
    allowRecipeDemandPurchaseQuantityEdit: true,
    recipePurchaseQtyChangeThresholdMode: 'quantity',
    recipePurchaseQtyChangeLowerLimitValue: '',
    recipePurchaseQtyChangeUpperLimitValue: '',
    recipeDeliveryAdvanceDays: '0',
    recipeDeliveryTime: '07:30',
    orderCutoffDays: '0'
  };
  const updates = [];
  context.DemoStore = {
    getSettings: () => ({ ...savedSettings }),
    updateSettings: (next) => updates.push({ ...next })
  };

  const values = new Map();
  const makeControl = (key, value, type = 'text', classNames = []) => {
    const control = {
      tagName: type === 'select-one' ? 'SELECT' : 'INPUT',
      type,
      value,
      checked: Boolean(value),
      disabled: false,
      readOnly: false,
      hidden: false,
      dataset: { config: key },
      classes: new Set(classNames),
      matches(selector) {
        if (selector === '[data-config], [data-radio-config]') return Boolean(this.dataset.config);
        if (selector === '.recipe-purchase-limit-value' || selector === '.config-input') return this.classes.has(selector.slice(1));
        return false;
      },
      focus() { this.focused = true; }
    };
    values.set(key, control);
    return control;
  };

  const allowEdit = makeControl('allowRecipeDemandPurchaseQuantityEdit', true, 'checkbox');
  const mode = makeControl('recipePurchaseQtyChangeThresholdMode', 'quantity', 'select-one');
  const lower = makeControl('recipePurchaseQtyChangeLowerLimitValue', '', 'text', ['config-input', 'recipe-purchase-limit-value']);
  const upper = makeControl('recipePurchaseQtyChangeUpperLimitValue', '', 'text', ['config-input', 'recipe-purchase-limit-value']);
  const deliveryDays = makeControl('recipeDeliveryAdvanceDays', '0', 'number');
  const deliveryTime = makeControl('recipeDeliveryTime', '07:30', 'time');
  const cutoffDays = makeControl('orderCutoffDays', '0', 'text', ['config-input']);
  const actions = Object.fromEntries(['edit-recipe-delivery', 'apply-recipe-delivery', 'cancel-recipe-delivery',
    'apply-recipe-purchase'].map((action) => [action, { hidden: false }]));
  const units = [{ textContent: '' }, { textContent: '' }];
  const limitLabels = [
    { dataset: { recipePurchaseLimitLabel: 'minimum' }, textContent: '' },
    { dataset: { recipePurchaseLimitLabel: 'maximum' }, textContent: '' }
  ];
  const closingParentheses = [{ hidden: false }, { hidden: false }];
  const roundingHints = [{ hidden: false }, { hidden: false }];
  const limitSettings = { hidden: false };
  const editActions = { hidden: false };
  const status = { hidden: true, classList: { toggle() {} } };
  const scroll = { scrollTop: 0 };
  const makeRow = () => ({ classList: { values: new Set(), toggle(name, enabled) { enabled ? this.values.add(name) : this.values.delete(name); } } });
  const purchaseRow = makeRow();
  const deliveryRow = makeRow();
  const listeners = {};
  let pageMarkup = '';

  const rootElement = {
    querySelector(selector) {
      const configMatch = selector.match(/^\[data-config="([^"]+)"\]$/);
      if (configMatch) return values.get(configMatch[1]) || null;
      const actionMatch = selector.match(/^\[data-action="([^"]+)"\]$/);
      if (actionMatch) return actions[actionMatch[1]] || null;
      if (selector === '.recipe-purchase-limit-settings') return limitSettings;
      if (selector === '.recipe-purchase-edit-actions') return editActions;
      if (selector === '.recipe-purchase-edit-row') return purchaseRow;
      if (selector === '.recipe-delivery-row') return deliveryRow;
      if (selector === '.system-config-scroll') return scroll;
      if (selector === '#configStatus') return status;
      if (selector === '[data-config="purchasePriceMode"]') return null;
      return null;
    },
    querySelectorAll(selector) {
      if (selector === '[data-config]') return [...values.values()];
      if (selector === '[data-radio-config]' || selector === '[data-radio-config]:checked' || selector === '[data-purchase-priority-index]') return [];
      if (selector === '[data-recipe-purchase-limit-unit]') return units;
      if (selector === '[data-recipe-purchase-limit-label]') return limitLabels;
      if (selector === '[data-recipe-purchase-limit-close]') return closingParentheses;
      if (selector === '[data-recipe-purchase-limit-rounding-hint]') return roundingHints;
      if (selector === '.recipe-purchase-limit-value') return [lower, upper];
      return [];
    },
    addEventListener(type, listener) { listeners[type] = listener; }
  };

  context.AppShell = { mount: ({ content }) => { pageMarkup = content; return rootElement; } };
  context.scrollY = 0;
  context.scrollTo = () => {};
  context.setTimeout = () => 1;
  context.clearTimeout = () => {};
  vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/pages/system-config.js'), 'utf8'), context);

  const purchaseActionsMarkup = pageMarkup.match(/recipe-purchase-edit-actions">([\s\S]*?)<\/div>/)?.[1] || '';
  assert.match(purchaseActionsMarkup, /data-action="apply-recipe-purchase">应用<\/button>/);
  assert.doesNotMatch(purchaseActionsMarkup, /data-action="(?:edit|save|cancel)-recipe-purchase"/);
  assert.match(pageMarkup, /data-recipe-purchase-limit-rounding-hint hidden>标品数量限制按计算结果向下取整<\/span>/);
  assert.match(pageMarkup, /data-recipe-purchase-limit-rounding-hint hidden>标品数量限制按计算结果向上取整<\/span>/);
  assert.ok(pageMarkup.indexOf('recipe-purchase-limit-mode-fields"') < pageMarkup.indexOf('recipe-purchase-edit-actions"'));
  assert.ok(pageMarkup.indexOf('recipe-purchase-edit-actions"') < pageMarkup.indexOf('recipe-purchase-limit-bound-row"'));
  assert.equal(lower.value, '');
  assert.equal(upper.value, '');
  const click = (action) => listeners.click({ target: { closest: (selector) => selector === `[data-action="${action}"]` ? actions[action] : null } });
  const fire = (type, control) => listeners[type]({ target: control });
  assert.equal(allowEdit.disabled, false);
  assert.equal(mode.disabled, false);
  assert.equal(lower.readOnly, false);
  assert.equal(upper.readOnly, false);
  assert.equal(actions['apply-recipe-purchase'].hidden, false);
  assert.equal(actions['cancel-recipe-purchase'], undefined);
  assert.deepEqual(limitLabels.map((label) => label.textContent), ['最小数量 = 采购量 −', '最大数量 = 采购量 +']);
  assert.deepEqual(closingParentheses.map((element) => element.hidden), [true, true]);

  lower.value = '7.500';
  fire('input', lower);
  mode.value = 'percentage';
  fire('change', mode);
  assert.deepEqual(updates, []);
  assert.deepEqual(units.map((unit) => unit.textContent), ['%', '%']);
  assert.deepEqual(limitLabels.map((label) => label.textContent), [
    '最小数量 = 采购量 ×（1 −', '最大数量 = 采购量 ×（1 +'
  ]);
  assert.deepEqual(closingParentheses.map((element) => element.hidden), [false, false]);
  assert.deepEqual(roundingHints.map((hint) => hint.hidden), [false, false]);

  allowEdit.checked = false;
  fire('change', allowEdit);
  assert.equal(limitSettings.hidden, true);
  assert.equal(editActions.hidden, true);
  assert.equal(updates.length, 1);
  assert.equal(updates[0].allowRecipeDemandPurchaseQuantityEdit, false);
  assert.equal(updates[0].recipePurchaseQtyChangeThresholdMode, 'quantity');
  assert.equal(updates[0].recipePurchaseQtyChangeLowerLimitValue, '');
  allowEdit.checked = true;
  fire('change', allowEdit);
  assert.equal(limitSettings.hidden, false);

  cutoffDays.value = '3';
  fire('input', cutoffDays);
  assert.equal(updates.length, 3);
  assert.equal(updates[2].orderCutoffDays, '3');
  assert.equal(updates[2].recipePurchaseQtyChangeThresholdMode, 'quantity');
  assert.equal(updates[2].recipePurchaseQtyChangeLowerLimitValue, '');

  click('apply-recipe-purchase');
  assert.equal(updates.length, 4);
  assert.equal(updates[3].recipePurchaseQtyChangeThresholdMode, 'percentage');
  assert.equal(updates[3].recipePurchaseQtyChangeLowerLimitValue, '7.5');
  assert.equal(updates[3].recipePurchaseQtyChangeUpperLimitValue, '');
  assert.equal(units[0].textContent, '%');
  assert.deepEqual(roundingHints.map((hint) => hint.hidden), [false, false]);

  mode.value = 'quantity';
  fire('change', mode);
  assert.deepEqual(units.map((unit) => unit.textContent), ['计量单位', '计量单位']);
  assert.deepEqual(limitLabels.map((label) => label.textContent), ['最小数量 = 采购量 −', '最大数量 = 采购量 +']);
  assert.deepEqual(closingParentheses.map((element) => element.hidden), [true, true]);
  assert.deepEqual(roundingHints.map((hint) => hint.hidden), [true, true]);

  mode.value = 'percentage';
  fire('change', mode);
  lower.value = '8.500';
  upper.value = '120';
  click('apply-recipe-purchase');
  assert.equal(updates.length, 5);
  assert.equal(updates[4].allowRecipeDemandPurchaseQuantityEdit, true);
  assert.equal(updates[4].recipePurchaseQtyChangeThresholdMode, 'percentage');
  assert.equal(updates[4].recipePurchaseQtyChangeLowerLimitValue, '8.5');
  assert.equal(updates[4].recipePurchaseQtyChangeUpperLimitValue, '120');
  assert.equal(allowEdit.disabled, false);
  assert.equal(mode.disabled, false);
  assert.equal(lower.readOnly, false);
  assert.equal(actions['apply-recipe-purchase'].hidden, false);

  allowEdit.checked = false;
  fire('change', allowEdit);
  assert.equal(updates.length, 6);
  assert.equal(updates[5].allowRecipeDemandPurchaseQuantityEdit, false);
  assert.equal(limitSettings.hidden, true);
  assert.equal(editActions.hidden, true);
});
