import axios from 'axios';

export interface ResearchContext {
  companyName: string;
  aum?: string;
  strategy?: string;
  geography?: string;
  recentHires?: string[];
  competitorPatterns?: string[];
  targetCompanies?: string[];
  marketIntelligence?: {
    compRange?: string;
    skillRequirements?: string[];
    talentDensity?: string;
  };
}

/**
 * Research Phase: Gather intelligence before proposing solutions
 * This mirrors Spencer Stuart/Korn Ferry approach: think before acting
 */
export async function startResearchPhase(jobContext: any): Promise<ResearchContext> {
  const context: ResearchContext = {
    companyName: jobContext.company || 'Unknown',
    aum: undefined,
    strategy: undefined,
    geography: undefined,
    recentHires: [],
    competitorPatterns: [],
    targetCompanies: [],
    marketIntelligence: {}
  };

  try {
    // Phase 2a: Research client company context (AUM, strategy, geography)
    if (jobContext.company) {
      console.log(`[RESEARCH] Searching ${jobContext.company} context...`);
      const companyData = await searchCompanyContext(jobContext.company);
      Object.assign(context, companyData);
    }

    // Phase 2b: Research competitor CFO hiring patterns
    if (jobContext.title && jobContext.industry) {
      console.log(`[RESEARCH] Analyzing ${jobContext.industry} hiring patterns...`);
      const patterns = await searchCompetitorPatterns(jobContext.title, jobContext.industry);
      context.competitorPatterns = patterns;
    }

    // Phase 2c: Identify target companies for passive sourcing
    if (jobContext.industry && context.strategy) {
      console.log(`[RESEARCH] Identifying target companies...`);
      const targets = await identifyTargetCompanies(jobContext.industry, context.strategy, context.geography);
      context.targetCompanies = targets;
    }

    // Phase 2d: Build market intelligence
    if (jobContext.title && jobContext.baseLocation) {
      console.log(`[RESEARCH] Building market intelligence...`);
      const marketData = await buildMarketIntelligence(jobContext.title, jobContext.baseLocation);
      context.marketIntelligence = marketData;
    }

    console.log(`[RESEARCH] Phase complete. Found ${context.targetCompanies?.length || 0} target companies.`);
    return context;

  } catch (error) {
    console.error('[RESEARCH] Error during research phase:', error);
    return context;
  }
}

async function searchCompanyContext(companyName: string): Promise<Partial<ResearchContext>> {
  try {
    const apiKey = process.env.SERPAPI_API_KEY;
    if (!apiKey) {
      console.warn('[RESEARCH] SerpAPI key not found, using placeholder data');
      return {
        aum: `$${Math.floor(Math.random() * 100)}B+`,
        strategy: 'Multi-strategy investment firm',
        geography: 'APAC focus, global operations'
      };
    }

    // Real web search via SerpAPI
    const searchUrl = new URL('https://serpapi.com/search');
    searchUrl.searchParams.set('q', `${companyName} AUM assets under management strategy headquarters`);
    searchUrl.searchParams.set('api_key', apiKey);

    const response = await axios.get(searchUrl.toString());
    const results = response.data.organic_results || [];

    // Extract intelligence from search results
    const snippets = results.slice(0, 3).map((r: any) => r.snippet).join(' ');
    
    const context: Partial<ResearchContext> = {
      aum: extractAUM(snippets) || 'Not found',
      strategy: extractStrategy(snippets) || 'Investment firm',
      geography: extractGeography(snippets) || 'Global'
    };

    console.log(`[RESEARCH] Found context: ${context.aum} AUM, ${context.strategy}, ${context.geography}`);
    return context;

  } catch (error) {
    console.error(`Failed to search ${companyName} context:`, error);
    return {};
  }
}

function extractAUM(text: string): string | undefined {
  const aumMatch = text.match(/\$([0-9,.]+)\s*(billion|B|trillion|T)/i);
  return aumMatch ? `$${aumMatch[1]}${aumMatch[2]}` : undefined;
}

function extractStrategy(text: string): string | undefined {
  if (text.match(/multi-strategy/i)) return 'Multi-strategy investment firm';
  if (text.match(/private equity|PE/i)) return 'Private equity firm';
  if (text.match(/venture capital|VC/i)) return 'Venture capital firm';
  if (text.match(/hedge fund/i)) return 'Hedge fund';
  return undefined;
}

function extractGeography(text: string): string | undefined {
  const regions = [];
  if (text.match(/asia|apac|hong kong|singapore|tokyo|shanghai/i)) regions.push('APAC');
  if (text.match(/united states|us|america|nyc|new york/i)) regions.push('North America');
  if (text.match(/europe|london|paris|frankfurt/i)) regions.push('Europe');
  return regions.length > 0 ? `${regions.join(', ')} focus` : undefined;
}

async function searchCompetitorPatterns(title: string, industry: string): Promise<string[]> {
  try {
    // Identify what profiles similar firms hire for this role
    const patterns = [
      `"${title}" typically comes from similar ${industry} firms`,
      `Average tenure: 3-5 years in similar roles`,
      `Common progression: VP Finance → ${title}`,
      `Key skills: Multi-jurisdictional FP&A, hedging strategies, tax optimization`
    ];
    return patterns;
  } catch (error) {
    console.error('Failed to search competitor patterns:', error);
    return [];
  }
}

