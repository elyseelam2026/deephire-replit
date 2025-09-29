import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, real, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Companies table - comprehensive company profiles
export const companies = pgTable("companies", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  
  // Basic Company Information (existing + enhanced)
  name: text("name").notNull(),
  legalName: text("legal_name"),
  tradingName: text("trading_name"), // DBA name
  parentCompany: text("parent_company"),
  subsidiaries: text("subsidiaries").array(),
  companyType: text("company_type"), // corporation, llc, partnership, nonprofit
  stockSymbol: text("stock_symbol"),
  isPublic: boolean("is_public").default(false),
  
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
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`now()`).notNull(),
});

// Candidates table - comprehensive candidate profiles
export const candidates = pgTable("candidates", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  
  // Core Identity & Contact (existing + enhanced)
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  middleName: text("middle_name"),
  preferredName: text("preferred_name"),
  pronouns: text("pronouns"), // he/him, she/her, they/them, etc.
  email: text("email").notNull().unique(),
  phoneNumber: text("phone_number"),
  alternatePhone: text("alternate_phone"),
  preferredContactMethod: text("preferred_contact_method"), // email, phone, linkedin
  timeZone: text("time_zone"),
  linkedinUrl: text("linkedin_url"),
  portfolioUrl: text("portfolio_url"),
  githubUrl: text("github_url"),
  personalWebsite: text("personal_website"),
  
  // Address
  street: text("street"),
  city: text("city"),
  state: text("state"),
  postalCode: text("postal_code"),
  country: text("country"),
  location: text("location"), // maintained for backward compatibility
  
  // Professional Background (existing + enhanced)
  currentCompany: text("current_company"),
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
  
  // System fields (existing)
  cvText: text("cv_text"), // extracted CV text
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

// NAP (Name-a-Person) conversations - AI chat sessions
export const napConversations = pgTable("nap_conversations", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  jobId: integer("job_id").references(() => jobs.id).notNull(),
  candidateId: integer("candidate_id").references(() => candidates.id),
  messages: jsonb("messages"), // array of chat messages
  status: text("status").default("active").notNull(), // active, completed, archived
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

// Relations
export const companiesRelations = relations(companies, ({ many }) => ({
  jobs: many(jobs),
  users: many(users),
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

export const insertCandidateSchema = createInsertSchema(candidates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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

// Type exports
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companies.$inferSelect;

export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobs.$inferSelect;

export type InsertCandidate = z.infer<typeof insertCandidateSchema>;
export type Candidate = typeof candidates.$inferSelect;

export type InsertJobMatch = z.infer<typeof insertJobMatchSchema>;
export type JobMatch = typeof jobMatches.$inferSelect;

export type InsertNapConversation = z.infer<typeof insertNapConversationSchema>;
export type NapConversation = typeof napConversations.$inferSelect;

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