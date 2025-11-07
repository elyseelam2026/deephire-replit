import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, real, boolean, jsonb } from "drizzle-orm/pg-core";
import { vector } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Companies table - comprehensive company profiles
export const companies = pgTable("companies", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  
  // Basic Company Information (existing + enhanced)
  name: text("name").notNull(),
  legalName: text("legal_name"),
  tradingName: text("trading_name"), // DBA name
  parentCompany: text("parent_company"), // maintained for backward compatibility (text name)
  parentCompanyId: integer("parent_company_id"), // FK to parent company for hierarchy
  subsidiaries: text("subsidiaries").array(),
  companyType: text("company_type"), // corporation, llc, partnership, nonprofit
  stockSymbol: text("stock_symbol"),
  isPublic: boolean("is_public").default(false),
  isOfficeLocation: boolean("is_office_location").default(false), // true if this is a child office
  isHeadquarters: boolean("is_headquarters").default(true), // true if this is a parent/HQ company
  
  // Company Role in Recruitment Platform (NEW)
  companyRole: text("company_role").array().default(sql`ARRAY[]::text[]`), // ['client', 'sourcing', 'prospecting']
  // - 'client': Company hiring (has jobs) - client of the recruiting firm
  // - 'sourcing': Company where candidates work (talent pool to source from)
  // - 'prospecting': Company being researched for intelligence/future sourcing
  // NOTE: A company can have multiple roles (e.g., both 'client' and 'sourcing')
  
  // Contact & Location (existing + enhanced)
  location: text("location"), // maintained for backward compatibility
  website: text("website"),
  primaryPhone: text("primary_phone"),
  primaryEmail: text("primary_email"),
  headquarters: jsonb("headquarters"), // {street, city, state, country, postalCode}
  officeLocations: jsonb("office_locations"), // array of location objects
  operatesIn: text("operates_in").array(), // countries/regions
  
  // Registration
  companyRegistrationNumber: text("company_registration_number"),
  taxId: text("tax_id"),
  dunsNumber: text("duns_number"),
  
  // Business Information (existing + enhanced)
  industry: text("industry"), // maintained for backward compatibility
  subIndustry: text("sub_industry"),
  subsector: text("subsector"), // maintained for backward compatibility
  businessModel: text("business_model"), // b2b, b2c, b2b2c, marketplace
  targetMarket: text("target_market").array(),
  competitorCompanies: text("competitor_companies").array(),
  description: text("description"), // company overview/description
  
  // Size & Stage (existing + enhanced)
  employeeSize: integer("employee_size"), // maintained for backward compatibility
  employeeSizeRange: text("employee_size_range"), // 1-10, 11-50, 51-200, etc.
  annualRevenue: real("annual_revenue"),
  revenueRange: text("revenue_range"),
  stage: text("stage"), // maintained for backward compatibility
  companyStage: text("company_stage"), // startup, growth, mature, enterprise
  foundedYear: integer("founded_year"),
  
  // Funding & Financial
  fundingStage: text("funding_stage"), // pre-seed, seed, series_a, etc.
  totalFundingRaised: real("total_funding_raised"),
  lastFundingDate: timestamp("last_funding_date"),
  lastFundingAmount: real("last_funding_amount"),
  investors: text("investors").array(),
  valuation: real("valuation"),
  
  // Culture & Benefits
  missionStatement: text("mission_statement"),
  coreValues: text("core_values").array(),
  cultureKeywords: text("culture_keywords").array(),
  workLifeBalance: text("work_life_balance"), // excellent, good, demanding
  dresscode: text("dress_code"), // casual, business_casual, formal
  officeEnvironment: text("office_environment"), // open, cubicles, private_offices
  healthInsurance: boolean("health_insurance").default(false),
  dentalInsurance: boolean("dental_insurance").default(false),
  visionInsurance: boolean("vision_insurance").default(false),
  retirementPlan: text("retirement_plan"), // 401k, pension, none
  retirementMatching: text("retirement_matching"),
  paidTimeOff: text("paid_time_off"), // unlimited, 15_days, etc.
  parentalLeave: text("parental_leave"),
  flexibleSchedule: boolean("flexible_schedule").default(false),
  remoteWorkPolicy: text("remote_work_policy"), // no_remote, hybrid, fully_remote
  professionalDevelopment: text("professional_development"),
  tuitionReimbursement: boolean("tuition_reimbursement").default(false),
  gymMembership: boolean("gym_membership").default(false),
  stockOptions: boolean("stock_options").default(false),
  
  // Hiring Information
  typicalHiringTimeline: text("typical_hiring_timeline"), // 1_week, 2_weeks, 1_month
  interviewProcess: jsonb("interview_process"), // array of interview stages
  backgroundCheckRequired: boolean("background_check_required").default(false),
  drugTestRequired: boolean("drug_test_required").default(false),
  securityClearanceRequired: text("security_clearance_required"),
  visaSponsorshipAvailable: boolean("visa_sponsorship_available").default(false),
  salaryRanges: jsonb("salary_ranges"), // {role: {min, max, currency}}
  salaryReviewFrequency: text("salary_review_frequency"), // annually, bi_annually
  bonusStructure: text("bonus_structure"),
  equityOffered: boolean("equity_offered").default(false),
  salaryNegotiable: boolean("salary_negotiable").default(true),
  preferredEducationLevel: text("preferred_education_level"),
  preferredExperienceLevel: text("preferred_experience_level"),
  preferredSkills: text("preferred_skills").array(),
  preferredIndustryBackground: text("preferred_industry_background").array(),
  avoidCompanies: text("avoid_companies").array(), // competitors they don't want candidates from
  
  // Client Relationship Management
  clientTier: text("client_tier"), // premium, standard, basic
  accountManager: text("account_manager"),
  clientSince: timestamp("client_since"),
  contractStartDate: timestamp("contract_start_date"),
  contractEndDate: timestamp("contract_end_date"),
  contractValue: real("contract_value"),
  feeStructure: text("fee_structure"), // percentage, flat_fee, retainer
  primaryContactName: text("primary_contact_name"),
  primaryContactTitle: text("primary_contact_title"),
  primaryContactEmail: text("primary_contact_email"),
  primaryContactPhone: text("primary_contact_phone"),
  decisionMakers: jsonb("decision_makers"), // array of contact objects
  hrContacts: jsonb("hr_contacts"),
  totalJobsPosted: integer("total_jobs_posted").default(0),
  successfulPlacements: integer("successful_placements").default(0),
  averageTimeToHire: integer("average_time_to_hire"), // in days
  averageFeePerPlacement: real("average_fee_per_placement"),
  clientSatisfactionScore: real("client_satisfaction_score"), // 1-10
  
  // Compliance & Legal
  diversityCommitment: text("diversity_commitment"),
  eeocReporting: boolean("eeoc_reporting").default(false),
  diversityTargets: jsonb("diversity_targets"),
  gdprCompliant: boolean("gdpr_compliant").default(false),
  dataRetentionPolicy: text("data_retention_policy"),
  privacyPolicyUrl: text("privacy_policy_url"),
  industryCompliance: text("industry_compliance").array(), // HIPAA, SOX, etc.
  
  // Company Normalization & Matching (for AI-powered deduplication)
  normalizedAliases: text("normalized_aliases").array().default(sql`ARRAY[]::text[]`), // ["boyu-capital", "博裕资本", "boyu-capital-partners"]
  primaryDomain: text("primary_domain"), // Main website domain for matching (e.g., "boyucapital.com")
  
  // System fields (existing)
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`now()`).notNull(),
});

// Jobs table - job postings from client companies
export const jobs = pgTable("jobs", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  title: text("title").notNull(),
  department: text("department"),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  jdText: text("jd_text").notNull(), // original job description text
  parsedData: jsonb("parsed_data"), // AI-parsed structured data
  skills: text("skills").array(), // required skills array
  urgency: text("urgency"), // low, medium, high, urgent
  status: text("status").default("active").notNull(), // draft, active, paused, closed
  
  // NAP (Need Analysis Profile) - Consultative recruitment data
  needAnalysis: jsonb("need_analysis"), // Complete NAP responses from conversation
  searchStrategy: jsonb("search_strategy"), // AI-generated search plan with priorities
  searchExecutionStatus: text("search_execution_status").default("pending"), // pending, planning, executing, completed
  searchProgress: jsonb("search_progress"), // Real-time search progress tracking
  
  // Pricing & Fees
  searchTier: text("search_tier"), // 'internal' or 'external'
  feePercentage: real("fee_percentage"), // 15 for internal, 25 for external
  estimatedPlacementFee: real("estimated_placement_fee"), // calculated from salary range
  actualPlacementFee: real("actual_placement_fee"), // actual fee when candidate placed
  feeStatus: text("fee_status").default("pending"), // pending, invoiced, paid
  
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`now()`).notNull(),
});

