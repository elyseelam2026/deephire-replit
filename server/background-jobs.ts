import { storage } from './storage';
import { parseCandidateFromUrl } from './ai';
import { duplicateDetectionService } from './duplicate-detection';
import type { DataIngestionJob } from '@shared/schema';

// Background job queue system for processing bulk URL uploads
interface BulkUrlJob {
  id: number;
  jobId: number;
  urls: string[];
  batchSize: number;
  concurrency: number;
}

// In-memory job queue (in production, use Redis/Bull/etc)
const jobQueue: BulkUrlJob[] = [];
const processingJobs = new Map<number, boolean>();

// Process a batch of URLs concurrently
async function processBatch(urls: string[], ingestionJobId: number): Promise<{
  successCount: number;
  failedCount: number;
  duplicateCount: number;
  errors: string[];
}> {
  const results = await Promise.allSettled(
    urls.map(async (url) => {
      try {
        const candidateData = await parseCandidateFromUrl(url);
        
        if (!candidateData) {
          return { type: 'failed', error: `Failed to parse URL: ${url}` };
        }

        // Check for duplicates
        const duplicates = await duplicateDetectionService.findCandidateDuplicates(candidateData);
        
        if (duplicates.length > 0) {
          await duplicateDetectionService.detectCandidateDuplicates(
            candidateData, 
            ingestionJobId
          );
          return { type: 'duplicate', candidateData };
        } else {
          await storage.createCandidate(candidateData);
          return { type: 'success', candidateData };
        }
      } catch (error) {
        return { type: 'failed', error: `Error processing URL ${url}: ${error}` };
      }
    })
  );

  let successCount = 0;
  let failedCount = 0;
  let duplicateCount = 0;
  const errors: string[] = [];

  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      const value = result.value;
      if (value.type === 'success') {
        successCount++;
      } else if (value.type === 'duplicate') {
        duplicateCount++;
      } else if (value.type === 'failed') {
        failedCount++;
        errors.push(value.error || 'Unknown error');
      }
    } else {
      failedCount++;
      errors.push(`Promise rejection: ${result.reason || 'Unknown error'}`);
    }
  });

  return { successCount, failedCount, duplicateCount, errors };
}

// Process a bulk URL job in the background
async function processBulkUrlJob(job: BulkUrlJob): Promise<void> {
  console.log(`Starting background processing for job ${job.jobId} with ${job.urls.length} URLs`);
  
  try {
    // Mark job as processing
    processingJobs.set(job.jobId, true);
    
    await storage.updateIngestionJob(job.jobId, {
      status: 'processing',
      totalRecords: job.urls.length
    });

    let totalSuccessCount = 0;
    let totalFailedCount = 0;
    let totalDuplicateCount = 0;
    const allErrors: string[] = [];

    // Process URLs in batches
    for (let i = 0; i < job.urls.length; i += job.batchSize) {
      const batch = job.urls.slice(i, i + job.batchSize);
      console.log(`Processing batch ${Math.floor(i / job.batchSize) + 1}/${Math.ceil(job.urls.length / job.batchSize)} (${batch.length} URLs)`);
      
      const batchResults = await processBatch(batch, job.jobId);
      
      totalSuccessCount += batchResults.successCount;
      totalFailedCount += batchResults.failedCount;
      totalDuplicateCount += batchResults.duplicateCount;
      allErrors.push(...batchResults.errors);
      
      // Update progress
      const processedSoFar = Math.min(i + job.batchSize, job.urls.length);
      await storage.updateIngestionJob(job.jobId, {
        processedRecords: processedSoFar,
        successfulRecords: totalSuccessCount,
        duplicateRecords: totalDuplicateCount,
        errorRecords: totalFailedCount,
        errorDetails: allErrors.length > 0 ? JSON.stringify(allErrors.slice(0, 50)) : undefined // Limit error details
      });
    }

    // Mark job as completed
    await storage.updateIngestionJob(job.jobId, {
      status: 'completed',
      processedRecords: job.urls.length,
      successfulRecords: totalSuccessCount,
      duplicateRecords: totalDuplicateCount,
      errorRecords: totalFailedCount,
      errorDetails: allErrors.length > 0 ? JSON.stringify(allErrors.slice(0, 50)) : undefined
    });

    console.log(`Completed background processing for job ${job.jobId}: ${totalSuccessCount} success, ${totalDuplicateCount} duplicates, ${totalFailedCount} failures`);
    
  } catch (error) {
    console.error(`Error in background job processing for job ${job.jobId}:`, error);
    
    await storage.updateIngestionJob(job.jobId, {
      status: 'failed',
      errorDetails: JSON.stringify({ error: error instanceof Error ? error.message : String(error) })
    });
  } finally {
    processingJobs.delete(job.jobId);
  }
}

// Add a bulk URL job to the queue
export async function queueBulkUrlJob(
  jobId: number, 
  urls: string[], 
  options: { batchSize?: number; concurrency?: number } = {}
): Promise<void> {
  const job: BulkUrlJob = {
    id: Date.now(),
    jobId,
    urls,
    batchSize: options.batchSize || 10, // Process 10 URLs per batch
    concurrency: options.concurrency || 3 // 3 concurrent requests per batch
  };
  
  jobQueue.push(job);
  console.log(`Queued background job for ingestion job ${jobId} with ${urls.length} URLs`);
  
  // Start processing immediately (in production, use a proper job queue)
  setImmediate(() => processBulkUrlJob(job));
}

// Get job processing status
export function getJobProcessingStatus(jobId: number): boolean {
  return processingJobs.has(jobId);
}

// Get queue length
export function getQueueLength(): number {
  return jobQueue.length;
}