/**
 * Email Report Generator
 * 
 * Generates daily audit email reports
 * Can be used with SendGrid or console output
 */

import type { AuditRun } from '../shared/schema';

interface EmailReport {
  subject: string;
  htmlBody: string;
  textBody: string;
}

/**
 * Generate email report for audit run
 */
export function generateEmailReport(auditRun: AuditRun, previousScore?: number): EmailReport {
  const improvement = previousScore ? auditRun.dataQualityScore! - previousScore : 0;
  const improvementIndicator = improvement > 0 ? '⬆️' : improvement < 0 ? '⬇️' : '➡️';
  const improvementText = improvement !== 0 ? `${improvementIndicator} ${improvement > 0 ? '+' : ''}${improvement} from last run` : '';
  
  const subject = `Daily Data Quality Audit - ${auditRun.dataQualityScore}/100 ${improvementIndicator}`;
  
  const textBody = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 DAILY DATA QUALITY AUDIT - ${new Date().toLocaleDateString()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OVERALL DATA QUALITY: ${auditRun.dataQualityScore}/100 ${improvementText}

ISSUES FOUND: ${auditRun.totalIssues}
  🔴 P0 Critical: ${auditRun.errors}
  🟡 P1 Important: ${auditRun.warnings}
  🔵 P2 Enhancement: ${auditRun.info}

AI AUTO-FIXED: ${auditRun.autoFixed} issues (${Math.round((auditRun.autoFixed! / auditRun.totalIssues) * 100)}%)
  ✅ Automatically resolved
  ✅ No manual intervention needed
  ✅ Audit trail recorded

FLAGGED FOR REVIEW: ${auditRun.flaggedForReview} issues
  ⚠️  AI applied fixes but recommends verification
  ⚠️  Medium confidence changes

MANUAL QUEUE: ${auditRun.manualQueue} issues
  👤 Requires human review
  👤 Prioritized by severity
  👤 SLA tracking enabled

EXECUTION TIME: ${((auditRun.executionTimeMs || 0) / 1000).toFixed(2)}s

NEXT STEPS:
  1. Review manual intervention queue (${auditRun.manualQueue} items pending)
  2. Download CSV report for detailed analysis
  3. Address P0 issues immediately (SLA: 4 hours)
  4. Schedule P1 issues for today (SLA: 24 hours)
  5. Batch P2 issues for weekly review

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 8px;
      text-align: center;
      margin-bottom: 30px;
    }
    .score {
      font-size: 48px;
      font-weight: bold;
      margin: 10px 0;
    }
    .improvement {
      font-size: 18px;
      opacity: 0.9;
    }
    .section {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .section h2 {
      margin-top: 0;
      color: #667eea;
      font-size: 20px;
    }
    .stat-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin: 20px 0;
    }
    .stat-card {
      background: white;
      padding: 15px;
      border-radius: 6px;
      border-left: 4px solid #667eea;
    }
    .stat-card.error { border-left-color: #ef4444; }
    .stat-card.warning { border-left-color: #f59e0b; }
    .stat-card.info { border-left-color: #3b82f6; }
    .stat-value {
      font-size: 32px;
      font-weight: bold;
      color: #667eea;
    }
    .stat-label {
      font-size: 14px;
      color: #6b7280;
      margin-top: 5px;
    }
    .progress-bar {
      background: #e5e7eb;
      border-radius: 10px;
      height: 20px;
      overflow: hidden;
      margin: 10px 0;
    }
    .progress-fill {
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 12px;
      font-weight: bold;
    }
    .action-items {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      border-radius: 6px;
      margin-top: 20px;
    }
    .action-items h3 {
      margin-top: 0;
      color: #92400e;
    }
    .action-items ul {
      margin: 10px 0;
      padding-left: 20px;
    }
    .action-items li {
      margin: 8px 0;
      color: #78350f;
    }
    .footer {
      text-align: center;
      color: #6b7280;
      font-size: 14px;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 Data Quality Audit Report</h1>
    <div class="score">${auditRun.dataQualityScore}/100</div>
    ${improvementText ? `<div class="improvement">${improvementText}</div>` : ''}
    <div style="margin-top: 15px; opacity: 0.9;">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
  </div>

  <div class="section">
    <h2>Issues Detected</h2>
    <div class="stat-grid">
      <div class="stat-card error">
        <div class="stat-value">${auditRun.errors}</div>
        <div class="stat-label">🔴 Critical (P0)</div>
      </div>
      <div class="stat-card warning">
        <div class="stat-value">${auditRun.warnings}</div>
        <div class="stat-label">🟡 Important (P1)</div>
      </div>
      <div class="stat-card info">
        <div class="stat-value">${auditRun.info}</div>
        <div class="stat-label">🔵 Enhancement (P2)</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${auditRun.totalIssues}</div>
        <div class="stat-label">📋 Total Issues</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>🤖 AI Remediation</h2>
    <p><strong>${auditRun.autoFixed} issues</strong> fixed automatically (${Math.round((auditRun.autoFixed! / auditRun.totalIssues) * 100)}% success rate)</p>
    <div class="progress-bar">
      <div class="progress-fill" style="width: ${Math.round((auditRun.autoFixed! / auditRun.totalIssues) * 100)}%">
        ${Math.round((auditRun.autoFixed! / auditRun.totalIssues) * 100)}% Auto-Fixed
      </div>
    </div>
    <ul style="margin: 15px 0; padding-left: 20px;">
      <li>✅ ${auditRun.autoFixed} automatically resolved</li>
      <li>⚠️  ${auditRun.flaggedForReview} flagged for review</li>
      <li>👤 ${auditRun.manualQueue} queued for manual intervention</li>
    </ul>
  </div>

  <div class="action-items">
    <h3>🎯 Next Steps</h3>
    <ul>
      <li><strong>Immediate:</strong> Review ${auditRun.manualQueue} items in manual intervention queue</li>
      ${auditRun.errors > 0 ? `<li><strong>Urgent:</strong> Address ${auditRun.errors} P0 critical issues (SLA: 4 hours)</li>` : ''}
      ${auditRun.warnings > 0 ? `<li><strong>Today:</strong> Review ${auditRun.warnings} P1 issues (SLA: 24 hours)</li>` : ''}
      <li>Download CSV report for detailed analysis</li>
      <li>Batch P2 issues for weekly review session</li>
    </ul>
  </div>

  <div class="footer">
    <p>Automated Data Quality System | Execution Time: ${((auditRun.executionTimeMs || 0) / 1000).toFixed(2)}s</p>
    <p>Audit Run ID: ${auditRun.id}</p>
  </div>
</body>
</html>
  `.trim();

  return {
    subject,
    htmlBody,
    textBody
  };
}

/**
 * Send email via SendGrid (if configured)
 */
export async function sendAuditEmail(to: string, report: EmailReport): Promise<boolean> {
  const sendgridApiKey = process.env.SENDGRID_API_KEY;
  
  if (!sendgridApiKey) {
    console.log('SendGrid not configured - Email report:');
    console.log(report.textBody);
    return false;
  }
  
  try {
    // SendGrid integration would go here
    // For now, just log that we would send
    console.log(`📧 Would send email to: ${to}`);
    console.log(`Subject: ${report.subject}`);
    console.log('Email body prepared');
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}
