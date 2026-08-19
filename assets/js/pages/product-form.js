(function () {
  const parameters = new URLSearchParams(window.location.search);
  const productId = parameters.get('id');
  const pageMode = parameters.get('mode');
  const isViewMode = pageMode === 'view';
  const isEditMode = !isViewMode && (pageMode === 'edit' || Boolean(productId));
  const pageTitle = isViewMode ? '商品详情' : (isEditMode ? '编辑商品' : '添加商品');
  const editLockedFields = ['category', 'name', 'unit', 'isNetVegetable'];
  let previousPurchaseType = '供应商送货';
  const template = document.getElementById('productFormTemplate');

  window.AppShell.mount({
    // 添加/编辑商品是商品管理的下钻页，不作为独立导航页面显示。
    title: '商品管理',
    content: template.innerHTML
  });

  const form = document.getElementById('productForm');
  const status = document.getElementById('formStatus');
  const imageInput = document.getElementById('imageFile');
  const fieldNames = [
    'category',
    'name',
    'isNetVegetable',
    'correspondingFood',
    'purchaseType',
    'defaultSupplier',
    'responsible',
    'unit',
    'marketPrice',
    'multiUnit',
    'brand',
    'spec',
    'origin',
    'indicatorDescription',
    'alias',
    'netContent',
    'netContentUnit',
    'qualificationCertificate',
    'isWeighed',
    'conversionRate',
    'shelfLife',
    'shelfLifeValue',
    'shelfLifeUnit',
    'shelfLifeWarning',
    'expiryCalculationMethod',
    'multiUnitName1', 'multiUnitRate1', 'multiUnitPrice1',
    'multiUnitName2', 'multiUnitRate2', 'multiUnitPrice2'
  ];

  function showStatus(message, type) {
    status.textContent = message;
    status.className = `form-status visible ${type}`;
  }

  function clearErrors() {
    form.querySelectorAll('[data-error-for]').forEach((element) => { element.textContent = ''; });
    form.querySelectorAll('[aria-invalid="true"]').forEach((element) => element.removeAttribute('aria-invalid'));
  }

  function readForm() {
    const data = {};
    fieldNames.forEach((name) => {
      if (name === 'purchaseType') {
        data[name] = form.querySelector('[name="purchaseType"]:checked')?.value || '';
      } else if (name === 'multiUnit' || name === 'isNetVegetable' || name === 'isWeighed' || name === 'shelfLife') {
        data[name] = Boolean(form.elements[name]?.checked);
      } else {
        data[name] = form.elements[name]?.value.trim() || '';
      }
    });
    data.shelfLifeEnabled = data.shelfLife;
    data.shelfLife = data.shelfLife && data.shelfLifeValue && data.shelfLifeUnit
      ? `${data.shelfLifeValue}${data.shelfLifeUnit}`
      : '';
    data.imageName = imageInput.files[0]?.name || form.dataset.imageName || '';
    return data;
  }

  function showErrors(errors) {
    clearErrors();
    Object.entries(errors).forEach(([field, message]) => {
      const messageElement = form.querySelector(`[data-error-for="${field}"]`);
      if (messageElement) messageElement.textContent = message;
      const control = form.elements[field];
      if (control && !('length' in control && !control.tagName)) control.setAttribute('aria-invalid', 'true');
    });
    const firstField = Object.keys(errors)[0];
    const firstControl = form.elements[firstField];
    if (firstControl?.focus) firstControl.focus();
  }

  function fillForm(product) {
    fieldNames.forEach((name) => {
      if (name === 'purchaseType') {
        const expectedValue = product[name] || '供应商送货';
        const radio = Array.from(form.elements.purchaseType).find((item) => item.value === expectedValue);
        if (radio) radio.checked = true;
        return;
      }
      if (name === 'multiUnit' || name === 'isNetVegetable' || name === 'isWeighed' || name === 'shelfLife') {
        form.elements[name].checked = Boolean(product[name]);
        return;
      }
      if (form.elements[name]) form.elements[name].value = product[name] || '';
    });

    const shelfLifeMatch = String(product.shelfLife || '').match(/^(\d+)(天|月|年)$/);
    if (shelfLifeMatch) {
      form.elements.shelfLife.checked = true;
      form.elements.shelfLifeValue.value = shelfLifeMatch[1];
      form.elements.shelfLifeUnit.value = shelfLifeMatch[2];
    }
    if (form.elements.shelfLifeWarning) {
      form.elements.shelfLifeWarning.value = product.shelfLifeWarning || '';
    }

    if (product.imageName) {
      form.dataset.imageName = product.imageName;
      document.getElementById('imageButtonText').textContent = '重新选择';
      document.getElementById('imageTip').textContent = `当前图片：${product.imageName}`;
    }
  }

  function returnToList() {
    window.AppNavigation?.navigate?.('./index.html');
  }

  function updateConversionRateLabel() {
    document.getElementById('conversionRateUnit').textContent = form.elements.unit?.value || '--';
  }

  function updateConversionRateVisibility() {
    const weighingSwitch = document.getElementById('isWeighed');
    const conversionRateField = document.querySelector('.conversion-rate-field');
    if (!weighingSwitch || !conversionRateField) return;
    conversionRateField.classList.toggle('is-hidden', !weighingSwitch.checked);
  }

  function updateShelfLifeVisibility() {
    const shelfLifeSwitch = document.getElementById('shelfLife');
    const shelfLifeField = document.querySelector('.shelf-life-field');
    const warningField = document.querySelector('.shelf-life-warning-field');
    const methodField = document.querySelector('.shelf-life-method-field');
    if (!shelfLifeSwitch || !shelfLifeField || !warningField || !methodField) return;
    const isVisible = shelfLifeSwitch.checked;
    shelfLifeField.classList.toggle('is-hidden', !isVisible);
    warningField.classList.toggle('is-hidden', !isVisible);
    methodField.classList.toggle('is-hidden', !isVisible);
  }

  function updateMultiUnitVisibility() {
    const multiUnitSwitch = document.getElementById('multiUnit');
    const settings = document.querySelector('.multi-unit-settings');
    const heading = document.querySelector('.multi-unit-heading');
    const area = document.querySelector('.multi-unit-area');
    if (!multiUnitSwitch || !settings || !heading || !area) return;
    const isVisible = multiUnitSwitch.checked;
    area.classList.toggle('is-active', isVisible);
    settings.classList.toggle('is-hidden', !isVisible);
    settings.setAttribute('aria-hidden', String(!isVisible));
    heading.classList.toggle('is-hidden', !isVisible);
    heading.setAttribute('aria-hidden', String(!isVisible));
  }

  function updateProcurementFieldsVisibility() {
    const netVegetableSwitch = document.getElementById('isNetVegetable');
    const fields = document.querySelectorAll('.procurement-field');
    if (!netVegetableSwitch || !fields.length) return;
    document.querySelector('.form-grid')?.classList.toggle('net-vegetable-active', netVegetableSwitch.checked);
    fields.forEach((field) => field.classList.toggle('is-hidden', netVegetableSwitch.checked));
  }

  function updatePurchaseTypeOptions() {
    const netVegetableSwitch = document.getElementById('isNetVegetable');
    const purchaseTypeOptions = document.querySelectorAll('.purchase-type-option');
    const enterpriseOption = form.querySelector('[name="purchaseType"][value="企业自加工"]');
    if (!netVegetableSwitch || !enterpriseOption) return;

    if (netVegetableSwitch.checked) {
      const current = form.querySelector('[name="purchaseType"]:checked')?.value;
      if (current && current !== '企业自加工') previousPurchaseType = current;
      enterpriseOption.checked = true;
    } else if (form.querySelector('[name="purchaseType"]:checked')?.value === '企业自加工') {
      const restored = form.querySelector(`[name="purchaseType"][value="${previousPurchaseType}"]`)
        || form.querySelector('[name="purchaseType"][value="供应商送货"]');
      if (restored) restored.checked = true;
    }

    purchaseTypeOptions.forEach((option) => {
      const isEnterpriseOption = option.dataset.purchaseType === '企业自加工';
      const input = option.querySelector('input[name="purchaseType"]');
      option.classList.toggle('is-hidden', netVegetableSwitch.checked ? !isEnterpriseOption : isEnterpriseOption);
      if (input) input.disabled = false;
    });
  }

  function updateMultiUnitBaseLabels() {
    const unit = form.elements.unit?.value || '--';
    document.querySelectorAll('.multi-unit-base').forEach((element) => { element.textContent = unit; });
  }

  function updateEditLockedFields() {
    editLockedFields.forEach((fieldName) => {
      const field = document.getElementById(fieldName);
      if (field) field.disabled = isEditMode || isViewMode;
    });
    if (!isViewMode) return;
    form.querySelectorAll('input, select, textarea').forEach((field) => { field.disabled = true; });
    form.querySelectorAll('.number-stepper-button, [data-action="choose-image"]').forEach((button) => { button.disabled = true; });
    document.getElementById('submitButton').hidden = true;
    document.querySelector('[data-action="cancel"]').textContent = '返回';
    form.classList.add('is-readonly');
  }

  function readonlyValue(value) {
    const element = document.createElement('span');
    element.className = 'readonly-value';
    element.textContent = String(value || '--');
    return element;
  }

  function selectedText(select) {
    return select?.value ? select.options[select.selectedIndex]?.textContent : '';
  }

  function replaceReadonlyControl(control, value) {
    if (!control) return;
    let target = control.closest('.searchable-select, .number-stepper');
    if (control.type === 'checkbox') target = control.closest('.switch-control');
    (target || control).replaceWith(readonlyValue(value));
  }

  function renderReadonlyView() {
    if (!isViewMode) return;

    const combinedFields = [
      ['netContent', 'netContentUnit'],
      ['shelfLifeValue', 'shelfLifeUnit'],
      ['conversionRate']
    ];
    combinedFields.forEach(([valueName, unitName]) => {
      const valueControl = form.elements[valueName];
      if (!valueControl) return;
      const value = valueControl.value;
      const unit = unitName ? selectedText(form.elements[unitName]) : 'kg';
      const target = valueControl.closest('.net-content-control, .conversion-rate-control');
      if (target) target.replaceWith(readonlyValue(value ? `${value}${unit || ''}` : ''));
    });

    fieldNames.forEach((name) => {
      const control = form.elements[name];
      if (!control || ['netContentUnit', 'shelfLifeUnit', 'conversionRate'].includes(name)) return;
      if (name === 'purchaseType') {
        replaceReadonlyControl(form.querySelector('.radio-group'), form.querySelector('[name="purchaseType"]:checked')?.value);
        return;
      }
      if (control.type === 'checkbox') {
        replaceReadonlyControl(control, control.checked ? '是' : '否');
      } else if (control.tagName === 'SELECT') {
        replaceReadonlyControl(control, selectedText(control));
      } else {
        replaceReadonlyControl(control, control.value);
      }
    });

    const imageUpload = form.querySelector('.image-upload');
    if (imageUpload) imageUpload.replaceWith(readonlyValue(form.dataset.imageName));
    form.querySelectorAll('.field-error').forEach((element) => { element.remove(); });
  }

  function initSearchableSelects() {
    const selects = Array.from(form.querySelectorAll('select.form-control'));
    const plainSelects = new Set(['netContentUnit', 'shelfLifeUnit', 'expiryCalculationMethod', 'multiUnitName1', 'multiUnitName2']);
    const closeAll = (except) => {
      form.querySelectorAll('.searchable-select.is-open').forEach((element) => {
        if (element !== except) element.classList.remove('is-open');
      });
    };

    selects.forEach((select) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'searchable-select';
      const searchable = !plainSelects.has(select.id);
      if (!searchable) wrapper.classList.add('is-plain');
      if (select.disabled) wrapper.classList.add('is-disabled');
      select.parentNode.insertBefore(wrapper, select);
      wrapper.appendChild(select);
      select.classList.add('searchable-select-native');

      const input = document.createElement('input');
      input.className = 'form-control searchable-select-input';
      input.type = 'text';
      input.autocomplete = 'off';
      input.placeholder = '请选择';
      input.setAttribute('role', 'combobox');
      input.setAttribute('aria-expanded', 'false');
      input.setAttribute('aria-controls', `${select.id}-options`);
      input.readOnly = select.disabled || !searchable;

      const options = document.createElement('div');
      options.className = 'searchable-select-options';
      options.id = `${select.id}-options`;
      options.setAttribute('role', 'listbox');

      const getOptions = () => Array.from(select.options)
        .filter((option) => !option.hidden && !option.disabled);
      const syncInput = () => {
        input.value = select.value || '';
        input.title = input.value;
      };
      const renderOptions = (keyword = '') => {
        const normalizedKeyword = searchable ? keyword.trim().toLowerCase() : '';
        options.innerHTML = '';
        getOptions()
          .filter((option) => option.textContent.toLowerCase().includes(normalizedKeyword))
          .forEach((option) => {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'searchable-select-option';
            item.textContent = option.textContent;
            item.dataset.value = option.value;
            item.setAttribute('role', 'option');
            item.setAttribute('aria-selected', String(option.value === select.value));
            item.addEventListener('mousedown', (event) => event.preventDefault());
            item.addEventListener('click', () => {
              select.value = option.value;
              select.dispatchEvent(new Event('change', { bubbles: true }));
              syncInput();
              wrapper.classList.remove('is-open');
              input.setAttribute('aria-expanded', 'false');
            });
            options.appendChild(item);
          });
        if (!options.children.length) {
          const empty = document.createElement('div');
          empty.className = 'searchable-select-empty';
          empty.textContent = '暂无匹配项';
          options.appendChild(empty);
        }
      };

      input.addEventListener('focus', () => {
        if (select.disabled) return;
        closeAll(wrapper);
        wrapper.classList.add('is-open');
        input.setAttribute('aria-expanded', 'true');
        input.select();
        renderOptions(input.value);
      });
      input.addEventListener('input', () => {
        if (!searchable) return;
        if (!wrapper.classList.contains('is-open')) wrapper.classList.add('is-open');
        renderOptions(input.value);
      });
      input.addEventListener('blur', () => {
        syncInput();
        wrapper.classList.remove('is-open');
        input.setAttribute('aria-expanded', 'false');
      });
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          syncInput();
          wrapper.classList.remove('is-open');
          input.setAttribute('aria-expanded', 'false');
        }
      });
      select.addEventListener('change', syncInput);

      wrapper.append(input, options);
      syncInput();
    });

    document.addEventListener('click', (event) => {
      if (!event.target.closest('.searchable-select')) closeAll();
    });
  }

  document.getElementById('formPageTitle').textContent = pageTitle;
  document.getElementById('submitButton').textContent = '提交';

  if (isEditMode || isViewMode) {
    const product = window.ProductService.getDetail(productId);
    if (product) {
      fillForm(product);
    } else {
      showStatus(`未找到需要${isViewMode ? '查看' : '编辑'}的商品，请返回商品管理页面重新选择。`, 'error');
      document.getElementById('submitButton').disabled = true;
    }
  }

  updateEditLockedFields();
  initSearchableSelects();
  document.getElementById('unit').addEventListener('change', updateConversionRateLabel);
  document.getElementById('unit').addEventListener('change', updateMultiUnitBaseLabels);
  document.getElementById('isWeighed').addEventListener('change', updateConversionRateVisibility);
  document.getElementById('shelfLife').addEventListener('change', updateShelfLifeVisibility);
  document.getElementById('multiUnit').addEventListener('change', updateMultiUnitVisibility);
  document.getElementById('isNetVegetable').addEventListener('change', updateProcurementFieldsVisibility);
  document.getElementById('isNetVegetable').addEventListener('change', updatePurchaseTypeOptions);
  document.getElementById('shelfLifeValue').addEventListener('input', (event) => {
    event.target.value = event.target.value.replace(/\D/g, '');
  });
  document.getElementById('shelfLifeWarning').addEventListener('input', (event) => {
    event.target.value = event.target.value.replace(/\D/g, '');
  });
  updateConversionRateLabel();
  updateMultiUnitBaseLabels();
  updateConversionRateVisibility();
  updateShelfLifeVisibility();
  updateMultiUnitVisibility();
  updateProcurementFieldsVisibility();
  updatePurchaseTypeOptions();
  window.NumberStepper.bind(document.querySelector('.product-form-page'));
  renderReadonlyView();

  document.querySelector('.product-form-page').addEventListener('click', (event) => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'back' || action === 'cancel') returnToList();
    if (action === 'choose-image') imageInput.click();
  });

  imageInput.addEventListener('change', () => {
    const file = imageInput.files[0];
    if (!file) return;
    const maximumSize = 5 * 1024 * 1024;
    const allowedTypes = ['image/png', 'image/jpeg'];
    const errorElement = form.querySelector('[data-error-for="imageFile"]');
    if (!allowedTypes.includes(file.type) || file.size > maximumSize) {
      imageInput.value = '';
      errorElement.textContent = file.size > maximumSize ? '图片大小不能超过 5M' : '仅支持 png、jpg、jpeg 格式';
      return;
    }
    errorElement.textContent = '';
    document.getElementById('imageButtonText').textContent = '重新选择';
    document.getElementById('imageTip').textContent = `已选择：${file.name}`;
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (isViewMode) return;
    const data = readForm();
    const errors = window.ProductValidator.validate(data);
    if (Object.keys(errors).length) {
      showErrors(errors);
      showStatus('请检查并补充表单中的必填信息。', 'error');
      return;
    }

    clearErrors();
    const savedProduct = isEditMode
      ? window.ProductService.update(productId, data)
      : window.ProductService.create(data);

    if (!savedProduct) {
      showStatus('保存失败，请返回商品管理页面后重试。', 'error');
      return;
    }

    showStatus(isEditMode ? '商品修改成功，正在返回商品管理页面。' : '商品添加成功，正在返回商品管理页面。', 'success');
    window.setTimeout(returnToList, 500);
  });
})();
