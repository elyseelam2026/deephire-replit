/**
 * NAP-DRIVEN SEARCH STRATEGY ENGINE
 * Converts Need/Authority/Pain into targeted LinkedIn search queries and fit scoring rubric
 * Based on exec search best practices: Pain-driven sourcing beats keyword matching
 * 
 * NEW: Integrates Grok-style competitor mapping for targeted searches
 */

import { buildTargetedSearchStrategy, type CompetitorFirm } from './competitor-mapping';

export interface NAP {
  need: string;       // Core role requirements (e.g., "Financial strategy & reporting")
  authority: string;  // Reporting structure (e.g., "CEO/Board")
  pain: string;       // Business challenge/urgency (e.g., "Stability risk post-M&A")
}

/**
 * Unified search context with both base fields and enriched NAP-derived data
 * Consolidates all context needed for dynamic search strategy generation
 */
export interface SearchContext {
  // Base fields (required)
  title: string;
  
  // Optional base fields
  location?: string;
  industry?: string;
  companyName?: string;
  companySize?: string;
  
  // NAP-derived enriched fields (optional)
  yearsExperience?: number;        // Actual years from NAP interview
  painPoints?: string;             // Detailed pain points from NAP
  urgency?: string;                // Business urgency from NAP
  successCriteria?: string;        // Success metrics from NAP
  mustHaveSignals?: string[];      // Must-have experience signals
  decisionMakerProfile?: string;   // Decision maker/authority profile
}

export interface SearchStrategy {
  keywords: string;               // Boolean LinkedIn query (generic fallback)
  filters: {
    experience: string;           // e.g., "10+ years"
    industry: string[];           // e.g., ["fintech", "tech"]
    location: string;             // e.g., "Hong Kong"
    companySize?: string;         // e.g., "501-5000"
    seniorityLevel?: string[];    // e.g., ["VP", "C-Suite"]
  };
  exclusions: string[];           // Companies/keywords to avoid
  prioritySignals: string[];      // Must-have indicators
  napSummary: string;             // Human-readable NAP interpretation
  searchRationale: string;        // WHY this strategy was chosen
  
  // NEW: Competitor mapping for targeted searches
  competitorMap?: CompetitorFirm[];     // 15-20 peer firms
  targetedQueries?: string[];           // One query per competitor (e.g., "Hillhouse" "CFO" 2025)
  useCompetitorMapping?: boolean;       // If true, use targetedQueries instead of keywords
  
  // NEW: Query decomposition - maps each search query to NAP signal + seniority
  queryDecomposition?: Array<{
    query: string;                // Actual search query
    signals: string[];            // NAP signals this query targets (e.g., "pain-driven", "competitor", "growth")
    seniorityTarget: string;      // Target seniority level for this query (e.g., "VP", "C-Suite", "IC")
    description: string;          // Human explanation of what this query finds
    dealBreakerExclusions?: string[]; // Deal-breakers to exclude from this query
  }>;
}

/**
 * Pain-to-Keywords Mapping (Executive Search Best Practices)
 * Maps business pain → relevant experience keywords for Boolean searches
 */
const PAIN_KEYWORD_MAP: Record<string, string[]> = {
  // Stability & Turnaround Pains
  stability: ["turnaround", "cost optimization", "cash flow", "post-M&A integration", "reorganization"],
  turnaround: ["restructuring", "cost reduction", "operational efficiency", "crisis management"],
  "post-M&A": ["integration", "post-merger", "acquisition integration", "synergy realization"],
  
  // Growth Pains
  growth: ["scaling", "fundraising", "IPO", "M&A", "international expansion"],
  scaling: ["hypergrowth", "rapid expansion", "infrastructure scaling", "team building"],
  fundraising: ["Series A", "Series B", "capital raise", "investor relations", "valuation"],
  IPO: ["public offering", "pre-IPO", "roadshow", "SEC compliance", "investor relations"],
  
  // Compliance & Risk Pains
  compliance: ["regulatory", "SOX", "HKEX", "audit", "risk management", "governance"],
  regulatory: ["compliance", "SEC", "FINRA", "regulatory reporting", "audit readiness"],
  
  // Tech/Digital Transformation Pains
  "digital transformation": ["technology adoption", "ERP", "cloud migration", "digital finance", "automation"],
  modernization: ["system upgrade", "legacy systems", "digital transformation", "process improvement"],
};

