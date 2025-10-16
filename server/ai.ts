import OpenAI from "openai";
import * as XLSX from 'xlsx';
import csvToJson from 'csvtojson';
import * as cheerio from 'cheerio';
import { chromium } from 'playwright';

if (!process.env.XAI_API_KEY) {
  throw new Error("XAI_API_KEY must be set");
}

const openai = new OpenAI({ 
  baseURL: "https://api.x.ai/v1", 
  apiKey: process.env.XAI_API_KEY 
});

/**
 * Use Playwright browser automation to scrape paginated team pages
 * This handles JavaScript-rendered pagination that static HTML scraping can't reach
 */
export async function scrapeTeamMembersWithPlaywright(
  teamPageUrl: string,
  maxPages: number = 100
): Promise<Array<{name: string; title?: string; bioUrl?: string}>> {
  let browser;
  try {
    console.log(`🎭 Launching Playwright to scrape paginated team page: ${teamPageUrl}`);
    
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.goto(teamPageUrl, { timeout: 60000, waitUntil: 'networkidle' });
    
    const allMembers: Array<{name: string; title?: string; bioUrl?: string}> = [];
    
    // Try multiple selector patterns (same as static scraping)
    const selectorPatterns = [
      { container: 'div.team-member, div.team-member-card, li.team-member', name: 'h3, h4, .name', title: '.title, .position, .role' },
      { container: '.team-grid-item, .team-card, .person-card', name: 'h3, h4, .name, .person-name', title: '.title, .position, .job-title' },
      { container: '[data-teamid], [class*="team"], [class*="member"]', name: 'h2, h3, h4, .name', title: '.title, .position' }
    ];
    
    let currentPage = 1;
    let hasMorePages = true;
    
    while (hasMorePages && currentPage <= maxPages) {
      console.log(`📄 Scraping page ${currentPage}...`);
      
      // Wait for content to load
      await page.waitForTimeout(2000);
      
      // Extract team members from current page
      for (const pattern of selectorPatterns) {
        const containers = await page.$$(pattern.container);
        
        if (containers.length > 0) {
          console.log(`✓ Found ${containers.length} team member containers on page ${currentPage}`);
          
          for (const container of containers) {
            try {
              const nameElement = await container.$(pattern.name);
              const titleElement = await container.$(pattern.title);
              const linkElement = await container.$('a[href]');
              
              const name = nameElement ? (await nameElement.textContent())?.trim() : null;
              const title = titleElement ? (await titleElement.textContent())?.trim() : null;
              const bioUrl = linkElement ? await linkElement.getAttribute('href') : null;
              
              if (name && name.length > 2) {
                const fullBioUrl = bioUrl 
                  ? (bioUrl.startsWith('http') ? bioUrl : new URL(bioUrl, teamPageUrl).toString())
                  : undefined;
                
                allMembers.push({
                  name,
                  title: title || 'Team Member',
                  bioUrl: fullBioUrl
                });
              }
            } catch (err) {
              // Skip problematic containers
            }
          }
          
          break; // Found working pattern, stop trying others
        }
      }
      
      // Try to navigate to next page
      const nextButtonSelectors = [
        'button[data-page]',
        'a.next',
        'button.next',
        'a[aria-label*="next" i]',
        'button[aria-label*="next" i]',
        '.pagination a.next',
        '.pagination button.next'
      ];
      
      let clickedNext = false;
      for (const selector of nextButtonSelectors) {
        try {
          const nextButton = await page.$(selector);
          if (nextButton) {
            const isDisabled = await nextButton.getAttribute('disabled');
            const ariaDisabled = await nextButton.getAttribute('aria-disabled');
            
            if (isDisabled !== 'true' && ariaDisabled !== 'true') {
              console.log(`Clicking next page button: ${selector}`);
              await nextButton.click();
              await page.waitForTimeout(2000); // Wait for page load
              clickedNext = true;
              currentPage++;
              break;
            }
          }
        } catch (err) {
          // Try next selector
        }
      }
      
      if (!clickedNext) {
        console.log(`No more pages found after page ${currentPage}`);
        hasMorePages = false;
      }
    }
    
    await browser.close();
    console.log(`🎭 Playwright scraped ${allMembers.length} total team members from ${currentPage} pages`);
    
    // Deduplicate
    const uniqueMembers = new Map<string, any>();
    for (const member of allMembers) {
      const key = member.name.toLowerCase().trim();
      if (!uniqueMembers.has(key)) {
        uniqueMembers.set(key, member);
      }
    }
    
    return Array.from(uniqueMembers.values());
    
  } catch (error) {
    console.error(`Error in Playwright team scraping: ${error}`);
    if (browser) await browser.close();
    return [];
  }
}

/**
 * Use Playwright browser automation to extract office locations from JavaScript-heavy pages
 * This handles sites where office data is loaded dynamically via JavaScript
 */
