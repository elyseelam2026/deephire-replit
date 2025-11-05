# DeepHire - Current Design Summary
**Date:** November 5, 2025  
**Purpose:** Complete documentation of implemented features for design review

---

## 1. DASHBOARD (Recruiting Portal Home)

**Route:** `/recruiting` or `/recruiting/`

**Core Purpose:** AI-Powered Recruiting Assistant Interface

### Features Implemented:
- **ChatGPT-Style AI Interface**: Full conversational UI with message history
- **NAP (Need Analysis Profile) Collection**: AI asks consultative questions one at a time to gather hiring requirements
- **JD File Upload**: Accepts PDF, DOCX, TXT job description files for AI parsing
- **AI Job Description Parsing**: Extracts skills, requirements, experience levels automatically
- **Top Candidate Matching Display**: Shows AI-recommended candidates based on conversation
- **Dynamic Job Order Creation**: Creates job records from conversation context with user confirmation
- **Auto-Navigation**: Redirects to Jobs page upon job creation
- **File Handling**: Visual file attachment preview, upload progress indicators
- **Persistent Conversations**: Stores conversation ID in localStorage for session continuity

### Technical Implementation:
- Uses xAI Grok-2-1212 for conversational intelligence
- Multi-turn conversation with context awareness
- Markdown link support in AI responses
- Real-time message streaming
- Integration with candidate database for instant matching

---

## 2. COMPANIES SECTION

**Route:** `/recruiting/companies`

**Core Purpose:** Comprehensive Company Intelligence & Management

### Features Implemented:

#### Core CRUD Operations:
- **View Company List**: Card-based display with search functionality
- **Smart Search**: Hierarchical search across parent companies and office locations
- **Create Company**: Manual company addition form
- **Edit Company**: Two modes:
  - Inline edit mode with auto-open from data quality issues (?edit=true)
  - Multi-tab edit dialog (5 tabs: Basic Info, Contact, Business Details, Financial, Notes)
- **Delete Company**: With safety checks for associated jobs/offices
- **View Company Details**: Modal with comprehensive information display

#### AI-Powered Intelligence Features:
- **Company Intelligence Engine**: Auto-categorizes by industry, stage, funding, geography
- **4-Layer Office Extraction System**:
  - Layer 1: JSON-LD structured data
  - Layer 2: Microdata parsing
  - Layer 3: CSS selectors
  - Layer 4: AI fallback extraction
- **Team Discovery**: Scrapes company websites to find team members with pagination support
- **Website Refresh**: Re-scrape company website to update information
- **Hiring Pattern Analysis**: Learns from org charts to identify recruitment patterns
- **Multi-Language Site Support**: Handles international company pages

#### Company Hierarchy:
- **Parent-Child Relationships**: Convert office locations into child companies
- **Headquarters Flagging**: Mark main company vs. office locations
- **Candidate-Company Links**: Track employment history relationships

#### Bulk Operations:
- **CSV/XLSX Upload**: Mass import with AI parsing
- **Duplicate Detection**: Prioritizes website domain matching
- **Background Processing**: Async intelligence processing via jobs

### Data Model:
- 30+ fields including: name, website, industry, location, employee size, stage, funding, office locations (JSONB array), custom fields (JSONB)
- Role architecture: companies can have roles like ['client', 'sourcing', 'prospecting']

---

## 3. CANDIDATES SECTION

**Route:** `/recruiting/candidates`

**Core Purpose:** Full-Cycle Candidate Management with AI-Enhanced Data Quality

### Features Implemented:

#### Views & Navigation:
- **Main Candidates Page**: Grid of candidate cards with search/filter
- **Candidate Detail Page**: Comprehensive profile view with edit mode
- **Recycling Bin View**: Soft-deleted candidates (separate section below)

