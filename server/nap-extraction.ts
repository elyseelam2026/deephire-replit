/**
 * DYNAMIC NAP EXTRACTION ENGINE
 * Intelligently extracts NAP answers from user messages
 * Handles multiple answers in single message, skip requests, and impact analysis
 */

import OpenAI from "openai";

if (!process.env.XAI_API_KEY) {
  throw new Error("XAI_API_KEY must be set");
}

const openai = new OpenAI({ 
  baseURL: "https://api.x.ai/v1", 
  apiKey: process.env.XAI_API_KEY 
});

export interface NAPExtractionResult {
  extractedAnswers: {
    salary?: string;
    urgency?: string;
    successCriteria?: string;
    growthPreference?: string;      // 'leadership' or 'specialist'
    remotePolicy?: string;           // 'remote', 'hybrid', 'onsite'
    leadershipStyle?: string;
    teamDynamics?: string;
    competitorContext?: string;
  };
  questionsAnswered: string[];        // Which NAP questions were answered
  skipRequests: string[];             // Which questions user wants to skip
  needsFollowUp: string[];            // Questions that need clarification
}

export interface QualityGateImpact {
  baseGate: number;                   // 70 (default)
  adjustedGate: number;               // After skips
  skippedQuestions: string[];
  estimatedCandidateReduction: string; // e.g., "8-12 → 5-8 candidates"
  reasoning: string[];                // Why each skip impacts quality
}

/**
 * Extract NAP answers from user message using Grok
 * Handles: direct answers, multiple answers, skip requests, clarifications
 */
