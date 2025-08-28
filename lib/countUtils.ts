import { supabase } from './supabase'

export interface PostCounts {
  likeCount: number
  commentCount: number
}

/**
 * Get accurate counts for a specific post from the database
 */
export async function getPostCounts(postId: string): Promise<PostCounts> {
  try {
    // Get like count
    const { count: likeCount, error: likeError } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId)

    if (likeError) {
      console.error('Error fetching like count:', likeError)
    }

    // Get comment count
    const { count: commentCount, error: commentError } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId)
      .eq('is_active', true)

    if (commentError) {
      console.error('Error fetching comment count:', commentError)
    }

    return {
      likeCount: likeCount || 0,
      commentCount: commentCount || 0
    }
  } catch (error) {
    console.error('Error getting post counts:', error)
    return { likeCount: 0, commentCount: 0 }
  }
}

/**
 * Update post counts in the posts table to ensure consistency
 */
export async function updatePostCounts(postId: string): Promise<PostCounts> {
  try {
    const counts = await getPostCounts(postId)
    
    // Update the posts table with accurate counts
    const { error: updateError } = await supabase
      .from('posts')
      .update({
        like_count: counts.likeCount,
        comment_count: counts.commentCount
      })
      .eq('id', postId)

    if (updateError) {
      console.error('Error updating post counts:', updateError)
    }

    return counts
  } catch (error) {
    console.error('Error updating post counts:', error)
    return { likeCount: 0, commentCount: 0 }
  }
}

/**
 * Batch update counts for multiple posts
 */
export async function batchUpdatePostCounts(postIds: string[]): Promise<Map<string, PostCounts>> {
  const results = new Map<string, PostCounts>()
  
  try {
    // Process posts in batches to avoid overwhelming the database
    const batchSize = 10
    for (let i = 0; i < postIds.length; i += batchSize) {
      const batch = postIds.slice(i, i + batchSize)
      
      await Promise.all(
        batch.map(async (postId) => {
          const counts = await updatePostCounts(postId)
          results.set(postId, counts)
        })
      )
      
      // Small delay between batches
      if (i + batchSize < postIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
  } catch (error) {
    console.error('Error in batch update:', error)
  }
  
  return results
}

/**
 * Validate that stored counts match actual counts
 */
export async function validatePostCounts(postId: string): Promise<{
  isValid: boolean
  stored: PostCounts
  actual: PostCounts
  difference: PostCounts
}> {
  try {
    // Get stored counts from posts table
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('like_count, comment_count')
      .eq('id', postId)
      .single()

    if (postError) {
      throw postError
    }

    const stored = {
      likeCount: post.like_count || 0,
      commentCount: post.comment_count || 0
    }

    // Get actual counts
    const actual = await getPostCounts(postId)

    const difference = {
      likeCount: Math.abs(stored.likeCount - actual.likeCount),
      commentCount: Math.abs(stored.commentCount - actual.commentCount)
    }

    const isValid = difference.likeCount === 0 && difference.commentCount === 0

    return {
      isValid,
      stored,
      actual,
      difference
    }
  } catch (error) {
    console.error('Error validating post counts:', error)
    return {
      isValid: false,
      stored: { likeCount: 0, commentCount: 0 },
      actual: { likeCount: 0, commentCount: 0 },
      difference: { likeCount: 0, commentCount: 0 }
    }
  }
}

/**
 * Set up real-time subscriptions for count changes
 */
export function subscribeToCountChanges(postId: string, onCountChange: (counts: PostCounts) => void) {
  const likesSubscription = supabase
    .channel(`counts-${postId}`)
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'likes', filter: `post_id=eq.${postId}` },
      async () => {
        const counts = await getPostCounts(postId)
        onCountChange(counts)
      }
    )
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` },
      async () => {
        const counts = await getPostCounts(postId)
        onCountChange(counts)
      }
    )
    .subscribe()

  return likesSubscription
}

