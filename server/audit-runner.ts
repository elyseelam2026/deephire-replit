/**
 * Audit Runner
 * 
 * Orchestrates the full data quality audit cycle:
 * 1. Run validation rules
 * 2. Attempt AI remediation
 * 3. Queue items for manual intervention
 * 4. Generate reports
 */

import { db } from './db';
import { auditRuns, auditIssues, manualInterventionQueue } from '../shared/schema';
import { runDataQualityInspection, type ValidationReport } from './data-quality-inspector';
import { remediateIssue } from './ai-remediation-engine';
import { sql } from 'drizzle-orm';
import type { AuditIssue } from '../shared/schema';

interface AuditRunSummary {
  auditRunId: number;
  totalIssues: number;
  errors: number;
  warnings: number;
  info: number;
  autoFixed: number;
  flaggedForReview: number;
  manualQueue: number;
  dataQualityScore: number;
  executionTimeMs: number;
  report: ValidationReport;
}

/**
 * Main entry point: Run full audit cycle
 */
export async function runFullAudit(): Promise<AuditRunSummary> {
  const startTime = Date.now();
  
  console.log('\n' + '='.repeat(80));
  console.log('🔍 STARTING DATA QUALITY AUDIT');
  console.log('='.repeat(80) + '\n');
  
  // Create audit run record
  const [auditRun] = await db.insert(auditRuns)
    .values({
      status: 'running',
      startedAt: sql`now()`
    })
    .returning();
  
  console.log(`📋 Audit Run ID: ${auditRun.id}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}\n`);
  
  try {
    // STEP 1: Run validation rules
    console.log('STEP 1: Running validation rules...\n');
    const report = await runDataQualityInspection();
    
    // Categorize issues by priority
    const priorityMap: Record<string, string> = {
      'error': 'P0',
      'warning': 'P1',
      'info': 'P2'
    };
    
    // STEP 2: Save issues to database
    console.log('\nSTEP 2: Saving issues to database...\n');
    const savedIssues: AuditIssue[] = [];
    
    for (const issue of report.issues) {
      const [savedIssue] = await db.insert(auditIssues)
        .values({
          auditRunId: auditRun.id,
          ruleName: issue.rule,
          severity: issue.severity,
          priority: priorityMap[issue.severity],
          issueType: determineIssueType(issue.rule),
          entityType: issue.entity,
          entityId: typeof issue.entityId === 'number' ? issue.entityId : parseInt(issue.entityId as string),
          entityDescription: `${issue.entity} #${issue.entityId}`,
          description: issue.message,
          suggestedFix: issue.suggestedFix || null,
          status: 'pending',
          aiAttempted: false
        })
        .returning();
      
      savedIssues.push(savedIssue);
    }
    
    console.log(`✅ Saved ${savedIssues.length} issues to database\n`);
    
    // STEP 3: AI Remediation (only high-priority issues for now)
    console.log('STEP 3: Attempting AI remediation...\n');
    
    let autoFixed = 0;
    let flaggedForReview = 0;
    let queuedForManual = 0;
    
    const highPriorityIssues = savedIssues.filter(i => 
      i.priority === 'P0' || i.priority === 'P1'
    );
    
    for (const issue of highPriorityIssues) {
      try {
        // Mark as attempted
        await db.update(auditIssues)
          .set({ aiAttempted: true })
          .where(sql`id = ${issue.id}`);
        
        // Attempt remediation
        const result = await remediateIssue(issue);
        
        if (result.outcome === 'success') {
          // Auto-fixed successfully
          await db.update(auditIssues)
            .set({ 
              status: 'auto_fixed',
              resolvedBy: 'ai_auto',
              resolvedAt: sql`now()`,
              resolutionNotes: result.reasoning
            })
            .where(sql`id = ${issue.id}`);
          
          autoFixed++;
          console.log(`  ✅ Auto-fixed: ${issue.description.substring(0, 80)}...`);
          
        } else if (result.outcome === 'applied_with_flag') {
          // Applied but needs verification
          await db.update(auditIssues)
            .set({ 
              status: 'auto_fixed',
              resolvedBy: 'ai_auto',
              resolvedAt: sql`now()`,
              resolutionNotes: `⚠️ ${result.reasoning} (verify recommended)`
            })
            .where(sql`id = ${issue.id}`);
          
          flaggedForReview++;
          console.log(`  ⚠️  Applied (needs review): ${issue.description.substring(0, 80)}...`);
          
        } else if (result.outcome === 'needs_review') {
          // Queue for manual intervention
          await db.update(auditIssues)
            .set({ status: 'queued' })
            .where(sql`id = ${issue.id}`);
          
          await db.insert(manualInterventionQueue)
            .values({
              issueId: issue.id,
              priority: issue.priority,
              status: 'pending',
              aiSuggestions: result.proposedFix,
              aiReasoning: result.reasoning,
              slaDeadline: calculateSlaDeadline(issue.priority)
            });
          
          queuedForManual++;
          console.log(`  👤 Queued for manual: ${issue.description.substring(0, 80)}...`);
        }
        
      } catch (error) {
        console.error(`  ❌ Failed to remediate issue #${issue.id}:`, error);
      }
    }
    
    // Low-priority issues go straight to queue (don't waste AI credits)
    const lowPriorityIssues = savedIssues.filter(i => i.priority === 'P2');
    for (const issue of lowPriorityIssues) {
      await db.update(auditIssues)
        .set({ status: 'queued' })
        .where(sql`id = ${issue.id}`);
      
      await db.insert(manualInterventionQueue)
        .values({
          issueId: issue.id,
          priority: issue.priority,
          status: 'pending',
          aiReasoning: 'Low priority - queued without AI attempt to save costs',
          slaDeadline: calculateSlaDeadline(issue.priority)
        });
      
      queuedForManual++;
    }
    
    // STEP 4: Calculate data quality score
    const dataQualityScore = calculateDataQualityScore(report, autoFixed);
    
    // STEP 5: Update audit run with results
    const executionTime = Date.now() - startTime;
    
    await db.update(auditRuns)
      .set({
        status: 'completed',
        completedAt: sql`now()`,
        totalIssues: report.totalIssues,
        errors: report.errors,
        warnings: report.warnings,
        info: report.info,
        autoFixed,
        flaggedForReview,
        manualQueue: queuedForManual,
        dataQualityScore,
        executionTimeMs: executionTime
      })
      .where(sql`id = ${auditRun.id}`);
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 AUDIT COMPLETE');
    console.log('='.repeat(80));
    console.log(`✅ Total Issues: ${report.totalIssues}`);
    console.log(`   🔴 Errors (P0): ${report.errors}`);
    console.log(`   🟡 Warnings (P1): ${report.warnings}`);
    console.log(`   🔵 Info (P2): ${report.info}`);
    console.log('');
    console.log(`🤖 AI Remediation:`);
    console.log(`   ✅ Auto-fixed: ${autoFixed}`);
    console.log(`   ⚠️  Flagged for review: ${flaggedForReview}`);
    console.log(`   👤 Manual queue: ${queuedForManual}`);
    console.log('');
    console.log(`📈 Data Quality Score: ${dataQualityScore}/100`);
    console.log(`⏱️  Execution Time: ${(executionTime / 1000).toFixed(2)}s`);
    console.log('='.repeat(80) + '\n');
    
    return {
      auditRunId: auditRun.id,
      totalIssues: report.totalIssues,
      errors: report.errors,
      warnings: report.warnings,
      info: report.info,
      autoFixed,
      flaggedForReview,
      manualQueue: queuedForManual,
      dataQualityScore,
      executionTimeMs: executionTime,
      report
    };
    
  } catch (error) {
    // Mark audit as failed
    await db.update(auditRuns)
      .set({
        status: 'failed',
        completedAt: sql`now()`,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })
      .where(sql`id = ${auditRun.id}`);
    
    throw error;
  }
}

