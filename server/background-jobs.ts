import { storage } from './storage';
import { parseCandidateFromUrl, parseEnhancedCandidateFromUrl, categorizeCompany, discoverTeamMembers, analyzeCompanyHiringPatterns, analyzeRoleLevel, parseCompanyFromUrl, generateBiographyAndCareerHistory } from './ai';
import { scrapeLinkedInProfile } from './brightdata';
import { duplicateDetectionService } from './duplicate-detection';
import type { DataIngestionJob } from '@shared/schema';

// Background job queue system for processing bulk URL uploads
interface BulkUrlJob {
  id: number;
  jobId: number;
  urls: string[];
  batchSize: number;
  concurrency: number;
  reprocess: boolean;  // Flag to update existing candidates instead of skipping duplicates
  status: 'queued' | 'processing' | 'paused' | 'stopped' | 'completed' | 'failed';
}

// In-memory job queue (in production, use Redis/Bull/etc)
const jobQueue: BulkUrlJob[] = [];
const processingJobs = new Map<number, boolean>();
const jobControls = new Map<number, { paused: boolean; stopped: boolean }>();

// Process a batch of URLs concurrently
async function processBatch(urls: string[], ingestionJobId: number, reprocess: boolean = false): Promise<{
  successCount: number;
  failedCount: number;
  duplicateCount: number;
  errors: string[];
}> {
  const results = await Promise.allSettled(
    urls.map(async (url) => {
      try {
        // Use enhanced parsing that discovers LinkedIn URLs and generates biographies
        const candidateData = await parseEnhancedCandidateFromUrl(url);
        
        if (!candidateData) {
          return { type: 'failed', error: `Failed to parse URL: ${url}` };
        }
        
        // If we found a VERIFIED LinkedIn URL, scrape it and use 3-layer pipeline
        if (candidateData.linkedinUrl) {
          try {
            console.log(`✓ Found LinkedIn URL for ${candidateData.firstName} ${candidateData.lastName}: ${candidateData.linkedinUrl}`);
            console.log(`🔄 Scraping LinkedIn profile with Bright Data...`);
            
            // Step 1: Scrape the LinkedIn profile to get full data
            const linkedinData = await scrapeLinkedInProfile(candidateData.linkedinUrl);
            console.log(`✓ LinkedIn profile scraped successfully`);
            
            // Step 2: Generate biography AND extract career history using 3-layer pipeline
            console.log(`🎯 Starting 3-layer AI pipeline (Comprehension → Synthesis → Career Mapping)...`);
            const bioResult = await generateBiographyAndCareerHistory(
              candidateData.firstName,
              candidateData.lastName,
              linkedinData,
              candidateData.cvText // bio page content for context
            );
            
            if (bioResult) {
              candidateData.biography = bioResult.biography;
              (candidateData as any).careerHistory = bioResult.careerHistory;
              console.log(`✓ 3-layer pipeline complete: Biography ${bioResult.biography.length} chars, Career ${bioResult.careerHistory.length} positions`);
            }
          } catch (bioError) {
            console.log(`⚠️ Biography enhancement failed for ${candidateData.firstName}, continuing with basic data:`, bioError);
          }
        } else {
          console.log(`ℹ️ No verified LinkedIn URL for ${candidateData.firstName} ${candidateData.lastName}, using basic biography from bio page`);
        }

        // Check for duplicates
        const duplicates = await duplicateDetectionService.findCandidateDuplicates(candidateData);
        
        if (duplicates.length > 0) {
          // If reprocessing, UPDATE the existing candidate instead of skipping
          if (reprocess) {
            const matchResult = duplicates[0];
            const candidateId = matchResult.existingCandidateId; // Fix: use existingCandidateId from match result
            console.log(`🔄 Reprocessing: Updating existing candidate ${candidateId} (${candidateData.firstName} ${candidateData.lastName})`);
            
            await storage.updateCandidate(candidateId, {
              linkedinUrl: candidateData.linkedinUrl,
              biography: candidateData.biography,
              careerHistory: (candidateData as any).careerHistory,
              currentCompany: candidateData.currentCompany,
              currentTitle: candidateData.currentTitle,
              location: candidateData.location,
              skills: candidateData.skills
            });
            
            console.log(`✅ Updated candidate ${candidateId} with new data`);
            return { type: 'success', candidateData };
          } else {
            // Normal mode: record as duplicate
            await duplicateDetectionService.detectCandidateDuplicates(
              candidateData, 
              ingestionJobId
            );
            return { type: 'duplicate', candidateData };
          }
        } else {
          await storage.createCandidate(candidateData);
          return { type: 'success', candidateData };
        }
      } catch (error) {
        return { type: 'failed', error: `Error processing URL ${url}: ${error}` };
      }
    })
  );

  let successCount = 0;
  let failedCount = 0;
  let duplicateCount = 0;
  const errors: string[] = [];

  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      const value = result.value;
      if (value.type === 'success') {
        successCount++;
      } else if (value.type === 'duplicate') {
        duplicateCount++;
      } else if (value.type === 'failed') {
        failedCount++;
        errors.push(value.error || 'Unknown error');
      }
    } else {
      failedCount++;
      errors.push(`Promise rejection: ${result.reason || 'Unknown error'}`);
    }
  });

  return { successCount, failedCount, duplicateCount, errors };
}

