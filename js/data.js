import { supabase, isCloudConfigured } from './supabase.js';

const KEY = 'mobile_store_cloud_cache_v1';
const STORE_KEY = 'mobile_store_active_store_v1';

const seed = {
  brands: [
    { id: 1, name: 'Samsung', status: 'Active' },
    { id: 2, name: 'Apple', status: 'Active' },
    { id: 3, name: 'OnePlus', status: 'Active' },
    { id: 4, name: 'Xiaomi', status: 'Active' },
    { id: 5, name: 'Vivo', status: 'Active' },
    { id: 6, name: 'OPPO', status: 'Active' }
  ],
  models: [
    { id: 1, brandId: 1, name: 'Galaxy A55', ram: '8 GB', storage: '128 GB', color: 'Awesome Navy' },
    { id: 2, brandId: 2, name: 'iPhone 15', ram: '6 GB', storage: '128 GB', color: 'Black' },
    { id: 3, brandId: 3, name: 'OnePlus 13', ram: '12 GB', storage: '256 GB', color: 'Black' },
    { id: 4, brandId: 5, name: 'V30', ram: '8 GB', storage: '128 GB', color: 'Green' }
  ],
  devices: [
    { id: 1, modelId: 1, quantity: 1, imei1: '356000000000001', imei2: '356000000000002', purchase: 28000, selling: 32000, supplier: 'ABC Distributors', date: '2026-09-01', warranty: 12, status: 'IN_STOCK' },
    { id: 2, modelId: 1, quantity: 1, imei1: '356000000000003', imei2: '356000000000004', purchase: 28000, selling: 32000, supplier: 'ABC Distributors', date: '2026-09-02', warranty: 12, status: 'SOLD' },
    { id: 3, modelId: 2, quantity: 1, imei1: '356000000000005', imei2: '356000000000006', purchase: 58000, selling: 65000, supplier: 'Apple Distributor', date: '2026-09-03', warranty: 12, status: 'IN_STOCK' },
    { id: 4, modelId: 4, quantity: 1, imei1: '356000000000007', imei2: '356000000000008', purchase: 25000, selling: 29000, supplier: 'Vivo Distributor', date: '2026-09-04', warranty: 12, status: 'IN_STOCK' }
  ],
  sales: [
    { id: 1, deviceId: 2, sale: 32000, customer: 'Walk-in Customer', phone: '', payment: 'UPI', date: '2026-09-08', profit: 4000 }
  ],
  dailySales: [],
  folderStock: [
    { id: 1, name: 'A4 Document Folder', type: 'Plastic', quantity: 25, purchase: 35, selling: 50, supplier: 'ABC Distributors', date: '2026-09-05', status: 'IN_STOCK' },
    { id: 2, name: 'Mobile Bill Folder', type: 'File Folder', quantity: 15, purchase: 20, selling: 30, supplier: 'ABC Distributors', date: '2026-09-06', status: 'IN_STOCK' }
  ],
  suppliers: [
    { id: 1, name: 'ABC Distributors', phone: '9876543210', email: 'abc@example.com', address: 'Guwahati' },
    { id: 2, name: 'Apple Distributor', phone: '9876500000', email: 'sales@example.com', address: 'Guwahati' }
  ]
};

let storeId = localStorage.getItem(STORE_KEY) || null;

const emptyDb = () => ({
  brands: [], models: [], devices: [], sales: [], dailySales: [], folderStock: [], suppliers: []
});

export function load() {
  try {
    const cached = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (cached) return cached;
  } catch (_) {}

  return structuredClone(seed);
}

function cache(db) {
  localStorage.setItem(KEY, JSON.stringify(db));
}

async function getOrCreateStore() {
  if (!supabase) return null;

  const { data, error } = await supabase.rpc('get_or_create_my_store', {
    p_name: 'My Mobile Store'
  });

  if (error) throw error;
  storeId = data;
  localStorage.setItem(STORE_KEY, storeId);
  return storeId;
}

async function selectAll(table) {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('store_id', storeId);

  if (error) throw error;
  return data || [];
}

