# Alonica Restaurant Self-Order System

## Overview

Alonica is a mobile-first restaurant self-ordering web application built for customers to browse menus, place orders, and complete payments seamlessly. The system includes both customer-facing functionality and an admin dashboard for restaurant management. The application is designed with a clean, modern interface using a maroon and white color scheme, optimized for mobile devices (375x812px) while maintaining responsiveness across all screen sizes.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: React hooks with localStorage persistence for cart and customer data
- **UI Components**: Radix UI primitives with shadcn/ui styling system
- **Styling**: TailwindCSS with custom CSS variables for consistent theming
- **Data Fetching**: TanStack Query (React Query) for server state management
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Design**: RESTful API endpoints under `/api` namespace
- **Data Storage**: In-memory storage implementation with interface for future database integration
- **Middleware**: Request logging, JSON parsing, and error handling
- **Development**: Hot module replacement with Vite integration

### Component Architecture
- **Layout Components**: Reusable navbar, sidebar, and header components
- **Page Components**: Dedicated components for welcome, menu, cart, payment, success, and admin pages
- **UI Components**: Comprehensive design system with consistent styling
- **Design Patterns**: Custom hooks for shared logic (cart, auth, mobile detection)

### Authentication & Authorization
- **Simple Authentication**: Username/password login for admin access
- **Session Management**: Client-side storage with localStorage
- **Role-Based Access**: Admin role for dashboard access
- **Public Access**: Customer ordering flow requires no authentication

### Data Models
- **Users**: Admin accounts with username, password, and role
- **Menu Items**: Products with name, price, category, description, image, and availability
- **Orders**: Customer orders with items, totals, payment method, and status tracking
- **Inventory**: Stock management with current/min/max levels and supplier information
- **Cart Items**: Client-side cart state with quantity and notes

