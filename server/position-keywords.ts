/**
 * POSITION KEYWORDS INTELLIGENCE ENGINE
 * 
 * Maps job positions to typical keywords, certifications, skills
 * Learns and grows as more searches are conducted
 * Used to enhance boolean search queries
 */

import { db } from "./db";
import { positionKeywords } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

// DEFAULT POSITION KEYWORDS SEED DATA
export const DEFAULT_POSITION_KEYWORDS: Record<string, {
  keywords: string[];
  certifications: string[];
  skills: string[];
  industries: string[];
  seniority: string;
}> = {
  CFO: {
    keywords: ["CFO", "Chief Financial Officer", "VP Finance", "Finance Director", "Controller"],
    certifications: ["CPA", "ACCA", "CA", "CFA", "ACA"],
    skills: ["M&A", "FP&A", "Financial Strategy", "Treasury", "Tax Optimization", "Financial Reporting", "Board Reporting", "Capital Raising", "Cash Flow Management"],
    industries: ["Finance", "Private Equity", "Banking", "Fintech", "Venture Capital"],
    seniority: "C-Suite"
  },
  
  "VP Sales": {
    keywords: ["VP Sales", "Vice President Sales", "Sales Director", "Head of Sales", "Senior Sales Director"],
    certifications: ["Certified Sales Professional"],
    skills: ["Enterprise Sales", "Revenue Growth", "Team Building", "Pipeline Management", "Deal Closing", "Account Management", "Territory Management"],
    industries: ["Technology", "SaaS", "Enterprise", "B2B"],
    seniority: "VP"
  },
  
  CTO: {
    keywords: ["CTO", "Chief Technology Officer", "VP Engineering", "Engineering Director", "Head of Engineering"],
    certifications: ["AWS Certified", "GCP Certified"],
    skills: ["Technical Architecture", "Engineering Leadership", "Cloud Infrastructure", "Product Development", "Software Design", "DevOps"],
    industries: ["Technology", "Software", "Fintech", "SaaS"],
    seniority: "C-Suite"
  },
  
  "VP Operations": {
    keywords: ["VP Operations", "Vice President Operations", "Operations Director", "Head of Ops", "COO", "Chief Operating Officer"],
    certifications: ["Six Sigma", "Lean Management"],
    skills: ["Operational Excellence", "Supply Chain", "Process Optimization", "Scaling Operations", "Budget Management", "KPI Tracking"],
    industries: ["Operations", "Manufacturing", "Logistics", "Technology"],
    seniority: "VP"
  },
  
  "Associate": {
    keywords: ["Associate", "PE Associate", "IB Associate", "VC Associate", "Consultant"],
    certifications: [],
    skills: ["Financial Modeling", "Deal Sourcing", "Due Diligence", "M&A", "Valuation", "LBO Modeling", "Pitch Books", "Excel", "PowerPoint"],
    industries: ["Private Equity", "Investment Banking", "Venture Capital", "Asset Management"],
    seniority: "Associate"
  },
  
  "Analyst": {
    keywords: ["Analyst", "Junior Analyst", "Financial Analyst", "Data Analyst", "Research Analyst"],
    certifications: [],
    skills: ["Financial Analysis", "Excel Modeling", "PowerPoint", "Data Analysis", "Market Research", "Valuation", "Due Diligence"],
    industries: ["Investment Banking", "Private Equity", "Consulting", "Venture Capital"],
    seniority: "Analyst"
  },
  
  "Manager": {
    keywords: ["Manager", "Senior Manager", "Project Manager", "Product Manager", "Program Manager"],
    certifications: ["PMP", "Agile Certified"],
    skills: ["Team Leadership", "Project Management", "Stakeholder Management", "Budget Management", "Strategic Planning"],
    industries: ["Technology", "Consulting", "Operations"],
    seniority: "Manager"
  }
};

/**
 * Get keywords for a position
 * Queries database first, then falls back to seed data or fuzzy matching
 */
