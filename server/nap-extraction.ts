/**
 * DYNAMIC NAP EXTRACTION ENGINE - CORRECTED
 * 
 * CRITICAL DISTINCTION:
 * - HARD SKILLS (for sourcing): title, skills, location, years, competitors
 * - SOFT CONTEXT (for post-sourcing scoring): salary, soft skills, team dynamics, etc.
 * 
 * Sourcing triggers when HARD SKILLS are ready, not when all NAP is complete.
 * Soft context is collected in parallel, used for quality scoring AFTER candidates found.
 */

import OpenAI from "openai";

if (!process.env.XAI_API_KEY) {
  throw new Error("XAI_API_KEY must be set");
}

const openai = new OpenAI({ 
  baseURL: "https://api.x.ai/v1", 
  apiKey: process.env.XAI_API_KEY 
});

export interface HardSkillsForSourcing {
  title: string;                       // CFO, VP Sales, etc. - REQUIRED for search
  hardSkills: string[];                // M&A, Treasury, FP&A - REQUIRED for search
  location?: string;                   // Hong Kong, SF - used for targeting
  seniorityLevel?: string;             // CFO, VP, Director - inferred from title + history, NOT years
  competitorCompanies?: string[];      // Hillhouse, Goldman, etc. - REQUIRED for competitor search
  industry?: string;                   // Finance, Tech, etc. - optional targeting
}

export interface SoftContextForScoring {
  // These are collected but NOT used for sourcing - only for post-sourcing quality gate
  salary?: string;                     // Used for offer negotiations, not sourcing
  urgency?: string;                    // Used for quality gate, not sourcing
  successCriteria?: string;            // Used for post-sourcing evaluation
  growthPreference?: string;           // Used for post-sourcing culture fit scoring
  remotePolicy?: string;               // Used for post-sourcing location/culture fit
  leadershipStyle?: string;            // Used for post-sourcing management fit
  teamDynamics?: string;               // Used for post-sourcing culture fit
}

export interface NAPExtractionResult {
  // HARD SKILLS: Ready to source NOW
  hardSkills: HardSkillsForSourcing;
  
  // SOFT CONTEXT: Collect for post-sourcing scoring
  softContext: SoftContextForScoring;
  
  // Status
  readyToSource: boolean;              // true if hardSkills are complete
  missingForSourcing: string[];        // What's still needed to trigger search
  softContextProgress: number;         // % of optional soft context collected (0-100)
}

/**
 * Extract NAP from user message, SEPARATING hard skills from soft context
 * Returns whether we're ready to source NOW (hard skills), vs ongoing context collection
 */
