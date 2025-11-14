/**
 * TURNAROUND PRICING UTILITY
 * 
 * Centralized pricing logic for DeepHire's express turnaround feature.
 * All fee calculations go through here to ensure consistency.
 */

export type TurnaroundLevel = 'standard' | 'express';

export interface TurnaroundOption {
  level: TurnaroundLevel;
  hours: number;
  feeMultiplier: number;
  displayName: string;
  description: string;
}

export interface TurnaroundPricingResult {
  standard: TurnaroundOption;
  express: TurnaroundOption | null;
  recommendedLevel: TurnaroundLevel;
  reasoning: string;
}

/**
 * Get available turnaround options based on urgency level
 * 
 * @param urgency - Job urgency level ('low', 'medium', 'high', 'urgent')
 * @returns Turnaround options with recommendation
 */
export function getTurnaroundOptions(urgency?: string | null): TurnaroundPricingResult {
  const standard: TurnaroundOption = {
    level: 'standard',
    hours: 12,
    feeMultiplier: 1.0,
    displayName: 'Standard Turnaround',
    description: '12-hour delivery (included in base fee)'
  };

  const express: TurnaroundOption = {
    level: 'express',
    hours: 6,
    feeMultiplier: 1.5,
    displayName: 'Express Turnaround',
    description: '6-hour delivery (+50% fee)'
  };

  // Determine recommendation based on urgency
  const normalizedUrgency = urgency?.toLowerCase().trim();
  const isHighPriority = normalizedUrgency === 'urgent' || normalizedUrgency === 'high';

  return {
    standard,
    express,
    recommendedLevel: isHighPriority ? 'express' : 'standard',
    reasoning: isHighPriority
      ? 'Express turnaround recommended for urgent/high-priority searches to deliver results faster'
      : 'Standard turnaround sufficient for normal priority searches'
  };
}

/**
 * Calculate estimated placement fee with turnaround multiplier
 * 
 * @param salaryEstimate - Estimated annual salary for the role
 * @param feePercentage - Base fee percentage (15 for internal, 25 for external)
 * @param turnaroundMultiplier - Turnaround fee multiplier (1.0 for standard, 1.5 for express)
 * @returns Estimated placement fee
 */
export function calculateEstimatedFee(
  salaryEstimate: number,
  feePercentage: number,
  turnaroundMultiplier: number = 1.0
): number {
  return (salaryEstimate * feePercentage * turnaroundMultiplier) / 100;
}

/**
 * Apply turnaround multiplier to existing fee
 * 
 * @param baseFee - Base placement fee
 * @param turnaroundMultiplier - Turnaround fee multiplier
 * @returns Fee with turnaround multiplier applied
 */
export function applyTurnaroundMultiplier(
  baseFee: number,
  turnaroundMultiplier: number
): number {
  return baseFee * turnaroundMultiplier;
}

/**
 * Get turnaround details by level
 * 
 * @param level - 'standard' or 'express'
 * @returns Turnaround option details
 */
export function getTurnaroundByLevel(level: TurnaroundLevel): TurnaroundOption {
  const options = getTurnaroundOptions();
  return level === 'express' ? options.express! : options.standard;
}

/**
 * Calculate fee increase for express upgrade
 * 
 * @param currentFee - Current estimated fee (standard)
 * @returns Additional fee for express upgrade
 */
export function calculateExpressUpgradeFee(currentFee: number): number {
  const expressMultiplier = 1.5;
  return currentFee * (expressMultiplier - 1.0); // +50% of current fee
}

/**
 * Format turnaround pricing for display
 * 
 * @param turnaroundLevel - Current turnaround level
 * @param baseFee - Base fee before multiplier
 * @param finalFee - Final fee with multiplier
 * @returns Human-readable pricing summary
 */
export function formatTurnaroundPricing(
  turnaroundLevel: TurnaroundLevel,
  baseFee: number,
  finalFee: number
): string {
  const option = getTurnaroundByLevel(turnaroundLevel);
  
  if (turnaroundLevel === 'standard') {
    return `${option.displayName}: ${option.hours} hours (included)`;
  }
  
  const additionalFee = finalFee - baseFee;
  return `${option.displayName}: ${option.hours} hours (+$${additionalFee.toLocaleString()} / +50%)`;
}

/**
 * Job pricing calculation result
 */
export interface JobPricingResult {
  basePlacementFee: number | null;
  estimatedPlacementFee: number | null;
  turnaroundLevel: TurnaroundLevel;
  turnaroundHours: number;
  turnaroundFeeMultiplier: number;
}

/**
 * Compute complete job pricing including placement fees and turnaround settings
 * 
 * @param params - Pricing parameters
 * @param params.salary - Annual salary for the role
 * @param params.searchTier - 'internal' or 'external' (affects fee percentage)
 * @param params.urgency - Job urgency level ('low', 'medium', 'high', 'urgent')
 * @param params.overrideTurnaroundLevel - Optional explicit turnaround level override
 * @returns Complete pricing result with fees and turnaround settings
 */
export function computeJobPricing(params: {
  salary?: number | null;
  searchTier?: 'internal' | 'external' | null;
  urgency?: string | null;
  overrideTurnaroundLevel?: TurnaroundLevel | null;
}): JobPricingResult {
  // Determine turnaround level
  let turnaroundLevel: TurnaroundLevel;
  if (params.overrideTurnaroundLevel) {
    // Use explicit override if provided
    turnaroundLevel = params.overrideTurnaroundLevel;
  } else {
    // Infer from urgency
    const options = getTurnaroundOptions(params.urgency);
    turnaroundLevel = options.recommendedLevel;
  }
  
  // Get turnaround details
  const turnaroundOption = getTurnaroundByLevel(turnaroundLevel);
  
  // Calculate fees if salary is available
  let basePlacementFee: number | null = null;
  let estimatedPlacementFee: number | null = null;
  
  if (params.salary && params.salary > 0) {
    // Determine fee percentage based on search tier
    // Internal: 15%, External: 25%, Default: 20%
    let feePercentage: number;
    if (params.searchTier === 'internal') {
      feePercentage = 15;
    } else if (params.searchTier === 'external') {
      feePercentage = 25;
    } else {
      feePercentage = 20; // Default for unspecified tier
    }
    
    // Calculate base fee (before turnaround multiplier)
    basePlacementFee = Math.round((params.salary * feePercentage) / 100);
    
    // Calculate estimated fee with turnaround multiplier
    estimatedPlacementFee = Math.round(basePlacementFee * turnaroundOption.feeMultiplier);
  }
  
  return {
    basePlacementFee,
    estimatedPlacementFee,
    turnaroundLevel: turnaroundOption.level,
    turnaroundHours: turnaroundOption.hours,
    turnaroundFeeMultiplier: turnaroundOption.feeMultiplier
  };
}
