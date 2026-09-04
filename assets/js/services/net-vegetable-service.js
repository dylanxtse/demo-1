(function () {
  const number = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const hasValue = (value) => value !== '' && value != null;

  function getProductCatalog() {
    const stored = window.DemoStore?.get?.('products');
    if (Array.isArray(stored) && stored.length) return stored;
    return Array.isArray(window.MockProducts) ? window.MockProducts : [];
  }

  function getCodes(item) {
    if (typeof item === 'string' || typeof item === 'number') return [String(item).trim()].filter(Boolean);
    if (!item || typeof item !== 'object') return [];
    return [...new Set([
      item.productCode,
      item.goodsCode,
      item.productId,
      item.goodsId,
      item.code
    ].filter(hasValue).map((code) => String(code).trim()).filter(Boolean))];
  }

  function codeOf(item) {
    return getCodes(item)[0] || '';
  }

  function productCodeOf(product) {
    return String(product?.code || product?.productCode || product?.id || '').trim();
  }

  function findProduct(item) {
    const codes = new Set(getCodes(item));
    if (!codes.size) return null;
    return getProductCatalog().find((product) => codes.has(productCodeOf(product))) || null;
  }

  function isTruthy(value) {
    return value === true || value === 'true' || value === '是' || value === 1 || value === '1';
  }

  function isNetVegetable(item) {
    if (isTruthy(item?.isNetVegetable)) return true;
    return Boolean(findProduct(item)?.isNetVegetable);
  }

  function getTemplates() {
    if (typeof window.ProcessingTemplateService?.getList === 'function') {
      try {
        const templates = window.ProcessingTemplateService.getList();
        if (Array.isArray(templates)) return templates;
      } catch (error) {
        // 详情页仍可使用原始演示数据，避免加工方案服务异常阻断订单详情。
      }
    }
    const stored = window.DemoStore?.get?.('processingTemplates');
    if (Array.isArray(stored) && stored.length) return stored;
    return Array.isArray(window.MockProcessingTemplates) ? window.MockProcessingTemplates : [];
  }

  function getOutputRate(template, output) {
    return readCoefficient(output, ['refCoefficient', 'outputRate', 'yieldRate', 'processingYield', 'conversionRate', 'coefficient'])
      ?? readCoefficient(template, ['outputRate', 'yieldRate', 'processingYield', 'refCoefficient', 'conversionRate', 'coefficient']);
  }

  function getTemplateMatchForProduct(item) {
    const codes = new Set(getCodes(item));
    if (!codes.size) return null;
    const matches = getTemplates().map((template, index) => {
      const output = (template.outputs || []).find((candidate) => codes.has(codeOf(candidate)));
      if (!output) return null;
      const outputRate = getOutputRate(template, output);
      return {
        template,
        output,
        outputRate,
        hasOutputRate: outputRate != null && outputRate > 0,
        index
      };
    }).filter(Boolean);
    matches.sort((a, b) => {
      if (a.hasOutputRate !== b.hasOutputRate) return a.hasOutputRate ? -1 : 1;
      if (a.hasOutputRate && a.outputRate !== b.outputRate) return b.outputRate - a.outputRate;
      return a.index - b.index;
    });
    return matches[0] || null;
  }

  function getTemplateForProduct(item) {
    return getTemplateMatchForProduct(item)?.template || null;
  }

  function getLineQuantity(line) {
    const quantity = [line?.quantity, line?.orderQty, line?.demandQty, line?.orderQuantity, line?.qty]
      .find((candidate) => hasValue(candidate) && Number.isFinite(Number(candidate)));
    return number(quantity, 0);
  }

  function readCoefficient(item, keys) {
    for (const key of keys) {
      if (hasValue(item?.[key]) && Number.isFinite(Number(item[key]))) return number(item[key]);
    }
    return null;
  }

  function formatProductDisplay(item) {
    const product = findProduct(item);
    const code = codeOf(item) || productCodeOf(product);
    const productName = item?.productName || item?.goodsName || item?.name || product?.name || product?.productName || '--';
    const enriched = {
      ...product,
      ...item,
      productCode: code,
      goodsCode: code,
      productName,
      goodsName: item?.goodsName || productName,
      unit: item?.unit || product?.unit || '--',
      brand: item?.brand || product?.brand || '--',
      spec: item?.spec || product?.spec || '--'
    };
    if (typeof window.DomUtils?.formatProductDisplay === 'function') {
      return window.DomUtils.formatProductDisplay(enriched, getProductCatalog());
    }
    return `${productName}（${enriched.unit}/${enriched.brand}/${enriched.spec}）`;
  }

  function getMaterialPlan(line) {
    if (!isNetVegetable(line)) return null;

    const templateMatch = getTemplateMatchForProduct(line);
    const template = templateMatch?.template || null;
    if (!template) {
      return { template: null, materials: [], netQuantity: getLineQuantity(line), productCode: codeOf(line) };
    }

    const materials = Array.isArray(template.materials) ? template.materials : [];
    const outputs = Array.isArray(template.outputs) ? template.outputs : [];
    const output = templateMatch.output || outputs.find((item) => new Set(getCodes(item)).has(codeOf(line)));
    const isManyToOne = template.relationType === 'many-to-one'
      || (materials.length > 1 && outputs.length === 1);
    const netQuantity = getLineQuantity(line);
    const coefficientKeys = isManyToOne
      ? ['refConsumeQty', 'referencePurchaseCoefficient', 'purchaseCoefficient', 'coefficient']
      : ['refCoefficient', 'referencePurchaseCoefficient', 'purchaseCoefficient', 'conversionCoefficient', 'conversionRate', 'coefficient'];

    return {
      template,
      productCode: codeOf(line),
      netQuantity,
      isManyToOne,
      materials: materials.map((material) => {
        const coefficientSource = isManyToOne ? material : output;
        const referencePurchaseCoefficient = readCoefficient(coefficientSource, coefficientKeys);
        const referencePurchaseQty = referencePurchaseCoefficient > 0
          ? (isManyToOne ? netQuantity * referencePurchaseCoefficient : netQuantity / referencePurchaseCoefficient)
          : null;
        const materialProduct = findProduct(material);
        const materialCode = codeOf(material) || productCodeOf(materialProduct);
        const materialUnit = material.unit || materialProduct?.unit || '--';
        return {
          ...material,
          productCode: materialCode,
          productName: material.productName || material.goodsName || material.name || materialProduct?.name || '--',
          unit: materialUnit,
          displayName: formatProductDisplay({ ...material, productCode: materialCode, unit: materialUnit }),
          referencePurchaseCoefficient,
          referencePurchaseQty,
          purchaseCoefficient: referencePurchaseCoefficient,
          purchaseQty: referencePurchaseQty,
          calculation: isManyToOne ? 'multiply' : 'divide'
        };
      })
    };
  }

  window.NetVegetableService = {
    getProductCatalog,
    isNetVegetable,
    getTemplateForProduct,
    getMaterialPlan,
    getMaterialRows(line) {
      return getMaterialPlan(line)?.materials || [];
    }
  };
})();
