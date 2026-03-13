# Beauty Booking API

NestJS-based REST API backend for the Beauty Booking SaaS platform.

## Project Structure

```
src/
├── main.ts                          # Application entry point
├── app.module.ts                    # Root module
├── auth/                            # Authentication module
│   ├── auth.module.ts
│   └── strategies/
│       └── jwt.strategy.ts          # JWT validation strategy
├── prisma/                          # Database service
│   ├── prisma.module.ts
│   └── prisma.service.ts
├── platform/                        # Platform-level features
│   └── platform.module.ts
├── salon/                           # Salon management features
│   └── salon.module.ts
└── common/
    ├── decorators/                  # Custom decorators
    │   ├── current-user.decorator.ts
    │   ├── roles.decorator.ts
    │   └── permissions.decorator.ts
    ├── guards/                      # Route guards
    │   ├── jwt-auth.guard.ts
    │   ├── roles.guard.ts           # Role-based access control
    │   └── tenant.guard.ts          # Multi-tenant isolation
    ├── filters/                     # Exception filters
    │   └── http-exception.filter.ts
    ├── interceptors/                # Response interceptors
    │   └── transform.interceptor.ts
    └── middleware/                  # HTTP middleware
        └── tenant.middleware.ts     # Tenant extraction from JWT
```

## Installation

```bash
npm install
```

## Configuration

1. Copy `.env.example` to `.env`
2. Update environment variables for your setup
3. Run database migrations:

```bash
npm run migrate:dev
```

## Development

Start the development server with hot reload:

```bash
npm run start:dev
```

The API will be available at `http://localhost:3000`

## Building

Build for production:

```bash
npm run build
```

Run the production build:

```bash
npm run start:prod
```

## Database

### Run migrations

```bash
npm run migrate:dev
```

### Deploy migrations to production

```bash
npm run migrate:deploy
```

### Generate Prisma client

```bash
npm run generate
```

### Open Prisma Studio

```bash
npm run studio
```

## Authentication

The API uses JWT (JSON Web Tokens) for authentication:

1. Users authenticate and receive a JWT token
2. Token is sent in the `Authorization` header as `Bearer <token>`
3. JWT payload includes:
   - `userId`: Unique user identifier
   - `accountId`: Account/organization identifier
   - `salonId`: Tenant identifier for multi-tenancy
   - `role`: User role (OWNER, RECEPTIONIST, TECHNICIAN)
   - `permissions`: Array of permission strings

## Authorization

### Role Hierarchy

Roles are ordered by permission level:

1. **OWNER** (Level 3) - Full access
2. **RECEPTIONIST** (Level 2) - Receptionist + Technician level access
3. **TECHNICIAN** (Level 1) - Limited technician access

Use the `@Roles()` decorator to restrict endpoints to specific roles. The guard automatically checks role hierarchy - higher-level roles can access lower-level endpoints.

### Usage

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { Roles } from './common/decorators/roles.decorator';
import { CurrentUser, CurrentUser as CurrentUserType } from './common/decorators/current-user.decorator';

@Controller('api/salons')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SalonController {
  @Get(':salonId')
  @Roles('OWNER', 'RECEPTIONIST')
  getSalon(@CurrentUser() user: CurrentUserType) {
    // Only OWNER and RECEPTIONIST (and above) can access
    return { salonId: user.salonId };
  }
}
```

## Multi-Tenancy

The `TenantGuard` ensures users can only access data from their assigned salon:

```typescript
@UseGuards(JwtAuthGuard, TenantGuard)
```

The `salonId` from the JWT token is validated against the request parameters to prevent cross-tenant access.

## Response Format

All successful API responses are wrapped in a standard format:

```json
{
  "data": { /* response data */ },
  "timestamp": "2024-03-13T10:30:00.000Z"
}
```

## Error Handling

Errors are returned in a standardized format:

```json
{
  "code": "FORBIDDEN",
  "message": "You do not have access to this resource",
  "details": null,
  "timestamp": "2024-03-13T10:30:00.000Z",
  "path": "/api/salons/123"
}
```

## Testing

```bash
npm run test              # Run tests
npm run test:watch       # Run tests in watch mode
npm run test:cov         # Run tests with coverage
```

## Linting

```bash
npm run lint
```

## Environment Variables

See `.env.example` for all available environment variables.

Key variables:
- `PORT`: Server port (default: 3000)
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for signing JWTs
- `JWT_EXPIRES_IN`: JWT token expiration (default: 7d)
- `CORS_ORIGIN`: Allowed CORS origin (default: http://localhost:3001)

## Performance Considerations

1. **Middleware Order**: TenantMiddleware runs on all routes to extract tenant info
2. **Guards Order**: Combine JwtAuthGuard with RolesGuard for efficient authorization
3. **Database Queries**: Use Prisma's query optimization and relations
4. **Caching**: Consider adding caching for frequently accessed data

## Future Enhancements

- [ ] OpenAPI/Swagger documentation
- [ ] Rate limiting
- [ ] Logging and monitoring
- [ ] Cache layer (Redis)
- [ ] Event-driven architecture
- [ ] Webhook support
- [ ] Audit logging
