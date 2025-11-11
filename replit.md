# DeepHire - AI-Powered Talent Acquisition Platform

## Overview
DeepHire is an enterprise B2B recruiting platform leveraging AI to revolutionize talent acquisition, initially targeting Private Equity. It functions as an AI-powered executive search consultant that discovers NEW external candidates via LinkedIn/web scraping (not just internal database search). The system delivers a "WOW effect" through intelligent candidate ranking using full NAP (Needs Analysis Profile) context—evaluating urgency, success criteria, and team dynamics—not just keyword matching. The platform provides automated job description parsing and streamlined recruitment workflows through a multi-portal architecture and comprehensive management systems.

The long-term vision includes a bottom-up intelligence system for Company Intelligence, Organization Chart Mapping, Pattern Learning, Semantic Matching, and Culture Insights.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The platform features an enterprise-first, professional, and usable design. It utilizes a deep navy primary color with professional green accents, and the Inter font family. Reusable components for data tables, cards, forms, and navigation are central to the UI.

### Technical Implementations
The frontend is built with React 18 and TypeScript, using Radix UI, shadcn/ui, and Tailwind CSS for styling, with a custom enterprise design system. State management is handled by TanStack Query, and routing by Wouter, supporting both dark and light modes.

The backend uses Node.js with Express.js and TypeScript. AI integration primarily features xAI's Grok model. Session management is handled by Express sessions with a PostgreSQL store.

Key features include:
-   **Manus AI-Style Search Strategy Viewer**: A three-panel interface displaying job info, candidate pipeline (future), and an AI-generated search strategy.
-   **Conversational AI Recruiting Assistant**: A Grok-powered interface for collecting Need Analysis Profile (NAP) information using "Dance, Don't Drill" consultant-style conversation (not robotic Q&A), generating job orders, and creating candidate pipelines. Features cooperation radar detection, auto-fill from role templates, value-first mode (delivers top 3 candidates at 60% NAP), and natural consultant tone. System automatically creates default company if database is empty (prevents foreign key errors). Supports JD file uploads and natural language input with graceful error handling.
-   **Hybrid LinkedIn Search & Boolean Search**: Two-stage candidate search integrated with LinkedIn profile validation via SerpAPI for quick additions.
-   **Enhanced Team Discovery**: Supports pagination, multi-language sites, and uses a 3-tier scraping system.
-   **Multi-Language Name System**: Transliteration pipeline for international candidate names and email inference.
-   **Salesforce-Style Custom Fields**: User-defined fields for candidate data via a REST API, with a self-service UI for management.
-   **Candidate Management**: Full CRUD operations, intelligent document upload with text extraction, interaction tracking, and flexible processing modes (`full`, `career_only`, `bio_only`, `data_only`). Includes a soft delete "Recycling Bin" feature.
-   **Multi-Layer Office Extraction System**: A 4-layer pipeline for reliable office location extraction.
-   **AI-Powered Data Quality System**: Automated audit system with UI for validation rules, AI-powered fixes, and manual review queue with SLA tracking. Includes inline editing for company data.
-   **Production-Grade ATS Pipeline System**: Comprehensive 8-stage candidate pipeline management with Kanban and List views, advanced filtering, and bulk operations.
-   **AI Company Employee Research**: Targeted sourcing system using SerpAPI and Bright Data for LinkedIn employee profiles, with async polling and progress tracking.
-   **LinkedIn Reference Candidate Integration**: Intelligent search by example using LinkedIn profiles, leveraging company pattern learning and xAI Grok for profile analysis and search criteria adjustment. This system automatically executes intelligent searches and stages top candidates into the pipeline.
-   **External Candidate Sourcing Engine**: Production-grade system for discovering NEW candidates from LinkedIn via SerpAPI People Search and Bright Data profile scraping. Features async batch orchestrator with progress tracking, intelligent candidate ingestion pipeline with duplicate detection, and sourcing run management (status: 'pending' | 'processing' | 'completed' | 'failed'). Handles zero-results scenarios gracefully. Provenance tracking enables hybrid internal/external search.
    - **API Routes**: POST /api/sourcing/search (trigger search), GET /api/sourcing/:runId (poll progress), GET /api/sourcing/:runId/candidates (get results)
    - **Components**: SerpAPI client (server/serpapi.ts), orchestrator (server/sourcing-orchestrator.ts), ingestion pipeline (server/candidate-ingestion.ts), storage methods (server/storage.ts)
    - **Job Linking**: Automatically creates job_candidates entries when sourcing runs have a jobId, staging externally sourced candidates into the pipeline with status="recommended", matchScore=80, and tier=2. Includes duplicate prevention to avoid relinking candidates.
    - **AI Search Transparency**: Captures and displays search rationale explaining WHY specific criteria (title, location, keywords) were chosen, providing transparency into the AI's search strategy before execution. Rationale stored in sourcing_runs.search_rationale field.
    - **Status**: FULLY COMPLETE - Backend, chat integration, job linking, and AI transparency all production-ready.
