import {load,save,reset} from './data.js';
const db=load();
const app=document.getElementById('app');
let page='dashboard';

const money=n=>'₹'+Number(n||0).toLocaleString('en-IN');
const brandName=id=>db.brands.find(x=>x.id==id)?.name||'Unknown';
const modelName=id=>db.models.find(x=>x.id==id)?.name||'Unknown';
const deviceLabel=d=>`${brandName(db.models.find(m=>m.id==d.modelId)?.brandId)} ${modelName(d.modelId)}`;

function render(){
 app.innerHTML=`<div class="app">
 <aside class="sidebar"><div class="brand">Mobile<span>Store</span></div><nav class="nav">
 ${[['dashboard','🏠 Dashboard'],['inventory','📱 Inventory'],['add','➕ Add Stock'],['brands','🏷️ Brands'],['sales','💰 Sales'],['sold','📦 Sold Mobiles'],['suppliers','👨‍💼 Suppliers'],['reports','📊 Reports']].map(([p,t])=>`<button class="${page===p?'active':''}" onclick="go('${p}')">${t}</button>`).join('')}
 <button onclick="logout()">🚪 Logout</button></nav></aside>
 <main class="main"><div class="top"><div class="top-left"><button class="mobile-menu-btn" onclick="toggleMenu()" aria-label="Open navigation">☰</button><h1>${title()}</h1></div><div class="admin">👤 Store Admin</div></div><section id="content">${content()}</section></main></div>`;
}
function title(){return {dashboard:'Dashboard',inventory:'Inventory',add:'Add New Mobile Stock',brands:'Brands',sales:'Sales',sold:'Sold Mobiles',suppliers:'Suppliers',reports:'Reports'}[page]}
function stats(){let sold=db.devices.filter(d=>d.status==='SOLD').length;let stock=db.devices.filter(d=>d.status==='IN_STOCK').length;let revenue=db.sales.reduce((a,x)=>a+x.sale,0);let profit=db.sales.reduce((a,x)=>a+x.profit,0);return {sold,stock,revenue,profit}}
function content(){
 if(page==='dashboard')return dashboard();
 if(page==='inventory')return inventory();
 if(page==='add')return add();
 if(page==='brands')return brands();
 if(page==='sales'||page==='sold')return sales(page==='sold');
 if(page==='suppliers')return suppliers();
 return reports();
}
function dashboard(){let s=stats();return `<div class="cards">
 ${card('Total Devices',db.devices.length,'📱')}${card('In Stock',s.stock,'📦')}${card('Sold',s.sold,'💰')}${card('Revenue',money(s.revenue),'₹')}
 </div><div class="two"><div class="panel"><div class="panel-head"><h2>Sales Overview</h2></div><div class="chart">${[0,1,2,3,4,5,6].map((_,i)=>`<div class="bar" style="height:${30+((i*37)%140)}px"><span>${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i]}</span></div>`).join('')}</div></div><div class="panel"><div class="panel-head"><h2>Quick Actions</h2></div><button class="btn" onclick="go('add')">+ Add Stock</button><br><br><button class="btn secondary" onclick="go('sales')">View Sales</button><br><br><button class="btn secondary" onclick="go('inventory')">Manage Inventory</button></div></div>
 <div class="panel"><div class="panel-head"><h2>Recent Sales</h2><button class="btn secondary" onclick="go('sold')">View All</button></div>${salesTable(db.sales.slice(-5).reverse())}</div>`}
