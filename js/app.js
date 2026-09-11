import { load, save, reset } from './data.js';

const db = load();

const app = document.getElementById('app');

let page = 'dashboard';


/* =========================
   BASIC HELPERS
========================= */

const money = n =>
  '₹' + Number(n || 0).toLocaleString('en-IN');


const brandName = id =>
  db.brands.find(x => x.id == id)?.name || 'Unknown';


const modelName = id =>
  db.models.find(x => x.id == id)?.name || 'Unknown';


const deviceLabel = d => {

  if (!d) return 'Unknown';

  const model = db.models.find(
    m => m.id == d.modelId
  );

  return `${brandName(model?.brandId)} ${modelName(d.modelId)}`;
};


/* =========================
   RENDER
========================= */

function render() {

  app.innerHTML = `

    <div class="app">

      <aside class="sidebar">

        <div class="brand">
          Mobile<span>Store</span>
        </div>

        <nav class="nav">

          ${[
            ['dashboard', '🏠 Dashboard'],
            ['inventory', '📱 Inventory'],
            ['add', '➕ Add Stock'],
            ['brands', '🏷️ Brands'],
            ['sales', '💰 Sales'],
            ['dailySales', '🧾 Daily Sales'],
            ['sold', '📦 Sold Mobiles'],
            ['suppliers', '👨‍💼 Suppliers'],
            ['reports', '📊 Reports']
          ]
          .map(([p, t]) => `
              <button
                class="${page === p ? 'active' : ''}"
                onclick="go('${p}')">
                ${t}
              </button>
          `)
          .join('')}

          <button onclick="logout()">
            🚪 Logout
          </button>

        </nav>

      </aside>


      <main class="main">

        <div class="top">

          <div class="top-left">

            <button
              class="mobile-menu-btn"
              onclick="toggleMenu()"
              aria-label="Open navigation">
              ☰
            </button>

            <h1>${title()}</h1>

          </div>

          <div class="admin">
            👤 Store Admin
          </div>

        </div>

        <section id="content">

          ${content()}

        </section>

      </main>

    </div>
  `;
}


/* =========================
   PAGE TITLE
========================= */

function title() {

  return {

    dashboard: 'Dashboard',
    inventory: 'Inventory',
    add: 'Add New Mobile Stock',
    brands: 'Brands',
    sales: 'Sales',
    dailySales: 'Daily Sales',
    sold: 'Sold Mobiles',
    suppliers: 'Suppliers',
    reports: 'Reports'

  }[page];
}


/* =========================
   STATISTICS
========================= */

function stats() {

  const sold =
    db.devices.filter(
      d => d.status === 'SOLD'
    ).length;


  const stock =
    db.devices.filter(
      d => d.status === 'IN_STOCK'
    ).length;


  const revenue =
    db.sales.reduce(
      (a, x) => a + Number(x.sale || 0),
      0
    );


  const profit =
    db.sales.reduce(
      (a, x) => a + Number(x.profit || 0),
      0
    );


  return {
    sold,
    stock,
    revenue,
    profit
  };
}


/* =========================
   CONTENT ROUTER
========================= */

function content() {

  if (page === 'dashboard')
    return dashboard();

  if (page === 'inventory')
    return inventory();

  if (page === 'add')
    return add();

  if (page === 'brands')
    return brands();

  if (page === 'sales')
    return sales(false);

  if (page === 'sold')
    return sales(true);

  if (page === 'dailySales')
    return dailySales();

  if (page === 'suppliers')
    return suppliers();

  return reports();
}


/* =========================
   DASHBOARD
========================= */

function dashboard() {

  const s = stats();

  return `

    <div class="cards">

      ${card(
        'Total Devices',
        db.devices.length,
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

      <div class="panel">

        <div class="panel-head">
          <h2>Sales Overview</h2>
        </div>

        <div class="chart">

          ${[0,1,2,3,4,5,6]
            .map((_, i) => `

              <div
                class="bar"
                style="height:${30 + ((i * 37) % 140)}px">

                <span>
                  ${[
                    'Mon',
                    'Tue',
                    'Wed',
                    'Thu',
                    'Fri',
                    'Sat',
                    'Sun'
                  ][i]}
                </span>

              </div>

          `)
          .join('')}

        </div>

      </div>


      <div class="panel">

        <div class="panel-head">
          <h2>Quick Actions</h2>
        </div>

        <button
          class="btn"
          onclick="go('add')">
          + Add Stock
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


    <div class="panel">

      <div class="panel-head">

        <h2>Recent Sales</h2>

        <button
          class="btn secondary"
          onclick="go('sold')">
          View All
        </button>

      </div>

      ${salesTable(
        db.sales
          .slice(-5)
          .reverse()
      )}

    </div>

  `;
}


