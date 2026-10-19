(function () {
  const form = document.getElementById('sortingTerminalLoginForm');
  const username = document.getElementById('sortingTerminalUsername');
  const password = document.getElementById('sortingTerminalPassword');
  const usernameError = document.getElementById('sortingTerminalUsernameError');
  const passwordError = document.getElementById('sortingTerminalPasswordError');
  const passwordToggle = document.getElementById('sortingTerminalPasswordToggle');

  function setFieldError(input, errorElement, message) {
    errorElement.textContent = message;
    input.setAttribute('aria-invalid', String(Boolean(message)));
  }

  passwordToggle.addEventListener('click', () => {
    const isVisible = password.type === 'password';
    password.type = isVisible ? 'text' : 'password';
    passwordToggle.setAttribute('aria-checked', String(isVisible));
    passwordToggle.setAttribute('aria-label', isVisible ? '隐藏密码' : '显示密码');
  });

  username.addEventListener('input', () => setFieldError(username, usernameError, ''));
  password.addEventListener('input', () => setFieldError(password, passwordError, ''));

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const missingUsername = !username.value.trim();
    const missingPassword = !password.value;
    setFieldError(username, usernameError, missingUsername ? '请输入用户名称' : '');
    setFieldError(password, passwordError, missingPassword ? '请输入登录密码' : '');
    if (missingUsername || missingPassword) {
      (missingUsername ? username : password).focus();
      return;
    }
    sessionStorage.setItem('sorting-terminal-demo-session', JSON.stringify({
      username: username.value.trim(),
      userType: document.getElementById('sortingTerminalUserType').value
    }));
    window.location.href = './sorting-terminal-home.html';
  });
})();
