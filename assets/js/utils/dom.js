(function () {
  const htmlEntities = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };

  window.DomUtils = {
    escapeHtml(value) {
      return String(value ?? '').replace(/[&<>"']/g, (character) => htmlEntities[character]);
    },

    formatProductDisplay(item = {}, catalog) {
      const text = (value) => String(value ?? '').trim();
      const meaningful = (value) => {
        const normalized = text(value);
        return normalized && normalized !== '--' && normalized !== '—' ? normalized : '';
      };
      const parseDisplay = (value) => {
        const source = text(value);
        const match = source.match(/\s*[（(]\s*([^（）()]*)\s*[）)]\s*$/);
        if (!match) return { name: source, unit: '', brand: '', spec: '' };
        const values = match[1].split('/').map((part) => text(part));
        return {
          name: source.slice(0, match.index).trim(),
          unit: values[0] || '',
          brand: values[1] || '',
          spec: values.slice(2).join('/') || ''
        };
      };
      const sources = Array.isArray(catalog)
        ? [catalog]
        : [
          typeof window.ProductService?.getList === 'function' ? window.ProductService.getList() : [],
          typeof window.DemoStore?.get === 'function' ? window.DemoStore.get('products') : [],
          Array.isArray(window.MockProducts) ? window.MockProducts : []
        ];
      const code = text(item.productCode || item.goodsCode || item.productId || item.goodsId || item.code);
      const rawDisplay = text(item.displayName || item.goodsName || item.name || item.productName);
      const parsed = parseDisplay(rawDisplay);
      const product = sources.flat().find((candidate) => {
        const candidateCode = text(candidate?.code || candidate?.productCode || candidate?.id);
        return code && candidateCode === code;
      }) || sources.flat().find((candidate) => {
        const candidateName = parseDisplay(candidate?.name || candidate?.productName || candidate?.goodsName).name;
        return candidateName && candidateName === parsed.name;
      }) || null;
      const name = text(product?.name || product?.productName) || parsed.name || text(item.productName || item.name || item.goodsName);
      const unit = meaningful(product?.unit) || meaningful(item.unit) || meaningful(parsed.unit);
      const brand = meaningful(product?.brand) || meaningful(item.brand) || meaningful(parsed.brand);
      const spec = meaningful(product?.spec) || meaningful(item.spec) || meaningful(parsed.spec);
      return `${name || '--'}（${unit || '--'}/${brand || '--'}/${spec || '--'}）`;
    }
  };
})();
