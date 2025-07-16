import { z } from 'zod';

/**
 * Input validation schemas for API endpoints
 */

// Chat request validation
export const chatRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.string().min(1).max(10000)
  })).min(1).max(50), // At least 1 message, max 50 messages
  model: z.string().min(1).max(100),
  sessionId: z.string().optional(),
  conversationId: z.string().optional(),
  mode: z.enum(['flash', 'think', 'ultra-think', 'full-think']).optional(),
  stream: z.boolean().optional(),
  includeMemory: z.boolean().optional(),
  voiceChat: z.boolean().optional(),
  language: z.string().max(10).optional(),
  enableWebSearch: z.boolean().optional(),
  forceWebSearch: z.boolean().optional(),
  files: z.array(z.object({
    name: z.string().max(255),
    type: z.string().max(100),
    url: z.string().optional(),
    content: z.string().optional(),
    mimeType: z.string().max(100).optional()
  })).max(10).optional() // Limit to 10 files
});

// File upload validation
export const fileUploadSchema = z.object({
  name: z.string().min(1).max(255),
  size: z.number().min(1).max(10 * 1024 * 1024), // 10MB limit
  type: z.string().max(100)
});

// User profile validation
export const userProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  preferences: z.object({
    theme: z.enum(['light', 'dark', 'system']).optional(),
    language: z.string().max(10).optional(),
    notifications: z.boolean().optional()
  }).optional()
});

/**
 * Sanitize HTML content to prevent XSS
 */
export function sanitizeHtml(input: string): string {
  if (!input) return '';
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate and sanitize user input
 */
export function validateAndSanitize<T>(
  schema: z.ZodSchema<T>,
  input: unknown
): { success: true; data: T } | { success: false; error: string } {
  try {
    const result = schema.parse(input);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        error: `Validation error: ${error.errors.map(e => e.message).join(', ')}` 
      };
    }
    return { success: false, error: 'Invalid input' };
  }
}

/**
 * Rate limiting configuration
 */
export const rateLimits = {
  chat: { requests: 60, windowMs: 60000 }, // 60 requests per minute
  upload: { requests: 10, windowMs: 60000 }, // 10 uploads per minute
  auth: { requests: 20, windowMs: 60000 }, // 20 auth requests per minute
  general: { requests: 100, windowMs: 60000 } // 100 general requests per minute
};

/**
 * Simple in-memory rate limiter (use Redis in production)
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  limit: { requests: number; windowMs: number }
): { allowed: boolean; resetTime: number } {
  const now = Date.now();
  const key = identifier;
  
  const record = rateLimitStore.get(key);
  
  if (!record || now > record.resetTime) {
    // Reset or create new record
    rateLimitStore.set(key, { count: 1, resetTime: now + limit.windowMs });
    return { allowed: true, resetTime: now + limit.windowMs };
  }
  
  if (record.count >= limit.requests) {
    return { allowed: false, resetTime: record.resetTime };
  }
  
  record.count++;
  return { allowed: true, resetTime: record.resetTime };
}