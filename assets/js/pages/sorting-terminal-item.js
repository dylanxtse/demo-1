(function () {
  const params = new URLSearchParams(window.location.search);
  const productName = params.get('name')?.trim() || '';
  const productCode = params.get('code')?.trim() || '';
  const unit = params.get('unit')?.trim() || '斤';
  const parsedStock = Number(params.get('stock'));
  const stock = Number.isFinite(parsedStock) && parsedStock >= 0 ? parsedStock : 0;
  const parsedTotal = Number(params.get('total'));
  const total = Number.isInteger(parsedTotal) && parsedTotal > 0 ? Math.min(parsedTotal, 20) : 5;
  const parsedSorted = Number(params.get('sorted'));
  const sorted = Number.isInteger(parsedSorted) ? Math.max(0, Math.min(parsedSorted, total)) : 0;
  const group = params.get('group');
  const taskId = params.get('task');
  const storageKey = taskId && /^[a-z-]+:\d+$/.test(taskId) ? `sorting-terminal-item:v1:${taskId}` : '';
  const back = document.getElementById('sortingTerminalItemBack');
  if (group) {
    const returnUrl = new URL('./sorting-terminal-product.html', window.location.href);
    returnUrl.searchParams.set('expand', group);
    back.href = returnUrl.href;
  }
  document.getElementById('sortingTerminalItemProduct').textContent = productName
    ? `${productCode ? `${productCode} ` : ''}${productName}（库存：${stock.toFixed(2)} ${unit}）`
    : '请选择商品后查看分拣任务';
  document.getElementById('sortingTerminalItemUnit').textContent = unit;

  const names = [
    '宜丰十一中', '宜丰一中', '宜丰一小', '宜丰二小', '宜丰十一中', '宜丰十二中',
    '宜丰八中', '宜丰九中', '宜丰一实验', '宜丰特教', '宜丰十六中', '宜丰三小',
    '宜丰十七中', '宜丰三幼', '宜丰一幼', '宜丰二幼', '宜丰七小', '宜丰七中',
    '宜丰职业学院', '宜丰八小', '宜丰五幼', '宜丰八十中', '宜丰西门小学', '宜丰中心校'
  ];
  const sortOrder = [0, 2, 3, 4, 5, 6, 8, 9, 10, 11, 1, 7, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
  const initialDoneCount = sorted === 0 ? 0 : sorted === total ? names.length
    : Math.min(names.length - 1, Math.max(1, Math.round(names.length * sorted / total)));
  let doneIds = new Set(sortOrder.slice(0, initialDoneCount));
  let savedProgress = null;
  if (storageKey) {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      if (Array.isArray(saved?.doneIds)) {
        doneIds = new Set(saved.doneIds.filter((id) => Number.isInteger(id) && id >= 0 && id < names.length));
        savedProgress = saved;
      }
    } catch (_) { /* Use the progress supplied by the product card. */ }
  }
  const tasks = productName ? names.map((name, index) => ({
    id: index,
    name,
    canteen: '第一食堂',
    amount: 35,
    measured: Number.isFinite(Number(savedProgress?.measuredById?.[index]))
      ? Number(savedProgress.measuredById[index]) : doneIds.has(index) && index !== 3 ? 35 : 0,
    done: doneIds.has(index),
    shortage: savedProgress ? (savedProgress.shortageIds || []).includes(index) : index === 3 && doneIds.has(index)
  })) : [];
  const grid = document.getElementById('sortingTerminalItemGrid');
  const empty = document.getElementById('sortingTerminalItemEmpty');
  const keywordInput = document.getElementById('sortingTerminalItemKeyword');
  const filterButton = document.getElementById('sortingTerminalItemFilterButton');
  const filterMenu = document.getElementById('sortingTerminalItemFilterMenu');
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
  let filter = 'all';
  let activeTask = null;
  let grossWeight = 0;
  let accumulatedWeight = 0;

  function saveProgress() {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        doneIds: tasks.filter((task) => task.done).map((task) => task.id),
        shortageIds: tasks.filter((task) => task.shortage).map((task) => task.id),
        measuredById: Object.fromEntries(tasks.filter((task) => task.measured).map((task) => [task.id, task.measured]))
      }));
    } catch (_) { /* The current page still reflects the changed tasks. */ }
  }

  function updatePackageBreakdown() {
    const quantity = Number(dialogQuantity.value);
    const validQuantity = dialogQuantity.value !== '' && Number.isFinite(quantity) && quantity >= 0;
    const breakdown = window.SortingPackageBreakdown?.calculate(
      { goodsCode: productCode }, validQuantity ? quantity : 0
    );
    const packageUnit = breakdown?.packageUnit || '';
    dialogPackageCount.textContent = validQuantity && breakdown
      ? `${breakdown.packageCount}${packageUnit ? ` ${packageUnit}` : ''}` : '--';
    dialogPackageRemainder.textContent = validQuantity && breakdown
      ? `${breakdown.packageRemainder} ${unit}` : '--';
    dialogPackageQuantity.textContent = breakdown
      ? `${breakdown.packageCoefficient} ${unit}${packageUnit ? `/${packageUnit}` : ''}` : '--';
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
    dialogTitle.textContent = `${productCode}${productName} 【${task.name}（${task.canteen}）】`;
    dialogAmount.textContent = `${task.amount} ${unit}`;
    dialogRemark.textContent = productName === '菠菜' ? '去根配送' : '无';
    dialogMeasured.textContent = String(task.measured);
    dialogUnit.textContent = unit;
    dialogPending.querySelectorAll('[data-weight-unit]').forEach((label) => { label.textContent = unit; });
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
    card.className = `sorting-terminal-item-card${task.done ? ' is-done' : ''}`;
    card.dataset.id = String(task.id);

    const body = document.createElement('div');
    body.className = 'sorting-terminal-item-card-body';
    const customer = document.createElement('div');
    customer.className = 'sorting-terminal-item-card-customer';
    customer.textContent = `${task.name}（${task.canteen}）`;
    const amount = document.createElement('div');
    amount.className = 'sorting-terminal-item-card-amount';
    amount.textContent = `${task.amount}${unit}`;
    const measured = document.createElement('div');
    measured.className = 'sorting-terminal-item-card-measured';
    measured.textContent = `称重：${task.measured} ${unit}`;
    body.append(customer, amount, measured);
    if (task.shortage) {
      const badge = document.createElement('span');
      badge.className = 'sorting-terminal-item-shortage';
      badge.textContent = '缺货';
      body.append(badge);
    }

    const actions = document.createElement('div');
    actions.className = 'sorting-terminal-item-card-actions';
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
      const matchesKeyword = !keyword || `${task.name}${task.canteen}`.toLocaleLowerCase('zh-CN').includes(keyword);
      return matchesFilter && matchesKeyword;
    }).sort((a, b) => {
      const progressRank = (task) => task.done ? 2 : task.measured > 0 ? 1 : 0;
      return progressRank(a) - progressRank(b) || a.id - b.id;
    });
    grid.replaceChildren(...visible.map(taskCard));
    empty.textContent = productName ? '暂无匹配的分拣任务' : '请返回商品列表选择商品';
    empty.hidden = visible.length > 0;
  }

  document.getElementById('sortingTerminalItemSearch').addEventListener('submit', (event) => {
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
    filterMenu.querySelectorAll('[data-filter]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button === option));
    });
    filterMenu.hidden = true;
    filterButton.setAttribute('aria-expanded', 'false');
    render();
  });
  document.getElementById('sortingTerminalItemSortAll').addEventListener('click', () => {
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
  document.getElementById('sortingTerminalItemPrintAll').addEventListener('click', () => {
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
      mode: 'product',
      source: 'sorting-terminal-item',
      returnSearch: window.location.search,
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
        id: `SORT-TERMINAL-PRODUCT-${productCode || taskId || 'ITEM'}-${task.id}`,
        goodsCode: productCode,
        goodsName: productName,
        customerName: task.name,
        canteen: task.canteen,
        unit,
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
      document.body.dataset.printCustomer = String(task.id);
      card.classList.add('is-print-target');
      window.print();
      return;
    }
    if (task.done) {
      openTaskDialog(task);
      return;
    }
    if (!button) return;
    openTaskDialog(task);
  });
  window.addEventListener('afterprint', () => {
    delete document.body.dataset.printCustomer;
    grid.querySelectorAll('.is-print-target').forEach((card) => card.classList.remove('is-print-target'));
  });
  render();
  const returnDialogParam = params.get('returnDialog');
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
