(function () {
  const content = `
    <div class="page-card operations-welcome-page" aria-label="学校食材集采平台首页">
      <h1 class="operations-welcome-title">欢迎进入 学校食材集采平台</h1>
      <img class="operations-welcome-image" src="./assets/images/operations-home-texture.png" alt="学校食材集采平台首页插图">
    </div>
  `;

  window.AppShell.mount({
    title: '首页',
    content,
    variant: 'operations',
    emptyText: '学校食材集采平台首页'
  });
})();
