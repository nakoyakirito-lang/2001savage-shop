import { db, ref, set, get } from './firebase-config.js';

window.globalCart = [];

window.onload = function() {
  window.renderCart();
  window.autoFillProfile();
};

window.autoFillProfile = function() {
  var profileData = JSON.parse(localStorage.getItem('savage_profile'));
  
  if (profileData) {
    if (profileData.name) document.getElementById('cust-name').value = profileData.name;
    if (profileData.phone) document.getElementById('cust-phone').value = profileData.phone;
    
    if (profileData.province) {
      document.getElementById('cust-province').value = profileData.province;
      window.updateDistricts(); 
      
      if (profileData.district) {
        document.getElementById('cust-district').value = profileData.district;
      }
    }
    if (profileData.address) document.getElementById('cust-shipping-branch').value = profileData.address;
  }
};

window.laoDistricts = {
  "ນະຄອນຫຼວງວຽງຈັນ": ["ຈັນທະບູລີ", "ສີໂຄດຕະບອງ", "ໄຊເສດຖາ", "ສີສັດຕະນາກ", "ນາຊາຍທอง", "ໄຊທານີ", "ຫາດຊາຍຟອງ", "ສັງທອງ", "ປາກງື່ມ"],
  "ຜົ້ງສາລີ": ["ຜົ້ງສາລີ", "ໃໝ່", "ຂວາ", "ສຳພັນ", "ບຸນເໜືອ", "ຍອດອູ", "ບຸນໃຕ້"],
  "ຫຼວງນ້ຳທາ": ["ຫຼວງນ້ຳທາ", "ສິງ", "ລອງ", "ວຽງພູຄາ", "ນາແລ"],
  "ອຸດົມໄຊ": ["ໄຊ", "ຫຼາ", "ນາໝໍ້", "ງາ", "ແບ່ງ", "ຮຸນ", "ປາກແບ່ງ"],
  "ບໍ່ແກ້ວ": ["ຫ້ວຍຊາຍ", "ຕົ້ນເຜິ້ງ", "ເມິງ", "ຜາອຸດົມ", "ປາກທາ"],
  "ຫຼວงພະບາງ": ["ຫຼວງພະບາງ", "ຊຽງເງິນ", "ນານ", "ປາກອູ", "ນ້ຳບາກ", "ງອຍ", "ປາກແຊງ", "ໂພນໄຊ", "ຈອມເພັດ", "ວຽງຄຳ", "ພູຄູນ"],
  "ຫົວພັນ": ["ຊຳເໜືອ", "ชียงຄໍ້", "ຮ້ຽມ", "ວຽງໄຊ", "ຫົວເມືອງ", "ຊຳໃຕ້", "ສົບເບົາ", "ແອດ", "ກັວນ", "ຊ່ອນ"],
  "ໄຊຍະບູລີ": ["ໄຊຍະບູລີ", "ຄອບ", "ຊຽງຮ່ອນ", "ເງິນ", "ຫົງສາ", "ໄຊສະຖານ", "ຄຳ", "ປາກລາຍ", "ແກ່ນທ້າວ", "ບໍ່ແຕນ", "ທົ່ງມີໄຊ"],
  "ຊຽງຂວາງ": ["ແປກ", "ຄຳ", "ໜອງແຮດ", "ຄູນ", "ໝອກໃໝ່", "ພູກູດ", "ຜາໄຊ"],
  "ວຽງຈັນ": ["ໂພນໂຮງ", "ທຸລະຄົມ", "ແກ້ວອຸດົມ", "ກາສີ", "ວັງວຽງ", "เຟືອງ", "ຊະນະຄາມ", "ແມດ", "ວຽງຄຳ", "ຫີນເຫີບ", "ໝື່ນ"],
  "ບໍລິຄຳໄຊ": ["ປາກຊັນ", "ທ່າພະບາດ", "ປາກກະດິງ", "ບໍລິຄັນ", "ຄຳເກີດ", "ວຽງທອງ", "ໄຊຈຳພອນ"],
  "ຄຳມ່ວນ": ["ທ່າແຂກ", "ມະຫາໄຊ", "ໜອງບົກ", "ຫີນບູນ", "ຍົມມະລາດ", "ບົວລະພາ", "ນາກາຍ", "ເຊບັ້ງໄຟ", "ໄຊບົວທອງ", "ຄູນຄຳ"],
  "ສະຫວັນນະເຂດ": ["ໄກສອນ ພົມວິຫານ", "ອຸທຸມພອນ", "ອາດສະພັງທອງ", "ພີນ", "ເຊໂປນ", "ນອງ", "ທ່າປາງທອງ", "ສອງຄອນ", "ຈຳພອນ", "ຊົນນະບູລີ", "ໄຊບູລີ", "ວີລະບຸລີ", "ອາດສະພອນ", "ໄຊພູທອງ", "ພະລານໄຊ"],
  "ສາລະວັນ": ["ສາລະວັນ", "ຕະໂອ້ຍ", "ຕຸ້ມລານ", "ລະຄອນເພັງ", "ວາປີ", "ຄົງເຊໂດນ", "ສະໝ້ວຍ"],
  "ເຊກອງ": ["ລະມາມ", "ກະລຶມ", "ດາກຈຶງ", "ທ່າແຕງ"],
  "ຈຳປາສັກ": ["ປາກເຊ", "ຊະນະສົມບູນ", "ບາຈຽງຈະເລີນສຸກ", "ປາກຊ່ອງ", "ປະທຸມພອນ", "ໂພນທອງ", "ຈຳປາສັກ", "ສຸຂຸມາ", "ມູນລະປາໂມກ", "ໂຂງ"],
  "ອັດຕະປື": ["ໄຊເສດຖາ", "ສາມັກຄີໄຊ", "ສະໜາມໄຊ", "ຊານໄຊ", "ພູວົງ"],
  "ໄຊສົມບູນ": ["ອະນຸວົງ", "ລ້ອງຊານ", "ລ້ອງແຈ້ງ", "ທ່າໂທມ", "ຮົ່ມ"]
};

