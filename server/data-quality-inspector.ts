/**
 * Data Quality Inspector
 * 
 * Validates data integrity and quality before/after database operations
 * Uses rules-based validation + optional AI enhancement
 */

import { db } from './db';
import { candidates, companies, jobs, jobCandidates } from '../shared/schema';
import { sql, isNull, eq } from 'drizzle-orm';

export interface ValidationRule {
  name: string;
  severity: 'error' | 'warning' | 'info';
  check: () => Promise<ValidationIssue[]>;
}

export interface ValidationIssue {
  rule: string;
  severity: 'error' | 'warning' | 'info';
  entity: string;
  entityId: number | string;
  message: string;
  suggestedFix?: string;
  // Rich metadata for inline editing (NEW)
  metadata?: {
    fieldName?: string; // Which field has the issue
    currentValue?: any; // Current (problematic) value
    expectedValue?: any; // What it should be (if known)
    businessImpact?: string; // Why this matters
    editableFields?: string[]; // Fields that can be edited to fix this
    entityName?: string; // Human-readable entity name (e.g., "Eugene Baek")
    relatedEntity?: string; // Related entity info (e.g., "Samsung Electronics")
  };
}

export interface ValidationReport {
  timestamp: Date;
  totalIssues: number;
  errors: number;
  warnings: number;
  info: number;
  issues: ValidationIssue[];
  summary: string;
}

/**
 * RULE 1: All candidates must have company links
 */
async function checkCandidateCompanyLinks(): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  
  const unlinkedCandidates = await db.select({
    id: candidates.id,
    firstName: candidates.firstName,
    lastName: candidates.lastName,
    currentCompany: candidates.currentCompany
  })
  .from(candidates)
  .where(
    sql`${candidates.currentCompany} IS NOT NULL AND ${candidates.currentCompanyId} IS NULL`
  );
  
  for (const candidate of unlinkedCandidates) {
    issues.push({
      rule: 'CANDIDATE_COMPANY_LINK',
      severity: 'error',
      entity: 'candidate',
      entityId: candidate.id,
      message: `Candidate "${candidate.firstName} ${candidate.lastName}" has currentCompany="${candidate.currentCompany}" but no currentCompanyId link`,
      suggestedFix: `Run company linking script or manually link to companies table`
    });
  }
  
  return issues;
}

/**
 * RULE 2: Career history should have companyIds filled
 */
async function checkCareerHistoryLinks(): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  
  const candidatesWithHistory = await db.select({
    id: candidates.id,
    firstName: candidates.firstName,
    lastName: candidates.lastName,
    careerHistory: candidates.careerHistory
  })
  .from(candidates)
  .where(sql`${candidates.careerHistory} IS NOT NULL`);
  
  for (const candidate of candidatesWithHistory) {
    const history = candidate.careerHistory as any[];
    if (!history || history.length === 0) continue;
    
    const unlinkedJobs = history.filter(job => job.company && !job.companyId);
    
    if (unlinkedJobs.length > 0) {
      issues.push({
        rule: 'CAREER_HISTORY_LINKS',
        severity: 'warning',
        entity: 'candidate',
        entityId: candidate.id,
        message: `Candidate "${candidate.firstName} ${candidate.lastName}" has ${unlinkedJobs.length} career history entries without companyId links`,
        suggestedFix: `Companies: ${unlinkedJobs.map(j => j.company).join(', ')}`
      });
    }
  }
  
  return issues;
}

/**
 * RULE 3: No duplicate companies (name variations)
 */
async function checkDuplicateCompanies(): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  
  const allCompanies = await db.select({
    id: companies.id,
    name: companies.name
  })
  .from(companies)
  .where(isNull(companies.parentCompanyId));
  
  // Check for potential duplicates using fuzzy matching
  const seen = new Map<string, typeof allCompanies[0]>();
  
  for (const company of allCompanies) {
    const normalized = company.name.toLowerCase().trim();
    
    // Check if similar name exists
    for (const [seenName, seenCompany] of Array.from(seen.entries())) {
      if (normalized.includes(seenName) || seenName.includes(normalized)) {
        if (normalized !== seenName) {
          issues.push({
            rule: 'DUPLICATE_COMPANIES',
            severity: 'warning',
            entity: 'company',
            entityId: company.id,
            message: `Possible duplicate: "${company.name}" (id: ${company.id}) similar to "${seenCompany.name}" (id: ${seenCompany.id})`,
            suggestedFix: `Review and merge duplicates if they're the same company`
          });
        }
      }
    }
    
    seen.set(normalized, company);
  }
  
  return issues;
}