#### Core Operations:
- **Full CRUD**: Create, Read, Update, Delete (soft delete)
- **Professional 5-Tab Edit Dialog**:
  - Personal Info (name, contact, location, languages)
  - Professional (title, company, years experience, salary expectations)
  - Education & Skills (degrees, certifications, technical skills, languages)
  - Career Preferences (desired roles, industries, locations, work arrangements)
  - Compensation (current salary, expectations, bonus structure, equity)
- **Quick Search**: By name, title, company, location
- **Advanced Filters**: Status, experience level, location, skills

#### Document Management:
- **CV/Resume Upload**: PDF, DOCX, TXT support
- **Intelligent Text Extraction**:
  - PDF parsing via pdf-parse
  - DOCX parsing via mammoth
  - Automatic duplicate detection
- **4 Processing Modes**:
  - **full**: Complete AI processing (biography, career history, embeddings)
  - **career_only**: Extract career history only
  - **bio_only**: Generate AI biography only
  - **data_only**: Store text without AI processing
- **Retroactive Processing**: Process uploaded CVs with different modes later

#### AI-Powered Features:
- **LinkedIn Data Integration**: Auto-populate from LinkedIn profiles via SerpAPI + Bright Data scraping
- **AI Biography Generation**: Grok generates professional biographies from LinkedIn/CV data
- **Career History Parsing**: Extracts structured job history from unstructured text
- **Semantic Embeddings**: Voyage AI embeddings for vector similarity search
- **Email Inference**: Multi-language name transliteration + company email patterns
- **Company Linking**: Auto-link candidates to companies in database

#### Multi-Language Name System:
- **Transliteration Pipeline**: Supports Chinese (Pinyin), Japanese (Wanakana), Korean (Hangul Romanization)
- **Display Name Handling**: Stores both native and romanized names
- **Email Generation**: Infers professional email from name + company patterns

#### Interaction Tracking:
- **Note System**: Add timestamped notes to candidate profiles
- **Interaction History**: Track all touchpoints (calls, emails, meetings)
- **Status Changes**: Audit trail of all updates

---

## 4. JOBS SECTION & PIPELINE MANAGEMENT

**Route:** `/recruiting/jobs` and `/recruiting/jobs/:id`

**Core Purpose:** Production-Grade ATS with AI-Driven Candidate Matching

### Job Management:
- **Job List View**: All active job orders with status badges
- **Job Detail**: 3-panel Manus AI-style interface:
  - Left: Job details (title, company, requirements, urgency)
  - Center: Candidate pipeline (see below)
  - Right: AI-generated search strategy (transparent AI reasoning)

### Candidate Pipeline System (8-Stage Workflow):
**Pipeline Stages:**
1. **Recommended** → AI-suggested matches
2. **Reviewed** → Recruiter reviewed
3. **Shortlisted** → Top picks
4. **Presented** → Shown to client
5. **Interview** → In interview process
6. **Offer** → Offer extended
7. **Placed** → Successfully hired
8. **Rejected** → Not proceeding

### 4 Pipeline Views:

#### 1. List View
- Sortable table (Name, Company, Status, Match Score, Date Added)
- Checkbox column for multi-select
- Status badges with color coding
- Match score percentages (AI-generated)
- Search tier indicators (Tier 1 / Tier 2)
- Click-through to candidate profiles

#### 2. Kanban View
- 8 draggable columns (one per stage)
- @hello-pangea/dnd drag-and-drop
- Map-based optimistic updates for fast UX
- Candidate cards show: name, title, company, match score, tier
- Supports multiple concurrent drags
- Real-time status updates

#### 3. Timeline View
- Visualizes candidate journey through pipeline
- Shows status changes over time
- Time spent in each stage
- Progress percentage indicator
- Status history with timestamps
- Identifies bottlenecks

#### 4. Analytics View (ConversionFunnel)
- 8-stage funnel visualization
- Conversion rates between stages
- Average match scores per stage
- Average time in each stage
- Rejection analysis
- Pipeline health metrics
- Historical stage counts

### Advanced Pipeline Features:

