import { load, save, initDatabase } from './data.js';
import { supabase, isCloudConfigured } from './supabase.js';

let db = load();
const app = document.getElementById('app');
let page = 'dashboard';

const money = n => '₹' + Number(n || 0).toLocaleString('en-IN');

const brandName = id => db.brands.find(x => x.id == id)?.name || 'Unknown';
const modelName = id => db.models.find(x => x.id == id)?.name || 'Unknown';

const deviceLabel = d => {
  if (!d) return 'Unknown';
  const model = db.models.find(m => m.id == d.modelId);
  return `${brandName(model?.brandId)} ${modelName(d.modelId)}`;
};

const escapeHtml = value =>
  String(value ?? '')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'","&#039;");

function render() {
  app.innerHTML = `
    <div class="app">
      <aside class="sidebar">
        <div class="brand">LAXMI COMMUNICATION<span>STORE ADMIN</span></div>
        <nav class="nav">
          ${[
            ['dashboard','🏠 Dashboard'],
            ['inventory','📱 Mobile Stock'],
            ['add','➕ Add Mobile Stock'],
            ['folderStock','📁 Folder Stock'],
            ['brands','🏷️ Brands'],
            ['sales','💰 Sales'],
            ['dailySales','🧾 Daily Sales'],
            ['sold','📦 Sold Mobiles'],
            ['suppliers','👨‍💼 Suppliers'],
            ['reports','📊 Reports']
          ].map(([p,t]) => `
            <button class="${page === p ? 'active' : ''}" onclick="go('${p}')">${t}</button>
          `).join('')}
          <button onclick="logout()">🚪 Logout</button>
        </nav>
      </aside>

      <main class="main">
        <div class="top">
          <div class="top-left">
            <button class="mobile-menu-btn" onclick="toggleMenu()" aria-label="Open navigation">☰</button>
            <h1>${title()}</h1>
          </div>
          <div class="admin">👤 Store Admin ${isCloudConfigured() ? "· ☁️ Cloud DB" : "· 💾 Demo Mode"}</div>
        </div>
        <section id="content">${content()}</section>
      </main>
    </div>`;
}

function title() {
  return {
    dashboard:'Dashboard',
    inventory:'Mobile Stock',
    add:'Add New Mobile Stock',
    folderStock:'Folder Stock',
    brands:'Brands',
    sales:'Sales',
    dailySales:'Daily Sales',
    sold:'Sold Mobiles',
    suppliers:'Suppliers',
    reports:'Reports'
  }[page];
}

function stats() {
  const sold = db.devices.filter(d => d.status === 'SOLD').length;
  const stock = db.devices.filter(d => d.status === 'IN_STOCK').length;
  const revenue = db.sales.reduce((a,x) => a + Number(x.sale || 0), 0);
  const profit = db.sales.reduce((a,x) => a + Number(x.profit || 0), 0);
  const folderQty = db.folderStock.reduce((a,x) => a + Number(x.quantity || 0), 0);

  return { sold, stock, revenue, profit, folderQty };
}

function content() {
  if (page === 'dashboard') return dashboard();
  if (page === 'inventory') return inventory();
  if (page === 'add') return add();
  if (page === 'folderStock') return folderStock();
  if (page === 'brands') return brands();
  if (page === 'sales') return sales();
  if (page === 'sold') return sales(true);
  if (page === 'dailySales') return dailySales();
  if (page === 'suppliers') return suppliers();
  return reports();
}

function card(a,b,c) {
  return `<div class="card"><small>${c} ${a}</small><div class="metric">${b}</div></div>`;
}

function last14DaysRevenue() {
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0,10));
  }

  return days.map(date => {
    const mobileRevenue = db.sales.filter(x => x.date === date).reduce((a,x) => a + Number(x.sale || 0), 0);
    const folderNote = db.dailySales.filter(x => x.date === date).reduce((a,x) => a + Number(x.salePrice || 0) * Number(x.quantity || 0), 0);
    const profit = db.sales.filter(x => x.date === date).reduce((a,x) => a + Number(x.profit || 0), 0)
      + db.dailySales.filter(x => x.date === date).reduce((a,x) => a + Number(x.profit || 0), 0);
    return { date, revenue: mobileRevenue + folderNote, profit };
  });
}

