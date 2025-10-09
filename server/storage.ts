import { 
  companies, jobs, candidates, jobMatches, users, napConversations, emailOutreach,
  dataIngestionJobs, duplicateDetections, dataReviewQueue, stagingCandidates, verificationResults,
  type Company, type Job, type Candidate, type JobMatch, type User,
  type InsertCompany, type InsertJob, type InsertCandidate, type InsertJobMatch, type InsertUser,
  type NapConversation, type InsertNapConversation, type EmailOutreach, type InsertEmailOutreach,
  type DataIngestionJob, type InsertDataIngestionJob, type DuplicateDetection, type InsertDuplicateDetection,
  type DataReviewQueue, type InsertDataReviewQueue, type StagingCandidate, type InsertStagingCandidate,
  type VerificationResult, type InsertVerificationResult
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, or, ilike, ne } from "drizzle-orm";

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Company management
  createCompany(company: InsertCompany): Promise<Company>;
  getCompanies(onlyHeadquarters?: boolean): Promise<Company[]>;
  getCompany(id: number): Promise<Company | undefined>;
  updateCompany(id: number, updates: Partial<InsertCompany>): Promise<Company | undefined>;
  deleteCompany(id: number): Promise<void>;
  getChildCompanies(parentCompanyId: number): Promise<Company[]>;
  getParentCompany(childCompanyId: number): Promise<Company | undefined>;
  convertCompanyToHierarchy(companyId: number): Promise<{ parent: Company; children: Company[] }>;
  searchCompanies(query: string): Promise<Array<{ parent: Company; matchedOffices: Company[]; matchType: 'parent' | 'office' | 'both' }>>;
  
  // Job management
  createJob(job: InsertJob): Promise<Job>;
  getJobs(): Promise<Job[]>;
  getJobsForCompany(companyId: number): Promise<Job[]>;
  getJob(id: number): Promise<Job | undefined>;
  updateJob(id: number, updates: Partial<InsertJob>): Promise<Job | undefined>;
  
  // Candidate management
  createCandidate(candidate: InsertCandidate): Promise<Candidate>;
  getCandidates(): Promise<Candidate[]>;
  getCandidatesForReprocessing(): Promise<Candidate[]>;
  getCandidate(id: number): Promise<Candidate | undefined>;
  updateCandidate(id: number, updates: Partial<InsertCandidate>): Promise<Candidate | undefined>;
  deleteCandidate(id: number): Promise<void>;
  searchCandidates(query: string): Promise<Candidate[]>;
  
  // Job matching
  createJobMatch(match: InsertJobMatch): Promise<JobMatch>;
  getJobMatches(jobId: number): Promise<(JobMatch & { candidate: Candidate })[]>;
  getCandidateMatches(candidateId: number): Promise<(JobMatch & { job: Job & { company: Partial<Company> } })[]>;
  
  // Conversation management
  createConversation(conversation: InsertNapConversation): Promise<NapConversation>;
  getConversations(): Promise<(NapConversation & { job: Job & { company: Company }, candidate?: Candidate })[]>;
  getConversation(id: number): Promise<NapConversation | undefined>;
  updateConversation(id: number, updates: Partial<InsertNapConversation>): Promise<NapConversation | undefined>;
  
  // Email outreach management  
  createEmailOutreach(outreach: InsertEmailOutreach): Promise<EmailOutreach>;
  getEmailOutreach(): Promise<(EmailOutreach & { candidate: Candidate, job: Job & { company: Company } })[]>;
  getOutreachForCandidate(candidateId: number): Promise<EmailOutreach[]>;
  updateEmailOutreach(id: number, updates: Partial<InsertEmailOutreach>): Promise<EmailOutreach | undefined>;
  
  // Data ingestion management
  createIngestionJob(job: InsertDataIngestionJob): Promise<DataIngestionJob>;
  getIngestionJobs(filters?: {
    entityType?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<DataIngestionJob[]>;
  getIngestionJob(id: number): Promise<DataIngestionJob | undefined>;
  getIngestionJobDetails(id: number): Promise<(DataIngestionJob & { 
    uploadedBy: User;
    duplicateCount: number;
    pendingDuplicates: number;
  }) | undefined>;
  updateIngestionJob(id: number, updates: Partial<InsertDataIngestionJob>): Promise<DataIngestionJob | undefined>;
  
  // Duplicate detection management
  createDuplicateDetection(detection: InsertDuplicateDetection): Promise<DuplicateDetection>;
  getDuplicateDetections(ingestionJobId?: number): Promise<DuplicateDetection[]>;
  getDuplicateDetection(id: number): Promise<DuplicateDetection | undefined>;
  updateDuplicateDetection(id: number, updates: Partial<InsertDuplicateDetection>): Promise<DuplicateDetection | undefined>;
  getCandidateDuplicates(status?: string): Promise<DuplicateDetection[]>;
  getCompanyDuplicates(status?: string): Promise<DuplicateDetection[]>;
  resolveDuplicateDetection(id: number, action: 'merge' | 'create_new' | 'skip', selectedId?: number): Promise<void>;
  
  // Data review queue management
  createReviewTask(task: InsertDataReviewQueue): Promise<DataReviewQueue>;
  getReviewTasks(status?: string): Promise<DataReviewQueue[]>;
  getReviewTask(id: number): Promise<DataReviewQueue | undefined>;
  updateReviewTask(id: number, updates: Partial<InsertDataReviewQueue>): Promise<DataReviewQueue | undefined>;
  
  // Staging Candidates (ChatGPT's "Raw/Staging Database")
  createStagingCandidate(candidate: InsertStagingCandidate): Promise<StagingCandidate>;
  getStagingCandidates(filters?: { verificationStatus?: string; companyId?: number; excludeVerified?: boolean }): Promise<StagingCandidate[]>;
  getStagingCandidate(id: number): Promise<StagingCandidate | undefined>;
  updateStagingCandidate(id: number, updates: Partial<InsertStagingCandidate>): Promise<StagingCandidate | undefined>;
  deleteStagingCandidate(id: number): Promise<void>;
  
  // Verification Results (ChatGPT's "Verification Layer")
  createVerificationResult(result: InsertVerificationResult): Promise<VerificationResult>;
  getVerificationResult(stagingCandidateId: number): Promise<VerificationResult | undefined>;
  
  // Move verified candidate from staging to production
  promoteToProduction(stagingCandidateId: number): Promise<Candidate>;
}

export class DatabaseStorage implements IStorage {
  // User management
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Company management
  async createCompany(insertCompany: InsertCompany): Promise<Company> {
    const [company] = await db.insert(companies).values(insertCompany).returning();
    return company;
  }

  async getCompanies(onlyHeadquarters: boolean = true): Promise<Company[]> {
    if (onlyHeadquarters) {
      return await db.select().from(companies)
        .where(eq(companies.isHeadquarters, true))
        .orderBy(desc(companies.createdAt));
    }
    return await db.select().from(companies).orderBy(desc(companies.createdAt));
  }

  async getCompany(id: number): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company || undefined;
  }

  async updateCompany(id: number, updates: Partial<InsertCompany>): Promise<Company | undefined> {
    const [company] = await db.update(companies)
      .set({ ...updates, updatedAt: sql`now()` })
      .where(eq(companies.id, id))
      .returning();
    return company || undefined;
  }

  async deleteCompany(id: number): Promise<void> {
    await db.delete(companies).where(eq(companies.id, id));
  }

  async getChildCompanies(parentCompanyId: number): Promise<Company[]> {
    return await db.select().from(companies)
      .where(eq(companies.parentCompanyId, parentCompanyId))
      .orderBy(companies.name);
  }

  async getParentCompany(childCompanyId: number): Promise<Company | undefined> {
    const [child] = await db.select().from(companies).where(eq(companies.id, childCompanyId));
    if (!child || !child.parentCompanyId) {
      return undefined;
    }
    const [parent] = await db.select().from(companies).where(eq(companies.id, child.parentCompanyId));
    return parent || undefined;
  }

  async convertCompanyToHierarchy(companyId: number): Promise<{ parent: Company; children: Company[] }> {
    const parent = await this.getCompany(companyId);
    if (!parent) {
      throw new Error('Company not found');
    }

    // Check if already has child companies
    const existingChildren = await this.getChildCompanies(companyId);
    if (existingChildren.length > 0) {
      return { parent, children: existingChildren };
    }

    // Get office locations from JSON
    const officeLocations = parent.officeLocations as any[];
    if (!officeLocations || !Array.isArray(officeLocations) || officeLocations.length === 0) {
      return { parent, children: [] };
    }

    console.log(`Converting company ${parent.name} to hierarchy with ${officeLocations.length} offices`);

    // Mark parent as headquarters
    const updatedParent = await this.updateCompany(parent.id, { isHeadquarters: true });

    // Create child companies
    const children: Company[] = [];
    for (const office of officeLocations) {
      // Skip offices with no valid city data
      if (!office.city || office.city.trim() === '') {
        console.log(`⚠ Skipping office with no city data:`, office);
        continue;
      }

      const childData = {
        name: `${parent.name} - ${office.city}`,
        parentCompanyId: parent.id,
        isOfficeLocation: true,
        isHeadquarters: false, // Child offices are not headquarters
        industry: parent.industry,
        website: parent.website,
        missionStatement: null, // Don't inherit parent description
        location: `${office.city}, ${office.country}`,
        headquarters: {
          street: office.address || null,
          city: office.city,
          state: null,
          country: office.country,
          postalCode: null
        },
        officeLocations: [],
        stage: 'growth'
      };

      const child = await this.createCompany(childData);
      children.push(child);
      console.log(`✓ Created child company: ${child.name}`);
    }

    return { parent: updatedParent || parent, children };
  }

  async searchCompanies(query: string): Promise<Array<{ parent: Company; matchedOffices: Company[]; matchType: 'parent' | 'office' | 'both' }>> {
    const searchPattern = `%${query}%`;
    
    // Search for matching companies (both HQ and offices)
    const allMatches = await db.select().from(companies)
      .where(
        or(
          ilike(companies.name, searchPattern),
          ilike(companies.location, searchPattern)
        )
      );
    
    // Group results by parent company
    const results = new Map<number, { parent: Company; matchedOffices: Company[]; matchType: 'parent' | 'office' | 'both' }>();
    
    for (const match of allMatches) {
      if (match.isHeadquarters) {
        // This is a headquarters match
        const existing = results.get(match.id);
        if (existing) {
          existing.matchType = existing.matchType === 'office' ? 'both' : 'parent';
        } else {
          results.set(match.id, {
            parent: match,
            matchedOffices: [],
            matchType: 'parent'
          });
        }
      } else if (match.parentCompanyId) {
        // This is an office match - get its parent
        const parent = await this.getCompany(match.parentCompanyId);
        if (parent) {
          const existing = results.get(parent.id);
          if (existing) {
            existing.matchedOffices.push(match);
            existing.matchType = existing.matchType === 'parent' ? 'both' : 'office';
          } else {
            results.set(parent.id, {
              parent,
              matchedOffices: [match],
              matchType: 'office'
            });
          }
        }
      }
    }
    
    // If searching for "KKR London", prioritize office matches
    // If searching for just "KKR", prioritize parent matches
    return Array.from(results.values()).sort((a, b) => {
      // Prioritize results where the query matches an office city
      const aHasOfficeMatch = a.matchedOffices.length > 0;
      const bHasOfficeMatch = b.matchedOffices.length > 0;
      
      if (aHasOfficeMatch && !bHasOfficeMatch) return -1;
      if (!aHasOfficeMatch && bHasOfficeMatch) return 1;
      
      // Otherwise sort by match type (both > parent > office)
      const typeOrder = { both: 0, parent: 1, office: 2 };
      return typeOrder[a.matchType] - typeOrder[b.matchType];
    });
  }

  // Job management
  async createJob(insertJob: InsertJob): Promise<Job> {
    const [job] = await db.insert(jobs).values(insertJob).returning();
    return job;
  }

  async getJobs(): Promise<Job[]> {
    return await db.select().from(jobs).orderBy(desc(jobs.createdAt));
  }

  async getJobsForCompany(companyId: number): Promise<Job[]> {
    return await db.select().from(jobs)
      .where(eq(jobs.companyId, companyId))
      .orderBy(desc(jobs.createdAt));
  }

  async getJob(id: number): Promise<Job | undefined> {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    return job || undefined;
  }

  async updateJob(id: number, updates: Partial<InsertJob>): Promise<Job | undefined> {
    const [job] = await db.update(jobs)
      .set({ ...updates, updatedAt: sql`now()` })
      .where(eq(jobs.id, id))
      .returning();
    return job || undefined;
  }

  // Candidate management
  async createCandidate(insertCandidate: InsertCandidate): Promise<Candidate> {
    const [candidate] = await db.insert(candidates).values(insertCandidate).returning();
    return candidate;
  }

  async getCandidates(): Promise<Candidate[]> {
    return await db.select().from(candidates).orderBy(desc(candidates.createdAt));
  }

  async getCandidatesForReprocessing(): Promise<Candidate[]> {
    return await db
      .select()
      .from(candidates)
      .where(
        and(
          // Has a bioUrl (was processed from URL)
          sql`${candidates.bioUrl} IS NOT NULL`,
          // Missing enhanced data (biography is null or empty)
          sql`(${candidates.biography} IS NULL OR ${candidates.biography} = '' OR ${candidates.careerSummary} IS NULL OR ${candidates.careerSummary} = '')`,
        )
      )
      .orderBy(desc(candidates.createdAt));
  }

  async getCandidate(id: number): Promise<Candidate | undefined> {
    const [candidate] = await db.select().from(candidates).where(eq(candidates.id, id));
    return candidate || undefined;
  }

  async updateCandidate(id: number, updates: Partial<InsertCandidate>): Promise<Candidate | undefined> {
    const [candidate] = await db.update(candidates)
      .set({ ...updates, updatedAt: sql`now()` })
      .where(eq(candidates.id, id))
      .returning();
    return candidate || undefined;
  }

  async deleteCandidate(id: number): Promise<void> {
    await db.delete(candidates).where(eq(candidates.id, id));
  }

  async searchCandidates(query: string): Promise<Candidate[]> {
    return await db.select().from(candidates)
      .where(sql`
        ${candidates.firstName} ILIKE ${`%${query}%`} OR 
        ${candidates.lastName} ILIKE ${`%${query}%`} OR 
        ${candidates.currentTitle} ILIKE ${`%${query}%`} OR 
        ${candidates.currentCompany} ILIKE ${`%${query}%`}
      `)
      .orderBy(desc(candidates.createdAt));
  }

  // Job matching
  async createJobMatch(insertJobMatch: InsertJobMatch): Promise<JobMatch> {
    const [match] = await db.insert(jobMatches).values(insertJobMatch).returning();
    return match;
  }

  async getJobMatches(jobId: number): Promise<(JobMatch & { candidate: Candidate })[]> {
    return await db.select({
      id: jobMatches.id,
      jobId: jobMatches.jobId,
      candidateId: jobMatches.candidateId,
      matchScore: jobMatches.matchScore,
      status: jobMatches.status,
      appliedAt: jobMatches.appliedAt,
      createdAt: jobMatches.createdAt,
      candidate: candidates
    })
    .from(jobMatches)
    .innerJoin(candidates, eq(jobMatches.candidateId, candidates.id))
    .where(eq(jobMatches.jobId, jobId))
    .orderBy(desc(jobMatches.matchScore));
  }

  async getCandidateMatches(candidateId: number): Promise<(JobMatch & { job: Job & { company: Company } })[]> {
    const results = await db.select({
      id: jobMatches.id,
      jobId: jobMatches.jobId,
      candidateId: jobMatches.candidateId,
      matchScore: jobMatches.matchScore,
      status: jobMatches.status,
      appliedAt: jobMatches.appliedAt,
      createdAt: jobMatches.createdAt,
      jobId2: jobs.id,
      jobTitle: jobs.title,
      jobDepartment: jobs.department,
      jobCompanyId: jobs.companyId,
      jobJdText: jobs.jdText,
      jobParsedData: jobs.parsedData,
      jobSkills: jobs.skills,
      jobUrgency: jobs.urgency,
      jobStatus: jobs.status,
      jobCreatedAt: jobs.createdAt,
      jobUpdatedAt: jobs.updatedAt,
      companyId: companies.id,
      companyName: companies.name,
      companyParentCompany: companies.parentCompany,
      companyLocation: companies.location,
      companyIndustry: companies.industry,
      companyEmployeeSize: companies.employeeSize,
      companySubsector: companies.subsector,
      companyStage: companies.stage,
      companyCreatedAt: companies.createdAt
    })
    .from(jobMatches)
    .innerJoin(jobs, eq(jobMatches.jobId, jobs.id))
    .innerJoin(companies, eq(jobs.companyId, companies.id))
    .where(eq(jobMatches.candidateId, candidateId))
    .orderBy(desc(jobMatches.matchScore));

    return results.map(r => ({
      id: r.id,
      jobId: r.jobId,
      candidateId: r.candidateId,
      matchScore: r.matchScore,
      status: r.status,
      appliedAt: r.appliedAt,
      createdAt: r.createdAt,
      job: {
        id: r.jobId2,
        title: r.jobTitle,
        department: r.jobDepartment,
        companyId: r.jobCompanyId,
        jdText: r.jobJdText,
        parsedData: r.jobParsedData,
        skills: r.jobSkills,
        urgency: r.jobUrgency,
        status: r.jobStatus,
        createdAt: r.jobCreatedAt,
        updatedAt: r.jobUpdatedAt,
        company: {
          id: r.companyId,
          name: r.companyName,
          parentCompany: r.companyParentCompany,
          location: r.companyLocation,
          industry: r.companyIndustry,
          employeeSize: r.companyEmployeeSize,
          subsector: r.companySubsector,
          stage: r.companyStage,
          createdAt: r.companyCreatedAt
        }
      }
    }));
  }

  // Conversation management
  async createConversation(insertConversation: InsertNapConversation): Promise<NapConversation> {
    const [conversation] = await db.insert(napConversations).values(insertConversation).returning();
    return conversation;
  }

  async getConversations(): Promise<(NapConversation & { job: Job & { company: Company }, candidate?: Candidate })[]> {
    const results = await db.select({
      id: napConversations.id,
      jobId: napConversations.jobId,
      candidateId: napConversations.candidateId,
      messages: napConversations.messages,
      status: napConversations.status,
      createdAt: napConversations.createdAt,
      updatedAt: napConversations.updatedAt,
      job: jobs,
      company: companies,
      candidate: candidates
    })
    .from(napConversations)
    .innerJoin(jobs, eq(napConversations.jobId, jobs.id))
    .innerJoin(companies, eq(jobs.companyId, companies.id))
    .leftJoin(candidates, eq(napConversations.candidateId, candidates.id))
    .orderBy(desc(napConversations.updatedAt));

    return results.map(r => ({
      id: r.id,
      jobId: r.jobId,
      candidateId: r.candidateId,
      messages: r.messages,
      status: r.status,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      job: {
        ...r.job,
        company: r.company
      },
      candidate: r.candidate || undefined
    }));
  }

  async getConversation(id: number): Promise<NapConversation | undefined> {
    const [conversation] = await db.select().from(napConversations).where(eq(napConversations.id, id));
    return conversation || undefined;
  }

  async updateConversation(id: number, updates: Partial<InsertNapConversation>): Promise<NapConversation | undefined> {
    const [conversation] = await db.update(napConversations)
      .set({ ...updates, updatedAt: sql`now()` })
      .where(eq(napConversations.id, id))
      .returning();
    return conversation || undefined;
  }

  // Email outreach management
  async createEmailOutreach(insertOutreach: InsertEmailOutreach): Promise<EmailOutreach> {
    const [outreach] = await db.insert(emailOutreach).values(insertOutreach).returning();
    return outreach;
  }

  async getEmailOutreach(): Promise<(EmailOutreach & { candidate: Candidate, job: Job & { company: Company } })[]> {
    const results = await db.select({
      id: emailOutreach.id,
      candidateId: emailOutreach.candidateId,
      jobId: emailOutreach.jobId,
      subject: emailOutreach.subject,
      content: emailOutreach.content,
      status: emailOutreach.status,
      sentAt: emailOutreach.sentAt,
      candidate: candidates,
      job: jobs,
      company: companies
    })
    .from(emailOutreach)
    .innerJoin(candidates, eq(emailOutreach.candidateId, candidates.id))
    .innerJoin(jobs, eq(emailOutreach.jobId, jobs.id))
    .innerJoin(companies, eq(jobs.companyId, companies.id))
    .orderBy(desc(emailOutreach.sentAt));

    return results.map(r => ({
      id: r.id,
      candidateId: r.candidateId,
      jobId: r.jobId,
      subject: r.subject,
      content: r.content,
      status: r.status,
      sentAt: r.sentAt,
      candidate: r.candidate,
      job: {
        ...r.job,
        company: r.company
      }
    }));
  }

  async getOutreachForCandidate(candidateId: number): Promise<EmailOutreach[]> {
    return await db.select().from(emailOutreach)
      .where(eq(emailOutreach.candidateId, candidateId))
      .orderBy(desc(emailOutreach.sentAt));
  }

  async updateEmailOutreach(id: number, updates: Partial<InsertEmailOutreach>): Promise<EmailOutreach | undefined> {
    const [outreach] = await db.update(emailOutreach)
      .set(updates)
      .where(eq(emailOutreach.id, id))
      .returning();
    return outreach || undefined;
  }

  // Data ingestion management
  async createIngestionJob(insertJob: InsertDataIngestionJob): Promise<DataIngestionJob> {
    const [job] = await db.insert(dataIngestionJobs).values(insertJob).returning();
    return job;
  }

  async getIngestionJobs(filters?: {
    entityType?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<DataIngestionJob[]> {
    const conditions = [];
    if (filters?.entityType) {
      conditions.push(eq(dataIngestionJobs.entityType, filters.entityType));
    }
    if (filters?.status) {
      conditions.push(eq(dataIngestionJobs.status, filters.status));
    }
    
    let query = db.select().from(dataIngestionJobs);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    query = query.orderBy(desc(dataIngestionJobs.createdAt));
    
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    if (filters?.offset) {
      query = query.offset(filters.offset);
    }
    
    return await query;
  }

  async getIngestionJob(id: number): Promise<DataIngestionJob | undefined> {
    const [job] = await db.select().from(dataIngestionJobs).where(eq(dataIngestionJobs.id, id));
    return job || undefined;
  }

  async getIngestionJobDetails(id: number): Promise<(DataIngestionJob & { 
    uploadedBy: User;
    duplicateCount: number;
    pendingDuplicates: number;
  }) | undefined> {
    const jobWithUser = await db.select({
      id: dataIngestionJobs.id,
      fileName: dataIngestionJobs.fileName,
      fileType: dataIngestionJobs.fileType,
      uploadedById: dataIngestionJobs.uploadedById,
      entityType: dataIngestionJobs.entityType,
      status: dataIngestionJobs.status,
      totalRecords: dataIngestionJobs.totalRecords,
      processedRecords: dataIngestionJobs.processedRecords,
      successfulRecords: dataIngestionJobs.successfulRecords,
      duplicateRecords: dataIngestionJobs.duplicateRecords,
      errorRecords: dataIngestionJobs.errorRecords,
      errorDetails: dataIngestionJobs.errorDetails,
      processingMethod: dataIngestionJobs.processingMethod,
      createdAt: dataIngestionJobs.createdAt,
      completedAt: dataIngestionJobs.completedAt,
      uploadedBy: users
    })
    .from(dataIngestionJobs)
    .leftJoin(users, eq(dataIngestionJobs.uploadedById, users.id))
    .where(eq(dataIngestionJobs.id, id));
    
    if (!jobWithUser[0] || !jobWithUser[0].uploadedBy) {
      return undefined;
    }
    
    // Get duplicate counts
    const duplicates = await db.select({
      total: sql<number>`count(*)`,
      pending: sql<number>`sum(case when ${duplicateDetections.status} = 'pending' then 1 else 0 end)`
    })
    .from(duplicateDetections)
    .where(eq(duplicateDetections.ingestionJobId, id));
    
    const duplicateStats = duplicates[0] || { total: 0, pending: 0 };
    
    return {
      ...jobWithUser[0],
      uploadedBy: jobWithUser[0].uploadedBy,
      duplicateCount: Number(duplicateStats.total) || 0,
      pendingDuplicates: Number(duplicateStats.pending) || 0
    };
  }

  async updateIngestionJob(id: number, updates: Partial<InsertDataIngestionJob>): Promise<DataIngestionJob | undefined> {
    const [job] = await db.update(dataIngestionJobs)
      .set(updates)
      .where(eq(dataIngestionJobs.id, id))
      .returning();
    return job || undefined;
  }

  // Duplicate detection management
  async createDuplicateDetection(insertDetection: InsertDuplicateDetection): Promise<DuplicateDetection> {
    const [detection] = await db.insert(duplicateDetections).values(insertDetection).returning();
    return detection;
  }

  async getDuplicateDetections(ingestionJobId?: number): Promise<DuplicateDetection[]> {
    if (ingestionJobId) {
      return await db.select().from(duplicateDetections)
        .where(eq(duplicateDetections.ingestionJobId, ingestionJobId))
        .orderBy(desc(duplicateDetections.createdAt));
    }
    return await db.select().from(duplicateDetections)
      .orderBy(desc(duplicateDetections.createdAt));
  }

  async getDuplicateDetection(id: number): Promise<DuplicateDetection | undefined> {
    const [detection] = await db.select().from(duplicateDetections).where(eq(duplicateDetections.id, id));
    return detection || undefined;
  }

  async updateDuplicateDetection(id: number, updates: Partial<InsertDuplicateDetection>): Promise<DuplicateDetection | undefined> {
    const [detection] = await db.update(duplicateDetections)
      .set({ ...updates, resolvedAt: updates.resolvedById ? sql`now()` : undefined })
      .where(eq(duplicateDetections.id, id))
      .returning();
    return detection || undefined;
  }

  // Data review queue management
  async createReviewTask(insertTask: InsertDataReviewQueue): Promise<DataReviewQueue> {
    const [task] = await db.insert(dataReviewQueue).values(insertTask).returning();
    return task;
  }

  async getReviewTasks(status?: string): Promise<DataReviewQueue[]> {
    if (status) {
      return await db.select().from(dataReviewQueue)
        .where(eq(dataReviewQueue.status, status))
        .orderBy(desc(dataReviewQueue.createdAt));
    }
    return await db.select().from(dataReviewQueue)
      .orderBy(desc(dataReviewQueue.createdAt));
  }

  async getReviewTask(id: number): Promise<DataReviewQueue | undefined> {
    const [task] = await db.select().from(dataReviewQueue).where(eq(dataReviewQueue.id, id));
    return task || undefined;
  }

  async updateReviewTask(id: number, updates: Partial<InsertDataReviewQueue>): Promise<DataReviewQueue | undefined> {
    const [task] = await db.update(dataReviewQueue)
      .set({ ...updates, reviewedAt: updates.reviewedById ? sql`now()` : undefined })
      .where(eq(dataReviewQueue.id, id))
      .returning();
    return task || undefined;
  }

  // Enhanced duplicate detection methods for admin review
  async getCandidateDuplicates(status?: string): Promise<DuplicateDetection[]> {
    if (status) {
      return await db.select().from(duplicateDetections)
        .where(and(
          eq(duplicateDetections.entityType, 'candidate'),
          eq(duplicateDetections.status, status)
        ))
        .orderBy(desc(duplicateDetections.createdAt));
    }
    return await db.select().from(duplicateDetections)
      .where(eq(duplicateDetections.entityType, 'candidate'))
      .orderBy(desc(duplicateDetections.createdAt));
  }

  async getCompanyDuplicates(status?: string): Promise<DuplicateDetection[]> {
    if (status) {
      return await db.select().from(duplicateDetections)
        .where(and(
          eq(duplicateDetections.entityType, 'company'),
          eq(duplicateDetections.status, status)
        ))
        .orderBy(desc(duplicateDetections.createdAt));
    }
    return await db.select().from(duplicateDetections)
      .where(eq(duplicateDetections.entityType, 'company'))
      .orderBy(desc(duplicateDetections.createdAt));
  }

  async resolveDuplicateDetection(
    id: number, 
    action: 'merge' | 'create_new' | 'skip', 
    selectedId?: number
  ): Promise<void> {
    const duplicateDetection = await this.getDuplicateDetection(id);
    if (!duplicateDetection) {
      throw new Error(`Duplicate detection ${id} not found`);
    }

    // Update the duplicate detection status
    await db.update(duplicateDetections)
      .set({
        status: 'resolved',
        resolution: action,
        resolvedById: null, // TODO: Set actual user ID when authentication is implemented
        resolvedAt: sql`now()`
      })
      .where(eq(duplicateDetections.id, id));

    if (action === 'create_new') {
      // Create the new record from the new record data
      const newRecordData = duplicateDetection.newRecordData as any;
      
      if (duplicateDetection.entityType === 'candidate') {
        // Create new candidate
        await this.createCandidate(newRecordData);
      } else if (duplicateDetection.entityType === 'company') {
        // Create new company
        await this.createCompany(newRecordData);
      }
    } else if (action === 'merge' && selectedId) {
      // Merge logic: Update the selected existing record with new data
      const newRecordData = duplicateDetection.newRecordData as any;
      
      if (duplicateDetection.entityType === 'candidate') {
        // Merge candidate data - update existing record with non-null values from new data
        const existingCandidate = await this.getCandidate(selectedId);
        if (existingCandidate) {
          const mergedData: any = { ...existingCandidate };
          
          // Merge non-null fields from new data
          Object.keys(newRecordData).forEach(key => {
            if (newRecordData[key] != null && newRecordData[key] !== '') {
              // For array fields, merge arrays
              if (Array.isArray(newRecordData[key]) && Array.isArray(existingCandidate[key as keyof Candidate])) {
                const existingArray = existingCandidate[key as keyof Candidate] as string[];
                const newArray = newRecordData[key] as string[];
                mergedData[key] = Array.from(new Set([...existingArray, ...newArray]));
              } else {
                mergedData[key] = newRecordData[key];
              }
            }
          });
          
          await this.updateCandidate(selectedId, mergedData);
        }
      } else if (duplicateDetection.entityType === 'company') {
        // Merge company data
        const existingCompany = await this.getCompany(selectedId);
        if (existingCompany) {
          const mergedData: any = { ...existingCompany };
          
          // Merge non-null fields from new data
          Object.keys(newRecordData).forEach(key => {
            if (newRecordData[key] != null && newRecordData[key] !== '') {
              mergedData[key] = newRecordData[key];
            }
          });
          
          await this.updateCompany(selectedId, mergedData);
        }
      }
    }
    // If action is 'skip', we don't create or merge anything, just mark as resolved
  }
  
  // Staging Candidates Management (ChatGPT's "Raw/Staging Database")
  async createStagingCandidate(insertStagingCandidate: InsertStagingCandidate): Promise<StagingCandidate> {
    const [candidate] = await db.insert(stagingCandidates).values(insertStagingCandidate).returning();
    return candidate;
  }
  
  async getStagingCandidates(filters?: { verificationStatus?: string; companyId?: number; excludeVerified?: boolean }): Promise<StagingCandidate[]> {
    let query = db.select().from(stagingCandidates);
    
    const conditions = [];
    
    if (filters?.verificationStatus) {
      conditions.push(eq(stagingCandidates.verificationStatus, filters.verificationStatus));
    }
    if (filters?.companyId) {
      conditions.push(eq(stagingCandidates.companyId, filters.companyId));
    }
    if (filters?.excludeVerified) {
      conditions.push(ne(stagingCandidates.verificationStatus, 'verified'));
    }
    
    if (conditions.length > 0) {
      query = query.where(conditions.length === 1 ? conditions[0] : and(...conditions)) as any;
    }
    
    return await query.orderBy(desc(stagingCandidates.scrapedAt));
  }
  
  async getStagingCandidate(id: number): Promise<StagingCandidate | undefined> {
    const [candidate] = await db.select().from(stagingCandidates).where(eq(stagingCandidates.id, id));
    return candidate || undefined;
  }
  
  async updateStagingCandidate(id: number, updates: Partial<InsertStagingCandidate>): Promise<StagingCandidate | undefined> {
    const [candidate] = await db.update(stagingCandidates)
      .set(updates)
      .where(eq(stagingCandidates.id, id))
      .returning();
    return candidate || undefined;
  }
  
  async deleteStagingCandidate(id: number): Promise<void> {
    await db.delete(stagingCandidates).where(eq(stagingCandidates.id, id));
  }
  
  // Verification Results (ChatGPT's "Verification Layer")
  async createVerificationResult(insertResult: InsertVerificationResult): Promise<VerificationResult> {
    const [result] = await db.insert(verificationResults).values(insertResult).returning();
    return result;
  }
  
  async getVerificationResult(stagingCandidateId: number): Promise<VerificationResult | undefined> {
    const [result] = await db.select().from(verificationResults)
      .where(eq(verificationResults.stagingCandidateId, stagingCandidateId))
      .orderBy(desc(verificationResults.verifiedAt))
      .limit(1);
    return result || undefined;
  }
  
  // Promote Verified Candidate to Production (ChatGPT's Staging → Production flow)
  async promoteToProduction(stagingCandidateId: number): Promise<Candidate> {
    // Use transaction to ensure atomicity
    return await db.transaction(async (tx) => {
      const [stagingCandidate] = await tx.select().from(stagingCandidates)
        .where(eq(stagingCandidates.id, stagingCandidateId));
      
      if (!stagingCandidate) {
        throw new Error('Staging candidate not found');
      }
      
      const [verificationResult] = await tx.select().from(verificationResults)
        .where(eq(verificationResults.stagingCandidateId, stagingCandidateId))
        .limit(1);
      
      // Create production candidate with data from staging
      const productionCandidate: InsertCandidate = {
        firstName: stagingCandidate.firstName,
        lastName: stagingCandidate.lastName,
        currentTitle: stagingCandidate.currentTitle || undefined,
        currentCompany: stagingCandidate.currentCompany || undefined,
        bioUrl: stagingCandidate.bioUrl || undefined,
        linkedinUrl: verificationResult?.linkedinUrl || stagingCandidate.linkedinUrl || undefined,
        email: verificationResult?.inferredEmail || undefined,
        
        // Verification metadata
        verificationStatus: 'verified',
        confidenceScore: stagingCandidate.confidenceScore || undefined,
        verificationDate: sql`now()`,
        stagingCandidateId: stagingCandidateId,
        
        // Source tracking
        sourceChannel: stagingCandidate.sourceType,
        sourceDetails: stagingCandidate.sourceUrl,
      };
      
      const [candidate] = await tx.insert(candidates).values(productionCandidate).returning();
      
      // Update staging candidate to track promotion
      await tx.update(stagingCandidates)
        .set({
          verificationStatus: 'verified',
          movedToProductionAt: sql`now()`,
          productionCandidateId: candidate.id,
        })
        .where(eq(stagingCandidates.id, stagingCandidateId));
      
      return candidate;
    });
  }
}

export const storage = new DatabaseStorage();