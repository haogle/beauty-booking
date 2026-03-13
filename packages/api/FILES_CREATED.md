# Database & Auth Implementation Files Created

This document summarizes all files created for sql.js WASM-based SQLite integration and authentication system.

## Files Created

### 1. Database Layer

#### `/src/database/database.service.ts`
- Injectable NestJS service wrapping sql.js
- Initializes SQL.js on module init
- Creates/opens database at `./data/beauty_booking.db`
- Implements all DDL for complete schema matching Prisma
- Provides methods: `run()`, `get()`, `all()`, `exec()`
- Uses snake_case column names for SQLite
- Handles UUID generation via node crypto
- Auto-saves database to file after modifications

#### `/src/database/database.module.ts`
- Global NestJS module exporting DatabaseService
- Automatically available to all modules

### 2. Authentication Layer

#### `/src/modules/auth/auth.service.ts`
Complete authentication service with:
- `login(username, password)` - bcryptjs password validation, returns JWT tokens
- `refreshAccessToken(refreshToken)` - verify and issue new access token
- `switchSalon(userId, salonId)` - verify access and switch salons
- `getPermissionsForRole(role)` - role-based permissions:
  - OWNER: all permissions
  - RECEPTIONIST: mid-tier permissions
  - TECHNICIAN: minimal permissions
- Password hashing/validation helpers
- JWT payload generation with proper claims

#### `/src/modules/auth/auth.controller.ts`
REST endpoints:
- `POST /api/v1/merchant/auth/login` - User login
- `POST /api/v1/merchant/auth/refresh` - Refresh token
- `POST /api/v1/merchant/auth/switch-salon` - Switch salon (JWT protected)

#### `/src/modules/auth/auth.module.ts`
- Configures JwtModule with JWT_SECRET and JWT_REFRESH_SECRET
- Imports DatabaseModule
- Provides AuthService and AuthController
- Exports JwtModule and PassportModule

#### `/src/modules/auth/dto/login.dto.ts`
Data Transfer Objects:
- LoginDto: username (string), password (string)
- RefreshTokenDto: refreshToken (string)
- SwitchSalonDto: salonId (string)
- All use class-validator decorators

### 3. Updated Files

#### `/src/app.module.ts`
- Updated to import DatabaseModule instead of PrismaModule
- Updated to import new modules/auth/AuthModule

## Key Features Implemented

### Database Service
- Parameterized queries with `?` placeholders (SQL injection safe)
- Automatic table creation with proper indexes
- Complete schema with 21 tables:
  - Core: customers, accounts, salons
  - Salon: business_hours, special_hours, staff, service_categories, services, etc.
  - Bookings: appointments, appointment_services, clients
  - Gift Cards: gift_card_products, gift_card_instances, gift_card_usage_logs
  - Config: website_configs, media_files, booking_settings
- Foreign key constraints and unique indexes
- TEXT for UUIDs, TEXT for enums, REAL for decimals, INTEGER for booleans

### Auth Service
- JWT-based authentication with separate access/refresh tokens
- Access token: 15 minutes expiry
- Refresh token: 7 days expiry
- Token payload includes userId, accountId, salonId, role, permissions
- Multi-salon support with role-based access control
- Bcryptjs password hashing (10 salt rounds)
- Role-based permission system

### Error Handling
- Proper NestJS exceptions thrown
- UnauthorizedException for invalid credentials
- BadRequestException for validation errors
- NotFoundException for missing resources

## Environment Variables Required

```
DATABASE_URL="file:./data/beauty_booking.db"
JWT_SECRET="beauty-booking-dev-secret-key-2026"
JWT_REFRESH_SECRET="beauty-booking-dev-refresh-secret-2026"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=3000
```

## Dependencies Used

- sql.js: WASM-based SQLite
- bcryptjs: Password hashing
- @nestjs/jwt: JWT token management
- @nestjs/passport: Passport integration
- class-validator: DTO validation
- uuid: Unique ID generation

## Implementation Notes

1. All SQL queries use parameterized queries with `?` placeholders
2. Database is persisted to filesystem after each modification
3. Tables are created on service initialization with `IF NOT EXISTS`
4. All timestamps are ISO 8601 strings (no DATETIME type in SQLite)
5. Boolean values stored as INTEGER (0/1) in SQLite
6. JSON data stored as TEXT strings in SQLite
7. Decimal/Float values use REAL type
8. Role-based permissions configured at service layer
9. JWT verification happens at controller via guards

## Testing the Implementation

```bash
# Build the project
npm run build

# Start dev server
npm run dev

# Login endpoint
POST http://localhost:3000/api/v1/merchant/auth/login
{
  "username": "owner@example.com",
  "password": "password123"
}

# Refresh endpoint
POST http://localhost:3000/api/v1/merchant/auth/refresh
{
  "refreshToken": "eyJhbGc..."
}

# Switch salon endpoint (requires Authorization header)
POST http://localhost:3000/api/v1/merchant/auth/switch-salon
Authorization: Bearer eyJhbGc...
{
  "salonId": "salon-uuid-here"
}
```

