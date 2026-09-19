import { clearAuthCookies } from '@/lib/auth/normalize-auth-response'

const DEFAULT_BACKEND = 'https://localhost:8080';

/** Resolve API base URL — always absolute in the browser when possible. */
function resolveApiBaseUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL ?? '').trim();
  const fallback = `${DEFAULT_BACKEND}/api/v1`;

  if (!raw) {
    // When no env var is set, dynamically use current origin with backend port
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      // Replace frontend port (3000) with backend port (8080)
      const apiOrigin = origin.replace(/:\d+$/, ':8080');
      return `${apiOrigin}/api/v1`;
    }
    return fallback;
  }

  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    // If it's localhost, dynamically replace with current origin when in browser
    if (raw.includes('localhost') && typeof window !== 'undefined') {
      const origin = window.location.origin;
      const apiOrigin = origin.replace(/:\d+$/, ':8080');
      return `${apiOrigin}/api/v1`;
    }
    return raw.replace(/\/$/, '');
  }

  // Relative path (e.g. /api/v1) — same-origin; Next.js rewrites proxy to Spring Boot
  if (typeof window !== 'undefined') {
    const path = raw.startsWith('/') ? raw : `/${raw}`;
    return `${window.location.origin}${path}`.replace(/\/$/, '');
  }

  const path = raw.startsWith('/') ? raw : `/${raw}`;
  return `${DEFAULT_BACKEND}${path}`.replace(/\/$/, '');
}

const API_URL = resolveApiBaseUrl();

// 1. Dynamic Header Helper - Reads token FRESH on every call
const getHeaders = (skipAuth: boolean = false): HeadersInit => {
  const headers: HeadersInit = { 
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  if (typeof window !== 'undefined' && !skipAuth) {
    const token = localStorage.getItem('jwt_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return headers;
};

// 2. Auth Error Handler - Clears token and redirects on 401/403
async function handleAuthError(res: Response, url: string): Promise<never> {
  // Suppress 404 warnings for expected cases (when no data exists yet)
  if (res.status === 404 && url.includes('/odometer-confirmations')) {
    // Don't log - this is expected when no confirmation exists
  } else if (res.status === 404 && url.includes('/tax-year-summaries')) {
    // Don't log - this is expected when no tax summary exists yet
  } else if (res.status === 404 && url.includes('/tax-calculations')) {
    // Don't log - this is expected when no tax profile exists yet
  } else if (res.status === 404 && url.includes('/vehicle-condition-reports')) {
    // Don't log - this is expected when no condition report exists yet
  } else if (res.status === 404 && url.includes('/api/v1/')) {
    console.warn(
      `[API] 404 for ${url}. Backend endpoint may not exist or backend needs restart.`
    );
  }
  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('role');
    localStorage.removeItem('org_mode');
    localStorage.removeItem('user_profile');
    clearAuthCookies();
    // Redirect to login page
    if (typeof window !== 'undefined') {
      window.location.href = '/login?error=session_expired';
    }
  }
  // Try to read error message from response body
  let errorMessage = res.statusText;
  try {
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const errorData = await res.json();
      if (errorData.error) {
        errorMessage = errorData.error;
      }
    }
  } catch (e) {
    // If parsing fails, use statusText
  }

  // Detect locked entry errors
  if (errorMessage.includes('Cannot delete locked expense') || errorMessage.includes('Cannot modify locked entry')) {
    throw new Error('LOCKED_ERROR: ' + errorMessage);
  }

  // Detect concurrency/optimistic locking errors from Hibernate/JPA
  if (errorMessage.includes('Row was updated or deleted by another transaction')) {
    throw new Error('CONFLICT_ERROR: This record was modified by another user. Please refresh and try again.');
  }

  throw new Error(`HTTP ${res.status}: ${errorMessage}`);
}

// 3. The API Object - All methods use dynamic headers
async function safeJsonParse(res: Response) {
  const contentType = res.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await res.text();
    // Handle empty response (null body)
    if (!text || text.trim() === '') {
      return null;
    }
    console.error('[API] Non-JSON response:', text.substring(0, 200));
    throw new Error(`Expected JSON but got ${contentType}`);
  }
  return res.json();
}

