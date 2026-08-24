(function () {
  const purchaseProducts = [
    ['SP0300039', '土豆丝', '斤', '--', '--', '果蔬-果蔬二级'],
    ['SP0300040', '土豆', '斤', '农家优选', '500g/份', '果蔬-果蔬二级'],
    ['SP0300038', '牛奶', '瓶', '--', '--', '蛋奶类-蛋奶类二级'],
    ['SP0300037', '牛奶', '瓶', '三元', '10瓶1箱', '蛋奶类-蛋奶类二级'],
    ['SP0300036', '大玉米棒子', 'KG', '--', '--', '主食（米面粉点心类）-粮食类'],
    ['SP0300034', '黑大米', '斤', '--', '--', '主食（米面粉点心类）-粮食类'],
    ['SP0300031', '鲫鱼', '斤', '--', '--', '水产品-水产品二级'],
    ['SP0300030', '金龙鱼5L桶装油', '瓶', '金龙鱼', '5L/瓶', '食油-食油二级'],
    ['SP0300029', '鲫鱼', '斤', '--', '--', '水产品-水产品二级'],
    ['SP0300026', '面', '斤', '--', '--', '主食（米面粉点心类）-粮食类'],
    ['SP0300025', '大米', 'KG', '--', '--', '主食（米面粉点心类）-粮食类'],
    ['SP0300024', '三元牛奶', '瓶', '三元', '10瓶1箱', '蛋奶类-蛋奶类二级'],
    ['SP0300023', '大饼', '斤', '--', '--', '主食（米面粉点心类）-粮食类'],
    ['SP0300020', '西红柿', 'KG', '--', '--', '果蔬-果蔬二级'],
    ['SP0300019', '大白菜', '斤', '--', '散装', '果蔬-果蔬二级'],
    ['SP0300018', '鸡蛋', '斤', '农家', '500g/份', '蛋奶类-蛋奶类二级'],
    ['SP0300017', '金龙鱼豆油', '斤', '--', '--', '食油-食油二级'],
    ['SP0300016', '面粉', '斤', '--', '--', '其他材料-其他二级'],
    ['SP0300015', '香蕉', '斤', '--', '--', '果蔬-果蔬二级'],
    ['SP0300014', '苹果', '斤', '--', '--', '果蔬-果蔬二级'],
    ['SP0300013', '鸡腿肉', '斤', '双汇', '500g/份', '肉（豆）制品-鲜肉（二级）'],
    ['SP0300012', '菜籽油', 'kg', '--', '--', '食油-食油二级'],
    ['SP0300011', '调和油', 'kg', '--', '--', '食油-食油二级'],
    ['SP0300010', '五得利面粉', '千克', '五得利', '5KG/袋', '主食（米面粉点心类）-面粉（二级）']
  ];

  const salesProducts = purchaseProducts.slice(0, 18);
  const supplierNames = ['绿源供应商', '粮油供应商', '乳业供应商', '南皮供应商01', '南皮供应商02', '平台默认供应商'];
  const purchaseTypes = ['供应商送货', '企业自加工', '市场自采'];
  const customerNames = ['第一实验学校', '阳光幼儿园', '育才中学', '第三小学', '机关第二食堂', '实验幼儿园'];
  const customerTypes = ['学校', '幼儿园', '学校', '学校', '机关单位', '幼儿园'];
  const districts = ['东城区', '南城区', '北城区', '东城区', '西城区', '南城区'];
  const purchaseFutureOnlyIndexes = new Set([1, 7]);
  const purchaseNoExecutionIndexes = new Set([5]);

  function buildExecutionRecords(index, basePrice, supplierOffset = 0, options = {}) {
    if (options.noExecution) return [];
    const month = options.month || String(8 + (index % 3)).padStart(2, '0');
    const base = Number(basePrice) || 0;
    const periods = [
      `2026-${month}-01 至 2026-${month}-07`,
      `2026-${month}-08 至 2026-${month}-14`,
      `2026-${month}-15 至 2026-${month}-21`
    ];
    return periods.map((executionCycle, periodIndex) => ({
      executionCycle,
      supplier: supplierNames[(index + supplierOffset + periodIndex * 2) % supplierNames.length],
      price: money(base + periodIndex * 0.4)
    }));
  }

  function money(value) {
    return value == null || value === '' ? '--' : Number(value).toFixed(4);
  }

  function executionRange(executionCycle) {
    const match = String(executionCycle || '').match(/(\d{4}-\d{2}-\d{2})\s*至\s*(\d{4}-\d{2}-\d{2})/);
    if (!match) return null;
    return {
      start: new Date(`${match[1]}T00:00:00`),
      end: new Date(`${match[2]}T23:59:59.999`)
    };
  }

  function resolveExecutionState(records, now = new Date()) {
    const current = records.find((record) => {
      const range = executionRange(record.executionCycle);
      return range && now >= range.start && now <= range.end;
    }) || null;
    const future = records.filter((record) => {
      const range = executionRange(record.executionCycle);
      return range && range.start > now;
    });
    return {
      current,
      future,
      available: [current, ...future].filter(Boolean)
    };
  }

  function productFromSeed(seed, index) {
    return {
      seq: index + 1,
      code: seed[0],
      name: seed[1],
      unit: seed[2],
      brand: seed[3],
      spec: seed[4],
      category: seed[5]
    };
  }

  function buildPurchaseRows() {
    return purchaseProducts.map((seed, index) => {
      const product = productFromSeed(seed, index);
      const market = [8, 6.8, 5, 5, 5, 10, 20, 55, 15, 1, 19, 10, 1, 20, 8, 22, 50, 30, 30, 23, 23, 12, 11, 19][index] || 10;
      const executionRecords = buildExecutionRecords(index, market - 1, 0, {
        month: purchaseFutureOnlyIndexes.has(index) ? '09' : '08',
        noExecution: purchaseNoExecutionIndexes.has(index)
      });
      const executionState = resolveExecutionState(executionRecords);
      const currentExecution = executionState.current;
      const bidPrice = currentExecution?.price || '';
      return {
        id: `PUR-${String(index + 1).padStart(4, '0')}`,
        ...product,
        purchaseType: purchaseTypes[index % purchaseTypes.length],
        supplier: currentExecution?.supplier || '--',
        currentPrice: bidPrice,
        currentSource: currentExecution ? '中标价' : '',
        manualPrice: '',
        agreementPrice: '',
        recentPrice: '',
        supplierQuote: '',
        marketPrice: '',
        bidPrice,
        executionRecords,
        currentExecution,
        futureExecutionRecords: executionState.future,
        availableExecutionRecords: executionState.available
      };
    });
  }

  function buildSalesRows() {
    return salesProducts.map((seed, index) => {
      const product = productFromSeed(seed, index);
      const market = [8, 7.2, 5.5, 5.8, 6.5, 11, 22, 58, 16, 1.2, 19.5, 10.5, 1.5, 20, 8.5, 22.5, 51, 31][index] || 10;
      const executionRecords = buildExecutionRecords(index, market - 0.5, 1);
      const executionState = resolveExecutionState(executionRecords);
      const currentExecution = executionState.current || executionRecords[executionRecords.length - 1];
      const manualPrice = currentExecution.price;
      return {
        id: `SAL-${String(index + 1).padStart(4, '0')}`,
        ...product,
        customerType: customerTypes[index % customerTypes.length],
        customerName: customerNames[index % customerNames.length],
        district: districts[index % districts.length],
        currentPrice: manualPrice,
        currentSource: '手动定价',
        manualPrice,
        agreementPrice: '',
        recentPrice: '',
        marketPrice: '',
        supplier: currentExecution.supplier,
        executionRecords
      };
    });
  }

  const purchaseRows = buildPurchaseRows();
  const salesRows = buildSalesRows();

  window.PriceExecutionService = {
    getList(type = 'purchase') {
      return (type === 'sales' ? salesRows : purchaseRows).map((row) => ({ ...row }));
    }
  };
})();
