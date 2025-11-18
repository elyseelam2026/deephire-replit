import { useState } from "react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ArrowUpDown, ExternalLink, Building2, MapPin, 
  TrendingUp, Calendar, Award
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export type JobCandidate = {
  id: number;
  jobId: number;
  candidateId: number;
  matchScore: number | null;
  searchTier: number | null;
  status: string;
  recruiterNotes: string | null;
  createdAt: string;
  lastActionAt: string | null;
  candidate: {
    id: number;
    firstName: string;
    lastName: string;
    currentTitle?: string | null;
    currentCompany?: string | null;
    location?: string | null;
    email?: string | null;
    yearsExperience?: number | null;
  };
};

interface ListViewProps {
  jobId: number;
  candidates: JobCandidate[];
  onStatusChange?: (candidateId: number, newStatus: string) => void;
  selectedIds?: Set<number>;
  onToggleSelect?: (id: number) => void;
  onToggleSelectAll?: () => void;
  onCandidateClick?: (candidateId: number) => void;
}

type SortField = 'name' | 'company' | 'matchScore' | 'status' | 'addedDate';
type SortDirection = 'asc' | 'desc';

const statusCategories = [
  { key: "recommended", label: "Recommended", color: "bg-blue-500" },
  { key: "reviewed", label: "Reviewed", color: "bg-purple-500" },
  { key: "shortlisted", label: "Shortlisted", color: "bg-indigo-500" },
  { key: "presented", label: "Presented", color: "bg-cyan-500" },
  { key: "interview", label: "Interview", color: "bg-yellow-500" },
  { key: "offer", label: "Offer", color: "bg-orange-500" },
  { key: "placed", label: "Placed", color: "bg-emerald-600" },
  { key: "rejected", label: "Rejected", color: "bg-red-500" }
];

