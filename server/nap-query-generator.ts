/**
 * UNIVERSAL NAP → MULTI-QUERY GENERATOR (Phase 1 of 4-Phase Elite Sourcing)
 * 
 * Converts ANY NAP (CFO, CTO, VP Sales, Associate, etc.) into 8-15 targeted Boolean queries
 * + competitor mapping queries + X/Twitter strategies
 * 
 * UNIVERSAL: Works for ANY position, ANY industry, ANY client
 * Focuses on HARD SKILLS only (70% weight) - soft skills evaluated by humans later
 * 
 * PROVIDER: Uses DeepSeek (via OpenRouter) by default, with Grok fallback
 */

import { callLLM, getAvailableProviders, type LLMProvider } from "./llm-router";

// Determine the best available provider for query generation
// Priority: DeepSeek (user preference) > Grok (fallback)
function getQueryProvider(): LLMProvider {
  const providers = getAvailableProviders();
  const deepseek = providers.find(p => p.provider === 'deepseek' && p.available);
  const grok = providers.find(p => p.provider === 'grok' && p.available);
  
  if (deepseek) {
    console.log('[Query Generator] Using DeepSeek via OpenRouter');
    return 'deepseek';
  }
  if (grok) {
    console.log('[Query Generator] Using Grok (fallback)');
    return 'grok';
  }
  throw new Error("No LLM provider available for query generation (need OPENROUTER_API_KEY or XAI_API_KEY)");
}

/**
 * NAP Input - Universal structure for any role
 */
export interface UniversalNAP {
  need: string;              // Core role requirements (e.g., "CFO with M&A execution")
  authority: string;         // Reporting structure (e.g., "CEO/Board")
  pain: string;              // Business challenge/urgency
  
  // Job context
  title: string;             // Job title (e.g., "CFO", "VP Engineering")
  industry?: string;         // Industry context
  location?: string;         // Geography
  companyName?: string;      // Client company name (for competitor mapping)
  
  // Hard skill requirements (extracted from NAP - 70% weight)
  hardSkillWeights?: Record<string, number>; // e.g., {"M&A execution": 25, "Mandarin": 15}
}

/**
 * Generated Query Output - Ready for Phase 2 (Fingerprinting)
 */
export interface MultiQueryStrategy {
  // Primary Boolean queries (8-15 variations)
  booleanQueries: string[];
  
  // Competitor mapping queries (3-5 if applicable)
  competitorQueries: string[];
  
  // X/Twitter social signal strategies (2-3)
  xStrategies: string[];
  
  // Query metadata
  totalQueries: number;
  queryRationale: string;     // WHY these queries were chosen
  estimatedCoverage: string;  // Expected market coverage
}

/**
 * UNIVERSAL NAP → QUERY GENERATOR
 * 
 * Uses Grok AI to analyze NAP and generate targeted queries automatically
 * Works for ANY role, ANY industry, ANY geography
 */
