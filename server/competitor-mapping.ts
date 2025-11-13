/**
 * COMPETITOR MAPPING ENGINE
 * 
 * Grok's Key Insight: Instead of searching ALL of LinkedIn randomly,
 * search specific titles at specific competitor firms for targeted results.
 * 
 * Example: 
 *   Input: "PAG, Private Equity, $60B, Hong Kong"
 *   Output: [Hillhouse, KKR Asia, Carlyle Asia, TPG Asia, Warburg Pincus...]
 * 
 * Then search: "Hillhouse" "CFO" 2025 → Get actual CFO name
 */

import OpenAI from "openai";

if (!process.env.XAI_API_KEY) {
  throw new Error("XAI_API_KEY must be set");
}

const openai = new OpenAI({ 
  baseURL: "https://api.x.ai/v1", 
  apiKey: process.env.XAI_API_KEY 
});

export interface CompanyContext {
  name: string;           // e.g., "PAG"
  industry: string;       // e.g., "Private Equity"
  size?: string;          // e.g., "$60B AUM" or "500 employees"
  region?: string;        // e.g., "Hong Kong", "London", "San Francisco"
  stage?: string;         // e.g., "Series D", "Public", "Growth-stage"
}

export interface CompetitorFirm {
  name: string;           // e.g., "Hillhouse Capital"
  relevance: string;      // Why this firm is a good peer (e.g., "Similar AUM, Asia-focused")
  context?: string;       // Additional context (e.g., "$70B AUM, China/HK")
}

/**
 * Generate list of 15-20 competitor firms using AI
 * This enables targeted search: "Competitor X" + "CFO" instead of random LinkedIn search
 */
export async function generateCompetitorMap(
  context: CompanyContext
): Promise<CompetitorFirm[]> {
  const prompt = `You are an expert executive recruiter with deep knowledge of company landscapes across industries.

TASK: Generate a list of 15-20 competitor/peer firms for targeted executive search.

TARGET COMPANY CONTEXT:
- Company: ${context.name}
- Industry: ${context.industry}
${context.size ? `- Size: ${context.size}` : ''}
${context.region ? `- Region: ${context.region}` : ''}
${context.stage ? `- Stage: ${context.stage}` : ''}

REQUIREMENTS:
1. Find firms that are TRUE PEERS - similar size, industry, region, stage
2. Include both direct competitors and adjacent firms that would have similar talent
3. For each firm, briefly explain WHY it's a good peer (1 short phrase)
4. Prioritize firms in the same region first, then expand globally
5. Include 15-20 firms total

OUTPUT FORMAT (JSON array):
[
  {
    "name": "Firm Name",
    "relevance": "Why this is a good peer (1 phrase)",
    "context": "Brief context like size/focus"
  }
]

EXAMPLES:

For "PAG, Private Equity, $60B, Hong Kong":
[
  {"name": "Hillhouse Capital", "relevance": "Similar AUM, Asia-focused PE", "context": "$70B AUM, China/HK"},
  {"name": "KKR Asia", "relevance": "Global PE with strong Asia presence", "context": "$30B Asia AUM"},
  {"name": "Carlyle Asia", "relevance": "Multi-strategy PE in Asia", "context": "$30B Asia AUM"}
]

For "Revolut, FinTech, $2B valuation, London":
[
  {"name": "N26", "relevance": "Digital bank, similar scale", "context": "Germany-based, EU expansion"},
  {"name": "Monzo", "relevance": "UK challenger bank", "context": "$5B valuation"},
  {"name": "Klarna", "relevance": "European fintech leader", "context": "Sweden, global payments"}
]

Now generate the competitor map for: ${context.name} (${context.industry})`;

  const completion = await openai.chat.completions.create({
    model: "grok-2-1212",
    messages: [
      { role: "system", content: "You are an expert executive recruiter. Always respond with valid JSON only, no other text." },
      { role: "user", content: prompt }
    ],
    temperature: 0.7,
  });

  const response = completion.choices[0]?.message?.content || '';

  // Parse JSON response
  try {
    // Extract JSON from response (handle markdown code blocks)
    let jsonText = response.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/, '').replace(/\n?```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/, '').replace(/\n?```$/, '');
    }
    
    const competitors = JSON.parse(jsonText) as CompetitorFirm[];
    
    // Validate structure
    if (!Array.isArray(competitors)) {
      throw new Error("Response is not an array");
    }
    
    // Ensure each has required fields
    competitors.forEach(c => {
      if (!c.name || !c.relevance) {
        throw new Error("Invalid competitor structure");
      }
    });
    
    console.log(`🎯 [Competitor Map] Generated ${competitors.length} peer firms for ${context.name}`);
    competitors.slice(0, 5).forEach(c => {
      console.log(`   📋 ${c.name} - ${c.relevance}`);
    });
    if (competitors.length > 5) {
      console.log(`   ... and ${competitors.length - 5} more firms`);
    }
    
    return competitors;
  } catch (error) {
    console.error('❌ [Competitor Map] Failed to parse AI response:', error);
    console.error('Raw response:', response);
    
    // Fallback: Return empty array
    return [];
  }
}

/**
 * Generate targeted search queries for each competitor firm
 * Instead of: "CFO" AND "Private Equity" AND "Hong Kong" (random)
 * Do: "Hillhouse" "CFO" 2025, "KKR Asia" "CFO" 2025 (targeted)
 */
export function generateTargetedSearchQueries(
  competitors: CompetitorFirm[],
  targetTitle: string
): string[] {
  return competitors.map(comp => 
    `"${comp.name}" "${targetTitle}" 2025`
  );
}

/**
 * Build comprehensive search strategy using competitor mapping
 * This replaces the old generic Boolean search approach
 */
export interface TargetedSearchStrategy {
  competitorMap: CompetitorFirm[];
  searchQueries: string[];        // One per competitor firm
  searchRationale: string;        // Why this approach
  expectedYield: string;          // What we expect to find
}

export async function buildTargetedSearchStrategy(
  companyContext: CompanyContext,
  targetRole: string
): Promise<TargetedSearchStrategy> {
  // Step 1: Generate competitor map
  const competitorMap = await generateCompetitorMap(companyContext);
  
  if (competitorMap.length === 0) {
    throw new Error('Failed to generate competitor map');
  }
  
  // Step 2: Generate search queries (one per competitor)
  const searchQueries = generateTargetedSearchQueries(competitorMap, targetRole);
  
  // Step 3: Build strategy explanation
  const searchRationale = `Targeting ${competitorMap.length} peer firms of ${companyContext.name}. ` +
    `Searching for "${targetRole}" at each competitor to find candidates with similar experience. ` +
    `This targeted approach yields higher-quality matches than generic LinkedIn searches.`;
  
  const expectedYield = `Expected to find ${Math.min(competitorMap.length, 15)} candidates ` +
    `from peer firms with relevant ${targetRole} experience in ${companyContext.industry}.`;
  
  console.log('🎯 [Targeted Search Strategy]');
  console.log(`   Company: ${companyContext.name} (${companyContext.industry})`);
  console.log(`   Target Role: ${targetRole}`);
  console.log(`   Competitor Firms: ${competitorMap.length}`);
  console.log(`   Search Queries: ${searchQueries.length}`);
  
  return {
    competitorMap,
    searchQueries,
    searchRationale,
    expectedYield
  };
}
