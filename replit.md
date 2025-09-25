# DeepHire - AI-Powered Talent Acquisition Platform

## Overview

DeepHire is an enterprise-grade B2B recruiting platform that leverages AI to revolutionize talent acquisition. The system provides intelligent candidate matching, automated job description parsing, and streamlined recruitment workflows for recruiting firms and their clients. The platform serves three distinct user types: admin users (recruiters), client companies posting jobs, and candidates seeking opportunities.

The application features a multi-portal architecture with role-based interfaces, AI-powered candidate longlisting using advanced language models, and comprehensive candidate and job management systems. Built with modern web technologies, it emphasizes enterprise-level design patterns, professional aesthetics, and data-heavy interfaces optimized for recruitment workflows.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern development practices
- **Build System**: Vite for fast development and optimized production builds
- **UI Library**: Radix UI primitives with shadcn/ui components for accessible, customizable interface elements
- **Styling**: Tailwind CSS with custom design system featuring enterprise-focused color palette and spacing
- **State Management**: TanStack Query for server state management and API data synchronization
- **Routing**: Wouter for lightweight client-side routing
- **Theme System**: Dark/light mode support with CSS custom properties

### Backend Architecture
- **Runtime**: Node.js with Express.js framework for RESTful API endpoints
- **Language**: TypeScript throughout for consistent typing and development experience
- **File Handling**: Multer middleware for job description and CV file uploads
- **AI Integration**: xAI's Grok model for job description parsing and candidate matching intelligence
- **Session Management**: Express sessions with PostgreSQL session store

### Database Design
- **Primary Database**: PostgreSQL with Neon serverless hosting
- **ORM**: Drizzle ORM for type-safe database operations and schema management
- **Schema Structure**:
  - Companies table: Client organizations and candidate employers
  - Jobs table: Job postings with AI-parsed structured data
  - Candidates table: Professional profiles with skills and experience
  - Job matches table: AI-generated candidate-job compatibility scores
  - Users table: Authentication and role management

### AI and Machine Learning
- **Language Model**: xAI Grok-2-1212 with 131k token context window for comprehensive text processing
- **Job Description Parsing**: Automated extraction of job titles, departments, skills, urgency levels, and requirements
- **Candidate Matching**: Intelligent longlist generation based on skills alignment and job requirements
- **Response Format**: Structured JSON output for consistent data processing

### Design System
- **Design Philosophy**: Enterprise-first approach balancing professionalism with modern usability
- **Color Palette**: Deep navy primary (HSL 220 85% 25%) for trust, professional green accents
- **Typography**: Inter font family for readability and professional appearance
- **Component Library**: Comprehensive set of reusable components including data tables, cards, forms, and navigation elements
- **Layout System**: Tailwind spacing units (4, 6, 8) for consistent visual hierarchy

## External Dependencies

### AI Services
- **xAI Grok API**: Advanced language model for job description parsing and candidate matching with 131k context window
- **API Integration**: RESTful communication with structured JSON responses for consistent data processing

### Database and Storage
- **Neon PostgreSQL**: Serverless PostgreSQL database with connection pooling and automatic scaling
- **Drizzle ORM**: Type-safe database operations with migration support and schema validation

### Email Services
- **SendGrid**: Transactional email delivery for candidate outreach and system notifications
- **Email Templates**: Structured communication for recruitment workflows

### Development Infrastructure
- **Replit Environment**: Cloud-based development platform with integrated database provisioning
- **Vite Development Server**: Hot module replacement and fast refresh for efficient development
- **TypeScript Compiler**: Static type checking across frontend, backend, and shared modules

### UI and Component Libraries
- **Radix UI**: Accessible, unstyled component primitives for complex UI patterns
- **Lucide Icons**: Consistent icon set optimized for professional interfaces
- **Tailwind CSS**: Utility-first styling with custom design system integration
- **shadcn/ui**: Pre-built component library built on Radix primitives with enterprise theming