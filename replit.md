# DeepHire - AI-Powered Talent Acquisition Platform

## Overview
DeepHire is an AI-powered enterprise B2B recruiting platform designed to revolutionize talent acquisition, initially focusing on Private Equity. It acts as an AI executive search consultant, discovering new external candidates via web scraping and providing intelligent candidate ranking based on a comprehensive Needs Analysis Profile (NAP) context, going beyond simple keyword matching. The platform automates job description parsing and streamlines recruitment workflows through a multi-portal architecture and integrated management systems. The long-term vision includes developing a bottom-up intelligence system for Company Intelligence, Organization Chart Mapping, Pattern Learning, Semantic Matching, and Culture Insights.

## Recent Changes (January 2025)

### Phase 1: Weighted Binary Scoring System (In Progress)
**Goal**: Client-controlled quality thresholds with transparent hard skills (70%) vs soft skills (30%) scoring.

**Schema Changes**:
- Added quality settings to `jobs` table: `qualityMode`, `minHardSkillScore`, `requireAllMustHaves`, `maxCandidates`
- Extended NAP `requirements` section with `weighted_criteria` array supporting must-have/nice-to-have with weights
- Default threshold: 50% of hard skills (35/70 points)

**AI Scoring Enhancement**:
- Created `scoreCandidateWeightedFit()` function in `server/ai.ts`
- Binary yes/no matching for each must-have requirement
- Hard skills (0-70 points): AI evaluates against JD must-haves
- Soft skills (0-30 points): AI estimates, client validates in-person
- Returns detailed breakdown with evidence per requirement

**Quality Mode Presets**:
- Standard: 50% hard skills (35/70) = ~3 of 6 requirements
- Premium: 60% hard skills (42/70) = ~4 of 6 requirements
- Elite: 70% hard skills (49/70) = ~5 of 6 requirements (near-perfect)

**Next Steps**:
- Update pipeline filtering to respect quality thresholds
- Add UI controls for quality settings (job creation/edit)
- Test weighted scoring with real candidate data

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The platform features an enterprise-first, professional, and usable design with a deep navy primary color, professional green accents, and the Inter font family. It emphasizes reusable components for data tables, cards, forms, and navigation, supporting both dark and light modes.

### Technical Implementations
The frontend uses React 18, TypeScript, Radix UI, shadcn/ui, Tailwind CSS, TanStack Query for state management, and Wouter for routing. The backend is built with Node.js, Express.js, and TypeScript, integrating xAI's Grok model for AI functionalities and Express sessions with a PostgreSQL store for session management.

Key features include:
-   **AI-Powered Conversational Recruiting Assistant**: A Grok-powered interface for collecting NAP information, generating job orders, and creating candidate pipelines, with "Dance, Don't Drill" consultation style.
-   **Hybrid LinkedIn & Boolean Search**: Integrated candidate search with LinkedIn profile validation.
-   **Enhanced Team Discovery & Multi-Language Name System**: Supports multi-language sites, 3-tier scraping, and transliteration for international names.
-   **Salesforce-Style Custom Fields**: User-defined fields for candidate data with a self-service UI.
-   **Candidate Management**: Full CRUD, intelligent document upload, interaction tracking, and a soft-delete "Recycling Bin".
-   **AI-Powered Data Quality System**: Automated audit system with UI for validation rules, AI-powered fixes, and a manual review queue.
-   **Production-Grade ATS Pipeline System**: 8-stage candidate pipeline management with Kanban/List views, filtering, and bulk operations.
-   **AI Company Employee Research & LinkedIn Reference Candidate Integration**: Targeted sourcing and intelligent search by example using LinkedIn profiles.
-   **External Candidate Sourcing Engine**: Production-grade system for discovering new candidates from LinkedIn, featuring async batch orchestration, duplicate detection, and provenance tracking. Uses a **two-phase resilience architecture**: links all candidates immediately (ensuring visibility), then attempts AI fit scoring as a separate phase (graceful degradation if AI fails).
-   **AI-Powered Candidate Fit Scoring**: Intelligent ranking system using xAI Grok to evaluate candidates against the full NAP context, providing transparent AI reasoning.
-   **AI Promise System**: Immediate execution system that triggers external candidate sourcing and delivers results back to the conversation when AI makes delivery commitments.
-   **NAP-Driven Search Strategy Engine**: Converts consultative NAP interviews into targeted Boolean LinkedIn queries, mapping business pain points to candidate experience signals, and ensuring quality with a completeness threshold before triggering external searches. It includes a pre-scraping relevance filter and dual fit scoring.
    -   **Context-First Rationale Generation**: Search strategy explanations use actual NAP data (real years of experience, actual competitor counts, specific pain points) instead of generic placeholders.
    -   **Oxford Comma Formatting**: Professional natural language formatting for multi-item lists (e.g., "A, B, and C").
    -   **Case-Insensitive Generic Filtering**: Two-layer defense prevents generic urgency labels ("High/Medium/Low/Urgent") from appearing as business pain descriptions.
-   **Express Turnaround Pricing**: Flexible turnaround options with transparent pricing. All jobs default to standard 12-hour turnaround with base placement fee. High/urgent priority jobs are offered express 6-hour turnaround (+50% fee) via email notification with upgrade CTA. Pricing calculated using base fee and turnaround multiplier (1.0 for standard, 1.5 for express) to prevent rounding errors and ensure accurate upcharge display. PATCH /api/jobs/:id/turnaround endpoint enables runtime upgrades.

### System Design Choices
The primary database is PostgreSQL (Neon serverless) with Drizzle ORM. The schema supports Companies, Candidates, Jobs, Job matches, Users, Data ingestion, and Duplicate detection, including multi-language support and custom fields via JSONB. A hybrid AI strategy uses xAI Grok for conversational intelligence, parsing, and generation, and Voyage AI for semantic embeddings and vector search via PostgreSQL `pgvector`. The AI-Powered Data Quality System uses a three-layer processing approach (detection, AI remediation, manual queue) with a dedicated dashboard.

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