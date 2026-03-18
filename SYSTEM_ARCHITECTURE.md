# Beauty Booking SaaS System Architecture

**Version:** 1.0
**Last Updated:** 2026-03-18
**Platform:** Multi-tenant beauty salon booking platform

---

## 1. System Overview

### 1.1 Platform Architecture Tiers

The Beauty Booking platform consists of three primary applications serving different user personas:

| Tier | Application | Purpose | Access Level |
|------|-------------|---------|--------------|
| **Platform Admin** | 总控后台 (Platform Dashboard) | Manage all merchants, accounts, customers, and platform settings | Cross-tenant admin |
| **Merchant Admin** | 商家后台 (Salon Dashboard) | Manage single salon operations, staff, services, bookings | Salon-scoped access |
| **Customer Web** | Public booking interface | Browse salons, view services, book appointments | Public internet |

### 1.2 Data Hierarchy

```
Customer (platform level)
  └─ Account (customer-owned, can have multiple)
      └─ Salon (account-owned, can have multiple)
          ├─ Staff members
          ├─ Service categories
          │   └─ Services
          │       └─ Service addons
          ├─ Business hours
          ├─ Special hours
          ├─ Appointments
          │   └─ Clients (salon-specific)
          │       └─ Appointment services
          ├─ Gift cards
          └─ Website configuration
```

### 1.3 Key Concepts

- **Customer**: Platform-level entity created by PLATFORM_ADMIN. Represents a business customer (e.g., a salon owner company).
- **Account**: Login account tied to a Customer. Each Account can own multiple Salons.
- **Salon**: A single beauty salon location. This is the primary multi-tenant isolation boundary.
- **Tenant Isolation**: All business data is keyed by `salon_id`. Cross-salon data access is strictly forbidden at the application level.

---

## 2. Architecture Diagram

### 2.1 System Layers

```
┌─────────────────────────────────────────────────────────────────┐
│  BROWSER LAYER                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │ Platform Admin   │  │ Merchant Admin   │  │ Customer Web │  │
│  │ (React SPA)      │  │ (React SPA)      │  │ (React SPA)  │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓ HTTPS
┌─────────────────────────────────────────────────────────────────┐
│  API GATEWAY LAYER                                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ NestJS API Server (api.example.com)                      │  │
│  │ ├─ JWT Authentication                                   │  │
│  │ ├─ Tenant Guard (salon_id isolation)                    │  │
│  │ ├─ Role-based access control (RBAC)                     │  │
│  │ └─ Request/Response transformation                      │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
           ↓ SQL Queries (Parameterized)
┌─────────────────────────────────────────────────────────────────┐
│  BACKEND SERVICES LAYER                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ NestJS Modules (Business Logic)                         │   │
│  │ ├─ AuthModule (JWT, login, token refresh)              │   │
│  │ ├─ PlatformModule (platform admin operations)          │   │
│  │ ├─ SalonModule (salon CRUD, appointments, bookings)    │   │
│  │ ├─ ServiceCatalogModule (services, categories)         │   │
│  │ ├─ StaffModule (staff, work hours)                     │   │
│  │ ├─ BookingModule (appointment scheduling)             │   │
│  │ ├─ GiftCardModule (gift card lifecycle)               │   │
│  │ ├─ CRMModule (clients, customer data)                 │   │
│  │ └─ PublicModule (public endpoints)                    │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
           ↓ Connection Pooling (Neon HTTP)
┌─────────────────────────────────────────────────────────────────┐
│  DATABASE LAYER                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ PostgreSQL (Neon Serverless)                            │   │
│  │ 23 Tables + audit_logs + platform_settings             │   │
│  │ ├─ Automatic indexing on foreign keys                  │   │
│  │ ├─ Constraints for data integrity                      │   │
│  │ └─ Connection pooling for serverless                   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow Example: Booking Appointment

```
Customer Web
      │
      ├─ GET /api/v1/public/salon/:subdomain/availability
      │     (public - no auth required)
      │
      ├─ POST /api/v1/public/salon/:subdomain/book
      │     (creates appointment + client if new)
      │
      ↓
NestJS API Gateway
      │
      ├─ PublicService.bookAppointment()
      │     ├─ Validate slot availability
      │     ├─ Create/update client
      │     ├─ Create appointment
      │     ├─ Create appointment_services
      │     └─ Return confirmation
      │
      ↓
PostgreSQL
      │
      ├─ INSERT appointments
      ├─ INSERT appointment_services
      ├─ INSERT OR UPDATE clients
      └─ COMMIT transaction
```

---

## 3. Multi-Tenant Isolation Model

### 3.1 Isolation Strategy

**Salon-Level Row-Level Security (RLS)**: All business tables include a `salon_id` foreign key. The API enforces isolation at the application layer through JWT claims and middleware guards.

```typescript
// JWT Token Claims (Merchant Admin)
{
  sub: 'staff-id',
  salonId: 'salon-123',     // Primary isolation key
  accountId: 'account-456',
  role: 'OWNER',
  iat: ...,
  exp: ...
}

