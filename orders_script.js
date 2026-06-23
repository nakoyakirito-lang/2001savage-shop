import { db, ref, get, update } from './firebase-config.js';

window.currentStatusFilter = 'ALL';

window.onload = function() {
  window.loadCart();
  window.updateNavBadge();
  window.syncOrderStatuses();
};

window.syncOrderStatuses = function() {
  var orders = JSON.parse(localStorage.getItem('savage_orders')) || [];
  if (orders.length === 0) return;
  
  var orderIds = orders.map(o => o.orderId);
  var container = document.getElementById('content-history');
  
  let promises = orderIds.map(oId => get(ref(db, 'orders/' + oId)));
  
  Promise.all(promises).then(snapshots => {
    var updated = false;
    snapshots.forEach(snap => {
      if (snap.exists()) {
        let liveVal = snap.val();
        let localOrderIndex = orders.findIndex(o => o.orderId === snap.key);
        if (localOrderIndex !== -1) {
          let localOrder = orders[localOrderIndex];
          if (localOrder.status !== liveVal.status ||
              localOrder.express !== liveVal.express ||
              localOrder.address !== liveVal.address ||
              localOrder.province !== liveVal.province ||
              localOrder.district !== liveVal.district ||
              localOrder.phone !== liveVal.phone) {
            
            orders[localOrderIndex].status = liveVal.status || orders[localOrderIndex].status;
            orders[localOrderIndex].express = liveVal.express || orders[localOrderIndex].express;
            orders[localOrderIndex].address = liveVal.address || orders[localOrderIndex].address;
            orders[localOrderIndex].province = liveVal.province || orders[localOrderIndex].province;
            orders[localOrderIndex].district = liveVal.district || orders[localOrderIndex].district;
            orders[localOrderIndex].phone = liveVal.phone || orders[localOrderIndex].phone;
            updated = true;
          }
        }
      }
    });
    
    if (updated) {
      localStorage.setItem('savage_orders', JSON.stringify(orders));
      if (document.getElementById('tab-btn-history').classList.contains('active')) {
        window.loadHistory();
      }
      window.updateNavBadge();
    }
  }).catch(err => {
    console.error("Error syncing order statuses:", err);
  });
};

window.switchTab = function(tabId) {
  document.getElementById('tab-btn-cart').classList.remove('active');
  document.getElementById('tab-btn-history').classList.remove('active');
  document.getElementById('content-cart').classList.remove('active');
  document.getElementById('content-history').classList.remove('active');
  document.getElementById('tab-btn-' + tabId).classList.add('active');
  document.getElementById('content-' + tabId).classList.add('active');

  if(tabId === 'cart') window.loadCart();
  if(tabId === 'history') window.loadHistory();
};

window.updateNavBadge = function() {
  var cart = JSON.parse(localStorage.getItem('savage_cart')) || [];
  var badgeBottom = document.getElementById('nav-cart-badge');
  var badgeTop = document.getElementById('cart-tab-badge'); 
  
  var totalQty = 0;
  for (var i = 0; i < cart.length; i++) { totalQty += cart[i].qty; }
  
  if (totalQty > 0) {
    if (badgeBottom) { badgeBottom.innerText = totalQty; badgeBottom.style.display = 'block'; }
    if (badgeTop) { badgeTop.innerText = totalQty; badgeTop.style.display = 'inline-block'; }
  } else {
    if (badgeBottom) badgeBottom.style.display = 'none';
    if (badgeTop) badgeTop.style.display = 'none';
  }

  // Count pending history orders
  var orders = JSON.parse(localStorage.getItem('savage_orders')) || [];
  var pendingCount = 0;
  for (var j = 0; j < orders.length; j++) {
    if (orders[j].status === "ລໍຖ້າກວດສອບ") pendingCount++;
  }
  var historyBadge = document.getElementById('history-tab-badge');
  if (historyBadge) {
    if (pendingCount > 0) {
      historyBadge.innerText = pendingCount;
      historyBadge.style.display = 'inline-block';
    } else {
      historyBadge.style.display = 'none';
    }
  }
};

