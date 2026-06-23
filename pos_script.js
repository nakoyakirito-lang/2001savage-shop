import { db, ref, get, set, push, onValue, update } from './firebase-config.js';

// --- 🔒 ລະບົບ Login & Link ---
window.linkToPage = function(pageName) {
  window.location.href = pageName + '.html';
};

window.checkAuth = function() {
  if (localStorage.getItem('savage_auth') === 'true') {
    document.getElementById('loginOverlay').style.display = 'none';
    window.loadPosProductsFromServer(); 
  } else { document.getElementById('loginOverlay').style.display = 'flex'; }
};

window.checkLogin = function() {
  var u = document.getElementById('loginUser').value;
  var p = document.getElementById('loginPass').value;
  if (u === 'savage' && p === '112233') {
    localStorage.setItem('savage_auth', 'true'); window.checkAuth();
  } else { document.getElementById('loginError').style.display = 'block'; }
};

window.logoutSavage = function() { localStorage.removeItem('savage_auth'); location.reload(); };
window.onload = function() { window.checkAuth(); };

// --- 🛒 ລະບົບ POS (ດຶງສິນຄ້າ & ຄິດເງິນ) ---
window.globalPosProducts = [];
window.posCart = [];
window.currentCategory = 'ALL';
window.currentModel = 'ALL';
window.cartSubtotal = 0;

window.laoDistricts = {
  "ນະຄອນຫຼວງວຽງຈັນ": ["ຈันທະບູລີ", "ສີໂຄດຕະບອງ", "ໄຊເສດຖາ", "ສີສັດຕະນາກ", "ນາຊາຍທອງ", "ໄຊທານີ", "ຫາດຊາຍຟອງ", "ສັງທອງ", "ປາກງື່ມ"],
  "ຜົ້ງສາລີ": ["ຜົ້ງສາລີ", "ໃໝ່", "ຂວາ", "ສຳພັນ", "ບຸນເໜືອ", "ຍອດອູ", "ບຸນໃຕ້"],
  "ຫຼວງນ້ຳທາ": ["ຫຼວງນ້ຳທາ", "ສິງ", "ລອງ", "ວຽງພູຄາ", "ນາແລ"],
  "ອຸດົມໄຊ": ["ໄຊ", "ຫຼາ", "ນາໝໍ້", "ງາ", "ແບ່ງ", "ຮຸນ", "ປາກແບ່ງ"],
  "ບໍ່ແກ້ວ": ["ຫ້ວຍຊາຍ", "ຕົ້ນເຜິ້ງ", "ເມິງ", "ຜາອຸດົມ", "ປາກທา"],
  "ຫຼວງພະບາງ": ["ຫຼວງພະບາງ", "ຊຽງເງິນ", "ນານ", "ປາກອູ", "ນ້ຳບາກ", "ງອຍ", "ປາກແຊງ", "ໂພນໄຊ", "ຈອມເພັດ", "ວຽງຄຳ", "ພູຄູນ"],
  "ຫົວພັນ": ["ຊຳເໜືອ", "ຊຽງຄໍ້", "ຮ້ຽມ", "ວຽງໄຊ", "ຫົວເມືອງ", "ຊຳໃຕ້", "ສົບເບົາ", "ແອດ", "ກັວນ", "ຊ່ອນ"],
  "ໄຊຍະບູລີ": ["ໄຊຍະບູລີ", "ຄອບ", "ຊຽງຮ່ອນ", "ເງິນ", "ຫົງສາ", "ໄຊສະຖານ", "ຄຳ", "ປາກລາຍ", "ແກ່ນທ້າວ", "ບໍ່ແຕນ", "ທົ່ງມີໄຊ"],
  "ຊຽງຂວາງ": ["ແປກ", "ຄຳ", "ໜອງແຮດ", "ຄູນ", "ໝອກໃໝ່", "ພູກູດ", "ຜາໄຊ"],
  "ວຽງຈັນ": ["ໂພນໂຮງ", "ທຸລະຄົມ", "ແກ້ວອຸດົມ", "ກາສີ", "ວັງວຽງ", "ເຟືອງ", "ຊະນະຄາມ", "ແມດ", "ວຽງຄຳ", "ຫີນເຫີບ", "ໝື່ນ"],
  "ບໍລິຄຳໄຊ": ["ປາກຊັນ", "ທ່າພະບາດ", "ປາກກະດິງ", "ບໍລິຄັນ", "ຄຳເກີດ", "ວຽງທອງ", "ໄຊຈຳພອນ"],
  "ຄຳມ່ວນ": ["ທ່າແຂກ", "ມະຫາໄຊ", "ໜອງບົກ", "ຫີນບູນ", "ຍົມມະລາດ", "ບົວລະພາ", "ນາກາຍ", "ເຊບັ້ງໄຟ", "ໄຊບົວທອງ", "ຄູນຄຳ"],
  "ສະຫວັນນະເຂດ": ["ໄກສອນ ພົມວິຫານ", "ອຸທຸມພອນ", "ອາດສະພັງທອງ", "ພີນ", "ເຊໂປນ", "ນອງ", "ທ່າປາງທອງ", "ສອງຄອນ", "ຈຳພອນ", "ຊົນນະບູລີ", "ໄຊບູລີ", "ວີລະບຸລີ", "ອາດສະພອນ", "ໄຊພູທອງ", "ພະລານໄซ"],
  "ສາລະວັນ": ["ສາລະວັນ", "ຕະໂອ້ຍ", "ຕຸ້ມລານ", "ລະຄອນເພັງ", "ວາປີ", "ຄົງເຊໂດນ", "ສະໝ້ວຍ"],
  "ເຊກອງ": ["ລະມາມ", "ກະລຶມ", "ດາກຈຶງ", "ທ່າແຕງ"],
  "ຈຳປາສັກ": ["ປາກເຊ", "ຊະນະສົມບູນ", "ບາຈຽງຈະເລີນສຸກ", "ປາກຊ່ອງ", "ປະທຸມພອນ", "ໂພນທອງ", "ຈຳປາສັກ", "ສຸຂຸມາ", "ມູນລະປາໂມກ", "ໂຂງ"],
  "ອັດຕະປື": ["ໄຊເສດຖາ", "ສາມັກຄີໄຊ", "ສະໜາມໄຊ", "ຊານໄຊ", "ພູວົງ"],
  "ໄຊສົມບູນ": ["ອະນຸວົງ", "ລ້ອງຊານ", "ລ້ອງແຈ້ງ", "ທ່າໂທມ", "ຮົ່ມ"]
};