export async function extractNAPAnswers(
  userMessage: string,
  currentHardSkills: HardSkillsForSourcing,
  currentSoftContext: SoftContextForScoring
): Promise<NAPExtractionResult> {
  const prompt = `You are analyzing a recruiter's message to extract job requirements.

**CRITICAL DISTINCTION FOR SOURCING:**

**HARD SKILLS (for immediate LinkedIn search):**
- Title: What exact role? (CFO, VP Sales, etc.)
- Hard Skills: What concrete skills? (M&A, Treasury, Python, etc.) - MUST be visible on LinkedIn
- Location: Where? (Hong Kong, SF, etc.) - visible on LinkedIn
- Seniority: What level? (C-Suite, VP, Director) - inferred from title + company progression
- Competitor Companies: Which firms to target? (Goldman, Hillhouse, etc.)

**SOFT CONTEXT (for post-sourcing evaluation, NOT used in sourcing):**
- Salary: Candidate won't list this on LinkedIn anyway
- Urgency: Used for quality gate, not sourcing
- Success Criteria: Evaluated after finding candidates
- Growth Preference: Evaluated after finding candidates
- Remote Policy: Evaluated after finding candidates
- Leadership Style: Evaluated after finding candidates
- Team Dynamics: Evaluated after finding candidates

**USER MESSAGE:**
"${userMessage}"

**YOUR TASK:**
Extract HARD SKILLS and SOFT CONTEXT separately. Focus on what's visible on LinkedIn profiles.

Respond in JSON:
{
  "hardSkills": {
    "title": "string or null",
    "hardSkills": ["skill1", "skill2"],
    "location": "string or null",
    "seniorityLevel": "string or null (e.g., CFO, VP, Director - inferred from title and context)",
    "competitorCompanies": ["company1", "company2"],
    "industry": "string or null"
  },
  "softContext": {
    "salary": "string or null",
    "urgency": "string or null",
    "successCriteria": "string or null",
    "growthPreference": "string or null",
    "remotePolicy": "string or null",
    "leadershipStyle": "string or null",
    "teamDynamics": "string or null"
  }
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "grok-2-1212",
      messages: [
        {
          role: "system",
          content: "Extract hard skills for sourcing vs soft context. Hard skills must be LinkedIn-visible. Respond with valid JSON."
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
    
    // Merge into current state
    const merged: NAPExtractionResult = {
      hardSkills: {
        title: result.hardSkills?.title || currentHardSkills.title,
        hardSkills: [...(currentHardSkills.hardSkills || []), ...(result.hardSkills?.hardSkills || [])],
        location: result.hardSkills?.location || currentHardSkills.location,
        seniorityLevel: result.hardSkills?.seniorityLevel || currentHardSkills.seniorityLevel,
        competitorCompanies: [...(currentHardSkills.competitorCompanies || []), ...(result.hardSkills?.competitorCompanies || [])],
        industry: result.hardSkills?.industry || currentHardSkills.industry
      },
      softContext: {
        salary: result.softContext?.salary || currentSoftContext.salary,
        urgency: result.softContext?.urgency || currentSoftContext.urgency,
        successCriteria: result.softContext?.successCriteria || currentSoftContext.successCriteria,
        growthPreference: result.softContext?.growthPreference || currentSoftContext.growthPreference,
        remotePolicy: result.softContext?.remotePolicy || currentSoftContext.remotePolicy,
        leadershipStyle: result.softContext?.leadershipStyle || currentSoftContext.leadershipStyle,
        teamDynamics: result.softContext?.teamDynamics || currentSoftContext.teamDynamics
      },
      readyToSource: false,
      missingForSourcing: [],
      softContextProgress: 0
    };
    
    // Check if ready to source (hard skills complete)
    const missing: string[] = [];
    if (!merged.hardSkills.title) missing.push("Job title (CFO, VP Sales, etc.)");
    if (!merged.hardSkills.hardSkills || merged.hardSkills.hardSkills.length === 0) missing.push("Hard skills (M&A, Treasury, etc.)");
    
    merged.readyToSource = missing.length === 0;
    merged.missingForSourcing = missing;
    
    // Soft context progress (just for visibility, not blocking)
    const softAnswered = [
      merged.softContext.salary,
      merged.softContext.urgency,
      merged.softContext.successCriteria,
      merged.softContext.growthPreference,
      merged.softContext.remotePolicy,
      merged.softContext.leadershipStyle,
      merged.softContext.teamDynamics
    ].filter(v => !!v).length;
    merged.softContextProgress = Math.round((softAnswered / 7) * 100);
    
    return merged;
  } catch (error) {
    console.error('NAP extraction error:', error);
    return {
      hardSkills: currentHardSkills,
      softContext: currentSoftContext,
      readyToSource: false,
      missingForSourcing: ['Job title', 'Hard skills'],
      softContextProgress: 0
    };
  }
}

/**
 * Calculate quality gate impact of missing soft context
 * This is used for POST-SOURCING scoring, not for triggering search
 */
export function calculateSoftContextImpact(softContext: SoftContextForScoring): {
  coverage: number;  // 0-100 how much soft context we have
  qualityGateAdjustment: number;  // How much to adjust 70% gate based on missing context
  warning?: string;
} {
  const answered = [
    softContext.urgency,
    softContext.successCriteria,
    softContext.growthPreference,
    softContext.remotePolicy,
    softContext.leadershipStyle,
    softContext.teamDynamics
  ].filter(v => !!v).length;
  
  const coverage = Math.round((answered / 6) * 100);
  
  // Missing soft context lowers confidence, adjust quality gate down
  const adjustment = coverage >= 80 ? 0 : coverage >= 60 ? -5 : coverage >= 40 ? -10 : -15;
  
  return {
    coverage,
    qualityGateAdjustment: adjustment,
    warning: coverage < 50 ? `Limited context collected (${coverage}%). Candidate quality scoring will be broader.` : undefined
  };
}
