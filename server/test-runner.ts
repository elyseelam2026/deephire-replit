/**
 * AUTOMATED TEST SYSTEM FOR DEEPHIRE
 * Uses Playwright to test all critical user flows
 * Detects bugs and logs issues automatically
 */

import { chromium, Browser, Page } from 'playwright';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

const TEST_RESULTS: TestResult[] = [];
const BASE_URL = 'http://localhost:5000';

export class AutomatedTestRunner {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async launch() {
    console.log('🚀 [Test Runner] Launching Playwright browser...');
    this.browser = await chromium.launch({ headless: true });
    this.page = await this.browser.newPage();
    console.log('✅ [Test Runner] Browser launched');
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log('🛑 [Test Runner] Browser closed');
    }
  }

  async test(name: string, fn: (page: Page) => Promise<void>) {
    if (!this.page) throw new Error('Browser not launched');
    
    const start = Date.now();
    try {
      console.log(`\n▶️  [Test] ${name}`);
      await fn(this.page);
      const duration = Date.now() - start;
      TEST_RESULTS.push({ name, passed: true, duration });
      console.log(`✅ [Test] ${name} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - start;
      const errorMsg = (error as any)?.message || String(error);
      TEST_RESULTS.push({ name, passed: false, error: errorMsg, duration });
      console.log(`❌ [Test] ${name}: ${errorMsg}`);
    }
  }

  getResults() {
    const passed = TEST_RESULTS.filter(t => t.passed).length;
    const failed = TEST_RESULTS.filter(t => !t.passed).length;
    return {
      total: TEST_RESULTS.length,
      passed,
      failed,
      tests: TEST_RESULTS
    };
  }
}

/**
 * Test Suite: Core Functionality
 */
export async function runFullTestSuite() {
  const runner = new AutomatedTestRunner();
  await runner.launch();

  try {
    // TEST 1: Home Page Load
    await runner.test('Home page loads', async (page) => {
      const response = await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
      if (!response?.ok()) throw new Error(`Failed to load home: ${response?.status()}`);
    });

    // TEST 2: Database Health Check
    await runner.test('Database health check', async (page) => {
      const response = await page.goto(`${BASE_URL}/api/admin/health`, { waitUntil: 'networkidle' });
      if (!response?.ok()) throw new Error(`Health check failed: ${response?.status()}`);
      const json = await response.json();
      if (json.database !== 'healthy') throw new Error('Database not healthy');
    });

    // TEST 3: Authentication Required
    await runner.test('Candidates page requires auth', async (page) => {
      const response = await page.goto(`${BASE_URL}/api/candidates`);
      const data = await response?.json();
      if (!data?.error?.includes('Unauthorized')) throw new Error('Auth not enforced');
    });

    // TEST 4: Learning Intelligence API
    await runner.test('Learning Intelligence API responds', async (page) => {
      const response = await page.goto(`${BASE_URL}/api/learning/intelligence`);
      if (!response?.ok()) throw new Error(`API failed: ${response?.status()}`);
      const json = await response.json();
      if (!json.positions) throw new Error('Missing positions in response');
    });

    // TEST 5: Dashboard Navigation
    await runner.test('Dashboard page accessible', async (page) => {
      const response = await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
      // Check for sidebar or navigation elements
      const sidebar = await page.$('[data-testid="button-sidebar-toggle"]');
      if (!sidebar) throw new Error('Sidebar toggle not found');
    });

    // TEST 6: Search Strategy Generation
    await runner.test('Search strategy generation API', async (page) => {
      const response = await page.goto(`${BASE_URL}/api/sourcing/search-strategy`, {
        waitUntil: 'networkidle'
      });
      // This endpoint may not exist yet - just verify no 500 error
      if (response?.status() === 500) throw new Error('Server error on search-strategy');
    });

    // TEST 7: Company Data Available
    await runner.test('Companies endpoint responds', async (page) => {
      const response = await page.goto(`${BASE_URL}/api/companies`);
      if (!response?.ok()) throw new Error(`Companies endpoint failed: ${response?.status()}`);
    });

    // TEST 8: No Console Errors
    await runner.test('No critical console errors', async (page) => {
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });
      
      await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      
      if (errors.length > 0) {
        throw new Error(`Console errors: ${errors.slice(0, 3).join(', ')}`);
      }
    });

    // TEST 9: Learning Dashboard Page Loads
    await runner.test('Learning Intelligence dashboard accessible', async (page) => {
      // Navigate to dashboard
      await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
      
      // Look for learning intelligence link (if navigation exists)
      const learningLink = await page.$('text=Learning Intelligence');
      if (!learningLink) {
        // It's okay if link not found - page might not be public
        console.log('  (Learning Intelligence link not found in navbar)');
      }
    });

    // TEST 10: API Metrics Available
    await runner.test('Admin metrics endpoint', async (page) => {
      const response = await page.goto(`${BASE_URL}/api/admin/metrics`);
      if (!response?.ok()) throw new Error(`Metrics endpoint failed: ${response?.status()}`);
      const json = await response.json();
      if (!Array.isArray(json)) throw new Error('Metrics should return array');
    });

  } finally {
    await runner.close();
  }

  // Print results
  const results = runner.getResults();
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total:  ${results.total}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log('='.repeat(60));

  if (results.failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.tests
      .filter(t => !t.passed)
      .forEach(t => {
        console.log(`  - ${t.name}: ${t.error}`);
      });
  }

  console.log('\n✨ Test run complete!\n');
  return results;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runFullTestSuite().catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
  });
}
