const SPREADSHEET_ID = "1xn-LdCJgnKWzUkP4SPlledbNEDheO63d6mNxbbwAx04"; 

// =====================================================================
// 🌐 1. ระบบจัดการหน้าเว็บ (Web App Routing)
// =====================================================================
function doGet(e) {
  var page = 'home'; 
  if (e && e.parameter && e.parameter.page) page = e.parameter.page.toLowerCase();
  
  try {
    // 🌟 ເພີ່ມ 'stock_check' ເຂົ້າໄປໃນລາຍຊື່ໜ້າທີ່ອະນຸຍາດແລ້ວ
    var validPages = ['home', 'categories', 'parts', 'detail', 'cart', 'orders', 'profile', 'admin', 'pos', 'stock_in', 'product_manage', 'product', 'dashboard', 'finance', 'stock_check'];
    
    var fileName = validPages.includes(page) ? page : 'home';
    
    // fallbacks to prevent crashes
    if (fileName === 'categories') fileName = 'home';
    if (fileName === 'product') fileName = 'product_manage';
    
    let template = HtmlService.createTemplateFromFile(fileName);
    
    if (fileName === 'home') {
      template.models = getSheetData('home'); 
    } 
    else if (fileName === 'categories') {
      template.categories = getSheetData('Categories'); 
    } 
    else if (fileName === 'parts') {
      template.groupsData = getSheetData('group'); 
      template.partsData = getSheetData('detail');      
      var rawModel = (e && e.parameter && e.parameter.model) ? e.parameter.model : ''; 
      template.selectedModel = rawModel ? decodeURIComponent(rawModel) : '';
    }
    else if (fileName === 'detail') {
      var rawGroup = (e && e.parameter && e.parameter.group) ? e.parameter.group : '';
      var rawModel = (e && e.parameter && e.parameter.model) ? e.parameter.model : '';
      template.selectedGroup = rawGroup ? decodeURIComponent(rawGroup) : '';
      template.selectedModel = rawModel ? decodeURIComponent(rawModel) : '';
      template.variations = getProductsByGroup(template.selectedGroup, template.selectedModel);
      template.groupsData = getSheetData('group'); 
    }
    else if (fileName === 'dashboard') {
      return HtmlService.createTemplateFromFile('dashboard')
        .evaluate()
        .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    }
    
    var pageTitle = 'Savage Shop';
    if (fileName === 'admin') pageTitle = 'SAVAGE SHOP - ADMIN PANEL';
    if (fileName === 'pos') pageTitle = 'SAVAGE SHOP - POS';
    if (fileName === 'product' || fileName === 'product_manage') pageTitle = 'SAVAGE SHOP - PRODUCT MANAGE';
    if (fileName === 'finance') pageTitle = 'SAVAGE SHOP - FINANCE';
    if (fileName === 'stock_check') pageTitle = 'SAVAGE SHOP - STOCK CHECK'; // 🌟 ຕັ້ງຊື່ໜ້າກວດສະຕັອກ

    return template.evaluate()
      .setTitle(pageTitle)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0');
      
  } catch (err) { 
    return HtmlService.createHtmlOutput('<h3>Error: ' + err.message + '</h3>'); 
  }
}

function getScriptUrl() { return ScriptApp.getService().getUrl(); }
function forceDriveAuth() { DriveApp.getFolderById("1m69eyBA2jWLRsFVxqxdT3I-ssXGPeFKb"); }

// =====================================================================
// 📊 2. ระบบดึงข้อมูลพื้นฐาน (Database Helpers)
// =====================================================================
function getSheetData(sheetName) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      const sheets = ss.getSheets();
      for (let s = 0; s < sheets.length; s++) { 
        if (sheets[s].getName().toLowerCase().trim() === sheetName.toLowerCase().trim()) { sheet = sheets[s]; break; } 
      }
    }
    if (!sheet) return [];
    const values = sheet.getDataRange().getValues();
    const headers = values[0];
    const data = [];
    for (let i = 1; i < values.length; i++) {
      let obj = {};
      for (let j = 0; j < headers.length; j++) {
        let headerName = headers[j] ? headers[j].toString().trim() : ("Col" + j);
        let cellValue = values[i][j];
        if (typeof cellValue === 'string') cellValue = cellValue.trim();
        obj[headerName] = cellValue;
      }
      data.push(obj);
    }
    return data;
  } catch(e) { return []; }
}

function getProductsByGroup(groupName, modelName) {
  try {
    const data = getSheetData('detail'); 
    const results = [];
    for (let i = 0; i < data.length; i++) {
      let gName = (data[i]['Group'] || '').toString().trim();
      let rawModel = (data[i]['Moto Model'] || data[i]['Model'] || '').toString();
      let models = rawModel.split(',').map(function(s){ return s.trim() });
      if (gName !== '' && gName === groupName.trim() && (modelName.trim() === '' || models.indexOf(modelName.trim()) !== -1)) {
        results.push(data[i]);
      }
    }
    return results;
  } catch (e) { return []; }
}