// JWT Token Claims (Platform Admin)
{
  sub: 'customer-id',
  role: 'PLATFORM_ADMIN',   // No salonId - cross-tenant access
  iat: ...,
  exp: ...
}
```

### 3.2 Isolation Implementation

| Layer | Mechanism | Implementation |
|-------|-----------|-----------------|
| **Request** | JWT claim extraction | `@CurrentUser()` decorator reads `salonId` from token |
| **Query** | WHERE clause filtering | All queries include `WHERE salon_id = $1` |
| **Middleware** | Tenant extraction | `TenantMiddleware` attaches salon_id to request context |
| **Guard** | Role-based filtering | `RolesGuard` validates user role and salon scope |
| **Database** | Foreign key constraints | `FOREIGN KEY (salon_id) REFERENCES salons(id)` |

### 3.3 Cross-Tenant Relationships

| Relationship | Type | Notes |
|--------------|------|-------|
| Customer → Account | One-to-Many | One customer can own multiple accounts (multi-location) |
| Account → Salon | One-to-Many | One account can manage multiple salons |
| Salon → Staff | One-to-Many | Staff are salon-specific; can link to Account for login |
| Salon → Service | One-to-Many | Services only visible within salon |
| Salon → Client | One-to-Many | Client database is salon-specific |

### 3.4 Platform Admin Cross-Tenant Access

Platform admins can:
- View/edit all customers, accounts, and salons
- Modify salon configurations directly
- Access full audit logs across all tenants
- Issue platform-wide settings

Platform admins **cannot**:
- Access password hashes
- Modify audit logs retroactively
- Create backdoor accounts

---

## 4. Role & Permission Design

### 4.1 Role Definitions

| Role | Scope | Permissions | JWT Field |
|------|-------|-------------|-----------|
| **PLATFORM_ADMIN** | Cross-tenant | Full platform access, customer management, settings | `role: 'PLATFORM_ADMIN'` |
| **OWNER** | Salon | All salon operations, staff/service config, full reports | `role: 'OWNER'` |
| **RECEPTIONIST** | Salon | Appointment management, client info, basic reporting | `role: 'RECEPTIONIST'` |
| **TECHNICIAN** | Salon | View assigned appointments, update own schedule | `role: 'TECHNICIAN'` |

### 4.2 Permissions Matrix

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Permissions by Role                                  │
├─────────────────────────┬────────────┬────────────┬──────────┬────────────┤
│ Feature                 │ PLATFORM   │ OWNER      │ RECEPTN. │ TECHNICIAN │
│                         │ ADMIN      │            │          │            │
├─────────────────────────┼────────────┼────────────┼──────────┼────────────┤
│ Customer CRUD           │ ✓✓✓        │ ✗          │ ✗        │ ✗          │
│ Account CRUD            │ ✓✓✓        │ ✗          │ ✗        │ ✗          │
│ Salon CRUD              │ ✓✓✓        │ ✓R         │ ✗        │ ✗          │
│ Salon Settings          │ ✓✓✓        │ ✓✓✓        │ ✗        │ ✗          │
│ Services                │ ✓✓✓        │ ✓✓✓        │ ✓R       │ ✗          │
│ Staff Management        │ ✓✓✓        │ ✓✓✓        │ ✓R       │ ✗          │
│ Appointments CRUD       │ ✓✓✓        │ ✓✓✓        │ ✓✓✓      │ ✓R         │
│ Appointment Status      │ ✓✓✓        │ ✓✓✓        │ ✓✓       │ ✓✓         │
│ Clients                 │ ✓✓✓        │ ✓✓✓        │ ✓✓✓      │ ✓R         │
│ Gift Cards              │ ✓✓✓        │ ✓✓✓        │ ✓✓       │ ✗          │
│ Reports/Analytics       │ ✓✓✓        │ ✓✓✓        │ ✓✓       │ ✗          │
│ Platform Settings       │ ✓✓✓        │ ✗          │ ✗        │ ✗          │
│ Audit Logs              │ ✓R         │ ✗          │ ✗        │ ✗          │
└─────────────────────────┴────────────┴────────────┴──────────┴────────────┘

Legend: ✓✓✓ = Full (Create/Read/Update/Delete)
        ✓✓ = Create/Read/Update
        ✓R = Read-only
        ✗ = No access
```

### 4.3 Decorator-Based Authorization

```typescript
// Example: Staff can only update own schedule
@Put('/staff/:id/work-hours')
@Roles('OWNER', 'RECEPTIONIST')  // Role check
@CurrentUser()                    // Inject current user
async updateStaffWorkHours(
  @Param('id') staffId: string,
  @CurrentUserDecorator() user: CurrentUser,
  @Body() dto: UpdateStaffWorkHoursDto
) {
  // Guard: verify staffId belongs to user.salonId
  // Guard: verify user.role allows this action
  // Service: validate and apply updates
}
```

---

## 5. Database Schema (23 Tables + 2 New)

### 5.1 Core Tables Overview

| Table | Purpose | Tenant Key | Records |
|-------|---------|-----------|---------|
| `customers` | Platform-level business entities | N/A | 1-500 |
| `accounts` | Login accounts, one per customer | N/A | 1-2000 |
| `salons` | Physical salon locations | `salon_id` (self) | 1-10k |
| `staff` | Salon employees | `salon_id` | 1-100 per salon |
| `staff_work_hours` | Individual staff schedules | `salon_id` | 5-10 per staff |
| `service_categories` | Grouping for services | `salon_id` | 3-20 per salon |
| `services` | Bookable services | `salon_id` | 10-200 per salon |
| `service_addons` | Optional add-ons to services | `salon_id` | 0-50 per service |
| `staff_services` | Service-to-staff assignments | `salon_id` | 5-500 per salon |
| `business_hours` | Salon operating hours | `salon_id` | 7 (one per day) |
| `special_hours` | Holiday/special closures | `salon_id` | 0-100 per year |
| `clients` | Customer records (per salon) | `salon_id` | 10-50k per salon |
| `appointments` | Bookings | `salon_id` | 100-1M per salon (lifetime) |
| `appointment_services` | Service line items per appointment | `salon_id` | 100-3M (lifetime) |
| `time_blocks` | Staff unavailability blocks | `salon_id` | 0-1000 per year |
| `gift_card_products` | Gift card templates | `salon_id` | 3-20 per salon |
| `gift_card_instances` | Issued gift cards | `salon_id` | 0-100k per salon |
| `gift_card_usage_logs` | Gift card redemption history | `salon_id` | 0-100k per salon |
| `gift_card_categories` | Gift card grouping | `salon_id` | 2-10 per salon |
| `gift_card_product_items` | Service items in item-type gift cards | `salon_id` | 0-100 per salon |
| `website_configs` | Website builder settings | `salon_id` (unique) | 1 per salon |
| `media_files` | Uploaded images/media | `salon_id` | 0-10k per salon |
| `booking_settings` | Appointment booking configuration | `salon_id` (unique) | 1 per salon |
| **NEW:** `audit_logs` | Change tracking | `salon_id` | 1-100k per salon (lifetime) |
| **NEW:** `platform_settings` | System-wide configuration | N/A | 10-50 |

### 5.2 Table Definitions

#### Core Entity Tables

```sql
-- customers: Platform-level business entities
CREATE TABLE customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  operator TEXT,                    -- Account owner contact
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- accounts: Login credentials and account management
CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  platform_name TEXT,               -- Alias for this account
  uuid TEXT NOT NULL UNIQUE,        -- External reference
  status TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, SUSPENDED, DELETED
  last_login_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- salons: Individual salon locations (PRIMARY TENANT BOUNDARY)
CREATE TABLE salons (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  name TEXT NOT NULL,
  subdomain TEXT NOT NULL UNIQUE,   -- mybeauty.example.com
  custom_domain TEXT UNIQUE,        -- custom.salon.com
  status TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE, ARCHIVED
  industry TEXT NOT NULL DEFAULT 'beauty',
  currency TEXT NOT NULL DEFAULT 'USD',
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT NOT NULL DEFAULT 'US',
  latitude REAL,
  longitude REAL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);
```