function card(a, b, c) {

  return `

    <div class="card">

      <small>
        ${c} ${a}
      </small>

      <div class="metric">
        ${b}
      </div>

    </div>

  `;
}


/* =========================
   INVENTORY
========================= */

function inventory() {

  return `

    <div class="panel">

      <div class="toolbar">

        <input
          id="search"
          placeholder="Search IMEI, brand or model"
          oninput="filterInventory()">

        <select
          id="statusFilter"
          onchange="filterInventory()">

          <option value="">
            All Status
          </option>

          <option value="IN_STOCK">
            IN_STOCK
          </option>

          <option value="SOLD">
            SOLD
          </option>

          <option value="DAMAGED">
            DAMAGED
          </option>

          <option value="RETURNED">
            RETURNED
          </option>

          <option value="REMOVED">
            REMOVED
          </option>

        </select>

        <button
          class="btn"
          onclick="go('add')">
          + Add Stock
        </button>

      </div>


      <div id="invTable">

        ${deviceTable(db.devices)}

      </div>

    </div>

  `;
}


function deviceTable(rows) {

  if (!rows.length)
    return `
      <div class="empty">
        No devices found.
      </div>
    `;


  return `

    <div class="table-wrap">

      <table>

        <thead>

          <tr>
            <th>IMEI</th>
            <th>Brand</th>
            <th>Model</th>
            <th>Price</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>

        </thead>


        <tbody>

          ${rows.map(d => `

            <tr>

              <td>
                ${d.imei1}
              </td>

              <td>
                ${brandName(
                  db.models.find(
                    m => m.id == d.modelId
                  )?.brandId
                )}
              </td>

              <td>
                ${modelName(d.modelId)}
              </td>

              <td>
                ${money(d.selling)}
              </td>

              <td>

                <span class="badge ${d.status
                  .toLowerCase()
                  .replace('_', '')}">

                  ${d.status}

                </span>

              </td>

              <td class="actions">

                ${
                  d.status === 'IN_STOCK'
                    ? `
                      <button
                        class="btn"
                        onclick="sell(${d.id})">
                        Sell
                      </button>
                    `
                    : ''
                }

                <button
                  class="btn secondary"
                  onclick="removeDevice(${d.id})">
                  Remove
                </button>

              </td>

            </tr>

          `).join('')}

        </tbody>

      </table>

    </div>

  `;
}


/* =========================
   ADD STOCK
========================= */

function add() {

  return `

    <div class="panel">

      <form
        class="form"
        onsubmit="addDevice(event)">

        <label>
          Brand

          <select
            id="brandId"
            required
            onchange="loadModels()">

            ${db.brands.map(b => `

              <option value="${b.id}">
                ${b.name}
              </option>

            `).join('')}

          </select>

        </label>


        <label>
          Model

          <select
            id="modelId"
            required>
          </select>
        </label>


        <label>
          IMEI 1

          <input
            id="imei1"
            required
            pattern="\\d{10,20}">
        </label>


        <label>
          IMEI 2

          <input
            id="imei2"
            pattern="\\d{10,20}">
        </label>


        <label>
          RAM

          <input
            id="ram"
            placeholder="8 GB">
        </label>


        <label>
          Storage

          <input
            id="storage"
            placeholder="128 GB">
        </label>


        <label>
          Color

          <input
            id="color"
            placeholder="Black">
        </label>


        <label>
          Purchase Price

          <input
            id="purchase"
            type="number"
            min="0"
            required>
        </label>


        <label>
          Selling Price

          <input
            id="selling"
            type="number"
            min="0"
            required>
        </label>


        <label>
          Supplier

          <input
            id="supplier"
            required>
        </label>


        <label>
          Purchase Date

          <input
            id="date"
            type="date"
            required
            value="${new Date()
              .toISOString()
              .slice(0, 10)}">
        </label>


        <label>
          Warranty (months)

          <input
            id="warranty"
            type="number"
            value="12">
        </label>


        <div class="full">

          <button class="btn">
            Add Mobile Stock
          </button>

        </div>

      </form>

    </div>

  `;
}