function getPosProducts() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName('detail') || ss.getSheetByName('Detail');
    if(!sheet) return JSON.stringify({ success: true, data: [] });
    const data = sheet.getDataRange().getValues(); 
    if (data.length < 2) return JSON.stringify({ success: true, data: [] });
    
    const headers = data[0].map(h => String(h).toLowerCase().trim());
    const idIdx = headers.findIndex(h => h === 'id' || h === 'sku' || h.includes('id'));
    const nameIdx = headers.findIndex(h => h === 'name' || h === 'title' || h === 'ຊື່ສິນຄ້າ' || h.includes('name'));
    const priceIdx = headers.findIndex(h => h === 'price' || h === 'ລາຄາ' || h === 'sell price');
    const costIdx = headers.findIndex(h => h === 'cost' || h === 'ຕົ້ນທຶນ' || h.includes('cost')); 
    const groupIdx = headers.findIndex(h => h === 'group' || h === 'category');
    const modelIdx = headers.findIndex(h => h === 'moto model' || h === 'model' || h === 'ລຸ້ນລົດ');
    const imgIdx = headers.findIndex(h => h === 'image' || h === 'img' || h.includes('image'));
    const stockIdx = headers.findIndex(h => h === 'stock_qty' || h === 'stock' || h === 'qty' || h === 'ຈຳນວນ');

    const products = [];
    for (let i = 1; i < data.length; i++) {
      let row = data[i];
      let pName = nameIdx >= 0 ? String(row[nameIdx] || "").trim() : "";
      if (pName !== '') {
        products.push({
          id: idIdx >= 0 ? String(row[idIdx] || ('P' + i)) : ('P' + i),
          category: groupIdx >= 0 ? String(row[groupIdx] || 'All PARTS').trim() : 'All PARTS',
          model: modelIdx >= 0 ? String(row[modelIdx] || 'All MODELS').trim() : 'All MODELS',
          name: pName,
          price: priceIdx >= 0 ? parseFloat(row[priceIdx] || 0) : 0,
          cost: costIdx >= 0 ? parseFloat(row[costIdx] || 0) : 0, 
          stock: stockIdx >= 0 ? parseFloat(row[stockIdx] || 0) : 0,
          img: imgIdx >= 0 ? String(row[imgIdx] || "https://via.placeholder.com/150").trim() : "https://via.placeholder.com/150"
        });
      }
    }
    return JSON.stringify({ success: true, data: products });
  } catch(e) { return JSON.stringify({ success: false, error: e.toString() }); }
}

// =====================================================================
// 📦 3. ระบบ ADMIN (จัดการออเดอร์)
// =====================================================================
function getAdminData() {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheets = ss.getSheets();
    var orderSheet = null; var detailSheet = null;
    for (var s = 0; s < sheets.length; s++) {
      var sName = sheets[s].getName().toLowerCase().trim();
      if (sName === "order" || sName === "orders") orderSheet = sheets[s];
      if (sName === "order_details" || sName === "order_detail" || sName === "order details") detailSheet = sheets[s];
    }
    if (!orderSheet) return JSON.stringify({ success: false, error: "ບໍ່ພົບ Sheet order" });
    
    var orderData = orderSheet.getDataRange().getValues();
    var detailData = detailSheet ? detailSheet.getDataRange().getValues() : [];
    var orders = [];
    
    var detailMap = {};
    if (detailData.length > 1) {
      for (var j = 1; j < detailData.length; j++) {
        var dOId = String(detailData[j][1]);
        if (!detailMap[dOId]) detailMap[dOId] = [];
        detailMap[dOId].push({ 
          name: String(detailData[j][2] || ""), 
          price: Number(detailData[j][3]) || 0, 
          qty: Number(detailData[j][4]) || 0, 
          subtotal: Number(detailData[j][5]) || 0 
        });
      }
    }
    
    for (var i = orderData.length - 1; i >= 1; i--) { 
      var row = orderData[i];
      if (!row[0]) continue; 
      
      var oId = String(row[0]);
      var itemsList = detailMap[oId] || [];
      var rawDate = row[1];
      var safeDate = (rawDate instanceof Date) ? Utilities.formatDate(rawDate, "Asia/Vientiane", "dd/MM/yyyy HH:mm:ss") : (rawDate ? String(rawDate) : "");

      orders.push({
        orderId: oId, date: safeDate, total: Number(row[3]) || 0,
        name: String(row[4] || ""), phone: String(row[5] || ""), express: String(row[6] || ""),
        address: String(row[7] || ""), province: String(row[8] || ""), district: String(row[9] || ""),
        payment: String(row[10] || ""), status: String(row[11] || "ລໍຖ້າກວດສອບ"), 
        slipUrl: String(row[12] || ""), items: itemsList
      });
    }
    return JSON.stringify({ success: true, data: orders });
  } catch(e) { return JSON.stringify({ success: false, error: e.toString() }); }
}

function changeOrderStatus(orderId, newStatus) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var orderSheet = ss.getSheetByName("order") || ss.getSheetByName("orders");
    if (!orderSheet) return false;
    var data = orderSheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === orderId) {
        orderSheet.getRange(i + 1, 12).setValue(newStatus); 
        return true;
      }
    }
    return false;
  } catch(e) { return false; }
}

// 🔄 ฟังก์ชันดึงสถานะออเดอร์ล่าสุด
function getLiveOrderStatuses(orderIds) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID); 
    var orderSheet = ss.getSheetByName('order') || ss.getSheetByName('orders');
    if (!orderSheet) return {};
    
    var data = orderSheet.getDataRange().getValues();
    var statusMap = {};
    for (var i = 1; i < data.length; i++) {
      var oId = String(data[i][0]);
      if (orderIds.indexOf(oId) !== -1) {
        statusMap[oId] = {
          phone: String(data[i][5] || ""),
          express: String(data[i][6] || ""),
          address: String(data[i][7] || ""),
          province: String(data[i][8] || ""),
          district: String(data[i][9] || ""),
          status: String(data[i][11] || "ລໍຖ້າກວດສອບ")
        };
      }
    }
    return statusMap;
  } catch(e) { return {}; }
}

// 🔄 ฟังก์ชันแก้ไขที่อยู่จัดส่ง
function updateOrderAddress(id, express, address, province, district, phone) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var orderSheet = ss.getSheetByName('order') || ss.getSheetByName('orders');
    var data = orderSheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        orderSheet.getRange(i + 1, 6).setValue(phone);
        orderSheet.getRange(i + 1, 7).setValue(express);
        orderSheet.getRange(i + 1, 8).setValue(address);
        orderSheet.getRange(i + 1, 9).setValue(province);
        orderSheet.getRange(i + 1, 10).setValue(district);
        return true;
      }
    }
    return false;
  } catch(e) { return false; }
}

