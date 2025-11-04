# DeepHire - AI-Powered Talent Acquisition Platform

## Overview
DeepHire is an enterprise-grade B2B recruiting platform that leverages AI to revolutionize talent acquisition, initially focusing on Private Equity and expanding to other sectors. It acts as an AI-powered executive search consultant, learning hiring patterns, understanding career trajectories, and semantically matching candidates. The platform offers intelligent candidate matching, automated job description parsing, and streamlined recruitment workflows for recruiting firms, their clients, and candidates, featuring a multi-portal architecture and comprehensive management systems.

The long-term vision involves a bottom-up intelligence system that includes:
-   **Company Intelligence**: AI extracts and categorizes data from 1000+ company websites.
-   **Organization Chart Mapping**: Gradually builds organizational charts.
-   **Pattern Learning**: Analyzes org charts to identify hiring patterns.
-   **Semantic Matching**: Matches candidates based on learned patterns and career paths.
-   **Culture Insights**: Learns company culture through interactions.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
-   **Framework**: React 18 with TypeScript.
-   **UI/Styling**: Radix UI, shadcn/ui, Tailwind CSS with a custom enterprise design system.
-   **State Management**: TanStack Query.
-   **Routing**: Wouter.
-   **Theme**: Dark/light mode support.

### Backend
-   **Runtime**: Node.js with Express.js.
-   **Language**: TypeScript.
-   **AI Integration**: xAI's Grok model.
-   **Session Management**: Express sessions with PostgreSQL store.

### Database
-   **Primary Database**: PostgreSQL with Neon serverless hosting.
-   **ORM**: Drizzle ORM.
-   **Schema**: Models for Companies, Candidates, Jobs, Job matches, Users, Data ingestion jobs, and Duplicate detection, with multi-language name support and custom fields.
-   **Company Role Architecture**: Companies can have roles like `['client', 'sourcing', 'prospecting']`.
-   **Duplicate Detection**: Prioritizes website domain matching.
-   **Custom Fields System**: Flexible architecture using `custom_field_sections`, `custom_field_definitions`, and JSONB storage.
-   **Soft Delete**: Candidates are soft-deleted using a `deleted_at` timestamp.

### AI and Machine Learning - Multi-Platform Architecture
-   **Hybrid AI Strategy**: Utilizes specialized AI services for different capabilities.
-   **xAI Grok-2-1212**: Conversational intelligence, job description parsing, candidate longlist generation, AI biography generation, team discovery, and multi-turn conversational interfaces.
-   **Voyage AI**: Semantic embeddings for candidate profiles and search optimization using `voyage-2` model.
-   **PostgreSQL pgvector**: Native vector similarity search for efficient indexed lookups.
-   **Company Intelligence Engine**: Auto-categorizes companies and supports pattern learning.
-   **Embeddings Infrastructure**: API endpoints for generating and searching embeddings, with automatic refresh.

### Design System
-   **Philosophy**: Enterprise-first, professional, and usable.
-   **Palette**: Deep navy primary, professional green accents.
-   **Typography**: Inter font family.
-   **Components**: Reusable components for data tables, cards, forms, navigation.

### Technical Implementations
-   **Manus AI-Style Search Strategy Viewer**: A three-panel job detail interface showing job info, candidate pipeline (future), and an AI-generated, transparent search strategy.
-   **Conversational AI Recruiting Assistant with NAP Collection**: A Grok-powered ChatGPT-style interface for collecting Need Analysis Profile (NAP) information, generating job orders, and creating candidate pipelines. It supports JD file uploads, natural language input, and offers two-tier search pricing (internal vs. external).
-   **Hybrid LinkedIn Search**: Two-stage search for candidate finding, integrated with LinkedIn profile validation via SerpAPI.
-   **Boolean Search**: Advanced LinkedIn search for quick additions.
-   **Enhanced Team Discovery**: Supports pagination, multi-language sites, and uses a 3-tier scraping system.
-   **Multi-Language Name System**: Transliteration pipeline for international candidate names and email inference.
-   **Salesforce-Style Custom Fields**: Allows user-defined fields for candidate data with a REST API.
-   **Candidate Management**: Full CRUD operations, intelligent document upload with text extraction, and interaction tracking.
-   **Flexible Processing Modes**: Four modes for candidate uploads (`full`, `career_only`, `bio_only`, `data_only`) and retroactive processing.
-   **Recycling Bin Feature**: Soft delete with restore functionality.
-   **Multi-Layer Office Extraction System**: A 4-layer pipeline for reliable office location extraction.
-   **AI-Powered Data Quality System** (Phase 1): Automated audit system that runs validation rules, attempts AI-powered fixes, and queues issues for manual review with comprehensive reporting and SLA tracking.

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

## AI-Powered Data Quality System

### Overview
An intelligent, self-healing data quality system that continuously monitors database integrity, automatically fixes issues using AI, and escalates complex problems to human reviewers. The system learns from human decisions to improve over time.

### Architecture (Phase 1 - Complete)

**Three-Layer Processing:**
1. **Detection**: Runs 6 validation rules to identify data quality issues
2. **AI Remediation**: Attempts automatic fixes with confidence scoring (90%+ = auto-apply)
3. **Manual Queue**: Routes unsolvable issues to human reviewers with SLA tracking

### Database Schema
- **audit_runs**: Tracks each audit execution and summary metrics
- **audit_issues**: Individual data quality problems discovered
- **remediation_attempts**: AI fix attempts with confidence scores and rollback capability
- **manual_intervention_queue**: Issues requiring human review with SLA deadlines

### Validation Rules
1. **Candidate Company Links**: Ensures all candidates with company names have proper FK relationships
2. **Career History Links**: Validates company links in career history arrays
3. **Duplicate Companies**: Detects potential duplicate company records
4. **Required Fields**: Checks for missing contact information
5. **Job Candidate Integrity**: Validates referential integrity of job-candidate relationships
6. **Company Data Quality**: Ensures companies have minimal required information

### AI Remediation Capabilities

**High Confidence (>90%) - Auto-Apply:**
- Company linking via fuzzy matching
- Missing company creation and linking
- Data normalization

**Medium Confidence (70-90%) - Apply with Flag:**
- Email inference using company patterns
- Company data enrichment via web research

**Low Confidence (<70%) - Manual Queue:**
- Ambiguous matches requiring human decision
- Missing data with no findable sources

### Usage

**Run Manual Audit:**
```bash
npx tsx scripts/run-audit.ts
```

**Outputs:**
- Console report with summary statistics
- CSV report for detailed analysis
- HTML email report for stakeholders

### Metrics Tracked
- **Data Quality Score**: 0-100 overall health metric
- **AI Success Rate**: Percentage of issues auto-fixed
- **Execution Time**: Performance monitoring
- **SLA Compliance**: Tracks issue resolution times by priority

### Priority Levels
- **P0 (Critical)**: 4-hour SLA - Blocking issues requiring immediate attention
- **P1 (Important)**: 24-hour SLA - Data integrity issues
- **P2 (Enhancement)**: 7-day SLA - Optional improvements

### Future Roadmap
- Phase 2: Confidence learning system (AI learns from human feedback)
- Phase 3: Real-time quality dashboard and email alerts
- Phase 4: Anomaly detection and progressive enrichment