#### PipelineControls:
- **Search**: Filter candidates by name, company, title
- **Status Filter**: Multi-select status filtering
- **Match Score Filter**: Minimum threshold slider
- **Search Tier Filter**: Tier 1 / Tier 2 toggle
- **Active Filter Badges**: Visual indicators of applied filters
- **Clear Filters**: One-click reset
- **Export**: CSV export with real job titles in filename
- **Add Candidates**: Bulk add from database

#### Bulk Actions Toolbar:
- **Multi-Select Checkboxes**: Select individual or all candidates
- **Bulk Status Change**: Update multiple candidates at once
- **Bulk Add Notes**: Add notes to selected candidates
- **Bulk Remove**: Delete from pipeline
- **Selection Counter**: Shows "X selected"
- **Clear Selection**: Deselect all

#### AddCandidatesModal:
- Search existing candidates in database
- Multi-select interface
- Filters out candidates already in pipeline
- Shows candidate preview (name, title, company)
- Bulk add with single click
- Auto-resets state on close

#### CSV Export:
- Filename uses sanitized job title: `pipeline-Internal-Search-2025-11-05.csv`
- 12 columns: Name, Title, Company, Status, Match Score, Tier, Email, Phone, Location, LinkedIn, Added Date, Status Changed Date
- Respects active filters
- Instant download

### AI Matching System:
- **Hybrid Search Strategy**: Two-tier approach
  - Tier 1: Internal database search (free)
  - Tier 2: External LinkedIn search (paid via SerpAPI)
- **Match Score Calculation**: AI analyzes fit on 0-100 scale
- **AI Reasoning**: Transparent explanation of why candidate matches
- **Boolean Search**: Advanced LinkedIn search for power users
- **Automatic Embedding Refresh**: Updates vector embeddings on profile changes

### Data Tracking:
- **Status History**: JSONB array of all status changes with timestamps
- **Rejected Reason**: Capture why candidates didn't proceed
- **Last Action At**: Track pipeline velocity
- **AI Suggestion**: Store AI recommendations for next actions
- **Recruiter Notes**: Free-form notes per candidate

---

## 5. RECYCLING BIN

**Route:** `/recruiting/recycling-bin`

**Core Purpose:** Soft Delete Recovery System for Candidates

### Features Implemented:
- **Soft Delete Architecture**: Uses `deleted_at` timestamp (null = active, timestamp = deleted)
- **Deleted Candidate List**: View all soft-deleted candidates
- **Candidate Preview**: Click to see full details of deleted candidate
- **Restore Functionality**: One-click restore to active candidates
- **Permanent Delete**: Complete removal from database with confirmation dialog
- **Search Deleted Candidates**: Find specific deleted records
- **Deletion Metadata**: Shows who deleted and when

### Technical Implementation:
- Candidates table has `deletedAt` timestamp column
- GET `/api/candidates/recycling-bin` returns soft-deleted records
- POST `/api/candidates/:id/restore` restores candidate
- DELETE `/api/candidates/:id/permanent` permanently removes

---

## 6. STAGING / VERIFICATION LAYER

**Route:** `/recruiting/staging`

**Core Purpose:** AI-Powered Candidate Verification Queue

### Features Implemented:

#### Staging Candidates System:
- **Raw Data Holding Area**: Unverified candidates from scraping/upload
- **Verification Status Tracking**: pending, verified, rejected, pending_review
- **Confidence Score Display**: AI confidence in verification (0-100%)
- **Source Tracking**: Records origin (LinkedIn scrape, manual upload, API import)
- **Candidate Cards**: Show name, title, company, status, confidence, source

#### AI Verification Checks:
- **LinkedIn Profile Validation**: Checks if profile exists and URL is valid
- **Company Match**: Verifies company name consistency
- **Title Consistency**: Checks job title accuracy
- **Duplicate Detection**: Identifies potential duplicate records
- **Email Pattern Validation**: Verifies email format and domain

