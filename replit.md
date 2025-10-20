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