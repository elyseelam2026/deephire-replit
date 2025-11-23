# DeepHire Production-Ready Roadmap

**Last Updated:** November 23, 2025  
**Current State:** UI-complete skeleton with 60% backend implemented  
**Target:** Enterprise-grade, revenue-generating platform

---

## Executive Summary

| Aspect | Status | Effort |
|--------|--------|--------|
| **Frontend (50 pages)** | ✅ 95% complete | Done |
| **Database schema** | ✅ 99% complete | Done |
| **Core business logic** | ⚠️ 40% complete | **8-12 weeks** |
| **External integrations** | ⚠️ 50% complete | **4-8 weeks** |
| **Production infrastructure** | ⚠️ 60% complete | **2-3 weeks** |

---

## Phase 1: CORE REVENUE FEATURES (Weeks 1-4)
**Focus:** Wire up the 3 highest-revenue features with real logic

### Feature 1.1: Salary Benchmarking & Offer Optimizer [$199+/search]
**Current State:** UI exists, mock data returned  
**Needed:** Real salary data + AI logic

**Implementation Steps:**
```
1. Choose salary data source (pick ONE):
   ☐ Option A: Payscale API (free tier available, $99/month for enterprise)
   ☐ Option B: Salary.com API ($50/month)
   ☐ Option C: BLS (Bureau of Labor Statistics) - free, public data
   ☐ Option D: Internal dataset - upload CSV of benchmarks
   
2. Backend: `/api/salary-benchmark`
   - Input: job_title, location, experience_level, company_size
   - Output: median_salary, range (25th-75th percentile), market_trend
   - Data source: Query selected API or database

3. Backend: `/api/offer-optimization`
   - Input: candidate_profile, job_spec, company_budget
   - Call xAI Grok with:
     * Salary market data
     * Candidate background
     * Company ability to pay
   - Output: recommended_offer, acceptance_probability (0-100), negotiation_talking_points

4. Frontend: Already exists at `/salary-benchmark`
   - Just needs to call real API endpoints
   - Display real data + xAI reasoning

Estimated Time: 3-4 days
External API Cost: $50-100/month
```

### Feature 1.2: War Room Voting [$499+/hire]
**Current State:** UI exists, voting logic incomplete  
**Needed:** Real vote aggregation + AI consensus summary

**Implementation Steps:**
```
1. Backend: `/api/war-rooms` (already structured)
   - Create hiring committee session
   - Add committee members
   - Invite candidates for review

2. Backend: `/api/war-rooms/:id/vote`
   - Accept votes: strong_yes, yes, maybe, no, strong_no
   - Store with timestamp, user_id, comment
   - Enforce one vote per member per candidate

3. Backend: `/api/war-rooms/:id/summary`
   - Calculate consensus:
     * Vote counts by type
     * Average "yesness" score (scale 0-100)
     * Confidence level (unanimity)
   - Call xAI Grok to generate AI summary:
     * Why committee disagrees (if split votes)
     * Red flags or major strengths to consider
   - Return: consensus_score, ai_summary, recommendation

4. Frontend: WarRoom.tsx (already exists)
   - Display candidates for voting
   - Submit vote with optional comment
   - Show real-time vote counts
   - Display xAI consensus summary

Estimated Time: 2-3 days
External API Cost: xAI (already configured)
```

### Feature 1.3: Predictive Success Scoring [$149+/assessment]
**Current State:** UI exists, mock 75% score returned  
**Needed:** Real ML scoring OR statistical model

**Implementation Steps:**
```
1. Choose approach:
   ☐ Option A: Statistical model (fast, works now)
   ☐ Option B: Train ML model (requires historical data)

2. Option A (Recommended for launch): Statistical Scoring
   - Factors (weighted):
     * Experience match: 30% (job_years ÷ required_years)
     * Skills overlap: 25% (matched_skills ÷ required_skills)
     * Culture fit: 20% (industry_tenure, company_stage_experience)
     * Stability: 15% (avg_tenure_per_role, gap_analysis)
     * Salary expectations: 10% (expectation vs budget fit)
   
   - Formula:
     success_score = sum(factor × weight) × 100
     retention_risk = 100 - success_score
     
3. Backend: `/api/predictive-score`
   - Input: candidate_id, job_id
   - Extract candidate skills/experience from database
   - Extract job requirements from job record
   - Calculate score using formula
   - Call xAI Grok to explain factors
   - Output: success_score, retention_risk, culture_fit_score, explanation

4. Frontend: PredictiveScore.tsx (already exists)
   - Replace mock data with real API call
   - Display breakdown of scoring factors
   - Show xAI explanation

Estimated Time: 2-3 days
External API Cost: xAI (already configured)

Future: Train ML model on historical placements for better accuracy
```

