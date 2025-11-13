/**
 * Email Notification System for DeepHire
 * 
 * Sends professional emails to clients when:
 * - Search has started (immediate confirmation with transparent logic)
 * - Search is complete (sourcing map with candidates)
 * 
 * Uses SendGrid for transactional email delivery
 */

import sgMail from '@sendgrid/mail';

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'deephire@yourdomain.com';
const DEEPHIRE_APP_URL = process.env.DEEPHIRE_APP_URL || 'http://localhost:5000';

// Initialize SendGrid if API key is available
if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
  console.log('✉️  [Email] SendGrid initialized');
} else {
  console.warn('⚠️  [Email] SENDGRID_API_KEY not configured - emails will be logged only');
}

export interface SearchStartedEmailData {
  jobId: number;
  jobTitle: string;
  companyName: string;
  turnaroundHours: number;
  searchLogic: {
    targetCompanies: string[];
    positionHolders: string;
    booleanQuery: string;
    reasoning: string;
  };
  recipientEmail: string;
  recipientName?: string;
}

export interface SearchCompleteEmailData {
  jobId: number;
  jobTitle: string;
  companyName: string;
  candidatesFound: number;
  internalHits: number;
  externalHits: number;
  topCandidates: Array<{
    name: string;
    title: string;
    company: string;
    fitScore: number;
    keyProof: string;
  }>;
  sourcingMapUrl: string;
  recipientEmail: string;
  recipientName?: string;
}

/**
 * Send "Search Started" confirmation email with transparent logic
 */