// =====================================================================
// 🚚 4. ระบบ PURCHASE ORDER & รับของเข้าสต็อก (PO & Stock In)
// =====================================================================
function savePurchaseOrder(poData) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let poMaster = ss.getSheetByName('PO_Master');
    if (!poMaster) {
      poMaster = ss.insertSheet('PO_Master');
      poMaster.appendRow(["PO_ID", "ວັນທີສັ່ງ", "ຜູ້ສະໜອງ", "ຄ່າຂົນສົ່ງ", "ຈຳນວນລວມ", "ມູນຄ່າລວມ", "ສະຖານະ", "ວັນທີຮັບເຄື່ອງ"]);
    }

    let poDetail = ss.getSheetByName('PO_Detail');
    if (!poDetail) {
      poDetail = ss.insertSheet('PO_Detail');
      poDetail.appendRow(["PO_ID", "ລະຫັດສິນຄ້າ", "ຊື່ສິນຄ້າ", "ລັອດທີ (Lot No.)", "ຈຳນວນສັ່ງ", "ຕົ້ນທຶนເດີມ/ອັນ", "ຕົ້ນທຶน+ຂົນສົ່ງ", "ລວມຕົ້ນທຶน", "ລຸ້ນລົດ (Model)", "ຈຳນວນທີ່ເຫຼືອ (FIFO)"]);
      poDetail.getRange("A1:J1").setFontWeight("bold").setBackground("#111111").setFontColor("#ffffff");
    }

    let poId = 'PO-' + new Date().getTime().toString().slice(-6);
    let orderDate = Utilities.formatDate(new Date(), "Asia/Vientiane", "dd/MM/yyyy HH:mm:ss");
    let receivedDate = poData.status === "ຮັບເຂົ້າແລ້ວ" ? orderDate : "-"; 

    poMaster.appendRow([poId, orderDate, poData.supplier, poData.shippingFee, poData.totalQty, poData.totalLandedCost, poData.status, receivedDate]);

    let existingLots = {};
    if (poDetail.getLastRow() > 1) {
      let dData = poDetail.getDataRange().getValues();
      for (let i = 1; i < dData.length; i++) {
        let pId = String(dData[i][1]);
        existingLots[pId] = (existingLots[pId] || 0) + 1;
      }
    }

    let detailSheetForStock = ss.getSheetByName('detail') || ss.getSheetByName('Detail'); 
    let detailData = detailSheetForStock.getDataRange().getValues();
    let idIdx = detailData[0].map(h => String(h).toLowerCase().trim()).findIndex(h => h === 'id' || h.includes('id'));
    let stockIdx = detailData[0].map(h => String(h).toLowerCase().trim()).findIndex(h => h === 'stock_qty' || h === 'stock' || h === 'qty' || h === 'ຈຳນວນ');

    for (let i = 0; i < poData.items.length; i++) {
      let item = poData.items[i];
      let remainingFifo = poData.status === "ຮັບເຂົ້າແລ້ວ" ? item.qty : 0; 
      
      existingLots[item.id] = (existingLots[item.id] || 0) + 1;
      let lotNo = "Lot " + existingLots[item.id];
      
      poDetail.appendRow([ poId, item.id, item.name, lotNo, item.qty, item.cost, item.landedCost, item.qty * item.landedCost, item.model, remainingFifo ]);
      
      if (poData.status === "ຮັບເຂົ້າແລ້ວ" && idIdx !== -1 && stockIdx !== -1) {
        for (let r = 1; r < detailData.length; r++) {
          if (String(detailData[r][idIdx]).trim() === String(item.id).trim()) {
            let currentStock = parseFloat(detailData[r][stockIdx]) || 0;
            detailSheetForStock.getRange(r + 1, stockIdx + 1).setValue(currentStock + item.qty);
            break;
          }
        }
      }
    }
    return { success: true, poId: poId };
  } catch(e) { return { success: false, message: e.toString() }; }
}

function getPurchaseOrdersList() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let poMaster = ss.getSheetByName('PO_Master');
    if (!poMaster) return JSON.stringify({ success: true, data: [] });
    
    let data = poMaster.getDataRange().getValues();
    let poList = [];
    for (let i = data.length - 1; i >= 1; i--) { 
      if(data[i][0]) {
        poList.push({
          poId: data[i][0], date: data[i][1], supplier: data[i][2], shipping: data[i][3],
          qty: data[i][4], totalCost: data[i][5], status: data[i][6], receivedDate: data[i][7]
        });
      }
    }
    return JSON.stringify({ success: true, data: poList });
  } catch(e) { return JSON.stringify({ success: false, error: e.toString() }); }
}

function getPoDetailsForReceive(poId) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let poMaster = ss.getSheetByName('PO_Master');
    let poDetail = ss.getSheetByName('PO_Detail');
    if (!poDetail || !poMaster) return JSON.stringify({ success: false, message: "ບໍ່ພົບ Sheet PO_Detail" });

    let shippingFee = 0;
    let mData = poMaster.getDataRange().getValues();
    for(let i=1; i<mData.length; i++) {
        if(mData[i][0] === poId) { shippingFee = parseFloat(mData[i][3]) || 0; break; }
    }

    let data = poDetail.getDataRange().getValues();
    let items = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === poId) {
        items.push({ id: data[i][1], name: data[i][2], qty: data[i][4], cost: data[i][5] });
      }
    }
    return JSON.stringify({ success: true, shippingFee: shippingFee, items: items });
  } catch(e) { return JSON.stringify({ success: false, message: e.toString() }); }
}

