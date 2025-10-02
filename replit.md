# Alonica Restaurant Self-Order System

## Overview
Alonica is a mobile-first web application for restaurants, enabling customers to browse menus, place orders, and make payments seamlessly. It includes a customer-facing interface and an admin dashboard for management. The system aims to enhance customer experience and streamline restaurant operations through a clean, modern UI with a maroon and white color scheme, responsive across all devices.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React with TypeScript (Vite)
- **Routing**: Wouter
- **State Management**: React hooks with localStorage
- **UI Components**: Radix UI primitives with shadcn/ui
- **Styling**: TailwindCSS, custom CSS variables
- **Data Fetching**: TanStack Query
- **Form Handling**: React Hook Form with Zod
- **UI/UX Design**: Mobile-First, responsive design, maroon (#800001) and white color scheme, Playfair Display & Inter fonts, bottom navigation bar for mobile, horizontal scrollable menu categories, real-time menu search, admin approval for item cancellations.

### Backend
- **Framework**: Express.js with TypeScript
- **API Design**: RESTful API (`/api` namespace)
- **Data Storage**: In-memory storage with an interface for PostgreSQL via Drizzle ORM
- **Middleware**: Request logging, JSON parsing, error handling
- **Authentication**: Simple username/password for admin, client-side session via localStorage, role-based access.

### Data Models
- **Users**: Admin accounts (username, password, role)
- **Menu Items**: Name, price, category, description, image, availability
- **Orders**: Items, totals, payment method, status
- **Inventory**: Stock levels, supplier info
- **Cart Items**: Client-side quantity and notes

### System Design Choices
- **UI/UX**: Prioritizes mobile-first, clean, minimalist design (ShopZen-inspired) with consistent branding.
- **Data Handling**: Robust form validation and state management.
- **Security**: Admin approval for critical operations (e.g., item cancellation).
- **Flexibility**: Open bill editing allows dynamic order modifications.
- **Deployment**: Configured for Replit environment with autoscale deployment.

## External Dependencies

### Database & ORM
- **Neon Database**: Serverless PostgreSQL
- **Drizzle ORM**: Type-safe database toolkit

### UI & Styling
- **Radix UI**: Accessible component primitives
- **TailwindCSS**: Utility-first CSS framework
- **Lucide React**: Icon library
- **Google Fonts**: Playfair Display, Inter

### Data Management
- **TanStack Query**: Server state management
- **React Hook Form**: Form state management
- **Zod**: Runtime type validation
- **date-fns**: Date manipulation

### Authentication & Session
- **connect-pg-simple**: PostgreSQL session store
- **bcrypt**: Password hashing
- **Local Storage**: Client-side session persistence

### Payment Integration
- **QRIS**: Indonesian QR code payment standard (mock implementation)
- **Cash Payments**: Manual processing

## Replit Environment Setup

### Database Configuration
- **Database**: PostgreSQL provisioned in Replit (October 2, 2025)
- **Schema Management**: Drizzle ORM with push-based migrations
- **Initial Setup**: Users seeded with admin and kasir accounts
  - Admin: username `admin`, password `admin123`
  - Kasir accounts: `kasir1` (kasir123), `kasir2` (kasir456), `kasir3` (kasir789), `kasir4` (kasir000)
- **Commands**:
  - `npm run db:push`: Push schema changes to database
  - `npm run seed:users`: Seed initial user accounts

### Development Workflow
- **Command**: `npm run dev`
- **Port**: 5000 (configured for Replit)
- **Host**: 0.0.0.0 (required for Replit proxy)
- **Vite Config**: `allowedHosts: true` enabled in server/vite.ts for Replit iframe proxy
- **Workflow**: Configured with webview output type for frontend preview

### Deployment Configuration
- **Target**: Autoscale (stateless web application)
- **Build**: `npm run build` (Vite frontend + esbuild backend)
- **Start**: `npm run start` (production server on port 5000)
- **Database**: Automatic schema push on deployment via `deploy:setup` script
- **Pre-deployment**: Ensure database is seeded with `npm run seed:users`

### Key Files
- `server/index.ts`: Express server with Vite middleware in development, serves on 0.0.0.0:5000
- `server/vite.ts`: Vite configuration with `allowedHosts: true` for Replit proxy
- `server/db.ts`: PostgreSQL connection pool with SSL auto-detection
- `server/storage.ts`: Database storage interface using Drizzle ORM
- `shared/schema.ts`: Drizzle schema definitions with all tables
- `scripts/seed-users.ts`: Initial user seeding script

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string (auto-configured by Replit)
- `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`: Database credentials
- `NODE_ENV`: development/production
- `PORT`: Server port (defaults to 5000)

### Recent Changes (October 2, 2025)
- ✅ **Fresh Replit Environment Setup - Latest (October 2, 2025)**:
  - Successfully configured fresh GitHub import for Replit environment
  - Database already configured with Replit PostgreSQL (helium database)
  - Database schema verified and up-to-date via `npm run db:push`
  - Initial users successfully seeded (1 admin + 4 cashiers) via `npm run seed:users`
  - Workflow properly configured:
    - Name: "Start application"
    - Command: `npm run dev`
    - Port: 5000 with webview output type
    - Host: 0.0.0.0 for Replit proxy compatibility
  - Vite configuration validated:
    - `allowedHosts: true` enabled in server/vite.ts for Replit iframe proxy
    - HMR (Hot Module Replacement) working correctly
  - Application fully functional:
    - ✅ Welcome page loads correctly
    - ✅ Login page loads correctly
    - ✅ Server running on port 5000
    - ✅ Vite dev server connected
  - Deployment configuration verified:
    - Target: Autoscale (stateless web application)
    - Build: `npm run build` (Vite frontend + esbuild backend)
    - Run: `npm run start` (production server)
  - All existing features preserved:
    - FallbackStorage system (PostgreSQL with in-memory fallback)
    - CORS and security middleware configured
    - Session management via connect-pg-simple
    - Authentication system with bcrypt password hashing

- ✅ **Previous Session - Data Synchronization Fixes (October 2, 2025)**:
  - **Fixed: Promo tidak muncul di POS dan Customer Page**
    - Added missing `/api/discounts/active` public endpoint in `server/routes.ts`
    - Endpoint now accessible without authentication for customer and POS pages
    - Tested and verified working (200 OK in server logs)
  - **Fixed: Open Bill Payment Total Bug**
    - Payment calculator dialog now uses `currentPaymentTotal` instead of cart `total`
    - Customer name displays correctly from `paymentContext` for open bills
    - All validations and change calculations use `paymentContext.total`
  - **UI Improvements: Payment Method Icons**
    - Replaced emoji icons (💵, 📱) with Lucide React icons (Banknote, Smartphone)
    - More professional and consistent UI appearance

- ✅ **Previous Session Changes**:
  - Fixed open bill calculation bug in cashier dashboard (showing 0 instead of actual amount)
  - Added Kitchen System (KDS) to admin dashboard sidebar
  - Fixed syntax error in cashier.tsx (missing closing brace)

### Previous Session Changes
- ✅ GitHub import successfully configured for Replit environment
- ✅ FallbackStorage system in place (PostgreSQL with in-memory fallback)
- ✅ Vite dev server configured with `allowedHosts: true` for Replit proxy
- ✅ Server configured to bind to 0.0.0.0:5000 for Replit webview
- ✅ Fixed discount page: changed API endpoint from `/api/menu-items` to `/api/menu`
- ✅ Enhanced Recent Orders page: added Payment Status column with color-coded badges (Paid/Pending/Failed/Expired/Unpaid/Refunded), cleaned up empty state padding
- ✅ Fixed cashier page: Resolved "Cannot access getItemDiscount before initialization" error by moving discount helper functions before usage
- ✅ Fixed discount save error: Changed date transformation from ISO strings to Date objects to match backend expectations
- ✅ Enhanced Reservations page: 
  - Day mode: Shows traditional time-slot grid with hourly slots
  - Week/Month mode: Modern date card layout with large date numbers, no time slots
  - Reservations grouped by date in clean, modern card design
  - Today's date highlighted with visual indicator
  - All reservation actions (confirm, complete, cancel) preserved in both views