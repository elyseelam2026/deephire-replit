/**
 * INDUSTRY LEARNING INTELLIGENCE ENGINE
 * 
 * Maps industries to typical roles, skills, and compensation
 * Learns what roles and skills are common in each industry
 */

import { db } from "./db";
import { industryLearning } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

/**
 * Record industry patterns from searches
 */
export async function recordIndustryPattern(
  industry: string,
  roles: string[] = [],
  skills: string[] = [],
  seniorityLevels: string[] = []
): Promise<void> {
  const normalized = industry.trim();
  console.log(`🏭 [Industry Learning] Recording pattern: ${normalized}`);

  try {
    const existing = await db.query.industryLearning.findFirst({
      where: eq(industryLearning.industry, normalized)
    });

    if (existing) {
      // UPDATE: Merge patterns
      const mergedRoles = Array.from(new Set([
        ...(existing.typicalRoles || []),
        ...roles
      ]));
      const mergedSkills = Array.from(new Set([
        ...(existing.commonSkills || []),
        ...skills
      ]));
      const mergedSeniority = Array.from(new Set([
        ...(existing.typicalSeniority || []),
        ...seniorityLevels
      ]));

      await db.update(industryLearning)
        .set({
          searchCount: sql`${industryLearning.searchCount} + 1`,
          typicalRoles: mergedRoles,
          commonSkills: mergedSkills,
          typicalSeniority: mergedSeniority,
          lastUpdated: new Date()
        })
        .where(eq(industryLearning.industry, normalized));

      console.log(`✅ [Industry Learning] Updated: ${normalized}`);
    } else {
      // INSERT: New industry pattern
      await db.insert(industryLearning).values({
        industry: normalized,
        typicalRoles: roles,
        commonSkills: skills,
        typicalSeniority: seniorityLevels,
        searchCount: 1,
        source: "learned"
      });

      console.log(`✅ [Industry Learning] Created: ${normalized}`);
    }
  } catch (error) {
    console.error(`❌ Failed to record industry pattern ${normalized}:`, error);
  }
}

/**
 * Get industry intelligence
 */
export async function getIndustryIntelligence(industry: string) {
  const normalized = industry.trim();
  
  try {
    const data = await db.query.industryLearning.findFirst({
      where: eq(industryLearning.industry, normalized)
    });
    
    if (data) {
      return {
        industry: data.industry,
        typicalRoles: data.typicalRoles || [],
        commonSkills: data.commonSkills || [],
        seniorityLevels: data.typicalSeniority || [],
        timesSearched: data.searchCount
      };
    }
  } catch (error) {
    console.warn(`⚠️ Failed to get industry intelligence:`, error);
  }

  return null;
}
