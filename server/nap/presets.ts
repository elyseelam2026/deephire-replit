/**
 * NAP Role Presets - Market defaults for auto-fill
 * Used when client provides minimal information or shows resistance
 * Based on "Dance, Don't Drill" Cooperation Radar auto-fill system
 */

export interface RolePreset {
  skills: string[];
  comp: {
    low: number;
    high: number;
    ote?: number; // For sales roles
  };
  exp_years: number;
  level: string;
  urgency_note?: string;
  culture_hints?: string[];
}

/**
 * Market benchmarks for common executive/senior roles
 * Based on PE-backed scale-up standards
 */
export const ROLE_PRESETS: Record<string, RolePreset> = {
  // C-Suite Roles
  "CFO": {
    skills: ["M&A", "FP&A", "Board reporting"],
    comp: { low: 350000, high: 500000 },
    exp_years: 12,
    level: "C-Suite",
    urgency_note: "High if fundraising or M&A pending",
    culture_hints: ["Strategic thinker", "PE/VC experience", "Hands-on during scale"],
  },
  
  "CTO": {
    skills: ["Engineering leadership", "Architecture", "Team scaling"],
    comp: { low: 400000, high: 600000 },
    exp_years: 10,
    level: "C-Suite",
    urgency_note: "Critical if product delays or tech debt",
    culture_hints: ["Technical depth", "Builder mentality", "Remote-friendly"],
  },
  
  "COO": {
    skills: ["Operations", "Process optimization", "Cross-functional leadership"],
    comp: { low: 350000, high: 550000 },
    exp_years: 12,
    level: "C-Suite",
    urgency_note: "High if scaling operations or inefficiencies",
    culture_hints: ["Systems thinker", "Execution focused", "Data-driven"],
  },
  
  "CMO": {
    skills: ["Growth marketing", "Brand strategy", "Product marketing"],
    comp: { low: 300000, high: 450000 },
    exp_years: 10,
    level: "C-Suite",
    urgency_note: "Critical if growth stalled",
    culture_hints: ["Creative + analytical", "Performance marketing", "Customer-centric"],
  },
  
  // VP-Level Roles
  "VP Sales": {
    skills: ["Enterprise sales", "ACV >$100k", "Team scaling"],
    comp: { low: 400000, high: 550000, ote: 600000 },
    exp_years: 10,
    level: "VP",
    urgency_note: "High if losing deals or pipeline weak",
    culture_hints: ["Hunter mentality", "SaaS metrics fluency", "Team builder"],
  },
  
  "VP Engineering": {
    skills: ["Engineering management", "Technical architecture", "Hiring/retention"],
    comp: { low: 350000, high: 500000 },
    exp_years: 10,
    level: "VP",
    urgency_note: "Critical if product velocity dropping",
    culture_hints: ["Technical credibility", "People leader", "Process builder"],
  },
  
  "VP Product": {
    skills: ["Product strategy", "Roadmap", "Cross-functional leadership"],
    comp: { low: 300000, high: 450000 },
    exp_years: 8,
    level: "VP",
    urgency_note: "High if product-market fit unclear",
    culture_hints: ["Customer obsessed", "Data informed", "Strategic"],
  },
  
  "VP Marketing": {
    skills: ["Demand generation", "Brand", "Product marketing"],
    comp: { low: 280000, high: 400000 },
    exp_years: 8,
    level: "VP",
    urgency_note: "High if CAC rising or awareness low",
    culture_hints: ["Growth hacker", "Creative", "ROI focused"],
  },
  
  // Director-Level Roles
  "Director of Engineering": {
    skills: ["Engineering management", "System design", "Team development"],
    comp: { low: 220000, high: 320000 },
    exp_years: 7,
    level: "Director",
    culture_hints: ["Technical leader", "Mentor", "Process champion"],
  },
  
  "Director of Sales": {
    skills: ["Sales management", "Enterprise deals", "Pipeline"],
    comp: { low: 200000, high: 300000, ote: 350000 },
    exp_years: 6,
    level: "Director",
    culture_hints: ["Quota crusher", "Metrics driven", "Player-coach"],
  },
  
  "Director of Product": {
    skills: ["Product management", "Analytics", "Stakeholder management"],
    comp: { low: 200000, high: 280000 },
    exp_years: 6,
    level: "Director",
    culture_hints: ["User focused", "Data driven", "Communicator"],
  },
};

/**
 * Fuzzy match role title to preset
 * Handles variations like "Chief Financial Officer" → "CFO"
 */
export function matchRolePreset(title: string): RolePreset | null {
  if (!title) return null;
  
  const normalized = title.toLowerCase().trim();
  
  // Direct matches
  for (const [presetName, preset] of Object.entries(ROLE_PRESETS)) {
    if (normalized.includes(presetName.toLowerCase())) {
      return preset;
    }
  }
  
  // Fuzzy matches
  const fuzzyMatches: Record<string, string> = {
    "chief financial": "CFO",
    "finance chief": "CFO",
    "chief technology": "CTO",
    "tech chief": "CTO",
    "chief operating": "COO",
    "operations chief": "COO",
    "chief marketing": "CMO",
    "marketing chief": "CMO",
    "vp of sales": "VP Sales",
    "sales vp": "VP Sales",
    "vp of eng": "VP Engineering",
    "engineering vp": "VP Engineering",
    "vp of product": "VP Product",
    "product vp": "VP Product",
    "vp of marketing": "VP Marketing",
    "marketing vp": "VP Marketing",
  };
  
  for (const [fuzzy, canonical] of Object.entries(fuzzyMatches)) {
    if (normalized.includes(fuzzy)) {
      return ROLE_PRESETS[canonical] || null;
    }
  }
  
  return null;
}

/**
 * Get industry-adjusted compensation
 * Some industries (fintech, crypto, AI) pay premiums
 */
export function adjustCompForIndustry(
  baseComp: { low: number; high: number },
  industry?: string
): { low: number; high: number } {
  if (!industry) return baseComp;
  
  const normalized = industry.toLowerCase();
  
  const premiumIndustries: Record<string, number> = {
    "fintech": 1.15,        // +15%
    "crypto": 1.20,         // +20%
    "ai": 1.18,             // +18%
    "saas": 1.05,           // +5%
    "ecommerce": 0.95,      // -5%
    "nonprofit": 0.75,      // -25%
  };
  
  for (const [ind, multiplier] of Object.entries(premiumIndustries)) {
    if (normalized.includes(ind)) {
      return {
        low: Math.round(baseComp.low * multiplier),
        high: Math.round(baseComp.high * multiplier),
      };
    }
  }
  
  return baseComp;
}

/**
 * Get stage-adjusted urgency
 * Earlier stages typically more urgent
 */
export function getStageUrgencyNote(funding?: string): string {
  if (!funding) return "Standard urgency";
  
  const normalized = funding.toLowerCase();
  
  if (normalized.includes("seed") || normalized.includes("pre-seed")) {
    return "High urgency - early stage velocity critical";
  }
  if (normalized.includes("series a")) {
    return "High urgency - scaling team for growth";
  }
  if (normalized.includes("series b")) {
    return "Medium-high urgency - building senior bench";
  }
  if (normalized.includes("series c") || normalized.includes("late stage")) {
    return "Medium urgency - strategic hire";
  }
  if (normalized.includes("pe") || normalized.includes("private equity")) {
    return "High urgency - PE-backed transformation";
  }
  
  return "Standard urgency";
}
