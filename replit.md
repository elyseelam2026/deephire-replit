# DeepHire - AI-Powered Talent Acquisition Platform

## Overview

DeepHire is an enterprise-grade B2B recruiting platform that leverages AI to revolutionize talent acquisition. The system provides intelligent candidate matching, automated job description parsing, and streamlined recruitment workflows for recruiting firms and their clients. The platform serves three distinct user types: admin users (recruiters), client companies posting jobs, and candidates seeking opportunities.

The application features a multi-portal architecture with role-based interfaces, AI-powered candidate longlisting using advanced language models, and comprehensive candidate and job management systems. Built with modern web technologies, it emphasizes enterprise-level design patterns, professional aesthetics, and data-heavy interfaces optimized for recruitment workflows.

## Recent Changes

### October 2, 2025
- **QA Validation System**: Implemented comprehensive manual validation tools for candidate data verification
  - Added three validation endpoints: `/api/admin/validate-email`, `/api/admin/validate-linkedin`, `/api/admin/validate-biography`
  - "Verify Email" button re-researches company domain using SerpAPI, shows before/after comparison, allows one-click update
  - "Verify LinkedIn URL" button searches for candidate profile using SerpAPI, compares URLs, enables correction
  - "Verify Biography" button opens LinkedIn profile in new tab for manual comparison (LinkedIn blocks automation)
  - Update endpoints: `/api/admin/update-candidate-email`, `/api/admin/update-candidate-linkedin` for accepting suggested changes
  - UI integration: Validation buttons appear in candidate detail dialog with browser confirm() dialogs for comparisons
  - Successfully tested with Christian Brun and other candidates
- **Enhanced Domain Validation Logic**: Improved company email domain detection with relevance scoring
  - Extracts company name keywords, filters common words (company, inc, ltd, group)
  - Scores domains based on keyword matches, exact name alignment, and position in search results
  - Minimum relevance threshold (score ≥5) prevents low-quality domain matches
  - Returns null when no suitable domain found, preventing incorrect email generation
  - Fixed Christian Brun's email validation to correctly use c.brun@wellesleys.com domain

### September 30, 2025
- **Boolean Search Functionality**: Implemented advanced LinkedIn search for Quick Add with multi-result selection
  - Added textarea field accepting complex boolean queries (AND, OR, NOT operators with site:linkedin.com/in filter)
  - Created `/api/admin/boolean-search` endpoint using SerpAPI to execute custom search queries
  - Displays up to 10 search results as selectable cards showing name, title, company, LinkedIn URL
  - Fixed company extraction logic with fallback chain: result.company → result.title → "Unknown Company"
  - Successfully tested with query "software engineer AND Python AND Microsoft site:linkedin.com/in"
  - User selects desired candidate from results → system creates candidate with LinkedIn URL stored
- **SerpAPI Integration for Automated LinkedIn Discovery**: Implemented fully automated LinkedIn profile discovery using SerpAPI (no manual URL input required)
  - Replaces unreliable Google scraping with production-ready SerpAPI REST API
  - Successfully tested with real candidates (famous: Satya Nadella at Microsoft; regular: Herman Yu at Baidu)
  - Fixed URL extraction pattern for broader LinkedIn profile detection
- **Simplified LinkedIn Storage Approach** (Based on user feedback):
  - When LinkedIn URL found via SerpAPI → Store it immediately → Done!
  - Removed unreliable content fetching (LinkedIn blocks most requests anyway)
  - Mimics human workflow: Find URL, store it, let recruiters click it later
  - Generates profile with LinkedIn URL and inferred email (e.g., herman.yu@baidu.com)
- **Quick Add UI Simplification**: Removed manual LinkedIn URL input field
  - Admin provides only: First Name, Last Name, Company
  - System automatically discovers LinkedIn profile via SerpAPI
  - Updated loading state: "Finding Profile & Generating Biography..."
  - Clear "How it works" guidance for fully automated workflow
- **LinkedIn URL Corrections**: Fixed incorrect LinkedIn profile URLs for Jen Fox, Brian Fulginiti, Iris Fuli, Kevin Gallagher, Ben Gallagher, and Alexis Gajwani using web search to find accurate profile identifiers
- **UI Scrolling Fix**: Resolved candidate list scrolling issue by changing main container from overflow-hidden to overflow-y-auto, enabling visibility of all 17+ candidates
- **Search Functionality Verified**: Confirmed candidate search feature working correctly across firstName, lastName, currentTitle, and currentCompany fields with case-insensitive matching
- **End-to-End Testing**: Validated all fixes through automated Playwright tests confirming LinkedIn URLs, scrolling behavior, and search accuracy

### September 29, 2025
- **Enhanced Enterprise Schema**: Applied comprehensive database schema with 50+ candidate fields and 40+ company fields covering identity, professional background, preferences, compliance, and recruiting metadata
- **Fixed Critical Storage Interface**: Resolved all TypeScript compatibility issues with updated schema structures including proper type definitions and query optimizations
- **Database Migration Success**: Successfully applied all schema changes using drizzle-kit push with comprehensive enterprise fields
- **LinkedIn URL Parsing Fixed**: Resolved critical issue preventing extraction of candidate data from LinkedIn profile URLs in Excel/CSV uploads
- **Storage Interface Updates**: Updated all CRUD operations to work with new comprehensive schema while maintaining backward compatibility
- **Query Optimization**: Fixed complex query builder issues for data ingestion jobs and duplicate detection workflows

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
- **Enterprise Schema**: Comprehensive data models with 50+ candidate fields and 40+ company fields
- **Schema Structure**:
  - **Companies table**: Enterprise-grade client organizations with comprehensive business data including legal structure, financial information, compliance, and operational details
  - **Candidates table**: Professional profiles with extensive fields covering identity, experience, skills, preferences, legal status, and recruiting metadata
  - **Jobs table**: Job postings with AI-parsed structured data and enhanced requirements tracking
  - **Job matches table**: AI-generated candidate-job compatibility scores with application tracking
  - **Users table**: Authentication and role management for multi-tenant access
  - **Data ingestion jobs**: Batch processing tracking for Excel/CSV uploads
  - **Duplicate detection**: Intelligent duplicate prevention with manual resolution workflows

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