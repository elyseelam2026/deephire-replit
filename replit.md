# DeepHire - AI-Powered Talent Acquisition Platform

## Overview
DeepHire is an AI-powered enterprise B2B recruiting platform with intelligent candidate sourcing and matching. The platform uses xAI Grok for dynamic NAP interviews, multi-layered boolean search strategies, and a **5-feature learning system** that gets smarter with every search and placement.

## User Preferences
Preferred communication style: Simple, everyday language. Focus on continuous AI accuracy improvements over infrastructure work.

## Recent Accomplishments (Session: 5-Feature Learning System Architecture)

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
- **AI**: xAI Grok for NAP interviews & scoring, Voyage AI for semantic search
- **Learning**: Active collection engines that populate 5 learning features automatically

### API Endpoints - Learning Intelligence
- `GET /api/learning/intelligence` - Returns all 5 learning features with current data

### Workflow Integration Points
Learning is triggered at:
1. After sourcing run completes (Elite 4-Phase sourcing)
2. When candidates are hired (salary + placement data)
3. When job searches execute (geographic patterns)
4. When hiring decisions are made (success factors)
5. Daily aggregation syncs (industry averages)

## What's Next
The 5-feature learning system is production-ready. Next priorities:
1. Wire remaining hook calls into sourcing orchestrator (final integration)
2. Test end-to-end: sourcing → learning collection → dashboard updates
3. Implement periodic daily sync for industry aggregation
4. Build admin panel to view learning activity logs
5. Scale learning to handle high-volume sourcing operations

## External Dependencies
- **AI**: xAI Grok (NAP, scoring, learning triggers), Voyage AI (semantic search)
- **Search & Scraping**: SerpAPI (LinkedIn), Bright Data (profile scraping)
- **Communication**: SendGrid (email), Twilio (SMS)
- **Database**: Neon (serverless PostgreSQL)