// Create the initial master data for a brand-new store.
// This is intentionally done only when the store has no brands AND no models,
// so existing production data is never overwritten or duplicated.
async function ensureDefaultMasterData() {
  const existingBrands = await selectAll('brands');
  const existingModels = await selectAll('models');

  if (existingBrands.length || existingModels.length) {
    return;
  }

  const defaultBrands = seed.brands.map(x => ({
    id: x.id,
    store_id: storeId,
    name: x.name,
    status: x.status
  }));

  const { error: brandError } = await supabase
    .from('brands')
    .insert(defaultBrands);

  if (brandError) throw brandError;

  const defaultModels = seed.models.map(x => ({
    id: x.id,
    store_id: storeId,
    brand_id: x.brandId,
    name: x.name,
    ram: x.ram || '',
    storage: x.storage || '',
    color: x.color || ''
  }));

  const { error: modelError } = await supabase
    .from('models')
    .insert(defaultModels);

  if (modelError) throw modelError;
}

export async function initDatabase() {
  if (!isCloudConfigured()) {
    return load();
  }

  await getOrCreateStore();

  // A new Supabase store starts empty. Add the default brands/models once so
  // the Add Mobile Stock dropdowns are immediately usable.
  await ensureDefaultMasterData();

  const [brands, models, devices, sales, dailySales, folderStock, suppliers] = await Promise.all([
    selectAll('brands'),
    selectAll('models'),
    selectAll('mobile_stock'),
    selectAll('mobile_sales'),
    selectAll('daily_sales'),
    selectAll('folder_stock'),
    selectAll('suppliers')
  ]);

  const db = {
    brands: brands.map(x => ({ id:x.id, name:x.name, status:x.status })),
    models: models.map(x => ({ id:x.id, brandId:x.brand_id, name:x.name, ram:x.ram || '', storage:x.storage || '', color:x.color || '' })),
    devices: devices.map(x => ({ id:x.id, modelId:x.model_id, quantity:Number(x.quantity || 1), imei1:x.imei1 || '', imei2:x.imei2 || '', purchase:Number(x.purchase || 0), selling:Number(x.selling || 0), supplier:x.supplier || '', date:x.date, warranty:Number(x.warranty || 0), status:x.status })),
    sales: sales.map(x => ({ id:x.id, deviceId:x.device_id, sale:Number(x.sale || 0), customer:x.customer || '', phone:x.phone || '', payment:x.payment || '', date:x.date, profit:Number(x.profit || 0) })),
    dailySales: dailySales.map(x => ({ id:x.id, date:x.date, brand:x.brand || '', product:x.product || '', imei:x.imei || '', customer:x.customer || '', quantity:Number(x.quantity || 0), purchase:Number(x.purchase || 0), salePrice:Number(x.sale_price || 0), payment:x.payment || '', profit:Number(x.profit || 0), notes:x.notes || '' })),
    folderStock: folderStock.map(x => ({ id:x.id, name:x.name, type:x.type || '', quantity:Number(x.quantity || 0), purchase:Number(x.purchase || 0), selling:Number(x.selling || 0), supplier:x.supplier || '', date:x.date, status:x.status })),
    suppliers: suppliers.map(x => ({ id:x.id, name:x.name, phone:x.phone || '', email:x.email || '', address:x.address || '' }))
  };

  cache(db);
  return db;
}

async function clearTable(table) {
  const { error } = await supabase.from(table).delete().eq('store_id', storeId);
  if (error) throw error;
}

async function insertRows(table, rows) {
  if (!rows.length) return;
  const { error } = await supabase.from(table).insert(rows);
  if (error) throw error;
}

