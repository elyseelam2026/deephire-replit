/**
 * JOB DESCRIPTION LEARNING ENGINE
 * 
 * Learns from job descriptions used in successful placements
 * Extracts patterns that lead to high-quality hires
 */

import { db } from "./db";
import { jobDescriptionLearning } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import crypto from "crypto";

/**
 * Create normalized hash of JD for pattern matching
 */
function hashJobDescription(jdText: string): string {
  // Normalize: lowercase, remove whitespace variations
  const normalized = jdText.toLowerCase().replace(/\s+/g, ' ').trim().substring(0, 500);
  return crypto.createHash('md5').update(normalized).digest('hex');
}

/**
 * Record job description pattern from successful placement
 */
export async function recordJobDescriptionPattern(
  jobDescription: string,
  extractedRoles: string[] = [],
  extractedSkills: string[] = [],
  education: string = "",
  seniority: string = "",
  yearsRequired: number = 0,
  certifications: string[] = []
): Promise<void> {
  const patternHash = hashJobDescription(jobDescription);
  console.log(`📋 [JD Learning] Recording pattern from JD (${jobDescription.substring(0, 50)}...)`);

  try {
    const existing = await db.query.jobDescriptionLearning.findFirst({
      where: eq(jobDescriptionLearning.descriptionPattern, patternHash)
    });

    if (existing) {
      // UPDATE: Increment usage
      const mergedRoles = Array.from(new Set([
        ...(existing.extractedRoles || []),
        ...extractedRoles
      ]));
      const mergedSkills = Array.from(new Set([
        ...(existing.extractedSkills || []),
        ...extractedSkills
      ]));
      const mergedCerts = Array.from(new Set([
        ...(existing.requiredCertifications || []),
        ...certifications
      ]));

      await db.update(jobDescriptionLearning)
        .set({
          timesUsed: sql`${jobDescriptionLearning.timesUsed} + 1`,
          extractedRoles: mergedRoles,
          extractedSkills: mergedSkills,
          requiredCertifications: mergedCerts,
          lastUpdated: new Date()
        })
        .where(eq(jobDescriptionLearning.descriptionPattern, patternHash));

      console.log(`✅ [JD Learning] Updated pattern (now used ${(existing.timesUsed || 0) + 1} times)`);
    } else {
      // INSERT: New JD pattern
      await db.insert(jobDescriptionLearning).values({
        descriptionPattern: patternHash,
        extractedRoles,
        extractedSkills,
        preferredEducation: education || null,
        preferredSeniority: seniority || null,
        requiredYearsExperience: yearsRequired || null,
        requiredCertifications: certifications,
        timesUsed: 1,
        successRate: 0.7, // Default to 70% until proven otherwise
        source: "learned"
      });

      console.log(`✅ [JD Learning] Created new pattern`);
    }
  } catch (error) {
    console.error(`❌ Failed to record JD pattern:`, error);
  }
}

/**
 * Get high-success JD patterns
 */
export async function getSuccessfulJDPatterns(limit: number = 5) {
  try {
    const patterns = await db.query.jobDescriptionLearning.findMany({});
    
    return patterns
      .filter(p => p.successRate && p.successRate > 0.6)
      .sort((a, b) => ((b.successRate || 0) * (b.timesUsed || 1)) - ((a.successRate || 0) * (a.timesUsed || 1)))
      .slice(0, limit);
  } catch (error) {
    console.error(`❌ Failed to get successful JD patterns:`, error);
    return [];
  }
}
