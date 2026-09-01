(function () {
  'use strict';

  var clone = function (value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  };
  var number = function (value, fallback) {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : (fallback || 0);
  };
  var round = function (value) {
    return Math.round(number(value) * 100) / 100;
  };
  var now = function () {
    return window.BusinessRules?.now?.() || '2026-08-26 09:00:00';
  };
  var today = function () {
    return now().slice(0, 10);
  };
  var datePart = function (value) {
    return String(value || today()).slice(0, 10);
  };
  var shiftDate = function (value, offset) {
    var source = datePart(value).split('-').map(Number);
    var date = new Date(source[0], source[1] - 1, source[2]);
    date.setDate(date.getDate() + Number(offset || 0));
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  };
  var enterpriseExpectedAt = function (schoolValue, value) {
    var schoolDate = datePart(schoolValue);
    var nextDate = String(value || '').trim() ? datePart(value) : shiftDate(schoolDate, -2);
    if (schoolDate && nextDate > schoolDate) return null;
    return nextDate + ' 00:00:00';
  };
  var sum = function (items, field) {
    return round((items || []).reduce(function (total, item) {
      return total + number(item[field]);
    }, 0));
  };

  var catalog = [
    { code: 'SP0300038', name: '牛奶', unit: '瓶', brand: '--', spec: '--', category: '蛋奶类-蛋奶类二级-蛋奶类三级', marketPrice: 5, image: '' },
    { code: 'SP0300039', name: '全麦面粉', unit: '斤', brand: '--', spec: '--', category: '主食（米面粉点心类）-粮食类-面类', marketPrice: 2, image: '' },
    { code: 'SP0300045', name: '黑面', unit: 'L', brand: '--', spec: '--', category: '主食（米面粉点心类）-粮食类', marketPrice: 5, image: '' },
    { code: 'SP0300046', name: '干豆皮', unit: '斤', brand: '--', spec: '--', category: '其他材料-其他二级', marketPrice: 6, image: '' },
    { code: 'SP0300019', name: '大白菜', unit: '斤', brand: '--', spec: '--', category: '果蔬-果蔬二级', marketPrice: 8, image: '' },
    { code: 'SP0300020', name: '鸡蛋', unit: '斤', brand: '--', spec: '--', category: '蛋奶类-蛋奶类二级', marketPrice: 22, image: '' },
    { code: 'SP0300025', name: '西红柿', unit: 'KG', brand: '--', spec: '--', category: '果蔬-果蔬二级', marketPrice: 20, image: '' },
    { code: 'SP0300029', name: '鲫鱼', unit: '斤', brand: '--', spec: '--', category: '水产品-水产品二级', marketPrice: 15, image: '' },
    { code: 'SP0300030', name: '金龙鱼5L桶装油', unit: '瓶', brand: '金龙鱼', spec: '5L/瓶', category: '食油-食油二级', marketPrice: 55, image: '' },
    { code: 'SP0300034', name: '黑大米', unit: '斤', brand: '--', spec: '--', category: '主食（米面粉点心类）-粮食类', marketPrice: 10, image: '' },
    { code: 'SP0300040', name: '土豆', unit: '斤', brand: '农家优选', spec: '500g/份', category: '果蔬-果蔬二级', marketPrice: 6.8, image: '' },
    { code: 'SP0300042', name: '面包', unit: '个', brand: '桃李', spec: '100g/个', category: '主食（米面粉点心类）-点心类', marketPrice: 3.5, image: '' }
  ];

  function product(code, name) {
    var target = catalog.find(function (item) {
      return (code && item.code === code) || (name && item.name === name);
    });
    if (target) return clone(target);
    var external = (window.DemoStore?.get?.('products') || []).find(function (item) {
      return (code && (item.code === code || item.id === code)) || (name && item.name === name);
    });
    if (!external) return null;
    return {
      code: external.code || external.id || '',
      name: external.name || '',
      unit: external.unit || '',
      brand: external.brand || '--',
      spec: external.spec || '--',
      category: external.category || '其他材料-其他二级',
      marketPrice: number(external.marketPrice),
      image: external.image || external.imageUrl || ''
    };
  }

  function displayName(item) {
    if (!item) return '--';
    return window.DomUtils.formatProductDisplay(item);
  }

  function makeTask(spec) {
    var task = {
      id: spec.id,
      date: spec.date || '2026-08-26',
      productCode: spec.productCode,
      productName: spec.productName,
      unit: spec.unit,
      brand: spec.brand || '--',
      spec: spec.spec || '--',
      category: spec.category,
      image: spec.image || '',
      manager: spec.manager || '杨采',
      orderLines: clone(spec.orderLines || [])
    };
    task.orderCount = task.orderLines.length;
    task.orderQty = round(task.orderLines.reduce(function (total, line) { return total + number(line.orderQty); }, 0));
    task.stockDeduction = round(task.orderLines.reduce(function (total, line) { return total + number(line.stockDeduction); }, 0));
    task.inTransitDeduction = round(task.orderLines.reduce(function (total, line) { return total + number(line.inTransitDeduction); }, 0));
    task.toPurchaseQty = round(task.orderLines.reduce(function (total, line) { return total + number(line.toPurchaseQty); }, 0));
    task.generatedCount = task.orderLines.filter(function (line) { return line.allocation?.status === '已生成采购单'; }).length;
    task.assignedCount = task.orderLines.filter(function (line) { return line.allocation?.supplier || line.allocation?.purchaseType; }).length;
    task.progressCount = task.assignedCount + ' / ' + task.orderCount;
    task.progress = task.orderCount ? Math.round(task.assignedCount / task.orderCount * 100) + '%' : '0%';
    return task;
  }

  function makeOrder(spec) {
    var items = (spec.items || []).map(function (item, index) {
      var line = product(item.productCode, item.productName) || {};
      var quantity = number(item.quantity);
      var unitPrice = number(item.purchasePrice);
      return {
        id: item.id || spec.no + '-L' + String(index + 1),
        productCode: item.productCode || line.code || '',
        productName: item.productName || line.name || '',
        unit: item.unit || line.unit || '',
        brand: item.brand || line.brand || '--',
        spec: item.spec || line.spec || '--',
        category: item.category || line.category || '',
        image: item.image || line.image || '',
        quantity: quantity,
        purchasePrice: unitPrice,
        purchaseSubtotal: round(quantity * unitPrice),
        supplierQuote: number(item.supplierQuote),
        agreementPrice: item.agreementPrice == null ? null : number(item.agreementPrice),
        lastPrice: item.lastPrice == null ? null : number(item.lastPrice),
        marketPrice: item.marketPrice == null ? number(line.marketPrice) : number(item.marketPrice),
        remark: item.remark || '',
        receivedQty: number(item.receivedQty),
        currentPrice: number(item.currentPrice),
        receivedAmount: number(item.receivedAmount),
        productionDate: item.productionDate || '',
        qualityReport: clone(item.qualityReport || [])
      };
    });
    var order = {
      id: spec.id || 'PO-' + spec.no,
      purchaseOrderNo: spec.no,
      supplier: spec.supplier || '盒马鲜生',
      purchaseType: spec.purchaseType || '供应商送货',
      source: spec.source || '手动创建',
      manager: spec.manager || '杨采',
      expectedAt: spec.expectedAt || '2026-08-28 00:00:00',
      enterpriseExpectedAt: spec.enterpriseExpectedAt || '',
      addedAt: spec.addedAt || '2026-08-25 16:20:20',
      warehouse: spec.warehouse || '东南区域仓库',
      creator: spec.creator || '杨',
      supplierStatus: spec.supplierStatus || '未确认',
      status: spec.status || '待收货',
      remark: spec.remark || '',
      items: items
    };
    order.productCount = items.length;
    order.purchaseAmount = sum(items, 'purchaseSubtotal');
    order.receivedAmount = sum(items, 'receivedAmount');
    order.returnAmount = number(spec.returnAmount);
    order.reconciliationAmount = number(spec.reconciliationAmount);
    order.receiptProgress = items.filter(function (item) { return number(item.receivedQty) >= number(item.quantity); }).length + '/' + items.length;
    return order;
  }

  function taskSeed() {
    return [
      makeTask({
        id: 'PT-20260826-0038',
        date: '2026-08-26',
        productCode: 'SP0300038',
        productName: '牛奶',
        unit: '瓶',
        category: '蛋奶类-蛋奶类二级-蛋奶类三级',
        orderLines: [{
          id: 'PTL-0038-1',
          orderNo: 'DD202608250300001',
          orderCreatedAt: '2026-08-25 15:33:37',
          customerName: '静安第1中学',
          canteen: '第一食堂',
          warehouse: '东南区域仓库',
          orderTag: '营养餐',
          orderSource: '客户下单',
          remark: '--',
          orderQty: 10,
          stockDeduction: 0,
          inTransitDeduction: 0,
          toPurchaseQty: 10,
          allocation: { purchaseType: '供应商送货', supplier: '盒马鲜生', manager: '杨采', price: 5, status: '已生成采购单', purchaseOrderNo: 'CGD202608250300001' }
        }]
      }),
      makeTask({
        id: 'PT-20260826-0039',
        date: '2026-08-26',
        productCode: 'SP0300039',
        productName: '全麦面粉',
        unit: '斤',
        category: '主食（米面粉点心类）-粮食类-面类',
        orderLines: [{
          id: 'PTL-0039-1',
          orderNo: 'DD202608250300002',
          orderCreatedAt: '2026-08-25 15:36:41',
          customerName: '静安第1中学',
          canteen: '第一食堂',
          warehouse: '东南区域仓库',
          orderTag: '营养餐',
          orderSource: '客户下单',
          remark: '--',
          orderQty: 10,
          stockDeduction: 0,
          inTransitDeduction: 0,
          toPurchaseQty: 10,
          allocation: { purchaseType: '供应商送货', supplier: '盒马鲜生', manager: '杨采', price: 2, status: '未生成采购单', purchaseOrderNo: '' }
        }]
      })
    ];
  }

  function orderSeed() {
    var items = function (entries) { return entries; };
    return [
      makeOrder({ no: 'CGD202608250300003', supplier: '盒马鲜生', purchaseType: '供应商送货', source: '手动创建', expectedAt: '2026-08-28 00:00:00', addedAt: '2026-08-25 16:20:20', status: '待收货', items: items([
        { productCode: 'SP0300045', productName: '黑面', unit: 'L', quantity: 10, purchasePrice: 5, supplierQuote: 0, marketPrice: 5 },
        { productCode: 'SP0300046', productName: '干豆皮', unit: '斤', quantity: 10, purchasePrice: 6, supplierQuote: 0, marketPrice: 6 }
      ]) }),
      makeOrder({ no: 'CGD202608250300002', supplier: '每日优选', purchaseType: '供应商送货', source: '采购任务生成', expectedAt: '2026-08-26 03:33:12', addedAt: '2026-08-25 03:33:12', status: '已关闭', items: [
        { productCode: 'SP0300039', productName: '全麦面粉', unit: '斤', quantity: 10, purchasePrice: 1, supplierQuote: 0, marketPrice: 1 }
      ] }),
      makeOrder({ no: 'CGD202608250300001', supplier: '盒马鲜生', purchaseType: '供应商送货', source: '采购任务生成', expectedAt: '2026-08-26 03:33:12', addedAt: '2026-08-25 03:33:12', status: '待入库', items: [
        { productCode: 'SP0300038', productName: '牛奶', unit: '瓶', quantity: 10, purchasePrice: 5, supplierQuote: 0, marketPrice: 5, receivedQty: 10, currentPrice: 5, receivedAmount: 50 }
      ] }),
      makeOrder({ no: 'CGD202608240300004', supplier: '每日优选', purchaseType: '联营供应商采购', source: '手动创建', expectedAt: '2026-08-27 00:00:00', addedAt: '2026-08-24 15:10:12', status: '待收货', items: [
        { productCode: 'SP0300019', productName: '大白菜', unit: '斤', quantity: 80, purchasePrice: 1.5, supplierQuote: 1.5, marketPrice: 1.5 }
      ] }),
      makeOrder({ no: 'CGD202608230300005', supplier: '鲜菜源蔬菜批发中心', purchaseType: '供应商送货', source: '手动创建', expectedAt: '2026-08-26 00:00:00', addedAt: '2026-08-23 10:21:15', status: '已完成', supplierStatus: '已发货', items: [
        { productCode: 'SP0300025', productName: '西红柿', unit: 'KG', quantity: 30, purchasePrice: 4.5, supplierQuote: 4.5, marketPrice: 4.5, receivedQty: 30, currentPrice: 4.5, receivedAmount: 135 }
      ] }),
      makeOrder({ no: 'CGD202608220300006', supplier: '绿源供应商', purchaseType: '市场自采', source: '手动创建', expectedAt: '2026-08-25 00:00:00', addedAt: '2026-08-22 16:10:00', status: '待收货', items: [
        { productCode: 'SP0300029', productName: '鲫鱼', unit: '斤', quantity: 20, purchasePrice: 15, supplierQuote: 0, marketPrice: 15 }
      ] }),
      makeOrder({ no: 'CGD202608210300007', supplier: '盒马鲜生', purchaseType: '供应商送货', source: '采购任务生成', expectedAt: '2026-08-24 00:00:00', addedAt: '2026-08-21 14:30:22', status: '已完成', supplierStatus: '已发货', items: [
        { productCode: 'SP0300030', productName: '金龙鱼5L桶装油', unit: '瓶', quantity: 6, purchasePrice: 55, supplierQuote: 55, marketPrice: 55, receivedQty: 6, currentPrice: 55, receivedAmount: 330 }
      ] }),
      makeOrder({ no: 'CGD202608200300008', supplier: '每日优选', purchaseType: '供应商送货', source: '手动创建', expectedAt: '2026-08-23 00:00:00', addedAt: '2026-08-20 11:42:13', status: '待收货', items: [
        { productCode: 'SP0300034', productName: '黑大米', unit: '斤', quantity: 20, purchasePrice: 10, supplierQuote: 0, marketPrice: 10 }
      ] }),
      makeOrder({ no: 'CGD202608190300009', supplier: '盒马鲜生', purchaseType: '供应商送货', source: '采购任务生成', expectedAt: '2026-08-22 00:00:00', addedAt: '2026-08-19 10:08:44', status: '已关闭', items: [
        { productCode: 'SP0300040', productName: '土豆', unit: '斤', quantity: 50, purchasePrice: 6.8, supplierQuote: 0, marketPrice: 6.8 }
      ] }),
      makeOrder({ no: 'CGD202608180300010', supplier: '每日优选', purchaseType: '联营供应商采购', source: '手动创建', expectedAt: '2026-08-21 00:00:00', addedAt: '2026-08-18 09:35:17', status: '已完成', supplierStatus: '已发货', items: [
        { productCode: 'SP0300020', productName: '鸡蛋', unit: '斤', quantity: 35, purchasePrice: 5.8, supplierQuote: 5.8, marketPrice: 5.8, receivedQty: 35, currentPrice: 5.8, receivedAmount: 203 }
      ] }),
      makeOrder({ no: 'CGD202608170300011', supplier: '鲜菜源蔬菜批发中心', purchaseType: '供应商送货', source: '手动创建', expectedAt: '2026-08-20 00:00:00', addedAt: '2026-08-17 16:05:31', status: '待收货', items: [
        { productCode: 'SP0300019', productName: '大白菜', unit: '斤', quantity: 40, purchasePrice: 1.8, supplierQuote: 1.8, marketPrice: 1.8 }
      ] }),
      makeOrder({ no: 'CGD202608160300012', supplier: '盒马鲜生', purchaseType: '市场自采', source: '手动创建', expectedAt: '2026-08-19 00:00:00', addedAt: '2026-08-16 13:22:08', status: '待收货', items: [
        { productCode: 'SP0300039', productName: '全麦面粉', unit: '斤', quantity: 20, purchasePrice: 2, supplierQuote: 0, marketPrice: 2 }
      ] }),
      makeOrder({ no: 'CGD202608150300013', supplier: '每日优选', purchaseType: '供应商送货', source: '采购任务生成', expectedAt: '2026-08-18 00:00:00', addedAt: '2026-08-15 10:18:00', status: '已完成', supplierStatus: '已发货', items: [
        { productCode: 'SP0300046', productName: '干豆皮', unit: '斤', quantity: 10, purchasePrice: 6, supplierQuote: 6, marketPrice: 6, receivedQty: 10, currentPrice: 6, receivedAmount: 60 }
      ] }),
      makeOrder({ no: 'CGD202608140300014', supplier: '盒马鲜生', purchaseType: '供应商送货', source: '手动创建', expectedAt: '2026-08-17 00:00:00', addedAt: '2026-08-14 14:26:42', status: '已关闭', items: [
        { productCode: 'SP0300038', productName: '牛奶', unit: '瓶', quantity: 12, purchasePrice: 5, supplierQuote: 0, marketPrice: 5 }
      ] }),
      makeOrder({ no: 'CGD202608130300015', supplier: '每日优选', purchaseType: '供应商送货', source: '手动创建', expectedAt: '2026-08-16 00:00:00', addedAt: '2026-08-13 09:12:26', status: '已完成', supplierStatus: '已发货', items: [
        { productCode: 'SP0300042', productName: '面包', unit: '个', quantity: 80, purchasePrice: 3.5, supplierQuote: 3.5, marketPrice: 3.5, receivedQty: 80, currentPrice: 3.5, receivedAmount: 280 }
      ] })
    ];
  }

  function ensureSeed() {
    if (!window.DemoStore) return;
    var tasks = window.DemoStore.get('purchaseTasks');
    var orders = window.DemoStore.get('purchaseOrders');
    if (!Array.isArray(tasks) || !tasks.length) window.DemoStore.replace('purchaseTasks', taskSeed());
    if (!Array.isArray(orders) || !orders.length) window.DemoStore.replace('purchaseOrders', orderSeed());
    var normalizedTasks = window.DemoStore.get('purchaseTasks');
    if (Array.isArray(normalizedTasks) && normalizedTasks.length) {
      normalizedTasks.forEach(refreshTask);
      window.DemoStore.replace('purchaseTasks', normalizedTasks);
    }
    var normalizedOrders = window.DemoStore.get('purchaseOrders');
    if (Array.isArray(normalizedOrders) && normalizedOrders.length) {
      normalizedOrders.forEach(function (order) {
        if (!String(order.enterpriseExpectedAt || '').trim()) {
          order.enterpriseExpectedAt = enterpriseExpectedAt(order.expectedAt) || order.expectedAt || '';
        }
      });
      window.DemoStore.replace('purchaseOrders', normalizedOrders);
    }
  }

  function refreshTask(task) {
    (task.orderLines || []).forEach(function (line) {
      if (!line.orderTag) line.orderTag = '营养餐';
      if (!line.orderSource) line.orderSource = '客户下单';
    });
    task.orderCount = (task.orderLines || []).length;
    task.orderQty = round((task.orderLines || []).reduce(function (total, line) { return total + number(line.orderQty); }, 0));
    task.stockDeduction = round((task.orderLines || []).reduce(function (total, line) { return total + number(line.stockDeduction); }, 0));
    task.inTransitDeduction = round((task.orderLines || []).reduce(function (total, line) { return total + number(line.inTransitDeduction); }, 0));
    task.toPurchaseQty = round((task.orderLines || []).reduce(function (total, line) { return total + number(line.toPurchaseQty); }, 0));
    task.generatedCount = (task.orderLines || []).filter(function (line) { return line.allocation?.status === '已生成采购单'; }).length;
    task.assignedCount = (task.orderLines || []).filter(function (line) { return line.allocation?.supplier || line.allocation?.purchaseType; }).length;
    task.progressCount = task.assignedCount + ' / ' + task.orderCount;
    task.progress = task.orderCount ? Math.round(task.assignedCount / task.orderCount * 100) + '%' : '0%';
    return task;
  }

  function nextOrderNo(records, dateValue) {
    var prefix = 'CGD' + datePart(dateValue).replace(/-/g, '') + '03';
    var max = (records || []).reduce(function (value, record) {
      var match = String(record.purchaseOrderNo || '').match(new RegExp('^' + prefix + '(\\d+)$'));
      return Math.max(value, match ? number(match[1]) : 0);
    }, 0);
    return prefix + String(max + 1).padStart(5, '0');
  }

  function listTasks(filters) {
    ensureSeed();
    var condition = filters || {};
    return window.DemoStore.get('purchaseTasks').filter(function (task) {
      var lineText = (task.orderLines || []).map(function (line) { return line.orderNo + line.customerName; }).join(' ');
      var generatedStatus = task.generatedCount === task.orderCount && task.orderCount ? '已生成采购单' : '未生成采购单';
      if (condition.date && task.date !== condition.date) return false;
      if (condition.purchaseType && !(task.orderLines || []).some(function (line) { return line.allocation?.purchaseType === condition.purchaseType; })) return false;
      if (condition.customerName && !lineText.includes(condition.customerName)) return false;
      if (condition.orderTag && !(task.orderLines || []).some(function (line) { return line.orderTag === condition.orderTag; })) return false;
      if (condition.purchaseStatus && generatedStatus !== condition.purchaseStatus) return false;
      if (condition.orderSource && !(task.orderLines || []).some(function (line) { return line.orderSource === condition.orderSource; })) return false;
      if (condition.orderNo && !lineText.includes(condition.orderNo)) return false;
      if (condition.warehouse && !(task.orderLines || []).some(function (line) { return line.warehouse === condition.warehouse; })) return false;
      if (condition.category && !String(task.category).includes(condition.category)) return false;
      if (condition.productName && !String(task.productName).includes(condition.productName)) return false;
      if (condition.manager && task.manager !== condition.manager) return false;
      if (condition.orderStart && !(task.orderLines || []).some(function (line) { return datePart(line.orderCreatedAt) >= condition.orderStart; })) return false;
      if (condition.orderEnd && !(task.orderLines || []).some(function (line) { return datePart(line.orderCreatedAt) <= condition.orderEnd; })) return false;
      return true;
    }).sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
  }

  function getTask(id) {
    ensureSeed();
    return window.DemoStore.get('purchaseTasks').find(function (task) { return task.id === id; }) || null;
  }

  function listOrders(filters) {
    ensureSeed();
    var condition = filters || {};
    return window.DemoStore.get('purchaseOrders').filter(function (order) {
      var itemText = (order.items || []).map(function (item) { return item.productName + item.productCode + item.category; }).join(' ');
      var enterpriseAt = order.enterpriseExpectedAt || order.expectedAt;
      if (condition.deliveryStart && datePart(order.expectedAt) < condition.deliveryStart) return false;
      if (condition.deliveryEnd && datePart(order.expectedAt) > condition.deliveryEnd) return false;
      if (condition.enterpriseDeliveryStart && datePart(enterpriseAt) < condition.enterpriseDeliveryStart) return false;
      if (condition.enterpriseDeliveryEnd && datePart(enterpriseAt) > condition.enterpriseDeliveryEnd) return false;
      if (condition.purchaseType && order.purchaseType !== condition.purchaseType) return false;
      if (condition.category && !itemText.includes(condition.category)) return false;
      if (condition.productName && !itemText.includes(condition.productName)) return false;
      if (condition.addStart && datePart(order.addedAt) < condition.addStart) return false;
      if (condition.addEnd && datePart(order.addedAt) > condition.addEnd) return false;
      if (condition.status && order.status !== condition.status) return false;
      if (condition.orderNo && !String(order.purchaseOrderNo).includes(condition.orderNo)) return false;
      if (condition.warehouse && order.warehouse !== condition.warehouse) return false;
      if (condition.source && order.source !== condition.source) return false;
      if (condition.manager && order.manager !== condition.manager) return false;
      if (condition.supplierStatus && order.supplierStatus !== condition.supplierStatus) return false;
      return true;
    }).sort(function (a, b) { return String(b.addedAt).localeCompare(String(a.addedAt)); });
  }

  function getOrder(id) {
    ensureSeed();
    return window.DemoStore.get('purchaseOrders').find(function (order) { return order.id === id || order.purchaseOrderNo === id; }) || null;
  }

  function normalizeOrderItems(items) {
    return (items || []).filter(function (item) { return item && item.productCode && number(item.quantity) > 0; }).map(function (item, index) {
      var line = product(item.productCode, item.productName) || {};
      var quantity = number(item.quantity);
      var price = number(item.purchasePrice);
      return {
        id: item.id || 'POL-' + Date.now() + '-' + index,
        productCode: item.productCode,
        productName: item.productName || line.name,
        unit: item.unit || line.unit,
        brand: item.brand || line.brand || '--',
        spec: item.spec || line.spec || '--',
        category: item.category || line.category || '',
        image: item.image || line.image || '',
        quantity: quantity,
        purchasePrice: price,
        purchaseSubtotal: round(quantity * price),
        supplierQuote: number(item.supplierQuote),
        agreementPrice: item.agreementPrice == null ? null : number(item.agreementPrice),
        lastPrice: item.lastPrice == null ? null : number(item.lastPrice),
        marketPrice: item.marketPrice == null ? number(line.marketPrice) : number(item.marketPrice),
        remark: item.remark || '',
        receivedQty: number(item.receivedQty),
        currentPrice: number(item.currentPrice),
        receivedAmount: number(item.receivedAmount),
        productionDate: item.productionDate || '',
        qualityReport: clone(item.qualityReport || [])
      };
    });
  }

  function saveOrder(payload) {
    ensureSeed();
    var values = payload || {};
    return window.DemoStore.transact(function (state) {
      var orders = state.purchaseOrders || (state.purchaseOrders = []);
      var existing = values.id ? orders.find(function (order) { return order.id === values.id; }) : null;
      var record = existing || {
        id: 'PO-' + Date.now(),
        purchaseOrderNo: nextOrderNo(orders, values.expectedAt || now()),
        addedAt: now(),
        source: values.source || '手动创建',
        status: values.status || '待收货',
        supplierStatus: '未确认'
      };
      var items = normalizeOrderItems(values.items);
      var expectedAt = values.expectedAt || record.expectedAt || '2026-08-27 00:00:00';
      var requestedEnterpriseAt = values.enterpriseExpectedAt == null ? record.enterpriseExpectedAt : values.enterpriseExpectedAt;
      var nextEnterpriseAt = requestedEnterpriseAt ? enterpriseExpectedAt(expectedAt, requestedEnterpriseAt) : '';
      Object.assign(record, {
        supplier: values.supplier || record.supplier || '盒马鲜生',
        purchaseType: values.purchaseType || record.purchaseType || '供应商送货',
        manager: values.manager || record.manager || '杨采',
        expectedAt: expectedAt,
        enterpriseExpectedAt: nextEnterpriseAt || '',
        warehouse: values.warehouse || record.warehouse || '东南区域仓库',
        creator: values.creator || record.creator || '杨',
        remark: values.remark || '',
        items: items
      });
      record.productCount = items.length;
      record.purchaseAmount = sum(items, 'purchaseSubtotal');
      record.receivedAmount = sum(items, 'receivedAmount');
      record.returnAmount = number(record.returnAmount);
      record.reconciliationAmount = number(record.reconciliationAmount);
      record.receiptProgress = items.filter(function (item) { return number(item.receivedQty) >= number(item.quantity); }).length + '/' + items.length;
      if (!existing) orders.unshift(record);
      return clone(record);
    });
  }

  function closeOrder(id) {
    ensureSeed();
    return window.DemoStore.transact(function (state) {
      var order = (state.purchaseOrders || []).find(function (item) { return item.id === id; });
      if (order) order.status = '已关闭';
      return clone(order);
    });
  }

  function receiveOrder(id, values, complete) {
    ensureSeed();
    var input = values || {};
    return window.DemoStore.transact(function (state) {
      var order = (state.purchaseOrders || []).find(function (item) { return item.id === id; });
      if (!order) return null;
      (order.items || []).forEach(function (item) {
        var next = input[item.id];
        if (!next) return;
        item.receivedQty = number(next.receivedQty);
        item.currentPrice = number(next.currentPrice);
        item.receivedAmount = round(item.receivedQty * item.currentPrice);
        item.productionDate = next.productionDate || item.productionDate || '';
        item.qualityReport = clone(next.qualityReport || item.qualityReport || []);
      });
      order.receivedAmount = sum(order.items, 'receivedAmount');
      order.receiptProgress = order.items.filter(function (item) { return number(item.receivedQty) >= number(item.quantity); }).length + '/' + order.items.length;
      order.remark = input.remark || order.remark || '';
      if (complete) {
        order.status = '已完成';
        order.supplierStatus = '已发货';
      }
      return clone(order);
    });
  }

  function saveTaskAllocation(taskId, rows, enterpriseAtValue) {
    ensureSeed();
    var sourceTask = getTask(taskId);
    var nextEnterpriseAt = enterpriseExpectedAt(sourceTask?.date, enterpriseAtValue);
    if (enterpriseAtValue && !nextEnterpriseAt) return { ok: false, message: '企业期望送达时间不能晚于学校期望送达时间' };
    return window.DemoStore.transact(function (state) {
      var task = (state.purchaseTasks || []).find(function (item) { return item.id === taskId; });
      if (!task) return null;
      var orders = state.purchaseOrders || (state.purchaseOrders = []);
      (rows || []).forEach(function (row) {
        var line = (task.orderLines || []).find(function (item) { return item.id === row.id; });
        if (!line) return;
        line.allocation = Object.assign({}, line.allocation || {}, {
          purchaseType: row.purchaseType || line.allocation?.purchaseType || '供应商送货',
          supplier: row.supplier || line.allocation?.supplier || '盒马鲜生',
          manager: task.manager,
          price: number(row.price),
          status: number(row.price) > 0 && number(row.quantity) > 0 ? '已生成采购单' : '未生成采购单',
          enterpriseExpectedAt: nextEnterpriseAt || line.allocation?.enterpriseExpectedAt || ''
        });
        if (line.allocation.status === '已生成采购单' && !line.allocation.purchaseOrderNo) {
          line.allocation.purchaseOrderNo = nextOrderNo(orders, task.date);
          orders.unshift(makeOrder({
            no: line.allocation.purchaseOrderNo,
            supplier: line.allocation.supplier,
            purchaseType: line.allocation.purchaseType,
            source: '采购任务生成',
            manager: task.manager,
            expectedAt: task.date + ' 00:00:00',
            enterpriseExpectedAt: nextEnterpriseAt || enterpriseExpectedAt(task.date),
            addedAt: now(),
            status: '待收货',
            items: [{
              productCode: task.productCode,
              productName: task.productName,
              unit: task.unit,
              quantity: number(row.quantity) || number(line.toPurchaseQty),
              purchasePrice: number(row.price),
              marketPrice: product(task.productCode)?.marketPrice || 0
            }]
          }));
        }
      });
      refreshTask(task);
      return { ok: true, task: clone(task) };
    });
  }

  function generatePurchaseOrders(taskIds, enterpriseAtValue) {
    ensureSeed();
    var ids = Array.isArray(taskIds) ? taskIds : [];
    var tasks = ids.map(getTask).filter(Boolean);
    var invalidTask = tasks.find(function (task) { return !enterpriseExpectedAt(task.date, enterpriseAtValue); });
    if (invalidTask) return { ok: false, message: '企业期望送达时间不能晚于学校期望送达时间' };
    return window.DemoStore.transact(function (state) {
      var orders = state.purchaseOrders || (state.purchaseOrders = []);
      var generated = [];
      ids.map(function (id) {
        return (state.purchaseTasks || []).find(function (task) { return task.id === id; });
      }).filter(Boolean).forEach(function (task) {
        (task.orderLines || []).forEach(function (line) {
          var allocation = line.allocation || {};
          if (allocation.status === '已生成采购单') return;
          var quantity = number(line.toPurchaseQty);
          var price = number(allocation.price);
          if (!quantity || price <= 0) return;
          var nextEnterpriseAt = enterpriseExpectedAt(task.date, enterpriseAtValue);
          var purchaseOrderNo = nextOrderNo(orders, task.date);
          line.allocation = Object.assign({}, allocation, {
            purchaseType: allocation.purchaseType || '供应商送货',
            supplier: allocation.supplier || '盒马鲜生',
            manager: task.manager,
            enterpriseExpectedAt: nextEnterpriseAt,
            status: '已生成采购单',
            purchaseOrderNo: purchaseOrderNo
          });
          var order = makeOrder({
            no: purchaseOrderNo,
            supplier: line.allocation.supplier,
            purchaseType: line.allocation.purchaseType,
            source: '采购任务生成',
            manager: task.manager,
            expectedAt: task.date + ' 00:00:00',
            enterpriseExpectedAt: nextEnterpriseAt,
            addedAt: now(),
            status: '待收货',
            items: [{
              productCode: task.productCode,
              productName: task.productName,
              unit: task.unit,
              quantity: quantity,
              purchasePrice: price,
              marketPrice: product(task.productCode)?.marketPrice || 0
            }]
          });
          orders.unshift(order);
          generated.push(order);
        });
        refreshTask(task);
      });
      return { ok: true, orders: clone(generated) };
    });
  }

  window.PurchaseService = {
    ensureSeed: ensureSeed,
    products: function () { return clone(catalog); },
    displayName: displayName,
    product: product,
    listTasks: listTasks,
    getTask: getTask,
    listOrders: listOrders,
    getOrder: getOrder,
    saveOrder: saveOrder,
    closeOrder: closeOrder,
    receiveOrder: receiveOrder,
    saveTaskAllocation: saveTaskAllocation,
    generatePurchaseOrders: generatePurchaseOrders,
    formatDate: datePart
  };
})();
