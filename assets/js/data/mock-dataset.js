/*
 * Canonical static seed dataset for the procurement demo.
 * This is the only code-owned mock data source. Legacy global names are
 * retained inside this file as compatibility exports for existing modules.
 */

/* 商品基础资料 */
 (function () {
  window.MockProducts = [
    { seq: 1, code: 'SP0300039', name: '土豆丝', isNetVegetable: true, unit: '斤', brand: '--', spec: '散装', category: '果蔬-净菜类', marketPrice: '4.80', status: '已上架', alias: '净菜土豆丝', origin: '中心厨房', shelfLife: '1天', purchaseType: '企业自加工', source: '平台添加', addTime: '2026-06-03 17:52:26' },
    { seq: 21, code: 'SP0300040', name: '土豆', isNetVegetable: false, unit: '斤', brand: '田园直供', spec: '散装', category: '果蔬-根茎类', marketPrice: '3.20', status: '已上架', alias: '鲜土豆', origin: '山东', shelfLife: '15天', purchaseType: '供应商送货', source: '平台添加', addTime: '2026-07-29 09:00:00' },
    { seq: 2, code: 'SP0300038', name: '牛奶', isNetVegetable: false, unit: '瓶', brand: '--', spec: '--', category: '蛋奶类-蛋奶类二级', marketPrice: '5.00', status: '已下架', alias: '', origin: '', shelfLife: '', purchaseType: '市场自采', source: '平台添加', addTime: '2026-05-22 14:58:58' },
    { seq: 3, code: 'SP0300037', name: '牛奶', isNetVegetable: false, unit: '瓶', brand: '--', spec: '--', category: '蛋奶类-蛋奶类二级', marketPrice: '5.00', status: '已上架', alias: '', origin: '', shelfLife: '', purchaseType: '市场自采', source: '平台添加', addTime: '2026-05-22 14:49:00' },
    { seq: 4, code: 'SP0300036', name: '大玉米棒子', isNetVegetable: false, unit: 'KG', brand: '--', spec: '--', category: '主食（米面粉点心类）-粮食类', marketPrice: '5.00', status: '已上架', alias: '', origin: '', shelfLife: '', purchaseType: '供应商送货', source: '平台添加', addTime: '2026-04-29 10:00:29' },
    { seq: 5, code: 'SP0300034', name: '黑大米', isNetVegetable: false, unit: '斤', brand: '五谷优选', spec: '25kg/袋', category: '主食（米面粉点心类）-粮食类', marketPrice: '10.00', status: '已上架', alias: '黑米', origin: '东北', shelfLife: '12个月', purchaseType: '供应商送货', source: '平台添加', addTime: '2026-04-28 15:27:28' },
    { seq: 6, code: 'SP0300031', name: '净膛鲫鱼', isNetVegetable: false, unit: '斤', brand: '鲜活水产', spec: '500g左右/条', category: '水产品-淡水鱼类', marketPrice: '18.50', status: '已上架', alias: '处理鲫鱼', origin: '本地养殖', shelfLife: '1天', purchaseType: '供应商送货', source: '平台添加', addTime: '2026-04-23 16:53:55' },
    { seq: 7, code: 'SP0300030', name: '金龙鱼5L桶装油', isNetVegetable: false, unit: '瓶', brand: '金龙鱼', spec: '5L/瓶', category: '食油-食油二级', marketPrice: '55.00', status: '已上架', alias: '', origin: '', shelfLife: '', purchaseType: '供应商送货', source: '平台添加', addTime: '2026-04-23 13:07:25' },
    { seq: 8, code: 'SP0300029', name: '鲫鱼', isNetVegetable: false, unit: '斤', brand: '--', spec: '--', category: '水产品-水产品二级', marketPrice: '15.00', status: '已上架', alias: '', origin: '', shelfLife: '', purchaseType: '供应商送货', source: '平台添加', addTime: '2026-04-23 13:05:29' },
    { seq: 9, code: 'SP0300026', name: '面', isNetVegetable: false, unit: '瓶', brand: '--', spec: '--', category: '主食（米面粉点心类）-粮食类', marketPrice: '1.00', status: '已上架', alias: '', origin: '', shelfLife: '', purchaseType: '供应商送货', source: '平台添加', addTime: '2025-12-30 16:07:10' },
    { seq: 10, code: 'SP0300025', name: '大米', isNetVegetable: false, unit: 'KG', brand: '--', spec: '--', category: '主食（米面粉点心类）-粮食类', marketPrice: '19.00', status: '已上架', alias: '', origin: '', shelfLife: '', purchaseType: '供应商送货', source: '平台添加', addTime: '2025-12-23 16:08:26' },
    { seq: 11, code: 'SP0300024', name: '三元牛奶', isNetVegetable: false, unit: '瓶', brand: '三元', spec: '10瓶1箱', category: '蛋奶类-蛋奶类二级', marketPrice: '10.00', status: '已上架', alias: '', origin: '', shelfLife: '1年', purchaseType: '供应商送货', source: '平台添加', addTime: '2025-12-12 11:11:29' },
    { seq: 12, code: 'SP0300023', name: '大饼', isNetVegetable: false, unit: '斤', brand: '--', spec: '--', category: '主食（米面粉点心类）-粮食类', marketPrice: '1.00', status: '已上架', alias: '', origin: '', shelfLife: '1天', purchaseType: '供应商送货', source: '平台添加', addTime: '2025-12-09 16:32:38' },
    { seq: 13, code: 'SP0300020', name: '西红柿', isNetVegetable: false, unit: 'KG', brand: '田园直供', spec: '散装', category: '果蔬-茄果类', marketPrice: '5.60', status: '已上架', alias: '番茄', origin: '山东', shelfLife: '7天', purchaseType: '供应商送货', source: '平台添加', addTime: '2025-12-04 16:02:21' },
    { seq: 14, code: 'SP0300019', name: '大白菜', isNetVegetable: false, unit: '斤', brand: '田园直供', spec: '散装', category: '果蔬-叶菜类', marketPrice: '2.20', status: '已上架', alias: '白菜', origin: '河北', shelfLife: '7天', purchaseType: '供应商送货', source: '平台添加', addTime: '2025-12-04 16:00:29' },
    { seq: 15, code: 'SP0300018', name: '鸡蛋', isNetVegetable: false, unit: '斤', brand: '--', spec: '--', category: '蛋奶类-蛋奶类二级', marketPrice: '22.00', status: '已上架', alias: '', origin: '', shelfLife: '', purchaseType: '供应商送货', source: '平台添加', addTime: '2025-12-04 13:43:38' },
    { seq: 16, code: 'SP0300017', name: '金龙鱼豆油', isNetVegetable: false, unit: '斤', brand: '--', spec: '--', category: '食油-食油二级', marketPrice: '50.00', status: '已上架', alias: '', origin: '', shelfLife: '', purchaseType: '供应商送货', source: '平台添加', addTime: '2025-12-04 13:43:38' },
    { seq: 17, code: 'SP0300016', name: '面粉', isNetVegetable: false, unit: '斤', brand: '--', spec: '--', category: '其他材料-其他二级', marketPrice: '30.00', status: '已下架', alias: '', origin: '', shelfLife: '', purchaseType: '供应商送货', source: '平台添加', addTime: '2025-12-04 13:43:38' },
    { seq: 18, code: 'SP0300015', name: '香蕉', isNetVegetable: false, unit: '斤', brand: '--', spec: '--', category: '果蔬-果蔬二级', marketPrice: '30.00', status: '已上架', alias: '', origin: '', shelfLife: '', purchaseType: '供应商送货', source: '平台添加', addTime: '2025-12-04 13:43:38' },
    { seq: 19, code: 'SP0300014', name: '苹果', isNetVegetable: false, unit: '斤', brand: '--', spec: '--', category: '果蔬-果蔬二级', marketPrice: '23.00', status: '已上架', alias: '', origin: '', shelfLife: '', purchaseType: '供应商送货', source: '平台添加', addTime: '2025-12-04 13:43:38' },
    { seq: 20, code: 'SP0300013', name: '鸡腿肉', isNetVegetable: false, unit: '斤', brand: '--', spec: '--', category: '肉（豆）制品-肉（豆）制品二级', marketPrice: '23.00', status: '已上架', alias: '', origin: '', shelfLife: '', purchaseType: '供应商送货', source: '平台添加', addTime: '2025-12-04 13:43:38' },
    { seq: 22, code: 'SP0300050', name: '土豆块', isNetVegetable: true, unit: '斤', brand: '--', spec: '散装', category: '果蔬-净菜类', marketPrice: '5.20', status: '已上架', alias: '净菜土豆块', origin: '中心厨房', shelfLife: '1天', purchaseType: '企业自加工', source: '平台添加', addTime: '2026-07-31 09:05:00' },
    { seq: 23, code: 'SP0300051', name: '白菜段', isNetVegetable: true, unit: '斤', brand: '--', spec: '散装', category: '果蔬-净菜类', marketPrice: '3.20', status: '已上架', alias: '净菜白菜段', origin: '中心厨房', shelfLife: '1天', purchaseType: '企业自加工', source: '平台添加', addTime: '2026-07-31 09:10:00' },
    { seq: 24, code: 'SP0300052', name: '白菜丝', isNetVegetable: true, unit: '斤', brand: '--', spec: '散装', category: '果蔬-净菜类', marketPrice: '3.40', status: '已上架', alias: '净菜白菜丝', origin: '中心厨房', shelfLife: '1天', purchaseType: '企业自加工', source: '平台添加', addTime: '2026-07-31 09:15:00' },
    { seq: 25, code: 'SP0300053', name: '胡萝卜', isNetVegetable: false, unit: '斤', brand: '田园直供', spec: '散装', category: '果蔬-根茎类', marketPrice: '2.80', status: '已上架', alias: '红萝卜', origin: '河北', shelfLife: '10天', purchaseType: '供应商送货', source: '平台添加', addTime: '2026-07-31 09:20:00' },
    { seq: 26, code: 'SP0300054', name: '胡萝卜丝', isNetVegetable: true, unit: '斤', brand: '--', spec: '散装', category: '果蔬-净菜类', marketPrice: '4.80', status: '已上架', alias: '净菜胡萝卜丝', origin: '中心厨房', shelfLife: '1天', purchaseType: '企业自加工', source: '平台添加', addTime: '2026-07-31 09:25:00' },
    { seq: 27, code: 'SP0300055', name: '胡萝卜片', isNetVegetable: true, unit: '斤', brand: '--', spec: '散装', category: '果蔬-净菜类', marketPrice: '4.60', status: '已上架', alias: '净菜胡萝卜片', origin: '中心厨房', shelfLife: '1天', purchaseType: '企业自加工', source: '平台添加', addTime: '2026-07-31 09:30:00' },
    { seq: 28, code: 'SP0300056', name: '青椒', isNetVegetable: false, unit: '斤', brand: '田园直供', spec: '散装', category: '果蔬-茄果类', marketPrice: '4.50', status: '已上架', alias: '甜椒', origin: '山东', shelfLife: '7天', purchaseType: '供应商送货', source: '平台添加', addTime: '2026-07-31 09:35:00' },
    { seq: 29, code: 'SP0300057', name: '青椒丝', isNetVegetable: true, unit: '斤', brand: '--', spec: '散装', category: '果蔬-净菜类', marketPrice: '7.20', status: '已上架', alias: '净菜青椒丝', origin: '中心厨房', shelfLife: '1天', purchaseType: '企业自加工', source: '平台添加', addTime: '2026-07-31 09:40:00' },
    { seq: 30, code: 'SP0300058', name: '青椒块', isNetVegetable: true, unit: '斤', brand: '--', spec: '散装', category: '果蔬-净菜类', marketPrice: '6.80', status: '已上架', alias: '净菜青椒块', origin: '中心厨房', shelfLife: '1天', purchaseType: '企业自加工', source: '平台添加', addTime: '2026-07-31 09:45:00' },
    { seq: 31, code: 'SP0300059', name: '什锦配菜', isNetVegetable: true, unit: '斤', brand: '--', spec: '散装', category: '果蔬-净菜组合', marketPrice: '6.50', status: '已上架', alias: '三色什锦配菜', origin: '中心厨房', shelfLife: '1天', purchaseType: '企业自加工', source: '平台添加', addTime: '2026-07-31 09:50:00' },
    { seq: 32, code: 'SP0300060', name: '西兰花', isNetVegetable: false, unit: '斤', brand: '田园直供', spec: '散装', category: '果蔬-花菜类', marketPrice: '5.20', status: '已上架', alias: '青花菜', origin: '云南', shelfLife: '5天', purchaseType: '供应商送货', source: '平台添加', addTime: '2026-07-31 09:55:00' },
    { seq: 33, code: 'SP0300061', name: '西兰花块', isNetVegetable: true, unit: '斤', brand: '--', spec: '散装', category: '果蔬-净菜类', marketPrice: '7.80', status: '已上架', alias: '净菜西兰花块', origin: '中心厨房', shelfLife: '1天', purchaseType: '企业自加工', source: '平台添加', addTime: '2026-07-31 10:00:00' }
  ];
})();