window.loadCart = function() {
  var cart = JSON.parse(localStorage.getItem('savage_cart')) || [];
  var container = document.getElementById('content-cart');
  if (cart.length === 0) {
    container.innerHTML = `<div class="empty-state"><span class="material-icons-outlined">shopping_cart</span><p>ບໍ່ມີສິນຄ້າໃນກະຕ່າໃນຂະນະນີ້</p><a href="index.html" class="btn-go-home">GO SHOPPING</a></div>`;
    window.updateNavBadge(); return;
  }
  var html = ''; var grandTotal = 0;
  for (var i = 0; i < cart.length; i++) {
    var item = cart[i]; grandTotal += (item.price * item.qty);
    html += `
      <div class="cart-item">
        <img src="${item.img}" class="item-img" onerror="this.src='https://via.placeholder.com/70?text=No+Image'">
        <div class="item-details">
          <div class="item-header">
            <div class="item-name">${item.name}</div>
            <button class="btn-delete" onclick="removeCartItem(${i})"><span class="material-icons-outlined" style="font-size: 20px;">delete_outline</span></button>
          </div>
          <div class="item-price">${item.price.toLocaleString()} ₭</div>
          <div class="qty-controls">
            <button class="qty-btn" onclick="updateCartQty(${i}, -1)"><span class="material-icons-outlined" style="font-size: 16px;">remove</span></button>
            <span class="qty-num">${item.qty}</span>
            <button class="qty-btn" onclick="updateCartQty(${i}, 1)"><span class="material-icons-outlined" style="font-size: 16px;">add</span></button>
          </div>
        </div>
      </div>`;
  }
  html += `
    <div class="cart-total-box">
      <div style="font-size:0.8rem; font-weight:700; color:#666; margin-bottom:5px;">ຍອດລວມທັງໝົດ (TOTAL)</div>
      <div style="font-size:1.5rem; font-weight:900; font-family:'Montserrat'; color:#ff3d00;">${grandTotal.toLocaleString()} ₭</div>
      <button class="btn-checkout" onclick="window.location.href='cart.html'"><span class="material-icons-outlined">payments</span>ສັ່ງຊື້ ແລະ ຊຳລະເງິນ (CHECKOUT)</button>
    </div>`;
  container.innerHTML = html; window.updateNavBadge(); 
};

window.updateCartQty = function(index, delta) { 
  var cart = JSON.parse(localStorage.getItem('savage_cart')) || []; 
  if (cart[index]) { 
    cart[index].qty += delta; 
    if (cart[index].qty < 1) cart[index].qty = 1; 
    localStorage.setItem('savage_cart', JSON.stringify(cart)); 
    window.loadCart(); 
  } 
};

window.removeCartItem = function(index) { 
  if(confirm('ຕ້ອງການລຶບສິນຄ້ານີ້ອອກຈາກກະຕ່າແທ້ບໍ່?')) { 
    var cart = JSON.parse(localStorage.getItem('savage_cart')) || []; 
    cart.splice(index, 1); 
    localStorage.setItem('savage_cart', JSON.stringify(cart)); 
    window.loadCart(); 
  } 
};

window.filterHistoryStatus = function(status) {
  window.currentStatusFilter = status;
  var orders = JSON.parse(localStorage.getItem('savage_orders')) || [];
  var container = document.getElementById('content-history');
  window.renderHistoryCards(orders, container);
};

window.loadHistory = function() {
  var orders = JSON.parse(localStorage.getItem('savage_orders')) || [];
  var container = document.getElementById('content-history');
  
  if (orders.length === 0) {
    container.innerHTML = `<div class="empty-state"><span class="material-icons-outlined">receipt_long</span><p>ຍັງບໍ່ມີປະຫວັດการສັ່ງຊື້</p></div>`; 
    window.updateNavBadge();
    return;
  }

  window.renderHistoryCards(orders, container);
  window.updateNavBadge();
  window.syncOrderStatuses();
};

