"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Camera, CalendarIcon, FileCheck } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  LICENSE_TYPE_LABELS,
  LICENSE_RENEWAL_METHOD_LABELS,
} from "@/lib/types/database";
import {
  processReceiptImage,
  validateImageFile,
  formatFileSize,
} from "@/lib/utils/image-converter";
import { ReceiptSupportProps } from "./form-types";
import { EntryImageManager } from "@/components/entries/entry-image-manager";
import { ImageCropModal } from "@/components/ui/image-crop-modal";

const licenseSchema = z.object({
  vehicleId: z.string().min(1, "Select a vehicle"),
  date: z.date({ required_error: "Select a date" }),
  licenseType: z.enum([
    "VEHICLE_LICENSE",
    "DRIVERS_LICENSE",
    "PDP",
    "OPERATING_LICENSE",
  ]),
  licenseNumber: z.string().optional(),
  registrationAuthority: z.string().optional(),
  previousExpiryDate: z.date().optional(),
  newExpiryDate: z.date({ required_error: "Select new expiry date" }),
  renewalFeeZar: z.coerce.number().positive("Enter renewal fee"),
  penaltiesZar: z.coerce.number().optional(),
  arrearsZar: z.coerce.number().optional(),
  transactionNumber: z.string().optional(),
  renewalMethod: z.enum(["ONLINE", "POST_OFFICE", "LICENSING_DEPT", "AGENT"]),
  processingDays: z.coerce.number().optional(),
  odometerReading: z.coerce.number().positive("Enter odometer reading"),
  notes: z.string().optional(),
}).refine((data) => {
  // This validation will be handled in the component with access to vehicles array
  return true;
}, {
  message: "Odometer reading must be equal to or higher than current vehicle odometer",
  path: ["odometerReading"],
});

type LicenseInput = z.infer<typeof licenseSchema>;

interface Vehicle {
  id: string;
  registrationNumber: string;
  make: string;
  model: string;
  currentOdometer?: number;
}

interface LicenseRenewalFormProps extends ReceiptSupportProps {
  vehicles: Vehicle[];
  onSubmit: (data: LicenseInput, receiptImage: File | null) => Promise<void>;
  initialData?: Partial<LicenseInput>;
}

