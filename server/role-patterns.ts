import { db } from "./db";
import { positionKeywords, industryLearning } from "@shared/schema";
import { eq, like } from "drizzle-orm";

/**
 * Extract learned patterns for a given role title from Learning System
 * E.g., "CFO" → returns typical skills, companies, years of experience from past hires
 */
export async function getRolePatterns(roleTitle: string) {
  try {
    const normalizedRole = roleTitle.toLowerCase().trim();
    
    // Query position keywords to find patterns for this role
    const roleData = await db.query.positionKeywords.findFirst({
      where: like(positionKeywords.position, `%${normalizedRole}%`)
    }).catch(() => null);
    
    if (!roleData) {
      return null; // No learned patterns for this role yet
    }
    
    return {
      role: roleData.position,
      searchCount: roleData.searchCount || 0,
      commonSkills: roleData.skills || [],
      commonKeywords: roleData.keywords || [],
      typicalSource: roleData.source || 'external',
      
      // Format for AI consumption
      summary: `Based on ${roleData.searchCount || 0} hires for "${roleData.position}":
- Typical Skills: ${(roleData.skills || []).slice(0, 5).join(', ')}
- Keywords: ${(roleData.keywords || []).slice(0, 3).join(', ')}`
    };
  } catch (error) {
    console.error('[Role Patterns] Error fetching patterns:', error);
    return null;
  }
}

/**
 * Get typical requirements for generic C-suite and executive roles
 * Used when user mentions CEO, CFO, COO, CIO, CHRO, CMO, etc.
 */
export const GENERIC_ROLE_TEMPLATES: Record<string, {
  title: string;
  typicalSkills: string[];
  typicalYearsExp: number;
  typicalResponsibilities: string[];
  deepDimensions: {
    growthPreference: string[];
    preferredCompanies: string[];
  };
  // Which NAP dimensions are ALREADY KNOWN for this role (skip asking about them)
  knownDimensions?: string[];
}> = {
  ceo: {
    title: "Chief Executive Officer",
    typicalSkills: ["P&L Management", "Strategic Planning", "Board Relations", "M&A", "Team Leadership"],
    typicalYearsExp: 12,
    typicalResponsibilities: [
      "Overall business strategy and execution",
      "Board management and stakeholder relations",
      "C-suite leadership and team building",
      "Financial performance and investor relations",
      "Culture and talent development"
    ],
    deepDimensions: {
      growthPreference: [],
      preferredCompanies: ["FAANG", "Fortune 500", "funded startups"]
    },
    knownDimensions: ["growthPreference"] // CEOs always lead teams
  },
  cfo: {
    title: "Chief Financial Officer",
    typicalSkills: ["FP&A", "SEC Compliance", "M&A", "Treasury", "Financial Controls", "IPO/Fundraising"],
    typicalYearsExp: 10,
    typicalResponsibilities: [
      "Financial planning and analysis",
      "SEC reporting and compliance",
      "M&A and capital allocation",
      "Treasury and risk management",
      "Accounting systems and controls",
      "Board reporting"
    ],
    deepDimensions: {
      growthPreference: [],
      preferredCompanies: ["Big 4", "Goldman Sachs", "McKinsey", "PE firms"]
    },
    knownDimensions: ["growthPreference"] // CFOs always manage teams
  },
  coo: {
    title: "Chief Operating Officer",
    typicalSkills: ["Operations", "Process Improvement", "Supply Chain", "Team Leadership", "P&L"],
    typicalYearsExp: 10,
    typicalResponsibilities: [
      "Daily operational execution",
      "Process optimization and efficiency",
      "Supply chain and logistics management",
      "Team structure and efficiency",
      "KPI tracking and improvement",
      "Cost management"
    ],
    deepDimensions: {
      growthPreference: [],
      preferredCompanies: ["Fortune 500", "logistics companies", "manufacturing"]
    },
    knownDimensions: ["growthPreference"] // COOs always build operational teams
  },
  cio: {
    title: "Chief Information Officer",
    typicalSkills: ["Infrastructure", "Cloud", "Cybersecurity", "ERP", "Digital Transformation", "Team Leadership"],
    typicalYearsExp: 12,
    typicalResponsibilities: [
      "IT strategy and roadmap",
      "Cybersecurity and risk management",
      "Cloud infrastructure and digital transformation",
      "ERP and systems implementation",
      "Vendor management",
      "IT team leadership"
    ],
    deepDimensions: {
      growthPreference: [],
      preferredCompanies: ["tech companies", "consulting firms", "product companies"]
    },
    knownDimensions: ["growthPreference"] // CIOs always lead IT teams
  },
  chro: {
    title: "Chief Human Resources Officer",
    typicalSkills: ["Talent Acquisition", "Compensation", "Culture", "Learning & Development", "Employment Law"],
    typicalYearsExp: 10,
    typicalResponsibilities: [
      "Talent acquisition and retention",
      "Compensation and benefits strategy",
      "Culture and engagement",
      "Learning and development programs",
      "Employee relations and compliance",
      "Organizational design"
    ],
    deepDimensions: {
      growthPreference: [],
      preferredCompanies: ["high-growth startups", "enterprise", "tech"]
    },
    knownDimensions: ["growthPreference"] // CHROs always build talent strategies
  },
  cmo: {
    title: "Chief Marketing Officer",
    typicalSkills: ["Brand Strategy", "Digital Marketing", "Product Marketing", "Analytics", "Team Leadership"],
    typicalYearsExp: 10,
    typicalResponsibilities: [
      "Brand strategy and positioning",
      "Digital marketing and demand generation",
      "Product marketing and go-to-market",
      "Analytics and attribution",
      "Marketing team leadership",
      "Budget management"
    ],
    deepDimensions: {
      growthPreference: [],
      preferredCompanies: ["SaaS", "tech", "consumer brands"]
    },
    knownDimensions: ["growthPreference"] // CMOs always lead marketing teams
  }
};

/**
 * Get template for a role (handles generic C-suite roles)
 * Falls back to Learning System patterns if available
 */
export function getRoleTemplate(roleTitle: string) {
  const normalized = roleTitle.toLowerCase().trim();
  
  for (const [key, template] of Object.entries(GENERIC_ROLE_TEMPLATES)) {
    if (normalized.includes(key)) {
      return template;
    }
  }
  
  return null; // Generic role, will use Learning System data
}

/**
 * Format role patterns into AI-friendly context
 */
export function formatRolePatternsForAI(roleTitle: string, patterns: any) {
  if (!patterns) return "";
  
  return `
**ROLE INTELLIGENCE (Based on Learning System):**
${patterns.summary}

When sourcing for this role, focus on:
- Target Companies: ${patterns.deepDimensions?.preferredCompanies?.join(', ') || 'Open to any'}
`;
}
