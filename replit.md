# Alonica Restaurant Self-Order System

## Overview
Alonica is a mobile-first web application for restaurants, designed to enhance customer experience and streamline operations. It provides a seamless way for customers to browse menus, place orders, and make payments. The system features a modern, responsive UI with a maroon and white color scheme and includes both a customer-facing interface and an administrative dashboard for restaurant management. The business vision is to improve efficiency and customer satisfaction in the restaurant industry.

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
- **UI/UX Design**: Mobile-First, responsive design, maroon (#800001) and white color scheme, Playfair Display & Inter fonts, bottom navigation bar for mobile, horizontal scrollable menu categories, real-time menu search, admin approval for item cancellations, compact horizontal table layout for open bills in admin dashboard, two distinct modes for editing open bills (wholesale replacement and item-level deletion requiring admin approval).
- **Reservation Page**: Redesigned with appointment calendar layout including a mini calendar sidebar, upcoming reservations list, calendar/log view toggle, English filter buttons (Daily, Weekly, Monthly), clickable reservations opening detail popups, and a visual progress tracker.

### Backend
- **Framework**: Express.js with TypeScript
- **API Design**: RESTful API (`/api` namespace)
- **Data Storage**: PostgreSQL via Drizzle ORM
- **Middleware**: Request logging, JSON parsing, error handling, Helmet (security), CORS
- **Authentication**: Passport.js with local strategy, session-based auth with PostgreSQL session store, role-based access (admin/kasir), httpOnly cookie authentication.
- **File Storage**: Local file storage for uploads
- **Performance Optimization**: Database indexing, API pagination and filtering for Orders, Menu, and Reservations. Hybrid pagination approach for admin orders page (50 orders per page in default view, full dataset when filters active). Reduced polling interval from 3s to 30s to minimize server load with large datasets (12,000+ orders).

### Data Models
- **Users**: Admin accounts (username, password, role)
- **Menu Items**: Name, price, category, description, image, availability
- **Orders**: Items, totals, payment method, status
- **Inventory**: Stock levels, supplier info
- **Cart Items**: Client-side quantity and notes

### System Design Choices
- **UI/UX**: Prioritizes mobile-first, clean, minimalist design with consistent branding and standardized typography.
- **Data Handling**: Robust form validation and state management.
- **Security**: Admin approval for critical operations (e.g., item cancellation, item deletion from kitchen-bound orders), httpOnly cookies for session management to protect against XSS.
- **Flexibility**: Open bill editing allows dynamic order modifications.
- **Deployment**: Configured for Replit environment with autoscale deployment.
- **Admin Approval System**: Real-time notification system for item deletion requests, with admin-only approval/rejection and audit trails, managed via a unified interface at `/admin/approvals`.

## Replit Setup

This project has been configured to run in the Replit environment:

### Development
- **Workflow**: `npm run dev` - Runs the development server on port 5000
- **Database**: PostgreSQL database provisioned via Replit
- **Schema**: Database schema automatically pushed via `npm run db:push`
- **Seed Data**: 
  - User accounts seeded via `npm run seed:users`
  - Demo data seeded via `npm run seed:fake-data`

### Login Credentials
- **Admin**: username: `admin`, password: `admin123`
- **Cashier 1**: username: `kasir1`, password: `kasir123`
- **Cashier 2**: username: `kasir2`, password: `kasir123`
- **Cashier 3**: username: `kasir3`, password: `kasir123`
- **Cashier 4**: username: `kasir4`, password: `kasir123`

### Deployment
- **Target**: Autoscale deployment (stateless web app)
- **Build**: `npm run build` (compiles frontend with Vite and backend with esbuild)
- **Run**: `npm run start` (runs production server from dist/)
- **Port**: 5000 (frontend and backend served on same port)

### Environment Configuration
- **Host**: Frontend dev server binds to `0.0.0.0:5000` with `allowedHosts: ["*"]` for Replit proxy
- **Database**: Uses `DATABASE_URL` environment variable (auto-configured by Replit)
- **File Storage**: Local file storage for uploads
- **Sessions**: PostgreSQL-based session storage with httpOnly cookies

## External Dependencies

### Database & ORM
- **Replit PostgreSQL**: Built-in database service
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
- **httpOnly Cookies**: Secure session management (XSS protection)
- **Cookie-Parser**: For cookie handling

### Payment Integration
- **QRIS**: Indonesian QR code payment standard (mock implementation)
- **Cash Payments**: Manual processing