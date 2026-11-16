(function () {
  const DEFAULT_DAYS = 0;
  const DEFAULT_TIME = '07:30';
  const MEALS = [
    { key: 'breakfast', name: '早餐' }, { key: 'lunch', name: '午餐' },
    { key: 'dinner', name: '晚餐' }, { key: 'morningSnack', name: '早点' },
    { key: 'afternoonSnack', name: '午点' }, { key: 'eveningSnack', name: '晚点' }
  ];
  const settings = () => window.DemoStore?.getSettings?.() || {};
  const isMealBased = () => {
    const value = settings().recipeDeliveryByMeal;
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
  };
  const mealKey = (value) => value === 'snack' ? 'afternoonSnack'
    : MEALS.find((meal) => meal.key === value || meal.name === value)?.key || value;
  const getConfig = (meal, values = settings()) => {
    const rule = values.recipeDeliveryByMeal?.[mealKey(meal)] || {};
    const fallbackDays = !meal ? (values.recipeDeliveryAdvanceDays ?? DEFAULT_DAYS) : mealKey(meal) === 'breakfast' ? 1 : DEFAULT_DAYS;
    const rawDays = String(rule.days ?? fallbackDays).trim();
    const rawTime = String(values.recipeDeliveryTime ?? DEFAULT_TIME).trim();
    return {
      days: /^\d+$/.test(rawDays) && Number(rawDays) <= 365 ? Number(rawDays) : DEFAULT_DAYS,
      ...(!meal ? { time: /^([01]\d|2[0-3]):[0-5]\d$/.test(rawTime) ? rawTime : DEFAULT_TIME } : {})
    };
  };
  const expectedAt = (dates, meal) => {
    const earliest = [...new Set(dates || [])].filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value)).sort()[0];
    if (!earliest) return '';
    const [year, month, day] = earliest.split('-').map(Number);
    const deliveryDate = new Date(year, month - 1, day, 12);
    if (deliveryDate.getFullYear() !== year || deliveryDate.getMonth() !== month - 1 || deliveryDate.getDate() !== day) return '';
    const config = getConfig();
    deliveryDate.setDate(deliveryDate.getDate() - config.days);
    const date = [deliveryDate.getFullYear(), String(deliveryDate.getMonth() + 1).padStart(2, '0'), String(deliveryDate.getDate()).padStart(2, '0')].join('-');
    return `${date} ${config.time}:00`;
  };

  const deliveryAt = (expected, meal) => window.OrderSchema.deliveryAt({ expectedAt: expected, mealKey: meal }, settings());

  const productKey = (row) => `${row.productCode}::${row.unit || '--'}`;
  // Allocate in the same precision as the store. Largest remainders preserve
  // edited purchase totals and keep standard products in whole units.
  function allocate(total, weights, standard) {
    const places = standard ? 0 : Math.max(2, Number(settings().quantityDecimal || 0));
    const factor = 10 ** places;
    const ticks = Math.round(Number(total) * factor);
    const sum = weights.reduce((value, weight) => value + Math.max(0, weight), 0);
    if (!(sum > 0)) return weights.map(() => 0);
    const exact = weights.map((weight) => ticks * Math.max(0, weight) / sum);
    const parts = exact.map(Math.floor);
    const ranked = exact.map((value, index) => ({ index, remainder: value - parts[index] }))
      .filter(({ index }) => weights[index] > 0).sort((a, b) => b.remainder - a.remainder || a.index - b.index);
    const remaining = ticks - parts.reduce((value, part) => value + part, 0);
    for (let index = 0; index < remaining; index += 1) parts[ranked[index % ranked.length].index] += 1;
    return parts.map((part) => part / factor);
  }

  // Sources keep the actual date and meal before any cross-date aggregation.
  // Each source has rows with demand weights; items hold final purchase totals.
  function splitItems(items, sources, splitByMeal) {
    const groups = new Map();
    const purchasedKeys = new Set(items.filter((item) => item.orderQty > 0).map(productKey));
    sources.filter((source) => (source.rows || []).some((row) => row.weight > 0 && purchasedKeys.has(productKey(row)))).forEach((source) => {
      const expected = source.expectedAt || expectedAt([source.date]);
      const at = deliveryAt(expected, source.key);
      if (!at) throw new Error('期望送达时间配置无效');
      const key = `${at}::${expected}::${splitByMeal ? source.key : 'all-meals'}`;
      if (!groups.has(key)) groups.set(key, { key: key.replace(/[^a-zA-Z0-9-]/g, '_'), expectedAt: expected, deliveryAt: at,
        mealKey: splitByMeal ? source.key : '', sources: [], items: [] });
      groups.get(key).sources.push(source);
    });
    const batches = [...groups.values()];
    items.forEach((item) => {
      const key = productKey(item);
      const weights = batches.map((batch) => batch.sources.reduce((sum, source) => sum
        + (source.rows || []).filter((row) => productKey(row) === key)
          .reduce((total, row) => total + Number(row.weight || 0), 0), 0));
      const amounts = allocate(item.orderQty, weights, item.isStandardProduct === true);
      batches.forEach((batch, index) => {
        if (!(amounts[index] > 0)) return;
        const origins = batch.sources.filter((source) => (source.rows || []).some((row) => productKey(row) === key && row.weight > 0));
        batch.items.push({ ...item, orderQty: amounts[index],
          remark: `${origins.map((source) => `${source.date}${source.name}`).join('、')}需求` });
      });
    });
    return batches.filter((batch) => batch.items.length).map((batch) => ({ ...batch,
      dates: [...new Set(batch.sources.map((source) => source.date))].sort(),
      mealName: [...new Set(batch.sources.map((source) => source.name))].join('、'),
      mealPeople: batch.sources.reduce((sum, source) => sum + Number(source.people || 0), 0)
    }));
  }
  window.RecipeDeliveryRule = { MEALS, getConfig, isMealBased, expectedAt, deliveryAt, splitItems };
})();
