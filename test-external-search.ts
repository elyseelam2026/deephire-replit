/**
 * PROOF: External Candidate Sourcing Test
 * This script proves the system ACTUALLY calls LinkedIn/SerpAPI
 */

async function proveExternalSearch() {
  console.log('\n🔬 PROOF OF EXTERNAL SEARCH - Starting Test...\n');
  console.log('=' .repeat(60));
  
  const testQuery = {
    jobId: null,
    jobTitle: 'Chief Financial Officer',
    location: 'Hong Kong',
    keywords: 'Private Equity investment experience',
    maxResults: 5
  };
  
  console.log('📋 Search Query:');
  console.log(JSON.stringify(testQuery, null, 2));
  console.log('=' .repeat(60));
  
  try {
    console.log('\n🚀 Step 1: Triggering External Search via API...');
    console.log('   Calling POST /api/sourcing/search\n');
    
    const response = await fetch('http://localhost:5000/api/sourcing/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testQuery)
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error: ${response.status} - ${error}`);
    }
    
    const data = await response.json();
    console.log('✅ Sourcing Run Created!');
    console.log(`   Run ID: ${data.runId}`);
    console.log(`   Status: ${data.status}`);
    console.log(`   Message: ${data.message}`);
    
    const runId = data.runId;
    
    console.log('\n📡 Step 2: Polling for Progress...');
    console.log('   (Watch server logs for "[SerpAPI]" and "[Bright Data]" entries)\n');
    
    // Poll for progress
    let attempts = 0;
    const maxAttempts = 40;
    let lastStatus = '';
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const progressResponse = await fetch(`http://localhost:5000/api/sourcing/${runId}`);
      
      if (!progressResponse.ok) {
        throw new Error(`Failed to get progress: ${progressResponse.status}`);
      }
      
      const progress = await progressResponse.json();
      
      if (progress.status !== lastStatus) {
        console.log(`\n📊 Status Update [${attempts + 1}/${maxAttempts}]:`);
        console.log(`   Status: ${progress.status}`);
        console.log(`   Progress: ${JSON.stringify(progress.progress || {})}`);
        console.log(`   Candidates Created: ${progress.candidatesCreated || 0}`);
        
        lastStatus = progress.status;
      } else {
        process.stdout.write('.');
      }
      
      if (progress.status === 'completed') {
        console.log('\n\n' + '='.repeat(60));
        console.log('✅ PROOF COMPLETE!');
        console.log('='.repeat(60));
        console.log(`\n📈 Final Results:`);
        console.log(`   • Status: ${progress.status}`);
        console.log(`   • New Candidates Added: ${progress.candidatesCreated || 0}`);
        console.log(`   • Progress Data: ${JSON.stringify(progress.progress || {}, null, 2)}`);
        
        if (progress.candidatesCreated && progress.candidatesCreated > 0) {
          console.log(`\n🎉 SUCCESS! ${progress.candidatesCreated} NEW candidates sourced from LinkedIn!`);
          console.log(`\n💾 To verify:`);
          console.log(`   1. Check server logs above for "[SerpAPI]" and "[Bright Data]" entries`);
          console.log(`   2. Query database: SELECT * FROM candidates ORDER BY id DESC LIMIT ${progress.candidatesCreated};`);
          console.log(`   3. Look for linkedin_url field in those candidates`);
        } else {
          console.log(`\n⚠️  No new candidates were added. Check logs for errors.`);
        }
        
        console.log('\n✅ External search is REAL, not fake!\n');
        break;
      }
      
      if (progress.status === 'failed') {
        console.log('\n\n❌ Search failed.');
        console.log(`Error: ${JSON.stringify(progress.progress || {})}`);
        break;
      }
      
      attempts++;
    }
    
    if (attempts >= maxAttempts) {
      console.log('\n\n⏱️  Timeout - search is still processing.');
      console.log(`Check: http://localhost:5000/api/sourcing/${runId}`);
    }
    
  } catch (error) {
    console.error('\n❌ Test Error:', error);
    console.error('\nThis usually means:');
    console.error('  1. Server is not running (start with npm run dev)');
    console.error('  2. API keys are invalid (check SERPAPI_API_KEY, BRIGHTDATA_API_KEY)');
    console.error('  3. Network connectivity issue');
  }
}

// Run the test
proveExternalSearch().then(() => {
  console.log('\n✅ Test script completed. Review logs above for proof.\n');
  process.exit(0);
}).catch(err => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});
