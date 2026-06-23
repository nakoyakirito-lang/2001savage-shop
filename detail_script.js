import { db, ref, get } from './firebase-config.js';

window.variationsData = [];
window.groupCoverImg = '';
window.groupName = '';
window.groupPrice = 0;
window.selectedModel = '';

window.currentIndex = -1; 
window.modalSelections = []; 
window.currentActionType = 'cart'; 

window.onload = function() {
  window.updateCartBadge();
  
  const urlParams = new URLSearchParams(window.location.search);
  window.groupName = urlParams.get('group') || '';
  window.selectedModel = urlParams.get('model') || '';
  
  // Set breadcrumbs & back link initial values
  document.querySelector('.model-name').innerText = window.groupName ? window.groupName.toUpperCase() : 'DETAIL';
  
  window.loadDetail();
};

window.loadDetail = function() {
  get(ref(db, 'products')).then(snapshot => {
    const data = snapshot.val();
    let vars = [];
    if (data) {
      for (let key in data) {
        let p = data[key];
        let pId = key;
        
        let matchesGroup = (p.category && p.category.trim() === window.groupName.trim());
        let fitsModel = false;
        if (p.model) {
          let models = p.model.split(',').map(m => m.trim().toLowerCase());
          fitsModel = (window.selectedModel === '') || models.includes(window.selectedModel.toLowerCase());
        } else {
          fitsModel = (window.selectedModel === '');
        }
        
        if (matchesGroup && fitsModel) {
          vars.push({ ...p, Product_ID: pId, Product_Name: p.name, Price: p.price, Stock_Qty: p.stock, Image_URL: p.img });
        }
      }
    }
    
    window.variationsData = vars;
    if (vars.length > 0) {
      window.groupPrice = Math.min(...vars.map(v => v.price));
      window.groupCoverImg = vars[0].img || '';
    }
    
    window.renderDetailUI();
  }).catch(e => {
    alert("Error loading details: " + e.message);
  });
};

window.getImgUrlFromItem = function(item) {
  var url = String(item.Image_URL || item.img || '');
  if (!url) return 'https://via.placeholder.com/400?text=No+Image';
  var id = '';
  var match = url.match(/(?:id=|\/file\/d\/)([a-zA-Z0-9-_]+)/);
  if (match && match[1]) id = match[1];
  return id ? 'https://lh3.googleusercontent.com/d/' + id + '=w800' : url;
};

window.renderDetailUI = function() {
  if (window.variationsData.length === 0) {
    document.getElementById('display-name').innerText = 'ບໍ່ມີຂໍ້ມູນສินค้า';
    return;
  }
  
  // Render variant thumbnails
  const thumbScroll = document.getElementById('thumb-scroll');
  if (thumbScroll) {
    if (window.variationsData.length > 1) {
      let thumbsHtml = '';
      window.variationsData.forEach((item, index) => {
        let activeClass = (index === 0) ? 'active' : '';
        let finalImg = window.getImgUrlFromItem(item);
        thumbsHtml += `
          <div class="thumbnail ${activeClass}" id="thumb-${index}" onclick="selectVariant(${index})">
            <img src="${finalImg}" onerror="this.src='https://via.placeholder.com/65?text=?'">
          </div>
        `;
      });
      thumbScroll.innerHTML = thumbsHtml;
      document.querySelector('.variant-label').style.display = 'block';
      thumbScroll.style.display = 'flex';
      
      // Render navigation arrows
      let gallery = document.querySelector('.image-gallery .main-image');
      if (gallery) {
        // Clear any existing arrows first
        let arrows = gallery.querySelectorAll('.nav-arrow');
        arrows.forEach(a => a.remove());
        
        let leftArrow = document.createElement('div');
        leftArrow.className = 'nav-arrow left';
        leftArrow.onclick = () => window.slideImage(-1);
        leftArrow.innerHTML = '<span class="material-icons-outlined" style="font-size: 18px;">chevron_left</span>';
        
        let rightArrow = document.createElement('div');
        rightArrow.className = 'nav-arrow right';
        rightArrow.onclick = () => window.slideImage(1);
        rightArrow.innerHTML = '<span class="material-icons-outlined" style="font-size: 18px;">chevron_right</span>';
        
        gallery.appendChild(leftArrow);
        gallery.appendChild(rightArrow);
      }
    } else {
      document.querySelector('.variant-label').style.display = 'none';
      thumbScroll.style.display = 'none';
    }
  }
  
  // Update fields
  document.querySelector('.info-row:nth-child(1) .info-value').innerText = window.selectedModel.toUpperCase();
  document.querySelector('.info-row:nth-child(2) .info-value').innerText = window.groupName;
  
  if (window.groupCoverImg && window.variationsData.length > 1) {
    window.showCover();
  } else {
    window.selectVariant(0);
  }
  
  window.loadGroupReviews();
};

