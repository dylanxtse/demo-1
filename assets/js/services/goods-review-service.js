(function () {
  const statusNames = {
    PENDING: '待审核',
    APPROVED: '已通过',
    REJECTED: '已驳回'
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function serviceError(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
  }

  function loadReviews() {
    if (!window.DemoStore) throw new Error('统一数据仓库未加载');
    return clone(window.DemoStore.get('goodsReviews') || []);
  }

  function saveReviews(items) {
    window.DemoStore.replace('goodsReviews', items);
  }

  function buildRows() {
    const products = window.ProductService?.getList() || [];
    const reviews = loadReviews();
    const reviewByCode = new Map(reviews.map((review) => [review.productCode, review]));
    const now = window.BusinessRules.now();

    let changed = false;
    products.forEach((product, index) => {
      if (reviewByCode.has(product.code)) return;
      const review = {
        id: `REVIEW-AUTO-${product.code}`,
        productCode: product.code,
        auditStatus: index % 3 === 0 ? 'PENDING' : 'APPROVED',
        auditContent: '',
        auditTime: index % 3 === 0 ? '' : now
      };
      reviews.push(review);
      reviewByCode.set(product.code, review);
      changed = true;
    });
    if (changed) saveReviews(reviews);

    return products.map((product) => {
      const review = reviewByCode.get(product.code);
      return {
        ...clone(product),
        reviewId: review.id,
        auditStatus: review.auditStatus,
        auditStatusName: statusNames[review.auditStatus] || '--',
        auditContent: review.auditContent || '',
        auditTime: review.auditTime || ''
      };
    });
  }

  function nowText() {
    return window.BusinessRules.now();
  }

  window.GoodsReviewService = {
    async list(query = {}) {
      const page = Math.max(1, Number(query.page) || 1);
      const pageSize = Math.max(1, Number(query.pageSize) || 20);
      const condition = query.condition || {};
      const keyword = String(condition.goodsName || '').trim().toLocaleLowerCase();
      const brand = String(condition.brand || '').trim().toLocaleLowerCase();
      const category = String(condition.category || '').trim();
      const auditStatus = String(condition.auditStatus || '').trim();
      const filtered = buildRows().filter((row) => {
        const nameMatches = !keyword ||
          row.name.toLocaleLowerCase().includes(keyword) ||
          row.code.toLocaleLowerCase().includes(keyword);
        const brandMatches = !brand || String(row.brand || '').toLocaleLowerCase().includes(brand);
        const categoryMatches = !category || category === '全部' ||
          row.category === category || row.category.startsWith(`${category}-`);
        const statusMatches = !auditStatus || auditStatus === '全部' || row.auditStatus === auditStatus;
        return nameMatches && brandMatches && categoryMatches && statusMatches;
      });
      const start = (page - 1) * pageSize;
      return {
        items: clone(filtered.slice(start, start + pageSize)),
        total: filtered.length,
        page,
        pageSize
      };
    },

    async get(id) {
      return clone(buildRows().find((row) => row.reviewId === id || row.code === id) || null);
    },

    async transition(id, action, payload = {}) {
      const reviews = loadReviews();
      const review = reviews.find((item) => item.id === id || item.productCode === id);
      if (!review) throw serviceError('REVIEW_NOT_FOUND', '未找到商品审核记录');
      if (review.auditStatus !== 'PENDING') {
        throw serviceError('REVIEW_ALREADY_HANDLED', '该商品已完成审核');
      }
      if (action === 'reject') {
        const reason = String(payload.auditContent || '').trim();
        if (!reason) throw serviceError('REJECT_REASON_REQUIRED', '请输入驳回原因');
        if (reason.length > 100) throw serviceError('REJECT_REASON_TOO_LONG', '驳回原因最多输入100个字符');
        review.auditStatus = 'REJECTED';
        review.auditContent = reason;
      } else if (action === 'approve') {
        review.auditStatus = 'APPROVED';
        review.auditContent = '';
      } else {
        throw serviceError('INVALID_ACTION', '不支持的审核操作');
      }
      review.auditTime = nowText();
      saveReviews(reviews);
      return this.get(review.id);
    },

    async shelf(id) {
      const row = await this.get(id);
      if (!row) throw serviceError('REVIEW_NOT_FOUND', '未找到商品审核记录');
      if (row.auditStatus === 'PENDING') throw serviceError('REVIEW_PENDING', '商品审核通过后才能上架');
      const updated = window.ProductService?.update(row.code, { status: 'ENABLE' });
      if (!updated) throw serviceError('PRODUCT_NOT_FOUND', '未找到商品');
      return clone(updated);
    },

    async options(type = 'auditStatus') {
      if (type === 'category') {
        const categories = Array.from(new Set(
          buildRows().map((row) => row.category).filter(Boolean)
        ));
        const roots = Array.from(new Set(categories.map((category) => category.split('-')[0])));
        return [
          { label: '全部', value: '全部', level: 0 },
          ...roots.flatMap((root) => [
            { label: root, value: root, level: 0 },
            ...categories
              .filter((category) => category.startsWith(`${root}-`))
              .map((category) => ({
                label: category.split('-').slice(1).join('-'),
                value: category,
                level: 1
              }))
          ])
        ];
      }
      return [
        { label: '全部', value: '全部' },
        { label: '待审核', value: 'PENDING' },
        { label: '已通过', value: 'APPROVED' },
        { label: '已驳回', value: 'REJECTED' }
      ];
    },

    async export(query = {}) {
      const result = await this.list({ ...query, page: 1, pageSize: Number.MAX_SAFE_INTEGER });
      return result.items;
    }
  };
})();
