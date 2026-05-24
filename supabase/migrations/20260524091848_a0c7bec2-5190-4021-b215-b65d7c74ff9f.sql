
-- Roles enum
create type public.app_role as enum ('admin', 'customer');

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome varchar(255),
  email varchar(255),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.profiles enable row level security;

-- User roles (separate table for security)
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  created_at timestamptz default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

-- Security definer function for role checks
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

-- Configurações Gerais
create table public.configuracoes_gerais (
  id uuid primary key default gen_random_uuid(),
  chave varchar(100) unique not null,
  valor text,
  descricao varchar(255),
  updated_at timestamptz default now()
);
alter table public.configuracoes_gerais enable row level security;

-- Categorias
create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  nome varchar(100) not null,
  slug varchar(100) unique not null,
  descricao text,
  icone varchar(50),
  ordem smallint default 0,
  ativo boolean default true,
  created_at timestamptz default now()
);
alter table public.categorias enable row level security;

-- Produtos
create table public.produtos (
  id uuid primary key default gen_random_uuid(),
  nome varchar(255) not null,
  slug varchar(255) unique not null,
  descricao text,
  descricao_curta varchar(500),
  categoria_id uuid references public.categorias(id),
  volume varchar(50),
  notas_olfativas text[],
  intensidade smallint check (intensidade between 1 and 5),
  sensacao_transmitida varchar(255),
  modo_de_uso text,
  composicao text,
  durabilidade_media varchar(100),
  preco_varejo decimal(10,2) not null,
  preco_assinatura decimal(10,2),
  preco_b2b_1 decimal(10,2),
  preco_b2b_2 decimal(10,2),
  preco_b2b_3 decimal(10,2),
  disponivel_varejo boolean default true,
  disponivel_assinatura boolean default true,
  disponivel_b2b boolean default true,
  estoque integer default 0,
  destaque boolean default false,
  lancamento boolean default false,
  mais_vendido boolean default false,
  ativo boolean default true,
  imagens text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.produtos enable row level security;

-- Kits
create table public.kits (
  id uuid primary key default gen_random_uuid(),
  nome varchar(255) not null,
  slug varchar(255) unique not null,
  descricao text,
  descricao_curta varchar(500),
  imagens text[],
  preco_original decimal(10,2) not null,
  preco_varejo decimal(10,2) not null,
  preco_assinatura decimal(10,2),
  preco_b2b_1 decimal(10,2),
  preco_b2b_2 decimal(10,2),
  preco_b2b_3 decimal(10,2),
  percentual_economia decimal(5,2),
  disponivel_assinatura boolean default true,
  disponivel_b2b boolean default true,
  destaque boolean default false,
  ativo boolean default true,
  created_at timestamptz default now()
);
alter table public.kits enable row level security;

-- Leads (newsletter)
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  nome varchar(255),
  email varchar(255),
  whatsapp varchar(20),
  interesse varchar(100),
  origem varchar(100),
  created_at timestamptz default now()
);
alter table public.leads enable row level security;

-- Profile auto-creation trigger
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', new.email), new.email);
  insert into public.user_roles (user_id, role) values (new.id, 'customer');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger trg_produtos_updated before update on public.produtos
  for each row execute function public.set_updated_at();
create trigger trg_config_updated before update on public.configuracoes_gerais
  for each row execute function public.set_updated_at();

-- ========== RLS POLICIES ==========

-- profiles: own + admin
create policy "Users view own profile" on public.profiles
  for select using (auth.uid() = id or public.has_role(auth.uid(), 'admin'));
create policy "Users update own profile" on public.profiles
  for update using (auth.uid() = id);
create policy "Admins manage profiles" on public.profiles
  for all using (public.has_role(auth.uid(), 'admin'));

-- user_roles: read own, admin manages
create policy "Users view own roles" on public.user_roles
  for select using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));
create policy "Admins manage roles" on public.user_roles
  for all using (public.has_role(auth.uid(), 'admin'));

-- configuracoes_gerais: public read, admin write
create policy "Anyone reads config" on public.configuracoes_gerais
  for select using (true);
create policy "Admins manage config" on public.configuracoes_gerais
  for all using (public.has_role(auth.uid(), 'admin'));

-- categorias: public read active, admin all
create policy "Anyone reads active categorias" on public.categorias
  for select using (ativo = true or public.has_role(auth.uid(), 'admin'));
create policy "Admins manage categorias" on public.categorias
  for all using (public.has_role(auth.uid(), 'admin'));

-- produtos
create policy "Anyone reads active produtos" on public.produtos
  for select using (ativo = true or public.has_role(auth.uid(), 'admin'));
create policy "Admins manage produtos" on public.produtos
  for all using (public.has_role(auth.uid(), 'admin'));

-- kits
create policy "Anyone reads active kits" on public.kits
  for select using (ativo = true or public.has_role(auth.uid(), 'admin'));
create policy "Admins manage kits" on public.kits
  for all using (public.has_role(auth.uid(), 'admin'));

-- leads: anyone insert, admin read
create policy "Anyone submits lead" on public.leads
  for insert with check (true);
create policy "Admins read leads" on public.leads
  for select using (public.has_role(auth.uid(), 'admin'));