/* 订单、分拣、出入库及库存业务资料 */
(function () {
  const orders = [
    { id: 'ORD-20260730-001', orderNo: 'DD202607300100001', customerName: '第一实验学校', canteen: '第一食堂', customerType: '学校', orderTag: '营养餐', orderAmount: 2860.5, shippingAmount: 0, returnAmount: 0, reconciliationAmount: 0, expectedAt: '2026-07-31 07:30', status: 'PENDING', receiptStatus: '待收货', productCount: 18, warehouse: '中心仓', supplement: '否', remark: '上午七点半前送达', route: '东城一线', driver: '张师傅', source: '客户下单', creator: '王采购', createdAt: '2026-07-30 09:18:22', items: [
      { goodsName: '大白菜', isNetVegetable: false, goodsCode: 'SP0300019', unit: '斤', brand: '--', spec: '散装', unitPrice: 1.5, quantity: 80, subtotal: 120, shippedQty: 0, shippedAmount: 0, returnQty: 0, returnAmount: 0, reconciliationQty: 0, reconciliationAmount: 0, acceptedQty: 0, acceptedAmount: 0, remark: '', productionDate: '2026-07-30', inspectionImages: [{ name: '验货照片1.jpg' }, { name: '验货照片2.jpg' }], inspectionVideos: [] },
      { goodsName: '鸡蛋', isNetVegetable: false, goodsCode: 'SP0300020', unit: '斤', brand: '农家', spec: '500g/份', unitPrice: 5.8, quantity: 35, subtotal: 203, shippedQty: 35, shippedAmount: 203, returnQty: 0, returnAmount: 0, reconciliationQty: 0, reconciliationAmount: 0, acceptedQty: 0, acceptedAmount: 0, remark: '', productionDate: '2026-07-29', inspectionImages: [{ name: '鸡蛋验货.jpg' }], inspectionVideos: [{ name: '开箱验货.mp4' }] },
      { goodsName: '土豆', isNetVegetable: false, goodsCode: 'SP0300040', unit: '斤', brand: '农家优选', spec: '500g/份', unitPrice: 6.8, quantity: 50, subtotal: 340, shippedQty: 0, shippedAmount: 0, returnQty: 0, returnAmount: 0, reconciliationQty: 0, reconciliationAmount: 0, acceptedQty: 0, acceptedAmount: 0, remark: '', productionDate: '2026-07-30', inspectionImages: [], inspectionVideos: [] }
    ], operationLogs: [
      { action: '创建', desc: '王采购 创建订单 2026-07-30 09:18:22' },
      { action: '提交审核', desc: '王采购 提交审核 2026-07-30 09:19:05' }
    ] },
    { id: 'ORD-20260729-012', orderNo: 'DD202607290200012', customerName: '阳光幼儿园', canteen: '园区食堂', customerType: '幼儿园', orderTag: '普通餐', orderAmount: 1568, shippingAmount: 1520, returnAmount: 48, reconciliationAmount: 1472, expectedAt: '2026-07-30 08:00', status: 'CONFIRMED', receiptStatus: '未收货', productCount: 12, warehouse: '中心仓', supplement: '否', remark: '', route: '南城二线', driver: '李师傅', source: '平台添加', creator: '管理员', createdAt: '2026-07-29 14:36:10', items: [
      { goodsName: '鲫鱼', isNetVegetable: true, goodsCode: 'SP0300031', unit: '斤', brand: '--', spec: '--', unitPrice: 20, quantity: 20, subtotal: 400, shippedQty: 8, shippedAmount: 160, returnQty: 12, returnAmount: 240, reconciliationQty: 8, reconciliationAmount: 160, acceptedQty: 8, acceptedAmount: 160, remark: '库存不足', productionDate: '2026-07-29', inspectionImages: [{ name: '鲫鱼验货.jpg' }], inspectionVideos: [] },
      { goodsName: '西红柿', isNetVegetable: false, goodsCode: 'SP0300025', unit: 'KG', brand: '--', spec: '--', unitPrice: 4.5, quantity: 30, subtotal: 135, shippedQty: 30, shippedAmount: 135, returnQty: 0, returnAmount: 0, reconciliationQty: 30, reconciliationAmount: 135, acceptedQty: 30, acceptedAmount: 135, remark: '', productionDate: '2026-07-29', inspectionImages: [], inspectionVideos: [] },
      { goodsName: '猪肉', isNetVegetable: false, goodsCode: 'SP0300015', unit: '斤', brand: '双汇', spec: '500g/份', unitPrice: 18, quantity: 40, subtotal: 720, shippedQty: 40, shippedAmount: 720, returnQty: 0, returnAmount: 0, reconciliationQty: 40, reconciliationAmount: 720, acceptedQty: 0, acceptedAmount: 0, remark: '', productionDate: '2026-07-29', inspectionImages: [{ name: '猪肉检疫.jpg' }, { name: '猪肉外观.jpg' }], inspectionVideos: [{ name: '验货视频.mp4' }] }
    ], operationLogs: [
      { action: '创建', desc: '管理员 创建订单 2026-07-29 14:36:10' },
      { action: '提交审核', desc: '管理员 提交审核 2026-07-29 14:37:00' },
      { action: '审核通过', desc: '管理员 审核通过 2026-07-29 15:00:00' },
      { action: '确认供货', desc: '管理员 确认供货 2026-07-29 16:20:00' }
    ] },
    { id: 'ORD-20260728-006', orderNo: 'DD202607280300006', customerName: '育才中学', canteen: '高中部食堂', customerType: '学校', orderTag: '营养餐', orderAmount: 4388.6, shippingAmount: 4388.6, returnAmount: 0, reconciliationAmount: 4388.6, expectedAt: '2026-07-29 07:00', status: 'COMPLETED', receiptStatus: '未收货', productCount: 25, warehouse: '北区仓', supplement: '否', remark: '', route: '北城一线', driver: '周师傅', source: '客户下单', creator: '赵老师', createdAt: '2026-07-28 16:05:41', items: [
      { goodsName: '大米', isNetVegetable: false, goodsCode: 'SP0300034', unit: '斤', brand: '--', spec: '--', unitPrice: 10, quantity: 120, subtotal: 1200, shippedQty: 120, shippedAmount: 1200, returnQty: 0, returnAmount: 0, reconciliationQty: 120, reconciliationAmount: 1200, acceptedQty: 120, acceptedAmount: 1200, remark: '', productionDate: '2026-07-28', inspectionImages: [{ name: '大米验货.jpg' }], inspectionVideos: [] },
      { goodsName: '大玉米棒子', isNetVegetable: true, goodsCode: 'SP0300036', unit: 'KG', brand: '--', spec: '--', unitPrice: 5, quantity: 80, subtotal: 400, shippedQty: 80, shippedAmount: 400, returnQty: 0, returnAmount: 0, reconciliationQty: 80, reconciliationAmount: 400, acceptedQty: 80, acceptedAmount: 400, remark: '', productionDate: '2026-07-28', inspectionImages: [], inspectionVideos: [] },
      { goodsName: '黑大米', isNetVegetable: false, goodsCode: 'SP0300035', unit: '斤', brand: '--', spec: '--', unitPrice: 10, quantity: 60, subtotal: 600, shippedQty: 60, shippedAmount: 600, returnQty: 0, returnAmount: 0, reconciliationQty: 60, reconciliationAmount: 600, acceptedQty: 60, acceptedAmount: 600, remark: '', productionDate: '2026-07-28', inspectionImages: [{ name: '黑米验货1.jpg' }, { name: '黑米验货2.jpg' }], inspectionVideos: [{ name: '验货过程.mp4' }] }
    ], operationLogs: [
      { action: '创建', desc: '赵老师 创建订单 2026-07-28 16:05:41' },
      { action: '提交审核', desc: '赵老师 提交审核 2026-07-28 16:06:20' },
      { action: '审核通过', desc: '管理员 审核通过 2026-07-28 17:00:00' },
      { action: '确认供货', desc: '管理员 确认供货 2026-07-28 17:30:00' },
      { action: '完成发货', desc: '周师傅 完成发货 2026-07-29 07:00:00' }
    ] },
    { id: 'ORD-20260727-003', orderNo: 'DD202607270400003', customerName: '机关第二食堂', canteen: '二号食堂', customerType: '机关单位', orderTag: '普通餐', orderAmount: 973.2, shippingAmount: 0, returnAmount: 0, reconciliationAmount: 0, expectedAt: '2026-07-28 09:00', status: 'CLOSED', receiptStatus: '未收货', productCount: 8, warehouse: '中心仓', supplement: '否', remark: '客户取消', route: '西城一线', driver: '', source: '平台添加', creator: '管理员', createdAt: '2026-07-27 11:20:08', items: [
      { goodsName: '牛奶', isNetVegetable: true, goodsCode: 'SP0300037', unit: '瓶', brand: '--', spec: '--', unitPrice: 5, quantity: 100, subtotal: 500, shippedQty: 0, shippedAmount: 0, returnQty: 0, returnAmount: 0, reconciliationQty: 0, reconciliationAmount: 0, acceptedQty: 0, acceptedAmount: 0, remark: '', productionDate: '2026-07-27', inspectionImages: [], inspectionVideos: [] },
      { goodsName: '面包', isNetVegetable: false, goodsCode: 'SP0300042', unit: '个', brand: '桃李', spec: '100g/个', unitPrice: 3.5, quantity: 80, subtotal: 280, shippedQty: 0, shippedAmount: 0, returnQty: 0, returnAmount: 0, reconciliationQty: 0, reconciliationAmount: 0, acceptedQty: 0, acceptedAmount: 0, remark: '', productionDate: '2026-07-27', inspectionImages: [], inspectionVideos: [] }
    ], operationLogs: [
      { action: '创建', desc: '管理员 创建订单 2026-07-27 11:20:08' },
      { action: '关闭', desc: '管理员 关闭订单 2026-07-27 14:00:00' }
    ] }
  ];

  const returns = [
    { id: 'RET-001', returnNo: 'THD202607300001', customerName: '阳光幼儿园', canteen: '园区食堂', goodsName: '鲫鱼(斤/--/--)', reason: '商品破损', orderNo: 'DD202607290200012', inboundNo: 'RKD202607300009', warehouse: '中心仓', status: 'PENDING', creator: '刘财务', createdAt: '2026-07-30 10:12:00', refundAmount: 120.00, remark: '鲫鱼到货后部分死亡，需退货处理', items: [{ id: 'RL-1', goodsName: '鲫鱼(斤/--/--)', unit: '斤', orderPrice: 12.00, shippedQty: 20, returnedQty: 0, applyQty: 10, applyPrice: 12.00, applyAmount: 120.00, damageQty: 5, purchaseOrder: 'CG202607280001', remark: '部分死亡' }] },
    { id: 'RET-002', returnNo: 'THD202607280003', customerName: '育才中学', canteen: '高中部食堂', goodsName: '大米(KG/--/--)', reason: '数量多发', orderNo: 'DD202607280300006', inboundNo: 'RKD202607290016', warehouse: '北区仓', status: 'APPROVED', creator: '赵老师', createdAt: '2026-07-28 15:42:36', auditor: '管理员', auditAt: '2026-07-29 09:30:00', refundAmount: 240.00, remark: '发货数量超出下单数量', items: [{ id: 'RL-2', goodsName: '大米(KG/--/--)', unit: 'KG', orderPrice: 6.00, shippedQty: 100, returnedQty: 0, applyQty: 40, applyPrice: 6.00, applyAmount: 240.00, damageQty: 0, purchaseOrder: 'CG202607260003', remark: '多发40KG' }] },
    { id: 'RET-003', returnNo: 'THD202607260002', customerName: '第一实验学校', canteen: '第一食堂', goodsName: '鸡蛋(斤/--/--)', reason: '质量不符合要求', orderNo: 'DD202607260100021', inboundNo: 'RKD202607270011', warehouse: '中心仓', status: 'CLOSED', creator: '王采购', createdAt: '2026-07-26 17:08:25', auditor: '管理员', auditAt: '2026-07-27 10:15:00', acceptedAt: '2026-07-27 16:00:00', refundAmount: 180.00, remark: '鸡蛋有破损，质量不达标', items: [{ id: 'RL-3', goodsName: '鸡蛋(斤/--/--)', unit: '斤', orderPrice: 6.00, shippedQty: 50, returnedQty: 0, applyQty: 30, applyPrice: 6.00, applyAmount: 180.00, damageQty: 10, purchaseOrder: 'CG202607240008', remark: '部分破损' }] }
  ];

  const tags = [
    { id: 'TAG-001', tagName: '学生', nutritious: '营养餐', remark: '', status: 'ENABLE', createdAt: '2026-03-11 09:37:00' },
    { id: 'TAG-002', tagName: '学生', nutritious: '非营养餐', remark: '', status: 'ENABLE', createdAt: '2026-03-11 09:36:00' },
    { id: 'TAG-003', tagName: '学生', nutritious: '不区分', remark: '', status: 'ENABLE', createdAt: '2026-03-11 09:35:00' },
    { id: 'TAG-004', tagName: '教师', nutritious: '营养餐', remark: '', status: 'ENABLE', createdAt: '2026-03-11 09:34:00' },
    { id: 'TAG-005', tagName: '教师', nutritious: '非营养餐', remark: '', status: 'ENABLE', createdAt: '2026-03-11 09:33:00' },
    { id: 'TAG-006', tagName: '教师', nutritious: '不区分', remark: '', status: 'ENABLE', createdAt: '2026-03-11 09:32:00' },
    { id: 'TAG-007', tagName: '其他', nutritious: '非营养餐', remark: '', status: 'ENABLE', createdAt: '2026-03-11 09:31:00' },
    { id: 'TAG-008', tagName: '其他', nutritious: '不区分', remark: '', status: 'ENABLE', createdAt: '2026-03-11 09:30:00' }
  ];

  const receiptChanges = [
    { id: 'CHG-001', changeNo: 'BG202607300001', beforeAmount: 1520, afterAmount: 1472, differenceAmount: -48, customerName: '阳光幼儿园', canteen: '园区食堂', goodsName: '鲫鱼(斤/--/--)', shippingAt: '2026-07-30 07:20', auditAt: '', auditor: '', orderNo: 'XS202607290012', status: 'PENDING', creator: '刘财务', createdAt: '2026-07-30 11:20:08' },
    { id: 'CHG-002', changeNo: 'BG202607290002', beforeAmount: 4388.6, afterAmount: 4328.6, differenceAmount: -60, customerName: '育才中学', canteen: '高中部食堂', goodsName: '大米(KG/--/--)', shippingAt: '2026-07-29 06:50', auditAt: '2026-07-29 15:22', auditor: '管理员', orderNo: 'XS202607280006', status: 'APPROVED', creator: '赵老师', createdAt: '2026-07-29 13:05:10' }
  ];

  const sortingItems = [
    // 第一实验学校 / 第一食堂 (东城一线, 中心仓) - expectedAt: 2026-07-31
    { id: 'SORT-001', orderId: 'ORD-20260730-001', goodsCode: 'SP0300019', isNetVegetable: false, goodsName: '大白菜(斤/--/散装)', customerName: '第一实验学校', canteen: '第一食堂', orderQty: 80, actualQty: 0, unit: '斤', route: '东城一线', orderNo: 'DD202607300100001', orderTag: '营养餐', shipped: '否', progress: '0%', remark: '', stock: 236, status: 'PENDING', sorter: '', sortingAt: '', warehouse: '中心仓', category: '果蔬', shortage: '否', supplier: '绿源供应商', expectedAt: '2026-07-31 07:30' },
    { id: 'SORT-002', orderId: 'ORD-20260730-001', goodsCode: 'SP0300018', isNetVegetable: false, goodsName: '鸡蛋(斤/农家/500g份)', customerName: '第一实验学校', canteen: '第一食堂', orderQty: 35, actualQty: 35, unit: '斤', route: '东城一线', orderNo: 'DD202607300100001', orderTag: '营养餐', shipped: '否', progress: '100%', remark: '', stock: 109, status: 'SORTED', sorter: '陈分拣', sortingAt: '2026-07-31 06:21', warehouse: '中心仓', category: '蛋奶类', shortage: '否', supplier: '新鲜农场', expectedAt: '2026-07-31 07:30' },
    { id: 'SORT-003', orderId: 'ORD-20260730-001', goodsCode: 'SP0300040', isNetVegetable: true, goodsName: '土豆(斤/农家优选/500g份)', customerName: '第一实验学校', canteen: '第一食堂', orderQty: 50, actualQty: 50, unit: '斤', route: '东城一线', orderNo: 'DD202607300100001', orderTag: '营养餐', shipped: '否', progress: '100%', remark: '', stock: 180, status: 'SORTED', sorter: '陈分拣', sortingAt: '2026-07-31 06:25', warehouse: '中心仓', category: '果蔬', shortage: '否', supplier: '绿源供应商', expectedAt: '2026-07-31 07:30' },
    { id: 'SORT-004', orderId: 'ORD-20260730-001', goodsCode: 'SP0300020', isNetVegetable: true, goodsName: '西红柿(KG/--/--)', customerName: '第一实验学校', canteen: '第一食堂', orderQty: 30, actualQty: 0, unit: 'KG', route: '东城一线', orderNo: 'DD202607300100001', orderTag: '营养餐', shipped: '否', progress: '0%', remark: '', stock: 95, status: 'PENDING', sorter: '', sortingAt: '', warehouse: '中心仓', category: '果蔬', shortage: '否', supplier: '绿源供应商', expectedAt: '2026-07-31 07:30' },

    // 阳光幼儿园 / 园区食堂 (南城二线, 中心仓) - expectedAt: 2026-07-31
    { id: 'SORT-005', orderId: 'ORD-20260729-012', goodsCode: 'SP0300029', isNetVegetable: true, goodsName: '鲫鱼(斤/--/--)', customerName: '阳光幼儿园', canteen: '园区食堂', orderQty: 20, actualQty: 8, unit: '斤', route: '南城二线', orderNo: 'DD202607290200012', orderTag: '普通餐', shipped: '否', progress: '40%', remark: '库存不足', stock: 8, status: 'PARTIAL', sorter: '李分拣', sortingAt: '2026-07-31 06:30', warehouse: '中心仓', category: '水产品', shortage: '是', supplier: '海鲜供应商', expectedAt: '2026-07-31 08:00' },
    { id: 'SORT-006', orderId: 'ORD-20260729-012', goodsCode: 'SP0300020', isNetVegetable: true, goodsName: '西红柿(KG/--/--)', customerName: '阳光幼儿园', canteen: '园区食堂', orderQty: 15, actualQty: 15, unit: 'KG', route: '南城二线', orderNo: 'DD202607290200012', orderTag: '普通餐', shipped: '否', progress: '100%', remark: '', stock: 95, status: 'SORTED', sorter: '李分拣', sortingAt: '2026-07-31 06:35', warehouse: '中心仓', category: '果蔬', shortage: '否', supplier: '绿源供应商', expectedAt: '2026-07-31 08:00' },
    { id: 'SORT-007', orderId: 'ORD-20260729-012', goodsCode: 'SP0300015', isNetVegetable: false, goodsName: '猪肉(斤/双汇/500g份)', customerName: '阳光幼儿园', canteen: '园区食堂', orderQty: 40, actualQty: 40, unit: '斤', route: '南城二线', orderNo: 'DD202607290200012', orderTag: '普通餐', shipped: '否', progress: '100%', remark: '', stock: 120, status: 'SORTED', sorter: '李分拣', sortingAt: '2026-07-31 06:40', warehouse: '中心仓', category: '肉类', shortage: '否', supplier: '肉联供应商', expectedAt: '2026-07-31 08:00' },

    // 育才中学 / 高中部食堂 (北城一线, 北区仓) - expectedAt: 2026-07-31
    { id: 'SORT-008', orderId: 'ORD-20260728-006', goodsCode: 'SP0300034', isNetVegetable: true, goodsName: '大米(KG/--/--)', customerName: '育才中学', canteen: '高中部食堂', orderQty: 120, actualQty: 120, unit: 'KG', route: '北城一线', orderNo: 'DD202607280300006', orderTag: '营养餐', shipped: '否', progress: '100%', remark: '', stock: 520, status: 'SORTED', sorter: '王分拣', sortingAt: '2026-07-31 05:50', warehouse: '北区仓', category: '主食', shortage: '否', supplier: '粮油供应商', expectedAt: '2026-07-31 07:00' },
    { id: 'SORT-009', orderId: 'ORD-20260728-006', goodsCode: 'SP0300036', isNetVegetable: false, goodsName: '大玉米棒子(KG/--/--)', customerName: '育才中学', canteen: '高中部食堂', orderQty: 80, actualQty: 80, unit: 'KG', route: '北城一线', orderNo: 'DD202607280300006', orderTag: '营养餐', shipped: '否', progress: '100%', remark: '', stock: 200, status: 'SORTED', sorter: '王分拣', sortingAt: '2026-07-31 05:55', warehouse: '北区仓', category: '果蔬', shortage: '否', supplier: '绿源供应商', expectedAt: '2026-07-31 07:00' },
    { id: 'SORT-010', orderId: 'ORD-20260728-006', goodsCode: 'SP0300035', isNetVegetable: false, goodsName: '黑大米(斤/--/--)', customerName: '育才中学', canteen: '高中部食堂', orderQty: 60, actualQty: 30, unit: '斤', route: '北城一线', orderNo: 'DD202607280300006', orderTag: '营养餐', shipped: '否', progress: '50%', remark: '部分分拣', stock: 90, status: 'PARTIAL', sorter: '王分拣', sortingAt: '2026-07-31 06:00', warehouse: '北区仓', category: '主食', shortage: '否', supplier: '粮油供应商', expectedAt: '2026-07-31 07:00' },

    // 第三小学 / 校园食堂 (东城一线, 中心仓) - expectedAt: 2026-07-31
    { id: 'SORT-011', orderId: 'ORD-20260730-008', goodsCode: 'SP0300037', isNetVegetable: true, goodsName: '牛奶(瓶/三元/--)', customerName: '第三小学', canteen: '校园食堂', orderQty: 100, actualQty: 0, unit: '瓶', route: '东城一线', orderNo: 'DD202607300100008', orderTag: '营养餐', shipped: '否', progress: '0%', remark: '', stock: 320, status: 'PENDING', sorter: '', sortingAt: '', warehouse: '中心仓', category: '蛋奶类', shortage: '否', supplier: '乳业供应商', expectedAt: '2026-07-31 07:30' },
    { id: 'SORT-012', orderId: 'ORD-20260730-008', goodsCode: 'SP0300042', isNetVegetable: false, goodsName: '面包(个/桃李/100g个)', customerName: '第三小学', canteen: '校园食堂', orderQty: 80, actualQty: 80, unit: '个', route: '东城一线', orderNo: 'DD202607300100008', orderTag: '营养餐', shipped: '否', progress: '100%', remark: '', stock: 250, status: 'SORTED', sorter: '陈分拣', sortingAt: '2026-07-31 06:10', warehouse: '中心仓', category: '主食', shortage: '否', supplier: '烘焙供应商', expectedAt: '2026-07-31 07:30' },
    { id: 'SORT-013', orderId: 'ORD-20260730-008', goodsCode: 'SP0300039', isNetVegetable: true, goodsName: '土豆丝(斤/--/--)', customerName: '第三小学', canteen: '校园食堂', orderQty: 40, actualQty: 40, unit: '斤', route: '东城一线', orderNo: 'DD202607300100008', orderTag: '营养餐', shipped: '否', progress: '100%', remark: '', stock: 150, status: 'SORTED', sorter: '陈分拣', sortingAt: '2026-07-31 06:15', warehouse: '中心仓', category: '果蔬', shortage: '否', supplier: '绿源供应商', expectedAt: '2026-07-31 07:30' },

    // 实验幼儿园 / 食堂 (南城二线, 中心仓) - expectedAt: 2026-07-31
    { id: 'SORT-014', orderId: 'ORD-20260730-010', goodsCode: 'SP0300014', isNetVegetable: false, goodsName: '苹果(斤/--/--)', customerName: '实验幼儿园', canteen: '食堂', orderQty: 50, actualQty: 50, unit: '斤', route: '南城二线', orderNo: 'DD202607300100010', orderTag: '普通餐', shipped: '否', progress: '100%', remark: '', stock: 180, status: 'SORTED', sorter: '李分拣', sortingAt: '2026-07-31 06:20', warehouse: '中心仓', category: '果蔬', shortage: '否', supplier: '绿源供应商', expectedAt: '2026-07-31 08:30' },
    { id: 'SORT-015', orderId: 'ORD-20260730-010', goodsCode: 'SP0300024', isNetVegetable: false, goodsName: '三元牛奶(瓶/三元/10瓶1箱)', customerName: '实验幼儿园', canteen: '食堂', orderQty: 30, actualQty: 0, unit: '瓶', route: '南城二线', orderNo: 'DD202607300100010', orderTag: '普通餐', shipped: '否', progress: '0%', remark: '', stock: 85, status: 'PENDING', sorter: '', sortingAt: '', warehouse: '中心仓', category: '蛋奶类', shortage: '否', supplier: '乳业供应商', expectedAt: '2026-07-31 08:30' },

    // 第七中学 / 初中部食堂 (北城一线, 北区仓) - expectedAt: 2026-07-31
    { id: 'SORT-016', orderId: 'ORD-20260730-015', goodsCode: 'SP0300034', isNetVegetable: false, goodsName: '大米(KG/--/--)', customerName: '第七中学', canteen: '初中部食堂', orderQty: 90, actualQty: 90, unit: 'KG', route: '北城一线', orderNo: 'DD202607300100015', orderTag: '营养餐', shipped: '否', progress: '100%', remark: '', stock: 520, status: 'SORTED', sorter: '王分拣', sortingAt: '2026-07-31 05:30', warehouse: '北区仓', category: '主食', shortage: '否', supplier: '粮油供应商', expectedAt: '2026-07-31 07:00' },
    { id: 'SORT-017', orderId: 'ORD-20260730-015', goodsCode: 'SP0300019', isNetVegetable: true, goodsName: '大白菜(斤/--/散装)', customerName: '第七中学', canteen: '初中部食堂', orderQty: 60, actualQty: 0, unit: '斤', route: '北城一线', orderNo: 'DD202607300100015', orderTag: '营养餐', shipped: '否', progress: '0%', remark: '', stock: 50, status: 'PENDING', sorter: '', sortingAt: '', warehouse: '北区仓', category: '果蔬', shortage: '否', supplier: '绿源供应商', expectedAt: '2026-07-31 07:00' },
    { id: 'SORT-018', orderId: 'ORD-20260730-015', goodsCode: 'SP0300018', isNetVegetable: false, goodsName: '鸡蛋(斤/农家/500g份)', customerName: '第七中学', canteen: '初中部食堂', orderQty: 45, actualQty: 45, unit: '斤', route: '北城一线', orderNo: 'DD202607300100015', orderTag: '营养餐', shipped: '否', progress: '100%', remark: '', stock: 130, status: 'SORTED', sorter: '王分拣', sortingAt: '2026-07-31 05:40', warehouse: '北区仓', category: '蛋奶类', shortage: '否', supplier: '新鲜农场', expectedAt: '2026-07-31 07:00' },

    // 机关第一食堂 / 一号食堂 (西城一线, 中心仓) - expectedAt: 2026-07-31
    { id: 'SORT-019', orderId: 'ORD-20260730-020', goodsCode: 'SP0300015', isNetVegetable: false, goodsName: '猪肉(斤/双汇/500g份)', customerName: '机关第一食堂', canteen: '一号食堂', orderQty: 30, actualQty: 30, unit: '斤', route: '西城一线', orderNo: 'DD202607300100020', orderTag: '普通餐', shipped: '否', progress: '100%', remark: '', stock: 120, status: 'SORTED', sorter: '陈分拣', sortingAt: '2026-07-31 06:00', warehouse: '中心仓', category: '肉类', shortage: '否', supplier: '肉联供应商', expectedAt: '2026-07-31 09:00' },
    { id: 'SORT-020', orderId: 'ORD-20260730-020', goodsCode: 'SP0300029', isNetVegetable: false, goodsName: '鲫鱼(斤/--/--)', customerName: '机关第一食堂', canteen: '一号食堂', orderQty: 15, actualQty: 0, unit: '斤', route: '西城一线', orderNo: 'DD202607300100020', orderTag: '普通餐', shipped: '否', progress: '0%', remark: '', stock: 5, status: 'PENDING', sorter: '', sortingAt: '', warehouse: '中心仓', category: '水产品', shortage: '否', supplier: '海鲜供应商', expectedAt: '2026-07-31 09:00' },

    // 育才中学 / 初中部食堂 (北城一线, 北区仓) - expectedAt: 2026-07-31
    { id: 'SORT-021', orderId: 'ORD-20260730-022', goodsCode: 'SP0300040', isNetVegetable: false, goodsName: '土豆(斤/农家优选/500g份)', customerName: '育才中学', canteen: '初中部食堂', orderQty: 70, actualQty: 70, unit: '斤', route: '北城一线', orderNo: 'DD202607300100022', orderTag: '营养餐', shipped: '否', progress: '100%', remark: '', stock: 180, status: 'SORTED', sorter: '王分拣', sortingAt: '2026-07-31 05:45', warehouse: '北区仓', category: '果蔬', shortage: '否', supplier: '绿源供应商', expectedAt: '2026-07-31 07:00' },
    { id: 'SORT-022', orderId: 'ORD-20260730-022', goodsCode: 'SP0300020', isNetVegetable: true, goodsName: '西红柿(KG/--/--)', customerName: '育才中学', canteen: '初中部食堂', orderQty: 25, actualQty: 0, unit: 'KG', route: '北城一线', orderNo: 'DD202607300100022', orderTag: '营养餐', shipped: '否', progress: '0%', remark: '', stock: 0, status: 'SHORTAGE', sorter: '', sortingAt: '', warehouse: '北区仓', category: '果蔬', shortage: '是', supplier: '绿源供应商', expectedAt: '2026-07-31 07:00' },

    // 阳光幼儿园 / 分园食堂 (南城二线, 中心仓) - expectedAt: 2026-07-31
    { id: 'SORT-023', orderId: 'ORD-20260730-025', goodsCode: 'SP0300037', isNetVegetable: true, goodsName: '牛奶(瓶/三元/--)', customerName: '阳光幼儿园', canteen: '分园食堂', orderQty: 60, actualQty: 60, unit: '瓶', route: '南城二线', orderNo: 'DD202607300100025', orderTag: '普通餐', shipped: '否', progress: '100%', remark: '', stock: 320, status: 'SORTED', sorter: '李分拣', sortingAt: '2026-07-31 06:25', warehouse: '中心仓', category: '蛋奶类', shortage: '否', supplier: '乳业供应商', expectedAt: '2026-07-31 08:00' },
    { id: 'SORT-024', orderId: 'ORD-20260730-025', goodsCode: 'SP0300014', isNetVegetable: false, goodsName: '苹果(斤/--/--)', customerName: '阳光幼儿园', canteen: '分园食堂', orderQty: 40, actualQty: 40, unit: '斤', route: '南城二线', orderNo: 'DD202607300100025', orderTag: '普通餐', shipped: '否', progress: '100%', remark: '', stock: 180, status: 'SORTED', sorter: '李分拣', sortingAt: '2026-07-31 06:30', warehouse: '中心仓', category: '果蔬', shortage: '否', supplier: '绿源供应商', expectedAt: '2026-07-31 08:00' }
  ];

  // 为分拣列表中存在但订单档案尚未建模的订单补齐可下钻详情数据。
  const orderIds = new Set(orders.map((order) => order.orderNo));
  const missingSortingOrders = sortingItems.filter((item) => !orderIds.has(item.orderNo));
  const missingOrderGroups = new Map();
  missingSortingOrders.forEach((item) => {
    if (!missingOrderGroups.has(item.orderNo)) missingOrderGroups.set(item.orderNo, []);
    missingOrderGroups.get(item.orderNo).push(item);
  });
  missingOrderGroups.forEach((group, orderNo) => {
    const first = group[0];
    const items = group.map((item) => ({
      goodsName: String(item.goodsName || '').replace(/\([^)]*\)$/, ''),
      isNetVegetable: Boolean(item.isNetVegetable),
      goodsCode: item.goodsCode,
      unit: item.unit || '--',
      brand: '--',
      spec: '--',
      unitPrice: 0,
      quantity: Number(item.orderQty || 0),
      subtotal: 0,
      shippedQty: item.shipped === '是' ? Number(item.actualQty || 0) : 0,
      shippedAmount: 0,
      returnQty: 0,
      returnAmount: 0,
      reconciliationQty: 0,
      reconciliationAmount: 0,
      acceptedQty: Number(item.actualQty || 0),
      acceptedAmount: 0,
      remark: item.remark || '',
      productionDate: String(item.expectedAt || '').slice(0, 10),
      inspectionImages: [],
      inspectionVideos: []
    }));
    orders.push({
      id: first.orderId || `ORD-SORT-${orderNo}`,
      orderNo,
      customerName: first.customerName || '--',
      canteen: first.canteen || '--',
      customerType: '学校',
      orderTag: first.orderTag || '普通餐',
      orderAmount: 0,
      shippingAmount: 0,
      returnAmount: 0,
      reconciliationAmount: 0,
      expectedAt: first.expectedAt || '',
      status: group.every((item) => Number(item.actualQty || 0) >= Number(item.orderQty || 0)) ? 'COMPLETED' : 'PENDING',
      receiptStatus: '待收货',
      productCount: items.length,
      warehouse: first.warehouse || '',
      supplement: '否',
      remark: '',
      route: first.route || '',
      driver: '',
      source: '客户下单',
      creator: '系统模拟',
      createdAt: first.expectedAt || '',
      items,
      operationLogs: []
    });
  });

  const sortingProgress = [
    { id: 'SPG-001', customerName: '第一实验学校', canteen: '第一食堂', sortedCount: 2, orderCount: 4, progress: '2/4', status: 'PARTIAL', warehouse: '中心仓', expectedAt: '2026-07-31 07:30', route: '东城一线', consignee: '王老师', consigneePhone: '13800002001', consigneeAddress: '东城教育路18号' },
    { id: 'SPG-002', customerName: '阳光幼儿园', canteen: '园区食堂', sortedCount: 2, orderCount: 3, progress: '2/3', status: 'PARTIAL', warehouse: '中心仓', expectedAt: '2026-07-31 08:00', route: '南城二线', consignee: '李老师', consigneePhone: '13800002002', consigneeAddress: '南城阳光路8号' },
    { id: 'SPG-003', customerName: '育才中学', canteen: '高中部食堂', sortedCount: 2, orderCount: 3, progress: '2/3', status: 'PARTIAL', warehouse: '北区仓', expectedAt: '2026-07-31 07:00', route: '北城一线', consignee: '赵老师', consigneePhone: '13800002003', consigneeAddress: '北城育才路66号' },
    { id: 'SPG-004', customerName: '第三小学', canteen: '校园食堂', sortedCount: 2, orderCount: 3, progress: '2/3', status: 'PARTIAL', warehouse: '中心仓', expectedAt: '2026-07-31 07:30', route: '东城一线', consignee: '孙老师', consigneePhone: '13800002004', consigneeAddress: '东城文化路25号' },
    { id: 'SPG-005', customerName: '实验幼儿园', canteen: '食堂', sortedCount: 1, orderCount: 2, progress: '1/2', status: 'PARTIAL', warehouse: '中心仓', expectedAt: '2026-07-31 08:30', route: '南城二线', consignee: '周老师', consigneePhone: '13800002005', consigneeAddress: '南城实验路12号' },
    { id: 'SPG-006', customerName: '第七中学', canteen: '初中部食堂', sortedCount: 2, orderCount: 3, progress: '2/3', status: 'PARTIAL', warehouse: '北区仓', expectedAt: '2026-07-31 07:00', route: '北城一线', consignee: '吴老师', consigneePhone: '13800002006', consigneeAddress: '北城第七路99号' },
    { id: 'SPG-007', customerName: '机关第一食堂', canteen: '一号食堂', sortedCount: 1, orderCount: 2, progress: '1/2', status: 'PARTIAL', warehouse: '中心仓', expectedAt: '2026-07-31 09:00', route: '西城一线', consignee: '郑主任', consigneePhone: '13800002007', consigneeAddress: '西城政府路3号' },
    { id: 'SPG-008', customerName: '育才中学', canteen: '初中部食堂', sortedCount: 1, orderCount: 2, progress: '1/2', status: 'PARTIAL', warehouse: '北区仓', expectedAt: '2026-07-31 07:00', route: '北城一线', consignee: '赵老师', consigneePhone: '13800002008', consigneeAddress: '北城育才路66号' },
    { id: 'SPG-009', customerName: '阳光幼儿园', canteen: '分园食堂', sortedCount: 2, orderCount: 2, progress: '2/2', status: 'SORTED', warehouse: '中心仓', expectedAt: '2026-07-31 08:00', route: '南城二线', consignee: '李老师', consigneePhone: '13800002009', consigneeAddress: '南城阳光路8号附1号' }
  ];

  // 客户分拣按客户汇总商品；“是否净菜”按该客户是否包含净菜商品汇总。
  const netVegetableByCustomer = new Map();
  sortingItems.forEach((item) => {
    const key = `${item.customerName || ''}::${item.canteen || ''}`;
    netVegetableByCustomer.set(key, Boolean(netVegetableByCustomer.get(key) || item.isNetVegetable));
  });
  sortingProgress.forEach((item) => {
    const key = `${item.customerName || ''}::${item.canteen || ''}`;
    item.isNetVegetable = Boolean(netVegetableByCustomer.get(key));
  });

  const shortageItems = sortingItems.filter((item) => item.shortage === '是').map((item) => ({
    ...item,
    status: 'SHORTAGE',
    shortageQty: item.orderQty - item.actualQty,
    purchaseOrder: item.id === 'SORT-005' ? 'CG202607300018' : ''
  }));
  shortageItems.push({
    id: 'SHORT-002',
    goodsName: '西红柿(KG/--/--)',
    category: '果蔬',
    supplier: '绿源供应商',
    customerName: '第一实验学校',
    canteen: '第一食堂',
    warehouse: '中心仓',
    orderQty: 45,
    actualQty: 20,
    shortageQty: 25,
    unit: 'KG',
    route: '东城一线',
    orderNo: 'XS202607300001',
    purchaseOrder: '',
    expectedAt: '2026-07-31 07:30',
    status: 'SHORTAGE',
    createdAt: '2026-07-30 15:50'
  });

  const sorters = [
    { id: 'SRT-001', sorterCode: 'FJ0001', sorterName: '陈分拣', username: 'chenfenjian', role: '分拣员', phone: '13800001121', warehouse: '中心仓', status: 'ENABLE', createdAt: '2026-03-20 10:12:00' },
    { id: 'SRT-002', sorterCode: 'FJ0002', sorterName: '李分拣', username: 'lifenjian', role: '分拣员', phone: '13800001122', warehouse: '中心仓', status: 'ENABLE', createdAt: '2026-03-20 10:16:00' },
    { id: 'SRT-003', sorterCode: 'FJ0003', sorterName: '王分拣', username: 'wangfenjian', role: '分拣组长', phone: '13800001123', warehouse: '北区仓', status: 'DISABLE', createdAt: '2026-04-09 09:06:00' }
  ];

  const warehouses = [
    { id: 'WH-001', warehouseCode: 'CK0163824', enterpriseCode: '01', warehouseName: '中心仓', operatingCompanyIds: ['COMP-SUB-001', 'COMP-SUB-002'], address: '上海市浦东新区集采路18号', manager: '周仓管', phone: '13800001001', status: 'ENABLE', referenced: true, createdAt: '2025-10-18 09:30:00' },
    { id: 'WH-002', warehouseCode: 'CK0148176', enterpriseCode: '01', warehouseName: '北区仓', operatingCompanyIds: ['COMP-SUB-002'], address: '上海市宝山区配送路6号', manager: '陈仓管', phone: '13800001002', status: 'ENABLE', referenced: true, createdAt: '2025-11-06 14:22:00' },
    { id: 'WH-003', warehouseCode: 'CK0193052', enterpriseCode: '01', warehouseName: '临时仓', operatingCompanyIds: ['COMP-SUB-001'], address: '上海市嘉定区临仓路9号', manager: '李仓管', phone: '13800001003', status: 'DISABLE', referenced: false, createdAt: '2026-06-12 11:03:00' }
  ];

  const shippingOrders = [
    { id: 'SHIP-001', orderNo: 'XS202607300001', customerName: '第一实验学校', canteen: '第一食堂', receiver: '王老师', phone: '13800002001', address: '东城教育路18号', route: '东城一线', shippingAmount: 0, printed: '否', status: 'PENDING', sortingStatus: '部分分拣', warehouse: '中心仓', expectedAt: '2026-07-31 07:30', orderTag: '营养餐' },
    { id: 'SHIP-002', orderNo: 'XS202607290012', customerName: '阳光幼儿园', canteen: '园区食堂', receiver: '李老师', phone: '13800002002', address: '南城阳光路8号', route: '南城二线', shippingAmount: 1520, printed: '是', status: 'SHIPPED', sortingStatus: '已分拣', warehouse: '中心仓', expectedAt: '2026-07-30 08:00', orderTag: '普通餐' }
  ];

  const shippingDifferences = [
    { id: 'DIFF-001', orderNo: 'XS202607300001', goodsName: '大白菜(斤/--/--)', warehouse: '中心仓', stockQty: 236, sortingQty: 80, differenceQty: 156, status: 'PENDING', createdAt: '2026-07-30 15:40' },
    { id: 'DIFF-002', orderNo: 'XS202607290012', goodsName: '鲫鱼(斤/--/--)', warehouse: '中心仓', stockQty: 8, sortingQty: 20, differenceQty: -12, status: 'PENDING', createdAt: '2026-07-30 15:42' }
  ];

  const qualityReports = [
    { id: 'QR-001', inboundAt: '2026-07-30 06:20', inboundNo: 'RK202607300009', goodsCode: 'SP0300029', goodsName: '鲫鱼(斤/--/--)', isNetVegetable: false, partner: '海鲜供应商', inboundType: '采购入库', warehouse: '中心仓', reportStatus: '未上传', reportName: '', createdAt: '2026-07-30 06:20' },
    { id: 'QR-002', inboundAt: '2026-07-29 05:40', inboundNo: 'RK202607290016', goodsCode: 'SP0300025', goodsName: '大米(KG/--/--)', isNetVegetable: false, partner: '粮油供应商', inboundType: '采购入库', warehouse: '北区仓', reportStatus: '已上传', reportName: '大米质检报告.pdf', createdAt: '2026-07-29 05:40' }
  ];

  const inventoryCounts = [
    { id: 'COUNT-001', countNo: 'PD202607300001', countAt: '2026-07-30 14:00', warehouse: '中心仓', lossAmount: 86.5, overflowAmount: 22, counter: '周仓管', status: 'PENDING', creator: '管理员', createdAt: '2026-07-30 14:10', remark: '', items: [{ goodsCode: 'SP0300019', goodsName: '大白菜', category: '果蔬-叶菜类', unit: '斤', bookQty: 236, countQty: 196, costPrice: 2.16 }, { goodsCode: 'SP0300018', goodsName: '鸡蛋', category: '蛋奶类', unit: '斤', bookQty: 109, countQty: 113, costPrice: 5.5 }] },
    { id: 'COUNT-002', countNo: 'PD202607250003', countAt: '2026-07-25 16:00', warehouse: '北区仓', lossAmount: 0, overflowAmount: 128, counter: '陈仓管', status: 'APPROVED', creator: '管理员', createdAt: '2026-07-25 16:35', remark: '', items: [{ goodsCode: 'SP0300025', goodsName: '大米', category: '主食-粮食类', unit: 'KG', bookQty: 520, countQty: 550, costPrice: 4.27 }] },
    { id: 'COUNT-003', countNo: 'PD202607180002', countAt: '2026-07-18 15:30', warehouse: '中心仓', lossAmount: 30, overflowAmount: 0, counter: '周仓管', status: 'CLOSED', creator: '管理员', createdAt: '2026-07-18 16:02' }
  ];

  const inventoryLosses = [
    { id: 'LOSS-001', lossNo: 'SY202607300001', createdAt: '2026-07-30 16:10', type: '盘损', relationNo: 'PD202607300001', productCount: 1, amount: 86.4, warehouse: '中心仓', status: 'PENDING', creator: '周仓管', remark: '', items: [{ goodsCode: 'SP0300019', goodsName: '大白菜', unit: '斤', quantity: 40, price: 2.16, amount: 86.4, reason: '盘点差异' }] },
    { id: 'LOSS-002', lossNo: 'SY202607250002', createdAt: '2026-07-25 17:02', type: '盘溢', relationNo: 'PD202607250003', productCount: 1, amount: 128.1, warehouse: '北区仓', status: 'APPROVED', creator: '陈仓管', remark: '', items: [{ goodsCode: 'SP0300025', goodsName: '大米', unit: 'KG', quantity: 30, price: 4.27, amount: 128.1, reason: '盘点差异' }] }
  ];

  const openingInventory = [
    { id: 'OPEN-001', goodsCode: 'SP0300019', goodsName: '大白菜(斤/--/--)', category: '果蔬-果蔬二级', unit: '斤', openingQty: 200, openingPrice: 2.1, openingAmount: 420, inputType: '手工录入', warehouse: '中心仓', status: 'COMPLETED' },
    { id: 'OPEN-002', goodsCode: 'SP0300018', goodsName: '鸡蛋(斤/--/--)', category: '蛋奶类-蛋奶类二级', unit: '斤', openingQty: 100, openingPrice: 5.6, openingAmount: 560, inputType: '导入', warehouse: '中心仓', status: 'COMPLETED' },
    { id: 'OPEN-003', goodsCode: 'SP0300025', goodsName: '大米(KG/--/--)', category: '主食-粮食类', unit: 'KG', openingQty: 500, openingPrice: 4.2, openingAmount: 2100, inputType: '手工录入', warehouse: '北区仓', status: 'COMPLETED' }
  ];

  const inventoryBalance = [
    { id: 'BAL-001', goodsCode: 'SP0300019', goodsName: '大白菜(斤/--/--)', category: '果蔬-果蔬二级', warehouse: '中心仓', unit: '斤', transitStock: 80, currentStock: 236, averageCost: 2.18, totalAmount: 514.48, upperLimit: 500, lowerLimit: 80 },
    { id: 'BAL-002', goodsCode: 'SP0300018', goodsName: '鸡蛋(斤/--/--)', category: '蛋奶类-蛋奶类二级', warehouse: '中心仓', unit: '斤', transitStock: 0, currentStock: 109, averageCost: 5.72, totalAmount: 623.48, upperLimit: 300, lowerLimit: 60 },
    { id: 'BAL-003', goodsCode: 'SP0300025', goodsName: '大米(KG/--/--)', category: '主食-粮食类', warehouse: '北区仓', unit: 'KG', transitStock: 200, currentStock: 520, averageCost: 4.35, totalAmount: 2262, upperLimit: 1000, lowerLimit: 200 },
    { id: 'BAL-004', goodsCode: 'SP0300029', goodsName: '鲫鱼(斤/--/--)', category: '水产品-水产品二级', warehouse: '中心仓', unit: '斤', transitStock: 30, currentStock: 8, averageCost: 14.8, totalAmount: 118.4, upperLimit: 120, lowerLimit: 20 }
  ];

  const inventoryDetails = [
    { id: 'DET-001', goodsCode: 'SP0300019', goodsName: '大白菜(斤/--/--)', category: '果蔬-果蔬二级', warehouse: '中心仓', documentType: '采购入库', relationNo: 'RK202607300011', occurredAt: '2026-07-30 06:35', unit: '斤', occurredQty: 100, occurredAmount: 220, partner: '绿源供应商', productionDate: '2026-07-30', shelfLife: '3天', expiryDate: '2026-08-02', balance: 236, qualification: '已上传', remark: '' },
    { id: 'DET-002', goodsCode: 'SP0300019', goodsName: '大白菜(斤/--/--)', category: '果蔬-果蔬二级', warehouse: '中心仓', documentType: '销售出库', relationNo: 'CK202607300008', occurredAt: '2026-07-30 07:10', unit: '斤', occurredQty: -80, occurredAmount: -176, partner: '第一实验学校', productionDate: '2026-07-30', shelfLife: '3天', expiryDate: '2026-08-02', balance: 156, qualification: '已上传', remark: '订单出库' },
    { id: 'DET-003', goodsCode: 'SP0300025', goodsName: '大米(KG/--/--)', category: '主食-粮食类', warehouse: '北区仓', documentType: '期初库存', relationNo: 'QC202607010001', occurredAt: '2026-07-01 00:00', unit: 'KG', occurredQty: 500, occurredAmount: 2100, partner: '--', productionDate: '2026-06-20', shelfLife: '12个月', expiryDate: '2027-06-20', balance: 500, qualification: '已上传', remark: '' }
  ];

  // 7 月 31 日订单加工演示：西兰花块暂未配置加工方案，用于验证缺失提示。
  const simulatedOrder = {
    id: 'ORD-SIM-20260731-001',
    orderNo: 'DD202607310100099',
    customerName: '模拟测试学校',
    canteen: '模拟食堂',
    customerType: '学校',
    orderTag: '营养餐',
    orderAmount: 156,
    shippingAmount: 0,
    returnAmount: 0,
    reconciliationAmount: 0,
    expectedAt: '2026-07-31 10:00',
    status: 'CONFIRMED',
    receiptStatus: '待收货',
    productCount: 1,
    warehouse: '中心仓',
    supplement: '否',
    remark: '模拟数据：用于验证净菜加工方案缺失提示',
    route: '模拟线路',
    driver: '',
    source: '模拟数据',
    creator: '管理员',
    items: [{
      goodsName: '西兰花块',
      isNetVegetable: true,
      goodsCode: 'SP0300061',
      unit: '斤',
      brand: '--',
      spec: '散装',
      unitPrice: 7.8,
      quantity: 20,
      subtotal: 156,
      shippedQty: 20,
      actualQty: 20,
      remark: ''
    }]
  };
  const simulatedSortingItem = {
    id: 'SORT-SIM-20260731-001',
    orderId: simulatedOrder.id,
    goodsCode: 'SP0300061',
    isNetVegetable: true,
    goodsName: '西兰花块',
    customerName: simulatedOrder.customerName,
    canteen: simulatedOrder.canteen,
    orderQty: 20,
    actualQty: 20,
    unit: '斤',
    route: simulatedOrder.route,
    orderNo: simulatedOrder.orderNo,
    orderTag: simulatedOrder.orderTag,
    shipped: '否',
    progress: '100%',
    remark: simulatedOrder.remark,
    stock: 0,
    status: 'SORTED',
    sorter: '陈分拣',
    sortingAt: '2026-07-31 08:30',
    warehouse: simulatedOrder.warehouse,
    category: '净菜加工',
    shortage: '否',
    supplier: '净菜加工演示供应商',
    expectedAt: simulatedOrder.expectedAt
  };

  // 7 月 31 日订单加工演示：同时覆盖一对多、多对一方案的成品需求。
  const processingDemoOrder = {
    id: 'ORD-PROCESS-20260731-001',
    orderNo: 'DD202607310300001',
    customerName: '加工演示学校',
    canteen: '加工演示食堂',
    customerType: '学校',
    orderTag: '营养餐',
    orderAmount: 630.5,
    shippingAmount: 0,
    returnAmount: 0,
    reconciliationAmount: 0,
    expectedAt: '2026-07-31 10:30',
    status: 'CONFIRMED',
    receiptStatus: '待收货',
    productCount: 4,
    warehouse: '中心仓',
    supplement: '否',
    remark: '模拟数据：用于验证订单加工方案匹配与缺失提示',
    route: '加工演示线路',
    driver: '',
    source: '模拟数据',
    creator: '管理员',
    createdAt: '2026-07-30 09:30:00',
    items: [
      { goodsName: '土豆丝', isNetVegetable: true, goodsCode: 'SP0300039', unit: '斤', quantity: 40, shippedQty: 40, actualQty: 40, unitPrice: 4.8, subtotal: 192, remark: '' },
      { goodsName: '白菜段', isNetVegetable: true, goodsCode: 'SP0300051', unit: '斤', quantity: 30, shippedQty: 30, actualQty: 30, unitPrice: 3.2, subtotal: 96, remark: '' },
      { goodsName: '胡萝卜片', isNetVegetable: true, goodsCode: 'SP0300055', unit: '斤', quantity: 25, shippedQty: 25, actualQty: 25, unitPrice: 4.6, subtotal: 115, remark: '' },
      { goodsName: '什锦配菜', isNetVegetable: true, goodsCode: 'SP0300059', unit: '斤', quantity: 35, shippedQty: 35, actualQty: 35, unitPrice: 6.5, subtotal: 227.5, remark: '' }
    ]
  };
  const processingDemoSortingItems = [
    { id: 'SORT-PROCESS-20260731-001', goodsCode: 'SP0300039', goodsName: '土豆丝(斤/--/散装)', unit: '斤', orderQty: 40, actualQty: 40, category: '净菜' },
    { id: 'SORT-PROCESS-20260731-002', goodsCode: 'SP0300051', goodsName: '白菜段(斤/--/散装)', unit: '斤', orderQty: 30, actualQty: 30, category: '净菜' },
    { id: 'SORT-PROCESS-20260731-003', goodsCode: 'SP0300055', goodsName: '胡萝卜片(斤/--/散装)', unit: '斤', orderQty: 25, actualQty: 25, category: '净菜' },
    { id: 'SORT-PROCESS-20260731-004', goodsCode: 'SP0300059', goodsName: '什锦配菜(斤/--/散装)', unit: '斤', orderQty: 35, actualQty: 35, category: '净菜' }
  ].map((item, index) => ({
    ...item,
    orderId: processingDemoOrder.id,
    isNetVegetable: true,
    customerName: processingDemoOrder.customerName,
    canteen: processingDemoOrder.canteen,
    route: processingDemoOrder.route,
    orderNo: processingDemoOrder.orderNo,
    orderTag: processingDemoOrder.orderTag,
    shipped: '否',
    progress: '100%',
    remark: processingDemoOrder.remark,
    stock: item.actualQty,
    status: 'SORTED',
    sorter: '陈分拣',
    sortingAt: `2026-07-31 08:${String(40 + index * 3).padStart(2, '0')}`,
    warehouse: processingDemoOrder.warehouse,
    shortage: '否',
    supplier: '净菜加工演示供应商',
    expectedAt: processingDemoOrder.expectedAt
  }));

  orders.unshift(processingDemoOrder, simulatedOrder);
  sortingItems.unshift(...processingDemoSortingItems, simulatedSortingItem);

  const productSales = [
    {
      id: 'SALE-001',
      goodsCode: 'SP0300039',
      goodsName: '土豆丝(斤/--/散装)',
      isNetVegetable: true,
      category: '果蔬',
      fullCategory: '果蔬-净菜类',
      unit: '斤',
      orderCount: 4,
      orderQty: 120,
      orderAmount: 576,
      shippedQty: 110,
      shippedAmount: 528,
      returnCount: 0,
      returnQty: 0,
      returnAmount: 0,
      actualAmount: 528,
      actualRank: 1,
      warehouse: '中心仓',
      businessUnit: '学校',
      customerType: '学校',
      customerName: '第一实验学校',
      canteen: '第一食堂',
      createdAt: '2026-08-01 08:00:00'
    },
    {
      id: 'SALE-002',
      goodsCode: 'SP0300040',
      goodsName: '土豆(斤/田园直供/散装)',
      isNetVegetable: false,
      category: '果蔬',
      fullCategory: '果蔬-根茎类',
      unit: '斤',
      orderCount: 3,
      orderQty: 95,
      orderAmount: 304,
      shippedQty: 95,
      shippedAmount: 304,
      returnCount: 0,
      returnQty: 0,
      returnAmount: 0,
      actualAmount: 304,
      actualRank: 2,
      warehouse: '中心仓',
      businessUnit: '学校',
      customerType: '学校',
      customerName: '育才中学',
      canteen: '高中部食堂',
      createdAt: '2026-08-02 08:00:00'
    },
    {
      id: 'SALE-003',
      goodsCode: 'SP0300025',
      goodsName: '大米(KG/--/--)',
      isNetVegetable: false,
      category: '主食',
      fullCategory: '主食-粮食类',
      unit: 'KG',
      orderCount: 2,
      orderQty: 160,
      orderAmount: 3040,
      shippedQty: 160,
      shippedAmount: 3040,
      returnCount: 1,
      returnQty: 10,
      returnAmount: 190,
      actualAmount: 2850,
      actualRank: 3,
      warehouse: '北区仓',
      businessUnit: '学校',
      customerType: '学校',
      customerName: '育才中学',
      canteen: '高中部食堂',
      createdAt: '2026-08-03 08:00:00'
    }
  ];

  const goodsProfitStatistics = [
    {
      id: 'PROFIT-001',
      goodsCode: 'SP0300039',
      goodsName: '土豆丝(斤/--/散装)',
      isNetVegetable: true,
      category: '果蔬',
      warehouse: '中心仓',
      unit: '斤',
      orderCount: 4,
      sendQty: 110,
      sendAvgPrice: 4.80,
      sendAmt: 528,
      sendCostAvgPrice: 3.20,
      sendCost: 352,
      returnOrderCount: 0,
      returnQty: 0,
      returnAmt: 0,
      returnCost: 0,
      actualQty: 110,
      actualAvgPrice: 4.80,
      actualAmt: 528,
      actualCost: 352,
      grossProfit: 176,
      grossProfitRate: '33.33%',
      businessUnit: '学校',
      customerType: '学校',
      customerName: '第一实验学校',
      canteen: '第一食堂',
      orderNo: 'DD202608010100001',
      createdAt: '2026-08-01 08:00:00'
    },
    {
      id: 'PROFIT-002',
      goodsCode: 'SP0300040',
      goodsName: '土豆(斤/田园直供/散装)',
      isNetVegetable: false,
      category: '果蔬',
      warehouse: '中心仓',
      unit: '斤',
      orderCount: 3,
      sendQty: 95,
      sendAvgPrice: 3.20,
      sendAmt: 304,
      sendCostAvgPrice: 2.10,
      sendCost: 199.50,
      returnOrderCount: 0,
      returnQty: 0,
      returnAmt: 0,
      returnCost: 0,
      actualQty: 95,
      actualAvgPrice: 3.20,
      actualAmt: 304,
      actualCost: 199.50,
      grossProfit: 104.50,
      grossProfitRate: '34.38%',
      businessUnit: '学校',
      customerType: '学校',
      customerName: '育才中学',
      canteen: '高中部食堂',
      orderNo: 'DD202608020100002',
      createdAt: '2026-08-02 08:00:00'
    }
  ];

  window.MockOperations = {
    orders,
    returns,
    tags,
    receiptChanges,
    sortingItems,
    sortingProgress,
    shortageItems,
    sorters,
    warehouses,
    shippingOrders,
    shippingDifferences,
    qualityReports,
    inventoryCounts,
    inventoryLosses,
    openingInventory,
    inventoryBalance,
    inventoryDetails,
    productSales,
    goodsProfitStatistics
  };
})();

