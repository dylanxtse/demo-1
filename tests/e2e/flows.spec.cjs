const { test, expect } = require('@playwright/test');

test('手工订单可通过页面完成新增、读取、修改和删除', async ({ page }) => {
  await page.goto('/order-management.html', { waitUntil: 'networkidle' });
  await page.locator('#addButton').click();
  await expect(page).toHaveURL(/order-add\.html/);

  await page.locator('#customerName').selectOption({ index: 1 });
  await expect(page.locator('#canteen option').nth(1)).toBeAttached();
  await page.locator('#canteen').selectOption({ index: 1 });
  await page.locator('#orderTag').selectOption({ label: '普通餐' });

  await page.locator('#expectedAt').click();
  await page.locator('#orderAddExpectedAtPickerPanel .cal-day[data-date="2026-08-06"]').click();
  await page.locator('#orderAddExpectedAtPickerPanel [data-action="dp-confirm"]').click();

  const firstLine = page.locator('#goodsTableBody tr').first();
  await firstLine.locator('[data-action="toggle-goods-select"]').click();
  await firstLine.locator('[data-action="select-goods"][data-value="SP0300019"]').click();
  const populatedLine = page.locator('#goodsTableBody tr').first();
  await populatedLine.locator('[data-field="quantity"]').fill('2');
  await populatedLine.locator('[data-field="unitPrice"]').fill('1.5');
  await page.locator('#remark').fill('UI自动化订单');

  await Promise.all([
    page.waitForURL(/order-management\.html\?created=1/),
    page.locator('#primaryButton').click()
  ]);
  const created = await page.evaluate(() =>
    window.DemoStore.get('orders').find((item) => item.remark === 'UI自动化订单')
  );
  expect(created?.orderNo).toMatch(/^DD\d{15}$/);
  await expect(page.getByText(created.orderNo, { exact: true }).first()).toBeVisible();

  await page.reload({ waitUntil: 'networkidle' });
  const createdRow = page.locator(`tr[data-id="${created.id}"]`);
  await expect(createdRow).toBeVisible();
  await createdRow.locator('[data-action="edit"]').click();
  await page.locator('#remark').fill('UI自动化订单-已修改');
  await Promise.all([
    page.waitForURL(/order-management\.html\?updated=1/),
    page.locator('#primaryButton').click()
  ]);
  expect(await page.evaluate((id) => window.DemoStore.get('orders').find((item) => item.id === id)?.remark, created.id))
    .toBe('UI自动化订单-已修改');

  const updatedRow = page.locator(`tr[data-id="${created.id}"]`);
  await updatedRow.locator('[data-action="delete"]').click();
  await page.locator('#confirmModalAction').click();
  await expect(updatedRow).toHaveCount(0);
  expect(await page.evaluate((id) => window.DemoStore.get('orders').some((item) => item.id === id), created.id))
    .toBeFalsy();
});

test('手工入库和出库通过页面保存后显示完整往来单位与金额', async ({ page }) => {
  await page.goto('/inbound.html', { waitUntil: 'networkidle' });
  await page.locator('[data-action="add-inbound"]').click();
  await page.locator('#inbFormWarehouse').selectOption('生鲜仓库');
  await page.locator('#inbFormCounterparty').fill('UI自动化供应商');
  const inboundRow = page.locator('[data-form-item-index="0"]');
  await inboundRow.locator('[data-action="toggle-product-select"]').click();
  await inboundRow.locator('[data-action="select-product"][data-value="SP0300019"]').click();
  const populatedInboundRow = page.locator('[data-form-item-index="0"]');
  await populatedInboundRow.locator('[data-form-field="expectedQty"]').fill('2');
  await populatedInboundRow.locator('[data-form-field="damageQty"]').fill('0');
  await populatedInboundRow.locator('[data-form-field="unitPrice"]').fill('1.5');
  await page.locator('[data-action="save-inbound"]').click();
  await expect(page.locator('#inboundListPage')).toBeVisible();
  const inbound = await page.evaluate(() =>
    window.DemoStore.get('inboundOrders').find((item) => item.supplierPurchaserCustomerName === 'UI自动化供应商')
  );
  expect(inbound?.id).toMatch(/^RKD\d{15}$/);
  expect(Number(inbound.entryAmt)).toBe(3);
  await expect(page.getByText(inbound.id, { exact: true }).first()).toBeVisible();
  await expect(page.getByText('UI自动化供应商', { exact: true }).first()).toBeVisible();

  await page.goto('/outbound.html', { waitUntil: 'networkidle' });
  await page.locator('[data-action="add-outbound"]').click();
  await page.locator('#obFormWarehouse').selectOption('生鲜仓库');
  await page.locator('#obFormCounterparty').fill('UI自动化客户');
  const outboundRow = page.locator('[data-item-index="0"]');
  await outboundRow.locator('[data-action="toggle-product-select"]').click();
  await outboundRow.locator('[data-action="select-product"][data-value="SP0300019"]').click();
  const populatedOutboundRow = page.locator('[data-item-index="0"]');
  await populatedOutboundRow.locator('[data-item-field="qty"]').fill('2');
  await populatedOutboundRow.locator('[data-item-field="price"]').fill('1.5');
  await page.locator('[data-action="save-outbound"]').click();
  await expect(page.locator('#outboundListPage')).toBeVisible();
  const outbound = await page.evaluate(() =>
    window.DemoStore.get('outboundOrders').find((item) => item.supplierPurchaserCustomerName === 'UI自动化客户')
  );
  expect(outbound?.id).toMatch(/^CKD\d{15}$/);
  expect(Number(outbound.outboundAmt)).toBe(3);
  await expect(page.getByText(outbound.id, { exact: true }).first()).toBeVisible();
  await expect(page.getByText('UI自动化客户', { exact: true }).first()).toBeVisible();
});