window.renderHistoryCards = function(orders, container) {
  var counts = { "ລໍຖ້າກວດສອບ": 0, "ຢືນຢັນແລ້ວ": 0, "ລໍຖ້າຈັດສົ່ງ": 0, "ຈັດສົ່ງແລ້ວ": 0, "ສົ່ງບິນແລ້ວ": 0, "ຍົກເລີກ": 0 };
  for (var i = 0; i < orders.length; i++) {
    if (counts[orders[i].status] !== undefined) counts[orders[i].status]++;
  }

  var statuses = [
    { id: 'ALL', name: 'ທັງໝົດ' },
    { id: 'ລໍຖ້າກວດສອບ', name: 'ລໍຖ້າກວດສອບ' },
    { id: 'ຢືນຢັນແລ້ວ', name: 'ຢືນຢັນແລ້ວ' },
    { id: 'ລໍຖ້າຈັດສົ່ງ', name: 'ລໍຖ້າຈັດສົ່ງ' },
    { id: 'ຈັດສົ່ງແລ້ວ', name: 'ຈັດສົ່ງແລ້ວ' },
    { id: 'ສົ່ງບິນແລ້ວ', name: 'ສົ່ງບິນແລ້ວ' },
    { id: 'ຍົກເລີກ', name: 'ຍົກເລີກ' }
  ];

  var filterHtml = `<div class="status-filter-bar">`;
  for (var i = 0; i < statuses.length; i++) {
    var s = statuses[i];
    var isActive = (window.currentStatusFilter === s.id) ? 'active' : '';
    var badgeHtml = '';
    
    if (s.id === 'ALL') {
      badgeHtml = `<span class="status-badge-count" style="background:#111;">${orders.length}</span>`;
    } else if (counts[s.id] > 0) {
      badgeHtml = `<span class="status-badge-count">${counts[s.id]}</span>`;
    }
    
    filterHtml += `<div class="status-tab ${isActive}" onclick="filterHistoryStatus('${s.id}')">${s.name} ${badgeHtml}</div>`;
  }
  filterHtml += `</div>`;

  var filteredOrders = orders;
  if (window.currentStatusFilter !== 'ALL') {
    filteredOrders = orders.filter(function(o) { return o.status === window.currentStatusFilter; });
  }

  var html = filterHtml + `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
      <span style="font-size:0.85rem; font-weight:900; color:#111;">ປະຫວັດການສັ່ງຊື້ຂອງທ່ານ</span>
      <button onclick="loadHistory()" style="background:#111; color:white; border:none; padding:6px 14px; border-radius:20px; font-size:0.75rem; font-weight:800; display:flex; align-items:center; gap:4px; cursor:pointer;">
        <span class="material-icons-outlined" style="font-size:14px;">refresh</span> ໂຫຼດໃໝ່
      </button>
    </div>`;
  
  if (filteredOrders.length === 0) {
    html += `<div class="empty-state"><span class="material-icons-outlined">receipt_long</span><p>ບໍ່ມີອໍເດີ້ໃນສະຖານະນີ້</p></div>`;
  }

  for (var i = 0; i < filteredOrders.length; i++) {
    var order = filteredOrders[i];
    var statusColor = "#ff9800"; var statusBg = "#fff3e0"; 
    if(order.status === "ຢືນຢັນແລ້ວ") { statusColor = "#1565c0"; statusBg = "#e3f2fd"; }
    else if(order.status === "ລໍຖ້າຈັດສົ່ງ") { statusColor = "#00838f"; statusBg = "#e0f7fa"; }
    else if(order.status === "ຈັດສົ່ງແລ້ວ") { statusColor = "#2e7d32"; statusBg = "#e8f5e9"; }
    else if(order.status === "ສົ່ງບິນແລ້ວ") { statusColor = "#6a1b9a"; statusBg = "#f3e5f5"; }
    else if(order.status === "ຍົກເລີກ") { statusColor = "#c62828"; statusBg = "#ffebee"; }

    var itemsHtml = '';
    if (order.items) {
      for(var j = 0; j < order.items.length; j++) {
        itemsHtml += `<div class="item-row"><span style="max-width:70%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${order.items[j].qty}x ${order.items[j].name}</span><span>${(order.items[j].qty * order.items[j].price).toLocaleString()} ₭</span></div>`;
      }
    }

    var actionBtnsHtml = '';
    if (order.status === "ລໍຖ້າກວດສອບ") {
      actionBtnsHtml = `
        <div style="display:flex; gap:10px; margin-top:10px;">
          <button onclick="openEditModal('${order.orderId}')" style="flex:1; padding:8px; background:#fff; border:1px solid #111; color:#111; border-radius:8px; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:5px;">
            <span class="material-icons-outlined" style="font-size:16px;">edit</span> ແກ້ໄຂທີ່ຢູ່
          </button>
          <button onclick="cancelCustomerOrder('${order.orderId}')" style="flex:1; padding:8px; background:#ffebee; border:1px solid #ffcdd2; color:#d32f2f; border-radius:8px; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:5px;">
            <span class="material-icons-outlined" style="font-size:16px;">cancel</span> ຍົກເລີກ
          </button>
        </div>
      `;
    }

    html += `
      <div class="order-card">
        <div class="order-header">
          <div style="font-family:'Montserrat'; font-weight:900; font-size:1rem; color:#111;">#${order.orderId}</div>
          <div class="order-status" style="color:${statusColor}; background:${statusBg};">${order.status}</div>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; color:#888; font-weight:700;">
          <div style="display:flex; align-items:center; gap:4px;"><span class="material-icons-outlined" style="font-size:14px;">schedule</span> ${order.date}</div>
        </div>

        <div style="margin-top:12px; padding-top:12px; border-top:1px dashed #eee;">
          <div style="background:#f5f5f5; padding:12px; border-radius:8px; margin-bottom:12px; font-size:0.75rem; color:#444; line-height:1.5;">
            <div style="font-weight:900; color:#111; margin-bottom:5px; font-size:0.8rem;">📍 ຂໍ້ມູນการຈັດສົ່ງ:</div>
            <div><b>ຂົນສົ່ງ:</b> ${order.express || '-'}</div>
            <div><b>ສາຂາ/ສະຖານທີ່:</b> ${order.address || '-'}</div>
            <div><b>ເມືອງ:</b> ${order.district || '-'}, <b>ແຂວງ:</b> ${order.province || '-'}</div>
            <div><b>ເບີໂທ:</b> ${order.phone || '-'}</div>
            ${actionBtnsHtml}
          </div>

          <div style="font-weight:800; font-size:0.75rem; color:#999; margin-bottom:8px;">📦 ລາຍການສິນຄ້າທີສັ່ງ:</div>
          ${itemsHtml}
          
          <div class="order-footer">
            <div style="font-size:0.8rem; font-weight:800;">ຍອດລວມທັງໝົດ:</div>
            <div style="font-family:'Montserrat'; font-weight:900; font-size:1.1rem; color:#ff3d00;">${order.total.toLocaleString()} ₭</div>
          </div>
        </div>
      </div>
    `;
  }
  container.innerHTML = html;
};

