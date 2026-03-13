# Platform Admin Frontend

A complete React + Vite + TypeScript + TailwindCSS admin dashboard for managing Beauty Booking platform.

## Features

- **Authentication**: JWT-based login system with protected routes
- **Dashboard**: Overview with platform statistics
- **Customer Management**: List, search, create, view, and edit customers
- **Account Management**: List, search, create, view, and edit salon owner accounts
- **Salon Management**: Create and manage salons for each account
- **Pagination**: Reusable pagination component for lists
- **Responsive Design**: Clean, professional UI with TailwindCSS

## Project Structure

```
src/
├── main.tsx                 # Application entry point
├── App.tsx                  # Router configuration
├── app.css                  # TailwindCSS imports
├── lib/
│   ├── api.ts              # Axios instance with JWT interceptor
│   └── auth.ts             # Auth context and provider
├── components/
│   ├── Layout.tsx          # Main layout with sidebar
│   ├── ProtectedRoute.tsx  # Route protection wrapper
│   └── Pagination.tsx      # Reusable pagination component
└── pages/
    ├── LoginPage.tsx       # Login page
    ├── DashboardPage.tsx   # Dashboard with statistics
    ├── CustomersPage.tsx   # Customer list with search
    ├── CustomerDetailPage.tsx  # Customer details and editing
    ├── AccountsPage.tsx    # Account list with search
    └── AccountDetailPage.tsx   # Account details and salon management
```

## Installation

```bash
# Install dependencies (from monorepo root)
npm install

# Install package-specific dependencies
cd packages/platform-admin
npm install
```

## Development

```bash
# Start development server (runs on port 5174)
npm run dev

# Type checking
npm run type-check

# Build for production
npm run build

# Preview production build
npm run preview
```

## API Integration

The admin frontend connects to the Beauty Booking API with the following endpoints:

### Authentication
- `POST /api/v1/auth/login` - Login with email and password

### Customers
- `GET /api/v1/platform/customers` - List customers with pagination
- `POST /api/v1/platform/customers` - Create new customer
- `GET /api/v1/platform/customers/:id` - Get customer details
- `PUT /api/v1/platform/customers/:id` - Update customer
- `DELETE /api/v1/platform/customers/:id` - Delete customer

### Accounts
- `GET /api/v1/platform/accounts` - List accounts with pagination
- `POST /api/v1/platform/accounts` - Create new account
- `GET /api/v1/platform/accounts/:id` - Get account details
- `PUT /api/v1/platform/accounts/:id` - Update account
- `DELETE /api/v1/platform/accounts/:id` - Delete account
- `GET /api/v1/platform/accounts/:accountId/salons` - Get salons for account
- `POST /api/v1/platform/accounts/:accountId/salons` - Create salon for account

## Authentication

The app uses JWT-based authentication:

1. Token is stored in `localStorage` after login
2. Axios interceptor automatically adds `Authorization: Bearer {token}` to all requests
3. On 401 response, user is logged out and redirected to login
4. Protected routes are wrapped with `ProtectedRoute` component

## Configuration

### Vite Config
- Dev server runs on port 5174
- API requests to `/api/*` are proxied to `http://localhost:3000`

### Environment Variables
Current setup uses hardcoded `http://localhost:3000` as API base URL. To customize, update:
- `/src/lib/api.ts` - Change `baseURL` in axios config
- `/vite.config.ts` - Update proxy target

## Styling

- Uses TailwindCSS v4 with `@tailwindcss/vite` plugin
- Utility-first approach for all styling
- Responsive design with mobile-first breakpoints
- Color scheme: Blues for primary actions, greens for success, reds for delete

## Building

```bash
# Production build
npm run build

# Output goes to dist/ directory
```

## License

MIT
