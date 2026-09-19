"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Camera, CalendarIcon, Shield } from "lucide-react";
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
import { INSURANCE_POLICY_TYPE_LABELS } from "@/lib/types/database";
import {
  processReceiptImage,
  processOdometerImage,
  validateImageFile,
  formatFileSize,
} from "@/lib/utils/image-converter";
import { ReceiptSupportProps } from "./form-types";
import { EntryImageManager } from "@/components/entries/entry-image-manager";
import { ImageCropModal } from "@/components/ui/image-crop-modal";

const insuranceSchema = z.object({
  vehicleId: z.string().min(1, "Select a vehicle"),
  date: z.date({ required_error: "Select a date" }),
  insurerName: z.string().min(1, "Enter insurer name"),
  policyNumber: z.string().min(1, "Enter policy number"),
  policyType: z.enum([
    "COMPREHENSIVE",
    "THIRD_PARTY",
    "THIRD_PARTY_FIRE_THEFT",
  ]),
  coverageStartDate: z.date({ required_error: "Select coverage start date" }),
  coverageEndDate: z.date({ required_error: "Select coverage end date" }),
  monthlyPremiumZar: z.coerce.number().positive("Enter monthly premium"),
  excessAmountZar: z.coerce.number().optional(),
  odometerReading: z.coerce.number().positive("Enter odometer reading"),
  odometerReadingDate: z.date().optional(),
  brokerName: z.string().optional(),
  brokerPhone: z.string().optional(),
  claimPhoneNumber: z.string().optional(),
  coverDetails: z.string().optional(),
});

type InsuranceInput = z.infer<typeof insuranceSchema>;

interface Vehicle {
  id: string;
  registrationNumber: string;
  make: string;
  model: string;
}

interface InsuranceFormProps extends ReceiptSupportProps {
  vehicles: Vehicle[];
  onSubmit: (data: InsuranceInput, receiptImage: File | null, odometerImage: File | null) => Promise<void>;
  initialData?: Partial<InsuranceInput>;
}