/* 入库单资料 */
(function () {
  window.MockInboundOrders = [
    {
      id: 'RKD202607280300001',
      entryTime: '2026-07-28 17:27:56',
      supplierPurchaserCustomerName: '上海绿源农产品有限公司',
      entryType: '采购入库',
      entryAmt: '856.00',
      warehouseName: '生鲜仓库',
      relNo: 'CGD202607280300001',
      expectedDeliveryDate: '2026-07-28',
      status: '已完成',
      purchaserLeaderName: '杨',
      creator: '杨',
      remark: '生鲜日配，到货正常',
      attachments: [
        { name: '入库验收单.pdf', format: 'pdf', size: '128KB' },
        { name: '现场照片.jpg', format: 'jpg', size: '856KB' }
      ],
      operationLogs: [
        { action: '添加', operator: '杨', desc: '杨 添加入库单 2026-07-28 17:27:56' },
        { action: '提交审核', operator: '杨', desc: '杨 提交审核 2026-07-28 17:32:00' },
        { action: '审核', operator: '张三', desc: '张三 审核通过 2026-07-28 18:05:11' },
        { action: '完成', operator: '系统', desc: '系统 标记完成 2026-07-28 18:06:30' }
      ],
      items: [
        { productCode: 'SP0300036', productName: '大玉米棒子', unit: 'KG', brand: '--', spec: '--', conversionRate: 1, expectedQty: 50, damageQty: 0, actualQty: 50, unitPrice: '5.00', amount: '250.00', productionDate: '2026-07-27', qualityFiles: [{ name: '质检报告1.pdf' }, { name: '检测照片.jpg' }] },
        { productCode: 'SP0300020', productName: '西红柿', unit: 'KG', brand: '--', spec: '--', conversionRate: 1, expectedQty: 30, damageQty: 1, actualQty: 29, unitPrice: '20.00', amount: '580.00', productionDate: '2026-07-27', qualityFiles: [{ name: '质检合格证.pdf' }] }
      ]
    },
    {
      id: 'RKD202607280300002',
      entryTime: '2026-07-28 15:10:22',
      supplierPurchaserCustomerName: '北方粮油批发部',
      entryType: '采购入库',
      entryAmt: '760.00',
      warehouseName: '公司市区仓库',
      relNo: 'CGD202607270300002',
      expectedDeliveryDate: '2026-07-28',
      status: '待审核',
      purchaserLeaderName: '杨',
      creator: '杨',
      remark: '大米验收入库，待审核',
      attachments: [],
      operationLogs: [
        { action: '添加', operator: '杨', desc: '杨 添加入库单 2026-07-28 15:10:22' },
        { action: '提交审核', operator: '杨', desc: '杨 提交审核 2026-07-28 15:12:00' }
      ],
      items: [
        { productCode: 'SP0300025', productName: '大米', unit: 'KG', brand: '--', spec: '--', conversionRate: 1, expectedQty: 40, damageQty: 0, actualQty: 40, unitPrice: '19.00', amount: '760.00', productionDate: '2026-07-20', qualityFiles: [] }
      ]
    },
    {
      id: 'RKD202607270300003',
      entryTime: '2026-07-27 09:45:30',
      supplierPurchaserCustomerName: '静安第1中学',
      entryType: '订单退货入库',
      entryAmt: '150.00',
      warehouseName: '生鲜仓库',
      relNo: 'DD202607260300005',
      expectedDeliveryDate: '2026-07-27',
      status: '已完成',
      purchaserLeaderName: '杨',
      creator: '杨',
      remark: '客户退货，商品完好可二次销售',
      attachments: [
        { name: '退货说明.docx', format: 'docx', size: '64KB' }
      ],
      operationLogs: [
        { action: '添加', operator: '杨', desc: '杨 添加入库单 2026-07-27 09:45:30' },
        { action: '提交审核', operator: '杨', desc: '杨 提交审核 2026-07-27 09:50:00' },
        { action: '审核', operator: '李四', desc: '李四 审核通过 2026-07-27 10:20:15' },
        { action: '完成', operator: '系统', desc: '系统 标记完成 2026-07-27 10:21:00' }
      ],
      items: [
        { productCode: 'SP0300014', productName: '苹果', unit: '斤', brand: '--', spec: '--', conversionRate: 1, expectedQty: 0, damageQty: 0, actualQty: 6, unitPrice: '23.00', amount: '138.00', productionDate: '2026-07-24', qualityFiles: [] },
        { productCode: 'SP0300024', productName: '三元牛奶', unit: '瓶', brand: '三元', spec: '10瓶1箱', conversionRate: 1, expectedQty: 0, damageQty: 0, actualQty: 1, unitPrice: '10.00', amount: '10.00', productionDate: '2026-07-24', qualityFiles: [{ name: '出厂检验报告.pdf' }] }
      ]
    },
    {
      id: 'RKD202607270300004',
      entryTime: '2026-07-27 11:20:08',
      supplierPurchaserCustomerName: '--',
      entryType: '报溢入库',
      entryAmt: '45.00',
      warehouseName: '东南区域仓库',
      relNo: '--',
      expectedDeliveryDate: '--',
      status: '已完成',
      purchaserLeaderName: '--',
      creator: '杨',
      remark: '',
      attachments: [],
      operationLogs: [
        { action: '添加', operator: '杨', desc: '杨 添加入库单 2026-07-27 11:20:08' },
        { action: '提交审核', operator: '杨', desc: '杨 提交审核 2026-07-27 11:25:00' },
        { action: '审核', operator: '张三', desc: '张三 审核通过 2026-07-27 11:35:22' },
        { action: '完成', operator: '系统', desc: '系统 标记完成 2026-07-27 11:36:10' }
      ],
      items: [
        { productCode: 'SP0300018', productName: '鸡蛋', unit: '斤', brand: '--', spec: '--', conversionRate: 1, expectedQty: 0, damageQty: 0, actualQty: 2, unitPrice: '22.00', amount: '44.00', productionDate: '2026-07-25', qualityFiles: [] }
      ]
    },
    {
      id: 'RKD202607260300005',
      entryTime: '2026-07-26 14:35:12',
      supplierPurchaserCustomerName: '联营水产合作社',
      entryType: '联营采购入库',
      entryAmt: '300.00',
      warehouseName: '生鲜仓库',
      relNo: 'CGD202607260300010',
      expectedDeliveryDate: '2026-07-26',
      status: '待入库',
      purchaserLeaderName: '杨',
      creator: '杨',
      remark: '联营采购鲫鱼，等待到货',
      attachments: [],
      operationLogs: [
        { action: '添加', operator: '杨', desc: '杨 添加入库单 2026-07-26 14:35:12' }
      ],
      items: [
        { productCode: 'SP0300029', productName: '鲫鱼', unit: '斤', brand: '--', spec: '--', conversionRate: 1, expectedQty: 20, damageQty: 0, actualQty: 0, unitPrice: '15.00', amount: '300.00', productionDate: '', qualityFiles: [] }
      ]
    },
    {
      id: 'RKD202607250300006',
      entryTime: '2026-07-25 16:08:45',
      supplierPurchaserCustomerName: '上海绿源农产品有限公司',
      entryType: '采购入库',
      entryAmt: '468.00',
      warehouseName: '公司市区仓库',
      relNo: 'CGD202607250300006',
      expectedDeliveryDate: '2026-07-25',
      status: '已驳回',
      purchaserLeaderName: '杨',
      creator: '杨',
      remark: '玉米到货量与订单不符，已驳回',
      attachments: [
        { name: '质检报告.png', format: 'png', size: '320KB' }
      ],
      operationLogs: [
        { action: '添加', operator: '杨', desc: '杨 添加入库单 2026-07-25 16:08:45' },
        { action: '提交审核', operator: '杨', desc: '杨 提交审核 2026-07-25 16:13:00' },
        { action: '审核', operator: '李四', desc: '李四 驳回 2026-07-25 17:30:20' }
      ],
      items: [
        { productCode: 'SP0300036', productName: '大玉米棒子', unit: 'KG', brand: '--', spec: '--', conversionRate: 1, expectedQty: 60, damageQty: 0, actualQty: 45, unitPrice: '5.00', amount: '225.00', productionDate: '2026-07-24', qualityFiles: [{ name: '不合格报告.pdf' }] },
        { productCode: 'SP0300039', productName: '土豆丝', unit: '斤', brand: '--', spec: '--', conversionRate: 1, expectedQty: 25, damageQty: 2, actualQty: 23, unitPrice: '1.00', amount: '23.00', productionDate: '2026-07-24', qualityFiles: [{ name: '质检合格.pdf' }, { name: '现场照片.jpg' }] }
      ]
    },
    {
      id: 'RKD202607240300007',
      entryTime: '2026-07-24 10:50:33',
      supplierPurchaserCustomerName: '--',
      entryType: '单位转换入库',
      entryAmt: '110.00',
      warehouseName: '东南区域仓库',
      relNo: '--',
      expectedDeliveryDate: '--',
      status: '已完成',
      purchaserLeaderName: '--',
      creator: '杨',
      remark: '箱装牛奶转换为瓶装入库',
      attachments: [],
      operationLogs: [
        { action: '添加', operator: '杨', desc: '杨 添加入库单 2026-07-24 10:50:33' },
        { action: '提交审核', operator: '杨', desc: '杨 提交审核 2026-07-24 10:55:00' },
        { action: '审核', operator: '张三', desc: '张三 审核通过 2026-07-24 11:15:08' },
        { action: '完成', operator: '系统', desc: '系统 标记完成 2026-07-24 11:16:00' }
      ],
      items: [
        { productCode: 'SP0300024', productName: '三元牛奶', unit: '瓶', brand: '三元', spec: '10瓶1箱', conversionRate: 10, expectedQty: 0, damageQty: 0, actualQty: 11, unitPrice: '10.00', amount: '110.00', productionDate: '2026-07-20', qualityFiles: [] }
      ]
    },
    {
      id: 'RKD202607230300008',
      entryTime: '2026-07-23 17:15:00',
      supplierPurchaserCustomerName: '静安第11中学',
      entryType: '联营退货入库',
      entryAmt: '90.00',
      warehouseName: '生鲜仓库',
      relNo: 'DD202607220300012',
      expectedDeliveryDate: '2026-07-23',
      status: '已关闭',
      purchaserLeaderName: '杨',
      creator: '杨',
      remark: '联营客户退货，超期已关闭',
      attachments: [],
      operationLogs: [
        { action: '添加', operator: '杨', desc: '杨 添加入库单 2026-07-23 17:15:00' },
        { action: '关闭', operator: '系统', desc: '系统 超期自动关闭 2026-07-25 00:00:00' }
      ],
      items: [
        { productCode: 'SP0300014', productName: '苹果', unit: '斤', brand: '--', spec: '--', conversionRate: 1, expectedQty: 0, damageQty: 0, actualQty: 4, unitPrice: '23.00', amount: '92.00', productionDate: '2026-07-20', qualityFiles: [] }
      ]
    }
  ];
})();

