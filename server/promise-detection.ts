/**
 * AI Promise Detection & Parsing
 * 
 * Detects when the AI makes delivery commitments in conversations
 * and parses them into trackable promises with deadlines.
 */

import type { InsertSearchPromise } from "@shared/schema";

interface DetectedPromise {
  promiseText: string; // What the AI said
  deliveryTimeframe: string; // Parsed timeframe
  deadlineAt: Date; // Calculated deadline
  confidence: number; // 0-1, how sure we are this is a promise
}

/**
 * Promise patterns the AI might use
 */
const PROMISE_PATTERNS = [
  // Explicit time-based promises
  /(?:send|deliver|provide|find|get|show)\s+(?:you\s+)?(?:qualified\s+)?candidates?\s+(?:within|in)\s+(?:the\s+next\s+)?(\d+)\s+(hour|day|week|month)s?/i,
  /(?:have|get)\s+(?:you\s+)?candidates?\s+(?:ready|prepared|available)\s+(?:within|in|by)\s+(\d+)\s+(hour|day|week|month)s?/i,
  /(?:send|share)\s+(?:a\s+)?(?:list|shortlist|longlist)\s+(?:of\s+candidates?\s+)?(?:within|in)\s+(\d+)\s+(hour|day|week|month)s?/i,
  
  // Relative time promises
  /(?:send|deliver|provide)\s+candidates?\s+(?:by\s+)?(tomorrow|tonight|today|this\s+week|next\s+week|this\s+month)/i,
  /(?:have|get)\s+(?:you\s+)?candidates?\s+(?:by\s+)?(tomorrow|tonight|today|this\s+week|next\s+week)/i,
  
  // Start working promises (implying delivery)
  /(?:start|begin)\s+(?:the\s+)?search\s+(?:right\s+away|immediately|now)?\s*(?:and\s+)?(?:send|deliver|provide)\s+(?:results\s+)?(?:within|in)\s+(\d+)\s+(hour|day|week)s?/i,
];

/**
 * Detect if an AI response contains a delivery promise
 */
export function detectPromise(aiResponse: string): DetectedPromise | null {
  for (const pattern of PROMISE_PATTERNS) {
    const match = aiResponse.match(pattern);
    if (match) {
      // Found a promise!
      const fullMatch = match[0];
      
      // Parse the timeframe
      let timeAmount = 0;
      let timeUnit = '';
      
      if (match[1] && match[2]) {
        // Pattern with number + unit (e.g., "72 hours")
        timeAmount = parseInt(match[1]);
        timeUnit = match[2].toLowerCase();
      } else if (match[1]) {
        // Pattern with relative time (e.g., "tomorrow")
        const relativeTime = match[1].toLowerCase();
        if (relativeTime === 'tomorrow' || relativeTime === 'tonight') {
          timeAmount = 1;
          timeUnit = 'day';
        } else if (relativeTime === 'today') {
          timeAmount = 4;
          timeUnit = 'hour';
        } else if (relativeTime === 'this week') {
          timeAmount = 7;
          timeUnit = 'day';
        } else if (relativeTime === 'next week') {
          timeAmount = 7;
          timeUnit = 'day';
        } else if (relativeTime === 'this month') {
          timeAmount = 30;
          timeUnit = 'day';
        }
      }
      
      // Calculate deadline
      const deadline = calculateDeadline(timeAmount, timeUnit);
      
      // Format timeframe for storage
      const timeframeText = timeAmount && timeUnit 
        ? `${timeAmount} ${timeUnit}${timeAmount > 1 ? 's' : ''}`
        : match[1] || 'soon';
      
      return {
        promiseText: fullMatch,
        deliveryTimeframe: timeframeText,
        deadlineAt: deadline,
        confidence: 0.9 // High confidence if we matched a pattern
      };
    }
  }
  
  // Check for more general promise indicators
  const generalPromisePatterns = [
    /I(?:'ll| will)\s+(?:send|deliver|provide|find|get)\s+(?:you\s+)?candidates?/i,
    /you(?:'ll| will)\s+(?:receive|get|have)\s+candidates?/i,
  ];
  
  for (const pattern of generalPromisePatterns) {
    if (pattern.test(aiResponse)) {
      // Found a promise, but no specific timeframe
      // Default to 72 hours
      return {
        promiseText: aiResponse.match(pattern)![0],
        deliveryTimeframe: '72 hours',
        deadlineAt: calculateDeadline(72, 'hour'),
        confidence: 0.7 // Medium confidence
      };
    }
  }
  
  return null;
}

/**
 * Calculate deadline based on timeframe
 */
function calculateDeadline(amount: number, unit: string): Date {
  const now = new Date();
  const deadline = new Date(now);
  
  switch (unit.toLowerCase()) {
    case 'hour':
      deadline.setHours(deadline.getHours() + amount);
      break;
    case 'day':
      deadline.setDate(deadline.getDate() + amount);
      break;
    case 'week':
      deadline.setDate(deadline.getDate() + (amount * 7));
      break;
    case 'month':
      deadline.setMonth(deadline.getMonth() + amount);
      break;
    default:
      // Default to 72 hours if unknown
      deadline.setHours(deadline.getHours() + 72);
  }
  
  return deadline;
}

/**
 * Create a search promise from detected promise and conversation context
 */
export function createPromiseFromConversation(
  detected: DetectedPromise,
  conversationId: number,
  searchContext: any
): Omit<InsertSearchPromise, 'createdAt' | 'updatedAt'> {
  return {
    conversationId,
    jobId: null,
    promiseText: detected.promiseText,
    deliveryTimeframe: detected.deliveryTimeframe,
    deadlineAt: detected.deadlineAt,
    searchParams: {
      title: searchContext?.title || '',
      skills: searchContext?.skills || [],
      location: searchContext?.location || '',
      yearsExperience: searchContext?.yearsExperience || '',
      industry: searchContext?.industry || '',
      salary: searchContext?.salary || '',
      urgency: searchContext?.urgency || 'medium',
      searchTier: searchContext?.searchTier || 'internal',
      minCandidates: 5 // Default expectation
    },
    status: 'pending',
    candidatesFound: 0,
    candidateIds: null,
    executionLog: [{
      timestamp: new Date().toISOString(),
      event: 'promise_created',
      details: {
        detectedFrom: detected.promiseText,
        confidence: detected.confidence
      }
    }],
    notificationSent: false,
    notificationSentAt: null,
    errorMessage: null,
    retryCount: 0,
    executionStartedAt: null,
    completedAt: null
  };
}