/**
 * Role-to-Experience Mapping
 * Maps role needs → minimum experience requirements
 */
const ROLE_EXPERIENCE_MAP: Record<string, {minYears: number; industries: string[]; competencies: string[]}> = {
  CFO: {
    minYears: 10,
    industries: ["finance", "banking", "fintech", "private equity", "venture capital"],
    competencies: ["financial strategy", "FP&A", "M&A", "capital raising", "board reporting"]
  },
  COO: {
    minYears: 10,
    industries: ["operations", "manufacturing", "logistics", "technology"],
    competencies: ["operational excellence", "supply chain", "process optimization", "scaling operations"]
  },
  CTO: {
    minYears: 8,
    industries: ["technology", "software", "fintech", "SaaS"],
    competencies: ["technical architecture", "engineering leadership", "product development", "cloud infrastructure"]
  },
  "VP Sales": {
    minYears: 7,
    industries: ["sales", "B2B", "enterprise", "SaaS"],
    competencies: ["revenue growth", "enterprise sales", "team building", "pipeline management"]
  },
  // Private Equity & Investment Banking Associate-level roles
  "Associate": {
    minYears: 2,
    industries: ["private equity", "investment banking", "venture capital", "asset management", "corporate finance"],
    competencies: ["financial modeling", "deal sourcing", "due diligence", "M&A", "valuation", "portfolio management", "LBO modeling", "pitch books"]
  },
  "Analyst": {
    minYears: 0,
    industries: ["investment banking", "private equity", "consulting", "venture capital", "hedge fund"],
    competencies: ["financial analysis", "Excel modeling", "PowerPoint", "due diligence", "market research", "data analysis"]
  },
  "Vice President": {
    minYears: 6,
    industries: ["private equity", "investment banking", "venture capital", "corporate development"],
    competencies: ["deal execution", "client management", "team leadership", "M&A", "fundraising", "portfolio management"]
  },
  "Principal": {
    minYears: 8,
    industries: ["private equity", "venture capital", "investment banking", "consulting"],
    competencies: ["deal origination", "investment strategy", "portfolio management", "team leadership", "M&A", "fundraising"]
  },
  "Managing Director": {
    minYears: 12,
    industries: ["private equity", "investment banking", "venture capital", "asset management"],
    competencies: ["client relationships", "deal origination", "fundraising", "M&A", "strategic leadership", "portfolio oversight"]
  }
};

/**
 * Generate pain-driven search strategy from NAP
 * NEW: Supports async competitor mapping for targeted searches
 * UPDATED: Uses unified SearchContext with NAP-derived enriched fields
 */
