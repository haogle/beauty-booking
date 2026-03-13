# NestJS API Setup Guide

## Project Structure Complete

All core NestJS API files have been created for the beauty booking SaaS platform.

## Files Created

### Configuration Files
- **package.json** - NestJS project configuration with all required dependencies
- **tsconfig.json** - TypeScript compiler configuration with strict mode enabled
- **nest-cli.json** - NestJS CLI configuration
- **.env.example** - Environment variables template
- **.gitignore** - Git ignore patterns

### Application Core
- **src/main.ts** - Bootstrap application on port 3000 with CORS and validation
- **src/app.module.ts** - Root module with all imports and global providers

### Prisma Database Layer
- **src/prisma/prisma.service.ts** - Prisma client extending with lifecycle hooks
- **src/prisma/prisma.module.ts** - Global module exporting PrismaService

### Authentication
- **src/auth/auth.module.ts** - Auth module with JWT and Passport configuration
- **src/auth/strategies/jwt.strategy.ts** - JWT validation strategy

### Common Utilities

#### Decorators
- **src/common/decorators/current-user.decorator.ts** - Extract user from request
- **src/common/decorators/roles.decorator.ts** - @Roles() decorator for role-based access
- **src/common/decorators/permissions.decorator.ts** - @RequirePermissions() decorator

#### Guards
- **src/common/guards/jwt-auth.guard.ts** - JWT authentication guard
- **src/common/guards/roles.guard.ts** - Role hierarchy guard (OWNER > RECEPTIONIST > TECHNICIAN)
- **src/common/guards/tenant.guard.ts** - Multi-tenant isolation guard

#### Filters & Interceptors
- **src/common/filters/http-exception.filter.ts** - Global exception handler
- **src/common/interceptors/transform.interceptor.ts** - Response transformation wrapper

#### Middleware
- **src/common/middleware/tenant.middleware.ts** - Tenant extraction from JWT

### Feature Modules
- **src/platform/platform.module.ts** - Platform-level features (placeholder)
- **src/salon/salon.module.ts** - Salon management (placeholder)

### Documentation
- **README.md** - Comprehensive API documentation
- **SETUP_GUIDE.md** - This file

## Getting Started

### 1. Install Dependencies
```bash
cd packages/api
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Setup Database
```bash
npm run migrate:dev
npm run generate
```

### 4. Start Development Server
```bash
npm run start:dev
```

The API will be available at `http://localhost:3000`

## Key Features Implemented

### Authentication & Authorization
- JWT-based authentication with Passport.js
- Role-based access control (RBAC) with hierarchy
- User context extraction via decorators
- Permission-based access control decorator

### Multi-Tenancy
- TenantMiddleware extracts salonId from JWT
- TenantGuard ensures cross-tenant isolation
- User object includes: userId, accountId, salonId, role, permissions

### Request/Response Handling
- Global ValidationPipe for DTO validation
- StandardTransformInterceptor wraps all responses
- GlobalHttpExceptionFilter for error handling
- CORS enabled for frontend communication

### Architecture
- Modular design with feature modules
- Global middleware for tenant context
- Dependency injection throughout
- Proper separation of concerns

## Role Hierarchy

The RolesGuard implements hierarchical role checking:

```
OWNER (Level 3)
  └─ RECEPTIONIST (Level 2)
      └─ TECHNICIAN (Level 1)
```

Higher roles can access endpoints marked for lower roles.

### Usage Example

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER', 'RECEPTIONIST')
@Get(':salonId/bookings')
getBookings(
  @CurrentUser() user: CurrentUser,
  @Param('salonId') salonId: string,
) {
  // Only OWNER and RECEPTIONIST (and above) can access
  return this.bookingService.findBySalon(salonId);
}
```

## Response Format

All successful responses are wrapped:

```json
{
  "data": { /* response data */ },
  "timestamp": "2024-03-13T10:30:00.000Z"
}
```

## Error Format

All errors follow a standard format:

```json
{
  "code": "FORBIDDEN",
  "message": "You do not have access to this resource",
  "details": null,
  "timestamp": "2024-03-13T10:30:00.000Z",
  "path": "/api/salons/123"
}
```

## Next Steps

1. **Create Prisma Schema** - Define database models in `prisma/schema.prisma`
2. **Implement Feature Controllers** - Add controllers in platform and salon modules
3. **Add Services** - Create business logic services
4. **Create DTOs** - Define request/response objects
5. **Add Tests** - Implement unit and e2e tests
6. **API Documentation** - Add Swagger/OpenAPI documentation

## Available Scripts

- `npm run start:dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start:prod` - Run production build
- `npm run migrate:dev` - Run database migrations
- `npm run migrate:deploy` - Deploy migrations to production
- `npm run generate` - Generate Prisma client
- `npm run test` - Run tests
- `npm run lint` - Fix linting issues

## Security Notes

- Change JWT_SECRET in production
- Use HTTPS in production
- Validate all user inputs (ValidationPipe enabled)
- Implement rate limiting
- Add CSRF protection if needed
- Use environment variables for secrets
- Enable database backups

## Troubleshooting

### Port already in use
Change PORT in .env or set via environment: `PORT=3001 npm run start:dev`

### Database connection issues
Verify DATABASE_URL in .env matches your database setup

### JWT token issues
Ensure JWT_SECRET is set and consistent across sessions

For more help, see README.md
