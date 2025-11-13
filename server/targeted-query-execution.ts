/**
 * TARGETED QUERY EXECUTION MODULE
 * 
 * Pre-search orchestration layer for competitor-mapped searches.
 * Executes targetedQueries (e.g., "Hillhouse" "CFO" 2025) using SerpAPI,
 * deduplicates URLs, and returns a capped relevance-ranked list.
 * 
 * Architectural Decision (from Architect):
 * - Keep orchestrateProfileFetching focused on URL ingestion
 * - This module handles query → URL expansion
 * - Output: Deduplicated, capped URL list ready for orchestrator
 */

import { searchLinkedInPeople, type LinkedInSearchParams } from './serpapi';

export interface QueryExecutionResult {
  query: string;
  urlsFound: number;
  urls: string[];
  error?: string;
}

export interface ExecutionSummary {
  totalQueries: number;
  successfulQueries: number;
  failedQueries: number;
  totalUrlsFound: number;
  uniqueUrlsAfterDedupe: number;
  executionTimeMs: number;
  queryResults: QueryExecutionResult[];
}

/**
 * Execute targeted search queries in parallel batches
 * Returns deduplicated, capped list of LinkedIn profile URLs
 * 
 * @param targetedQueries - Array of search queries (e.g., ["Hillhouse" "CFO" 2025])
 * @param options - Execution options
 * @returns Deduplicated URL list + telemetry
 */
export async function executeTargetedQueries(
  targetedQueries: string[],
  options: {
    maxUrlsPerQuery?: number;    // Cap URLs per query (default: 12)
    maxTotalUrls?: number;        // Cap total URLs (default: 150)
    batchSize?: number;           // Parallel queries per batch (default: 3)
    delayBetweenBatches?: number; // ms delay between batches (default: 2000)
  } = {}
): Promise<{
  urls: string[];
  summary: ExecutionSummary;
}> {
  const {
    maxUrlsPerQuery = 12,
    maxTotalUrls = 150,
    batchSize = 3,
    delayBetweenBatches = 2000
  } = options;

  console.log(`\n🎯 [Targeted Query Execution] Starting ${targetedQueries.length} competitor searches...`);
  console.log(`   Batch size: ${batchSize} parallel queries`);
  console.log(`   Max URLs per query: ${maxUrlsPerQuery}`);
  console.log(`   Max total URLs: ${maxTotalUrls}`);

  const startTime = Date.now();
  const queryResults: QueryExecutionResult[] = [];
  const allUrls: string[] = [];

  // Process queries in batches to avoid rate limits
  const totalBatches = Math.ceil(targetedQueries.length / batchSize);

  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const batchStart = batchIndex * batchSize;
    const batchEnd = Math.min(batchStart + batchSize, targetedQueries.length);
    const batchQueries = targetedQueries.slice(batchStart, batchEnd);

    console.log(`\n📦 [Batch ${batchIndex + 1}/${totalBatches}] Executing ${batchQueries.length} searches...`);

    // Execute queries in parallel within batch
    const batchPromises = batchQueries.map(async (query) => {
      try {
        console.log(`   🔍 Searching: "${query}"`);

        // Execute search using SerpAPI
        const searchResults = await searchLinkedInPeople(
          {
            booleanQuery: query
          },
          maxUrlsPerQuery // Pass limit as second parameter
        );

        const urls = searchResults.profiles.map((r: any) => r.profileUrl);

        console.log(`   ✅ Found ${urls.length} profiles for: "${query}"`);

        return {
          query,
          urlsFound: urls.length,
          urls
        };
      } catch (error) {
        console.error(`   ❌ Search failed for "${query}":`, error);
        return {
          query,
          urlsFound: 0,
          urls: [],
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    queryResults.push(...batchResults);

    // Collect URLs from this batch
    for (const result of batchResults) {
      allUrls.push(...result.urls);
    }

    // Delay between batches (except for last batch)
    if (batchIndex < totalBatches - 1) {
      console.log(`   ⏱️  Waiting ${delayBetweenBatches}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }

  // Deduplicate URLs (LinkedIn URLs might appear in multiple searches)
  const uniqueUrls = Array.from(new Set(allUrls));

  console.log(`\n🔄 [Deduplication] ${allUrls.length} total URLs → ${uniqueUrls.length} unique URLs`);

  // Cap total URLs to prevent overwhelming the orchestrator
  const cappedUrls = uniqueUrls.slice(0, maxTotalUrls);

  if (uniqueUrls.length > maxTotalUrls) {
    console.log(`⚠️  [Capping] Reduced from ${uniqueUrls.length} to ${maxTotalUrls} URLs`);
  }

  const executionTimeMs = Date.now() - startTime;

  const summary: ExecutionSummary = {
    totalQueries: targetedQueries.length,
    successfulQueries: queryResults.filter(r => !r.error).length,
    failedQueries: queryResults.filter(r => r.error).length,
    totalUrlsFound: allUrls.length,
    uniqueUrlsAfterDedupe: uniqueUrls.length,
    executionTimeMs,
    queryResults
  };

  console.log(`\n✅ [Targeted Query Execution] Completed in ${executionTimeMs}ms`);
  console.log(`   Successful queries: ${summary.successfulQueries}/${summary.totalQueries}`);
  console.log(`   Total URLs found: ${summary.totalUrlsFound}`);
  console.log(`   Unique URLs: ${summary.uniqueUrlsAfterDedupe}`);
  console.log(`   Final URL count: ${cappedUrls.length} (capped at ${maxTotalUrls})`);

  return {
    urls: cappedUrls,
    summary
  };
}

/**
 * Merge and deduplicate URLs from multiple sources
 * (e.g., competitor mapping + manual URLs + Boolean search)
 * 
 * @param urlSources - Object with named URL arrays
 * @returns Deduplicated URL list
 */
export function mergeAndDeduplicateUrls(urlSources: {
  [source: string]: string[];
}): {
  urls: string[];
  sourceBreakdown: { [source: string]: number };
} {
  const allUrls: Array<{ url: string; source: string }> = [];

  for (const [source, urls] of Object.entries(urlSources)) {
    for (const url of urls) {
      allUrls.push({ url, source });
    }
  }

  // Deduplicate while tracking which source each URL came from
  const urlMap = new Map<string, string>(); // url → first source
  for (const { url, source } of allUrls) {
    if (!urlMap.has(url)) {
      urlMap.set(url, source);
    }
  }

  const uniqueUrls = Array.from(urlMap.keys());

  // Count URLs by source
  const sourceBreakdown: { [source: string]: number } = {};
  for (const source of Array.from(urlMap.values())) {
    sourceBreakdown[source] = (sourceBreakdown[source] || 0) + 1;
  }

  console.log(`\n🔗 [URL Merge] Combined ${allUrls.length} URLs from ${Object.keys(urlSources).length} sources`);
  console.log(`   Unique URLs after deduplication: ${uniqueUrls.length}`);
  console.log(`   Source breakdown:`, sourceBreakdown);

  return {
    urls: uniqueUrls,
    sourceBreakdown
  };
}
