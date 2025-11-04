/**
 * AI Remediation Engine
 * 
 * Uses xAI Grok to automatically fix data quality issues
 * with confidence scoring and learning capabilities
 */

import { db } from './db';
import { companies, candidates, auditIssues, remediationAttempts } from '../shared/schema';
import { eq, sql, isNull } from 'drizzle-orm';
import type { AuditIssue } from '../shared/schema';

interface RemediationResult {
  success: boolean;
  confidence: number; // 0-100
  reasoning: string;
  proposedFix: any;
  applied: boolean;
  outcome: 'success' | 'failed' | 'needs_review' | 'applied_with_flag';
}

/**
 * Main entry point: Fix an audit issue using AI
 */
export async function remediateIssue(issue: AuditIssue): Promise<RemediationResult> {
  const startTime = Date.now();
  
  console.log(`🤖 AI attempting to fix issue #${issue.id}: ${issue.description}`);
  
  try {
    // Route to appropriate remediation strategy based on issue type
    let result: RemediationResult;
    
    switch (issue.issueType) {
      case 'missing_link':
        result = await fixMissingCompanyLink(issue);
        break;
      case 'missing_data':
        result = await enrichMissingData(issue);
        break;
      case 'duplicate':
        result = await handleDuplicate(issue);
        break;
      default:
        result = {
          success: false,
          confidence: 0,
          reasoning: `No automated fix available for issue type: ${issue.issueType}`,
          proposedFix: null,
          applied: false,
          outcome: 'needs_review'
        };
    }
    
    // Log the remediation attempt
    await db.insert(remediationAttempts).values({
      issueId: issue.id,
      aiModel: 'grok-2-1212',
      proposedFix: result.proposedFix,
      reasoning: result.reasoning,
      confidenceScore: result.confidence,
      autoApplied: result.applied,
      outcome: result.outcome,
      beforeState: null, // Could capture before state if needed
      afterState: null,
      learned: false
    });
    
    const executionTime = Date.now() - startTime;
    console.log(`✅ Remediation completed in ${executionTime}ms - Outcome: ${result.outcome}, Confidence: ${result.confidence}%`);
    
    return result;
    
  } catch (error) {
    console.error(`❌ Remediation failed for issue #${issue.id}:`, error);
    
    // Log failed attempt
    await db.insert(remediationAttempts).values({
      issueId: issue.id,
      aiModel: 'grok-2-1212',
      proposedFix: null,
      reasoning: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      confidenceScore: 0,
      autoApplied: false,
      outcome: 'failed',
      learned: false
    });
    
    return {
      success: false,
      confidence: 0,
      reasoning: `Remediation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      proposedFix: null,
      applied: false,
      outcome: 'failed'
    };
  }
}

/**
 * FIX 1: Missing Company Links
 * 
 * When candidate has currentCompany text but no currentCompanyId
 */
async function fixMissingCompanyLink(issue: AuditIssue): Promise<RemediationResult> {
  if (issue.entityType !== 'candidate') {
    return {
      success: false,
      confidence: 0,
      reasoning: 'Entity is not a candidate',
      proposedFix: null,
      applied: false,
      outcome: 'failed'
    };
  }
  
  // Get the candidate
  const [candidate] = await db.select()
    .from(candidates)
    .where(eq(candidates.id, issue.entityId));
  
  if (!candidate || !candidate.currentCompany) {
    return {
      success: false,
      confidence: 0,
      reasoning: 'Candidate not found or has no company name',
      proposedFix: null,
      applied: false,
      outcome: 'failed'
    };
  }
  
  // Search for matching company (fuzzy match)
  const allCompanies = await db.select()
    .from(companies)
    .where(isNull(companies.parentCompanyId));
  
  const companyName = candidate.currentCompany.toLowerCase().trim();
  
  // Try exact match first
  let match = allCompanies.find(c => c.name.toLowerCase() === companyName);
  let confidence = 100;
  
  // Try partial match if no exact match
  if (!match) {
    match = allCompanies.find(c => {
      const name = c.name.toLowerCase();
      return name.includes(companyName) || companyName.includes(name);
    });
    confidence = match ? 95 : 0;
  }
  
  if (match) {
    // High confidence match found - auto-link
    await db.update(candidates)
      .set({ currentCompanyId: match.id })
      .where(eq(candidates.id, candidate.id));
    
    return {
      success: true,
      confidence,
      reasoning: `Fuzzy matched "${candidate.currentCompany}" to "${match.name}" (${confidence}% confidence)`,
      proposedFix: {
        action: 'link_to_existing_company',
        candidateId: candidate.id,
        companyId: match.id,
        companyName: match.name
      },
      applied: true,
      outcome: 'success'
    };
  }
  
  // No match found - create new company
  const [newCompany] = await db.insert(companies)
    .values({
      name: candidate.currentCompany,
      industry: null,
      headquarters: null
    })
    .returning();
  
  // Link candidate to new company
  await db.update(candidates)
    .set({ currentCompanyId: newCompany.id })
    .where(eq(candidates.id, candidate.id));
  
  return {
    success: true,
    confidence: 90,
    reasoning: `No existing company found. Created new company "${newCompany.name}" and linked candidate`,
    proposedFix: {
      action: 'create_new_company',
      candidateId: candidate.id,
      companyId: newCompany.id,
      companyName: newCompany.name
    },
    applied: true,
    outcome: 'applied_with_flag'
  };
}

/**
 * FIX 2: Enrich Missing Data
 * 
 * Use AI to fill in missing company information
 */
async function enrichMissingData(issue: AuditIssue): Promise<RemediationResult> {
  if (issue.entityType !== 'company') {
    return {
      success: false,
      confidence: 0,
      reasoning: 'Only company enrichment supported currently',
      proposedFix: null,
      applied: false,
      outcome: 'needs_review'
    };
  }
  
  // Get the company
  const [company] = await db.select()
    .from(companies)
    .where(eq(companies.id, issue.entityId));
  
  if (!company) {
    return {
      success: false,
      confidence: 0,
      reasoning: 'Company not found',
      proposedFix: null,
      applied: false,
      outcome: 'failed'
    };
  }
  
  // Use xAI to research the company
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      confidence: 0,
      reasoning: 'XAI_API_KEY not configured',
      proposedFix: null,
      applied: false,
      outcome: 'failed'
    };
  }
  
  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'grok-2-1212',
        messages: [
          {
            role: 'system',
            content: 'You are a business research expert. Extract key company information from your knowledge base. Respond with JSON only.'
          },
          {
            role: 'user',
            content: `Research company: ${company.name}
            
            Return JSON with:
            {
              "industry": "industry sector",
              "headquarters": "city, state/country",
              "website": "company website URL",
              "confidence": 0-100 (how confident you are in this data)
            }
            
            Return null for any field you're unsure about.`
          }
        ],
        temperature: 0.3
      })
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Parse JSON from response
    const enrichedData = JSON.parse(content.replace(/```json\n?|\n?```/g, ''));
    
    const confidence = enrichedData.confidence || 70;
    
    // Apply updates if confidence is high enough
    if (confidence >= 80) {
      const updates: any = {};
      if (enrichedData.industry) updates.industry = enrichedData.industry;
      if (enrichedData.headquarters) updates.headquarters = enrichedData.headquarters;
      if (enrichedData.website) updates.website = enrichedData.website;
      
      await db.update(companies)
        .set(updates)
        .where(eq(companies.id, company.id));
      
      return {
        success: true,
        confidence,
        reasoning: `AI enriched company data with ${confidence}% confidence`,
        proposedFix: {
          action: 'enrich_company_data',
          companyId: company.id,
          updates
        },
        applied: true,
        outcome: 'success'
      };
    }
    
    // Medium confidence - suggest but don't auto-apply
    return {
      success: true,
      confidence,
      reasoning: `AI found data but confidence (${confidence}%) is below threshold for auto-apply`,
      proposedFix: {
        action: 'enrich_company_data',
        companyId: company.id,
        updates: enrichedData
      },
      applied: false,
      outcome: 'needs_review'
    };
    
  } catch (error) {
    return {
      success: false,
      confidence: 0,
      reasoning: `AI enrichment failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      proposedFix: null,
      applied: false,
      outcome: 'failed'
    };
  }
}

/**
 * FIX 3: Handle Duplicates
 * 
 * Detect and flag potential duplicates for review
 */
async function handleDuplicate(issue: AuditIssue): Promise<RemediationResult> {
  // For now, duplicates always go to manual review
  // In future, could use AI to merge duplicates with high confidence
  
  return {
    success: true,
    confidence: 50,
    reasoning: 'Duplicate detection requires human review to prevent data loss',
    proposedFix: {
      action: 'review_duplicate',
      description: issue.description
    },
    applied: false,
    outcome: 'needs_review'
  };
}
