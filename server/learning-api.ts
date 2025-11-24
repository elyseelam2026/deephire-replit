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
        industries: c.industries || []
      })),
      industries: industryData.map(i => ({
        industry: i.industry,
        searchCount: i.searchCount,
        roles: i.typicalRoles || [],
        skills: i.commonSkills || [],
        seniority: i.typicalSeniority || []
      })),
      candidates: candidateData.map(c => ({
        pattern: c.description || c.pattern,
        successRate: Math.round((c.successRate || 0) * 100),
        frequency: c.frequencyObserved,
        skills: c.keySkills || [],
        industries: c.targetIndustries || []
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
