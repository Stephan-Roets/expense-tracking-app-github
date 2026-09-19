"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Camera, CalendarIcon, CreditCard } from "lucide-react";
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
import { ETOLL_PAYMENT_METHOD_LABELS } from "@/lib/types/database";
import {
  processReceiptImage,
  validateImageFile,
  formatFileSize,
} from "@/lib/utils/image-converter";
import { ReceiptSupportProps } from "./form-types";
import { EntryImageManager } from "@/components/entries/entry-image-manager";
import { ImageCropModal } from "@/components/ui/image-crop-modal";

const etollSchema = z.object({
  vehicleId: z.string().min(1, "Select a vehicle"),
  date: z.date({ required_error: "Select a date" }),
  accountNumber: z.string().optional(),
  tagSerialNumber: z.string().optional(),
  vehicleRegistration: z.string().min(1, "Enter vehicle registration"),
  paymentMethod: z.enum([
    "ETAG",
    "VIOLATION",
    "ALTERNATE_ROUTE",
    "MONTHLY_PASS",
  ]),
  tollRoutes: z.string().optional(),
  periodStartDate: z.date().optional(),
  periodEndDate: z.date().optional(),
  totalGantries: z.coerce.number().optional(),
  totalAmountZar: z.coerce.number().positive("Enter total amount"),
  vatAmountZar: z.coerce.number().optional(),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

type ETollInput = z.infer<typeof etollSchema>;

interface Vehicle {
  id: string;
  registrationNumber: string;
  make: string;
  model: string;
}

interface ETollFormProps extends ReceiptSupportProps {
  vehicles: Vehicle[];
  onSubmit: (data: ETollInput, receiptImage: File | null) => Promise<void>;
  initialData?: Partial<ETollInput>;
}

export function ETollForm({
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
}: ETollFormProps) {
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
  const [periodStartInput, setPeriodStartInput] = useState("");
  const [periodEndInput, setPeriodEndInput] = useState("");
  const [dateInput, setDateInput] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ETollInput>({
    resolver: zodResolver(etollSchema),
    defaultValues: initialData || {
      vehicleId: "",
      date: new Date(),
      paymentMethod: "ETAG",
    },
  });

  const watchDate = watch("date");
  const watchPeriodStart = watch("periodStartDate");
  const watchPeriodEnd = watch("periodEndDate");

  // Initialize date inputs from watched values when in edit mode
  useEffect(() => {
    if (mode === 'edit') {
      if (watchDate) setDateInput(format(watchDate, 'yyyy-MM-dd'))
      if (watchPeriodStart) setPeriodStartInput(format(watchPeriodStart, 'yyyy-MM-dd'))
      if (watchPeriodEnd) setPeriodEndInput(format(watchPeriodEnd, 'yyyy-MM-dd'))
    }
  }, [mode, watchDate, watchPeriodStart, watchPeriodEnd]);

  // Set preview from existing images when in edit mode
  useEffect(() => {
    if (mode === "edit" && existingImages.length > 0 && !previewUrl) {
      const firstImage = existingImages[0];
      setPreviewUrl(firstImage.imageUrl);
    }
  }, [mode, existingImages, previewUrl]);

  const watchVehicleId = watch("vehicleId");
  const watchPaymentMethod = watch("paymentMethod");

  // Auto-fill vehicle registration when vehicle is selected
  const selectedVehicle = vehicles.find((v) => v.id === watchVehicleId);

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

  const handleFormSubmit = async (data: ETollInput) => {
    if (mode === "create" && !receiptImage) {
      setImageError("Receipt image is required");
      return;
    }
    // Auto-fill vehicle registration if not provided
    if (!data.vehicleRegistration && selectedVehicle) {
      data.vehicleRegistration = selectedVehicle.registrationNumber;
    }
    setImageError(null);
    setIsSubmitting(true);
    try {
      await onSubmit(data, receiptImage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-amber-500" />
            E-Toll Payment
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
            <Label htmlFor="date">Payment Date</Label>
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

          {/* Payment Method */}
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Payment Method</Label>
            <Select
              value={watchPaymentMethod}
              onValueChange={(val) => setValue("paymentMethod", val as any)}
              name="paymentMethod"
            >
              <SelectTrigger id="paymentMethod">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ETOLL_PAYMENT_METHOD_LABELS).map(
                  ([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Account & Tag */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="accountNumber">Account Number (Optional)</Label>
              <Input
                id="accountNumber"
                placeholder="SANRAL account"
                {...register("accountNumber")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tagSerialNumber">Tag Serial (Optional)</Label>
              <Input
                id="tagSerialNumber"
                placeholder="e-Tag serial"
                {...register("tagSerialNumber")}
              />
            </div>
          </div>

          {/* Vehicle Registration */}
          <div className="space-y-2">
            <Label htmlFor="vehicleRegistration">Vehicle Registration</Label>
            <Input
              id="vehicleRegistration"
              placeholder="e.g., ABC123GP"
              defaultValue={selectedVehicle?.registrationNumber || ""}
              {...register("vehicleRegistration")}
              className={errors.vehicleRegistration ? "border-red-500" : ""}
            />
            {errors.vehicleRegistration && (
              <p className="text-sm text-red-500">
                {errors.vehicleRegistration.message}
              </p>
            )}
          </div>

          {/* Period Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="periodStartDate">Period Start (Optional)</Label>
              <Input
                id="periodStartDate"
                name="periodStartDate"
                type="text"
                inputMode="numeric"
                pattern="\d{4}-\d{2}-\d{2}"
                placeholder="YYYY-MM-DD"
                value={periodStartInput || (watchPeriodStart ? format(watchPeriodStart, "yyyy-MM-dd") : "")}
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
                  setPeriodStartInput(value);
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
                    
                    setValue("periodStartDate", new Date(value));
                  }
                }}
                maxLength={10}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="periodEndDate">Period End (Optional)</Label>
              <Input
                id="periodEndDate"
                name="periodEndDate"
                type="text"
                inputMode="numeric"
                pattern="\d{4}-\d{2}-\d{2}"
                placeholder="YYYY-MM-DD"
                value={periodEndInput || (watchPeriodEnd ? format(watchPeriodEnd, "yyyy-MM-dd") : "")}
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
                  setPeriodEndInput(value);
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
                    
                    setValue("periodEndDate", new Date(value));
                  }
                }}
                maxLength={10}
              />
            </div>
          </div>

          {/* Gantries & Routes */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="totalGantries">Total Gantries (Optional)</Label>
              <Input
                id="totalGantries"
                type="number"
                placeholder="0"
                {...register("totalGantries")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="referenceNumber">
                Reference Number (Optional)
              </Label>
              <Input
                id="referenceNumber"
                placeholder="Payment reference"
                {...register("referenceNumber")}
              />
            </div>
          </div>

          {/* Toll Routes */}
          <div className="space-y-2">
            <Label htmlFor="tollRoutes">Toll Routes (Optional)</Label>
            <Input
              id="tollRoutes"
              placeholder="e.g., N1, N3, N12"
              {...register("tollRoutes")}
            />
          </div>

          {/* Amount & VAT */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="totalAmountZar">Total Amount (ZAR)</Label>
              <Input
                id="totalAmountZar"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register("totalAmountZar")}
                className={errors.totalAmountZar ? "border-red-500" : ""}
              />
              {errors.totalAmountZar && (
                <p className="text-sm text-red-500">
                  {errors.totalAmountZar.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="vatAmountZar">VAT Amount (ZAR) - Optional</Label>
              <Input
                id="vatAmountZar"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register("vatAmountZar")}
              />
            </div>
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

          {/* Receipt Image - Only for create mode */}
          {mode === 'create' && (
            <div className="space-y-2">
              <Label htmlFor="receipt-image">
                Capture Receipt Image{" "}
                <span className="text-destructive">*</span>
              </Label>

              <div className="flex items-center gap-4">
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageCapture}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    id="receipt-image"
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
            {isSubmitting ? "Saving..." : "Save E-Toll Payment"}
          </Button>
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
