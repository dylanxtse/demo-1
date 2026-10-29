(function () {
  const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value || {}, key);

  function evaluate(baseQuantity, nextQuantity, settings = window.DemoStore?.getSettings?.() || {}) {
    const config = settings && typeof settings === 'object' ? settings : {};
    const hasDirectionalLimits = hasOwn(config, 'recipePurchaseQtyChangeLowerLimitValue')
      || hasOwn(config, 'recipePurchaseQtyChangeUpperLimitValue');
    const legacyLimit = hasDirectionalLimits ? '' : String(config.recipePurchaseQtyChangeThresholdValue ?? '').trim();
    const rawLowerLimit = String(hasDirectionalLimits
      ? config.recipePurchaseQtyChangeLowerLimitValue ?? ''
      : legacyLimit).trim();
    const rawUpperLimit = String(hasDirectionalLimits
      ? config.recipePurchaseQtyChangeUpperLimitValue ?? ''
      : legacyLimit).trim();
    const enabled = Boolean(rawLowerLimit || rawUpperLimit);
    const lowerLimit = rawLowerLimit ? Number(rawLowerLimit) : null;
    const upperLimit = rawUpperLimit ? Number(rawUpperLimit) : null;

    if ((lowerLimit !== null && (!Number.isFinite(lowerLimit) || lowerLimit < 0))
      || (upperLimit !== null && (!Number.isFinite(upperLimit) || upperLimit < 0))) {
      return { valid: false, enabled: true, invalidSettings: true };
    }

    const base = Number(baseQuantity);
    const next = String(nextQuantity ?? '').trim() === '' ? 0 : Number(nextQuantity);
    if (!Number.isFinite(base) || base < 0 || !Number.isFinite(next) || next < 0) {
      return { valid: false, enabled, invalidQuantity: true };
    }

    const direction = next < base ? 'lower' : next > base ? 'upper' : 'none';
    const difference = Math.abs(next - base);
    const threshold = direction === 'lower' ? lowerLimit : direction === 'upper' ? upperLimit : null;
    if (threshold === null) {
      return { valid: true, enabled, mode: config.recipePurchaseQtyChangeThresholdMode === 'percentage' ? 'percentage' : 'quantity', direction, base, next, difference, allowedDifference: null };
    }

    const mode = config.recipePurchaseQtyChangeThresholdMode === 'percentage' ? 'percentage' : 'quantity';
    const allowedDifference = mode === 'percentage' ? base * threshold / 100 : threshold;
    const tolerance = Number.EPSILON * Math.max(1, base, next, allowedDifference) * 8;
    return {
      valid: difference <= allowedDifference + tolerance,
      enabled,
      mode,
      direction,
      threshold,
      base,
      next,
      difference,
      allowedDifference
    };
  }

  function message(result) {
    if (result?.invalidSettings) return '采购量修改限制配置无效，请联系企业管理员';
    if (result?.invalidQuantity) return '采购量不能小于0';
    return '采购量调整超出允许范围';
  }

  window.RecipePurchaseQuantityThreshold = Object.freeze({ evaluate, message });
})();