#### Verification Details Dialog:
- **LinkedIn Profile Links**: Direct links to profiles for manual review
- **Company/Title Match Results**: Shows AI comparison results
- **Duplicate Detection Status**: Flags potential duplicates
- **Verification Notes**: AI reasoning for confidence scores
- **Action Buttons**: Promote to production or permanently delete

#### Bulk Actions:
- **Batch Status Updates**: Change status for multiple staging candidates
- **Batch Notes**: Add notes to selected candidates
- **Batch Delete**: Remove multiple from staging

#### Promotion to Production:
- **Verify & Promote**: Move verified candidates to main candidate database
- **Data Mapping**: Maps staging fields to production schema
- **Metadata Preservation**: Tracks verification date, confidence, source
- **Automatic Linking**: Links to companies in database

### Database Schema:
- **staging_candidates** table: Holds unverified data
- **verification_results** table: Stores AI verification outcomes
- **promotion tracking**: Links staging to production records

---

## 7. CONVERSATIONS

**Route:** `/recruiting/conversations`

**Core Purpose:** AI Conversation Management Dashboard

### Features Implemented:
- **Active Conversations List**: All ongoing AI recruiting conversations
- **Conversation Cards**: Display job title, company, candidate name, status, last message
- **Quick Actions**: View details, initiate contact
- **Search Conversations**: Find by job, company, or candidate
- **Status Indicators**: Active, completed, archived
- **Last Message Preview**: Shows most recent message snippet

### Conversation Types:
- **NAP Collection Conversations**: Hiring needs analysis
- **Job Order Conversations**: Job description parsing and candidate matching
- **Candidate Outreach**: Automated email conversations (tracked in Outreach section)

### Technical Implementation:
- Stores full conversation history in database
- Tracks conversation metadata (job context, company context, extracted info)
- Links conversations to jobs when created
- Persistent across sessions via localStorage for current conversation

---

## 8. OUTREACH

**Route:** `/recruiting/outreach`

**Core Purpose:** Email Campaign Tracking & Management

### Features Implemented:

#### Campaign Overview:
- **Email Outreach List**: All sent campaigns displayed as cards
- **Status Tracking**: 
  - Sent (blue badge)
  - Opened (green badge)
  - Replied (purple badge)
  - Bounced (red badge)
- **Status Icons**: Visual indicators (Mail, Eye, Reply icons)

#### Campaign Details:
- **Candidate Information**: Name, title, company with avatar
- **Job Context**: Which job the outreach is for
- **Email Preview**:
  - Subject line
  - Content preview (truncated)
  - Sent timestamp
- **Quick Actions**:
  - View Details button
  - View Reply button (if replied)

#### Analytics Dashboard:
- **Stats Cards**:
  - Total Sent
  - Open Rate (%)
  - Reply Rate (%)
  - Bounce Rate (%)
- **Search Functionality**: Filter by candidate name, subject, job title
- **Time Formatting**: Human-readable sent times

#### Data Model:
- Links to candidates (candidateId)
- Links to jobs (jobId)
- Stores email content (subject, body)
- Tracks status and timestamps
- Future: Integration with SendGrid for actual email delivery

---

## 9. ADMIN PORTAL

**Route:** `/admin`

**Core Purpose:** System Management, Data Quality, and Bulk Operations

### Tabbed Interface:
Admin portal uses tabs for different management areas

---

### TAB 1: QUICK ADD

**Purpose:** Rapid single-candidate addition with AI enrichment

#### Features:
- **Input Fields**:
  - First Name (required)
  - Last Name (required)
  - Company Name (required) - can be current OR previous employer
  - Job Title (optional)
  - LinkedIn URL (optional)
- **AI-Powered Search**:
  - If LinkedIn URL provided: Use directly for scraping
  - If no URL: AI searches LinkedIn via SerpAPI to find profile
  - Auto-populates candidate data from LinkedIn
