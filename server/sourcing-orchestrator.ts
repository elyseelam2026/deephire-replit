/**
 * External Candidate Sourcing Orchestrator
 * Manages async batch processing of LinkedIn profile fetching and candidate creation
 */

import { scrapeLinkedInProfile, type LinkedInProfileData } from './brightdata';
import { db } from './db';
import { sourcingRuns, candidates, jobCandidates, jobs } from '../shared/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { batchCreateCandidates } from './candidate-ingestion';
import { scoreCandidateFit } from './ai';

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
  
  // Step 2: Ingest profiles into database (CREATE CANDIDATES)
  console.log(`\n🔄 [Sourcing Orchestrator] Starting candidate ingestion...`);
  
  const successfulProfiles: LinkedInProfileData[] = [];
  const successfulUrls: string[] = [];
  
  for (const result of results) {
    if (result.success && result.data) {
      successfulProfiles.push(result.data);
      successfulUrls.push(result.url);
    }
  }
  
  if (successfulProfiles.length > 0) {
    const ingestionResults = await batchCreateCandidates(
      successfulProfiles,
      sourcingRunId,
      successfulUrls
    );
    
    const candidatesCreated = ingestionResults.filter(r => r.success).length;
    const candidatesDuplicate = ingestionResults.filter(r => r.isDuplicate).length;
    const candidateIds = ingestionResults
      .filter(r => r.success && r.candidateId)
      .map(r => r.candidateId!);
    
    // Step 3: Link candidates to job if jobId exists (WITH FIT SCORE QUALITY GATE)
    let jobCandidatesLinked = 0;
    let jobCandidatesRejected = 0;
    const FIT_SCORE_THRESHOLD = 70; // Minimum fit score to stage candidates
    
    if (candidateIds.length > 0) {
      try {
        // Get sourcing run to check if it has a jobId
        const [sourcingRun] = await db
          .select()
          .from(sourcingRuns)
          .where(eq(sourcingRuns.id, sourcingRunId))
          .limit(1);
        
        if (sourcingRun?.jobId) {
          console.log(`\n🎯 [Quality Gate] Scoring ${candidateIds.length} candidates before staging...`);
          
          // Load job with NAP context
          const [job] = await db
            .select()
            .from(jobs)
            .where(eq(jobs.id, sourcingRun.jobId))
            .limit(1);
          
          if (!job) {
            console.error(`❌ Job #${sourcingRun.jobId} not found`);
            return results; // Return accumulated results (ProfileFetchResult[])
          }
          
          // Extract NAP context
          const parsedData = job.parsedData as any;
          const needAnalysis = job.needAnalysis as any;
          const searchStrategy = job.searchStrategy as any;
          
          const napContext = {
            title: parsedData?.title || job.title || undefined,
            industry: parsedData?.industry || undefined,
            location: parsedData?.location || undefined,
            skills: parsedData?.skills || [],
            yearsExperience: parsedData?.yearsExperience || undefined,
            urgency: needAnalysis?.urgency || undefined,
            successCriteria: needAnalysis?.successCriteria || undefined,
            teamDynamics: needAnalysis?.teamDynamics || undefined,
          };
          
          // Load all candidate records
          const candidateRecords = await db
            .select()
            .from(candidates)
            .where(inArray(candidates.id, candidateIds));
          
          // Score candidates in batches (3-5 concurrent) with throttling
          const batchSize = 4;
          for (let i = 0; i < candidateRecords.length; i += batchSize) {
            const batch = candidateRecords.slice(i, i + batchSize);
            
            await Promise.all(batch.map(async (candidate) => {
              try {
                // Check if already linked
                const [existing] = await db
                  .select()
                  .from(jobCandidates)
                  .where(
                    and(
                      eq(jobCandidates.jobId, sourcingRun.jobId),
                      eq(jobCandidates.candidateId, candidate.id)
                    )
                  )
                  .limit(1);
                
                if (existing) {
                  console.log(`   [SKIP] ${candidate.firstName} ${candidate.lastName} - Already linked`);
                  return;
                }
                
                // Score using NAP rubric + Grok AI
                const { calculateNAPFit } = await import('./nap-strategy');
                let napFitResult;
                
                if (needAnalysis && searchStrategy) {
                  const napData = needAnalysis as { need?: string; authority?: string; pain?: string };
                  napFitResult = calculateNAPFit(
                    {
                      currentTitle: candidate.currentTitle || null,
                      currentCompany: candidate.currentCompany || null,
                      yearsExperience: candidate.yearsExperience || null,
                      skills: candidate.skills || [],
                      careerHistory: candidate.careerHistory as any,
                      location: candidate.location || null,
                    },
                    {
                      need: napData.need || napContext.title || '',
                      authority: napData.authority || 'Senior leadership',
                      pain: napData.pain || napContext.urgency || 'Business critical'
                    },
                    searchStrategy
                  );
                }
                
                // Grok AI scoring (for rich reasoning)
                const education = candidate.education as any;
                const fitResult = await scoreCandidateFit(
                  {
                    name: `${candidate.firstName} ${candidate.lastName}`,
                    currentTitle: candidate.currentTitle || 'Unknown',
                    currentCompany: candidate.currentCompany || 'Unknown',
                    skills: candidate.skills || [],
                    experience: `${candidate.yearsExperience || 0} years`,
                    education: Array.isArray(education) && education.length > 0 ? education[0]?.degree : undefined,
                    location: candidate.location || undefined,
                  },
                  napContext
                );
                
                const finalFitScore = napFitResult ? napFitResult.score * 10 : fitResult.fitScore;
                
                // QUALITY GATE: Only link if fitScore ≥ 70
                if (finalFitScore >= FIT_SCORE_THRESHOLD) {
                  await db.insert(jobCandidates).values({
                    jobId: sourcingRun.jobId,
                    candidateId: candidate.id,
                    status: 'recommended',
                    matchScore: 80,
                    fitScore: finalFitScore,
                    fitReasoning: fitResult.reasoning,
                    fitStrengths: fitResult.strengths,
                    fitConcerns: fitResult.concerns,
                    aiReasoning: {
                      reasoning: `Externally sourced via LinkedIn (Run #${sourcingRunId}) | Fit: ${finalFitScore}/100`,
                      source: 'external_linkedin_search',
                      sourcingRunId
                    },
                    searchTier: 2,
                    recruiterNotes: null,
                    lastActionAt: new Date()
                  });
                  jobCandidatesLinked++;
                  console.log(`   ✅ ACCEPT: ${candidate.firstName} ${candidate.lastName} - ${candidate.currentTitle} | Fit: ${finalFitScore}/100`);
                } else {
                  jobCandidatesRejected++;
                  console.log(`   ❌ REJECT: ${candidate.firstName} ${candidate.lastName} - ${candidate.currentTitle} | Fit: ${finalFitScore}/100 < ${FIT_SCORE_THRESHOLD}`);
                }
                
              } catch (error) {
                console.error(`   ⚠️ Error scoring candidate #${candidate.id}:`, error);
                // Continue with other candidates
              }
            }));
            
            // Rate limiting between batches
            if (i + batchSize < candidateRecords.length) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
          
          console.log(`\n✅ [Quality Gate] Results: ${jobCandidatesLinked} accepted, ${jobCandidatesRejected} rejected (threshold: ${FIT_SCORE_THRESHOLD}/100)`);
          
        } else {
          console.log(`ℹ️  [Sourcing Orchestrator] No jobId found - candidates saved without job link`);
        }
      } catch (error) {
        console.error(`❌ [Sourcing Orchestrator] Failed to link candidates to job:`, error);
        // Don't fail the whole operation if linking fails
      }
    }
    
    // Update sourcing run with final results
    await db
      .update(sourcingRuns)
      .set({
        status: 'completed',
        candidatesCreated: candidateIds,
        completedAt: new Date(),
        progress: {
          phase: 'completed',
          profilesFound: profileUrls.length,
          profilesFetched: successCount,
          profilesProcessed: successfulProfiles.length,
          candidatesCreated,
          candidatesDuplicate,
          currentBatch: totalBatches,
          totalBatches,
          message: `✅ Completed: Created ${candidatesCreated} candidates (${candidatesDuplicate} duplicates skipped)`,
        } as any,
      })
      .where(eq(sourcingRuns.id, sourcingRunId));
    
    console.log(`\n✅ [Sourcing Orchestrator] Job complete!`);
    console.log(`   Profiles fetched: ${successCount}`);
    console.log(`   Candidates created: ${candidatesCreated}`);
    console.log(`   Duplicates skipped: ${candidatesDuplicate}`);
  } else {
    // No successful profiles - mark as completed with zero results
    await db
      .update(sourcingRuns)
      .set({
        status: failedCount === profileUrls.length ? 'failed' : 'completed',
        candidatesCreated: [],
        completedAt: new Date(),
        progress: {
          phase: failedCount === profileUrls.length ? 'failed' : 'completed',
          profilesFound: profileUrls.length,
          profilesFetched: 0,
          profilesProcessed: 0,
          candidatesCreated: 0,
          candidatesDuplicate: 0,
          currentBatch: totalBatches,
          totalBatches,
          message: failedCount === profileUrls.length 
            ? `❌ Failed: All ${failedCount} profile fetches failed`
            : `⚠️  Completed: No profiles fetched (${profileUrls.length} URLs provided)`,
        } as any,
      })
      .where(eq(sourcingRuns.id, sourcingRunId));
    
    console.log(`\n⚠️  [Sourcing Orchestrator] No candidates created`);
    console.log(`   Profiles found: ${profileUrls.length}`);
    console.log(`   Successful fetches: 0`);
  }
  
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

/**
 * AI-POWERED FIT SCORING: Score all candidates for a job based on NAP context
 * This is what creates the "WOW effect" - intelligent ranking beyond keyword matching
 * 
 * @param jobId Job to score candidates for
 * @param candidateIds Array of candidate IDs to score
 */
async function scoreCandidatesForJob(jobId: number, candidateIds: number[]): Promise<void> {
  try {
    console.log(`\n🧠 [Fit Scoring] Starting AI-powered fit scoring for ${candidateIds.length} candidates on job #${jobId}...`);
    
    // Step 1: Load job with NAP context
    const [job] = await db
      .select()
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .limit(1);
    
    if (!job) {
      console.error(`❌ [Fit Scoring] Job #${jobId} not found`);
      return;
    }
    
    // Extract NAP context from job
    const parsedData = job.parsedData as any;
    const needAnalysis = job.needAnalysis as any;
    
    const napContext = {
      title: parsedData?.title || job.title || undefined,
      industry: parsedData?.industry || undefined,
      location: parsedData?.location || undefined,
      skills: parsedData?.skills || [],
      yearsExperience: parsedData?.yearsExperience || undefined,
      urgency: needAnalysis?.urgency || undefined,
      successCriteria: needAnalysis?.successCriteria || undefined,
      teamDynamics: needAnalysis?.teamDynamics || undefined,
    };
    
    console.log(`   📋 NAP Context: ${napContext.title} in ${napContext.location || 'Any Location'}`);
    console.log(`   ⏱️  Urgency: ${napContext.urgency || 'Not specified'}`);
    
    // Step 2: Load all candidates
    const candidateRecords = await db
      .select()
      .from(candidates)
      .where(inArray(candidates.id, candidateIds));
    
    console.log(`   👥 Loaded ${candidateRecords.length} candidate profiles`);
    
    // Step 3: Score each candidate using BOTH NAP rubric + Grok AI
    let scored = 0;
    for (const candidate of candidateRecords) {
      try {
        console.log(`   🔍 Scoring: ${candidate.firstName} ${candidate.lastName} (${candidate.currentTitle || 'Unknown Title'})`);
        
        // DUAL SCORING APPROACH:
        // 1) NAP Rubric (fast, deterministic 0-10 score)
        // 2) Grok AI (rich reasoning + strengths/concerns)
        
        // NAP Rubric Scoring (new) - SYNCHRONOUS, no await needed
        const { calculateNAPFit } = await import('./nap-strategy');
        const searchStrategy = job.searchStrategy as any;
        
        let napFitResult;
        if (needAnalysis && searchStrategy && typeof needAnalysis === 'object') {
          // Extract NAP strings from stored JSONB object
          const napData = needAnalysis as { need?: string; authority?: string; pain?: string };
          
          napFitResult = calculateNAPFit(
            {
              currentTitle: candidate.currentTitle || null,
              currentCompany: candidate.currentCompany || null,
              yearsExperience: candidate.yearsExperience || null,
              skills: candidate.skills || [],
              careerHistory: candidate.careerHistory as any,
              location: candidate.location || null,
            },
            {
              need: napData.need || napContext.title || '',
              authority: napData.authority || 'Senior leadership',
              pain: napData.pain || napContext.urgency || 'Business critical'
            },
            searchStrategy
          );
          console.log(`      🎯 NAP Rubric: ${napFitResult.score}/10 - ${napFitResult.reasoning}`);
        } else {
          console.log(`      ⚠️ NAP Rubric: Skipped (no NAP data or search strategy)`);
        }
        
        // Grok AI Fit Scoring (existing - provides rich reasoning)
        const education = candidate.education as any;
        const fitResult = await scoreCandidateFit(
          {
            name: `${candidate.firstName} ${candidate.lastName}`,
            currentTitle: candidate.currentTitle || 'Unknown',
            currentCompany: candidate.currentCompany || 'Unknown',
            skills: candidate.skills || [],
            experience: `${candidate.yearsExperience || 0} years`,
            education: Array.isArray(education) && education.length > 0 ? education[0]?.degree : undefined,
            location: candidate.location || undefined,
          },
          napContext
        );
        
        // Step 4: Update job_candidates with BOTH scores
        // Use NAP rubric score if available (0-10 → 0-100), otherwise use Grok score
        const finalFitScore = napFitResult ? napFitResult.score * 10 : fitResult.fitScore;
        
        await db
          .update(jobCandidates)
          .set({
            fitScore: finalFitScore,
            fitReasoning: fitResult.reasoning, // Grok provides richer reasoning
            fitStrengths: fitResult.strengths,
            fitConcerns: fitResult.concerns,
          })
          .where(
            and(
              eq(jobCandidates.jobId, jobId),
              eq(jobCandidates.candidateId, candidate.id)
            )
          );
        
        scored++;
        console.log(`   ✅ NAP Score: ${napFitResult?.score || 'N/A'}/10 | Grok: ${fitResult.fitScore}/100 | Final: ${finalFitScore}/100`);
        
        // Rate limiting: 2 requests per second max
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`   ❌ Failed to score candidate #${candidate.id}:`, error);
        // Continue with other candidates
      }
    }
    
    console.log(`\n✅ [Fit Scoring] Completed: Scored ${scored}/${candidateRecords.length} candidates for job #${jobId}`);
    
  } catch (error) {
    console.error(`❌ [Fit Scoring] Failed to score candidates for job #${jobId}:`, error);
    throw error;
  }
}
