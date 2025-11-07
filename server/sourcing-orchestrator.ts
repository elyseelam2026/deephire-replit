/**
 * External Candidate Sourcing Orchestrator
 * Manages async batch processing of LinkedIn profile fetching and candidate creation
 */

import { scrapeLinkedInProfile, type LinkedInProfileData } from './brightdata';
import { db } from './db';
import { sourcingRuns, candidates } from '../shared/schema';
import { eq } from 'drizzle-orm';

export interface SourcingJobConfig {
  sourcingRunId: number;
  profileUrls: string[];
  batchSize?: number;        // Number of profiles to fetch concurrently (default: 5)
  maxRetries?: number;       // Max retries per profile (default: 2)
  delayBetweenBatches?: number; // Delay in ms between batches (default: 2000)
}

export interface SourcingProgress {
  phase: 'searching' | 'fetching' | 'processing' | 'completed' | 'failed';
  profilesFound: number;
  profilesFetched: number;
  profilesProcessed: number;
  candidatesCreated: number;
  candidatesDuplicate: number;
  currentBatch: number;
  totalBatches: number;
  message: string;
  errors?: string[];
}

export interface ProfileFetchResult {
  url: string;
  success: boolean;
  data?: LinkedInProfileData;
  error?: string;
  retries: number;
}

/**
 * Main orchestration function: Fetches LinkedIn profiles in batches
 * Updates sourcing_runs table with real-time progress
 * 
 * @param config Sourcing job configuration
 * @returns Array of fetch results
 */
export async function orchestrateProfileFetching(
  config: SourcingJobConfig
): Promise<ProfileFetchResult[]> {
  const {
    sourcingRunId,
    profileUrls,
    batchSize = 5,
    maxRetries = 2,
    delayBetweenBatches = 2000,
  } = config;

  console.log(`\n🚀 [Sourcing Orchestrator] Starting job for run #${sourcingRunId}`);
  console.log(`   Profiles to fetch: ${profileUrls.length}`);
  console.log(`   Batch size: ${batchSize}`);
  
  const totalBatches = Math.ceil(profileUrls.length / batchSize);
  const results: ProfileFetchResult[] = [];
  
  // Update status to 'fetching_profiles'
  await updateSourcingProgress(sourcingRunId, {
    phase: 'fetching',
    profilesFound: profileUrls.length,
    profilesFetched: 0,
    profilesProcessed: 0,
    candidatesCreated: 0,
    candidatesDuplicate: 0,
    currentBatch: 0,
    totalBatches,
    message: `Starting to fetch ${profileUrls.length} LinkedIn profiles...`,
  });

  // Process profiles in batches
  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const batchStart = batchIndex * batchSize;
    const batchEnd = Math.min(batchStart + batchSize, profileUrls.length);
    const batchUrls = profileUrls.slice(batchStart, batchEnd);
    
    console.log(`\n📦 [Batch ${batchIndex + 1}/${totalBatches}] Fetching ${batchUrls.length} profiles`);
    
    // Update progress
    await updateSourcingProgress(sourcingRunId, {
      phase: 'fetching',
      profilesFound: profileUrls.length,
      profilesFetched: results.filter(r => r.success).length,
      profilesProcessed: 0,
      candidatesCreated: 0,
      candidatesDuplicate: 0,
      currentBatch: batchIndex + 1,
      totalBatches,
      message: `Fetching batch ${batchIndex + 1}/${totalBatches} (${batchUrls.length} profiles)...`,
    });
    
    // Fetch profiles in parallel within this batch
    const batchPromises = batchUrls.map(url => 
      fetchProfileWithRetry(url, maxRetries)
    );
    
    const batchResults = await Promise.allSettled(batchPromises);
    
    // Process results
    for (let i = 0; i < batchResults.length; i++) {
      const url = batchUrls[i];
      const result = batchResults[i];
      
      if (result.status === 'fulfilled') {
        results.push(result.value);
        if (result.value.success) {
          console.log(`   ✅ Fetched: ${result.value.data?.name || url}`);
        } else {
          console.log(`   ❌ Failed: ${url} - ${result.value.error}`);
        }
      } else {
        // Promise was rejected
        results.push({
          url,
          success: false,
          error: result.reason?.message || 'Unknown error',
          retries: maxRetries,
        });
        console.log(`   ❌ Failed: ${url} - ${result.reason?.message}`);
      }
    }
    
    // Delay between batches to avoid rate limiting
    if (batchIndex < totalBatches - 1) {
      console.log(`   ⏱️  Waiting ${delayBetweenBatches}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }
  
  const successCount = results.filter(r => r.success).length;
  const failedCount = results.filter(r => !r.success).length;
  
  console.log(`\n✅ [Sourcing Orchestrator] Completed`);
  console.log(`   Success: ${successCount}/${profileUrls.length}`);
  console.log(`   Failed: ${failedCount}/${profileUrls.length}`);
  
  // Update final progress
  await updateSourcingProgress(sourcingRunId, {
    phase: 'processing',
    profilesFound: profileUrls.length,
    profilesFetched: successCount,
    profilesProcessed: 0,
    candidatesCreated: 0,
    candidatesDuplicate: 0,
    currentBatch: totalBatches,
    totalBatches,
    message: `Fetched ${successCount} profiles successfully. Processing candidates...`,
  });
  
  return results;
}

/**
 * Fetch a single LinkedIn profile with retry logic
 */
async function fetchProfileWithRetry(
  url: string,
  maxRetries: number
): Promise<ProfileFetchResult> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`   🔄 Retry ${attempt}/${maxRetries} for: ${url}`);
        // Exponential backoff: 2s, 4s, 8s
        const delay = Math.min(2000 * Math.pow(2, attempt - 1), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      const data = await scrapeLinkedInProfile(url);
      
      return {
        url,
        success: true,
        data,
        retries: attempt,
      };
      
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on certain errors (auth, invalid URL, etc.)
      if (
        lastError.message.includes('authentication') ||
        lastError.message.includes('Invalid LinkedIn URL') ||
        lastError.message.includes('suspended')
      ) {
        break; // Don't retry these errors
      }
    }
  }
  
  return {
    url,
    success: false,
    error: lastError?.message || 'Unknown error',
    retries: maxRetries,
  };
}

/**
 * Update sourcing run progress in database
 */
async function updateSourcingProgress(
  sourcingRunId: number,
  progress: SourcingProgress
): Promise<void> {
  try {
    await db
      .update(sourcingRuns)
      .set({
        status: progressPhaseToStatus(progress.phase),
        progress: progress as any,
        updatedAt: new Date(),
      })
      .where(eq(sourcingRuns.id, sourcingRunId));
  } catch (error) {
    console.error(`[Sourcing Orchestrator] Failed to update progress:`, error);
    // Don't throw - progress update failure shouldn't stop the job
  }
}

/**
 * Map progress phase to sourcing run status
 */
function progressPhaseToStatus(phase: SourcingProgress['phase']): string {
  const mapping: Record<SourcingProgress['phase'], string> = {
    searching: 'searching',
    fetching: 'fetching_profiles',
    processing: 'processing',
    completed: 'completed',
    failed: 'failed',
  };
  return mapping[phase] || 'processing';
}

/**
 * Batch array into chunks
 */
export function batchArray<T>(array: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < array.length; i += batchSize) {
    batches.push(array.slice(i, i + batchSize));
  }
  return batches;
}