#### Staff & Scheduling Tables

```sql
-- staff: Salon employees
CREATE TABLE staff (
  id TEXT PRIMARY KEY,
  salon_id TEXT NOT NULL,
  account_id TEXT,                  -- Link to login account (optional)
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT NOT NULL,               -- OWNER, TECHNICIAN, etc.
  gender TEXT,
  avatar_url TEXT,
  bio TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL
);

-- staff_work_hours: Individual staff weekly schedules
CREATE TABLE staff_work_hours (
  id TEXT PRIMARY KEY,
  staff_id TEXT NOT NULL,
  salon_id TEXT NOT NULL,
  day_of_week INTEGER NOT NULL,    -- 0-6 (Sun-Sat)
  start_time TEXT NOT NULL,         -- HH:MM format
  end_time TEXT NOT NULL,           -- HH:MM format
  is_off INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
  FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE,
  UNIQUE(staff_id, day_of_week)
);

-- time_blocks: Unavailability blocks (vacation, breaks, etc.)
CREATE TABLE time_blocks (
  id TEXT PRIMARY KEY,
  salon_id TEXT NOT NULL,
  staff_id TEXT NOT NULL,
  date TEXT NOT NULL,               -- YYYY-MM-DD
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  reason TEXT,                      -- VACATION, SICK, TRAINING, etc.
  created_at TEXT NOT NULL,
  FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE,
  FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
);
```

#### Service & Product Tables

```sql
-- service_categories: Service grouping (Hair, Nails, Massage, etc.)
CREATE TABLE service_categories (
  id TEXT PRIMARY KEY,
  salon_id TEXT NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE
);

-- services: Bookable services
CREATE TABLE services (
  id TEXT PRIMARY KEY,
  salon_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  duration INTEGER NOT NULL,        -- Minutes
  pos_price REAL,                   -- Alternative POS pricing
  tech_count INTEGER NOT NULL DEFAULT 1,
  cover_image_url TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  is_multi_tech INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  pricing_variants TEXT,            -- JSON: [{name, price}, ...]
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES service_categories(id) ON DELETE CASCADE
);

-- service_addons: Optional add-ons to services
CREATE TABLE service_addons (
  id TEXT PRIMARY KEY,
  service_id TEXT NOT NULL,
  salon_id TEXT NOT NULL,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  duration INTEGER NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE
);

-- staff_services: Service-to-staff assignments
CREATE TABLE staff_services (
  staff_id TEXT NOT NULL,
  service_id TEXT NOT NULL,
  salon_id TEXT NOT NULL,
  PRIMARY KEY (staff_id, service_id),
  FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE
);
```

#### Business Configuration Tables

```sql
-- business_hours: Salon operating hours
CREATE TABLE business_hours (
  id TEXT PRIMARY KEY,
  salon_id TEXT NOT NULL,
  day_of_week INTEGER NOT NULL,    -- 0-6 (Sun-Sat)
  open_time TEXT NOT NULL,          -- HH:MM format
  close_time TEXT NOT NULL,
  is_closed INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE,
  UNIQUE(salon_id, day_of_week)
);

-- special_hours: Holiday/special closures
CREATE TABLE special_hours (
  id TEXT PRIMARY KEY,
  salon_id TEXT NOT NULL,
  date TEXT NOT NULL,               -- YYYY-MM-DD
  is_closed INTEGER NOT NULL DEFAULT 0,
  open_time TEXT,
  close_time TEXT,
  label TEXT,                       -- "New Year's", "Thanksgiving", etc.
  FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE,
  UNIQUE(salon_id, date)
);

-- booking_settings: Appointment booking configuration
CREATE TABLE booking_settings (
  id TEXT PRIMARY KEY,
  salon_id TEXT NOT NULL UNIQUE,
  buffer_minutes INTEGER NOT NULL DEFAULT 0,
  min_advance_minutes INTEGER NOT NULL DEFAULT 60,
  reminder_before TEXT NOT NULL DEFAULT '[]', -- JSON: [300, 1440]
  allow_multi_service INTEGER NOT NULL DEFAULT 0,
  allow_multi_person INTEGER NOT NULL DEFAULT 0,
  sms_verification INTEGER NOT NULL DEFAULT 0,
  notification_phone TEXT,
  notification_email TEXT,
  assignment_strategy TEXT NOT NULL DEFAULT 'COUNT', -- COUNT, RATING, BALANCED
  allow_gender_filter INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE
);
```

#### Appointment & Client Tables

```sql
-- clients: Client database (per salon)
CREATE TABLE clients (
  id TEXT PRIMARY KEY,
  salon_id TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL,
  email TEXT,
  tags TEXT NOT NULL DEFAULT '[]',  -- JSON array: ["VIP", "New"]
  notes TEXT,
  source TEXT NOT NULL DEFAULT 'WEBSITE', -- WEBSITE, PHONE, WALK_IN, REFERRAL
  total_visits INTEGER NOT NULL DEFAULT 0,
  last_visit_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE,
  UNIQUE(salon_id, phone)
);

-- appointments: Bookings
CREATE TABLE appointments (
  id TEXT PRIMARY KEY,
  salon_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, CONFIRMED, COMPLETED, CANCELLED, NO_SHOW
  source TEXT NOT NULL,              -- WEBSITE, PHONE, WALK_IN
  date TEXT NOT NULL,                -- YYYY-MM-DD
  start_time TEXT NOT NULL,          -- HH:MM format
  end_time TEXT NOT NULL,
  total_price REAL,
  total_duration INTEGER,            -- Total minutes
  tip REAL NOT NULL DEFAULT 0,
  notes TEXT,
  internal_notes TEXT,
  cancelled_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- appointment_services: Service line items in appointment
CREATE TABLE appointment_services (
  id TEXT PRIMARY KEY,
  appointment_id TEXT NOT NULL,
  service_id TEXT NOT NULL,
  staff_id TEXT NOT NULL,
  salon_id TEXT NOT NULL,
  price REAL NOT NULL,
  duration INTEGER NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  addons TEXT NOT NULL DEFAULT '[]', -- JSON: [{id, name, price}, ...]
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
  FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE
);
```