export function InsuranceForm({
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
}: InsuranceFormProps) {
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
  const [coverageStartInput, setCoverageStartInput] = useState("");
  const [coverageEndInput, setCoverageEndInput] = useState("");
  const [odometerDateInput, setOdometerDateInput] = useState("");
  
  // Odometer photo state
  const [odometerImage, setOdometerImage] = useState<File | null>(null);
  const [odometerPreviewUrl, setOdometerPreviewUrl] = useState<string | null>(null);
  const [odometerImageError, setOdometerImageError] = useState<string | null>(null);
  const [isCompressingOdometer, setIsCompressingOdometer] = useState(false);
  const [showOdometerCropModal, setShowOdometerCropModal] = useState(false);
  const [originalOdometerFile, setOriginalOdometerFile] = useState<File | null>(null);
  const [odometerCaptureTime, setOdometerCaptureTime] = useState<Date | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<InsuranceInput>({
    resolver: zodResolver(insuranceSchema),
    defaultValues: initialData || {
      vehicleId: "",
      date: new Date(),
      policyType: "COMPREHENSIVE",
    },
  });

  const watchVehicleId = watch("vehicleId");
  const watchDate = watch("date");
  const watchCoverageStart = watch("coverageStartDate");
  const watchCoverageEnd = watch("coverageEndDate");
  const watchPolicyType = watch("policyType");
  const watchOdometerReading = watch("odometerReading");
  const watchOdometerReadingDate = watch("odometerReadingDate");

  // Initialize date inputs from watched values when in edit mode
  useEffect(() => {
    if (mode === 'edit') {
      if (watchDate) setDateInput(format(watchDate, 'yyyy-MM-dd'))
      if (watchCoverageStart) setCoverageStartInput(format(watchCoverageStart, 'yyyy-MM-dd'))
      if (watchCoverageEnd) setCoverageEndInput(format(watchCoverageEnd, 'yyyy-MM-dd'))
      if (watchOdometerReadingDate) setOdometerDateInput(format(watchOdometerReadingDate, 'yyyy-MM-dd'))
    }
  }, [mode, watchDate, watchCoverageStart, watchCoverageEnd, watchOdometerReadingDate]);

  // Set preview from existing images when in edit mode
  useEffect(() => {
    if (mode === "edit" && existingImages.length > 0 && !previewUrl) {
      const firstImage = existingImages[0];
      setPreviewUrl(firstImage.imageUrl);
    }
  }, [mode, existingImages, previewUrl]);

  // Set odometer preview from existing images when in edit mode (look for ODOMETER type)
  useEffect(() => {
    if (mode === "edit" && existingImages.length > 0 && !odometerPreviewUrl) {
      const odometerImage = existingImages.find(img => img.imageType === 'ODOMETER');
      if (odometerImage) {
        setOdometerPreviewUrl(odometerImage.imageUrl);
      }
    }
  }, [mode, existingImages, odometerPreviewUrl]);

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

  // Odometer image handlers - show crop modal with full image by default
  const handleOdometerImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setOdometerImageError(validation.error || "Invalid image file");
      return;
    }

    setOriginalOdometerFile(file);
    setShowOdometerCropModal(true);
  };

  const handleOdometerCropConfirm = async (croppedFile: File, originalFile: File) => {
    console.log('handleOdometerCropConfirm - croppedFile:', croppedFile.name, croppedFile.size);
    setShowOdometerCropModal(false);
    setIsCompressingOdometer(true);

    try {
      // Process cropped image with high-quality settings
      const processed = await processOdometerImage(croppedFile);
      console.log('handleOdometerCropConfirm - processed:', processed);
      const processedFile = new File([processed.blob], croppedFile.name, {
        type: processed.format,
      });
      console.log('handleOdometerCropConfirm - processedFile:', processedFile.name, processedFile.size);
      setOdometerImage(processedFile);
      setOdometerPreviewUrl(URL.createObjectURL(processed.blob));
      setOdometerCaptureTime(new Date());
      setOdometerImageError(null);
      console.log('handleOdometerCropConfirm - odometerImage set');
    } catch (err) {
      console.error('handleOdometerCropConfirm - error:', err);
      setOdometerImageError("Failed to process image. Please try again.");
    } finally {
      setIsCompressingOdometer(false);
    }
  };

  const handleOdometerCropCancel = () => {
    setShowOdometerCropModal(false);
    setOriginalOdometerFile(null);
  };


  const clearOdometerImage = () => {
    setOdometerImage(null);
    setOdometerPreviewUrl(null);
    setOdometerImageError(null);
  };

  const handleFormSubmit = async (data: InsuranceInput) => {
    if (mode === "create" && !receiptImage) {
      setImageError("Please capture a receipt image");
      return;
    }
    if (mode === "create" && !odometerImage) {
      setOdometerImageError("Please capture an odometer photo as proof of reading");
      return;
    }
    setIsSubmitting(true);
    try {
      // Set odometerReadingDate to current date when odometer photo is provided
      if (odometerImage && !data.odometerReadingDate) {
        setValue("odometerReadingDate", new Date());
        data.odometerReadingDate = new Date();
      }
      await onSubmit(data, mode === "create" ? receiptImage : null, mode === "create" ? odometerImage : null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-500" />
            Insurance Premium
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
            <Label htmlFor="date">Date</Label>
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

          {/* Insurer */}
          <div className="space-y-2">
            <Label htmlFor="insurerName">Insurer Name</Label>
            <Input
              id="insurerName"
              placeholder="e.g., Discovery, Outsurance"
              {...register("insurerName")}
              className={errors.insurerName ? "border-red-500" : ""}
            />
            {errors.insurerName && (
              <p className="text-sm text-red-500">
                {errors.insurerName.message}
              </p>
            )}
          </div>

          {/* Policy Number */}
          <div className="space-y-2">
            <Label htmlFor="policyNumber">Policy Number</Label>
            <Input
              id="policyNumber"
              placeholder="Policy number"
              {...register("policyNumber")}
              className={errors.policyNumber ? "border-red-500" : ""}
            />
            {errors.policyNumber && (
              <p className="text-sm text-red-500">
                {errors.policyNumber.message}
              </p>
            )}
          </div>

          {/* Policy Type */}
          <div className="space-y-2">
            <Label htmlFor="policyType">Policy Type</Label>
            <Select
              value={watchPolicyType}
              onValueChange={(val) => setValue("policyType", val as any)}
              name="policyType"
            >
              <SelectTrigger id="policyType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(INSURANCE_POLICY_TYPE_LABELS).map(
                  ([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Coverage Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="coverageStartDate">Coverage Start</Label>
              <Input
                id="coverageStartDate"
                name="coverageStartDate"
                type="text"
                inputMode="numeric"
                pattern="\d{4}-\d{2}-\d{2}"
                placeholder="YYYY-MM-DD"
                value={coverageStartInput || (watchCoverageStart ? format(watchCoverageStart, "yyyy-MM-dd") : "")}
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
                  setCoverageStartInput(value);
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
                    
                    setValue("coverageStartDate", new Date(value));
                  }
                }}
                maxLength={10}
                className={errors.coverageStartDate ? "border-red-500" : ""}
              />
              {errors.coverageStartDate && (
                <p className="text-sm text-red-500">{errors.coverageStartDate.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="coverageEndDate">Coverage End</Label>
              <Input
                id="coverageEndDate"
                name="coverageEndDate"
                type="text"
                inputMode="numeric"
                pattern="\d{4}-\d{2}-\d{2}"
                placeholder="YYYY-MM-DD"
                value={coverageEndInput || (watchCoverageEnd ? format(watchCoverageEnd, "yyyy-MM-dd") : "")}
                onChange={(e) => {
                  let value = e.target.value.replace(/\D/g, '');
                  const digits = value;
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
                  setCoverageEndInput(value);
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
                    
                    setValue("coverageEndDate", new Date(value));
                  }
                }}
                maxLength={10}
                className={errors.coverageEndDate ? "border-red-500" : ""}
              />
              {errors.coverageEndDate && (
                <p className="text-sm text-red-500">{errors.coverageEndDate.message}</p>
              )}
            </div>
          </div>

          {/* Monthly Premium */}
          <div className="space-y-2">
            <Label htmlFor="monthlyPremiumZar">Monthly Premium (ZAR)</Label>
            <Input
              id="monthlyPremiumZar"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register("monthlyPremiumZar")}
              className={errors.monthlyPremiumZar ? "border-red-500" : ""}
            />
            {errors.monthlyPremiumZar && (
              <p className="text-sm text-red-500">
                {errors.monthlyPremiumZar.message}
              </p>
            )}
          </div>

          {/* Excess */}
          <div className="space-y-2">
            <Label htmlFor="excessAmountZar">
              Excess Amount (ZAR) - Optional
            </Label>
            <Input
              id="excessAmountZar"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register("excessAmountZar")}
            />
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

          {/* Odometer Photo (Proof of Reading) */}
          <div className="space-y-2">
            <Label htmlFor="odometer-photo">Odometer Photo (Proof of Reading) *</Label>

            <div className="flex items-center gap-4">
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleOdometerImageCapture}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  id="odometer-photo"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={isCompressingOdometer}
                  className={odometerImageError ? "border-red-500" : ""}
                >
                  <Camera className="mr-2 h-4 w-4" />
                  {isCompressingOdometer
                    ? "Processing..."
                    : odometerImage
                      ? "Change Photo"
                      : "Capture Odometer"}
                </Button>
              </div>
              {odometerImage && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearOdometerImage}
                >
                  Remove
                </Button>
              )}
            </div>
            {odometerImageError && (
              <p className="text-sm text-red-500">{odometerImageError}</p>
            )}
            {odometerPreviewUrl && (
              <div className="mt-2">
                <div className="relative">
                  <img
                    src={odometerPreviewUrl}
                    alt="Odometer reading"
                    className="max-h-48 rounded-lg border object-contain"
                  />
                  <div className="absolute top-2 right-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => document.getElementById('odometer-photo')?.click()}
                    >
                      Replace
                    </Button>
                  </div>
                </div>
                {odometerCaptureTime && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Captured: {odometerCaptureTime.toLocaleString()}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Broker */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brokerName">Broker Name (Optional)</Label>
              <Input
                id="brokerName"
                placeholder="Broker name"
                {...register("brokerName")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brokerPhone">Broker Phone (Optional)</Label>
              <Input
                id="brokerPhone"
                placeholder="Phone number"
                {...register("brokerPhone")}
              />
            </div>
          </div>

          {/* Claim Phone */}
          <div className="space-y-2">
            <Label htmlFor="claimPhoneNumber">
              Claim Phone Number (Optional)
            </Label>
            <Input
              id="claimPhoneNumber"
              placeholder="Emergency claim line"
              {...register("claimPhoneNumber")}
            />
          </div>

          {/* Cover Details */}
          <div className="space-y-2">
            <Label htmlFor="coverDetails">Cover Details (Optional)</Label>
            <Textarea
              id="coverDetails"
              placeholder="Additional coverage details..."
              {...register("coverDetails")}
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
            disabled={isSubmitting || (mode === "create" && (!receiptImage || !odometerImage))}
          >
            {isSubmitting ? "Saving..." : "Save Insurance Premium"}
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

    {/* Odometer Image Crop Modal */}
    {originalOdometerFile && (
      <ImageCropModal
        imageFile={originalOdometerFile}
        mode="odometer"
        onConfirm={handleOdometerCropConfirm}
        onCancel={handleOdometerCropCancel}
        isOpen={showOdometerCropModal}
      />
    )}
    </>
  );
}
