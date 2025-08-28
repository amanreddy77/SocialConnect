/**
 * Security Configuration
 * Centralized security settings and utilities
 */

import { env } from './env'

// Security headers configuration
export const SECURITY_HEADERS = {
  // Prevent XSS attacks
  'X-XSS-Protection': '1; mode=block',
  
  // Prevent clickjacking
  'X-Frame-Options': 'DENY',
  
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  
  // Referrer policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Content Security Policy
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' https://*.supabase.co",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; '),
  
  // Permissions Policy
  'Permissions-Policy': [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'payment=()'
  ].join(', ')
} as const

// Rate limiting configuration
export const RATE_LIMIT_CONFIG = {
  // Authentication endpoints
  AUTH: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 5, // 5 requests per window
    MESSAGE: 'Too many authentication attempts. Please try again later.'
  },
  
  // API endpoints
  API: {
    WINDOW_MS: 60 * 1000, // 1 minute
    MAX_REQUESTS: 100, // 100 requests per minute
    MESSAGE: 'Too many requests. Please slow down.'
  },
  
  // File uploads
  UPLOAD: {
    WINDOW_MS: 60 * 1000, // 1 minute
    MAX_REQUESTS: 10, // 10 uploads per minute
    MESSAGE: 'Too many file uploads. Please wait before uploading more.'
  }
} as const

// Password requirements
export const PASSWORD_REQUIREMENTS = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 128,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBERS: true,
  REQUIRE_SPECIAL_CHARS: true,
  SPECIAL_CHARS: '!@#$%^&*()_+-=[]{}|;:,.<>?'
} as const

// Session configuration
export const SESSION_CONFIG = {
  MAX_AGE: 30 * 24 * 60 * 60 * 1000, // 30 days
  REFRESH_THRESHOLD: 5 * 60 * 1000, // 5 minutes before expiry
  MAX_REFRESH_ATTEMPTS: 3,
  REFRESH_COOLDOWN: 60 * 1000 // 1 minute cooldown
} as const

// File upload security
export const FILE_UPLOAD_SECURITY = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_MIME_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ],
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  SCAN_FOR_VIRUSES: false, // Set to true in production with antivirus service
  STORAGE_BUCKET: 'user-uploads'
} as const

// Input validation patterns
export const VALIDATION_PATTERNS = {
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  USERNAME: /^[a-zA-Z0-9_]{3,30}$/,
  PASSWORD: new RegExp(
    `^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[${PASSWORD_REQUIREMENTS.SPECIAL_CHARS.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}])[A-Za-z\\d${PASSWORD_REQUIREMENTS.SPECIAL_CHARS.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]{${PASSWORD_REQUIREMENTS.MIN_LENGTH},${PASSWORD_REQUIREMENTS.MAX_LENGTH}}$`
  ),
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/
} as const

/**
 * Validate password strength
 */
export function validatePassword(password: string): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  if (password.length < PASSWORD_REQUIREMENTS.MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD_REQUIREMENTS.MIN_LENGTH} characters long`)
  }
  
  if (password.length > PASSWORD_REQUIREMENTS.MAX_LENGTH) {
    errors.push(`Password must be no more than ${PASSWORD_REQUIREMENTS.MAX_LENGTH} characters long`)
  }
  
  if (PASSWORD_REQUIREMENTS.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  
  if (PASSWORD_REQUIREMENTS.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  
  if (PASSWORD_REQUIREMENTS.REQUIRE_NUMBERS && !/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  
  if (PASSWORD_REQUIREMENTS.REQUIRE_SPECIAL_CHARS && 
      !new RegExp(`[${PASSWORD_REQUIREMENTS.SPECIAL_CHARS.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`).test(password)) {
    errors.push('Password must contain at least one special character')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Validate file upload
 */
export function validateFileUpload(file: File): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  // Check file size
  if (file.size > FILE_UPLOAD_SECURITY.MAX_FILE_SIZE) {
    errors.push(`File size must be less than ${FILE_UPLOAD_SECURITY.MAX_FILE_SIZE / (1024 * 1024)}MB`)
  }
  
  // Check MIME type
  if (!FILE_UPLOAD_SECURITY.ALLOWED_MIME_TYPES.includes(file.type as any)) {
    errors.push('File type not allowed')
  }
  
  // Check file extension
  const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
  if (!FILE_UPLOAD_SECURITY.ALLOWED_EXTENSIONS.includes(extension as any)) {
    errors.push('File extension not allowed')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Generate secure random token
 */
export function generateSecureToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  
  return result
}

/**
 * Check if environment is production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

/**
 * Check if environment is development
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development'
}
