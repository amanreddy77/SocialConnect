'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Post, Profile as ProfileType } from '@/types/database'
import { Edit, Save, X, Camera, UserPlus, UserMinus } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { toast } from 'react-hot-toast'
import PostCard from './PostCard'

export default function Profile() {
  const { profile: currentProfile } = useAuth()
  const [profile, setProfile] = useState<ProfileType | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    bio: '',
    website: '',
    location: '',
    is_private: false,
    privacy_level: 'public' as 'public' | 'private' | 'followers_only'
  })
  const [loading, setLoading] = useState(true)
  const [followers, setFollowers] = useState<any[]>([])
  const [following, setFollowing] = useState<any[]>([])

  useEffect(() => {
    if (currentProfile) {
      fetchProfileData()
    }
  }, [currentProfile])

  const fetchProfileData = async () => {
    try {
      setLoading(true)
      
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentProfile?.id)
        .single()

      if (profileError) throw profileError
      setProfile(profileData)
      setEditForm({
        bio: profileData.bio || '',
        website: profileData.website || '',
        location: profileData.location || '',
        is_private: profileData.is_private || false,
        privacy_level: profileData.privacy_level || 'public'
      })

      // Fetch posts
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .eq('author_id', currentProfile?.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (postsError) throw postsError
      setPosts(postsData || [])

      // Fetch followers and following
      await Promise.all([
        fetchFollowers(),
        fetchFollowing()
      ])

    } catch (error: any) {
      console.error('Error fetching profile data:', error)
      toast.error('Error loading profile')
    } finally {
      setLoading(false)
    }
  }

  const fetchFollowers = async () => {
    try {
      // Get follower count
      const { count: followersCount, error: followersError } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', currentProfile?.id)

      if (followersError) {
        console.error('Error fetching followers count:', followersError)
        return
      }

      // Get follower profiles
      const { data: followersData, error: followersDataError } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', currentProfile?.id)

      if (followersDataError) {
        console.error('Error fetching followers data:', followersDataError)
        return
      }

      if (followersData && followersData.length > 0) {
        const followerIds = followersData.map(f => f.follower_id)
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, first_name, last_name')
          .in('id', followerIds)

        if (profilesError) {
          console.error('Error fetching follower profiles:', profilesError)
          setFollowers([])
        } else {
          setFollowers(profiles || [])
        }
      } else {
        setFollowers([])
      }

      console.log('Followers count:', followersCount)
      console.log('Followers data:', followersData)
    } catch (error) {
      console.error('Error fetching followers:', error)
      setFollowers([])
    }
  }

  const fetchFollowing = async () => {
    try {
      // Get following count
      const { count: followingCount, error: followingError } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', currentProfile?.id)

      if (followingError) {
        console.error('Error fetching following count:', followingError)
        return
      }

      // Get following profiles
      const { data: followingData, error: followingDataError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', currentProfile?.id)

      if (followingDataError) {
        console.error('Error fetching following data:', followingDataError)
        return
      }

      if (followingData && followingData.length > 0) {
        const followingIds = followingData.map(f => f.following_id)
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, first_name, last_name')
          .in('id', followingIds)

        if (profilesError) {
          console.error('Error fetching following profiles:', profilesError)
          setFollowing([])
        } else {
          setFollowing(profiles || [])
        }
      } else {
        setFollowing([])
      }

      console.log('Following count:', followingCount)
      console.log('Following data:', followingData)
    } catch (error) {
      console.error('Error fetching following:', error)
      setFollowing([])
    }
  }

  const handleSaveProfile = async () => {
    try {
              const { error } = await supabase
          .from('profiles')
          .update({
            bio: editForm.bio,
            website: editForm.website,
            location: editForm.location,
            is_private: editForm.is_private,
            privacy_level: editForm.privacy_level,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentProfile?.id)

      if (error) throw error

      setProfile(prev => prev ? { ...prev, ...editForm } : null)
      setIsEditing(false)
      toast.success('Profile updated successfully!')
    } catch (error: any) {
      toast.error('Error updating profile')
    }
  }

  const handleCancelEdit = () => {
    setEditForm({
      bio: profile?.bio || '',
      website: profile?.website || '',
      location: profile?.location || '',
      is_private: profile?.is_private || false,
      privacy_level: profile?.privacy_level || 'public'
    })
    setIsEditing(false)
  }

  const handlePostDeleted = (postId: string) => {
    setPosts(prev => prev.filter(post => post.id !== postId))
  }

  // Function to refresh follower counts (called from other components)
  const refreshFollowerCounts = async () => {
    await Promise.all([
      fetchFollowers(),
      fetchFollowing()
    ])
  }

  // Expose this function to parent components
  useEffect(() => {
    if (currentProfile) {
      // Refresh counts every 30 seconds to keep them updated
      const interval = setInterval(refreshFollowerCounts, 30000)
      return () => clearInterval(interval)
    }
  }, [currentProfile])

  // Listen for follow status updates
  useEffect(() => {
    const handleRefreshProfileCounts = () => {
      console.log('Follow status updated, refreshing profile counts...')
      refreshFollowerCounts()
    }

    window.addEventListener('refreshProfileCounts', handleRefreshProfileCounts)
    return () => {
      window.removeEventListener('refreshProfileCounts', handleRefreshProfileCounts)
    }
  }, [currentProfile])

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Profile not found</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center space-x-6">
            <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-primary-600 font-semibold text-3xl">
                {profile.first_name?.[0]}{profile.last_name?.[0]}
              </span>
            </div>
            
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {profile.first_name} {profile.last_name}
              </h1>
              <p className="text-gray-600 text-lg">@{profile.username}</p>
              <p className="text-gray-500">{profile.email}</p>
            </div>
          </div>

          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-500"
          >
            {isEditing ? <X className="h-5 w-5" /> : <Edit className="h-5 w-5" />}
          </button>
        </div>

        {/* Profile Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{posts.length}</div>
            <div className="text-sm text-gray-500">Posts</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{followers.length}</div>
            <div className="text-sm text-gray-500">Followers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{following.length}</div>
            <div className="text-sm text-gray-500">Following</div>
          </div>
        </div>

        {/* Profile Details */}
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bio
              </label>
              <textarea
                value={editForm.bio}
                onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                maxLength={160}
                rows={3}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="Tell us about yourself..."
              />
              <p className="text-sm text-gray-500 mt-1">
                {editForm.bio.length}/160
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Website
                </label>
                <input
                  type="url"
                  value={editForm.website}
                  onChange={(e) => setEditForm(prev => ({ ...prev, website: e.target.value }))}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={editForm.location}
                  onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="City, Country"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_private"
                  checked={editForm.is_private}
                  onChange={(e) => setEditForm(prev => ({ ...prev, is_private: e.target.checked }))}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="is_private" className="ml-2 text-sm text-gray-700">
                  Private profile
                </label>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Privacy Level
                </label>
                <select
                  value={editForm.privacy_level}
                  onChange={(e) => setEditForm(prev => ({ ...prev, privacy_level: e.target.value as any }))}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="public">Public - Anyone can see your profile</option>
                  <option value="followers_only">Followers Only - Only followers can see your profile</option>
                  <option value="private">Private - Only you can see your profile</option>
                </select>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleSaveProfile}
                className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700"
              >
                <Save className="h-4 w-4 mr-2 inline" />
                Save Changes
              </button>
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 bg-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {profile.bio && (
              <p className="text-gray-700">{profile.bio}</p>
            )}
            {profile.website && (
              <p className="text-sm">
                <span className="text-gray-500">Website: </span>
                <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                  {profile.website}
                </a>
              </p>
            )}
            {profile.location && (
              <p className="text-sm text-gray-500">
                📍 {profile.location}
              </p>
            )}
            <p className="text-sm text-gray-500">
              Member since {formatDate(profile.created_at)}
            </p>
          </div>
        )}
      </div>

      {/* Posts Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Posts</h2>
        
        {posts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No posts yet. Create your first post!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={{
                  ...post,
                  author: profile
                }}
                onPostDeleted={handlePostDeleted}
                currentUserId={profile.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

