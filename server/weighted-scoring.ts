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
  // SOFT SKILL SCORING (30 points) - HUMAN EVALUATION REQUIRED
  // ───────────────────────────────────────────────────────────────────────────
  
  const softSkillBreakdown: Record<string, number> = {};
  // Note: Soft skills must be evaluated by human consultants during interviews
  // Cannot be automated without detailed interview data
  // These will be populated from interview feedback and recruiter assessment:
  // - Leadership presence: up to 10 points
  // - Communication skills: up to 10 points
  // - Cultural fit & team alignment: up to 10 points
  const totalSoftSkillScore = 0; // Currently 0 - requires human consultant evaluation during interview phase
  
  // ───────────────────────────────────────────────────────────────────────────
  // FINAL SCORE CALCULATION
  // ───────────────────────────────────────────────────────────────────────────
  
  const totalScore = totalHardSkillScore + totalSoftSkillScore;
  
  // When soft skills are not yet evaluated (0), normalize hard skills to 100 scale
  // so that quality tiers work correctly during sourcing
  // Formula: (hardSkillScore / 70) * 100 = final percentage
  // Example: 60/70 hard skills = 85.7% final (elite tier)
  //          52/70 hard skills = 74.3% final (standard tier)
  //          42/70 hard skills = 60.0% final (acceptable tier)
  const finalPercentage = totalSoftSkillScore === 0
    ? Math.round((totalHardSkillScore / 70) * 100)
    : Math.round(totalScore); // Once soft skills added, use additive model
  
  // Determine tier based on final percentage
  let tier: 'elite' | 'standard' | 'acceptable' | 'rubbish';
  if (finalPercentage >= 85) {
    tier = 'elite';       // ≥60/70 hard skills (when soft skills = 0)
  } else if (finalPercentage >= 70) {
    tier = 'standard';    // ≥49/70 hard skills (when soft skills = 0)
  } else if (finalPercentage >= 60) {
    tier = 'acceptable';  // ≥42/70 hard skills (when soft skills = 0)
  } else {
    tier = 'rubbish';     // <42/70 hard skills (when soft skills = 0)
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
