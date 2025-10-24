# DeepHire - AI-Powered Talent Acquisition Platform

## Overview
DeepHire is an enterprise-grade B2B recruiting platform leveraging AI to transform talent acquisition. It acts as an AI-powered executive search consultant, learning hiring patterns, understanding career trajectories, and semantically matching candidates. The platform offers intelligent candidate matching, automated job description parsing, and streamlined recruitment workflows for recruiting firms, their clients, and candidates. It features a multi-portal architecture, AI-driven candidate longlisting, and comprehensive management systems for candidates and jobs, with a focus on enterprise design, professional aesthetics, and data-heavy interfaces.

The long-term vision includes a bottom-up intelligence system:
1.  **Company Intelligence**: AI extracts and categorizes data from 1000+ company websites (industry, stage, funding, geography, size).
2.  **Organization Chart Mapping**: Gradually builds org charts by discovering team members.
3.  **Pattern Learning**: Analyzes org charts to identify hiring patterns (e.g., "PAG hires 42% from Blackstone").
4.  **Semantic Matching**: Matches candidates based on learned patterns and career path similarity, moving beyond keyword matching.
5.  **Culture Insights**: Learns company culture through recruiter/candidate interactions.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes

### October 24, 2025 - Multi-Language Support + Custom Fields + UI Enhancements
- **Enterprise Multi-Language Name System** (FREE - No AI costs):
  - **Database Schema**: 9 new fields for international candidate names
    - `nativeName` (李嘉冕), `latinName` (Li Jiamian), `nativeNameLocale` (zh-CN)
    - `transliterationMethod` (pinyin/romaja/romaji), `transliterationConfidence` (0-1 score)
    - `emailFirstName`/`emailLastName` (ASCII-safe components for email inference)
    - `displayName` (user-preferred display format)
  - **3-Step Transliteration Pipeline**: 
    1. ASCII Detection → Skip if already Latin alphabet
    2. Auto-Transliteration → pinyin (Chinese), romaja (Korean), romaji (Japanese) with 0.9 confidence
    3. Initials Fallback → First letter extraction with 0.3 confidence, flagged for manual review
  - **Email Inference Enhancement**: Uses transliterated names for domain-based email generation
    - Example: 李嘉冕 → Li Jiamian → li.jiamian@company.com
    - Status flags: `verified`, `transliterated`, `needs_review`
  - **All Processing Endpoints Updated**: Career-only, bio-only, and full processing use transliteration
  - **UI Display**: Candidate detail shows native name prominently, latin name as subtitle, transliteration badge
  - **Migrated Legacy Data**: Existing `chineseName` values moved to `nativeName` for backward compatibility
  
- **Salesforce-Style Custom Fields System**:
  - **Database Architecture**: 2 new tables for flexible candidate data
    - `custom_field_sections`: Groupings like "Compensation", "Background", "Executive Summary" with ordering
    - `custom_field_definitions`: Field metadata (type, validation, picklists, help text, visibility)
    - `candidates.customFieldValues`: JSONB column storing {fieldId: value} pairs
  - **Field Types Supported**: text, number, currency, date, select, multi_select, checkbox, url, email, phone
  - **Complete REST API** (11 endpoints):
    - `/api/custom-field-sections` (GET, POST, PATCH, DELETE)
    - `/api/custom-field-definitions` (GET, POST, PATCH, DELETE) 
    - `/api/candidates/:id/custom-fields` (PATCH for value updates)
  - **Storage Layer**: Full CRUD methods for sections, definitions, and candidate values
  - **UI Placeholders**: Custom fields section in candidate detail (admin interface pending)

- **Candidate Detail UI Enhancements**:
  - **Edit Button**: Added to candidate detail dialog header (implementation pending)
  - **Documents & Files Section**: UI placeholder for CV/resume upload with empty state
  - **Notes & Interaction History Section**: UI placeholder for tracking candidate communications
  - **Multi-Language Name Display**: Native name + latin name + transliteration badge
  - **Custom Fields Display**: Shows JSON values if present, configuration button

