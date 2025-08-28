'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { toast } from 'react-hot-toast'

export default function NotificationTest() {
  const { profile } = useAuth()
  const [testResult, setTestResult] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const testNotificationsTable = async () => {
    setLoading(true)
    setTestResult('')
    
    try {
      // Test 1: Check if table exists
      const { data: tableCheck, error: tableError } = await supabase
        .from('notifications')
        .select('count', { count: 'exact', head: true })

      if (tableError) {
        setTestResult(`❌ Table Error: ${tableError.message}`)
        return
      }

      setTestResult(`✅ Table exists, count: ${tableCheck || 0}\n`)

      // Test 2: Try to insert a test notification
      const { data: insertData, error: insertError } = await supabase
        .from('notifications')
        .insert({
          recipient_id: profile?.id,
          sender_id: profile?.id,
          notification_type: 'follow',
          message: 'Test notification from test component'
        })
        .select()

      if (insertError) {
        setTestResult(prev => prev + `❌ Insert Error: ${insertError.message}\n`)
      } else {
        setTestResult(prev => prev + `✅ Insert successful: ${insertData?.length || 0} rows\n`)
      }

      // Test 3: Try to fetch notifications
      const { data: fetchData, error: fetchError } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', profile?.id)
        .limit(5)

      if (fetchError) {
        setTestResult(prev => prev + `❌ Fetch Error: ${fetchError.message}\n`)
      } else {
        setTestResult(prev => prev + `✅ Fetch successful: ${fetchData?.length || 0} notifications\n`)
      }

      // Test 4: Check permissions
      const { data: permData, error: permError } = await supabase
        .from('notifications')
        .select('*')
        .limit(1)

      if (permError) {
        setTestResult(prev => prev + `❌ Permission Error: ${permError.message}\n`)
      } else {
        setTestResult(prev => prev + `✅ Permissions OK\n`)
      }

    } catch (error) {
      setTestResult(`❌ Unexpected Error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const createTestNotification = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          recipient_id: profile?.id,
          sender_id: profile?.id,
          notification_type: 'follow',
          message: 'Manual test notification'
        })

      if (error) {
        toast.error(`Error: ${error.message}`)
      } else {
        toast.success('Test notification created!')
        testNotificationsTable()
      }
    } catch (error) {
      toast.error(`Error: ${error}`)
    }
  }

  const clearTestNotifications = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('message', 'Test notification from test component')
        .eq('message', 'Manual test notification')

      if (error) {
        toast.error(`Error: ${error.message}`)
      } else {
        toast.success('Test notifications cleared!')
        setTestResult('')
      }
    } catch (error) {
      toast.error(`Error: ${error}`)
    }
  }

  if (!profile) {
    return <div className="p-4 text-center">Please sign in to test notifications</div>
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-xl font-bold mb-4">Notification System Test</h2>
      
      <div className="space-y-4">
        <button
          onClick={testNotificationsTable}
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Notifications Table'}
        </button>

        <button
          onClick={createTestNotification}
          className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          Create Test Notification
        </button>

        <button
          onClick={clearTestNotifications}
          className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Clear Test Notifications
        </button>
      </div>

      {testResult && (
        <div className="mt-6 p-4 bg-gray-100 rounded-md">
          <h3 className="font-semibold mb-2">Test Results:</h3>
          <pre className="whitespace-pre-wrap text-sm">{testResult}</pre>
        </div>
      )}

      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
        <h3 className="font-semibold text-yellow-800 mb-2">Debug Info:</h3>
        <p className="text-sm text-yellow-700">
          User ID: {profile.id}<br/>
          Username: {profile.username}<br/>
          Email: {profile.email}
        </p>
      </div>
    </div>
  )
}