function dashboard() {
  const s = stats();
  const trend = last14DaysRevenue();
  const maxRevenue = Math.max(1, ...trend.map(t => t.revenue));

  return `
    <div class="cards">
      ${card('Total Mobile Devices',db.devices.length,'📱')}
      ${card('Mobile Stock',s.stock,'📦')}
      ${card('Folder Stock',s.folderQty,'📁')}
      ${card('Revenue',money(s.revenue),'₹')}
    </div>

    <div class="two">
      <div class="panel">
        <div class="panel-head">
          <h2>Sales Overview — Last 14 Days</h2>
          <span class="admin" style="font-size:12px">Live from your sales data</span>
        </div>
        <div class="chart">
          ${trend.map(t => {
            const height = Math.round((t.revenue / maxRevenue) * 150) || 4;
            const label = new Date(t.date).toLocaleDateString('en-IN',{day:'2-digit',month:'short'});
            return `
              <div class="bar" style="height:${height}px" title="${label}: ${money(t.revenue)} revenue, ${money(t.profit)} profit">
                <span>${label}</span>
              </div>`;
          }).join('')}
        </div>
      </div>

      <div class="panel">
        <div class="panel-head"><h2>Quick Actions</h2></div>
        <button class="btn" onclick="go('add')">+ Add Mobile Stock</button><br><br>
        <button class="btn secondary" onclick="go('folderStock')">📁 Folder Stock</button><br><br>
        <button class="btn secondary" onclick="go('dailySales')">🧾 Daily Sales</button>
      </div>
    </div>

    <div class="panel">
      <div class="panel-head">
        <h2>Recent Mobile Sales</h2>
        <button class="btn secondary" onclick="go('sold')">View All</button>
      </div>
      ${salesTable(db.sales.slice(-5).reverse())}
    </div>`;
}

function inventory() {
  return `
    <div class="panel">
      <div class="toolbar">
        <input id="search" placeholder="Search IMEI, brand or model" oninput="filterInventory()">
        <select id="statusFilter" onchange="filterInventory()">
          <option value="">All Status</option>
          <option value="IN_STOCK">IN_STOCK</option>
          <option value="SOLD">SOLD</option>
          <option value="DAMAGED">DAMAGED</option>
          <option value="RETURNED">RETURNED</option>
          <option value="REMOVED">REMOVED</option>
        </select>
        <button class="btn" onclick="go('add')">+ Add Mobile Stock</button>
      </div>
      <div id="invTable">${deviceTable(db.devices)}</div>
    </div>`;
}

function deviceTable(rows) {
  if (!rows.length) return `<div class="empty">No mobile stock found.</div>`;

  return `
    <div class="table-wrap"><table>
      <thead><tr>
        <th>IMEI</th><th>Brand</th><th>Model</th><th>Price</th><th>Status</th><th>Actions</th>
      </tr></thead>
      <tbody>
        ${rows.map(d => `
          <tr>
            <td>${escapeHtml(d.imei1)}</td>
            <td>${escapeHtml(brandName(db.models.find(m => m.id == d.modelId)?.brandId))}</td>
            <td>${escapeHtml(modelName(d.modelId))}</td>
            <td>${money(d.selling)}</td>
            <td><span class="badge ${d.status.toLowerCase().replace('_','')}">${d.status}</span></td>
            <td class="actions">
              ${d.status === 'IN_STOCK' ? `<button class="btn" onclick="sell(${d.id})">Sell</button>` : ''}
              <button class="btn secondary" onclick="removeDevice(${d.id})">Remove</button>
            </td>
          </tr>`).join('')}
      </tbody>
    </table></div>`;
}

function stockCountFor(modelId) {
  return db.devices.filter(d => d.modelId == modelId && d.status === 'IN_STOCK').length;
}

function add() {
  const activeBrands = db.brands.filter(b => b.status === 'Active');

  return `
    <div class="panel">
      <div class="panel-head"><h2>Current Stock for Selected Model</h2></div>
      <div id="modelStockInfo" class="folder-summary">
        <div class="folder-stat"><small>Model</small><strong id="stockInfoModel">—</strong></div>
        <div class="folder-stat"><small>Currently In Stock</small><strong id="stockInfoQty">0</strong></div>
      </div>
    </div>

    <div class="panel">
      <form class="form" onsubmit="addDevice(event)">
        <label>Brand
          <select id="brandId" required onchange="loadModels()">
            ${activeBrands.map(b => `<option value="${b.id}">${escapeHtml(b.name)}</option>`).join('')}
          </select>
        </label>

        <label>Model
          <select id="modelId" required onchange="onModelChange()"></select>
        </label>

        <div class="full" id="newModelBox" style="display:none">
          <div class="form" style="grid-template-columns:repeat(4,1fr)">
            <label>New Model Name<input id="newModelName" placeholder="Galaxy M15"></label>
            <label>RAM<input id="newModelRam" placeholder="8 GB"></label>
            <label>Storage<input id="newModelStorage" placeholder="128 GB"></label>
            <label>Color<input id="newModelColor" placeholder="Black"></label>
          </div>
        </div>

        <label>Quantity to Add<input id="quantity" type="number" min="1" value="1" required oninput="toggleImeiFields()"></label>
        <label>Purchase Price (per unit)<input id="purchase" type="number" min="0" required></label>
        <label>Selling Price (per unit)<input id="selling" type="number" min="0" required></label>
        <label>Supplier<input id="supplier" required></label>
        <label>Purchase Date<input id="date" type="date" required value="${today()}"></label>
        <label>Warranty (months)<input id="warranty" type="number" min="0" value="12"></label>

        <div class="full" id="imeiBox">
          <label>IMEI 1 (leave blank if adding more than 1 quantity without individual IMEIs)<input id="imei1" pattern="\\d{10,20}"></label>
          <label>IMEI 2<input id="imei2" pattern="\\d{10,20}"></label>
        </div>

        <div class="full"><button class="btn">Add Mobile Stock</button></div>
      </form>
    </div>`;
}