export async function generateSearchStrategy(
  nap: NAP, 
  searchContext: SearchContext
): Promise<SearchStrategy> {
  const {need, authority, pain} = nap;
  const {
    title, 
    location, 
    industry, 
    companyName, 
    companySize,
    // NAP-derived enriched fields
    yearsExperience,
    painPoints,
    urgency,
    successCriteria,
    mustHaveSignals,
    decisionMakerProfile
  } = searchContext;
  
  // STEP 0: Check if we should use competitor mapping (NEW!)
  // Use competitor mapping when:
  // 1. Company name is provided
  // 2. Industry is known (required for peer firm identification)
  // 3. Role is executive-level (CFO, VP, Director, etc.)
  let competitorStrategy: {
    competitorMap: CompetitorFirm[];
    targetedQueries: string[];
  } | null = null;
  
  // Helper: Check if title is executive-level (case-insensitive, handles variants)
  const isExecutiveTitle = (title: string): boolean => {
    const titleLower = title.toLowerCase().trim();
    
    // C-Suite titles
    if (titleLower.includes('cfo') || titleLower.includes('chief financial')) return true;
    if (titleLower.includes('coo') || titleLower.includes('chief operating')) return true;
    if (titleLower.includes('cto') || titleLower.includes('chief technology')) return true;
    if (titleLower.includes('cmo') || titleLower.includes('chief marketing')) return true;
    if (titleLower.includes('cpo') || titleLower.includes('chief product')) return true;
    if (titleLower.includes('chief')) return true; // Any "Chief" title
    
    // VP and above
    if (titleLower.includes('vp') || titleLower.includes('vice president')) return true;
    if (titleLower.includes('svp') || titleLower.includes('senior vice president')) return true;
    if (titleLower.includes('evp') || titleLower.includes('executive vice president')) return true;
    
    // Director and above
    if (titleLower.includes('director')) return true;
    
    // PE/VC/IB specific titles
    if (titleLower.includes('principal')) return true;
    if (titleLower.includes('managing director') || titleLower.includes('md')) return true;
    if (titleLower.includes('partner')) return true;
    
    // Head of roles (typically VP-level)
    if (titleLower.includes('head of')) return true;
    
    return false;
  };
  
  const shouldUseCompetitorMapping = Boolean(
    companyName && 
    industry && 
    isExecutiveTitle(title)
  );
  
  if (shouldUseCompetitorMapping) {
    try {
      console.log(`\n🎯 [Competitor Mapping] Enabled for "${title}" at "${companyName}"`);
      const targetedStrategy = await buildTargetedSearchStrategy(
        {
          name: companyName!,
          industry: industry!,
          size: companySize,
          region: location,
        },
        title
      );
      
      competitorStrategy = {
        competitorMap: targetedStrategy.competitorMap,
        targetedQueries: targetedStrategy.searchQueries
      };
      
      console.log(`✅ [Competitor Mapping] Generated ${competitorStrategy.competitorMap.length} peer firms`);
    } catch (error) {
      console.error('⚠️ [Competitor Mapping] Failed, falling back to Boolean search:', error);
      competitorStrategy = null;
    }
  }
  
  // STEP 1: Extract pain keywords for Boolean query (FALLBACK)
  const painKeywords = extractPainKeywords(pain);
  const roleConfig = ROLE_EXPERIENCE_MAP[title] || {minYears: 5, industries: [], competencies: []};
  
  // STEP 2: Build Boolean LinkedIn query (FALLBACK when competitor mapping not available)
  // Example: "(CFO OR \"Chief Financial Officer\") AND (M&A OR scaling) AND (fintech OR tech) AND \"United States\""
  const titleVariants = getTitleVariants(title);
  const needKeywords = extractNeedKeywords(need, roleConfig.competencies);
  
  const booleanQuery = [
    `(${titleVariants.join(" OR ")})`,                    // Title variants
    painKeywords.length > 0 ? `AND (${painKeywords.join(" OR ")})` : "",  // Pain-specific experience
    needKeywords.length > 0 ? `AND (${needKeywords.join(" OR ")})` : "",  // Need-specific competencies
    location ? `AND "${location}"` : ""                     // Location
  ].filter(Boolean).join(" ");
  
  // STEP 3: Define filters
  const filters = {
    experience: `${roleConfig.minYears}+ years`,
    industry: determineTargetIndustries(industry, pain, roleConfig.industries),
    location: location || "Global",
    companySize: determineCompanySize(pain),
    seniorityLevel: determineSeniorityLevel(title, authority)
  };
  
  // STEP 4: Define exclusions (avoid noise)
  const exclusions = [
    "intern", "junior", "assistant", "coordinator",  // Junior roles
    "intern OR junior OR assistant"                   // Boolean exclusion
  ];
  
  // STEP 5: Priority signals (must-haves for high-quality matches)
  const prioritySignals = [
    ...painKeywords.slice(0, 2),                      // Top 2 pain keywords
    ...roleConfig.competencies.slice(0, 3),           // Top 3 role competencies
    `${roleConfig.minYears}+ years experience`,       // Minimum exp
  ];
  
  // STEP 6: Human-readable summary
  const napSummary = `**Need**: ${need}\n**Authority**: ${authority}\n**Pain**: ${pain}`;
  
  // Build search rationale - different messaging for competitor mapping vs. Boolean
  // CRITICAL: Use context-first values with structured fallbacks to ensure accuracy
  
  // Normalize years to number (handle "12+" string formats)
  // OMIT years entirely if not provided (don't fall back to roleConfig defaults)
  const normalizedYears = typeof yearsExperience === 'number' 
    ? yearsExperience 
    : yearsExperience && typeof yearsExperience === 'string'
      ? parseInt(String(yearsExperience).replace(/\D/g, ''), 10) || null
      : null;
  
  // Fix fallback chain: painPoints → pain (detailed NAP) → descriptive urgency
  // Guard against empty strings and generic urgency labels (case-insensitive)
  const hasDescriptivePain = painPoints && painPoints.trim().length > 0;
  const hasDescriptiveUrgency = urgency && urgency.trim().length > 0 && (() => {
    const normalized = urgency.trim().toLowerCase();
    return normalized !== 'high' && normalized !== 'medium' && normalized !== 'low' && normalized !== 'urgent';
  })();
  const actualPain = hasDescriptivePain ? painPoints : pain || (hasDescriptiveUrgency ? urgency : null);
  const actualSuccessCriteria = successCriteria || decisionMakerProfile || authority;
  
  let searchRationale: string;
  
  if (competitorStrategy && competitorStrategy.competitorMap.length > 0) {
    const firmCount = competitorStrategy.competitorMap.length;
    const topFirms = competitorStrategy.competitorMap.slice(0, 3).map(c => c.name).join(", ");
    
    // Build rationale points, conditionally including quality bar
    let points = [
      `1. **Targeted Firm Search**: Searching ${firmCount} peer firms of ${companyName} instead of random LinkedIn search`,
      `2. **Proven Talent Pools**: Targeting ${title}s at similar companies (${topFirms}...)`,
    ];
    if (actualPain) {
      points.push(`3. **Pain-Driven**: Prioritizing candidates who've solved "${actualPain}" challenges`);
    }
    points.push(`4. **Authority Fit**: ${actualSuccessCriteria}-level professionals${filters.seniorityLevel ? ` (${filters.seniorityLevel.join(", ")})` : ''}`);
    if (normalizedYears) {
      points.push(`5. **Quality Bar**: ${normalizedYears}+ years experience minimum`);
    }
    
    searchRationale = `**Why this search strategy (Competitor Mapping):**\n\n` +
      points.join('\n') + '\n\n' +
      `This Grok-style approach delivers 7-12 highly relevant matches vs. 20-30 generic profiles.`;
  } else if (competitorStrategy && competitorStrategy.competitorMap.length === 0) {
    // Guard against empty competitor map
    let points = [];
    if (actualPain) {
      points.push(`1. **Pain-Driven**: Targeting candidates who've solved "${actualPain}" challenges${painKeywords.length > 0 ? ` (keywords: ${painKeywords.slice(0,3).join(", ")})` : ''}`);
    }
    points.push(`2. **Need Match**: Focusing on ${title}s with ${needKeywords.slice(0,2).join(" + ")} experience`);
    points.push(`3. **Authority Fit**: ${actualSuccessCriteria}-level professionals${filters.seniorityLevel ? ` (${filters.seniorityLevel.join(", ")})` : ''}`);
    points.push(`4. **Industry**: ${filters.industry.join(", ")} backgrounds most relevant to your context`);
    if (normalizedYears) {
      points.push(`5. **Quality Bar**: ${normalizedYears}+ years experience minimum`);
    }
    
    searchRationale = `**Why this search strategy (Boolean Search fallback):**\n\n` +
      points.join('\n') + '\n\n' +
      `Note: Competitor mapping unavailable, using Boolean search instead.`;
  } else {
    let points = [];
    if (actualPain) {
      points.push(`1. **Business Challenge**: Target ${title}s who've managed "${actualPain}"${painKeywords.length > 0 ? ` (e.g., ${painKeywords.slice(0,2).join(", ")})` : ''}`);
    } else {
      points.push(`1. **Role Context**: Seeking ${title}-level talent for ${companyName || 'your organization'}`);
    }
    
    // Make Need Match distinct - focus on specific competencies, not just title
    const coreCompetency = needKeywords.slice(0,1).join("");
    const secondaryCompetency = needKeywords.slice(1,2).join("");
    if (coreCompetency && secondaryCompetency) {
      points.push(`2. **Must-Have Skills**: ${coreCompetency} + ${secondaryCompetency} expertise required`);
    } else if (coreCompetency) {
      points.push(`2. **Core Expertise**: Deep experience in ${coreCompetency}`);
    } else {
      points.push(`2. **Experience Profile**: Demonstrated success in similar roles`);
    }
    
    // Make Authority Fit about decision-making context, not just repeating title
    points.push(`3. **Decision Maker Fit**: Reports to ${actualSuccessCriteria || 'executive leadership'}${filters.seniorityLevel ? ` (${filters.seniorityLevel.join(", ")})` : ''}`);
    
    // Make Industry actionable - explain relevance, not just list
    points.push(`4. **Industry Focus**: ${filters.industry.length === 1 ? `Specialized in ${filters.industry[0]}` : `Cross-industry: ${filters.industry.slice(0,3).join(", ")}`} environments`);
    
    if (normalizedYears) {
      points.push(`5. **Experience Floor**: Minimum ${normalizedYears} years${normalizedYears >= 5 ? ' (demonstrated seniority)' : ' (core competency proven)'}`);
    }
    
    searchRationale = `**Why this search strategy (Boolean Search):**\n\n` +
      points.join('\n') + '\n\n' +
      `This targeted approach delivers 8-12 high-fit candidates vs. 20-30 generic profiles.`;
  }
  
  return {
    keywords: booleanQuery,
    filters,
    exclusions,
    prioritySignals,
    napSummary,
    searchRationale,
    
    // NEW: Competitor mapping fields
    competitorMap: competitorStrategy?.competitorMap,
    targetedQueries: competitorStrategy?.targetedQueries,
    useCompetitorMapping: Boolean(competitorStrategy)
  };
}

