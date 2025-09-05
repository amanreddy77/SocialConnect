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
import DataRender from './dataRender'



type View = 'feed' | 'profile' | 'notifications' | 'admin' | 'search' | 'userProfile' | 'data'

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
        case 'data':
          return <DataRender key={`data-${viewKey}`} />
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30 dark:from-gray-900 dark:via-blue-900/20 dark:to-indigo-900/20 transition-all duration-500">
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
        
        <main className="flex-1 p-6 transition-all duration-500 ease-in-out">
          {error ? (
            <div className="text-center py-16">
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-8 max-w-md mx-auto">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">Something went wrong</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">{error}</p>
                <button 
                  onClick={() => setError(null)} 
                  className="px-6 py-3 bg-gradient-to-r from-primary-600 to-blue-600 text-white rounded-xl hover:from-primary-700 hover:to-blue-700 transition-all duration-300 hover:scale-105 hover:shadow-lg font-medium"
                >
                  Try Again
                </button>
              </div>
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