function loadModels() {
  const el = document.getElementById('modelId');
  const brand = document.getElementById('brandId')?.value;
  if (!el || !brand) return;

  const models = db.models.filter(m => m.brandId == brand);

  el.innerHTML = models
    .map(m => `<option value="${m.id}">${escapeHtml(m.name)} — ${escapeHtml(m.ram)}/${escapeHtml(m.storage)} (${stockCountFor(m.id)} in stock)</option>`)
    .join('') + `<option value="__new__">+ Add New Model…</option>`;

  onModelChange();
}

window.onModelChange = () => {
  const modelId = document.getElementById('modelId')?.value;
  const newBox = document.getElementById('newModelBox');
  const infoModel = document.getElementById('stockInfoModel');
  const infoQty = document.getElementById('stockInfoQty');
  if (!modelId) return;

  if (modelId === '__new__') {
    if (newBox) newBox.style.display = '';
    if (infoModel) infoModel.textContent = 'New model (not yet saved)';
    if (infoQty) infoQty.textContent = '0';
    return;
  }

  if (newBox) newBox.style.display = 'none';
  const model = db.models.find(m => m.id == modelId);
  if (infoModel) infoModel.textContent = model ? `${brandName(model.brandId)} ${model.name}` : '—';
  if (infoQty) infoQty.textContent = stockCountFor(modelId);
};

window.toggleImeiFields = () => {
  const qty = Number(document.getElementById('quantity')?.value || 1);
  const imei1 = document.getElementById('imei1');
  // IMEI is only sensible/required when adding a single unit.
  if (imei1) imei1.required = qty === 1;
};

function folderStockCountFor(modelId) {
  return db.folderStock.filter(x => x.modelId == modelId && x.status === 'IN_STOCK').reduce((a,x) => a + Number(x.quantity || 0), 0);
}

function folderStock() {
  const qty = db.folderStock.reduce((a,x) => a + Number(x.quantity || 0), 0);
  const value = db.folderStock.reduce((a,x) => a + Number(x.purchase || 0) * Number(x.quantity || 0), 0);
  const activeBrands = db.brands.filter(b => b.status === 'Active');

  return `
    <div class="folder-summary">
      <div class="folder-stat"><small>Total Folder Types</small><strong>${db.folderStock.length}</strong></div>
      <div class="folder-stat"><small>Total Folder Quantity</small><strong>${qty}</strong></div>
      <div class="folder-stat"><small>Stock Value</small><strong>${money(value)}</strong></div>
    </div>

    <div class="panel">
      <div class="panel-head"><h2>Current Stock for Selected Model</h2></div>
      <div id="folderStockInfo" class="folder-summary">
        <div class="folder-stat"><small>Model</small><strong id="folderStockInfoModel">—</strong></div>
        <div class="folder-stat"><small>Currently In Stock</small><strong id="folderStockInfoQty">0</strong></div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-head">
        <h2>Add Folder Stock</h2>
      </div>

      <form class="form" onsubmit="addFolder(event)">
        <label>Brand
          <select id="folderBrandId" required onchange="loadFolderModels()">
            ${activeBrands.map(b => `<option value="${b.id}">${escapeHtml(b.name)}</option>`).join('')}
          </select>
        </label>

        <label>Model
          <select id="folderModelId" required onchange="onFolderModelChange()"></select>
        </label>

        <div class="full" id="newFolderModelBox" style="display:none">
          <div class="form" style="grid-template-columns:repeat(4,1fr)">
            <label>New Model Name<input id="newFolderModelName" placeholder="Galaxy M15"></label>
            <label>RAM<input id="newFolderModelRam" placeholder="8 GB"></label>
            <label>Storage<input id="newFolderModelStorage" placeholder="128 GB"></label>
            <label>Color<input id="newFolderModelColor" placeholder="Black"></label>
          </div>
        </div>

        <label>Quantity<input id="folderQuantity" type="number" min="1" value="1" required></label>
        <label>Purchase Price<input id="folderPurchase" type="number" min="0" required></label>
        <label>Selling Price<input id="folderSelling" type="number" min="0" required></label>
        <label>Supplier<input id="folderSupplier" placeholder="Supplier name"></label>
        <label>Stock Date<input id="folderDate" type="date" value="${today()}" required></label>
        <div class="full"><button class="btn">+ Add Folder Stock</button></div>
      </form>
    </div>

    <div class="panel">
      <div class="panel-head">
        <h2>Folder Stock</h2>
        <button class="btn secondary" onclick="exportFolderExcel()">📊 Export Excel</button>
      </div>

      <div class="toolbar">
        <input id="folderSearch" placeholder="Search brand or model" oninput="filterFolders()">
      </div>

      <div id="folderTable">${folderTable(db.folderStock)}</div>
    </div>`;
}