/**
 * Extract pain-relevant keywords from pain description
 */
function extractPainKeywords(pain: string): string[] {
  const painLower = pain.toLowerCase();
  const keywords: string[] = [];
  
  // Check each pain category
  for (const [category, terms] of Object.entries(PAIN_KEYWORD_MAP)) {
    if (painLower.includes(category)) {
      keywords.push(...terms);
    }
  }
  
  // Deduplicate
  return Array.from(new Set(keywords));
}

/**
 * Extract need-relevant competencies
 */
function extractNeedKeywords(need: string, roleCompetencies: string[]): string[] {
  const needLower = need.toLowerCase();
  return roleCompetencies.filter(comp => 
    needLower.includes(comp.toLowerCase().split(" ")[0]) // Match first word of competency
  );
}

/**
 * Get title variants for Boolean search
 */
function getTitleVariants(title: string): string[] {
  const variants: Record<string, string[]> = {
    "CFO": [`"Chief Financial Officer"`, "CFO", `"VP Finance"`, `"Finance Director"`],
    "COO": [`"Chief Operating Officer"`, "COO", `"VP Operations"`, `"Operations Director"`],
    "CTO": [`"Chief Technology Officer"`, "CTO", `"VP Engineering"`, `"Engineering Director"`],
    "VP Sales": [`"VP Sales"`, `"Vice President Sales"`, `"Head of Sales"`, `"Sales Director"`],
    // Private Equity & Investment Banking title variants
    "Associate": [
      `"Private Equity Associate"`, 
      `"PE Associate"`,
      `"Investment Banking Associate"`, 
      `"IB Associate"`,
      `"M&A Associate"`,
      `"Venture Capital Associate"`,
      `"VC Associate"`,
      "Associate"  // Unquoted fallback
    ],
    "Analyst": [
      `"Private Equity Analyst"`,
      `"PE Analyst"`,
      `"Investment Banking Analyst"`,
      `"IB Analyst"`,
      `"M&A Analyst"`,
      `"Venture Capital Analyst"`,
      `"VC Analyst"`,
      `"Financial Analyst"`,
      "Analyst"
    ],
    "Vice President": [
      `"Vice President"`,
      `"VP"`,
      `"Private Equity VP"`,
      `"Investment Banking VP"`,
      `"M&A VP"`,
      `"VC VP"`
    ],
    "Principal": [
      `"Principal"`,
      `"Private Equity Principal"`,
      `"PE Principal"`,
      `"Investment Principal"`,
      `"VC Principal"`
    ],
    "Managing Director": [
      `"Managing Director"`,
      `"MD"`,
      `"Private Equity MD"`,
      `"Investment Banking MD"`,
      `"M&A Managing Director"`
    ]
  };
  
  return variants[title] || [`"${title}"`];
}

