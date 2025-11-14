/**
 * Backfill Pricing Data for Legacy Jobs
 * 
 * This script updates existing jobs that were created before the pricing
 * integration to include basePlacementFee and recalculated estimatedPlacementFee.
 */

import { db } from "./db";
import { jobs } from "@shared/schema";
import { eq, isNull, or } from "drizzle-orm";
import { computeJobPricing } from "@shared/pricing";

async function backfillJobPricing() {
  console.log("🔄 Starting job pricing backfill...");
  
  // Find jobs with missing basePlacementFee
  const legacyJobs = await db
    .select()
    .from(jobs)
    .where(
      or(
        isNull(jobs.basePlacementFee),
        eq(jobs.basePlacementFee, 0)
      )
    );
  
  console.log(`📊 Found ${legacyJobs.length} legacy jobs to backfill`);
  
  let successCount = 0;
  let skipCount = 0;
  
  for (const job of legacyJobs) {
    try {
      // Extract salary from parsedData or estimate from estimatedPlacementFee
      let salary: number | null = null;
      
      if (job.parsedData) {
        const parsedData = job.parsedData as any;
        salary = parsedData.salary || 
                parsedData.salaryRangeMax || 
                parsedData.salaryRangeMin;
      }
      
      // If no salary in parsedData, try to reverse-engineer from estimatedPlacementFee
      if (!salary && job.estimatedPlacementFee && job.estimatedPlacementFee > 0) {
        // Estimate salary assuming default 20% fee and standard turnaround
        const feePercentage = job.searchTier === 'internal' ? 0.15 : 
                             job.searchTier === 'external' ? 0.25 : 0.20;
        const turnaroundMultiplier = job.turnaroundFeeMultiplier || 1.0;
        salary = Math.round(job.estimatedPlacementFee / (feePercentage * turnaroundMultiplier));
        console.log(`  ℹ️  Job #${job.id}: Reverse-engineered salary $${salary.toLocaleString()} from fee $${job.estimatedPlacementFee.toLocaleString()}`);
      }
      
      if (!salary || salary <= 0) {
        console.log(`  ⚠️  Job #${job.id}: Skipping (no salary data available)`);
        skipCount++;
        continue;
      }
      
      // Calculate pricing
      const pricing = computeJobPricing({
        salary,
        searchTier: job.searchTier as 'internal' | 'external' | null,
        urgency: job.urgency,
        overrideTurnaroundLevel: job.turnaroundLevel as 'standard' | 'express' | null
      });
      
      // Update job with calculated pricing
      await db
        .update(jobs)
        .set({
          basePlacementFee: pricing.basePlacementFee,
          estimatedPlacementFee: pricing.estimatedPlacementFee,
          turnaroundLevel: pricing.turnaroundLevel,
          turnaroundHours: pricing.turnaroundHours,
          turnaroundFeeMultiplier: pricing.turnaroundFeeMultiplier,
          updatedAt: new Date()
        })
        .where(eq(jobs.id, job.id));
      
      console.log(`  ✅ Job #${job.id}: Backfilled baseFee=$${pricing.basePlacementFee?.toLocaleString()}, estimatedFee=$${pricing.estimatedPlacementFee?.toLocaleString()}`);
      successCount++;
    } catch (error) {
      console.error(`  ❌ Job #${job.id}: Failed to backfill`, error);
    }
  }
  
  console.log("\n📈 Backfill Summary:");
  console.log(`  ✅ Successfully backfilled: ${successCount} jobs`);
  console.log(`  ⚠️  Skipped (no salary): ${skipCount} jobs`);
  console.log(`  📊 Total processed: ${legacyJobs.length} jobs`);
}

// Run backfill if executed directly
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  backfillJobPricing()
    .then(() => {
      console.log("\n✅ Backfill complete!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Backfill failed:", error);
      process.exit(1);
    });
}

export { backfillJobPricing };