function loadModels() {

  const el =
    document.getElementById('modelId');

  if (!el) return;


  const b =
    document.getElementById('brandId').value;


  el.innerHTML =
    db.models
      .filter(m => m.brandId == b)
      .map(m => `

        <option value="${m.id}">
          ${m.name} — ${m.ram}/${m.storage}
        </option>

      `)
      .join('');
}


/* =========================
   BRANDS
========================= */

function brands() {

  return `

    <div class="panel">

      <div class="panel-head">

        <h2>Mobile Brands</h2>

        <button
          class="btn"
          onclick="addBrand()">
          + Add Brand
        </button>

      </div>


      <div class="table-wrap">

        <table>

          <thead>

            <tr>
              <th>ID</th>
              <th>Brand</th>
              <th>Models</th>
              <th>Status</th>
              <th>Action</th>
            </tr>

          </thead>


          <tbody>

            ${db.brands.map(b => `

              <tr>

                <td>${b.id}</td>

                <td>${b.name}</td>

                <td>
                  ${
                    db.models.filter(
                      m => m.brandId == b.id
                    ).length
                  }
                </td>

                <td>
                  ${b.status}
                </td>

                <td>

                  <button
                    class="btn secondary"
                    onclick="toggleBrand(${b.id})">

                    ${
                      b.status === 'Active'
                        ? 'Deactivate'
                        : 'Activate'
                    }

                  </button>

                </td>

              </tr>

            `).join('')}

          </tbody>

        </table>

      </div>

    </div>

  `;
}


/* =========================
   SALES
========================= */

function sales(soldOnly = false) {

  const rows =
    db.sales
      .slice()
      .reverse();


  return `

    <div class="panel">

      <div class="toolbar">

        <input
          placeholder="Search sales"
          oninput="searchSales(this.value)">

      </div>


      <div id="salesTable">

        ${salesTable(rows)}

      </div>

    </div>

  `;
}


function salesTable(rows) {

  if (!rows.length)
    return `
      <div class="empty">
        No sales found.
      </div>
    `;


  return `

    <div class="table-wrap">

      <table>

        <thead>

          <tr>

            <th>Date</th>
            <th>Mobile</th>
            <th>IMEI</th>
            <th>Customer</th>
            <th>Sale Price</th>
            <th>Profit</th>
            <th>Payment</th>

          </tr>

        </thead>


        <tbody>

          ${rows.map(x => {

            const d =
              db.devices.find(
                d => d.id == x.deviceId
              );


            return `

              <tr>

                <td>
                  ${x.date}
                </td>

                <td>
                  ${deviceLabel(d)}
                </td>

                <td>
                  ${d?.imei1 || ''}
                </td>

                <td>
                  ${x.customer}
                </td>

                <td>
                  ${money(x.sale)}
                </td>

                <td>
                  ${money(x.profit)}
                </td>

                <td>
                  ${x.payment}
                </td>

              </tr>

            `;

          }).join('')}

        </tbody>

      </table>

    </div>

  `;
}


/* =====================================================
   NEW DAILY SALES SECTION
===================================================== */