#### Gift Card Tables

```sql
-- gift_card_products: Gift card templates
CREATE TABLE gift_card_products (
  id TEXT PRIMARY KEY,
  salon_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,                -- VALUE (dollar amount), ITEM (service count)
  price REAL NOT NULL,               -- Purchase price
  face_value REAL,                   -- Redeemable value for VALUE type
  service_count INTEGER,             -- Redeemable count for ITEM type
  linked_service_id TEXT,            -- For single-service gift cards
  cover_image_url TEXT,
  validity_days INTEGER,
  status TEXT NOT NULL DEFAULT 'DRAFT', -- DRAFT, ACTIVE, ARCHIVED
  sort_order INTEGER NOT NULL DEFAULT 0,
  category_id TEXT,
  font_color TEXT DEFAULT '#FFFFFF',
  is_listed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE,
  FOREIGN KEY (linked_service_id) REFERENCES services(id) ON DELETE SET NULL
);

-- gift_card_product_items: Service items in item-type gift cards
CREATE TABLE gift_card_product_items (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  salon_id TEXT NOT NULL,
  service_id TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (product_id) REFERENCES gift_card_products(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE
);

-- gift_card_categories: Gift card grouping
CREATE TABLE gift_card_categories (
  id TEXT PRIMARY KEY,
  salon_id TEXT NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE
);

-- gift_card_instances: Issued gift cards
CREATE TABLE gift_card_instances (
  id TEXT PRIMARY KEY,
  salon_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  serial_no TEXT NOT NULL UNIQUE,
  recipient_name TEXT,
  recipient_phone TEXT,
  sender_name TEXT,
  message TEXT,
  original_value REAL NOT NULL,
  remaining_value REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, USED, EXPIRED, LOST
  buyer_client_id TEXT,
  remaining_items TEXT DEFAULT '[]', -- JSON for ITEM type
  issued_at TEXT NOT NULL,
  expires_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES gift_card_products(id) ON DELETE CASCADE
);

-- gift_card_usage_logs: Redemption history
CREATE TABLE gift_card_usage_logs (
  id TEXT PRIMARY KEY,
  instance_id TEXT NOT NULL,
  salon_id TEXT NOT NULL,
  amount REAL NOT NULL,
  operator_id TEXT,
  service_id TEXT,
  item_quantity INTEGER,
  redemption_type TEXT DEFAULT 'AMOUNT', -- AMOUNT, ITEM
  notes TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (instance_id) REFERENCES gift_card_instances(id) ON DELETE CASCADE,
  FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE,
  FOREIGN KEY (operator_id) REFERENCES staff(id) ON DELETE SET NULL
);
```

#### Website & Media Tables

```sql
-- website_configs: Website builder configuration
CREATE TABLE website_configs (
  id TEXT PRIMARY KEY,
  salon_id TEXT NOT NULL UNIQUE,
  theme TEXT NOT NULL DEFAULT '{}',   -- JSON: {primary_color, fonts, ...}
  navbar TEXT NOT NULL DEFAULT '{}',
  announcement TEXT,
  hero TEXT,
  sections TEXT NOT NULL DEFAULT '[]', -- JSON: [{type, content}, ...]
  footer TEXT,
  service_page TEXT,
  seo TEXT,
  published_at TEXT,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE
);

-- media_files: Uploaded images and media
CREATE TABLE media_files (
  id TEXT PRIMARY KEY,
  salon_id TEXT NOT NULL,
  folder TEXT NOT NULL DEFAULT '/',
  filename TEXT NOT NULL,
  url TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  created_at TEXT NOT NULL,
  FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE
);
```

#### NEW: Audit & Platform Tables

```sql
-- NEW: audit_logs - Complete change tracking
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  salon_id TEXT NOT NULL,            -- NULL for platform-level changes
  user_id TEXT,
  action TEXT NOT NULL,              -- CREATE, UPDATE, DELETE, VIEW
  entity_type TEXT NOT NULL,         -- APPOINTMENT, CLIENT, SERVICE, etc.
  entity_id TEXT NOT NULL,
  old_value TEXT,                    -- JSON: previous state
  new_value TEXT,                    -- JSON: new state
  ip_address TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE
);

-- NEW: platform_settings - System configuration
CREATE TABLE platform_settings (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,          -- subscription_tiers, feature_flags, etc.
  value TEXT NOT NULL,               -- JSON payload
  description TEXT,
  updated_at TEXT NOT NULL
);
```

### 5.3 Indexing Strategy

| Index | Purpose | Query Performance |
|-------|---------|-------------------|
| `idx_salons_account_id` | Fast salon lookup by account | Account detail page |
| `idx_staff_salon_id` | Fast staff list per salon | Staff management |
| `idx_services_salon_id` | Fast service list per salon | Service catalog |
| `idx_appointments_salon_id` | Fast appointment query per salon | Calendar, reports |
| `idx_appointments_date` | Fast date range queries | Calendar views |
| `idx_clients_salon_id` | Fast client list per salon | CRM |
| `idx_business_hours_salon_id` | Quick hours lookup | Availability calculation |
| `idx_gift_card_instances_salon_id` | Fast gift card lookup | Gift card reports |
| `idx_media_files_salon_id` | Fast file list per salon | Media manager |
| `idx_customers_phone`, `idx_customers_email` | De-duplication | Prevent duplicate accounts |
| `idx_accounts_status` | Fast active account filtering | Admin reports |

---

## 6. API Design

### 6.1 API Overview

| API Group | Base URL | Records | Purpose |
|-----------|----------|---------|---------|
| **Platform API** | `/api/v1/platform` | 30+ endpoints | Platform admin operations |
| **Merchant API** | `/api/v1/merchant/salon` | 80+ endpoints | Salon management |
| **Public API** | `/api/v1/public` | 6 endpoints | Customer booking |
| **Auth API** | `/api/v1/merchant/auth` | 3 endpoints | Authentication |

### 6.2 Platform API Endpoints (30+ endpoints)

#### Dashboard
- `GET /api/v1/platform/dashboard` - Platform stats

#### Customer Management (5 endpoints)
- `GET /api/v1/platform/customers` - List with pagination
- `GET /api/v1/platform/customers/:id` - Customer detail
- `POST /api/v1/platform/customers` - Create customer
- `PUT /api/v1/platform/customers/:id` - Update customer
- `DELETE /api/v1/platform/customers/:id` - Delete customer

