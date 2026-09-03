(function () {
  window.RecordPageConfig = {
    title: '订单标签',
    pageClass: 'order-module-page order-tag-page',
    useDemoListLayout: true,
    resource: 'tags',
    selectable: false,
    filters: [
      { key: 'tagName', label: '标签名称', placeholder: '请输入' }
    ],
    columns: [
      { key: 'tagName', label: '标签名称' },
      { key: 'nutritious', label: '是否是营养餐' },
      { key: 'remark', label: '备注' },
      { key: 'status', label: '状态', format: 'status' }
    ],
    toolbar: [
      { key: 'add', label: '添加标签', primary: true }
    ],
    rowActions: [
      { key: 'enable', label: '启用', transition: 'enable', visible: ['DISABLE'], confirmTitle: '启用订单标签', message: '确认启用该订单标签吗？' },
      { key: 'disable', label: '禁用', transition: 'disable', visible: ['ENABLE'], confirmTitle: '禁用订单标签', message: '确认禁用该订单标签吗？' },
      { key: 'edit', label: '编辑' },
      { key: 'delete', label: '删除', danger: true }
    ],
    formFields: [
      { key: 'tagName', label: '标签名称', required: true, placeholder: '请输入' },
      { key: 'nutritious', label: '是否是营养餐', required: true, options: ['营养餐', '非营养餐', '不区分'] },
      { key: 'remark', label: '备注', type: 'textarea' }
    ],
    createDefaults: { status: 'ENABLE', nutritious: '不区分' },
    deleteMessage: '确认删除该订单标签吗？'
  };
})();