- **Benefits**: International candidate support, flexible data model for different recruiting firms, improved email accuracy, foundation for document management and interaction tracking

### October 22, 2025 - 4 Processing Modes + Retroactive Processing
- **Implemented flexible processing modes for candidate uploads**: Users can now choose how much processing to apply to each candidate upload, optimizing credit usage
- **Four processing modes available**:
  - **Full Processing** (`full`): SerpAPI + Bright Data + Grok AI - Complete profiles with career history and AI-generated biographies
  - **Career Only** (`career_only`): SerpAPI + Bright Data - Quick career mapping without biography generation
  - **Bio Only** (`bio_only`): SerpAPI + Bright Data + Grok AI - Biographical summaries without full career extraction emphasis
  - **Data Only** (`data_only`): No API calls - Free bulk upload for later processing
- **Added processingMode column to candidates table**: Tracks which mode was used for each candidate
- **Updated background job processor**: Conditionally calls APIs based on selected processing mode
- **Comprehensive UI implementation**: Mode selectors in both bulk upload and Quick Add forms with cost breakdowns
- **Visual mode indicators**: Processing mode badges on candidate cards (Data Only, Career Only, Bio Only)
- **Unified contract across upload methods**: Both bulk upload and Quick Add follow the same processing logic for all 4 modes
- **Retroactive Processing Feature**: New workflow enabling selective processing of previously uploaded candidates
  - **Upload → Review → Process**: Upload all URLs as "Data Only" (free), manually review LinkedIn profiles, then selectively process useful candidates
  - **Processing Action Buttons**: Three buttons appear on candidate detail page for data_only candidates:
    - **Fetch Career History**: Scrapes LinkedIn and extracts work experience (Career Only mode)
    - **Generate Biography**: Scrapes LinkedIn and creates AI-generated executive biography (Bio Only mode)  
    - **Full Processing**: Complete processing with both career history and biography (Full mode)
  - **API Endpoints**: POST `/api/candidates/:id/process-career`, `/api/candidates/:id/process-biography`, `/api/candidates/:id/process-full`
  - **Automatic Data Transformation**: LinkedIn experience data automatically mapped to internal career history schema
- **Benefits**: Credit optimization, flexible workflows, bulk upload now free with data_only mode, selective processing based on manual review

### October 22, 2025 - Recycling Bin Feature
- **Implemented soft delete system for candidates**: Replaced permanent deletion with reversible soft delete
- **Added `deleted_at` timestamp column**: Tracks when candidates are deleted without removing data
- **Recycling Bin UI**: New dedicated page at `/recruiting/recycling-bin` to view deleted candidates
- **Restore functionality**: One-click candidate restoration from recycling bin back to active list
- **Permanent delete option**: Optional hard delete for final removal from database
- **Filtered queries**: All candidate endpoints automatically exclude soft-deleted candidates (where `deleted_at IS NULL`)
- **Route ordering fix**: Critical Express routing bug fixed - specific routes (`/recycling-bin`) now come before parameterized routes (`/:id`)
- **No auto-purge**: Deleted candidates kept forever unless manually permanently deleted
- **Benefits**: Data safety, undo capability, prevents accidental loss of candidate records

### October 21, 2025 - Multi-Layer Office Extraction System
- **Implemented comprehensive 4-layer office extraction pipeline** (replaces single AI approach):
  - **Layer 1 (JSON-LD)**: Extracts from Schema.org structured data (fastest, most reliable)
  - **Layer 2 (Microdata)**: Extracts from itemprop attributes  
  - **Layer 3 (CSS Selectors)**: Pattern matching on common office/location/contact elements
  - **Layer 4 (AI)**: Final fallback using Grok-2 if previous layers find < 3 offices
- **Improved fetch reliability**: Added 3-retry logic with exponential backoff for network requests
- **Removed broken Bright Data integration**: Simplified to direct HTTP fetching (eliminates 407 auth errors)
- **Benefits**: Faster extraction, reduced AI costs, works with more website designs
- **Technical Details**: Uses cheerio for HTML parsing, regex for city/country patterns, intelligent deduplication