function dailySales() {

  const today =
    new Date()
      .toISOString()
      .slice(0, 10);


  return `

    <!-- ADD DAILY SALE -->

    <div class="panel">

      <div class="panel-head">

        <h2>
          Add Daily Sale
        </h2>

      </div>


      <form
        class="form"
        onsubmit="addDailySale(event)">


        <label>

          Sale Date

          <input
            type="date"
            id="dailyDate"
            value="${today}"
            required>

        </label>


        <label>

          Brand

          <input
            type="text"
            id="dailyBrand"
            placeholder="Samsung"
            required>

        </label>


        <label>

          Product / Mobile Name

          <input
            type="text"
            id="dailyProduct"
            placeholder="Galaxy A55"
            required>

        </label>


        <label>

          IMEI

          <input
            type="text"
            id="dailyImei"
            placeholder="IMEI number">

        </label>


        <label>

          Customer Name

          <input
            type="text"
            id="dailyCustomer"
            placeholder="Customer name">

        </label>


        <label>

          Quantity

          <input
            type="number"
            id="dailyQuantity"
            min="1"
            value="1"
            required>

        </label>


        <label>

          Purchase Price

          <input
            type="number"
            id="dailyPurchase"
            min="0"
            placeholder="25000"
            required>

        </label>


        <label>

          Sale Price

          <input
            type="number"
            id="dailySalePrice"
            min="0"
            placeholder="30000"
            required>

        </label>


        <label>

          Payment Method

          <select
            id="dailyPayment">

            <option value="Cash">
              Cash
            </option>

            <option value="UPI">
              UPI
            </option>

            <option value="Card">
              Card
            </option>

            <option value="Bank Transfer">
              Bank Transfer
            </option>

            <option value="Other">
              Other
            </option>

          </select>

        </label>


        <label>

          Notes

          <input
            type="text"
            id="dailyNotes"
            placeholder="Optional">

        </label>


        <div class="full">

          <button
            type="submit"
            class="btn">

            + Add Daily Sale

          </button>

        </div>


      </form>

    </div>


    <!-- DAILY SALES REPORT -->

    <div class="panel">

      <div class="panel-head">

        <h2>
          Daily Sales Records
        </h2>

        <div class="daily-actions">

          <button
            class="btn secondary"
            onclick="exportDailySalesExcel()">

            📊 Export Excel

          </button>


          <button
            class="btn"
            onclick="generateMonthlyPDF()">

            📄 Monthly PDF

          </button>

        </div>

      </div>


      <!-- FILTER -->

      <div class="toolbar daily-filter">

        <label class="filter-label">

          Select Month

          <input
            type="month"
            id="dailyMonth"
            value="${today.slice(0, 7)}"
            onchange="filterDailySales()">

        </label>


        <input
          id="dailySearch"
          placeholder="Search product, customer, IMEI..."
          oninput="filterDailySales()">

      </div>


      <!-- SUMMARY -->

      <div
        id="dailySummary"
        class="daily-summary">

      </div>


      <!-- TABLE -->

      <div id="dailySalesTable">

        ${dailySalesTable(
          getCurrentMonthDailySales()
        )}

      </div>

    </div>

  `;
}


/* =========================
   GET CURRENT MONTH
========================= */

function getCurrentMonthDailySales() {

  const today =
    new Date()
      .toISOString()
      .slice(0, 7);


  return db.dailySales
    .filter(x =>
      x.date.startsWith(today)
    )
    .slice()
    .reverse();
}


/* =========================
   DAILY SALES TABLE
========================= */

function dailySalesTable(rows) {

  updateDailySummary(rows);


  if (!rows.length) {

    return `

      <div class="empty">

        No daily sales found
        for this month.

      </div>

    `;
  }


  return `

    <div class="table-wrap">

      <table>

        <thead>

          <tr>

            <th>Date</th>
            <th>Brand</th>
            <th>Product</th>
            <th>IMEI</th>
            <th>Customer</th>
            <th>Qty</th>
            <th>Sale Price</th>
            <th>Profit</th>
            <th>Payment</th>
            <th>Action</th>

          </tr>

        </thead>


        <tbody>

          ${rows.map(x => `

            <tr>

              <td>
                ${x.date}
              </td>

              <td>
                ${escapeHtml(x.brand)}
              </td>

              <td>
                ${escapeHtml(x.product)}
              </td>

              <td>
                ${escapeHtml(x.imei || '-')}
              </td>

              <td>
                ${escapeHtml(x.customer || '-')}
              </td>

              <td>
                ${x.quantity}
              </td>

              <td>
                ${money(x.salePrice)}
              </td>

              <td>
                ${money(x.profit)}
              </td>

              <td>
                ${escapeHtml(x.payment)}
              </td>

              <td>

                <button
                  class="btn danger"
                  onclick="deleteDailySale(${x.id})">

                  Delete

                </button>

              </td>

            </tr>

          `).join('')}

        </tbody>

      </table>

    </div>

  `;
}


/* =========================
   UPDATE DAILY SUMMARY
========================= */

