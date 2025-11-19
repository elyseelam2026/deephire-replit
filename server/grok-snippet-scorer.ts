/**
 * PHASE 3: LIGHTNING NAP SCORING (Grok Snippet Evaluation)
 * 
 * Takes 300-800 cheap fingerprints from Phase 2
 * Uses Grok AI to predict hard-skill scores (0-70 points) from snippets only
 * Filters to keep only predicted ≥48 points (68% of 70 = quality threshold)
 * 
 * CRITICAL COST SAVINGS:
 * - Phase 2: 800 fingerprints × $0.003 = $2.40
 * - Phase 3: 1 Grok API call = $0.08
 * - Phase 4: 150 quality candidates × $0.50 = $75
 * Total: $77.48 for 150 quality candidates
 * 
 * vs. OLD WAY:
 * - Scrape all 800 × $0.50 = $400 for mostly rubbish candidates
 * 
 * NEVER SPEND >$0.65 TO DISCOVER RUBBISH!
 */

import OpenAI from "openai";
import type { CandidateFingerprint } from "./serpapi";

if (!process.env.XAI_API_KEY) {
  throw new Error("XAI_API_KEY must be set for snippet scoring");
}

const openai = new OpenAI({ 
  baseURL: "https://api.x.ai/v1", 
  apiKey: process.env.XAI_API_KEY 
});

/**
 * Scored fingerprint (Phase 3 output - ready for Phase 4 scraping)
 */
export interface ScoredFingerprint extends CandidateFingerprint {
  predictedHardSkillScore: number;  // 0-70 points (predicted from snippet)
  predictedPercentage: number;      // 0-100% (for easier filtering)
  confidence: 'high' | 'medium' | 'low';
  signals: string[];                 // Which hard skill signals were found
  rationale: string;                 // Brief scoring rationale
}

/**
 * Phase 3 batch scoring result
 */
export interface BatchScoringResult {
  scoredFingerprints: ScoredFingerprint[];
  totalEvaluated: number;
  passed: number;                    // Predicted ≥68% (48/70 points)
  filtered: number;                  // Rejected <68%
  estimatedCost: number;             // Grok API cost ($0.08)
  qualityDistribution: {
    elite_85_plus: number;           // ≥60/70 points (≥85%)
    excellent_75_84: number;         // 52-59/70 points (75-84%)
    good_68_74: number;              // 48-51/70 points (68-74%)
    poor_below_68: number;           // <48/70 points (<68%) - REJECTED
  };
}

/**
 * Hard skill requirements extracted from NAP
 */
export interface HardSkillRequirements {
  skills: Record<string, number>;   // e.g., {"M&A execution": 25, "Mandarin": 15}
  totalPoints: number;               // Should be 70
}

/**
 * BATCH SNIPPET SCORING - Core Phase 3 function
 * 
 * Takes 300-800 fingerprints and evaluates them ALL in ONE Grok API call
 * Filters to keep only predicted ≥48 points (68% threshold)
 * 
 * @param fingerprints - Fingerprints from Phase 2
 * @param hardSkillReqs - Hard skill requirements from NAP (70 points total)
 * @param minPercentage - Minimum quality threshold (default: 68%)
 */
