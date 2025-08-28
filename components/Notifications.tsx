'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Bell, Check, CheckCheck, Trash2, User, Heart, MessageCircle, UserPlus } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { toast } from 'react-hot-toast'

interface Notification {
  id: string
  recipient_id: string
  sender_id: string
  notification_type: 'follow' | 'like' | 'comment'
  post_id?: string
  message: string
  is_read: boolean
  created_at: string
  sender?: {
    id: string
    username: string
    first_name: string
    last_name: string
  }
}

export default function Notifications() {
  const { profile } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (profile) {
      fetchNotifications()
      setupRealtimeSubscription()
    }
  }, [profile])

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      console.log('Fetching notifications for user:', profile?.id)
      
      // First, try to fetch notifications without joins
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', profile?.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('Error fetching notifications:', error)
        throw error
      }

      console.log('Raw notifications fetched:', data?.length || 0)

              // If we have notifications, fetch sender profiles separately
        if (data && data.length > 0) {
          const senderIds = Array.from(new Set(data.map(n => n.sender_id)))
          const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, first_name, last_name')
          .in('id', senderIds)

        if (profilesError) {
          console.error('Error fetching sender profiles:', profilesError)
          // Continue with notifications even if profiles fail
        }

        // Transform notifications with sender info
        const transformedNotifications = data.map(notification => ({
          ...notification,
          sender: profiles?.find(p => p.id === notification.sender_id) || {
            id: notification.sender_id,
            username: 'Unknown User',
            first_name: 'Unknown',
            last_name: 'User'
          }
        }))

        setNotifications(transformedNotifications)
        
        // Count unread notifications
        const unread = transformedNotifications.filter(n => !n.is_read).length
        setUnreadCount(unread)
        
        console.log('Transformed notifications:', transformedNotifications.length)
      } else {
        setNotifications([])
        setUnreadCount(0)
        console.log('No notifications found')
      }
      
    } catch (error) {
      console.error('Error fetching notifications:', error)
      
      // Show more specific error message
      if (error instanceof Error) {
        if (error.message.includes('relation "notifications" does not exist')) {
          toast.error('Notification system not set up. Please contact admin.')
        } else if (error.message.includes('permission denied')) {
          toast.error('Permission denied. Please check your access.')
        } else {
          toast.error(`Error: ${error.message}`)
        }
      } else {
        toast.error('Error loading notifications')
      }
      
      setNotifications([])
      setUnreadCount(0)
    } finally {
      setLoading(false)
    }
  }

  const setupRealtimeSubscription = () => {
    if (!profile) return

    try {
      const subscription = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `recipient_id=eq.${profile.id}`
          },
          (payload) => {
            console.log('New notification received:', payload)
            
            // Fetch the new notification with sender info
            fetchNewNotification(payload.new.id)
            
            // Show toast for new notification
            const newNotification = payload.new as Notification
            toast.success(newNotification.message, {
              duration: 4000,
              icon: getNotificationIcon(newNotification.notification_type)
            })
          }
        )
        .subscribe((status) => {
          console.log('Notification subscription status:', status)
          if (status === 'CHANNEL_ERROR') {
            console.error('Notification subscription error')
            toast.error('Notification connection error')
          }
        })

      return () => {
        subscription.unsubscribe()
      }
    } catch (error) {
      console.error('Error setting up notification subscription:', error)
      toast.error('Failed to setup real-time notifications')
    }
  }

  const fetchNewNotification = async (notificationId: string) => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          sender:profiles!notifications_sender_id_fkey (
            id,
            username,
            first_name,
            last_name
          )
        `)
        .eq('id', notificationId)
        .single()

      if (error) {
        console.error('Error fetching new notification:', error)
        return
      }

      // Add new notification to the top of the list
      const newNotification = {
        ...data,
        sender: data.sender || {
          id: data.sender_id,
          username: 'Unknown User',
          first_name: 'Unknown',
          last_name: 'User'
        }
      }

      setNotifications(prev => [newNotification, ...prev])
      setUnreadCount(prev => prev + 1)
      
    } catch (error) {
      console.error('Error fetching new notification:', error)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)

      if (error) {
        console.error('Error marking notification as read:', error)
        throw error
      }

      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      )
      
      setUnreadCount(prev => Math.max(0, prev - 1))
      
    } catch (error) {
      console.error('Error marking notification as read:', error)
      toast.error('Error updating notification')
    }
  }

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('recipient_id', profile?.id)
        .eq('is_read', false)

      if (error) {
        console.error('Error marking all notifications as read:', error)
        throw error
      }

      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      )
      
      setUnreadCount(0)
      toast.success('All notifications marked as read')
      
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      toast.error('Error updating notifications')
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)

      if (error) {
        console.error('Error deleting notification:', error)
        throw error
      }

      // Update local state
      const deletedNotification = notifications.find(n => n.id === notificationId)
      if (deletedNotification && !deletedNotification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
      
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      toast.success('Notification deleted')
      
    } catch (error) {
      console.error('Error deleting notification:', error)
      toast.error('Error deleting notification')
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'follow':
        return <UserPlus className="h-4 w-4 text-blue-500" />
      case 'like':
        return <Heart className="h-4 w-4 text-red-500" />
      case 'comment':
        return <MessageCircle className="h-4 w-4 text-green-500" />
      default:
        return <Bell className="h-4 w-4 text-gray-500" />
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'follow':
        return 'bg-blue-50 border-blue-200'
      case 'like':
        return 'bg-red-50 border-red-200'
      case 'comment':
        return 'bg-green-50 border-green-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex flex-col justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-4"></div>
          <p className="text-gray-500">Loading notifications...</p>
          <p className="text-sm text-gray-400 mt-2">This may take a few seconds</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Bell className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            <p className="text-gray-600">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
            </p>
          </div>
        </div>
        
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 flex items-center space-x-2"
          >
            <CheckCheck className="h-4 w-4" />
            <span>Mark All Read</span>
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications yet</h3>
            <p className="text-gray-500">You'll see notifications here when people interact with your content.</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg border ${getNotificationColor(notification.notification_type)} ${
                !notification.is_read ? 'ring-2 ring-primary-200' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.notification_type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-gray-900">
                        {notification.sender?.first_name} {notification.sender?.last_name}
                      </span>
                      <span className="text-gray-500">@{notification.sender?.username}</span>
                    </div>
                    
                    <p className="text-gray-700 mb-2">{notification.message}</p>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>{formatDate(notification.created_at)}</span>
                      {!notification.is_read && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                          New
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  {!notification.is_read && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-full"
                      title="Mark as read"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                  
                  <button
                    onClick={() => deleteNotification(notification.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                    title="Delete notification"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Load More Button */}
      {notifications.length >= 50 && (
        <div className="text-center mt-6">
          <button
            onClick={fetchNotifications}
            className="px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-500"
          >
            Load More Notifications
          </button>
        </div>
      )}
    </div>
  )
}

