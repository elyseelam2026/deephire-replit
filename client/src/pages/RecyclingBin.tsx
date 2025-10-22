import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trash2, RotateCcw, MapPin, Briefcase, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Candidate } from "@shared/schema";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
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

export default function RecyclingBin() {
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [candidateToDelete, setCandidateToDelete] = useState<Candidate | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: deletedCandidates, isLoading, error } = useQuery<Candidate[]>({
    queryKey: ['/api/candidates/recycling-bin'],
  });

  const restoreMutation = useMutation({
    mutationFn: async (candidateId: number) => {
      const response = await apiRequest('POST', `/api/candidates/${candidateId}/restore`, null);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/candidates/recycling-bin'] });
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
      toast({
        title: "Candidate Restored",
        description: "The candidate has been successfully restored.",
      });
      setSelectedCandidate(null);
    },
    onError: (error: any) => {
      toast({
        title: "Restore Failed",
        description: error.message || "Failed to restore candidate",
        variant: "destructive",
      });
    },
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: async (candidateId: number) => {
      const response = await apiRequest('DELETE', `/api/candidates/${candidateId}/permanent`, null);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/candidates/recycling-bin'] });
      toast({
        title: "Candidate Permanently Deleted",
        description: "The candidate has been permanently removed from the database.",
      });
      setCandidateToDelete(null);
      setSelectedCandidate(null);
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to permanently delete candidate",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6 p-6" data-testid="recycling-bin-page">
        <div>
          <h1 className="text-3xl font-bold">Recycling Bin</h1>
          <p className="text-muted-foreground">Recover deleted candidates</p>
        </div>
        <div className="text-center py-12">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 p-6" data-testid="recycling-bin-page">
        <div>
          <h1 className="text-3xl font-bold">Recycling Bin</h1>
          <p className="text-muted-foreground">Recover deleted candidates</p>
        </div>
        <div className="text-center py-12 text-destructive">Failed to load recycling bin</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6" data-testid="recycling-bin-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Recycling Bin</h1>
          <p className="text-muted-foreground">Deleted candidates are kept here forever. You can restore or permanently delete them.</p>
        </div>
        <Badge variant="secondary" data-testid="deleted-count">
          {deletedCandidates?.length || 0} deleted
        </Badge>
      </div>

      {!deletedCandidates || deletedCandidates.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Trash2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Recycling bin is empty</p>
              <p className="text-sm mt-2">Deleted candidates will appear here</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {deletedCandidates.map((candidate) => (
            <Card 
              key={candidate.id} 
              className="hover-elevate cursor-pointer"
              onClick={() => setSelectedCandidate(candidate)}
              data-testid={`candidate-card-${candidate.id}`}
            >
              <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                <Avatar>
                  <AvatarFallback>
                    {candidate.firstName[0]}{candidate.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg truncate" data-testid={`candidate-name-${candidate.id}`}>
                    {candidate.firstName} {candidate.lastName}
                  </CardTitle>
                  <CardDescription className="truncate">
                    {candidate.currentTitle || "No title"}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {candidate.currentCompany && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Briefcase className="w-4 h-4" />
                      <span className="truncate">{candidate.currentCompany}</span>
                    </div>
                  )}
                  {candidate.location && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate">{candidate.location}</span>
                    </div>
                  )}
                  {candidate.deletedAt && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span className="text-xs">
                        Deleted {new Date(candidate.deletedAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Candidate Details Dialog */}
      <Dialog open={!!selectedCandidate} onOpenChange={() => setSelectedCandidate(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedCandidate?.firstName} {selectedCandidate?.lastName}
            </DialogTitle>
            <DialogDescription>
              Deleted on {selectedCandidate?.deletedAt ? new Date(selectedCandidate.deletedAt).toLocaleString() : 'Unknown'}
            </DialogDescription>
          </DialogHeader>

          {selectedCandidate && (
            <div className="space-y-6">
              <div className="flex gap-2">
                <Button
                  onClick={() => restoreMutation.mutate(selectedCandidate.id)}
                  disabled={restoreMutation.isPending}
                  className="flex-1"
                  data-testid="button-restore"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  {restoreMutation.isPending ? "Restoring..." : "Restore Candidate"}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setCandidateToDelete(selectedCandidate)}
                  data-testid="button-permanent-delete"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Permanently Delete
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Current Position</h3>
                  <p className="text-sm">{selectedCandidate.currentTitle || "Not specified"}</p>
                  <p className="text-sm text-muted-foreground">{selectedCandidate.currentCompany || "Not specified"}</p>
                </div>

                {selectedCandidate.location && (
                  <div>
                    <h3 className="font-semibold mb-2">Location</h3>
                    <p className="text-sm">{selectedCandidate.location}</p>
                  </div>
                )}

                {selectedCandidate.email && (
                  <div>
                    <h3 className="font-semibold mb-2">Contact</h3>
                    <p className="text-sm">{selectedCandidate.email}</p>
                  </div>
                )}

                {selectedCandidate.biography && (
                  <div>
                    <h3 className="font-semibold mb-2">Biography</h3>
                    <p className="text-sm whitespace-pre-wrap">{selectedCandidate.biography}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Permanent Delete Confirmation Dialog */}
      <AlertDialog open={!!candidateToDelete} onOpenChange={() => setCandidateToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete Candidate?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete{" "}
              <strong>{candidateToDelete?.firstName} {candidateToDelete?.lastName}</strong>{" "}
              from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-permanent-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => candidateToDelete && permanentDeleteMutation.mutate(candidateToDelete.id)}
              className="bg-destructive hover:bg-destructive/90"
              data-testid="button-confirm-permanent-delete"
            >
              Permanently Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