/**
 * RULE 4: Required fields must be present
 */
async function checkRequiredFields(): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  
  // Check candidates missing critical info
  const incompleteCandidates = await db.select({
    id: candidates.id,
    firstName: candidates.firstName,
    lastName: candidates.lastName,
    email: candidates.email,
    phoneNumber: candidates.phoneNumber,
    linkedinUrl: candidates.linkedinUrl
  })
  .from(candidates);
  
  for (const candidate of incompleteCandidates) {
    const missing: string[] = [];
    const editableFields: string[] = [];
    let primaryField: string | null = null;
    let businessImpact: string = '';
    
    if (!candidate.email) {
      missing.push('email');
      editableFields.push('email');
      if (!primaryField) {
        primaryField = 'email';
        businessImpact = 'Prevents email outreach and candidate engagement';
      }
    }
    if (!candidate.phoneNumber) {
      missing.push('phone number');
      editableFields.push('phoneNumber');
      if (!primaryField) {
        primaryField = 'phoneNumber';
        businessImpact = 'Prevents direct contact and phone screening';
      }
    }
    if (!candidate.linkedinUrl) {
      missing.push('LinkedIn URL');
      editableFields.push('linkedinUrl');
      if (!primaryField) {
        primaryField = 'linkedinUrl';
        businessImpact = 'Cannot verify candidate background or scrape additional data';
      }
    }
    
    if (missing.length > 0) {
      issues.push({
        rule: 'REQUIRED_FIELDS',
        severity: 'info',
        entity: 'candidate',
        entityId: candidate.id,
        message: `Candidate "${candidate.firstName} ${candidate.lastName}" missing: ${missing.join(', ')}`,
        suggestedFix: `Enrich candidate data through research or LinkedIn scraping`,
        metadata: {
          fieldName: primaryField || undefined,
          currentValue: null,
          expectedValue: undefined,
          businessImpact: businessImpact || `Missing ${missing.length} critical contact ${missing.length === 1 ? 'field' : 'fields'}`,
          editableFields,
          entityName: `${candidate.firstName} ${candidate.lastName}`,
          relatedEntity: undefined
        }
      });
    }
  }
  
  return issues;
}

/**
 * RULE 5: Job candidates must link to valid candidates and jobs
 */
async function checkJobCandidateIntegrity(): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  
  // Check for orphaned job candidates (no matching candidate)
  const orphanedLinks = await db.execute(sql`
    SELECT jc.id, jc.candidate_id, jc.job_id
    FROM job_candidates jc
    LEFT JOIN candidates c ON jc.candidate_id = c.id
    WHERE c.id IS NULL
  `);
  
  for (const row of orphanedLinks.rows) {
    issues.push({
      rule: 'JOB_CANDIDATE_INTEGRITY',
      severity: 'error',
      entity: 'job_candidate',
      entityId: row.id as number,
      message: `Job candidate link references non-existent candidate (id: ${row.candidate_id})`,
      suggestedFix: `Delete orphaned link or restore missing candidate`
    });
  }
  
  return issues;
}

/**
 * RULE 6: Company data quality (no empty names, has minimal info)
 */
async function checkCompanyDataQuality(): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  
  const allCompanies = await db.select()
    .from(companies)
    .where(isNull(companies.parentCompanyId));
  
  for (const company of allCompanies) {
    // Check for empty/invalid names
    if (!company.name || company.name.trim().length === 0) {
      issues.push({
        rule: 'COMPANY_DATA_QUALITY',
        severity: 'error',
        entity: 'company',
        entityId: company.id,
        message: `Company (id: ${company.id}) has empty name`,
        suggestedFix: `Add proper company name or delete record`
      });
    }
    
    // Check for minimal company info
    const missingInfo: string[] = [];
    if (!company.industry) missingInfo.push('industry');
    if (!company.headquarters) missingInfo.push('headquarters');
    if (!company.website) missingInfo.push('website');
    
    if (missingInfo.length >= 2) {
      issues.push({
        rule: 'COMPANY_DATA_QUALITY',
        severity: 'info',
        entity: 'company',
        entityId: company.id,
        message: `Company "${company.name}" missing ${missingInfo.length} fields: ${missingInfo.join(', ')}`,
        suggestedFix: `Enrich company data through web research or AI extraction`
      });
    }
  }
  
  return issues;
}

/**
 * Run all validation rules
 */