- **Email Inference**: Uses company name + name transliteration to generate professional email
- **Real Data Only**: No AI-generated biographies, only scraped/verified data
- **Progress Indicator**: Shows processing status
- **Error Handling**: Clear error messages if profile not found

---

### TAB 2: BULK UPLOAD

**Purpose:** Mass import of candidates and companies

#### Upload Methods:
1. **File Upload**: CSV, XLSX files
2. **URL List**: Paste list of LinkedIn URLs (one per line)

#### Candidate Bulk Upload:
- **4 Processing Modes**:
  - **full**: Complete AI processing (bio, career, embeddings)
  - **career_only**: Extract career history only
  - **bio_only**: Generate biography only
  - **data_only**: No AI processing, just store
- **Duplicate Detection**: Checks existing candidates before creating
- **Duplicate Review Queue**: Flagged duplicates go to review queue
- **Background Processing**: Uses async jobs for large uploads
- **Progress Tracking**: Real-time progress bar
- **Upload History**: Track all bulk operations with success/failure counts

#### Company Bulk Upload:
- **CSV/XLSX Support**: Import company lists
- **AI Parsing**: Extract company info from uploaded data
- **Website Detection**: Auto-find company websites
- **Office Location Extraction**: AI extracts office locations from websites
- **Duplicate Detection**: Website domain-based duplicate checking
- **Background Intelligence**: Triggers company intelligence processing after upload

#### Upload History Table:
- Upload ID
- Type (candidates / companies)
- Status (processing / completed / failed)
- Records processed
- Success count
- Failure count
- Errors log
- Timestamp
- Action buttons (view details, retry failed)

---

### TAB 3: AI RESEARCH

**Purpose:** Intelligent company discovery using natural language

#### Features:
- **Natural Language Query Input**: 
  - Example: "Private equity firms in Hong Kong with portfolio companies in tech"
  - Example: "Series B SaaS companies in Singapore"
- **AI-Powered Search Strategy**: Grok generates targeted search queries
- **Search Execution**: Uses SerpAPI to execute searches
- **Result Parsing**: AI extracts company information from search results:
  - Company name
  - Website URL
  - Industry
  - Location
  - Employee size (estimated)
  - Brief description
- **Result Preview**: Shows discovered companies in table
- **Bulk Import**: Select and import discovered companies to database
- **Auto-Intelligence**: Triggers AI processing on imported companies

---

### TAB 4: DUPLICATE REVIEW

**Purpose:** Manual review of potential duplicate records

#### Features:
- **Duplicate Queue Table**:
  - Entity type (candidate / company)
  - Original record
  - Potential duplicate
  - Similarity score (AI-generated)
  - Matching fields (what matched: name, email, LinkedIn, website)
  - Flagged date
- **Side-by-Side Comparison**:
  - Shows both records in detail
  - Highlights matching vs. different fields
  - Displays confidence score
- **Resolution Actions**:
  - **Merge**: Combine records (keeps best data from both)
  - **Create New**: Not a duplicate, create as separate record
  - **Skip**: Ignore this potential duplicate
- **Bulk Actions**: Resolve multiple duplicates at once
- **Auto-Merge Threshold**: AI auto-merges high-confidence duplicates (>95%)

---

### TAB 5: DATA QUALITY

**Purpose:** Comprehensive AI-Powered Data Integrity System

#### Dashboard Overview (Phase 1 & 2 Complete):
- **Overall Quality Score**: 0-100 metric of database health
- **Issue Breakdown**:
  - Total Issues (clickable)
  - Critical (P0) - red
  - Important (P1) - orange
  - Enhancement (P2) - blue
- **AI Performance Metrics**:
  - Auto-Fixed issues count (clickable)
  - AI Success Rate (%)
  - Average confidence score
  - Historical performance chart
- **Manual Queue Status**:
  - Pending review count (clickable)
  - In progress count
  - SLA compliance tracking
- **Latest Audit Info**:
  - Last run timestamp
  - Execution time
  - Records scanned