/* 出库单资料 */
(function () {
  window.MockOutboundOrders = [
    {
      id: 'CKD202607280300001',
      outboundTime: '2026-07-28 16:45:20',
      outboundType: '销售出库',
      outboundAmt: '460.00',
      warehouseName: '生鲜仓库',
      supplierPurchaserCustomerName: '静安第1中学',
      relNo: 'DD202607280300001',
      status: '已完成',
      creator: '杨',
      remark: '学校食堂日常配送',
      attachments: [
        { name: '出库单.pdf', format: 'pdf', size: '96KB' },
        { name: '配送照片.jpg', format: 'jpg', size: '512KB' }
      ],
      operationLogs: [
        { action: '添加', operator: '杨', desc: '杨 添加出库单 2026-07-28 16:45:20' },
        { action: '提交审核', operator: '杨', desc: '杨 提交审核 2026-07-28 16:50:00' },
        { action: '审核', operator: '张三', desc: '张三 审核通过 2026-07-28 17:10:05' },
        { action: '完成', operator: '系统', desc: '系统 标记完成 2026-07-28 17:11:30' }
      ],
      items: [
        { productCode: 'SP0300020', productName: '西红柿', unit: 'KG', brand: '--', spec: '--', conversionRate: 1, currentStock: 120, outboundQty: 15, unitPrice: '20.00', amount: '300.00', remark: '' },
        { productCode: 'SP0300014', productName: '苹果', unit: '斤', brand: '--', spec: '--', conversionRate: 1, currentStock: 80, outboundQty: 7, unitPrice: '23.00', amount: '161.00', remark: '' }
      ]
    },
    {
      id: 'CKD202607280300002',
      outboundTime: '2026-07-28 14:20:10',
      outboundType: '销售出库',
      outboundAmt: '380.00',
      warehouseName: '公司市区仓库',
      supplierPurchaserCustomerName: '静安第2中学',
      relNo: 'DD202607280300002',
      status: '待出库',
      creator: '杨',
      remark: '待仓库备货出库',
      attachments: [],
      operationLogs: [
        { action: '添加', operator: '杨', desc: '杨 添加出库单 2026-07-28 14:20:10' }
      ],
      items: [
        { productCode: 'SP0300025', productName: '大米', unit: 'KG', brand: '--', spec: '--', conversionRate: 1, currentStock: 200, outboundQty: 20, unitPrice: '19.00', amount: '380.00', remark: '' }
      ]
    },
    {
      id: 'CKD202607270300003',
      outboundTime: '2026-07-27 10:15:30',
      outboundType: '销售出库',
      outboundAmt: '250.00',
      warehouseName: '生鲜仓库',
      supplierPurchaserCustomerName: '静安第11中学',
      relNo: 'DD202607270300003',
      status: '已完成',
      creator: '杨',
      remark: '食堂配送已完成',
      attachments: [
        { name: '签收单.jpg', format: 'jpg', size: '248KB' }
      ],
      operationLogs: [
        { action: '添加', operator: '杨', desc: '杨 添加出库单 2026-07-27 10:15:30' },
        { action: '提交审核', operator: '杨', desc: '杨 提交审核 2026-07-27 10:20:00' },
        { action: '审核', operator: '李四', desc: '李四 审核通过 2026-07-27 10:40:12' },
        { action: '完成', operator: '系统', desc: '系统 标记完成 2026-07-27 10:41:00' }
      ],
      items: [
        { productCode: 'SP0300036', productName: '大玉米棒子', unit: 'KG', brand: '--', spec: '--', conversionRate: 1, currentStock: 50, outboundQty: 50, unitPrice: '5.00', amount: '250.00', remark: '' }
      ]
    },
    {
      id: 'CKD202607270300004',
      outboundTime: '2026-07-27 15:33:42',
      outboundType: '采购退货出库',
      outboundAmt: '180.00',
      warehouseName: '公司市区仓库',
      supplierPurchaserCustomerName: '北方粮油批发部',
      relNo: 'CGD202607250300006',
      status: '待审核',
      creator: '杨',
      remark: '大米质量问题，退货待审核',
      attachments: [],
      operationLogs: [
        { action: '添加', operator: '杨', desc: '杨 添加出库单 2026-07-27 15:33:42' },
        { action: '提交审核', operator: '杨', desc: '杨 提交审核 2026-07-27 15:38:00' }
      ],
      items: [
        { productCode: 'SP0300025', productName: '大米', unit: 'KG', brand: '--', spec: '--', conversionRate: 1, currentStock: 180, outboundQty: 9, unitPrice: '19.00', amount: '171.00', remark: '临期退回' }
      ]
    },
    {
      id: 'CKD202607260300005',
      outboundTime: '2026-07-26 09:50:18',
      outboundType: '销售出库',
      outboundAmt: '330.00',
      warehouseName: '生鲜仓库',
      supplierPurchaserCustomerName: '静安第1中学',
      relNo: 'DD202607260300005',
      status: '已完成',
      creator: '杨',
      remark: '每日生鲜配送',
      attachments: [],
      operationLogs: [
        { action: '添加', operator: '杨', desc: '杨 添加出库单 2026-07-26 09:50:18' },
        { action: '提交审核', operator: '杨', desc: '杨 提交审核 2026-07-26 09:55:00' },
        { action: '审核', operator: '张三', desc: '张三 审核通过 2026-07-26 10:15:33' },
        { action: '完成', operator: '系统', desc: '系统 标记完成 2026-07-26 10:16:20' }
      ],
      items: [
        { productCode: 'SP0300018', productName: '鸡蛋', unit: '斤', brand: '--', spec: '--', conversionRate: 1, currentStock: 50, outboundQty: 15, unitPrice: '22.00', amount: '330.00', remark: '' }
      ]
    },
    {
      id: 'CKD202607260300006',
      outboundTime: '2026-07-26 11:40:05',
      outboundType: '联营采购出库',
      outboundAmt: '300.00',
      warehouseName: '生鲜仓库',
      supplierPurchaserCustomerName: '联营水产合作社',
      relNo: 'CGD202607260300010',
      status: '已完成',
      creator: '杨',
      remark: '联营出库给合作方',
      attachments: [],
      operationLogs: [
        { action: '添加', operator: '杨', desc: '杨 添加出库单 2026-07-26 11:40:05' },
        { action: '提交审核', operator: '杨', desc: '杨 提交审核 2026-07-26 11:45:00' },
        { action: '审核', operator: '李四', desc: '李四 审核通过 2026-07-26 12:05:18' },
        { action: '完成', operator: '系统', desc: '系统 标记完成 2026-07-26 12:06:00' }
      ],
      items: [
        { productCode: 'SP0300029', productName: '鲫鱼', unit: '斤', brand: '--', spec: '--', conversionRate: 1, currentStock: 30, outboundQty: 20, unitPrice: '15.00', amount: '300.00', remark: '' }
      ]
    },
    {
      id: 'CKD202607250300007',
      outboundTime: '2026-07-25 14:05:50',
      outboundType: '销售出库',
      outboundAmt: '200.00',
      warehouseName: '东南区域仓库',
      supplierPurchaserCustomerName: '静安第2中学',
      relNo: 'DD202607250300007',
      status: '已驳回',
      creator: '杨',
      remark: '客户取消订单，出库已驳回',
      attachments: [],
      operationLogs: [
        { action: '添加', operator: '杨', desc: '杨 添加出库单 2026-07-25 14:05:50' },
        { action: '提交审核', operator: '杨', desc: '杨 提交审核 2026-07-25 14:10:00' },
        { action: '审核', operator: '李四', desc: '李四 驳回 2026-07-25 15:30:20' }
      ],
      items: [
        { productCode: 'SP0300024', productName: '三元牛奶', unit: '瓶', brand: '三元', spec: '10瓶1箱', conversionRate: 1, currentStock: 60, outboundQty: 20, unitPrice: '10.00', amount: '200.00', remark: '客户取消' }
      ]
    },
    {
      id: 'CKD202607240300008',
      outboundTime: '2026-07-24 16:18:22',
      outboundType: '报损出库',
      outboundAmt: '66.00',
      warehouseName: '生鲜仓库',
      supplierPurchaserCustomerName: '--',
      relNo: '--',
      status: '已完成',
      creator: '杨',
      remark: '鸡蛋破损3斤，报损处理',
      attachments: [
        { name: '报损照片.png', format: 'png', size: '180KB' }
      ],
      operationLogs: [
        { action: '添加', operator: '杨', desc: '杨 添加出库单 2026-07-24 16:18:22' },
        { action: '提交审核', operator: '杨', desc: '杨 提交审核 2026-07-24 16:23:00' },
        { action: '审核', operator: '张三', desc: '张三 审核通过 2026-07-24 16:40:10' },
        { action: '完成', operator: '系统', desc: '系统 标记完成 2026-07-24 16:41:00' }
      ],
      items: [
        { productCode: 'SP0300018', productName: '鸡蛋', unit: '斤', brand: '--', spec: '--', conversionRate: 1, currentStock: 45, outboundQty: 3, unitPrice: '22.00', amount: '66.00', remark: '运输破损' }
      ]
    },
    {
      id: 'CKD202607230300009',
      outboundTime: '2026-07-23 10:30:15',
      outboundType: '销售出库',
      outboundAmt: '420.00',
      warehouseName: '公司市区仓库',
      supplierPurchaserCustomerName: '静安第11中学',
      relNo: 'DD202607230300009',
      status: '已完成',
      creator: '杨',
      remark: '日常配送',
      attachments: [],
      operationLogs: [
        { action: '添加', operator: '杨', desc: '杨 添加出库单 2026-07-23 10:30:15' },
        { action: '提交审核', operator: '杨', desc: '杨 提交审核 2026-07-23 10:35:00' },
        { action: '审核', operator: '张三', desc: '张三 审核通过 2026-07-23 10:55:08' },
        { action: '完成', operator: '系统', desc: '系统 标记完成 2026-07-23 10:56:00' }
      ],
      items: [
        { productCode: 'SP0300025', productName: '大米', unit: 'KG', brand: '--', spec: '--', conversionRate: 1, currentStock: 190, outboundQty: 10, unitPrice: '19.00', amount: '190.00', remark: '' },
        { productCode: 'SP0300024', productName: '三元牛奶', unit: '瓶', brand: '三元', spec: '10瓶1箱', conversionRate: 1, currentStock: 80, outboundQty: 23, unitPrice: '10.00', amount: '230.00', remark: '' }
      ]
    },
    {
      id: 'CKD202607150300010',
      outboundTime: '2026-07-15 09:20:40',
      outboundType: '单位转换出库',
      outboundAmt: '100.00',
      warehouseName: '东南区域仓库',
      supplierPurchaserCustomerName: '--',
      relNo: '--',
      status: '已完成',
      creator: '杨',
      remark: '箱转瓶单位转换出库',
      attachments: [],
      operationLogs: [
        { action: '添加', operator: '杨', desc: '杨 添加出库单 2026-07-15 09:20:40' },
        { action: '提交审核', operator: '杨', desc: '杨 提交审核 2026-07-15 09:25:00' },
        { action: '审核', operator: '李四', desc: '李四 审核通过 2026-07-15 09:45:22' },
        { action: '完成', operator: '系统', desc: '系统 标记完成 2026-07-15 09:46:00' }
      ],
      items: [
        { productCode: 'SP0300024', productName: '三元牛奶', unit: '瓶', brand: '三元', spec: '10瓶1箱', conversionRate: 10, currentStock: 100, outboundQty: 10, unitPrice: '10.00', amount: '100.00', remark: '转换出库' }
      ]
    },
    {
      id: 'CKD202607100300011',
      outboundTime: '2026-07-10 13:55:28',
      outboundType: '联营采购退货出库',
      outboundAmt: '150.00',
      warehouseName: '生鲜仓库',
      supplierPurchaserCustomerName: '联营水产合作社',
      relNo: 'CGD202607080300015',
      status: '已关闭',
      creator: '杨',
      remark: '联营退货超期，已关闭处理',
      attachments: [],
      operationLogs: [
        { action: '添加', operator: '杨', desc: '杨 添加出库单 2026-07-10 13:55:28' },
        { action: '关闭', operator: '系统', desc: '系统 超期自动关闭 2026-07-12 00:00:00' }
      ],
      items: [
        { productCode: 'SP0300029', productName: '鲫鱼', unit: '斤', brand: '--', spec: '--', conversionRate: 1, currentStock: 25, outboundQty: 10, unitPrice: '15.00', amount: '150.00', remark: '联营退回' }
      ]
    },
    {
      id: 'CKD202607010300012',
      outboundTime: '2026-07-01 15:40:12',
      outboundType: '其他出库',
      outboundAmt: '23.00',
      warehouseName: '生鲜仓库',
      supplierPurchaserCustomerName: '--',
      relNo: '--',
      status: '已完成',
      creator: '杨',
      remark: '员工食堂领用',
      attachments: [],
      operationLogs: [
        { action: '添加', operator: '杨', desc: '杨 添加出库单 2026-07-01 15:40:12' },
        { action: '提交审核', operator: '杨', desc: '杨 提交审核 2026-07-01 15:45:00' },
        { action: '审核', operator: '张三', desc: '张三 审核通过 2026-07-01 16:05:30' },
        { action: '完成', operator: '系统', desc: '系统 标记完成 2026-07-01 16:06:20' }
      ],
      items: [
        { productCode: 'SP0300039', productName: '土豆丝', unit: '斤', brand: '--', spec: '--', conversionRate: 1, currentStock: 40, outboundQty: 23, unitPrice: '1.00', amount: '23.00', remark: '内部领用' }
      ]
    }
  ];
})();

