"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { Loader2, User, X, Car } from "lucide-react";
import { useAssistants, UserAssistantDTO } from "@/hooks/useAssistants";
import { useVehicles } from "@/hooks/use-vehicles";
import { toast } from "sonner";

interface AddAssistantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddAssistantDialog({ open, onOpenChange }: AddAssistantDialogProps) {
  const { addAssistant, isAdding } = useAssistants();
  const { data: vehicles } = useVehicles();
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ASSISTANT_LOW" | "ASSISTANT_HIGH">("ASSISTANT_LOW");
  const [dateRangeStart, setDateRangeStart] = useState("");
  const [dateRangeEnd, setDateRangeEnd] = useState("");
  const [assignedVehicleId, setAssignedVehicleId] = useState<string>("all");


  const handleDateInput = (value: string, setter: (val: string) => void) => {
    // Remove any non-digit characters
    const digits = value.replace(/\D/g, '');
    
    // Format as YYYY-MM-DD
    let formatted = '';
    if (digits.length > 0) {
      formatted += digits.substring(0, 4);
    }
    if (digits.length > 4) {
      formatted += '-' + digits.substring(4, 6);
    }
    if (digits.length > 6) {
      formatted += '-' + digits.substring(6, 8);
    }
    
    setter(formatted);
  };

  const handleAdd = () => {
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (!password) {
      toast.error("Please enter a password for the assistant");
      return;
    }

    addAssistant(
      {
        assistantEmail: email,
        assistantFirstName: firstName || undefined,
        assistantLastName: lastName || undefined,
        assistantRole: role,
        dateRangeStart: dateRangeStart || undefined,
        dateRangeEnd: dateRangeEnd || undefined,
        assignedVehicleId: assignedVehicleId === "all" ? undefined : assignedVehicleId,
        password,
      },
      {
        onSuccess: () => {
          toast.success("Assistant added successfully");
          onOpenChange(false);
          resetForm();
        },
        onError: (error: any) => {
          toast.error(error.response?.data?.message || "Failed to add assistant");
        },
      }
    );
  };

  const resetForm = () => {
    setEmail("");
    setFirstName("");
    setLastName("");
    setPassword("");
    setRole("ASSISTANT_LOW");
    setDateRangeStart("");
    setDateRangeEnd("");
    setAssignedVehicleId("all");
  };

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Assistant</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="assistant@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name (Optional)</Label>
              <Input
                id="firstName"
                name="firstName"
                placeholder="John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name (Optional)</Label>
              <Input
                id="lastName"
                name="lastName"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="family-name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Enter a temporary password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            <p className="text-xs text-muted-foreground">
              The assistant will use this password to log in. They can change it later.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Access Level</Label>
            <Select value={role} onValueChange={(value: any) => setRole(value)}>
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ASSISTANT_LOW">
                  <div className="flex flex-col">
                    <span className="font-medium">View Only</span>
                    <span className="text-xs text-muted-foreground">
                      Can view expenses and logbook, export reports
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="ASSISTANT_HIGH">
                  <div className="flex flex-col">
                    <span className="font-medium">Edit Access</span>
                    <span className="text-xs text-muted-foreground">
                      Can view, add, and edit expenses and logbook entries
                    </span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateRangeStart">Date Range Start (Optional)</Label>
              <Input
                id="dateRangeStart"
                name="dateRangeStart"
                type="text"
                placeholder="YYYY-MM-DD"
                value={dateRangeStart}
                onChange={(e) => handleDateInput(e.target.value, setDateRangeStart)}
                maxLength={10}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateRangeEnd">Date Range End (Optional)</Label>
              <Input
                id="dateRangeEnd"
                name="dateRangeEnd"
                type="text"
                placeholder="YYYY-MM-DD"
                value={dateRangeEnd}
                onChange={(e) => handleDateInput(e.target.value, setDateRangeEnd)}
                maxLength={10}
                autoComplete="off"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vehicle">Assigned Vehicle (Optional)</Label>
            <Select value={assignedVehicleId} onValueChange={setAssignedVehicleId}>
              <SelectTrigger id="vehicle">
                <SelectValue placeholder="All vehicles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4" />
                    <span>All vehicles</span>
                  </div>
                </SelectItem>
                {vehicles?.map((vehicle: any) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4" />
                      <span>{vehicle.registrationNumber}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              If specified, the assistant will only have access to this vehicle's expenses and logbook entries.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={!email || !password || isAdding}>
            {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Assistant
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
