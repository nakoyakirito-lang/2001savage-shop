import { db, ref, get } from './firebase-config.js';

window.globalProducts = [];
window.currentModel = 'ALL';

window.onload = function() {
  window.updateCartBadge();
  window.loadProducts();
};

window.loadProducts = function() {
  const container = document.getElementById('groupGrid');
  container.innerHTML = '<div style="grid-column: span 2; text-align:center; padding:50px; color:#999; font-weight:700;"><span class="material-icons-outlined" style="font-size: 40px; animation: spin 1s linear infinite;">sync</span><br>ກຳລັງໂຫຼດຂໍ້ມູນ...</div>';
  
  get(ref(db, 'products')).then(snapshot => {
    window.globalProducts = [];
    const data = snapshot.val();
    if(data) {
      for (let key in data) {
        window.globalProducts.push({ ...data[key], id: key });
      }
    }
    window.renderCategoriesAndModels();
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

window.renderCategoriesAndModels = function() {
  // Build unique categories and models lists
  let categoriesMap = {}; // name -> { count, minPrice, img, models: Set }
  let uniqueModels = new Set();
  
  window.globalProducts.forEach(p => {
    let cat = p.category || 'ບໍ່ລະບຸ';
    let price = parseFloat(p.price) || 0;
    
    // Parse models
    let pModels = [];
    if (p.model) {
      pModels = p.model.split(',').map(m => m.trim());
      pModels.forEach(m => {
        if(m && m !== 'All MODELS') {
          uniqueModels.add(m);
        }
      });
    }
    
    if (!categoriesMap[cat]) {
      categoriesMap[cat] = {
        count: 0,
        minPrice: price,
        img: p.img || '',
        models: new Set()
      };
    }
    
    categoriesMap[cat].count++;
    if (price < categoriesMap[cat].minPrice) {
      categoriesMap[cat].minPrice = price;
    }
    if (!categoriesMap[cat].img && p.img) {
      categoriesMap[cat].img = p.img;
    }
    pModels.forEach(m => categoriesMap[cat].models.add(m.toLowerCase()));
  });
  
  // Render Model Tabs
  const modelTabs = document.getElementById('modelTabs');
  let modelTabsHtml = '<button class="tab-btn active" onclick="filterData(\'ALL\', this)">ທຸກລຸ້ນລົດ</button>';
  Array.from(uniqueModels).sort().forEach(m => {
    modelTabsHtml += `<button class="tab-btn" onclick="filterData('${m}', this)">${m.toUpperCase()}</button>`;
  });
  modelTabs.innerHTML = modelTabsHtml;
  
  // Render Category Select Dropdown
  const groupSelect = document.getElementById('groupSelect');
  let groupSelectHtml = '<option value="ALL">ທຸກໝວດໝູ່</option>';
  Object.keys(categoriesMap).sort().forEach(cat => {
    groupSelectHtml += `<option value="${cat.toLowerCase()}">${cat}</option>`;
  });
  groupSelect.innerHTML = groupSelectHtml;
  
  // Render Group Cards
  const groupGrid = document.getElementById('groupGrid');
  let cardsHtml = '';
  
  Object.keys(categoriesMap).sort().forEach(catName => {
    let cat = categoriesMap[catName];
    let modelsAttr = Array.from(cat.models).join('|');
    let finalImg = window.getImg(cat.img);
    
    cardsHtml += `
      <div class="card group-item" data-name="${catName.toLowerCase()}" data-models="${modelsAttr}" onclick="goToGroup('${encodeURIComponent(catName)}')">
        <div class="badge-count">${cat.count} ລາຍການ</div>
        <div class="img-box"><img src="${finalImg}" onerror="this.src='https://via.placeholder.com/200?text=No+Image'"></div>
        <div class="card-info">
          <div class="card-title">${catName}</div>
          <div class="card-price-row">
            <div class="card-price">${cat.minPrice.toLocaleString()} ₭</div>
            <span class="material-icons-outlined card-check">check_circle</span>
          </div>
        </div>
      </div>
    `;
  });
  
  cardsHtml += '<div class="empty-state" id="emptyState" style="display:none;">ບໍ່ພົບໝວດໝູ່ທີ່ຄົ້ນຫາ</div>';
  groupGrid.innerHTML = cardsHtml;
  window.applyFilter(); // Apply initial filter states
};

window.filterData = function(model, btnElement) {
  window.currentModel = model;
  var btns = document.querySelectorAll('.tab-btn');
  btns.forEach(b => b.classList.remove('active'));
  btnElement.classList.add('active');
  window.applyFilter();
};

window.applyFilter = function() {
  var searchInput = document.getElementById('searchInput');
  var groupSelect = document.getElementById('groupSelect');
  if(!searchInput || !groupSelect) return;

  var searchTxt = searchInput.value.toLowerCase().trim();
  var selectedGroup = groupSelect.value;
  var cards = document.querySelectorAll('.group-item');
  var visibleCount = 0;
  
  cards.forEach(card => {
    var cName = card.getAttribute('data-name');
    var cModels = card.getAttribute('data-models');
    
    var matchSearch = cName.includes(searchTxt);
    var matchModel = (window.currentModel === 'ALL') || cModels.includes(window.currentModel.toLowerCase());
    var matchDropdown = (selectedGroup === 'ALL') || (cName === selectedGroup);
    
    if(matchSearch && matchModel && matchDropdown) {
      card.style.display = 'flex'; 
      visibleCount++;
    } else {
      card.style.display = 'none';
    }
  });
  
  var emptyState = document.getElementById('emptyState');
  if(emptyState) {
    emptyState.style.display = (visibleCount === 0) ? 'block' : 'none';
  }
};

window.goToGroup = function(encodedGroup) {
  var url = 'parts.html?group=' + encodedGroup; // Wait, parts.html filter model first or directly detail.html?
  // Let's check what home.html originally did:
  // var url = '<?= getScriptUrl() ?>?page=detail&group=' + encodedGroup;
  // Ah! home.html originally linked directly to "detail.html" (which shows options for that group). 
  // Let's check what parts.html did: parts.html links to detail.html too!
  // Wait! In home.html:
  //   onclick="goToGroup('<?= encodeURIComponent(gName) ?>')"
  //   goToGroup: var url = '<?= getScriptUrl() ?>?page=detail&group=' + encodedGroup;
  // Yes! It goes directly to detail.html. So we go directly to detail.html as well!
  var destUrl = 'detail.html?group=' + encodedGroup;
  if (window.currentModel !== 'ALL') {
    destUrl += '&model=' + encodeURIComponent(window.currentModel);
  }
  window.location.href = destUrl;
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
