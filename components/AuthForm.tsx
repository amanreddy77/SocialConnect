'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { showToastFor } from '@/lib/toastUtils'
import { Eye, EyeOff, Mail, User, Lock, UserPlus } from 'lucide-react'

export default function AuthForm() {
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    firstName: '',
    lastName: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isLogin) {
        // Login
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        })

        if (error) throw error
        showToastFor.login()
        
        // Force a page refresh to ensure proper state update
        setTimeout(() => {
          window.location.reload()
        }, 1000)
        
      } else {
        // Register
        const { data: { user }, error: signUpError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
        })

        if (signUpError) {
          // Handle specific registration errors
          if (signUpError.message.includes('User already registered')) {
            throw new Error('An account with this email already exists. Please try logging in instead.')
          } else if (signUpError.message.includes('Password should be at least')) {
            throw new Error('Password must be at least 6 characters long.')
          } else if (signUpError.message.includes('Invalid email')) {
            throw new Error('Please enter a valid email address.')
          } else {
            throw signUpError
          }
        }

        if (user) {
          // Wait a moment for the auth session to be established
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          // Try to create profile with retry logic
          let profileError = null
          let retryCount = 0
          const maxRetries = 3
          
          while (retryCount < maxRetries) {
            try {
              const { error } = await supabase
                .from('profiles')
                .insert({
                  id: user.id,
                  email: formData.email,
                  username: formData.username,
                  first_name: formData.firstName,
                  last_name: formData.lastName,
                  role: 'user',
                  bio: '',
                  avatar_url: '',
                  website: '',
                  location: '',
                  is_private: false,
                  followers_count: 0,
                  following_count: 0,
                  posts_count: 0
                })
              
              profileError = error
              if (!error) break // Success, exit retry loop
              
            } catch (err) {
              profileError = err
            }
            
            retryCount++
            if (retryCount < maxRetries) {
              // Wait before retry
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
            }
          }

          if (profileError) {
            console.error('Profile creation error after retries:', profileError)
            
            // Handle specific profile creation errors
            const errorMessage = profileError instanceof Error ? profileError.message : String(profileError)
            
            if (errorMessage.includes('duplicate key')) {
              throw new Error('Username is already taken. Please choose a different username.')
            } else if (errorMessage.includes('violates not-null constraint')) {
              throw new Error('Please fill in all required fields.')
            } else if (errorMessage.includes('violates row-level security policy')) {
              throw new Error('Profile creation failed due to security policy. Please contact support or try again.')
            } else {
              throw new Error('Failed to create profile: ' + errorMessage)
            }
          }

          showToastFor.register()
          
          // Clear form and switch to login
          setFormData({
            email: '',
            username: '',
            password: '',
            firstName: '',
            lastName: ''
          })
          setIsLogin(true)
        }
      }
    } catch (error: any) {
      console.error('Authentication error:', error)
      showToastFor.genericError(error.message || 'An error occurred during authentication')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isLogin ? 'Sign in to your account' : 'Create your account'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            {!isLogin && (
              <>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                      name="firstName"
                      type="text"
                      required={!isLogin}
                      className="appearance-none rounded-none relative block w-full px-10 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                      placeholder="First name"
                      value={formData.firstName}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="relative flex-1">
                    <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                      name="lastName"
                      type="text"
                      required={!isLogin}
                      className="appearance-none rounded-none relative block w-full px-10 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                      placeholder="Last name"
                      value={formData.lastName}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    name="username"
                    type="text"
                    required={!isLogin}
                    className="appearance-none rounded-none relative block w-full px-10 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                    placeholder="Username"
                    value={formData.username}
                    onChange={handleInputChange}
                  />
                </div>
              </>
            )}
            
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                name="email"
                type="email"
                required
                className={`appearance-none rounded-none relative block w-full px-10 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 ${!isLogin ? 'rounded-none' : 'rounded-t-md'} focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm`}
                placeholder="Email address"
                value={formData.email}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                required
                className="appearance-none rounded-none relative block w-full px-10 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={formData.password}
                onChange={handleInputChange}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  {isLogin ? (
                    <>
                      <Lock className="h-5 w-5 mr-2" />
                      Sign in
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-5 w-5 mr-2" />
                      Sign up
                    </>
                  )}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

