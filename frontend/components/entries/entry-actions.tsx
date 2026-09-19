"use client";

import { useState } from "react";
import {
  Pencil,
  Trash2,
  Lock,
  Unlock,
  MoreHorizontal,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface EntryActionsProps {
  entryId: string;
  entryType: "vehicle" | "expense" | "trip" | "odometer";
  isLocked: boolean;
  lockedAt?: Date;
  lockedByName?: string;
  lockedReason?: string;
  onEdit: () => void;
  onDelete: () => Promise<void>;
  onLock: (reason?: string) => Promise<void>;
  onUnlock: () => Promise<void>;
  disabled?: boolean;
  className?: string;
  variant?: "icons" | "dropdown" | "buttons";
  canEdit?: boolean;
  canDelete?: boolean;
}

export function EntryActions({
  entryId,
  entryType,
  isLocked,
  lockedAt,
  lockedByName,
  lockedReason,
  onEdit,
  onDelete,
  onLock,
  onUnlock,
  disabled = false,
  className,
  variant = "icons",
  canEdit = true,
  canDelete = true,
}: EntryActionsProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showLockDialog, setShowLockDialog] = useState(false);
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);
  const [lockReason, setLockReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const entryTypeLabel = {
    vehicle: "vehicle",
    expense: "expense",
    trip: "trip",
    odometer: "odometer reading",
  }[entryType];

  const handleDelete = async () => {
    setIsProcessing(true);
    try {
      await onDelete();
      setShowDeleteDialog(false);
    } catch (error) {
      console.error("Failed to delete:", error);
      // Show user-friendly error message for locked and concurrency errors
      if (error instanceof Error && error.message.startsWith("LOCKED_ERROR:")) {
        alert(error.message.replace("LOCKED_ERROR: ", ""));
      } else if (
        error instanceof Error &&
        error.message.startsWith("CONFLICT_ERROR:")
      ) {
        alert(error.message.replace("CONFLICT_ERROR: ", ""));
      } else {
        alert("Failed to delete. Please try again.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLock = async () => {
    setIsProcessing(true);
    try {
      await onLock(lockReason || undefined);
      setShowLockDialog(false);
      setLockReason("");
    } catch (error) {
      console.error("Failed to lock:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnlock = async () => {
    setIsProcessing(true);
    try {
      await onUnlock();
      setShowUnlockDialog(false);
    } catch (error) {
      console.error("Failed to unlock:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditClick = () => {
    if (isLocked) {
      return;
    }
    onEdit();
  };

  if (variant === "dropdown") {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              disabled={disabled}
              className={className}
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canEdit && (
              <DropdownMenuItem
                onClick={handleEditClick}
                disabled={isLocked}
                className={cn(isLocked && "opacity-50 cursor-not-allowed")}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
                {isLocked && (
                  <Lock className="ml-auto h-3 w-3 text-muted-foreground" />
                )}
              </DropdownMenuItem>
            )}
            {canDelete && (
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                disabled={isLocked}
                className={cn(
                  "text-destructive focus:text-destructive",
                  isLocked && "opacity-50 cursor-not-allowed",
                )}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
                {isLocked && (
                  <Lock className="ml-auto h-3 w-3 text-muted-foreground" />
                )}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {isLocked ? (
              <DropdownMenuItem onClick={() => setShowUnlockDialog(true)}>
                <Unlock className="mr-2 h-4 w-4" />
                Re-open for editing
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => setShowLockDialog(true)}>
                <Lock className="mr-2 h-4 w-4" />
                Confirm record
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {renderDialogs()}
      </>
    );
  }

  if (variant === "buttons") {
    return (
      <>
        <div className={cn("flex items-center gap-2", className)}>
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleEditClick}
              disabled={disabled || isLocked}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )}
          {canDelete && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              disabled={disabled || isLocked}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          )}
          {isLocked ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUnlockDialog(true)}
              disabled={disabled}
            >
              <Unlock className="mr-2 h-4 w-4" />
              Re-open for editing
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLockDialog(true)}
              disabled={disabled}
            >
              <Lock className="mr-2 h-4 w-4" />
              Confirm record
            </Button>
          )}
        </div>

        {renderDialogs()}
      </>
    );
  }

  // Default: icons variant
  return (
    <>
      <div className={cn("flex items-center gap-1", className)}>
        {canEdit && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleEditClick}
            disabled={disabled || isLocked}
            title={isLocked ? "Confirmed record cannot be edited" : "Edit"}
            className="h-8 w-8 sm:h-8 sm:w-8"
          >
            <Pencil className="h-5 w-5 sm:h-4 sm:w-4" />
          </Button>
        )}
        {canDelete && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowDeleteDialog(true)}
            disabled={disabled || isLocked}
            title={isLocked ? "Confirmed record cannot be deleted" : "Delete"}
            className="h-8 w-8 sm:h-8 sm:w-8 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-5 w-5 sm:h-4 sm:w-4" />
          </Button>
        )}
        {isLocked ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowUnlockDialog(true)}
            disabled={disabled}
            title="Re-open for editing"
            className="h-8 w-8 sm:h-8 sm:w-8 text-amber-500 hover:text-amber-600"
          >
            <Unlock className="h-5 w-5 sm:h-4 sm:w-4" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowLockDialog(true)}
            disabled={disabled}
            title="Confirm record"
            className="h-8 w-8 sm:h-8 sm:w-8"
          >
            <Lock className="h-5 w-5 sm:h-4 sm:w-4" />
          </Button>
        )}
      </div>

      {renderDialogs()}
    </>
  );

  function renderDialogs() {
    return (
      <>
        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Delete {entryTypeLabel}
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this {entryTypeLabel}? This
                action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isProcessing}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isProcessing}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isProcessing ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Lock Dialog */}
        <Dialog open={showLockDialog} onOpenChange={setShowLockDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Confirm {entryTypeLabel}
              </DialogTitle>
              <DialogDescription>
                Confirming this {entryTypeLabel} will prevent it from being
                edited or deleted until you re-open it.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="lockReason">Confirmation note (optional)</Label>
                <Input
                  id="lockReason"
                  name="lockReason"
                  placeholder="e.g., Tax audit period, Reviewed and confirmed"
                  value={lockReason}
                  onChange={(e) => setLockReason(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowLockDialog(false)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button onClick={handleLock} disabled={isProcessing}>
                {isProcessing ? "Confirming..." : "Confirm record"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Unlock Dialog */}
        <Dialog open={showUnlockDialog} onOpenChange={setShowUnlockDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Unlock className="h-5 w-5" />
                Re-open {entryTypeLabel} for editing
              </DialogTitle>
              <DialogDescription>
                Re-opening this confirmed {entryTypeLabel} will allow it to be
                edited or deleted again.
              </DialogDescription>
            </DialogHeader>
            {lockedAt && (
              <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Confirmed at:</span>
                  <span>{new Date(lockedAt).toLocaleString("en-ZA")}</span>
                </div>
                {lockedByName && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Confirmed by:</span>
                    <span>{lockedByName}</span>
                  </div>
                )}
                {lockedReason && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Confirmation note:
                    </span>
                    <span>{lockedReason}</span>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowUnlockDialog(false)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button onClick={handleUnlock} disabled={isProcessing}>
                {isProcessing ? "Re-opening..." : "Re-open for editing"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }
}