window.updatePosDistricts = function() {
  var provSelect = document.getElementById('posCustProvince');
  var distSelect = document.getElementById('posCustDistrict');
  var selectedProv = provSelect.value;
  distSelect.innerHTML = '<option value="" disabled selected>-- ເລືອກເມືອງກ່ອນ --</option>'; 
  if (selectedProv && window.laoDistricts[selectedProv]) {
    var districts = window.laoDistricts[selectedProv];
    for (var i = 0; i < districts.length; i++) { distSelect.innerHTML += '<option value="' + districts[i] + '">' + districts[i] + '</option>'; }
    distSelect.disabled = false; 
  } else { distSelect.disabled = true; }
};

window.getDirectImageUrl = function(url) {
  if (!url) return 'https://via.placeholder.com/150?text=No+Image';
  var match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
  if (match && match[1]) return 'https://drive.google.com/thumbnail?id=' + match[1] + '&sz=w300';
  return url; 
};

window.loadPosProductsFromServer = function() {
  document.getElementById('pos-loader').style.display = 'flex';
  get(ref(db, 'products')).then((snapshot) => {
    try {
      const data = snapshot.val();
      window.globalPosProducts = [];
      if (data) {
        for (let key in data) {
          window.globalPosProducts.push({ ...data[key], id: key });
        }
      }
      document.getElementById('pos-loader').style.display = 'none';
      if (window.globalPosProducts.length === 0) {
        document.getElementById('posProductGrid').innerHTML = '<div style="color:#666; font-weight:bold; text-align:center;">ບໍ່ມີສິນຄ້າໃນລະບົບ</div>'; return;
      }
      window.renderPosCategories(); window.renderPosModels(); window.renderPosProducts(window.globalPosProducts); 
    } catch (e) { document.getElementById('pos-loader').innerHTML = '<div style="color:red;">' + e.message + '</div>'; }
  }).catch((error) => {
    document.getElementById('pos-loader').innerHTML = '<div style="color:red;">' + error.message + '</div>';
  });
};

