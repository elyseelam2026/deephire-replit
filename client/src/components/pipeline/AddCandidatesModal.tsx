import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search, UserPlus, Briefcase, MapPin, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Candidate } from "@shared/schema";

interface AddCandidatesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: number;
  existingCandidateIds: number[];
}

export function AddCandidatesModal({ open, onOpenChange, jobId, existingCandidateIds }: AddCandidatesModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    if (!open) {
      setSelectedIds(new Set());
      setSearchQuery("");
    }
  }, [open]);

  const { data: allCandidates = [], isLoading } = useQuery<Candidate[]>({
    queryKey: ['/api/candidates'],
    enabled: open
  });

  const availableCandidates = useMemo(() => {
    return allCandidates.filter(c => !existingCandidateIds.includes(c.id));
  }, [allCandidates, existingCandidateIds]);

  const filteredCandidates = useMemo(() => {
    if (!searchQuery.trim()) return availableCandidates;
    
    const query = searchQuery.toLowerCase();
    return availableCandidates.filter(c => {
      const fullName = c.displayName || `${c.firstName} ${c.lastName}`;
      return (
        fullName.toLowerCase().includes(query) ||
        c.currentTitle?.toLowerCase().includes(query) ||
        c.currentCompany?.toLowerCase().includes(query) ||
        c.location?.toLowerCase().includes(query)
      );
    });
  }, [availableCandidates, searchQuery]);

  const addCandidatesMutation = useMutation({
    mutationFn: async (candidateIds: number[]) => {
      const res = await fetch(`/api/jobs/${jobId}/candidates/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ candidateIds })
      });
      
      if (!res.ok) {
        throw new Error('Failed to add candidates');
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/jobs', jobId, 'candidates'] });
      toast({
        title: "Candidates added",
        description: `Successfully added ${selectedIds.size} candidate${selectedIds.size === 1 ? '' : 's'} to pipeline`,
      });
      setSelectedIds(new Set());
      setSearchQuery("");
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error adding candidates",
        description: error instanceof Error ? error.message : "Failed to add candidates",
        variant: "destructive",
      });
    }
  });

  const toggleCandidate = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredCandidates.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCandidates.map(c => c.id)));
    }
  };

  const handleAdd = () => {
    if (selectedIds.size === 0) return;
    addCandidatesMutation.mutate(Array.from(selectedIds));
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col" data-testid="dialog-add-candidates">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Add Candidates to Pipeline
          </DialogTitle>
          <DialogDescription>
            Search and select candidates from your database to add to this job's pipeline
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 min-h-0">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, title, company, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-candidates"
              />
            </div>
            {selectedIds.size > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearSelection}
                data-testid="button-clear-selection"
              >
                <X className="w-4 h-4 mr-1" />
                Clear ({selectedIds.size})
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={filteredCandidates.length > 0 && selectedIds.size === filteredCandidates.length}
                onCheckedChange={toggleAll}
                disabled={filteredCandidates.length === 0}
                data-testid="checkbox-select-all"
              />
              <span className="text-muted-foreground">
                {filteredCandidates.length === 0 ? (
                  "No candidates available"
                ) : (
                  `${filteredCandidates.length} candidate${filteredCandidates.length === 1 ? '' : 's'} available`
                )}
              </span>
            </div>
            {selectedIds.size > 0 && (
              <Badge variant="secondary" data-testid="badge-selected-count">
                {selectedIds.size} selected
              </Badge>
            )}
          </div>

          <ScrollArea className="flex-1 min-h-0 -mx-6 px-6">
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">
                Loading candidates...
              </div>
            ) : filteredCandidates.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                {availableCandidates.length === 0 
                  ? "All candidates are already in this pipeline"
                  : "No candidates match your search"}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredCandidates.map((candidate) => {
                  const fullName = candidate.displayName || `${candidate.firstName} ${candidate.lastName}`;
                  const isSelected = selectedIds.has(candidate.id);
                  
                  return (
                    <div
                      key={candidate.id}
                      onClick={() => toggleCandidate(candidate.id)}
                      className="flex items-start gap-3 p-3 rounded-md border hover-elevate active-elevate-2 cursor-pointer"
                      data-testid={`candidate-item-${candidate.id}`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleCandidate(candidate.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1"
                        data-testid={`checkbox-candidate-${candidate.id}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-foreground">
                          {fullName}
                        </div>
                        {candidate.currentTitle && (
                          <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                            <Briefcase className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">
                              {candidate.currentTitle}
                              {candidate.currentCompany && ` at ${candidate.currentCompany}`}
                            </span>
                          </div>
                        )}
                        {candidate.location && (
                          <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">{candidate.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={addCandidatesMutation.isPending}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={selectedIds.size === 0 || addCandidatesMutation.isPending}
            data-testid="button-add-selected"
          >
            {addCandidatesMutation.isPending ? (
              "Adding..."
            ) : (
              `Add ${selectedIds.size} Candidate${selectedIds.size === 1 ? '' : 's'}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
