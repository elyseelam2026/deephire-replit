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
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) score += 1;
  else feedback.push("At least 8 characters");

  if (password.length >= 12) score += 1;
  else if (password.length >= 8) feedback.push("12+ characters recommended");

  if (/[a-z]/.test(password)) score += 1;
  else feedback.push("Add lowercase letters");

  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push("Add uppercase letters");

  if (/[0-9]/.test(password)) score += 1;
  else feedback.push("Add numbers");

  if (/[!@#$%^&*]/.test(password)) score += 1;
  else feedback.push("Add special characters (!@#$%^&*)");

  return {
    isValid: score >= 3, // At least 3 of 6 requirements
    score,
    feedback,
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
