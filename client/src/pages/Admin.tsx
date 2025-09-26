import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  Star
} from "lucide-react";

type UploadStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'error';

interface UploadResult {
  success: number;
  duplicates?: number;
  failed: number;
  total: number;
  message?: string;
  errors: string[];
}

interface DuplicateDetection {
  id: number;
  entityType: 'candidate' | 'company';
  newRecordData: any;
  existingRecords: any[];
  matchedFields: string[];
  matchScores: number[];
  status: 'pending' | 'resolved';
  resolution?: 'merge' | 'create_new' | 'skip';
  ingestionJobId?: number;
  createdAt: string;
}

interface ResolveAction {
  action: 'merge' | 'create_new' | 'skip';
  selectedId?: number;
}

export default function Admin() {
  const [candidateFiles, setCandidateFiles] = useState<FileList | null>(null);
  const [candidateUrls, setCandidateUrls] = useState("");
  const [companyFiles, setCompanyFiles] = useState<FileList | null>(null);
  const [companyUrls, setCompanyUrls] = useState("");
  const [candidateStatus, setCandidateStatus] = useState<UploadStatus>('idle');
  const [companyStatus, setCompanyStatus] = useState<UploadStatus>('idle');
  const [candidateProgress, setCandidateProgress] = useState(0);
  const [companyProgress, setCompanyProgress] = useState(0);
  const [duplicateFilter, setDuplicateFilter] = useState<string>('pending');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
      setCandidateStatus('completed');
      setCandidateProgress(100);
      toast({
        title: "Candidates Uploaded Successfully",
        description: result.message || `${result.success} candidates processed successfully. ${result.failed} failed. ${result.duplicates || 0} duplicates detected.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/duplicates'] });
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

  // Resolve duplicate mutation
  const resolveDuplicateMutation = useMutation({
    mutationFn: async ({ duplicateId, action, selectedId }: { duplicateId: number; action: string; selectedId?: number }) => {
      return await apiRequest(`/api/admin/duplicates/${duplicateId}/resolve`, {
        method: 'POST',
        body: { action, selectedId },
      });
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
      toast({
        title: "Companies Uploaded Successfully",
        description: result.message || `${result.success} companies processed successfully. ${result.failed} failed. ${result.duplicates || 0} duplicates detected.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/duplicates'] });
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

      <Tabs defaultValue="candidates" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="candidates" data-testid="tab-candidates">
            <Users className="h-4 w-4 mr-2" />
            Candidate Upload
          </TabsTrigger>
          <TabsTrigger value="companies" data-testid="tab-companies">
            <Building2 className="h-4 w-4 mr-2" />
            Company Upload
          </TabsTrigger>
          <TabsTrigger value="duplicates" data-testid="tab-duplicates">
            <AlertCircle className="h-4 w-4 mr-2" />
            Duplicate Review
          </TabsTrigger>
        </TabsList>

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
                Bulk Company Upload
              </CardTitle>
              <CardDescription>
                Upload company documents or provide website URLs. Our AI will automatically extract company information and profiles.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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
                                Match Score: {formatMatchScore(Math.max(...duplicate.matchScores))}
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

                        {/* Existing Matches */}
                        <div>
                          <h4 className="font-medium mb-2">Potential Matches</h4>
                          <div className="space-y-2">
                            {duplicate.existingRecords.map((record, index) => (
                              <div
                                key={record.id || index}
                                className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border hover-elevate"
                              >
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      Match: {formatMatchScore(duplicate.matchScores[index])}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">
                                      ID: {record.id}
                                    </Badge>
                                  </div>
                                  
                                  {duplicate.status === 'pending' && (
                                    <Button
                                      size="sm"
                                      variant="default"
                                      onClick={() => handleResolveDuplicate(duplicate.id, 'merge', record.id)}
                                      disabled={resolveDuplicateMutation.isPending}
                                      data-testid={`button-merge-${duplicate.id}-${record.id}`}
                                    >
                                      <GitMerge className="h-3 w-3 mr-1" />
                                      Merge With This
                                    </Button>
                                  )}
                                </div>
                                
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                  {Object.entries(record)
                                    .filter(([key, value]) => value != null && value !== '' && !['id', 'createdAt', 'updatedAt'].includes(key))
                                    .slice(0, 6)
                                    .map(([field, value]) => (
                                    <div key={field}>
                                      <div className="text-xs font-medium text-muted-foreground uppercase">{field}</div>
                                      {renderFieldValue(field, value, duplicate.entityType)}
                                    </div>
                                  ))}
                                </div>

                                {/* Matched Fields Indicator */}
                                {duplicate.matchedFields.length > 0 && (
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
                            ))}
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
    </div>
  );
}