window.showCover = function() {
  if (!window.groupCoverImg) {
    if (window.variationsData.length > 0) window.selectVariant(0);
    return;
  }
  window.currentIndex = -1;
  
  var mainImg = document.getElementById('main-img');
  mainImg.style.opacity = 0.3;
  setTimeout(function() {
    mainImg.src = window.getImgUrlFromItem({ Image_URL: window.groupCoverImg });
    mainImg.style.opacity = 1;
  }, 150);

  document.getElementById('display-name').innerText = window.groupName + ' (Overview)';
  document.getElementById('display-sku').innerText = 'CATEGORY: ' + window.groupName;
  
  var pPrice = Number(window.groupPrice || (window.variationsData.length > 0 ? window.variationsData[0].Price : 0));
  document.getElementById('display-price').innerText = pPrice.toLocaleString() + ' ₭';

  var badge = document.getElementById('display-stock');
  badge.className = 'status-badge in-stock';
  badge.innerText = 'AVAILABLE OPTIONS';
  
  window.setupButtons(true);

  var thumbs = document.querySelectorAll('.thumbnail');
  thumbs.forEach(function(th) { th.classList.remove('active'); });
};

window.selectVariant = function(index) {
  if (!window.variationsData || window.variationsData.length === 0) return;
  window.currentIndex = index;
  var item = window.variationsData[index];
  
  var mainImg = document.getElementById('main-img');
  mainImg.style.opacity = 0.3;
  setTimeout(function() {
    mainImg.src = window.getImgUrlFromItem(item);
    mainImg.style.opacity = 1;
  }, 150);

  var pName = item.Product_Name || 'ບໍ່ມີຂໍ້ມູນສินຄ້າ';
  var pSku = item.Product_ID || 'N/A';
  var pPrice = Number(item.Price || 0);
  var pStock = Number(item.Stock_Qty || 0);

  document.getElementById('display-name').innerText = pName;
  document.getElementById('display-sku').innerText = 'SKU: ' + pSku;
  document.getElementById('display-price').innerText = pPrice.toLocaleString() + ' ₭';
  
  var badge = document.getElementById('display-stock');
  
  if (pStock > 0) {
    badge.className = 'status-badge in-stock';
    badge.innerText = 'IN STOCK (' + pStock + ')';
    window.setupButtons(true);
  } else {
    badge.className = 'status-badge out-stock';
    badge.innerText = 'OUT OF STOCK';
    window.setupButtons(false);
  }
  
  var thumbs = document.querySelectorAll('.thumbnail');
  for (var k = 0; k < thumbs.length; k++) {
    if (k === index) { thumbs[k].classList.add('active'); } 
    else { thumbs[k].classList.remove('active'); }
  }
};

window.setupButtons = function(hasStock) {
  var btnAddCart = document.getElementById('btn-add-cart');
  var btnBuyNow = document.getElementById('btn-buy-now');

  if (hasStock) {
    btnAddCart.className = 'btn-buy';
    btnAddCart.onclick = function() { window.openVariantModal('cart'); };
    
    btnBuyNow.className = 'btn-buy';
    btnBuyNow.onclick = function() { window.openVariantModal('buy'); };
  } else {
    btnAddCart.className = 'btn-buy btn-disabled';
    btnAddCart.onclick = null;
    
    btnBuyNow.className = 'btn-buy btn-disabled';
    btnBuyNow.onclick = null;
  }
};

