/**
 * Run Data Quality Audit
 * 
 * Executes the full audit cycle and generates reports
 * Usage: npx tsx scripts/run-audit.ts
 */

import { runFullAudit, generateCsvReport } from '../server/audit-runner';
import { generateEmailReport, sendAuditEmail } from '../server/email-report-generator';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { db } from '../server/db';
import { auditRuns } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function main() {
  try {
    console.log('🚀 Initiating Data Quality Audit System...\n');
    
    // Run the full audit
    const summary = await runFullAudit();
    
    // Get the audit run from database
    const [auditRun] = await db.select()
      .from(auditRuns)
      .where(eq(auditRuns.id, summary.auditRunId));
    
    // Generate CSV report
    const csvContent = await generateCsvReport(summary.auditRunId);
    const reportPath = join(process.cwd(), `audit-report-${summary.auditRunId}.csv`);
    await writeFile(reportPath, csvContent);
    
    // Generate email report
    const emailReport = generateEmailReport(auditRun);
    const emailPath = join(process.cwd(), `email-report-${summary.auditRunId}.html`);
    await writeFile(emailPath, emailReport.htmlBody);
    
    console.log(`\n📄 Reports generated:`);
    console.log(`   CSV: ${reportPath}`);
    console.log(`   Email Preview: ${emailPath}`);
    
    console.log('\n📧 Email Report Preview:');
    console.log(emailReport.textBody);
    
    console.log('\n✨ Audit complete! Next steps:');
    console.log('   1. Review manual intervention queue');
    console.log('   2. Download CSV report for detailed analysis');
    console.log('   3. Address high-priority issues first');
    console.log('   4. View email report HTML for stakeholders\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Audit failed:', error);
    process.exit(1);
  }
}

main();
