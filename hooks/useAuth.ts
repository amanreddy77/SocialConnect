import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Profile } from '@/types/database'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    console.log('useAuth: Starting authentication check...')
    
    // Add a more reasonable timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (loading && !isInitialized) {
        console.warn('useAuth: Initial authentication timeout reached')
        setLoading(false)
        setError('Authentication is taking longer than expected. Please check your connection and try again.')
      }
    }, 30000) // 30 second timeout for initial load only
    
    // Get initial session
    const getSession = async () => {
      try {
        console.log('useAuth: Getting initial session...')
        setLoading(true)
        setError(null)
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        console.log('useAuth: Session result:', { 
          hasSession: !!session, 
          userId: session?.user?.id,
          error: sessionError 
        })
        
        if (sessionError) {
          console.error('useAuth: Session error:', sessionError)
          setError(sessionError.message)
          setLoading(false)
          setIsInitialized(true)
          return
        }
        
        setUser(session?.user ?? null)
        
        if (session?.user) {
          console.log('useAuth: User found, fetching profile...')
          await fetchProfile(session.user.id)
        } else {
          console.log('useAuth: No user session found')
          setLoading(false)
          setIsInitialized(true)
        }
      } catch (err) {
        console.error('useAuth: Error getting session:', err)
        setError(err instanceof Error ? err.message : 'Failed to get session')
        setLoading(false)
        setIsInitialized(true)
      }
    }

    getSession()

    // Listen for auth changes
    console.log('useAuth: Setting up auth state listener...')
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('useAuth: Auth state changed:', { event, userId: session?.user?.id })
        
        // Only update if the user actually changed
        if (user?.id !== session?.user?.id) {
          setUser(session?.user ?? null)
          
          if (session?.user) {
            console.log('useAuth: User authenticated, fetching profile...')
            await fetchProfile(session.user.id)
          } else {
            console.log('useAuth: User signed out, clearing profile')
            setProfile(null)
            setLoading(false)
          }
        }
        
        // Mark as initialized after first auth state change
        if (!isInitialized) {
          setIsInitialized(true)
        }
      }
    )

    return () => {
      console.log('useAuth: Cleaning up subscription and timeout')
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [user?.id, isInitialized]) // Only re-run if user ID or initialization state changes

  const createProfileIfMissing = async (userId: string) => {
    try {
      console.log('useAuth: Creating missing profile for user:', userId)
      
      // Get user data from auth
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      
      // Create basic profile
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          username: `user_${userId.slice(0, 8)}`,
          email: user?.email || '',
          first_name: 'User',
          last_name: 'User',
          full_name: 'User User',
          avatar_url: '',
          role: 'user',
          is_private: false,
          privacy_level: 'public'
        })
        .select()
        .single()
      
      if (createError) {
        console.error('useAuth: Failed to create profile:', createError)
        setError('Failed to create user profile. Please contact support.')
        setLoading(false)
        return
      }
      
      console.log('useAuth: Profile created successfully:', newProfile)
      setProfile(newProfile)
      setError(null)
      setLoading(false)
    } catch (error) {
      console.error('useAuth: Error creating profile:', error)
      setError('Failed to create user profile. Please try again.')
      setLoading(false)
    }
  }

  const fetchProfile = async (userId: string) => {
    try {
      console.log('useAuth: Fetching profile for user:', userId)
      setLoading(true)
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Profile fetch timeout')), 10000)
      })
      
      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      const { data, error: profileError } = await Promise.race([profilePromise, timeoutPromise])

      if (profileError) {
        console.error('useAuth: Profile fetch error:', profileError)
        console.error('useAuth: Error details:', {
          code: profileError.code,
          message: profileError.message,
          details: profileError.details,
          hint: profileError.hint
        })
        
        // Handle specific error types
        if (profileError.code === 'PGRST116') {
          console.log('useAuth: Profile not found, creating new profile...')
          // Try to create profile if it doesn't exist
          await createProfileIfMissing(userId)
          return
        } else if (profileError.code === '42501') {
          setError('Permission denied. Please check your database permissions.')
        } else if (profileError.code === '406') {
          setError('Database connection issue. Please try refreshing the page.')
        } else {
          setError(`Profile fetch failed: ${profileError.message}`)
        }
        
        setLoading(false)
        return
      }

      console.log('useAuth: Profile loaded successfully:', data)
      setProfile(data)
      setError(null)
      setLoading(false)
    } catch (error) {
      console.error('useAuth: Error fetching profile:', error)
      
      // Handle network or other errors
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          setError('Network error. Please check your internet connection.')
        } else if (error.message.includes('timeout')) {
          setError('Request timeout. Please try again.')
        } else {
          setError(`Profile fetch failed: ${error.message}`)
        }
      } else {
        setError('Unknown error occurred while fetching profile.')
      }
      
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      console.log('useAuth: Signing out...')
      setLoading(true)
      await supabase.auth.signOut()
      setProfile(null)
      setUser(null)
      setLoading(false)
    } catch (error) {
      console.error('useAuth: Error signing out:', error)
      setError(error instanceof Error ? error.message : 'Failed to sign out')
      setLoading(false)
    }
  }

  const retryAuth = async () => {
    console.log('useAuth: Retrying authentication...')
    setError(null)
    setLoading(true)
    
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        throw sessionError
      }
      
      if (session?.user) {
        await fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    } catch (error) {
      console.error('useAuth: Retry failed:', error)
      setError('Authentication retry failed. Please refresh the page.')
      setLoading(false)
    }
  }

  console.log('useAuth: Current state:', { user: !!user, profile: !!profile, loading, error, isInitialized })

  return {
    user,
    profile,
    loading,
    error,
    signOut,
    retryAuth,
    isAdmin: profile?.role === 'admin',
    isInitialized
  }
}
