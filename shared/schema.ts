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

export const usersRelations = relations(users, ({ one }) => ({
  company: one(companies, {
    fields: [users.companyId],
    references: [companies.id],
  }),
  candidate: one(candidates, {
    fields: [users.candidateId],
    references: [candidates.id],
  }),
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