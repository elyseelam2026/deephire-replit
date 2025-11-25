// Type extensions for multi-tenant support
import type { SessionData } from 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId?: number;
    candidateId?: number;
    companyId?: number;
    userRole?: 'candidate' | 'company' | 'admin' | 'researcher' | 'agency';
  }
}
