/**
 * LEARNING HOOKS
 * Integration points that trigger learning collection throughout the system
 * These get called at key moments in the recruiting flow
 */

import {
  updateCompensationIntelligence,
  updateCareerPathsFromCandidate,
  updateTalentQualityMetrics,
  updateGeographicPatterns,
  updateSuccessFactors,
  collectLearningFromSourcedCandidates,
  syncIndustryAverages
} from './learning-collection';

/**
 * HOOK 1: After sourcing run completes
 * Automatically learns from search results
 */
export async function onSourceRunComplete(jobId: number) {
  console.log(`🎯 [Learning Hook] Sourcing complete for job #${jobId}, collecting intelligence...`);
  await collectLearningFromSourcedCandidates(jobId);
}

/**
 * HOOK 2: When candidate is hired
 * Tracks success and updates company talent quality score
 */
export async function onCandidateHired(
  candidateId: number,
  jobId: number,
  companyName: string,
  role: string,
  salaryOffer?: number
) {
  console.log(`✅ [Learning Hook] Hire recorded: ${candidateId} → ${role} @ ${companyName}`);
  
  if (salaryOffer) {
    await updateCompensationIntelligence(companyName, role, salaryOffer);
  }
  
  // Record successful placement
  await updateTalentQualityMetrics(
    companyName,
    'hired_candidate',
    100, // Perfect fit - they were hired
    true
  );
}

/**
 * HOOK 3: When candidate leaves a company
 * Updates tenure tracking and career paths
 */
export async function onCandidateLeftCompany(
  candidateId: number,
  fromCompany: string,
  toCompany: string,
  tenureMonths: number
) {
  console.log(`📍 [Learning Hook] Career move: ${fromCompany} → ${toCompany} (${tenureMonths} months)`);
  
  // Update tenure metrics
  // This would hook into actual tenure tracking in your system
}

/**
 * HOOK 4: When a job search happens
 * Captures geographic and seasonal patterns
 */
export async function onJobSearchExecuted(
  jobId: number,
  industry: string,
  location: string
) {
  console.log(`🔍 [Learning Hook] Job search: ${industry} role in ${location}`);
  
  const now = new Date();
  const quarter = `Q${Math.ceil((now.getMonth() + 1) / 3)}` as 'Q1' | 'Q2' | 'Q3' | 'Q4';
  
  await updateGeographicPatterns(industry, location, quarter);
}

/**
 * HOOK 5: When a hiring decision is made
 * Learns what factors predicted success
 */
export async function onHiringDecision(
  industry: string,
  hired: boolean,
  factors: Array<{ name: string; value: any }>
) {
  console.log(`🎯 [Learning Hook] Hiring decision: ${hired ? 'YES' : 'NO'}`);
  
  const successFactors = factors.map(f => ({
    factor: f.name,
    value: hired
  }));
  
  await updateSuccessFactors(industry, successFactors);
}

/**
 * HOOK 6: Periodic sync (run daily)
 * Aggregates company data up to industry level
 */
export async function periodicIndustrySync(industries: string[]) {
  console.log(`🔄 [Learning Hook] Syncing industry averages for ${industries.length} industries...`);
  
  for (const industry of industries) {
    await syncIndustryAverages(industry);
  }
}
