"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, apiPostMultipart, API_URL } from "@/lib/api/client";
import { FuelLogForm } from "@/components/forms/fuel-log-form";
import { MechanicServiceForm } from "@/components/forms/mechanic-service-form";
import { MaintenanceTopupForm } from "@/components/forms/maintenance-topup-form";
import { TyrePurchaseForm } from "@/components/forms/tyre-purchase-form";
import { CarWashForm } from "@/components/forms/car-wash-form";
import { InsuranceForm } from "@/components/forms/insurance-form";
import { TrackingForm } from "@/components/forms/tracking-form";
import { ETollForm } from "@/components/forms/etoll-form";
import { LicenseRenewalForm } from "@/components/forms/license-renewal-form";
import { RoadworthyForm } from "@/components/forms/roadworthy-form";
import { PersonalLicenseForm } from "@/components/forms/personal-license-form-simple";
import { OtherExpenseForm } from "@/components/forms/other-expense-form";
import { EntryImageManager } from "@/components/entries/entry-image-manager";
import { ExpenseCategory, Vehicle } from "@/lib/types/database";
import type { EntryImage } from "@/lib/types/database";
import { processExpenseImage } from "@/lib/utils/image-converter";

const BACKEND_BASE_URL = API_URL.replace(/\/api\/v1$/, "");

