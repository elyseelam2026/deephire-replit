# DeepHire - AI-Powered Talent Acquisition Platform

## Overview
DeepHire is an AI-powered enterprise B2B recruiting platform with intelligent candidate sourcing and matching. The platform uses xAI Grok for dynamic NAP interviews, multi-layered boolean search strategies, **Grok-powered role-fit matching** to understand job requirements, and a **5-feature learning system** that gets smarter with every search and placement.

## User Preferences
Preferred communication style: Simple, everyday language. Focus on continuous AI accuracy improvements over infrastructure work.

## Recent Accomplishments (Session: Grok-Powered Role-Fit Matching + Quality Threshold)

### ✅ COMPLETE: Intelligent Role-Fit Candidate Matching

**CRITICAL IMPROVEMENT: Replaced keyword-matching with Grok-powered role understanding**

**Problem Solved:**
- Old system: Simple keyword overlap (if 60% of keywords matched → score 60)
- Old result: High-quality candidates but unsuitable for role (e.g., junior staff for "Head of" positions)
- Issue: Wasted API credits on misfits

**New Solution: Grok-Powered Role-Fit Scoring**

**`scoreRoleFit()` Function** (`server/ai.ts`):
- Evaluates if candidate truly fits specific role (not just keyword overlap)
- Understands seniority levels: "Head of" requires executive-level candidates
- Scores on: Seniority Match (30%), Skill Alignment (35%), Experience Relevance (20%), Career Trajectory (15%)
- Critical Rules:
  - Junior candidate for executive role → max 40 points even if skilled
  - Great skills but wrong seniority → max 55 points
  - Only scores 70+ if genuinely suitable, 85+ if excellent fit
- Uses Grok prompt: "Be critical and accurate - scores should reflect true suitability, not keyword overlap"

**Updated `generateCandidateLonglist()` Function** (`server/ai.ts`):
- Now accepts job context parameter (title, responsibilities, industry, etc.)
- Scores each candidate individually with `scoreRoleFit()`
- Maintains 60-point quality threshold to prevent API credit waste
- Falls back to keyword matching if no job context provided
- Logs screening results: "X candidates evaluated, Y met threshold (60+)"

**Integration Points** (Updated in `server/routes.ts`):
1. `/api/upload-jd` - Job description upload now passes full job context
2. `/api/jobs` - Job creation now uses role-fit matching
3. Reference candidate matching - Auto-execution now uses Grok evaluation

**Example Behavior:**
- "Head of Technical Implementation & Delivery" search:
  - BEFORE: Charlie S. (40 score) - skills matched but no executive experience
  - AFTER: Only returns candidates with Head/Director/VP titles and delivery management background

### ✅ COMPLETE: Quality Threshold Filter (Cost Control)

**MINIMUM_QUALITY_THRESHOLD = 60** (`server/candidate-ranking.ts`):
- Constant exported for system-wide use
- All candidate rankings check: `score >= MINIMUM_QUALITY_THRESHOLD`
- Prevents low-quality candidates from wasting Grok and Bright Data credits
- System logs how many candidates pass/fail threshold

### ✅ COMPLETE: 5-Feature Learning Intelligence System

**FEATURE 1: Compensation Intelligence**
- Tracks salary bands by role and company
- Calculates average salary lift when moving between roles
- Learns market rates from placements
- Database: `companyLearning.salaryBands`, `industryLearning.salaryBenchmarks`
- Engine: `updateCompensationIntelligence()` in `learning-collection.ts`

**FEATURE 2: Career Path Tracking**
- Learns typical career progressions (Analyst → Associate → VP → MD)
- Tracks average years per role
- Calculates promotion rates
- Learns where people move next and come from
- Database: `candidateLearning.careerProgression`, `industryLearning.careerPaths`
- Engine: `updateCareerPathsFromCandidate()` in `learning-collection.ts`

**FEATURE 3: Talent Quality Metrics**
- Tracks success rates, tenure, promotion rates from actual placements
- Calculates fit scores per company
- Department-specific talent strength (Finance 95%, Operations 72%)
- Database: `companyLearning.talentQualityScore`, `avgTenureMonths`, `promotionRate`
- Engine: `updateTalentQualityMetrics()` in `learning-collection.ts`

**FEATURE 4: Geographic/Seasonal Patterns**
- Learns where best talent comes from (NYC 35%, SF 25%, London 18%)
- Maps hiring seasonality (Q1 15%, Q2 28%, Q3 25%, Q4 32%)
- Tracks talent supply (competitive, tight, abundant)
- Database: `industryLearning.geographicHubs`, `hiringPatterns`, `talentSupply`
- Engine: `updateGeographicPatterns()` in `learning-collection.ts`

**FEATURE 5: Success Factor Learning**
- Learns what predicts successful hires (Prior company tier: 92% importance)
- Tracks regulatory burden (high/medium/low) and compliance requirements
- Calculates tech skill requirements per industry
- Maps common tools used in each industry
- Database: `industryLearning.successFactors`, `regulatoryBurden`, `techSkillRequirement`
- Engine: `updateSuccessFactors()` in `learning-collection.ts`

### Learning System Architecture

**Collection Engines** (`server/learning-collection.ts`):
- `updateCompensationIntelligence()` - Salary band updates
- `updateCareerPathsFromCandidate()` - Career trajectory learning
- `updateTalentQualityMetrics()` - Placement quality tracking
- `updateGeographicPatterns()` - Location/season learning
- `updateSuccessFactors()` - Predictive factor tracking
- `collectLearningFromSourcedCandidates()` - Batch collection after sourcing
- `syncIndustryAverages()` - Daily aggregation

