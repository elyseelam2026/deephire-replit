import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Briefcase, MapPin, Clock, Users, TrendingUp, Building2, RotateCcw, Trash2, AlertCircle } from "lucide-react";
import { Job, Company } from "@shared/schema";
import { Link } from "wouter";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const formatDate = (dateString: string | Date) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
};

export default function Jobs() {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showPostJobDialog, setShowPostJobDialog] = useState(false);
  const [showRecyclingBin, setShowRecyclingBin] = useState(false);
  const [newJobData, setNewJobData] = useState({
    title: "",
    companyId: "",
    department: "",
    jdText: "",
    urgency: "medium",
  });
  const { toast } = useToast();
  
  const { data: jobs, isLoading, error } = useQuery<Job[]>({
    queryKey: ['/api/jobs'],
  });

  const { data: companies } = useQuery<Company[]>({
    queryKey: ['/api/companies'],
  });

  const { data: deletedJobs } = useQuery<Job[]>({
    queryKey: ['/api/jobs/deleted'],
  });

  // Fetch candidates for selected job
  const { data: candidates = [], isLoading: candidatesLoading } = useQuery<Array<{
    id: number;
    firstName: string;
    lastName: string;
    currentTitle: string;
    currentCompany?: string;
    matchScore?: number;
    ineligibilityReason?: string;
    status?: string;
  }>>({
    queryKey: selectedJob ? ['/api/jobs', selectedJob.id, 'candidates'] : ['candidates-empty'],
    enabled: !!selectedJob,
  });

  // Create job mutation
  const createJob = useMutation({
    mutationFn: async (jobData: any) => {
      const response = await apiRequest('POST', '/api/jobs', jobData);
      return await response.json();
    },
    onSuccess: (newJob) => {
      toast({
        title: "Success!",
        description: "Job posted successfully",
      });
      setShowPostJobDialog(false);
      setNewJobData({ title: "", companyId: "", department: "", jdText: "", urgency: "medium" });
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create job",
        variant: "destructive",
      });
    },
  });

  // Delete job mutation
  const deleteJob = useMutation({
    mutationFn: async (jobId: number) => {
      const response = await apiRequest('DELETE', `/api/jobs/${jobId}`);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Job moved to recycling bin",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/jobs/deleted'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete job",
        variant: "destructive",
      });
    },
  });

  // Restore job mutation
  const restoreJob = useMutation({
    mutationFn: async (jobId: number) => {
      const response = await apiRequest('PATCH', `/api/jobs/${jobId}/restore`);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Job restored from recycling bin",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/jobs/deleted'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to restore job",
        variant: "destructive",
      });
    },
  });

  // Permanently delete job mutation
  const permanentlyDeleteJob = useMutation({
    mutationFn: async (jobId: number) => {
      const response = await apiRequest('DELETE', `/api/jobs/${jobId}/permanent`);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Job permanently deleted",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/jobs/deleted'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to permanently delete job",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6 p-6" data-testid="jobs-page">
        <div>
          <h1 className="text-3xl font-bold">Jobs</h1>
          <p className="text-muted-foreground">Manage job postings and track candidates</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 p-6" data-testid="jobs-page">
        <div>
          <h1 className="text-3xl font-bold">Jobs</h1>
          <p className="text-muted-foreground">Manage job postings and track candidates</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">Failed to load jobs. Please try again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "urgent":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
      case "high":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100";
      case "low":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
      case "draft":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100";
      case "paused":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100";
      case "closed":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100";
    }
  };

  const formatDate = (date: string | Date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6 p-6" data-testid="jobs-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Jobs</h1>
          <p className="text-muted-foreground">
            Manage job postings and track candidates ({jobs?.length || 0} total)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowRecyclingBin(!showRecyclingBin)} data-testid="button-recycling-bin">
            <Trash2 className="h-4 w-4 mr-2" />
            Recycling Bin ({deletedJobs?.length || 0})
          </Button>
          <Button onClick={() => setShowPostJobDialog(true)} data-testid="button-post-job">
            <Briefcase className="h-4 w-4 mr-2" />
            Post Job
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {jobs?.map((job) => (
          <Card key={job.id} className="hover-elevate" data-testid={`job-card-${job.id}`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Briefcase className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg" data-testid={`job-title-${job.id}`}>
                      {job.title}
                    </CardTitle>
                    {job.department && (
                      <CardDescription data-testid={`job-department-${job.id}`}>
                        {job.department}
                      </CardDescription>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                {job.urgency && (
                  <Badge variant="secondary" className={getUrgencyColor(job.urgency)}>
                    {job.urgency}
                  </Badge>
                )}
                <Badge variant="secondary" className={getStatusColor(job.status)}>
                  {job.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {job.companyId && (
                <Link href={`../companies/${job.companyId}`}>
                  <div className="flex items-center gap-2 text-sm hover-elevate rounded-md p-2 -mx-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Company #{job.companyId}</span>
                  </div>
                </Link>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span data-testid={`job-date-${job.id}`}>
                  Posted {formatDate(job.createdAt)}
                </span>
              </div>
              
              {job.skills && job.skills.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Required Skills</h4>
                  <div className="flex flex-wrap gap-1" data-testid={`job-skills-${job.id}`}>
                    {job.skills.slice(0, 3).map((skill, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                    {job.skills.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{job.skills.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-2 space-y-2">
                <Link href={`/recruiting/jobs/${job.id}`}>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full" 
                    data-testid={`button-view-job-${job.id}`}
                  >
                    View Pipeline
                  </Button>
                </Link>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="w-full" 
                  onClick={() => setSelectedJob(job)}
                  data-testid={`button-view-candidates-${job.id}`}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Quick View
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="w-full" 
                  onClick={() => deleteJob.mutate(job.id!)}
                  disabled={deleteJob.isPending}
                  data-testid={`button-delete-job-${job.id}`}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {showRecyclingBin && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold">Recycling Bin</h2>
            <p className="text-muted-foreground">Deleted jobs can be restored or permanently removed</p>
          </div>
          
          {deletedJobs && deletedJobs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {deletedJobs.map((job) => (
                <Card key={job.id} className="opacity-75" data-testid={`deleted-job-card-${job.id}`}>
                  <CardHeader>
                    <CardTitle className="text-lg">{job.title}</CardTitle>
                    {job.department && (
                      <CardDescription>{job.department}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                      Deleted {formatDate(job.deletedAt || job.createdAt)}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => restoreJob.mutate(job.id!)}
                        disabled={restoreJob.isPending}
                        data-testid={`button-restore-job-${job.id}`}
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Restore
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1"
                        onClick={() => permanentlyDeleteJob.mutate(job.id!)}
                        disabled={permanentlyDeleteJob.isPending}
                        data-testid={`button-permanent-delete-job-${job.id}`}
                      >
                        Permanent Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center">
                <Trash2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Recycling bin is empty</h3>
                <p className="text-muted-foreground">
                  Deleted jobs will appear here and can be restored.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!showRecyclingBin && jobs?.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center">
            <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No jobs posted yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first job posting to start finding great candidates.
            </p>
            <Button onClick={() => setShowPostJobDialog(true)} data-testid="button-post-first-job">
              <Briefcase className="h-4 w-4 mr-2" />
              Post Your First Job
            </Button>
          </CardContent>
        </Card>
      )}

      {!showRecyclingBin && (
        <>
          {/* Job Detail Modal */}
          <Dialog open={!!selectedJob} onOpenChange={(open) => !open && setSelectedJob(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid={`job-profile-${selectedJob?.id}`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Briefcase className="h-6 w-6" />
              {selectedJob?.title}
            </DialogTitle>
            <DialogDescription>
              Job details and requirements
            </DialogDescription>
          </DialogHeader>
          
          {selectedJob && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                {selectedJob.department && (
                  <div>
                    <h4 className="font-medium text-sm">Department</h4>
                    <p className="text-muted-foreground">{selectedJob.department}</p>
                  </div>
                )}
                {selectedJob.urgency && (
                  <div>
                    <h4 className="font-medium text-sm">Urgency</h4>
                    <Badge variant="secondary" className={getUrgencyColor(selectedJob.urgency)}>
                      {selectedJob.urgency}
                    </Badge>
                  </div>
                )}
                {selectedJob.status && (
                  <div>
                    <h4 className="font-medium text-sm">Status</h4>
                    <Badge variant="secondary" className={getStatusColor(selectedJob.status)}>
                      {selectedJob.status}
                    </Badge>
                  </div>
                )}
                <div>
                  <h4 className="font-medium text-sm">Posted</h4>
                  <p className="text-muted-foreground">{formatDate(selectedJob.createdAt)}</p>
                </div>
              </div>
              
              {selectedJob.skills && selectedJob.skills.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Required Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedJob.skills.map((skill, index) => (
                      <Badge key={index} variant="outline">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedJob.jdText && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Job Description</h4>
                  <div className="text-muted-foreground whitespace-pre-wrap max-h-60 overflow-y-auto">
                    {selectedJob.jdText}
                  </div>
                </div>
              )}

              <div className="border-t pt-6">
                <h4 className="font-medium text-sm mb-3">Matched Candidates</h4>
                {candidatesLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}
                  </div>
                ) : candidates.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-4">No candidates matched this role yet.</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {candidates.map((candidate: any) => (
                      <div
                        key={candidate.id}
                        className="flex items-start justify-between gap-3 p-3 rounded-md border hover-elevate"
                        data-testid={`candidate-row-${candidate.id}`}
                      >
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {candidate.firstName} {candidate.lastName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {candidate.currentTitle || 'No title'} {candidate.currentCompany && `@ ${candidate.currentCompany}`}
                          </div>
                          {candidate.ineligibilityReason && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-yellow-600 dark:text-yellow-500">
                              <AlertCircle className="h-3 w-3" />
                              {candidate.ineligibilityReason}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <div className="font-semibold text-sm">{candidate.matchScore || 0}/100</div>
                            {candidate.ineligibilityReason ? (
                              <Badge variant="secondary" className="text-xs mt-1">Ineligible</Badge>
                            ) : (
                              <Badge className="text-xs mt-1 bg-green-600 hover:bg-green-700">Eligible</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Post Job Dialog */}
      <Dialog open={showPostJobDialog} onOpenChange={setShowPostJobDialog}>
        <DialogContent className="max-w-2xl" data-testid="dialog-post-job">
          <DialogHeader>
            <DialogTitle>Post New Job</DialogTitle>
            <DialogDescription>
              Create a new job posting for your company
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="job-title">Job Title *</Label>
              <Input
                id="job-title"
                placeholder="e.g., Chief Financial Officer"
                value={newJobData.title}
                onChange={(e) => setNewJobData({ ...newJobData, title: e.target.value })}
                data-testid="input-job-title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="job-company">Company *</Label>
              <Select 
                value={newJobData.companyId} 
                onValueChange={(value) => setNewJobData({ ...newJobData, companyId: value })}
              >
                <SelectTrigger id="job-company" data-testid="select-job-company">
                  <SelectValue placeholder="Select a company" />
                </SelectTrigger>
                <SelectContent>
                  {companies?.map((company) => (
                    <SelectItem key={company.id} value={company.id.toString()}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="job-department">Department</Label>
              <Input
                id="job-department"
                placeholder="e.g., Finance"
                value={newJobData.department}
                onChange={(e) => setNewJobData({ ...newJobData, department: e.target.value })}
                data-testid="input-job-department"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="job-urgency">Urgency</Label>
              <Select 
                value={newJobData.urgency} 
                onValueChange={(value) => setNewJobData({ ...newJobData, urgency: value })}
              >
                <SelectTrigger id="job-urgency" data-testid="select-job-urgency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="job-description">Job Description *</Label>
              <Textarea
                id="job-description"
                placeholder="Enter the complete job description..."
                value={newJobData.jdText}
                onChange={(e) => setNewJobData({ ...newJobData, jdText: e.target.value })}
                rows={6}
                data-testid="textarea-job-description"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setShowPostJobDialog(false);
                setNewJobData({ title: "", companyId: "", department: "", jdText: "", urgency: "medium" });
              }}
              data-testid="button-cancel-post-job"
            >
              Cancel
            </Button>
            <Button
              onClick={() => createJob.mutate({ 
                ...newJobData, 
                companyId: parseInt(newJobData.companyId) 
              })}
              disabled={!newJobData.title || !newJobData.companyId || !newJobData.jdText || createJob.isPending}
              data-testid="button-submit-post-job"
            >
              {createJob.isPending ? 'Posting...' : 'Post Job'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
        </>
      )}
    </div>
  );
}