(function () {
  const defaults = {
    addOperationProduct: true,
    marketInquiryPriceMode: 'min',
    orderCutoffDays: '0',
    orderCutoffTime: '',
    orderPricePriority1: '协议价',
    orderPricePriority2: '近一次销售价',
    orderPricePriority3: '手动定价',
    orderPricePriority4: '市场价',
    allowClientEditPrice: false,
    purchasePriceMode: '竞价模式',
    purchasePricePriority1: '中标价',
    purchasePricePriority2: '近一次采购价',
    purchasePricePriority3: '近一次采购价',
    purchasePricePriority4: '',
    purchasePricePriority5: '',
    purchasePricePriority6: '',
    autoInbound: false,
    sortingLowerThreshold: '',
    sortingUpperThreshold: '',
    sortingBlock: false,
    sortingNoShip: false,
    printerType: '佳博',
    autoOutbound: false,
    refrigeratedTempMin: '',
    refrigeratedTempMax: '',
    refrigeratedHumidityMin: '',
    refrigeratedHumidityMax: '',
    regularTempMin: '',
    regularTempMax: '',
    regularHumidityMin: '',
    regularHumidityMax: '',
    amountDecimal: '2',
    quantityDecimal: '0'
  };

  const selectOptions = {
    orderPricePriority1: ['手动定价', '近一次销售价', '市场价', '协议价'],
    orderPricePriority2: ['近一次销售价', '手动定价', '市场价', '协议价'],
    orderPricePriority3: ['市场价', '手动定价', '近一次销售价', '协议价'],
    orderPricePriority4: ['协议价', '市场价', '近一次销售价', '手动定价'],
    purchasePriceMode: ['订价模式', '竞价模式', '订价+竞价模式'],
    purchasePricePriority1: ['中标价', '协议价', '近一次采购价', '供应商报价', '市场价', '手动定价'],
    purchasePricePriority2: ['中标价', '协议价', '近一次采购价', '供应商报价', '市场价', '手动定价'],
    purchasePricePriority3: ['中标价', '协议价', '近一次采购价', '供应商报价', '市场价', '手动定价'],
    purchasePricePriority4: ['中标价', '协议价', '近一次采购价', '供应商报价', '市场价', '手动定价'],
    purchasePricePriority5: ['中标价', '协议价', '近一次采购价', '供应商报价', '市场价', '手动定价'],
    purchasePricePriority6: ['中标价', '协议价', '近一次采购价', '供应商报价', '市场价', '手动定价'],
    printerType: ['佳博', '佳能', '惠普', '其他']
  };

  const purchasePriorityProfiles = {
    '订价模式': {
      count: 5,
      options: ['协议价', '近一次采购价', '供应商报价', '市场价', '手动定价']
    },
    '竞价模式': {
      count: 3,
      optionsByPosition: [
        ['中标价'],
        ['近一次采购价', '市场价'],
        ['近一次采购价', '市场价']
      ]
    },
    '订价+竞价模式': {
      count: 6,
      optionsByPosition: [
        ['中标价'],
        ['协议价', '近一次采购价', '供应商报价', '市场价', '手动定价'],
        ['协议价', '近一次采购价', '供应商报价', '市场价', '手动定价'],
        ['协议价', '近一次采购价', '供应商报价', '市场价', '手动定价'],
        ['协议价', '近一次采购价', '供应商报价', '市场价', '手动定价'],
        ['协议价', '近一次采购价', '供应商报价', '市场价', '手动定价']
      ]
    }
  };

  const purchaseModeAliases = { '询价模式': '订价模式', '协议价模式': '订价模式' };
  const normalizePurchaseMode = (mode) => {
    const normalized = purchaseModeAliases[mode] || mode;
    return purchasePriorityProfiles[normalized] ? normalized : '竞价模式';
  };
  const purchasePriorityOptions = (mode, index) => {
    const profile = purchasePriorityProfiles[normalizePurchaseMode(mode)];
    return profile.optionsByPosition?.[index - 1] || profile.options || [];
  };
  const optionMarkupFromValues = (values, includeBlank = false) => `${includeBlank ? '<option value=""></option>' : ''}${values.map((option) => `<option value="${option}">${option}</option>`).join('')}`;
  const optionMarkup = (key, includeBlank = false) => optionMarkupFromValues(selectOptions[key], includeBlank);
  const help = (text) => `<span class="config-help" title="${text}" aria-label="${text}">?</span>`;
  const clearButton = (key) => `<button class="config-clear" type="button" data-clear="${key}">清空</button>`;
  const configSelect = (key, className = '', options = {}) => `<select class="config-select ${className}" data-config="${key}" aria-label="${key}" ${options.disabled ? 'disabled' : ''}>${optionMarkupFromValues(options.values || selectOptions[key], options.includeBlank)}</select>`;
  const purchasePrioritySelect = (index) => {
    const key = `purchasePricePriority${index}`;
    return configSelect(key, '', { includeBlank: true, values: purchasePriorityOptions(defaults.purchasePriceMode, index) });
  };
  const configInput = (key, placeholder = '请输入', className = '') => `<input class="config-input ${className}" data-config="${key}" placeholder="${placeholder}" autocomplete="off">`;
  const configCheckbox = (key, label, helpText = '') => `<label class="config-checkbox"><input type="checkbox" data-config="${key}"><span class="config-checkmark"></span><span>${label}</span>${helpText ? help(helpText) : ''}</label>`;
  const configRadio = (key, value, label) => `<label class="config-radio"><input type="radio" name="${key}" value="${value}" data-radio-config="${key}"><span class="config-radiomark"></span><span>${label}</span></label>`;

  const content = `
    <section class="page-card system-config-page" aria-label="业务配置">
      <div class="system-config-scroll">
        <h2 class="system-config-title">商品配置</h2>
        <div class="config-row product-permission-row">
          <div class="config-label">供应商管理商品权限</div>
          ${configCheckbox('addOperationProduct', '添加操作商品', '供应商添加商品后是否自动加入操作商品')}
        </div>

        <h2 class="system-config-title">市场询价配置</h2>
        <div class="config-row market-price-row">
          <div class="config-label">市场询价商品第一行最终确认价格</div>
          <div class="config-radio-group">
            ${configRadio('marketInquiryPriceMode', 'min', '按填写的询价市场价最低价回显')}
            ${configRadio('marketInquiryPriceMode', 'avg', '按填写的询价市场价平均价回显')}
            ${configRadio('marketInquiryPriceMode', 'empty', '默认回显为空')}
          </div>
        </div>

        <h2 class="system-config-title">订单配置</h2>
        <div class="config-row cutoff-row">
          <div class="config-label">截单时间</div>
          <div class="config-inline-fields">
            <span>提前</span>${configInput('orderCutoffDays', '请输入', 'config-days-input')}<span>天</span>${clearButton('orderCutoffDays')}
            <span class="config-time-wrap">${configInput('orderCutoffTime', '选择时间', 'config-time-input')}<span class="config-clock">◷</span></span>${clearButton('orderCutoffTime')}
          </div>
        </div>
        <div class="config-row priority-row">
          <div class="config-label">下单单价取值优先级</div>
          <div class="config-priority-group">
            <span>1.</span>${configSelect('orderPricePriority1')}
            <span>2.</span>${configSelect('orderPricePriority2', '', { includeBlank: true })}
            <span>3.</span>${configSelect('orderPricePriority3', '', { includeBlank: true })}
            <span>4.</span>${configSelect('orderPricePriority4', '', { includeBlank: true })}
          </div>
        </div>
        <div class="config-row permission-row">
          <div class="config-label">客户端下单修改单价权限</div>
          ${configCheckbox('allowClientEditPrice', '修改单价')}
        </div>

        <h2 class="system-config-title">采购配置</h2>
        <div class="config-row purchase-mode-row">
          <div class="config-label">采购价模式</div>
          ${configSelect('purchasePriceMode')}
        </div>
        <div class="config-row priority-row purchase-priority-row">
          <div class="config-label">采购单价取值优先级</div>
          <div class="config-priority-group">
            <span data-purchase-priority-index="1">1.</span>${purchasePrioritySelect(1)}
            <span data-purchase-priority-index="2">2.</span>${purchasePrioritySelect(2)}
            <span data-purchase-priority-index="3">3.</span>${purchasePrioritySelect(3)}
            <span data-purchase-priority-index="4">4.</span>${purchasePrioritySelect(4)}
            <span data-purchase-priority-index="5">5.</span>${purchasePrioritySelect(5)}
            <span data-purchase-priority-index="6">6.</span>${purchasePrioritySelect(6)}
            <button class="config-apply" type="button" data-action="apply-purchase">应用</button>
          </div>
        </div>
        <div class="config-row permission-row">
          <div class="config-label">采购单收货${help('收货完成后可按配置自动生成入库记录')}</div>
          ${configCheckbox('autoInbound', '自动入库')}
        </div>

        <h2 class="system-config-title">分拣配置</h2>
        <div class="config-row threshold-row">
          <div class="config-label">分拣阈值</div>
          <div class="threshold-fields">
            <div class="threshold-line">数量低于 ${configInput('sortingLowerThreshold')}<span>%，系统进行通知，如果不需要则留空</span>${clearButton('sortingLowerThreshold')}</div>
            <div class="threshold-line">数量高于 ${configInput('sortingUpperThreshold')}<span>%，系统进行通知，如果不需要则留空</span>${clearButton('sortingUpperThreshold')}</div>
            ${configCheckbox('sortingBlock', '超过阈值不能分拣')}
            ${configCheckbox('sortingNoShip', '商品未分拣禁止发货')}
          </div>
        </div>
        <div class="config-row printer-row">
          <div class="config-label">打印机设置</div>
          ${configSelect('printerType', 'printer-select')}
        </div>

        <h2 class="system-config-title">发货配置</h2>
        <div class="config-row permission-row shipping-row">
          <div class="config-label">发货出库${help('勾选后发货完成会自动生成出库结果')}</div>
          ${configCheckbox('autoOutbound', '自动出库（注：出库单价为0的商品，勾选后无法自动完成出库）')}
        </div>

        <h2 class="system-config-title">配送配置</h2>
        <div class="config-row vehicle-row">
          <div class="config-label vehicle-label">冷藏车</div>
          <div class="vehicle-fields">
            <div class="vehicle-line">预警温度下限 ${configInput('refrigeratedTempMin')}<span>℃</span>预警温度上限 ${configInput('refrigeratedTempMax')}<span>℃</span>${clearButton('refrigeratedTempMin,refrigeratedTempMax')}</div>
            <div class="vehicle-line">预警湿度下限 ${configInput('refrigeratedHumidityMin')}<span>℃</span>预警湿度上限 ${configInput('refrigeratedHumidityMax')}<span>℃</span>${clearButton('refrigeratedHumidityMin,refrigeratedHumidityMax')}</div>
          </div>
        </div>
        <div class="config-row vehicle-row">
          <div class="config-label vehicle-label">普通车</div>
          <div class="vehicle-fields">
            <div class="vehicle-line">预警温度下限 ${configInput('regularTempMin')}<span>℃</span>预警温度上限 ${configInput('regularTempMax')}<span>℃</span>${clearButton('regularTempMin,regularTempMax')}</div>
            <div class="vehicle-line">预警湿度下限 ${configInput('regularHumidityMin')}<span>℃</span>预警湿度上限 ${configInput('regularHumidityMax')}<span>℃</span>${clearButton('regularHumidityMin,regularHumidityMax')}</div>
          </div>
        </div>

        <h2 class="system-config-title">通用配置</h2>
        <div class="config-row decimal-row">
          <div class="config-label">金额小数位配置</div>
          <div class="config-radio-group compact-radio-group">
            ${configRadio('amountDecimal', '0', '整数')}
            ${configRadio('amountDecimal', '1', '1位')}
            ${configRadio('amountDecimal', '2', '2位数')}
            ${configRadio('amountDecimal', '4', '4位')}
          </div>
        </div>
        <div class="config-row decimal-row">
          <div class="config-label">数量小数位配置</div>
          <div class="config-radio-group compact-radio-group">
            ${configRadio('quantityDecimal', '0', '整数')}
            ${configRadio('quantityDecimal', '1', '1位')}
            ${configRadio('quantityDecimal', '2', '2位数')}
            ${configRadio('quantityDecimal', '4', '4位')}
          </div>
        </div>
      </div>
      <div class="config-toast" id="configStatus" role="status" aria-live="polite" hidden>配置已保存</div>
    </section>`;

  const root = window.AppShell.mount({ title: '业务配置', content });
  const persistedSettings = window.DemoStore.getSettings() || {};
  let savedSettings = { ...defaults, ...persistedSettings };
  let pendingScrollPosition = null;

  function readScrollPosition() {
    const scroll = root.querySelector('.system-config-scroll');
    return {
      scrollTop: scroll?.scrollTop || 0,
      pageTop: window.scrollY || 0
    };
  }

  function restoreScrollPosition(position) {
    if (!position) return;
    const scroll = root.querySelector('.system-config-scroll');
    if (scroll) scroll.scrollTop = position.scrollTop;
    if (typeof window.scrollTo === 'function') window.scrollTo(0, position.pageTop);
    const restore = () => {
      if (scroll) scroll.scrollTop = position.scrollTop;
      if (typeof window.scrollTo === 'function') window.scrollTo(0, position.pageTop);
    };
    if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(restore);
    else window.setTimeout(restore, 0);
  }

  function updatePurchasePriorityFields(mode) {
    const normalizedMode = normalizePurchaseMode(mode);
    const profile = purchasePriorityProfiles[normalizedMode];
    root.querySelectorAll('[data-purchase-priority-index]').forEach((label) => {
      const index = Number(label.dataset.purchasePriorityIndex);
      const select = root.querySelector(`[data-config="purchasePricePriority${index}"]`);
      if (!select) return;
      const currentValue = select.value;
      const options = purchasePriorityOptions(normalizedMode, index);
      select.innerHTML = optionMarkupFromValues(options, true);
      select.value = options.includes(currentValue) ? currentValue : '';
      const active = index <= profile.count;
      label.hidden = !active;
      select.hidden = !active;
      label.setAttribute('aria-hidden', String(!active));
      select.setAttribute('aria-hidden', String(!active));
    });
  }

  function applySettingsToForm() {
    root.querySelectorAll('[data-config]').forEach((element) => {
      const key = element.dataset.config;
      if (element.type === 'checkbox') element.checked = Boolean(savedSettings[key]);
      else if (key === 'purchasePriceMode') element.value = normalizePurchaseMode(savedSettings[key]);
      else element.value = savedSettings[key] ?? '';
    });
    updatePurchasePriorityFields(root.querySelector('[data-config="purchasePriceMode"]')?.value);
    root.querySelectorAll('[data-radio-config]').forEach((element) => {
      element.checked = String(savedSettings[element.dataset.radioConfig] ?? defaults[element.dataset.radioConfig]) === element.value;
    });
  }

  function readFormSettings() {
    const next = {};
    root.querySelectorAll('[data-config]').forEach((element) => {
      const key = element.dataset.config;
      next[key] = element.type === 'checkbox' ? element.checked : element.value;
    });
    root.querySelectorAll('[data-radio-config]:checked').forEach((element) => {
      next[element.dataset.radioConfig] = element.value;
    });
    return next;
  }

  function persistSettings() {
    const scrollPosition = pendingScrollPosition || readScrollPosition();
    const next = readFormSettings();
    window.DemoStore.updateSettings(next);
    savedSettings = Object.assign(savedSettings, next);
    restoreScrollPosition(scrollPosition);
    pendingScrollPosition = null;
    const status = root.querySelector('#configStatus');
    status.hidden = false;
    window.clearTimeout(status._hideTimer);
    status._hideTimer = window.setTimeout(() => { status.hidden = true; }, 1600);
  }

  applySettingsToForm();

  root.addEventListener('pointerdown', (event) => {
    if (event.target.closest('[data-config], [data-radio-config], .config-radio, .config-checkbox, [data-clear]')) {
      pendingScrollPosition = readScrollPosition();
    }
  }, true);
  root.addEventListener('focusin', (event) => {
    if (!pendingScrollPosition && event.target.matches('[data-config], [data-radio-config]')) {
      pendingScrollPosition = readScrollPosition();
    }
  }, true);

  root.addEventListener('change', (event) => {
    if (event.target.matches('[data-config], [data-radio-config]')) {
      if (event.target.dataset.config === 'purchasePriceMode') updatePurchasePriorityFields(event.target.value);
      persistSettings();
    }
  });
  root.addEventListener('input', (event) => {
    if (event.target.matches('.config-input')) persistSettings();
  });
  root.addEventListener('click', (event) => {
    const clear = event.target.closest('[data-clear]');
    if (clear) {
      clear.dataset.clear.split(',').forEach((key) => {
        const input = root.querySelector(`[data-config="${key}"]`);
        if (input) input.value = '';
      });
      persistSettings();
    }
    if (event.target.closest('[data-action="apply-purchase"]')) persistSettings();
  });
})();
