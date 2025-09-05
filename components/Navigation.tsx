'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { supabase } from '@/lib/supabase'
import { Menu, Search, Bell, User, LogOut, Sun, Moon } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface NavigationProps {
  onViewChange: (view: any) => void
  currentView: string
  onMenuClick: () => void
  onSearch: (query: string) => void
}

export default function Navigation({ onViewChange, currentView, onMenuClick, onSearch }: NavigationProps) {
  const { profile, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [searchQuery, setSearchQuery] = useState('')
  const [notificationCount, setNotificationCount] = useState(0)

  const handleSignOut = async () => {
    try {
      await signOut()
      toast.success('Signed out successfully')
    } catch (error) {
      toast.error('Error signing out')
    }
  }

  // Fetch notification count
  useEffect(() => {
    if (profile) {
      fetchNotificationCount()
      setupNotificationSubscription()
    }
  }, [profile])

  const fetchNotificationCount = async () => {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', profile?.id)
        .eq('is_read', false)

      if (error) {
        console.error('Error fetching notification count:', error)
        return
      }

      setNotificationCount(count || 0)
    } catch (error) {
      console.error('Error fetching notification count:', error)
    }
  }

  const setupNotificationSubscription = () => {
    if (!profile) return

    const subscription = supabase
      .channel('notification-count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${profile.id}`
        },
        () => {
          // Refresh notification count when notifications change
          fetchNotificationCount()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim())
      onViewChange('search')
    }
  }

  return (
    <nav className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-lg border-b border-gray-200/50 dark:border-gray-700/50 transition-all duration-300 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Logo and Menu */}
          <div className="flex items-center">
            <button
              onClick={onMenuClick}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 md:hidden transition-colors duration-200"
            >
              <Menu className="h-6 w-6" />
            </button>
            
            <div className="flex-shrink-0 flex items-center">
              <h1 
                className="text-xl font-bold bg-gradient-to-r from-primary-600 to-blue-600 dark:from-primary-400 dark:to-blue-400 bg-clip-text text-transparent cursor-pointer transition-all duration-300 hover:scale-105"
                onClick={() => onViewChange('feed')}
              >
                SocialConnect
              </h1>
            </div>
          </div>

          {/* Center - Search */}
          <div className="flex-1 max-w-lg mx-4 hidden md:block">
            <form onSubmit={handleSearch} className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              </div>
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-300 shadow-sm hover:shadow-md focus:shadow-lg"
              />
            </form>
          </div>

          {/* Right side - Theme Toggle, Notifications and User Menu */}
          <div className="flex items-center space-x-4">
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 transition-all duration-300 hover:scale-110 hover:shadow-md"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </button>

            <button
              onClick={() => onViewChange('notifications')}
              className={`relative p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 transition-colors duration-200 ${
                currentView === 'notifications' ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/20' : ''
              }`}
            >
              <Bell className="h-6 w-6" />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </button>

            <div className="relative">
              <button
                onClick={() => onViewChange('profile')}
                className={`flex items-center space-x-2 p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 transition-colors duration-200 ${
                  currentView === 'profile' ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/20' : ''
                }`}
              >
                <User className="h-5 w-5" />
                <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {profile?.first_name}
                </span>
              </button>
            </div>

            <button
              onClick={handleSignOut}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 transition-colors duration-200"
              title="Sign out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