function loadFolderModels() {
  const el = document.getElementById('folderModelId');
  const brand = document.getElementById('folderBrandId')?.value;
  if (!el || !brand) return;

  const models = db.models.filter(m => m.brandId == brand);

  el.innerHTML = models
    .map(m => `<option value="${m.id}">${escapeHtml(m.name)} — ${escapeHtml(m.ram)}/${escapeHtml(m.storage)} (${folderStockCountFor(m.id)} in stock)</option>`)
    .join('') + `<option value="__new__">+ Add New Model…</option>`;

  onFolderModelChange();
}

window.onFolderModelChange = () => {
  const modelId = document.getElementById('folderModelId')?.value;
  const newBox = document.getElementById('newFolderModelBox');
  const infoModel = document.getElementById('folderStockInfoModel');
  const infoQty = document.getElementById('folderStockInfoQty');
  if (!modelId) return;

  if (modelId === '__new__') {
    if (newBox) newBox.style.display = '';
    if (infoModel) infoModel.textContent = 'New model (not yet saved)';
    if (infoQty) infoQty.textContent = '0';
    return;
  }

  if (newBox) newBox.style.display = 'none';
  const model = db.models.find(m => m.id == modelId);
  if (infoModel) infoModel.textContent = model ? `${brandName(model.brandId)} ${model.name}` : '—';
  if (infoQty) infoQty.textContent = folderStockCountFor(modelId);
};

function folderTable(rows) {
  if (!rows.length) return `<div class="empty">No folder stock found.</div>`;

  return `
    <div class="table-wrap"><table>
      <thead><tr>
        <th>Date</th><th>Brand</th><th>Model</th><th>Qty</th><th>Purchase</th><th>Selling</th><th>Supplier</th><th>Stock Value</th><th>Action</th>
      </tr></thead>
      <tbody>
        ${rows.slice().reverse().map(x => `
          <tr>
            <td>${escapeHtml(x.date)}</td>
            <td>${escapeHtml(brandName(db.models.find(m => m.id == x.modelId)?.brandId))}</td>
            <td>${escapeHtml(modelName(x.modelId))}</td>
            <td>${x.quantity}</td>
            <td>${money(x.purchase)}</td>
            <td>${money(x.selling)}</td>
            <td>${escapeHtml(x.supplier || '-')}</td>
            <td>${money(Number(x.purchase) * Number(x.quantity))}</td>
            <td><button class="btn danger" onclick="deleteFolder(${x.id})">Delete</button></td>
          </tr>`).join('')}
      </tbody>
    </table></div>`;
}

function brands() {
  return `
    <div class="panel">
      <div class="panel-head">
        <h2>Mobile Brands</h2>
        <button class="btn" onclick="addBrand()">+ Add Brand</button>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>ID</th><th>Brand</th><th>Models</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>
          ${db.brands.map(b => `
            <tr>
              <td>${b.id}</td><td>${escapeHtml(b.name)}</td>
              <td>${db.models.filter(m => m.brandId == b.id).length}</td>
              <td>${b.status}</td>
              <td><button class="btn secondary" onclick="toggleBrand(${b.id})">${b.status === 'Active' ? 'Deactivate' : 'Activate'}</button></td>
            </tr>`).join('')}
        </tbody>
      </table></div>
    </div>`;
}

function sales() {
  return `
    <div class="panel">
      <div class="toolbar">
        <input placeholder="Search sales" oninput="searchSales(this.value)">
      </div>
      <div id="salesTable">${salesTable(db.sales.slice().reverse())}</div>
    </div>`;
}

