"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Camera, CalendarIcon, Car } from "lucide-react";
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
import { ROADWORTHY_RESULT_LABELS } from "@/lib/types/database";
import {
  processReceiptImage,
  validateImageFile,
  formatFileSize,
} from "@/lib/utils/image-converter";
import { ReceiptSupportProps } from "./form-types";
import { EntryImageManager } from "@/components/entries/entry-image-manager";
import { ImageCropModal } from "@/components/ui/image-crop-modal";

const roadworthySchema = z.object({
  vehicleId: z.string().min(1, "Select a vehicle"),
  date: z.date({ required_error: "Select a date" }),
  testingStationName: z.string().min(1, "Enter testing station name"),
  testingStationAddress: z.string().optional(),
  testingStationPhone: z.string().optional(),
  testDate: z.date({ required_error: "Select test date" }),
  certificateNumber: z.string().optional(),
  expiryDate: z.date().optional(),
  testResult: z.enum(["PASS", "FAIL", "CONDITIONAL_PASS"]),
  testFeeZar: z.coerce.number().positive("Enter test fee"),
  retestFeeZar: z.coerce.number().optional(),
  inspectorName: z.string().optional(),
  vehicleOdometer: z.coerce.number().optional(),
  failureReasons: z.string().optional(),
  conditionsApplied: z.string().optional(),
  notes: z.string().optional(),
});

type RoadworthyInput = z.infer<typeof roadworthySchema>;

interface Vehicle {
  id: string;
  registrationNumber: string;
  make: string;
  model: string;
}

interface RoadworthyFormProps extends ReceiptSupportProps {
  vehicles: Vehicle[];
  onSubmit: (data: RoadworthyInput, receiptImage: File | null) => Promise<void>;
  initialData?: Partial<RoadworthyInput>;
}

