'use client';

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Navigation, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface OdometerInputProps {
  startOdometer: string;
  endOdometer: string;
  lastOdometer: number | null;
  currentOdometer?: number | null;
  vehicleName?: string;
  loading?: boolean;
  onStartOdometerChange: (value: string) => void;
  onEndOdometerChange: (value: string) => void;
}

export function OdometerInput({ 
  startOdometer,
  endOdometer,
  lastOdometer,
  currentOdometer,
  vehicleName,
  loading = false,
  onStartOdometerChange,
  onEndOdometerChange,
}: OdometerInputProps) {
  const distanceTraveled = endOdometer && startOdometer
    ? Number(endOdometer) - Number(startOdometer)
    : 0;

  return (
    <Card className={cn("bg-muted/30", loading && "opacity-70")}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Navigation className="h-4 w-4" />
          Odometer Readings (km)
        </CardTitle>
        {(lastOdometer || currentOdometer) && (
          <p className="text-sm text-muted-foreground">
            <RotateCcw className="h-3 w-3 inline mr-1" />
            {lastOdometer ? (
              <>Last recorded: <strong>{lastOdometer.toLocaleString()} km</strong></>
            ) : currentOdometer ? (
              <>Vehicle odometer: <strong>{currentOdometer.toLocaleString()} km</strong></>
            ) : null}
            {vehicleName && ` for ${vehicleName}`}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startOdometer" className="text-sm">
              Start (km)
            </Label>
            <Input
              id="startOdometer"
              name="startOdometer"
              type="number"
              inputMode="numeric"
              placeholder={lastOdometer ? String(lastOdometer) : "e.g., 45000"}
              value={startOdometer}
              onChange={(e) => onStartOdometerChange(e.target.value)}
              className="h-14 text-lg font-mono"
              required
            />
            {lastOdometer && (
              <p className="text-xs text-muted-foreground">
                Auto-filled from last trip
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="endOdometer" className="text-sm">
              End (km)
            </Label>
            <Input
              id="endOdometer"
              name="endOdometer"
              type="number"
              inputMode="numeric"
              placeholder="e.g., 45150"
              value={endOdometer}
              onChange={(e) => onEndOdometerChange(e.target.value)}
              className="h-14 text-lg font-mono"
              required
            />
          </div>
        </div>

        {/* Distance Summary */}
        {distanceTraveled > 0 && (
          <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
            <span className="text-sm font-medium">Distance Traveled</span>
            <span className="text-xl font-bold text-primary">
              {distanceTraveled.toLocaleString()} km
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
