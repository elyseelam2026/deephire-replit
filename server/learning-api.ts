/**
 * Learning Intelligence API
 * Exposes all learning data for dashboard visualization
 */

import { db } from "./db";
import { positionKeywords, companyLearning, industryLearning, candidateLearning, jobDescriptionLearning, candidates, jobCandidates } from "@shared/schema";
import { desc, sql } from "drizzle-orm";

export async function getLearningIntelligence() {
  try {
    // Safely fetch with graceful fallback for missing tables
    const positionData = await db.query.positionKeywords.findMany({
      limit: 10,
      orderBy: [desc(positionKeywords.searchCount)]
    }).catch(() => []);
    
    const companyData = await db.query.companyLearning.findMany({
      limit: 10,
      orderBy: [desc(companyLearning.searchCount)]
    }).catch(() => []);
    
    const industryData = await db.query.industryLearning.findMany({
      orderBy: [desc(industryLearning.searchCount)]
    }).catch(() => []);
    
    const candidateData = await db.query.candidateLearning.findMany({
      limit: 10,
      orderBy: [desc(candidateLearning.frequencyObserved)]
    }).catch(() => []);
    
    const jdData = await db.query.jobDescriptionLearning.findMany({
      limit: 10,
      orderBy: [desc(sql`success_rate * times_used`)]
    }).catch(() => []);
    
    // Get top candidates by fit score
    const topCandidatesData = await db
      .select({
        id: candidates.id,
        firstName: candidates.firstName,
        lastName: candidates.lastName,
        currentTitle: candidates.currentTitle,
        currentCompany: candidates.currentCompany,
        fitScore: jobCandidates.fitScore,
        status: jobCandidates.status
      })
      .from(jobCandidates)
      .innerJoin(candidates, sql`${jobCandidates.candidateId} = ${candidates.id}`)
      .orderBy(desc(jobCandidates.fitScore))
      .limit(10)
      .catch(() => []);

    return {
      positions: positionData.map(p => ({
        position: p.position,
        searchCount: p.searchCount,
        skills: p.skills || [],
        keywords: p.keywords || [],
        source: p.source
      })),
      companies: companyData.map(c => ({
        companyName: c.companyName,
        searchCount: c.searchCount,
        skills: c.skills || [],
        titles: c.titlePatterns || [],
        industries: c.industries || [],
        // Feature 1: Compensation Intelligence
        salaryBands: c.salaryBands as any,
        avgSalaryLift: c.avgSalaryLift ? Math.round(c.avgSalaryLift) : 0,
        // Feature 3: Talent Quality Metrics
        talentQualityScore: c.talentQualityScore ? Math.round(c.talentQualityScore) : 0,
        avgCandidateFitScore: c.avgCandidateFitScore ? Math.round(c.avgCandidateFitScore) : 0,
        avgTenureMonths: c.avgTenureMonths || 0,
        successRate: c.successRate ? Math.round(c.successRate) : 0,
        avgTimeToHireDay: c.avgTimeToHireDay || 0,
        departmentStrength: c.departmentStrength as any,
        promotionRate: c.promotionRate ? Math.round(c.promotionRate * 100) : 0
      })),
      industries: industryData.map(i => ({
        industry: i.industry,
        searchCount: i.searchCount,
        roles: i.typicalRoles || [],
        skills: i.commonSkills || [],
        seniority: i.typicalSeniority || [],
        // Feature 1: Compensation benchmarks
        salaryBenchmarks: i.salaryBenchmarks as any,
        certificationRate: i.certificationRate ? Math.round(i.certificationRate * 100) : 0,
        // Feature 2: Career paths
        careerPaths: i.careerPaths as any,
        avgTimeToPromotion: i.avgTimeToPromotion || 0,
        commonNextCompanies: i.commonNextCompanies || [],
        // Feature 4: Geographic/Seasonal
        geographicHubs: i.geographicHubs as any,
        hiringPatterns: i.hiringPatterns as any,
        talentSupply: i.talentSupply || 'competitive',
        // Feature 5: Success factors
        successFactors: i.successFactors as any,
        regulatoryBurden: i.regulatoryBurden || 'medium',
        techSkillRequirement: i.techSkillRequirement ? Math.round(i.techSkillRequirement * 100) : 0,
        commonTools: i.commonTools || []
      })),
      candidates: candidateData.map(c => ({
        pattern: c.description || c.pattern,
        successRate: Math.round((c.successRate || 0) * 100),
        frequency: c.frequencyObserved,
        skills: c.keySkills || [],
        industries: c.targetIndustries || [],
        // Feature 2: Career progression
        careerProgression: c.careerProgression || [],
        avgYearsPerRole: c.avgYearsPerRole ? Math.round(c.avgYearsPerRole * 10) / 10 : 0,
        promotionRate: c.promotionRate ? Math.round(c.promotionRate * 100) : 0
      })),
      jobDescriptions: jdData.map(j => ({
        successRate: Math.round((j.successRate || 0) * 100),
        timesUsed: j.timesUsed,
        roles: j.extractedRoles || [],
        skills: j.extractedSkills || []
      })),
      topCandidates: topCandidatesData.map(c => ({
        id: c.id,
        name: `${c.firstName} ${c.lastName}`,
        title: c.currentTitle || 'Unknown',
        company: c.currentCompany || 'Unknown',
        fitScore: c.fitScore ? Math.round(c.fitScore) : 0,
        status: c.status || 'sourced'
      }))
    };
  } catch (error) {
    console.error('Failed to fetch learning intelligence:', error);
    throw error;
  }
}

