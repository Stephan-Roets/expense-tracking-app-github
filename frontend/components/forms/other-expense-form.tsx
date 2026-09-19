"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Camera, CalendarIcon, MoreHorizontal } from "lucide-react";
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
import { RECURRENCE_FREQUENCY_LABELS } from "@/lib/types/database";
import {
  processReceiptImage,
  validateImageFile,
  formatFileSize,
} from "@/lib/utils/image-converter";
import { ReceiptSupportProps } from "./form-types";
import { EntryImageManager } from "@/components/entries/entry-image-manager";
import { API_URL } from "@/lib/api/client";
import { ImageCropModal } from "@/components/ui/image-crop-modal";
import RecurringExpensesList from "./recurring-expenses-list";
import { VehicleLogo } from "@/components/vehicles/vehicle-logo";
import { getExpenseCategoryLabels } from "@/lib/api/client";

const otherExpenseSchema = z.object({
  vehicleId: z.string().optional(),
  date: z.date({ required_error: "Select a date" }),
  expenseDescription: z.string().min(1, "Enter expense description"),
  categoryLabel: z.string().optional(),
  providerName: z.string().optional(),
  referenceNumber: z.string().optional(),
  amountZar: z.coerce.number().positive("Enter amount"),
  isRecurring: z.boolean().default(false),
  recurrenceFrequency: z
    .enum(["WEEKLY", "MONTHLY", "QUARTERLY", "ANNUAL", "ONCE_OFF"])
    .optional(),
  recurrenceDaysOfWeek: z.array(z.string()).optional(),
  recurrenceDaysOfMonth: z.array(z.number()).optional(),
  periodStartDate: z.date().optional(),
  periodEndDate: z.date().optional(),
  notes: z.string().optional(),
});

type OtherExpenseInput = z.infer<typeof otherExpenseSchema>;

interface Vehicle {
  id: string;
  registrationNumber: string;
  make: string;
  model: string;
}

interface OtherExpenseFormProps extends ReceiptSupportProps {
  vehicles: Vehicle[];
  onSubmit: (
    data: OtherExpenseInput,
    receiptImage: File | null,
  ) => Promise<void>;
  initialData?: Partial<OtherExpenseInput>;
}