export const api = {
  /** GET that returns null data on 404, 204, 400, or 500 (optional endpoints / stale backend). */
  getOptional: async (endpoint: string) => {
    const url = `${API_URL}${endpoint}`;
    try {
      const res = await fetch(url, { method: 'GET', headers: getHeaders() });
      if (res.status === 404 || res.status === 204 || res.status === 400 || res.status === 500) {
        return { data: null };
      }
      if (!res.ok) await handleAuthError(res, url);
      return { data: await safeJsonParse(res) };
    } catch (error) {
      // Silently return null for any errors in optional endpoints
      return { data: null };
    }
  },

  get: async (endpoint: string) => {
    const url = `${API_URL}${endpoint}`;
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: getHeaders(),
      });
      if (!res.ok) await handleAuthError(res, url);
      return { data: await safeJsonParse(res) };
    } catch (error) {
      // Suppress error logging for expected 404 cases
      if (!url.includes('/odometer-confirmations') && !url.includes('/vehicle-condition-reports')) {
        console.error(`[API] GET ${url} failed:`, error);
      }
      throw error;
    }
  },

  post: async (endpoint: string, body: unknown, skipAuth: boolean = false) => {
    const url = `${API_URL}${endpoint}`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: getHeaders(skipAuth),
        body: JSON.stringify(body),
      });
      if (!res.ok) await handleAuthError(res, url);
      // Handle 204 No Content responses
      if (res.status === 204) {
        return { data: null };
      }
      return { data: await safeJsonParse(res) };
    } catch (error) {
      console.error(`[API] POST ${url} failed:`, error);
      throw error;
    }
  },

  patch: async (endpoint: string, body: unknown) => {
    const url = `${API_URL}${endpoint}`;
    try {
      const res = await fetch(url, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) await handleAuthError(res, url);
      return { data: await safeJsonParse(res) };
    } catch (error) {
      console.error(`[API] PATCH ${url} failed:`, error);
      throw error;
    }
  },

  put: async (endpoint: string, body: unknown) => {
    const url = `${API_URL}${endpoint}`;
    try {
      const res = await fetch(url, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) await handleAuthError(res, url);
      return { data: await safeJsonParse(res) };
    } catch (error) {
      console.error(`[API] PUT ${url} failed:`, error);
      throw error;
    }
  },

  delete: async (endpoint: string) => {
    const url = `${API_URL}${endpoint}`;
    try {
      const res = await fetch(url, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (!res.ok) await handleAuthError(res, url);
      // DELETE endpoints often return 204 No Content or 200 OK with empty body
      if (res.status === 204 || res.status === 200) {
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          return { data: null };
        }
      }
      return { data: await safeJsonParse(res) };
    } catch (error) {
      console.error(`[API] DELETE ${url} failed:`, error);
      throw error;
    }
  },
};

// 4. Form Data Helper (no Content-Type - browser sets boundary)
export const apiForm = {
  post: async (endpoint: string, formData: FormData) => {
    const headers: HeadersInit = {};

    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('jwt_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    });
    const url = `${API_URL}${endpoint}`;
    if (!res.ok) await handleAuthError(res, url);
    return { data: await res.json() };
  },
};

// Legacy exports for backward compatibility
export { API_URL };
export const apiFetch = async (path: string, options: RequestInit = {}) => {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers,
    },
  });
  const url = `${API_URL}${path}`;
  if (!res.ok) await handleAuthError(res, url);
  return res;
};

// FormData version - returns raw Response for compatibility
export const apiFormFetch = async (endpoint: string, formData: FormData) => {
  const headers: HeadersInit = {};

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('jwt_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: formData,
  });
  const url = `${API_URL}${endpoint}`;
  if (!res.ok) handleAuthError(res, url);
  return res;
};

