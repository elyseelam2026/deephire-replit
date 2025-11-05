import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckSquare, X, RefreshCw, FileText, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface BulkActionsToolbarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkStatusChange: (status: string) => Promise<void>;
  onBulkDelete?: () => Promise<void>;
  onBulkAddNotes?: (notes: string) => Promise<void>;
}

const statusOptions = [
  { value: "recommended", label: "Recommended" },
  { value: "reviewed", label: "Reviewed" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "presented", label: "Presented" },
  { value: "interview", label: "Interview" },
  { value: "offer", label: "Offer" },
  { value: "placed", label: "Placed" },
  { value: "rejected", label: "Rejected" }
];

export function BulkActionsToolbar({
  selectedCount,
  onClearSelection,
  onBulkStatusChange,
  onBulkDelete,
  onBulkAddNotes
}: BulkActionsToolbarProps) {
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [notes, setNotes] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleStatusChange = async () => {
    if (!selectedStatus) return;
    
    setIsProcessing(true);
    try {
      await onBulkStatusChange(selectedStatus);
      toast({
        title: "Status updated",
        description: `Updated ${selectedCount} candidate${selectedCount === 1 ? '' : 's'} to ${statusOptions.find(s => s.value === selectedStatus)?.label}`,
      });
      setSelectedStatus("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update candidate status",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddNotes = async () => {
    if (!notes.trim() || !onBulkAddNotes) return;
    
    setIsProcessing(true);
    try {
      await onBulkAddNotes(notes);
      toast({
        title: "Notes added",
        description: `Added notes to ${selectedCount} candidate${selectedCount === 1 ? '' : 's'}`,
      });
      setNotes("");
      setShowNotesDialog(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add notes",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!onBulkDelete) return;
    
    if (!confirm(`Are you sure you want to remove ${selectedCount} candidate${selectedCount === 1 ? '' : 's'} from this pipeline?`)) {
      return;
    }

    setIsProcessing(true);
    try {
      await onBulkDelete();
      toast({
        title: "Candidates removed",
        description: `Removed ${selectedCount} candidate${selectedCount === 1 ? '' : 's'} from pipeline`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove candidates",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (selectedCount === 0) return null;

  return (
    <>
      <div 
        className="flex items-center justify-between p-3 bg-primary/10 dark:bg-primary/20 border border-primary/30 rounded-md gap-3"
        data-testid="bulk-actions-toolbar"
      >
        <div className="flex items-center gap-3">
          <CheckSquare className="h-5 w-5 text-primary" />
          <span className="font-medium">
            {selectedCount} selected
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            disabled={isProcessing}
            data-testid="button-clear-selection"
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Select
              value={selectedStatus}
              onValueChange={setSelectedStatus}
              disabled={isProcessing}
            >
              <SelectTrigger className="w-[180px]" data-testid="select-bulk-status">
                <SelectValue placeholder="Change status..." />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleStatusChange}
              disabled={!selectedStatus || isProcessing}
              size="sm"
              data-testid="button-apply-status"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Apply
                </>
              )}
            </Button>
          </div>

          {onBulkAddNotes && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNotesDialog(true)}
              disabled={isProcessing}
              data-testid="button-add-notes"
            >
              <FileText className="h-4 w-4 mr-2" />
              Add Notes
            </Button>
          )}

          {onBulkDelete && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={isProcessing}
              data-testid="button-bulk-delete"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remove
            </Button>
          )}
        </div>
      </div>

      <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
        <DialogContent data-testid="dialog-bulk-notes">
          <DialogHeader>
            <DialogTitle>Add Notes to {selectedCount} Candidates</DialogTitle>
            <DialogDescription>
              These notes will be appended to the recruiter notes for all selected candidates.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="bulk-notes">Notes</Label>
            <Textarea
              id="bulk-notes"
              placeholder="Enter notes to add to all selected candidates..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              data-testid="textarea-bulk-notes"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNotesDialog(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddNotes}
              disabled={!notes.trim() || isProcessing}
              data-testid="button-save-notes"
            >
              {isProcessing ? "Adding..." : "Add Notes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
