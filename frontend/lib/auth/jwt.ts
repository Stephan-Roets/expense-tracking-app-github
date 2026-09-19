import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { UserRole, OrganizationMode, type JWTPayload } from '@/lib/types/database'

const JWT_SECRET = process.env.JWT_SECRET || 'local-development-jwt-secret-key-for-testing-only-change-in-production'

const ACCESS_TOKEN_EXPIRY = '15m'
const REFRESH_TOKEN_EXPIRY = '7d'

export interface TokenPayload extends JWTPayload {
  type: 'access' | 'refresh'
}

/**
 * Generate an access token with user and organization claims
 */
export function generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(
    {
      ...payload,
      type: 'access'
    },
    JWT_SECRET,
    {
      expiresIn: ACCESS_TOKEN_EXPIRY,
      algorithm: 'HS256'
    }
  )
}

/**
 * Generate a refresh token (minimal claims)
 */
export function generateRefreshToken(userId: string): string {
  return jwt.sign(
    {
      sub: userId,
      type: 'refresh'
    },
    JWT_SECRET,
    {
      expiresIn: REFRESH_TOKEN_EXPIRY,
      algorithm: 'HS256'
    }
  )
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as any
    return decoded as TokenPayload
  } catch {
    return null
  }
}

/**
 * Get the current authenticated user from cookies
 */
export async function getAuthUser(): Promise<JWTPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value

  if (!token) {
    return null
  }

  const payload = verifyToken(token)
  if (!payload || payload.type !== 'access') {
    return null
  }

  return {
    sub: payload.sub,
    email: payload.email,
    organizationId: payload.organizationId,
    role: payload.role as UserRole,
    mode: payload.mode as OrganizationMode,
    iat: payload.iat!,
    exp: payload.exp!
  }
}

/**
 * Set authentication cookies
 */
export async function setAuthCookies(accessToken: string, refreshToken: string): Promise<void> {
  const cookieStore = await cookies()
  
  cookieStore.set('access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60, // 15 minutes
    path: '/'
  })

  cookieStore.set('refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/'
  })
}

/**
 * Clear authentication cookies
 */
export async function clearAuthCookies(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete('access_token')
  cookieStore.delete('refresh_token')
}

/**
 * Middleware helper to require authentication
 */
export async function requireAuth(): Promise<JWTPayload> {
  const user = await getAuthUser()
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}

/**
 * Middleware helper to require specific role
 */
export async function requireRole(...roles: UserRole[]): Promise<JWTPayload> {
  const user = await requireAuth()
  if (!roles.includes(user.role)) {
    throw new Error('Forbidden')
  }
  return user
}