// Job Candidates - Pipeline tracking for candidates matched to jobs
export const jobCandidates = pgTable("job_candidates", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  jobId: integer("job_id").references(() => jobs.id).notNull(),
  candidateId: integer("candidate_id").references(() => candidates.id).notNull(),
  
  // Pipeline status tracking
  status: text("status").notNull().default("recommended"), // recommended, reviewed, shortlisted, presented, interview, offer, placed, rejected
  statusHistory: jsonb("status_history").default(sql`'[]'::jsonb`), // Array of {status, changedAt, changedBy, note}
  
  // AI matching data
  matchScore: integer("match_score"), // 0-100 percentage
  aiReasoning: jsonb("ai_reasoning"), // Detailed match reasoning from AI
  searchTier: integer("search_tier"), // Which priority tier candidate was found in (1, 2, 3)
  
  // Recruiter notes & rejection tracking
  recruiterNotes: text("recruiter_notes"),
  rejectedReason: text("rejected_reason"), // Reason for rejection if status = rejected
  
  // Activity tracking
  lastActionAt: timestamp("last_action_at").default(sql`now()`), // Last time any action was taken
  
  // AI suggestions
  aiSuggestion: jsonb("ai_suggestion"), // AI-generated action recommendations {type, priority, message, suggestedAction}
  
  // Timestamps
  addedAt: timestamp("added_at").default(sql`now()`).notNull(),
  statusChangedAt: timestamp("status_changed_at").default(sql`now()`).notNull(),
});

// Candidates table - comprehensive candidate profiles
export const candidates = pgTable("candidates", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  
  // Core Identity & Contact - Multi-Language Support (Salesforce-style)
  // Native name (in original script)
  nativeName: text("native_name"), // e.g., "李嘉冕", "김민준", "田中太郎"
  nativeNameLocale: text("native_name_locale"), // ISO locale: zh-CN, ko-KR, ja-JP, ar-SA
  
  // Latin/Romanized name (ASCII-safe for systems)
  latinName: text("latin_name"), // e.g., "Jiamian Li", "Minjun Kim", "Taro Tanaka"
  transliterationMethod: text("transliteration_method"), // pinyin, manual, romaji, rr_romanization
  transliterationConfidence: real("transliteration_confidence"), // 0.0 - 1.0 quality score
  
  // Legacy fields (kept for backward compatibility)
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  middleName: text("middle_name"),
  preferredName: text("preferred_name"),
  
  // Email-safe name components (always ASCII)
  emailFirstName: text("email_first_name"), // Transliterated first name for email inference
  emailLastName: text("email_last_name"), // Transliterated last name for email inference
  
  // Display preferences
  displayName: text("display_name"), // Computed: nativeName || latinName || firstName + lastName
  nameOrderPreference: text("name_order_preference"), // family_first, given_first
  
  pronouns: text("pronouns"), // he/him, she/her, they/them, etc.
  email: text("email").unique(),
  phoneNumber: text("phone_number"),
  alternatePhone: text("alternate_phone"),
  preferredContactMethod: text("preferred_contact_method"), // email, phone, linkedin
  timeZone: text("time_zone"),
  linkedinUrl: text("linkedin_url"),
  bioUrl: text("bio_url"), // Original bio page URL (e.g., company bio page)
  portfolioUrl: text("portfolio_url"),
  githubUrl: text("github_url"),
  personalWebsite: text("personal_website"),
  
  // AI-Generated Profile Content
  biography: text("biography"), // Comprehensive biography generated from multiple sources
  bioStatus: text("bio_status").default("not_provided"), // not_provided, inferred, verified
  bioSource: text("bio_source"), // manual, linkedin_url, ai_placeholder
  bioLastVerifiedAt: timestamp("bio_last_verified_at"),
  bioVerifiedBy: text("bio_verified_by"), // user who verified
  careerSummary: text("career_summary"), // Structured career history summary
  emailStatus: text("email_status").default("inferred"), // inferred, verified
  emailSource: text("email_source").default("domain_pattern"), // domain_pattern, manual, verified
  
  // Address
  street: text("street"),
  city: text("city"),
  state: text("state"),
  postalCode: text("postal_code"),
  country: text("country"),
  location: text("location"), // maintained for backward compatibility
  
  // Professional Background (existing + enhanced)
  currentCompany: text("current_company"), // DEPRECATED: Use currentCompanyId instead
  currentCompanyId: integer("current_company_id").references(() => companies.id), // FK to companies table
  currentTitle: text("current_title"),
  currentDepartment: text("current_department"),
  currentIndustry: text("current_industry"),
  employmentType: text("employment_type"), // full-time, part-time, contract, freelance
  basicSalary: real("basic_salary"),
  salaryExpectations: real("salary_expectations"),
  salaryCurrency: text("salary_currency").default("USD"),
  equityExpectations: text("equity_expectations"),
  bonusStructure: text("bonus_structure"),
  
  // Experience (existing + enhanced)
  yearsExperience: integer("years_experience"), // total experience
  yearsInCurrentRole: integer("years_in_current_role"),
  yearsInIndustry: integer("years_in_industry"),
  managementExperience: integer("management_experience_years"),
  teamSizeManaged: integer("largest_team_size_managed"),
  budgetManaged: real("largest_budget_managed"),
  workHistory: jsonb("work_history"), // [{company, title, startDate, endDate, description, achievements}]
  
  // Career History - Structured timeline from LinkedIn with optional company linking
  careerHistory: jsonb("career_history").$type<Array<{
    company: string;              // Company name (always present)
    companyId?: number | null;    // Optional FK to companies table (null if no match)
    title: string;                // Job title
    startDate: string;            // Format: "YYYY-MM" or "YYYY"
    endDate?: string | null;      // Format: "YYYY-MM" or "YYYY", null if current
    description?: string;         // Role description/achievements
    location?: string;            // Work location
  }>>(),
  
  // Skills & Education (existing + enhanced)
  skills: text("skills").array(), // maintained for backward compatibility
  technicalSkills: jsonb("technical_skills"), // [{skill, proficiency, yearsUsed}]
  softSkills: text("soft_skills").array(),
  certifications: jsonb("certifications"), // [{name, issuer, dateObtained, expiryDate}]
  languages: jsonb("languages"), // [{language, proficiency}]
  education: jsonb("education"), // [{degree, institution, graduationYear, gpa, major}]
  highestDegree: text("highest_degree"), // high_school, associates, bachelors, masters, phd
  fieldOfStudy: text("field_of_study"),
  
  // Career Preferences & Availability
  preferredRoles: text("preferred_roles").array(),
  preferredIndustries: text("preferred_industries").array(),
  careerLevel: text("career_level"), // entry, junior, mid, senior, executive, c-level
  jobTypes: text("job_types").array(), // permanent, contract, part-time, internship
  workArrangement: text("work_arrangement"), // remote, hybrid, on-site, flexible
  willingToRelocate: boolean("willing_to_relocate").default(false),
  preferredLocations: text("preferred_locations").array(),
  travelWillingness: text("travel_willingness"), // none, occasional, frequent
  
  // Company Preferences
  preferredCompanySize: text("preferred_company_size"), // startup, small, medium, large, enterprise
  preferredCompanyStage: text("preferred_company_stage"), // seed, early, growth, mature
  culturePriorities: text("culture_priorities").array(),
  
  // Availability (existing + enhanced)
  isAvailable: boolean("is_available").default(true).notNull(),
  isActivelyLooking: boolean("is_actively_looking").default(false),
  isOpenToOpportunities: boolean("is_open_to_opportunities").default(true),
  noticePeriod: text("notice_period"), // immediate, 2weeks, 1month, 3months
  availableStartDate: timestamp("available_start_date"),
  lastActiveDate: timestamp("last_active_date"),
  
  // Legal & Compliance
  workAuthorizationStatus: text("work_authorization_status"), // citizen, permanent_resident, work_visa, needs_sponsorship
  visaType: text("visa_type"), // H1B, L1, etc.
  visaExpiryDate: timestamp("visa_expiry_date"),
  requiresSponsorship: boolean("requires_sponsorship").default(false),
  backgroundCheckStatus: text("background_check_status"), // not_started, in_progress, clear, issues
  drugTestStatus: text("drug_test_status"),
  securityClearance: text("security_clearance"), // none, secret, top_secret
  
  // Diversity & Inclusion (optional, anonymized)
  gender: text("gender"), // for diversity reporting
  ethnicity: text("ethnicity"), // for diversity reporting
  veteranStatus: text("veteran_status"),
  disabilityStatus: text("disability_status"),
  
  // Recruiting Metadata
  sourceChannel: text("source_channel"), // linkedin, referral, website, job_board
  sourceDetails: text("source_details"), // specific job board, referrer name
  recruiterNotes: text("recruiter_notes"),
  internalRating: integer("internal_rating"), // 1-10 recruiter assessment
  assessmentNotes: text("assessment_notes"),
  candidateStatus: text("candidate_status"), // new, contacted, interested, interviewing, offered, hired, rejected
  lastContactDate: timestamp("last_contact_date"),
  nextFollowUpDate: timestamp("next_follow_up_date"),
  engagementLevel: text("engagement_level"), // cold, warm, hot
  
  // References
  references: jsonb("references"), // [{name, title, company, phone, email, relationship}]
  referenceCheckStatus: text("reference_check_status"),
  
  // Privacy & Communication
  emailOptIn: boolean("email_opt_in").default(true),
  smsOptIn: boolean("sms_opt_in").default(false),
  marketingOptIn: boolean("marketing_opt_in").default(false),
  gdprConsent: boolean("gdpr_consent"),
  dataRetentionUntil: timestamp("data_retention_until"),
  
  // Verification & Data Quality (new - for production candidates)
  verificationStatus: text("verification_status").default("unverified"), // verified, unverified, needs_review
  confidenceScore: real("confidence_score"), // 0-1 score from verification
  verificationDate: timestamp("verification_date"),
  dataQualityScore: real("data_quality_score"), // Overall data completeness/quality (0-1)
  stagingCandidateId: integer("staging_candidate_id"), // Track origin from staging (no FK to avoid circular ref)
  
  // Processing Mode (controls what APIs are called during upload)
  processingMode: text("processing_mode").default("full"), // full, career_only, bio_only, data_only
  // - full: Career + Bio (SerpAPI + Bright Data + Grok) - High cost, complete profile
  // - career_only: Just career history (SerpAPI + Bright Data) - Medium cost, quick career mapping
  // - bio_only: Just biography (Bright Data + Grok) - Medium cost, executive summaries
  // - data_only: Store URLs only, no API calls - Free, bulk import for later processing
  
  // Custom Fields (Salesforce-style flexible fields)
  customFieldValues: jsonb("custom_field_values"), // {fieldId: value} - stores custom field data
  // Example: {"deal_experience": ["Buyout", "Growth"], "aum_managed": "$500M", "board_seats": 3}
  
  // Interaction History & Notes
  interactionHistory: jsonb("interaction_history"), // Array of interaction/note objects
  // Example: [{id: "note_123", type: "note", content: "Great candidate", createdAt: "2025-01-01T12:00:00Z"}]
  
  // Candidate Provenance & Sourcing (External Candidate Research)
  sourceType: text("source_type").default("manual"), // manual, linkedin_scrape, referral, company_research, external_search
  sourcingRunId: integer("sourcing_run_id"), // FK to sourcing_runs table (no formal constraint to avoid circular issues)
  externalSourceUrl: text("external_source_url"), // Original LinkedIn URL or web source
  scrapedAt: timestamp("scraped_at"), // When profile was fetched from external source
  scrapingMethod: text("scraping_method"), // brightdata, serpapi, manual
  
  // System fields (existing)
  cvText: text("cv_text"), // extracted CV text
  
  // Semantic Search - Vector Embeddings (xAI Grok)
  cvEmbedding: vector("cv_embedding", { dimensions: 1024 }), // Grok embedding for semantic search
  embeddingGeneratedAt: timestamp("embedding_generated_at"), // when embedding was last generated
  embeddingModel: text("embedding_model").default("grok-embedding"), // model used for embedding
  
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`now()`).notNull(),
  deletedAt: timestamp("deleted_at"), // Soft delete - null means active, timestamp means deleted
});