/**
 * Determine target industries based on pain and context
 */
function determineTargetIndustries(baseIndustry?: string, pain?: string, roleIndustries?: string[]): string[] {
  const industries: Set<string> = new Set(roleIndustries || []);
  
  if (baseIndustry) industries.add(baseIndustry);
  
  // Pain-specific industry mapping
  if (pain?.toLowerCase().includes("fintech")) industries.add("fintech");
  if (pain?.toLowerCase().includes("tech")) industries.add("technology");
  if (pain?.toLowerCase().includes("m&a")) industries.add("private equity");
  
  return Array.from(industries);
}

/**
 * Determine optimal company size based on pain
 */
function determineCompanySize(pain?: string): string {
  if (!pain) return "101-5000";
  
  const painLower = pain.toLowerCase();
  
  if (painLower.includes("scaling") || painLower.includes("growth")) {
    return "51-500"; // Mid-stage companies with scaling experience
  }
  if (painLower.includes("enterprise") || painLower.includes("enterprise")) {
    return "501-5000"; // Larger companies
  }
  
  return "101-5000"; // Default range
}

/**
 * Determine seniority level from authority
 */
function determineSeniorityLevel(title: string, authority: string): string[] {
  const authorityLower = authority.toLowerCase();
  
  if (authorityLower.includes("ceo") || authorityLower.includes("board")) {
    return ["C-Suite", "VP"];
  }
  if (authorityLower.includes("vp") || authorityLower.includes("director")) {
    return ["VP", "Director", "Senior Manager"];
  }
  
  // Default based on title
  if (title.includes("CFO") || title.includes("COO") || title.includes("CTO")) {
    return ["C-Suite"];
  }
  if (title.includes("VP")) {
    return ["VP", "Director"];
  }
  
  return ["Senior", "Lead"];
}

