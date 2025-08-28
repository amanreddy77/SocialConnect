// Email service for SocialConnect
// In production, integrate with a real email service

// Send password reset email
export const sendPasswordResetEmail = async (
  email: string, 
  token: string, 
  userName: string
) => {
  try {
    // For now, we'll use console logging as a fallback
    // In production, you would integrate with a real email service
    
    console.log('📧 PASSWORD RESET EMAIL (Development Mode)')
    console.log('To:', email)
    console.log('Subject: Password Reset Request - SocialConnect')
    console.log('Token:', token)
    console.log('UserName:', userName)
    console.log('Reset Link:', `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/reset-password?token=${token}`)
    console.log('📧 End of Email')
    
    // TODO: Integrate with real email service
    // Options:
    // 1. SendGrid (recommended)
    // 2. AWS SES
    // 3. Resend
    // 4. Nodemailer with Gmail/Outlook
    
    // Example SendGrid integration:
    /*
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    
    const msg = {
      to: email,
      from: process.env.FROM_EMAIL,
      subject: 'Password Reset Request - SocialConnect',
      html: `<p>Hello ${userName},</p><p>Click this link to reset your password: ${resetLink}</p>`
    };
    
    await sgMail.send(msg);
    */
    
    return { success: true, message: 'Email logged to console (development mode)' }
    
  } catch (error) {
    console.error('Failed to send password reset email:', error)
    throw new Error('Failed to send password reset email')
  }
}

// Send welcome email
export const sendWelcomeEmail = async (email: string, userName: string) => {
  try {
    console.log('📧 WELCOME EMAIL (Development Mode)')
    console.log('To:', email)
    console.log('Subject: Welcome to SocialConnect!')
    console.log('UserName:', userName)
    console.log('📧 End of Email')
    
    // TODO: Integrate with real email service
    
    return { success: true, message: 'Welcome email logged to console (development mode)' }
    
  } catch (error) {
    console.error('Failed to send welcome email:', error)
    // Don't throw error for welcome email - it's not critical
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Test email service configuration
export const testEmailService = async () => {
  try {
    return { 
      success: true, 
      message: 'Email service is in development mode. Emails are logged to console.',
      mode: 'development',
      features: ['password_reset', 'welcome_email']
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

// Get email service status
export const getEmailServiceStatus = () => {
  return {
    mode: 'development',
    consoleLogging: true,
    realEmailService: false,
    message: 'Emails are logged to console. Configure a real email service for production.'
  }
}
