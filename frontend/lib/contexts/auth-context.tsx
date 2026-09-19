"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import {
  normalizeAuthResponse,
  persistAuthSession,
  clearAuthCookies,
  type NormalizedAuthUser,
} from "@/lib/auth/normalize-auth-response";
import { UserRole, OrganizationMode } from "@/lib/types/database";
import { API_URL } from "@/lib/api/client";

type AuthUser = NormalizedAuthUser & {
  role: UserRole;
  organizationMode: OrganizationMode;
  organizationOwnerId?: string;
  passwordChanged?: boolean;
  profilePhotoUrl?: string;
  assistantRole?: string;
};

function mapMeToAuthUser(
  me: Record<string, unknown>,
  profile: Record<string, unknown> | null
): AuthUser {
  const profilePhotoUrl = me.profilePhotoUrl ? String(me.profilePhotoUrl) : undefined;
  
  // Convert relative profile photo URLs to absolute URLs using backend API URL
  let absoluteProfilePhotoUrl = undefined;
  if (profilePhotoUrl) {
    if (profilePhotoUrl.startsWith('/api/v1/storage/')) {
      // Remove /api/v1 prefix since API_URL already includes it
      const storagePath = profilePhotoUrl.replace('/api/v1', '');
      absoluteProfilePhotoUrl = `${API_URL}${storagePath}`;
    } else {
      absoluteProfilePhotoUrl = profilePhotoUrl;
    }
  }

  return {
    id: String(me.id ?? profile?.id ?? ""),
    email: String(me.email ?? profile?.email ?? ""),
    firstName: String(me.firstName ?? profile?.firstName ?? ""),
    lastName: String(me.lastName ?? profile?.lastName ?? ""),
    role: (me.role ?? profile?.role ?? UserRole.DRIVER) as UserRole,
    organizationId: String(me.organizationId ?? profile?.organizationId ?? ""),
    organizationName: String(me.organizationName ?? profile?.organizationName ?? ""),
    organizationMode: (me.organizationMode ??
      profile?.organizationMode ??
      OrganizationMode.SOLO) as OrganizationMode,
    organizationOwnerId: me.organizationOwnerId ? String(me.organizationOwnerId) : (profile?.organizationOwnerId ? String(profile.organizationOwnerId) : undefined),
    passwordChanged: me.passwordChanged !== undefined ? Boolean(me.passwordChanged) : true,
    profilePhotoUrl: absoluteProfilePhotoUrl,
    assistantRole: me.assistantRole ? String(me.assistantRole) : undefined,
  };
}

function readStoredProfile(): Record<string, unknown> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("user_profile");
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isSoloMode: boolean;
  isFleetMode: boolean;
  isBusinessFleet: boolean;
  isCompany: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isManager: boolean;
  isDriver: boolean;
  isRentalCustomer: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Check if user is authenticated on mount
  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('jwt_token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        // Use the centralized API client (handles headers automatically)
        const response = await api.get('/auth/me');
        const me = (response.data.user ?? response.data) as Record<string, unknown>;
        const authUser = mapMeToAuthUser(me, readStoredProfile());
        setUser(authUser);
        localStorage.setItem("user_profile", JSON.stringify(authUser));
      } catch {
        setUser(null);
        localStorage.removeItem('jwt_token'); // Safety clear
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      // Use api client for consistent error handling
      const { data: raw } = await api.post('/auth/login', { email, password });
      const auth = normalizeAuthResponse(raw);
      persistAuthSession(auth);
      setUser(auth.user as AuthUser);
      router.push("/dashboard");
    },
    [router],
  );

  const logout = useCallback(async () => {
    // Clear the real JWT from localStorage (our auth mechanism)
    localStorage.removeItem("jwt_token");
    localStorage.removeItem("role");
    localStorage.removeItem("org_mode");
    localStorage.removeItem("user_profile");
    clearAuthCookies();
    setUser(null);
    router.push("/login");
  }, [router]);

  const refreshUser = useCallback(async () => {
    try {
      const response = await api.get('/auth/me');
      const data = response.data;
      const authUser = mapMeToAuthUser(data, readStoredProfile());
      setUser(authUser);
      localStorage.setItem("user_profile", JSON.stringify(authUser));
    } catch (error: any) {
      if (error?.response?.status === 401) {
        // Session expired
      }
      setUser(null);
      localStorage.removeItem('jwt_token'); // Safety clear
    }
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    isSoloMode: user?.organizationMode === OrganizationMode.SOLO,
    isFleetMode: user?.organizationMode === OrganizationMode.FLEET || user?.organizationMode === OrganizationMode.BUSINESS_FLEET || user?.organizationMode === OrganizationMode.COMPANY,
    isBusinessFleet: user?.organizationMode === OrganizationMode.BUSINESS_FLEET,
    isCompany: user?.organizationMode === OrganizationMode.COMPANY,
    isSuperAdmin: user?.role === UserRole.SUPER_ADMIN,
    isAdmin: user?.role === UserRole.ADMIN,
    isManager: user?.role === UserRole.MANAGER,
    isDriver: user?.role === UserRole.DRIVER,
    isRentalCustomer: user?.role === UserRole.RENTAL_CUSTOMER,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

/**
 * Hook to require authentication
 * Redirects to login if not authenticated
 */
export function useRequireAuth() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log('[useRequireAuth] Checking auth:', { isLoading, isAuthenticated, user });
    if (!isLoading && !isAuthenticated) {
      console.log('[useRequireAuth] Not authenticated, redirecting to login');
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  return { user, isLoading };
}

/**
 * Hook to require specific role
 */
export function useRequireRole(...roles: UserRole[]) {
  const { user, isLoading } = useRequireAuth();
  const router = useRouter();

  useEffect(() => {
    console.log('[useRequireRole] Checking role:', { userRole: user?.role, requiredRoles: roles, isLoading });
    if (!isLoading && user && !roles.includes(user.role)) {
      console.log('[useRequireRole] Role mismatch, redirecting to dashboard');
      router.push("/dashboard"); // Redirect to dashboard if wrong role
    }
  }, [isLoading, user, roles, router]);

  return { user, isLoading };
}