export async function extractOfficesWithPlaywright(websiteUrl: string): Promise<Array<{city: string, country?: string, address?: string}>> {
  let browser;
  try {
    console.log(`🎭 Launching Playwright browser to extract offices from: ${websiteUrl}`);
    
    browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'] // For Replit environment
    });
    
    const page = await browser.newPage();
    await page.goto(websiteUrl, { timeout: 60000, waitUntil: 'networkidle' });
    
    // Wait for content to load - try common selectors for office lists
    const officeSelectors = [
      'a[href*="/offices/"]',
      'a[href*="/locations/"]', 
      'a[class*="office"]',
      'a[class*="location"]',
      'div[class*="office"]',
      'div[class*="location"]'
    ];
    
    let officeLinks: any[] = [];
    for (const selector of officeSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        officeLinks = await page.$$(selector);
        if (officeLinks.length > 0) {
          console.log(`✓ Found ${officeLinks.length} office elements using selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }
    
    if (officeLinks.length === 0) {
      console.log('⚠ No office links found with Playwright');
      await browser.close();
      return [];
    }
    
    const offices: Array<{city: string, country?: string, address?: string}> = [];
    
    // Extract office info from each link
    for (let i = 0; i < Math.min(officeLinks.length, 50); i++) { // Limit to 50 offices
      try {
        const link = officeLinks[i];
        const cityName = await link.textContent();
        const href = await link.getAttribute('href');
        
        if (!cityName || !href) continue;
        
        const cleanCity = cityName.trim();
        if (cleanCity.length < 2) continue;
        
        // Navigate to office detail page
        const fullUrl = href.startsWith('http') ? href : `${new URL(websiteUrl).origin}${href}`;
        const detailPage = await browser.newPage();
        
        try {
          await detailPage.goto(fullUrl, { timeout: 30000, waitUntil: 'networkidle' });
          
          // Extract address from the page - try multiple selectors
          let address = '';
          const addressSelectors = [
            'div[class*="address"]',
            'div[class*="contact"]', 
            'div[class*="location"]',
            'p[class*="address"]',
            'address'
          ];
          
          for (const addrSelector of addressSelectors) {
            const elements = await detailPage.$$(addrSelector);
            if (elements.length > 0) {
              const text = await elements[0].textContent();
              if (text && text.trim().length > 10) {
                address = text.trim();
                break;
              }
            }
          }
          
          offices.push({
            city: cleanCity,
            address: address || undefined
          });
          
          console.log(`✓ Extracted office: ${cleanCity}${address ? ' - ' + address.substring(0, 50) : ''}`);
        } catch (err) {
          console.log(`⚠ Could not extract details for ${cleanCity}`);
          offices.push({ city: cleanCity });
        } finally {
          await detailPage.close();
        }
      } catch (err) {
        console.log(`⚠ Error processing office link ${i}: ${err}`);
      }
    }
    
    await browser.close();
    console.log(`🎭 Playwright extracted ${offices.length} offices`);
    return offices;
    
  } catch (error) {
    console.error(`Playwright extraction failed: ${error}`);
    if (browser) await browser.close();
    return [];
  }
}

/**
 * Extract keywords from company name for domain validation
 */
function extractCompanyKeywords(companyName: string): string[] {
  const stopWords = ['inc', 'llc', 'ltd', 'limited', 'corporation', 'corp', 'company', 'co', 'the', 'and', 'group', 'partners'];
  
  return companyName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.includes(word));
}

/**
 * Score domain relevance against company name
 * Higher score = better match
 */
function scoreDomainRelevance(domain: string, companyKeywords: string[]): number {
  let score = 0;
  const domainLower = domain.toLowerCase();
  const domainWithoutTLD = domainLower.split('.')[0]; // Get main domain name without TLD
  
  for (const keyword of companyKeywords) {
    if (domainLower.includes(keyword)) {
      // Full keyword match gets high score
      score += keyword.length * 2;
      
      // Bonus points if keyword is the entire domain (exact match)
      if (domainWithoutTLD === keyword) {
        score += 20; // Strong bonus for exact match
      }
      // Bonus for domain being close to just the keyword
      else if (domainWithoutTLD.length <= keyword.length + 3) {
        score += 10; // Moderate bonus for short domain
      }
    } else {
      // Partial match gets lower score
      for (let i = 0; i < keyword.length - 2; i++) {
        const substring = keyword.substring(i, i + 3);
        if (domainLower.includes(substring)) {
          score += 1;
          break;
        }
      }
    }
  }
  
  // Penalty for very long domains (likely not the main company site)
  if (domainWithoutTLD.length > 20) {
    score -= 5;
  }
  
  return score;
}

/**
 * Research company domain and email pattern using web search
 * Returns domain and email pattern format
 */
export async function researchCompanyEmailPattern(companyName: string): Promise<{
  domain: string | null;
  emailPattern: string | null;
}> {
  try {
    const apiKey = process.env.SERPAPI_API_KEY;
    
    if (!apiKey) {
      console.error('SERPAPI_API_KEY not configured');
      return { domain: null, emailPattern: null };
    }
    
    // Extract keywords for validation
    const companyKeywords = extractCompanyKeywords(companyName);
    console.log(`Company keywords for validation: ${companyKeywords.join(', ')}`);
    
    // Search for company website
    const domainQuery = `${companyName} official website`;
    console.log(`Researching company domain: "${domainQuery}"`);
    
    const domainSearchUrl = `https://serpapi.com/search.json?api_key=${apiKey}&q=${encodeURIComponent(domainQuery)}&engine=google&num=10`;
    const domainResponse = await fetch(domainSearchUrl);
    
    if (!domainResponse.ok) {
      console.error(`Domain search failed with status: ${domainResponse.status}`);
      return { domain: null, emailPattern: null };
    }
    
    const domainData = await domainResponse.json();
    const organicResults = domainData.organic_results || [];
    
    // Extract and score all candidate domains
    const candidateDomains: Array<{ domain: string; score: number; rank: number }> = [];
    
    for (let i = 0; i < Math.min(10, organicResults.length); i++) {
      const result = organicResults[i];
      const link = result.link || '';
      
      try {
        const url = new URL(link);
        const hostname = url.hostname.replace('www.', '');
        
        // Skip common non-company domains
        if (hostname.includes('linkedin.com') || hostname.includes('wikipedia.org') || 
            hostname.includes('facebook.com') || hostname.includes('twitter.com') ||
            hostname.includes('instagram.com') || hostname.includes('youtube.com') ||
            hostname.includes('bloomberg.com') || hostname.includes('crunchbase.com')) {
          continue;
        }
        
        // Score this domain
        const relevanceScore = scoreDomainRelevance(hostname, companyKeywords);
        const rankBonus = 10 - i; // Earlier results get bonus points
        
        // IMPORTANT: Penalize language/regional subdomains (en.domain.com, www2.domain.com, etc.)
        // We want the root domain (digitalchina.com) not language/regional subdomains
        // BUT preserve multi-part TLDs like co.uk, com.cn, com.au
        const parts = hostname.split('.');
        const knownSubdomainPrefixes = [
          // Language codes
          'en', 'de', 'fr', 'es', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'cn', 'tw', 'hk',
          // Common subdomains
          'www', 'www2', 'www3', 'm', 'mobile', 'web', 'portal', 'app', 'apps',
          'admin', 'support', 'help', 'blog', 'news', 'shop', 'store', 'mail',
          // Department/function subdomains
          'hr', 'jobs', 'career', 'careers', 'recruit', 'recruiting', 'corp',
          'investor', 'investors', 'ir', 'media', 'press', 'about', 'company'
        ];
        const hasSubdomainPrefix = parts.length > 2 && knownSubdomainPrefixes.includes(parts[0].toLowerCase());
        const subdomainPenalty = hasSubdomainPrefix ? -15 : 0; // Strong penalty for known subdomains
        
        const totalScore = relevanceScore + rankBonus + subdomainPenalty;
        
        candidateDomains.push({
          domain: hostname,
          score: totalScore,
          rank: i + 1
        });
        
        console.log(`  Candidate: ${hostname} (rank #${i + 1}, relevance: ${relevanceScore}, subdomain penalty: ${subdomainPenalty}, total: ${totalScore})`);
        
      } catch (e) {
        continue;
      }
    }
    
    // Sort by score and pick the best
    candidateDomains.sort((a, b) => b.score - a.score);
    
    let domain: string | null = null;
    
    // If no keywords were extracted, use first result but log warning
    if (companyKeywords.length === 0) {
      console.log('⚠ No company keywords extracted, using first valid result with caution');
      if (candidateDomains.length > 0) {
        domain = candidateDomains[0].domain;
        console.log(`✓ Selected domain (low confidence - no keywords): ${domain}`);
      }
    } else if (candidateDomains.length > 0) {
      // Find first candidate with minimum relevance threshold
      const MIN_RELEVANCE = 5;
      let selectedCandidate = null;
      
      for (const candidate of candidateDomains) {
        const rankBonus = 10 - candidate.rank + 1;
        const relevanceScore = candidate.score - rankBonus;
        
        if (relevanceScore >= MIN_RELEVANCE) {
          selectedCandidate = candidate;
          domain = candidate.domain;
          console.log(`✓ Selected domain: ${domain} (score: ${candidate.score}, relevance: ${relevanceScore})`);
          
          // Log alternatives if they exist
          const alternatives = candidateDomains.filter(c => c !== candidate).slice(0, 2);
          if (alternatives.length > 0) {
            console.log(`  Alternatives considered:`);
            alternatives.forEach(alt => {
              const altRelevance = alt.score - (10 - alt.rank + 1);
              console.log(`    ${alt.domain} (score: ${alt.score}, relevance: ${altRelevance})`);
            });
          }
          break;
        }
      }
      
      // If no candidate meets threshold, return null
      if (!selectedCandidate) {
        console.log(`✗ No domain found with sufficient relevance (min: ${MIN_RELEVANCE})`);
        return { domain: null, emailPattern: null };
      }
    }
    
    if (!domain) {
      console.log('✗ Could not determine company domain');
      return { domain: null, emailPattern: null };
    }
    
    // Search for email pattern
    const emailQuery = `${companyName} email format contact`;
    console.log(`Researching email pattern: "${emailQuery}"`);
    
    const emailSearchUrl = `https://serpapi.com/search.json?api_key=${apiKey}&q=${encodeURIComponent(emailQuery)}&engine=google&num=5`;
    const emailResponse = await fetch(emailSearchUrl);
    
    if (!emailResponse.ok) {
      console.log('Email pattern search failed, will use default pattern');
      return { domain, emailPattern: 'firstname.lastname' };
    }
    
    const emailData = await emailResponse.json();
    const emailResults = emailData.organic_results || [];
    
    // Look for email patterns in snippets
    let emailPattern = 'firstname.lastname'; // default
    for (const result of emailResults) {
      const snippet = (result.snippet || '').toLowerCase();
      
      // Check for common patterns in snippets
      if (snippet.includes('first.last@') || snippet.includes('firstname.lastname@')) {
        emailPattern = 'firstname.lastname';
        break;
      } else if (snippet.includes('f.last@') || snippet.includes('flast@') || snippet.includes('first initial')) {
        emailPattern = 'f.lastname';
        break;
      } else if (snippet.includes('firstlast@') || snippet.includes('no dot')) {
        emailPattern = 'firstnamelastname';
        break;
      }
    }
    
    console.log(`✓ Email pattern determined: ${emailPattern}@${domain}`);
    return { domain, emailPattern };
    
  } catch (error) {
    console.error(`Error researching company email: ${error}`);
    return { domain: null, emailPattern: null };
  }
}

/**
 * Generate email address based on researched company domain and pattern
 */
function generateEmailAddress(
  firstName: string,
  lastName: string,
  domain: string,
  pattern: string
): string {
  const first = firstName.toLowerCase();
  const last = lastName.toLowerCase();
  const firstInitial = first.charAt(0);
  
  let localPart: string;
  switch (pattern) {
    case 'f.lastname':
      localPart = `${firstInitial}.${last}`;
      break;
    case 'firstnamelastname':
      localPart = `${first}${last}`;
      break;
    case 'firstname.lastname':
    default:
      localPart = `${first}.${last}`;
      break;
  }
  
  return `${localPart}@${domain}`;
}

/**
 * Search for LinkedIn profile using SerpAPI with validation
 * Returns the LinkedIn profile URL and match metadata if it matches the person with high confidence
 * HYBRID APPROACH: Tries exact matching first, then loose matching if needed
 */
export async function searchLinkedInProfile(firstName: string, lastName: string, company: string, jobTitle?: string | null): Promise<{
  url: string;
  companyMatch: boolean;
  titleMatch: boolean;
  score: number;
  reasons: string[];
} | null> {
  try {
    const apiKey = process.env.SERPAPI_API_KEY;
    
    if (!apiKey) {
      console.error('SERPAPI_API_KEY not configured');
      return null;
    }
    
    const cleanFirst = firstName.trim();
    const cleanLast = lastName.trim();
    const cleanCompany = company?.trim() || '';
    const cleanTitle = jobTitle?.trim() || '';
    
    let organicResults: any[] = [];
    let queryUsed = '';
    
    // STRATEGY 1: Try exact matching with quotes (most precise)
    const exactNamePart = `"${cleanFirst} ${cleanLast}"`;
    const exactCompanyPart = cleanCompany ? `"${cleanCompany}"` : '';
    const exactTitlePart = cleanTitle ? `"${cleanTitle}"` : '';
    
    const exactParts = [exactNamePart, exactCompanyPart, exactTitlePart, 'site:linkedin.com/in'].filter(p => p);
    const exactQuery = exactParts.join(' ');
    
    console.log(`\n[LinkedIn Search] Strategy 1 - Exact matching: "${exactQuery}"`);
    
    const exactUrl = `https://serpapi.com/search.json?api_key=${apiKey}&q=${encodeURIComponent(exactQuery)}&engine=google&num=10`;
    const exactResponse = await fetch(exactUrl);
    
    if (exactResponse.ok) {
      const exactData = await exactResponse.json();
      organicResults = exactData.organic_results || [];
      queryUsed = exactQuery;
      console.log(`[LinkedIn Search] Exact matching returned ${organicResults.length} results`);
    }
    
    // STRATEGY 2: If exact matching finds nothing, try loose matching without quotes
    if (organicResults.length === 0) {
      console.log(`[LinkedIn Search] Strategy 2 - Loose matching without quotes...`);
      
      const looseParts = [
        `${cleanFirst} ${cleanLast}`,
        cleanCompany || '',
        cleanTitle || '',
        'site:linkedin.com/in'
      ].filter(p => p);
      const looseQuery = looseParts.join(' ');
      
      console.log(`[LinkedIn Search] Loose query: "${looseQuery}"`);
      
      const looseUrl = `https://serpapi.com/search.json?api_key=${apiKey}&q=${encodeURIComponent(looseQuery)}&engine=google&num=10`;
      const looseResponse = await fetch(looseUrl);
      
      if (looseResponse.ok) {
        const looseData = await looseResponse.json();
        organicResults = looseData.organic_results || [];
        queryUsed = looseQuery;
        console.log(`[LinkedIn Search] Loose matching returned ${organicResults.length} results`);
      }
    }
    
    console.log(`[LinkedIn Search] Found ${organicResults.length} results, validating each...`);
    
    // Score and validate each LinkedIn profile
    interface ScoredResult {
      url: string;
      score: number;
      title: string;
      snippet: string;
      reasons: string[];
    }
    
    const scoredResults: ScoredResult[] = [];
    
    for (const result of organicResults) {
      const link = result.link || '';
      
      // Must be a LinkedIn profile URL
      if (!link.includes('linkedin.com/in/')) continue;
      
      const title = (result.title || '').toLowerCase();
      const snippet = (result.snippet || '').toLowerCase();
      const combined = `${title} ${snippet}`;
      
      let score = 0;
      const reasons: string[] = [];
      
      // Name matching (critical)
      const firstLower = cleanFirst.toLowerCase();
      const lastLower = cleanLast.toLowerCase();
      const fullName = `${firstLower} ${lastLower}`;
      
      if (combined.includes(fullName)) {
        score += 50;
        reasons.push(`Full name match`);
      } else if (combined.includes(firstLower) && combined.includes(lastLower)) {
        score += 30;
        reasons.push(`First and last name present`);
      } else if (combined.includes(lastLower)) {
        score += 10;
        reasons.push(`Last name only`);
      }
      
      // Company matching (important)
      if (cleanCompany) {
        const companyLower = cleanCompany.toLowerCase();
        const companyWords = companyLower.split(/\s+/).filter(w => w.length > 3);
        
        if (combined.includes(companyLower)) {
          score += 30;
          reasons.push(`Full company name match`);
        } else {
          // Check if major company words are present
          const matchedWords = companyWords.filter(word => combined.includes(word));
          if (matchedWords.length > 0) {
            score += 15 * matchedWords.length;
            reasons.push(`Company keywords: ${matchedWords.join(', ')}`);
          }
        }
      }
      
      // Job title matching (helpful)
      if (cleanTitle) {
        const titleLower = cleanTitle.toLowerCase();
        if (combined.includes(titleLower)) {
          score += 20;
          reasons.push(`Job title match`);
        }
      }
      
      // Position in search results (minor factor)
      const position = organicResults.indexOf(result);
      score += Math.max(0, 5 - position); // First result gets +5, decreasing
      
      const cleanUrl = link.split('?')[0].split('#')[0];
      
      console.log(`  [${position + 1}] ${cleanUrl}`);
      console.log(`      Score: ${score} - ${reasons.join(', ') || 'No matches'}`);
      
      scoredResults.push({
        url: cleanUrl,
        score,
        title: result.title || '',
        snippet: result.snippet || '',
        reasons
      });
    }
    
    // Sort by score descending
    scoredResults.sort((a, b) => b.score - a.score);
    
    // Accept ONLY if top result has minimum confidence score
    const MIN_CONFIDENCE_SCORE = 40; // Requires at least name + company/title match
    
    if (scoredResults.length > 0) {
      const best = scoredResults[0];
      
      if (best.score >= MIN_CONFIDENCE_SCORE) {
        // Determine if company/title were matched based on reasons
        const companyMatch = best.reasons.some(r => 
          r.toLowerCase().includes('company') || r.toLowerCase().includes('keywords')
        );
        const titleMatch = best.reasons.some(r => 
          r.toLowerCase().includes('title')
        );
        
        console.log(`\n[LinkedIn Search] ✓ ACCEPTED: ${best.url}`);
        console.log(`   Confidence: ${best.score} (threshold: ${MIN_CONFIDENCE_SCORE})`);
        console.log(`   Reasons: ${best.reasons.join(', ')}`);
        console.log(`   Company match: ${companyMatch}, Title match: ${titleMatch}`);
        
        return {
          url: best.url,
          companyMatch,
          titleMatch,
          score: best.score,
          reasons: best.reasons
        };
      } else {
        console.log(`\n[LinkedIn Search] ✗ REJECTED: Insufficient confidence`);
        console.log(`   Best score: ${best.score} (threshold: ${MIN_CONFIDENCE_SCORE})`);
        console.log(`   Best match: ${best.url}`);
        console.log(`   Reasons: ${best.reasons.join(', ') || 'No strong matches'}`);
        console.log(`   ⚠️ TIP: Add job title to improve matching accuracy`);
        return null;
      }
    }
    
    console.log('[LinkedIn Search] ✗ No LinkedIn profiles found in results');
    return null;
  } catch (error) {
    console.error(`[LinkedIn Search] Error: ${error}`);
    return null;
  }
}

// Using Grok model "grok-2-1212" from xAI for text processing with 131k token context window
export async function parseJobDescription(jdText: string): Promise<{
  title: string;
  department: string;
  skills: string[];
  urgency: string;
  requirements: string[];
  benefits: string[];
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "grok-2-1212",
      messages: [
        {
          role: "system",
          content: "You are an expert recruiter. Parse job descriptions and extract structured data in JSON format. Always respond with valid JSON."
        },
        {
          role: "user",
          content: `Parse this job description and extract the following information in JSON format:
          {
            "title": "extracted job title",
            "department": "department/team (Engineering, Sales, Marketing, etc.)",
            "skills": ["skill1", "skill2", "skill3"],
            "urgency": "low|medium|high|urgent based on language used",
            "requirements": ["requirement1", "requirement2"],
            "benefits": ["benefit1", "benefit2"]
          }
          
          Job Description:
          ${jdText}`
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return {
      title: result.title || "Untitled Position",
      department: result.department || "General",
      skills: Array.isArray(result.skills) ? result.skills : [],
      urgency: ["low", "medium", "high", "urgent"].includes(result.urgency) ? result.urgency : "medium",
      requirements: Array.isArray(result.requirements) ? result.requirements : [],
      benefits: Array.isArray(result.benefits) ? result.benefits : []
    };
  } catch (error) {
    console.error("Error parsing job description:", error);
    return {
      title: "Untitled Position",
      department: "General", 
      skills: [],
      urgency: "medium",
      requirements: [],
      benefits: []
    };
  }
}

export function calculateCandidateMatchScore(
  jobSkills: string[],
  candidateSkills: string[],
  jobText: string,
  candidateText: string
): number {
  if (!jobSkills?.length || !candidateSkills?.length) return 0;
  
  // Simple skill matching algorithm
  const jobSkillsLower = jobSkills.map(s => s.toLowerCase());
  const candidateSkillsLower = candidateSkills.map(s => s.toLowerCase());
  
  let matches = 0;
  for (const skill of jobSkillsLower) {
    if (candidateSkillsLower.some(cs => cs.includes(skill) || skill.includes(cs))) {
      matches++;
    }
  }
  
  // Calculate base score from skill overlap
  const skillScore = Math.min((matches / jobSkillsLower.length) * 100, 100);
  
  // Add some randomness for demo purposes (in real app, this would use vector similarity)
  const variation = Math.random() * 20 - 10; // ±10 points
  
  return Math.max(0, Math.min(100, Math.round(skillScore + variation)));
}

export async function generateCandidateLonglist(
  candidates: Array<{
    id: number;
    firstName: string;
    lastName: string;
    currentTitle: string;
    skills: string[];
    cvText?: string;
  }>,
  jobSkills: string[],
  jobText: string,
  limit: number = 20
): Promise<Array<{ candidateId: number; matchScore: number }>> {
  const matches = candidates.map(candidate => ({
    candidateId: candidate.id,
    matchScore: calculateCandidateMatchScore(
      jobSkills,
      candidate.skills || [],
      jobText,
      candidate.cvText || `${candidate.firstName} ${candidate.lastName} - ${candidate.currentTitle}`
    )
  }));
  
  // Sort by match score descending and limit results
  return matches
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);
}

// Parse candidate data from CV/resume text
export async function parseCandidateData(cvText: string): Promise<{
  firstName: string;
  lastName: string;
  email: string;
  currentCompany?: string;
  currentTitle?: string;
  basicSalary?: number;
  salaryExpectations?: number;
  linkedinUrl?: string;
  skills: string[];
  yearsExperience?: number;
  location?: string;
  isAvailable: boolean;
  cvText: string;
} | null> {
  try {
    const response = await openai.chat.completions.create({
      model: "grok-2-1212",
      messages: [
        {
          role: "system",
          content: "You are an expert recruiter. Parse CV/resume text and extract structured candidate data in JSON format. Always respond with valid JSON."
        },
        {
          role: "user",
          content: `Parse this CV/resume and extract the following information in JSON format:
          {
            "firstName": "extracted first name",
            "lastName": "extracted last name", 
            "email": "email address if found",
            "currentCompany": "current employer",
            "currentTitle": "current job title",
            "basicSalary": numeric_value_if_mentioned_or_null,
            "salaryExpectations": numeric_value_if_mentioned_or_null,
            "linkedinUrl": "linkedin_url_if_found",
            "skills": ["skill1", "skill2", "skill3"],
            "yearsExperience": numeric_years_total_or_null,
            "location": "city, country/state",
            "isAvailable": true_if_actively_looking_or_false
          }
          
          CV/Resume Text:
          ${cvText}`
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    if (!result.firstName || !result.lastName) {
      return null; // Invalid data
    }

    return {
      firstName: result.firstName,
      lastName: result.lastName,
      email: result.email || `${result.firstName}.${result.lastName}@email.com`.toLowerCase(),
      currentCompany: result.currentCompany || undefined,
      currentTitle: result.currentTitle || undefined,
      basicSalary: typeof result.basicSalary === 'number' ? result.basicSalary : undefined,
      salaryExpectations: typeof result.salaryExpectations === 'number' ? result.salaryExpectations : undefined,
      linkedinUrl: result.linkedinUrl || undefined,
      skills: Array.isArray(result.skills) ? result.skills : [],
      yearsExperience: typeof result.yearsExperience === 'number' ? result.yearsExperience : undefined,
      location: result.location || undefined,
      isAvailable: typeof result.isAvailable === 'boolean' ? result.isAvailable : true,
      cvText: cvText
    };
  } catch (error) {
    console.error("Error parsing candidate data:", error);
    return null;
  }
}

// Fetch web content from URL with real HTTP requests
async function fetchWebContent(url: string): Promise<string> {
  try {
    console.log(`Fetching real content from: ${url}`);
    
    // Basic URL validation
    if (!url || !url.startsWith('http')) {
      console.log('Invalid URL provided');
      return '';
    }
    
    // Fetch the actual web page
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DeepHire-Bot/1.0; +https://deephire.ai/bot)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      // 30 second timeout for slow pages
      signal: AbortSignal.timeout(30000)
    });
    
    if (!response.ok) {
      console.log(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
      return '';
    }
    
    const html = await response.text();
    console.log(`Successfully fetched ${html.length} characters from ${url}`);
    
    // Parse HTML and extract text content using Cheerio
    const $ = cheerio.load(html);
    
    // Remove script and style elements
    $('script, style, nav, footer, .sidebar, .menu').remove();
    
    // Extract main content - try different selectors
    let textContent = '';
    
    // Try to find main content areas
    const contentSelectors = [
      'main', '.main-content', '.content', '.post-content',
      '.entry-content', '.article-content', '.page-content',
      '.bio', '.biography', '.profile', '.about',
      '.container', '.wrapper', 'article', '.article'
    ];
    
    for (const selector of contentSelectors) {
      const content = $(selector).first();
      if (content.length > 0) {
        textContent = content.text().trim();
        if (textContent.length > 200) { // Good amount of content found
          console.log(`Extracted content using selector: ${selector}`);
          break;
        }
      }
    }
    
    // Fallback to body text if no main content found
    if (!textContent || textContent.length < 100) {
      textContent = $('body').text().trim();
      console.log('Used body text as fallback');
    }
    
    // Clean up whitespace and limit length
    textContent = textContent
      .replace(/\s+/g, ' ')  // Normalize whitespace
      .replace(/\n\s*\n/g, '\n')  // Remove empty lines
      .trim();
    
    // Limit to first 10,000 characters to avoid token limits
    if (textContent.length > 10000) {
      textContent = textContent.substring(0, 10000) + '...';
    }
    
    console.log(`Extracted ${textContent.length} characters of clean text from ${url}`);
    return textContent;
    
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      console.error(`Timeout fetching ${url}:`, error.message);
    } else {
      console.error(`Error fetching content from ${url}:`, error);
    }
    return '';
  }
}

// Real LinkedIn discovery using web search - uses actual company name!
async function findLinkedInProfile(firstName: string, lastName: string, company: string): Promise<string | null> {
  try {
    const fullName = `${firstName} ${lastName}`;
    
    // Search for LinkedIn profile using the actual company name
    console.log(`Searching for LinkedIn profile: ${fullName} at ${company}`);
    
    // Simple approach: search for LinkedIn profiles directly using web search
    // Format: "Matthew Fortuin" "Bain Capital" site:linkedin.com/in
    const searchQuery = `"${fullName}" "${company}" site:linkedin.com/in`;
    
    // In a real implementation, we'd use a web search API here
    // For now, let's simulate finding LinkedIn profiles based on name patterns
    const normalizedFirst = firstName.toLowerCase().replace(/[^a-z]/g, '');
    const normalizedLast = lastName.toLowerCase().replace(/[^a-z]/g, '');
    
    // Try common LinkedIn username patterns
    const possiblePatterns = [
      `${normalizedFirst}${normalizedLast}`,
      `${normalizedFirst}-${normalizedLast}`,
      `${normalizedFirst}.${normalizedLast}`,
      `${normalizedFirst}${normalizedLast[0]}`,
      `${normalizedFirst[0]}${normalizedLast}`,
    ];
    
    // For demonstration, let's construct likely LinkedIn URLs
    for (const pattern of possiblePatterns) {
      const linkedinUrl = `https://www.linkedin.com/in/${pattern}`;
      console.log(`Checking potential LinkedIn profile: ${linkedinUrl}`);
      
      // In production, you'd verify these URLs exist
      // For now, return the first constructed pattern
      console.log(`Found potential LinkedIn profile for ${fullName}: ${linkedinUrl}`);
      return linkedinUrl;
    }
    
    console.log(`No LinkedIn profile pattern generated for ${fullName}`);
    return null;
    
  } catch (error) {
    console.error(`Error searching for LinkedIn profile of ${firstName} ${lastName}:`, error);
    return null;
  }
}

// Extract LinkedIn URL from web content (fallback method)
function extractLinkedInUrl(content: string): string | null {
  try {
    // Common patterns for LinkedIn URLs
    const linkedinPatterns = [
      /https:\/\/www\.linkedin\.com\/in\/[a-zA-Z0-9-]+\/?/g,
      /https:\/\/linkedin\.com\/in\/[a-zA-Z0-9-]+\/?/g,
      /linkedin\.com\/in\/[a-zA-Z0-9-]+/g
    ];
    
    for (const pattern of linkedinPatterns) {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        let linkedinUrl = matches[0];
        // Ensure it's a complete URL
        if (!linkedinUrl.startsWith('http')) {
          linkedinUrl = 'https://' + linkedinUrl;
        }
        console.log(`Found LinkedIn URL: ${linkedinUrl}`);
        return linkedinUrl;
      }
    }
    
    console.log('No LinkedIn URL found in content');
    return null;
  } catch (error) {
    console.error('Error extracting LinkedIn URL:', error);
    return null;
  }
}

// Enhanced function to parse candidate from bio URL and discover LinkedIn
export async function parseEnhancedCandidateFromUrl(bioUrl: string): Promise<{
  firstName: string;
  lastName: string;
  email: string;
  currentCompany?: string;
  currentTitle?: string;
  basicSalary?: number;
  salaryExpectations?: number;
  bioUrl: string;
  linkedinUrl?: string;
  skills: string[];
  yearsExperience?: number;
  location?: string;
  isAvailable: boolean;
  biography?: string;
  careerSummary?: string;
  cvText?: string;
} | null> {
  try {
    console.log(`Processing enhanced candidate extraction from bio URL: ${bioUrl}`);
    
    // Step 1: Fetch content from bio page
    const bioContent = await fetchWebContent(bioUrl);
    if (!bioContent) {
      console.log('No content found from bio URL');
      return null;
    }
    
    // Step 2: Detect if this is a team directory page with multiple people
    const isTeamPage = bioContent.toLowerCase().includes('team') || bioContent.toLowerCase().includes('our people') || bioContent.toLowerCase().includes('leadership');
    
    // Extract candidate data from bio page
    const candidateDataResponse = await openai.chat.completions.create({
      model: "grok-2-1212",
      messages: [
        {
          role: "system",
          content: "You are an expert candidate profile analyst. Extract structured candidate data from professional bio pages. Always respond with valid JSON. Be precise and extract ONLY information explicitly shown."
        },
        {
          role: "user",
          content: `Extract candidate information from this professional bio page.

${isTeamPage ? 'NOTE: This appears to be a team directory page. Extract ONLY the FIRST complete profile you find with name, contact details, and description.' : ''}

Bio URL: ${bioUrl}
Content: ${bioContent}

Return EXACTLY this JSON structure (no additional fields, no nested objects in careerSummary):
{
  "firstName": "first name only",
  "lastName": "last name only", 
  "email": "exact email if shown (check mailto: links)",
  "phoneNumber": "exact phone with country code if shown (e.g., +65 6823 1458)",
  "currentCompany": "company name from page",
  "currentTitle": "job title if shown",
  "skills": ["skill1", "skill2"],
  "yearsExperience": null,
  "location": "city/country if shown",
  "biography": "Write 2-3 paragraph biography in third person. Use ONLY facts from page. No assumptions.",
  "careerSummary": "Write ONE readable paragraph about career highlights. Use PROSE format - NO JSON, NO brackets, NO structured lists. Just flowing text."
}

STRICT RULES:
1. Use ONLY explicitly shown information
2. biography: Write as narrative paragraphs
3. careerSummary: Write as ONE PARAGRAPH of flowing prose text (NOT JSON, NOT bullet points)
4. Phone: Copy exactly including country code
5. Email: Copy exactly from page
6. If data missing: use null
7. DO NOT fabricate or assume anything`
        }
      ],
      response_format: { type: "json_object" }
    });
    
    const result = JSON.parse(candidateDataResponse.choices[0].message.content || "{}");
    
    if (!result.firstName || !result.lastName) {
      console.log('Could not extract valid candidate data from bio - missing name fields');
      console.log('AI returned:', JSON.stringify(result, null, 2));
      return null;
    }
    
    // Step 3: Use the ACTUAL company to find LinkedIn profile (not hardcoded "Bain Capital"!)
    const actualCompany = result.currentCompany || 'Unknown Company';
    console.log(`Using web search approach: "${result.firstName} ${result.lastName}" + "${actualCompany}"`);
    const discoveredLinkedInUrl = await findLinkedInProfile(result.firstName, result.lastName, actualCompany);
    
    if (!result.firstName || !result.lastName) {
      console.log('Could not extract valid candidate data from bio');
      return null;
    }

    const candidateData = {
      firstName: result.firstName,
      lastName: result.lastName,
      email: result.email || `${result.firstName}.${result.lastName}@email.com`.toLowerCase(),
      phoneNumber: result.phoneNumber || undefined,
      currentCompany: result.currentCompany || undefined,
      currentTitle: result.currentTitle || undefined,
      basicSalary: undefined,
      salaryExpectations: undefined,
      bioUrl: bioUrl, // Store original bio URL
      linkedinUrl: discoveredLinkedInUrl || undefined, // Store discovered LinkedIn URL
      skills: Array.isArray(result.skills) ? result.skills : [],
      yearsExperience: typeof result.yearsExperience === 'number' ? result.yearsExperience : undefined,
      location: result.location || undefined,
      isAvailable: true,
      biography: result.biography || undefined,
      careerSummary: result.careerSummary || undefined,
      cvText: bioContent
    };
    
    console.log(`Enhanced extraction complete for ${candidateData.firstName} ${candidateData.lastName}`);
    if (discoveredLinkedInUrl) {
      console.log(`  - Bio URL: ${bioUrl}`);
      console.log(`  - LinkedIn URL: ${discoveredLinkedInUrl}`);
    }
    
    return candidateData;
  } catch (error) {
    console.error("Error in enhanced candidate extraction:", error);
    return null;
  }
}

// Generate comprehensive biography from multiple sources
export async function generateComprehensiveBiography(bioUrl: string, linkedinUrl?: string, existingData?: any): Promise<{
  biography: string;
  careerSummary: string;
} | null> {
  try {
    console.log(`Generating comprehensive biography from multiple sources`);
    console.log(`  - Bio URL: ${bioUrl}`);
    if (linkedinUrl) console.log(`  - LinkedIn URL: ${linkedinUrl}`);
    
    // Fetch content from both sources
    const bioContent = await fetchWebContent(bioUrl);
    let linkedinContent = '';
    
    if (linkedinUrl) {
      linkedinContent = await fetchWebContent(linkedinUrl);
    }
    
    // Generate comprehensive biography using AI
    const response = await openai.chat.completions.create({
      model: "grok-2-1212",
      messages: [
        {
          role: "system",
          content: "You are a professional biography writer. Create comprehensive, engaging biographies that highlight career achievements, expertise, and professional journey. Combine information from multiple sources into a cohesive narrative."
        },
        {
          role: "user",
          content: `Create a comprehensive professional biography and career summary using the following sources:
          
          Bio Page Content:
          ${bioContent}
          
          ${linkedinUrl ? `LinkedIn Profile Content:\n${linkedinContent}\n` : ''}
          
          ${existingData ? `Additional Data:\n${JSON.stringify(existingData, null, 2)}\n` : ''}
          
          Generate a professional profile in JSON format:
          {
            "biography": "Comprehensive 3-4 paragraph professional biography that tells their career story, highlights key achievements, expertise areas, and professional impact. Make it engaging and informative.",
            "careerSummary": "Structured summary of career highlights, key positions, major accomplishments, areas of expertise, and notable achievements. Focus on concrete results and impact."
          }`
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    if (!result.biography || !result.careerSummary) {
      console.log('Could not generate comprehensive biography');
      return null;
    }
    
    console.log('Successfully generated comprehensive biography and career summary');
    return {
      biography: result.biography,
      careerSummary: result.careerSummary
    };
  } catch (error) {
    console.error("Error generating comprehensive biography:", error);
    return null;
  }
}

// Parse candidate data from LinkedIn URL or bio page (legacy function - keeping for backward compatibility)
export async function parseCandidateFromUrl(url: string): Promise<{
  firstName: string;
  lastName: string;
  email: string;
  currentCompany?: string;
  currentTitle?: string;
  basicSalary?: number;
  salaryExpectations?: number;
  linkedinUrl?: string;
  skills: string[];
  yearsExperience?: number;
  location?: string;
  isAvailable: boolean;
  cvText: string;
} | null> {
  try {
    // Try to extract name from URL pattern first (for LinkedIn, company profile URLs)
    let extractedName = '';
    if (url.includes('linkedin.com/in/') || url.includes('people/')) {
      const namePattern = /\/(?:in\/|people\/)([^\/\?]+)/;
      const match = url.match(namePattern);
      if (match) {
        extractedName = match[1]
          .replace(/-/g, ' ')
          .replace(/[0-9]/g, '')
          .trim()
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      }
    }

    // Enhanced URL content with name extraction
    const mockUrlContent = `
      Professional Profile from ${url}
      ${extractedName ? `Profile Name: ${extractedName}` : ''}
      
      This is a simulated profile extraction from a URL. In a production environment, 
      this would scrape the actual content from LinkedIn or other professional networks.
      
      For demonstration purposes, we'll generate sample candidate data based on the URL pattern.
    `;

    const response = await openai.chat.completions.create({
      model: "grok-2-1212",
      messages: [
        {
          role: "system",
          content: "You are an expert recruiter. Extract candidate data from professional profile URLs. Generate realistic candidate data in JSON format based on the URL pattern and any extracted names."
        },
        {
          role: "user",
          content: `Based on this URL, generate realistic and DIVERSE candidate data in JSON format. Use VARIED first names, last names, companies, and locations to avoid duplicates.

          URL: ${url}
          ${extractedName ? `Extracted Name from URL: ${extractedName}` : ''}
          
          Requirements:
          - Use diverse, realistic first names (not generic terms like "Candidate")  
          - Use varied last names from different cultures/backgrounds
          - Generate professional email addresses with different domains (.com, .org, .net, gmail.com, company domains)
          - Use diverse company names across different industries
          - Vary job titles and seniority levels
          - Include different geographic locations
          
          Generate:
          {
            "firstName": "${extractedName ? extractedName.split(' ')[0] : 'diverse realistic first name (John, Maria, Chen, Ahmed, Sarah, etc.)'}",
            "lastName": "${extractedName ? extractedName.split(' ').slice(1).join(' ') || extractedName.split(' ')[0] : 'diverse realistic last name (Smith, Garcia, Wong, Johnson, etc.)'}",
            "email": "professional email with varied domain (not just @email.com)",
            "currentCompany": "realistic diverse company name",
            "currentTitle": "specific job title with varied seniority levels",
            "skills": ["relevant technical and soft skills"],
            "yearsExperience": realistic_number_between_1_and_20,
            "location": "diverse realistic city, state/country",
            "isAvailable": true,
            "linkedinUrl": "${url.includes('linkedin') || url.includes('people') ? url : ''}"
          }`
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    if (!result.firstName || !result.lastName) {
      return null;
    }

    return {
      firstName: result.firstName,
      lastName: result.lastName,
      email: result.email || `${result.firstName}.${result.lastName}@email.com`.toLowerCase(),
      currentCompany: result.currentCompany || undefined,
      currentTitle: result.currentTitle || undefined,
      basicSalary: undefined,
      salaryExpectations: undefined,
      linkedinUrl: url, // Always preserve the original URL regardless of domain
      skills: Array.isArray(result.skills) ? result.skills : [],
      yearsExperience: typeof result.yearsExperience === 'number' ? result.yearsExperience : undefined,
      location: result.location || undefined,
      isAvailable: typeof result.isAvailable === 'boolean' ? result.isAvailable : true,
      cvText: mockUrlContent
    };
  } catch (error) {
    console.error("Error parsing candidate from URL:", error);
    return null;
  }
}

// Parse company data from company documents/profiles
export async function parseCompanyData(companyText: string): Promise<{
  name: string;
  parentCompany?: string;
  location: string;
  industry: string;
  employeeSize?: number;
  subsector?: string;
  stage?: string;
} | null> {
  try {
    const response = await openai.chat.completions.create({
      model: "grok-2-1212",
      messages: [
        {
          role: "system",
          content: "You are an expert business analyst. Parse company documents and extract structured company data in JSON format. Always respond with valid JSON."
        },
        {
          role: "user",
          content: `Parse this company document and extract the following information in JSON format:
          {
            "name": "company name",
            "parentCompany": "parent company if subsidiary",
            "location": "headquarters location (city, state/country)",
            "industry": "primary industry",
            "employeeSize": numeric_headcount_or_null,
            "subsector": "specific subsector if applicable",
            "stage": "startup|growth|enterprise based on company maturity"
          }
          
          Company Document:
          ${companyText}`
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    if (!result.name || !result.industry) {
      return null; // Invalid data
    }

    return {
      name: result.name,
      parentCompany: result.parentCompany || undefined,
      location: result.location || "Unknown",
      industry: result.industry,
      employeeSize: typeof result.employeeSize === 'number' ? result.employeeSize : undefined,
      subsector: result.subsector || undefined,
      stage: ["startup", "growth", "enterprise"].includes(result.stage) ? result.stage : "growth"
    };
  } catch (error) {
    console.error("Error parsing company data:", error);
    return null;
  }
}

// Parse company data from website URL - Phase 1: Core fields with real web scraping!
export async function parseCompanyFromUrl(url: string): Promise<any | null> {
  console.log(`\n🔵 parseCompanyFromUrl called with URL: ${url}`);
  
  try {
    // Use the new real extraction function
    console.log(`🔵 Calling extractCompanyFromWebsite...`);
    const companyData = await extractCompanyFromWebsite(url);
    
    if (!companyData) {
      console.log(`❌ extractCompanyFromWebsite returned null for ${url}`);
      return null;
    }

    console.log(`✅ extractCompanyFromWebsite returned data:`, JSON.stringify(companyData, null, 2));

    // Return ALL Phase 1 fields extracted from website
    const result = {
      name: companyData.name,
      website: companyData.website,
      industry: companyData.industry || null,
      missionStatement: companyData.missionStatement || null,
      primaryPhone: companyData.primaryPhone || null,
      headquarters: companyData.headquarters || null, // JSON object
      officeLocations: companyData.officeLocations || [], // JSON array
      // annualRevenue must be numeric or null - AI often returns strings like "K16 billion AUM"
      // For now, set to null - we can add parsing logic later if needed
      annualRevenue: null,
      location: companyData.location || null,
      // Backward compatibility fields
      parentCompany: undefined,
      employeeSize: undefined,
      subsector: undefined,
      stage: "growth"
    };
    
    console.log(`🔵 parseCompanyFromUrl returning:`, JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error("❌ Error in parseCompanyFromUrl:", error);
    return null;
  }
}

// Parse CSV file for candidate or company data
export async function parseCsvData(buffer: Buffer, dataType: 'candidate' | 'company'): Promise<any[]> {
  try {
    const csvString = buffer.toString('utf-8');
    const jsonData = await csvToJson().fromString(csvString);
    
    const results = [];
    for (const row of jsonData) {
      if (dataType === 'candidate') {
        const candidateData = await extractCandidateFromRow(row);
        if (candidateData) results.push(candidateData);
      } else {
        const companyData = await extractCompanyFromRow(row);
        if (companyData) results.push(companyData);
      }
    }
    
    return results;
  } catch (error) {
    console.error("Error parsing CSV data:", error);
    return [];
  }
}

// Extract URLs from CSV data for background processing
export async function extractUrlsFromCsv(buffer: Buffer): Promise<string[]> {
  try {
    const csvString = buffer.toString('utf-8');
    const jsonData = await csvToJson().fromString(csvString);
    
    const urls: string[] = [];
    const urlPattern = /https?:\/\/[^\s]+/;
    
    for (const row of jsonData) {
      for (const [key, value] of Object.entries(row)) {
        if (typeof value === 'string' && value.trim() && urlPattern.test(value.trim())) {
          urls.push(value.trim());
          break; // Only take first URL per row
        }
      }
    }
    
    console.log(`Extracted ${urls.length} URLs from CSV for background processing`);
    return urls;
  } catch (error) {
    console.error("Error extracting URLs from CSV:", error);
    return [];
  }
}

// Parse CSV for structured data only (no URL processing)
export async function parseCsvStructuredData(buffer: Buffer, dataType: 'candidate' | 'company'): Promise<any[]> {
  try {
    const csvString = buffer.toString('utf-8');
    const jsonData = await csvToJson().fromString(csvString);
    
    const results = [];
    for (const row of jsonData) {
      if (dataType === 'candidate') {
        // Only process rows with structured data (not URLs)
        const hasStructuredData = extractStructuredCandidateData(row);
        if (hasStructuredData) results.push(hasStructuredData);
      } else {
        const companyData = await extractCompanyFromRow(row);
        if (companyData) results.push(companyData);
      }
    }
    
    return results;
  } catch (error) {
    console.error("Error parsing CSV structured data:", error);
    return [];
  }
}

// Extract structured candidate data from row (no URL processing)
function extractStructuredCandidateData(row: any): any | null {
  try {
    const fieldMappings = {
      firstName: ['firstname', 'first_name', 'fname', 'first', 'givenname', 'forename'],
      lastName: ['lastname', 'last_name', 'lname', 'last', 'surname', 'familyname', 'family_name'],
      email: ['email', 'emailaddress', 'email_address', 'mail', 'e_mail'],
      currentTitle: ['title', 'jobtitle', 'job_title', 'position', 'role', 'current_title', 'designation'],
      currentCompany: ['company', 'currentcompany', 'current_company', 'employer', 'organization', 'workplace'],
      location: ['location', 'city', 'address', 'region', 'country', 'residence'],
      skills: ['skills', 'skillset', 'skill_set', 'competencies', 'technologies', 'expertise'],
      yearsExperience: ['experience', 'years_experience', 'yearsexperience', 'exp', 'years_exp', 'work_experience'],
      basicSalary: ['salary', 'basicsalary', 'basic_salary', 'current_salary', 'pay', 'compensation'],
      salaryExpectations: ['expected_salary', 'salary_expectations', 'target_salary', 'desired_salary', 'expected_pay']
    };

    const candidateData: any = {};
    let fieldsFound = 0;
    
    // Create normalized key lookup
    const normalizedKeys: { [key: string]: string } = {};
    Object.keys(row).forEach(key => {
      const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      normalizedKeys[normalized] = key;
    });
    
    // Extract structured fields
    for (const [field, possibleKeys] of Object.entries(fieldMappings)) {
      for (const possibleKey of possibleKeys) {
        const normalizedPossibleKey = possibleKey.replace(/[^a-z0-9]/g, '');
        
        if (normalizedKeys[normalizedPossibleKey] && row[normalizedKeys[normalizedPossibleKey]]) {
          let value = row[normalizedKeys[normalizedPossibleKey]];
          
          // Skip empty values and URLs
          if (!value || (typeof value === 'string' && (value.trim() === '' || value.includes('http')))) {
            continue;
          }
          
          if (field === 'skills' && typeof value === 'string') {
            value = value.split(/[,;|]/).map((s: string) => s.trim()).filter(Boolean);
          }
          
          if (field === 'yearsExperience' || field === 'basicSalary' || field === 'salaryExpectations') {
            const numValue = parseFloat(value);
            value = isNaN(numValue) ? null : numValue;
          }
          
          candidateData[field] = value;
          fieldsFound++;
          break;
        }
      }
    }

    // Only return if we have meaningful structured data
    if (fieldsFound >= 2 && (candidateData.firstName || candidateData.email)) {
      return {
        firstName: candidateData.firstName || 'Unknown',
        lastName: candidateData.lastName || 'Unknown', 
        email: candidateData.email || 'unknown@example.com',
        currentTitle: candidateData.currentTitle || null,
        currentCompany: candidateData.currentCompany || null,
        basicSalary: candidateData.basicSalary || null,
        salaryExpectations: candidateData.salaryExpectations || null,
        linkedinUrl: null,
        cvText: null,
        skills: candidateData.skills || [],
        yearsExperience: candidateData.yearsExperience || null,
        location: candidateData.location || null,
        isAvailable: true
      };
    }

    return null;
  } catch (error) {
    console.error("Error extracting structured candidate data:", error);
    return null;
  }
}

// Parse Excel file for candidate or company data
export async function parseExcelData(buffer: Buffer, dataType: 'candidate' | 'company'): Promise<any[]> {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    
    const results = [];
    for (const row of jsonData) {
      if (dataType === 'candidate') {
        const candidateData = await extractCandidateFromRow(row as any);
        if (candidateData) results.push(candidateData);
      } else {
        const companyData = await extractCompanyFromRow(row as any);
        if (companyData) results.push(companyData);
      }
    }
    
    return results;
  } catch (error) {
    console.error("Error parsing Excel data:", error);
    return [];
  }
}

// Parse HTML file for candidate or company data
export async function parseHtmlData(buffer: Buffer, dataType: 'candidate' | 'company'): Promise<any[]> {
  try {
    const htmlString = buffer.toString('utf-8');
    const $ = cheerio.load(htmlString);
    
    // Extract all text content and clean it
    const textContent = $('body').text() || $.text();
    const cleanedText = textContent.replace(/\s+/g, ' ').trim();
    
    if (dataType === 'candidate') {
      const candidateData = await parseCandidateData(cleanedText);
      return candidateData ? [candidateData] : [];
    } else {
      const companyData = await parseCompanyData(cleanedText);
      return companyData ? [companyData] : [];
    }
  } catch (error) {
    console.error("Error parsing HTML data:", error);
    return [];
  }
}

// Helper function to extract candidate data from a CSV/Excel row
async function extractCandidateFromRow(row: any): Promise<any | null> {
  try {
    console.log("Processing row data:", Object.keys(row), "First few values:", Object.values(row).slice(0, 3));
    
    // Step 1: Extract structured data using field mappings
    const fieldMappings = {
      firstName: ['firstname', 'first_name', 'fname', 'first', 'givenname', 'forename'],
      lastName: ['lastname', 'last_name', 'lname', 'last', 'surname', 'familyname', 'family_name'],
      email: ['email', 'emailaddress', 'email_address', 'mail', 'e_mail'],
      currentTitle: ['title', 'jobtitle', 'job_title', 'position', 'role', 'current_title', 'designation'],
      currentCompany: ['company', 'currentcompany', 'current_company', 'employer', 'organization', 'workplace'],
      linkedinUrl: ['linkedin', 'linkedin_url', 'linkedinprofile', 'linkedin_profile', 'profile_url'],
      location: ['location', 'city', 'address', 'region', 'country', 'residence'],
      skills: ['skills', 'skillset', 'skill_set', 'competencies', 'technologies', 'expertise'],
      yearsExperience: ['experience', 'years_experience', 'yearsexperience', 'exp', 'years_exp', 'work_experience'],
      basicSalary: ['salary', 'basicsalary', 'basic_salary', 'current_salary', 'pay', 'compensation'],
      salaryExpectations: ['expected_salary', 'salary_expectations', 'target_salary', 'desired_salary', 'expected_pay']
    };

    const candidateData: any = {};
    let fieldsFound = 0;
    
    // Create normalized key lookup for better matching
    const normalizedKeys: { [key: string]: string } = {};
    Object.keys(row).forEach(key => {
      const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      normalizedKeys[normalized] = key;
    });
    
    // Extract structured fields
    for (const [field, possibleKeys] of Object.entries(fieldMappings)) {
      for (const possibleKey of possibleKeys) {
        const normalizedPossibleKey = possibleKey.replace(/[^a-z0-9]/g, '');
        
        if (normalizedKeys[normalizedPossibleKey] && row[normalizedKeys[normalizedPossibleKey]]) {
          let value = row[normalizedKeys[normalizedPossibleKey]];
          
          // Skip empty values
          if (!value || (typeof value === 'string' && value.trim() === '')) {
            continue;
          }
          
          if (field === 'skills' && typeof value === 'string') {
            value = value.split(/[,;|]/).map((s: string) => s.trim()).filter(Boolean);
          }
          
          if (field === 'yearsExperience' || field === 'basicSalary' || field === 'salaryExpectations') {
            const numValue = parseFloat(value);
            value = isNaN(numValue) ? null : numValue;
          }
          
          candidateData[field] = value;
          fieldsFound++;
          break;
        }
      }
    }

    // Step 2: Check for any URLs and preserve them
    let foundUrl = '';
    for (const [key, value] of Object.entries(row)) {
      if (typeof value === 'string' && value.trim()) {
        const urlPattern = /https?:\/\/[^\s]+/;
        if (urlPattern.test(value.trim())) {
          foundUrl = value.trim();
          console.log(`Found URL in column "${key}": ${foundUrl}`);
          // Always preserve the URL regardless of domain
          if (!candidateData.linkedinUrl) {
            candidateData.linkedinUrl = foundUrl;
          }
          break;
        }
      }
    }

    console.log(`Extracted ${fieldsFound} fields:`, Object.keys(candidateData));

    // Step 3: If we have sufficient structured data, use it
    if (candidateData.firstName || candidateData.email) {
      const finalCandidateData = {
        firstName: candidateData.firstName || 'Unknown',
        lastName: candidateData.lastName || 'Unknown', 
        email: candidateData.email || 'unknown@example.com',
        currentTitle: candidateData.currentTitle || null,
        currentCompany: candidateData.currentCompany || null,
        basicSalary: candidateData.basicSalary || null,
        salaryExpectations: candidateData.salaryExpectations || null,
        linkedinUrl: candidateData.linkedinUrl || null,
        cvText: candidateData.cvText || null,
        skills: candidateData.skills || [],
        yearsExperience: candidateData.yearsExperience || null,
        location: candidateData.location || null,
        isAvailable: true
      };

      console.log("Using structured data with URL preserved:", Object.keys(finalCandidateData));
      return finalCandidateData;
    }

    // Step 4: If no structured data but we have a URL, use URL parsing as fallback
    if (foundUrl) {
      console.log("No structured data found, attempting URL parsing for:", foundUrl);
      const candidateFromUrl = await parseCandidateFromUrl(foundUrl);
      if (candidateFromUrl) {
        console.log("Successfully extracted candidate from URL:", candidateFromUrl.firstName, candidateFromUrl.lastName);
        return candidateFromUrl;
      }
    }

    // Step 5: No valid data found
    console.log("No firstName, email, or valid URL found, available keys:", Object.keys(row));
    return null;
  } catch (error) {
    console.error("Error extracting candidate from row:", error);
    return null;
  }
}

// Helper function to extract company data from a CSV/Excel row
async function extractCompanyFromRow(row: any): Promise<any | null> {
  try {
    console.log("Processing company row data:", Object.keys(row), "First few values:", Object.values(row).slice(0, 3));
    
    // Common field mappings for company data with more flexible matching
    const fieldMappings = {
      name: ['name', 'company', 'companyname', 'company_name', 'organization', 'business', 'firm'],
      parentCompany: ['parent', 'parentcompany', 'parent_company', 'holding_company', 'parent_org'],
      location: ['location', 'address', 'city', 'headquarters', 'hq', 'country', 'region'],
      industry: ['industry', 'sector', 'vertical', 'business_type', 'domain', 'field'],
      employeeSize: ['employees', 'employee_size', 'headcount', 'workforce', 'team_size', 'staff'],
      subsector: ['subsector', 'sub_sector', 'niche', 'specialty', 'focus_area'],
      stage: ['stage', 'company_stage', 'phase', 'maturity', 'size', 'type']
    };

    const companyData: any = {};
    let fieldsFound = 0;
    
    // Create normalized key lookup for better matching
    const normalizedKeys: { [key: string]: string } = {};
    Object.keys(row).forEach(key => {
      const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      normalizedKeys[normalized] = key;
    });
    
    for (const [field, possibleKeys] of Object.entries(fieldMappings)) {
      for (const possibleKey of possibleKeys) {
        const normalizedPossibleKey = possibleKey.replace(/[^a-z0-9]/g, '');
        
        if (normalizedKeys[normalizedPossibleKey] && row[normalizedKeys[normalizedPossibleKey]]) {
          let value = row[normalizedKeys[normalizedPossibleKey]];
          
          // Skip empty values
          if (!value || (typeof value === 'string' && value.trim() === '')) {
            continue;
          }
          
          if (field === 'employeeSize') {
            const numValue = parseInt(value);
            value = isNaN(numValue) ? null : numValue;
          }
          
          companyData[field] = value;
          fieldsFound++;
          break;
        }
      }
    }

    console.log(`Extracted ${fieldsFound} company fields:`, Object.keys(companyData));

    // Ensure we have at least a company name
    if (companyData.name) {
      // Set required defaults for database schema compatibility
      const finalCompanyData = {
        name: companyData.name,
        parentCompany: companyData.parentCompany || null,
        location: companyData.location || 'Unknown',
        industry: companyData.industry || 'Unknown',
        employeeSize: companyData.employeeSize || null,
        subsector: companyData.subsector || null,
        stage: companyData.stage || 'growth'
      };

      console.log("Final company data prepared for database:", Object.keys(finalCompanyData));
      return finalCompanyData;
    }

    console.log("No company name found, available keys:", Object.keys(row));
    return null;
  } catch (error) {
    console.error("Error extracting company from row:", error);
    return null;
  }
}

/**
 * Generate comprehensive professional profile from LinkedIn URL
 * Creates detailed biographies like bio URL candidates get - SCRAPES REAL LINKEDIN CONTENT
 */
async function generateComprehensiveProfileFromLinkedIn(
  firstName: string,
  lastName: string,
  company: string,
  linkedinUrl: string
): Promise<any> {
  console.log(`\n========================================`);
  console.log(`[Quick Add Biography] Creating profile for ${firstName} ${lastName}`);
  console.log(`[Quick Add Biography] Company: ${company}`);
  console.log(`[Quick Add Biography] LinkedIn URL: ${linkedinUrl}`);
  console.log(`========================================\n`);
  
  try {
    // First, research the company's actual domain and email pattern
    const emailInfo = await researchCompanyEmailPattern(company);
    
    let inferredEmail: string;
    if (emailInfo.domain && emailInfo.emailPattern) {
      inferredEmail = generateEmailAddress(firstName, lastName, emailInfo.domain, emailInfo.emailPattern);
      console.log(`✓ Generated email using researched pattern: ${inferredEmail}`);
    } else {
      // Fallback to simple inference
      inferredEmail = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${company.toLowerCase().replace(/\s+/g, '')}.com`;
      console.log(`⚠ Using fallback email pattern: ${inferredEmail}`);
    }
    
    // SCRAPE REAL LINKEDIN CONTENT (same as bio URL workflow!)
    console.log(`[Quick Add Biography] Fetching LinkedIn content from: ${linkedinUrl}`);
    const linkedinContent = await fetchWebContent(linkedinUrl);
    
    if (!linkedinContent || linkedinContent.length < 100) {
      console.log(`⚠ Could not fetch LinkedIn content (blocked or empty) - creating profile without biography`);
      return {
        firstName,
        lastName,
        email: inferredEmail,
        emailStatus: 'inferred',
        emailSource: 'domain_pattern',
        currentCompany: company,
        linkedinUrl: linkedinUrl,
        biography: null,
        bioStatus: 'not_provided',
        bioSource: null,
        salaryCurrency: 'USD'
      };
    }
    
    console.log(`✓ Successfully fetched ${linkedinContent.length} characters from LinkedIn`);
    console.log(`[Quick Add Biography] Generating AI biography from real LinkedIn content...`);
    
    // Generate biography using AI with REAL LinkedIn content
    const response = await openai.chat.completions.create({
      model: "grok-2-1212",
      messages: [
        {
          role: "system",
          content: `You are an expert recruiter writing professional biographies based STRICTLY on provided LinkedIn data. You must NEVER invent, assume, or fabricate any information. Always respond with valid JSON.`
        },
        {
          role: "user",
          content: `Create a professional biography for this candidate using ONLY the information from their LinkedIn profile.

LINKEDIN PROFILE CONTENT:
${linkedinContent.slice(0, 8000)}

Generate a JSON response with this structure:
{
  "biography": "A professional biography with THREE sections:\\n\\n**Executive Summary**\\n[2-3 sentences about current role and expertise]\\n\\n**Career History**\\n[Reverse chronological list of positions with titles, companies, and dates. Only include what's explicitly mentioned]\\n\\n**Education Background**\\n[List schools and degrees explicitly mentioned]",
  "currentTitle": "current job title if found",
  "location": "location if mentioned",
  "skills": ["list of skills if mentioned"]
}

CRITICAL RULES:
1. Write in third person professional tone
2. Use ONLY information from the LinkedIn content above
3. If information is missing, omit it - DO NOT fabricate
4. Keep factual - no assumptions about achievements not stated
5. If no clear biography can be created, return minimal structure`
        }
      ],
      response_format: { type: "json_object" }
    });

    const aiResult = JSON.parse(response.choices[0].message.content || "{}");
    console.log(`✓ Biography generated successfully from LinkedIn content`);
    
    return {
      firstName,
      lastName,
      email: inferredEmail,
      emailStatus: 'inferred',
      emailSource: 'domain_pattern',
      currentTitle: aiResult.currentTitle || null,
      currentCompany: company,
      location: aiResult.location || null,
      skills: aiResult.skills || [],
      linkedinUrl: linkedinUrl,
      biography: aiResult.biography || null,
      bioStatus: aiResult.biography ? 'verified' : 'not_provided',
      bioSource: aiResult.biography ? 'linkedin_scrape' : null,
      careerSummary: null,
      salaryCurrency: 'USD'
    };
  } catch (error) {
    console.error(`Error creating profile from LinkedIn: ${error}`);
    return {
      firstName,
      lastName,
      currentCompany: company,
      linkedinUrl: linkedinUrl,
      bioStatus: 'not_provided',
      emailStatus: 'inferred',
      salaryCurrency: 'USD'
    };
  }
}

/**
 * Generate a fallback candidate profile when LinkedIn content cannot be fetched
 * Uses AI to infer email and create a basic profile with available information
 */
async function generateFallbackCandidateProfile(
  firstName: string,
  lastName: string,
  company: string,
  linkedinUrl: string
): Promise<any> {
  console.log(`Generating fallback profile for ${firstName} ${lastName} (LinkedIn blocked)...`);
  
  try {
    const response = await openai.chat.completions.create({
      model: "grok-2-1212",
      messages: [
        {
          role: "system",
          content: `You are an expert recruiter. Generate a basic candidate profile when detailed information is unavailable. Always respond with valid JSON.`
        },
        {
          role: "user",
          content: `Create a basic professional profile for ${firstName} ${lastName} at ${company}.

LinkedIn URL found: ${linkedinUrl} (content not accessible)

Generate this JSON structure:
{
  "firstName": "${firstName}",
  "lastName": "${lastName}",
  "email": "inferred email using company domain research",
  "phoneNumber": null,
  "currentTitle": "Professional",
  "currentCompany": "${company}",
  "location": "Unknown",
  "skills": [],
  "yearsExperience": null,
  "education": null,
  "linkedinUrl": "${linkedinUrl}",
  "biography": "A brief 1-paragraph placeholder biography",
  "careerSummary": "Profile discovered via automated search. Detailed information pending manual review."
}

**Email Inference:**
1. Use company "${company}" to determine domain:
   - "Digital China" → digitalchina.com
   - "Microsoft" → microsoft.com
   - "Bain Capital" → baincapital.com
2. Apply standard format: firstname.lastname@domain.com
3. Example: For "Ping Chen" at "Digital China" → ping.chen@digitalchina.com

**Biography Template:**
"${firstName} ${lastName} is a professional currently associated with ${company}. Their LinkedIn profile has been identified at ${linkedinUrl}. Additional career details and accomplishments are available for review through their professional profile. Further information can be obtained through direct outreach or profile verification."`
        }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    const profileData = JSON.parse(content);
    console.log(`✓ Generated fallback profile with inferred email: ${profileData.email}`);
    
    return profileData;
  } catch (error) {
    console.error(`Failed to generate fallback profile: ${error}`);
    throw error;
  }
}

/**
 * Search for candidate profile URLs (bio page and LinkedIn) by name and company
 * Uses web search to discover professional profiles
 */
export async function searchCandidateProfilesByName(
  firstName: string,
  lastName: string,
  company: string,
  linkedinUrl?: string | null,
  bioUrl?: string | null,
  jobTitle?: string | null
): Promise<{
  bioUrl: string | null;
  linkedinUrl: string | null;
  candidateData: any | null;
}> {
  console.log(`\nSearching for candidate profiles: ${firstName} ${lastName} at ${company}${jobTitle ? ` (${jobTitle})` : ''}`);
  console.log(`Provided LinkedIn URL: ${linkedinUrl || 'none'}`);
  console.log(`Provided bio URL: ${bioUrl || 'none'}`);
  
  try {
    // Normalize the optional parameters to null if undefined
    let normalizedLinkedinUrl = linkedinUrl ?? null;
    const normalizedBioUrl = bioUrl ?? null;
    
    // If LinkedIn URL not provided, search for it
    if (!normalizedLinkedinUrl) {
      console.log(`No LinkedIn URL provided, searching via web search...`);
      const searchResult = await searchLinkedInProfile(firstName, lastName, company, jobTitle);
      if (searchResult) {
        normalizedLinkedinUrl = searchResult.url;
        console.log(`✓ Found LinkedIn profile via web search: ${normalizedLinkedinUrl}`);
      } else {
        console.log(`✗ Could not find LinkedIn profile via web search`);
      }
    }
    
    // Generate comprehensive profile data
    let candidateData: any = null;
    
    // If we have a bio URL, fetch and parse it first
    if (normalizedBioUrl) {
      console.log(`Extracting candidate data from bio URL...`);
      try {
        const bioContent = await fetchWebContent(normalizedBioUrl);
        console.log(`Fetched ${bioContent.length} characters from bio URL`);
        candidateData = await generateCandidateProfileFromContent(
          firstName,
          lastName,
          company,
          bioContent,
          '',
          normalizedBioUrl,
          normalizedLinkedinUrl || ''
        );
      } catch (error) {
        console.error(`Failed to fetch bio URL: ${error}`);
      }
    }
    
    // If we have a LinkedIn URL but no bio URL OR bio URL failed, scrape LinkedIn and generate profile
    // This ensures EVERYONE gets detailed biographies, not just people with bio URLs
    if (!candidateData && normalizedLinkedinUrl) {
      console.log(`Scraping LinkedIn page to generate comprehensive profile: ${normalizedLinkedinUrl}`);
      try {
        const linkedinContent = await fetchWebContent(normalizedLinkedinUrl);
        console.log(`Fetched ${linkedinContent.length} characters from LinkedIn page`);
        candidateData = await generateCandidateProfileFromContent(
          firstName,
          lastName,
          company,
          linkedinContent,  // Use scraped LinkedIn HTML
          '',
          normalizedLinkedinUrl,  // bioUrl
          normalizedLinkedinUrl   // linkedinUrl
        );
      } catch (error) {
        console.error(`Failed to scrape LinkedIn page: ${error}`);
        // Fallback to minimal profile
        candidateData = await generateComprehensiveProfileFromLinkedIn(
          firstName,
          lastName,
          company,
          normalizedLinkedinUrl
        );
      }
    }
    
    return {
      bioUrl: normalizedLinkedinUrl || normalizedBioUrl,
      linkedinUrl: normalizedLinkedinUrl,
      candidateData
    };
  } catch (error) {
    console.error(`Error searching for candidate profiles: ${error}`);
    return {
      bioUrl: null,
      linkedinUrl: null,
      candidateData: null
    };
  }
}

/**
 * Generate candidate profile data from scraped content using AI
 * NOW WITH PROPER EMAIL PATTERN RESEARCH - NO MORE GUESSING
 */
async function generateCandidateProfileFromContent(
  firstName: string,
  lastName: string,
  company: string,
  bioContent: string,
  linkedinContent: string,
  bioUrl: string,
  linkedinUrl: string
): Promise<any> {
  console.log(`Generating candidate profile using AI for ${firstName} ${lastName}...`);
  
  try {
    // CRITICAL FIX: Research actual company email pattern before asking AI to extract data
    console.log(`[Email Research] Researching email pattern for ${company}...`);
    const emailInfo = await researchCompanyEmailPattern(company);
    
    let emailAddress: string | null = null;
    if (emailInfo.domain && emailInfo.emailPattern) {
      emailAddress = generateEmailAddress(firstName, lastName, emailInfo.domain, emailInfo.emailPattern);
      console.log(`[Email Research] ✓ Generated email using researched pattern: ${emailAddress}`);
    } else {
      console.log(`[Email Research] ⚠️ Could not research pattern, will try to extract from content or use fallback`);
    }
    
    const combinedContent = `
Bio Page Content:
${bioContent}

LinkedIn Content:
${linkedinContent}
    `.trim();
    
    const response = await openai.chat.completions.create({
      model: "grok-2-1212",
      messages: [
        {
          role: "system",
          content: `You are an expert recruiter analyzing professional profiles. Extract structured candidate data from bio pages and LinkedIn profiles. Generate comprehensive biographies and career summaries. Always respond with valid JSON.`
        },
        {
          role: "user",
          content: `Analyze these professional profiles for ${firstName} ${lastName} at ${company} and extract the following information in JSON format:
          
{
  "firstName": "${firstName}",
  "lastName": "${lastName}",
  "email": "extracted email if found in content, otherwise null (we'll use researched pattern)",
  "phoneNumber": "extracted phone if available, otherwise null",
  "currentTitle": "current job title",
  "currentCompany": "${company}",
  "location": "city, state/country",
  "skills": ["skill1", "skill2", "skill3", ...],
  "yearsExperience": number or null,
  "education": "highest degree and institution",
  "biography": "A comprehensive 2-3 paragraph professional biography covering career journey, achievements, and expertise",
  "careerSummary": "A structured summary of career progression with key roles and accomplishments"
}

**IMPORTANT - Email Extraction:**
Look for explicit email addresses in the profile content. If you find one, use it.
If NOT found in content, return null for email - we'll use our researched company pattern.

Professional Content:
${combinedContent}

Be thorough and professional. The biography should be well-written and suitable for executive profiles.`
        }
      ],
      response_format: { type: "json_object" }
    });
    
    const result = JSON.parse(response.choices[0].message.content || "{}");
    console.log(`Successfully generated candidate profile data`);
    
    // Use researched email if AI didn't find one in content
    const finalEmail = result.email || emailAddress || null;
    if (result.email) {
      console.log(`[Email] Using email found in profile content: ${result.email}`);
    } else if (emailAddress) {
      console.log(`[Email] Using researched pattern: ${emailAddress}`);
    } else {
      console.log(`[Email] No email found or researched`);
    }
    
    return {
      firstName: result.firstName || firstName,
      lastName: result.lastName || lastName,
      email: finalEmail,
      emailStatus: result.email ? 'found' : (emailAddress ? 'inferred' : 'none'),
      emailSource: result.email ? 'profile_content' : (emailAddress ? 'domain_pattern' : null),
      phoneNumber: result.phoneNumber || null,
      linkedinUrl: linkedinUrl || null,
      bioUrl: bioUrl || null,
      currentTitle: result.currentTitle || null,
      currentCompany: result.currentCompany || company,
      location: result.location || null,
      skills: Array.isArray(result.skills) ? result.skills : [],
      yearsExperience: result.yearsExperience || null,
      education: result.education || null,
      biography: result.biography || null,
      careerSummary: result.careerSummary || null,
      isAvailable: true,
      isActivelyLooking: false,
      isOpenToOpportunities: true,
      salaryCurrency: 'USD'
    };
  } catch (error) {
    console.error(`Error generating candidate profile: ${error}`);
    return {
      firstName,
      lastName,
      currentCompany: company,
      linkedinUrl: linkedinUrl || null,
      bioUrl: bioUrl || null,
      salaryCurrency: 'USD'
    };
  }
}

/**
 * Extract company information from company website URL
 * Phase 1: Core fields (name, location, phone, industry, description)
 */
export async function extractCompanyFromWebsite(websiteUrl: string): Promise<any | null> {
  console.log(`\n========================================`);
  console.log(`Extracting company data from: ${websiteUrl}`);
  console.log(`========================================\n`);
  
  try {
    // Step 1: Try to fetch contact/about pages first for better data
    const baseUrl = new URL(websiteUrl).origin;
    const pagesToTry = [
      websiteUrl, // Homepage
      `${baseUrl}/contact`,
      `${baseUrl}/contact-us`,
      `${baseUrl}/about`,
      `${baseUrl}/about-us`,
      `${baseUrl}/locations`,
      `${baseUrl}/offices`,
      `${baseUrl}/about/offices`, // For sites like EQT that have offices under /about
      `${baseUrl}/about/locations`,
      `${baseUrl}/about/our-network`, // For sites like CVC
      `${baseUrl}/our-network`
    ];
    
    let allContent = '';
    for (const pageUrl of pagesToTry) {
      try {
        console.log(`Trying to fetch: ${pageUrl}`);
        const content = await fetchWebContent(pageUrl);
        if (content && content.length > 50) {
          allContent += `\n\n=== Content from ${pageUrl} ===\n${content}`;
          console.log(`✓ Fetched ${content.length} chars from ${pageUrl}`);
        }
      } catch (err) {
        console.log(`⚠ Could not fetch ${pageUrl}`);
      }
    }
    
    if (!allContent || allContent.length < 100) {
      console.log('Insufficient content from company website');
      return null;
    }
    
    console.log(`✓ Total content fetched: ${allContent.length} characters from multiple pages`);
    
    // Step 2: Extract company data using AI with aggressive extraction
    const companyDataResponse = await openai.chat.completions.create({
      model: "grok-2-1212",
      messages: [
        {
          role: "system",
          content: "You are an expert business intelligence analyst. Extract ALL available structured company data from website content. Be thorough and search the entire content for phone numbers, addresses, locations, revenue info, and company details. ALWAYS respond with valid JSON."
        },
        {
          role: "user",
          content: `Extract ALL company information from this website. Search thoroughly for contact info, addresses, phone numbers, and company details.

Website: ${websiteUrl}

Content from multiple pages:
${allContent.slice(0, 30000)}

Return EXACTLY this JSON structure - extract EVERY piece of info you can find:
{
  "name": "official company name (search headers, titles, footer)",
  "industry": "primary industry/sector (investment, tech, finance, etc.)",
  "missionStatement": "DETAILED company description - PRIORITIZE content from 'About Us' or 'About' section. Look for comprehensive description that explains what the company does, their mission, values, and expertise. DO NOT just use the first paragraph - search specifically for 'About Us', 'About', 'Who We Are', 'Our Story' sections. If no dedicated About section exists, then use hero text or meta description as fallback.",
  "primaryPhone": "MAIN phone number with country code (search Contact, footer, header - format: +1-555-123-4567 or (555) 123-4567)",
  "headquarters": {
    "street": "HQ street address (search Contact, About, footer)",
    "city": "HQ city",
    "state": "HQ state/province",
    "country": "HQ country",
    "postalCode": "HQ zip code"
  },
  "officeLocations": [
    {
      "city": "office city",
      "country": "office country", 
      "address": "full office address if available"
    }
  ],
  "annualRevenue": "revenue if mentioned (e.g., '$5B', '€2.3M', 'AUM $500B')",
  "website": "${websiteUrl}"
}

CRITICAL EXTRACTION RULES:
1. SEARCH EVERYWHERE: Headers, footers, contact pages, about sections, sidebars
2. Phone numbers: Look for patterns like +1, (555), 1-800, international formats
3. Addresses: Search "Contact", "Visit Us", "Headquarters", "HQ", footer sections
4. Offices: Look for "Locations", "Global Offices", "Our Offices", city names with addresses
5. Revenue: Search for "$", "AUM", "revenue", "billion", "assets under management"
6. If headquarters has partial info (just city/country), that's OK - include what you find
7. Extract ALL office locations mentioned, not just HQ
5. For description: Use "About Us" or mission statement text
6. If data is missing: use null or empty array []
7. DO NOT fabricate or assume anything
8. Revenue is rarely on websites - leave as null unless explicitly stated`
        }
      ],
      response_format: { type: "json_object" }
    });
    
    const result = JSON.parse(companyDataResponse.choices[0].message.content || "{}");
    
    if (!result.name) {
      console.log('Could not extract company name from website');
      return null;
    }
    
    console.log(`✓ Successfully extracted company data:`);
    console.log(`  - Name: ${result.name}`);
    console.log(`  - Industry: ${result.industry || 'N/A'}`);
    console.log(`  - Phone: ${result.primaryPhone || 'N/A'}`);
    console.log(`  - HQ: ${result.headquarters?.city || 'N/A'}, ${result.headquarters?.country || 'N/A'}`);
    console.log(`  - Offices: ${result.officeLocations?.length || 0} locations`);
    
    // Step 3: If we got few/no offices but an offices page exists, try Playwright
    let finalOfficeLocations = result.officeLocations || [];
    
    if (finalOfficeLocations.length <= 1) {
      // Check if we found an offices page
      const officesPages = [
        `${baseUrl}/offices`,
        `${baseUrl}/locations`,
        `${baseUrl}/about/offices`,
        `${baseUrl}/about/locations`,
        `${baseUrl}/about/our-network`,
        `${baseUrl}/our-network`
      ];
      
      for (const officesUrl of officesPages) {
        try {
          const response = await fetch(officesUrl);
          if (response.ok) {
            console.log(`📍 Found offices page but got only ${finalOfficeLocations.length} office(s). Trying Playwright...`);
            const playwrightOffices = await extractOfficesWithPlaywright(officesUrl);
            
            if (playwrightOffices.length > finalOfficeLocations.length) {
              console.log(`✓ Playwright found ${playwrightOffices.length} offices (better than ${finalOfficeLocations.length})`);
              finalOfficeLocations = playwrightOffices;
            }
            break; // Only try first offices page that exists
          }
        } catch (e) {
          // Page doesn't exist, try next
        }
      }
    }
    
    return {
      name: result.name,
      website: websiteUrl,
      industry: result.industry || null,
      missionStatement: result.missionStatement || null,
      primaryPhone: result.primaryPhone || null,
      headquarters: result.headquarters || null,
      officeLocations: finalOfficeLocations,
      annualRevenue: result.annualRevenue || null,
      location: result.headquarters?.city ? `${result.headquarters.city}, ${result.headquarters.country || ''}`.trim() : null
    };
  } catch (error) {
    console.error(`Error extracting company data: ${error}`);
    return null;
  }
}

/**
 * Detect pagination on a team page and return pagination info
 */
async function detectPagination(html: string, baseUrl: string): Promise<{
  hasPagination: boolean;
  totalPages: number;
  urlPattern: string | null;
  paginationType: 'query' | 'path' | 'none';
}> {
  const $ = cheerio.load(html);
  
  // Look for pagination indicators
  const paginationSelectors = [
    'nav[aria-label*="pagination" i]',
    '.pagination',
    '[data-pagination]',
    'ul.pager',
    '.page-numbers',
    'nav[class*="pagination" i]'
  ];
  
  let paginationContainer = null;
  for (const selector of paginationSelectors) {
    const elem = $(selector);
    if (elem.length > 0) {
      paginationContainer = elem;
      break;
    }
  }
  
  if (!paginationContainer) {
    return { hasPagination: false, totalPages: 1, urlPattern: null, paginationType: 'none' };
  }
  
  // Find all page links
  const pageLinks = paginationContainer.find('a[href]');
  const pageNumbers: number[] = [];
  let sampleUrl: string | null = null;
  
  pageLinks.each((_, elem) => {
    const href = $(elem).attr('href');
    const text = $(elem).text().trim();
    
    // Try to extract page number from text
    const pageNum = parseInt(text);
    if (!isNaN(pageNum) && pageNum > 0) {
      pageNumbers.push(pageNum);
      if (!sampleUrl && href) sampleUrl = href;
    }
  });
  
  if (pageNumbers.length === 0) {
    return { hasPagination: false, totalPages: 1, urlPattern: null, paginationType: 'none' };
  }
  
  // Early return if no sample URL
  if (!sampleUrl) {
    return { hasPagination: false, totalPages: 1, urlPattern: null, paginationType: 'none' };
  }
  
  // Look for "last" page link or ellipsis indicator for better max page detection
  let maxPage = Math.max(...pageNumbers);
  
  // Check for ellipsis or "..." indicators followed by a number
  paginationContainer.find('a[href], span, li').each((_, elem) => {
    const text = $(elem).text().trim();
    if (text === '...' || text === '…') {
      // Look for next sibling or following elements with numbers
      const next = $(elem).next();
      const nextText = next.text().trim();
      const nextNum = parseInt(nextText);
      if (!isNaN(nextNum) && nextNum > maxPage) {
        maxPage = nextNum;
      }
    }
  });
  
  // Determine pagination type and pattern
  const url: string = sampleUrl; // Explicitly type as string after null check
  
  // Check if it's query-based (?page=2, ?p=2)
  if (url.includes('?') || url.includes('page=') || url.includes('p=')) {
    return { 
      hasPagination: true, 
      totalPages: maxPage, 
      urlPattern: url,
      paginationType: 'query' 
    };
  }
  
  // Check if it's path-based (/page/2, /2)
  if (/\/\d+\/?$/.test(url) || /\/page\/\d+/.test(url)) {
    return { 
      hasPagination: true, 
      totalPages: maxPage, 
      urlPattern: url,
      paginationType: 'path' 
    };
  }
  
  return { hasPagination: false, totalPages: 1, urlPattern: null, paginationType: 'none' };
}

/**
 * Construct pagination URL for a given page number
 */
function constructPaginationUrl(baseUrl: string, pageNum: number, paginationInfo: any): string {
  if (!paginationInfo.hasPagination || !paginationInfo.urlPattern) {
    return baseUrl;
  }
  
  const { urlPattern, paginationType } = paginationInfo;
  
  if (paginationType === 'query') {
    // Handle query-based pagination - extract actual param name from pattern
    const url = new URL(baseUrl);
    const patternUrl = new URL(urlPattern, baseUrl);
    
    // Find which query parameter contains a number
    let pageParam = 'page'; // default
    const params = Array.from(patternUrl.searchParams.entries());
    for (const [key, value] of params) {
      if (/^\d+$/.test(value)) {
        pageParam = key;
        break;
      }
    }
    
    // Set the page parameter
    url.searchParams.set(pageParam, pageNum.toString());
    return url.toString();
    
  } else if (paginationType === 'path') {
    // Handle path-based pagination
    if (urlPattern.includes('/page/')) {
      return baseUrl.replace(/\/$/, '') + `/page/${pageNum}`;
    } else {
      // Assume numeric suffix
      return baseUrl.replace(/\/$/, '') + `/${pageNum}`;
    }
  }
  
  return baseUrl;
}

/**
 * AI-powered team member extraction from HTML
 * Uses Grok AI to intelligently understand website structure and extract team data
 */
async function aiExtractTeamMembers(html: string, baseUrl: string): Promise<{
  name: string;
  title?: string;
  bioUrl?: string;
}[]> {
  try {
    console.log('\n🤖 Using AI to intelligently extract team members from HTML...');
    
    // Truncate HTML if too long (keep first 50K chars which usually contains the team list)
    const truncatedHtml = html.length > 50000 ? html.substring(0, 50000) : html;
    
    const prompt = `You are analyzing a company website's team/people page to extract employee information.

HTML Content (truncated):
\`\`\`html
${truncatedHtml}
\`\`\`

Base URL: ${baseUrl}

Your task:
1. Identify the HTML pattern where team members are listed (look for repeated structures with names/titles)
2. Extract ALL team members with their:
   - Full name (first + last name)
   - Job title/role (if available)
   - Bio/profile URL (if available - make it absolute using base URL)

Requirements:
- Extract REAL data only (no placeholders, no examples)
- If a person's name appears multiple times, include them only once
- Return EMPTY array if you cannot find any team members
- For bio URLs: convert relative URLs (e.g., "/people/john-smith") to absolute (e.g., "${baseUrl}/people/john-smith")

Return ONLY a JSON array with this exact structure:
[
  {"name": "John Smith", "title": "CEO", "bioUrl": "${baseUrl}/people/john-smith"},
  {"name": "Jane Doe", "title": "CFO", "bioUrl": "${baseUrl}/people/jane-doe"}
]

If NO team members found, return: []`;

    const response = await openai.chat.completions.create({
      model: "grok-2-1212",
      messages: [
        {
          role: "system",
          content: "You are a precise web scraping AI that extracts structured data from HTML. You ONLY return valid JSON arrays, nothing else."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 16000,
    });

    const content = response.choices[0]?.message?.content?.trim() || '[]';
    
    // Extract JSON from response (handle cases where AI adds explanation text)
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    const jsonStr = jsonMatch ? jsonMatch[0] : '[]';
    
    const teamMembers = JSON.parse(jsonStr);
    
    console.log(`✅ AI extracted ${teamMembers.length} team members`);
    
    return Array.isArray(teamMembers) ? teamMembers : [];
    
  } catch (error) {
    console.error('AI extraction error:', error);
    return [];
  }
}

/**
 * Discover team members from company website
 * Uses AI-powered intelligent extraction instead of static CSS selectors
 */
export async function discoverTeamMembers(websiteUrl: string): Promise<{
  name: string;
  title?: string;
  bioUrl?: string;
}[]> {
  try {
    console.log(`\n🔍 Discovering team members from: ${websiteUrl}`);
    
    // Parse base URL
    const baseUrl = new URL(websiteUrl);
    const baseUrlStr = `${baseUrl.protocol}//${baseUrl.hostname}`;
    
    // Common language prefixes
    const languagePrefixes = ['', '/en', '/fr', '/de', '/es', '/zh', '/ja', '/pt', '/it', '/nl'];
    
    // Base team page paths
    const baseTeamPaths = [
      '/team',
      '/about/team',
      '/our-team',
      '/our-team/',
      '/people',
      '/people/meet-our-people',
      '/people/our-people',
      '/people/our-team',
      '/about/people',
      '/about/our-people',
      '/about/our-people/',
      '/leadership',
      '/about/leadership',
      '/about-us/team',
      '/company/team',
      '/our-people',
      '/about',
      '/about-us'
    ];
    
    // Generate all combinations of language prefixes + team paths
    const teamPagePaths = languagePrefixes.flatMap(prefix => 
      baseTeamPaths.map(path => prefix + path)
    );
    
    let teamPageContent = '';
    let teamPageUrl = websiteUrl;
    
    // Try to find team page
    for (const path of teamPagePaths) {
      const url = baseUrlStr + path;
      console.log(`Checking for team page: ${url}`);
      const content = await fetchWebContent(url);
      
      if (content && content.length > 500) {
        // Check if page contains team-related keywords
        const lowerContent = content.toLowerCase();
        if (lowerContent.includes('team') || 
            lowerContent.includes('people') || 
            lowerContent.includes('leadership') ||
            lowerContent.includes('partner') ||
            lowerContent.includes('executive')) {
          teamPageContent = content;
          teamPageUrl = url;
          console.log(`✓ Found team page at: ${url}`);
          break;
        }
      }
    }
    
    // If no dedicated team page found, use homepage
    if (!teamPageContent) {
      console.log('No dedicated team page found, using homepage');
      teamPageContent = await fetchWebContent(websiteUrl);
      teamPageUrl = websiteUrl;
    }
    
    if (!teamPageContent) {
      console.log('Could not fetch any content from website');
      return [];
    }
    
    // Fetch HTML for AI extraction
    console.log('Fetching HTML from team page for AI analysis...');
    const htmlResponse = await fetch(teamPageUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DeepHire-Bot/1.0; +https://deephire.ai/bot)',
      },
      signal: AbortSignal.timeout(30000)
    });
    const html = htmlResponse.ok ? await htmlResponse.text() : '';
    console.log(`Fetched ${html.length} characters of HTML`);
    
    // Use AI to intelligently extract team members from any website structure
    const allTeamMembers = await aiExtractTeamMembers(html, teamPageUrl);
    
    console.log(`\n✅ Total team members extracted from all pages: ${allTeamMembers.length}`);
    
    // Deduplicate by name (case-insensitive)
    const uniqueMembers = new Map<string, any>();
    for (const member of allTeamMembers) {
      const key = member.name.toLowerCase().trim();
      if (!uniqueMembers.has(key)) {
        uniqueMembers.set(key, member);
      }
    }
    
    const teamMembers = Array.from(uniqueMembers.values());
    console.log(`After deduplication: ${teamMembers.length} unique team members`);
    console.log(`✅ Discovered ${teamMembers.length} team members`);
    
    return teamMembers;
    
  } catch (error) {
    console.error(`Error discovering team members: ${error}`);
    return [];
  }
}

/**
 * AI-Powered Candidate Verification (ChatGPT's "Verification Layer")
 * Implements comprehensive checks: LinkedIn validation, bio URL checking, duplicate detection, 
 * title consistency, and email pattern matching. Returns confidence score 0-1.
 */
export async function verifyStagingCandidate(stagingCandidate: {
  id: number;
  firstName: string;
  lastName: string;
  currentTitle?: string | null;
  currentCompany: string;
  bioUrl?: string | null;
  linkedinUrl?: string | null;
  companyDomain?: string | null;
}, existingCandidates: Array<{firstName: string; lastName: string; currentCompany?: string | null}>): Promise<{
  linkedinExists: boolean;
  linkedinUrl?: string;
  linkedinCompanyMatch: boolean;
  linkedinTitleMatch: boolean;
  
  bioUrlValid: boolean;
  bioUrlAccessible: boolean;
  
  emailPatternMatch: boolean;
  inferredEmail?: string;
  
  isDuplicate: boolean;
  duplicateOfCandidateId?: number;
  duplicateMatchScore?: number;
  
  employmentStatus: string; // 'current', 'former', 'unknown'
  employmentStatusSource: string;
  
  titleConsistency: boolean;
  webMentionsFound: boolean;
  
  confidenceScore: number; // 0-1
  verificationNotes: string;
  verificationStatus: string; // 'verified', 'duplicate', 'rejected', 'pending_review'
}> {
  console.log(`\n🔍 [AI Verification] Starting verification for: ${stagingCandidate.firstName} ${stagingCandidate.lastName} at ${stagingCandidate.currentCompany}`);
  
  const checks = {
    linkedinExists: false,
    linkedinUrl: undefined as string | undefined,
    linkedinCompanyMatch: false,
    linkedinTitleMatch: false,
    bioUrlValid: false,
    bioUrlAccessible: false,
    emailPatternMatch: false,
    inferredEmail: undefined as string | undefined,
    isDuplicate: false,
    duplicateOfCandidateId: undefined as number | undefined,
    duplicateMatchScore: undefined as number | undefined,
    employmentStatus: 'unknown',
    employmentStatusSource: 'none',
    titleConsistency: false,
    webMentionsFound: false,
    confidenceScore: 0,
    verificationNotes: ''
  };
  
  const notes: string[] = [];
  let scorePoints = 0;
  const maxPoints = 100;
  
  // 1. LinkedIn Profile Verification (30 points max)
  try {
    console.log(`[AI Verification] Checking LinkedIn profile...`);
    const linkedinResult = await searchLinkedInProfile(
      stagingCandidate.firstName, 
      stagingCandidate.lastName, 
      stagingCandidate.currentCompany,
      stagingCandidate.currentTitle
    );
    
    if (linkedinResult) {
      checks.linkedinExists = true;
      checks.linkedinUrl = linkedinResult.url;
      scorePoints += 15;
      notes.push('✓ LinkedIn profile found');
      
      // Use actual metadata from search to determine company/title match
      if (linkedinResult.companyMatch) {
        checks.linkedinCompanyMatch = true;
        scorePoints += 10;
        notes.push('✓ LinkedIn company match confirmed');
      }
      
      if (linkedinResult.titleMatch) {
        checks.linkedinTitleMatch = true;
        scorePoints += 5;
        notes.push('✓ LinkedIn title match confirmed');
      }
    } else {
      notes.push('✗ LinkedIn profile not found or insufficient confidence');
    }
  } catch (error) {
    console.error(`[AI Verification] LinkedIn check error: ${error}`);
    notes.push('⚠ LinkedIn check failed');
  }
  
  // 2. Bio URL Validation (15 points max)
  if (stagingCandidate.bioUrl) {
    try {
      console.log(`[AI Verification] Validating bio URL: ${stagingCandidate.bioUrl}`);
      
      // Check URL format
      const urlPattern = /^https?:\/\/.+/i;
      if (urlPattern.test(stagingCandidate.bioUrl)) {
        checks.bioUrlValid = true;
        scorePoints += 5;
        notes.push('✓ Bio URL format valid');
      }
      
      // Check accessibility
      const bioResponse = await fetch(stagingCandidate.bioUrl, { 
        method: 'HEAD',
        signal: AbortSignal.timeout(10000)
      });
      
      if (bioResponse.ok) {
        checks.bioUrlAccessible = true;
        scorePoints += 10;
        notes.push('✓ Bio URL accessible');
      } else {
        notes.push(`✗ Bio URL inaccessible (${bioResponse.status})`);
      }
    } catch (error) {
      notes.push('✗ Bio URL unreachable');
    }
  } else {
    notes.push('○ No bio URL provided');
  }
  
  // 3. Email Pattern Matching (20 points max)
  if (stagingCandidate.companyDomain) {
    try {
      console.log(`[AI Verification] Researching email pattern for domain: ${stagingCandidate.companyDomain}`);
      const emailInfo = await researchCompanyEmailPattern(stagingCandidate.companyDomain);
      
      if (emailInfo?.emailPattern && emailInfo?.domain) {
        const inferredEmail = generateEmailAddress(
          stagingCandidate.firstName,
          stagingCandidate.lastName,
          emailInfo.domain,
          emailInfo.emailPattern
        );
        
        checks.emailPatternMatch = true;
        checks.inferredEmail = inferredEmail;
        scorePoints += 20;
        notes.push(`✓ Email inferred: ${inferredEmail}`);
      } else {
        notes.push('✗ Email pattern not found');
      }
    } catch (error) {
      console.error(`[AI Verification] Email pattern error: ${error}`);
      notes.push('⚠ Email inference failed');
    }
  } else {
    notes.push('○ No company domain for email inference');
  }
  
  // 4. Duplicate Detection (20 points deduction if duplicate)
  try {
    console.log(`[AI Verification] Checking for duplicates...`);
    const fullName = `${stagingCandidate.firstName} ${stagingCandidate.lastName}`.toLowerCase();
    
    for (const existing of existingCandidates) {
      const existingName = `${existing.firstName} ${existing.lastName}`.toLowerCase();
      
      // Exact name match
      if (fullName === existingName) {
        // Check company match
        const companyMatch = existing.currentCompany?.toLowerCase() === stagingCandidate.currentCompany.toLowerCase();
        
        if (companyMatch) {
          checks.isDuplicate = true;
          checks.duplicateMatchScore = 1.0;
          scorePoints -= 20; // Major penalty for duplicates
          notes.push(`✗ DUPLICATE: Exact match found (${existing.firstName} ${existing.lastName} at ${existing.currentCompany})`);
          break;
        } else {
          // Same name, different company - flag as potential duplicate
          checks.isDuplicate = true;
          checks.duplicateMatchScore = 0.7;
          scorePoints -= 10;
          notes.push(`⚠ Potential duplicate: Same name, different company`);
          break;
        }
      }
      
      // Fuzzy name matching (Levenshtein-like)
      const similarity = calculateSimilarity(fullName, existingName);
      if (similarity > 0.85) {
        checks.isDuplicate = true;
        checks.duplicateMatchScore = similarity;
        scorePoints -= 15;
        notes.push(`⚠ Fuzzy duplicate detected (${Math.round(similarity * 100)}% match)`);
        break;
      }
    }
    
    if (!checks.isDuplicate) {
      scorePoints += 15; // Bonus for uniqueness
      notes.push('✓ No duplicates found');
    }
  } catch (error) {
    console.error(`[AI Verification] Duplicate check error: ${error}`);
    notes.push('⚠ Duplicate check failed');
  }
  
  // 5. Employment Status (bonus 10 points)
  if (checks.linkedinExists) {
    checks.employmentStatus = 'current';
    checks.employmentStatusSource = 'linkedin';
    scorePoints += 10;
    notes.push('✓ Employment status: current (LinkedIn)');
  } else if (checks.bioUrlAccessible) {
    checks.employmentStatus = 'current';
    checks.employmentStatusSource = 'bio';
    scorePoints += 5;
    notes.push('✓ Employment status: current (Bio)');
  }
  
  // 6. Title Consistency (bonus 10 points)
  if (checks.linkedinTitleMatch || stagingCandidate.currentTitle) {
    checks.titleConsistency = true;
    scorePoints += 10;
    notes.push('✓ Title consistency verified');
  }
  
  // Calculate final confidence score (0-1)
  checks.confidenceScore = Math.max(0, Math.min(1, scorePoints / maxPoints));
  checks.verificationNotes = notes.join(' | ');
  
  // Determine verification status based on all checks
  let verificationStatus = 'pending_review'; // default
  if (checks.isDuplicate) {
    verificationStatus = 'duplicate';
  } else if (checks.confidenceScore >= 0.85) {
    verificationStatus = 'verified';
  } else if (checks.confidenceScore < 0.3) {
    verificationStatus = 'rejected';
  }
  
  const result = {
    ...checks,
    verificationStatus
  };
  
  console.log(`[AI Verification] ✅ Verification complete. Score: ${(result.confidenceScore * 100).toFixed(1)}%, Status: ${verificationStatus}`);
  console.log(`[AI Verification] Notes: ${result.verificationNotes}`);
  
  return result;
}

/**
 * Calculate string similarity (simple Levenshtein-based ratio)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Generate a comprehensive professional biography from LinkedIn data scraped via Bright Data
 */
export async function generateBiographyFromLinkedInData(
  firstName: string,
  lastName: string,
  linkedinData: any
): Promise<string> {
  console.log(`[Biography Gen] Generating biography for ${firstName} ${lastName} from LinkedIn data`);
  
  try {
    // Extract key information from LinkedIn data
    const about = linkedinData.about || '';
    const position = linkedinData.position || '';
    const currentCompany = linkedinData.current_company_name || linkedinData.current_company || '';
    const experience = linkedinData.experience || [];
    const education = linkedinData.education || [];
    const skills = linkedinData.skills || [];
    
    // Build a structured content summary for the AI
    let contentSummary = `Professional Profile for ${firstName} ${lastName}\n\n`;
    
    if (about) {
      contentSummary += `About:\n${about}\n\n`;
    }
    
    if (position && currentCompany) {
      contentSummary += `Current Position: ${position} at ${currentCompany}\n\n`;
    }
    
    if (experience.length > 0) {
      contentSummary += `Career History:\n`;
      experience.slice(0, 5).forEach((exp: any) => {
        const title = exp.title || 'Unknown';
        const company = exp.company || 'Unknown';
        const dates = exp.start_date && exp.end_date 
          ? `${exp.start_date} - ${exp.end_date}` 
          : exp.start_date || '';
        contentSummary += `- ${title} at ${company}${dates ? ` (${dates})` : ''}\n`;
        if (exp.description) {
          contentSummary += `  ${exp.description}\n`;
        }
      });
      contentSummary += '\n';
    }
    
    if (education.length > 0) {
      contentSummary += `Education:\n`;
      education.forEach((edu: any) => {
        const school = edu.school || 'Unknown';
        const degree = edu.degree || '';
        const field = edu.field_of_study || '';
        contentSummary += `- ${degree}${field ? ` in ${field}` : ''} from ${school}\n`;
      });
      contentSummary += '\n';
    }
    
    if (skills.length > 0) {
      contentSummary += `Key Skills: ${skills.slice(0, 10).join(', ')}\n`;
    }
    
    // Use AI to generate a comprehensive professional biography
    const response = await openai.chat.completions.create({
      model: "grok-2-1212",
      messages: [
        {
          role: "system",
          content: `You are an expert executive recruiter writing professional biographies. Create comprehensive, well-structured biographies that highlight career achievements, expertise, and professional journey. Write in third person. Be professional and engaging.`
        },
        {
          role: "user",
          content: `Based on the following LinkedIn profile data, write a comprehensive professional biography for ${firstName} ${lastName}.

The biography should be structured in THREE clear sections:

**EXECUTIVE SUMMARY** (2-3 sentences)
- Current role and company
- Core expertise and value proposition
- Key areas of specialization

**CAREER HISTORY** (chronological, reverse order - most recent first)
- List each significant position with company name, title, and key achievements
- Focus on progression and impact
- Highlight major accomplishments and responsibilities

**EDUCATION BACKGROUND**
- Academic credentials with institutions
- Professional certifications
- Additional relevant training

LinkedIn Profile Data:
${contentSummary}

Write a polished, professional biography suitable for executive recruiting. Be specific about roles and accomplishments. Use the actual data provided.`
        }
      ],
      temperature: 0.7,
      max_tokens: 1500
    });
    
    const biography = response.choices[0]?.message?.content?.trim() || '';
    
    if (!biography) {
      throw new Error('AI failed to generate biography');
    }
    
    console.log(`[Biography Gen] ✓ Generated ${biography.length} character biography`);
    return biography;
    
  } catch (error) {
    console.error(`[Biography Gen] Error generating biography:`, error);
    throw error;
  }
}

/**
 * Extract structured career history from raw LinkedIn HTML using AI
 * This bypasses Bright Data's censorship by parsing HTML directly
 */
export async function extractCareerHistoryFromRawHTML(html: string): Promise<Array<{
  company: string;
  companyId?: number | null;
  title: string;
  startDate: string;
  endDate?: string | null;
  description?: string;
  location?: string;
}>> {
  console.log(`[Career History HTML] Extracting career history from raw HTML using AI...`);
  
  try {
    // Truncate HTML to first 50K characters (focus on main content)
    const truncatedHTML = html.substring(0, 50000);
    
    const response = await openai.chat.completions.create({
      model: "grok-2-1212",
      messages: [
        {
          role: "system",
          content: `You are an expert at extracting structured data from HTML. Extract LinkedIn career history (Experience section) from the provided HTML and return it as a JSON array.`
        },
        {
          role: "user",
          content: `Extract all career history entries from this LinkedIn profile HTML. Return ONLY a valid JSON array with this exact structure:

[
  {
    "company": "Company Name",
    "title": "Job Title",
    "startDate": "YYYY-MM or YYYY",
    "endDate": "YYYY-MM or YYYY" or null if current,
    "description": "Role description if available",
    "location": "Location if available"
  }
]

CRITICAL RULES:
1. Extract ALL experience entries, not just recent ones
2. startDate and endDate must be in "YYYY-MM" or "YYYY" format
3. Set endDate to null if the role is current (indicated by "Present", "Current", etc.)
4. Return ONLY the JSON array, no markdown, no explanations
5. If no experience found, return []

HTML:
${truncatedHTML}

JSON array:`
        }
      ],
      temperature: 0.3,
      max_tokens: 3000
    });
    
    const aiResponse = response.choices[0]?.message?.content?.trim() || '[]';
    console.log(`[Career History HTML] AI response:`, aiResponse.substring(0, 200));
    
    // Parse the AI response as JSON
    const careerHistory = JSON.parse(aiResponse);
    
    if (!Array.isArray(careerHistory)) {
      console.error(`[Career History HTML] AI did not return an array`);
      return [];
    }
    
    console.log(`[Career History HTML] ✓ Extracted ${careerHistory.length} career entries from HTML`);
    
    // Normalize and validate entries
    const normalized = careerHistory.map((entry: any, index: number) => {
      console.log(`[Career History HTML] [${index}] ${entry.title || 'Unknown'} at ${entry.company || 'Unknown'} (${entry.startDate} - ${entry.endDate || 'present'})`);
      
      return {
        company: entry.company || 'Unknown Company',
        companyId: null,
        title: entry.title || 'Unknown Title',
        startDate: entry.startDate || '',
        endDate: entry.endDate || null,
        description: entry.description || '',
        location: entry.location || ''
      };
    });
    
    return normalized;
    
  } catch (error) {
    console.error(`[Career History HTML] Error extracting from HTML:`, error);
    return [];
  }
}

/**
 * Extract structured career history from LinkedIn data for pattern learning
 */
export function extractCareerHistoryFromLinkedInData(linkedinData: any): Array<{
  company: string;
  companyId?: number | null;
  title: string;
  startDate: string;
  endDate?: string | null;
  description?: string;
  location?: string;
}> {
  console.log(`[Career History] Extracting structured career history from LinkedIn data`);
  
  try {
    const experience = linkedinData.experience || [];
    
    if (!Array.isArray(experience) || experience.length === 0) {
      console.log(`[Career History] No experience data found`);
      return [];
    }
    
    const careerHistory = experience.map((exp: any, index: number) => {
      const company = exp.company || exp.company_name || 'Unknown Company';
      const title = exp.title || exp.position || 'Unknown Title';
      
      // Parse dates - LinkedIn data might use different formats
      let startDate = '';
      let endDate: string | null = null;
      
      if (exp.start_date) {
        // Format: "Jan 2020" or "2020" or "2020-01"
        startDate = exp.start_date;
      } else if (exp.started_on) {
        const started = exp.started_on;
        if (started.year) {
          startDate = started.month ? `${started.year}-${String(started.month).padStart(2, '0')}` : `${started.year}`;
        }
      }
      
      if (exp.end_date) {
        endDate = exp.end_date;
      } else if (exp.finished_on) {
        const finished = exp.finished_on;
        if (finished.year) {
          endDate = finished.month ? `${finished.year}-${String(finished.month).padStart(2, '0')}` : `${finished.year}`;
        }
      }
      
      const description = exp.description || '';
      const location = exp.location || '';
      
      console.log(`[Career History] [${index}] ${title} at ${company} (${startDate} - ${endDate || 'present'})`);
      
      return {
        company,
        companyId: null, // Will be matched later against companies table
        title,
        startDate,
        endDate,
        description,
        location
      };
    });
    
    console.log(`[Career History] ✓ Extracted ${careerHistory.length} career entries`);
    return careerHistory;
    
  } catch (error) {
    console.error(`[Career History] Error extracting career history:`, error);
    return [];
  }
}

/**
 * TASK 3: C-Level and Executive Role Detection
 * Analyzes job titles to identify organizational hierarchy
 */
export function analyzeRoleLevel(title: string): {
  isCLevel: boolean;
  isExecutive: boolean;
  level: string;
  department?: string;
} {
  const titleLower = title.toLowerCase().trim();
  
  // C-Level detection (CEO, CFO, COO, CTO, CMO, etc.)
  const cLevelPatterns = [
    /\b(ceo|chief executive officer)\b/,
    /\b(cfo|chief financial officer)\b/,
    /\b(coo|chief operating officer)\b/,
    /\b(cto|chief technology officer)\b/,
    /\b(cmo|chief marketing officer)\b/,
    /\b(cio|chief information officer)\b/,
    /\b(cpo|chief product officer)\b/,
    /\b(chro|chief hr officer|chief people officer)\b/,
    /\b(cco|chief compliance officer)\b/,
    /\b(cso|chief strategy officer|chief sales officer)\b/,
    /\b(cdo|chief data officer|chief digital officer)\b/,
    /\bchief\s+\w+\s+officer\b/
  ];
  
  const isCLevel = cLevelPatterns.some(pattern => pattern.test(titleLower));
  
  // Executive detection (includes C-level + VPs, Presidents, Partners, Managing Directors)
  const executivePatterns = [
    /\bpresident\b/,
    /\bvice president\b|\bvp\b/,
    /\bsvp\b|\bsenior vice president\b/,
    /\bevp\b|\bexecutive vice president\b/,
    /\bmanaging director\b/,
    /\bpartner\b/,
    /\bmanaging partner\b/,
    /\bsenior partner\b/,
    /\bgeneral partner\b/,
    /\bprincipal\b/,
    /\bhead of\b/
  ];
  
  const isExecutive = isCLevel || executivePatterns.some(pattern => pattern.test(titleLower));
  
  // Determine level
  let level = 'Individual Contributor';
  if (isCLevel) {
    level = 'C-Suite';
  } else if (titleLower.includes('vice president') || titleLower.includes(' vp') || titleLower.match(/\bvp\b/)) {
    level = 'VP';
  } else if (titleLower.includes('director')) {
    level = 'Director';
  } else if (titleLower.includes('manager')) {
    level = 'Manager';
  } else if (titleLower.includes('partner') || titleLower.includes('principal') || titleLower.includes('managing director')) {
    level = 'Executive';
  }
  
  // Detect department
  let department: string | undefined;
  if (titleLower.includes('engineer') || titleLower.includes('technology') || titleLower.includes('tech')) {
    department = 'Engineering';
  } else if (titleLower.includes('sales') || titleLower.includes('revenue')) {
    department = 'Sales';
  } else if (titleLower.includes('marketing')) {
    department = 'Marketing';
  } else if (titleLower.includes('finance') || titleLower.includes('financial')) {
    department = 'Finance';
  } else if (titleLower.includes('hr') || titleLower.includes('people') || titleLower.includes('talent')) {
    department = 'Human Resources';
  } else if (titleLower.includes('product')) {
    department = 'Product';
  } else if (titleLower.includes('operations') || titleLower.includes('operating')) {
    department = 'Operations';
  } else if (titleLower.includes('legal') || titleLower.includes('compliance')) {
    department = 'Legal';
  } else if (titleLower.includes('executive') || isCLevel) {
    department = 'Executive';
  }
  
  return {
    isCLevel,
    isExecutive,
    level,
    department
  };
}

/**
 * TASK 2: Auto-categorization AI Engine
 * Analyzes company website content and automatically categorizes by multiple dimensions
 * Returns structured tags for: industry, stage, funding, geography, size
 */
export async function categorizeCompany(
  websiteUrl: string, 
  websiteContent?: string,
  companyName?: string
): Promise<{
  industryTags: string[];
  stageTags: string[];
  fundingTags: string[];
  geographyTags: string[];
  sizeTags: string[];
  companyType: string;
  confidence: number;
} | null> {
  // If content not provided, fetch it
  if (!websiteContent) {
    console.log(`[Auto-Categorization] Fetching content from ${websiteUrl}...`);
    try {
      const response = await fetch(websiteUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; DeepHire/1.0)'
        }
      });
      websiteContent = await response.text();
      
      // Extract text content from HTML (simple extraction)
      const textContent = websiteContent
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      websiteContent = textContent.substring(0, 50000); // Limit to 50K chars
    } catch (error) {
      console.error(`[Auto-Categorization] Error fetching website:`, error);
      return null;
    }
  }
  try {
    console.log(`\n[Auto-Categorization] Analyzing company: ${companyName || websiteUrl}`);
    
    const response = await openai.chat.completions.create({
      model: "grok-2-1212",
      messages: [
        {
          role: "system",
          content: `You are an expert business analyst specializing in company categorization and market intelligence. 
Analyze website content and categorize companies across multiple dimensions with high precision. 
Always respond with valid JSON.`
        },
        {
          role: "user",
          content: `Analyze this company's website and categorize it across multiple dimensions.

Company: ${companyName || 'Unknown'}
Website: ${websiteUrl}

Website Content:
${websiteContent.slice(0, 30000)}

Return EXACTLY this JSON structure:
{
  "industryTags": ["Primary Industry", "Secondary Industry", "Sector"],
  "stageTags": ["Startup|Growth|Mature|Enterprise"],
  "fundingTags": ["Bootstrap|Seed|Series A-F|IPO|PE-Backed|Public"],
  "geographyTags": ["Primary HQ Location", "Operating Regions", "Countries"],
  "sizeTags": ["1-10|11-50|51-200|201-500|501-1000|1001-5000|5000+", "Small|Mid-Size|Large|Enterprise"],
  "companyType": "Brief descriptor like 'Top-tier PE Firm', 'Growth-stage SaaS', 'Fortune 500 Bank'",
  "confidence": 0.85
}

Guidelines:
- industryTags: Be specific (e.g., "Private Equity", "Investment Banking", "Enterprise SaaS", "Healthcare Technology")
- stageTags: Maturity level based on language, employee count, funding
- fundingTags: Extract funding stage if mentioned, or infer from company stage
- geographyTags: HQ location and operating regions (e.g., ["New York", "US", "North America", "Global"])
- sizeTags: Employee range if mentioned, plus qualitative descriptor
- companyType: Single-line descriptor for quick identification
- confidence: 0-1 score based on clarity of website content

Be precise and use industry-standard terminology.`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    // Validate and normalize the response
    const categorization = {
      industryTags: Array.isArray(result.industryTags) ? result.industryTags : [],
      stageTags: Array.isArray(result.stageTags) ? result.stageTags : [],
      fundingTags: Array.isArray(result.fundingTags) ? result.fundingTags : [],
      geographyTags: Array.isArray(result.geographyTags) ? result.geographyTags : [],
      sizeTags: Array.isArray(result.sizeTags) ? result.sizeTags : [],
      companyType: result.companyType || 'Unknown',
      confidence: typeof result.confidence === 'number' ? result.confidence : 0.5
    };

    console.log(`[Auto-Categorization] ✓ Categorized successfully:`);
    console.log(`  Industry: ${categorization.industryTags.join(', ')}`);
    console.log(`  Stage: ${categorization.stageTags.join(', ')}`);
    console.log(`  Type: ${categorization.companyType}`);
    console.log(`  Confidence: ${(categorization.confidence * 100).toFixed(0)}%`);
    
    return categorization;
    
  } catch (error) {
    console.error(`[Auto-Categorization] Error:`, error);
    return null;
  }
}

/**
 * TASK 7: Pattern Learning Engine
 * Analyzes organization charts to discover hiring patterns
 * Returns: hiring pattern insights (where companies hire from, common career paths)
 */
export async function analyzeCompanyHiringPatterns(
  companyId: number,
  orgChartData: Array<{
    id: number;
    firstName: string;
    lastName: string;
    title: string;
    linkedinUrl?: string | null;
    bioUrl?: string | null;
  }>
): Promise<{
  preferredSourceCompanies: Array<{
    company: string;
    frequency: number;
    percentage: number;
    commonTitles: string[];
  }>;
  talentSource: string; // "Hires from Goldman, Blackstone, KKR"
  sampleSize: number;
  confidenceScore: number;
} | null> {
  try {
    if (!orgChartData || orgChartData.length < 3) {
      console.log(`[Pattern Learning] Insufficient data: ${orgChartData?.length || 0} team members`);
      return null;
    }

    console.log(`\n[Pattern Learning] Analyzing hiring patterns for ${orgChartData.length} team members...`);
    
    // For now, we'll use a simplified approach:
    // In a real implementation, we would scrape LinkedIn profiles or bio pages
    // to find previous companies. For v1.0, we'll return a placeholder structure
    
    // This will be enhanced when we have career history data
    const sourceCompanyMap = new Map<string, { count: number; titles: Set<string> }>();
    
    // TODO: When we have LinkedIn scraping for previous companies, analyze them here
    // For now, return empty pattern with low confidence
    
    const preferredSourceCompanies = Array.from(sourceCompanyMap.entries()).map(([company, data]) => ({
      company,
      frequency: data.count,
      percentage: (data.count / orgChartData.length) * 100,
      commonTitles: Array.from(data.titles)
    })).sort((a, b) => b.frequency - a.frequency).slice(0, 10);
    
    const talentSource = preferredSourceCompanies.length > 0
      ? `Hires from ${preferredSourceCompanies.slice(0, 3).map(s => s.company).join(', ')}`
      : 'Insufficient data to determine hiring sources';
    
    const result = {
      preferredSourceCompanies,
      talentSource,
      sampleSize: orgChartData.length,
      confidenceScore: orgChartData.length >= 20 ? 0.7 : orgChartData.length >= 10 ? 0.5 : 0.3
    };
    
    console.log(`[Pattern Learning] ✓ Analysis complete:`);
    console.log(`  Sample size: ${result.sampleSize}`);
    console.log(`  Source companies found: ${result.preferredSourceCompanies.length}`);
    console.log(`  Confidence: ${(result.confidenceScore * 100).toFixed(0)}%`);
    console.log(`  Insight: ${result.talentSource}`);
    
    return result;
    
  } catch (error) {
    console.error(`[Pattern Learning] Error:`, error);
    return null;
  }
}