/**
 * WEIGHTED SCORING SYSTEM (70% Hard Skills + 30% Soft Skills)
 * 
 * Hard Skills (70 points): Evaluated from LinkedIn/resume data - what's on paper
 * Soft Skills (30 points): Human consultant evaluation (not automated yet)
 * 
 * QUALITY TIERS:
 * - Elite: ≥85% (≥60/70 hard skill points)
 * - Standard: 70-84% (49-59/70 points)
 * - Acceptable: 60-69% (42-48/70 points)
 * - Rubbish: <60% (<42/70 points) → NEVER ENTER DATABASE
 */

import type { Candidate } from '../shared/schema';

export interface WeightedScoreResult {
  hardSkillScore: number;      // 0-70 points
  softSkillScore: number;      // 0-30 points (always 0 for now)
  totalScore: number;          // 0-100 points
  finalPercentage: number;     // 0-100%
  tier: 'elite' | 'standard' | 'acceptable' | 'rubbish';
  breakdown: {
    hardSkillBreakdown: Record<string, number>;  // Points per hard skill
    softSkillBreakdown: Record<string, number>;  // Points per soft skill (future)
  };
}

/**
 * Calculate weighted score (70% hard skills, 30% soft skills)
 * 
 * Hard skills scored from candidate's LinkedIn data against NAP requirements
 * Soft skills not yet implemented (requires human evaluation)
 * 
 * @param candidate - Candidate record from database
 * @param hardSkillRequirements - Hard skills from NAP (70 points total)
 */
export function calculateWeightedScore(
  candidate: Candidate,
  hardSkillRequirements: Record<string, number>
): WeightedScoreResult {
  
  // ───────────────────────────────────────────────────────────────────────────
  // HARD SKILL SCORING (70 points)
  // ───────────────────────────────────────────────────────────────────────────
  
  const hardSkillBreakdown: Record<string, number> = {};
  let totalHardSkillScore = 0;
  
  // Build searchable text from candidate profile
  const profileText = [
    candidate.currentTitle,
    candidate.currentCompany,
    candidate.biography,
    candidate.careerSummary,
    ...(candidate.skills || []),
    JSON.stringify(candidate.careerHistory),
    JSON.stringify(candidate.education)
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  
  // Score each hard skill requirement
  for (const [skillName, maxPoints] of Object.entries(hardSkillRequirements)) {
    const skillLower = skillName.toLowerCase();
    
    // Check if skill is mentioned in profile
    const hasSkill = profileText.includes(skillLower);
    
    if (hasSkill) {
      // Award full points if found
      // Future: Could implement partial credit based on context
      hardSkillBreakdown[skillName] = maxPoints;
      totalHardSkillScore += maxPoints;
    } else {
      hardSkillBreakdown[skillName] = 0;
    }
  }
  
  // Cap at 70 points
  totalHardSkillScore = Math.min(totalHardSkillScore, 70);
  
  // ───────────────────────────────────────────────────────────────────────────
  // SOFT SKILL SCORING (30 points) - NOT IMPLEMENTED YET
  // ───────────────────────────────────────────────────────────────────────────
  
  const softSkillBreakdown: Record<string, number> = {};
  const totalSoftSkillScore = 0; // Always 0 for now (requires human evaluation)
  
  // Future: Will be populated by human consultant interviews
  // Example soft skills:
  // - Leadership style: 10 points
  // - Cultural fit: 10 points
  // - Communication skills: 10 points
  
  // ───────────────────────────────────────────────────────────────────────────
  // FINAL SCORE CALCULATION
  // ───────────────────────────────────────────────────────────────────────────
  
  const totalScore = totalHardSkillScore + totalSoftSkillScore;
  const finalPercentage = Math.round((totalScore / 100) * 100);
  
  // Determine tier
  let tier: 'elite' | 'standard' | 'acceptable' | 'rubbish';
  if (finalPercentage >= 85) {
    tier = 'elite';
  } else if (finalPercentage >= 70) {
    tier = 'standard';
  } else if (finalPercentage >= 60) {
    tier = 'acceptable';
  } else {
    tier = 'rubbish';
  }
  
  return {
    hardSkillScore: totalHardSkillScore,
    softSkillScore: totalSoftSkillScore,
    totalScore,
    finalPercentage,
    tier,
    breakdown: {
      hardSkillBreakdown,
      softSkillBreakdown
    }
  };
}

/**
 * Batch calculate weighted scores for multiple candidates
 */
export function batchCalculateWeightedScores(
  candidates: Candidate[],
  hardSkillRequirements: Record<string, number>
): Map<number, WeightedScoreResult> {
  const results = new Map<number, WeightedScoreResult>();
  
  for (const candidate of candidates) {
    const score = calculateWeightedScore(candidate, hardSkillRequirements);
    results.set(candidate.id, score);
  }
  
  return results;
}