function salesTable(rows) {
  if (!rows.length) return `<div class="empty">No sales found.</div>`;

  return `
    <div class="table-wrap"><table>
      <thead><tr><th>Date</th><th>Mobile</th><th>IMEI</th><th>Customer</th><th>Sale Price</th><th>Profit</th><th>Payment</th></tr></thead>
      <tbody>
        ${rows.map(x => {
          const d = db.devices.find(d => d.id == x.deviceId);
          return `<tr>
            <td>${escapeHtml(x.date)}</td>
            <td>${escapeHtml(deviceLabel(d))}</td>
            <td>${escapeHtml(d?.imei1 || '')}</td>
            <td>${escapeHtml(x.customer)}</td>
            <td>${money(x.sale)}</td>
            <td>${money(x.profit)}</td>
            <td>${escapeHtml(x.payment)}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table></div>`;
}

function dailySales() {
  const month = today().slice(0,7);

  return `
    <div class="panel">
      <div class="panel-head"><h2>Add Daily Sale</h2></div>

      <form class="form" onsubmit="addDailySale(event)">
        <label>Sale Date<input type="date" id="dailyDate" value="${today()}" required></label>
        <label>Brand<input type="text" id="dailyBrand" placeholder="Samsung" required></label>
        <label>Product / Mobile Name<input type="text" id="dailyProduct" placeholder="Galaxy A55" required></label>
        <label>IMEI<input type="text" id="dailyImei" placeholder="IMEI number"></label>
        <label>Customer Name<input type="text" id="dailyCustomer" placeholder="Customer name"></label>
        <label>Quantity<input type="number" id="dailyQuantity" min="1" value="1" required></label>
        <label>Purchase Price<input type="number" id="dailyPurchase" min="0" required></label>
        <label>Sale Price<input type="number" id="dailySalePrice" min="0" required></label>
        <label>Payment Method
          <select id="dailyPayment">
            <option>Cash</option><option>UPI</option><option>Card</option><option>Bank Transfer</option><option>Other</option>
          </select>
        </label>
        <label>Notes<input type="text" id="dailyNotes" placeholder="Optional"></label>
        <div class="full"><button class="btn">+ Add Daily Sale</button></div>
      </form>
    </div>

    <div class="panel">
      <div class="panel-head">
        <h2>Daily Sales Records</h2>
        <div class="daily-actions">
          <button class="btn secondary" onclick="exportDailySalesExcel()">📊 Export Excel</button>
          <button class="btn" onclick="generateMonthlyPDF()">📄 Monthly PDF</button>
        </div>
      </div>

      <div class="toolbar daily-filter">
        <label class="filter-label">Select Month
          <input type="month" id="dailyMonth" value="${month}" onchange="filterDailySales()">
        </label>
        <input id="dailySearch" placeholder="Search product, customer, IMEI..." oninput="filterDailySales()">
      </div>

      <div id="dailySummary" class="daily-summary"></div>
      <div id="dailySalesTable">${dailySalesTable(getDailyRows(month,''))}</div>
    </div>`;
}

function getDailyRows(month, search='') {
  let rows = db.dailySales.filter(x => !month || x.date.startsWith(month));
  if (search) {
    const q = search.toLowerCase();
    rows = rows.filter(x => `${x.date} ${x.brand} ${x.product} ${x.imei} ${x.customer} ${x.payment}`.toLowerCase().includes(q));
  }
  return rows.slice().reverse();
}

function dailySalesTable(rows) {
  updateDailySummary(rows);
  if (!rows.length) return `<div class="empty">No daily sales found for this month.</div>`;

  return `
    <div class="table-wrap"><table>
      <thead><tr><th>Date</th><th>Brand</th><th>Product</th><th>IMEI</th><th>Customer</th><th>Qty</th><th>Sale Price</th><th>Profit</th><th>Payment</th><th>Action</th></tr></thead>
      <tbody>
        ${rows.map(x => `
          <tr>
            <td>${escapeHtml(x.date)}</td>
            <td>${escapeHtml(x.brand)}</td>
            <td>${escapeHtml(x.product)}</td>
            <td>${escapeHtml(x.imei || '-')}</td>
            <td>${escapeHtml(x.customer || '-')}</td>
            <td>${x.quantity}</td>
            <td>${money(x.salePrice)}</td>
            <td>${money(x.profit)}</td>
            <td>${escapeHtml(x.payment)}</td>
            <td><button class="btn danger" onclick="deleteDailySale(${x.id})">Delete</button></td>
          </tr>`).join('')}
      </tbody>
    </table></div>`;
}

function updateDailySummary(rows) {
  const el = document.getElementById('dailySummary');
  if (!el) return;

  const quantity = rows.reduce((a,x) => a + Number(x.quantity || 0), 0);
  const revenue = rows.reduce((a,x) => a + Number(x.salePrice || 0) * Number(x.quantity || 0), 0);
  const profit = rows.reduce((a,x) => a + Number(x.profit || 0), 0);

  el.innerHTML = `
    <div class="daily-stat"><small>Products Sold</small><strong>${quantity}</strong></div>
    <div class="daily-stat"><small>Total Sales</small><strong>${money(revenue)}</strong></div>
    <div class="daily-stat"><small>Total Profit</small><strong>${money(profit)}</strong></div>
    <div class="daily-stat"><small>Transactions</small><strong>${rows.length}</strong></div>`;
}

window.addDailySale = async event => {
  event.preventDefault();

  const quantity = Number(document.getElementById('dailyQuantity').value);
  const purchase = Number(document.getElementById('dailyPurchase').value);
  const salePrice = Number(document.getElementById('dailySalePrice').value);

  if (purchase < 0 || salePrice < 0 || quantity < 1) {
    alert('Please enter valid sale details.');
    return;
  }

  db.dailySales.push({
    id: Date.now(),
    date: document.getElementById('dailyDate').value,
    brand: document.getElementById('dailyBrand').value.trim(),
    product: document.getElementById('dailyProduct').value.trim(),
    imei: document.getElementById('dailyImei').value.trim(),
    customer: document.getElementById('dailyCustomer').value.trim(),
    quantity,
    purchase,
    salePrice,
    payment: document.getElementById('dailyPayment').value,
    profit: (salePrice - purchase) * quantity,
    notes: document.getElementById('dailyNotes').value.trim()
  });

  await save(db);
  alert('Daily sale added successfully!');
  render();
};

window.filterDailySales = () => {
  const month = document.getElementById('dailyMonth')?.value || '';
  const search = document.getElementById('dailySearch')?.value.trim() || '';
  document.getElementById('dailySalesTable').innerHTML = dailySalesTable(getDailyRows(month, search));
};

window.deleteDailySale = async id => {
  const sale = db.dailySales.find(x => x.id === id);
  if (!sale) return;

  if (!confirm(`Delete sale for ${sale.product}?`)) return;

  db.dailySales = db.dailySales.filter(x => x.id !== id);
  await save(db);
  render();
};

window.exportDailySalesExcel = () => {
  if (!db.dailySales.length) return alert('There are no daily sales to export.');

  const rows = db.dailySales.map(x => ({
    Date:x.date, Brand:x.brand, Product:x.product, IMEI:x.imei || '',
    Customer:x.customer || '', Quantity:x.quantity, 'Purchase Price':x.purchase,
    'Sale Price':x.salePrice, 'Total Sale':Number(x.salePrice)*Number(x.quantity),
    Profit:x.profit, Payment:x.payment, Notes:x.notes || ''
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Daily Sales');
  XLSX.writeFile(wb, `Daily_Sales_${today()}.xlsx`);
};

window.generateMonthlyPDF = () => {
  const month = document.getElementById('dailyMonth')?.value;
  if (!month) return alert('Please select a month first.');

  const rows = db.dailySales.filter(x => x.date.startsWith(month));
  if (!rows.length) return alert('No sales found for the selected month.');

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('landscape','mm','a4');
  const [year, monthNumber] = month.split('-');
  const monthName = new Date(year, Number(monthNumber)-1).toLocaleString('en-IN',{month:'long'});

  const totalQuantity = rows.reduce((a,x) => a + Number(x.quantity || 0),0);
  const totalRevenue = rows.reduce((a,x) => a + Number(x.salePrice || 0)*Number(x.quantity || 0),0);
  const totalProfit = rows.reduce((a,x) => a + Number(x.profit || 0),0);

  doc.setFontSize(20);
  doc.text('LAXMI COMMUNICATION',14,15);
  doc.setFontSize(15);
  doc.text(`Monthly Daily Sales Report - ${monthName} ${year}`,14,24);
  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`,14,31);

  doc.setFontSize(11);
  doc.text(`Total Transactions: ${rows.length}`,14,42);
  doc.text(`Total Products Sold: ${totalQuantity}`,80,42);
  doc.text(`Total Revenue: ${money(totalRevenue)}`,160,42);
  doc.text(`Total Profit: ${money(totalProfit)}`,245,42);

  doc.autoTable({
    startY:50,
    head:[['Date','Brand','Product','IMEI','Customer','Qty','Total Sale','Profit','Payment']],
    body:rows.map(x=>[
      x.date,x.brand,x.product,x.imei||'-',x.customer||'-',x.quantity,
      money(Number(x.salePrice)*Number(x.quantity)),money(x.profit),x.payment
    ]),
    theme:'grid',
    styles:{fontSize:8,cellPadding:3},
    headStyles:{fontSize:8,fontStyle:'bold'}
  });

  const finalY = doc.lastAutoTable.finalY + 10;
  doc.text(`Grand Total Revenue: ${money(totalRevenue)}`,14,finalY);
  doc.text(`Grand Total Profit: ${money(totalProfit)}`,110,finalY);
  doc.text(`Total Products: ${totalQuantity}`,210,finalY);
  doc.save(`Daily_Sales_${monthName}_${year}.pdf`);
};

