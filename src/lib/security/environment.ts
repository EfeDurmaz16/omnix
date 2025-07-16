/**
 * Environment security validations and configurations
 */

/**
 * Validate required environment variables
 */
export function validateEnvironmentVariables(): {
  valid: boolean;
  missing: string[];
  warnings: string[];
} {
  const required = [
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY',
    'DATABASE_URL',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET'
  ];
  
  const recommended = [
    'NEXTAUTH_SECRET',
    'ENCRYPTION_KEY',
    'SENTRY_DSN',
    'RATE_LIMIT_REDIS_URL'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  const warnings = recommended.filter(key => !process.env[key]);
  
  return {
    valid: missing.length === 0,
    missing,
    warnings
  };
}

/**
 * Check for insecure environment configurations
 */
export function checkEnvironmentSecurity(): {
  secure: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
  // Check for development settings in production
  if (process.env.NODE_ENV === 'production') {
    if (process.env.NEXT_PUBLIC_APP_URL?.includes('localhost')) {
      issues.push('APP_URL should not contain localhost in production');
    }
    
    if (process.env.DATABASE_URL?.includes('localhost')) {
      issues.push('DATABASE_URL should not contain localhost in production');
    }
    
    if (!process.env.NEXTAUTH_SECRET) {
      issues.push('NEXTAUTH_SECRET is required in production');
    }
    
    if (!process.env.ENCRYPTION_KEY) {
      issues.push('ENCRYPTION_KEY is recommended for production');
    }
  }
  
  // Check for weak secrets
  if (process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.length < 32) {
    issues.push('NEXTAUTH_SECRET should be at least 32 characters long');
  }
  
  // Check for exposed API keys in client-side code
  const clientExposedKeys = Object.keys(process.env).filter(key => 
    key.startsWith('NEXT_PUBLIC_') && 
    (key.includes('SECRET') || key.includes('PRIVATE'))
  );
  
  if (clientExposedKeys.length > 0) {
    issues.push(`Secret keys exposed to client: ${clientExposedKeys.join(', ')}`);
  }
  
  return {
    secure: issues.length === 0,
    issues
  };
}

/**
 * Sanitize environment variables for logging
 */
export function sanitizeEnvForLogging(env: Record<string, string | undefined>): Record<string, string> {
  const sanitized: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(env)) {
    if (!value) continue;
    
    // Completely hide sensitive keys
    if (key.includes('SECRET') || key.includes('PRIVATE') || key.includes('KEY')) {
      sanitized[key] = '[REDACTED]';
    }
    // Show only first/last chars for URLs with credentials
    else if (key.includes('URL') && value.includes('://')) {
      try {
        const url = new URL(value);
        if (url.password) {
          sanitized[key] = value.replace(url.password, '[REDACTED]');
        } else {
          sanitized[key] = value;
        }
      } catch {
        sanitized[key] = '[INVALID_URL]';
      }
    }
    // Show full value for public keys
    else if (key.startsWith('NEXT_PUBLIC_') && !key.includes('SECRET')) {
      sanitized[key] = value;
    }
    // Truncate long values
    else if (value.length > 50) {
      sanitized[key] = value.substring(0, 10) + '[...]' + value.substring(value.length - 10);
    }
    else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Runtime environment security check
 */
export function performSecurityCheck(): {
  passed: boolean;
  criticalIssues: string[];
  warnings: string[];
} {
  const criticalIssues: string[] = [];
  const warnings: string[] = [];
  
  // Check environment variables
  const envValidation = validateEnvironmentVariables();
  if (!envValidation.valid) {
    criticalIssues.push(`Missing required environment variables: ${envValidation.missing.join(', ')}`);
  }
  warnings.push(...envValidation.warnings.map(w => `Missing recommended env var: ${w}`));
  
  // Check environment security
  const envSecurity = checkEnvironmentSecurity();
  if (!envSecurity.secure) {
    criticalIssues.push(...envSecurity.issues);
  }
  
  // Check Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
  if (majorVersion < 18) {
    warnings.push(`Node.js version ${nodeVersion} is outdated. Consider upgrading to v18+`);
  }
  
  // Check for debug mode in production
  if (process.env.NODE_ENV === 'production') {
    if (process.env.DEBUG) {
      warnings.push('DEBUG mode should be disabled in production');
    }
    
    if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
      warnings.push('Public debug mode should be disabled in production');
    }
  }
  
  return {
    passed: criticalIssues.length === 0,
    criticalIssues,
    warnings
  };
}

/**
 * Security headers configuration
 */
export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Needed for Next.js
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https:",
    "frame-ancestors 'none'"
  ].join('; ')
};

/**
 * Initialize security checks on startup
 */
export function initializeSecurityChecks(): void {
  const securityCheck = performSecurityCheck();
  
  if (!securityCheck.passed) {
    console.error('🔒 SECURITY CRITICAL ISSUES DETECTED:');
    securityCheck.criticalIssues.forEach(issue => {
      console.error(`  ❌ ${issue}`);
    });
    
    if (process.env.NODE_ENV === 'production') {
      console.error('🔒 Application will not start due to security issues');
      process.exit(1);
    }
  }
  
  if (securityCheck.warnings.length > 0) {
    console.warn('🔒 Security warnings:');
    securityCheck.warnings.forEach(warning => {
      console.warn(`  ⚠️  ${warning}`);
    });
  }
  
  if (securityCheck.passed && securityCheck.warnings.length === 0) {
    console.log('🔒 Security check passed ✅');
  }
}