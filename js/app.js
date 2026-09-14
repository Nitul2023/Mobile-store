import { load, save, initDatabase, addModelToBrand } from './data.js';
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
        <div class="brand">Mobile<span>Store</span></div>
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

  if (page === 'add') {
    setTimeout(() => {
      loadModels();
      updateImeiRequirement();
    }, 0);
  }
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
  const sold = db.devices
    .filter(d => d.status === 'SOLD')
    .reduce((a, d) => a + Number(d.quantity || 1), 0);

  const stock = db.devices
    .filter(d => d.status === 'IN_STOCK')
    .reduce((a, d) => a + Number(d.quantity || 1), 0);
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

/* =========================
   DASHBOARD
========================= */

function dashboard() {

  const s = stats();

  const chartData = getLast7DaysSales();

  const maxSales =
    Math.max(
      ...chartData.map(x => x.amount),
      1
    );

  return `

    <div class="cards">

      ${card(
        'Total Devices',
        db.devices.reduce((a, d) => a + Number(d.quantity || 1), 0),
        '📱'
      )}

      ${card(
        'In Stock',
        s.stock,
        '📦'
      )}

      ${card(
        'Sold',
        s.sold,
        '💰'
      )}

      ${card(
        'Revenue',
        money(s.revenue),
        '₹'
      )}

    </div>


    <div class="two">

      <!-- SALES GRAPH -->

      <div class="panel">

        <div class="panel-head">

          <h2>
            Sales Overview
          </h2>

          <small>
            Last 7 Days
          </small>

        </div>


        <div class="chart">

          ${chartData.map(day => {

            const height =
              day.amount > 0
                ? Math.max(
                    12,
                    Math.round(
                      (day.amount / maxSales) * 160
                    )
                  )
                : 4;

            return `

              <div
                class="bar"
                title="${day.fullDate}: ${money(day.amount)}"
                style="height:${height}px">

                <span>
                  ${day.label}
                </span>

              </div>

            `;

          }).join('')}

        </div>


        <div
          style="
            display:flex;
            justify-content:space-between;
            margin-top:12px;
            font-size:13px;
            opacity:.7;
          "
        >

          <span>
            Sales Revenue
          </span>

          <strong>
            ${money(
              chartData.reduce(
                (total, x) =>
                  total + x.amount,
                0
              )
            )}
          </strong>

        </div>

      </div>


      <!-- QUICK ACTIONS -->

      <div class="panel">

        <div class="panel-head">

          <h2>
            Quick Actions
          </h2>

        </div>


        <button
          class="btn"
          onclick="go('add')">

          + Add Mobile Stock

        </button>


        <br><br>


        <button
          class="btn secondary"
          onclick="go('dailySales')">

          🧾 Daily Sales

        </button>


        <br><br>


        <button
          class="btn secondary"
          onclick="go('inventory')">

          Manage Inventory

        </button>

      </div>

    </div>


    <!-- RECENT SALES -->

    <div class="panel">

      <div class="panel-head">

        <h2>
          Recent Mobile Sales
        </h2>

        <button
          class="btn secondary"
          onclick="go('sold')">

          View All

        </button>

      </div>


      ${salesTable(
        db.sales
          .slice()
          .sort(
            (a, b) =>
              new Date(b.date) -
              new Date(a.date)
          )
          .slice(0, 5)
      )}

    </div>

  `;
}

/* =========================
   LAST 7 DAYS SALES
========================= */

