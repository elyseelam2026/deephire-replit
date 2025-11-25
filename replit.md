# DeepHire - AI-Powered Talent Acquisition Platform

## Overview
DeepHire is an AI-powered enterprise B2B recruiting platform with intelligent candidate sourcing and matching. The platform uses xAI Grok for dynamic NAP interviews, **thoughtful research phases** before proposing solutions, and a **dual-track sourcing model** (active job posting + passive candidate hunting).

## Core Philosophy: Quality Over Speed
**DO NOT RUSH.** After collecting NAP information:
1. Research the company, industry, and hiring patterns
2. Think deeply about what candidates they actually need
3. Generate informed, professional JDs grounded in research
4. Ask permission to post JD to active channels while passive sourcing runs
5. Alert user when each phase completes

This mirrors how manual recruiters work (Spencer Stuart, Korn Ferry) - they research before proposing, then work both channels simultaneously.

## User Preferences
- Preferred communication: Simple, everyday language. Focus on continuous AI accuracy improvements over infrastructure work.
- **CRITICAL:** No showing off shallow work. Take time to research, think, and propose informed solutions.
- Platform should feel like a thoughtful partner, not a rushed bot chasing metrics.

## Recent Accomplishments

### ✅ Session: NAP Collection + Research Phase Architecture

**Problem Identified:**
- System was rushing to generate JDs immediately after NAP collection
- No research phase = shallow, generic JDs
- User expected: PAG research (AUM, strategy, geography) → Informed JD → Dual-track sourcing

**New Workflow (In Development):**

**Phase 1: NAP Collection** (Existing)
- Questions: Location, Team Scope, Background/Industry, Compliance Requirements, Compensation
- Duration: 5-10 min conversation
- Output: Job context object

**Phase 2: Research Phase** (NEW - No user interaction needed)
- Web search PAG: AUM, investment strategy, geography, recent hires
- Search competitor CFO patterns: What profiles do similar firms hire?
- Identify target companies: PE firms, multi-strategy shops producing caliber candidates
- Build market intelligence: Comp ranges, skill requirements, talent density
- Duration: 2-3 minutes of background research
- Alert: "Research complete. Preparing JD for review..."

**Phase 3: Informed JD Generation** (NEW)
- Use Grok to generate professional JD grounded in research findings
- Include: Target company sourcing strategy, market comp context, candidate profile
- Output: Polished JD ready for user review
- Alert: "Your professional JD is ready. Review and approve below."

**Phase 4: Approval + Dual-Track Setup** (NEW)
- User reviews JD and confirms
- System offers: "Can I help you post this to active channels while I search passive candidates?"
- If approved: POST to job boards (LinkedIn, internal portals) + SEARCH target companies in parallel
- Rationale: 15% of talent is actively job hunting, 85% passive. Serve both simultaneously.

**Phase 5: Sourcing Execution** (Existing)
- Parallel execution: Active posting + Passive sourcing from target companies
- Alerts: "Posted to 5 channels ✓", "Searching 40 target companies ✓", "Candidates arriving..."

### Why Manus.ai Did This Well
- They understood: Information gathering → Thinking time → Informed proposal
- Not instant gratification, but thoughtful partnership
- User got value from research insights, not just speed

## System Architecture

### UI/UX Design
Enterprise-first, professional interface utilizing deep navy primary color with green accents. Multi-portal architecture serves: Researcher, Company, Agency, Admin, and Candidate roles.

### Technical Stack
- **Frontend**: React 18, TypeScript, Radix UI, shadcn/ui, Tailwind CSS, TanStack Query, Wouter routing
- **Backend**: Node.js, Express.js, TypeScript
- **Database**: PostgreSQL (Neon serverless) with Drizzle ORM and Zod schemas
- **AI**: xAI Grok for NAP interviews, research analysis, JD generation, role-fit scoring
- **Web Search**: SerpAPI for company research, competitor analysis
- **Learning**: Active collection engines that populate 5 learning features automatically
- **Candidate Quality**: Grok-powered role-fit evaluation + 60-point quality threshold

### New API Endpoints (To Implement)

**Research Phase:**
- `POST /api/research/company` - Research client company context (AUM, strategy, geography)
- `POST /api/research/competitor-patterns` - Research similar firms' hiring patterns
- `POST /api/research/target-companies` - Identify companies producing ideal candidate profiles

**JD Generation:**
- `POST /api/jd/generate` - Generate professional JD from research + NAP context
- `POST /api/jd/approve` - User approves JD, triggers dual-track sourcing