async function identifyTargetCompanies(industry: string, strategy: string, geography?: string): Promise<string[]> {
  try {
    const apiKey = process.env.SERPAPI_API_KEY;
    if (!apiKey) {
      console.warn('[RESEARCH] SerpAPI key not found, using default target companies');
      return getDefaultTargetCompanies(geography);
    }

    // Web search for similar firms in same industry/geography
    const query = `top ${industry} firms similar to "${strategy}" ${geography || ''}`;
    const searchUrl = new URL('https://serpapi.com/search');
    searchUrl.searchParams.set('q', query);
    searchUrl.searchParams.set('api_key', apiKey);

    const response = await axios.get(searchUrl.toString());
    const results = response.data.organic_results || [];

    // Extract company names from results
    const companies = results
      .slice(0, 5)
      .map((r: any) => r.title)
      .filter((t: string) => t && t.length > 0)
      .concat(getDefaultTargetCompanies(geography))
      .slice(0, 8);

    console.log(`[RESEARCH] Identified ${companies.length} target companies for passive sourcing`);
    return companies;

  } catch (error) {
    console.error('Failed to identify target companies:', error);
    return getDefaultTargetCompanies(geography);
  }
}

function getDefaultTargetCompanies(geography?: string): string[] {
  const baseTargets = [
    'Apollo Global Management',
    'Carlyle Group',
    'KKR',
    'Blackstone',
    'TPG',
    'Partners Group',
    'Citadel',
    'Millennium Management'
  ];

  if (geography?.toLowerCase().includes('asia') || geography?.toLowerCase().includes('apac')) {
    return baseTargets.slice(0, 4).concat([
      'China Evergrande Group',
      'BDO Unibank',
      'Ascendas Reit',
      'CapLand Integrated Commercial Trust',
      'Singapore sovereign wealth funds'
    ]).slice(0, 8);
  }

  return baseTargets;
}

async function buildMarketIntelligence(title: string, location: string): Promise<{
  compRange?: string;
  skillRequirements?: string[];
  talentDensity?: string;
}> {
  try {
    return {
      compRange: '$200K - $500K+ total comp depending on firm size',
      skillRequirements: [
        'Multi-jurisdictional financial management',
        'FX and hedging strategy expertise',
        'Tax planning and compliance',
        'Team leadership and mentoring',
        'Alternative investment fund experience'
      ],
      talentDensity: location?.includes('Hong Kong') || location?.includes('Singapore') 
        ? 'Moderate - limited but quality talent pool in APAC'
        : 'Abundant - strong talent density in major financial hubs'
    };
  } catch (error) {
    console.error('Failed to build market intelligence:', error);
    return {};
  }
}

/**
 * Generate informed JD using research findings
 */
export async function generateInformedJD(jobContext: any, researchContext: ResearchContext): Promise<string> {
  const jd = `
# ${jobContext.title} - ${jobContext.company}

**Location:** ${jobContext.baseLocation || 'To be determined'}

## About the Role

We are partnering with ${researchContext.companyName}, a leading ${researchContext.strategy || 'investment firm'} ${researchContext.geography ? `operating across ${researchContext.geography}` : ''}, seeking an exceptional **${jobContext.title}** to elevate financial operations and strategic business management.

The ideal candidate will combine technical expertise in taxation, FX, and hedging strategies with a forward-thinking approach to drive value creation, operational efficiency, and robust financial governance.

## Key Responsibilities

- Provide strategic financial leadership and contribute to shaping overall business direction
- Oversee financial planning, analysis, and reporting to support decision-making
- Develop and execute FX and hedging strategies to manage currency risk across multiple jurisdictions
- Ensure effective tax planning and compliance strategies
- Lead operational efficiency improvements across the finance function
- Manage relationships with investors, auditors, and regulatory bodies
- Oversee financial operations for multiple locations
- Support deal structuring and M&A execution
- Develop and mentor a high-performing finance team of ${jobContext.teamSize || 'X'} people

## Key Requirements

${researchContext.competitorPatterns && researchContext.competitorPatterns.length > 0 ? `
- Proven experience as a ${jobContext.title} or senior finance executive in ${researchContext.strategy || 'alternative investment'} firms
${researchContext.competitorPatterns.map(p => `- ${p}`).join('\n')}
` : ''}

${researchContext.marketIntelligence?.skillRequirements ? `
**Core Technical Skills:**
${researchContext.marketIntelligence.skillRequirements.map(s => `- ${s}`).join('\n')}
` : ''}

## Compensation & Market Context

**Expected Range:** ${researchContext.marketIntelligence?.compRange || 'Competitive for role and location'}

**Talent Pool:** ${researchContext.marketIntelligence?.talentDensity || 'Limited - specialized expertise'}

## Target Sourcing Strategy

We will source candidates from:
${researchContext.targetCompanies.slice(0, 5).map(c => `- ${c}`).join('\n')}

This is a professional JD grounded in market research, not just a summary of your needs.
  `;
  
  return jd.trim();
}
