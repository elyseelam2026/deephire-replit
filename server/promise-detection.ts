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
 * CRITICAL FIX: Handle abbreviations (mins, min, hr, hrs, wk, wks, mo, mos)
 */
const PROMISE_PATTERNS = [
  // Explicit time-based promises (including MINUTES and ABBREVIATIONS) - with optional "I'll" prefix
  /(?:I(?:'ll| will)\s+)?(?:send|deliver|provide|find|get|show)\s+(?:you\s+)?(?:qualified\s+)?candidates?\s+(?:within|in)\s+(?:the\s+next\s+)?(\d+)\s+(min(?:ute)?s?|hr|hrs?|hour|day|week|wk|wks|month|mo|mos)s?/i,
  /(?:I(?:'ll| will)\s+)?(?:have|get)\s+(?:you\s+)?(?:your\s+)?(?:candidates?|longlist|shortlist)\s+(?:ready|prepared|available)\s+(?:within|in|by)\s+(?:the\s+next\s+)?(\d+)\s+(min(?:ute)?s?|hr|hrs?|hour|day|week|wk|wks|month|mo|mos)s?/i,
  /(?:I(?:'ll| will)\s+)?(?:send|share)\s+(?:a\s+)?(?:list|shortlist|longlist)\s+(?:of\s+candidates?\s+)?(?:within|in)\s+(?:the\s+next\s+)?(\d+)\s+(min(?:ute)?s?|hr|hrs?|hour|day|week|wk|wks|month|mo|mos)s?/i,
  
  // Specific time references (e.g., "by 16:27", "by 13:02") - with optional "I'll" prefix
  /(?:I(?:'ll| will)\s+)?(?:have|get|send|deliver)\s+(?:you\s+)?(?:your\s+)?(?:longlist|shortlist|candidates?)\s+(?:ready|available)?\s+by\s+(\d{1,2}):(\d{2})/i,
  
  // Relative time promises
  /(?:send|deliver|provide)\s+candidates?\s+(?:by\s+)?(tomorrow|tonight|today|this\s+week|next\s+week|this\s+month)/i,
  /(?:have|get)\s+(?:you\s+)?candidates?\s+(?:by\s+)?(tomorrow|tonight|today|this\s+week|next\s+week)/i,
  
  // Start working promises (implying delivery)
  /(?:start|begin)\s+(?:the\s+)?search\s+(?:right\s+away|immediately|now)?\s*(?:and\s+)?(?:send|deliver|provide)\s+(?:results\s+)?(?:within|in)\s+(\d+)\s+(min(?:ute)?s?|hr|hrs?|hour|day|week|wk|wks)s?/i,
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
      let specificDeadline: Date | null = null;
      
      // Check if this is a specific time pattern (e.g., "by 16:27")
      if (match[1] && match[2] && !isNaN(parseInt(match[1])) && !isNaN(parseInt(match[2]))) {
        // Looks like HH:MM format
        const hour = parseInt(match[1]);
        const minute = parseInt(match[2]);
        if (hour >= 0 && hour < 24 && minute >= 0 && minute < 60) {
          // Create deadline for today at specified time
          specificDeadline = new Date();
          specificDeadline.setHours(hour, minute, 0, 0);
          
          // If time has passed today, assume tomorrow
          if (specificDeadline < new Date()) {
            specificDeadline.setDate(specificDeadline.getDate() + 1);
          }
          
          timeUnit = 'specific';
          timeAmount = 0;
        }
      } else if (match[1] && match[2]) {
        // Pattern with number + unit (e.g., "5 minutes" or "20 mins")
        timeAmount = parseInt(match[1]);
        const rawUnit = match[2].toLowerCase();
        
        // Normalize abbreviations to full units
        if (rawUnit.startsWith('min')) {
          timeUnit = 'minute';
        } else if (rawUnit === 'hr' || rawUnit === 'hrs' || rawUnit === 'hour') {
          timeUnit = 'hour';
        } else if (rawUnit === 'wk' || rawUnit === 'wks' || rawUnit === 'week') {
          timeUnit = 'week';
        } else if (rawUnit === 'mo' || rawUnit === 'mos' || rawUnit === 'month') {
          timeUnit = 'month';
        } else {
          timeUnit = rawUnit;
        }
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
      const deadline = specificDeadline || calculateDeadline(timeAmount, timeUnit);
      
      // Format timeframe for storage
      let timeframeText: string;
      if (specificDeadline) {
        timeframeText = `by ${specificDeadline.getHours()}:${String(specificDeadline.getMinutes()).padStart(2, '0')}`;
      } else {
        timeframeText = timeAmount && timeUnit 
          ? `${timeAmount} ${timeUnit}${timeAmount > 1 ? 's' : ''}`
          : match[1] || 'soon';
      }
      
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
    case 'minute':
      deadline.setMinutes(deadline.getMinutes() + amount);
      break;
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
      // Default to 15 minutes if unknown
      deadline.setMinutes(deadline.getMinutes() + 15);
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
      minCandidates: 5
    } as any,
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