/* 净菜加工单资料 */
(function () {
  window.MockProcessingOrders = [
    {
      id: 'JGD202608300300005',
      processingDate: '2026-08-30',
      customerCode: '03',
      warehouse: '中心仓',
      materialWarehouse: '中心仓',
      outputWarehouse: '中心仓',
      status: '已加工',
      operator: '管理员',
      remark: '三种净菜按5:3:2比例组合包装',
      costMode: 'auto',
      templateId: 'PP005',
      templateName: '什锦配菜组合方案',
      materials: [
        { productCode: 'SP0300050', productName: '土豆块', unit: '斤', stock: 90, avgPrice: 5.20, consumeQty: 25 },
        { productCode: 'SP0300055', productName: '胡萝卜片', unit: '斤', stock: 75, avgPrice: 4.60, consumeQty: 15 },
        { productCode: 'SP0300058', productName: '青椒块', unit: '斤', stock: 60, avgPrice: 6.80, consumeQty: 10 }
      ],
      outputs: [
        { productCode: 'SP0300059', productName: '什锦配菜', unit: '斤', refCoefficient: 1, refQty: 50, actualQty: 49, allocatedCost: '267.00', costPrice: '5.45' }
      ],
      createTime: '2026-08-30 14:00:00',
      attachments: [
        { name: '加工现场照片.jpg', format: 'jpg', size: '1.2MB' },
        { name: '原料检验报告.pdf', format: 'pdf', size: '256KB' }
      ],
      operationLogs: [
        { action: '创建', desc: '管理员 创建加工单 2026-08-30 14:00:00' },
        { action: '提交审核', desc: '管理员 提交审核 2026-08-30 14:02:00' },
        { action: '审核通过', desc: '管理员 审核通过 2026-08-30 14:10:00' },
        { action: '加工完成', desc: '管理员 加工完成 2026-08-30 14:40:00' }
      ]
    },
    {
      id: 'JGD202608300300006',
      processingDate: '2026-08-30',
      customerCode: '03',
      warehouse: '中心仓',
      materialWarehouse: '中心仓',
      outputWarehouse: '中心仓',
      status: '待审核',
      operator: '杨师傅',
      remark: '大白菜去老叶、去根后分切',
      costMode: 'auto',
      templateId: 'PP002',
      templateName: '大白菜切配方案',
      materials: [
        { productCode: 'SP0300019', productName: '大白菜', unit: '斤', stock: 180, avgPrice: 2.20, consumeQty: 60 }
      ],
      outputs: [
        { productCode: 'SP0300051', productName: '白菜段', unit: '斤', refCoefficient: 0.55, refQty: 33, actualQty: 32, allocatedCost: '81.23', costPrice: '2.54' },
        { productCode: 'SP0300052', productName: '白菜丝', unit: '斤', refCoefficient: 0.35, refQty: 21, actualQty: 20, allocatedCost: '50.77', costPrice: '2.54' }
      ],
      createTime: '2026-08-30 15:00:00',
      submittedAt: '2026-08-30 15:05:00',
      auditedAt: '',
      auditResult: '',
      attachments: [],
      operationLogs: [
        { action: '创建', operator: '杨师傅', desc: '杨师傅 创建加工单 2026-08-30 15:00:00' },
        { action: '提交审核', operator: '杨师傅', desc: '杨师傅 提交审核 2026-08-30 15:05:00' }
      ]
    },
    {
      id: 'JGD202608300300004',
      processingDate: '2026-08-30',
      customerCode: '03',
      warehouse: '中心仓',
      materialWarehouse: '中心仓',
      outputWarehouse: '中心仓',
      status: '已加工',
      operator: '管理员',
      remark: '青椒去蒂去籽后按规格分切',
      costMode: 'auto',
      templateId: 'PP004',
      templateName: '青椒切配方案',
      materials: [
        { productCode: 'SP0300056', productName: '青椒', unit: '斤', stock: 120, avgPrice: 4.50, consumeQty: 50 }
      ],
      outputs: [
        { productCode: 'SP0300057', productName: '青椒丝', unit: '斤', refCoefficient: 0.42, refQty: 21, actualQty: 20, allocatedCost: '115.38', costPrice: '5.77' },
        { productCode: 'SP0300058', productName: '青椒块', unit: '斤', refCoefficient: 0.40, refQty: 20, actualQty: 19, allocatedCost: '109.62', costPrice: '5.77' }
      ],
      createTime: '2026-08-30 13:00:00',
      attachments: [],
      operationLogs: [
        { action: '创建', desc: '管理员 创建加工单 2026-08-30 13:00:00' },
        { action: '提交审核', desc: '管理员 提交审核 2026-08-30 13:02:00' },
        { action: '审核通过', desc: '管理员 审核通过 2026-08-30 13:10:00' },
        { action: '加工完成', desc: '管理员 加工完成 2026-08-30 13:40:00' }
      ]
    },
    {
      id: 'JGD202608300300003',
      processingDate: '2026-08-30',
      customerCode: '03',
      warehouse: '中心仓',
      materialWarehouse: '中心仓',
      outputWarehouse: '中心仓',
      status: '已加工',
      operator: '管理员',
      remark: '胡萝卜清洗去皮后按规格分切',
      costMode: 'auto',
      templateId: 'PP003',
      templateName: '胡萝卜切配方案',
      materials: [
        { productCode: 'SP0300053', productName: '胡萝卜', unit: '斤', stock: 100, avgPrice: 2.80, consumeQty: 40 }
      ],
      outputs: [
        { productCode: 'SP0300054', productName: '胡萝卜丝', unit: '斤', refCoefficient: 0.45, refQty: 18, actualQty: 17.5, allocatedCost: '58.51', costPrice: '3.34' },
        { productCode: 'SP0300055', productName: '胡萝卜片', unit: '斤', refCoefficient: 0.42, refQty: 16.8, actualQty: 16, allocatedCost: '53.49', costPrice: '3.34' }
      ],
      createTime: '2026-08-30 11:00:00',
      attachments: [
        { name: '加工说明.txt', format: 'txt', size: '4KB' }
      ],
      operationLogs: [
        { action: '创建', desc: '管理员 创建加工单 2026-08-30 11:00:00' },
        { action: '提交审核', desc: '管理员 提交审核 2026-08-30 11:02:00' },
        { action: '审核通过', desc: '管理员 审核通过 2026-08-30 11:10:00' },
        { action: '加工完成', desc: '管理员 加工完成 2026-08-30 11:35:00' }
      ]
    },
    {
      id: 'JGD202608300300002',
      processingDate: '2026-08-30',
      customerCode: '03',
      warehouse: '中心仓',
      materialWarehouse: '中心仓',
      outputWarehouse: '中心仓',
      status: '已加工',
      operator: '管理员',
      remark: '大白菜去老叶、去根后分切',
      costMode: 'auto',
      templateId: 'PP002',
      templateName: '大白菜切配方案',
      materials: [
        { productCode: 'SP0300019', productName: '大白菜', unit: '斤', stock: 180, avgPrice: 2.20, consumeQty: 60 }
      ],
      outputs: [
        { productCode: 'SP0300051', productName: '白菜段', unit: '斤', refCoefficient: 0.55, refQty: 33, actualQty: 32, allocatedCost: '81.23', costPrice: '2.54' },
        { productCode: 'SP0300052', productName: '白菜丝', unit: '斤', refCoefficient: 0.35, refQty: 21, actualQty: 20, allocatedCost: '50.77', costPrice: '2.54' }
      ],
      createTime: '2026-08-30 10:00:00',
      attachments: [],
      operationLogs: [
        { action: '创建', desc: '管理员 创建加工单 2026-08-30 10:00:00' },
        { action: '提交审核', desc: '管理员 提交审核 2026-08-30 10:02:00' },
        { action: '审核通过', desc: '管理员 审核通过 2026-08-30 10:10:00' },
        { action: '加工完成', desc: '管理员 加工完成 2026-08-30 10:35:00' }
      ]
    },
    {
      id: 'JGD202608300300001',
      processingDate: '2026-08-30',
      customerCode: '03',
      warehouse: '中心仓',
      materialWarehouse: '中心仓',
      outputWarehouse: '中心仓',
      status: '已加工',
      operator: '管理员',
      remark: '鲜土豆清洗去皮后按规格分切',
      costMode: 'auto',
      templateId: 'PP001',
      templateName: '土豆切配方案',
      materials: [
        { productCode: 'SP0300040', productName: '土豆', unit: '斤', stock: 220, avgPrice: 3.20, consumeQty: 80 }
      ],
      outputs: [
        { productCode: 'SP0300039', productName: '土豆丝', unit: '斤', refCoefficient: 0.45, refQty: 36, actualQty: 35, allocatedCost: '135.76', costPrice: '3.88' },
        { productCode: 'SP0300050', productName: '土豆块', unit: '斤', refCoefficient: 0.40, refQty: 32, actualQty: 31, allocatedCost: '120.24', costPrice: '3.88' }
      ],
      createTime: '2026-08-30 09:00:00',
      attachments: [
        { name: '成品检验照片.png', format: 'png', size: '892KB' },
        { name: '加工记录单.docx', format: 'docx', size: '48KB' }
      ],
      operationLogs: [
        { action: '创建', desc: '管理员 创建加工单 2026-08-30 09:00:00' },
        { action: '提交审核', desc: '管理员 提交审核 2026-08-30 09:02:00' },
        { action: '审核通过', desc: '管理员 审核通过 2026-08-30 09:10:00' },
        { action: '加工完成', desc: '管理员 加工完成 2026-08-30 09:40:00' }
      ]
    }
  ];
})();

