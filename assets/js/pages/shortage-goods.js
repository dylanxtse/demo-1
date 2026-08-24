(function () {
  window.RecordPageConfig = {
    title: '缺货商品',
    pageClass: 'sorting-module-page shortage-goods-page',
    resource: 'shortageItems',
    filters: [
      { key: 'expectedAt', label: '期望送达时间', type: 'date' },
      { key: 'warehouse', label: '仓库', options: ['中心仓', '北区仓', '临时仓'] },
      { key: 'category', label: '商品分类', options: ['果蔬', '水产品', '蛋奶类', '主食'] },
      { key: 'goodsName', label: '商品名称', placeholder: '请输入' },
      { key: 'route', label: '线路', options: ['东城一线', '南城二线', '北城一线'] },
      { key: 'status', label: '采购单状态', options: [
        { label: '待处理', value: 'SHORTAGE' },
        { label: '已生成采购单', value: 'PURCHASED' }
      ] },
      { key: 'customerName', label: '客户名称', placeholder: '请输入' },
      { key: 'supplier', label: '供应商/采购员', placeholder: '请输入' }
    ],
    columns: [
      { key: 'goodsName', label: '商品名' },
      { key: 'category', label: '分类' },
      { key: 'supplier', label: '供应商/采购员' },
      { key: 'customerName', label: '客户' },
      { key: 'canteen', label: '食堂' },
      { key: 'warehouse', label: '仓库' },
      { key: 'orderQty', label: '下单数量' },
      { key: 'shortageQty', label: '缺货数量' },
      { key: 'purchaseOrder', label: '采购单' }
    ],
    selectableWhen: (item) => item.status !== 'PURCHASED' && !item.purchaseOrder,
    toolbar: [
      {
        key: 'generatePurchase',
        label: '生成采购单',
        primary: true,
        batchTransition: 'generatePurchase',
        message: '确定为选中缺货商品生成采购单吗？',
        validateSelection: (items) => {
          if (items.some((item) => item.status === 'PURCHASED' || item.purchaseOrder)) return '已生成采购单的商品不能重复操作';
          const partners = new Set(items.map((item) => `${item.supplier || ''}`));
          return partners.size > 1 ? '请选择同一供应商/采购员的缺货商品' : '';
        }
      },
      { key: 'cancelShortage', label: '取消缺货', batchTransition: 'cancelShortage', message: '确定取消选中商品缺货状态吗？' },
      { key: 'export', label: '导出' }
    ],
    rowActions: [
      { key: 'cancelShortage', label: '取消缺货', transition: 'cancelShortage', visible: ['SHORTAGE', 'PARTIAL', 'PURCHASED'], confirmTitle: '取消缺货', message: '确定要取消该商品缺货状态吗？' }
    ],
    statusMap: {
      SHORTAGE: ['待处理', 'danger'],
      PARTIAL: ['部分缺货', 'warning'],
      PURCHASED: ['已生成采购单', 'success']
    }
  };
})();
