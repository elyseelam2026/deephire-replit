/**
 * COMPANY LEARNING INTELLIGENCE ENGINE
 * 
 * Tracks which companies are talent sources
 * Learns skills, titles, and patterns from successful sourcing
 */

import { db } from "./db";
import { companyLearning } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

/**
 * Record a company as a talent source
 * Learn which skills/titles commonly found there
 */
export async function recordCompanySource(
  companyName: string,
  foundTitles: string[] = [],
  foundSkills: string[] = [],
  targetIndustries: string[] = []
): Promise<void> {
  const normalized = companyName.trim();
  console.log(`🏢 [Company Learning] Recording source: ${normalized}`);

  try {
    const existing = await db.query.companyLearning.findFirst({
      where: eq(companyLearning.companyName, normalized)
    });

    if (existing) {
      // UPDATE: Merge new data + increment counter
      const mergedTitles = Array.from(new Set([
        ...(existing.titlePatterns || []),
        ...foundTitles
      ]));
      const mergedSkills = Array.from(new Set([
        ...(existing.skills || []),
        ...foundSkills
      ]));
      const mergedIndustries = Array.from(new Set([
        ...(existing.industries || []),
        ...targetIndustries
      ]));

      await db.update(companyLearning)
        .set({
          searchCount: sql`${companyLearning.searchCount} + 1`,
          titlePatterns: mergedTitles,
          skills: mergedSkills,
          industries: mergedIndustries,
          lastUpdated: new Date()
        })
        .where(eq(companyLearning.companyName, normalized));

      console.log(`✅ [Company Learning] Updated: ${normalized} (${foundTitles.length} titles, ${foundSkills.length} skills)`);
    } else {
      // INSERT: New company source
      await db.insert(companyLearning).values({
        companyName: normalized,
        titlePatterns: foundTitles,
        skills: foundSkills,
        industries: targetIndustries,
        searchCount: 1,
        source: "learned"
      });

      console.log(`✅ [Company Learning] Created: ${normalized}`);
    }
  } catch (error) {
    console.error(`❌ Failed to record company source ${normalized}:`, error);
  }
}

/**
 * Get intelligence about a company as a talent source
 */
export async function getCompanyIntelligence(companyName: string) {
  const normalized = companyName.trim();
  
  try {
    const data = await db.query.companyLearning.findFirst({
      where: eq(companyLearning.companyName, normalized)
    });
    
    if (data) {
      console.log(`📊 [Company Learning] Found intel for: ${normalized}`);
      return {
        companyName: data.companyName,
        commonTitles: data.titlePatterns || [],
        commonSkills: data.skills || [],
        targetIndustries: data.industries || [],
        timesSourced: data.searchCount
      };
    }
  } catch (error) {
    console.warn(`⚠️ Failed to get company intelligence:`, error);
  }

  return null;
}
