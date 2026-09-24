(function () {
  const defaultBusinessLicense = './assets/images/basic-info/business-license.png';
  const defaultQualification = './assets/images/basic-info/qualification-certificate.png';
  const fallbackCompanyName = '产品部学校食材集采供应链有限公司';

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function defaultContact(company) {
    return company?.contact && company.contact !== '总公司管理员' ? company.contact : '杨';
  }

  function defaultPhone(company) {
    return company?.phone && company.phone !== '13800000000' ? company.phone : '13573147976';
  }

  function getProfile() {
    const session = window.DemoStore?.getSession?.() || {};
    const company = (window.DemoStore?.get?.('companies') || []).find((item) => item.id === session.companyId) || {};
    const settings = window.DemoStore?.getSettings?.() || {};
    const qualifications = Array.isArray(settings.basicInfoQualifications)
      ? settings.basicInfoQualifications
      : [defaultQualification];
    const businessLicense = Object.prototype.hasOwnProperty.call(settings, 'basicInfoBusinessLicense')
      ? settings.basicInfoBusinessLicense
      : defaultBusinessLicense;
    const bankAccounts = Array.isArray(settings.basicInfoBankAccounts)
      ? settings.basicInfoBankAccounts
      : [];
    return {
      session,
      company,
      name: settings.basicInfoName ?? company.name ?? fallbackCompanyName,
      contact: settings.basicInfoContact ?? defaultContact(company),
      phone: settings.basicInfoPhone ?? defaultPhone(company),
      creditCode: settings.basicInfoCreditCode ?? '',
      address: settings.basicInfoAddress ?? '',
      businessLicense,
      qualifications: clone(qualifications),
      bankAccounts: clone(bankAccounts)
    };
  }

  const profile = getProfile();
  const bankNames = ['工商银行', '建设银行', '农业银行', '中国银行', '交通银行', '招商银行', '浦发银行', '中信银行', '兴业银行', '民生银行', '平安银行', '其他'];
  const addIcon = '<svg class="basic-info-add-bank-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg>';
  const editBankIcon = '<svg class="basic-info-bank-action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 16.5V20h3.5L18.8 8.7l-3.5-3.5L4 16.5Z"></path><path d="m13.5 6.5 3.5 3.5"></path></svg>';
  const deleteBankIcon = '<svg class="basic-info-bank-action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M9 7V4h6v3m-8 0 .8 13h8.4L17 7M10 11v5m4-5v5"></path></svg>';

  function eyeIcon() {
    return `
      <svg class="basic-info-image-action-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M2.5 12s3.5-5 9.5-5 9.5 5 9.5 5-3.5 5-9.5 5-9.5-5-9.5-5Z"></path>
        <circle cx="12" cy="12" r="2.3"></circle>
      </svg>
    `;
  }

  function trashIcon() {
    return `
      <svg class="basic-info-image-action-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 7h14M9 7V4h6v3m-8 0 .8 13h8.4L17 7M10 11v5m4-5v5"></path>
      </svg>
    `;
  }

  function renderImageActions(kind, index, alt) {
    const indexAttribute = index == null ? '' : ` data-image-index="${index}"`;
    return `
      <div class="basic-info-image-actions" aria-label="${escapeHtml(alt)}操作">
        <button class="basic-info-image-action" type="button" data-image-action="preview" data-image-kind="${kind}"${indexAttribute} title="查看大图" aria-label="查看大图">
          ${eyeIcon()}
        </button>
        <button class="basic-info-image-action danger" type="button" data-image-action="remove" data-image-kind="${kind}"${indexAttribute} ${kind === 'qualification' ? `data-remove-qualification="${index}"` : ''} title="删除" aria-label="删除${escapeHtml(alt)}">
          ${trashIcon()}
        </button>
      </div>
    `;
  }

  function renderQualificationImages(images) {
    return images.map((src, index) => `
      <div class="basic-info-qualification-item">
        <div class="basic-info-image-action-wrap">
          <img class="basic-info-qualification-image" src="${escapeHtml(src)}" alt="其他资质${index + 1}">
          ${renderImageActions('qualification', index, `其他资质${index + 1}`)}
        </div>
      </div>
    `).join('');
  }

  const content = `
    <section class="page-card basic-info-page" aria-label="基础信息">
      <div class="basic-info-scroll">
        <div class="basic-info-top">
          <div class="basic-info-field required">
            <label for="basicInfoName">名称</label>
            <input id="basicInfoName" class="basic-info-input" type="text" autocomplete="organization">
          </div>
          <div class="basic-info-field required">
            <label for="basicInfoContact">负责人</label>
            <input id="basicInfoContact" class="basic-info-input" type="text" autocomplete="name">
          </div>
          <div class="basic-info-field required">
            <label for="basicInfoPhone">联系电话</label>
            <input id="basicInfoPhone" class="basic-info-input" type="tel" autocomplete="tel">
          </div>
        </div>

        <div class="basic-info-divider"></div>

        <div class="basic-info-section">
          <div class="basic-info-section-label">营业执照</div>
          <div class="basic-info-section-body">
            <div class="basic-info-image-stack">
              <div class="basic-info-business-gallery" id="businessLicenseGallery"></div>
              <div class="basic-info-upload-hint">支持png、jpg、jpeg等图片格式，单张图片不超过5M</div>
            </div>
            <div class="basic-info-notice">
              <span class="basic-info-notice-icon" aria-hidden="true">i</span>
              <span>请仔细核对营业执照信息，若信息不符，请手动修改。</span>
            </div>
            <div class="basic-info-license-panel">
              <label for="basicInfoCreditCode">统一社会信用代码</label>
              <input id="basicInfoCreditCode" class="basic-info-input" type="text" placeholder="请输入" autocomplete="off">
              <label for="basicInfoAddress">住所</label>
              <input id="basicInfoAddress" class="basic-info-input" type="text" placeholder="请输入" autocomplete="street-address">
            </div>
          </div>
        </div>

        <div class="basic-info-divider basic-info-after-license"></div>

        <div class="basic-info-section">
          <div class="basic-info-section-label">其他资质</div>
          <div class="basic-info-section-body">
            <div class="basic-info-qualification-gallery" id="qualificationGallery">
              ${renderQualificationImages(profile.qualifications)}
              <button class="basic-info-add-image" type="button" data-upload-trigger="qualification" aria-label="添加其他资质图片"></button>
            </div>
            <div class="basic-info-upload-hint">请上传食品经营许可证、质量管理体系认证证书等。图片支持png、jpg、jpeg格式，大小不超过5M。</div>
          </div>
        </div>

        <div class="basic-info-divider basic-info-before-bank"></div>

        <div class="basic-info-section basic-info-bank-section">
          <div class="basic-info-section-label">银行账户</div>
          <div class="basic-info-section-body basic-info-bank-section-body">
            <div class="basic-info-bank-accounts" id="bankAccountsList"></div>
            <button class="basic-info-add-bank" type="button" data-bank-action="add">
              ${addIcon}<span>新增账户</span>
            </button>
          </div>
        </div>

        <div class="basic-info-submit-row">
          <span aria-hidden="true"></span>
          <button class="btn btn-primary" type="button" data-action="save-basic-info">提交</button>
        </div>
      </div>
      <input id="businessLicenseInput" type="file" accept=".png,.jpg,.jpeg,image/png,image/jpeg" hidden>
      <input id="qualificationInput" type="file" accept=".png,.jpg,.jpeg,image/png,image/jpeg" multiple hidden>
      <div class="basic-info-image-preview-modal" id="basicInfoImagePreview" hidden role="dialog" aria-modal="true" aria-label="查看大图">
        <div class="basic-info-image-preview-dialog">
          <button class="basic-info-image-preview-close" type="button" data-image-action="close-preview" aria-label="关闭大图">×</button>
          <img id="basicInfoLargeImage" src="" alt="">
        </div>
      </div>
      <div class="basic-info-bank-modal" id="basicInfoBankModal" hidden role="dialog" aria-modal="true" aria-labelledby="basicInfoBankTitle">
        <section class="basic-info-bank-dialog">
          <header class="basic-info-bank-dialog-header">
            <h2 id="basicInfoBankTitle">新增银行账户</h2>
            <button class="basic-info-bank-dialog-close" type="button" data-bank-action="close" aria-label="关闭新增银行账户">×</button>
          </header>
          <div class="basic-info-bank-form">
            <label class="basic-info-bank-field required" for="basicInfoBankAccountName">
              <span>账户名称</span>
              <input id="basicInfoBankAccountName" class="basic-info-input" type="text" disabled>
            </label>
            <label class="basic-info-bank-field required" for="basicInfoBankAccountNumber">
              <span>银行账号</span>
              <input id="basicInfoBankAccountNumber" class="basic-info-input" type="text" inputmode="numeric" autocomplete="off" placeholder="请输入银行账号">
            </label>
            <label class="basic-info-bank-field required" for="basicInfoBankName">
              <span>银行名称</span>
              <select id="basicInfoBankName" class="basic-info-input">
                ${bankNames.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('')}
              </select>
            </label>
            <label class="basic-info-bank-field required" for="basicInfoBankBranch">
              <span>开户行支行</span>
              <input id="basicInfoBankBranch" class="basic-info-input" type="text" autocomplete="off" placeholder="请输入开户行支行">
            </label>
            <label class="basic-info-bank-field required" for="basicInfoBankLineNumber">
              <span>开户行行号</span>
              <input id="basicInfoBankLineNumber" class="basic-info-input" type="text" inputmode="numeric" autocomplete="off" placeholder="请输入开户行行号">
            </label>
            <label class="basic-info-bank-default" for="basicInfoBankDefault">
              <input id="basicInfoBankDefault" type="checkbox">
              <span>设为默认账号</span>
            </label>
          </div>
          <footer class="basic-info-bank-dialog-actions">
            <button class="btn" type="button" data-bank-action="cancel">取消</button>
            <button class="btn btn-primary" type="button" data-bank-action="confirm">确定</button>
          </footer>
        </section>
      </div>
      <div class="basic-info-bank-delete-modal" id="basicInfoBankDeleteModal" hidden role="dialog" aria-modal="true" aria-labelledby="basicInfoBankDeleteTitle">
        <section class="basic-info-bank-delete-dialog">
          <header class="basic-info-bank-dialog-header">
            <h2 id="basicInfoBankDeleteTitle">确认删除</h2>
            <button class="basic-info-bank-dialog-close" type="button" data-bank-action="close-delete" aria-label="关闭确认删除弹窗">×</button>
          </header>
          <div class="basic-info-bank-delete-body">确定要删除该银行账户吗？</div>
          <footer class="basic-info-bank-dialog-actions">
            <button class="btn" type="button" data-bank-action="cancel-delete">取消</button>
            <button class="btn btn-primary" type="button" data-bank-action="confirm-delete">确定</button>
          </footer>
        </section>
      </div>
      <div class="basic-info-status" id="basicInfoStatus" role="status" aria-live="polite" hidden></div>
    </section>
  `;

  const root = window.AppShell.mount({ title: '基础信息', content });
  const page = root.querySelector('.basic-info-page');
  let qualificationImages = clone(profile.qualifications) || [];
  let businessLicense = profile.businessLicense;
  let bankAccounts = clone(profile.bankAccounts) || [];
  let editingBankIndex = -1;
  let pendingDeleteBankIndex = -1;

  function setValue(id, value) {
    const input = page.querySelector(`#${id}`);
    if (input) input.value = value ?? '';
  }

  function renderGallery() {
    const gallery = page.querySelector('#qualificationGallery');
    if (!gallery) return;
    gallery.innerHTML = `${renderQualificationImages(qualificationImages)}<button class="basic-info-add-image" type="button" data-upload-trigger="qualification" aria-label="添加其他资质图片"></button>`;
  }

  function renderBusinessLicense() {
    const gallery = page.querySelector('#businessLicenseGallery');
    if (!gallery) return;
    gallery.innerHTML = businessLicense
      ? `
        <div class="basic-info-image-action-wrap basic-info-business-image">
          <img id="businessLicensePreview" src="${escapeHtml(businessLicense)}" alt="营业执照">
          ${renderImageActions('business', null, '营业执照')}
        </div>
      `
      : '<button class="basic-info-add-image basic-info-business-empty" type="button" data-upload-trigger="business" aria-label="添加营业执照图片"></button>';
  }

  function renderBankAccounts() {
    const list = page.querySelector('#bankAccountsList');
    if (!list) return;
    list.innerHTML = bankAccounts.map((account, index) => `
      <article class="basic-info-bank-account-card">
        <span class="basic-info-bank-account-summary">${escapeHtml(account.accountNumber || '--')}-${escapeHtml(account.bankName || '银行')}</span>
        ${account.isDefault ? '<span class="basic-info-bank-default-tag">默认</span>' : ''}
        <span class="basic-info-bank-account-actions">
          <button class="basic-info-bank-account-action edit" type="button" data-bank-action="edit" data-bank-index="${index}" aria-label="编辑银行账户">${editBankIcon}</button>
          <button class="basic-info-bank-account-action delete" type="button" data-bank-action="delete" data-bank-index="${index}" aria-label="删除银行账户">${deleteBankIcon}</button>
        </span>
      </article>
    `).join('');
  }

  function showStatus(message, isError = false) {
    const status = page.querySelector('#basicInfoStatus');
    if (!status) return;
    status.textContent = message;
    status.classList.toggle('error', isError);
    status.hidden = false;
    window.clearTimeout(status._hideTimer);
    status._hideTimer = window.setTimeout(() => { status.hidden = true; }, 1800);
  }

  function hidePreview() {
    const modal = page.querySelector('#basicInfoImagePreview');
    const image = page.querySelector('#basicInfoLargeImage');
    if (modal) modal.hidden = true;
    if (image) {
      image.src = '';
      image.alt = '';
    }
  }

  function showPreview(src, alt) {
    if (!src) return;
    const modal = page.querySelector('#basicInfoImagePreview');
    const image = page.querySelector('#basicInfoLargeImage');
    if (!modal || !image) return;
    image.src = src;
    image.alt = alt || '';
    modal.hidden = false;
  }

  function persistBankAccounts() {
    window.DemoStore?.updateSettings?.({ basicInfoBankAccounts: bankAccounts });
  }

  function resetBankForm(account = null) {
    setValue('basicInfoBankAccountName', account?.accountName || page.querySelector('#basicInfoName')?.value || profile.name);
    setValue('basicInfoBankAccountNumber', account?.accountNumber || '');
    setValue('basicInfoBankName', account?.bankName || '工商银行');
    setValue('basicInfoBankBranch', account?.branchName || '');
    setValue('basicInfoBankLineNumber', account?.bankLineNumber || '');
    const defaultInput = page.querySelector('#basicInfoBankDefault');
    if (defaultInput) defaultInput.checked = Boolean(account?.isDefault);
    const title = page.querySelector('#basicInfoBankTitle');
    if (title) title.textContent = account ? '编辑银行账户' : '新增银行账户';
  }

  function showBankModal(index = -1) {
    const modal = page.querySelector('#basicInfoBankModal');
    if (!modal) return;
    editingBankIndex = Number.isInteger(index) && index >= 0 && index < bankAccounts.length ? index : -1;
    resetBankForm(editingBankIndex >= 0 ? bankAccounts[editingBankIndex] : null);
    modal.hidden = false;
    page.querySelector('#basicInfoBankAccountNumber')?.focus();
  }

  function hideBankModal() {
    const modal = page.querySelector('#basicInfoBankModal');
    if (modal) modal.hidden = true;
    editingBankIndex = -1;
  }

  function saveBankAccount() {
    const isEditing = editingBankIndex >= 0;
    const account = {
      id: isEditing ? bankAccounts[editingBankIndex]?.id || `BANK-${Date.now()}` : `BANK-${Date.now()}`,
      accountName: page.querySelector('#basicInfoBankAccountName')?.value.trim() || '',
      accountNumber: page.querySelector('#basicInfoBankAccountNumber')?.value.trim() || '',
      bankName: page.querySelector('#basicInfoBankName')?.value || '',
      branchName: page.querySelector('#basicInfoBankBranch')?.value.trim() || '',
      bankLineNumber: page.querySelector('#basicInfoBankLineNumber')?.value.trim() || '',
      isDefault: Boolean(page.querySelector('#basicInfoBankDefault')?.checked)
    };
    if (!account.accountName || !account.accountNumber || !account.bankName || !account.branchName || !account.bankLineNumber) {
      showStatus('请填写带 * 的必填信息', true);
      return;
    }
    if (account.isDefault) bankAccounts = bankAccounts.map((item) => ({ ...item, isDefault: false }));
    if (isEditing) {
      bankAccounts[editingBankIndex] = account;
    } else {
      bankAccounts.unshift(account);
    }
    persistBankAccounts();
    renderBankAccounts();
    hideBankModal();
    showStatus(isEditing ? '银行账户修改成功' : '银行账户添加成功');
  }

  function showBankDeleteModal(index) {
    if (!Number.isInteger(index) || index < 0 || index >= bankAccounts.length) return;
    pendingDeleteBankIndex = index;
    const modal = page.querySelector('#basicInfoBankDeleteModal');
    if (modal) modal.hidden = false;
  }

  function hideBankDeleteModal() {
    const modal = page.querySelector('#basicInfoBankDeleteModal');
    if (modal) modal.hidden = true;
    pendingDeleteBankIndex = -1;
  }

  function removeBankAccount() {
    if (pendingDeleteBankIndex < 0 || pendingDeleteBankIndex >= bankAccounts.length) {
      hideBankDeleteModal();
      return;
    }
    bankAccounts.splice(pendingDeleteBankIndex, 1);
    persistBankAccounts();
    renderBankAccounts();
    hideBankDeleteModal();
    showStatus('银行账户删除成功');
  }

  function applyProfile() {
    setValue('basicInfoName', profile.name);
    setValue('basicInfoContact', profile.contact);
    setValue('basicInfoPhone', profile.phone);
    setValue('basicInfoCreditCode', profile.creditCode);
    setValue('basicInfoAddress', profile.address);
    renderBusinessLicense();
    renderBankAccounts();
  }

  function readImage(file) {
    return new Promise((resolve, reject) => {
      if (!file || (!/^image\/(png|jpeg|jpg)$/.test(file.type) && !/\.(png|jpe?g)$/i.test(file.name))) {
        reject(new Error('仅支持png、jpg、jpeg格式的图片'));
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        reject(new Error('单张图片不能超过5M'));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('图片读取失败'));
      reader.readAsDataURL(file);
    });
  }

  function saveProfile() {
    const name = page.querySelector('#basicInfoName')?.value.trim();
    const contact = page.querySelector('#basicInfoContact')?.value.trim();
    const phone = page.querySelector('#basicInfoPhone')?.value.trim();
    if (!name || !contact || !phone) {
      showStatus('请填写带 * 的必填信息', true);
      return;
    }

    const creditCode = page.querySelector('#basicInfoCreditCode')?.value.trim() || '';
    const address = page.querySelector('#basicInfoAddress')?.value.trim() || '';
    const session = window.DemoStore?.getSession?.() || {};
    window.DemoStore?.transact?.((state) => {
      const company = (state.companies || []).find((item) => item.id === session.companyId);
      if (company) {
        company.name = name;
        company.contact = contact;
        company.phone = phone;
        company.updatedAt = window.BusinessRules?.now?.() || company.updatedAt;
      }
    });
    window.DemoStore?.updateSettings?.({
      basicInfoName: name,
      basicInfoContact: contact,
      basicInfoPhone: phone,
      basicInfoCreditCode: creditCode,
      basicInfoAddress: address,
      basicInfoBusinessLicense: businessLicense,
      basicInfoQualifications: qualificationImages,
      basicInfoBankAccounts: bankAccounts
    });
    showStatus('提交成功');
  }

  applyProfile();

  page.addEventListener('click', (event) => {
    const bankAction = event.target.closest('[data-bank-action]');
    if (bankAction) {
      const action = bankAction.dataset.bankAction;
      if (action === 'add') showBankModal();
      if (action === 'close' || action === 'cancel') hideBankModal();
      if (action === 'confirm') saveBankAccount();
      if (action === 'edit') showBankModal(Number(bankAction.dataset.bankIndex));
      if (action === 'delete') showBankDeleteModal(Number(bankAction.dataset.bankIndex));
      if (action === 'close-delete' || action === 'cancel-delete') hideBankDeleteModal();
      if (action === 'confirm-delete') removeBankAccount();
      return;
    }

    if (event.target.matches('#basicInfoBankModal')) {
      hideBankModal();
      return;
    }

    if (event.target.matches('#basicInfoBankDeleteModal')) {
      hideBankDeleteModal();
      return;
    }

    const imageAction = event.target.closest('[data-image-action]');
    if (imageAction) {
      const action = imageAction.dataset.imageAction;
      if (action === 'close-preview') {
        hidePreview();
        return;
      }
      if (action === 'preview') {
        const kind = imageAction.dataset.imageKind;
        const index = Number(imageAction.dataset.imageIndex);
        const src = kind === 'business' ? businessLicense : qualificationImages[index];
        const alt = kind === 'business' ? '营业执照' : `其他资质${index + 1}`;
        showPreview(src, alt);
        return;
      }
      if (action === 'remove') {
        if (imageAction.dataset.imageKind === 'business') {
          businessLicense = '';
          renderBusinessLicense();
        } else {
          const index = Number(imageAction.dataset.removeQualification);
          if (Number.isInteger(index) && index >= 0 && index < qualificationImages.length) {
            qualificationImages.splice(index, 1);
            renderGallery();
          }
        }
        return;
      }
    }

    if (event.target.matches('#basicInfoImagePreview')) {
      hidePreview();
      return;
    }

    const trigger = event.target.closest('[data-upload-trigger]');
    if (trigger) {
      const inputId = trigger.dataset.uploadTrigger === 'business' ? 'businessLicenseInput' : 'qualificationInput';
      page.querySelector(`#${inputId}`)?.click();
      return;
    }
    if (event.target.closest('[data-action="save-basic-info"]')) saveProfile();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (!page.querySelector('#basicInfoBankModal')?.hidden) hideBankModal();
    if (!page.querySelector('#basicInfoBankDeleteModal')?.hidden) hideBankDeleteModal();
    if (!page.querySelector('#basicInfoImagePreview')?.hidden) hidePreview();
  });

  page.querySelector('#businessLicenseInput')?.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      businessLicense = await readImage(file);
      renderBusinessLicense();
    } catch (error) {
      showStatus(error.message, true);
    } finally {
      event.target.value = '';
    }
  });

  page.querySelector('#qualificationInput')?.addEventListener('change', async (event) => {
    const files = [...(event.target.files || [])];
    try {
      const images = await Promise.all(files.map(readImage));
      qualificationImages = qualificationImages.concat(images);
      renderGallery();
    } catch (error) {
      showStatus(error.message, true);
    } finally {
      event.target.value = '';
    }
  });
})();