#### Account Management (5 endpoints)
- `GET /api/v1/platform/accounts` - List with filters
- `GET /api/v1/platform/accounts/:id` - Account detail
- `POST /api/v1/platform/accounts` - Create account
- `PUT /api/v1/platform/accounts/:id` - Update account
- `DELETE /api/v1/platform/accounts/:id` - Delete account

#### Salon Management (4 endpoints)
- `GET /api/v1/platform/salons` - List all salons
- `GET /api/v1/platform/salons/:id` - Salon detail
- `PUT /api/v1/platform/salons/:id` - Update salon profile
- `POST /api/v1/platform/accounts/:accountId/salons` - Create salon

#### Salon Services Management (3 endpoints)
- `GET /api/v1/platform/salons/:id/services` - Service list
- `POST /api/v1/platform/salons/:id/service-categories` - Create category
- `PUT /api/v1/platform/salons/:id/service-categories/:catId` - Update category
- `DELETE /api/v1/platform/salons/:id/service-categories/:catId` - Delete category
- `POST /api/v1/platform/salons/:id/services` - Create service
- `PUT /api/v1/platform/salons/:id/services/:serviceId` - Update service
- `DELETE /api/v1/platform/salons/:id/services/:serviceId` - Delete service

#### Salon Staff Management (3 endpoints)
- `GET /api/v1/platform/salons/:id/staff` - Staff list
- `POST /api/v1/platform/salons/:id/staff` - Create staff
- `PUT /api/v1/platform/salons/:id/staff/:staffId` - Update staff
- `DELETE /api/v1/platform/salons/:id/staff/:staffId` - Delete staff

#### Salon Configuration (2 endpoints)
- `PUT /api/v1/platform/salons/:id/business-hours` - Update hours
- `PUT /api/v1/platform/salons/:id/booking-settings` - Update settings

#### Salon Reporting (1 endpoint)
- `GET /api/v1/platform/salons/:id/bookings` - Booking summary
- `GET /api/v1/platform/salons/:id/clients` - Client list

#### Appointment Management (1 endpoint)
- `PUT /api/v1/platform/salons/:id/appointments/:aptId/status` - Update status

#### Related Endpoints
- `GET /api/v1/platform/customers/:id/accounts` - List customer's accounts

### 6.3 Merchant API Endpoints (80+ endpoints)

#### Core Salon Operations (1 endpoint)
- `GET /api/v1/merchant/salon/` - Get current salon
- `PUT /api/v1/merchant/salon/` - Update salon profile

#### Business Hours (5 endpoints)
- `GET /api/v1/merchant/salon/business-hours` - Get all hours
- `PUT /api/v1/merchant/salon/business-hours` - Batch update
- `GET /api/v1/merchant/salon/special-hours` - Get special hours
- `POST /api/v1/merchant/salon/special-hours` - Create special hour
- `PUT /api/v1/merchant/salon/special-hours/:id` - Update
- `DELETE /api/v1/merchant/salon/special-hours/:id` - Delete

#### Booking Settings (2 endpoints)
- `GET /api/v1/merchant/salon/booking-settings` - Get settings
- `PUT /api/v1/merchant/salon/booking-settings` - Update settings

#### Services (9 endpoints)
- `GET /api/v1/merchant/salon/services` - List all (with categories)
- `POST /api/v1/merchant/salon/service-categories` - Create category
- `PUT /api/v1/merchant/salon/service-categories/:id` - Update category
- `DELETE /api/v1/merchant/salon/service-categories/:id` - Delete category
- `POST /api/v1/merchant/salon/services` - Create service
- `PUT /api/v1/merchant/salon/services/:id` - Update service
- `DELETE /api/v1/merchant/salon/services/:id` - Delete service
- `POST /api/v1/merchant/salon/services/:id/addons` - Create addon
- `PUT /api/v1/merchant/salon/service-addons/:id` - Update addon
- `DELETE /api/v1/merchant/salon/service-addons/:id` - Delete addon

#### Staff Management (7 endpoints)
- `GET /api/v1/merchant/salon/staff` - List staff
- `POST /api/v1/merchant/salon/staff` - Create staff
- `PUT /api/v1/merchant/salon/staff/:id` - Update staff
- `DELETE /api/v1/merchant/salon/staff/:id` - Delete staff
- `PUT /api/v1/merchant/salon/staff/:id/services` - Assign services
- `PUT /api/v1/merchant/salon/staff/:id/work-hours` - Update work hours

#### Time Blocks (3 endpoints)
- `GET /api/v1/merchant/salon/time-blocks` - List time blocks
- `POST /api/v1/merchant/salon/time-blocks` - Create block
- `PUT /api/v1/merchant/salon/time-blocks/:id` - Update block
- `DELETE /api/v1/merchant/salon/time-blocks/:id` - Delete block

#### Appointments (12 endpoints)
- `GET /api/v1/merchant/salon/appointments` - List (with filters)
- `GET /api/v1/merchant/salon/appointments/:id` - Detail
- `POST /api/v1/merchant/salon/appointments` - Create
- `PUT /api/v1/merchant/salon/appointments/:id` - Edit
- `PUT /api/v1/merchant/salon/appointments/:id/status` - Update status
- `PATCH /api/v1/merchant/salon/appointments/:id/confirm` - Confirm
- `PATCH /api/v1/merchant/salon/appointments/:id/checkin` - Check in
- `PATCH /api/v1/merchant/salon/appointments/:id/complete` - Complete
- `PATCH /api/v1/merchant/salon/appointments/:id/cancel` - Cancel
- `PATCH /api/v1/merchant/salon/appointments/:id/no-show` - Mark no-show
- `PATCH /api/v1/merchant/salon/appointments/:id/tip` - Record tip

#### Clients/CRM (6 endpoints)
- `GET /api/v1/merchant/salon/clients` - List clients
- `GET /api/v1/merchant/salon/clients/:id` - Client detail
- `POST /api/v1/merchant/salon/clients` - Create client
- `PUT /api/v1/merchant/salon/clients/:id` - Update client
- `DELETE /api/v1/merchant/salon/clients/:id` - Delete client
- `GET /api/v1/merchant/salon/clients/:id/appointments` - Client history

