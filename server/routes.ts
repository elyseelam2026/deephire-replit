import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { createRequire } from "module";
import multer from "multer";

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}
import { storage } from "./storage";
import { db } from "./db";
import { parseJobDescription, generateCandidateLonglist, parseCandidateData, parseCandidateFromUrl, parseCompanyData, parseCompanyFromUrl, parseCsvData, parseExcelData, parseHtmlData, extractUrlsFromCsv, parseCsvStructuredData, searchCandidateProfilesByName, researchCompanyEmailPattern, searchLinkedInProfile, discoverTeamMembers, verifyStagingCandidate, analyzeRoleLevel, generateBiographyAndCareerHistory, generateBiographyFromCV } from "./ai";
import { processBulkCompanyIntelligence } from "./background-jobs";
import { fileTypeFromBuffer } from 'file-type';
import { insertJobSchema, insertCandidateSchema, insertCompanySchema, verificationResults } from "@shared/schema";
import { eq } from "drizzle-orm";
import { duplicateDetectionService } from "./duplicate-detection";
import { queueBulkUrlJob, pauseJob, resumeJob, stopJob, getJobProcessingStatus, getJobControls } from "./background-jobs";
import { scrapeLinkedInProfile, generateBiographyFromLinkedInData } from "./brightdata";
import { transliterateName, inferEmail } from "./transliteration";
import { z } from "zod";
import mammoth from "mammoth";

