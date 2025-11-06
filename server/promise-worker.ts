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
      executionStartedAt: sql`now()`,
      executionLog: [
        {
          timestamp: new Date().toISOString(),
          event: 'execution_started',
          details: { searchParams: promise.searchParams }
        }
      ]
    });
    
    console.log(`[Promise Worker] Running search for: ${promise.searchParams.title || 'position'}`);
    
    // Get all candidates for matching
    const allCandidates = await storage.getCandidates();
    
    // Use the AI to generate candidate matches
    const matchedCandidates = await generateCandidateLonglist({
      jobTitle: promise.searchParams.title || '',
      skills: promise.searchParams.skills || [],
      industry: promise.searchParams.industry || '',
      yearsExperience: promise.searchParams.yearsExperience || '',
      location: promise.searchParams.location || '',
      salary: promise.searchParams.salary || ''
    }, allCandidates);
    
    console.log(`[Promise Worker] Found ${matchedCandidates.length} matching candidates`);
    
    // Extract candidate IDs
    const candidateIds = matchedCandidates.map((m: any) => m.candidateId);
    
    // Get or create job if needed
    let jobId = promise.jobId;
    if (!jobId) {
      // Get conversation to find company context
      const conversation = await storage.getConversation(promise.conversationId);
      let companyId = 1; // Default fallback
      
      if (conversation?.searchContext?.companyName) {
        const companies = await storage.searchCompanies(conversation.searchContext.companyName);
        if (companies.length > 0) {
          companyId = companies[0].parent.id;
        }
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
        searchTier: promise.searchParams.searchTier || 'internal',
        searchExecutionStatus: 'completed',
        searchProgress: {
          candidatesSearched: allCandidates.length,
          matchesFound: matchedCandidates.length,
          currentStep: 'Completed'
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
    
    // Update promise as completed
    await storage.updateSearchPromise(promiseId, {
      status: 'completed',
      completedAt: sql`now()`,
      jobId,
      candidatesFound: candidateIds.length,
      candidateIds,
      executionLog: [
        ...(promise.executionLog || []),
        {
          timestamp: new Date().toISOString(),
          event: 'search_completed',
          details: {
            candidatesFound: candidateIds.length,
            jobId
          }
        }
      ]
    });
    
    console.log(`[Promise Worker] ✅ Promise #${promiseId} completed successfully`);
    
    // TODO: Send notification to user (Task 6)
    
  } catch (error) {
    console.error(`[Promise Worker] ❌ Error executing promise #${promiseId}:`, error);
    
    // Mark as failed and log error
    await storage.updateSearchPromise(promiseId, {
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      retryCount: (promise.retryCount || 0) + 1,
      executionLog: [
        ...(promise.executionLog || []),
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
