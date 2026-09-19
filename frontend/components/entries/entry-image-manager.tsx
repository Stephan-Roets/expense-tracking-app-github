"use client";

import { useState, useRef } from "react";
import {
  Upload,
  Trash2,
  Lock,
  Image as ImageIcon,
  X,
  RefreshCw,
  ExternalLink,
  Camera,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { EntryImage } from "@/lib/types/database";
import { API_URL } from "@/lib/api/client";
import {
  processReceiptImage,
  validateImageFile,
} from "@/lib/utils/image-converter";
import { ImageCropModal } from "@/components/ui/image-crop-modal";

const BACKEND_BASE_URL = API_URL.replace(/\/api\/v1$/, "");

interface EntryImageManagerProps {
  entryId: string;
  entryType: "VEHICLE" | "EXPENSE" | "TRIP" | "ODOMETER_VERIFICATION";
  images: EntryImage[];
  onUpload: (file: File, description?: string) => Promise<void>;
  onDelete: (imageId: string) => Promise<void>;
  onReupload: (imageId: string, file: File) => Promise<void>;
  onLock: (imageId: string, reason?: string) => Promise<void>;
  disabled?: boolean;
  maxImages?: number;
  acceptedTypes?: string;
  className?: string;
}

export function EntryImageManager({
  entryId,
  entryType,
  images,
  onUpload,
  onDelete,
  onReupload,
  onLock,
  disabled = false,
  maxImages = 5,
  acceptedTypes = "image/*",
  className,
}: EntryImageManagerProps) {
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);
  const [showLockDialog, setShowLockDialog] = useState<string | null>(null);
  const [showImagePreview, setShowImagePreview] = useState<EntryImage | null>(
    null,
  );
  const [uploadDescription, setUploadDescription] = useState("");
  const [lockReason, setLockReason] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [reuploadImageId, setReuploadImageId] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [originalImageFile, setOriginalImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reuploadInputRef = useRef<HTMLInputElement>(null);

  const canAddMore = images.length < maxImages;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        alert(validation.error || "Invalid image file");
        return;
      }
      setOriginalImageFile(file);
      setShowCropModal(true);
    }
  };

  const handleReuploadSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        alert(validation.error || "Invalid image file");
        return;
      }
      setOriginalImageFile(file);
      setShowCropModal(true);
    }
  };

  const handleCropConfirm = async (croppedFile: File, originalFile: File) => {
    setShowCropModal(false);
    setIsProcessing(true);

    try {
      const processed = await processReceiptImage(croppedFile);
      // Update filename extension to match actual format (avif/webp)
      const extension = processed.format.split('/')[1]; // "image/avif" -> "avif"
      const baseName = croppedFile.name.replace(/\.[^.]+$/, ''); // Remove existing extension
      const processedFile = new File([processed.blob], `${baseName}.${extension}`, {
        type: processed.format,
      });

      if (reuploadImageId) {
        // This is a reupload operation
        await handleReupload(reuploadImageId, processedFile);
      } else {
        // This is a new upload operation
        setSelectedFile(processedFile);
        setShowUploadDialog(true);
      }
    } catch (err) {
      alert("Failed to process image. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCropCancel = () => {
    setShowCropModal(false);
    setOriginalImageFile(null);
    setReuploadImageId(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsProcessing(true);
    try {
      await onUpload(selectedFile, uploadDescription || undefined);
      setShowUploadDialog(false);
      setSelectedFile(null);
      setUploadDescription("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Failed to upload image:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (imageId: string) => {
    setIsProcessing(true);
    try {
      await onDelete(imageId);
      setShowDeleteDialog(null);
    } catch (error) {
      console.error("Failed to delete image:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReupload = async (imageId: string, file: File) => {
    setIsProcessing(true);
    try {
      await onReupload(imageId, file);
      setReuploadImageId(null);
      if (reuploadInputRef.current) {
        reuploadInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Failed to reupload image:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLock = async (imageId: string) => {
    setIsProcessing(true);
    try {
      await onLock(imageId, lockReason || undefined);
      setShowLockDialog(null);
      setLockReason("");
    } catch (error) {
      console.error("Failed to lock image:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const triggerReupload = (imageId: string) => {
    setReuploadImageId(imageId);
    reuploadInputRef.current?.click();
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Hidden file inputs */}
      <label htmlFor="entryImageUpload" className="sr-only">
        Upload Entry Image
      </label>
      <input
        ref={fileInputRef}
        id="entryImageUpload"
        name="entryImageUpload"
        type="file"
        accept={acceptedTypes}
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />
      <label htmlFor="entryImageReupload" className="sr-only">
        Re-upload Entry Image
      </label>
      <input
        ref={reuploadInputRef}
        id="entryImageReupload"
        name="entryImageReupload"
        type="file"
        accept={acceptedTypes}
        onChange={handleReuploadSelect}
        className="hidden"
      />

      {/* Image Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {images.map((image) => {
          const imageUrl = image.imageUrl?.startsWith("http")
            ? image.imageUrl
            : `${BACKEND_BASE_URL}${image.imageUrl?.startsWith("/") ? image.imageUrl : `/${image.imageUrl}`}`;
          
          console.log('EntryImageManager - Image URL:', imageUrl);
          console.log('EntryImageManager - Original imageUrl:', image.imageUrl);
          console.log('EntryImageManager - BACKEND_BASE_URL:', BACKEND_BASE_URL);
          
          return (
            <Card key={image.id} className="relative group overflow-hidden">
              <CardContent className="p-0">
                {/* Image Preview */}
                <div
                  className="aspect-square relative cursor-pointer"
                  onClick={() => setShowImagePreview(image)}
                >
                  <img
                    src={imageUrl}
                    alt={image.description || "Entry image"}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error('Image failed to load:', imageUrl);
                      (e.target as HTMLImageElement).src =
                        'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23374151" width="100" height="100"/%3E%3Ctext x="50" y="55" text-anchor="middle" fill="%239CA3AF" font-size="12"%3ENo Image%3C/text%3E%3C/svg%3E';
                    }}
                  />
                {/* Lock indicator */}
                {image.isLocked && (
                  <div className="absolute top-2 right-2 bg-amber-500 rounded-full p-1">
                    <Lock className="h-3 w-3 text-white" />
                  </div>
                )}
              </div>

              {/* Actions overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-10">
                {!image.isLocked && (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => triggerReupload(image.id)}
                      disabled={disabled || isProcessing}
                      title="Replace image"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => setShowDeleteDialog(image.id)}
                      disabled={disabled || isProcessing}
                      title="Delete image"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowLockDialog(image.id)}
                  disabled={disabled || isProcessing}
                  title={
                    image.isLocked ? "Image is confirmed" : "Confirm image"
                  }
                >
                  <Lock className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    const url = image.imageUrl?.startsWith("http")
                      ? image.imageUrl
                      : `${BACKEND_BASE_URL}${image.imageUrl?.startsWith("/") ? image.imageUrl : `/${image.imageUrl}`}`;
                    console.log('Opening full image URL:', url);
                    window.open(url, "_blank");
                  }}
                  title="View full image"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            {/* Image info */}
            {image.description && (
              <div className="p-2 text-xs text-muted-foreground truncate">
                {image.description}
              </div>
            )}
            </CardContent>
          </Card>
          );
        })}

        {/* Add Image Card */}
        {canAddMore && (
          <Card
            className={cn(
              "aspect-square border-dashed cursor-pointer transition-colors",
              disabled
                ? "opacity-50 cursor-not-allowed"
                : "hover:border-primary hover:bg-muted/50",
            )}
            onClick={() => !disabled && fileInputRef.current?.click()}
          >
            <CardContent className="h-full flex flex-col items-center justify-center p-4">
              <Camera className="h-8 w-8 text-muted-foreground mb-2" />
              <span className="text-xs text-muted-foreground text-center">
                Add Image
              </span>
              <span className="text-xs text-muted-foreground">
                {images.length}/{maxImages}
              </span>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Empty state */}
      {images.length === 0 && !canAddMore && (
        <div className="text-center py-8 text-muted-foreground">
          <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No images attached</p>
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Image
            </DialogTitle>
            <DialogDescription>
              Add an image to this entry. You can add a description to help
              identify it later.
            </DialogDescription>
          </DialogHeader>
          {selectedFile && (
            <div className="space-y-4 py-4">
              <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                <img
                  src={URL.createObjectURL(selectedFile)}
                  alt="Preview"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="text-sm text-muted-foreground">
                {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </div>
              <div className="space-y-2">
                <Label htmlFor="imageDescription">Description (optional)</Label>
                <Input
                  id="imageDescription"
                  name="imageDescription"
                  placeholder="e.g., Receipt, Odometer photo, Damage evidence"
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowUploadDialog(false);
                setSelectedFile(null);
                setUploadDescription("");
              }}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={isProcessing || !selectedFile}
            >
              {isProcessing ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!showDeleteDialog}
        onOpenChange={() => setShowDeleteDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Image
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this image? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => showDeleteDialog && handleDelete(showDeleteDialog)}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Lock Dialog */}
      <Dialog
        open={!!showLockDialog}
        onOpenChange={() => setShowLockDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Confirm image
            </DialogTitle>
            <DialogDescription>
              Confirming this image will prevent it from being deleted or
              replaced.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="imageLockReason">
                Confirmation note (optional)
              </Label>
              <Input
                id="imageLockReason"
                name="imageLockReason"
                placeholder="e.g., Tax audit evidence, Confirmed receipt"
                value={lockReason}
                onChange={(e) => setLockReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowLockDialog(null)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={() => showLockDialog && handleLock(showLockDialog)}
              disabled={isProcessing}
            >
              {isProcessing ? "Confirming..." : "Confirm image"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog
        open={!!showImagePreview}
        onOpenChange={() => setShowImagePreview(null)}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {showImagePreview?.description || "Image Preview"}
              {showImagePreview?.isLocked && (
                <Lock className="h-4 w-4 text-amber-500" />
              )}
            </DialogTitle>
          </DialogHeader>
          {showImagePreview && (
            <div className="space-y-4">
              <div className="bg-muted rounded-lg overflow-hidden">
                <img
                  src={
                    showImagePreview.imageUrl?.startsWith("http")
                      ? showImagePreview.imageUrl
                      : `${BACKEND_BASE_URL}${showImagePreview.imageUrl?.startsWith("/") ? showImagePreview.imageUrl : `/${showImagePreview.imageUrl}`}`
                  }
                  alt={showImagePreview.description || "Entry image"}
                  className="w-full h-auto max-h-[60vh] object-contain"
                  onError={(e) => {
                    console.error('Preview image failed to load:', showImagePreview.imageUrl);
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {showImagePreview.fileName && (
                  <div>
                    <span className="text-muted-foreground">Filename:</span>
                    <span className="ml-2">{showImagePreview.fileName}</span>
                  </div>
                )}
                {showImagePreview.fileSizeBytes && (
                  <div>
                    <span className="text-muted-foreground">Size:</span>
                    <span className="ml-2">
                      {(showImagePreview.fileSizeBytes / 1024).toFixed(1)} KB
                    </span>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Uploaded:</span>
                  <span className="ml-2">
                    {new Date(showImagePreview.createdAt).toLocaleString(
                      "en-ZA",
                    )}
                  </span>
                </div>
                {showImagePreview.uploadedByName && (
                  <div>
                    <span className="text-muted-foreground">Uploaded by:</span>
                    <span className="ml-2">
                      {showImagePreview.uploadedByName}
                    </span>
                  </div>
                )}
                {showImagePreview.isLocked && (
                  <>
                    <div>
                      <span className="text-muted-foreground">
                        Confirmed at:
                      </span>
                      <span className="ml-2">
                        {showImagePreview.lockedAt
                          ? new Date(showImagePreview.lockedAt).toLocaleString(
                              "en-ZA",
                            )
                          : "Unknown"}
                      </span>
                    </div>
                    {showImagePreview.lockedByName && (
                      <div>
                        <span className="text-muted-foreground">
                          Confirmed by:
                        </span>
                        <span className="ml-2">
                          {showImagePreview.lockedByName}
                        </span>
                      </div>
                    )}
                    {showImagePreview.lockedReason && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">
                          Confirmation note:
                        </span>
                        <span className="ml-2">
                          {showImagePreview.lockedReason}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (!showImagePreview) return;
                const url = showImagePreview.imageUrl?.startsWith("http")
                  ? showImagePreview.imageUrl
                  : `${BACKEND_BASE_URL}${showImagePreview.imageUrl?.startsWith("/") ? showImagePreview.imageUrl : `/${showImagePreview.imageUrl}`}`;
                console.log('Opening full size image URL:', url);
                window.open(url, "_blank");
              }}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Open Full Size
            </Button>
            <Button onClick={() => setShowImagePreview(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Crop Modal */}
      {originalImageFile && (
        <ImageCropModal
          imageFile={originalImageFile}
          mode="receipt"
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
          isOpen={showCropModal}
        />
      )}
    </div>
  );
}
