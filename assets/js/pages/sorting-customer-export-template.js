(function () {
  const root = document.getElementById('sortingCustomerExportTemplateApp');
  if (!root) return;

  const EXPORT_VERSION = '20260929-sorting-customer-export-template-1';
  const params = new URLSearchParams(window.location.search);
  const headers = ['商品名称（计量单位/品牌/规格）', '所属订单号', '计量单位', '下单数量', '实际数量', '分包单位', '分包数量', '分包尾数', '分包系数', '是否发货', '分拣进度', '备注', '库存'];
  const statusMap = { PENDING: '未分拣', PARTIAL: '部分分拣', SORTED: '已分拣', SHORTAGE: '缺货' };

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const display = (value, fallback = '--') => value === '' || value == null ? fallback : escapeHtml(value);

  function readPayload() {
    const queryData = params.get('exportData');
    if (queryData) {
      try {
        const queryPayload = JSON.parse(queryData);
        if (queryPayload?.version === EXPORT_VERSION) return queryPayload;
      } catch (error) {
        return null;
      }
    }

    const exportKey = params.get('exportKey');
    if (!exportKey) return null;
    try {
      const raw = window.sessionStorage?.getItem(exportKey) || window.localStorage?.getItem(exportKey) || '';
      if (!raw) return null;
      const payload = JSON.parse(raw);
      return payload?.version === EXPORT_VERSION ? payload : null;
    } catch (error) {
      return null;
    }
  }

  function quantity(value, blankZero = false) {
    if (value === '' || value == null || (blankZero && Number(value) === 0)) return '--';
    const parsed = Number(value);
    return Number.isFinite(parsed) ? String(parsed) : display(value);
  }

  function productDisplay(item) {
    return display(item.displayGoodsName || item.goodsName || item.productName || '--');
  }

  function statusLabel(group) {
    if (statusMap[group.status]) return statusMap[group.status];
    const items = Array.isArray(group.items) ? group.items : [];
    if (items.length && items.every((item) => item.status === 'SORTED' || item.sortingCompleted === true)) return '已分拣';
    if (items.some((item) => item.status === 'PARTIAL')) return '部分分拣';
    return '未分拣';
  }

  function progress(item) {
    const unit = item.unit || '--';
    return `${quantity(item.actualQty, true)} ${unit}/${quantity(item.orderQty)} ${unit}`;
  }

  const defaultPackageSpecs = [
    { productCode: 'SP0300061', packageQty: 10, packageUnit: '包' },
    { productCode: 'SP0300039', packageQty: 10, packageUnit: '包' },
    { productCode: 'SP0300025', packageQty: 5, packageUnit: '包' },
    { productCode: 'SP0300019', packageQty: 10, packageUnit: '袋' },
    { productCode: 'SP0300034', packageQty: 25, packageUnit: '袋' },
    { productCode: 'SP0300020', packageQty: 10, packageUnit: '箱' },
    { productCode: 'SP0300051', packageQty: 10, packageUnit: '包' },
    { productCode: 'SP0300055', packageQty: 10, packageUnit: '包' },
    { productCode: 'SP0300059', packageQty: 10, packageUnit: '包' },
    { productCode: 'SP0300031', packageQty: 5, packageUnit: '箱' },
    { productCode: 'SP0300030', packageQty: 10, packageUnit: '箱' },
    { productCode: 'SP0300015', packageQty: 10, packageUnit: '筐' },
    { productCode: 'SP0300037', packageQty: 10, packageUnit: '箱' },
    { productCode: 'SP0300014', packageQty: 10, packageUnit: '筐' },
    { productCode: 'SP0300040', packageQty: 10, packageUnit: '袋' },
    { productCode: 'SP0300029', packageQty: 5, packageUnit: '箱' }
  ];

  function packageBreakdown(item) {
    const saved = window.AppStorage?.read('procurement-sorting-package-specs-v2', null);
    const specs = new Map(defaultPackageSpecs.map((spec) => [String(spec.productCode), spec]));
    (Array.isArray(saved) ? saved : []).forEach((spec) => specs.set(String(spec.productCode), spec));
    const spec = specs.get(String(item.goodsCode || item.productCode || item.productId));
    const actual = Number(item.actualQty || 0);
    if (!actual || !spec || !Number(spec.packageQty)) return { unit: '--', quantity: '--', remainder: '--', coefficient: '--' };
    const quantityValue = Math.floor(actual / Number(spec.packageQty));
    const remainder = Number((actual - quantityValue * Number(spec.packageQty)).toFixed(2));
    return { unit: spec.packageUnit || '--', quantity: String(quantityValue), remainder: remainder ? String(remainder) : '', coefficient: String(spec.packageQty) };
  }

  function renderItemRow(item) {
    const packageInfo = packageBreakdown(item);
    return `<tr class="customer-export-item-row">
      <td title="${escapeHtml(item.goodsName || item.productName || '--')}">${productDisplay(item)}</td>
      <td>${display(item.orderNo)}</td>
      <td>${display(item.unit)}</td>
      <td>${quantity(item.orderQty)}</td>
      <td>${quantity(item.actualQty, true)}</td>
      <td>${display(packageInfo.unit)}</td>
      <td>${display(packageInfo.quantity)}</td>
      <td>${display(packageInfo.remainder, '')}</td>
      <td>${display(packageInfo.coefficient)}</td>
      <td>${display(item.shipped, '否')}</td>
      <td>${escapeHtml(progress(item))}</td>
      <td>${item.remark ? display(item.remark) : ''}</td>
      <td>${display(item.stock, '')}</td>
    </tr>`;
  }

  function renderGroup(group, index, total) {
    const items = Array.isArray(group.items) ? group.items : [];
    const receiver = group.receiver || group.consignee || '默认';
    const phone = group.phone || group.consigneePhone || '18500000000';
    const address = group.address || group.consigneeAddress || '默认收货地址';
    const itemRows = items.length
      ? items.map(renderItemRow).join('')
      : '<tr class="customer-export-item-row"><td colspan="13">暂无商品明细</td></tr>';
    const spacer = index < total - 1 ? '<tr class="customer-export-spacer-row"><td colspan="13"></td></tr>' : '';
    return `<tbody class="customer-export-group">
      <tr class="customer-export-meta-row">
        <td colspan="4">客户名称：${display(group.customerName)}</td>
        <td colspan="3">食堂：${display(group.canteen)}</td>
        <td colspan="3">期望送达时间：${display(group.expectedAt)}</td>
        <td colspan="3">收货人：${display(receiver)}</td>
      </tr>
      <tr class="customer-export-meta-row">
        <td colspan="4">收货手机：${display(phone)}</td>
        <td colspan="3">收货地址：${display(address)}</td>
        <td colspan="3"></td>
        <td colspan="3">单据状态：${escapeHtml(statusLabel(group))}</td>
      </tr>
      <tr class="customer-export-column-row">${headers.map((header) => `<th>${header}</th>`).join('')}</tr>
      ${itemRows}
      ${spacer}
    </tbody>`;
  }

  const payload = readPayload() || { groups: [] };
  const groups = Array.isArray(payload.groups) ? payload.groups : [];
  const body = groups.length
    ? groups.map((group, index) => renderGroup(group, index, groups.length)).join('')
    : '<tbody><tr class="customer-export-empty-row"><td colspan="13">暂无可导出的客户分拣数据</td></tr></tbody>';

  root.innerHTML = `<main class="school-order-export-template-page sorting-customer-export-template-page">
    <section class="school-order-export-template-section">
      <div class="school-order-export-template-inner sorting-customer-export-template-inner">
        <div class="school-order-export-template-table-wrap sorting-customer-export-template-table-wrap">
          <table class="school-order-export-template-table sorting-customer-export-template-table">
            <colgroup>
              <col class="customer-export-col-goods"><col class="customer-export-col-order"><col class="customer-export-col-unit"><col class="customer-export-col-qty"><col class="customer-export-col-actual"><col class="customer-export-col-package-unit"><col class="customer-export-col-package-qty"><col class="customer-export-col-package-remainder"><col class="customer-export-col-package-coefficient"><col class="customer-export-col-shipped"><col class="customer-export-col-progress"><col class="customer-export-col-remark"><col class="customer-export-col-stock">
            </colgroup>
            <thead><tr class="customer-export-title-row"><th colspan="13">客户分拣</th></tr></thead>
            ${body}
          </table>
        </div>
      </div>
    </section>
    <div class="school-order-export-template-actions"><a href="./sorting-management.html?view=customer">返回客户分拣</a></div>
  </main>`;

  if (params.get('exportKey')) {
    try {
      window.sessionStorage?.removeItem(params.get('exportKey'));
      window.localStorage?.removeItem(params.get('exportKey'));
    } catch (error) {
      // 临时缓存清理失败不影响模板展示。
    }
  }
})();
