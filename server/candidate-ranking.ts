/**
 * CANDIDATE RANKING ENGINE
 * Scores and ranks candidates using all 5 learning features
 * Makes the learning system actually WORK by using learned data to improve search results
 */

import { db } from "./db";
import { 
  companyLearning, industryLearning, candidateLearning, 
  candidates, companies, jobCandidates
} from "@shared/schema";
import { eq } from "drizzle-orm";

export interface RankedCandidate {
  candidateId: number;
  finalScore: number; // 0-100
  confidenceScore: number; // 0-100 (how much we trust this score)
  breakdown: {
    priorCompanyTierScore: number; // 40% weight
    careerPathScore: number; // 25% weight
    compensationFitScore: number; // 20% weight
    geographicScore: number; // 10% weight
    successFactorScore: number; // 5% weight
  };
  reasoning: string;
}

/**
 * Score a candidate based on all 5 learning features
 */
export async function rankCandidate(
  candidateId: number,
  jobId: number,
  targetCompanyId: number,
  targetRole: string,
  targetSalary?: number,
  targetLocation?: string
): Promise<RankedCandidate> {
  try {
    const candidate = await db
      .select()
      .from(candidates)
      .where(eq(candidates.id, candidateId))
      .limit(1);

    if (!candidate.length) {
      return createNullRanking(candidateId, "Candidate not found");
    }

    const cand = candidate[0];
    const company = await db
      .select()
      .from(companies)
      .where(eq(companies.id, targetCompanyId))
      .limit(1);

    const targetCompanyName = company.length ? company[0].name : null;

    // Fetch learning data
    const [companyLearn, industryLearn, candLearn] = await Promise.all([
      targetCompanyName
        ? db
            .select()
            .from(companyLearning)
            .where(eq(companyLearning.companyName, targetCompanyName))
            .limit(1)
        : Promise.resolve([]),
      db
        .select()
        .from(industryLearning)
        .where(eq(industryLearning.industry, company[0]?.industry || ""))
        .limit(1),
      db
        .select()
        .from(candidateLearning)
        .limit(100),
    ]);

    const companyData = companyLearn[0];
    const industryData = industryLearn[0];

    let confidence = 40; // Start at 40% - increase as we have more data
    let reasoning = [];

    // FEATURE 1: Prior Company Tier (40% weight) - MOST IMPORTANT
    const priorCompanyTierScore = scoreByPriorCompanyTier(
      cand,
      companyData,
      industryData
    );
    confidence += priorCompanyTierScore > 70 ? 15 : 5;
    reasoning.push(`Prior company tier: ${priorCompanyTierScore}/100`);

    // FEATURE 2: Career Path (25% weight)
    const careerPathScore = scoreByCareerPath(
      cand,
      targetRole,
      candLearn,
      industryData
    );
    confidence += careerPathScore > 70 ? 15 : 5;
    reasoning.push(`Career path fit: ${careerPathScore}/100`);

    // FEATURE 3: Compensation Fit (20% weight)
    const compensationScore = scoreCompensationFit(
      cand,
      targetRole,
      targetSalary,
      companyData,
      industryData
    );
    confidence += compensationScore > 70 ? 10 : 3;
    reasoning.push(`Compensation fit: ${compensationScore}/100`);

    // FEATURE 4: Geographic/Seasonal (10% weight)
    const geographicScore = scoreGeographic(cand, targetLocation, industryData);
    confidence += geographicScore > 70 ? 8 : 2;
    reasoning.push(`Geographic fit: ${geographicScore}/100`);

    // FEATURE 5: Success Factors (5% weight)
    const successFactorScore = scoreSuccessFactors(
      cand,
      industryData,
      companyData
    );
    confidence += successFactorScore > 70 ? 7 : 2;
    reasoning.push(`Success factors: ${successFactorScore}/100`);

    // Calculate final score with weights
    const finalScore = Math.round(
      priorCompanyTierScore * 0.4 +
        careerPathScore * 0.25 +
        compensationScore * 0.2 +
        geographicScore * 0.1 +
        successFactorScore * 0.05
    );

    // Cap confidence at 100
    const finalConfidence = Math.min(confidence, 100);

    return {
      candidateId,
      finalScore: Math.min(finalScore, 100),
      confidenceScore: finalConfidence,
      breakdown: {
        priorCompanyTierScore,
        careerPathScore,
        compensationScore,
        geographicScore,
        successFactorScore,
      },
      reasoning: reasoning.join(" | "),
    };
  } catch (error) {
    console.error("[Ranking] Error ranking candidate:", error);
    return createNullRanking(candidateId, "Scoring error");
  }
}

