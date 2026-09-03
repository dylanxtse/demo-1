(function () {
  const RESOURCE = 'recipeAttendance';
  const META_RESOURCE = 'recipeAttendanceMeta';
  const SEED_VERSION = '20260903-attendance-seed-v1';
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

  const seed = [
    {
      id: 'RECIPE-ATTENDANCE-20260907',
      date: '2026-09-07',
      recipeVersion: '2026 秋季营养菜谱第 12 版',
      updatedAt: '2026-09-03 09:12:00',
      meals: {
        breakfast: { student: 520, teacher: 42 },
        lunch: { student: 680, teacher: 48 },
        dinner: { student: 460, teacher: 36 }
      }
    },
    {
      id: 'RECIPE-ATTENDANCE-20260908',
      date: '2026-09-08',
      recipeVersion: '2026 秋季营养菜谱第 12 版',
      updatedAt: '2026-09-03 09:15:00',
      meals: {
        breakfast: { student: 510, teacher: 40 },
        lunch: { student: 660, teacher: 46 }
      }
    }
  ];
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
    if (Array.isArray(current) && current.length) {
      if (!hasSeedMarker()) window.DemoStore.replace(META_RESOURCE, [{ id: SEED_VERSION, createdAt: timestamp() }]);
      return current;
    }
    if (hasSeedMarker()) return [];
    window.DemoStore.replace(RESOURCE, seed);
    window.DemoStore.replace(META_RESOURCE, [{ id: SEED_VERSION, createdAt: timestamp() }]);
    return clone(seed);
  }

  function emptyRecord(date) {
    return {
      id: `RECIPE-ATTENDANCE-${String(date || '').replace(/-/g, '')}`,
      date,
      recipeVersion: '',
      updatedAt: '',
      meals: {}
    };
  }

  function get(date) {
    const record = readAll().find((item) => item.date === date);
    return clone(record || emptyRecord(date));
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
      normalized[key] = {
        student: normalizeCount(value?.student),
        teacher: normalizeCount(value?.teacher)
      };
    });
    return normalized;
  }

  function save(date, meals, recipeVersion = '') {
    const next = {
      ...emptyRecord(date),
      recipeVersion,
      updatedAt: timestamp(),
      meals: normalizeMeals(meals)
    };
    const current = readAll();
    const index = current.findIndex((item) => item.date === date);
    if (index >= 0) current[index] = next;
    else current.push(next);
    current.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    writeRecords(current);
    return clone(next);
  }

  function remove(date) {
    const targetDate = String(date || '').trim();
    if (!targetDate) return false;
    const current = readAll();
    const next = current.filter((item) => item.date !== targetDate);
    if (next.length === current.length) return false;
    writeRecords(next);
    return true;
  }

  function requiredMeals(menu) {
    return (menu?.meals || []).filter((meal) => (meal.dishes || []).length);
  }

  function hasValue(value) {
    const parsed = Number(value);
    return value !== '' && value != null && Number.isInteger(parsed) && parsed >= MIN_COUNT && parsed <= MAX_COUNT;
  }

  function hasPeople(values = {}) {
    return hasValue(values.student) || hasValue(values.teacher);
  }

  function status(menu, record) {
    if (!menu) return { key: 'empty', label: '暂无菜谱', filled: 0, total: 0 };
    const meals = requiredMeals(menu);
    const filled = meals.filter((meal) => {
      const values = record?.meals?.[meal.key] || {};
      return hasPeople(values);
    }).length;
    const key = filled === 0 ? 'empty' : filled === meals.length ? 'complete' : 'partial';
    const label = key === 'complete' ? '已完成' : key === 'partial' ? '部分填写' : '未填写';
    return { key, label, filled, total: meals.length };
  }

  function validate(menu, record) {
    const errors = [];
    const missingMeals = [];
    requiredMeals(menu).forEach((meal) => {
      const values = record?.meals?.[meal.key] || {};
      ['student', 'teacher'].forEach((type) => {
        const value = values[type];
        const parsed = Number(value);
        if (value !== '' && value != null && (!Number.isInteger(parsed) || parsed < MIN_COUNT || parsed > MAX_COUNT)) {
          errors.push(`${meal.name}${type === 'student' ? '学生' : '教职工'}人数需填写 1～100000 的整数`);
        }
      });
      if (!hasPeople(values)) missingMeals.push(meal.name);
    });
    const missingMappings = (menu?.meals || []).flatMap((meal) => (meal.dishes || []).flatMap((dish) => (
      (dish.ingredients || []).filter((item) => !item.productCode || item.mappingStatus !== '已关联').map((item) => item.name)
    )));
    const uniqueMissingMappings = [...new Set(missingMappings)];
    const people = requiredMeals(menu).reduce((total, meal) => {
      const values = record?.meals?.[meal.key] || {};
      return total + number(values.student) + number(values.teacher);
    }, 0);
    return {
      errors,
      missingMeals,
      missingMappings: uniqueMissingMappings,
      people,
      canContinue: Boolean(menu) && !errors.length && !missingMeals.length && !uniqueMissingMappings.length && people > 0,
      message: errors[0] || (missingMeals.length ? `请至少填写${missingMeals.join('、')}的学生或教职工人数` : uniqueMissingMappings.length ? '当前食谱存在未关联采购商品' : people > 0 ? '' : '至少填写一餐的就餐人数')
    };
  }

  function calculate(menu, record) {
    const rows = new Map();
    let totalStudentPeople = 0;
    let totalTeacherPeople = 0;
    (menu?.meals || []).forEach((meal) => {
      const values = record?.meals?.[meal.key] || {};
      const studentPeople = number(values.student);
      const teacherPeople = number(values.teacher);
      totalStudentPeople += studentPeople;
      totalTeacherPeople += teacherPeople;
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
            studentQty: 0,
            teacherQty: 0,
            totalQty: 0,
            mealNames: [],
            dishNames: [],
            mappingStatus: mapped ? '已关联' : '待关联'
          };
          const perCapitaQty = number(item.perCapitaQty);
          current.perCapitaQty += perCapitaQty;
          current.studentQty += perCapitaQty * studentPeople;
          current.teacherQty += perCapitaQty * teacherPeople;
          current.totalQty = current.studentQty + current.teacherQty;
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
      totalStudentPeople,
      totalTeacherPeople,
      totalPeople: totalStudentPeople + totalTeacherPeople,
      totalQty: [...rows.values()].reduce((total, row) => total + row.totalQty, 0)
    };
  }

  window.SchoolRecipeAttendanceService = {
    mealTypes,
    get,
    save,
    remove,
    status,
    validate,
    calculate
  };
})();
