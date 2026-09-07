(function () {
  const RESOURCE = 'recipeAttendance';
  const META_RESOURCE = 'recipeAttendanceMeta';
  const SEED_VERSION = '20260904-attendance-seed-v2-empty';
  const MIN_COUNT = 1;
  const MAX_COUNT = 100000;
  const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
  const number = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const timestamp = () => window.BusinessRules?.now?.()
    || new Date().toISOString().slice(0, 19).replace('T', ' ');
  const mealTypes = [
    { key: 'breakfast', name: '早餐' },
    { key: 'lunch', name: '午餐' },
    { key: 'dinner', name: '晚餐' },
    { key: 'snack', name: '加餐' }
  ];
  const legacyParticipants = [
    { key: 'student', label: '学生', tagName: '学生', nutritious: '不区分', orderTag: '学生-不区分', legacyKey: 'student' },
    { key: 'teacher', label: '教师', tagName: '教师', nutritious: '不区分', orderTag: '教师-不区分', legacyKey: 'teacher' }
  ];

  const seed = [];
  let memoryRecords = clone(seed);

  function hasSeedMarker() {
    if (!window.DemoStore) return false;
    const markers = window.DemoStore.get(META_RESOURCE);
    return Array.isArray(markers) && markers.some((item) => item.id === SEED_VERSION);
  }

  function writeRecords(records) {
    const next = clone(records || []);
    if (window.DemoStore) window.DemoStore.replace(RESOURCE, next);
    else memoryRecords = next;
    return next;
  }

  function readAll() {
    if (!window.DemoStore) return clone(memoryRecords);
    const current = window.DemoStore.get(RESOURCE);
    if (hasSeedMarker()) return Array.isArray(current) ? current : [];
    // 切换为空白初始数据时，清理旧版演示人数及其已保存的填报数据。
    window.DemoStore.replace(RESOURCE, seed);
    window.DemoStore.replace(META_RESOURCE, [{ id: SEED_VERSION, createdAt: timestamp() }]);
    return clone(seed);
  }

  function resolveCanteen(canteen) {
    const config = window.SchoolCanteenConfigService;
    if (config?.getCanteen) {
      const resolved = config.getCanteen(canteen);
      if (resolved) return resolved;
    }
    const fallbackName = window.AppStorage?.read?.('school-recipe-current-canteen', '') || '第一食堂';
    if (canteen && typeof canteen === 'object') return { id: canteen.id || '', name: canteen.name || fallbackName };
    return { id: '', name: String(canteen || fallbackName) };
  }

  function sameScope(record, canteen) {
    const scope = resolveCanteen(canteen);
    if (scope.id && record?.canteenId) return String(record.canteenId) === String(scope.id);
    if (record?.canteen) return String(record.canteen) === String(scope.name);
    // 兼容旧版没有食堂字段的填报记录，默认归属当前食堂。
    return !record?.canteenId && !record?.canteen;
  }

  function emptyRecord(date, canteen) {
    const scope = resolveCanteen(canteen);
    const scopeId = scope.id || scope.name || 'default';
    return {
      id: `RECIPE-ATTENDANCE-${scopeId}-${String(date || '').replace(/-/g, '')}`,
      canteenId: scope.id || '',
      canteen: scope.name || '',
      date,
      recipeVersion: '',
      updatedAt: '',
      meals: {}
    };
  }

  function get(date, canteen) {
    const targetDate = String(date || '').trim();
    const current = readAll();
    const record = current.find((item) => item.date === targetDate && sameScope(item, canteen));
    return clone(record || emptyRecord(targetDate, canteen));
  }

  function normalizeCount(value) {
    if (value === '' || value == null) return '';
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < MIN_COUNT || parsed > MAX_COUNT) return '';
    return parsed;
  }

  function normalizeMeals(meals = {}) {
    const normalized = {};
    Object.entries(meals || {}).forEach(([key, value]) => {
      normalized[key] = Object.fromEntries(Object.entries(value || {}).map(([participantKey, count]) => [participantKey, normalizeCount(count)]));
    });
    return normalized;
  }

  function save(date, meals, recipeVersion = '', canteen) {
    const scope = resolveCanteen(canteen);
    const next = {
      ...emptyRecord(date, scope),
      recipeVersion,
      updatedAt: timestamp(),
      meals: normalizeMeals(meals)
    };
    const current = readAll();
    const index = current.findIndex((item) => item.date === date && sameScope(item, scope));
    if (index >= 0) current[index] = next;
    else current.push(next);
    current.sort((a, b) => `${a.canteenId || a.canteen || ''}|${a.date}`.localeCompare(`${b.canteenId || b.canteen || ''}|${b.date}`));
    writeRecords(current);
    return clone(next);
  }

  function remove(date, canteen) {
    const targetDate = String(date || '').trim();
    if (!targetDate) return false;
    const current = readAll();
    const next = current.filter((item) => !(item.date === targetDate && sameScope(item, canteen)));
    if (next.length === current.length) return false;
    writeRecords(next);
    return true;
  }

  function participantsFor(canteen) {
    const config = window.SchoolCanteenConfigService;
    if (config?.getConfiguredTags) return config.getConfiguredTags(resolveCanteen(canteen)).map((tag) => ({
      key: tag.key || tag.id,
      tagId: tag.tagId || tag.id,
      label: tag.label || tag.tagName,
      tagName: tag.tagName || tag.label,
      nutritious: tag.nutritious || '不区分',
      orderTag: tag.orderTag || `${tag.tagName}-${tag.nutritious || '不区分'}`,
      defaultPeople: clone(tag.defaultPeople || {}),
      legacyKey: tag.legacyKey || ''
    }));
    return clone(legacyParticipants);
  }

  function resolveParticipants(options = {}) {
    if (Array.isArray(options.participants)) return options.participants;
    return participantsFor(options.canteen);
  }

  function valueForParticipant(values, participant) {
    const source = values || {};
    const keys = [...new Set([participant?.key, participant?.tagId, participant?.legacyKey, participant?.orderTag].filter(Boolean))];
    const key = keys.find((candidate) => Object.prototype.hasOwnProperty.call(source, candidate));
    return key ? source[key] : '';
  }

  function participantLabel(participant) {
    const label = participant?.label || participant?.tagName || '人员';
    const nutritious = participant?.nutritious && participant.nutritious !== '不区分' ? `（${participant.nutritious}）` : '';
    return `${label}${nutritious}`;
  }

  function participantDisplayName(participant, participants = []) {
    const label = participant?.label || participant?.tagName || '人员';
    return `${label}—${participant?.nutritious || '不区分'}`;
  }

  function requiredMeals(menu) {
    return (menu?.meals || []).filter((meal) => (meal.dishes || []).length);
  }

  function hasValue(value) {
    const parsed = Number(value);
    return value !== '' && value != null && Number.isInteger(parsed) && parsed >= MIN_COUNT && parsed <= MAX_COUNT;
  }

  function hasPeople(values = {}, participants = []) {
    return participants.some((participant) => hasValue(valueForParticipant(values, participant)));
  }

  function status(menu, record, options = {}) {
    const participants = resolveParticipants(options);
    if (!menu) return { key: 'empty', label: '暂无菜谱', filled: 0, total: 0 };
    if (!participants.length) return { key: 'empty', label: '未配置人员类型', filled: 0, total: requiredMeals(menu).length };
    const meals = requiredMeals(menu);
    const filled = meals.filter((meal) => hasPeople(record?.meals?.[meal.key] || {}, participants)).length;
    const key = filled === 0 ? 'empty' : filled === meals.length ? 'complete' : 'partial';
    const label = key === 'complete' ? '已完成' : key === 'partial' ? '部分填写' : '未填写';
    return { key, label, filled, total: meals.length };
  }

  function validate(menu, record, options = {}) {
    const errors = [];
    const missingMeals = [];
    const participants = resolveParticipants(options);
    if (!participants.length) {
      return {
        errors,
        missingMeals: requiredMeals(menu).map((meal) => meal.name),
        missingMappings: [],
        people: 0,
        canContinue: false,
        message: menu ? '当前食堂暂无启用人员类型，请先在食堂运营设置中启用' : '请选择有菜谱的日期'
      };
    }
    requiredMeals(menu).forEach((meal) => {
      const values = record?.meals?.[meal.key] || {};
      participants.forEach((participant) => {
        const value = valueForParticipant(values, participant);
        const parsed = Number(value);
        if (value !== '' && value != null && (!Number.isInteger(parsed) || parsed < MIN_COUNT || parsed > MAX_COUNT)) {
          errors.push(`${meal.name}${participantLabel(participant)}人数需填写 1～100000 的整数`);
        }
      });
      if (!hasPeople(values, participants)) missingMeals.push(meal.name);
    });
    const missingMappings = (menu?.meals || []).flatMap((meal) => (meal.dishes || []).flatMap((dish) => (
      (dish.ingredients || []).filter((item) => !item.productCode || item.mappingStatus !== '已关联').map((item) => item.name)
    )));
    const uniqueMissingMappings = [...new Set(missingMappings)];
    const people = requiredMeals(menu).reduce((total, meal) => {
      const values = record?.meals?.[meal.key] || {};
      return total + participants.reduce((sum, participant) => sum + (hasValue(valueForParticipant(values, participant)) ? number(valueForParticipant(values, participant)) : 0), 0);
    }, 0);
    return {
      errors,
      missingMeals,
      missingMappings: uniqueMissingMappings,
      people,
      canContinue: Boolean(menu) && !errors.length && !uniqueMissingMappings.length && people > 0,
      message: errors[0] || (uniqueMissingMappings.length ? '当前食谱存在未关联采购商品' : people > 0 ? '' : '至少填写一餐的就餐人数')
    };
  }

  function calculate(menu, record, options = {}) {
    const rows = new Map();
    const participants = resolveParticipants(options);
    const participantPeople = Object.fromEntries(participants.map((participant) => [participant.key, 0]));
    let totalStudentPeople = 0;
    let totalTeacherPeople = 0;
    (menu?.meals || []).forEach((meal) => {
      const values = record?.meals?.[meal.key] || {};
      const mealPeople = {};
      participants.forEach((participant) => {
        const people = number(valueForParticipant(values, participant));
        mealPeople[participant.key] = people;
        participantPeople[participant.key] = number(participantPeople[participant.key]) + people;
        if (participant.legacyKey === 'student' || participant.tagName === '学生') totalStudentPeople += people;
        if (participant.legacyKey === 'teacher' || participant.tagName === '教师' || participant.tagName === '教职工') totalTeacherPeople += people;
      });
      (meal.dishes || []).forEach((dish) => {
        (dish.ingredients || []).forEach((item) => {
          const mapped = Boolean(item.productCode) && item.mappingStatus === '已关联';
          const unit = item.unit || '--';
          const code = mapped ? item.productCode : `UNMAPPED-${item.name}`;
          const key = `${code}::${unit}`;
          const current = rows.get(key) || {
            key,
            productCode: mapped ? item.productCode : '',
            productName: mapped ? (item.productName || item.name) : '未关联采购商品',
            ingredientNames: [],
            unit,
            perCapitaQty: 0,
            participantQty: Object.fromEntries(participants.map((participant) => [participant.key, 0])),
            studentQty: 0,
            teacherQty: 0,
            totalQty: 0,
            mealNames: [],
            dishNames: [],
            mappingStatus: mapped ? '已关联' : '待关联'
          };
          const perCapitaQty = number(item.perCapitaQty);
          current.perCapitaQty += perCapitaQty;
          participants.forEach((participant) => {
            const participantQty = perCapitaQty * number(mealPeople[participant.key]);
            current.participantQty[participant.key] = number(current.participantQty[participant.key]) + participantQty;
            if (participant.legacyKey === 'student' || participant.tagName === '学生') current.studentQty += participantQty;
            if (participant.legacyKey === 'teacher' || participant.tagName === '教师' || participant.tagName === '教职工') current.teacherQty += participantQty;
          });
          current.totalQty = participants.reduce((total, participant) => total + number(current.participantQty[participant.key]), 0);
          if (!current.ingredientNames.includes(item.name)) current.ingredientNames.push(item.name);
          if (!current.mealNames.includes(meal.name)) current.mealNames.push(meal.name);
          if (!current.dishNames.includes(dish.name)) current.dishNames.push(dish.name);
          rows.set(key, current);
        });
      });
    });
    return {
      rows: [...rows.values()].sort((a, b) => {
        if (a.mappingStatus !== b.mappingStatus) return a.mappingStatus === '待关联' ? -1 : 1;
        return a.productName.localeCompare(b.productName, 'zh-CN');
      }),
      participantPeople,
      totalStudentPeople,
      totalTeacherPeople,
      totalPeople: participants.reduce((total, participant) => total + number(participantPeople[participant.key]), 0),
      totalQty: [...rows.values()].reduce((total, row) => total + row.totalQty, 0)
    };
  }

  window.SchoolRecipeAttendanceService = {
    mealTypes,
    get,
    save,
    remove,
    emptyRecord,
    participantsFor,
    valueForParticipant,
    participantDisplayName,
    status,
    validate,
    calculate
  };
})();