window.renderPosCategories = function() {
  var cats = [];
  window.globalPosProducts.forEach(function(p) { 
    if(p.category && p.category !== 'All PARTS' && p.category !== '' && cats.indexOf(p.category) === -1) cats.push(p.category); 
  });
  cats.sort();
  var html = '<option value="ALL">ທຸກໝວດໝູ່ (All Categories)</option>';
  cats.forEach(function(c) { html += '<option value="'+c+'">'+c+'</option>'; });
  document.getElementById('posCategorySelect').innerHTML = html;
};

window.renderPosModels = function() {
  var models = [];
  window.globalPosProducts.forEach(function(p) {
    if(!p.model) return;
    var mArr = p.model.split(','); 
    mArr.forEach(function(m) {
      var cleanM = m.trim();
      if(cleanM && cleanM !== 'All MODELS' && cleanM !== '' && models.indexOf(cleanM) === -1) models.push(cleanM);
    });
  });
  models.sort(); 
  var html = \`<button class="pos-cat-btn active" onclick="filterPosModel('ALL', this)">ທຸກລຸ້ນລົດ</button>\`;
  models.forEach(function(m) { html += \`<button class="pos-cat-btn" onclick="filterPosModel('\${m}', this)">\${m.toUpperCase()}</button>\`; });
  document.getElementById('posModelTabs').innerHTML = html;
};

window.filterPosModel = function(model, btn) {
  var btns = document.getElementsByClassName('pos-cat-btn');
  for(var i=0; i<btns.length; i++) btns[i].classList.remove('active');
  btn.classList.add('active');
  window.currentModel = model; window.applyFilters(); 
};

window.applyFilters = function() {
  window.currentCategory = document.getElementById('posCategorySelect').value;
  var searchText = document.getElementById('posSearchInput').value.toLowerCase();
  var filtered = window.globalPosProducts.filter(function(p) {
    var passCat = (window.currentCategory === 'ALL') || (p.category === window.currentCategory);
    var passModel = (window.currentModel === 'ALL') || (p.model && p.model.indexOf(window.currentModel) !== -1);
    var passSearch = p.name.toLowerCase().includes(searchText);
    return passCat && passModel && passSearch;
  });
  window.renderPosProducts(filtered);
};

window.renderPosProducts = function(products) {
  if (products.length === 0) {
    document.getElementById('posProductGrid').innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 30px; color: #888; font-weight: bold;">ບໍ່ພົບສິນຄ້າທີ່ຄົ້ນຫາ</div>'; return;
  }
  var html = '';
  products.forEach(function(p) {
    var finalImg = window.getDirectImageUrl(p.img); 
    html += \`
      <div class="pos-card">
        <div class="pos-img-box"><img src="\${finalImg}" onerror="this.src='https://via.placeholder.com/150?text=No+Image'"></div>
        <div class="pos-title">\${p.name}</div>
        <div class="pos-card-bottom">
          <div class="pos-price">\${p.price.toLocaleString()} ₭</div>
          <button class="pos-btn-add" onclick="addPosToCart('\${p.id}')">+</button>
        </div>
      </div>\`;
  });
  document.getElementById('posProductGrid').innerHTML = html;
};

window.addPosToCart = function(id) {
  let product = window.globalPosProducts.find(p => p.id === id);
  if (!product) return;

  let existing = window.posCart.find(i => i.id === id);
  
  if (existing) {
    if (existing.qty + 1 > product.stock) {
      alert("⚠️ ຂໍອະໄພ! ສິນຄ້ານີ້ມີໃນສະຕັອກພຽງ " + product.stock + " ຊິ້ນເທົ່ານັ້ນ!");
      return; 
    }
    existing.qty += 1;
  } else {
    if (product.stock < 1) {
      alert("⚠️ ຂໍອະໄພ! ສິນຄ້ານີ້ໝົດສະຕັອກແແລ້ວ!");
      return;
    }
    window.posCart.push({ id: product.id, name: product.name, price: product.price, qty: 1, stock: product.stock });
  }
  window.updatePosCartUI(); 
};

window.updatePosCartQty = function(index, change) {
  let item = window.posCart[index];
  let newQty = item.qty + change;
  
  if (newQty > item.stock) {
    alert("⚠️ ຂໍອະໄພ! ສິນຄ້ານີ້ມີໃນສະຕັອກພຽງ " + item.stock + " ຊິ້ນ!");
    return;
  }
  
  if (newQty < 1) {
    window.posCart.splice(index, 1);
  } else {
    item.qty = newQty;
  }
  window.updatePosCartUI(); 
};

window.updatePosCartUI = function() {
  var container = document.getElementById('posCartItems');
  if(window.posCart.length === 0) {
    container.innerHTML = \`<div style="text-align:center; color:#ccc; margin-top:50px;"><span class="material-icons-outlined" style="font-size:40px;">shopping_basket</span><br><span style="font-size:0.75rem; font-weight:bold;">ຍັງບໍ່ມີສິນຄ້າ</span></div>\`;
    document.getElementById('posTotalCount').innerText = '0';
    document.getElementById('posGrandTotal').innerText = '0 ₭'; return;
  }
  var html = ''; var grandTotal = 0; var totalQty = 0;
  window.posCart.forEach(function(item, index) {
    grandTotal += (item.price * item.qty); totalQty += item.qty;
    html += \`
      <div class="pos-c-item">
        <div><div class="pos-c-title">\${item.name}</div><div class="pos-c-price">\${item.price.toLocaleString()} ₭</div></div>
        <div class="pos-c-qty"><button class="pos-c-btn" onclick="updatePosCartQty(\${index}, -1)">-</button><span style="font-weight:900;">\${item.qty}</span><button class="pos-c-btn" onclick="updatePosCartQty(\${index}, 1)">+</button></div>
      </div>\`;
  });
  container.innerHTML = html;
  document.getElementById('posTotalCount').innerText = totalQty;
  document.getElementById('posGrandTotal').innerText = grandTotal.toLocaleString() + ' ₭';
};

window.openPosCheckout = function() {
  if(window.posCart.length === 0) { alert("ກະລຸນາເລືອກສິນຄ້າກ່ອນ!"); return; }
  window.cartSubtotal = 0; var summaryHtml = '';
  window.posCart.forEach(function(i) {
    var lineTotal = i.price * i.qty; window.cartSubtotal += lineTotal;
    summaryHtml += \`<div class="summary-item"><span>\${i.qty}x \${i.name}</span><strong>\${lineTotal.toLocaleString()} ₭</strong></div>\`;
  });
  document.getElementById('checkoutSummaryItems').innerHTML = summaryHtml;
  document.getElementById('modalSubtotal').innerText = window.cartSubtotal.toLocaleString() + ' ₭';
  document.getElementById('posDiscount').value = ''; 
  window.calculateFinalTotal();
  document.getElementById('posCheckoutModal').style.display = 'flex';
};

window.calculateFinalTotal = function() {
  var discount = parseFloat(document.getElementById('posDiscount').value) || 0;
  var net = window.cartSubtotal - discount; if (net < 0) net = 0; 
  document.getElementById('modalNetTotal').innerText = net.toLocaleString() + ' ₭';
};

window.submitPosOrderData = async function() {
  var name = document.getElementById('posCustName').value;
  var phone = document.getElementById('posCustPhone').value;
  var provinceElem = document.getElementById('posCustProvince');
  var province = provinceElem ? provinceElem.value : "";
  var districtElem = document.getElementById('posCustDistrict');
  var district = districtElem && !districtElem.disabled ? districtElem.value : "";
  var address = document.getElementById('posCustAddress').value;
  var express = document.getElementById('posCustExpress').value;
  var paymentType = document.getElementById('posCustPayment').value;
  
  var discount = parseFloat(document.getElementById('posDiscount').value) || 0;
  var finalTotal = window.cartSubtotal - discount; 
  if (finalTotal < 0) finalTotal = 0;

  var discountedCart = []; 
  var remainingDiscount = discount;
  for (var i = 0; i < window.posCart.length; i++) {
    var item = window.posCart[i];
    var lineTotal = item.price * item.qty;
    var itemDiscountTotal = 0;
    
    if (window.cartSubtotal > 0) {
      itemDiscountTotal = Math.round(discount * (lineTotal / window.cartSubtotal));
    }
    if (i === window.posCart.length - 1) {
      itemDiscountTotal = remainingDiscount; 
    }

    var actualReceivedPrice = (lineTotal - itemDiscountTotal) / item.qty;
    discountedCart.push({ id: item.id, name: item.name, price: actualReceivedPrice, qty: item.qty, subtotal: lineTotal - itemDiscountTotal });
    remainingDiscount -= itemDiscountTotal;
  }

  var finalPaymentString = paymentType;
  if (discount > 0) finalPaymentString += " (ມີສ່ວນຫຼຸດ " + discount.toLocaleString() + " ₭)";

  var btn = document.getElementById('btnPosSubmit');
  btn.innerText = 'ກຳລັງບັນທຶກ...'; 
  btn.disabled = true;

  try {
      const generatedId = "SV" + Date.now().toString().slice(-6); // Short random ID
      
      const orderObj = {
        date: new Date().toLocaleDateString('en-GB') + ' ' + new Date().toLocaleTimeString('en-GB'),
        status: "ລໍຖ້າຈັດສົ່ງ",
        items: discountedCart,
        total: finalTotal,
        name: name,
        phone: phone,
        province: province,
        district: district,
        address: address,
        express: express,
        payment: finalPaymentString,
        slipUrl: "POS_BILL",
        orderId: generatedId
      };
      
      await set(ref(db, 'orders/' + generatedId), orderObj);

      // Deduct stock
      for (let item of discountedCart) {
          const pRef = ref(db, 'products/' + item.id + '/stock');
          const snap = await get(pRef);
          if (snap.exists()) {
              await set(pRef, snap.val() - item.qty);
          }
      }

      var textMessage = "🏁 *ໃบສັ່ງຊື້ສິນຄ້າຈາກ SAVAGE SHOP* 🏁\\n🆔 *Order ID:* \`" + generatedId + "\`\\n--------------------------------------\\n👤 *ຂໍ້ມູນຜູ້ສັ່ງຊື້ ແລະ ການຈັດສົ່ງ:*\\n• ຊື່: " + (name || "-") + "\\n• ເບີໂທ: " + (phone || "-") + "\\n• ບໍລິສັດຂົນສົ່ງ: " + express + "\\n• ສາຂາ: " + (address || "-") + "\\n• ເມືອງ: " + (district || "-") + "\\n• ແຂວງ: " + (province || "-") + "\\n• ວິທີການຈ່າຍ: *" + finalPaymentString + "*\\n--------------------------------------\\n📦 *...ລາຍການສິນຄ້າ...*\\n";
      for (var i = 0; i < discountedCart.length; i++) {
        var item = discountedCart[i]; 
        var unitPrice = Math.round(item.price); 
        var subtotal = Math.round(item.subtotal);
        textMessage += (i + 1) + ". " + item.name + "\\n   ຈຳນວນ: " + item.qty + " x " + unitPrice.toLocaleString() + " ₭\\n   ...ລວມ: " + subtotal.toLocaleString() + " ₭\\n";
      }
      textMessage += "--------------------------------------\\n💰 *ຍອດລວມທັງໝົດ (TOTAL):* *" + Math.round(finalTotal).toLocaleString() + " ₭*\\n--------------------------------------\\n⚡ _ຂອບໃຈທີ່ອຸດໜູນ SAVAGE SHOP_ ⚡";

      var waPhone = phone.replace(/[^0-9]/g, ''); 
      if(waPhone.startsWith('020')) waPhone = '85620' + waPhone.substring(3);
      else if(waPhone.startsWith('20')) waPhone = '85620' + waPhone.substring(2);
      
      var whatsappUrl = (waPhone.length >= 10) ? "https://wa.me/" + waPhone + "?text=" + encodeURIComponent(textMessage) : "https://wa.me/?text=" + encodeURIComponent(textMessage);

      document.getElementById('successOrderId').innerText = generatedId;
      document.getElementById('btnPosWa').onclick = function() { window.open(whatsappUrl, '_blank'); };
      document.getElementById('btnPosPrint').onclick = function() { window.printPosBill(generatedId, {name:name, phone:phone, express:express, address:address, district:district, province:province, payment:finalPaymentString}, discountedCart, finalTotal); };

      document.getElementById('posCheckoutModal').style.display = 'none';
      document.getElementById('posSuccessModal').style.display = 'flex';

      window.posCart = []; 
      window.updatePosCartUI(); 
      document.getElementById('posCustName').value = ''; 
      document.getElementById('posCustPhone').value = '';
      document.getElementById('posDiscount').value = '';
      
      if(provinceElem) provinceElem.value = '';
      if(districtElem) {
        districtElem.innerHTML = '<option value="" disabled selected>-- ເລືອກເມືອງກ່ອນ --</option>';
        districtElem.disabled = true;
      }
      document.getElementById('posCustAddress').value = '';

      btn.innerText = 'ຢືນຢັນສ້າງບິນ'; 
      btn.disabled = false;

  } catch (error) {
      alert('System Error: ' + error.message); 
      btn.innerText = 'ຢືนຢັນສ້າງບິນ'; 
      btn.disabled = false; 
  }
};

window.printPosBill = function(orderId, cust, items, totalAmt) {
  var itemsHtml = '';
  items.forEach(function(i) {
    var subtotal = Math.round(i.price * i.qty);
    itemsHtml += '<div style="display:flex; justify-content:space-between; margin-bottom:5px; border-bottom: 1px dashed #ccc; padding-bottom:5px;"><div style="font-weight:900; color:#000;">' + i.qty + 'x ' + i.name + '</div><div style="font-weight:900; color:#000;">' + subtotal.toLocaleString() + ' ₭</div></div>';
  });
  var printWindow = window.open('', '_blank');
  var billHtml = '<!DOCTYPE html><html><head><title>Order Bill - ' + orderId + '</title>' +
    '<style>body { font-family: sans-serif; padding: 10px; color: #000; background: #fff; font-size: 14px; }' +
    '.bill-container { border: 2px solid #000; padding: 20px; max-width: 400px; margin: 0 auto; border-radius: 8px; }' +
    '.text-center { text-align: center; }' +
    '.brand-title { font-size: 1.5rem; font-weight: 900; margin-bottom: 5px; color: #000; }' +
    '.order-id { font-size: 1.2rem; font-weight: 900; border: 2px solid #000; padding: 5px 10px; margin: 10px 0; border-radius: 4px; display:inline-block; }' +
    '.info-box { margin-bottom: 15px; line-height:1.6; border-bottom:2px solid #000; padding-bottom:10px; color: #000; }' +
    '.items-box { margin-top: 15px; margin-bottom: 15px; }' +
    '.total-box { font-size: 1.3rem; font-weight: 900; border-top: 2px solid #000; padding-top: 10px; display:flex; justify-content:space-between; color: #000; }</style>' +
    '</head><body><div class="bill-container"><div class="text-center"><div class="brand-title">SAVAGE SHOP</div>' +
    '<div style="font-weight:bold;">ໃບຮັບເງິນ (Receipt)</div><div class="order-id">' + orderId + '</div></div>' +
    '<div class="info-box"><div class="bill-name">ລູກຄ້າ: ' + (cust.name || 'ບໍ່ລະບຸຊື່') + '</div>' +
    '<div class="bill-phone">📞 ໂທ: ' + (cust.phone || '-') + '</div>' +
    '<div style="margin-top:8px;"><strong>ຈັດສົ່ງ:</strong> ' + cust.express + '</div>' +
    '<div><strong>ສາຂາ/ສະຖານທີ່:</strong> ' + (cust.address || '-') + '</div>' +
    '<div><strong>ເມືອງ:</strong> ' + (cust.district || '-') + ', <strong>ແຂວງ:</strong> ' + (cust.province || '-') + '</div>' +
    '<div><strong>ຊຳລະດ້ວຍ:</strong> ' + cust.payment + '</div></div>' +
    '<div class="items-box"><div style="font-weight:bold; border-bottom:1px solid #000; padding-bottom:5px; margin-bottom:8px;">ລາຍການສິນຄ້າ:</div>' + itemsHtml + '</div>' +
    '<div class="total-box"><span>ຍອດລວມທັງໝົດ:</span><span>' + totalAmt.toLocaleString() + ' ₭</span></div></div>' +
    '<script>window.onload = function() { setTimeout(function(){ window.print(); window.close(); }, 800); };<\\/script></body></html>';
  printWindow.document.write(billHtml);
  printWindow.document.close();
};