/**
 * SEARCH QUALITY METRICS
 * Tracks improvements from learning system
 */
export interface SearchQualityMetrics {
  overallQualityScore: number; // 0-100
  learningImpactPercentage: number; // % improvement from learning
  companyQualityAverage: number; // Avg company talent quality
  industryQualityAverage: number; // Avg industry talent quality
  averageCandidateRankingScore: number; // Avg ranking score
  improvementTrend: 'accelerating' | 'stable' | 'declining';
  lastCalculatedAt: Date;
}

export async function calculateSearchQualityMetrics(): Promise<SearchQualityMetrics> {
  try {
    // Get all company learning data
    const companies = await db.query.companyLearning.findMany();
    const industries = await db.query.industryLearning.findMany();
    
    // Calculate company quality average
    const companyQualities = companies
      .map(c => c.successRate || 0)
      .filter(q => q > 0);
    const companyQualityAverage = companyQualities.length > 0
      ? Math.round(companyQualities.reduce((a, b) => a + b, 0) / companyQualities.length)
      : 50;
    
    // Calculate industry quality average
    const industryQualities = industries
      .map(i => (i.hiringPatterns as any)?.quality || (i.successFactors as any)?.[0]?.importance || 0)
      .filter(q => q > 0);
    const industryQualityAverage = industryQualities.length > 0
      ? Math.round(industryQualities.reduce((a, b) => a + b, 0) / industryQualities.length)
      : 50;
    
    // Calculate average ranking score from recent candidates
    const recentCandidates = await db.query.jobCandidates.findMany({
      limit: 100,
      orderBy: [desc(jobCandidates.addedAt)]
    }).catch(() => []);
    
    const rankingScores = recentCandidates
      .map(c => c.fitScore || 0)
      .filter(s => s > 0);
    const averageCandidateRankingScore = rankingScores.length > 0
      ? Math.round(rankingScores.reduce((a, b) => a + b, 0) / rankingScores.length)
      : 50;
    
    // Calculate overall quality score
    const overallQualityScore = Math.round(
      (companyQualityAverage * 0.35 +
       industryQualityAverage * 0.35 +
       averageCandidateRankingScore * 0.30)
    );
    
    // Calculate learning impact (improvement from seed data)
    const learnedCompanies = companies.filter(c => c.source === 'learned');
    const learningImpactPercentage = learnedCompanies.length > 0
      ? Math.round((learnedCompanies.length / Math.max(companies.length, 1)) * 100)
      : 0;
    
    // Determine trend based on recent vs older data
    const recentCompanies = companies.filter(c => {
      const diff = new Date().getTime() - (c.lastUpdated?.getTime() || 0);
      return diff < 7 * 24 * 60 * 60 * 1000; // Last 7 days
    });
    const recentQuality = recentCompanies.length > 0
      ? recentCompanies.map(c => c.successRate || 0).reduce((a, b) => a + b) / recentCompanies.length
      : companyQualityAverage;
    
    let improvementTrend: 'accelerating' | 'stable' | 'declining' = 'stable';
    if (recentQuality > companyQualityAverage * 1.1) {
      improvementTrend = 'accelerating';
    } else if (recentQuality < companyQualityAverage * 0.9) {
      improvementTrend = 'declining';
    }
    
    return {
      overallQualityScore,
      learningImpactPercentage,
      companyQualityAverage,
      industryQualityAverage,
      averageCandidateRankingScore,
      improvementTrend,
      lastCalculatedAt: new Date()
    };
  } catch (error) {
    console.error('[Metrics] Error calculating search quality:', error);
    return {
      overallQualityScore: 50,
      learningImpactPercentage: 0,
      companyQualityAverage: 50,
      industryQualityAverage: 50,
      averageCandidateRankingScore: 50,
      improvementTrend: 'stable',
      lastCalculatedAt: new Date()
    };
  }
}

/**
 * Extended Intelligence API - Includes quality metrics
 */
export async function getLearningIntelligenceWithMetrics() {
  const [intelligence, metrics] = await Promise.all([
    getLearningIntelligence(),
    calculateSearchQualityMetrics()
  ]);

  return {
    ...intelligence,
    qualityMetrics: metrics
  };
}
