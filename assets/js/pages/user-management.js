(function () {
  const storageKey = 'procurement-user-management-v1';
  const seedEditsKey = 'procurement-user-management-seed-edits-v1';
  const seedUsers = [
    { username: 'cp10004', role: '采购员', name: '杨采', phone: '13511111111', warehouseId: 'WH-001' },
    { username: 'xiaoli123', role: '采购员', name: '小李', phone: '13256895125', warehouseId: 'WH-001' },
    { username: 'cp10003', role: '分拣员', name: '杨志刚', phone: '19999999999', warehouseId: 'WH-002' },
    { username: 'cp10002', role: '采购员', name: '杨无缺', phone: '19999999999', warehouseId: 'WH-001' }
  ];
  const storedSeedEdits = window.AppStorage?.read?.(seedEditsKey, {});
  const seedEdits = storedSeedEdits && typeof storedSeedEdits === 'object' && !Array.isArray(storedSeedEdits) ? storedSeedEdits : {};
  const storedUsers = window.AppStorage?.read?.(storageKey, []);
  const addedUsers = Array.isArray(storedUsers) ? storedUsers : [];
  const users = [...seedUsers.map((user) => ({ ...user, ...seedEdits[user.username] })), ...addedUsers];
  const roles = ['采购员', '分拣员', '仓库管理员', '管理员'];
  const defaultPassword = '1234567Aa';
  const warehouses = (window.DemoStore?.get?.('warehouses') || [])
    .filter((warehouse) => warehouse.status !== 'DISABLE' && warehouse.warehouseName);
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
  const passwordVisibilityButton = (target, label) => `<button class="user-management-password-visibility" type="button" data-user-action="toggle-password" data-user-target="${target}" aria-label="查看${label}" aria-pressed="false">
    <svg class="user-management-eye" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 9s2.8-4.5 7-4.5S16 9 16 9s-2.8 4.5-7 4.5S2 9 2 9Z"/><circle cx="9" cy="9" r="2"/></svg>
    <svg class="user-management-eye-off" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 9s2.8-4.5 7-4.5S16 9 16 9s-2.8 4.5-7 4.5S2 9 2 9Z"/><circle cx="9" cy="9" r="2"/><path d="M2.5 2.5l13 13"/></svg>
  </button>`;

  const renderRow = (user, index) => `<tr>
    <td>${index + 1}</td>
    <td><button class="user-management-link" type="button">${escapeHtml(user.username)}</button></td>
    <td>${escapeHtml(user.role)}</td>
    <td>${escapeHtml(user.name)} (${escapeHtml(user.phone)})</td>
    <td><span class="user-management-status">启用</span></td>
    <td><div class="user-management-row-actions">
      <button type="button">绑定USBK</button>
      <button type="button">解绑USBK</button>
      <button type="button">重置密码</button>
      <button type="button" data-user-action="edit" data-user-index="${index}">编辑</button>
      <button type="button">禁用</button>
    </div></td>
  </tr>`;
  const rows = users.map(renderRow).join('');

  const root = window.AppShell.mount({
    title: '用户管理',
    content: `<section class="page-card user-management-page" aria-label="用户管理">
      <div class="user-management-filters">
        <label class="user-management-field"><span>用户名</span><input type="text" placeholder="请输入" autocomplete="off" data-user-filter="username"></label>
        <label class="user-management-field"><span>姓名</span><input type="text" placeholder="姓名/联系电话" autocomplete="off" data-user-filter="person"></label>
        <div class="user-management-filter-actions">
          <button class="user-management-primary" type="button" data-user-action="search">查询</button>
          <button class="user-management-secondary" type="button" data-user-action="reset">重置</button>
        </div>
      </div>
      <div class="user-management-toolbar"><button class="user-management-primary" type="button" data-user-action="add">添加用户</button></div>
      <div class="user-management-table-scroll"><table class="user-management-table">
        <colgroup><col class="col-index"><col class="col-username"><col class="col-role"><col class="col-name"><col class="col-status"><col class="col-actions"></colgroup>
        <thead><tr><th scope="col">序号</th><th scope="col">用户名</th><th scope="col">角色</th><th scope="col">姓名</th><th scope="col">启动状态</th><th scope="col">操作</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
      <div class="user-management-pagination">
        <span data-user-total>共 ${users.length} 条数据</span>
        <div class="user-management-pages">
          <select aria-label="每页条数"><option>20 条/页</option></select>
          <button class="user-management-page-arrow" type="button" disabled aria-label="上一页">‹</button>
          <span class="user-management-current-page" aria-current="page">1</span>
          <button class="user-management-page-arrow" type="button" disabled aria-label="下一页">›</button>
          <label>跳至 <input type="text" value="1" inputmode="numeric" aria-label="跳转页码"> / 1 页</label>
        </div>
      </div>
    </section>`
  });
  const page = root.querySelector('.user-management-page');
  let listMarkup = page.innerHTML;

  function renderForm(user = null, editIndex = -1) {
    const editing = user !== null;
    const roleOptions = roles.map((role) => `<option value="${escapeHtml(role)}"${role === user?.role ? ' selected' : ''}>${escapeHtml(role)}</option>`).join('');
    const warehouseOptions = warehouses.map((warehouse) => `<option value="${escapeHtml(warehouse.id)}"${warehouse.id === user?.warehouseId ? ' selected' : ''}>${escapeHtml(warehouse.warehouseName)}</option>`).join('');
    return `<div class="user-management-form-header"><button type="button" data-user-action="back">←返回</button><span>${editing ? '编辑用户' : '添加用户'}</span></div>
      <form class="user-management-form" data-user-form${editing ? ` data-edit-index="${editIndex}"` : ''} novalidate>
        <div class="user-management-form-field is-username"><label for="newUserUsername"><span>*</span> 用户名</label><div class="user-management-form-control"><input id="newUserUsername" name="username" type="text" maxlength="20" placeholder="请输入用户名" autocomplete="off" value="${escapeHtml(user?.username)}"${editing ? ' readonly aria-readonly="true"' : ''} required aria-describedby="${editing ? 'usernameError' : 'usernameHint usernameError'}">${editing ? '' : '<p id="usernameHint" class="user-management-form-hint">请输入6～20位由字母、数字、字母+数字组成的新供应商用户名。</p>'}<p id="usernameError" class="user-management-form-error" data-user-error="username" hidden></p></div></div>
        <div class="user-management-form-field"><label for="newUserName"><span>*</span> 姓名</label><div class="user-management-form-control"><input id="newUserName" name="name" type="text" placeholder="请输入姓名" value="${escapeHtml(user?.name)}" required><p class="user-management-form-error" data-user-error="name" hidden></p></div></div>
        <div class="user-management-form-field"><label for="newUserPhone"><span>*</span> 联系电话</label><div class="user-management-form-control"><input id="newUserPhone" name="phone" type="tel" inputmode="tel" maxlength="11" placeholder="请输入联系电话" value="${escapeHtml(user?.phone)}" required><p class="user-management-form-error" data-user-error="phone" hidden></p></div></div>
        <div class="user-management-form-field"><label for="newUserRole"><span>*</span> 角色</label><div class="user-management-form-control"><select id="newUserRole" name="role" required><option value="">请选择角色</option>${roleOptions}</select><p class="user-management-form-error" data-user-error="role" hidden></p></div></div>
        <div class="user-management-form-field"><label for="newUserWarehouse"><span>*</span> 仓库</label><div class="user-management-form-control"><select id="newUserWarehouse" name="warehouseId" required><option value="">请选择仓库</option>${warehouseOptions}</select><p class="user-management-form-error" data-user-error="warehouseId" hidden></p></div></div>
        ${editing ? '' : `<div data-default-password-fields>
          <div class="user-management-form-field"><label for="newUserDefaultPassword">默认密码</label><div class="user-management-form-control"><input id="newUserDefaultPassword" type="text" value="${defaultPassword}" readonly aria-readonly="true"></div></div>
          <div class="user-management-password-switch"><button type="button" data-user-action="custom-password" aria-controls="newUserCustomPasswordFields">自定义密码</button></div>
        </div>`}
        ${editing ? '' : `<div id="newUserCustomPasswordFields" class="user-management-custom-password" data-custom-password-fields hidden>
          <div class="user-management-form-field"><label for="newUserPassword"><span>*</span> 密码</label><div class="user-management-form-control"><div class="user-management-password-inline"><div class="user-management-password-entry"><input id="newUserPassword" name="password" type="password" maxlength="20" placeholder="请输入密码" autocomplete="new-password" aria-describedby="newUserPasswordHint">${passwordVisibilityButton('newUserPassword', '密码')}</div><button type="button" data-user-action="default-password" aria-controls="newUserCustomPasswordFields">使用默认密码</button></div><p id="newUserPasswordHint" class="user-management-form-hint is-password-hint">密码长度6～20位，数字、英文、特殊字符至少包含2种</p><p class="user-management-form-error" data-user-error="password" hidden></p></div></div>
          <div class="user-management-form-field"><label for="newUserPasswordConfirm"><span>*</span> 确认密码</label><div class="user-management-form-control"><div class="user-management-password-entry"><input id="newUserPasswordConfirm" name="passwordConfirm" type="password" maxlength="20" placeholder="请再次输入密码" autocomplete="new-password">${passwordVisibilityButton('newUserPasswordConfirm', '确认密码')}</div><p class="user-management-form-error" data-user-error="passwordConfirm" hidden></p></div></div>
        </div>`}
        <div class="user-management-form-buttons"><button class="user-management-primary" type="submit">确定</button><button class="user-management-secondary" type="button" data-user-action="back">返回</button></div>
      </form>`;
  }

  function showError(form, name, message) {
    const field = form.elements.namedItem(name);
    const error = form.querySelector(`[data-user-error="${name}"]`);
    field.setAttribute('aria-invalid', 'true');
    error.textContent = message;
    error.hidden = false;
    return field;
  }

  function clearErrors(form) {
    form.querySelectorAll('[data-user-error]').forEach((error) => {
      error.textContent = '';
      error.hidden = true;
    });
    ['username', 'name', 'phone', 'role', 'warehouseId', 'password', 'passwordConfirm'].forEach((name) => {
      form.elements.namedItem(name)?.removeAttribute('aria-invalid');
    });
  }

  function saveUser(form) {
    clearErrors(form);
    const editIndex = Number(form.dataset?.editIndex);
    const editing = form.dataset?.editIndex !== undefined && Number.isInteger(editIndex) && editIndex >= 0 && editIndex < users.length;
    const values = Object.fromEntries(['username', 'name', 'phone', 'role', 'warehouseId']
      .map((name) => [name, form.elements.namedItem(name).value.trim()]));
    if (editing) values.username = users[editIndex].username;
    let firstInvalid = null;
    const fail = (name, message) => {
      const field = showError(form, name, message);
      firstInvalid ||= field;
    };
    if (!/^[A-Za-z0-9]{6,20}$/.test(values.username)) fail('username', '请输入6～20位字母或数字');
    else if (users.some((user, index) => index !== editIndex && user.username.toLowerCase() === values.username.toLowerCase())) fail('username', '用户名已存在');
    if (!values.name) fail('name', '请输入姓名');
    if (!/^1[3-9]\d{9}$/.test(values.phone)) fail('phone', '请输入正确的11位手机号');
    if (!roles.includes(values.role)) fail('role', '请选择角色');
    if (!warehouses.some((warehouse) => warehouse.id === values.warehouseId)) fail('warehouseId', '请选择仓库');
    const customPassword = !editing && !form.querySelector('[data-custom-password-fields]').hidden;
    const password = customPassword ? form.elements.namedItem('password').value : defaultPassword;
    if (customPassword) {
      const categoryCount = [/[A-Za-z]/, /\d/, /[^A-Za-z0-9]/].filter((pattern) => pattern.test(password)).length;
      if (!/^[\x21-\x7E]{6,20}$/.test(password) || categoryCount < 2) {
        fail('password', '密码需为6～20位，且数字、英文、特殊字符至少包含2种');
      }
      if (form.elements.namedItem('passwordConfirm').value !== password) {
        fail('passwordConfirm', '两次输入的密码不一致');
      }
    }
    if (firstInvalid) { firstInvalid.focus(); return; }

    const user = editing ? { ...users[editIndex], ...values } : { ...values, password, status: 'ENABLE' };
    if (editing) {
      if (editIndex < seedUsers.length) {
        const nextEdits = { ...seedEdits, [seedUsers[editIndex].username]: user };
        if (!window.AppStorage?.write?.(seedEditsKey, nextEdits)) { showError(form, 'username', '保存失败，请重试'); return; }
        Object.assign(seedEdits, nextEdits);
      } else {
        const nextUsers = [...addedUsers];
        nextUsers[editIndex - seedUsers.length] = user;
        if (!window.AppStorage?.write?.(storageKey, nextUsers)) { showError(form, 'username', '保存失败，请重试'); return; }
        addedUsers[editIndex - seedUsers.length] = user;
      }
      users[editIndex] = user;
    } else {
      if (!window.AppStorage?.write?.(storageKey, [...addedUsers, user])) { showError(form, 'username', '保存失败，请重试'); return; }
      addedUsers.push(user);
      users.push(user);
    }
    page.innerHTML = listMarkup;
    if (editing) page.querySelector('tbody').innerHTML = users.map(renderRow).join('');
    else page.querySelector('tbody').insertAdjacentHTML('beforeend', renderRow(user, users.length - 1));
    page.querySelector('[data-user-total]').textContent = `共 ${users.length} 条数据`;
    page.querySelector('[data-user-filter="username"]').value = '';
    page.querySelector('[data-user-filter="person"]').value = '';
    page.querySelectorAll('tbody tr').forEach((row) => { row.hidden = false; });
    page.classList.remove('is-form-view');
    listMarkup = page.innerHTML;
  }

  root.addEventListener('click', (event) => {
    const actionButton = event.target.closest('[data-user-action]');
    const action = actionButton?.dataset.userAction;
    if (action === 'add') {
      listMarkup = page.innerHTML;
      page.innerHTML = renderForm();
      page.classList.add('is-form-view');
      page.querySelector('[name="username"]')?.focus();
    } else if (action === 'edit') {
      const index = Number(actionButton.dataset.userIndex);
      if (!Number.isInteger(index) || !users[index]) return;
      listMarkup = page.innerHTML;
      page.innerHTML = renderForm(users[index], index);
      page.classList.add('is-form-view');
    } else if (action === 'toggle-password') {
      const field = page.querySelector(`#${actionButton.dataset.userTarget}`);
      if (!field) return;
      const reveal = field.type === 'password';
      field.type = reveal ? 'text' : 'password';
      actionButton.setAttribute('aria-pressed', String(reveal));
      actionButton.setAttribute('aria-label', `${reveal ? '隐藏' : '查看'}${field.name === 'passwordConfirm' ? '确认密码' : '密码'}`);
    } else if (action === 'custom-password' || action === 'default-password') {
      const customFields = page.querySelector('[data-custom-password-fields]');
      const defaultFields = page.querySelector('[data-default-password-fields]');
      const useCustom = action === 'custom-password';
      customFields.hidden = !useCustom;
      defaultFields.hidden = useCustom;
      if (useCustom) customFields.querySelector('[name="password"]')?.focus();
      else {
        customFields.querySelectorAll('input').forEach((field) => { field.value = ''; field.type = 'password'; field.removeAttribute('aria-invalid'); });
        customFields.querySelectorAll('[data-user-action="toggle-password"]').forEach((button) => {
          button.setAttribute('aria-pressed', 'false');
          button.setAttribute('aria-label', `查看${button.dataset.userTarget === 'newUserPasswordConfirm' ? '确认密码' : '密码'}`);
        });
        customFields.querySelectorAll('[data-user-error]').forEach((error) => { error.textContent = ''; error.hidden = true; });
      }
    } else if (action === 'back') {
      page.innerHTML = listMarkup;
      page.classList.remove('is-form-view');
    } else if (action === 'search' || action === 'reset') {
      const usernameField = page.querySelector('[data-user-filter="username"]');
      const personField = page.querySelector('[data-user-filter="person"]');
      if (action === 'reset') { usernameField.value = ''; personField.value = ''; }
      const username = usernameField.value.trim().toLowerCase();
      const person = personField.value.trim().toLowerCase();
      let visibleCount = 0;
      page.querySelectorAll('tbody tr').forEach((row) => {
        const cells = row.querySelectorAll('td');
        row.hidden = !cells[1].textContent.toLowerCase().includes(username)
          || !cells[3].textContent.toLowerCase().includes(person);
        if (!row.hidden) visibleCount += 1;
      });
      page.querySelector('[data-user-total]').textContent = `共 ${visibleCount} 条数据`;
    }
  });
  root.addEventListener('submit', (event) => {
    if (!event.target.matches('[data-user-form]')) return;
    event.preventDefault();
    saveUser(event.target);
  });
})();