/* 净菜加工方案资料 */
(function () {
  window.MockProcessingTemplates = [
    {
      id: 'PP001',
      name: '土豆切配方案',
      relationType: 'one-to-many',
      description: '鲜土豆清洗去皮后分切为土豆丝和土豆块，综合出成率约85%',
      materials: [
        { warehouse: '中心仓', productCode: 'SP0300040', productName: '土豆', unit: '斤' }
      ],
      outputs: [
        { warehouse: '中心仓', productCode: 'SP0300039', productName: '土豆丝', unit: '斤', refCoefficient: 0.45 },
        { warehouse: '中心仓', productCode: 'SP0300050', productName: '土豆块', unit: '斤', refCoefficient: 0.4 }
      ],
      createTime: '2026-07-31 09:00:00'
    },
    {
      id: 'PP002',
      name: '大白菜切配方案',
      relationType: 'one-to-many',
      description: '大白菜去除老叶和根部后分切为白菜段和白菜丝，综合出成率约90%',
      materials: [
        { warehouse: '中心仓', productCode: 'SP0300019', productName: '大白菜', unit: '斤' }
      ],
      outputs: [
        { warehouse: '中心仓', productCode: 'SP0300051', productName: '白菜段', unit: '斤', refCoefficient: 0.55 },
        { warehouse: '中心仓', productCode: 'SP0300052', productName: '白菜丝', unit: '斤', refCoefficient: 0.35 }
      ],
      createTime: '2026-07-31 09:30:00'
    },
    {
      id: 'PP003',
      name: '胡萝卜切配方案',
      relationType: 'one-to-many',
      description: '胡萝卜清洗去皮后分切为胡萝卜丝和胡萝卜片，综合出成率约87%',
      materials: [
        { warehouse: '中心仓', productCode: 'SP0300053', productName: '胡萝卜', unit: '斤' }
      ],
      outputs: [
        { warehouse: '中心仓', productCode: 'SP0300054', productName: '胡萝卜丝', unit: '斤', refCoefficient: 0.45 },
        { warehouse: '中心仓', productCode: 'SP0300055', productName: '胡萝卜片', unit: '斤', refCoefficient: 0.42 }
      ],
      createTime: '2026-07-31 10:00:00'
    },
    {
      id: 'PP004',
      name: '青椒切配方案',
      relationType: 'one-to-many',
      description: '青椒去蒂去籽后分切为青椒丝和青椒块，综合出成率约82%',
      materials: [
        { warehouse: '中心仓', productCode: 'SP0300056', productName: '青椒', unit: '斤' }
      ],
      outputs: [
        { warehouse: '中心仓', productCode: 'SP0300057', productName: '青椒丝', unit: '斤', refCoefficient: 0.42 },
        { warehouse: '中心仓', productCode: 'SP0300058', productName: '青椒块', unit: '斤', refCoefficient: 0.4 }
      ],
      createTime: '2026-07-31 10:30:00'
    },
    {
      id: 'PP005',
      name: '什锦配菜组合方案',
      relationType: 'many-to-one',
      description: '土豆块、胡萝卜片和青椒块按5:3:2比例组合包装为什锦配菜',
      materials: [
        { warehouse: '中心仓', productCode: 'SP0300050', productName: '土豆块', unit: '斤', refConsumeQty: 0.5 },
        { warehouse: '中心仓', productCode: 'SP0300055', productName: '胡萝卜片', unit: '斤', refConsumeQty: 0.3 },
        { warehouse: '中心仓', productCode: 'SP0300058', productName: '青椒块', unit: '斤', refConsumeQty: 0.2 }
      ],
      outputs: [
        { warehouse: '中心仓', productCode: 'SP0300059', productName: '什锦配菜', unit: '斤' }
      ],
      createTime: '2026-07-31 11:00:00'
    }
  ];
})();