function normalizeEntryImageUrl(imageUrl?: string | null) {
  if (!imageUrl) return "";
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }
  return `${BACKEND_BASE_URL}${imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`}`;
}

export default function EditExpensePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [expense, setExpense] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [initialData, setInitialData] = useState<any>(null);
  const [receiptImages, setReceiptImages] = useState<EntryImage[]>([]);
  const [id, setId] = useState<string | null>(null);

  const refreshReceiptImages = useCallback(async () => {
    if (!id) return;
    try {
      const { data: images } = await api.get(
        `/entry-images/entry/EXPENSE/${id}`,
      );
      setReceiptImages(
        ((images as EntryImage[]) || []).map((image) => ({
          ...image,
          imageUrl: normalizeEntryImageUrl(image.imageUrl),
        })),
      );
    } catch (err) {
      console.error("Failed to fetch receipt images:", err);
      setReceiptImages([]);
    }
  }, [id]);

  const handleReceiptUpload = async (file: File, description?: string) => {
    if (!id) {
      throw new Error("Expense ID is required to upload receipt images");
    }

    // Compress image before upload
    let compressedFile = file;
    try {
      const conversionResult = await processExpenseImage(file);
      compressedFile = new File([conversionResult.blob], file.name, {
        type: conversionResult.format,
      });
      console.log(`Image compressed: ${(file.size / 1024).toFixed(1)} KB → ${(conversionResult.convertedSize / 1024).toFixed(1)} KB (${conversionResult.compressionRatio.toFixed(1)}x)`);
    } catch (error) {
      console.warn("Image compression failed, using original:", error);
      compressedFile = file;
    }

    const formData = new FormData();
    formData.append("entryType", "EXPENSE");
    formData.append("entryId", id);
    formData.append("file", compressedFile);
    if (description) {
      formData.append("description", description);
    }

    const response = await apiPostMultipart("/entry-images", formData, "POST");
    if (!response.ok) {
      throw new Error("Failed to upload receipt image");
    }
    await refreshReceiptImages();
  };

  const handleReceiptDelete = async (imageId: string) => {
    if (!id) return;
    await api.delete(`/entry-images/${imageId}`);
    await refreshReceiptImages();
  };

  const handleReceiptReupload = async (imageId: string, file: File) => {
    if (!id) return;
    const existing = receiptImages.find((img) => img.id === imageId);
    const description = existing?.description;

    // Compress image before reupload
    let compressedFile = file;
    try {
      const conversionResult = await processExpenseImage(file);
      compressedFile = new File([conversionResult.blob], file.name, {
        type: conversionResult.format,
      });
      console.log(`Image compressed for reupload: ${(file.size / 1024).toFixed(1)} KB → ${(conversionResult.convertedSize / 1024).toFixed(1)} KB (${conversionResult.compressionRatio.toFixed(1)}x)`);
    } catch (error) {
      console.warn("Image compression failed for reupload, using original:", error);
      compressedFile = file;
    }

    await api.delete(`/entry-images/${imageId}`);
    await handleReceiptUpload(compressedFile, description);
    await refreshReceiptImages();
  };

  const handleReceiptLock = async (imageId: string, reason?: string) => {
    if (!id) return;
    const query = reason ? `?reason=${encodeURIComponent(reason)}` : "?reason=";
    await api.post(`/entry-images/${imageId}/lock${query}`, {});
    await refreshReceiptImages();
  };

  React.useEffect(() => {
    params
      .then((p) => setId(p.id))
      .catch((err) => {
        console.error("Failed to get params:", err);
      });
  }, [params]);

  // Fetch vehicles for dropdown
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const response = await api.get("/vehicles");
        setVehicles(response.data || []);
      } catch (err) {
        console.error("Failed to fetch vehicles:", err);
      }
    };
    fetchVehicles();
  }, []);

  useEffect(() => {
    if (!id) return;

    const fetchExpense = async () => {
      try {
        const { data } = await api.get(`/expenses/${id}`);

        if (!data) {
          console.error("No expense data received");
          router.push("/dashboard/expenses");
          return;
        }

        setExpense(data);

        console.log("Expense data received:", data);
        console.log("Vehicle from expense:", data.vehicle);
        console.log("vehicleId field:", data.vehicleId);
        console.log("vehicleName field:", data.vehicleName);

        await refreshReceiptImages();

        // Prepare initial data based on expense category
        const baseData = {
          vehicleId: data.vehicleId || data.vehicle?.id || "",
          vehicleName:
            data.vehicleName || data.vehicle?.registrationNumber || "",
          vehicle: data.vehicle, // Pass the full vehicle object for display if available
          date: data.expenseDate ? new Date(data.expenseDate) : new Date(),
        };

        console.log("Base data prepared:", baseData);

        switch (data.category) {
          case ExpenseCategory.FUEL_LOG:
            setInitialData({
              ...baseData,
              vehicleId: data.vehicle?.id || "",
              date: data.expenseDate ? new Date(data.expenseDate) : new Date(),
              fuelType: data.fuelLog?.fuelType || "",
              liters: data.fuelLog?.liters || 0,
              pricePerLiter: data.fuelLog?.pricePerLiter || 0,
              odometerReading: data.odometerReading || 0,
              fullTank:
                data.fuelLog?.fullTank !== undefined
                  ? data.fuelLog.fullTank
                  : true,
              stationName: data.fuelLog?.stationName || data.supplierName || "",
              stationLocation: data.fuelLog?.stationLocation || "",
              latitude: data.fuelLog?.gpsLatitude || null,
              longitude: data.fuelLog?.gpsLongitude || null,
              accuracy: data.fuelLog?.gpsAccuracyMeters || null,
              fuelLog: data.fuelLog, // Pass the full fuelLog object for GPS data access
            });
            break;

          case ExpenseCategory.CAR_WASH:
            setInitialData({
              ...baseData,
              vehicleId: data.vehicle?.id || "",
              date: data.expenseDate ? new Date(data.expenseDate) : new Date(),
              washType: data.carWash?.washType || "WASH_AND_GO",
              costZar: data.amountZar ?? data.carWash?.costZar ?? 0,
              washName: data.carWash?.washName || data.supplierName || "",
              location:
                data.carWash?.washLocation || data.carWash?.location || "",
            });
            break;

          case ExpenseCategory.MECHANIC_SERVICE:
            setInitialData({
              ...baseData,
              vehicleId: data.vehicle?.id || "",
              date: data.expenseDate ? new Date(data.expenseDate) : new Date(),
              serviceType: data.mechanicService?.serviceType || "MINOR_SERVICE",
              workshopName:
                data.mechanicService?.workshopName || data.supplierName || "",
              workDescription:
                data.mechanicService?.workDescription || data.description || "",
              totalCostZar:
                data.amountZar ?? data.mechanicService?.totalCostZar ?? 0,
              odometerReading: data.odometerReading ?? 0,
              laborCostZar: data.mechanicService?.laborCostZar,
              partsCostZar: data.mechanicService?.partsCostZar,
              invoiceNumber:
                data.mechanicService?.invoiceNumber || data.invoiceNumber || "",
              glassProvider: data.mechanicService?.glassProvider || "",
              excessAmountZar: data.mechanicService?.excessAmountZar,
            });
            break;

          case ExpenseCategory.MAINTENANCE_TOPUP:
            setInitialData({
              ...baseData,
              vehicleId: data.vehicle?.id || "",
              date: data.expenseDate ? new Date(data.expenseDate) : new Date(),
              itemType: data.maintenanceTopup?.itemType || "ENGINE_OIL",
              shopName:
                data.maintenanceTopup?.shopName || data.supplierName || "",
              priceZar: data.amountZar ?? data.maintenanceTopup?.priceZar ?? 0,
              itemBrand:
                data.maintenanceTopup?.itemBrand ||
                data.maintenanceTopup?.brand ||
                "",
              itemQuantity: data.maintenanceTopup?.itemQuantity ?? 1,
              odometerReading: data.odometerReading ?? 0,
              notes: data.maintenanceTopup?.notes,
            });
            break;

          case ExpenseCategory.TIRES:
            setInitialData({
              ...baseData,
              vehicleId: data.vehicle?.id || "",
              date: data.expenseDate ? new Date(data.expenseDate) : new Date(),
              brand: data.tyrePurchase?.brand || "",
              model: data.tyrePurchase?.model || "",
              size: data.tyrePurchase?.size || "",
              quantity: data.tyrePurchase?.quantity ?? 0,
              priceZar: data.amountZar ?? 0,
              supplier: data.tyrePurchase?.supplier || data.supplierName || "",
              odometerReading:
                data.tyrePurchase?.purchaseOdometer ??
                data.odometerReading ??
                0,
              warrantyKm: data.tyrePurchase?.warrantyKm,
              notes: data.tyrePurchase?.notes,
              enableRotationTracking:
                data.tyrePurchase?.enableRotationTracking || false,
              drivetrainType: data.tyrePurchase?.drivetrainType || "",
            });
            break;

          case ExpenseCategory.INSURANCE_PREMIUM:
            setInitialData({
              ...baseData,
              vehicleId: data.vehicle?.id || "",
              date: data.expenseDate ? new Date(data.expenseDate) : new Date(),
              insurerName: data.insurancePremium?.insurerName || "",
              policyNumber: data.insurancePremium?.policyNumber || "",
              policyType: data.insurancePremium?.policyType || "COMPREHENSIVE",
              coverageStartDate: data.insurancePremium?.coverageStartDate
                ? new Date(data.insurancePremium.coverageStartDate)
                : new Date(),
              coverageEndDate: data.insurancePremium?.coverageEndDate
                ? new Date(data.insurancePremium.coverageEndDate)
                : new Date(),
              monthlyPremiumZar:
                data.insurancePremium?.monthlyPremiumZar ??
                data.insurancePremium?.premiumAmountZar ??
                data.amountZar ??
                0,
              excessAmountZar: data.insurancePremium?.excessAmountZar,
              odometerReading: data.insurancePremium?.odometerReading ?? data.odometerReading ?? 0,
              odometerReadingDate: data.insurancePremium?.odometerReadingDate
                ? new Date(data.insurancePremium.odometerReadingDate)
                : new Date(),
              brokerName: data.insurancePremium?.brokerName,
              brokerPhone: data.insurancePremium?.brokerPhone,
              claimPhoneNumber: data.insurancePremium?.claimPhoneNumber,
              coverDetails: data.insurancePremium?.coverDetails,
            });
            break;

          case ExpenseCategory.VEHICLE_TRACKING:
            setInitialData({
              ...baseData,
              vehicleId: data.vehicle?.id || "",
              date: data.expenseDate ? new Date(data.expenseDate) : new Date(),
              providerName: data.vehicleTracking?.providerName || "",
              subscriptionType:
                data.vehicleTracking?.subscriptionType || "MONTHLY",
              monthlyFeeZar: data.vehicleTracking?.monthlyFeeZar || 0,
              subscriptionStartDate: data.vehicleTracking?.subscriptionStartDate
                ? new Date(data.vehicleTracking.subscriptionStartDate)
                : new Date(),
              subscriptionEndDate: data.vehicleTracking?.subscriptionEndDate
                ? new Date(data.vehicleTracking.subscriptionEndDate)
                : undefined,
              deviceSerialNumber: data.vehicleTracking?.deviceSerialNumber,
              deviceType: data.vehicleTracking?.deviceType,
              installationDate: data.vehicleTracking?.installationDate
                ? new Date(data.vehicleTracking.installationDate)
                : undefined,
              installationFeeZar: data.vehicleTracking?.installationFeeZar,
              contractDurationMonths:
                data.vehicleTracking?.contractDurationMonths,
              recoveryIncluded: data.vehicleTracking?.recoveryIncluded || false,
              odometerReading: data.vehicleTracking?.odometerReading ?? data.odometerReading ?? 0,
              odometerReadingDate: data.vehicleTracking?.odometerReadingDate
                ? new Date(data.vehicleTracking.odometerReadingDate)
                : new Date(),
              appLoginEmail: data.vehicleTracking?.appLoginEmail,
              supportPhone: data.vehicleTracking?.supportPhone,
              features: data.vehicleTracking?.features,
              notes: data.vehicleTracking?.notes,
            });
            break;

          case ExpenseCategory.ETOLL_SANRAL:
            setInitialData({
              ...baseData,
              vehicleId: data.vehicle?.id || "",
              date: data.expenseDate ? new Date(data.expenseDate) : new Date(),
              accountNumber: data.etollPayment?.accountNumber,
              tagSerialNumber: data.etollPayment?.tagSerialNumber,
              vehicleRegistration: data.etollPayment?.vehicleRegistration || "",
              paymentMethod: data.etollPayment?.paymentMethod || "ETAG",
              tollRoutes: data.etollPayment?.tollRoutes,
              periodStartDate: data.etollPayment?.periodStartDate
                ? new Date(data.etollPayment.periodStartDate)
                : undefined,
              periodEndDate: data.etollPayment?.periodEndDate
                ? new Date(data.etollPayment.periodEndDate)
                : undefined,
              totalGantries: data.etollPayment?.totalGantries,
              totalAmountZar: data.etollPayment?.totalAmountZar || 0,
              vatAmountZar: data.etollPayment?.vatAmountZar,
              referenceNumber: data.etollPayment?.referenceNumber,
              notes: data.etollPayment?.notes,
            });
            break;

          case ExpenseCategory.LICENSE_RENEWAL:
            setInitialData({
              ...baseData,
              vehicleId: data.vehicle?.id || "",
              date: data.licenseRenewal?.renewalDate
                ? new Date(data.licenseRenewal.renewalDate)
                : data.expenseDate
                  ? new Date(data.expenseDate)
                  : new Date(),
              licenseType:
                data.licenseRenewal?.licenseType || "VEHICLE_LICENSE",
              licenseNumber: data.licenseRenewal?.licenseNumber,
              registrationAuthority:
                data.licenseRenewal?.registrationAuthority ||
                data.licenseRenewal?.issuingAuthority,
              previousExpiryDate: data.licenseRenewal?.previousExpiryDate
                ? new Date(data.licenseRenewal.previousExpiryDate)
                : undefined,
              newExpiryDate: data.licenseRenewal?.newExpiryDate
                ? new Date(data.licenseRenewal.newExpiryDate)
                : data.licenseRenewal?.expiryDate
                  ? new Date(data.licenseRenewal.expiryDate)
                  : new Date(),
              renewalFeeZar: data.licenseRenewal?.renewalFeeZar || 0,
              penaltiesZar: data.licenseRenewal?.penaltiesZar,
              arrearsZar: data.licenseRenewal?.arrearsZar,
              transactionNumber: data.licenseRenewal?.transactionNumber,
              renewalMethod:
                data.licenseRenewal?.renewalMethod || "LICENSING_DEPT",
              odometerReading: data.licenseRenewal?.odometerReading ?? data.odometerReading ?? 0,
              processingDays: data.licenseRenewal?.processingDays,
              notes: data.licenseRenewal?.notes,
            });
            break;

          case ExpenseCategory.ROADWORTHY:
            setInitialData({
              ...baseData,
              vehicleId: data.vehicle?.id || "",
              date: data.expenseDate ? new Date(data.expenseDate) : new Date(),
              testingStationName:
                data.roadworthyCertificate?.testingStationName || "",
              testingStationAddress:
                data.roadworthyCertificate?.testingStationAddress,
              testingStationPhone:
                data.roadworthyCertificate?.testingStationPhone,
              testDate: data.roadworthyCertificate?.testDate
                ? new Date(data.roadworthyCertificate.testDate)
                : new Date(),
              certificateNumber: data.roadworthyCertificate?.certificateNumber,
              expiryDate: data.roadworthyCertificate?.expiryDate
                ? new Date(data.roadworthyCertificate.expiryDate)
                : data.roadworthyCertificate?.certificateExpiryDate
                  ? new Date(data.roadworthyCertificate.certificateExpiryDate)
                  : undefined,
              testResult: data.roadworthyCertificate?.testResult || "PASS",
              testFeeZar: data.roadworthyCertificate?.testFeeZar ?? 0,
              retestFeeZar: data.roadworthyCertificate?.retestFeeZar,
              inspectorName: data.roadworthyCertificate?.inspectorName,
              vehicleOdometer:
                data.roadworthyCertificate?.vehicleOdometer ??
                data.odometerReading ??
                data.vehicle?.currentOdometer,
              failureReasons: data.roadworthyCertificate?.failureReasons,
              conditionsApplied: data.roadworthyCertificate?.conditionsApplied,
              notes: data.roadworthyCertificate?.notes,
            });
            break;

          case ExpenseCategory.PERSONAL_LICENSE:
            setInitialData({
              date: data.expenseDate ? new Date(data.expenseDate) : new Date(),
              licenseType: data.personalLicense?.licenseType || "",
              licenseNumber: data.personalLicense?.licenseNumber,
              licenseCode: data.personalLicense?.licenseCode,
              issueDate: data.personalLicense?.issueDate
                ? new Date(data.personalLicense.issueDate)
                : new Date(),
              expiryDate: data.personalLicense?.expiryDate
                ? new Date(data.personalLicense.expiryDate)
                : new Date(),
              renewalFeeZar: data.personalLicense?.renewalFeeZar || 0,
              penaltiesZar: data.personalLicense?.penaltiesZar,
              renewalMethod: data.personalLicense?.renewalMethod,
              issuingAuthority: data.personalLicense?.issuingAuthority,
              notes: data.personalLicense?.notes,
            });
            break;

          case ExpenseCategory.OTHER_FIXED:
            setInitialData({
              ...baseData,
              vehicleId: data.vehicle?.id || undefined,
              date: data.expenseDate ? new Date(data.expenseDate) : new Date(),
              expenseDescription:
                data.otherFixedExpense?.expenseDescription ||
                data.description ||
                "",
              categoryLabel: data.otherFixedExpense?.categoryLabel || undefined,
              providerName: data.otherFixedExpense?.providerName || data.supplierName,
              referenceNumber: data.otherFixedExpense?.referenceNumber,
              amountZar: data.amountZar || 0,
              isRecurring: data.otherFixedExpense?.isRecurring || false,
              recurrenceFrequency: data.otherFixedExpense?.recurrenceFrequency,
              periodStartDate: data.otherFixedExpense?.periodStartDate
                ? new Date(data.otherFixedExpense.periodStartDate)
                : undefined,
              periodEndDate: data.otherFixedExpense?.periodEndDate
                ? new Date(data.otherFixedExpense.periodEndDate)
                : undefined,
              notes: data.otherFixedExpense?.notes,
            });
            break;

          default:
            setInitialData(null);
        }
      } catch (error) {
        console.error("Error fetching expense:", error);
        router.push("/dashboard/expenses");
      } finally {
        setLoading(false);
      }
    };

    fetchExpense();
  }, [id, router, refreshReceiptImages]);

  const renderForm = () => {
    if (!expense || !initialData) return null;

    switch (expense.category) {
      case ExpenseCategory.FUEL_LOG:
        return (
          <FuelLogForm
            key={`fuel-log-edit-${id}`}
            vehicles={vehicles}
            initialData={initialData}
            mode="edit"
            existingImages={receiptImages}
            entryId={id || undefined}
            onImageUpload={handleReceiptUpload}
            onImageDelete={handleReceiptDelete}
            onImageReupload={handleReceiptReupload}
            onImageLock={handleReceiptLock}
            onSubmit={async (data, receiptImage, gpsPosition) => {
              const expenseData = data as Record<string, unknown>;
              const liters = Number(expenseData.liters) || 0;
              const pricePerLiter = Number(expenseData.pricePerLiter) || 0;
              const totalCost = liters * pricePerLiter;

              const vehicle = vehicles.find(
                (v) => v.id === expenseData.vehicleId,
              );
              const vehicleReg = vehicle?.registrationNumber || "Unknown";

              const dataToSend: Record<string, unknown> = {
                ...expenseData,
                date:
                  expenseData.date instanceof Date
                    ? expenseData.date.toISOString()
                    : new Date().toISOString(),
                totalCost,
                amount: totalCost,
                description: expenseData.stationName
                  ? `Fuel at ${expenseData.stationName}`
                  : "Fuel Purchase",
                vehicleReg,
                supplierName: expenseData.stationName as string | undefined,
                // Ensure fuelType is always included
                fuelType: expenseData.fuelType,
              };

              if (gpsPosition) {
                (dataToSend as any).gpsLatitude = (gpsPosition as any).latitude;
                (dataToSend as any).gpsLongitude = (
                  gpsPosition as any
                ).longitude;
                (dataToSend as any).gpsAccuracyMeters = (
                  gpsPosition as any
                ).accuracy;
              } else {
                // Explicitly clear GPS if position is null (user clicked Clear)
                (dataToSend as any).gpsLatitude = null;
                (dataToSend as any).gpsLongitude = null;
                (dataToSend as any).gpsAccuracyMeters = null;
              }

              const formData = new FormData();
              formData.append("data", JSON.stringify({ ...dataToSend, id }));
              if (receiptImage) formData.append("receipt", receiptImage);
              await apiPostMultipart(`/expenses/fuel/${id}`, formData, "PUT");
              router.push('/dashboard/expenses');
            }}
          />
        );

      case ExpenseCategory.CAR_WASH:
        return (
          <CarWashForm
            vehicles={vehicles}
            initialData={initialData}
            mode="edit"
            existingImages={receiptImages}
            entryId={id || undefined}
            onImageUpload={handleReceiptUpload}
            onImageDelete={handleReceiptDelete}
            onImageReupload={handleReceiptReupload}
            onImageLock={handleReceiptLock}
            onSubmit={async (data, receiptImage) => {
              const expenseData = data as Record<string, unknown>;
              const expenseDate =
                expenseData.date instanceof Date
                  ? expenseData.date.toISOString()
                  : new Date().toISOString();
              const vehicle = vehicles.find(
                (v) => v.id === expenseData.vehicleId,
              );
              const vehicleReg = vehicle?.registrationNumber || "Unknown";
              const dataToSend = {
                ...expenseData,
                date: expenseDate,
                amount: (expenseData.costZar as number) || 0,
                description: `Car Wash: ${(expenseData.washType as string) || "Standard"}`,
                vehicleReg,
                supplierName: expenseData.washName as string,
              };

              const formData = new FormData();
              formData.append("data", JSON.stringify({ ...dataToSend, id }));
              if (receiptImage) formData.append("receipt", receiptImage);
              await apiPostMultipart(
                `/expenses/carwash/${id}`,
                formData,
                "PUT",
              );
              router.push('/dashboard/expenses');
            }}
          />
        );

      case ExpenseCategory.MECHANIC_SERVICE:
        return (
          <MechanicServiceForm
            vehicles={vehicles}
            initialData={initialData}
            mode="edit"
            existingImages={receiptImages}
            entryId={id || undefined}
            onImageUpload={handleReceiptUpload}
            onImageDelete={handleReceiptDelete}
            onImageReupload={handleReceiptReupload}
            onImageLock={handleReceiptLock}
            onSubmit={async (data, invoiceImage) => {
              const expenseData = data as Record<string, unknown>;
              const expenseDate =
                expenseData.date instanceof Date
                  ? expenseData.date.toISOString()
                  : new Date().toISOString();
              const vehicle = vehicles.find(
                (v) => v.id === expenseData.vehicleId,
              );
              const vehicleReg = vehicle?.registrationNumber || "Unknown";
              const dataToSend = {
                ...expenseData,
                date: expenseDate,
                amount: (expenseData.totalCostZar as number) || 0,
                description:
                  (expenseData.workDescription as string) || "Mechanic Service",
                vehicleReg,
                supplierName: expenseData.workshopName as string,
              };
              const formData = new FormData();
              formData.append("data", JSON.stringify({ ...dataToSend, id }));
              if (invoiceImage) formData.append("receipt", invoiceImage);
              await apiPostMultipart(
                `/expenses/mechanic/${id}`,
                formData,
                "PUT",
              );
              router.push('/dashboard/expenses');
            }}
          />
        );

      case ExpenseCategory.MAINTENANCE_TOPUP:
        return (
          <MaintenanceTopupForm
            vehicles={vehicles}
            initialData={initialData}
            mode="edit"
            existingImages={receiptImages}
            entryId={id || undefined}
            onImageUpload={handleReceiptUpload}
            onImageDelete={handleReceiptDelete}
            onImageReupload={handleReceiptReupload}
            onImageLock={handleReceiptLock}
            onSubmit={async (data, receiptImage) => {
              const expenseData = data as Record<string, unknown>;
              const expenseDate =
                expenseData.date instanceof Date
                  ? expenseData.date.toISOString()
                  : new Date().toISOString();
              const vehicle = vehicles.find(
                (v) => v.id === expenseData.vehicleId,
              );
              const vehicleReg = vehicle?.registrationNumber || "Unknown";
              const dataToSend = {
                ...expenseData,
                date: expenseDate,
                amount:
                  (expenseData.priceZar as number) ||
                  (expenseData.totalCostZar as number) ||
                  (expenseData.costZar as number) ||
                  0,
                description: `Maintenance: ${(expenseData.itemType as string) || "Top-up"}`,
                vehicleReg,
                supplierName: expenseData.shopName as string,
              };
              const formData = new FormData();
              formData.append("data", JSON.stringify({ ...dataToSend, id }));
              if (receiptImage) formData.append("receipt", receiptImage);
              await apiPostMultipart(
                `/expenses/maintenance/${id}`,
                formData,
                "PUT",
              );
              router.push('/dashboard/expenses');
            }}
          />
        );

      case ExpenseCategory.TIRES:
        return (
          <TyrePurchaseForm
            vehicles={vehicles}
            initialData={initialData}
            mode="edit"
            existingImages={receiptImages}
            entryId={id || undefined}
            onImageUpload={handleReceiptUpload}
            onImageDelete={handleReceiptDelete}
            onImageReupload={handleReceiptReupload}
            onImageLock={handleReceiptLock}
            onSubmit={async (data, receiptImage) => {
              const expenseData = data as Record<string, unknown>;
              const expenseDate =
                expenseData.date instanceof Date
                  ? expenseData.date.toISOString()
                  : new Date().toISOString();
              const vehicle = vehicles.find(
                (v) => v.id === expenseData.vehicleId,
              );
              const vehicleReg = vehicle?.registrationNumber || "Unknown";
              const dataToSend = {
                ...expenseData,
                date: expenseDate,
                amount: (expenseData.priceZar as number) || 0,
                description: `${expenseData.quantity}x ${expenseData.brand} Tyres`,
                vehicleReg,
                odometerReading: expenseData.odometerReading as number,
                supplierName: expenseData.supplier as string,
                enableRotationTracking:
                  (expenseData.enableRotationTracking as boolean) || false,
                drivetrainType: expenseData.drivetrainType as string,
              };
              const formData = new FormData();
              formData.append("data", JSON.stringify({ ...dataToSend, id }));
              if (receiptImage) formData.append("receipt", receiptImage);
              await apiPostMultipart(`/expenses/tyres/${id}`, formData, "PUT");
              router.push('/dashboard/expenses');
            }}
          />
        );

      case ExpenseCategory.INSURANCE_PREMIUM:
        return (
          <InsuranceForm
            vehicles={vehicles}
            initialData={initialData}
            mode="edit"
            existingImages={receiptImages}
            entryId={id || undefined}
            onImageUpload={handleReceiptUpload}
            onImageDelete={handleReceiptDelete}
            onImageReupload={handleReceiptReupload}
            onImageLock={handleReceiptLock}
            onSubmit={async (data, receiptImage, odometerImage) => {
              const expenseData = data as Record<string, unknown>;
              const expenseDate =
                expenseData.date instanceof Date
                  ? expenseData.date.toISOString()
                  : new Date().toISOString();
              const coverageStart =
                expenseData.coverageStartDate instanceof Date
                  ? (expenseData.coverageStartDate as Date).toISOString()
                  : new Date().toISOString();
              const coverageEnd =
                expenseData.coverageEndDate instanceof Date
                  ? (expenseData.coverageEndDate as Date).toISOString()
                  : new Date().toISOString();
              const vehicle = vehicles.find(
                (v) => v.id === expenseData.vehicleId,
              );
              const vehicleReg = vehicle?.registrationNumber || "Unknown";
              const dataToSend: Record<string, unknown> = {
                vehicleId: expenseData.vehicleId,
                date: expenseDate,
                amount: (expenseData.monthlyPremiumZar as number) || 0,
                description: `Insurance: ${expenseData.insurerName} - ${expenseData.policyNumber}`,
                vehicleReg,
                supplierName: expenseData.insurerName as string,
                insurerName: expenseData.insurerName,
                policyNumber: expenseData.policyNumber,
                policyType: expenseData.policyType,
                coverageStartDate: coverageStart,
                coverageEndDate: coverageEnd,
                monthlyPremiumZar: expenseData.monthlyPremiumZar,
                excessAmountZar: expenseData.excessAmountZar,
                odometerReading: expenseData.odometerReading,
                odometerReadingDate: expenseData.odometerReadingDate,
                brokerName: expenseData.brokerName,
                brokerPhone: expenseData.brokerPhone,
                claimPhoneNumber: expenseData.claimPhoneNumber,
                coverDetails: expenseData.coverDetails,
              };
              const formData = new FormData();
              formData.append("data", JSON.stringify({ ...dataToSend, id }));
              if (receiptImage) formData.append("receipt", receiptImage);
              if (odometerImage) formData.append("odometerPhoto", odometerImage);
              await apiPostMultipart(
                `/expenses/insurance/${id}`,
                formData,
                "PUT",
              );
              router.push('/dashboard/expenses');
            }}
          />
        );

      case ExpenseCategory.VEHICLE_TRACKING:
        return (
          <TrackingForm
            vehicles={vehicles}
            initialData={initialData}
            mode="edit"
            existingImages={receiptImages}
            entryId={id || undefined}
            onImageUpload={handleReceiptUpload}
            onImageDelete={handleReceiptDelete}
            onImageReupload={handleReceiptReupload}
            onImageLock={handleReceiptLock}
            onSubmit={async (data, receiptImage, odometerImage) => {
              const expenseData = data as Record<string, unknown>;
              const expenseDate =
                expenseData.date instanceof Date
                  ? expenseData.date.toISOString()
                  : new Date().toISOString();
              const subscriptionStart =
                expenseData.subscriptionStartDate instanceof Date
                  ? (expenseData.subscriptionStartDate as Date).toISOString()
                  : new Date().toISOString();
              const subscriptionEnd =
                expenseData.subscriptionEndDate instanceof Date
                  ? (expenseData.subscriptionEndDate as Date).toISOString()
                  : undefined;
              const installDate =
                expenseData.installationDate instanceof Date
                  ? (expenseData.installationDate as Date).toISOString()
                  : undefined;
              const vehicle = vehicles.find(
                (v) => v.id === expenseData.vehicleId,
              );
              const vehicleReg = vehicle?.registrationNumber || "Unknown";
              const dataToSend: Record<string, unknown> = {
                vehicleId: expenseData.vehicleId,
                date: expenseDate,
                amount: (expenseData.monthlyFeeZar as number) || 0,
                description: `Tracking: ${expenseData.providerName} - ${expenseData.subscriptionType}`,
                vehicleReg,
                supplierName: expenseData.providerName as string,
                providerName: expenseData.providerName,
                subscriptionType: expenseData.subscriptionType,
                monthlyFeeZar: expenseData.monthlyFeeZar,
                subscriptionStartDate: subscriptionStart,
                subscriptionEndDate: subscriptionEnd,
                deviceSerialNumber: expenseData.deviceSerialNumber,
                deviceType: expenseData.deviceType,
                installationDate: installDate,
                installationFeeZar: expenseData.installationFeeZar,
                contractDurationMonths: expenseData.contractDurationMonths,
                recoveryIncluded: expenseData.recoveryIncluded,
                odometerReading: expenseData.odometerReading,
                odometerReadingDate: expenseData.odometerReadingDate,
                appLoginEmail: expenseData.appLoginEmail,
                supportPhone: expenseData.supportPhone,
                features: expenseData.features,
                notes: expenseData.notes,
              };
              const formData = new FormData();
              formData.append("data", JSON.stringify({ ...dataToSend, id }));
              if (receiptImage) formData.append("receipt", receiptImage);
              if (odometerImage) formData.append("odometerPhoto", odometerImage);
              await apiPostMultipart(
                `/expenses/tracking/${id}`,
                formData,
                "PUT",
              );
              router.push('/dashboard/expenses');
            }}
          />
        );

      case ExpenseCategory.ETOLL_SANRAL:
        return (
          <ETollForm
            vehicles={vehicles}
            initialData={initialData}
            mode="edit"
            existingImages={receiptImages}
            entryId={id || undefined}
            onImageUpload={handleReceiptUpload}
            onImageDelete={handleReceiptDelete}
            onImageReupload={handleReceiptReupload}
            onImageLock={handleReceiptLock}
            onSubmit={async (data, receiptImage) => {
              const expenseData = data as Record<string, unknown>;
              const expenseDate =
                expenseData.date instanceof Date
                  ? expenseData.date.toISOString()
                  : new Date().toISOString();
              const periodStart =
                expenseData.periodStartDate instanceof Date
                  ? (expenseData.periodStartDate as Date).toISOString()
                  : undefined;
              const periodEnd =
                expenseData.periodEndDate instanceof Date
                  ? (expenseData.periodEndDate as Date).toISOString()
                  : undefined;
              const vehicle = vehicles.find(
                (v) => v.id === expenseData.vehicleId,
              );
              const vehicleReg = vehicle?.registrationNumber || "Unknown";
              const dataToSend: Record<string, unknown> = {
                vehicleId: expenseData.vehicleId,
                date: expenseDate,
                amount: (expenseData.totalAmountZar as number) || 0,
                description: `E-Toll: ${expenseData.paymentMethod} - ${expenseData.vehicleRegistration}`,
                vehicleReg,
                supplierName: "SANRAL",
                accountNumber: expenseData.accountNumber,
                tagSerialNumber: expenseData.tagSerialNumber,
                vehicleRegistration: expenseData.vehicleRegistration,
                paymentMethod: expenseData.paymentMethod,
                tollRoutes: expenseData.tollRoutes,
                periodStartDate: periodStart,
                periodEndDate: periodEnd,
                totalGantries: expenseData.totalGantries,
                totalAmountZar: expenseData.totalAmountZar,
                vatAmountZar: expenseData.vatAmountZar,
                referenceNumber: expenseData.referenceNumber,
                notes: expenseData.notes,
              };
              const formData = new FormData();
              formData.append("data", JSON.stringify({ ...dataToSend, id }));
              if (receiptImage) formData.append("receipt", receiptImage);
              await apiPostMultipart(`/expenses/etoll/${id}`, formData, "PUT");
              router.push('/dashboard/expenses');
            }}
          />
        );

      case ExpenseCategory.LICENSE_RENEWAL:
        return (
          <LicenseRenewalForm
            vehicles={vehicles.map(v => ({ ...v, currentOdometer: v.currentOdometer }))}
            initialData={initialData}
            mode="edit"
            existingImages={receiptImages}
            entryId={id || undefined}
            onImageUpload={handleReceiptUpload}
            onImageDelete={handleReceiptDelete}
            onImageReupload={handleReceiptReupload}
            onImageLock={handleReceiptLock}
            onSubmit={async (data, receiptImage) => {
              const expenseData = data as Record<string, unknown>;
              const expenseDate =
                expenseData.date instanceof Date
                  ? expenseData.date.toISOString()
                  : new Date().toISOString();
              const prevExpiry =
                expenseData.previousExpiryDate instanceof Date
                  ? (expenseData.previousExpiryDate as Date).toISOString()
                  : undefined;
              const newExpiry =
                expenseData.newExpiryDate instanceof Date
                  ? (expenseData.newExpiryDate as Date).toISOString()
                  : new Date().toISOString();
              const vehicle = vehicles.find(
                (v) => v.id === expenseData.vehicleId,
              );
              const vehicleReg = vehicle?.registrationNumber || "Unknown";
              const dataToSend: Record<string, unknown> = {
                vehicleId: expenseData.vehicleId,
                date: expenseDate,
                amount: (expenseData.renewalFeeZar as number) || 0,
                description: `License: ${expenseData.licenseType} - ${vehicleReg}`,
                vehicleReg,
                licenseType: expenseData.licenseType,
                licenseNumber: expenseData.licenseNumber,
                registrationAuthority: expenseData.registrationAuthority,
                previousExpiryDate: prevExpiry,
                newExpiryDate: newExpiry,
                renewalFeeZar: expenseData.renewalFeeZar,
                penaltiesZar: expenseData.penaltiesZar,
                arrearsZar: expenseData.arrearsZar,
                transactionNumber: expenseData.transactionNumber,
                renewalMethod: expenseData.renewalMethod,
                processingDays: expenseData.processingDays,
                odometerReading: expenseData.odometerReading,
                notes: expenseData.notes,
              };
              const formData = new FormData();
              formData.append("data", JSON.stringify({ ...dataToSend, id }));
              if (receiptImage) formData.append("receipt", receiptImage);
              await apiPostMultipart(
                `/expenses/license/${id}`,
                formData,
                "PUT",
              );
              router.push('/dashboard/expenses');
            }}
          />
        );

      case ExpenseCategory.ROADWORTHY:
        return (
          <RoadworthyForm
            vehicles={vehicles}
            initialData={initialData}
            mode="edit"
            existingImages={receiptImages}
            entryId={id || undefined}
            onImageUpload={handleReceiptUpload}
            onImageDelete={handleReceiptDelete}
            onImageReupload={handleReceiptReupload}
            onImageLock={handleReceiptLock}
            onSubmit={async (data, receiptImage) => {
              const expenseData = data as Record<string, unknown>;
              const expenseDate =
                expenseData.date instanceof Date
                  ? expenseData.date.toISOString()
                  : new Date().toISOString();
              const testDate =
                expenseData.testDate instanceof Date
                  ? (expenseData.testDate as Date).toISOString()
                  : new Date().toISOString();
              const expiryDate =
                expenseData.expiryDate instanceof Date
                  ? (expenseData.expiryDate as Date).toISOString()
                  : undefined;
              const vehicle = vehicles.find(
                (v) => v.id === expenseData.vehicleId,
              );
              const vehicleReg = vehicle?.registrationNumber || "Unknown";
              const dataToSend: Record<string, unknown> = {
                vehicleId: expenseData.vehicleId,
                date: expenseDate,
                amount: (expenseData.testFeeZar as number) || 0,
                description: `Roadworthy: ${expenseData.testResult} - ${expenseData.testingStationName}`,
                vehicleReg,
                supplierName: expenseData.testingStationName as string,
                testingStationName: expenseData.testingStationName,
                testingStationAddress: expenseData.testingStationAddress,
                testingStationPhone: expenseData.testingStationPhone,
                testDate: testDate,
                certificateNumber: expenseData.certificateNumber,
                expiryDate: expiryDate,
                testResult: expenseData.testResult,
                testFeeZar: expenseData.testFeeZar,
                retestFeeZar: expenseData.retestFeeZar,
                inspectorName: expenseData.inspectorName,
                vehicleOdometer: expenseData.vehicleOdometer,
                failureReasons: expenseData.failureReasons,
                conditionsApplied: expenseData.conditionsApplied,
                notes: expenseData.notes,
              };
              const formData = new FormData();
              formData.append("data", JSON.stringify({ ...dataToSend, id }));
              if (receiptImage) formData.append("receipt", receiptImage);
              await apiPostMultipart(
                `/expenses/roadworthy/${id}`,
                formData,
                "PUT",
              );
              router.push('/dashboard/expenses');
            }}
          />
        );

      case ExpenseCategory.PERSONAL_LICENSE:
        return (
          <PersonalLicenseForm
            initialData={initialData}
            mode="edit"
            existingImages={receiptImages}
            entryId={id || undefined}
            onImageUpload={handleReceiptUpload}
            onImageDelete={handleReceiptDelete}
            onImageReupload={handleReceiptReupload}
            onImageLock={handleReceiptLock}
            onSubmit={async (data, receiptImage) => {
              const expenseData = data as Record<string, unknown>;
              const expenseDate =
                expenseData.date instanceof Date
                  ? expenseData.date.toISOString()
                  : new Date().toISOString();
              const issueDate =
                expenseData.issueDate instanceof Date
                  ? (expenseData.issueDate as Date).toISOString()
                  : new Date().toISOString();
              const expiryDate =
                expenseData.expiryDate instanceof Date
                  ? (expenseData.expiryDate as Date).toISOString()
                  : new Date().toISOString();
              const dataToSend: Record<string, unknown> = {
                date: expenseDate,
                amount: (expenseData.renewalFeeZar as number) || 0,
                description: `Personal License: ${expenseData.licenseType} - ${expenseData.licenseNumber}`,
                licenseType: expenseData.licenseType,
                licenseNumber: expenseData.licenseNumber,
                licenseCode: expenseData.licenseCode,
                issueDate: issueDate,
                expiryDate: expiryDate,
                renewalFeeZar: expenseData.renewalFeeZar,
                penaltiesZar: expenseData.penaltiesZar,
                renewalMethod: expenseData.renewalMethod,
                issuingAuthority: expenseData.issuingAuthority,
                notes: expenseData.notes,
              };
              const formData = new FormData();
              formData.append("data", JSON.stringify({ ...dataToSend, id }));
              if (receiptImage) formData.append("receipt", receiptImage);
              await apiPostMultipart(
                `/expenses/personal-license/${id}`,
                formData,
                "PUT",
              );
              router.push('/dashboard/expenses');
            }}
          />
        );

      case ExpenseCategory.OTHER_FIXED:
        return (
          <OtherExpenseForm
            vehicles={vehicles}
            initialData={initialData}
            mode="edit"
            existingImages={receiptImages}
            entryId={id || undefined}
            onImageUpload={handleReceiptUpload}
            onImageDelete={handleReceiptDelete}
            onImageReupload={handleReceiptReupload}
            onImageLock={handleReceiptLock}
            onSubmit={async (data, receiptImage) => {
              const expenseData = data as Record<string, unknown>;
              const expenseDate =
                expenseData.date instanceof Date
                  ? expenseData.date.toISOString()
                  : new Date().toISOString();
              const periodStart =
                expenseData.periodStartDate instanceof Date
                  ? (expenseData.periodStartDate as Date).toISOString()
                  : undefined;
              const periodEnd =
                expenseData.periodEndDate instanceof Date
                  ? (expenseData.periodEndDate as Date).toISOString()
                  : undefined;
              const vehicle = vehicles.find(
                (v) => v.id === expenseData.vehicleId,
              );
              const vehicleReg = vehicle?.registrationNumber || "Unknown";
              const dataToSend: Record<string, unknown> = {
                vehicleId: expenseData.vehicleId,
                date: expenseDate,
                amount: (expenseData.amountZar as number) || 0,
                description: expenseData.expenseDescription as string,
                vehicleReg,
                supplierName: expenseData.providerName,
                categoryLabel: expenseData.categoryLabel,
                providerName: expenseData.providerName,
                referenceNumber: expenseData.referenceNumber,
                amountZar: expenseData.amountZar,
                isRecurring: expenseData.isRecurring,
                recurrenceFrequency: expenseData.recurrenceFrequency,
                periodStartDate: periodStart,
                periodEndDate: periodEnd,
                notes: expenseData.notes,
              };
              const formData = new FormData();
              formData.append("data", JSON.stringify({ ...dataToSend, id }));
              if (receiptImage) formData.append("receipt", receiptImage);
              const endpoint = `/expenses/other-fixed/${id}`;
              await apiPostMultipart(
                endpoint,
                formData,
                "PUT",
              );
              router.push('/dashboard/expenses');
            }}
          />
        );

      default:
        return <div>Unknown expense type</div>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading expense details...</div>
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-destructive">Expense not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="flex items-center gap-3 p-4 max-w-md">
          <Button variant="ghost" size="icon" asChild>
            <button onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </button>
          </Button>
          <div>
            <h1 className="font-semibold">Edit Expense</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 pb-24">
        {renderForm()}
      </div>
    </div>
  );
}
