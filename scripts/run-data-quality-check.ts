/**
 * Data Quality Inspector CLI
 * 
 * Run this script to check database data quality
 * Usage: npx tsx scripts/run-data-quality-check.ts
 */

import { runDataQualityInspection, printValidationReport } from '../server/data-quality-inspector';

async function main() {
  console.log('🚀 Starting Data Quality Inspection...\n');
  
  const report = await runDataQualityInspection();
  
  printValidationReport(report);
  
  // Exit with error code if there are critical errors
  if (report.errors > 0) {
    process.exit(1);
  }
  
  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Inspection failed:', error);
  process.exit(1);
});