#### Gift Cards (8 endpoints)
- `GET /api/v1/merchant/salon/gift-card-categories` - List categories
- `POST /api/v1/merchant/salon/gift-card-categories` - Create category
- `PUT /api/v1/merchant/salon/gift-card-categories/:id` - Update category
- `DELETE /api/v1/merchant/salon/gift-card-categories/:id` - Delete category
- `GET /api/v1/merchant/salon/gift-card-products` - List products
- `GET /api/v1/merchant/salon/gift-card-products/:id` - Product detail
- `POST /api/v1/merchant/salon/gift-card-products` - Create product
- `PUT /api/v1/merchant/salon/gift-card-products/:id` - Update product
- `DELETE /api/v1/merchant/salon/gift-card-products/:id` - Delete product
- `POST /api/v1/merchant/salon/gift-cards/issue` - Issue gift card
- `GET /api/v1/merchant/salon/gift-cards/issued` - List issued
- `GET /api/v1/merchant/salon/gift-cards/:serialNo` - Get by serial
- `POST /api/v1/merchant/salon/gift-cards/redeem` - Redeem gift card

#### Website Management (3 endpoints)
- `GET /api/v1/merchant/salon/website-config` - Get config
- `PUT /api/v1/merchant/salon/website-config` - Update config
- `POST /api/v1/merchant/salon/website-config/publish` - Publish

#### Dashboard (1 endpoint)
- `GET /api/v1/merchant/salon/dashboard` - Dashboard stats

#### Media (3 endpoints)
- `GET /api/v1/merchant/salon/media` - List files
- `POST /api/v1/merchant/salon/media` - Upload file
- `DELETE /api/v1/merchant/salon/media/:id` - Delete file

### 6.4 Public API Endpoints (6 endpoints)

- `GET /api/v1/public/salon/:subdomain` - Salon profile
- `GET /api/v1/public/salon/:subdomain/services` - Service list
- `GET /api/v1/public/salon/:subdomain/staff` - Staff list
- `GET /api/v1/public/salon/:subdomain/availability` - Availability slots
- `GET /api/v1/public/salon/:subdomain/website-config` - Website config
- `POST /api/v1/public/salon/:subdomain/book` - Create booking

### 6.5 Auth Endpoints (3 endpoints)

- `POST /api/v1/merchant/auth/login` - Login (returns JWT)
- `POST /api/v1/merchant/auth/refresh` - Refresh token
- `POST /api/v1/merchant/auth/switch-salon` - Switch between salons

### 6.6 Request/Response Patterns

#### Authentication
```typescript
// Request
POST /api/v1/merchant/auth/login
{
  username: "owner@salon.com",
  password: "secure_password"
}

// Response (200 OK)
{
  access_token: "eyJhbGciOiJIUzI1NiIs...",
  refresh_token: "eyJhbGciOiJIUzI1NiIs...",
  user: {
    id: "staff-123",
    salonId: "salon-456",
    name: "Owner Name",
    role: "OWNER"
  }
}
```

#### Paginated List
```typescript
// Request
GET /api/v1/merchant/salon/appointments?page=1&pageSize=20&status=CONFIRMED

// Response (200 OK)
{
  data: [
    { id, clientId, date, startTime, status, ... },
    ...
  ],
  pagination: {
    page: 1,
    pageSize: 20,
    total: 45,
    totalPages: 3
  }
}
```

#### Resource Creation
```typescript
// Request
POST /api/v1/merchant/salon/clients
{
  firstName: "John",
  lastName: "Doe",
  phone: "+14155552671",
  email: "john@example.com"
}

// Response (201 Created)
{
  id: "client-789",
  firstName: "John",
  lastName: "Doe",
  phone: "+14155552671",
  email: "john@example.com",
  createdAt: "2026-03-18T10:30:00Z"
}
```

#### Error Handling
```typescript
// Response (400 Bad Request)
{
  error: "VALIDATION_ERROR",
  message: "Phone number is required",
  details: {
    field: "phone",
    value: null
  }
}

// Response (403 Forbidden)
{
  error: "PERMISSION_DENIED",
  message: "Only OWNER can modify booking settings"
}

// Response (409 Conflict)
{
  error: "DUPLICATE_RESOURCE",
  message: "Client with phone +14155552671 already exists in this salon"
}
```

---

## 7. Frontend Page Map

### 7.1 Platform Admin Pages

| Page | Route | Purpose | Key Components |
|------|-------|---------|-----------------|
| Dashboard | `/platform/dashboard` | KPIs, charts, quick stats | Charts, cards, filters |
| Customers | `/platform/customers` | Customer list, search, pagination | Table, search, pagination |
| Customer Detail | `/platform/customers/:id` | View/edit customer, linked accounts | Tabs, forms, account list |
| Accounts | `/platform/accounts` | Account list with search | Table, search, pagination |
| Account Detail | `/platform/accounts/:id` | View/edit account, linked salons | Tabs, forms, salon list |
| Salons | `/platform/salons` | All salons, status, quick actions | Table with actions, status badge |
| Salon Detail | `/platform/salons/:id/overview` | Salon profile, contact info | Form, location map |
| Salon Services | `/platform/salons/:id/services` | View/manage services | Category accordion, service list |
| Salon Staff | `/platform/salons/:id/staff` | View/manage staff | Staff table, quick actions |
| Salon Bookings | `/platform/salons/:id/bookings` | Booking summary, stats | Calendar, stats, filters |
| Salon Settings | `/platform/salons/:id/settings` | Business hours, hours, settings | Forms, toggle switches |
| Settings | `/platform/settings` | Platform configuration | Forms, tabs |

### 7.2 Merchant Admin Pages

| Page | Route | Purpose | Key Components |
|------|-------|---------|-----------------|
| Dashboard | `/merchant/dashboard` | Day overview, upcoming appointments | Cards, upcoming list, stats |
| Appointments | `/merchant/appointments` | Appointment list, search, filters | Table, search, status filter |
| Calendar | `/merchant/calendar` | Week/day calendar view | Calendar grid, drag-drop |
| Customers/CRM | `/merchant/customers` | Client list, history, notes | Table, search, detail modal |
| Gift Cards | `/merchant/gift-cards` | Issue, manage, redeem gift cards | Product list, issue form, logs |
| Staff | `/merchant/staff` | Manage staff, services, schedules | Staff list, work hours editor |
| Salon Settings | `/merchant/settings/salon` | Salon profile, contact, location | Forms, image upload |
| Business Hours | `/merchant/settings/hours` | Operating hours, special hours | Time picker, calendar |
| Booking Settings | `/merchant/settings/booking` | Buffer, advance notice, reminders | Toggles, number inputs |
| Website Editor | `/merchant/website` | Website builder, theme, sections | Editor, preview, publish |

