/**
 * Image Upload Service
 *
 * Uploads images directly to the Spring Boot backend via multipart/form-data.
 * The backend stores files locally under the `uploads/` directory.
 */

import { apiFormFetch } from "@/lib/api/client";

/** Resolve API base URL — same logic as client.ts */
function resolveApiBaseUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL ?? '').trim();
  const fallback = 'https://localhost:8080/api/v1';

  if (!raw) {
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      const apiOrigin = origin.replace(/:\d+$/, ':8080');
      return `${apiOrigin}/api/v1`;
    }
    return fallback;
  }

  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    if (raw.includes('localhost') && typeof window !== 'undefined') {
      const origin = window.location.origin;
      const apiOrigin = origin.replace(/:\d+$/, ':8080');
      return `${apiOrigin}/api/v1`;
    }
    return raw.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined') {
    const path = raw.startsWith('/') ? raw : `/${raw}`;
    return `${window.location.origin}${path}`.replace(/\/$/, '');
  }

  const path = raw.startsWith('/') ? raw : `/${raw}`;
  return `${fallback}${path}`.replace(/\/$/, '');
}

export interface UploadResult {
  success: boolean;
  fileUrl?: string;
  key?: string;
  error?: string;
}

export interface EntryImage {
  id: string;
  imageUrl: string;
  imageKey: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
}

/**
 * Upload an image file for a specific entry (expense, trip, etc.)
 */
export async function uploadEntryImage(
  file: File,
  entryType: "EXPENSE" | "TRIP" | "VEHICLE" | "ODOMETER_VERIFICATION",
  entryId: string,
  description?: string
): Promise<UploadResult> {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("entryType", entryType);
    formData.append("entryId", entryId);
    if (description) {
      formData.append("description", description);
    }

    const res = await apiFormFetch("/entry-images", formData);

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Upload failed: ${res.status}`);
    }

    const data: EntryImage = await res.json();
    return {
      success: true,
      fileUrl: data.imageUrl,
      key: data.imageKey,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}

/**
 * Delete an entry image by its ID
 */
export async function deleteEntryImage(imageId: string): Promise<boolean> {
  try {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("jwt_token")
        : null;
    const headers: HeadersInit = token
      ? { Authorization: `Bearer ${token}` }
      : {};

    const res = await fetch(
      `${resolveApiBaseUrl()}/entry-images/${imageId}`,
      { method: "DELETE", headers }
    );
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Legacy alias for uploadExpenseImage — wires to the backend multipart endpoint.
 * The `expenseType` parameter is ignored; the caller must supply `entryId`.
 */
export async function uploadExpenseImage(
  blob: Blob,
  filename: string,
  _contentType: string,
  _expenseType: string,
  _onProgress?: (progress: number) => void,
  entryId?: string
): Promise<UploadResult> {
  if (!entryId) {
    return {
      success: false,
      error:
        "entryId is required for image upload. Save the expense first, then upload the receipt.",
    };
  }
  const file = new File([blob], filename, { type: _contentType || "image/jpeg" });
  return uploadEntryImage(file, "EXPENSE", entryId);
}

/**
 * Get images for a specific entry
 */
export async function getEntryImages(
  entryType: "EXPENSE" | "TRIP" | "VEHICLE" | "ODOMETER_VERIFICATION",
  entryId: string
): Promise<EntryImage[]> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("jwt_token") : null;
  const headers: HeadersInit = token
    ? { Authorization: `Bearer ${token}` }
    : {};

  const res = await fetch(
    `${resolveApiBaseUrl()}/entry-images/entry/${entryType}/${entryId}`,
    { headers }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch images: ${res.status}`);
  }

  return res.json();
}

/** @deprecated Use deleteEntryImage instead. */
export async function deleteUploadedImage(_key: string): Promise<boolean> {
  console.warn(
    "deleteUploadedImage(key) is deprecated. Use deleteEntryImage(imageId) instead."
  );
  return false;
}

/** @deprecated Images are served directly via their stored URL. */
export async function getSignedViewUrl(_key: string): Promise<string> {
  console.warn(
    "getSignedViewUrl is deprecated. Use the imageUrl field directly from EntryImage."
  );
  return "";
}