function updateDailySummary(rows) {

  const el =
    document.getElementById(
      'dailySummary'
    );


  if (!el) return;


  const quantity =
    rows.reduce(
      (a, x) =>
        a + Number(x.quantity || 0),
      0
    );


  const revenue =
    rows.reduce(
      (a, x) =>
        a +
        Number(x.salePrice || 0) *
        Number(x.quantity || 0),
      0
    );


  const profit =
    rows.reduce(
      (a, x) =>
        a +
        Number(x.profit || 0),
      0
    );


  el.innerHTML = `

    <div class="daily-stat">

      <small>
        Products Sold
      </small>

      <strong>
        ${quantity}
      </strong>

    </div>


    <div class="daily-stat">

      <small>
        Total Sales
      </small>

      <strong>
        ${money(revenue)}
      </strong>

    </div>


    <div class="daily-stat">

      <small>
        Total Profit
      </small>

      <strong>
        ${money(profit)}
      </strong>

    </div>


    <div class="daily-stat">

      <small>
        Transactions
      </small>

      <strong>
        ${rows.length}
      </strong>

    </div>

  `;
}


/* =========================
   ADD DAILY SALE
========================= */

window.addDailySale = function(event) {

  event.preventDefault();


  const date =
    document.getElementById(
      'dailyDate'
    ).value;


  const brand =
    document.getElementById(
      'dailyBrand'
    ).value.trim();


  const product =
    document.getElementById(
      'dailyProduct'
    ).value.trim();


  const imei =
    document.getElementById(
      'dailyImei'
    ).value.trim();


  const customer =
    document.getElementById(
      'dailyCustomer'
    ).value.trim();


  const quantity =
    Number(
      document.getElementById(
        'dailyQuantity'
      ).value
    );


  const purchase =
    Number(
      document.getElementById(
        'dailyPurchase'
      ).value
    );


  const salePrice =
    Number(
      document.getElementById(
        'dailySalePrice'
      ).value
    );


  const payment =
    document.getElementById(
      'dailyPayment'
    ).value;


  const notes =
    document.getElementById(
      'dailyNotes'
    ).value.trim();


  if (salePrice < 0 || purchase < 0) {

    alert(
      'Price cannot be negative.'
    );

    return;
  }


  /*
   * Profit = total sale - total purchase
   */

  const profit =
    (salePrice - purchase) *
    quantity;


  const record = {

    id: Date.now(),

    date,

    brand,

    product,

    imei,

    customer,

    quantity,

    purchase,

    salePrice,

    payment,

    profit,

    notes

  };


  db.dailySales.push(record);


  save(db);


  alert(
    'Daily sale added successfully!'
  );


  render();

};


/* =========================
   FILTER DAILY SALES
========================= */

window.filterDailySales = function() {

  const month =
    document.getElementById(
      'dailyMonth'
    )?.value;


  const search =
    document.getElementById(
      'dailySearch'
    )?.value
      .toLowerCase()
      .trim() || '';


  let rows =
    db.dailySales.filter(x =>
      !month ||
      x.date.startsWith(month)
    );


  if (search) {

    rows =
      rows.filter(x => {

        const text = `

          ${x.date}
          ${x.brand}
          ${x.product}
          ${x.imei}
          ${x.customer}
          ${x.payment}

        `.toLowerCase();


        return text.includes(search);

      });

  }


  rows =
    rows
      .slice()
      .reverse();


  document.getElementById(
    'dailySalesTable'
  ).innerHTML =
    dailySalesTable(rows);

};


/* =========================
   DELETE DAILY SALE
========================= */

window.deleteDailySale = function(id) {

  const sale =
    db.dailySales.find(
      x => x.id === id
    );


  if (!sale) return;


  const confirmDelete =
    confirm(
      `Delete sale for ${sale.product}?`
    );


  if (!confirmDelete)
    return;


  db.dailySales =
    db.dailySales.filter(
      x => x.id !== id
    );


  save(db);


  render();

};


/* =====================================================
   EXCEL EXPORT
===================================================== */

