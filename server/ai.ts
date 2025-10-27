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
 * Helper function to strip markdown code blocks from AI responses before JSON parsing
 * Handles: ```json {...} ``` or ``` {...} ```
 */
function stripMarkdownJson(text: string): string {
  return text.replace(/^```(?:json)?\s*\n?/g, '').replace(/\n?```\s*$/g, '');
}

/**
 * Generate conversational AI response for recruiting assistant
 * Uses Grok to handle natural dialogue, detect intent, and guide conversation
 */
export async function generateConversationalResponse(
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  companyContext?: {
    companyName?: string;
    industry?: string;
    companySize?: string;
    companyStage?: string;
  },
  currentJobContext?: {
    title?: string;
    skills?: string[];
    location?: string;
    industry?: string;
    yearsExperience?: number;
    salary?: string;
    urgency?: string;
    companySize?: string;
  }
): Promise<{
  response: string;
  intent: 'greeting' | 'job_inquiry' | 'clarification' | 'ready_to_search';
  extractedInfo?: {
    title?: string;
    skills?: string[];
    location?: string;
    industry?: string;
    yearsExperience?: number;
    salary?: string;
    urgency?: string;
    companySize?: string;
  };
}> {
  try {
    const systemPrompt = `You are a senior executive recruiter AI assistant for DeepHire, a talent acquisition platform. Your role is to have natural, consultative conversations with clients to understand their hiring needs.

**Your personality:**
- Warm, professional, and conversational
- Like a senior recruiter, not a chatbot
- Ask clarifying questions to understand requirements fully
- Acknowledge what you already know from company profile

**Conversation guidelines:**
1. **Greetings**: Respond warmly to casual greetings ("Hi", "Hello", "How are you?") without forcing job questions
2. **Progressive engagement**: Stay casual until they mention hiring needs
3. **Consultative approach**: When they mention hiring, ask clarifying questions BEFORE offering to search
4. **Context-aware**: Acknowledge information from their company profile (industry, size) - don't ask what you already know
5. **Two-tier search**: When ready, explain Internal (15 min) vs External (premium) search options

${companyContext ? `**Company context you already know:**
- Company: ${companyContext.companyName}
- Industry: ${companyContext.industry || 'Not specified'}
- Size: ${companyContext.companySize || 'Not specified'}
- Stage: ${companyContext.companyStage || 'Not specified'}

DON'T ask about industry if you already know it. Acknowledge it instead.` : ''}

${currentJobContext && Object.keys(currentJobContext).length > 0 ? `**Job context accumulated so far:**
${currentJobContext.title ? `- Position: ${currentJobContext.title}` : ''}
${currentJobContext.skills?.length ? `- Skills: ${currentJobContext.skills.join(', ')}` : ''}
${currentJobContext.location ? `- Location: ${currentJobContext.location}` : ''}
${currentJobContext.industry ? `- Industry: ${currentJobContext.industry}` : ''}
${currentJobContext.yearsExperience ? `- Experience: ${currentJobContext.yearsExperience} years` : ''}
${currentJobContext.salary ? `- Salary: ${currentJobContext.salary}` : ''}
${currentJobContext.urgency ? `- Urgency: ${currentJobContext.urgency}` : ''}
${currentJobContext.companySize ? `- Company size: ${currentJobContext.companySize}` : ''}` : ''}

**Your response should be natural and conversational, not a templated form.**`;

    const response = await openai.chat.completions.create({
      model: "grok-2-1212",
      messages: [
        { role: "system", content: systemPrompt },
        ...conversationHistory.map(msg => ({ role: msg.role, content: msg.content })),
        { role: "user", content: userMessage }
      ],
      temperature: 0.7, // More natural, less robotic
    });

    const aiResponse = response.choices[0].message.content || "I'm here to help you find talent. How can I assist you today?";

    // Determine intent from the conversation
    const lowerMessage = userMessage.toLowerCase();
    const greetingPatterns = ['hi', 'hello', 'hey', 'good morning', 'how are you'];
    const hiringKeywords = ['hire', 'hiring', 'recruit', 'candidate', 'looking for', 'need', 'position', 'role', 'job'];
    
    const isGreeting = greetingPatterns.some(p => lowerMessage.includes(p));
    const mentionsHiring = hiringKeywords.some(k => lowerMessage.includes(k));
    const hasJobContext = currentJobContext && Object.keys(currentJobContext).length > 0;

    let intent: 'greeting' | 'job_inquiry' | 'clarification' | 'ready_to_search';
    if (isGreeting && !mentionsHiring && !hasJobContext) {
      intent = 'greeting';
    } else if (mentionsHiring || hasJobContext) {
      // Check if we have enough info to search
      const hasEnoughInfo = currentJobContext?.title && 
                           currentJobContext?.skills?.length && 
                           currentJobContext?.location;
      intent = hasEnoughInfo ? 'ready_to_search' : 'clarification';
    } else {
      intent = 'job_inquiry';
    }

    return {
      response: aiResponse,
      intent,
      extractedInfo: undefined // Grok will handle extraction in its response
    };
  } catch (error) {
    console.error("Error generating conversational response:", error);
    return {
      response: "I'm here to help you find exceptional talent. How can I assist you today?",
      intent: 'greeting'
    };
  }
}

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
 * LAYER 1: Extract offices from Schema.org JSON-LD structured data
 * This is the most reliable method when available
 */
async function extractOfficesFromJsonLd(html: string): Promise<Array<{city: string, country?: string, address?: string}>> {
  const offices: Array<{city: string, country?: string, address?: string}> = [];
  
  try {
    // Find all JSON-LD script tags
    const $ = cheerio.load(html);
    const scripts = $('script[type="application/ld+json"]');
    
    scripts.each((_, script) => {
      try {
        const data = JSON.parse($(script).html() || '{}');
        
        // Handle Organization or LocalBusiness schema
        if (data['@type'] === 'Organization' || data['@type'] === 'LocalBusiness') {
          const address = data.address;
          if (address && typeof address === 'object') {
            offices.push({
              city: address.addressLocality || null,
              country: address.addressCountry || null,
              address: address.streetAddress || null
            });
          }
        }
        
        // Handle arrays of locations
        if (Array.isArray(data.location)) {
          for (const loc of data.location) {
            const address = loc.address;
            if (address) {
              offices.push({
                city: address.addressLocality || null,
                country: address.addressCountry || null,
                address: address.streetAddress || null
              });
            }
          }
        }
      } catch (err) {
        // Skip malformed JSON-LD
      }
    });
    
    if (offices.length > 0) {
      console.log(`✅ Layer 1 (JSON-LD): Found ${offices.length} offices`);
    }
  } catch (error) {
    console.log('⚠️ Layer 1 (JSON-LD): Failed to parse');
  }
  
  return offices;
}

/**
 * LAYER 2: Extract offices from Schema.org microdata (itemprop attributes)
 */
async function extractOfficesFromMicrodata(html: string): Promise<Array<{city: string, country?: string, address?: string}>> {
  const offices: Array<{city: string, country?: string, address?: string}> = [];
  
  try {
    const $ = cheerio.load(html);
    
    // Find all elements with itemprop="address"
    $('[itemprop="address"]').each((_, element) => {
      const $el = $(element);
      
      const city = $el.find('[itemprop="addressLocality"]').text().trim();
      const country = $el.find('[itemprop="addressCountry"]').text().trim();
      const address = $el.find('[itemprop="streetAddress"]').text().trim();
      
      if (city || country || address) {
        offices.push({
          city: city || 'Unknown',
          country: country || undefined,
          address: address || undefined
        });
      }
    });
    
    if (offices.length > 0) {
      console.log(`✅ Layer 2 (Microdata): Found ${offices.length} offices`);
    }
  } catch (error) {
    console.log('⚠️ Layer 2 (Microdata): Failed to parse');
  }
  
  return offices;
}

/**
 * LAYER 3: Extract offices using common CSS selectors and patterns
 */
async function extractOfficesFromSelectors(html: string): Promise<Array<{city: string, country?: string, address?: string}>> {
  const offices: Array<{city: string, country?: string, address?: string}> = [];
  
  try {
    const $ = cheerio.load(html);
    
    // Common selectors for office/location sections
    const officeSelectors = [
      '.office-location', '.office', '.location', '.branch',
      '.office-card', '.location-item', '.office-item',
      '[class*="office"]', '[class*="location"]',
      'address', '.address', '.contact-address'
    ];
    
    const uniqueOffices = new Set<string>();
    
    for (const selector of officeSelectors) {
      $(selector).each((_, element) => {
        const $el = $(element);
        const text = $el.text().trim();
        
        // Skip empty or very short text
        if (!text || text.length < 10) return;
        
        // Look for city/country patterns in the text
        const cityCountryPattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g;
        const matches = Array.from(text.matchAll(cityCountryPattern));
        
        for (const match of matches) {
          const office = {
            city: match[1],
            country: match[2],
            address: text.length < 200 ? text : undefined
          };
          
          const key = `${office.city}-${office.country}`;
          if (!uniqueOffices.has(key)) {
            uniqueOffices.add(key);
            offices.push(office);
          }
        }
      });
    }
    
    if (offices.length > 0) {
      console.log(`✅ Layer 3 (CSS Selectors): Found ${offices.length} offices`);
    }
  } catch (error) {
    console.log('⚠️ Layer 3 (CSS Selectors): Failed to parse');
  }
  
  return offices;
}

/**
 * LAYER 4: Use AI to extract office locations from HTML content
 * This is the most flexible method and works as a final fallback
 */
async function extractOfficesWithAI(htmlContent: string, url: string): Promise<Array<{city: string, country?: string, address?: string}>> {
  try {
    console.log(`🤖 Layer 4 (AI): Analyzing HTML content (${htmlContent.length} chars)`);
    
    const officesResponse = await openai.chat.completions.create({
      model: "grok-2-1212",
      messages: [
        {
          role: "system",
          content: "You are an expert at extracting structured office location data from website HTML. Extract ALL office locations mentioned. Always respond with valid JSON."
        },
        {
          role: "user",
          content: `Extract ALL office locations from this HTML content. Look for cities, countries, addresses, and any geographic information.

URL: ${url}

HTML Content (first 25000 chars):
${htmlContent.slice(0, 25000)}

Return this EXACT JSON structure:
{
  "offices": [
    {
      "city": "city name",
      "country": "country name",
      "address": "full address if available, otherwise null"
    }
  ]
}

Rules:
1. Extract EVERY office location mentioned (HQ + all branch offices)
2. Look for: city names, country names, full addresses
3. Common patterns: "New York", "London Office", "123 Main St, Chicago, IL"
4. If only city/country mentioned (no street address), include it with address: null
5. Skip duplicates
6. If NO offices found, return {"offices": []}
7. DO NOT fabricate - only extract what's actually there`
        }
      ],
      response_format: { type: "json_object" }
    });
    
    const result = JSON.parse(officesResponse.choices[0].message.content || '{"offices":[]}');
    const offices = result.offices || [];
    
    console.log(`✅ Layer 4 (AI): Extracted ${offices.length} office locations`);
    if (offices.length > 0) {
      console.log(`   📍 AI returned offices:`, JSON.stringify(offices.slice(0, 5), null, 2));
    } else {
      console.log(`   ⚠️ AI returned empty array - no offices found in HTML`);
      console.log(`   Raw AI response:`, officesResponse.choices[0].message.content?.slice(0, 500));
    }
    return offices;
    
  } catch (error) {
    console.error(`❌ Layer 4 (AI) failed: ${error}`);
    return [];
  }
}

