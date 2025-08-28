'use client'

import { useState, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Post } from '@/types/database'
import { showToastFor, showToast } from '@/lib/toastUtils'
import { Image, X, Send } from 'lucide-react'

interface CreatePostProps {
  onPostCreated: (post: Post) => void
}

export default function CreatePost({ onPostCreated }: CreatePostProps) {
  const { profile } = useAuth()
  const [content, setContent] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [category, setCategory] = useState<'general' | 'announcement' | 'question'>('general')
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      showToast.error('Please select a JPEG or PNG image')
      return
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      showToast.error('Image size must be less than 2MB')
      return
    }

    setImageFile(file)
    
    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!content.trim()) {
      showToast.error('Please write something to post')
      return
    }

    if (content.length > 280) {
      showToast.error('Post content must be less than 280 characters')
      return
    }

    setLoading(true)

    try {
      let imageUrl = null

      // Upload image if selected
      if (imageFile) {
        const fileName = `${Date.now()}-${imageFile.name}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('post-images')
          .upload(fileName, imageFile)

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage
          .from('post-images')
          .getPublicUrl(fileName)

        imageUrl = urlData.publicUrl
      }

      // Create post
      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({
          content: content.trim(),
          author_id: profile?.id,
          image_url: imageUrl,
          category,
          like_count: 0,
          comment_count: 0
        })
        .select()
        .single()

      if (postError) throw postError

      // Reset form
      setContent('')
      setImageFile(null)
      setImagePreview(null)
      setCategory('general')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      // Notify parent component
      onPostCreated(post)
    } catch (error: any) {
      console.error('Error creating post:', error)
      showToast.error(error.message || 'Error creating post')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-primary-600 font-semibold text-sm">
              {profile?.first_name?.[0]}{profile?.last_name?.[0]}
            </span>
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm resize-none"
            rows={3}
            maxLength={280}
          />
          
          <div className="flex justify-between items-center mt-2">
            <div className="flex items-center space-x-4">
              <label className="cursor-pointer">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <Image className="h-5 w-5 text-gray-400 hover:text-primary-500" />
              </label>
              
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="text-sm border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="general">General</option>
                <option value="announcement">Announcement</option>
                <option value="question">Question</option>
              </select>
            </div>
            
            <div className="text-sm text-gray-500">
              {content.length}/280
            </div>
          </div>
        </div>
      </div>

      {/* Image Preview */}
      {imagePreview && (
        <div className="relative inline-block">
          <img
            src={imagePreview}
            alt="Preview"
            className="max-w-xs rounded-lg"
          />
          <button
            type="button"
            onClick={removeImage}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading || !content.trim()}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          Post
        </button>
      </div>
    </form>
  )
}