function markPOAsReceivedCustom(poId, receivedDateStr, receivedItemsJson, newShippingFee) {
  try {
    let receivedItems = JSON.parse(receivedItemsJson);
    newShippingFee = parseFloat(newShippingFee) || 0;
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let poMaster = ss.getSheetByName('PO_Master');
    let poDetail = ss.getSheetByName('PO_Detail');
    let productSheet = ss.getSheetByName('detail') || ss.getSheetByName('Detail');

    let masterData = poMaster.getDataRange().getValues();
    let mRow = -1;
    for (let i = 1; i < masterData.length; i++) {
      if (masterData[i][0] === poId) {
        if(masterData[i][6] === "ຮັບເຂົ້າແລ້ວ") return JSON.stringify({ success: false, message: "ຮັບເຂົ້າໄປແລ້ວ!" });
        mRow = i + 1; break;
      }
    }

    let newTotalQty = 0;
    receivedItems.forEach(it => { newTotalQty += (parseFloat(it.qty) || 0); });
    let shippingPerItem = newTotalQty > 0 ? (newShippingFee / newTotalQty) : 0;

    let stockData = productSheet.getDataRange().getValues();
    let idIdx = stockData[0].map(h => String(h).toLowerCase().trim()).findIndex(h => h === 'id' || h.includes('id'));
    let stockIdx = stockData[0].map(h => String(h).toLowerCase().trim()).findIndex(h => h === 'stock_qty' || h === 'stock' || h === 'qty' || h === 'ຈຳນວນ');

    let detailData = poDetail.getDataRange().getValues();
    let newTotalCost = 0;

    for (let i = 1; i < detailData.length; i++) {
      if (detailData[i][0] === poId) {
        let pId = String(detailData[i][1]).trim();
        let editedItem = receivedItems.find(item => String(item.id).trim() === pId);
        let actualQty = editedItem ? parseFloat(editedItem.qty) : parseFloat(detailData[i][4]);
        let actualCost = editedItem ? parseFloat(editedItem.cost) : parseFloat(detailData[i][5]);
        
        if (isNaN(actualQty) || actualQty < 0) actualQty = 0;
        if (isNaN(actualCost) || actualCost < 0) actualCost = 0;

        let landedCost = actualCost + shippingPerItem;
        let lineTotal = actualQty * landedCost;
        newTotalCost += lineTotal;

        poDetail.getRange(i + 1, 5).setValue(actualQty); 
        poDetail.getRange(i + 1, 6).setValue(actualCost); 
        poDetail.getRange(i + 1, 7).setValue(landedCost); 
        poDetail.getRange(i + 1, 8).setValue(lineTotal); 
        poDetail.getRange(i + 1, 10).setValue(actualQty); 

        if (idIdx !== -1 && stockIdx !== -1) {
          for (let r = 1; r < stockData.length; r++) {
            if (String(stockData[r][idIdx]).trim() === pId) {
              let currentStock = parseFloat(stockData[r][stockIdx]) || 0;
              productSheet.getRange(r + 1, stockIdx + 1).setValue(currentStock + actualQty);
              break;
            }
          }
        }
      }
    }

    poMaster.getRange(mRow, 4).setValue(newShippingFee); 
    poMaster.getRange(mRow, 5).setValue(newTotalQty);
    poMaster.getRange(mRow, 6).setValue(newTotalCost);
    poMaster.getRange(mRow, 7).setValue("ຮັບເຂົ້າແລ້ວ");
    
    let rDateFormatted = receivedDateStr.includes('-') ? receivedDateStr.split('-').reverse().join('/') : receivedDateStr;
    poMaster.getRange(mRow, 8).setValue(rDateFormatted);

    return JSON.stringify({ success: true });
  } catch(e) { return JSON.stringify({ success: false, message: e.toString() }); }
}