---

## Phase 2: ATS INTEGRATIONS (Weeks 5-6)
**Focus:** Connect to Greenhouse, Workday, Lever, Bullhorn

### Feature 2.1: Greenhouse Integration
**Current State:** OAuth stub only  
**Needed:** Full sync bidirectional

**Implementation Steps:**
```
1. Setup OAuth:
   - Register Greenhouse app at their developer portal
   - Get client_id, client_secret
   - Store in environment variables (secrets)

2. Backend: `/api/auth/greenhouse`
   - Implement OAuth flow
   - Exchange auth code for access token
   - Store token in atsConnections table with expiry

3. Backend: `/api/ats-sync/greenhouse`
   - Sync jobs from Greenhouse → DeepHire
     * GET /v2/jobs endpoint
     * Map fields to DeepHire schema
     * Store in jobs table
   - Sync candidates → Greenhouse
     * POST /v2/applications when candidate added to pipeline
   - Bidirectional updates every 1 hour (background job)

4. Frontend: ATSIntegrations.tsx (already exists)
   - Add "Connect Greenhouse" OAuth button
   - Show sync status
   - Display last sync time

Estimated Time: 4-5 days per ATS
External API Cost: Free (Greenhouse provides API access)
```

---

## Phase 3: BETA FEATURES (Weeks 7-10)
**Focus:** Complete the 3 beta features

### Feature 3.1: Video Interview Screening [$99+/candidate]
**Current State:** Empty stub  
**Needed:** Video capture + AI scoring

**Implementation Steps:**
```
1. Choose video hosting:
   ☐ Option A: AWS S3 + CloudFront (cost: $0.025/GB)
   ☐ Option B: Bunny.net (cost: $0.01/GB, faster)
   ☐ Option C: Cloudinary (cost: pay-per-transform)

2. Frontend: Video capture component
   - Use MediaRecorder API (free, browser-native)
   - Record one-way response to interview prompt
   - Upload to S3 or Bunny

3. Backend: `/api/video-interviews`
   - Create interview record
   - Store video URL
   - Call video transcription service:
     * Option A: OpenAI Whisper API ($0.006/min)
     * Option B: Google Speech-to-Text ($0.024/min)
   - Get transcript

4. Backend: AI Scoring
   - Call xAI Grok with transcript to score:
     * Communication clarity (0-100)
     * Enthusiasm/engagement (0-100)
     * Relevant knowledge (0-100)
   - Store scores in videoInterviews table

5. Frontend: Interview review dashboard
   - Play video
   - Show transcript
   - Display xAI scores and feedback

Estimated Time: 5-6 days
External API Cost: $5-20/month (video hosting + transcription)
```

### Feature 3.2: Diversity Analytics [$79+/job]
**Current State:** Empty stub  
**Needed:** DEI metrics tracking

**Implementation Steps:**
```
1. Backend: Data collection
   - Track candidate demographics for each job pipeline:
     * Gender (optional self-report)
     * Ethnicity (optional self-report)
     * Years of experience (required)
     * Education (required)
     * Location (required)

2. Backend: `/api/diversity-metrics/:jobId`
   - Calculate for each job:
     * Pipeline representation by demographic
     * Acceptance rates by demographic (offer → placement)
     * Rejection rates by demographic
     * Average time-to-hire by demographic
   - Flag bias (e.g., 80% male candidates, 20% female candidates)
   - Compare to industry benchmarks (if available)

3. Frontend: Diversity Analytics dashboard
   - Show pipeline composition charts
   - Display bias alerts
   - Generate compliance report (PDF export)

Estimated Time: 3-4 days
External API Cost: None
Compliance Note: Ensure GDPR/CCPA compliant data collection
```

### Feature 3.3: Competitor Intelligence [$129+/analysis]
**Current State:** Empty stub  
**Needed:** Interview tracking + talent flow

**Implementation Steps:**
```
1. Data model:
   - competitorInterviews table: track which competitors are interviewing your candidates
   - talentFlowAnalytics table: aggregate talent movement patterns

2. Frontend: Add "Mark as Interviewing" button
   - When candidate is in interviews, user can mark: "Company X is also interviewing"
   - Stores: candidate_id, competitor_company_id, stage

3. Backend: `/api/competitor-alerts/:candidateId`
   - Show all competitors interviewing this candidate
   - Calculate: win rate vs each competitor for this candidate's profile

4. Backend: Talent flow analytics (weekly aggregation)
   - Calculate: which companies are talent flowing to/from?
   - Identify patterns: "30% of our placed candidates go to Google after 2 years"
   - Show: competitive threats, talent pools, retention risks

5. Frontend: Intelligence dashboard
   - Show competitor tracking
   - Display talent flow patterns
   - Export competitive analysis report

Estimated Time: 4-5 days
External API Cost: None
```

