import { Candidate, Company, InsertDuplicateDetection } from "@shared/schema";
import { storage } from "./storage";

// Fuzzy string matching utilities
function normalizeString(str: string): string {
  return str.toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ')    // Normalize whitespace
    .trim();
}

function levenshteinDistance(a: string, b: string): number {
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));

  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // insertion
        matrix[j - 1][i] + 1,     // deletion
        matrix[j - 1][i - 1] + substitutionCost // substitution
      );
    }
  }

  return matrix[b.length][a.length];
}

function stringSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  
  const normalizedA = normalizeString(a);
  const normalizedB = normalizeString(b);
  
  if (normalizedA === normalizedB) return 100;
  
  const maxLen = Math.max(normalizedA.length, normalizedB.length);
  if (maxLen === 0) return 0;
  
  const distance = levenshteinDistance(normalizedA, normalizedB);
  return Math.round(((maxLen - distance) / maxLen) * 100);
}

function emailSimilarity(email1: string, email2: string): number {
  if (!email1 || !email2) return 0;
  
  const norm1 = email1.toLowerCase().trim();
  const norm2 = email2.toLowerCase().trim();
  
  if (norm1 === norm2) return 100;
  
  // Check if same domain but different local parts
  const [local1, domain1] = norm1.split('@');
  const [local2, domain2] = norm2.split('@');
  
  if (domain1 === domain2) {
    // Same domain, check local part similarity
    const localSimilarity = stringSimilarity(local1, local2);
    return Math.min(localSimilarity, 95); // Cap at 95 for same domain
  }
  
  return stringSimilarity(norm1, norm2);
}

// Candidate duplicate detection
export interface CandidateMatchResult {
  existingCandidateId: number;
  matchScore: number;
  matchedFields: string[];
  existingCandidate: Candidate;
}

export async function findCandidateDuplicates(
  newCandidate: Partial<Candidate>, 
  threshold: number = 85
): Promise<CandidateMatchResult[]> {
  const existingCandidates = await storage.getCandidates();
  const matches: CandidateMatchResult[] = [];
  
  for (const existing of existingCandidates) {
    const matchResult = calculateCandidateMatch(newCandidate, existing);
    
    if (matchResult.matchScore >= threshold) {
      matches.push({
        existingCandidateId: existing.id,
        matchScore: matchResult.matchScore,
        matchedFields: matchResult.matchedFields,
        existingCandidate: existing
      });
    }
  }
  
  // Sort by match score descending
  return matches.sort((a, b) => b.matchScore - a.matchScore);
}

function calculateCandidateMatch(
  newCandidate: Partial<Candidate>, 
  existing: Candidate
): { matchScore: number; matchedFields: string[] } {
  const scores: { [key: string]: number } = {};
  const matchedFields: string[] = [];
  
  // Email matching (highest weight)
  if (newCandidate.email && existing.email) {
    const emailScore = emailSimilarity(newCandidate.email, existing.email);
    scores.email = emailScore;
    if (emailScore >= 90) {
      matchedFields.push('email');
    }
  }
  
  // Name matching
  if (newCandidate.firstName && existing.firstName) {
    const firstNameScore = stringSimilarity(newCandidate.firstName, existing.firstName);
    scores.firstName = firstNameScore;
    if (firstNameScore >= 80) {
      matchedFields.push('firstName');
    }
  }
  
  if (newCandidate.lastName && existing.lastName) {
    const lastNameScore = stringSimilarity(newCandidate.lastName, existing.lastName);
    scores.lastName = lastNameScore;
    if (lastNameScore >= 80) {
      matchedFields.push('lastName');
    }
  }
  
  // LinkedIn URL matching (very high confidence)
  if (newCandidate.linkedinUrl && existing.linkedinUrl) {
    const linkedinScore = stringSimilarity(newCandidate.linkedinUrl, existing.linkedinUrl);
    scores.linkedinUrl = linkedinScore;
    if (linkedinScore >= 85) {
      matchedFields.push('linkedinUrl');
    }
  }
  
  // Current company matching
  if (newCandidate.currentCompany && existing.currentCompany) {
    const companyScore = stringSimilarity(newCandidate.currentCompany, existing.currentCompany);
    scores.currentCompany = companyScore;
    if (companyScore >= 85) {
      matchedFields.push('currentCompany');
    }
  }
  
  // Current title matching
  if (newCandidate.currentTitle && existing.currentTitle) {
    const titleScore = stringSimilarity(newCandidate.currentTitle, existing.currentTitle);
    scores.currentTitle = titleScore;
    if (titleScore >= 85) {
      matchedFields.push('currentTitle');
    }
  }
  
  // Calculate weighted overall score
  const weights = {
    email: 0.35,      // Highest weight - most unique identifier
    firstName: 0.15,  
    lastName: 0.15,
    linkedinUrl: 0.25, // High weight - unique identifier
    currentCompany: 0.05,
    currentTitle: 0.05
  };
  
  let totalWeight = 0;
  let weightedScore = 0;
  
  for (const [field, score] of Object.entries(scores)) {
    const weight = weights[field as keyof typeof weights] || 0;
    weightedScore += score * weight;
    totalWeight += weight;
  }
  
  const matchScore = totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;
  
  return { matchScore, matchedFields };
}

