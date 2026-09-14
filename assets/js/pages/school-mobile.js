(function () {
  const app = document.getElementById('schoolMobileApp');
  const recipeService = window.SchoolRecipeService;
  const attendanceService = window.SchoolRecipeAttendanceService;
  const demandService = window.SchoolRecipeDemandService;
  const orderService = window.SchoolOrderService;
  const canteenConfig = window.SchoolCanteenConfigService;
  const MAX_ATTENDANCE_PEOPLE = 100000;

  if (!app || !recipeService || !attendanceService || !demandService || !orderService) {
    if (app) app.innerHTML = '<div class="school-mobile-error">学校移动端原型依赖加载失败，请返回学校端 Web 重试。</div>';
    return;
  }

  const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
  const weekdayNames = ['日', '一', '二', '三', '四', '五', '六'];
  let menus = recipeService.getAll().sort((a, b) => String(a.date).localeCompare(String(b.date)));
  let firstDate = menus[0]?.date || '2026-09-07';
  const defaultCanteen = window.SchoolOrderService?.CANTEEN_NAME || '第一食堂';
  const canteenStorageKey = 'school-recipe-current-canteen';
  const mobileAuthStorageKey = 'school-mobile-auth-session-v1';
  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  const number = (value) => Number(value || 0).toLocaleString('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 12,
    useGrouping: false
  });
  const quantity = (value) => Number(value || 0).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: false
  });
  const ingredientQuantity = (item) => {
    const rawValue = item?.perCapitaQty
      ?? item?.quantity
      ?? item?.qty
      ?? item?.dosage
      ?? item?.amount
      ?? 0;
    const parsed = typeof rawValue === 'string' ? Number.parseFloat(rawValue) : Number(rawValue);
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const dateText = (date) => {
    if (!date) return '--';
    const dateObject = new Date(String(date) + 'T00:00:00');
    const weekday = Number.isNaN(dateObject.getTime()) ? '' : ' 星期' + weekdayNames[dateObject.getDay()];
    return String(date).slice(0, 4) + '年' + String(date).slice(5, 7) + '月' + String(date).slice(8, 10) + '日' + weekday;
  };
  const weekdayText = (date) => {
    const dateObject = new Date(String(date || '') + 'T00:00:00');
    return Number.isNaN(dateObject.getTime()) ? '' : weekdayNames[dateObject.getDay()];
  };
  const shortDate = (date) => String(date || '').slice(5).replace('-', '/');
  const dateValueMarkup = (date) => {
    const text = dateText(date);
    const match = text.match(/^(.*)\s(星期[日一二三四五六])$/);
    return match
      ? escapeHtml(match[1]) + ' <small class="school-mobile-weekday">' + escapeHtml(match[2]) + '</small>'
      : escapeHtml(text);
  };
  const compactDateValueMarkup = (date) => escapeHtml(String(date || '--').replace(/-/g, '.'));
  const recipeSummaryDateMarkup = (date) => {
    const weekday = weekdayText(date);
    return '<div class="school-mobile-recipe-summary-date-line"><span class="school-mobile-recipe-summary-date">'
      + compactDateValueMarkup(date)
      + '</span>'
      + (weekday ? '<span class="school-mobile-recipe-summary-weekday">星期' + escapeHtml(weekday) + '</span>' : '')
      + '</div>';
  };
  const monthKeyOf = (date) => String(date || '').slice(0, 7);
  const dateKeyFor = (monthKey, day) => monthKey + '-' + String(day).padStart(2, '0');
  const shiftMonthKey = (monthKey, offset) => {
    const [year, month] = String(monthKey || '').split('-').map(Number);
    const date = new Date(year || 2026, (month || 1) - 1 + offset, 1);
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
  };
  const daysInMonth = (monthKey) => {
    const [year, month] = String(monthKey || '').split('-').map(Number);
    return new Date(year || 2026, month || 1, 0).getDate();
  };
  const normalizeExpectedAtTime = (value) => {
    const parts = String(value || '').split(':');
    const normalizePart = (raw, fallback, max) => {
      const parsed = Number(raw);
      return String(!String(raw || '').trim() || !Number.isFinite(parsed) || parsed < 0 || parsed > max ? fallback : Math.floor(parsed)).padStart(2, '0');
    };
    const hour = normalizePart(parts[0], 7, 23);
    const minute = normalizePart(parts[1], 30, 59);
    const second = normalizePart(parts[2], 0, 59);
    return `${hour}:${minute}:${second}`;
  };
  const expectedAtTimePart = (time, part, value) => {
    const parts = normalizeExpectedAtTime(time).split(':');
    const index = { hour: 0, minute: 1, second: 2 }[part];
    if (index !== undefined) parts[index] = String(value).padStart(2, '0');
    return parts.join(':');
  };
  const parseExpectedAtValue = (value) => {
    const text = String(value || '').trim().replace('T', ' ');
    const match = text.match(/^(\d{4}-\d{2}-\d{2})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
    return {
      date: match?.[1] || '',
      time: match ? normalizeExpectedAtTime(`${match[2] || '07'}:${match[3] || '30'}:${match[4] || '00'}`) : '07:30:00'
    };
  };
  const expectedAtInputValue = (date, time) => date ? `${date}T${normalizeExpectedAtTime(time)}` : '';
  const expectedAtDisplayValue = (value) => {
    const parts = parseExpectedAtValue(value);
    return parts.date ? `${parts.date.replace(/-/g, '/')} ${parts.time}` : '请选择日期时间';
  };
  const expectedAtMonthText = (monthKey) => {
    const [year, month] = String(monthKey || '').split('-');
    return `${year || '--'}年${month || '--'}月`;
  };
  const anchorMonthKey = monthKeyOf(firstDate) || '2026-09';
  const supportedMonthKeys = [
    shiftMonthKey(anchorMonthKey, -1),
    anchorMonthKey,
    shiftMonthKey(anchorMonthKey, 1)
  ];
  const isSupportedMonth = (monthKey) => supportedMonthKeys.includes(monthKey);
  const menuFor = (date) => menus.find((menu) => menu.date === date) || null;
  const dishCount = (menu) => (menu?.meals || []).reduce((total, meal) => total + (meal.dishes || []).length, 0);
  const ingredientCount = (menu) => (menu?.meals || []).reduce((total, meal) => (
    total + (meal.dishes || []).reduce((dishTotal, dish) => dishTotal + (dish.ingredients || []).length, 0)
  ), 0);
  const productFor = (item) => {
    const catalog = window.SchoolOrderService?.getProductCatalog?.() || window.DemoStore?.get?.('products') || [];
    const code = item?.productCode || item?.productId || item?.goodsCode || '';
    return catalog.find((product) => String(product.code || product.id) === String(code)) || {};
  };
  const productName = (item) => item?.productName || productFor(item).name || item?.name || '未关联采购商品';
  const productCode = (item) => item?.productCode || item?.productId || item?.goodsCode || productFor(item).code || productFor(item).id || '--';
  const productUnit = (item) => item?.unit || item?.productUnit || productFor(item).unit || '--';
  const isStandardProduct = (item) => Boolean(
    item?.isStandardProduct === true
    || item?.isStandardProduct === 'true'
    || item?.isStandardProduct === '是'
    || productFor(item).isStandardProduct === true
    || productFor(item).isStandard === true
  );
  const purchaseQuantity = (value, item) => {
    const demandQuantity = Number(value || 0);
    return isStandardProduct(item) ? Math.ceil(demandQuantity) : demandQuantity;
  };
  const purchaseTotalQuantity = (row, currentParticipants = participants()) => currentParticipants.reduce(
    (total, participant) => total + purchaseQuantity(row?.participantQty?.[participant.key], row),
    0
  );
  const fixedQuantity = (value) => {
    const text = String(value ?? '').trim();
    if (!text) return '';
    const parsed = Number(text);
    return Number.isFinite(parsed) ? parsed.toLocaleString('zh-CN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: false
    }) : '';
  };
  const purchaseRowKey = (item) => String(item?.key || `${item?.productCode || item?.productName || ''}::${item?.unit || '--'}`);
  const purchaseQuantityKey = (item, participantKey) => `${purchaseRowKey(item)}::${participantKey}`;
  const orderTagName = (participant) => String(
    participant?.orderTag
      || `${participant?.label || participant?.tagName || '订单标签'}-${participant?.nutritious || '不区分'}`
  );

  const storedMobileAuth = window.AppStorage?.read?.(mobileAuthStorageKey, null);
  const inheritedSession = window.DemoStore?.getSession?.() || null;
  let mobileSession = storedMobileAuth?.initialized
    ? clone(storedMobileAuth.session)
    : inheritedSession ? clone(inheritedSession) : null;

  function persistMobileSession(session) {
    mobileSession = session ? clone(session) : null;
    window.AppStorage?.write?.(mobileAuthStorageKey, { initialized: true, session: mobileSession });
  }

  function currentMobileSession() {
    return mobileSession ? clone(mobileSession) : null;
  }

  window.SchoolMobileAuth = {
    getSession: currentMobileSession
  };

  function readCanteenNames() {
    const source = canteenConfig?.readCanteens?.() || window.SchoolReferenceData?.canteens || [];
    const names = [...new Set(source
      .map((item) => typeof item === 'string' ? item : item?.name)
      .filter(Boolean)
      .filter((name) => name !== '默认'))];
    return names.length ? names : [defaultCanteen];
  }

  const canteenNames = readCanteenNames();
  const storedCanteen = window.AppStorage?.read?.(canteenStorageKey, '') || '';
  const initialCanteen = canteenNames.includes(storedCanteen)
    ? storedCanteen
    : canteenNames.includes(defaultCanteen) ? defaultCanteen : canteenNames[0];

  /* 商品下单模块：沿用源页面的移动端信息架构，并复用项目本地商品语义与持久化边界。 */
  const productOrderAssetRoot = './assets/images/order-assistant/';
  const productOrderSupplierNames = [
    '阳光智园供应链管理有限公司',
    '产品部学校食材集采供应链有限公司'
  ];
  const productOrderCanteens = ['111'];
  const productOrderTags = [
    '其他-不区分', '其他-非营养餐', '教师-不区分', '教师-非营养餐',
    '教师-营养餐', '学生-不区分', '学生-非营养餐', '学生-营养餐'
  ];
  const productOrderCategories = [
    {
      key: 'staple', name: '主食（米面粉点心类）', image: productOrderAssetRoot + 'order-category-staple.png',
      subcategories: [
        ['staple-root', '主食三级'], ['staple-dumpling', '饺子面粉'], ['staple-rice', '大米'],
        ['staple-flour', '通用面粉'], ['staple-millet', '小米'], ['staple-glutinous', '糯米'],
        ['staple-special', '特级面粉'], ['staple-grain', '杂粮米']
      ],
      products: [
        { id: 'order-staple-black-rice', code: 'SP0300034', name: '黑大米', unit: '斤', price: 10, stock: 150, subKey: 'staple-root', spec: '25kg/袋' },
        { id: 'order-staple-rice', code: 'SP0300025', name: '大米', unit: 'KG', price: 19, stock: 120, subKey: 'staple-rice', spec: '散装' },
        { id: 'order-staple-flour', code: 'SP0300016', name: '面粉', unit: '斤', price: 30, stock: 80, subKey: 'staple-flour', spec: '25kg/袋' },
        { id: 'order-staple-cake', code: 'SP0300023', name: '大饼', unit: '斤', price: 1, stock: 90, subKey: 'staple-root', spec: '散装' }
      ]
    },
    {
      key: 'oil', name: '食油', image: productOrderAssetRoot + 'order-category-oil.png',
      subcategories: [
        ['oil-root', '食油三级'], ['oil-peanut', '花生油'], ['oil-soy', '大豆油'], ['oil-rapeseed', '菜籽油'],
        ['oil-tea', '茶籽油'], ['oil-corn', '玉米油'], ['oil-walnut', '核桃油'], ['oil-sunflower', '葵花籽油'],
        ['oil-flax', '亚麻籽油'], ['oil-olive', '橄榄油']
      ],
      products: [
        { id: 'order-oil-golden-10l', code: 'OA0300001', name: '金龙鱼10L', unit: '桶', price: 150, stock: 150, subKey: 'oil-root', spec: '10L/桶' },
        { id: 'order-oil-golden-5l', code: 'SP0300030', name: '金龙鱼5L桶装油', unit: '瓶', price: 55, stock: 80, subKey: 'oil-root', spec: '5L/瓶' },
        { id: 'order-oil-soy', code: 'SP0300017', name: '金龙鱼豆油', unit: '斤', price: 50, stock: 120, subKey: 'oil-soy', spec: '散装' }
      ]
    },
    {
      key: 'produce', name: '果蔬', image: productOrderAssetRoot + 'order-category-produce.png',
      subcategories: [
        ['produce-root', '果蔬三级'], ['produce-leaf', '叶菜类'], ['produce-root-vegetable', '根茎类'],
        ['produce-fruit', '茄果类'], ['produce-mushroom', '菌菇类'], ['produce-fruit-fresh', '水果']
      ],
      products: [
        { id: 'order-produce-potato', code: 'SP0300040', name: '土豆', unit: '斤', price: 3.2, stock: 200, subKey: 'produce-root', spec: '散装' },
        { id: 'order-produce-tomato', code: 'SP0300020', name: '西红柿', unit: 'KG', price: 5.6, stock: 120, subKey: 'produce-fruit', spec: '散装' },
        { id: 'order-produce-cabbage', code: 'SP0300019', name: '大白菜', unit: '斤', price: 2.2, stock: 180, subKey: 'produce-leaf', spec: '散装' },
        { id: 'order-produce-banana', code: 'SP0300015', name: '香蕉', unit: '斤', price: 30, stock: 60, subKey: 'produce-fruit-fresh', spec: '散装' },
        { id: 'order-produce-apple', code: 'SP0300014', name: '苹果', unit: '斤', price: 23, stock: 70, subKey: 'produce-fruit-fresh', spec: '散装' }
      ]
    },
    {
      key: 'meat', name: '肉（豆）制品', image: productOrderAssetRoot + 'order-category-meat.png',
      subcategories: [['meat-root', '肉（豆）制品三级'], ['meat-pork', '猪肉'], ['meat-beef', '牛肉'], ['meat-poultry', '禽肉'], ['meat-bean', '豆制品']],
      products: [
        { id: 'order-meat-chicken', code: 'SP0300013', name: '鸡腿肉', unit: '斤', price: 23, stock: 100, subKey: 'meat-poultry', spec: '冷鲜' },
        { id: 'order-meat-pork', code: 'OA0300002', name: '鲜猪肉', unit: '斤', price: 24, stock: 100, subKey: 'meat-pork', spec: '冷鲜' }
      ]
    },
    {
      key: 'fish', name: '水产品', image: productOrderAssetRoot + 'order-category-fish.png',
      subcategories: [['fish-root', '水产品三级'], ['fish-freshwater', '淡水鱼'], ['fish-sea', '海水鱼'], ['fish-shrimp', '虾蟹类']],
      products: [
        { id: 'order-fish-carp', code: 'SP0300031', name: '净膛鲫鱼', unit: '斤', price: 18.5, stock: 90, subKey: 'fish-freshwater', spec: '500g左右/条' },
        { id: 'order-fish-shrimp', code: 'SP0300029', name: '鲫鱼', unit: '斤', price: 15, stock: 100, subKey: 'fish-freshwater', spec: '鲜活' }
      ]
    },
    {
      key: 'dairy', name: '蛋奶类', image: null, emoji: '🥛',
      subcategories: [['dairy-root', '蛋奶类三级'], ['dairy-egg', '鸡蛋'], ['dairy-milk', '牛奶'], ['dairy-snack', '奶制品']],
      products: [
        { id: 'order-dairy-egg', code: 'SP0300018', name: '鸡蛋', unit: '斤', price: 22, stock: 160, subKey: 'dairy-egg', spec: '鲜鸡蛋' },
        { id: 'order-dairy-milk', code: 'SP0300024', name: '三元牛奶', unit: '瓶', price: 10, stock: 150, subKey: 'dairy-milk', spec: '10瓶1箱' }
      ]
    },
    {
      key: 'seasoning', name: '调料', image: productOrderAssetRoot + 'order-category-seasoning.png',
      subcategories: [['seasoning-root', '调料三级'], ['seasoning-salt', '食用盐'], ['seasoning-sauce', '酱油醋'], ['seasoning-spice', '调味料']],
      products: [
        { id: 'order-seasoning-salt', code: 'OA0300003', name: '食用盐', unit: '袋', price: 3.5, stock: 90, subKey: 'seasoning-salt', spec: '500g/袋' },
        { id: 'order-seasoning-soy', code: 'OA0300004', name: '生抽酱油', unit: '瓶', price: 12, stock: 70, subKey: 'seasoning-sauce', spec: '1.9L/瓶' }
      ]
    },
    {
      key: 'other', name: '其他材料', image: productOrderAssetRoot + 'order-category-other.png',
      subcategories: [['other-root', '其他材料三级'], ['other-flour', '面粉'], ['other-snack', '佐餐食品'], ['other-misc', '其他']],
      products: [
        { id: 'order-other-noodle', code: 'OA0300005', name: '挂面', unit: '把', price: 8, stock: 100, subKey: 'other-snack', spec: '500g/把' },
        { id: 'order-other-starch', code: 'OA0300006', name: '淀粉', unit: '袋', price: 9, stock: 80, subKey: 'other-flour', spec: '500g/袋' }
      ]
    }
  ];
  const productOrderStorageKey = 'school-mobile-product-cart-v1';
  const productOrderOrdersStorageKey = 'school-mobile-product-orders-v1';
  const nextProductOrderDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date.toISOString().slice(0, 10);
  };
  const readProductOrderCart = () => {
    const source = window.AppStorage?.read?.(productOrderStorageKey, {}) || {};
    return Object.fromEntries(Object.entries(source).map(([id, value]) => {
      const entry = typeof value === 'number' ? { qty: value, note: '' } : (value || {});
      const qty = Math.max(0, Math.floor(Number(entry.qty) || 0));
      return [id, { qty, note: String(entry.note || '') }];
    }).filter(([, entry]) => entry.qty > 0));
  };
  const readProductOrderOrders = () => {
    const source = window.AppStorage?.read?.(productOrderOrdersStorageKey, []);
    return Array.isArray(source) ? clone(source) : [];
  };
  const simulatedPendingProductOrderId = 'MOBILE-ORDER-SIMULATED-PENDING';
  const simulatedPendingProductOrder = () => ({
    id: simulatedPendingProductOrderId,
    orderNo: 'DD202609140400001',
    supplierName: productOrderSupplierNames[0],
    canteen: '111',
    orderTag: '其他-不区分',
    expectedAt: nextProductOrderDate(),
    status: '待确认',
    source: '商品下单',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    productCount: 2,
    orderAmount: 69,
    items: [
      {
        productId: 'order-staple-black-rice',
        productCode: 'SP0300034',
        productName: '黑大米',
        unit: '斤',
        orderPrice: 10,
        orderQty: 5,
        remark: '请按食堂要求分装'
      },
      {
        productId: 'order-staple-rice',
        productCode: 'SP0300025',
        productName: '大米',
        unit: 'KG',
        orderPrice: 19,
        orderQty: 1,
        remark: '送货时请联系食堂管理员'
      }
    ]
  });
  const ensureSimulatedPendingOrder = (orders) => {
    const source = Array.isArray(orders) ? orders : [];
    return source.some((order) => String(order?.id || '') === simulatedPendingProductOrderId)
      ? source
      : [simulatedPendingProductOrder(), ...source];
  };

  const state = {
    screen: 'main',
    tab: 'home',
    attendanceReturnTab: '',
    date: firstDate,
    monthKey: monthKeyOf(firstDate) || anchorMonthKey,
    mealKey: '',
    canteen: initialCanteen,
    attendance: null,
    attendanceInputMode: 'dining',
    attendanceValidationHighlightDate: '',
    sheet: null,
    toast: null,
    toastTimer: 0,
    confirmDates: new Set(),
    confirmParticipantKey: '',
    purchaseQtyOverrides: {},
    purchaseQuantityEditingKey: '',
    expectedAt: '',
    submitting: false,
    recordKeyword: '',
    record: null,
    profileOrder: null,
    orderDetailEditing: false,
    orderDetailDraft: null,
    orderDetailPickerField: '',
    orderDetailPickerDraft: '',
    orderDetailReturn: '',
    profileView: 'home',
    profileOrderFilter: '全部',
    profileOrderSearchValue: '',
    profileOrderKeyword: '',
    profileSection: 'submissions',
    loginUsername: '',
    loginPassword: '',
    loginAgreement: false,
    dateStripScroll: {},
    productSupplier: productOrderSupplierNames[0],
    productSupplierDraft: productOrderSupplierNames[0],
    productCategory: 'staple',
    productSubcategory: 'staple-root',
    productSearchValue: '',
    productKeyword: '',
    productCart: readProductOrderCart(),
    productOrders: ensureSimulatedPendingOrder(readProductOrderOrders()),
    productOrderFilter: '全部',
    productOrderSearchValue: '',
    productOrderKeyword: '',
    productCheckout: { canteen: '', expectedDate: nextProductOrderDate(), tag: '' },
    productCheckoutDatePickerMonth: '',
    productCheckoutDatePickerDraft: '',
    productPickerField: '',
    productPickerDraft: '',
    productEditingOrderId: '',
    orderDetailProductAddMode: false,
    orderDetailProductCartBackup: null
  };
  let mealSwipeStart = null;
  let productSwipeStart = null;

  function currentCanteen() {
    return canteenConfig?.getCanteen?.(state.canteen) || { id: '', name: state.canteen };
  }

  function participants() {
    return attendanceService.participantsFor(currentCanteen());
  }

  function serviceOptions() {
    return { canteen: currentCanteen(), participants: participants() };
  }

  function temporaryNonDiningFor(mealKey, participant) {
    if (attendanceService.temporaryNonDiningFor) {
      return attendanceService.temporaryNonDiningFor(state.attendance, mealKey, participant);
    }
    return attendanceService.valueForParticipant(state.attendance?.temporaryNonDining?.[mealKey] || {}, participant);
  }

  function nonDiningIssue(mealKey, participant) {
    const value = temporaryNonDiningFor(mealKey, participant);
    if (value === '' || value == null) return '';
    const parsed = Number(value);
    const diningValue = attendanceService.valueForParticipant(state.attendance?.meals?.[mealKey] || {}, participant);
    const diningPeople = Number(diningValue);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > MAX_ATTENDANCE_PEOPLE) return '请输入 0～100000 的整数';
    if (parsed > 0 && (!Number.isInteger(diningPeople) || diningPeople < 1 || diningPeople > MAX_ATTENDANCE_PEOPLE)) return '请先填写总人数';
    if (parsed > diningPeople) return '不能大于总人数';
    return '';
  }

  const startWithEmptyAttendance = Boolean(attendanceService.consumeResetOnReturn?.(currentCanteen()));

  function loadAttendance(preserveEmpty = false) {
    state.attendance = attendanceService.get(state.date, currentCanteen());
    if (startWithEmptyAttendance && preserveEmpty) {
      state.attendance = attendanceService.emptyRecord(state.date, currentCanteen());
      state.attendance.meals = {};
    }
  }

  function saveAttendanceDraft() {
    const menu = menuFor(state.date);
    if (!menu || !state.attendance) return;
    state.attendance = attendanceService.save(
      state.date,
      state.attendance.meals || {},
      menu.version || recipeService.MENU_VERSION,
      currentCanteen(),
      state.attendance.temporaryNonDining || {}
    );
  }

  function reloadMenus() {
    menus = recipeService.getAll().sort((a, b) => String(a.date).localeCompare(String(b.date)));
    firstDate = menus[0]?.date || '2026-09-07';
    if (!isSupportedMonth(monthKeyOf(state.date))) {
      state.date = firstDate;
      state.mealKey = '';
    }
    state.monthKey = monthKeyOf(state.date) || anchorMonthKey;
  }

  function attendanceFor(date) {
    if (date === state.date && state.attendance) return clone(state.attendance);
    return attendanceService.get(date, currentCanteen());
  }

  function setDate(date) {
    if (!date || !isSupportedMonth(monthKeyOf(date))) return;
    if (state.date !== date) state.mealKey = '';
    state.date = date;
    state.monthKey = monthKeyOf(date);
    loadAttendance();
    fillDefaultsIfEmpty();
  }

  function changeMonth(offset) {
    const currentMonth = isSupportedMonth(state.monthKey) ? state.monthKey : anchorMonthKey;
    const nextMonth = shiftMonthKey(currentMonth, Number(offset) || 0);
    if (!isSupportedMonth(nextMonth)) return;
    state.monthKey = nextMonth;
    const firstMenu = menus.find((menu) => monthKeyOf(menu.date) === nextMonth);
    state.date = firstMenu?.date || dateKeyFor(nextMonth, 1);
    state.mealKey = '';
    loadAttendance();
    fillDefaultsIfEmpty();
    render();
  }

  function productOrderCategory() {
    return productOrderCategories.find((category) => category.key === state.productCategory) || productOrderCategories[0];
  }

  function productOrderFindProduct(productId) {
    return productOrderCategories.flatMap((category) => category.products || []).find((product) => product.id === productId) || null;
  }

  function persistProductOrderCart() {
    window.AppStorage?.write?.(productOrderStorageKey, state.productCart);
  }

  function persistProductOrderOrders() {
    window.AppStorage?.write?.(productOrderOrdersStorageKey, state.productOrders);
  }

  function productOrderCartRows() {
    return Object.entries(state.productCart)
      .map(([id, entry]) => ({ product: productOrderFindProduct(id), entry }))
      .filter((row) => row.product && Number(row.entry?.qty) > 0);
  }

  function productOrderCartCount() {
    return productOrderCartRows().length;
  }

  function productOrderCartTotal() {
    return productOrderCartRows().reduce((total, row) => total + Number(row.product.price || 0) * Number(row.entry.qty || 0), 0);
  }

  function productOrderSetQuantity(productId, value) {
    const product = productOrderFindProduct(productId);
    if (!product) return;
    const parsed = Math.floor(Number(value) || 0);
    const next = Math.max(0, Math.min(product.stock, parsed));
    if (!next) {
      delete state.productCart[productId];
    } else {
      state.productCart[productId] = {
        qty: next,
        note: String(state.productCart[productId]?.note || '')
      };
    }
    if (!state.orderDetailProductAddMode) persistProductOrderCart();
  }

  function productOrderProducts() {
    const category = productOrderCategory();
    const rootKey = category.subcategories[0]?.[0];
    const subKey = state.productSubcategory || rootKey;
    const keyword = String(state.productKeyword || '').trim().toLocaleLowerCase();
    return (category.products || []).filter((product) => {
      const inSubcategory = subKey === rootKey || product.subKey === subKey;
      const searchable = [product.name, product.code, product.spec, product.unit].join(' ').toLocaleLowerCase();
      return inSubcategory && (!keyword || searchable.includes(keyword));
    });
  }

  function advanceProductSubcategory() {
    const category = productOrderCategory();
    const currentIndex = category.subcategories.findIndex(([key]) => key === state.productSubcategory);
    const next = category.subcategories[currentIndex + 1];
    if (!next) return;
    state.productSubcategory = next[0];
    state.productSearchValue = '';
    state.productKeyword = '';
    render();
  }

  function productOrderDateTimeParts(value) {
    const raw = String(value || '').trim().replace('T', ' ');
    const match = raw.match(/^(\d{4}-\d{2}-\d{2})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
    if (!match) return { date: '', time: '00:00:00' };
    const time = match[2]
      ? normalizeExpectedAtTime(`${match[2]}:${match[3] || '00'}:${match[4] || '00'}`)
      : '00:00:00';
    return { date: match[1], time };
  }

  function productOrderDateValue(value) {
    const parts = productOrderDateTimeParts(value);
    return parts.date ? `${parts.date}T${parts.time}` : '';
  }

  function productOrderDateTime(value) {
    const parts = productOrderDateTimeParts(value);
    return parts.date ? `${parts.date} ${parts.time}` : '--';
  }

  function productOrderIcon(kind) {
    const paths = {
      search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',
      order: '<path d="M4 5h2l1.4 9.2a2 2 0 0 0 2 1.7h6.7a2 2 0 0 0 1.9-1.4L20 8H7"/><path d="M10 20h.01M17 20h.01"/>',
      recipe: '<path d="M6 3h12v18H6z"/><path d="M9 7h6M9 11h6M9 15h3"/>',
      cart: '<path d="M3 4h2l1.4 10.1a2 2 0 0 0 2 1.7h7.5a2 2 0 0 0 1.9-1.4L20 8H7"/><path d="M10 20h.01M17 20h.01"/>',
      profile: '<circle cx="12" cy="8" r="3.2"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0"/>',
      delete: '<path d="M5 7h14M10 3h4l1 2H9l1-2ZM8 7v12h8V7M10.5 10.5v5M13.5 10.5v5"/>',
      'order-review': '<path d="M7 3.5h7l3 3V20H7z"/><path d="M14 3.5V7h3M9.5 11h5M9.5 14h3"/><path d="m15.5 15.5 1.5 1.5 3-3"/>',
      'order-shipping': '<path d="m4 7.5 8-3 8 3v9l-8 3-8-3z"/><path d="m4 7.5 8 4 8-4M12 11.5v8"/>',
      'order-receipt': '<path d="M3.5 6.5h10v9h-10zM13.5 9.5h3.2l3.3 3v3h-6.5z"/><circle cx="7" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/>',
      'order-return': '<path d="M8 7H4l4-4"/><path d="M4 7a8 8 0 1 1 0 10h3"/>',
      record: '<path d="M7 3.5h7l3 3V20H7z"/><path d="M14 3.5V7h3M9.5 11h5M9.5 14h5M9.5 17h3"/>',
      switch: '<path d="M4 7h12l-3-3M20 17H8l3 3"/><path d="M16 7a5 5 0 0 1 4 5M8 17a5 5 0 0 1-4-5"/>',
      chevron: '<path d="m9 5 7 7-7 7"/>'
    };
    return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (paths[kind] || paths.order) + '</svg>';
  }

  function showToast(message, isError = false) {
    clearTimeout(state.toastTimer);
    state.toast = message ? { message: String(message), isError: Boolean(isError) } : null;
    render();
    if (state.toast) {
      state.toastTimer = window.setTimeout(() => {
        state.toast = null;
        render();
      }, 2400);
    }
  }

  function renderProductHeader() {
    if (state.screen === 'product-orders') {
      return '<header class="school-mobile-product-topbar school-mobile-product-topbar-list">'
        + '<button type="button" class="school-mobile-product-back" data-action="back" aria-label="返回">‹</button>'
        + '<strong>订单列表</strong><span aria-hidden="true"></span></header>';
    }
    if (state.orderDetailProductAddMode) {
      return '<header class="school-mobile-product-topbar school-mobile-product-topbar-list">'
        + '<button type="button" class="school-mobile-product-back" data-action="back" aria-label="返回订单详情">‹</button>'
        + '<strong>添加商品</strong><span aria-hidden="true"></span></header>';
    }
    return '<header class="school-mobile-product-topbar">'
      + '<span class="school-mobile-product-topbar-label">供货企业</span>'
      + '<button type="button" class="school-mobile-product-supplier" data-action="open-product-supplier" aria-label="切换供货企业">'
      + '<span>' + escapeHtml(state.productSupplier) + '</span><i aria-hidden="true"></i></button>'
      + '</header>';
  }

  function renderProductSearch() {
    const hasValue = Boolean(String(state.productSearchValue || '').trim());
    return '<form class="school-mobile-product-search" data-product-search-form>'
      + '<span class="school-mobile-product-search-icon" aria-hidden="true">' + productOrderIcon('search') + '</span>'
      + '<input type="search" value="' + escapeHtml(state.productSearchValue) + '" placeholder="请输入" data-action="product-search-input" aria-label="请输入商品名称">'
      + (hasValue ? '<button type="button" class="school-mobile-product-search-clear" data-action="clear-product-search" aria-label="清除搜索">×</button>' : '')
      + '<button type="submit" class="school-mobile-product-search-submit" data-action="search-products">搜索</button>'
      + '</form>';
  }

  function renderProductCategoryBar() {
    const categories = productOrderCategories.map((category) => {
      const active = category.key === state.productCategory;
      const icon = category.image
        ? '<img src="' + escapeHtml(category.image) + '" alt="">'
        : '<span class="school-mobile-product-category-emoji" aria-hidden="true">' + escapeHtml(category.emoji || '•') + '</span>';
      return '<button type="button" class="school-mobile-product-category ' + (active ? 'is-active' : '') + '" data-action="select-product-category" data-category="' + escapeHtml(category.key) + '" aria-pressed="' + (active ? 'true' : 'false') + '">' + icon + '<span>' + escapeHtml(category.name) + '</span></button>';
    }).join('');
    return '<div class="school-mobile-product-category-wrap"><div class="school-mobile-product-category-strip">' + categories + '</div><button type="button" class="school-mobile-product-all-trigger" data-action="open-product-categories" aria-label="全部分类"><span>全部</span><i aria-hidden="true"></i></button></div>';
  }

  function renderProductSidebar() {
    const category = productOrderCategory();
    return '<aside class="school-mobile-product-sidebar" aria-label="商品子分类">'
      + category.subcategories.map(([key, name], index) => '<button type="button" class="school-mobile-product-sidebar-item ' + ((state.productSubcategory || category.subcategories[0][0]) === key ? 'is-active' : '') + '" data-action="select-product-subcategory" data-subcategory="' + escapeHtml(key) + '">' + escapeHtml(name) + '</button>').join('')
      + '</aside>';
  }

  function renderProductCard(product) {
    const entry = state.productCart[product.id] || {};
    const qty = Number(entry.qty || 0);
    return '<article class="school-mobile-product-row" data-product-id="' + escapeHtml(product.id) + '">'
      + '<img class="school-mobile-product-image" src="' + productOrderAssetRoot + 'product-placeholder.jpg" alt="' + escapeHtml(product.name) + '">'
      + '<div class="school-mobile-product-info">'
      + '<div class="school-mobile-product-title"><strong>' + escapeHtml(product.name) + '</strong><span class="school-mobile-product-unit"><input type="number" disabled value="' + escapeHtml(product.stock) + '" aria-label="' + escapeHtml(product.name + '库存') + '">' + escapeHtml(product.unit) + '</span></div>'
      + '<small class="school-mobile-product-spec">' + escapeHtml(product.spec || '') + '</small>'
      + '<div class="school-mobile-product-price">￥' + Number(product.price || 0).toFixed(2) + ' / ' + escapeHtml(product.unit) + '</div>'
      + '<div class="school-mobile-product-stepper" aria-label="' + escapeHtml(product.name + '采购数量') + '">'
      + '<button type="button" class="school-mobile-product-step school-mobile-product-minus" data-action="product-minus" data-product-id="' + escapeHtml(product.id) + '" aria-label="减少' + escapeHtml(product.name) + '">−</button>'
      + '<input type="number" min="0" max="' + escapeHtml(product.stock) + '" step="1" inputmode="numeric" placeholder="请输入" value="' + (qty ? escapeHtml(qty) : '') + '" data-action="product-quantity" data-product-id="' + escapeHtml(product.id) + '" aria-label="' + escapeHtml(product.name + '数量') + '">'
      + '<button type="button" class="school-mobile-product-step school-mobile-product-plus" data-action="product-plus" data-product-id="' + escapeHtml(product.id) + '" aria-label="增加' + escapeHtml(product.name) + '">+</button>'
      + '</div></div></article>';
  }

  function renderProductSelectionBar() {
    const count = productOrderCartCount();
    if (!count) return '';
    return '<div class="school-mobile-product-selection-bar"><div class="school-mobile-product-selection-cart">' + productOrderIcon('cart') + '<strong>' + number(count) + '种商品</strong></div><button type="button" class="school-mobile-product-next" data-action="product-next">下一步</button></div>';
  }

  function renderProductHome() {
    const products = productOrderProducts();
    return '<div class="school-mobile-product-page">'
      + '<div class="school-mobile-product-scroll">'
      + renderProductSearch()
      + renderProductCategoryBar()
      + '<div class="school-mobile-product-content">' + renderProductSidebar()
      + '<section class="school-mobile-product-list" aria-label="商品列表">'
      + (products.length ? products.map(renderProductCard).join('') : '<div class="school-mobile-product-empty"><img src="' + productOrderAssetRoot + 'product-placeholder.jpg" alt=""><strong>暂无数据</strong><span>换个分类或搜索词试试</span></div>')
      + '</section></div></div>'
      + renderProductSelectionBar()
      + '</div>';
  }

  function renderProductCartItem(row) {
    const { product, entry } = row;
    return '<article class="school-mobile-product-cart-item" data-cart-product-id="' + escapeHtml(product.id) + '">'
      + '<img src="' + productOrderAssetRoot + 'product-placeholder.jpg" alt="' + escapeHtml(product.name) + '">'
      + '<div class="school-mobile-product-cart-main"><div class="school-mobile-product-cart-title"><strong>' + escapeHtml(product.name) + '</strong><span>' + Number(product.price || 0).toFixed(2) + '元/' + escapeHtml(product.unit) + '</span></div>'
      + '<div class="school-mobile-product-cart-fields"><label><span>数量</span><input type="number" min="1" max="' + escapeHtml(product.stock) + '" step="1" value="' + escapeHtml(entry.qty) + '" data-action="product-cart-quantity" data-product-id="' + escapeHtml(product.id) + '" aria-label="' + escapeHtml(product.name + '数量') + '"></label><label><span>备注</span><input type="text" placeholder="请输入" value="' + escapeHtml(entry.note || '') + '" data-action="product-cart-note" data-product-id="' + escapeHtml(product.id) + '" aria-label="' + escapeHtml(product.name + '备注') + '"></label></div></div>'
      + '<button type="button" class="school-mobile-product-cart-delete" data-action="product-delete-cart" data-product-id="' + escapeHtml(product.id) + '" aria-label="删除' + escapeHtml(product.name) + '">' + productOrderIcon('delete') + '</button>'
      + '</article>';
  }

  function renderProductCart() {
    const rows = productOrderCartRows();
    const count = rows.length;
    const total = productOrderCartTotal();
    return '<div class="school-mobile-product-cart-page">'
      + '<div class="school-mobile-product-cart-scroll">'
      + '<div class="school-mobile-product-cart-summary"><span>' + number(count) + '种商品&nbsp;合计：￥' + total.toFixed(2) + '元</span><button type="button" data-action="product-clear-cart"' + (count ? '' : ' disabled') + '>清空购物车</button></div>'
      + '<div class="school-mobile-product-refresh">下拉刷新数据</div>'
      + '<div class="school-mobile-product-cart-list">' + (rows.length ? rows.map(renderProductCartItem).join('') : '<div class="school-mobile-product-cart-empty"><div class="school-mobile-product-cart-empty-icon">' + productOrderIcon('cart') + '</div><strong>购物车还是空的哦</strong><span>您的购物车还空着呢，快去逛逛吧</span><button type="button" data-action="product-continue-shopping">去下单</button></div>') + '</div>'
      + '</div>'
      + '<div class="school-mobile-product-cart-actions"><button type="button" data-action="product-continue-shopping">继续添加商品</button><button type="button" class="is-primary" data-action="open-product-checkout"' + (count ? '' : ' disabled') + '>下单</button></div>'
      + '</div>';
  }

  function productOrderStatusLabel(status) {
    return status === '待确认' ? '待确认' : status || '--';
  }

  function renderOrderFieldRow(label, value) {
    const displayValue = value == null || value === '' ? '--' : String(value);
    return '<div class="school-mobile-product-order-field-row"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(displayValue) + '</strong></div>';
  }

  function renderProductOrders() {
    const tabs = ['全部', '待审核', '待发货', '待收货', '退货'];
    const keyword = String(state.productOrderKeyword || '').trim().toLocaleLowerCase();
    const orders = state.productOrders.filter((order) => {
      const statusMatch = state.productOrderFilter === '全部'
        || (state.productOrderFilter === '待审核' && ['待审核', '待确认'].includes(order.status))
        || order.status === state.productOrderFilter;
      const searchable = [order.orderNo, order.supplierName, order.orderTag].join(' ').toLocaleLowerCase();
      return statusMatch && (!keyword || searchable.includes(keyword));
    });
    return '<div class="school-mobile-product-orders-page">'
      + '<div class="school-mobile-product-order-filters">' + tabs.map((tab) => '<button type="button" class="' + (state.productOrderFilter === tab ? 'is-active' : '') + '" data-action="product-order-filter" data-filter="' + escapeHtml(tab) + '">' + escapeHtml(tab) + '</button>').join('') + '<button type="button" class="school-mobile-product-order-filter-icon" aria-label="筛选">⌄<small>筛选</small></button></div>'
      + '<form class="school-mobile-product-order-search" data-product-order-search-form><span class="school-mobile-product-search-icon" aria-hidden="true">' + productOrderIcon('search') + '</span><input type="search" value="' + escapeHtml(state.productOrderSearchValue) + '" placeholder="请输入" data-action="product-order-search-input" aria-label="搜索订单"><button type="submit" data-action="search-product-orders">搜索</button></form>'
      + '<div class="school-mobile-product-order-list">'
      + (orders.length ? orders.map((order) => '<article class="school-mobile-product-order-card" data-action="open-product-order" data-order-id="' + escapeHtml(order.id) + '" role="button" tabindex="0" aria-label="查看订单 ' + escapeHtml(order.orderNo || order.id) + '"><header><strong>' + escapeHtml(order.supplierName || state.productSupplier || '--') + '</strong><span class="is-' + (order.status === '已关闭' ? 'closed' : 'pending') + '">' + escapeHtml(productOrderStatusLabel(order.status)) + '</span></header><div class="school-mobile-product-order-body">' + renderOrderFieldRow('订单号：', order.orderNo || '--') + renderOrderFieldRow('订单标签：', order.orderTag || '--') + renderOrderFieldRow('下单品种数：', number(order.productCount)) + renderOrderFieldRow('下单金额：', Number(order.orderAmount || 0).toFixed(2)) + renderOrderFieldRow('期望送达时间：', productOrderDateTime(order.expectedAt)) + '<footer><button type="button" data-action="product-order-reorder" data-order-id="' + escapeHtml(order.id) + '">再来一单</button>' + (order.status !== '已关闭' ? '<button type="button" data-action="product-order-edit" data-order-id="' + escapeHtml(order.id) + '">编辑</button><button type="button" class="is-outline" data-action="product-order-close" data-order-id="' + escapeHtml(order.id) + '">关闭</button>' : '') + '</footer></div></article>').join('') : '<div class="school-mobile-product-order-empty"><strong>暂无订单</strong><span>完成一次商品下单后，订单会显示在这里</span></div>')
      + '</div></div>';
  }

  function renderProductSupplierSheet() {
    return '<div class="school-mobile-sheet-backdrop" data-sheet-backdrop><section class="school-mobile-sheet school-mobile-product-supplier-sheet" role="dialog" aria-modal="true" aria-label="选择供货企业"><div class="school-mobile-sheet-handle"></div><header class="school-mobile-sheet-header"><button type="button" class="school-mobile-product-sheet-text" data-action="product-supplier-cancel">取消</button><h2>选择供货企业</h2><button type="button" class="school-mobile-product-sheet-text is-primary" data-action="product-supplier-confirm">确认</button></header><div class="school-mobile-product-picker-options">' + productOrderSupplierNames.map((name) => '<button type="button" class="' + (name === state.productSupplierDraft ? 'is-selected' : '') + '" data-action="select-product-supplier" data-supplier="' + escapeHtml(name) + '">' + escapeHtml(name) + (name === state.productSupplierDraft ? '<span>✓</span>' : '') + '</button>').join('') + '</div></section></div>';
  }

  function renderProductCategorySheet() {
    return '<div class="school-mobile-sheet-backdrop school-mobile-product-category-backdrop" data-sheet-backdrop><section class="school-mobile-sheet school-mobile-product-category-sheet" role="dialog" aria-modal="true" aria-label="全部分类"><div class="school-mobile-sheet-handle"></div><header class="school-mobile-sheet-header"><h2>全部分类</h2><button type="button" data-action="close-sheet" aria-label="关闭">×</button></header><div class="school-mobile-product-all-grid">' + productOrderCategories.map((category) => {
      const icon = category.image ? '<img src="' + escapeHtml(category.image) + '" alt="">' : '<span class="school-mobile-product-category-emoji" aria-hidden="true">' + escapeHtml(category.emoji || '•') + '</span>';
      return '<button type="button" class="' + (category.key === state.productCategory ? 'is-selected' : '') + '" data-action="select-product-category" data-category="' + escapeHtml(category.key) + '">' + icon + '<span>' + escapeHtml(category.name) + '</span></button>';
    }).join('') + '</div><button type="button" class="school-mobile-product-collapse" data-action="close-sheet">点击收起</button></section></div>';
  }

  function renderProductPickerSheet() {
    const field = state.productPickerField === 'tag' ? 'tag' : 'canteen';
    const options = field === 'tag' ? productOrderTags : productOrderCanteens;
    const title = field === 'tag' ? '请选择订单标签' : '请选择食堂';
    return '<div class="school-mobile-sheet-backdrop" data-sheet-backdrop><section class="school-mobile-sheet school-mobile-product-picker-sheet" role="dialog" aria-modal="true" aria-label="' + title + '"><div class="school-mobile-sheet-handle"></div><header class="school-mobile-sheet-header"><button type="button" class="school-mobile-product-sheet-text" data-action="product-picker-cancel">取消</button><h2>' + title + '</h2><button type="button" class="school-mobile-product-sheet-text is-primary" data-action="product-picker-confirm">确认</button></header><div class="school-mobile-product-picker-options">' + options.map((option) => '<button type="button" class="' + (option === state.productPickerDraft ? 'is-selected' : '') + '" data-action="product-picker-option" data-picker-value="' + escapeHtml(option) + '">' + escapeHtml(option) + (option === state.productPickerDraft ? '<span>✓</span>' : '') + '</button>').join('') + '</div></section></div>';
  }

  function renderOrderDetailPickerSheet() {
    const field = state.orderDetailPickerField === 'tag' ? 'tag' : 'canteen';
    const options = field === 'tag' ? productOrderTags : productOrderCanteens;
    const title = field === 'tag' ? '请选择订单标签' : '请选择食堂';
    return '<div class="school-mobile-sheet-backdrop" data-sheet-backdrop><section class="school-mobile-sheet school-mobile-product-picker-sheet" role="dialog" aria-modal="true" aria-label="' + title + '"><div class="school-mobile-sheet-handle"></div><header class="school-mobile-sheet-header"><button type="button" class="school-mobile-product-sheet-text" data-action="order-detail-picker-cancel">取消</button><h2>' + title + '</h2><button type="button" class="school-mobile-product-sheet-text is-primary" data-action="order-detail-picker-confirm">确认</button></header><div class="school-mobile-product-picker-options">' + options.map((option) => '<button type="button" class="' + (option === state.orderDetailPickerDraft ? 'is-selected' : '') + '" data-action="order-detail-picker-option" data-picker-value="' + escapeHtml(option) + '">' + escapeHtml(option) + (option === state.orderDetailPickerDraft ? '<span>✓</span>' : '') + '</button>').join('') + '</div></section></div>';
  }

  function renderProductCheckoutDateSheet() {
    const draftValue = state.productCheckoutDatePickerDraft
      || productOrderDateValue(state.productCheckout.expectedDate || nextProductOrderDate());
    const draftParts = productOrderDateTimeParts(draftValue);
    const selectedDate = draftParts.date || nextProductOrderDate();
    const selectedTime = draftParts.date ? draftParts.time : '00:00:00';
    const selectedValue = productOrderDateValue(`${selectedDate} ${selectedTime}`);
    const monthKey = state.productCheckoutDatePickerMonth || monthKeyOf(selectedDate) || monthKeyOf(nextProductOrderDate());
    const [year, month] = monthKey.split('-').map(Number);
    const firstDay = new Date(year || 2026, (month || 1) - 1, 1);
    const firstDayOffset = firstDay.getDay();
    const totalDays = daysInMonth(monthKey);
    const cellCount = Math.ceil((firstDayOffset + totalDays) / 7) * 7;
    const today = new Date().toISOString().slice(0, 10);
    const calendarCells = Array.from({ length: cellCount }, (_, index) => {
      const day = index - firstDayOffset + 1;
      if (day < 1 || day > totalDays) return '<span class="school-mobile-expected-at-day is-empty" aria-hidden="true"></span>';
      const date = dateKeyFor(monthKey, day);
      return '<button type="button" class="school-mobile-expected-at-day ' + (date === selectedDate ? 'is-selected ' : '') + (date === today ? 'is-today' : '') + '" data-action="product-checkout-date-option" data-date="' + escapeHtml(date) + '" aria-label="' + escapeHtml(dateText(date)) + '">' + day + '</button>';
    }).join('');
    const hours = Array.from({ length: 24 }, (_, value) => value);
    const minutes = Array.from({ length: 60 }, (_, value) => value);
    const seconds = Array.from({ length: 60 }, (_, value) => value);
    return '<div class="school-mobile-sheet-backdrop" data-sheet-backdrop><section class="school-mobile-sheet school-mobile-product-picker-sheet school-mobile-product-checkout-date-sheet" role="dialog" aria-modal="true" aria-label="选择期望送达时间">'
      + '<div class="school-mobile-sheet-handle"></div><header class="school-mobile-sheet-header"><button type="button" class="school-mobile-product-sheet-text" data-action="product-checkout-date-cancel">取消</button><h2>选择期望送达时间</h2><button type="button" class="school-mobile-product-sheet-text is-primary" data-action="product-checkout-date-confirm">确认</button></header>'
      + '<div class="school-mobile-expected-at-current"><span>当前选择</span><strong>' + escapeHtml(productOrderDateTime(selectedValue)) + '</strong></div>'
      + '<div class="school-mobile-expected-at-calendar"><div class="school-mobile-expected-at-calendar-header"><button type="button" data-action="product-checkout-date-month" data-month-delta="-1" aria-label="上个月">‹</button><strong>' + escapeHtml(expectedAtMonthText(monthKey)) + '</strong><button type="button" data-action="product-checkout-date-month" data-month-delta="1" aria-label="下个月">›</button></div><div class="school-mobile-expected-at-weekdays">' + weekdayNames.map((day) => '<span>' + escapeHtml(day) + '</span>').join('') + '</div><div class="school-mobile-expected-at-days">' + calendarCells + '</div></div>'
      + '<div class="school-mobile-expected-at-time"><div class="school-mobile-expected-at-time-heading"><strong>选择时间</strong><span>' + escapeHtml(selectedTime) + '</span></div><div class="school-mobile-expected-at-time-columns">'
      + renderExpectedAtTimeColumn('时', 'hour', hours, selectedTime.slice(0, 2), 'product-checkout-time-value')
      + renderExpectedAtTimeColumn('分', 'minute', minutes, selectedTime.slice(3, 5), 'product-checkout-time-value')
      + renderExpectedAtTimeColumn('秒', 'second', seconds, selectedTime.slice(6, 8), 'product-checkout-time-value')
      + '</div></div>'
      + '</section></div>';
  }

  function renderProductCheckoutSheet() {
    const checkout = state.productCheckout;
    const editing = Boolean(state.productEditingOrderId);
    return '<div class="school-mobile-sheet-backdrop" data-sheet-backdrop><section class="school-mobile-sheet school-mobile-product-checkout-sheet" role="dialog" aria-modal="true" aria-label="填写订单信息"><div class="school-mobile-sheet-handle"></div>'
      + '<div class="school-mobile-product-checkout-cell" data-action="open-product-picker" data-picker-field="canteen"><span>请选择食堂</span><strong>' + escapeHtml(checkout.canteen || '请选择') + '</strong><i aria-hidden="true"></i></div>'
      + '<button type="button" class="school-mobile-product-checkout-cell school-mobile-product-checkout-date-trigger" data-action="open-product-checkout-date" aria-label="选择期望送达时间"><span>期望送达时间</span><strong>' + escapeHtml(productOrderDateTime(checkout.expectedDate)) + '</strong><i aria-hidden="true"></i></button>'
      + '<div class="school-mobile-product-checkout-cell" data-action="open-product-picker" data-picker-field="tag"><span>请选择订单标签</span><strong>' + escapeHtml(checkout.tag || '请选择') + '</strong><i aria-hidden="true"></i></div>'
      + '<div class="school-mobile-product-checkout-actions"><button type="button" data-action="product-checkout-back">返回</button><button type="button" class="is-primary" data-action="save-product-order">' + (editing ? '保存订单' : '保存订单') + '</button></div>'
      + '</section></div>';
  }

  function productOrderNow() {
    const now = new Date();
    const pad = (value) => String(value).padStart(2, '0');
    return now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + ' '
      + pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
  }

  function productOrderNo() {
    const date = productOrderNow().slice(0, 10).replace(/-/g, '');
    const prefix = 'DD' + date + '0400';
    const max = state.productOrders.reduce((highest, order) => {
      const match = String(order.orderNo || '').match(new RegExp('^' + prefix + '(\\d{5})$'));
      return Math.max(highest, match ? Number(match[1]) : 0);
    }, 0);
    return prefix + String(max + 1).padStart(5, '0');
  }

  function openProductCheckout(order = null) {
    if (!order && !productOrderCartCount()) {
      showToast('购物车还是空的哦', true);
      return;
    }
    state.productEditingOrderId = order?.id || '';
    state.productCheckout = {
      canteen: order?.canteen || '',
      expectedDate: productOrderDateValue(order?.expectedAt || nextProductOrderDate()) || nextProductOrderDate(),
      tag: order?.orderTag || ''
    };
    state.productCheckoutDatePickerMonth = '';
    state.productCheckoutDatePickerDraft = '';
    state.productPickerField = '';
    state.productPickerDraft = '';
    state.sheet = { type: 'product-checkout' };
    render();
  }

  function saveProductOrder() {
    const checkout = state.productCheckout;
    if (!checkout.canteen) {
      showToast('请选择食堂', true);
      return;
    }
    if (!checkout.expectedDate) {
      showToast('请选择期望送达日期', true);
      return;
    }
    if (!checkout.tag) {
      showToast('请选择订单标签', true);
      return;
    }
    const rows = productOrderCartRows();
    const editing = state.productEditingOrderId
      ? state.productOrders.find((order) => order.id === state.productEditingOrderId)
      : null;
    if (!editing && !rows.length) {
      showToast('购物车还是空的哦', true);
      return;
    }
    const now = productOrderNow();
    const itemRows = rows.map(({ product, entry }) => ({
      productId: product.id,
      productCode: product.code,
      productName: product.name,
      unit: product.unit,
      orderPrice: Number(product.price || 0),
      orderQty: Number(entry.qty || 0),
      remark: entry.note || ''
    }));
    const saved = {
      ...(editing || {}),
      id: editing?.id || 'MOBILE-ORDER-' + Date.now(),
      orderNo: editing?.orderNo || productOrderNo(),
      supplierName: state.productSupplier,
      canteen: checkout.canteen,
      orderTag: checkout.tag,
      expectedAt: checkout.expectedDate,
      status: editing?.status || '待确认',
      source: '商品下单',
      createdAt: editing?.createdAt || now,
      updatedAt: now,
      productCount: editing ? editing.productCount : itemRows.length,
      orderAmount: editing ? editing.orderAmount : itemRows.reduce((total, item) => total + item.orderPrice * item.orderQty, 0),
      items: editing ? (editing.items || []) : itemRows
    };
    state.productOrders = editing
      ? state.productOrders.map((order) => order.id === editing.id ? saved : order)
      : [saved, ...state.productOrders];
    persistProductOrderOrders();
    if (!editing) {
      state.productCart = {};
      persistProductOrderCart();
    }
    state.productEditingOrderId = '';
    state.productCheckoutDatePickerMonth = '';
    state.productCheckoutDatePickerDraft = '';
    state.productPickerField = '';
    state.productPickerDraft = '';
    state.sheet = null;
    state.screen = 'product-orders';
    state.tab = 'home';
    render();
    showToast('下单成功');
  }

  function renderHeader() {
    if (state.screen === 'product-orders' || (state.screen === 'main' && ['home', 'cart'].includes(state.tab))) {
      return renderProductHeader();
    }
    const loginPage = state.screen === 'main' && state.tab === 'profile' && !currentMobileSession();
    const profileHome = state.screen === 'main'
      && state.tab === 'profile'
      && Boolean(currentMobileSession())
      && (state.profileView || 'home') === 'home';
    const profileSubpage = state.screen === 'main'
      && state.tab === 'profile'
      && Boolean(currentMobileSession())
      && (state.profileView || 'home') !== 'home';
    if (profileHome) return '';
    const attendanceBackToRecipe = state.screen === 'main' && state.tab === 'attendance';
    const title = loginPage
      ? '登录'
        : state.screen === 'confirm'
        ? '确认需求'
        : state.screen === 'order-detail'
          ? '订单详情'
        : state.screen === 'detail'
          ? '提交记录详情'
        : state.tab === 'attendance'
          ? '需求填报'
          : state.tab === 'profile'
              ? (profileSubpage && state.profileView === 'orders' ? '订单列表' : profileSubpage ? '提交记录' : '个人中心')
              : state.tab === 'home'
                ? '首页'
                : state.tab === 'recipe'
                  ? '食谱下单'
                  : '食谱中心';
    const shouldShowBack = state.screen === 'confirm'
      || state.screen === 'detail'
      || state.screen === 'order-detail'
      || attendanceBackToRecipe
      || profileSubpage;
    const back = shouldShowBack
      ? '<button type="button" class="school-mobile-back-button" data-action="back" aria-label="返回">←</button>'
      : '';
    const canteenDisplay = state.tab === 'attendance' || state.screen === 'detail' || state.screen === 'order-detail' || profileSubpage
      ? ''
      : '<button type="button" class="school-mobile-canteen-button" data-action="open-canteen" title="切换食堂"><span class="school-mobile-canteen-name">' + escapeHtml(state.canteen) + '</span><span class="school-mobile-canteen-arrow" aria-hidden="true"></span></button>';
    return '<header class="school-mobile-topbar">'
      + '<div class="school-mobile-topbar-main">'
      + '<div class="school-mobile-topbar-left">' + back
      + (state.screen === 'confirm' || loginPage ? '' : canteenDisplay)
      + '</div>'
      + '<strong class="school-mobile-topbar-title">' + title + '</strong>'
      + '</div>'
      + '</header>';
  }

  function renderDateStrip(mode) {
    const currentParticipants = participants();
    const isAttendanceLocked = mode === 'attendance' && state.attendanceInputMode === 'non-dining';
    const monthKey = isSupportedMonth(state.monthKey) ? state.monthKey : anchorMonthKey;
    const items = Array.from({ length: daysInMonth(monthKey) }, (_, index) => {
      const date = dateKeyFor(monthKey, index + 1);
      const menu = menuFor(date);
      const attendanceStatus = attendanceService.status(
        menu,
        attendanceFor(date),
        { canteen: currentCanteen(), participants: currentParticipants }
      );
      const statusKey = mode === 'attendance'
        ? menu ? attendanceStatus.key : 'no-menu'
        : menu ? 'published' : 'no-menu';
      const statusClass = 'is-' + statusKey;
      const statusLabel = mode === 'attendance'
        ? menu ? attendanceStatus.label || '未填写' : '无菜谱'
        : menu ? '已发布' : '暂无菜谱';
      return '<button type="button" class="school-mobile-date-item '
        + (date === state.date ? 'is-selected ' : '') + statusClass
        + '" data-action="select-date" data-date="' + escapeHtml(date) + '" aria-label="' + escapeHtml(dateText(date) + ' ' + statusLabel) + '" title="' + escapeHtml(statusLabel) + '"' + (isAttendanceLocked ? ' disabled aria-disabled="true"' : '') + '>'
        + '<strong>' + escapeHtml(date.slice(8, 10)) + '</strong>'
        + '<small class="school-mobile-date-weekday">' + escapeHtml(weekdayText(date)) + '</small>'
        + '</button>';
    }).join('');
    return '<div class="school-mobile-date-strip-shell school-mobile-date-strip-shell-' + escapeHtml(mode) + (isAttendanceLocked ? ' is-locked' : '') + '" data-date-strip-shell data-month-key="' + escapeHtml(monthKey) + '">'
      + '<button type="button" class="school-mobile-date-month-button school-mobile-date-month-button-prev" data-action="change-month" data-month-delta="-1" aria-label="上一月"' + (isAttendanceLocked ? ' disabled aria-disabled="true"' : '') + '>上一月</button>'
      + '<div class="school-mobile-date-strip school-mobile-date-strip-' + escapeHtml(mode) + (isAttendanceLocked ? ' is-locked' : '') + '" data-date-strip data-strip-mode="' + escapeHtml(mode) + '" data-month-key="' + escapeHtml(monthKey) + '" aria-label="用料日期列表' + (isAttendanceLocked ? '，当前日期不可切换' : '') + '"' + (isAttendanceLocked ? ' aria-disabled="true"' : '') + '>' + items + '</div>'
      + '<button type="button" class="school-mobile-date-month-button school-mobile-date-month-button-next" data-action="change-month" data-month-delta="1" aria-label="下一月"' + (isAttendanceLocked ? ' disabled aria-disabled="true"' : '') + '>下一月</button>'
      + '</div>';
  }

  function updateDateMonthControls(strip) {
    const shell = strip?.closest('[data-date-strip-shell]');
    if (!shell) return;
    const previous = shell.querySelector('.school-mobile-date-month-button-prev');
    const next = shell.querySelector('.school-mobile-date-month-button-next');
    if (strip.classList.contains('is-locked')) {
      shell.classList.remove('has-prev', 'has-next');
      if (previous) previous.disabled = true;
      if (next) next.disabled = true;
      return;
    }
    const monthKey = strip.dataset.monthKey || anchorMonthKey;
    const hadNext = shell.classList.contains('has-next');
    const atStart = strip.scrollLeft <= 2;
    const reservedNext = hadNext ? 58 : 0;
    const atEnd = strip.scrollLeft + strip.clientWidth >= strip.scrollWidth - 2 - reservedNext;
    const canGoPrevious = isSupportedMonth(shiftMonthKey(monthKey, -1));
    const canGoNext = isSupportedMonth(shiftMonthKey(monthKey, 1));
    const showPrevious = atStart && canGoPrevious;
    const showNext = atEnd && canGoNext;
    shell.classList.toggle('has-prev', showPrevious);
    shell.classList.toggle('has-next', showNext);
    if (previous) previous.disabled = !showPrevious;
    if (next) next.disabled = !showNext;
    if (showNext && !hadNext) {
      window.requestAnimationFrame(() => {
        strip.scrollLeft = strip.scrollWidth - strip.clientWidth;
      });
    }
  }

  function syncDateMonthControls() {
    app.querySelectorAll('[data-date-strip]').forEach((strip) => {
      const scrollKey = (strip.dataset.stripMode || '') + '|' + (strip.dataset.monthKey || '');
      const savedScrollLeft = state.dateStripScroll[scrollKey];
      const selected = strip.querySelector('.school-mobile-date-item.is-selected');
      if (!strip.classList.contains('is-locked') && Number.isFinite(savedScrollLeft)) {
        strip.scrollLeft = savedScrollLeft;
      } else if (selected) {
        const maxScrollLeft = Math.max(0, strip.scrollWidth - strip.clientWidth);
        const targetScrollLeft = selected.offsetLeft - Math.max(0, (strip.clientWidth - selected.offsetWidth) / 2);
        strip.scrollLeft = Math.max(0, Math.min(maxScrollLeft, targetScrollLeft));
      }
      updateDateMonthControls(strip);
    });
  }

  function renderHome() {
    return renderProductHome();
  }

  function renderRecipe() {
    const menu = menuFor(state.date);
    if (!menu) {
      return '<div class="school-mobile-scroll school-mobile-recipe-scroll">'
        + renderDateStrip('recipe')
        + '<section class="school-mobile-summary-card school-mobile-recipe-summary-card">'
        + '<div>' + recipeSummaryDateMarkup(state.date) + '</div>'
        + '<div class="is-primary"><span>菜品数</span><strong>0</strong></div>'
        + '<div><span>食材种数</span><strong>0</strong></div>'
        + '</section>'
        + '<div class="school-mobile-empty school-mobile-recipe-empty">当前日期暂无菜谱</div>'
        + '</div>';
    }
    const meals = menu.meals || [];
    const activeMeal = meals.find((meal) => meal.key === state.mealKey) || meals[0];
    state.mealKey = activeMeal?.key || '';
    const mealTabs = meals.map((meal) => '<button type="button" class="school-mobile-meal-tag ' + (meal.key === state.mealKey ? 'is-active' : '') + '" data-action="select-meal" data-meal-key="' + escapeHtml(meal.key) + '" role="tab" aria-selected="' + (meal.key === state.mealKey ? 'true' : 'false') + '">' + escapeHtml(meal.name) + '</button>').join('');
    const mealContent = meals.length
      ? '<div class="school-mobile-recipe-catalog"><div class="school-mobile-meal-tabs" role="tablist" aria-label="餐次切换">' + mealTabs + '</div><div class="school-mobile-meal-panel" data-meal-panel data-meal-key="' + escapeHtml(state.mealKey) + '" role="tabpanel">' + renderMeal(activeMeal) + '</div></div>'
      : '<div class="school-mobile-empty school-mobile-recipe-empty">当前日期暂无餐次菜谱</div>';
    return '<div class="school-mobile-scroll school-mobile-recipe-scroll">'
      + renderDateStrip('recipe')
      + '<section class="school-mobile-summary-card school-mobile-recipe-summary-card">'
      + '<div>' + recipeSummaryDateMarkup(menu.date) + '</div>'
      + '<div class="is-primary"><span>菜品数</span><strong>' + number(dishCount(menu)) + '</strong></div>'
      + '<div><span>食材种数</span><strong>' + number(ingredientCount(menu)) + '</strong></div>'
      + '</section>'
      + mealContent
      + '</div>';
  }

  function renderRecipeDemandButton() {
    const disabled = !menuFor(state.date);
    return '<button type="button" class="school-mobile-recipe-demand-float' + (disabled ? ' is-disabled' : '') + '" data-action="open-attendance"' + (disabled ? ' disabled aria-disabled="true"' : '') + '>需求填报<span aria-hidden="true">›</span></button>';
  }

  function renderRecipePage() {
    return '<div class="school-mobile-recipe-page">'
      + renderRecipe()
      + renderRecipeDemandButton()
      + '</div>';
  }

  function renderMeal(meal) {
    const dishes = meal.dishes || [];
    const rows = dishes.map((dish, index) => '<button type="button" class="school-mobile-dish-row" data-action="dish" data-menu-date="' + escapeHtml(state.date) + '" data-meal-key="' + escapeHtml(meal.key) + '" data-dish-index="' + index + '" data-dish-id="' + escapeHtml(dish.id || '') + '" aria-label="查看' + escapeHtml(dish.name) + '的食材含量和人均用量">'
      + '<span class="school-mobile-dish-index">' + String(index + 1).padStart(2, '0') + '</span>'
      + '<span><strong>' + escapeHtml(dish.name) + '</strong><small>' + number((dish.ingredients || []).length) + ' 种食材' + (dish.note ? ' · ' + escapeHtml(dish.note) : '') + '</small></span>'
      + '<span class="school-mobile-dish-arrow" aria-hidden="true">›</span>'
      + '</button>').join('');
    return '<section class="school-mobile-meal-card">'
      + '<header class="school-mobile-meal-header"><strong>' + escapeHtml(meal.name) + '</strong><span>' + number(dishes.length) + ' 道菜品</span></header>'
      + '<div class="school-mobile-dish-list">' + rows + '</div>'
      + '</section>';
  }

  function renderAttendance() {
    const menu = menuFor(state.date);
    const currentParticipants = participants();
    if (!menu) return '<div class="school-mobile-attendance-page"><div class="school-mobile-scroll school-mobile-attendance-scroll">' + renderDateStrip('attendance') + renderAttendanceSummary(state.date, 0) + '<div class="school-mobile-empty">请选择有菜谱的日期</div></div>' + renderAttendanceActions() + '</div>';
    const calculation = attendanceService.calculate(menu, state.attendance, serviceOptions());
    const validation = attendanceService.validate(menu, state.attendance, serviceOptions());
    const notice = !currentParticipants.length
      ? '<div class="school-mobile-notice"><i>!</i><span>当前食堂尚未启用人员类型，请先完成食堂运营设置。</span></div>'
      : validation.missingMappings.length
        ? '<div class="school-mobile-notice"><i>!</i><span>存在未关联采购商品：' + escapeHtml(validation.missingMappings.join('、')) + '</span></div>'
        : '';
    const meals = (menu.meals || []).map((meal) => renderAttendanceMeal(meal)).join('');
    const isNonDiningMode = state.attendanceInputMode === 'non-dining';
    const canSaveNonDining = isNonDiningMode
      && !validation.errors?.length
      && Number(calculation.totalDiningPeople || 0) > 0;
    const resetAction = isNonDiningMode ? '' : '<button type="button" class="school-mobile-summary-action school-mobile-summary-reset-action" data-action="reset-attendance">重置</button>';
    const modeAction = '<button type="button" class="school-mobile-section-heading-action school-mobile-attendance-mode-action' + (isNonDiningMode ? ' is-active' : '') + '" data-action="toggle-attendance-mode"' + (isNonDiningMode && !canSaveNonDining ? ' disabled' : '') + '>' + (isNonDiningMode ? '保存' : '填写不就餐人数') + '</button>';
    const summaryActions = isNonDiningMode
      ? ''
      : '<div class="school-mobile-attendance-summary-actions"><button type="button" class="school-mobile-summary-action" data-action="fill-defaults">默认人数</button>' + resetAction + '</div>';
    return '<div class="school-mobile-attendance-page">'
      + '<div class="school-mobile-scroll school-mobile-attendance-scroll">'
      + renderDateStrip('attendance')
      + renderAttendanceSummary(menu.date, calculation.totalPeople, summaryActions)
      + notice
      + '<div class="school-mobile-section-heading"><div class="school-mobile-section-heading-content"><strong>餐次就餐人数</strong></div><div class="school-mobile-attendance-heading-actions">' + modeAction + '</div></div>'
      + '<div class="school-mobile-attendance-meal-grid">' + (meals || '<div class="school-mobile-empty">当前食谱暂无餐次</div>') + '</div>'
      + '<div class="school-mobile-section-heading"><strong>商品需求测算</strong></div>'
      + '<div id="schoolMobileAttendanceDemand">' + renderDemandRows(menu, state.attendance) + '</div>'
      + '</div>'
      + renderAttendanceActions(validation)
      + '</div>';
  }

  function renderAttendanceSummary(date, totalPeople, actions = '') {
    return '<section class="school-mobile-summary-card school-mobile-attendance-summary-card">'
      + '<div><div class="school-mobile-attendance-date-line"><span class="school-mobile-attendance-date">' + compactDateValueMarkup(date) + '</span><span class="school-mobile-attendance-weekday">星期' + escapeHtml(weekdayText(date)) + '</span></div><small class="school-mobile-attendance-canteen">' + escapeHtml(state.canteen) + '</small></div>'
      + '<div class="is-primary"><span>总就餐人次</span><strong id="schoolMobileAttendanceTotal">' + number(totalPeople) + '</strong></div>'
      + (actions || '<div class="school-mobile-attendance-summary-placeholder" aria-hidden="true"></div>')
      + '</section>';
  }

  function renderAttendanceActions(validation = {}) {
    if (state.attendanceInputMode === 'non-dining') return '';
    const filledDays = currentFilledDateSummaries().length;
    return '<div class="school-mobile-attendance-actions" aria-label="需求填报操作">'
      + '<div class="school-mobile-filled-days"><span>已填写</span><strong id="schoolMobileFilledDays">' + number(filledDays) + ' 天</strong></div>'
      + '<button type="button" class="school-mobile-button is-primary" data-action="continue" ' + (validation.canContinue ? '' : 'disabled') + '>确认需求</button>'
      + '</div>';
  }

  function renderAttendanceMeal(meal) {
    const currentParticipants = participants();
    const isNonDiningMode = state.attendanceInputMode === 'non-dining';
    const values = currentParticipants.map((participant) => attendanceService.valueForParticipant(
      state.attendance?.meals?.[meal.key] || {},
      participant
    ));
    const total = currentParticipants.reduce((sum, participant) => sum + Number(attendanceService.effectivePeopleFor(state.attendance, meal.key, participant) || 0), 0);
    const fields = currentParticipants.length
      ? currentParticipants.map((participant, index) => {
        const participantName = attendanceService.participantDisplayName?.(participant, currentParticipants) || participant.label || participant.tagName || '人员';
        if (!isNonDiningMode) {
          const nonDiningValue = temporaryNonDiningFor(meal.key, participant);
          const nonDiningPeople = Number(nonDiningValue);
          const nonDiningSummary = Number.isInteger(nonDiningPeople) && nonDiningPeople > 0
            ? '<small class="school-mobile-person-non-dining-summary">含不就餐' + number(nonDiningPeople) + '人</small>'
            : '';
          const isEmptyHighlight = state.attendanceValidationHighlightDate === state.date
            && (values[index] === '' || values[index] == null);
          return '<label class="school-mobile-person-field">'
            + '<span>' + escapeHtml(participantName) + '</span>'
            + '<div class="school-mobile-number-input' + (isEmptyHighlight ? ' is-empty' : '') + (nonDiningSummary ? ' has-non-dining-summary' : '') + '"><input type="number" min="0" max="' + MAX_ATTENDANCE_PEOPLE + '" step="1" inputmode="numeric" placeholder="请输入" value="' + escapeHtml(values[index]) + '" data-action="attendance-input" data-meal="' + escapeHtml(meal.key) + '" data-participant="' + escapeHtml(participant.key) + '" aria-label="' + escapeHtml(meal.name + (participant.label || '人员') + '人数') + '"' + (isEmptyHighlight ? ' aria-invalid="true"' : '') + '><em>人</em>' + nonDiningSummary + '</div>'
            + '</label>';
        }
        const diningValue = values[index];
        const diningPeople = Number(diningValue);
        const hasDiningValue = diningValue !== '' && diningValue != null && Number.isInteger(diningPeople)
          && diningPeople >= 0 && diningPeople <= MAX_ATTENDANCE_PEOPLE;
        const nonDiningMax = hasDiningValue ? diningPeople : MAX_ATTENDANCE_PEOPLE;
        const nonDiningValue = temporaryNonDiningFor(meal.key, participant);
        const issue = nonDiningIssue(meal.key, participant);
        return '<div class="school-mobile-person-field school-mobile-person-field-non-dining">'
          + '<span>' + escapeHtml(participantName) + '</span>'
          + '<div class="school-mobile-non-dining-total"><span>总人数</span><strong>' + (hasDiningValue ? number(diningPeople) : '--') + ' 人</strong></div>'
          + '<div class="school-mobile-non-dining-input-row"><span>不就餐</span><div class="school-mobile-number-input"><input type="number" min="0" max="' + nonDiningMax + '" step="1" inputmode="numeric" placeholder="0" value="' + escapeHtml(nonDiningValue) + '" data-action="attendance-non-dining-input" data-meal="' + escapeHtml(meal.key) + '" data-participant="' + escapeHtml(participant.key) + '" aria-label="' + escapeHtml(meal.name + (participant.label || '人员') + '不就餐人数') + '"' + (issue ? ' aria-invalid="true"' : '') + '></div></div>'
          + '<small class="school-mobile-non-dining-error' + (issue ? ' is-visible' : '') + '" data-attendance-non-dining-error data-meal="' + escapeHtml(meal.key) + '" data-participant="' + escapeHtml(participant.key) + '">' + escapeHtml(issue) + '</small>'
          + '</div>';
      }).join('')
      : '<div class="school-mobile-empty">暂无启用人员类型</div>';
    return '<section class="school-mobile-attendance-card">'
      + '<header class="school-mobile-attendance-header"><strong>' + escapeHtml(meal.name) + '</strong><span><b class="school-mobile-attendance-total" data-meal-total="' + escapeHtml(meal.key) + '">' + number(total) + '</b> 人</span></header>'
      + '<div class="school-mobile-participant-grid">' + fields + '</div>'
      + '</section>';
  }

  function renderDemandRows(menu, record) {
    const calculation = attendanceService.calculate(menu, record, serviceOptions());
    const rows = calculation.rows.filter((row) => Number(row.totalQty || 0) > 0);
    if (!rows.length) return '<div class="school-mobile-demand-list"><div class="school-mobile-empty">填写人数后显示商品需求</div></div>';
    return '<div class="school-mobile-demand-list">' + rows.map((row) => {
      const unit = productUnit(row);
      const purchaseTotal = purchaseTotalQuantity(row);
      return '<button type="button" class="school-mobile-demand-row" data-action="open-demand-detail" data-menu-date="' + escapeHtml(menu.date) + '" data-demand-key="' + escapeHtml(purchaseRowKey(row)) + '" aria-label="查看' + escapeHtml(productName(row)) + '采购量明细">'
        + '<div class="school-mobile-demand-product"><strong>' + escapeHtml(productName(row)) + '</strong><small>' + escapeHtml(row.productCode || '--') + '</small></div>'
        + '<span class="school-mobile-demand-qty" aria-label="采购量：' + escapeHtml(quantity(purchaseTotal) + ' ' + unit) + '">' + quantity(purchaseTotal) + ' ' + escapeHtml(unit) + '</span>'
        + '<span class="school-mobile-demand-detail-arrow" aria-hidden="true">›</span>'
        + '</button>';
    }).join('') + '</div>';
  }

  function currentFilledDateSummaries() {
    return menus.map((menu) => {
      const record = attendanceFor(menu.date);
      const calculation = attendanceService.calculate(menu, record, serviceOptions());
      const validation = attendanceService.validate(menu, record, serviceOptions());
      const status = attendanceService.status(menu, record, serviceOptions());
      return { date: menu.date, menu, record, calculation, validation, status };
    }).filter((summary) => Number(summary.calculation.totalPeople || 0) > 0);
  }

  function mealAttendanceValue(record, mealKey, participant) {
    return attendanceService.valueForParticipant(record?.meals?.[mealKey] || {}, participant);
  }

  function findEmptyAttendanceField(menu, record) {
    const currentParticipants = participants();
    for (const meal of menu?.meals || []) {
      for (const participant of currentParticipants) {
        const value = mealAttendanceValue(record, meal.key, participant);
        if (value === '' || value == null) return { meal, participant };
      }
    }
    return null;
  }

  function recordHasAttendanceValues(record) {
    return [record?.meals, record?.temporaryNonDining].some((group) => Object.values(group || {}).some((values) => (
      Object.values(values || {}).some((value) => value !== '' && value != null)
    )));
  }

  function attendanceDatesForValidation() {
    const otherDates = menus
      .map((menu) => menu.date)
      .filter((date) => date !== state.date)
      .filter((date) => recordHasAttendanceValues(attendanceFor(date)));
    return [state.date, ...otherDates];
  }

  function findFirstEmptyAttendanceField() {
    for (const date of attendanceDatesForValidation()) {
      const menu = menuFor(date);
      const record = attendanceFor(date);
      const field = findEmptyAttendanceField(menu, record);
      if (field) return { date, record, ...field };
    }
    return null;
  }

  function focusEmptyAttendanceField(issue) {
    state.attendanceValidationHighlightDate = issue.date;
    state.date = issue.date;
    state.monthKey = monthKeyOf(issue.date);
    state.mealKey = '';
    state.attendance = clone(issue.record);
    state.screen = 'main';
    state.tab = 'attendance';
    state.attendanceInputMode = 'dining';
    state.sheet = null;
    showToast('人数不能为空', true);
    const input = [...app.querySelectorAll('[data-action="attendance-input"]')]
      .find((item) => item.dataset.meal === issue.meal.key && item.dataset.participant === issue.participant.key);
    input?.focus({ preventScroll: true });
    input?.scrollIntoView?.({ block: 'center', inline: 'nearest' });
  }

  function enterConfirm() {
    if (state.attendanceInputMode === 'non-dining') return;
    ensureDemoSession();
    saveAttendanceDraft();
    const emptyField = findFirstEmptyAttendanceField();
    if (emptyField) {
      focusEmptyAttendanceField(emptyField);
      return;
    }
    const menu = menuFor(state.date);
    const validation = attendanceService.validate(menu, state.attendance, serviceOptions());
    if (!validation.canContinue) {
      showToast(validation.message || '请先完成当前日期填报', true);
      return;
    }
    attendanceService.save(
      state.date,
      state.attendance.meals,
      menu.version || recipeService.MENU_VERSION,
      currentCanteen(),
      state.attendance.temporaryNonDining || {}
    );
    const savedRecord = attendanceService.get(state.date, currentCanteen());
    const savedCalculation = attendanceService.calculate(menu, savedRecord, serviceOptions());
    if (Number(savedCalculation.totalPeople || 0) <= 0) {
      state.screen = 'main';
      state.tab = 'attendance';
      loadAttendance();
      render();
      showToast('人数保存失败，请重新填写后再确认', true);
      return;
    }
    attendanceService.markResetOnReturn?.(currentCanteen());
    const summaries = currentFilledDateSummaries();
    const filledDates = summaries.map((summary) => summary.date);
    if (!filledDates.length) {
      state.screen = 'main';
      state.tab = 'attendance';
      loadAttendance();
      render();
      showToast('人数保存失败，请重新填写后再确认', true);
      return;
    }
    state.confirmDates = new Set(filledDates);
    state.confirmParticipantKey = '';
    state.purchaseQtyOverrides = {};
    state.purchaseQuantityEditingKey = '';
    state.expectedAt = (state.confirmDates.values().next().value || state.date) + 'T07:30:00';
    state.screen = 'confirm';
    state.toast = null;
    render();
  }

  function buildConfirmPreview() {
    return state.confirmDates.size
      ? demandService.buildPreview([...state.confirmDates], serviceOptions())
      : { rows: [], participants: [], totalPersonTimes: 0, productCount: 0, canSubmit: false, message: '请选择已填报日期' };
  }

  function firstConfirmDate() {
    return [...state.confirmDates].sort((a, b) => String(a).localeCompare(String(b)))[0] || '';
  }

  function expectedAtDateIsAllowed(date) {
    const firstDate = firstConfirmDate();
    return Boolean(date && (!firstDate || String(date) <= firstDate));
  }

  function expectedAtIsAllowed(value) {
    return expectedAtDateIsAllowed(parseExpectedAtValue(value).date);
  }

  function alignExpectedAtToFirstDate() {
    const firstDate = firstConfirmDate();
    const current = parseExpectedAtValue(state.expectedAt);
    if (firstDate && current.date && current.date > firstDate) {
      state.expectedAt = expectedAtInputValue(firstDate, current.time);
    }
  }

  function participantHasPurchaseDemand(preview, participant) {
    const participantKey = participant?.key;
    if (!participantKey) return false;
    return (preview.rows || []).some((row) => (
      row.mappingStatus === '已关联' && Number(row.participantQty?.[participantKey] || 0) > 0
    ));
  }

  function confirmParticipants(preview) {
    return (preview.participants || []).filter((participant) => participantHasPurchaseDemand(preview, participant));
  }

  function activeConfirmParticipant(preview) {
    const available = confirmParticipants(preview);
    const active = available.find((participant) => participant.key === state.confirmParticipantKey) || available[0] || null;
    state.confirmParticipantKey = active?.key || '';
    return active;
  }

  function purchaseQuantityValue(row, participant) {
    const key = purchaseQuantityKey(row, participant.key);
    return Object.prototype.hasOwnProperty.call(state.purchaseQtyOverrides, key)
      ? state.purchaseQtyOverrides[key]
      : purchaseQuantity(row.participantQty?.[participant.key], row);
  }

  function hasConfirmPurchaseQuantity(preview) {
    return (preview.rows || [])
      .filter((row) => row.mappingStatus === '已关联')
      .some((row) => (preview.participants || []).some((participant) => Number(purchaseQuantityValue(row, participant)) > 0));
  }

  function rememberConfirmPurchaseQuantity(input) {
    const key = input?.dataset?.purchaseKey;
    if (!key) return;
    input.dataset.purchaseOverridden = 'true';
    state.purchaseQtyOverrides[key] = input.value;
  }

  function normalizeConfirmPurchaseQuantityInput(input) {
    if (!input || input.value === '') return;
    const parsed = Number(input.value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      input.value = '0.00';
      return;
    }
    input.value = fixedQuantity(input.step === '1' ? Math.ceil(parsed) : parsed);
  }

  function syncConfirmPurchaseInputs() {
    app.querySelectorAll('[data-action="confirm-purchase-quantity"]').forEach((input) => {
      if (input.dataset.purchaseOverridden !== 'true') return;
      normalizeConfirmPurchaseQuantityInput(input);
      rememberConfirmPurchaseQuantity(input);
    });
  }

  function updateConfirmSubmitState() {
    const submitButton = app.querySelector('[data-action="submit-demand"]');
    if (!submitButton || state.submitting) return;
    const preview = buildConfirmPreview();
    submitButton.disabled = !(preview.canSubmit && hasConfirmPurchaseQuantity(preview) && expectedAtIsAllowed(state.expectedAt));
  }

  function renderConfirmOrderTags(preview, activeParticipant) {
    const available = confirmParticipants(preview);
    if (!available.length) return '<div class="school-mobile-empty">暂无可提交的订单标签</div>';
    return '<div class="school-mobile-order-tag-list" role="tablist" aria-label="提交需求包含的订单标签">'
      + available.map((participant) => '<button type="button" class="school-mobile-order-tag '
        + (participant.key === activeParticipant?.key ? 'is-active' : '')
        + '" data-action="confirm-order-tag" data-participant-key="' + escapeHtml(participant.key) + '" role="tab" aria-selected="' + (participant.key === activeParticipant?.key ? 'true' : 'false') + '">' + escapeHtml(orderTagName(participant)) + '</button>').join('')
      + '</div>';
  }

  function renderConfirm() {
    const summaries = currentFilledDateSummaries();
    const preview = buildConfirmPreview();
    const activeParticipant = activeConfirmParticipant(preview);
    const dateOptions = summaries.length
      ? summaries.map((summary) => '<button type="button" class="school-mobile-confirm-date '
        + (summary.status?.key === 'partial' ? 'is-partial ' : summary.status?.key === 'complete' ? 'is-complete ' : 'is-disabled ')
        + (state.confirmDates.has(summary.date) ? 'is-selected ' : '')
        + '" data-action="confirm-date" data-date="' + escapeHtml(summary.date) + '">'
        + '<strong>' + escapeHtml(shortDate(summary.date)) + '</strong><small class="school-mobile-confirm-date-weekday">星期' + escapeHtml(weekdayText(summary.date)) + '</small><small>' + number(summary.calculation.totalPeople) + ' 人次</small></button>').join('')
      : '<div class="school-mobile-empty">暂无可提交的填报日期</div>';
    const expectedAt = state.expectedAt || '';
    const canSubmit = Boolean(preview.canSubmit && hasConfirmPurchaseQuantity(preview) && expectedAtIsAllowed(expectedAt));
    const isPurchaseQuantityEditing = Boolean(activeParticipant && state.purchaseQuantityEditingKey === activeParticipant.key);
    const purchaseQuantityAction = isPurchaseQuantityEditing ? 'save-purchase-quantity' : 'edit-purchase-quantity';
    const purchaseQuantityActionLabel = isPurchaseQuantityEditing ? '保存' : '编辑';
    return '<div class="school-mobile-confirm-page"><div class="school-mobile-scroll">'
      + '<section class="school-mobile-confirm-card"><h2>用料日期</h2><div class="school-mobile-confirm-date-list">' + dateOptions + '</div></section>'
      + '<section class="school-mobile-confirm-card"><h2>订单信息</h2><div class="school-mobile-field"><span>食堂</span><strong>' + escapeHtml(state.canteen) + '</strong></div><div class="school-mobile-field"><span>期望送达时间</span><button type="button" class="school-mobile-date-picker-trigger" data-action="open-expected-at" aria-label="期望送达时间：' + escapeHtml(expectedAtDisplayValue(expectedAt)) + '"><span>' + escapeHtml(expectedAtDisplayValue(expectedAt)) + '</span><span aria-hidden="true">›</span></button></div></section>'
      + '<section class="school-mobile-confirm-card school-mobile-confirm-summary-card"><h2>需求汇总</h2><div class="school-mobile-confirm-summary"><div><span>总人次</span><strong>' + number(preview.totalPersonTimes) + '</strong></div><div><span>商品种数</span><strong>' + number(preview.productCount) + '</strong></div><div><span>提交日期</span><strong>' + number(state.confirmDates.size) + '</strong></div></div></section>'
      + '<div class="school-mobile-order-tags-inline">' + renderConfirmOrderTags(preview, activeParticipant) + '</div>'
      + '<section class="school-mobile-confirm-card school-mobile-purchase-card"><div class="school-mobile-section-heading" style="margin-top:0"><strong>采购商品</strong>' + (activeParticipant ? '<button type="button" class="school-mobile-order-tag-save" data-action="' + purchaseQuantityAction + '" data-purchase-participant-key="' + escapeHtml(activeParticipant.key) + '">' + purchaseQuantityActionLabel + '</button>' : '') + '</div>' + renderPreviewProductRows(preview, activeParticipant, isPurchaseQuantityEditing) + '</section>'
      + (preview.message && !preview.canSubmit ? '<div class="school-mobile-notice"><i>!</i><span>' + escapeHtml(preview.message) + '</span></div>' : '')
      + '</div><div class="school-mobile-sticky-actions"><button type="button" class="school-mobile-button" data-action="back">返回填报</button><button type="button" class="school-mobile-button is-primary" data-action="submit-demand" ' + (canSubmit && !state.submitting ? '' : 'disabled') + '>' + (state.submitting ? '提交中…' : '提交需求并下单') + '</button></div></div>';
  }

  function renderPreviewProductRows(preview, participant, isEditing = false) {
    const participantKey = participant?.key || '';
    const rows = participantKey
      ? (preview.rows || []).filter((row) => (
        row.mappingStatus === '已关联'
        && Number(row.participantQty?.[participantKey] || 0) > 0
      ))
      : [];
    if (!rows.length) return '<div class="school-mobile-empty">暂无可提交商品</div>';
    return '<div class="school-mobile-demand-list">' + rows.map((row, index) => {
      const unit = productUnit(row);
      const purchaseKey = purchaseQuantityKey(row, participantKey);
      const purchaseValue = purchaseQuantityValue(row, participant);
      const purchaseMarkup = isEditing
        ? '<div class="school-mobile-demand-purchase-control"><input class="school-mobile-demand-purchase-input" type="number" min="0" step="' + (isStandardProduct(row) ? '1' : 'any') + '" inputmode="' + (isStandardProduct(row) ? 'numeric' : 'decimal') + '" value="' + escapeHtml(fixedQuantity(purchaseValue)) + '" data-action="confirm-purchase-quantity" data-purchase-key="' + escapeHtml(purchaseKey) + '" data-purchase-participant-key="' + escapeHtml(participantKey) + '" data-purchase-overridden="' + (Object.prototype.hasOwnProperty.call(state.purchaseQtyOverrides, purchaseKey) ? 'true' : 'false') + '" aria-label="' + escapeHtml(orderTagName(participant) + productName(row) + '采购量') + '"><span class="school-mobile-demand-purchase-unit">' + escapeHtml(unit) + '</span></div>'
        : '<div class="school-mobile-demand-purchase-display"><strong>' + escapeHtml(fixedQuantity(purchaseValue)) + '</strong><span class="school-mobile-demand-purchase-unit">' + escapeHtml(unit) + '</span></div>';
      return [
        '<div class="school-mobile-demand-row">',
        '<span class="school-mobile-demand-index">', String(index + 1).padStart(2, '0'), '</span>',
        '<div class="school-mobile-demand-product"><strong>', escapeHtml(productName(row)), '</strong><small>', escapeHtml(row.productCode || '--'), '</small></div>',
        '<div class="school-mobile-demand-quantity">', purchaseMarkup, '</div>',
        '</div>'
      ].join('');
    }).join('') + '</div>';
  }

  function currentUserRecords() {
    const session = currentMobileSession();
    if (!session) return [];
    const userId = String(session.userId || session.id || '');
    const names = new Set([session.username, session.displayName].map((value) => String(value || '')).filter(Boolean));
    return demandService.getAll().filter((record) => (
      (userId && String(record.submittedById || '') === userId)
      || names.has(String(record.submittedBy || ''))
    ));
  }

  function currentUserOrders(records = currentUserRecords()) {
    const session = currentMobileSession();
    if (!session) return [];
    const recordIds = new Set(records.map((record) => String(record.id || '')).filter(Boolean));
    const recordNumbers = new Set(records.map((record) => String(record.recordNo || '')).filter(Boolean));
    const names = new Set([session.username, session.displayName].map((value) => String(value || '')).filter(Boolean));
    const linkedOrders = orderService.getAll().filter((order) => (
      recordIds.has(String(order.recipeDemandRecordId || ''))
      || recordNumbers.has(String(order.recipeDemandRecordNo || ''))
      || (order.source === '食谱下单' && names.has(String(order.creator || '')))
    ));
    const schoolName = String(orderService.SCHOOL_NAME || '');
    const schoolOrders = orderService.getAll().filter((order) => {
      const customerName = String(order.customerName || order.schoolName || '');
      const canteenName = String(order.canteen || '');
      return (schoolName && customerName === schoolName) || (schoolName && canteenName.includes(schoolName));
    });
    const productOrders = state.productOrders.map((order) => ({
      ...clone(order),
      expectedAt: order.expectedAt || order.expectedDate || '',
      receiptStatus: order.receiptStatus || '未收货',
      source: order.source || '商品下单'
    }));
    const uniqueOrders = new Map();
    [...schoolOrders, ...linkedOrders, ...productOrders].forEach((order) => {
      const key = String(order.id || order.orderNo || '');
      if (key) uniqueOrders.set(key, order);
    });
    return [...uniqueOrders.values()].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  }

  function renderLogin() {
    return '<div class="school-mobile-scroll school-mobile-profile-scroll">'
      + '<section class="school-mobile-login-card">'
      + '<form data-mobile-login-form>'
      + '<label><span>用户名</span><input type="text" autocomplete="username" placeholder="请输入用户名" value="' + escapeHtml(state.loginUsername) + '" data-action="login-username"></label>'
      + '<label><span>密码</span><input type="password" autocomplete="current-password" placeholder="请输入密码" value="' + escapeHtml(state.loginPassword) + '" data-action="login-password"></label>'
      + '<button type="submit" class="school-mobile-button is-primary">登录</button>'
      + '<label class="school-mobile-login-agreement"><input type="checkbox" data-action="login-agreement" ' + (state.loginAgreement ? 'checked' : '') + '><span>我已阅读并同意《用户协议》和《隐私政策》</span></label>'
      + '</form>'
      + '</section></div>';
  }

  function profileOrderHasReturn(order) {
    const status = String(order?.status || '');
    return ['退货', '退货中', '已退货'].includes(status)
      || Number(order?.returnAmount || 0) > 0
      || (order?.items || []).some((line) => Number(line?.returnQty || 0) > 0);
  }

  function profileOrderMatchesFilter(order, filter) {
    const status = String(order?.status || '');
    const receiptStatus = String(order?.receiptStatus || '');
    if (!filter || filter === '全部') return true;
    if (filter === '待审核') return ['待审核', '待确认'].includes(status);
    if (filter === '待发货') return ['待发货', '待出库'].includes(status);
    if (filter === '待收货') {
      return ['待收货', '已发货', '运输中'].includes(status)
        || (Boolean(order?.shippingAt)
          && !['已完成', '已关闭', '已驳回'].includes(status)
          && receiptStatus !== '已收货');
    }
    if (filter === '退货') return profileOrderHasReturn(order);
    return false;
  }

  function profileOrderStatusItems(orders) {
    return [
      { label: '待审核', filter: '待审核', icon: 'order-review' },
      { label: '待发货', filter: '待发货', icon: 'order-shipping' },
      { label: '待收货', filter: '待收货', icon: 'order-receipt' },
      { label: '退货', filter: '退货', icon: 'order-return' }
    ].map((item) => ({
      ...item,
      count: orders.filter((order) => profileOrderMatchesFilter(order, item.filter)).length
    }));
  }

  function renderProfileHome(session, records, orders) {
    const schoolName = session.schoolName || session.companyName || orderService.SCHOOL_NAME || '静安第一中学';
    const phone = session.phone || session.mobile || session.phoneNumber || '13523145672';
    const statusItems = profileOrderStatusItems(orders);
    const statusMarkup = statusItems.map((item) => '<button type="button" class="school-mobile-profile-order-status" data-action="open-profile-orders" data-order-filter="' + escapeHtml(item.filter) + '" aria-label="' + escapeHtml(item.label + ' ' + item.count + ' 笔') + '">'
      + '<span class="school-mobile-profile-order-status-icon">' + productOrderIcon(item.icon) + '</span>'
      + '<span class="school-mobile-profile-order-status-label">' + escapeHtml(item.label) + '</span>'
      + (item.count ? '<em>' + number(item.count) + '</em>' : '')
      + '</button>').join('');
    return '<div class="school-mobile-profile-page">'
      + '<div class="school-mobile-scroll school-mobile-profile-scroll school-mobile-profile-home-scroll">'
      + '<section class="school-mobile-profile-hero" aria-label="账户信息">'
      + '<div class="school-mobile-profile-hero-inner">'
      + '<div class="school-mobile-profile-hero-avatar">' + productOrderIcon('profile') + '</div>'
      + '<div class="school-mobile-profile-hero-identity"><strong>' + escapeHtml(schoolName) + '</strong><span>联系电话：' + escapeHtml(phone) + '</span></div>'
      + '</div>'
      + '</section>'
      + '<div class="school-mobile-profile-home-content">'
      + '<section class="school-mobile-profile-order-summary" aria-label="全部订单">'
      + '<header><strong>全部订单</strong><button type="button" data-action="open-profile-orders" data-order-filter="全部">查看全部订单<span aria-hidden="true">›</span></button></header>'
      + '<div class="school-mobile-profile-order-status-grid">' + statusMarkup + '</div>'
      + '</section>'
      + '<button type="button" class="school-mobile-profile-entry" data-action="open-profile-submissions">'
      + '<span class="school-mobile-profile-entry-icon">' + productOrderIcon('record') + '</span>'
      + '<span class="school-mobile-profile-entry-main"><strong>提交记录</strong><small>' + (records.length ? '共 ' + number(records.length) + ' 条记录' : '查看已提交的需求记录') + '</small></span>'
      + '<span class="school-mobile-profile-entry-arrow" aria-hidden="true">›</span>'
      + '</button>'
      + '<button type="button" class="school-mobile-profile-entry school-mobile-profile-logout-entry" data-action="logout">'
      + '<span class="school-mobile-profile-entry-icon">' + productOrderIcon('switch') + '</span>'
      + '<span class="school-mobile-profile-entry-main"><strong>退出登录</strong><small>退出当前账号</small></span>'
      + '<span class="school-mobile-profile-entry-arrow" aria-hidden="true">›</span>'
      + '</button>'
      + '</div>'
      + '</div>'
      + '</div>';
  }

  function renderProfileSubmissions(records) {
    return '<div class="school-mobile-scroll school-mobile-profile-scroll">'
      + '<div class="school-mobile-record-search"><input type="search" placeholder="搜索记录编号" value="' + escapeHtml(state.recordKeyword) + '" data-action="record-keyword" aria-label="搜索记录编号"></div>'
      + '<div id="schoolMobileRecordList">' + renderRecordList(records) + '</div>'
      + '</div>';
  }

  function renderProfileOrders(orders) {
    const filter = state.profileOrderFilter || '全部';
    const keyword = String(state.profileOrderKeyword || '').trim().toLocaleLowerCase();
    const filteredOrders = orders.filter((order) => {
      if (!profileOrderMatchesFilter(order, filter)) return false;
      const orderTag = order.orderTag || (order.orderTagName ? order.orderTagName + '-' + (order.nutritious || '不区分') : '');
      const searchable = [order.orderNo, order.id, order.supplierName, order.canteen, orderTag].join(' ').toLocaleLowerCase();
      return !keyword || searchable.includes(keyword);
    });
    const filters = ['全部', '待审核', '待发货', '待收货', '退货'];
    return '<div class="school-mobile-scroll school-mobile-profile-scroll">'
      + '<div class="school-mobile-profile-order-filter" role="tablist" aria-label="订单状态筛选">'
      + filters.map((item) => '<button type="button" class="' + (item === filter ? 'is-active' : '') + '" data-action="profile-order-filter" data-order-filter="' + escapeHtml(item) + '" role="tab" aria-selected="' + (item === filter ? 'true' : 'false') + '">' + escapeHtml(item) + '</button>').join('')
      + '</div>'
      + '<form class="school-mobile-product-order-search school-mobile-profile-order-search" data-profile-order-search-form><span class="school-mobile-product-search-icon" aria-hidden="true">' + productOrderIcon('search') + '</span><input type="search" value="' + escapeHtml(state.profileOrderSearchValue) + '" placeholder="请输入" data-action="profile-order-search-input" aria-label="搜索订单"><button type="submit" data-action="search-profile-orders">搜索</button></form>'
      + renderOrderList(filteredOrders)
      + '</div>';
  }

  function renderProfile() {
    const session = currentMobileSession();
    if (!session) return renderLogin();
    const records = currentUserRecords();
    const orders = currentUserOrders(records);
    const profileView = state.profileView || 'home';
    if (profileView === 'orders') return renderProfileOrders(orders);
    if (profileView === 'submissions') return renderProfileSubmissions(records);
    return renderProfileHome(session, records, orders);
  }

  function renderRecordList(sourceRecords = currentUserRecords()) {
    const keyword = String(state.recordKeyword || '').trim();
    const rows = sourceRecords.filter((record) => !keyword || String(record.recordNo || '').includes(keyword));
    if (!rows.length) return '<div class="school-mobile-empty">暂无匹配的提交记录</div>';
    return rows.map((record) => '<article class="school-mobile-record-card">'
      + '<header><strong>' + escapeHtml(record.recordNo || '--') + '</strong></header>'
      + '<div class="school-mobile-record-date">用料日期：' + escapeHtml((record.dates || []).join('、') || '--') + '</div>'
      + '<div class="school-mobile-record-metrics"><div><span>总人次</span><strong>' + number(record.totalPersonTimes) + '</strong></div><div><span>商品种数</span><strong>' + number(record.productCount) + '</strong></div><div><span>订单数</span><strong>' + number((record.orders || []).length) + '</strong></div></div>'
      + '<footer><small>' + escapeHtml(record.submittedAt || '--') + '</small><button type="button" class="school-mobile-button" data-action="record" data-record-id="' + escapeHtml(record.id) + '">查看详情</button></footer>'
      + '</article>').join('');
  }

  function recordMealName(value) {
    const fallbackNames = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack: '加餐' };
    const raw = String(value || '').trim();
    if (!raw) return '--';
    return raw.split(/[、,，/]/).map((part) => {
      const key = part.trim();
      return window.OrderMealNameByKey?.[key] || fallbackNames[key] || key;
    }).filter(Boolean).join('、');
  }

  function recordMealDefinitions(summary) {
    const fallbackMeals = attendanceService?.mealTypes || [
      { key: 'breakfast', name: '早餐' },
      { key: 'lunch', name: '午餐' },
      { key: 'dinner', name: '晚餐' },
      { key: 'snack', name: '加餐' }
    ];
    const menuMeals = menuFor(summary?.date)?.meals || [];
    const knownMeals = [...menuMeals, ...fallbackMeals];
    const attendanceMealKeys = Object.keys(summary?.attendance?.meals || {});
    const mealKeys = [...new Set([
      ...knownMeals.map((meal) => meal.key),
      ...attendanceMealKeys
    ])].filter(Boolean);
    return mealKeys.map((key) => knownMeals.find((meal) => meal.key === key) || { key, name: recordMealName(key) });
  }

  function recordFilledMealNames(summary) {
    const attendance = summary?.attendance?.meals || {};
    return recordMealDefinitions(summary)
      .filter((meal) => Object.values(attendance[meal.key] || {}).some((value) => value !== '' && value != null && String(value).trim() !== ''))
      .map((meal) => meal.name || recordMealName(meal.key));
  }

  function recordOrderMealName(order) {
    return recordMealName(order?.mealName || order?.mealKey);
  }

  function renderOrderList(orders = currentUserOrders()) {
    if (!orders.length) return '<div class="school-mobile-empty">暂无创建的订单记录</div>';
    return '<div class="school-mobile-profile-order-list">' + orders.map((order) => {
      const orderId = String(order.id || order.orderNo || '');
      const isProductOrder = order.source === '商品下单' || orderId.indexOf('MOBILE-ORDER-') === 0;
      const isClosed = String(order.status || '') === '已关闭';
      const orderTag = order.orderTag || (order.orderTagName ? order.orderTagName + '-' + (order.nutritious || '不区分') : '--');
      const actionButtons = (isProductOrder && !isClosed ? '<button type="button" data-action="profile-order-edit" data-order-id="' + escapeHtml(orderId) + '">编辑</button>' : '')
        + '<button type="button" data-action="profile-order-reorder" data-order-id="' + escapeHtml(orderId) + '">再来一单</button>'
        + (isProductOrder && !isClosed ? '<button type="button" class="is-outline" data-action="profile-order-close" data-order-id="' + escapeHtml(orderId) + '">关闭</button>' : '');
      return '<article class="school-mobile-profile-order-card school-mobile-product-order-card" data-action="open-profile-order" data-order-id="' + escapeHtml(orderId) + '" role="button" tabindex="0" aria-label="查看订单 ' + escapeHtml(order.orderNo || orderId) + '">'
        + '<header><strong>' + escapeHtml(order.supplierName || '--') + '</strong><span class="' + (isClosed ? 'is-closed' : '') + '">' + escapeHtml(order.status || '--') + '</span></header>'
        + '<div class="school-mobile-product-order-body">'
        + renderOrderFieldRow('订单号：', order.orderNo || orderId || '--')
        + renderOrderFieldRow('订单标签：', orderTag)
        + renderOrderFieldRow('下单品种数：', number(order.productCount || (order.items || []).length))
        + renderOrderFieldRow('下单金额：', formatProfileMoney(order.orderAmount))
        + renderOrderFieldRow('期望送达时间：', profileOrderExpectedAt(order))
        + '<footer>' + actionButtons + '</footer>'
        + '</div>'
        + '</article>';
    }).join('') + '</div>';
  }

  function formatProfileMoney(value) {
    return Number(value || 0).toLocaleString('zh-CN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
      useGrouping: false
    });
  }

  function profileOrderExpectedAt(order) {
    const value = String(order?.expectedAt || order?.expectedDate || '').trim();
    if (!value) return '--';
    return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value + ' 00:00:00' : value;
  }

  function profileOrderLine(item) {
    const productId = item?.productId || item?.productCode || item?.goodsCode || item?.goodsId || item?.id || '';
    return {
      ...item,
      productId,
      productName: item?.productName || item?.goodsName || item?.name || '--',
      unit: item?.unit || '--',
      orderPrice: Number(item?.orderPrice ?? item?.unitPrice ?? item?.price ?? 0),
      orderQty: Number(item?.orderQty ?? item?.quantity ?? item?.qty ?? 0),
      remark: item?.remark ?? ''
    };
  }

  function profileOrderProduct(item) {
    const line = profileOrderLine(item);
    return productOrderFindProduct(line.productId)
      || productOrderCategories.flatMap((category) => category.products || []).find((product) => String(product.code || '') === String(line.productId || ''))
      || null;
  }

  function addProfileOrderToCart(order) {
    const nextCart = {};
    (order?.items || []).forEach((item) => {
      const line = profileOrderLine(item);
      const product = profileOrderProduct(line);
      if (!product) return;
      nextCart[product.id] = {
        qty: Math.min(product.stock, Math.max(1, Number(line.orderQty) || 1)),
        note: String(line.remark || '')
      };
    });
    const count = Object.keys(nextCart).length;
    if (!count) return 0;
    state.productCart = nextCart;
    persistProductOrderCart();
    return count;
  }

  function restoreOrderDetailProductCart() {
    if (state.orderDetailProductCartBackup !== null) {
      state.productCart = clone(state.orderDetailProductCartBackup) || {};
      state.orderDetailProductCartBackup = null;
    }
    state.orderDetailProductAddMode = false;
  }

  function openOrderDetailProductAdd() {
    if (!state.orderDetailEditing || !state.orderDetailDraft) return;
    state.orderDetailProductCartBackup = clone(state.productCart) || {};
    state.productCart = {};
    state.productCategory = 'staple';
    state.productSubcategory = productOrderCategories[0]?.subcategories?.[0]?.[0] || '';
    state.productSearchValue = '';
    state.productKeyword = '';
    state.productEditingOrderId = '';
    state.productPickerField = '';
    state.productPickerDraft = '';
    state.orderDetailProductAddMode = true;
    state.screen = 'main';
    state.tab = 'home';
    state.sheet = null;
    render();
  }

  function closeOrderDetailProductAdd() {
    if (!state.orderDetailProductAddMode) return;
    restoreOrderDetailProductCart();
    state.screen = 'order-detail';
    state.tab = state.orderDetailReturn === 'product-orders' ? 'home' : 'profile';
    state.sheet = null;
    render();
  }

  function appendProductCartToOrderDetail() {
    const rows = productOrderCartRows();
    if (!rows.length || !state.orderDetailDraft) {
      showToast('请先选择商品', true);
      return;
    }
    const items = (state.orderDetailDraft.items || []).map(profileOrderLine);
    const itemIndexes = new Map();
    items.forEach((item, index) => {
      const productId = String(item.productId || '');
      if (productId) itemIndexes.set(productId, index);
    });
    for (const { product, entry } of rows) {
      const quantity = Math.max(1, Math.floor(Number(entry.qty) || 0));
      const existingIndex = itemIndexes.get(String(product.id));
      if (existingIndex != null) {
        const existing = items[existingIndex];
        const nextQuantity = Number(existing.orderQty || 0) + quantity;
        if (nextQuantity > Number(product.stock || 0)) {
          showToast(product.name + '库存不足', true);
          return;
        }
      }
    }
    rows.forEach(({ product, entry }) => {
      const quantity = Math.max(1, Math.floor(Number(entry.qty) || 0));
      const productId = String(product.id);
      const existingIndex = itemIndexes.get(productId);
      if (existingIndex != null) {
        items[existingIndex].orderQty = Number(items[existingIndex].orderQty || 0) + quantity;
        return;
      }
      itemIndexes.set(productId, items.length);
      items.push({
        productId: product.id,
        productCode: product.code,
        productName: product.name,
        unit: product.unit,
        orderPrice: Number(product.price || 0),
        orderQty: quantity,
        remark: String(entry.note || '')
      });
    });
    state.orderDetailDraft.items = items;
    const addedCount = rows.length;
    restoreOrderDetailProductCart();
    state.screen = 'order-detail';
    state.tab = state.orderDetailReturn === 'product-orders' ? 'home' : 'profile';
    state.sheet = null;
    render();
    showToast('已添加' + number(addedCount) + '种商品');
  }

  function openOrderDetailEdit(order, returnTo) {
    if (!order || String(order.status || '') !== '待确认') return;
    state.profileOrder = clone(order);
    state.orderDetailDraft = clone(order);
    state.orderDetailEditing = true;
    state.orderDetailPickerField = '';
    state.orderDetailPickerDraft = '';
    state.orderDetailReturn = returnTo || 'profile-orders';
    state.screen = 'order-detail';
    state.tab = state.orderDetailReturn === 'product-orders' ? 'home' : 'profile';
    state.sheet = null;
    render();
  }

  function clearOrderDetailEditState() {
    restoreOrderDetailProductCart();
    state.orderDetailEditing = false;
    state.orderDetailDraft = null;
    state.orderDetailPickerField = '';
    state.orderDetailPickerDraft = '';
  }

  function closeOrderDetail() {
    const returnToProductOrders = state.orderDetailReturn === 'product-orders';
    state.profileOrder = null;
    state.orderDetailReturn = '';
    clearOrderDetailEditState();
    state.sheet = null;
    if (returnToProductOrders) {
      state.screen = 'product-orders';
      state.tab = 'home';
    } else {
      state.screen = 'main';
      state.tab = 'profile';
      state.profileView = 'orders';
      state.profileSection = 'orders';
    }
    render();
  }

  function saveOrderDetailEdit() {
    const draft = state.orderDetailDraft;
    if (!draft) return;
    const canteen = String(draft.canteen || '').trim();
    const orderTag = String(draft.orderTag || '').trim();
    if (!canteen) {
      showToast('请选择食堂', true);
      return;
    }
    if (!orderTag) {
      showToast('请选择订单标签', true);
      return;
    }
    const rawItems = Array.isArray(draft.items) ? draft.items : [];
    const items = [];
    for (const rawItem of rawItems) {
      const line = profileOrderLine(rawItem);
      const orderQty = Number(line.orderQty);
      const product = profileOrderProduct(line);
      if (!Number.isInteger(orderQty) || orderQty < 1) {
        showToast('商品数量需大于0', true);
        return;
      }
      if (product && orderQty > Number(product.stock || 0)) {
        showToast(line.productName + '库存不足', true);
        return;
      }
      items.push({
        ...line,
        orderQty,
        remark: String(line.remark || '')
      });
    }
    if (!items.length) {
      showToast('请至少保留一个商品', true);
      return;
    }
    const saved = {
      ...clone(draft),
      canteen,
      orderTag,
      items,
      productCount: items.length,
      orderAmount: items.reduce((total, item) => total + Number(item.orderPrice || 0) * item.orderQty, 0),
      status: '待确认',
      source: draft.source || '商品下单',
      updatedAt: productOrderNow()
    };
    const orderId = String(saved.id || '');
    const exists = state.productOrders.some((order) => String(order.id || '') === orderId);
    state.productOrders = exists
      ? state.productOrders.map((order) => String(order.id || '') === orderId ? saved : order)
      : [saved, ...state.productOrders];
    persistProductOrderOrders();
    state.profileOrder = clone(saved);
    clearOrderDetailEditState();
    state.sheet = null;
    render();
    showToast('订单已保存');
  }

  function renderOrderDetailProduct(item, index, editing) {
    const product = profileOrderProduct(item);
    const image = product?.image || product?.img || productOrderAssetRoot + 'product-placeholder.jpg';
    if (editing) {
      return '<article class="school-mobile-order-detail-product is-editing">'
        + '<img src="' + escapeHtml(image) + '" alt="' + escapeHtml(item.productName) + '">'
        + '<div class="school-mobile-order-detail-product-main">'
        + '<header><strong>' + escapeHtml(item.productName) + '</strong><span>' + formatProfileMoney(item.orderPrice) + '元/' + escapeHtml(item.unit) + '</span></header>'
        + '<div class="school-mobile-order-detail-product-fields is-editing" role="group" aria-label="' + escapeHtml(item.productName + '数量和备注') + '">'
        + '<label><span>数量</span><div class="school-mobile-order-detail-quantity-stepper" role="group" aria-label="' + escapeHtml(item.productName + '数量调整') + '"><button type="button" class="school-mobile-order-detail-quantity-step is-minus" data-action="order-detail-quantity-step" data-step="-1" data-order-item-index="' + index + '" aria-label="减少' + escapeHtml(item.productName) + '数量">−</button><input type="number" min="1" max="' + escapeHtml(product?.stock || '') + '" step="1" inputmode="numeric" value="' + escapeHtml(item.orderQty) + '" data-action="order-detail-quantity" data-order-item-index="' + index + '" aria-label="' + escapeHtml(item.productName + '数量') + '"><button type="button" class="school-mobile-order-detail-quantity-step is-plus" data-action="order-detail-quantity-step" data-step="1" data-order-item-index="' + index + '" aria-label="增加' + escapeHtml(item.productName) + '数量">+</button></div></label>'
        + '<label><span>备注</span><textarea rows="2" placeholder="请输入" data-action="order-detail-remark" data-order-item-index="' + index + '" aria-label="' + escapeHtml(item.productName + '备注') + '">' + escapeHtml(item.remark || '') + '</textarea></label>'
        + '</div>'
        + '</div>'
        + '<button type="button" class="school-mobile-order-detail-product-delete" data-action="remove-order-detail-item" data-order-item-index="' + index + '" aria-label="删除' + escapeHtml(item.productName) + '">' + productOrderIcon('delete') + '</button>'
        + '</article>';
    }
    const remark = String(item.remark || '').trim() || '请输入';
    return '<article class="school-mobile-order-detail-product">'
      + '<img src="' + escapeHtml(image) + '" alt="' + escapeHtml(item.productName) + '">'
      + '<div class="school-mobile-order-detail-product-main">'
      + '<header><strong>' + escapeHtml(item.productName) + '</strong><span>' + formatProfileMoney(item.orderPrice) + '元/' + escapeHtml(item.unit) + '</span></header>'
      + '<div class="school-mobile-order-detail-product-fields" role="group" aria-label="' + escapeHtml(item.productName + '数量和备注') + '"><div><span>数量</span><strong aria-label="' + escapeHtml(item.productName + '数量') + '">' + escapeHtml(item.orderQty) + '</strong></div><div><span>备注</span><strong class="' + (remark === '请输入' ? 'is-placeholder' : '') + '" aria-label="' + escapeHtml(item.productName + '备注') + '">' + escapeHtml(remark) + '</strong></div></div>'
      + '</div>'
      + '</article>';
  }

  function renderOrderDetail() {
    const editing = Boolean(state.orderDetailEditing);
    const order = editing ? state.orderDetailDraft : state.profileOrder;
    if (!order) return '<div class="school-mobile-scroll"><div class="school-mobile-empty">未找到该订单</div></div>';
    const items = (order.items || []).map(profileOrderLine);
    const supplier = order.supplierName || '--';
    const status = order.status || '--';
    const orderTag = order.orderTag || (order.orderTagName ? order.orderTagName + '-' + (order.nutritious || '不区分') : '--');
    const selectedCount = editing ? items.length : Number(order.productCount || items.length);
    const orderAmount = editing
      ? items.reduce((total, item) => total + Number(item.orderPrice || 0) * Number(item.orderQty || 0), 0)
      : order.orderAmount;
    const canteenValue = order.canteen || '--';
    const canteenField = editing
      ? '<button type="button" class="school-mobile-order-detail-edit-trigger" data-action="open-order-detail-picker" data-picker-field="canteen" aria-label="编辑食堂：' + escapeHtml(canteenValue) + '"><strong>' + escapeHtml(canteenValue) + '</strong><span aria-hidden="true">›</span></button>'
      : '<strong>' + escapeHtml(canteenValue) + '</strong>';
    const tagField = editing
      ? '<button type="button" class="school-mobile-order-detail-edit-trigger" data-action="open-order-detail-picker" data-picker-field="tag" aria-label="编辑订单标签：' + escapeHtml(orderTag) + '"><strong>' + escapeHtml(orderTag) + '</strong><span aria-hidden="true">›</span></button>'
      : '<strong>' + escapeHtml(orderTag) + '</strong>';
    const productCards = items.length
      ? items.map((item, index) => renderOrderDetailProduct(item, index, editing)).join('')
      : '<div class="school-mobile-empty">' + (editing ? '请至少保留一个商品' : '暂无商品明细') + '</div>';
    const addProductAction = editing
      ? '<button type="button" class="school-mobile-order-detail-add-product" data-action="continue-order-detail-products">继续添加商品</button>'
      : '';
    const editActions = editing
      ? '<div class="school-mobile-order-detail-edit-actions"><button type="button" data-action="cancel-order-detail-edit">取消</button><button type="button" class="is-primary" data-action="save-order-detail-edit">保存订单</button></div>'
      : '';
    return '<div class="school-mobile-order-detail-page">'
      + '<div class="school-mobile-scroll school-mobile-order-detail-scroll">'
      + '<section class="school-mobile-order-detail-info" aria-label="订单信息">'
      + '<div class="school-mobile-order-detail-status-row"><span>订单状态：</span><em class="' + (status === '已关闭' ? 'is-closed' : '') + '">' + escapeHtml(status) + '</em></div>'
      + '<div class="school-mobile-order-detail-info-row"><span>供货企业：</span><strong>' + escapeHtml(supplier) + '</strong></div>'
      + '<div class="school-mobile-order-detail-info-row' + (editing ? ' is-editable' : '') + '"><span>食堂：</span>' + canteenField + '</div>'
      + '<div class="school-mobile-order-detail-info-row"><span>期望送达时间：</span><strong>' + escapeHtml(profileOrderExpectedAt(order)) + '</strong></div>'
      + '<div class="school-mobile-order-detail-info-row' + (editing ? ' is-editable' : '') + '"><span>订单标签：</span>' + tagField + '</div>'
      + '</section>'
      + '<div class="school-mobile-order-detail-summary"><span>' + number(selectedCount) + '种商品</span><strong>合计：¥' + formatProfileMoney(orderAmount) + '元</strong></div>'
      + '<div class="school-mobile-order-detail-products">' + productCards + '</div>'
      + addProductAction
      + '</div>'
      + editActions
      + '</div>';
  }

  function renderRecordDetail() {
    const record = state.record;
    if (!record) return '<div class="school-mobile-scroll"><div class="school-mobile-empty">未找到该提交记录</div></div>';
    const summaries = (record.dateSummaries || []).map((summary) => {
      const filledMeals = recordFilledMealNames(summary);
      const mealText = filledMeals.length ? filledMeals.join('、') : '未填写';
      return '<div class="school-mobile-detail-date"><div class="school-mobile-detail-date-main"><strong>' + escapeHtml(summary.date) + '</strong><span class="school-mobile-detail-date-meals">' + escapeHtml(mealText) + '</span></div><span>' + number(summary.totalPersonTimes) + ' 人次 · ' + number(summary.productCount) + ' 种商品</span></div>';
    }).join('');
    const orders = (record.orders || []).map((order) => '<div class="school-mobile-order-row"><strong>' + escapeHtml(order.orderNo || order.id || '--') + '</strong><span class="school-mobile-order-meal">' + escapeHtml(recordOrderMealName(order)) + '</span><span class="school-mobile-record-order-tag">' + escapeHtml(order.orderTag || order.orderTagName || order.recipeParticipantType || '食谱需求') + '</span></div>').join('');
    return '<div class="school-mobile-scroll">'
      + '<section class="school-mobile-info-card"><h2>基本信息</h2><div class="school-mobile-info-grid">'
      + '<div><span>记录编号</span><strong>' + escapeHtml(record.recordNo || '--') + '</strong></div>'
      + '<div><span>食堂</span><strong>' + escapeHtml(record.canteen || state.canteen) + '</strong></div>'
      + '<div><span>操作人</span><strong>' + escapeHtml(record.submittedBy || '--') + '</strong></div>'
      + '<div><span>期望送达时间</span><strong>' + escapeHtml(record.expectedAt || '--') + '</strong></div>'
      + '<div><span>提交时间</span><strong>' + escapeHtml(record.submittedAt || '--') + '</strong></div>'
      + '</div></section>'
      + '<section class="school-mobile-info-card"><h2>用料日期</h2>' + (summaries || '<div class="school-mobile-empty">暂无日期明细</div>') + '</section>'
      + '<section class="school-mobile-info-card"><h2>生成订单</h2>' + (orders || '<div class="school-mobile-empty">暂无关联订单</div>') + '</section>'
      + '</div>';
  }

  function renderBottomNav() {
    const tabs = [
      ['home', '商品下单', 'order'],
      ['recipe', '食谱下单', 'recipe'],
      ['cart', '购物车', 'cart'],
      ['profile', '我的', 'profile']
    ];
    return '<nav class="school-mobile-bottom-nav" aria-label="学校移动端导航">' + tabs.map((tab) => '<button type="button" class="school-mobile-tab ' + (state.tab === tab[0] ? 'is-active' : '') + '" data-action="tab" data-tab="' + tab[0] + '"><span class="school-mobile-tab-icon">' + productOrderIcon(tab[2]) + '</span><span>' + tab[1] + (tab[0] === 'cart' && productOrderCartCount() ? '<small class="school-mobile-tab-badge">' + number(productOrderCartCount()) + '</small>' : '') + '</span></button>').join('') + '</nav>';
  }

  function renderCanteenSheet() {
    return '<div class="school-mobile-sheet-backdrop" data-sheet-backdrop><section class="school-mobile-sheet" role="dialog" aria-modal="true" aria-label="切换食堂">'
      + '<div class="school-mobile-sheet-handle"></div><header class="school-mobile-sheet-header"><h2>选择食堂</h2><button type="button" data-action="close-sheet" aria-label="关闭">×</button></header>'
      + '<p class="school-mobile-sheet-subtitle">切换后将同步当前食谱和需求填报范围。</p>'
      + canteenNames.map((name) => '<button type="button" class="school-mobile-canteen-option ' + (name === state.canteen ? 'is-selected' : '') + '" data-action="select-canteen" data-canteen="' + escapeHtml(name) + '"><span>' + escapeHtml(name) + '</span>' + (name === state.canteen ? '<span>✓</span>' : '<span>›</span>') + '</button>').join('')
      + '</section></div>';
  }

  function renderAccountSwitchSheet() {
    const isLogout = state.sheet?.type === 'account-logout';
    const message = isLogout
      ? '确定要退出吗？退出后需重新登录<br>才可使用该软件'
      : '确定要切换账号吗？切换后需重新登录<br>才可使用该软件';
    return '<div class="school-mobile-account-confirm-backdrop" data-sheet-backdrop>'
      + '<section class="school-mobile-account-confirm" role="dialog" aria-modal="true" aria-labelledby="schoolMobileAccountConfirmTitle">'
      + '<button type="button" class="school-mobile-account-confirm-close" data-action="close-sheet" aria-label="关闭">×</button>'
      + '<p id="schoolMobileAccountConfirmTitle">' + message + '</p>'
      + '<button type="button" class="school-mobile-account-confirm-submit" data-action="confirm-switch-account">确定</button>'
      + '</section>'
      + '</div>';
  }

  function renderDishSheet() {
    const detail = state.sheet?.detail;
    if (!detail) return '';
    const ingredients = detail.dish.ingredients || [];
    const rows = ingredients.map((item) => '<div class="school-mobile-ingredient-row" role="row">'
      + '<span role="cell" title="' + escapeHtml(productName(item)) + '">' + escapeHtml(productName(item)) + '</span>'
      + '<span role="cell" title="' + escapeHtml(productCode(item)) + '">' + escapeHtml(productCode(item)) + '</span>'
      + '<em role="cell">' + quantity(ingredientQuantity(item)) + '</em>'
      + '<span role="cell">' + escapeHtml(productUnit(item)) + '</span>'
      + '</div>').join('');
    return '<div class="school-mobile-sheet-backdrop" data-sheet-backdrop><section class="school-mobile-sheet" role="dialog" aria-modal="true" aria-label="菜品食材详情">'
      + '<div class="school-mobile-sheet-handle"></div><header class="school-mobile-sheet-header"><h2>' + escapeHtml(detail.dish.name) + '</h2><button type="button" data-action="close-sheet" aria-label="关闭">×</button></header>'
      + '<p class="school-mobile-sheet-subtitle">' + escapeHtml(dateText(detail.menu.date)) + ' · ' + escapeHtml(detail.meal.name) + '</p>'
      + '<div class="school-mobile-dish-detail-heading"><strong>食材含量与人均用量</strong><span>共 ' + number(ingredients.length) + ' 项</span></div>'
      + '<div class="school-mobile-ingredient-list" role="table" aria-label="商品与人均用量明细">'
      + '<div class="school-mobile-ingredient-head" role="row"><span role="columnheader">商品名称</span><span role="columnheader">编号</span><span role="columnheader">人均用量</span><span role="columnheader">单位</span></div>'
      + (rows || '<div class="school-mobile-empty">暂无食材明细</div>')
      + '</div>'
      + '</section></div>';
  }

  function renderDemandDetailSheet() {
    const detail = state.sheet?.detail;
    if (!detail?.row) return '';
    const row = detail.row;
    const unit = productUnit(row);
    const currentParticipants = participants();
    const standard = isStandardProduct(row);
    const participantRows = currentParticipants.map((participant) => {
      const participantName = attendanceService.participantDisplayName?.(participant, currentParticipants)
        || participant.label || participant.tagName || '人员';
      const demand = Number(row.participantQty?.[participant.key] || 0);
      const purchase = purchaseQuantity(demand, row);
      return '<div class="school-mobile-demand-detail-row" role="row">'
        + '<strong role="cell">' + escapeHtml(participantName) + '</strong>'
        + '<span role="cell">' + quantity(demand) + ' ' + escapeHtml(unit) + '</span>'
        + '<span role="cell">' + quantity(purchase) + ' ' + escapeHtml(unit) + '</span>'
        + '</div>';
    }).join('');
    return '<div class="school-mobile-sheet-backdrop" data-sheet-backdrop><section class="school-mobile-sheet school-mobile-demand-detail-sheet" role="dialog" aria-modal="true" aria-label="商品需求明细">'
      + '<div class="school-mobile-sheet-handle"></div><header class="school-mobile-sheet-header"><h2>' + escapeHtml(productName(row)) + '</h2><button type="button" data-action="close-sheet" aria-label="关闭">×</button></header>'
      + '<p class="school-mobile-sheet-subtitle">' + escapeHtml(productCode(row)) + ' · ' + escapeHtml(unit) + ' · ' + (standard ? '标品，采购量向上取整' : '非标品，采购量等于需求量') + '</p>'
      + '<div class="school-mobile-demand-detail-total"><div><span>需求总量</span><strong>' + quantity(row.totalQty) + ' ' + escapeHtml(unit) + '</strong></div><div><span>采购总量</span><strong>' + quantity(purchaseTotalQuantity(row, currentParticipants)) + ' ' + escapeHtml(unit) + '</strong></div></div>'
      + '<div class="school-mobile-demand-detail-heading"><strong>人员类型明细</strong><span>需求量 / 采购量</span></div>'
      + '<div class="school-mobile-demand-detail-list" role="table" aria-label="不同人员类型需求量和采购量明细">'
      + '<div class="school-mobile-demand-detail-head" role="row"><span role="columnheader">人员类型</span><span role="columnheader">需求量</span><span role="columnheader">采购量</span></div>'
      + (participantRows || '<div class="school-mobile-empty">暂无人员类型明细</div>')
      + '</div>'
      + '</section></div>';
  }

  function renderExpectedAtTimeColumn(label, part, values, selectedValue, action = 'expected-at-time-value') {
    return '<div class="school-mobile-expected-at-time-column-wrap"><span class="school-mobile-expected-at-time-label">' + escapeHtml(label) + '</span><div class="school-mobile-expected-at-time-column" data-time-part="' + escapeHtml(part) + '">' + values.map((value) => {
      const text = String(value).padStart(2, '0');
      return '<button type="button" class="school-mobile-expected-at-time-option ' + (text === selectedValue ? 'is-selected' : '') + '" data-action="' + escapeHtml(action) + '" data-time-part="' + escapeHtml(part) + '" data-time-value="' + text + '">' + text + '</button>';
    }).join('') + '</div></div>';
  }

  function renderExpectedAtSheet() {
    const sheetValue = state.sheet?.draftValue || state.expectedAt;
    const parts = parseExpectedAtValue(sheetValue);
    const monthKey = state.sheet?.monthKey || monthKeyOf(parts.date) || monthKeyOf(state.date) || anchorMonthKey;
    const [year, month] = monthKey.split('-').map(Number);
    const firstDay = new Date(year || 2026, (month || 1) - 1, 1);
    const firstDayOffset = firstDay.getDay();
    const totalDays = daysInMonth(monthKey);
    const cellCount = Math.ceil((firstDayOffset + totalDays) / 7) * 7;
    const calendarCells = Array.from({ length: cellCount }, (_, index) => {
      const day = index - firstDayOffset + 1;
      if (day < 1 || day > totalDays) return '<span class="school-mobile-expected-at-day is-empty" aria-hidden="true"></span>';
      const date = dateKeyFor(monthKey, day);
      const dateObject = new Date(date + 'T00:00:00');
      const isToday = !Number.isNaN(dateObject.getTime()) && date === new Date().toISOString().slice(0, 10);
      const isDisabled = !expectedAtDateIsAllowed(date);
      return '<button type="button" class="school-mobile-expected-at-day ' + (date === parts.date ? 'is-selected ' : '') + (isToday ? 'is-today ' : '') + (isDisabled ? 'is-disabled' : '') + '" data-action="expected-at-date" data-date="' + escapeHtml(date) + '" aria-label="' + escapeHtml(date) + '"' + (isDisabled ? ' disabled aria-disabled="true"' : '') + '>' + day + '</button>';
    }).join('');
    const hours = Array.from({ length: 24 }, (_, value) => value);
    const minutes = Array.from({ length: 60 }, (_, value) => value);
    const seconds = Array.from({ length: 60 }, (_, value) => value);
    return '<div class="school-mobile-sheet-backdrop" data-sheet-backdrop><section class="school-mobile-sheet school-mobile-expected-at-sheet" role="dialog" aria-modal="true" aria-label="选择期望送达时间">'
      + '<div class="school-mobile-sheet-handle"></div><header class="school-mobile-sheet-header"><h2>选择期望送达时间</h2><button type="button" data-action="close-sheet" aria-label="关闭">×</button></header>'
      + '<p class="school-mobile-sheet-subtitle">请选择送达日期和时间。</p>'
      + '<div class="school-mobile-expected-at-current"><span>当前选择</span><strong>' + escapeHtml(expectedAtDisplayValue(expectedAtInputValue(parts.date, parts.time))) + '</strong></div>'
      + '<div class="school-mobile-expected-at-calendar"><div class="school-mobile-expected-at-calendar-header"><button type="button" data-action="expected-at-month" data-month-delta="-1" aria-label="上个月">‹</button><strong>' + escapeHtml(expectedAtMonthText(monthKey)) + '</strong><button type="button" data-action="expected-at-month" data-month-delta="1" aria-label="下个月">›</button></div><div class="school-mobile-expected-at-weekdays">' + weekdayNames.map((day) => '<span>' + escapeHtml(day) + '</span>').join('') + '</div><div class="school-mobile-expected-at-days">' + calendarCells + '</div></div>'
      + '<div class="school-mobile-expected-at-time"><div class="school-mobile-expected-at-time-heading"><strong>选择时间</strong><span>' + escapeHtml(parts.time) + '</span></div><div class="school-mobile-expected-at-time-columns">'
      + renderExpectedAtTimeColumn('时', 'hour', hours, parts.time.slice(0, 2))
      + renderExpectedAtTimeColumn('分', 'minute', minutes, parts.time.slice(3, 5))
      + renderExpectedAtTimeColumn('秒', 'second', seconds, parts.time.slice(6, 8))
      + '</div></div>'
      + '<div class="school-mobile-expected-at-actions"><button type="button" class="school-mobile-button" data-action="close-sheet">取消</button><button type="button" class="school-mobile-button is-primary" data-action="confirm-expected-at">确定</button></div>'
      + '</section></div>';
  }

  function openExpectedAtSheet() {
    const current = parseExpectedAtValue(state.expectedAt || expectedAtInputValue(state.date, '07:30:00'));
    const firstDate = firstConfirmDate();
    const date = expectedAtDateIsAllowed(current.date) ? current.date : firstDate || state.date;
    state.expectedAt = expectedAtInputValue(date, current.time);
    state.sheet = {
      type: 'expected-at',
      draftValue: expectedAtInputValue(date, current.time),
      monthKey: monthKeyOf(date) || monthKeyOf(state.date) || anchorMonthKey
    };
    render();
  }

  function openDishSheet(target) {
    const menu = menuFor(target.dataset.menuDate || state.date);
    const meal = (menu?.meals || []).find((item) => item.key === target.dataset.mealKey)
      || (menu?.meals || []).find((item) => item.key === state.mealKey);
    const dishIndex = Number(target.dataset.dishIndex);
    const dish = Number.isInteger(dishIndex) ? meal?.dishes?.[dishIndex] : null;
    const detail = menu && meal && dish
      ? { menu, meal, dish }
      : recipeService.getDish(target.dataset.menuDate || state.date, target.dataset.dishId);
    if (!detail) return;
    state.sheet = { type: 'dish', detail };
    render();
  }

  function openDemandDetailSheet(target) {
    const menu = menuFor(target.dataset.menuDate || state.date);
    if (!menu) return;
    const calculation = attendanceService.calculate(menu, state.attendance, serviceOptions());
    const row = calculation.rows.find((item) => purchaseRowKey(item) === target.dataset.demandKey);
    if (!row) return;
    state.sheet = { type: 'demand-detail', detail: { menu, row } };
    render();
  }

  function syncExpectedAtTimeColumns() {
    app.querySelectorAll('.school-mobile-expected-at-time-column').forEach((column) => {
      const options = [...column.querySelectorAll('.school-mobile-expected-at-time-option')];
      const selectedIndex = options.findIndex((option) => option.classList.contains('is-selected'));
      if (selectedIndex < 0) return;
      const itemHeight = options[0]?.offsetHeight || 34;
      column.scrollTop = selectedIndex * itemHeight;
    });
  }

  function updateExpectedAtTimeFromScroll(column) {
    if (state.sheet?.type !== 'expected-at') return;
    const options = [...column.querySelectorAll('.school-mobile-expected-at-time-option')];
    if (!options.length) return;
    const itemHeight = options[0].offsetHeight || 34;
    const index = Math.max(0, Math.min(options.length - 1, Math.round(column.scrollTop / itemHeight)));
    const selected = options[index];
    const parts = parseExpectedAtValue(state.sheet.draftValue || state.expectedAt);
    const timePart = column.dataset.timePart;
    const timeValue = selected.dataset.timeValue || '00';
    const nextTime = expectedAtTimePart(parts.time, timePart, timeValue);
    state.sheet.draftValue = expectedAtInputValue(parts.date || state.date, nextTime);
    options.forEach((option) => option.classList.toggle('is-selected', option === selected));
    const currentTime = app.querySelector('.school-mobile-expected-at-time-heading span');
    if (currentTime) currentTime.textContent = nextTime;
  }

  function render() {
    const content = state.screen === 'confirm'
      ? renderConfirm()
      : state.screen === 'product-orders'
      ? renderProductOrders()
      : state.screen === 'order-detail'
        ? renderOrderDetail()
      : state.screen === 'detail'
        ? renderRecordDetail()
        : state.tab === 'home'
          ? renderHome()
          : state.tab === 'attendance'
            ? renderAttendance()
          : state.tab === 'cart'
            ? renderProductCart()
          : state.tab === 'profile'
            ? renderProfile()
            : renderRecipePage();
    const sheet = state.sheet?.type === 'canteen'
      ? renderCanteenSheet()
      : ['account-switch', 'account-logout'].includes(state.sheet?.type)
        ? renderAccountSwitchSheet()
      : state.sheet?.type === 'product-supplier'
        ? renderProductSupplierSheet()
      : state.sheet?.type === 'product-categories'
        ? renderProductCategorySheet()
      : state.sheet?.type === 'product-picker'
        ? renderProductPickerSheet()
      : state.sheet?.type === 'order-detail-picker'
        ? renderOrderDetailPickerSheet()
      : state.sheet?.type === 'product-checkout-date'
        ? renderProductCheckoutDateSheet()
      : state.sheet?.type === 'product-checkout'
        ? renderProductCheckoutSheet()
      : state.sheet?.type === 'dish'
        ? renderDishSheet()
        : state.sheet?.type === 'demand-detail'
          ? renderDemandDetailSheet()
        : state.sheet?.type === 'expected-at'
          ? renderExpectedAtSheet()
        : '';
    app.innerHTML = '<div class="school-mobile-app">'
      + renderHeader()
      + '<main class="school-mobile-main">' + content + '</main>'
      + (state.screen === 'main' && !state.orderDetailProductAddMode && state.tab !== 'attendance' && !(state.tab === 'profile' && !currentMobileSession()) ? renderBottomNav() : '')
      + sheet
      + (state.toast ? '<div class="school-mobile-toast ' + (state.toast.isError ? 'is-error' : '') + '" role="status">' + escapeHtml(state.toast.message) + '</div>' : '')
      + '</div>';
    syncDateMonthControls();
    syncExpectedAtTimeColumns();
  }

  function updateAttendanceLive() {
    const menu = menuFor(state.date);
    if (!menu) return;
    const calculation = attendanceService.calculate(menu, state.attendance, serviceOptions());
    const validation = attendanceService.validate(menu, state.attendance, serviceOptions());
    const status = attendanceService.status(menu, state.attendance, serviceOptions());
    const dateItem = app.querySelector('.school-mobile-date-strip-attendance .school-mobile-date-item[data-date="' + state.date + '"]');
    if (dateItem) {
      ['empty', 'partial', 'complete'].forEach((key) => dateItem.classList.toggle('is-' + key, status.key === key));
      dateItem.setAttribute('aria-label', dateText(state.date) + ' ' + (status.label || '未填写'));
      dateItem.title = status.label || '未填写';
    }
    app.querySelectorAll('[data-action="attendance-input"]').forEach((input) => {
      const isEmptyHighlight = state.attendanceValidationHighlightDate === state.date
        && (input.value === '' || input.value == null);
      input.closest('.school-mobile-number-input')?.classList.toggle('is-empty', isEmptyHighlight);
      input.toggleAttribute('aria-invalid', isEmptyHighlight);
    });
    const total = app.querySelector('#schoolMobileAttendanceTotal');
    if (total) total.textContent = number(calculation.totalPeople);
    app.querySelectorAll('[data-meal-total]').forEach((element) => {
      const mealTotal = participants().reduce((sum, participant) => sum + Number(attendanceService.effectivePeopleFor(state.attendance, element.dataset.mealTotal, participant) || 0), 0);
      element.textContent = number(mealTotal);
    });
    const demand = app.querySelector('#schoolMobileAttendanceDemand');
    if (demand) demand.innerHTML = renderDemandRows(menu, state.attendance);
    const continueButton = app.querySelector('[data-action="continue"]');
    if (continueButton) continueButton.disabled = !validation.canContinue;
    const filledDays = app.querySelector('#schoolMobileFilledDays');
    if (filledDays) filledDays.textContent = number(currentFilledDateSummaries().length) + ' 天';
  }

  function updateAttendanceNonDiningLive() {
    const menu = menuFor(state.date);
    if (!menu || state.attendanceInputMode !== 'non-dining') return;
    const validation = attendanceService.validate(menu, state.attendance, serviceOptions());
    const calculation = attendanceService.calculate(menu, state.attendance, serviceOptions());
    app.querySelectorAll('[data-attendance-non-dining-error]').forEach((element) => {
      const participant = participants().find((item) => item.key === element.dataset.participant);
      const issue = participant ? nonDiningIssue(element.dataset.meal, participant) : '';
      element.textContent = issue;
      element.classList.toggle('is-visible', Boolean(issue));
      const input = element.closest('.school-mobile-person-field')?.querySelector('[data-action="attendance-non-dining-input"]');
      if (input) input.toggleAttribute('aria-invalid', Boolean(issue));
    });
    const saveButton = app.querySelector('[data-action="toggle-attendance-mode"]');
    if (saveButton) saveButton.disabled = Boolean(validation.errors?.length) || Number(calculation.totalDiningPeople || 0) <= 0;
  }

  function fillDefaultAttendance() {
    const menu = menuFor(state.date);
    const currentParticipants = participants();
    const next = attendanceService.emptyRecord(state.date, currentCanteen());
    next.meals = {};
    next.temporaryNonDining = clone(state.attendance?.temporaryNonDining || {});
    (menu?.meals || []).forEach((meal) => {
      next.meals[meal.key] = {};
      currentParticipants.forEach((participant) => {
        const value = participant.defaultPeople?.[meal.key];
        if (value !== '' && value != null) next.meals[meal.key][participant.key] = value;
      });
    });
    state.attendance = next;
    saveAttendanceDraft();
  }

  function fillDefaultsIfEmpty() {
    const menu = menuFor(state.date);
    if (!menu || !state.attendance) return;
    const calculation = attendanceService.calculate(menu, state.attendance, serviceOptions());
    if (Number(calculation.totalPeople || 0) <= 0) fillDefaultAttendance();
  }

  function resetAttendance() {
    attendanceService.remove(state.date, currentCanteen());
    state.attendance = attendanceService.emptyRecord(state.date, currentCanteen());
    state.attendance.meals = {};
    state.attendance.temporaryNonDining = {};
  }

  function saveNonDiningMode() {
    const menu = menuFor(state.date);
    if (!menu || state.attendanceInputMode !== 'non-dining') return;
    const validation = attendanceService.validate(menu, state.attendance, serviceOptions());
    const calculation = attendanceService.calculate(menu, state.attendance, serviceOptions());
    if (validation.errors?.length || Number(calculation.totalDiningPeople || 0) <= 0) {
      updateAttendanceNonDiningLive();
      return;
    }
    try {
      state.attendance = attendanceService.save(
        state.date,
        state.attendance.meals,
        menu.version || recipeService.MENU_VERSION,
        currentCanteen(),
        state.attendance.temporaryNonDining || {}
      );
      state.attendanceInputMode = 'dining';
      render();
    } catch (error) {
      showToast(error?.message || '保存失败', true);
      updateAttendanceNonDiningLive();
    }
  }

  function clearAttendanceAfterFlow() {
    attendanceService.clearForCanteen?.(currentCanteen());
    state.attendance = attendanceService.emptyRecord(state.date, currentCanteen());
    state.attendance.meals = {};
    state.confirmDates.clear();
    state.confirmParticipantKey = '';
    state.purchaseQtyOverrides = {};
    state.purchaseQuantityEditingKey = '';
    state.expectedAt = '';
  }

  function preserveAttendanceOnReturn() {
    attendanceService.cancelResetOnReturn?.(currentCanteen());
  }

  function normalizeExpectedAt(value) {
    const text = String(value || '').trim();
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(text)) return text.replace('T', ' ') + ':00';
    return text.replace('T', ' ');
  }

  function demoUserSession() {
    const users = window.DemoStore?.get?.('users') || [];
    const user = users.find((item) => String(item.username || '').toLocaleLowerCase() === 'admin' && item.status !== 'DISABLE')
      || users.find((item) => item.status !== 'DISABLE')
      || { id: 'demo-admin', username: 'admin', displayName: '管理员', role: '管理员' };
    return {
      userId: user.id || '',
      id: user.id || '',
      companyId: user.companyId || '',
      username: user.username || 'admin',
      displayName: user.displayName || user.username || '管理员',
      role: user.role || ''
    };
  }

  function ensureDemoSession() {
    if (!mobileSession) persistMobileSession(demoUserSession());
    return currentMobileSession();
  }

  function loginMobile() {
    ensureDemoSession();
    state.loginPassword = '';
    state.screen = 'main';
    state.tab = 'home';
    state.profileOrder = null;
    state.orderDetailReturn = '';
    state.profileView = 'home';
    state.profileOrderFilter = '全部';
    state.profileOrderSearchValue = '';
    state.profileOrderKeyword = '';
    state.profileSection = 'submissions';
    render();
  }

  function logoutMobile() {
    persistMobileSession(null);
    state.loginUsername = '';
    state.loginPassword = '';
    state.loginAgreement = false;
    state.recordKeyword = '';
    state.record = null;
    state.profileOrder = null;
    state.orderDetailReturn = '';
    state.profileView = 'home';
    state.profileOrderFilter = '全部';
    state.profileOrderSearchValue = '';
    state.profileOrderKeyword = '';
    state.screen = 'main';
    state.tab = 'profile';
    render();
    showToast('已退出登录');
  }

  async function submitDemand() {
    if (state.submitting) return;
    ensureDemoSession();
    syncConfirmPurchaseInputs();
    const dates = [...state.confirmDates];
    if (!dates.length) {
      showToast('请至少选择一个用料日期', true);
      return;
    }
    const preview = buildConfirmPreview();
    if (!preview.canSubmit) {
      showToast(preview.message || '当前需求不能提交', true);
      return;
    }
    if (!hasConfirmPurchaseQuantity(preview)) {
      showToast('当前没有采购量，无法提交', true);
      return;
    }
    const expectedAt = normalizeExpectedAt(state.expectedAt);
    if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(expectedAt)) {
      showToast('请选择期望送达时间', true);
      return;
    }
    if (!expectedAtIsAllowed(expectedAt)) {
      showToast('期望送达时间不得晚于第一个用料日期', true);
      return;
    }
    state.submitting = true;
    render();
    try {
      const result = await demandService.submit(dates, {
        ...serviceOptions(),
        expectedAt,
        canteen: currentCanteen(),
        purchaseQuantityOverrides: { ...state.purchaseQtyOverrides }
      });
      clearAttendanceAfterFlow();
      state.submitting = false;
      state.screen = 'main';
      state.tab = 'profile';
      state.profileOrder = null;
      state.orderDetailReturn = '';
      state.profileView = 'home';
      state.profileOrderFilter = '全部';
      state.profileOrderSearchValue = '';
      state.profileOrderKeyword = '';
      state.profileSection = 'submissions';
      state.record = result.record || null;
      state.confirmParticipantKey = '';
      state.purchaseQtyOverrides = {};
      state.purchaseQuantityEditingKey = '';
      state.toast = null;
      render();
      showToast('需求已提交并生成订单');
    } catch (error) {
      state.submitting = false;
      render();
      showToast(error?.message || '提交失败，请稍后重试', true);
    }
  }

  app.addEventListener('click', (event) => {
    if (event.target.matches?.('[data-sheet-backdrop]')) {
      if (state.sheet?.type === 'product-checkout-date') {
        state.productCheckoutDatePickerMonth = '';
        state.productCheckoutDatePickerDraft = '';
        state.sheet = { type: 'product-checkout' };
      } else {
        state.sheet = null;
      }
      render();
      return;
    }
    const target = event.target.closest('[data-action]');
    if (!target || !app.contains(target)) return;
    const action = target.dataset.action;

    if (action === 'open-product-supplier') {
      state.productSupplierDraft = state.productSupplier;
      state.sheet = { type: 'product-supplier' };
      render();
      return;
    }
    if (action === 'select-product-supplier') {
      if (productOrderSupplierNames.includes(target.dataset.supplier)) {
        state.productSupplierDraft = target.dataset.supplier;
        render();
      }
      return;
    }
    if (action === 'product-supplier-cancel') {
      state.productSupplierDraft = state.productSupplier;
      state.sheet = null;
      render();
      return;
    }
    if (action === 'product-supplier-confirm') {
      state.productSupplier = state.productSupplierDraft || state.productSupplier;
      state.sheet = null;
      render();
      return;
    }
    if (action === 'open-product-categories') {
      state.sheet = { type: 'product-categories' };
      render();
      return;
    }
    if (action === 'select-product-category') {
      const category = productOrderCategories.find((item) => item.key === target.dataset.category);
      if (!category) return;
      state.productCategory = category.key;
      state.productSubcategory = category.subcategories[0]?.[0] || '';
      state.productSearchValue = '';
      state.productKeyword = '';
      state.sheet = null;
      render();
      return;
    }
    if (action === 'select-product-subcategory') {
      state.productSubcategory = target.dataset.subcategory || '';
      render();
      return;
    }
    if (action === 'search-products') {
      event.preventDefault();
      state.productKeyword = String(state.productSearchValue || '').trim();
      render();
      return;
    }
    if (action === 'clear-product-search') {
      state.productSearchValue = '';
      state.productKeyword = '';
      render();
      return;
    }
    if (action === 'product-plus' || action === 'product-minus') {
      const product = productOrderFindProduct(target.dataset.productId);
      if (!product) return;
      const current = Number(state.productCart[product.id]?.qty || 0);
      productOrderSetQuantity(product.id, current + (action === 'product-plus' ? 1 : -1));
      render();
      return;
    }
    if (action === 'product-next' || action === 'open-product-cart' || action === 'product-continue-shopping') {
      if (action === 'product-next' && !productOrderCartCount()) {
        showToast('请先选择商品', true);
        return;
      }
      if (action === 'product-next' && state.orderDetailProductAddMode) {
        appendProductCartToOrderDetail();
        return;
      }
      state.screen = 'main';
      state.tab = action === 'product-continue-shopping' ? 'home' : 'cart';
      state.sheet = null;
      render();
      return;
    }
    if (action === 'product-clear-cart') {
      state.productCart = {};
      persistProductOrderCart();
      render();
      showToast('购物车已清空');
      return;
    }
    if (action === 'product-delete-cart') {
      const product = productOrderFindProduct(target.dataset.productId);
      if (!product) return;
      delete state.productCart[product.id];
      persistProductOrderCart();
      render();
      return;
    }
    if (action === 'open-product-checkout') {
      openProductCheckout();
      return;
    }
    if (action === 'product-checkout-back') {
      state.productEditingOrderId = '';
      state.productCheckoutDatePickerMonth = '';
      state.productCheckoutDatePickerDraft = '';
      state.productPickerField = '';
      state.productPickerDraft = '';
      state.sheet = null;
      render();
      return;
    }
    if (action === 'open-product-checkout-date' && state.sheet?.type === 'product-checkout') {
      const currentValue = productOrderDateValue(state.productCheckout.expectedDate || nextProductOrderDate()) || productOrderDateValue(nextProductOrderDate());
      const currentParts = productOrderDateTimeParts(currentValue);
      state.productCheckoutDatePickerDraft = currentValue;
      state.productCheckoutDatePickerMonth = monthKeyOf(currentParts.date) || monthKeyOf(nextProductOrderDate());
      state.sheet = { type: 'product-checkout-date' };
      render();
      return;
    }
    if (action === 'product-checkout-date-month' && state.sheet?.type === 'product-checkout-date') {
      state.productCheckoutDatePickerMonth = shiftMonthKey(
        state.productCheckoutDatePickerMonth || monthKeyOf(state.productCheckoutDatePickerDraft),
        Number(target.dataset.monthDelta) || 0
      );
      render();
      return;
    }
    if (action === 'product-checkout-date-option' && state.sheet?.type === 'product-checkout-date') {
      const selectedDate = target.dataset.date || '';
      if (selectedDate) {
        const currentParts = productOrderDateTimeParts(state.productCheckoutDatePickerDraft);
        state.productCheckoutDatePickerDraft = productOrderDateValue(`${selectedDate} ${currentParts.time}`);
        state.productCheckoutDatePickerMonth = monthKeyOf(selectedDate);
        render();
      }
      return;
    }
    if (action === 'product-checkout-time-value' && state.sheet?.type === 'product-checkout-date') {
      const currentParts = productOrderDateTimeParts(state.productCheckoutDatePickerDraft);
      const timePart = target.dataset.timePart;
      const timeValue = String(target.dataset.timeValue || '').padStart(2, '0');
      const nextTime = expectedAtTimePart(currentParts.time, timePart, timeValue);
      state.productCheckoutDatePickerDraft = productOrderDateValue(`${currentParts.date || nextProductOrderDate()} ${nextTime}`);
      render();
      return;
    }
    if (action === 'product-checkout-date-cancel' && state.sheet?.type === 'product-checkout-date') {
      state.productCheckoutDatePickerMonth = '';
      state.productCheckoutDatePickerDraft = '';
      state.sheet = { type: 'product-checkout' };
      render();
      return;
    }
    if (action === 'product-checkout-date-confirm' && state.sheet?.type === 'product-checkout-date') {
      const selectedParts = productOrderDateTimeParts(state.productCheckoutDatePickerDraft);
      if (!selectedParts.date) {
        showToast('请选择期望送达日期', true);
        return;
      }
      state.productCheckout.expectedDate = productOrderDateValue(`${selectedParts.date} ${selectedParts.time}`);
      state.productCheckoutDatePickerMonth = '';
      state.productCheckoutDatePickerDraft = '';
      state.sheet = { type: 'product-checkout' };
      render();
      return;
    }
    if (action === 'open-product-picker') {
      state.productPickerField = target.dataset.pickerField === 'tag' ? 'tag' : 'canteen';
      state.productPickerDraft = state.productPickerField === 'tag' ? state.productCheckout.tag : state.productCheckout.canteen;
      state.sheet = { type: 'product-picker' };
      render();
      return;
    }
    if (action === 'product-picker-option') {
      state.productPickerDraft = target.dataset.pickerValue || '';
      render();
      return;
    }
    if (action === 'product-picker-cancel') {
      state.productPickerField = '';
      state.productPickerDraft = '';
      state.sheet = { type: 'product-checkout' };
      render();
      return;
    }
    if (action === 'product-picker-confirm') {
      if (state.productPickerField === 'tag') state.productCheckout.tag = state.productPickerDraft;
      else state.productCheckout.canteen = state.productPickerDraft;
      state.productPickerField = '';
      state.productPickerDraft = '';
      state.sheet = { type: 'product-checkout' };
      render();
      return;
    }
    if (action === 'save-product-order') {
      saveProductOrder();
      return;
    }
    if (action === 'product-order-filter') {
      state.productOrderFilter = target.dataset.filter || '全部';
      render();
      return;
    }
    if (action === 'search-product-orders') {
      event.preventDefault();
      state.productOrderKeyword = String(state.productOrderSearchValue || '').trim();
      render();
      return;
    }
    if (action === 'product-order-edit') {
      const order = state.productOrders.find((item) => item.id === target.dataset.orderId);
      if (!order) return;
      if (String(order.status || '') === '待确认') openOrderDetailEdit(order, 'product-orders');
      else openProductCheckout(order);
      return;
    }
    if (action === 'open-order-detail-picker' && state.orderDetailEditing) {
      state.orderDetailPickerField = target.dataset.pickerField === 'tag' ? 'tag' : 'canteen';
      state.orderDetailPickerDraft = state.orderDetailPickerField === 'tag'
        ? String(state.orderDetailDraft?.orderTag || '')
        : String(state.orderDetailDraft?.canteen || '');
      state.sheet = { type: 'order-detail-picker' };
      render();
      return;
    }
    if (action === 'order-detail-picker-option' && state.sheet?.type === 'order-detail-picker') {
      state.orderDetailPickerDraft = target.dataset.pickerValue || '';
      render();
      return;
    }
    if (action === 'order-detail-picker-cancel' && state.sheet?.type === 'order-detail-picker') {
      state.orderDetailPickerField = '';
      state.orderDetailPickerDraft = '';
      state.sheet = null;
      render();
      return;
    }
    if (action === 'order-detail-picker-confirm' && state.sheet?.type === 'order-detail-picker') {
      if (state.orderDetailPickerField === 'tag') state.orderDetailDraft.orderTag = state.orderDetailPickerDraft;
      else state.orderDetailDraft.canteen = state.orderDetailPickerDraft;
      state.orderDetailPickerField = '';
      state.orderDetailPickerDraft = '';
      state.sheet = null;
      render();
      return;
    }
    if (action === 'order-detail-quantity-step' && state.orderDetailEditing) {
      const index = Number(target.dataset.orderItemIndex);
      const item = Number.isInteger(index) ? state.orderDetailDraft?.items?.[index] : null;
      if (!item) return;
      const product = profileOrderProduct(item);
      const stock = Number(product?.stock);
      const max = Number.isFinite(stock) && stock > 0 ? stock : Number.MAX_SAFE_INTEGER;
      const current = Math.max(1, Math.floor(Number(item.orderQty) || 1));
      const delta = Number(target.dataset.step) || 0;
      item.orderQty = Math.max(1, Math.min(max, current + delta));
      render();
      return;
    }
    if (action === 'remove-order-detail-item' && state.orderDetailEditing) {
      const index = Number(target.dataset.orderItemIndex);
      if (!Number.isInteger(index) || !Array.isArray(state.orderDetailDraft?.items)) return;
      state.orderDetailDraft.items.splice(index, 1);
      render();
      return;
    }
    if (action === 'cancel-order-detail-edit' && state.orderDetailEditing) {
      closeOrderDetail();
      return;
    }
    if (action === 'save-order-detail-edit' && state.orderDetailEditing) {
      saveOrderDetailEdit();
      return;
    }
    if (action === 'product-order-reorder') {
      const order = state.productOrders.find((item) => item.id === target.dataset.orderId);
      if (!order) return;
      if (!addProfileOrderToCart(order)) {
        showToast('订单商品已不在当前商品目录中', true);
        return;
      }
      state.screen = 'main';
      state.tab = 'cart';
      state.sheet = null;
      render();
      showToast('已加入购物车');
      return;
    }
    if (action === 'product-order-close') {
      state.productOrders = state.productOrders.map((order) => order.id === target.dataset.orderId ? { ...order, status: '已关闭', updatedAt: productOrderNow() } : order);
      persistProductOrderOrders();
      render();
      showToast('订单已关闭');
      return;
    }
    if (action === 'continue-order-detail-products' && state.orderDetailEditing) {
      openOrderDetailProductAdd();
      return;
    }

    if (action === 'open-attendance') {
      if (!menuFor(state.date)) return;
      state.screen = 'main';
      state.tab = 'attendance';
      state.attendanceReturnTab = 'recipe';
      state.attendanceInputMode = 'dining';
      state.sheet = null;
      loadAttendance();
      render();
      return;
    }

    if (action === 'toggle-attendance-mode') {
      if (state.attendanceInputMode === 'non-dining') {
        saveNonDiningMode();
        return;
      }
      const menu = menuFor(state.date);
      const calculation = attendanceService.calculate(menu, state.attendance, serviceOptions());
      if (!menu || Number(calculation.totalDiningPeople || 0) <= 0) return;
      state.attendanceInputMode = 'non-dining';
      render();
      app.querySelector('[data-action="attendance-non-dining-input"]')?.focus({ preventScroll: true });
      return;
    }

    if (action === 'tab') {
      const nextTab = target.dataset.tab || 'home';
      if (state.screen === 'main' && state.tab === 'attendance' && nextTab !== 'attendance') clearAttendanceAfterFlow();
      state.screen = 'main';
      state.tab = nextTab;
      if (nextTab === 'profile') {
        state.profileView = 'home';
        state.profileOrderFilter = '全部';
        state.profileOrderSearchValue = '';
        state.profileOrderKeyword = '';
        state.profileSection = 'submissions';
        state.record = null;
      }
      state.attendanceInputMode = 'dining';
      state.attendanceReturnTab = '';
      state.sheet = null;
      if (state.tab === 'attendance') loadAttendance();
      render();
      return;
    }
    if (action === 'back') {
      if (state.screen === 'product-orders') {
        state.screen = 'main';
        state.tab = 'home';
        state.sheet = null;
        render();
        return;
      }
      if (state.screen === 'main' && state.orderDetailProductAddMode) {
        closeOrderDetailProductAdd();
        return;
      }
      if (state.screen === 'main' && state.tab === 'attendance') {
        state.tab = state.attendanceReturnTab || 'recipe';
        state.attendanceInputMode = 'dining';
        state.attendanceReturnTab = '';
        state.sheet = null;
        render();
        return;
      }
      if (state.screen === 'order-detail') {
        closeOrderDetail();
        return;
      }
      if (state.screen === 'main' && state.tab === 'profile' && state.profileView !== 'home') {
        state.profileView = 'home';
        state.profileOrderFilter = '全部';
        state.profileOrderSearchValue = '';
        state.profileOrderKeyword = '';
        state.profileSection = 'submissions';
        state.record = null;
        state.profileOrder = null;
        state.sheet = null;
        render();
        return;
      }
      if (state.screen === 'detail') {
        state.screen = 'main';
        state.tab = 'profile';
        state.profileView = 'submissions';
        state.profileSection = 'submissions';
        state.record = null;
        state.profileOrder = null;
        state.sheet = null;
        render();
        return;
      }
      if (state.screen === 'confirm') {
        preserveAttendanceOnReturn();
        loadAttendance();
        state.confirmDates.clear();
        state.confirmParticipantKey = '';
        state.purchaseQtyOverrides = {};
        state.purchaseQuantityEditingKey = '';
        state.expectedAt = '';
      }
      state.screen = 'main';
      state.tab = state.tab === 'profile' ? 'profile' : 'attendance';
      state.attendanceInputMode = 'dining';
      state.attendanceReturnTab = '';
      state.record = null;
      state.sheet = null;
      render();
      return;
    }
    if (action === 'select-meal') {
      const meals = menuFor(state.date)?.meals || [];
      if (meals.some((meal) => meal.key === target.dataset.mealKey)) {
        state.mealKey = target.dataset.mealKey;
        render();
      }
      return;
    }
    if (action === 'change-month') {
      if (state.tab === 'attendance' && state.attendanceInputMode === 'non-dining') return;
      changeMonth(target.dataset.monthDelta);
      return;
    }
    if (action === 'select-date') {
      if (state.tab === 'attendance' && state.attendanceInputMode === 'non-dining') return;
      const strip = target.closest('[data-date-strip]');
      if (strip) {
        const scrollKey = (strip.dataset.stripMode || '') + '|' + (strip.dataset.monthKey || '');
        state.dateStripScroll[scrollKey] = strip.scrollLeft;
      }
      setDate(target.dataset.date);
      state.screen = 'main';
      state.sheet = null;
      render();
      return;
    }
    if (action === 'open-canteen') {
      state.sheet = { type: 'canteen' };
      render();
      return;
    }
    if (action === 'open-expected-at') {
      openExpectedAtSheet();
      return;
    }
    if (action === 'expected-at-month' && state.sheet?.type === 'expected-at') {
      state.sheet.monthKey = shiftMonthKey(state.sheet.monthKey || monthKeyOf(state.date) || anchorMonthKey, Number(target.dataset.monthDelta) || 0);
      render();
      return;
    }
    if (action === 'expected-at-date' && state.sheet?.type === 'expected-at') {
      const parts = parseExpectedAtValue(state.sheet.draftValue || state.expectedAt);
      if (target.dataset.date && expectedAtDateIsAllowed(target.dataset.date)) {
        state.sheet.draftValue = expectedAtInputValue(target.dataset.date, parts.time);
        state.sheet.monthKey = monthKeyOf(target.dataset.date) || state.sheet.monthKey;
        render();
      }
      return;
    }
    if (action === 'expected-at-time-value' && state.sheet?.type === 'expected-at') {
      const parts = parseExpectedAtValue(state.sheet.draftValue || state.expectedAt);
      const timePart = target.dataset.timePart;
      const timeValue = String(target.dataset.timeValue || '').padStart(2, '0');
      const nextTime = expectedAtTimePart(parts.time, timePart, timeValue);
      state.sheet.draftValue = expectedAtInputValue(parts.date || state.date, nextTime);
      render();
      return;
    }
    if (action === 'confirm-expected-at' && state.sheet?.type === 'expected-at') {
      const parts = parseExpectedAtValue(state.sheet.draftValue || state.expectedAt);
      if (!parts.date) {
        showToast('请选择期望送达日期', true);
        return;
      }
      if (!expectedAtDateIsAllowed(parts.date)) {
        showToast('期望送达时间不得晚于第一个用料日期', true);
        return;
      }
      state.expectedAt = expectedAtInputValue(parts.date, parts.time);
      state.sheet = null;
      render();
      return;
    }
    if (action === 'select-canteen') {
      const nextCanteen = target.dataset.canteen || '';
      if (canteenNames.includes(nextCanteen)) {
        state.canteen = nextCanteen;
        window.AppStorage?.write?.(canteenStorageKey, nextCanteen);
        loadAttendance();
      }
      state.sheet = null;
      render();
      return;
    }
    if (action === 'close-sheet') {
      state.sheet = null;
      render();
      return;
    }
    if (action === 'dish') {
      openDishSheet(target);
      return;
    }
    if (action === 'open-demand-detail') {
      openDemandDetailSheet(target);
      return;
    }
    if (action === 'fill-defaults') {
      if (state.tab === 'attendance' && state.attendanceInputMode === 'non-dining') return;
      fillDefaultAttendance();
      render();
      return;
    }
    if (action === 'reset-attendance') {
      if (state.tab === 'attendance' && state.attendanceInputMode === 'non-dining') return;
      resetAttendance();
      render();
      return;
    }
    if (action === 'continue') {
      enterConfirm();
      return;
    }
    if (action === 'confirm-date') {
      const date = target.dataset.date;
      if (state.confirmDates.has(date) && state.confirmDates.size <= 1) {
        showToast('至少选择一个用料日期', true);
        return;
      }
      if (state.confirmDates.has(date)) state.confirmDates.delete(date);
      else state.confirmDates.add(date);
      alignExpectedAtToFirstDate();
      render();
      return;
    }
    if (action === 'confirm-order-tag') {
      const preview = buildConfirmPreview();
      if (confirmParticipants(preview).some((participant) => participant.key === target.dataset.participantKey)) {
        syncConfirmPurchaseInputs();
        state.confirmParticipantKey = target.dataset.participantKey;
        state.purchaseQuantityEditingKey = '';
        render();
      }
      return;
    }
    if (action === 'edit-purchase-quantity') {
      const preview = buildConfirmPreview();
      if (confirmParticipants(preview).some((participant) => participant.key === target.dataset.purchaseParticipantKey)) {
        state.confirmParticipantKey = target.dataset.purchaseParticipantKey;
        state.purchaseQuantityEditingKey = target.dataset.purchaseParticipantKey;
        render();
      }
      return;
    }
    if (action === 'save-purchase-quantity') {
      syncConfirmPurchaseInputs();
      state.purchaseQuantityEditingKey = '';
      render();
      return;
    }
    if (action === 'submit-demand') {
      submitDemand();
      return;
    }
    if (action === 'open-profile-orders') {
      state.screen = 'main';
      state.tab = 'profile';
      state.profileView = 'orders';
      state.profileOrderFilter = target.dataset.orderFilter || '全部';
      state.profileOrderSearchValue = '';
      state.profileOrderKeyword = '';
      state.profileSection = 'orders';
      state.record = null;
      state.sheet = null;
      render();
      return;
    }
    if (action === 'profile-order-filter') {
      state.profileOrderFilter = target.dataset.orderFilter || '全部';
      render();
      return;
    }
    if (action === 'open-profile-order') {
      const order = currentUserOrders().find((item) => String(item.id || item.orderNo || '') === String(target.dataset.orderId || ''));
      if (!order) return;
      clearOrderDetailEditState();
      state.profileOrder = clone(order);
      state.orderDetailReturn = 'profile-orders';
      state.screen = 'order-detail';
      state.tab = 'profile';
      state.sheet = null;
      render();
      return;
    }
    if (action === 'open-product-order') {
      const order = state.productOrders.find((item) => String(item.id || item.orderNo || '') === String(target.dataset.orderId || ''));
      if (!order) return;
      clearOrderDetailEditState();
      state.profileOrder = clone(order);
      state.orderDetailReturn = 'product-orders';
      state.screen = 'order-detail';
      state.tab = 'home';
      state.sheet = null;
      render();
      return;
    }
    if (action === 'profile-order-edit') {
      const order = state.productOrders.find((item) => String(item.id || item.orderNo || '') === String(target.dataset.orderId || ''));
      if (!order) return;
      if (String(order.status || '') === '待确认') openOrderDetailEdit(order, 'profile-orders');
      else openProductCheckout(order);
      return;
    }
    if (action === 'profile-order-reorder') {
      const order = currentUserOrders().find((item) => String(item.id || item.orderNo || '') === String(target.dataset.orderId || ''));
      if (!order) return;
      if (!addProfileOrderToCart(order)) {
        showToast('订单商品已不在当前商品目录中', true);
        return;
      }
      state.screen = 'main';
      state.tab = 'cart';
      state.profileView = 'home';
      state.sheet = null;
      render();
      showToast('已加入购物车');
      return;
    }
    if (action === 'profile-order-close') {
      const orderId = String(target.dataset.orderId || '');
      state.productOrders = state.productOrders.map((order) => String(order.id || '') === orderId
        ? { ...order, status: '已关闭', updatedAt: productOrderNow() }
        : order);
      persistProductOrderOrders();
      state.profileOrder = null;
      render();
      showToast('订单已关闭');
      return;
    }
    if (action === 'open-profile-submissions') {
      state.screen = 'main';
      state.tab = 'profile';
      state.profileView = 'submissions';
      state.profileSection = 'submissions';
      state.record = null;
      state.sheet = null;
      render();
      return;
    }
    if (action === 'profile-section') {
      state.profileSection = target.dataset.profileSection === 'orders' ? 'orders' : 'submissions';
      state.profileView = state.profileSection;
      render();
      return;
    }
    if (action === 'switch-account') {
      state.sheet = { type: 'account-switch' };
      render();
      app.querySelector('[data-action="confirm-switch-account"]')?.focus({ preventScroll: true });
      return;
    }
    if (action === 'confirm-switch-account') {
      state.sheet = null;
      logoutMobile();
      return;
    }
    if (action === 'logout') {
      state.sheet = { type: 'account-logout' };
      render();
      app.querySelector('[data-action="confirm-switch-account"]')?.focus({ preventScroll: true });
      return;
    }
    if (action === 'record') {
      state.record = demandService.get(target.dataset.recordId || '');
      state.screen = 'detail';
      state.sheet = null;
      render();
    }
  });

  app.addEventListener('input', (event) => {
    const target = event.target.closest('[data-action]');
    if (!target || !app.contains(target)) return;
    const action = target.dataset.action;
    if ((action === 'order-detail-quantity' || action === 'order-detail-remark') && state.orderDetailEditing) {
      const index = Number(target.dataset.orderItemIndex);
      const item = Number.isInteger(index) ? state.orderDetailDraft?.items?.[index] : null;
      if (item) {
        if (action === 'order-detail-quantity') item.orderQty = target.value;
        else item.remark = target.value;
      }
      return;
    }
    if (action === 'product-search-input') {
      state.productSearchValue = target.value;
      return;
    }
    if (action === 'product-order-search-input') {
      state.productOrderSearchValue = target.value;
      return;
    }
    if (action === 'profile-order-search-input') {
      state.profileOrderSearchValue = target.value;
      return;
    }
    if (action === 'product-cart-note') {
      const entry = state.productCart[target.dataset.productId];
      if (entry) {
        entry.note = target.value;
        persistProductOrderCart();
      }
      return;
    }
    if (action === 'product-quantity') {
      if (target.value !== '') productOrderSetQuantity(target.dataset.productId, target.value);
      return;
    }
    if (action === 'attendance-input') {
      const mealKey = target.dataset.meal;
      const participantKey = target.dataset.participant;
      if (Number(target.value) > MAX_ATTENDANCE_PEOPLE) target.value = String(MAX_ATTENDANCE_PEOPLE);
      if (!state.attendance.meals) state.attendance.meals = {};
      if (!state.attendance.meals[mealKey]) state.attendance.meals[mealKey] = {};
      state.attendance.meals[mealKey][participantKey] = target.value === '' ? '' : target.value;
      saveAttendanceDraft();
      updateAttendanceLive();
      return;
    }
    if (action === 'attendance-non-dining-input') {
      const mealKey = target.dataset.meal;
      const participantKey = target.dataset.participant;
      if (!state.attendance.temporaryNonDining) state.attendance.temporaryNonDining = {};
      if (!state.attendance.temporaryNonDining[mealKey]) state.attendance.temporaryNonDining[mealKey] = {};
      state.attendance.temporaryNonDining[mealKey][participantKey] = target.value === '' ? '' : target.value;
      updateAttendanceNonDiningLive();
      return;
    }
    if (action === 'confirm-purchase-quantity') {
      rememberConfirmPurchaseQuantity(target);
      updateConfirmSubmitState();
      return;
    }
    if (action === 'record-keyword') {
      state.recordKeyword = target.value;
      const list = app.querySelector('#schoolMobileRecordList');
      if (list) list.innerHTML = renderRecordList();
      return;
    }
    if (action === 'login-username') {
      state.loginUsername = target.value;
      return;
    }
    if (action === 'login-password') {
      state.loginPassword = target.value;
      return;
    }
    if (action === 'login-agreement') {
      state.loginAgreement = target.checked;
      return;
    }
    if (action === 'expected-at') {
      state.expectedAt = target.value;
      updateConfirmSubmitState();
    }
  });

  app.addEventListener('change', (event) => {
    const productTarget = event.target.closest?.('[data-action]');
    if (productTarget && app.contains(productTarget)) {
      const productAction = productTarget.dataset.action;
      if (productAction === 'product-quantity' || productAction === 'product-cart-quantity') {
        productOrderSetQuantity(productTarget.dataset.productId, productTarget.value || 0);
        render();
        return;
      }
      if (productAction === 'product-checkout-date') {
        state.productCheckout.expectedDate = productTarget.value;
        render();
        return;
      }
    }
    const target = event.target.closest?.('[data-action="confirm-purchase-quantity"]');
    if (!target || !app.contains(target)) return;
    normalizeConfirmPurchaseQuantityInput(target);
    rememberConfirmPurchaseQuantity(target);
    updateConfirmSubmitState();
  });

  app.addEventListener('submit', (event) => {
    if (event.target.matches('[data-product-search-form]')) {
      event.preventDefault();
      state.productKeyword = String(state.productSearchValue || '').trim();
      render();
      return;
    }
    if (event.target.matches('[data-product-order-search-form]')) {
      event.preventDefault();
      state.productOrderKeyword = String(state.productOrderSearchValue || '').trim();
      render();
      return;
    }
    if (event.target.matches('[data-profile-order-search-form]')) {
      event.preventDefault();
      state.profileOrderKeyword = String(state.profileOrderSearchValue || '').trim();
      render();
      return;
    }
    if (!event.target.matches('[data-mobile-login-form]')) return;
    event.preventDefault();
    loginMobile();
  });

  app.addEventListener('scroll', (event) => {
    const timeColumn = event.target.closest?.('.school-mobile-expected-at-time-column');
    if (timeColumn && app.contains(timeColumn)) {
      updateExpectedAtTimeFromScroll(timeColumn);
      return;
    }
    const strip = event.target.closest?.('[data-date-strip]');
    if (!strip || !app.contains(strip)) return;
    const scrollKey = (strip.dataset.stripMode || '') + '|' + (strip.dataset.monthKey || '');
    state.dateStripScroll[scrollKey] = strip.scrollLeft;
    updateDateMonthControls(strip);
  }, true);

  app.addEventListener('pointerdown', (event) => {
    const panel = event.target.closest?.('[data-meal-panel]');
    if (!panel || !app.contains(panel) || (event.pointerType === 'mouse' && event.button !== 0)) return;
    mealSwipeStart = { x: event.clientX, y: event.clientY };
  }, { passive: true });

  app.addEventListener('pointerup', (event) => {
    if (!mealSwipeStart) return;
    const deltaX = event.clientX - mealSwipeStart.x;
    const deltaY = event.clientY - mealSwipeStart.y;
    mealSwipeStart = null;
    if (Math.abs(deltaX) < 44 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
    const meals = menuFor(state.date)?.meals || [];
    const index = meals.findIndex((meal) => meal.key === state.mealKey);
    const nextMeal = meals[index + (deltaX < 0 ? 1 : -1)];
    if (nextMeal) {
      state.mealKey = nextMeal.key;
      render();
    }
  }, { passive: true });

  app.addEventListener('pointercancel', () => {
    mealSwipeStart = null;
    productSwipeStart = null;
  }, { passive: true });

  app.addEventListener('pointerdown', (event) => {
    const productList = event.target.closest?.('.school-mobile-product-list');
    const productScroll = event.target.closest?.('.school-mobile-product-scroll');
    if ((!productList && !productScroll) || !app.contains(productList || productScroll) || (event.pointerType === 'mouse' && event.button !== 0)) return;
    productSwipeStart = {
      element: productList || productScroll,
      kind: productList ? 'list' : 'page',
      x: event.clientX,
      y: event.clientY
    };
  }, { passive: true });

  app.addEventListener('pointerup', (event) => {
    if (!productSwipeStart) return;
    const start = productSwipeStart;
    productSwipeStart = null;
    if (state.sheet || state.screen !== 'main' || state.tab !== 'home') return;
    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.abs(deltaY) < 44 || Math.abs(deltaY) <= Math.abs(deltaX)) return;
    if (start.kind === 'page' && deltaY > 0 && start.element.scrollTop <= 1) {
      state.sheet = { type: 'product-categories' };
      render();
      return;
    }
    if (start.kind === 'list' && deltaY < 0) {
      const isAtBottom = start.element.scrollHeight - start.element.scrollTop - start.element.clientHeight <= 2;
      if (isAtBottom) advanceProductSubcategory();
    }
  }, { passive: true });

  window.addEventListener('pagehide', () => {
    if (state.screen === 'confirm' || (state.screen === 'main' && state.tab === 'attendance')) {
      attendanceService.markResetOnReturn?.(currentCanteen());
    }
  });

  window.addEventListener('pageshow', (event) => {
    if (!event.persisted || !attendanceService.consumeResetOnReturn?.(currentCanteen())) return;
    clearAttendanceAfterFlow();
    state.screen = 'main';
    state.tab = 'attendance';
    state.sheet = null;
    render();
  });

  loadAttendance(true);
  render();
})();
