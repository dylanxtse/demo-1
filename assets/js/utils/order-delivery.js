(function () {
  const dateOf = (value) => String(value || '').slice(0, 10);
  const orders = () => {
    try { return window.DemoStore?.get?.('orders') || []; }
    catch (error) { return []; }
  };
  const orderIndex = () => {
    const index = new Map();
    orders().forEach((order) => {
      if (order.id) index.set(`id:${order.id}`, order);
      if (order.orderId) index.set(`id:${order.orderId}`, order);
      if (order.orderNo) index.set(`no:${order.orderNo}`, order);
    });
    return index;
  };
  const relatedOrder = (row, index) => {
    if (row.orderId && row.id === row.orderId) return row;
    const lookup = index || orderIndex();
    return (row.orderId && lookup.get(`id:${row.orderId}`)) || (row.orderNo && lookup.get(`no:${row.orderNo}`));
  };

  function date(row = {}, index) {
    if (row.deliveryDate || row.deliveryAt) return dateOf(row.deliveryDate || row.deliveryAt);
    const order = relatedOrder(row, index);
    return dateOf(order?.deliveryAt || order?.expectedAt || row.expectedAt);
  }

  function enrich(row = {}, index) {
    const order = relatedOrder(row, index);
    return { ...row, expectedAt: row.expectedAt || order?.expectedAt || '', deliveryDate: date(row, index) };
  }
  const enrichRows = (rows) => { const index = orderIndex(); return rows.map((row) => enrich(row, index)); };

  function inRange(value, range) {
    const [start, end] = Array.isArray(range) ? range : String(range || '').split(',');
    const day = dateOf(value);
    if (!start && !end) return true;
    return Boolean(day) && (!start || day >= start) && (!end || day <= end);
  }

  function rangeLabel(rows) {
    const index = orderIndex();
    const days = [...new Set(rows.map((row) => date(row, index)).filter(Boolean))].sort();
    return !days.length ? '--' : days[0] === days.at(-1) ? days[0] : `${days[0]} 至 ${days.at(-1)}`;
  }

  function matches(row, condition) {
    return Object.entries(condition || {}).every(([key, value]) => {
      if (value == null || value === '' || value === '全部') return true;
      if (key === 'deliveryDateRange') return inRange(date(row), value);
      if (key === 'expectedAtRange') return inRange(row.expectedAt, value);
      if (key === 'expectedAt') return dateOf(row.expectedAt) === dateOf(value);
      if (key === 'status') return (Array.isArray(value) ? value : String(value).split(',')).includes(row.status);
      if (key === 'isNetVegetable') return Boolean(row.isNetVegetable) === (value === true || value === 'true');
      if (Array.isArray(value)) return value.includes(row[key]);
      return String(row[key] ?? '').toLocaleLowerCase().includes(String(value).toLocaleLowerCase());
    });
  }

  function queryFrom(params) {
    return Object.fromEntries([...params.entries()].filter(([key]) =>
      !['deliveryExportKey', 'exportKey', 'exportData', 'printKey', 'printData', 'view', 'tab'].includes(key)
    ).map(([key, value]) => [key, /Range$/.test(key) ? value.split(',') : value]));
  }

  function saveRows(rows) {
    const key = `delivery-export-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    window.sessionStorage.setItem(key, JSON.stringify(enrichRows(rows)));
    return key;
  }

  function readRows(resource, params) {
    const key = params.get('deliveryExportKey');
    if (key) {
      try {
        const rows = JSON.parse(window.sessionStorage.getItem(key));
        return Array.isArray(rows) ? rows : [];
      } catch (error) { return []; }
    }
    return enrichRows(window.DemoStore?.get?.(resource) || []).filter((row) => matches(row, window.PrototypePreview.withoutDates(queryFrom(params))));
  }

  function defaultWeek() {
    const day = new Date();
    const format = (offset) => {
      const value = new Date(day.getFullYear(), day.getMonth(), day.getDate() + offset, 12);
      return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
    };
    return [format(1), format(7)];
  }

  const moment = (value = new Date()) => {
    const day = new Date(value);
    if (Number.isNaN(day.getTime())) return '--';
    const pad = (n) => String(n).padStart(2, '0');
    return `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())} ${pad(day.getHours())}:${pad(day.getMinutes())}:${pad(day.getSeconds())}`;
  };

  window.OrderDelivery = { date, dateOf, enrich, enrichRows, inRange, rangeLabel, matches, queryFrom, saveRows, readRows, defaultWeek, moment };
})();
