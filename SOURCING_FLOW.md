# DeepHire AI Candidate Sourcing Flow

## Overview
DeepHire uses a **4-Phase Intelligent Sourcing System** that combines xAI Grok reasoning, external LinkedIn search APIs, profile scraping, and ML-powered candidate quality gates.

---

## 🎯 **Phase 1: Needs Analysis Profile (NAP) Collection**
**Triggered:** When user initiates chat in job detail page  
**Duration:** 2-5 minutes (conversational)

### Process:
1. **xAI Grok Interview** - Asks clarifying questions in priority order:
   - What specific problem are you solving? (NEED)
   - Who has hiring authority? (AUTHORITY)
   - What's the main pain point? (PAIN)

2. **One Question at a Time** - Prevents cognitive overload, prioritized by importance
3. **Auto-Enrichment** - Fills job details from NAP answers
4. **Validation** - NAP complete when ≥80% fields answered

### Output:
```json
{
  "title": "Senior ML Engineer",
  "location": "San Francisco",
  "requiredSkills": ["PyTorch", "LLMs", "Python"],
  "criticality": "high",
  "reasons": "Building production LLM inference"
}
```

---

## 🔍 **Phase 2: Search Strategy Generation**
**Triggered:** Auto-trigger when NAP complete ≥80%  
**Time:** Instant (xAI Grok reasoning)

### Process:
1. **Parse NAP Context** - Extract explicit + implied requirements
2. **AI Analysis** - xAI Grok analyzes:
   - Industry norms (e.g., ML Engineers expect equity)
   - Compensation expectations
   - Career trajectory patterns
   - Geographic talent pool density

3. **Generate Boolean Search Queries** - Examples:
   ```
   LinkedIn: (("Machine Learning" OR "Deep Learning" OR "LLM") AND ("PyTorch" OR "TensorFlow")) AND (location:San Francisco OR location:"Bay Area")
   ```

4. **Set Search Depth** - Cost-aware targeting:
   - **Elite 8** ($149) → Top 8 hyper-qualified candidates
   - **Elite 15** ($199) → 15 highly qualified candidates  
   - **Deep 60** ($149) → 60 broad market scan
   - **Market Scan** ($179) → 150 exploratory research

### Output:
```json
{
  "searchQueries": [
    "(ML OR 'machine learning') AND (PyTorch OR TensorFlow)",
    "LLM engineer San Francisco"
  ],
  "depthTarget": "elite_15",
  "reasoning": "Target top-tier talent with 7+ years experience"
}
```

---

## 🚀 **Phase 3: Async Search Orchestration** 
**Triggered:** Automatically after Phase 2  
**Duration:** 5-15 minutes (async, non-blocking)

### Step 1: LinkedIn Search (SerpAPI)
- **API:** SerpAPI with boolean operators
- **Input:** Search queries + filters (location, industry)
- **Output:** 15-150 LinkedIn profile URLs

### Step 2: Profile Fetching (Bright Data)
- **Batch Processing:** 5 concurrent profiles per batch (rate-limit safe)
- **Retry Logic:** 2 attempts per profile if scrape fails
- **Data Extracted:**
  - Full profile information
  - Work history (companies, roles, duration)
  - Education & certifications
  - Skills endorsements
  - Headline & summary

### Step 3: Candidate Ingestion
- **Auto-Create Database Records** with:
  - LinkedIn profile data
  - Parsed skills (ML-extracted)
  - Experience level calculation
  - Location inference
  - Email inference (using transliteration)

- **Duplicate Detection:**
  - Phone number matching
  - Email matching
  - Name + company combination matching

### Step 4: Quality Gate (ML Fit Scoring)
**Threshold:** FIT_SCORE ≥ 70 required  
**Uses:** Predictive Success Scoring (enhanced ML model)

```typescript
// Calculates 5-dimension fit:
- experienceMatch (25%)     // Years vs requirement
- skillsMatch (25%)         // Critical vs nice-to-have skills
- careerStability (20%)     // Job tenure patterns
- cultureFit (15%)          // Industry alignment
- growthPotential (15%)     // Education + trajectory

finalScore = (experience×0.25) + (skills×0.25) + 
             (stability×0.20) + (culture×0.15) + 
             (growth×0.15)
```

### Step 5: Job Linking
- **Automatic Link:** Only candidates with FIT_SCORE ≥ 70
- **Status:** "Staged" for recruiter review
- **Email Notification:** Sent when sourcing completes

### Progress Tracking:
```json
{
  "phase": "processing",
  "profilesFound": 45,
  "profilesFetched": 42,
  "profilesProcessed": 38,
  "candidatesCreated": 35,
  "candidatesDuplicate": 3,
  "candidatesQualityGated": 28,
  "message": "38 candidates staged, awaiting recruiter review"
}
```

---

## 📊 **Phase 4: Candidate Review & Matching**
**Triggered:** Manually by recruiter  
**Time:** Real-time

### Available Actions:
1. **View Candidate** - Full profile with AI reasoning
2. **View Fit Score** - Success probability + confidence
3. **Advanced Metrics:**
   - Job hopping risk
   - Retention prediction
   - Performance rating (1-5 scale)
   - Predicted tenure (months)
   - Next move probability

4. **Add to War Room** - Collaborative hiring committee voting
5. **Schedule Interview** - Video screening setup
6. **Send Offer** - AI-optimized salary + equity recommendation

---

## 🔄 **Current API Endpoints**

| Endpoint | Method | Trigger | Async |
|----------|--------|---------|-------|
| `/api/conversations/:id/messages` | POST | Chat interface | Yes |
| `/api/jobs/:jobId/sourcing/elite` | POST | "Start Sourcing" button | Yes |
| `/api/sourcing/search` | POST | API call | Yes |
| `/api/jobs/:jobId/candidates` | GET | View staged candidates | No |
| `/api/predictive-score` | POST | Calculate fit for candidate | No |
| `/api/salary-benchmark` | POST | Market data + offer recs | No |

---

## 🛠️ **External Integrations**

| Service | Purpose | Data |
|---------|---------|------|
| **SerpAPI** | LinkedIn search with boolean queries | Profile URLs, names, headlines |
| **Bright Data** | LinkedIn profile scraping | Full profiles, work history, education |
| **xAI Grok** | NAP interview + strategy generation | Reasoning, search queries |
| **Voyage AI** | Semantic matching (future phase) | Embeddings for smart matching |

---

## ⚠️ **Quality Safeguards**

1. **Duplicate Detection** - Prevents duplicate candidate ingestion
2. **FIT_SCORE Gate** - Only 70+ candidates get staged
3. **Batch Rate Limiting** - 5 profiles/sec to avoid scraping detection
4. **Retry Logic** - 2 attempts before marking failed
5. **Email Notifications** - Progress updates to recruiter

---

## 🎯 **Next Improvements (Accuracy Focus)**

1. **Semantic Skill Matching** - Using Voyage AI embeddings for deeper skill analysis
2. **Multi-Signal Culture Fit** - Parse company DNA + candidate values
3. **Predictive Market Fit** - Historical placement success patterns
4. **Real-time Salary Benchmarking** - LinkedIn salary data integration
5. **Implicit Candidate Scoring** - Hidden signals (GitHub activity, Twitter presence)
