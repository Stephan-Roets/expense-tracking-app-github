"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Car, Plus, Edit, Trash2, Save, X } from "lucide-react";
import { apiFetch } from "@/lib/api/client";

interface Vehicle {
  id: string;
  registrationNumber: string;
  make: string;
  model: string;
}

interface VehicleTaxProfile {
  id: string;
  vehicleId: string;
  vehicleRegistration: string;
  vehicleMake: string;
  vehicleModel: string;
  taxYear: number;
  vehicleValueCents: number;
  useCostScaleMethod: boolean;
  useTravelAllowanceMethod: boolean;
  preferredExportMethod: string | null;
  customFixedCostCents: number | null;
  customFuelCostTenthsCentsPerKm: number | null;
  customMaintenanceCostTenthsCentsPerKm: number | null;
  notes: string | null;
  isActive: boolean;
}

export default function TaxProfilesPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<VehicleTaxProfile[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<VehicleTaxProfile | null>(null);

  const [formData, setFormData] = useState({
    vehicleId: "",
    taxYear: 2026,
    vehicleValueCents: 0,
    useCostScaleMethod: true,
    useTravelAllowanceMethod: true,
    preferredExportMethod: "",
    customFixedCostCents: 0,
    customFuelCostTenthsCentsPerKm: 0,
    customMaintenanceCostTenthsCentsPerKm: 0,
    notes: "",
  });

  const taxYears = [2024, 2025, 2026, 2027];

  useEffect(() => {
    fetchProfiles();
    fetchVehicles();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const response = await apiFetch("/api/v1/admin/vehicle-tax-profiles");
      if (response.ok) {
        const data = await response.json();
        setProfiles(data);
      }
    } catch (err) {
      setError("Failed to fetch tax profiles");
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicles = async () => {
    try {
      const response = await apiFetch("/api/v1/admin/vehicles");
      if (response.ok) {
        const data = await response.json();
        setVehicles(data);
      }
    } catch (err) {
      setError("Failed to fetch vehicles");
    }
  };

  const handleCreate = () => {
    setEditingProfile(null);
    setFormData({
      vehicleId: vehicles.length > 0 ? vehicles[0].id : "",
      taxYear: 2026,
      vehicleValueCents: 0,
      useCostScaleMethod: true,
      useTravelAllowanceMethod: true,
      preferredExportMethod: "",
      customFixedCostCents: 0,
      customFuelCostTenthsCentsPerKm: 0,
      customMaintenanceCostTenthsCentsPerKm: 0,
      notes: "",
    });
    setDialogOpen(true);
  };

  const handleEdit = (profile: VehicleTaxProfile) => {
    setEditingProfile(profile);
    setFormData({
      vehicleId: profile.vehicleId,
      taxYear: profile.taxYear,
      vehicleValueCents: profile.vehicleValueCents,
      useCostScaleMethod: profile.useCostScaleMethod,
      useTravelAllowanceMethod: profile.useTravelAllowanceMethod,
      preferredExportMethod: profile.preferredExportMethod || "",
      customFixedCostCents: profile.customFixedCostCents || 0,
      customFuelCostTenthsCentsPerKm: profile.customFuelCostTenthsCentsPerKm || 0,
      customMaintenanceCostTenthsCentsPerKm: profile.customMaintenanceCostTenthsCentsPerKm || 0,
      notes: profile.notes || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this tax profile?")) return;

    try {
      const response = await apiFetch(`/api/v1/admin/vehicle-tax-profiles/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchProfiles();
      } else {
        setError("Failed to delete tax profile");
      }
    } catch (err) {
      setError("Failed to delete tax profile");
    }
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        ...formData,
        vehicleValueCents: formData.vehicleValueCents || 0,
        customFixedCostCents: formData.customFixedCostCents || null,
        customFuelCostTenthsCentsPerKm: formData.customFuelCostTenthsCentsPerKm || null,
        customMaintenanceCostTenthsCentsPerKm: formData.customMaintenanceCostTenthsCentsPerKm || null,
        notes: formData.notes || null,
      };

      const url = editingProfile
        ? `/api/v1/admin/vehicle-tax-profiles/${editingProfile.id}`
        : "/api/v1/admin/vehicle-tax-profiles";

      const response = await apiFetch(url, {
        method: editingProfile ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setDialogOpen(false);
        fetchProfiles();
      } else {
        const errorData = await response.json();
        setError(errorData.message || "Failed to save tax profile");
      }
    } catch (err) {
      setError("Failed to save tax profile");
    }
  };

  const formatZAR = (cents: number) => {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }).format(cents / 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vehicle Tax Profiles</h1>
          <p className="text-muted-foreground">
            Manage tax calculation settings for your vehicles
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create Tax Profile
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Tax Profiles
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading...</p>
          ) : profiles.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No tax profiles found</p>
              <Button onClick={handleCreate}>Create your first tax profile</Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Tax Year</TableHead>
                  <TableHead>Vehicle Value</TableHead>
                  <TableHead>Methods</TableHead>
                  <TableHead>Export Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{profile.vehicleRegistration}</p>
                        <p className="text-sm text-muted-foreground">
                          {profile.vehicleMake} {profile.vehicleModel}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{profile.taxYear}</TableCell>
                    <TableCell>{formatZAR(profile.vehicleValueCents)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {profile.useTravelAllowanceMethod && (
                          <Badge variant="outline" className="text-xs">TA</Badge>
                        )}
                        {profile.useCostScaleMethod && (
                          <Badge variant="outline" className="text-xs">CS</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {profile.preferredExportMethod || "Auto"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={profile.isActive ? "default" : "secondary"}>
                        {profile.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(profile)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(profile.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProfile ? "Edit Tax Profile" : "Create Tax Profile"}
            </DialogTitle>
            <DialogDescription>
              Configure tax calculation settings for this vehicle
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vehicle">Vehicle</Label>
                <Select
                  value={formData.vehicleId}
                  onValueChange={(v) => setFormData({ ...formData, vehicleId: v })}
                  disabled={!!editingProfile}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.registrationNumber} - {vehicle.make} {vehicle.model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="taxYear">Tax Year</Label>
                <Select
                  value={formData.taxYear.toString()}
                  onValueChange={(v) => setFormData({ ...formData, taxYear: parseInt(v) })}
                  disabled={!!editingProfile}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {taxYears.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}/{(year + 1).toString().slice(-2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vehicleValue">Vehicle Value (ZAR)</Label>
              <Input
                id="vehicleValue"
                name="vehicleValue"
                type="number"
                value={formData.vehicleValueCents / 100}
                onChange={(e) => setFormData({ ...formData, vehicleValueCents: parseFloat(e.target.value) * 100 })}
                placeholder="2500000"
              />
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-medium">Calculation Methods</h3>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="useTravelAllowance">Travel Allowance Method</Label>
                  <p className="text-sm text-muted-foreground">Use SARS prescribed rate per km</p>
                </div>
                <Switch
                  id="useTravelAllowance"
                  checked={formData.useTravelAllowanceMethod}
                  onCheckedChange={(checked) => setFormData({ ...formData, useTravelAllowanceMethod: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="useCostScale">Cost Scale Method</Label>
                  <p className="text-sm text-muted-foreground">Use SARS cost scale table</p>
                </div>
                <Switch
                  id="useCostScale"
                  checked={formData.useCostScaleMethod}
                  onCheckedChange={(checked) => setFormData({ ...formData, useCostScaleMethod: checked })}
                />
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t">
              <Label htmlFor="preferredExportMethod">Preferred Export Method</Label>
              <Select
                value={formData.preferredExportMethod}
                onValueChange={(v) => setFormData({ ...formData, preferredExportMethod: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Auto (select best method)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Auto (select best method)</SelectItem>
                  <SelectItem value="TRAVEL_ALLOWANCE">Travel Allowance</SelectItem>
                  <SelectItem value="COST_SCALE">Cost Scale</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Override the calculation method used in SARS logbook exports
              </p>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-medium">Custom Cost Overrides (Optional)</h3>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customFixedCost">Fixed Cost (ZAR)</Label>
                  <Input
                    id="customFixedCost"
                    name="customFixedCost"
                    type="number"
                    value={formData.customFixedCostCents / 100}
                    onChange={(e) => setFormData({ ...formData, customFixedCostCents: parseFloat(e.target.value) * 100 })}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customFuelCost">Fuel Cost (cents/km)</Label>
                  <Input
                    id="customFuelCost"
                    name="customFuelCost"
                    type="number"
                    value={formData.customFuelCostTenthsCentsPerKm / 10}
                    onChange={(e) => setFormData({ ...formData, customFuelCostTenthsCentsPerKm: parseFloat(e.target.value) * 10 })}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customMaintenanceCost">Maintenance Cost (cents/km)</Label>
                  <Input
                    id="customMaintenanceCost"
                    name="customMaintenanceCost"
                    type="number"
                    value={formData.customMaintenanceCostTenthsCentsPerKm / 10}
                    onChange={(e) => setFormData({ ...formData, customMaintenanceCostTenthsCentsPerKm: parseFloat(e.target.value) * 10 })}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add any notes about this tax profile..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              <Save className="mr-2 h-4 w-4" />
              Save Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
