(function () {
  const customers = [
    { code: 'YF001', name: '宜丰县十一中', canteen: '第一食堂', sorted: 0, total: 5, route: 'east' },
    { code: 'YF002', name: '宜丰一中', canteen: '第一食堂', sorted: 2, total: 5, route: 'east' },
    { code: 'YF003', name: '宜丰三中', canteen: '第一食堂', sorted: 5, total: 5, route: 'east' },
    { code: 'YF004', name: '宜丰第一实验小学', canteen: '第一食堂', sorted: 5, total: 5, route: 'east' },
    { code: 'YF005', name: '宜丰特教', canteen: '第一食堂', sorted: 5, total: 5, route: 'east' },
    { code: 'YF006', name: '宜丰五小', canteen: '第一食堂', sorted: 5, total: 5, route: 'east' },
    { code: 'YF007', name: '宜丰四中', canteen: '第一食堂', sorted: 5, total: 5, route: 'east' },
    { code: 'YF008', name: '宜丰五中', canteen: '第一食堂', sorted: 5, total: 5, route: 'east' },
    { code: 'YF009', name: '宜丰三中', canteen: '第一食堂', sorted: 5, total: 5, route: 'west' },
    { code: 'YF010', name: '宜丰第二实验小学', canteen: '第一食堂', sorted: 5, total: 5, route: 'west' },
    { code: 'YF011', name: '宜丰一幼', canteen: '第一食堂', sorted: 5, total: 5, route: 'west' },
    { code: 'YF012', name: '宜丰二幼', canteen: '第一食堂', sorted: 0, total: 5, route: 'west' },
    { code: 'YF013', name: '宜丰九中', canteen: '第一食堂', sorted: 2, total: 5, route: 'west' }
  ];

  const keywordInput = document.getElementById('sortingTerminalCustomerKeyword');
  const routeInput = document.getElementById('sortingTerminalCustomerRoute');
  const grid = document.getElementById('sortingTerminalCustomerGrid');
  const feedback = document.getElementById('sortingTerminalCustomerFeedback');
  let selectedCode = '';

  function currentSorted(customer) {
    try {
      const saved = JSON.parse(localStorage.getItem(`sorting-terminal-customer:v1:${customer.code}`));
      if (Array.isArray(saved?.doneIds)) {
        const done = new Set(saved.doneIds.filter((id) => Number.isInteger(id) && id >= 0 && id < 13)).size;
        return done === 0 ? 0 : done === 13 ? customer.total
          : Math.min(customer.total - 1, Math.max(1, Math.ceil(done / 13 * customer.total)));
      }
    } catch (_) { /* Use the sample progress when storage is unavailable. */ }
    return customer.sorted;
  }

  function render() {
    const keyword = keywordInput.value.trim().toLocaleLowerCase('zh-CN');
    const route = routeInput.value;
    const visible = customers.filter((customer) =>
      (route === 'all' || customer.route === route)
      && (!keyword || `${customer.name} ${customer.code}`.toLocaleLowerCase('zh-CN').includes(keyword))
    );

    grid.replaceChildren();
    if (!visible.length) {
      const empty = document.createElement('p');
      empty.className = 'sorting-terminal-customer-empty';
      empty.textContent = '暂无匹配的客户';
      grid.append(empty);
      return;
    }

    visible.forEach((customer) => {
      const sorted = currentSorted(customer);
      const state = sorted === 0 ? 'unsorted' : sorted < customer.total ? 'partial' : 'complete';
      const label = state === 'unsorted' ? '未分拣' : state === 'partial' ? '部分分拣' : '已分拣';
      const card = document.createElement('button');
      card.type = 'button';
      card.className = `sorting-terminal-customer-card is-${state}${selectedCode === customer.code ? ' is-selected' : ''}`;
      card.dataset.code = customer.code;
      card.setAttribute('aria-pressed', String(selectedCode === customer.code));
      card.setAttribute('aria-label', `${customer.name}${customer.canteen}，${label}，分拣进度${sorted}/${customer.total}`);

      const top = document.createElement('span');
      top.className = 'sorting-terminal-customer-card-status';
      top.textContent = label;
      const middle = document.createElement('span');
      middle.className = 'sorting-terminal-customer-card-name';
      const name = document.createElement('span');
      name.textContent = customer.name;
      const canteen = document.createElement('span');
      canteen.textContent = customer.canteen;
      middle.append(name, canteen);
      const bottom = document.createElement('span');
      bottom.className = 'sorting-terminal-customer-card-progress';
      bottom.textContent = `分拣进度：${sorted}/${customer.total}`;
      card.append(top, middle, bottom);
      grid.append(card);
    });
  }

  document.getElementById('sortingTerminalCustomerFilters').addEventListener('submit', (event) => {
    event.preventDefault();
    render();
  });
  keywordInput.addEventListener('input', render);
  routeInput.addEventListener('change', render);
  grid.addEventListener('click', (event) => {
    const card = event.target.closest('[data-code]');
    if (!card) return;
    const customer = customers.find((item) => item.code === card.dataset.code);
    const detailUrl = new URL('./sorting-terminal-customer-item.html', window.location.href);
    detailUrl.searchParams.set('customer', customer.code);
    window.location.href = detailUrl.href;
  });

  render();
})();
