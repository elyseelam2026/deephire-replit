/**
 * ACTIVE LEARNING COLLECTION ENGINES
 * Populates all 5 learning features from live sourcing & placement data
 * This is what makes DeepHire LEARN and improve over time
 */

import { db } from "./db";
import { 
  companyLearning, industryLearning, candidateLearning, 
  jobCandidates, candidates, jobs, companies 
} from "@shared/schema";
import { eq, sql } from "drizzle-orm";

/**
 * FEATURE 1: COMPENSATION INTELLIGENCE
 * Collects actual salary data from placements and offers
 */
export async function updateCompensationIntelligence(
  companyName: string,
  role: string,
  salary: number
) {
  try {
    const company = await db
      .select()
      .from(companyLearning)
      .where(eq(companyLearning.companyName, companyName))
      .limit(1);

    if (company.length === 0) return;

    const existing = company[0];
    const bands = (existing.salaryBands as any) || {};
    
    if (!bands[role]) {
      bands[role] = { min: salary, max: salary, median: salary, count: 1 };
    } else {
      bands[role].min = Math.min(bands[role].min, salary);
      bands[role].max = Math.max(bands[role].max, salary);
      bands[role].count = (bands[role].count || 1) + 1;
      bands[role].median = Math.round((bands[role].min + bands[role].max) / 2);
    }

    await db
      .update(companyLearning)
      .set({ 
        salaryBands: bands,
        lastUpdated: new Date()
      })
      .where(eq(companyLearning.companyName, companyName));
  } catch (error) {
    console.log(`[Learning] Compensation update skipped for ${companyName}`);
  }
}

/**
 * FEATURE 2: CAREER PATH TRACKING
 * Learns typical career progressions from candidate histories
 */
export async function updateCareerPathsFromCandidate(
  candidateId: number,
  companies: Array<{ company: string; title: string; startYear: number; endYear: number }>
) {
  try {
    // Extract career progression
    const titles = companies
      .sort((a, b) => a.startYear - b.startYear)
      .map(c => c.title);

    // Store as candidate pattern
    const pathStr = titles.join(" → ");
    
    const existing = await db
      .select()
      .from(candidateLearning)
      .where(eq(candidateLearning.pattern, pathStr))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(candidateLearning).values({
        pattern: pathStr,
        description: `Career path: ${pathStr}`,
        careerProgression: titles,
        frequencyObserved: 1,
        source: "learned"
      }).catch(() => {});
    } else {
      await db
        .update(candidateLearning)
        .set({
          frequencyObserved: sql`${candidateLearning.frequencyObserved} + 1`,
          lastUpdated: new Date()
        })
        .where(eq(candidateLearning.pattern, pathStr))
        .catch(() => {});
    }
  } catch (error) {
    console.log(`[Learning] Career path update skipped`);
  }
}

/**
 * FEATURE 3: TALENT QUALITY METRICS
 * Tracks success rates, tenure, promotions from actual placements
 */
export async function updateTalentQualityMetrics(
  companyName: string,
  candidateName: string,
  fitScore: number,
  hired: boolean,
  tenureMonths?: number,
  promoted?: boolean
) {
  try {
    const company = await db
      .select()
      .from(companyLearning)
      .where(eq(companyLearning.companyName, companyName))
      .limit(1);

    if (company.length === 0) return;

    const existing = company[0];
    const placements = (existing.successfulPlacements || 0) + (hired ? 1 : 0);
    const avgFit = existing.avgCandidateFitScore || 0;
    const newAvgFit = (avgFit * (placements - 1) + fitScore) / placements;
    
    const avgTenure = tenureMonths ? 
      (((existing.avgTenureMonths || 0) * (placements - 1)) + tenureMonths) / placements : 
      existing.avgTenureMonths;

    const promRate = promoted ? 
      (((existing.promotionRate || 0) * (placements - 1)) + 1) / placements : 
      existing.promotionRate;

    const successRate = placements > 0 ? (placements / existing.searchCount) * 100 : 0;

    await db
      .update(companyLearning)
      .set({
        successfulPlacements: placements,
        avgCandidateFitScore: newAvgFit,
        avgTenureMonths: avgTenure,
        promotionRate: promRate,
        successRate: successRate,
        lastUpdated: new Date()
      })
      .where(eq(companyLearning.companyName, companyName));
  } catch (error) {
    console.log(`[Learning] Quality metrics update skipped for ${companyName}`);
  }
}

/**
 * FEATURE 4: GEOGRAPHIC/SEASONAL PATTERNS
 * Learns where best talent comes from and when hiring peaks
 */
export async function updateGeographicPatterns(
  industry: string,
  location: string,
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'
) {
  try {
    const ind = await db
      .select()
      .from(industryLearning)
      .where(eq(industryLearning.industry, industry))
      .limit(1);

    if (ind.length === 0) return;

    const hubs = (ind[0].geographicHubs as any) || {};
    const patterns = (ind[0].hiringPatterns as any) || { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };

    // Update location hub
    hubs[location] = ((hubs[location] || 0) + 1);
    
    // Normalize to percentages
    const total = Object.values(hubs).reduce((a: any, b: any) => a + b, 0);
    Object.keys(hubs).forEach(key => {
      hubs[key] = hubs[key] / total;
    });

    // Update hiring pattern
    patterns[quarter] = (patterns[quarter] || 0) + 1;
    const patternTotal = Object.values(patterns).reduce((a: any, b: any) => a + b, 0);
    Object.keys(patterns).forEach(key => {
      patterns[key] = patterns[key] / patternTotal;
    });

    await db
      .update(industryLearning)
      .set({
        geographicHubs: hubs,
        hiringPatterns: patterns,
        lastUpdated: new Date()
      })
      .where(eq(industryLearning.industry, industry));
  } catch (error) {
    console.log(`[Learning] Geographic patterns update skipped for ${industry}`);
  }
}