window.addFolder = async event => {
  event.preventDefault();

  let modelIdRaw = document.getElementById('folderModelId').value;
  const brandId = Number(document.getElementById('folderBrandId').value);
  const quantity = Number(document.getElementById('folderQuantity').value);
  const purchase = Number(document.getElementById('folderPurchase').value);
  const selling = Number(document.getElementById('folderSelling').value);

  if (quantity < 1 || purchase < 0 || selling < 0) {
    alert('Please enter valid folder stock details.');
    return;
  }

  let modelId;

  if (modelIdRaw === '__new__') {
    const name = document.getElementById('newFolderModelName').value.trim();
    if (!name) {
      alert('Please enter a name for the new model.');
      return;
    }

    modelId = Date.now();
    db.models.push({
      id: modelId,
      brandId,
      name,
      ram: document.getElementById('newFolderModelRam').value.trim(),
      storage: document.getElementById('newFolderModelStorage').value.trim(),
      color: document.getElementById('newFolderModelColor').value.trim()
    });
  } else {
    modelId = Number(modelIdRaw);
  }

  db.folderStock.push({
    id: Date.now(),
    modelId,
    quantity,
    purchase,
    selling,
    supplier: document.getElementById('folderSupplier').value.trim(),
    date: document.getElementById('folderDate').value,
    status:'IN_STOCK'
  });

  await save(db);
  alert('Folder stock added successfully!');
  render();
};

window.filterFolders = () => {
  const q = document.getElementById('folderSearch')?.value.toLowerCase().trim() || '';
  const rows = db.folderStock.filter(x => {
    const model = db.models.find(m => m.id == x.modelId);
    const brand = brandName(model?.brandId);
    return `${brand} ${modelName(x.modelId)} ${x.supplier}`.toLowerCase().includes(q);
  });
  document.getElementById('folderTable').innerHTML = folderTable(rows);
};