test('订单创建后可显示、刷新并贯通到出库', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/order-management.html', { waitUntil: 'networkidle' });
  const result = await page.evaluate(async () => {
    const order = await window.OperationsService.create('orders', {
      source: '企业下单',
      sourceType: 'ENTERPRISE',
      customerId: 'CUS-001',
      customerName: '第一实验学校',
      canteen: '第一食堂',
      expectedAt: '2026-08-06 07:30:00',
      warehouse: '中心仓',
      orderTag: '普通餐',
      creator: '前端演示',
      items: [{
        productId: 'SP0300019',
        goodsCode: 'SP0300019',
        goodsName: '大白菜',
        unit: '斤',
        quantity: 2,
        unitPrice: 1.5
      }]
    });
    await window.OperationsService.transition('orders', order.id, 'approve');
    const task = window.DemoStore.get('sortingItems').find((item) => item.orderId === order.id);
    await window.OperationsService.transition('sortingItems', task.id, 'sort', { actualQty: 2 });
    const shipping = window.DemoStore.get('shippingOrders').find((item) => item.orderId === order.id);
    await window.OperationsService.transition('shippingOrders', shipping.id, 'ship');
    const outbound = window.DemoStore.get('outboundOrders').find((item) => item.orderId === order.id);
    return {
      orderNo: order.orderNo,
      outboundNo: outbound.id,
      customer: outbound.supplierPurchaserCustomerName,
      amount: outbound.outboundAmt
    };
  });

  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByText(result.orderNo, { exact: true }).first()).toBeVisible();

  await page.goto('/outbound.html', { waitUntil: 'networkidle' });
  await expect(page.getByText(result.outboundNo, { exact: true }).first()).toBeVisible();
  await expect(page.getByText(result.customer, { exact: true }).first()).toBeVisible();
  await expect(page.getByText(String(result.amount), { exact: true }).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('入库、出库和加工记录新增后刷新仍可见', async ({ page }) => {
  await page.goto('/inbound.html', { waitUntil: 'networkidle' });
  const inbound = await page.evaluate(() => window.InboundService.create({
    supplierPurchaserCustomerName: '自动测试供应商',
    entryType: '采购入库',
    warehouseName: '中心仓',
    items: [{ productCode: 'SP0300019', productName: '大白菜', unit: '斤', actualQty: 2, unitPrice: 1.5 }]
  }));
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByText(inbound.id, { exact: true }).first()).toBeVisible();
  await expect(page.getByText('自动测试供应商', { exact: true }).first()).toBeVisible();

  await page.goto('/outbound.html', { waitUntil: 'networkidle' });
  const outbound = await page.evaluate(() => window.OutboundService.create({
    supplierPurchaserCustomerName: '自动测试客户',
    outboundType: '销售出库',
    warehouseName: '中心仓',
    items: [{ productCode: 'SP0300019', productName: '大白菜', unit: '斤', outboundQty: 1, unitPrice: 1.5 }]
  }));
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByText(outbound.id, { exact: true }).first()).toBeVisible();
  await expect(page.getByText('自动测试客户', { exact: true }).first()).toBeVisible();

  await page.goto('/processing.html', { waitUntil: 'networkidle' });
  const processing = await page.evaluate(() => window.ProcessingService.create({
    processingDate: '2026-08-05',
    warehouse: '中心仓',
    status: 'DRAFT',
    materials: [{ productCode: 'SP0300019', productName: '大白菜', unit: '斤', consumeQty: 1, avgPrice: 1.5 }],
    outputs: [{ productCode: 'SP0300039', productName: '土豆丝', unit: '斤', refCoefficient: 1, actualQty: 1, costPrice: '1.50' }]
  }));
  await page.goto('/processing-record.html', { waitUntil: 'networkidle' });
  await expect(page.getByText(processing.id, { exact: true }).first()).toBeVisible();
});

test('分拣列表的发货状态和库存来自关联业务数据', async ({ page }) => {
  await page.goto('/sorting-management.html', { waitUntil: 'networkidle' });
  const sample = await page.evaluate(() => {
    const item = window.DemoStore.get('sortingItems')[0];
    const order = window.DemoStore.get('orders').find((record) => record.id === item.orderId);
    const balance = window.DemoStore.get('inventoryBalance').find((record) => (
      record.productId === item.productId && record.warehouse === item.warehouse
    ));
    return { orderStatus: order?.status, productId: item.productId, stock: balance?.currentStock };
  });
  const row = page.locator('#recordBody tr').first();
  await expect(row).toBeVisible();
  const cells = await row.locator('td').allTextContents();
  expect(cells.join('')).not.toContain('--');
  expect(cells.join('')).toContain(sample.orderStatus === 'SHIPPED' ? '是' : '否');
  expect(cells.join('')).toContain(String(sample.stock || 0));
});

test('种子加工单不再伪造草稿状态', async ({ page }) => {
  await page.goto('/processing-record.html', { waitUntil: 'networkidle' });
  const seedDrafts = await page.evaluate(() => window.ProcessingService.getList().filter((record) => (
    record.id === 'JGD20260726003' || String(record.id).startsWith('JGD20260805')
  )).filter((record) => record.status === 'DRAFT'));
  expect(seedDrafts).toEqual([]);
  await expect(page.locator('body')).not.toContainText('草稿');
});