window.cancelCustomerOrder = function(orderId) {
  if(confirm('⚠️ ທ່ານຕ້ອງການຍົກເລີກອໍເດີ້ ' + orderId + ' ແທ້ບໍ່?')) {
    var orders = JSON.parse(localStorage.getItem('savage_orders')) || [];
    for(var i=0; i<orders.length; i++) {
      if(orders[i].orderId === orderId) {
        orders[i].status = "ຍົກເລີກ";
        break;
      }
    }
    localStorage.setItem('savage_orders', JSON.stringify(orders));
    window.loadHistory(); 
    
    // Update status in Firebase database
    update(ref(db, 'orders/' + orderId), { status: "ຍົກເລີກ" }).catch(e => {
      console.error("Error cancelling order in DB:", e);
    });
  }
};

window.openEditModal = function(orderId) {
  var orders = JSON.parse(localStorage.getItem('savage_orders')) || [];
  var o = orders.find(function(x){ return x.orderId === orderId; });
  if(!o) return;
  
  document.getElementById('edit-id').value = o.orderId;
  document.getElementById('edit-express').value = o.express || '';
  document.getElementById('edit-address').value = o.address || '';
  document.getElementById('edit-province').value = o.province || '';
  document.getElementById('edit-district').value = o.district || '';
  document.getElementById('edit-phone').value = o.phone || '';
  
  document.getElementById('addressModal').style.display = 'flex';
};

window.closeEditModal = function() {
  document.getElementById('addressModal').style.display = 'none';
};

window.saveAddress = function() {
  var id = document.getElementById('edit-id').value;
  var express = document.getElementById('edit-express').value;
  var address = document.getElementById('edit-address').value;
  var province = document.getElementById('edit-province').value;
  var district = document.getElementById('edit-district').value;
  var phone = document.getElementById('edit-phone').value;
  
  var btn = document.getElementById('btn-save-address');
  btn.innerText = 'ກຳລັງບັນທຶກ...';
  btn.disabled = true;

  update(ref(db, 'orders/' + id), {
    express: express,
    address: address,
    province: province,
    district: district,
    phone: phone
  }).then(() => {
    btn.innerText = 'ບັນທຶກ';
    btn.disabled = false;
    
    // Update localStorage
    var orders = JSON.parse(localStorage.getItem('savage_orders')) || [];
    for(var i=0; i<orders.length; i++) {
      if(orders[i].orderId === id) {
        orders[i].express = express;
        orders[i].address = address;
        orders[i].province = province;
        orders[i].district = district;
        orders[i].phone = phone;
        break;
      }
    }
    localStorage.setItem('savage_orders', JSON.stringify(orders));
    
    alert('ອັບເດດຂໍ້ມູນການຈັດສົ່ງສຳເລັດ!');
    window.closeEditModal();
    window.loadHistory(); 
  }).catch(e => {
    btn.innerText = 'ບັນທຶก';
    btn.disabled = false;
    alert('ເກີດຂໍ້ຜິດພາດ: ' + e.message);
  });
};

// Global bindings for inline triggers
window.switchTab = window.switchTab;
window.updateCartQty = window.updateCartQty;
window.removeCartItem = window.removeCartItem;
window.filterHistoryStatus = window.filterHistoryStatus;
window.loadHistory = window.loadHistory;
window.cancelCustomerOrder = window.cancelCustomerOrder;
window.openEditModal = window.openEditModal;
window.closeEditModal = window.closeEditModal;
window.saveAddress = window.saveAddress;
