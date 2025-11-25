/**
 * ENHANCED WEB SCRAPER
 * Uses Cheerio + Axios for real website scraping (no Playwright needed)
 * Handles dynamic content, multiple formats, and full HTML parsing
 */

import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';

export interface ScrapedContent {
  url: string;
  title: string;
  description: string;
  content: string;
  links: string[];
  structured: Record<string, any>;
  timestamp: Date;
}

export class WebScraper {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
  }

  /**
   * Scrape any website and extract content
   */
  async scrapeWebsite(url: string): Promise<ScrapedContent> {
    try {
      console.log(`🔍 [Scraper] Fetching: ${url}`);
      const response = await this.axiosInstance.get(url);
      const $ = cheerio.load(response.data);

      // Extract all text content
      const title = $('title').text() || $('h1').first().text() || 'No title';
      const description = $('meta[name="description"]').attr('content') || 
                         $('meta[property="og:description"]').attr('content') || '';

      // Get all visible text
      const content = $('body').text().replace(/\s+/g, ' ').trim();

      // Extract all links
      const links: string[] = [];
      $('a[href]').each((_, elem) => {
        const href = $(elem).attr('href');
        if (href && !href.startsWith('#')) {
          links.push(href);
        }
      });

      // Extract structured data (JSON-LD, microdata)
      const structured: Record<string, any> = {};
      $('script[type="application/ld+json"]').each((_, elem) => {
        try {
          const data = JSON.parse($(elem).html() || '{}');
          structured.jsonLd = data;
        } catch (e) {
          // Skip invalid JSON
        }
      });

      console.log(`✅ [Scraper] Success: ${title.substring(0, 50)}`);

      return {
        url,
        title,
        description,
        content: content.substring(0, 5000), // First 5000 chars
        links: links.slice(0, 50), // First 50 links
        structured,
        timestamp: new Date(),
      };
    } catch (error) {
      const err = error as any;
      console.error(`❌ [Scraper] Failed: ${err.message}`);
      throw new Error(`Failed to scrape ${url}: ${err.message}`);
    }
  }

  /**
   * Scrape LinkedIn profile (if public URL available)
   */
  async scrapeLinkedInProfile(profileUrl: string) {
    try {
      console.log(`🔗 [Scraper] Scraping LinkedIn: ${profileUrl}`);
      const response = await this.axiosInstance.get(profileUrl);
      const $ = cheerio.load(response.data);

      // Extract profile info from page structure
      const profileInfo = {
        headline: $('[data-testid="top-card-headline"]').text() || '',
        title: $('[data-testid="top-card-title"]').text() || '',
        location: $('[data-testid="top-card-location"]').text() || '',
        about: $('[data-testid="about-section"]').text() || '',
      };

      console.log(`✅ [Scraper] LinkedIn scraped: ${profileInfo.headline.substring(0, 40)}`);
      return profileInfo;
    } catch (error) {
      const err = error as any;
      console.error(`❌ [Scraper] LinkedIn scrape failed: ${err.message}`);
      throw error;
    }
  }

  /**
   * Scrape job listing
   */
  async scrapeJobListing(jobUrl: string) {
    try {
      console.log(`💼 [Scraper] Scraping job listing: ${jobUrl}`);
      const response = await this.axiosInstance.get(jobUrl);
      const $ = cheerio.load(response.data);

      const jobData = {
        title: $('h1, .job-title').first().text() || '',
        company: $('[data-testid="company-name"], .company').first().text() || '',
        salary: $('[data-testid="salary"], .salary').text() || '',
        location: $('[data-testid="job-location"], .location').text() || '',
        description: $('[data-testid="job-description"], .description').text().substring(0, 2000) || '',
        requirements: $('ul li').map((_, el) => $(el).text()).get().slice(0, 10),
      };

      console.log(`✅ [Scraper] Job listing scraped: ${jobData.title}`);
      return jobData;
    } catch (error) {
      const err = error as any;
      console.error(`❌ [Scraper] Job scrape failed: ${err.message}`);
      throw error;
    }
  }

  /**
   * Scrape company website
   */
  async scrapeCompanyWebsite(companyUrl: string) {
    try {
      console.log(`🏢 [Scraper] Scraping company site: ${companyUrl}`);
      const response = await this.axiosInstance.get(companyUrl);
      const $ = cheerio.load(response.data);

      const companyData = {
        name: $('meta[property="og:site_name"]').attr('content') || 
              $('h1').first().text() || '',
        description: $('meta[name="description"]').attr('content') || '',
        services: $('h2, h3').map((_, el) => $(el).text()).get().slice(0, 10),
        emails: response.data.match(/[\w\.-]+@[\w\.-]+\.\w+/g) || [],
        phones: response.data.match(/\+?[\d\s\-\(\)]{10,}/g) || [],
        socialLinks: response.data.match(/(linkedin|twitter|facebook|instagram)\.com\/[^\s"<>]+/g) || [],
      };

      console.log(`✅ [Scraper] Company site scraped: ${companyData.name}`);
      return companyData;
    } catch (error) {
      const err = error as any;
      console.error(`❌ [Scraper] Company scrape failed: ${err.message}`);
      throw error;
    }
  }

  /**
   * Batch scrape multiple URLs
   */
  async scrapeMultiple(urls: string[], maxConcurrent: number = 3) {
    const results: ScrapedContent[] = [];
    const errors: { url: string; error: string }[] = [];

    console.log(`📦 [Scraper] Batch scraping ${urls.length} URLs (${maxConcurrent} concurrent)...`);

    // Process in batches
    for (let i = 0; i < urls.length; i += maxConcurrent) {
      const batch = urls.slice(i, i + maxConcurrent);
      const promises = batch.map(url =>
        this.scrapeWebsite(url)
          .then(result => results.push(result))
          .catch(error => errors.push({ url, error: (error as any).message }))
      );

      await Promise.all(promises);
    }

    console.log(`✅ [Scraper] Batch complete: ${results.length} success, ${errors.length} failed`);
    return { results, errors };
  }
}

/**
 * Export singleton instance
 */
export const scraper = new WebScraper();
