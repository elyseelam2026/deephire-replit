/**
 * NAP-DRIVEN SEARCH STRATEGY ENGINE
 * Converts Need/Authority/Pain into targeted LinkedIn search queries and fit scoring rubric
 * Based on exec search best practices: Pain-driven sourcing beats keyword matching
 */

export interface NAP {
  need: string;       // Core role requirements (e.g., "Financial strategy & reporting")
  authority: string;  // Reporting structure (e.g., "CEO/Board")
  pain: string;       // Business challenge/urgency (e.g., "Stability risk post-M&A")
}

export interface SearchStrategy {
  keywords: string;               // Boolean LinkedIn query
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
 */
export function generateSearchStrategy(
  nap: NAP, 
  baseContext: {title: string; location?: string; industry?: string}
): SearchStrategy {
  const {need, authority, pain} = nap;
  const {title, location, industry} = baseContext;
  
  // STEP 1: Extract pain keywords for Boolean query
  const painKeywords = extractPainKeywords(pain);
  const roleConfig = ROLE_EXPERIENCE_MAP[title] || {minYears: 5, industries: [], competencies: []};
  
  // STEP 2: Build Boolean LinkedIn query
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
  
  const searchRationale = `**Why this search strategy:**\n\n` +
    `1. **Pain-Driven**: Targeting candidates who've solved "${pain}" challenges (keywords: ${painKeywords.slice(0,3).join(", ")})\n` +
    `2. **Need Match**: Focusing on ${title}s with ${needKeywords.slice(0,2).join(" + ")} experience\n` +
    `3. **Authority Fit**: ${authority}-level professionals (${filters.seniorityLevel?.join(", ")})\n` +
    `4. **Industry**: ${filters.industry.join(", ")} backgrounds most relevant to your context\n` +
    `5. **Quality Bar**: ${roleConfig.minYears}+ years experience minimum\n\n` +
    `This targeted approach delivers 8-12 high-fit candidates vs. 20-30 generic profiles.`;
  
  return {
    keywords: booleanQuery,
    filters,
    exclusions,
    prioritySignals,
    napSummary,
    searchRationale
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
  return [...new Set(keywords)];
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
