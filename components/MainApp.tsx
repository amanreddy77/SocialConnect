'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import Navigation from './Navigation'
import Sidebar from './Sidebar'
import Feed from './Feed'
import Profile from './Profile'
import Notifications from './Notifications'
import AdminPanel from './AdminPanel'
import LoadingSpinner from './LoadingSpinner'
import SearchResults from './SearchResults'
import UserProfile from './UserProfile'

type View = 'feed' | 'profile' | 'notifications' | 'admin' | 'search' | 'userProfile'

export default function MainApp() {
  const { profile, isAdmin, loading } = useAuth()
  const [currentView, setCurrentView] = useState<View>('feed')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewingUserId, setViewingUserId] = useState<string | null>(null)
  const [viewKey, setViewKey] = useState(0) // Force re-render when view changes

  // Listen for profile count refresh events
  useEffect(() => {
    const handleRefreshProfileCounts = () => {
      // Force a re-render to update counts in sidebar and other components
      setViewKey(prev => prev + 1)
    }

    window.addEventListener('refreshProfileCounts', handleRefreshProfileCounts)
    return () => {
      window.removeEventListener('refreshProfileCounts', handleRefreshProfileCounts)
    }
  }, [])

  // Handle view changes with proper cleanup and re-initialization
  const handleViewChange = useCallback((newView: View) => {
    console.log('Changing view from', currentView, 'to', newView)
    
    // Clear any existing errors
    setError(null)
    
    // Reset search query when leaving search view
    if (currentView === 'search' && newView !== 'search') {
      setSearchQuery('')
    }
    
    // Reset user profile when leaving user profile view
    if (currentView === 'userProfile' && newView !== 'userProfile') {
      setViewingUserId(null)
    }
    
    // Update view and force re-render
    setCurrentView(newView)
    setViewKey(prev => prev + 1)
  }, [currentView])

  // Handle search with proper view management
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
    if (query.trim()) {
      setCurrentView('search')
      setViewKey(prev => prev + 1)
    }
  }, [])

  // Handle user profile viewing
  const handleViewUserProfile = useCallback((userId: string) => {
    setViewingUserId(userId)
    setCurrentView('userProfile')
    setViewKey(prev => prev + 1)
  }, [])

  // Handle back navigation from user profile
  const handleBackFromUserProfile = useCallback(() => {
    setCurrentView('search')
    setViewingUserId(null)
    setViewKey(prev => prev + 1)
  }, [])

  // Show loading while auth is being determined
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  // Show error if profile is missing
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Profile Not Found</h2>
          <p className="text-gray-500">Unable to load user profile. Please try logging in again.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Reload Page
          </button>
        </div>
      </div>
    )
  }

  const renderContent = () => {
    console.log('Rendering view:', currentView, 'with searchQuery:', searchQuery, 'viewKey:', viewKey)
    
    try {
      switch (currentView) {
        case 'feed':
          return (
            <Feed 
              key={`feed-${viewKey}`}
              onPostCreated={() => {}} 
              onPostDeleted={() => {}} 
              onViewChange={(view: string) => handleViewChange(view as View)}
            />
          )
        case 'profile':
          return <Profile key={`profile-${viewKey}`} />
        case 'notifications':
          return <Notifications key={`notifications-${viewKey}`} />
        case 'admin':
          return isAdmin ? (
            <AdminPanel key={`admin-${viewKey}`} />
          ) : (
            <Feed 
              key={`feed-admin-${viewKey}`}
              onPostCreated={() => {}} 
              onPostDeleted={() => {}} 
              onViewChange={(view: string) => handleViewChange(view as View)}
            />
          )
        case 'search':
          return (
            <SearchResults 
              key={`search-${viewKey}`}
              searchQuery={searchQuery} 
              onViewChange={(view: string) => handleViewChange(view as View)} 
              onViewUserProfile={handleViewUserProfile}
            />
          )
        case 'userProfile':
          return viewingUserId ? (
            <UserProfile 
              key={`userProfile-${viewingUserId}-${viewKey}`}
              userId={viewingUserId} 
              onBack={handleBackFromUserProfile}
            />
          ) : (
            <Feed 
              key={`feed-userProfile-${viewKey}`}
              onPostCreated={() => {}} 
              onPostDeleted={() => {}} 
              onViewChange={(view: string) => handleViewChange(view as View)}
            />
          )
        default:
          return (
            <Feed 
              key={`feed-default-${viewKey}`}
              onPostCreated={() => {}} 
              onPostDeleted={() => {}} 
              onViewChange={(view: string) => handleViewChange(view as View)}
            />
          )
      }
    } catch (err) {
      console.error('Error rendering content:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      return (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Content</h3>
          <p className="text-gray-500">{error}</p>
        </div>
      )
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation 
        onViewChange={handleViewChange}
        currentView={currentView}
        onMenuClick={() => setSidebarOpen(true)}
        onSearch={handleSearch}
      />
      
      <div className="flex">
        <Sidebar 
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onViewChange={handleViewChange}
          currentView={currentView}
          isAdmin={isAdmin}
        />
        
        <main className="flex-1 p-4 transition-all duration-300 ease-in-out">
          {error ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Something went wrong</h3>
              <p className="text-gray-500 mb-4">{error}</p>
              <button 
                onClick={() => setError(null)} 
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                Try Again
              </button>
            </div>
          ) : (
            <div className="animate-fadeIn">
              {renderContent()}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
