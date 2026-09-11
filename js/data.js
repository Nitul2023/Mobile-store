const KEY = 'mobile_store_demo_v1';

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
    {
      id: 1,
      brandId: 1,
      name: 'Galaxy A55',
      ram: '8 GB',
      storage: '128 GB',
      color: 'Awesome Navy'
    },
    {
      id: 2,
      brandId: 2,
      name: 'iPhone 15',
      ram: '6 GB',
      storage: '128 GB',
      color: 'Black'
    },
    {
      id: 3,
      brandId: 3,
      name: 'OnePlus 13',
      ram: '12 GB',
      storage: '256 GB',
      color: 'Black'
    },
    {
      id: 4,
      brandId: 5,
      name: 'V30',
      ram: '8 GB',
      storage: '128 GB',
      color: 'Green'
    }
  ],

  devices: [
    {
      id: 1,
      modelId: 1,
      imei1: '356000000000001',
      imei2: '356000000000002',
      purchase: 28000,
      selling: 32000,
      supplier: 'ABC Distributors',
      date: '2026-09-01',
      warranty: 12,
      status: 'IN_STOCK'
    },
    {
      id: 2,
      modelId: 1,
      imei1: '356000000000003',
      imei2: '356000000000004',
      purchase: 28000,
      selling: 32000,
      supplier: 'ABC Distributors',
      date: '2026-09-02',
      warranty: 12,
      status: 'SOLD'
    },
    {
      id: 3,
      modelId: 2,
      imei1: '356000000000005',
      imei2: '356000000000006',
      purchase: 58000,
      selling: 65000,
      supplier: 'Apple Distributor',
      date: '2026-09-03',
      warranty: 12,
      status: 'IN_STOCK'
    },
    {
      id: 4,
      modelId: 4,
      imei1: '356000000000007',
      imei2: '356000000000008',
      purchase: 25000,
      selling: 29000,
      supplier: 'Vivo Distributor',
      date: '2026-09-04',
      warranty: 12,
      status: 'IN_STOCK'
    }
  ],

  sales: [
    {
      id: 1,
      deviceId: 2,
      sale: 32000,
      customer: 'Walk-in Customer',
      phone: '',
      payment: 'UPI',
      date: '2026-09-08',
      profit: 4000
    }
  ],

  /*
   * NEW
   * Manually entered daily sales
   */
  dailySales: [],

  suppliers: [
    {
      id: 1,
      name: 'ABC Distributors',
      phone: '9876543210',
      email: 'abc@example.com',
      address: 'Guwahati'
    },
    {
      id: 2,
      name: 'Apple Distributor',
      phone: '9876500000',
      email: 'sales@example.com',
      address: 'Guwahati'
    }
  ]
};


export function load() {

  let x = localStorage.getItem(KEY);

  if (!x) {

    localStorage.setItem(
      KEY,
      JSON.stringify(seed)
    );

    return structuredClone(seed);
  }

  const data = JSON.parse(x);

  /*
   * Important:
   * If old localStorage doesn't have dailySales,
   * create it automatically.
   */
  if (!data.dailySales) {
    data.dailySales = [];
  }

  return data;
}


export function save(d) {

  localStorage.setItem(
    KEY,
    JSON.stringify(d)
  );
}


export function reset() {

  localStorage.removeItem(KEY);

  location.reload();
}