window.deleteFolder = async id => {
  const item = db.folderStock.find(x => x.id === id);
  if (!item) return;

  if (!confirm(`Delete ${item.name} from folder stock?`)) return;

  db.folderStock = db.folderStock.filter(x => x.id !== id);
  await save(db);
  render();
};

window.exportFolderExcel = () => {
  if (!db.folderStock.length) return alert('There is no folder stock to export.');

  const rows = db.folderStock.map(x => {
    const model = db.models.find(m => m.id == x.modelId);
    return {
      Date:x.date, Brand:brandName(model?.brandId), Model:modelName(x.modelId),
      Quantity:x.quantity, 'Purchase Price':x.purchase,
      'Selling Price':x.selling,
      'Stock Value':Number(x.purchase)*Number(x.quantity),
      Supplier:x.supplier || '', Status:x.status
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Folder Stock');
  XLSX.writeFile(wb,`Folder_Stock_${today()}.xlsx`);
};

window.filterInventory = () => {
  const q = document.getElementById('search').value.toLowerCase();
  const st = document.getElementById('statusFilter').value;

  const rows = db.devices.filter(d =>
    (!st || d.status === st) &&
    `${d.imei1} ${d.imei2} ${deviceLabel(d)}`.toLowerCase().includes(q)
  );

  document.getElementById('invTable').innerHTML = deviceTable(rows);
};

window.addDevice = async e => {
  e.preventDefault();

  let modelIdRaw = document.getElementById('modelId').value;
  const brandId = Number(document.getElementById('brandId').value);
  const quantity = Number(document.getElementById('quantity').value) || 1;
  const imei1 = document.getElementById('imei1').value.trim();
  const imei2 = document.getElementById('imei2').value.trim();

  if (quantity > 1 && imei1) {
    alert('IMEI can only be set when adding a single unit (quantity = 1). Leave IMEI blank for bulk quantity, or add units one at a time with their own IMEIs.');
    return;
  }

  let modelId;

  if (modelIdRaw === '__new__') {
    const name = document.getElementById('newModelName').value.trim();
    if (!name) {
      alert('Please enter a name for the new model.');
      return;
    }

    modelId = Date.now();
    db.models.push({
      id: modelId,
      brandId,
      name,
      ram: document.getElementById('newModelRam').value.trim(),
      storage: document.getElementById('newModelStorage').value.trim(),
      color: document.getElementById('newModelColor').value.trim()
    });
  } else {
    modelId = Number(modelIdRaw);
  }

  const purchase = Number(document.getElementById('purchase').value);
  const selling = Number(document.getElementById('selling').value);
  const supplier = document.getElementById('supplier').value;
  const date = document.getElementById('date').value;
  const warranty = Number(document.getElementById('warranty').value);

  for (let i = 0; i < quantity; i++) {
    db.devices.push({
      id: Date.now() + i,
      modelId,
      imei1: i === 0 ? imei1 : '',
      imei2: i === 0 ? imei2 : '',
      purchase,
      selling,
      supplier,
      date,
      warranty,
      status: 'IN_STOCK'
    });
  }

  await save(db);
  alert(`${quantity} unit(s) of mobile stock added successfully`);
  go('inventory');
};

window.sell = async id => {
  const d = db.devices.find(x => x.id === id);
  if (!d) return;

  const customer = prompt('Customer name (optional):','Walk-in Customer') || 'Walk-in Customer';
  const payment = prompt('Payment method:','UPI') || 'UPI';
  const sale = Number(prompt(`Selling price (default ${d.selling}):`,d.selling));

  if (!sale) return;

  d.status='SOLD';

  db.sales.push({
    id:Date.now(), deviceId:id, sale, customer, phone:'',
    payment, date:today(), profit:sale-d.purchase
  });

  await save(db);
  render();
};

window.removeDevice = async id => {
  const d = db.devices.find(x => x.id === id);
  if (!d) return;

  if (d.status === 'SOLD') {
    alert('Sold devices cannot be removed from active inventory.');
    return;
  }

  if (confirm('Mark this device as REMOVED?')) {
    d.status='REMOVED';
    await save(db);
    render();
  }
};

window.addBrand = async () => {
  const name = prompt('Brand name:');
  if (!name) return;

  db.brands.push({id:Date.now(),name,status:'Active'});
  await save(db);
  render();
};

window.toggleBrand = async id => {
  const b = db.brands.find(x => x.id === id);
  if (!b) return;

  b.status = b.status === 'Active' ? 'Inactive' : 'Active';
  await save(db);
  render();
};

function suppliers() {
  return `
    <div class="panel">
      <div class="panel-head">
        <h2>Suppliers</h2>
        <button class="btn" onclick="addSupplier()">+ Add Supplier</button>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Address</th></tr></thead>
        <tbody>
          ${db.suppliers.map(s=>`
            <tr><td>${escapeHtml(s.name)}</td><td>${escapeHtml(s.phone)}</td><td>${escapeHtml(s.email)}</td><td>${escapeHtml(s.address)}</td></tr>
          `).join('')}
        </tbody>
      </table></div>
    </div>`;
}

window.addSupplier = async () => {
  const name = prompt('Supplier name:');
  if (!name) return;

  db.suppliers.push({
    id:Date.now(),name,
    phone:prompt('Phone:') || '',
    email:prompt('Email:') || '',
    address:prompt('Address:') || ''
  });

  await save(db);
  render();
};

window.searchSales = q => {
  q = q.toLowerCase();

  const rows = db.sales.slice().reverse().filter(x => {
    const d = db.devices.find(d => d.id === x.deviceId);
    return `${x.customer} ${x.date} ${d?.imei1} ${deviceLabel(d)}`.toLowerCase().includes(q);
  });

  document.getElementById('salesTable').innerHTML = salesTable(rows);
};

function reports() {
  const s = stats();

  return `
    <div class="cards">
      ${card('Revenue',money(s.revenue),'💰')}
      ${card('Profit',money(s.profit),'📈')}
      ${card('Average Sale',money(s.sold ? s.revenue/s.sold : 0),'🧮')}
      ${card('Mobile Inventory Value',money(db.devices.filter(d=>d.status==='IN_STOCK').reduce((a,d)=>a+d.purchase,0)),'📦')}
    </div>

    <div class="panel">
      <h2>Store Summary</h2>
      <p>Total brands: <b>${db.brands.length}</b></p>
      <p>Total models: <b>${db.models.length}</b></p>
      <p>Total mobile devices: <b>${db.devices.length}</b></p>
      <p>Available mobile devices: <b>${s.stock}</b></p>
      <p>Sold devices: <b>${s.sold}</b></p>
      <p>Total folder quantity: <b>${s.folderQty}</b></p>
    </div>`;
}

window.toggleMenu = () => document.querySelector('.sidebar')?.classList.toggle('open');

window.go = p => {
  page=p;
  render();

  if (p === 'add') setTimeout(loadModels,0);
  if (p === 'folderStock') setTimeout(loadFolderModels,0);

};

window.logout = async () => {
  if (!confirm('Log out of LAXMI COMMUNICATION Admin?')) return;

  if (isCloudConfigured() && supabase) {
    await supabase.auth.signOut();
  }
  sessionStorage.removeItem('logged');
  location.reload();
};

function today() {
  return new Date().toISOString().slice(0,10);
}

function showLogin(message = '') {
  app.innerHTML = `
    <div class="login">
      <div class="login-box">
        <h1>📱 LAXMI COMMUNICATION</h1>
        <p>Owner inventory & sales management</p>

        <label>Email
          <input id="email" type="email" autocomplete="email" placeholder="owner@example.com">
        </label>

        <label>Password
          <input id="password" type="password" autocomplete="current-password" placeholder="Password">
        </label>

        <button onclick="login()">Sign in</button>

        ${message ? `<div class="hint">${escapeHtml(message)}</div>` : ''}

        <div class="hint">
          ${isCloudConfigured()
            ? 'Cloud database mode: use the Supabase Auth account created for this store owner.'
            : 'Setup required: add your Supabase URL and Publishable/anon key in js/config.js. Until then the app uses local demo storage.'}
        </div>
      </div>
    </div>`;
}

async function boot() {
  if (!isCloudConfigured() || !supabase) {
    if (sessionStorage.getItem('logged') === '1') {
      render();
    } else {
      showLogin('Demo mode is active because Supabase is not configured yet.');
    }
    return;
  }

  app.innerHTML = `
    <div class="login">
      <div class="login-box">
        <h1>📱 LAXMI COMMUNICATION</h1>
        <p>Connecting to cloud database…</p>
      </div>
    </div>`;

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    showLogin('Unable to check your login session.');
    return;
  }

  if (!data.session) {
    showLogin();
    return;
  }

  try {
    db = await initDatabase();
    render();
  } catch (error) {
    console.error(error);
    showLogin(`Database setup error: ${error.message || 'Unknown error'}. Run database/schema.sql and check js/config.js.`);
  }
}

window.login = async () => {
  const email = document.getElementById('email')?.value.trim();
  const password = document.getElementById('password')?.value;

  if (!email || !password) {
    alert('Please enter email and password.');
    return;
  }

  if (!isCloudConfigured() || !supabase) {
    if (email === 'admin@mobilestore.local' && password === 'admin123') {
      sessionStorage.setItem('logged','1');
      render();
    } else {
      alert('Demo login: admin@mobilestore.local / admin123');
    }
    return;
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    alert(error.message || 'Unable to sign in.');
    return;
  }

  try {
    db = await initDatabase();
    render();
  } catch (error) {
    console.error(error);
    await supabase.auth.signOut();
    alert(`Database setup error: ${error.message || 'Unknown error'}. Run database/schema.sql and check js/config.js.`);
  }
};

boot();