window.exportDailySalesExcel = function() {

  if (!db.dailySales.length) {

    alert(
      'There are no daily sales to export.'
    );

    return;
  }


  /*
   * Convert database records
   * into Excel-friendly rows
   */

  const rows =
    db.dailySales.map(x => ({

      Date: x.date,

      Brand: x.brand,

      Product: x.product,

      IMEI: x.imei || '',

      Customer: x.customer || '',

      Quantity: x.quantity,

      'Purchase Price':
        x.purchase,

      'Sale Price':
        x.salePrice,

      'Total Sale':
        Number(x.salePrice) *
        Number(x.quantity),

      Profit:
        x.profit,

      Payment:
        x.payment,

      Notes:
        x.notes || ''

    }));


  /*
   * Create worksheet
   */

  const worksheet =
    XLSX.utils.json_to_sheet(rows);


  /*
   * Create workbook
   */

  const workbook =
    XLSX.utils.book_new();


  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    'Daily Sales'
  );


  /*
   * Column widths
   */

  worksheet['!cols'] = [

    { wch: 14 },
    { wch: 14 },
    { wch: 22 },
    { wch: 20 },
    { wch: 22 },
    { wch: 10 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 18 },
    { wch: 30 }

  ];


  /*
   * Download Excel
   */

  const today =
    new Date()
      .toISOString()
      .slice(0, 10);


  XLSX.writeFile(
    workbook,
    `Daily_Sales_${today}.xlsx`
  );

};


/* =====================================================
   MONTHLY PDF
===================================================== */

window.generateMonthlyPDF = function() {

  const month =
    document.getElementById(
      'dailyMonth'
    )?.value;


  if (!month) {

    alert(
      'Please select a month first.'
    );

    return;
  }


  /*
   * Get selected month's sales
   */

  const rows =
    db.dailySales.filter(x =>
      x.date.startsWith(month)
    );


  if (!rows.length) {

    alert(
      'No sales found for the selected month.'
    );

    return;
  }


  /*
   * jsPDF
   */

  const {
    jsPDF
  } = window.jspdf;


  const doc =
    new jsPDF(
      'landscape',
      'mm',
      'a4'
    );


  /*
   * Month display
   */

  const [year, monthNumber] =
    month.split('-');


  const monthName =
    new Date(
      year,
      Number(monthNumber) - 1
    ).toLocaleString(
      'en-IN',
      {
        month: 'long'
      }
    );


  /*
   * PDF HEADER
   */

  doc.setFontSize(20);

  doc.text(
    'MobileStore',
    14,
    15
  );


  doc.setFontSize(15);

  doc.text(
    `Monthly Daily Sales Report - ${monthName} ${year}`,
    14,
    24
  );


  doc.setFontSize(10);

  doc.text(
    `Generated on: ${new Date().toLocaleDateString('en-IN')}`,
    14,
    31
  );


  /*
   * SUMMARY CALCULATIONS
   */

  const totalQuantity =
    rows.reduce(
      (a, x) =>
        a +
        Number(x.quantity || 0),
      0
    );


  const totalRevenue =
    rows.reduce(
      (a, x) =>
        a +
        Number(x.salePrice || 0) *
        Number(x.quantity || 0),
      0
    );


  const totalProfit =
    rows.reduce(
      (a, x) =>
        a +
        Number(x.profit || 0),
      0
    );


  /*
   * SUMMARY BOXES
   */

  doc.setFontSize(11);

  doc.text(
    `Total Transactions: ${rows.length}`,
    14,
    42
  );


  doc.text(
    `Total Products Sold: ${totalQuantity}`,
    80,
    42
  );


  doc.text(
    `Total Revenue: ${money(totalRevenue)}`,
    160,
    42
  );


  doc.text(
    `Total Profit: ${money(totalProfit)}`,
    245,
    42
  );


  /*
   * TABLE
   */

  const tableRows =
    rows.map(x => [

      x.date,

      x.brand,

      x.product,

      x.imei || '-',

      x.customer || '-',

      x.quantity,

      money(
        Number(x.salePrice) *
        Number(x.quantity)
      ),

      money(x.profit),

      x.payment

    ]);


  doc.autoTable({

    startY: 50,

    head: [[

      'Date',
      'Brand',
      'Product',
      'IMEI',
      'Customer',
      'Qty',
      'Total Sale',
      'Profit',
      'Payment'

    ]],

    body: tableRows,

    theme: 'grid',

    styles: {

      fontSize: 8,

      cellPadding: 3

    },

    headStyles: {

      fontSize: 8,

      fontStyle: 'bold'

    }

  });


  /*
   * GRAND TOTAL
   */

  const finalY =
    doc.lastAutoTable.finalY + 10;


  doc.setFontSize(11);


  doc.text(
    `Grand Total Revenue: ${money(totalRevenue)}`,
    14,
    finalY
  );


  doc.text(
    `Grand Total Profit: ${money(totalProfit)}`,
    110,
    finalY
  );


  doc.text(
    `Total Products: ${totalQuantity}`,
    210,
    finalY
  );


  /*
   * DOWNLOAD
   */

  doc.save(
    `Daily_Sales_${monthName}_${year}.pdf`
  );

};


