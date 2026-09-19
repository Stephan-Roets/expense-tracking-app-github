"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Camera, CalendarIcon, IdCard } from "lucide-react";
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
  processReceiptImage,
  validateImageFile,
  formatFileSize,
} from "@/lib/utils/image-converter";
import { ReceiptSupportProps } from "./form-types";
import { EntryImageManager } from "@/components/entries/entry-image-manager";
import { ImageCropModal } from "@/components/ui/image-crop-modal";

const personalLicenseSchema = z.object({
  date: z.date({ required_error: "Select a date" }),
  licenseType: z.enum(["DRIVERS_LICENSE", "PERSONAL_ID_CARD", "PDP"]),
  licenseNumber: z.string().min(1, "Enter license/ID number"),
  licenseCode: z.string().optional(),
  issueDate: z.date({ required_error: "Select issue date" }),
  expiryDate: z.date({ required_error: "Select expiry date" }),
  renewalFeeZar: z.coerce.number().positive("Enter renewal fee"),
  penaltiesZar: z.coerce.number().optional(),
  renewalMethod: z.enum([
    "ONLINE",
    "DLTC",
    "DRIVING_SCHOOL",
    "HOME_AFFAIRS",
    "BANK",
  ]),
  issuingAuthority: z.string().optional(),
  notes: z.string().optional(),
});

type PersonalLicenseInput = z.infer<typeof personalLicenseSchema>;

interface PersonalLicenseFormProps extends ReceiptSupportProps {
  onSubmit: (
    data: PersonalLicenseInput,
    receiptImage: File | null,
  ) => Promise<void>;
  initialData?: Partial<PersonalLicenseInput>;
}

const LICENSE_CODES = [
  { value: "A", label: "Code A - Motorcycle" },
  { value: "A1", label: "Code A1 - Motorcycle (under 125cc)" },
  { value: "B", label: "Code B - Light Motor Vehicle (LMV)" },
  { value: "C", label: "Code C - Heavy Motor Vehicle" },
  { value: "C1", label: "Code C1 - Heavy Motor Vehicle (3,500kg-16,000kg)" },
  { value: "EB", label: "Code EB - LMV with trailer" },
  { value: "EC", label: "Code EC - Articulated heavy vehicle" },
  { value: "EC1", label: "Code EC1 - Heavy vehicle with trailer" },
];

const RENEWAL_METHODS = [
  { value: "ONLINE", label: "Online (NATPAY)" },
  { value: "DLTC", label: "Driving License Testing Centre" },
  { value: "DRIVING_SCHOOL", label: "Driving School" },
  { value: "HOME_AFFAIRS", label: "Home Affairs Office" },
  { value: "BANK", label: "Participating Bank" },
];

