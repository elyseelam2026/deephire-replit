# DeepHire API Reference

## Base URL
```
Development: http://localhost:5000
Production: https://your-domain.replit.dev
```

## Authentication
Currently using session-based auth. Add Bearer token auth for production.

---

## War Room API

### Create War Room
```
POST /api/war-rooms
Content-Type: application/json

{
  "companyId": 1,
  "candidateId": 5,
  "votingDeadline": "2025-11-30T18:00:00Z",
  "voters": [2, 3, 4]  // User IDs
}

Response:
{
  "success": true,
  "warRoomId": 42,
  "message": "War room created for voting"
}
```

### Submit Vote
```
POST /api/war-rooms/:id/vote
Content-Type: application/json

{
  "voterId": 2,
  "vote": "strong_yes",  // strong_yes, yes, maybe, no, strong_no
  "reasoning": "Excellent technical background and culture fit"
}

Response:
{
  "success": true,
  "voteId": 123,
  "message": "Vote recorded"
}
```

### Get War Room Summary
```
GET /api/war-rooms/:id/summary

Response:
{
  "warRoomId": 42,
  "totalVotes": 3,
  "voteBreakdown": {
    "strong_yes": 2,
    "yes": 1,
    "maybe": 0,
    "no": 0,
    "strong_no": 0
  },
  "consensusScore": 83,
  "recommendation": "PROCEED_HIRE",
  "aiSummary": "Committee strongly favors this candidate with 83/100 consensus score",
  "unanimity": "split"
}
```

---

## Salary Benchmarking API

### Get Market Salary Data
```
POST /api/salary-benchmark
Content-Type: application/json

{
  "jobTitle": "Senior Software Engineer",
  "location": "San Francisco",
  "experience": 5,
  "industry": "Technology"
}

Response:
{
  "benchmarkSalary": 185000,
  "benchmarkBonus": 27750,
  "benchmarkEquity": 1.0,
  "recommendedSalary": 180450,
  "recommendedBonus": 27067,
  "recommendedEquity": 1.5,
  "acceptanceProbability": 0.84,
  "reasoning": "Offer positioned to be competitive and close rate"
}
```

### Generate Competitive Offer
```
POST /api/offer-optimization
Content-Type: application/json

{
  "candidateId": 5,
  "jobId": 10,
  "marketSalary": 185000
}

Response:
{
  "success": true,
  "benchmarkSalary": 185000,
  "recommendedSalary": 189500,
  "recommendedBonus": 28425,
  "recommendedEquity": 2.0,
  "acceptanceProbability": 0.87,
  "message": "Competitive offer generated"
}
```

---

## Predictive Scoring API

### Calculate Success Probability
```
POST /api/predictive-score
Content-Type: application/json

{
  "candidateId": 5,
  "jobId": 10
}

Response:
{
  "successScore": 78,
  "tenurePrediction": 34,  // months
  "retentionRisk": "low",
  "performanceRating": 4.5,
  "reasoning": "Strong technical skills and stable career history suggest good long-term fit",
  "factors": {
    "experienceMatch": 0.85,
    "skillsMatch": 0.80,
    "careerStability": 0.75,
    "cultureFit": 0.60,
    "growthPotential": 0.70
  }
}
```

---

## Video Interview API

### Create Video Screening
```
POST /api/video-interviews
Content-Type: application/json

{
  "jobId": 10,
  "candidateId": 5,
  "questions": [
    {"question": "Tell us about your background", "timeLimit": 90},
    {"question": "Why this role?", "timeLimit": 60}
  ]
}

Response:
{
  "success": true,
  "interviewId": 123,
  "message": "Video interview created"
}
```

### Submit Video Recording
```
POST /api/video-interviews/:id/submit
Content-Type: application/json

{
  "videoUrl": "https://storage.example.com/video.mp4"
}

Response:
{
  "success": true,
  "communicationScore": "82.5",
  "enthusiasmScore": "78.3",
  "clarityScore": "85.1",
  "overallScore": "81.9",
  "analysis": {
    "strengths": ["Clear communication", "Good enthusiasm"],
    "weaknesses": ["Could elaborate more"],
    "recommendation": "ADVANCE"
  }
}
```

### Get Interview Details
```
GET /api/video-interviews/:id

Response:
{
  "id": 123,
  "jobId": 10,
  "candidateId": 5,
  "status": "scored",
  "communicationScore": 82.5,
  "enthusiasmScore": 78.3,
  "clarityScore": 85.1,
  "overallScore": 81.9,
  "submittedAt": "2025-11-23T12:00:00Z",
  "scoredAt": "2025-11-23T12:05:00Z"
}
```

---

## Diversity Analytics API