export function OtherExpenseForm({
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
}: OtherExpenseFormProps) {
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
  const [periodStartInput, setPeriodStartInput] = useState("");
  const [periodEndInput, setPeriodEndInput] = useState("");
  const [dateInput, setDateInput] = useState("");
  const [categoryLabels, setCategoryLabels] = useState<string[]>([]);
  const [isLoadingLabels, setIsLoadingLabels] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<OtherExpenseInput>({
    resolver: zodResolver(otherExpenseSchema),
    defaultValues: {
      vehicleId: initialData?.vehicleId || "",
      date: initialData?.date || new Date(),
      isRecurring: initialData?.isRecurring ?? false,
      recurrenceFrequency: initialData?.recurrenceFrequency || "ONCE_OFF",
      ...initialData,
    },
  });

  const watchDate = watch('date');
  const watchPeriodStart = watch('periodStartDate');
  const watchPeriodEnd = watch('periodEndDate');
  const watchCategoryLabel = watch('categoryLabel');

  // Initialize date inputs from watched values when in edit mode
  useEffect(() => {
    if (mode === "edit") {
      if (watchDate) setDateInput(format(watchDate, "yyyy-MM-dd"));
      if (watchPeriodStart) setPeriodStartInput(format(watchPeriodStart, "yyyy-MM-dd"));
      if (watchPeriodEnd) setPeriodEndInput(format(watchPeriodEnd, "yyyy-MM-dd"));
    }
  }, [mode, watchDate, watchPeriodStart, watchPeriodEnd]);

  // Fetch previously used category labels for dropdown
  useEffect(() => {
    const fetchCategoryLabels = async () => {
      setIsLoadingLabels(true);
      try {
        const response = await getExpenseCategoryLabels();
        const labels = (response as any).data || response;
        if (Array.isArray(labels)) {
          setCategoryLabels(labels);
        }
      } catch (error) {
        console.error('Failed to fetch category labels:', error);
      } finally {
        setIsLoadingLabels(false);
      }
    };

    fetchCategoryLabels();
  }, []);

  // Set preview from existing images when in edit mode
  useEffect(() => {
    console.log("OtherExpenseForm - useEffect triggered:", {
      mode,
      existingImagesLength: existingImages.length,
      previewUrl,
    });
    if (mode === "edit" && existingImages.length > 0 && !previewUrl) {
      const firstImage = existingImages[0];
      console.log("OtherExpenseForm - Setting previewUrl from:", firstImage);
      const BACKEND_BASE_URL = API_URL.replace(/\/api\/v1$/, "");
      const imageUrl = firstImage.imageUrl?.startsWith("http")
        ? firstImage.imageUrl
        : `${BACKEND_BASE_URL}${firstImage.imageUrl?.startsWith("/") ? firstImage.imageUrl : `/${firstImage.imageUrl}`}`;
      setPreviewUrl(imageUrl);
    }
  }, [mode, existingImages, previewUrl]);

  const watchVehicleId = watch("vehicleId");
  const watchIsRecurring = watch("isRecurring");
  const watchRecurrenceFrequency = watch("recurrenceFrequency");

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

  const handleFormSubmit = async (data: OtherExpenseInput) => {
    setIsSubmitting(true);
    try {
      // Include selected days in the submission data
      const dataWithDays = {
        ...data,
        recurrenceDaysOfWeek: selectedDaysOfWeek,
        recurrenceDaysOfMonth: selectedDaysOfMonth,
      };
      await onSubmit(dataWithDays, mode === "create" ? receiptImage : null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MoreHorizontal className="h-5 w-5 text-chart-4" />
            Other Expense
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
                      <div className="flex items-center gap-2">
                        <VehicleLogo make={v.make} size="sm"  />
                        <span>{v.registrationNumber} - {v.make} {v.model}</span>
                      </div>
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
              <p className="text-sm font-medium">Vehicle</p>
              <div className="h-12 px-3 flex items-center rounded-md border border-input bg-muted text-sm">
                {(() => {
                  const vehicle = initialData?.vehicleId
                    ? vehicles.find((v) => v.id === initialData.vehicleId)
                    : null;
                  return vehicle
                    ? `${vehicle.registrationNumber} - ${vehicle.make} ${vehicle.model}`
                    : initialData?.vehicleId === undefined
                    ? "No vehicle assigned"
                    : "Unknown";
                })()}
              </div>
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

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="expenseDescription">Expense Description *</Label>
            <Input
              id="expenseDescription"
              placeholder="What is this expense for?"
              {...register("expenseDescription")}
              className={errors.expenseDescription ? "border-red-500" : ""}
            />
            {errors.expenseDescription && (
              <p className="text-sm text-red-500">
                {errors.expenseDescription.message}
              </p>
            )}
          </div>

          {/* Category Label */}
          {/* IMPORTANT: categoryLabel is used by the recurring expense system to identify expense types (e.g., "Parking", "Tolls", "Fines").
              When creating recurring expenses, the system uses this field to generate recurring instances. */}
          <div className="space-y-2">
            <Label htmlFor="categoryLabel">Category Label (Optional - Used for Recurring Expenses)</Label>
            <Input
              id="categoryLabel"
              placeholder="Type custom value or select from suggestions..."
              list="categoryLabelSuggestions"
              {...register("categoryLabel")}
            />
            {categoryLabels.length > 0 && (
              <datalist id="categoryLabelSuggestions">
                {categoryLabels.map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </datalist>
            )}
          </div>

          {/* Provider */}
          <div className="space-y-2">
            <Label htmlFor="providerName">Provider/Supplier (Optional)</Label>
            <Input
              id="providerName"
              placeholder="Who provided this service?"
              {...register("providerName")}
            />
          </div>

          {/* Reference Number */}
          <div className="space-y-2">
            <Label htmlFor="referenceNumber">Reference Number (Optional)</Label>
            <Input
              id="referenceNumber"
              placeholder="Invoice/ref number"
              {...register("referenceNumber")}
            />
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amountZar">Amount (ZAR)</Label>
            <Input
              id="amountZar"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register("amountZar")}
              className={errors.amountZar ? "border-red-500" : ""}
            />
            {errors.amountZar && (
              <p className="text-sm text-red-500">{errors.amountZar.message}</p>
            )}
          </div>

          {/* Recurring */}
          <div className="flex items-center space-x-2">
            <Switch
              id="isRecurring"
              checked={watchIsRecurring}
              onCheckedChange={(checked) => setValue("isRecurring", checked)}
            />
            <Label htmlFor="isRecurring">This is a recurring expense</Label>
          </div>

          {/* Recurrence Frequency (if recurring) */}
          {watchIsRecurring && (
            <div className="space-y-2">
              <Label htmlFor="recurrenceFrequency">Frequency</Label>
              <Select
                value={watchRecurrenceFrequency}
                onValueChange={(val) =>
                  setValue("recurrenceFrequency", val as any)
                }
                name="recurrenceFrequency"
              >
                <SelectTrigger id="recurrenceFrequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RECURRENCE_FREQUENCY_LABELS).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Days of Week (if recurring) */}
          {watchIsRecurring && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Repeat on Days of Week</p>
              <div className="flex flex-wrap gap-2">
                {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(day => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => {
                      const newDays = selectedDaysOfWeek.includes(day)
                        ? selectedDaysOfWeek.filter(d => d !== day)
                        : [...selectedDaysOfWeek, day];
                      setSelectedDaysOfWeek(newDays);
                    }}
                    className={`px-3 py-1.5 rounded text-sm transition-colors ${
                      selectedDaysOfWeek.includes(day)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Select days of the week for recurring expense (optional)
              </p>
            </div>
          )}

          {/* Days of Month (if recurring) */}
          {watchIsRecurring && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Repeat on Days of Month</p>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => {
                      const newDays = selectedDaysOfMonth.includes(day)
                        ? selectedDaysOfMonth.filter(d => d !== day)
                        : [...selectedDaysOfMonth, day];
                      setSelectedDaysOfMonth(newDays);
                    }}
                    className={`w-8 h-8 rounded text-sm transition-colors ${
                      selectedDaysOfMonth.includes(day)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Select specific days of the month for recurring expense (optional)
              </p>
            </div>
          )}

          {/* Period Dates (if recurring) */}
          {watchIsRecurring && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="periodStartDate">Period Start</Label>
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
                <Label htmlFor="periodEndDate">Period End</Label>
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
          )}

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
              <Label htmlFor="receipt-image">Receipt Image (Optional)</Label>

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

          {/* Receipt Images Manager for Edit Mode */}
          {mode === "edit" && entryId && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-chart-4" />
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

          {/* Submit */}
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Save Other Expense"}
          </Button>
        </form>

        {/* Existing Recurring Expenses List */}
        {mode === "create" && watchVehicleId && (
          <RecurringExpensesList vehicleId={watchVehicleId} />
        )}
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