// Sourcing Runs - External candidate sourcing operations
export const sourcingRuns = pgTable("sourcing_runs", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  
  // Source context
  jobId: integer("job_id").references(() => jobs.id), // Optional: which job triggered this search
  conversationId: integer("conversation_id").references(() => napConversations.id), // Which chat conversation
  
  // Search parameters
  searchType: text("search_type").notNull(), // linkedin_people_search, company_research, reference_based
  searchQuery: jsonb("search_query"), // Search criteria: {title, location, keywords, company, etc.}
  searchIntent: text("search_intent"), // Human-readable description of what we're searching for
  searchRationale: text("search_rationale"), // AI's explanation of WHY these search criteria were chosen
  
  // Execution tracking
  status: text("status").default("queued").notNull(), // queued, searching, fetching_profiles, processing, completed, failed, cancelled
  progress: jsonb("progress").$type<{
    phase: string;              // Current phase: "searching" | "fetching" | "processing"
    profilesFound?: number;      // Total profiles discovered
    profilesFetched?: number;    // Profiles successfully fetched
    profilesProcessed?: number;  // Profiles parsed and added to DB
    candidatesCreated?: number;  // New candidates created
    candidatesDuplicate?: number;// Duplicates skipped
    currentBatch?: number;       // Current batch number
    totalBatches?: number;       // Total batches to process
    message?: string;            // Status message for UI
  }>(),
  
  // Results
  profileUrls: text("profile_urls").array(), // LinkedIn URLs discovered
  candidatesCreated: integer("candidates_created").array(), // IDs of candidates created
  errorLog: jsonb("error_log"), // Array of error objects
  
  // Costs & Quotas
  serpApiCalls: integer("serp_api_calls").default(0), // Number of SerpAPI calls made
  brightDataCalls: integer("bright_data_calls").default(0), // Number of Bright Data calls
  estimatedCost: real("estimated_cost"), // Estimated cost in USD
  
  // Timing
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  duration: integer("duration"), // Duration in seconds
  
  // Metadata
  triggeredBy: text("triggered_by"), // user_id or "system"
  priority: text("priority").default("normal"), // low, normal, high, urgent
  
  // System fields
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`now()`).notNull(),
});

// Custom Field Sections - Salesforce-style field grouping
export const customFieldSections = pgTable("custom_field_sections", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  
  // Section metadata
  name: text("name").notNull(), // e.g., "Current Compensation Information"
  label: text("label").notNull(), // Display name
  description: text("description"), // Help text for this section
  icon: text("icon"), // Lucide icon name
  
  // Organization
  entityType: text("entity_type").notNull().default("candidate"), // candidate, company, job
  orderIndex: integer("order_index").notNull().default(0), // Display order
  isCollapsible: boolean("is_collapsible").default(true),
  isCollapsedByDefault: boolean("is_collapsed_by_default").default(false),
  
  // Visibility & Access
  isActive: boolean("is_active").default(true),
  requiredRole: text("required_role"), // admin, recruiter, viewer - null means all
  
  // System tracking
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`now()`).notNull(),
});

// Custom Field Definitions - Salesforce-style field schema
export const customFieldDefinitions = pgTable("custom_field_definitions", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  
  // Field identity
  fieldKey: text("field_key").notNull().unique(), // e.g., "deal_experience", "aum_managed"
  label: text("label").notNull(), // Display label
  description: text("description"), // Help text
  
  // Field type and validation
  fieldType: text("field_type").notNull(), // text, number, currency, date, select, multi_select, checkbox, url, email, phone
  dataType: text("data_type"), // string, number, boolean, date for storage
  
  // Organization
  sectionId: integer("section_id").references(() => customFieldSections.id),
  entityType: text("entity_type").notNull().default("candidate"), // candidate, company, job
  orderIndex: integer("order_index").notNull().default(0),
  
  // Validation rules
  isRequired: boolean("is_required").default(false),
  validationRules: jsonb("validation_rules"), // {min, max, pattern, options: ["Buyout", "Growth"], etc}
  defaultValue: text("default_value"),
  
  // Display options
  placeholder: text("placeholder"),
  helpText: text("help_text"),
  isVisible: boolean("is_visible").default(true),
  isEditable: boolean("is_editable").default(true),
  
  // Picklist options (for select/multi-select fields)
  picklistOptions: jsonb("picklist_options"), // [{value: "buyout", label: "Buyout"}, ...]
  
  // Access control
  requiredRole: text("required_role"), // admin, recruiter, viewer - null means all can edit
  
  // System tracking
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`now()`).notNull(),
});