export async function generateMultiQueryStrategy(
  nap: UniversalNAP
): Promise<MultiQueryStrategy> {
  console.log(`\n🎯 [Query Generator] Generating multi-query strategy for: ${nap.title}`);
  
  const prompt = `You are an expert executive search consultant creating LinkedIn search queries.

**JOB CONTEXT:**
- Role: ${nap.title}
- Industry: ${nap.industry || 'Not specified'}
- Location: ${nap.location || 'Global'}
- Company: ${nap.companyName || 'Confidential'}

**NAP ANALYSIS:**
- NEED: ${nap.need}
- AUTHORITY: ${nap.authority}
- PAIN: ${nap.pain}

**HARD SKILL REQUIREMENTS (70% weight - what can be found on LinkedIn):**
${nap.hardSkillWeights 
  ? Object.entries(nap.hardSkillWeights)
      .sort((a, b) => b[1] - a[1])
      .map(([skill, weight]) => `- ${skill}: ${weight} points (out of 70 total)`)
      .join('\n')
  : '- Extract from NEED above'
}

**YOUR TASK:**
Generate a comprehensive multi-query search strategy with 3 components:

1. **PRIMARY GOOGLE-FRIENDLY QUERIES (8-15 variations)**
   - Create simple keyword combinations that Google search understands
   - These will be executed via: "site:linkedin.com/in [your keywords]"
   - Include role title variations (CFO, Chief Financial Officer, VP Finance - test each)
   - Combine top 2-3 hard skills from NAP with each query
   - Add industry/pain-driven keywords where relevant
   - Use geographic location if specified
   - Create both broad queries (2-3 skills) and narrow queries (all 3-4 skills)
   
   **FORMAT: Simple keywords separated by spaces, NO parentheses or Boolean operators**
   
   Examples:
   - CFO M&A Mandarin (role + top 2 skills)
   - Chief Financial Officer private equity deal (role + industry + skill)
   - VP Finance Hong Kong PE (role + location + industry)
   - CFO Mandarin fluency (role + specific skill)
   - Finance Director M&A strategy (role variant + skill)

2. **COMPETITOR MAPPING QUERIES (3-5 if applicable)**
   - Identify 3-5 peer companies/competitors in the industry
   - Create simple queries: CompanyName Title (e.g., "Hillhouse Capital CFO")
   - Include year if known
   - Only include if industry context is clear
   
   Examples:
   - Hillhouse Capital CFO
   - Baring Private Equity Director Finance
   - Blackstone Partner Finance 2024

3. **X/TWITTER STRATEGIES (2-3 social signal queries)**
   - Create Twitter/X advanced search queries
   - Target industry influencers, job postings, professional communities
   - Use from: operators for relevant accounts
   
   Examples:
   - from:PE_Asia CFO Mandarin
   - from:ChinaPE recruitment director
   - CFO job posting Hong Kong

**CRITICAL RULES:**
- UNIVERSAL: Queries must work for THIS SPECIFIC role (adapt to CFO, CTO, Associate, VP, etc.)
- Focus on HARD SKILLS only (what's visible on LinkedIn profiles)
- Each query must be DISTINCT (no duplicates)
- **PRIORITY: Include top 2-3 highest-weighted skills in EVERY query**
- Include location keywords if specified
- Generate 8-15 Google-friendly queries minimum
- Use simple keywords only - NO parentheses, NO Boolean operators (AND/OR), NO quotes except for exact phrases
- Be specific but not overly restrictive - start broad, then narrow

Respond in JSON format:
{
  "booleanQueries": ["query1", "query2", ... 8-15 queries],
  "competitorQueries": ["query1", "query2", ... 3-5 queries or empty if not applicable],
  "xStrategies": ["strategy1", "strategy2", ... 2-3 strategies],
  "queryRationale": "<1-2 sentences explaining WHY these queries target the right candidates>",
  "estimatedCoverage": "<Expected % of addressable market these queries will reach>"
}`;

  // Try DeepSeek first, fall back to Grok if it fails
  // DeepSeek may not support response_format, so we handle errors gracefully
  async function tryGenerateQueries(provider: LLMProvider): Promise<string> {
    const supportsJsonFormat = provider === 'grok' || provider === 'openai';
    
    return callLLM(
      provider,
      "You are an expert executive search consultant. Generate comprehensive, targeted LinkedIn search queries. Always respond with valid JSON. Generate ONLY simple keyword queries without Boolean operators, parentheses, or quotes.",
      prompt,
      {
        temperature: 0.7,
        maxTokens: 2000,
        ...(supportsJsonFormat ? { responseFormat: { type: 'json_object' as const } } : {})
      }
    );
  }

  try {
    let response: string;
    const primaryProvider = getQueryProvider();
    
    try {
      response = await tryGenerateQueries(primaryProvider);
    } catch (primaryError) {
      // If DeepSeek fails, fall back to Grok
      if (primaryProvider === 'deepseek') {
        console.log(`[Query Generator] DeepSeek failed, falling back to Grok: ${primaryError}`);
        response = await tryGenerateQueries('grok');
      } else {
        throw primaryError;
      }
    }

    const result = JSON.parse(response || "{}");
    
    // Validate and structure response
    const strategy: MultiQueryStrategy = {
      booleanQueries: result.booleanQueries || [],
      competitorQueries: result.competitorQueries || [],
      xStrategies: result.xStrategies || [],
      totalQueries: 
        (result.booleanQueries?.length || 0) + 
        (result.competitorQueries?.length || 0) + 
        (result.xStrategies?.length || 0),
      queryRationale: result.queryRationale || 'Query strategy generated from NAP analysis',
      estimatedCoverage: result.estimatedCoverage || '60-80% of addressable market'
    };
    
    console.log(`   ✅ Generated ${strategy.totalQueries} total queries:`);
    console.log(`      - ${strategy.booleanQueries.length} Boolean queries`);
    console.log(`      - ${strategy.competitorQueries.length} Competitor queries`);
    console.log(`      - ${strategy.xStrategies.length} X/Twitter strategies`);
    console.log(`   📊 Estimated Coverage: ${strategy.estimatedCoverage}`);
    
    return strategy;
    
  } catch (error) {
    console.error('[Query Generator] Error:', error);
    throw new Error(`Failed to generate query strategy: ${error}`);
  }
}

