"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Camera, CalendarIcon, MapPin } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { TRACKING_SUBSCRIPTION_LABELS } from "@/lib/types/database";
import {
  processReceiptImage,
  processOdometerImage,
  validateImageFile,
  formatFileSize,
} from "@/lib/utils/image-converter";
import { ReceiptSupportProps } from "./form-types";
import { EntryImageManager } from "@/components/entries/entry-image-manager";
import { API_URL } from "@/lib/api/client";
import { ImageCropModal } from "@/components/ui/image-crop-modal";

const trackingSchema = z.object({
  vehicleId: z.string().optional(),
  date: z.date({ required_error: "Select a date" }),
  providerName: z.string().min(1, "Enter provider name"),
  subscriptionType: z.enum(["MONTHLY", "ANNUAL", "ONCE_OFF"]),
  monthlyFeeZar: z.coerce.number().positive("Enter monthly fee"),
  subscriptionStartDate: z.date({
    required_error: "Select subscription start date",
  }),
  subscriptionEndDate: z.date().optional(),
  deviceSerialNumber: z.string().optional(),
  deviceType: z.string().optional(),
  installationDate: z.date().optional(),
  installationFeeZar: z.coerce.number().optional(),
  contractDurationMonths: z.coerce.number().optional(),
  recoveryIncluded: z.boolean().default(false),
  odometerReading: z.coerce.number().positive("Enter odometer reading"),
  odometerReadingDate: z.date({ required_error: "Select odometer reading date" }),
  appLoginEmail: z.string().email().optional().or(z.literal("")),
  supportPhone: z.string().optional(),
  features: z.string().optional(),
  notes: z.string().optional(),
});

type TrackingInput = z.infer<typeof trackingSchema>;

interface Vehicle {
  id: string;
  registrationNumber: string;
  make: string;
  model: string;
}

interface TrackingFormProps extends ReceiptSupportProps {
  vehicles: Vehicle[];
  onSubmit: (data: TrackingInput, receiptImage: File | null, odometerImage: File | null) => Promise<void>;
  initialData?: Partial<TrackingInput>;
}