// Company Staging - AI-powered company deduplication and approval queue
export const companyStaging = pgTable("company_staging", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  
  // Raw data from candidate career history
  rawName: text("raw_name").notNull(), // Original company name as extracted (e.g., "博裕资本")
  rawLocation: text("raw_location"), // Location from career history (helps with matching)
  
  // AI-normalized data
  normalizedName: text("normalized_name").notNull(), // Slug version (e.g., "boyu-capital")
  preferredName: text("preferred_name"), // AI's suggested display name
  normalizedAliases: text("normalized_aliases").array().default(sql`ARRAY[]::text[]`), // Name variants
  detectedDomain: text("detected_domain"), // AI-extracted/guessed domain
  
  // Matching & confidence
  confidence: real("confidence").notNull().default(0), // 0-1 confidence score
  suggestedCompanyId: integer("suggested_company_id").references(() => companies.id), // AI's merge suggestion
  suggestedReason: text("suggested_reason"), // Why AI thinks it matches
  
  // AI metadata
  aiMetadata: jsonb("ai_metadata"), // Full AI response for audit
  
  // Status tracking
  status: text("status").notNull().default("pending"), // pending, approved, rejected, merged
  reviewedBy: text("reviewed_by"), // User who reviewed (if manual)
  reviewNote: text("review_note"), // Manual review notes
  
  // Source tracking (which candidate mentioned this company)
  sourceCandidateId: integer("source_candidate_id").references(() => candidates.id).notNull(),
  sourcePositionIndex: integer("source_position_index"), // Which position in career history
  
  // Timestamps
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
  processedAt: timestamp("processed_at"), // When AI processed it
  decidedAt: timestamp("decided_at"), // When final decision was made (auto or manual)
});

// Candidate-Company Junction - LinkedIn-style "who worked here" relationships
export const candidateCompanies = pgTable("candidate_companies", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  
  // References
  candidateId: integer("candidate_id").references(() => candidates.id).notNull(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  
  // Position details (from career history)
  title: text("title").notNull(), // Job title
  startDate: text("start_date"), // As text to handle various formats (e.g., "Mar 2021", "2021")
  endDate: text("end_date"), // null or "Present" for current positions
  location: text("location"), // Office location
  description: text("description"), // Job description/achievements
  
  // Metadata
  sourceType: text("source_type").notNull().default("candidate_career"), // candidate_career, manual, verified
  sourceId: integer("source_id"), // Reference to staging entry if auto-created
  confidence: real("confidence").default(1.0), // Confidence in the match (0-1)
  
  // Timestamps
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`now()`).notNull(),
});

// Job applications/matches - tracking candidate-job relationships
export const jobMatches = pgTable("job_matches", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  jobId: integer("job_id").references(() => jobs.id).notNull(),
  candidateId: integer("candidate_id").references(() => candidates.id).notNull(),
  matchScore: real("match_score"), // AI-calculated match percentage (0-100)
  status: text("status").default("matched").notNull(), // matched, applied, interviewing, rejected, hired
  appliedAt: timestamp("applied_at"),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

// NAP (Name-a-Person) conversations - AI chat sessions (ChatGPT-style recruiting assistant)
export const napConversations = pgTable("nap_conversations", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  
  // Optional job reference (created after JD upload or clarification complete)
  jobId: integer("job_id").references(() => jobs.id),
  
  // Optional candidate reference (for candidate-specific conversations)
  candidateId: integer("candidate_id").references(() => candidates.id),
  
  // Chat messages array - {role: 'user'|'assistant'|'system', content: string, timestamp: string}
  messages: jsonb("messages").$type<Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
    metadata?: {
      type?: 'jd_upload' | 'candidate_results' | 'clarification' | 'text';
      fileName?: string;
      candidateIds?: number[];
      searchQuery?: any;
    };
  }>>().default(sql`'[]'::jsonb`),
  
  // Search context - what the user is looking for
  searchContext: jsonb("search_context").$type<{
    title?: string;
    skills?: string[];
    location?: string;
    experience?: string;
    salary?: string;
    industry?: string;
    [key: string]: any;
  }>(),
  
  // Matched candidates from search
  matchedCandidates: jsonb("matched_candidates").$type<Array<{
    candidateId: number;
    matchScore: number;
    reasoning: string;
  }>>(),
  
  // JD file info if uploaded
  jdFileInfo: jsonb("jd_file_info").$type<{
    fileName: string;
    fileSize: number;
    uploadedAt: string;
    parsedData?: any;
  }>(),
  
  // Conversation status
  status: text("status").default("active").notNull(), // active, completed, archived
  phase: text("phase").default("initial").notNull(), // initial, clarifying, searching, results, completed
  
  // Timestamps
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`now()`).notNull(),
});

// Search Promises - Track AI commitments for automated execution
export const searchPromises = pgTable("search_promises", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  
  // Links to conversation and optional job
  conversationId: integer("conversation_id").references(() => napConversations.id).notNull(),
  jobId: integer("job_id").references(() => jobs.id), // Created after execution
  
  // Promise details
  promiseText: text("promise_text").notNull(), // What AI promised: "I'll send candidates in 72 hours"
  deliveryTimeframe: text("delivery_timeframe").notNull(), // "72 hours", "tomorrow", "next week"
  deadlineAt: timestamp("deadline_at").notNull(), // Calculated deadline
  
  // Search parameters extracted from conversation
  searchParams: jsonb("search_params").$type<{
    title?: string;
    skills?: string[];
    location?: string;
    yearsExperience?: string;
    industry?: string;
    salary?: string;
    urgency?: string;
    searchTier?: 'internal' | 'external';
    minCandidates?: number; // How many candidates promised
    [key: string]: any;
  }>().notNull(),
  
  // Execution tracking
  status: text("status").default("pending").notNull(), 
  // pending: Waiting for deadline
  // scheduled: Ready to execute
  // executing: Search in progress
  // completed: Candidates delivered
  // failed: Execution failed
  // cancelled: User cancelled
  
  executionStartedAt: timestamp("execution_started_at"),
  completedAt: timestamp("completed_at"),
  
  // Results
  candidatesFound: integer("candidates_found").default(0),
  candidateIds: integer("candidate_ids").array(), // IDs of matched candidates
  executionLog: jsonb("execution_log").$type<Array<{
    timestamp: string;
    event: string;
    details?: any;
  }>>(),
  
  // Notifications
  notificationSent: boolean("notification_sent").default(false),
  notificationSentAt: timestamp("notification_sent_at"),
  
  // Error tracking
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0),
  
  // Timestamps
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`now()`).notNull(),
});

// Email outreach tracking
export const emailOutreach = pgTable("email_outreach", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  candidateId: integer("candidate_id").references(() => candidates.id).notNull(),
  jobId: integer("job_id").references(() => jobs.id).notNull(),
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  status: text("status").default("sent").notNull(), // sent, opened, replied, bounced
  sentAt: timestamp("sent_at").default(sql`now()`).notNull(),
});

// Users table for authentication (clients, admins, candidates)
export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull(), // admin, client, candidate
  name: text("name").notNull(),
  companyId: integer("company_id").references(() => companies.id),
  candidateId: integer("candidate_id").references(() => candidates.id),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

// Data ingestion jobs - tracks bulk upload operations
export const dataIngestionJobs = pgTable("data_ingestion_jobs", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(), // csv, excel, html, pdf, etc.
  uploadedById: integer("uploaded_by_id").references(() => users.id),
  entityType: text("entity_type").notNull(), // candidate, company
  status: text("status").default("processing").notNull(), // processing, completed, failed, reviewing
  totalRecords: integer("total_records").default(0).notNull(),
  processedRecords: integer("processed_records").default(0).notNull(),
  successfulRecords: integer("successful_records").default(0).notNull(),
  duplicateRecords: integer("duplicate_records").default(0).notNull(),
  errorRecords: integer("error_records").default(0).notNull(),
  errorDetails: jsonb("error_details"), // array of error messages
  processingMethod: text("processing_method"), // structured, ai_fallback
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
  completedAt: timestamp("completed_at"),
});

