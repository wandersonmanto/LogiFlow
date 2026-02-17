-- Habilita extensão de UUID
create extension if not exists "uuid-ossp";

-- 1. Tabelas Auxiliares (Frota e Produtos)
create table if not exists drivers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  cnh text,
  category text,
  expiration_date text,
  phone text,
  status text default 'Disponível',
  created_at timestamp with time zone default now()
);

create table if not exists vehicles (
  id uuid primary key default uuid_generate_v4(),
  model text not null,
  plate text not null,
  type text,
  capacity text,
  status text default 'Disponível',
  created_at timestamp with time zone default now()
);

create table if not exists products (
  id uuid primary key default uuid_generate_v4(),
  sku text not null,
  description text not null,
  assembly_value numeric default 0,
  created_at timestamp with time zone default now()
);

-- 2. Tabela Principal de Pedidos
create table if not exists orders (
  id uuid primary key default uuid_generate_v4(),
  order_number text not null unique,
  customer_name text not null,
  customer_location text,
  neighborhood text,
  date text, -- YYYY-MM-DD
  status text, -- Enum OrderStatus
  logistics_status text, -- Enum LogisticsStatus
  type text, -- Enum OrderType
  delivery_type text, -- Enum DeliveryType
  
  -- Campos de Entrega
  is_future_delivery boolean default false,
  future_delivery_date text,
  delivery_date text,
  delivery_observation text,
  
  -- Campos de Montagem
  has_assembly boolean default false,
  assembly_date text,
  assembly_status text,
  assembler text,
  assembly_bonus numeric default 0,
  assembly_bonus_description text,
  
  -- Campos Financeiros/Dados extras (Rascunho/Importação)
  salesperson text,
  cpf text,
  phone text,
  phone_optional text,
  invoice_number text,
  coupon_number text,
  
  -- Endereço complexo salvo como JSONB
  address_data jsonb, 
  
  -- Relacionamentos Logísticos (IDs textuais ou UUIDs dependendo de como você gerenciar, aqui assumindo UUID)
  driver_id uuid references drivers(id),
  driver_name text, -- Cache para facilitar leitura
  vehicle_id uuid references vehicles(id),
  vehicle_plate text, -- Cache para facilitar leitura

  created_at timestamp with time zone default now()
);

-- 3. Itens do Pedido
create table if not exists order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid references orders(id) on delete cascade,
  sku text,
  description text,
  assembly_value numeric,
  quantity integer,
  to_deliver boolean default true,
  to_assemble boolean default false
);

-- 4. Histórico de Entregas
create table if not exists delivery_history (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid references orders(id) on delete cascade,
  timestamp text,
  status text,
  driver_name text,
  vehicle_plate text,
  observation text,
  created_at timestamp with time zone default now()
);

-- --- POLICIES (PERMISSÕES DE ACESSO) ---
-- Habilita RLS nas tabelas
alter table drivers enable row level security;
alter table vehicles enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table delivery_history enable row level security;

-- Cria políticas públicas (Permite SELECT, INSERT, UPDATE, DELETE para todos - Útil para dev/protótipo)
-- Em produção, substitua "anon" por regras baseadas em "auth.uid()"

-- Drivers
create policy "Public Access Drivers" on drivers for all using (true) with check (true);

-- Vehicles
create policy "Public Access Vehicles" on vehicles for all using (true) with check (true);

-- Products
create policy "Public Access Products" on products for all using (true) with check (true);

-- Orders
create policy "Public Access Orders" on orders for all using (true) with check (true);

-- Order Items
create policy "Public Access OrderItems" on order_items for all using (true) with check (true);

-- History
create policy "Public Access History" on delivery_history for all using (true) with check (true);


-- Seed Data (Opcional - só roda se a tabela estiver vazia para não duplicar em testes)
insert into drivers (name, status)
select 'Motorista Teste', 'Disponível'
where not exists (select 1 from drivers limit 1);

insert into vehicles (model, plate, type)
select 'Fiat Fiorino', 'TST-1234', 'Van'
where not exists (select 1 from vehicles limit 1);

insert into products (sku, description, assembly_value)
select 'MOV-001', 'Cadeira de Escritório', 25.00
where not exists (select 1 from products limit 1);