/**
 * Calculate NAP fit score (0-10 rubric)
 * Evaluates how well a candidate matches the NAP requirements
 */
export function calculateNAPFit(
  candidate: {
    currentTitle?: string | null;
    currentCompany?: string | null;
    yearsExperience?: number | null;
    skills?: string[];
    careerHistory?: Array<{company: string; title: string}>;
    location?: string | null;
  },
  nap: NAP,
  searchStrategy: SearchStrategy
): {score: number; reasoning: string} {
  let score = 0;
  const reasons: string[] = [];
  
  // NEED MATCH (4 points): Does candidate have required competencies?
  const titleMatch = candidate.currentTitle && 
    searchStrategy.keywords.toLowerCase().includes(candidate.currentTitle.toLowerCase().split(" ")[0]);
  if (titleMatch) {
    score += 3;
    reasons.push(`✓ Title match: ${candidate.currentTitle}`);
  } else {
    score += 1; // Partial credit for related title
    reasons.push(`~ Partial title match`);
  }
  
  const skillMatch = candidate.skills?.some(skill => 
    searchStrategy.prioritySignals.some(signal => 
      signal.toLowerCase().includes(skill.toLowerCase())
    )
  );
  if (skillMatch) {
    score += 1;
    reasons.push(`✓ Key skills present`);
  }
  
  // PAIN SOLVER (4 points): Has candidate solved similar challenges?
  const painKeywords = extractPainKeywords(nap.pain);
  const hasPainExperience = candidate.skills?.some(skill =>
    painKeywords.some(kw => skill.toLowerCase().includes(kw.toLowerCase()))
  ) || candidate.careerHistory?.some(job => 
    painKeywords.some(kw => job.title.toLowerCase().includes(kw.toLowerCase()))
  );
  
  if (hasPainExperience) {
    score += 4;
    reasons.push(`✓ Pain solver: Direct experience with ${nap.pain.toLowerCase()}`);
  } else {
    score += 1; // Partial credit
    reasons.push(`~ Some relevant experience`);
  }
  
  // AUTHORITY FIT (2 points): Right seniority level?
  const hasRequiredExp = candidate.yearsExperience && 
    candidate.yearsExperience >= parseInt(searchStrategy.filters.experience);
  if (hasRequiredExp) {
    score += 2;
    reasons.push(`✓ Experience: ${candidate.yearsExperience}+ years`);
  }
  
  const reasoning = reasons.join(" • ");
  
  return {
    score: Math.min(score, 10),
    reasoning
  };
}