## System Architecture

### Frontend
-   **Framework**: React 18 with TypeScript.
-   **UI/Styling**: Radix UI primitives, shadcn/ui components, Tailwind CSS with a custom enterprise design system.
-   **State Management**: TanStack Query for server state.
-   **Routing**: Wouter.
-   **Theme**: Dark/light mode.

### Backend
-   **Runtime**: Node.js with Express.js.
-   **Language**: TypeScript.
-   **AI Integration**: xAI's Grok model for job description parsing and candidate matching.
-   **Session Management**: Express sessions with PostgreSQL store.

### Database
-   **Primary Database**: PostgreSQL with Neon serverless hosting.
-   **ORM**: Drizzle ORM for type-safe operations.
-   **Schema**: Comprehensive models for Companies (50+ fields), Candidates (40+ fields), Jobs, Job matches, Users, Data ingestion jobs, and Duplicate detection.
-   **Company Role Architecture**: Companies can have roles like `['client', 'sourcing', 'prospecting']`.
-   **Duplicate Detection**: Prioritizes website domain matching (40% weight) to prevent duplicates, handles domain variations.

### AI and Machine Learning
-   **Language Model**: xAI Grok-2-1212 (131k token context window).
-   **Capabilities**: Automated job description parsing, intelligent candidate longlist generation, structured JSON output.
-   **AI Biography Pipeline**: A 3-layer process (Deep Comprehension, Intelligent Synthesis, Intelligent Career Mapping) creates narrative-driven biographies from LinkedIn profiles and URLs, handling censored data.
-   **AI-Powered Team Discovery**: Dynamically analyzes website HTML to extract team member data regardless of site structure, replacing static CSS selectors.
-   **AI-Powered Office Discovery**: Extracts office locations directly from HTML using AI, replacing browser automation.
-   **Company Intelligence Engine**: Auto-categorizes companies by industry, stage, funding, geography, and size. Populates organization charts and lays the foundation for pattern learning.

### Design System
-   **Philosophy**: Enterprise-first, professional, and usable.
-   **Palette**: Deep navy primary, professional green accents.
-   **Typography**: Inter font family.
-   **Components**: Reusable components for data tables, cards, forms, navigation.

### Key Technical Implementations
-   **Hybrid LinkedIn Search**: Two-stage search (exact then loose) to improve candidate finding.
-   **LinkedIn Profile Validation**: Multi-result scoring with confidence thresholds via SerpAPI.
-   **Boolean Search**: Advanced LinkedIn search for Quick Add.
-   **Enhanced Team Discovery**: Supports pagination, multi-language sites, and uses AI to intelligently extract team members from various website structures. Includes a 3-tier scraping system with Google Search fallback (using SerpAPI) for sites blocking direct access, extracting profile URLs and names from search results and page titles.
-   **Staging Management UI**: Interface at `/recruiting/staging` for reviewing, approving, or rejecting staged candidates.
-   **Automated Processing Pipeline**: Upload workflows trigger background jobs for company intelligence (categorization, team discovery, pattern learning).

## External Dependencies

### AI Services
-   **xAI Grok API**: Core AI model for various functionalities.

### Data Services
-   **SerpAPI**: For search engine results, LinkedIn profile discovery, and email pattern research.
-   **Bright Data**: For LinkedIn profile scraping.

### Database
-   **Neon PostgreSQL**: Serverless database hosting.
-   **Drizzle ORM**: Database interactions.

### Email Services
-   **SendGrid**: Transactional email delivery.

### Development Tools
-   **Replit Environment**: Cloud-based development.
-   **Vite Development Server**: Local development.
-   **TypeScript Compiler**: Type checking.

### UI Libraries
-   **Radix UI**: Accessible component primitives.
-   **Lucide Icons**: Icon set.
-   **Tailwind CSS**: Styling framework.
-   **shadcn/ui**: Pre-built components.