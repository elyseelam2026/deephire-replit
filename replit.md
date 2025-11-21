# DeepHire - AI-Powered Talent Acquisition Platform

## Overview
DeepHire is an AI-powered enterprise B2B recruiting platform that revolutionizes talent acquisition, initially for Private Equity. It functions as an AI executive search consultant, sourcing external candidates via web scraping and providing intelligent candidate ranking based on a comprehensive Needs Analysis Profile (NAP) context. The platform automates job description parsing and streamlines recruitment workflows through a multi-portal architecture and integrated management systems. The long-term vision includes developing a bottom-up intelligence system for Company Intelligence, Organization Chart Mapping, Pattern Learning, Semantic Matching, and Culture Insights.

## User Preferences
Preferred communication style: Simple, everyday language.

## Latest Build Session (Nov 21, 2025)
**Complete Two-Sided Authentication & Portal System**
- Landing Home page (`/`) with two-sided marketplace explanation
- Unified Auth flow with role selection (Candidate/Company) → Register/Login selector
- **Candidate Portal**: Registration with 3-step form (Account → Profile → Experience), email verification, job recommendations dashboard with AI-matched jobs
- **Company Portal**: Registration → redirect to dashboard (`/company/portal`) with Post Job tab, My Jobs, Search Candidates, Settings
- **Password Hashing**: bcryptjs with 10 rounds of salt for all registrations
- **Email/SMS Verification**: 6-digit codes, 10-min expiration, rate limiting, Twilio integration ready for SMS
- **Company Features**: Post jobs endpoint (`/api/company/post-job`), Get company jobs endpoint, Job listing form with title/description/location/salary/level/skills
- **Backend Endpoints**: 
  - `/api/candidate/register` - Hash password + create candidate + send verification code
  - `/api/company/register` - Hash password + create company
  - `/api/company/post-job` - Create job listings
  - `/api/send-verification` - Send SMS via Twilio (when configured) or email
  - `/api/verify-code` - Verify 6-digit codes
- **Flow**: Landing → Auth role select → Register (candidate/company) → Verify Email → Dashboard/Portal

## System Architecture

### UI/UX Decisions
The platform features an enterprise-first, professional, and usable design. It utilizes a deep navy primary color, professional green accents, and the Inter font family. The design emphasizes reusable components for data tables, cards, forms, and navigation, supporting both dark and light modes. The architecture includes distinct portals for Agency, Client, Admin, and Candidate users, each with tailored navigation and functionalities, including an AI Assistant chatbox in the Client Portal.

### Technical Implementations
The frontend is built with React 18, TypeScript, Radix UI, shadcn/ui, Tailwind CSS, TanStack Query for state management, and Wouter for routing. The backend uses Node.js, Express.js, and TypeScript, integrating xAI's Grok model for AI functionalities and Express sessions with a PostgreSQL store for session management. Key features include an AI-powered conversational recruiting assistant, hybrid LinkedIn and Boolean search, enhanced team discovery with multi-language name support, Salesforce-style custom fields, comprehensive candidate management with a full-page workspace interface, an AI-powered data quality system, an 8-stage ATS pipeline, AI company employee research, and an external candidate sourcing engine. The platform features AI-powered candidate fit scoring, an AI Promise system for immediate execution, and a NAP-driven search strategy engine that converts consultative interviews into targeted Boolean LinkedIn queries with context-first rationale generation. A weighted binary scoring system enables client-controlled quality thresholds with transparent hard and soft skill scoring. An AI hallucination prevention system employs a three-layer validation for email inference, career history completeness, and data quality scoring.

**4-Phase Elite Sourcing Architecture** - A cost-aware, quality-first sourcing system that enforces strict quality gates and minimizes API costs:
- **Phase 1: NAP → Multi-Query Generator** (server/nap-query-generator.ts) - Universal NAP interface converts any role (CFO, CTO, VP, etc.) into 8-15 Boolean LinkedIn queries using Grok AI, with competitor mapping and X strategies.
- **Phase 2: Batch Fingerprinting** (server/serpapi.ts) - Parallel SerpAPI queries collect 300-800 LinkedIn URLs + snippets with deduplication (~$0.045 cost).
- **Phase 3: Lightning NAP Scoring** (server/grok-snippet-scorer.ts) - Batch-scores ALL fingerprints against NAP hard skills in a single Grok API call, filters to predicted ≥68% quality (~$0.08 cost).
- **Phase 4: Selective Scraping** (server/sourcing-orchestrator.ts) - Scrapes ONLY quality-predicted candidates, scores BEFORE database insertion using dynamic quality threshold (config.minQualityPercentage), rejects candidates below threshold (never enter DB), enforces mid-loop budget checks with immediate short-circuit, and tracks costs after each phase.

