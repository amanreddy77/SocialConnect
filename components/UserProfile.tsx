'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Profile, Post } from '@/types/database'
import { useAuth } from '@/hooks/useAuth'
import { User, MapPin, Calendar, Mail, Users, Heart, MessageCircle, Share2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import PostCard from './PostCard'

interface UserProfileProps {
  userId: string
  onBack: () => void
}

export default function UserProfile({ userId, onBack }: UserProfileProps) {
  const { profile: currentUser } = useAuth()
  const [userProfile, setUserProfile] = useState<Profile | null>(null)
  const [userPosts, setUserPosts] = useState<Post[]>([])
  const [isFollowing, setIsFollowing] = useState(false)
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [postsLoading, setPostsLoading] = useState(false)
  const [showPosts, setShowPosts] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)

  useEffect(() => {
    if (userId) {
      fetchUserProfile()
      fetchFollowCounts()
      // Don't fetch posts initially - only after following
    }
  }, [userId])

  // Check follow status when both userId and currentUser are available
  useEffect(() => {
    if (userId && currentUser) {
      checkFollowStatus()
    }
  }, [userId, currentUser])

  // Reset follow status when viewing a different user
  useEffect(() => {
    setIsFollowing(false)
    setShowPosts(false)
    setUserPosts([])
  }, [userId])

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      setUserProfile(data)
    } catch (error) {
      console.error('Error fetching user profile:', error)
      toast.error('Error loading user profile')
    } finally {
      setLoading(false)
    }
  }

  const fetchUserPosts = async () => {
    try {
      setPostsLoading(true)
      console.log('Fetching posts for user:', userId)
      
      // First get the posts
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .eq('author_id', userId)
        .order('created_at', { ascending: false })

      if (postsError) {
        console.error('Supabase error fetching posts:', postsError)
        throw postsError
      }

      // Transform posts with author info from userProfile
      const transformedPosts = postsData?.map(post => ({
        ...post,
        author: {
          id: userProfile?.id,
          username: userProfile?.username,
          first_name: userProfile?.first_name,
          last_name: userProfile?.last_name
        }
      })) || []

      console.log('Posts fetched successfully:', postsData?.length || 0)
      
      console.log('Transformed posts count:', transformedPosts.length)
      setUserPosts(transformedPosts)
    } catch (error) {
      console.error('Error fetching user posts:', error)
      let errorMessage = 'Unknown error occurred'
      
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'object' && error !== null) {
        const supabaseError = error as any
        if (supabaseError.message) {
          errorMessage = supabaseError.message
        } else if (supabaseError.details) {
          errorMessage = supabaseError.details
        } else if (supabaseError.hint) {
          errorMessage = supabaseError.hint
        }
      }
      
      console.error('Posts error details:', error)
      toast.error(`Error loading user posts: ${errorMessage}`)
      setUserPosts([])
    } finally {
      setPostsLoading(false)
    }
  }

  const checkFollowStatus = async () => {
    if (!currentUser) return
    
    try {
      console.log('🔍 Checking follow status for:', currentUser.username, '->', userProfile?.username || userId)
      
      const { data, error } = await supabase
        .from('follows')
        .select('*')
        .eq('follower_id', currentUser.id)
        .eq('following_id', userId)

      if (error) {
        console.error('❌ Error checking follow status:', error)
        setIsFollowing(false)
        setShowPosts(false)
        return
      }
      
      // Check if any rows were returned
      if (data && data.length > 0) {
        console.log('✅ Already following this user, data:', data)
        setIsFollowing(true)
        setShowPosts(true)
        // Load posts if already following
        fetchUserPosts()
      } else {
        console.log('❌ Not following this user')
        setIsFollowing(false)
        setShowPosts(false)
      }
    } catch (error) {
      console.error('❌ Error checking follow status:', error)
      setIsFollowing(false)
      setShowPosts(false)
    }
  }

  const fetchFollowCounts = async () => {
    try {
      // Get followers count
      const { count: followers, error: followersError } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId)

      if (followersError) throw followersError
      setFollowersCount(followers || 0)

      // Get following count
      const { count: following, error: followingError } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', userId)

      if (followingError) throw followingError
      setFollowingCount(following || 0)
    } catch (error) {
      console.error('Error fetching follow counts:', error)
    }
  }

  const handleFollowToggle = async () => {
    if (!currentUser) {
      toast.error('Please sign in to follow users')
      return
    }

    if (followLoading) {
      console.log('Follow action already in progress, ignoring click')
      return
    }

    setFollowLoading(true)

    try {
      console.log('Follow toggle - Current user:', currentUser.id, 'Target user:', userId)
      console.log('Current follow status:', isFollowing)
      
      if (isFollowing) {
        // Unfollow
        console.log('Attempting to unfollow...')
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', userId)

        if (error) {
          console.error('Unfollow error:', error)
          throw error
        }
        
        console.log('Unfollow successful')
        setIsFollowing(false)
        setFollowersCount(prev => prev - 1)
        setShowPosts(false)
        setUserPosts([])
        
        // Dispatch custom event to refresh follow statuses in search results
        window.dispatchEvent(new CustomEvent('refreshProfileCounts'))
        
        toast.success('Unfollowed successfully')
              } else {
          // Follow - Double check current status
          console.log('Double-checking follow status before inserting...')
          const { data: currentStatus, error: statusError } = await supabase
            .from('follows')
            .select('*')
            .eq('follower_id', currentUser.id)
            .eq('following_id', userId)

          if (statusError) {
            console.error('Error checking current follow status:', statusError)
            throw statusError
          }

          if (currentStatus && currentStatus.length > 0) {
            console.log('Already following, updating state...')
            setIsFollowing(true)
            setShowPosts(true)
            fetchUserPosts()
            toast.success('Already following this user')
            return
          }
          
                  // Safe to insert new follow
        console.log('Attempting to follow...')
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: currentUser.id,
            following_id: userId
          })

        if (error) {
          console.error('Follow error:', error)
          throw error
        }
        
        console.log('Follow successful')
        setIsFollowing(true)
        setFollowersCount(prev => prev + 1)
        setShowPosts(true)
        fetchUserPosts()
        
        // Create notification for the user being followed
        try {
          await supabase
            .from('notifications')
            .insert({
              recipient_id: userId,
              sender_id: currentUser.id,
              notification_type: 'follow',
              post_id: null,
              message: `${currentUser.first_name} ${currentUser.last_name} started following you`
            })
        } catch (notificationError) {
          console.error('Error creating follow notification:', notificationError)
          // Don't fail the follow if notification fails
        }
        
        // Dispatch custom event to refresh follow statuses in search results
        window.dispatchEvent(new CustomEvent('refreshProfileCounts'))
        
        toast.success('Followed successfully')
        }

      // Refresh the current user's profile counts in the main app
      console.log('Dispatching refresh event...')
      window.dispatchEvent(new CustomEvent('refreshProfileCounts'))
      
    } catch (error) {
      console.error('Error toggling follow:', error)
      let errorMessage = 'Unknown error occurred'
      
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'object' && error !== null) {
        // Handle Supabase errors
        const supabaseError = error as any
        if (supabaseError.message) {
          errorMessage = supabaseError.message
        } else if (supabaseError.details) {
          errorMessage = supabaseError.details
        } else if (supabaseError.hint) {
          errorMessage = supabaseError.hint
        }
      }
      
      console.error('Detailed error info:', error)
      toast.error(`Error updating follow status: ${errorMessage}`)
    } finally {
      setFollowLoading(false)
    }
  }



  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!userProfile) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">User not found</h3>
          <button 
            onClick={onBack}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Back Button */}
      <button 
        onClick={onBack}
        className="mb-6 flex items-center text-gray-600 hover:text-gray-900"
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Search
      </button>

      {/* Profile Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <div className="h-20 w-20 bg-primary-100 rounded-full flex items-center justify-center">
              <User className="h-10 w-10 text-primary-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {userProfile.first_name} {userProfile.last_name}
              </h1>
              <p className="text-lg text-gray-600">@{userProfile.username}</p>
              {userProfile.bio && (
                <p className="text-gray-700 mt-2">{userProfile.bio}</p>
              )}
            </div>
          </div>
          
          {currentUser && currentUser.id !== userId && (
            <button
              onClick={handleFollowToggle}
              disabled={followLoading}
              className={`px-6 py-2 rounded-md font-medium transition-colors disabled:opacity-50 ${
                isFollowing
                  ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  : 'bg-primary-600 text-white hover:bg-primary-700'
              }`}
            >
              {followLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  <span>Processing...</span>
                </div>
              ) : (
                isFollowing ? '✓ Following' : '+ Follow'
              )}
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center space-x-6 mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-gray-400" />
            <span className="text-sm text-gray-600">
              <span className="font-semibold">{followersCount}</span> followers
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-gray-400" />
            <span className="text-sm text-gray-600">
              <span className="font-semibold">{followingCount}</span> following
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <MessageCircle className="h-5 w-5 text-gray-400" />
            <span className="text-sm text-gray-600">
              <span className="font-semibold">{userPosts.length}</span> posts
            </span>
          </div>
        </div>
      </div>

      {/* Posts Section - Only Show After Following */}
      {showPosts ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Posts</h2>
          
          {postsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">Loading posts...</p>
            </div>
          ) : userPosts.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No posts yet</h3>
              <p className="text-gray-500">This user hasn't shared any posts yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {userPosts.map((post) => (
                <PostCard 
                  key={post.id} 
                  post={post}
                  onPostDeleted={() => fetchUserPosts()}
                  currentUserId={currentUser?.id || ''}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center py-8">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Follow to See Posts</h3>
            <p className="text-gray-500">Follow this user to see their posts and updates.</p>
          </div>
        </div>
      )}
    </div>
  )
}