/**
 * MULTI-LAYER OFFICE EXTRACTION
 * Tries multiple strategies in order: JSON-LD → Microdata → CSS Selectors → AI
 * Combines results from all successful layers
 */
async function extractOfficesMultiLayer(html: string, url: string): Promise<Array<{city: string, country?: string, address?: string}>> {
  console.log('🔍 Starting multi-layer office extraction...');
  console.log(`   Input: ${html.length} chars of HTML from ${url}`);
  
  let allOffices: Array<{city: string, country?: string, address?: string}> = [];
  
  // Layer 1: JSON-LD (fastest, most reliable)
  console.log('   Trying Layer 1 (JSON-LD)...');
  const jsonLdOffices = await extractOfficesFromJsonLd(html);
  if (jsonLdOffices.length === 0) {
    console.log('   ⚠️ Layer 1 (JSON-LD): Found 0 offices');
  }
  allOffices.push(...jsonLdOffices);
  
  // Layer 2: Microdata
  console.log('   Trying Layer 2 (Microdata)...');
  const microdataOffices = await extractOfficesFromMicrodata(html);
  if (microdataOffices.length === 0) {
    console.log('   ⚠️ Layer 2 (Microdata): Found 0 offices');
  }
  allOffices.push(...microdataOffices);
  
  // Layer 3: CSS Selectors
  console.log('   Trying Layer 3 (CSS Selectors)...');
  const selectorOffices = await extractOfficesFromSelectors(html);
  if (selectorOffices.length === 0) {
    console.log('   ⚠️ Layer 3 (CSS Selectors): Found 0 offices');
  }
  allOffices.push(...selectorOffices);
  
  console.log(`   📊 After 3 layers: ${allOffices.length} total offices (before deduplication)`);
  
  // Layer 4: AI (most flexible, use if previous layers found < 3 offices)
  if (allOffices.length < 3) {
    console.log('   ⚠️ Found < 3 offices with structured methods, using AI extraction...');
    const aiOffices = await extractOfficesWithAI(html, url);
    allOffices.push(...aiOffices);
    console.log(`   📊 After AI layer: ${allOffices.length} total offices (before deduplication)`);
  } else {
    console.log(`   ✓ Found ${allOffices.length} offices from structured layers, skipping AI`);
  }
  
  // Deduplicate offices
  console.log('   🔄 Deduplicating offices...');
  const uniqueOffices = new Map<string, any>();
  for (const office of allOffices) {
    if (!office.city && !office.country) {
      console.log(`   ⚠️ Skipping empty office: ${JSON.stringify(office)}`);
      continue;
    }
    
    const key = `${office.city || 'unknown'}-${office.country || 'unknown'}`.toLowerCase();
    if (!uniqueOffices.has(key)) {
      uniqueOffices.set(key, office);
    } else {
      console.log(`   ⚠️ Skipping duplicate: ${key}`);
    }
  }
  
  const finalOffices = Array.from(uniqueOffices.values());
  console.log(`✅ Multi-layer extraction complete: ${finalOffices.length} unique offices found`);
  
  if (finalOffices.length > 0) {
    console.log('   📍 Sample offices:', JSON.stringify(finalOffices.slice(0, 3), null, 2));
  } else {
    console.log('   ❌ WARNING: No offices extracted! This may indicate a problem with the extraction logic.');
  }
  
  return finalOffices;
}