- **Action Buttons**:
  - Run Manual Audit
  - Export CSV Report
  - Preview Email Report

#### Validation Rules (6 Rules):
1. **Candidate Company Links**: Ensures candidates with company names have proper FK relationships
2. **Career History Links**: Validates company links in career history JSONB arrays
3. **Duplicate Companies**: Detects potential duplicate company records
4. **Required Fields**: Checks for missing contact information
5. **Job Candidate Integrity**: Validates job-candidate FK relationships
6. **Company Data Quality**: Ensures companies have minimum required info

#### AI Remediation Engine (3-Layer Processing):

**Layer 1 - Detection**: Runs validation rules to identify issues

**Layer 2 - AI Auto-Fix**:
- **High Confidence (90%+)**: Auto-apply fixes
  - Company linking via fuzzy matching
  - Missing company creation and linking
  - Data normalization
- **Medium Confidence (70-90%)**: Apply with flag for review
  - Email inference using company patterns
  - Company data enrichment via web research
- **Low Confidence (<70%)**: Route to manual queue
  - Ambiguous matches
  - Missing data with no findable sources

**Layer 3 - Manual Queue**: Human intervention required
- Priority levels: P0 (4hr SLA), P1 (24hr SLA), P2 (7 day SLA)
- Shows AI suggestions with confidence scores
- Human can approve, reject, or modify AI suggestions

#### Interactive Drill-Down Dialogs:

**Total Issues Dialog** (clickable metric):
- Tabs: All / Pending / Resolved / Auto-Fixed
- Table shows:
  - Issue description
  - Entity type (candidate / company / job)
  - Entity link (clickable to navigate to record)
  - Severity (P0/P1/P2)
  - Status
  - Detected date
- Filter by status tabs
- Search issues

**AI Auto-Fixed Dialog** (clickable metric):
- Shows complete AI activity log
- For each fix:
  - Issue description
  - AI reasoning (why it made this decision)
  - Confidence score (e.g., 95%)
  - Data sources used (web research URLs, fuzzy match scores)
  - Applied changes (JSON diff of before/after)
  - Timestamp
- Allows rollback of AI fixes if needed

**Manual Queue Dialog** (clickable metric):
- Table of issues requiring human review
- Columns:
  - Issue description
  - Priority (P0/P1/P2 badges)
  - SLA deadline (countdown timer)
  - Entity link (navigate to affected record)
  - AI suggestion preview
  - Review button
- Click "Review & Resolve" opens nested dialog:
  - Full issue details
  - AI suggested action with confidence %
  - AI reasoning explanation
  - Applied data (JSON)
  - Resolution actions:
    - Approve AI Suggestion
    - Reject and Add Notes
    - Manual Fix (link to entity)
  - Resolution notes field (for feedback learning)

**AI Performance Dialog** (clickable metric):
- Historical success rate chart
- Confidence score distribution
- Fix type breakdown
- Quality improvement over time
- AI learning metrics

#### Database Schema (4 Tables):
1. **audit_runs**: Tracks each audit execution
   - Total issues, errors, warnings, info counts
   - Auto-fixed count
   - Flagged for review count
   - Manual queue count
   - Data quality score
   - Execution time
2. **audit_issues**: Individual data quality problems
   - Issue type, description, severity
   - Entity type, entity ID
   - Detected data (JSON)
   - Status (pending / resolved / auto_fixed)
3. **remediation_attempts**: AI fix attempts
   - Issue ID
   - Confidence score
   - Reasoning
   - Suggested action (JSON)
   - Outcome (success / failure / flagged)
   - Rollback capability
4. **manual_intervention_queue**: Human review queue
   - Issue ID
   - Priority (P0/P1/P2)
   - SLA deadline
   - Status (pending / in_progress / resolved)
   - Assigned to
   - Resolution notes

#### Reporting:
- **CSV Export**: Detailed audit report with all issues
- **HTML Email Report**: Stakeholder-friendly summary with metrics and charts
- **Manual Audit Trigger**: Run on-demand via UI or CLI script: `npx tsx scripts/run-audit.ts`