### 7.3 Customer Web Pages

| Page | Route | Purpose | Key Components |
|------|-------|---------|-----------------|
| Home | `/` | Salon info, featured services | Hero, services grid, reviews |
| Services | `/services` | Browsable service list | Category filter, service cards |
| Staff | `/staff` | Team photos, bios | Staff grid, filter by service |
| Book | `/book` | Booking form, availability | Service select, date/time picker, checkout |
| Confirmation | `/confirmation/:id` | Booking confirmation, calendar add | Confirmation details, CTA buttons |

---

## 8. Main Workflow

### 8.1 Onboarding Flow

```
1. PLATFORM ADMIN: Create Customer
   └─ POST /api/v1/platform/customers
   └─ Customer object created in database

2. PLATFORM ADMIN: Create Account under Customer
   └─ POST /api/v1/platform/accounts
   └─ Account with username, password_hash, customer_id

3. PLATFORM ADMIN: Create Salon under Account
   └─ POST /api/v1/platform/accounts/:accountId/salons
   └─ Salon created with auto-generated subdomain
   └─ TRIGGERS:
      - Create default owner Staff entry
      - Create default BusinessHours (Mon-Fri 9-5, Sat 10-4, Sun closed)
      - Create BookingSettings (defaults: buffer=0, min_advance=60 minutes)
      - Create WebsiteConfig (default theme)

4. MERCHANT: Login with Account credentials
   └─ POST /api/v1/merchant/auth/login
   └─ JWT issued with salonId and role=OWNER

5. MERCHANT: Configure Salon
   └─ PUT /api/v1/merchant/salon/ (profile, hours, location)
   └─ POST /api/v1/merchant/salon/service-categories (create categories)
   └─ POST /api/v1/merchant/salon/services (create services)
   └─ POST /api/v1/merchant/salon/staff (add staff)
   └─ PUT /api/v1/merchant/salon/staff/:id/services (assign services)
   └─ PUT /api/v1/merchant/salon/staff/:id/work-hours (set schedules)

6. MERCHANT: Publish Website
   └─ PUT /api/v1/merchant/salon/website-config (update theme, sections)
   └─ POST /api/v1/merchant/salon/website-config/publish
   └─ Website live at https://subdomain.example.com

7. CUSTOMER: Book Appointment
   └─ GET /api/v1/public/salon/:subdomain/services
   └─ GET /api/v1/public/salon/:subdomain/availability
   └─ POST /api/v1/public/salon/:subdomain/book
   └─ Appointment created (PENDING status)
   └─ Client created if new

8. MERCHANT: Confirm Appointment
   └─ PATCH /api/v1/merchant/salon/appointments/:id/confirm
   └─ Status → CONFIRMED
   └─ Customer receives SMS/email notification
```

### 8.2 Daily Operations

```
MERCHANT ADMIN:
├─ Morning: View dashboard, upcoming appointments
├─ Check-in: PATCH /appointments/:id/checkin
├─ Complete: PATCH /appointments/:id/complete
├─ Add notes: PUT /appointments/:id
├─ Manage cancellations: PATCH /appointments/:id/cancel
├─ Update client info: PUT /clients/:id
└─ End of day: Review revenue, appointment stats

RECEPTIONIST:
├─ Answer phones, create walk-in appointments
│  └─ POST /appointments (source: PHONE)
├─ Check appointment status
├─ Collect payment info
└─ Send reminders, follow-ups

TECHNICIAN:
├─ View assigned appointments
├─ Check-in clients
├─ Log time blocks (lunch, breaks)
└─ Update own availability
```

---

## 9. Extensibility Design

### 9.1 Feature Flags (Future)

```typescript
// Platform-wide or salon-specific feature control

table platform_settings {
  key: "feature:gift_cards:enabled",
  value: JSON.stringify({
    enabled: true,
    beta: false,
    salons: ["salon-123", "salon-456"]
  })
}

// Usage in API
const giftCardsEnabled = await featureFlagService.isEnabled(
  'gift_cards',
  user.salonId
);
```

### 9.2 Subscription Tiers (Future)

```typescript
// Define capabilities per subscription level

enum SubscriptionTier {
  STARTER = 'starter',      // 1 staff, 5 services, basic reports
  PROFESSIONAL = 'pro',     // 10 staff, unlimited services, advanced reports
  ENTERPRISE = 'enterprise' // unlimited, API access, dedicated support
}

table platform_settings {
  key: "subscription_tiers",
  value: JSON.stringify({
    starter: { maxStaff: 1, maxServices: 5, features: [...] },
    pro: { maxStaff: 10, maxServices: null, features: [...] },
    enterprise: { maxStaff: null, maxServices: null, features: [...] }
  })
}

// Enforce limits in API
@Post('/salons/:id/staff')
async createStaff(...) {
  const tier = await subscriptionService.getTier(salon.accountId);
  const staffCount = await staffService.count(salonId);

  if (staffCount >= tier.maxStaff) {
    throw new HttpException(
      'Staff limit reached for subscription tier',
      HttpStatus.PAYMENT_REQUIRED
    );
  }
  ...
}
```

### 9.3 Plugin/Integration System (Future)

```typescript
// Integration hooks for third-party services (Zapier, Make, etc.)

table platform_settings {
  key: "plugins:enabled",
  value: JSON.stringify([
    { id: 'zapier', name: 'Zapier', enabled: true },
    { id: 'make', name: 'Make.com', enabled: true }
  ])
}

// Webhook trigger on appointment creation
async createAppointment(...) {
  const appointment = await appointmentService.create(data);

  // Emit webhook
  await webhookService.emit('appointment.created', {
    salonId: salon.id,
    appointment
  });

  return appointment;
}
```

### 9.4 Webhook Support (Future)

