(function () {
  const categories = [
    { key: 'all', label: '全部' },
    { key: 'staple', label: '主食（米面粉点心）' },
    { key: 'oil', label: '食用油' },
    { key: 'produce', label: '果蔬' },
    { key: 'meat', label: '肉（豆）制品' },
    { key: 'seafood', label: '水产品' },
    { key: 'egg', label: '蛋奶类' },
    { key: 'seasoning', label: '调料' },
    { key: 'other', label: '其他材料' }
  ];
  const leafTasks = [
    ['菠菜', 0], ['水晶西瓜', 2], ['西蓝花', 5], ['茄子', 5], ['宽豆角', 5], ['线茄', 5], ['西葫芦', 0],
    ['芹菜', 0], ['西红柿', 0], ['西蓝花', 0], ['大葱', 5], ['生姜', 5], ['大蒜', 5], ['西葫芦', 0],
    ['丝瓜', 0, 'SP000002'], ['花生', 2, 'SP000006'], ['毛豆', 5, 'SP000001'],
    ['空心菜', 5, 'SP000011'], ['韭菜', 4, 'SP000015'], ['蒜薹', 0, 'SP000014'], ['西葫芦', 0, 'SP000010']
  ].map(([name, sorted, code]) => ({ name, code: code || '', unit: '斤', stock: 102, sorted, total: 5 }));
  const rootProducts = [
    ['土豆', 'SP0300040'], ['胡萝卜', 'SP0300053'], ['白萝卜', ''],
    ['红薯', ''], ['山药', ''], ['莲藕', ''], ['芋头', '']
  ];
  const rootTasks = leafTasks.map((sample, index) => ({
    ...sample,
    name: rootProducts[index % rootProducts.length][0],
    code: index >= 14 ? rootProducts[index % rootProducts.length][1] : ''
  }));
  const groups = [
    { key: 'root', label: '果蔬类-根茎类', category: 'produce', products: [['土豆', 'SP0300040'], ['胡萝卜', 'SP0300053']], tasks: rootTasks },
    { key: 'fruit', label: '果蔬类-水果类', category: 'produce', products: [['苹果', 'SP0300014'], ['香蕉', 'SP0300015']] },
    { key: 'pepper', label: '果蔬类-辣椒类', category: 'produce', products: [['青椒', 'SP0300056'], ['青椒丝', 'SP0300057']] },
    { key: 'staple', label: '主食（米面粉点心类）', category: 'staple', products: [['大米', 'SP0300025'], ['黑大米', 'SP0300034'], ['大饼', 'SP0300023']] },
    { key: 'plant-oil', label: '食用油-植物油', category: 'oil', products: [['金龙鱼5L桶装油', 'SP0300030'], ['金龙鱼豆油', 'SP0300017']] },
    { key: 'animal-oil', label: '食用油-动物油', category: 'oil', products: [] },
    { key: 'eggs', label: '蛋奶类-蛋类', category: 'egg', products: [['鸡蛋', 'SP0300018']] },
    { key: 'leaf', label: '果蔬类-叶菜类', category: 'produce', products: [], tasks: leafTasks },
    { key: 'milk', label: '蛋奶类-奶类', category: 'egg', products: [['牛奶', 'SP0300037'], ['三元牛奶', 'SP0300024']] },
    { key: 'fish', label: '水产品-鱼类', category: 'seafood', products: [['鲫鱼', 'SP0300029'], ['净膛鲫鱼', 'SP0300031']] },
    { key: 'shrimp', label: '水产品-虾类', category: 'seafood', products: [] },
    { key: 'seasoning', label: '调料类', category: 'seasoning', products: [] },
    { key: 'meat', label: '肉（豆）制品', category: 'meat', products: [['鸡腿肉', 'SP0300013']] },
    { key: 'other', label: '其他材料', category: 'other', products: [['面粉', 'SP0300016']] }
  ];
  const categoryRoot = document.getElementById('sortingTerminalProductCategories');
  const groupRoot = document.getElementById('sortingTerminalProductGroups');
  const keywordInput = document.getElementById('sortingTerminalProductKeyword');
  const expanded = new Set();
  const returnGroup = new URLSearchParams(window.location.search).get('expand');
  if (groups.some((group) => group.key === returnGroup)) expanded.add(returnGroup);
  let selectedCategory = 'all';

  function tasksFor(group) {
    if (group.tasks) return group.tasks;
    return group.products.map(([name, code], index) => ({
      name, code, unit: '斤', stock: 102, sorted: [0, 2, 5][index % 3], total: 5
    }));
  }

  function renderCategories() {
    categoryRoot.replaceChildren(...categories.map((category) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `sorting-terminal-product-category${selectedCategory === category.key ? ' is-active' : ''}`;
      button.dataset.category = category.key;
      button.textContent = category.label;
      button.setAttribute('aria-current', selectedCategory === category.key ? 'true' : 'false');
      return button;
    }));
  }

  function matches(group, keyword) {
    return !keyword || group.label.toLowerCase().includes(keyword) || tasksFor(group).some((task) =>
      task.name.toLowerCase().includes(keyword) || task.code.toLowerCase().includes(keyword)
    );
  }

  function taskCard(task, group, index) {
    const taskId = `${group.key}:${index}`;
    let completed = task.sorted;
    try {
      const saved = JSON.parse(localStorage.getItem(`sorting-terminal-item:v1:${taskId}`));
      if (Array.isArray(saved?.doneIds)) {
        const doneCount = new Set(saved.doneIds.filter((id) => Number.isInteger(id) && id >= 0 && id < 24)).size;
        completed = doneCount === 0 ? 0 : doneCount === 24 ? task.total
          : Math.min(task.total - 1, Math.max(1, Math.ceil(doneCount / 24 * task.total)));
      }
    } catch (_) { /* Keep the sample progress if storage is unavailable. */ }
    const state = completed === 0 ? 'pending' : completed >= task.total ? 'done' : 'partial';
    const stateLabel = state === 'pending' ? '未分拣' : state === 'done' ? '已分拣' : '部分分拣';
    const card = document.createElement('a');
    card.className = `sorting-terminal-product-task is-${state}`;
    card.setAttribute('aria-label', `${task.name}，${stateLabel}，分拣进度 ${completed}/${task.total}`);
    const productCode = task.code || group.products.find(([name]) => name === task.name)?.[1] || '';
    const detailUrl = new URL('./sorting-terminal-item.html', window.location.href);
    detailUrl.searchParams.set('name', task.name);
    detailUrl.searchParams.set('code', productCode);
    detailUrl.searchParams.set('stock', String(task.stock));
    detailUrl.searchParams.set('unit', task.unit);
    detailUrl.searchParams.set('sorted', String(completed));
    detailUrl.searchParams.set('total', String(task.total));
    detailUrl.searchParams.set('group', group.key);
    detailUrl.searchParams.set('task', taskId);
    card.href = detailUrl.href;
    const status = document.createElement('div');
    status.className = 'sorting-terminal-product-task-status';
    status.textContent = `${stateLabel}（库存：${task.stock}${task.unit}）`;
    const body = document.createElement('div');
    body.className = 'sorting-terminal-product-task-body';
    const name = document.createElement('div');
    name.textContent = `商品名称：${task.name}`;
    const detail = document.createElement('div');
    detail.textContent = task.code ? `商品编码：${task.code}` : `计量单位：${task.unit}`;
    body.append(name, detail);
    const progress = document.createElement('div');
    progress.className = 'sorting-terminal-product-task-progress';
    progress.textContent = `分拣进度：${completed}/${task.total}`;
    card.append(status, body, progress);
    return card;
  }

  function renderGroups() {
    const keyword = keywordInput.value.trim().toLowerCase();
    const visible = groups.filter((group) => (selectedCategory === 'all' || group.category === selectedCategory) && matches(group, keyword));
    groupRoot.replaceChildren();
    if (!visible.length) {
      const empty = document.createElement('p');
      empty.className = 'sorting-terminal-product-empty';
      empty.textContent = '暂无匹配的商品分类';
      groupRoot.append(empty);
      return;
    }

    visible.forEach((group) => {
      const section = document.createElement('section');
      section.className = 'sorting-terminal-product-group';
      const heading = document.createElement('div');
      heading.className = 'sorting-terminal-product-group-heading';
      const title = document.createElement('div');
      title.className = 'sorting-terminal-product-group-title';
      title.textContent = group.label;
      const action = document.createElement('div');
      action.className = 'sorting-terminal-product-group-action';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'sorting-terminal-product-expand';
      button.dataset.group = group.key;
      button.setAttribute('aria-expanded', String(expanded.has(group.key)));
      button.textContent = expanded.has(group.key) ? '−  收起' : '＋  展开';
      action.append(button);
      heading.append(title, action);
      const items = document.createElement('div');
      items.className = 'sorting-terminal-product-items';
      items.id = `sortingTerminalTasks-${group.key}`;
      items.hidden = !expanded.has(group.key);
      button.setAttribute('aria-controls', items.id);
      const groupTasks = tasksFor(group);
      groupTasks
        .filter((task) => !keyword || group.label.toLowerCase().includes(keyword)
          || task.name.toLowerCase().includes(keyword) || task.code.toLowerCase().includes(keyword))
        .forEach((task) => items.append(taskCard(task, group, groupTasks.indexOf(task))));
      if (!items.childElementCount) {
        const empty = document.createElement('div');
        empty.className = 'sorting-terminal-product-task-empty';
        empty.textContent = '暂无分拣任务';
        items.append(empty);
      }
      section.append(heading, items);
      groupRoot.append(section);
    });
  }

  categoryRoot.addEventListener('click', (event) => {
    const button = event.target.closest('[data-category]');
    if (!button) return;
    selectedCategory = button.dataset.category;
    groupRoot.scrollTop = 0;
    renderCategories();
    renderGroups();
  });
  groupRoot.addEventListener('click', (event) => {
    const button = event.target.closest('[data-group]');
    if (!button) return;
    const isExpanded = !expanded.has(button.dataset.group);
    if (isExpanded) expanded.add(button.dataset.group);
    else expanded.delete(button.dataset.group);
    button.setAttribute('aria-expanded', String(isExpanded));
    button.textContent = isExpanded ? '−  收起' : '＋  展开';
    document.getElementById(`sortingTerminalTasks-${button.dataset.group}`).hidden = !isExpanded;
  });
  keywordInput.addEventListener('input', renderGroups);
  document.getElementById('sortingTerminalProductSearch').addEventListener('submit', (event) => {
    event.preventDefault();
    renderGroups();
  });
  renderCategories();
  renderGroups();
})();
