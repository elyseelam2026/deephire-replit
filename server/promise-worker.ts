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
import { computeJobPricing } from "@shared/pricing";

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
    
    // Fetch job's search strategy for rich Boolean query
    let searchStrategy: any = null;
    if (promise.jobId) {
      const job = await storage.getJob(promise.jobId);
      if (job && job.searchStrategy) {
        searchStrategy = job.searchStrategy as any;
        console.log(`[Promise Worker] Using job's search strategy with Boolean query`);
      }
    }
    
    console.log(`[Promise Worker] Running EXTERNAL search for: ${promise.searchParams.title || 'position'}`);
    
    // 🌐 EXTERNAL SEARCH: Build search criteria with NAP-driven Boolean query
    // Priority: searchStrategy.keywords (Boolean query) > promise.searchParams (fallback)
    let searchCriteria: any;
    let usingNAPStrategy = false;
    
    if (searchStrategy?.keywords && typeof searchStrategy.keywords === 'string' && searchStrategy.keywords.trim()) {
      // Use NAP-driven search strategy with Boolean query
      // Normalize industries to ensure it's always a string array (never null/undefined)
      const industries = searchStrategy.filters?.industry;
      const normalizedIndustries = Array.isArray(industries) 
        ? industries.filter((i: any) => typeof i === 'string' && i.trim()) 
        : [];
      
      searchCriteria = {
        title: promise.searchParams.title || '',
        location: searchStrategy.filters?.location || promise.searchParams.location || '',
        booleanQuery: searchStrategy.keywords, // LinkedIn Boolean search string (STRING, not array)
        industries: normalizedIndustries,
        // Include priority signals if available
        prioritySignals: searchStrategy.prioritySignals || [],
      };
      usingNAPStrategy = true;
      console.log(`✅ Using NAP Boolean query: "${searchStrategy.keywords}"`);
    } else {
      // Fallback to basic search params when no Boolean query available
      searchCriteria = {
        title: promise.searchParams.title || '',
        location: promise.searchParams.location || '',
        keywords: promise.searchParams.skills || [],
      };
      console.log(`⚠️  No Boolean query found, using fallback params`);
    }
    
    console.log(`[Promise Worker] Searching LinkedIn with:`, searchCriteria);
    
    let searchResults;
    try {
      searchResults = await searchLinkedInPeople(searchCriteria, 20);
      
      // Log if Boolean query returned zero results (helps debug underperforming queries)
      if (usingNAPStrategy && searchResults.profiles.length === 0) {
        console.warn(`⚠️  NAP Boolean query returned zero results - may need refinement`);
        await storage.updateSearchPromise(promiseId, {
          executionLog: [
            ...(updatedPromise.executionLog || []),
            {
              timestamp: new Date().toISOString(),
              event: 'zero_external_results',
              details: { 
                booleanQuery: searchStrategy.keywords,
                message: 'Boolean query returned no results - falling back to internal search'
              }
            }
          ]
        });
      }
    } catch (error) {
      console.error(`[Promise Worker] SerpAPI search failed:`, error);
      
      // Mark promise as failed with error details
      const failedPromise = await storage.updateSearchPromise(promiseId, {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'External search failed',
        completedAt: new Date(),
        retryCount: (updatedPromise.retryCount || 0) + 1, // Increment from latest state
        executionLog: [
          ...(updatedPromise.executionLog || []),
          {
            timestamp: new Date().toISOString(),
            event: 'search_failed',
            details: { 
              error: error instanceof Error ? error.message : String(error),
              retryCount: (updatedPromise.retryCount || 0) + 1
            }
          }
        ]
      });
      
      throw error; // Re-throw to skip candidate creation
    }
    
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
      
      // Calculate job pricing
      const searchTier = sourcingRunId ? 'external' : 'internal';
      const urgency = promise.searchParams.urgency || 'medium';
      const salary = promise.searchParams.salary || promise.searchParams.salaryRangeMax || promise.searchParams.salaryRangeMin;
      
      const pricing = computeJobPricing({
        salary,
        searchTier,
        urgency
      });
      
      // Log if salary is missing
      if (!salary) {
        console.warn(`⚠️  Job pricing: Missing salary data for promise #${promiseId}. Fees set to null.`);
      }
      
      // Create job order with pricing
      const job = await storage.createJob({
        title: promise.searchParams.title || 'Search Result',
        department: 'General',
        companyId,
        jdText: `Automated search from conversation promise: ${promise.promiseText}`,
        parsedData: promise.searchParams,
        skills: promise.searchParams.skills || [],
        urgency,
        status: 'active',
        searchTier,
        searchExecutionStatus: 'completed',
        searchProgress: {
          candidatesSearched: sourcingRunId ? searchResults?.profiles?.length || 0 : 0,
          matchesFound: candidateIds.length,
          currentStep: 'Completed',
          sourcingRunId: sourcingRunId || undefined
        },
        // Pricing fields
        basePlacementFee: pricing.basePlacementFee,
        estimatedPlacementFee: pricing.estimatedPlacementFee,
        turnaroundLevel: pricing.turnaroundLevel,
        turnaroundHours: pricing.turnaroundHours,
        turnaroundFeeMultiplier: pricing.turnaroundFeeMultiplier
      });
      
      jobId = job.id;
      console.log(`[Promise Worker] Created job #${jobId} - ${job.title}`);
    }
    
    // Add candidates to job
    if (candidateIds.length > 0) {
      await storage.addCandidatesToJob(jobId, candidateIds);
      console.log(`[Promise Worker] Added ${candidateIds.length} candidates to job #${jobId}`);
    }
    
    // Re-fetch promise to get LATEST executionLog (includes zero-results event if logged)
    const latestPromise = await storage.getSearchPromise(promiseId);
    if (!latestPromise) {
      console.error(`[Promise Worker] Promise #${promiseId} disappeared before completion`);
      return;
    }
    
    // Determine status based on results
    let promiseStatus: string;
    let deliveryMessage: string;
    
    if (candidateIds.length > 0) {
      // Found candidates - mark as completed
      promiseStatus = 'completed';
      deliveryMessage = `✅ **Your ${promise.searchParams.title || 'search'} longlist is ready!**\n\n` +
        `I've found **${candidateIds.length} qualified candidates** and created Job Order #${jobId}.\n\n` +
        `🔗 **[View Candidate Pipeline →](jobs/${jobId})**\n\n` +
        `You can now review candidates, move them through stages, and manage this search.`;
      console.log(`[Promise Worker] ✅ Promise #${promiseId} completed successfully with ${candidateIds.length} candidates`);
    } else {
      // No candidates found - need to discuss with client to refine search
      promiseStatus = 'needs_discussion';
      deliveryMessage = `⚠️ **Search Refinement Needed**\n\n` +
        `I searched for **${promise.searchParams.title || 'candidates'}** but didn't find any matches with the current criteria.\n\n` +
        `Let's refine the search direction together. Can you help me understand:\n` +
        `• Are the experience/seniority requirements realistic for the market?\n` +
        `• Should we expand the location or industry scope?\n` +
        `• Are there alternative titles or related skills we should consider?\n` +
        `• Any specific companies or profiles we should be sourcing from?\n\n` +
        `Once you provide feedback, I'll adjust the search strategy and try again.`;
      console.log(`[Promise Worker] 🔄 Promise #${promiseId} marked as NEEDS_DISCUSSION - initiating client feedback loop`);
    }
    
    // Update promise status
    await storage.updateSearchPromise(promiseId, {
      status: promiseStatus,
      completedAt: candidateIds.length > 0 ? new Date() : undefined,
      jobId: candidateIds.length > 0 ? jobId : undefined,
      candidatesFound: candidateIds.length,
      candidateIds: candidateIds.length > 0 ? candidateIds : undefined,
      executionLog: [
        ...(latestPromise.executionLog || []),
        {
          timestamp: new Date().toISOString(),
          event: candidateIds.length > 0 ? 'search_completed' : 'search_zero_results',
          details: {
            searchType: sourcingRunId ? 'external_linkedin' : 'internal_database',
            candidatesFound: candidateIds.length,
            sourcingRunId: sourcingRunId || undefined,
            jobId: candidateIds.length > 0 ? jobId : undefined,
            status: promiseStatus,
            message: candidateIds.length > 0 
              ? `Successfully found ${candidateIds.length} candidates` 
              : 'No candidates found - initiating client discussion to refine search'
          }
        }
      ]
    });
    
    // ✉️ SEND RESULTS BACK TO CONVERSATION
    try {
      const conversation = await storage.getConversation(promise.conversationId);
      if (conversation && conversation.messages) {
        
        const updatedMessages = [
          ...conversation.messages,
          {
            role: 'assistant' as const,
            content: deliveryMessage,
            timestamp: new Date().toISOString(),
            metadata: {
              type: 'job_created' as const,
              jobId: jobId!,
              candidateIds: candidateIds
            }
          }
        ];
        
        await storage.updateConversation(promise.conversationId, {
          messages: updatedMessages,
          jobId: jobId!
        });
        
        console.log(`[Promise Worker] 📧 Sent results to conversation #${promise.conversationId}`);
      }
    } catch (notificationError) {
      console.error(`[Promise Worker] Failed to send notification to conversation:`, notificationError);
      // Don't fail the whole promise if notification fails
    }
    
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
