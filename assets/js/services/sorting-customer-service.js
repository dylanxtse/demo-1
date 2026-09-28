(function () {
  const operations = window.OperationsService;
  const escapeHtml = (value) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  const dateOf = (value) => String(value || '').slice(0, 10);
  const isSorted = (item) => item.status === 'SORTED' || item.sortingCompleted === true;
  const statusOf = (items) => items.length && items.every(isSorted) ? 'SORTED' : items.some((item) => isSorted(item) || item.status === 'PARTIAL') ? 'PARTIAL' : 'PENDING';
  const statusText = { PENDING: '未分拣', PARTIAL: '部分分拣', SORTED: '已分拣' };

  async function getItems() {
    const result = await operations.list('sortingItems', { pageSize: Number.MAX_SAFE_INTEGER });
    const orders = new Map(window.DemoStore.get('orders').map((order) => [order.id, order]));
    const products = new Map(window.DemoStore.get('products').map((product) => [product.code || product.id, product]));
    return result.items.map((item) => {
      const order = orders.get(item.orderId) || {};
      const product = products.get(item.productId || item.goodsCode) || {};
      return { ...item, expectedAt: item.expectedAt || order.expectedAt, orderTag: item.orderTag || order.orderTag,
        category: item.category || product.category || product.categoryName || '',
        orderStatus: order.status, customerId: item.customerId || order.customerId,
        route: item.route || order.route, remark: item.remark || order.remark || '' };
    });
  }

  async function getGroups() {
    const items = await getItems();
    const orders = window.DemoStore.get('orders');
    const locations = window.DemoStore.get('customerLocations');
    const groups = new Map();
    items.forEach((item) => {
      const id = JSON.stringify([item.customerName, item.canteen, dateOf(item.expectedAt), item.route || '']);
      if (!groups.has(id)) {
        const order = orders.find((entry) => entry.id === item.orderId) || {};
        const location = locations.find((entry) => (entry.customerId === item.customerId || entry.customerName === item.customerName) && entry.canteen === item.canteen) || {};
        groups.set(id, { id, customerName: item.customerName, canteen: item.canteen,
          expectedAt: dateOf(item.expectedAt), route: item.route || '',
          receiver: order.receiver || location.receiver || '', phone: order.phone || location.phone || '',
          address: order.address || location.address || '', items: [] });
      }
      groups.get(id).items.push(item);
    });
    return [...groups.values()].map((group) => {
      const orderIds = new Set(group.items.map((item) => item.orderId));
      return { ...group, status: statusOf(group.items), orders: orders.filter((order) => orderIds.has(order.id)).map((order) => {
        const lines = group.items.filter((item) => item.orderId === order.id);
        return { ...order, sortingStatus: statusOf(lines), shipped: lines.some((item) => item.shipped === '是'),
          goodsCount: new Set((order.items || lines).map((line) => [line.productId || line.goodsCode, line.unit].join('|'))).size,
          displayAmount: Number(order.orderAmount ?? order.amount ?? (order.items || []).reduce((sum, line) => sum + Number(line.quantity ?? line.orderQty ?? 0) * Number(line.unitPrice || 0), 0)) };
      }) };
    }).sort((a, b) => b.expectedAt.localeCompare(a.expectedAt) || a.customerName.localeCompare(b.customerName, 'zh-CN'));
  }

  const textMatches = (source, value) => String(source || '').toLowerCase().includes(String(value).toLowerCase());
  function matchesLine(item, key, value) {
    if (key === 'sortingStatus') return item.status === value;
    if (key === 'stockLevel') return value === '有库存' ? Number(item.stock) > 0 : Number(item.stock) < Number(item.orderQty);
    if (key === 'sortingThreshold') return value === '超出下单数量' ? Number(item.actualQty) > Number(item.orderQty) : Number(item.actualQty) < Number(item.orderQty);
    return textMatches(item[key], value);
  }
  function matchesGroup(group, condition) {
    const fields = Object.entries(condition).filter(([, value]) => value !== '' && value != null);
    const ownFields = new Set(['customerName', 'expectedAt', 'route', 'canteen', 'status']);
    return fields.filter(([key]) => ownFields.has(key)).every(([key, value]) => key === 'status'
      ? (Array.isArray(value) ? value : String(value).split(',')).includes(group.status)
      : textMatches(group[key], value))
      && group.items.some((item) => fields.filter(([key]) => !ownFields.has(key)).every(([key, value]) => matchesLine(item, key, value)));
  }

  function canMutate(item, action) {
    if (item.shipped === '是') return false;
    if (action === 'sort') return !isSorted(item) && item.shortage !== '是';
    if (action === 'resetSort') return isSorted(item);
    if (action === 'markShortage') return !isSorted(item) && item.shortage !== '是';
    if (action === 'cancelShortage') return !isSorted(item) && item.shortage === '是';
    return false;
  }

  async function runItems(ids, action, payload = {}) {
    const selected = new Set(ids);
    const items = (await getItems()).filter((item) => selected.has(item.id) && canMutate(item, action));
    if (!items.length) throw new Error('所选商品当前不可执行该操作，请检查分拣、缺货及发货状态');
    let completed = 0;
    for (const item of items) {
      try {
        await operations.transition('sortingItems', item.id, action, payload);
        completed += 1;
      } catch (error) {
        throw new Error(`${completed ? `已处理 ${completed} 条；` : ''}${item.goodsName}：${error.message}`);
      }
    }
    return completed;
  }

  function showPrint(items, title = '客户拣货单') {
    if (!items.length) return;
    document.querySelector('.sorting-print-overlay')?.remove();
    const previousFocus = document.activeElement;
    const overlay = document.createElement('div');
    overlay.className = 'operations-modal-backdrop sorting-print-overlay';
    overlay.innerHTML = `<section class="operations-modal is-detail sorting-print-dialog" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}打印预览">
      <header class="operations-modal-header"><h3>${escapeHtml(title)} · 打印预览</h3><button type="button" data-print-close aria-label="关闭打印预览">关闭</button></header>
      <div class="operations-modal-body sorting-print-content"><h2>${escapeHtml(title)}</h2>
        <table><thead><tr>${['客户 / 食堂', '期望送达日期', '订单号', '商品名称', '下单数量', '实际数量', '单位', '线路'].map((label) => `<th>${label}</th>`).join('')}</tr></thead>
        <tbody>${items.map((item) => `<tr>${[`${item.customerName} / ${item.canteen}`, dateOf(item.expectedAt), item.orderNo,
          window.DomUtils?.formatProductDisplay?.(item) || item.goodsName, item.orderQty, Number(item.actualQty || 0).toFixed(2), item.unit, item.route || '--']
          .map((value) => `<td>${escapeHtml(value)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
      <footer class="operations-modal-footer"><button class="btn" type="button" data-print-close>取消</button><button class="btn btn-primary" type="button" data-print-confirm>打印</button></footer></section>`;
    const close = () => { overlay.remove(); document.body.classList.remove('sorting-print-open'); document.removeEventListener('keydown', onKey); previousFocus?.focus(); };
    const onKey = (event) => { if (event.key === 'Escape') close(); };
    overlay.querySelectorAll('[data-print-close]').forEach((button) => button.addEventListener('click', close));
    overlay.querySelector('[data-print-confirm]').addEventListener('click', () => {
      document.body.classList.add('sorting-print-open');
      window.print();
      document.body.classList.remove('sorting-print-open');
    });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(overlay);
    overlay.querySelector('[data-print-confirm]').focus();
  }

  const customerService = {
    escapeHtml, dateOf, isSorted, statusOf, statusText, getItems, getGroups, canMutate, runItems, showPrint,
    filterOptions(key) {
      const items = window.DemoStore.get('sortingItems');
      if (key === 'category') {
        const products = window.DemoStore.get('products');
        return [...new Set(products.map((item) => item.category || item.categoryName).filter(Boolean))];
      }
      return [...new Set(items.map((item) => item[key]).filter(Boolean))];
    },
    async list(resource, query = {}) {
      const groups = (await getGroups()).filter((group) => matchesGroup(group, query.condition || {}));
      const page = Math.max(1, Number(query.page) || 1), pageSize = Math.max(1, Number(query.pageSize) || 20);
      return { items: groups.slice((page - 1) * pageSize, page * pageSize), total: groups.length, page, pageSize };
    },
    async get(resource, id) { return (await getGroups()).find((group) => group.id === id) || null; },
    async batch(resource, ids, action) {
      const groups = (await getGroups()).filter((group) => ids.includes(group.id));
      return runItems(groups.flatMap((group) => group.items.map((item) => item.id)), action);
    },
    async export(resource, query, columns) {
      const result = await this.list(resource, { ...query, pageSize: Number.MAX_SAFE_INTEGER });
      const csv = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
      return [columns.map((column) => csv(column.label)).join(','), ...result.items.map((item) => columns.map((column) => csv(column.key === 'status' ? statusText[item.status] : item[column.key])).join(','))].join('\n');
    }
  };
  window.SortingCustomerService = customerService;
})();
