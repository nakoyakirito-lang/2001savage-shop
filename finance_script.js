import { db, ref, get, push, set } from './firebase-config.js';

window.globalFinanceData = [];
window.currentFilter = 'today';
window.expenseChartInstance = null;

window.linkToPage = function(pageName) { window.location.href = pageName + '.html'; }

window.checkAuth = function() {
  if (localStorage.getItem('savage_auth') === 'true') {
    document.getElementById('loginOverlay').style.display = 'none';
    window.loadfinanceData();
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

var localNow = new Date();
var localDateString = localNow.getFullYear() + '-' + String(localNow.getMonth() + 1).padStart(2, '0') + '-' + String(localNow.getDate()).padStart(2, '0');
document.getElementById('fi-date').value = localDateString;

window.loadfinanceData = function() {
  document.getElementById('finance-list').innerHTML = '<div style="text-align:center; padding:30px; color:#999;">ກຳລັງໂຫຼດ...</div>';
  get(ref(db, 'finance')).then(snapshot => {
    window.globalFinanceData = [];
    const data = snapshot.val();
    if(data) {
      for(let key in data) {
        window.globalFinanceData.push({ ...data[key], id: key });
      }
    }
    window.globalFinanceData.sort((a,b) => new Date(a.date) - new Date(b.date));
    window.applyFilter(); 
  }).catch(e => {
    document.getElementById('finance-list').innerHTML = '<div style="text-align:center; padding:30px; color:red;">' + e.message + '</div>';
  });
}

window.setFilter = function(period) {
  window.currentFilter = period;
  document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('filter-' + period).classList.add('active');
  
  var titles = {
    'today': 'ຈ່າຍມື້ນີ້ (TODAY)',
    'week': 'ຈ່າຍອາທິດນີ້ (THIS WEEK)',
    'month': 'ຈ່າຍເດືອນນີ້ (THIS MONTH)',
    'quarter': 'ຈ່າຍໄຕມາດນີ້ (THIS QUARTER)',
    'year': 'ຈ່າຍປີນີ້ (THIS YEAR)',
    'all': 'ຍອດຈ່າຍທັງໝົດ (ALL TIME)'
  };
  document.getElementById('display-filter-title').innerText = titles[period];

  window.applyFilter();
}

window.parseDateStr = function(dateStr) {
  var s = String(dateStr).trim();
  var monthMap = {"jan":0, "feb":1, "mar":2, "apr":3, "may":4, "jun":5, "jul":6, "aug":7, "sep":8, "oct":9, "nov":10, "dec":11};
  
  var partsDash = s.split('-');
  if (partsDash.length === 3 && isNaN(partsDash[1])) {
    var d = parseInt(partsDash[0], 10);
    var mStr = partsDash[1].toLowerCase().substring(0,3);
    var y = parseInt(partsDash[2], 10);
    if (monthMap[mStr] !== undefined) return new Date(y, monthMap[mStr], d);
  }

  var partsSlash = s.split('/');
  if (partsSlash.length === 3) return new Date(partsSlash[2], partsSlash[1] - 1, partsSlash[0]);
  
  if (partsDash.length >= 3 && !isNaN(partsDash[1])) {
     var d = partsDash[2].substring(0, 2); 
     return new Date(partsDash[0], partsDash[1] - 1, d);
  }
  return new Date(s);
}

window.renderExpenseChart = function(chartLabels, chartDataArr) {
  const ctx = document.getElementById('expenseChart').getContext('2d');
  if (window.expenseChartInstance) window.expenseChartInstance.destroy();

  window.expenseChartInstance = new Chart(ctx, {
    type: 'bar',
    data: { 
      labels: chartLabels, 
      datasets: [{ 
        data: chartDataArr, 
        backgroundColor: '#ff3d00', 
        borderRadius: 6, 
        barPercentage: 0.6 
      }] 
    },
    options: { 
      responsive: true, 
      maintainAspectRatio: false, 
      plugins: { 
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) { return context.parsed.y.toLocaleString() + ' ₭'; }
          }
        }
      }, 
      scales: { 
        y: { 
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              if (value >= 1000000) return (value / 1000000) + 'M';
              if (value >= 1000) return (value / 1000) + 'k';
              return value;
            }
          }
        }, 
        x: { 
          grid: { display: false },
          ticks: {
            autoSkip: false,
            maxRotation: 45,
            minRotation: 45,
            font: { size: 10 }
          }
        } 
      } 
    }
  });
}