export function RoadworthyForm({
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
}: RoadworthyFormProps) {
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
  const [testDateInput, setTestDateInput] = useState("");
  const [expiryDateInput, setExpiryDateInput] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RoadworthyInput>({
    resolver: zodResolver(roadworthySchema),
    defaultValues: initialData || {
      vehicleId: "",
      date: new Date(),
      testDate: new Date(),
      testResult: "PASS",
    },
  });

  const watchVehicleId = watch("vehicleId");
  const watchDate = watch("date");
  const watchTestDate = watch("testDate");
  const watchExpiryDate = watch("expiryDate");

  // Initialize date inputs from watched values when in edit mode
  useEffect(() => {
    if (mode === 'edit') {
      if (watchDate) setDateInput(format(watchDate, 'yyyy-MM-dd'))
      if (watchTestDate) setTestDateInput(format(watchTestDate, 'yyyy-MM-dd'))
      if (watchExpiryDate) setExpiryDateInput(format(watchExpiryDate, 'yyyy-MM-dd'))
    }
  }, [mode, watchDate, watchTestDate, watchExpiryDate]);

  // Set preview from existing images when in edit mode
  useEffect(() => {
    if (mode === "edit" && existingImages.length > 0 && !previewUrl) {
      const firstImage = existingImages[0];
      setPreviewUrl(firstImage.imageUrl);
    }
  }, [mode, existingImages, previewUrl]);
  const watchResult = watch("testResult");

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

  const handleFormSubmit = async (data: RoadworthyInput) => {
    if (mode === "create" && !receiptImage) {
      setImageError("Please capture a receipt image");
      return;
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
            <Car className="h-5 w-5 text-indigo-500" />
            Roadworthy Certificate
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

          {/* Entry Date */}
          <div className="space-y-2">
            <Label htmlFor="date">Entry Date</Label>
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

          {/* Testing Station */}
          <div className="space-y-2">
            <Label htmlFor="testingStationName">Testing Station Name *</Label>
            <Input
              id="testingStationName"
              placeholder="e.g., DEKRA, Technical Bureau"
              {...register("testingStationName")}
              className={errors.testingStationName ? "border-red-500" : ""}
            />
            {errors.testingStationName && (
              <p className="text-sm text-red-500">
                {errors.testingStationName.message}
              </p>
            )}
          </div>

          {/* Station Address & Phone */}
          <div className="space-y-2">
            <Label htmlFor="testingStationAddress">
              Station Address (Optional)
            </Label>
            <Input
              id="testingStationAddress"
              placeholder="Testing station address"
              {...register("testingStationAddress")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="testingStationPhone">
              Station Phone (Optional)
            </Label>
            <Input
              id="testingStationPhone"
              placeholder="Contact number"
              {...register("testingStationPhone")}
            />
          </div>

          {/* Test Date */}
          <div className="space-y-2">
            <Label htmlFor="testDate">Test Date *</Label>
            <Input
              id="testDate"
              name="testDate"
              type="text"
              inputMode="numeric"
              pattern="\d{4}-\d{2}-\d{2}"
              placeholder="YYYY-MM-DD"
              value={testDateInput || (watchTestDate ? format(watchTestDate, "yyyy-MM-dd") : "")}
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
                setTestDateInput(value);
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
                  
                  setValue("testDate", new Date(value));
                }
              }}
              maxLength={10}
              className={errors.testDate ? "border-red-500" : ""}
            />
            {errors.testDate && (
              <p className="text-sm text-red-500">{errors.testDate.message}</p>
            )}
          </div>

          {/* Test Result */}
          <div className="space-y-2">
            <Label htmlFor="testResult">Test Result</Label>
            <Select
              value={watchResult}
              onValueChange={(val) => setValue("testResult", val as any)}
              name="testResult"
            >
              <SelectTrigger id="testResult">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ROADWORTHY_RESULT_LABELS).map(
                  ([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Certificate Number */}
          <div className="space-y-2">
            <Label htmlFor="certificateNumber">
              Certificate Number (Optional)
            </Label>
            <Input
              id="certificateNumber"
              placeholder="Certificate number"
              {...register("certificateNumber")}
            />
          </div>

          {/* Expiry Date */}
          <div className="space-y-2">
            <Label htmlFor="expiryDate">Certificate Expiry (Optional)</Label>
            <Input
              id="expiryDate"
              name="expiryDate"
              type="text"
              inputMode="numeric"
              pattern="\d{4}-\d{2}-\d{2}"
              placeholder="YYYY-MM-DD"
              value={expiryDateInput || (watchExpiryDate ? format(watchExpiryDate, "yyyy-MM-dd") : "")}
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
                setExpiryDateInput(value);
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
                  
                  setValue("expiryDate", new Date(value));
                }
              }}
              maxLength={10}
            />
          </div>

          {/* Test Fee */}
          <div className="space-y-2">
            <Label htmlFor="testFeeZar">Test Fee (ZAR)</Label>
            <Input
              id="testFeeZar"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register("testFeeZar")}
              className={errors.testFeeZar ? "border-red-500" : ""}
            />
            {errors.testFeeZar && (
              <p className="text-sm text-red-500">
                {errors.testFeeZar.message}
              </p>
            )}
          </div>

          {/* Retest Fee */}
          <div className="space-y-2">
            <Label htmlFor="retestFeeZar">Retest Fee (ZAR) - Optional</Label>
            <Input
              id="retestFeeZar"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register("retestFeeZar")}
            />
          </div>

          {/* Inspector & Odometer */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="inspectorName">Inspector Name (Optional)</Label>
              <Input
                id="inspectorName"
                placeholder="Inspector"
                {...register("inspectorName")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicleOdometer">
                Odometer Reading (Optional)
              </Label>
              <Input
                id="vehicleOdometer"
                type="number"
                placeholder="km"
                {...register("vehicleOdometer")}
              />
            </div>
          </div>

          {/* Failure Reasons (only show if failed) */}
          {watchResult === "FAIL" && (
            <div className="space-y-2">
              <Label htmlFor="failureReasons">Failure Reasons</Label>
              <Textarea
                id="failureReasons"
                placeholder="Why did the vehicle fail?"
                {...register("failureReasons")}
                rows={3}
              />
            </div>
          )}

          {/* Conditions Applied */}
          <div className="space-y-2">
            <Label htmlFor="conditionsApplied">
              Conditions Applied (Optional)
            </Label>
            <Textarea
              id="conditionsApplied"
              placeholder="Any conditions on certificate..."
              {...register("conditionsApplied")}
              rows={2}
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
            disabled={isSubmitting || (mode === "create" && !receiptImage)}
          >
            {isSubmitting ? "Saving..." : "Save Roadworthy Certificate"}
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