export default function ListView({ jobId, candidates, onStatusChange, selectedIds = new Set(), onToggleSelect, onToggleSelectAll, onCandidateClick }: ListViewProps) {
  const { toast } = useToast();
  const [sortField, setSortField] = useState<SortField>('addedDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedCandidates = [...candidates].sort((a, b) => {
    const multiplier = sortDirection === 'asc' ? 1 : -1;
    
    switch (sortField) {
      case 'name':
        const nameA = `${a.candidate.firstName} ${a.candidate.lastName}`.toLowerCase();
        const nameB = `${b.candidate.firstName} ${b.candidate.lastName}`.toLowerCase();
        return nameA.localeCompare(nameB) * multiplier;
      
      case 'company':
        const compA = (a.candidate.currentCompany || '').toLowerCase();
        const compB = (b.candidate.currentCompany || '').toLowerCase();
        return compA.localeCompare(compB) * multiplier;
      
      case 'matchScore':
        return ((a.matchScore || 0) - (b.matchScore || 0)) * multiplier;
      
      case 'status':
        const statusA = statusCategories.findIndex(s => s.key === a.status);
        const statusB = statusCategories.findIndex(s => s.key === b.status);
        return (statusA - statusB) * multiplier;
      
      case 'addedDate':
        return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * multiplier;
      
      default:
        return 0;
    }
  });

  const handleStatusChange = async (candidateId: number, newStatus: string) => {
    setUpdatingStatus(candidateId);
    
    try {
      await apiRequest(
        'PATCH',
        `/api/job-candidates/${candidateId}/status`,
        {
          status: newStatus,
          note: `Status changed to ${statusCategories.find(s => s.key === newStatus)?.label} via list view`
        }
      );

      queryClient.invalidateQueries({ queryKey: ['/api/jobs', jobId, 'candidates'] });

      toast({
        title: "Status Updated",
        description: `Candidate moved to ${statusCategories.find(s => s.key === newStatus)?.label}`
      });

      onStatusChange?.(candidateId, newStatus);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive"
      });
    } finally {
      setUpdatingStatus(null);
    }
  };

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 px-2 text-xs font-medium hover-elevate active-elevate-2"
      onClick={() => handleSort(field)}
      data-testid={`sort-${field}`}
    >
      {children}
      <ArrowUpDown className={`ml-2 h-3 w-3 ${sortField === field ? 'text-primary' : 'text-muted-foreground'}`} />
    </Button>
  );

  const getStatusBadgeColor = (status: string) => {
    const category = statusCategories.find(s => s.key === status);
    return category?.color || 'bg-gray-500';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (candidates.length === 0) {
    return (
      <Card className="p-12 text-center" data-testid="list-view-empty">
        <p className="text-muted-foreground">No candidates match the current filters</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4" data-testid="list-view">
      {/* Table Header */}
      <Card>
        <div className="grid grid-cols-9 gap-3 p-4 border-b bg-muted/30">
          {onToggleSelectAll && (
            <div className="col-span-1 flex items-center justify-center">
              <Checkbox
                checked={candidates.length > 0 && selectedIds.size === candidates.length}
                onCheckedChange={onToggleSelectAll}
                data-testid="checkbox-select-all"
              />
            </div>
          )}
          <div className={onToggleSelectAll ? "col-span-3" : "col-span-4"}>
            <SortButton field="name">Candidate</SortButton>
          </div>
          <div className="col-span-1">
            <SortButton field="company">Company</SortButton>
          </div>
          <div className="col-span-1">
            <SortButton field="status">Status</SortButton>
          </div>
          <div className="col-span-1 text-center">
            <SortButton field="matchScore">Match</SortButton>
          </div>
          <div className="col-span-1">
            <SortButton field="addedDate">Added</SortButton>
          </div>
          <div className="col-span-1 text-right">
            <span className="text-xs font-medium text-muted-foreground">Actions</span>
          </div>
        </div>

        {/* Table Body */}
        <div className="divide-y">
          {sortedCandidates.map((jobCandidate) => {
            const candidate = jobCandidate.candidate;
            const fullName = `${candidate.firstName} ${candidate.lastName}`;
            
            return (
              <div 
                key={jobCandidate.id} 
                className="grid grid-cols-9 gap-3 p-4 hover-elevate transition-colors"
                data-testid={`list-row-${jobCandidate.id}`}
              >
                {onToggleSelect && (
                  <div className="col-span-1 flex items-center justify-center">
                    <Checkbox
                      checked={selectedIds.has(jobCandidate.id)}
                      onCheckedChange={() => onToggleSelect(jobCandidate.id)}
                      data-testid={`checkbox-candidate-${jobCandidate.id}`}
                    />
                  </div>
                )}
                {/* Candidate Info */}
                <div className={`flex flex-col ${onToggleSelect ? "col-span-3" : "col-span-4"}`}>
                  <button
                    onClick={() => onCandidateClick?.(candidate.id)}
                    className="font-medium text-sm hover:underline text-primary text-left"
                    data-testid={`link-candidate-${candidate.id}`}
                  >
                    {fullName}
                  </button>
                  {candidate.currentTitle && (
                    <span className="text-xs text-muted-foreground mt-1 truncate">
                      {candidate.currentTitle}
                    </span>
                  )}
                  {candidate.yearsExperience && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Award className="h-3 w-3" />
                      {candidate.yearsExperience}y
                    </span>
                  )}
                </div>

                {/* Company */}
                <div className="col-span-1 flex flex-col justify-center">
                  {candidate.currentCompany && (
                    <div className="flex items-center gap-1 text-sm truncate">
                      <Building2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{candidate.currentCompany}</span>
                    </div>
                  )}
                  {candidate.location && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{candidate.location}</span>
                    </div>
                  )}
                </div>

                {/* Status Dropdown */}
                <div className="col-span-1 flex items-center">
                  <Select
                    value={jobCandidate.status}
                    onValueChange={(value) => handleStatusChange(jobCandidate.id, value)}
                    disabled={updatingStatus === jobCandidate.id}
                  >
                    <SelectTrigger 
                      className="h-8 w-full"
                      data-testid={`select-status-${jobCandidate.id}`}
                    >
                      <SelectValue>
                        <div className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${getStatusBadgeColor(jobCandidate.status)}`} />
                          <span className="text-xs truncate">
                            {statusCategories.find(s => s.key === jobCandidate.status)?.label}
                          </span>
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {statusCategories.map((status) => (
                        <SelectItem key={status.key} value={status.key}>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${status.color}`} />
                            <span>{status.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Match Score */}
                <div className="col-span-1 flex items-center justify-center">
                  {jobCandidate.matchScore != null ? (
                    <Badge 
                      variant={jobCandidate.matchScore >= 80 ? "default" : "secondary"}
                      className="text-xs"
                      data-testid={`badge-score-${jobCandidate.id}`}
                    >
                      {jobCandidate.matchScore}%
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </div>

                {/* Added Date */}
                <div className="col-span-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{formatDate(jobCandidate.createdAt)}</span>
                </div>

                {/* Actions */}
                <div className="col-span-1 flex items-center justify-end">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7"
                    onClick={() => onCandidateClick?.(candidate.id)}
                    data-testid={`button-view-${candidate.id}`}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Summary Footer */}
      <div className="text-sm text-muted-foreground text-center" data-testid="list-view-summary">
        Showing {sortedCandidates.length} candidate{sortedCandidates.length !== 1 ? 's' : ''} · 
        Sorted by {sortField === 'name' ? 'Name' : sortField === 'company' ? 'Company' : sortField === 'matchScore' ? 'Match Score' : sortField === 'status' ? 'Status' : 'Date Added'} ({sortDirection === 'asc' ? 'A-Z' : 'Z-A'})
      </div>
    </div>
  );
}
