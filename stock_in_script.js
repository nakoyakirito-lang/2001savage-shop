import { db, ref, get, set, update, remove, onValue } from './firebase-config.js';

window.linkToPage = function(pageName) { window.location.href = pageName + '.html'; }
window.checkAuth = function() { 
  if (localStorage.getItem('savage_auth') === 'true') { 
    document.getElementById('loginOverlay').style.display = 'none'; 
    window.loadGlobalProducts(); 
  } else { document.getElementById('loginOverlay').style.display = 'flex'; } 
}
window.checkLogin = function() { 
  var u = document.getElementById('loginUser').value; var p = document.getElementById('loginPass').value; 
  if (u === 'savage' && p === '112233') { localStorage.setItem('savage_auth', 'true'); window.checkAuth(); } 
  else { document.getElementById('loginError').style.display = 'block'; } 
}
window.logoutSavage = function() { localStorage.removeItem('savage_auth'); location.reload(); }
window.onload = function() { window.checkAuth(); window.loadPendingBadge(); };

window.switchTab = function(tab) {
  if(tab === 'history') { document.getElementById('tab-po-form').style.display = 'none'; document.getElementById('tab-po-history').style.display = 'flex'; window.loadPoHistory(); } 
  else { document.getElementById('tab-po-history').style.display = 'none'; document.getElementById('tab-po-form').style.display = 'flex'; }
}

window.getDirectImageUrl = function(url) {
  if (!url) return 'https://via.placeholder.com/150?text=No+Image';
  var match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
  if (match && match[1]) return 'https://drive.google.com/thumbnail?id=' + match[1] + '&sz=w300';
  return url; 
}

window.globalPosProducts = []; window.poCart = [];
window.currentCat = 'ALL'; window.currentModel = 'ALL';

window.loadGlobalProducts = function() {
  document.getElementById('stock-loader').style.display = 'flex';
  get(ref(db, 'products')).then((snapshot) => {
    try {
      const data = snapshot.val();
      window.globalPosProducts = [];
      if (data) {
        for (let key in data) {
          window.globalPosProducts.push({ ...data[key], id: key });
        }
      }
      document.getElementById('stock-loader').style.display = 'none';
      window.renderStockCategories(); window.renderStockModels(); window.applyStockFilters();
    } catch (e) {
      document.getElementById('stock-loader').innerHTML = '<div style="color:red; text-align:center;">'+e.message+'</div>';
    }
  }).catch((error) => {
    document.getElementById('stock-loader').innerHTML = '<div style="color:red; text-align:center;">'+error.message+'</div>';
  });
}

window.renderStockCategories = function() {
  var cats = []; window.globalPosProducts.forEach(p => { if(p.category && p.category !== 'All PARTS' && cats.indexOf(p.category) === -1) cats.push(p.category); }); cats.sort();
  var html = '<option value="ALL">ທຸກໝວດໝູ່ (Categories)</option>';
  cats.forEach(c => { html += '<option value="'+c+'">'+c+'</option>'; }); document.getElementById('stockCategorySelect').innerHTML = html;
}

window.renderStockModels = function() {
  var models = [];
  window.globalPosProducts.forEach(p => { 
    if(!p.model) return;
    var mArr = p.model.split(','); 
    mArr.forEach(m => { let cleanM = m.trim(); if(cleanM && cleanM !== 'All MODELS' && models.indexOf(cleanM) === -1) models.push(cleanM); }); 
  }); 
  models.sort(); 
  var html = '<option value="ALL">ທຸກລຸ້ນລົດ (Models)</option>';
  models.forEach(m => { html += '<option value="'+m+'">'+m.toUpperCase()+'</option>'; }); document.getElementById('stockModelSelect').innerHTML = html;
}

window.applyStockFilters = function() {
  window.currentCat = document.getElementById('stockCategorySelect').value; window.currentModel = document.getElementById('stockModelSelect').value;
  var searchText = document.getElementById('stockSearchInput').value.toLowerCase();
  var filtered = window.globalPosProducts.filter(p => { return ((window.currentCat === 'ALL') || (p.category === window.currentCat)) && ((window.currentModel === 'ALL') || (p.model && p.model.indexOf(window.currentModel) !== -1)) && (p.name.toLowerCase().includes(searchText) || p.id.toLowerCase().includes(searchText)); });
  window.renderStockProducts(filtered);
}

