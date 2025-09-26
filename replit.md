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

### September 26, 2025 - GitHub Import Successfully Configured for Replit
- ✅ **GitHub Import Complete**: Successfully imported and configured the Alonica project in Replit environment
- ✅ **Dependencies Resolved**: All npm dependencies installed and up-to-date
- ✅ **Vite Configuration**: Confirmed `allowedHosts: true` for Replit proxy compatibility 
- ✅ **Workflow Setup**: Configured "Start application" workflow to run on port 5000 with webview output
- ✅ **Server Configuration**: Express server properly configured with CORS, security headers, and HMR
- ✅ **Development Server**: Application running successfully with Hot Module Replacement (HMR)
- ✅ **Storage System**: FallbackStorage configured (DatabaseStorage -> MemStorage on error)
- ✅ **Payment Integration**: Midtrans configured for mock development mode
- ✅ **Deployment Ready**: Autoscale deployment configuration set up for production publishing

### Project Status
- ✅ Dependencies installed and up-to-date
- ✅ Development server running on port 5000 
- ✅ Frontend/backend integration working perfectly
- ✅ Vite HMR connected and functional 
- ✅ All security and CORS headers properly configured
- ✅ Deployment configuration ready for production
- ✅ GitHub import setup complete - ready for development