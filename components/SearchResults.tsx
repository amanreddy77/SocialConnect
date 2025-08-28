'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Profile } from '@/types/database'
import { User, MapPin, Calendar, Eye, Search } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface SearchResultsProps {
  searchQuery: string
  onViewChange: (view: 'feed' | 'profile' | 'notifications' | 'admin' | 'search') => void
  onViewUserProfile: (userId: string) => void
}

export default function SearchResults({ searchQuery, onViewChange, onViewUserProfile }: SearchResultsProps) {
  const { profile: currentUser } = useAuth()
  const [results, setResults] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [followStatuses, setFollowStatuses] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (searchQuery.trim()) {
      searchUsers()
    } else {
      setResults([])
    }
  }, [searchQuery])

  // Listen for follow status updates
  useEffect(() => {
    const handleRefreshProfileCounts = () => {
      console.log('Follow status updated, refreshing search results...')
      if (results.length > 0) {
        checkFollowStatusesForResults(results)
      }
    }

    window.addEventListener('refreshProfileCounts', handleRefreshProfileCounts)
    return () => {
      window.removeEventListener('refreshProfileCounts', handleRefreshProfileCounts)
    }
  }, [results, currentUser])

  // Refresh follow statuses when results change
  useEffect(() => {
    if (results.length > 0 && currentUser) {
      checkFollowStatusesForResults(results)
    }
  }, [results, currentUser])

  const searchUsers = async () => {
    if (!searchQuery.trim()) return
    
    setLoading(true)
    try {
      console.log('Searching for:', searchQuery)
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${searchQuery}%,first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%`)
        .limit(20)

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }
      
      console.log('Search results:', data)
      setResults(data || [])
      
      // Check follow status for all results
      if (data && currentUser) {
        await checkFollowStatusesForResults(data)
      }
    } catch (error) {
      console.error('Search error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setSearchError(errorMessage)
      toast.error('Error searching users')
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const viewProfile = (userId: string) => {
    onViewUserProfile(userId)
  }

  const checkFollowStatusesForResults = async (profiles: Profile[]) => {
    if (!currentUser) return
    
    try {
      console.log('Checking follow statuses for profiles:', profiles.map(p => p.id))
      
      const { data: follows, error } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', currentUser.id)
        .in('following_id', profiles.map(p => p.id))

      if (error) {
        console.error('Error checking follow statuses:', error)
        return
      }

      const followingIds = follows?.map(f => f.following_id) || []
      console.log('Following IDs found:', followingIds)
      
      const statuses: Record<string, boolean> = {}
      
      profiles.forEach(profile => {
        const isFollowing = followingIds.includes(profile.id)
        statuses[profile.id] = isFollowing
        console.log(`Profile ${profile.username}: ${isFollowing ? 'Following' : 'Not Following'}`)
      })
      
      setFollowStatuses(statuses)
    } catch (error) {
      console.error('Error checking follow statuses:', error)
    }
  }

  if (!searchQuery.trim()) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center text-gray-500">
          <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium">Search for users</h3>
          <p className="text-sm">Enter a username, first name, or last name to find users</p>
        </div>
      </div>
    )
  }

  if (searchError) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Search Error</h3>
            <p className="text-sm text-gray-600 mb-4">{searchError}</p>
            <button 
              onClick={() => {
                setSearchError(null)
                searchUsers()
              }}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Searching...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Search Results for "{searchQuery}"
        </h2>
        <p className="text-gray-600">
          Found {results.length} user{results.length !== 1 ? 's' : ''}
        </p>
      </div>

      {results.length === 0 ? (
        <div className="text-center py-12">
          <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
          <p className="text-gray-500">Try searching with different terms</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {results.map((user) => (
            <div
              key={user.id}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => viewProfile(user.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="h-12 w-12 bg-primary-100 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      @{user.username}
                    </h3>
                    <p className="text-gray-600">
                      {user.first_name} {user.last_name}
                    </p>
                    {user.bio && (
                      <p className="text-sm text-gray-500 mt-1">{user.bio}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {currentUser && currentUser.id !== user.id && (
                    <div className="flex items-center space-x-2">
                      {followStatuses[user.id] ? (
                        <span className="text-sm text-green-600 font-medium px-3 py-1 bg-green-100 rounded-full">
                          ✓ Following
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500 px-3 py-1 bg-gray-100 rounded-full">
                          + Follow
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex items-center space-x-2 text-gray-400">
                    <Eye className="h-4 w-4" />
                    <span className="text-sm">View Profile</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