-   **AI-Powered Candidate Fit Scoring**: Intelligent ranking system that creates the "consultant WOW effect" by evaluating candidates beyond keyword matching. Uses xAI Grok to analyze candidates against full NAP (Needs Analysis Profile) context including urgency, success criteria, team dynamics, and requirements. Provides transparent AI reasoning explaining WHY each candidate fits, with specific strengths and potential concerns.
    - **Scoring Engine**: `scoreCandidateFit()` in server/ai.ts evaluates candidate profiles (title, company, skills, experience) against NAP context to generate fitScore (0-100), reasoning (1-2 sentences), strengths[] (top 3), and concerns[] (gaps/risks)
    - **Integration**: Async batch scoring integrated into sourcing orchestrator (server/sourcing-orchestrator.ts) with rate limiting (2/second). Runs automatically after job linking as fire-and-forget background job
    - **Database**: Added fitScore, fitReasoning, fitStrengths, fitConcerns to job_candidates table. Storage layer sorts by fitScore DESC first, then matchScore as fallback
    - **UI Enhancement**: CandidateCard and KanbanView display prominent "AI Fit" badge with Brain icon, "Why this candidate fits" section with reasoning, and visual indicators for strengths (green checkmarks) and concerns (amber alerts). Creates meaningful hierarchy that feels like sophisticated AI consultant insights rather than basic keyword searching
    - **Status**: PRODUCTION-READY - Full end-to-end implementation approved by architect. Enhancement opportunities: retry/backoff for failed scoring, ListView integration, "scoring pending" indicator
-   **AI Promise System**: IMMEDIATE execution system that triggers external candidate sourcing when AI makes delivery commitments in conversation. When AI says "I'll have your longlist ready in 5 minutes", system INSTANTLY executes LinkedIn search via SerpAPI, fetches profiles via Bright Data, creates candidates, stages them in pipeline, and **delivers results back to the conversation automatically**. Includes intelligent fallback to internal database search if external search returns zero results.
    - **Architecture**: Promise detection → Immediate execution trigger → External LinkedIn search → Profile fetching → Candidate creation → Job linking → **Conversation notification**
    - **Components**: detectPromise() in server/promise-detection.ts (supports minute/hour/day/week/month + specific times like "by 16:27"), executeSearchPromise() in server/promise-worker.ts (now sends results to chat), searchLinkedInPeople() in server/serpapi.ts, orchestrateProfileFetching() in server/sourcing-orchestrator.ts
    - **Database**: search_promises table tracks AI commitments with execution logs, status tracking, and sourcing run linking. Auto-creates default company if database is empty to prevent foreign key crashes.
    - **Status**: PRODUCTION-READY - Immediate execution, delivery notification, minute-level granularity, specific time detection, graceful error handling, and conversation loop closure all implemented