// Duplicate detection results - tracks potential duplicates found during ingestion
export const duplicateDetections = pgTable("duplicate_detections", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  ingestionJobId: integer("ingestion_job_id").references(() => dataIngestionJobs.id),
  entityType: text("entity_type").notNull(), // candidate, company
  newRecordData: jsonb("new_record_data").notNull(), // incoming record data
  existingRecordId: integer("existing_record_id").notNull(), // ID in candidates or companies table
  matchScore: real("match_score").notNull(), // similarity score (0-100)
  matchedFields: text("matched_fields").array(), // which fields matched
  status: text("status").default("pending").notNull(), // pending, resolved_merge, resolved_new, resolved_skip
  resolution: text("resolution"), // merge, create_new, skip
  resolvedById: integer("resolved_by_id").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

// Data review queue - tracks records that need manual review
export const dataReviewQueue = pgTable("data_review_queue", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  ingestionJobId: integer("ingestion_job_id").references(() => dataIngestionJobs.id),
  entityType: text("entity_type").notNull(), // candidate, company
  recordData: jsonb("record_data").notNull(), // the record that needs review
  issueType: text("issue_type").notNull(), // duplicate, validation_error, incomplete_data
  issueDetails: text("issue_details"), // human-readable description
  priority: text("priority").default("medium").notNull(), // low, medium, high, urgent
  status: text("status").default("pending").notNull(), // pending, in_review, resolved
  assignedToId: integer("assigned_to_id").references(() => users.id),
  reviewedById: integer("reviewed_by_id").references(() => users.id),
  resolution: jsonb("resolution"), // admin's resolution decision
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
  reviewedAt: timestamp("reviewed_at"),
});

// ============================================================================
// AI-POWERED DATA QUALITY SYSTEM
// ============================================================================

// Audit Runs - tracks each scheduled data quality audit execution
export const auditRuns = pgTable("audit_runs", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  
  // Timing
  scheduledAt: timestamp("scheduled_at").default(sql`now()`).notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  
  // Status
  status: text("status").default("pending").notNull(), // pending, running, completed, failed
  
  // Results summary
  totalIssues: integer("total_issues").default(0).notNull(),
  errors: integer("errors").default(0).notNull(), // P0 - critical
  warnings: integer("warnings").default(0).notNull(), // P1 - important
  info: integer("info").default(0).notNull(), // P2 - nice to have
  
  // AI remediation stats
  autoFixed: integer("auto_fixed").default(0).notNull(), // Issues AI fixed automatically
  flaggedForReview: integer("flagged_for_review").default(0).notNull(), // Medium confidence fixes applied
  manualQueue: integer("manual_queue").default(0).notNull(), // Issues sent to manual queue
  
  // Quality metrics
  dataQualityScore: real("data_quality_score"), // 0-100 overall quality score
  improvementFromLast: real("improvement_from_last"), // +/- change from previous run
  
  // Output
  reportUrl: text("report_url"), // Link to downloadable CSV/PDF report
  errorMessage: text("error_message"), // If audit failed
  executionTimeMs: integer("execution_time_ms"), // How long the audit took
});

// Audit Issues - individual data quality problems discovered
export const auditIssues = pgTable("audit_issues", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  
  // Audit relationship
  auditRunId: integer("audit_run_id").references(() => auditRuns.id).notNull(),
  
  // Issue classification
  ruleName: text("rule_name").notNull(), // Which validation rule triggered
  severity: text("severity").notNull(), // error, warning, info
  priority: text("priority").notNull(), // P0, P1, P2
  issueType: text("issue_type").notNull(), // missing_link, duplicate, missing_data, orphaned_record
  
  // Affected entity
  entityType: text("entity_type").notNull(), // candidate, company, job, job_candidate
  entityId: integer("entity_id").notNull(), // Which record has the issue
  entityDescription: text("entity_description"), // Human-readable: "Candidate: John Smith"
  
  // Issue details
  description: text("description").notNull(), // Human-readable issue description
  suggestedFix: text("suggested_fix"), // What should be done to fix
  
  // Rich context for inline editing (NEW)
  metadata: jsonb("metadata"), // { fieldName, currentValue, expectedValue, businessImpact, editableFields }
  // Example: { 
  //   fieldName: "email", 
  //   currentValue: null, 
  //   expectedValue: "john.doe@company.com",
  //   businessImpact: "Prevents outreach and candidate engagement",
  //   editableFields: ["email", "phone"] 
  // }
  
  // Status tracking
  status: text("status").default("pending").notNull(), // pending, auto_fixed, queued, resolved, dismissed
  aiAttempted: boolean("ai_attempted").default(false).notNull(), // Did AI try to fix?
  
  // Resolution
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: text("resolved_by"), // ai_auto, ai_manual_approved, human
  resolutionNotes: text("resolution_notes"),
  
  // Timestamps
  detectedAt: timestamp("detected_at").default(sql`now()`).notNull(),
});

// Remediation Attempts - AI fix attempts with confidence scoring
export const remediationAttempts = pgTable("remediation_attempts", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  
  // Issue relationship
  issueId: integer("issue_id").references(() => auditIssues.id).notNull(),
  
  // AI model used
  aiModel: text("ai_model").notNull(), // grok-2-1212, voyage-2, rule-based
  attemptedAt: timestamp("attempted_at").default(sql`now()`).notNull(),
  
  // Proposed fix
  proposedFix: jsonb("proposed_fix").notNull(), // What AI suggests changing
  reasoning: text("reasoning").notNull(), // Why AI thinks this is the fix
  confidenceScore: real("confidence_score").notNull(), // 0-100 how confident AI is
  
  // Actions taken
  autoApplied: boolean("auto_applied").default(false).notNull(), // Was it applied automatically?
  outcome: text("outcome").notNull(), // success, failed, needs_review, applied_with_flag
  
  // Human feedback (for learning)
  humanFeedback: text("human_feedback"), // approved, rejected, modified
  feedbackNotes: text("feedback_notes"), // Why human approved/rejected
  learned: boolean("learned").default(false).notNull(), // Used for training data
  
  // Rollback capability
  beforeState: jsonb("before_state"), // Original data before fix
  afterState: jsonb("after_state"), // Data after fix
  rolledBack: boolean("rolled_back").default(false).notNull(),
  rollbackReason: text("rollback_reason"),
});

// Manual Intervention Queue - issues that need human review
export const manualInterventionQueue = pgTable("manual_intervention_queue", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  
  // Issue relationship
  issueId: integer("issue_id").references(() => auditIssues.id).notNull(),
  
  // Queue management
  priority: text("priority").notNull(), // P0, P1, P2
  status: text("status").default("pending").notNull(), // pending, in_progress, resolved, dismissed
  
  // Assignment
  assignedTo: text("assigned_to"), // Which researcher/admin
  queuedAt: timestamp("queued_at").default(sql`now()`).notNull(),
  
  // AI assistance
  aiSuggestions: jsonb("ai_suggestions"), // Array of options AI provides
  aiReasoning: text("ai_reasoning"), // Why AI couldn't auto-fix
  
  // Human resolution
  resolutionAction: jsonb("resolution_action"), // What human decided to do
  resolvedAt: timestamp("resolved_at"),
  timeToResolveMinutes: integer("time_to_resolve_minutes"), // For SLA metrics
  
  // Notes
  notes: text("notes"), // Human notes about the resolution
  
  // SLA tracking
  slaDeadline: timestamp("sla_deadline"), // When this must be resolved by
  slaMissed: boolean("sla_missed").default(false).notNull(),
});

// Relations
export const companiesRelations = relations(companies, ({ one, many }) => ({
  jobs: many(jobs),
  users: many(users),
  // Hierarchical relations
  parentCompany: one(companies, {
    fields: [companies.parentCompanyId],
    references: [companies.id],
    relationName: "companyHierarchy"
  }),
  childCompanies: many(companies, {
    relationName: "companyHierarchy"
  }),
}));

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  company: one(companies, {
    fields: [jobs.companyId],
    references: [companies.id],
  }),
  matches: many(jobMatches),
  napConversations: many(napConversations),
  emailOutreach: many(emailOutreach),
}));

export const candidatesRelations = relations(candidates, ({ many, one }) => ({
  matches: many(jobMatches),
  napConversations: many(napConversations),
  emailOutreach: many(emailOutreach),
  user: one(users, {
    fields: [candidates.id],
    references: [users.candidateId],
  }),
}));

