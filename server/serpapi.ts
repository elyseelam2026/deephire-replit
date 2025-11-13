/**
 * SerpAPI Client for External Candidate Sourcing
 * Provides specialized search functions for discovering candidates via LinkedIn and web
 */

export interface LinkedInSearchParams {
  title?: string;           // Job title (e.g., "CFO", "Investment Director")
  location?: string;        // Location (e.g., "New York", "United States")
  company?: string;         // Current or past company
  keywords?: string[];      // Additional keywords (e.g., ["private equity", "buyout"])
  industry?: string;        // Industry filter
  experienceLevel?: string; // Entry, Mid-Senior, Director, Executive
  booleanQuery?: string;    // NAP-driven Boolean query (takes precedence over individual params)
  prioritySignals?: string[]; // NAP priority signals for relevance filtering
  requiredKeywords?: string[]; // Must-have keywords for quality gate
}

export interface LinkedInProfileResult {
  name: string;
  title: string;
  company: string;
  location: string;
  profileUrl: string;
  snippet?: string;         // Brief description/summary
  imageUrl?: string;        // Profile picture URL
  confidence?: number;      // Relevance confidence score (0-100) from pre-scraping filter
}

export interface LinkedInPeopleSearchResult {
  profiles: LinkedInProfileResult[];
  totalResults: number;
  searchQuery: string;
  apiCallsMade: number;
}

/**
 * Search for LinkedIn profiles using SerpAPI's linkedin_people engine
 * This is the PRIMARY external sourcing method - finds NEW candidates from LinkedIn
 * 
 * @param params Search parameters (title, location, keywords, etc.)
 * @param limit Maximum number of profiles to return (default: 20, max: 100)
 * @returns Array of LinkedIn profile results
 */
export async function searchLinkedInPeople(
  params: LinkedInSearchParams,
  limit: number = 20
): Promise<LinkedInPeopleSearchResult> {
  const apiKey = process.env.SERPAPI_API_KEY;
  
  if (!apiKey) {
    throw new Error('SERPAPI_API_KEY not configured - cannot perform external candidate sourcing');
  }

  // Fetch more raw results (30) to ensure we have enough AFTER relevance filtering
  // This allows the filter to reject irrelevant profiles while still delivering 12 quality candidates
  const rawFetchLimit = 30;
  
  // Build search query - prioritize NAP Boolean query if provided
  let searchQuery: string;
  
  if (params.booleanQuery) {
    // Use NAP-driven Boolean query directly (e.g., "(CFO OR \"Chief Financial Officer\") AND (M&A OR scaling)")
    searchQuery = params.booleanQuery;
    console.log(`🎯 [NAP-Driven Search] Using Boolean query: "${searchQuery}"`);
  } else {
    // Fallback: Build simple query from individual params
    const queryParts: string[] = [];
    
    if (params.title) queryParts.push(params.title);
    if (params.location) queryParts.push(params.location);
    if (params.company) queryParts.push(params.company);
    if (params.keywords && params.keywords.length > 0) {
      queryParts.push(...params.keywords);
    }
    
    searchQuery = queryParts.join(' ');
    console.log(`🔍 [LinkedIn People Search] Simple query: "${searchQuery}"`);
  }
  
  if (!searchQuery.trim()) {
    throw new Error('Search query cannot be empty - provide booleanQuery, title, location, or keywords');
  }

  console.log(`   Raw fetch: ${rawFetchLimit} profiles (will filter to 12 high-quality)`);
  
  try {
    // Use Google search with site:linkedin.com/in filter
    // This works with basic SerpAPI plans (linkedin_people engine requires premium)
    const linkedInQuery = `site:linkedin.com/in ${searchQuery}`;
    
    const url = new URL('https://serpapi.com/search.json');
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('engine', 'google');
    url.searchParams.set('q', linkedInQuery);
    url.searchParams.set('num', String(Math.min(rawFetchLimit, 100)));
    
    console.log(`   🌐 Google query: "${linkedInQuery}"`);
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[SerpAPI Error] ${response.status}: ${errorText}`);
      throw new Error(`SerpAPI request failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Check for API errors
    if (data.error) {
      console.error(`[SerpAPI Error] ${data.error}`);
      throw new Error(`SerpAPI error: ${data.error}`);
    }
    
    // Parse results from Google organic results
    const profiles: LinkedInProfileResult[] = [];
    const results = data.organic_results || [];
    
    console.log(`✅ [LinkedIn People Search] Found ${results.length} Google results`);
    
    for (const result of results.slice(0, limit)) {
      // Extract LinkedIn profile URL
      const profileUrl = result.link || '';
      
      // Only process valid LinkedIn profile URLs
      if (!profileUrl.includes('linkedin.com/in/')) {
        continue;
      }
      
      // Extract name from title (Google format: "Name - Title - Company | LinkedIn")
      const titleParts = (result.title || '').split(/[\-|]/);
      const name = titleParts[0]?.trim() || 'Unknown';
      const title = titleParts[1]?.trim() || 'No title available';
      const company = titleParts[2]?.replace('LinkedIn', '').trim() || 'Unknown';
      
      const profile: LinkedInProfileResult = {
        name,
        title,
        company,
        location: params.location || 'Unknown',
        profileUrl,
        snippet: result.snippet || '',
        imageUrl: undefined, // Google results don't include profile images
      };
      
      profiles.push(profile);
      
      console.log(`   📋 Found: ${profile.name} - ${profile.title} at ${profile.company}`);
    }
    
    console.log(`✅ [LinkedIn People Search] Parsed ${profiles.length} valid profiles`);
    
    // RELEVANCE FILTER: Pre-screen before Bright Data scraping
    let filteredProfiles = profiles;
    const shortlistLimit = 12; // Cap at 12 high-quality candidates
    
    if (params.prioritySignals && params.requiredKeywords && 
        (params.prioritySignals.length > 0 || params.requiredKeywords.length > 0)) {
      
      console.log(`🎯 [Relevance Filter] Applying quality gate...`);
      console.log(`   Priority signals: ${params.prioritySignals.join(', ')}`);
      console.log(`   Required keywords: ${params.requiredKeywords.join(', ')}`);
      
      const filterResults: Array<{profile: LinkedInProfileResult; result: { isRelevant: boolean; reason: string; confidence: number }}> = [];
      
      for (const profile of profiles) {
        const result = isRelevantProfile(profile, params.prioritySignals, params.requiredKeywords);
        filterResults.push({ profile, result });
        
        const confidenceLabel = result.isRelevant ? '✅ ACCEPT' : '❌ REJECT';
        console.log(`   ${confidenceLabel} [${result.confidence}%]: ${profile.name ?? 'Unknown'} - ${profile.title} | ${result.reason}`);
      }
      
      filteredProfiles = filterResults
        .filter(({ result }) => result.isRelevant)
        .map(({ profile, result }) => ({ ...profile, confidence: result.confidence }));
      
      console.log(`🎯 [Relevance Filter] ${filteredProfiles.length}/${profiles.length} profiles passed quality gate`);
    }
    
    // Cap at shortlist limit (12 high-quality candidates)
    const finalProfiles = filteredProfiles.slice(0, shortlistLimit);
    
    if (filteredProfiles.length > shortlistLimit) {
      console.log(`📊 [Shortlist] Capped to ${shortlistLimit} top candidates (${filteredProfiles.length - shortlistLimit} excluded)`);
    }
    
    return {
      profiles: finalProfiles,
      totalResults: data.total_results || results.length,
      searchQuery,
      apiCallsMade: 1,
    };
    
  } catch (error) {
    console.error('[LinkedIn People Search] Error:', error);
    throw error;
  }
}

