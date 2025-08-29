# Live Podcast Platform

## Overview

This is a full-stack live podcast streaming platform built with React/TypeScript frontend and Node.js/Express backend. The application allows users to stream live podcasts, manage podcast sessions, and provides admin functionality for content management. The platform features real-time audio streaming capabilities, user authentication via Replit Auth, and a modern UI built with shadcn/ui components.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, using Vite as the build tool
- **UI Framework**: shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and dark theme support
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for client-side routing
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Authentication**: Replit Auth with OpenID Connect (OIDC) integration
- **Session Management**: Express sessions with PostgreSQL store
- **File Uploads**: Multer middleware for audio file handling
- **API Design**: RESTful endpoints with JSON responses

### Database Schema
- **Users Table**: Stores user profiles with role-based access (admin/user)
- **Podcasts Table**: Manages podcast episodes with status tracking (draft/scheduled/live/completed/cancelled)
- **Podcast Guests Table**: Junction table for managing podcast participants
- **Sessions Table**: Required for Replit Auth session persistence

### Authentication & Authorization
- **Primary Auth**: Replit Auth with OIDC flow
- **Session Storage**: PostgreSQL-backed sessions with automatic cleanup
- **Role-Based Access**: Admin users get additional dashboard access
- **Security**: HTTPS-only cookies with CSRF protection

### Key Features
- **Live Streaming**: Real-time podcast broadcasting capabilities
- **Admin Dashboard**: Content management for authorized users
- **Audio Player**: Global audio player component with playback controls
- **Responsive Design**: Mobile-first design with adaptive layouts
- **File Upload**: Support for audio files with format validation

## External Dependencies

### Database
- **Neon PostgreSQL**: Serverless PostgreSQL database with connection pooling
- **Drizzle ORM**: Type-safe database operations and migrations

### Authentication
- **Replit Auth**: OAuth/OIDC authentication service
- **OpenID Client**: For handling OIDC flows and token management

### UI/UX Libraries
- **Radix UI**: Headless component primitives for accessibility
- **shadcn/ui**: Pre-built component library
- **Lucide Icons**: Icon library for consistent iconography
- **Tailwind CSS**: Utility-first CSS framework

### Development Tools
- **Vite**: Fast build tool with HMR support
- **TypeScript**: Type safety across the entire application
- **ESBuild**: Fast bundling for production builds

### File Handling
- **Multer**: Multipart form data handling for file uploads
- **File System**: Local file storage for uploaded audio content

### Deployment
- **Replit**: Integrated development and hosting environment
- **Environment Variables**: Configuration management for database connections and secrets