/**
 * Candidate Ingestion Pipeline
 * Parses LinkedIn profiles, handles duplicate detection, generates embeddings, and creates candidates
 */

import { db } from './db';
import { candidates, companies, type InsertCandidate } from '../shared/schema';
import { eq, and, sql, or } from 'drizzle-orm';
import type { LinkedInProfileData } from './brightdata';

export interface CandidateIngestionResult {
  success: boolean;
  candidateId?: number;
  isDuplicate: boolean;
  duplicateOf?: number;
  error?: string;
  candidateName?: string;
}

/**
 * Create candidate from LinkedIn profile data
 * Handles duplicate detection, data parsing, and embedding generation
 * 
 * @param profileData LinkedIn profile data from Bright Data
 * @param sourcingRunId ID of the sourcing run (for provenance tracking)
 * @param linkedinUrl Original LinkedIn URL
 * @returns Ingestion result with candidate ID or duplicate info
 */
export async function createCandidateFromLinkedInProfile(
  profileData: LinkedInProfileData,
  sourcingRunId: number,
  linkedinUrl: string
): Promise<CandidateIngestionResult> {
  try {
    console.log(`\n📝 [Candidate Ingestion] Processing: ${profileData.name || 'Unknown'}`);
    
    // Step 1: Parse profile data
    const parsedData = parseLinkedInProfile(profileData, linkedinUrl);
    
    if (!parsedData.firstName || !parsedData.lastName) {
      return {
        success: false,
        isDuplicate: false,
        error: 'Invalid profile data: missing name',
      };
    }
    
    // Step 2: Check for duplicates
    const duplicate = await findDuplicateCandidate(parsedData, linkedinUrl);
    
    if (duplicate) {
      console.log(`   ⚠️  Duplicate found: ${duplicate.firstName} ${duplicate.lastName} (ID: ${duplicate.id})`);
      return {
        success: false,
        isDuplicate: true,
        duplicateOf: duplicate.id,
        candidateName: `${duplicate.firstName} ${duplicate.lastName}`,
      };
    }
    
    // Step 3: Find or create company
    let companyId: number | null = null;
    if (parsedData.currentCompany) {
      companyId = await findOrCreateCompany(parsedData.currentCompany);
    }
    
    // Step 4: Build CV text
    const cvText = buildCvText(profileData);
    // Note: Embeddings will be generated in a background job later
    
    // Step 5: Create candidate record
    const candidateData: InsertCandidate = {
      // Name fields
      firstName: parsedData.firstName,
      lastName: parsedData.lastName,
      displayName: parsedData.name,
      
      // Contact
      linkedinUrl,
      email: parsedData.email || null,
      location: parsedData.location || null,
      
      // Current position
      currentTitle: parsedData.currentTitle || null,
      currentCompany: parsedData.currentCompany || null,
      currentCompanyId: companyId,
      
      // Profile content
      biography: profileData.about || null,
      cvText,
      skills: parsedData.skills || [],
      
      // Career history
      careerHistory: parsedData.careerHistory || [],
      education: parsedData.education || [],
      
      // Experience calculation
      yearsExperience: calculateYearsExperience(profileData.experience || []),
      
      // Provenance tracking (External sourcing metadata)
      sourceType: 'linkedin_scrape',
      sourcingRunId,
      externalSourceUrl: linkedinUrl,
      scrapedAt: new Date(),
      scrapingMethod: 'brightdata',
      
      // Embeddings (will be generated later by background job)
      cvEmbedding: null,
      embeddingGeneratedAt: null,
      embeddingModel: null,
      
      // Status
      candidateStatus: 'new',
      isAvailable: true,
      isOpenToOpportunities: true,
    };
    
    // DEBUG: Check for NaN values in integer fields
    const intFields = {
      currentCompanyId: candidateData.currentCompanyId,
      yearsExperience: candidateData.yearsExperience,
      sourcingRunId: candidateData.sourcingRunId,
    };
    for (const [key, val] of Object.entries(intFields)) {
      if (typeof val === 'number' && isNaN(val)) {
        console.error(`   ❌ [DEBUG] Field "${key}" is NaN!`);
      }
    }
    
    const [newCandidate] = await db
      .insert(candidates)
      .values([candidateData])
      .returning();
    
    console.log(`   ✅ Created candidate: ${newCandidate.firstName} ${newCandidate.lastName} (ID: ${newCandidate.id})`);
    
    return {
      success: true,
      candidateId: newCandidate.id,
      isDuplicate: false,
      candidateName: `${newCandidate.firstName} ${newCandidate.lastName}`,
    };
    
  } catch (error) {
    console.error('[Candidate Ingestion] Error:', error);
    return {
      success: false,
      isDuplicate: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Parse LinkedIn profile data into candidate fields
 */
function parseLinkedInProfile(
  profileData: LinkedInProfileData,
  linkedinUrl: string
): Partial<InsertCandidate> & { name?: string; careerHistory?: any[]; education?: any[] } {
  // Parse name
  const name = profileData.name || '';
  const nameParts = name.split(' ');
  const firstName = nameParts[0] || 'Unknown';
  const lastName = nameParts.slice(1).join(' ') || 'Unknown';
  
  // Parse location
  const location = profileData.city && profileData.country_code
    ? `${profileData.city}, ${profileData.country_code}`
    : profileData.city || profileData.country_code || null;
  
  // Parse current position
  const currentExperience = profileData.experience?.[0]; // First experience is usually current
  const currentTitle = currentExperience?.title || profileData.position || null;
  const currentCompany = currentExperience?.company || profileData.current_company_name || profileData.current_company || null;
  
  // Parse career history (matching the exact schema type)
  const careerHistory = profileData.experience?.map(exp => ({
    company: exp.company || 'Unknown',
    companyId: null as number | null | undefined,
    title: exp.title || 'Unknown',
    startDate: exp.start_date || '',
    endDate: exp.end_date || null,
    description: exp.description,
    location: exp.location,
  })) || [];
  
  // Parse education
  const education = profileData.education?.map(edu => ({
    institution: edu.school || 'Unknown',
    degree: edu.degree || null,
    graduationYear: edu.end_date ? parseInt(edu.end_date.split('-')[0]) : null,
    major: edu.field_of_study || null,
  })) || [];
  
  // Parse skills
  const skills = profileData.skills || [];
  
  return {
    name,
    firstName,
    lastName,
    location,
    currentTitle,
    currentCompany,
    skills,
    careerHistory,
    education,
  };
}

/**
 * Find duplicate candidate by LinkedIn URL or name + company
 */
async function findDuplicateCandidate(
  candidateData: Partial<InsertCandidate> & { name?: string },
  linkedinUrl: string
): Promise<{ id: number; firstName: string; lastName: string } | null> {
  // Check by LinkedIn URL (most reliable)
  const existingByUrl = await db
    .select({ id: candidates.id, firstName: candidates.firstName, lastName: candidates.lastName })
    .from(candidates)
    .where(
      and(
        eq(candidates.linkedinUrl, linkedinUrl),
        sql`${candidates.deletedAt} IS NULL`
      )
    )
    .limit(1);
  
  if (existingByUrl.length > 0) {
    return existingByUrl[0];
  }
  
  // Check by name + current company (less reliable but catches profiles with missing URLs)
  if (candidateData.firstName && candidateData.lastName && candidateData.currentCompany) {
    const existingByNameCompany = await db
      .select({ id: candidates.id, firstName: candidates.firstName, lastName: candidates.lastName })
      .from(candidates)
      .where(
        and(
          sql`LOWER(${candidates.firstName}) = LOWER(${candidateData.firstName})`,
          sql`LOWER(${candidates.lastName}) = LOWER(${candidateData.lastName})`,
          sql`LOWER(${candidates.currentCompany}) = LOWER(${candidateData.currentCompany})`,
          sql`${candidates.deletedAt} IS NULL`
        )
      )
      .limit(1);
    
    if (existingByNameCompany.length > 0) {
      return existingByNameCompany[0];
    }
  }
  
  return null;
}

/**
 * Find or create company by name
 */
async function findOrCreateCompany(companyName: string): Promise<number | null> {
  try {
    // Search for existing company (case-insensitive)
    const existing = await db
      .select({ id: companies.id })
      .from(companies)
      .where(sql`LOWER(${companies.name}) = LOWER(${companyName})`)
      .limit(1);
    
    if (existing.length > 0) {
      return existing[0].id;
    }
    
    // Create new company
    const [newCompany] = await db
      .insert(companies)
      .values({
        name: companyName,
        companyRole: ['sourcing'], // Mark as sourcing target
      })
      .returning({ id: companies.id });
    
    return newCompany.id;
    
  } catch (error) {
    console.error('[Company Lookup] Error:', error);
    return null;
  }
}

/**
 * Build searchable CV text from profile data
 */
function buildCvText(profileData: LinkedInProfileData): string {
  const sections: string[] = [];
  
  // Name
  if (profileData.name) {
    sections.push(`Name: ${profileData.name}`);
  }
  
  // Current position
  if (profileData.position) {
    sections.push(`Current Title: ${profileData.position}`);
  }
  
  if (profileData.current_company_name || profileData.current_company) {
    sections.push(`Current Company: ${profileData.current_company_name || profileData.current_company}`);
  }
  
  // Location
  if (profileData.city || profileData.country_code) {
    const location = [profileData.city, profileData.country_code].filter(Boolean).join(', ');
    sections.push(`Location: ${location}`);
  }
  
  // About
  if (profileData.about) {
    sections.push(`\nAbout:\n${profileData.about}`);
  }
  
  // Experience
  if (profileData.experience && profileData.experience.length > 0) {
    sections.push('\nExperience:');
    for (const exp of profileData.experience) {
      const expText = [
        exp.title,
        exp.company,
        exp.location,
        exp.start_date && exp.end_date ? `${exp.start_date} - ${exp.end_date}` : null,
        exp.description,
      ].filter(Boolean).join(' | ');
      sections.push(expText);
    }
  }
  
  // Education
  if (profileData.education && profileData.education.length > 0) {
    sections.push('\nEducation:');
    for (const edu of profileData.education) {
      const eduText = [
        edu.school,
        edu.degree,
        edu.field_of_study,
        edu.start_date && edu.end_date ? `${edu.start_date} - ${edu.end_date}` : null,
      ].filter(Boolean).join(' | ');
      sections.push(eduText);
    }
  }
  
  // Skills
  if (profileData.skills && profileData.skills.length > 0) {
    sections.push(`\nSkills: ${profileData.skills.join(', ')}`);
  }
  
  return sections.join('\n');
}

/**
 * Calculate years of experience from experience array
 */
function calculateYearsExperience(experience: Array<{ start_date?: string; end_date?: string }>): number | null {
  if (!experience || experience.length === 0) return null;
  
  try {
    let totalMonths = 0;
    
    for (const exp of experience) {
      if (!exp.start_date) continue;
      
      const startDate = new Date(exp.start_date);
      const endDate = exp.end_date ? new Date(exp.end_date) : new Date();
      
      // Validate both dates to prevent NaN
      if (isNaN(startDate.getTime())) continue;
      if (isNaN(endDate.getTime())) continue;
      
      const months = Math.max(0, 
        (endDate.getFullYear() - startDate.getFullYear()) * 12 +
        (endDate.getMonth() - startDate.getMonth())
      );
      
      totalMonths += months;
    }
    
    const years = Math.floor(totalMonths / 12);
    
    // Return null if calculation resulted in NaN or invalid value
    return isNaN(years) ? null : years;
    
  } catch (error) {
    console.error('[Experience Calculation] Error:', error);
    return null;
  }
}

/**
 * Batch create candidates from multiple LinkedIn profiles
 * Returns array of ingestion results
 */
export async function batchCreateCandidates(
  profiles: LinkedInProfileData[],
  sourcingRunId: number,
  profileUrls: string[]
): Promise<CandidateIngestionResult[]> {
  const results: CandidateIngestionResult[] = [];
  
  console.log(`\n🔄 [Batch Ingestion] Processing ${profiles.length} profiles`);
  
  for (let i = 0; i < profiles.length; i++) {
    const profile = profiles[i];
    const url = profileUrls[i] || profile.url || '';
    
    const result = await createCandidateFromLinkedInProfile(profile, sourcingRunId, url);
    results.push(result);
    
    // Small delay to avoid overwhelming the database
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  const successCount = results.filter(r => r.success).length;
  const duplicateCount = results.filter(r => r.isDuplicate).length;
  const errorCount = results.filter(r => !r.success && !r.isDuplicate).length;
  
  console.log(`\n✅ [Batch Ingestion] Complete:`);
  console.log(`   Created: ${successCount}`);
  console.log(`   Duplicates: ${duplicateCount}`);
  console.log(`   Errors: ${errorCount}`);
  
  return results;
}
