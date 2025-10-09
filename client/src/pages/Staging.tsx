import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle,
  User,
  Building2,
  Link as LinkIcon,
  FileText,
  ExternalLink
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface StagingCandidate {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  currentTitle: string;
  currentCompany: string;
  bioUrl?: string;
  linkedinUrl?: string;
  sourceUrl: string;
  sourceType: string;
  companyId: number;
  verificationStatus: string;
  confidenceScore: number;
  scrapedAt: string;
  verifiedAt?: string;
  productionCandidateId?: number;
}

interface VerificationResult {
  candidateId: number;
  verificationStatus: string;
  confidenceScore: number;
  linkedinUrl?: string;
  linkedinCompanyMatch: boolean;
  linkedinTitleMatch: boolean;
  bioUrlValid: boolean;
  hasDuplicates: boolean;
  duplicateIds: number[];
  verificationNotes: string;
  verifiedAt: string;
}

export default function Staging() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedCandidate, setSelectedCandidate] = useState<StagingCandidate | null>(null);
  const [verificationDetails, setVerificationDetails] = useState<VerificationResult | null>(null);

  const { data: stagingCandidates = [], isLoading } = useQuery<StagingCandidate[]>({
    queryKey: ["/api/staging-candidates"],
  });

  const approveMutation = useMutation({
    mutationFn: async (candidateId: number) => {
      const response = await apiRequest('POST', `/api/staging-candidates/${candidateId}/approve`);
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/staging-candidates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      toast({
        title: "Candidate Approved",
        description: `Successfully moved to production candidates.`,
      });
      setSelectedCandidate(null);
      setVerificationDetails(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve candidate",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (candidateId: number) => {
      const response = await apiRequest('POST', `/api/staging-candidates/${candidateId}/reject`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staging-candidates"] });
      toast({
        title: "Candidate Rejected",
        description: "Candidate has been rejected and removed from staging.",
      });
      setSelectedCandidate(null);
      setVerificationDetails(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject candidate",
        variant: "destructive",
      });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (candidateId: number) => {
      const response = await apiRequest('POST', `/api/staging-candidates/${candidateId}/verify`);
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/staging-candidates"] });
      toast({
        title: "Verification Complete",
        description: `Confidence score: ${(data.confidenceScore * 100).toFixed(0)}%`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to verify candidate",
        variant: "destructive",
      });
    },
  });

  const filteredCandidates = stagingCandidates.filter(candidate => {
    const matchesSearch = 
      candidate.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.currentCompany.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.currentTitle.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = 
      statusFilter === "all" || 
      candidate.verificationStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "rejected":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "pending_review":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "pending":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.85) return "text-green-500";
    if (score >= 0.6) return "text-yellow-500";
    if (score >= 0.3) return "text-orange-500";
    return "text-red-500";
  };

  const handleViewDetails = async (candidate: StagingCandidate) => {
    setSelectedCandidate(candidate);
    
    // Fetch verification details
    try {
      const response = await fetch(`/api/staging-candidates/${candidate.id}`);
      const data = await response.json();
      if (data.verificationResult) {
        setVerificationDetails(data.verificationResult);
      }
    } catch (error) {
      console.error("Failed to load verification details:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <Clock className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Staging Candidates</h1>
        <p className="text-muted-foreground mt-1">
          Review and approve candidates before moving them to production
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Staging</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stagingCandidates.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stagingCandidates.filter(c => c.verificationStatus === "pending_review").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">High Confidence</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {stagingCandidates.filter(c => c.confidenceScore >= 0.85).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Needs Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">
              {stagingCandidates.filter(c => c.confidenceScore < 0.85 && c.confidenceScore >= 0.6).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, company, or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-staging"
            />
          </div>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48" data-testid="select-status-filter">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="pending_review">Pending Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Candidates List */}
      <div className="space-y-3">
        {filteredCandidates.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-64">
              <User className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No staging candidates found</p>
            </CardContent>
          </Card>
        ) : (
          filteredCandidates.map((candidate) => (
            <Card key={candidate.id} className="hover-elevate">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold" data-testid={`text-candidate-name-${candidate.id}`}>
                        {candidate.fullName}
                      </h3>
                      <Badge className={getStatusColor(candidate.verificationStatus)}>
                        {candidate.verificationStatus.replace('_', ' ')}
                      </Badge>
                      {candidate.confidenceScore > 0 && (
                        <Badge variant="outline" className={getConfidenceColor(candidate.confidenceScore)}>
                          {(candidate.confidenceScore * 100).toFixed(0)}% confidence
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Building2 className="h-4 w-4" />
                        <span>{candidate.currentCompany}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span>{candidate.currentTitle}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-3">
                      {candidate.linkedinUrl && (
                        <a 
                          href={candidate.linkedinUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          <LinkIcon className="h-3 w-3" />
                          LinkedIn
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      {candidate.bioUrl && (
                        <a 
                          href={candidate.bioUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          <FileText className="h-3 w-3" />
                          Bio
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      <span className="text-xs text-muted-foreground">
                        Source: {candidate.sourceType}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(candidate)}
                      data-testid={`button-view-details-${candidate.id}`}
                    >
                      View Details
                    </Button>
                    {candidate.verificationStatus === "pending" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => verifyMutation.mutate(candidate.id)}
                        disabled={verifyMutation.isPending}
                        data-testid={`button-verify-${candidate.id}`}
                      >
                        Verify
                      </Button>
                    )}
                    {(candidate.verificationStatus === "pending_review" || candidate.verificationStatus === "pending") && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => approveMutation.mutate(candidate.id)}
                          disabled={approveMutation.isPending}
                          data-testid={`button-approve-${candidate.id}`}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => rejectMutation.mutate(candidate.id)}
                          disabled={rejectMutation.isPending}
                          data-testid={`button-reject-${candidate.id}`}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Details Dialog */}
      <Dialog open={!!selectedCandidate} onOpenChange={() => {
        setSelectedCandidate(null);
        setVerificationDetails(null);
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedCandidate?.fullName}</DialogTitle>
            <DialogDescription>
              Staging candidate details and verification results
            </DialogDescription>
          </DialogHeader>

          {selectedCandidate && (
            <div className="space-y-4">
              {/* Basic Info */}
              <div>
                <h4 className="font-semibold mb-2">Basic Information</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Company:</span>
                    <p className="font-medium">{selectedCandidate.currentCompany}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Title:</span>
                    <p className="font-medium">{selectedCandidate.currentTitle}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Source:</span>
                    <p className="font-medium">{selectedCandidate.sourceType}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Scraped:</span>
                    <p className="font-medium">{new Date(selectedCandidate.scrapedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {/* Verification Results */}
              {verificationDetails && (
                <div>
                  <h4 className="font-semibold mb-2">Verification Results</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                      <span className="text-sm">Confidence Score</span>
                      <Badge className={getConfidenceColor(verificationDetails.confidenceScore)}>
                        {(verificationDetails.confidenceScore * 100).toFixed(0)}%
                      </Badge>
                    </div>
                    
                    {verificationDetails.linkedinUrl && (
                      <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                        <span className="text-sm">LinkedIn Profile</span>
                        <div className="flex items-center gap-2">
                          <a 
                            href={verificationDetails.linkedinUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline"
                          >
                            View Profile
                          </a>
                          {verificationDetails.linkedinCompanyMatch && (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                      <span className="text-sm">Company Match</span>
                      {verificationDetails.linkedinCompanyMatch ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>

                    <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                      <span className="text-sm">Title Match</span>
                      {verificationDetails.linkedinTitleMatch ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>

                    {verificationDetails.hasDuplicates && (
                      <div className="flex items-center gap-2 p-3 bg-yellow-500/10 rounded-md">
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm text-yellow-500">
                          Duplicate detected (ID: {verificationDetails.duplicateIds.join(", ")})
                        </span>
                      </div>
                    )}

                    {verificationDetails.verificationNotes && (
                      <div className="p-3 bg-muted rounded-md">
                        <span className="text-sm font-medium">Notes:</span>
                        <p className="text-sm text-muted-foreground mt-1">
                          {verificationDetails.verificationNotes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {selectedCandidate && (selectedCandidate.verificationStatus === "pending_review" || selectedCandidate.verificationStatus === "pending") && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedCandidate(null);
                    setVerificationDetails(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => selectedCandidate && rejectMutation.mutate(selectedCandidate.id)}
                  disabled={rejectMutation.isPending}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button
                  onClick={() => selectedCandidate && approveMutation.mutate(selectedCandidate.id)}
                  disabled={approveMutation.isPending}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Approve to Production
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
