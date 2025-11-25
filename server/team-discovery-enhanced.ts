/**
 * ENHANCED TEAM DISCOVERY WITH BATCH SCRAPING
 * Extracts hundreds of team member profiles by:
 * 1. Finding team page
 * 2. Extracting all profile links from that page
 * 3. Batch scraping all profiles in parallel
 * 4. Aggregating data from all profiles
 */

import { scraper } from './web-scraper';
import * as cheerio from 'cheerio';

export interface TeamMemberEnhanced {
  name: string;
  title?: string;
  bioUrl?: string;
  profileUrl?: string;
  company?: string;
  location?: string;
  bio?: string;
}

/**
 * Extract profile links from a team page HTML
 */
function extractProfileLinks(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const links = new Set<string>();

  // Common profile link patterns
  const selectors = [
    'a[href*="/team/"]',
    'a[href*="/people/"]',
    'a[href*="/leadership/"]',
    'a[href*="/profile/"]',
    'a[href*="/about/team/"]',
    'a[href*="/member/"]',
    'a[href*="/executives/"]',
    '.team-member a',
    '[data-testid*="team"] a',
    '.profile-card a',
  ];

  selectors.forEach(selector => {
    $(selector).each((_, el) => {
      const href = $(el).attr('href');
      if (href && !href.startsWith('#')) {
        try {
          const url = new URL(href, baseUrl);
          links.add(url.toString());
        } catch (e) {
          // Skip invalid URLs
        }
      }
    });
  });

  return Array.from(links);
}

/**
 * Extract team member data from a profile page
 */
function extractTeamMemberFromPage(html: string, url: string): TeamMemberEnhanced | null {
  try {
    const $ = cheerio.load(html);

    // Extract name - try various selectors
    let name = $('[data-testid*="name"]').text().trim() ||
               $('h1').first().text().trim() ||
               $('h2').first().text().trim() ||
               $('.profile-name').text().trim() ||
               '';

    if (!name) return null;

    // Extract title
    const title = $('[data-testid*="title"]').text().trim() ||
                  $('[data-testid*="job"]').text().trim() ||
                  $('.profile-title').text().trim() ||
                  $('h2, h3').first().text().trim() ||
                  '';

    // Extract bio
    const bio = $('[data-testid*="bio"]').text().trim() ||
                $('.profile-bio').text().trim() ||
                $('p').first().text().substring(0, 200).trim() ||
                '';

    // Extract location
    const location = $('[data-testid*="location"]').text().trim() ||
                     $('.profile-location').text().trim() ||
                     '';

    return {
      name,
      title: title || undefined,
      bio: bio || undefined,
      location: location || undefined,
      profileUrl: url,
      bioUrl: url,
    };
  } catch (error) {
    console.log(`Failed to extract member from ${url}:`, (error as any).message);
    return null;
  }
}

/**
 * Enhanced team discovery using batch scraping
 */
export async function discoverTeamMembersEnhanced(
  websiteUrl: string,
  maxProfilesToScrape: number = 50
): Promise<TeamMemberEnhanced[]> {
  try {
    console.log(`\n🚀 [Enhanced Discovery] Starting batch team member discovery from: ${websiteUrl}`);

    const baseUrl = new URL(websiteUrl);
    const teamPageUrl = `${baseUrl.protocol}//${baseUrl.hostname}/team`;

    // Step 1: Scrape the team page
    console.log(`📄 [Enhanced Discovery] Scraping team page: ${teamPageUrl}`);
    const teamPageContent = await scraper.scrapeWebsite(teamPageUrl).catch(() => null);

    if (!teamPageContent) {
      console.log('❌ Could not scrape team page');
      return [];
    }

    // Step 2: Extract all profile links from the team page
    console.log(`🔗 [Enhanced Discovery] Extracting profile links...`);
    const profileLinks = extractProfileLinks(teamPageContent.content, teamPageUrl);
    console.log(`✅ Found ${profileLinks.length} profile links`);

    if (profileLinks.length === 0) {
      console.log('⚠️  No profile links found');
      return [];
    }

    // Step 3: Batch scrape all profile pages (with limit)
    const linksToScrape = profileLinks.slice(0, maxProfilesToScrape);
    console.log(`📦 [Enhanced Discovery] Batch scraping ${linksToScrape.length} profiles...`);

    const { results, errors } = await scraper.scrapeMultiple(linksToScrape, 5); // 5 concurrent

    console.log(`✅ Scraped ${results.length} profiles (${errors.length} errors)`);

    // Step 4: Extract team member data from each profile
    console.log(`👥 [Enhanced Discovery] Extracting team member data...`);
    const teamMembers: TeamMemberEnhanced[] = [];

    for (const result of results) {
      const member = extractTeamMemberFromPage(result.content, result.url);
      if (member) {
        teamMembers.push(member);
      }
    }

    console.log(`✨ [Enhanced Discovery] Extracted ${teamMembers.length} team members`);

    return teamMembers;
  } catch (error) {
    console.error('[Enhanced Discovery] Error:', (error as any).message);
    return [];
  }
}