export const jobMatchesRelations = relations(jobMatches, ({ one }) => ({
  job: one(jobs, {
    fields: [jobMatches.jobId],
    references: [jobs.id],
  }),
  candidate: one(candidates, {
    fields: [jobMatches.candidateId],
    references: [candidates.id],
  }),
}));

export const napConversationsRelations = relations(napConversations, ({ one }) => ({
  job: one(jobs, {
    fields: [napConversations.jobId],
    references: [jobs.id],
  }),
  candidate: one(candidates, {
    fields: [napConversations.candidateId],
    references: [candidates.id],
  }),
}));

export const emailOutreachRelations = relations(emailOutreach, ({ one }) => ({
  candidate: one(candidates, {
    fields: [emailOutreach.candidateId],
    references: [candidates.id],
  }),
  job: one(jobs, {
    fields: [emailOutreach.jobId],
    references: [jobs.id],
  }),
}));

export const dataIngestionJobsRelations = relations(dataIngestionJobs, ({ one, many }) => ({
  uploadedBy: one(users, {
    fields: [dataIngestionJobs.uploadedById],
    references: [users.id],
  }),
  duplicateDetections: many(duplicateDetections),
  reviewQueue: many(dataReviewQueue),
}));

export const duplicateDetectionsRelations = relations(duplicateDetections, ({ one }) => ({
  ingestionJob: one(dataIngestionJobs, {
    fields: [duplicateDetections.ingestionJobId],
    references: [dataIngestionJobs.id],
  }),
  resolvedBy: one(users, {
    fields: [duplicateDetections.resolvedById],
    references: [users.id],
  }),
}));

export const dataReviewQueueRelations = relations(dataReviewQueue, ({ one }) => ({
  ingestionJob: one(dataIngestionJobs, {
    fields: [dataReviewQueue.ingestionJobId],
    references: [dataIngestionJobs.id],
  }),
  assignedTo: one(users, {
    fields: [dataReviewQueue.assignedToId],
    references: [users.id],
  }),
  reviewedBy: one(users, {
    fields: [dataReviewQueue.reviewedById],
    references: [users.id],
  }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  company: one(companies, {
    fields: [users.companyId],
    references: [companies.id],
  }),
  candidate: one(candidates, {
    fields: [users.candidateId],
    references: [candidates.id],
  }),
  ingestionJobs: many(dataIngestionJobs),
  duplicateResolutions: many(duplicateDetections),
  assignedReviews: many(dataReviewQueue, { relationName: "assignedReviews" }),
  completedReviews: many(dataReviewQueue, { relationName: "completedReviews" }),
}));

// Insert schemas
export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
});

