/**
 * Brevo (Sendinblue) Email Service
 * 
 * Handles transactional emails for:
 * - Email verification (bypassing Supabase Auth)
 * - Password reset
 * - Welcome emails
 * - Notifications
 */

const BREVO_API_URL = 'https://api.brevo.com/v3'
const BREVO_API_KEY = process.env.BREVO_API_KEY

interface EmailRecipient {
  email: string
  name?: string
}

interface SendEmailOptions {
  to: EmailRecipient[]
  subject: string
  htmlContent?: string
  textContent?: string
  templateId?: number
  params?: Record<string, string | number>
}

interface BrevoResponse {
  messageId?: string
  error?: string
}

/**
 * Send an email using Brevo API
 */
async function sendEmail(options: SendEmailOptions): Promise<BrevoResponse> {
  if (!BREVO_API_KEY) {
    console.warn('BREVO_API_KEY not set, skipping email send')
    return { messageId: 'mock-message-id' }
  }

  const payload: Record<string, unknown> = {
    sender: {
      name: 'Vehicle Expense',
      email: process.env.BREVO_SENDER_EMAIL || 'noreply@vehicleexpense.co.za'
    },
    to: options.to,
    subject: options.subject
  }

  if (options.templateId) {
    payload.templateId = options.templateId
    payload.params = options.params || {}
  } else {
    payload.htmlContent = options.htmlContent
    payload.textContent = options.textContent
  }

  const response = await fetch(`${BREVO_API_URL}/smtp/email`, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': BREVO_API_KEY,
      'content-type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Brevo API error:', error)
    throw new Error(`Failed to send email: ${error}`)
  }

  return response.json()
}

/**
 * Send email verification email
 */
export async function sendVerificationEmail(
  email: string,
  name: string,
  verificationToken: string
): Promise<void> {
  const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email?token=${verificationToken}`

  await sendEmail({
    to: [{ email, name }],
    subject: 'Verify your email - Vehicle Expense',
    templateId: Number(process.env.BREVO_TEMPLATE_VERIFICATION) || undefined,
    params: {
      name,
      verification_url: verificationUrl
    },
    htmlContent: !process.env.BREVO_TEMPLATE_VERIFICATION ? `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button { 
            display: inline-block; 
            padding: 12px 24px; 
            background-color: #0070f3; 
            color: white !important; 
            text-decoration: none; 
            border-radius: 6px; 
            margin: 20px 0;
          }
          .footer { margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Welcome to Vehicle Expense!</h1>
          <p>Hi ${name},</p>
          <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
          <a href="${verificationUrl}" class="button">Verify Email</a>
          <p>Or copy and paste this link into your browser:</p>
          <p><a href="${verificationUrl}">${verificationUrl}</a></p>
          <p>This link will expire in 24 hours.</p>
          <div class="footer">
            <p>If you didn't create an account, you can safely ignore this email.</p>
            <p>Vehicle Expense - South African Vehicle Management</p>
          </div>
        </div>
      </body>
      </html>
    ` : undefined
  })
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  name: string,
  resetToken: string
): Promise<void> {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${resetToken}`

  await sendEmail({
    to: [{ email, name }],
    subject: 'Reset your password - Vehicle Expense',
    templateId: Number(process.env.BREVO_TEMPLATE_PASSWORD_RESET) || undefined,
    params: {
      name,
      reset_url: resetUrl
    },
    htmlContent: !process.env.BREVO_TEMPLATE_PASSWORD_RESET ? `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button { 
            display: inline-block; 
            padding: 12px 24px; 
            background-color: #0070f3; 
            color: white !important; 
            text-decoration: none; 
            border-radius: 6px; 
            margin: 20px 0;
          }
          .footer { margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Reset Your Password</h1>
          <p>Hi ${name},</p>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <a href="${resetUrl}" class="button">Reset Password</a>
          <p>Or copy and paste this link into your browser:</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          <p>This link will expire in 1 hour.</p>
          <div class="footer">
            <p>If you didn't request a password reset, you can safely ignore this email.</p>
            <p>Vehicle Expense - South African Vehicle Management</p>
          </div>
        </div>
      </body>
      </html>
    ` : undefined
  })
}

/**
 * Send welcome email after verification
 */
export async function sendWelcomeEmail(
  email: string,
  name: string,
  organizationName: string
): Promise<void> {
  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/login`

  await sendEmail({
    to: [{ email, name }],
    subject: 'Welcome to Vehicle Expense!',
    templateId: Number(process.env.BREVO_TEMPLATE_WELCOME) || undefined,
    params: {
      name,
      organization_name: organizationName,
      login_url: loginUrl
    },
    htmlContent: !process.env.BREVO_TEMPLATE_WELCOME ? `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button { 
            display: inline-block; 
            padding: 12px 24px; 
            background-color: #0070f3; 
            color: white !important; 
            text-decoration: none; 
            border-radius: 6px; 
            margin: 20px 0;
          }
          .features { margin: 20px 0; padding-left: 20px; }
          .footer { margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Welcome to Vehicle Expense!</h1>
          <p>Hi ${name},</p>
          <p>Your account for <strong>${organizationName}</strong> has been verified and is ready to use.</p>
          <p>With Vehicle Expense, you can:</p>
          <ul class="features">
            <li>Track fuel purchases and efficiency (km/L)</li>
            <li>Log mechanic services and maintenance</li>
            <li>Manage tyre purchases and rotations</li>
            <li>Record insurance, tracking, and e-toll expenses</li>
            <li>Keep a SARS-compliant logbook for tax deductions</li>
          </ul>
          <a href="${loginUrl}" class="button">Login to Dashboard</a>
          <div class="footer">
            <p>Need help? Contact us at support@vehicleexpense.co.za</p>
            <p>Vehicle Expense - South African Vehicle Management</p>
          </div>
        </div>
      </body>
      </html>
    ` : undefined
  })
}

/**
 * Send user invitation email
 */
export async function sendInvitationEmail(
  email: string,
  inviterName: string,
  organizationName: string,
  inviteToken: string
): Promise<void> {
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/accept-invite?token=${inviteToken}`

  await sendEmail({
    to: [{ email }],
    subject: `You've been invited to join ${organizationName} - Vehicle Expense`,
    htmlContent: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button { 
            display: inline-block; 
            padding: 12px 24px; 
            background-color: #0070f3; 
            color: white !important; 
            text-decoration: none; 
            border-radius: 6px; 
            margin: 20px 0;
          }
          .footer { margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>You've Been Invited!</h1>
          <p>${inviterName} has invited you to join <strong>${organizationName}</strong> on Vehicle Expense.</p>
          <p>Click the button below to create your account and get started:</p>
          <a href="${inviteUrl}" class="button">Accept Invitation</a>
          <p>Or copy and paste this link into your browser:</p>
          <p><a href="${inviteUrl}">${inviteUrl}</a></p>
          <p>This invitation will expire in 7 days.</p>
          <div class="footer">
            <p>If you weren't expecting this invitation, you can safely ignore this email.</p>
            <p>Vehicle Expense - South African Vehicle Management</p>
          </div>
        </div>
      </body>
      </html>
    `
  })
}
