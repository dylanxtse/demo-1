const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');

const root = path.resolve(__dirname, '../..');
const pages = fs.readdirSync(root).filter((file) => file.endsWith('.html')).sort();
const screenshotRoot = path.join(root, 'audit', 'screenshots');

test.beforeAll(() => {
  fs.mkdirSync(screenshotRoot, { recursive: true });
});

for (const route of pages) {
  test(`${route} 可正常显示`, async ({ page }, testInfo) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(`console: ${message.text()}`);
    });
    const response = await page.goto(`/${route}`, { waitUntil: 'networkidle' });
    expect(response?.ok(), `${route} HTTP 加载失败`).toBeTruthy();
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('.app-header'), `${route} 顶部栏不可见`).toBeVisible();
    await expect(page.locator('.breadcrumb-bar'), `${route} 页签栏不可见`).toBeVisible();
    await expect(page.locator('.sidebar-logo'), `${route} 侧边栏品牌区不可见`).toBeVisible();
    const [headerBox, tabsBox, contentBox] = await Promise.all([
      page.locator('.app-header').boundingBox(),
      page.locator('.breadcrumb-bar').boundingBox(),
      page.locator('.content-area').boundingBox()
    ]);
    expect(headerBox?.y, `${route} 顶部栏偏出视口`).toBeGreaterThanOrEqual(0);
    expect(tabsBox?.y, `${route} 页签栏与顶部栏重叠`).toBeGreaterThanOrEqual(70);
    expect(contentBox?.y, `${route} 内容区与全局导航重叠`).toBeGreaterThanOrEqual(120);
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length, `${route} 页面内容为空`).toBeGreaterThan(20);
    expect(bodyText, `${route} 泄漏英文 PENDING 状态`).not.toMatch(/\bPENDING(?:_AUDIT|_CONFIRM)?\b/);
    expect(errors, `${route} 存在运行时错误`).toEqual([]);
    if (testInfo.project.name === 'desktop-1440') {
      await page.evaluate(() => {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      });
      expect((await page.locator('.app-header').boundingBox())?.y, `${route} 截图前顶部栏偏出视口`).toBe(0);
      await page.locator('.app-layout').screenshot({
        path: path.join(screenshotRoot, `${path.basename(route, '.html')}.png`)
      });
    }
  });
}
