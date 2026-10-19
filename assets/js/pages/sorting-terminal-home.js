(function () {
  const sessionKey = 'sorting-terminal-demo-session';
  const session = JSON.parse(sessionStorage.getItem(sessionKey) || '{}');
  const user = document.getElementById('sortingTerminalCurrentUser');
  const status = document.getElementById('sortingTerminalActionStatus');
  if (session.username) user.textContent = session.username;

  document.getElementById('sortingTerminalLogout').addEventListener('click', () => {
    sessionStorage.removeItem(sessionKey);
    window.location.href = './sorting-terminal-login.html';
  });

  document.querySelectorAll('[data-feature]').forEach((button) => {
    button.addEventListener('click', () => {
      if (button.dataset.feature === '商品分拣') {
        window.location.href = './sorting-terminal-product.html';
        return;
      }
      if (button.dataset.feature === '客户分拣') {
        window.location.href = './sorting-terminal-customer.html';
        return;
      }
      status.textContent = `${button.dataset.feature}暂无法使用，请稍后重试`;
    });
  });
})();
