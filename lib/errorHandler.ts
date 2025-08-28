/**
 * Centralized Error Handling
 * Provides consistent error handling across the application
 */

import { ERROR_MESSAGES } from './constants'

// Error types for better type safety
export type AppErrorType = 
  | 'AUTHENTICATION_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'VALIDATION_ERROR'
  | 'NETWORK_ERROR'
  | 'DATABASE_ERROR'
  | 'UNKNOWN_ERROR'

export interface AppError {
  type: AppErrorType
  message: string
  code?: string
  details?: any
  originalError?: Error
}

/**
 * Create a standardized application error
 */
export function createAppError(
  type: AppErrorType,
  message: string,
  details?: any,
  originalError?: Error
): AppError {
  return {
    type,
    message,
    details,
    originalError
  }
}

/**
 * Handle Supabase errors and convert them to AppError
 */
export function handleSupabaseError(error: any): AppError {
  if (!error) {
    return createAppError('UNKNOWN_ERROR', 'An unknown error occurred')
  }

  // Handle authentication errors
  if (error.message?.includes('Invalid login credentials')) {
    return createAppError('AUTHENTICATION_ERROR', ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS)
  }

  if (error.message?.includes('Email not confirmed')) {
    return createAppError('AUTHENTICATION_ERROR', ERROR_MESSAGES.AUTH.EMAIL_NOT_VERIFIED)
  }

  if (error.message?.includes('User not found')) {
    return createAppError('AUTHENTICATION_ERROR', ERROR_MESSAGES.AUTH.USER_NOT_FOUND)
  }

  // Handle authorization errors
  if (error.message?.includes('permission denied') || error.message?.includes('not authorized')) {
    return createAppError('AUTHORIZATION_ERROR', ERROR_MESSAGES.AUTH.PERMISSION_DENIED)
  }

  // Handle validation errors
  if (error.message?.includes('violates not-null constraint')) {
    return createAppError('VALIDATION_ERROR', ERROR_MESSAGES.VALIDATION.REQUIRED_FIELD)
  }

  if (error.message?.includes('violates check constraint')) {
    return createAppError('VALIDATION_ERROR', ERROR_MESSAGES.VALIDATION.CONTENT_TOO_LONG)
  }

  // Handle network errors
  if (error.message?.includes('fetch')) {
    return createAppError('NETWORK_ERROR', ERROR_MESSAGES.NETWORK.CONNECTION_ERROR)
  }

  if (error.message?.includes('timeout')) {
    return createAppError('NETWORK_ERROR', ERROR_MESSAGES.NETWORK.TIMEOUT)
  }

  // Handle database errors
  if (error.message?.includes('relation') || error.message?.includes('column')) {
    return createAppError('DATABASE_ERROR', 'Database schema error. Please contact support.')
  }

  // Handle foreign key constraint errors
  if (error.message?.includes('foreign key')) {
    return createAppError('DATABASE_ERROR', 'Cannot perform action due to data relationships.')
  }

  // Default case
  return createAppError('UNKNOWN_ERROR', error.message || 'An unexpected error occurred', error)
}

/**
 * Log error for debugging (only in development)
 */
export function logError(error: AppError): void {
  if (process.env.NODE_ENV === 'development') {
    console.group('🚨 Application Error')
    console.error('Type:', error.type)
    console.error('Message:', error.message)
    console.error('Details:', error.details)
    if (error.originalError) {
      console.error('Original Error:', error.originalError)
    }
    console.groupEnd()
  }
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error: AppError): string {
  // Return the error message if it's already user-friendly
  if (error.message && !error.message.includes('Error:') && !error.message.includes('at ')) {
    return error.message
  }

  // Map error types to user-friendly messages
  switch (error.type) {
    case 'AUTHENTICATION_ERROR':
      return ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS
    case 'AUTHORIZATION_ERROR':
      return ERROR_MESSAGES.AUTH.PERMISSION_DENIED
    case 'VALIDATION_ERROR':
      return ERROR_MESSAGES.VALIDATION.REQUIRED_FIELD
    case 'NETWORK_ERROR':
      return ERROR_MESSAGES.NETWORK.CONNECTION_ERROR
    case 'DATABASE_ERROR':
      return 'A system error occurred. Please try again later.'
    case 'UNKNOWN_ERROR':
    default:
      return 'Something went wrong. Please try again.'
  }
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: AppError): boolean {
  return error.type === 'NETWORK_ERROR' || error.type === 'DATABASE_ERROR'
}

/**
 * Get retry delay for retryable errors
 */
export function getRetryDelay(attempt: number): number {
  // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
  const baseDelay = 1000
  const maxDelay = 30000
  const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay)
  
  // Add some jitter to prevent thundering herd
  const jitter = Math.random() * 1000
  return delay + jitter
}