// Lazy load pdf-parse using createRequire for CommonJS compatibility
let pdfParseFunction: any = null;
function getPdfParse() {
  if (!pdfParseFunction) {
    const require = createRequire(import.meta.url);
    const module = require("pdf-parse");
    // pdf-parse exports PDFParse as a named export
    pdfParseFunction = module.PDFParse || module;
  }
  return pdfParseFunction;
}

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

  // Get deleted candidates (recycling bin) - MUST come before /:id routes
  app.get("/api/candidates/recycling-bin", async (req, res) => {
    try {
      const deletedCandidates = await storage.getDeletedCandidates();
      res.json(deletedCandidates);
    } catch (error) {
      console.error("Error fetching deleted candidates:", error);
      res.status(500).json({ error: "Failed to fetch deleted candidates" });
    }
  });

  // Restore candidate from recycling bin - MUST come before /:id routes
  app.post("/api/candidates/:id/restore", async (req, res) => {
    try {
      const candidateId = parseInt(req.params.id);
      const restoredCandidate = await storage.restoreCandidate(candidateId);
      
      if (!restoredCandidate) {
        return res.status(404).json({ error: "Candidate not found in recycling bin" });
      }

      res.json({ success: true, message: "Candidate restored successfully", candidate: restoredCandidate });
    } catch (error) {
      console.error("Error restoring candidate:", error);
      res.status(500).json({ error: "Failed to restore candidate" });
    }
  });

  // Permanently delete candidate - MUST come before /:id routes
  app.delete("/api/candidates/:id/permanent", async (req, res) => {
    try {
      const candidateId = parseInt(req.params.id);
      await storage.permanentlyDeleteCandidate(candidateId);
      res.json({ success: true, message: "Candidate permanently deleted" });
    } catch (error) {
      console.error("Error permanently deleting candidate:", error);
      res.status(500).json({ error: "Failed to permanently delete candidate" });
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

  // Update candidate endpoint
  app.patch("/api/candidates/:id", async (req, res) => {
    try {
      const candidateId = parseInt(req.params.id);
      const candidate = await storage.getCandidate(candidateId);
      
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }

      // Define allowed fields for update
      const allowedFields = [
        'firstName', 'lastName', 'nativeName', 'latinName', 'nativeNameLocale',
        'email', 'linkedinUrl', 'currentCompany', 'currentTitle', 'location',
        'biography', 'displayName', 'emailFirstName', 'emailLastName'
      ];

      // Filter and sanitize update data
      const updateData: any = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }

      // Validate at least one field is being updated
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: "No valid fields provided for update" });
      }

      const updatedCandidate = await storage.updateCandidate(candidateId, updateData);
      res.json(updatedCandidate);
    } catch (error) {
      console.error("Error updating candidate:", error);
      res.status(500).json({ error: "Failed to update candidate" });
    }
  });

  // Add note to candidate's interaction history
  app.post("/api/candidates/:id/notes", async (req, res) => {
    try {
      const candidateId = parseInt(req.params.id);
      const candidate = await storage.getCandidate(candidateId);
      
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }

      const { type, content } = req.body;
      
      if (!content || !content.trim()) {
        return res.status(400).json({ error: "Note content is required" });
      }

      // Get existing interaction history or initialize empty array
      const interactionHistory = (candidate.interactionHistory as any[]) || [];
      
      // Create new note
      const newNote = {
        id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: type || 'note',
        content: content.trim(),
        createdAt: new Date().toISOString(),
      };
      
      // Add note to beginning of array (most recent first)
      interactionHistory.unshift(newNote);
      
      // Update candidate with new interaction history
      const updatedCandidate = await storage.updateCandidate(candidateId, {
        interactionHistory: interactionHistory as any
      });
      
      res.json(updatedCandidate);
    } catch (error) {
      console.error("Error adding note:", error);
      res.status(500).json({ error: "Failed to add note" });
    }
  });

  // Delete candidate endpoint (soft delete - moves to recycling bin)
  app.delete("/api/candidates/:id", async (req, res) => {
    try {
      const candidateId = parseInt(req.params.id);
      const candidate = await storage.getCandidate(candidateId);
      
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }

      await storage.deleteCandidate(candidateId);
      res.json({ success: true, message: "Candidate moved to recycling bin" });
    } catch (error) {
      console.error("Error deleting candidate:", error);
      res.status(500).json({ error: "Failed to delete candidate" });
    }
  });

  // Helper function to extract text from CV files
  async function extractCvText(file: Express.Multer.File): Promise<string> {
    const fileName = file.originalname.toLowerCase();
    const mimeType = file.mimetype;

    try {
      // PDF files
      if (fileName.endsWith('.pdf') || mimeType === 'application/pdf') {
        const parse = getPdfParse();
        const pdfData = await parse(file.buffer);
        return pdfData.text;
      }

      // Word documents (.docx)
      if (fileName.endsWith('.docx') || 
          mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const result = await mammoth.extractRawText({ buffer: file.buffer });
        return result.value;
      }

      // Word documents (.doc) - older format
      if (fileName.endsWith('.doc') || mimeType === 'application/msword') {
        // mammoth doesn't support .doc, fallback to text extraction
        return file.buffer.toString('utf-8');
      }

      // Plain text files
      if (fileName.endsWith('.txt') || mimeType === 'text/plain') {
        return file.buffer.toString('utf-8');
      }

      // Unsupported format - try text extraction as fallback
      return file.buffer.toString('utf-8');
    } catch (error) {
      console.error(`Error extracting text from ${fileName}:`, error);
      throw new Error(`Failed to extract text from ${fileName}. Supported formats: PDF, DOCX, TXT`);
    }
  }

  // Upload candidate CV endpoint
  app.post("/api/candidates/upload-cv", upload.single('file'), async (req: MulterRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Extract text using appropriate parser based on file type
      const cvText = await extractCvText(req.file);
      const { candidateId } = req.body;

      if (!cvText || cvText.trim().length === 0) {
        return res.status(400).json({ 
          error: "Could not extract text from file. Please ensure the file contains readable text." 
        });
      }

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
      const errorMessage = error instanceof Error ? error.message : "Failed to process CV";
      res.status(500).json({ error: errorMessage });
    }
  });

  // Retroactive processing endpoints - process existing "Data Only" candidates
  
  // Process career history for an existing candidate
  app.post("/api/candidates/:id/process-career", async (req, res) => {
    try {
      const candidateId = parseInt(req.params.id);
      const candidate = await storage.getCandidate(candidateId);
      
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }

      if (!candidate.linkedinUrl) {
        return res.status(400).json({ error: "Candidate has no LinkedIn URL" });
      }

      console.log(`\n🔄 [Retroactive Processing] Career Only for ${candidate.firstName} ${candidate.lastName}`);
      console.log(`LinkedIn URL: ${candidate.linkedinUrl}`);

      // Scrape LinkedIn profile
      const profileData = await scrapeLinkedInProfile(candidate.linkedinUrl);
      
      // Extract and flatten career history from LinkedIn experience data
      // Bright Data returns complex nested structure - need to flatten it
      const careerHistory: any[] = [];
      for (const exp of (profileData.experience || [])) {
        // Check if this entry has nested positions (multiple roles at same company)
        if ((exp as any).positions && Array.isArray((exp as any).positions)) {
          // Flatten each position into separate entries
          for (const position of (exp as any).positions) {
            careerHistory.push({
              title: position.title || exp.title || '',
              company: exp.company || '',
              startDate: position.start_date || '',
              endDate: position.end_date || '',
              description: position.description_html || exp.description,
              location: position.location || exp.location
            });
          }
        } else {
          // Single position format
          careerHistory.push({
            title: exp.title || '',
            company: exp.company || '',
            startDate: exp.start_date || '',
            endDate: exp.end_date || '',
            description: exp.description,
            location: exp.location
          });
        }
      }
      
      // Extract and transliterate name using enterprise-grade transliteration service
      const fullName = profileData.name || `${candidate.firstName} ${candidate.lastName}`;
      const transliteration = transliterateName(fullName);
      
      // Legacy firstName/lastName for backward compatibility
      const firstName = (profileData as any).first_name || transliteration.emailFirstName || candidate.firstName;
      const lastName = (profileData as any).last_name || transliteration.emailLastName || candidate.lastName;
      
      // Infer email using transliterated name (ASCII-safe)
      let inferredEmail = candidate.email;
      let emailStatus = candidate.emailStatus || 'inferred';
      let emailSource = candidate.emailSource || 'domain_pattern';
      
      const companyName = profileData.current_company_name || (profileData.current_company as any)?.name;
      if (!inferredEmail && companyName) {
        const emailData = inferEmail(fullName, companyName);
        inferredEmail = emailData.email;
        emailStatus = emailData.emailStatus;
        emailSource = emailData.emailSource;
      }
      
      // Update candidate with all available data from LinkedIn
      const updatedCandidate = await storage.updateCandidate(candidateId, {
        firstName,
        lastName,
        nativeName: fullName,
        nativeNameLocale: transliteration.locale,
        latinName: transliteration.latinName,
        transliterationMethod: transliteration.method,
        transliterationConfidence: transliteration.confidence,
        emailFirstName: transliteration.emailFirstName,
        emailLastName: transliteration.emailLastName,
        displayName: fullName,
        email: inferredEmail,
        location: profileData.city && profileData.country_code 
          ? `${profileData.city}, ${profileData.country_code}` 
          : candidate.location,
        currentCompany: profileData.current_company_name || profileData.current_company || candidate.currentCompany,
        currentTitle: profileData.position || candidate.currentTitle,
        skills: profileData.skills || candidate.skills,
        careerHistory,
        bioSource: 'brightdata',
        bioStatus: 'not_generated',
        emailStatus,
        emailSource,
        processingMode: 'career_only'
      });

      console.log(`✅ [Retroactive Processing] Career data fetched for ${candidate.firstName} ${candidate.lastName} (${careerHistory.length} positions)`);
      
      res.json({ 
        success: true, 
        candidate: updatedCandidate,
        message: "Career history fetched successfully"
      });
    } catch (error) {
      console.error("Error processing career history:", error);
      res.status(500).json({ error: "Failed to process career history" });
    }
  });

  // Generate biography for an existing candidate
  app.post("/api/candidates/:id/process-biography", async (req, res) => {
    try {
      const candidateId = parseInt(req.params.id);
      const candidate = await storage.getCandidate(candidateId);
      
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }

      if (!candidate.linkedinUrl) {
        return res.status(400).json({ error: "Candidate has no LinkedIn URL" });
      }

      console.log(`\n🔄 [Retroactive Processing] Bio Only for ${candidate.firstName} ${candidate.lastName}`);
      console.log(`LinkedIn URL: ${candidate.linkedinUrl}`);

      // Scrape LinkedIn profile
      const profileData = await scrapeLinkedInProfile(candidate.linkedinUrl);
      
      // Generate biography only
      const biography = await generateBiographyFromLinkedInData(profileData);
      
      // Extract and transliterate name using enterprise-grade transliteration service
      const fullName = profileData.name || `${candidate.firstName} ${candidate.lastName}`;
      const transliteration = transliterateName(fullName);
      
      // Legacy firstName/lastName for backward compatibility
      const firstName = (profileData as any).first_name || transliteration.emailFirstName || candidate.firstName;
      const lastName = (profileData as any).last_name || transliteration.emailLastName || candidate.lastName;
      
      // Infer email using transliterated name (ASCII-safe)
      let inferredEmail = candidate.email;
      let emailStatus = candidate.emailStatus || 'inferred';
      let emailSource = candidate.emailSource || 'domain_pattern';
      
      const companyName = profileData.current_company_name || (profileData.current_company as any)?.name;
      if (!inferredEmail && companyName) {
        const emailData = inferEmail(fullName, companyName);
        inferredEmail = emailData.email;
        emailStatus = emailData.emailStatus;
        emailSource = emailData.emailSource;
      }
      
      // Update candidate with all available data
      const updatedCandidate = await storage.updateCandidate(candidateId, {
        firstName,
        lastName,
        nativeName: fullName,
        nativeNameLocale: transliteration.locale,
        latinName: transliteration.latinName,
        transliterationMethod: transliteration.method,
        transliterationConfidence: transliteration.confidence,
        emailFirstName: transliteration.emailFirstName,
        emailLastName: transliteration.emailLastName,
        displayName: fullName,
        email: inferredEmail,
        location: profileData.city && profileData.country_code 
          ? `${profileData.city}, ${profileData.country_code}` 
          : candidate.location,
        currentCompany: profileData.current_company_name || profileData.current_company || candidate.currentCompany,
        currentTitle: profileData.position || candidate.currentTitle,
        skills: profileData.skills || candidate.skills,
        biography,
        bioSource: 'brightdata',
        bioStatus: 'verified',
        emailStatus,
        emailSource,
        processingMode: 'bio_only'
      });

      console.log(`✅ [Retroactive Processing] Biography generated for ${candidate.firstName} ${candidate.lastName}`);
      
      res.json({ 
        success: true, 
        candidate: updatedCandidate,
        message: "Biography generated successfully"
      });
    } catch (error) {
      console.error("Error generating biography:", error);
      res.status(500).json({ error: "Failed to generate biography" });
    }
  });

  // Full processing for an existing candidate (career + biography)
  app.post("/api/candidates/:id/process-full", async (req, res) => {
    try {
      const candidateId = parseInt(req.params.id);
      const candidate = await storage.getCandidate(candidateId);
      
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }

      if (!candidate.linkedinUrl) {
        return res.status(400).json({ error: "Candidate has no LinkedIn URL" });
      }

      console.log(`\n🔄 [Retroactive Processing] Full Processing for ${candidate.firstName} ${candidate.lastName}`);
      console.log(`LinkedIn URL: ${candidate.linkedinUrl}`);

      // Scrape LinkedIn profile
      const profileData = await scrapeLinkedInProfile(candidate.linkedinUrl);
      
      // Generate biography and career history
      const bioResult = await generateBiographyAndCareerHistory(
        candidate.firstName,
        candidate.lastName,
        profileData,
        candidate.cvText ?? undefined
      );
      
      if (bioResult) {
        // Extract and transliterate name using enterprise-grade transliteration service
        const fullName = profileData.name || `${candidate.firstName} ${candidate.lastName}`;
        const transliteration = transliterateName(fullName);
        
        // Legacy firstName/lastName for backward compatibility
        const firstName = (profileData as any).first_name || transliteration.emailFirstName || candidate.firstName;
        const lastName = (profileData as any).last_name || transliteration.emailLastName || candidate.lastName;
        
        // Infer email using transliterated name (ASCII-safe)
        let inferredEmail = candidate.email;
        let emailStatus = candidate.emailStatus || 'inferred';
        let emailSource = candidate.emailSource || 'domain_pattern';
        
        const companyName = profileData.current_company_name || (profileData.current_company as any)?.name;
        if (!inferredEmail && companyName) {
          const emailData = inferEmail(fullName, companyName);
          inferredEmail = emailData.email;
          emailStatus = emailData.emailStatus;
          emailSource = emailData.emailSource;
        }
        
        // Update candidate with all available data
        const updatedCandidate = await storage.updateCandidate(candidateId, {
          firstName,
          lastName,
          nativeName: fullName,
          nativeNameLocale: transliteration.locale,
          latinName: transliteration.latinName,
          transliterationMethod: transliteration.method,
          transliterationConfidence: transliteration.confidence,
          emailFirstName: transliteration.emailFirstName,
          emailLastName: transliteration.emailLastName,
          displayName: fullName,
          email: inferredEmail,
          location: profileData.city && profileData.country_code 
            ? `${profileData.city}, ${profileData.country_code}` 
            : candidate.location,
          currentCompany: profileData.current_company_name || profileData.current_company || candidate.currentCompany,
          currentTitle: profileData.position || candidate.currentTitle,
          skills: profileData.skills || candidate.skills,
          biography: bioResult.biography,
          careerHistory: bioResult.careerHistory,
          bioSource: 'brightdata',
          bioStatus: 'verified',
          emailStatus,
          emailSource,
          processingMode: 'full'
        });

        console.log(`✅ [Retroactive Processing] Full processing complete for ${candidate.firstName} ${candidate.lastName}`);
        
        res.json({ 
          success: true, 
          candidate: updatedCandidate,
          message: "Full processing complete"
        });
      } else {
        throw new Error("Failed to generate biography and career history");
      }
    } catch (error) {
      console.error("Error in full processing:", error);
      res.status(500).json({ error: "Failed to complete full processing" });
    }
  });

  // Get companies endpoint
  app.get("/api/companies", async (req, res) => {
    try {
      const { showAll } = req.query;
      const onlyHeadquarters = showAll !== 'true'; // Default to showing only headquarters
      const companies = await storage.getCompanies(onlyHeadquarters);
      res.json(companies);
    } catch (error) {
      console.error("Error fetching companies:", error);
      res.status(500).json({ error: "Failed to fetch companies" });
    }
  });

  // Search companies endpoint - smart search with office matching
  app.get("/api/companies/search", async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: "Search query required" });
      }
      const results = await storage.searchCompanies(q);
      res.json(results);
    } catch (error) {
      console.error("Error searching companies:", error);
      res.status(500).json({ error: "Failed to search companies" });
    }
  });

  // Get single company by ID
  app.get("/api/companies/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const companies = await storage.getCompanies(false); // Get all companies including offices
      const company = companies.find(c => c.id === parseInt(id));
      
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }
      
      res.json(company);
    } catch (error) {
      console.error("Error fetching company:", error);
      res.status(500).json({ error: "Failed to fetch company" });
    }
  });

  // Get child companies for a parent
  app.get("/api/companies/:id/children", async (req, res) => {
    try {
      const { id } = req.params;
      const childCompanies = await storage.getChildCompanies(parseInt(id));
      res.json(childCompanies);
    } catch (error) {
      console.error("Error fetching child companies:", error);
      res.status(500).json({ error: "Failed to fetch child companies" });
    }
  });

  // Get parent company for a child
  app.get("/api/companies/:id/parent", async (req, res) => {
    try {
      const { id } = req.params;
      const parentCompany = await storage.getParentCompany(parseInt(id));
      res.json(parentCompany || null);
    } catch (error) {
      console.error("Error fetching parent company:", error);
      res.status(500).json({ error: "Failed to fetch parent company" });
    }
  });

  // Convert company to hierarchy (create child companies from office locations)
  app.post("/api/companies/:id/convert-to-hierarchy", async (req, res) => {
    try {
      const { id } = req.params;
      const result = await storage.convertCompanyToHierarchy(parseInt(id));
      res.json({ 
        success: true, 
        parent: result.parent, 
        childrenCreated: result.children.length,
        children: result.children 
      });
    } catch (error) {
      console.error("Error converting company to hierarchy:", error);
      res.status(500).json({ error: "Failed to convert company to hierarchy" });
    }
  });

  // Refresh company information from website
  app.post("/api/companies/:id/refresh-info", async (req, res) => {
    try {
      const { id } = req.params;
      const companies = await storage.getCompanies();
      const targetCompany = companies.find(c => c.id === parseInt(id));
      
      if (!targetCompany) {
        return res.status(404).json({ error: "Company not found" });
      }

      if (!targetCompany.website) {
        return res.status(400).json({ error: "Company website not available" });
      }

      console.log(`🔄 Refreshing company information for ${targetCompany.name} from ${targetCompany.website}`);
      
      // Fetch fresh data from website using AI
      const freshData = await parseCompanyFromUrl(targetCompany.website);
      
      if (!freshData) {
        return res.status(400).json({ error: "Failed to extract company information from website" });
      }

      // Update company with fresh data (preserve ID and other important fields)
      const updatedCompany = await storage.updateCompany(parseInt(id), {
        name: freshData.name || targetCompany.name,
        missionStatement: freshData.missionStatement || targetCompany.missionStatement,
        industry: freshData.industry || targetCompany.industry,
        location: freshData.location || targetCompany.location,
        headquarters: freshData.headquarters || targetCompany.headquarters,
        officeLocations: freshData.officeLocations || targetCompany.officeLocations,
        primaryPhone: freshData.primaryPhone || targetCompany.primaryPhone,
        stage: freshData.stage || targetCompany.stage,
        employeeSize: freshData.employeeSize || targetCompany.employeeSize,
        subsector: freshData.subsector || targetCompany.subsector,
        annualRevenue: freshData.annualRevenue || targetCompany.annualRevenue,
      });

      console.log(`✅ Successfully refreshed company information for ${targetCompany.name}`);
      
      res.json({ 
        success: true,
        company: updatedCompany,
        message: "Company information updated successfully from website"
      });
    } catch (error) {
      console.error("Error refreshing company information:", error);
      res.status(500).json({ error: "Failed to refresh company information" });
    }
  });

  // Discover team members from company website
  app.post("/api/companies/:id/discover-team", async (req, res) => {
    try {
      const { id } = req.params;
      const company = await storage.getCompanies();
      const targetCompany = company.find(c => c.id === parseInt(id));
      
      if (!targetCompany) {
        return res.status(404).json({ error: "Company not found" });
      }

      if (!targetCompany.website) {
        return res.status(400).json({ error: "Company website not available" });
      }

      console.log(`Discovering team members for ${targetCompany.name} from ${targetCompany.website}`);
      const teamMembers = await discoverTeamMembers(targetCompany.website);
      
      res.json({ 
        success: true,
        companyId: parseInt(id),
        companyName: targetCompany.name,
        teamMembers 
      });
    } catch (error) {
      console.error("Error discovering team members:", error);
      res.status(500).json({ error: "Failed to discover team members" });
    }
  });

  // Import selected team members as candidates (ChatGPT's Staging → Verification → Production pipeline)
  app.post("/api/companies/:id/import-team-members", async (req, res) => {
    try {
      const { id } = req.params;
      const { teamMembers } = req.body;

      if (!Array.isArray(teamMembers) || teamMembers.length === 0) {
        return res.status(400).json({ error: "No team members provided" });
      }

      const company = await storage.getCompanies();
      const targetCompany = company.find(c => c.id === parseInt(id));
      
      if (!targetCompany) {
        return res.status(404).json({ error: "Company not found" });
      }

      const stagingCandidates = [];
      const errors = [];

      // Get existing candidates for duplicate detection
      const existingCandidates = await storage.getCandidates();

      for (const member of teamMembers) {
        try {
          // Split name into first and last
          const nameParts = member.name.trim().split(' ');
          const firstName = nameParts[0];
          const lastName = nameParts.slice(1).join(' ') || nameParts[0]; // Use first name as last if only one name

          // Extract domain from company website
          let companyDomain = null;
          if (targetCompany.website) {
            const domainMatch = targetCompany.website.match(/^https?:\/\/(?:www\.)?([^\/]+)/);
            companyDomain = domainMatch ? domainMatch[1] : null;
          }

          // STEP 1: Save to staging_candidates (ChatGPT's "Raw/Staging Database")
          const stagingData = {
            firstName,
            lastName,
            fullName: `${firstName} ${lastName}`,
            currentCompany: targetCompany.name,
            currentTitle: member.title || 'Team Member',
            bioUrl: member.bioUrl || null,
            linkedinUrl: member.linkedinUrl || null,
            companyDomain,
            companyId: parseInt(id),
            sourceType: 'team_discovery',
            sourceUrl: targetCompany.website || '',
            verificationStatus: 'pending',
            scrapedAt: new Date(),
          };

          const stagingCandidate = await storage.createStagingCandidate(stagingData);
          
          // STEP 2: Run AI verification (ChatGPT's "Verification Layer")
          console.log(`🔍 Running verification for ${firstName} ${lastName}...`);
          const verificationResult = await verifyStagingCandidate({
            ...stagingCandidate,
            currentCompany: stagingCandidate.currentCompany || targetCompany.name
          }, existingCandidates);
          
          // STEP 3: Save verification results
          // Map verificationStatus to recommendedAction
          const recommendedAction = 
            verificationResult.verificationStatus === 'verified' ? 'approve' :
            verificationResult.verificationStatus === 'duplicate' ? 'reject' :
            verificationResult.verificationStatus === 'rejected' ? 'reject' : 'review';
          
          await storage.createVerificationResult({
            stagingCandidateId: stagingCandidate.id,
            linkedinExists: verificationResult.linkedinExists,
            linkedinUrl: verificationResult.linkedinUrl || null,
            linkedinCompanyMatch: verificationResult.linkedinCompanyMatch,
            linkedinCurrentRole: verificationResult.linkedinTitleMatch,
            bioUrlValid: verificationResult.bioUrlValid,
            bioUrlHttpStatus: verificationResult.bioUrlAccessible ? 200 : null,
            emailPatternMatch: verificationResult.emailPatternMatch,
            inferredEmail: verificationResult.inferredEmail || null,
            isDuplicate: verificationResult.isDuplicate,
            duplicateOfCandidateId: verificationResult.duplicateOfCandidateId || null,
            duplicateMatchScore: verificationResult.duplicateMatchScore || null,
            employmentStatus: verificationResult.employmentStatus || null,
            employmentStatusSource: verificationResult.employmentStatusSource || null,
            titleConsistent: verificationResult.titleConsistency,
            webMentionsFound: verificationResult.webMentionsFound,
            confidenceScore: verificationResult.confidenceScore,
            recommendedAction,
            aiReasoning: verificationResult.verificationNotes,
          });
          
          // Update staging candidate with confidence score
          await storage.updateStagingCandidate(stagingCandidate.id, {
            confidenceScore: verificationResult.confidenceScore,
            verificationStatus: verificationResult.confidenceScore >= 0.85 ? 'verified' : 'pending_review',
          });
          
          // TASK 3: Save to organization chart (for org intelligence)
          const roleAnalysis = analyzeRoleLevel(member.title || 'Team Member');
          await storage.createOrgChartEntry({
            companyId: parseInt(id),
            candidateId: null, // Will be linked when promoted to production
            firstName,
            lastName,
            fullName: `${firstName} ${lastName}`,
            title: member.title || 'Team Member',
            department: roleAnalysis.department,
            level: roleAnalysis.level,
            isCLevel: roleAnalysis.isCLevel,
            isExecutive: roleAnalysis.isExecutive,
            discoveredFrom: 'team_page',
            linkedinUrl: member.linkedinUrl || verificationResult.linkedinUrl || null,
            bioUrl: member.bioUrl || null,
            email: verificationResult.inferredEmail || null,
            isActive: true,
          });
          
          // STEP 4: Auto-promote high-confidence candidates (≥85%)
          const AUTO_PROMOTE_THRESHOLD = 0.85;
          if (verificationResult.confidenceScore >= AUTO_PROMOTE_THRESHOLD && !verificationResult.isDuplicate) {
            console.log(`✅ Auto-promoting ${firstName} ${lastName} (confidence: ${(verificationResult.confidenceScore * 100).toFixed(1)}%)`);
            const productionCandidate = await storage.promoteToProduction(stagingCandidate.id);
            
            // Add promoted candidate to existingCandidates to prevent duplicates in same batch
            existingCandidates.push(productionCandidate);
            
            stagingCandidates.push({ 
              ...stagingCandidate, 
              promoted: true, 
              productionId: productionCandidate.id,
              confidenceScore: verificationResult.confidenceScore 
            });
          } else {
            console.log(`⏸ Holding ${firstName} ${lastName} for review (confidence: ${(verificationResult.confidenceScore * 100).toFixed(1)}%)`);
            stagingCandidates.push({ 
              ...stagingCandidate, 
              promoted: false,
              confidenceScore: verificationResult.confidenceScore 
            });
          }
        } catch (error) {
          console.error(`Error processing ${member.name}:`, error);
          errors.push({ name: member.name, error: String(error) });
        }
      }

      res.json({
        success: true,
        imported: stagingCandidates.length,
        autoPromoted: stagingCandidates.filter(c => c.promoted).length,
        pendingReview: stagingCandidates.filter(c => !c.promoted).length,
        stagingCandidates,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      console.error("Error importing team members:", error);
      res.status(500).json({ error: "Failed to import team members" });
    }
  });

  // Staging Candidates API Routes (ChatGPT's Verification Pipeline)
  
  // Get all staging candidates with optional filters
  app.get("/api/staging-candidates", async (req, res) => {
    try {
      const { status, companyId, includeVerified } = req.query;
      
      const filters: any = {};
      if (status) filters.verificationStatus = status as string; // Fix: use verificationStatus not status
      if (companyId) filters.companyId = parseInt(companyId as string);
      
      // By default, exclude verified candidates (already in production)
      // Only include them if explicitly requested
      if (!includeVerified && !status) {
        filters.excludeVerified = true;
      }
      
      const stagingCandidates = await storage.getStagingCandidates(filters);
      
      // Enrich with verification results
      const enriched = await Promise.all(
        stagingCandidates.map(async (candidate) => {
          const verificationResult = await storage.getVerificationResult(candidate.id);
          return {
            ...candidate,
            verificationResult
          };
        })
      );
      
      res.json(enriched);
    } catch (error) {
      console.error("Error fetching staging candidates:", error);
      res.status(500).json({ error: "Failed to fetch staging candidates" });
    }
  });
  
  // Get single staging candidate with verification details
  app.get("/api/staging-candidates/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const stagingCandidate = await storage.getStagingCandidate(parseInt(id));
      
      if (!stagingCandidate) {
        return res.status(404).json({ error: "Staging candidate not found" });
      }
      
      const verificationResult = await storage.getVerificationResult(stagingCandidate.id);
      
      res.json({
        ...stagingCandidate,
        verificationResult
      });
    } catch (error) {
      console.error("Error fetching staging candidate:", error);
      res.status(500).json({ error: "Failed to fetch staging candidate" });
    }
  });
  
  // Manually trigger verification for a staging candidate
  app.post("/api/staging-candidates/:id/verify", async (req, res) => {
    try {
      const { id } = req.params;
      const stagingCandidate = await storage.getStagingCandidate(parseInt(id));
      
      if (!stagingCandidate) {
        return res.status(404).json({ error: "Staging candidate not found" });
      }
      
      // Get existing candidates for duplicate detection
      const existingCandidates = await storage.getCandidates();
      
      // Run verification
      console.log(`🔍 Running manual verification for ${stagingCandidate.firstName} ${stagingCandidate.lastName}...`);
      const verificationResult = await verifyStagingCandidate({
        ...stagingCandidate,
        currentCompany: stagingCandidate.currentCompany || ''
      }, existingCandidates);
      
      // Check if verification result already exists
      const existingVerification = await storage.getVerificationResult(stagingCandidate.id);
      
      if (existingVerification) {
        // Update existing verification result (delete and recreate due to unique constraint)
        await db.delete(verificationResults).where(eq(verificationResults.stagingCandidateId, stagingCandidate.id));
      }
      
      // Create new verification result
      const recommendedAction = 
        verificationResult.verificationStatus === 'verified' ? 'approve' :
        verificationResult.verificationStatus === 'duplicate' ? 'reject' :
        verificationResult.verificationStatus === 'rejected' ? 'reject' : 'review';
      
      await storage.createVerificationResult({
        stagingCandidateId: stagingCandidate.id,
        linkedinExists: verificationResult.linkedinExists,
        linkedinUrl: verificationResult.linkedinUrl || null,
        linkedinCompanyMatch: verificationResult.linkedinCompanyMatch,
        linkedinCurrentRole: verificationResult.linkedinTitleMatch,
        bioUrlValid: verificationResult.bioUrlValid,
        bioUrlHttpStatus: verificationResult.bioUrlAccessible ? 200 : null,
        emailPatternMatch: verificationResult.emailPatternMatch,
        inferredEmail: verificationResult.inferredEmail || null,
        isDuplicate: verificationResult.isDuplicate,
        duplicateOfCandidateId: verificationResult.duplicateOfCandidateId || null,
        duplicateMatchScore: verificationResult.duplicateMatchScore || null,
        employmentStatus: verificationResult.employmentStatus || null,
        employmentStatusSource: verificationResult.employmentStatusSource || null,
        titleConsistent: verificationResult.titleConsistency,
        webMentionsFound: verificationResult.webMentionsFound,
        confidenceScore: verificationResult.confidenceScore,
        recommendedAction,
        aiReasoning: verificationResult.verificationNotes,
      });
      
      // Update staging candidate with status from verification result
      await storage.updateStagingCandidate(stagingCandidate.id, {
        confidenceScore: verificationResult.confidenceScore,
        verificationStatus: verificationResult.verificationStatus, // Use status from AI verification
      });
      
      res.json({
        success: true,
        verificationResult
      });
    } catch (error) {
      console.error("Error verifying staging candidate:", error);
      res.status(500).json({ error: "Failed to verify staging candidate" });
    }
  });
  
  // Approve staging candidate and promote to production
  app.post("/api/staging-candidates/:id/approve", async (req, res) => {
    try {
      const { id } = req.params;
      const stagingCandidate = await storage.getStagingCandidate(parseInt(id));
      
      if (!stagingCandidate) {
        return res.status(404).json({ error: "Staging candidate not found" });
      }
      
      if (stagingCandidate.verificationStatus === 'verified' && stagingCandidate.movedToProductionAt) {
        return res.status(400).json({ error: "Candidate already promoted to production" });
      }
      
      // Promote to production
      console.log(`✅ Manual approval: Promoting ${stagingCandidate.firstName} ${stagingCandidate.lastName} to production`);
      const productionCandidate = await storage.promoteToProduction(stagingCandidate.id);
      
      res.json({
        success: true,
        productionCandidate
      });
    } catch (error) {
      console.error("Error approving staging candidate:", error);
      res.status(500).json({ error: "Failed to approve staging candidate" });
    }
  });
  
  // Reject staging candidate (delete from staging)
  app.post("/api/staging-candidates/:id/reject", async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      
      const stagingCandidate = await storage.getStagingCandidate(parseInt(id));
      
      if (!stagingCandidate) {
        return res.status(404).json({ error: "Staging candidate not found" });
      }
      
      // Update status to rejected before deletion (for audit trail if needed)
      await storage.updateStagingCandidate(parseInt(id), {
        verificationStatus: 'rejected',
      });
      
      // Delete staging candidate
      console.log(`❌ Rejecting ${stagingCandidate.firstName} ${stagingCandidate.lastName}. Reason: ${reason || 'Not specified'}`);
      await storage.deleteStagingCandidate(parseInt(id));
      
      res.json({
        success: true,
        message: "Staging candidate rejected"
      });
    } catch (error) {
      console.error("Error rejecting staging candidate:", error);
      res.status(500).json({ error: "Failed to reject staging candidate" });
    }
  });

  // Update company
  app.put("/api/companies/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const updated = await storage.updateCompany(parseInt(id), updates);
      
      if (!updated) {
        return res.status(404).json({ error: "Company not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error updating company:", error);
      res.status(500).json({ error: "Failed to update company" });
    }
  });

  // Delete company
  app.delete("/api/companies/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if company has child offices
      const children = await storage.getChildCompanies(parseInt(id));
      if (children.length > 0) {
        return res.status(400).json({ error: "Cannot delete company with office locations. Delete offices first." });
      }

      await storage.deleteCompany(parseInt(id));
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting company:", error);
      
      // Check if it's a foreign key constraint error (company has jobs)
      if (error.code === '23503' && error.constraint === 'jobs_company_id_companies_id_fk') {
        return res.status(400).json({ error: "Cannot delete company with linked jobs. Delete all jobs for this company first." });
      }
      
      res.status(500).json({ error: "Failed to delete company" });
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

  // Organization Chart endpoints
  app.get("/api/companies/:id/org-chart", async (req, res) => {
    try {
      const companyId = parseInt(req.params.id);
      const orgChart = await storage.getOrgChartForCompany(companyId);
      res.json(orgChart);
    } catch (error) {
      console.error("Error fetching org chart:", error);
      res.status(500).json({ error: "Failed to fetch organization chart" });
    }
  });

  // Admin bulk upload endpoints
  app.post("/api/admin/upload-candidates", upload.array('files', 50), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[] || [];
      const urlsText = req.body.urls || "";
      const urls = urlsText.split('\n').filter((url: string) => url.trim()).map((url: string) => url.trim());
      const processingMode = req.body.processingMode || 'full'; // full, career_only, bio_only, data_only
      
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
          uploadedById: null, // TODO: Get actual user ID from session when authentication is implemented
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
            // Extract URLs from CSV for background processing
            const csvUrls = await extractUrlsFromCsv(file.buffer);
            
            // Add CSV URLs to the URL batch for background processing
            if (csvUrls.length > 0) {
              urls.push(...csvUrls);
              console.log(`Found ${csvUrls.length} URLs in CSV file: ${file.originalname}`);
            }
            
            // Process only structured data from CSV (not URLs)
            candidatesData = await parseCsvStructuredData(file.buffer, 'candidate');
            console.log(`CSV structured data result: ${candidatesData.length} candidates found`);
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
              const duplicates = await duplicateDetectionService.findCandidateDuplicates(candidateData);
              
              if (duplicates.length > 0) {
                // Record duplicate detections
                await duplicateDetectionService.detectCandidateDuplicates(
                  candidateData, 
                  ingestionJob?.id
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

      // Process URLs using background job system for scalability
      if (urls.length > 0 && ingestionJob) {
        console.log(`Queuing background processing for ${urls.length} URLs in ${processingMode} mode (job ID: ${ingestionJob.id})`);
        
        // Use background job processing for URLs (handles 800+ efficiently)
        await queueBulkUrlJob(ingestionJob.id, urls, {
          batchSize: 10, // Process 10 URLs per batch
          concurrency: 3, // 3 concurrent requests per batch
          processingMode: processingMode as 'full' | 'career_only' | 'bio_only' | 'data_only'
        });
        
        // Update ingestion job to show it's being processed in background
        await storage.updateIngestionJob(ingestionJob.id, {
          status: 'processing',
          totalRecords: urls.length,
          processingMethod: 'background_concurrent'
        });
      }

      // Update ingestion job with final counts for files (URLs handled in background)
      if (ingestionJob && urls.length === 0) {
        // Only files were processed, mark as completed
        await storage.updateIngestionJob(ingestionJob.id, {
          status: 'completed',
          totalRecords: successCount + failedCount + duplicateCount,
          successfulRecords: successCount,
          duplicateRecords: duplicateCount,
          errorRecords: failedCount,
          processingMethod: 'structured'
        });
      }

      // Prepare response based on what was processed
      const responseMessage = urls.length > 0 
        ? `Files processed: ${successCount} saved, ${duplicateCount} duplicates, ${failedCount} failed. ${urls.length} URLs queued for background processing.`
        : `Processed ${successCount + duplicateCount + failedCount} candidates: ${successCount} saved, ${duplicateCount} duplicates detected, ${failedCount} failed`;

      res.json({
        success: successCount,
        duplicates: duplicateCount,
        failed: failedCount,
        total: files.length + urls.length,
        urlsQueued: urls.length,
        backgroundProcessing: urls.length > 0,
        jobId: ingestionJob?.id,
        message: responseMessage,
        errors: errors.slice(0, 10) // Limit error messages
      });
    } catch (error) {
      console.error("Error in bulk candidate upload:", error);
      console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
      console.error("Error message:", error instanceof Error ? error.message : error);
      res.status(500).json({ error: "Failed to process candidate uploads", details: error instanceof Error ? error.message : String(error) });
    }
  });

  // Individual CV upload endpoint - upload single CV to create new candidate
  app.post("/api/candidates/upload-single-cv", upload.single('file'), async (req: MulterRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const file = req.file;
      const processingMode = req.body.processingMode || 'full';
      
      console.log(`Processing single CV: ${file.originalname}`);
      
      // Detect file type
      const detectedType = await detectFileType(file);
      console.log(`Detected file type: ${detectedType}`);
      
      // Extract text from CV
      let cvText = '';
      if (detectedType === 'pdf') {
        const pdfParseFunc = getPdfParse();
        const pdfData = await pdfParseFunc(file.buffer);
        cvText = pdfData.text;
      } else if (detectedType === 'word') {
        const result = await mammoth.extractRawText({ buffer: file.buffer });
        cvText = result.value;
      } else if (detectedType === 'text') {
        cvText = file.buffer.toString('utf-8');
      } else {
        return res.status(400).json({ error: "Unsupported file type. Please upload PDF, DOCX, or TXT files." });
      }
      
      if (!cvText || cvText.trim().length === 0) {
        return res.status(400).json({ error: "Could not extract text from CV. Please ensure the file contains readable text." });
      }
      
      console.log(`Extracted ${cvText.length} characters from CV`);
      
      // Parse candidate data using AI
      const candidateData = await parseCandidateData(cvText);
      
      if (!candidateData) {
        return res.status(400).json({ error: "Could not parse candidate information from CV. Please ensure the CV contains clear candidate details." });
      }
      
      console.log(`Parsed candidate: ${candidateData.firstName} ${candidateData.lastName}`);
      
      // Check for duplicates
      const duplicates = await duplicateDetectionService.findCandidateDuplicates(candidateData);
      
      if (duplicates.length > 0) {
        return res.status(409).json({ 
          error: "Duplicate candidate detected",
          message: `This candidate already exists in the system: ${candidateData.firstName} ${candidateData.lastName}`,
          duplicates: duplicates,
          candidateData: candidateData
        });
      }
      
      // Create the candidate
      const newCandidate = await storage.createCandidate({
        ...candidateData,
        cvText: cvText
      });
      
      console.log(`✅ Created candidate ${newCandidate.firstName} ${newCandidate.lastName} (ID: ${newCandidate.id})`);
      
      // Auto-enrich: Generate biography from CV in the background
      // Don't block the response, run this asynchronously
      (async () => {
        try {
          console.log(`🔍 Auto-enriching candidate ${newCandidate.id}: generating biography from CV...`);
          
          // Generate biography from CV text (CV is primary source)
          const biography = await generateBiographyFromCV(
            cvText, 
            `${newCandidate.firstName} ${newCandidate.lastName}`
          );
          
          if (biography) {
            console.log(`✅ Generated biography from CV for ${newCandidate.firstName} ${newCandidate.lastName}`);
            
            // Update candidate with biography
            await storage.updateCandidate(newCandidate.id, {
              biography: biography,
              bioSource: 'cv'  // Mark that biography was generated from CV
            } as any);
            
            console.log(`✅ Successfully enriched candidate ${newCandidate.id} with CV-based biography`);
          }
          
          // Also search for LinkedIn profile if not already in CV
          let linkedInUrl = candidateData.linkedinUrl;
          
          if (!linkedInUrl && newCandidate.currentCompany) {
            const searchResult = await searchLinkedInProfile(
              newCandidate.firstName,
              newCandidate.lastName,
              newCandidate.currentCompany
            );
            
            // Handle the search result (can be string or object)
            if (typeof searchResult === 'string') {
              linkedInUrl = searchResult;
            } else if (searchResult && typeof searchResult === 'object' && 'url' in searchResult) {
              linkedInUrl = searchResult.url;
            }
            
            if (linkedInUrl) {
              console.log(`✅ Found LinkedIn profile: ${linkedInUrl}`);
              await storage.updateCandidate(newCandidate.id, {
                linkedinUrl: linkedInUrl
              } as any);
            }
          }
        } catch (enrichError) {
          console.error(`❌ Error auto-enriching candidate ${newCandidate.id}:`, enrichError);
          // Don't fail the upload just because enrichment failed
        }
      })();
      
      res.json({
        success: true,
        candidate: newCandidate,
        message: `Successfully created candidate ${newCandidate.firstName} ${newCandidate.lastName}`
      });
      
    } catch (error) {
      console.error("Error processing single CV upload:", error);
      res.status(500).json({ 
        error: "Failed to process CV", 
        details: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // Reprocess existing candidates to add LinkedIn URLs and career history
  app.post("/api/admin/reprocess-candidates", async (req, res) => {
    try {
      const { candidateIds, jobId } = req.body;
      
      let candidates: any[] = [];
      
      if (candidateIds && Array.isArray(candidateIds)) {
        // Reprocess specific candidate IDs
        const allCandidates = await storage.getCandidates();
        candidates = allCandidates.filter((c: any) => candidateIds.includes(c.id));
      } else if (jobId) {
        // Reprocess all candidates from a specific ingestion job
        const allCandidates = await storage.getCandidates();
        // Note: We'll need to add ingestionJobId tracking to implement this properly
        return res.status(400).json({ error: "Reprocessing by job ID not yet implemented. Please provide candidateIds array." });
      } else {
        return res.status(400).json({ error: "Please provide either candidateIds (array) or jobId (number)" });
      }
      
      if (candidates.length === 0) {
        return res.status(404).json({ error: "No candidates found to reprocess" });
      }
      
      // Extract bio URLs from candidates
      const urlsToProcess = candidates
        .filter(c => c.bioUrl)
        .map(c => c.bioUrl);
      
      if (urlsToProcess.length === 0) {
        return res.status(400).json({ error: "No candidates have bio URLs to reprocess" });
      }
      
      // Create a new ingestion job for tracking the reprocessing
      const ingestionJob = await storage.createIngestionJob({
        fileName: `Reprocess ${candidates.length} candidates`,
        fileType: 'reprocess',
        uploadedById: null,
        entityType: 'candidate',
        status: 'processing',
        totalRecords: urlsToProcess.length,
        processingMethod: 'reprocess'
      });
      
      // Queue background job to reprocess
      await queueBulkUrlJob(ingestionJob.id, urlsToProcess, {
        batchSize: 10,
        concurrency: 3,
        reprocess: true  // Flag to indicate this is a reprocessing job
      });
      
      res.json({
        success: true,
        message: `Reprocessing ${urlsToProcess.length} candidates in background`,
        jobId: ingestionJob.id,
        candidatesQueued: urlsToProcess.length
      });
      
    } catch (error) {
      console.error("Error reprocessing candidates:", error);
      res.status(500).json({ error: "Failed to reprocess candidates", details: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post("/api/admin/upload-companies", upload.array('files', 50), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[] || [];
      const urlsInput = req.body.urls || "";
      // Handle both string (newline-separated) and array formats
      const urls = Array.isArray(urlsInput) 
        ? urlsInput.filter((url: string) => url.trim()).map((url: string) => url.trim())
        : urlsInput.split('\n').filter((url: string) => url.trim()).map((url: string) => url.trim());
      
      let successCount = 0;
      let failedCount = 0;
      let duplicateCount = 0;
      const errors: string[] = [];
      const companyIds: number[] = []; // Track saved company IDs for intelligence processing
      
      // Create ingestion job for tracking
      let ingestionJob;
      if (files.length > 0 || urls.length > 0) {
        ingestionJob = await storage.createIngestionJob({
          fileName: files.length > 0 ? files.map(f => f.originalname).join(', ') : `URL batch (${urls.length} URLs)`,
          fileType: files.length > 0 ? await detectFileType(files[0]) : 'url',
          uploadedById: null, // TODO: Get actual user ID from session when authentication is implemented
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
                const savedCompany = await storage.createCompany(companyData);
                companyIds.push(savedCompany.id); // Track for intelligence processing
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
              // Save parent company
              const parentCompany = await storage.createCompany(companyData);
              companyIds.push(parentCompany.id); // Track for intelligence processing
              successCount++;
              
              // Create child companies for each office location
              if (companyData.officeLocations && Array.isArray(companyData.officeLocations)) {
                // Filter out offices that don't have city data
                const validOffices = companyData.officeLocations.filter((office: any) => office.city && office.city !== 'null');
                
                if (validOffices.length > 0) {
                  console.log(`Creating ${validOffices.length} child companies for ${parentCompany.name} (skipped ${companyData.officeLocations.length - validOffices.length} offices without city data)`);
                  
                  for (const office of validOffices) {
                    try {
                      const childCompanyData = {
                        name: `${parentCompany.name} - ${office.city}`,
                        parentCompanyId: parentCompany.id,
                        isOfficeLocation: true,
                        isHeadquarters: false, // Child companies should not appear on main list
                        // Copy minimal data from parent
                        industry: companyData.industry,
                        website: companyData.website,
                        // DON'T copy missionStatement - office locations should not inherit parent description
                        missionStatement: null,
                        // Office-specific data
                        location: `${office.city}, ${office.country}`,
                        headquarters: {
                          street: office.address || null,
                          city: office.city,
                          state: null,
                          country: office.country,
                          postalCode: null
                        },
                        officeLocations: [], // Child offices don't have sub-offices
                        stage: 'growth'
                      };
                      
                      await storage.createCompany(childCompanyData);
                      console.log(`✓ Created child company: ${childCompanyData.name}`);
                    } catch (childError) {
                      console.error(`Failed to create child company for ${office.city}:`, childError);
                    }
                  }
                } else {
                  console.log(`⚠ Skipped creating child companies for ${parentCompany.name} - no valid city data found in ${companyData.officeLocations.length} offices`);
                }
              }
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

      // Trigger AI intelligence processing in background for successfully saved companies
      if (companyIds.length > 0) {
        console.log(`\n🚀 Triggering AI intelligence processing for ${companyIds.length} companies...`);
        console.log(`   Pipeline: Auto-categorization → Team Discovery → Hiring Patterns`);
        
        // Process in background (don't await)
        setImmediate(() => {
          processBulkCompanyIntelligence(companyIds)
            .catch(error => {
              console.error('Background company intelligence processing error:', error);
            });
        });
      }

      res.json({
        success: successCount,
        duplicates: duplicateCount,
        failed: failedCount,
        total: files.length + urls.length,
        processingIntelligence: companyIds.length,
        message: `Processed ${successCount + duplicateCount + failedCount} companies: ${successCount} saved, ${duplicateCount} duplicates detected, ${failedCount} failed. AI intelligence processing started for ${companyIds.length} companies.`,
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

  // Get ingestion jobs (alias for upload history)
  app.get("/api/admin/ingestion-jobs", async (req, res) => {
    try {
      const { entityType, status, uploadId, limit = 50, offset = 0 } = req.query;
      
      const ingestionJobs = await storage.getIngestionJobs({
        entityType: entityType as string,
        status: status as string,
        limit: parseInt(limit as string) || 50,
        offset: parseInt(offset as string) || 0
      });
      
      // Filter by uploadId if provided
      let filteredJobs = ingestionJobs;
      if (uploadId) {
        filteredJobs = ingestionJobs.filter(job => job.id === parseInt(uploadId as string));
      }
      
      res.json(filteredJobs);
    } catch (error) {
      console.error("Error fetching ingestion jobs:", error);
      res.status(500).json({ error: "Failed to fetch ingestion jobs" });
    }
  });

  // Get upload history with filtering
  app.get("/api/admin/upload-history", async (req, res) => {
    try {
      const { entityType, status, limit = 50, offset = 0 } = req.query;
      
      const uploadHistory = await storage.getIngestionJobs({
        entityType: entityType as string,
        status: status as string,
        limit: parseInt(limit as string) || 50,
        offset: parseInt(offset as string) || 0
      });
      
      res.json(uploadHistory);
    } catch (error) {
      console.error("Error fetching upload history:", error);
      res.status(500).json({ error: "Failed to fetch upload history" });
    }
  });

  // Get specific upload job details
  app.get("/api/admin/upload-history/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const jobDetails = await storage.getIngestionJobDetails(parseInt(id));
      
      if (!jobDetails) {
        return res.status(404).json({ error: "Upload job not found" });
      }
      
      res.json(jobDetails);
    } catch (error) {
      console.error("Error fetching upload job details:", error);
      res.status(500).json({ error: "Failed to fetch upload job details" });
    }
  });

  // Manually trigger enhanced reprocessing of existing candidates
  app.post("/api/admin/reprocess-candidates", async (req, res) => {
    try {
      console.log('Starting manual reprocessing of existing candidates with bioUrl...');
      
      // Find candidates that have bioUrl but missing enhanced data
      const candidatesNeedingReprocessing = await storage.getCandidatesForReprocessing();
      
      if (candidatesNeedingReprocessing.length === 0) {
        return res.json({
          message: "No candidates found that need reprocessing",
          queuedCount: 0
        });
      }
      
      // Extract URLs and queue for background processing
      const urlsToProcess = candidatesNeedingReprocessing
        .filter(candidate => candidate.bioUrl)
        .map(candidate => candidate.bioUrl!);
      
      if (urlsToProcess.length > 0) {
        // Create a new ingestion job for reprocessing
        const reprocessJob = await storage.createIngestionJob({
          fileName: `Enhanced Reprocessing (${urlsToProcess.length} URLs)`,
          fileType: 'url',
          entityType: 'candidate',
          status: 'processing',
          totalRecords: urlsToProcess.length,
          processingMethod: 'enhanced_reprocessing'
        });
        
        // Queue URLs for enhanced processing
        await queueBulkUrlJob(reprocessJob.id, urlsToProcess);
        
        console.log(`Queued ${urlsToProcess.length} candidates for enhanced reprocessing in job ${reprocessJob.id}`);
        
        res.json({
          message: `Successfully queued ${urlsToProcess.length} candidates for enhanced reprocessing`,
          queuedCount: urlsToProcess.length,
          jobId: reprocessJob.id,
          candidateIds: candidatesNeedingReprocessing.map(c => c.id)
        });
      } else {
        res.json({
          message: "No candidates with bio URLs found for reprocessing",
          queuedCount: 0
        });
      }
      
    } catch (error) {
      console.error("Error triggering candidate reprocessing:", error);
      res.status(500).json({ error: "Failed to trigger candidate reprocessing" });
    }
  });

  // AI Research: Intelligent company discovery using natural language queries
  app.post("/api/admin/research-companies", async (req, res) => {
    try {
      const { query, maxResults, saveAsCampaign, campaignName, campaignIndustry } = req.body;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ 
          error: "Research query is required" 
        });
      }
      
      console.log(`🔍 AI Research query: "${query}"`);
      
      // Import researchCompanies function
      const { researchCompanies } = await import("./ai");
      
      // Check if we have a cached result
      const normalizedQuery = query.toLowerCase().trim();
      const cached = await storage.getCompanyResearchByQuery(normalizedQuery);
      
      if (cached && !cached.isStale) {
        console.log(`✓ Using cached research results from ${cached.createdAt}`);
        return res.json({
          companies: cached.companiesFound,
          searchQueries: cached.searchQueries || [],
          metadata: {
            totalResults: cached.totalResults || 0,
            queryExecutionTime: 0,
            aiGenerationTime: 0
          },
          fromCache: true,
          cacheDate: cached.createdAt
        });
      }
      
      // Execute AI research
      const results = await researchCompanies({
        naturalLanguageQuery: query,
        maxResults: maxResults || 50
      });
      
      console.log(`✅ Research complete: ${results.companies.length} companies found`);
      
      // Save as campaign if requested
      let campaignId = null;
      if (saveAsCampaign) {
        const campaign = await storage.createIndustryCampaign({
          name: campaignName || `Research: ${query}`,
          industry: campaignIndustry || 'Unknown',
          targetCompanies: maxResults || 50,
          status: 'active',
          description: `AI Research: ${query}`
        });
        campaignId = campaign.id;
        console.log(`✓ Created campaign #${campaignId}: ${campaign.name}`);
      }
      
      // Cache the results
      await storage.createCompanyResearchResult({
        normalizedQuery,
        originalQuery: query,
        campaignId,
        searchQueries: results.searchQueries,
        dataSources: ['SerpAPI', 'AI Analysis'],
        companiesFound: results.companies as any,
        totalResults: results.metadata.totalResults,
        averageConfidence: 0.8,
        isStale: false
      });
      
      res.json({
        ...results,
        campaignId,
        fromCache: false
      });
      
    } catch (error) {
      console.error("❌ AI Research error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Research failed" 
      });
    }
  });

  // Bulk import companies from research results
  app.post("/api/admin/bulk-import-companies", async (req, res) => {
    try {
      const { companies } = req.body;
      
      if (!companies || !Array.isArray(companies) || companies.length === 0) {
        return res.status(400).json({ 
          error: "Companies array is required" 
        });
      }
      
      console.log(`🔍 Bulk importing ${companies.length} companies from research results`);
      
      // Create an ingestion job for tracking
      const job = await storage.createIngestionJob({
        fileName: `AI Research - Bulk Import (${companies.length} companies)`,
        fileType: 'research-import',
        entityType: 'company',
        totalRecords: companies.length,
        status: 'processing',
        processingMethod: 'ai-research-import'
      });
      
      console.log(`✓ Created ingestion job #${job.id}`);
      
      // Convert research results to company URLs for processing
      const companyUrls = companies
        .map(c => c.website || c.linkedinUrl)
        .filter(url => url) // Filter out nulls
        .join('\n');
      
      if (!companyUrls) {
        await storage.updateIngestionJob(job.id, {
          status: 'failed',
          errorDetails: { message: 'No valid URLs found in selected companies' }
        });
        return res.status(400).json({ 
          error: "No valid URLs found in selected companies" 
        });
      }
      
      // Process URLs using existing company URL processing logic
      const lines = companyUrls.split('\n').filter(line => line.trim());
      const validUrls: string[] = [];
      const invalidUrls: string[] = [];
      
      for (const line of lines) {
        const url = line.trim();
        try {
          new URL(url);
          validUrls.push(url);
        } catch {
          invalidUrls.push(url);
        }
      }
      
      console.log(`✓ ${validUrls.length} valid URLs, ${invalidUrls.length} invalid URLs`);
      
      // Import parseCompanyFromUrl for background processing
      const { parseCompanyFromUrl } = await import("./ai");
      const { processBulkCompanyIntelligence } = await import("./background-jobs");
      
      // Process each company URL
      const results = {
        success: 0,
        duplicates: 0,
        failed: 0,
        total: validUrls.length,
        errors: [] as string[]
      };
      
      const createdCompanies: number[] = [];
      
      for (const url of validUrls) {
        try {
          // Extract company data from URL
          const companyData = await parseCompanyFromUrl(url);
          
          if (!companyData || !companyData.name) {
            results.failed++;
            results.errors.push(`Failed to extract data from ${url}`);
            continue;
          }
          
          // Check for duplicates
          const existingCompanies = await storage.getCompanies(false); // Get all companies including child offices
          const isDuplicate = existingCompanies.some(
            c => c.name.toLowerCase() === companyData.name.toLowerCase()
          );
          
          if (isDuplicate) {
            results.duplicates++;
            console.log(`⚠️ Skipping duplicate: ${companyData.name}`);
            await storage.updateIngestionJob(job.id, {
              processedRecords: results.success + results.duplicates + results.failed,
              successfulRecords: results.success,
              duplicateRecords: results.duplicates
            });
            continue;
          }
          
          // Save company to database
          const savedCompany = await storage.createCompany({
            name: companyData.name,
            website: companyData.website || url,
            industry: companyData.industry,
            missionStatement: companyData.missionStatement,
            primaryPhone: companyData.primaryPhone,
            headquarters: companyData.headquarters,
            officeLocations: companyData.officeLocations,
            annualRevenue: companyData.annualRevenue,
            location: companyData.location,
            parentCompany: companyData.parentCompany,
            employeeSize: companyData.employeeSize,
            subsector: companyData.subsector,
            stage: companyData.stage || 'growth',
            isHeadquarters: true
          });
          
          createdCompanies.push(savedCompany.id);
          results.success++;
          console.log(`✅ Created company: ${savedCompany.name} (ID: ${savedCompany.id})`);
          
          await storage.updateIngestionJob(job.id, {
            processedRecords: results.success + results.duplicates + results.failed,
            successfulRecords: results.success,
            duplicateRecords: results.duplicates
          });
        } catch (error) {
          results.failed++;
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          results.errors.push(`${url}: ${errorMsg}`);
          console.error(`Error processing ${url}:`, error);
        }
      }
      
      // Update job status
      await storage.updateIngestionJob(job.id, {
        status: 'completed',
        processedRecords: results.total,
        successfulRecords: results.success,
        errorRecords: results.failed,
        errorDetails: results.errors.length > 0 ? { errors: results.errors } : null
      });
      
      // Trigger background intelligence processing
      if (createdCompanies.length > 0) {
        console.log(`🚀 Starting background intelligence processing for ${createdCompanies.length} companies`);
        processBulkCompanyIntelligence(createdCompanies).catch(err => {
          console.error('Background intelligence processing error:', err);
        });
      }
      
      console.log(`✅ Bulk import complete: ${results.success} success, ${results.failed} failed`);
      
      res.json({
        jobId: job.id,
        ...results,
        message: `Successfully imported ${results.success} companies. Background processing started.`
      });
      
    } catch (error) {
      console.error("❌ Bulk import error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Bulk import failed" 
      });
    }
  });

  // Boolean search for LinkedIn candidates
  app.post("/api/admin/boolean-search", async (req, res) => {
    try {
      const { query } = req.body;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ 
          error: "Search query is required" 
        });
      }
      
      console.log(`Boolean search query: ${query}`);
      
      // Use SerpAPI to search with boolean query
      const apiKey = process.env.SERPAPI_API_KEY;
      
      if (!apiKey) {
        return res.status(500).json({ 
          error: "Search service not configured" 
        });
      }
      
      const searchUrl = `https://serpapi.com/search.json?api_key=${apiKey}&q=${encodeURIComponent(query)}&engine=google&num=10`;
      
      const response = await fetch(searchUrl);
      
      if (!response.ok) {
        console.error(`SerpAPI search failed with status: ${response.status}`);
        return res.status(500).json({ 
          error: "Search service unavailable" 
        });
      }
      
      const data = await response.json();
      const organicResults = data.organic_results || [];
      
      console.log(`SerpAPI returned ${organicResults.length} results`);
      
      // Extract candidate information from search results
      const results = organicResults
        .filter((result: any) => result.link?.includes('linkedin.com/in/'))
        .map((result: any) => {
          // Extract LinkedIn URL
          const linkedinUrl = result.link.split('?')[0].split('#')[0];
          
          // Extract name and title from result
          const title = result.title || '';
          const snippet = result.snippet || '';
          
          // Try to parse name from title (LinkedIn format: "Name - Title - Company | LinkedIn")
          const titleParts = title.split(' - ');
          const name = titleParts[0]?.replace(' | LinkedIn', '').trim() || '';
          const jobTitle = titleParts[1]?.trim() || '';
          
          // Try to extract company from snippet or title
          let company = '';
          const snippetCompanyMatch = snippet.match(/(?:at|@)\s+([^·•\n]+)/i);
          if (snippetCompanyMatch && snippetCompanyMatch[1]) {
            company = snippetCompanyMatch[1].trim();
          } else if (titleParts[2]) {
            company = titleParts[2].split('|')[0].trim();
          }
          
          return {
            name,
            title: jobTitle,
            company: company.trim(),
            linkedinUrl,
            snippet: snippet.substring(0, 200)
          };
        })
        .filter((result: any) => result.name && result.linkedinUrl);
      
      console.log(`Extracted ${results.length} LinkedIn profiles from search results`);
      
      res.json({
        success: true,
        query,
        count: results.length,
        results
      });
      
    } catch (error) {
      console.error("Error in boolean search:", error);
      res.status(500).json({ 
        error: "Failed to perform search",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Add candidate by name and company - AI searches for profiles and creates record
  app.post("/api/admin/add-candidate-by-name", async (req, res) => {
    try {
      const { firstName, lastName, company, jobTitle, linkedinUrl, processingMode = 'full' } = req.body;
      
      // Validate required fields
      if (!firstName || !lastName || !company) {
        return res.status(400).json({ 
          error: "firstName, lastName, and company are required fields" 
        });
      }
      
      console.log(`Searching for candidate: ${firstName} ${lastName} at ${company}${jobTitle ? ` (${jobTitle})` : ''}`);
      if (linkedinUrl) {
        console.log(`LinkedIn URL provided: ${linkedinUrl}`);
      } else {
        console.log(`No LinkedIn URL provided, will attempt web search`);
      }
      
      // Use AI to search for candidate profiles - it will use provided URL or attempt web search
      const searchResult = await searchCandidateProfilesByName(
        firstName,
        lastName,
        company,
        linkedinUrl || null,  // Use provided LinkedIn URL if available
        null,  // bioUrl
        jobTitle || null  // Optional job title for more accurate search
      );
      
      // Check if we found profile data
      if (!searchResult.candidateData) {
        return res.status(404).json({ 
          error: `Could not find or generate profile data for ${firstName} ${lastName} at ${company}`,
          bioUrl: searchResult.bioUrl,
          linkedinUrl: searchResult.linkedinUrl,
          message: "Try providing more specific company information or check if the person has public profiles"
        });
      }
      
      // Create the candidate record (duplicate detection will run automatically)
      // The duplicate detection service will flag this if it's a duplicate
      let newCandidate = await storage.createCandidate({
        ...searchResult.candidateData,
        processingMode: processingMode as 'full' | 'career_only' | 'bio_only' | 'data_only'
      });
      
      console.log(`Successfully created candidate ${newCandidate.id}: ${firstName} ${lastName}`);
      console.log(`Processing mode: ${processingMode}`);
      
      // Process based on mode (unified contract: full/career_only/bio_only all scrape LinkedIn)
      if (newCandidate.linkedinUrl && processingMode !== 'data_only') {
        console.log(`\n========================================`);
        console.log(`[Auto Processing] START - Mode: ${processingMode} - Candidate ${newCandidate.id}: ${firstName} ${lastName}`);
        console.log(`[Auto Processing] LinkedIn URL: ${newCandidate.linkedinUrl}`);
        console.log(`========================================`);
        
        try {
          // Step 1: Scrape LinkedIn profile using Bright Data (all modes except data_only)
          console.log(`[Auto Processing] STEP 1: Initiating Bright Data scraping...`);
          const profileData = await scrapeLinkedInProfile(newCandidate.linkedinUrl);
          console.log(`[Auto Processing] STEP 1 COMPLETE: Profile data received`);
          console.log(`[Auto Processing] Profile data keys: ${Object.keys(profileData).join(', ')}`);
          
          // Step 2: Process based on mode
          if (processingMode === 'full') {
            // Full mode: Generate biography AND extract career history (using same pipeline as background jobs)
            console.log(`[Auto Processing] STEP 2: Full mode - Generating biography & career history...`);
            const bioResult = await generateBiographyAndCareerHistory(
              firstName,
              lastName,
              profileData,
              undefined // no cvText from Quick Add
            );
            
            if (bioResult) {
              console.log(`[Auto Processing] STEP 2 COMPLETE: Biography generated (${bioResult.biography.length} chars), Career history (${bioResult.careerHistory.length} positions)`);
              
              const updatedCandidate = await storage.updateCandidate(newCandidate.id, {
                biography: bioResult.biography,
                careerHistory: bioResult.careerHistory,
                bioSource: 'brightdata',
                bioStatus: 'verified'
              });
              
              if (updatedCandidate) {
                newCandidate = updatedCandidate;
                console.log(`[Auto Processing] ✓ SUCCESS - Biography & career data saved for ${firstName} ${lastName}`);
              }
            }
          } else if (processingMode === 'bio_only') {
            // Bio Only mode: Generate biography only (career data in profileData but not emphasized)
            console.log(`[Auto Processing] STEP 2: Bio Only mode - Generating biography only...`);
            const biography = await generateBiographyFromLinkedInData(profileData);
            console.log(`[Auto Processing] STEP 2 COMPLETE: Biography generated (${biography.length} chars)`);
            
            const updatedCandidate = await storage.updateCandidate(newCandidate.id, {
              biography,
              bioSource: 'brightdata',
              bioStatus: 'verified'
            });
            
            if (updatedCandidate) {
              newCandidate = updatedCandidate;
              console.log(`[Auto Processing] ✓ SUCCESS - Biography saved for ${firstName} ${lastName} (career history not emphasized)`);
            }
          } else if (processingMode === 'career_only') {
            // Career Only mode: Extract career data but skip biography generation
            console.log(`[Auto Processing] STEP 2: Career Only mode - Extracting career data (no biography)...`);
            
            const updatedCandidate = await storage.updateCandidate(newCandidate.id, {
              bioSource: 'brightdata',
              bioStatus: 'not_generated'
            });
            
            if (updatedCandidate) {
              newCandidate = updatedCandidate;
              console.log(`[Auto Processing] ✓ SUCCESS - Career data scraped for ${firstName} ${lastName} (biography not generated)`);
            }
          }
          
          console.log(`========================================\n`);
        } catch (processingError) {
          // Don't fail the entire request if processing fails
          console.log(`\n========================================`);
          console.error(`[Auto Processing] ✗ FAILED - Processing error (${processingMode} mode)`);
          console.error(`[Auto Processing] Error:`, processingError);
          console.log(`[Auto Processing] Candidate ${newCandidate.id} created successfully but processing failed`);
          console.log(`========================================\n`);
        }
      } else if (processingMode === 'data_only') {
        console.log(`\n========================================`);
        console.log(`[Auto Processing] SKIPPED - Processing mode is 'data_only'`);
        console.log(`[Auto Processing] Candidate stored with basic data only (no scraping or bio generation)`);
        console.log(`========================================\n`);
      } else {
        console.log(`\n========================================`);
        console.log(`[Auto Processing] SKIPPED - No LinkedIn URL found for ${firstName} ${lastName}`);
        console.log(`[Auto Processing] LinkedIn search may have failed - check logs above for details`);
        console.log(`========================================\n`);
      }
      
      res.json({
        success: true,
        message: `Successfully added ${firstName} ${lastName} from ${company}`,
        candidate: newCandidate,
        bioUrl: searchResult.bioUrl,
        linkedinUrl: searchResult.linkedinUrl
      });
      
    } catch (error) {
      console.error("Error adding candidate by name:", error);
      res.status(500).json({ 
        error: "Failed to add candidate",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Validation endpoints for QA/verification
  app.post("/api/admin/validate-email/:candidateId", async (req, res) => {
    try {
      const candidateId = parseInt(req.params.candidateId);
      const candidate = await storage.getCandidate(candidateId);
      
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }
      
      if (!candidate.currentCompany) {
        return res.status(400).json({ error: "Candidate has no company information" });
      }
      
      // Re-research company domain and email pattern
      const emailInfo = await researchCompanyEmailPattern(candidate.currentCompany);
      
      if (!emailInfo.domain || !emailInfo.emailPattern) {
        return res.json({
          success: false,
          message: "Could not determine company email domain",
          currentEmail: candidate.email,
          suggestedEmail: null
        });
      }
      
      // Generate new email based on researched info
      const first = candidate.firstName.toLowerCase();
      const last = candidate.lastName.toLowerCase();
      const firstInitial = first.charAt(0);
      
      let localPart: string;
      switch (emailInfo.emailPattern) {
        case 'f.lastname':
          localPart = `${firstInitial}.${last}`;
          break;
        case 'firstnamelastname':
          localPart = `${first}${last}`;
          break;
        case 'firstname.lastname':
        default:
          localPart = `${first}.${last}`;
          break;
      }
      
      const suggestedEmail = `${localPart}@${emailInfo.domain}`;
      
      res.json({
        success: true,
        currentEmail: candidate.email,
        suggestedEmail,
        domain: emailInfo.domain,
        pattern: emailInfo.emailPattern,
        isMatch: candidate.email === suggestedEmail
      });
      
    } catch (error) {
      console.error("Error validating email:", error);
      res.status(500).json({ 
        error: "Failed to validate email",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/admin/validate-linkedin/:candidateId", async (req, res) => {
    try {
      const candidateId = parseInt(req.params.candidateId);
      const candidate = await storage.getCandidate(candidateId);
      
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }
      
      if (!candidate.linkedinUrl) {
        return res.status(400).json({ error: "Candidate has no LinkedIn URL" });
      }
      
      // Search for LinkedIn profile to verify
      const searchResult = await searchLinkedInProfile(
        candidate.firstName,
        candidate.lastName,
        candidate.currentCompany || '',
        candidate.currentTitle
      );
      
      const suggestedUrl = searchResult?.url || null;
      
      res.json({
        success: true,
        currentLinkedinUrl: candidate.linkedinUrl,
        suggestedLinkedinUrl: suggestedUrl,
        isMatch: candidate.linkedinUrl === suggestedUrl,
        confidence: suggestedUrl ? "high" : "low",
        searchDetails: searchResult
      });
      
    } catch (error) {
      console.error("Error validating LinkedIn URL:", error);
      res.status(500).json({ 
        error: "Failed to validate LinkedIn URL",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/admin/validate-biography/:candidateId", async (req, res) => {
    try {
      const candidateId = parseInt(req.params.candidateId);
      const candidate = await storage.getCandidate(candidateId);
      
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }
      
      if (!candidate.linkedinUrl) {
        return res.status(400).json({ error: "Candidate has no LinkedIn URL to verify against" });
      }
      
      // Note: We cannot actually scrape LinkedIn content due to blocking
      // This endpoint will return a message explaining the limitation
      res.json({
        success: true,
        message: "Biography validation requires manual review",
        note: "LinkedIn blocks automated content access. Please manually verify the biography by visiting the LinkedIn profile.",
        currentBiography: candidate.biography || "No biography available",
        linkedinUrl: candidate.linkedinUrl,
        suggestion: "Open the LinkedIn profile and compare the generated biography with the actual profile information"
      });
      
    } catch (error) {
      console.error("Error validating biography:", error);
      res.status(500).json({ 
        error: "Failed to validate biography",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Update candidate email after validation
  app.post("/api/admin/update-candidate-email/:candidateId", async (req, res) => {
    try {
      const candidateId = parseInt(req.params.candidateId);
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      
      const updated = await storage.updateCandidate(candidateId, { email });
      
      res.json({
        success: true,
        candidate: updated
      });
      
    } catch (error) {
      console.error("Error updating candidate email:", error);
      res.status(500).json({ 
        error: "Failed to update email",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Update candidate LinkedIn URL after validation
  app.post("/api/admin/update-candidate-linkedin/:candidateId", async (req, res) => {
    try {
      const candidateId = parseInt(req.params.candidateId);
      const { linkedinUrl } = req.body;
      
      if (!linkedinUrl) {
        return res.status(400).json({ error: "LinkedIn URL is required" });
      }
      
      const updated = await storage.updateCandidate(candidateId, { linkedinUrl });
      
      res.json({
        success: true,
        candidate: updated
      });
      
    } catch (error) {
      console.error("Error updating candidate LinkedIn URL:", error);
      res.status(500).json({ 
        error: "Failed to update LinkedIn URL",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Save manually entered biography
  app.post("/api/admin/save-biography/:candidateId", async (req, res) => {
    try {
      const candidateId = parseInt(req.params.candidateId);
      const { biography, bioSource } = req.body;
      
      if (!biography || !biography.trim()) {
        return res.status(400).json({ error: "Biography is required" });
      }
      
      const updated = await storage.updateCandidate(candidateId, { 
        biography: biography.trim(),
        bioSource: bioSource || 'manual',
        bioStatus: 'verified'
      });
      
      res.json({
        success: true,
        candidate: updated
      });
      
    } catch (error) {
      console.error("Error saving biography:", error);
      res.status(500).json({ 
        error: "Failed to save biography",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Auto-generate biography from LinkedIn using Bright Data scraping
  app.post("/api/admin/generate-biography/:candidateId", async (req, res) => {
    try {
      const candidateId = parseInt(req.params.candidateId);
      
      const candidate = await storage.getCandidate(candidateId);
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }
      
      if (!candidate.linkedinUrl) {
        return res.status(400).json({ error: "Candidate must have a LinkedIn URL to generate biography" });
      }
      
      const { scrapeLinkedInProfile } = await import('./brightdata');
      const { generateBiographyAndCareerHistory } = await import('./ai');
      
      console.log(`[Auto-Bio] Starting auto-biography for candidate ${candidateId}: ${candidate.firstName} ${candidate.lastName}`);
      console.log(`[Auto-Bio] LinkedIn URL: ${candidate.linkedinUrl}`);
      
      // Step 1: Scrape LinkedIn profile
      console.log(`[Auto-Bio] Scraping LinkedIn profile with Bright Data...`);
      const linkedinData = await scrapeLinkedInProfile(candidate.linkedinUrl);
      
      // Step 2: Fetch bio URL content if available (for Layer 1 comprehension)
      let bioContent: string | undefined;
      if (candidate.bioUrl) {
        try {
          console.log(`[Auto-Bio] Fetching bio URL content: ${candidate.bioUrl}`);
          const bioResponse = await fetch(candidate.bioUrl, { 
            signal: AbortSignal.timeout(15000),
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; DeepHire/1.0; +http://deephire.com/bot)'
            }
          });
          
          if (bioResponse.ok) {
            const bioHTML = await bioResponse.text();
            const cheerio = await import('cheerio');
            const $ = cheerio.load(bioHTML);
            
            // Extract text content (remove scripts, styles)
            $('script, style, nav, header, footer').remove();
            const extractedText = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 10000);
            if (extractedText) {
              bioContent = extractedText;
              console.log(`[Auto-Bio] ✓ Fetched ${bioContent.length} chars from bio URL`);
            }
          }
        } catch (error) {
          console.log(`[Auto-Bio] Could not fetch bio URL: ${error}`);
        }
      }
      
      // Step 3: Run 3-layer AI pipeline (Comprehension → Synthesis → Mapping)
      console.log(`[Auto-Bio] Running 3-layer AI pipeline...`);
      const { biography, careerHistory } = await generateBiographyAndCareerHistory(
        candidate.firstName,
        candidate.lastName,
        linkedinData,
        bioContent
      );
      
      if (!biography || !biography.trim()) {
        return res.status(500).json({ 
          error: "Failed to generate biography from LinkedIn profile" 
        });
      }
      
      console.log(`[Auto-Bio] ✓ Generated biography (${biography.length} chars) and career history (${careerHistory.length} positions)`);
      
      const updated = await storage.updateCandidate(candidateId, {
        biography: biography.trim(),
        bioSource: 'linkedin_brightdata',
        bioStatus: 'inferred',
        careerHistory: careerHistory as any
      });
      
      res.json({
        success: true,
        candidate: updated,
        message: "Biography generated successfully from LinkedIn profile"
      });
      
    } catch (error) {
      console.error("Error auto-generating biography:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        error: errorMessage  // Put the actual error message here for the frontend
      });
    }
  });

  // Browser extension import endpoint
  app.post("/api/extension/import-profile", async (req, res) => {
    try {
      // TEMPORARILY DISABLED AUTH FOR TESTING
      // const apiKey = req.headers['x-deephire-api-key'];
      // if (!apiKey || apiKey !== process.env.EXTENSION_API_KEY) {
      //   return res.status(401).json({ error: "Invalid API key" });
      // }

      const profileData = req.body;
      
      if (!profileData || !profileData.url) {
        return res.status(400).json({ error: "Invalid profile data" });
      }

      console.log('[Extension] Received profile import request:', {
        url: profileData.url,
        name: profileData.name,
        headline: profileData.headline
      });

      // Parse name from profile data
      const nameParts = profileData.name?.trim().split(/\s+/) || [];
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      if (!firstName) {
        return res.status(400).json({ error: "Could not parse candidate name from profile" });
      }

      // Extract company from headline (e.g., "Managing Director at Wellesley Partners")
      let currentCompany = '';
      let currentTitle = '';
      
      if (profileData.headline) {
        const atMatch = profileData.headline.match(/\s+at\s+(.+?)(?:\s*\||$)/i);
        const dashMatch = profileData.headline.match(/\s+-\s+(.+?)(?:\s*\||$)/i);
        
        if (atMatch) {
          currentCompany = atMatch[1].trim();
          currentTitle = profileData.headline.split(/\s+at\s+/i)[0].trim();
        } else if (dashMatch) {
          currentCompany = dashMatch[1].trim();
          currentTitle = profileData.headline.split(/\s+-\s+/i)[0].trim();
        } else if (profileData.experience && profileData.experience.length > 0) {
          // Use first experience entry
          currentCompany = profileData.experience[0].company || '';
          currentTitle = profileData.experience[0].title || '';
        }
      }

      // Try to find existing candidate by LinkedIn URL or name
      const allCandidates = await storage.getCandidates();
      let existingCandidate = allCandidates.find(c => 
        c.linkedinUrl === profileData.url ||
        (c.firstName.toLowerCase() === firstName.toLowerCase() && 
         c.lastName.toLowerCase() === lastName.toLowerCase())
      );

      let candidateId: number;
      let isNewCandidate = false;

      if (existingCandidate) {
        console.log('[Extension] Found existing candidate:', existingCandidate.id);
        candidateId = existingCandidate.id;
        
        // Update with new data from extension
        await storage.updateCandidate(candidateId, {
          linkedinUrl: profileData.url,
          currentCompany: currentCompany || existingCandidate.currentCompany,
          currentTitle: currentTitle || existingCandidate.currentTitle,
          location: profileData.location || existingCandidate.location,
          skills: profileData.skills || existingCandidate.skills
        });
      } else {
        console.log('[Extension] Creating new candidate');
        isNewCandidate = true;
        
        // Create new candidate
        const newCandidate = await storage.createCandidate({
          firstName,
          lastName,
          linkedinUrl: profileData.url,
          currentCompany: currentCompany || 'Unknown',
          currentTitle: currentTitle || '',
          location: profileData.location || '',
          skills: profileData.skills || [],
          bioSource: 'extension',
          bioStatus: 'pending'
        });
        
        candidateId = newCandidate.id;
      }

      // Generate biography using the extracted profile data
      console.log('[Extension] Generating biography from profile data...');
      
      // Format the profile data for AI processing
      const formattedProfile = {
        name: profileData.name,
        headline: profileData.headline,
        location: profileData.location,
        about: profileData.about,
        experience: profileData.experience || [],
        education: profileData.education || [],
        skills: profileData.skills || []
      };

      // Convert to text format for AI
      let profileText = `Name: ${formattedProfile.name}\n`;
      if (formattedProfile.headline) profileText += `Headline: ${formattedProfile.headline}\n`;
      if (formattedProfile.location) profileText += `Location: ${formattedProfile.location}\n`;
      if (formattedProfile.about) profileText += `\nAbout:\n${formattedProfile.about}\n`;
      
      if (formattedProfile.experience.length > 0) {
        profileText += `\nExperience:\n`;
        formattedProfile.experience.forEach((exp: any) => {
          profileText += `- ${exp.title || ''}${exp.company ? ' at ' + exp.company : ''}${exp.dates ? ' (' + exp.dates + ')' : ''}\n`;
          if (exp.description) profileText += `  ${exp.description}\n`;
        });
      }
      
      if (formattedProfile.education.length > 0) {
        profileText += `\nEducation:\n`;
        formattedProfile.education.forEach((edu: any) => {
          profileText += `- ${edu.school || ''}${edu.degree ? ': ' + edu.degree : ''}${edu.dates ? ' (' + edu.dates + ')' : ''}\n`;
        });
      }
      
      if (formattedProfile.skills.length > 0) {
        profileText += `\nSkills: ${formattedProfile.skills.join(', ')}\n`;
      }

      // Use AI to generate biography from the profile text
      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({
        apiKey: process.env.XAI_API_KEY,
        baseURL: "https://api.x.ai/v1"
      });

      const response = await openai.chat.completions.create({
        model: "grok-2-1212",
        messages: [
          {
            role: "system",
            content: `You are an expert recruiter writing professional biographies based STRICTLY on provided LinkedIn data. You must NEVER invent, assume, or fabricate any information. Always respond with valid JSON.`
          },
          {
            role: "user",
            content: `Create a professional biography for this candidate using ONLY the information provided below. Do not add any details, achievements, or descriptions that are not explicitly stated in the data.

LINKEDIN PROFILE DATA:
${profileText}

Generate a JSON response with this structure:
{
  "biography": "A professional biography with THREE sections:\\n\\n**Executive Summary**\\n[Based only on current role/headline from data]\\n\\n**Career History**\\n[List only positions explicitly mentioned with their actual titles, companies, and dates. If no description is provided for a role, only list: title, company, dates - do not add achievements or responsibilities]\\n\\n**Education Background**\\n[List only schools, degrees, and dates explicitly provided. If information is missing, omit it entirely]"
}

CRITICAL RULES - You MUST follow these strictly:
1. Write in third person professional tone
2. Use ONLY information explicitly provided in the profile data above
3. If experience descriptions are missing, write ONLY: "[Title] at [Company] ([Dates])" - DO NOT add achievements
4. If education details are missing, write ONLY: "[School]" or "[Degree], [School]" - DO NOT add descriptions
5. DO NOT infer, assume, or create any details about:
   - Achievements not mentioned
   - Responsibilities not described
   - Skills not listed
   - Companies or roles not stated
6. If a section has no data, state: "[No information provided]"
7. Keep the biography factual and concise - quality over quantity`
          }
        ],
        response_format: { type: "json_object" }
      });

      const aiResult = JSON.parse(response.choices[0].message.content || "{}");

      if (aiResult && aiResult.biography) {
        await storage.updateCandidate(candidateId, {
          biography: aiResult.biography,
          bioSource: 'extension',
          bioStatus: 'verified'
        });
        
        console.log('[Extension] Biography generated successfully');
      }

      // Get final candidate data
      const finalCandidate = await storage.getCandidate(candidateId);

      res.json({
        success: true,
        candidate: finalCandidate,
        message: isNewCandidate 
          ? 'New candidate created and biography generated' 
          : 'Existing candidate updated with new data and biography generated'
      });

    } catch (error) {
      console.error('[Extension] Error importing profile:', error);
      res.status(500).json({
        error: "Failed to import profile",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Background job control endpoints
  app.post("/api/admin/jobs/:id/pause", async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const success = pauseJob(jobId);
      
      if (success) {
        res.json({ message: "Job paused successfully", jobId });
      } else {
        res.status(404).json({ error: "Job not found or not currently running" });
      }
    } catch (error) {
      console.error("Error pausing job:", error);
      res.status(500).json({ error: "Failed to pause job" });
    }
  });

  app.post("/api/admin/jobs/:id/resume", async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const success = resumeJob(jobId);
      
      if (success) {
        res.json({ message: "Job resumed successfully", jobId });
      } else {
        res.status(404).json({ error: "Job not found or not currently running" });
      }
    } catch (error) {
      console.error("Error resuming job:", error);
      res.status(500).json({ error: "Failed to resume job" });
    }
  });

  app.post("/api/admin/jobs/:id/stop", async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const success = stopJob(jobId);
      
      if (success) {
        res.json({ message: "Job stopped successfully", jobId });
      } else {
        res.status(404).json({ error: "Job not found or not currently running" });
      }
    } catch (error) {
      console.error("Error stopping job:", error);
      res.status(500).json({ error: "Failed to stop job" });
    }
  });

  app.get("/api/admin/jobs/:id/status", async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const isProcessing = getJobProcessingStatus(jobId);
      const controls = getJobControls(jobId);
      const jobDetails = await storage.getIngestionJobDetails(jobId);
      
      res.json({
        jobId,
        isProcessing,
        controls: controls || { paused: false, stopped: false },
        jobDetails,
        progressPercentage: jobDetails && jobDetails.totalRecords > 0 
          ? Math.round((jobDetails.processedRecords / jobDetails.totalRecords) * 100) 
          : 0
      });
    } catch (error) {
      console.error("Error getting job status:", error);
      res.status(500).json({ error: "Failed to get job status" });
    }
  });

  // ==================== CUSTOM FIELD SECTIONS ====================
  
  // Get all custom field sections (with optional entity type filter)
  app.get("/api/custom-field-sections", async (req, res) => {
    try {
      const { entityType } = req.query;
      const sections = await storage.getCustomFieldSections(entityType as string);
      res.json(sections);
    } catch (error) {
      console.error("Error fetching custom field sections:", error);
      res.status(500).json({ error: "Failed to fetch custom field sections" });
    }
  });
  
  // Get single custom field section
  app.get("/api/custom-field-sections/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const section = await storage.getCustomFieldSection(id);
      if (!section) {
        return res.status(404).json({ error: "Custom field section not found" });
      }
      res.json(section);
    } catch (error) {
      console.error("Error fetching custom field section:", error);
      res.status(500).json({ error: "Failed to fetch custom field section" });
    }
  });
  
  // Create new custom field section
  app.post("/api/custom-field-sections", async (req, res) => {
    try {
      const section = await storage.createCustomFieldSection(req.body);
      res.status(201).json(section);
    } catch (error) {
      console.error("Error creating custom field section:", error);
      res.status(500).json({ error: "Failed to create custom field section" });
    }
  });
  
  // Update custom field section
  app.patch("/api/custom-field-sections/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.updateCustomFieldSection(id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Custom field section not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating custom field section:", error);
      res.status(500).json({ error: "Failed to update custom field section" });
    }
  });
  
  // Delete custom field section
  app.delete("/api/custom-field-sections/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteCustomFieldSection(id);
      res.json({ message: "Custom field section deleted successfully" });
    } catch (error) {
      console.error("Error deleting custom field section:", error);
      res.status(500).json({ error: "Failed to delete custom field section" });
    }
  });

  // ==================== CUSTOM FIELD DEFINITIONS ====================
  
  // Get all custom field definitions (with optional filters)
  app.get("/api/custom-field-definitions", async (req, res) => {
    try {
      const { entityType, sectionId } = req.query;
      const filters: any = {};
      if (entityType) filters.entityType = entityType as string;
      if (sectionId) filters.sectionId = parseInt(sectionId as string);
      
      const definitions = await storage.getCustomFieldDefinitions(filters);
      res.json(definitions);
    } catch (error) {
      console.error("Error fetching custom field definitions:", error);
      res.status(500).json({ error: "Failed to fetch custom field definitions" });
    }
  });
  
  // Get single custom field definition
  app.get("/api/custom-field-definitions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const definition = await storage.getCustomFieldDefinition(id);
      if (!definition) {
        return res.status(404).json({ error: "Custom field definition not found" });
      }
      res.json(definition);
    } catch (error) {
      console.error("Error fetching custom field definition:", error);
      res.status(500).json({ error: "Failed to fetch custom field definition" });
    }
  });
  
  // Create new custom field definition
  app.post("/api/custom-field-definitions", async (req, res) => {
    try {
      const definition = await storage.createCustomFieldDefinition(req.body);
      res.status(201).json(definition);
    } catch (error) {
      console.error("Error creating custom field definition:", error);
      res.status(500).json({ error: "Failed to create custom field definition" });
    }
  });
  
  // Update custom field definition
  app.patch("/api/custom-field-definitions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.updateCustomFieldDefinition(id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Custom field definition not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating custom field definition:", error);
      res.status(500).json({ error: "Failed to update custom field definition" });
    }
  });
  
  // Delete custom field definition
  app.delete("/api/custom-field-definitions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteCustomFieldDefinition(id);
      res.json({ message: "Custom field definition deleted successfully" });
    } catch (error) {
      console.error("Error deleting custom field definition:", error);
      res.status(500).json({ error: "Failed to delete custom field definition" });
    }
  });
  
  // ==================== CANDIDATE CUSTOM FIELD VALUES ====================
  
  // Update candidate custom field values
  app.patch("/api/candidates/:id/custom-fields", async (req, res) => {
    try {
      const candidateId = parseInt(req.params.id);
      const { customFieldValues } = req.body;
      
      const updated = await storage.updateCandidate(candidateId, { customFieldValues });
      if (!updated) {
        return res.status(404).json({ error: "Candidate not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating candidate custom fields:", error);
      res.status(500).json({ error: "Failed to update candidate custom fields" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}