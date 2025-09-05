'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Home, User, Bell, Settings, Shield, X, Search, Database } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  onViewChange: (view: any) => void
  currentView: string
  isAdmin: boolean
}

export default function Sidebar({ isOpen, onClose, onViewChange, currentView, isAdmin }: SidebarProps) {
  const { profile } = useAuth()
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)

  useEffect(() => {
    if (profile) {
      fetchFollowerCounts()
    }
  }, [profile])

  const fetchFollowerCounts = async () => {
    try {
      // Get followers count
      const { count: followers, error: followersError } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', profile?.id)

      if (!followersError) {
        setFollowerCount(followers || 0)
      }

      // Get following count
      const { count: following, error: followingError } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', profile?.id)

      if (!followingError) {
        setFollowingCount(following || 0)
      }
    } catch (error) {
      console.error('Error fetching follower counts:', error)
    }
  }

  // Listen for profile count refresh events
  useEffect(() => {
    const handleRefreshProfileCounts = () => {
      fetchFollowerCounts()
    }

    window.addEventListener('refreshProfileCounts', handleRefreshProfileCounts)
    return () => {
      window.removeEventListener('refreshProfileCounts', handleRefreshProfileCounts)
    }
  }, [profile])

  const navigationItems = [
    { id: 'feed', label: 'Home', icon: Home },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'data', label: 'API Data', icon: Database },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin Panel', icon: Shield }] : []),
  ]

  const handleItemClick = (viewId: string) => {
    onViewChange(viewId)
    onClose()
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md shadow-2xl border-r border-gray-200/50 dark:border-gray-700/50 transform transition-all duration-300 ease-in-out md:relative md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Menu</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 md:hidden transition-all duration-300 hover:scale-110"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* User Info */}
          <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-blue-600 dark:from-primary-400 dark:to-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-sm">
                    {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                  </span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {profile?.first_name} {profile?.last_name}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  @{profile?.username}
                </p>
                <div className="flex space-x-4 mt-2 text-xs text-gray-400 dark:text-gray-500">
                  <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">{followerCount} followers</span>
                  <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">{followingCount} following</span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-6 space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon
              const isActive = currentView === item.id
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className={cn(
                    "group flex items-center px-4 py-3 text-sm font-medium rounded-xl w-full text-left transition-all duration-300 hover:scale-105",
                    isActive
                      ? "bg-gradient-to-r from-primary-500 to-blue-600 text-white shadow-lg transform scale-105"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-100 hover:shadow-md"
                  )}
                >
                  <Icon
                    className={cn(
                      "mr-3 h-5 w-5 transition-all duration-300",
                      isActive 
                        ? "text-white" 
                        : "text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300"
                    )}
                  />
                  {item.label}
                </button>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center font-medium">
              SocialConnect v1.0
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