export const insertJobSchema = createInsertSchema(jobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertJobCandidateSchema = createInsertSchema(jobCandidates).omit({
  id: true,
  addedAt: true,
  statusChangedAt: true,
});

export const insertCandidateSchema = createInsertSchema(candidates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSourcingRunSchema = createInsertSchema(sourcingRuns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  startedAt: true,
  completedAt: true,
});

export const insertJobMatchSchema = createInsertSchema(jobMatches).omit({
  id: true,
  createdAt: true,
});

export const insertNapConversationSchema = createInsertSchema(napConversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmailOutreachSchema = createInsertSchema(emailOutreach).omit({
  id: true,
  sentAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertDataIngestionJobSchema = createInsertSchema(dataIngestionJobs).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertDuplicateDetectionSchema = createInsertSchema(duplicateDetections).omit({
  id: true,
  createdAt: true,
  resolvedAt: true,
});

export const insertDataReviewQueueSchema = createInsertSchema(dataReviewQueue).omit({
  id: true,
  createdAt: true,
  reviewedAt: true,
});

export const insertCompanyStagingSchema = createInsertSchema(companyStaging).omit({
  id: true,
  createdAt: true,
  processedAt: true,
  decidedAt: true,
});

export const insertCandidateCompanySchema = createInsertSchema(candidateCompanies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Staging Candidates - unverified scraped data (ChatGPT's "Raw/Staging Database")
export const stagingCandidates = pgTable("staging_candidates", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  
  // Basic Information (minimal data from scraping)
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  fullName: text("full_name").notNull(), // as scraped
  currentTitle: text("current_title"),
  currentCompany: text("current_company"),
  
  // Discovered URLs
  bioUrl: text("bio_url"), // Company bio page
  linkedinUrl: text("linkedin_url"), // If found during scraping
  
  // Source Tracking
  sourceUrl: text("source_url").notNull(), // Where we found them
  sourceType: text("source_type").notNull(), // team_discovery, bio_upload, quick_add
  companyId: integer("company_id").references(() => companies.id), // Associated company
  
  // Verification Status
  verificationStatus: text("verification_status").default("pending").notNull(), 
  // pending, verified, rejected, needs_review
  
  confidenceScore: real("confidence_score"), // 0-1 overall confidence
  
  // Timestamps
  scrapedAt: timestamp("scraped_at").default(sql`now()`).notNull(),
  verifiedAt: timestamp("verified_at"),
  movedToProductionAt: timestamp("moved_to_production_at"),
  productionCandidateId: integer("production_candidate_id").references(() => candidates.id),
});

// Verification Results - tracks all verification checks (ChatGPT's "Verification Layer")
export const verificationResults = pgTable("verification_results", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  stagingCandidateId: integer("staging_candidate_id")
    .references(() => stagingCandidates.id, { onDelete: 'cascade' })
    .notNull()
    .unique(), // Ensure one verification result per staging candidate
  
  // Individual Check Results
  linkedinExists: boolean("linkedin_exists").default(false),
  linkedinCompanyMatch: boolean("linkedin_company_match").default(false),
  linkedinCurrentRole: boolean("linkedin_current_role").default(false),
  linkedinUrl: text("linkedin_url"), // Found LinkedIn URL
  
  bioUrlValid: boolean("bio_url_valid").default(false),
  bioUrlHttpStatus: integer("bio_url_http_status"),
  
  titleConsistent: boolean("title_consistent").default(false),
  titleFromLinkedIn: text("title_from_linkedin"),
  titleFromBio: text("title_from_bio"),
  titleFromSource: text("title_from_source"),
  titleSimilarityScore: real("title_similarity_score"), // 0-1
  
  webMentionsFound: boolean("web_mentions_found").default(false),
  webMentionCount: integer("web_mention_count").default(0),
  
  emailPatternMatch: boolean("email_pattern_match").default(false),
  inferredEmail: text("inferred_email"),
  
  isDuplicate: boolean("is_duplicate").default(false),
  duplicateOfCandidateId: integer("duplicate_of_candidate_id")
    .references(() => candidates.id, { onDelete: 'set null' }),
  duplicateMatchScore: real("duplicate_match_score"), // How similar to duplicate
  
  // Employment Status Check
  employmentStatus: text("employment_status"), // current, former, unknown
  employmentStatusSource: text("employment_status_source"), // linkedin, bio, web_search
  
  // Overall Assessment
  confidenceScore: real("confidence_score").notNull(), // 0-1 calculated score
  recommendedAction: text("recommended_action").notNull(), // approve, review, reject
  flags: text("flags").array(), // Array of warning/issue messages
  
  // AI Reasoning (for transparency)
  aiReasoning: text("ai_reasoning"), // Why this confidence score?
  
  // Verification Metadata
  verificationMethod: text("verification_method").default("automated"), // automated, manual, hybrid
  verifiedBy: text("verified_by"), // AI or user ID
  verifiedAt: timestamp("verified_at").default(sql`now()`).notNull(),
});

// Add verification fields to existing candidates table (for production data quality tracking)
// Note: These will be added via migration, documenting here for reference
// - verificationStatus: text // verified, unverified, needs_review
// - confidenceScore: real // 0-1 score from verification
// - verificationDate: timestamp
// - dataQualityScore: real // Overall data completeness/quality

// Career History TypeScript type for strong typing
export type CareerHistoryEntry = {
  company: string;              // Company name (always present)
  companyId?: number | null;    // Optional FK to companies table (null if no match)
  title: string;                // Job title
  startDate: string;            // Format: "YYYY-MM" or "YYYY"
  endDate?: string | null;      // Format: "YYYY-MM" or "YYYY", null if current
  description?: string;         // Role description/achievements
  location?: string;            // Work location
};

// Career Transitions - Track company-to-company movement patterns
export const careerTransitions = pgTable("career_transitions", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  fromCompany: text("from_company").notNull(),
  fromCompanyId: integer("from_company_id"), // FK to companies
  toCompany: text("to_company").notNull(),
  toCompanyId: integer("to_company_id"), // FK to companies
  fromTitle: text("from_title"),
  toTitle: text("to_title"),
  frequency: integer("frequency").default(1), // How many times this transition occurred
  avgYearsAtFromCompany: real("avg_years_at_from_company"),
  commonIndustry: text("common_industry"),
  lastObserved: timestamp("last_observed").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Company Hiring Patterns - Learned preferences from career analysis
export const companyHiringPatterns = pgTable("company_hiring_patterns", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  companyName: text("company_name").notNull(),
  
  // Preferred source companies (where they hire FROM)
  preferredSourceCompanies: jsonb("preferred_source_companies").$type<Array<{
    company: string;
    companyId?: number;
    frequency: number;      // How many people came from this company
    percentage: number;     // % of total hires
    avgYearsExperience: number;
    commonTitles: string[]; // Titles they hired for this company
  }>>(),
  
  // Career path patterns
  commonCareerPaths: jsonb("common_career_paths").$type<Array<{
    path: string;           // "Goldman Analyst → Blackstone Associate → PAG VP"
    frequency: number;
    percentage: number;
    avgTimelineYears: number;
  }>>(),
  
  // Title patterns
  preferredTitles: text("preferred_titles").array(),
  preferredSeniority: text("preferred_seniority").array(), // Analyst, Associate, VP, Director
  
  // Education patterns
  preferredEducation: jsonb("preferred_education").$type<Array<{
    degree: string;         // "MBA", "BA Economics"
    institution: string;    // "Wharton", "Harvard"
    frequency: number;
    percentage: number;
  }>>(),
  
  // Experience patterns
  avgYearsExperience: real("avg_years_experience"),
  minYearsExperience: integer("min_years_experience"),
  maxYearsExperience: integer("max_years_experience"),
  
  // Industry patterns
  preferredIndustries: text("preferred_industries").array(),
  
  // Skills patterns
  topSkills: jsonb("top_skills").$type<Array<{
    skill: string;
    frequency: number;
    percentage: number;
  }>>(),
  
  // Metadata
  sampleSize: integer("sample_size").notNull(), // Number of candidates analyzed
  confidenceScore: real("confidence_score"), // 0-1, based on sample size
  lastAnalyzed: timestamp("last_analyzed").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Career Path Insights - Discovered industry-wide patterns
export const careerPathInsights = pgTable("career_path_insights", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  pathPattern: text("path_pattern").notNull(), // "Investment Banking → Private Equity"
  specificPath: text("specific_path"), // "Goldman IB Analyst → Blackstone PE Associate"
  frequency: integer("frequency").default(1),
  
  // Path details
  avgPathDuration: real("avg_path_duration_years"),
  successRate: real("success_rate"), // % who successfully made this transition
  
  // Common characteristics
  commonTitles: text("common_titles").array(),
  commonCompanies: text("common_companies").array(),
  commonEducation: text("common_education").array(),
  commonSkills: text("common_skills").array(),
  
  // Industry/role info
  sourceIndustry: text("source_industry"),
  targetIndustry: text("target_industry"),
  sourceRole: text("source_role"),
  targetRole: text("target_role"),
  
  // Metadata
  sampleSize: integer("sample_size").notNull(),
  confidenceScore: real("confidence_score"),
  lastUpdated: timestamp("last_updated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Organization Chart - Maps people to companies with their roles
export const organizationChart = pgTable("organization_chart", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  candidateId: integer("candidate_id").references(() => candidates.id), // null if person not yet in candidates table
  
  // Person info (stored here until moved to candidates table)
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  fullName: text("full_name"),
  
  // Role information
  title: text("title").notNull(), // CEO, CFO, COO, VP Engineering, etc.
  department: text("department"), // Executive, Engineering, Sales, Finance, etc.
  level: text("level"), // C-Suite, VP, Director, Manager, Individual Contributor
  isCLevel: boolean("is_c_level").default(false),
  isExecutive: boolean("is_executive").default(false),
  
  // Reporting structure
  reportsToId: integer("reports_to_id"), // FK to another org_chart entry (their manager)
  
  // Discovery metadata
  discoveredFrom: text("discovered_from"), // team_page, linkedin, news, manual
  discoveryDate: timestamp("discovery_date").defaultNow(),
  lastVerified: timestamp("last_verified"),
  isActive: boolean("is_active").default(true), // false if person left the company
  
  // Contact info (if available)
  linkedinUrl: text("linkedin_url"),
  bioUrl: text("bio_url"),
  email: text("email"),
  
  // Timestamps
  startDate: text("start_date"), // When they joined this role
  endDate: text("end_date"), // null if current
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Company Intelligence Tags - Multi-dimensional categorization
export const companyTags = pgTable("company_tags", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  companyId: integer("company_id").references(() => companies.id).notNull().unique(),
  companyName: text("company_name"), // Cached for quick reference
  
  // Auto-categorization dimensions (from website scraping)
  industryTags: text("industry_tags").array(), // ["Private Equity", "Financial Services", "Investment"]
  stageTags: text("stage_tags").array(), // ["Growth", "Mature", "Enterprise"]
  fundingTags: text("funding_tags").array(), // ["Series C", "Well-Funded", "Venture-Backed"]
  geographyTags: text("geography_tags").array(), // ["US", "New York", "Multi-National"]
  sizeTags: text("size_tags").array(), // ["200-500", "Mid-Size", "Scaling"]
  
  // Learned insights (from org chart analysis - NOT from website scraping)
  companyType: text("company_type"), // "Top-tier PE Firm", "Bulge Bracket Bank", "Tech Unicorn"
  competitorSet: text("competitor_set").array(), // Similar companies
  talentSource: text("talent_source"), // "Hires from Goldman, Blackstone, KKR" - learned from org chart
  talentDestination: text("talent_destination"), // "Alumni go to PAG, Carlyle" - learned from career transitions
  
  // Culture insights (from recruiter/candidate conversations - added manually)
  cultureNotes: text("culture_notes"), // Free-form text from meetings/conversations
  cultureInsights: jsonb("culture_insights").$type<Array<{
    insight: string;           // "Very competitive environment"
    source: string;            // "Candidate interview - Sarah J"
    date: string;             // When this was learned
    recruiterName?: string;   // Who learned this
  }>>(),
  
  // Metadata
  confidence: real("confidence"), // 0-1, how confident we are in these tags
  lastAnalyzed: timestamp("last_analyzed").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Industry Campaigns - Track systematic industry mapping efforts
export const industryCampaigns = pgTable("industry_campaigns", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  
  // Campaign Details
  name: text("name").notNull(), // "Private Equity Mapping 2025"
  industry: text("industry").notNull(), // "Private Equity", "Venture Capital", etc.
  description: text("description"),
  
  // Targets & Progress
  targetCompanies: integer("target_companies"), // Goal: 500 companies
  companiesDiscovered: integer("companies_discovered").default(0), // Current: 342
  companiesProcessed: integer("companies_processed").default(0), // Companies with teams discovered
  teamMembersFound: integer("team_members_found").default(0), // Total people discovered
  candidatesCreated: integer("candidates_created").default(0), // Promoted to candidate table
  
  // Geographic Focus
  primaryGeography: text("primary_geography"), // "Global", "US", "Europe", etc.
  geographyTags: text("geography_tags").array(),
  
  // Intelligence Metrics
  hiringPatternsLearned: integer("hiring_patterns_learned").default(0),
  careerPathsMapped: integer("career_paths_mapped").default(0),
  orgChartsBuilt: integer("org_charts_built").default(0),
  
  // Status Tracking
  status: text("status").notNull().default("planning"), // planning, active, paused, completed
  priority: text("priority").default("medium"), // high, medium, low
  
  // Ownership
  ownerId: integer("owner_id"), // User who created/owns this campaign
  assignedTo: text("assigned_to").array(), // Team members working on this
  
  // Research Strategy
  researchQueries: text("research_queries").array(), // Queries used to find companies
  dataSources: text("data_sources").array(), // "Forbes", "PitchBook", "Crunchbase", etc.
  
  // Insights & Notes
  keyInsights: jsonb("key_insights").$type<Array<{
    insight: string;
    discoveredAt: string;
    significance: string;
  }>>(),
  notes: text("notes"),
  
  // Timestamps
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  lastActivityAt: timestamp("last_activity_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Company Research Results - Cache for AI-powered company research
export const companyResearchResults = pgTable("company_research_results", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  
  // Research Query
  originalQuery: text("original_query").notNull(), // "top 100 private equity firms"
  normalizedQuery: text("normalized_query").notNull(), // Standardized version for deduplication
  
  // Research Strategy
  searchQueries: text("search_queries").array(), // Multiple search queries used
  dataSources: text("data_sources").array(), // Sources consulted
  
  // Results
  companiesFound: jsonb("companies_found").notNull().$type<Array<{
    name: string;
    website?: string;
    industry?: string;
    size?: string;
    geography?: string;
    description?: string;
    linkedinUrl?: string;
    confidence: number; // 0-1, how confident we are this is correct
    sources: string[]; // Which searches found this company
  }>>(),
  
  totalResults: integer("total_results").notNull(),
  
  // Quality Metrics
  averageConfidence: real("average_confidence"), // Average confidence across all results
  duplicatesRemoved: integer("duplicates_removed").default(0),
  validationsPassed: integer("validations_passed").default(0),
  
  // Associated Campaign
  campaignId: integer("campaign_id").references(() => industryCampaigns.id),
  
  // Cache Status
  status: text("status").notNull().default("completed"), // pending, completed, failed
  isStale: boolean("is_stale").default(false), // True if older than 30 days
  
  // Metadata
  researchDurationMs: integer("research_duration_ms"), // How long research took
  apiCallsMade: integer("api_calls_made"), // Number of API calls used
  costEstimate: real("cost_estimate"), // Estimated cost in USD
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"), // When to consider this cache stale
});

// Zod schemas for new tables
export const insertCareerTransitionSchema = createInsertSchema(careerTransitions).omit({
  id: true,
  lastObserved: true,
  createdAt: true,
});

export const insertCompanyHiringPatternSchema = createInsertSchema(companyHiringPatterns).omit({
  id: true,
  lastAnalyzed: true,
  createdAt: true,
});

export const insertCareerPathInsightSchema = createInsertSchema(careerPathInsights).omit({
  id: true,
  lastUpdated: true,
  createdAt: true,
});

export const insertOrganizationChartSchema = createInsertSchema(organizationChart).omit({
  id: true,
  discoveryDate: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCompanyTagsSchema = createInsertSchema(companyTags).omit({
  id: true,
  lastAnalyzed: true,
  createdAt: true,
  updatedAt: true,
});

// Type exports
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companies.$inferSelect;

export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobs.$inferSelect;

export type InsertJobCandidate = z.infer<typeof insertJobCandidateSchema>;
export type JobCandidate = typeof jobCandidates.$inferSelect;

export type InsertCandidate = z.infer<typeof insertCandidateSchema>;
export type Candidate = typeof candidates.$inferSelect;

export type InsertSourcingRun = z.infer<typeof insertSourcingRunSchema>;
export type SourcingRun = typeof sourcingRuns.$inferSelect;

export type InsertJobMatch = z.infer<typeof insertJobMatchSchema>;
export type JobMatch = typeof jobMatches.$inferSelect;

export type InsertNapConversation = z.infer<typeof insertNapConversationSchema>;
export type NapConversation = typeof napConversations.$inferSelect;

export const insertSearchPromiseSchema = createInsertSchema(searchPromises).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type InsertSearchPromise = z.infer<typeof insertSearchPromiseSchema>;
export type SearchPromise = typeof searchPromises.$inferSelect;

export type InsertEmailOutreach = z.infer<typeof insertEmailOutreachSchema>;
export type EmailOutreach = typeof emailOutreach.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertDataIngestionJob = z.infer<typeof insertDataIngestionJobSchema>;
export type DataIngestionJob = typeof dataIngestionJobs.$inferSelect;

export type InsertDuplicateDetection = z.infer<typeof insertDuplicateDetectionSchema>;
export type DuplicateDetection = typeof duplicateDetections.$inferSelect;

export type InsertDataReviewQueue = z.infer<typeof insertDataReviewQueueSchema>;
export type DataReviewQueue = typeof dataReviewQueue.$inferSelect;

export type InsertCompanyStaging = z.infer<typeof insertCompanyStagingSchema>;
export type CompanyStaging = typeof companyStaging.$inferSelect;

export type InsertCandidateCompany = z.infer<typeof insertCandidateCompanySchema>;
export type CandidateCompany = typeof candidateCompanies.$inferSelect;

// Staging Candidates schemas
export const insertStagingCandidateSchema = createInsertSchema(stagingCandidates).omit({
  id: true,
  scrapedAt: true,
  verifiedAt: true,
  movedToProductionAt: true,
});
export type InsertStagingCandidate = z.infer<typeof insertStagingCandidateSchema>;
export type StagingCandidate = typeof stagingCandidates.$inferSelect;

// Verification Results schemas
export const insertVerificationResultSchema = createInsertSchema(verificationResults).omit({
  id: true,
  verifiedAt: true,
});
export type InsertVerificationResult = z.infer<typeof insertVerificationResultSchema>;
export type VerificationResult = typeof verificationResults.$inferSelect;

// Career learning schemas
export type InsertCareerTransition = z.infer<typeof insertCareerTransitionSchema>;
export type CareerTransition = typeof careerTransitions.$inferSelect;

export type InsertCompanyHiringPattern = z.infer<typeof insertCompanyHiringPatternSchema>;
export type CompanyHiringPattern = typeof companyHiringPatterns.$inferSelect;

export type InsertCareerPathInsight = z.infer<typeof insertCareerPathInsightSchema>;
export type CareerPathInsight = typeof careerPathInsights.$inferSelect;

export type InsertOrganizationChart = z.infer<typeof insertOrganizationChartSchema>;
export type OrganizationChart = typeof organizationChart.$inferSelect;

export type InsertCompanyTags = z.infer<typeof insertCompanyTagsSchema>;
export type CompanyTags = typeof companyTags.$inferSelect;

// Industry Campaigns schemas
export const insertIndustryCampaignSchema = createInsertSchema(industryCampaigns).omit({
  id: true,
  companiesDiscovered: true,
  companiesProcessed: true,
  teamMembersFound: true,
  candidatesCreated: true,
  hiringPatternsLearned: true,
  careerPathsMapped: true,
  orgChartsBuilt: true,
  lastActivityAt: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertIndustryCampaign = z.infer<typeof insertIndustryCampaignSchema>;
export type IndustryCampaign = typeof industryCampaigns.$inferSelect;

// Company Research Results schemas
export const insertCompanyResearchResultSchema = createInsertSchema(companyResearchResults).omit({
  id: true,
  createdAt: true,
});
export type InsertCompanyResearchResult = z.infer<typeof insertCompanyResearchResultSchema>;
export type CompanyResearchResult = typeof companyResearchResults.$inferSelect;

// Custom Field Sections schemas
export const insertCustomFieldSectionSchema = createInsertSchema(customFieldSections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCustomFieldSection = z.infer<typeof insertCustomFieldSectionSchema>;
export type CustomFieldSection = typeof customFieldSections.$inferSelect;

// Custom Field Definitions schemas
export const insertCustomFieldDefinitionSchema = createInsertSchema(customFieldDefinitions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCustomFieldDefinition = z.infer<typeof insertCustomFieldDefinitionSchema>;
export type CustomFieldDefinition = typeof customFieldDefinitions.$inferSelect;

// Audit System schemas
export const insertAuditRunSchema = createInsertSchema(auditRuns).omit({
  id: true,
  scheduledAt: true,
});
export type InsertAuditRun = z.infer<typeof insertAuditRunSchema>;
export type AuditRun = typeof auditRuns.$inferSelect;

export const insertAuditIssueSchema = createInsertSchema(auditIssues).omit({
  id: true,
  detectedAt: true,
});
export type InsertAuditIssue = z.infer<typeof insertAuditIssueSchema>;
export type AuditIssue = typeof auditIssues.$inferSelect;

export const insertRemediationAttemptSchema = createInsertSchema(remediationAttempts).omit({
  id: true,
  attemptedAt: true,
});
export type InsertRemediationAttempt = z.infer<typeof insertRemediationAttemptSchema>;
export type RemediationAttempt = typeof remediationAttempts.$inferSelect;

export const insertManualInterventionQueueSchema = createInsertSchema(manualInterventionQueue).omit({
  id: true,
  queuedAt: true,
});
export type InsertManualInterventionQueue = z.infer<typeof insertManualInterventionQueueSchema>;
export type ManualInterventionQueue = typeof manualInterventionQueue.$inferSelect;