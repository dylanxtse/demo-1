(function () {
  const MENU_RESOURCE = 'recipeMenus';
  const META_RESOURCE = 'recipeSyncMeta';
  const MENU_VERSION = '2026 秋季营养菜谱第 12 版';
  const SOURCE_NAME = '营养膳食管理平台';
  const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
  const number = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const timestamp = () => window.BusinessRules?.now?.()
    || new Date().toISOString().slice(0, 19).replace('T', ' ');

  const ingredient = (name, productName, productCode, perCapitaQty, unit) => ({
    name,
    productName,
    productCode,
    perCapitaQty,
    unit,
    mappingStatus: '已关联'
  });

  const dish = (id, name, ingredients, note = '') => ({
    id,
    name,
    note,
    ingredients
  });

  const stableHash = (value) => Array.from(String(value)).reduce((hash, char) => ((hash * 31) + char.charCodeAt(0)) >>> 0, 7);
  const seededShuffle = (items, seed) => items
    .map((item, index) => ({ item, rank: stableHash(`${seed}-${index}`) }))
    .sort((a, b) => a.rank - b.rank)
    .map(({ item }) => item);

  function extraDishes(dateKey, mealKey) {
    const create = (suffix, name, ingredients) => dish(`DISH-${dateKey}-${mealKey.toUpperCase()}-EXTRA-${suffix}`, name, ingredients);
    const egg = () => ingredient('鸡蛋', '鸡蛋', 'SP0300018', 0.05, '斤');
    const milk = () => ingredient('牛奶', '牛奶', 'SP0300037', 0.25, '瓶');
    const rice = () => ingredient('大米', '大米', 'SP0300025', 0.12, 'KG');
    const oil = () => ingredient('食用油', '金龙鱼豆油', 'SP0300017', 0.01, '斤');
    const tomato = () => ingredient('西红柿', '西红柿', 'SP0300020', 0.08, 'KG');
    const cabbage = () => ingredient('大白菜', '大白菜', 'SP0300019', 0.08, '斤');
    const potato = () => ingredient('土豆', '土豆', 'SP0300040', 0.10, '斤');
    const chicken = () => ingredient('鸡腿肉', '鸡腿肉', 'SP0300013', 0.08, '斤');
    const flour = () => ingredient('面粉', '面粉', 'SP0300016', 0.08, '斤');
    const corn = () => ingredient('大玉米棒子', '大玉米棒子', 'SP0300036', 0.20, 'KG');
    const apple = () => ingredient('苹果', '苹果', 'SP0300014', 0.10, '斤');
    const banana = () => ingredient('香蕉', '香蕉', 'SP0300015', 0.10, '斤');
    const menus = {
      breakfast: [
        create('01', '水煮蛋', [egg()]),
        create('02', '时令水果', [apple()]),
        create('03', '玉米', [corn()]),
        create('04', '豆沙包', [flour()]),
        create('05', '清炒小菜', [cabbage(), oil()]),
        create('06', '牛奶', [milk()]),
        create('07', '鸡蛋饼', [flour(), egg()]),
        create('08', '小米粥', [rice()]),
        create('09', '菜包', [flour(), cabbage()]),
        create('10', '馒头', [flour()]),
        create('11', '燕麦牛奶', [milk(), flour()]),
        create('12', '茶叶蛋', [egg()]),
        create('13', '蒸红薯', [potato()]),
        create('14', '香蕉', [banana()]),
        create('15', '肉松面包', [flour(), chicken()])
      ],
      lunch: [
        create('01', '清炒时蔬', [cabbage(), oil()]),
        create('02', '番茄蛋花汤', [tomato(), egg()]),
        create('03', '凉拌土豆', [potato(), oil()]),
        create('04', '时令水果', [apple()]),
        create('05', '玉米', [corn()]),
        create('06', '面饼', [flour()]),
        create('07', '青椒鸡丁', [chicken(), oil()]),
        create('08', '土豆炖鸡', [potato(), chicken()]),
        create('09', '清炒大白菜', [cabbage(), oil()]),
        create('10', '西红柿鸡蛋', [tomato(), egg(), oil()]),
        create('11', '白菜肉丝', [cabbage(), chicken()]),
        create('12', '米饭', [rice()]),
        create('13', '玉米饼', [corn(), flour()]),
        create('14', '鸡蛋饼', [flour(), egg()]),
        create('15', '香蕉', [banana()])
      ],
      dinner: [
        create('01', '米饭', [rice()]),
        create('02', '番茄蛋花汤', [tomato(), egg()]),
        create('03', '清炒时蔬', [cabbage(), oil()]),
        create('04', '时令水果', [apple()]),
        create('05', '土豆炖鸡', [potato(), chicken()]),
        create('06', '玉米', [corn()]),
        create('07', '青椒鸡丁', [chicken(), oil()]),
        create('08', '清炒大白菜', [cabbage(), oil()]),
        create('09', '西红柿鸡蛋', [tomato(), egg(), oil()]),
        create('10', '白菜肉丝', [cabbage(), chicken()]),
        create('11', '面饼', [flour()]),
        create('12', '玉米饼', [corn(), flour()]),
        create('13', '鸡蛋饼', [flour(), egg()]),
        create('14', '香蕉', [banana()]),
        create('15', '土豆丝', [potato(), oil()])
      ],
      snack: [
        create('01', '牛奶', [milk()]),
        create('02', '时令水果', [apple()]),
        create('03', '玉米', [corn()]),
        create('04', '面包', [flour()]),
        create('05', '水煮蛋', [egg()]),
        create('06', '鸡蛋饼', [flour(), egg()]),
        create('07', '豆沙包', [flour()]),
        create('08', '香蕉', [banana()]),
        create('09', '苹果', [apple()]),
        create('10', '小菜', [cabbage(), oil()]),
        create('11', '玉米饼', [corn(), flour()]),
        create('12', '燕麦牛奶', [milk(), flour()]),
        create('13', '茶叶蛋', [egg()]),
        create('14', '馒头', [flour()]),
        create('15', '时令面包', [flour()])
      ]
    };
    return menus[mealKey] || [];
  }

  function expandSeedMenus(menus) {
    return menus.map((menu) => {
      const dateKey = String(menu.date).replace(/-/g, '');
      return {
        ...menu,
        meals: (menu.meals || []).map((meal) => {
          const currentDishes = meal.dishes || [];
          const existingNames = new Set(currentDishes.map((item) => item.name));
          const targetCount = 6 + (stableHash(`${dateKey}-${meal.key}`) % 10);
          const additions = seededShuffle(extraDishes(dateKey, meal.key), `${dateKey}-${meal.key}`)
            .filter((item) => !existingNames.has(item.name))
            .slice(0, Math.max(0, targetCount - currentDishes.length));
          return { ...meal, dishes: [...currentDishes, ...additions] };
        })
      };
    });
  }

  function buildSeedMenus() {
    return expandSeedMenus([
      {
        id: 'RECIPE-MENU-20260907',
        date: '2026-09-07',
        status: 'PUBLISHED',
        version: MENU_VERSION,
        publishedAt: '2026-09-03 08:20:00',
        meals: [
          {
            key: 'breakfast', name: '早餐',
            dishes: [dish('DISH-20260907-01', '鲜奶面包', [
              ingredient('牛奶', '牛奶', 'SP0300037', 0.25, '瓶'),
              ingredient('面粉', '面粉', 'SP0300016', 0.08, '斤')
            ])]
          },
          {
            key: 'lunch', name: '午餐',
            dishes: [
              dish('DISH-20260907-02', '番茄炒蛋', [
                ingredient('西红柿', '西红柿', 'SP0300020', 0.08, 'KG'),
                ingredient('鸡蛋', '鸡蛋', 'SP0300018', 0.05, '斤'),
                ingredient('食用油', '金龙鱼豆油', 'SP0300017', 0.01, '斤')
              ]),
              dish('DISH-20260907-03', '米饭', [
                ingredient('大米', '大米', 'SP0300025', 0.12, 'KG')
              ])
            ]
          },
          {
            key: 'dinner', name: '晚餐',
            dishes: [
              dish('DISH-20260907-04', '土豆炖鸡', [
                ingredient('土豆', '土豆', 'SP0300040', 0.12, '斤'),
                ingredient('鸡腿肉', '鸡腿肉', 'SP0300013', 0.10, '斤')
              ]),
              dish('DISH-20260907-05', '清炒大白菜', [
                ingredient('大白菜', '大白菜', 'SP0300019', 0.08, '斤'),
                ingredient('食用油', '金龙鱼豆油', 'SP0300017', 0.01, '斤')
              ])
            ]
          }
        ]
      },
      {
        id: 'RECIPE-MENU-20260908',
        date: '2026-09-08',
        status: 'PUBLISHED',
        version: MENU_VERSION,
        publishedAt: '2026-09-03 08:20:00',
        meals: [
          {
            key: 'breakfast', name: '早餐',
            dishes: [dish('DISH-20260908-01', '牛奶鸡蛋', [
              ingredient('牛奶', '牛奶', 'SP0300037', 0.25, '瓶'),
              ingredient('鸡蛋', '鸡蛋', 'SP0300018', 0.05, '斤')
            ])]
          },
          {
            key: 'lunch', name: '午餐',
            dishes: [
              dish('DISH-20260908-02', '土豆烧肉', [
                ingredient('土豆', '土豆', 'SP0300040', 0.15, '斤'),
                ingredient('鸡腿肉', '鸡腿肉', 'SP0300013', 0.08, '斤')
              ]),
              dish('DISH-20260908-03', '米饭', [
                ingredient('大米', '大米', 'SP0300025', 0.12, 'KG')
              ])
            ]
          },
          {
            key: 'snack', name: '加餐',
            dishes: [dish('DISH-20260908-04', '时令苹果', [
              ingredient('苹果', '苹果', 'SP0300014', 0.10, '斤')
            ])]
          }
        ]
      },
      {
        id: 'RECIPE-MENU-20260909',
        date: '2026-09-09',
        status: 'PUBLISHED',
        version: MENU_VERSION,
        publishedAt: '2026-09-03 08:20:00',
        meals: [
          {
            key: 'breakfast', name: '早餐',
            dishes: [dish('DISH-20260909-01', '玉米牛奶', [
              ingredient('大玉米棒子', '大玉米棒子', 'SP0300036', 0.20, 'KG'),
              ingredient('牛奶', '牛奶', 'SP0300037', 0.25, '瓶')
            ])]
          },
          {
            key: 'lunch', name: '午餐',
            dishes: [
              dish('DISH-20260909-02', '白菜肉丝', [
                ingredient('大白菜', '大白菜', 'SP0300019', 0.10, '斤'),
                ingredient('鸡腿肉', '鸡腿肉', 'SP0300013', 0.08, '斤')
              ]),
              dish('DISH-20260909-03', '米饭', [
                ingredient('大米', '大米', 'SP0300025', 0.12, 'KG')
              ])
            ]
          },
          {
            key: 'dinner', name: '晚餐',
            dishes: [dish('DISH-20260909-04', '西红柿面', [
              ingredient('西红柿', '西红柿', 'SP0300020', 0.10, 'KG'),
              ingredient('面粉', '面粉', 'SP0300016', 0.08, '斤')
            ])]
          }
        ]
      },
      {
        id: 'RECIPE-MENU-20260910',
        date: '2026-09-10',
        status: 'PUBLISHED',
        version: MENU_VERSION,
        publishedAt: '2026-09-03 08:20:00',
        meals: [
          {
            key: 'breakfast', name: '早餐',
            dishes: [dish('DISH-20260910-01', '大饼牛奶', [
              ingredient('大饼', '大饼', 'SP0300023', 0.10, '斤'),
              ingredient('牛奶', '牛奶', 'SP0300037', 0.25, '瓶')
            ])]
          },
          {
            key: 'lunch', name: '午餐',
            dishes: [
              dish('DISH-20260910-02', '西红柿鸡蛋汤', [
                ingredient('西红柿', '西红柿', 'SP0300020', 0.08, 'KG'),
                ingredient('鸡蛋', '鸡蛋', 'SP0300018', 0.04, '斤')
              ]),
              dish('DISH-20260910-03', '大米饭', [
                ingredient('大米', '大米', 'SP0300025', 0.12, 'KG')
              ])
            ]
          }
        ]
      },
      {
        id: 'RECIPE-MENU-20260911',
        date: '2026-09-11',
        status: 'PUBLISHED',
        version: MENU_VERSION,
        publishedAt: '2026-09-03 08:20:00',
        meals: [
          {
            key: 'breakfast', name: '早餐',
            dishes: [dish('DISH-20260911-01', '苹果牛奶', [
              ingredient('苹果', '苹果', 'SP0300014', 0.10, '斤'),
              ingredient('牛奶', '牛奶', 'SP0300037', 0.25, '瓶')
            ])]
          },
          {
            key: 'lunch', name: '午餐',
            dishes: [
              dish('DISH-20260911-02', '鸡腿肉烧土豆', [
                ingredient('鸡腿肉', '鸡腿肉', 'SP0300013', 0.10, '斤'),
                ingredient('土豆', '土豆', 'SP0300040', 0.12, '斤')
              ]),
              dish('DISH-20260911-03', '清炒白菜', [
                ingredient('大白菜', '大白菜', 'SP0300019', 0.08, '斤'),
                ingredient('食用油', '金龙鱼豆油', 'SP0300017', 0.01, '斤')
              ]),
              dish('DISH-20260911-04', '米饭', [
                ingredient('大米', '大米', 'SP0300025', 0.12, 'KG')
              ])
            ]
          }
        ]
      },
      {
        id: 'RECIPE-MENU-20260912',
        date: '2026-09-12',
        status: 'PUBLISHED',
        version: MENU_VERSION,
        publishedAt: '2026-09-03 08:20:00',
        meals: [
          {
            key: 'breakfast', name: '早餐',
            dishes: [
              dish('DISH-20260912-01', '玉米牛奶', [
                ingredient('大玉米棒子', '大玉米棒子', 'SP0300036', 0.20, 'KG'),
                ingredient('牛奶', '牛奶', 'SP0300037', 0.25, '瓶')
              ]),
              dish('DISH-20260912-02', '茶叶蛋', [
                ingredient('鸡蛋', '鸡蛋', 'SP0300018', 0.05, '斤')
              ])
            ]
          },
          {
            key: 'lunch', name: '午餐',
            dishes: [
              dish('DISH-20260912-03', '青椒炒肉', [
                ingredient('青椒', '青椒', 'SP0300056', 0.06, '斤'),
                ingredient('鸡腿肉', '鸡腿肉', 'SP0300013', 0.08, '斤'),
                ingredient('食用油', '金龙鱼豆油', 'SP0300017', 0.01, '斤')
              ]),
              dish('DISH-20260912-04', '土豆丝', [
                ingredient('土豆', '土豆', 'SP0300040', 0.10, '斤'),
                ingredient('食用油', '金龙鱼豆油', 'SP0300017', 0.01, '斤')
              ]),
              dish('DISH-20260912-05', '米饭', [
                ingredient('大米', '大米', 'SP0300025', 0.12, 'KG')
              ])
            ]
          }
        ]
      },
      {
        id: 'RECIPE-MENU-20260914',
        date: '2026-09-14',
        status: 'PUBLISHED',
        version: MENU_VERSION,
        publishedAt: '2026-09-03 08:20:00',
        meals: [
          {
            key: 'breakfast', name: '早餐',
            dishes: [dish('DISH-20260914-01', '面包牛奶', [
              ingredient('面粉', '面粉', 'SP0300016', 0.08, '斤'),
              ingredient('牛奶', '牛奶', 'SP0300037', 0.25, '瓶')
            ])]
          },
          {
            key: 'lunch', name: '午餐',
            dishes: [
              dish('DISH-20260914-02', '土豆鸡块', [
                ingredient('土豆', '土豆', 'SP0300040', 0.12, '斤'),
                ingredient('鸡腿肉', '鸡腿肉', 'SP0300013', 0.10, '斤')
              ]),
              dish('DISH-20260914-03', '番茄炒蛋', [
                ingredient('西红柿', '西红柿', 'SP0300020', 0.08, 'KG'),
                ingredient('鸡蛋', '鸡蛋', 'SP0300018', 0.05, '斤'),
                ingredient('食用油', '金龙鱼豆油', 'SP0300017', 0.01, '斤')
              ]),
              dish('DISH-20260914-04', '米饭', [
                ingredient('大米', '大米', 'SP0300025', 0.12, 'KG')
              ])
            ]
          },
          {
            key: 'dinner', name: '晚餐',
            dishes: [dish('DISH-20260914-05', '大白菜炒肉', [
              ingredient('大白菜', '大白菜', 'SP0300019', 0.08, '斤'),
              ingredient('鸡腿肉', '鸡腿肉', 'SP0300013', 0.08, '斤'),
              ingredient('食用油', '金龙鱼豆油', 'SP0300017', 0.01, '斤')
            ])]
          }
        ]
      },
      {
        id: 'RECIPE-MENU-20260915',
        date: '2026-09-15',
        status: 'PUBLISHED',
        version: MENU_VERSION,
        publishedAt: '2026-09-03 08:20:00',
        meals: [
          {
            key: 'breakfast', name: '早餐',
            dishes: [
              dish('DISH-20260915-01', '鸡蛋饼', [
                ingredient('面粉', '面粉', 'SP0300016', 0.08, '斤'),
                ingredient('鸡蛋', '鸡蛋', 'SP0300018', 0.05, '斤')
              ]),
              dish('DISH-20260915-02', '苹果牛奶', [
                ingredient('苹果', '苹果', 'SP0300014', 0.10, '斤'),
                ingredient('牛奶', '牛奶', 'SP0300037', 0.25, '瓶')
              ])
            ]
          },
          {
            key: 'lunch', name: '午餐',
            dishes: [
              dish('DISH-20260915-03', '青椒鸡丁', [
                ingredient('青椒', '青椒', 'SP0300056', 0.06, '斤'),
                ingredient('鸡腿肉', '鸡腿肉', 'SP0300013', 0.10, '斤')
              ]),
              dish('DISH-20260915-04', '清炒白菜', [
                ingredient('大白菜', '大白菜', 'SP0300019', 0.08, '斤'),
                ingredient('食用油', '金龙鱼豆油', 'SP0300017', 0.01, '斤')
              ]),
              dish('DISH-20260915-05', '米饭', [
                ingredient('大米', '大米', 'SP0300025', 0.12, 'KG')
              ])
            ]
          }
        ]
      }
    ]);
  }

  function readMenus() {
    if (!window.DemoStore) return buildSeedMenus();
    const current = window.DemoStore.get(MENU_RESOURCE);
    const seed = buildSeedMenus();
    if (Array.isArray(current) && current.length) {
      const seedById = new Map(seed.map((menu) => [menu.id, menu]));
      let changed = false;
      const merged = current.map((menu) => {
        const seedMenu = seedById.get(menu?.id);
        if (!seedMenu) return menu;
        const currentMeals = new Map((menu.meals || []).map((meal) => [meal.key, meal]));
        const meals = seedMenu.meals.map((seedMeal) => {
          const currentMeal = currentMeals.get(seedMeal.key);
          if (!currentMeal) {
            changed = true;
            return seedMeal;
          }
          const currentDishIds = new Set((currentMeal.dishes || []).map((item) => item.id));
          const additions = seedMeal.dishes.filter((item) => !currentDishIds.has(item.id));
          if (additions.length) changed = true;
          return { ...currentMeal, dishes: [...(currentMeal.dishes || []), ...additions] };
        });
        return { ...menu, meals };
      });
      const currentIds = new Set(current.map((menu) => menu?.id));
      const additions = seed.filter((menu) => !currentIds.has(menu.id));
      if (additions.length) {
        changed = true;
        merged.push(...additions);
      }
      if (!changed) return current;
      merged.sort((a, b) => String(a.date).localeCompare(String(b.date)));
      window.DemoStore.replace(MENU_RESOURCE, merged);
      return merged;
    }
    window.DemoStore.replace(MENU_RESOURCE, seed);
    return seed;
  }

  function readMeta() {
    if (!window.DemoStore) {
      return { sourceName: SOURCE_NAME, version: MENU_VERSION, lastSyncAt: '2026-09-03 08:30:12', result: 'SUCCESS' };
    }
    const current = window.DemoStore.get(META_RESOURCE);
    if (Array.isArray(current) && current[0]) return current[0];
    const meta = {
      id: 'RECIPE-SYNC-META',
      sourceName: SOURCE_NAME,
      version: MENU_VERSION,
      lastSyncAt: '2026-09-03 08:30:12',
      syncedDays: readMenus().length,
      result: 'SUCCESS'
    };
    window.DemoStore.replace(META_RESOURCE, [meta]);
    return meta;
  }

  function getMeals(menus) {
    return (menus || []).flatMap((menu) => menu.meals || []);
  }

  function getDishes(menus) {
    return getMeals(menus).flatMap((meal) => meal.dishes || []);
  }

  function list(filters = {}) {
    const startDate = String(filters.startDate || '').trim();
    const endDate = String(filters.endDate || '').trim();
    const meal = String(filters.meal || '').trim();
    const keyword = String(filters.keyword || '').trim().toLocaleLowerCase();
    return readMenus().filter((menu) => {
      if (startDate && menu.date < startDate) return false;
      if (endDate && menu.date > endDate) return false;
      const meals = meal ? (menu.meals || []).filter((item) => item.key === meal) : (menu.meals || []);
      if (meal && !meals.length) return false;
      if (keyword) {
        const source = JSON.stringify(meals).toLocaleLowerCase();
        if (!source.includes(keyword) && !String(menu.date).includes(keyword)) return false;
      }
      return true;
    }).sort((a, b) => a.date.localeCompare(b.date));
  }

  function getMenu(idOrDate) {
    return clone(readMenus().find((menu) => menu.id === idOrDate || menu.date === idOrDate) || null);
  }

  function getDish(menuId, dishId) {
    const menu = getMenu(menuId);
    if (!menu) return null;
    for (const meal of menu.meals || []) {
      const found = (meal.dishes || []).find((item) => item.id === dishId);
      if (found) return { menu, meal, dish: found };
    }
    return null;
  }

  function stats(menus = readMenus()) {
    const dishes = getDishes(menus);
    const ingredients = dishes.flatMap((item) => item.ingredients || []);
    return {
      days: menus.length,
      meals: getMeals(menus).length,
      dishes: dishes.length,
      mapped: ingredients.filter((item) => item.productCode && item.mappingStatus === '已关联').length,
      unmapped: ingredients.filter((item) => !item.productCode || item.mappingStatus !== '已关联').length
    };
  }

  function sync() {
    const menus = readMenus();
    const meta = {
      ...readMeta(),
      sourceName: SOURCE_NAME,
      version: menus[0]?.version || MENU_VERSION,
      lastSyncAt: timestamp(),
      syncedDays: menus.length,
      result: 'SUCCESS'
    };
    window.DemoStore?.replace?.(META_RESOURCE, [meta]);
    return clone(meta);
  }

  window.SchoolRecipeService = {
    SOURCE_NAME,
    MENU_VERSION,
    mealTypes: [
      { key: 'breakfast', name: '早餐' },
      { key: 'lunch', name: '午餐' },
      { key: 'dinner', name: '晚餐' },
      { key: 'snack', name: '加餐' }
    ],
    getAll() { return clone(readMenus()); },
    getMeta() { return clone(readMeta()); },
    list,
    getMenu,
    getDish,
    stats,
    sync
  };
})();
