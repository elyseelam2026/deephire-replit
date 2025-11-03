/**
 * Migration Script: Link Candidates to Companies
 * 
 * This script:
 * 1. Finds all candidates with currentCompany text but no currentCompanyId
 * 2. Fuzzy matches company names against companies table
 * 3. Creates missing companies if needed
 * 4. Links candidates to companies via FK
 */

import { db } from '../server/db';
import { candidates, companies } from '../shared/schema';
import { eq, isNull, sql } from 'drizzle-orm';

// Fuzzy match company names (handles variations)
function fuzzyMatchCompany(candidateCompany: string, companyList: Array<{id: number, name: string}>) {
  const normalized = candidateCompany.toLowerCase().trim();
  
  // Exact match first
  let match = companyList.find(c => c.name.toLowerCase() === normalized);
  if (match) return match;
  
  // Partial match (e.g., "Blackstone" matches "Blackstone Management Partners")
  match = companyList.find(c => {
    const companyName = c.name.toLowerCase();
    return companyName.includes(normalized) || normalized.includes(companyName);
  });
  
  return match;
}

async function linkCandidatesToCompanies() {
  console.log('🔗 Starting candidate-company linking process...\n');
  
  // 1. Get all companies
  const allCompanies = await db.select({ id: companies.id, name: companies.name })
    .from(companies)
    .where(isNull(companies.parentCompanyId)); // Only HQ companies
  
  console.log(`Found ${allCompanies.length} companies in database\n`);
  
  // 2. Get candidates without company links
  const unlinkedCandidates = await db.select({
    id: candidates.id,
    firstName: candidates.firstName,
    lastName: candidates.lastName,
    currentCompany: candidates.currentCompany
  })
  .from(candidates)
  .where(
    sql`${candidates.currentCompany} IS NOT NULL AND ${candidates.currentCompanyId} IS NULL`
  );
  
  console.log(`Found ${unlinkedCandidates.length} candidates without company links\n`);
  
  let linkedCount = 0;
  let createdCount = 0;
  let skippedCount = 0;
  
  // 3. Process each candidate
  for (const candidate of unlinkedCandidates) {
    if (!candidate.currentCompany) continue;
    
    // Try to find matching company
    const match = fuzzyMatchCompany(candidate.currentCompany, allCompanies);
    
    if (match) {
      // Link to existing company
      await db.update(candidates)
        .set({ currentCompanyId: match.id })
        .where(eq(candidates.id, candidate.id));
      
      linkedCount++;
      console.log(`✅ Linked ${candidate.firstName} ${candidate.lastName} → ${match.name}`);
    } else {
      // Create new company
      const [newCompany] = await db.insert(companies)
        .values({
          name: candidate.currentCompany,
          industry: null,
          headquarters: null,
          companySize: null
        })
        .returning();
      
      // Link candidate to new company
      await db.update(candidates)
        .set({ currentCompanyId: newCompany.id })
        .where(eq(candidates.id, candidate.id));
      
      // Add to our list for future matches
      allCompanies.push({ id: newCompany.id, name: newCompany.name });
      
      createdCount++;
      console.log(`🆕 Created company "${newCompany.name}" and linked ${candidate.firstName} ${candidate.lastName}`);
    }
  }
  
  console.log('\n📊 Summary:');
  console.log(`   Linked to existing: ${linkedCount}`);
  console.log(`   Created new companies: ${createdCount}`);
  console.log(`   Skipped: ${skippedCount}`);
  console.log(`\n✨ Done!`);
}

// Run the script
linkCandidatesToCompanies()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
