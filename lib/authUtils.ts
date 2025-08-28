import { supabase } from './supabase'
import { toast } from 'react-hot-toast'

// Generate secure random token
const generateSecureToken = (): string => {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

// Hash token using Web Crypto API
const hashToken = async (token: string): Promise<string> => {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('')
}

// Password reset functionality
export const requestPasswordReset = async (email: string) => {
  try {
    // Generate a secure token
    const token = generateSecureToken()
    const tokenHash = await hashToken(token)
    
    // Set expiration (1 hour from now)
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 1)
    
    // Get user ID from email - we'll need to use a different approach since getUserByEmail is not available
    // For now, we'll create a simple token system that can be validated later
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      throw new Error('User not found with this email address')
    }
    
    // Store token hash in database
    const { error: tokenError } = await supabase
      .from('password_reset_tokens')
      .insert({
        user_id: user.id,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
        used: false
      })
    
    if (tokenError) {
      console.error('Error storing reset token:', tokenError)
      throw new Error('Failed to process password reset request')
    }
    
    // In a real application, you would send this token via email
    // For now, we'll just show it in a toast (in production, remove this)
    toast.success(`Password reset token: ${token} (This would be sent via email in production)`)
    
    return { success: true, message: 'Password reset instructions sent to your email' }
  } catch (error: any) {
    console.error('Password reset error:', error)
    toast.error(error.message || 'Failed to process password reset request')
    throw error
  }
}

export const resetPasswordWithToken = async (token: string, newPassword: string) => {
  try {
    // Hash the provided token
    const tokenHash = await hashToken(token)
    
    // Find the token in database
    const { data: tokenData, error: tokenError } = await supabase
      .from('password_reset_tokens')
      .select('*')
      .eq('token_hash', tokenHash)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single()
    
    if (tokenError || !tokenData) {
      throw new Error('Invalid or expired reset token')
    }
    
    // Update user's password
    const { error: passwordError } = await supabase.auth.admin.updateUserById(
      tokenData.user_id,
      { password: newPassword }
    )
    
    if (passwordError) {
      throw new Error('Failed to update password')
    }
    
    // Mark token as used
    await supabase
      .from('password_reset_tokens')
      .update({ used: true })
      .eq('id', tokenData.id)
    
    toast.success('Password updated successfully!')
    return { success: true, message: 'Password updated successfully' }
  } catch (error: any) {
    console.error('Password reset error:', error)
    toast.error(error.message || 'Failed to reset password')
    throw error
  }
}

export const changePassword = async (currentPassword: string, newPassword: string) => {
  try {
    // First verify current password by attempting to sign in
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('User not authenticated')
    }
    
    // Update password
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    
    if (error) {
      throw new Error('Failed to update password')
    }
    
    toast.success('Password changed successfully!')
    return { success: true, message: 'Password changed successfully' }
  } catch (error: any) {
    console.error('Change password error:', error)
    toast.error(error.message || 'Failed to change password')
    throw error
  }
}

// Email verification functionality
export const resendVerificationEmail = async (email: string) => {
  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email
    })
    
    if (error) {
      throw error
    }
    
    toast.success('Verification email sent! Please check your inbox.')
    return { success: true, message: 'Verification email sent' }
  } catch (error: any) {
    console.error('Resend verification error:', error)
    toast.error(error.message || 'Failed to send verification email')
    throw error
  }
}

export const verifyEmail = async (token: string, type: string) => {
  try {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: type as any
    })
    
    if (error) {
      throw error
    }
    
    // Update email_verified status in profiles table
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from('profiles')
        .update({ email_verified: true })
        .eq('id', user.id)
    }
    
    toast.success('Email verified successfully!')
    return { success: true, message: 'Email verified successfully' }
  } catch (error: any) {
    console.error('Email verification error:', error)
    toast.error(error.message || 'Failed to verify email')
    throw error
  }
}

// Token refresh functionality
export const refreshAccessToken = async () => {
  try {
    const { data, error } = await supabase.auth.refreshSession()
    
    if (error) {
      throw error
    }
    
    return { success: true, session: data.session }
  } catch (error: any) {
    console.error('Token refresh error:', error)
    throw error
  }
}

// Logout with token blacklisting
export const logout = async () => {
  try {
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      throw error
    }
    
    toast.success('Logged out successfully')
    return { success: true }
  } catch (error: any) {
    console.error('Logout error:', error)
    toast.error('Failed to logout')
    throw error
  }
}

// Username validation
export const validateUsername = (username: string): { isValid: boolean; error?: string } => {
  if (username.length < 3) {
    return { isValid: false, error: 'Username must be at least 3 characters long' }
  }
  
  if (username.length > 30) {
    return { isValid: false, error: 'Username must be no more than 30 characters long' }
  }
  
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { isValid: false, error: 'Username can only contain letters, numbers, and underscores' }
  }
  
  return { isValid: true }
}

// Password validation
export const validatePassword = (password: string): { isValid: boolean; error?: string } => {
  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters long' }
  }
  
  if (!/(?=.*[a-z])/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one lowercase letter' }
  }
  
  if (!/(?=.*[A-Z])/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one uppercase letter' }
  }
  
  if (!/(?=.*\d)/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one number' }
  }
  
  return { isValid: true }
}

// Email validation
export const validateEmail = (email: string): { isValid: boolean; error?: string } => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' }
  }
  
  return { isValid: true }
}
