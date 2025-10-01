# Alonica Restaurant Self-Order System

## Overview
Alonica is a mobile-first web application designed for restaurant customers to seamlessly browse menus, place orders, and make payments. It includes both customer-facing features and an admin dashboard for restaurant management. The system prioritizes a clean, modern UI with a maroon and white color scheme, optimized for mobile devices but responsive across all screen sizes. The project's ambition is to provide a comprehensive, user-friendly self-ordering solution for restaurants, enhancing customer experience and streamlining operations.

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

### Backend
- **Framework**: Express.js with TypeScript
- **API Design**: RESTful API (`/api` namespace)
- **Data Storage**: In-memory storage with interface for future database integration (currently Drizzle ORM with PostgreSQL)
- **Middleware**: Request logging, JSON parsing, error handling
- **Authentication**: Simple username/password for admin, client-side session via localStorage, role-based access.

### Data Models
- **Users**: Admin accounts (username, password, role)
- **Menu Items**: Name, price, category, description, image, availability
- **Orders**: Items, totals, payment method, status
- **Inventory**: Stock levels, supplier info
- **Cart Items**: Client-side quantity and notes

### UI/UX Design
- **Mobile-First**: Responsive design with TailwindCSS, touch-friendly elements.
- **Visuals**: Maroon (#800001) primary color, white cards, Playfair Display (branding), Inter (body text).
- **Navigation**: Bottom navigation bar for mobile.
- **Features**: Horizontal scrollable menu categories, real-time menu search, admin approval for item cancellations.

## External Dependencies

### Database & ORM
- **Neon Database**: Serverless PostgreSQL
- **Drizzle ORM**: Type-safe database toolkit

### UI & Styling
- **Radix UI**: Accessible component primitives
- **TailwindCSS**: Utility-first CSS framework
- **Lucide React**: Icon library
- **Google Fonts**: Playfair Display, Inter

### Development Tools
- **Vite**: Fast build tool
- **ESBuild**: Fast JavaScript bundler
- **PostCSS**: CSS processing
- **TypeScript**: Static type checking
- **Node.js**: Runtime environment
- **npm**: Package manager

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

## Recent Changes

### October 1, 2025 - Menu UI/UX Standardization & Open Bill Flexibility Enhancement
- ✅ **Menu Name Standardization**: Unified all menu labels across Admin and Kasir dashboards for consistency
  - Point of Sale (POS): Replaces "Kasir Manual" / "POS"
  - Daftar Pesanan POS: Replaces "Menu Order" / "POS Orders"
  - Sistem Dapur (KDS): Replaces "Dapur"
  - Laporan Penjualan: Replaces "Laporan Harian" / "Sales Report"
  - Pengaturan Printer: Replaces "Printer Settings" / "Print Settings"
  - Manajemen Meja/Reservasi: Replaces "Reservasi" / "Table Orders"

- ✅ **Open Bill Flexibility Enhancement**: Modified backend logic to allow adding/editing items to Open Bills at ANY time
  - Previous limitation: Could only edit when orderStatus='queued'
  - New behavior: Can edit as long as payLater=true and paymentStatus!='paid'
  - Benefits: Kasir can add items to Open Bill even after some items are being prepared/served
  - Implementation: Updated `updateOpenBillItems()`, `replaceOpenBillItems()`, and `getOpenBillByTable()` in server/storage.ts

- ✅ **Admin Approval System Verified**: Item deletion from Open Bills requires admin credentials
  - Delete button triggers admin approval dialog (not direct deletion)
  - Admin must enter username and password for verification via `/api/auth/verify-admin` endpoint
  - Only after successful verification can the item be removed
  - Audit trail maintained with admin username who approved the deletion

**Technical Implementation:**
- Backend checks: `!currentOrder.payLater || currentOrder.paymentStatus === 'paid'` instead of `orderStatus !== 'queued'`
- Frontend: TypeScript type updated to support 'open_bill' payment context mode
- Security: Admin approval enforced at UI level with server-side credential verification

**Security Note (from Architect Review):**
- Current admin approval is enforced client-side with server verification
- For enhanced security, consider adding server-side middleware to block item deletion endpoints without admin token
- All user passwords should be migrated to bcrypt (some legacy plaintext support still exists)

### October 1, 2025 - ShopZen-Inspired UI/UX Redesign (Phase 1 - PARTIALLY COMPLETED)
- ✅ **Admin & Kasir Sidebar Redesign**: Implemented clean, minimalist ShopZen-style navigation
  - Modern header with logo badge and brand name
  - Subtle hover states with muted colors
  - Active state using primary color (bg-primary/10 background)
  - Fixed scroll behavior with flex layout
  - Category headers with proper spacing (11px uppercase)
  - Menu naming updated: "Meja/Reservasi" → "Reservasi"
  - Appropriate icons: Calendar for Reservasi and Sales Reports
  - Dark mode compatible with theme tokens

- ✅ **Orders Dashboard Redesign**: Modern ShopZen-style layout implemented
  - **Summary Cards**: Redesigned with primary color emphasis
    - Revenue card uses text-primary for emphasis
    - Icon backgrounds with primary/10 opacity
    - Trend indicators with green/orange colors
    - Hover shadow effects
    - Rounded borders and modern spacing
  - **Search & Filters**: Prominent search bar implementation
    - Full-width search input with Search icon
    - Focus states (ring-primary/20, border-primary)
    - Compact status and date filters
    - Search works across: customer name, order ID, table number, item names
  - **Table Improvements**:
    - Items column shows "X items" as clickable link
    - Cleaner, more compact presentation
    - Status badges preserved
    - Dark mode compatible (bg-background)
    - Cancelled status added to filter options

- 🔄 **REMAINING TASKS** (To Continue Later):
  1. **POS Dashboard Redesign** - client/src/pages/admin/cashier.tsx (1858 lines)
     - Implement modern mobile-first layout like Kans Resto reference
     - Customer Information section redesign
     - Search Bar prominence
     - Menu Grid with horizontal category scrolling
  2. **Special Discount Section** - Add to POS Dashboard
     - Create "Special Discount Today" display
     - Show discount percentage badge
     - Strikethrough old price (harga coret)
     - Display new discounted price
     - Timer countdown for discount end time
  3. **Cart/Current Order Module** - Redesign in POS
     - Modern Payment Summary display
     - Subtotal, Tax, Total Diskon, Total Akhir
     - Payment method buttons (QRis, Cash, Debit, e-Money)
     - Clean, card-based design

**Design Reference Files** (attached_assets/):
- Screenshot 2025-10-01 180739_1759317521147.png (Kans Resto mobile POS)
- Screenshot 2025-10-01 181225_1759317521148.png (Kans Resto desktop POS)
- Screenshot 2025-10-01 181320_1759317521147.png (ShopZen Orders table)
- Screenshot 2025-10-01 181525_1759317521147.png (ShopZen Sidebar)
- Pasted-Instruksi-Utama-*.txt (Design requirements)

**Technical Notes**:
- Primary color (maroon/dark red) used for all emphasis and highlights
- ShopZen styling: clean, minimalist, professional
- All changes preserve existing functionality and test IDs
- TypeScript type safety maintained
- Dark mode compatibility ensured

### October 1, 2025 - Fresh GitHub Import Successfully Configured for Replit
- ✅ **GitHub Repository Imported**: Successfully imported Alonica restaurant system fresh from GitHub
- ✅ **Node.js 20**: Confirmed pre-installed and operational
- ✅ **PostgreSQL Database Provisioned**: Created fresh Replit PostgreSQL database with all environment variables
- ✅ **Database Schema Migration**: Successfully pushed all 8 tables using `npm run db:push`
- ✅ **User Data Seeded**: 5 users created (admin/admin123, kasir1-4/kasir123)
- ✅ **Dependencies Installed**: All 633 npm packages installed successfully
- ✅ **Vite Configuration Verified**: Confirmed `allowedHosts: true` for Replit proxy compatibility
- ✅ **Workflow Configuration**: "Start application" running on port 5000
- ✅ **Deployment Configuration**: Autoscale deployment configured
- ✅ **Import Completed**: Fully functional and ready for VPS deployment