/**
 * FEATURE 5: SUCCESS FACTOR LEARNING
 * Learns what predicts successful hires
 */
export async function updateSuccessFactors(
  industry: string,
  successFactors: Array<{ factor: string; value: boolean }>
) {
  try {
    const ind = await db
      .select()
      .from(industryLearning)
      .where(eq(industryLearning.industry, industry))
      .limit(1);

    if (ind.length === 0) return;

    const factors = (ind[0].successFactors as any) || {};

    // Track factor frequency when successful
    successFactors.forEach(({ factor, value }) => {
      if (!factors[factor]) {
        factors[factor] = { success: 0, total: 0, importance: 0 };
      }
      factors[factor].total += 1;
      if (value) factors[factor].success += 1;
      factors[factor].importance = factors[factor].success / factors[factor].total;
    });

    // Convert to array format for dashboard
    const factorArray = Object.entries(factors).map(([name, data]: any) => ({
      factor: name,
      importance: data.importance,
      successCount: data.success,
      totalCount: data.total
    }));

    await db
      .update(industryLearning)
      .set({
        successFactors: factorArray,
        lastUpdated: new Date()
      })
      .where(eq(industryLearning.industry, industry));
  } catch (error) {
    console.log(`[Learning] Success factors update skipped for ${industry}`);
  }
}

/**
 * BATCH UPDATE: Called after each sourcing run
 * Automatically collects intelligence from search results
 */
export async function collectLearningFromSourcedCandidates(
  jobId: number
) {
  try {
    const job = await db.query.jobs.findFirst({
      where: eq(jobs.id, jobId)
    });

    if (!job) return;

    // Get all candidates for this job
    const jobCandidateList = await db.query.jobCandidates.findMany({
      where: eq(jobCandidates.jobId, jobId)
    });

    if (jobCandidateList.length === 0) return;

    for (const jc of jobCandidateList) {
      const candidate = await db.query.candidates.findFirst({
        where: eq(candidates.id, jc.candidateId)
      });

      if (!candidate) continue;

      // Collect company learning
      if (candidate.currentCompany) {
        await updateTalentQualityMetrics(
          candidate.currentCompany,
          `${candidate.firstName} ${candidate.lastName}`,
          jc.fitScore || 0,
          jc.status === 'hired'
        );
      }

      // Collect geographic patterns
      if (job.parsedData) {
        const parsed = job.parsedData as any;
        const now = new Date();
        const quarter = `Q${Math.ceil((now.getMonth() + 1) / 3)}` as any;
        
        if (parsed.industry && candidate.location) {
          await updateGeographicPatterns(
            parsed.industry,
            candidate.location,
            quarter
          );
        }
      }
    }

    console.log(`✅ [Learning] Collected intelligence from ${jobCandidateList.length} candidates for job #${jobId}`);
  } catch (error) {
    console.error(`[Learning] Collection failed:`, error);
  }
}

/**
 * SYNC LEARNING TO INDUSTRY AVERAGES
 * Periodically aggregate company data up to industry level
 */
export async function syncIndustryAverages(industry: string) {
  try {
    // Get all companies in this industry
    const companies = await db
      .select()
      .from(companyLearning)
      .where(sql`${companyLearning.industries}::text[] @> ARRAY[${industry}]`)
      .limit(100);

    if (companies.length === 0) return;

    // Calculate aggregates
    const avgQuality = companies.reduce((sum, c) => sum + (c.talentQualityScore || 0), 0) / companies.length;
    const avgSuccessRate = companies.reduce((sum, c) => sum + (c.successRate || 0), 0) / companies.length;
    const avgTenure = companies.reduce((sum, c) => sum + (c.avgTenureMonths || 0), 0) / companies.length;

    // Merge all salary bands
    const allBands: any = {};
    companies.forEach(c => {
      const bands = c.salaryBands as any || {};
      Object.entries(bands).forEach(([role, data]: any) => {
        if (!allBands[role]) {
          allBands[role] = data;
        } else {
          allBands[role].min = Math.min(allBands[role].min, data.min);
          allBands[role].max = Math.max(allBands[role].max, data.max);
          allBands[role].median = Math.round((allBands[role].min + allBands[role].max) / 2);
        }
      });
    });

    // Update industry with aggregates
    await db
      .update(industryLearning)
      .set({
        salaryBenchmarks: allBands,
        lastUpdated: new Date()
      })
      .where(eq(industryLearning.industry, industry));

    console.log(`✅ [Learning] Synced ${industry} industry averages from ${companies.length} companies`);
  } catch (error) {
    console.log(`[Learning] Industry sync skipped for ${industry}`);
  }
}