### Record Demographics
```
POST /api/diversity-metrics
Content-Type: application/json

{
  "jobId": 10,
  "companyId": 1,
  "gender": "F",
  "ethnicity": "Asian",
  "age": 32,
  "status": "interviewed"
}

Response:
{
  "success": true,
  "metricId": 456,
  "message": "Diversity metric recorded"
}
```

### Get DEI Analytics
```
GET /api/diversity-metrics/:jobId

Response:
{
  "jobId": 10,
  "totalCandidates": 50,
  "demographics": {
    "gender": {
      "M": 35,
      "F": 15,
      "NB": 0
    },
    "ethnicity": {
      "Asian": 15,
      "White": 25,
      "Hispanic": 8,
      "Black": 2
    }
  },
  "pipeline": {
    "applied": 50,
    "interviewed": 15,
    "offered": 3,
    "hired": 1
  },
  "alerts": [
    {
      "level": "warning",
      "type": "underrepresentation",
      "group": "Black",
      "percentage": "4.0",
      "message": "Black candidates represent only 4.0% of pipeline"
    }
  ],
  "complianceScore": 70
}
```

---

## Competitor Intelligence API

### Log Competitor Interview
```
POST /api/competitor-alerts
Content-Type: application/json

{
  "candidateId": 5,
  "competitorCompany": "Google",
  "interviewStage": "final"
}

Response:
{
  "success": true,
  "alertId": 789,
  "message": "Competitor threat tracked: Google"
}
```

### Get Threat Intel
```
GET /api/competitor-alerts/:candidateId

Response:
{
  "candidateId": 5,
  "competitorThreats": [
    {
      "company": "Google",
      "stage": "final",
      "detectedAt": "2025-11-23T10:00:00Z"
    },
    {
      "company": "Meta",
      "stage": "technical",
      "detectedAt": "2025-11-22T14:00:00Z"
    }
  ],
  "riskLevel": "high",
  "recommendation": "Make counter-offer within 24 hours"
}
```

---

## ATS Integration API

### Connect Greenhouse
```
POST /api/ats/greenhouse/connect
Content-Type: application/json

{
  "companyId": 1,
  "authCode": "oauth_code_from_greenhouse"
}

Response:
{
  "success": true,
  "connectionId": 321,
  "message": "Greenhouse connected successfully"
}
```

### Sync Jobs from ATS
```
POST /api/ats/greenhouse/sync-jobs
Content-Type: application/json

{
  "companyId": 1
}

Response:
{
  "success": true,
  "jobsSynced": 5,
  "jobs": [
    {
      "id": 1,
      "title": "Senior Engineer",
      "department": "Engineering",
      "status": "active"
    }
  ],
  "message": "Successfully synced 5 jobs from Greenhouse"
}
```

### Push Candidate to ATS
```
POST /api/ats/greenhouse/push-candidate
Content-Type: application/json

{
  "companyId": 1,
  "candidateId": 5,
  "jobId": 10
}

Response:
{
  "success": true,
  "message": "Candidate pushed to Greenhouse"
}
```

---

## White-Label API

### Onboard Partner
```
POST /api/whitelabel/onboard
Content-Type: application/json

{
  "partnerCompanyId": 15,
  "customDomain": "partner.mycompany.com",
  "brandingColor": "#FF6B35",
  "logoUrl": "https://cdn.example.com/logo.png"
}

Response:
{
  "success": true,
  "clientId": 55,
  "customDomain": "partner.mycompany.com",
  "message": "White-label partner provisioned"
}
```

### Record Usage
```
POST /api/whitelabel/usage
Content-Type: application/json

{
  "clientId": 55,
  "placements": 5,
  "searches": 12,
  "videoInterviews": 8
}

Response:
{
  "success": true,
  "usageId": 999,
  "totalFee": 3979,
  "partnerRevenue": 1193.70,
  "message": "Usage recorded for billing"
}
```

---

## Error Responses

### Standard Error Format
```json
{
  "error": "error message",
  "status": 400,
  "timestamp": "2025-11-23T12:00:00Z"
}
```

### Common Error Codes
- **400**: Bad Request - Missing or invalid parameters
- **401**: Unauthorized - Auth required
- **404**: Not Found - Resource doesn't exist
- **500**: Server Error - Internal error (check logs)

---

## Rate Limiting

- **Default**: 100 requests per minute per IP
- **Premium**: 1000 requests per minute per API key
- **Enterprise**: Unlimited (contact sales)

---

## Webhooks (Coming Soon)

Monitor these events:
- `candidate.hired`
- `interview.scheduled`
- `offer.extended`
- `diversity.alert`
- `competitor.detected`

---

**API Version**: v1.0
**Last Updated**: November 23, 2025
**Status**: Production Ready