/**
 * FEATURE 1: Prior Company Tier (40% weight)
 * Candidates from tier-1 companies score higher
 */
function scoreByPriorCompanyTier(
  candidate: any,
  companyData: any,
  industryData: any
): number {
  const tierScores: Record<string, number> = {
    "Tier 1": 95, // Google, Apple, Microsoft, etc.
    "Tier 2": 85, // Strong companies
    "Tier 3": 70, // Mid-market
    "Tier 4": 50, // Smaller
  };

  // If company learning exists and shows success from this company
  if (companyData?.successRate) {
    return Math.min(50 + companyData.successRate / 2, 100);
  }

  // Check candidate's prior companies
  if (candidate.priorCompanies?.length > 0) {
    const companyTier =
      candidate.priorCompanies[0]?.tier || candidate.companyTier || "Tier 3";
    return tierScores[companyTier] || 70;
  }

  return 60; // Neutral if no prior company info
}

/**
 * FEATURE 2: Career Path (25% weight)
 * Candidates following typical career progression score higher
 */
function scoreByCareerPath(
  candidate: any,
  targetRole: string,
  candidateLearning: any[],
  industryData: any
): number {
  // Check if this career path exists in learned patterns
  const careerPath = candidate.careerSummary || "";
  const matchingPatterns = candidateLearning.filter((cp) => {
    const pattern = cp.pattern?.toLowerCase() || "";
    return (
      pattern.includes(targetRole.toLowerCase()) &&
      pattern.includes(careerPath.toLowerCase())
    );
  });

  if (matchingPatterns.length > 0) {
    const avgFrequency =
      matchingPatterns.reduce((sum, p) => sum + (p.frequencyObserved || 0), 0) /
      matchingPatterns.length;
    return Math.min(50 + avgFrequency * 5, 100);
  }

  // Check industry-level career paths
  if (industryData?.careerPaths) {
    const paths = industryData.careerPaths;
    for (const path of paths) {
      if (path.path.some((p: string) => p.toLowerCase() === targetRole.toLowerCase())) {
        return Math.round(60 + (path.frequency || 0.3) * 40);
      }
    }
  }

  return 60; // Neutral
}

/**
 * FEATURE 3: Compensation Fit (20% weight)
 * Candidates within salary range score higher
 */
function scoreCompensationFit(
  candidate: any,
  targetRole: string,
  targetSalary: number | undefined,
  companyData: any,
  industryData: any
): number {
  if (!targetSalary) return 70; // Neutral if no salary info

  const candidateSalary = candidate.salary || 0;
  if (candidateSalary === 0) return 65; // Neutral if no candidate salary

  // Get expected range from learning data
  let minExpected = targetSalary * 0.8;
  let maxExpected = targetSalary * 1.2;

  if (companyData?.salaryBands && companyData.salaryBands[targetRole]) {
    const band = companyData.salaryBands[targetRole];
    minExpected = band.min || minExpected;
    maxExpected = band.max || maxExpected;
  }

  if (industryData?.salaryBenchmarks && industryData.salaryBenchmarks[targetRole]) {
    const bench = industryData.salaryBenchmarks[targetRole];
    minExpected = Math.max(minExpected, bench.p25 || minExpected);
    maxExpected = Math.min(maxExpected, bench.p75 || maxExpected);
  }

  // Score based on how close candidate salary is to target
  const diff = Math.abs(candidateSalary - targetSalary);
  const tolerance = targetSalary * 0.15;

  if (diff <= tolerance) return 90; // Perfect fit
  if (diff <= tolerance * 2) return 75; // Close fit
  if (candidateSalary > maxExpected * 1.3) return 40; // Too expensive
  return 60; // Acceptable
}

