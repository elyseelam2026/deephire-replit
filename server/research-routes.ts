import { Router } from 'express';
import { startResearchPhase, generateInformedJD, type ResearchContext } from './research';

const router = Router();

/**
 * POST /api/research/start
 * Initiates research phase after NAP collection
 * Returns research findings for JD generation
 */
router.post('/research/start', async (req, res) => {
  try {
    const { jobContext, jobId } = req.body;

    if (!jobContext) {
      return res.status(400).json({ error: 'jobContext required' });
    }

    console.log('[RESEARCH API] Starting research phase for:', jobContext.title);

    // Trigger async research (don't wait)
    const researchPromise = startResearchPhase(jobContext);

    // Send immediate response with research starting
    res.json({
      status: 'research_starting',
      message: `Researching ${jobContext.company || 'company'} and market context...`,
      expectedDuration: '2-3 minutes',
      phases: [
        'Searching company context (AUM, strategy, geography)',
        'Analyzing competitor CFO hiring patterns',
        'Identifying target companies for passive sourcing',
        'Building market intelligence (comp, skills, talent density)'
      ]
    });

    // Handle research completion in background
    researchPromise.then(async (researchContext) => {
      console.log('[RESEARCH API] Research phase complete, generating JD...');

      // Generate informed JD
      const jd = await generateInformedJD(jobContext, researchContext);

      // Store research results (would save to database in production)
      console.log(`[RESEARCH API] Generated professional JD for ${jobContext.title}`);
      console.log(`[RESEARCH API] Found ${researchContext.targetCompanies.length} target companies for sourcing`);

      // In production, would:
      // 1. Save research context to database
      // 2. Save generated JD to database
      // 3. Send WebSocket alert to frontend: "Research complete. JD ready for review."
      // 4. Display research findings: target companies, market intelligence, hiring patterns

    }).catch((error) => {
      console.error('[RESEARCH API] Error in background research:', error);
    });

  } catch (error) {
    console.error('[RESEARCH API] Error:', error);
    res.status(500).json({ error: 'Research phase failed' });
  }
});

/**
 * POST /api/research/generate-jd
 * Generate professional JD from NAP + research findings
 */
router.post('/research/generate-jd', async (req, res) => {
  try {
    const { jobContext, researchContext } = req.body;

    if (!jobContext || !researchContext) {
      return res.status(400).json({ error: 'jobContext and researchContext required' });
    }

    const jd = await generateInformedJD(jobContext, researchContext);

    res.json({
      status: 'jd_generated',
      jd,
      message: 'Professional JD is ready for your review',
      nextStep: 'Please review the JD and confirm. If approved, we can set up dual-track sourcing.'
    });

  } catch (error) {
    console.error('[RESEARCH API] JD generation error:', error);
    res.status(500).json({ error: 'Failed to generate JD' });
  }
});

/**
 * POST /api/research/approve-jd
 * User approves JD, triggers dual-track sourcing setup
 */
router.post('/research/approve-jd', async (req, res) => {
  try {
    const { jobId, jd, researchContext } = req.body;

    console.log('[RESEARCH API] JD approved, setting up dual-track sourcing...');

    res.json({
      status: 'dual_track_ready',
      message: 'JD approved! Ready to set up dual-track sourcing.',
      options: {
        activePosting: {
          text: 'Help post to LinkedIn, job boards, and internal channels?',
          description: 'Captures 15% of population actively job hunting'
        },
        passiveSearching: {
          text: 'Search passive candidates from target companies?',
          description: 'Captures 85% of passive talent - they\'ll arrive within 1-2 weeks',
          targetCompanies: researchContext?.targetCompanies ? researchContext.targetCompanies.slice(0, 5) : []
        }
      },
      recommendation: 'Run both simultaneously for maximum coverage'
    });

    // In production, would:
    // 1. Create job posting record
    // 2. Start active posting to channels
    // 3. Start passive sourcing in background
    // 4. Send alerts: "Posted to 5 channels ✓", "Searching 40 target companies ✓"

  } catch (error) {
    console.error('[RESEARCH API] Error setting up dual-track:', error);
    res.status(500).json({ error: 'Failed to set up dual-track sourcing' });
  }
});

