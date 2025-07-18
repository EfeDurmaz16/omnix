/**
 * Security utilities for code sandbox execution
 */

export const SANDBOX_ATTRIBUTES = [
  'allow-scripts',
  'allow-same-origin',
  'allow-modals',
  'allow-forms'
].join(' ');

export const CSP_HEADER = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdn.tailwindcss.com",
  "style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com",
  "img-src 'self' data: https:",
  "connect-src 'self' https:",
  "font-src 'self' https:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'"
].join('; ');

/**
 * Sanitize user code to prevent XSS and malicious scripts
 */
export const sanitizeCode = (code: string, language: string): string => {
  // Remove potentially dangerous patterns
  let sanitized = code;
  
  // Remove script injection attempts
  sanitized = sanitized.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '<!-- script removed -->');
  
  // Remove iframe injection attempts
  sanitized = sanitized.replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '<!-- iframe removed -->');
  
  // Remove form submissions to external URLs
  sanitized = sanitized.replace(/action\s*=\s*["']?(?!#|javascript:|$)[^"'\s>]*/gi, 'action="#"');
  
  // Remove dangerous event handlers
  const dangerousEvents = [
    'onload', 'onerror', 'onabort', 'onblur', 'onchange', 'onclick', 'ondblclick',
    'onfocus', 'onkeydown', 'onkeypress', 'onkeyup', 'onmousedown', 'onmousemove',
    'onmouseout', 'onmouseover', 'onmouseup', 'onreset', 'onresize', 'onselect',
    'onsubmit', 'onunload'
  ];
  
  dangerousEvents.forEach(event => {
    const regex = new RegExp(`${event}\\s*=\\s*["'][^"']*["']`, 'gi');
    sanitized = sanitized.replace(regex, '');
  });
  
  // For JavaScript, remove some dangerous APIs
  if (language === 'javascript' || language === 'js') {
    // Remove eval usage
    sanitized = sanitized.replace(/\beval\s*\(/gi, '// eval removed (');
    
    // Remove Function constructor
    sanitized = sanitized.replace(/new\s+Function\s*\(/gi, '// Function constructor removed (');
    
    // Remove setTimeout/setInterval with string arguments
    sanitized = sanitized.replace(/(setTimeout|setInterval)\s*\(\s*["'`]/gi, (match) => {
      return match.replace(/["'`]/, '() => { /* string argument removed */ }, "');
    });
  }
  
  return sanitized;
};

/**
 * Validate code size and complexity
 */
export const validateCode = (code: string): { isValid: boolean; error?: string } => {
  // Check code length
  if (code.length > 50000) {
    return { isValid: false, error: 'Code is too long (max 50KB)' };
  }
  
  // Check for excessive nesting
  const openBraces = (code.match(/\{/g) || []).length;
  const closeBraces = (code.match(/\}/g) || []).length;
  
  if (Math.abs(openBraces - closeBraces) > 10) {
    return { isValid: false, error: 'Code has unbalanced braces' };
  }
  
  // Check for potential infinite loops
  const loopPatterns = [
    /while\s*\(\s*true\s*\)/gi,
    /for\s*\(\s*;\s*;\s*\)/gi,
    /while\s*\(\s*1\s*\)/gi
  ];
  
  for (const pattern of loopPatterns) {
    if (pattern.test(code)) {
      return { isValid: false, error: 'Potential infinite loop detected' };
    }
  }
  
  return { isValid: true };
};

/**
 * Generate a secure sandbox HTML document
 */
export const generateSecureSandbox = (code: string, language: string): string => {
  const sanitizedCode = sanitizeCode(code, language);
  const validation = validateCode(sanitizedCode);
  
  if (!validation.isValid) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="${CSP_HEADER}">
      </head>
      <body style="font-family: Arial, sans-serif; padding: 20px; color: red;">
        <h2>Security Error</h2>
        <p>${validation.error}</p>
      </body>
      </html>
    `;
  }
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta http-equiv="Content-Security-Policy" content="${CSP_HEADER}">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 16px;
          line-height: 1.6;
        }
        .error {
          color: #dc2626;
          background: #fee2e2;
          padding: 12px;
          border-radius: 6px;
          margin: 10px 0;
          border: 1px solid #f87171;
        }
        .console-output {
          background: #f5f5f5;
          padding: 12px;
          border-radius: 6px;
          margin-top: 16px;
          font-family: 'Courier New', monospace;
          white-space: pre-wrap;
          border: 1px solid #d1d5db;
        }
      </style>
    </head>
    <body>
      ${sanitizedCode}
    </body>
    </html>
  `;
};

/**
 * Rate limiting for code execution
 */
export class ExecutionRateLimiter {
  private executions: Map<string, number[]> = new Map();
  private readonly maxExecutions = 10;
  private readonly windowMs = 60000; // 1 minute
  
  canExecute(identifier: string): boolean {
    const now = Date.now();
    const executions = this.executions.get(identifier) || [];
    
    // Remove old executions outside the window
    const recentExecutions = executions.filter(time => now - time < this.windowMs);
    
    if (recentExecutions.length >= this.maxExecutions) {
      return false;
    }
    
    // Add current execution
    recentExecutions.push(now);
    this.executions.set(identifier, recentExecutions);
    
    return true;
  }
  
  getRemainingExecutions(identifier: string): number {
    const now = Date.now();
    const executions = this.executions.get(identifier) || [];
    const recentExecutions = executions.filter(time => now - time < this.windowMs);
    
    return Math.max(0, this.maxExecutions - recentExecutions.length);
  }
}

// Global rate limiter instance
export const rateLimiter = new ExecutionRateLimiter();