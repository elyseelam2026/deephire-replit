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
}

export interface LinkedInProfileResult {
  name: string;
  title: string;
  company: string;
  location: string;
  profileUrl: string;
  snippet?: string;         // Brief description/summary
  imageUrl?: string;        // Profile picture URL
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

  // Build search query
  const queryParts: string[] = [];
  
  if (params.title) queryParts.push(params.title);
  if (params.location) queryParts.push(params.location);
  if (params.company) queryParts.push(params.company);
  if (params.keywords && params.keywords.length > 0) {
    queryParts.push(...params.keywords);
  }
  
  const searchQuery = queryParts.join(' ');
  
  if (!searchQuery.trim()) {
    throw new Error('Search query cannot be empty - provide at least title, location, or keywords');
  }

  console.log(`🔍 [LinkedIn People Search] Searching for: "${searchQuery}"`);
  console.log(`   Limit: ${limit} profiles`);
  
  try {
    // Use Google search with site:linkedin.com/in filter
    // This works with basic SerpAPI plans (linkedin_people engine requires premium)
    const linkedInQuery = `site:linkedin.com/in ${searchQuery}`;
    
    const url = new URL('https://serpapi.com/search.json');
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('engine', 'google');
    url.searchParams.set('q', linkedInQuery);
    url.searchParams.set('num', String(Math.min(limit, 100)));
    
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
    
    return {
      profiles,
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