-   **NAP-Driven Search Strategy Engine**: Pain-first search system that converts consultative NAP (Need/Authority/Pain) interviews into targeted Boolean LinkedIn queries. Goes beyond keyword matching by mapping business pain points to candidate experience signals, delivering 8-12 high-fit candidates instead of 20-30 generic profiles. System mandates ≥70% NAP completeness (40pts Need + 30pts Authority + 30pts Pain) before triggering external searches, ensuring quality over speed.
    - **Strategy Generation**: `generateSearchStrategy()` in server/nap-strategy.ts converts NAP context into pain-driven Boolean queries (e.g., `"(CFO OR \"Chief Financial Officer\") AND (M&A OR \"post-merger integration\") AND \"Hong Kong\""`) with role-specific competency mapping and industry targeting
    - **NAP Collection**: Updated AI system prompt (server/ai.ts) with `nap_complete` intent detection and consultative "Dance, Don't Drill" conversation flow. Automatically transitions from NAP gathering to search execution when completeness threshold met
    - **Dual Fit Scoring**: Combines deterministic NAP rubric (0-10 scale: 4pts Need match + 4pts Pain solver + 2pts Authority fit) with Grok AI reasoning for transparent candidate ranking. `calculateNAPFit()` provides fast scoring while Grok generates detailed strengths/concerns analysis
    - **Database**: NAP data persisted to jobs.need_analysis (JSONB: {need, authority, pain}), search strategy to jobs.search_strategy (JSONB: {keywords, filters, napSummary, searchRationale}). Dual scores stored in job_candidates.fit_score (NAP rubric * 10 or Grok 0-100 fallback)
    - **Boolean Search Integration**: Extended searchLinkedInPeople() in server/serpapi.ts to accept raw Boolean queries, prioritizing NAP-generated queries over simple keyword matching. Logs `🎯 [NAP-Driven Search]` when using strategic queries
    - **Fit Scoring Pipeline**: Integrated into sourcing orchestrator (server/sourcing-orchestrator.ts lines 456-526) with synchronous NAP rubric scoring followed by async Grok analysis. Graceful fallback if NAP data missing
    - **Status**: PRODUCTION-READY - NAP collection, strategy generation, Boolean search execution, and dual fit scoring all verified via database testing. Ready for full end-to-end consultative recruiting workflows

### System Design Choices
The primary database is PostgreSQL with Neon serverless hosting, using Drizzle ORM. The schema includes models for Companies, Candidates, Jobs, Job matches, Users, Data ingestion jobs, and Duplicate detection, with multi-language name support and custom fields. Companies can have roles like `['client', 'sourcing', 'prospecting']`. Duplicate detection prioritizes website domain matching. Custom fields use `custom_field_sections`, `custom_field_definitions`, and JSONB storage for flexibility. Candidates are soft-deleted using a `deleted_at` timestamp.

A hybrid AI strategy utilizes specialized AI services: xAI Grok for conversational intelligence, job description parsing, candidate longlist generation, AI biography generation, and team discovery; and Voyage AI for semantic embeddings and search optimization using the `voyage-2` model. PostgreSQL `pgvector` is used for native vector similarity search. The Company Intelligence Engine auto-categorizes companies and supports pattern learning. The embeddings infrastructure includes API endpoints for generation and search with automatic refresh.

The AI-Powered Data Quality System employs a three-layer processing approach (detection, AI remediation, manual queue) with a dedicated dashboard, interactive drill-down dialogs, and specific validation rules (e.g., Candidate Company Links, Duplicate Companies, Required Fields). It tracks metrics like Data Quality Score and AI Success Rate, and assigns priority levels (P0, P1, P2) to issues.

## External Dependencies

### AI Services
-   **xAI Grok API**: For conversational AI, job parsing, and matching logic.
-   **Voyage AI**: For semantic embeddings and vector search.

### Data Services
-   **SerpAPI**: For search engine results, LinkedIn profile discovery, and email research.
-   **Bright Data**: For LinkedIn profile scraping.

### Database
-   **Neon PostgreSQL**: Serverless database hosting.
-   **Drizzle ORM**: Database interactions.

### Email Services
-   **SendGrid**: For transactional email delivery.