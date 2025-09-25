import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import multer from "multer";

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}
import { storage } from "./storage";
import { parseJobDescription, generateCandidateLonglist, parseCandidateData, parseCandidateFromUrl, parseCompanyData, parseCompanyFromUrl } from "./ai";
import { insertJobSchema, insertCandidateSchema, insertCompanySchema } from "@shared/schema";
import { z } from "zod";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedTypes = ['text/plain', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, and TXT files are allowed.'));
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
      const errors: string[] = [];

      // Process uploaded files
      for (const file of files) {
        try {
          const text = file.buffer.toString('utf-8');
          const candidateData = await parseCandidateData(text);
          
          if (candidateData) {
            await storage.createCandidate(candidateData);
            successCount++;
          } else {
            failedCount++;
            errors.push(`Failed to parse ${file.originalname}`);
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
            await storage.createCandidate(candidateData);
            successCount++;
          } else {
            failedCount++;
            errors.push(`Failed to parse URL: ${url}`);
          }
        } catch (error) {
          failedCount++;
          errors.push(`Error processing URL ${url}: ${error}`);
        }
      }

      res.json({
        success: successCount,
        failed: failedCount,
        total: files.length + urls.length,
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
      const errors: string[] = [];

      // Process uploaded files
      for (const file of files) {
        try {
          const text = file.buffer.toString('utf-8');
          const companyData = await parseCompanyData(text);
          
          if (companyData) {
            await storage.createCompany(companyData);
            successCount++;
          } else {
            failedCount++;
            errors.push(`Failed to parse ${file.originalname}`);
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
            await storage.createCompany(companyData);
            successCount++;
          } else {
            failedCount++;
            errors.push(`Failed to parse URL: ${url}`);
          }
        } catch (error) {
          failedCount++;
          errors.push(`Error processing URL ${url}: ${error}`);
        }
      }

      res.json({
        success: successCount,
        failed: failedCount,
        total: files.length + urls.length,
        errors: errors.slice(0, 10) // Limit error messages
      });
    } catch (error) {
      console.error("Error in bulk company upload:", error);
      res.status(500).json({ error: "Failed to process company uploads" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}