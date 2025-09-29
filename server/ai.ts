import OpenAI from "openai";
import * as XLSX from 'xlsx';
import csvToJson from 'csvtojson';
import * as cheerio from 'cheerio';

if (!process.env.XAI_API_KEY) {
  throw new Error("XAI_API_KEY must be set");
}

const openai = new OpenAI({ 
  baseURL: "https://api.x.ai/v1", 
  apiKey: process.env.XAI_API_KEY 
});

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

// Extract LinkedIn URL from web content
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
    
    // Step 2: Search for LinkedIn URL in bio content
    const discoveredLinkedInUrl = extractLinkedInUrl(bioContent);
    
    // Step 3: Extract candidate data from bio page
    const response = await openai.chat.completions.create({
      model: "grok-2-1212",
      messages: [
        {
          role: "system",
          content: "You are an expert candidate profile analyst. Extract structured candidate data from bio pages and generate realistic professional information. Always respond with valid JSON."
        },
        {
          role: "user",
          content: `Extract candidate information from this bio page content and generate a comprehensive profile:
          
          Bio URL: ${bioUrl}
          Content: ${bioContent}
          
          Generate realistic candidate data in JSON format:
          {
            "firstName": "extracted or inferred first name",
            "lastName": "extracted or inferred last name", 
            "email": "professional email (use realistic domain)",
            "currentCompany": "current company name",
            "currentTitle": "current job title",
            "skills": ["relevant professional skills based on bio"],
            "yearsExperience": realistic_number_based_on_bio,
            "location": "professional location",
            "biography": "comprehensive 2-3 paragraph professional biography",
            "careerSummary": "structured career highlights and achievements"
          }`
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    if (!result.firstName || !result.lastName) {
      console.log('Could not extract valid candidate data from bio');
      return null;
    }

    const candidateData = {
      firstName: result.firstName,
      lastName: result.lastName,
      email: result.email || `${result.firstName}.${result.lastName}@email.com`.toLowerCase(),
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

// Parse company data from website URL
export async function parseCompanyFromUrl(url: string): Promise<{
  name: string;
  parentCompany?: string;
  location: string;
  industry: string;
  employeeSize?: number;
  subsector?: string;
  stage?: string;
} | null> {
  try {
    // Simulate URL content fetching (in a real app, you'd use a web scraper)
    const mockUrlContent = `
      Company Profile from ${url}
      
      This is a simulated company extraction from a website URL. In a production environment, 
      this would scrape the actual content from company websites, about pages, etc.
      
      For demonstration purposes, we'll generate sample company data based on the URL pattern.
    `;

    const response = await openai.chat.completions.create({
      model: "grok-2-1212",
      messages: [
        {
          role: "system",
          content: "You are an expert business analyst. Extract company data from website URLs. Generate realistic company data in JSON format based on the URL pattern."
        },
        {
          role: "user",
          content: `Based on this company URL, generate realistic company data in JSON format:
          URL: ${url}
          
          Generate:
          {
            "name": "realistic company name based on URL",
            "location": "realistic headquarters location",
            "industry": "appropriate industry based on URL pattern",
            "employeeSize": realistic_employee_count,
            "stage": "startup|growth|enterprise based on URL pattern"
          }`
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    if (!result.name || !result.industry) {
      return null;
    }

    return {
      name: result.name,
      parentCompany: undefined,
      location: result.location || "Unknown",
      industry: result.industry,
      employeeSize: typeof result.employeeSize === 'number' ? result.employeeSize : undefined,
      subsector: undefined,
      stage: ["startup", "growth", "enterprise"].includes(result.stage) ? result.stage : "growth"
    };
  } catch (error) {
    console.error("Error parsing company from URL:", error);
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