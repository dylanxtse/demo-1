(function () {
  'use strict';

  var statusMap = {
    '待收货': 'warning',
    '待入库': 'info',
    '已完成': 'success',
    '已关闭': 'danger',
    '已生成采购单': 'success',
    '未生成采购单': 'warning',
    '草稿': 'info',
    '待审核': 'warning',
    '未确认': 'warning',
    '已确认': 'info',
    '已发货': 'success'
  };

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function money(value) {
    return Number(value || 0).toFixed(2);
  }

  function statusHtml(value) {
    var label = value == null || value === '' ? '--' : String(value);
    return '<span class="purchase-status ' + (statusMap[label] || '') + '">' + escapeHtml(label) + '</span>';
  }

  function toast(message, type) {
    var current = document.querySelector('.purchase-toast');
    if (current) current.remove();
    var element = document.createElement('div');
    element.className = 'purchase-toast' + (type ? ' ' + type : '');
    element.setAttribute('role', 'status');
    element.textContent = message;
    document.body.appendChild(element);
    window.setTimeout(function () { element.remove(); }, 2400);
  }

  function navigate(url) {
    if (window.AppNavigationGuard?.navigate) window.AppNavigationGuard.navigate(url);
    else window.location.href = url;
  }

  function mountDate(input, value, withTime) {
    if (!window.DatePicker || !input) return null;
    var picker = window.DatePicker.mount({ input: input, panelId: input.id + '-panel', withTime: Boolean(withTime) });
    if (value) picker.setValue(value, false);
    return picker;
  }

  function datePart(value) {
    return String(value || '').trim().slice(0, 10);
  }

  function shiftDate(value, offset) {
    var source = datePart(value);
    var parts = source.split('-').map(Number);
    if (parts.length !== 3 || parts.some(function (part) { return !Number.isFinite(part); })) return source;
    var date = new Date(parts[0], parts[1] - 1, parts[2]);
    date.setDate(date.getDate() + Number(offset || 0));
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  }

  function mountDateRange(container, startDate, endDate) {
    if (!window.DateRangePicker || !container) return null;
    var picker = window.DateRangePicker.mount({
      container: container,
      displayInput: container.querySelector('.date-range-display'),
      startInput: container.querySelector('[data-date-start]'),
      endInput: container.querySelector('[data-date-end]'),
      panelId: (container.id || 'purchase-date-range') + '-panel'
    });
    if (picker) picker.setValue(startDate || '', endDate || '', false);
    return picker;
  }

  function openModal(options) {
    var config = options || {};
    var backdrop = document.createElement('div');
    backdrop.className = 'purchase-modal-backdrop';
    backdrop.innerHTML = '<section class="purchase-modal ' + (config.kind === 'confirm' ? 'is-confirm' : '') + '" role="dialog" aria-modal="true" aria-label="' + escapeHtml(config.title || '') + '">' +
      '<header class="purchase-modal-header"><h3>' + escapeHtml(config.title || '') + '</h3><button type="button" class="purchase-modal-close" aria-label="关闭">×</button></header>' +
      '<div class="purchase-modal-body">' + (config.messageHtml || '<p>' + escapeHtml(config.message || '') + '</p>') + '</div>' +
      '<footer class="purchase-modal-footer">' + (config.cancelText ? '<button type="button" class="btn purchase-modal-cancel">' + escapeHtml(config.cancelText) + '</button>' : '') +
      '<button type="button" class="btn btn-primary purchase-modal-confirm">' + escapeHtml(config.confirmText || '确认') + '</button></footer></section>';
    document.body.appendChild(backdrop);
    var close = function () { backdrop.remove(); };
    backdrop.querySelector('.purchase-modal-close').addEventListener('click', close);
    backdrop.querySelector('.purchase-modal-cancel')?.addEventListener('click', close);
    backdrop.addEventListener('click', function (event) {
      if (event.target === backdrop) close();
    });
    backdrop.querySelector('.purchase-modal-confirm').addEventListener('click', function () {
      var result = config.onConfirm?.();
      if (result !== false) close();
    });
    return { close: close, element: backdrop };
  }

  function openEnterpriseExpectedDateModal(options) {
    var config = options || {};
    var schoolDate = datePart(config.schoolExpectedAt);
    var defaultDate = datePart(config.defaultDate || shiftDate(schoolDate, -2));
    var modal = openModal({
      title: config.title || '生成采购单',
      messageHtml: '<div class="purchase-enterprise-date-form">' +
        '<div class="purchase-enterprise-date-context">学校期望送达时间：<strong>' + escapeHtml(schoolDate || '--') + '</strong></div>' +
        '<label class="purchase-modal-field" for="enterpriseExpectedAt"><span>企业期望送达时间</span><input class="form-control" id="enterpriseExpectedAt" data-enterprise-expected-at type="text" readonly value="' + escapeHtml(defaultDate) + '"></label>' +
        '<p class="purchase-modal-error" data-enterprise-date-error hidden></p>' +
      '</div>',
      cancelText: config.cancelText || '取消',
      confirmText: config.confirmText || '生成采购单',
      kind: 'confirm',
      onConfirm: function () {
        var input = modal.element.querySelector('[data-enterprise-expected-at]');
        var error = modal.element.querySelector('[data-enterprise-date-error]');
        var value = datePart(input?.value);
        var showError = function (message) {
          if (error) {
            error.textContent = message;
            error.hidden = !message;
          }
          input?.classList.toggle('is-invalid', Boolean(message));
        };
        if (!value) {
          showError('请选择企业期望送达时间');
          return false;
        }
        if (schoolDate && value > schoolDate) {
          showError('企业期望送达时间不能晚于学校期望送达时间');
          return false;
        }
        showError('');
        return config.onConfirm ? config.onConfirm(value, schoolDate) : true;
      }
    });
    var input = modal.element.querySelector('[data-enterprise-expected-at]');
    mountDate(input, defaultDate, false);
    if (schoolDate) input?.setAttribute('data-max-date', schoolDate);
    return modal;
  }

  function renderPagination(container, state, onChange) {
    if (!container) return;
    var pageSize = Number(state.pageSize) || 20;
    var total = Number(state.total) || 0;
    var pages = Math.max(1, Math.ceil(total / pageSize));
    var page = Math.min(pages, Math.max(1, Number(state.page) || 1));
    container.innerHTML = '<span class="purchase-pagination-total">共 ' + total + ' 条数据</span>' +
      '<label class="purchase-page-size"><select data-page-size><option value="10"' + (pageSize === 10 ? ' selected' : '') + '>10 条/页</option><option value="20"' + (pageSize === 20 ? ' selected' : '') + '>20 条/页</option><option value="50"' + (pageSize === 50 ? ' selected' : '') + '>50 条/页</option></select></label>' +
      '<button type="button" class="purchase-page-arrow" data-page-prev ' + (page <= 1 ? 'disabled' : '') + '>‹</button>' +
      '<span class="purchase-page-current">' + page + '</span>' +
      '<button type="button" class="purchase-page-arrow" data-page-next ' + (page >= pages ? 'disabled' : '') + '>›</button>' +
      '<span class="purchase-jump">跳至 <input data-page-jump value="' + page + '"> / ' + pages + ' 页</span>';
    container.querySelector('[data-page-size]').addEventListener('change', function (event) {
      onChange({ page: 1, pageSize: Number(event.target.value) });
    });
    container.querySelector('[data-page-prev]').addEventListener('click', function () {
      onChange({ page: page - 1, pageSize: pageSize });
    });
    container.querySelector('[data-page-next]').addEventListener('click', function () {
      onChange({ page: page + 1, pageSize: pageSize });
    });
    container.querySelector('[data-page-jump]').addEventListener('change', function (event) {
      onChange({ page: Number(event.target.value) || 1, pageSize: pageSize });
    });
  }

  window.PurchasePageUtils = {
    escapeHtml: escapeHtml,
    money: money,
    statusHtml: statusHtml,
    toast: toast,
    navigate: navigate,
    mountDate: mountDate,
    mountDateRange: mountDateRange,
    openModal: openModal,
    openEnterpriseExpectedDateModal: openEnterpriseExpectedDateModal,
    shiftDate: shiftDate,
    renderPagination: renderPagination
  };
})();
