'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Shield, Users, FileText, Trash2, Eye, UserX, TrendingUp, Activity, Heart, MessageCircle } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { toast } from 'react-hot-toast'

interface User {
  id: string
  username: string
  first_name: string
  last_name: string
  email: string
  role: string
  created_at: string
  is_active: boolean
}

interface Post {
  id: string
  content: string
  author_id: string
  created_at: string
  is_active: boolean
  image_url?: string
  author?: {
    username: string
    first_name: string
    last_name: string
  }
}

interface Stats {
  totalUsers: number
  totalPosts: number
  activeUsersToday: number
  totalLikes: number
  totalComments: number
}

export default function AdminPanel() {
  const { profile } = useAuth()
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'posts'>('overview')
  const [users, setUsers] = useState<User[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [usersLoading, setUsersLoading] = useState(false)
  const [postsLoading, setPostsLoading] = useState(false)

  useEffect(() => {
    if (profile) {
      fetchStats()
      fetchUsers()
      fetchPosts()
    }
  }, [profile])

  const fetchStats = async () => {
    try {
      // Get total users
      const { count: totalUsers, error: usersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

      if (usersError) throw usersError

      // Get total posts
      const { count: totalPosts, error: postsError } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)

      if (postsError) throw postsError

      // Get active users today
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const { count: activeUsersToday, error: activeError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString())

      if (activeError) throw activeError

      // Get total likes
      const { count: totalLikes, error: likesError } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })

      if (likesError) throw likesError

      // Get total comments
      const { count: totalComments, error: commentsError } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)

      if (commentsError) throw commentsError

      setStats({
        totalUsers: totalUsers || 0,
        totalPosts: totalPosts || 0,
        activeUsersToday: activeUsersToday || 0,
        totalLikes: totalLikes || 0,
        totalComments: totalComments || 0
      })

    } catch (error) {
      console.error('Error fetching stats:', error)
      toast.error('Error loading statistics')
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      setUsersLoading(true)
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error

      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Error loading users')
    } finally {
      setUsersLoading(false)
    }
  }

  const fetchPosts = async () => {
    try {
      setPostsLoading(true)
      
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          author:profiles!posts_author_id_fkey (
            username,
            first_name,
            last_name
          )
        `)
        // Remove the is_active filter so admins can see ALL posts
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error

      // Transform posts to include author info
      const transformedPosts = data?.map(post => ({
        ...post,
        author: post.author || {
          username: 'Unknown User',
          first_name: 'Unknown',
          last_name: 'User'
        }
      })) || []

      setPosts(transformedPosts)
    } catch (error) {
      console.error('Error fetching posts:', error)
      toast.error('Error loading posts')
    } finally {
      setPostsLoading(false)
    }
  }

  const deactivateUser = async (userId: string) => {
    if (!confirm('Are you sure you want to deactivate this user? This will hide their content.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: false })
        .eq('id', userId)

      if (error) throw error

      // Update local state
      setUsers(prev => 
        prev.map(user => 
          user.id === userId ? { ...user, is_active: false } : user
        )
      )

      // Update stats
      setStats(prev => prev ? { ...prev, totalUsers: prev.totalUsers - 1 } : null)

      toast.success('User deactivated successfully')
    } catch (error) {
      console.error('Error deactivating user:', error)
      toast.error('Error deactivating user')
    }
  }

  const deletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return
    }

    try {
      // Permanently delete the post
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)

      if (error) throw error

      // Update local state
      setPosts(prev => prev.filter(post => post.id !== postId))

      // Update stats
      setStats(prev => prev ? { ...prev, totalPosts: prev.totalPosts - 1 } : null)

      toast.success('Post deleted permanently')
    } catch (error) {
      console.error('Error deleting post:', error)
      toast.error('Error deleting post')
    }
  }

  const reactivateUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: true })
        .eq('id', userId)

      if (error) throw error

      // Update local state
      setUsers(prev => 
        prev.map(user => 
          user.id === userId ? { ...user, is_active: true } : user
        )
      )

      // Update stats
      setStats(prev => prev ? { ...prev, totalUsers: prev.totalUsers + 1 } : null)

      toast.success('User reactivated successfully')
    } catch (error) {
      console.error('Error reactivating user:', error)
      toast.error('Error reactivating user')
    }
  }

  const deleteUser = async (userId: string) => {
    if (!confirm('⚠️ WARNING: This will PERMANENTLY DELETE the user and ALL their data (posts, likes, comments, follows). This action cannot be undone. Are you absolutely sure?')) {
      return
    }

    try {
      // Delete user data in the correct order to avoid foreign key constraints
      // 1. Delete likes first
      const { error: likesError } = await supabase
        .from('likes')
        .delete()
        .eq('user_id', userId)

      if (likesError) throw likesError

      // 2. Delete comments
      const { error: commentsError } = await supabase
        .from('comments')
        .delete()
        .eq('user_id', userId)

      if (commentsError) throw commentsError

      // 3. Delete follows (both as follower and following)
      const { error: followsError } = await supabase
        .from('follows')
        .delete()
        .or(`follower_id.eq.${userId},following_id.eq.${userId}`)

      if (followsError) throw followsError

      // 4. Delete notifications
      const { error: notificationsError } = await supabase
        .from('notifications')
        .delete()
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)

      if (notificationsError) throw notificationsError

      // 5. Delete posts
      const { error: postsError } = await supabase
        .from('posts')
        .delete()
        .eq('author_id', userId)

      if (postsError) throw postsError

      // 6. Finally delete the user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId)

      if (profileError) throw profileError

      // Update local state only after successful deletion
      setUsers(prev => prev.filter(user => user.id !== userId))
      setPosts(prev => prev.filter(post => post.author_id !== userId))

      // Update stats
      setStats(prev => prev ? { 
        ...prev, 
        totalUsers: prev.totalUsers - 1
      } : null)

      toast.success('User and all associated data deleted permanently')
    } catch (error: any) {
      console.error('Error deleting user:', error)
      
      // Provide more specific error messages
      if (error.message?.includes('foreign key')) {
        toast.error('Cannot delete user: They have active relationships with other data')
      } else if (error.message?.includes('permission')) {
        toast.error('Permission denied: You cannot delete this user')
      } else {
        toast.error('Failed to delete user. Please try again or contact support.')
      }
    }
  }

  // Check if user is admin
  if (profile?.role !== 'admin') {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-500">You don't have permission to access the admin panel.</p>
          <p className="text-sm text-gray-400 mt-2">Admin role required.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <Shield className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
            <p className="text-gray-600">Manage users, content, and monitor platform activity</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <TrendingUp className="h-4 w-4 inline mr-2" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'users'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Users className="h-4 w-4 inline mr-2" />
            Users ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('posts')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'posts'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FileText className="h-4 w-4 inline mr-2" />
            Posts ({posts.length})
          </button>
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats?.totalUsers || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <FileText className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Posts</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats?.totalPosts || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Activity className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">New Users Today</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats?.activeUsersToday || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Heart className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Likes</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats?.totalLikes || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <MessageCircle className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Comments</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats?.totalComments || 0}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-500 text-center">Activity monitoring coming soon...</p>
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">User Management</h3>
            <p className="text-sm text-gray-600">Manage user accounts and permissions</p>
          </div>
          
          {usersLoading ? (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                              <span className="text-primary-600 font-semibold text-sm">
                                {user.first_name?.[0]}{user.last_name?.[0]}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.first_name} {user.last_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              @{user.username}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.role === 'admin' 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {user.is_active ? (
                            <button
                              onClick={() => deactivateUser(user.id)}
                              className="text-red-600 hover:text-red-900 flex items-center space-x-1"
                              disabled={user.role === 'admin'}
                            >
                              <UserX className="h-4 w-4" />
                              <span>Deactivate</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => reactivateUser(user.id)}
                              className="text-green-600 hover:text-green-900 flex items-center space-x-1"
                            >
                              <Eye className="h-4 w-4" />
                              <span>Reactivate</span>
                            </button>
                          )}
                          <button
                            onClick={() => deleteUser(user.id)}
                            className="text-red-600 hover:text-red-900 flex items-center space-x-1"
                            disabled={user.role === 'admin'}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Posts Tab */}
      {activeTab === 'posts' && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Content Management</h3>
            <p className="text-sm text-gray-600">Manage posts and content moderation</p>
          </div>
          
          {postsLoading ? (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Content
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Author
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Posted
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {posts.map((post) => (
                    <tr key={post.id} className={!post.is_active ? 'bg-red-50' : ''}>
                      <td className="px-6 py-4">
                        <div className={`text-sm text-gray-900 max-w-xs truncate ${!post.is_active ? 'line-through' : ''}`}>
                          {post.content}
                        </div>
                        {post.image_url && (
                          <div className="text-xs text-gray-500 mt-1">📷 Has Image</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {post.author?.first_name} {post.author?.last_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          @{post.author?.username}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          post.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {post.is_active ? 'Active' : 'Deleted'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(post.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => deletePost(post.id)}
                          className="text-red-600 hover:text-red-900 flex items-center space-x-1"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>Delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