/**
 * Use Playwright browser automation to extract office locations from JavaScript-heavy pages
 * This handles sites where office data is loaded dynamically via JavaScript
 * NOTE: Currently disabled due to missing browser dependencies in Replit - use AI extraction instead
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
  location?: string;
  yearsExperience?: number;
  description?: string;
  responsibilities?: string[];
  company?: string;
  salary?: string;
  industry?: string;
  companySize?: string;
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
            "benefits": ["benefit1", "benefit2"],
            "location": "city/country if mentioned",
            "yearsExperience": number of years if mentioned,
            "description": "brief 1-2 sentence job summary",
            "responsibilities": ["responsibility1", "responsibility2"],
            "company": "company name if mentioned",
            "salary": "salary range if mentioned",
            "industry": "industry (e.g., Private Equity, Technology, Finance, Retail)",
            "companySize": "startup|mid-size|enterprise if mentioned"
          }
          
          Job Description:
          ${jdText}`
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    // Parse yearsExperience flexibly - handle numbers, strings like "5+", "5-7", etc.
    let yearsExp: number | undefined;
    if (typeof result.yearsExperience === 'number') {
      yearsExp = result.yearsExperience;
    } else if (typeof result.yearsExperience === 'string') {
      // Extract first number from strings like "5+ years", "5-7 years", "senior (10 years)"
      const match = result.yearsExperience.match(/(\d+)/);
      if (match) {
        yearsExp = parseInt(match[1], 10);
      }
    }
    
    return {
      title: result.title || "Untitled Position",
      department: result.department || "General",
      skills: Array.isArray(result.skills) ? result.skills : [],
      urgency: ["low", "medium", "high", "urgent"].includes(result.urgency) ? result.urgency : "medium",
      requirements: Array.isArray(result.requirements) ? result.requirements : [],
      benefits: Array.isArray(result.benefits) ? result.benefits : [],
      location: result.location || undefined,
      yearsExperience: yearsExp,
      description: result.description || undefined,
      responsibilities: Array.isArray(result.responsibilities) ? result.responsibilities : undefined,
      company: result.company || undefined,
      salary: result.salary || undefined,
      industry: result.industry || undefined,
      companySize: result.companySize || undefined,
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

// Generate executive biography from CV text
export async function generateBiographyFromCV(cvText: string, candidateName: string): Promise<string> {
  try {
    // Truncate CV text to prevent token limit issues
    const MAX_CV_LENGTH = 50000;
    const truncatedText = cvText.length > MAX_CV_LENGTH 
      ? cvText.substring(0, MAX_CV_LENGTH) + "\n\n[CV text truncated...]"
      : cvText;
    
    const response = await openai.chat.completions.create({
      model: "grok-2-1212",
      messages: [
        {
          role: "system",
          content: "You are an executive recruiter writing professional biographies for senior candidates. Write comprehensive, third-person biographies that highlight career achievements, expertise, and professional journey."
        },
        {
          role: "user",
          content: `Write a professional executive biography for ${candidateName} based on their CV below. 

The biography should:
- Be written in third person
- Highlight key career achievements and progression
- Emphasize areas of expertise and specialization
- Include education background
- Be 2-3 paragraphs long
- Sound professional and polished

CV Text:
${truncatedText}`
        }
      ]
    });

    return response.choices[0].message.content || "";
  } catch (error) {
    console.error("Error generating biography from CV:", error);
    return "";
  }
}

// Parse candidate data from CV/resume text
export async function parseCandidateData(cvText: string): Promise<{
  firstName: string;
  lastName: string;
  email: string;
  emailSource?: string;  // 'cv' or 'inferred'
  phoneNumber?: string;  // Changed from phone to phoneNumber
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
    // Truncate CV text to prevent token limit issues
    // Grok-2 has 131k token limit. 1 token ≈ 4 chars, so ~50k chars is safe (~12.5k tokens)
    // This leaves plenty of room for the prompt itself
    const MAX_CV_LENGTH = 50000;
    const truncatedText = cvText.length > MAX_CV_LENGTH 
      ? cvText.substring(0, MAX_CV_LENGTH) + "\n\n[CV text truncated...]"
      : cvText;
    
    const response = await openai.chat.completions.create({
      model: "grok-2-1212",
      messages: [
        {
          role: "system",
          content: "You are an expert recruiter. Parse CV/resume text and extract structured candidate data in JSON format. Pay special attention to names - for Asian names with Western names (e.g., 'Ho Chi Ming, Anthony'), the last name comes first, then given name, then Western name. Always respond with valid JSON."
        },
        {
          role: "user",
          content: `Parse this CV/resume and extract the following information in JSON format:
          {
            "firstName": "first name or Western name (for 'Ho Chi Ming, Anthony' this would be 'Anthony')",
            "lastName": "last/family name (for 'Ho Chi Ming, Anthony' this would be 'Ho')", 
            "email": "email address if found or null",
            "phoneNumber": "phone number if found or null",
            "currentCompany": "current employer",
            "currentTitle": "current job title",
            "basicSalary": numeric_value_if_mentioned_or_null,
            "salaryExpectations": numeric_value_if_mentioned_or_null,
            "linkedinUrl": "full linkedin_url_if_found",
            "skills": ["skill1", "skill2", "skill3"],
            "yearsExperience": numeric_years_total_or_null,
            "location": "city, country/state",
            "isAvailable": true_if_actively_looking_or_false
          }
          
          IMPORTANT: Extract the ACTUAL email and phone from the CV if present. Do not infer or generate them.
          For names with multiple parts like "Ho Chi Ming, Anthony", the structure is: LastName GivenName, WesternName
          
          CV/Resume Text:
          ${truncatedText}`
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    if (!result.firstName || !result.lastName) {
      return null; // Invalid data
    }

    // For CV uploads: prefer actual email from CV, but infer if not present
    // CV email is marked as 'cv' source, inferred email is marked as 'inferred'
    const email = result.email || `${result.firstName}.${result.lastName}@email.com`.toLowerCase();
    const emailSource = result.email ? 'cv' : 'inferred';
    
    return {
      firstName: result.firstName,
      lastName: result.lastName,
      email: email,
      emailSource: emailSource,  // Track whether email came from CV or was inferred
      phoneNumber: result.phoneNumber || undefined,  // Use phoneNumber to match database field
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

// Fetch web content from URL - returns both clean text and raw HTML
async function fetchWebContentWithHtml(url: string): Promise<{cleanText: string, rawHtml: string}> {
  try {
    console.log(`Fetching real content from: ${url}`);
    
    // Basic URL validation
    if (!url || !url.startsWith('http')) {
      console.log('Invalid URL provided');
      return {cleanText: '', rawHtml: ''};
    }
    
    // Try direct fetch with retries
    let html = '';
    const maxRetries = 3;
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'max-age=0',
          },
          // 30 second timeout for slow pages
          signal: AbortSignal.timeout(30000)
        });
        
        if (response.ok) {
          html = await response.text();
          console.log(`✅ Successfully fetched ${html.length} characters from ${url}`);
          break; // Success, exit retry loop
        } else {
          lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
          console.log(`⚠️ Attempt ${attempt}/${maxRetries} failed: ${response.status} ${response.statusText}`);
          
          // Don't retry on 404 or 403 - these won't improve with retries
          if (response.status === 404 || response.status === 403 || response.status === 401) {
            console.log(`   Permanent error (${response.status}), skipping retries`);
            break;
          }
          
          // Wait before retry (exponential backoff)
          if (attempt < maxRetries) {
            const waitMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            console.log(`   Retrying in ${waitMs}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitMs));
          }
        }
      } catch (fetchError: any) {
        lastError = fetchError;
        console.log(`⚠️ Attempt ${attempt}/${maxRetries} error:`, fetchError.message);
        
        // Wait before retry
        if (attempt < maxRetries) {
          const waitMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.log(`   Retrying in ${waitMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitMs));
        }
      }
    }
    
    if (!html && lastError) {
      console.log(`❌ All ${maxRetries} attempts failed for ${url}:`, lastError.message);
      return {cleanText: '', rawHtml: ''}; // Return empty strings instead of throwing
    }
    
    if (!html) {
      return {cleanText: '', rawHtml: ''};
    }
    
    // Parse HTML and extract text content using Cheerio
    const $ = cheerio.load(html);
    
    // Remove script and style elements for clean text extraction
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
    
    // Return both clean text (for AI analysis) and raw HTML (for structured extraction)
    return {
      cleanText: textContent,
      rawHtml: html
    };
    
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      console.error(`Timeout fetching ${url}:`, error.message);
    } else {
      console.error(`Error fetching content from ${url}:`, error);
    }
    return {cleanText: '', rawHtml: ''};
  }
}

// Legacy function for backwards compatibility
async function fetchWebContent(url: string): Promise<string> {
  try {
    console.log(`Fetching real content from: ${url}`);
    
    // Basic URL validation
    if (!url || !url.startsWith('http')) {
      console.log('Invalid URL provided');
      return '';
    }
    
    // Try direct fetch with retries
    let html = '';
    const maxRetries = 3;
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'max-age=0',
          },
          // 30 second timeout for slow pages
          signal: AbortSignal.timeout(30000)
        });
        
        if (response.ok) {
          html = await response.text();
          console.log(`✅ Successfully fetched ${html.length} characters from ${url}`);
          break; // Success, exit retry loop
        } else {
          lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
          console.log(`⚠️ Attempt ${attempt}/${maxRetries} failed: ${response.status} ${response.statusText}`);
          
          // Don't retry on 404 or 403 - these won't improve with retries
          if (response.status === 404 || response.status === 403 || response.status === 401) {
            console.log(`   Permanent error (${response.status}), skipping retries`);
            break;
          }
          
          // Wait before retry (exponential backoff)
          if (attempt < maxRetries) {
            const waitMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            console.log(`   Retrying in ${waitMs}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitMs));
          }
        }
      } catch (fetchError: any) {
        lastError = fetchError;
        console.log(`⚠️ Attempt ${attempt}/${maxRetries} error:`, fetchError.message);
        
        // Wait before retry
        if (attempt < maxRetries) {
          const waitMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.log(`   Retrying in ${waitMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitMs));
        }
      }
    }
    
    if (!html && lastError) {
      console.log(`❌ All ${maxRetries} attempts failed for ${url}:`, lastError.message);
      return ''; // Return empty string instead of throwing - allows other pages to succeed
    }
    
    if (!html) {
      return '';
    }
    
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

// ✓ REMOVED: Old broken findLinkedInProfile function that guessed URLs
// Now using searchLinkedInProfile() which validates URLs with SerpAPI

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
    
    // Step 3: Use the REAL LinkedIn search with SerpAPI validation (not guessing!)
    const actualCompany = result.currentCompany || '';
    let discoveredLinkedInUrl: string | undefined = undefined;
    
    if (actualCompany) {
      console.log(`🔍 Using REAL LinkedIn search: "${result.firstName} ${result.lastName}" at "${actualCompany}"`);
      const linkedInResult = await searchLinkedInProfile(
        result.firstName, 
        result.lastName, 
        actualCompany,
        result.currentTitle || null
      );
      
      if (linkedInResult && linkedInResult.score >= 0.7) {
        discoveredLinkedInUrl = linkedInResult.url;
        console.log(`✓ Found VERIFIED LinkedIn profile: ${discoveredLinkedInUrl} (score: ${linkedInResult.score})`);
      } else {
        console.log(`✗ No verified LinkedIn profile found`);
      }
    }
    
    if (!result.firstName || !result.lastName) {
      console.log('Could not extract valid candidate data from bio');
      return null;
    }

    const candidateData = {
      firstName: result.firstName,
      lastName: result.lastName,
      email: result.email || undefined, // ✓ Don't generate fake emails!
      phoneNumber: result.phoneNumber || undefined,
      currentCompany: result.currentCompany || undefined,
      currentTitle: result.currentTitle || undefined,
      basicSalary: undefined,
      salaryExpectations: undefined,
      bioUrl: bioUrl, // Store original bio URL
      linkedinUrl: discoveredLinkedInUrl, // Store discovered LinkedIn URL (only if verified)
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
      console.log(`  - LinkedIn URL (VERIFIED): ${discoveredLinkedInUrl}`);
    } else {
      console.log(`  - Bio URL: ${bioUrl}`);
      console.log(`  - LinkedIn URL: Not found (no fake URL generated)`);
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
    const urls: string[] = [];
    const urlPattern = /https?:\/\/[^\s,]+/;
    
    // First, try line-by-line extraction (handles plain URL lists)
    const lines = csvString.split(/\r?\n/);
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && urlPattern.test(trimmedLine)) {
        // Extract URL from the line (handles lines with just URLs or CSV rows)
        const match = trimmedLine.match(urlPattern);
        if (match) {
          urls.push(match[0]);
        }
      }
    }
    
    // If we found URLs, return them
    if (urls.length > 0) {
      console.log(`Extracted ${urls.length} URLs from CSV for background processing`);
      return urls;
    }
    
    // Fall back to CSV parsing (handles structured CSV with URL columns)
    const jsonData = await csvToJson().fromString(csvString);
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

// Sanitize null-like strings from CSV data
function sanitizeValue(value: any): any {
  if (typeof value !== 'string') return value;
  
  const trimmed = value.trim();
  const nullLikeValues = ['null', 'nil', 'n/a', 'na', 'none', 'undefined', ''];
  
  if (nullLikeValues.includes(trimmed.toLowerCase())) {
    return null;
  }
  
  return value;
}

// Helper function to extract company data from a CSV/Excel row
async function extractCompanyFromRow(row: any): Promise<any | null> {
  try {
    console.log("Processing company row data:", Object.keys(row), "First few values:", Object.values(row).slice(0, 3));
    
    // Common field mappings for company data with more flexible matching
    const fieldMappings = {
      name: ['name', 'company', 'companyname', 'company_name', 'organization', 'business', 'firm'],
      website: ['website', 'url', 'web', 'site', 'homepage', 'link'],
      parentCompany: ['parent', 'parentcompany', 'parent_company', 'holding_company', 'parent_org'],
      location: ['location', 'address', 'city', 'headquarters', 'hq', 'country', 'region'],
      industry: ['industry', 'sector', 'vertical', 'business_type', 'domain', 'field'],
      employeeSize: ['employees', 'employee_size', 'headcount', 'workforce', 'team_size', 'staff', 'employeecount'],
      subsector: ['subsector', 'sub_sector', 'niche', 'specialty', 'focus_area'],
      stage: ['stage', 'company_stage', 'phase', 'maturity', 'size', 'type'],
      aum: ['aum', 'assets', 'assetsum', 'assets_under_management'],
      investmentFocus: ['investmentfocus', 'investment_focus', 'focus', 'strategy', 'investmentstrategy'],
      foundedYear: ['foundedyear', 'founded_year', 'founded', 'established', 'year'],
      description: ['description', 'about', 'overview', 'summary', 'bio']
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
          let value = sanitizeValue(row[normalizedKeys[normalizedPossibleKey]]);
          
          // Skip empty/null values
          if (value === null || (typeof value === 'string' && value.trim() === '')) {
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
        website: companyData.website || null,
        parentCompany: companyData.parentCompany || null,
        location: companyData.location || 'Unknown',
        industry: companyData.industry || 'Unknown',
        employeeSize: companyData.employeeSize || null,
        subsector: companyData.subsector || null,
        stage: companyData.stage || 'growth',
        // Additional CSV fields
        assetsUnderManagement: companyData.aum || null,
        investmentFocus: companyData.investmentFocus || null,
        foundedYear: companyData.foundedYear ? parseInt(companyData.foundedYear) : null,
        missionStatement: companyData.description || null
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
    const baseUrl = new URL(websiteUrl).origin;
    
    // Step 1: Fetch homepage and discover office/location page links
    console.log(`📄 Fetching homepage to discover office pages...`);
    const homepageContent = await fetchWebContent(websiteUrl);
    
    if (!homepageContent || homepageContent.length < 100) {
      console.log('❌ Could not fetch homepage');
      return null;
    }
    
    // Step 2: Use AI to discover office/location page URLs from homepage
    console.log(`🔍 Using AI to discover office/location page URLs...`);
    const discoveryResponse = await openai.chat.completions.create({
      model: "grok-2-1212",
      messages: [
        {
          role: "system",
          content: "You are an expert web analyst. Find URLs for office/location pages on company websites."
        },
        {
          role: "user",
          content: `Analyze this homepage and find URLs for pages that contain office locations, company offices, or contact information.

Homepage URL: ${websiteUrl}
Homepage Content:
${homepageContent.slice(0, 15000)}

Return EXACTLY this JSON structure:
{
  "officePageUrls": [
    "complete URLs for pages mentioning: offices, locations, contact, our offices, global offices, find us, etc."
  ],
  "aboutPageUrls": [
    "complete URLs for about/company info pages"
  ]
}

RULES:
1. Look for links with text like: "Offices", "Locations", "Our Offices", "Global Offices", "Contact", "Find Us", "Worldwide", "Presence"
2. Return COMPLETE URLs (with https://)
3. If you find relative paths like "/en/our-offices", convert to full URL: "${baseUrl}/en/our-offices"
4. Include up to 5 most relevant URLs total
5. If no office pages found, return empty arrays
6. DO NOT fabricate URLs - only extract what exists in the content`
        }
      ],
      response_format: { type: "json_object" }
    });
    
    const discoveredUrls = JSON.parse(discoveryResponse.choices[0].message.content || "{}");
    const officeUrls = Array.isArray(discoveredUrls.officePageUrls) ? discoveredUrls.officePageUrls : [];
    const aboutUrls = Array.isArray(discoveredUrls.aboutPageUrls) ? discoveredUrls.aboutPageUrls : [];
    
    console.log(`✅ Discovered ${officeUrls.length} office page URLs and ${aboutUrls.length} about page URLs`);
    if (officeUrls.length > 0) {
      console.log(`   Office pages: ${officeUrls.join(', ')}`);
    }
    
    // Step 3: Fetch all discovered pages plus some common fallbacks
    const pagesToTry = [
      websiteUrl, // Homepage
      ...officeUrls,
      ...aboutUrls,
      // Fallback common paths (in case AI missed them)
      `${baseUrl}/contact`,
      `${baseUrl}/about`
    ].filter((url, index, self) => self.indexOf(url) === index); // Remove duplicates
    
    let allContent = '';
    let allRawHtml = ''; // For office extraction (needs HTML structure)
    for (const pageUrl of pagesToTry.slice(0, 10)) { // Limit to 10 pages max
      try {
        console.log(`📥 Fetching: ${pageUrl}`);
        const { cleanText, rawHtml } = await fetchWebContentWithHtml(pageUrl);
        if (cleanText && cleanText.length > 50) {
          allContent += `\n\n=== Content from ${pageUrl} ===\n${cleanText}`;
          allRawHtml += `\n\n${rawHtml}`; // Append raw HTML for office extraction
          console.log(`   ✓ Fetched ${cleanText.length} chars (${rawHtml.length} raw HTML)`);
        }
      } catch (err) {
        console.log(`   ⚠ Could not fetch ${pageUrl}`);
      }
    }
    
    if (!allContent || allContent.length < 100) {
      console.log('Insufficient content from company website');
      return null;
    }
    
    console.log(`✓ Total content fetched: ${allContent.length} characters from multiple pages`);
    console.log(`✓ Raw HTML for office extraction: ${allRawHtml.length} characters`);
    
    // Step 4: Extract offices using multi-layer approach (faster + more reliable)
    // IMPORTANT: Pass raw HTML not cleaned text - layers need HTML structure
    const extractedOffices = await extractOfficesMultiLayer(allRawHtml, websiteUrl);
    
    // Step 5: Extract remaining company data using AI
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
  "annualRevenue": "revenue if mentioned (e.g., '$5B', '€2.3M', 'AUM $500B')",
  "website": "${websiteUrl}"
}

NOTE: Office locations are extracted separately, so focus on extracting name, industry, mission, phone, headquarters, and revenue.

CRITICAL EXTRACTION RULES:
1. SEARCH EVERYWHERE: Headers, footers, contact pages, about sections, sidebars
2. Phone numbers: Look for patterns like +1, (555), 1-800, international formats
3. Addresses: Search "Contact", "Visit Us", "Headquarters", "HQ", footer sections
4. Revenue: Search for "$", "AUM", "revenue", "billion", "assets under management"
5. If headquarters has partial info (just city/country), that's OK - include what you find
6. For description: Use "About Us" or mission statement text - search specifically for 'About Us', 'About', 'Who We Are' sections
7. If data is missing: use null
8. DO NOT fabricate or assume anything
9. Revenue is rarely on websites - leave as null unless explicitly stated`
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
    console.log(`  - Offices (multi-layer): ${extractedOffices.length} locations`);
    
    return {
      name: result.name,
      website: websiteUrl,
      industry: result.industry || null,
      missionStatement: result.missionStatement || null,
      primaryPhone: result.primaryPhone || null,
      headquarters: result.headquarters || null,
      officeLocations: extractedOffices, // Use multi-layer extracted offices
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
    const domain = baseUrl.hostname.replace('www.', '');
    
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
    let consecutiveFailures = 0;
    
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
          consecutiveFailures = 0; // Reset on success
          break;
        }
      } else if (!content) {
        consecutiveFailures++;
        console.log(`⚠️ Failed to fetch (${consecutiveFailures} consecutive failures)`);
        
        // After 3 consecutive failures, likely blocked - stop wasting time
        if (consecutiveFailures >= 3) {
          console.log(`🚫 Too many failures (${consecutiveFailures}). Likely blocked by Cloudflare. Stopping attempts.`);
          break;
        }
      } else {
        consecutiveFailures = 0; // Reset if we got some content
      }
    }
    
    // If no dedicated team page found, use homepage
    if (!teamPageContent) {
      console.log('No dedicated team page found, using homepage');
      teamPageContent = await fetchWebContent(websiteUrl);
      teamPageUrl = websiteUrl;
    }
    
    let teamMembers: any[] = [];
    
    // Only try AI extraction if we have content
    if (teamPageContent) {
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
      
      teamMembers = Array.from(uniqueMembers.values());
      console.log(`After deduplication: ${teamMembers.length} unique team members`);
    } else {
      console.log('Could not fetch any content from website - will try Google Search fallback');
    }
    
    // If no team members found and we have SerpAPI, try Google Search fallback
    if (teamMembers.length === 0 && process.env.SERPAPI_API_KEY) {
      console.log(`\n🔍 [GOOGLE FALLBACK] No team members found via direct scraping. Trying Google Search fallback...`);
      console.log(`[GOOGLE FALLBACK] Domain: ${domain}, Has SERPAPI_API_KEY: ${!!process.env.SERPAPI_API_KEY}`);
      try {
        // STRATEGY: Search for individual profile URL patterns (e.g., site:carlyle.com/team/)
        // This discovers 100s of individual profiles instead of just the team listing page!
        const profilePatterns = [
          // Generic patterns
          `site:${domain}/team/`,
          `site:${domain}/people/`,
          `site:${domain}/leadership/`,
          `site:${domain}/our-people/`,
          `site:${domain}/our-team/`,
          `site:${domain}/management/`,
          `site:${domain}/executives/`,
          // Common company-specific patterns  
          `site:${domain}/about/team/`,
          `site:${domain}/about/people/`,
          `site:${domain}/about/leadership/`,
          // Carlyle-specific pattern (from user's example)
          `site:${domain}/about-carlyle/team/`,
          // Alternative nested patterns
          `site:${domain}/company/team/`,
          `site:${domain}/who-we-are/team/`,
        ];
        
        console.log(`[GOOGLE FALLBACK] Searching for individual profile URL patterns...`);
        
        // Try each pattern and collect all profile URLs
        const allProfileUrls = new Set<{ url: string; title: string; snippet: string }>();
        
        for (const pattern of profilePatterns) {
          try {
            console.log(`[GOOGLE FALLBACK] Pattern: ${pattern}`);
            const serpApiUrl = `https://serpapi.com/search.json?q=${encodeURIComponent(pattern)}&api_key=${process.env.SERPAPI_API_KEY}&num=100`;
            const searchResponse = await fetch(serpApiUrl);
            const searchData: any = await searchResponse.json();
            
            if (searchData.organic_results && searchData.organic_results.length > 0) {
              console.log(`[GOOGLE FALLBACK] ✓ Found ${searchData.organic_results.length} SERP results for ${pattern}`);
              let profilesFromThisPattern = 0;
              
              for (const result of searchData.organic_results) {
                // Filter for individual profile pages
                // INCLUDE: URLs with profile paths that have more after them (e.g., /team/john-doe)
                // EXCLUDE: Generic listing pages (e.g., /team, /team/, /our-people)
                if (result.link && result.title) {
                  const url = result.link.toLowerCase();
                  const isProfilePath = url.includes('/team/') || url.includes('/people/') || 
                                        url.includes('/leadership/') || url.includes('/our-people/') ||
                                        url.includes('/our-team/') || url.includes('/management/') ||
                                        url.includes('/executives/');
                  
                  // Exclude main listing pages (they end with the directory name or just /)
                  const isListingPage = url.endsWith('/team') || url.endsWith('/team/') ||
                                       url.endsWith('/people') || url.endsWith('/people/') ||
                                       url.endsWith('/leadership') || url.endsWith('/leadership/') ||
                                       url.endsWith('/our-people') || url.endsWith('/our-people/') ||
                                       url.endsWith('/our-team') || url.endsWith('/our-team/') ||
                                       url.endsWith('/management') || url.endsWith('/management/') ||
                                       url.endsWith('/executives') || url.endsWith('/executives/');
                  
                  // Also exclude pagination and filter pages
                  const isPaginationOrFilter = url.includes('?page=') || url.includes('&filter=') || 
                                              url.includes('/page/') || url.includes('#');
                  
                  if (isProfilePath && !isListingPage && !isPaginationOrFilter) {
                    const sizeBefore = allProfileUrls.size;
                    allProfileUrls.add({
                      url: result.link,
                      title: result.title || '',
                      snippet: result.snippet || ''
                    });
                    if (allProfileUrls.size > sizeBefore) {
                      profilesFromThisPattern++;
                    }
                  }
                }
              }
              console.log(`[GOOGLE FALLBACK] → Added ${profilesFromThisPattern} unique profiles from this pattern (total: ${allProfileUrls.size})`);
            }
          } catch (patternError) {
            console.log(`[GOOGLE FALLBACK] Pattern ${pattern} failed:`, patternError);
          }
          
          // Stop if we have enough profiles
          if (allProfileUrls.size >= 100) {
            console.log(`[GOOGLE FALLBACK] Reached 100 profiles, stopping search`);
            break;
          }
        }
        
        console.log(`[GOOGLE FALLBACK] Total individual profile URLs discovered: ${allProfileUrls.size}`);
        
        // Extract names from discovered profiles using AI
        if (allProfileUrls.size > 0) {
          console.log(`[GOOGLE FALLBACK] Extracting names from ${allProfileUrls.size} individual profiles...`);
          
          // Build a list of profiles for AI extraction
          const profileList = Array.from(allProfileUrls).slice(0, 100).map(p => 
            `Title: ${p.title}\nURL: ${p.url}\nSnippet: ${p.snippet}\n---`
          ).join('\n');
          
          const openai = await import('openai').then(mod => mod.default);
          const client = new openai({
            baseURL: "https://api.x.ai/v1",
            apiKey: process.env.XAI_API_KEY
          });
          
          const extractionPrompt = `Extract team member information from these individual profile pages found on ${domain}.

Profile Pages:
${profileList}

For each profile, extract:
- name: Full name (e.g., "William McMullan", "Broes Langelaar", "Antonio Capo")
- title: Job title if mentioned in title or snippet
- bioUrl: The URL of the profile page

IMPORTANT:
- Extract the person's name from the page title (e.g., "William McMullan | Carlyle" → "William McMullan")
- Only extract names with BOTH first and last names
- Skip generic pages like "Team", "Our People", "Leadership"
- Each profile URL represents ONE person

Return JSON object with "members" array:
{
  "members": [
    { "name": "William McMullan", "title": "Partner and Co-Head of Financial Services", "bioUrl": "https://..." },
    { "name": "Broes Langelaar", "title": "", "bioUrl": "https://..." }
  ]
}`;

          const aiResponse = await client.chat.completions.create({
            model: "grok-2-1212",
            messages: [{ role: "user", content: extractionPrompt }],
            temperature: 0.3,
            response_format: { type: "json_object" }
          });
          
          const aiContent = aiResponse.choices[0].message.content?.trim() || '{}';
          console.log(`[GOOGLE FALLBACK] AI extracted from ${allProfileUrls.size} profiles`);
          
          const extracted = JSON.parse(aiContent);
          const membersFromProfiles = Array.isArray(extracted.members) ? extracted.members : 
                                      Array.isArray(extracted) ? extracted : [];
          
          console.log(`✅ [GOOGLE FALLBACK] Found ${membersFromProfiles.length} team members from individual profiles`);
          
          if (membersFromProfiles.length > 0) {
            return membersFromProfiles;
          }
        }
        
        // Fallback to old approach if no individual profiles found
        console.log(`[GOOGLE FALLBACK] No individual profiles found, trying generic search...`);
        const searchQuery = `site:${domain} (team OR people OR leadership OR executives OR "our people" OR "management team" OR "executive team" OR directors OR officers)`;
        const serpApiUrl = `https://serpapi.com/search.json?q=${encodeURIComponent(searchQuery)}&api_key=${process.env.SERPAPI_API_KEY}&num=50`;
        const searchResponse = await fetch(serpApiUrl);
        const searchData: any = await searchResponse.json();
        
        console.log(`[GOOGLE FALLBACK] SerpAPI response status: ${searchResponse.status}`);
        console.log(`[GOOGLE FALLBACK] Organic results count: ${searchData.organic_results?.length || 0}`);
        
        let searchSnippets = '';
        if (searchData.organic_results) {
          for (const result of searchData.organic_results.slice(0, 30)) {
            searchSnippets += `\n---\n`;
            searchSnippets += `Title: ${result.title}\n`;
            searchSnippets += `URL: ${result.link}\n`;
            searchSnippets += `Snippet: ${result.snippet || ''}\n`;
            if (result.rich_snippet?.top?.detected_extensions) {
              searchSnippets += `Additional Info: ${result.rich_snippet.top.detected_extensions}\n`;
            }
            if (result.sitelinks?.inline) {
              searchSnippets += `Related Links: ${result.sitelinks.inline.map((s: any) => s.title).join(', ')}\n`;
            }
          }
        }
        searchSnippets += `\n---\n`;
        
        console.log(`[GOOGLE FALLBACK] Total snippet length: ${searchSnippets.length} chars`);
        
        if (searchSnippets.length > 100) {
          console.log(`[GOOGLE FALLBACK] Found ${searchData.organic_results?.length || 0} Google results. Extracting team members with AI...`);
          
          // Use AI to extract team members from search snippets
          const openai = await import('openai').then(mod => mod.default);
          const client = new openai({
            baseURL: "https://api.x.ai/v1",
            apiKey: process.env.XAI_API_KEY
          });
          
          const extractionPrompt = `Extract team member names from these Google search results for ${domain}.

Google Search Results:
${searchSnippets}

Look for REAL PEOPLE with full names (first and last names). Extract their information:
- name: Full name (e.g., "Harvey Schwartz", "Kewsong Lee")
- title: Job title if mentioned (e.g., "CEO", "Managing Director")
- bioUrl: Profile URL from search result link if available

IMPORTANT:
- Only extract names with BOTH first and last names
- Skip partial names like "Harvey" alone - need full name
- Skip generic terms like "our people", "leadership team"
- Look in snippets and titles for names
- DO NOT invent names

Return JSON object with "members" array:
{
  "members": [
    { "name": "Harvey Schwartz", "title": "CEO", "bioUrl": "https://..." },
    { "name": "John Smith", "title": "CFO" }
  ]
}

If no valid full names found, return: { "members": [] }`;

          console.log(`[GOOGLE FALLBACK] Calling Grok AI for extraction...`);
          const aiResponse = await client.chat.completions.create({
            model: "grok-2-1212",
            messages: [{ role: "user", content: extractionPrompt }],
            temperature: 0.3,
            response_format: { type: "json_object" }
          });
          
          const aiContent = aiResponse.choices[0].message.content?.trim() || '{}';
          console.log(`[GOOGLE FALLBACK] AI response: ${aiContent.substring(0, 500)}...`);
          
          const extracted = JSON.parse(aiContent);
          const membersFromSearch = Array.isArray(extracted.members) ? extracted.members : 
                                    Array.isArray(extracted) ? extracted : [];
          
          console.log(`[GOOGLE FALLBACK] Extracted ${membersFromSearch.length} members from snippets`);
          
          // ENHANCED: Try to scrape the actual team pages Google found
          if (searchData.organic_results && searchData.organic_results.length > 0) {
            console.log(`[GOOGLE FALLBACK] Attempting to scrape top discovered pages...`);
            
            // Filter for most promising team pages
            const teamPages = searchData.organic_results
              .filter((r: any) => r.link && (
                r.link.includes('/team') || 
                r.link.includes('/people') || 
                r.link.includes('/leadership') ||
                r.link.includes('/our-people') ||
                r.link.includes('/management') ||
                r.link.includes('/executives')
              ))
              .slice(0, 3); // Try top 3 team pages
            
            console.log(`[GOOGLE FALLBACK] Found ${teamPages.length} promising team page URLs`);
            
            for (const page of teamPages) {
              try {
                console.log(`[GOOGLE FALLBACK] Scraping: ${page.link}`);
                const pageHtml = await fetchWebContent(page.link);
                
                if (pageHtml && pageHtml.length > 1000) {
                  const pageMembers = await aiExtractTeamMembers(pageHtml, page.link);
                  if (pageMembers.length > 0) {
                    console.log(`[GOOGLE FALLBACK] ✓ Extracted ${pageMembers.length} members from ${page.link}`);
                    // Merge with snippet results, deduplicate by name
                    for (const member of pageMembers) {
                      const exists = membersFromSearch.some((m: any) => 
                        m.name.toLowerCase().trim() === member.name.toLowerCase().trim()
                      );
                      if (!exists) {
                        membersFromSearch.push(member);
                      }
                    }
                  }
                }
              } catch (pageError) {
                console.log(`[GOOGLE FALLBACK] Failed to scrape ${page.link}:`, pageError);
              }
            }
            
            console.log(`[GOOGLE FALLBACK] Total after page scraping: ${membersFromSearch.length} members`);
          }
          
          if (membersFromSearch.length > 0) {
            console.log(`✅ [GOOGLE FALLBACK] Google Search fallback found ${membersFromSearch.length} team members:`, membersFromSearch.map((m: any) => m.name).join(', '));
            return membersFromSearch;
          } else {
            console.log(`⚠️ [GOOGLE FALLBACK] AI extraction returned 0 members`);
          }
        } else {
          console.log(`⚠️ [GOOGLE FALLBACK] Not enough snippet data (${searchSnippets.length} chars < 100)`);
        }
      } catch (searchError) {
        console.error(`[GOOGLE FALLBACK] Error:`, searchError);
      }
    } else {
      console.log(`[GOOGLE FALLBACK] Skipped: teamMembers.length=${teamMembers.length}, has_SERPAPI=${!!process.env.SERPAPI_API_KEY}`);
    }
    
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
 * LAYER 1: AI Deep Comprehension
 * Analyzes all source materials to build deep understanding of candidate's career
 */