// Company duplicate detection
export interface CompanyMatchResult {
  existingCompanyId: number;
  matchScore: number;
  matchedFields: string[];
  existingCompany: Company;
}

export async function findCompanyDuplicates(
  newCompany: Partial<Company>,
  threshold: number = 75
): Promise<CompanyMatchResult[]> {
  const existingCompanies = await storage.getCompanies();
  const matches: CompanyMatchResult[] = [];
  
  for (const existing of existingCompanies) {
    const matchResult = calculateCompanyMatch(newCompany, existing);
    
    if (matchResult.matchScore >= threshold) {
      matches.push({
        existingCompanyId: existing.id,
        matchScore: matchResult.matchScore,
        matchedFields: matchResult.matchedFields,
        existingCompany: existing
      });
    }
  }
  
  // Sort by match score descending
  return matches.sort((a, b) => b.matchScore - a.matchScore);
}

function calculateCompanyMatch(
  newCompany: Partial<Company>,
  existing: Company
): { matchScore: number; matchedFields: string[] } {
  const scores: { [key: string]: number } = {};
  const matchedFields: string[] = [];
  
  // Company name matching (primary identifier)
  if (newCompany.name && existing.name) {
    const nameScore = stringSimilarity(newCompany.name, existing.name);
    scores.name = nameScore;
    if (nameScore >= 85) {
      matchedFields.push('name');
    }
  }
  
  // Location matching
  if (newCompany.location && existing.location) {
    const locationScore = stringSimilarity(newCompany.location, existing.location);
    scores.location = locationScore;
    if (locationScore >= 80) {
      matchedFields.push('location');
    }
  }
  
  // Industry matching
  if (newCompany.industry && existing.industry) {
    const industryScore = stringSimilarity(newCompany.industry, existing.industry);
    scores.industry = industryScore;
    if (industryScore >= 85) {
      matchedFields.push('industry');
    }
  }
  
  // Parent company matching (high confidence if present)
  if (newCompany.parentCompany && existing.parentCompany) {
    const parentScore = stringSimilarity(newCompany.parentCompany, existing.parentCompany);
    scores.parentCompany = parentScore;
    if (parentScore >= 85) {
      matchedFields.push('parentCompany');
    }
  }
  
  // Employee size matching (approximate)
  if (newCompany.employeeSize && existing.employeeSize) {
    const sizeDiff = Math.abs(newCompany.employeeSize - existing.employeeSize);
    const avgSize = (newCompany.employeeSize + existing.employeeSize) / 2;
    const sizeScore = Math.max(0, 100 - (sizeDiff / avgSize) * 100);
    scores.employeeSize = sizeScore;
    if (sizeScore >= 80) {
      matchedFields.push('employeeSize');
    }
  }
  
  // Website domain matching (CRITICAL for preventing duplicates)
  if (newCompany.website && existing.website) {
    // Extract domain from URLs
    const extractDomain = (url: string): string => {
      try {
        const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
        return urlObj.hostname.toLowerCase().replace(/^www\./, '');
      } catch {
        return url.toLowerCase().replace(/^www\./, '').replace(/^https?:\/\//, '');
      }
    };
    
    const newDomain = extractDomain(newCompany.website);
    const existingDomain = extractDomain(existing.website);
    
    // Exact domain match = 100% (same company!)
    const websiteScore = newDomain === existingDomain ? 100 : 0;
    scores.website = websiteScore;
    if (websiteScore === 100) {
      matchedFields.push('website');
    }
  }
  
  // Calculate weighted overall score
  const weights = {
    name: 0.35,       // Reduced from 0.5 to make room for website
    website: 0.40,    // HIGH weight - same domain = same company
    location: 0.10,   // Reduced slightly
    industry: 0.10,   // Reduced slightly
    parentCompany: 0.05, // Reduced - less important than website
    employeeSize: 0.0 // Removed weight - unreliable for PE firms
  };
  
  let totalWeight = 0;
  let weightedScore = 0;
  
  for (const [field, score] of Object.entries(scores)) {
    const weight = weights[field as keyof typeof weights] || 0;
    weightedScore += score * weight;
    totalWeight += weight;
  }
  
  const matchScore = totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;
  
  return { matchScore, matchedFields };
}

// Main duplicate detection service
export class DuplicateDetectionService {
  
  // Expose the standalone functions as service methods
  async findCandidateDuplicates(
    newCandidate: Partial<Candidate>,
    threshold: number = 85
  ): Promise<CandidateMatchResult[]> {
    return findCandidateDuplicates(newCandidate, threshold);
  }
  
  async findCompanyDuplicates(
    newCompany: Partial<Company>,
    threshold: number = 75
  ): Promise<CompanyMatchResult[]> {
    return findCompanyDuplicates(newCompany, threshold);
  }
  
  async detectCandidateDuplicates(
    newCandidate: Partial<Candidate>,
    ingestionJobId?: number,
    threshold: number = 85
  ): Promise<void> {
    const matches = await findCandidateDuplicates(newCandidate, threshold);
    
    for (const match of matches) {
      const detection: InsertDuplicateDetection = {
        ingestionJobId: ingestionJobId || null,
        entityType: 'candidate',
        newRecordData: newCandidate,
        existingRecordId: match.existingCandidateId,
        matchScore: match.matchScore,
        matchedFields: match.matchedFields,
        status: 'pending'
      };
      
      await storage.createDuplicateDetection(detection);
    }
  }
  
  async detectCompanyDuplicates(
    newCompany: Partial<Company>,
    ingestionJobId?: number,
    threshold: number = 75
  ): Promise<void> {
    const matches = await findCompanyDuplicates(newCompany, threshold);
    
    for (const match of matches) {
      const detection: InsertDuplicateDetection = {
        ingestionJobId: ingestionJobId || null,
        entityType: 'company',
        newRecordData: newCompany,
        existingRecordId: match.existingCompanyId,
        matchScore: match.matchScore,
        matchedFields: match.matchedFields,
        status: 'pending'
      };
      
      await storage.createDuplicateDetection(detection);
    }
  }
  
  async getPendingDuplicates(entityType?: 'candidate' | 'company') {
    const duplicates = await storage.getDuplicateDetections();
    
    if (entityType) {
      return duplicates.filter(d => d.entityType === entityType && d.status === 'pending');
    }
    
    return duplicates.filter(d => d.status === 'pending');
  }
  
  async resolveDuplicate(
    duplicateId: number, 
    resolution: 'merge' | 'create_new' | 'skip',
    resolvedById: number
  ): Promise<void> {
    await storage.updateDuplicateDetection(duplicateId, {
      status: `resolved_${resolution}` as any,
      resolution,
      resolvedById
    });
  }
}

export const duplicateDetectionService = new DuplicateDetectionService();

/**
 * HASH-BASED DEDUPLICATION (Fast path for LinkedIn + email)
 * For high-volume deduplication
 */
import crypto from "crypto";

export function generateCandidateHash(
  linkedinUrl?: string | null,
  email?: string | null
): string | null {
  if (!linkedinUrl && !email) return null;
  
  const combined = [
    linkedinUrl?.toLowerCase().trim() || "",
    email?.toLowerCase().trim() || ""
  ]
    .filter(Boolean)
    .join("|");

  return crypto.createHash("sha256").update(combined).digest("hex");
}

export async function autoDeduplicate(): Promise<{ mergedCount: number; duplicatesFound: number }> {
  let mergedCount = 0;
  let duplicatesFound = 0;

  const allCandidates = await storage.getCandidates();
  const seen = new Map<string, number>();

  for (const candidate of allCandidates) {
    const hash = generateCandidateHash(candidate.linkedinUrl, candidate.email);

    if (hash) {
      if (seen.has(hash)) {
        duplicatesFound++;
        const primaryId = seen.get(hash)!;
        try {
          // Merge duplicate into primary
          await storage.resolveDuplicateDetection(candidate.id, "merge", primaryId);
          mergedCount++;
        } catch (error) {
          console.error(`[Dedup] Failed to merge candidate ${candidate.id} into ${primaryId}:`, error);
        }
      } else {
        seen.set(hash, candidate.id);
      }
    }
  }

  console.log(`[Deduplication] Found ${duplicatesFound} duplicates, merged ${mergedCount}`);
  return { mergedCount, duplicatesFound };
}