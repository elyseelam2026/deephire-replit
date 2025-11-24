/**
 * LEARNING-DRIVEN SEARCH OPTIMIZER
 * Integrates 5-feature learning system into NAP search strategy generation
 * Makes searches smarter with every placement and hire
 */

import { db } from './db';
import { industryLearning, companyLearning } from '@shared/schema';
import { eq } from 'drizzle-orm';

export interface LearningSearchContext {
  successFactorWeight?: Record<string, number>;  // {factor: importance}
  geographicHubs?: Record<string, number>;       // {location: %}
  hiringPatterns?: Record<string, number>;       // {Q1: 0.15, Q2: 0.28, ...}
  talentSupply?: string;                         // "tight" | "abundant" | "competitive"
  avgQualityScore?: number;                      // 0-100 company talent quality
  recommendedSearchDepth?: number;               // 1-10 scale
}

/**
 * Get learning context for a role/industry to optimize search strategy
 * Pulls from industryLearning + companyLearning tables
 */
export async function getSearchOptimizationContext(
  industry?: string,
  targetCompanyId?: number
): Promise<LearningSearchContext> {
  try {
    // Get industry success factors + patterns
    let industryData: any = null;
    if (industry) {
      const result = await db.query.industryLearning.findFirst({
        where: eq(industryLearning.industry, industry)
      });
      industryData = result;
    }

    // Get company talent quality if targeting specific company
    let companyQuality: any = null;
    if (targetCompanyId) {
      const result = await db.query.companyLearning.findFirst({
        where: eq(companyLearning.companyId, targetCompanyId)
      });
      companyQuality = result;
    }

    // Build optimization context from learned data
    const context: LearningSearchContext = {};

    if (industryData) {
      // Parse success factors (e.g., [{factor: "Prior company tier", importance: 0.92}])
      if (industryData.successFactors && Array.isArray(industryData.successFactors)) {
        context.successFactorWeight = {};
        (industryData.successFactors as any[]).forEach(sf => {
          if (sf.factor) {
            context.successFactorWeight![sf.factor] = sf.importance || 0.5;
          }
        });
      }

      // Parse geographic hubs (e.g., {NYC: 0.35, SF: 0.25, London: 0.18})
      if (industryData.geographicHubs && typeof industryData.geographicHubs === 'object') {
        context.geographicHubs = industryData.geographicHubs;
      }

      // Parse hiring patterns (e.g., {Q1: 0.15, Q2: 0.28, Q3: 0.25, Q4: 0.32})
      if (industryData.hiringPatterns && typeof industryData.hiringPatterns === 'object') {
        context.hiringPatterns = industryData.hiringPatterns;
      }

      context.talentSupply = industryData.talentSupply || 'competitive';

      // Calculate recommended search depth based on talent supply
      // tight supply → deeper search needed, abundant → shallower search
      if (context.talentSupply === 'tight') {
        context.recommendedSearchDepth = 8; // Deep search
      } else if (context.talentSupply === 'abundant') {
        context.recommendedSearchDepth = 3; // Shallow search
      } else {
        context.recommendedSearchDepth = 5; // Default
      }
    }

    if (companyQuality) {
      // Use company's historical talent quality score
      context.avgQualityScore = companyQuality.talentQualityScore || 70;
    }

    return context;
  } catch (error) {
    console.warn('[Search Optimizer] Failed to load learning context:', error);
    // Return empty context - fallback to standard search strategy
    return {};
  }
}

/**
 * Apply learning optimization to search strategy
 * Enhances existing search with learned patterns
 */
export function applyLearningOptimization(
  baseQuery: string,
  context: LearningSearchContext
): string {
  let optimizedQuery = baseQuery;

  // ENHANCEMENT 1: Prioritize success factors
  // If we know "Prior company tier" is 92% important, weight that query higher
  if (context.successFactorWeight && Object.keys(context.successFactorWeight).length > 0) {
    const topFactor = Object.entries(context.successFactorWeight).sort(
      (a, b) => (b[1] as number) - (a[1] as number)
    )[0];

    if (topFactor && (topFactor[1] as number) > 0.8) {
      // High-importance factor detected
      const factorKeyword = factorToKeyword(topFactor[0]);
      if (factorKeyword) {
        // Boost this signal in the query
        optimizedQuery = `(${optimizedQuery}) OR "${factorKeyword}"`;
      }
    }
  }

  // ENHANCEMENT 2: Geographic weighting
  // If NYC is 35% of successful hires, include NYC search as primary
  if (context.geographicHubs && Object.keys(context.geographicHubs).length > 0) {
    const topLocation = Object.entries(context.geographicHubs).sort(
      (a, b) => (b[1] as number) - (a[1] as number)
    )[0];

    if (topLocation && (topLocation[1] as number) > 0.25) {
      // High-concentration location found
      optimizedQuery = `(${optimizedQuery}) LOCATION:"${topLocation[0]}"`;
    }
  }

  // ENHANCEMENT 3: Hiring pattern awareness
  // If Q2 has 28% of hires but we're in Q1, might want to search earlier-stage candidates
  if (context.hiringPatterns) {
    const currentQuarter = `Q${Math.ceil((new Date().getMonth() + 1) / 3)}` as const;
    const currentQPattern = context.hiringPatterns[currentQuarter];
    const avgQPattern = 0.25;

    if (currentQPattern && currentQPattern < avgQPattern) {
      // Low hiring season - adjust search to cast wider net
      optimizedQuery = `${optimizedQuery} OR (broader search terms)`;
    }
  }

  return optimizedQuery;
}

/**
 * Convert success factor name to searchable keyword
 */
function factorToKeyword(factor: string): string | null {
  const mapping: Record<string, string> = {
    'Prior company tier': 'Fortune 500 OR FAANG OR Goldman OR McKinsey',
    'regulatory burden': 'compliance OR regulatory OR SOX',
    'tech skill requirement': 'technical OR software OR engineering',
    'M&A experience': 'acquisition OR merger OR M&A',
    'fundraising': 'capital raise OR Series OR funding',
  };

  return mapping[factor] || null;
}

/**
 * Get recommended search queries based on learning data
 * Returns array of parallel search queries for different candidate segments
 */
export function generateLearningOptimizedQueries(
  baseQuery: string,
  context: LearningSearchContext
): string[] {
  const queries: string[] = [baseQuery];

  // Generate additional queries based on learned success patterns
  if (context.successFactorWeight && Object.keys(context.successFactorWeight).length >= 2) {
    const topFactors = Object.entries(context.successFactorWeight)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 2);

    topFactors.forEach(([factor, importance]) => {
      if ((importance as number) > 0.6) {
        const keyword = factorToKeyword(factor);
        if (keyword) {
          queries.push(`(${baseQuery}) AND (${keyword})`);
        }
      }
    });
  }

  // Geographic query variants
  if (context.geographicHubs && Object.keys(context.geographicHubs).length >= 2) {
    const topLocations = Object.entries(context.geographicHubs)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 2);

    topLocations.forEach(([location, percentage]) => {
      if ((percentage as number) > 0.2) {
        queries.push(`(${baseQuery}) LOCATION:"${location}"`);
      }
    });
  }

  return queries;
}