// Process a bulk URL job in the background
async function processBulkUrlJob(job: BulkUrlJob): Promise<void> {
  console.log(`Starting background processing for job ${job.jobId} with ${job.urls.length} URLs`);
  
  try {
    // Mark job as processing
    processingJobs.set(job.jobId, true);
    jobControls.set(job.jobId, { paused: false, stopped: false });
    job.status = 'processing';
    
    await storage.updateIngestionJob(job.jobId, {
      status: 'processing',
      totalRecords: job.urls.length
    });

    let totalSuccessCount = 0;
    let totalFailedCount = 0;
    let totalDuplicateCount = 0;
    const allErrors: string[] = [];

    // Process URLs in batches
    for (let i = 0; i < job.urls.length; i += job.batchSize) {
      const controls = jobControls.get(job.jobId);
      
      // Check if job should be stopped
      if (controls?.stopped) {
        console.log(`Job ${job.jobId} was stopped by user`);
        await storage.updateIngestionJob(job.jobId, { status: 'stopped' });
        job.status = 'stopped';
        return;
      }
      
      // Check if job should be paused
      while (controls?.paused && !controls?.stopped) {
        console.log(`Job ${job.jobId} is paused, waiting...`);
        await storage.updateIngestionJob(job.jobId, { status: 'paused' });
        job.status = 'paused';
        await new Promise(resolve => setTimeout(resolve, 1000)); // Check every second
      }
      
      // Resume processing
      if (job.status === 'paused') {
        console.log(`Job ${job.jobId} resumed processing`);
        await storage.updateIngestionJob(job.jobId, { status: 'processing' });
        job.status = 'processing';
      }
      
      const batch = job.urls.slice(i, i + job.batchSize);
      const batchNumber = Math.floor(i / job.batchSize) + 1;
      const totalBatches = Math.ceil(job.urls.length / job.batchSize);
      const progressPercentage = Math.round((i / job.urls.length) * 100);
      
      console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} URLs) - ${progressPercentage}% complete`);
      
      const batchResults = await processBatch(batch, job.jobId, job.reprocess);
      
      totalSuccessCount += batchResults.successCount;
      totalFailedCount += batchResults.failedCount;
      totalDuplicateCount += batchResults.duplicateCount;
      allErrors.push(...batchResults.errors);
      
      // Update progress with percentage
      const processedSoFar = Math.min(i + job.batchSize, job.urls.length);
      const completionPercentage = Math.round((processedSoFar / job.urls.length) * 100);
      
      await storage.updateIngestionJob(job.jobId, {
        processedRecords: processedSoFar,
        successfulRecords: totalSuccessCount,
        duplicateRecords: totalDuplicateCount,
        errorRecords: totalFailedCount,
        errorDetails: allErrors.length > 0 ? JSON.stringify({...allErrors.slice(0, 50), progressPercentage: completionPercentage}) : JSON.stringify({progressPercentage: completionPercentage})
      });
    }

    // Mark job as completed
    await storage.updateIngestionJob(job.jobId, {
      status: 'completed',
      processedRecords: job.urls.length,
      successfulRecords: totalSuccessCount,
      duplicateRecords: totalDuplicateCount,
      errorRecords: totalFailedCount,
      errorDetails: allErrors.length > 0 ? JSON.stringify(allErrors.slice(0, 50)) : undefined
    });

    console.log(`Completed background processing for job ${job.jobId}: ${totalSuccessCount} success, ${totalDuplicateCount} duplicates, ${totalFailedCount} failures`);
    
  } catch (error) {
    console.error(`Error in background job processing for job ${job.jobId}:`, error);
    
    await storage.updateIngestionJob(job.jobId, {
      status: 'failed',
      errorDetails: JSON.stringify({ error: error instanceof Error ? error.message : String(error) })
    });
  } finally {
    processingJobs.delete(job.jobId);
  }
}

// Add a bulk URL job to the queue
export async function queueBulkUrlJob(
  jobId: number, 
  urls: string[], 
  options: { batchSize?: number; concurrency?: number; reprocess?: boolean } = {}
): Promise<void> {
  const job: BulkUrlJob = {
    id: Date.now(),
    jobId,
    urls,
    batchSize: options.batchSize || 10, // Process 10 URLs per batch
    concurrency: options.concurrency || 3, // 3 concurrent requests per batch
    reprocess: options.reprocess || false,
    status: 'queued'
  };
  
  jobQueue.push(job);
  console.log(`Queued background job for ingestion job ${jobId} with ${urls.length} URLs`);
  
  // Start processing immediately (in production, use a proper job queue)
  setImmediate(() => processBulkUrlJob(job));
}

// Pause a job
export function pauseJob(jobId: number): boolean {
  const controls = jobControls.get(jobId);
  if (controls && processingJobs.has(jobId)) {
    controls.paused = true;
    console.log(`Job ${jobId} paused by user`);
    return true;
  }
  return false;
}

// Resume a job
export function resumeJob(jobId: number): boolean {
  const controls = jobControls.get(jobId);
  if (controls && processingJobs.has(jobId)) {
    controls.paused = false;
    console.log(`Job ${jobId} resumed by user`);
    return true;
  }
  return false;
}

// Stop a job
export function stopJob(jobId: number): boolean {
  const controls = jobControls.get(jobId);
  if (controls && processingJobs.has(jobId)) {
    controls.stopped = true;
    controls.paused = false; // Stop overrides pause
    console.log(`Job ${jobId} stopped by user`);
    return true;
  }
  return false;
}

// Get job processing status
export function getJobProcessingStatus(jobId: number): boolean {
  return processingJobs.has(jobId);
}

// Get job controls status
export function getJobControls(jobId: number): { paused: boolean; stopped: boolean } | null {
  return jobControls.get(jobId) || null;
}

// Get queue length
export function getQueueLength(): number {
  return jobQueue.length;
}

/**
 * COMPANY INTELLIGENCE PROCESSING
 * Processes a company through the AI intelligence pipeline:
 * 1. Auto-categorization (industry, stage, funding, etc.)
 * 2. Office location discovery (extract office locations from website)
 * 3. Team discovery & org chart population
 * 4. Hiring pattern analysis
 */
export async function processCompanyIntelligence(companyId: number): Promise<void> {
  try {
    console.log(`\n[Company Intelligence] Starting processing for company ID ${companyId}...`);
    
    // Get company data
    const company = await storage.getCompany(companyId);
    if (!company || !company.website) {
      console.log(`[Company Intelligence] Company ${companyId} not found or has no website`);
      return;
    }
    
    console.log(`[Company Intelligence] Processing: ${company.name} (${company.website})`);
    
    // STEP 1: Auto-categorization
    console.log(`[Company Intelligence] Step 1/4: Auto-categorizing...`);
    const categorization = await categorizeCompany(company.website);
    
    if (categorization) {
      // Save tags to companyTags table
      await storage.saveCompanyTags({
        companyId: company.id,
        companyName: company.name,
        industryTags: categorization.industryTags,
        stageTags: categorization.stageTags,
        fundingTags: categorization.fundingTags,
        geographyTags: categorization.geographyTags,
        sizeTags: categorization.sizeTags,
        companyType: categorization.companyType,
        confidence: categorization.confidence
      });
      console.log(`[Company Intelligence] ✓ Auto-categorization complete (${categorization.industryTags?.join(', ')})`);
    }
    
    // STEP 2: Office location discovery (using AI-powered extraction - no browser needed)
    console.log(`[Company Intelligence] Step 2/4: Discovering office locations from website...`);
    try {
      const companyData = await parseCompanyFromUrl(company.website);
      
      if (companyData && companyData.officeLocations && companyData.officeLocations.length > 0) {
        console.log(`[Company Intelligence] Found ${companyData.officeLocations.length} office locations`);
        
        // Save office locations to company record
        await storage.updateCompany(company.id, {
          officeLocations: companyData.officeLocations
        });
        
        // Convert to hierarchy (create child companies)
        const hierarchy = await storage.convertCompanyToHierarchy(company.id);
        console.log(`[Company Intelligence] ✓ Created ${hierarchy.children.length} office location companies`);
      } else {
        console.log(`[Company Intelligence] ⚠ No office locations found on website`);
      }
    } catch (officeError) {
      console.error(`[Company Intelligence] Error discovering offices:`, officeError);
    }
    
    // STEP 3: Team discovery & org chart population
    console.log(`[Company Intelligence] Step 3/4: Discovering team members...`);
    const teamMembers = await discoverTeamMembers(company.website);
    
    if (teamMembers && teamMembers.length > 0) {
      console.log(`[Company Intelligence] Found ${teamMembers.length} team members, populating org chart...`);
      
      for (const member of teamMembers) {
        // Split name into first and last
        const nameParts = member.name.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        // Analyze role level (C-level, VP, etc.)
        const roleAnalysis = analyzeRoleLevel(member.title || '');
        
        // Save to organization chart
        await storage.saveToOrgChart({
          companyId: company.id,
          firstName,
          lastName,
          title: member.title || '',
          linkedinUrl: null, // Team discovery doesn't find LinkedIn
          bioUrl: member.bioUrl || null,
          level: roleAnalysis.level,
          department: roleAnalysis.department,
          isCLevel: roleAnalysis.isCLevel,
          isExecutive: roleAnalysis.isExecutive,
          discoverySource: 'team_discovery',
          discoveryUrl: company.website
        });
      }
      console.log(`[Company Intelligence] ✓ Organization chart populated with ${teamMembers.length} members`);
      
      // STEP 4: Hiring pattern analysis
      console.log(`[Company Intelligence] Step 4/4: Analyzing hiring patterns...`);
      const orgChartData = teamMembers.map(m => {
        const nameParts = m.name.trim().split(' ');
        return {
          id: 0, // Will be set by database
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || '',
          title: m.title || '',
          linkedinUrl: null,
          bioUrl: m.bioUrl || null
        };
      });
      
      const patterns = await analyzeCompanyHiringPatterns(company.id, orgChartData);
      
      if (patterns && patterns.preferredSourceCompanies.length > 0) {
        // Save hiring patterns
        await storage.saveHiringPatterns({
          companyId: company.id,
          companyName: company.name,
          preferredSourceCompanies: patterns.preferredSourceCompanies,
          sampleSize: patterns.sampleSize,
          confidenceScore: patterns.confidenceScore
        });
        console.log(`[Company Intelligence] ✓ Hiring patterns learned: ${patterns.talentSource}`);
      } else {
        console.log(`[Company Intelligence] ⚠ Insufficient data for pattern learning (need career history data)`);
      }
    } else {
      console.log(`[Company Intelligence] ⚠ No team members found on website`);
    }
    
    console.log(`[Company Intelligence] ✓ Processing complete for ${company.name}\n`);
    
  } catch (error) {
    console.error(`[Company Intelligence] Error processing company ${companyId}:`, error);
  }
}

/**
 * Process multiple companies in background
 */
export async function processBulkCompanyIntelligence(companyIds: number[]): Promise<void> {
  console.log(`[Company Intelligence] Starting bulk processing for ${companyIds.length} companies...`);
  
  for (const companyId of companyIds) {
    await processCompanyIntelligence(companyId);
    
    // Add small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`[Company Intelligence] Bulk processing complete for ${companyIds.length} companies`);
}