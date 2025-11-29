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

### ✅ Session: NAP → Query → SerpAPI Pipeline Fixes (Nov 2025)

**Problems Identified:**
1. SerpAPI was failing due to Boolean operators in queries - Google doesn't accept `AND/OR/NOT` or parentheses
2. DeepSeek integration via OpenRouter was failing because `response_format` parameter is OpenAI-specific
3. Query generator was hardcoded to xAI client, not respecting user's preferred DeepSeek > Grok preference

**Fixes Implemented:**
1. ✅ `serpapi.ts`: Enhanced query cleaning to remove Boolean operators, parentheses, quotes before sending to Google
2. ✅ `nap-query-generator.ts`: Refactored to use unified `callLLM` router with proper fallback mechanism
3. ✅ `llm-router.ts`: Fixed to recognize `OPENROUTER_API_KEY` (not just integration-managed key)
4. ✅ Provider fallback: DeepSeek tries first (without response_format), falls back to Grok on error

**Query Format Rules:**
- Simple keywords only: `CFO private equity Hong Kong Mandarin`
- NO Boolean operators: `AND`, `OR`, `NOT`
- NO parentheses: `(term1 OR term2)`
- NO quotes (they get stripped): `"exact phrase"` → `exact phrase`

### ✅ Session: AI Conversation Quality & Industry Expertise

**Problems Discovered (KKR CFO Conversation):**
1. **AI wasn't tracking previously answered questions** - Asked "Are they building/managing Asia finance, or part of global?" after user already said "HK-based". This breaks continuity.
2. **Industry expertise gaps kill credibility** - User said "It seems you have little knowledge in PE world" when AI asked if role could be global. Real recruiters know: KKR is US-based → HK role = automatically Asia-focused, never global.
3. **Question inventory feels like admin work** - Listing "remaining questions" (Base Location, Team Scope, etc.) doesn't feel like recruiting, feels like a form.
4. **Context infers answers** - If user says "HK-based CFO at KKR (US firm)" → AI should know this is Asia-scoped, not ask follow-ups that assume global possibility.

**Fixes Implemented:**
1. ✅ Made questions open-ended instead of binary ("Where should they be based?" not "Singapore or another hub?")
2. ✅ Added industry expertise signals to system prompt (explicitly reject generic questions)
3. ✅ Timeline urgency now triggers accelerated mode (user accepted 20-min option vs. 12-hour)

**Still Need:**
- Track Q&A history to prevent re-asking answered questions
- Infer context from role + company combo (e.g., US PE firm in HK = Asia-only focus)
- Stop listing "remaining questions" - just ask the next smart one in context

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

## Building 360° Executive Search Consultant (Sequenced Rollout)

### Phase 1: SOURCING EXCELLENCE (Current Focus)
**Goal**: Nail NAP → Sourcing Strategy → Candidate Finding

1. **Responsive NAP Collection** - Understand hiring pain, not ask templates ✅ (in progress)
2. **Sourcing Strategy Generation** - When NAP complete, generate smart search strategy (WHO to target, WHERE to find them, HOW to reach them)
3. **Candidate Sourcing Execution** - Parallelize active (job boards) + passive (target company research) 
4. **Quality Filtering** - Return 10-15 best-fit candidates (not 100 mediocre ones)
5. **Longlist Generation** - Professional candidate summaries with fit rationale

### Phase 2: INTERVIEW EXCELLENCE (Atlas-Like Features)
**Goal**: Capture and memorize every conversation

1. Interview capture + auto-transcription (recording permission-based)
2. Searchable candidate memory ("Show me all CFOs from Apollo we've talked to")
3. AI-powered interview notes + takeaways
4. Auto-generate placement reports from interview transcripts
5. Interview search: "What did they say about team scaling?"

### Phase 3: LEARNING & INTELLIGENCE
**Goal**: System improves over time from placement data

1. Placement dashboards (success rate by role, avg comp, time-to-fill)
2. Role pattern learning (what predicts successful hires in each role)
3. Geographic/industry talent density insights
4. Algorithmic improvement tracking

### Phase 4: ORCHESTRATION & OUTREACH
**Goal**: Seamless candidate engagement

1. Multi-channel outreach (email + LinkedIn + SMS coordinated)
2. Warm-touch campaigns (personalized, not template)
3. Client presentation automation
4. Offer management & transition support tracking

## Full Executive Search Workflow (Target State)

```
BD & CLIENT ACQUISITION
↓
GET MANDATE (NAP collection via consultative dialogue)
↓
SOURCING STRATEGY RESEARCH
├─ Company context: Understand client industry/business
├─ Competitive analysis: What profiles do peer firms hire?
├─ Target list: Which companies produce ideal candidates?
└─ Strategy: Boolean strings, LinkedIn filters, outreach angles
↓
CANDIDATE SOURCING (Parallel Execution)
├─ ACTIVE: Post to job boards, LinkedIn, internal networks
└─ PASSIVE: Search target companies for profiles matching strategy
↓
LONGLIST (10-15 candidates)
├─ Candidate research & enrichment
├─ Professional candidate summaries
└─ Fit scoring against role requirements
↓
CLIENT INTERVIEWS (Shortlist)
├─ Schedule interviews with client
├─ Record + transcribe interviews
├─ Generate interview notes + insights
└─ Track candidate feedback
↓
OFFERS & PLACEMENT
├─ Facilitate offers & negotiation
├─ Track acceptance/decline reasons
├─ Onboarding & transition support
↓
LEARNING & FEEDBACK
├─ Placement success metrics
├─ Learn what patterns predicted success
└─ Improve algorithm for next search
```

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