// =====================================================================
// 🛒 5. ระบบตัดสต็อกอัตโนมัติ สำหรับ "ขายออนไลน์ (Online Store)"
// =====================================================================
function saveOrderToSheet(orderData) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let orderSheet = ss.getSheetByName('order') || ss.getSheetByName('orders');
    let detailSheet = ss.getSheetByName('order_details');
    let productSheet = ss.getSheetByName('detail') || ss.getSheetByName('Detail');
    let poDetail = ss.getSheetByName('PO_Detail');
    
    let dateObj = new Date();
    let orderId = "ORD-" + dateObj.getTime().toString().slice(-6);
    let dateStr = Utilities.formatDate(dateObj, "Asia/Vientiane", "dd/MM/yyyy HH:mm:ss");
    
    let slipFileUrl = "";
    if (orderData.slipBase64) {
      try {
        let folder = DriveApp.getFolderById("1m69eyBA2jWLRsFVxqxdT3I-ssXGPeFKb"); 
        let blob = Utilities.newBlob(Utilities.base64Decode(orderData.slipBase64), orderData.slipMimeType, "Slip_" + orderId);
        slipFileUrl = folder.createFile(blob).getUrl();
      } catch(e) {}
    }

    orderSheet.appendRow([
      orderId, dateStr, "ONLINE_STORE", orderData.totalPrice, 
      orderData.name, orderData.phone, orderData.express, 
      orderData.address, orderData.provinces, orderData.district, 
      orderData.paymentMethod, "ລໍຖ້າກວດສອບ", slipFileUrl, 0, 0
    ]);
    
    let items = orderData.cartItems || [];
    let totalBillCogs = 0;
    
    let productData = productSheet ? productSheet.getDataRange().getValues() : [];
    
    let idIdx = -1, stockIdx = -1, masterCostIdx = -1, nameIdx = -1, modelIdx = -1;
    if(productData.length > 0) {
        let headers = productData[0].map(h => String(h).toLowerCase().trim());
        idIdx = headers.findIndex(h => h.includes('id') || h.includes('sku') || h.includes('ລະຫັດ'));
        nameIdx = headers.findIndex(h => h.includes('name') || h.includes('ຊື່'));
        stockIdx = headers.findIndex(h => h.includes('stock') || h.includes('qty') || h.includes('ຈຳນວນ'));
        masterCostIdx = headers.findIndex(h => h.includes('cost') || h.includes('ຕົ້ນທຶນ'));
        modelIdx = headers.findIndex(h => h.includes('model') || h.includes('ລຸ້ນ'));
    }
    
    let poData = poDetail ? poDetail.getDataRange().getValues() : [];
    
    for (let i = 0; i < items.length; i++) {
      let item = items[i];
      let qtyToDeduct = parseFloat(item.qty) || 0;
      let itemTotalCogs = 0;

      let safeItemId = String(item.id || "").trim();
      let safeItemName = String(item.name || "").trim();
      let pRowIndex = -1;
      
      if (idIdx !== -1 && safeItemId !== "") {
          pRowIndex = productData.findIndex(r => String(r[idIdx]).trim().toLowerCase() === safeItemId.toLowerCase());
      }
      if (pRowIndex === -1 && nameIdx !== -1 && safeItemName !== "") {
          pRowIndex = productData.findIndex(r => String(r[nameIdx]).trim().toLowerCase() === safeItemName.toLowerCase());
      }

      let realId = pRowIndex !== -1 ? String(productData[pRowIndex][idIdx]).trim() : safeItemId;
      
      let carModel = (pRowIndex !== -1 && modelIdx !== -1) ? String(productData[pRowIndex][modelIdx]).trim() : "";
      let baseItemName = item.name;
      if (carModel !== "") baseItemName += " [ລຸ້ນ: " + carModel + "]";
      
      if (poData.length > 1 && realId !== "") {
        for (let p = 1; p < poData.length; p++) {
          if (qtyToDeduct <= 0) break;
          
          let poProductId = String(poData[p][1]).trim();
          if (poProductId.toLowerCase() === realId.toLowerCase()) {
            let lotRemaining = parseFloat(poData[p][9]) || 0; 
            if (lotRemaining > 0) {
              let deductAmount = Math.min(qtyToDeduct, lotRemaining);
              let lotUnitCost = parseFloat(poData[p][6]) || 0; 
              let cogs = deductAmount * lotUnitCost;
              
              let lotNoStr = String(poData[p][3]);
              let poIdAndLot = String(poData[p][0]) + " (" + lotNoStr + ")";
              let finalItemName = baseItemName + " [" + lotNoStr + "]";
              
              detailSheet.appendRow(["", orderId, finalItemName, item.price, deductAmount, deductAmount * item.price, cogs, poIdAndLot]);
              
              itemTotalCogs += cogs;
              qtyToDeduct -= deductAmount;
              
              poDetail.getRange(p + 1, 10).setValue(lotRemaining - deductAmount); 
              poData[p][9] = lotRemaining - deductAmount; 
            }
          }
        }
      }
      
      if (qtyToDeduct > 0) {
        let fallbackCost = (pRowIndex !== -1 && masterCostIdx !== -1) ? (parseFloat(productData[pRowIndex][masterCostIdx]) || 0) : 0;
        itemTotalCogs += (qtyToDeduct * fallbackCost);
        let finalItemName = baseItemName + " [ສະຕັອກເກົ່າ]";
        detailSheet.appendRow(["", orderId, finalItemName, item.price, qtyToDeduct, qtyToDeduct * item.price, qtyToDeduct * fallbackCost, "ສະຕັອກເກົ່າ"]);
      }
      totalBillCogs += itemTotalCogs;
      
      if (pRowIndex !== -1 && stockIdx !== -1) {
        let currentStock = parseFloat(productData[pRowIndex][stockIdx]) || 0;
        let newStock = currentStock - parseFloat(item.qty);
        productSheet.getRange(pRowIndex + 1, stockIdx + 1).setValue(newStock); 
        productData[pRowIndex][stockIdx] = newStock; 
      }
    }
    
    let lastRow = orderSheet.getLastRow();
    orderSheet.getRange(lastRow, 14).setValue(totalBillCogs);
    orderSheet.getRange(lastRow, 15).setValue(orderData.totalPrice - totalBillCogs);
    
    return { success: true, orderId: orderId, slipUrl: slipFileUrl };
  } catch(e) { return { success: false, message: e.toString() }; }
}

