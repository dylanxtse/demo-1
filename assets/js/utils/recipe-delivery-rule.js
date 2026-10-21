(function () {
  const DEFAULT_DAYS = 0;
  const DEFAULT_TIME = '07:30';

  const getConfig = () => {
    const settings = window.DemoStore?.getSettings?.() || {};
    const rawDays = String(settings.recipeDeliveryAdvanceDays ?? DEFAULT_DAYS).trim();
    const days = /^\d+$/.test(rawDays) && Number(rawDays) <= 365 ? Number(rawDays) : DEFAULT_DAYS;
    const rawTime = String(settings.recipeDeliveryTime ?? DEFAULT_TIME).trim();
    const time = /^([01]\d|2[0-3]):[0-5]\d$/.test(rawTime) ? rawTime : DEFAULT_TIME;
    return { days, time };
  };

  const expectedAt = (dates) => {
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

  window.RecipeDeliveryRule = { getConfig, expectedAt };
})();