/**
 * FEATURE 4: Geographic (10% weight)
 * Candidates from talent hubs or matching location score higher
 */
function scoreGeographic(
  candidate: any,
  targetLocation: string | undefined,
  industryData: any
): number {
  if (!targetLocation && !candidate.location) return 70; // Neutral

  const candLocation = candidate.location || "";

  // Check geographic hubs from learning
  if (industryData?.geographicHubs) {
    const hubs = industryData.geographicHubs;
    for (const [loc, weight] of Object.entries(hubs)) {
      if (
        candLocation.toLowerCase().includes(loc.toLowerCase()) ||
        targetLocation?.toLowerCase().includes(loc.toLowerCase())
      ) {
        return Math.round(60 + (weight as number) * 40);
      }
    }
  }

  // Exact location match
  if (
    targetLocation &&
    candLocation.toLowerCase().includes(targetLocation.toLowerCase())
  ) {
    return 85;
  }

  // Remote candidate
  if (
    candLocation.toLowerCase().includes("remote") ||
    candLocation.toLowerCase().includes("anywhere")
  ) {
    return 75;
  }

  return 50; // Location mismatch
}

/**
 * FEATURE 5: Success Factors (5% weight)
 * Candidates matching success factor patterns score higher
 */
function scoreSuccessFactors(
  candidate: any,
  industryData: any,
  companyData: any
): number {
  let score = 60;

  // Check regulatory burden - candidates with compliance background
  if (
    industryData?.regulatoryBurden === "high" &&
    candidate.certifications?.some((c: string) =>
      ["FINRA", "CFA", "SOX", "GDPR"].some((cert) =>
        c.toUpperCase().includes(cert)
      )
    )
  ) {
    score += 20;
  }

  // Check tech skill requirement
  if (industryData?.techSkillRequirement && industryData.techSkillRequirement > 0.6) {
    if (candidate.skills?.some((s: string) =>
      ["Python", "SQL", "Salesforce", "SAP", "Tableau"].some((tech) =>
        s.toLowerCase().includes(tech.toLowerCase())
      )
    )) {
      score += 15;
    }
  }

  // Check promotion potential from company learning
  if (companyData?.promotionRate && companyData.promotionRate > 0.5) {
    if (candidate.yearsExperience && candidate.yearsExperience < 5) {
      score += 10; // Junior candidates at high-promotion companies
    }
  }

  return Math.min(score, 100);
}

/**
 * Helper: Create null ranking for error cases
 */
function createNullRanking(
  candidateId: number,
  reason: string
): RankedCandidate {
  return {
    candidateId,
    finalScore: 50, // Neutral
    confidenceScore: 10, // Very low confidence
    breakdown: {
      priorCompanyTierScore: 50,
      careerPathScore: 50,
      compensationFitScore: 50,
      geographicScore: 50,
      successFactorScore: 50,
    },
    reasoning: reason,
  };
}

/**
 * Bulk rank candidates for a job
 */
export async function rankCandidatesForJob(
  jobId: number,
  candidateIds: number[],
  targetRole: string,
  targetSalary?: number,
  targetLocation?: string
): Promise<RankedCandidate[]> {
  const job = await db.select().from(jobCandidates).where(eq(jobCandidates.jobId, jobId)).limit(1);
  
  if (!job.length) return [];

  const rankings = await Promise.all(
    candidateIds.map((cid) =>
      rankCandidate(cid, jobId, job[0].jobId, targetRole, targetSalary, targetLocation)
    )
  );

  // Sort by final score descending
  return rankings.sort((a, b) => b.finalScore - a.finalScore);
}