export async function batchScoreSnippets(
  fingerprints: CandidateFingerprint[],
  hardSkillReqs: HardSkillRequirements,
  minPercentage: number = 68
): Promise<BatchScoringResult> {
  console.log(`\n⚡ [Phase 3: Lightning Scoring] Starting...`);
  console.log(`   Fingerprints to evaluate: ${fingerprints.length}`);
  console.log(`   Quality threshold: ${minPercentage}% (${Math.round(minPercentage * 0.7)}/70 points)`);
  console.log(`   Hard skills to evaluate:`);
  Object.entries(hardSkillReqs.skills).forEach(([skill, points]) => {
    console.log(`      - ${skill}: ${points} points`);
  });

  // Build Grok prompt for batch scoring
  const skillsList = Object.entries(hardSkillReqs.skills)
    .sort((a, b) => b[1] - a[1])
    .map(([skill, points]) => `- ${skill}: ${points} points`)
    .join('\n');

  // Prepare fingerprint data for Grok (lightweight format)
  const fingerprintData = fingerprints.slice(0, 800).map((fp, index) => ({
    id: index,
    name: fp.name,
    title: fp.title,
    company: fp.company,
    snippet: fp.snippet
  }));

  const prompt = `You are evaluating ${fingerprintData.length} LinkedIn profile snippets for a specialized recruitment search.

**HARD SKILL REQUIREMENTS (70 points total):**
${skillsList}

**YOUR TASK:**
For EACH of the ${fingerprintData.length} candidates below, predict their hard-skill score (0-70 points) based ONLY on signals visible in their snippet.

**SCORING RULES:**
1. Award points ONLY if you find CLEAR EVIDENCE in the snippet
2. Partial credit allowed (e.g., "M&A mentioned" = 15/25 points)
3. No points if skill is not mentioned at all
4. Be CONSERVATIVE - we'll verify with full profiles later
5. Focus on observable facts: job titles, companies, keywords, certifications

**QUALITY THRESHOLDS:**
- Elite (≥85%): ≥60 points
- Excellent (75-84%): 52-59 points  
- Good (68-74%): 48-51 points
- Poor (<68%): <48 points → REJECT

**OUTPUT FORMAT:**
Respond with a JSON array of scores (one per candidate):
[
  {
    "id": 0,
    "predictedScore": 58,
    "signals": ["M&A", "PE fund", "Mandarin"],
    "confidence": "high",
    "rationale": "Strong M&A and PE signals in title and company"
  },
  ...
]

**CANDIDATES TO SCORE:**
${JSON.stringify(fingerprintData, null, 2)}

REMEMBER: Only score based on what you SEE in the snippet. Be conservative. Return JSON array only.`;

  try {
    console.log(`   🤖 Sending ${fingerprintData.length} snippets to Grok...`);
    
    const response = await openai.chat.completions.create({
      model: "grok-2-1212",
      messages: [
        {
          role: "system",
          content: "You are an expert executive search consultant evaluating candidate snippets against hard skill requirements. Always respond with valid JSON array."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 8000,  // Enough for 800 candidate scores
      temperature: 0.3    // Lower temperature for more consistent scoring
    });

    const rawResult = response.choices[0].message.content || "{}";
    let scoresArray: any[] = [];
    
    try {
      const parsed = JSON.parse(rawResult);
      // Grok might wrap array in an object like {scores: [...]}
      scoresArray = Array.isArray(parsed) ? parsed : (parsed.scores || parsed.candidates || []);
    } catch (e) {
      console.error('[Phase 3] Failed to parse Grok response:', e);
      throw new Error('Failed to parse Grok scoring response');
    }

    console.log(`   ✅ Grok evaluated ${scoresArray.length} candidates`);

    // Map scores back to fingerprints
    const scoredFingerprints: ScoredFingerprint[] = [];
    const qualityDistribution = {
      elite_85_plus: 0,
      excellent_75_84: 0,
      good_68_74: 0,
      poor_below_68: 0
    };

    for (let i = 0; i < fingerprints.length && i < scoresArray.length; i++) {
      const fingerprint = fingerprints[i];
      const score = scoresArray[i];
      
      const predictedScore = score.predictedScore || score.score || 0;
      const percentage = Math.round((predictedScore / 70) * 100);
      
      // Update distribution
      if (percentage >= 85) qualityDistribution.elite_85_plus++;
      else if (percentage >= 75) qualityDistribution.excellent_75_84++;
      else if (percentage >= 68) qualityDistribution.good_68_74++;
      else qualityDistribution.poor_below_68++;

      scoredFingerprints.push({
        ...fingerprint,
        predictedHardSkillScore: predictedScore,
        predictedPercentage: percentage,
        confidence: score.confidence || 'medium',
        signals: score.signals || [],
        rationale: score.rationale || 'No rationale provided'
      });
    }

    // Filter to keep only ≥ minimum percentage (for stats, but we return ALL)
    const minPoints = Math.round(minPercentage * 0.7); // Convert % to points
    const passedCandidates = scoredFingerprints.filter(
      fp => fp.predictedHardSkillScore >= minPoints
    );

    console.log(`\n📊 [Phase 3: Results]`);
    console.log(`   Total evaluated: ${scoredFingerprints.length}`);
    console.log(`   Passed (≥${minPercentage}%): ${passedCandidates.length}`);
    console.log(`   Filtered (<${minPercentage}%): ${scoredFingerprints.length - passedCandidates.length}`);
    console.log(`\n   Quality Distribution:`);
    console.log(`      Elite (≥85%): ${qualityDistribution.elite_85_plus}`);
    console.log(`      Excellent (75-84%): ${qualityDistribution.excellent_75_84}`);
    console.log(`      Good (68-74%): ${qualityDistribution.good_68_74}`);
    console.log(`      Poor (<68%): ${qualityDistribution.poor_below_68} ❌ REJECTED`);
    
    // CHANGED: Return ALL scored fingerprints (including below threshold)
    // Phase 4 will separate them by tier (Elite/Warm/Clue/Rejected)
    return {
      scoredFingerprints: scoredFingerprints, // Return ALL scored candidates
      totalEvaluated: scoredFingerprints.length,
      passed: passedCandidates.length,
      filtered: scoredFingerprints.length - passedCandidates.length,
      estimatedCost: 0.08, // Grok API cost (rough estimate)
      qualityDistribution
    };

  } catch (error) {
    console.error('[Phase 3] Scoring error:', error);
    throw new Error(`Failed to score snippets: ${error}`);
  }
}
