export interface Profile {
  id: string
  email: string
  username: string
  first_name: string
  last_name: string
  full_name?: string
  bio?: string
  avatar_url?: string
  website?: string
  location?: string
  role: 'user' | 'admin' | 'moderator'
  is_private: boolean
  privacy_level: 'public' | 'private' | 'followers_only'
  email_verified: boolean
  followers_count: number
  following_count: number
  posts_count: number
  created_at: string
  updated_at: string
}

export interface Post {
  id: string
  content: string
  author_id: string
  image_url?: string
  category: 'general' | 'announcement' | 'question'
  is_active: boolean
  like_count: number
  comment_count: number
  created_at: string
  updated_at: string
  author?: Profile
}

export interface PostWithAuthor extends Post {
  author: Profile
}

export interface Follow {
  id: string
  follower_id: string
  following_id: string
  created_at: string
  follower?: Profile
  following?: Profile
}

export interface Like {
  id: string
  user_id: string
  post_id: string
  created_at: string
  user?: Profile
  post?: Post
}

export interface Comment {
  id: string
  content: string
  author_id: string
  post_id: string
  is_active: boolean
  created_at: string
  updated_at: string
  author?: Profile
  post?: Post
}

export interface Notification {
  id: string
  recipient_id: string
  sender_id: string
  notification_type: 'follow' | 'like' | 'comment' | 'mention'
  post_id?: string
  comment_id?: string
  message: string
  is_read: boolean
  created_at: string
  sender?: Profile
  post?: Post
}

export interface NotificationWithSender extends Notification {
  sender: Profile
}

export interface PasswordResetToken {
  id: string
  user_id: string
  token_hash: string
  expires_at: string
  used: boolean
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'id' | 'created_at' | 'updated_at' | 'followers_count' | 'following_count' | 'posts_count' | 'email_verified'>
        Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at' | 'followers_count' | 'following_count' | 'posts_count'>>
      }
      posts: {
        Row: Post
        Insert: Omit<Post, 'id' | 'created_at' | 'updated_at' | 'like_count' | 'comment_count'>
        Update: Partial<Omit<Post, 'id' | 'created_at' | 'updated_at' | 'like_count' | 'comment_count'>>
      }
      follows: {
        Row: Follow
        Insert: Omit<Follow, 'id' | 'created_at'>
        Update: Partial<Omit<Follow, 'id' | 'created_at'>>
      }
      likes: {
        Row: Like
        Insert: Omit<Like, 'id' | 'created_at'>
        Update: Partial<Omit<Like, 'id' | 'created_at'>>
      }
      comments: {
        Row: Comment
        Insert: Omit<Comment, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Comment, 'id' | 'created_at' | 'updated_at'>>
      }
      notifications: {
        Row: Notification
        Insert: Omit<Notification, 'id' | 'created_at'>
        Update: Partial<Omit<Notification, 'id' | 'created_at'>>
      }
      password_reset_tokens: {
        Row: PasswordResetToken
        Insert: Omit<PasswordResetToken, 'id' | 'created_at'>
        Update: Partial<Omit<PasswordResetToken, 'id' | 'created_at'>>
      }
    }
  }
}
