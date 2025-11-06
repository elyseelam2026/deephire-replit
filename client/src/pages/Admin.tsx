import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Upload, 
  FileText, 
  Users, 
  Building2, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Link,
  Database,
  Zap,
  GitMerge,
  UserPlus,
  X,
  Eye,
  Mail,
  MapPin,
  Briefcase,
  Star,
  TrendingUp,
  BarChart3,
  ArrowRight,
  Search,
  Shield
} from "lucide-react";
import DataQualityDashboard from "@/pages/DataQualityDashboard";
import { CompanyResearch } from "@/components/admin/CompanyResearch";
import { PromiseStatus } from "@/components/admin/PromiseStatus";

function DataQualityTabContent() {
  return <DataQualityDashboard />;
}

type UploadStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'error';

interface UploadResult {
  success: number;
  duplicates?: number;
  jobId?: number;
  backgroundProcessing?: boolean;
  urlsQueued?: number;
  failed: number;
  total: number;
  message?: string;
  errors: string[];
}

interface DuplicateDetection {
  id: number;
  entityType: 'candidate' | 'company';
  newRecordData: any;
  existingRecordId: number;
  matchedFields: string[];
  matchScore: number;
  status: 'pending' | 'resolved';
  resolution?: 'merge' | 'create_new' | 'skip';
  ingestionJobId?: number;
  createdAt: string;
}

interface ResolveAction {
  action: 'merge' | 'create_new' | 'skip';
  selectedId?: number;
}

interface UploadHistoryJob {
  id: number;
  fileName: string;
  fileType: string;
  uploadedById: number | null;
  entityType: 'candidate' | 'company';
  status: 'processing' | 'completed' | 'failed' | 'reviewing';
  totalRecords: number;
  processedRecords: number;
  successfulRecords: number;
  duplicateRecords: number;
  errorRecords: number;
  errorDetails?: any;
  processingMethod?: string;
  createdAt: string;
  completedAt?: string;
}

interface UploadSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: UploadResult | null;
  entityType: 'candidate' | 'company';
  onNavigateToData: () => void;
  onNavigateToDuplicates: () => void;
  onNavigateToHistory: () => void;
}

