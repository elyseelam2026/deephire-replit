/**
 * CANDIDATE PATTERN LEARNING ENGINE
 * 
 * Learns what makes successful candidates
 * Tracks background patterns, career trajectories, skills that lead to placement
 */

import { db } from "./db";
import { candidateLearning } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import crypto from "crypto";

/**
 * Record successful candidate pattern
 * Pattern = career trajectory like "PE-IB-Background" or "MBA-Finance-Director"
 */
export async function recordCandidatePattern(
  patternDescription: string,
  companies: string[] = [],
  titles: string[] = [],
  skills: string[] = [],
  industries: string[] = [],
  successRate: number = 0.7 // Default 70% if not specified
): Promise<void> {
  const patternHash = crypto.createHash('md5').update(patternDescription).digest('hex');
  console.log(`👤 [Candidate Learning] Recording pattern: ${patternDescription}`);

  try {
    const existing = await db.query.candidateLearning.findFirst({
      where: eq(candidateLearning.pattern, patternHash)
    });

    if (existing) {
      // UPDATE: Increment observations
      const mergedCompanies = Array.from(new Set([
        ...(existing.typicalCompanies || []),
        ...companies
      ]));
      const mergedTitles = Array.from(new Set([
        ...(existing.typicalTitles || []),
        ...titles
      ]));
      const mergedSkills = Array.from(new Set([
        ...(existing.keySkills || []),
        ...skills
      ]));
      const mergedIndustries = Array.from(new Set([
        ...(existing.targetIndustries || []),
        ...industries
      ]));

      await db.update(candidateLearning)
        .set({
          frequencyObserved: sql`${candidateLearning.frequencyObserved} + 1`,
          typicalCompanies: mergedCompanies,
          typicalTitles: mergedTitles,
          keySkills: mergedSkills,
          targetIndustries: mergedIndustries,
          successRate: successRate,
          lastUpdated: new Date()
        })
        .where(eq(candidateLearning.pattern, patternHash));

      console.log(`✅ [Candidate Learning] Updated pattern: ${patternDescription}`);
    } else {
      // INSERT: New pattern
      await db.insert(candidateLearning).values({
        pattern: patternHash,
        description: patternDescription,
        successRate: successRate,
        typicalCompanies: companies,
        typicalTitles: titles,
        keySkills: skills,
        targetIndustries: industries,
        frequencyObserved: 1,
        source: "learned"
      });

      console.log(`✅ [Candidate Learning] Created pattern: ${patternDescription}`);
    }
  } catch (error) {
    console.error(`❌ Failed to record candidate pattern:`, error);
  }
}

/**
 * Get patterns similar to a candidate profile
 */
export async function getSimilarCandidatePatterns(
  companies: string[],
  titles: string[],
  skills: string[]
) {
  try {
    // Simple: return all patterns sorted by success rate
    // In production, use semantic search for better matching
    const patterns = await db.query.candidateLearning.findMany({});
    
    return patterns
      .filter(p => p.successRate && p.successRate > 0.5)
      .sort((a, b) => (b.successRate || 0) - (a.successRate || 0))
      .slice(0, 5);
  } catch (error) {
    console.error(`❌ Failed to get similar patterns:`, error);
    return [];
  }
}