window.updateDistricts = function() {
  var provSelect = document.getElementById('cust-province');
  var distSelect = document.getElementById('cust-district');
  var selectedProv = provSelect.value;
  
  distSelect.innerHTML = '<option value="" disabled selected>-- ເລືອກເມືອງ --</option>'; 
  
  if (selectedProv && window.laoDistricts[selectedProv]) {
    var districts = window.laoDistricts[selectedProv];
    for (var i = 0; i < districts.length; i++) {
      distSelect.innerHTML += '<option value="' + districts[i] + '">' + districts[i] + '</option>';
    }
    distSelect.disabled = false; 
  } else {
    distSelect.disabled = true; 
  }
};

window.renderCart = function() {
  window.globalCart = JSON.parse(localStorage.getItem('savage_cart')) || [];
  var container = document.getElementById('cart-items-list');
  var formSection = document.getElementById('customer-info-section');
  var summaryBar = document.getElementById('summary-bar');
  
  if (window.globalCart.length === 0) {
    container.innerHTML = `
      <div class="empty-cart">
        <span class="material-icons-outlined">shopping_cart</span>
        <p>ບໍ່ມີສິນຄ້າໃນກະຕ່າໃນຂະນະນີ້</p>
        <a href="index.html" class="btn-go-home">GO SHOPPING</a>
      </div>
    `;
    formSection.style.display = 'none';
    summaryBar.style.display = 'none';
    return;
  }

  formSection.style.display = 'block';
  summaryBar.style.display = 'block';
  container.innerHTML = '';

  var grandTotal = 0;

  for (var i = 0; i < window.globalCart.length; i++) {
    var item = window.globalCart[i];
    var itemSubtotal = item.price * item.qty;
    grandTotal += itemSubtotal;

    var itemHtml = `
      <div class="cart-item">
        <img src="${item.img}" class="item-img" onerror="this.src='https://via.placeholder.com/55?text=No+Image'">
        <div class="item-details">
          <div class="item-name">${item.name}</div>
          <div class="item-price">${item.price.toLocaleString()} ₭</div>
          
          <div class="qty-controls">
            <button class="qty-btn" onclick="updateQty('${item.id}', -1)"><span class="material-icons-outlined">remove</span></button>
            <span class="qty-num">${item.qty}</span>
            <button class="qty-btn" onclick="updateQty('${item.id}', 1)"><span class="material-icons-outlined">add</span></button>
          </div>
        </div>
        
        <button class="btn-delete" onclick="removeCartItem('${item.id}')">
          <span class="material-icons-outlined">delete_outline</span>
        </button>
      </div>
    `;
    container.innerHTML += itemHtml;
  }

  document.getElementById('cart-grand-total').innerText = grandTotal.toLocaleString() + ' ₭';
};