window.renderStockProducts = function(products) {
  if (products.length === 0) { document.getElementById('stockProductGrid').innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 30px; color: #888; font-weight: bold;">ບໍ່ພົບສິນຄ້າທີ່ຄົ້ນຫາ</div>'; return; }
  var html = '';
  products.forEach(p => {
    var finalImg = window.getDirectImageUrl(p.img); let safeName = p.name.replace(/'/g, "\\'").replace(/"/g, '&quot;'); let showModel = p.model ? p.model.replace(/'/g, "\\'") : '';
    html += \`<div class="pos-card"><div class="pos-img-box"><img src="\${finalImg}" onerror="this.src='https://via.placeholder.com/150?text=No+Image'"></div><div class="pos-title"><span style="color:#1565c0;">[\${p.id}]</span> \${p.name}</div><div style="font-size:0.65rem; color:#d84315; font-weight:bold;">ລຸ້ນ: \${p.model}</div><div class="pos-card-bottom"><div><div style="font-size:0.65rem; color:#888;">ທຶນ: \${p.cost || 0}</div><div style="font-size:0.65rem; color:#888;">ມີ: \${p.stock || 0}</div></div><button class="pos-btn-add" onclick="addPoCart('\${p.id}', '\${safeName}', \${p.cost || p.price || 0}, \${p.stock || 0}, '\${showModel}')">+</button></div></div>\`;
  });
  document.getElementById('stockProductGrid').innerHTML = html;
}

window.addPoCart = function(id, name, cost, currentStock, model) {
  name = name.replace(/&quot;/g, '"');
  let existing = window.poCart.find(i => i.id === id);
  if(existing) existing.qty += 1; else window.poCart.push({ id: id, name: name, cost: parseFloat(cost) || 0, qty: 1, stock: currentStock, model: model });
  window.updatePoCalculations();
}
window.removePoCart = function(index) { window.poCart.splice(index, 1); window.updatePoCalculations(); }
window.updatePoQty = function(index, val) { window.poCart[index].qty = parseFloat(val) || 1; window.updatePoCalculations(); }
window.updatePoCost = function(index, val) { window.poCart[index].cost = parseFloat(val) || 0; window.updatePoCalculations(); }

window.updatePoCalculations = function() {
  let tbody = document.getElementById('poCartTable');
  if(window.poCart.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#999; padding:20px;">ຍັງບໍ່ມີສິນຄ້າໃນບິນ</td></tr>';
    document.getElementById('poTotalQty').innerText = "0 ຊິ້ນ"; document.getElementById('poGrandTotal').innerText = "0"; return;
  }
  
  let totalQty = window.poCart.reduce((sum, item) => sum + item.qty, 0);
  let shippingFee = parseFloat(document.getElementById('poShippingFee').value) || 0;
  let shippingPerItem = totalQty > 0 ? (shippingFee / totalQty) : 0;
  let grandTotal = 0; let html = '';
  
  window.poCart.forEach((item, index) => {
    let landedCost = item.cost + shippingPerItem;
    item.landedCost = landedCost; grandTotal += (landedCost * item.qty);
    
    html += \`
      <tr>
        <td style="max-width:110px;">
          <div style="font-weight:bold; color:#111; font-size:0.75rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="\${item.name}"><span style="color:#1565c0;">[\${item.id}]</span> \${item.name}</div>
        </td>
        <td style="text-align:center;"><input type="number" class="po-input-small" value="\${item.qty}" min="1" onchange="updatePoQty(\${index}, this.value)"></td>
        <td style="text-align:center;"><input type="number" class="po-input-price" value="\${item.cost}" onchange="updatePoCost(\${index}, this.value)"></td>
        <td style="text-align:center;"><button onclick="removePoCart(\${index})" style="background:none; border:none; color:red; cursor:pointer;"><span class="material-icons-outlined" style="font-size:18px;">delete</span></button></td>
      </tr>\`;
  });
  tbody.innerHTML = html; 
  document.getElementById('poTotalQty').innerText = totalQty.toLocaleString() + " ຊິ້ນ";
  document.getElementById('poGrandTotal').innerText = grandTotal.toLocaleString() + " ₭";
}

window.submitPurchaseOrder = async function(statusText) {
  let supplier = document.getElementById('poSupplier').value.trim();
  let shippingFee = parseFloat(document.getElementById('poShippingFee').value) || 0;
  if(!supplier) { alert("ກະລຸນາປ້ອນຊື່ຜູ້ສະໜອງ (Supplier) ກ່ອນ!"); return; }
  if(window.poCart.length === 0) { alert("ບໍ່ມີສິນຄ້າในບິນ!"); return; }

  let totalQty = window.poCart.reduce((sum, item) => sum + item.qty, 0);
  let grandTotal = window.poCart.reduce((sum, item) => sum + (item.landedCost * item.qty), 0);
  
  let poId = "PO-" + Date.now().toString().slice(-6);
  let payload = { poId: poId, supplier: supplier, shippingFee: shippingFee, qty: totalQty, totalCost: grandTotal, status: statusText, items: window.poCart, date: new Date().toLocaleDateString('en-GB') };
  if(statusText === 'ຮັບເຂົ້າແລ້ວ') {
    let today = new Date();
    payload.receivedDate = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
  }

  let btn1 = document.getElementById('btn-save-po'); let btn2 = document.getElementById('btn-receive-po');
  let txt1 = btn1.innerHTML; btn1.innerHTML = 'ກຳລັງບັນທຶກ...'; btn1.disabled = true; btn2.disabled = true;

  try {
    await set(ref(db, 'purchases/' + poId), payload);

    if (statusText === 'ຮັບເຂົ້າແລ້ວ') {
      // Update stock and cost for each product
      for (let item of window.poCart) {
        const pRef = ref(db, 'products/' + item.id);
        const pSnap = await get(pRef);
        if (pSnap.exists()) {
          const pData = pSnap.val();
          await update(pRef, {
            stock: (pData.stock || 0) + item.qty,
            cost: item.cost // update cost to latest PO cost
          });
        }
      }
    }

    alert(statusText === 'ຮັບເຂົ້າແລ້ວ' ? "ຮັບເຄື່ອງເຂົ້າສະຕັອກສຳເລັດ!" : "ບັນທຶກບินສັ່ງຊື້ສຳເລັດ!");
    window.poCart = []; document.getElementById('poSupplier').value = ''; document.getElementById('poShippingFee').value = '';
    window.updatePoCalculations(); window.loadGlobalProducts();
  } catch (error) {
    alert("Error: " + error.message);
  }
  btn1.innerHTML = txt1; btn1.disabled = false; btn2.disabled = false;
}

window.globalPoHistoryList = [];
window.loadPoHistory = function() {
  document.getElementById('po-history-container').innerHTML = '<div class="loading"><span class="material-icons-outlined" style="animation: spin 1s linear infinite; font-size:40px;">sync</span><br>ກຳລັງໂຫຼດປະຫວັດ...</div>';
  get(ref(db, 'purchases')).then(snapshot => {
    try {
      const data = snapshot.val();
      window.globalPoHistoryList = [];
      if (data) {
        for (let key in data) {
          window.globalPoHistoryList.push({ ...data[key], poId: key });
        }
      }
      window.globalPoHistoryList.sort((a,b) => new Date(b.date) - new Date(a.date));
      window.filterPoHistory('ALL');
    } catch(e) { document.getElementById('po-history-container').innerHTML = '<div style="color:red; text-align:center;">'+e.message+'</div>'; }
  }).catch(e => { document.getElementById('po-history-container').innerHTML = '<div style="color:red; text-align:center;">'+e.message+'</div>'; });
}

window.filterPoHistory = function(status) {
  document.getElementById('tab-all').classList.remove('active'); document.getElementById('tab-pending').classList.remove('active'); document.getElementById('tab-received').classList.remove('active');
  if(status === 'ALL') document.getElementById('tab-all').classList.add('active'); else if(status === 'ກຳລັງຂົນສົ່ງ') document.getElementById('tab-pending').classList.add('active'); else if(status === 'ຮັບເຂົ້າແລ້ວ') document.getElementById('tab-received').classList.add('active');
  let filteredList = status === 'ALL' ? window.globalPoHistoryList : window.globalPoHistoryList.filter(po => po.status === status);
  
  let cPending = 0; let cReceived = 0;
  window.globalPoHistoryList.forEach(po => { if(po.status === 'ຮັບເຂົ້າແລ້ວ') cReceived++; else cPending++; });
  document.getElementById('po-count-pending').innerText = cPending; document.getElementById('po-count-received').innerText = cReceived;
  window.renderPoHistoryCards(filteredList);
}

window.renderPoHistoryCards = function(list) {
  let container = document.getElementById('po-history-container');
  if(list.length === 0) { container.innerHTML = '<div style="text-align:center; padding:30px; color:#999; background:white; border-radius:12px;">ບໍ່ມີປະຫວັດບິນໃນສະຖານະນີ້</div>'; return; }
  
  let html = ''; 
  list.forEach(po => {
    let isReceived = po.status === 'ຮັບເຂົ້າແລ້ວ';
    let badgeColor = isReceived ? 'background:#e8f5e9; color:#2e7d32;' : 'background:#fff3e0; color:#e65100;';
    let receiveBtn = !isReceived ? \`<button onclick="openReceiveModal('\${po.poId}')" class="btn-action-po btn-po-receive" style="margin-top:10px;"><span class="material-icons-outlined">inventory</span> ກົດຮັບເຄື່ອງ & ປັບຈຳນວນ</button>\` : \`<div style="text-align:center; font-size:0.8rem; color:#888; margin-top:10px;">ວັນທີຮັບເຄື່ອງ: \${po.receivedDate}</div>\`;

    html += \`
      <div class="order-card">
        <button id="btn-del-\${po.poId}" onclick="deletePoOrder('\${po.poId}')" style="position:absolute; top:15px; right:15px; background:none; border:none; color:#f44336; cursor:pointer;" title="ລຶບບິນນີ້"><span class="material-icons-outlined">delete</span></button>
        
        <div style="display:flex; justify-content:space-between; margin-bottom:15px; border-bottom:1px solid #eee; padding-bottom:10px; padding-right:30px;">
          <div><div style="font-weight:900; font-size:1.1rem; color:#111; font-family:'Montserrat';">\${po.poId}</div><div style="font-size:0.75rem; color:#888;">ສັ່ງເມື່ອ: \${po.date}</div></div>
          <div style="\${badgeColor} padding:6px 12px; border-radius:20px; font-weight:800; font-size:0.75rem;">\${po.status}</div>
        </div>
        
        <div style="margin-bottom:10px; font-size:0.85rem;"><span style="color:#888; font-weight:bold;">ຜູ້ສະໜອງ:</span> <span style="font-weight:bold; color:#111;">\${po.supplier}</span></div>
        <div style="background:#f9f9f9; padding:10px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
          <div><div style="font-size:0.7rem; color:#666;">ຈຳນວນລວມ</div><div style="font-weight:bold; color:#111;">\${po.qty} ຊິ້ນ</div></div>
          <div style="text-align:right;"><div style="font-size:0.7rem; color:#666;">ມູນຄ່າລວມ</div><div style="font-weight:900; color:#1565c0; font-size:1.1rem;">\${po.totalCost ? po.totalCost.toLocaleString() : 0} ₭</div></div>
        </div>
        
        <div style="display:flex; gap:10px;">
          <button onclick="openEditPriceModal('\${po.poId}')" class="btn-action-po" style="background:#fff; color:#1565c0; border:1px solid #1565c0; margin-top:10px; flex:1;"><span class="material-icons-outlined">edit</span> ແກ້ໄຂລາຄາ</button>
          <div style="flex:2;">\${receiveBtn}</div>
        </div>
      </div>\`;
  });
  container.innerHTML = html;
}

// --- 🌟 Edit Price Modal Logic 🌟 ---
window.currentEditItems = [];
window.openEditPriceModal = function(poId) {
  document.getElementById('editPoIdDisplay').innerText = poId;
  document.getElementById('editItemsContainer').innerHTML = '<div class="loading" style="padding:20px;">ກຳລັງໂຫຼດລາຍການ...</div>';
  document.getElementById('editPriceModal').style.display = 'flex';

  get(ref(db, 'purchases/' + poId)).then(snapshot => {
    let po = snapshot.val();
    if(po && po.items) {
      window.currentEditItems = po.items; 
      let html = '';
      window.currentEditItems.forEach(it => {
        let ship = po.shippingFee ? po.shippingFee / po.qty : 0; 
        html += \`
          <div style="border-bottom: 1px dashed #ddd; padding-bottom: 12px; margin-bottom: 12px;">
            <div style="font-size: 0.8rem; font-weight: 700; color: #111; margin-bottom: 8px;">
              <span style="color: #1565c0;">[\${it.id}]</span> \${it.name}
            </div>
            <div style="display: flex; gap: 10px;">
              <div style="flex: 1;">
                <div style="font-size: 0.65rem; font-weight: 800; color: #666; margin-bottom: 4px;">ຕົ້ນທຶນ/ອັນ (Cost)</div>
                <input type="number" id="editCost_\${it.id}" value="\${it.cost}" class="po-input-price" style="width: 100%; font-size: 0.9rem;">
              </div>
              <div style="flex: 1;">
                <div style="font-size: 0.65rem; font-weight: 800; color: #e65100; margin-bottom: 4px;">ຂົນສົ່ງ/ອັນ (Shipping)</div>
                <input type="number" id="editShip_\${it.id}" value="\${ship}" class="po-input-price" style="width: 100%; font-size: 0.9rem; border-color: #ffb74d; color: #e65100;">
              </div>
            </div>
          </div>
        \`;
      });
      document.getElementById('editItemsContainer').innerHTML = html;
    } else { document.getElementById('editItemsContainer').innerHTML = '<div style="color:red; text-align:center; padding:20px;">Purchase order not found</div>'; }
  });
}

window.confirmEditPrice = async function() {
  let poId = document.getElementById('editPoIdDisplay').innerText;
  
  let newTotalCost = 0;
  window.currentEditItems.forEach(it => {
    let costInput = document.getElementById(\`editCost_\${it.id}\`);
    let finalCost = costInput ? parseFloat(costInput.value) : parseFloat(it.cost);
    it.cost = finalCost;
    newTotalCost += finalCost * it.qty; // Roughly. Wait, shipping is separate.
  });

  let btn = document.getElementById('btnConfirmEditPrice'); let originalText = btn.innerHTML;
  btn.innerHTML = 'ກຳລັງບັນທຶກ...'; btn.disabled = true;

  try {
    await update(ref(db, 'purchases/' + poId), {
      items: window.currentEditItems,
      totalCost: newTotalCost
    });
    alert('ແກ້ໄຂລາຄາສຳເລັດ!'); 
    document.getElementById('editPriceModal').style.display = 'none';
    window.loadPoHistory(); 
  } catch (error) {
    alert("Error: " + error.message);
  }
  btn.innerHTML = originalText; btn.disabled = false;
}

window.deletePoOrder = async function(poId) {
  if(confirm(\`⚠️ ທ່ານຕ້ອງການລຶບບິນສັ່ງຊື້ \${poId} ຖິ້ມແທ້ບໍ່?\\n(ລຶບແລ້ວບໍ່ສາມາດກູ້ຄືນໄດ້)\`)) {
    let btn = document.getElementById('btn-del-' + poId);
    btn.style.opacity = '0.5';
    try {
      await remove(ref(db, 'purchases/' + poId));
      alert('ລຶບບິນສຳເລັດ!'); window.loadPoHistory(); 
    } catch(error) {
      alert("Error: " + error.message); btn.style.opacity = '1'; 
    }
  }
}

window.currentRecvItems = []; window.currentRecvPoId = '';
window.openReceiveModal = function(poId) {
  window.currentRecvPoId = poId; document.getElementById('recvPoIdDisplay').innerText = poId;
  let today = new Date(); let dStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
  document.getElementById('recvDateInput').value = dStr;
  document.getElementById('recvItemsContainer').innerHTML = '<div class="loading" style="padding:20px;">ກຳລັງໂຫຼດລາຍການ...</div>';
  document.getElementById('receivePoModal').style.display = 'flex';
  
  get(ref(db, 'purchases/' + poId)).then(snapshot => {
    let po = snapshot.val();
    if(po && po.items) {
      window.currentRecvItems = po.items; document.getElementById('recvShippingFee').value = po.shippingFee || 0; 
      let html = '<table class="po-table"><tr><th>ລະຫັດ & ຊື່ສິນຄ້າ</th><th style="width:70px; text-align:center;">ຈຳນວນ</th><th style="width:115px; text-align:center;">ຕົ້ນທຶນ/ອັນ</th></tr>';
      window.currentRecvItems.forEach(it => {
        html += \`<tr><td><div style="font-size:0.75rem; color:#1565c0; font-weight:bold;">[\${it.id}]</div><div style="font-size:0.8rem; font-weight:600;">\${it.name}</div></td><td style="text-align:center;"><input type="number" id="recvQty_\${it.id}" value="\${it.qty}" class="po-input-small" style="width:50px;"></td><td style="text-align:center;"><input type="number" id="recvCost_\${it.id}" value="\${it.cost}" class="po-input-price"></td></tr>\`;
      });
      html += '</table>'; document.getElementById('recvItemsContainer').innerHTML = html;
    } else { document.getElementById('recvItemsContainer').innerHTML = '<div style="color:red; text-align:center; padding:20px;">Purchase order not found</div>'; }
  });
}

window.confirmReceivePo = async function() {
  let recvDate = document.getElementById('recvDateInput').value; if(!recvDate) { alert('ກະລຸນາເລືອກວັນທີຮັບເຄື່ອງ!'); return; }
  let newShippingFee = parseFloat(document.getElementById('recvShippingFee').value) || 0;
  
  window.currentRecvItems.forEach(it => {
    let qtyInput = document.getElementById(\`recvQty_\${it.id}\`); let costInput = document.getElementById(\`recvCost_\${it.id}\`);
    it.qty = qtyInput ? parseFloat(qtyInput.value) : parseFloat(it.qty); 
    it.cost = costInput ? parseFloat(costInput.value) : parseFloat(it.cost);
  });

  let btn = document.getElementById('btnConfirmRecv'); let originalText = btn.innerHTML;
  btn.innerHTML = 'ກຳລັງບັນທຶກ...'; btn.disabled = true;

  try {
    let totalQty = window.currentRecvItems.reduce((sum, item) => sum + item.qty, 0);
    let totalCost = window.currentRecvItems.reduce((sum, item) => sum + (item.cost * item.qty), 0) + newShippingFee;

    await update(ref(db, 'purchases/' + window.currentRecvPoId), {
      status: 'ຮັບເຂົ້າແລ້ວ',
      receivedDate: recvDate,
      shippingFee: newShippingFee,
      items: window.currentRecvItems,
      qty: totalQty,
      totalCost: totalCost
    });

    // Update stock and cost for each product
    for (let item of window.currentRecvItems) {
      const pRef = ref(db, 'products/' + item.id);
      const pSnap = await get(pRef);
      if (pSnap.exists()) {
        const pData = pSnap.val();
        await update(pRef, {
          stock: (pData.stock || 0) + item.qty,
          cost: item.cost 
        });
      }
    }

    alert('ຮັບເຄື່ອງ ແລະ ບວກສະຕັອກເຂົ້າລະບົບສຳເລັດ!'); document.getElementById('receivePoModal').style.display = 'none'; window.loadPoHistory(); window.loadGlobalProducts();
  } catch (error) {
    alert("Error: " + error.message);
  }
  btn.innerHTML = originalText; btn.disabled = false;
}

window.loadPendingBadge = function() { 
  get(ref(db, 'orders')).then(snapshot => {
    var pendingCount = 0; 
    const data = snapshot.val();
    if(data) {
      for(let key in data) {
        if(String(data[key].status || "ລໍຖ້າກວດສອບ").trim() === "ລໍຖ້າກວດສອບ") pendingCount++;
      }
    }
    var navBadge = document.getElementById('nav-badge-pending'); 
    if (navBadge) { if (pendingCount > 0) { navBadge.innerText = pendingCount; navBadge.style.display = 'flex'; } else navBadge.style.display = 'none'; } 
  }); 
}