**Integration Hooks** (`server/learning-hooks.ts`):
- `onSourceRunComplete()` - Triggered after sourcing finishes
- `onCandidateHired()` - Tracks successful placements
- `onJobSearchExecuted()` - Captures search patterns
- `onHiringDecision()` - Records success factors
- `periodicIndustrySync()` - Daily aggregation

**Trigger Wrapper** (`server/learning-trigger.ts`):
- Single integration point for easy wiring
- `triggerLearningOnSourcingComplete()` - Non-blocking learning collection

**API Endpoint** (`server/learning-api.ts`):
- `/api/learning/intelligence` - Returns all 5 learning features with current data

**Dashboard** (`client/src/pages/LearningIntelligence.tsx`):
- Located at `/researchers/learning-intelligence`
- Displays 6 cards: Position Keywords, Talent Sources, Industry Patterns, Candidate Patterns, JD Patterns, Top Candidates
- Real-time updates every 30 seconds
- Shows 5-feature learning status indicators

### Database Schema Extensions

**companyLearning table additions:**
- `salaryBands` (JSONB) - {CFO: {min, max, median}, "VP Finance": {...}}
- `avgSalaryLift` (real) - % salary increase when moving to new role
- `talentQualityScore` (real) - 0-100 talent quality from this company
- `avgCandidateFitScore` (real) - 0-100 average fit from placements
- `avgTenureMonths` (integer) - Average months candidates stay
- `successRate` (real) - % of placements successful
- `avgTimeToHireDay` (integer) - Days from sourcing to hire
- `departmentStrength` (JSONB) - {Finance: 0.95, Operations: 0.72}
- `promotionRate` (real) - % promoted before leaving

**industryLearning table additions:**
- `salaryBenchmarks` (JSONB) - {CFO: {p25, p50, p75}, "VP Sales": {...}}
- `careerPaths` (JSONB) - [{path: [Analyst, Associate, VP], frequency: 0.42}]
- `avgTimeToPromotion` (integer) - Average months to promotion
- `geographicHubs` (JSONB) - {NYC: 0.35, SF: 0.25, London: 0.18}
- `hiringPatterns` (JSONB) - {Q1: 0.15, Q2: 0.28, Q3: 0.25, Q4: 0.32}
- `talentSupply` (text) - competitive, tight, abundant
- `successFactors` (JSONB) - [{factor: "Prior company tier", importance: 0.92}]
- `regulatoryBurden` (text) - high, medium, low
- `techSkillRequirement` (real) - % requiring tech skills

**candidateLearning table additions:**
- `careerProgression` (text array) - [Analyst, Associate, VP, MD]
- `avgYearsPerRole` (real) - Average tenure per role
- `promotionRate` (real) - % promoted

## System Architecture

### UI/UX Design
Enterprise-first, professional interface utilizing deep navy primary color with green accents. Multi-portal architecture serves: Researcher, Company, Agency, Admin, and Candidate roles.

### Technical Stack
- **Frontend**: React 18, TypeScript, Radix UI, shadcn/ui, Tailwind CSS, TanStack Query, Wouter routing
- **Backend**: Node.js, Express.js, TypeScript
- **Database**: PostgreSQL (Neon serverless) with Drizzle ORM and Zod schemas
- **AI**: xAI Grok for NAP interviews, role-fit scoring, and intelligent matching; Voyage AI for semantic search
- **Learning**: Active collection engines that populate 5 learning features automatically
- **Candidate Quality**: Grok-powered role-fit evaluation + 60-point quality threshold

### API Endpoints - Candidate Matching
- `POST /api/upload-jd` - Uses Grok role-fit scoring with job context
- `POST /api/jobs` - Intelligent candidate matching with seniority evaluation
- `GET /api/learning/intelligence` - Returns all 5 learning features with current data

### Candidate Matching Flow
1. Job context provided (title, responsibilities, industry, yearsExperience)
2. `scoreRoleFit()` evaluates each candidate against specific role (not just keywords)
3. Candidates scoring 60+ are returned (quality threshold)
4. Results sorted by fit score (best matches first)
5. Grok understands seniority levels and career trajectory fit

### Workflow Integration Points
Learning is triggered at:
1. After sourcing run completes (Elite 4-Phase sourcing)
2. When candidates are hired (salary + placement data)
3. When job searches execute (geographic patterns)
4. When hiring decisions are made (success factors)
5. Daily aggregation syncs (industry averages)

## What's Next
1. Test: Verify "Head of Technical" role returns only executive-level candidates
2. Monitor: Track API cost reduction from quality threshold filter
3. Scale: Handle high-volume sourcing with Grok evaluations
4. Learn: Build admin panel to view role-fit scoring logic for transparency
5. Optimize: Cache frequently-scored candidates to reduce Grok calls

## External Dependencies
- **AI**: xAI Grok (NAP, role-fit scoring, intelligent matching), Voyage AI (semantic search)
- **Search & Scraping**: SerpAPI (LinkedIn), Bright Data (profile scraping)
- **Communication**: SendGrid (email), Twilio (SMS)
- **Database**: Neon (serverless PostgreSQL)

## Implementation Notes

### Why Grok-Powered Matching Matters
- Old system scored "Head of Technical" candidate with 40/100 even if they had matching technical skills but no leadership experience
- New system automatically rejects them before they waste API credits
- Grok understands role context: executive roles need executive candidates, not junior staff with matching keywords
- Result: Only genuinely suitable candidates are returned

### Quality Threshold Economics
- MINIMUM_QUALITY_THRESHOLD = 60 points
- Prevents candidates with 20-40 scores from wasting xAI Grok credits ($0.005-0.02 per call)
- Prevents profile scraping costs from Bright Data ($0.02-0.05 per profile)
- Reduces false positives: fewer unsuitable candidates = faster hiring cycles
- System logs all filtering: transparency on what's being rejected and why