function card(a,b,c){return `<div class="card"><small>${c} ${a}</small><div class="metric">${b}</div></div>`}
function inventory(){let q='';return `<div class="panel"><div class="toolbar"><input id="search" placeholder="Search IMEI, brand or model" oninput="filterInventory()"><select id="statusFilter" onchange="filterInventory()"><option value="">All Status</option><option>IN_STOCK</option><option>SOLD</option><option>DAMAGED</option><option>RETURNED</option><option>REMOVED</option></select><button class="btn" onclick="go('add')">+ Add Stock</button></div><div id="invTable">${deviceTable(db.devices)}</div></div>`}
function deviceTable(rows){if(!rows.length)return '<div class="empty">No devices found.</div>';return `<div class="table-wrap"><table><thead><tr><th>IMEI</th><th>Brand</th><th>Model</th><th>Price</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows.map(d=>`<tr><td>${d.imei1}</td><td>${brandName(db.models.find(m=>m.id==d.modelId)?.brandId)}</td><td>${modelName(d.modelId)}</td><td>${money(d.selling)}</td><td><span class="badge ${d.status.toLowerCase().replace('_','')}">${d.status}</span></td><td class="actions">${d.status==='IN_STOCK'?`<button class="btn" onclick="sell(${d.id})">Sell</button>`:''}<button class="btn secondary" onclick="removeDevice(${d.id})">Remove</button></td></tr>`).join('')}</tbody></table></div>`}
function add(){return `<div class="panel"><form class="form" onsubmit="addDevice(event)">
 <label>Brand<select id="brandId" required onchange="loadModels()">${db.brands.map(b=>`<option value="${b.id}">${b.name}</option>`).join('')}</select></label>
 <label>Model<select id="modelId" required></select></label>
 <label>IMEI 1<input id="imei1" required pattern="\d{10,20}"></label><label>IMEI 2<input id="imei2" pattern="\d{10,20}"></label>
 <label>RAM<input id="ram" placeholder="8 GB"></label><label>Storage<input id="storage" placeholder="128 GB"></label>
 <label>Color<input id="color" placeholder="Black"></label><label>Purchase Price<input id="purchase" type="number" min="0" required></label>
 <label>Selling Price<input id="selling" type="number" min="0" required></label><label>Supplier<input id="supplier" required></label>
 <label>Purchase Date<input id="date" type="date" required value="${new Date().toISOString().slice(0,10)}"></label><label>Warranty (months)<input id="warranty" type="number" value="12"></label>
 <div class="full"><button class="btn">Add Mobile Stock</button></div></form></div><script>loadModels()</script>`}
