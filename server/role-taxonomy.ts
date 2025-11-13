/**
 * ROLE TAXONOMY & SENIORITY FILTERING
 * 
 * Fixes the critical bug: Associates appearing in CFO searches
 * 
 * This module defines clear seniority levels and ensures that:
 * - CFO searches only return CFO/COO/VP Finance level candidates
 * - VP searches only return VP+ level candidates
 * - Associate searches only return Associate/Analyst level candidates
 * 
 * NO MORE JUNIOR CANDIDATES IN EXECUTIVE SEARCHES!
 */

export enum SeniorityLevel {
  // Junior levels (0-3 years)
  INTERN = 1,
  ANALYST = 2,
  ASSOCIATE = 3,
  
  // Mid levels (4-7 years)
  SENIOR_ASSOCIATE = 4,
  MANAGER = 5,
  SENIOR_MANAGER = 6,
  
  // Senior levels (8-11 years)
  DIRECTOR = 7,
  SENIOR_DIRECTOR = 8,
  VP = 9,
  
  // Executive levels (12+ years)
  SVP = 10,
  EVP = 11,
  C_SUITE = 12,
  
  // Special/Unknown
  UNKNOWN = 0
}

/**
 * Maps job titles to seniority levels
 * Uses fuzzy matching - if title contains these keywords, assign this level
 */
const TITLE_SENIORITY_MAP: Array<{keywords: string[]; level: SeniorityLevel}> = [
  // C-Suite (highest priority - check first)
  { keywords: ['chief executive officer', 'ceo'], level: SeniorityLevel.C_SUITE },
  { keywords: ['chief financial officer', 'cfo'], level: SeniorityLevel.C_SUITE },
  { keywords: ['chief operating officer', 'coo'], level: SeniorityLevel.C_SUITE },
  { keywords: ['chief technology officer', 'cto'], level: SeniorityLevel.C_SUITE },
  { keywords: ['chief marketing officer', 'cmo'], level: SeniorityLevel.C_SUITE },
  { keywords: ['chief product officer', 'cpo'], level: SeniorityLevel.C_SUITE },
  { keywords: ['chief', 'c-level'], level: SeniorityLevel.C_SUITE },
  { keywords: ['managing director', 'md', 'managing partner'], level: SeniorityLevel.C_SUITE },
  { keywords: ['general manager', 'gm'], level: SeniorityLevel.C_SUITE },
  
  // EVP/SVP
  { keywords: ['executive vice president', 'evp'], level: SeniorityLevel.EVP },
  { keywords: ['senior vice president', 'svp', 'senior vp'], level: SeniorityLevel.SVP },
  
  // VP Level
  { keywords: ['vice president', 'vp', 'v.p.'], level: SeniorityLevel.VP },
  { keywords: ['head of'], level: SeniorityLevel.VP }, // "Head of Sales" typically VP-level
  
  // Director Level
  { keywords: ['senior director'], level: SeniorityLevel.SENIOR_DIRECTOR },
  { keywords: ['director'], level: SeniorityLevel.DIRECTOR },
  { keywords: ['principal'], level: SeniorityLevel.DIRECTOR }, // PE/VC context
  
  // Manager Level
  { keywords: ['senior manager'], level: SeniorityLevel.SENIOR_MANAGER },
  { keywords: ['manager'], level: SeniorityLevel.MANAGER },
  { keywords: ['team lead', 'team leader'], level: SeniorityLevel.MANAGER },
  
  // Associate/Analyst Level (lowest priority)
  { keywords: ['senior associate'], level: SeniorityLevel.SENIOR_ASSOCIATE },
  { keywords: ['associate'], level: SeniorityLevel.ASSOCIATE },
  { keywords: ['analyst'], level: SeniorityLevel.ANALYST },
  { keywords: ['intern', 'internship'], level: SeniorityLevel.INTERN },
];

/**
 * Determine seniority level from job title
 * Uses keyword matching with priority order (C-Suite checked first)
 */
export function determineSeniorityLevel(title: string | null | undefined): SeniorityLevel {
  if (!title) return SeniorityLevel.UNKNOWN;
  
  const titleLower = title.toLowerCase().trim();
  
  // Check each keyword set in priority order
  for (const mapping of TITLE_SENIORITY_MAP) {
    for (const keyword of mapping.keywords) {
      if (titleLower.includes(keyword)) {
        return mapping.level;
      }
    }
  }
  
  return SeniorityLevel.UNKNOWN;
}