---

## Phase 4: POLISH & INTEGRATIONS (Weeks 11-12)

### Feature 4.1: Slack Integration
**Current State:** UI for settings only  
**Needed:** Real notifications

**Implementation Steps:**
```
1. Setup Slack app:
   - Create app at api.slack.com
   - Get Bot Token
   - Install to workspace

2. Backend: Store webhook URLs
   - User configures Slack channels:
     * #new-matches (when candidate matches job)
     * #applications (when candidate applies)
     * #offers (when offer extended)
     * #placements (when hired)

3. Backend: Send notifications
   - After job matching: send message to #new-matches
   - On offer status change: send message to #offers
   - On placement: send message to #placements

4. Frontend: Settings page (already exists)
   - Add Slack channel selector dropdowns
   - Test notification button
   - Show connection status

Estimated Time: 2-3 days
External API Cost: Free (Slack)
```

### Feature 4.2: Passive Talent CRM
**Current State:** Mock data only  
**Needed:** Real re-engagement workflows

**Implementation Steps:**
```
1. Backend: `/api/passive-talent`
   - Save "not ready now" candidates with re-engagement schedule
   - Store: candidate_id, follow_up_date, email_template, status

2. Backend: Background job (runs daily)
   - Find candidates with follow_up_date = today
   - Send re-engagement email via SendGrid
   - Update follow_up_date to +30 days

3. Email templates:
   - "New opportunities at your skills" (when relevant job posted)
   - "Check-in: How's your career?" (generic monthly)
   - "Your profile matches hot role" (when strong match)

4. Frontend: Passive talent list
   - Already exists at `/passive-talent`
   - Update to show re-engagement schedule
   - Manual email trigger button

Estimated Time: 2-3 days
External API Cost: SendGrid (already configured)
```

### Feature 4.3: White-Label Platform
**Current State:** Partner management UI only  
**Needed:** Multi-tenant provisioning

**Implementation Steps:**
```
1. Define white-label features:
   - Custom domain (e.g., acme-recruiting.deephire.com)
   - Custom branding (logo, colors)
   - Revenue share tracking
   - Separate candidate/job database per partner

2. Backend: Multi-tenancy layer
   - Add tenant_id to all tables
   - Filter queries by tenant_id
   - Enforce tenant isolation

3. Backend: `/api/whitelabel/onboard`
   - Create new tenant
   - Generate subdomain
   - Set branding
   - Send login credentials

4. Frontend: Partner dashboard
   - Show usage metrics (candidates, jobs, placements)
   - Display revenue calculations
   - Manage custom domain

Estimated Time: 4-5 days
External API Cost: None (uses existing infrastructure)
Complexity: HIGH - requires careful tenant isolation
```

---

## Phase 5: INFRASTRUCTURE & LAUNCH (Week 13)

### Production Checklist
```
Database:
  ☐ Backup strategy implemented
  ☐ Query performance optimized (add indexes)
  ☐ Connection pooling configured
  ☐ Database encryption enabled

Backend:
  ☐ All API endpoints have error handling
  ☐ Rate limiting implemented
  ☐ Request validation on all endpoints
  ☐ Logging/monitoring setup (Sentry or similar)
  ☐ API documentation generated (Swagger)

Frontend:
  ☐ Performance audit (Lighthouse >90)
  ☐ Accessibility audit (WCAG 2.1 AA)
  ☐ Mobile responsive testing
  ☐ Dark mode tested
  ☐ Error boundary implemented

Security:
  ☐ HTTPS enabled
  ☐ CORS properly configured
  ☐ Input validation everywhere
  ☐ SQL injection protection (Drizzle ORM handles this)
  ☐ XSS protection
  ☐ CSRF tokens on forms

Monitoring:
  ☐ Uptime monitoring (Pingdom, UptimeRobot)
  ☐ Error tracking (Sentry, LogRocket)
  ☐ Performance monitoring (Datadog, New Relic)
  ☐ Usage analytics (Mixpanel, Amplitude)

Testing:
  ☐ Unit tests for critical functions
  ☐ Integration tests for API endpoints
  ☐ E2E tests for main user flows

Deployment:
  ☐ CI/CD pipeline (GitHub Actions)
  ☐ Staging environment parity with production
  ☐ Zero-downtime deployment strategy
  ☐ Rollback procedures documented
```

