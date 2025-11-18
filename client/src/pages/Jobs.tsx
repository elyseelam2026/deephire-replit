import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Briefcase, MapPin, Clock, Users, TrendingUp, Building2 } from "lucide-react";
import { Job } from "@shared/schema";
import { Link } from "wouter";

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
  
  const { data: jobs, isLoading, error } = useQuery<Job[]>({
    queryKey: ['/api/jobs'],
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
        <Button data-testid="button-post-job">
          <Briefcase className="h-4 w-4 mr-2" />
          Post Job
        </Button>
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
                <Link href={`${job.id}`}>
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
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {jobs?.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center">
            <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No jobs posted yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first job posting to start finding great candidates.
            </p>
            <Button data-testid="button-post-first-job">
              <Briefcase className="h-4 w-4 mr-2" />
              Post Your First Job
            </Button>
          </CardContent>
        </Card>
      )}

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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}