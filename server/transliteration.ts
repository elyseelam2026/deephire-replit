import pinyin from 'pinyin';
import hangulRomanization from 'hangul-romanization';
import wanakana from 'wanakana';

/**
 * Transliteration result with confidence scoring and audit trail
 */
export interface TransliterationResult {
  latinName: string;          // Transliterated ASCII-safe name
  emailFirstName: string;     // First name for email (ASCII)
  emailLastName: string;      // Last name for email (ASCII)
  method: string;             // pinyin, romaji, rr_romanization, manual, ascii
  confidence: number;         // 0.0 - 1.0 quality score
  locale: string | null;      // Detected locale (zh-CN, ko-KR, ja-JP)
  needsReview: boolean;       // Should user manually review?
}

/**
 * Detect the locale of a name based on Unicode ranges
 */
function detectLocale(name: string): string | null {
  // Chinese characters (CJK Unified Ideographs)
  if (/[\u4e00-\u9fa5]/.test(name)) {
    return 'zh-CN';
  }
  
  // Korean Hangul
  if (/[\uac00-\ud7af]/.test(name)) {
    return 'ko-KR';
  }
  
  // Japanese Hiragana or Katakana
  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(name)) {
    return 'ja-JP';
  }
  
  // Arabic
  if (/[\u0600-\u06ff]/.test(name)) {
    return 'ar-SA';
  }
  
  return null;
}

/**
 * Check if a name is already ASCII-safe (no transliteration needed)
 */
function isAscii(str: string): boolean {
  return /^[\x00-\x7F]*$/.test(str);
}

/**
 * Extract initials from a name as fallback
 * Example: "李嘉冕" → "JM" + "Li"
 */
function extractInitials(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/);
  
  if (parts.length === 0) {
    return { firstName: 'X', lastName: 'X' };
  }
  
  if (parts.length === 1) {
    // Single name - use first 2 chars as initials
    const initials = parts[0].substring(0, 2).toUpperCase();
    return { firstName: initials, lastName: initials };
  }
  
  // Multiple parts - take first letter of each
  const initials = parts.map(p => p[0]).join('').toUpperCase();
  return { 
    firstName: initials.substring(0, Math.ceil(initials.length / 2)),
    lastName: initials.substring(Math.ceil(initials.length / 2))
  };
}

/**
 * Transliterate Chinese name to Pinyin
 * Example: "李嘉冕" → "Li Jiamian"
 */
function transliterateChinese(name: string): { latinName: string; confidence: number } {
  try {
    // pinyin returns array of arrays: [['li'], ['jia'], ['mian']]
    const result = pinyin(name, {
      style: pinyin.STYLE_NORMAL, // No tone marks
      heteronym: false // Use most common pronunciation
    });
    
    // Flatten and capitalize properly
    const parts = result.map(arr => {
      const part = arr[0];
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    });
    
    const latinName = parts.join(' ');
    
    // High confidence if we got a result
    const confidence = latinName && latinName.length > 0 ? 0.9 : 0.3;
    
    return { latinName, confidence };
  } catch (error) {
    console.error('[Transliteration] Chinese transliteration failed:', error);
    return { latinName: '', confidence: 0 };
  }
}

/**
 * Transliterate Korean name to Romanization
 * Example: "김민준" → "Kim Minjun"
 */
function transliterateKorean(name: string): { latinName: string; confidence: number } {
  try {
    const latinName = hangulRomanization.convert(name);
    
    // Capitalize properly
    const parts = latinName.split(' ').map((part: string) => 
      part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    );
    
    const result = parts.join(' ');
    const confidence = result && result.length > 0 ? 0.9 : 0.3;
    
    return { latinName: result, confidence };
  } catch (error) {
    console.error('[Transliteration] Korean transliteration failed:', error);
    return { latinName: '', confidence: 0 };
  }
}

/**
 * Transliterate Japanese name to Romaji
 * Example: "田中太郎" → "Tanaka Taro"
 */