// =====================================================================
// 🛒 6. ระบบตัดสต็อกอัตโนมัติ สำหรับ "ขายหน้าร้าน (POS)"
// =====================================================================
function submitPosOrder(cartData, custInfo) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let orderSheet = ss.getSheetByName('order') || ss.getSheetByName('orders');
    let detailSheet = ss.getSheetByName('order_details');
    let productSheet = ss.getSheetByName('detail') || ss.getSheetByName('Detail');
    let poDetail = ss.getSheetByName('PO_Detail');
    
    let dateObj = new Date();
    let orderId = "POS-" + dateObj.getTime().toString().slice(-6);
    let dateStr = Utilities.formatDate(dateObj, "Asia/Vientiane", "dd/MM/yyyy HH:mm:ss");

    orderSheet.appendRow([
      orderId, dateStr, "ADMIN_POS", cartData.total, 
      custInfo.name || "ລູກຄ້າໜ້າຮ້ານ", custInfo.phone || "-", custInfo.express || "ຮັບໜ້າຮ້ານ", 
      custInfo.address || "POS", custInfo.province || "-", custInfo.district || "-", 
      custInfo.payment || "ໂອນເງິນ", "ຢືນຢັນແລ້ວ", "", 0, 0
    ]);
    
    let items = cartData.items || [];
    let totalBillCogs = 0;
    
    let productData = productSheet ? productSheet.getDataRange().getValues() : [];
    
    let idIdx = -1, stockIdx = -1, masterCostIdx = -1, nameIdx = -1, modelIdx = -1;
    if(productData.length > 0) {
        let headers = productData[0].map(h => String(h).toLowerCase().trim());
        idIdx = headers.findIndex(h => h.includes('id') || h.includes('sku') || h.includes('ລະຫັດ'));
        nameIdx = headers.findIndex(h => h.includes('name') || h.includes('ຊື່'));
        stockIdx = headers.findIndex(h => h.includes('stock') || h.includes('qty') || h.includes('ຈຳນວນ'));
        masterCostIdx = headers.findIndex(h => h.includes('cost') || h.includes('ຕົ້ນທຶນ'));
        modelIdx = headers.findIndex(h => h.includes('model') || h.includes('ລຸ້ນ'));
    }
    
    let poData = poDetail ? poDetail.getDataRange().getValues() : [];
    
    for (let i = 0; i < items.length; i++) {
      let item = items[i];
      let qtyToDeduct = parseFloat(item.qty) || 0;
      let itemTotalCogs = 0;

      let safeItemId = String(item.id || "").trim();
      let safeItemName = String(item.name || "").trim();
      let pRowIndex = -1;
      
      if (idIdx !== -1 && safeItemId !== "") {
          pRowIndex = productData.findIndex(r => String(r[idIdx]).trim().toLowerCase() === safeItemId.toLowerCase());
      }
      if (pRowIndex === -1 && nameIdx !== -1 && safeItemName !== "") {
          pRowIndex = productData.findIndex(r => String(r[nameIdx]).trim().toLowerCase() === safeItemName.toLowerCase());
      }

      let realId = pRowIndex !== -1 ? String(productData[pRowIndex][idIdx]).trim() : safeItemId;
      
      let carModel = (pRowIndex !== -1 && modelIdx !== -1) ? String(productData[pRowIndex][modelIdx]).trim() : "";
      let baseItemName = item.name;
      if (carModel !== "") baseItemName += " [ລຸ້ນ: " + carModel + "]";
      
      if (poData.length > 1 && realId !== "") {
        for (let p = 1; p < poData.length; p++) {
          if (qtyToDeduct <= 0) break;
          
          let poProductId = String(poData[p][1]).trim();
          if (poProductId.toLowerCase() === realId.toLowerCase()) {
            let lotRemaining = parseFloat(poData[p][9]) || 0; 
            if (lotRemaining > 0) {
              let deductAmount = Math.min(qtyToDeduct, lotRemaining);
              let lotUnitCost = parseFloat(poData[p][6]) || 0; 
              let cogs = deductAmount * lotUnitCost;
              
              let lotNoStr = String(poData[p][3]);
              let poIdAndLot = String(poData[p][0]) + " (" + lotNoStr + ")";
              let finalItemName = baseItemName + " [" + lotNoStr + "]";
              
              detailSheet.appendRow(["", orderId, finalItemName, item.price, deductAmount, deductAmount * item.price, cogs, poIdAndLot]);
              
              itemTotalCogs += cogs;
              qtyToDeduct -= deductAmount;
              
              poDetail.getRange(p + 1, 10).setValue(lotRemaining - deductAmount); 
              poData[p][9] = lotRemaining - deductAmount; 
            }
          }
        }
      }
      
      if (qtyToDeduct > 0) {
        let fallbackCost = (pRowIndex !== -1 && masterCostIdx !== -1) ? (parseFloat(productData[pRowIndex][masterCostIdx]) || 0) : 0;
        itemTotalCogs += (qtyToDeduct * fallbackCost);
        let finalItemName = baseItemName + " [ສະຕັອກເກົ່າ]";
        detailSheet.appendRow(["", orderId, finalItemName, item.price, qtyToDeduct, qtyToDeduct * item.price, qtyToDeduct * fallbackCost, "ສະຕັອກເກົ່າ"]);
      }
      totalBillCogs += itemTotalCogs;
      
      if (pRowIndex !== -1 && stockIdx !== -1) {
        let currentStock = parseFloat(productData[pRowIndex][stockIdx]) || 0;
        let newStock = currentStock - parseFloat(item.qty);
        productSheet.getRange(pRowIndex + 1, stockIdx + 1).setValue(newStock); 
        productData[pRowIndex][stockIdx] = newStock; 
      }
    }
    
    let lastRow = orderSheet.getLastRow();
    orderSheet.getRange(lastRow, 14).setValue(totalBillCogs);
    orderSheet.getRange(lastRow, 15).setValue(cartData.total - totalBillCogs);
    
    return { success: true, orderId: orderId, slipUrl: "" };
  } catch(e) { return { success: false, message: e.toString() }; }
}

// =====================================================================
// 💰 7. ระบบบัญชีรายรับ-รายจ่าย (finance Dashboard)
// =====================================================================
// =====================================================================
// 💰 7. ระบบบัญชีรายรับ-รายจ่าย (Finance Dashboard)
// =====================================================================
function getfinanceData() {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName('finance'); 
    if (!sheet) return [];
    
    var data = sheet.getDataRange().getValues();
    var results = [];
    for (var i = 1; i < data.length; i++) {
      if(data[i][0]) {
        var rawDate = data[i][1];
        // 🌟 แก้ตรงนี้: เปลี่ยน Format ที่ดึงมาให้เป็น d-MMM-yyyy (เช่น 6-Apr-2026)
        var safeDate = (rawDate instanceof Date) ? Utilities.formatDate(rawDate, "Asia/Vientiane", "d-MMM-yyyy") : String(rawDate);
        results.push({
          id: data[i][0],
          date: safeDate,
          type: data[i][2],
          amount: data[i][3],
          note: data[i][4]
        });
      }
    }
    return results;
  } catch(e) { return []; }
}

