import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { refresh_token } = await request.json()
    
    if (!refresh_token) {
      return NextResponse.json(
        { error: 'Refresh token is required' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()
    
    // Sign out the user
    const { error } = await supabase.auth.signOut({
      scope: 'local'
    })
    
    if (error) {
      return NextResponse.json(
        { error: 'Failed to logout' },
        { status: 500 }
      )
    }
    
    // In a real application, you might want to blacklist the refresh token
    // For now, we'll just return success since Supabase handles token invalidation
    
    return NextResponse.json({
      message: 'Logged out successfully'
    })
    
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
