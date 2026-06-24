import { db, ref, get, auth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from './firebase-config.js';

window.globalProducts = [];
window.currentFilter = 'all';

window.linkToPage = function(pageName) { window.location.href = pageName + '.html'; }

window.checkAuth = function() {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      document.getElementById('loginOverlay').style.display = 'none';
      window.loadStockData();
    } else {
      document.getElementById('loginOverlay').style.display = 'flex';
    }
  });
}

window.checkLogin = async function() {
  var u = document.getElementById('loginUser').value.trim();
  var p = document.getElementById('loginPass').value;
  if (!u.includes('@')) u = u + '@savage.com';
  document.getElementById('loginError').style.display = 'none';
  try {
    await signInWithEmailAndPassword(auth, u, p);
  } catch (error) {
    document.getElementById('loginError').style.display = 'block';
  }
}

window.logoutSavage = async function() { await signOut(auth); }

window.loadStockData = function() {
  document.getElementById('stock-container').innerHTML = '<div style="text-align:center; padding:50px; color:#999; font-weight:700;"><span class="material-icons-outlined" style="font-size: 40px; animation: spin 1s linear infinite;">sync</span><br>ກຳລັງໂຫຼດຂໍ້ມູນສະຕັອກ...</div>';
  
  get(ref(db, 'products')).then(snapshot => {
    window.globalProducts = [];
    const data = snapshot.val();
    if(data) {
      for (let key in data) {
        window.globalProducts.push({ ...data[key], id: key });
      }
    }
    window.updateSummary();
    window.applyFilter();
  }).catch(e => {
    document.getElementById('stock-container').innerHTML = '<div style="text-align:center; padding:50px; color:red;">' + e.message + '</div>';
  });
}

window.updateSummary = function() {
  var tAll = 0, tLow = 0, tOut = 0;
  for (var i = 0; i < window.globalProducts.length; i++) {
    var qty = parseFloat(window.globalProducts[i].stock) || 0;
    tAll++;
    if (qty === 0) tOut++;
    else if (qty <= 5) tLow++; 
  }
  document.getElementById('count-total').innerText = tAll;
  document.getElementById('count-low').innerText = tLow;
  document.getElementById('count-out').innerText = tOut;
}

window.setFilter = function(status) {
  window.currentFilter = status;
  document.querySelectorAll('.f-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + status).classList.add('active');
  window.applyFilter();
}

window.applyFilter = function() {
  var keyword = document.getElementById('searchInput').value.toLowerCase().trim();
  var container = document.getElementById('stock-container');
  var html = '';
  var countShow = 0;

  for (var i = 0; i < window.globalProducts.length; i++) {
    var p = window.globalProducts[i];
    var qty = parseFloat(p.stock) || 0;
    
    var matchTab = false;
    if (window.currentFilter === 'all') matchTab = true;
    if (window.currentFilter === 'low' && qty > 0 && qty <= 5) matchTab = true;
    if (window.currentFilter === 'out' && qty === 0) matchTab = true;

    if (!matchTab) continue;

    var matchSearch = true;
    if (keyword !== '') {
      var searchStr = ((p.name || "") + " " + (p.id || "") + " " + (p.model || "")).toLowerCase();
      if (!searchStr.includes(keyword)) matchSearch = false;
    }

    if (!matchSearch) continue;

    countShow++;

    var statusClass = "status-good";
    var statusText = "ປົກກະຕິ";
    if (qty === 0) { statusClass = "status-out"; statusText = "ໝົດສະຕັອກ"; }
    else if (qty <= 5) { statusClass = "status-low"; statusText = "ໃກ້ໝົດ"; }

    var cleanName = (p.name || "Unknown").split('[')[0].trim();

    html += \`
      <div class="stock-item \${statusClass}">
        <div class="item-info">
          <div class="item-name">\${cleanName}</div>
          <div class="item-meta">
            <span><span class="material-icons-outlined" style="font-size:12px; vertical-align:middle;">qr_code</span> \${p.id}</span>
            <span style="color: #2196F3;"><span class="material-icons-outlined" style="font-size:12px; vertical-align:middle;">directions_car</span> ລຸ້ນ: \${p.model || '-'}</span>
            <span>💰 ₭\${(p.price || 0).toLocaleString()}</span>
          </div>
        </div>
        <div class="stock-badge-container">
          <div class="stock-qty">\${qty}</div>
          <div class="stock-status">\${statusText}</div>
        </div>
      </div>
    \`;
  }

  if (countShow === 0) {
    container.innerHTML = '<div style="text-align:center; padding:40px; color:#999; font-weight:700;">ບໍ່ພົບລາຍການສິນຄ້າ</div>';
  } else {
    container.innerHTML = html;
  }
}

window.checkAuth();
