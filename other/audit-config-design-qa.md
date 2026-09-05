# 审核配置页 Design QA

## Source visual truth

- `/var/folders/bl/fvkqtvk95f74jl7bs8cl3g540000gn/T/codex-clipboard-0c745b41-1f15-455e-bccf-3957b4ecfffa.png`：商品审核
- `/var/folders/bl/fvkqtvk95f74jl7bs8cl3g540000gn/T/codex-clipboard-8042b9ef-8635-4d24-bded-5335cbc96b79.png`：价格审核
- `/var/folders/bl/fvkqtvk95f74jl7bs8cl3g540000gn/T/codex-clipboard-56a05271-5b70-4c18-9b0c-a18a4534b708.png`：订单审核
- `/var/folders/bl/fvkqtvk95f74jl7bs8cl3g540000gn/T/codex-clipboard-851c67d5-7217-4f2d-8737-6f41e3b76284.png`：采购审核
- `/var/folders/bl/fvkqtvk95f74jl7bs8cl3g540000gn/T/codex-clipboard-106fa81c-3480-4995-964f-49cb4962a8bd.png`：仓库管理审核

## Implementation

- 页面：`/Users/dashui/Desktop/demo-1/audit-config.html`
- 状态：五个审核分类已实现；仓库管理新增“净菜加工审核”，默认关闭。
- 核心交互：审核关闭时审核人可编辑，审核开启时审核人下拉禁用；配置写入统一 `DemoStore` 设置。
- 浏览器截图：未生成。应用内浏览器安全策略阻止从当前会话直接打开新的本地 `file://` 页面，因此无法取得渲染实现证据。

## Static checks

- `node --check assets/js/pages/audit-config.js`：通过
- `node --check assets/js/utils/storage.js`：通过
- `node --check assets/js/services/processing-service.js`：通过
- 未运行完整 Playwright 套件，遵循本任务避免大量测试的要求。

## Comparison history

1. 根据五张截图完成分类标签、表格四列、默认状态和审核人展示。
2. 增加“净菜加工审核”行，并将其绑定到 `processingAuditEnabled`，默认值为 `false`。
3. 因本地 `file://` 页面无法在应用内浏览器中打开，视觉截图对比无法继续。

final result: blocked