/* 商品评价资料 */
(function () {
  window.MockGoodsReviews = [
    { id: 'REVIEW-001', productCode: 'SP0300039', auditStatus: 'PENDING', auditContent: '', auditTime: '' },
    { id: 'REVIEW-002', productCode: 'SP0300040', auditStatus: 'APPROVED', auditContent: '', auditTime: '2026-07-29 10:30:00' },
    { id: 'REVIEW-003', productCode: 'SP0300038', auditStatus: 'REJECTED', auditContent: '商品图片和规格信息不完整', auditTime: '2026-05-22 16:10:00' },
    { id: 'REVIEW-004', productCode: 'SP0300037', auditStatus: 'PENDING', auditContent: '', auditTime: '' },
    { id: 'REVIEW-005', productCode: 'SP0300036', auditStatus: 'APPROVED', auditContent: '', auditTime: '2026-04-29 11:20:00' },
    { id: 'REVIEW-006', productCode: 'SP0300034', auditStatus: 'APPROVED', auditContent: '', auditTime: '2026-04-28 16:00:00' },
    { id: 'REVIEW-007', productCode: 'SP0300031', auditStatus: 'REJECTED', auditContent: '计量单位与商品规格不匹配', auditTime: '2026-04-23 17:20:00' },
    { id: 'REVIEW-008', productCode: 'SP0300030', auditStatus: 'PENDING', auditContent: '', auditTime: '' }
  ];
  while (window.MockGoodsReviews.length < 20) {
    const index = window.MockGoodsReviews.length + 1;
    window.MockGoodsReviews.push({
      id: `REVIEW-${String(index).padStart(3, '0')}`,
      productCode: `SP-DEMO-${String(index).padStart(4, '0')}`,
      auditStatus: index % 3 === 0 ? 'APPROVED' : 'PENDING',
      auditContent: '', auditTime: index % 3 === 0 ? '2026-08-04 10:00:00' : ''
    });
  }
})();

