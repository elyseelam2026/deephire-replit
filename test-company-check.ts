import { db } from './server/db';
import { companies } from './shared/schema';
import { isNull } from 'drizzle-orm';

async function testCompanyCheck() {
  const allCompanies = await db.select()
    .from(companies)
    .where(isNull(companies.parentCompanyId));
  
  console.log('Total companies (no parent):', allCompanies.length);
  
  for (const company of allCompanies) {
    const missingInfo: string[] = [];
    if (!company.industry) missingInfo.push('industry');
    if (!company.location) missingInfo.push('location');
    if (!company.website) missingInfo.push('website');
    
    if (missingInfo.length >= 2) {
      console.log(`\n📋 Company: ${company.name} (ID: ${company.id})`);
      console.log(`   Missing: ${missingInfo.join(', ')}`);
      console.log(`   Industry: ${company.industry || 'NULL'}`);
      console.log(`   Location: ${company.location || 'NULL'}`);
      console.log(`   Website: ${company.website || 'NULL'}`);
    }
  }
}

testCompanyCheck().then(() => process.exit(0));
