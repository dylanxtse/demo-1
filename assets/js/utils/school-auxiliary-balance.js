(function () {
  const quantity = (value) => Number(Number(value || 0).toFixed(4));
  const nonNegative = (value) => Math.max(0, quantity(value));
  const recordDate = (record) => String((record.dates || []).at(-1) || record.submittedAt || '').slice(0, 10);

  function openingBalance(canteen, productCode, beforeDate) {
    const canteenKeys = new Set([canteen?.id, canteen?.name, typeof canteen === 'string' ? canteen : '']
      .filter(Boolean).map(String));
    const code = String(productCode || '');
    const schoolOrders = window.SchoolOrderService?.getAll?.() || [];
    const records = (window.DemoStore?.get?.('recipeDemandRecords') || [])
      .filter((record) => (record.auxiliary === true || record.demandType === 'auxiliary')
        && record.entryMode !== 'quantity'
        && (Array.isArray(record.balanceRows) || (record.orders || []).length > 0
          || schoolOrders.some((order) => String(order.recipeDemandRecordId || '') === String(record.id || '')))
        && [record.canteenId, record.canteen].some((key) => canteenKeys.has(String(key || '')))
        && (!beforeDate || recordDate(record) <= beforeDate))
      .sort((a, b) => recordDate(a).localeCompare(recordDate(b))
        || String(a.submittedAt || '').localeCompare(String(b.submittedAt || '')));
    let balance = 0;
    records.forEach((record) => {
      const rows = record.balanceRows || record.items || [];
      const matching = rows.filter((row) => String(row.productCode || '') === code);
      if (!matching.length) return;
      const linkedOrders = schoolOrders.filter((order) => String(order.recipeDemandRecordId || '') === String(record.id || ''));
      const matchingLines = linkedOrders.flatMap((order) => order.items || [])
        .filter((line) => String(line.productCode || line.goodsCode || '') === code);
      const lineInBaseUnits = (line, value) => {
        const row = matching.find((item) => String(item.unit || '') === String(line.unit || ''));
        const hasPackageSize = Number(row?.packSize) > 0;
        const packageProduct = row?.isStandardProduct === true || row?.isStandardProduct === 'true' || row?.isStandardProduct === '是';
        return Number(value || 0) * (row && hasPackageSize && packageProduct ? Number(row.packSize) : 1);
      };
      const ordered = matchingLines.reduce((sum, line) => sum + lineInBaseUnits(line, line.orderQty), 0);
      const received = linkedOrders.length && linkedOrders.every((order) =>
        order.receiptStatus === '已收货' || order.receiptStatus === '部分收货')
        ? matchingLines.reduce((sum, line) => sum + lineInBaseUnits(line, line.reconciledQty ??
            Math.max(0, Number(line.acceptedQty || 0) - Number(line.returnQty || 0))), 0)
        : null;
      const demand = matching.reduce((sum, row) => sum + Number(row.demandQty ?? row.totalQty ?? 0), 0);
      const purchase = received !== null ? received : record.balanceRows
        ? matching.reduce((sum, row) => sum + Number(row.purchaseBaseQty ?? row.purchaseQty ?? 0), 0)
        : linkedOrders.length ? ordered : matching.reduce((sum, row) => sum + Number(row.purchaseQty || 0), 0);
      balance = nonNegative(balance + purchase - demand);
    });
    return balance;
  }

  function calculate(demand, previousBalance, packSize) {
    const required = nonNegative(demand);
    const available = nonNegative(previousBalance);
    const netDemand = nonNegative(required - available);
    const size = Number(packSize);
    const purchaseQty = Number.isFinite(size) && size > 0
      ? quantity(Math.ceil((netDemand - 1e-9) / size) * size) : netDemand;
    return { previousBalance: available, netDemand, purchaseQty,
      balanceAfter: nonNegative(available + purchaseQty - required) };
  }

  window.SchoolAuxiliaryBalance = Object.freeze({ openingBalance, calculate });
})();
