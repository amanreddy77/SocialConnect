import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { token, new_password } = await request.json()
    
    if (!token || !new_password) {
      return NextResponse.json(
        { error: 'Token and new password are required' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()
    
    // Hash the provided token
    const tokenHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
    const tokenHashHex = Array.from(new Uint8Array(tokenHash))
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('')
    
    // Find the token in database
    const { data: tokenData, error: tokenError } = await supabase
      .from('password_reset_tokens')
      .select('*')
      .eq('token_hash', tokenHashHex)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single()
    
    if (tokenError || !tokenData) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      )
    }
    
    // Update user's password
    const { error: passwordError } = await supabase.auth.admin.updateUserById(
      tokenData.user_id,
      { password: new_password }
    )
    
    if (passwordError) {
      return NextResponse.json(
        { error: 'Failed to update password' },
        { status: 500 }
      )
    }
    
    // Mark token as used
    await supabase
      .from('password_reset_tokens')
      .update({ used: true })
      .eq('id', tokenData.id)
    
    return NextResponse.json({
      message: 'Password updated successfully'
    })
    
  } catch (error) {
 
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
