'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Post, Profile } from '@/types/database'
import PostCard from './PostCard'
import CreatePost from './CreatePost'
import { toast } from 'react-hot-toast'

interface FeedProps {
  onPostCreated: (post: Post) => void
  onPostDeleted: (postId: string) => void
  onViewChange: (view: string) => void
}

export default function Feed({ onPostCreated, onPostDeleted, onViewChange }: FeedProps) {
  const { profile } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const fetchFeed = useCallback(async (forceRefresh = false) => {
    if (!profile?.id) return
    
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // Create new abort controller
    abortControllerRef.current = new AbortController()
    
    try {
      if (forceRefresh) {
        setLoading(true)
      }
      
      // Get users that current user follows
      const { data: follows, error: followsError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', profile.id)

      if (followsError) {
        console.error('Error fetching follows:', followsError)
        throw followsError
      }

      const followingIds = follows?.map(f => f.following_id) || []
      const userIds = [...followingIds, profile.id].filter(Boolean)
      
      // Ensure we have valid user IDs
      if (userIds.length === 0) {
        userIds.push(profile.id)
      }

      // Get posts from followed users and own posts
      const { data: feedPosts, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .in('author_id', userIds)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(30)

      if (postsError) {
        console.error('Error fetching posts:', postsError)
        throw postsError
      }

      // Get author profiles for all posts
      if (feedPosts && feedPosts.length > 0) {
        const authorIds = Array.from(new Set(feedPosts.map(post => post.author_id)))
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, first_name, last_name, avatar_url')
          .in('id', authorIds)

        if (profilesError) {
          console.error('Error fetching author profiles:', profilesError)
        }

        // Transform posts with author data
        const transformedPosts = feedPosts.map(post => ({
          ...post,
          author: profiles?.find(p => p.id === post.author_id) || {
            id: post.author_id,
            username: 'Unknown User',
            first_name: 'Unknown',
            last_name: 'User'
          }
        }))
        
        setPosts(transformedPosts)
        setLastFetchTime(new Date())
      } else {
        setPosts([])
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Feed fetch was cancelled')
        return
      }
      
      console.error('Error fetching feed:', error)
      
      // Try to load just own posts as fallback
      try {
        console.log('Trying fallback: loading own posts only...')
        const { data: ownPosts, error: ownPostsError } = await supabase
          .from('posts')
          .select('*')
          .eq('author_id', profile?.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(20)

        if (ownPostsError) {
          console.error('Fallback also failed:', ownPostsError)
          toast.error('Error loading feed. Please refresh the page.')
        } else {
          // Transform own posts
          const transformedOwnPosts = ownPosts?.map(post => ({
            ...post,
            author: {
              id: profile?.id,
              username: profile?.username,
              first_name: profile?.first_name,
              last_name: profile?.last_name
            }
          })) || []
          
          setPosts(transformedOwnPosts)
          toast('Showing your posts only. Some content may not be available.')
        }
      } catch (fallbackError) {
        console.error('Fallback failed:', fallbackError)
        toast.error('Unable to load any posts. Please check your connection.')
      }
    } finally {
      setLoading(false)
    }
  }, [profile?.id])

  // Handle count updates from PostCard components
  const handleCountUpdate = useCallback((postId: string, likeCount: number, commentCount: number) => {
    setPosts(prev => prev.map(post => 
      post.id === postId 
        ? { ...post, like_count: likeCount, comment_count: commentCount }
        : post
    ))
  }, [])

  // Initial feed fetch when component mounts
  useEffect(() => {
    if (profile?.id) {
      fetchFeed(true)
    }
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [profile?.id])

  // Refresh feed when profile changes (user follows/unfollows someone)
  useEffect(() => {
    if (profile?.id && lastFetchTime) {
      console.log('Profile changed, refreshing feed...')
      fetchFeed(true)
    }
  }, [profile?.id])

  const handlePostCreated = (newPost: Post) => {
    setPosts(prev => [newPost, ...prev])
    onPostCreated(newPost)
    // Remove duplicate toast - let CreatePost component handle the success message
  }

  const handlePostDeleted = (postId: string) => {
    setPosts(prev => prev.filter(post => post.id !== postId))
    onPostDeleted(postId)
    // Remove duplicate toast - let PostCard component handle the success message
  }

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchFeed(true)
    setRefreshing(false)
  }, [fetchFeed])

  // Memoize posts to prevent unnecessary re-renders
  const memoizedPosts = useMemo(() => posts, [posts])

  // Listen for profile count refresh events to also refresh feed
  useEffect(() => {
    const handleRefreshProfileCounts = () => {
      console.log('Profile counts updated, refreshing feed...')
      fetchFeed(true)
    }

    window.addEventListener('refreshProfileCounts', handleRefreshProfileCounts)
    return () => {
      window.removeEventListener('refreshProfileCounts', handleRefreshProfileCounts)
    }
  }, [fetchFeed])

  // Auto-refresh feed every 3 minutes to show new posts from followed users
  useEffect(() => {
    const interval = setInterval(() => {
      if (profile && lastFetchTime) {
        const timeSinceLastFetch = Date.now() - lastFetchTime.getTime()
        const threeMinutes = 3 * 60 * 1000
        
        if (timeSinceLastFetch >= threeMinutes) {
          console.log('Auto-refreshing feed...')
          fetchFeed()
        }
      }
    }, 60000) // Check every minute

    return () => clearInterval(interval)
  }, [profile, lastFetchTime, fetchFeed])

  // Set up real-time subscription for new posts
  useEffect(() => {
    if (!profile?.id) return

    const postsSubscription = supabase
      .channel('feed-posts')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'posts' },
        (payload) => {
          const newPost = payload.new as Post
          // Only add if it's from a followed user or own post
          if (newPost.author_id === profile.id || 
              posts.some(p => p.author_id === newPost.author_id)) {
            console.log('New post detected, refreshing feed...')
            fetchFeed()
          }
        }
      )
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'posts' },
        (payload) => {
          const updatedPost = payload.new as Post
          if (updatedPost.is_active === false) {
            // Post was deleted/deactivated
            setPosts(prev => prev.filter(p => p.id !== updatedPost.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(postsSubscription)
    }
  }, [profile?.id, posts, fetchFeed])

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-4"></div>
        <p className="text-gray-500">Loading your personalized feed...</p>
        <p className="text-sm text-gray-400 mt-2">This may take a few seconds</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Home Feed</h2>
          <div className="flex items-center space-x-2">
            {lastFetchTime && (
              <span className="text-xs text-gray-400">
                Last updated: {lastFetchTime.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-3 py-1 text-sm font-medium text-primary-600 hover:text-primary-500 disabled:opacity-50 flex items-center space-x-2"
              title="Refresh feed to see new posts"
            >
              <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>
        <CreatePost onPostCreated={handlePostCreated} />
      </div>

      <div className="space-y-4">
        {memoizedPosts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500">
              <svg className="mx-auto h-12 w-12 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Your feed is empty</h3>
              <p className="text-gray-500 mb-4">Follow some users to see their posts in your feed!</p>
              <button
                onClick={() => onViewChange('search')}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                Discover Users
              </button>
            </div>
          </div>
        ) : (
          memoizedPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onPostDeleted={handlePostDeleted}
              currentUserId={profile?.id || ''}
              onCountUpdate={handleCountUpdate}
            />
          ))
        )}
      </div>

      {posts.length > 0 && (
        <div className="text-center py-4">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-500 disabled:opacity-50"
          >
            {refreshing ? 'Refreshing...' : 'Load more posts'}
          </button>
        </div>
      )}
    </div>
  )
}