export async function sendSearchStartedEmail(data: SearchStartedEmailData): Promise<void> {
  const {
    jobId,
    jobTitle,
    companyName,
    turnaroundHours,
    searchLogic,
    recipientEmail,
    recipientName = 'Client'
  } = data;

  const subject = `DeepHire Search In Progress – ${jobTitle}`;
  
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6; color: #1e293b; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; }
    .logic-box { background: #f1f5f9; border-left: 4px solid #1e3a8a; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .footer { text-align: center; padding: 20px; color: #64748b; font-size: 14px; }
    .button { display: inline-block; background: #1e3a8a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
    ul { padding-left: 20px; }
    li { margin: 8px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">🔍 Search In Progress</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">DeepHire is conducting a comprehensive search for your ${jobTitle} mandate</p>
    </div>
    
    <div class="content">
      <p>Dear ${recipientName},</p>
      
      <p>DeepHire has received your ${jobTitle} mandate for <strong>${companyName}</strong> and is now conducting a comprehensive, dual-database search.</p>
      
      <p><strong>⏱ Turnaround:</strong> ${turnaroundHours} hours<br>
      <strong>📧 Delivery:</strong> Full Sourcing Map via email when complete</p>
      
      <div class="logic-box">
        <h3 style="margin-top: 0; color: #1e3a8a;">🎯 Search Logic (Transparency)</h3>
        <p><strong>Target Companies:</strong></p>
        <p>${searchLogic.reasoning}</p>
        <p><strong>Companies being searched:</strong></p>
        <ul>
          ${searchLogic.targetCompanies.slice(0, 10).map(company => `<li>${company}</li>`).join('')}
          ${searchLogic.targetCompanies.length > 10 ? `<li><em>...and ${searchLogic.targetCompanies.length - 10} more</em></li>` : ''}
        </ul>
        <p><strong>Position Holders:</strong> ${searchLogic.positionHolders}</p>
        <p><strong>Search Strategy:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 3px; font-size: 13px;">${searchLogic.booleanQuery}</code></p>
      </div>
      
      <p><strong>Methodology:</strong></p>
      <ul>
        <li>🏦 Internal Talent Bank (priority)</li>
        <li>🌐 External Sources (LinkedIn, company sites, professional networks)</li>
        <li>🎯 Boolean logic derived from Needs Analysis Profile</li>
        <li>🤖 AI-powered fit scoring against full role context</li>
      </ul>
      
      <p style="margin-top: 25px;"><em>We do not return immediate or low-quality results. Quality takes time.</em></p>
      
      <a href="${DEEPHIRE_APP_URL}/jobs/${jobId}" class="button">View Search Progress</a>
      
      <p style="margin-top: 25px; color: #64748b; font-size: 14px;">You will receive a full Sourcing Map via email when the search is complete.</p>
    </div>
    
    <div class="footer">
      <p><strong>DeepHire</strong> – AI-Powered Executive Search<br>
      Precision. Transparency. Results.</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const textContent = `
DeepHire Search In Progress – ${jobTitle}

Dear ${recipientName},

DeepHire has received your ${jobTitle} mandate for ${companyName} and is now conducting a comprehensive, dual-database search.

⏱ Turnaround: ${turnaroundHours} hours
📧 Delivery: Full Sourcing Map via email when complete

🎯 Search Logic (Transparency):
${searchLogic.reasoning}

Target Companies: ${searchLogic.targetCompanies.slice(0, 10).join(', ')}${searchLogic.targetCompanies.length > 10 ? `, and ${searchLogic.targetCompanies.length - 10} more` : ''}

Position Holders: ${searchLogic.positionHolders}

Search Strategy: ${searchLogic.booleanQuery}

Methodology:
- Internal Talent Bank (priority)
- External Sources (LinkedIn, company sites)
- Boolean logic derived from NAP
- AI-powered fit scoring

We do not return immediate or low-quality results. Quality takes time.

View search progress: ${DEEPHIRE_APP_URL}/jobs/${jobId}

---
DeepHire – AI-Powered Executive Search
Precision. Transparency. Results.
  `.trim();

  const msg = {
    to: recipientEmail,
    from: FROM_EMAIL,
    subject,
    text: textContent,
    html: htmlContent,
  };

  await sendEmail(msg, 'Search Started');
}

/**
 * Send "Search Complete" email with sourcing map
 */
export async function sendSearchCompleteEmail(data: SearchCompleteEmailData): Promise<void> {
  const {
    jobId,
    jobTitle,
    companyName,
    candidatesFound,
    internalHits,
    externalHits,
    topCandidates,
    sourcingMapUrl,
    recipientEmail,
    recipientName = 'Client'
  } = data;

  const subject = `✅ DeepHire Search Complete – ${candidatesFound} Candidates Found for ${jobTitle}`;
  
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6; color: #1e293b; }
    .container { max-width: 700px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; }
    .stats { display: flex; gap: 20px; margin: 20px 0; }
    .stat-box { background: #f1f5f9; padding: 15px; border-radius: 6px; flex: 1; text-align: center; }
    .stat-number { font-size: 32px; font-weight: bold; color: #1e3a8a; margin: 0; }
    .stat-label { font-size: 14px; color: #64748b; margin: 5px 0 0 0; }
    .candidate-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .candidate-table th { background: #1e3a8a; color: white; padding: 12px; text-align: left; font-weight: 600; }
    .candidate-table td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
    .fit-score { display: inline-block; padding: 4px 12px; border-radius: 20px; font-weight: bold; font-size: 14px; }
    .fit-excellent { background: #d1fae5; color: #065f46; }
    .fit-good { background: #dbeafe; color: #1e40af; }
    .footer { text-align: center; padding: 20px; color: #64748b; font-size: 14px; }
    .button { display: inline-block; background: #059669; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 28px;">✅ Search Complete</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 16px;">${jobTitle} – ${companyName}</p>
    </div>
    
    <div class="content">
      <p>Dear ${recipientName},</p>
      
      <p>Your DeepHire search is complete. We've identified <strong>${candidatesFound} qualified candidates</strong> for your ${jobTitle} role through our comprehensive dual-database search.</p>
      
      <div class="stats">
        <div class="stat-box">
          <p class="stat-number">${candidatesFound}</p>
          <p class="stat-label">Total Candidates</p>
        </div>
        <div class="stat-box">
          <p class="stat-number">${internalHits}</p>
          <p class="stat-label">Internal Talent Bank</p>
        </div>
        <div class="stat-box">
          <p class="stat-number">${externalHits}</p>
          <p class="stat-label">External Sources</p>
        </div>
      </div>
      
      <h2 style="color: #1e3a8a; margin-top: 30px;">Top ${topCandidates.length} Candidates</h2>
      
      <table class="candidate-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Candidate</th>
            <th>Current Role</th>
            <th>Fit</th>
            <th>Key Proof</th>
          </tr>
        </thead>
        <tbody>
          ${topCandidates.map((candidate, index) => `
            <tr>
              <td><strong>#${index + 1}</strong></td>
              <td><strong>${candidate.name}</strong><br><span style="color: #64748b; font-size: 14px;">${candidate.company}</span></td>
              <td>${candidate.title}</td>
              <td><span class="fit-score ${candidate.fitScore >= 85 ? 'fit-excellent' : 'fit-good'}">${candidate.fitScore}%</span></td>
              <td style="font-size: 14px;">${candidate.keyProof}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <p style="margin-top: 30px;"><strong>Next Steps:</strong></p>
      <ul>
        <li>Review the full sourcing map in your DeepHire dashboard</li>
        <li>View detailed candidate profiles with AI fit analysis</li>
        <li>Move candidates through your recruitment pipeline</li>
        <li>Request additional searches as needed</li>
      </ul>
      
      <center>
        <a href="${sourcingMapUrl}" class="button">View Full Sourcing Map →</a>
      </center>
      
      <p style="margin-top: 30px; color: #64748b; font-size: 14px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
        <strong>Note:</strong> All candidates have been saved to your internal talent bank. Future searches will prioritize these proven profiles, improving match quality and reducing search time.
      </p>
    </div>
    
    <div class="footer">
      <p><strong>DeepHire</strong> – AI-Powered Executive Search<br>
      Precision. Transparency. Results.</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const textContent = `
✅ DeepHire Search Complete – ${candidatesFound} Candidates Found

${jobTitle} – ${companyName}

Dear ${recipientName},

Your DeepHire search is complete. We've identified ${candidatesFound} qualified candidates for your ${jobTitle} role.

Search Results:
- Total Candidates: ${candidatesFound}
- Internal Talent Bank: ${internalHits}
- External Sources: ${externalHits}

Top ${topCandidates.length} Candidates:
${topCandidates.map((c, i) => `
${i + 1}. ${c.name} – ${c.title} at ${c.company}
   Fit Score: ${c.fitScore}% | ${c.keyProof}
`).join('\n')}

View full sourcing map: ${sourcingMapUrl}

Next Steps:
- Review the full sourcing map in your dashboard
- View detailed candidate profiles with AI fit analysis
- Move candidates through your recruitment pipeline

---
DeepHire – AI-Powered Executive Search
Precision. Transparency. Results.
  `.trim();

  const msg = {
    to: recipientEmail,
    from: FROM_EMAIL,
    subject,
    text: textContent,
    html: htmlContent,
  };

  await sendEmail(msg, 'Search Complete');
}

/**
 * Internal helper to send email via SendGrid (or log if not configured)
 */
async function sendEmail(msg: any, emailType: string): Promise<void> {
  if (!SENDGRID_API_KEY) {
    console.log(`\n📧 [Email ${emailType}] Would send to: ${msg.to}`);
    console.log(`   Subject: ${msg.subject}`);
    console.log(`   (SENDGRID_API_KEY not configured - email not sent)\n`);
    return;
  }

  try {
    await sgMail.send(msg);
    console.log(`✅ [Email ${emailType}] Sent to: ${msg.to}`);
  } catch (error: any) {
    console.error(`❌ [Email ${emailType}] Failed to send:`, error?.response?.body || error.message);
    throw error;
  }
}
