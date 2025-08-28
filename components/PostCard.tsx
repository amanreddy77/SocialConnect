'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { getPostCounts, subscribeToCountChanges } from '@/lib/countUtils'
import { Post, Profile } from '@/types/database'
import { Heart, MessageCircle, Share, MoreVertical, Trash2, UserPlus, UserMinus } from 'lucide-react'
import { formatDate, truncateText } from '@/lib/utils'
import { toast } from 'react-hot-toast'

interface PostCardProps {
  post: Post & {
    author?: Profile
  }
  onPostDeleted: (postId: string) => void
  currentUserId: string
  onCountUpdate?: (postId: string, likeCount: number, commentCount: number) => void
}

export default function PostCard({ post, onPostDeleted, currentUserId, onCountUpdate }: PostCardProps) {
  const { profile } = useAuth()
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(post.like_count || 0)
  const [commentCount, setCommentCount] = useState(post.comment_count || 0)
  const [isFollowing, setIsFollowing] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [countsLoading, setCountsLoading] = useState(false)

  const isOwnPost = post.author_id === currentUserId

  // Real-time count synchronization using utility functions
  const syncCounts = useCallback(async () => {
    if (!post.id) return
    
    try {
      setCountsLoading(true)
      
      const counts = await getPostCounts(post.id)
      setLikeCount(counts.likeCount)
      setCommentCount(counts.commentCount)

      // Notify parent component of count updates
      if (onCountUpdate) {
        onCountUpdate(post.id, counts.likeCount, counts.commentCount)
      }

    } catch (error) {
      console.error('Error syncing counts:', error)
    } finally {
      setCountsLoading(false)
    }
  }, [post.id, onCountUpdate])

  useEffect(() => {
    checkLikeStatus()
    checkFollowStatus()
    syncCounts() // Sync counts on mount
    if (showComments) {
      fetchComments()
    }
  }, [post.id, showComments])

  // Set up real-time subscription for likes and comments using utility function
  useEffect(() => {
    if (!post.id) return

    const subscription = subscribeToCountChanges(post.id, (counts) => {
      setLikeCount(counts.likeCount)
      setCommentCount(counts.commentCount)
      
      // Also check like status when counts change
      checkLikeStatus()
      
      // Refresh comments if they're currently shown
      if (showComments) {
        fetchComments()
      }
      
      // Notify parent component
      if (onCountUpdate) {
        onCountUpdate(post.id, counts.likeCount, counts.commentCount)
      }
    })

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [post.id, showComments, onCountUpdate])

  const checkLikeStatus = async () => {
    try {
      const { data } = await supabase
        .from('likes')
        .select('id')
        .eq('user_id', currentUserId)
        .eq('post_id', post.id)
        .single()

      setIsLiked(!!data)
    } catch (error) {
      // User hasn't liked the post
      setIsLiked(false)
    }
  }

  const checkFollowStatus = async () => {
    if (isOwnPost) return
    
    try {
      const { data } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', currentUserId)
        .eq('following_id', post.author_id)
        .single()

      setIsFollowing(!!data)
    } catch (error) {
      // User isn't following
      setIsFollowing(false)
    }
  }

  const handleLike = async () => {
    try {
      setLoading(true)
      
      if (isLiked) {
        // Unlike
        const { error: unlikeError } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', currentUserId)
          .eq('post_id', post.id)

        if (unlikeError) {
          console.error('Unlike error:', unlikeError)
          throw unlikeError
        }

        // Update local state immediately for better UX
        setIsLiked(false)
        setLikeCount(prev => Math.max(0, prev - 1))
        
        // Sync with database to ensure accuracy
        await syncCounts()
        
        toast.success('Post unliked')
      } else {
        // Like
        const { error: likeError } = await supabase
          .from('likes')
          .insert({
            user_id: currentUserId,
            post_id: post.id
          })

        if (likeError) {
          console.error('Like error:', likeError)
          throw likeError
        }

        // Update local state immediately for better UX
        setIsLiked(true)
        setLikeCount(prev => prev + 1)
        
        // Sync with database to ensure accuracy
        await syncCounts()

        // Create notification
        if (!isOwnPost) {
          try {
            await supabase
              .from('notifications')
              .insert({
                recipient_id: post.author_id,
                sender_id: currentUserId,
                notification_type: 'like',
                post_id: post.id,
                message: `${profile?.first_name} liked your post`
              })
          } catch (notificationError) {
            console.error('Notification error:', notificationError)
            // Don't fail the like if notification fails
          }
        }

        toast.success('Post liked!')
      }
    } catch (error: any) {
      console.error('Like/unlike error:', error)
      toast.error('Error updating like. Please try again.')
      // Revert local state on error
      setIsLiked(!isLiked)
      setLikeCount(prev => isLiked ? prev + 1 : Math.max(0, prev - 1))
    } finally {
      setLoading(false)
    }
  }

  const handleFollow = async () => {
    try {
      if (isFollowing) {
        // Unfollow
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('following_id', post.author_id)

        setIsFollowing(false)
      } else {
        // Follow
        await supabase
          .from('follows')
          .insert({
            follower_id: currentUserId,
            following_id: post.author_id
          })

        setIsFollowing(true)

        // Create notification
        await supabase
          .from('notifications')
          .insert({
            recipient_id: post.author_id,
            sender_id: currentUserId,
            notification_type: 'follow',
            post_id: null,
            message: `${profile?.first_name} started following you`
          })
      }
    } catch (error: any) {
      toast.error('Error updating follow status')
    }
  }

  const handleDeletePost = async () => {
    if (!confirm('Are you sure you want to delete this post?')) return

    try {
      await supabase
        .from('posts')
        .update({ is_active: false })
        .eq('id', post.id)

      onPostDeleted(post.id)
    } catch (error: any) {
      toast.error('Error deleting post')
    }
  }

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', post.id)
        .eq('is_active', true)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching comments:', error)
        return
      }

              // Get author profiles for comments
        if (data && data.length > 0) {
          const authorIds = Array.from(new Set(data.map(c => c.author_id)))
          const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, first_name, last_name')
          .in('id', authorIds)

        if (profilesError) {
          console.error('Error fetching comment authors:', profilesError)
          setComments(data || [])
          return
        }

        // Combine comments with author profiles
        const commentsWithAuthors = data.map(comment => ({
          ...comment,
          author: profiles.find(p => p.id === comment.author_id)
        }))
        
        setComments(commentsWithAuthors)
      } else {
        setComments([])
      }
    } catch (error) {
      console.error('Error fetching comments:', error)
      setComments([])
    }
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    try {
      const { data: comment, error: commentError } = await supabase
        .from('comments')
        .insert({
          content: newComment.trim(),
          author_id: currentUserId,
          post_id: post.id
        })
        .select('*')
        .single()

      if (commentError) {
        console.error('Error inserting comment:', commentError)
        throw commentError
      }

      if (comment) {
        // Get the current user's profile for the comment
        const commentWithAuthor = {
          ...comment,
          author: {
            id: profile?.id,
            username: profile?.username,
            first_name: profile?.first_name,
            last_name: profile?.last_name
          }
        }

        setComments(prev => [...prev, commentWithAuthor])
        setCommentCount(prev => prev + 1)
        setNewComment('')

        // Sync counts to ensure accuracy
        await syncCounts()

        // Create notification
        if (!isOwnPost) {
          try {
            await supabase
              .from('notifications')
              .insert({
                recipient_id: post.author_id,
                sender_id: currentUserId,
                notification_type: 'comment',
                post_id: post.id,
                message: `${profile?.first_name} commented on your post`
              })
          } catch (notificationError) {
            console.error('Notification error:', notificationError)
            // Don't fail the comment if notification fails
          }
        }

        toast.success('Comment added successfully!')
      }
    } catch (error: any) {
      console.error('Comment error:', error)
      toast.error('Error adding comment. Please try again.')
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Post Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-primary-600 font-semibold text-sm">
              {post.author?.first_name?.[0]}{post.author?.last_name?.[0]}
            </span>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <p className="font-medium text-gray-900">
                {post.author?.first_name} {post.author?.last_name}
              </p>
              <span className="text-gray-500">@{post.author?.username}</span>
            </div>
            <p className="text-sm text-gray-500">{formatDate(post.created_at)}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {!isOwnPost && (
            <button
              onClick={handleFollow}
              className={`px-3 py-1 text-xs font-medium rounded-full ${
                isFollowing
                  ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  : 'bg-primary-100 text-primary-700 hover:bg-primary-200'
              }`}
            >
              {isFollowing ? <UserMinus className="h-3 w-3" /> : <UserPlus className="h-3 w-3" />}
              {isFollowing ? 'Following' : 'Follow'}
            </button>
          )}

          {isOwnPost && (
            <button
              onClick={handleDeletePost}
              className="p-1 text-gray-400 hover:text-red-500"
              title="Delete post"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Post Content */}
      <div className="mb-4">
        <p className="text-gray-900 whitespace-pre-wrap">{post.content}</p>
        {post.image_url && (
          <img
            src={post.image_url}
            alt="Post image"
            className="mt-3 rounded-lg max-w-full max-h-96 object-cover"
          />
        )}
        <div className="mt-2">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            post.category === 'announcement' ? 'bg-blue-100 text-blue-800' :
            post.category === 'question' ? 'bg-yellow-100 text-yellow-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {post.category}
          </span>
        </div>
      </div>

      {/* Post Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="flex items-center space-x-6">
          <button
            onClick={handleLike}
            disabled={loading}
            className={`flex items-center space-x-2 ${
              isLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
            } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Heart className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} />
            <span className="text-sm font-medium">
              {countsLoading ? '...' : likeCount}
            </span>
          </button>

          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center space-x-2 text-gray-400 hover:text-primary-500"
          >
            <MessageCircle className="h-5 w-5" />
            <span className="text-sm font-medium">
              {countsLoading ? '...' : commentCount}
            </span>
          </button>

          <button className="flex items-center space-x-2 text-gray-400 hover:text-primary-500">
            <Share className="h-5 w-5" />
            <span className="text-sm font-medium">Share</span>
          </button>
        </div>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="font-medium text-gray-900 mb-3">Comments</h4>
          
          {/* Add Comment */}
          <form onSubmit={handleAddComment} className="mb-4">
            <div className="flex space-x-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                maxLength={200}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
              <button
                type="submit"
                disabled={!newComment.trim()}
                className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                Comment
              </button>
            </div>
          </form>

          {/* Comments List */}
          <div className="space-y-3">
            {comments.map((comment) => (
              <div key={comment.id} className="flex space-x-3">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-gray-600 text-xs font-medium">
                    {comment.author?.first_name?.[0] || 'U'}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-sm">
                      <span className="font-medium text-gray-900">
                        {comment.author?.first_name || 'Unknown'} {comment.author?.last_name || 'User'}
                      </span>
                      <span className="text-gray-500 ml-2">
                        {formatDate(comment.created_at)}
                      </span>
                    </p>
                    <p className="text-gray-900 text-sm mt-1">{comment.content}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