function savefinanceData(payload) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName('finance'); 
    if (!sheet) {
      sheet = ss.insertSheet('finance');
      sheet.appendRow(['ID', 'ວັນທີ', 'ປະເພດ', 'ຈຳນວນເງິນ', 'ລາຍລະອຽດ']);
    }
    
    var transId = "FIN-" + new Date().getTime().toString().slice(-6);
    
    // 🌟 แก้ตรงนี้: แปลงวันที่จากฟอร์มให้กลายเป็นแบบ 6-Apr-2026 ก่อนบันทึกลง Sheet
    var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var dateParts = payload.date.split('-'); // input date form (YYYY-MM-DD)
    var formattedDate = payload.date;
    if (dateParts.length === 3) {
      var d = parseInt(dateParts[2], 10);
      var m = monthNames[parseInt(dateParts[1], 10) - 1];
      var y = dateParts[0];
      formattedDate = d + "-" + m + "-" + y; // ได้ผลลัพธ์เป็น 6-Apr-2026
    }

    sheet.appendRow([transId, formattedDate, payload.type, payload.amount, payload.note]);
    return { success: true };
  } catch(e) { return { success: false, error: e.toString() }; }
}
// ==========================================
// ฟังก์ชัน 1: แก้ไขราคาทุนและค่าขนส่ง ในบิลสั่งซื้อ (PO)
// ==========================================
function updatePurchaseOrderPrices(poId, itemsJson) {
  try {
    var itemsToUpdate = JSON.parse(itemsJson);
    var detailSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("PO_Detail");
    if (!detailSheet) throw new Error("ไม่พบชีต PO_Detail");

    var detailData = detailSheet.getDataRange().getValues();
    var detailHeaders = detailData[0];
    
    var colPoId = detailHeaders.indexOf("PO_ID");
    var colProId = detailHeaders.indexOf("Product_ID");
    var colCost = detailHeaders.indexOf("Cost");
    var colTotal = detailHeaders.indexOf("Total_Cost");
    var colQty = detailHeaders.indexOf("Qty");
    
    // หาคอลัมน์ Shipping (ถ้าไม่มี ระบบจะรวมกับ Cost ปกติไปเลย)
    var colShipping = detailHeaders.indexOf("Shipping"); 
    
    var totalNewCost = 0;

    for (var i = 1; i < detailData.length; i++) {
      if (detailData[i][colPoId] === poId) {
        var pId = detailData[i][colProId];
        var matchItem = itemsToUpdate.find(function(it) { return it.id === pId; });
        
        if (matchItem) {
          var qty = parseFloat(detailData[i][colQty]) || 0;
          var newCost = parseFloat(matchItem.cost) || 0;
          var newShip = parseFloat(matchItem.shipping) || 0;
          
          // คำนวณต้นทุนรวมค่าขนส่งเพื่อใส่ใน Total_Cost
          var landedCost = newCost + newShip;
          var newTotal = qty * landedCost;
          
          if(colCost > -1) detailSheet.getRange(i + 1, colCost + 1).setValue(newCost);
          if(colShipping > -1) detailSheet.getRange(i + 1, colShipping + 1).setValue(newShip);
          if(colTotal > -1) detailSheet.getRange(i + 1, colTotal + 1).setValue(newTotal);
          
          totalNewCost += newTotal;
        } else {
          if(colTotal > -1) totalNewCost += parseFloat(detailData[i][colTotal]) || 0;
        }
      }
    }

    // อัปเดตยอดรวมในหน้า PO_Master
    var masterSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("PO_Master");
    var masterData = masterSheet.getDataRange().getValues();
    var mColPoId = masterData[0].indexOf("PO_ID");
    var mColTotalVal = masterData[0].indexOf("Total_Value");
    
    if (mColPoId > -1 && mColTotalVal > -1) {
      for (var j = 1; j < masterData.length; j++) {
        if (masterData[j][mColPoId] === poId) {
          masterSheet.getRange(j + 1, mColTotalVal + 1).setValue(totalNewCost);
          break;
        }
      }
    }

    return { success: true };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}
// ==========================================
// ฟังก์ชัน 2: ลบบิลสั่งซื้อ (PO) ทิ้ง
// ==========================================
function deletePurchaseOrderData(poId) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var masterSheet = ss.getSheetByName("PO_Master");
    var detailSheet = ss.getSheetByName("PO_Detail");
    
    if (!masterSheet || !detailSheet) throw new Error("ไม่พบชีต PO_Master หรือ PO_Detail");

    // ลบจาก PO_Master
    var mData = masterSheet.getDataRange().getValues();
    var mIdCol = mData[0].indexOf("PO_ID");
    for (var i = mData.length - 1; i > 0; i--) {
      if (mData[i][mIdCol] === poId) {
        masterSheet.deleteRow(i + 1);
        break; 
      }
    }

    // ลบจาก PO_Detail (ลบจากล่างขึ้นบน ป้องกันแถวเคลื่อน)
    var dData = detailSheet.getDataRange().getValues();
    var dIdCol = dData[0].indexOf("PO_ID");
    for (var j = dData.length - 1; j > 0; j--) {
      if (dData[j][dIdCol] === poId) {
        detailSheet.deleteRow(j + 1);
      }
    }

    return { success: true };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

// ==========================================
// 📊 ฟังก์ชันดึงข้อมูล Dashboard Analytics
// ==========================================
function getDashboardData() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const orderSheet = ss.getSheetByName('order') || ss.getSheetByName('orders');
    const orderData = orderSheet ? orderSheet.getDataRange().getValues() : [];
    
    let todaySales = 0, todayProfit = 0, todayOrders = 0;
    let monthSales = 0, monthProfit = 0, monthOrders = 0;
    
    const now = new Date();
    const todayStr = Utilities.formatDate(now, "Asia/Vientiane", "yyyy-MM-dd");
    const currentMonthStr = Utilities.formatDate(now, "Asia/Vientiane", "yyyy-MM");
    
    // Hourly bins for today (8am to 8pm)
    const hourlyBins = ['08:00', '11:00', '14:00', '17:00', '20:00'];
    const todayHourlyData = [0, 0, 0, 0, 0];
    
    // Weekly bins for this month
    const weeklyBins = ['W1', 'W2', 'W3', 'W4', 'W5'];
    const monthWeeklyData = [0, 0, 0, 0, 0];
    
    // Parse order dates
    if (orderData.length > 1) {
      for (let i = 1; i < orderData.length; i++) {
        const row = orderData[i];
        if (!row[0] || row[11] === 'ຍົກເລີກ') continue; // Skip empty and cancelled orders
        
        const dateVal = row[1];
        let orderDate = null;
        if (dateVal instanceof Date) {
          orderDate = dateVal;
        } else {
          // Parse string date like "dd/MM/yyyy HH:mm:ss" or similar
          const s = String(dateVal).trim();
          const partsSlash = s.split(' ')[0].split('/');
          if (partsSlash.length === 3) {
            const timeParts = s.split(' ')[1] ? s.split(' ')[1].split(':') : [0,0,0];
            orderDate = new Date(partsSlash[2], partsSlash[1] - 1, partsSlash[0], timeParts[0] || 0, timeParts[1] || 0, timeParts[2] || 0);
          } else {
            const partsDash = s.split(' ')[0].split('-');
            if (partsDash.length === 3) {
              const timeParts = s.split(' ')[1] ? s.split(' ')[1].split(':') : [0,0,0];
              orderDate = new Date(partsDash[0], partsDash[1] - 1, partsDash[2], timeParts[0] || 0, timeParts[1] || 0, timeParts[2] || 0);
            }
          }
        }
        
        if (!orderDate) continue;
        
        const orderDateStr = Utilities.formatDate(orderDate, "Asia/Vientiane", "yyyy-MM-dd");
        const orderMonthStr = Utilities.formatDate(orderDate, "Asia/Vientiane", "yyyy-MM");
        
        const sales = parseFloat(row[3]) || 0;
        const profit = parseFloat(row[14]) || 0; // Column 15 is index 14
        
        // Filter Today
        if (orderDateStr === todayStr) {
          todaySales += sales;
          todayProfit += profit;
          todayOrders++;
          
          // Get hour of order
          const hour = orderDate.getHours();
          if (hour < 10) todayHourlyData[0] += sales;
          else if (hour < 13) todayHourlyData[1] += sales;
          else if (hour < 16) todayHourlyData[2] += sales;
          else if (hour < 19) todayHourlyData[3] += sales;
          else todayHourlyData[4] += sales;
        }
        
        // Filter Month
        if (orderMonthStr === currentMonthStr) {
          monthSales += sales;
          monthProfit += profit;
          monthOrders++;
          
          // Get week of month
          const day = orderDate.getDate();
          if (day <= 7) monthWeeklyData[0] += sales;
          else if (day <= 14) monthWeeklyData[1] += sales;
          else if (day <= 21) monthWeeklyData[2] += sales;
          else if (day <= 28) monthWeeklyData[3] += sales;
          else monthWeeklyData[4] += sales;
        }
      }
    }
    
    // Inventory: Low stock check from 'detail' sheet
    const detailSheet = ss.getSheetByName('detail') || ss.getSheetByName('Detail');
    const detailData = detailSheet ? detailSheet.getDataRange().getValues() : [];
    
    const lowStock = [];
    const allProductsMap = {};
    
    let idIdx = -1, nameIdx = -1, stockIdx = -1;
    if (detailData.length > 0) {
      const headers = detailData[0].map(h => String(h).toLowerCase().trim());
      idIdx = headers.findIndex(h => h === 'id' || h === 'sku' || h.includes('id'));
      nameIdx = headers.findIndex(h => h === 'name' || h === 'title' || h === 'ຊື່ສິນຄ້າ' || h.includes('name'));
      stockIdx = headers.findIndex(h => h === 'stock_qty' || h === 'stock' || h === 'qty' || h === 'ຈຳນວນ');
      
      for (let i = 1; i < detailData.length; i++) {
        const row = detailData[i];
        const pId = idIdx >= 0 ? String(row[idIdx]).trim() : "";
        const name = nameIdx >= 0 ? String(row[nameIdx]).trim() : "";
        const qty = stockIdx >= 0 ? parseFloat(row[stockIdx]) || 0 : 0;
        
        if (name) {
          const cleanName = name.split('[')[0].trim();
          allProductsMap[cleanName] = { id: pId, stock: qty, sold: 0 };
          
          if (qty <= 5) {
            lowStock.push({ name: name, qty: qty });
          }
        }
      }
    }
    
    // Sort low stock ascending
    lowStock.sort((a, b) => a.qty - b.qty);
    
    // Top Sellers and Dead Stock calculation using order_details
    const orderDetailSheet = ss.getSheetByName('order_details') || ss.getSheetByName('order_detail');
    const orderDetailData = orderDetailSheet ? orderDetailSheet.getDataRange().getValues() : [];
    
    if (orderDetailData.length > 1) {
      for (let i = 1; i < orderDetailData.length; i++) {
        const row = orderDetailData[i];
        const name = String(row[2] || "").trim(); // Item name is in column 3 (index 2)
        const qty = parseFloat(row[4]) || 0; // Qty is in column 5 (index 4)
        
        if (name) {
          const cleanName = name.split('[')[0].trim();
          if (allProductsMap[cleanName]) {
            allProductsMap[cleanName].sold += qty;
          }
        }
      }
    }
    
    // Extract top sellers and dead stock
    const topSellers = [];
    const deadStock = [];
    
    for (const name in allProductsMap) {
      const prod = allProductsMap[name];
      if (prod.sold > 0) {
        topSellers.push({ name: name, sold: prod.sold });
      } else {
        deadStock.push({ name: name, idleMonths: 3 }); // standard mock idle months
      }
    }
    
    topSellers.sort((a, b) => b.sold - a.sold);
    const topSellersLimit = topSellers.slice(0, 5);
    const deadStockLimit = deadStock.slice(0, 5);
    
    return JSON.stringify({
      success: true,
      sales: {
        today: {
          sales: todaySales,
          profit: todayProfit,
          orders: todayOrders,
          labels: hourlyBins,
          data: todayHourlyData
        },
        month: {
          sales: monthSales,
          profit: monthProfit,
          orders: monthOrders,
          labels: ['W1', 'W2', 'W3', 'W4', 'W5'],
          data: monthWeeklyData
        }
      },
      inventory: {
        lowStock: lowStock.slice(0, 5),
        topSellers: topSellersLimit,
        deadStock: deadStockLimit
      }
    });
  } catch(e) {
    return JSON.stringify({ success: false, error: e.toString() });
  }
}
