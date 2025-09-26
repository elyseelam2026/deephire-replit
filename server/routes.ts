import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import multer from "multer";

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}
import { storage } from "./storage";
import { parseJobDescription, generateCandidateLonglist, parseCandidateData, parseCandidateFromUrl, parseCompanyData, parseCompanyFromUrl, parseCsvData, parseExcelData, parseHtmlData } from "./ai";
import { fileTypeFromBuffer } from 'file-type';
import { insertJobSchema, insertCandidateSchema, insertCompanySchema } from "@shared/schema";
import { duplicateDetectionService } from "./duplicate-detection";
import { z } from "zod";

// Robust file type detection
async function detectFileType(file: Express.Multer.File): Promise<string> {
  try {
    const fileName = file.originalname.toLowerCase();
    const mimeType = file.mimetype;
    
    // Use file-type for magic number detection
    const detectedType = await fileTypeFromBuffer(file.buffer);
    
    // CSV detection (no magic numbers, rely on extension and content)
    if (fileName.endsWith('.csv') || 
        mimeType === 'text/csv' || 
        mimeType === 'application/csv') {
      return 'csv';
    }
    
    // Excel detection
    if (fileName.endsWith('.xls') || fileName.endsWith('.xlsx') ||
        mimeType === 'application/vnd.ms-excel' ||
        mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        detectedType?.mime === 'application/vnd.ms-excel' ||
        detectedType?.mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      return 'excel';
    }
    
    // HTML detection
    if (fileName.endsWith('.html') || fileName.endsWith('.htm') ||
        mimeType === 'text/html' ||
        detectedType?.mime === 'text/html') {
      return 'html';
    }
    
    // PDF detection
    if (fileName.endsWith('.pdf') || 
        mimeType === 'application/pdf' ||
        detectedType?.mime === 'application/pdf') {
      return 'pdf';
    }
    
    // Word documents
    if (fileName.endsWith('.doc') || fileName.endsWith('.docx') ||
        mimeType === 'application/msword' ||
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        detectedType?.mime === 'application/msword' ||
        detectedType?.mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return 'word';
    }
    
    // Text files
    if (fileName.endsWith('.txt') || mimeType === 'text/plain' || detectedType?.mime === 'text/plain') {
      return 'text';
    }
    
    // Default to text for unknown types
    return 'text';
  } catch (error) {
    console.error('Error detecting file type:', error);
    // Fall back to extension-based detection
    const fileName = file.originalname.toLowerCase();
    if (fileName.endsWith('.csv')) return 'csv';
    if (fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) return 'excel';
    if (fileName.endsWith('.html') || fileName.endsWith('.htm')) return 'html';
    return 'text';
  }
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedTypes = [
      'text/plain',
      'application/pdf', 
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/csv',
      'application/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/html',
      'application/vnd.ms-excel.sheet.macroEnabled.12'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: PDF, DOC, DOCX, TXT, CSV, XLS, XLSX, HTML files.'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Job posting and AI parsing endpoint
  app.post("/api/upload-jd", upload.single('file'), async (req: MulterRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const jdText = req.file.buffer.toString('utf-8');
      const parsedData = await parseJobDescription(jdText);
      
      // Get all candidates for matching
      const allCandidates = await storage.getCandidates();
      const longlistMatches = await generateCandidateLonglist(
        allCandidates.map(c => ({
          id: c.id,
          firstName: c.firstName,
          lastName: c.lastName,
          currentTitle: c.currentTitle || "",
          skills: c.skills || [],
          cvText: c.cvText || undefined
        })),
        parsedData.skills,
        jdText
      );

      // Get top candidates with full details
      const topCandidates = [];
      for (const match of longlistMatches.slice(0, 10)) {
        const candidate = await storage.getCandidate(match.candidateId);
        if (candidate) {
          topCandidates.push({
            ...candidate,
            matchScore: match.matchScore
          });
        }
      }

      res.json({
        parsed: parsedData,
        jdText,
        longlist: topCandidates,
        totalMatches: longlistMatches.length
      });
    } catch (error) {
      console.error("Error processing job description:", error);
      res.status(500).json({ error: "Failed to process job description" });
    }
  });

  // Create job posting endpoint
  app.post("/api/jobs", async (req, res) => {
    try {
      const jobData = insertJobSchema.parse(req.body);
      
      // Ensure company exists or create it
      let companyId = jobData.companyId;
      if (!companyId && req.body.companyName) {
        const existingCompanies = await storage.getCompanies();
        let company = existingCompanies.find(c => c.name === req.body.companyName);
        
        if (!company) {
          company = await storage.createCompany({
            name: req.body.companyName,
            location: req.body.companyLocation || "Not specified"
          });
        }
        companyId = company.id;
      }

      const job = await storage.createJob({
        ...jobData,
        companyId: companyId!
      });

      // If this is a new job with skills, generate candidate matches
      if (job.skills && job.skills.length > 0) {
        const allCandidates = await storage.getCandidates();
        const matches = await generateCandidateLonglist(
          allCandidates.map(c => ({
            id: c.id,
            firstName: c.firstName,
            lastName: c.lastName,
            currentTitle: c.currentTitle || "",
            skills: c.skills || [],
            cvText: c.cvText || undefined
          })),
          job.skills,
          job.jdText
        );

        // Create job matches for top candidates
        for (const match of matches.slice(0, 20)) {
          await storage.createJobMatch({
            jobId: job.id,
            candidateId: match.candidateId,
            matchScore: match.matchScore
          });
        }
      }

      res.json(job);
    } catch (error) {
      console.error("Error creating job:", error);
      res.status(400).json({ error: "Failed to create job" });
    }
  });

  // Get jobs endpoint
  app.get("/api/jobs", async (req, res) => {
    try {
      const jobs = await storage.getJobs();
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      res.status(500).json({ error: "Failed to fetch jobs" });
    }
  });

  // Get job by ID with matches
  app.get("/api/jobs/:id", async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const job = await storage.getJob(jobId);
      
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }

      const matches = await storage.getJobMatches(jobId);
      
      res.json({
        ...job,
        matches
      });
    } catch (error) {
      console.error("Error fetching job:", error);
      res.status(500).json({ error: "Failed to fetch job" });
    }
  });

  // Create candidate endpoint
  app.post("/api/candidates", async (req, res) => {
    try {
      const candidateData = insertCandidateSchema.parse(req.body);
      const candidate = await storage.createCandidate(candidateData);
      res.json(candidate);
    } catch (error) {
      console.error("Error creating candidate:", error);
      res.status(400).json({ error: "Failed to create candidate" });
    }
  });

  // Get candidates endpoint
  app.get("/api/candidates", async (req, res) => {
    try {
      const { search } = req.query;
      let candidates;
      
      if (search && typeof search === 'string') {
        candidates = await storage.searchCandidates(search);
      } else {
        candidates = await storage.getCandidates();
      }
      
      res.json(candidates);
    } catch (error) {
      console.error("Error fetching candidates:", error);
      res.status(500).json({ error: "Failed to fetch candidates" });
    }
  });

  // Get candidate by ID with job matches
  app.get("/api/candidates/:id", async (req, res) => {
    try {
      const candidateId = parseInt(req.params.id);
      const candidate = await storage.getCandidate(candidateId);
      
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }

      const matches = await storage.getCandidateMatches(candidateId);
      
      res.json({
        ...candidate,
        matches
      });
    } catch (error) {
      console.error("Error fetching candidate:", error);
      res.status(500).json({ error: "Failed to fetch candidate" });
    }
  });

  // Upload candidate CV endpoint
  app.post("/api/candidates/upload-cv", upload.single('file'), async (req: MulterRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const cvText = req.file.buffer.toString('utf-8');
      const { candidateId } = req.body;

      if (candidateId) {
        // Update existing candidate
        const candidate = await storage.updateCandidate(parseInt(candidateId), {
          cvText
        });
        res.json({ candidate, cvText });
      } else {
        // Return parsed CV text for new candidate creation
        res.json({ cvText, parsed: true });
      }
    } catch (error) {
      console.error("Error processing CV:", error);
      res.status(500).json({ error: "Failed to process CV" });
    }
  });

  // Get companies endpoint
  app.get("/api/companies", async (req, res) => {
    try {
      const companies = await storage.getCompanies();
      res.json(companies);
    } catch (error) {
      console.error("Error fetching companies:", error);
      res.status(500).json({ error: "Failed to fetch companies" });
    }
  });

  // Dashboard stats endpoint
  app.get("/api/stats", async (req, res) => {
    try {
      const [jobs, candidates, companies] = await Promise.all([
        storage.getJobs(),
        storage.getCandidates(),
        storage.getCompanies()
      ]);

      const activeJobs = jobs.filter(j => j.status === 'active');
      const availableCandidates = candidates.filter(c => c.isAvailable);

      res.json({
        totalCandidates: candidates.length,
        openPositions: activeJobs.length,
        totalCompanies: companies.length,
        availableCandidates: availableCandidates.length,
        // Mock some additional stats for the demo
        matchRate: 78,
        placements: 156
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Conversations endpoints
  app.get("/api/conversations", async (req, res) => {
    try {
      const conversations = await storage.getConversations();
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.get("/api/conversations/:id", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const conversation = await storage.getConversation(conversationId);
      
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      res.json(conversation);
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  // Email outreach endpoints  
  app.get("/api/outreach", async (req, res) => {
    try {
      const outreach = await storage.getEmailOutreach();
      res.json(outreach);
    } catch (error) {
      console.error("Error fetching outreach:", error);
      res.status(500).json({ error: "Failed to fetch outreach" });
    }
  });

  app.get("/api/outreach/candidate/:candidateId", async (req, res) => {
    try {
      const candidateId = parseInt(req.params.candidateId);
      const outreach = await storage.getOutreachForCandidate(candidateId);
      res.json(outreach);
    } catch (error) {
      console.error("Error fetching candidate outreach:", error);
      res.status(500).json({ error: "Failed to fetch candidate outreach" });
    }
  });

  // Admin bulk upload endpoints
  app.post("/api/admin/upload-candidates", upload.array('files', 50), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[] || [];
      const urlsText = req.body.urls || "";
      const urls = urlsText.split('\n').filter((url: string) => url.trim()).map((url: string) => url.trim());
      
      let successCount = 0;
      let failedCount = 0;
      let duplicateCount = 0;
      const errors: string[] = [];
      
      // Create ingestion job for tracking
      let ingestionJob;
      if (files.length > 0 || urls.length > 0) {
        ingestionJob = await storage.createIngestionJob({
          fileName: files.length > 0 ? files.map(f => f.originalname).join(', ') : `URL batch (${urls.length} URLs)`,
          fileType: files.length > 0 ? await detectFileType(files[0]) : 'url',
          uploadedById: 1, // TODO: Get actual user ID from session
          entityType: 'candidate',
          status: 'processing',
          totalRecords: 0 // Will update after processing
        });
      }

      // Process uploaded files
      for (const file of files) {
        try {
          let candidatesData: any[] = [];
          
          // Determine file type with robust detection
          const detectedType = await detectFileType(file);
          console.log(`Processing file: ${file.originalname}, detected type: ${detectedType}`);
          
          if (detectedType === 'csv') {
            candidatesData = await parseCsvData(file.buffer, 'candidate');
            console.log(`CSV parsing result: ${candidatesData.length} candidates found`);
          } else if (detectedType === 'excel') {
            candidatesData = await parseExcelData(file.buffer, 'candidate');
            console.log(`Excel parsing result: ${candidatesData.length} candidates found`);
          } else if (detectedType === 'html') {
            candidatesData = await parseHtmlData(file.buffer, 'candidate');
            console.log(`HTML parsing result: ${candidatesData.length} candidates found`);
          } else {
            // Fall back to text parsing for PDF, DOC, TXT files
            console.log(`Using AI text parsing for file type: ${detectedType}`);
            const text = file.buffer.toString('utf-8');
            const candidateData = await parseCandidateData(text);
            if (candidateData) {
              candidatesData = [candidateData];
              console.log(`AI parsing result: 1 candidate found`);
            } else {
              console.log(`AI parsing failed for ${file.originalname}`);
            }
          }
          
          // Process each candidate record
          for (const candidateData of candidatesData) {
            try {
              // Check for duplicates before saving
              const duplicates = await duplicateDetectionService.findCandidateDuplicates(candidateData, 70);
              
              if (duplicates.length > 0) {
                // Record duplicate detections
                await duplicateDetectionService.detectCandidateDuplicates(
                  candidateData, 
                  ingestionJob?.id,
                  70
                );
                duplicateCount++;
                console.log(`Found ${duplicates.length} potential duplicates for ${candidateData.firstName} ${candidateData.lastName}`);
              } else {
                // No duplicates found, save the candidate
                await storage.createCandidate(candidateData);
                successCount++;
              }
            } catch (dbError) {
              failedCount++;
              errors.push(`Failed to process candidate from ${file.originalname}: ${dbError}`);
            }
          }
          
          if (candidatesData.length === 0) {
            failedCount++;
            errors.push(`No valid candidate data found in ${file.originalname}`);
          }
          
        } catch (error) {
          failedCount++;
          errors.push(`Error processing ${file.originalname}: ${error}`);
        }
      }

      // Process URLs
      for (const url of urls) {
        try {
          const candidateData = await parseCandidateFromUrl(url);
          
          if (candidateData) {
            // Check for duplicates
            const duplicates = await duplicateDetectionService.findCandidateDuplicates(candidateData, 70);
            
            if (duplicates.length > 0) {
              await duplicateDetectionService.detectCandidateDuplicates(
                candidateData, 
                ingestionJob?.id,
                70
              );
              duplicateCount++;
            } else {
              await storage.createCandidate(candidateData);
              successCount++;
            }
          } else {
            failedCount++;
            errors.push(`Failed to parse URL: ${url}`);
          }
        } catch (error) {
          failedCount++;
          errors.push(`Error processing URL ${url}: ${error}`);
        }
      }

      // Update ingestion job with final counts
      if (ingestionJob) {
        await storage.updateIngestionJob(ingestionJob.id, {
          status: 'completed',
          totalRecords: successCount + failedCount + duplicateCount,
          successfulRecords: successCount,
          duplicateRecords: duplicateCount,
          errorRecords: failedCount,
          processingMethod: 'structured' // TODO: Determine based on actual processing method
        });
      }

      res.json({
        success: successCount,
        duplicates: duplicateCount,
        failed: failedCount,
        total: files.length + urls.length,
        message: `Processed ${successCount + duplicateCount + failedCount} candidates: ${successCount} saved, ${duplicateCount} duplicates detected, ${failedCount} failed`,
        errors: errors.slice(0, 10) // Limit error messages
      });
    } catch (error) {
      console.error("Error in bulk candidate upload:", error);
      res.status(500).json({ error: "Failed to process candidate uploads" });
    }
  });

  app.post("/api/admin/upload-companies", upload.array('files', 50), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[] || [];
      const urlsText = req.body.urls || "";
      const urls = urlsText.split('\n').filter((url: string) => url.trim()).map((url: string) => url.trim());
      
      let successCount = 0;
      let failedCount = 0;
      let duplicateCount = 0;
      const errors: string[] = [];
      
      // Create ingestion job for tracking
      let ingestionJob;
      if (files.length > 0 || urls.length > 0) {
        ingestionJob = await storage.createIngestionJob({
          fileName: files.length > 0 ? files.map(f => f.originalname).join(', ') : `URL batch (${urls.length} URLs)`,
          fileType: files.length > 0 ? await detectFileType(files[0]) : 'url',
          uploadedById: 1, // TODO: Get actual user ID from session
          entityType: 'company',
          status: 'processing',
          totalRecords: 0 // Will update after processing
        });
      }

      // Process uploaded files
      for (const file of files) {
        try {
          let companiesData: any[] = [];
          
          // Determine file type with robust detection
          const detectedType = await detectFileType(file);
          console.log(`Processing company file: ${file.originalname}, detected type: ${detectedType}`);
          
          if (detectedType === 'csv') {
            companiesData = await parseCsvData(file.buffer, 'company');
            console.log(`CSV parsing result: ${companiesData.length} companies found`);
          } else if (detectedType === 'excel') {
            companiesData = await parseExcelData(file.buffer, 'company');
            console.log(`Excel parsing result: ${companiesData.length} companies found`);
          } else if (detectedType === 'html') {
            companiesData = await parseHtmlData(file.buffer, 'company');
            console.log(`HTML parsing result: ${companiesData.length} companies found`);
          } else {
            // Fall back to text parsing for PDF, DOC, TXT files
            console.log(`Using AI text parsing for file type: ${detectedType}`);
            const text = file.buffer.toString('utf-8');
            const companyData = await parseCompanyData(text);
            if (companyData) {
              companiesData = [companyData];
              console.log(`AI parsing result: 1 company found`);
            } else {
              console.log(`AI parsing failed for ${file.originalname}`);
            }
          }
          
          // Process each company record
          for (const companyData of companiesData) {
            try {
              // Check for duplicates before saving
              const duplicates = await duplicateDetectionService.findCompanyDuplicates(companyData, 75);
              
              if (duplicates.length > 0) {
                // Record duplicate detections
                await duplicateDetectionService.detectCompanyDuplicates(
                  companyData, 
                  ingestionJob?.id,
                  75
                );
                duplicateCount++;
                console.log(`Found ${duplicates.length} potential duplicates for company ${companyData.name}`);
              } else {
                // No duplicates found, save the company
                await storage.createCompany(companyData);
                successCount++;
              }
            } catch (dbError) {
              failedCount++;
              errors.push(`Failed to process company from ${file.originalname}: ${dbError}`);
            }
          }
          
          if (companiesData.length === 0) {
            failedCount++;
            errors.push(`No valid company data found in ${file.originalname}`);
          }
          
        } catch (error) {
          failedCount++;
          errors.push(`Error processing ${file.originalname}: ${error}`);
        }
      }

      // Process URLs
      for (const url of urls) {
        try {
          const companyData = await parseCompanyFromUrl(url);
          
          if (companyData) {
            // Check for duplicates
            const duplicates = await duplicateDetectionService.findCompanyDuplicates(companyData, 75);
            
            if (duplicates.length > 0) {
              await duplicateDetectionService.detectCompanyDuplicates(
                companyData, 
                ingestionJob?.id,
                75
              );
              duplicateCount++;
            } else {
              await storage.createCompany(companyData);
              successCount++;
            }
          } else {
            failedCount++;
            errors.push(`Failed to parse URL: ${url}`);
          }
        } catch (error) {
          failedCount++;
          errors.push(`Error processing URL ${url}: ${error}`);
        }
      }

      // Update ingestion job with final counts
      if (ingestionJob) {
        await storage.updateIngestionJob(ingestionJob.id, {
          status: 'completed',
          totalRecords: successCount + failedCount + duplicateCount,
          successfulRecords: successCount,
          duplicateRecords: duplicateCount,
          errorRecords: failedCount,
          processingMethod: 'structured' // TODO: Determine based on actual processing method
        });
      }

      res.json({
        success: successCount,
        duplicates: duplicateCount,
        failed: failedCount,
        total: files.length + urls.length,
        message: `Processed ${successCount + duplicateCount + failedCount} companies: ${successCount} saved, ${duplicateCount} duplicates detected, ${failedCount} failed`,
        errors: errors.slice(0, 10) // Limit error messages
      });
    } catch (error) {
      console.error("Error in bulk company upload:", error);
      res.status(500).json({ error: "Failed to process company uploads" });
    }
  });

  // Get pending duplicate detections for review
  app.get("/api/admin/duplicates", async (req, res) => {
    try {
      const { entity, status } = req.query;
      
      let duplicates;
      if (entity === 'candidate') {
        duplicates = await storage.getCandidateDuplicates(status as string);
      } else if (entity === 'company') {
        duplicates = await storage.getCompanyDuplicates(status as string);
      } else {
        // Get all duplicates
        const [candidateDuplicates, companyDuplicates] = await Promise.all([
          storage.getCandidateDuplicates(status as string),
          storage.getCompanyDuplicates(status as string)
        ]);
        duplicates = [...candidateDuplicates, ...companyDuplicates];
      }
      
      res.json(duplicates);
    } catch (error) {
      console.error("Error fetching duplicates:", error);
      res.status(500).json({ error: "Failed to fetch duplicates" });
    }
  });

  // Resolve duplicate detection
  app.post("/api/admin/duplicates/:id/resolve", async (req, res) => {
    try {
      const { id } = req.params;
      const { action, selectedId } = req.body;
      
      const resolveSchema = z.object({
        action: z.enum(['merge', 'create_new', 'skip']),
        selectedId: z.number().optional()
      });
      
      const { action: resolveAction, selectedId: mergeWithId } = resolveSchema.parse({ action, selectedId });
      
      await storage.resolveDuplicateDetection(parseInt(id), resolveAction, mergeWithId);
      
      res.json({ success: true, message: `Duplicate ${resolveAction === 'merge' ? 'merged' : resolveAction === 'create_new' ? 'created as new record' : 'skipped'}` });
    } catch (error) {
      console.error("Error resolving duplicate:", error);
      res.status(500).json({ error: "Failed to resolve duplicate" });
    }
  });

  // Bulk resolve duplicates
  app.post("/api/admin/duplicates/bulk-resolve", async (req, res) => {
    try {
      const { duplicateIds, action, selectedIds } = req.body;
      
      const bulkResolveSchema = z.object({
        duplicateIds: z.array(z.number()),
        action: z.enum(['merge', 'create_new', 'skip']),
        selectedIds: z.array(z.number()).optional()
      });
      
      const { duplicateIds: ids, action: resolveAction, selectedIds: mergeWithIds } = bulkResolveSchema.parse({ duplicateIds, action, selectedIds });
      
      let successCount = 0;
      const errors: string[] = [];
      
      for (let i = 0; i < ids.length; i++) {
        try {
          const mergeWithId = mergeWithIds?.[i];
          await storage.resolveDuplicateDetection(ids[i], resolveAction, mergeWithId);
          successCount++;
        } catch (error) {
          errors.push(`Failed to resolve duplicate ${ids[i]}: ${error}`);
        }
      }
      
      res.json({ 
        success: successCount,
        failed: errors.length,
        total: ids.length,
        errors: errors.slice(0, 10)
      });
    } catch (error) {
      console.error("Error bulk resolving duplicates:", error);
      res.status(500).json({ error: "Failed to bulk resolve duplicates" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}