export async function save(db) {
  cache(db);

  if (!isCloudConfigured() || !supabase) return;
  if (!storeId) await getOrCreateStore();

  // Clear children first because the schema uses foreign keys.
  for (const table of ['mobile_sales','mobile_stock','models','brands','folder_stock','daily_sales','suppliers']) {
    await clearTable(table);
  }

  // Insert parents before children.
  await insertRows('brands', db.brands.map(x => ({
    id:x.id, store_id:storeId, name:x.name, status:x.status
  })));

  await insertRows('models', db.models.map(x => ({
    id:x.id, store_id:storeId, brand_id:x.brandId, name:x.name, ram:x.ram || '',
    storage:x.storage || '', color:x.color || ''
  })));

  await insertRows('mobile_stock', db.devices.map(x => ({
    id:x.id, store_id:storeId, model_id:x.modelId, quantity:Number(x.quantity || 1),
    imei1:x.imei1 || '', imei2:x.imei2 || '',
    purchase:Number(x.purchase || 0), selling:Number(x.selling || 0), supplier:x.supplier || '',
    date:x.date, warranty:Number(x.warranty || 0), status:x.status
  })));

  await insertRows('mobile_sales', db.sales.map(x => ({
    id:x.id, store_id:storeId, device_id:x.deviceId, sale:Number(x.sale || 0),
    customer:x.customer || '', phone:x.phone || '', payment:x.payment || '', date:x.date,
    profit:Number(x.profit || 0)
  })));

  await insertRows('folder_stock', db.folderStock.map(x => ({
    id:x.id, store_id:storeId, name:x.name, type:x.type || '', quantity:Number(x.quantity || 0),
    purchase:Number(x.purchase || 0), selling:Number(x.selling || 0), supplier:x.supplier || '',
    date:x.date, status:x.status
  })));

  await insertRows('daily_sales', db.dailySales.map(x => ({
    id:x.id, store_id:storeId, date:x.date, brand:x.brand || '', product:x.product || '',
    imei:x.imei || '', customer:x.customer || '', quantity:Number(x.quantity || 0),
    purchase:Number(x.purchase || 0), sale_price:Number(x.salePrice || 0), payment:x.payment || '',
    profit:Number(x.profit || 0), notes:x.notes || ''
  })));

  await insertRows('suppliers', db.suppliers.map(x => ({
    id:x.id, store_id:storeId, name:x.name, phone:x.phone || '', email:x.email || '', address:x.address || ''
  })));
}


export async function addModelToBrand({ brandId, name, ram = '', storage = '', color = '' }) {
  if (!isCloudConfigured() || !supabase) {
    const nextId = dbNextId(load().models);
    return { id: nextId, brandId, name, ram, storage, color };
  }

  if (!storeId) await getOrCreateStore();

  const { data: existing, error: maxError } = await supabase
    .from('models')
    .select('id')
    .eq('store_id', storeId);

  if (maxError) throw maxError;

  // Always use the first available sequential ID: 1, 2, 3, 4, ...
  // This prevents old timestamp IDs from causing new IDs such as 178940....
  const usedIds = new Set(
    (existing || [])
      .map(row => Number(row.id))
      .filter(Number.isFinite)
  );

  let nextId = 1;
  while (usedIds.has(nextId)) nextId++;

  const { data, error } = await supabase
    .from('models')
    .insert({
      id: nextId,
      store_id: storeId,
      brand_id: Number(brandId),
      name: name.trim(),
      ram: ram.trim(),
      storage: storage.trim(),
      color: color.trim()
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    brandId: data.brand_id,
    name: data.name,
    ram: data.ram || '',
    storage: data.storage || '',
    color: data.color || ''
  };
}

function dbNextId(rows) {
  return rows.reduce((max, row) => Math.max(max, Number(row.id) || 0), 0) + 1;
}

export async function deleteMobileStock(id) {
  const { storeId } = await getStoreContext();

  const { error } = await supabase
    .from('mobile_stock')
    .delete()
    .eq('store_id', storeId)
    .eq('id', id);

  if (error) {
    throw error;
  }

  return true;
}

export async function reset() {
  localStorage.removeItem(KEY);
  localStorage.removeItem(STORE_KEY);
  if (isCloudConfigured()) {
    // The production app intentionally does not expose a destructive "wipe database" action.
    // Delete/reset is available through Supabase SQL or the dashboard.
    location.reload();
    return;
  }
  location.reload();
}

export { seed };
