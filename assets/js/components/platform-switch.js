(function () {
  if (!document.querySelector('[data-user-end="sorting-terminal"]')) {
    document.querySelectorAll('.sorting-terminal-switch-wrap').forEach((node) => node.remove());
    return;
  }
  if (window.PlatformSwitchMounted) return;
  window.PlatformSwitchMounted = true;

  const routes = {
    enterprise: './index.html',
    education: './education.html',
    supplier: './supplier.html',
    operations: './operations.html',
    school: './school-product-management.html',
    mobile: './school-mobile.html',
    'sorting-terminal': './sorting-terminal-login.html',
    'delivery-assistant': 'https://rp.mockplus.cn/rps/ZE1a0m5uhT/9Qb2V3IOin?'
  };
  const destinations = [
    ['enterprise', '切换至企业端'],
    ['education', '切换至教育局端'],
    ['supplier', '切换至供应商端'],
    ['operations', '切换至运维管理平台'],
    ['school', '切换至学校端'],
    ['mobile', '切换至移动端'],
    ['sorting-terminal', '切换至分拣终端'],
    ['delivery-assistant', '配送助手']
  ];
  let wrap = document.querySelector('.sorting-terminal-switch-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = 'sorting-terminal-switch-wrap';
    const toggle = document.createElement('button');
    toggle.className = 'sorting-terminal-switch-toggle';
    toggle.type = 'button';
    toggle.id = 'sortingTerminalSwitchToggle';
    toggle.setAttribute('aria-haspopup', 'menu');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', 'sortingTerminalSwitchMenu');
    toggle.innerHTML = '切换 <span aria-hidden="true">⇄</span>';
    const menu = document.createElement('div');
    menu.className = 'sorting-terminal-switch-menu';
    menu.id = 'sortingTerminalSwitchMenu';
    menu.setAttribute('role', 'menu');
    menu.hidden = true;
    destinations.forEach(([target, label]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('role', 'menuitem');
      button.dataset.shellSwitch = target;
      button.textContent = label;
      menu.appendChild(button);
    });
    wrap.append(toggle, menu);
    document.body.appendChild(wrap);
  }

  if (!document.querySelector('link[data-platform-switch-style]')) {
    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = './assets/css/platform-switch.css';
    style.dataset.platformSwitchStyle = 'true';
    document.head.appendChild(style);
  }

  const toggle = wrap.querySelector('.sorting-terminal-switch-toggle');
  const menu = wrap.querySelector('.sorting-terminal-switch-menu');
  const setOpen = (open) => {
    menu.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
  };
  wrap.addEventListener('mouseenter', () => setOpen(true));
  wrap.addEventListener('mouseleave', () => setOpen(false));
  toggle.addEventListener('click', () => setOpen(true));
  wrap.addEventListener('focusout', (event) => {
    if (!wrap.contains(event.relatedTarget)) setOpen(false);
  });
  menu.addEventListener('click', (event) => {
    const button = event.target.closest('[data-shell-switch]');
    if (!button) return;
    const target = routes[button.dataset.shellSwitch];
    if (target) window.location.href = target;
  });
  document.addEventListener('click', (event) => {
    if (!wrap.contains(event.target)) setOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setOpen(false);
  });
})();