/* =========================
   SUPPLIERS
========================= */

function suppliers() {

  return `

    <div class="panel">

      <div class="panel-head">

        <h2>Suppliers</h2>

        <button
          class="btn"
          onclick="addSupplier()">
          + Add Supplier
        </button>

      </div>


      <div class="table-wrap">

        <table>

          <thead>

            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Address</th>
            </tr>

          </thead>


          <tbody>

            ${db.suppliers.map(s => `

              <tr>

                <td>
                  ${s.name}
                </td>

                <td>
                  ${s.phone}
                </td>

                <td>
                  ${s.email}
                </td>

                <td>
                  ${s.address}
                </td>

              </tr>

            `).join('')}

          </tbody>

        </table>

      </div>

    </div>

  `;
}


/* =========================
   REPORTS
========================= */

function reports() {

  const s = stats();


  return `

    <div class="cards">

      ${card(
        'Revenue',
        money(s.revenue),
        '💰'
      )}

      ${card(
        'Profit',
        money(s.profit),
        '📈'
      )}

      ${card(
        'Average Sale',
        money(
          s.sold
            ? s.revenue / s.sold
            : 0
        ),
        '🧮'
      )}

      ${card(
        'Inventory Value',
        money(
          db.devices
            .filter(
              d => d.status === 'IN_STOCK'
            )
            .reduce(
              (a, d) =>
                a + d.purchase,
              0
            )
        ),
        '📦'
      )}

    </div>


    <div class="panel">

      <h2>
        Store Summary
      </h2>

      <p>
        Total brands:
        <b>${db.brands.length}</b>
      </p>

      <p>
        Total models:
        <b>${db.models.length}</b>
      </p>

      <p>
        Total devices:
        <b>${db.devices.length}</b>
      </p>

      <p>
        Available devices:
        <b>${s.stock}</b>
      </p>

      <p>
        Sold devices:
        <b>${s.sold}</b>
      </p>

    </div>

  `;
}


/* =========================
   GLOBAL FUNCTIONS
========================= */

window.toggleMenu = () => {

  document
    .querySelector('.sidebar')
    ?.classList.toggle('open');

};


window.go = p => {

  page = p;

  render();


  if (p === 'add') {

    setTimeout(
      loadModels,
      0
    );

  }

};


window.logout = () => {

  if (
    confirm(
      'Log out of demo admin?'
    )
  ) {

    sessionStorage.removeItem(
      'logged'
    );

    location.reload();

  }

};


/* =========================
   INVENTORY FILTER
========================= */

window.filterInventory = () => {

  const q =
    document.getElementById(
      'search'
    ).value.toLowerCase();


  const st =
    document.getElementById(
      'statusFilter'
    ).value;


  const rows =
    db.devices.filter(d =>

      (!st || d.status === st) &&

      (
        `${d.imei1} ${d.imei2} ${deviceLabel(d)}`
      )
      .toLowerCase()
      .includes(q)

    );


  document.getElementById(
    'invTable'
  ).innerHTML =
    deviceTable(rows);

};


/* =========================
   ADD DEVICE
========================= */

window.addDevice = e => {

  e.preventDefault();


  const modelId =
    Number(
      document.getElementById(
        'modelId'
      ).value
    );


  db.devices.push({

    id: Date.now(),

    modelId,

    imei1:
      document.getElementById(
        'imei1'
      ).value,

    imei2:
      document.getElementById(
        'imei2'
      ).value,

    purchase:
      Number(
        document.getElementById(
          'purchase'
        ).value
      ),

    selling:
      Number(
        document.getElementById(
          'selling'
        ).value
      ),

    supplier:
      document.getElementById(
        'supplier'
      ).value,

    date:
      document.getElementById(
        'date'
      ).value,

    warranty:
      Number(
        document.getElementById(
          'warranty'
        ).value
      ),

    status:
      'IN_STOCK'

  });


  save(db);


  alert(
    'Mobile stock added successfully'
  );


  go('inventory');

};


