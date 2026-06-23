import { db, ref, get } from './firebase-config.js';

window.globalProducts = [];
window.selectedModel = '';

window.onload = function() {
  window.updateCartBadge();
  
  // Get model from URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  window.selectedModel = urlParams.get('model') || '';
  
  // Update UI breadcrumb and titles
  document.querySelector('.active-crumb').innerText = window.selectedModel ? window.selectedModel.toUpperCase() : 'PARTS';
  document.querySelector('.page-title').innerText = window.selectedModel ? window.selectedModel.toUpperCase() + '\nPARTS' : 'PARTS';
  document.querySelector('.page-desc').innerText = `PRECISION ENGINEERED AFTERMARKET COMPONENTS FOR ${window.selectedModel ? window.selectedModel.toUpperCase() : 'ALL'} SERIES.`;
  
  window.loadParts();
};

window.loadParts = function() {
  const container = document.querySelector('.grid-container');
  container.innerHTML = '<div style="grid-column: span 2; text-align:center; padding:50px; color:#999; font-weight:700;"><span class="material-icons-outlined" style="font-size: 40px; animation: spin 1s linear infinite;">sync</span><br>ກຳລັງໂຫຼດຂໍ້ມູນ...</div>';
  
  get(ref(db, 'products')).then(snapshot => {
    window.globalProducts = [];
    const data = snapshot.val();
    if(data) {
      for (let key in data) {
        window.globalProducts.push({ ...data[key], id: key });
      }
    }
    window.renderPartsGrid();
  }).catch(e => {
    container.innerHTML = '<div style="grid-column: span 2; text-align:center; padding:50px; color:red;">' + e.message + '</div>';
  });
};

window.getImg = function(url) {
  if (!url) return 'https://via.placeholder.com/200?text=No+Image';
  var id = '';
  var match = url.match(/(?:id=|\/file\/d\/)([a-zA-Z0-9-_]+)/);
  if (match && match[1]) id = match[1];
  return id ? 'https://lh3.googleusercontent.com/d/' + id : url;
};

window.renderPartsGrid = function() {
  const container = document.querySelector('.grid-container');
  
  // Group products by category
  let categoriesMap = {}; // name -> { count: 0, minPrice: Infinity, img: '', matchesModel: false }
  
  window.globalProducts.forEach(p => {
    let cat = p.category || 'ບໍ່ລະບຸ';
    let price = parseFloat(p.price) || 0;
    
    // Check if fits selected model
    let fitsModel = false;
    if (p.model) {
      let models = p.model.split(',').map(m => m.trim().toLowerCase());
      fitsModel = (window.selectedModel === '') || models.includes(window.selectedModel.toLowerCase());
    } else {
      fitsModel = (window.selectedModel === '');
    }
    
    if (fitsModel) {
      if (!categoriesMap[cat]) {
        categoriesMap[cat] = {
          count: 0,
          minPrice: price,
          img: p.img || '',
          matchesModel: true
        };
      }
      
      categoriesMap[cat].count++;
      if (price < categoriesMap[cat].minPrice) {
        categoriesMap[cat].minPrice = price;
      }
      if (!categoriesMap[cat].img && p.img) {
        categoriesMap[cat].img = p.img;
      }
    }
  });
  
  let html = '';
  let keys = Object.keys(categoriesMap).sort();
  
  if (keys.length === 0) {
    html = '<div style="grid-column: span 2; text-align: center; padding: 40px; color: #999; font-size: 0.8rem;">ບໍ່ມີຂໍ້ມູນອາໄຫຼ່ໃນຂະນະນີ້</div>';
  } else {
    keys.forEach(catName => {
      let cat = categoriesMap[catName];
      let finalImg = window.getImg(cat.img);
      let detailUrl = `detail.html?model=${encodeURIComponent(window.selectedModel)}&group=${encodeURIComponent(catName)}`;
      
      html += `
        <a class="card" href="${detailUrl}">
          <div class="badge-count">${cat.count} OPTIONS</div>
          <div class="img-box"><img src="${finalImg}" onerror="this.src='https://via.placeholder.com/200?text=No+Image'"></div>
          <div class="card-info">
            <div class="card-cat">${window.selectedModel.toUpperCase()}</div>
            <div class="card-title">${catName}</div>
            <div class="card-price-row">
              <div class="card-price">${cat.minPrice.toLocaleString()} ₭</div>
              <span class="material-icons-outlined card-check">check_circle</span>
            </div>
          </div>
        </a>
      `;
    });
  }
  
  container.innerHTML = html;
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
