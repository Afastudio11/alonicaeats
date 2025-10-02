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
- **UI/UX**: Prioritizes mobile-first, clean, minimalist design (ShopZen-inspired) with consistent branding and a standardized typography system (Inter for dashboards, Playfair Display for customer-facing brand elements).
- **Data Handling**: Robust form validation and state management.
- **Security**: Admin approval for critical operations (e.g., item cancellation, item deletion from kitchen-bound orders).
- **Flexibility**: Open bill editing allows dynamic order modifications.
- **Deployment**: Configured for Replit environment with autoscale deployment.
- **Admin Approval System**: Real-time notification system for item deletion requests, with admin-only approval/rejection and audit trails.

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