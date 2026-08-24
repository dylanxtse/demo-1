(function () {
  const storageKey = 'procurement-bidding-demo-v1';
  const categories = [
    '主食（米面粉点心类）', '食油', '果蔬', '肉（豆）制品',
    '水产品', '蛋奶类', '调料', '其他材料'
  ];
  const clone = (value) => JSON.parse(JSON.stringify(value));

  function seedProducts() {
    const names = [
      ['SSPP0110124', '白菜', '果蔬', 'kg', '--', '--'],
      ['SSPP0110125', '土豆', '果蔬', 'kg', '--', '--'],
      ['SSPP0110126', '西红柿', '果蔬', 'kg', '--', '--'],
      ['SSPP0110127', '胡萝卜', '果蔬', 'kg', '--', '--'],
      ['SSPP0110128', '鸡蛋', '蛋奶类', 'kg', '七鲜', '30枚/盒'],
      ['SSPP0110129', '纯牛奶', '蛋奶类', '箱', '伊利', '250ml*24'],
      ['SSPP0110130', '大米', '主食（米面粉点心类）', 'kg', '福临门', '25kg'],
      ['SSPP0110131', '面粉', '主食（米面粉点心类）', 'kg', '五得利', '25kg'],
      ['SSPP0110132', '食用植物调和油', '食油', '桶', '金龙鱼', '5L'],
      ['SSPP0110133', '花生油', '食油', '桶', '鲁花', '5L'],
      ['SSPP0110134', '鸡胸肉', '肉（豆）制品', 'kg', '--', '--'],
      ['SSPP0110135', '猪里脊', '肉（豆）制品', 'kg', '--', '--'],
      ['SSPP0110136', '冷冻虾仁', '水产品', 'kg', '--', '1kg/袋'],
      ['SSPP0110137', '带鱼段', '水产品', 'kg', '--', '--'],
      ['SSPP0110138', '生抽', '调料', '瓶', '海天', '1.9L'],
      ['SSPP0110139', '食醋', '调料', '瓶', '海天', '1.9L'],
      ['SSPP0110140', '木耳', '其他材料', 'kg', '--', '--'],
      ['SSPP0110141', '粉条', '主食（米面粉点心类）', 'kg', '--', '--'],
      ['SSPP0110142', '小米', '主食（米面粉点心类）', 'kg', '--', '5kg'],
      ['SSPP0110143', '豆腐', '肉（豆）制品', 'kg', '--', '--']
    ];
    return names.map(([code, name, category, unit, brand, spec], index) => ({
      id: `PRODUCT-${index + 1}`,
      code,
      name,
      category,
      unit,
      brand,
      spec,
      shelfLifeUnit: '--',
      shelfLife: '--',
      indicator: '',
      image: ''
    }));
  }

  function seedState() {
    const suppliers = [
      {
        id: 'SUP-001', name: '测试供应商', username: 'test_supplier', contact: '默认', phone: '18585858585',
        cooperationStart: '', cooperationEnd: '', status: '启用', licenseCode: '91130927MA0A000001', address: '河北省沧州市南皮县',
        jointVenture: false, hideCustomerPrice: false, qualifications: []
      },
      {
        id: 'SUP-002', name: '七鲜', username: 'qixian_supplier', contact: '刘小东', phone: '13499998888',
        cooperationStart: '2026-08-01', cooperationEnd: '2030-09-30', status: '启用', licenseCode: '91130927MA0A000002', address: '南皮县迎宾大道',
        jointVenture: false, hideCustomerPrice: false, qualifications: []
      },
      {
        id: 'SUP-003', name: '南皮供应商02', username: 'nanpi_supplier02', contact: '默认', phone: '13888888888',
        cooperationStart: '', cooperationEnd: '', status: '启用', licenseCode: '91130927MA0A000003', address: '南皮县城区',
        jointVenture: false, hideCustomerPrice: false, qualifications: []
      },
      {
        id: 'SUP-004', name: '南皮供应商01', username: 'nanpi_supplier01', contact: '默认', phone: '13659999999',
        cooperationStart: '', cooperationEnd: '', status: '启用', licenseCode: '91130927MA0A000004', address: '南皮县城区',
        jointVenture: false, hideCustomerPrice: false, qualifications: []
      },
      {
        id: 'SUP-005', name: '待审核示例供应商', username: '', contact: '李老师', phone: '13900000000',
        cooperationStart: '', cooperationEnd: '', status: '待审核', auditStatus: '待审核',
        source: '演示待审核数据', inviteToken: 'demo', inviteExpiresAt: '2030-12-31', submittedAt: '2026-08-15 10:20',
        businessNature: '企业', licenseCode: '91130927MA0A000005', nameFromLicense: '待审核示例供应商',
        capital: '500', businessStart: '2026-01-01', businessEnd: '2030-12-31', isLongTerm: false,
        businessPlace: '北京市延庆区教育局演示园区', address: '北京市延庆区教育局演示园区',
        representativeName: '张三', representativeIdNo: '110101199001011234',
        licenseFileName: '营业执照示例.png', idCardFrontFileName: '法人身份证人像.png', idCardBackFileName: '法人身份证国徽.png',
        qualifications: ['食品经营许可证示例.png'], jointVenture: false, hideCustomerPrice: false
      }
    ];
    const segments = [
      { id: 'SEG-001', name: '演示标段', categories: ['果蔬', '肉（豆）制品'], status: '启用' },
      { id: 'SEG-002', name: '姜0004', categories: ['主食（米面粉点心类）', '调料'], status: '启用' },
      { id: 'SEG-003', name: '姜标段2', categories: ['调料', '干货（三级）'], status: '启用' },
      { id: 'SEG-004', name: '姜标段1', categories: ['果蔬', '蛋奶类'], status: '启用' },
      { id: 'SEG-005', name: '标段一', categories: ['水产品'], status: '启用' },
      { id: 'SEG-006', name: '测试标段', categories: ['主食（米面粉点心类）'], status: '启用' }
    ];
    const rules = [
      {
        id: 'RULE-001', name: '系统指定多家供应商，手动选择一家3', way: '固定一种中标规则', openWay: '系统推荐1家供应商',
        rows: [{ winRule: '绝对最低价', voidRule: '供应商废标后向排名较小顺移下一位中标' }]
      },
      {
        id: 'RULE-002', name: '多种中标规则，开标前随机抽取', way: '多种中标规则，开标前随机抽取', openWay: '系统推荐1家供应商',
        rows: [
          { winRule: '绝对最低价', voidRule: '供应商废标后向排名较小顺移下一位中标' },
          { winRule: '相对最低价', voidRule: '废标后重新竞价' }
        ]
      },
      {
        id: 'RULE-003', name: '绝对最低价规则', way: '固定一种中标规则', openWay: '手动选择供应商',
        rows: [{ winRule: '绝对最低价', voidRule: '废标后顺延下一名' }]
      },
      {
        id: 'RULE-004', name: '最低价中标', way: '固定一种中标规则', openWay: '系统推荐1家供应商',
        rows: [{ winRule: '最低价中标', voidRule: '供应商废标后向排名较小顺移下一位中标' }]
      }
    ];
    const bids = [
      {
        id: 'BID-001', projectNo: 'XM0100016', bidNo: 'JJ01000020', name: '演示竞价02',
        supplyStart: '2026-08-11', supplyEnd: '2026-08-30', demandDeadline: '2026-08-11 09:30:00',
        quoteStart: '2026-08-11 09:30:00', quoteEnd: '2026-08-11 09:40:00', openTime: '2026-08-11 09:45:00',
        supplierIds: ['SUP-002'], supplierNames: ['七鲜'], school: '南皮县第二中学', segmentId: 'SEG-004', segmentName: '姜标段1',
        categories: ['鲜鸡蛋（三级）', '奶制品（三级）'], varietyCount: 0, quoteSupplierCount: 1, winnerSupplier: '--',
        status: '暂存', encryption: true, winnerLimit: 1, openPlace: '演示地点', ruleId: 'RULE-001', itemQuantity: '33333'
      },
      {
        id: 'BID-002', projectNo: 'XM0100017', bidNo: 'JJ01000021', name: '模拟演示05',
        supplyStart: '2026-08-16', supplyEnd: '2026-08-23', demandDeadline: '2026-08-15 10:00:00',
        quoteStart: '2026-08-15 10:05:00', quoteEnd: '2026-08-15 10:30:00', openTime: '2026-08-15 10:35:00',
        supplierIds: ['SUP-004'], supplierNames: ['南皮供应商01'], school: '南皮县第一中学', segmentId: 'SEG-002', segmentName: '姜0004',
        categories: ['果蔬（三级）'], varietyCount: 8, quoteSupplierCount: 2, winnerSupplier: '南皮供应商01',
        status: '已开标', encryption: false, winnerLimit: 1, openPlace: '教育局会议室', ruleId: 'RULE-004', itemQuantity: ''
      },
      {
        id: 'BID-003', projectNo: 'XM0100018', bidNo: 'JJ01000022', name: '8',
        supplyStart: '2026-08-18', supplyEnd: '2026-08-31', demandDeadline: '2026-08-16 09:30:00',
        quoteStart: '2026-08-16 09:35:00', quoteEnd: '2026-08-16 10:00:00', openTime: '2026-08-16 10:05:00',
        supplierIds: ['SUP-003'], supplierNames: ['南皮供应商02'], school: '南皮县第三中学', segmentId: 'SEG-006', segmentName: '测试标段',
        categories: ['米面（三级）'], varietyCount: 0, quoteSupplierCount: 1, winnerSupplier: '--',
        status: '待开标', encryption: false, winnerLimit: 1, openPlace: '教育局会议室', ruleId: 'RULE-001', itemQuantity: ''
      },
      {
        id: 'BID-004', projectNo: 'XM0100019', bidNo: 'JJ01000023', name: '学校食材公开竞价',
        supplyStart: '2026-08-20', supplyEnd: '2026-09-20', demandDeadline: '2026-08-18 09:30:00',
        quoteStart: '2026-08-18 09:35:00', quoteEnd: '2026-08-18 10:00:00', openTime: '2026-08-18 10:05:00',
        supplierIds: ['SUP-002', 'SUP-003'], supplierNames: ['七鲜', '南皮供应商02'], school: '南皮县第四中学', segmentId: 'SEG-001', segmentName: '演示标段',
        categories: ['果蔬（三级）', '肉制品（三级）'], varietyCount: 12, quoteSupplierCount: 2, winnerSupplier: '--',
        status: '需求提报中', encryption: true, winnerLimit: 0, openPlace: '线上开标', ruleId: 'RULE-002', itemQuantity: ''
      },
      {
        id: 'BID-005', projectNo: 'XM0100020', bidNo: 'JJ01000024', name: '南皮县学校食堂食材采购',
        supplyStart: '2026-08-22', supplyEnd: '2026-09-22', demandDeadline: '2026-08-20 09:30:00',
        quoteStart: '2026-08-20 09:35:00', quoteEnd: '2026-08-20 10:00:00', openTime: '2026-08-20 10:05:00',
        supplierIds: ['SUP-001'], supplierNames: ['测试供应商'], school: '南皮县实验小学', segmentId: 'SEG-005', segmentName: '标段一',
        categories: ['水产品（三级）'], varietyCount: 6, quoteSupplierCount: 1, winnerSupplier: '--',
        status: '已停止', encryption: false, winnerLimit: 1, openPlace: '线上开标', ruleId: 'RULE-003', itemQuantity: ''
      },
      {
        id: 'BID-006', projectNo: 'XM0100021', bidNo: 'JJ01000025', name: '秋季奶制品竞价',
        supplyStart: '2026-09-01', supplyEnd: '2026-09-30', demandDeadline: '2026-08-28 09:30:00',
        quoteStart: '2026-08-28 09:35:00', quoteEnd: '2026-08-28 10:00:00', openTime: '2026-08-28 10:05:00',
        supplierIds: ['SUP-002'], supplierNames: ['七鲜'], school: '南皮县第二中学', segmentId: 'SEG-004', segmentName: '姜标段1',
        categories: ['蛋奶类（三级）'], varietyCount: 5, quoteSupplierCount: 1, winnerSupplier: '--',
        status: '待开标', encryption: false, winnerLimit: 1, openPlace: '线上开标', ruleId: 'RULE-001', itemQuantity: ''
      },
      {
        id: 'BID-007', projectNo: 'XM0100022', bidNo: 'JJ01000026', name: '月度果蔬采购竞价',
        supplyStart: '2026-08-15', supplyEnd: '2026-08-21', demandDeadline: '2026-08-13 09:30:00',
        quoteStart: '2026-08-13 09:35:00', quoteEnd: '2026-08-13 10:00:00', openTime: '2026-08-13 10:05:00',
        supplierIds: ['SUP-003', 'SUP-004'], supplierNames: ['南皮供应商02', '南皮供应商01'], school: '南皮县第一中学', segmentId: 'SEG-001', segmentName: '演示标段',
        categories: ['果蔬（三级）'], varietyCount: 10, quoteSupplierCount: 2, winnerSupplier: '--',
        status: '已开标', encryption: false, winnerLimit: 1, openPlace: '教育局会议室', ruleId: 'RULE-004', itemQuantity: ''
      },
      {
        id: 'BID-008', projectNo: 'XM0100023', bidNo: 'JJ01000027', name: '食用油年度采购',
        supplyStart: '2026-09-01', supplyEnd: '2026-12-31', demandDeadline: '2026-08-25 09:30:00',
        quoteStart: '2026-08-25 09:35:00', quoteEnd: '2026-08-25 10:00:00', openTime: '2026-08-25 10:05:00',
        supplierIds: ['SUP-001', 'SUP-002'], supplierNames: ['测试供应商', '七鲜'], school: '南皮县实验小学', segmentId: 'SEG-002', segmentName: '姜0004',
        categories: ['食油（三级）'], varietyCount: 4, quoteSupplierCount: 2, winnerSupplier: '--',
        status: '暂存', encryption: true, winnerLimit: 1, openPlace: '线上开标', ruleId: 'RULE-002', itemQuantity: ''
      }
    ];
    const products = seedProducts();
    const limits = products.slice(0, 12).map((product, index) => ({
      id: `LIMIT-${index + 1}`,
      productId: product.id,
      productCode: product.code,
      productName: product.name,
      category: product.category,
      minPrice: (index + 1) * 0.8,
      maxPrice: (index + 1) * 1.2,
      unit: product.unit,
      brand: product.brand,
      spec: product.spec,
      indicator: index % 2 ? '符合国家食品安全标准' : '',
      executionStart: '2026-08-15',
      executionEnd: '2026-08-31',
      updatedAt: '2026-08-15 09:30:00'
    }));
    return {
      categories,
      suppliers,
      segments,
      rules,
      bids,
      products,
      limits,
      wastedBids: [
        { id: 'WASTE-001', projectNo: 'XM0100008', bidNo: 'JJ01000009', name: '姜测试003', supplyPeriod: '2026-07-16 ~ 2026-08-16', segment: '姜标段2', categories: '调料（三级），干货（三级）', varieties: 2, suppliers: 2, wastedSupplier: '南皮供应商02', reason: '434放' },
        { id: 'WASTE-002', projectNo: 'XM0100015', bidNo: 'JJ01000019', name: '演示数据2（勿动）', supplyPeriod: '2026-07-16 ~ 2026-08-16', segment: '演示标段', categories: '冻品（三级），水产品（三级）', varieties: 2, suppliers: 2, wastedSupplier: '南皮供应商01', reason: '飞镖原因' }
      ],
      relationships: [
        { id: 'REL-001', supplierId: 'SUP-004', supplierName: '南皮供应商01', projectNo: 'XM0100017', bidNo: 'JJ01000021', bidName: '模拟演示05', segment: '姜0004', supplyStart: '2026-08-16', supplyEnd: '2026-08-23', startSupplyAt: '2026-08-16', executionPrice: '中标价', changeLog: '--' },
        { id: 'REL-002', supplierId: 'SUP-003', supplierName: '南皮供应商02', projectNo: 'XM0100014', bidNo: 'JJ01000018', bidName: '演示数据', segment: '姜0004', supplyStart: '2026-08-27', supplyEnd: '2026-08-27', startSupplyAt: '2026-08-27', executionPrice: '中标价', changeLog: '--' },
        { id: 'REL-003', supplierId: 'SUP-003', supplierName: '南皮供应商02', projectNo: 'XM0100009', bidNo: 'JJ01000013', bidName: '测试2016', segment: '测试标段', supplyStart: '2030-09-22', supplyEnd: '2030-09-22', startSupplyAt: '2030-09-22', executionPrice: '中标价', changeLog: '--' }
      ]
    };
  }

  function readState() {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const state = JSON.parse(raw);
        if (!Array.isArray(state.suppliers)) state.suppliers = [];
        if (!state.suppliers.some((item) => item.id === 'SUP-005')) {
          state.suppliers.push(seedState().suppliers.find((item) => item.id === 'SUP-005'));
        }
        const pendingDemo = state.suppliers.find((item) => item.id === 'SUP-005');
        if (pendingDemo?.auditStatus === '待审核') pendingDemo.username = '';
        writeState(state);
        return state;
      }
    } catch (error) {
      // file:// 页面可能禁用 localStorage，继续使用内存演示数据即可。
    }
    return seedState();
  }

  function writeState(state) {
    try { window.localStorage.setItem(storageKey, JSON.stringify(state)); } catch (error) { /* ignore */ }
  }

  function transact(mutator) {
    const state = readState();
    const result = mutator(state);
    writeState(state);
    return clone(result === undefined ? state : result);
  }

  function nextId(prefix, records) {
    const max = records.reduce((highest, item) => {
      const match = String(item.id || '').match(/(\d+)$/);
      return Math.max(highest, match ? Number(match[1]) : 0);
    }, 0);
    return `${prefix}-${String(max + 1).padStart(3, '0')}`;
  }

  window.BiddingService = {
    categories: clone(categories),
    get(resource) { return clone(readState()[resource] || []); },
    getState() { return clone(readState()); },
    add(resource, value, prefix) {
      return transact((state) => {
        const records = state[resource] || (state[resource] = []);
        const item = { ...clone(value), id: value.id || nextId(prefix || resource.slice(0, 3).toUpperCase(), records) };
        records.unshift(item);
        return item;
      });
    },
    update(resource, id, patch) {
      return transact((state) => {
        const item = (state[resource] || []).find((record) => record.id === id);
        if (!item) return null;
        Object.assign(item, clone(patch));
        return item;
      });
    },
    remove(resource, id) {
      return transact((state) => {
        const records = state[resource] || [];
        const index = records.findIndex((record) => record.id === id);
        if (index < 0) return false;
        records.splice(index, 1);
        return true;
      });
    },
    toggle(resource, id, enabled = true) {
      return this.update(resource, id, { status: enabled ? '启用' : '禁用' });
    },
    reset() {
      const state = seedState();
      writeState(state);
      return clone(state);
    }
  };
})();
