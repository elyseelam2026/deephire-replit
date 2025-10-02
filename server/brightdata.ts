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

    const prompt = `You are a professional biography writer for executive recruitment. Based on the LinkedIn profile data provided, write a comprehensive 2-3 paragraph professional biography.

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

**Instructions:**
- Write a professional, third-person biography suitable for executive profiles
- Focus on career progression, key achievements, and areas of expertise
- Highlight leadership roles, significant projects, and industry impact
- Keep it concise but comprehensive (2-3 paragraphs)
- Use professional language appropriate for B2B recruiting
- DO NOT fabricate information - only use data provided above
- If certain details are missing, work with what's available

Return ONLY the biography text, no additional formatting or metadata.`;

    const response = await client.chat.completions.create({
      model: "grok-2-1212",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
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