export function LicenseRenewalForm({
  vehicles,
  onSubmit,
  initialData,
  mode = "create",
  existingImages = [],
  entryId,
  onImageUpload,
  onImageDelete,
  onImageReupload,
  onImageLock,
}: LicenseRenewalFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptImage, setReceiptImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState<{
    originalSize: number;
    compressedSize: number;
  } | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [originalImageFile, setOriginalImageFile] = useState<File | null>(null);
  const [dateInput, setDateInput] = useState("");
  const [previousExpiryInput, setPreviousExpiryInput] = useState("");
  const [newExpiryInput, setNewExpiryInput] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LicenseInput>({
    resolver: zodResolver(licenseSchema),
    defaultValues: initialData || {
      vehicleId: "",
      date: new Date(),
      licenseType: "VEHICLE_LICENSE",
      renewalMethod: "LICENSING_DEPT",
    },
  });

  const watchVehicleId = watch("vehicleId");
  const watchDate = watch("date");
  const watchPreviousExpiry = watch("previousExpiryDate");
  const watchNewExpiry = watch("newExpiryDate");
  const watchOdometerReading = watch("odometerReading");

  // Initialize date inputs from watched values when in edit mode
  useEffect(() => {
    if (mode === 'edit') {
      if (watchDate) setDateInput(format(watchDate, 'yyyy-MM-dd'))
      if (watchPreviousExpiry) setPreviousExpiryInput(format(watchPreviousExpiry, 'yyyy-MM-dd'))
      if (watchNewExpiry) setNewExpiryInput(format(watchNewExpiry, 'yyyy-MM-dd'))
    }
  }, [mode, watchDate, watchPreviousExpiry, watchNewExpiry]);

  // Set preview from existing images when in edit mode
  useEffect(() => {
    if (mode === "edit" && existingImages.length > 0 && !previewUrl) {
      const firstImage = existingImages[0];
      setPreviewUrl(firstImage.imageUrl);
    }
  }, [mode, existingImages, previewUrl]);
  const watchLicenseType = watch("licenseType");
  const watchRenewalMethod = watch("renewalMethod");

  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setImageError(validation.error || "Invalid image file");
      return;
    }

    // Store original file and show crop modal
    setOriginalImageFile(file);
    setShowCropModal(true);
  };

  const handleCropConfirm = async (croppedFile: File, originalFile: File) => {
    setShowCropModal(false);
    setIsCompressing(true);

    try {
      const processed = await processReceiptImage(croppedFile);
      const processedFile = new File([processed.blob], croppedFile.name, {
        type: processed.format,
      });
      setReceiptImage(processedFile);
      setPreviewUrl(URL.createObjectURL(processed.blob));
      setCompressionInfo({
        originalSize: processed.originalSize,
        compressedSize: processed.convertedSize,
      });
    } catch (err) {
      setImageError("Failed to process image. Please try again.");
    } finally {
      setIsCompressing(false);
    }
  };

  const handleCropCancel = () => {
    setShowCropModal(false);
    setOriginalImageFile(null);
  };

  const clearImage = () => {
    setReceiptImage(null);
    setPreviewUrl(null);
    setCompressionInfo(null);
    setImageError(null);
  };

  const handleFormSubmit = async (data: LicenseInput) => {
    if (mode === "create" && !receiptImage) {
      setImageError("Please capture a receipt image");
      return;
    }

    // Validate odometer reading against current vehicle odometer
    const selectedVehicle = vehicles.find(v => v.id === data.vehicleId);
    if (selectedVehicle && selectedVehicle.currentOdometer !== undefined) {
      if (data.odometerReading < selectedVehicle.currentOdometer) {
        alert(`Odometer reading (${data.odometerReading} km) cannot be lower than current vehicle odometer (${selectedVehicle.currentOdometer} km). Please enter a value equal to or higher than the current odometer.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await onSubmit(data, mode === "create" ? receiptImage : null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-teal-500" />
            License Renewal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Vehicle */}
          <div className="space-y-2">
            <Label htmlFor="vehicleId">Vehicle</Label>
            <Select
              value={watchVehicleId}
              onValueChange={(val) => setValue("vehicleId", val)}
              name="vehicleId"
            >
              <SelectTrigger
                id="vehicleId"
                className={errors.vehicleId ? "border-red-500" : ""}
              >
                <SelectValue placeholder="Select vehicle" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.registrationNumber} - {v.make} {v.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.vehicleId && (
              <p className="text-sm text-red-500">{errors.vehicleId.message}</p>
            )}
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date">Renewal Date</Label>
            <Input
              id="date"
              name="date"
              type="text"
              inputMode="numeric"
              pattern="\d{4}-\d{2}-\d{2}"
              placeholder="YYYY-MM-DD"
              value={dateInput || (watchDate ? format(watchDate, "yyyy-MM-dd") : "")}
              onChange={(e) => {
                let value = e.target.value;
                value = value.replace(/[^\d-]/g, '');
                const digits = value.replace(/\D/g, '');
                if (digits.length > 0) {
                  let formatted = digits.slice(0, 4);
                  if (digits.length > 4) {
                    formatted += '-' + digits.slice(4, 6);
                  }
                  if (digits.length > 6) {
                    formatted += '-' + digits.slice(6, 8);
                  }
                  value = formatted;
                }
                setDateInput(value);
                if (value && value.length >= 4) {
                  const year = parseInt(value.slice(0, 4));
                  if (year < 1900 || year > 2099) {
                    return;
                  }
                }
                if (value.length === 10) {
                  const year = parseInt(value.slice(0, 4));
                  const month = parseInt(value.slice(5, 7));
                  const day = parseInt(value.slice(8, 10));
                  
                  // Validate month
                  if (month < 1 || month > 12) {
                    return;
                  }
                  
                  // Validate day based on month
                  const daysInMonth = new Date(year, month, 0).getDate();
                  if (day < 1 || day > daysInMonth) {
                    return;
                  }
                  
                  setValue("date", new Date(value));
                }
              }}
              maxLength={10}
              className={errors.date ? "border-red-500" : ""}
            />
            {errors.date && (
              <p className="text-sm text-red-500">{errors.date.message}</p>
            )}
          </div>

          {/* License Type */}
          <div className="space-y-2">
            <Label htmlFor="licenseType">License Type</Label>
            <Select
              value={watchLicenseType}
              onValueChange={(val) => setValue("licenseType", val as any)}
              name="licenseType"
            >
              <SelectTrigger id="licenseType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LICENSE_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* License Number */}
          <div className="space-y-2">
            <Label htmlFor="licenseNumber">License Number (Optional)</Label>
            <Input
              id="licenseNumber"
              placeholder="License disc number"
              {...register("licenseNumber")}
            />
          </div>

          {/* Registration Authority */}
          <div className="space-y-2">
            <Label htmlFor="registrationAuthority">
              Registration Authority (Optional)
            </Label>
            <Input
              id="registrationAuthority"
              placeholder="e.g., Gauteng Provincial"
              {...register("registrationAuthority")}
            />
          </div>

          {/* Expiry Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="previousExpiryDate">
                Previous Expiry (Optional)
              </Label>
              <Input
                id="previousExpiryDate"
                name="previousExpiryDate"
                type="text"
                inputMode="numeric"
                pattern="\d{4}-\d{2}-\d{2}"
                placeholder="YYYY-MM-DD"
                value={previousExpiryInput || (watchPreviousExpiry ? format(watchPreviousExpiry, "yyyy-MM-dd") : "")}
                onChange={(e) => {
                  let value = e.target.value;
                  value = value.replace(/[^\d-]/g, '');
                  const digits = value.replace(/\D/g, '');
                  if (digits.length > 0) {
                    let formatted = digits.slice(0, 4);
                    if (digits.length > 4) {
                      formatted += '-' + digits.slice(4, 6);
                    }
                    if (digits.length > 6) {
                      formatted += '-' + digits.slice(6, 8);
                    }
                    value = formatted;
                  }
                  setPreviousExpiryInput(value);
                  if (value && value.length >= 4) {
                    const year = parseInt(value.slice(0, 4));
                    if (year < 1900 || year > 2099) {
                      return;
                    }
                  }
                  if (value.length === 10) {
                    const year = parseInt(value.slice(0, 4));
                    const month = parseInt(value.slice(5, 7));
                    const day = parseInt(value.slice(8, 10));
                    
                    // Validate month
                    if (month < 1 || month > 12) {
                      return;
                    }
                    
                    // Validate day based on month
                    const daysInMonth = new Date(year, month, 0).getDate();
                    if (day < 1 || day > daysInMonth) {
                      return;
                    }
                    
                    setValue("previousExpiryDate", new Date(value));
                  }
                }}
                maxLength={10}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newExpiryDate">New Expiry *</Label>
              <Input
                id="newExpiryDate"
                name="newExpiryDate"
                type="text"
                inputMode="numeric"
                pattern="\d{4}-\d{2}-\d{2}"
                placeholder="YYYY-MM-DD"
                value={newExpiryInput || (watchNewExpiry ? format(watchNewExpiry, "yyyy-MM-dd") : "")}
                onChange={(e) => {
                  let value = e.target.value;
                  value = value.replace(/[^\d-]/g, '');
                  const digits = value.replace(/\D/g, '');
                  if (digits.length > 0) {
                    let formatted = digits.slice(0, 4);
                    if (digits.length > 4) {
                      formatted += '-' + digits.slice(4, 6);
                    }
                    if (digits.length > 6) {
                      formatted += '-' + digits.slice(6, 8);
                    }
                    value = formatted;
                  }
                  setNewExpiryInput(value);
                  if (value && value.length >= 4) {
                    const year = parseInt(value.slice(0, 4));
                    if (year < 1900 || year > 2099) {
                      return;
                    }
                  }
                  if (value.length === 10) {
                    const year = parseInt(value.slice(0, 4));
                    const month = parseInt(value.slice(5, 7));
                    const day = parseInt(value.slice(8, 10));
                    
                    // Validate month
                    if (month < 1 || month > 12) {
                      return;
                    }
                    
                    // Validate day based on month
                    const daysInMonth = new Date(year, month, 0).getDate();
                    if (day < 1 || day > daysInMonth) {
                      return;
                    }
                    
                    setValue("newExpiryDate", new Date(value));
                  }
                }}
                maxLength={10}
                className={errors.newExpiryDate ? "border-red-500" : ""}
              />
              {errors.newExpiryDate && (
                <p className="text-sm text-red-500">{errors.newExpiryDate.message}</p>
              )}
            </div>
          </div>

          {/* Renewal Method */}
          <div className="space-y-2">
            <Label htmlFor="renewalMethod">Renewal Method</Label>
            <Select
              value={watchRenewalMethod}
              onValueChange={(val) => setValue("renewalMethod", val as any)}
              name="renewalMethod"
            >
              <SelectTrigger id="renewalMethod">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LICENSE_RENEWAL_METHOD_LABELS).map(
                  ([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Fees */}
          <div className="space-y-2">
            <Label htmlFor="renewalFeeZar">Renewal Fee (ZAR)</Label>
            <Input
              id="renewalFeeZar"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register("renewalFeeZar")}
              className={errors.renewalFeeZar ? "border-red-500" : ""}
            />
            {errors.renewalFeeZar && (
              <p className="text-sm text-red-500">
                {errors.renewalFeeZar.message}
              </p>
            )}
          </div>

          {/* Penalties & Arrears */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="penaltiesZar">Penalties (ZAR) - Optional</Label>
              <Input
                id="penaltiesZar"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register("penaltiesZar")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="arrearsZar">Arrears (ZAR) - Optional</Label>
              <Input
                id="arrearsZar"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register("arrearsZar")}
              />
            </div>
          </div>

          {/* Transaction & Processing */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="transactionNumber">
                Transaction Number (Optional)
              </Label>
              <Input
                id="transactionNumber"
                placeholder="Receipt number"
                {...register("transactionNumber")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="processingDays">Processing Days (Optional)</Label>
              <Input
                id="processingDays"
                type="number"
                placeholder="0"
                {...register("processingDays")}
              />
            </div>
          </div>

          {/* Odometer Reading */}
          <div className="space-y-2">
            <Label htmlFor="odometerReading">Odometer Reading (km) *</Label>
            <Input
              id="odometerReading"
              type="number"
              placeholder="0"
              {...register("odometerReading")}
              className={errors.odometerReading ? "border-red-500" : ""}
            />
            {errors.odometerReading && (
              <p className="text-sm text-red-500">{errors.odometerReading.message}</p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes..."
              {...register("notes")}
              rows={3}
            />
          </div>

          {/* Receipt Image - Only for create mode */}
          {mode === "create" && (
            <div className="space-y-2">
              <Label htmlFor="receipt-image-input">Receipt Image</Label>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageCapture}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    id="receipt-image-input"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isCompressing}
                    className={imageError ? "border-red-500" : ""}
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    {isCompressing
                      ? "Processing..."
                      : receiptImage
                        ? "Change Photo"
                        : "Capture Receipt"}
                  </Button>
                </div>
                {receiptImage && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearImage}
                  >
                    Remove
                  </Button>
                )}
              </div>
              {imageError && <p className="text-sm text-red-500">{imageError}</p>}
              {compressionInfo && (
                <p className="text-xs text-green-600">
                  Image compressed: {formatFileSize(compressionInfo.originalSize)}{" "}
                  → {formatFileSize(compressionInfo.compressedSize)}
                </p>
              )}
              {previewUrl && (
                <div className="mt-2">
                  <img
                    src={previewUrl}
                    alt="Receipt preview"
                    className="max-h-48 rounded-lg border object-contain"
                  />
                </div>
              )}
            </div>
          )}

          {/* Submit */}
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || (mode === "create" && !receiptImage)}
          >
            {isSubmitting ? "Saving..." : "Save License Renewal"}
          </Button>

          {/* Receipt Images Manager for Edit Mode */}
          {mode === 'edit' && entryId && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-chart-1" />
                <h3 className="text-base font-semibold">Receipt Images</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Attach or manage receipt images for this expense.
              </p>
              {onImageUpload && onImageDelete && onImageReupload && onImageLock ? (
                <EntryImageManager
                  entryId={entryId}
                  entryType="EXPENSE"
                  images={existingImages}
                  onUpload={onImageUpload}
                  onDelete={onImageDelete}
                  onReupload={onImageReupload}
                  onLock={onImageLock}
                />
              ) : (
                <p className="text-sm text-muted-foreground">Image management not available</p>
              )}
            </div>
          )}
        </form>
      </CardContent>
    </Card>

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
    </>
  );
}
