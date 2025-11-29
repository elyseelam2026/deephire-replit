# DeepHire - AI-Powered Talent Acquisition Platform

## Overview
DeepHire is an AI-powered enterprise B2B recruiting platform that leverages xAI Grok for intelligent candidate sourcing and matching. It focuses on a thoughtful research phase before proposing solutions and utilizes a dual-track sourcing model (active job posting alongside passive candidate hunting) to ensure quality over speed in talent acquisition. The platform aims to be a strategic partner, delivering informed and professional recruiting outcomes.

## User Preferences
- Preferred communication: Simple, everyday language. Focus on continuous AI accuracy improvements over infrastructure work.
- **CRITICAL:** No showing off shallow work. Take time to research, think, and propose informed solutions.
- Platform should feel like a thoughtful partner, not a rushed bot chasing metrics.

## System Architecture

### UI/UX Design
The platform features an enterprise-first, professional interface with a deep navy primary color and green accents. It supports a multi-portal architecture for Researcher, Company, Agency, Admin, and Candidate roles.

### Technical Stack
- **Frontend**: React 18, TypeScript, Radix UI, shadcn/ui, Tailwind CSS, TanStack Query, Wouter routing
- **Backend**: Node.js, Express.js, TypeScript
- **Database**: PostgreSQL (Neon serverless) with Drizzle ORM and Zod schemas
- **AI**: xAI Grok for NAP interviews, research analysis, JD generation, and role-fit scoring.
- **Web Search**: SerpAPI for company and competitor analysis.
- **Learning**: Active collection engines populate 5 learning features automatically.
- **Candidate Quality**: Grok-powered role-fit evaluation with a 60-point quality threshold.

### Core Workflow
The system follows a structured workflow:
1.  **NAP Collection**: Gathers initial job requirements through a conversational interview.
2.  **Research Phase**: Conducts background research on the company, industry, and hiring patterns using web search, without user interaction.
3.  **Informed JD Generation**: Generates a professional Job Description (JD) based on NAP and research findings.
4.  **Approval & Dual-Track Setup**: User reviews and approves the JD, initiating parallel active job postings and passive candidate sourcing.
5.  **Sourcing Execution**: Actively posts to job boards and passively searches target companies.

### 5-Feature Learning System
The platform incorporates a learning system to continuously improve:
1.  **Compensation Intelligence**: Tracks salary bands and learns market rates.
2.  **Career Path Tracking**: Learns typical career progressions and mobility patterns.
3.  **Talent Quality Metrics**: Tracks success rates and tenure from placements.
4.  **Geographic/Seasonal Patterns**: Identifies talent sources and hiring seasonality.
5.  **Success Factor Learning**: Learns what predicts successful hires and tracks regulatory requirements.

### Candidate Matching Flow
Job context is used to `scoreRoleFit()` for each candidate. Only candidates scoring 60+ are returned, sorted by fit score, ensuring a high-quality candidate list.

## External Dependencies
- **AI**: xAI Grok
- **Web Search**: SerpAPI
- **Candidate Search & Scraping**: Bright Data
- **Job Posting**: LinkedIn, various job boards (integration TBD)
- **Communication**: SendGrid (email), Twilio (SMS)
- **Database**: Neon (serverless PostgreSQL)