'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Menu, Search, Bell, User, LogOut } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface NavigationProps {
  onViewChange: (view: any) => void
  currentView: string
  onMenuClick: () => void
  onSearch: (query: string) => void
}

export default function Navigation({ onViewChange, currentView, onMenuClick, onSearch }: NavigationProps) {
  const { profile, signOut } = useAuth()
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
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Logo and Menu */}
          <div className="flex items-center">
            <button
              onClick={onMenuClick}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 md:hidden"
            >
              <Menu className="h-6 w-6" />
            </button>
            
            <div className="flex-shrink-0 flex items-center">
              <h1 
                className="text-xl font-bold text-primary-600 cursor-pointer"
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
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </form>
          </div>

          {/* Right side - Notifications and User Menu */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => onViewChange('notifications')}
              className={`relative p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 ${
                currentView === 'notifications' ? 'text-primary-600 bg-primary-50' : ''
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
                className={`flex items-center space-x-2 p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 ${
                  currentView === 'profile' ? 'text-primary-600 bg-primary-50' : ''
                }`}
              >
                <User className="h-5 w-5" />
                <span className="hidden sm:block text-sm font-medium text-gray-700">
                  {profile?.first_name}
                </span>
              </button>
            </div>

            <button
              onClick={handleSignOut}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
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

