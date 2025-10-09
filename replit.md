# DeepHire - AI-Powered Talent Acquisition Platform

## Overview

DeepHire is an enterprise-grade B2B recruiting platform that uses AI to revolutionize talent acquisition. It offers intelligent candidate matching, automated job description parsing, and streamlined recruitment workflows for recruiting firms and their clients. The platform supports three user types: admin (recruiters), client companies, and candidates, featuring a multi-portal architecture, AI-powered candidate longlisting, and comprehensive management systems for candidates and jobs. The project emphasizes enterprise-level design, professional aesthetics, and data-heavy interfaces optimized for recruitment.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript.
- **Build System**: Vite.
- **UI Library**: Radix UI primitives with shadcn/ui components.
- **Styling**: Tailwind CSS with a custom enterprise-focused design system.
- **State Management**: TanStack Query for server state.
- **Routing**: Wouter.
- **Theme System**: Dark/light mode support.

### Backend Architecture
- **Runtime**: Node.js with Express.js.
- **Language**: TypeScript.
- **File Handling**: Multer for uploads.
- **AI Integration**: xAI's Grok model for job description parsing and candidate matching.
- **Session Management**: Express sessions with PostgreSQL store.

### Database Design
- **Primary Database**: PostgreSQL with Neon serverless hosting.
- **ORM**: Drizzle ORM for type-safe operations.
- **Enterprise Schema**: Comprehensive data models for Companies (50+ fields), Candidates (40+ fields), Jobs, Job matches, Users, Data ingestion jobs, and Duplicate detection.

### AI and Machine Learning
- **Language Model**: xAI Grok-2-1212 with 131k token context window.
- **Capabilities**: Automated job description parsing (titles, skills, requirements) and intelligent candidate longlist generation.
- **Response Format**: Structured JSON output.

### Design System
- **Design Philosophy**: Enterprise-first, professional, and usable.
- **Color Palette**: Deep navy primary, professional green accents.
- **Typography**: Inter font family.
- **Component Library**: Reusable components for data tables, cards, forms, navigation.
- **Layout System**: Tailwind spacing units for consistent hierarchy.

### Technical Implementations
- **Hybrid LinkedIn Search Strategy** (Oct 2, 2025): 2-stage search to handle exact-phrase failures
  - Stage 1: Exact matching with quotes for precision (`"Christian Brun" "Wellesley Partners"`)
  - Stage 2: Loose matching without quotes if Stage 1 finds nothing (handles company name variations)
  - Prevents "0 results" errors while maintaining quality through confidence scoring
- **LinkedIn Profile Validation**: Multi-result scoring algorithm with confidence threshold using SerpAPI for accurate LinkedIn profile matching.
- **Automated Biography Generation**: Full workflow from name+company to comprehensive structured biography. Uses SerpAPI for LinkedIn/bio URL discovery, HTML scraping (same method as bio URLs like Bain Capital pages) for content extraction, and Grok AI for generation. Biographies include three sections: Executive Summary (current role and expertise), Career History (reverse chronological from most recent to first position), and Education Background (degrees, institutions, certifications). LinkedIn profiles are scraped directly as HTML (not via Bright Data) for maximum data extraction.
- **Manual Biography Entry**: Allows human-verified biography input.
- **QA Validation System**: Tools for manual validation of email, LinkedIn, and biography data.
- **Boolean Search Functionality**: Advanced LinkedIn search for Quick Add using SerpAPI, displaying multiple selectable results.
- **Email Pattern Research**: `researchCompanyEmailPattern()` function researches company email patterns via SerpAPI.
- **Subdomain Detection Improvements**: Enhanced handling of multi-part TLDs and known subdomain prefixes.
- **Enhanced Domain Validation Logic**: Improved company email domain detection with relevance scoring.
- **Company Hierarchy Fix** (Oct 8, 2025): Child office locations no longer inherit parent company descriptions. Set `missionStatement: null` for child companies to prevent duplication.
- **Improved Company Descriptions** (Oct 8, 2025): AI extraction prioritizes "About Us" sections over first paragraph for richer, more accurate company descriptions.
- **Enhanced Team Discovery** (Oct 8, 2025): Added `/our-team/`, `/about/people`, `/about/our-people`, and `/about/our-people/` path support. Increased content limit from 15K to 30K characters for better team member extraction. Implemented pagination support to scrape multi-page team listings (up to 100 pages per company, with safety cap). Detects pagination via HTML parsing, handles both query-based (?page=2) and path-based (/page/2) patterns, intelligently extracts actual query parameter names, and deduplicates results across all pages.
- **Child Company List Filtering** (Oct 8, 2025): Fixed bug where child companies appeared on main list. All child companies now have `isHeadquarters = false` to ensure only parent companies show on main Companies page.
- **Language-Aware Team Discovery** (Oct 9, 2025): Enhanced team discovery to support internationalized websites with language-prefixed URLs (e.g., `/en/about/`, `/fr/team/`). System now checks 10 language variants (en, fr, de, es, zh, ja, pt, it, nl) combined with all base team paths (~150 URL combinations) for comprehensive coverage of localized sites.
- **Null City Protection** (Oct 9, 2025): Fixed child company creation to skip office locations with null/empty city data. Previously created malformed "Company - null" child companies. System now logs warnings and skips invalid offices while preserving legitimate data.
- **Flexible Team Extraction** (Oct 9, 2025): Replaced rigid CSS selectors with multi-pattern fallback system. Team discovery now tries 3 selector patterns: CVC-style (legacy), PAG-style (`.team-member`, `.team-grid-item`), and generic (`[data-teamid]`, `[class*="team"]`). System stops at first successful match, ensuring broad website compatibility while maintaining performance.

## External Dependencies

### AI Services
- **xAI Grok API**: For job description parsing and candidate matching.

### Data Services
- **SerpAPI**: For search engine results, LinkedIn profile discovery, and email pattern research.
- **Bright Data**: For LinkedIn profile scraping.

### Database and Storage
- **Neon PostgreSQL**: Serverless PostgreSQL database.
- **Drizzle ORM**: For database interactions.

### Email Services
- **SendGrid**: For transactional email delivery.

### Development Infrastructure
- **Replit Environment**: Cloud-based development.
- **Vite Development Server**: For local development.
- **TypeScript Compiler**: For type checking.

### UI and Component Libraries
- **Radix UI**: Accessible component primitives.
- **Lucide Icons**: Consistent icon set.
- **Tailwind CSS**: Utility-first styling.
- **shadcn/ui**: Pre-built components.