async function comprehendCareerStory(
  firstName: string,
  lastName: string,
  linkedinData: any,
  bioContent?: string
): Promise<{
  careerNarrative: string;
  keyInsights: string[];
  careerProgression: string;
}> {
  console.log(`[Layer 1: Comprehension] Deep analysis of ${firstName} ${lastName}'s career...`);
  
  // Build comprehensive source material
  let sourceMaterial = `LINKEDIN PROFILE DATA:\n\n`;
  
  if (linkedinData.about) {
    sourceMaterial += `About Section:\n${linkedinData.about}\n\n`;
  }
  
  if (linkedinData.position && linkedinData.current_company) {
    sourceMaterial += `Current Role: ${linkedinData.position} at ${linkedinData.current_company}\n\n`;
  }
  
  if (linkedinData.experience?.length > 0) {
    sourceMaterial += `Experience History:\n`;
    linkedinData.experience.forEach((exp: any) => {
      sourceMaterial += `- ${exp.title} at ${exp.company}`;
      if (exp.start_date || exp.end_date) {
        sourceMaterial += ` (${exp.start_date || '?'} - ${exp.end_date || 'Present'})`;
      }
      if (exp.description) {
        sourceMaterial += `\n  Description: ${exp.description}`;
      }
      sourceMaterial += '\n';
    });
    sourceMaterial += '\n';
  }
  
  if (linkedinData.education?.length > 0) {
    sourceMaterial += `Education:\n`;
    linkedinData.education.forEach((edu: any) => {
      sourceMaterial += `- ${edu.degree || 'Degree'} ${edu.field_of_study ? `in ${edu.field_of_study}` : ''} from ${edu.school}\n`;
    });
    sourceMaterial += '\n';
  }
  
  if (bioContent) {
    sourceMaterial += `\nBIO URL CONTENT:\n${bioContent}\n\n`;
  }
  
  // AI comprehension - understand the career story deeply
  const response = await openai.chat.completions.create({
    model: "grok-2-1212",
    messages: [
      {
        role: "system",
        content: `You are a senior executive recruiter with 20 years of experience analyzing career trajectories. Your task is to COMPREHEND and UNDERSTAND a professional's career story - not just summarize it. Analyze patterns, progression, achievements, and strategic career moves.`
      },
      {
        role: "user",
        content: `Deeply analyze ${firstName} ${lastName}'s career based on the source materials below. Focus on UNDERSTANDING, not just listing facts.

Your analysis should reveal:
1. Career narrative and strategic progression
2. Key career patterns (e.g., moved from Blackstone to PAG - a common path in PE)
3. Areas of expertise and specialization evolution
4. Impact and achievements context
5. Educational foundation and how it shaped career

Return your analysis as JSON:
{
  "careerNarrative": "A comprehensive understanding of their career story and progression",
  "keyInsights": ["Insight 1", "Insight 2", "Insight 3"],
  "careerProgression": "Clear description of how their career evolved strategically"
}

Source Materials:
${sourceMaterial}

Return ONLY the JSON object, no markdown.`
      }
    ],
    temperature: 0.4,
    max_tokens: 2000
  });
  
  let aiResponse = response.choices[0]?.message?.content?.trim() || '{}';
  
  // Strip markdown code blocks if present (```json ... ``` or ``` ... ```)
  aiResponse = stripMarkdownJson(aiResponse);
  
  const comprehension = JSON.parse(aiResponse);
  
  console.log(`[Layer 1: Comprehension] ✓ Deep understanding established`);
  console.log(`[Layer 1: Comprehension] Career Narrative: ${comprehension.careerNarrative?.substring(0, 150)}...`);
  
  return {
    careerNarrative: comprehension.careerNarrative || '',
    keyInsights: comprehension.keyInsights || [],
    careerProgression: comprehension.careerProgression || ''
  };
}