#### Metrics Tracked:
- Data Quality Score (0-100)
- AI Success Rate (%)
- Execution Time (ms)
- SLA Compliance (%)
- Issue Resolution Velocity
- AI Confidence Trends

---

### TAB 6: CUSTOM FIELDS

**Purpose:** Self-service custom field definition for Companies, Candidates, Jobs

#### Features:
- **Entity Type Selector**: Choose Companies / Candidates / Jobs
- **Section Management**:
  - Create sections to organize fields (e.g., "Financial Info", "Hiring Preferences")
  - Reorder sections via drag-and-drop
  - Edit section names
  - Delete sections (with confirmation)
- **Field Definitions Table**:
  - Lists all custom fields for selected entity type
  - Grouped by section
  - Shows: Field name, Type, Required flag, Section
- **Field Types** (10 types):
  - text (single line)
  - number (integer/decimal)
  - currency (formatted money)
  - date (date picker)
  - select (dropdown, single choice)
  - multi_select (dropdown, multiple choices)
  - checkbox (boolean)
  - url (validated URL)
  - email (validated email)
  - phone (validated phone number)
- **CRUD Operations**:
  - Add Field: Dialog with field name, type, section, required flag, options (for select types)
  - Edit Field: Modify field definition
  - Delete Field: Remove field (with confirmation - warns about data loss)
  - Reorder Fields: Drag-and-drop within section
- **Real-time Updates**: TanStack Query integration, instant UI refresh
- **Validation**: Ensures required fields, validates options for select types

#### Backend Architecture:
- **Database Schema**:
  - `custom_field_sections` table: Stores section definitions
  - `custom_field_definitions` table: Stores field definitions with type, validation rules
  - JSONB storage on entities: Custom field values stored as flexible JSON
- **REST API Endpoints**:
  - GET `/api/custom-fields/:entityType/sections` - List sections
  - POST `/api/custom-fields/:entityType/sections` - Create section
  - PATCH `/api/custom-fields/:entityType/sections/:id` - Update section
  - DELETE `/api/custom-fields/:entityType/sections/:id` - Delete section
  - GET `/api/custom-fields/:entityType/definitions` - List field definitions
  - POST `/api/custom-fields/:entityType/definitions` - Create field
  - PATCH `/api/custom-fields/:entityType/definitions/:id` - Update field
  - DELETE `/api/custom-fields/:entityType/definitions/:id` - Delete field

#### Usage in Forms:
- Custom fields automatically appear in entity edit dialogs
- Grouped by section for organization
- Type-specific input components (date picker, dropdowns, etc.)
- Validation enforced on required fields
- Values saved to JSONB column on entity

---

## TECHNICAL ARCHITECTURE

### Frontend Stack:
- **React 18** with TypeScript
- **Wouter** for routing
- **TanStack Query** for data fetching and caching
- **Radix UI + shadcn/ui** for components
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **@hello-pangea/dnd** for drag-and-drop

### Backend Stack:
- **Node.js** with Express.js
- **TypeScript** throughout
- **Drizzle ORM** for database
- **PostgreSQL** (Neon serverless)
- **Express Sessions** with PostgreSQL store

### AI Integration:
- **xAI Grok-2-1212**: Conversational AI, job parsing, candidate matching, data quality fixes
- **Voyage AI (voyage-2)**: Semantic embeddings for candidate profiles
- **PostgreSQL pgvector**: Native vector similarity search
- **SerpAPI**: LinkedIn profile discovery and search
- **Bright Data**: LinkedIn profile scraping

### Email Integration:
- **SendGrid**: Transactional email delivery (configured but not fully implemented)

### Background Jobs:
- **Async Processing**: Bulk uploads, AI intelligence processing
- **Job Queue**: Data ingestion jobs tracked in database

---

## KEY DESIGN PATTERNS

