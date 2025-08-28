import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { sendPasswordResetEmail } from '@/lib/emailService'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()
    
    // Generate a secure token
    const token = crypto.randomUUID()
    const tokenHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
    const tokenHashHex = Array.from(new Uint8Array(tokenHash))
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('')
    
    // Set expiration (1 hour from now)
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 1)
    
    try {
      // Check if user exists by looking up in profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name')
        .eq('email', email)
        .single()
      
      if (profileError || !profile) {
        // Don't reveal if user exists or not for security
        return NextResponse.json({
          message: 'If an account with this email exists, password reset instructions have been sent.'
        })
      }
      
      // Store token hash in database
      const { error: tokenError } = await supabase
        .from('password_reset_tokens')
        .insert({
          user_id: profile.id,
          token_hash: tokenHashHex,
          expires_at: expiresAt.toISOString(),
          used: false
        })
      
      if (tokenError) {
        console.error('Error storing reset token:', tokenError)
        return NextResponse.json(
          { error: 'Failed to process password reset request. Please try again.' },
          { status: 500 }
        )
      }
      
      // Send password reset email
      try {
        const userName = profile.first_name && profile.last_name 
          ? `${profile.first_name} ${profile.last_name}`
          : profile.email
        
        await sendPasswordResetEmail(email, token, userName)
        
        return NextResponse.json({
          message: 'Password reset instructions sent to your email. Please check your inbox.'
        })
      } catch (emailError) {
        console.error('Email sending error:', emailError)
        
        // If email fails, still return success to user but log the error
        // In production, you might want to handle this differently
        return NextResponse.json({
          message: 'Password reset instructions sent to your email. Please check your inbox.'
        })
      }
      
    } catch (dbError) {
      console.error('Database error:', dbError)
      // Don't reveal if user exists or not for security
      return NextResponse.json({
        message: 'If an account with this email exists, password reset instructions have been sent.'
      })
    }
    
  } catch (error) {
    console.error('Password reset error:', error)
    return NextResponse.json(
      { error: 'Internal server error. Please try again.' },
      { status: 500 }
    )
  }
}