/**
 * LAYER 2: AI Intelligent Synthesis
 * Uses comprehension to WRITE (not copy) a professional biography
 */
async function synthesizeBiography(
  firstName: string,
  lastName: string,
  comprehension: {
    careerNarrative: string;
    keyInsights: string[];
    careerProgression: string;
  },
  linkedinData: any
): Promise<string> {
  console.log(`[Layer 2: Synthesis] Writing biography from deep understanding...`);
  
  const response = await openai.chat.completions.create({
    model: "grok-2-1212",
    messages: [
      {
        role: "system",
        content: `You are an expert executive recruiter writing professional biographies. You have deep understanding of this person's career - now WRITE a compelling biography that tells their story. Do not copy data - synthesize and create a narrative. Write in third person.`
      },
      {
        role: "user",
        content: `Based on your deep comprehension of ${firstName} ${lastName}'s career, write a comprehensive professional biography.

Your Understanding:
- Career Narrative: ${comprehension.careerNarrative}
- Career Progression: ${comprehension.careerProgression}
- Key Insights: ${comprehension.keyInsights.join('; ')}

Reference Data:
- Current: ${linkedinData.position || ''} at ${linkedinData.current_company || ''}
- Education: ${linkedinData.education?.map((e: any) => `${e.degree || ''} from ${e.school || ''}`).join(', ') || 'N/A'}

Structure your biography in THREE sections:

**EXECUTIVE SUMMARY**
Write 2-3 compelling sentences about their current role, expertise, and value proposition. Make it engaging and specific.

**CAREER HISTORY**
Tell the story of their career progression. For each major role, explain:
- What they did and achieved (not just title)
- How it contributed to their expertise
- Why this move made strategic sense
Write in narrative form, not bullet points.

**EDUCATION BACKGROUND**
Describe their academic foundation and how it shaped their career path.

Write a polished, narrative-driven biography that tells a story - not a data dump.`
      }
    ],
    temperature: 0.7,
    max_tokens: 2000
  });
  
  const biography = response.choices[0]?.message?.content?.trim() || '';
  
  console.log(`[Layer 2: Synthesis] ✓ Biography written (${biography.length} chars)`);
  
  return biography;
}

