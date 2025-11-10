/**
 * NAP Completeness Scoring System
 * Implements weighted calculation based on "Dance, Don't Drill" document
 * 
 * Weights:
 * - urgency: 25%
 * - requirements: 25%
 * - compensation: 20%
 * - personality: 15%
 * - selling_points: 15%
 * - company: automatic (derived from DB)
 * - position: automatic (derived from user request)
 * - process: optional (not in main scoring)
 */

import type { NapState } from "@shared/schema";

// Section weights (must sum to 100)
const SECTION_WEIGHTS = {
  urgency: 0.25,        // 25% - Critical for timeline
  requirements: 0.25,   // 25% - Must-haves for search
  compensation: 0.20,   // 20% - Budget reality check
  personality: 0.15,    // 15% - Culture fit matters
  selling_points: 0.15, // 15% - Why candidates should care
  // company and position filled automatically from context
  // process is nice-to-have but not critical for initial search
} as const;

// Minimum threshold to trigger search
export const NAP_READY_THRESHOLD = 80; // 80% completeness

/**
 * Calculate completeness for a single NAP section
 * Returns 0-100 based on how many required fields are filled
 */
export function calculateSectionCompleteness(
  sectionName: keyof typeof SECTION_WEIGHTS,
  sectionData: any
): number {
  if (!sectionData || typeof sectionData !== 'object') {
    return 0;
  }

  const requiredFields: Record<string, string[]> = {
    urgency: ['timeline', 'impact'],              // Need timeline + why it matters
    requirements: ['skills'],                      // At minimum, need top skills
    compensation: ['salary_low', 'salary_high'],  // Need budget range
    personality: ['culture_desc'],                 // Need culture description
    selling_points: ['unique_opportunity'],        // Need at least one selling point
  };

  const required = requiredFields[sectionName] || [];
  if (required.length === 0) return 100; // If no requirements defined, consider complete

  let filledCount = 0;
  for (const field of required) {
    const value = sectionData[field];
    if (value !== undefined && value !== null && value !== '') {
      // For arrays, check if non-empty
      if (Array.isArray(value)) {
        if (value.length > 0) filledCount++;
      } else {
        filledCount++;
      }
    }
  }

  return Math.round((filledCount / required.length) * 100);
}

/**
 * Calculate overall NAP completeness using weighted average
 * Returns object with overall score + per-section scores
 */
export function calculateNapCompleteness(napState: NapState): {
  overall: number;
  company: number;
  position: number;
  urgency: number;
  requirements: number;
  personality: number;
  compensation: number;
  process: number;
  selling_points: number;
} {
  const scores = {
    company: calculateCompanyCompleteness(napState.company as any),
    position: calculatePositionCompleteness(napState.position as any),
    urgency: calculateSectionCompleteness('urgency', napState.urgency),
    requirements: calculateSectionCompleteness('requirements', napState.requirements),
    personality: calculateSectionCompleteness('personality', napState.personality),
    compensation: calculateSectionCompleteness('compensation', napState.compensation),
    process: calculateProcessCompleteness(napState.process as any),
    selling_points: calculateSectionCompleteness('selling_points', napState.selling_points),
  };

  // Calculate weighted overall score (only for weighted sections)
  let weightedSum = 0;
  for (const [section, weight] of Object.entries(SECTION_WEIGHTS)) {
    const sectionScore = scores[section as keyof typeof scores] || 0;
    weightedSum += sectionScore * weight;
  }

  return {
    overall: Math.round(weightedSum),
    ...scores,
  };
}

/**
 * Company completeness (usually auto-filled from DB)
 */
function calculateCompanyCompleteness(company: any): number {
  if (!company) return 0;
  
  const fields = ['name', 'industry', 'size'];
  let filled = 0;
  
  for (const field of fields) {
    if (company[field]) filled++;
  }
  
  return Math.round((filled / fields.length) * 100);
}

/**
 * Position completeness (usually from user's initial request)
 */
function calculatePositionCompleteness(position: any): number {
  if (!position) return 0;
  
  const fields = ['title', 'location'];
  let filled = 0;
  
  for (const field of fields) {
    if (position[field]) filled++;
  }
  
  return Math.round((filled / fields.length) * 100);
}

/**
 * Process completeness (optional, nice-to-have)
 */
function calculateProcessCompleteness(process: any): number {
  if (!process) return 0;
  
  const fields = ['timeline', 'interviews_count'];
  let filled = 0;
  
  for (const field of fields) {
    if (process[field]) filled++;
  }
  
  return Math.round((filled / fields.length) * 100);
}

/**
 * Check if NAP is ready for search execution
 */
export function isNapReadyForSearch(completeness: { overall: number }): boolean {
  return completeness.overall >= NAP_READY_THRESHOLD;
}

/**
 * Get next critical missing field to ask about
 * Returns the highest-weight section that's below 100%
 */
export function getNextCriticalGap(
  napState: NapState,
  completeness: ReturnType<typeof calculateNapCompleteness>
): {
  section: string;
  weight: number;
  currentScore: number;
  suggestedProbe: string;
} | null {
  // Sort sections by weight (descending)
  const weightedSections = [
    { section: 'urgency', weight: SECTION_WEIGHTS.urgency, score: completeness.urgency },
    { section: 'requirements', weight: SECTION_WEIGHTS.requirements, score: completeness.requirements },
    { section: 'compensation', weight: SECTION_WEIGHTS.compensation, score: completeness.compensation },
    { section: 'personality', weight: SECTION_WEIGHTS.personality, score: completeness.personality },
    { section: 'selling_points', weight: SECTION_WEIGHTS.selling_points, score: completeness.selling_points },
  ];

  // Find first incomplete section (sorted by weight)
  for (const item of weightedSections) {
    if (item.score < 100) {
      return {
        section: item.section,
        weight: item.weight,
        currentScore: item.score,
        suggestedProbe: generateProbeQuestion(item.section, napState),
      };
    }
  }

  return null; // All critical sections complete
}

/**
 * Generate natural probe question for missing section
 */
function generateProbeQuestion(section: string, napState: NapState): string {
  const probes: Record<string, string> = {
    urgency: "How urgent is this? Is it blocking anything critical?",
    requirements: "What are the 3 must-have skills this person absolutely needs?",
    compensation: "Ballpark total cash — what range are you thinking?",
    personality: "How would you describe the culture and team dynamic?",
    selling_points: "Why would a top candidate want this role?",
  };

  return probes[section] || "Tell me more about that.";
}
