# DeepHire - AI-Powered Talent Acquisition Platform

## Overview
DeepHire is an AI-powered enterprise B2B recruiting platform designed to revolutionize talent acquisition, initially focusing on Private Equity. It acts as an AI executive search consultant, discovering new external candidates via web scraping and providing intelligent candidate ranking based on a comprehensive Needs Analysis Profile (NAP) context, going beyond simple keyword matching. The platform automates job description parsing and streamlines recruitment workflows through a multi-portal architecture and integrated management systems. The long-term vision includes developing a bottom-up intelligence system for Company Intelligence, Organization Chart Mapping, Pattern Learning, Semantic Matching, and Culture Insights.

## Recent Changes (November 2025)

### Portal Architecture Reorganization + AI Chatbox Integration (November 2025)
**Goal**: Separate Agency, Client, Admin, and Candidate portals with proper navigation and interconnections. Add conversational AI interface to Client Portal.

**Changes Implemented**:
- **Agency Portal** (`/recruiting/*`): Full recruiting features with sidebar navigation - Companies, Jobs, Candidates, Recycling Bin, Staging, Conversations, Outreach
- **Client Portal** (`/client/*`): PE firms view with sidebar navigation and **AI Assistant chatbox**
  - **Dashboard**: 4 tabs - AI Assistant (chatbox), Quick Upload, Create Job, My Jobs
  - **Sidebar**: Dashboard, Post Job, My Jobs, Candidates, Recycling Bin, Messages
  - **Messages** (`/client/messages`): View all AI conversations, start new conversations
  - **Conversation Detail** (`/client/conversations/:id`): Full chat interface with AI, delete conversation
  - Detail views for jobs/candidates/companies with cross-portal navigation
- **Admin Portal** (`/admin`): Single-page tabbed interface (as originally built) - Quick Add, Bulk Upload (candidates/companies), AI Research, Duplicates Review, Upload History, Data Quality, Custom Fields
- **Candidate Portal** (`/candidate-portal`): Standalone page - Profile, Job Matches, Messages (minimal for now)

**Conversation Features** (New):
- **AI Chatbox**: Available in Client Portal dashboard (default tab) for conversational recruiting
- **Start New Conversation**: Create new AI recruiting conversations from Messages page
- **View Conversations**: Click on conversation cards to view/interact with full chat history
- **Delete Conversations**: Delete button with confirmation dialog in conversation detail page
- **Persistent Sessions**: Conversations saved to database, resume across sessions

**Interconnections**:
- Jobs page → Company links (click company to view detail) - works across all portals with relative paths
- Company detail → Jobs and Candidates tabs (clickable lists)
- Candidates → Company links (from career history)
- All portals have matching detail routes (/jobs/:id, /candidates/:id, /companies/:id, /conversations/:id)

**Navigation**:
- Agency and Client portals use sidebar-based navigation (AppSidebar explicitly receives portal type prop)
- Admin portal uses original tabbed interface (not sidebar-based)
- Recycling Bin added to Client Portal per user feedback
- Messages page accessible from both Agency and Client portals with context-aware routing

### NAP → Search Strategy Pipeline Fix (November 2025)
**Problem**: NAP data was collected but never used in external searches. Promise-worker passed empty searchParams to SerpAPI, resulting in random candidates instead of targeted results.

**Solution**: Modified `server/promise-worker.ts` to fetch job's searchStrategy and use Boolean query when calling SerpAPI.

**Key Changes**:
1. **Fetch searchStrategy**: Promise-worker now retrieves job's searchStrategy containing Boolean query, industry filters, location
2. **Type-safe parameters**: Boolean query (STRING) passed to `booleanQuery` field, not keywords array
3. **Smart fallback**: Falls back to promise.searchParams when searchStrategy missing
4. **Error handling**: Try-catch around SerpAPI calls with proper status updates and retry increment
5. **Zero-results logging**: Logs when Boolean query returns no profiles for debugging
6. **Log persistence**: Re-fetches promise before completion to preserve all executionLog events

**Test Results**: Job 69 (Associate at Boyu Capital) now searches with: `"(PE Associate OR IB Associate OR M&A Associate...) AND Hong Kong"` and successfully returns targeted PE/IB Associates instead of random candidates.

### NAP v2: Enhanced Needs Assessment Profile (In Progress)
**Goal**: Transform NAP from flat checklist to client-calibrated, AI-executable contract based on 30-year headhunter feedback.

**7 Core Enhancements (All Implemented in Schema)**:
1. **Client-Friendly Language**: "Non-Negotiable / High Priority / Bonus" (not recruiter jargon)
2. **Willing to Train Toggle**: 40% of "must-haves" aren't dealbreakers if candidate is coachable
3. **Dealbreaker Red Flags**: Auto-reject criteria (job-hopping, location, background requirements)
4. **Success Benchmark Field**: Client names 1-2 perfect-fit examples for AI pattern matching
5. **Min/Target Split Sliders**: "60% to consider, 90% is dream hire" - flexible ranking within band
6. **Time Sensitivity**: Exploratory/Standard/Urgent/Critical affects threshold adjustments
7. **Cultural Fit DNA**: 3-word summary for soft skills alignment

**Schema Structure (shared/schema.ts)**:
```typescript
weighted_criteria: Array<{
  requirement: string;
  priority: 'non-negotiable' | 'high-priority' | 'bonus';
  minFulfillment: number;      // Min to consider (e.g., 60%)
  targetFulfillment: number;   // Dream hire (e.g., 90%)
  evidenceGuidance: string;    // "What does 80% mean?"
  willingToTrain: boolean;     // Lower bar if trainable
  weight: number;              // Auto-sum to 70
}>;
red_flags: Array<{ flag, enabled, reason }>;
success_benchmark: string;
time_sensitivity: 'exploratory' | 'standard' | 'urgent' | 'critical';
cultural_fit_dna: string;  // 3-word summary
```

**Next Steps**:
- Build NAP Interview UI with sliders, toggles, real-time weight calculation
- Update AI scoring to use Min/Target bands, red flags, success benchmarks
- Wire to sourcing pipeline

### Phase 1: Weighted Binary Scoring System (Foundation Complete)
**Goal**: Client-controlled quality thresholds with transparent hard skills (70%) vs soft skills (30%) scoring.

**Schema Changes**:
- Added quality settings to `jobs` table: `qualityMode`, `minHardSkillScore`, `requireAllMustHaves`, `maxCandidates`
- Weight normalization ensures must-haves sum to exactly 70 points
- Default threshold: 50% of hard skills (35/70 points)

**AI Scoring Enhancement**:
- Created `scoreCandidateWeightedFit()` function in `server/ai.ts`
- Binary yes/no matching for each requirement
- Hard skills (0-70 points): AI evaluates against JD requirements
- Soft skills (0-30 points): AI estimates, client validates in-person
- Returns detailed breakdown with evidence per requirement

**Quality Mode Presets**:
- Standard: 50% hard skills (35/70) = ~3 of 6 requirements
- Premium: 60% hard skills (42/70) = ~4 of 6 requirements
- Elite: 70% hard skills (49/70) = ~5 of 6 requirements (near-perfect)

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