function loadModels(){let el=document.getElementById('modelId');if(!el)return;let b=document.getElementById('brandId').value;el.innerHTML=db.models.filter(m=>m.brandId==b).map(m=>`<option value="${m.id}">${m.name} — ${m.ram}/${m.storage}</option>`).join('')}
function brands(){return `<div class="panel"><div class="panel-head"><h2>Mobile Brands</h2><button class="btn" onclick="addBrand()">+ Add Brand</button></div><div class="table-wrap"><table><thead><tr><th>ID</th><th>Brand</th><th>Models</th><th>Status</th><th>Action</th></tr></thead><tbody>${db.brands.map(b=>`<tr><td>${b.id}</td><td>${b.name}</td><td>${db.models.filter(m=>m.brandId==b.id).length}</td><td>${b.status}</td><td><button class="btn secondary" onclick="toggleBrand(${b.id})">${b.status==='Active'?'Deactivate':'Activate'}</button></td></tr>`).join('')}</tbody></table></div></div>`}
function sales(soldOnly=false){let rows=soldOnly?db.sales.slice().reverse():db.sales.slice().reverse();return `<div class="panel"><div class="toolbar"><input placeholder="Search sales" oninput="searchSales(this.value)"></div><div id="salesTable">${salesTable(rows)}</div></div>`}
function salesTable(rows){if(!rows.length)return '<div class="empty">No sales found.</div>';return `<div class="table-wrap"><table><thead><tr><th>Date</th><th>Mobile</th><th>IMEI</th><th>Customer</th><th>Sale Price</th><th>Profit</th><th>Payment</th></tr></thead><tbody>${rows.map(x=>{let d=db.devices.find(d=>d.id==x.deviceId);return `<tr><td>${x.date}</td><td>${deviceLabel(d)}</td><td>${d?.imei1||''}</td><td>${x.customer}</td><td>${money(x.sale)}</td><td>${money(x.profit)}</td><td>${x.payment}</td></tr>`}).join('')}</tbody></table></div>`}
function suppliers(){return `<div class="panel"><div class="panel-head"><h2>Suppliers</h2><button class="btn" onclick="addSupplier()">+ Add Supplier</button></div><table><thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Address</th></tr></thead><tbody>${db.suppliers.map(s=>`<tr><td>${s.name}</td><td>${s.phone}</td><td>${s.email}</td><td>${s.address}</td></tr>`).join('')}</tbody></table></div>`}
function reports(){let s=stats();return `<div class="cards">${card('Revenue',money(s.revenue),'💰')}${card('Profit',money(s.profit),'📈')}${card('Average Sale',money(s.sold?s.revenue/s.sold:0),'🧮')}${card('Inventory Value',money(db.devices.filter(d=>d.status==='IN_STOCK').reduce((a,d)=>a+d.purchase,0)),'📦')}</div><div class="panel"><h2>Store Summary</h2><p>Total brands: <b>${db.brands.length}</b></p><p>Total models: <b>${db.models.length}</b></p><p>Total devices: <b>${db.devices.length}</b></p><p>Available devices: <b>${s.stock}</b></p><p>Sold devices: <b>${s.sold}</b></p></div>`}
window.toggleMenu=()=>document.querySelector('.sidebar')?.classList.toggle('open');
window.go=p=>{page=p;render();if(p==='add')setTimeout(loadModels,0)}
window.logout=()=>{if(confirm('Log out of demo admin?')){sessionStorage.removeItem('logged');location.reload()}}
window.filterInventory=()=>{let q=document.getElementById('search').value.toLowerCase(),st=document.getElementById('statusFilter').value;let rows=db.devices.filter(d=>(!st||d.status===st)&&(`${d.imei1} ${d.imei2} ${deviceLabel(d)}`.toLowerCase().includes(q)));document.getElementById('invTable').innerHTML=deviceTable(rows)}
window.addDevice=e=>{e.preventDefault();let modelId=+document.getElementById('modelId').value;db.devices.push({id:Date.now(),modelId,imei1:imei1.value,imei2:imei2.value,purchase:+purchase.value,selling:+selling.value,supplier:supplier.value,date:date.value,warranty:+warranty.value,status:'IN_STOCK'});save(db);alert('Mobile stock added successfully');go('inventory')}
window.sell=id=>{let d=db.devices.find(x=>x.id===id);let customer=prompt('Customer name (optional):','Walk-in Customer')||'Walk-in Customer';let payment=prompt('Payment method:','UPI')||'UPI';let sale=Number(prompt(`Selling price (default ${d.selling}):`,d.selling));if(!sale)return;d.status='SOLD';db.sales.push({id:Date.now(),deviceId:id,sale,customer,phone:'',payment,date:new Date().toISOString().slice(0,10),profit:sale-d.purchase});save(db);render()}
window.removeDevice=id=>{let d=db.devices.find(x=>x.id===id);if(d.status==='SOLD'){alert('Sold devices cannot be removed from active inventory.');return}if(confirm('Mark this device as REMOVED?')){d.status='REMOVED';save(db);render()}}
window.addBrand=()=>{let name=prompt('Brand name:');if(!name)return;db.brands.push({id:Date.now(),name,status:'Active'});save(db);render()}
window.toggleBrand=id=>{let b=db.brands.find(x=>x.id===id);b.status=b.status==='Active'?'Inactive':'Active';save(db);render()}
window.addSupplier=()=>{let name=prompt('Supplier name:');if(!name)return;let phone=prompt('Phone:')||'',email=prompt('Email:')||'',address=prompt('Address:')||'';db.suppliers.push({id:Date.now(),name,phone,email,address});save(db);render()}
window.searchSales=q=>{q=q.toLowerCase();let rows=db.sales.slice().reverse().filter(x=>{let d=db.devices.find(d=>d.id===x.deviceId);return `${x.customer} ${x.date} ${d?.imei1} ${deviceLabel(d)}`.toLowerCase().includes(q)});document.getElementById('salesTable').innerHTML=salesTable(rows)}
if(sessionStorage.getItem('logged')==='1')render();else app.innerHTML=`<div class="login"><div class="login-box"><h1>📱 MobileStore Admin</h1><p>Owner inventory & sales management</p><label>Email<input id="email" type="email" value="admin@mobilestore.local"></label><label>Password<input id="password" type="password" value="admin123"></label><button onclick="login()">Sign in</button><div class="hint">Demo login: admin@mobilestore.local / admin123</div></div></div>`;
window.login=()=>{if(email.value==='admin@mobilestore.local'&&password.value==='admin123'){sessionStorage.setItem('logged','1');render()}else alert('Invalid demo credentials')};