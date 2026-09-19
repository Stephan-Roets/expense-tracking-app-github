import jwt from 'jsonwebtoken'
import { UserRole, OrganizationMode, type JWTPayload } from '@/lib/types/database'

const JWT_SECRET = process.env.JWT_SECRET || Buffer.from('ZGVmYXVsdC1zZWNyZXQta2V5LWZvci1kZXZlbG9wbWVudC1vbmx5', 'base64').toString()

const ACCESS_TOKEN_EXPIRY = '15m' // Short expiry for testing

/**
 * Generate JWT token for testing (no cookies)
 */
export function generateTestToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
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
 * Get Authorization header for testing
 */
export function getTestAuthHeader(userEmail: string): string {
  // Mock user data for testing
  const testUsers = {
    'stefanroetscode@gmail.com': {
      sub: '7925a1b9-7a96-452a-bc19-df4e2135d3c1',
      email: 'stefanroetscode@gmail.com',
      organizationId: 'b32e54c4-1f12-42ea-8bd4-2511f1f962bd',
      role: UserRole.DRIVER,
      mode: OrganizationMode.SOLO
    },
    'admin@example.com': {
      sub: 'b0000000-0000-0000-0000-000000000001',
      email: 'admin@example.com',
      organizationId: 'b32e54c4-1f12-42ea-8bd4-2511f1f962bd',
      role: UserRole.ADMIN,
      mode: OrganizationMode.BUSINESS_FLEET
    }
  }

  const user = testUsers[userEmail as keyof typeof testUsers]
  if (!user) {
    throw new Error(`Test user ${userEmail} not found`)
  }

  const token = generateTestToken(user)
  return `Bearer ${token}`
}

/**
 * Test API call helper
 */
export async function testApiCall(endpoint: string, userEmail: string): Promise<Response> {
  const authHeader = getTestAuthHeader(userEmail)
  
  return fetch(`http://localhost:3000${endpoint}`, {
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json'
    }
  })
}