window.slideImage = function(direction) {
  if (!window.variationsData || window.variationsData.length === 0) return;
  window.currentIndex += direction;
  var maxIndex = window.variationsData.length - 1;
  var minIndex = window.groupCoverImg ? -1 : 0; 
  if (window.currentIndex > maxIndex) { window.currentIndex = minIndex; } 
  else if (window.currentIndex < minIndex) { window.currentIndex = maxIndex; }
  
  if (window.currentIndex === -1) { window.showCover(); } 
  else { window.selectVariant(window.currentIndex); }
};

window.loadGroupReviews = function() {
  var reviewSection = document.getElementById('review-section');
  var reviewContainer = document.getElementById('review-images-container');
  reviewContainer.innerHTML = ''; 
  
  let allGallery = [];
  window.variationsData.forEach(v => {
    if (v.gallery && Array.isArray(v.gallery)) {
      v.gallery.forEach(img => {
        if (img && !allGallery.includes(img)) {
          allGallery.push(img);
        }
      });
    }
  });
  
  if (allGallery.length > 0) {
    allGallery.forEach(gUrl => {
      var imgEl = document.createElement('img');
      imgEl.className = 'review-img';
      imgEl.src = window.getImgUrlFromItem({ Image_URL: gUrl });
      reviewContainer.appendChild(imgEl);
    });
    reviewSection.style.display = 'block'; 
  } else {
    reviewSection.style.display = 'none'; 
  }
};

window.calculateModalTotal = function() {
  var total = 0;
  for (var i = 0; i < window.variationsData.length; i++) {
    var qty = window.modalSelections[i] || 0;
    var price = Number(window.variationsData[i].Price || 0);
    total += (qty * price);
  }
  document.getElementById('modal-total-price').innerText = total.toLocaleString() + ' ₭';
};

window.openVariantModal = function(actionType) {
  window.currentActionType = actionType; 
  
  var listContainer = document.getElementById('modal-variants-list');
  var confirmBtn = document.getElementById('modal-confirm-btn');
  listContainer.innerHTML = '';
  
  if (actionType === 'buy') {
    confirmBtn.innerText = "ຢືນຢັນ ແລະ ໄປຊຳລະເງິນ";
    confirmBtn.style.background = "#ff3d00"; 
  } else {
    confirmBtn.innerText = "ຢືນຢັນ ເພີ່ມລົງກະต່າ";
    confirmBtn.style.background = "#111"; 
  }

  window.modalSelections = new Array(window.variationsData.length).fill(0); 

  for (var i = 0; i < window.variationsData.length; i++) {
    var item = window.variationsData[i];
    var pName = item.Product_Name || 'ບໍ່ລະບຸ';
    var pPrice = Number(item.Price || 0);
    var pStock = Number(item.Stock_Qty || 0);
    var imgSrc = window.getImgUrlFromItem(item);
    
    var controlsHtml = '';
    if (pStock > 0) {
      controlsHtml = `
        <div style="display:flex; align-items:center; gap:6px;">
          <button id="btn-minus-${i}" class="qty-btn" onclick="changeModalQty(${i}, -1)" style="border:1px solid #ddd; background:white; width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:not-allowed; opacity:0.3;">
            <span class="material-icons-outlined" style="font-size:14px;">remove</span>
          </button>
          
          <span id="modal-qty-${i}" style="font-weight:800; font-size:0.9rem; width:16px; text-align:center;">0</span>
          
          <button id="btn-plus-${i}" class="qty-btn" onclick="changeModalQty(${i}, 1)" style="border:1px solid #ddd; background:white; width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; opacity:1;">
            <span class="material-icons-outlined" style="font-size:14px;">add</span>
          </button>
        </div>
      `;
    } else {
      controlsHtml = `<div style="font-size:0.55rem; font-weight:800; color:#ff3d00; background:#ffebee; padding:4px 8px; border-radius:15px; letter-spacing:0.5px;">OUT OF STOCK</div>`;
    }

    var itemHtml = `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px dashed #eee;">
        <div style="display:flex; gap:10px; align-items:center; flex-grow:1; max-width:65%;">
          <img src="${imgSrc}" style="width:45px; height:45px; border-radius:8px; object-fit:contain; border:1px solid #eee; background:#f8f8f8;">
          <div>
            <div style="font-weight:700; font-size:0.7rem; line-height:1.2; margin-bottom:4px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${pName}</div>
            <div style="font-family:'Montserrat'; font-weight:900; color:#111; font-size:0.8rem;">${pPrice.toLocaleString()} ₭</div>
          </div>
        </div>
        <div>${controlsHtml}</div>
      </div>
    `;
    listContainer.innerHTML += itemHtml;
  }
  
  document.getElementById('cart-modal').style.display = 'flex';
  window.calculateModalTotal();
};

