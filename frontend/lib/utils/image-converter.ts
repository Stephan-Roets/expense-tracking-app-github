/**
 * AVIF Image Converter Utility
 * 
 * Converts JPEG/PNG images to high-compression AVIF format
 * before uploading to reduce bandwidth and storage costs.
 * 
 * AVIF typically achieves 50% better compression than JPEG
 * at equivalent visual quality.
 */

interface ConversionOptions {
  quality?: number; // 0-100, default 60 for receipts
  maxWidth?: number; // Max width in pixels
  maxHeight?: number; // Max height in pixels
  preserveOriginalSize?: boolean; // If true, don't resize the image
}

interface ConversionResult {
  blob: Blob;
  originalSize: number;
  convertedSize: number;
  compressionRatio: number;
  width: number;
  height: number;
  format: string;
}

/**
 * Check if the browser supports AVIF encoding
 */
export async function supportsAvifEncoding(): Promise<boolean> {
  if (typeof document === "undefined") return false;
  
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  
  try {
    const dataUrl = canvas.toDataURL("image/avif");
    return dataUrl.startsWith("data:image/avif");
  } catch {
    return false;
  }
}

/**
 * Convert an image file to AVIF format with compression
 */
export async function convertToAvif(
  file: File,
  options: ConversionOptions = {}
): Promise<ConversionResult> {
  const { quality = 60, maxWidth = 2000, maxHeight = 2000, preserveOriginalSize = false } = options;
  
  // Check if AVIF is supported, fallback to WebP
  const avifSupported = await supportsAvifEncoding();
  const targetFormat = avifSupported ? "image/avif" : "image/webp";
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      try {
        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = img;
        
        if (!preserveOriginalSize) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
          
          // Round dimensions
          width = Math.round(width);
          height = Math.round(height);
        }
        
        // Create canvas and draw resized image
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }
        
        // Use high-quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        
        // Draw the image
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to AVIF/WebP
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Failed to convert image"));
              return;
            }
            
            const originalSize = file.size;
            const convertedSize = blob.size;
            const compressionRatio = originalSize / convertedSize;
            
            resolve({
              blob,
              originalSize,
              convertedSize,
              compressionRatio,
              width,
              height,
              format: targetFormat,
            });
          },
          targetFormat,
          quality / 100
        );
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error("Failed to load image"));
    };
    
    // Load image from file
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Process a receipt image for upload
 * Optimized settings for text-heavy receipt images
 */
export async function processReceiptImage(file: File): Promise<ConversionResult> {
  // Receipts benefit from slightly higher quality for text readability
  return convertToAvif(file, {
    quality: 70,
    maxWidth: 1500,
    maxHeight: 2000,
  });
}

/**
 * Process an odometer photo for upload
 * Optimized settings for high-resolution odometer readings
 * Preserves original resolution and uses high quality
 */
export async function processOdometerImage(file: File): Promise<ConversionResult> {
  return convertToAvif(file, {
    quality: 95,
    preserveOriginalSize: true,
  });
}

/**
 * Process a general expense image for upload
 */
export async function processExpenseImage(file: File): Promise<ConversionResult> {
  return convertToAvif(file, {
    quality: 60,
    maxWidth: 2000,
    maxHeight: 2000,
  });
}

/**
 * Generate a unique filename for the converted image
 */
export function generateImageFilename(
  organizationId: string,
  expenseType: string,
  expenseId: string,
  format: string
): string {
  const extension = format.split("/")[1]; // "image/avif" -> "avif"
  const timestamp = Date.now();
  return `${organizationId}/${expenseType}/${expenseId}-${timestamp}.${extension}`;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  
  const units = ["B", "KB", "MB", "GB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`;
}

/**
 * Validate image file before processing
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif"];
  
  if (!allowedTypes.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: ${allowedTypes.map(t => t.split("/")[1].toUpperCase()).join(", ")}`,
    };
  }
  
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${formatFileSize(maxSize)}`,
    };
  }
  
  return { valid: true };
}