export async function getPositionKeywords(
  position: string
): Promise<{
  keywords: string[];
  certifications: string[];
  skills: string[];
  industries: string[];
  seniority: string;
}> {
  const normalized = position.trim();
  
  try {
    // 1. Try exact match in database
    const dbMatch = await db.query.positionKeywords.findFirst({
      where: eq(positionKeywords.position, normalized)
    });
    
    if (dbMatch) {
      console.log(`📚 [Keywords] Found in database: ${normalized}`);
      return {
        keywords: dbMatch.keywords || [],
        certifications: dbMatch.certifications || [],
        skills: dbMatch.skills || [],
        industries: dbMatch.industries || [],
        seniority: dbMatch.seniority || "Senior"
      };
    }
    
    // 2. Try fuzzy match in database
    const allPositions = await db.query.positionKeywords.findMany();
    for (const dbPos of allPositions) {
      if (normalized.toLowerCase().includes(dbPos.position.toLowerCase()) || 
          dbPos.position.toLowerCase().includes(normalized.toLowerCase())) {
        console.log(`📚 [Keywords] Fuzzy matched in database: ${normalized} → ${dbPos.position}`);
        return {
          keywords: dbPos.keywords || [],
          certifications: dbPos.certifications || [],
          skills: dbPos.skills || [],
          industries: dbPos.industries || [],
          seniority: dbPos.seniority || "Senior"
        };
      }
    }
  } catch (error) {
    console.warn(`⚠️ Database query failed, falling back to seed data:`, error);
  }
  
  // 3. Fall back to seed data
  if (DEFAULT_POSITION_KEYWORDS[normalized]) {
    console.log(`📚 [Keywords] Using seed data: ${normalized}`);
    return DEFAULT_POSITION_KEYWORDS[normalized];
  }
  
  // 4. Fuzzy match in seed data
  for (const [key, value] of Object.entries(DEFAULT_POSITION_KEYWORDS)) {
    if (normalized.toLowerCase().includes(key.toLowerCase()) || 
        key.toLowerCase().includes(normalized.toLowerCase())) {
      console.log(`📚 [Keywords] Fuzzy matched seed data: ${normalized} → ${key}`);
      return value;
    }
  }
  
  // 5. Default fallback for unknown positions
  console.log(`📚 [Keywords] Unknown position, creating default: ${normalized}`);
  return {
    keywords: [position],
    certifications: [],
    skills: [],
    industries: [],
    seniority: "Senior"
  };
}

/**
 * Learn from search: Update keyword intelligence after a search is executed
 * Increments searchCount, merges new keywords from actual search results
 */
export async function recordSearchForPosition(
  position: string,
  additionalKeywords?: string[]
): Promise<void> {
  const normalized = position.trim();
  console.log(`📚 [Learning] Recording search for position: ${normalized}`);
  if (additionalKeywords?.length) {
    console.log(`   New keywords discovered: ${additionalKeywords.join(', ')}`);
  }
  
  try {
    // Find existing entry
    const existing = await db.query.positionKeywords.findFirst({
      where: eq(positionKeywords.position, normalized)
    });
    
    if (existing) {
      // UPDATE: Increment searchCount + merge keywords
      const mergedSkills = Array.from(new Set([
        ...(existing.skills || []),
        ...(additionalKeywords || [])
      ]));
      
      await db.update(positionKeywords)
        .set({
          searchCount: sql`${positionKeywords.searchCount} + 1`,
          skills: mergedSkills,
          lastUpdated: new Date()
        })
        .where(eq(positionKeywords.position, normalized));
      
      console.log(`✅ [Learning] Updated: ${normalized} (searchCount++, merged ${additionalKeywords?.length || 0} new skills)`);
    } else {
      // INSERT: New entry from learned search
      await db.insert(positionKeywords).values({
        position: normalized,
        keywords: [position],
        certifications: [],
        skills: additionalKeywords || [],
        industries: [],
        seniority: "Unknown",
        source: "learned_from_search",
        searchCount: 1
      });
      
      console.log(`✅ [Learning] Created new entry: ${normalized} (source: learned_from_search)`);
    }
  } catch (error) {
    console.error(`❌ Failed to record search for position ${normalized}:`, error);
  }
}

/**
 * Build enhanced boolean search query with position keywords
 * Combines title variants + keywords + skills for comprehensive coverage
 */
export function buildKeywordEnrichedQuery(
  position: string,
  hardSkills: string[],
  keywords: {
    keywords: string[];
    certifications: string[];
    skills: string[];
    industries: string[];
  }
): string {
  // Start with title variants
  const titleVariants = keywords.keywords.map(k => `"${k}"`).join(" OR ");
  
  // Add hard skills provided by user
  const userSkills = hardSkills.map(s => `"${s}"` || s).join(" OR ");
  
  // Add typical position keywords
  const positionKeywordsList = keywords.skills.slice(0, 3).map(s => `"${s}"`).join(" OR ");
  
  // Certifications as optional qualifiers (lower weight)
  const certs = keywords.certifications.slice(0, 2).map(c => c).join(" OR ");
  
  // Build query: Title + (user skills OR position keywords) + location
  let query = `(${titleVariants})`;
  
  if (userSkills) {
    query += ` AND (${userSkills}`;
    if (positionKeywordsList) query += ` OR ${positionKeywordsList}`;
    query += `)`;
  }
  
  if (certs) {
    query += ` OR (${titleVariants} AND (${certs}))`;
  }
  
  return query;
}
