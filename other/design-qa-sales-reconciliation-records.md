# 销售对账｜对账单生成记录视觉核验

- reference: 用户提供的采购系统截图（对账单生成记录）
- implementation: `http://127.0.0.1:4173/sales-reconciliation.html`
- inspected with: Codex in-app browser accessibility tree and rendered screenshot
- final result: passed

## 核验项

- 默认进入“对账单生成记录”页签，蓝色选中态和下划线正确。
- 筛选区包含对账单生成日期、客户名称、查询、重置和打印入口；日期范围为参考图中的 2026-08-20 – 2026-09-19。
- 表格包含选择框、客户名称、对账单生成日期、发货日期、对账金额合计、抹零金额合计、应收金额合计和操作列。
- 示例行显示参考图中的客户名称、生成时间、两条发货时间、8.00 / 0.00 / 8.00 金额及查看、下载、删除操作。
- 默认数据扩充为 12 条，客户名称覆盖静安第一中学、静安第11中学、静安第2中学和静安第1中学，客户筛选下拉同步可用。
- 对账单生成日期与发货日期在窄窗口内允许单元格换行，避免日期文本串列；操作列增加宽度并收紧按钮左右内边距，查看、下载、删除完整可见。
- 底部分页显示共 12 条数据、20 条/页、当前页、跳页输入和页数信息。
- 已处理销售明细宽表通用样式对记录表的列宽覆盖，并在较窄预览宽度下确认操作列可见。

## 轻量验证

- `node --check assets/js/pages/sales-reconciliation.js`
- `node --check assets/js/data/sales-reconciliation-data.js`