window.applyFilter = function() {
  var list = document.getElementById('finance-list');
  var reportList = document.getElementById('expense-report-list');
  
  var filteredTotal = 0;
  var categoryTotals = {};
  var filteredHistoryHtml = '';

  var now = new Date();
  now.setHours(0,0,0,0);
  var startOfToday = new Date(now);
  var startOfWeek = new Date(now);
  var day = startOfWeek.getDay() || 7; 
  startOfWeek.setDate(startOfWeek.getDate() - day + 1);
  var startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  var currentQuarter = Math.floor(now.getMonth() / 3);
  var startOfQuarter = new Date(now.getFullYear(), currentQuarter * 3, 1);
  var startOfYear = new Date(now.getFullYear(), 0, 1);

  var chartLabels = [];
  var graphDataMap = {};
  var monthNamesLao = ["ມ.ກ.", "ກ.ພ.", "ມ.ນ.", "ມ.ສ.", "ພ.ພ.", "ມິ.ຖ.", "ກ.ລ.", "ສ.ຫ.", "ກ.ຍ.", "ຕ.ລ.", "ພ.ຈ.", "ທ.ວ."];
  
  function formatDayKey(d) {
    return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0');
  }
  function formatMonthKey(d) {
    return monthNamesLao[d.getMonth()] + ' ' + String(d.getFullYear()).substring(2);
  }

  if (window.currentFilter === 'today') {
    var k = formatDayKey(startOfToday);
    chartLabels.push(k);
    graphDataMap[k] = 0;
  } else if (window.currentFilter === 'week') {
    for (var d = 0; d < 7; d++) {
      var tempDate = new Date(startOfWeek);
      tempDate.setDate(startOfWeek.getDate() + d);
      var k = formatDayKey(tempDate);
      chartLabels.push(k);
      graphDataMap[k] = 0;
    }
  } else if (window.currentFilter === 'month') {
    var totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    for (var d = 1; d <= totalDays; d++) {
      var tempDate = new Date(now.getFullYear(), now.getMonth(), d);
      var k = formatDayKey(tempDate);
      chartLabels.push(k);
      graphDataMap[k] = 0;
    }
  } else if (window.currentFilter === 'quarter') {
    for (var m = 0; m < 3; m++) {
      var tempDate = new Date(now.getFullYear(), (currentQuarter * 3) + m, 1);
      var k = formatMonthKey(tempDate);
      chartLabels.push(k);
      graphDataMap[k] = 0;
    }
  } else if (window.currentFilter === 'year') {
    for (var m = 0; m < 12; m++) {
      var tempDate = new Date(now.getFullYear(), m, 1);
      var k = formatMonthKey(tempDate);
      chartLabels.push(k);
      graphDataMap[k] = 0;
    }
  }

  for (var i = window.globalFinanceData.length - 1; i >= 0; i--) {
    var row = window.globalFinanceData[i];
    if (row.type === 'ລາຍຮັບ') continue; 

    var rowDate = window.parseDateStr(row.date);
    rowDate.setHours(0,0,0,0);
    var isMatch = false;

    if (window.currentFilter === 'today' && rowDate.getTime() === startOfToday.getTime()) isMatch = true;
    if (window.currentFilter === 'week' && rowDate >= startOfWeek) isMatch = true;
    if (window.currentFilter === 'month' && rowDate >= startOfMonth) isMatch = true;
    if (window.currentFilter === 'quarter' && rowDate >= startOfQuarter) isMatch = true;
    if (window.currentFilter === 'year' && rowDate >= startOfYear) isMatch = true;
    if (window.currentFilter === 'all') isMatch = true;

    if (isMatch) {
      var amt = Number(row.amount);
      var type = row.type;

      filteredTotal += amt;
      if (!categoryTotals[type]) categoryTotals[type] = 0;
      categoryTotals[type] += amt;

      var key = (window.currentFilter === 'today' || window.currentFilter === 'week' || window.currentFilter === 'month') ? formatDayKey(rowDate) : formatMonthKey(rowDate);

      if (window.currentFilter === 'all') {
        if (graphDataMap[key] === undefined) {
          chartLabels.unshift(key); 
          graphDataMap[key] = 0;
        }
      }

      if (graphDataMap[key] !== undefined) {
        graphDataMap[key] += amt;
      }

      filteredHistoryHtml += \`
        <div class="trans-item">
          <div class="trans-icon"><span class="material-icons-outlined">payments</span></div>
          <div class="trans-info">
            <div class="trans-title">\${row.note}</div>
            <div><span class="trans-type">\${type}</span> <span class="trans-date">\${row.date}</span></div>
          </div>
          <div class="trans-amount">-\${amt.toLocaleString()}</div>
        </div>\`;
    }
  }

  document.getElementById('total-filtered').innerText = filteredTotal.toLocaleString() + ' ₭';

  var chartDataArr = [];
  for (var k = 0; k < chartLabels.length; k++) {
    chartDataArr.push(graphDataMap[chartLabels[k]] || 0);
  }

  window.renderExpenseChart(chartLabels, chartDataArr);

  if (filteredHistoryHtml === '') {
    list.innerHTML = '<div style="text-align:center; padding:30px; color:#999;">ບໍ່ມີລາຍການໃນຊ່ວງເວລານີ້</div>';
    reportList.innerHTML = '<div style="text-align:center; padding:30px; color:#999;">ບໍ່ມີລາຍການໃນຊ່ວງເວລານີ້</div>';
    return;
  } else {
    list.innerHTML = filteredHistoryHtml;
  }

  reportList.innerHTML = '';
  var categories = Object.keys(categoryTotals);
  categories.sort(function(a, b) { return categoryTotals[b] - categoryTotals[a]; }); 

  for (var c = 0; c < categories.length; c++) {
    var catName = categories[c];
    var catAmt = categoryTotals[catName];
    var percent = filteredTotal > 0 ? (catAmt / filteredTotal) * 100 : 0;
    
    var barColor = "#111";
    if (c === 1) barColor = "#555";
    if (c === 2) barColor = "#888";
    if (c > 2) barColor = "#ccc";

    reportList.innerHTML += \`
      <div class="report-item">
        <div class="report-header">
          <span>\${catName}</span>
          <span>\${catAmt.toLocaleString()} ₭</span>
        </div>
        <div class="report-bar-bg">
          <div class="report-bar-fill" style="width: \${percent}%; background-color: \${barColor};"></div>
        </div>
      </div>
    \`;
  }
}

window.saveExpense = async function() {
  var date = document.getElementById('fi-date').value;
  var type = document.getElementById('fi-type').value;
  var amount = document.getElementById('fi-amount').value;
  var note = document.getElementById('fi-note').value;

  if (!date || !amount || !note) { alert("ກະລຸນາກອກຂໍ້ມູນໃຫ້ຄົບຖ້ວນ!"); return; }

  var btn = document.getElementById('btn-save');
  btn.innerText = "ກຳລັງບັນທຶກ..."; btn.disabled = true;

  var payload = { date: date, type: type, amount: amount, note: note };
  
  try {
    const newExpRef = push(ref(db, 'finance'));
    await set(newExpRef, payload);
    
    btn.innerText = "ບັນທຶກລາຍຈ່າຍ"; btn.disabled = false;
    document.getElementById('fi-amount').value = '';
    document.getElementById('fi-note').value = '';
    window.loadfinanceData(); 
  } catch(error) {
    btn.innerText = "ບັນທຶກລາຍຈ່າຍ"; btn.disabled = false;
    alert("Error: " + error.message);
  }
}

window.onload = window.checkAuth;