/**
 * Determine minimum acceptable seniority for a job posting
 * CFO → Only CFO/COO/VP Finance acceptable
 * VP → Only VP+ acceptable
 * Associate → Associate/Analyst acceptable
 */
export function getMinimumSeniorityForJob(jobTitle: string): SeniorityLevel {
  const jobLevel = determineSeniorityLevel(jobTitle);
  
  // For C-Suite jobs, accept VP or higher (some VPs can step into C-Suite)
  if (jobLevel === SeniorityLevel.C_SUITE) {
    return SeniorityLevel.VP; // Accept VP, SVP, EVP, C-Suite
  }
  
  // For VP jobs, accept Director or higher
  if (jobLevel >= SeniorityLevel.VP && jobLevel <= SeniorityLevel.SVP) {
    return SeniorityLevel.DIRECTOR;
  }
  
  // For Director jobs, accept Senior Manager or higher
  if (jobLevel >= SeniorityLevel.DIRECTOR && jobLevel <= SeniorityLevel.SENIOR_DIRECTOR) {
    return SeniorityLevel.SENIOR_MANAGER;
  }
  
  // For Manager jobs, accept Manager level
  if (jobLevel >= SeniorityLevel.MANAGER && jobLevel <= SeniorityLevel.SENIOR_MANAGER) {
    return SeniorityLevel.MANAGER;
  }
  
  // For Associate/Analyst jobs, accept Analyst or higher (but below Director)
  if (jobLevel >= SeniorityLevel.ANALYST && jobLevel <= SeniorityLevel.SENIOR_ASSOCIATE) {
    return SeniorityLevel.ANALYST;
  }
  
  // Unknown jobs - no filter
  return SeniorityLevel.UNKNOWN;
}

/**
 * Check if a candidate's seniority level is acceptable for a job
 * 
 * @param candidateTitle Candidate's current job title
 * @param jobTitle Job posting title
 * @returns true if candidate is senior enough for the job
 */
export function isSeniorityAcceptable(
  candidateTitle: string | null | undefined,
  jobTitle: string
): boolean {
  const candidateLevel = determineSeniorityLevel(candidateTitle);
  const minimumLevel = getMinimumSeniorityForJob(jobTitle);
  
  // If job has no seniority requirement (UNKNOWN), accept all
  if (minimumLevel === SeniorityLevel.UNKNOWN) {
    return true;
  }
  
  // Candidate must be at or above minimum level
  return candidateLevel >= minimumLevel;
}

/**
 * Filter candidates by seniority for a given job
 * Returns only candidates who are senior enough for the role
 * 
 * Logs excluded candidates for transparency
 */
export function filterCandidatesBySeniority<T extends { currentTitle: string | null | undefined }>(
  candidates: T[],
  jobTitle: string
): {accepted: T[]; rejected: T[]} {
  const minimumLevel = getMinimumSeniorityForJob(jobTitle);
  const jobLevel = determineSeniorityLevel(jobTitle);
  
  console.log(`\n🎯 [Seniority Filter] Job: "${jobTitle}" (Level: ${SeniorityLevel[jobLevel]}, Minimum: ${SeniorityLevel[minimumLevel]})`);
  
  const accepted: T[] = [];
  const rejected: T[] = [];
  
  for (const candidate of candidates) {
    const candidateLevel = determineSeniorityLevel(candidate.currentTitle);
    const isAcceptable = candidateLevel >= minimumLevel || minimumLevel === SeniorityLevel.UNKNOWN;
    
    if (isAcceptable) {
      accepted.push(candidate);
      console.log(`   ✅ ACCEPT: ${candidate.currentTitle} (Level: ${SeniorityLevel[candidateLevel]})`);
    } else {
      rejected.push(candidate);
      console.log(`   ❌ REJECT: ${candidate.currentTitle} (Level: ${SeniorityLevel[candidateLevel]}) - Too junior for ${SeniorityLevel[minimumLevel]}+ requirement`);
    }
  }
  
  console.log(`✅ [Seniority Filter] ${accepted.length} accepted, ${rejected.length} rejected`);
  
  return { accepted, rejected };
}

/**
 * Get human-readable seniority level name
 */
export function getSeniorityLevelName(level: SeniorityLevel): string {
  return SeniorityLevel[level];
}
