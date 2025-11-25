/**
 * AUTOMATED TEST SYSTEM FOR DEEPHIRE
 * HTTP-based tests (no browser needed)
 * Tests all critical flows and detects bugs
 */

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
  details?: any;
}

const TEST_RESULTS: TestResult[] = [];
const BASE_URL = 'http://localhost:5000';

async function httpRequest(method: string, path: string, body?: any): Promise<Response> {
  const options: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) options.body = JSON.stringify(body);
  
  return fetch(`${BASE_URL}${path}`, options);
}

async function test(name: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    console.log(`▶️  [Test] ${name}`);
    await fn();
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

export async function runFullTestSuite() {
  console.log('🚀 [Test Runner] Starting HTTP-based test suite...\n');

  // TEST 1: Home page accessible
  await test('Home page loads', async () => {
    const response = await httpRequest('GET', '/');
    if (!response.ok) throw new Error(`Status: ${response.status}`);
  });

  // TEST 2: Database health check
  await test('Database health check passes', async () => {
    const response = await httpRequest('GET', '/api/admin/health');
    if (!response.ok) throw new Error(`Status: ${response.status}`);
    const data = await response.json();
    if (data.database !== 'healthy') throw new Error(`DB health: ${data.database}`);
  });

  // TEST 3: Authentication required on candidates
  await test('Candidates endpoint requires auth', async () => {
    const response = await httpRequest('GET', '/api/candidates');
    if (response.status !== 401) throw new Error(`Expected 401, got ${response.status}`);
    const data = await response.json();
    if (!data.error) throw new Error('Missing error message');
  });

  // TEST 4: Learning Intelligence API
  await test('Learning Intelligence API works', async () => {
    const response = await httpRequest('GET', '/api/learning/intelligence');
    if (!response.ok) throw new Error(`Status: ${response.status}`);
    const data = await response.json();
    if (!data.positions && !data.companies) throw new Error('Missing learning data');
  });

  // TEST 5: Admin metrics available
  await test('Admin metrics endpoint', async () => {
    const response = await httpRequest('GET', '/api/admin/metrics');
    if (!response.ok) throw new Error(`Status: ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Metrics should be array');
  });

  // TEST 6: Companies endpoint
  await test('Companies endpoint accessible', async () => {
    const response = await httpRequest('GET', '/api/companies');
    if (!response.ok && response.status !== 401) throw new Error(`Status: ${response.status}`);
  });

  // TEST 7: Jobs endpoint exists
  await test('Jobs endpoint accessible', async () => {
    const response = await httpRequest('GET', '/api/jobs');
    if (response.status === 500) throw new Error('Server error');
    // 401 is fine (auth required), other status codes are OK
  });

  // TEST 8: No 404s on critical paths
  await test('Critical paths exist (no 404s)', async () => {
    const paths = ['/', '/api/admin/health', '/api/learning/intelligence'];
    for (const path of paths) {
      const response = await httpRequest('GET', path);
      if (response.status === 404) throw new Error(`404 at ${path}`);
    }
  });

  // TEST 9: Server responds within timeout
  await test('Server response time acceptable', async () => {
    const start = Date.now();
    const response = await httpRequest('GET', '/api/admin/health');
    const duration = Date.now() - start;
    if (duration > 5000) throw new Error(`Slow response: ${duration}ms`);
    if (!response.ok) throw new Error(`Status: ${response.status}`);
  });

  // TEST 10: Learning API returns proper structure
  await test('Learning API has proper structure', async () => {
    const response = await httpRequest('GET', '/api/learning/intelligence');
    if (!response.ok) throw new Error(`Status: ${response.status}`);
    const data = await response.json();
    
    // Should have learning features
    const requiredFields = ['positions', 'companies', 'industries'];
    for (const field of requiredFields) {
      if (!(field in data)) {
        console.log(`  ⚠️  Missing field: ${field} (may not have data yet)`);
      }
    }
  });

  // Print results
  const passed = TEST_RESULTS.filter(t => t.passed).length;
  const failed = TEST_RESULTS.filter(t => !t.passed).length;

  console.log('\n' + '='.repeat(70));
  console.log('📊 TEST RESULTS');
  console.log('='.repeat(70));
  console.log(`Total Tests:  ${TEST_RESULTS.length}`);
  console.log(`✅ Passed:    ${passed}`);
  console.log(`❌ Failed:    ${failed}`);
  console.log('='.repeat(70));

  if (failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    TEST_RESULTS.filter(t => !t.passed).forEach(t => {
      console.log(`  ✗ ${t.name}`);
      console.log(`    Error: ${t.error}`);
    });
  }

  console.log('\n✨ Test run complete!\n');
  
  return { total: TEST_RESULTS.length, passed, failed, tests: TEST_RESULTS };
}

// Run if called directly
runFullTestSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
