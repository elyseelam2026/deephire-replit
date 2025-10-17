# DeepHire - AI-Powered Talent Acquisition Platform

## Overview

DeepHire is an enterprise-grade B2B recruiting platform that uses AI to revolutionize talent acquisition. The system mimics a 20-year executive search consultant by learning hiring patterns, understanding career trajectories, and matching candidates based on semantic meaning rather than keyword matching. It offers intelligent candidate matching, automated job description parsing, and streamlined recruitment workflows for recruiting firms and their clients. The platform supports three user types: admin (recruiters), client companies, and candidates, featuring a multi-portal architecture, AI-powered candidate longlisting, and comprehensive management systems for candidates and jobs. The project emphasizes enterprise-level design, professional aesthetics, and data-heavy interfaces optimized for recruitment.

### V1.0 Intelligence System Vision
**Bottom-Up Learning Approach:**
1. **Company Intelligence Foundation**: Upload 1000+ company websites → AI extracts data → auto-categorize by industry, stage, funding, geography, size
2. **Organization Chart Mapping**: Discover team members gradually (CEO, CFO, COO, executives) → build org charts over time as people become visible
3. **Pattern Learning**: Analyze org charts to discover hiring patterns (e.g., "PAG hires 42% from Blackstone, 30% from Goldman")
4. **Semantic Matching**: Match candidates using learned patterns + career path similarity (not keyword matching)
5. **Culture Insights**: Learn company culture through recruiter/candidate conversations (NOT auto-generated from website keywords)

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
- **3-Layer AI Biography Pipeline** (Oct 16, 2025): Completely rebuilt biography generation with sophisticated multi-layer AI processing instead of simple data copying:
  - **LAYER 1 - Deep Comprehension**: AI analyzes LinkedIn profile + bio URLs to build deep understanding of career story, patterns, progression, and achievements (not just data extraction)
  - **LAYER 2 - Intelligent Synthesis**: AI WRITES comprehensive biography from understanding (narrative-driven, not reformatting). Creates career story with context and insights
  - **LAYER 3 - Intelligent Career Mapping**: AI maps career history with deep understanding, recognizes patterns (e.g., "Blackstone → PAG transition"), adds meaningful descriptions of impact and progression
  - Pipeline runs: Scrape → Comprehend → Synthesize → Map. Each layer builds on previous understanding rather than copying raw data. Handles censored LinkedIn data by using AI-synthesized biography as source. Biographies include three sections: Executive Summary, Career History (narrative form), Education Background
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
- **AI-Powered Team Discovery** (Oct 16, 2025): Completely replaced static CSS selectors with dynamic AI-powered extraction using Grok. System now intelligently analyzes any website's HTML structure, identifies team member patterns, and extracts data regardless of how the site is built. Works with Permira (466 members), CVC, PAG, and any custom website structure. No more hardcoded selectors - AI adapts to each site automatically.
- **Staging Management UI** (Oct 9, 2025): Complete staging candidate management interface at `/recruiting/staging`. Features include real-time stats dashboard, status filtering (pending/pending_review/approved/rejected), confidence score displays, verification details dialog, and approve/reject workflows. Backend automatically excludes verified candidates from default view to prevent UI clutter after approval. Supports full staging → verification → production pipeline with manual review capabilities.
- **Company Intelligence Engine** (Oct 15, 2025): Built v1.0 intelligence system with three core engines:
  - **Auto-Categorization Engine**: `categorizeCompany()` function analyzes company websites using Grok AI to tag by industry, stage, funding, geography, and size. Saves structured tags to `companyTags` table for filtering and search.
  - **Organization Chart Population**: `analyzeRoleLevel()` detects C-level (CEO, CFO, etc.) and executive roles. Team discovery automatically populates `organization_chart` table with role hierarchy (C-Suite, VP, Director), department classification, and discovery metadata.
  - **Pattern Learning Engine**: `analyzeCompanyHiringPatterns()` foundation ready to analyze org charts and discover hiring patterns (e.g., "PAG hires 42% from Blackstone"). Will track career transitions and preferred source companies when LinkedIn career history data is integrated.
  - **Automated Processing Pipeline**: Upload workflow connected to background jobs. After CSV upload, system automatically: (1) saves companies to database, (2) triggers background intelligence processing via `processBulkCompanyIntelligence()`, (3) runs categorization → team discovery → pattern learning pipeline for each company. User sees "AI intelligence processing started for X companies" confirmation.
- **Google Search Fallback for Team Discovery** (Oct 17, 2025): Intelligent 3-tier scraping system bypasses Cloudflare and anti-bot protection:
  - **Tier 1 - Direct HTTP**: Standard fetch with user-agent headers (fastest, works for most sites)
  - **Tier 2 - Bright Data Proxy**: Web Unlocker for sites with basic protection (port 22225)
  - **Tier 3 - Google Search Extraction**: When sites block all direct access (Cloudflare, etc.), uses SerpAPI to search `site:company.com (team OR people OR leadership)`, then Grok AI extracts team member names from Google search result snippets. Successfully discovered 5 executives from Carlyle Group (Harvey M. Schwartz, Charles Andrews, Jeff Nedelman, Joe Bress, Robert Schmidt) despite complete Cloudflare blocking. Early stop optimization: detects blocking after 3 consecutive failures, immediately triggers Google fallback instead of trying 150+ URL combinations. System prioritizes efficiency over exhaustive attempts.

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