/**
 * POST /api/research/competitor-patterns
 * Research competitor hiring patterns for a specific role in an industry
 */
router.post('/research/competitor-patterns', async (req, res) => {
  try {
    const { title, industry } = req.body;

    if (!title || !industry) {
      return res.status(400).json({ error: 'title and industry required' });
    }

    console.log(`[RESEARCH API] Analyzing competitor patterns for ${title} in ${industry}...`);

    // Use the existing research function (imported from research.ts)
    // This function internally handles web search and pattern analysis
    const patterns = await (await import('./research')).searchCompetitorPatterns(title, industry);

    res.json({
      status: 'competitor_patterns_found',
      title,
      industry,
      patterns,
      insight: `These hiring patterns indicate the typical backgrounds and career progressions for ${title} positions in the ${industry} industry.`,
      useCase: 'Use these patterns to refine candidate sourcing strategy and understand market expectations.'
    });

  } catch (error) {
    console.error('[RESEARCH API] Error analyzing competitor patterns:', error);
    res.status(500).json({ error: 'Failed to analyze competitor patterns' });
  }
});

/**
 * POST /api/research/target-companies
 * Identify target companies for passive candidate sourcing
 */
router.post('/research/target-companies', async (req, res) => {
  try {
    const { industry, strategy, geography } = req.body;

    if (!industry) {
      return res.status(400).json({ error: 'industry required' });
    }

    console.log(`[RESEARCH API] Identifying target companies in ${industry} (${geography || 'Global'})...`);

    // Use the existing research function (imported from research.ts)
    const targetCompanies = await (await import('./research')).identifyTargetCompanies(
      industry,
      strategy || 'Leading firms',
      geography
    );

    res.json({
      status: 'target_companies_identified',
      industry,
      geography: geography || 'Global',
      targetCompanies,
      count: targetCompanies.length,
      insight: `These ${targetCompanies.length} companies are ideal for passive sourcing of ${strategy || 'senior'} talent in this market.`,
      nextStep: 'Use these companies in passive sourcing to find candidates currently employed at top-tier firms.'
    });

  } catch (error) {
    console.error('[RESEARCH API] Error identifying target companies:', error);
    res.status(500).json({ error: 'Failed to identify target companies' });
  }
});

/**
 * POST /api/sourcing/active-posting
 * Post job to active channels (LinkedIn, job boards, internal portals)
 */
router.post('/sourcing/active-posting', async (req, res) => {
  try {
    const { jobId, jd, channels } = req.body;

    if (!jobId || !jd) {
      return res.status(400).json({ error: 'jobId and jd required' });
    }

    // Default channels if not specified
    const targetChannels = channels || [
      { name: 'LinkedIn', status: 'queued' },
      { name: 'Glassdoor', status: 'queued' },
      { name: 'Indeed', status: 'queued' },
      { name: 'Internal Portal', status: 'queued' },
      { name: 'ZipRecruiter', status: 'queued' }
    ];

    console.log(`[SOURCING API] Posting job ${jobId} to ${targetChannels.length} active channels...`);

    // Simulate posting to channels (in production, would call actual job board APIs)
    const results = await Promise.all(
      targetChannels.map(async (channel) => {
        // Simulate API call with small delay
        await new Promise(r => setTimeout(r, 200));
        console.log(`[SOURCING API] Posted to ${channel.name} ✓`);
        return {
          channel: channel.name,
          status: 'posted',
          timestamp: new Date().toISOString(),
          url: `https://${channel.name.toLowerCase().replace(/\s+/g, '')}.example.com/jobs/${jobId}`
        };
      })
    );

    res.json({
      status: 'active_posting_complete',
      jobId,
      channelsPosted: results.length,
      channels: results,
      message: `Successfully posted job to ${results.length} active channels`,
      alert: `✓ Posted to ${results.length} channels. Expecting active responders within 24-48 hours.`,
      nextStep: 'Monitor applications and begin passive sourcing in parallel.'
    });

  } catch (error) {
    console.error('[SOURCING API] Error posting to active channels:', error);
    res.status(500).json({ error: 'Failed to post to active channels' });
  }
});

export default router;