### Mobile-First Design
- **Responsive Design**: TailwindCSS breakpoints with mobile-first approach
- **Touch-Friendly**: Large buttons (48-56px height) and touch targets
- **Visual Design**: Maroon (#800001) primary color with clean white cards
- **Typography**: Playfair Display for branding, Inter for body text
- **Navigation**: Bottom navigation bar for mobile users

## External Dependencies

### Database & ORM
- **Drizzle ORM**: Type-safe database toolkit configured for PostgreSQL
- **Neon Database**: Serverless PostgreSQL database service
- **Database Schema**: Structured tables for users, menu items, orders, and inventory

### UI & Styling
- **Radix UI**: Accessible component primitives for complex UI patterns
- **TailwindCSS**: Utility-first CSS framework for rapid styling
- **Lucide React**: Icon library for consistent iconography
- **Google Fonts**: Playfair Display and Inter font families

### Development Tools
- **Vite**: Fast build tool with HMR and TypeScript support
- **ESBuild**: Fast JavaScript bundler for production builds
- **PostCSS**: CSS processing with Autoprefixer
- **Replit Plugins**: Development environment enhancements

### Data Management
- **TanStack Query**: Server state management and caching
- **React Hook Form**: Form state management and validation
- **Zod**: Runtime type validation and schema definition
- **date-fns**: Date manipulation and formatting utilities

### Authentication & Session
- **connect-pg-simple**: PostgreSQL session store (future implementation)
- **bcrypt**: Password hashing (planned for security enhancement)
- **Local Storage**: Client-side session persistence

### Payment Integration
- **QRIS**: Indonesian QR code payment standard (mock implementation)
- **Cash Payments**: Manual cash payment processing

### Development Environment
- **TypeScript**: Static type checking across the stack
- **Node.js**: Runtime environment for the backend
- **npm**: Package management and script execution

## Recent Changes

### October 1, 2025 - Fresh GitHub Import Successfully Configured for Replit
- ✅ **GitHub Repository Imported**: Successfully imported Alonica restaurant system to Replit
- ✅ **PostgreSQL Database Provisioned**: Created fresh Replit PostgreSQL database with all environment variables
- ✅ **Database Schema Migration**: All tables pushed successfully using `npm run db:push`
- ✅ **User Data Seeded**: 5 users created (1 admin + 4 cashiers) via `npm run seed:users`
  - Admin credentials: `admin/admin123`
  - Cashier credentials: `kasir1/kasir123`, `kasir2/kasir123`, `kasir3/kasir123`, `kasir4/kasir123`
- ✅ **Node.js 20**: Confirmed installed and operational
- ✅ **Dependencies**: All 633 npm packages installed successfully
- ✅ **Vite Configuration**: Verified `allowedHosts: true` in server/vite.ts for Replit proxy
- ✅ **Workflow Configuration**: "Start application" workflow configured with:
  - Command: `npm run dev`
  - Port: 5000 (webview output type)
  - Host: 0.0.0.0 (required for Replit)
- ✅ **Server Status**: Express + Vite running successfully on port 5000
- ✅ **Frontend Verification**: Welcome page and login page rendering correctly
- ✅ **HMR Connected**: Vite hot module replacement working
- ✅ **Code Quality**: No TypeScript errors, clean LSP diagnostics
- ✅ **Deployment Ready**: Autoscale deployment configured with proper build/start scripts
- ✅ **Import Complete**: Fully functional and ready for development

### October 1, 2025 - VPS Compatibility Fixes
- ✅ **Logout Redirect Fixed**: Logout now properly redirects to welcome page instead of showing "Access Denied"
- ✅ **File Upload System Upgraded**: Replaced ObjectUploader with simple file upload compatible with VPS local storage
- ✅ **Local File Storage**: Direct multipart form upload to `/api/objects/upload` endpoint
- ✅ **Image Validation**: Client-side validation for file type (images only) and size (5MB max)
- ✅ **Upload Error Handling**: Clear error messages for invalid files and upload failures
- ✅ **VPS Deployment Ready**: All fixes pushed and tested, ready for VPS deployment

### September 30, 2025 - Fresh GitHub Import Setup Complete
- ✅ **GitHub Repository Imported**: Successfully cloned and set up the Alonica project from GitHub
- ✅ **PostgreSQL Database**: Created and configured Replit PostgreSQL database with DATABASE_URL
- ✅ **Database Schema**: Successfully pushed all tables (users, categories, menuItems, orders, inventory, etc.) to database
- ✅ **Initial Data Seeding**: Seeded database with admin user and 4 cashier accounts (admin/admin123, kasir1/kasir123, etc.)
- ✅ **Node.js Environment**: Confirmed Node.js 20 installed and ready
- ✅ **Dependencies**: All npm packages installed and up-to-date (633 packages)
- ✅ **Vite Configuration**: Verified `allowedHosts: true` for Replit proxy compatibility in server/vite.ts
- ✅ **Workflow Setup**: Configured "Start application" workflow to run `npm run dev` on port 5000 with webview output
- ✅ **Server Running**: Express server successfully started on port 5000 with 0.0.0.0 host binding
- ✅ **Frontend Working**: React application loading correctly with Vite HMR connected
- ✅ **Storage System**: FallbackStorage configured (DatabaseStorage -> MemStorage on error)
- ✅ **Payment Integration**: Midtrans configured for mock development mode
- ✅ **Security**: CORS, Helmet, and security headers properly configured for Replit environment
- ✅ **LSP Diagnostics**: No TypeScript errors found, all code is clean and valid
- ✅ **Deployment Configuration**: Autoscale deployment ready for publishing

### September 30, 2025 - VPS Deployment Security Fixes
- ✅ **Database SSL Configuration**: Fixed SSL connection logic to support both localhost and remote databases
- ✅ **Environment Variables**: Moved all credentials from hard-coded to .env file for security
- ✅ **Ecosystem Config**: Updated PM2 config to use env_file instead of embedded secrets
- ✅ **Deployment Script**: Enhanced vps-quick-deploy.sh with credential validation and safe operations
- ✅ **Security Template**: Created comprehensive .env.example with proper documentation
- ✅ **Git Security**: Ensured .env is in .gitignore to prevent credential leaks
- ✅ **Documentation**: Created VPS-DEPLOYMENT-QUICKSTART.md for easy deployment

### Project Status
- ✅ Database provisioned and schema migrated
- ✅ Initial user data seeded successfully
- ✅ Development server running on port 5000 
- ✅ Frontend/backend integration working perfectly
- ✅ Vite HMR connected and functional 
- ✅ All security and CORS headers properly configured
- ✅ Ready for development and testing
- ✅ Deployment configuration ready for production publishing
- ✅ **VPS deployment ready with secure credential management**

### VPS Deployment Requirements

**Environment Configuration (Required):**
Create `.env` file from `.env.example` with these minimum requirements:
```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://alonica_user:YOUR_PASSWORD@localhost:5432/alonica_db
DATABASE_SSL=false
SESSION_SECRET=your_generated_secret_here
JWT_SECRET=your_generated_secret_here
```

**Quick Deploy to VPS:**
1. Create `.env` file with proper credentials
2. Setup PostgreSQL database with permissions
3. Run: `bash scripts/vps-quick-deploy.sh`

**Production Checklist:**
- [x] Set up persistent database (PostgreSQL)
- [x] Secure credential management (.env file)
- [x] Database permissions properly configured
- [x] PM2 process management ready
- [ ] Configure real Midtrans payment keys (optional)
- [ ] Set up HTTPS with valid SSL certificate
- [ ] Configure Nginx reverse proxy
- [ ] Test end-to-end payment flow

**Security Notes:**
- ✅ No hard-coded credentials in code
- ✅ .env file for secure environment configuration
- ✅ SSL auto-detection (false for localhost, true for remote)
- ✅ Database permissions with proper grants
- ✅ All sensitive endpoints require authentication
- ✅ Rate limiting configured for security

**Documentation:**
- Quick Start: `VPS-DEPLOYMENT-QUICKSTART.md`
- Full Guide: `PANDUAN-DEPLOY-VPS.md`
- Environment Template: `.env.example`