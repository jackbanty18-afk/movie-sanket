-- Supabase Postgres schema generated to match current SQLite structures
-- Note: timestamps kept as TEXT for painless import; can be migrated to timestamptz later

create schema if not exists public;
set search_path to public;

-- Roles and Users
create table if not exists roles (
  id serial primary key,
  name text not null unique
);

create table if not exists users (
  id text primary key,
  email text not null unique,
  "fullName" text not null,
  "passwordHash" text not null,
  "passwordSalt" text not null,
  status text not null default 'active',
  "bannedAt" text,
  "bannedReason" text,
  "lastLoginAt" text,
  "lastLoginAt_old" text, -- compatibility if present in CSV
  "login_count" integer,
  "last_active_at" text,
  "lastLoginAtNew" text, -- compatibility
  "lastLoginAtNEW" text, -- compatibility
  "lastLoginAtV2" text, -- compatibility
  "lastLoginAtV3" text, -- compatibility
  "lastLoginAtV4" text, -- compatibility
  "createdAt" text not null,
  "updatedAt" text not null
);

create table if not exists user_roles (
  "userId" text not null references users(id) on delete cascade,
  "roleId" integer not null references roles(id) on delete cascade,
  unique ("userId","roleId")
);

-- Categories / Movies
create table if not exists categories (
  id serial primary key,
  name text not null unique
);

create table if not exists movies (
  id text primary key,
  title text not null,
  synopsis text,
  poster text,
  backdrop text,
  year integer,
  rating real,
  "durationMins" integer,
  "releaseDate" text,
  languages text,
  formats text,
  published integer default 0,
  "createdAt" text not null,
  "updatedAt" text not null
);

create table if not exists movie_categories (
  "movieId" text not null references movies(id) on delete cascade,
  "categoryId" integer not null references categories(id) on delete cascade,
  unique ("movieId","categoryId")
);

-- Theatres / Shows / Pricing
create table if not exists theatres (
  id text primary key,
  name text not null,
  city text,
  address text,
  "createdAt" text not null
);

create table if not exists pricing_tiers (
  id serial primary key,
  name text not null unique,
  description text,
  "baseMultiplier" real not null default 1.0,
  "weekendMultiplier" real not null default 1.2,
  "holidayMultiplier" real not null default 1.5,
  "createdAt" text not null
);

create table if not exists theatre_pricing (
  "theatreId" text not null references theatres(id) on delete cascade,
  "pricingTierId" integer not null references pricing_tiers(id) on delete cascade,
  "normalPrice" integer not null,
  "executivePrice" integer not null,
  "premiumPrice" integer not null,
  "vipPrice" integer not null,
  primary key ("theatreId","pricingTierId")
);

create table if not exists seat_templates (
  id serial primary key,
  "theatreId" text not null unique references theatres(id) on delete cascade,
  name text not null,
  layout text not null,
  "totalSeats" integer not null,
  "normalSeats" integer not null default 0,
  "executiveSeats" integer not null default 0,
  "premiumSeats" integer not null default 0,
  "vipSeats" integer not null default 0,
  "createdAt" text not null,
  "updatedAt" text not null
);

create table if not exists theatre_schedules (
  id serial primary key,
  "theatreId" text not null references theatres(id) on delete cascade,
  "dayOfWeek" integer not null,
  "availableSlots" text not null,
  "operatingHours" text not null,
  "createdAt" text not null,
  unique ("theatreId","dayOfWeek")
);

create table if not exists shows (
  id text primary key,
  "movieId" text not null references movies(id) on delete cascade,
  "theatreId" text not null references theatres(id) on delete cascade,
  "dateKey" text not null,
  time text not null,
  format text,
  language text,
  prices text not null,
  published integer not null default 1,
  "createdAt" text not null,
  "updatedAt" text not null
);

-- Profiles / Tickets
create table if not exists profiles (
  id text primary key,
  "fullName" text not null,
  email text not null unique,
  phone text,
  dob text,
  country text,
  "createdAt" text not null
);

create table if not exists tickets (
  "ticketId" text primary key,
  "userEmail" text,
  "userId" text,
  "movieId" text,
  "movieTitle" text,
  "theatreId" text,
  "theatreName" text,
  "dateKey" text,
  time text,
  seats text,
  "seatCount" integer default 0,
  "originalTotal" integer,
  total integer,
  status text not null default 'confirmed',
  "paymentMethod" text,
  "refundAmount" integer default 0,
  "refundedAt" text,
  "cancelledAt" text,
  "cancellationReason" text,
  "purchasedAt" text,
  "updatedAt" text
);

-- Notifications
create table if not exists notifications (
  id text primary key,
  "userEmail" text not null,
  title text not null,
  message text not null,
  "createdAt" text not null,
  read integer not null default 0
);

create table if not exists notification_templates (
  id text primary key,
  name text not null,
  subject text not null,
  content text not null,
  type text not null default 'general',
  variables text default '[]',
  "isActive" integer not null default 1,
  "createdBy" text,
  "createdAt" text not null,
  "updatedAt" text not null
);

create table if not exists notification_campaigns (
  id text primary key,
  name text not null,
  "templateId" text not null references notification_templates(id) on delete cascade,
  "userSegment" text not null,
  "scheduledAt" text,
  "sentAt" text,
  status text not null default 'draft',
  "recipientCount" integer default 0,
  "sentCount" integer default 0,
  "createdBy" text,
  "createdAt" text not null,
  "updatedAt" text not null
);

-- Logging tables
create table if not exists access_logs (
  id text primary key,
  request_id text not null unique,
  method text not null,
  path text not null,
  status_code integer,
  user_email text,
  user_id text,
  ip_address text,
  user_agent text,
  duration_ms integer,
  request_size integer,
  response_size integer,
  timestamp text not null,
  created_at text default now()
);

create table if not exists app_logs (
  id text primary key,
  request_id text,
  level text not null,
  category text not null,
  message text not null,
  metadata text,
  user_email text,
  user_id text,
  timestamp text not null,
  created_at text default now()
);

create table if not exists audit_trails (
  id text primary key,
  request_id text,
  action text not null,
  resource_type text not null,
  resource_id text,
  old_values text,
  new_values text,
  user_email text not null,
  user_id text not null,
  ip_address text,
  timestamp text not null,
  created_at text default now()
);

-- Indexes
create index if not exists idx_access_logs_timestamp on access_logs(timestamp);
create index if not exists idx_access_logs_user on access_logs(user_email);
create index if not exists idx_access_logs_status on access_logs(status_code);
create index if not exists idx_access_logs_request_id on access_logs(request_id);

create index if not exists idx_app_logs_timestamp on app_logs(timestamp);
create index if not exists idx_app_logs_level on app_logs(level);
create index if not exists idx_app_logs_category on app_logs(category);
create index if not exists idx_app_logs_request_id on app_logs(request_id);

create index if not exists idx_audit_trails_timestamp on audit_trails(timestamp);
create index if not exists idx_audit_trails_user on audit_trails(user_email);
create index if not exists idx_audit_trails_action on audit_trails(action);
create index if not exists idx_audit_trails_resource on audit_trails(resource_type, resource_id);
