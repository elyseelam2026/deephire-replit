/**
 * External Candidate Sourcing Orchestrator
 * Manages async batch processing of LinkedIn profile fetching and candidate creation
 */

import { scrapeLinkedInProfile, type LinkedInProfileData } from './brightdata';
import { db } from './db';
import { sourcingRuns, candidates, jobCandidates, jobs, candidateClues } from '../shared/schema';
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
          
          // Store jobId for use in nested functions (TypeScript needs this)
          const jobId = sourcingRun.jobId;
          
          // Load job with NAP context
          const [job] = await db
            .select()
            .from(jobs)
            .where(eq(jobs.id, jobId))
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
          
          // STEP 3A: Link ALL candidates immediately (ensures visibility even if AI fails)
          console.log(`\n📎 [Linking] Linking ${candidateRecords.length} candidates to job #${jobId}...`);
          
          for (const candidate of candidateRecords) {
            try {
              // Check if already linked
              const [existing] = await db
                .select()
                .from(jobCandidates)
                .where(
                  and(
                    eq(jobCandidates.jobId, jobId),
                    eq(jobCandidates.candidateId, candidate.id)
                  )
                )
                .limit(1);
              
              if (!existing) {
                // Link candidate with "sourced" status (pending AI scoring)
                await db.insert(jobCandidates).values({
                  jobId: jobId,
                  candidateId: candidate.id,
                  status: 'sourced',
                  matchScore: null,
                  fitScore: null,
                  fitReasoning: 'Pending AI fit scoring',
                  aiReasoning: {
                    reasoning: `Externally sourced via LinkedIn (Run #${sourcingRunId}) | Awaiting fit analysis`,
                    source: 'external_linkedin_search',
                    sourcingRunId
                  },
                  searchTier: 2,
                  recruiterNotes: null,
                  lastActionAt: new Date()
                });
                jobCandidatesLinked++;
              }
            } catch (error) {
              console.error(`   ⚠️ Error linking candidate #${candidate.id}:`, error);
            }
          }
          
          console.log(`✅ Linked ${jobCandidatesLinked} candidates to job #${jobId}`);
          
          // STEP 3B: Score candidates in batches and update fit scores
          console.log(`\n🎯 [Quality Gate] Scoring ${candidateRecords.length} candidates for fit assessment...`);
          
          let scoredCount = 0;
          let scoringFailures = 0;
          
          const batchSize = 4;
          for (let i = 0; i < candidateRecords.length; i += batchSize) {
            const batch = candidateRecords.slice(i, i + batchSize);
            
            await Promise.all(batch.map(async (candidate) => {
              try {
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
                
                // Update job_candidates with fit score
                await db
                  .update(jobCandidates)
                  .set({
                    fitScore: finalFitScore,
                    fitReasoning: fitResult.reasoning,
                    fitStrengths: fitResult.strengths,
                    fitConcerns: fitResult.concerns,
                    status: finalFitScore >= FIT_SCORE_THRESHOLD ? 'recommended' : 'sourced',
                    matchScore: finalFitScore >= FIT_SCORE_THRESHOLD ? 80 : null,
                  })
                  .where(
                    and(
                      eq(jobCandidates.jobId, jobId),
                      eq(jobCandidates.candidateId, candidate.id)
                    )
                  );
                
                scoredCount++;
                
                if (finalFitScore >= FIT_SCORE_THRESHOLD) {
                  console.log(`   ✅ RECOMMENDED: ${candidate.firstName} ${candidate.lastName} - ${candidate.currentTitle} | Fit: ${finalFitScore}/100`);
                } else {
                  console.log(`   ⚠️  LOW FIT: ${candidate.firstName} ${candidate.lastName} - ${candidate.currentTitle} | Fit: ${finalFitScore}/100`);
                  jobCandidatesRejected++;
                }
                
              } catch (error) {
                scoringFailures++;
                console.error(`   ❌ Scoring failed for ${candidate.firstName} ${candidate.lastName}:`, error instanceof Error ? error.message : 'Unknown error');
                // Candidate remains linked with "sourced" status even if scoring fails
              }
            }));
            
            // Rate limiting between batches
            if (i + batchSize < candidateRecords.length) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
          
          console.log(`\n✅ [Scoring Summary]:`);
          console.log(`   📎 Total linked: ${jobCandidatesLinked} candidates`);
          console.log(`   ✅ Successfully scored: ${scoredCount}/${candidateRecords.length}`);
          console.log(`   ⚠️  Recommended (fit ≥ ${FIT_SCORE_THRESHOLD}): ${scoredCount - jobCandidatesRejected}`);
          console.log(`   📊 Low fit (< ${FIT_SCORE_THRESHOLD}): ${jobCandidatesRejected}`);
          console.log(`   ❌ Scoring failures: ${scoringFailures}`);
          
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
 * ASYNC SEARCH WORKFLOW: Complete end-to-end search orchestration
 * Runs: Competitor mapping → Targeted queries → Profile fetching → Fit scoring → Email notification
 * 
 * @param config Async search configuration
 */
export async function executeAsyncSearch(config: {
  jobId: number;
  conversationId: number;
  napSummary: { need: string; authority: string; pain: string };
  searchStrategy: any;
  searchContext: any;
  companyName: string;
  userEmail: string;
  userName: string;
}): Promise<void> {
  const { jobId, conversationId, napSummary, searchStrategy, searchContext, companyName, userEmail, userName } = config;
  
  console.log(`\n🚀 [ASYNC SEARCH] Starting comprehensive search for job #${jobId}...`);
  
  try {
    // STEP 1: Update status to "executing"
    await db.update(jobs).set({
      searchExecutionStatus: 'executing',
      searchProgress: {
        candidatesSearched: 0,
        matchesFound: 0,
        currentStep: 'Generating competitor mapping...',
        startedAt: new Date().toISOString()
      }
    }).where(eq(jobs.id, jobId));
    
    // STEP 2: Generate competitor mapping
    console.log(`\n🏢 [STEP 1/5] Competitor Mapping...`);
    const { generateCompetitorMap } = await import('./competitor-mapping');
    
    const targetCompanies = await generateCompetitorMap({
      name: companyName,
      industry: searchContext.industry || '',
      size: searchContext.companySize,
      region: searchContext.location,
      stage: searchContext.stage
    });
    
    console.log(`✅ Identified ${targetCompanies.length} peer companies`);
    
    // STEP 3: Send "Search Started" email with transparent logic
    console.log(`\n📧 [STEP 2/5] Sending search started email...`);
    const { sendSearchStartedEmail } = await import('./email-notifications');
    
    // Fetch job to get turnaround data and fees
    const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
    
    try {
      await sendSearchStartedEmail({
        jobId,
        jobTitle: searchContext.title || '',
        companyName,
        turnaroundHours: job?.turnaroundHours ?? 12,
        turnaroundLevel: (job?.turnaroundLevel as 'standard' | 'express') ?? 'standard',
        urgency: searchContext.urgency,
        baseFee: job?.basePlacementFee ?? undefined, // Use persisted base fee
        estimatedFee: job?.estimatedPlacementFee ?? undefined,
        searchLogic: {
          targetCompanies: targetCompanies.map(c => c.name),
          positionHolders: `${searchContext.title} professionals at peer firms`,
          booleanQuery: searchStrategy.keywords || '',
          reasoning: searchStrategy.searchRationale || ''
        },
        recipientEmail: userEmail,
        recipientName: userName
      });
      console.log(`✅ Search started email sent to ${userEmail}`);
    } catch (emailError) {
      console.error(`❌ Failed to send search started email:`, emailError);
      // Continue anyway - email failure shouldn't stop search
    }
    
    // STEP 4: Execute targeted queries
    console.log(`\n🔍 [STEP 3/5] Executing targeted queries...`);
    const { executeTargetedQueries } = await import('./targeted-query-execution');
    const { generateTargetedSearchQueries } = await import('./competitor-mapping');
    
    // Generate targeted queries: one per competitor firm
    const targetedQueries = generateTargetedSearchQueries(
      targetCompanies,
      searchContext.title || ''
    );
    
    const queryResults = await executeTargetedQueries(targetedQueries, {
      maxUrlsPerQuery: 3,
      maxTotalUrls: 30
    });
    
    console.log(`✅ Found ${queryResults.urls.length} unique LinkedIn profiles`);
    
    // STEP 5: Fetch profiles and create candidates
    if (queryResults.urls.length > 0) {
      console.log(`\n👥 [STEP 4/5] Fetching LinkedIn profiles...`);
      
      // Create sourcing run
      const sourcingRun = await db.insert(sourcingRuns).values({
        jobId,
        conversationId,
        searchType: 'linkedin_competitor_search',
        searchQuery: {
          booleanQuery: searchStrategy.keywords,
          targetCompanies: targetCompanies.map(c => c.name),
          location: searchContext.location
        } as any,
        searchIntent: `Competitor-targeted search for ${searchContext.title}`,
        searchRationale: searchStrategy.searchRationale || '',
        status: 'pending',
        progress: {
          phase: 'pending',
          profilesFound: queryResults.urls.length,
          profilesFetched: 0,
          profilesProcessed: 0,
          candidatesCreated: 0,
          candidatesDuplicate: 0,
          currentBatch: 0,
          totalBatches: Math.ceil(queryResults.urls.length / 5),
          message: `Found ${queryResults.urls.length} profiles from competitor mapping`
        } as any,
        candidatesCreated: []
      }).returning();
      
      // Orchestrate profile fetching (includes fit scoring)
      await orchestrateProfileFetching({
        sourcingRunId: sourcingRun[0].id,
        profileUrls: queryResults.urls
      });
      
      console.log(`✅ Profile fetching complete`);
    }
    
    // STEP 6: Get final candidate count and send completion email
    console.log(`\n✅ [STEP 5/5] Finalizing search...`);
    
    const jobCandidatesResult = await db
      .select()
      .from(jobCandidates)
      .where(eq(jobCandidates.jobId, jobId));
    
    const totalCandidates = jobCandidatesResult.length;
    
    // Update job status to completed
    await db.update(jobs).set({
      searchExecutionStatus: 'completed',
      searchProgress: {
        candidatesSearched: queryResults.urls.length,
        matchesFound: totalCandidates,
        currentStep: `Search complete - ${totalCandidates} candidates found`,
        completedAt: new Date().toISOString()
      }
    }).where(eq(jobs.id, jobId));
    
    // Send completion email
    const { sendSearchCompleteEmail } = await import('./email-notifications');
    
    // Load top candidates for email
    const topCandidatesData = await db
      .select({
        candidate: candidates,
        jobCandidate: jobCandidates
      })
      .from(jobCandidates)
      .innerJoin(candidates, eq(jobCandidates.candidateId, candidates.id))
      .where(eq(jobCandidates.jobId, jobId))
      .orderBy(jobCandidates.fitScore)
      .limit(5);
    
    const topCandidates = topCandidatesData.map((row, index) => ({
      name: `${row.candidate.firstName} ${row.candidate.lastName}`,
      title: row.candidate.currentTitle || 'Unknown',
      company: row.candidate.currentCompany || 'Unknown',
      fitScore: row.jobCandidate.fitScore || 75,
      keyProof: (row.jobCandidate.fitReasoning || '').substring(0, 100)
    }));
    
    try {
      await sendSearchCompleteEmail({
        jobId,
        jobTitle: searchContext.title || '',
        companyName,
        candidatesFound: totalCandidates,
        internalHits: 0, // TODO: Track internal vs external
        externalHits: totalCandidates,
        topCandidates,
        sourcingMapUrl: `${process.env.DEEPHIRE_APP_URL || 'http://localhost:5000'}/recruiting/jobs/${jobId}`,
        recipientEmail: userEmail,
        recipientName: userName
      });
      console.log(`✅ Search complete email sent to ${userEmail}`);
    } catch (emailError) {
      console.error(`❌ Failed to send search complete email:`, emailError);
    }
    
    console.log(`\n🎉 [ASYNC SEARCH] Search complete for job #${jobId}!`);
    console.log(`   Total candidates: ${totalCandidates}`);
    console.log(`   Status: completed`);
    
  } catch (error) {
    console.error(`❌ [ASYNC SEARCH] Failed for job #${jobId}:`, error);
    
    // Update job status to failed
    await db.update(jobs).set({
      searchExecutionStatus: 'failed',
      searchProgress: {
        candidatesSearched: 0,
        matchesFound: 0,
        currentStep: `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        failedAt: new Date().toISOString()
      }
    }).where(eq(jobs.id, jobId));
    
    throw error;
  }
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

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 4-PHASE ELITE SOURCING ORCHESTRATOR (Grok's Cost-Aware Architecture)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * GOLDEN RULE: Never spend more than $0.65 to discover someone is rubbish
 * 
 * Phase 1: Universal NAP → Multi-Query Generator (8-15 Boolean strings + competitors)
 * Phase 2: Cheap Fingerprinting via SerpAPI (300-800 URLs + snippets, $0.045)
 * Phase 3: Lightning NAP Scoring with Grok (predict quality from snippets, $0.08)
 * Phase 4: Selective Deep Scraping (ONLY predicted ≥68% candidates, ~$75)
 * 
 * COST COMPARISON:
 * - Old way: Scrape all 800 → $400 for mostly rubbish
 * - New way: Phases 1-4 → $77 for 150 quality candidates
 * 
 * HARD RULE: ZERO candidates <60% ever enter the database
 */

import { generateMultiQueryStrategy, extractHardSkillsFromNAP, type UniversalNAP } from './nap-query-generator';
import { batchFingerprintSearch, type BatchFingerprintResult } from './serpapi';
import { batchScoreSnippets, type BatchScoringResult, type HardSkillRequirements } from './grok-snippet-scorer';
import { calculateWeightedScore } from './weighted-scoring';

export interface EliteSourcingConfig {
  sourcingRunId: number;
  jobId: number;
  nap: UniversalNAP;
  
  // Quality targets
  targetQualityCount: number;      // How many quality candidates needed (e.g., 50)
  minQualityPercentage: number;    // Minimum quality threshold (default: 68%)
  
  // Cost controls
  maxBudgetUsd: number;            // Maximum budget (e.g., $200)
  maxSearchIterations: number;     // Max search loops (default: 3)
  
  // Optional overrides
  batchSize?: number;              // Bright Data batch size (default: 5)
}

/**
 * Maps search depth presets to sourcing configuration
 * VALUE-BASED PRICING: Elite searches cost MORE (precision is valuable)
 * Volume searches cost LESS per candidate (noise is cheap)
 * 
 * Strategy Credit: Grok + ChatGPT consensus on headhunter economics
 */
export function mapSearchDepthToConfig(
  searchDepth: 'elite_8' | 'elite_15' | 'standard_25' | 'deep_60' | 'market_scan' | '8_elite' | '20_standard' | '50_at_60' | '100_plus'
): Pick<EliteSourcingConfig, 'targetQualityCount' | 'minQualityPercentage' | 'maxBudgetUsd' | 'maxSearchIterations'> {
  
  // Support both new and legacy tier names during transition
  switch (searchDepth) {
    case 'elite_8':
    case '8_elite':
      return {
        targetQualityCount: 8,
        minQualityPercentage: 88,  // PREMIUM: ≥88% hard skills - C-suite only
        maxBudgetUsd: 149,          // $149 - Finding gold is VALUABLE
        maxSearchIterations: 3      // Thorough search for rare talent
      };
    
    case 'elite_15':
      return {
        targetQualityCount: 15,
        minQualityPercentage: 84,  // PREMIUM: ≥84% hard skills - VP/SVP/GM
        maxBudgetUsd: 199,          // $199 - Most expensive tier (highest value)
        maxSearchIterations: 4      // Deep search for functional heads
      };
    
    case 'standard_25':
    case '20_standard':
      return {
        targetQualityCount: 25,
        minQualityPercentage: 76,  // BALANCED: ≥76% hard skills - Director level
        maxBudgetUsd: 129,          // $129 - Sweet spot for most searches
        maxSearchIterations: 3      // Standard depth
      };
    
    case 'deep_60':
    case '50_at_60':
      return {
        targetQualityCount: 60,
        minQualityPercentage: 66,  // WIDE NET: ≥66% hard skills - Specialists
        maxBudgetUsd: 149,          // $149 - Cheaper per candidate than elite
        maxSearchIterations: 5      // Wider search for niche roles
      };
    
    case 'market_scan':
    case '100_plus':
      return {
        targetQualityCount: 150,
        minQualityPercentage: 58,  // INTELLIGENCE: ≥58% hard skills - Market mapping
        maxBudgetUsd: 179,          // $179 flat - Cheapest per candidate
        maxSearchIterations: 10     // Full market scan for intel
      };
    
    default:
      // Default to standard (most common use case)
      return {
        targetQualityCount: 25,
        minQualityPercentage: 76,
        maxBudgetUsd: 129,
        maxSearchIterations: 3
      };
  }
}

export interface EliteSourcingResult {
  candidatesCreated: number;
  qualityDistribution: {
    elite: number;        // ≥85%
    standard: number;     // 70-84%
    acceptable: number;   // 60-69%
    rejected: number;     // <60% (never entered DB)
  };
  totalCostUsd: number;
  phaseCosts: {
    phase1_queries: number;
    phase2_fingerprinting: number;
    phase3_scoring: number;
    phase4_scraping: number;
  };
  stoppingReason: 'quota_met' | 'budget_exceeded' | 'max_iterations' | 'market_exhausted';
  iterations: number;
}

/**
 * MAIN 4-PHASE ELITE SOURCING ORCHESTRATOR
 * 
 * Runs intelligent search loops until quality quota is met or budget is exhausted
 */
export async function orchestrateEliteSourcing(
  config: EliteSourcingConfig
): Promise<EliteSourcingResult> {
  console.log(`\n╔════════════════════════════════════════════════════════════════╗`);
  console.log(`║  4-PHASE ELITE SOURCING - Grok's Cost-Aware Architecture      ║`);
  console.log(`╚════════════════════════════════════════════════════════════════╝`);
  console.log(`\n📊 Configuration:`);
  console.log(`   Job ID: ${config.jobId}`);
  console.log(`   Sourcing Run ID: ${config.sourcingRunId}`);
  console.log(`   Target Quality Count: ${config.targetQualityCount} candidates`);
  console.log(`   Min Quality Threshold: ${config.minQualityPercentage}%`);
  console.log(`   Max Budget: $${config.maxBudgetUsd}`);
  console.log(`   Max Iterations: ${config.maxSearchIterations}`);
  
  // Initialize result tracking
  const result: EliteSourcingResult = {
    candidatesCreated: 0,
    qualityDistribution: {
      elite: 0,
      standard: 0,
      acceptable: 0,
      rejected: 0
    },
    totalCostUsd: 0,
    phaseCosts: {
      phase1_queries: 0,
      phase2_fingerprinting: 0,
      phase3_scoring: 0,
      phase4_scraping: 0
    },
    stoppingReason: 'market_exhausted',
    iterations: 0
  };

  let iteration = 0;
  let qualityCandidatesFound = 0;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SEARCH LOOP: Continue until quota met or budget exhausted
  // ═══════════════════════════════════════════════════════════════════════════
  
  while (iteration < config.maxSearchIterations) {
    iteration++;
    result.iterations = iteration;
    
    console.log(`\n\n┌────────────────────────────────────────────────────────────────┐`);
    console.log(`│  ITERATION ${iteration}/${config.maxSearchIterations}                                                  │`);
    console.log(`└────────────────────────────────────────────────────────────────┘`);
    
    // ───────────────────────────────────────────────────────────────────────
    // PHASE 1: NAP → Multi-Query Generation
    // ───────────────────────────────────────────────────────────────────────
    
    console.log(`\n🎯 [PHASE 1: Query Generation]`);
    
    // Extract hard skills if not provided
    if (!config.nap.hardSkillWeights) {
      config.nap.hardSkillWeights = await extractHardSkillsFromNAP({
        need: config.nap.need,
        title: config.nap.title,
        industry: config.nap.industry
      });
    }
    
    const queryStrategy = await generateMultiQueryStrategy(config.nap);
    const phase1Cost = 0.02; // Grok query generation cost
    result.phaseCosts.phase1_queries += phase1Cost;
    result.totalCostUsd += phase1Cost;
    
    console.log(`   ✅ Generated ${queryStrategy.totalQueries} queries`);
    console.log(`   💰 Phase 1 Cost: $${phase1Cost.toFixed(3)}`);
    
    // ───────────────────────────────────────────────────────────────────────
    // PHASE 2: Batch Fingerprinting (Cheap Discovery)
    // ───────────────────────────────────────────────────────────────────────
    
    console.log(`\n🔍 [PHASE 2: Batch Fingerprinting]`);
    
    const allQueries = [
      ...queryStrategy.booleanQueries,
      ...queryStrategy.competitorQueries,
      ...queryStrategy.xStrategies
    ];
    
    const fingerprintResult = await batchFingerprintSearch(
      allQueries,
      config.nap.location
    );
    
    result.phaseCosts.phase2_fingerprinting += fingerprintResult.estimatedCost;
    result.totalCostUsd += fingerprintResult.estimatedCost;
    
    console.log(`   ✅ Found ${fingerprintResult.totalUnique} unique profiles`);
    console.log(`   💰 Phase 2 Cost: $${fingerprintResult.estimatedCost.toFixed(3)}`);
    
    // Update cost tracking mid-loop
    await db
      .update(sourcingRuns)
      .set({
        actualCostUsd: result.totalCostUsd,
        updatedAt: new Date()
      })
      .where(eq(sourcingRuns.id, config.sourcingRunId));
    
    // SHORT-CIRCUIT: Check budget mid-loop
    if (result.totalCostUsd >= config.maxBudgetUsd) {
      console.log(`\n⚠️  BUDGET EXCEEDED (mid-loop): $${result.totalCostUsd.toFixed(2)} >= $${config.maxBudgetUsd}`);
      result.stoppingReason = 'budget_exceeded';
      break;
    }
    
    // Check if we found enough candidates
    if (fingerprintResult.totalUnique === 0) {
      console.log(`\n⚠️  No new candidates found. Market may be exhausted.`);
      result.stoppingReason = 'market_exhausted';
      break;
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // PHASE 3: Lightning NAP Scoring (Grok Snippet Evaluation)
    // ───────────────────────────────────────────────────────────────────────
    
    console.log(`\n⚡ [PHASE 3: Lightning Scoring]`);
    
    const hardSkillReqs: HardSkillRequirements = {
      skills: config.nap.hardSkillWeights || {},
      totalPoints: 70
    };
    
    // Phase 3: Score ALL candidates - function now returns full array
    // The minQualityPercentage is used only for stats/logging
    const scoringResult = await batchScoreSnippets(
      fingerprintResult.fingerprints,
      hardSkillReqs,
      config.minQualityPercentage
    );
    
    result.phaseCosts.phase3_scoring += scoringResult.estimatedCost;
    result.totalCostUsd += scoringResult.estimatedCost;
    
    console.log(`   ✅ Scored ${scoringResult.totalEvaluated} candidates`);
    console.log(`   ✅ ${scoringResult.passed} passed quality threshold (≥60%)`);
    console.log(`   ❌ ${scoringResult.filtered} rejected (<60%)`);
    console.log(`   💰 Phase 3 Cost: $${scoringResult.estimatedCost.toFixed(3)}`);
    
    // Update cost tracking mid-loop
    await db
      .update(sourcingRuns)
      .set({
        actualCostUsd: result.totalCostUsd,
        updatedAt: new Date()
      })
      .where(eq(sourcingRuns.id, config.sourcingRunId));
    
    // SHORT-CIRCUIT: Check budget mid-loop
    if (result.totalCostUsd >= config.maxBudgetUsd) {
      console.log(`\n⚠️  BUDGET EXCEEDED (mid-loop): $${result.totalCostUsd.toFixed(2)} >= $${config.maxBudgetUsd}`);
      result.stoppingReason = 'budget_exceeded';
      break;
    }
    
    // Check if we have any candidates at all
    if (scoringResult.passed === 0) {
      console.log(`\n⚠️  No candidates found in this iteration.`);
      continue; // Try next iteration with different queries
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // PHASE 4: Three-Tier Storage (Elite/Warm/Clue Architecture)
    // ───────────────────────────────────────────────────────────────────────
    
    console.log(`\n💎 [PHASE 4: Three-Tier Candidate Storage]`);
    
    // Separate candidates by tier BEFORE scraping
    const clueTier = scoringResult.scoredFingerprints.filter(fp => fp.predictedPercentage >= 60 && fp.predictedPercentage < 68);
    const warmTier = scoringResult.scoredFingerprints.filter(fp => fp.predictedPercentage >= 68 && fp.predictedPercentage < 85);
    const eliteTier = scoringResult.scoredFingerprints.filter(fp => fp.predictedPercentage >= 85);
    
    console.log(`\n   Tier Distribution:`);
    console.log(`      🌟 Elite (≥85%): ${eliteTier.length} → Full scrape + hot vault`);
    console.log(`      🔥 Warm (68-84%): ${warmTier.length} → Full scrape + warm vault`);
    console.log(`      🔍 Clues (60-67%): ${clueTier.length} → Fingerprint only (NO scraping)`);
    console.log(`      💰 Cost savings from NOT scraping clues: $${(clueTier.length * 0.50).toFixed(2)}`);
    
    // ─────────────────────────────────────────────────────────────────
    // INSERT CLUE-TIER CANDIDATES (No scraping required!)
    // ─────────────────────────────────────────────────────────────────
    
    console.log(`\n🔍 [Clue Layer: Inserting ${clueTier.length} lightweight fingerprints]`);
    
    for (const clue of clueTier) {
      try {
        await db.insert(candidateClues).values({
          linkedinUrl: clue.url,
          snippetText: clue.snippet,
          predictedScore: clue.predictedPercentage,
          jobTitle: clue.title || null,
          companyName: clue.company || null,
          location: clue.location || null,
          sourcingRunId: config.sourcingRunId,
          jobId: config.jobId,
        });
        result.qualityDistribution.acceptable++; // Count as "acceptable" tier
        console.log(`   ✅ CLUE: ${clue.title || 'Unknown'} at ${clue.company || 'Unknown'} (${clue.predictedPercentage}%)`);
      } catch (error) {
        console.log(`   ⚠️  Failed to insert clue: ${clue.url}`);
      }
    }
    
    // ─────────────────────────────────────────────────────────────────
    // SCRAPE WARM + ELITE TIER CANDIDATES ONLY
    // ─────────────────────────────────────────────────────────────────
    
    const toScrape = [...eliteTier, ...warmTier];
    console.log(`\n💎 [Selective Deep Scraping: ${toScrape.length} candidates]`);
    console.log(`   (Avoided wasting $${(clueTier.length * 0.50).toFixed(2)} on scraping clue-tier)`);
    
    const scrapedProfiles: LinkedInProfileData[] = [];
    const scrapedWithTier: Array<{ profile: LinkedInProfileData; predictedTier: 'elite' | 'warm'; predictedScore: number }> = [];
    let scrapedSuccessfully = 0;
    
    for (const fingerprint of toScrape) {
      try {
        const profileData = await scrapeLinkedInProfile(fingerprint.url);
        scrapedProfiles.push(profileData);
        
        // Track predicted tier for later insertion
        const predictedTier = fingerprint.predictedPercentage >= 85 ? 'elite' : 'warm';
        scrapedWithTier.push({
          profile: profileData,
          predictedTier,
          predictedScore: fingerprint.predictedPercentage
        });
        
        scrapedSuccessfully++;
        console.log(`   ✅ Scraped (${predictedTier.toUpperCase()}): ${profileData.name}`);
      } catch (error) {
        console.log(`   ❌ Failed to scrape: ${fingerprint.url}`);
      }
    }
    
    const phase4Cost = scrapedSuccessfully * 0.50; // $0.50 per Bright Data scrape
    result.phaseCosts.phase4_scraping += phase4Cost;
    result.totalCostUsd += phase4Cost;
    
    console.log(`   ✅ Successfully scraped ${scrapedSuccessfully} profiles`);
    console.log(`   💰 Phase 4 Cost: $${phase4Cost.toFixed(2)}`);
    
    // Update sourcing run cost tracking
    await db
      .update(sourcingRuns)
      .set({
        actualCostUsd: result.totalCostUsd,
        updatedAt: new Date()
      })
      .where(eq(sourcingRuns.id, config.sourcingRunId));
    
    // ───────────────────────────────────────────────────────────────────────
    // FORENSIC SCORING: Validate scraped candidates and assign final tiers
    // ───────────────────────────────────────────────────────────────────────
    
    console.log(`\n🔬 [Forensic Scoring: Validating ${scrapedWithTier.length} scraped candidates]`);
    
    for (const { profile: profileData, predictedTier, predictedScore } of scrapedWithTier) {
      // Convert LinkedIn data to candidate format for scoring
      const tempCandidate = {
        currentTitle: profileData.position,
        currentCompany: profileData.current_company_name || profileData.current_company,
        biography: profileData.about,
        careerSummary: profileData.experience?.map(e => `${e.title} at ${e.company}`).join('; '),
        skills: profileData.skills || [],
        careerHistory: profileData.experience,
        education: profileData.education,
      } as any;
      
      // Calculate weighted score AFTER scraping (final validation)
      const weightedResult = calculateWeightedScore(
        tempCandidate,
        hardSkillReqs.skills
      );
      
      // HARD RULE: Reject if actual score falls below minimum threshold
      // This catches cases where LinkedIn data quality was poor
      if (weightedResult.finalPercentage < config.minQualityPercentage) {
        result.qualityDistribution.rejected++;
        console.log(`   ❌ REJECTED (never entered DB): ${profileData.name} (${weightedResult.finalPercentage}% < ${config.minQualityPercentage}%)`);
        continue; // Skip database insertion entirely
      }
      
      // Determine final tier based on actual weighted score
      let finalTier: 'elite' | 'warm' | 'acceptable';
      if (weightedResult.finalPercentage >= 85) {
        finalTier = 'elite';
        result.qualityDistribution.elite++;
      } else if (weightedResult.finalPercentage >= 68) {
        finalTier = 'warm';
        result.qualityDistribution.standard++;
      } else {
        finalTier = 'acceptable';
        result.qualityDistribution.acceptable++;
      }
      
      console.log(`   ✅ ${finalTier.toUpperCase()} (predicted: ${predictedScore}% → actual: ${weightedResult.finalPercentage}%): ${profileData.name}`);
      
      // NOW insert to database with tier information
      try {
        const ingestionResult = await batchCreateCandidates(
          [profileData],
          config.sourcingRunId,
          [profileData.url || '']
        );
        
        if (ingestionResult[0]?.success && ingestionResult[0].candidateId) {
          qualityCandidatesFound++;
          result.candidatesCreated++;
          
          // Update candidate with tier and refresh schedule
          const candidateId = ingestionResult[0].candidateId;
          const now = new Date();
          const nextRefresh = new Date(now);
          
          // Elite: refresh monthly, Warm: refresh every 6 months
          if (finalTier === 'elite') {
            nextRefresh.setMonth(nextRefresh.getMonth() + 1);
          } else if (finalTier === 'warm') {
            nextRefresh.setMonth(nextRefresh.getMonth() + 6);
          }
          
          await db.update(candidates)
            .set({
              tier: finalTier,
              lastRefreshedAt: now,
              nextRefreshDue: finalTier === 'acceptable' ? null : nextRefresh,
            })
            .where(eq(candidates.id, candidateId));
          
          console.log(`   → Stored in ${finalTier} vault (next refresh: ${finalTier === 'acceptable' ? 'never' : nextRefresh.toLocaleDateString()})`);
        }
      } catch (error) {
        console.log(`   ⚠️  Failed to insert ${profileData.name} to DB:`, error);
      }
    }
    
    // ───────────────────────────────────────────────────────────────────────
    // CHECK STOPPING CONDITIONS
    // ───────────────────────────────────────────────────────────────────────
    
    console.log(`\n📊 [Progress Check]`);
    console.log(`   Quality candidates found: ${qualityCandidatesFound}/${config.targetQualityCount}`);
    console.log(`   Total cost so far: $${result.totalCostUsd.toFixed(2)}/$${config.maxBudgetUsd}`);
    console.log(`   Iterations: ${iteration}/${config.maxSearchIterations}`);
    
    // Check quota met
    if (qualityCandidatesFound >= config.targetQualityCount) {
      console.log(`\n✅ QUOTA MET: Found ${qualityCandidatesFound} quality candidates!`);
      result.stoppingReason = 'quota_met';
      break;
    }
    
    // Check budget exceeded
    if (result.totalCostUsd >= config.maxBudgetUsd) {
      console.log(`\n⚠️  BUDGET EXCEEDED: $${result.totalCostUsd.toFixed(2)} >= $${config.maxBudgetUsd}`);
      result.stoppingReason = 'budget_exceeded';
      break;
    }
    
    // Check max iterations
    if (iteration >= config.maxSearchIterations) {
      console.log(`\n⚠️  MAX ITERATIONS REACHED: ${iteration}/${config.maxSearchIterations}`);
      result.stoppingReason = 'max_iterations';
      break;
    }
    
    // Continue with next iteration (generate 5 more alternative queries)
    console.log(`\n🔄 Continuing to next iteration with alternative queries...`);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FINAL SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  
  console.log(`\n╔════════════════════════════════════════════════════════════════╗`);
  console.log(`║  ELITE SOURCING COMPLETE                                       ║`);
  console.log(`╚════════════════════════════════════════════════════════════════╝`);
  console.log(`\n📊 Final Results:`);
  console.log(`   Stopping Reason: ${result.stoppingReason}`);
  console.log(`   Total Iterations: ${result.iterations}`);
  console.log(`   Candidates Created: ${result.candidatesCreated}`);
  console.log(`\n   Quality Distribution:`);
  console.log(`      Elite (≥85%): ${result.qualityDistribution.elite}`);
  console.log(`      Standard (70-84%): ${result.qualityDistribution.standard}`);
  console.log(`      Acceptable (60-69%): ${result.qualityDistribution.acceptable}`);
  console.log(`      Rejected (<60%): ${result.qualityDistribution.rejected} ❌ NEVER ENTERED DB`);
  console.log(`\n💰 Cost Breakdown:`);
  console.log(`      Phase 1 (Query Gen): $${result.phaseCosts.phase1_queries.toFixed(3)}`);
  console.log(`      Phase 2 (Fingerprinting): $${result.phaseCosts.phase2_fingerprinting.toFixed(3)}`);
  console.log(`      Phase 3 (Scoring): $${result.phaseCosts.phase3_scoring.toFixed(3)}`);
  console.log(`      Phase 4 (Scraping): $${result.phaseCosts.phase4_scraping.toFixed(2)}`);
  console.log(`      ─────────────────────────────────`);
  console.log(`      TOTAL: $${result.totalCostUsd.toFixed(2)}`);
  
  // Update sourcing run with final status
  await db
    .update(sourcingRuns)
    .set({
      status: 'completed',
      actualCostUsd: result.totalCostUsd,
      updatedAt: new Date()
    })
    .where(eq(sourcingRuns.id, config.sourcingRunId));
  
  return result;
}
