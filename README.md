# 🚀 SocialConnect - Social Media Platform

A modern, scalable social media platform built with Next.js, TypeScript, and Supabase.

## ✨ Features

- **🔐 Authentication**: Secure user registration, login, and password reset
- **👥 Social Features**: Follow users, like posts, comment, and real-time notifications
- **📱 Content Management**: Create, edit, and delete posts with image support
- **🔍 Search & Discovery**: Find users and discover content
- **👨‍💼 Admin Panel**: Comprehensive user and content management
- **🔒 Security**: Row Level Security, input validation, and XSS protection
- **📱 Responsive**: Mobile-first design with Tailwind CSS

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Realtime
- **Storage**: Supabase Storage
- **Deployment**: Vercel

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- Supabase account
- Vercel account (for deployment)

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd socialconnect
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Copy the environment template and fill in your values:

```bash
cp env.example .env.local
```

Update `.env.local` with your Supabase credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
# For development only - use your production URL in production
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Database Setup

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run the `supabase-setup.sql` script to create all tables and policies

### 5. Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🗄️ Database Schema

The application uses a well-structured PostgreSQL schema with:

- **profiles**: User information and settings
- **posts**: User-generated content
- **comments**: Post interactions
- **likes**: Content engagement
- **follows**: User relationships
- **notifications**: Real-time updates
- **password_reset_tokens**: Secure password recovery

## 🔐 Authentication

- **JWT-based** authentication with Supabase
- **Email verification** for new accounts
- **Password reset** via secure tokens
- **Session management** with automatic refresh
- **Role-based access** control (user, moderator, admin)

### Email Configuration

**Supabase Auth Emails**: When users sign up, Supabase automatically sends confirmation emails. To ensure these emails contain the correct URLs:

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **URL Configuration**
3. Set **Site URL** to your production domain (e.g., `https://your-app.vercel.app`)
4. Set **Redirect URLs** to include your production domain
5. Update **Email Templates** if you want to customize the email content

**Password Reset Emails**: The application also sends password reset emails through the email service. Ensure `NEXT_PUBLIC_APP_URL` is set to your production URL.

## 🚀 Deployment

### Vercel Deployment

1. **Connect Repository**: Link your GitHub repo to Vercel
2. **Environment Variables**: Add all variables from `.env.local`
3. **Build Command**: `npm run build`
4. **Output Directory**: `.next`
5. **Deploy**: Vercel will automatically deploy on push to main branch

### Environment Variables for Production

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

**Important**: The `NEXT_PUBLIC_APP_URL` must be set to your deployed application URL (e.g., `https://your-app.vercel.app`) for email confirmations and password reset links to work correctly in production. Do not use localhost URLs in production.

## 🏗️ Project Structure

```
├── app/                    # Next.js app directory
├── components/            # React components
├── hooks/                 # Custom React hooks
├── lib/                   # Utility functions
├── types/                 # TypeScript type definitions
├── supabase-setup.sql     # Database schema
└── README.md             # This file
```

## 🔒 Security Features

- **Row Level Security** (RLS) policies
- **Input validation** and sanitization
- **XSS protection** with security headers
- **Rate limiting** configuration
- **Secure file uploads** with validation
- **Environment variable** protection

## 📱 Features

### User Features
- ✅ User registration and authentication
- ✅ Profile creation and management
- ✅ Post creation with image support
- ✅ Follow/unfollow users
- ✅ Like and comment on posts
- ✅ Real-time notifications
- ✅ User search and discovery

### Admin Features
- ✅ User management (activate, deactivate, delete)
- ✅ Content moderation
- ✅ Platform statistics
- ✅ Post management
- ✅ User role management

## 👑 Admin Access Setup

### Setting Admin Role

#### Method 1: Database Direct Update (Recommended)
1. **Access Supabase Dashboard**: Go to your Supabase project dashboard
2. **Open SQL Editor**: Navigate to SQL Editor in the left sidebar
3. **Run Admin Update Query**:
```sql
-- Make a user admin by email
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'your-email@example.com';

-- Or make a user admin by username
UPDATE profiles 
SET role = 'admin' 
WHERE username = 'your_username';
```

#### Method 2: Using Supabase Service Role
1. **Get Service Role Key**: Copy from Project Settings > API
2. **Use Admin Panel**: The admin panel automatically uses service role permissions
3. **Verify Role**: Check that your user shows as admin in the profiles table

### Admin Panel Access

1. **Login**: Sign in with your admin account
2. **Navigate**: Click on "Admin Panel" in the navigation
3. **Permissions**: Admin panel is only visible to users with `role = 'admin'`

### Admin Capabilities

#### User Management
- **View All Users**: See complete user list with profiles
- **Delete Users**: Permanently remove users and all associated data
- **User Statistics**: View follower counts, post counts, and activity

#### Content Management
- **View All Posts**: Access to all posts (active and deleted)
- **Delete Posts**: Remove inappropriate or spam content
- **Post Statistics**: See like counts, comment counts, and engagement

#### Platform Control
- **Content Moderation**: Remove users and content that violate guidelines
- **Data Overview**: Monitor platform usage and user activity
- **System Health**: Track active users, posts, and engagement metrics

### Admin Security

- **Role Verification**: Admin status is verified on both client and server
- **Service Role Access**: Admin operations use elevated database permissions
- **Audit Trail**: All admin actions are logged for security purposes

### Troubleshooting Admin Access

#### "Not Authorized" Error
1. **Check Role**: Verify your user has `role = 'admin'` in the profiles table
2. **Refresh Session**: Log out and log back in to refresh authentication
3. **Database Permissions**: Ensure RLS policies allow admin access

#### Admin Panel Not Visible
1. **Role Check**: Confirm your user role is set to 'admin'
2. **Authentication**: Ensure you're properly logged in
3. **Page Refresh**: Refresh the page after role changes

#### Cannot Delete Users/Posts
1. **Service Role**: Verify SUPABASE_SERVICE_ROLE_KEY is set in environment
2. **Permissions**: Check that RLS policies allow admin operations
3. **Database Connection**: Ensure admin panel can connect to database

## 🧪 Testing

```bash
# Run linting
npm run lint

# Build for production
npm run build
```

## 🔧 Troubleshooting

### Email Issues

**Confirmation emails contain localhost URLs:**
1. Check your Supabase project's **Authentication** → **URL Configuration**
2. Ensure **Site URL** is set to your production domain
3. Verify `NEXT_PUBLIC_APP_URL` environment variable is set to your production URL
4. Clear browser cache and test with a new email

**Password reset emails not working:**
1. Verify `NEXT_PUBLIC_APP_URL` is set correctly in your environment
2. Check that the email service is properly configured
3. Ensure your production domain is accessible and SSL is configured

## 📄 License

This project is licensed under the MIT License.



For support, please open an issue in the GitHub repository.

---

**Built using Next.js, TypeScript, and Supabase**

