import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const type = searchParams.get('type')
    
    if (!token || !type) {
      return NextResponse.redirect(new URL('/auth/error?message=Invalid verification link', request.url))
    }

    const supabase = createServerSupabaseClient()
    
    // For email verification, we need to handle it differently
    if (type === 'signup' || type === 'signin') {
      // This is a signup confirmation, redirect to success
      // The actual verification happens in the frontend when the user clicks the link
      return NextResponse.redirect(new URL('/auth/success?message=Email verification link received. Please check your email and click the verification link.', request.url))
    }
    
    // For other verification types, try to verify
    try {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: type as any
      })
      
      if (error) {
     
        return NextResponse.redirect(new URL(`/auth/error?message=${encodeURIComponent(error.message)}`, request.url))
      }
      
      // Update email_verified status in profiles table
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('profiles')
          .update({ email_verified: true })
          .eq('id', user.id)
      }
      
      // Redirect to success page
      return NextResponse.redirect(new URL('/auth/success?message=Email verified successfully', request.url))
      
    } catch (verificationError) {
      console.error('Verification attempt failed:', verificationError)
      // If verification fails, redirect to error page with helpful message
      return NextResponse.redirect(new URL('/auth/error?message=Verification failed. The link may have expired. Please try logging in again or request a new verification email.', request.url))
    }
    
  } catch (error) {
    console.error('Email verification callback error:', error)
    return NextResponse.redirect(new URL('/auth/error?message=Verification failed', request.url))
  }
}