window.changeModalQty = function(index, delta) {
  var item = window.variationsData[index];
  var pStock = Number(item.Stock_Qty || 0);
  var newVal = window.modalSelections[index] + delta;
  
  if (newVal <= 0) newVal = 0;
  if (newVal >= pStock) newVal = pStock;
  
  window.modalSelections[index] = newVal;
  document.getElementById('modal-qty-' + index).innerText = newVal;

  var btnMinus = document.getElementById('btn-minus-' + index);
  if (btnMinus) {
    if (newVal <= 0) {
      btnMinus.style.opacity = '0.3';          
      btnMinus.style.cursor = 'not-allowed';   
    } else {
      btnMinus.style.opacity = '1';            
      btnMinus.style.cursor = 'pointer';       
    }
  }

  var btnPlus = document.getElementById('btn-plus-' + index);
  if (btnPlus) {
    if (newVal >= pStock) {
      btnPlus.style.opacity = '0.3';           
      btnPlus.style.cursor = 'not-allowed';
    } else {
      btnPlus.style.opacity = '1';
      btnPlus.style.cursor = 'pointer';
    }
  }
  
  window.calculateModalTotal(); 
};

window.closeModal = function() { 
  document.getElementById('cart-modal').style.display = 'none'; 
};

window.confirmAddToCart = function() {
  var cart = JSON.parse(localStorage.getItem('savage_cart')) || [];
  var addedCount = 0;
  
  for (var i = 0; i < window.variationsData.length; i++) {
    var qty = window.modalSelections[i];
    if (qty > 0) { 
      var item = window.variationsData[i];
      var itemId = item.Product_ID;
      
      var existing = cart.find(function(c) { return c.id === itemId; });
      if (existing) {
        existing.qty += qty;
      } else {
        cart.push({
          id: itemId,
          name: item.Product_Name,
          price: Number(item.Price || 0),
          img: window.getImgUrlFromItem(item),
          qty: qty
        });
      }
      addedCount++;
    }
  }
  
  if (addedCount === 0) {
    alert('ກະລຸນາເລືອກຈຳນวนສິນຄ້າຢ່າງໜ້ອຍ 1 ຊິ້ນ!');
    return;
  }
  
  localStorage.setItem('savage_cart', JSON.stringify(cart));
  window.updateCartBadge();
  window.closeModal();
  
  if (window.currentActionType === 'buy') {
    window.location.href = 'cart.html';
  } else {
    alert("🛒 ເພີ່ມສິນຄ້າລົງກະຕ່າແລ້ວ!");
  }
};

window.updateCartBadge = function() {
  var cart = JSON.parse(localStorage.getItem('savage_cart')) || [];
  var headerBadge = document.getElementById('cart-badge'); 
  var navBadge = document.getElementById('nav-cart-badge'); 
  
  if (cart.length > 0) {
    var totalQty = 0;
    for (var i = 0; i < cart.length; i++) { totalQty += cart[i].qty; }
    if (headerBadge) { headerBadge.innerText = totalQty; headerBadge.style.display = 'block'; }
    if (navBadge) { navBadge.innerText = totalQty; navBadge.style.display = 'block'; }
  } else {
    if (headerBadge) headerBadge.style.display = 'none';
    if (navBadge) navBadge.style.display = 'none';
  }
};

// Global scope bindings for inline calls
window.selectVariant = window.selectVariant;
window.slideImage = window.slideImage;
window.changeModalQty = window.changeModalQty;
window.closeModal = window.closeModal;
window.confirmAddToCart = window.confirmAddToCart;
