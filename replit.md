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

### Backend
- **Framework**: Express.js with TypeScript
- **API Design**: RESTful API (`/api` namespace)
- **Data Storage**: PostgreSQL via Drizzle ORM (using Replit's built-in database)
- **Middleware**: Request logging, JSON parsing, error handling, Helmet (security), CORS
- **Authentication**: Passport.js with local strategy, session-based auth with PostgreSQL session store, role-based access (admin/kasir)
- **File Storage**: Local file storage for uploads

### Data Models
- **Users**: Admin accounts (username, password, role)
- **Menu Items**: Name, price, category, description, image, availability
- **Orders**: Items, totals, payment method, status
- **Inventory**: Stock levels, supplier info
- **Cart Items**: Client-side quantity and notes

### System Design Choices
- **UI/UX**: Prioritizes mobile-first, clean, minimalist design (ShopZen-inspired) with consistent branding and a standardized typography system (Inter for dashboards, Playfair Display for customer-facing brand elements).
- **Data Handling**: Robust form validation and state management.
- **Security**: Admin approval for critical operations (e.g., item cancellation, item deletion from kitchen-bound orders).
- **Flexibility**: Open bill editing allows dynamic order modifications.
- **Deployment**: Configured for Replit environment with autoscale deployment.
- **Admin Approval System**: Real-time notification system for item deletion requests, with admin-only approval/rejection and audit trails.

## Replit Environment Setup

### Current Configuration (October 3, 2025) - GitHub Import Completed Successfully
This project was freshly imported from GitHub and successfully configured for Replit:
- **Database**: PostgreSQL provisioned and schema pushed successfully ✅
- **Workflow**: "Start application" running on port 5000 with webview output type ✅
- **Dev Server**: Express + Vite with HMR enabled, allowedHosts: true configured for Replit proxy ✅
- **Seeded Data**: Admin and kasir accounts created (admin/admin123, kasir1-4/kasir123) ✅
- **Deployment**: Configured for autoscale with build and production scripts ✅
- **All dependencies**: Pre-installed and ready to use ✅
- **Application Status**: Running successfully on port 5000, customer interface and login page verified working ✅
- **Import Date**: October 3, 2025 - Fresh GitHub clone configured for Replit environment
- **Setup Verified**: Screenshots confirm welcome page and login page render correctly with proper styling
- **Unified Approval Management**: Single-page interface at `/admin/approvals` with three tabs:
  - **Pending Approvals**: Real-time notifications for deletion requests from kasir (3s polling)
  - **Deletion History**: Complete audit trail of approved/deleted items (5s polling)
  - **PIN Management**: Generate and manage admin PINs for deletion authorization (5s polling)
  - **Sync Strategy**: All mutations invalidate both `/api/notifications` and `/api/deletion-logs` for guaranteed consistency

### Running the Application
1. **Development**: `npm run dev` - Starts Express server with Vite middleware on port 5000
2. **Build**: `npm run build` - Builds frontend and backend for production
3. **Production**: `npm run start` - Runs production server
4. **Database Push**: `npm run db:push` - Syncs schema changes to database

### Seeded User Accounts
- **admin** / admin123 (Administrator)
- **kasir1** / kasir123 (Kasir - Shift Pagi)
- **kasir2** / kasir123 (Kasir - Shift Siang)
- **kasir3** / kasir123 (Kasir - Shift Sore)
- **kasir4** / kasir123 (Kasir - Shift Weekend)

## External Dependencies

### Database & ORM
- **Replit PostgreSQL**: Built-in database service
- **Drizzle ORM**: Type-safe database toolkit
- **Database Schema**: Pushed and ready with seeded user accounts

### UI & Styling
- **Radix UI**: Accessible component primitives
- **TailwindCSS**: Utility-first CSS framework
- **Lucide React**: Icon library
- **Google Fonts**: Playfair Display, Inter
- **Reservation Page**: Redesigned with appointment calendar layout
  - Mini calendar sidebar for date selection
  - Upcoming reservations list (max 10 upcoming)
  - Calendar/Log view toggle
  - English filter buttons (Daily, Weekly, Monthly)
  - Clickable reservations open detail popup
  - Visual progress tracker (3 stages: Pending → Confirmed → Completed/Cancelled)

### Data Management
- **TanStack Query**: Server state management
- **React Hook Form**: Form state management
- **Zod**: Runtime type validation
- **date-fns**: Date manipulation

### Authentication & Session
- **connect-pg-simple**: PostgreSQL session store
- **bcrypt**: Password hashing
- **httpOnly Cookies**: Secure session management (XSS protection)

### Payment Integration
- **QRIS**: Indonesian QR code payment standard (mock implementation)
- **Cash Payments**: Manual processing

## Recent Changes (October 3, 2025)

### Performance & UX Improvements (October 3, 2025 - Latest)
1. **Enhanced Reservation Calendar UI**: Improved visibility and usability
   - Added visual dot indicators on calendar dates that have reservations
   - Optimized time slot display to fit full schedule in one screen (no scrolling needed)
   - Reduced time slot height from 96px to 48px (13 slots now fit in 624px)
   - Adjusted font sizes and spacing for better readability in compact view
   - Calendar now shows clear indicators making it easy to spot busy dates

2. **Fixed Blank Screen on Financial Reports Page**: Fixed TypeError on Laporan Keuangan page
   - Bug: `S.filter is not a function` error causing blank screen on financial reports
   - Root cause: Data from API sometimes not returned as arrays
   - Fix: Added `Array.isArray()` safety checks in audit-reports.tsx and analytics.tsx
   - Protected all `.filter()`, `.map()`, `.reduce()` operations with array validation
   - Now handles edge cases when server returns null/undefined gracefully

2. **Initial Loading Screen**: Implemented loading spinner for better first-load experience
   - Added inline CSS loading spinner in index.html that shows immediately on page load
   - Designed with brand maroon color (#800001) and Playfair Display font
   - Smooth fade-out transition (0.5s) when React is ready
   - Eliminates blank/dark screen during initial JS/CSS load
   - Improves perceived performance and user experience

### UI Consistency & Theming Fixes (October 3, 2025 - Previous)
1. **Admin Login Dialog Loading State**: Fixed loading state in welcome page admin login dialog
   - Added proper loading state with "Memproses..." text on button and disabled inputs
   - Eliminates blank screen during authentication process
   - Consistent with main login page behavior

2. **Admin Sidebar Spacing**: Synchronized spacing with kasir dashboard
   - Changed main content padding from `lg:pl-64` to `lg:pl-20`
   - Matches kasir dashboard's hover-to-expand sidebar behavior
   - Sidebar collapses to w-20, expands to w-64 on hover with content overlay
   - Consistent UX between admin and kasir dashboards

3. **Printer Management Theme**: Updated color scheme to match brand colors
   - Changed from blue theme to maroon/primary theme
   - Updated background to use neutral `bg-background` instead of blue gradient
   - Icon and text now use primary maroon color (`text-primary`, `bg-primary/10`)
   - Consistent with overall app branding

4. **Admin Header Gap Fix**: Removed desktop header to match kasir dashboard layout
   - Header now only shows on mobile (`lg:hidden`), hidden on desktop
   - Eliminates gap between sidebar and content on desktop
   - Maintains mobile functionality with menu toggle and logout buttons
   - Complete layout consistency between admin and kasir dashboards

### Pre-VPS Deployment Bug Fixes (October 3, 2025 - Previous)
1. **Login Page Text Fix**: Removed "Login Dashboard" text that appeared during login
   - Login page now displays only "Sistem Self-Order" subtitle for cleaner UX
   - Simplified login branding for better user experience

2. **Item Deletion Real-time Sync Fix**: Enhanced query invalidation for immediate UI updates
   - Added forced refetch queries after admin approval/rejection in notification bell component
   - Added forced refetch queries in approvals page for consistent behavior
   - Ensures kasir dashboard sees deleted items immediately without manual refresh
   - Invalidates multiple query keys: `/api/orders`, `/api/orders/open-bills`, `/api/notifications`, `/api/deletion-logs`

3. **Admin Sidebar Redesign**: Synchronized admin sidebar with kasir sidebar behavior
   - Implemented hover-to-expand pattern (collapsed: w-20, expanded: w-64)
   - Maintains mobile drawer functionality with bottom sheet
   - Consistent UX between admin and kasir dashboards
   - Desktop: Sidebar collapses by default, expands on hover
   - Mobile: Full drawer with proper navigation

4. **Financial Reports Verification**: Confirmed error handling is working correctly
   - All 6 data queries have comprehensive error handling
   - Error state UI with reload button working as expected
   - Date filtering using inclusive comparison (>= <=) to prevent data loss

### Bug Fixes - Replit Environment (Previous)
1. **Admin Login Dialog Success Toast Fix**: Removed intermediate success screen from welcome page admin login
   - Fixed welcome page admin login to redirect immediately without showing "Login berhasil" toast
   - Updated to use auth hook's user object instead of localStorage (consistent with httpOnly cookie auth)
   - Added useEffect to handle automatic redirect after successful login
   - Matches behavior of main login page for consistent user experience

### Bug Fixes - Pre-Deployment VPS
1. **Login Delay Fix**: Removed intermediate success screen causing gray background delay during login
   - Direct redirect to dashboard after authentication
   - Improved user experience with instant login feedback

2. **Reservation Page Fix**: Fixed blank page issue 
   - Added date transformation in useQuery select to convert API string dates to Date objects
   - Resolved runtime errors from treating date strings as Date objects

3. **Audit Reports Fix**: Fixed blank credit balance report page
   - Added comprehensive error handling for all 6 data queries (shifts, users, expenses, cashMovements, auditLogs, deletionLogs)
   - Added error state UI with reload button
   - Fixed date filtering bug using inclusive comparison (>= <=) instead of exclusive (isAfter/isBefore) to prevent data loss

### Security Improvements - CRITICAL
4. **httpOnly Cookie Authentication**: Migrated from localStorage tokens to secure httpOnly cookies
   - **BREAKING CHANGE**: All users must log in again after this update
   - Protects against XSS attacks (localStorage tokens were vulnerable)
   - Backend: Session tokens stored in httpOnly cookies with secure/sameSite flags
   - Frontend: Removed all localStorage token usage, cookies sent automatically with credentials: 'include'
   - New endpoint: `/api/auth/me` for session validation on page load
   - Session cookies: httpOnly=true, secure (production only), sameSite=lax, maxAge=24h

### Technical Details
- **Cookie-Parser**: Installed and configured for cookie handling
- **CORS**: Updated to support credentials with all origins
- **Auth Flow**: Login → Set httpOnly cookie → Validate via /api/auth/me → Automatic cookie inclusion in all requests
- **Logout**: Clears httpOnly cookie server-side

### Migration Notes
- Old sessions using Bearer tokens will not work
- Users must log out and log in again to get new httpOnly cookie session
- No data loss - only authentication mechanism changed