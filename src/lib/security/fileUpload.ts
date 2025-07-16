import { NextRequest } from 'next/server';
import { createHash } from 'crypto';

/**
 * File upload security configurations
 */
export const fileUploadConfig = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 10,
  allowedTypes: [
    // Documents
    'application/pdf',
    'text/plain',
    'text/markdown',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    
    // Code files
    'text/javascript',
    'text/typescript',
    'text/html',
    'text/css',
    'application/json',
    'text/xml'
  ],
  
  allowedExtensions: [
    '.pdf', '.txt', '.md', '.doc', '.docx',
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
    '.js', '.ts', '.html', '.css', '.json', '.xml'
  ],
  
  blockedExtensions: [
    '.exe', '.bat', '.cmd', '.scr', '.pif', '.com',
    '.vbs', '.js', '.jar', '.zip', '.rar', '.7z',
    '.dll', '.sys', '.ini', '.reg', '.msi'
  ]
};

/**
 * Validate file upload security
 */
export function validateFileUpload(file: File): {
  valid: boolean;
  error?: string;
  warnings?: string[];
} {
  const warnings: string[] = [];
  
  // Check file size
  if (file.size > fileUploadConfig.maxFileSize) {
    return {
      valid: false,
      error: `File size exceeds ${fileUploadConfig.maxFileSize / (1024 * 1024)}MB limit`
    };
  }
  
  // Check file type
  if (!fileUploadConfig.allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed`
    };
  }
  
  // Check file extension
  const extension = getFileExtension(file.name);
  if (!fileUploadConfig.allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `File extension ${extension} is not allowed`
    };
  }
  
  // Check for blocked extensions
  if (fileUploadConfig.blockedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `File extension ${extension} is blocked for security reasons`
    };
  }
  
  // Check filename for suspicious patterns
  if (containsSuspiciousPatterns(file.name)) {
    return {
      valid: false,
      error: 'Filename contains suspicious patterns'
    };
  }
  
  // Additional checks
  if (file.size === 0) {
    return { valid: false, error: 'Empty files are not allowed' };
  }
  
  if (file.name.length > 255) {
    return { valid: false, error: 'Filename is too long' };
  }
  
  return { valid: true, warnings };
}

/**
 * Get file extension safely
 */
function getFileExtension(filename: string): string {
  const parts = filename.toLowerCase().split('.');
  return parts.length > 1 ? `.${parts[parts.length - 1]}` : '';
}

/**
 * Check for suspicious filename patterns
 */
function containsSuspiciousPatterns(filename: string): boolean {
  const suspiciousPatterns = [
    /\.\./,  // Directory traversal
    /[<>:"|?*]/,  // Invalid filename characters
    /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i,  // Windows reserved names
    /\.(php|asp|aspx|jsp|cgi|pl)$/i,  // Server-side scripts
    /\0/,  // Null bytes
    /^\./,  // Hidden files
    /\s$/,  // Trailing whitespace
    /\.(bat|cmd|exe|scr|pif|com|vbs|jar)$/i  // Executable files
  ];
  
  return suspiciousPatterns.some(pattern => pattern.test(filename));
}

/**
 * Generate secure filename
 */
export function generateSecureFilename(originalName: string, userId?: string): string {
  const extension = getFileExtension(originalName);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const userPrefix = userId ? createHash('sha256').update(userId).digest('hex').substring(0, 8) : 'guest';
  
  return `${userPrefix}_${timestamp}_${random}${extension}`;
}

/**
 * Scan file content for malicious patterns
 */
export async function scanFileContent(file: File): Promise<{
  safe: boolean;
  threats?: string[];
}> {
  try {
    const content = await file.text();
    const threats: string[] = [];
    
    // Check for script injection patterns
    const scriptPatterns = [
      /<script[^>]*>[\s\S]*?<\/script>/gi,
      /javascript:/gi,
      /data:text\/html/gi,
      /vbscript:/gi,
      /onload\s*=/gi,
      /onerror\s*=/gi,
      /onclick\s*=/gi
    ];
    
    scriptPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        threats.push('Script injection detected');
      }
    });
    
    // Check for SQL injection patterns
    const sqlPatterns = [
      /(union|select|insert|update|delete|drop|create|alter)\s+/gi,
      /'\s*(or|and)\s*'?1'?\s*='?1/gi,
      /;\s*(drop|delete|truncate)/gi
    ];
    
    sqlPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        threats.push('SQL injection pattern detected');
      }
    });
    
    // Check for suspicious URLs
    const urlPatterns = [
      /https?:\/\/[^\s]+\.(tk|ml|ga|cf|gq)/gi,  // Suspicious TLDs
      /bit\.ly|tinyurl|t\.co|shortened/gi,  // URL shorteners
      /eval\s*\(/gi,  // Code evaluation
      /document\.write/gi,  // Dynamic content injection
    ];
    
    urlPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        threats.push('Suspicious URL or code pattern detected');
      }
    });
    
    return {
      safe: threats.length === 0,
      threats: threats.length > 0 ? threats : undefined
    };
    
  } catch (error) {
    // If we can't read the file as text, assume it's binary and allow it
    return { safe: true };
  }
}

/**
 * Validate file upload request
 */
export async function validateFileUploadRequest(
  request: NextRequest,
  userId?: string
): Promise<{
  valid: boolean;
  error?: string;
  files?: File[];
}> {
  try {
    const formData = await request.formData();
    const files: File[] = [];
    
    // Collect all files
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        files.push(value);
      }
    }
    
    // Check file count
    if (files.length > fileUploadConfig.maxFiles) {
      return {
        valid: false,
        error: `Too many files. Maximum ${fileUploadConfig.maxFiles} allowed.`
      };
    }
    
    if (files.length === 0) {
      return { valid: false, error: 'No files provided' };
    }
    
    // Validate each file
    for (const file of files) {
      const validation = validateFileUpload(file);
      if (!validation.valid) {
        return { valid: false, error: validation.error };
      }
      
      // Scan file content
      const scanResult = await scanFileContent(file);
      if (!scanResult.safe) {
        return {
          valid: false,
          error: `File ${file.name} contains potentially malicious content: ${scanResult.threats?.join(', ')}`
        };
      }
    }
    
    return { valid: true, files };
    
  } catch (error) {
    return { valid: false, error: 'Invalid file upload request' };
  }
}