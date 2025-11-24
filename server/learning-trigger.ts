/**
 * LEARNING TRIGGER WRAPPER
 * Single integration point for sourcing completion
 * Call this when any sourcing run completes (sync or async)
 */

import { onSourceRunComplete } from "./learning-hooks";

export async function triggerLearningOnSourcingComplete(jobId: number) {
  try {
    console.log(`📚 [Learning Trigger] Job #${jobId} sourcing complete - collecting intelligence...`);
    await onSourceRunComplete(jobId);
    console.log(`✅ [Learning Trigger] Intelligence collected for job #${jobId}`);
  } catch (error) {
    // Non-blocking - log but don't break sourcing flow
    console.log(`⚠️ [Learning Trigger] Collection skipped:`, (error as any)?.message);
  }
}
