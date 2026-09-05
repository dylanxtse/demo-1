(function () {
  const reviewerOptions = ['杨无缺', '小李', '杨', '杨志刚', '杨采', '管理员'];
  const defaults = {
    auditReviewers: {
      product: '杨无缺',
      salesAgreement: '小李',
      purchaseAgreement: '杨无缺',
      order: '杨',
      orderReturn: '杨',
      receiptChange: '杨',
      purchaseOrder: '小李',
      purchaseReturn: '杨志刚',
      inbound: '杨采',
      outbound: '杨采',
      inventoryCount: '杨采',
      processing: '杨采'
    }
  };

  const tabs = [
    {
      key: 'product',
      label: '商品审核',
      rows: [{ key: 'product', name: '商品审核', enabledKey: 'productAuditEnabled' }]
    },
    {
      key: 'price',
      label: '价格审核',
      rows: [
        { key: 'salesAgreement', name: '销售协议价审核', enabledKey: 'salesAgreementAuditEnabled' },
        { key: 'purchaseAgreement', name: '采购协议价审核', enabledKey: 'purchaseAgreementAuditEnabled' }
      ]
    },
    {
      key: 'order',
      label: '订单审核',
      rows: [
        { key: 'order', name: '订单审核', enabledKey: 'enterpriseOrderAuditEnabled' },
        { key: 'orderReturn', name: '订单退货审核', enabledKey: 'orderReturnAuditEnabled' },
        { key: 'receiptChange', name: '订单实收变更审核', enabledKey: 'receiptChangeAuditEnabled' }
      ]
    },
    {
      key: 'purchase',
      label: '采购审核',
      rows: [
        { key: 'purchaseOrder', name: '采购单审核', enabledKey: 'purchaseOrderAuditEnabled' },
        { key: 'purchaseReturn', name: '采购退货审核', enabledKey: 'purchaseReturnAuditEnabled' }
      ]
    },
    {
      key: 'warehouse',
      label: '仓库管理审核',
      rows: [
        { key: 'inbound', name: '入库管理审核', enabledKey: 'inboundAuditEnabled' },
        { key: 'outbound', name: '出库列表审核', enabledKey: 'outboundAuditEnabled' },
        { key: 'inventoryCount', name: '库存盘点审核', enabledKey: 'inventoryCountAuditEnabled' },
        { key: 'processing', name: '净菜加工审核', enabledKey: 'processingAuditEnabled' }
      ]
    }
  ];

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const getSettings = () => window.DemoStore?.getSettings?.() || {};
  const getReviewer = (key, settings = getSettings()) => (
    settings.auditReviewers?.[key] || defaults.auditReviewers[key] || reviewerOptions[0]
  );

  function reviewerOptionsMarkup(selected) {
    const values = reviewerOptions.includes(selected) ? reviewerOptions : [selected, ...reviewerOptions];
    return values.map((value) => `<option value="${escapeHtml(value)}"${value === selected ? ' selected' : ''}>${escapeHtml(value)}</option>`).join('');
  }

  function tableMarkup(tab, settings) {
    return `
      <table class="audit-config-table" aria-label="${escapeHtml(tab.label)}">
        <colgroup><col style="width:4%"><col style="width:32%"><col style="width:32%"><col style="width:32%"></colgroup>
        <thead><tr><th scope="col">序号</th><th scope="col">流程</th><th scope="col">是否需要审核</th><th scope="col">审核人</th></tr></thead>
        <tbody>
          ${tab.rows.map((row, index) => {
            const enabled = Boolean(settings[row.enabledKey]);
            const reviewer = getReviewer(row.key, settings);
            return `
              <tr data-audit-row="${escapeHtml(row.key)}">
                <td>${index + 1}</td>
                <td class="audit-flow-name">${escapeHtml(row.name)}</td>
                <td>
                  <label class="audit-switch" aria-label="${escapeHtml(row.name)}是否需要审核">
                    <input type="checkbox" data-audit-enabled="${escapeHtml(row.enabledKey)}"${enabled ? ' checked' : ''}>
                    <span class="audit-switch-track" aria-hidden="true"></span>
                  </label>
                </td>
                <td><select class="audit-reviewer-select" data-audit-reviewer="${escapeHtml(row.key)}" aria-label="${escapeHtml(row.name)}审核人"${enabled ? ' disabled' : ''}>${reviewerOptionsMarkup(reviewer)}</select></td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  const content = `
    <section class="page-card audit-config-page" aria-label="审核配置">
      <div class="audit-config-tabs" role="tablist" aria-label="审核配置分类">
        ${tabs.map((tab) => `<button class="audit-config-tab" type="button" role="tab" data-audit-tab="${tab.key}" aria-controls="auditConfigPanel">${tab.label}</button>`).join('')}
      </div>
      <div class="audit-config-panel" id="auditConfigPanel"></div>
      <div class="audit-config-toast" id="auditConfigToast" role="status" aria-live="polite" hidden>配置已保存</div>
    </section>
  `;

  const root = window.AppShell.mount({ title: '审核配置', content });
  let activeTabKey = tabs[0].key;

  function activeTab() { return tabs.find((tab) => tab.key === activeTabKey) || tabs[0]; }

  function showToast() {
    const toast = root.querySelector('#auditConfigToast');
    if (!toast) return;
    toast.hidden = false;
    window.clearTimeout(toast._hideTimer);
    toast._hideTimer = window.setTimeout(() => { toast.hidden = true; }, 1400);
  }

  function renderTab(key) {
    const nextTab = tabs.some((tab) => tab.key === key) ? key : tabs[0].key;
    activeTabKey = nextTab;
    root.querySelectorAll('[data-audit-tab]').forEach((button) => {
      const active = button.dataset.auditTab === activeTabKey;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
    });
    const panel = root.querySelector('#auditConfigPanel');
    if (panel) panel.innerHTML = tableMarkup(activeTab(), getSettings());
  }

  function persistRow(row, enabled, reviewer) {
    const settings = getSettings();
    const reviewers = {
      ...defaults.auditReviewers,
      ...(settings.auditReviewers || {}),
      [row.key]: reviewer
    };
    window.DemoStore.updateSettings({
      [row.enabledKey]: enabled,
      auditReviewers: reviewers
    });
    showToast();
  }

  root.addEventListener('click', (event) => {
    const tabButton = event.target.closest('[data-audit-tab]');
    if (!tabButton) return;
    renderTab(tabButton.dataset.auditTab);
  });

  root.addEventListener('change', (event) => {
    const toggle = event.target.closest('[data-audit-enabled]');
    if (toggle) {
      const row = activeTab().rows.find((item) => item.enabledKey === toggle.dataset.auditEnabled);
      if (!row) return;
      const reviewer = root.querySelector(`[data-audit-reviewer="${row.key}"]`);
      if (reviewer) reviewer.disabled = toggle.checked;
      persistRow(row, toggle.checked, reviewer?.value || getReviewer(row.key));
      return;
    }
    const select = event.target.closest('[data-audit-reviewer]');
    if (!select || select.disabled) return;
    const row = activeTab().rows.find((item) => item.key === select.dataset.auditReviewer);
    if (!row) return;
    persistRow(row, Boolean(getSettings()[row.enabledKey]), select.value);
  });

  root.addEventListener('keydown', (event) => {
    const tabButton = event.target.closest('[data-audit-tab]');
    if (!tabButton || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const currentIndex = tabs.findIndex((tab) => tab.key === activeTabKey);
    const nextIndex = event.key === 'ArrowRight'
      ? (currentIndex + 1) % tabs.length
      : (currentIndex - 1 + tabs.length) % tabs.length;
    renderTab(tabs[nextIndex].key);
    root.querySelector(`[data-audit-tab="${tabs[nextIndex].key}"]`)?.focus();
  });

  renderTab(activeTabKey);
})();