/**
 * Generate a comprehensive professional biography using multi-layer AI pipeline
 * LAYER 1: Comprehension → LAYER 2: Synthesis → LAYER 3: Mapping
 */
export async function generateBiographyFromLinkedInData(
  firstName: string,
  lastName: string,
  linkedinData: any,
  bioContent?: string
): Promise<{
  biography: string;
  comprehension: {
    careerNarrative: string;
    keyInsights: string[];
    careerProgression: string;
  };
}> {
  console.log(`[Biography Gen] Starting 3-layer AI pipeline for ${firstName} ${lastName}`);
  
  try {
    // LAYER 1: Deep Comprehension
    const comprehension = await comprehendCareerStory(firstName, lastName, linkedinData, bioContent);
    
    // LAYER 2: Intelligent Synthesis
    const biography = await synthesizeBiography(firstName, lastName, comprehension, linkedinData);
    
    if (!biography || !biography.trim()) {
      throw new Error('AI failed to generate biography');
    }
    
    console.log(`[Biography Gen] ✓ Multi-layer pipeline complete`);
    return { biography, comprehension };
    
  } catch (error) {
    console.error(`[Biography Gen] Error in multi-layer pipeline:`, error);
    throw error;
  }
}

/**
 * Complete 3-layer AI pipeline: Comprehension → Synthesis → Mapping
 * Returns both biography and structured career history
 */
