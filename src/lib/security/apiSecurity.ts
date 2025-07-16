import { NextResponse } from 'next/server';

/**
 * Security headers for API responses
 */
export function createSecureResponse(
  data: any,
  status: number = 200,
  headers: Record<string, string> = {}
): NextResponse {
  const response = NextResponse.json(data, { status });
  
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Content-Security-Policy', "default-src 'self'");
  
  // CORS headers for API
  response.headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Custom headers
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}

/**
 * Secure error response that doesn't leak sensitive information
 */
export function createErrorResponse(
  error: string,
  status: number = 500,
  details?: string
): NextResponse {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return createSecureResponse({
    error,
    ...(isDevelopment && details && { details }),
    timestamp: new Date().toISOString()
  }, status);
}

/**
 * Log security events for monitoring
 */
export function logSecurityEvent(
  event: string,
  userId?: string,
  details?: any
): void {
  const logData = {
    timestamp: new Date().toISOString(),
    event,
    userId,
    details: process.env.NODE_ENV === 'development' ? details : undefined
  };
  
  // In production, send to monitoring service
  if (process.env.NODE_ENV === 'production') {
    // TODO: Integrate with monitoring service (e.g., Sentry, DataDog)
    console.error('SECURITY_EVENT:', JSON.stringify(logData));
  } else {
    console.warn('Security Event:', logData);
  }
}

/**
 * Validate API origin and referrer
 */
export function validateOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  const referrer = request.headers.get('referer');
  
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'https://localhost:3000'
  ];
  
  // Allow requests without origin (server-to-server)
  if (!origin && !referrer) return true;
  
  // Check origin
  if (origin && !allowedOrigins.includes(origin)) {
    logSecurityEvent('INVALID_ORIGIN', undefined, { origin, referrer });
    return false;
  }
  
  // Check referrer
  if (referrer && !allowedOrigins.some(allowed => referrer.startsWith(allowed))) {
    logSecurityEvent('INVALID_REFERRER', undefined, { origin, referrer });
    return false;
  }
  
  return true;
}

/**
 * Request size limit middleware
 */
export function validateRequestSize(
  contentLength: string | null,
  maxSize: number = 10 * 1024 * 1024 // 10MB default
): boolean {
  if (!contentLength) return true;
  
  const size = parseInt(contentLength, 10);
  if (isNaN(size)) return true;
  
  return size <= maxSize;
}

/**
 * Honeypot field validation for forms
 */
export function validateHoneypot(formData: FormData): boolean {
  // Check for common honeypot field names
  const honeypotFields = ['website', 'url', 'homepage', 'email_confirm'];
  
  for (const field of honeypotFields) {
    if (formData.get(field)) {
      logSecurityEvent('HONEYPOT_TRIGGERED', undefined, { field });
      return false;
    }
  }
  
  return true;
}