/**
 * Search for LinkedIn profiles using Google search (fallback method)
 * Use this when linkedin_people engine doesn't work or for broader searches
 * 
 * @param params Search parameters
 * @param limit Maximum number of profiles to return
 * @returns Array of LinkedIn profile URLs
 */
export async function searchLinkedInViaGoogle(
  params: LinkedInSearchParams,
  limit: number = 20
): Promise<LinkedInPeopleSearchResult> {
  const apiKey = process.env.SERPAPI_API_KEY;
  
  if (!apiKey) {
    throw new Error('SERPAPI_API_KEY not configured');
  }

  // Build Google search query targeting LinkedIn profiles
  const queryParts: string[] = ['site:linkedin.com/in'];
  
  if (params.title) queryParts.push(`"${params.title}"`);
  if (params.location) queryParts.push(params.location);
  if (params.company) queryParts.push(params.company);
  if (params.keywords && params.keywords.length > 0) {
    queryParts.push(...params.keywords);
  }
  
  const searchQuery = queryParts.join(' ');
  
  console.log(`🔍 [Google LinkedIn Search] Query: "${searchQuery}"`);
  
  try {
    const url = new URL('https://serpapi.com/search.json');
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('engine', 'google');
    url.searchParams.set('q', searchQuery);
    url.searchParams.set('num', String(Math.min(limit, 100)));
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`SerpAPI request failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(`SerpAPI error: ${data.error}`);
    }
    
    const profiles: LinkedInProfileResult[] = [];
    const results = data.organic_results || [];
    
    for (const result of results) {
      if (result.link && result.link.includes('linkedin.com/in/')) {
        const profile: LinkedInProfileResult = {
          name: result.title || 'Unknown',
          title: extractTitleFromSnippet(result.snippet || ''),
          company: extractCompanyFromSnippet(result.snippet || ''),
          location: params.location || 'Unknown',
          profileUrl: result.link,
          snippet: result.snippet,
        };
        
        profiles.push(profile);
      }
    }
    
    console.log(`✅ [Google LinkedIn Search] Found ${profiles.length} profiles`);
    
    return {
      profiles,
      totalResults: results.length,
      searchQuery,
      apiCallsMade: 1,
    };
    
  } catch (error) {
    console.error('[Google LinkedIn Search] Error:', error);
    throw error;
  }
}

/**
 * RELEVANCE FILTER: Pre-screening before expensive Bright Data scraping
 * Ensures only candidates matching NAP priority signals reach the pipeline
 */

/**
 * Normalize search text for matching: lowercase, remove special chars, expand abbreviations
 */
function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[&\/\\#,+()$~%.'":*?<>{}]/g, ' ')  // Remove special chars
    .replace(/\s+/g, ' ')                         // Collapse whitespace
    .replace(/\b(pe)\b/gi, 'private equity')      // Expand PE → private equity
    .replace(/\b(ib)\b/gi, 'investment banking')  // Expand IB → investment banking
    .replace(/\b(vc)\b/gi, 'venture capital')     // Expand VC → venture capital
    .replace(/\b(m&a|ma|m and a)\b/gi, 'mergers and acquisitions') // Expand M&A
    .replace(/\b(lbo)\b/gi, 'leveraged buyout')   // Expand LBO
    .replace(/\b(fp&a|fpa)\b/gi, 'financial planning and analysis') // Expand FP&A
    .trim();
}

/**
 * Sanitize signals: Remove useless entries, normalize, expand abbreviations
 */
function sanitizeSignals(signals: string[]): string[] {
  const uselessPatterns = [
    /^\d+\+?\s*years?/i,        // "2+ years", "5 years experience"
    /experience$/i,              // "experience"
    /minimum$/i,                 // "minimum"
  ];
  
  return signals
    .filter(signal => !uselessPatterns.some(pattern => pattern.test(signal)))
    .map(signal => normalizeSearchText(signal))
    .filter(signal => signal.length > 0);
}

/**
 * Check if profile is relevant based on NAP priority signals + required keywords
 * Uses OR logic (match EITHER signal OR keyword) to avoid over-filtering
 * SerpAPI often returns minimal snippets, so strict AND logic rejects too many valid profiles
 */
function isRelevantProfile(
  profile: LinkedInProfileResult, 
  prioritySignals: string[], 
  requiredKeywords: string[]
): { isRelevant: boolean; reason: string; confidence: number } {
  
  // Build search text from all available fields
  const urlSlug = profile.profileUrl.split('/in/')[1]?.split('/')[0] || '';
  const searchText = normalizeSearchText(
    `${profile.title} ${profile.snippet || ''} ${profile.company} ${urlSlug}`
  );
  
  // Sanitize inputs
  const cleanSignals = sanitizeSignals(prioritySignals);
  const cleanKeywords = sanitizeSignals(requiredKeywords);
  
  // Check for matches
  const matchedSignals = cleanSignals.filter(signal => searchText.includes(signal));
  const matchedKeywords = cleanKeywords.filter(keyword => searchText.includes(keyword));
  
  // RELAXED LOGIC: Accept if matches EITHER priority signal OR required keyword
  // This prevents over-filtering when SerpAPI returns minimal snippets
  if (matchedSignals.length === 0 && matchedKeywords.length === 0) {
    return {
      isRelevant: false,
      reason: `No matches (signals: ${cleanSignals.slice(0, 3).join(', ')}, keywords: ${cleanKeywords.slice(0, 3).join(', ')})`,
      confidence: 0
    };
  }
  
  // Calculate confidence score based on match quality
  let confidence = 0;
  if (matchedSignals.length > 0 && matchedKeywords.length > 0) {
    confidence = 100; // Both matched → highest confidence
  } else if (matchedSignals.length > 0) {
    confidence = 80; // Priority signal matched → high confidence
  } else {
    confidence = 60; // Only keyword matched → medium confidence
  }
  
  const matchedItems = [
    ...matchedSignals.map(s => `signal:"${s}"`),
    ...matchedKeywords.map(k => `keyword:"${k}"`)
  ];
  
  return {
    isRelevant: true,
    reason: `Matched: ${matchedItems.join(', ')}`,
    confidence
  };
}

// Helper functions
function extractTitleFromSnippet(snippet: string): string {
  // Try to extract job title from snippet
  // Common patterns: "Name - Title at Company", "Title · Company"
  const patterns = [
    /[-–—]\s*([^·]+?)\s*(?:at|·)/i,
    /([^-]+?)\s*(?:at|·)\s*\w+/i,
  ];
  
  for (const pattern of patterns) {
    const match = snippet.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return 'No title available';
}

function extractCompanyFromSnippet(snippet: string): string {
  // Try to extract company from snippet
  const patterns = [
    /(?:at|·)\s*([^-·]+?)(?:\s*[-–—·]|$)/i,
  ];
  
  for (const pattern of patterns) {
    const match = snippet.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return 'Unknown';
}

/**
 * Validate if a string is a valid LinkedIn profile URL
 */
export function isValidLinkedInUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.includes('linkedin.com') && urlObj.pathname.includes('/in/');
  } catch {
    return false;
  }
}
