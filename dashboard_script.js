import { db, ref, get } from './firebase-config.js';

window.dbSales = null;
window.dbInventory = null;
window.salesChartInstance = null;

window.linkToPage = function(pageName) { window.location.href = pageName + '.html'; }

window.checkAuth = function() {
  if (localStorage.getItem('savage_auth') === 'true') {
    document.getElementById('loginOverlay').style.display = 'none';
    window.loadDashboardData();
  } else {
    document.getElementById('loginOverlay').style.display = 'flex';
  }
}

window.checkLogin = function() {
  var u = document.getElementById('loginUser').value;
  var p = document.getElementById('loginPass').value;
  if (u === 'savage' && p === '112233') {
    localStorage.setItem('savage_auth', 'true');
    window.checkAuth();
  } else {
    document.getElementById('loginError').style.display = 'block';
  }
}

window.logoutSavage = function() { localStorage.removeItem('savage_auth'); location.reload(); }

window.switchMainTab = function(tabId, element) {
  document.querySelectorAll('.m-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  
  element.classList.add('active');
  document.getElementById('tab-' + tabId).classList.add('active');
}

window.loadDashboardData = async function() {
  document.getElementById('low-stock-list').innerHTML = '<div class="loading-container">ກຳລັງໂຫຼດຂໍ້ມູນ...</div>';
  document.getElementById('top-selling-list').innerHTML = '<div class="loading-container">ກຳລັງໂຫຼດຂໍ້ມູນ...</div>';
  document.getElementById('dead-stock-list').innerHTML = '<div class="loading-container">ກຳລັງໂຫຼດຂໍ້ມູນ...</div>';
  
  try {
    const productsSnap = await get(ref(db, 'products'));
    const ordersSnap = await get(ref(db, 'orders'));
    
    const products = productsSnap.val() || {};
    const orders = ordersSnap.val() || {};

    const todayStr = new Date().toLocaleDateString('en-GB'); // DD/MM/YYYY
    const [tDay, tMonth, tYear] = todayStr.split('/');
    
    let salesToday = 0; let profitToday = 0; let ordersToday = 0;
    let salesMonth = 0; let profitMonth = 0; let ordersMonth = 0;

    let soldCounts = {};
    
    for (let key in orders) {
      let o = orders[key];
      // Skip cancelled
      if(String(o.status).trim() === "ຍົກເລີກ") continue;
      
      let oDateStr = o.date.split(' ')[0]; // DD/MM/YYYY
      let [oDay, oMonth, oYear] = oDateStr.split('/');
      
      let orderCost = 0;
      if (o.items) {
        o.items.forEach(it => {
          let p = products[it.id];
          let c = p ? (p.cost || 0) : 0;
          orderCost += c * it.qty;
          
          if(soldCounts[it.id]) soldCounts[it.id] += it.qty;
          else soldCounts[it.id] = it.qty;
        });
      }
      
      let orderProfit = (o.total || 0) - orderCost;
      
      if (oMonth === tMonth && oYear === tYear) {
        salesMonth += o.total || 0;
        profitMonth += orderProfit;
        ordersMonth++;
        
        if (oDay === tDay) {
          salesToday += o.total || 0;
          profitToday += orderProfit;
          ordersToday++;
        }
      }
    }

    // Chart mock logic (we don't have historical timeline easily without heavy parsing, so just dummy for now or simple)
    let chartLabels = ['ວັນທີ 1', 'ວັນທີ 2', 'ວັນທີ 3', 'ວັນທີ 4', 'ມື້ນີ້'];
    let chartData = [salesMonth/5, salesMonth/4, salesMonth/3, salesMonth/2, salesToday];

    window.dbSales = {
      today: { sales: salesToday, profit: profitToday, orders: ordersToday, labels: chartLabels, data: chartData },
      month: { sales: salesMonth, profit: profitMonth, orders: ordersMonth, labels: chartLabels, data: chartData }
    };

    let lowStock = [];
    let deadStock = []; // Simple approximation: products with 0 sold
    let topSellers = [];
    
    for (let id in products) {
      let p = products[id];
      if ((p.stock || 0) < 5) {
        lowStock.push({ name: p.name, qty: p.stock || 0 });
      }
      if (!soldCounts[id] && (p.stock || 0) > 0) {
        deadStock.push({ name: p.name, idleMonths: 3 }); // Mock 3 months for simplicity
      }
      if (soldCounts[id]) {
        topSellers.push({ id: id, name: p.name, sold: soldCounts[id] });
      }
    }

    topSellers.sort((a,b) => b.sold - a.sold);
    topSellers = topSellers.slice(0, 3);

    window.dbInventory = {
      lowStock: lowStock.slice(0, 5),
      topSellers: topSellers,
      deadStock: deadStock.slice(0, 5)
    };

    window.setFilter('today');
    window.renderInventory();

  } catch (e) {
    alert("Error loading dashboard: " + e.message);
  }
}

window.setFilter = function(period) {
  document.getElementById('filter-today').classList.remove('active');
  document.getElementById('filter-month').classList.remove('active');
  document.getElementById('filter-' + period).classList.add('active');

  if (!window.dbSales) return;
  const d = window.dbSales[period];
  document.getElementById('kpi-sales').innerText = Math.round(d.sales).toLocaleString() + " ₭";
  document.getElementById('kpi-profit').innerText = Math.round(d.profit).toLocaleString() + " ₭";
  document.getElementById('kpi-orders').innerText = d.orders;

  window.renderSalesChart(d.labels, d.data);
}

window.renderSalesChart = function(labels, dataArr) {
  const wrapper = document.getElementById('chart-wrapper');
  wrapper.innerHTML = '<canvas id="salesChart"></canvas>';
  const ctx = document.getElementById('salesChart').getContext('2d');

  window.salesChartInstance = new Chart(ctx, {
    type: 'bar',
    data: { labels: labels, datasets: [{ data: dataArr, backgroundColor: '#111', borderRadius: 4, barPercentage: 0.5 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { display: false }, x: { grid: { display: false } } } }
  });
}

window.renderInventory = function() {
  if (!window.dbInventory) return;
  
  let lowHtml = '';
  if(window.dbInventory.lowStock && window.dbInventory.lowStock.length > 0) {
    window.dbInventory.lowStock.forEach(item => {
      lowHtml += \`<div class="inv-item"><div class="inv-name">\${item.name}</div><div class="badge alert">ເຫຼືອ \${item.qty}</div></div>\`;
    });
  } else { lowHtml = '<div class="loading-container">ไม่มีสินค้าใกล้หมดสต็อก</div>'; }
  document.getElementById('low-stock-list').innerHTML = lowHtml;

  let topHtml = '';
  if(window.dbInventory.topSellers && window.dbInventory.topSellers.length > 0) {
    window.dbInventory.topSellers.forEach((item, index) => {
      let medals = ['🥇', '🥈', '🥉'];
      topHtml += \`<div class="inv-item"><div class="inv-name">\${medals[index]||'▪️'} \${item.name}</div><div class="badge top">ຂາຍ \${item.sold}</div></div>\`;
    });
  } else { topHtml = '<div class="loading-container">ไม่มีข้อมูลสินค้าขายดี</div>'; }
  document.getElementById('top-selling-list').innerHTML = topHtml;

  let deadHtml = '';
  if(window.dbInventory.deadStock && window.dbInventory.deadStock.length > 0) {
    window.dbInventory.deadStock.forEach(item => {
      deadHtml += \`<div class="inv-item"><div class="inv-name">\${item.name}</div><div class="badge dead">ນິ້ງມາ \${item.idleMonths} ເດືອນ</div></div>\`;
    });
  } else { deadHtml = '<div class="loading-container">ไม่มีสินค้าค้างสต็อก</div>'; }
  document.getElementById('dead-stock-list').innerHTML = deadHtml;
}

window.onload = window.checkAuth;