### Data Quality Philosophy:
- **Real Data Only**: No mock/placeholder data in production
- **AI Verification**: All scraped data verified before production
- **Soft Delete**: Recover deleted records via Recycling Bin
- **Duplicate Detection**: Proactive duplicate prevention

### User Experience:
- **Progressive Disclosure**: Show simple interface first, advanced features on demand
- **Optimistic Updates**: Instant UI feedback for better UX
- **Multi-View Support**: Different visualizations for different use cases
- **Contextual Actions**: Actions appear based on current selection/state

### AI Transparency:
- **Explainable AI**: Show reasoning for all AI decisions
- **Confidence Scores**: Display AI confidence levels
- **Human-in-the-Loop**: Manual review for low-confidence decisions
- **Rollback Capability**: Undo AI-applied changes

### Scalability:
- **Background Processing**: Heavy operations async
- **Caching Strategy**: TanStack Query for intelligent caching
- **Pagination**: Large lists paginated
- **Incremental Loading**: Load data as needed

---

## CURRENT STATUS

### Completed Features (Production-Ready):
✅ Dashboard with AI Recruiting Assistant  
✅ Companies Management with AI Intelligence  
✅ Candidates CRUD with AI Biography Generation  
✅ Jobs & 8-Stage ATS Pipeline  
✅ 4 Pipeline Views (List, Kanban, Timeline, Analytics)  
✅ Pipeline Filters and Search  
✅ CSV Export with Real Job Titles  
✅ Add Candidates Modal (Bulk Add)  
✅ Bulk Actions Toolbar (UI complete)  
✅ Recycling Bin with Soft Delete  
✅ Staging/Verification Layer  
✅ Conversations Management  
✅ Outreach Tracking  
✅ Admin Portal with 6 Tabs  
✅ Data Quality Dashboard (Phase 1 & 2)  
✅ Custom Fields Management  

### Known Issues:
⚠️ Bulk Actions Backend Bug: NaN error in storage layer when updating candidate status in bulk (UI functional, backend needs debugging)

### In Progress:
🔨 Task 3: AI Suggestion Engine (not started)  
🔨 Task 4: Final Integration & Bug Fixes  
🔨 Task 5: End-to-End Testing  

### Future Enhancements (Roadmap):
- Phase 3: AI Confidence Learning (improve from human feedback)
- Phase 4: Scheduled Audits with Email Alerts
- Phase 5: Anomaly Detection
- Market Intelligence for Proactive Outreach
- Advanced Analytics Dashboards
- Multi-language Support Expansion

---

## DATABASE SCHEMA HIGHLIGHTS

### Core Tables:
- **companies**: 30+ fields with JSONB for office locations and custom fields
- **candidates**: 40+ fields with soft delete, JSONB for career history and custom fields
- **jobs**: Job orders with parsed JD data and required skills
- **job_candidates**: Many-to-many with pipeline status, history, notes
- **staging_candidates**: Unverified candidate holding area
- **verification_results**: AI verification outcomes
- **conversations**: AI conversation history
- **custom_field_sections**: User-defined field sections
- **custom_field_definitions**: User-defined field definitions
- **audit_runs**: Data quality audit executions
- **audit_issues**: Identified data quality problems
- **remediation_attempts**: AI fix attempts
- **manual_intervention_queue**: Human review queue

### Key Features:
- **JSONB Columns**: Flexible schema for custom fields, career history, office locations
- **Soft Delete**: `deleted_at` timestamp on candidates
- **Audit Trails**: Status history, interaction history
- **Embeddings**: Vector columns for semantic search (pgvector)
- **Multi-Language**: Name transliteration support

---

## END OF DOCUMENT

**Last Updated:** November 5, 2025  
**Total Sections:** 9 (Dashboard, Companies, Candidates, Jobs/Pipeline, Recycling Bin, Staging, Conversations, Outreach, Admin Portal)  
**Implementation Status:** ~85% complete, production-ready core features with minor backend bug in bulk actions
