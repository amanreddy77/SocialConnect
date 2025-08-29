'use client'

import { useAuth } from '@/hooks/useAuth'
import AuthForm from '@/components/AuthForm'
import MainApp from '@/components/MainApp'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function Home() {
  const { user, profile, loading, error, retryAuth, isInitialized } = useAuth()

  console.log('Home page render:', { user: !!user, profile: !!profile, loading, error, isInitialized })

  // Show test component first to debug connection
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-8">
          SocialConnect
        </h1>
        
        {loading && !isInitialized ? (
          <div className="text-center py-12">
            <LoadingSpinner />
            <p className="mt-4 text-gray-600">Initializing authentication...</p>
            <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
          </div>
        ) : !user ? (
          <div>
            <h2 className="text-xl font-semibold mb-4">Authentication</h2>
            <AuthForm />
          </div>
        ) : !profile ? (
          <div className="text-center py-12">
            <LoadingSpinner />
            <p className="mt-4 text-gray-600">Loading your profile...</p>
            <p className="text-sm text-gray-500 mt-2">Setting up your account</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Error</h2>
            <p className="text-gray-500 mb-4">{error}</p>
            <div className="space-x-4">
              <button 
                onClick={retryAuth}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                Try Again
              </button>
              <button 
                onClick={() => window.location.reload()} 
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Refresh Page
              </button>
            </div>
          </div>
        ) : (
          <MainApp key={profile?.id} />
        )}
      </div>
    </div>
  )
}
