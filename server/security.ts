import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";

// Rate limiting store - in production, use Redis
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Configuration
const RATE_LIMIT_CONFIG = {
  registration: { maxAttempts: 5, windowMs: 15 * 60 * 1000 }, // 5 attempts per 15 min
  login: { maxAttempts: 5, windowMs: 15 * 60 * 1000 }, // 5 attempts per 15 min
  passwordReset: { maxAttempts: 3, windowMs: 60 * 60 * 1000 }, // 3 attempts per hour
};

const ACCOUNT_LOCKOUT_CONFIG = {
  maxAttempts: 5,
  lockoutDurationMs: 30 * 60 * 1000, // 30 minutes
};

/**
 * Rate limiting middleware factory
 */
export function createRateLimiter(
  config: { maxAttempts: number; windowMs: number }
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const record = rateLimitStore.get(key);

    if (!record || now > record.resetTime) {
      // Reset window
      rateLimitStore.set(key, { count: 1, resetTime: now + config.windowMs });
      return next();
    }

    record.count++;

    if (record.count > config.maxAttempts) {
      return res.status(429).json({
        error: "Too many attempts. Please try again later.",
        retryAfter: Math.ceil((record.resetTime - now) / 1000),
      });
    }

    next();
  };
}

/**
 * Registration rate limiter
 */
export const registrationRateLimiter = createRateLimiter(
  RATE_LIMIT_CONFIG.registration
);

/**
 * Login rate limiter
 */
export const loginRateLimiter = createRateLimiter(RATE_LIMIT_CONFIG.login);

/**
 * Password reset rate limiter
 */
export const passwordResetRateLimiter = createRateLimiter(
  RATE_LIMIT_CONFIG.passwordReset
);

/**
 * Check if account is locked
 */
export function isAccountLocked(lockedUntil: Date | null | undefined): boolean {
  if (!lockedUntil) return false;
  return new Date() < lockedUntil;
}

/**
 * Calculate lockout expiry time
 */
export function calculateLockoutExpiry(): Date {
  return new Date(Date.now() + ACCOUNT_LOCKOUT_CONFIG.lockoutDurationMs);
}

/**
 * Generate secure password reset token
 */
export function generatePasswordResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Validate password strength
 * REQUIRED: All of these must be present:
 * 1. At least 8 characters
 * 2. Lowercase letter
 * 3. Uppercase letter
 * 4. Number
 * 5. Special character (!@#$%^&*)
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;
  
  const hasMinLength = password.length >= 8;
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*]/.test(password);

  if (hasMinLength) score += 1;
  else feedback.push("At least 8 characters required");

  if (hasLowercase) score += 1;
  else feedback.push("Lowercase letters required");

  if (hasUppercase) score += 1;
  else feedback.push("Uppercase letters required");

  if (hasNumber) score += 1;
  else feedback.push("Numbers required");

  if (hasSpecialChar) score += 1;
  else feedback.push("Special character required (!@#$%^&*)");

  // MUST have all 5 core requirements (length, lowercase, uppercase, number, special char)
  const isValid = hasMinLength && hasLowercase && hasUppercase && hasNumber && hasSpecialChar;

  return {
    isValid,
    score,
    feedback: isValid ? [] : feedback, // Show feedback only if invalid
  };
}

/**
 * Session security configuration
 */
export const sessionConfig = {
  secret: process.env.SESSION_SECRET || "your-secret-key-change-in-production",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production", // HTTPS only in production
    httpOnly: true, // Not accessible from JavaScript
    sameSite: "strict" as const, // CSRF protection
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
};