**Weighted Scoring System** (server/weighted-scoring.ts) - Implements normalized 0-100 scoring that adapts to soft skill availability:
- Hard Skills: 70% weight (0-70 points from LinkedIn data, AI-scored)
- Soft Skills: 30% weight (0-30 points from human consultant evaluation, not yet implemented)
- When soft skills = 0: finalPercentage = (hardSkillScore / 70) × 100 (normalizes to 100-scale)
- When soft skills > 0: finalPercentage = hardSkillScore + softSkillScore (additive model)
- Quality Tiers: Elite (≥85%, requires ≥60/70 hard skills when soft=0), Standard (70-84%, requires ≥49/70), Acceptable (60-69%, requires ≥42/70), Rejected (<60%)

**VALUE-BASED PRICING MODEL** (Implemented Jan 2025 - Grok + ChatGPT Strategy)
The platform employs a revolutionary pricing strategy that mirrors real executive search economics: **Elite searches cost MORE (precision is valuable), volume searches cost LESS per candidate (noise is cheap)**. This inverts the typical SaaS pricing model to reward quality-focused recruiting.

**Search Depth Tiers** (server/sourcing-orchestrator.ts - `mapSearchDepthToConfig`):
- **Elite 8** (≥88% hard skills): $149 - C-suite, PE CFO/COO, Fund Partners. Premium pricing reflects the difficulty of finding 8 perfect candidates who can transform a portfolio company.
- **Elite 15** (≥84% hard skills): $199 - VP/SVP, GM, Functional Heads. Highest-priced tier emphasizes precision over volume.
- **Standard 25** (≥76% hard skills): $129 - Director-level, Senior roles. Sweet spot for most executive searches.
- **Deep 60** (≥66% hard skills): $149 - Specialists, wide net, niche roles. More candidates but cheaper per candidate than elite tiers.
- **Market Scan** (≥58% hard skills): $179 flat fee - Intelligence gathering, market mapping, salary benchmarking. Cheapest per-candidate option (150+ profiles).

**Pricing Philosophy**: Finding 8 perfect PE CFO candidates requires more AI compute, deeper market research, and stricter quality gates than finding 150 mediocre profiles. Users pay for **precision, not noise** - exactly how traditional executive search firms justify 20-33% of first-year compensation for quality placements. The system enforces early stopping when target quality count is reached, preventing credit waste on low-quality candidates.

**Legacy Tier Support**: The system maintains backward compatibility with legacy tier names (8_elite → elite_8, 20_standard → standard_25, 50_at_60 → deep_60, 100_plus → market_scan) during the transition period.

**Candidate Detail Workspace** - A comprehensive full-page interface featuring 6 tabs (Overview, Activity Log, Files, Job Assignments, Career History, Executive Biography) with inline activity creation, document management, and job assignment tracking. The hybrid approach retains War Room modal quick previews with a "View Full Profile" button for deep-dive candidate management.

### System Design Choices
The primary database is PostgreSQL (Neon serverless) with Drizzle ORM, supporting Companies, Candidates, Jobs, Job matches, Users, Data ingestion, Duplicate detection, Candidate activities, Candidate files, and Candidate interviews, including multi-language support and custom fields via JSONB. A hybrid AI strategy leverages xAI Grok for conversational intelligence, parsing, and generation, and Voyage AI for semantic embeddings and vector search via PostgreSQL `pgvector`. The AI-Powered Data Quality System uses a three-layer processing approach (detection, AI remediation, manual queue) with a dedicated dashboard. The candidate management system features activity tracking with support for notes, emails, calls, and meetings, document management with metadata storage ready for S3 integration, and interview scheduling with outcome tracking.

## External Dependencies

### AI Services
-   **xAI Grok API**: Conversational AI, job parsing, matching logic.
-   **Voyage AI**: Semantic embeddings and vector search.

### Data Services
-   **SerpAPI**: Search engine results, LinkedIn profile discovery, email research.
-   **Bright Data**: LinkedIn profile scraping.

### Database
-   **Neon PostgreSQL**: Serverless database hosting.
-   **Drizzle ORM**: Database interactions.

### Email Services
-   **SendGrid**: Transactional email delivery.