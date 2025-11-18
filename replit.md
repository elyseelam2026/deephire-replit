# DeepHire - AI-Powered Talent Acquisition Platform

## Overview
DeepHire is an AI-powered enterprise B2B recruiting platform that revolutionizes talent acquisition, initially for Private Equity. It functions as an AI executive search consultant, sourcing external candidates via web scraping and providing intelligent candidate ranking based on a comprehensive Needs Analysis Profile (NAP) context. The platform automates job description parsing and streamlines recruitment workflows through a multi-portal architecture and integrated management systems. The long-term vision includes developing a bottom-up intelligence system for Company Intelligence, Organization Chart Mapping, Pattern Learning, Semantic Matching, and Culture Insights.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The platform features an enterprise-first, professional, and usable design. It utilizes a deep navy primary color, professional green accents, and the Inter font family. The design emphasizes reusable components for data tables, cards, forms, and navigation, supporting both dark and light modes. The architecture includes distinct portals for Agency, Client, Admin, and Candidate users, each with tailored navigation and functionalities, including an AI Assistant chatbox in the Client Portal.

### Technical Implementations
The frontend is built with React 18, TypeScript, Radix UI, shadcn/ui, Tailwind CSS, TanStack Query for state management, and Wouter for routing. The backend uses Node.js, Express.js, and TypeScript, integrating xAI's Grok model for AI functionalities and Express sessions with a PostgreSQL store for session management. Key features include an AI-powered conversational recruiting assistant, hybrid LinkedIn and Boolean search, enhanced team discovery with multi-language name support, Salesforce-style custom fields, comprehensive candidate management with a full-page workspace interface, an AI-powered data quality system, an 8-stage ATS pipeline, AI company employee research, and an external candidate sourcing engine with a two-phase resilience architecture. The platform also features AI-powered candidate fit scoring, an AI Promise system for immediate execution, and a NAP-driven search strategy engine that converts consultative interviews into targeted Boolean LinkedIn queries with context-first rationale generation. A weighted binary scoring system enables client-controlled quality thresholds with transparent hard and soft skill scoring. An AI hallucination prevention system employs a three-layer validation for email inference, career history completeness, and data quality scoring.

**Candidate Detail Workspace** - A comprehensive full-page interface featuring 6 tabs (Overview, Activity Log, Files, Job Assignments, Career History, Executive Biography) with inline activity creation, document management, and job assignment tracking. The hybrid approach retains War Room modal quick previews with a "View Full Profile" button for deep-dive candidate management.

### System Design Choices
The primary database is PostgreSQL (Neon serverless) with Drizzle ORM, supporting Companies, Candidates, Jobs, Job matches, Users, Data ingestion, Duplicate detection, Candidate activities, Candidate files, and Candidate interviews, including multi-language support and custom fields via JSONB. A hybrid AI strategy leverages xAI Grok for conversational intelligence, parsing, and generation, and Voyage AI for semantic embeddings and vector search via PostgreSQL `pgvector`. The AI-Powered Data Quality System uses a three-layer processing approach (detection, AI remediation, manual queue) with a dedicated dashboard. The candidate management system features activity tracking with support for notes, emails, calls, and meetings, document management with metadata storage ready for S3 integration, and interview scheduling with outcome tracking.

## External Dependencies

### AI Services
-   **xAI Grok API**: Conversational AI, job parsing, matching logic.
-   **Voyage AI**: Semantic embeddings and vector search.

### Data Services
-   **SerpAPI**: Search engine results, LinkedIn profile discovery, email research.
-   **Bright Data**: LinkedIn profile scraping.

### Database
-   **Neon PostgreSQL**: Serverless database hosting.
-   **Drizzle ORM**: Database interactions.

### Email Services
-   **SendGrid**: Transactional email delivery.