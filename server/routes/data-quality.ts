/**
 * Data Quality API Routes
 * 
 * Endpoints for data quality dashboard and manual intervention queue
 */

import { Router } from 'express';
import { db } from '../db';
import { auditRuns, auditIssues, manualInterventionQueue, remediationAttempts } from '../../shared/schema';
import { desc, eq, sql, and, isNull } from 'drizzle-orm';
import { runFullAudit, generateCsvReport } from '../audit-runner';
import { generateEmailReport } from '../email-report-generator';

const router = Router();

/**
 * GET /api/data-quality/dashboard
 * Returns overall data quality metrics
 */
router.get('/dashboard', async (req, res) => {
  try {
    // Get latest audit run
    const [latestRun] = await db.select()
      .from(auditRuns)
      .orderBy(desc(auditRuns.id))
      .limit(1);
    
    if (!latestRun) {
      return res.json({
        hasData: false,
        message: 'No audit runs yet. Run your first audit!'
      });
    }
    
    // Get previous run for trend comparison
    const [previousRun] = await db.select()
      .from(auditRuns)
      .where(sql`id < ${latestRun.id}`)
      .orderBy(desc(auditRuns.id))
      .limit(1);
    
    // Get manual queue stats
    const [queueStats] = await db.select({
      pending: sql<number>`COUNT(*) FILTER (WHERE status = 'pending')`,
      inProgress: sql<number>`COUNT(*) FILTER (WHERE status = 'in_progress')`,
      total: sql<number>`COUNT(*)`
    })
    .from(manualInterventionQueue);
    
    // Get AI performance stats
    const [aiStats] = await db.select({
      totalAttempts: sql<number>`COUNT(*)`,
      successful: sql<number>`COUNT(*) FILTER (WHERE outcome = 'success')`,
      avgConfidence: sql<number>`AVG(confidence_score)`
    })
    .from(remediationAttempts);
    
    // Calculate improvement
    const improvement = previousRun 
      ? latestRun.dataQualityScore! - previousRun.dataQualityScore!
      : 0;
    
    res.json({
      hasData: true,
      currentScore: latestRun.dataQualityScore,
      improvement,
      trend: improvement > 0 ? 'improving' : improvement < 0 ? 'declining' : 'stable',
      latestAudit: {
        id: latestRun.id,
        runAt: latestRun.completedAt,
        totalIssues: latestRun.totalIssues,
        errors: latestRun.errors,
        warnings: latestRun.warnings,
        info: latestRun.info,
        autoFixed: latestRun.autoFixed,
        flaggedForReview: latestRun.flaggedForReview,
        manualQueue: latestRun.manualQueue
      },
      manualQueue: {
        pending: Number(queueStats?.pending || 0),
        inProgress: Number(queueStats?.inProgress || 0),
        total: Number(queueStats?.total || 0)
      },
      aiPerformance: {
        totalAttempts: Number(aiStats?.totalAttempts || 0),
        successRate: aiStats?.totalAttempts 
          ? Math.round((Number(aiStats.successful) / Number(aiStats.totalAttempts)) * 100)
          : 0,
        avgConfidence: Math.round(Number(aiStats?.avgConfidence || 0))
      }
    });
    
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

/**
 * GET /api/data-quality/audit-history
 * Returns recent audit runs
 */
router.get('/audit-history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    
    const runs = await db.select()
      .from(auditRuns)
      .orderBy(desc(auditRuns.id))
      .limit(limit);
    
    res.json({ runs });
  } catch (error) {
    console.error('Audit history error:', error);
    res.status(500).json({ error: 'Failed to load audit history' });
  }
});

/**
 * POST /api/data-quality/run-audit
 * Triggers a new audit run
 */
router.post('/run-audit', async (req, res) => {
  try {
    // Start audit in background
    runFullAudit().catch(error => {
      console.error('Background audit failed:', error);
    });
    
    res.json({ 
      message: 'Audit started in background',
      status: 'running'
    });
  } catch (error) {
    console.error('Run audit error:', error);
    res.status(500).json({ error: 'Failed to start audit' });
  }
});

/**
 * GET /api/data-quality/manual-queue
 * Returns items in manual intervention queue
 */
router.get('/manual-queue', async (req, res) => {
  try {
    const priority = req.query.priority as string;
    const status = req.query.status as string || 'pending';
    
    let query = db.select({
      queueItem: manualInterventionQueue,
      issue: auditIssues
    })
    .from(manualInterventionQueue)
    .innerJoin(auditIssues, eq(manualInterventionQueue.issueId, auditIssues.id))
    .orderBy(
      // Sort by priority (P0 first)
      sql`CASE ${manualInterventionQueue.priority} WHEN 'P0' THEN 1 WHEN 'P1' THEN 2 WHEN 'P2' THEN 3 END`,
      desc(manualInterventionQueue.queuedAt)
    );
    
    if (status) {
      query = query.where(eq(manualInterventionQueue.status, status)) as any;
    }
    
    if (priority) {
      query = query.where(eq(manualInterventionQueue.priority, priority)) as any;
    }
    
    const items = await query;
    
    res.json({ items });
  } catch (error) {
    console.error('Manual queue error:', error);
    res.status(500).json({ error: 'Failed to load queue' });
  }
});

/**
 * POST /api/data-quality/resolve-issue
 * Resolve a manual intervention queue item with human feedback
 */
router.post('/resolve-issue', async (req, res) => {
  try {
    const { queueId, action, notes, applyAiSuggestion } = req.body;
    
    // Get queue item
    const [queueItem] = await db.select()
      .from(manualInterventionQueue)
      .where(eq(manualInterventionQueue.id, queueId));
    
    if (!queueItem) {
      return res.status(404).json({ error: 'Queue item not found' });
    }
    
    const startTime = new Date(queueItem.queuedAt!);
    const resolveTime = new Date();
    const timeToResolveMinutes = Math.round((resolveTime.getTime() - startTime.getTime()) / 60000);
    
    // Check if SLA was missed
    const slaMissed = queueItem.slaDeadline 
      ? resolveTime > new Date(queueItem.slaDeadline)
      : false;
    
    // Update queue item
    await db.update(manualInterventionQueue)
      .set({
        status: 'resolved',
        resolvedAt: sql`now()`,
        timeToResolveMinutes,
        slaMissed,
        notes,
        resolutionAction: { action, applyAiSuggestion }
      })
      .where(eq(manualInterventionQueue.id, queueId));
    
    // Update audit issue
    await db.update(auditIssues)
      .set({
        status: 'resolved',
        resolvedBy: 'human',
        resolvedAt: sql`now()`,
        resolutionNotes: notes
      })
      .where(eq(auditIssues.id, queueItem.issueId));
    
    // If human approved AI suggestion, update remediation attempt for learning
    if (applyAiSuggestion && queueItem.aiSuggestions) {
      // Find the remediation attempt for this issue
      const [attempt] = await db.select()
        .from(remediationAttempts)
        .where(eq(remediationAttempts.issueId, queueItem.issueId))
        .orderBy(desc(remediationAttempts.id))
        .limit(1);
      
      if (attempt) {
        await db.update(remediationAttempts)
          .set({
            humanFeedback: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'modified',
            feedbackNotes: notes,
            learned: true // Mark for future training
          })
          .where(eq(remediationAttempts.id, attempt.id));
      }
    }
    
    res.json({ 
      success: true,
      message: 'Issue resolved successfully',
      slaMissed
    });
    
  } catch (error) {
    console.error('Resolve issue error:', error);
    res.status(500).json({ error: 'Failed to resolve issue' });
  }
});

/**
 * GET /api/data-quality/report/:auditId
 * Download CSV report for specific audit
 */
router.get('/report/:auditId', async (req, res) => {
  try {
    const auditId = parseInt(req.params.auditId);
    
    const csvContent = await generateCsvReport(auditId);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=audit-report-${auditId}.csv`);
    res.send(csvContent);
    
  } catch (error) {
    console.error('Report download error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

/**
 * GET /api/data-quality/email-preview/:auditId
 * Preview email report HTML
 */
router.get('/email-preview/:auditId', async (req, res) => {
  try {
    const auditId = parseInt(req.params.auditId);
    
    const [auditRun] = await db.select()
      .from(auditRuns)
      .where(eq(auditRuns.id, auditId));
    
    if (!auditRun) {
      return res.status(404).json({ error: 'Audit run not found' });
    }
    
    const emailReport = generateEmailReport(auditRun);
    
    res.setHeader('Content-Type', 'text/html');
    res.send(emailReport.htmlBody);
    
  } catch (error) {
    console.error('Email preview error:', error);
    res.status(500).json({ error: 'Failed to generate email preview' });
  }
});

export default router;