/** POST/PUT multipart to Spring API; returns Response (caller reads body / checks ok). */
export async function apiPostMultipart(
  path: string,
  formData: FormData,
  method: 'POST' | 'PUT' = 'POST'
): Promise<Response> {
  const headers: HeadersInit = {};
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('jwt_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  const p = path.startsWith('/') ? path : `/${path}`;
  return fetch(`${API_URL}${p}`, { method, headers, body: formData });
}

// ============================================================================
// ODOMETER & RECURRING TRIPS API
// ============================================================================

/** Get last odometer reading for a specific vehicle */
export const getLastOdometerReading = async (vehicleId: string) => {
  return api.get(`/trips/vehicle/${vehicleId}/last-odometer`);
};

/** Get latest business trip end odometer for odometer chaining */
export const getLatestBusinessTripOdometer = async (vehicleId: string) => {
  return api.get(`/trips/vehicle/${vehicleId}/latest-business-odometer`);
};

/** Create odometer confirmation for a vehicle assignment */
export const createOdometerConfirmation = async (data: {
  assignmentId: string;
  reading: number;
}) => {
  return api.post(`/odometer-confirmations/assignment/${data.assignmentId}`, {
    odometerReading: data.reading,
  });
};

/** Get odometer confirmation for a vehicle assignment */
export const getOdometerConfirmation = async (assignmentId: string) => {
  return api.getOptional(`/odometer-confirmations/assignment/${assignmentId}`);
};

/** Upload odometer confirmation image */
export const uploadOdometerConfirmationImage = async (confirmationId: string, formData: FormData) => {
  return apiForm.post(`/odometer-confirmations/${confirmationId}/image`, formData);
};

/** Update odometer confirmation */
export const updateOdometerConfirmation = async (confirmationId: string, data: {
  odometerReading: number;
}) => {
  return api.put(`/odometer-confirmations/${confirmationId}`, data);
};

/** Get all recurring trips for the current user */
export const getRecurringTrips = async () => {
  return api.get('/recurring-trips');
};

/** Get recurring trips filtered by vehicle ID */
export const getRecurringTripsByVehicle = async (vehicleId: string) => {
  return api.get(`/recurring-trips/vehicle/${vehicleId}`);
};

/** Create a new recurring trip template */
export const createRecurringTrip = async (data: {
  vehicleId: string;
  userId: string;
  purpose: 'BUSINESS' | 'PRIVATE';
  startLocation: string;
  endLocation: string;
  routeDescription?: string;
  customerClientName?: string;
  reasonForTrip?: string;
  isRecurring: boolean;
  recurrenceDays?: string;
  recurrenceDaysOfMonth?: string;
  recurrenceStartDate?: string;
  recurrenceEndDate?: string;
  startTime?: string;
  endTime?: string;
  defaultTollCostsZar: number;
  defaultParkingCostsZar: number;
}) => {
  return api.post('/recurring-trips', data);
};

/** Delete a recurring trip by ID */
export const deleteRecurringTrip = async (id: string) => {
  return api.delete(`/recurring-trips/${id}`);
};

// ============================================================================
// RECURRING EXPENSES API
// ============================================================================

/** Get all recurring expenses for the current user */
export const getRecurringExpenses = async () => {
  return api.get('/recurring-expenses');
};

/** Get recurring expenses filtered by vehicle ID */
export const getRecurringExpensesByVehicle = async (vehicleId: string) => {
  return api.get(`/recurring-expenses/vehicle/${vehicleId}`);
};

/** Get active recurring expenses filtered by vehicle ID */
export const getActiveRecurringExpensesByVehicle = async (vehicleId: string) => {
  return api.get(`/recurring-expenses/vehicle/${vehicleId}/active`);
};

/** Create a new recurring expense template */
export const createRecurringExpense = async (data: {
  vehicleId?: string;
  userId: string;
  category: string;
  description: string;
  amountZar: number;
  vatAmountZar?: number;
  supplierName?: string;
  invoiceNumber?: string;
  isTaxDeductible?: boolean;
  odometerReading?: number;
  isRecurring: boolean;
  recurrenceDays?: string;
  recurrenceDaysOfMonth?: string;
  recurrenceStartDate?: string;
  recurrenceEndDate?: string;
}) => {
  return api.post('/recurring-expenses', data);
};

/** Delete a recurring expense by ID */
export const deleteRecurringExpense = async (id: string) => {
  return api.delete(`/recurring-expenses/${id}`);
};

// ============================================================================
// EXPENSE CATEGORIES API
// ============================================================================

/** Get expense categories for the current user (filtered by role and org mode) */
export const getExpenseCategories = async () => {
  return api.get('/expenses/categories');
};

/** Get expenses without receipt images (Fuel and Other expenses only) */
export const getExpensesWithoutReceipts = async () => {
  return api.get('/expenses/missing-receipts');
};

// ============================================================================
// FLEET MANAGEMENT API
// ============================================================================

// User Profile
export const getUserProfile = async () => {
  return api.get('/user-profiles/me');
};

export const createUserProfile = async (data: {
  idNumber?: string;
  homePhone?: string;
  workPhone?: string;
  mobilePhone?: string;
  driversLicenseNumber?: string;
  driversLicenseExpiry?: string;
  driverLicenseFrontUrl?: string;
  driverLicenseBackUrl?: string;
}) => {
  return api.post('/user-profiles', data);
};

export const updateUserProfile = async (data: {
  idNumber?: string;
  homePhone?: string;
  workPhone?: string;
  mobilePhone?: string;
  driversLicenseNumber?: string;
  driversLicenseExpiry?: string;
  driverLicenseFrontUrl?: string;
  driverLicenseBackUrl?: string;
}) => {
  return api.put('/user-profiles/me', data);
};

// Address
export const getUserAddress = async () => {
  return api.get('/addresses/me');
};

export const createUserAddress = async (data: {
  addressLine1: string;
  addressLine2?: string;
  suburb?: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
}) => {
  return api.post('/addresses', data);
};

export const updateUserAddress = async (addressId: string, data: {
  addressLine1: string;
  addressLine2?: string;
  suburb?: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
}) => {
  return api.put(`/addresses/${addressId}`, data);
};

// Vehicle Assignment
export const getVehicleAssignments = async (vehicleId?: string) => {
  const endpoint = vehicleId ? `/vehicle-assignments/vehicle/${vehicleId}` : '/vehicle-assignments';
  return api.get(endpoint);
};

export const createVehicleAssignment = async (data: {
  vehicleId: string;
  assignedToUserId: string;
  assignedByUserId: string;
  startDate: string;
  endDate?: string;
  notes?: string;
}) => {
  return api.post('/vehicle-assignments', data);
};

export const updateVehicleAssignment = async (assignmentId: string, data: {
  endDate?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  notes?: string;
}) => {
  return api.put(`/vehicle-assignments/${assignmentId}`, data);
};

export const getVehicleAssignmentByAssignmentId = async (assignmentId: string) => {
  return api.get(`/vehicle-assignments/${assignmentId}`);
};

// Vehicle Condition Report
export const createVehicleConditionReport = async (assignmentId: string) => {
  return api.post(`/vehicle-condition-reports/assignment/${assignmentId}`, {});
};

export const createVehicleConditionReportForVehicle = async (vehicleId: string) => {
  return api.post(`/vehicle-condition-reports/vehicle/${vehicleId}`, {});
};

export const getVehicleConditionReport = async (assignmentId: string) => {
  return api.get(`/vehicle-condition-reports/assignment/${assignmentId}`);
};

export const getVehicleConditionReportByVehicleId = async (vehicleId: string) => {
  return api.get(`/vehicle-condition-reports/vehicle/${vehicleId}`);
};

// Expense Category Labels (for Other Expense dropdown)
export const getExpenseCategoryLabels = async () => {
  return api.get('/expenses/category-labels');
};

export const addConditionSection = async (reportId: string, data: {
  sectionType: string;
  condition: 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED';
  notes?: string;
}) => {
  return api.post(`/vehicle-condition-reports/${reportId}/sections`, data);
};

export const addSectionImage = async (sectionId: string, formData: FormData) => {
  return apiForm.post(`/vehicle-condition-reports/sections/${sectionId}/images`, formData);
};

export const deleteConditionSectionImage = async (sectionId: string, imageId: string) => {
  return api.delete(`/vehicle-condition-reports/sections/${sectionId}/images/${imageId}`);
};

export const addManagerNote = async (reportId: string, data: {
  note: string;
}) => {
  return api.post(`/vehicle-condition-reports/${reportId}/manager-notes`, data);
};

export const deleteConditionSection = async (sectionId: string) => {
  return api.delete(`/vehicle-condition-reports/sections/${sectionId}`);
};

export const updateConditionSection = async (sectionId: string, data: {
  condition?: 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED';
  notes?: string;
}) => {
  return api.put(`/vehicle-condition-reports/sections/${sectionId}`, data);
};

export const lockConditionSection = async (sectionId: string) => {
  return api.post(`/vehicle-condition-reports/sections/${sectionId}/lock`, {});
};

export const unlockConditionSection = async (sectionId: string) => {
  return api.post(`/vehicle-condition-reports/sections/${sectionId}/unlock`, {});
};