export function TrackingForm({
  vehicles,
  onSubmit,
  initialData,
  mode,
  existingImages = [],
  entryId,
  onImageUpload,
  onImageDelete,
  onImageReupload,
  onImageLock,
}: TrackingFormProps) {
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
  const [receiptCaptureTime, setReceiptCaptureTime] = useState<Date | null>(null);

  // Odometer photo state
  const [odometerImage, setOdometerImage] = useState<File | null>(null);
  const [odometerPreviewUrl, setOdometerPreviewUrl] = useState<string | null>(null);
  const [odometerImageError, setOdometerImageError] = useState<string | null>(null);
  const [isCompressingOdometer, setIsCompressingOdometer] = useState(false);
  const [showOdometerCropModal, setShowOdometerCropModal] = useState(false);
  const [originalOdometerFile, setOriginalOdometerFile] = useState<File | null>(null);
  const [odometerCaptureTime, setOdometerCaptureTime] = useState<Date | null>(null);

  const [dateInput, setDateInput] = useState("");
  const [subscriptionStartInput, setSubscriptionStartInput] = useState("");
  const [subscriptionEndInput, setSubscriptionEndInput] = useState("");
  const [installDateInput, setInstallDateInput] = useState("");
  const [odometerDateInput, setOdometerDateInput] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TrackingInput>({
    resolver: zodResolver(trackingSchema),
    defaultValues: initialData || {
      vehicleId: "",
      date: new Date(),
    },
  });

  const watchVehicleId = watch("vehicleId");
  const watchDate = watch("date");
  const watchSubscriptionStart = watch("subscriptionStartDate");
  const watchSubscriptionEnd = watch("subscriptionEndDate");
  const watchInstallDate = watch("installationDate");
  const watchOdometerReading = watch("odometerReading");
  const watchOdometerReadingDate = watch("odometerReadingDate");

  // Initialize date inputs from watched values when in edit mode
  useEffect(() => {
    if (mode === "edit") {
      if (watchDate) setDateInput(format(watchDate, "yyyy-MM-dd"));
      if (watchSubscriptionStart)
        setSubscriptionStartInput(format(watchSubscriptionStart, "yyyy-MM-dd"));
      if (watchSubscriptionEnd)
        setSubscriptionEndInput(format(watchSubscriptionEnd, "yyyy-MM-dd"));
      if (watchInstallDate)
        setInstallDateInput(format(watchInstallDate, "yyyy-MM-dd"));
      if (watchOdometerReadingDate)
        setOdometerDateInput(format(watchOdometerReadingDate, "yyyy-MM-dd"));
    }
  }, [
    mode,
    watchDate,
    watchSubscriptionStart,
    watchSubscriptionEnd,
    watchInstallDate,
    watchOdometerReadingDate,
  ]);

  // Set preview from existing images when in edit mode
  useEffect(() => {
    console.log("TrackingForm - useEffect triggered:", {
      mode,
      existingImagesLength: existingImages.length,
      previewUrl,
    });
    if (mode === "edit" && existingImages.length > 0 && !previewUrl) {
      const firstImage = existingImages[0];
      console.log("TrackingForm - Setting previewUrl from:", firstImage);
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

  const watchSubscriptionType = watch("subscriptionType");
  const watchRecovery = watch("recoveryIncluded");
  const requiresNewReceipt = mode === "create";

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
      setReceiptCaptureTime(new Date());
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
    setShowOdometerCropModal(false);
    setIsCompressingOdometer(true);

    try {
      const processed = await processOdometerImage(croppedFile);
      const processedFile = new File([processed.blob], croppedFile.name, {
        type: processed.format,
      });
      setOdometerImage(processedFile);
      setOdometerPreviewUrl(URL.createObjectURL(processed.blob));
      setOdometerCaptureTime(new Date());
      setOdometerImageError(null);
    } catch (err) {
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
    setOdometerCaptureTime(null);
    setOdometerImageError(null);
  };

  const handleFormSubmit = async (data: TrackingInput) => {
    if (requiresNewReceipt && !receiptImage) {
      setImageError("Please capture a receipt image");
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit(data, receiptImage, odometerImage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-violet-500" />
            Vehicle Tracking Subscription
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Vehicle */}
          {mode === "create" ? (
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
                <p className="text-sm text-red-500">
                  {errors.vehicleId.message}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="vehicle-display">Vehicle</Label>
              <Input
                id="vehicle-display"
                value={(() => {
                  const vehicle = vehicles.find(
                    (v) => v.id === initialData?.vehicleId,
                  );
                  return vehicle
                    ? `${vehicle.registrationNumber} - ${vehicle.make} ${vehicle.model}`
                    : "Unknown";
                })()}
                readOnly
                className="bg-muted"
              />
            </div>
          )}

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

          {/* Provider */}
          <div className="space-y-2">
            <Label htmlFor="providerName">Provider Name</Label>
            <Input
              id="providerName"
              placeholder="e.g., Tracker, Netstar, Cartrack"
              {...register("providerName")}
              className={errors.providerName ? "border-red-500" : ""}
            />
            {errors.providerName && (
              <p className="text-sm text-red-500">
                {errors.providerName.message}
              </p>
            )}
          </div>

          {/* Subscription Type */}
          <div className="space-y-2">
            <Label htmlFor="subscriptionType">Subscription Type</Label>
            <Select
              value={watchSubscriptionType}
              onValueChange={(val) => setValue("subscriptionType", val as any)}
              name="subscriptionType"
            >
              <SelectTrigger id="subscriptionType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TRACKING_SUBSCRIPTION_LABELS).map(
                  ([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Monthly Fee */}
          <div className="space-y-2">
            <Label htmlFor="monthlyFeeZar">Monthly Fee (ZAR)</Label>
            <Input
              id="monthlyFeeZar"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register("monthlyFeeZar")}
              className={errors.monthlyFeeZar ? "border-red-500" : ""}
            />
            {errors.monthlyFeeZar && (
              <p className="text-sm text-red-500">
                {errors.monthlyFeeZar.message}
              </p>
            )}
          </div>

          {/* Installation Fee & Contract Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="installationFeeZar">Installation Fee (ZAR)</Label>
              <Input
                id="installationFeeZar"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register("installationFeeZar")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contractDurationMonths">
                Contract Duration (Months)
              </Label>
              <Input
                id="contractDurationMonths"
                type="number"
                placeholder="24"
                {...register("contractDurationMonths")}
              />
            </div>
          </div>

          {/* Device Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="deviceSerialNumber">
                Device Serial (Optional)
              </Label>
              <Input
                id="deviceSerialNumber"
                placeholder="Serial number"
                {...register("deviceSerialNumber")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deviceType">Device Type (Optional)</Label>
              <Input
                id="deviceType"
                placeholder="e.g., GPS, GSM"
                {...register("deviceType")}
              />
            </div>
          </div>

          {/* Subscription Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="subscriptionStartDate">Subscription Start</Label>
              <Input
                id="subscriptionStartDate"
                name="subscriptionStartDate"
                type="text"
                inputMode="numeric"
                pattern="\d{4}-\d{2}-\d{2}"
                placeholder="YYYY-MM-DD"
                value={subscriptionStartInput || (watchSubscriptionStart ? format(watchSubscriptionStart, "yyyy-MM-dd") : "")}
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
                  setSubscriptionStartInput(value);
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
                    
                    setValue("subscriptionStartDate", new Date(value));
                  }
                }}
                maxLength={10}
                className={errors.subscriptionStartDate ? "border-red-500" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subscriptionEndDate">
                Subscription End (Optional)
              </Label>
              <Input
                id="subscriptionEndDate"
                name="subscriptionEndDate"
                type="text"
                inputMode="numeric"
                pattern="\d{4}-\d{2}-\d{2}"
                placeholder="YYYY-MM-DD"
                value={subscriptionEndInput || (watchSubscriptionEnd ? format(watchSubscriptionEnd, "yyyy-MM-dd") : "")}
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
                  setSubscriptionEndInput(value);
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
                    
                    setValue("subscriptionEndDate", new Date(value));
                  }
                }}
                maxLength={10}
              />
            </div>
          </div>

          {/* Installation Date */}
          <div className="space-y-2">
            <Label htmlFor="installationDate">
              Installation Date (Optional)
            </Label>
            <Input
              id="installationDate"
              name="installationDate"
              type="text"
              inputMode="numeric"
              pattern="\d{4}-\d{2}-\d{2}"
              placeholder="YYYY-MM-DD"
              value={installDateInput || (watchInstallDate ? format(watchInstallDate, "yyyy-MM-dd") : "")}
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
                setInstallDateInput(value);
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
                  
                  setValue("installationDate", new Date(value));
                }
              }}
              maxLength={10}
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

          {/* Odometer Reading Date */}
          <div className="space-y-2">
            <Label htmlFor="odometerReadingDate">Odometer Reading Date *</Label>
            <Input
              id="odometerReadingDate"
              name="odometerReadingDate"
              type="text"
              inputMode="numeric"
              pattern="\d{4}-\d{2}-\d{2}"
              placeholder="YYYY-MM-DD"
              value={odometerDateInput || (watchOdometerReadingDate ? format(watchOdometerReadingDate, 'yyyy-MM-dd') : '')}
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
                setOdometerDateInput(value);
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

                  setValue("odometerReadingDate", new Date(value));
                }
              }}
              maxLength={10}
              className={errors.odometerReadingDate ? "border-red-500" : ""}
            />
            {errors.odometerReadingDate && (
              <p className="text-sm text-red-500">{errors.odometerReadingDate.message}</p>
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
                  aria-label="Odometer photo upload"
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

          {/* Recovery Service */}
          <div className="flex items-center space-x-2">
            <Switch
              id="recoveryIncluded"
              checked={watchRecovery}
              onCheckedChange={(checked) =>
                setValue("recoveryIncluded", checked)
              }
            />
            <Label htmlFor="recoveryIncluded">Recovery Service Included</Label>
          </div>

          {/* App Login */}
          <div className="space-y-2">
            <Label htmlFor="appLoginEmail">App Login Email (Optional)</Label>
            <Input
              id="appLoginEmail"
              type="email"
              placeholder="email@example.com"
              {...register("appLoginEmail")}
            />
          </div>

          {/* Support Phone */}
          <div className="space-y-2">
            <Label htmlFor="supportPhone">Support Phone (Optional)</Label>
            <Input
              id="supportPhone"
              placeholder="Support contact"
              {...register("supportPhone")}
            />
          </div>

          {/* Features */}
          <div className="space-y-2">
            <Label htmlFor="features">Features (Optional)</Label>
            <Textarea
              id="features"
              placeholder="e.g., Live tracking, Geofencing, Battery backup..."
              {...register("features")}
              rows={3}
            />
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
          {mode === 'create' && (
            <div className="space-y-2">
              <Label htmlFor="receipt-image" className="flex items-center gap-2">
                Receipt Image
                <span className="text-xs text-destructive">(Required)</span>
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
                    aria-label="Receipt image upload"
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
                  <div className="relative">
                    <img
                      src={previewUrl}
                      alt="Receipt preview"
                      className="max-h-48 rounded-lg border object-contain"
                    />
                    <div className="absolute top-2 right-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => document.getElementById('receipt-image')?.click()}
                      >
                        Replace
                      </Button>
                    </div>
                  </div>
                  {receiptCaptureTime && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Captured: {receiptCaptureTime.toLocaleString()}
                    </p>
                  )}
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
            {isSubmitting ? "Saving..." : "Save Tracking Subscription"}
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

    {/* Odometer Crop Modal */}
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