export async function generateBiographyAndCareerHistory(
  firstName: string,
  lastName: string,
  linkedinData: any,
  bioContent?: string
): Promise<{
  biography: string;
  careerHistory: Array<{
    company: string;
    companyId?: number | null;
    title: string;
    startDate: string;
    endDate?: string | null;
    description?: string;
    location?: string;
  }>;
}> {
  console.log(`\n🎯 [3-Layer Pipeline] Starting for ${firstName} ${lastName}\n`);
  
  try {
    // LAYER 1: Deep Comprehension
    const comprehension = await comprehendCareerStory(firstName, lastName, linkedinData, bioContent);
    
    // LAYER 2: Intelligent Synthesis
    const biography = await synthesizeBiography(firstName, lastName, comprehension, linkedinData);
    
    // LAYER 3: Intelligent Career Mapping
    const careerHistory = await intelligentlyMapCareerHistory(
      firstName,
      lastName,
      comprehension,
      biography,
      linkedinData
    );
    
    console.log(`\n✅ [3-Layer Pipeline] Complete! Biography: ${biography.length} chars, Career: ${careerHistory.length} positions\n`);
    
    return { biography, careerHistory };
    
  } catch (error) {
    console.error(`[3-Layer Pipeline] Error:`, error);
    throw error;
  }
}

/**
 * LAYER 3: AI Intelligent Career Mapping
 * Maps career history with deep understanding and context
 */
async function intelligentlyMapCareerHistory(
  firstName: string,
  lastName: string,
  comprehension: {
    careerNarrative: string;
    keyInsights: string[];
    careerProgression: string;
  },
  biography: string,
  linkedinData: any
): Promise<Array<{
  company: string;
  companyId?: number | null;
  title: string;
  startDate: string;
  endDate?: string | null;
  description?: string;
  location?: string;
}>> {
  console.log(`[Layer 3: Mapping] Intelligently mapping career history...`);
  
  try {
    const response = await openai.chat.completions.create({
      model: "grok-2-1212",
      messages: [
        {
          role: "system",
          content: `You are an expert at mapping career histories with deep understanding. Don't just extract data - intelligently structure career progression based on your comprehension of the person's journey.`
        },
        {
          role: "user",
          content: `Based on your deep understanding of ${firstName} ${lastName}'s career, map their complete career history.

Your Understanding:
${comprehension.careerNarrative}

Career Progression Pattern:
${comprehension.careerProgression}

Biography (for context):
${biography}

Raw LinkedIn Data (for dates/details):
${JSON.stringify(linkedinData.experience || [], null, 2)}

Map their career history intelligently. Return a JSON array with ALL positions:

[
  {
    "company": "Full company name",
    "title": "Complete job title",
    "startDate": "YYYY-MM or YYYY",
    "endDate": "YYYY-MM or YYYY" or null if current,
    "description": "1-2 sentence summary of achievements and impact in this role",
    "location": "City, Country if available"
  }
]

Rules:
1. Include ALL positions from most recent to earliest
2. Use your understanding to fill in missing context
3. If raw data has asterisks or is censored, extract from biography
4. Add meaningful descriptions that show progression and impact
5. Return ONLY valid JSON array, no markdown

JSON array:`
        }
      ],
      temperature: 0.3,
      max_tokens: 3000
    });
    
    let aiResponse = response.choices[0]?.message?.content?.trim() || '[]';
    aiResponse = stripMarkdownJson(aiResponse);
    const careerHistory = JSON.parse(aiResponse);
    
    if (!Array.isArray(careerHistory)) {
      return [];
    }
    
    console.log(`[Layer 3: Mapping] ✓ Mapped ${careerHistory.length} career positions`);
    
    return careerHistory.map((entry: any) => ({
      company: entry.company || 'Unknown Company',
      companyId: null,
      title: entry.title || 'Unknown Title',
      startDate: entry.startDate || '',
      endDate: entry.endDate || null,
      description: entry.description || '',
      location: entry.location || ''
    }));
    
  } catch (error) {
    console.error(`[Layer 3: Mapping] Error:`, error);
    return [];
  }
}

/**
 * Extract structured career history from biography text
 * Fallback when structured data is censored
 */