export function PersonalLicenseForm({
  onSubmit,
  initialData,
  mode = "create",
  existingImages = [],
  entryId,
  onImageUpload,
  onImageDelete,
  onImageReupload,
  onImageLock,
}: PersonalLicenseFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptImage, setReceiptImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState<{
    originalSize: number;
    compressedSize: number;
  } | null>(null);
  const [selectedDaysOfWeek, setSelectedDaysOfWeek] = useState<string[]>([]);
  const [selectedDaysOfMonth, setSelectedDaysOfMonth] = useState<number[]>([]);
  const [showCropModal, setShowCropModal] = useState(false);
  const [originalImageFile, setOriginalImageFile] = useState<File | null>(null);
  const [dateInput, setDateInput] = useState("")
  const [issueDateInput, setIssueDateInput] = useState("")
  const [expiryDateInput, setExpiryDateInput] = useState("")

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PersonalLicenseInput>({
    resolver: zodResolver(personalLicenseSchema),
    defaultValues: initialData || {
      date: new Date(),
      licenseType: "DRIVERS_LICENSE",
      renewalMethod: "DLTC",
      licenseCode: "",
    },
  });

  const watchDate = watch("date");
  const watchIssueDate = watch("issueDate");
  const watchExpiryDate = watch("expiryDate");
  const watchLicenseType = watch("licenseType");
  const watchLicenseCode = watch("licenseCode");
  const watchRenewalMethod = watch("renewalMethod");

  // Initialize date inputs from watched values when in edit mode
  useEffect(() => {
    if (mode === 'edit') {
      if (watchDate) setDateInput(format(watchDate, 'yyyy-MM-dd'))
      if (watchIssueDate) setIssueDateInput(format(watchIssueDate, 'yyyy-MM-dd'))
      if (watchExpiryDate) setExpiryDateInput(format(watchExpiryDate, 'yyyy-MM-dd'))
    }
  }, [mode, watchDate, watchIssueDate, watchExpiryDate]);

  // Set preview from existing images when in edit mode
  useEffect(() => {
    if (mode === "edit" && existingImages.length > 0 && !previewUrl) {
      const firstImage = existingImages[0];
      setPreviewUrl(firstImage.imageUrl);
    }
  }, [mode, existingImages, previewUrl]);

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

  const handleFormSubmit = async (data: PersonalLicenseInput) => {
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

  const getLicenseTypeLabel = () => {
    switch (watchLicenseType) {
      case "DRIVERS_LICENSE":
        return "Driver's License";
      case "PERSONAL_ID_CARD":
        return "ID Card";
      case "PDP":
        return "PDP (Professional Driving Permit)";
      default:
        return "License";
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IdCard className="h-5 w-5 text-rose-500" />
            Personal License Renewal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
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
                <SelectItem value="DRIVERS_LICENSE">
                  Driver&apos;s License
                </SelectItem>
                <SelectItem value="PERSONAL_ID_CARD">
                  ID Card (Smart ID)
                </SelectItem>
                <SelectItem value="PDP">
                  Professional Driving Permit (PDP)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* License Number */}
          <div className="space-y-2">
            <Label htmlFor="licenseNumber">
              {getLicenseTypeLabel()} Number
            </Label>
            <Input
              id="licenseNumber"
              placeholder={
                watchLicenseType === "PERSONAL_ID_CARD"
                  ? "13-digit ID number"
                  : "License number"
              }
              {...register("licenseNumber")}
              className={errors.licenseNumber ? "border-red-500" : ""}
            />
            {errors.licenseNumber && (
              <p className="text-sm text-red-500">
                {errors.licenseNumber.message}
              </p>
            )}
          </div>

          {/* License Code (only for driver's license) */}
          {watchLicenseType === "DRIVERS_LICENSE" && (
            <div className="space-y-2">
              <Label htmlFor="licenseCode">License Code</Label>
              <Select
                value={watchLicenseCode}
                onValueChange={(val) => setValue("licenseCode", val)}
                name="licenseCode"
              >
                <SelectTrigger id="licenseCode">
                  <SelectValue placeholder="Select license code" />
                </SelectTrigger>
                <SelectContent>
                  {LICENSE_CODES.map((code) => (
                    <SelectItem key={code.value} value={code.value}>
                      {code.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Issue & Expiry Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="issueDate">Issue Date *</Label>
              <Input
                id="issueDate"
                name="issueDate"
                type="text"
                inputMode="numeric"
                pattern="\d{4}-\d{2}-\d{2}"
                placeholder="YYYY-MM-DD"
                value={issueDateInput || (watchIssueDate ? format(watchIssueDate, "yyyy-MM-dd") : "")}
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
                  setIssueDateInput(value);
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
                    
                    setValue("issueDate", new Date(value));
                  }
                }}
                maxLength={10}
                className={errors.issueDate ? "border-red-500" : ""}
              />
              {errors.issueDate && (
                <p className="text-sm text-red-500">{errors.issueDate.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiryDate">Expiry Date *</Label>
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
                className={errors.expiryDate ? "border-red-500" : ""}
              />
              {errors.expiryDate && (
                <p className="text-sm text-red-500">{errors.expiryDate.message}</p>
              )}
            </div>
          </div>

          {/* Renewal Fee */}
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

          {/* Penalties */}
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
                {RENEWAL_METHODS.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Issuing Authority */}
          <div className="space-y-2">
            <Label htmlFor="issuingAuthority">
              Issuing Authority (Optional)
            </Label>
            <Input
              id="issuingAuthority"
              placeholder="e.g., Randburg DLTC, Home Affairs"
              {...register("issuingAuthority")}
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

          {/* Receipt Image */}
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
              {imageError && (
                <p className="text-sm text-red-500">{imageError}</p>
              )}
              {compressionInfo && (
                <p className="text-xs text-green-600">
                  Image compressed:{" "}
                  {formatFileSize(compressionInfo.originalSize)} →{" "}
                  {formatFileSize(compressionInfo.compressedSize)}
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
            {isSubmitting
              ? "Saving..."
              : `Save ${getLicenseTypeLabel()} Renewal`}
          </Button>

          {/* Receipt Images Manager for Edit Mode */}
          {mode === "edit" && entryId && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-chart-1" />
                <h3 className="text-base font-semibold">Receipt Images</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Attach or manage receipt images for this expense.
              </p>
              {onImageUpload &&
              onImageDelete &&
              onImageReupload &&
              onImageLock ? (
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
                <p className="text-sm text-muted-foreground">
                  Image management not available
                </p>
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
