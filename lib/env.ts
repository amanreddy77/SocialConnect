/**
 * Environment Variable Validation
 * Centralized validation for all environment variables
 */

interface EnvironmentVariables {
  // Supabase Configuration
  NEXT_PUBLIC_SUPABASE_URL: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string
  SUPABASE_SERVICE_ROLE_KEY: string
  
  // App Configuration
  NEXT_PUBLIC_APP_URL: string
  NEXT_PUBLIC_DEBUG_MODE: string
  
  // Email Service Configuration (Optional)
  EMAIL_PROVIDER?: string
  EMAIL_USER?: string
  EMAIL_PASSWORD?: string
  SENDGRID_API_KEY?: string
  SMTP_HOST?: string
  SMTP_PORT?: string
  SMTP_SECURE?: string
  SMTP_USER?: string
  SMTP_PASS?: string
  EMAIL_FROM_NAME?: string
}

/**
 * Validates environment variables and returns validated config
 * Throws error if required variables are missing
 */
export function validateEnv(): EnvironmentVariables {
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_APP_URL'
  ]

  const missingVars = requiredVars.filter(varName => !process.env[varName])
  
  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}\n` +
      'Please check your .env.local file and ensure all required variables are set.'
    )
  }

  // Validate Supabase URL format
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  if (!supabaseUrl.includes('supabase.co')) {
    throw new Error('Invalid Supabase URL format. Expected: https://project-id.supabase.co')
  }

  // Validate Supabase keys format
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  if (!anonKey.startsWith('eyJ')) {
    throw new Error('Invalid Supabase anon key format')
  }
  
  if (!serviceKey.startsWith('eyJ')) {
    throw new Error('Invalid Supabase service role key format')
  }

  return {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
    SUPABASE_SERVICE_ROLE_KEY: serviceKey,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL!,
    NEXT_PUBLIC_DEBUG_MODE: process.env.NEXT_PUBLIC_DEBUG_MODE || 'false',
    EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
    EMAIL_USER: process.env.EMAIL_USER,
    EMAIL_PASSWORD: process.env.EMAIL_PASSWORD,
    SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_SECURE: process.env.SMTP_SECURE,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME
  }
}

/**
 * Get validated environment variables
 * Use this instead of process.env directly
 */
export const env = validateEnv()

/**
 * Check if email service is configured
 */
export function isEmailServiceConfigured(): boolean {
  const { EMAIL_PROVIDER, EMAIL_USER, EMAIL_PASSWORD, SENDGRID_API_KEY } = env
  
  if (EMAIL_PROVIDER === 'gmail') {
    return !!(EMAIL_USER && EMAIL_PASSWORD)
  }
  
  if (EMAIL_PROVIDER === 'sendgrid') {
    return !!SENDGRID_API_KEY
  }
  
  if (EMAIL_PROVIDER === 'custom') {
    return !!(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS)
  }
  
  return false
}

/**
 * Get email service configuration
 */
export function getEmailConfig() {
  if (!isEmailServiceConfigured()) {
    return null
  }
  
  return {
    provider: env.EMAIL_PROVIDER,
    user: env.EMAIL_USER,
    password: env.EMAIL_PASSWORD,
    sendgridKey: env.SENDGRID_API_KEY,
    smtp: {
      host: env.SMTP_HOST,
      port: env.SMTP_PORT ? parseInt(env.SMTP_PORT) : 587,
      secure: env.SMTP_SECURE === 'true',
      user: env.SMTP_USER,
      pass: env.SMTP_PASS
    },
    fromName: env.EMAIL_FROM_NAME || 'SocialConnect'
  }
}
