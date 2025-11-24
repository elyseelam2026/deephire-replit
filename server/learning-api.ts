/**
 * Learning Intelligence API
 * Exposes all learning data for dashboard visualization
 */

import { db } from "./db";
import { positionKeywords, companyLearning, industryLearning, candidateLearning, jobDescriptionLearning } from "@shared/schema";
import { desc, sql } from "drizzle-orm";

export async function getLearningIntelligence() {
  try {
    const [positionData, companyData, industryData, candidateData, jdData] = await Promise.all([
      // Get top position keywords by search count
      db.query.positionKeywords.findMany({
        limit: 10,
        orderBy: [desc(positionKeywords.searchCount)]
      }),
      
      // Get top company sources by search count
      db.query.companyLearning.findMany({
        limit: 10,
        orderBy: [desc(companyLearning.searchCount)]
      }),
      
      // Get all industry patterns
      db.query.industryLearning.findMany({
        orderBy: [desc(industryLearning.searchCount)]
      }),
      
      // Get top candidate patterns by frequency
      db.query.candidateLearning.findMany({
        limit: 10,
        orderBy: [desc(candidateLearning.frequencyObserved)]
      }),
      
      // Get successful job description patterns
      db.query.jobDescriptionLearning.findMany({
        limit: 10,
        orderBy: [desc(sql`success_rate * times_used`)]
      })
    ]);

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
      }))
    };
  } catch (error) {
    console.error('Failed to fetch learning intelligence:', error);
    throw error;
  }
}