---

## Priority Matrix

### By Revenue Impact (Highest First)
1. **War Room Voting** - $499/hire, 2-3 days, HIGHEST priority
2. **Salary Benchmarking** - $199/search, 3-4 days
3. **Predictive Scoring** - $149/assessment, 2-3 days
4. **ATS Integrations** - Included but drives lock-in, 4-5 days per ATS
5. **Competitor Intelligence** - $129/analysis, 4-5 days
6. **Diversity Analytics** - $79/job, 3-4 days
7. **Video Interviews** - $99/candidate, 5-6 days
8. **Passive Talent CRM** - Included (engagement multiplier), 2-3 days
9. **Slack Integration** - Included (workflow efficiency), 2-3 days
10. **White-Label** - $1M+ ARR potential but complex, 4-5 days

### By Feasibility (Easiest First)
1. War Room Voting (data aggregation + xAI)
2. Slack Integration (webhook setup)
3. Passive Talent CRM (scheduled emails)
4. Salary Benchmarking (API lookup + xAI)
5. Predictive Scoring (statistical model)
6. Diversity Analytics (data aggregation)
7. Competitor Intelligence (data tracking)
8. ATS Integrations (OAuth, API mapping)
9. Video Interviews (requires external services)
10. White-Label (multi-tenant complexity)

---

## External Dependencies & Costs

### Already Configured (Just Wire Up)
- xAI Grok (for AI logic)
- SerpAPI (for research)
- Bright Data (for profile scraping)
- SendGrid (for email)
- Twilio (for SMS)

### Need to Setup
| Service | Cost | Purpose |
|---------|------|---------|
| Payscale/Salary.com API | $50-100/mo | Salary benchmarking |
| Greenhouse OAuth | Free | ATS integration |
| AWS S3 or Bunny.net | $5-50/mo | Video storage |
| Whisper API or Google Speech | $10-50/mo | Video transcription |
| Sentry or LogRocket | $100-300/mo | Error monitoring |
| Datadog or New Relic | $150-500/mo | Performance monitoring |

**Total Monthly Cost:** $315-1090/month (production-ready)

---

## Realistic Timeline

| Phase | Duration | Cumulative | Features Complete |
|-------|----------|-----------|-------------------|
| Phase 1 (Core) | 4 weeks | 4 weeks | 3 features (War Room, Salary, Predictive) |
| Phase 2 (ATS) | 2 weeks | 6 weeks | +4 ATS integrations |
| Phase 3 (Beta) | 4 weeks | 10 weeks | +3 beta features |
| Phase 4 (Polish) | 2 weeks | 12 weeks | +3 integrations (Slack, Passive, White-Label) |
| Phase 5 (Infra) | 1 week | 13 weeks | Production-ready infrastructure |
| **Total** | **13 weeks** | **13 weeks** | **All 10 features + infrastructure** |

---

## Success Criteria for Production Ready

- [ ] All 10 features have real business logic (not mock data)
- [ ] All backend APIs return actual calculated/retrieved data
- [ ] All external API integrations are wired and tested
- [ ] Database has proper indexing and query optimization
- [ ] Error handling and logging in place for all endpoints
- [ ] Frontend pages call real APIs and display live data
- [ ] Performance: API response time < 500ms, Frontend LCP < 2s
- [ ] Security: HTTPS, input validation, rate limiting enabled
- [ ] Monitoring: Error tracking, performance monitoring live
- [ ] Backup/recovery procedures documented and tested
- [ ] At least 2 data quality features working end-to-end
- [ ] Can handle 100+ concurrent users
- [ ] Mobile responsive and accessible (WCAG AA)
- [ ] Documented API spec and deployment procedures

---

## Recommendation for Next 30 Days

**START WITH PHASE 1 (Weeks 1-4):**
1. **Week 1:** War Room voting (highest revenue, quickest ROI)
2. **Week 2:** Salary benchmarking (choose data source, wire API)
3. **Week 3:** Predictive scoring (implement statistical model)
4. **Week 4:** Choose 1 ATS to integrate fully (recommend Greenhouse)

This gives you:
- ✅ 3 revenue-generating features working
- ✅ 1 enterprise integration working
- ✅ Ability to demo to customers
- ✅ Foundation for remaining features

Then continue with Phase 2-5 based on customer feedback.