export async function extractCareerHistoryFromBiography(biography: string): Promise<Array<{
  company: string;
  companyId?: number | null;
  title: string;
  startDate: string;
  endDate?: string | null;
  description?: string;
  location?: string;
}>> {
  console.log(`[Career History Bio] Extracting career history from biography text...`);
  
  try {
    const response = await openai.chat.completions.create({
      model: "grok-2-1212",
      messages: [
        {
          role: "system",
          content: `You are an expert at extracting structured career data from professional biographies. Extract all career positions mentioned in chronological order.`
        },
        {
          role: "user",
          content: `Extract all career history from this biography. Return ONLY a valid JSON array:

[
  {
    "company": "Company Name",
    "title": "Job Title",
    "startDate": "YYYY-MM or YYYY",
    "endDate": "YYYY-MM or YYYY" or null if current
  }
]

Rules:
1. Extract ALL positions mentioned (current and previous)
2. If dates aren't explicit, infer from context (e.g., "currently serves" = endDate: null)
3. Return ONLY the JSON array, no markdown, no explanations
4. If no career data found, return []

Biography:
${biography}

JSON array:`
        }
      ],
      temperature: 0.3,
      max_tokens: 2000
    });
    
    let aiResponse = response.choices[0]?.message?.content?.trim() || '[]';
    console.log(`[Career History Bio] AI response:`, aiResponse.substring(0, 200));
    
    aiResponse = stripMarkdownJson(aiResponse);
    const careerHistory = JSON.parse(aiResponse);
    
    if (!Array.isArray(careerHistory)) {
      return [];
    }
    
    console.log(`[Career History Bio] ✓ Extracted ${careerHistory.length} entries from biography`);
    
    return careerHistory.map((entry: any) => ({
      company: entry.company || 'Unknown Company',
      companyId: null,
      title: entry.title || 'Unknown Title',
      startDate: entry.startDate || '',
      endDate: entry.endDate || null,
      description: entry.description || '',
      location: entry.location || ''
    }));
    
  } catch (error) {
    console.error(`[Career History Bio] Error:`, error);
    return [];
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
    
    let aiResponse = response.choices[0]?.message?.content?.trim() || '[]';
    console.log(`[Career History HTML] AI response:`, aiResponse.substring(0, 200));
    
    // Strip markdown and parse the AI response as JSON
    aiResponse = stripMarkdownJson(aiResponse);
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

/**
 * Helper function to parse AI JSON responses that might be wrapped in markdown code blocks
 */
function parseAIJson(text: string): any {
  let cleaned = text.trim();
  // Remove markdown code block wrapper if present (e.g., ```json ... ```)
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  return JSON.parse(cleaned);
}

/**
 * AI Research Engine: Intelligent company discovery using natural language queries
 * 
 * Examples:
 * - "Find top 100 private equity firms globally"
 * - "List major venture capital funds in US healthcare"
 * - "Top 50 investment banks in Asia"
 * 
 * Process:
 * 1. AI generates multiple targeted search queries
 * 2. Execute SERP API searches for each query
 * 3. Parse and deduplicate company names
 * 4. Auto-enrich with company data (LinkedIn, size, geography)
 * 5. Return validated list with confidence scores
 */
export async function researchCompanies(params: {
  naturalLanguageQuery: string;
  maxResults?: number;
}): Promise<{
  companies: Array<{
    companyName: string;
    website: string | null;
    linkedinUrl: string | null;
    description: string | null;
    confidence: number;
    sources: string[];
  }>;
  searchQueries: string[];
  metadata: {
    totalResults: number;
    queryExecutionTime: number;
    aiGenerationTime: number;
  };
}> {
  const startTime = Date.now();
  console.log(`\n🔍 [AI Research] Starting company research: "${params.naturalLanguageQuery}"`);
  
  // STEP 1: Use AI to generate multiple targeted search queries
  const aiStartTime = Date.now();
  const queryPrompt = `You are an expert research assistant. Given a natural language query about finding companies, generate 3-5 highly targeted Google search queries that will find the most relevant and authoritative results from BUSINESS PUBLICATIONS and INDUSTRY SOURCES.

User Query: "${params.naturalLanguageQuery}"

Requirements:
- Target authoritative BUSINESS SOURCES ONLY: Forbes, Bloomberg, Financial Times, Reuters, PitchBook, Preqin, industry reports, business directories
- DO NOT use LinkedIn, Twitter, or social media as sources
- Use precise terminology and operators for better results
- Focus on finding official company lists, rankings, league tables, and industry reports
- Vary search angle: rankings, market reports, competitor analysis, industry directories
- Each query should target different authoritative publications

Return ONLY a JSON array of search query strings. Example:
["top 100 private equity firms forbes 2024", "private equity asia rankings financial times", "china PE firms market report bloomberg"]

Your response (JSON array only):`;

  try {
    const queryGenResponse = await openai.chat.completions.create({
      model: "grok-2-1212",
      messages: [{ role: "user", content: queryPrompt }],
      temperature: 0.7,
      max_tokens: 500
    });

    const queriesText = queryGenResponse.choices[0]?.message?.content?.trim() || '[]';
    const searchQueries: string[] = parseAIJson(queriesText);
    const aiGenerationTime = Date.now() - aiStartTime;
    
    console.log(`✓ AI generated ${searchQueries.length} search queries in ${aiGenerationTime}ms`);
    searchQueries.forEach((q, i) => console.log(`  ${i + 1}. "${q}"`));

    if (!process.env.SERPAPI_API_KEY) {
      throw new Error('SERPAPI_API_KEY not configured');
    }

    // STEP 2: Execute SERP API searches for each query
    const searchStartTime = Date.now();
    const allResults: Array<{ title: string; link: string; snippet: string; source: string }> = [];
    
    for (const query of searchQueries.slice(0, 3)) { // Limit to 3 queries to control costs
      console.log(`🌐 Executing SERP search: "${query}"`);
      
      try {
        const serpUrl = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${process.env.SERPAPI_API_KEY}&num=20`;
        const response = await fetch(serpUrl);
        const data = await response.json();
        
        if (data.organic_results) {
          for (const result of data.organic_results) {
            allResults.push({
              title: result.title || '',
              link: result.link || '',
              snippet: result.snippet || '',
              source: query
            });
          }
          console.log(`  ✓ Found ${data.organic_results.length} results`);
        }
      } catch (error) {
        console.error(`  ✗ SERP search failed for query "${query}":`, error);
      }
    }
    
    const searchExecutionTime = Date.now() - searchStartTime;
    console.log(`✓ SERP searches complete: ${allResults.length} total results in ${searchExecutionTime}ms`);

    // STEP 3: Use AI to extract and validate company names from search results
    const extractionPrompt = `You are an expert at extracting company names from search results. Analyze the following search results and extract a list of companies.

Original Query: "${params.naturalLanguageQuery}"

Search Results:
${allResults.slice(0, 50).map((r, i) => `${i + 1}. ${r.title}\n   ${r.snippet}\n   URL: ${r.link}`).join('\n\n')}

Instructions:
1. Extract ONLY real company names (not categories, rankings, or descriptive text)
2. For each company, try to infer:
   - Official company name
   - Website URL (if visible in results)
   - Brief description (from snippet context)
   - Confidence score (0.0-1.0) based on how clearly it matches the query
3. Remove duplicates (same company mentioned multiple times)
4. Prioritize companies that clearly match the original query intent
5. Limit to top ${params.maxResults || 50} most relevant companies

Return ONLY valid JSON in this exact format:
{
  "companies": [
    {
      "companyName": "Example Company",
      "website": "https://example.com",
      "description": "Brief description from search context",
      "confidence": 0.95,
      "sourceResults": ["Result 1", "Result 3"]
    }
  ]
}`;

    console.log(`🤖 AI extracting companies from ${allResults.length} search results...`);
    
    const extractionResponse = await openai.chat.completions.create({
      model: "grok-2-1212",
      messages: [{ role: "user", content: extractionPrompt }],
      temperature: 0.3,
      max_tokens: 8000
    });

    const extractedText = extractionResponse.choices[0]?.message?.content?.trim() || '{}';
    const extracted = parseAIJson(extractedText);
    
    console.log(`✓ AI extracted ${extracted.companies?.length || 0} companies`);

    // STEP 4: Auto-enrich with LinkedIn discovery (lightweight)
    const enrichedCompanies = [];
    for (const company of (extracted.companies || [])) {
      // Try to find LinkedIn company page (lightweight search)
      let linkedinUrl = null;
      if (company.companyName) {
        try {
          const linkedinQuery = `${company.companyName} site:linkedin.com/company`;
          const serpUrl = `https://serpapi.com/search.json?q=${encodeURIComponent(linkedinQuery)}&api_key=${process.env.SERPAPI_API_KEY}&num=3`;
          const response = await fetch(serpUrl);
          const data = await response.json();
          
          if (data.organic_results && data.organic_results.length > 0) {
            const firstResult = data.organic_results[0];
            if (firstResult.link && firstResult.link.includes('linkedin.com/company')) {
              linkedinUrl = firstResult.link;
            }
          }
        } catch (err) {
          // LinkedIn discovery failed, continue without it
        }
      }

      enrichedCompanies.push({
        companyName: company.companyName,
        website: company.website || null,
        linkedinUrl,
        description: company.description || null,
        confidence: company.confidence || 0.7,
        sources: company.sourceResults || []
      });
    }

    // Strictly enforce maxResults limit
    const maxCompanies = params.maxResults || 50;
    const limitedCompanies = enrichedCompanies.slice(0, maxCompanies);
    
    const totalTime = Date.now() - startTime;
    console.log(`✅ [AI Research] Complete: ${limitedCompanies.length} companies found (limit: ${maxCompanies}) in ${totalTime}ms`);

    return {
      companies: limitedCompanies,
      searchQueries,
      metadata: {
        totalResults: allResults.length,
        queryExecutionTime: totalTime,
        aiGenerationTime
      }
    };

  } catch (error) {
    console.error(`❌ [AI Research] Error:`, error);
    throw error;
  }
}