/**
 * EXTRACT HARD SKILLS FROM NAP
 * 
 * Helper function to parse NAP "need" field and extract hard skill requirements with weights
 * This enables scoring against the 70-point hard skill scale
 */
export async function extractHardSkillsFromNAP(
  nap: Pick<UniversalNAP, 'need' | 'title' | 'industry'>
): Promise<Record<string, number>> {
  console.log(`\n📋 [Query Generator] Extracting hard skills from NAP...`);
  
  const prompt = `You are analyzing a job requirement to extract HARD SKILLS (visible on LinkedIn/resume).

**ROLE:** ${nap.title}
**INDUSTRY:** ${nap.industry || 'Not specified'}
**NEED:** ${nap.need}

**TASK:**
Extract 4-8 HARD SKILL requirements and assign point weights (total must = 70 points).

**HARD SKILLS = Observable on LinkedIn/Resume:**
- Technical skills (e.g., "Python", "M&A execution", "financial modeling")
- Experience requirements (e.g., "PE fund experience", "scaling SaaS")
- Certifications (e.g., "CFA", "CPA", "AWS certified")
- Industry background (e.g., "fintech experience", "healthcare")
- Language proficiency (e.g., "Mandarin fluency")
- Domain expertise (e.g., "regulatory compliance", "IPO readiness")

**NOT HARD SKILLS (these are soft skills - ignore):**
- Leadership style
- Cultural fit
- Communication skills
- Personality traits
- Team dynamics

**WEIGHTING RULES:**
- Total points MUST equal exactly 70
- Most critical skills: 20-25 points
- Important skills: 12-18 points
- Nice-to-have skills: 5-10 points
- Extract 4-8 skills maximum

Respond in JSON format:
{
  "hardSkills": {
    "Skill name 1": 25,
    "Skill name 2": 20,
    "Skill name 3": 15,
    "Skill name 4": 10
  },
  "totalPoints": 70
}`;

  // Try DeepSeek first, fall back to Grok if it fails
  async function tryExtractSkills(provider: LLMProvider): Promise<string> {
    const supportsJsonFormat = provider === 'grok' || provider === 'openai';
    
    return callLLM(
      provider,
      "You are an expert at analyzing job requirements and extracting measurable hard skills. Always respond with valid JSON. Extract only hard skills that appear on LinkedIn profiles.",
      prompt,
      {
        maxTokens: 500,
        ...(supportsJsonFormat ? { responseFormat: { type: 'json_object' as const } } : {})
      }
    );
  }

  try {
    let response: string;
    const primaryProvider = getQueryProvider();
    
    try {
      response = await tryExtractSkills(primaryProvider);
    } catch (primaryError) {
      // If DeepSeek fails, fall back to Grok
      if (primaryProvider === 'deepseek') {
        console.log(`[Query Generator] DeepSeek failed for skills, falling back to Grok: ${primaryError}`);
        response = await tryExtractSkills('grok');
      } else {
        throw primaryError;
      }
    }

    const result = JSON.parse(response || "{}");
    const hardSkills = result.hardSkills || {};
    
    console.log(`   ✅ Extracted ${Object.keys(hardSkills).length} hard skills:`);
    Object.entries(hardSkills).forEach(([skill, points]) => {
      console.log(`      - ${skill}: ${points} points`);
    });
    
    return hardSkills;
    
  } catch (error) {
    console.error('[Query Generator] Error extracting hard skills:', error);
    // Fallback: return empty object, caller can handle
    return {};
  }
}