/* =========================
   SELL DEVICE
========================= */

window.sell = id => {

  const d =
    db.devices.find(
      x => x.id === id
    );


  const customer =
    prompt(
      'Customer name (optional):',
      'Walk-in Customer'
    ) ||
    'Walk-in Customer';


  const payment =
    prompt(
      'Payment method:',
      'UPI'
    ) ||
    'UPI';


  const sale =
    Number(
      prompt(
        `Selling price (default ${d.selling}):`,
        d.selling
      )
    );


  if (!sale)
    return;


  d.status = 'SOLD';


  db.sales.push({

    id: Date.now(),

    deviceId: id,

    sale,

    customer,

    phone: '',

    payment,

    date:
      new Date()
        .toISOString()
        .slice(0, 10),

    profit:
      sale - d.purchase

  });


  save(db);

  render();

};


/* =========================
   REMOVE DEVICE
========================= */

window.removeDevice = id => {

  const d =
    db.devices.find(
      x => x.id === id
    );


  if (d.status === 'SOLD') {

    alert(
      'Sold devices cannot be removed from active inventory.'
    );

    return;
  }


  if (
    confirm(
      'Mark this device as REMOVED?'
    )
  ) {

    d.status = 'REMOVED';

    save(db);

    render();

  }

};


/* =========================
   ADD BRAND
========================= */

window.addBrand = () => {

  const name =
    prompt(
      'Brand name:'
    );


  if (!name)
    return;


  db.brands.push({

    id: Date.now(),

    name,

    status: 'Active'

  });


  save(db);

  render();

};


/* =========================
   TOGGLE BRAND
========================= */

window.toggleBrand = id => {

  const b =
    db.brands.find(
      x => x.id === id
    );


  b.status =
    b.status === 'Active'
      ? 'Inactive'
      : 'Active';


  save(db);

  render();

};


/* =========================
   ADD SUPPLIER
========================= */

window.addSupplier = () => {

  const name =
    prompt(
      'Supplier name:'
    );


  if (!name)
    return;


  const phone =
    prompt('Phone:') || '';


  const email =
    prompt('Email:') || '';


  const address =
    prompt('Address:') || '';


  db.suppliers.push({

    id: Date.now(),

    name,

    phone,

    email,

    address

  });


  save(db);

  render();

};


/* =========================
   SALES SEARCH
========================= */

window.searchSales = q => {

  q =
    q.toLowerCase();


  const rows =
    db.sales
      .slice()
      .reverse()
      .filter(x => {

        const d =
          db.devices.find(
            d => d.id === x.deviceId
          );


        return `

          ${x.customer}
          ${x.date}
          ${d?.imei1}
          ${deviceLabel(d)}

        `
        .toLowerCase()
        .includes(q);

      });


  document.getElementById(
    'salesTable'
  ).innerHTML =
    salesTable(rows);

};


/* =========================
   HTML ESCAPE
========================= */

function escapeHtml(value) {

  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

}


/* =========================
   LOGIN
========================= */

if (
  sessionStorage.getItem(
    'logged'
  ) === '1'
) {

  render();

}
else {

  app.innerHTML = `

    <div class="login">

      <div class="login-box">

        <h1>
          📱 MobileStore Admin
        </h1>

        <p>
          Owner inventory & sales management
        </p>


        <label>

          Email

          <input
            id="email"
            type="email"
            value="admin@mobilestore.local">

        </label>


        <label>

          Password

          <input
            id="password"
            type="password"
            value="admin123">

        </label>


        <button onclick="login()">
          Sign in
        </button>


        <div class="hint">

          Demo login:
          admin@mobilestore.local /
          admin123

        </div>

      </div>

    </div>

  `;

}


window.login = () => {

  const email =
    document.getElementById(
      'email'
    ).value;


  const password =
    document.getElementById(
      'password'
    ).value;


  if (
    email ===
      'admin@mobilestore.local'
    &&
    password ===
      'admin123'
  ) {

    sessionStorage.setItem(
      'logged',
      '1'
    );


    render();

  }
  else {

    alert(
      'Invalid demo credentials'
    );

  }

};
