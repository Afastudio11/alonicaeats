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

### Current Configuration (October 2, 2025)
- **Database**: PostgreSQL provisioned and schema pushed successfully
- **Workflow**: "Start application" running on port 5000
- **Dev Server**: Express + Vite with HMR enabled, allowedHosts configured
- **Seeded Data**: Admin and kasir accounts created (admin/admin123, kasir1/kasir123, etc.)

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