function transliterateJapanese(name: string): { latinName: string; confidence: number } {
  try {
    const latinName = wanakana.toRomaji(name);
    
    // Capitalize properly
    const parts = latinName.split(' ').map(part => 
      part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    );
    
    const result = parts.join(' ');
    const confidence = result && result.length > 0 ? 0.9 : 0.3;
    
    return { latinName: result, confidence };
  } catch (error) {
    console.error('[Transliteration] Japanese transliteration failed:', error);
    return { latinName: '', confidence: 0 };
  }
}

/**
 * Main transliteration pipeline: ASCII check → Transliterate → Initials fallback
 * This is the enterprise-grade 3-step approach recommended by architect
 */
export function transliterateName(fullName: string): TransliterationResult {
  const trimmedName = fullName.trim();
  
  // STEP 1: Check if already ASCII-safe (no transliteration needed)
  if (isAscii(trimmedName)) {
    const parts = trimmedName.split(/\s+/);
    const firstName = parts[0] || 'Unknown';
    const lastName = parts.slice(1).join(' ') || firstName;
    
    return {
      latinName: trimmedName,
      emailFirstName: firstName.toLowerCase(),
      emailLastName: lastName.toLowerCase(),
      method: 'ascii',
      confidence: 1.0,
      locale: null,
      needsReview: false
    };
  }
  
  // STEP 2: Detect locale and attempt transliteration
  const locale = detectLocale(trimmedName);
  let latinName = '';
  let confidence = 0;
  let method = 'unknown';
  
  if (locale === 'zh-CN') {
    const result = transliterateChinese(trimmedName);
    latinName = result.latinName;
    confidence = result.confidence;
    method = 'pinyin';
  } else if (locale === 'ko-KR') {
    const result = transliterateKorean(trimmedName);
    latinName = result.latinName;
    confidence = result.confidence;
    method = 'rr_romanization';
  } else if (locale === 'ja-JP') {
    const result = transliterateJapanese(trimmedName);
    latinName = result.latinName;
    confidence = result.confidence;
    method = 'romaji';
  }
  
  // STEP 3: Fallback to initials if transliteration failed or low confidence
  if (!latinName || confidence < 0.5) {
    const initials = extractInitials(trimmedName);
    const fallbackName = `${initials.firstName} ${initials.lastName}`;
    
    console.warn(`[Transliteration] Low confidence (${confidence}) for "${trimmedName}", using initials: ${fallbackName}`);
    
    return {
      latinName: fallbackName,
      emailFirstName: initials.firstName.toLowerCase(),
      emailLastName: initials.lastName.toLowerCase(),
      method: 'initials_fallback',
      confidence: 0.3,
      locale,
      needsReview: true // Flag for manual review
    };
  }
  
  // Success! Extract email components from transliterated name
  const parts = latinName.split(/\s+/);
  const emailFirstName = parts[0]?.toLowerCase() || 'unknown';
  const emailLastName = parts.slice(1).join('').toLowerCase() || emailFirstName;
  
  return {
    latinName,
    emailFirstName,
    emailLastName,
    method,
    confidence,
    locale,
    needsReview: confidence < 0.8 // Review if confidence is not high
  };
}

/**
 * Infer email from transliterated name and company
 * Returns email with status flag for UI
 */
export function inferEmail(
  fullName: string,
  companyName: string
): { email: string; emailStatus: string; emailSource: string } {
  const transliteration = transliterateName(fullName);
  
  // Clean company name for domain
  const companyDomain = companyName
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');
  
  const email = `${transliteration.emailFirstName}.${transliteration.emailLastName}@${companyDomain}.com`;
  
  // Set status based on transliteration confidence
  const emailStatus = transliteration.needsReview ? 'needs_review' : 'transliterated';
  const emailSource = transliteration.method;
  
  console.log(`[Email Inference] ${fullName} → ${email} (${emailStatus}, confidence: ${transliteration.confidence})`);
  
  return { email, emailStatus, emailSource };
}
