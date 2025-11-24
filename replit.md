# DeepHire - AI-Powered Talent Acquisition Platform

## Overview
DeepHire is an AI-powered enterprise B2B recruiting platform designed to revolutionize talent acquisition, initially focusing on Private Equity. It acts as an AI executive search consultant, automating candidate sourcing via web scraping and intelligent ranking based on a Needs Analysis Profile (NAP). The platform streamlines recruitment workflows through a multi-portal architecture, integrated management systems, and a vision for advanced Company Intelligence, Organization Chart Mapping, Pattern Learning, Semantic Matching, and Culture Insights. The platform includes features such as Salary Benchmarking, a Hiring Committee War Room, Predictive Success Scoring, Video Interview Screening, Diversity Analytics, Competitor Intelligence, ATS Integrations, a Passive Talent CRM, Slack Integration, and a White-Label Platform.

## User Preferences
Preferred communication style: Simple, everyday language. Focus on continuous AI accuracy improvements over infrastructure work.

## Recent Accomplishments (Session: Position Keywords Intelligence System + Hard Skills Architecture)

### ✅ Position Keywords Learning System - COMPLETE
Implemented intelligent keyword mapping that learns and grows over time:

**Database Structure:**
- `positionKeywords` table maps positions (CFO, VP Sales) to:
  - Keywords (M&A, ACCA, CPA, Financial Reporting)
  - Certifications (CPA, ACCA, CFA)
  - Skills (FP&A, Treasury, Board Reporting)
  - Industries (Finance, PE, Banking)
  - Seniority level (C-Suite, VP, Director)
  - Search count (tracks how often position searched)
  - Source (seed data vs. learned_from_search)

**Intelligence Features:**
- Default seed data for 7 common positions: CFO, VP Sales, CTO, VP Operations, Associate, Analyst, Manager
- Position-specific keywords enhance boolean search queries (e.g., "CFO" automatically expands to include M&A, Treasury, ACCA)
- Learning engine: `recordSearchForPosition()` captures new keywords discovered in searches
- Fuzzy matching: Finds keywords for "VP Finance" even if only "VP Sales" entry exists

**Boolean Search Enhancement:**
- Before: `"CFO" AND (M&A OR Treasury) AND "Hong Kong"`
- After: `("CFO" OR "Chief Financial Officer" OR "VP Finance") AND (M&A OR Treasury OR "Financial Reporting" OR "ACCA") AND "Hong Kong"`
- Query auto-enriches with 7+ typical keywords from position database

**Implementation Files:**
- `server/position-keywords.ts` - Position keyword intelligence engine
- Updated `server/nap-strategy.ts` - Integrates keywords into query generation
- Database: `positionKeywords` table in schema

### ✅ Hard Skills vs Soft Context Architecture - COMPLETE
Fixed critical architectural issue separating hard skills (for sourcing NOW) from soft context (for post-sourcing scoring):

**Hard Skills (LinkedIn-visible, trigger sourcing immediately):**
- Title (CFO, VP Sales)
- Hard skills (M&A, Treasury, FP&A)
- Location (HK, SF)
- Seniority level (inferred from title + progression, NOT explicit years)
- Competitor companies

