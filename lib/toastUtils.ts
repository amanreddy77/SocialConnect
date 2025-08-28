import { toast } from 'react-hot-toast'

// Toast message constants to prevent duplicates
export const TOAST_MESSAGES = {
  // Authentication
  LOGIN_SUCCESS: 'Logged in successfully! Redirecting...',
  REGISTER_SUCCESS: 'Account created successfully! Please check your email for verification.',
  LOGOUT_SUCCESS: 'Signed out successfully',
  PASSWORD_RESET_SUCCESS: 'Password reset email sent! Check your inbox.',
  PASSWORD_CHANGE_SUCCESS: 'Password changed successfully!',
  EMAIL_VERIFY_SUCCESS: 'Email verified successfully!',
  
  // Posts
  POST_CREATE_SUCCESS: 'Post created successfully!',
  POST_DELETE_SUCCESS: 'Post deleted successfully!',
  POST_LIKE_SUCCESS: 'Post liked!',
  POST_UNLIKE_SUCCESS: 'Post unliked',
  
  // Follows
  FOLLOW_SUCCESS: 'Followed successfully',
  UNFOLLOW_SUCCESS: 'Unfollowed successfully',
  
  // Comments
  COMMENT_ADD_SUCCESS: 'Comment added successfully!',
  
  // Profile
  PROFILE_UPDATE_SUCCESS: 'Profile updated successfully!',
  
  // Admin
  USER_DEACTIVATE_SUCCESS: 'User deactivated successfully',
  USER_REACTIVATE_SUCCESS: 'User reactivated successfully',
  POST_DELETE_ADMIN_SUCCESS: 'Post deleted successfully',
  
  // Notifications
  NOTIFICATION_MARK_READ: 'All notifications marked as read',
  NOTIFICATION_DELETE: 'Notification deleted',
  
  // Errors
  GENERIC_ERROR: 'An error occurred. Please try again.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  PERMISSION_ERROR: 'Permission denied. Please check your access.',
  VALIDATION_ERROR: 'Please check your input and try again.',
} as const

// Toast duration constants
export const TOAST_DURATION = {
  SHORT: 3000,
  MEDIUM: 5000,
  LONG: 8000,
} as const

// Toast types
export type ToastType = 'success' | 'error' | 'loading'

// Centralized toast functions with duplicate prevention
class ToastManager {
  private activeToasts = new Set<string>()
  private toastQueue: Array<{ id: string; message: string; type: ToastType; duration?: number }> = []
  private isProcessing = false

  private generateToastId(message: string, type: ToastType): string {
    return `${type}-${message.slice(0, 50)}`
  }

  private async processQueue() {
    if (this.isProcessing || this.toastQueue.length === 0) return
    
    this.isProcessing = true
    
    while (this.toastQueue.length > 0) {
      const toastItem = this.toastQueue.shift()!
      
      if (!this.activeToasts.has(toastItem.id)) {
        this.activeToasts.add(toastItem.id)
        
        const toastId = toast[toastItem.type](toastItem.message, {
          duration: toastItem.duration || TOAST_DURATION.MEDIUM,
        })
        
        // Remove from active toasts when toast is dismissed
        setTimeout(() => {
          this.activeToasts.delete(toastItem.id)
        }, toastItem.duration || TOAST_DURATION.MEDIUM)
        
        // Wait a bit before processing next toast to prevent spam
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    this.isProcessing = false
  }

  private addToQueue(message: string, type: ToastType, duration?: number) {
    const id = this.generateToastId(message, type)
    
    // If toast is already active, don't add to queue
    if (this.activeToasts.has(id)) {
      return
    }
    
    this.toastQueue.push({ id, message, type, duration })
    this.processQueue()
  }

  // Public methods
  success(message: string, duration?: number) {
    this.addToQueue(message, 'success', duration)
  }

  error(message: string, duration?: number) {
    this.addToQueue(message, 'error', duration)
  }

  loading(message: string, duration?: number) {
    this.addToQueue(message, 'loading', duration)
  }



  // Convenience methods for common messages
  loginSuccess() {
    this.success(TOAST_MESSAGES.LOGIN_SUCCESS, TOAST_DURATION.SHORT)
  }

  registerSuccess() {
    this.success(TOAST_MESSAGES.REGISTER_SUCCESS, TOAST_DURATION.MEDIUM)
  }

  logoutSuccess() {
    this.success(TOAST_MESSAGES.LOGOUT_SUCCESS, TOAST_DURATION.SHORT)
  }

  postCreateSuccess() {
    this.success(TOAST_MESSAGES.POST_CREATE_SUCCESS, TOAST_DURATION.SHORT)
  }

  postDeleteSuccess() {
    this.success(TOAST_MESSAGES.POST_DELETE_SUCCESS, TOAST_DURATION.SHORT)
  }

  followSuccess() {
    this.success(TOAST_MESSAGES.FOLLOW_SUCCESS, TOAST_DURATION.SHORT)
  }

  unfollowSuccess() {
    this.success(TOAST_MESSAGES.UNFOLLOW_SUCCESS, TOAST_DURATION.SHORT)
  }

  genericError(message?: string) {
    this.error(message || TOAST_MESSAGES.GENERIC_ERROR, TOAST_DURATION.MEDIUM)
  }

  networkError() {
    this.error(TOAST_MESSAGES.NETWORK_ERROR, TOAST_DURATION.MEDIUM)
  }

  permissionError() {
    this.error(TOAST_MESSAGES.PERMISSION_ERROR, TOAST_DURATION.MEDIUM)
  }

  validationError(message?: string) {
    this.error(message || TOAST_MESSAGES.VALIDATION_ERROR, TOAST_DURATION.MEDIUM)
  }
}

// Export singleton instance
export const toastManager = new ToastManager()

// Export convenience functions
export const showToast = {
  success: (message: string, duration?: number) => toastManager.success(message, duration),
  error: (message: string, duration?: number) => toastManager.error(message, duration),
  loading: (message: string, duration?: number) => toastManager.loading(message, duration),
}

// Export convenience methods for common actions
export const showToastFor = {
  login: () => toastManager.loginSuccess(),
  register: () => toastManager.registerSuccess(),
  logout: () => toastManager.logoutSuccess(),
  postCreate: () => toastManager.postCreateSuccess(),
  postDelete: () => toastManager.postDeleteSuccess(),
  follow: () => toastManager.followSuccess(),
  unfollow: () => toastManager.unfollowSuccess(),
  genericError: (message?: string) => toastManager.genericError(message),
  networkError: () => toastManager.networkError(),
  permissionError: () => toastManager.permissionError(),
  validationError: (message?: string) => toastManager.validationError(message),
}
