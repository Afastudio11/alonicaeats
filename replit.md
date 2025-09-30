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

### Project Status
- ✅ Database provisioned and schema migrated
- ✅ Initial user data seeded successfully
- ✅ Development server running on port 5000 
- ✅ Frontend/backend integration working perfectly
- ✅ Vite HMR connected and functional 
- ✅ All security and CORS headers properly configured
- ✅ Ready for development and testing
- ✅ Deployment configuration ready for production publishing

### VPS Deployment Requirements

**Critical Environment Variables for Production:**
```bash
# Required for payment processing
MIDTRANS_SERVER_KEY=your_midtrans_server_key
MIDTRANS_CLIENT_KEY=your_midtrans_client_key

# Application settings
NODE_ENV=production
PORT=3000

# Database (if using persistent storage)
DATABASE_URL=your_database_connection_string
```

**Production Checklist:**
- [ ] Set up persistent database (PostgreSQL recommended)
- [ ] Configure real Midtrans payment keys
- [ ] Set up HTTPS with valid SSL certificate
- [ ] Configure Nginx reverse proxy
- [ ] Set up PM2 for process management
- [ ] Configure webhook URL at Midtrans dashboard
- [ ] Test end-to-end payment flow

**Security Notes:**
- Mock payments are disabled in production
- Application will exit if Midtrans keys are missing in production
- All sensitive endpoints require authentication
- Rate limiting is configured for security