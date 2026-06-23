import { db, ref, get, set, auth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from './firebase-config.js';

window.linkToPage = function(pageName) { window.location.href = pageName + '.html'; }

window.checkAuth = function() {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      document.getElementById('loginOverlay').style.display = 'none';
      window.loadDropdownData(); 
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
window.onload = function() { window.checkAuth(); };

window.loadDropdownData = function() {
  get(ref(db, 'products')).then(snapshot => {
    let gSet = new Set();
    let mSet = new Set();
    const data = snapshot.val();
    if (data) {
      for(let key in data) {
        let p = data[key];
        if(p.category) gSet.add(p.category);
        if(p.model) {
          p.model.split(',').forEach(m => mSet.add(m.trim()));
        }
      }
    }
    
    let gList = document.getElementById('groupList');
    let mList = document.getElementById('modelList');
    gList.innerHTML = ''; mList.innerHTML = '';
    
    Array.from(gSet).sort().forEach(g => { if(g) gList.innerHTML += \`<option value="\${g}">\`; });
    Array.from(mSet).sort().forEach(m => { if(m) mList.innerHTML += \`<option value="\${m}">\`; });
  });
}

window.readFileAsBase64DataUrl = function(file) {
  return new Promise((resolve) => {
    let reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.readAsDataURL(file);
  });
}

window.submitProduct = async function() {
  let productId = document.getElementById('p-id').value.trim();
  let group = document.getElementById('p-group').value.trim();
  let name = document.getElementById('p-name').value.trim();
  let model = document.getElementById('p-model').value.trim();
  let costPrice = document.getElementById('p-cost').value;
  let sellPrice = document.getElementById('p-price').value;
  
  let mainInput = document.getElementById('p-image');
  let galleryInput = document.getElementById('p-gallery');

  if (!group || !name || !model || !costPrice || !sellPrice) {
    alert('ກະລຸນາປ້ອນຂໍ້ມູນທີ່ມີເຄື່ອງໝາຍ * ໃຫ້ຄົບຖ້ວນ!');
    return;
  }

  let btn = document.getElementById('btn-save'); 
  btn.innerHTML = '<span class="material-icons-outlined" style="animation: spin 1s linear infinite;">sync</span> ກຳລັງບັນທຶກ ແລະ ອັບໂຫຼດຮູບ...';
  btn.disabled = true;

  if (!productId) {
    productId = "P" + Date.now().toString().slice(-5); // Generate simple ID
  }

  let productData = {
    category: group,
    name: name,
    model: model,
    cost: parseFloat(costPrice),
    price: parseFloat(sellPrice),
    stock: 0, // Default stock 0
    gallery: [] 
  };

  try {
    if (mainInput.files.length > 0) {
      productData.img = await window.readFileAsBase64DataUrl(mainInput.files[0]);
    } else {
      productData.img = "";
    }

    if (galleryInput.files.length > 0) {
      for (let i = 0; i < galleryInput.files.length; i++) {
        let b64Url = await window.readFileAsBase64DataUrl(galleryInput.files[i]);
        productData.gallery.push(b64Url);
      }
    }

    await set(ref(db, 'products/' + productId), productData);

    document.getElementById('showNewId').innerText = productId;
    document.getElementById('successModalProd').style.display = 'flex';
  } catch (error) {
    alert('ເກີດຂໍ້ຜິດພາດ: ' + error.message);
  }

  btn.innerHTML = '<span class="material-icons-outlined">save</span> ບັນທຶກສິນຄ້າເຂົ້າລະບົບ';
  btn.disabled = false;
}

window.resetFormProd = function() {
  document.getElementById('p-id').value = '';
  document.getElementById('p-name').value = '';
  document.getElementById('p-cost').value = '';
  document.getElementById('p-price').value = '';
  document.getElementById('p-image').value = '';
  document.getElementById('p-gallery').value = '';
  document.getElementById('successModalProd').style.display = 'none';
}