export async function runDataQualityInspection(): Promise<ValidationReport> {
  console.log('🔍 Starting data quality inspection...\n');
  
  const rules: ValidationRule[] = [
    { name: 'Candidate Company Links', severity: 'error', check: checkCandidateCompanyLinks },
    { name: 'Career History Links', severity: 'warning', check: checkCareerHistoryLinks },
    { name: 'Duplicate Companies', severity: 'warning', check: checkDuplicateCompanies },
    { name: 'Required Fields', severity: 'info', check: checkRequiredFields },
    { name: 'Job Candidate Integrity', severity: 'error', check: checkJobCandidateIntegrity },
    { name: 'Company Data Quality', severity: 'info', check: checkCompanyDataQuality }
  ];
  
  const allIssues: ValidationIssue[] = [];
  
  for (const rule of rules) {
    console.log(`Running: ${rule.name}...`);
    const issues = await rule.check();
    allIssues.push(...issues);
    console.log(`  Found ${issues.length} issues\n`);
  }
  
  const errors = allIssues.filter(i => i.severity === 'error').length;
  const warnings = allIssues.filter(i => i.severity === 'warning').length;
  const info = allIssues.filter(i => i.severity === 'info').length;
  
  const report: ValidationReport = {
    timestamp: new Date(),
    totalIssues: allIssues.length,
    errors,
    warnings,
    info,
    issues: allIssues,
    summary: `Found ${allIssues.length} issues: ${errors} errors, ${warnings} warnings, ${info} info`
  };
  
  return report;
}

/**
 * Validate a single candidate before insert/update
 */
export async function validateCandidate(candidateData: any): Promise<{ valid: boolean; issues: string[] }> {
  const issues: string[] = [];
  
  // Rule: Must have name
  if (!candidateData.firstName || !candidateData.lastName) {
    issues.push('Candidate must have first and last name');
  }
  
  // Rule: If has currentCompany text, must have currentCompanyId
  if (candidateData.currentCompany && !candidateData.currentCompanyId) {
    issues.push(`Company "${candidateData.currentCompany}" is not linked to companies table`);
  }
  
  // Rule: Career history should have companyIds
  if (candidateData.careerHistory && Array.isArray(candidateData.careerHistory)) {
    const unlinkedJobs = candidateData.careerHistory.filter((job: any) => job.company && !job.companyId);
    if (unlinkedJobs.length > 0) {
      issues.push(`${unlinkedJobs.length} career history entries missing company links`);
    }
  }
  
  // Rule: Should have contact info
  if (!candidateData.email && !candidateData.phone && !candidateData.linkedinUrl) {
    issues.push('Candidate should have at least one form of contact (email, phone, or LinkedIn)');
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
}

/**
 * Pretty print validation report
 */
export function printValidationReport(report: ValidationReport): void {
  console.log('\n' + '='.repeat(80));
  console.log('📊 DATA QUALITY INSPECTION REPORT');
  console.log('='.repeat(80));
  console.log(`Timestamp: ${report.timestamp.toISOString()}`);
  console.log(`\n${report.summary}\n`);
  
  if (report.errors > 0) {
    console.log('🔴 ERRORS (must fix):');
    report.issues
      .filter(i => i.severity === 'error')
      .forEach(issue => {
        console.log(`  • [${issue.entity}:${issue.entityId}] ${issue.message}`);
        if (issue.suggestedFix) {
          console.log(`    Fix: ${issue.suggestedFix}`);
        }
      });
    console.log('');
  }
  
  if (report.warnings > 0) {
    console.log('🟡 WARNINGS (should fix):');
    report.issues
      .filter(i => i.severity === 'warning')
      .slice(0, 10) // Show first 10
      .forEach(issue => {
        console.log(`  • [${issue.entity}:${issue.entityId}] ${issue.message}`);
      });
    if (report.warnings > 10) {
      console.log(`  ... and ${report.warnings - 10} more warnings`);
    }
    console.log('');
  }
  
  if (report.info > 0) {
    console.log('ℹ️  INFO (nice to have):');
    console.log(`  ${report.info} data enrichment opportunities`);
    console.log('');
  }
  
  console.log('='.repeat(80));
  
  if (report.errors === 0 && report.warnings === 0) {
    console.log('✅ Data quality is excellent! No critical issues found.');
  } else if (report.errors === 0) {
    console.log('⚠️  Data quality is good, but has some warnings to address.');
  } else {
    console.log('❌ Data quality has critical errors that must be fixed!');
  }
  console.log('='.repeat(80) + '\n');
}