window.updateQty = function(id, delta) {
  var cart = JSON.parse(localStorage.getItem('savage_cart')) || [];
  var item = cart.find(function(c) { return c.id === id; });
  if (item) {
    item.qty += delta;
    if (item.qty < 1) item.qty = 1;
    localStorage.setItem('savage_cart', JSON.stringify(cart));
    window.renderCart();
  }
};

window.removeCartItem = function(id) {
  var cart = JSON.parse(localStorage.getItem('savage_cart')) || [];
  var updatedCart = cart.filter(function(c) { return c.id !== id; });
  localStorage.setItem('savage_cart', JSON.stringify(updatedCart));
  window.renderCart();
  window.updateCartBadge();
};

window.sendOrderViaWhatsApp = async function() {
  var name = document.getElementById('cust-name').value.trim();
  var phone = document.getElementById('cust-phone').value.trim();
  var shippingComp = document.getElementById('cust-shipping-comp').value;
  var shippingBranch = document.getElementById('cust-shipping-branch').value.trim();
  var province = document.getElementById('cust-province').value;
  var districtElem = document.getElementById('cust-district');
  var district = districtElem ? districtElem.value : "";
  var paymentMethod = document.getElementById('cust-payment-method').value;

  if (!name || !phone || !shippingComp || !shippingBranch || !district || !province) {
    alert('ກະລຸນາກອກຂໍ້ມູນຜູ້ຊື້ ແລະ ເລືອກລາຍລະອຽດການຈັດສົ່ງໃຫ້ຄົບຖ້ວນ!');
    return;
  }

  var checkoutBtn = document.getElementById('btn-submit-order');
  if (checkoutBtn) {
    checkoutBtn.disabled = true;
    checkoutBtn.innerHTML = '<span class="material-icons-outlined" style="animation: spin 1s linear infinite;">sync</span> ກຳລັງບັນທຶກຂໍ້ມູນ...';
  }

  var grandTotal = 0;
  var detailsArray = [];
  for (var i = 0; i < window.globalCart.length; i++) { 
    var item = window.globalCart[i];
    detailsArray.push(item.qty + "x " + item.name);
    grandTotal += (item.price * item.qty); 
  }
  var orderDetailsText = detailsArray.join(", ");

  var orderData = {
    cartItems: window.globalCart,
    orderDetails: orderDetailsText,
    totalPrice: grandTotal,
    name: name,
    phone: phone,
    express: shippingComp,
    address: shippingBranch,
    provinces: province,
    district: district,
    paymentMethod: paymentMethod
  };

  try {
    const generatedId = "SV" + Date.now().toString().slice(-6); // Generated short order ID
    
    // Structure order to match admin expectation
    const orderObj = {
      date: new Date().toLocaleDateString('en-GB') + ' ' + new Date().toLocaleTimeString('en-GB'),
      status: "ລໍຖ້າກວດສອບ",
      items: orderData.cartItems.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        qty: item.qty,
        subtotal: item.price * item.qty
      })),
      total: orderData.totalPrice,
      name: orderData.name,
      phone: orderData.phone,
      province: orderData.provinces,
      district: orderData.district,
      address: orderData.address,
      express: orderData.express,
      payment: orderData.paymentMethod,
      slipUrl: "", // Customer checkout has no slip yet
      orderId: generatedId
    };

    // Save order in Firebase Realtime DB
    await set(ref(db, 'orders/' + generatedId), orderObj);

    // Deduct stocks in database
    for (let item of orderObj.items) {
      const pRef = ref(db, 'products/' + item.id + '/stock');
      const snap = await get(pRef);
      if (snap.exists()) {
        let currentStock = parseFloat(snap.val()) || 0;
        await set(pRef, Math.max(0, currentStock - item.qty));
      }
    }

    // Build WhatsApp message
    var textMessage = "🏁 *ໃບສັ່ງຊື້ສິນຄ້າຈາກ SAVAGE SHOP* 🏁\n";
    textMessage += "🆔 *Order ID:* `" + generatedId + "`\n";
    textMessage += "--------------------------------------\n";
    textMessage += "👤 *ຂໍ້ມູນຜູ້ສັ່ງຊື້ ແລະ ການຈັດສົ່ງ:*\n";
    textMessage += "• ຊື່: " + orderData.name + "\n";
    textMessage += "• ເບີໂທ: " + orderData.phone + "\n";
    textMessage += "• ບໍລິສັດຂົນສົ່ງ: " + orderData.express + "\n";
    textMessage += "• สาขา: " + orderData.address + "\n";
    textMessage += "• ເມືອງ: " + orderData.district + "\n";
    textMessage += "• ແຂວງ: " + orderData.provinces + "\n";
    textMessage += "• ວິທີການຈ່າຍ: *" + orderData.paymentMethod + "*\n";
    textMessage += "--------------------------------------\n";
    textMessage += "📦 *...ລາຍການສິນຄ້າ...*\n";

    for (var i = 0; i < window.globalCart.length; i++) {
      var item = window.globalCart[i];
      var subtotal = item.price * item.qty;
      textMessage += (i + 1) + ". " + item.name + "\n";
      textMessage += "   ຈຳນວນ: " + item.qty + " x " + item.price.toLocaleString() + " ₭\n";
      textMessage += "   ລວມ: " + subtotal.toLocaleString() + " ₭\n";
    }
    textMessage += "--------------------------------------\n";
    textMessage += "💰 *ຍອດລວມທັງໝົດ (TOTAL):* *" + orderData.totalPrice.toLocaleString() + " ₭*\n";
    textMessage += "--------------------------------------\n";
    textMessage += "⚡ _ກະລຸນາລໍຖ້າແອດມິນກວດສອບສະຕັອກ ແລະ ແຈ້ງຍອດໂອນ ເພື່ອຢືນຢັນການສັ່ງຊື້_";

    // Save order in localStorage.savage_orders
    var orderHistory = JSON.parse(localStorage.getItem('savage_orders')) || [];
    orderHistory.unshift({ 
      orderId: generatedId, 
      date: new Date().toLocaleDateString('en-GB') + ' ' + new Date().toLocaleTimeString('en-GB'), 
      items: orderObj.items, 
      total: orderData.totalPrice, 
      status: 'ລໍຖ້າກວດສອບ',
      express: orderData.express,
      address: orderData.address,
      province: orderData.provinces,
      district: orderData.district,
      phone: orderData.phone
    });
    localStorage.setItem('savage_orders', JSON.stringify(orderHistory));

    var whatsappUrl = "https://wa.me/8562077912526?text=" + encodeURIComponent(textMessage);
    
    document.getElementById('display-order-id').innerText = generatedId;
    document.getElementById('success-modal').style.display = 'flex';
    
    document.getElementById('btn-go-wa').onclick = function() {
      window.open(whatsappUrl, '_blank');
    };

    // Reset cart
    localStorage.removeItem('savage_cart');
    window.renderCart();
    window.updateCartBadge();
    
    window.open(whatsappUrl, '_blank');

  } catch (error) {
    alert('เกิดข้อผิดพลาดในการบันทึกออเดอร์: ' + error.message);
    if (checkoutBtn) {
      checkoutBtn.disabled = false;
      checkoutBtn.innerHTML = '<span class="material-icons-outlined">chat</span> SEND ORDER TO WHATSAPP';
    }
  }
};

window.closeSuccessModal = function() {
  document.getElementById('success-modal').style.display = 'none';
  window.location.href = 'index.html';
};

window.updateCartBadge = function() {
  var cart = JSON.parse(localStorage.getItem('savage_cart')) || [];
  var headerBadge = document.getElementById('cart-badge'); 
  
  if (cart.length > 0) {
    var totalQty = 0;
    for (var i = 0; i < cart.length; i++) { totalQty += cart[i].qty; }
    if (headerBadge) { headerBadge.innerText = totalQty; headerBadge.style.display = 'block'; }
  } else {
    if (headerBadge) headerBadge.style.display = 'none';
  }
};

// Expose functions globally for inline calls
window.updateDistricts = window.updateDistricts;
window.updateQty = window.updateQty;
window.removeCartItem = window.removeCartItem;
window.sendOrderViaWhatsApp = window.sendOrderViaWhatsApp;
window.closeSuccessModal = window.closeSuccessModal;