**Dual-Track Sourcing:**
- `POST /api/sourcing/active-posting` - Post JD to active channels (job boards, internal)
- `POST /api/sourcing/passive-search` - Search passive candidates from target companies

### New Workflow: From NAP to Dual-Track Sourcing

```
NAP Collection (5-10 min)
    ↓
Research Phase (2-3 min, background)
    ├─ Search company context (PAG AUM, strategy, geography)
    ├─ Research competitor CFO hiring patterns
    ├─ Identify target companies (PE firms, multi-strategy shops)
    └─ Build market intelligence (comp, skills, talent density)
    ↓ [Alert: "Research complete. Preparing JD..."]
    ↓
Informed JD Generation
    ├─ Grounded in research findings
    ├─ Include target sourcing strategy
    └─ Professional, recruiter-ready format
    ↓ [Alert: "JD ready for review"]
    ↓
User Reviews & Approves JD
    ├─ Offers: "Help you post to active channels?"
    ├─ User confirms
    ↓ [Alert: "Setting up dual-track..."]
    ↓
Dual-Track Sourcing Launches (Parallel)
    ├─ ACTIVE: Post to job boards, LinkedIn, internal channels
    │  └─ Captures 15% of population actively job hunting
    └─ PASSIVE: Search target companies for ideal candidates
       └─ Captures 85% of passive talent
    ↓
Results Flow In
    ├─ Active responders arrive first (days)
    └─ Passive candidates sourced (week)
```

### 5-Feature Learning System (Existing)

**FEATURE 1: Compensation Intelligence**
- Tracks salary bands by role and company
- Learns market rates from placements
- Database: `companyLearning.salaryBands`, `industryLearning.salaryBenchmarks`

**FEATURE 2: Career Path Tracking**
- Learns typical career progressions (Analyst → Associate → VP → MD)
- Learns where people move next and come from

**FEATURE 3: Talent Quality Metrics**
- Tracks success rates, tenure from placements
- Department-specific talent strength (Finance 95%, Operations 72%)

**FEATURE 4: Geographic/Seasonal Patterns**
- Learns where best talent comes from
- Maps hiring seasonality

**FEATURE 5: Success Factor Learning**
- Learns what predicts successful hires
- Tracks regulatory requirements per industry

## Candidate Matching Flow (Existing)
1. Job context provided (title, responsibilities, industry, yearsExperience)
2. `scoreRoleFit()` evaluates each candidate against specific role
3. Candidates scoring 60+ are returned (quality threshold)
4. Results sorted by fit score (best matches first)

## What's Next (Priority Order)

1. **IMPLEMENT Research Phase** - Web search PAG context, competitor analysis, target company identification
2. **IMPLEMENT Informed JD Generation** - Use research findings to generate professional JD
3. **IMPLEMENT Dual-Track Sourcing** - Offer active posting + passive candidate sourcing
4. **Test PAG Workflow** - Verify entire flow from NAP → Research → JD → Dual-track
5. **Optimize Alert System** - Clear notifications for each phase completion
6. **Monitor:** Track time spent in research phase vs quality of candidates sourced

## External Dependencies
- **AI**: xAI Grok (NAP, research analysis, JD generation, role-fit scoring)
- **Web Search**: SerpAPI (company research, competitor analysis, target company identification)
- **Candidate Search & Scraping**: Bright Data (profile scraping, target company research)
- **Job Posting**: LinkedIn, job boards integration (TBD)
- **Communication**: SendGrid (email), Twilio (SMS)
- **Database**: Neon (serverless PostgreSQL)

## Implementation Notes

### Why Research Phase Matters
- Bad: "I'll search for CFOs now" (generic, wastes API credits)
- Good: "PAG has $70B AUM, multi-strategy focus, Asia-HQ. They typically hire CFOs from Apollo, KKR, Citadel. Let me search those 3 firms + similar multi-strategy shops + top PE firms in Asia."
- Result: Targeted sourcing, higher-quality candidates, lower API spend

### Why Dual-Track Matters
- Passive-only: Slow (weeks to source), misses fast movers
- Active-only: Fast (days to hire), but self-selected lower-tier candidates
- Dual-track: Both streams simultaneously = best of both worlds

### Compensation Question Addition
- Current 4 questions: Location, Team Scope, Background, Compliance
- MISSING: Compensation range (needed for candidate filtering)
- Future: Add "Ballpark total comp range?" to NAP questions

