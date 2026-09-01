(function () {
  window.RecordPageConfig = {
    title: '上传质检报告',
    pageClass: 'order-module-page quality-report-page',
    useDemoListLayout: true,
    usePagination: true,
    showSelectionSummary: false,
    resource: 'qualityReports',
    filters: [
      { key: 'dateRange', label: '入库日期', type: 'dateRange' },
      { key: 'inboundNo', label: '入库单号', placeholder: '请输入' },
      { key: 'goodsName', label: '商品名称', placeholder: '请输入商品名称/编码' },
      { key: 'isNetVegetable', label: '是否净菜', options: [
        { label: '净菜', value: 'true' },
        { label: '非净菜', value: 'false' }
      ] },
      { key: 'partner', label: '供应商/采购员/客户', placeholder: '请输入' },
      { key: 'inboundType', label: '入库类型', options: ['采购入库', '退货入库', '盘盈入库', '期初库存'] },
      { key: 'warehouse', label: '仓库', options: ['中心仓', '北区仓', '临时仓'] },
      { key: 'reportStatus', label: '质检报告', options: ['已上传', '未上传'] }
    ],
    columns: [
      { key: 'inboundAt', label: '入库时间' },
      { key: 'inboundNo', label: '入库单', link: true },
      { key: 'goodsName', label: '商品名称（计量单位/品牌/规格）', productDisplay: true },
      { key: 'partner', label: '供应商/采购员/客户' },
      { key: 'inboundType', label: '入库类型' },
      { key: 'warehouse', label: '仓库' },
      { key: 'reportStatus', label: '质检报告' },
      { key: 'reportName', label: '报告文件' }
    ],
    toolbar: [
      { key: 'batchUpload', label: '批量上传', primary: true, batchTransition: 'upload', message: '确定为选中入库商品上传质检报告吗？' },
      { key: 'localUpload', label: '批量本地上传', batchTransition: 'upload', message: '确定使用本地报告批量上传吗？' },
      { key: 'inboundUpload', label: '批量入库单上传', batchTransition: 'upload', message: '确定按入库单批量上传吗？' }
    ],
    rowActions: [
      { key: 'upload', label: '上传', transition: 'upload', confirmTitle: '上传质检报告', message: '确定为该商品上传质检报告吗？' }
    ],
    statusMap: {
      UPLOADED: ['已上传', 'success']
    }
  };
})();
