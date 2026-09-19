import { API_URL } from '@/lib/api/client'

/** Spring Boot AuthResponse — flat JSON (no nested `user`). */
export interface SpringAuthPayload {
  accessToken: string
  refreshToken?: string
  userId: string
  email: string
  firstName: string
  lastName: string
  role: string
  organizationId: string
  organizationName: string
  organizationMode: string
  verificationToken?: string
  emailSent?: boolean
  profilePhotoUrl?: string
  passwordChanged?: boolean
}

export interface NormalizedAuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  organizationId: string
  organizationName: string
  organizationMode: string
  organizationOwnerId?: string
  profilePhotoUrl?: string
  passwordChanged?: boolean
}

export interface NormalizedAuthResponse {
  accessToken: string
  refreshToken?: string
  user: NormalizedAuthUser
  verificationToken?: string
  emailSent?: boolean
}

function isFlatSpringAuth(data: Record<string, unknown>): data is Record<string, unknown> & SpringAuthPayload {
  return typeof data.accessToken === 'string' && data.user === undefined
}

// Helper to convert relative profile photo URLs to absolute URLs
function convertProfilePhotoUrl(url: string | undefined): string | undefined {
  if (!url) return undefined
  if (url.startsWith('/api/v1/storage/')) {
    // Remove /api/v1 prefix since API_URL already includes it
    const storagePath = url.replace('/api/v1', '')
    return `${API_URL}${storagePath}`
  }
  return url
}

export function normalizeAuthResponse(raw: unknown): NormalizedAuthResponse {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid auth response from server')
  }

  const data = raw as Record<string, unknown>

  if (data.user && typeof data.user === 'object') {
    const u = data.user as Record<string, unknown>
    return {
      accessToken: String(data.accessToken),
      refreshToken: data.refreshToken ? String(data.refreshToken) : undefined,
      verificationToken: data.verificationToken ? String(data.verificationToken) : undefined,
      emailSent: data.emailSent !== undefined ? Boolean(data.emailSent) : undefined,
      user: {
        id: String(u.id ?? u.userId),
        email: String(u.email),
        firstName: String(u.firstName),
        lastName: String(u.lastName),
        role: String(u.role),
        organizationId: String(u.organizationId),
        organizationName: String(u.organizationName ?? ''),
        organizationMode: String(u.organizationMode),
        organizationOwnerId: u.organizationOwnerId ? String(u.organizationOwnerId) : undefined,
        profilePhotoUrl: convertProfilePhotoUrl(u.profilePhotoUrl ? String(u.profilePhotoUrl) : undefined),
        passwordChanged: u.passwordChanged !== undefined ? Boolean(u.passwordChanged) : true,
      },
    }
  }

  if (!isFlatSpringAuth(data)) {
    throw new Error('Invalid auth response from server')
  }

  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    verificationToken: data.verificationToken ? String(data.verificationToken) : undefined,
    emailSent: data.emailSent !== undefined ? Boolean(data.emailSent) : undefined,
    user: {
      id: String(data.userId),
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      organizationId: String(data.organizationId),
      organizationName: data.organizationName,
      organizationMode: data.organizationMode,
      organizationOwnerId: data.organizationOwnerId ? String(data.organizationOwnerId) : undefined,
      profilePhotoUrl: convertProfilePhotoUrl(data.profilePhotoUrl ? String(data.profilePhotoUrl) : undefined),
      passwordChanged: data.passwordChanged !== undefined ? Boolean(data.passwordChanged) : true,
    },
  }
}

export function persistAuthSession(auth: NormalizedAuthResponse): void {
  localStorage.setItem('jwt_token', auth.accessToken)
  localStorage.setItem('role', auth.user.role)
  localStorage.setItem('org_mode', auth.user.organizationMode)
  localStorage.setItem('user_profile', JSON.stringify(auth.user))
  if (auth.refreshToken) {
    localStorage.setItem('refresh_token', auth.refreshToken)
  }
  // Set client cookie so Next.js middleware can read role for route guards
  if (typeof document !== 'undefined') {
    const maxAge = 7 * 24 * 60 * 60
    const roleCookie = `auth_role=${auth.user.role};path=/;max-age=${maxAge};SameSite=Lax`
    const orgCookie = `auth_org_mode=${auth.user.organizationMode};path=/;max-age=${maxAge};SameSite=Lax`
    document.cookie = roleCookie
    document.cookie = orgCookie
  }
}

export function clearAuthCookies(): void {
  if (typeof document !== 'undefined') {
    document.cookie = 'auth_role=;path=/;max-age=0;SameSite=Lax'
    document.cookie = 'auth_org_mode=;path=/;max-age=0;SameSite=Lax'
  }
}
