-- T-03: Supabase Schema for Nova Cart
-- Covers Stores, Inventory, Orders, and Metrics
-- RLS (Row Level Security) enabled.

create table if not exists stores (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    region text not null,
    status text not null, -- 'active', 'churned'
    created_at timestamptz default now()
);

create table if not exists items (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    category text not null,
    base_price numeric(10, 2) not null
);

create table if not exists inventory (
    store_id uuid references stores(id) on delete cascade,
    item_id uuid references items(id) on delete cascade,
    is_available boolean default true,
    last_confirmed_at timestamptz default now(),
    primary key (store_id, item_id)
);

create table if not exists orders (
    id uuid primary key default gen_random_uuid(),
    store_id uuid references stores(id) on delete cascade,
    status text not null, -- 'delivered', 'cancelled'
    cancellation_reason text, -- 'unavailable', 'store_rejected', 'customer_delay', 'partner_unavailable', 'other'
    gmv numeric(10, 2) not null,
    created_at timestamptz default now(),
    delivered_at timestamptz
);

-- Row Level Security
alter table stores enable row level security;
alter table inventory enable row level security;
alter table orders enable row level security;

-- Policies for Executive (read all)
create policy "Executives can read all stores" on stores for select using (true);
create policy "Executives can read all inventory" on inventory for select using (true);
create policy "Executives can read all orders" on orders for select using (true);

-- Policies for Store Owners (read their own)
-- Assuming auth.uid() maps to a store_owner record in a real system.
-- For demo, we leave these as examples.
create policy "Store owners read their own inventory" on inventory for select using (true);
create policy "Store owners update their own inventory" on inventory for update using (true);
