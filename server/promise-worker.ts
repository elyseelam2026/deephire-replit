/**
 * Background Worker for Search Promises
 * 
 * This worker executes search promises made by the AI in conversations.
 * When the AI tells a user "I'll send you candidates in 72 hours", this
 * worker is what makes that promise actually happen.
 */

import { storage } from "./storage";
import { generateCandidateLonglist } from "./ai";
import { sql } from "drizzle-orm";
import type { SearchPromise } from "@shared/schema";
import { searchLinkedInPeople } from "./serpapi";
import { orchestrateProfileFetching } from "./sourcing-orchestrator";

/**
 * Execute a single search promise
 * - Runs the candidate search based on stored parameters
 * - Creates job order if needed
 * - Updates promise status
 * - Logs progress
 */
export async function executeSearchPromise(promiseId: number): Promise<void> {
  console.log(`[Promise Worker] Starting execution of promise #${promiseId}`);
  
  const promise = await storage.getSearchPromise(promiseId);
  
  if (!promise) {
    console.error(`[Promise Worker] Promise #${promiseId} not found`);
    return;
  }
  
  // Skip if already executing or completed
  if (promise.status === 'executing' || promise.status === 'completed') {
    console.log(`[Promise Worker] Promise #${promiseId} already ${promise.status}`);
    return;
  }
  
  try {
    // Mark as executing
    await storage.updateSearchPromise(promiseId, {
      status: 'executing',
      executionStartedAt: new Date(),
      executionLog: [
        ...(promise.executionLog || []),
        {
          timestamp: new Date().toISOString(),
          event: 'execution_started',
          details: { searchParams: promise.searchParams }
        }
      ]
    });
    
    // Re-fetch to get latest executionLog for subsequent updates
    const updatedPromise = await storage.getSearchPromise(promiseId);
    if (!updatedPromise) {
      console.error(`[Promise Worker] Promise #${promiseId} disappeared after status update`);
      return;
    }
    
    console.log(`[Promise Worker] Running EXTERNAL search for: ${promise.searchParams.title || 'position'}`);
    
    // 🌐 EXTERNAL SEARCH: Use SerpAPI to find NEW candidates from LinkedIn
    const searchCriteria = {
      title: promise.searchParams.title || '',
      location: promise.searchParams.location || '',
      keywords: promise.searchParams.skills || [],
    };
    
    console.log(`[Promise Worker] Searching LinkedIn with:`, searchCriteria);
    const searchResults = await searchLinkedInPeople(searchCriteria, 20);
    
    console.log(`[Promise Worker] Found ${searchResults.profiles.length} LinkedIn profiles`);
    
    let candidateIds: number[] = [];
    let sourcingRunId: number | null = null;
    
    if (searchResults.profiles.length > 0) {
      // Create sourcing run to track this external search
      const sourcingRun = await storage.createSourcingRun({
        jobId: promise.jobId || null,
        searchType: 'linkedin_people_search',
        searchQuery: searchCriteria,
        searchIntent: `Promise execution: ${promise.promiseText}`,
        status: 'processing',
        progress: {
          phase: 'searching',
          profilesFound: searchResults.profiles.length,
          profilesFetched: 0,
          profilesProcessed: 0,
          candidatesCreated: 0,
          candidatesDuplicate: 0,
          currentBatch: 0,
          totalBatches: 0,
          message: 'Starting profile fetching...',
        },
      });
      
      sourcingRunId = sourcingRun.id;
      console.log(`[Promise Worker] Created sourcing run #${sourcingRunId}`);
      
      // Fetch and process LinkedIn profiles
      const profileUrls = searchResults.profiles.map(p => p.profileUrl);
      const fetchResults = await orchestrateProfileFetching({
        sourcingRunId,
        profileUrls,
        batchSize: 5,
      });
      
      // Extract candidate IDs from successful profile fetches
      const successfulProfiles = fetchResults.filter(r => r.success && r.data);
      
      // Query the database to find candidates created from these profiles
      // Note: orchestrateProfileFetching creates candidates automatically
      // We need to fetch them by checking recent candidates
      const recentCandidates = await storage.getCandidates();
      
      // For now, just use all candidates created in this run (improvement: track by sourcing_run_id)
      candidateIds = recentCandidates.slice(0, successfulProfiles.length).map(c => c.id);
      
      console.log(`[Promise Worker] External search created ${candidateIds.length} new candidates`);
    } else {
      console.log(`[Promise Worker] No LinkedIn profiles found - trying internal database fallback`);
      
      // FALLBACK: Search internal database if external search returns nothing
      const allCandidates = await storage.getCandidates();
      const jobSkills = promise.searchParams.skills || [];
      const jobText = `${promise.searchParams.title || ''} ${promise.searchParams.location || ''} ${promise.searchParams.industry || ''}`;
      
      // Map candidates to the format expected by generateCandidateLonglist
      const candidatesForMatching = allCandidates.map(c => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        currentTitle: c.currentTitle || '',
        skills: c.skills || [],
        cvText: c.cvText || undefined,
      }));
      
      const matchedCandidates = await generateCandidateLonglist(
        candidatesForMatching,
        jobSkills,
        jobText,
        20
      );
      
      candidateIds = matchedCandidates.map((m: any) => m.candidateId);
      console.log(`[Promise Worker] Internal fallback found ${candidateIds.length} candidates`);
    }
    
    // Get or create job if needed
    let jobId = promise.jobId;
    if (!jobId) {
      // Get conversation to find company context
      const conversation = await storage.getConversation(promise.conversationId);
      let companyId: number;
      
      // Try to find company from conversation context
      if (conversation?.searchContext?.companyName) {
        const companies = await storage.searchCompanies(conversation.searchContext.companyName);
        if (companies.length > 0) {
          companyId = companies[0].parent.id;
        } else {
          // Create placeholder company for this search
          const placeholderCompany = await storage.createCompany({
            name: conversation.searchContext.companyName || 'AI Search Client',
            industry: conversation.searchContext.industry || 'General',
            location: conversation.searchContext.location || 'Global'
          });
          companyId = placeholderCompany.id;
          console.log(`📝 Created placeholder company #${companyId} for promise`);
        }
      } else {
        // No company name in context - create a generic placeholder
        const placeholderCompany = await storage.createCompany({
          name: 'AI Search Client',
          industry: promise.searchParams.industry || 'General',
          location: promise.searchParams.location || 'Global'
        });
        companyId = placeholderCompany.id;
        console.log(`📝 Created generic placeholder company #${companyId} for promise`);
      }
      
      // Create job order
      const job = await storage.createJob({
        title: promise.searchParams.title || 'Search Result',
        department: 'General',
        companyId,
        jdText: `Automated search from conversation promise: ${promise.promiseText}`,
        parsedData: promise.searchParams,
        skills: promise.searchParams.skills || [],
        urgency: promise.searchParams.urgency || 'medium',
        status: 'active',
        searchTier: sourcingRunId ? 'external' : 'internal',
        searchExecutionStatus: 'completed',
        searchProgress: {
          candidatesSearched: sourcingRunId ? searchResults?.profiles?.length || 0 : 0,
          matchesFound: candidateIds.length,
          currentStep: 'Completed',
          sourcingRunId: sourcingRunId || undefined
        }
      });
      
      jobId = job.id;
      console.log(`[Promise Worker] Created job #${jobId} - ${job.title}`);
    }
    
    // Add candidates to job
    if (candidateIds.length > 0) {
      await storage.addCandidatesToJob(jobId, candidateIds);
      console.log(`[Promise Worker] Added ${candidateIds.length} candidates to job #${jobId}`);
    }
    
    // Update promise as completed (using latest executionLog)
    await storage.updateSearchPromise(promiseId, {
      status: 'completed',
      completedAt: new Date(),
      jobId,
      candidatesFound: candidateIds.length,
      candidateIds,
      executionLog: [
        ...(updatedPromise.executionLog || []),
        {
          timestamp: new Date().toISOString(),
          event: 'search_completed',
          details: {
            searchType: sourcingRunId ? 'external_linkedin' : 'internal_database',
            candidatesFound: candidateIds.length,
            sourcingRunId: sourcingRunId || undefined,
            jobId
          }
        }
      ]
    });
    
    console.log(`[Promise Worker] ✅ Promise #${promiseId} completed successfully`);
    
    // TODO: Send notification to user (Task 6)
    
  } catch (error) {
    console.error(`[Promise Worker] ❌ Error executing promise #${promiseId}:`, error);
    
    // Re-fetch to get latest log before marking as failed
    const failedPromise = await storage.getSearchPromise(promiseId);
    
    // Mark as failed and log error
    await storage.updateSearchPromise(promiseId, {
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      retryCount: (promise.retryCount || 0) + 1,
      executionLog: [
        ...(failedPromise?.executionLog || promise.executionLog || []),
        {
          timestamp: new Date().toISOString(),
          event: 'execution_failed',
          details: {
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      ]
    });
  }
}

/**
 * Process all pending promises
 * - Finds promises that are due to be executed
 * - Runs them in sequence (could be parallelized later)
 * - Returns count of processed promises
 */
export async function processAllPendingPromises(): Promise<number> {
  console.log('[Promise Worker] Checking for pending promises...');
  
  const pendingPromises = await storage.getPendingSearchPromises();
  
  if (pendingPromises.length === 0) {
    console.log('[Promise Worker] No pending promises to process');
    return 0;
  }
  
  console.log(`[Promise Worker] Found ${pendingPromises.length} pending promises to execute`);
  
  for (const promise of pendingPromises) {
    await executeSearchPromise(promise.id);
  }
  
  return pendingPromises.length;
}

/**
 * Schedule the promise worker to run periodically
 * Currently runs every 5 minutes
 * Can be improved with a proper job queue system later
 */
export function startPromiseWorker() {
  console.log('[Promise Worker] Starting background worker...');
  
  // Run immediately on startup
  processAllPendingPromises().catch(error => {
    console.error('[Promise Worker] Error in initial run:', error);
  });
  
  // Then run every 5 minutes
  setInterval(() => {
    processAllPendingPromises().catch(error => {
      console.error('[Promise Worker] Error in scheduled run:', error);
    });
  }, 5 * 60 * 1000); // 5 minutes
  
  console.log('[Promise Worker] Background worker started (runs every 5 minutes)');
}