function getLast7DaysSales() {

  const result = [];

  const today =
    new Date();

  for (let i = 6; i >= 0; i--) {

    const date =
      new Date(today);

    date.setDate(
      today.getDate() - i
    );

    const year =
      date.getFullYear();

    const month =
      String(
        date.getMonth() + 1
      ).padStart(2, '0');

    const day =
      String(
        date.getDate()
      ).padStart(2, '0');

    const fullDate =
      `${year}-${month}-${day}`;


    /*
     * Get actual sales for this date
     */

    const amount =
      db.sales
        .filter(sale =>
          sale.date === fullDate
        )
        .reduce(
          (total, sale) =>
            total +
            Number(
              sale.sale || 0
            ),
          0
        );


    result.push({

      fullDate,

      label:
        date.toLocaleDateString(
          'en-IN',
          {
            weekday: 'short'
          }
        ),

      amount

    });

  }

  return result;
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
        <th>IMEI</th><th>Brand</th><th>Model</th><th>Qty</th><th>Price</th><th>Status</th><th>Actions</th>
      </tr></thead>
      <tbody>
        ${rows.map(d => `
          <tr>
            <td>${escapeHtml(d.imei1)}</td>
            <td>${escapeHtml(brandName(db.models.find(m => m.id == d.modelId)?.brandId))}</td>
            <td>${escapeHtml(modelName(d.modelId))}</td>
            <td>${Number(d.quantity || 1)}</td>
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

function add() {
  const activeBrands = db.brands
    .filter(b => b.status === 'Active')
    .sort((a, b) => Number(a.id) - Number(b.id));

  const firstBrand =
    activeBrands.length ? activeBrands[0] : null;

  const firstBrandModels = firstBrand
    ? db.models
        .filter(m => String(m.brandId) === String(firstBrand.id))
        .sort((a, b) => Number(a.id) - Number(b.id))
    : [];

  return `
    <div class="panel">

      <form
        class="form"
        onsubmit="addDevice(event)"
      >

        <!-- BRAND -->

        <label>
          Brand

          <select
            id="brandId"
            required
            onchange="handleBrandSelection()"
          >

            <option value="">
              Select Brand
            </option>

            ${activeBrands.map(b => `
              <option
                value="${b.id}"
                ${firstBrand && String(b.id) === String(firstBrand.id) ? 'selected' : ''}
              >
                ${escapeHtml(b.name)}
              </option>
            `).join('')}

            

          </select>

        </label>


        <!-- MODEL -->

        <label>
          Model

          <select
            id="modelId"
            required
            onchange="handleModelSelection()"
          >

            ${
              firstBrand
                ? `
                  <option value="">
                    Select Model
                  </option>

                  ${firstBrandModels.map(m => `
                    <option value="${m.id}">
                      ${escapeHtml(m.name)}
                      ${
                        m.ram || m.storage
                          ? ` — ${escapeHtml(m.ram || '')}${
                              m.ram && m.storage
                                ? ' / '
                                : ''
                            }${escapeHtml(m.storage || '')}`
                          : ''
                      }
                    </option>
                  `).join('')}
                `
                : `
                  <option value="">
                    Select Brand First
                  </option>
                `
            }

            <option value="__ADD_MODEL__">
              ＋ Add Model
            </option>

          </select>

        </label>


        <!-- IMEI 1 -->

        <label>
          IMEI 1

          <input
            id="imei1"
            pattern="\\d{10,20}"
            placeholder="Required when quantity is 1"
          >

        </label>


        <!-- IMEI 2 -->

        <label>
          IMEI 2

          <input
            id="imei2"
            pattern="\\d{10,20}"
            placeholder="Optional"
          >

        </label>


        <!-- RAM -->

        <label>
          RAM

          <input
            id="ram"
            placeholder="Select a model"
            readonly
          >

        </label>


        <!-- STORAGE -->

        <label>
          Storage

          <input
            id="storage"
            placeholder="Select a model"
            readonly
          >

        </label>


        <!-- QUANTITY -->

        <label>
          Quantity

          <input
            id="quantity"
            type="number"
            min="1"
            value="1"
            required
            oninput="updateImeiRequirement()"
          >

        </label>


        <!-- COLOR -->

        <label>
          Color

          <input
            id="color"
            placeholder="Select a model"
            readonly
          >

        </label>


        <!-- PURCHASE PRICE -->

        <label>
          Purchase Price

          <input
            id="purchase"
            type="number"
            min="0"
            required
          >

        </label>


        <!-- SELLING PRICE -->

        <label>
          Selling Price

          <input
            id="selling"
            type="number"
            min="0"
            required
          >

        </label>


        <!-- SUPPLIER -->

        <label>
          Supplier

          <input
            id="supplier"
            required
          >

        </label>


        <!-- PURCHASE DATE -->

        <label>
          Purchase Date

          <input
            id="date"
            type="date"
            required
            value="${today()}"
          >

        </label>


        <!-- WARRANTY -->

        <label>
          Warranty (months)

          <input
            id="warranty"
            type="number"
            min="0"
            value="12"
          >

        </label>


        <div class="full">

          <button
            class="btn"
            type="submit"
          >
            Add Mobile Stock
          </button>

        </div>

      </form>

    </div>
  `;
}

function loadModels(preferredModelId = null) {
  const modelEl = document.getElementById('modelId');
  const brandEl = document.getElementById('brandId');

  if (!modelEl || !brandEl) return;

  const brandId = brandEl.value;

  // No brand selected: Add Model is still available, but
  // the user must select a brand before creating the model.
  if (!brandId || brandId === '__ADD_BRAND__') {
    modelEl.innerHTML = `
      <option value="">Select Brand First</option>
      <option value="__ADD_MODEL__">＋ Add Model</option>
    `;
    clearModelDetails();
    return;
  }

  // Only show models belonging to the currently selected brand.
  const models = db.models
    .filter(m => String(m.brandId) === String(brandId))
    .sort((a, b) => Number(a.id) - Number(b.id));

  modelEl.innerHTML = `
    <option value="">
      ${models.length ? 'Select Model' : 'No models available'}
    </option>

    ${models.map(m => `
      <option value="${m.id}">
        ${escapeHtml(m.name)}${
          m.ram || m.storage
            ? ` — ${escapeHtml(m.ram || '')}${m.ram && m.storage ? ' / ' : ''}${escapeHtml(m.storage || '')}`
            : ''
        }
      </option>
    `).join('')}

    <option value="__ADD_MODEL__">＋ Add Model</option>
  `;

  // Select a newly-created model when requested.
  if (
    preferredModelId !== null &&
    models.some(m => String(m.id) === String(preferredModelId))
  ) {
    modelEl.value = String(preferredModelId);
    selectModelDetails();
    return;
  }

  clearModelDetails();
}

/* =========================
   BRAND SELECTION
========================= */

window.handleBrandSelection = async () => {
  const brandEl = document.getElementById('brandId');
  if (!brandEl) return;

  // Optional: allow adding a brand directly from the Brand dropdown.
  if (brandEl.value === '__ADD_BRAND__') {
    brandEl.value = '';
    await window.addBrand();
    return;
  }

  loadModels();
};

/* =========================
   MODEL SELECTION
========================= */

window.handleModelSelection = async () => {
  const modelEl = document.getElementById('modelId');
  const brandEl = document.getElementById('brandId');

  if (!modelEl || !brandEl) return;

  // User selected ＋ Add Model.
  if (modelEl.value === '__ADD_MODEL__') {
    const brandId = brandEl.value;

    if (!brandId || brandId === '__ADD_BRAND__') {
      modelEl.value = '';
      alert('Please select a brand first.');
      loadModels();
      return;
    }

    await window.addModel(Number(brandId));
    return;
  }

  selectModelDetails();
};

// Keep the older function name working in case another part of the app uses it.
window.handleModelChange = window.handleModelSelection;

function selectModelDetails() {
  const modelId = document.getElementById('modelId')?.value;

  if (!modelId || modelId === '__ADD_MODEL__') {
    clearModelDetails();
    return;
  }

  const model = db.models.find(m => String(m.id) === String(modelId));

  if (!model) {
    clearModelDetails();
    return;
  }

  const ram = document.getElementById('ram');
  const storage = document.getElementById('storage');
  const color = document.getElementById('color');

  if (ram) ram.value = model.ram || '';
  if (storage) storage.value = model.storage || '';
  if (color) color.value = model.color || '';
}

function clearModelDetails() {
  const ram = document.getElementById('ram');
  const storage = document.getElementById('storage');
  const color = document.getElementById('color');

  if (ram) ram.value = '';
  if (storage) storage.value = '';
  if (color) color.value = '';
}

function updateImeiRequirement() {
  const quantity = Number(document.getElementById('quantity')?.value || 1);
  const imei1 = document.getElementById('imei1');

  if (!imei1) return;

  if (quantity === 1) {
    imei1.required = true;
    imei1.placeholder = 'Required when quantity is 1';
  } else {
    imei1.required = false;
    imei1.placeholder = 'Optional for bulk quantity';
  }
}

function folderStock() {
  const qty = db.folderStock.reduce((a,x) => a + Number(x.quantity || 0), 0);
  const value = db.folderStock.reduce((a,x) => a + Number(x.purchase || 0) * Number(x.quantity || 0), 0);

  return `
    <div class="folder-summary">
      <div class="folder-stat"><small>Total Folder Types</small><strong>${db.folderStock.length}</strong></div>
      <div class="folder-stat"><small>Total Folder Quantity</small><strong>${qty}</strong></div>
      <div class="folder-stat"><small>Stock Value</small><strong>${money(value)}</strong></div>
    </div>

    <div class="panel">
      <div class="panel-head">
        <h2>Add Folder Stock</h2>
      </div>

      <form class="form" onsubmit="addFolder(event)">
        <label>Folder Name<input id="folderName" placeholder=" " required></label>
        <label>Folder Type<input id="folderType" placeholder=" "></label>
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
        <input id="folderSearch" placeholder="Search folder or supplier" oninput="filterFolders()">
      </div>

      <div id="folderTable">${folderTable(db.folderStock)}</div>
    </div>`;
}

function folderTable(rows) {
  if (!rows.length) return `<div class="empty">No folder stock found.</div>`;

  return `
    <div class="table-wrap"><table>
      <thead><tr>
        <th>Date</th><th>Folder</th><th>Type</th><th>Qty</th><th>Purchase</th><th>Selling</th><th>Supplier</th><th>Stock Value</th><th>Action</th>
      </tr></thead>
      <tbody>
        ${rows.slice().reverse().map(x => `
          <tr>
            <td>${escapeHtml(x.date)}</td>
            <td>${escapeHtml(x.name)}</td>
            <td>${escapeHtml(x.type || '-')}</td>
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
  const orderedBrands = db.brands
    .slice()
    .sort((a, b) => Number(a.id) - Number(b.id));

  return `
    <div class="panel">
      <div class="panel-head">
        <h2>Mobile Brands</h2>
        <button class="btn" onclick="addBrand()">+ Add Brand</button>
      </div>

      <div class="table-wrap"><table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Brand</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${orderedBrands.map((b, index) => `
            <tr>
              <td>${index + 1}</td>
              <td><strong>${escapeHtml(b.name)}</strong></td>
              <td>
                <span class="badge ${String(b.status).toLowerCase() === 'active' ? 'active' : 'inactive'}">
                  ${escapeHtml(b.status || 'Active')}
                </span>
              </td>
              <td>
                <button class="btn secondary" onclick="toggleBrandStatus(${b.id})">
                  ${String(b.status).toLowerCase() === 'active' ? 'Deactivate' : 'Activate'}
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table></div>

      <div style="margin-top:18px; padding:14px 16px; border-radius:10px; background:rgba(0,0,0,.03);">
        <strong>How to add models:</strong>
        Open <b>Add Mobile Stock</b>, select a brand, then choose
        <b>＋ Add Model</b> from the Model dropdown.
        Models are kept out of this Brands table so the page stays clean.
      </div>
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
  doc.text('MobileStore',14,15);
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

  const quantity = Number(document.getElementById('folderQuantity').value);
  const purchase = Number(document.getElementById('folderPurchase').value);
  const selling = Number(document.getElementById('folderSelling').value);

  if (quantity < 1 || purchase < 0 || selling < 0) {
    alert('Please enter valid folder stock details.');
    return;
  }

  db.folderStock.push({
    id: Date.now(),
    name: document.getElementById('folderName').value.trim(),
    type: document.getElementById('folderType').value.trim(),
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
  const rows = db.folderStock.filter(x =>
    `${x.name} ${x.type} ${x.supplier}`.toLowerCase().includes(q)
  );
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

  const rows = db.folderStock.map(x => ({
    Date:x.date, Folder:x.name, Type:x.type || '',
    Quantity:x.quantity, 'Purchase Price':x.purchase,
    'Selling Price':x.selling,
    'Stock Value':Number(x.purchase)*Number(x.quantity),
    Supplier:x.supplier || '', Status:x.status
  }));

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

  const modelId = Number(document.getElementById('modelId').value);
  const quantity = Number(document.getElementById('quantity').value);
  const imei1 = document.getElementById('imei1').value.trim();
  const imei2 = document.getElementById('imei2').value.trim();

  if (!modelId) {
    alert('Please select a model.');
    return;
  }

  if (!Number.isInteger(quantity) || quantity < 1) {
    alert('Quantity must be at least 1.');
    return;
  }

  if (quantity === 1 && !imei1) {
    alert('IMEI 1 is required when quantity is 1.');
    return;
  }

  if (imei1 && !/^\d{10,20}$/.test(imei1)) {
    alert('IMEI 1 must contain 10 to 20 digits.');
    return;
  }

  if (imei2 && !/^\d{10,20}$/.test(imei2)) {
    alert('IMEI 2 must contain 10 to 20 digits.');
    return;
  }

  if (imei1 && db.devices.some(d => String(d.imei1 || '') === imei1)) {
    alert('IMEI 1 already exists in inventory.');
    return;
  }

  if (imei2 && db.devices.some(d => String(d.imei2 || '') === imei2)) {
    alert('IMEI 2 already exists in inventory.');
    return;
  }

  const usedIds = new Set(
    db.devices.map(d => Number(d.id)).filter(Number.isFinite)
  );

  let nextId = 1;
  while (usedIds.has(nextId)) nextId++;

  db.devices.push({
    id: nextId,
    modelId,
    quantity,
    imei1,
    imei2,
    purchase: Number(document.getElementById('purchase').value),
    selling: Number(document.getElementById('selling').value),
    supplier: document.getElementById('supplier').value.trim(),
    date: document.getElementById('date').value,
    warranty: Number(document.getElementById('warranty').value),
    status: 'IN_STOCK'
  });

  try {
    await save(db);
    alert('Mobile stock added successfully');
    go('inventory');
  } catch (error) {
    console.error('Add mobile stock error:', error);
    alert('Unable to save mobile stock: ' + (error.message || error));
  }
};

window.sell = async id => {
  const d = db.devices.find(x => Number(x.id) === Number(id));
  if (!d) return;

  const available = Number(d.quantity || 1);

  if (d.status !== 'IN_STOCK' || available < 1) {
    alert('This mobile is not available in stock.');
    return;
  }

  const customer = prompt('Customer name (optional):', 'Walk-in Customer') || 'Walk-in Customer';
  const payment = prompt('Payment method:', 'UPI') || 'UPI';
  const sale = Number(prompt(`Selling price (default ${d.selling}):`, d.selling));

  if (!Number.isFinite(sale) || sale <= 0) return;

  const profit = sale - Number(d.purchase || 0);

  d.quantity = Math.max(0, available - 1);
  d.status = d.quantity === 0 ? 'SOLD' : 'IN_STOCK';

  const usedIds = new Set(
    db.sales.map(x => Number(x.id)).filter(Number.isFinite)
  );

  let nextSaleId = 1;
  while (usedIds.has(nextSaleId)) nextSaleId++;

  db.sales.push({
    id: nextSaleId,
    deviceId: d.id,
    sale,
    customer,
    phone: '',
    payment,
    date: today(),
    profit
  });

  try {
    await save(db);
    render();
  } catch (error) {
    console.error('Sell mobile error:', error);
    alert('Unable to save sale: ' + (error.message || error));
  }
};

window.removeDevice = async (id) => {

  const confirmed = confirm(
    'Are you sure you want to remove this mobile stock?'
  );

  if (!confirmed) {
    return;
  }

  try {

    await deleteMobileStock(id);

    // Remove from local state
    db.devices = db.devices.filter(
      d => Number(d.id) !== Number(id)
    );

    await save(db);

    alert('Mobile stock removed successfully.');

    render();

  } catch (error) {

    console.error(
      'Delete mobile stock error:',
      error
    );

    alert(
      'Unable to delete mobile stock: ' +
      error.message
    );
  }
};

window.addBrand = async () => {
  const name = prompt('Brand name:');
  if (!name || !name.trim()) return;

  const cleanName = name.trim();

  if (db.brands.some(b => b.name.trim().toLowerCase() === cleanName.toLowerCase())) {
    alert('This brand already exists.');
    return;
  }

  try {
    const usedIds = new Set(
      db.brands.map(b => Number(b.id)).filter(Number.isFinite)
    );

    let nextId = 1;
    while (usedIds.has(nextId)) nextId++;

    db.brands.push({
      id: nextId,
      name: cleanName,
      status: 'Active'
    });

    await save(db);
    render();
  } catch (error) {
    console.error('Add brand error:', error);
    alert('Unable to add brand: ' + (error.message || error));
  }
};

window.toggleBrandStatus = async brandId => {
  const brand = db.brands.find(b => Number(b.id) === Number(brandId));
  if (!brand) return;

  const isActive = String(brand.status).toLowerCase() === 'active';
  const newStatus = isActive ? 'Inactive' : 'Active';

  if (!confirm(`${newStatus === 'Inactive' ? 'Deactivate' : 'Activate'} ${brand.name}?`)) {
    return;
  }

  try {
    brand.status = newStatus;
    await save(db);
    render();
  } catch (error) {
    console.error('Brand status error:', error);
    alert('Unable to update brand status: ' + (error.message || error));
  }
};

window.addModel = async brandId => {
  const brand = db.brands.find(
    b => Number(b.id) === Number(brandId)
  );

  if (!brand) return;

  if (String(brand.status).toLowerCase() !== 'active') {
    alert('Please activate this brand before adding a model.');
    return;
  }

  const name = prompt(`Enter model name for ${brand.name}:`);
  if (!name || !name.trim()) return;

  const cleanName = name.trim();

  // Prevent duplicate model names under the same brand.
  if (db.models.some(m =>
    Number(m.brandId) === Number(brandId) &&
    String(m.name || '').trim().toLowerCase() === cleanName.toLowerCase()
  )) {
    alert('This model already exists under this brand.');
    return;
  }

  const ram = prompt('RAM (optional):', '8 GB') || '';
  const storage = prompt('Storage (optional):', '128 GB') || '';
  const color = prompt('Color (optional):', '') || '';

  try {
    const model = await addModelToBrand({
      brandId: Number(brandId),
      name: cleanName,
      ram: ram.trim(),
      storage: storage.trim(),
      color: color.trim()
    });

    // Keep local state in sync.
    if (!db.models.some(m => Number(m.id) === Number(model.id))) {
      db.models.push(model);
    }

    await save(db);

    alert(`${model.name} added under ${brand.name}.`);

    // If currently on Add Mobile Stock, rebuild the form and
    // automatically select the newly-created model.
    if (page === 'add') {
      render();

      setTimeout(() => {
        const brandEl = document.getElementById('brandId');

        if (brandEl) {
          brandEl.value = String(brandId);
        }

        loadModels(model.id);
      }, 0);
    } else {
      render();
    }
  } catch (error) {
    console.error('Add model error:', error);
    alert('Unable to add model: ' + (error.message || error));
  }
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
      ${card('Mobile Inventory Value',money(db.devices.filter(d=>d.status==='IN_STOCK').reduce((a,d)=>a + d.purchase * Number(d.quantity || 1),0)),'📦')}
    </div>

    <div class="panel">
      <h2>Store Summary</h2>
      <p>Total brands: <b>${db.brands.length}</b></p>
      <p>Total models: <b>${db.models.length}</b></p>
      <p>Total mobile devices: <b>${db.devices.reduce((a,d)=>a + Number(d.quantity || 1),0)}</b></p>
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
};

window.logout = async () => {
  if (!confirm('Log out of MobileStore Admin?')) return;

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
        <h1>📱 MobileStore Admin</h1>
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
        <h1>📱 MobileStore Admin</h1>
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
