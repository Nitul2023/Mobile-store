-- PostgreSQL schema for MobileStore Admin
create table if not exists brands (
  id bigserial primary key,
  name varchar(100) not null unique,
  status varchar(20) not null default 'Active',
  created_at timestamptz not null default now()
);

create table if not exists mobile_models (
  id bigserial primary key,
  brand_id bigint not null references brands(id),
  model_name varchar(150) not null,
  ram varchar(30),
  storage varchar(30),
  color varchar(50),
  created_at timestamptz not null default now(),
  unique(brand_id, model_name, ram, storage, color)
);

create table if not exists suppliers (
  id bigserial primary key,
  name varchar(150) not null,
  phone varchar(30),
  email varchar(150),
  address text,
  created_at timestamptz not null default now()
);

create table if not exists mobile_devices (
  id bigserial primary key,
  model_id bigint not null references mobile_models(id),
  imei1 varchar(20) not null unique,
  imei2 varchar(20) unique,
  purchase_price numeric(12,2) not null check (purchase_price >= 0),
  selling_price numeric(12,2) not null check (selling_price >= 0),
  supplier_id bigint references suppliers(id),
  purchase_date date not null,
  warranty_months integer default 12,
  status varchar(20) not null default 'IN_STOCK'
    check (status in ('IN_STOCK','SOLD','DAMAGED','RETURNED','REMOVED')),
  created_at timestamptz not null default now()
);

create table if not exists sales (
  id bigserial primary key,
  device_id bigint not null unique references mobile_devices(id),
  sale_price numeric(12,2) not null check (sale_price >= 0),
  customer_name varchar(150),
  customer_phone varchar(30),
  payment_method varchar(30) not null,
  sale_date date not null default current_date,
  profit numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists stock_transactions (
  id bigserial primary key,
  device_id bigint references mobile_devices(id),
  supplier_id bigint references suppliers(id),
  transaction_type varchar(30) not null,
  quantity integer not null default 1,
  transaction_date timestamptz not null default now()
);

create index if not exists idx_device_status on mobile_devices(status);
create index if not exists idx_device_model on mobile_devices(model_id);
create index if not exists idx_sales_date on sales(sale_date);