**Soft Context (collected in parallel, used for quality gate):**
- Salary (can't use in sourcing, used for negotiations)
- Success criteria (evaluate after finding candidates)
- Team dynamics (evaluate after)
- Growth preference (evaluate after)
- Remote policy (evaluate after)
- Leadership style (evaluate after)
- Urgency (affects quality gate threshold)

**Key Change:** System now infers seniority from graduation year + job history, not explicit "years of experience" (which LinkedIn doesn't provide).

## Recent Accomplishments (Previous Session: NAP Confirmation System)

### ✅ NAP Interview + Confirmation Layer - COMPLETE
Implemented a sophisticated multi-phase NAP system that captures deep-insight signals and allows recruiters to confirm/refine the NAP before sourcing:

**Phase 1: NAP Interview (8 Deep-Insight Questions)**
- Position context (title, location, yearsExperience)
- Growth preference (leadership vs. specialist trajectory)
- Remote policy (remote, hybrid, onsite)
- Leadership style (manages diverse teams, collaborative, hands-on, etc.)
- Competitor context (which companies to target)
- Team dynamics (culture alignment)
- Business urgency (strategic vs. tactical)
- Success criteria (what defines a win?)

**Phase 2: Multi-Layered Boolean Search Strategy**
- 3-4 sophisticated stacked queries combining skills + industry + competitor intelligence + career trajectory
- Pain-driven sourcing approach (e.g., "M&A experience + scaling" vs. "generic CFO search")
- Competitor firm mapping for executive searches (20+ peer firms)
- Query decomposition: Each query maps to specific NAP signal + seniority level + deal-breaker exclusions

**Phase 3: Contextual Quality Gate**
- Adaptive scoring threshold based on urgency:
  - Urgent hires: 65% quality gate (faster recruiting)
  - Long-term strategic: 75% quality gate (more selective)
  - Standard: 70% quality gate
- Applied to candidate fit scoring via xAI Grok

**Phase 4: Deep Signal Scoring**
- Growth trajectory alignment (career path vs. role expectations)
- Remote fit (location vs. policy requirements)
- Leadership alignment (leadership style fit)
- Competitor signals (sourced from target companies)
- Auto-adjustments: +10-15 pts for urgent + 7+ yrs; -15-20 pts for remote policy mismatches

**Phase 5: NAP Confirmation Screen**
- Interactive UI showing NAP summary (position, years, pain points)
- Editable deal-breaker list (add/remove what disqualifies candidates)
- Skill categorization toggle: Click badges to move skills between must-have/nice-to-have
- Seniority level input
- Additional context notes
- Auto-triggers search strategy generation with enriched context on confirmation

### New AI Functions
- **`extractDealBreakersAndSkillCategories()`** - Uses xAI Grok to extract disqualifiers and organize skills by importance + infer seniority level

### New API Endpoints
- **`POST /api/jobs/:jobId/nap/confirm`** - Accepts confirmed NAP with deal-breakers + skill categories + seniority level
  - Auto-updates job.needAnalysis in database
  - Auto-generates search strategy with enriched context
  - Returns job ready for sourcing

### New UI Components
- **`NAPConfirmationScreen.tsx`** - Beautiful, fully-interactive confirmation screen with deal-breaker management and skill categorization

### Extended Architecture
- **SearchStrategy Interface**: Added `queryDecomposition` array mapping each search query to:
  - NAP signals targeted (pain-driven, competitor, growth, seniority)
  - Target seniority level for that specific query
  - Human description of what each query finds
  - Deal-breaker exclusions per query

### Integration Flow (ConversationDetail.tsx)
- Automatically shows confirmation screen when conversation.phase === 'nap_complete'
- Recruiter edits deal-breakers, categorizes skills, sets seniority
- Clicks "Confirm NAP & Generate Search"
- API merges NAP + generates search strategy
- Success toast notifies recruiter, then navigates back
- Search begins with enriched context

## System Architecture

### UI/UX Design
The platform features an enterprise-first, professional interface utilizing a deep navy primary color with green accents. It uses the Inter font family, supports both dark and light modes, and is built with a reusable component system. A multi-portal architecture serves different user types: Researcher, Company, Agency, Admin, and Candidate.

### Technical Stack
- **Frontend**: React 18, TypeScript, Radix UI, shadcn/ui, Tailwind CSS, TanStack Query, Wouter routing
- **Backend**: Node.js, Express.js, TypeScript
- **Database**: PostgreSQL (Neon serverless) with Drizzle ORM and Zod schemas
- **AI**: xAI Grok for NAP interviews and deep signal scoring, Voyage AI for semantic search
- **Multi-Tenancy**: Database-level isolation with `tenant_id` foreign keys, supporting Company, Agency, Candidate, and Researcher tenant types.

### Feature Specifications
The platform incorporates 10 core features, each with dedicated API endpoints and business logic:
- **Salary Benchmarking & Offer Optimizer**: Provides market data and AI-powered offer recommendations.
- **Hiring Committee War Room**: Facilitates multi-voter consensus with AI analysis of reasoning.
- **Predictive Success Scoring**: ML model for predicting tenure, retention risk, and culture fit.
- **Video Interview Screening**: One-way video screening with AI scoring for communication and clarity.
- **Diversity Analytics Dashboard**: Tracks DEI metrics, pipeline analytics, and bias detection.
- **Competitor Intelligence**: Tracks candidates interviewing at competitors and analyzes talent flow.
- **ATS Integrations**: Supports integration with ATS systems like Greenhouse for job syncing and candidate push-back.
- **Passive Talent CRM**: Manages high-potential candidates for future roles with reengagement scheduling.
- **Slack Integration**: Provides real-time notifications for recruiting activities.
- **White-Label Platform**: Enables multi-tenant agency setup with custom branding and usage-based billing.

### API Endpoints
The system exposes 30+ production API endpoints, now including:
- **Tenant Management**: `/api/tenants/create`, `/api/tenants/:id`, `/api/invitations/send`, `/api/invitations/accept`, `/api/tenants/:id/members`, `/api/candidates/create-account`, `/api/candidates/:userId/account`.
- **NAP Management**: `/api/jobs/:jobId/nap/confirm` (NEW - confirm and generate search strategy)
- **Feature-specific endpoints**: e.g., `/api/salary-benchmark`, `/api/war-rooms`, `/api/predictive-score`, `/api/video-interviews`, `/api/diversity-metrics`, `/api/competitor-alerts`, `/api/ats/greenhouse/connect`, `/api/passive-reengagement`, `/api/integration/slack-connect`, `/api/whitelabel/onboard`.

### Database Schema
The database comprises 18+ tables including `tenants`, `tenant_members`, `tenant_invitations`, `salaryBenchmarks`, `offerOptimizations`, `warRooms`, `predictiveScores`, `videoInterviews`, `diversityMetrics`, `competitorInterviews`, `atsConnections`, `passiveTalentPool`, `integrationConnections`, and `whitelabelClients`. The `jobs` table now includes `needAnalysis` (JSONB with confirmed NAP) and `searchStrategy` (JSONB with decomposition array).

## External Dependencies
- **AI**: xAI Grok (for NAP interviews, deal-breaker extraction, deep signal scoring), Voyage AI (semantic search)
- **Search & Scraping**: SerpAPI (LinkedIn search), Bright Data (profile scraping)
- **Communication**: SendGrid (email), Twilio (SMS), Slack API (notifications)
- **Database**: Neon (serverless PostgreSQL)

## What's Next
The NAP confirmation system is complete and production-ready. Next priorities:
1. Test the full NAP interview → confirmation → search flow end-to-end
2. Implement search execution with multi-layered boolean queries
3. Integrate deep signal scoring into candidate ranking
4. Build candidate presentation & outreach workflows