export async function extractNAPAnswers(
  userMessage: string,
  currentNAP: {
    salary?: string;
    urgency?: string;
    successCriteria?: string;
    growthPreference?: string;
    remotePolicy?: string;
    leadershipStyle?: string;
    teamDynamics?: string;
    competitorContext?: string;
  }
): Promise<NAPExtractionResult> {
  const prompt = `You are analyzing a recruiter's message to extract Needs Analysis Profile (NAP) answers.

**USER MESSAGE:**
"${userMessage}"

**CURRENT NAP STATE (what we already know):**
${JSON.stringify(currentNAP, null, 2)}

**YOUR TASK:**
Extract any NEW answers from the user message. Identify:
1. Direct answers to these 8 NAP questions:
   - Q1: Salary/Budget range (e.g., "150K-200K")
   - Q2: Urgency level (e.g., "urgent", "strategic", "3 months")
   - Q3: Success criteria (e.g., "close 5 deals in 90 days")
   - Q4: Growth preference (e.g., "leadership/team building" or "specialist/deep expert")
   - Q5: Remote policy (e.g., "remote", "hybrid", "on-site")
   - Q6: Leadership style (e.g., "collaborative", "hands-off", "directive")
   - Q7: Team dynamics (e.g., "fast-paced startup", "slow-moving enterprise")
   - Q8: Competitor context (e.g., "Google", "Goldman Sachs", "PE firms")

2. Skip requests: Does the user say they want to skip a question? (e.g., "skip that", "not important", "don't care")

3. Clarifications: Which questions need follow-up because answer was vague?

Respond in JSON format:
{
  "extractedAnswers": {
    "salary": "string or null",
    "urgency": "string or null",
    "successCriteria": "string or null",
    "growthPreference": "string or null",
    "remotePolicy": "string or null",
    "leadershipStyle": "string or null",
    "teamDynamics": "string or null",
    "competitorContext": "string or null"
  },
  "questionsAnswered": ["Q2", "Q5"],  // Which questions were answered in this message
  "skipRequests": ["Q6"],              // Which questions user wants to skip
  "needsFollowUp": ["Q3"]              // Which answers need clarification
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "grok-2-1212",
      messages: [
        {
          role: "system",
          content: "You are a NAP extraction expert. Always respond with valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 500,
      temperature: 0.7
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      extractedAnswers: result.extractedAnswers || {},
      questionsAnswered: result.questionsAnswered || [],
      skipRequests: result.skipRequests || [],
      needsFollowUp: result.needsFollowUp || []
    };
  } catch (error) {
    console.error('NAP extraction error:', error);
    return {
      extractedAnswers: {},
      questionsAnswered: [],
      skipRequests: [],
      needsFollowUp: []
    };
  }
}

/**
 * Calculate quality gate impact of skipped NAP questions
 * Returns adjusted quality threshold and expected candidate reduction
 */
export function calculateQualityGateImpact(skippedQuestions: string[]): QualityGateImpact {
  const questionImpacts: Record<string, {reduction: number; reason: string}> = {
    'salary': {
      reduction: 3,
      reason: 'Cannot filter by compensation expectations → broader but less targeted pool'
    },
    'urgency': {
      reduction: 2,
      reason: 'Cannot prioritize by timeline → may source slower-moving candidates'
    },
    'successCriteria': {
      reduction: 5,
      reason: 'Cannot assess 90-day delivery capability → lower confidence in execution'
    },
    'growthPreference': {
      reduction: 3,
      reason: 'Cannot match career trajectory → risk of wrong profile (builder vs specialist mismatch)'
    },
    'remotePolicy': {
      reduction: 4,
      reason: 'Cannot filter location/remote fit → higher rejection rate from candidates'
    },
    'leadershipStyle': {
      reduction: 2,
      reason: 'Cannot assess management fit → cultural misalignment risk'
    },
    'teamDynamics': {
      reduction: 2,
      reason: 'Cannot assess team culture fit → cultural friction risk'
    },
    'competitorContext': {
      reduction: 3,
      reason: 'Cannot target proven talent pools → cast wider net, lower conversion'
    }
  };

  let totalReduction = 0;
  const reasoning: string[] = [];

  for (const q of skippedQuestions) {
    const impact = questionImpacts[q.toLowerCase()];
    if (impact) {
      totalReduction += impact.reduction;
      reasoning.push(`**${q}**: -${impact.reduction}% (${impact.reason})`);
    }
  }

  const baseGate = 70;
  const adjustedGate = Math.max(55, baseGate - totalReduction); // Floor at 55%

  // Estimate candidate reduction
  // Base: 30 found → ~8-12 at 70%
  // Each 5% reduction ≈ 1-2 fewer candidates
  const baselineHigh = 12;
  const baselineLow = 8;
  const reductionFactor = totalReduction / 5;
  const adjustedHigh = Math.max(3, Math.round(baselineHigh - reductionFactor));
  const adjustedLow = Math.max(2, Math.round(baselineLow - reductionFactor));

  return {
    baseGate,
    adjustedGate,
    skippedQuestions,
    estimatedCandidateReduction: `${baselineLow}-${baselineHigh} → ${adjustedLow}-${adjustedHigh} candidates`,
    reasoning
  };
}

/**
 * Determine which NAP questions are still unanswered
 * Returns prioritized list of missing questions
 */
export function determineUnansweredQuestions(
  currentNAP: {
    salary?: string;
    urgency?: string;
    successCriteria?: string;
    growthPreference?: string;
    remotePolicy?: string;
    leadershipStyle?: string;
    teamDynamics?: string;
    competitorContext?: string;
  },
  skippedQuestions?: string[]
): string[] {
  const questions = [
    { key: 'salary', label: 'Q1: Salary & Budget' },
    { key: 'urgency', label: 'Q2: Business Urgency' },
    { key: 'successCriteria', label: 'Q3: Success Criteria' },
    { key: 'growthPreference', label: 'Q4: Growth Trajectory' },
    { key: 'remotePolicy', label: 'Q5: Remote Policy' },
    { key: 'leadershipStyle', label: 'Q6: Leadership Style' },
    { key: 'teamDynamics', label: 'Q7: Team Dynamics' },
    { key: 'competitorContext', label: 'Q8: Competitor Sourcing' }
  ];

  const unanswered: string[] = [];

  for (const q of questions) {
    const isAnswered = (currentNAP as any)[q.key] && (currentNAP as any)[q.key].trim().length > 0;
    const isSkipped = skippedQuestions?.some(skip => 
      skip.toLowerCase().includes(q.key.toLowerCase()) || skip.includes(q.label)
    );

    if (!isAnswered && !isSkipped) {
      unanswered.push(q.label);
    }
  }

  return unanswered;
}
