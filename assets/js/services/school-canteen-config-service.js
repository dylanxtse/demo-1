(function () {
  const STORAGE_KEY = 'school-canteens-v1';
  const CURRENT_CANTEEN_KEY = 'school-recipe-current-canteen';
  const MAX_DEFAULT_PEOPLE = 100000;
  const mealTypes = [
    { key: 'breakfast', name: '早餐' },
    { key: 'morningSnack', name: '早点' },
    { key: 'lunch', name: '午餐' },
    { key: 'afternoonSnack', name: '午点' },
    { key: 'dinner', name: '晚餐' },
    { key: 'eveningSnack', name: '晚点' }
  ];
  const fallbackCanteens = [
    { id: 'canteen-demo', name: '静安第一中学食堂（演示）', code: '--', contact: '张三', phone: '13598767869', address: '静安区' },
    { id: 'canteen-002', name: '静安1中食堂', code: '91371721MABYLE8Q4R', contact: '王锦安', phone: '15646871654', address: '静安区' },
    { id: 'canteen-003', name: '第2食堂', code: '--', contact: '刘先生', phone: '13866551122', address: '静安区' },
    { id: 'canteen-004', name: '第一食堂', code: '--', contact: '王先生', phone: '15269836547', address: '静安区' },
    { id: 'canteen-default', name: '默认', code: '--', contact: '默认', phone: '13658888888', address: '静安区' }
  ];
  const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
  const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);

  function readStoredCanteens() {
    if (window.AppStorage?.read) return window.AppStorage.read(STORAGE_KEY, null);
    try { return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null'); } catch (error) { return null; }
  }

  function readCanteens() {
    const seed = window.SchoolReferenceData?.canteens?.length
      ? window.SchoolReferenceData.canteens
      : fallbackCanteens;
    const saved = readStoredCanteens();
    if (!Array.isArray(saved) || !saved.length) return clone(seed);
    const savedById = new Map(saved.map((item) => [String(item?.id || ''), item]));
    const merged = seed.map((item) => {
      const stored = savedById.get(String(item.id)) || {};
      return { ...clone(item), ...clone(stored) };
    });
    const seedIds = new Set(seed.map((item) => String(item.id)));
    return merged.concat(saved.filter((item) => item && !seedIds.has(String(item.id))).map(clone));
  }

  function writeCanteens(canteens) {
    const next = clone(canteens || []);
    if (window.AppStorage?.write) {
      window.AppStorage.write(STORAGE_KEY, next);
      return next;
    }
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch (error) { /* 保持当前原型状态 */ }
    return next;
  }

  function getCanteen(value) {
    const text = String(value?.id || value?.name || value || '').trim();
    const rows = readCanteens();
    return clone(rows.find((item) => String(item.id) === text || String(item.name) === text) || (value && typeof value === 'object' ? value : null));
  }

  function selectedCanteen(fallbackName = '第一食堂') {
    const stored = window.AppStorage?.read?.(CURRENT_CANTEEN_KEY, '') || '';
    return getCanteen(stored) || getCanteen(fallbackName) || { id: '', name: fallbackName };
  }

  function getEnterpriseTags() {
    const tags = window.DemoStore?.get?.('tags') || window.MockOperations?.tags || [];
    return clone(tags.filter((tag) => tag && tag.id && String(tag.tagName || '').trim()));
  }

  function getAvailableTags() {
    return getEnterpriseTags().filter((tag) => String(tag.status || 'ENABLE') !== 'DISABLE');
  }

  function normalizeDefaultPeople(value) {
    if (value === '' || value == null) return '';
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= 1 && parsed <= MAX_DEFAULT_PEOPLE ? parsed : '';
  }

  function emptyDefaultPeople() {
    return Object.fromEntries(mealTypes.map((meal) => [meal.key, '']));
  }

  function normalizeSetting(setting) {
    const defaults = setting?.defaultPeople || setting?.defaults || {};
    return {
      enabled: setting?.enabled === true || setting?.enabled === 'true',
      defaultPeople: Object.fromEntries(mealTypes.map((meal) => [meal.key, normalizeDefaultPeople(defaults[meal.key])] ))
    };
  }

  function legacyParticipantKey(tag) {
    if (String(tag?.tagName || '') === '学生') return 'student';
    if (String(tag?.tagName || '') === '教师' || String(tag?.tagName || '') === '教职工') return 'teacher';
    return '';
  }

  function isLegacyDefaultEnabled(tag, canteen) {
    if (!canteen?.id) return false;
    return Boolean(legacyParticipantKey(tag) && String(tag.nutritious || '') === '不区分');
  }

  function getTagSettings(canteen, tags = getAvailableTags(), options = {}) {
    const saved = canteen?.orderTagSettings && typeof canteen.orderTagSettings === 'object'
      ? canteen.orderTagSettings
      : {};
    const legacyDefaults = options.legacyDefaults !== false;
    return Object.fromEntries(tags.map((tag) => {
      const raw = hasOwn(saved, tag.id) ? saved[tag.id] : null;
      const normalized = normalizeSetting(raw);
      if (!raw && legacyDefaults) normalized.enabled = isLegacyDefaultEnabled(tag, canteen);
      return [tag.id, normalized];
    }));
  }

  function getConfiguredTags(canteen, options = {}) {
    const tags = options.tags || getAvailableTags();
    const settings = getTagSettings(canteen, tags, options);
    return tags
      .filter((tag) => options.includeDisabled || settings[tag.id]?.enabled)
      .map((tag) => ({
        ...clone(tag),
        ...clone(settings[tag.id]),
        key: tag.id,
        tagId: tag.id,
        label: tag.tagName,
        tagName: tag.tagName,
        nutritious: tag.nutritious || '不区分',
        orderTag: `${tag.tagName}-${tag.nutritious || '不区分'}`,
        legacyKey: legacyParticipantKey(tag)
      }));
  }

  window.SchoolCanteenConfigService = {
    STORAGE_KEY,
    CURRENT_CANTEEN_KEY,
    mealTypes,
    readCanteens,
    writeCanteens,
    getCanteen,
    selectedCanteen,
    getEnterpriseTags,
    getAvailableTags,
    normalizeDefaultPeople,
    emptyDefaultPeople,
    normalizeSetting,
    getTagSettings,
    getConfiguredTags,
    legacyParticipantKey
  };
})();
