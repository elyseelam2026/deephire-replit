const BRIGHTDATA_API_KEY = process.env.BRIGHTDATA_API_KEY;
const BRIGHTDATA_BASE_URL = 'https://api.brightdata.com/datasets/v3';

export interface LinkedInProfileData {
  linkedin_id?: string;
  name?: string;
  country_code?: string;
  city?: string;
  position?: string;
  current_company?: string;
  current_company_name?: string;
  about?: string;
  experience?: Array<{
    title?: string;
    company?: string;
    location?: string;
    start_date?: string;
    end_date?: string;
    description?: string;
  }>;
  education?: Array<{
    school?: string;
    degree?: string;
    field_of_study?: string;
    start_date?: string;
    end_date?: string;
  }>;
  certifications?: Array<{
    name?: string;
    issuing_organization?: string;
    issue_date?: string;
  }>;
  skills?: string[];
  languages?: string[];
  recommendations_count?: number;
  volunteer_experience?: Array<any>;
  publications?: Array<any>;
  url?: string;
  avatar?: string;
  followers?: number;
  connections?: number;
}

export async function scrapeLinkedInProfile(linkedinUrl: string): Promise<LinkedInProfileData> {
  if (!BRIGHTDATA_API_KEY) {
    throw new Error('BRIGHTDATA_API_KEY is not configured');
  }

  if (!linkedinUrl || !linkedinUrl.includes('linkedin.com')) {
    throw new Error('Invalid LinkedIn URL provided');
  }

  const datasetId = 'gd_l1viktl72bvl7bjuj0';
  const endpoint = `${BRIGHTDATA_BASE_URL}/trigger`;
  
  const requestBody = [{
    url: linkedinUrl
  }];

  console.log(`[Bright Data] Scraping LinkedIn profile: ${linkedinUrl}`);

  try {
    const response = await fetch(`${endpoint}?dataset_id=${datasetId}&format=json`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BRIGHTDATA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Bright Data] API Error (${response.status}):`, errorText);
      throw new Error(`Bright Data API request failed: ${response.status} ${errorText}`);
    }

    const result: any = await response.json();
    console.log(`[Bright Data] Snapshot ID:`, result.snapshot_id);

    const snapshotId = result.snapshot_id;
    
    const profileData = await pollForProfileData(snapshotId);
    
    console.log(`[Bright Data] Successfully scraped profile for: ${profileData.name || 'Unknown'}`);
    
    return profileData;

  } catch (error) {
    console.error('[Bright Data] Scraping failed:', error);
    throw error;
  }
}

async function pollForProfileData(snapshotId: string, maxAttempts: number = 60, delayMs: number = 3000): Promise<LinkedInProfileData> {
  const endpoint = `${BRIGHTDATA_BASE_URL}/snapshot/${snapshotId}`;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`[Bright Data] Polling attempt ${attempt}/${maxAttempts} for snapshot ${snapshotId}`);
    
    try {
      const response = await fetch(`${endpoint}?format=json`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${BRIGHTDATA_API_KEY}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Bright Data] Poll Error (${response.status}):`, errorText);
        
        // Fail immediately for account/auth issues (don't waste 3 minutes polling)
        if (response.status === 422) {
          if (errorText.toLowerCase().includes('suspended')) {
            throw new Error('Bright Data account is suspended. Please check your subscription and billing in the Bright Data dashboard.');
          } else {
            throw new Error(`Bright Data validation error: ${errorText}`);
          }
        } else if (response.status === 401 || response.status === 403) {
          throw new Error('Bright Data authentication failed. Please check your BRIGHTDATA_API_KEY environment variable.');
        }
        
        if (attempt === maxAttempts) {
          throw new Error(`Failed to poll snapshot after ${maxAttempts} attempts: ${response.status}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }

      const data: any = await response.json();
      
      console.log(`[Bright Data] Response:`, JSON.stringify(data).substring(0, 200));
      
      // IMPORTANT: Bright Data response format varies:
      // Format 1: { status: 'ready', data: [...] }  <- wrapped format
      // Format 2: [...] <- direct array format (THIS IS WHAT WE'RE GETTING)
      
      // Check if response is a direct array (Format 2)
      if (Array.isArray(data) && data.length > 0) {
        // Validate the data has actual LinkedIn profile content
        const profileData = data[0];
        if (profileData.id || profileData.name || profileData.experience) {
          console.log(`[Bright Data] Profile data ready! Found ${data.length} results (direct array format)`);
          
          // DEBUG: Log ALL field names in the raw data
          console.log(`[Bright Data] RAW DATA STRUCTURE - All fields present:`);
          console.log(JSON.stringify(Object.keys(profileData), null, 2));
          console.log(`[Bright Data] CRITICAL FIELDS DETAILED:`);
          console.log(`  - experience type: ${typeof profileData.experience}, isArray: ${Array.isArray(profileData.experience)}, value:`, JSON.stringify(profileData.experience).substring(0, 300));
          console.log(`  - education type: ${typeof profileData.education}, isArray: ${Array.isArray(profileData.education)}, value:`, JSON.stringify(profileData.education).substring(0, 300));
          console.log(`  - current_company type: ${typeof profileData.current_company}, value:`, JSON.stringify(profileData.current_company).substring(0, 200));
          
          return profileData as LinkedInProfileData;
        } else {
          console.log(`[Bright Data] Response is array but lacks profile data, waiting... (attempt ${attempt}/${maxAttempts})`);
        }
      }
      // Check if response has status field (Format 1)
      else if (data.status === 'ready') {
        if (data.data && Array.isArray(data.data) && data.data.length > 0) {
          console.log(`[Bright Data] Profile data ready! Found ${data.data.length} results (wrapped format)`);
          return data.data[0] as LinkedInProfileData;
        } else {
          console.error(`[Bright Data] Status is 'ready' but no data found:`, data);
          throw new Error('Bright Data returned ready status but no profile data');
        }
      } else if (data.status === 'failed' || data.status === 'error') {
        console.error(`[Bright Data] Job failed with status: ${data.status}`, data);
        throw new Error(`Bright Data scraping job failed with status: ${data.status}`);
      } else if (data.status === 'running' || data.status === 'pending' || !data.status) {
        console.log(`[Bright Data] Status: ${data.status || 'unknown'}, waiting... (attempt ${attempt}/${maxAttempts})`);
      } else {
        console.warn(`[Bright Data] Unexpected status: ${data.status}, continuing to poll...`);
      }
      
    } catch (error) {
      console.error(`[Bright Data] Poll attempt ${attempt} error:`, error);
      if (attempt === maxAttempts) {
        throw error;
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  
  throw new Error(`Bright Data scraping timed out after ${maxAttempts} polling attempts (${Math.round(maxAttempts * delayMs / 1000)}s)`);
}

export async function generateBiographyFromLinkedInData(profileData: LinkedInProfileData): Promise<string> {
  try {
    // DEBUG: Log the raw profile data received from Bright Data
    console.log(`\n========================================`);
    console.log(`[Biography Generator] RAW PROFILE DATA RECEIVED:`);
    console.log(`========================================`);
    console.log(`Name: ${profileData.name || 'NOT PROVIDED'}`);
    console.log(`Position: ${profileData.position || 'NOT PROVIDED'}`);
    console.log(`Current Company: ${profileData.current_company_name || profileData.current_company || 'NOT PROVIDED'}`);
    console.log(`About: ${profileData.about ? profileData.about.substring(0, 100) + '...' : 'NOT PROVIDED'}`);
    console.log(`\nExperience Records: ${profileData.experience?.length || 0}`);
    if (profileData.experience && profileData.experience.length > 0) {
      profileData.experience.forEach((exp, idx) => {
        console.log(`  ${idx + 1}. ${exp.title || 'NO TITLE'} at ${exp.company || 'NO COMPANY'} (${exp.start_date || '?'} - ${exp.end_date || 'Present'})`);
      });
    }
    console.log(`\nEducation Records: ${profileData.education?.length || 0}`);
    if (profileData.education && profileData.education.length > 0) {
      profileData.education.forEach((edu, idx) => {
        console.log(`  ${idx + 1}. ${edu.degree || 'NO DEGREE'} from ${edu.school || 'NO SCHOOL'}`);
      });
    }
    console.log(`\nCertifications: ${profileData.certifications?.length || 0}`);
    console.log(`Languages: ${profileData.languages?.length || 0}`);
    console.log(`========================================\n`);
    
    const openai = await import('openai').then(mod => mod.default);
    
    if (!process.env.XAI_API_KEY) {
      throw new Error('XAI_API_KEY is not configured');
    }

    const client = new openai({
      baseURL: "https://api.x.ai/v1",
      apiKey: process.env.XAI_API_KEY
    });

    const experienceSummary = profileData.experience?.map((exp, idx) => {
      const period = exp.start_date && exp.end_date 
        ? `${exp.start_date} - ${exp.end_date}` 
        : exp.start_date 
          ? `${exp.start_date} - Present`
          : '';
      return `${idx + 1}. ${exp.title || 'Position'} at ${exp.company || 'Company'}${period ? ` (${period})` : ''}${exp.description ? `\n   ${exp.description}` : ''}`;
    }).join('\n') || 'No experience data available';

    const educationSummary = profileData.education?.map((edu, idx) => {
      return `${idx + 1}. ${edu.degree || 'Degree'} in ${edu.field_of_study || 'Field'} from ${edu.school || 'School'}`;
    }).join('\n') || 'No education data available';

    const certificationsSummary = profileData.certifications?.map((cert, idx) => {
      return `${idx + 1}. ${cert.name || 'Certification'} from ${cert.issuing_organization || 'Organization'}`;
    }).join('\n') || 'No certifications available';

    const prompt = `You are a professional biography writer for executive recruitment. Based on the LinkedIn profile data provided, write a comprehensive professional biography with three clear sections.

**Profile Information:**
Name: ${profileData.name || 'Unknown'}
Current Position: ${profileData.position || 'Not specified'}
Current Company: ${profileData.current_company_name || profileData.current_company || 'Not specified'}
Location: ${profileData.city ? `${profileData.city}, ${profileData.country_code || ''}` : 'Not specified'}
About: ${profileData.about || 'No summary provided'}

**Professional Experience:**
${experienceSummary}

**Education:**
${educationSummary}

**Certifications:**
${certificationsSummary}

**Languages:** ${profileData.languages?.join(', ') || 'Not specified'}
**Recommendations:** ${profileData.recommendations_count || 0}

**REQUIRED BIOGRAPHY STRUCTURE:**

Write the biography in exactly this format:

**Executive Summary**
[Write 2-3 sentences summarizing their current role, core expertise, and key professional strengths. Focus on their primary areas of specialization and what makes them valuable as an executive.]

**Career History**
[Write a detailed chronological account of their professional journey, starting from their MOST RECENT position and working backwards to their FIRST position. For each role, describe:
- The company and their title
- Key responsibilities and achievements
- Duration of the role (if available)
- Notable projects or impact
Structure this as flowing prose, not bullet points. Make sure to go from newest to oldest positions.]

**Education Background**
[List their educational credentials in detail, including:
- Degrees earned and field of study
- Universities/institutions attended
- Any notable certifications or professional qualifications
- Relevant academic achievements or honors if mentioned]

**CRITICAL INSTRUCTIONS:**
- Write in professional, third-person voice
- Use complete sentences and flowing prose (not bullet points)
- Present career history in REVERSE chronological order (most recent first, earliest last)
- DO NOT fabricate any information - only use data provided above
- If certain details are missing from a section, work with what's available but maintain the three-section structure
- Use professional language appropriate for B2B executive recruiting
- Keep each section substantive and detailed
- Include section headers exactly as shown above

Return ONLY the biography text with the three sections. Do not add any preamble or metadata.`;

    const response = await client.chat.completions.create({
      model: "grok-2-1212",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2500
    });

    const biography = response.choices[0].message.content?.trim() || '';
    
    if (!biography) {
      throw new Error('Failed to generate biography - empty response from AI');
    }

    console.log(`[Biography Generator] Successfully generated ${biography.length} character biography`);
    return biography;

  } catch (error) {
    console.error('[Biography Generator] Failed to generate biography:', error);
    throw error;
  }
}
