(function () {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('type') === 'edit' ? 'edit' : 'add';
  const editId = params.get('id') || '';
  const storageKey = 'school-canteens-v1';
  const fallbackCanteens = [
    { id: 'canteen-demo', name: '静安第一中学食堂（演示）', code: '--', contact: '张三', phone: '13598767869', address: '静安区' },
    { id: 'canteen-002', name: '静安1中食堂', code: '91371721MABYLE8Q4R', contact: '王锦安', phone: '15646871654', address: '静安区' },
    { id: 'canteen-003', name: '第2食堂', code: '--', contact: '刘先生', phone: '13866551122', address: '静安区' },
    { id: 'canteen-004', name: '第一食堂', code: '--', contact: '王先生', phone: '15269836547', address: '静安区' },
    { id: 'canteen-default', name: '默认', code: '--', contact: '默认', phone: '13658888888', address: '静安区' }
  ];
  const seed = window.SchoolReferenceData?.canteens?.length ? window.SchoolReferenceData.canteens : fallbackCanteens;
  const phoneFallbacks = Object.fromEntries(fallbackCanteens.map((item) => [item.id, item.phone]));
  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');

  function readRows() {
    try {
      const saved = JSON.parse(window.localStorage.getItem(storageKey) || 'null');
      if (!Array.isArray(saved) || !saved.length) return seed.map((item) => ({ ...item }));
      const merged = seed.map((item) => {
        const stored = saved.find((entry) => entry.id === item.id) || {};
        return { ...item, ...stored };
      });
      return merged.concat(saved.filter((item) => !seed.some((entry) => entry.id === item.id)));
    } catch (error) { return seed.map((item) => ({ ...item })); }
  }

  const rows = readRows();
  const editing = rows.find((item) => item.id === editId) || null;
  const seedRecord = seed.find((item) => item.id === editId) || {};
  const current = editing ? {
    ...seedRecord,
    ...editing,
    name: editing.name || seedRecord.name || '',
    contact: editing.contact || seedRecord.contact || '',
    address: editing.address || seedRecord.address || '',
    phone: editing.phone || seedRecord.phone || phoneFallbacks[editId] || '',
    code: editing.code || seedRecord.code || '',
    licenseNo: editing.licenseNo || seedRecord.licenseNo || '',
    licenseValidUntil: editing.licenseValidUntil || seedRecord.licenseValidUntil || ''
  } : { name: '', contact: '', address: '', phone: '', code: '', licenseNo: '', licenseValidUntil: '' };
  const pageTitle = mode === 'edit' ? '编辑食堂' : '添加食堂';
  const root = window.AppShell.mount({
    title: pageTitle,
    variant: 'school',
    content: `<section class="page-card school-missing-page school-form-page school-canteen-form-page" aria-label="${pageTitle}">
      <div class="school-form-header"><button class="back-link school-back-link" type="button" data-action="back"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"></path><path d="M19 12H9"></path></svg><span>返回</span></button><h1>${pageTitle}</h1></div>
      <form id="schoolCanteenForm" novalidate>
        <div class="school-form-grid">
          <div class="school-form-field required"><label for="canteenName">食堂名称</label><input class="school-form-control" id="canteenName" name="name" placeholder="请输入" value="${escapeHtml(current.name)}"></div>
          <div class="school-form-field required"><label for="canteenContact">食堂联系人</label><input class="school-form-control" id="canteenContact" name="contact" placeholder="请输入" value="${escapeHtml(current.contact)}"></div>
          <div class="school-form-field required"><label for="canteenAddress">详细地址</label><div class="school-control-wrap"><textarea class="school-form-control" id="canteenAddress" name="address" maxlength="50" placeholder="请输入">${escapeHtml(current.address)}</textarea><div class="school-character-count"><span id="canteenAddressCount">${String(current.address || '').length}</span>/50</div></div></div>
          <div class="school-form-field required"><label for="canteenPhone">联系电话</label><input class="school-form-control" id="canteenPhone" name="phone" inputmode="tel" placeholder="请输入" value="${escapeHtml(current.phone)}"></div>
        </div>

        <div class="school-form-section">
          <div class="school-upload-field"><div class="school-upload-label">营业执照</div><div class="school-upload-main"><label class="school-upload-box" for="businessLicense"><span class="school-upload-placeholder"><span class="school-upload-plus">+</span><span>选择文件</span></span><input id="businessLicense" type="file" accept=".png,.jpg,.jpeg,image/png,image/jpeg"></label><p class="school-upload-help">支持png、jpg、jpeg等图片格式，单张图片不超过5M。</p><p class="school-info-note">请仔细核对营业执照信息，若信息不符，请手动修改。</p></div></div>
          <div class="school-form-grid school-license-grid">
            <div class="school-form-field"><label for="businessCode">统一社会信用代码</label><input class="school-form-control" id="businessCode" placeholder="请输入" value="${escapeHtml(current.code || '')}"></div>
            <div class="school-form-field"><label>营业期限</label><div class="school-date-pair"><input class="school-form-control" id="businessStart" type="text" placeholder="请输入"><span>-</span><input class="school-form-control" id="businessEnd" type="text" placeholder="请输入"><label class="school-long-term"><input id="businessLongTerm" type="checkbox"> 长期</label></div></div>
          </div>
        </div>

        <div class="school-form-section">
          <div class="school-upload-field"><div class="school-upload-label">食品经营许可证</div><div class="school-upload-main"><label class="school-upload-box" for="foodLicense"><span class="school-upload-placeholder"><span class="school-upload-plus">+</span><span>选择文件</span></span><input id="foodLicense" type="file" accept=".png,.jpg,.jpeg,image/png,image/jpeg"></label><p class="school-upload-help">支持png、jpg、jpeg等图片格式，单张图片不超过5M。</p><p class="school-info-note">请仔细核对食品经营许可证信息，若信息不符，请手动修改。</p></div></div>
          <div class="school-form-grid school-license-grid"><div class="school-form-field"><label for="licenseNo">许可证编号</label><input class="school-form-control" id="licenseNo" placeholder="请输入" value="${escapeHtml(current.licenseNo || '')}"></div><div class="school-form-field"><label for="licenseValidUntil">有效期至</label><input class="school-form-control" id="licenseValidUntil" type="text" placeholder="请输入" value="${escapeHtml(current.licenseValidUntil || '')}"></div></div>
        </div>

        <div class="school-form-section school-other-qualification"><div class="school-upload-field"><div class="school-upload-label">其他资质 <button class="school-plus-button" type="button" id="addQualification" aria-label="添加其他资质">+</button></div><div class="school-upload-main"><p class="school-upload-help school-other-help">支持png、jpg、jpeg等图片格式，单张图片不超过5M。</p><div id="qualificationFiles"></div></div></div></div>
        <div class="school-form-actions"><button class="btn" type="button" data-action="back">返回</button><button class="btn btn-primary" type="submit">提交</button></div>
      </form>
      <div class="school-toast" id="schoolCanteenFormToast" role="status"></div>
    </section>`
  });
  const page = root.querySelector('.school-canteen-form-page');
  const form = page.querySelector('#schoolCanteenForm');
  let qualificationIndex = 0;
  if (mode === 'edit' && phoneFallbacks[editId]) {
    const phoneField = page.querySelector('#canteenPhone');
    const restorePhone = () => {
      if (!phoneField.value) {
        phoneField.value = phoneFallbacks[editId];
        phoneField.setAttribute('value', phoneFallbacks[editId]);
      }
    };
    restorePhone();
    window.setTimeout(restorePhone, 80);
  }

  function toast(message, isError = false) {
    const element = page.querySelector('#schoolCanteenFormToast');
    element.textContent = message;
    element.className = `school-toast is-visible${isError ? ' is-error' : ''}`;
    window.clearTimeout(toast.timer);
    toast.timer = window.setTimeout(() => { element.className = 'school-toast'; }, 2200);
  }

  function showFilePreview(input) {
    const box = input.closest('.school-upload-box');
    const placeholder = box.querySelector('.school-upload-placeholder');
    const file = input.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpe?g)$/.test(file.type) || file.size > 5 * 1024 * 1024) {
      input.value = '';
      toast('请选择 5M 以内的 png、jpg 或 jpeg 图片', true);
      return;
    }
    const preview = document.createElement('img');
    preview.alt = '已选择的资质图片';
    preview.src = URL.createObjectURL(file);
    placeholder.replaceWith(preview);
  }

  function validate() {
    const required = [
      ['canteenName', '请输入食堂名称'], ['canteenContact', '请输入食堂联系人'],
      ['canteenAddress', '请输入详细地址'], ['canteenPhone', '请输入联系电话']
    ];
    for (const [id, message] of required) {
      if (!page.querySelector(`#${id}`).value.trim()) { toast(message, true); page.querySelector(`#${id}`).focus(); return false; }
    }
    if (!/^1\d{10}$/.test(page.querySelector('#canteenPhone').value.trim())) {
      toast('请输入正确的联系电话', true);
      page.querySelector('#canteenPhone').focus();
      return false;
    }
    return true;
  }

  function save() {
    const savedRows = readRows();
    const value = {
      id: editing?.id || `canteen-${Date.now()}`,
      name: page.querySelector('#canteenName').value.trim(),
      contact: page.querySelector('#canteenContact').value.trim(),
      address: page.querySelector('#canteenAddress').value.trim(),
      phone: page.querySelector('#canteenPhone').value.trim(),
      code: page.querySelector('#businessCode').value.trim() || '--',
      licenseNo: page.querySelector('#licenseNo').value.trim(),
      licenseValidUntil: page.querySelector('#licenseValidUntil').value.trim()
    };
    const index = savedRows.findIndex((item) => item.id === value.id);
    if (index >= 0) savedRows[index] = { ...savedRows[index], ...value };
    else savedRows.push(value);
    try { window.localStorage.setItem(storageKey, JSON.stringify(savedRows)); } catch (error) { /* 保持当前原型状态 */ }
    toast('提交成功');
    window.setTimeout(() => window.AppNavigation?.navigate?.('./school-canteen-management.html'), 500);
  }

  page.addEventListener('input', (event) => {
    if (event.target.id === 'canteenAddress') page.querySelector('#canteenAddressCount').textContent = event.target.value.length;
  });
  page.addEventListener('change', (event) => {
    if (event.target.matches('input[type="file"]')) showFilePreview(event.target);
    if (event.target.id === 'businessLongTerm') {
      page.querySelector('#businessEnd').disabled = event.target.checked;
      if (event.target.checked) page.querySelector('#businessEnd').value = '';
    }
  });
  page.addEventListener('click', (event) => {
    if (event.target.closest('[data-action="back"]')) window.AppNavigation?.navigate?.('./school-canteen-management.html');
    if (event.target.id === 'addQualification') {
      qualificationIndex += 1;
      page.querySelector('#qualificationFiles').insertAdjacentHTML('beforeend', `<div class="school-extra-upload"><label class="school-upload-box" for="qualification-${qualificationIndex}"><span class="school-upload-placeholder"><span class="school-upload-plus">+</span><span>选择文件</span></span><input id="qualification-${qualificationIndex}" type="file" accept=".png,.jpg,.jpeg,image/png,image/jpeg"></label></div>`);
    }
  });
  form.addEventListener('submit', (event) => { event.preventDefault(); if (validate()) save(); });
})();
