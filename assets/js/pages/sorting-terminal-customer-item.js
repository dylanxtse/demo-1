(function () {
  const customers = [
    { code: 'YF001', name: '宜丰县十一中', canteen: '第一食堂', sorted: 0, total: 5 },
    { code: 'YF002', name: '宜丰一中', canteen: '第一食堂', sorted: 2, total: 5 },
    { code: 'YF003', name: '宜丰三中', canteen: '第一食堂', sorted: 5, total: 5 },
    { code: 'YF004', name: '宜丰第一实验小学', canteen: '第一食堂', sorted: 5, total: 5 },
    { code: 'YF005', name: '宜丰特教', canteen: '第一食堂', sorted: 5, total: 5 },
    { code: 'YF006', name: '宜丰五小', canteen: '第一食堂', sorted: 5, total: 5 },
    { code: 'YF007', name: '宜丰四中', canteen: '第一食堂', sorted: 5, total: 5 },
    { code: 'YF008', name: '宜丰五中', canteen: '第一食堂', sorted: 5, total: 5 },
    { code: 'YF009', name: '宜丰三中', canteen: '第一食堂', sorted: 5, total: 5 },
    { code: 'YF010', name: '宜丰第二实验小学', canteen: '第一食堂', sorted: 5, total: 5 },
    { code: 'YF011', name: '宜丰一幼', canteen: '第一食堂', sorted: 5, total: 5 },
    { code: 'YF012', name: '宜丰二幼', canteen: '第一食堂', sorted: 0, total: 5 },
    { code: 'YF013', name: '宜丰九中', canteen: '第一食堂', sorted: 2, total: 5 }
  ];
  const products = [
    ['茄子', 'SP000004'], ['菠菜', 'SP000002'], ['芹菜', 'SP000005'], ['大葱', 'SP000010'], ['豆腐', 'SP000021'],
    ['芹菜', 'SP000005'], ['蒜薹', 'SP000014'], ['蒜苗', 'SP000016'], ['空心菜', 'SP000011'], ['白菜', 'SP000018'],
    ['娃娃菜', 'SP000019'], ['生菜', 'SP000020'], ['蒿子杆', 'SP000022']
  ];
  const selectedCode = new URLSearchParams(window.location.search).get('customer');
  const selected = customers.find((customer) => customer.code === selectedCode) || customers[0];
  const storageKey = `sorting-terminal-customer:v1:${selected.code}`;
  const sidebar = document.getElementById('sortingTerminalCustomerItemSidebar');
  const grid = document.getElementById('sortingTerminalCustomerItemGrid');
  const empty = document.getElementById('sortingTerminalCustomerItemEmpty');
  const keywordInput = document.getElementById('sortingTerminalCustomerItemKeyword');
  const filterButton = document.getElementById('sortingTerminalCustomerItemFilterButton');
  const filterMenu = document.getElementById('sortingTerminalCustomerItemFilterMenu');
  const dialog = document.getElementById('sortingTerminalItemDialog');
  const dialogTitle = document.getElementById('sortingTerminalItemDialogTitle');
  const dialogAmount = document.getElementById('sortingTerminalItemDialogAmount');
  const dialogRemark = document.getElementById('sortingTerminalItemDialogRemark');
  const dialogMeasured = document.getElementById('sortingTerminalItemDialogMeasured');
  const dialogUnit = document.getElementById('sortingTerminalItemDialogUnit');
  const dialogDone = document.getElementById('sortingTerminalItemDialogDone');
  const dialogPending = document.getElementById('sortingTerminalItemDialogPending');
  const dialogGross = document.getElementById('sortingTerminalItemDialogGross');
  const dialogTare = document.getElementById('sortingTerminalItemDialogTare');
  const dialogNet = document.getElementById('sortingTerminalItemDialogNet');
  const dialogQuantity = document.getElementById('sortingTerminalItemDialogQuantity');
  const dialogWarning = document.getElementById('sortingTerminalItemDialogWarning');
  const dialogPackageCount = document.getElementById('sortingTerminalItemDialogPackageCount');
  const dialogPackageRemainder = document.getElementById('sortingTerminalItemDialogPackageRemainder');
  const dialogPackageQuantity = document.getElementById('sortingTerminalItemDialogPackageQuantity');
  document.getElementById('sortingTerminalCustomerItemSelected').textContent = `${selected.name}${selected.canteen}`;

  function savedDoneIds(customer) {
    try {
      const saved = JSON.parse(localStorage.getItem(`sorting-terminal-customer:v1:${customer.code}`));
      if (Array.isArray(saved?.doneIds)) {
        return new Set(saved.doneIds.filter((id) => Number.isInteger(id) && id >= 0 && id < products.length));
      }
    } catch (_) { /* Use the sample status when storage is unavailable. */ }
    return null;
  }

  function initialDoneIds(customer) {
    const saved = savedDoneIds(customer);
    if (saved) return saved;
    const count = customer.sorted === 0 ? 0 : customer.sorted === customer.total ? products.length
      : Math.min(products.length - 1, Math.max(1, Math.round(products.length * customer.sorted / customer.total)));
    return new Set([0, 2, 3, 4, 7, 8, 9, 1, 5, 6, 10, 11, 12].slice(0, count));
  }

  const doneIds = initialDoneIds(selected);
  let savedState = null;
  try { savedState = JSON.parse(localStorage.getItem(storageKey)); } catch (_) { /* Use sample values. */ }
  const shortageIds = new Set(Array.isArray(savedState?.shortageIds) ? savedState.shortageIds : []);
  const tasks = products.map(([name, code], index) => ({
    id: index,
    name,
    code,
    amount: 35,
    measured: Number.isFinite(Number(savedState?.measuredById?.[index])) && savedState?.measuredById?.[index] !== undefined
      ? Number(savedState.measuredById[index]) : doneIds.has(index) && index !== 2 ? 35 : 0,
    done: doneIds.has(index),
    shortage: savedState ? shortageIds.has(index) : index === 2 && doneIds.has(index)
  }));
  let filter = 'all';
  let activeTask = null;
  let grossWeight = 0;
  let accumulatedWeight = 0;

  function progress(customer) {
    const saved = savedDoneIds(customer);
    if (!saved) return customer.sorted;
    const count = saved.size;
    return count === 0 ? 0 : count === products.length ? customer.total
      : Math.min(customer.total - 1, Math.max(1, Math.ceil(count / products.length * customer.total)));
  }

  function renderSidebar() {
    sidebar.replaceChildren(...customers.map((customer) => {
      const sorted = progress(customer);
      const state = sorted === 0 ? 'pending' : sorted >= customer.total ? 'done' : 'partial';
      const label = state === 'pending' ? '未分拣' : state === 'done' ? '已分拣' : '部分分拣';
      const link = document.createElement('a');
      link.className = `sorting-terminal-customer-item-sidebar-link is-${state}${customer.code === selected.code ? ' is-active' : ''}`;
      link.href = `./sorting-terminal-customer-item.html?customer=${encodeURIComponent(customer.code)}`;
      if (customer.code === selected.code) link.setAttribute('aria-current', 'page');
      const name = document.createElement('span');
      name.className = 'sorting-terminal-customer-item-sidebar-name';
      name.textContent = `${customer.name}${customer.canteen}`;
      const badge = document.createElement('span');
      badge.className = 'sorting-terminal-customer-item-sidebar-status';
      badge.textContent = label;
      link.append(name, badge);
      return link;
    }));
  }

  function saveProgress() {
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        doneIds: tasks.filter((task) => task.done).map((task) => task.id),
        shortageIds: tasks.filter((task) => task.shortage).map((task) => task.id),
        measuredById: Object.fromEntries(tasks.filter((task) => task.measured).map((task) => [task.id, task.measured]))
      }));
    } catch (_) { /* The current page still reflects the changes. */ }
    renderSidebar();
  }

  function updatePackageBreakdown() {
    const quantity = Number(dialogQuantity.value);
    const validQuantity = dialogQuantity.value !== '' && Number.isFinite(quantity) && quantity >= 0;
    const breakdown = window.SortingPackageBreakdown?.calculate(
      { goodsCode: activeTask?.code }, validQuantity ? quantity : 0
    );
    const packageUnit = breakdown?.packageUnit || '';
    dialogPackageCount.textContent = validQuantity && breakdown
      ? `${breakdown.packageCount}${packageUnit ? ` ${packageUnit}` : ''}` : '--';
    dialogPackageRemainder.textContent = validQuantity && breakdown
      ? `${breakdown.packageRemainder} 斤` : '--';
    dialogPackageQuantity.textContent = breakdown
      ? `${breakdown.packageCoefficient} 斤${packageUnit ? `/${packageUnit}` : ''}` : '--';
  }

  function updateQuantityWarning() {
    if (!activeTask || activeTask.done) return;
    updatePackageBreakdown();
    const quantity = Number(dialogQuantity.value);
    dialogWarning.textContent = !dialogQuantity.value || !Number.isFinite(quantity) || quantity <= 0
      ? '' : quantity > activeTask.amount * 1.1
        ? '您设置的数量高于阈值' : quantity < activeTask.amount * 0.9
          ? '您设置的数量低于阈值' : '';
  }

  function setPendingWeights(gross, accumulated = 0) {
    grossWeight = gross;
    accumulatedWeight = accumulated;
    dialogGross.textContent = String(gross);
    dialogTare.value = '0';
    dialogNet.value = String(gross);
    dialogQuantity.value = String(accumulated + gross);
    updateQuantityWarning();
  }

  function updateWeightInput(input) {
    input.value = input.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
    if (input === dialogTare) {
      dialogNet.value = String(Math.max(0, grossWeight - (Number(input.value) || 0)));
      dialogQuantity.value = String(accumulatedWeight + Number(dialogNet.value));
    } else if (input === dialogNet) {
      dialogQuantity.value = String(accumulatedWeight + (Number(input.value) || 0));
    }
    updateQuantityWarning();
  }

  function openTaskDialog(task) {
    activeTask = task;
    dialogTitle.textContent = `${task.name} 【${selected.name}（${selected.canteen}）】`;
    dialogAmount.textContent = `${task.amount} 斤`;
    dialogRemark.textContent = task.name === '菠菜' ? '去根配送' : '无';
    dialogMeasured.textContent = String(task.measured);
    dialogUnit.textContent = '斤';
    dialog.classList.toggle('is-pending', !task.done);
    dialogDone.hidden = !task.done;
    dialogPending.hidden = task.done;
    if (!task.done) {
      setPendingWeights(task.measured || task.amount);
    }
    dialog.showModal();
  }

  function taskCard(task) {
    const card = document.createElement('article');
    card.className = `sorting-terminal-customer-item-card${task.done ? ' is-done' : ''}`;
    card.dataset.id = String(task.id);
    const body = document.createElement('div');
    body.className = 'sorting-terminal-customer-item-card-body';
    const name = document.createElement('div');
    name.className = 'sorting-terminal-customer-item-card-name';
    name.textContent = task.name;
    const amount = document.createElement('div');
    amount.className = 'sorting-terminal-customer-item-card-amount';
    amount.textContent = `${task.amount}斤`;
    const measured = document.createElement('div');
    measured.className = 'sorting-terminal-customer-item-card-measured';
    measured.textContent = `称重：${task.measured} 斤`;
    body.append(name, amount, measured);
    if (task.shortage) {
      const badge = document.createElement('span');
      badge.className = 'sorting-terminal-customer-item-shortage';
      badge.textContent = '缺货';
      body.append(badge);
    }
    const actions = document.createElement('div');
    actions.className = 'sorting-terminal-customer-item-card-actions';
    const sortButton = document.createElement('button');
    sortButton.type = 'button';
    sortButton.dataset.action = 'sort';
    sortButton.textContent = '分拣';
    sortButton.setAttribute('aria-label', `分拣${task.name}`);
    const printButton = document.createElement('button');
    printButton.type = 'button';
    printButton.dataset.action = 'print';
    printButton.textContent = '打印';
    printButton.disabled = !task.done;
    printButton.setAttribute('aria-label', `打印${task.name}的分拣单`);
    actions.append(sortButton, printButton);
    card.append(body, actions);
    return card;
  }

  function render() {
    const keyword = keywordInput.value.trim().toLocaleLowerCase('zh-CN');
    const visible = tasks.filter((task) => {
      const matchesFilter = filter === 'all' || (filter === 'done' && task.done)
        || (filter === 'pending' && !task.done) || (filter === 'shortage' && task.shortage);
      const matchesKeyword = !keyword || `${task.name}${task.code}`.toLocaleLowerCase('zh-CN').includes(keyword);
      return matchesFilter && matchesKeyword;
    }).sort((a, b) => Number(a.done) - Number(b.done) || a.id - b.id);
    grid.replaceChildren(...visible.map(taskCard));
    empty.hidden = visible.length > 0;
  }

  document.getElementById('sortingTerminalCustomerItemSearch').addEventListener('submit', (event) => {
    event.preventDefault();
    render();
  });
  keywordInput.addEventListener('input', render);
  filterButton.addEventListener('click', () => {
    const open = filterMenu.hidden;
    filterMenu.hidden = !open;
    filterButton.setAttribute('aria-expanded', String(open));
  });
  filterMenu.addEventListener('click', (event) => {
    const option = event.target.closest('[data-filter]');
    if (!option) return;
    filter = option.dataset.filter;
    filterMenu.querySelectorAll('[data-filter]').forEach((button) => button.setAttribute('aria-pressed', String(button === option)));
    filterMenu.hidden = true;
    filterButton.setAttribute('aria-expanded', 'false');
    render();
  });
  document.getElementById('sortingTerminalCustomerItemSortAll').addEventListener('click', () => {
    let count = 0;
    tasks.forEach((task) => {
      if (task.done || task.shortage) return;
      task.done = true;
      task.measured = task.amount;
      count += 1;
    });
    if (count) saveProgress();
    render();
  });
  document.getElementById('sortingTerminalCustomerItemPrintAll').addEventListener('click', () => {
    if (!tasks.some((task) => task.done)) return;
    window.print();
  });
  document.getElementById('sortingTerminalItemDialogClose').addEventListener('click', () => dialog.close());
  document.getElementById('sortingTerminalItemDialogReset').addEventListener('click', () => {
    if (!activeTask) return;
    const task = activeTask;
    task.done = false;
    task.measured = 0;
    task.shortage = false;
    saveProgress();
    render();
    dialog.close();
  });
  document.getElementById('sortingTerminalItemDialogPendingReset').addEventListener('click', () => {
    if (!activeTask) return;
    activeTask.shortage = false;
    setPendingWeights(activeTask.amount);
    saveProgress();
    render();
  });
  document.getElementById('sortingTerminalItemDialogZeroScale').addEventListener('click', () => {
    setPendingWeights(0, accumulatedWeight);
  });
  document.getElementById('sortingTerminalItemDialogTareScale').addEventListener('click', () => {
    dialogTare.value = String(grossWeight);
    updateWeightInput(dialogTare);
  });
  document.getElementById('sortingTerminalItemDialogPrintLabel').addEventListener('click', () => {
    if (!activeTask) return;
    const packageQuantity = Number(dialogNet.value);
    if (!dialogNet.value || !Number.isFinite(packageQuantity) || packageQuantity <= 0) {
      dialogWarning.textContent = '请先输入大于 0 的本包净重';
      return;
    }
    const task = activeTask;
    const payload = {
      version: '20261019-sorting-label-print-1',
      mode: 'customer',
      source: 'sorting-terminal-customer-item',
      customerCode: selected.code,
      returnDialog: {
        taskId: task.id,
        gross: grossWeight,
        accumulated: accumulatedWeight,
        tare: dialogTare.value,
        net: dialogNet.value,
        quantity: dialogQuantity.value
      },
      printedAt: new Date().toISOString(),
      rows: [{
        id: `SORT-TERMINAL-${selected.code}-${task.id}`,
        goodsCode: task.code,
        goodsName: task.name,
        customerName: selected.name,
        canteen: selected.canteen,
        unit: '斤',
        orderQty: task.amount,
        packageLabelQuantity: packageQuantity
      }]
    };
    window.location.href = `./sorting-label-print.html?printData=${encodeURIComponent(JSON.stringify(payload))}`;
  });
  document.getElementById('sortingTerminalItemDialogAccumulate').addEventListener('click', () => {
    const quantity = Number(dialogQuantity.value);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      dialogWarning.textContent = '请输入大于 0 的数量';
      return;
    }
    setPendingWeights(0, quantity);
  });
  document.getElementById('sortingTerminalItemDialogShortage').addEventListener('click', () => {
    if (!activeTask) return;
    const task = activeTask;
    task.done = false;
    task.measured = 0;
    task.shortage = true;
    saveProgress();
    render();
    dialog.close();
  });
  dialogPending.addEventListener('click', (event) => {
    const editButton = event.target.closest('[data-edit-target]');
    if (!editButton) return;
    const input = document.getElementById(editButton.dataset.editTarget);
    input.focus();
    input.select();
  });
  [dialogTare, dialogNet, dialogQuantity].forEach((input) => {
    input.addEventListener('input', () => updateWeightInput(input));
  });
  document.getElementById('sortingTerminalItemDialogConfirm').addEventListener('click', () => {
    if (!activeTask) return;
    const quantity = Number(dialogQuantity.value);
    if (!dialogQuantity.value || !Number.isFinite(quantity) || quantity <= 0) {
      dialogWarning.textContent = '请输入大于 0 的数量';
      return;
    }
    const task = activeTask;
    task.done = true;
    task.measured = quantity;
    task.shortage = false;
    saveProgress();
    render();
    dialog.close();
  });
  dialog.addEventListener('close', () => { activeTask = null; });
  grid.addEventListener('click', (event) => {
    const card = event.target.closest('[data-id]');
    if (!card) return;
    const task = tasks[Number(card.dataset.id)];
    const button = event.target.closest('[data-action]');
    if (button?.dataset.action === 'print') {
      document.body.dataset.printTask = String(task.id);
      card.classList.add('is-print-target');
      window.print();
      return;
    }
    if (task.done || button?.dataset.action === 'sort') openTaskDialog(task);
  });
  window.addEventListener('afterprint', () => {
    delete document.body.dataset.printTask;
    grid.querySelectorAll('.is-print-target').forEach((card) => card.classList.remove('is-print-target'));
  });
  renderSidebar();
  render();
  const returnDialogParam = new URLSearchParams(window.location.search).get('returnDialog');
  if (returnDialogParam) {
    try {
      const state = JSON.parse(returnDialogParam);
      const task = tasks.find((item) => item.id === state.taskId);
      if (task) {
        openTaskDialog(task);
        if (!task.done && Number.isFinite(state.gross) && state.gross >= 0
          && Number.isFinite(state.accumulated) && state.accumulated >= 0) {
          setPendingWeights(state.gross, state.accumulated);
          if (typeof state.tare === 'string') dialogTare.value = state.tare;
          if (typeof state.net === 'string') dialogNet.value = state.net;
          if (typeof state.quantity === 'string') dialogQuantity.value = state.quantity;
          updateQuantityWarning();
        }
      }
    } catch (_) { /* Ignore invalid return state. */ }
    try {
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('returnDialog');
      window.history.replaceState(null, '', cleanUrl.href);
    } catch (_) { /* Keeping the URL does not prevent returning to the dialog. */ }
  }
})();
