# DeepHire - AI-Powered Talent Acquisition Platform

## Overview
DeepHire is an AI-powered enterprise B2B recruiting platform designed to revolutionize talent acquisition, initially focusing on Private Equity. It acts as an AI executive search consultant, automating candidate sourcing via web scraping and intelligent ranking based on a Needs Analysis Profile (NAP). The platform streamlines recruitment workflows through a multi-portal architecture, integrated management systems, and a vision for advanced Company Intelligence, Organization Chart Mapping, Pattern Learning, Semantic Matching, and Culture Insights. The platform includes features such as Salary Benchmarking, a Hiring Committee War Room, Predictive Success Scoring, Video Interview Screening, Diversity Analytics, Competitor Intelligence, ATS Integrations, a Passive Talent CRM, Slack Integration, and a White-Label Platform.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Design
The platform features an enterprise-first, professional interface utilizing a deep navy primary color with green accents. It uses the Inter font family, supports both dark and light modes, and is built with a reusable component system. A multi-portal architecture serves different user types: Researcher, Company, Agency, Admin, and Candidate.

### Technical Stack
- **Frontend**: React 18, TypeScript, Radix UI, shadcn/ui, Tailwind CSS, TanStack Query, Wouter routing
- **Backend**: Node.js, Express.js, TypeScript
- **Database**: PostgreSQL (Neon serverless) with Drizzle ORM and Zod schemas
- **AI**: xAI Grok for intelligence, Voyage AI for semantic search
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
The system exposes over 30 production API endpoints, including:
- **Tenant Management**: `/api/tenants/create`, `/api/tenants/:id`, `/api/invitations/send`, `/api/invitations/accept`, `/api/tenants/:id/members`, `/api/candidates/create-account`, `/api/candidates/:userId/account`.
- **Feature-specific endpoints**: e.g., `/api/salary-benchmark`, `/api/war-rooms`, `/api/predictive-score`, `/api/video-interviews`, `/api/diversity-metrics`, `/api/competitor-alerts`, `/api/ats/greenhouse/connect`, `/api/passive-reengagement`, `/api/integration/slack-connect`, `/api/whitelabel/onboard`.

### Database Schema
The database comprises 18 tables including `tenants`, `tenant_members`, `tenant_invitations`, `salaryBenchmarks`, `offerOptimizations`, `warRooms`, `predictiveScores`, `videoInterviews`, `diversityMetrics`, `competitorInterviews`, `atsConnections`, `passiveTalentPool`, `integrationConnections`, and `whitelabelClients`.

## External Dependencies
- **AI**: xAI Grok, Voyage AI
- **Search & Scraping**: SerpAPI (LinkedIn search), Bright Data (profile scraping)
- **Communication**: SendGrid (email), Twilio (SMS), Slack API (notifications)
- **Database**: Neon (serverless PostgreSQL)