function UploadSummaryModal({ 
  isOpen, 
  onClose, 
  result, 
  entityType, 
  onNavigateToData, 
  onNavigateToDuplicates, 
  onNavigateToHistory 
}: UploadSummaryModalProps) {
  if (!result) return null;

  const successRate = result.total > 0 ? Math.round((result.success / result.total) * 100) : 0;
  const duplicateRate = result.total > 0 ? Math.round(((result.duplicates || 0) / result.total) * 100) : 0;
  const errorRate = result.total > 0 ? Math.round((result.failed / result.total) * 100) : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-600" />
            Upload Complete
          </DialogTitle>
          <DialogDescription>
            Your {entityType} upload has been processed successfully. Review the results and next steps below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Overall Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{result.total}</div>
                <div className="text-xs text-muted-foreground">Total Processed</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{result.success}</div>
                <div className="text-xs text-muted-foreground">Successfully Added</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-amber-600">{result.duplicates || 0}</div>
                <div className="text-xs text-muted-foreground">Duplicates Found</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{result.failed}</div>
                <div className="text-xs text-muted-foreground">Failed to Process</div>
              </CardContent>
            </Card>
          </div>

          {/* Success Rate Visualization */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Processing Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Success Rate</span>
                  <span className="font-medium">{successRate}%</span>
                </div>
                <Progress value={successRate} className="h-2" />
              </div>
              
              {(result.duplicates || 0) > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Duplicates Detected</span>
                    <span className="font-medium">{duplicateRate}%</span>
                  </div>
                  <Progress value={duplicateRate} className="h-2 bg-amber-100">
                    <div 
                      className="h-full bg-amber-500 rounded-full transition-all duration-300"
                      style={{ width: `${duplicateRate}%` }}
                    />
                  </Progress>
                </div>
              )}

              {result.failed > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Processing Errors</span>
                    <span className="font-medium">{errorRate}%</span>
                  </div>
                  <Progress value={errorRate} className="h-2 bg-red-100">
                    <div 
                      className="h-full bg-red-500 rounded-full transition-all duration-300"
                      style={{ width: `${errorRate}%` }}
                    />
                  </Progress>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-4">
            <div className="text-sm font-medium">What would you like to do next?</div>
            
            <div className="grid gap-3">
              {result.success > 0 && (
                <Button 
                  onClick={() => {
                    onNavigateToData();
                    onClose();
                  }}
                  variant="default" 
                  className="justify-start"
                  data-testid="button-view-uploaded-data"
                >
                  <Database className="h-4 w-4 mr-2" />
                  View Uploaded {entityType === 'candidate' ? 'Candidates' : 'Companies'} ({result.success})
                  <ArrowRight className="h-4 w-4 ml-auto" />
                </Button>
              )}

              {(result.duplicates || 0) > 0 && (
                <Button 
                  onClick={() => {
                    onNavigateToDuplicates();
                    onClose();
                  }}
                  variant="outline" 
                  className="justify-start"
                  data-testid="button-review-duplicates"
                >
                  <GitMerge className="h-4 w-4 mr-2" />
                  Review Duplicates ({result.duplicates})
                  <ArrowRight className="h-4 w-4 ml-auto" />
                </Button>
              )}

              <Button 
                onClick={() => {
                  onNavigateToHistory();
                  onClose();
                }}
                variant="outline" 
                className="justify-start"
                data-testid="button-view-upload-history"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                View Upload History
                <ArrowRight className="h-4 w-4 ml-auto" />
              </Button>
            </div>
          </div>

          {/* Error Details */}
          {result.errors && result.errors.length > 0 && (
            <Card className="border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
              <CardHeader>
                <CardTitle className="text-sm text-red-800 dark:text-red-200">Processing Errors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm text-red-700 dark:text-red-300">
                  {result.errors.slice(0, 5).map((error, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span className="text-xs">{error}</span>
                    </div>
                  ))}
                  {result.errors.length > 5 && (
                    <div className="text-xs text-red-600 dark:text-red-400 mt-2">
                      ... and {result.errors.length - 5} more errors
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bottom Action */}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={onClose} data-testid="button-close-summary">
              Close
            </Button>
            <Button 
              onClick={() => {
                // Primary action based on results
                if ((result.duplicates || 0) > 0) {
                  onNavigateToDuplicates();
                } else if (result.success > 0) {
                  onNavigateToData();
                } else {
                  onNavigateToHistory();
                }
                onClose();
              }}
              data-testid="button-primary-action"
            >
              {(result.duplicates || 0) > 0 ? 'Review Duplicates' : result.success > 0 ? 'View Data' : 'View History'}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Admin() {
  // Quick Add states
  const [quickAddFirstName, setQuickAddFirstName] = useState("");
  const [quickAddLastName, setQuickAddLastName] = useState("");
  const [quickAddCompany, setQuickAddCompany] = useState("");
  const [quickAddJobTitle, setQuickAddJobTitle] = useState("");
  const [quickAddLinkedinUrl, setQuickAddLinkedinUrl] = useState("");
  const [booleanSearch, setBooleanSearch] = useState("");
  const [booleanSearchResults, setBooleanSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [researchQuery, setResearchQuery] = useState("");
  const [researchMaxResults, setResearchMaxResults] = useState(50);
  const [researchSaveCampaign, setResearchSaveCampaign] = useState("no");
  const [researchResults, setResearchResults] = useState<any>(null);
  const [selectedCompanies, setSelectedCompanies] = useState<number[]>([]);
  
  const [candidateFiles, setCandidateFiles] = useState<FileList | null>(null);
  const [candidateUrls, setCandidateUrls] = useState("");
  const [candidateProcessingMode, setCandidateProcessingMode] = useState<'full' | 'career_only' | 'bio_only' | 'data_only'>('full');
  const [quickAddProcessingMode, setQuickAddProcessingMode] = useState<'full' | 'career_only' | 'bio_only' | 'data_only'>('full');
  const [companyFiles, setCompanyFiles] = useState<FileList | null>(null);
  const [companyUrls, setCompanyUrls] = useState("");
  const [candidateStatus, setCandidateStatus] = useState<UploadStatus>('idle');
  const [companyStatus, setCompanyStatus] = useState<UploadStatus>('idle');
  const [candidateProgress, setCandidateProgress] = useState(0);
  const [companyProgress, setCompanyProgress] = useState(0);
  const [candidateJobId, setCandidateJobId] = useState<number | null>(null);
  const [companyJobId, setCompanyJobId] = useState<number | null>(null);
  const [candidateJobStatus, setCandidateJobStatus] = useState<string>('');
  const [companyJobStatus, setCompanyJobStatus] = useState<string>('');
  const [duplicateFilter, setDuplicateFilter] = useState<string>('pending');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [historyEntityFilter, setHistoryEntityFilter] = useState<string>('all');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('all');
  const [summaryModal, setSummaryModal] = useState<{
    isOpen: boolean;
    result: UploadResult | null;
    entityType: 'candidate' | 'company';
  }>({ isOpen: false, result: null, entityType: 'candidate' });
  const { toast} = useToast();
  const queryClient = useQueryClient();

  // Poll for job status when processing
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    const pollJobStatus = async (jobId: number, type: 'candidate' | 'company') => {
      try {
        const response = await fetch(`/api/admin/jobs/${jobId}/status`);
        if (!response.ok) return;
        
        const data = await response.json();
        
        if (type === 'candidate') {
          setCandidateJobStatus(data.status);
          setCandidateProgress(data.progressPercentage || 0);
          
          if (data.status === 'completed') {
            setCandidateStatus('completed');
            setCandidateJobId(null);
            queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
            queryClient.invalidateQueries({ queryKey: ['/api/admin/upload-history'] });
          } else if (data.status === 'stopped') {
            setCandidateStatus('idle');
            setCandidateJobId(null);
            toast({ title: "Upload Stopped", description: "The upload was cancelled by user.", variant: "destructive" });
          } else if (data.status === 'error') {
            setCandidateStatus('error');
            setCandidateJobId(null);
            toast({ title: "Upload Failed", description: "The upload encountered an error.", variant: "destructive" });
          }
        } else {
          setCompanyJobStatus(data.status);
          setCompanyProgress(data.progressPercentage || 0);
          
          if (data.status === 'completed') {
            setCompanyStatus('completed');
            setCompanyJobId(null);
            queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
            queryClient.invalidateQueries({ queryKey: ['/api/admin/upload-history'] });
          } else if (data.status === 'stopped') {
            setCompanyStatus('idle');
            setCompanyJobId(null);
            toast({ title: "Upload Stopped", description: "The company upload was cancelled by user.", variant: "destructive" });
          } else if (data.status === 'error') {
            setCompanyStatus('error');
            setCompanyJobId(null);
            toast({ title: "Upload Failed", description: "The company upload encountered an error.", variant: "destructive" });
          }
        }
      } catch (error) {
        console.error('Error polling job status:', error);
      }
    };

    if (candidateJobId) {
      intervalId = setInterval(() => pollJobStatus(candidateJobId, 'candidate'), 2000);
    } else if (companyJobId) {
      intervalId = setInterval(() => pollJobStatus(companyJobId, 'company'), 2000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [candidateJobId, companyJobId, queryClient]);

  // Job control functions
  const pauseJob = async (jobId: number, type: 'candidate' | 'company') => {
    try {
      await apiRequest('POST', `/api/admin/jobs/${jobId}/pause`, null);
      if (type === 'candidate') {
        setCandidateJobStatus('paused');
      } else {
        setCompanyJobStatus('paused');
      }
      toast({ title: "Job Paused", description: "The upload job has been paused." });
    } catch (error: any) {
      toast({ title: "Pause Failed", description: error.message, variant: "destructive" });
    }
  };

  const resumeJob = async (jobId: number, type: 'candidate' | 'company') => {
    try {
      await apiRequest('POST', `/api/admin/jobs/${jobId}/resume`, null);
      if (type === 'candidate') {
        setCandidateJobStatus('processing');
      } else {
        setCompanyJobStatus('processing');
      }
      toast({ title: "Job Resumed", description: "The upload job has been resumed." });
    } catch (error: any) {
      toast({ title: "Resume Failed", description: error.message, variant: "destructive" });
    }
  };

  const stopJob = async (jobId: number, type: 'candidate' | 'company') => {
    try {
      await apiRequest('POST', `/api/admin/jobs/${jobId}/stop`, null);
      if (type === 'candidate') {
        setCandidateJobStatus('stopped');
        setCandidateJobId(null);
        setCandidateStatus('idle');
      } else {
        setCompanyJobStatus('stopped');
        setCompanyJobId(null);
        setCompanyStatus('idle');
      }
      toast({ title: "Job Stopped", description: "The upload job has been cancelled." });
    } catch (error: any) {
      toast({ title: "Stop Failed", description: error.message, variant: "destructive" });
    }
  };

  // Navigation handlers for the summary modal
  const handleNavigateToData = (entityType: 'candidate' | 'company') => {
    const targetPath = entityType === 'candidate' ? '/recruiting/candidates' : '/recruiting/companies';
    window.location.href = targetPath;
  };

  const handleNavigateToDuplicates = (entityType: 'candidate' | 'company') => {
    setEntityFilter(entityType);
    setDuplicateFilter('pending');
    // Switch to duplicates tab
    const tabElement = document.querySelector('[data-testid="tab-duplicates"]') as HTMLElement;
    tabElement?.click();
  };

  const handleNavigateToHistory = () => {
    // Switch to history tab
    const tabElement = document.querySelector('[data-testid="tab-history"]') as HTMLElement;
    tabElement?.click();
  };

  const candidateUploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch('/api/admin/upload-candidates', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || 'Upload failed');
      }
      
      return await res.json() as UploadResult;
    },
    onSuccess: (result: UploadResult) => {
      // Check if background processing is happening
      if (result.backgroundProcessing && result.jobId) {
        setCandidateJobId(result.jobId);
        setCandidateStatus('processing');
        setCandidateJobStatus('processing');
        toast({
          title: "Processing Started",
          description: `Processing ${result.urlsQueued} URLs in the background. You can monitor progress below.`,
        });
      } else {
        setCandidateStatus('completed');
        setCandidateProgress(100);
        
        // Show comprehensive summary modal instead of simple toast
        setSummaryModal({
          isOpen: true,
          result,
          entityType: 'candidate'
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/duplicates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/upload-history'] });
      
      // Reset form
      setCandidateFiles(null);
      setCandidateUrls("");
    },
    onError: (error: any) => {
      setCandidateStatus('error');
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload candidates",
        variant: "destructive",
      });
    },
  });

  // Fetch duplicates
  const { data: duplicates = [], isLoading: duplicatesLoading, refetch: refetchDuplicates } = useQuery({
    queryKey: ['/api/admin/duplicates', { entity: entityFilter !== 'all' ? entityFilter : undefined, status: duplicateFilter !== 'all' ? duplicateFilter : undefined }],
    queryFn: async ({ queryKey }) => {
      const [url, filters] = queryKey as [string, { entity?: string; status?: string }];
      const params = new URLSearchParams();
      if (filters.entity) params.append('entity', filters.entity);
      if (filters.status) params.append('status', filters.status);
      const queryString = params.toString();
      const fullUrl = queryString ? `${url}?${queryString}` : url;
      
      const response = await fetch(fullUrl, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch duplicates');
      }
      
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch upload history
  const { data: uploadHistory = [], isLoading: historyLoading, refetch: refetchHistory } = useQuery({
    queryKey: ['/api/admin/upload-history', { entityType: historyEntityFilter !== 'all' ? historyEntityFilter : undefined, status: historyStatusFilter !== 'all' ? historyStatusFilter : undefined }],
    queryFn: async ({ queryKey }) => {
      const [url, filters] = queryKey as [string, { entityType?: string; status?: string }];
      const params = new URLSearchParams();
      if (filters.entityType) params.append('entityType', filters.entityType);
      if (filters.status) params.append('status', filters.status);
      const queryString = params.toString();
      const fullUrl = queryString ? `${url}?${queryString}` : url;
      
      const response = await fetch(fullUrl, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch upload history');
      }
      
      return response.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Resolve duplicate mutation
  const resolveDuplicateMutation = useMutation({
    mutationFn: async ({ duplicateId, action, selectedId }: { duplicateId: number; action: string; selectedId?: number }) => {
      const response = await apiRequest(
        'POST',
        `/api/admin/duplicates/${duplicateId}/resolve`,
        { action, selectedId }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/duplicates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
      toast({
        title: "Duplicate Resolved",
        description: "The duplicate has been resolved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Resolution Failed",
        description: error.message || "Failed to resolve duplicate",
        variant: "destructive",
      });
    },
  });

  const companyUploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch('/api/admin/upload-companies', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || 'Upload failed');
      }
      
      return await res.json() as UploadResult;
    },
    onSuccess: (result: UploadResult) => {
      setCompanyStatus('completed');
      setCompanyProgress(100);
      
      // Show comprehensive summary modal instead of simple toast
      setSummaryModal({
        isOpen: true,
        result,
        entityType: 'company'
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/duplicates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/upload-history'] });
      
      // Reset form
      setCompanyFiles(null);
      setCompanyUrls("");
    },
    onError: (error: any) => {
      setCompanyStatus('error');
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload companies",
        variant: "destructive",
      });
    },
  });

  // Quick Add candidate by name mutation
  const quickAddMutation = useMutation({
    mutationFn: async (data: { firstName: string; lastName: string; company: string; jobTitle?: string; linkedinUrl?: string }) => {
      const response = await apiRequest('POST', '/api/admin/add-candidate-by-name', data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Candidate Added",
        description: `Successfully added ${data.candidate.firstName} ${data.candidate.lastName} from ${data.candidate.currentCompany}`,
      });
      
      // Refresh candidates list
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
      
      // Reset form
      setQuickAddFirstName("");
      setQuickAddLastName("");
      setQuickAddCompany("");
      setQuickAddJobTitle("");
      setQuickAddLinkedinUrl("");
    },
    onError: (error: any) => {
      toast({
        title: "Could Not Find Candidate",
        description: error.message || "We couldn't find accessible public profiles for this person. Try using the Candidate Upload tab instead with their LinkedIn URL or CV file.",
        variant: "destructive",
        duration: 8000,
      });
    },
  });

  const handleQuickAdd = () => {
    if (!quickAddFirstName.trim() || !quickAddLastName.trim() || !quickAddCompany.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide first name, last name, and company.",
        variant: "destructive",
      });
      return;
    }
    
    quickAddMutation.mutate({
      firstName: quickAddFirstName.trim(),
      lastName: quickAddLastName.trim(),
      company: quickAddCompany.trim(),
      jobTitle: quickAddJobTitle.trim() || undefined,
      linkedinUrl: quickAddLinkedinUrl.trim() || undefined,
      processingMode: quickAddProcessingMode
    });
  };

  // AI Research mutation
  const researchMutation = useMutation({
    mutationFn: async (data: { query: string; maxResults: number; saveAsCampaign: boolean }) => {
      const response = await apiRequest('POST', '/api/admin/research-companies', {
        query: data.query,
        maxResults: data.maxResults,
        saveAsCampaign: data.saveAsCampaign,
        campaignName: data.saveAsCampaign ? `Research: ${data.query}` : undefined,
        campaignIndustry: 'Unknown'
      });
      return response.json();
    },
    onSuccess: (data) => {
      setResearchResults(data);
      toast({
        title: "Research Complete",
        description: `Found ${data.companies?.length || 0} companies${data.fromCache ? ' (from cache)' : ''}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Research Failed",
        description: error.message || "Failed to research companies. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleStartResearch = () => {
    if (!researchQuery.trim()) {
      toast({
        title: "Missing Query",
        description: "Please enter a research query.",
        variant: "destructive",
      });
      return;
    }
    
    researchMutation.mutate({
      query: researchQuery.trim(),
      maxResults: researchMaxResults,
      saveAsCampaign: researchSaveCampaign === "yes"
    });
  };

  const handleBooleanSearch = async () => {
    if (!booleanSearch.trim()) {
      toast({
        title: "Empty Search",
        description: "Please enter a boolean search query.",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    setBooleanSearchResults([]);

    try {
      const response = await apiRequest('POST', '/api/admin/boolean-search', {
        query: booleanSearch.trim()
      });
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        setBooleanSearchResults(data.results);
        toast({
          title: "Search Complete",
          description: `Found ${data.results.length} candidates. Select one to add.`,
        });
      } else {
        toast({
          title: "No Results",
          description: "No candidates found for this search query. Try different terms.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Search Failed",
        description: error.message || "Failed to search LinkedIn. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectCandidate = async (result: any) => {
    if (!result.linkedinUrl) {
      toast({
        title: "Missing LinkedIn URL",
        description: "This result doesn't have a LinkedIn URL. Cannot add candidate.",
        variant: "destructive",
      });
      return;
    }

    // Extract name from result
    const nameParts = result.name?.split(' ') || ['', ''];
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    const company = result.company || result.title || 'Unknown Company';

    if (!firstName) {
      toast({
        title: "Missing Name",
        description: "Unable to extract name from search result.",
        variant: "destructive",
      });
      return;
    }

    // Use the existing quick add mutation with the selected candidate
    quickAddMutation.mutate({
      firstName,
      lastName: lastName || firstName,  // Use first name as fallback if no last name
      company,
      linkedinUrl: result.linkedinUrl
    });

    // Clear search results after selection
    setBooleanSearchResults([]);
    setBooleanSearch("");
  };

  const handleCandidateUpload = async () => {
    if (!candidateFiles && !candidateUrls.trim()) {
      toast({
        title: "No Data Provided",
        description: "Please select files or provide URLs to upload candidates.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    
    if (candidateFiles) {
      for (let i = 0; i < candidateFiles.length; i++) {
        formData.append('files', candidateFiles[i]);
      }
    }
    
    if (candidateUrls.trim()) {
      formData.append('urls', candidateUrls);
    }
    
    // Add processing mode to control API calls
    formData.append('processingMode', candidateProcessingMode);

    setCandidateStatus('uploading');
    setCandidateProgress(25);
    
    // Simulate progress
    const progressInterval = setInterval(() => {
      setCandidateProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          setCandidateStatus('processing');
          return 90;
        }
        return prev + 10;
      });
    }, 500);

    candidateUploadMutation.mutate(formData);
  };

  const handleCompanyUpload = async () => {
    if (!companyFiles && !companyUrls.trim()) {
      toast({
        title: "No Data Provided",
        description: "Please select files or provide URLs to upload companies.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    
    if (companyFiles) {
      for (let i = 0; i < companyFiles.length; i++) {
        formData.append('files', companyFiles[i]);
      }
    }
    
    if (companyUrls.trim()) {
      formData.append('urls', companyUrls);
    }

    setCompanyStatus('uploading');
    setCompanyProgress(25);
    
    // Simulate progress
    const progressInterval = setInterval(() => {
      setCompanyProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          setCompanyStatus('processing');
          return 90;
        }
        return prev + 10;
      });
    }, 500);

    companyUploadMutation.mutate(formData);
  };

  const handleResolveDuplicate = (duplicateId: number, action: string, selectedId?: number) => {
    resolveDuplicateMutation.mutate({ duplicateId, action, selectedId });
  };

  const formatMatchScore = (score: number) => {
    return `${Math.round(score)}%`;
  };

  const getEntityIcon = (entityType: string) => {
    return entityType === 'candidate' ? <Users className="h-4 w-4" /> : <Building2 className="h-4 w-4" />;
  };

  const renderFieldValue = (field: string, value: any, entityType: 'candidate' | 'company') => {
    if (!value) return <span className="text-muted-foreground">-</span>;
    
    if (Array.isArray(value)) {
      return (
        <div className="flex flex-wrap gap-1">
          {value.slice(0, 3).map((item, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              {item}
            </Badge>
          ))}
          {value.length > 3 && <span className="text-xs text-muted-foreground">+{value.length - 3}</span>}
        </div>
      );
    }

    if (field === 'email' && entityType === 'candidate') {
      return (
        <div className="flex items-center gap-1">
          <Mail className="h-3 w-3" />
          <span className="text-sm">{value}</span>
        </div>
      );
    }

    if (field === 'location') {
      return (
        <div className="flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          <span className="text-sm">{value}</span>
        </div>
      );
    }

    if (field === 'currentTitle' && entityType === 'candidate') {
      return (
        <div className="flex items-center gap-1">
          <Briefcase className="h-3 w-3" />
          <span className="text-sm">{value}</span>
        </div>
      );
    }

    return <span className="text-sm">{String(value).substring(0, 50)}{String(value).length > 50 ? '...' : ''}</span>;
  };

  const getStatusIcon = (status: UploadStatus) => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Upload className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: UploadStatus) => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100";
      case 'completed':
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
      case 'error':
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100";
    }
  };

  return (
    <div className="space-y-6 p-6" data-testid="admin-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Database className="h-8 w-8 text-primary" />
            </div>
            Admin Portal
          </h1>
          <p className="text-muted-foreground">
            Bulk upload and manage candidate and company data with AI-powered parsing
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            <Zap className="h-3 w-3 mr-1" />
            AI-Powered
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="quick-add" className="space-y-6">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="quick-add" data-testid="tab-quick-add">
            <UserPlus className="h-4 w-4 mr-2" />
            Quick Add
          </TabsTrigger>
          <TabsTrigger value="candidates" data-testid="tab-candidates">
            <Users className="h-4 w-4 mr-2" />
            Candidate Upload
          </TabsTrigger>
          <TabsTrigger value="companies" data-testid="tab-companies">
            <Building2 className="h-4 w-4 mr-2" />
            Company Upload
          </TabsTrigger>
          <TabsTrigger value="research" data-testid="tab-research">
            <Search className="h-4 w-4 mr-2" />
            AI Research
          </TabsTrigger>
          <TabsTrigger value="promises" data-testid="tab-promises">
            <Zap className="h-4 w-4 mr-2" />
            AI Promises
          </TabsTrigger>
          <TabsTrigger value="duplicates" data-testid="tab-duplicates">
            <AlertCircle className="h-4 w-4 mr-2" />
            Duplicate Review
          </TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">
            <FileText className="h-4 w-4 mr-2" />
            Upload History
          </TabsTrigger>
          <TabsTrigger value="data-quality" data-testid="tab-data-quality">
            <Shield className="h-4 w-4 mr-2" />
            Data Quality
          </TabsTrigger>
        </TabsList>

        {/* Quick Add Tab Content */}
        <TabsContent value="quick-add" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Quick Add Candidate
              </CardTitle>
              <CardDescription>
                Add a candidate by name and company. If you provide a LinkedIn URL, we'll use it directly. Otherwise, our system will search for their LinkedIn profile automatically. The system stores only real data - no AI-generated biographies.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="max-w-xl space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="quick-add-first-name">
                    First Name
                  </Label>
                  <Input
                    id="quick-add-first-name"
                    placeholder="e.g., John"
                    value={quickAddFirstName}
                    onChange={(e) => setQuickAddFirstName(e.target.value)}
                    disabled={quickAddMutation.isPending}
                    data-testid="input-quick-add-first-name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quick-add-last-name">
                    Last Name
                  </Label>
                  <Input
                    id="quick-add-last-name"
                    placeholder="e.g., Smith"
                    value={quickAddLastName}
                    onChange={(e) => setQuickAddLastName(e.target.value)}
                    disabled={quickAddMutation.isPending}
                    data-testid="input-quick-add-last-name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quick-add-company">
                    Company Name
                  </Label>
                  <Input
                    id="quick-add-company"
                    placeholder="e.g., Bain Capital, Microsoft, Digital China"
                    value={quickAddCompany}
                    onChange={(e) => setQuickAddCompany(e.target.value)}
                    disabled={quickAddMutation.isPending}
                    data-testid="input-quick-add-company"
                  />
                  <p className="text-xs text-muted-foreground">
                    Can be current OR previous employer - used for email inference
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quick-add-job-title">
                    Job Title <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="quick-add-job-title"
                    placeholder="e.g., Managing Director, CFO, Senior Engineer"
                    value={quickAddJobTitle}
                    onChange={(e) => setQuickAddJobTitle(e.target.value)}
                    disabled={quickAddMutation.isPending}
                    data-testid="input-quick-add-job-title"
                  />
                  <p className="text-xs text-muted-foreground">
                    Improves search accuracy for common names
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quick-add-linkedin-url">
                    LinkedIn URL <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="quick-add-linkedin-url"
                    placeholder="e.g., https://linkedin.com/in/john-smith"
                    value={quickAddLinkedinUrl}
                    onChange={(e) => setQuickAddLinkedinUrl(e.target.value)}
                    disabled={quickAddMutation.isPending}
                    data-testid="input-quick-add-linkedin-url"
                  />
                  <p className="text-xs text-muted-foreground">
                    Paste the LinkedIn profile URL if you already have it - skips automatic search
                  </p>
                </div>

                {/* Processing Mode Selection for Quick Add */}
                <div className="space-y-2">
                  <Label htmlFor="quick-add-processing-mode">
                    Processing Mode
                  </Label>
                  <Select 
                    value={quickAddProcessingMode} 
                    onValueChange={(value) => setQuickAddProcessingMode(value as 'full' | 'career_only' | 'bio_only' | 'data_only')}
                    disabled={quickAddMutation.isPending}
                  >
                    <SelectTrigger id="quick-add-processing-mode" data-testid="select-quick-add-processing-mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Full Processing (Career + Bio)</SelectItem>
                      <SelectItem value="career_only">Career Only</SelectItem>
                      <SelectItem value="bio_only">Bio Only</SelectItem>
                      <SelectItem value="data_only">Data Only (Free)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {quickAddProcessingMode === 'data_only' && '💰 Free - Store profile without API calls'}
                    {quickAddProcessingMode === 'career_only' && '📊 Medium cost - Career mapping only'}
                    {quickAddProcessingMode === 'bio_only' && '📝 Medium cost - Biography only'}
                    {quickAddProcessingMode === 'full' && '🎯 High cost - Full profile with career & bio'}
                  </p>
                </div>

                <Button
                  onClick={handleQuickAdd}
                  disabled={quickAddMutation.isPending || !quickAddFirstName.trim() || !quickAddLastName.trim() || !quickAddCompany.trim()}
                  className="w-full"
                  data-testid="button-quick-add-submit"
                >
                  {quickAddMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Finding Profile & Generating Biography...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add Candidate
                    </>
                  )}
                </Button>
              </div>

              {/* Separator */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or use boolean search
                  </span>
                </div>
              </div>

              {/* Boolean Search */}
              <div className="max-w-2xl space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="boolean-search">
                    Boolean Search Query
                  </Label>
                  <Textarea
                    id="boolean-search"
                    placeholder='e.g., "software engineer" AND Python AND (Google OR Microsoft) site:linkedin.com/in'
                    value={booleanSearch}
                    onChange={(e) => setBooleanSearch(e.target.value)}
                    disabled={isSearching}
                    rows={3}
                    data-testid="input-boolean-search"
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use boolean operators (AND, OR, NOT) and LinkedIn site filters to find specific candidates. Results will appear below for selection.
                  </p>
                </div>

                <Button
                  onClick={handleBooleanSearch}
                  disabled={isSearching || !booleanSearch.trim()}
                  className="w-full"
                  data-testid="button-boolean-search"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Searching LinkedIn...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Search LinkedIn
                    </>
                  )}
                </Button>

                {/* Search Results */}
                {booleanSearchResults.length > 0 && (
                  <div className="space-y-3 pt-4 border-t">
                    <h3 className="font-semibold text-sm">
                      Select Candidate to Add ({booleanSearchResults.length} results)
                    </h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {booleanSearchResults.map((result, index) => (
                        <Card 
                          key={index}
                          className="hover-elevate cursor-pointer"
                          onClick={() => handleSelectCandidate(result)}
                          data-testid={`search-result-${index}`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 space-y-1">
                                <h4 className="font-semibold">{result.name || 'Name not found'}</h4>
                                {result.title && (
                                  <p className="text-sm text-muted-foreground">{result.title}</p>
                                )}
                                {result.company && (
                                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                                    <Building2 className="h-3 w-3" />
                                    {result.company}
                                  </p>
                                )}
                                {result.linkedinUrl && (
                                  <p className="text-xs text-blue-600 dark:text-blue-400 font-mono truncate">
                                    {result.linkedinUrl}
                                  </p>
                                )}
                              </div>
                              <Button size="sm" variant="default">
                                Add
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* How It Works */}
              <div className="bg-muted/50 rounded-lg p-4 text-sm">
                <p className="text-muted-foreground">
                  <strong>How it works:</strong> Just provide the candidate's name and company. Our system will automatically search for their LinkedIn profile, extract their professional information, infer their email, and generate a comprehensive biography - all in seconds.
                </p>
              </div>

              {/* Information Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                        <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">AI-Powered Search</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          Automatically finds LinkedIn profiles and bio pages
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                        <FileText className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">Biography Generation</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          Creates comprehensive professional biographies
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                        <CheckCircle className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">Instant Addition</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          Candidate ready in your system immediately
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="candidates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Bulk Candidate Upload
              </CardTitle>
              <CardDescription>
                Upload CVs, resumes, or provide LinkedIn/bio URLs. Our AI will automatically parse and extract candidate information.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* File Upload */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="candidateFiles" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Upload CV/Resume Files
                    </Label>
                    <Input
                      id="candidateFiles"
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.html"
                      onChange={(e) => setCandidateFiles(e.target.files)}
                      disabled={candidateStatus === 'uploading' || candidateStatus === 'processing'}
                      data-testid="input-candidate-files"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Supports: PDF, DOC, DOCX, TXT, CSV, XLS, XLSX, HTML files
                    </p>
                  </div>
                  
                  {candidateFiles && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Selected Files:</p>
                      {Array.from(candidateFiles).map((file, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <FileText className="h-3 w-3" />
                          <span>{file.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* URL Input */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="candidateUrls" className="flex items-center gap-2">
                      <Link className="h-4 w-4" />
                      LinkedIn URLs or Bio Links
                    </Label>
                    <Textarea
                      id="candidateUrls"
                      placeholder="https://linkedin.com/in/johndoe&#10;https://linkedin.com/in/janedoe&#10;https://example.com/bio/candidate1&#10;&#10;One URL per line"
                      value={candidateUrls}
                      onChange={(e) => setCandidateUrls(e.target.value)}
                      rows={8}
                      disabled={candidateStatus === 'uploading' || candidateStatus === 'processing'}
                      data-testid="textarea-candidate-urls"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      One URL per line. LinkedIn profiles, personal websites, or bio pages.
                    </p>
                  </div>
                </div>
              </div>

              {/* Processing Mode Selection */}
              <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="processingMode" className="text-base font-semibold">
                    Processing Mode
                  </Label>
                  <Select 
                    value={candidateProcessingMode} 
                    onValueChange={(value) => setCandidateProcessingMode(value as 'full' | 'career_only' | 'bio_only' | 'data_only')}
                    disabled={candidateStatus === 'uploading' || candidateStatus === 'processing'}
                  >
                    <SelectTrigger id="processingMode" data-testid="select-processing-mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">
                        <div className="flex flex-col items-start">
                          <span className="font-semibold">Full Processing</span>
                          <span className="text-xs text-muted-foreground">Career + Biography (SerpAPI + Bright Data + Grok)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="career_only">
                        <div className="flex flex-col items-start">
                          <span className="font-semibold">Career Only</span>
                          <span className="text-xs text-muted-foreground">Just career history (SerpAPI + Bright Data)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="bio_only">
                        <div className="flex flex-col items-start">
                          <span className="font-semibold">Bio Only</span>
                          <span className="text-xs text-muted-foreground">Just biography (Bright Data + Grok)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="data_only">
                        <div className="flex flex-col items-start">
                          <span className="font-semibold">Data Only (Free)</span>
                          <span className="text-xs text-muted-foreground">Store URLs without processing</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {candidateProcessingMode === 'data_only' && '💰 Free: Perfect for bulk upload. Process later when needed.'}
                    {candidateProcessingMode === 'career_only' && '📊 Medium cost: Quick career mapping without biography.'}
                    {candidateProcessingMode === 'bio_only' && '📝 Medium cost: Executive summaries without full career data.'}
                    {candidateProcessingMode === 'full' && '🎯 High cost: Complete profiles with career history and AI-generated biographies.'}
                  </p>
                </div>

                {/* Cost Breakdown */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">SerpAPI:</span>
                      <Badge variant={candidateProcessingMode === 'data_only' || candidateProcessingMode === 'bio_only' ? 'outline' : 'default'} className="text-xs">
                        {candidateProcessingMode === 'data_only' || candidateProcessingMode === 'bio_only' ? 'Skip' : 'Yes'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Bright Data:</span>
                      <Badge variant={candidateProcessingMode === 'data_only' ? 'outline' : 'default'} className="text-xs">
                        {candidateProcessingMode === 'data_only' ? 'Skip' : 'Yes'}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">AI Biography:</span>
                      <Badge variant={candidateProcessingMode === 'career_only' || candidateProcessingMode === 'data_only' ? 'outline' : 'default'} className="text-xs">
                        {candidateProcessingMode === 'career_only' || candidateProcessingMode === 'data_only' ? 'Skip' : 'Yes'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Cost Level:</span>
                      <Badge variant={candidateProcessingMode === 'data_only' ? 'secondary' : 'default'}>
                        {candidateProcessingMode === 'data_only' && 'Free'}
                        {candidateProcessingMode === 'career_only' && 'Medium'}
                        {candidateProcessingMode === 'bio_only' && 'Medium'}
                        {candidateProcessingMode === 'full' && 'High'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Upload Status */}
              {candidateStatus !== 'idle' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(candidateStatus)}
                      <span className="font-medium">
                        {candidateStatus === 'uploading' && 'Uploading files...'}
                        {candidateStatus === 'processing' && 'AI processing candidates...'}
                        {candidateStatus === 'completed' && 'Upload completed successfully'}
                        {candidateStatus === 'error' && 'Upload failed'}
                      </span>
                      <Badge variant="secondary" className={getStatusColor(candidateStatus)}>
                        {candidateStatus}
                      </Badge>
                    </div>
                  </div>
                  <Progress value={candidateProgress} className="w-full" />
                </div>
              )}

              <Button
                onClick={handleCandidateUpload}
                disabled={candidateStatus === 'uploading' || candidateStatus === 'processing'}
                className="w-full"
                data-testid="button-upload-candidates"
              >
                {candidateStatus === 'uploading' || candidateStatus === 'processing' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {candidateStatus === 'uploading' ? 'Uploading...' : 'AI Processing...'}
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload & Process Candidates
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="companies" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Bulk Company Intelligence Upload
              </CardTitle>
              <CardDescription>
                Upload 1000+ company websites to build the AI intelligence system. System will auto-categorize, discover team members, and learn hiring patterns.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* CSV Format Guide */}
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="font-semibold text-sm flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  📋 CSV Format for Bulk Upload
                </h3>
                <p className="text-xs text-muted-foreground mb-3">
                  For uploading 1000+ companies, use a CSV file with the following format:
                </p>
                <div className="bg-white dark:bg-gray-900 rounded border p-3 font-mono text-xs">
                  <div className="text-muted-foreground">company_name,website_url,industry_hint</div>
                  <div>PAG,https://www.pagasia.com,Private Equity</div>
                  <div>Blackstone,https://www.blackstone.com,Private Equity</div>
                  <div>Goldman Sachs,https://www.goldmansachs.com,Investment Banking</div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  <strong>What the AI will do:</strong> Visit each website → Extract company data → Auto-categorize (industry, stage, funding, geography, size) → Discover team members (CEO, CFO, executives) → Build organization charts → Learn hiring patterns
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* File Upload */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="companyFiles" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Upload Company Documents
                    </Label>
                    <Input
                      id="companyFiles"
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.html"
                      onChange={(e) => setCompanyFiles(e.target.files)}
                      disabled={companyStatus === 'uploading' || companyStatus === 'processing'}
                      data-testid="input-company-files"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Supports: PDF, DOC, DOCX, TXT, CSV, XLS, XLSX, HTML files
                    </p>
                  </div>
                  
                  {companyFiles && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Selected Files:</p>
                      {Array.from(companyFiles).map((file, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <FileText className="h-3 w-3" />
                          <span>{file.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* URL Input */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="companyUrls" className="flex items-center gap-2">
                      <Link className="h-4 w-4" />
                      Company Website URLs
                    </Label>
                    <Textarea
                      id="companyUrls"
                      placeholder="https://techcorp.com&#10;https://company.com/about&#10;https://startup.com/team&#10;&#10;One URL per line"
                      value={companyUrls}
                      onChange={(e) => setCompanyUrls(e.target.value)}
                      rows={8}
                      disabled={companyStatus === 'uploading' || companyStatus === 'processing'}
                      data-testid="textarea-company-urls"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Company websites, about pages, or LinkedIn company pages.
                    </p>
                  </div>
                </div>
              </div>

              {/* Upload Status */}
              {companyStatus !== 'idle' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(companyStatus)}
                      <span className="font-medium">
                        {companyStatus === 'uploading' && 'Uploading files...'}
                        {companyStatus === 'processing' && 'AI processing companies...'}
                        {companyStatus === 'completed' && 'Upload completed successfully'}
                        {companyStatus === 'error' && 'Upload failed'}
                      </span>
                      <Badge variant="secondary" className={getStatusColor(companyStatus)}>
                        {companyStatus}
                      </Badge>
                    </div>
                  </div>
                  <Progress value={companyProgress} className="w-full" />
                </div>
              )}

              <Button
                onClick={handleCompanyUpload}
                disabled={companyStatus === 'uploading' || companyStatus === 'processing'}
                className="w-full"
                data-testid="button-upload-companies"
              >
                {companyStatus === 'uploading' || companyStatus === 'processing' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {companyStatus === 'uploading' ? 'Uploading...' : 'AI Processing...'}
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload & Process Companies
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Research Tab Content */}
        <TabsContent value="research" className="space-y-6">
          {/* Company Employee Research */}
          <CompanyResearch />
          
          {/* Broad Company Discovery */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                AI Company Research Engine
              </CardTitle>
              <CardDescription>
                Use natural language to discover companies systematically. Example: "Find top 100 private equity firms globally" or "List major venture capital funds in US healthcare"
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="max-w-2xl space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="research-query">
                    Research Query
                  </Label>
                  <Textarea
                    id="research-query"
                    placeholder="E.g., Find top 50 investment banks in Asia&#10;E.g., List major private equity firms focused on infrastructure&#10;E.g., Top 100 venture capital funds globally"
                    className="min-h-[100px] resize-none"
                    value={researchQuery}
                    onChange={(e) => setResearchQuery(e.target.value)}
                    disabled={researchMutation.isPending}
                    data-testid="input-research-query"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="max-results">
                      Maximum Results
                    </Label>
                    <Input
                      id="max-results"
                      type="number"
                      value={researchMaxResults}
                      onChange={(e) => setResearchMaxResults(parseInt(e.target.value) || 50)}
                      min={10}
                      max={200}
                      disabled={researchMutation.isPending}
                      data-testid="input-max-results"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="save-campaign">
                      Save as Campaign
                    </Label>
                    <Select 
                      value={researchSaveCampaign} 
                      onValueChange={setResearchSaveCampaign}
                      disabled={researchMutation.isPending}
                    >
                      <SelectTrigger id="save-campaign" data-testid="select-save-campaign">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no">No, just research</SelectItem>
                        <SelectItem value="yes">Yes, track progress</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  onClick={handleStartResearch}
                  disabled={researchMutation.isPending}
                  className="w-full"
                  data-testid="button-start-research"
                >
                  {researchMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Researching...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Start AI Research
                    </>
                  )}
                </Button>
              </div>

              {/* Results Section */}
              <div className="mt-8 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Research Results</h3>
                  {researchResults && (
                    <div className="flex items-center gap-2">
                      {researchResults.fromCache && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          <Database className="h-3 w-3 mr-1" />
                          Cached
                        </Badge>
                      )}
                      <Badge variant="secondary">
                        {researchResults.companies?.length || 0} Companies
                      </Badge>
                    </div>
                  )}
                </div>
                
                {!researchResults ? (
                  <div className="p-8 border rounded-lg text-center text-muted-foreground">
                    <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">No research results yet</p>
                    <p className="text-sm">Enter a query above and click "Start AI Research" to begin</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Metadata Summary */}
                    <div className="grid grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <p className="text-2xl font-bold">{researchResults.companies?.length || 0}</p>
                            <p className="text-sm text-muted-foreground">Companies Found</p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <p className="text-2xl font-bold">{researchResults.searchQueries?.length || 0}</p>
                            <p className="text-sm text-muted-foreground">Search Queries</p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <p className="text-2xl font-bold">{((researchResults.metadata?.queryExecutionTime || 0) / 1000).toFixed(1)}s</p>
                            <p className="text-sm text-muted-foreground">Execution Time</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Selection Actions */}
                    <div className="flex items-center justify-between gap-4 p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="select-all-companies"
                          checked={selectedCompanies.length === researchResults.companies?.length && selectedCompanies.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedCompanies(researchResults.companies?.map((_: any, idx: number) => idx) || []);
                            } else {
                              setSelectedCompanies([]);
                            }
                          }}
                          data-testid="checkbox-select-all-companies"
                        />
                        <label htmlFor="select-all-companies" className="text-sm font-medium cursor-pointer">
                          Select All ({selectedCompanies.length} selected)
                        </label>
                      </div>
                      <Button
                        onClick={async () => {
                          const selected = selectedCompanies.map(idx => researchResults.companies[idx]);
                          console.log('Adding companies to system:', selected);
                          
                          try {
                            const response = await apiRequest('POST', '/api/admin/bulk-import-companies', { companies: selected });
                            
                            toast({
                              title: "Companies Added Successfully",
                              description: `${selected.length} companies added to the system. Background processing started.`,
                            });
                            
                            setSelectedCompanies([]);
                            queryClient.invalidateQueries({ queryKey: ['/api/admin/upload-history'] });
                          } catch (error) {
                            toast({
                              title: "Error Adding Companies",
                              description: error instanceof Error ? error.message : "Failed to add companies",
                              variant: "destructive",
                            });
                          }
                        }}
                        disabled={selectedCompanies.length === 0}
                        data-testid="button-add-selected-companies"
                      >
                        <Database className="h-4 w-4 mr-2" />
                        Add Selected to System ({selectedCompanies.length})
                      </Button>
                    </div>

                    {/* Company Results Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {researchResults.companies?.map((company: any, idx: number) => (
                        <Card key={idx} className="hover-elevate">
                          <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                              <Checkbox
                                checked={selectedCompanies.includes(idx)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedCompanies([...selectedCompanies, idx]);
                                  } else {
                                    setSelectedCompanies(selectedCompanies.filter(i => i !== idx));
                                  }
                                }}
                                data-testid={`checkbox-company-${idx}`}
                              />
                              <span className="truncate flex-1">{company.companyName}</span>
                              <Badge variant="outline" className="ml-2">
                                {(company.confidence * 100).toFixed(0)}%
                              </Badge>
                            </CardTitle>
                            {company.description && (
                              <CardDescription className="line-clamp-2">
                                {company.description}
                              </CardDescription>
                            )}
                          </CardHeader>
                          <CardContent className="space-y-2">
                            {company.website && (
                              <div className="flex items-center gap-2 text-sm">
                                <Link className="h-3 w-3 text-muted-foreground" />
                                <a 
                                  href={company.website} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline truncate"
                                >
                                  {company.website}
                                </a>
                              </div>
                            )}
                            {company.linkedinUrl && (
                              <div className="flex items-center gap-2 text-sm">
                                <Building2 className="h-3 w-3 text-muted-foreground" />
                                <a 
                                  href={company.linkedinUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline truncate"
                                >
                                  LinkedIn
                                </a>
                              </div>
                            )}
                            {company.sources && company.sources.length > 0 && (
                              <div className="text-xs text-muted-foreground">
                                Found in {company.sources.length} source{company.sources.length > 1 ? 's' : ''}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Promises Tab Content */}
        <TabsContent value="promises" className="space-y-6">
          <PromiseStatus />
        </TabsContent>

        <TabsContent value="duplicates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Duplicate Review Queue
              </CardTitle>
              <CardDescription>
                Review and resolve detected duplicates from data ingestion. Choose to merge records, create as new, or skip.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Filters */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="status-filter">Status:</Label>
                  <Select value={duplicateFilter} onValueChange={setDuplicateFilter}>
                    <SelectTrigger className="w-32" data-testid="select-status-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center gap-2">
                  <Label htmlFor="entity-filter">Entity:</Label>
                  <Select value={entityFilter} onValueChange={setEntityFilter}>
                    <SelectTrigger className="w-32" data-testid="select-entity-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="candidate">Candidates</SelectItem>
                      <SelectItem value="company">Companies</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button variant="outline" onClick={() => refetchDuplicates()} disabled={duplicatesLoading} data-testid="button-refresh-duplicates">
                  <Loader2 className={`h-4 w-4 mr-2 ${duplicatesLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>

              {/* Duplicates List */}
              {duplicatesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Loading duplicates...</span>
                </div>
              ) : duplicates.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-600 mb-4" />
                  <h3 className="text-lg font-semibold">No Duplicates Found</h3>
                  <p className="text-muted-foreground">All duplicates have been resolved or no duplicates were detected.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {duplicates.map((duplicate: DuplicateDetection) => (
                    <Card key={duplicate.id} className="border-l-4 border-l-orange-500">
                      <CardHeader className="pb-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                              {getEntityIcon(duplicate.entityType)}
                            </div>
                            <div>
                              <CardTitle className="text-lg flex items-center gap-2">
                                {duplicate.entityType === 'candidate' ? 'Candidate' : 'Company'} Duplicate
                                <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100">
                                  {duplicate.status}
                                </Badge>
                              </CardTitle>
                              <CardDescription>
                                Detected {new Date(duplicate.createdAt).toLocaleDateString()} • 
                                Match Score: {formatMatchScore(duplicate.matchScore || 0)}
                              </CardDescription>
                            </div>
                          </div>
                          
                          {duplicate.status === 'pending' && (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleResolveDuplicate(duplicate.id, 'skip')}
                                disabled={resolveDuplicateMutation.isPending}
                                data-testid={`button-skip-${duplicate.id}`}
                              >
                                <X className="h-3 w-3 mr-1" />
                                Skip
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleResolveDuplicate(duplicate.id, 'create_new')}
                                disabled={resolveDuplicateMutation.isPending}
                                data-testid={`button-create-new-${duplicate.id}`}
                              >
                                <UserPlus className="h-3 w-3 mr-1" />
                                Create New
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      
                      <CardContent className="space-y-4">
                        {/* New Record Data */}
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <Star className="h-4 w-4 text-blue-600" />
                            New Record Data
                          </h4>
                          <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                              {Object.entries(duplicate.newRecordData)
                                .filter(([key, value]) => value != null && value !== '')
                                .slice(0, 6)
                                .map(([field, value]) => (
                                <div key={field}>
                                  <div className="text-xs font-medium text-muted-foreground uppercase">{field}</div>
                                  {renderFieldValue(field, value, duplicate.entityType)}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Existing Match */}
                        <div>
                          <h4 className="font-medium mb-2">Potential Match</h4>
                          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border hover-elevate">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  Match: {formatMatchScore(duplicate.matchScore)}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  ID: {duplicate.existingRecordId}
                                </Badge>
                              </div>
                              
                              {duplicate.status === 'pending' && (
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => handleResolveDuplicate(duplicate.id, 'merge', duplicate.existingRecordId)}
                                  disabled={resolveDuplicateMutation.isPending}
                                  data-testid={`button-merge-${duplicate.id}-${duplicate.existingRecordId}`}
                                >
                                  <GitMerge className="h-3 w-3 mr-1" />
                                  Merge With This
                                </Button>
                              )}
                            </div>
                            
                            <div className="text-sm text-muted-foreground">
                              Existing {duplicate.entityType} record (ID: {duplicate.existingRecordId})
                            </div>

                            {/* Matched Fields Indicator */}
                            {duplicate.matchedFields && duplicate.matchedFields.length > 0 && (
                              <div className="mt-3 pt-3 border-t">
                                <div className="text-xs text-muted-foreground mb-1">Matched Fields:</div>
                                <div className="flex flex-wrap gap-1">
                                  {duplicate.matchedFields.map((field, idx) => (
                                    <Badge key={idx} variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                                      {field}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {duplicate.status === 'resolved' && duplicate.resolution && (
                          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-sm text-green-800 dark:text-green-200">
                              Resolved: {duplicate.resolution === 'merge' ? 'Merged with existing record' : 
                                       duplicate.resolution === 'create_new' ? 'Created as new record' : 'Skipped'}
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Upload History
              </CardTitle>
              <CardDescription>
                Track and monitor all bulk upload operations with detailed processing statistics.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Filters */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="history-entity-filter">Entity:</Label>
                  <Select value={historyEntityFilter} onValueChange={setHistoryEntityFilter}>
                    <SelectTrigger className="w-32" data-testid="select-history-entity-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="candidate">Candidates</SelectItem>
                      <SelectItem value="company">Companies</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="history-status-filter">Status:</Label>
                  <Select value={historyStatusFilter} onValueChange={setHistoryStatusFilter}>
                    <SelectTrigger className="w-32" data-testid="select-history-status-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="reviewing">Reviewing</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Upload History List */}
              {historyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : uploadHistory.length === 0 ? (
                <div className="text-center py-8">
                  <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No upload history found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {uploadHistory.map((job: UploadHistoryJob) => (
                    <Card key={job.id} className="hover-elevate">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-3 flex-1">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${
                                job.entityType === 'candidate' 
                                  ? 'bg-blue-50 dark:bg-blue-950' 
                                  : 'bg-purple-50 dark:bg-purple-950'
                              }`}>
                                {job.entityType === 'candidate' ? (
                                  <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                ) : (
                                  <Building2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                )}
                              </div>
                              <div>
                                <h3 className="font-medium">{job.fileName}</h3>
                                <p className="text-sm text-muted-foreground capitalize">
                                  {job.entityType} • {job.fileType.toUpperCase()}
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                              <div className="text-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                <div className="text-2xl font-bold text-blue-600">{job.totalRecords}</div>
                                <div className="text-xs text-muted-foreground">Total</div>
                              </div>
                              <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                                <div className="text-2xl font-bold text-green-600">{job.successfulRecords}</div>
                                <div className="text-xs text-muted-foreground">Success</div>
                              </div>
                              <div className="text-center p-3 bg-amber-50 dark:bg-amber-950 rounded-lg">
                                <div className="text-2xl font-bold text-amber-600">{job.duplicateRecords}</div>
                                <div className="text-xs text-muted-foreground">Duplicates</div>
                              </div>
                              <div className="text-center p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                                <div className="text-2xl font-bold text-red-600">{job.errorRecords}</div>
                                <div className="text-xs text-muted-foreground">Errors</div>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>Uploaded: {new Date(job.createdAt).toLocaleString()}</span>
                              <span>By: {job.uploadedById ? `User ${job.uploadedById}` : 'System'}</span>
                              {job.completedAt && (
                                <span>Completed: {new Date(job.completedAt).toLocaleString()}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <Badge 
                              variant={
                                job.status === 'completed' ? 'default' :
                                job.status === 'processing' ? 'secondary' :
                                job.status === 'reviewing' ? 'secondary' : 'destructive'
                              }
                              className={
                                job.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200' :
                                job.status === 'processing' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200' :
                                job.status === 'reviewing' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200' : ''
                              }
                            >
                              {job.status === 'processing' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                              {job.status === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                              {job.status === 'reviewing' && <AlertCircle className="h-3 w-3 mr-1" />}
                              {job.status === 'failed' && <X className="h-3 w-3 mr-1" />}
                              {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                            </Badge>

                            {job.duplicateRecords > 0 && job.status === 'reviewing' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  // Switch to duplicates tab and filter by this job
                                  setEntityFilter(job.entityType);
                                  setDuplicateFilter('pending');
                                  (document.querySelector('[data-testid="tab-duplicates"]') as HTMLElement)?.click();
                                }}
                                data-testid={`button-review-duplicates-${job.id}`}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                Review {job.duplicateRecords} Duplicates
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Quality Tab Content */}
        <TabsContent value="data-quality" className="space-y-6">
          <DataQualityTabContent />
        </TabsContent>
      </Tabs>

      {/* Info Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            AI Processing Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Candidate Data Extraction</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Name and contact information</li>
                <li>• Current job title and company</li>
                <li>• Skills and technologies</li>
                <li>• Years of experience</li>
                <li>• Education background</li>
                <li>• Salary expectations (when available)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Company Data Extraction</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Company name and location</li>
                <li>• Industry and business sector</li>
                <li>• Company size and stage</li>
                <li>• Business description</li>
                <li>• Technologies used</li>
                <li>• Recent news and updates</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Summary Modal */}
      <UploadSummaryModal
        isOpen={summaryModal.isOpen}
        onClose={() => setSummaryModal(prev => ({ ...prev, isOpen: false }))}
        result={summaryModal.result}
        entityType={summaryModal.entityType}
        onNavigateToData={() => handleNavigateToData(summaryModal.entityType)}
        onNavigateToDuplicates={() => handleNavigateToDuplicates(summaryModal.entityType)}
        onNavigateToHistory={handleNavigateToHistory}
      />
    </div>
  );
}