```typescript
// Webhooks for real-time integrations

table platform_settings {
  key: "webhooks",
  value: JSON.stringify({
    "https://zapier.com/webhook/...": {
      events: ["appointment.created", "appointment.completed"],
      active: true
    }
  })
}

// Webhook events
enum WebhookEvent {
  APPOINTMENT_CREATED = 'appointment.created',
  APPOINTMENT_CONFIRMED = 'appointment.confirmed',
  APPOINTMENT_COMPLETED = 'appointment.completed',
  APPOINTMENT_CANCELLED = 'appointment.cancelled',
  CLIENT_CREATED = 'client.created',
  GIFT_CARD_ISSUED = 'gift_card.issued',
  GIFT_CARD_REDEEMED = 'gift_card.redeemed'
}

// Payload structure
{
  event: 'appointment.created',
  salonId: 'salon-123',
  timestamp: '2026-03-18T10:30:00Z',
  data: { appointment object }
}
```

### 9.5 Extensibility Points

| Extension Point | Use Case | Implementation |
|-----------------|----------|-----------------|
| **Custom Fields** | Store additional data per salon/appointment | JSON columns in entity tables |
| **Service Variants** | Pricing, duration variants | `pricing_variants` JSON field in Services |
| **Notifications** | SMS, email, push templates | Event-driven webhook system |
| **Reports** | Custom reporting, business intelligence | SQL-friendly data model + export APIs |
| **Integrations** | CRM, accounting, payment systems | Webhook + REST API integration points |
| **Mobile Apps** | White-label mobile booking | Same API, branded mobile UX |

---

## 10. Security Considerations

### 10.1 Multi-Tenant Isolation

- **JWT claims validation**: `salonId` extracted from token on every request
- **Middleware guards**: `TenantGuard`, `RolesGuard` enforce isolation
- **Query-level filtering**: All queries include `WHERE salon_id = $1`
- **Foreign key cascades**: Deletion respects hierarchy (salon deletion cascades to all children)

### 10.2 Authentication & Authorization

- **Password hashing**: bcrypt with salt rounds = 10
- **JWT expiration**: Access tokens 1 hour, refresh tokens 7 days
- **Token rotation**: Refresh endpoint issues new pair
- **Logout**: Token blacklist (optional, depends on deployment)

### 10.3 Data Privacy

- **PII encryption**: Client phone numbers, emails encrypted at rest (optional)
- **Access logging**: All data access logged to `audit_logs`
- **Compliance**: GDPR-ready data export/deletion flows
- **API rate limiting**: Platform admin API rate-limited to prevent abuse

### 10.4 Database Security

- **Parameterized queries**: All SQL uses parameterized placeholders (`$1`, `$2`, etc.)
- **Connection pooling**: SSL/TLS for database connections (Neon)
- **Backup strategy**: Automatic backups (Neon managed)

---

## 11. Performance Considerations

### 11.1 Query Optimization

| Query Pattern | Optimization |
|---------------|--------------|
| Get salon appointments by date | Index on `(salon_id, date)` |
| Find available staff for service | Index on `(service_id, salon_id)` + availability calculation |
| Search clients by phone | Index on `(salon_id, phone)` + full-text search (optional) |
| List recent bookings | Index on `(salon_id, created_at DESC)` |

### 11.2 Caching Strategy

- **Cache layers**: Redis for availability, staff schedules, service listings
- **Invalidation**: On write (appointment creation, staff schedule change)
- **TTL**: 5-15 minutes for frequently accessed data

### 11.3 Pagination

- All list endpoints support `page` and `pageSize` parameters
- Default page size: 10-20 records
- Maximum page size: 100 records (hard limit)

---

## 12. Deployment Architecture

### 12.1 Production Setup

```
┌─────────────────────────────────────────────────────────────┐
│ CDN (Cloudflare / CloudFront)                               │
│ - Static assets (frontend builds)                           │
│ - Image optimization                                        │
│ - Global caching                                            │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ Load Balancer (Application Layer)                           │
│ - HTTPS termination                                         │
│ - Session persistence                                       │
│ - Request routing                                           │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ NestJS API (Containerized)                                  │
│ - Multiple instances (auto-scaling)                         │
│ - Health checks                                             │
│ - Graceful shutdown                                         │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ PostgreSQL (Neon Serverless)                                │
│ - Connection pooling                                        │
│ - Automated backups                                         │
│ - Point-in-time recovery                                    │
└─────────────────────────────────────────────────────────────┘
```

### 12.2 Environment Configuration

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string (Neon) |
| `JWT_SECRET` | Token signing key |
| `JWT_EXPIRATION` | Access token expiration (1h) |
| `CORS_ORIGINS` | Allowed frontend origins |
| `NODE_ENV` | development, staging, production |
| `LOG_LEVEL` | debug, info, warn, error |

---

## Appendix A: Glossary

| Term | Definition |
|------|-----------|
| **Tenant** | Salon - the primary isolation boundary |
| **Account** | Login credential tied to a Customer |
| **Customer** | Business entity that owns one or more Accounts/Salons |
| **Staff** | Employee of a salon, may have login account |
| **Client** | Customer of the salon (end user booking appointments) |
| **Service** | Bookable offering (haircut, massage, etc.) |
| **Appointment** | Booking of one or more services by a client |
| **Gift Card** | Prepaid voucher or service credit |
| **Subdomain** | Primary booking website URL (mybeauty.example.com) |

---

## Appendix B: Common Queries

### B.1 Get Available Staff for Service on Date

```sql
SELECT DISTINCT s.id, s.name, s.avatar_url
FROM staff s
JOIN staff_services ss ON s.id = ss.staff_id
WHERE s.salon_id = $1
  AND ss.service_id = $2
  AND s.is_active = 1
  AND NOT EXISTS (
    SELECT 1 FROM appointments a
    JOIN appointment_services aas ON a.id = aas.appointment_id
    WHERE aas.staff_id = s.id
      AND a.date = $3
      AND a.status != 'CANCELLED'
  )
ORDER BY s.sort_order;
```

### B.2 Get Booked Time Slots for Staff on Date

```sql
SELECT aas.start_time, aas.end_time
FROM appointment_services aas
JOIN appointments a ON aas.appointment_id = a.id
WHERE aas.staff_id = $1
  AND a.date = $2
  AND a.status IN ('CONFIRMED', 'COMPLETED')
ORDER BY aas.start_time;
```

### B.3 Calculate Revenue by Service

```sql
SELECT
  s.name,
  COUNT(aas.id) as count,
  SUM(aas.price) as revenue
FROM services s
LEFT JOIN appointment_services aas ON s.id = aas.service_id
WHERE s.salon_id = $1
  AND aas.created_at >= $2
  AND aas.created_at <= $3
GROUP BY s.id, s.name
ORDER BY revenue DESC;
```

---

**End of Document**
