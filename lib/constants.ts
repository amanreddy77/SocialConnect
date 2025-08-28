/**
 * Application Constants
 * Centralized constants for consistent naming and values
 */

// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    PASSWORD_RESET: '/api/auth/password-reset',
    PASSWORD_RESET_CONFIRM: '/api/auth/password-reset-confirm',
    REFRESH_TOKEN: '/api/auth/refresh',
    LOGOUT: '/api/auth/logout'
  },
  USERS: {
    PROFILE: '/api/users/profile',
    UPDATE_PROFILE: '/api/users/profile/update'
  },
  POSTS: {
    CREATE: '/api/posts/create',
    UPDATE: '/api/posts/update',
    DELETE: '/api/posts/delete'
  }
} as const

// Database Table Names
export const DATABASE_TABLES = {
  PROFILES: 'profiles',
  POSTS: 'posts',
  COMMENTS: 'comments',
  LIKES: 'likes',
  FOLLOWS: 'follows',
  NOTIFICATIONS: 'notifications',
  PASSWORD_RESET_TOKENS: 'password_reset_tokens'
} as const

// User Roles
export const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  MODERATOR: 'moderator'
} as const

// Privacy Levels
export const PRIVACY_LEVELS = {
  PUBLIC: 'public',
  PRIVATE: 'private',
  FOLLOWERS_ONLY: 'followers_only'
} as const

// Post Categories
export const POST_CATEGORIES = {
  GENERAL: 'general',
  ANNOUNCEMENT: 'announcement',
  QUESTION: 'question'
} as const

// Notification Types
export const NOTIFICATION_TYPES = {
  FOLLOW: 'follow',
  LIKE: 'like',
  COMMENT: 'comment',
  MENTION: 'mention'
} as const

// Validation Limits
export const VALIDATION_LIMITS = {
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 30,
    PATTERN: /^[a-zA-Z0-9_]{3,30}$/
  },
  BIO: {
    MAX_LENGTH: 160
  },
  POST_CONTENT: {
    MAX_LENGTH: 280
  },
  COMMENT_CONTENT: {
    MAX_LENGTH: 200
  },
  EMAIL: {
    MAX_LENGTH: 255
  },
  FIRST_NAME: {
    MAX_LENGTH: 50
  },
  LAST_NAME: {
    MAX_LENGTH: 50
  },
  FULL_NAME: {
    MAX_LENGTH: 100
  },
  LOCATION: {
    MAX_LENGTH: 100
  },
  WEBSITE: {
    MAX_LENGTH: 255
  }
} as const

// Time Constants
export const TIME_CONSTANTS = {
  AUTH_TIMEOUT: 30000, // 30 seconds
  TOKEN_EXPIRY: 3600, // 1 hour
  PASSWORD_RESET_EXPIRY: 3600, // 1 hour
  EMAIL_VERIFICATION_EXPIRY: 86400 // 24 hours
} as const

// UI Constants
export const UI_CONSTANTS = {
  TOAST_DURATION: 4000,
  LOADING_DELAY: 1000,
  DEBOUNCE_DELAY: 300,
  INFINITE_SCROLL_THRESHOLD: 100
} as const

// Error Messages
export const ERROR_MESSAGES = {
  AUTH: {
    INVALID_CREDENTIALS: 'Invalid email or password',
    USER_NOT_FOUND: 'User not found',
    EMAIL_NOT_VERIFIED: 'Please verify your email address',
    ACCOUNT_DISABLED: 'Account has been disabled',
    SESSION_EXPIRED: 'Session expired. Please log in again',
    PERMISSION_DENIED: 'You do not have permission to perform this action'
  },
  VALIDATION: {
    REQUIRED_FIELD: 'This field is required',
    INVALID_EMAIL: 'Please enter a valid email address',
    INVALID_USERNAME: 'Username must be 3-30 characters and contain only letters, numbers, and underscores',
    PASSWORD_TOO_SHORT: 'Password must be at least 8 characters long',
    PASSWORD_MISMATCH: 'Passwords do not match',
    CONTENT_TOO_LONG: 'Content exceeds maximum length'
  },
  NETWORK: {
    CONNECTION_ERROR: 'Connection error. Please check your internet connection',
    TIMEOUT: 'Request timed out. Please try again',
    SERVER_ERROR: 'Server error. Please try again later',
    UNAUTHORIZED: 'You are not authorized to perform this action'
  }
} as const

// Success Messages
export const SUCCESS_MESSAGES = {
  AUTH: {
    LOGIN_SUCCESS: 'Successfully logged in',
    REGISTRATION_SUCCESS: 'Account created successfully',
    PASSWORD_RESET_SENT: 'Password reset email sent',
    PASSWORD_RESET_SUCCESS: 'Password reset successfully',
    LOGOUT_SUCCESS: 'Successfully logged out',
    PROFILE_UPDATED: 'Profile updated successfully'
  },
  POSTS: {
    CREATED: 'Post created successfully',
    UPDATED: 'Post updated successfully',
    DELETED: 'Post deleted successfully'
  },
  USERS: {
    FOLLOWED: 'User followed successfully',
    UNFOLLOWED: 'User unfollowed successfully',
    DEACTIVATED: 'User deactivated successfully',
    REACTIVATED: 'User reactivated successfully',
    DELETED: 'User deleted successfully'
  }
} as const

// Route Names
export const ROUTES = {
  HOME: '/',
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    RESET_PASSWORD: '/auth/reset-password',
    VERIFY_EMAIL: '/auth/verify-email'
  },
  APP: {
    FEED: '/feed',
    PROFILE: '/profile',
    SEARCH: '/search',
    NOTIFICATIONS: '/notifications',
    ADMIN: '/admin'
  }
} as const