/**
 * Determine issue type from rule name
 */
function determineIssueType(ruleName: string): string {
  const typeMap: Record<string, string> = {
    'CANDIDATE_COMPANY_LINK': 'missing_link',
    'CAREER_HISTORY_LINKS': 'missing_link',
    'DUPLICATE_COMPANIES': 'duplicate',
    'REQUIRED_FIELDS': 'missing_data',
    'JOB_CANDIDATE_INTEGRITY': 'orphaned_record',
    'COMPANY_DATA_QUALITY': 'missing_data'
  };
  
  return typeMap[ruleName] || 'other';
}

/**
 * Calculate SLA deadline based on priority
 */
function calculateSlaDeadline(priority: string): Date {
  const now = new Date();
  
  switch (priority) {
    case 'P0': // Critical - 4 hours
      return new Date(now.getTime() + 4 * 60 * 60 * 1000);
    case 'P1': // Important - 24 hours
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    case 'P2': // Nice-to-have - 7 days
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }
}

/**
 * Calculate overall data quality score
 * 
 * Formula:
 * - Start with 100
 * - Subtract points for issues
 * - Add points back for auto-fixes
 */
function calculateDataQualityScore(report: ValidationReport, autoFixed: number): number {
  let score = 100;
  
  // Deduct points for issues
  score -= report.errors * 10; // P0 errors: -10 points each
  score -= report.warnings * 3; // P1 warnings: -3 points each
  score -= report.info * 0.5; // P2 info: -0.5 points each
  
  // Add points back for auto-fixes (recovery credit)
  score += autoFixed * 2; // +2 points for each auto-fix
  
  // Clamp to 0-100 range
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Generate CSV report for download
 */
export async function generateCsvReport(auditRunId: number): Promise<string> {
  const issues = await db.select()
    .from(auditIssues)
    .where(sql`audit_run_id = ${auditRunId}`);
  
  const rows = [
    ['Issue ID', 'Priority', 'Entity', 'Type', 'Description', 'Status', 'Resolved By', 'Suggested Fix'].join(',')
  ];
  
  for (const issue of issues) {
    rows.push([
      issue.id,
      issue.priority,
      `${issue.entityType} #${issue.entityId}`,
      issue.issueType,
      `"${issue.description}"`,
      issue.status,
      issue.resolvedBy || 'Pending',
      `"${issue.suggestedFix || ''}"`
    ].join(','));
  }
  
  return rows.join('\n');
}
