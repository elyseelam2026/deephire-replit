import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, real, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Companies table - stores client companies and candidate current companies
export const companies = pgTable("companies", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  name: text("name").notNull(),
  parentCompany: text("parent_company"),
  location: text("location"),
  industry: text("industry"),
  employeeSize: integer("employee_size"),
  subsector: text("subsector"),
  stage: text("stage"), // startup, growth, enterprise, etc.
  createdAt: timestamp("created_at").default(sql`now()`).notNull(),
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

// Candidates table - candidate profiles
export const candidates = pgTable("candidates", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  currentCompany: text("current_company"),
  currentTitle: text("current_title"),
  basicSalary: real("basic_salary"),
  salaryExpectations: real("salary_expectations"),
  linkedinUrl: text("linkedin_url"),
  cvText: text("cv_text"), // extracted CV text
  skills: text("skills").array(), // candidate skills array
  yearsExperience: integer("years_experience"),
  location: text("location"),
  isAvailable: boolean("is_available").default(true).notNull(),
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