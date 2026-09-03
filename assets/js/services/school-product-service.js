(function () {
  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalize(value) {
    return String(value ?? '').trim().toLocaleLowerCase();
  }

  function getEnterpriseRows() {
    if (typeof window.ProductService?.getList !== 'function') return [];
    return window.ProductService.getList().map((product, index) => ({
      ...product,
      seq: product.seq ?? index + 1,
      supplier: product.supplier || product.defaultSupplier || '平台默认供应商',
      isNetVegetable: product.isNetVegetable === true
    }));
  }

  window.SchoolProductService = {
    getRows() {
      return clone(getEnterpriseRows());
    },

    filterRows(source, { keyword = '', category = '', netVegetable = '' } = {}) {
      const query = normalize(keyword);
      return source.filter((row) => {
        const textMatch = !query || `${row.code} ${row.name}`.toLocaleLowerCase().includes(query);
        const categoryText = String(row.category || '');
        const categoryParts = categoryText.split('-').map((part) => part.trim()).filter(Boolean);
        const categoryMatch = !category
          || categoryText === category
          || categoryParts[categoryParts.length - 1] === category;
        const netVegetableMatch = !netVegetable
          || (netVegetable === 'net' ? row.isNetVegetable === true : row.isNetVegetable !== true);
        return textMatch && categoryMatch && netVegetableMatch;
      });
    }
  };
})();