/* 计量单位资料 */
(function () {
  window.MockUnitMeasurements = [
    { id: 'UNIT-001', unitName: 'KG', conversionRate: 1, status: 'ENABLE', linkedProductCount: 12 },
    { id: 'UNIT-002', unitName: '斤', conversionRate: 0.5, status: 'ENABLE', linkedProductCount: 8 },
    { id: 'UNIT-003', unitName: '克', conversionRate: 0.001, status: 'ENABLE', linkedProductCount: 3 },
    { id: 'UNIT-004', unitName: '件', conversionRate: 1, status: 'ENABLE', linkedProductCount: 5 },
    { id: 'UNIT-005', unitName: '箱', conversionRate: 10, status: 'ENABLE', linkedProductCount: 2 },
    { id: 'UNIT-006', unitName: '包', conversionRate: 1, status: 'ENABLE', linkedProductCount: 1 },
    { id: 'UNIT-007', unitName: '袋', conversionRate: 1, status: 'DISABLE', linkedProductCount: 0 },
    { id: 'UNIT-008', unitName: '瓶', conversionRate: 1, status: 'ENABLE', linkedProductCount: 0 },
    { id: 'UNIT-009', unitName: '盒', conversionRate: 1, status: 'ENABLE', linkedProductCount: 0 },
    { id: 'UNIT-010', unitName: '桶', conversionRate: 5, status: 'DISABLE', linkedProductCount: 0 },
    { id: 'UNIT-011', unitName: '个', conversionRate: 1, status: 'ENABLE', linkedProductCount: 0 },
    { id: 'UNIT-012', unitName: '把', conversionRate: 0.5, status: 'ENABLE', linkedProductCount: 0 }
  ];
  while (window.MockUnitMeasurements.length < 20) {
    const index = window.MockUnitMeasurements.length + 1;
    window.MockUnitMeasurements.push({
      id: `UNIT-${String(index).padStart(3, '0')}`,
      unitName: ['托盘', '筐', '捆', '方', '板', '车', '支', '枚'][index - 13] || `单位${String(index).padStart(2, '0')}`,
      conversionRate: 1, status: 'ENABLE', linkedProductCount: 0
    });
  }
})();
